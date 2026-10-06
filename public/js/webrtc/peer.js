import { hasRenderableRemoteVideo } from "./handshake.js";
import { createHostFallback } from "./host-fallback.js";
import { createIceQueue } from "./ice-queue.js";
import { createPeerConnection } from "./peer-connection.js";
import { cleanupPeerConnection } from "./peer-cleanup.js";
import { playRemoteWithSound } from "./peer-remote-playback.js";
import {
  handlePeerSignal,
  scheduleOfferRetryIfNeeded,
  startCallAsOfferer,
} from "./peer-signaling.js";

/**
 * @param {object} options
 */
export function createPeerController(options) {
  const runtime = {
    ...options,
    pc: null,
    makingOffer: false,
    ignoreOffer: false,
    isPolite: true,
    offerRetryTimer: null,
    offerRetryCount: 0,
    audioUnlockBound: false,
    controlChannel: null,
    iceQueue: createIceQueue(),
    clearOfferRetryTimer() {
      if (runtime.offerRetryTimer) {
        clearTimeout(runtime.offerRetryTimer);
        runtime.offerRetryTimer = null;
      }
    },
    clearOfferRetry() {
      runtime.clearOfferRetryTimer();
      runtime.offerRetryCount = 0;
    },
    hasRenderableRemoteVideo() {
      return hasRenderableRemoteVideo(runtime.els.remoteVideo);
    },
    cleanupPeer(opts) {
      cleanupPeerConnection(runtime, opts);
    },
  };

  runtime.hostFallback = createHostFallback({
    getPc: () => runtime.pc,
    getFallbackServers: () =>
      typeof options.getFallbackIceServers === "function"
        ? options.getFallbackIceServers()
        : [],
    onUseMetered: options.onUseMetered,
    restart: (opts) => startCallAsOfferer(runtime, opts),
  });

  return {
    getPc: () => runtime.pc,
    cleanupPeer: (opts) => runtime.cleanupPeer(opts),
    createPeerConnection: (opts) => createPeerConnection(runtime, opts),
    startCallAsOfferer: (opts) => startCallAsOfferer(runtime, opts),
    handleSignal: (message) => handlePeerSignal(runtime, message),
    scheduleOfferRetryIfNeeded: () => scheduleOfferRetryIfNeeded(runtime),
    clearOfferRetry: () => runtime.clearOfferRetry(),
    playRemoteWithSound: () => playRemoteWithSound(runtime),
    sendDataChannelControl(action, value) {
      const ch = runtime.controlChannel;
      if (!ch || ch.readyState !== "open") return false;
      if (ch.bufferedAmount > 65536) {
        console.warn("[DataChannel] Buffer cheio, descartando comando:", action);
        return false;
      }
      try {
        ch.send(JSON.stringify({ action, value }));
        return true;
      } catch (err) {
        console.warn("Erro ao enviar via DataChannel:", err);
        return false;
      }
    },
    isDataChannelReady() {
      const ch = runtime.controlChannel;
      return Boolean(ch && ch.readyState === "open");
    },
  };
}
