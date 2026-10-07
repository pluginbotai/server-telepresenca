import {
  locomotionSpeedRange,
  snapLocomotionSpeedFactor,
} from "../protocol/capabilities.js";
import { persistSpeedFactor, readStoredSpeedFactor } from "./locomotion-speed-store.js";
import {
  buildLocomotionSpeedButtons,
  locomotionSpeedStepLabel,
} from "./locomotion-speed-ui.js";

/**
 * @param {object} state
 * @param {(key: string) => string} t
 */
export function syncLocomotionSpeedUi(state, t) {
  if (state.badgeEl) {
    state.badgeEl.textContent = locomotionSpeedStepLabel(t, state.speedFactor);
  }
  if (!state.groupEl) return;
  state.groupEl.querySelectorAll("[data-speed-step]").forEach((btn) => {
    const step = Number(btn.getAttribute("data-speed-step"));
    const on = Math.abs(step - state.speedFactor) < 0.001;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
}

/**
 * @param {object} state
 * @param {object | null} caps
 * @param {(key: string) => string} t
 */
export function initLocomotionSpeedFromCaps(state, caps, t) {
  state.speedRange = locomotionSpeedRange(caps);
  const initial = readStoredSpeedFactor(state.speedRange.default);
  state.speedFactor = snapLocomotionSpeedFactor(initial, state.speedRange);
  buildLocomotionSpeedButtons(state, t);
  if (state.ctx?.isConnected()) state.sendSpeedFactor(state.speedFactor);
}

/**
 * @param {object} state
 * @param {number} next
 * @param {{ send?: boolean, persist?: boolean }} [opts]
 */
export function applyLocomotionSpeedFactor(state, next, opts = {}) {
  const { send = true, persist = true } = opts;
  state.speedFactor = snapLocomotionSpeedFactor(next, state.speedRange);
  if (persist) persistSpeedFactor(state.speedFactor);
  syncLocomotionSpeedUi(state, state.t);
  if (send) state.sendSpeedFactor(state.speedFactor);
}
