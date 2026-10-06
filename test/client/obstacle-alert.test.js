import test from "node:test";
import assert from "node:assert/strict";
import {
  createObstacleAlert,
  OBSTACLE_DEBOUNCE_MS,
  OBSTACLE_VISIBLE_MS,
} from "../../public/js/ui/obstacle-alert.js";

test("createObstacleAlert shows on obstacle type and auto-hides", () => {
  const el = /** @type {HTMLElement} */ ({ hidden: true });
  const alert = createObstacleAlert({ obstacleAlert: el });

  alert.handleRobotAlert({ type: "obstacle" });
  assert.equal(el.hidden, false);

  alert.destroy();
});

test("createObstacleAlert debounces rapid events", () => {
  let now = OBSTACLE_DEBOUNCE_MS + 500;
  const originalDateNow = Date.now;
  Date.now = () => now;

  const el = /** @type {HTMLElement} */ ({ hidden: true });
  const alert = createObstacleAlert({ obstacleAlert: el });

  alert.handleRobotAlert({ type: "obstacle" });
  assert.equal(el.hidden, false);

  el.hidden = true;
  now += OBSTACLE_DEBOUNCE_MS - 1;
  alert.handleRobotAlert({ type: "obstacle" });
  assert.equal(el.hidden, true);

  now += 2;
  alert.handleRobotAlert({ type: "obstacle" });
  assert.equal(el.hidden, false);

  alert.destroy();
  Date.now = originalDateNow;
  assert.ok(OBSTACLE_VISIBLE_MS > 0);
});
