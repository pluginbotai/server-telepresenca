import { volumeRange } from "../protocol/capabilities.js";
import { parseRobotStatus, parseVolumeLevel } from "../protocol/status.js";
import { syncVolumeUi } from "./volume-sync-ui.js";

/** @param {object} state */
export function applyVolumeRangeFromCaps(state, caps) {
  const range = volumeRange(caps);
  state.min = range.min;
  state.max = range.max;
  const advertised = caps?.audio?.volumeLevel;
  state.level = parseVolumeLevel(
    typeof advertised === "number" ? advertised : state.level,
    state.min,
    state.max,
    state.min,
  );
  if (state.level > state.min) {
    state.lastNonZero = state.level;
  } else if (!state.lastNonZero || state.lastNonZero <= state.min) {
    state.lastNonZero = state.max;
  }
}

/** @param {object} state */
export function sendVolumeLevel(state, volatile) {
  if (!state.ctx?.isConnected()) return;
  if (state.sendTimer) {
    clearTimeout(state.sendTimer);
    state.sendTimer = null;
  }
  state.ctx.sendControl(
    "volume.set",
    { level: state.level },
    { volatile: Boolean(volatile) },
  );
}

/** @param {object} state */
export function toggleVolumeMute(state) {
  if (!state.ctx?.isConnected()) return;
  if (state.muteToggleInFlight) return;
  state.muteToggleInFlight = true;
  try {
    if (state.level > state.min) {
      state.lastNonZero = state.level;
      state.level = state.min;
    } else {
      state.level = parseVolumeLevel(
        state.lastNonZero || state.max,
        state.min,
        state.max,
        state.max,
      );
    }
    syncVolumeUi(state);
    sendVolumeLevel(state, false);
  } finally {
    state.muteToggleInFlight = false;
  }
}

/** @param {object} state */
export function setVolumeLevel(state, next, send) {
  state.level = parseVolumeLevel(next, state.min, state.max, state.level);
  syncVolumeUi(state);
  if (!send) return;
  if (state.sendTimer) clearTimeout(state.sendTimer);
  state.sendTimer = setTimeout(() => {
    state.sendTimer = null;
    sendVolumeLevel(state, true);
  }, 80);
}

/** @param {object} state */
export function applyVolumeStatus(state, payload) {
  const parsed = parseRobotStatus(payload);
  if (!parsed.audio) return;
  state.min = parsed.audio.min;
  state.max = parsed.audio.max;
  state.level = parsed.audio.volume;
  if (state.level > state.min) state.lastNonZero = state.level;
  syncVolumeUi(state);
}
