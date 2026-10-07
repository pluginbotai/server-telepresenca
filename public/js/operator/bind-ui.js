import { isMockRequested, resolveMockType } from "../features/mock-robot.js";
import { initCallBarOverflow } from "../ui/call-bar-overflow.js";
import { initTooltips } from "../ui/tooltip.js";
import { onCompactViewportChange } from "../ui/viewport-mode.js";
import { buildFeatureContext } from "./feature-context.js";
import { expressionsFeature } from "../features/expressions.js";
import { connectOperator } from "./connect.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
function bindMediaControls(runtime) {
  const { els, media, signaling, audioMonitor } = runtime;
  els.btnToggleMic.addEventListener("click", () => {
    media.toggleMic(runtime.connected).catch((err) => console.error(err));
  });
  els.btnToggleCam.addEventListener("click", () => {
    media
      .toggleCam(runtime.connected)
      .then((camEnabled) => {
        if (runtime.connected) {
          const activeFace = expressionsFeature.getCurrentFace();
          signaling.sendControl("operator.camera", {
            enabled: camEnabled,
            face: activeFace,
          });
          if (!camEnabled) {
            audioMonitor.attachStream(media.getLocalStream());
          } else {
            audioMonitor.detachStream();
          }
        }
      })
      .catch((err) => console.error(err));
  });
  if (els.btnToggleScreenShare) {
    els.btnToggleScreenShare.addEventListener("click", () => {
      media.toggleScreenShare(runtime.connected).catch((err) => console.error(err));
    });
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
function bindQuickActions(runtime) {
  const { els, signaling, robotDrawer } = runtime;

  if (els.btnQuickHeadReset) {
    els.btnQuickHeadReset.addEventListener("click", () => {
      if (runtime.connected) {
        signaling.sendControl("head.reset", undefined, { volatile: false });
      } else if (runtime.isMockActive) {
        runtime.handleMockControl("head.reset");
      }
    });
  }

  if (els.btnQuickFlashlight) {
    els.btnQuickFlashlight.addEventListener("click", () => {
      const modes = runtime.robotCapabilities?.flashlight?.modes || ["toggle"];
      const action = modes.includes("toggle") ? "flashlight.toggle" : "flashlight.on";
      if (runtime.connected) {
        signaling.sendControl(action, undefined, { volatile: false });
      } else if (runtime.isMockActive) {
        runtime.handleMockControl(action);
      }
    });
  }

  if (els.btnQuickEmotions) {
    els.btnQuickEmotions.addEventListener("click", () => {
      if (!robotDrawer.isOpen()) {
        robotDrawer.open();
      }
      els.drawerExpressionsHost?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function bindOperatorUi(runtime) {
  runtime.registry.apply(null, buildFeatureContext(runtime));

  runtime.els.btnHangup.addEventListener("click", () =>
    runtime.disconnect({ ended: true }),
  );
  runtime.els.btnRejoin.addEventListener("click", () => {
    if (runtime.inviteExpiryMonitor) {
      runtime.inviteExpiryMonitor.stop();
      runtime.inviteExpiryMonitor = null;
    }
    if (runtime.redirectController) {
      runtime.redirectController.cancel();
      runtime.redirectController = null;
      if (runtime.els.redirectCountdown) {
        runtime.els.redirectCountdown.classList.add("hidden");
      }
    }
    runtime.endedByExpiry = false;
    runtime.endedByReplace = false;
    connectOperator(runtime, { force: true }).catch((err) => console.error(err));
  });

  bindMediaControls(runtime);

  if (runtime.els.btnToggleMockRobot) {
    runtime.els.btnToggleMockRobot.addEventListener("click", () => {
      const targetModel = resolveMockType(window.location.search);
      runtime.setMockRobotActive(!runtime.isMockActive, targetModel);
    });
    runtime.updateMockToggleVisibility();
  }

  bindQuickActions(runtime);

  if (isMockRequested(window.location.search)) {
    const mockModel = resolveMockType(window.location.search);
    runtime.setMockRobotActive(true, mockModel);
  }

  runtime.localPreview?.bind();

  runtime.hudTooltips = initTooltips(
    document,
    ".ctrl, .quick-dock-btn, .robot-drawer-face-tile",
  );
  runtime.callOverflow = initCallBarOverflow({ els: runtime.els, t: runtime.t });

  document.addEventListener("localechange", () => {
    runtime.refreshDynamicText();
    runtime.hudTooltips?.update();
    runtime.callOverflow?.sync();
  });
  onCompactViewportChange(() => {
    runtime.refreshDynamicText();
    runtime.callOverflow?.sync();
  });
  runtime.refreshDynamicText();
  runtime.hudTooltips?.update();
  runtime.callOverflow?.sync();
  runtime.countdown.start();
}
