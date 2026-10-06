import { waitWithTimeout } from "../webrtc/handshake.js";
import { attachLocalMediaToPeer } from "./local-peer.js";
/** @param {object} runtime */
export function createLocalMediaCapture(runtime) {
  let mediaRequest = null;
  let mediaGeneration = 0;

  async function ensureMedia({ timeoutMs = 0 } = {}) {
    if (runtime.localStream) return runtime.localStream;
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn(
        "navigator.mediaDevices unavailable in this context; recvonly mode.",
      );
      return null;
    }
    if (!mediaRequest) {
      const generation = mediaGeneration;
      mediaRequest = navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        })
        .then((stream) => {
          if (generation !== mediaGeneration) {
            stream.getTracks().forEach((track) => track.stop());
            return null;
          }
          runtime.setLocalStream(stream);
          runtime.refresh(true);
          return attachLocalMediaToPeer(runtime).then(() => stream);
        })
        .catch((err) => {
          console.warn("Operator camera/microphone unavailable:", err);
          mediaRequest = null;
          return null;
        });
    }
    if (!timeoutMs) return mediaRequest;
    return waitWithTimeout(mediaRequest, timeoutMs, runtime.localStream);
  }

  function stopLocal() {
    runtime.screenShare.stop().catch(() => {});
    if (runtime.localStream) {
      runtime.localStream.getTracks().forEach((track) => track.stop());
      runtime.setLocalStream(null);
    }
    mediaGeneration += 1;
    mediaRequest = null;
  }

  return { ensureMedia, stopLocal, bumpGeneration: () => mediaGeneration++ };
}
