/**
 * Whether global game shortcuts (WASD, IJKL, arrows for movement) should be ignored
 * because the user is typing in a text field.
 * @param {Element | null | undefined} activeElement
 */
export function blocksGameKeyboardShortcuts(activeElement) {
  const el = activeElement;
  if (!el) return false;
  if (typeof document !== "undefined" && el === document.body) return false;
  const tag = el.tagName?.toLowerCase?.() ?? "";
  if (tag === "textarea") return true;
  if (el.isContentEditable) return true;
  if (tag !== "input") return false;
  const type = (el.getAttribute("type") || "text").toLowerCase();
  if (type === "range") return false;
  if (type === "checkbox" || type === "radio" || type === "button" || type === "submit") {
    return false;
  }
  return true;
}
