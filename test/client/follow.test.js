import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { followFeature } from "../../public/js/features/follow.js";

test("follow feature is opt-in and gated by follow capability", () => {
  assert.equal(followFeature.id, "follow");
  assert.equal(followFeature.optIn, true);
  assert.equal(followFeature.isAvailable({ follow: { available: true } }), true);
  assert.equal(followFeature.isAvailable({}), false);
});
