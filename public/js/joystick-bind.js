/**
 * @param {HTMLElement} element
 * @param {object} handlers
 * @param {(event: PointerEvent) => void} handlers.onPointerDown
 * @param {(event: PointerEvent) => void} handlers.onPointerMove
 * @param {(event: PointerEvent) => void} handlers.onPointerUp
 * @param {(event: Event) => void} handlers.onContextMenu
 */
export function bindTeleJoystickEvents(element, handlers) {
  element.addEventListener("pointerdown", handlers.onPointerDown);
  element.addEventListener("pointermove", handlers.onPointerMove);
  element.addEventListener("pointerup", handlers.onPointerUp);
  element.addEventListener("pointercancel", handlers.onPointerUp);
  element.addEventListener("contextmenu", handlers.onContextMenu);

  return () => {
    element.removeEventListener("pointerdown", handlers.onPointerDown);
    element.removeEventListener("pointermove", handlers.onPointerMove);
    element.removeEventListener("pointerup", handlers.onPointerUp);
    element.removeEventListener("pointercancel", handlers.onPointerUp);
    element.removeEventListener("contextmenu", handlers.onContextMenu);
  };
}
