/** @param {object} runtime */
export function cleanupPeerConnection(runtime, { resetRetry = true } = {}) {
  if (resetRetry) runtime.clearOfferRetry();
  runtime.hostFallback.reset();
  runtime.iceQueue.reset();
  if (runtime.controlChannel) {
    runtime.controlChannel.onopen = null;
    runtime.controlChannel.onclose = null;
    runtime.controlChannel.onerror = null;
    try {
      runtime.controlChannel.close();
    } catch {
      /* ignore close error */
    }
    runtime.controlChannel = null;
  }
  if (runtime.pc) {
    runtime.pc.onicecandidate = null;
    runtime.pc.onicegatheringstatechange = null;
    runtime.pc.oniceconnectionstatechange = null;
    runtime.pc.ontrack = null;
    runtime.pc.onconnectionstatechange = null;
    runtime.pc.onsignalingstatechange = null;
    runtime.pc.close();
    runtime.pc = null;
  }
  runtime.els.remoteVideo.srcObject = null;
  runtime.els.remotePlaceholder.classList.remove("hidden");
  runtime.setRtcState("idle");
}
