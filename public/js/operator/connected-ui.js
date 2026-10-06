/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function updateControlEnabling(runtime) {
  const canControl = runtime.connected || runtime.isMockActive;
  runtime.locomotion.setEnabled(canControl);
  runtime.head.setEnabled(canControl);
  runtime.volume.setEnabled(canControl);
  runtime.registry.setEnabled(canControl);
  runtime.robotDrawer.setEnabled(canControl);
  const { els } = runtime;
  if (els.btnQuickVolume) els.btnQuickVolume.disabled = !canControl;
  if (els.btnQuickHeadReset) els.btnQuickHeadReset.disabled = !canControl;
  if (els.btnQuickFlashlight) els.btnQuickFlashlight.disabled = !canControl;
  if (els.btnQuickEmotions) els.btnQuickEmotions.disabled = !canControl;
  const resetHeadBtn = els.drawerHeadHost?.querySelector("#btnResetHeadLook");
  if (resetHeadBtn) resetHeadBtn.disabled = !canControl;
  const flashlightBtn =
    els.drawerFlashlightHost?.querySelector('[data-feature="flashlight"]') ||
    els.featureHost?.querySelector('[data-feature="flashlight"]');
  if (flashlightBtn) flashlightBtn.disabled = !canControl;
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function setConnectedUi(runtime, isConnectedFlag) {
  runtime.connected = isConnectedFlag;
  runtime.connecting = false;
  if (isConnectedFlag && runtime.isMockActive) {
    runtime.setMockRobotActive(false);
  }
  runtime.updateMockToggleVisibility();
  const { els, status, videoQuality, registry, audioMonitor, media, localPreview } =
    runtime;
  els.btnHangup.disabled = !isConnectedFlag;
  els.btnToggleMic.disabled = !isConnectedFlag;
  els.btnToggleCam.disabled = !isConnectedFlag;
  if (els.btnToggleScreenShare) els.btnToggleScreenShare.disabled = !isConnectedFlag;
  if (els.btnVideoQuality) els.btnVideoQuality.disabled = !isConnectedFlag;
  if (els.btnSendCommand) els.btnSendCommand.disabled = !isConnectedFlag;
  media.refreshMediaButtons(isConnectedFlag);
  localPreview?.setConnected(isConnectedFlag);
  updateControlEnabling(runtime);
  if (isConnectedFlag) {
    status.showEnded(false);
  } else {
    videoQuality.setPanelOpen(false);
    if (!runtime.isMockActive) {
      registry.setEnabled?.(false);
    }
    audioMonitor.detachStream();
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function attachConnectedUi(runtime) {
  runtime.updateControlEnabling = () => updateControlEnabling(runtime);
  runtime.setConnectedUi = (flag) => setConnectedUi(runtime, flag);
}
