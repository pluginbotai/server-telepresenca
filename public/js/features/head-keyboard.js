import { LOOK_KEY_RATE, lookKeyDelta } from "../protocol/look.js";
import { headAxes } from "../protocol/capabilities.js";
import { blocksGameKeyboardShortcuts } from "../ui/game-keyboard.js";
import { applyHeadDelta, flushHeadLook, resetHeadLook } from "./head-pose.js";
import { applyHeadPreview } from "./head-preview.js";

const KEY_TICK_MS = 50;

/** @param {object} bag */
export function stopHeadKeys(bag) {
  if (bag.keyTimer) {
    clearInterval(bag.keyTimer);
    bag.keyTimer = null;
  }
  bag.held.clear();
}

/** @param {object} bag */
function tickHeadKeys(bag) {
  if (!bag.held.size || !bag.ctx?.isConnected()) return;
  const step = (LOOK_KEY_RATE * KEY_TICK_MS) / 1000;
  let yaw = 0;
  let pitch = 0;
  const on = headAxes(bag.caps);
  for (const key of bag.held) {
    const dir = lookKeyDelta(key);
    if (!dir) continue;
    if (on.yaw) yaw += dir.yaw;
    if (on.pitch) pitch += dir.pitch;
  }
  if (yaw === 0 && pitch === 0) return;
  applyHeadDelta(bag, { yaw: yaw * step, pitch: pitch * step });
}

/** @param {object} bag */
export function bindHeadKeyboard(bag) {
  function typingTarget() {
    return blocksGameKeyboardShortcuts(document.activeElement);
  }

  function onKeyDown(event) {
    if (!bag.ctx?.isConnected() || typingTarget()) return;
    const key = event.key.toLowerCase();
    if (key === "home") {
      event.preventDefault();
      resetHeadLook(bag);
      return;
    }
    if (!lookKeyDelta(key) || event.repeat) return;
    const on = headAxes(bag.caps);
    if ((key === "j" || key === "l") && !on.yaw) return;
    if ((key === "i" || key === "k") && !on.pitch) return;
    event.preventDefault();
    bag.held.add(key);
    if (!bag.keyTimer) bag.keyTimer = setInterval(() => tickHeadKeys(bag), KEY_TICK_MS);
    tickHeadKeys(bag);
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (!bag.held.has(key)) return;
    event.preventDefault();
    bag.held.delete(key);
    if (!bag.held.size) stopHeadKeys(bag);
    flushHeadLook(bag, true);
  }

  function onBlur() {
    stopHeadKeys(bag);
    flushHeadLook(bag, true);
    applyHeadPreview(bag, null);
  }

  return { onKeyDown, onKeyUp, onBlur };
}
