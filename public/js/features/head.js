import { isHeadAvailable, headAxes } from "../protocol/capabilities.js";
import { parseRobotStatus } from "../protocol/status.js";
import { bindHeadKeyboard, stopHeadKeys } from "./head-keyboard.js";
import { applyHeadPreview, setHeadHostHidden } from "./head-preview.js";
import { mountHeadSurfaces, unmountHeadSurfaces } from "./head-mount.js";
import { applyHeadStatus } from "./head-status.js";

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createHeadFeature(els, t) {
  const bag = {
    els,
    t,
    caps: null,
    pose: { yaw: 0, pitch: 0 },
    surface: null,
    edgeSliders: null,
    ctx: null,
    held: new Set(),
    keyTimer: null,
    sendTimer: null,
    pending: false,
    reducedMotion: false,
    lastHeadInputAt: 0,
  };

  const keyboard = bindHeadKeyboard(bag);

  function setEnabled(enabled) {
    if (bag.surface) bag.surface.setEnabled(enabled);
    if (bag.edgeSliders) bag.edgeSliders.setEnabled(enabled);
    if (!enabled) {
      stopHeadKeys(bag);
      applyHeadPreview(bag, null);
    }
  }

  return {
    id: "head",
    optIn: true,
    isAvailable: isHeadAvailable,
    /** @param {import("./registry.js").FeatureContext} nextCtx */
    mount(nextCtx) {
      mountHeadSurfaces(bag, nextCtx);
      window.addEventListener("blur", keyboard.onBlur);
      window.addEventListener("keydown", keyboard.onKeyDown);
      window.addEventListener("keyup", keyboard.onKeyUp);
      return () => {
        window.removeEventListener("blur", keyboard.onBlur);
        window.removeEventListener("keydown", keyboard.onKeyDown);
        window.removeEventListener("keyup", keyboard.onKeyUp);
        unmountHeadSurfaces(bag);
      };
    },
    update(nextCaps, nextCtx) {
      bag.caps = nextCaps;
      bag.ctx = nextCtx;
      if (bag.surface) bag.surface.setAxes(headAxes(nextCaps));
      if (bag.edgeSliders) bag.edgeSliders.setAxes(headAxes(nextCaps));
      setHeadHostHidden(bag, !isHeadAvailable(nextCaps));
    },
    setEnabled,
    refreshLabels() {
      if (els.headLookLayer) {
        els.headLookLayer.setAttribute("aria-label", t("head.layer"));
        els.headLookLayer.title = t("head.hintKeyboard");
      }
      if (bag.edgeSliders) bag.edgeSliders.refreshLabels();
    },
    onStatus(payload) {
      applyHeadStatus(bag, parseRobotStatus(payload).head);
    },
  };
}
