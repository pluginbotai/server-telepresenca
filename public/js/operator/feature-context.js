import { hostById } from "../ui/dom.js";
import { routeControl } from "../signaling/control-route.js";

/**
 * @typedef {object} FeatureContext
 * @property {(action: string, value: unknown, opts?: object) => void} sendControl
 * @property {(presetId: string) => void} sendVideoQuality
 * @property {(key: string, vars?: object) => string} t
 * @property {(id: string) => HTMLElement | null} host
 * @property {() => boolean} isConnected
 * @property {object | null} caps
 * @property {(preset: object) => Promise<void>} onQualityPresetChange
 */

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function buildFeatureContext(runtime) {
  /** @returns {FeatureContext} */
  return {
    sendControl: (action, value, opts) => {
      if (runtime.isMockActive && !runtime.connected) {
        runtime.handleMockControl(action, value);
        return;
      }
      if (!runtime.connected) return;
      routeControl({
        action,
        value,
        opts,
        sendP2P: (a, v) => runtime.peer.sendDataChannelControl(a, v),
        sendSocket: (a, v, o) => runtime.signaling.sendControl(a, v, o),
      });
    },
    sendVideoQuality: (presetId) => {
      if (!runtime.connected) return;
      runtime.signaling.sendVideoQuality(presetId);
    },
    t: runtime.t,
    host: (id) => hostById(id, runtime.els),
    isConnected: () => runtime.isConnected(),
    caps: runtime.robotCapabilities,
    onQualityPresetChange: (preset) => runtime.handleQualityPresetChange(preset),
    /** Expressões no Cruzr usam avatar estático — alinha câmera do operador se ainda estiver ligada. */
    syncRobotAvatarForFace: (face) => {
      if (!runtime.connected) return;
      const cam = runtime.media.getLocalStream()?.getVideoTracks()?.[0];
      if (!cam?.enabled) return;
      cam.enabled = false;
      runtime.media.refreshMediaButtons(true);
      runtime.signaling.sendControl("operator.camera", {
        enabled: false,
        face,
      });
      runtime.audioMonitor.attachStream(runtime.media.getLocalStream());
    },
  };
}
