import { addLook, parseLookValue } from "../protocol/look.js";
import { headAxes } from "../protocol/capabilities.js";
import { applyHeadPreview, markHeadLayerUsed } from "./head-preview.js";

const SEND_MS = 80;

/** @param {object} bag */
export function flushHeadLook(bag, force) {
  if (!bag.ctx?.isConnected()) return;
  if (!bag.pending && !force) return;
  bag.pending = false;
  bag.ctx.sendControl("head.look", parseLookValue(bag.pose), { volatile: true });
}

/** @param {object} bag */
export function scheduleHeadSend(bag) {
  bag.pending = true;
  if (bag.sendTimer) return;
  bag.sendTimer = setTimeout(() => {
    bag.sendTimer = null;
    flushHeadLook(bag, false);
  }, SEND_MS);
}

/** @param {object} bag */
export function setHeadPose(bag, next, send, opts = {}) {
  bag.pose = parseLookValue(next);
  if (bag.edgeSliders) bag.edgeSliders.setPose(bag.pose);
  if (!send) return;
  if (opts.immediate) {
    if (bag.sendTimer) {
      clearTimeout(bag.sendTimer);
      bag.sendTimer = null;
    }
    bag.pending = true;
    flushHeadLook(bag, true);
    return;
  }
  scheduleHeadSend(bag);
}

/** @param {object} bag */
export function applyHeadDelta(bag, delta) {
  bag.lastHeadInputAt = Date.now();
  setHeadPose(bag, addLook(bag.pose, delta, headAxes(bag.caps)), true, {
    immediate: bag.held.size > 0,
  });
  markHeadLayerUsed(bag);
}

/** @param {object} bag */
export function resetHeadLook(bag) {
  bag.pose = { yaw: 0, pitch: 0 };
  if (bag.edgeSliders) bag.edgeSliders.setPose(bag.pose);
  bag.pending = false;
  if (bag.sendTimer) {
    clearTimeout(bag.sendTimer);
    bag.sendTimer = null;
  }
  applyHeadPreview(bag, null);
  if (bag.ctx?.isConnected())
    bag.ctx.sendControl("head.reset", undefined, { volatile: false });
}
