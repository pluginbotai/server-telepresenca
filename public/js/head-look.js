import { LOOK_CLICK_PX } from "./protocol/look.js";
import { bindHeadLookPointerEvents } from "./head-look-bind.js";
import { createHeadLookPointerHandlers } from "./head-look-pointer.js";

const PREVIEW_GAIN = 0.18;
const PREVIEW_MAX_PX = 36;
const DOUBLE_MS = 340;

/**
 * @param {object} drag
 * @param {boolean} countTap
 */
function finishHeadLookDrag(drag, countTap) {
  if (drag.pointerId == null) return;
  const wasClick = drag.moved < LOOK_CLICK_PX;
  drag.pointerId = null;
  drag.moved = 0;
  drag.layer.classList.remove("is-dragging");
  drag.onPreview(null);
  if (!countTap || !wasClick) return;
  const now = Date.now();
  if (now - drag.lastTapAt <= DOUBLE_MS) {
    drag.lastTapAt = 0;
    drag.onReset();
    return;
  }
  drag.lastTapAt = now;
}

/**
 * Street View-style grab on the live video. Reports incremental look deltas.
 * @param {HTMLElement} layer
 * @param {object} options
 */
export function createHeadLookSurface(layer, options) {
  const onDelta = options.onDelta || (() => {});
  const onReset = options.onReset || (() => {});
  const onPreview = options.onPreview || (() => {});
  const rectOf = options.rect || (() => layer.getBoundingClientRect());

  let enabled = true;
  let axes = { yaw: true, pitch: true };
  const drag = {
    layer,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    originX: 0,
    originY: 0,
    moved: 0,
    lastTapAt: 0,
    onPreview,
    onReset,
  };

  function previewFrom(dx, dy) {
    const x = Math.max(-PREVIEW_MAX_PX, Math.min(PREVIEW_MAX_PX, dx * PREVIEW_GAIN));
    const y = Math.max(-PREVIEW_MAX_PX, Math.min(PREVIEW_MAX_PX, dy * PREVIEW_GAIN));
    onPreview({ x, y });
  }

  const pointer = createHeadLookPointerHandlers({
    layer,
    drag,
    rectOf,
    onDelta,
    previewFrom,
    getEnabled: () => enabled,
    getAxes: () => axes,
  });

  const unbind = bindHeadLookPointerEvents(layer, {
    ...pointer,
    onPointerUp: (event) => {
      if (event.pointerId !== drag.pointerId) return;
      finishHeadLookDrag(drag, true);
    },
    onContextMenu: (event) => event.preventDefault(),
  });

  return {
    setEnabled(value) {
      enabled = Boolean(value);
      layer.classList.toggle("is-disabled", !enabled);
      layer.setAttribute("aria-disabled", enabled ? "false" : "true");
      if (!enabled) finishHeadLookDrag(drag, false);
    },
    setAxes(next) {
      axes = { yaw: next?.yaw !== false, pitch: next?.pitch !== false };
    },
    destroy() {
      finishHeadLookDrag(drag, false);
      unbind();
    },
  };
}
