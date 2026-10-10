import {
  EVENT_SIGNAL,
  SIGNAL_ANSWER,
  SIGNAL_ICE_CANDIDATE,
  SIGNAL_OFFER,
} from "../protocol/events.js";
import { offerSignalData } from "./host-fallback.js";
import { createPeerConnection } from "./peer-connection.js";

const MAX_OFFER_RETRIES = 2;

/** @param {object} runtime */
export async function startCallAsOfferer(
  runtime,
  { iceRestart = false, escalate = false } = {},
) {
  const socket = runtime.getSocket();
  if (!socket) return;
  if (!runtime.pc) await createPeerConnection(runtime);
  runtime.makingOffer = true;
  try {
    const offer = await runtime.pc.createOffer(
      iceRestart ? { iceRestart: true } : undefined,
    );
    await runtime.pc.setLocalDescription(offer);
    socket.emit(EVENT_SIGNAL, {
      type: SIGNAL_OFFER,
      data: offerSignalData(runtime.pc.localDescription, escalate),
    });
    if (!escalate) runtime.hostFallback.arm();
  } finally {
    runtime.makingOffer = false;
  }
}

/**
 * Vídeo do robô ainda não chegou. "wait" não mexe numa ICE que ainda sobe.
 * "resend" repete a offer já criada (a answer se perdeu no sinal).
 * "restart" só quando a ICE morreu ou a PeerConnection fechou.
 *
 * @param {{ connectionState?: string, signalingState?: string, retryCount?: number, maxRetries?: number }} input
 * @returns {"stop" | "wait" | "resend" | "restart" | "renegotiate"}
 */
export function planOfferRetryAction({
  connectionState,
  signalingState,
  retryCount = 0,
  maxRetries = MAX_OFFER_RETRIES,
}) {
  if (retryCount >= maxRetries) return "stop";
  if (connectionState === "connected" || connectionState === "connecting")
    return "wait";
  if (connectionState === "closed" || signalingState === "closed") return "restart";
  if (signalingState === "have-local-offer") return "resend";
  if (connectionState === "failed" || connectionState === "disconnected")
    return "restart";
  return "renegotiate";
}

/** @param {object} runtime */
export function scheduleOfferRetryIfNeeded(runtime) {
  runtime.clearOfferRetryTimer();
  runtime.offerRetryTimer = setTimeout(() => {
    runOfferRetry(runtime).catch((err) => console.warn("Offer retry failed", err));
  }, 4000);
}

/**
 * Um passo do retry. Separado do timer para o teste ver o efeito sem esperar 4s.
 *
 * @param {object} runtime
 */
export async function runOfferRetry(runtime) {
  if (!runtime.getSocket() || !runtime.pc) return;
  if (runtime.hasRenderableRemoteVideo()) {
    runtime.clearOfferRetry();
    return;
  }
  const action = planOfferRetryAction({
    connectionState: runtime.pc.connectionState,
    signalingState: runtime.pc.signalingState,
    retryCount: runtime.offerRetryCount,
  });
  if (action === "stop") return;
  runtime.offerRetryCount += 1;
  if (action !== "wait") {
    console.warn(
      "Sem vídeo do robô; renegociando.",
      runtime.offerRetryCount,
      action,
      runtime.pc.connectionState,
    );
    try {
      await applyOfferRetry(runtime, action);
    } catch (err) {
      console.warn("Offer retry failed", err);
    }
  }
  if (runtime.offerRetryCount < MAX_OFFER_RETRIES) {
    scheduleOfferRetryIfNeeded(runtime);
  }
}

/**
 * @param {object} runtime
 * @param {"resend" | "restart" | "renegotiate"} action
 */
async function applyOfferRetry(runtime, action) {
  const socket = runtime.getSocket();
  if (!socket || !runtime.pc) return;
  if (action === "resend") {
    const description = runtime.pc.localDescription;
    if (!description) return;
    socket.emit(EVENT_SIGNAL, {
      type: SIGNAL_OFFER,
      data: offerSignalData(description, false),
    });
    return;
  }
  if (
    action === "restart" &&
    (runtime.pc.connectionState === "closed" || runtime.pc.signalingState === "closed")
  ) {
    await createPeerConnection(runtime);
    await startCallAsOfferer(runtime);
    return;
  }
  if (runtime.pc.signalingState !== "stable") return;
  if (action === "restart" && runtime.pc.connectionState === "failed") {
    const escalated = await runtime.hostFallback.escalate("failed");
    if (escalated) return;
  }
  await startCallAsOfferer(runtime, {
    iceRestart: action === "restart",
  });
}

/** @param {object} runtime */
export async function addIceCandidate(runtime, candidate) {
  if (!runtime.pc || !candidate) return;
  if (runtime.iceQueue.enqueueIfNeeded(candidate)) return;
  try {
    await runtime.pc.addIceCandidate(candidate);
  } catch (err) {
    if (!runtime.ignoreOffer) {
      console.warn("ICE candidate error", err);
    }
  }
}

/** @param {object} runtime */
export async function handlePeerSignal(runtime, message) {
  if (!message?.type) return;
  const socket = runtime.getSocket();

  if (!runtime.pc) {
    await createPeerConnection(runtime);
  }

  if (message.type === SIGNAL_OFFER) {
    const offerCollision =
      runtime.makingOffer || runtime.pc.signalingState !== "stable";
    runtime.ignoreOffer = !runtime.isPolite && offerCollision;
    if (runtime.ignoreOffer) return;

    await runtime.pc.setRemoteDescription(message.data);
    await runtime.iceQueue.flush((candidate) => runtime.pc.addIceCandidate(candidate));
    const answer = await runtime.pc.createAnswer();
    await runtime.pc.setLocalDescription(answer);
    if (!socket) return;
    socket.emit(EVENT_SIGNAL, {
      type: SIGNAL_ANSWER,
      data: runtime.pc.localDescription,
    });
    return;
  }

  if (message.type === SIGNAL_ANSWER) {
    // Answer atrasada ou repetida, com a sinalização já estável, rejeita
    // setRemoteDescription e o handler pintava a chamada como erro.
    if (runtime.pc.signalingState !== "have-local-offer") return;
    await runtime.pc.setRemoteDescription(message.data);
    await runtime.iceQueue.flush((candidate) => runtime.pc.addIceCandidate(candidate));
    return;
  }

  if (message.type === SIGNAL_ICE_CANDIDATE && message.data) {
    await addIceCandidate(runtime, message.data);
  }
}
