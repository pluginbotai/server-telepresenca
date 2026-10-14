import { createScreenShareController } from "./screen-share.js";
import { refreshMediaButtons } from "./local-refresh.js";
import { attachLocalMediaToPeer } from "./local-peer.js";
import { createLocalMediaCapture } from "./local-capture.js";
import { createLocalMediaToggles } from "./local-toggles.js";

/** @param {object} options */
export function createMediaController(options) {
  const { els, t, getPc, startCallAsOfferer, getSocket, onMediaStateChange } = options;
  let localStream = null;

  const micTrack = () => (localStream ? localStream.getAudioTracks()[0] : null);
  const camTrack = () => (localStream ? localStream.getVideoTracks()[0] : null);

  const screenShare = createScreenShareController({
    getPc,
    getCamTrack: camTrack,
    onStateChange: () => refresh(true),
    onError: (err) => {
      console.warn("Screen share error:", err);
      refresh(true);
    },
    renegotiate: () => {
      const pc = getPc();
      if (!pc || pc.signalingState !== "stable" || !getSocket()) return undefined;
      return startCallAsOfferer();
    },
  });

  const runtime = {
    getPc,
    getSocket,
    startCallAsOfferer,
    get localStream() {
      return localStream;
    },
    setLocalStream(stream) {
      localStream = stream;
    },
    getLocalStream: () => localStream,
    screenShare,
    micTrack,
    camTrack,
    els,
    t,
    onMediaStateChange,
  };

  function refresh(connected) {
    refreshMediaButtons({
      els,
      t,
      screenShare,
      micTrack,
      camTrack,
      onMediaStateChange,
      connected,
    });
  }
  runtime.refresh = refresh;

  const capture = createLocalMediaCapture(runtime);
  runtime.ensureMedia = capture.ensureMedia;
  const toggles = createLocalMediaToggles(runtime);

  return {
    ensureMedia: capture.ensureMedia,
    attachLocalMediaToPeer: () => attachLocalMediaToPeer(runtime),
    refreshMediaButtons: refresh,
    stopLocal: capture.stopLocal,
    toggleMic: toggles.toggleMic,
    toggleCam: toggles.toggleCam,
    toggleScreenShare: toggles.toggleScreenShare,
    isScreenSharing: () => screenShare.isSharing(),
    getLocalStream: () => localStream,
    isCamOn: () => Boolean(camTrack()?.enabled),
  };
}
