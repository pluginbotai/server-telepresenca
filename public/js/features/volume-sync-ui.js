import { VOLUME_ICON, VOLUME_ICON_MUTED } from "./volume-icons.js";

/** @param {object} state */
function syncVolumeSlider(state) {
  const { slider, min, max, level, isDrawerMode } = state;
  if (!slider) return;
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(level);
  slider.setAttribute("aria-valuemin", String(min));
  slider.setAttribute("aria-valuemax", String(max));
  slider.setAttribute("aria-valuenow", String(level));
  if (!isDrawerMode) return;
  slider.setAttribute("aria-label", state.t("volume.panel"));
  const pct = max <= min ? 0 : ((level - min) / (max - min)) * 100;
  slider.style.setProperty("--volume-fill", `${pct}%`);
}

/** @param {object} state */
function syncVolumeDrawerButton(state) {
  const { button, min, level, isDrawerMode, t } = state;
  if (!button || !isDrawerMode) return;
  const isMuted = level <= min;
  const muteKey = isMuted ? "volume.unmute" : "volume.mute";
  button.setAttribute("aria-label", t(muteKey));
  button.setAttribute("aria-pressed", isMuted ? "true" : "false");
  button.title = t(muteKey);
  button.innerHTML = isMuted ? VOLUME_ICON_MUTED : VOLUME_ICON;
  button.disabled = !state.ctx?.isConnected();
}

/** @param {object} state */
function syncVolumeQuickButton(state) {
  const { quickVolumeBtn, min, level, t } = state;
  if (!quickVolumeBtn) return;
  const isMuted = level <= min;
  const muteKey = isMuted ? "volume.unmute" : "volume.mute";
  quickVolumeBtn.setAttribute("aria-label", t(muteKey));
  quickVolumeBtn.setAttribute("aria-pressed", isMuted ? "true" : "false");
  quickVolumeBtn.title = t(muteKey);
  quickVolumeBtn.innerHTML = isMuted ? VOLUME_ICON_MUTED : VOLUME_ICON;
  quickVolumeBtn.disabled = !state.ctx?.isConnected();
}

/** @param {object} state */
function syncVolumePopoverButton(state) {
  const { button, isDrawerMode, label } = state;
  if (!button || isDrawerMode) return;
  button.setAttribute("aria-label", label());
  button.title = label();
  button.disabled = !state.ctx?.isConnected();
}

/** @param {object} state */
export function syncVolumeUi(state) {
  syncVolumeSlider(state);
  if (state.valueEl) state.valueEl.textContent = String(state.level);
  if (state.badgeEl) state.badgeEl.textContent = String(state.level);
  syncVolumeDrawerButton(state);
  syncVolumeQuickButton(state);
  syncVolumePopoverButton(state);
  if (state.titleEl) state.titleEl.textContent = state.t("volume.panel");
  if (state.closeBtn)
    state.closeBtn.setAttribute("aria-label", state.t("dialog.close"));
  if (state.panel) state.panel.setAttribute("aria-label", state.t("volume.panel"));
}
