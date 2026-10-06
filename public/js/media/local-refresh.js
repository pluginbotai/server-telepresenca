/**
 * @param {object} deps
 */
export function refreshMediaButtons(deps) {
  const { els, t, screenShare, micTrack, camTrack, onMediaStateChange, connected } =
    deps;
  const mic = micTrack();
  const cam = camTrack();
  const micOn = Boolean(mic?.enabled);
  const camOn = Boolean(cam?.enabled);
  els.btnToggleMic.classList.toggle("is-off", connected && !micOn);
  els.btnToggleCam.classList.toggle("is-off", connected && !camOn);
  els.btnToggleMic.setAttribute(
    "aria-label",
    t(micOn ? "media.micOn" : "media.micOff"),
  );
  els.btnToggleCam.setAttribute(
    "aria-label",
    t(camOn ? "media.camOn" : "media.camOff"),
  );

  if (els.btnToggleScreenShare) {
    const supported = screenShare.isSupported();
    const sharing = screenShare.isSharing();
    els.btnToggleScreenShare.disabled = !connected || !supported;
    els.btnToggleScreenShare.classList.toggle("is-sharing", sharing);
    const key = !supported
      ? "media.screenShareUnsupported"
      : sharing
        ? "media.screenShareOn"
        : "media.screenShareOff";
    els.btnToggleScreenShare.setAttribute("aria-label", t(key));
  }
  if (typeof onMediaStateChange === "function") {
    onMediaStateChange();
  }
}
