import { createRemoteLayoutEngine } from "./remote-layout-engine.js";

export {
  computeIntegerDrawRect,
  computeIntegerVideoLayout,
} from "./remote-layout-math.js";

/**
 * Encaixa o vídeo remoto em pixels inteiros. O elemento <video> fica oculto
 * (WebRTC continua decodificando nele) e um <canvas> desenha cada frame com
 * escala uniforme inteira — evita moiré/faixas do object-fit:fill + subpixel.
 *
 * @param {HTMLVideoElement | null} videoEl
 * @param {HTMLElement | null} stageEl
 * @param {{ hostEl?: HTMLElement | null, canvasEl?: HTMLCanvasElement | null }} [options]
 */
export function bindRemoteVideoLayout(videoEl, stageEl, options = {}) {
  if (!videoEl || !stageEl) {
    return () => {};
  }

  const host = options.hostEl || videoEl;
  const canvas = options.canvasEl || null;
  const engine = createRemoteLayoutEngine(videoEl, stageEl, host, canvas);

  const onMeta = () => {
    engine.scheduleLayout();
    engine.startVideoFrameLoop();
  };

  videoEl.addEventListener("loadedmetadata", onMeta);
  videoEl.addEventListener("resize", engine.scheduleLayout);
  videoEl.addEventListener("playing", engine.startVideoFrameLoop);

  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(engine.scheduleLayout)
      : null;
  observer?.observe(stageEl);
  engine.scheduleLayout();

  return () => {
    observer?.disconnect();
    engine.cancelRafs();
    engine.stopVideoFrameLoop();
    videoEl.removeEventListener("loadedmetadata", onMeta);
    videoEl.removeEventListener("resize", engine.scheduleLayout);
    videoEl.removeEventListener("playing", engine.startVideoFrameLoop);
    delete host.dataset.layoutSynced;
  };
}
