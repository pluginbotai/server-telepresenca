import {
  LOCOMOTION_SPEED_STEPS,
  locomotionSpeedStepLabelKey,
} from "../protocol/capabilities.js";
import {
  createDrawerSectionHead,
  createDrawerSectionInner,
} from "../ui/robot-drawer-section.js";

/**
 * @param {object} state
 * @param {(key: string) => string} t
 */
export function buildLocomotionSpeedButtons(state, t) {
  const { groupEl, speedRange, ctx } = state;
  if (!groupEl) return;
  groupEl.replaceChildren();
  for (const step of LOCOMOTION_SPEED_STEPS) {
    if (step < speedRange.min - 0.001 || step > speedRange.max + 0.001) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "robot-drawer-segment-btn";
    btn.setAttribute("role", "radio");
    btn.setAttribute("data-speed-step", String(step));
    const label = locomotionSpeedStepLabel(t, step);
    btn.textContent = label;
    btn.setAttribute("aria-label", label);
    btn.removeAttribute("title");
    btn.disabled = !ctx?.isConnected();
    btn.addEventListener("click", () => state.applySpeedFactor(step));
    groupEl.appendChild(btn);
  }
  state.syncUi();
}

/**
 * @param {object} params
 */
export function mountLocomotionSpeedSection(params) {
  const { els, t, nextCtx, state } = params;
  state.ctx = nextCtx;
  /** @type {HTMLElement | null} */
  let hostRef = null;
  hostRef = nextCtx.host("locomotion-speed") || els.drawerLocomotionSpeedHost;
  if (!hostRef) return () => {};
  hostRef.hidden = false;

  state.groupEl = document.createElement("div");
  state.groupEl.className = "robot-drawer-segmented";
  state.groupEl.setAttribute("role", "radiogroup");
  state.groupEl.setAttribute("aria-label", t("movement.speedAria"));

  const { head, badgeEl: headBadge } = createDrawerSectionHead({
    title: t("movement.speedLabel"),
    badgeText: "",
  });
  state.badgeEl = headBadge;

  state.root = createDrawerSectionInner("locomotion-speed", head, state.groupEl);
  hostRef.appendChild(state.root);
  state.initFromCaps(nextCtx.caps);

  return () => {
    state.root?.remove();
    state.clearMounted();
    if (hostRef) hostRef.hidden = true;
  };
}

export function locomotionSpeedStepLabel(t, step) {
  const key = locomotionSpeedStepLabelKey(step);
  return key ? t(key) : String(Math.round(step * 100));
}
