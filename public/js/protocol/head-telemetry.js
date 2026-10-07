export const HEAD_INPUT_GRACE_MS = 1200;
export const HEAD_FEEDBACK_EPS = 0.02;
/** Ignore measured Temi/SDK pitch when it disagrees with the operator pose (stale tilt). */
export const HEAD_MEASURED_TRUST_EPS = 0.18;

/**
 * Whether robot head status should update the operator pose (avoid stale commanded echo).
 * @param {object} options
 * @param {{ yaw: number, pitch: number }} options.pose
 * @param {{ yaw?: number | null, pitch?: number | null, source?: string | null }} options.head
 * @param {number} options.lastInputAt
 * @param {number} [options.now]
 */
export function shouldApplyHeadTelemetry({
  pose,
  head,
  lastInputAt,
  now = Date.now(),
}) {
  if (!head) return false;
  if (now - lastInputAt < HEAD_INPUT_GRACE_MS) return false;
  const pitchDiff =
    typeof head.pitch === "number" ? Math.abs(head.pitch - pose.pitch) : 0;
  const yawDiff = typeof head.yaw === "number" ? Math.abs(head.yaw - pose.yaw) : 0;
  if (
    head.source === "measured" &&
    (pitchDiff > HEAD_MEASURED_TRUST_EPS || yawDiff > HEAD_MEASURED_TRUST_EPS)
  ) {
    return false;
  }
  if (head.source !== "commanded") return true;
  return pitchDiff <= HEAD_FEEDBACK_EPS && yawDiff <= HEAD_FEEDBACK_EPS;
}
