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

/** @param {object} runtime */
export function scheduleOfferRetryIfNeeded(runtime) {
  runtime.clearOfferRetryTimer();
  runtime.offerRetryTimer = setTimeout(async () => {
    if (!runtime.getSocket() || !runtime.pc) return;
    if (runtime.hasRenderableRemoteVideo()) {
      runtime.clearOfferRetry();
      return;
    }
    if (runtime.offerRetryCount >= MAX_OFFER_RETRIES) return;
    const state = runtime.pc.connectionState;
    if (state === "connected" || state === "connecting") {
      runtime.offerRetryCount += 1;
      if (runtime.offerRetryCount < MAX_OFFER_RETRIES)
        scheduleOfferRetryIfNeeded(runtime);
      return;
    }
    runtime.offerRetryCount += 1;
    console.warn("Sem vídeo do robô; renegociando.", runtime.offerRetryCount, state);
    try {
      if (state === "failed") {
        await runtime.hostFallback.escalate(state);
      }
    } catch (err) {
      console.warn("Offer retry failed", err);
    }
    scheduleOfferRetryIfNeeded(runtime);
  }, 4000);
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
    socket.emit(EVENT_SIGNAL, {
      type: SIGNAL_ANSWER,
      data: runtime.pc.localDescription,
    });
    return;
  }

  if (message.type === SIGNAL_ANSWER) {
    await runtime.pc.setRemoteDescription(message.data);
    await runtime.iceQueue.flush((candidate) => runtime.pc.addIceCandidate(candidate));
    return;
  }

  if (message.type === SIGNAL_ICE_CANDIDATE && message.data) {
    await addIceCandidate(runtime, message.data);
  }
}
