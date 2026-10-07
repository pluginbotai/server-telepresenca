/** @typedef {{ obstacleAlert?: HTMLElement | null }} ObstacleAlertEls */

export const OBSTACLE_VISIBLE_MS = 3200;
export const OBSTACLE_DEBOUNCE_MS = 1800;

/**
 * Aviso efêmero no topo da cena (operador), alinhado ao HUD Pluginbot.
 *
 * @param {ObstacleAlertEls} els
 */
export function createObstacleAlert(els) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let hideTimer = null;
  let lastTriggeredAt = 0;

  function hide() {
    const root = els.obstacleAlert;
    if (!root) return;
    root.hidden = true;
  }

  function show() {
    const root = els.obstacleAlert;
    if (!root) return;

    const now = Date.now();
    if (!root.hidden) {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, OBSTACLE_VISIBLE_MS);
      return;
    }
    if (now - lastTriggeredAt < OBSTACLE_DEBOUNCE_MS) {
      return;
    }
    lastTriggeredAt = now;
    root.hidden = false;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, OBSTACLE_VISIBLE_MS);
  }

  /**
   * @param {unknown} payload
   */
  function handleRobotAlert(payload) {
    if (!payload || typeof payload !== "object") return;
    const type = /** @type {{ type?: string }} */ (payload).type;
    if (type === "obstacle") {
      show();
    }
  }

  function destroy() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    hide();
  }

  return { show, hide, handleRobotAlert, destroy };
}
