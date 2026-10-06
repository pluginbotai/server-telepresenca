import { grabStep } from "./protocol/look.js";

/**
 * @param {object} cfg
 */
export function createHeadLookPointerHandlers(cfg) {
  const { getEnabled, getAxes, rectOf, drag, onDelta, previewFrom, layer } = cfg;

  function onPointerDown(event) {
    if (!getEnabled()) return;
    if (event.target?.closest?.(".head-edge-rail")) return;
    if (event.button != null && event.button !== 0) return;
    if (drag.pointerId != null) return;
    drag.pointerId = event.pointerId;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.originX = event.clientX;
    drag.originY = event.clientY;
    drag.moved = 0;
    layer.classList.add("is-dragging");
    if (layer.setPointerCapture) layer.setPointerCapture(drag.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.moved += Math.hypot(dx, dy);
    const axes = getAxes();
    const step = grabStep(dx, dy, rectOf());
    if (!axes.yaw) step.yaw = 0;
    if (!axes.pitch) step.pitch = 0;
    if (step.yaw !== 0 || step.pitch !== 0) onDelta(step);
    previewFrom(event.clientX - drag.originX, event.clientY - drag.originY);
  }

  return { onPointerDown, onPointerMove };
}
