import { isContinuousBackward } from "../protocol/capabilities.js";
import { createLocomotionKeyboard } from "./locomotion-keyboard.js";
import { applyLocomotionHint, locomotionHoverHint } from "./locomotion-hints.js";

export const LOCOMOTION_HEARTBEAT_INTERVAL_MS = 80;

/**
 * @param {object} deps
 * @param {object} deps.els
 * @param {(key: string, vars?: object) => string} deps.t
 */
export function createLocomotionMovement(deps) {
  const { els, t } = deps;
  let caps = null;
  let activeMovement = null;
  let movementHeartbeat = null;
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;

  function updateMovementHint() {
    applyLocomotionHint(els, locomotionHoverHint(caps, t));
  }

  function sendControl(action, opts) {
    if (!ctx) return;
    ctx.sendControl(action, undefined, opts);
  }

  function stopMovement(sendStop = true) {
    if (movementHeartbeat) {
      clearInterval(movementHeartbeat);
      movementHeartbeat = null;
    }
    if (activeMovement) {
      activeMovement = null;
      if (sendStop && ctx?.isConnected()) {
        sendControl("stop", { volatile: false });
      }
    }
  }

  function startMovement(action) {
    if (!action || !ctx?.isConnected()) return;

    if (action === "backward" && !isContinuousBackward(caps)) {
      stopMovement(false);
      sendControl("backward", { volatile: true });
      return;
    }

    if (activeMovement === action) return;

    stopMovement(false);
    activeMovement = action;
    sendControl(action, { volatile: true });

    movementHeartbeat = setInterval(() => {
      if (activeMovement && ctx?.isConnected()) {
        sendControl(activeMovement, { volatile: true });
      } else {
        clearInterval(movementHeartbeat);
        movementHeartbeat = null;
      }
    }, LOCOMOTION_HEARTBEAT_INTERVAL_MS);
  }

  const keyboard = createLocomotionKeyboard({
    els,
    getCtx: () => ctx,
    startMovement,
    stopMovement,
  });

  return {
    setContext(nextCtx, nextCaps) {
      ctx = nextCtx;
      caps = nextCaps;
    },
    clearContext() {
      ctx = null;
      caps = null;
    },
    startMovement,
    stopMovement,
    onKeyDown: keyboard.onKeyDown,
    onKeyUp: keyboard.onKeyUp,
    updateMovementHint,
    getActiveMovement: () => activeMovement,
    clearKeys: () => keyboard.clearKeys(),
  };
}
