import { beepFeature } from "../features/beep.js";
import { flashlightFeature } from "../features/flashlight.js";
import { createHeadFeature } from "../features/head.js";
import { createLocomotionFeature } from "../features/locomotion.js";
import { createLocomotionSpeedFeature } from "../features/locomotion-speed.js";
import { createPowerFeature } from "../features/power.js";
import { createFeatureRegistry } from "../features/registry.js";
import { expressionsFeature } from "../features/expressions.js";
import { createVideoQualityFeature } from "../features/video-quality.js";
import { createVolumeFeature } from "../features/volume.js";
import { createSessionCountdown } from "../invite/countdown.js";
import { bindLangSwitch } from "../ui/lang-switch.js";
import { createRobotDrawer } from "../ui/drawer.js";
import { createStatus } from "../ui/status.js";
import { createObstacleAlert } from "../ui/obstacle-alert.js";
import { createSignalingClient } from "../signaling/client.js";

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {object} options
 */
export function initOperatorFeatures(runtime, options) {
  const { els, i18n, ioClient, expiresAt } = options;
  const t = runtime.t;

  runtime.status = createStatus(els, t);
  runtime.obstacleAlert = createObstacleAlert(els);
  runtime.lang = bindLangSwitch(els, i18n);
  runtime.signaling = createSignalingClient(ioClient);

  runtime.robotDrawer = createRobotDrawer({
    drawerEl: els.robotDrawer,
    toggleBtn: els.btnToggleRobotDrawer,
    closeBtn: els.btnCloseRobotDrawer,
    backdropEl: els.robotDrawerBackdrop,
    quickDockEl: els.robotQuickDock,
    btnQuickVolume: els.btnQuickVolume,
    btnQuickHeadReset: els.btnQuickHeadReset,
    btnQuickFlashlight: els.btnQuickFlashlight,
    btnQuickEmotions: els.btnQuickEmotions,
    btnMockToggle: els.btnToggleMockRobot,
    getIsMockActive: () => runtime.isMockActive,
    t,
  });

  runtime.countdown = createSessionCountdown({
    els,
    t,
    expiresAt,
    onExpired() {
      runtime.endedByExpiry = true;
      runtime.disconnect({ ended: true });
    },
  });

  runtime.locomotion = createLocomotionFeature(els, t);
  runtime.locomotionSpeed = createLocomotionSpeedFeature(els, t);
  runtime.head = createHeadFeature(els, t);
  runtime.videoQuality = createVideoQualityFeature(els, t);
  runtime.power = createPowerFeature(els, t);
  runtime.volume = createVolumeFeature(els, t);
  runtime.registry = createFeatureRegistry([
    runtime.locomotion,
    runtime.locomotionSpeed,
    runtime.head,
    beepFeature,
    runtime.videoQuality,
    flashlightFeature,
    runtime.power,
    runtime.volume,
    expressionsFeature,
  ]);
}
