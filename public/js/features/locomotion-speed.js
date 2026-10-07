import { isLocomotionSpeedAvailable } from "../protocol/capabilities.js";
import { createLocomotionSpeedState } from "./locomotion-speed-state.js";
import { mountLocomotionSpeedSection } from "./locomotion-speed-ui.js";

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createLocomotionSpeedFeature(els, t) {
  const state = createLocomotionSpeedState(t);

  return {
    id: "locomotion-speed",
    optIn: true,
    isAvailable: isLocomotionSpeedAvailable,
    mount(nextCtx) {
      return mountLocomotionSpeedSection({ els, t, nextCtx, state });
    },
    update(caps, nextCtx) {
      state.ctx = nextCtx;
      state.initFromCaps(caps);
    },
    setEnabled(enabled) {
      if (!state.groupEl) return;
      state.groupEl.querySelectorAll("button").forEach((btn) => {
        btn.disabled = !enabled;
      });
      if (enabled) state.sendSpeedFactor(state.speedFactor);
    },
    refreshLabels() {
      if (!state.root) return;
      const titleEl = state.root.querySelector(".robot-drawer-section-title");
      if (titleEl) titleEl.textContent = t("movement.speedLabel");
      if (state.groupEl) {
        state.groupEl.setAttribute("aria-label", t("movement.speedAria"));
      }
      state.rebuildButtons();
    },
  };
}
