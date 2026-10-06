import { resolveLabel, positionTooltip } from "./tooltip-shared.js";

/**
 * @param {HTMLElement | null} tooltipEl
 * @param {import("./tooltip.js").TooltipOptions} options
 */
export function createTooltipController(tooltipEl, options) {
  const enterDelayMs = options.enterDelayMs ?? 180;
  const warmWindowMs = options.warmWindowMs ?? 350;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let enterTimer = null;
  let lastCloseTimestamp = 0;
  /** @type {HTMLElement | null} */
  let currentTarget = null;

  /**
   * @param {HTMLElement} target
   * @param {boolean} [isWarm=false]
   */
  function show(target, isWarm = false) {
    if (!tooltipEl) return;
    const label = resolveLabel(target, options.getLabel);
    if (!label) return hide();
    tooltipEl.textContent = label;
    currentTarget = target;
    positionTooltip(tooltipEl, target);
    tooltipEl.classList.toggle("is-sliding", isWarm);
    tooltipEl.setAttribute("aria-hidden", "false");
    tooltipEl.classList.add("is-visible");
  }

  function hide() {
    if (enterTimer) clearTimeout(enterTimer);
    enterTimer = null;
    if (tooltipEl) {
      if (tooltipEl.getAttribute("aria-hidden") === "false") {
        lastCloseTimestamp = Date.now();
      }
      tooltipEl.setAttribute("aria-hidden", "true");
      tooltipEl.classList.remove("is-visible");
      tooltipEl.classList.remove("is-sliding");
    }
    currentTarget = null;
  }

  function handleEnter(/** @type {HTMLElement} */ btn) {
    if (btn.disabled || btn.hasAttribute("disabled")) return hide();
    if (enterTimer) clearTimeout(enterTimer);
    if (Date.now() - lastCloseTimestamp < warmWindowMs) {
      show(btn, true);
    } else {
      enterTimer = setTimeout(() => {
        show(btn, false);
        enterTimer = null;
      }, enterDelayMs);
    }
  }

  return {
    show,
    hide,
    handleEnter,
    getCurrentTarget: () => currentTarget,
  };
}
