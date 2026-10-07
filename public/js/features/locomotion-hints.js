import {
  backwardPulseDistanceM,
  isContinuousBackward,
} from "../protocol/capabilities.js";

/**
 * @param {object | null} caps
 * @param {(key: string, vars?: object) => string} t
 */
export function locomotionHoverHint(caps, t) {
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

/** @param {object} els */
export function applyLocomotionHint(els, hint) {
  if (els.joystick) els.joystick.title = hint;
  if (els.kbdHint) {
    els.kbdHint.title = hint;
    els.kbdHint.setAttribute("aria-label", hint);
  }
  if (els.movementHint) els.movementHint.textContent = "";
}
