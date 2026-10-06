import { isFollowAvailable } from "../protocol/capabilities.js";

const ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="7" r="3.5" />
  <path d="M5.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
  <path d="M18 8.5 19.5 10 18 11.5" />
</svg>`;

/** @type {HTMLButtonElement | null} */
let currentButton = null;
/** @type {import("./registry.js").FeatureContext | null} */
let currentCtx = null;

/** @param {boolean} active */
function labelKey(active) {
  return active ? "media.followStop" : "media.followStart";
}

/** @param {boolean} active */
function updateButtonState(active) {
  if (!currentButton) return;
  const labelKeyName = labelKey(active);
  const label =
    currentCtx && typeof currentCtx.t === "function"
      ? currentCtx.t(labelKeyName) || currentCtx.t("media.follow")
      : active
        ? "Parar de seguir"
        : "Seguir pessoa";
  currentButton.setAttribute("aria-label", label);
  currentButton.setAttribute("aria-pressed", active ? "true" : "false");
  const span = currentButton.querySelector("span");
  if (span) span.textContent = label;
  currentButton.dataset.followActive = active ? "true" : "false";
}

/** @param {boolean} active */
function applyFollowActive(active) {
  updateButtonState(active);
}

export const followFeature = {
  id: "follow",
  optIn: true,
  isAvailable: isFollowAvailable,
  /**
   * @param {import("./registry.js").FeatureContext} ctx
   */
  mount(ctx) {
    currentCtx = ctx;
    const host = ctx.host("follow");
    if (!host) return () => {};

    host.hidden = false;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "robot-drawer-btn";
    btn.dataset.feature = "follow";
    btn.innerHTML = `${ICON} <span>${ctx.t("media.followStart")}</span>`;
    btn.disabled = !ctx.isConnected();
    currentButton = btn;
    applyFollowActive(false);

    const onClick = () => {
      if (btn.disabled || !ctx.isConnected()) return;
      const active = btn.dataset.followActive === "true";
      const next = !active;
      ctx.sendControl("follow.set", { enabled: next }, { volatile: false });
      applyFollowActive(next);
    };

    btn.addEventListener("click", onClick);
    host.appendChild(btn);

    return () => {
      btn.removeEventListener("click", onClick);
      btn.remove();
      host.hidden = true;
      if (currentButton === btn) {
        currentButton = null;
        currentCtx = null;
      }
    };
  },
  /**
   * @param {object | null} _caps
   * @param {import("./registry.js").FeatureContext} ctx
   */
  update(_caps, ctx) {
    currentCtx = ctx;
    if (currentButton) {
      currentButton.disabled = !ctx.isConnected();
    }
  },
  /**
   * @param {unknown} payload
   */
  onStatus(payload) {
    if (typeof payload?.follow?.active !== "boolean") return;
    applyFollowActive(payload.follow.active);
  },
  refreshLabels() {
    const active = currentButton?.dataset.followActive === "true";
    updateButtonState(active);
  },
  setEnabled(enabled) {
    if (!enabled) {
      const wasActive = currentButton?.dataset.followActive === "true";
      if (wasActive && currentCtx?.isConnected()) {
        currentCtx.sendControl("follow.set", { enabled: false }, { volatile: false });
      }
      applyFollowActive(false);
    }
    if (currentButton) {
      currentButton.disabled = !enabled;
    }
  },
};
