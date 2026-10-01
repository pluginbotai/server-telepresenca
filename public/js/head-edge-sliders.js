/**
 * Edge-mounted head sliders (yaw top, pitch left). Native range for a11y + custom chrome.
 * @param {HTMLElement} layer
 * @param {object} options
 * @param {(axis: "yaw" | "pitch", value: number) => void} options.onAxis
 * @param {(axis: "yaw" | "pitch", norm: number) => string | null} [options.formatAxisValue]
 * @param {(key: string) => string} [options.t]
 */

/**
 * Map pointer Y on the vertical track to normalized pitch (+1 top, -1 bottom).
 * @param {number} clientY
 * @param {{ top: number, height: number }} rect
 */
export function pitchNormFromTrackY(clientY, rect) {
  const h = Math.max(rect.height, 1);
  const t = (clientY - rect.top) / h;
  const clamped = Math.max(0, Math.min(1, t));
  return clampUnit(1 - clamped * 2);
}

/**
 * @param {number} norm
 */
export function pitchVisualPctFromNorm(norm) {
  const n = clampUnit(norm);
  return 100 - ((n * 100 + 100) / 200) * 100;
}

export function createHeadEdgeSliders(layer, options) {
  const onAxis = options.onAxis || (() => {});
  const formatAxisValue = options.formatAxisValue || (() => null);
  const t = options.t || ((key) => key);

  const IDLE_MS = 3200;
  let axes = { yaw: true, pitch: true };
  let enabled = true;
  let idleTimer = null;
  let pointerDragging = false;
  /** @type {Record<string, { rail: HTMLElement, input: HTMLInputElement, visual: HTMLElement }>} */
  const rails = {};
  /** @type {Array<() => void>} */
  const releasePointerDrags = [];

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

  function normFromInput(input) {
    return clampUnit(Number(input.value) / 100);
  }

  function setThumbPct(axis, pct) {
    const pctStr = `${pct}%`;
    rails[axis].rail.style.setProperty("--head-edge-pct", pctStr);
    rails[axis].visual.style.setProperty("--head-edge-pct", pctStr);
  }

  function syncVisual(axis, input) {
    const norm = normFromInput(input);
    const pct =
      axis === "pitch" ? pitchVisualPctFromNorm(norm) : pctFromInput(input);
    setThumbPct(axis, pct);
    input.setAttribute("aria-valuenow", String(Math.round(norm)));
    const hint = formatAxisValue(axis, norm);
    if (hint) input.setAttribute("aria-valuetext", hint);
    else if (input.removeAttribute) input.removeAttribute("aria-valuetext");
  }

  function emitAxis(axis, norm) {
    syncVisual(axis, rails[axis].input);
    onAxis(axis, norm);
    reveal();
  }

  function setPointerDragging(active) {
    pointerDragging = Boolean(active);
    layer.classList.toggle("head-edge--interacting", pointerDragging);
    if (pointerDragging) reveal();
    else scheduleIdle();
  }

  function reveal() {
    layer.classList.add("head-edge--revealed");
    scheduleIdle();
  }

  function scheduleIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (pointerDragging) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (!pointerDragging) layer.classList.remove("head-edge--revealed");
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
      emitAxis("pitch", norm);
    }

    function beginPointerDrag(event) {
      if (!enabled || event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      for (const release of releasePointerDrags) release();
      setPointerDragging(true);
      if (axis === "pitch") {
        applyPitchFromPointer(event.clientY);
        movePointerDrag = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          applyPitchFromPointer(moveEvent.clientY);
        };
        window.addEventListener("pointermove", movePointerDrag, true);
      }
      endPointerDrag = (upEvent) => {
        if (upEvent.pointerId !== event.pointerId) return;
        finishPointerDrag();
      };
      window.addEventListener("pointerup", endPointerDrag, true);
      window.addEventListener("pointercancel", endPointerDrag, true);
    }

    releasePointerDrags.push(clearPointerDragListeners);

    if (axis === "pitch") {
      rail.addEventListener("pointerdown", beginPointerDrag);
    } else {
      input.addEventListener("pointerdown", beginPointerDrag);
    }
    input.addEventListener("focus", () => reveal());
    input.addEventListener("input", () => {
      emitAxis(axis, normFromInput(input));
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
        pointerDragging = false;
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
      return pointerDragging;
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
      for (const release of releasePointerDrags) release();
      releasePointerDrags.length = 0;
      pointerDragging = false;
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
