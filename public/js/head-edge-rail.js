import {
  clampHeadUnit,
  headEdgeValueToPct,
  pitchVisualPctFromNorm,
} from "./head-edge-math.js";
import {
  bindHeadEdgePitchPointer,
  bindHeadEdgeYawPointer,
} from "./head-edge-pointer.js";

/**
 * @param {"yaw"|"pitch"} axis
 * @param {"horizontal"|"vertical"} orient
 * @param {object} ctx
 */
export function buildHeadEdgeRail(axis, orient, ctx) {
  const { enabledRef, setPointerDragging, reveal, emitAxis, releasePointerDrags } = ctx;

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

  const pointerOpts = {
    enabledRef,
    setPointerDragging,
    releasePointerDrags,
    input,
    visual,
  };

  const beginPointerDrag =
    axis === "pitch"
      ? bindHeadEdgePitchPointer({
          ...pointerOpts,
          onPitchNorm: (norm) => emitAxis("pitch", norm),
        })
      : bindHeadEdgeYawPointer(pointerOpts);

  if (axis === "pitch") {
    rail.addEventListener("pointerdown", beginPointerDrag);
  } else {
    input.addEventListener("pointerdown", beginPointerDrag);
  }
  input.addEventListener("focus", () => reveal());
  input.addEventListener("input", () => {
    emitAxis(axis, clampHeadUnit(Number(input.value) / 100));
  });

  rail.append(visual, input);
  return { rail, input, visual };
}

/** @param {HTMLInputElement} input */
export function pctFromHeadEdgeInput(input) {
  const n = Number(input.value);
  if (Number.isNaN(n)) return 50;
  return headEdgeValueToPct(n);
}

/** @param {"yaw"|"pitch"} axis @param {HTMLInputElement} input */
export function headEdgeVisualPct(axis, input) {
  const norm = clampHeadUnit(Number(input.value) / 100);
  return axis === "pitch" ? pitchVisualPctFromNorm(norm) : pctFromHeadEdgeInput(input);
}
