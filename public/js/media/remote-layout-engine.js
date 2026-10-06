import {
  computeIntegerDrawRect,
  computeIntegerVideoLayout,
} from "./remote-layout-math.js";

/**
 * @param {HTMLVideoElement} videoEl
 * @param {HTMLElement} stageEl
 * @param {HTMLElement} host
 * @param {HTMLCanvasElement | null} canvas
 */
export function createRemoteLayoutEngine(videoEl, stageEl, host, canvas) {
  const ctx = canvas ? canvas.getContext("2d", { alpha: false }) : null;
  let layoutRaf = 0;
  let drawRaf = 0;
  /** @type {ReturnType<typeof computeIntegerVideoLayout> | null} */
  let layout = null;
  let videoFrameHandle = 0;

  const drawFrame = () => {
    if (!canvas || !ctx || !layout) return;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh || videoEl.readyState < 2) return;
    const rect = computeIntegerDrawRect(layout.width, layout.height, vw, vh);
    try {
      ctx.drawImage(videoEl, 0, 0, vw, vh, rect.x, rect.y, rect.w, rect.h);
    } catch {
      /* frame ainda não decodificado */
    }
  };

  const scheduleDraw = () => {
    if (!canvas) return;
    cancelAnimationFrame(drawRaf);
    drawRaf = requestAnimationFrame(drawFrame);
  };

  const syncLayout = () => {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const sw = stageEl.clientWidth;
    const sh = stageEl.clientHeight;
    if (!vw || !vh || !sw || !sh) return;

    const next = computeIntegerVideoLayout(sw, sh, vw, vh);
    if (!next) return;

    layout = next;
    host.style.width = `${next.width}px`;
    host.style.height = `${next.height}px`;
    host.style.left = `${next.left}px`;
    host.style.top = `${next.top}px`;
    host.dataset.layoutSynced = "1";

    if (canvas && ctx) {
      if (canvas.width !== next.width || canvas.height !== next.height) {
        canvas.width = next.width;
        canvas.height = next.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, next.width, next.height);
      }
      scheduleDraw();
    }
  };

  const scheduleLayout = () => {
    cancelAnimationFrame(layoutRaf);
    layoutRaf = requestAnimationFrame(syncLayout);
  };

  const onVideoFrame = () => {
    drawFrame();
    if (typeof videoEl.requestVideoFrameCallback === "function") {
      videoFrameHandle = videoEl.requestVideoFrameCallback(onVideoFrame);
    }
  };

  const startVideoFrameLoop = () => {
    if (!canvas || typeof videoEl.requestVideoFrameCallback !== "function") return;
    stopVideoFrameLoop();
    videoFrameHandle = videoEl.requestVideoFrameCallback(onVideoFrame);
  };

  const stopVideoFrameLoop = () => {
    if (videoFrameHandle && typeof videoEl.cancelVideoFrameCallback === "function") {
      videoEl.cancelVideoFrameCallback(videoFrameHandle);
      videoFrameHandle = 0;
    }
  };

  return {
    scheduleLayout,
    startVideoFrameLoop,
    stopVideoFrameLoop,
    cancelRafs() {
      cancelAnimationFrame(layoutRaf);
      cancelAnimationFrame(drawRaf);
    },
  };
}
