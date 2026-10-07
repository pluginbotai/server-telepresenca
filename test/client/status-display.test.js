import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  resolveStatusDisplayKey,
  STATUS_DISPLAY_SHORT,
} from "../../public/js/ui/status-display.js";

test("resolveStatusDisplayKey keeps full keys on desktop layout", () => {
  assert.equal(resolveStatusDisplayKey("status.live", false), "status.live");
  assert.equal(
    resolveStatusDisplayKey("status.disconnected", false),
    "status.disconnected",
  );
});

test("resolveStatusDisplayKey maps known long status keys when compact", () => {
  for (const [full, short] of Object.entries(STATUS_DISPLAY_SHORT)) {
    assert.equal(resolveStatusDisplayKey(full, true), short);
  }
  assert.equal(
    resolveStatusDisplayKey("status.disconnected", true),
    "status.disconnected",
  );
});
