import { attachLocalMediaToPeer } from "./local-peer.js";

/** @param {object} runtime */
export function createLocalMediaToggles(runtime) {
  async function toggleMic(connected) {
    if (!connected) return;
    if (!runtime.localStream) {
      await runtime.ensureMedia();
      await attachLocalMediaToPeer(runtime);
    }
    const track = runtime.micTrack();
    if (!track) return;
    track.enabled = !track.enabled;
    runtime.refresh(connected);
  }

  async function toggleCam(connected) {
    if (!connected) return false;
    if (!runtime.localStream) {
      await runtime.ensureMedia();
      await attachLocalMediaToPeer(runtime);
    }
    const track = runtime.camTrack();
    if (!track) return false;
    track.enabled = !track.enabled;
    runtime.refresh(connected);
    return track.enabled;
  }

  async function toggleScreenShare(connected) {
    if (!connected || !runtime.screenShare.isSupported()) return;
    if (!runtime.localStream) {
      await runtime.ensureMedia();
      await attachLocalMediaToPeer(runtime);
    }
    await runtime.screenShare.toggle();
    runtime.refresh(connected);
  }

  return { toggleMic, toggleCam, toggleScreenShare };
}
