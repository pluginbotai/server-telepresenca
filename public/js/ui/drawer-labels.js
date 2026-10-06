function updateQuickButtonLabel(btn, key, t, setTitle = false) {
  if (!btn) return;
  const label = t(key);
  btn.setAttribute("aria-label", label);
  if (setTitle) btn.title = label;
}

export function updateDrawerLabels({
  drawerEl,
  toggleBtn,
  closeBtn,
  quickDockEl,
  btnQuickVolume,
  btnQuickHeadReset,
  btnQuickFlashlight,
  btnQuickEmotions,
  btnMockToggle,
  isMockActive = false,
  open,
  t,
}) {
  const labelKey = open ? "media.robotControlsClose" : "media.robotControlsOpen";
  const label = t(labelKey);
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-label", label);
    const arrowEl = toggleBtn.querySelector?.(".panel-icon-arrow");
    if (arrowEl) {
      arrowEl.setAttribute("d", open ? "m8 9 3 3-3 3" : "m10 15-3-3 3-3");
    }
  }
  updateQuickButtonLabel(closeBtn, "media.robotControlsClose", t, true);
  updateQuickButtonLabel(drawerEl, "media.robotControls", t);
  updateQuickButtonLabel(quickDockEl, "media.quickDock", t);
  updateQuickButtonLabel(btnQuickVolume, "volume.panel", t);
  updateQuickButtonLabel(btnQuickHeadReset, "media.headReset", t);
  updateQuickButtonLabel(btnQuickFlashlight, "media.flashlight", t);
  updateQuickButtonLabel(btnQuickEmotions, "emotions.title", t, true);
  if (btnMockToggle) {
    const mockLabel = t(isMockActive ? "media.mockDisable" : "media.mockEnable");
    btnMockToggle.setAttribute("aria-label", mockLabel);
    btnMockToggle.title = mockLabel;
  }
}
