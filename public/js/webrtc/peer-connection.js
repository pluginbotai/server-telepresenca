import { EVENT_SIGNAL, SIGNAL_ICE_CANDIDATE } from "../protocol/events.js";
import { reportGatheredIce } from "./ice-path.js";
import { attachPeerTrackHandlers } from "./peer-track.js";

/** @param {RTCPeerConnection} connection */
function watchIce(connection, runtime) {
  connection.onicegatheringstatechange = () => {
    if (connection.iceGatheringState === "complete") {
      reportGatheredIce(connection).catch((err) =>
        console.warn("Falha ao ler candidatos ICE", err),
      );
    }
  };
  connection.oniceconnectionstatechange = () => {
    const state = connection.iceConnectionState;
    if (state === "connected" || state === "completed") {
      runtime.hostFallback.markConnected();
      return;
    }
    if (state === "failed") {
      runtime.hostFallback
        .escalate("failed")
        .catch((err) => console.warn("Falha ao escalar ICE", err));
    }
  };
}

/**
 * @param {object} runtime
 * @param {{ resetRetry?: boolean }} [opts]
 */
export async function createPeerConnection(runtime, { resetRetry = true } = {}) {
  runtime.cleanupPeer({ resetRetry });
  const iceServers = runtime.getIceServers() || [];
  runtime.pc = new RTCPeerConnection({
    iceServers,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  try {
    runtime.controlChannel = runtime.pc.createDataChannel("control", {
      ordered: false,
      maxRetransmits: 0,
    });
    runtime.controlChannel.bufferedAmountLowThreshold = 65536;
    runtime.controlChannel.onopen = () => {
      console.log("[DataChannel] Canal 'control' conectado (P2P pronto)");
      if (typeof runtime.onControlChannelOpen === "function") {
        runtime.onControlChannelOpen();
      }
    };
    runtime.controlChannel.onclose = () => {
      console.log("[DataChannel] Canal 'control' desconectado");
    };
    runtime.controlChannel.onerror = (err) => {
      console.warn("[DataChannel] Erro no canal 'control':", err);
    };
  } catch (err) {
    console.warn("Falha ao criar DataChannel:", err);
  }

  const localStream = runtime.getLocalStream();
  if (localStream) {
    for (const track of localStream.getTracks()) {
      runtime.pc.addTrack(track, localStream);
    }
  } else {
    try {
      runtime.pc.addTransceiver("video", { direction: "recvonly" });
      runtime.pc.addTransceiver("audio", { direction: "recvonly" });
    } catch (err) {
      console.warn("Failed to add recvonly transceivers:", err);
    }
    runtime.ensureMedia();
  }

  runtime.pc.onicecandidate = (event) => {
    const socket = runtime.getSocket();
    if (event.candidate && socket) {
      socket.emit(EVENT_SIGNAL, {
        type: SIGNAL_ICE_CANDIDATE,
        data: event.candidate,
      });
    }
  };

  watchIce(runtime.pc, runtime);
  attachPeerTrackHandlers(runtime);

  return runtime.pc;
}
