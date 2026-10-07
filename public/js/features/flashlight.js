import { isFlashlightAvailable } from "../protocol/capabilities.js";

const ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 13v1" />
  <path d="M17 2a1 1 0 0 1 1 1v4a3 3 0 0 1-.6 1.8l-.6.8A4 4 0 0 0 16 12v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-8a4 4 0 0 0-.8-2.4l-.6-.8A3 3 0 0 1 6 7V3a1 1 0 0 1 1-1z" />
  <path d="M6 6h12" />
</svg>`;

export const flashlightFeature = {
  id: "flashlight",
  optIn: true,
  isAvailable: isFlashlightAvailable,
  /**
   * @param {import("./registry.js").FeatureContext} ctx
   */
  mount(ctx) {
    const host = ctx.host("flashlight") || ctx.host("call");
    if (!host) return () => {};
    host.hidden = false;

    const btn = document.createElement("button");
    btn.type = "button";
    const isDrawer =
      host.dataset?.host === "flashlight" ||
      host.classList?.contains("robot-drawer-section");
    btn.className = isDrawer ? "robot-drawer-btn" : "ctrl";
    btn.dataset.feature = "flashlight";
    btn.innerHTML = isDrawer
      ? `${ICON} <span>${ctx.t("media.flashlight")}</span>`
      : ICON;
    btn.disabled = !ctx.isConnected();
    btn.setAttribute("aria-label", ctx.t("media.flashlight"));

    const modes = ctx.caps?.flashlight?.modes || ["toggle"];
    const action = modes.includes("toggle") ? "flashlight.toggle" : "flashlight.on";

    btn.addEventListener("click", () => {
      if (btn.disabled || !ctx.isConnected()) return;
      ctx.sendControl(action, undefined, { volatile: false });
    });

    host.appendChild(btn);
    return () => {
      btn.remove();
      if (isDrawer) host.hidden = true;
    };
  },
};
