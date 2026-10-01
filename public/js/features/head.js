import { createHeadEdgeSliders } from "../head-edge-sliders.js";
import { createHeadLookSurface } from "../head-look.js";
import {
  addLook,
  LOOK_KEY_RATE,
  lookKeyDelta,
  parseLookValue,
} from "../protocol/look.js";
import {
  headAxisLimit,
  headAxes,
  headMapping,
  headNormToDeg,
  isHeadAvailable,
} from "../protocol/capabilities.js";
import { shouldApplyHeadTelemetry } from "../protocol/head-telemetry.js";
import { parseRobotStatus } from "../protocol/status.js";
import { blocksGameKeyboardShortcuts } from "../ui/game-keyboard.js";

const SEND_MS = 80;
const KEY_TICK_MS = 50;

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createHeadFeature(els, t) {
  let caps = null;
  let pose = { yaw: 0, pitch: 0 };
  let surface = null;
  let edgeSliders = null;
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;
  /** @type {Set<string>} */
  const held = new Set();
  let keyTimer = null;
  let sendTimer = null;
  let pending = false;
  let reducedMotion = false;
  let lastHeadInputAt = 0;

  function markHeadInput() {
    lastHeadInputAt = Date.now();
  }

  function axes() {
    return headAxes(caps);
  }

  function formatAxisValue(axis, norm) {
    const limit = headAxisLimit(caps, axis);
    if (!limit) return null;
    const map = headMapping(caps);
    const inverted = axis === "yaw" ? map.yawInverted : map.pitchInverted;
    const deg = headNormToDeg(norm, limit, inverted);
    if (deg == null || !Number.isFinite(deg)) return null;
    return `${Math.round(deg)}°`;
  }

  function setHostHidden(hidden) {
    if (els.headLookLayer) els.headLookLayer.hidden = hidden;
  }

  function applyPreview(preview) {
    const host = els.remoteVideoHost || els.remoteVideo;
    if (!host) return;
    if (!preview || reducedMotion) {
      host.classList.remove("is-look-preview");
      host.style.transform = "";
      return;
    }
    host.classList.add("is-look-preview");
    host.style.transform = `translate(${preview.x}px, ${preview.y}px)`;
  }

  function markUsed() {
    if (els.headLookLayer) els.headLookLayer.classList.add("has-looked");
  }

  function flushLook(force) {
    if (!ctx?.isConnected()) return;
    if (!pending && !force) return;
    pending = false;
    ctx.sendControl("head.look", parseLookValue(pose), { volatile: true });
  }

  function scheduleSend() {
    pending = true;
    if (sendTimer) return;
    sendTimer = setTimeout(() => {
      sendTimer = null;
      flushLook(false);
    }, SEND_MS);
  }

  function setPose(next, send, opts = {}) {
    pose = parseLookValue(next);
    if (edgeSliders) edgeSliders.setPose(pose);
    if (!send) return;
    if (opts.immediate) {
      if (sendTimer) {
        clearTimeout(sendTimer);
        sendTimer = null;
      }
      pending = true;
      flushLook(true);
      return;
    }
    scheduleSend();
  }

  function operatorControllingHead() {
    if (held.size) return true;
    if (edgeSliders?.isInteracting?.()) return true;
    if (els.headLookLayer?.classList.contains("is-dragging")) return true;
    return false;
  }

  function applyHeadStatus(head) {
    if (!head || operatorControllingHead()) return;
    if (
      !shouldApplyHeadTelemetry({
        pose,
        head,
        lastInputAt: lastHeadInputAt,
      })
    ) {
      if (edgeSliders && head.atLimit) edgeSliders.setAtLimit(head.atLimit);
      return;
    }
    const on = axes();
    const next = { ...pose };
    if (on.yaw && typeof head.yaw === "number") next.yaw = head.yaw;
    if (on.pitch && typeof head.pitch === "number") next.pitch = head.pitch;
    setPose(next, false);
    if (edgeSliders && head.atLimit) edgeSliders.setAtLimit(head.atLimit);
  }

  function applyDelta(delta) {
    markHeadInput();
    setPose(addLook(pose, delta, axes()), true, { immediate: held.size > 0 });
    markUsed();
  }

  function resetLook() {
    pose = { yaw: 0, pitch: 0 };
    if (edgeSliders) edgeSliders.setPose(pose);
    pending = false;
    if (sendTimer) {
      clearTimeout(sendTimer);
      sendTimer = null;
    }
    applyPreview(null);
    if (ctx?.isConnected())
      ctx.sendControl("head.reset", undefined, { volatile: false });
  }

  function tickKeys() {
    if (!held.size || !ctx?.isConnected()) return;
    const step = (LOOK_KEY_RATE * KEY_TICK_MS) / 1000;
    let yaw = 0;
    let pitch = 0;
    const on = axes();
    for (const key of held) {
      const dir = lookKeyDelta(key);
      if (!dir) continue;
      if (on.yaw) yaw += dir.yaw;
      if (on.pitch) pitch += dir.pitch;
    }
    if (yaw === 0 && pitch === 0) return;
    applyDelta({ yaw: yaw * step, pitch: pitch * step });
  }

  function stopKeys() {
    if (keyTimer) {
      clearInterval(keyTimer);
      keyTimer = null;
    }
    held.clear();
  }

  function typingTarget() {
    return blocksGameKeyboardShortcuts(document.activeElement);
  }

  function onKeyDown(event) {
    if (!ctx?.isConnected() || typingTarget()) return;
    const key = event.key.toLowerCase();
    if (key === "home") {
      event.preventDefault();
      resetLook();
      return;
    }
    if (!lookKeyDelta(key) || event.repeat) return;
    const on = axes();
    if ((key === "j" || key === "l") && !on.yaw) return;
    if ((key === "i" || key === "k") && !on.pitch) return;
    event.preventDefault();
    held.add(key);
    if (!keyTimer) keyTimer = setInterval(tickKeys, KEY_TICK_MS);
    tickKeys();
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (!held.has(key)) return;
    event.preventDefault();
    held.delete(key);
    if (!held.size) stopKeys();
    flushLook(true);
  }

  function setEnabled(enabled) {
    if (surface) surface.setEnabled(enabled);
    if (edgeSliders) edgeSliders.setEnabled(enabled);
    if (!enabled) {
      stopKeys();
      applyPreview(null);
    }
  }

  return {
    id: "head",
    optIn: true,
    isAvailable: isHeadAvailable,
    /**
     * @param {import("./registry.js").FeatureContext} nextCtx
     */
    mount(nextCtx) {
      ctx = nextCtx;
      caps = nextCtx.caps;
      pose = { yaw: 0, pitch: 0 };
      reducedMotion = Boolean(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      setHostHidden(false);
      if (els.headLookLayer) {
        edgeSliders = createHeadEdgeSliders(els.headLookLayer, {
          t,
          formatAxisValue,
          onAxis: (axis, value) => {
            markHeadInput();
            setPose({ ...pose, [axis]: value }, true);
            markUsed();
          },
        });
        edgeSliders.setAxes(axes());
        edgeSliders.setPose(pose);
        edgeSliders.refreshLabels();
        surface = createHeadLookSurface(els.headLookLayer, {
          onDelta: applyDelta,
          onReset: resetLook,
          onPreview: applyPreview,
        });
        surface.setAxes(axes());
        surface.setEnabled(nextCtx.isConnected());
      }
      const onBlur = () => {
        stopKeys();
        flushLook(true);
        applyPreview(null);
      };
      window.addEventListener("blur", onBlur);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        stopKeys();
        if (sendTimer) clearTimeout(sendTimer);
        sendTimer = null;
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        if (edgeSliders) {
          edgeSliders.destroy();
          edgeSliders = null;
        }
        if (surface) {
          surface.destroy();
          surface = null;
        }
        applyPreview(null);
        setHostHidden(true);
        ctx = null;
      };
    },
    update(nextCaps, nextCtx) {
      caps = nextCaps;
      ctx = nextCtx;
      if (surface) surface.setAxes(axes());
      if (edgeSliders) edgeSliders.setAxes(axes());
      setHostHidden(!isHeadAvailable(nextCaps));
    },
    setEnabled,
    refreshLabels() {
      if (els.headLookLayer) {
        els.headLookLayer.setAttribute("aria-label", t("head.layer"));
        els.headLookLayer.title = t("head.hintKeyboard");
      }
      if (edgeSliders) edgeSliders.refreshLabels();
    },
    onStatus(payload) {
      applyHeadStatus(parseRobotStatus(payload).head);
    },
  };
}
