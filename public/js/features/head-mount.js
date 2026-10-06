import { createHeadEdgeSliders } from "../head-edge-sliders.js";
import { createHeadLookSurface } from "../head-look.js";
import { headAxes } from "../protocol/capabilities.js";
import { stopHeadKeys } from "./head-keyboard.js";
import {
  applyHeadPreview,
  formatHeadAxisValue,
  setHeadHostHidden,
} from "./head-preview.js";
import { applyHeadDelta, resetHeadLook, setHeadPose } from "./head-pose.js";

/** @param {object} bag @param {import("./registry.js").FeatureContext} nextCtx */
export function mountHeadSurfaces(bag, nextCtx) {
  bag.ctx = nextCtx;
  bag.caps = nextCtx.caps;
  bag.pose = { yaw: 0, pitch: 0 };
  bag.reducedMotion = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  setHeadHostHidden(bag, false);
  const layer = bag.els.headLookLayer;
  if (!layer) return;
  bag.edgeSliders = createHeadEdgeSliders(layer, {
    t: bag.t,
    formatAxisValue: (axis, norm) => formatHeadAxisValue(bag, axis, norm),
    onAxis: (axis, value) => {
      bag.lastHeadInputAt = Date.now();
      setHeadPose(bag, { ...bag.pose, [axis]: value }, true);
      layer.classList.add("has-looked");
    },
  });
  bag.edgeSliders.setAxes(headAxes(bag.caps));
  bag.edgeSliders.setPose(bag.pose);
  bag.edgeSliders.refreshLabels();
  bag.surface = createHeadLookSurface(layer, {
    onDelta: (delta) => applyHeadDelta(bag, delta),
    onReset: () => resetHeadLook(bag),
    onPreview: (preview) => applyHeadPreview(bag, preview),
  });
  bag.surface.setAxes(headAxes(bag.caps));
  bag.surface.setEnabled(nextCtx.isConnected());
}

/** @param {object} bag */
export function unmountHeadSurfaces(bag) {
  stopHeadKeys(bag);
  if (bag.sendTimer) clearTimeout(bag.sendTimer);
  bag.sendTimer = null;
  if (bag.edgeSliders) {
    bag.edgeSliders.destroy();
    bag.edgeSliders = null;
  }
  if (bag.surface) {
    bag.surface.destroy();
    bag.surface = null;
  }
  applyHeadPreview(bag, null);
  setHeadHostHidden(bag, true);
  bag.ctx = null;
}
