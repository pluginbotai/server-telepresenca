/**
 * @param {object} runtime
 */
export async function playRemoteWithSound(runtime) {
  const video = runtime.els.remoteVideo;
  if (!video.srcObject) return;
  try {
    video.muted = true;
    await video.play();
  } catch (_) {
    /* autoplay muted still blocked — rare */
  }
  video.muted = false;
  video.volume = 1;
  try {
    await video.play();
  } catch (_) {
    video.muted = true;
    unlockRemoteAudioOnce(runtime);
    try {
      await video.play();
    } catch (__) {
      /* wait for gesture */
    }
  }
}

/** @param {object} runtime */
export function unlockRemoteAudioOnce(runtime) {
  if (runtime.audioUnlockBound) return;
  runtime.audioUnlockBound = true;
  const unlock = () => {
    runtime.audioUnlockBound = false;
    playRemoteWithSound(runtime);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
