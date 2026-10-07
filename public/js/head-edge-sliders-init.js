import { clampHeadUnit } from "./head-edge-math.js";
import { buildHeadEdgeRail, headEdgeVisualPct } from "./head-edge-rail.js";

/** @param {object} s @param {object} options */
export function initHeadEdgeSliderDom(s, options) {
  const onAxis = options.onAxis || (() => {});
  const formatAxisValue = options.formatAxisValue || (() => null);
  const t = options.t || ((key) => key);
  const IDLE_MS = 3200;
  const { layer } = s;

  s.axisLabel = (axis) => (axis === "yaw" ? t("head.yawAria") : t("head.pitchAria"));
  s.clampUnit = clampHeadUnit;

  function setThumbPct(axis, pct) {
    const { rail, visual } = s.rails[axis];
    const pctStr = `${pct}%`;
    rail.style.setProperty("--head-edge-pct", pctStr);
    visual.style.setProperty("--head-edge-pct", pctStr);
  }

  s.syncVisual = (axis) => {
    const { input } = s.rails[axis];
    const norm = clampHeadUnit(Number(input.value) / 100);
    setThumbPct(axis, headEdgeVisualPct(axis, input));
    input.setAttribute("aria-valuenow", String(Math.round(norm)));
    const hint = formatAxisValue(axis, norm);
    if (hint) input.setAttribute("aria-valuetext", hint);
    else if (input.removeAttribute) input.removeAttribute("aria-valuetext");
  };

  function emitAxis(axis, norm) {
    s.syncVisual(axis);
    onAxis(axis, norm);
    s.reveal();
  }

  function setPointerDragging(active) {
    s.pointerDragging = Boolean(active);
    layer.classList.toggle("head-edge--interacting", s.pointerDragging);
    if (s.pointerDragging) s.reveal();
    else scheduleIdle();
  }

  s.reveal = () => {
    layer.classList.add("head-edge--revealed");
    scheduleIdle();
  };

  function scheduleIdle() {
    if (s.idleTimer) clearTimeout(s.idleTimer);
    if (s.pointerDragging) return;
    s.idleTimer = setTimeout(() => {
      s.idleTimer = null;
      if (!s.pointerDragging) layer.classList.remove("head-edge--revealed");
    }, IDLE_MS);
  }

  s.onLayerMove = (event) => {
    if (!s.enabled || layer.hidden) return;
    const box = layer.getBoundingClientRect();
    const nearTop = s.axes.yaw && event.clientY - box.top <= 56;
    const nearLeft = s.axes.pitch && event.clientX - box.left <= 56;
    if (nearTop || nearLeft) s.reveal();
  };

  const railCtx = {
    enabledRef: () => s.enabled,
    setPointerDragging,
    reveal: s.reveal,
    emitAxis,
    releasePointerDrags: s.releasePointerDrags,
  };

  s.rails.yaw = buildHeadEdgeRail("yaw", "horizontal", railCtx);
  s.rails.pitch = buildHeadEdgeRail("pitch", "vertical", railCtx);
  layer.prepend(s.rails.yaw.rail, s.rails.pitch.rail);

  s.applyAxisVisibility = () => {
    const { yaw, pitch } = s.rails;
    yaw.rail.hidden = !s.axes.yaw;
    pitch.rail.hidden = !s.axes.pitch;
    layer.classList.toggle("head-edge--yaw-only", s.axes.yaw && !s.axes.pitch);
    layer.classList.toggle("head-edge--pitch-only", s.axes.pitch && !s.axes.yaw);
    layer.classList.toggle("head-edge--dual", s.axes.yaw && s.axes.pitch);
  };

  s.applyAxisVisibility();
  s.syncVisual("yaw");
  s.syncVisual("pitch");
  layer.addEventListener("pointermove", s.onLayerMove);
}
