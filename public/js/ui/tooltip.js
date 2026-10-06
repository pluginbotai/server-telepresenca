import { createTooltipController } from "./tooltip-controller.js";
import { findMatchingElement } from "./tooltip-shared.js";

/**
 * @typedef {object} TooltipOptions
 * @property {number} [enterDelayMs=180] - Delay in milliseconds before showing tooltip on first hover.
 * @property {number} [warmWindowMs=350] - Milliseconds window for instant transition between adjacent buttons.
 * @property {Document} [doc] - Document reference (defaults to global document).
 * @property {(el: HTMLElement) => string | null} [getLabel] - Custom label extractor.
 */

/**
 * @param {Document} doc
 * @param {HTMLElement | Document} root
 * @returns {{ el: HTMLElement | null, created: boolean }}
 */
function getOrCreateTooltipElement(doc, root) {
  let tooltipEl = doc.getElementById("hudTooltip");
  if (tooltipEl) return { el: tooltipEl, created: false };

  if (doc.createElement) {
    tooltipEl = doc.createElement("div");
    tooltipEl.id = "hudTooltip";
    tooltipEl.className = "hud-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.setAttribute("aria-hidden", "true");
    (doc.body || root).appendChild(tooltipEl);
    return { el: tooltipEl, created: true };
  }
  return { el: null, created: false };
}

/**
 * Evita tooltip nativo do browser em paralelo ao `.hud-tooltip`.
 * @param {HTMLElement | Document} root
 * @param {string} selector
 */
export function suppressNativeTitles(root, selector) {
  const nodes =
    typeof root.querySelectorAll === "function" ? root.querySelectorAll(selector) : [];
  for (const el of nodes) {
    if (!el?.hasAttribute?.("title")) continue;
    el.removeAttribute("title");
  }
}

/**
 * @param {object} cfg
 * @param {HTMLElement | Document} cfg.root
 * @param {Document} cfg.doc
 * @param {string} cfg.selector
 * @param {(btn: HTMLElement) => void} cfg.onEnter
 * @param {(btn: HTMLElement) => void} cfg.onLeave
 * @param {() => void} cfg.onDismiss
 * @returns {() => void}
 */
function attachTooltipListeners(cfg) {
  const onPointerEnter = (/** @type {Event} */ e) => {
    const btn = findMatchingElement(e.target, cfg.selector);
    if (btn) cfg.onEnter(btn);
  };
  const onPointerLeave = (/** @type {Event} */ e) => {
    const btn = findMatchingElement(e.target, cfg.selector);
    if (btn) cfg.onLeave(btn);
  };
  const onFocusIn = (/** @type {FocusEvent} */ e) => {
    const btn = findMatchingElement(e.target, cfg.selector);
    if (btn) cfg.onEnter(btn);
  };
  const onFocusOut = (/** @type {FocusEvent} */ e) => {
    const btn = findMatchingElement(e.target, cfg.selector);
    if (btn) cfg.onLeave(btn);
  };
  const onClick = (/** @type {MouseEvent} */ e) => {
    if (findMatchingElement(e.target, cfg.selector)) cfg.onDismiss();
  };
  const onKeyDown = (/** @type {KeyboardEvent} */ e) => {
    if (e.key === "Escape") cfg.onDismiss();
  };

  cfg.root.addEventListener("mouseenter", onPointerEnter, true);
  cfg.root.addEventListener("mouseleave", onPointerLeave, true);
  cfg.root.addEventListener("focusin", onFocusIn, true);
  cfg.root.addEventListener("focusout", onFocusOut, true);
  cfg.root.addEventListener("click", onClick, true);
  cfg.doc.addEventListener("keydown", onKeyDown, true);

  return () => {
    cfg.root.removeEventListener("mouseenter", onPointerEnter, true);
    cfg.root.removeEventListener("mouseleave", onPointerLeave, true);
    cfg.root.removeEventListener("focusin", onFocusIn, true);
    cfg.root.removeEventListener("focusout", onFocusOut, true);
    cfg.root.removeEventListener("click", onClick, true);
    cfg.doc.removeEventListener("keydown", onKeyDown, true);
  };
}

/**
 * Initializes accessible floating tooltips with warm-delay (Discord/Google Meet style).
 *
 * @param {HTMLElement | Document} root
 * @param {string} selector
 * @param {TooltipOptions} [options]
 * @returns {{ destroy: () => void, update: () => void }}
 */
export function initTooltips(root, selector = ".ctrl", options = {}) {
  const doc =
    options.doc ||
    (typeof document !== "undefined"
      ? document
      : root.ownerDocument || /** @type {Document} */ (root));

  const { el: tooltipEl, created: createdElement } = getOrCreateTooltipElement(
    doc,
    root,
  );
  const controller = createTooltipController(tooltipEl, options);

  const cleanupListeners = attachTooltipListeners({
    root,
    doc,
    selector,
    onEnter: controller.handleEnter,
    onLeave: (btn) => {
      if (btn === controller.getCurrentTarget()) controller.hide();
    },
    onDismiss: controller.hide,
  });

  function syncManagedElements() {
    suppressNativeTitles(root, selector);
  }
  syncManagedElements();

  return {
    destroy() {
      controller.hide();
      cleanupListeners();
      if (createdElement && tooltipEl?.remove) tooltipEl.remove();
    },
    update() {
      syncManagedElements();
      const currentTarget = controller.getCurrentTarget();
      if (currentTarget && tooltipEl?.classList.contains("is-visible")) {
        controller.show(currentTarget);
      }
    },
  };
}
