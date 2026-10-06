import { pitchNormFromTrackY } from "./head-edge-math.js";

/**
 * @param {object} opts
 * @param {() => boolean} opts.enabledRef
 * @param {(active: boolean) => void} opts.setPointerDragging
 * @param {Array<() => void>} opts.releasePointerDrags
 * @param {HTMLInputElement} opts.input
 * @param {HTMLElement} opts.visual
 * @param {(axis: "pitch", norm: number) => void} [opts.onPitchNorm]
 */
export function bindHeadEdgePitchPointer(opts) {
  const {
    enabledRef,
    setPointerDragging,
    releasePointerDrags,
    input,
    visual,
    onPitchNorm,
  } = opts;

  /** @type {((event: PointerEvent) => void) | null} */
  let endPointerDrag = null;
  /** @type {((event: PointerEvent) => void) | null} */
  let movePointerDrag = null;

  function clearPointerDragListeners() {
    if (endPointerDrag) {
      window.removeEventListener("pointerup", endPointerDrag, true);
      window.removeEventListener("pointercancel", endPointerDrag, true);
      endPointerDrag = null;
    }
    if (movePointerDrag) {
      window.removeEventListener("pointermove", movePointerDrag, true);
      movePointerDrag = null;
    }
  }

  function finishPointerDrag() {
    clearPointerDragListeners();
    setPointerDragging(false);
    queueMicrotask(() => {
      if (typeof input.blur === "function") input.blur();
    });
  }

  function applyPitchFromPointer(clientY) {
    const rect = visual.getBoundingClientRect();
    const norm = pitchNormFromTrackY(clientY, rect);
    input.value = String(Math.round(norm * 100));
    if (onPitchNorm) onPitchNorm(norm);
  }

  function beginPointerDrag(event) {
    if (!enabledRef() || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    for (const release of releasePointerDrags) release();
    setPointerDragging(true);
    applyPitchFromPointer(event.clientY);
    movePointerDrag = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      applyPitchFromPointer(moveEvent.clientY);
    };
    window.addEventListener("pointermove", movePointerDrag, true);
    endPointerDrag = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      finishPointerDrag();
    };
    window.addEventListener("pointerup", endPointerDrag, true);
    window.addEventListener("pointercancel", endPointerDrag, true);
  }

  releasePointerDrags.push(clearPointerDragListeners);
  return beginPointerDrag;
}

/** @param {object} opts */
export function bindHeadEdgeYawPointer(opts) {
  const { enabledRef, setPointerDragging, releasePointerDrags, input } = opts;

  /** @type {((event: PointerEvent) => void) | null} */
  let endPointerDrag = null;

  function clearPointerDragListeners() {
    if (endPointerDrag) {
      window.removeEventListener("pointerup", endPointerDrag, true);
      window.removeEventListener("pointercancel", endPointerDrag, true);
      endPointerDrag = null;
    }
  }

  function finishPointerDrag() {
    clearPointerDragListeners();
    setPointerDragging(false);
    queueMicrotask(() => {
      if (typeof input.blur === "function") input.blur();
    });
  }

  function beginPointerDrag(event) {
    if (!enabledRef() || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    for (const release of releasePointerDrags) release();
    setPointerDragging(true);
    endPointerDrag = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      finishPointerDrag();
    };
    window.addEventListener("pointerup", endPointerDrag, true);
    window.addEventListener("pointercancel", endPointerDrag, true);
  }

  releasePointerDrags.push(clearPointerDragListeners);
  return beginPointerDrag;
}
