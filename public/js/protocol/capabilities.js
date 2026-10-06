/**
 * Robot capability helpers. Operator UI branches on these, never on robotModel.
 */

/**
 * @param {object | null | undefined} caps
 */
export function isLocomotionAvailable(caps) {
  if (caps == null) return true;
  if (caps.locomotion === false) return false;
  if (caps.locomotion && caps.locomotion.available === false) return false;
  return true;
}

/**
 * @param {object | null | undefined} caps
 */
export function isBeepAvailable(caps) {
  if (caps == null) return true;
  if (caps.audio && caps.audio.beep === false) return false;
  return true;
}

/**
 * @param {object | null | undefined} caps
 */
export function isFlashlightAvailable(caps) {
  return caps?.flashlight?.available === true;
}

/**
 * Robot emotions/face display is opt-in.
 * @param {object | null | undefined} caps
 */
export function isEmotionsAvailable(caps) {
  return caps?.emotions?.available === true;
}

/**
 * List of allowed faces supported by the robot.
 * @param {object | null | undefined} caps
 * @returns {string[]}
 */
export function emotionsFaces(caps) {
  if (!Array.isArray(caps?.emotions?.faces)) return [];
  return caps.emotions.faces;
}

/**
 * Head look is opt-in. Robots without a neck/head omit this.
 * @param {object | null | undefined} caps
 */
export function isHeadAvailable(caps) {
  return caps?.head?.available === true;
}

/**
 * Battery HUD is opt-in.
 * @param {object | null | undefined} caps
 */
export function isPowerAvailable(caps) {
  return caps?.power?.available === true;
}

/**
 * Robot speaker volume control is opt-in.
 * @param {object | null | undefined} caps
 */
export function isVolumeAvailable(caps) {
  return caps?.audio?.volume === true;
}

/**
 * @param {object | null | undefined} caps
 */
export function volumeRange(caps) {
  const min = Number.isFinite(Number(caps?.audio?.volumeMin))
    ? Math.round(Number(caps.audio.volumeMin))
    : 0;
  let max = Number.isFinite(Number(caps?.audio?.volumeMax))
    ? Math.round(Number(caps.audio.volumeMax))
    : 10;
  if (max <= min) max = min + 1;
  return { min, max };
}

/**
 * @param {object | null | undefined} caps
 */
export function headAxes(caps) {
  const available = isHeadAvailable(caps);
  return {
    yaw: available && caps?.head?.yaw !== false,
    pitch: available && caps?.head?.pitch !== false,
  };
}

/**
 * @param {object | null | undefined} caps
 * @returns {"full" | "window"}
 */
export function headRangeMode(caps) {
  return caps?.head?.rangeMode === "window" ? "window" : "full";
}

/**
 * @param {object | null | undefined} caps
 * @param {"yaw" | "pitch"} axis
 */
export function headAxisLimit(caps, axis) {
  const block = caps?.head?.limits?.[axis];
  if (!block || typeof block !== "object") return null;
  const minDeg = Number(block.minDeg);
  const maxDeg = Number(block.maxDeg);
  if (!Number.isFinite(minDeg) || !Number.isFinite(maxDeg) || maxDeg <= minDeg) {
    return null;
  }
  const windowDeg = Number(block.windowDeg);
  return {
    minDeg,
    maxDeg,
    windowDeg: Number.isFinite(windowDeg) && windowDeg > 0 ? windowDeg : null,
  };
}

/**
 * @param {object | null | undefined} caps
 */
export function headMapping(caps) {
  const map = caps?.head?.mapping;
  return {
    yawInverted: map?.yawInverted === true,
    pitchInverted: map?.pitchInverted === true,
  };
}

/**
 * Map normalized [-1, 1] to degrees using advertised mechanical limits.
 * @param {number} norm
 * @param {{ minDeg: number, maxDeg: number } | null} limit
 * @param {boolean} inverted
 */
export function headNormToDeg(norm, limit, inverted = false) {
  if (!limit) return null;
  let n = norm;
  if (typeof n !== "number" || Number.isNaN(n)) n = 0;
  if (n > 1) n = 1;
  if (n < -1) n = -1;
  if (inverted) n = -n;
  return limit.minDeg + ((n + 1) / 2) * (limit.maxDeg - limit.minDeg);
}

/**
 * @param {object | null | undefined} caps
 */
export function isContinuousBackward(caps) {
  return caps?.locomotion?.backwardMode === "continuous";
}

/**
 * @param {object | null | undefined} caps
 */
export function backwardPulseDistanceM(caps) {
  const value = caps?.locomotion?.backwardPulseDistanceM;
  return typeof value === "number" && value > 0 ? value : 0.2;
}

/** Discrete speed steps (factor of robot base speeds). */
/** UI presets: slow / normal / fast (factor of robot base speeds). */
export const LOCOMOTION_SPEED_STEPS = [0.35, 0.75, 1.0];

const SPEED_STEP_LABEL_KEY = new Map([
  [0.35, "movement.speedSlow"],
  [0.75, "movement.speedNormal"],
  [1, "movement.speedFast"],
]);

/**
 * @param {number} step
 * @returns {string | null}
 */
export function locomotionSpeedStepLabelKey(step) {
  for (const [value, key] of SPEED_STEP_LABEL_KEY) {
    if (Math.abs(value - step) < 0.001) return key;
  }
  return null;
}

/**
 * @param {object | null | undefined} caps
 */
export function isLocomotionSpeedAvailable(caps) {
  return caps?.locomotion?.speed === true;
}

/**
 * @param {object | null | undefined} caps
 */
export function locomotionSpeedRange(caps) {
  const loc = caps?.locomotion;
  const min = Number.isFinite(Number(loc?.speedMin)) ? Number(loc.speedMin) : 0.35;
  const max = Number.isFinite(Number(loc?.speedMax)) ? Number(loc.speedMax) : 1;
  let defaultFactor = Number.isFinite(Number(loc?.speedDefault))
    ? Number(loc.speedDefault)
    : 1;
  defaultFactor = clampLocomotionSpeedFactor(defaultFactor, min, max);
  return { min, max, default: defaultFactor };
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clampLocomotionSpeedFactor(value, min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!Number.isFinite(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Snap to the nearest advertised step within range.
 * @param {number} value
 * @param {{ min: number, max: number }} range
 */
export function snapLocomotionSpeedFactor(value, range) {
  const clamped = clampLocomotionSpeedFactor(value, range.min, range.max);
  let best = LOCOMOTION_SPEED_STEPS[0];
  let bestDist = Infinity;
  for (const step of LOCOMOTION_SPEED_STEPS) {
    if (step < range.min - 0.001 || step > range.max + 0.001) continue;
    const dist = Math.abs(step - clamped);
    if (dist < bestDist || (dist === bestDist && step > best)) {
      bestDist = dist;
      best = step;
    }
  }
  return best;
}

/**
 * @param {unknown} caps
 * @returns {object | null}
 */
export function normalizeCapabilities(caps) {
  if (!caps || typeof caps !== "object") return null;
  return caps;
}
