import { createAudioMonitor } from "../media/audio-monitor.js";
import { createMediaController } from "../media/local.js";
import { createLocalPreviewController } from "../media/local-preview.js";
import { createPeerController } from "../webrtc/peer.js";
import { applyOutgoingVideoQuality } from "../webrtc/quality.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function initOperatorMedia(runtime) {
  const { els, t, status, signaling } = runtime;

  runtime.audioMonitor = createAudioMonitor({
    threshold: 12,
    holdTimeMs: 400,
    onVoiceStateChange(speaking) {
      if (runtime.connected) {
        signaling.sendControl("operator.voice", { speaking }, { volatile: true });
      }
    },
  });

  runtime.peer = createPeerController({
    els,
    getIceServers: () => (runtime.meteredAllowed ? runtime.iceServers : []),
    getFallbackIceServers: () => runtime.iceServers,
    onUseMetered() {
      runtime.meteredAllowed = true;
    },
    getSocket: () => signaling.getSocket(),
    getLocalStream: () => runtime.media.getLocalStream(),
    ensureMedia: () => runtime.media.ensureMedia(),
    setRtcState: status.setRtcState,
    setStatus: status.setStatus,
    onRemoteVideo(reason) {
      if (reason === "connected" || reason === "track") {
        runtime.rtcWithRobot = true;
        runtime.updateMockToggleVisibility();
        const preset = runtime.videoQuality.getPanel()?.getSelectedPreset();
        if (preset) {
          applyOutgoingVideoQuality(runtime.peer.getPc(), preset).catch((err) =>
            console.warn(err),
          );
        }
      }
    },
    onControlChannelOpen() {
      if (runtime.connected || runtime.isMockActive) {
        runtime.registry.setEnabled(true);
      }
    },
  });

  runtime.media = createMediaController({
    els,
    t,
    getPc: () => runtime.peer.getPc(),
    startCallAsOfferer: () => runtime.peer.startCallAsOfferer(),
    getSocket: () => signaling.getSocket(),
    onMediaStateChange: () => runtime.localPreview?.sync(),
  });

  runtime.localPreview = createLocalPreviewController({
    els,
    t,
    getStream: () => runtime.media.getLocalStream(),
    getCamTrack: () => runtime.media.getLocalStream()?.getVideoTracks()?.[0] || null,
  });
}
