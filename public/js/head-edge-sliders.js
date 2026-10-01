/**
 * Edge-mounted head sliders (yaw top, pitch left). Native range for a11y + custom chrome.
 * @param {HTMLElement} layer
 * @param {object} options
 * @param {(axis: "yaw" | "pitch", value: number) => void} options.onAxis
 * @param {(axis: "yaw" | "pitch", norm: number) => string | null} [options.formatAxisValue]
 * @param {(key: string) => string} [options.t]
 */
export function createHeadEdgeSliders(layer, options) {
  const onAxis = options.onAxis || (() => {});
  const formatAxisValue = options.formatAxisValue || (() => null);
  const t = options.t || ((key) => key);

  const IDLE_MS = 3200;
  let axes = { yaw: true, pitch: true };
  let enabled = true;
  let idleTimer = null;
  let interacting = 0;
  /** @type {Record<string, { rail: HTMLElement, input: HTMLInputElement, visual: HTMLElement }>} */
  const rails = {};

  function axisLabel(axis) {
    return axis === "yaw" ? t("head.yawAria") : t("head.pitchAria");
  }

  function valueToPct(value) {
    return ((value + 100) / 200) * 100;
  }

  function pctFromInput(input) {
    const n = Number(input.value);
    if (Number.isNaN(n)) return 50;
    return valueToPct(n);
  }

  function syncVisual(axis, input) {
    let pct = pctFromInput(input);
    if (axis === "pitch") pct = 100 - pct;
    rails[axis].visual.style.setProperty("--head-edge-pct", `${pct}%`);
    const norm = Number(input.value) / 100;
    input.setAttribute("aria-valuenow", String(Math.round(norm)));
    const hint = formatAxisValue(axis, norm);
    if (hint) input.setAttribute("aria-valuetext", hint);
    else if (input.removeAttribute) input.removeAttribute("aria-valuetext");
  }

  function setInteracting(delta) {
    interacting = Math.max(0, interacting + delta);
    layer.classList.toggle("head-edge--interacting", interacting > 0);
    if (delta > 0) reveal();
    else scheduleIdle();
  }

  function reveal() {
    layer.classList.add("head-edge--revealed");
    scheduleIdle();
  }

  function scheduleIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (interacting > 0) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (interacting === 0) layer.classList.remove("head-edge--revealed");
    }, IDLE_MS);
  }

  function onPointerNearEdge(event) {
    if (!enabled || layer.hidden) return;
    const box = layer.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const edge = 56;
    const nearTop = axes.yaw && y <= edge;
    const nearLeft = axes.pitch && x <= edge;
    if (nearTop || nearLeft) reveal();
  }

  function buildRail(axis, orient) {
    const rail = document.createElement("div");
    rail.className = `head-edge-rail head-edge-rail--${axis} head-edge-rail--${orient}`;
    rail.dataset.axis = axis;

    const visual = document.createElement("div");
    visual.className = "head-edge-slider-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.innerHTML =
      '<div class="head-edge-track"></div><div class="head-edge-center"></div><div class="head-edge-fill"></div><div class="head-edge-thumb"></div>';

    const input = document.createElement("input");
    input.type = "range";
    input.className = "head-edge-input";
    input.min = "-100";
    input.max = "100";
    input.step = "1";
    input.value = "0";
    input.setAttribute("aria-valuemin", "-1");
    input.setAttribute("aria-valuemax", "1");
    input.setAttribute("aria-valuenow", "0");

    input.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      setInteracting(1);
    });
    input.addEventListener("pointerup", () => setInteracting(-1));
    input.addEventListener("pointercancel", () => setInteracting(-1));
    input.addEventListener("focus", () => {
      setInteracting(1);
      reveal();
    });
    input.addEventListener("blur", () => setInteracting(-1));
    input.addEventListener("input", () => {
      syncVisual(axis, input);
      onAxis(axis, Number(input.value) / 100);
      reveal();
    });

    rail.append(visual, input);
    rails[axis] = { rail, input, visual };
    return rail;
  }

  const yawRail = buildRail("yaw", "horizontal");
  const pitchRail = buildRail("pitch", "vertical");
  layer.prepend(yawRail, pitchRail);

  function applyAxisVisibility() {
    yawRail.hidden = !axes.yaw;
    pitchRail.hidden = !axes.pitch;
    layer.classList.toggle("head-edge--yaw-only", axes.yaw && !axes.pitch);
    layer.classList.toggle("head-edge--pitch-only", axes.pitch && !axes.yaw);
    layer.classList.toggle("head-edge--dual", axes.yaw && axes.pitch);
  }

  applyAxisVisibility();
  syncVisual("yaw", rails.yaw.input);
  syncVisual("pitch", rails.pitch.input);

  const onLayerMove = (event) => onPointerNearEdge(event);
  layer.addEventListener("pointermove", onLayerMove);

  return {
    setAxes(next) {
      axes = {
        yaw: next?.yaw !== false,
        pitch: next?.pitch !== false,
      };
      applyAxisVisibility();
    },
    setPose(pose) {
      if (axes.yaw) {
        rails.yaw.input.value = String(Math.round(clampUnit(pose?.yaw) * 100));
        syncVisual("yaw", rails.yaw.input);
      }
      if (axes.pitch) {
        rails.pitch.input.value = String(Math.round(clampUnit(pose?.pitch) * 100));
        syncVisual("pitch", rails.pitch.input);
      }
    },
    setEnabled(value) {
      enabled = Boolean(value);
      for (const axis of Object.keys(rails)) {
        rails[axis].input.disabled = !enabled;
      }
      layer.classList.toggle("head-edge--disabled", !enabled);
      if (!enabled) {
        interacting = 0;
        layer.classList.remove("head-edge--interacting", "head-edge--revealed");
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = null;
      }
    },
    refreshLabels() {
      rails.yaw.input.setAttribute("aria-label", axisLabel("yaw"));
      rails.pitch.input.setAttribute("aria-label", axisLabel("pitch"));
    },
    isInteracting() {
      return interacting > 0;
    },
    setAtLimit(atLimit) {
      if (!atLimit) return;
      if (axes.yaw) {
        rails.yaw.rail.classList.toggle("head-edge--at-min", Boolean(atLimit.yawMin));
        rails.yaw.rail.classList.toggle("head-edge--at-max", Boolean(atLimit.yawMax));
      }
      if (axes.pitch) {
        rails.pitch.rail.classList.toggle("head-edge--at-min", Boolean(atLimit.pitchMin));
        rails.pitch.rail.classList.toggle("head-edge--at-max", Boolean(atLimit.pitchMax));
      }
    },
    reveal,
    destroy() {
      layer.removeEventListener("pointermove", onLayerMove);
      if (idleTimer) clearTimeout(idleTimer);
      yawRail.remove();
      pitchRail.remove();
      layer.classList.remove(
        "head-edge--revealed",
        "head-edge--interacting",
        "head-edge--disabled",
        "head-edge--yaw-only",
        "head-edge--pitch-only",
        "head-edge--dual",
      );
    },
  };
}

function clampUnit(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}
