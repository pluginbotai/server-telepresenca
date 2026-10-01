import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  locomotionSpeedStepLabelKey,
  snapLocomotionSpeedFactor,
} from "../../public/js/protocol/capabilities.js";

test("locomotion speed presets map to slow, normal, fast labels", () => {
  assert.equal(locomotionSpeedStepLabelKey(0.35), "movement.speedSlow");
  assert.equal(locomotionSpeedStepLabelKey(0.75), "movement.speedNormal");
  assert.equal(locomotionSpeedStepLabelKey(1), "movement.speedFast");
  const range = { min: 0.35, max: 1 };
  assert.equal(snapLocomotionSpeedFactor(0.55, range), 0.75);
  assert.equal(snapLocomotionSpeedFactor(0.72, range), 0.75);
});
