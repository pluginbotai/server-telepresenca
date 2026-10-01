import { createTeleJoystick } from "../joystick.js";
import {
  backwardPulseDistanceM,
  isContinuousBackward,
  isLocomotionAvailable,
} from "../protocol/capabilities.js";

export const LOCOMOTION_HEARTBEAT_INTERVAL_MS = 80;

const MOVEMENT_I18N = {
  forward: "movement.forward",
  backward: "movement.backward",
  left: "movement.left",
  right: "movement.right",
  stop: "movement.stop",
};

const KEY_FEEDBACK = {
  w: "w",
  arrowup: "w",
  a: "a",
  arrowleft: "a",
  s: "s",
  arrowdown: "s",
  d: "d",
  arrowright: "d",
};

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createLocomotionFeature(els, t) {
  let caps = null;
  let joystick = null;
  let activeMovement = null;
  let movementHeartbeat = null;
  const activeKeys = new Set();
  let activeKey = null;
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;

  const KEY_TO_ACTION = {
    w: "forward",
    arrowup: "forward",
    s: "backward",
    arrowdown: "backward",
    a: "left",
    arrowleft: "left",
    d: "right",
    arrowright: "right",
  };

  function setHostHidden(hidden) {
    if (els.locomotionHost) els.locomotionHost.hidden = hidden;
  }

  function movementHoverHint() {
    const parts = [t("movement.hintKeyboard")];
    if (isContinuousBackward(caps)) {
      parts.push(t("movement.hintContinuous"));
    } else {
      parts.push(
        t("movement.hintPulse", {
          cm: Math.round(backwardPulseDistanceM(caps) * 100),
        }),
      );
    }
    return parts.join(" · ");
  }

  function updateMovementHint() {
    const hint = movementHoverHint();
    if (els.joystick) els.joystick.title = hint;
    if (els.kbdHint) {
      els.kbdHint.title = hint;
      els.kbdHint.setAttribute("aria-label", hint);
    }
    if (els.movementHint) els.movementHint.textContent = "";
  }

  function setKeyFeedback(key, on) {
    const mapped = KEY_FEEDBACK[key];
    if (!mapped || !els.kbdHint) return;
    const cap = els.kbdHint.querySelector(`[data-key="${mapped}"]`);
    if (cap) cap.classList.toggle("is-active", on);
  }

  function sendControl(action, opts) {
    if (!ctx) return;
    ctx.sendControl(action, undefined, opts);
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

  function setEnabled(enabled) {
    if (joystick) joystick.setEnabled(enabled);
  }

  function onKeyDown(event) {
    if (!ctx?.isConnected()) return;
    const tag =
      typeof document !== "undefined" && document.activeElement
        ? document.activeElement.tagName.toLowerCase()
        : "";
    if (tag === "input" || tag === "textarea") return;
    if (event.repeat) return;

    const key = event.key?.toLowerCase();
    if (key === " " || key === "escape") {
      event.preventDefault();
      activeKeys.clear();
      activeKey = null;
      stopMovement(true);
      return;
    }

    const action = KEY_TO_ACTION[key];
    if (action) {
      event.preventDefault();
      activeKeys.add(key);
      activeKey = key;
      setKeyFeedback(key, true);
      startMovement(action);
    }
  }

  function onKeyUp(event) {
    if (!ctx?.isConnected()) return;
    const key = event.key?.toLowerCase();
    if (!KEY_TO_ACTION[key]) return;

    event.preventDefault();
    activeKeys.delete(key);
    setKeyFeedback(key, false);

    if (key === activeKey) {
      if (activeKeys.size > 0) {
        const nextKey = Array.from(activeKeys).pop();
        activeKey = nextKey;
        const nextAction = KEY_TO_ACTION[nextKey];
        if (nextAction) {
          startMovement(nextAction);
          return;
        }
      }
      activeKey = null;
      stopMovement(true);
    }
  }

  return {
    id: "locomotion",
    optIn: false,
    isAvailable: isLocomotionAvailable,
    /**
     * @param {import("./registry.js").FeatureContext} nextCtx
     */
    mount(nextCtx) {
      ctx = nextCtx;
      caps = nextCtx.caps;
      setHostHidden(false);
      updateMovementHint();

      if (els.joystick) {
        joystick = createTeleJoystick(els.joystick, {
          onDirection(action) {
            startMovement(action);
            els.joystick.setAttribute(
              "aria-valuetext",
              t(MOVEMENT_I18N[action] || MOVEMENT_I18N.stop),
            );
          },
          onEnd() {
            stopMovement(true);
            els.joystick.setAttribute("aria-valuetext", t(MOVEMENT_I18N.stop));
          },
        });
        joystick.setEnabled(nextCtx.isConnected());
      }

      const onBlur = () => {
        activeKeys.clear();
        activeKey = null;
        stopMovement(true);
      };
      if (typeof window !== "undefined") {
        window.addEventListener("blur", onBlur);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
      }

      return () => {
        activeKeys.clear();
        activeKey = null;
        stopMovement(true);
        if (typeof window !== "undefined") {
          window.removeEventListener("blur", onBlur);
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
        }
        if (joystick) {
          joystick.destroy();
          joystick = null;
        }
        setHostHidden(true);
        ctx = null;
      };
    },
    update(nextCaps, nextCtx) {
      caps = nextCaps;
      ctx = nextCtx;
      updateMovementHint();
      setHostHidden(!isLocomotionAvailable(nextCaps));
    },
    setEnabled,
    startMovement,
    stopMovement,
    getActiveMovement: () => activeMovement,
    onKeyDown,
    onKeyUp,
    updateMovementHint,
    refreshLabels() {
      if (els.joystick) {
        els.joystick.setAttribute("aria-label", t("movement.joystick"));
      }
      updateMovementHint();
    },
  };
}
