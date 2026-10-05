import {
  isLocomotionSpeedAvailable,
  locomotionSpeedRange,
  LOCOMOTION_SPEED_STEPS,
  locomotionSpeedStepLabelKey,
  snapLocomotionSpeedFactor,
} from "../protocol/capabilities.js";
import {
  createDrawerSectionHead,
  createDrawerSectionInner,
} from "../ui/robot-drawer-section.js";

const SPEED_STORAGE_KEY = "telepresenca.locomotion.speedFactor";

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createLocomotionSpeedFeature(els, t) {
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;
  let root = null;
  let badgeEl = null;
  let groupEl = null;
  let speedFactor = 1;
  let speedRange = { min: 0.35, max: 1, default: 1 };

  function readStoredSpeedFactor(fallback) {
    try {
      const raw = localStorage.getItem(SPEED_STORAGE_KEY);
      if (raw == null) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function persistSpeedFactor(factor) {
    try {
      localStorage.setItem(SPEED_STORAGE_KEY, String(factor));
    } catch (_) {
      /* ignore */
    }
  }

  function sendSpeedFactor(factor) {
    if (!ctx?.isConnected()) return;
    ctx.sendControl("locomotion.speed.set", { factor }, { volatile: false });
  }

  function stepLabel(step) {
    const key = locomotionSpeedStepLabelKey(step);
    return key ? t(key) : String(Math.round(step * 100));
  }

  function syncUi() {
    if (badgeEl) {
      badgeEl.textContent = stepLabel(speedFactor);
    }
    if (!groupEl) return;
    groupEl.querySelectorAll("[data-speed-step]").forEach((btn) => {
      const step = Number(btn.getAttribute("data-speed-step"));
      const on = Math.abs(step - speedFactor) < 0.001;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function applySpeedFactor(next, { send = true, persist = true } = {}) {
    speedFactor = snapLocomotionSpeedFactor(next, speedRange);
    if (persist) persistSpeedFactor(speedFactor);
    syncUi();
    if (send) sendSpeedFactor(speedFactor);
  }

  function buildSegmentButtons() {
    if (!groupEl) return;
    groupEl.replaceChildren();
    for (const step of LOCOMOTION_SPEED_STEPS) {
      if (step < speedRange.min - 0.001 || step > speedRange.max + 0.001) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "robot-drawer-segment-btn";
      btn.setAttribute("role", "radio");
      btn.setAttribute("data-speed-step", String(step));
      const label = stepLabel(step);
      btn.textContent = label;
      btn.setAttribute("aria-label", label);
      btn.removeAttribute("title");
      btn.disabled = !ctx?.isConnected();
      btn.addEventListener("click", () => applySpeedFactor(step));
      groupEl.appendChild(btn);
    }
    syncUi();
  }

  function initFromCaps(caps) {
    speedRange = locomotionSpeedRange(caps);
    const initial = readStoredSpeedFactor(speedRange.default);
    speedFactor = snapLocomotionSpeedFactor(initial, speedRange);
    buildSegmentButtons();
    if (ctx?.isConnected()) sendSpeedFactor(speedFactor);
  }

  return {
    id: "locomotion-speed",
    optIn: true,
    isAvailable: isLocomotionSpeedAvailable,
    mount(nextCtx) {
      ctx = nextCtx;
      const host = nextCtx.host("locomotion-speed") || els.drawerLocomotionSpeedHost;
      if (!host) return () => {};
      host.hidden = false;

      groupEl = document.createElement("div");
      groupEl.className = "robot-drawer-segmented";
      groupEl.setAttribute("role", "radiogroup");
      groupEl.setAttribute("aria-label", t("movement.speedAria"));

      const { head, badgeEl: headBadge } = createDrawerSectionHead({
        title: t("movement.speedLabel"),
        badgeText: "",
      });
      badgeEl = headBadge;

      root = createDrawerSectionInner("locomotion-speed", head, groupEl);
      host.appendChild(root);

      initFromCaps(nextCtx.caps);

      return () => {
        root?.remove();
        root = badgeEl = groupEl = null;
        host.hidden = true;
        ctx = null;
      };
    },
    update(caps, nextCtx) {
      ctx = nextCtx;
      initFromCaps(caps);
    },
    setEnabled(enabled) {
      if (!groupEl) return;
      groupEl.querySelectorAll("button").forEach((btn) => {
        btn.disabled = !enabled;
      });
      if (enabled) sendSpeedFactor(speedFactor);
    },
    refreshLabels() {
      if (!root) return;
      const titleEl = root.querySelector(".robot-drawer-section-title");
      if (titleEl) titleEl.textContent = t("movement.speedLabel");
      if (groupEl) groupEl.setAttribute("aria-label", t("movement.speedAria"));
      buildSegmentButtons();
    },
  };
}
