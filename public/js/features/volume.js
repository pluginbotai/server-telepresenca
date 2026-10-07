import { isVolumeAvailable } from "../protocol/capabilities.js";
import { createVolumeState } from "./volume-state.js";
import { mountVolumeFeature } from "./volume-mount.js";

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createVolumeFeature(els, t) {
  const state = createVolumeState(els, t);

  return {
    id: "volume",
    optIn: true,
    isAvailable: isVolumeAvailable,
    mount: (nextCtx) => mountVolumeFeature(state, nextCtx),
    update(caps, nextCtx) {
      state.ctx = nextCtx;
      state.applyRangeFromCaps(caps);
      state.syncUi();
    },
    onStatus: (payload) => state.onStatus(payload),
    setEnabled(enabled) {
      if (state.button) state.button.disabled = !enabled;
      if (state.quickVolumeBtn) state.quickVolumeBtn.disabled = !enabled;
      if (!enabled) state.setPanelOpen(false);
    },
    refreshLabels: () => state.syncUi(),
  };
}
