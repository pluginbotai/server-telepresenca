import { disconnectOperator } from "./session-end.js";
import { resolveRoomId } from "./resolve-room.js";
import { initOperatorFeatures } from "./init-features.js";
import { initOperatorMedia } from "./init-media.js";

/**
 * @typedef {object} OperatorRuntime
 * @property {ReturnType<import("../ui/dom.js").queryDom>} els
 * @property {import("../i18n/index.js").i18n} i18n
 * @property {(key: string, vars?: object) => string} t
 * @property {ReturnType<import("../ui/status.js").createStatus>} status
 * @property {ReturnType<import("../ui/obstacle-alert.js").createObstacleAlert>} obstacleAlert
 * @property {ReturnType<import("../ui/lang-switch.js").bindLangSwitch>} lang
 * @property {ReturnType<import("../signaling/client.js").createSignalingClient>} signaling
 * @property {ReturnType<import("../ui/drawer.js").createRobotDrawer>} robotDrawer
 * @property {ReturnType<import("../invite/countdown.js").createSessionCountdown>} countdown
 * @property {ReturnType<import("../features/locomotion.js").createLocomotionFeature>} locomotion
 * @property {ReturnType<import("../features/locomotion-speed.js").createLocomotionSpeedFeature>} locomotionSpeed
 * @property {ReturnType<import("../features/head.js").createHeadFeature>} head
 * @property {ReturnType<import("../features/video-quality.js").createVideoQualityFeature>} videoQuality
 * @property {ReturnType<import("../features/power.js").createPowerFeature>} power
 * @property {ReturnType<import("../features/volume.js").createVolumeFeature>} volume
 * @property {ReturnType<import("../features/registry.js").createFeatureRegistry>} registry
 * @property {ReturnType<import("../media/audio-monitor.js").createAudioMonitor>} audioMonitor
 * @property {ReturnType<import("../webrtc/peer.js").createPeerController>} peer
 * @property {ReturnType<import("../media/local.js").createMediaController>} media
 * @property {ReturnType<import("../media/local-preview.js").createLocalPreviewController>} localPreview
 * @property {string} roomId
 * @property {boolean} inviteBound
 * @property {number | null} expiresAt
 * @property {(() => Promise<boolean | void> | boolean | void) | null} beforeConnect
 * @property {boolean} isMockActive
 * @property {object | null} liveRobotCapabilities
 * @property {boolean} mockFlashlightActive
 * @property {number | null} graceTimer
 * @property {boolean} endedByExpiry
 * @property {boolean} endedByReplace
 * @property {ReturnType<import("../invite/redirect.js").startRedirectCountdown> | null} redirectController
 * @property {ReturnType<import("../invite/reconnect.js").monitorInviteRejoinExpiry> | null} inviteExpiryMonitor
 * @property {object[]} iceServers
 * @property {boolean} meteredAllowed
 * @property {boolean} connected
 * @property {boolean} connecting
 * @property {boolean} robotPeerPresent
 * @property {boolean} rtcWithRobot
 * @property {object | null} robotCapabilities
 * @property {boolean} qualityApplying
 * @property {boolean} callStartInFlight
 * @property {(opts?: object) => void} disconnect
 * @property {(preset: object) => Promise<void>} handleQualityPresetChange
 * @property {() => Promise<void>} beginCallWithRobot
 * @property {(action: string, value: unknown) => void} handleMockControl
 * @property {() => boolean} isConnected
 * @property {() => import("./feature-context.js").FeatureContext} featureContext
 * @property {(caps: object | null, opts?: { fromMock?: boolean }) => void} applyRobotCapabilities
 * @property {() => void} updateControlEnabling
 * @property {() => void} updateMockToggleVisibility
 * @property {(active: boolean, model?: string) => void} setMockRobotActive
 * @property {(isConnectedFlag: boolean) => void} setConnectedUi
 * @property {() => void} refreshDynamicText
 * @property {ReturnType<import("../ui/call-bar-overflow.js").initCallBarOverflow> | null} callOverflow
 * @property {ReturnType<import("../ui/tooltip.js").initTooltips> | null} hudTooltips
 */

/**
 * @param {object} options
 * @param {ReturnType<import("../ui/dom.js").queryDom>} options.els
 * @param {import("../i18n/index.js").i18n} options.i18n
 * @param {typeof io} options.ioClient
 */
export function createOperatorRuntime(options) {
  const {
    els,
    i18n,
    roomId: roomIdOption,
    expiresAt = null,
    beforeConnect = null,
  } = options;

  const t = (key, vars) => i18n.t(key, vars);

  /** @type {OperatorRuntime} */
  const runtime = {
    els,
    i18n,
    t,
    status: null,
    obstacleAlert: null,
    lang: null,
    signaling: null,
    robotDrawer: null,
    countdown: null,
    locomotion: null,
    locomotionSpeed: null,
    head: null,
    videoQuality: null,
    power: null,
    volume: null,
    registry: null,
    audioMonitor: null,
    peer: null,
    media: null,
    localPreview: null,
    roomId: roomIdOption || resolveRoomId(),
    inviteBound: typeof beforeConnect === "function",
    expiresAt,
    beforeConnect,
    isMockActive: false,
    liveRobotCapabilities: null,
    mockFlashlightActive: false,
    mockFollowActive: false,
    graceTimer: null,
    endedByExpiry: false,
    endedByReplace: false,
    redirectController: null,
    inviteExpiryMonitor: null,
    iceServers: [],
    meteredAllowed: false,
    connected: false,
    connecting: false,
    robotPeerPresent: false,
    rtcWithRobot: false,
    robotCapabilities: null,
    qualityApplying: false,
    callStartInFlight: false,
    disconnect: (opts) => disconnectOperator(runtime, opts),
    handleQualityPresetChange: async () => {},
    beginCallWithRobot: async () => {},
    handleMockControl: () => {},
    isConnected: () => false,
    featureContext: () => ({}),
    applyRobotCapabilities: () => {},
    updateControlEnabling: () => {},
    updateMockToggleVisibility: () => {},
    setMockRobotActive: () => {},
    setConnectedUi: () => {},
    refreshDynamicText: () => {},
    callOverflow: null,
    hudTooltips: null,
  };

  initOperatorFeatures(runtime, options);
  initOperatorMedia(runtime);

  return runtime;
}
