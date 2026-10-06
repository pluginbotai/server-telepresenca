/** @param {number} value */
export function clampHeadUnit(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

/**
 * Map pointer Y on the vertical track to normalized pitch (+1 top, -1 bottom).
 * @param {number} clientY
 * @param {{ top: number, height: number }} rect
 */
export function pitchNormFromTrackY(clientY, rect) {
  const h = Math.max(rect.height, 1);
  const t = (clientY - rect.top) / h;
  const clamped = Math.max(0, Math.min(1, t));
  return clampHeadUnit(1 - clamped * 2);
}

/**
 * Map pointer X on the horizontal track to normalized yaw (-1 left, +1 right).
 * @param {number} clientX
 * @param {{ left: number, width: number }} rect
 */
export function yawNormFromTrackX(clientX, rect) {
  const w = Math.max(rect.width, 1);
  const t = (clientX - rect.left) / w;
  const clamped = Math.max(0, Math.min(1, t));
  return clampHeadUnit(clamped * 2 - 1);
}

/** @param {number} norm */
export function pitchVisualPctFromNorm(norm) {
  const n = clampHeadUnit(norm);
  return 100 - ((n * 100 + 100) / 200) * 100;
}

/** @param {number} value */
export function headEdgeValueToPct(value) {
  return ((value + 100) / 200) * 100;
}
