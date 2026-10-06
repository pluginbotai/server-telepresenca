import { createTeleJoystick } from "../joystick.js";
import { isLocomotionAvailable } from "../protocol/capabilities.js";
import { createLocomotionMovement } from "./locomotion-movement.js";

const MOVEMENT_I18N = {
  forward: "movement.forward",
  backward: "movement.backward",
  left: "movement.left",
  right: "movement.right",
  stop: "movement.stop",
};

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createLocomotionFeature(els, t) {
  let joystick = null;
  const movement = createLocomotionMovement({ els, t });

  function setHostHidden(hidden) {
    if (els.locomotionHost) els.locomotionHost.hidden = hidden;
  }

  function setEnabled(enabled) {
    if (joystick) joystick.setEnabled(enabled);
  }

  return {
    id: "locomotion",
    optIn: false,
    isAvailable: isLocomotionAvailable,
    mount(nextCtx) {
      movement.setContext(nextCtx, nextCtx.caps);
      setHostHidden(false);
      movement.updateMovementHint();

      if (els.joystick) {
        joystick = createTeleJoystick(els.joystick, {
          onDirection(action) {
            movement.startMovement(action);
            els.joystick.setAttribute(
              "aria-valuetext",
              t(MOVEMENT_I18N[action] || MOVEMENT_I18N.stop),
            );
          },
          onEnd() {
            movement.stopMovement(true);
            els.joystick.setAttribute("aria-valuetext", t(MOVEMENT_I18N.stop));
          },
        });
        joystick.setEnabled(nextCtx.isConnected());
      }

      const onBlur = () => {
        movement.clearKeys();
        movement.stopMovement(true);
      };
      if (typeof window !== "undefined") {
        window.addEventListener("blur", onBlur);
        window.addEventListener("keydown", movement.onKeyDown);
        window.addEventListener("keyup", movement.onKeyUp);
      }

      return () => {
        movement.clearKeys();
        movement.stopMovement(true);
        if (typeof window !== "undefined") {
          window.removeEventListener("blur", onBlur);
          window.removeEventListener("keydown", movement.onKeyDown);
          window.removeEventListener("keyup", movement.onKeyUp);
        }
        if (joystick) {
          joystick.destroy();
          joystick = null;
        }
        setHostHidden(true);
        movement.clearContext();
      };
    },
    update(nextCaps, nextCtx) {
      movement.setContext(nextCtx, nextCaps);
      movement.updateMovementHint();
      setHostHidden(!isLocomotionAvailable(nextCaps));
    },
    setEnabled,
    startMovement: (...args) => movement.startMovement(...args),
    stopMovement: (...args) => movement.stopMovement(...args),
    getActiveMovement: () => movement.getActiveMovement(),
    onKeyDown: (...args) => movement.onKeyDown(...args),
    onKeyUp: (...args) => movement.onKeyUp(...args),
    updateMovementHint: () => movement.updateMovementHint(),
    refreshLabels() {
      if (els.joystick) {
        els.joystick.setAttribute("aria-label", t("movement.joystick"));
      }
      movement.updateMovementHint();
    },
  };
}

export { LOCOMOTION_HEARTBEAT_INTERVAL_MS } from "./locomotion-movement.js";
