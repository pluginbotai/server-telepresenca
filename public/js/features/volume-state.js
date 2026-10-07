import { syncVolumeUi } from "./volume-sync-ui.js";
import {
  applyVolumeRangeFromCaps,
  applyVolumeStatus,
  sendVolumeLevel,
  setVolumeLevel,
  toggleVolumeMute,
} from "./volume-state-methods.js";

/** @param {object} els @param {(key: string, vars?: object) => string} t */
export function createVolumeState(els, t) {
  const state = {
    els,
    t,
    ctx: null,
    root: null,
    button: null,
    slider: null,
    valueEl: null,
    badgeEl: null,
    panel: null,
    titleEl: null,
    closeBtn: null,
    min: 0,
    max: 10,
    level: 5,
    lastNonZero: 5,
    sendTimer: null,
    muteToggleInFlight: false,
    isDrawerMode: false,
    quickVolumeBtn: els?.btnQuickVolume,
    onToggleMute: (event) => {
      event?.preventDefault?.();
      toggleVolumeMute(state);
    },
    label: () => t("volume.level", { level: state.level }),
    syncUi: () => syncVolumeUi(state),
    applyRangeFromCaps: (caps) => applyVolumeRangeFromCaps(state, caps),
    sendLevel: (volatile) => sendVolumeLevel(state, volatile),
    setLevel: (next, send) => setVolumeLevel(state, next, send),
    onStatus: (payload) => applyVolumeStatus(state, payload),
    setPanelOpen(open) {
      if (!state.panel || !state.button) return;
      state.panel.classList.toggle("hidden", !open);
      state.button.setAttribute("aria-expanded", open ? "true" : "false");
    },
    clearMounted() {
      state.root =
        state.button =
        state.slider =
        state.valueEl =
        state.badgeEl =
        state.panel =
        state.titleEl =
        state.closeBtn =
          null;
      state.ctx = null;
      state.isDrawerMode = false;
    },
  };
  return state;
}
