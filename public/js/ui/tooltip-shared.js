/**
 * @param {HTMLElement} el
 * @param {((el: HTMLElement) => string | null) | undefined} customResolver
 * @returns {string | null}
 */
export function resolveLabel(el, customResolver) {
  if (typeof customResolver === "function") {
    return customResolver(el);
  }
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  const dataTip = el.getAttribute("data-tooltip");
  if (dataTip?.trim()) return dataTip.trim();
  return null;
}

/**
 * @param {HTMLElement} tooltipEl
 * @param {HTMLElement} target
 */
export function positionTooltip(tooltipEl, target) {
  if (typeof target.getBoundingClientRect !== "function") return;
  const rect = target.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const topY = rect.top - 8;
  tooltipEl.style.left = `${Math.round(centerX)}px`;
  tooltipEl.style.top = `${Math.round(topY)}px`;
}

/**
 * @param {any} target
 * @param {string} selector
 * @returns {HTMLElement | null}
 */
export function findMatchingElement(target, selector) {
  if (!target || typeof target !== "object") return null;
  if (typeof target.closest === "function") {
    return target.closest(selector);
  }
  if (typeof target.matches === "function" && target.matches(selector)) {
    return target;
  }
  return null;
}
