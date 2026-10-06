const DISMISS_STORAGE_KEY = "telepresenca.selfView.dismissed";

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function persistDismissed(value) {
  try {
    if (value) sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    else sessionStorage.removeItem(DISMISS_STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {{
 *   connected: boolean;
 *   dismissed: boolean;
 *   camEnabled: boolean;
 *   hasLocalVideo: boolean;
 * }} state
 */
export function shouldShowLocalPreview(state) {
  return Boolean(
    state.connected && !state.dismissed && state.camEnabled && state.hasLocalVideo,
  );
}

/**
 * @param {object} options
 * @param {ReturnType<import("../ui/dom.js").queryDom>} options.els
 * @param {(key: string) => string} options.t
 * @param {() => MediaStream | null} options.getStream
 * @param {() => MediaStreamTrack | null} options.getCamTrack
 */
export function createLocalPreviewController({ els, t, getStream, getCamTrack }) {
  let connected = false;
  let dismissed = readDismissed();
  let prevCamEnabled = false;

  function applyPreviewVisibility(show, stream) {
    if (els.localPreview) {
      els.localPreview.hidden = !show;
    }
    if (!els.localPreviewVideo) return;
    if (show) {
      if (els.localPreviewVideo.srcObject !== stream) {
        els.localPreviewVideo.srcObject = stream;
      }
      els.localPreviewVideo.play().catch(() => {});
      return;
    }
    els.localPreviewVideo.srcObject = null;
  }

  function sync() {
    const stream = getStream();
    const cam = getCamTrack();
    const camEnabled = Boolean(cam?.enabled);
    const hasLocalVideo = Boolean(
      stream?.getVideoTracks?.().some((track) => track.readyState !== "ended"),
    );

    if (camEnabled && !prevCamEnabled) {
      dismissed = false;
      persistDismissed(false);
    }
    prevCamEnabled = camEnabled;

    const show = shouldShowLocalPreview({
      connected,
      dismissed,
      camEnabled,
      hasLocalVideo,
    });
    applyPreviewVisibility(show, stream);
  }

  function setConnected(value) {
    connected = value;
    if (!value) {
      dismissed = false;
      prevCamEnabled = false;
      persistDismissed(false);
    }
    sync();
  }

  function dismiss() {
    dismissed = true;
    persistDismissed(true);
    sync();
  }

  function refreshLabels() {
    if (els.btnLocalPreviewClose) {
      els.btnLocalPreviewClose.setAttribute("aria-label", t("media.selfViewHide"));
    }
    if (els.localPreviewVideo) {
      els.localPreviewVideo.setAttribute("aria-label", t("media.selfView"));
    }
  }

  function bind() {
    els.btnLocalPreviewClose?.addEventListener("click", dismiss);
  }

  return { bind, sync, setConnected, refreshLabels, dismiss };
}
