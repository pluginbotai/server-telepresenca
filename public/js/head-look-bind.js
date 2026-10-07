/**
 * @param {HTMLElement} layer
 * @param {object} handlers
 */
export function bindHeadLookPointerEvents(layer, handlers) {
  layer.addEventListener("pointerdown", handlers.onPointerDown);
  layer.addEventListener("pointermove", handlers.onPointerMove);
  layer.addEventListener("pointerup", handlers.onPointerUp);
  layer.addEventListener("pointercancel", handlers.onPointerUp);
  layer.addEventListener("contextmenu", handlers.onContextMenu);

  return () => {
    layer.removeEventListener("pointerdown", handlers.onPointerDown);
    layer.removeEventListener("pointermove", handlers.onPointerMove);
    layer.removeEventListener("pointerup", handlers.onPointerUp);
    layer.removeEventListener("pointercancel", handlers.onPointerUp);
    layer.removeEventListener("contextmenu", handlers.onContextMenu);
  };
}
