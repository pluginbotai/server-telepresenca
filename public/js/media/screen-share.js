/**
 * @param {Navigator | null} [nav]
 * @returns {boolean}
 */
export function isScreenShareSupported(
  nav = typeof navigator !== "undefined" ? navigator : null,
) {
  return Boolean(nav?.mediaDevices?.getDisplayMedia);
}

/**
 * Transceiver recvonly tem sender de vídeo com track nula. getSenders()
 * filtrado por track perde esse sender e o compartilhamento não sai.
 *
 * @param {RTCPeerConnection | null} pc
 */
function videoTransceiver(pc) {
  if (!pc || typeof pc.getTransceivers !== "function") return null;
  return (
    pc.getTransceivers().find((item) => {
      const kind = item.receiver?.track?.kind || item.sender?.track?.kind;
      return kind === "video";
    }) || null
  );
}

/**
 * @param {RTCPeerConnection | null} pc
 */
export function getVideoSender(pc) {
  if (!pc) return null;
  const transceiver = videoTransceiver(pc);
  if (transceiver?.sender) return transceiver.sender;
  const senders = typeof pc.getSenders === "function" ? pc.getSenders() : [];
  return (
    senders.find((sender) => sender.track && sender.track.kind === "video") || null
  );
}

/**
 * @param {RTCPeerConnection | null} pc
 * @param {MediaStreamTrack | null} newTrack
 * @returns {Promise<{ ok: boolean, needsRenegotiation: boolean }>}
 */
export async function swapVideoTrack(pc, newTrack) {
  const sender = getVideoSender(pc);
  if (!sender) return { ok: false, needsRenegotiation: false };
  const transceiver = videoTransceiver(pc);
  const needsRenegotiation =
    transceiver?.direction === "recvonly" || transceiver?.direction === "inactive";
  if (needsRenegotiation) transceiver.direction = "sendrecv";
  await sender.replaceTrack(newTrack);
  return { ok: true, needsRenegotiation };
}

/**
 * @param {(() => Promise<MediaStream>) | null} [customGetter]
 */
export async function acquireDisplayStream(customGetter) {
  if (typeof customGetter === "function") {
    return customGetter();
  }
  if (!navigator?.mediaDevices?.getDisplayMedia) {
    throw new Error("getDisplayMedia is not supported in this browser");
  }
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
      displaySurface: "monitor",
    },
    audio: false,
  });
}

/**
 * @param {MediaStream | null} stream
 */
export function stopMediaStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
}

/**
 * @param {object} options
 * @param {() => RTCPeerConnection | null} options.getPc
 * @param {() => MediaStreamTrack | null} options.getCamTrack
 * @param {() => Promise<MediaStream>} [options.getDisplayMedia]
 * @param {(active: boolean) => void} [options.onStateChange]
 * @param {(err: Error) => void} [options.onError]
 * @param {() => Promise<void> | void} [options.renegotiate]
 */
export function createScreenShareController({
  getPc,
  getCamTrack,
  getDisplayMedia,
  onStateChange = () => {},
  onError = () => {},
  renegotiate = null,
}) {
  let screenStream = null;
  let active = false;

  function isSupported() {
    return (
      typeof getDisplayMedia === "function" ||
      isScreenShareSupported(typeof navigator !== "undefined" ? navigator : null)
    );
  }

  function handleTrackEnded() {
    return stop().catch((err) => onError(err));
  }

  async function start() {
    if (active) return true;
    if (!isSupported()) {
      onError(new Error("Screen sharing not supported on this device/browser"));
      return false;
    }
    /** @type {MediaStream | null} */
    let stream = null;
    try {
      stream = await acquireDisplayStream(getDisplayMedia);
      const track = stream?.getVideoTracks()?.[0];
      if (!track) throw new Error("No video track found in screen share stream");
      try {
        track.contentHint = "detail";
      } catch {
        /* ignore */
      }
      const swapped = await swapVideoTrack(getPc(), track);
      if (!swapped.ok) {
        stopMediaStream(stream);
        stream = null;
        onError(new Error("No video sender available for screen share"));
        return false;
      }
      if (swapped.needsRenegotiation && typeof renegotiate === "function") {
        await renegotiate();
      }
      screenStream = stream;
      active = true;
      track.onended = handleTrackEnded;
      onStateChange(true);
      return true;
    } catch (err) {
      if (!active && stream) stopMediaStream(stream);
      onError(err);
      return false;
    }
  }

  async function stop() {
    if (!active && !screenStream) return;
    stopMediaStream(screenStream);
    screenStream = null;
    active = false;
    const cameraTrack = typeof getCamTrack === "function" ? getCamTrack() : null;
    await swapVideoTrack(getPc(), cameraTrack);
    onStateChange(false);
  }

  async function toggle() {
    if (active) {
      await stop();
      return false;
    }
    return start();
  }

  return {
    isSupported,
    isSharing: () => active,
    start,
    stop,
    toggle,
  };
}
