/**
 * Sanitize operator control payloads before forwarding to the robot.
 * Continuous actions use latest-wins semantics on the robot; here we clamp
 * and drop malformed frames (LiveKit teleop pattern).
 */

/**
 * @param {number} value
 */
function clampUnit(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

/**
 * @param {unknown} value
 */
function sanitizeHeadLookValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { yaw: 0, pitch: 0 };
  }
  const val = /** @type {Record<string, unknown>} */ (value);
  return {
    yaw: clampUnit(Number(val.yaw)),
    pitch: clampUnit(Number(val.pitch)),
  };
}

/**
 * @param {unknown} payload
 * @returns {{ action: string, value?: unknown, from: string } | null}
 */
export function sanitizeControlPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const p = /** @type {Record<string, unknown>} */ (payload);
  const rawAction = p.action;
  if (typeof rawAction !== "string" || !rawAction.trim()) return null;
  const action = rawAction.toLowerCase().trim();
  const from = typeof p.from === "string" && p.from.trim() ? p.from.trim() : "operator";

  if (action === "head.look") {
    return { action, value: sanitizeHeadLookValue(p.value), from };
  }

  if (p.value === undefined) {
    return { action, from };
  }
  return { action, value: p.value, from };
}
