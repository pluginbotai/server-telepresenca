import { isCompactViewport } from "../ui/viewport-mode.js";
import { resolveStatusDisplayKey } from "../ui/status-display.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
function refreshStatusAndFeatures(runtime) {
  const {
    els,
    t,
    roomId,
    lang,
    countdown,
    locomotion,
    head,
    videoQuality,
    registry,
    media,
    connected,
    localPreview,
    robotDrawer,
    isMockActive,
  } = runtime;

  const statusKey = els.statusChip.dataset.i18n;
  if (statusKey) {
    const displayKey = resolveStatusDisplayKey(statusKey, isCompactViewport());
    els.statusChip.textContent = t(displayKey);
  }
  if (els.placeholderText?.dataset.i18n) {
    els.placeholderText.textContent = t(els.placeholderText.dataset.i18n);
  }
  els.roomLabel.textContent = t("room.label", { id: roomId });
  els.btnHangup.setAttribute("aria-label", t("call.hangup"));
  if (els.btnCallOverflow) {
    els.btnCallOverflow.setAttribute("aria-label", t("call.overflow"));
  }
  if (els.callOverflowDrawer) {
    els.callOverflowDrawer.setAttribute("aria-label", t("call.overflowMenu"));
  }
  if (els.btnSendCommand && !registry.isMounted("beep")) {
    els.btnSendCommand.setAttribute("aria-label", t("media.ringStart"));
  }
  lang.updateLangFlag();
  countdown.paint();
  locomotion.refreshLabels();
  head.refreshLabels();
  videoQuality.refreshLabels();
  registry.refreshLabels();
  runtime.hudTooltips?.update();
  media.refreshMediaButtons(connected);
  runtime.callOverflow?.sync();
  localPreview?.refreshLabels();
  robotDrawer.refreshLabels({ isMockActive });
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
function refreshQuickDockLabels(runtime) {
  const { els, t, registry, isMockActive } = runtime;
  if (els.btnToggleMockRobot) {
    const mockKey = isMockActive ? "media.mockDisable" : "media.mockEnable";
    els.btnToggleMockRobot.setAttribute("aria-label", t(mockKey));
  }
  if (els.btnQuickVolume && !registry.isMounted("volume")) {
    els.btnQuickVolume.setAttribute("aria-label", t("volume.panel"));
  }
  if (els.btnQuickHeadReset) {
    els.btnQuickHeadReset.setAttribute("aria-label", t("media.headReset"));
  }
  if (els.btnQuickFlashlight) {
    els.btnQuickFlashlight.setAttribute("aria-label", t("media.flashlight"));
  }
  if (els.btnQuickEmotions) {
    els.btnQuickEmotions.setAttribute("aria-label", t("emotions.title"));
    els.btnQuickEmotions.title = t("emotions.title");
  }
  if (els.btnToggleRobotDrawer) {
    const drawerOpen = els.robotDrawer?.classList.contains("is-open");
    const toggleKey = drawerOpen
      ? "media.robotControlsClose"
      : "media.robotControlsOpen";
    els.btnToggleRobotDrawer.setAttribute("aria-label", t(toggleKey));
  }
  if (els.robotQuickDock) {
    els.robotQuickDock.setAttribute("aria-label", t("media.quickDock"));
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
function refreshDrawerActionLabels(runtime) {
  const { els, t } = runtime;
  const resetHeadSpan = els.drawerHeadHost?.querySelector("#btnResetHeadLook span");
  if (resetHeadSpan) resetHeadSpan.textContent = t("media.headReset");
  const flashlightBtn =
    els.drawerFlashlightHost?.querySelector('[data-feature="flashlight"]') ||
    els.featureHost?.querySelector('[data-feature="flashlight"]');
  if (flashlightBtn) {
    flashlightBtn.setAttribute("aria-label", t("media.flashlight"));
    const span = flashlightBtn.querySelector("span");
    if (span) span.textContent = t("media.flashlight");
  }
  const followBtn = els.drawerFollowHost?.querySelector('[data-feature="follow"]');
  if (followBtn instanceof HTMLButtonElement) {
    const active = followBtn.dataset.followActive === "true";
    const key = active ? "media.followStop" : "media.followStart";
    followBtn.setAttribute("aria-label", t(key));
    const span = followBtn.querySelector("span");
    if (span) span.textContent = t(key);
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function refreshDynamicText(runtime) {
  refreshStatusAndFeatures(runtime);
  refreshQuickDockLabels(runtime);
  refreshDrawerActionLabels(runtime);
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function attachDynamicText(runtime) {
  runtime.refreshDynamicText = () => refreshDynamicText(runtime);
}
