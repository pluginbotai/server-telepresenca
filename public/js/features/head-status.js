import { headAxes } from "../protocol/capabilities.js";
import { shouldApplyHeadTelemetry } from "../protocol/head-telemetry.js";
import { setHeadPose } from "./head-pose.js";

/** @param {object} bag */
export function operatorControllingHead(bag) {
  if (bag.held.size) return true;
  if (bag.edgeSliders?.isInteracting?.()) return true;
  if (bag.els.headLookLayer?.classList.contains("is-dragging")) return true;
  return false;
}

/** @param {object} bag */
export function applyHeadStatus(bag, head) {
  if (!head || operatorControllingHead(bag)) return;
  if (
    !shouldApplyHeadTelemetry({
      pose: bag.pose,
      head,
      lastInputAt: bag.lastHeadInputAt,
    })
  ) {
    if (bag.edgeSliders && head.atLimit) bag.edgeSliders.setAtLimit(head.atLimit);
    return;
  }
  const on = headAxes(bag.caps);
  const next = { ...bag.pose };
  if (on.yaw && typeof head.yaw === "number") next.yaw = head.yaw;
  if (on.pitch && typeof head.pitch === "number") next.pitch = head.pitch;
  setHeadPose(bag, next, false);
  if (bag.edgeSliders && head.atLimit) bag.edgeSliders.setAtLimit(head.atLimit);
}
