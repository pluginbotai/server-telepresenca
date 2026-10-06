import { reportSelectedIcePath } from "./ice-path.js";
import { playRemoteWithSound } from "./peer-remote-playback.js";

/** @param {object} runtime */
export function attachPeerTrackHandlers(runtime) {
  runtime.pc.ontrack = (event) => {
    if (event.track?.kind !== "video") {
      if (
        event.track?.kind === "audio" &&
        event.streams?.[0] &&
        !runtime.els.remoteVideo.srcObject
      ) {
        runtime.els.remoteVideo.srcObject = event.streams[0];
      }
      return;
    }
    const [remoteStream] = event.streams;
    runtime.els.remoteVideo.srcObject = remoteStream || new MediaStream([event.track]);
    runtime.els.remotePlaceholder.classList.add("hidden");
    runtime.setStatus("status.live", "live");
    playRemoteWithSound(runtime);
    if (typeof runtime.onRemoteVideo === "function") runtime.onRemoteVideo("track");
  };

  runtime.pc.onconnectionstatechange = () => {
    runtime.setRtcState(runtime.pc.connectionState);
    if (
      runtime.pc.connectionState === "failed" ||
      runtime.pc.connectionState === "disconnected"
    ) {
      runtime.setStatus("status.webrtcUnstable", "online");
    }
    if (runtime.pc.connectionState !== "connected") return;
    reportSelectedIcePath(runtime.pc).catch((err) =>
      console.warn("Falha ao ler caminho ICE", err),
    );
    runtime.setStatus("status.live", "live");
    if (runtime.hasRenderableRemoteVideo()) {
      runtime.clearOfferRetry();
    }
    if (typeof runtime.onRemoteVideo === "function") runtime.onRemoteVideo("connected");
  };
}
