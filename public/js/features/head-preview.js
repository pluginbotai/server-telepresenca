import { headAxisLimit, headMapping, headNormToDeg } from "../protocol/capabilities.js";

/** @param {object} bag */
export function setHeadHostHidden(bag, hidden) {
  if (bag.els.headLookLayer) bag.els.headLookLayer.hidden = hidden;
}

/** @param {object} bag */
export function applyHeadPreview(bag, preview) {
  const host = bag.els.remoteVideoHost || bag.els.remoteVideo;
  if (!host) return;
  if (!preview || bag.reducedMotion) {
    host.classList.remove("is-look-preview");
    host.style.transform = "";
    return;
  }
  host.classList.add("is-look-preview");
  host.style.transform = `translate(${preview.x}px, ${preview.y}px)`;
}

/** @param {object} bag */
export function markHeadLayerUsed(bag) {
  if (bag.els.headLookLayer) bag.els.headLookLayer.classList.add("has-looked");
}

/** @param {object} bag @param {"yaw"|"pitch"} axis @param {number} norm */
export function formatHeadAxisValue(bag, axis, norm) {
  const limit = headAxisLimit(bag.caps, axis);
  if (!limit) return null;
  const map = headMapping(bag.caps);
  const inverted = axis === "yaw" ? map.yawInverted : map.pitchInverted;
  const deg = headNormToDeg(norm, limit, inverted);
  if (deg == null || !Number.isFinite(deg)) return null;
  return `${Math.round(deg)}°`;
}
