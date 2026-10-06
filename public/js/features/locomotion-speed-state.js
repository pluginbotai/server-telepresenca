import { buildLocomotionSpeedButtons } from "./locomotion-speed-ui.js";
import {
  applyLocomotionSpeedFactor,
  initLocomotionSpeedFromCaps,
  syncLocomotionSpeedUi,
} from "./locomotion-speed-sync.js";

/**
 * @param {(key: string) => string} t
 */
export function createLocomotionSpeedState(t) {
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;
  let root = null;
  let badgeEl = null;
  let groupEl = null;
  let speedFactor = 1;
  let speedRange = { min: 0.35, max: 1, default: 1 };

  const state = {
    get ctx() {
      return ctx;
    },
    set ctx(value) {
      ctx = value;
    },
    get root() {
      return root;
    },
    set root(value) {
      root = value;
    },
    get badgeEl() {
      return badgeEl;
    },
    set badgeEl(value) {
      badgeEl = value;
    },
    get groupEl() {
      return groupEl;
    },
    set groupEl(value) {
      groupEl = value;
    },
    get speedFactor() {
      return speedFactor;
    },
    set speedFactor(value) {
      speedFactor = value;
    },
    get speedRange() {
      return speedRange;
    },
    set speedRange(value) {
      speedRange = value;
    },
    t,
    sendSpeedFactor(factor) {
      if (!ctx?.isConnected()) return;
      ctx.sendControl("locomotion.speed.set", { factor }, { volatile: false });
    },
    initFromCaps(caps) {
      initLocomotionSpeedFromCaps(state, caps, t);
    },
    applySpeedFactor(next, opts) {
      applyLocomotionSpeedFactor(state, next, opts);
    },
    rebuildButtons() {
      buildLocomotionSpeedButtons(state, t);
    },
    syncUi() {
      syncLocomotionSpeedUi(state, t);
    },
    clearMounted() {
      root = badgeEl = groupEl = null;
      ctx = null;
    },
  };

  return state;
}
