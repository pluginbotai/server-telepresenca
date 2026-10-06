import { blocksGameKeyboardShortcuts } from "../ui/game-keyboard.js";

const KEY_TO_ACTION = {
  w: "forward",
  arrowup: "forward",
  s: "backward",
  arrowdown: "backward",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
};

const KEY_FEEDBACK = {
  w: "w",
  arrowup: "w",
  a: "a",
  arrowleft: "a",
  s: "s",
  arrowdown: "s",
  d: "d",
  arrowright: "d",
};

/**
 * @param {object} deps
 * @param {object} deps.els
 * @param {() => import("./registry.js").FeatureContext | null} deps.getCtx
 * @param {(action: string) => void} deps.startMovement
 * @param {(sendStop?: boolean) => void} deps.stopMovement
 */
export function createLocomotionKeyboard(deps) {
  const { els, getCtx, startMovement, stopMovement } = deps;
  const activeKeys = new Set();
  let activeKey = null;

  function setKeyFeedback(key, on) {
    const mapped = KEY_FEEDBACK[key];
    if (!mapped || !els.kbdHint) return;
    const cap = els.kbdHint.querySelector(`[data-key="${mapped}"]`);
    if (cap) cap.classList.toggle("is-active", on);
  }

  function onKeyDown(event) {
    if (!getCtx()?.isConnected()) return;
    if (
      typeof document !== "undefined" &&
      blocksGameKeyboardShortcuts(document.activeElement)
    ) {
      return;
    }
    if (event.repeat) return;

    const key = event.key?.toLowerCase();
    if (key === " " || key === "escape") {
      event.preventDefault();
      activeKeys.clear();
      activeKey = null;
      stopMovement(true);
      return;
    }

    const action = KEY_TO_ACTION[key];
    if (action) {
      event.preventDefault();
      activeKeys.add(key);
      activeKey = key;
      setKeyFeedback(key, true);
      startMovement(action);
    }
  }

  function onKeyUp(event) {
    if (!getCtx()?.isConnected()) return;
    const key = event.key?.toLowerCase();
    if (!KEY_TO_ACTION[key]) return;

    event.preventDefault();
    activeKeys.delete(key);
    setKeyFeedback(key, false);

    if (key !== activeKey) return;
    if (activeKeys.size > 0) {
      const nextKey = Array.from(activeKeys).pop();
      activeKey = nextKey;
      const nextAction = KEY_TO_ACTION[nextKey];
      if (nextAction) {
        startMovement(nextAction);
        return;
      }
    }
    activeKey = null;
    stopMovement(true);
  }

  return {
    onKeyDown,
    onKeyUp,
    clearKeys() {
      activeKeys.clear();
      activeKey = null;
    },
  };
}
