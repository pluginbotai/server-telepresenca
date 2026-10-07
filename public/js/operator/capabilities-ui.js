import {
  isFlashlightAvailable,
  isHeadAvailable,
  isVolumeAvailable,
  isEmotionsAvailable,
  normalizeCapabilities,
} from "../protocol/capabilities.js";
import { isRobotDrawerAvailable } from "../ui/drawer.js";
import { shouldShowMockToggle } from "../features/mock-robot.js";
import { buildFeatureContext } from "./feature-context.js";

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {boolean} hasHead
 */
function syncDrawerHeadReset(runtime, hasHead) {
  const { els, t, connected, isMockActive, signaling } = runtime;
  if (!els.drawerHeadHost) return;
  if (!hasHead) {
    els.drawerHeadHost.hidden = true;
    els.drawerHeadHost.innerHTML = "";
    return;
  }
  els.drawerHeadHost.hidden = false;
  if (els.drawerHeadHost.querySelector("#btnResetHeadLook")) return;

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.id = "btnResetHeadLook";
  resetBtn.className = "robot-drawer-btn";
  resetBtn.setAttribute("data-i18n-aria", "media.headReset");
  resetBtn.setAttribute("aria-label", t("media.headReset"));
  resetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t("media.headReset")}</span>`;
  resetBtn.addEventListener("click", () => {
    if (connected) {
      signaling.sendControl("head.reset", undefined, { volatile: false });
    } else if (isMockActive) {
      runtime.handleMockControl("head.reset");
    }
  });
  els.drawerHeadHost.appendChild(resetBtn);
}

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {object} flags
 */
function updateQuickDockVisibility(runtime, flags) {
  const { els } = runtime;
  const { allowDrawer, hasVolume, hasHead, hasFlashlight, hasEmotions } = flags;

  if (els.btnToggleRobotDrawer) {
    els.btnToggleRobotDrawer.hidden = !allowDrawer;
  }
  if (els.btnQuickHeadReset) els.btnQuickHeadReset.hidden = !hasHead;
  if (els.btnQuickFlashlight) els.btnQuickFlashlight.hidden = !hasFlashlight;
  if (els.btnQuickVolume) els.btnQuickVolume.hidden = !hasVolume;
  if (els.btnQuickEmotions) els.btnQuickEmotions.hidden = !hasEmotions;

  const hasAnyQuickDock =
    allowDrawer || hasVolume || hasHead || hasFlashlight || hasEmotions;
  if (els.robotQuickDock) {
    els.robotQuickDock.hidden = !hasAnyQuickDock;
  }
  if (!allowDrawer && runtime.robotDrawer?.isOpen()) {
    runtime.robotDrawer.close();
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function applyRobotCapabilities(runtime, caps, { fromMock = false } = {}) {
  if (!fromMock && caps && typeof caps === "object") {
    runtime.liveRobotCapabilities = caps;
  }
  runtime.robotCapabilities = normalizeCapabilities(caps);
  runtime.videoQuality.applyCapabilities(runtime.robotCapabilities);
  runtime.registry.apply(runtime.robotCapabilities, buildFeatureContext(runtime));
  runtime.hudTooltips?.update();
  runtime.locomotion.updateMovementHint();

  const hasVolume = isVolumeAvailable(runtime.robotCapabilities);
  const hasHead = isHeadAvailable(runtime.robotCapabilities);
  const hasFlashlight = isFlashlightAvailable(runtime.robotCapabilities);
  const hasEmotions = isEmotionsAvailable(runtime.robotCapabilities);
  const hasDrawer = isRobotDrawerAvailable(runtime.robotCapabilities);

  const showMock = shouldShowMockToggle({
    robotPeerPresent: runtime.robotPeerPresent,
    rtcWithRobot: runtime.rtcWithRobot,
    search: typeof window !== "undefined" ? window.location.search : "",
  });
  const allowDrawer =
    hasDrawer || runtime.isMockActive || showMock || !runtime.connected;

  updateQuickDockVisibility(runtime, {
    allowDrawer,
    hasVolume,
    hasHead,
    hasFlashlight,
    hasEmotions,
  });
  syncDrawerHeadReset(runtime, hasHead);
  runtime.updateMockToggleVisibility();
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function attachCapabilitiesUi(runtime) {
  runtime.applyRobotCapabilities = (caps, opts) =>
    applyRobotCapabilities(runtime, caps, opts);
  runtime.featureContext = () => buildFeatureContext(runtime);
}
