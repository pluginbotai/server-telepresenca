import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { sanitizeControlPayload } from "../../src/protocol/control-sanitize.js";

test("sanitizeControlPayload clamps head.look axes", () => {
  const out = sanitizeControlPayload({
    action: "head.look",
    value: { yaw: 2, pitch: -3 },
  });
  assert.ok(out);
  assert.equal(out.action, "head.look");
  assert.deepEqual(out.value, { yaw: 1, pitch: -1 });
  assert.equal(out.from, "operator");
});

test("sanitizeControlPayload rejects invalid actions", () => {
  assert.equal(sanitizeControlPayload(null), null);
  assert.equal(sanitizeControlPayload({ action: "  " }), null);
});

test("sanitizeControlPayload passes through discrete actions", () => {
  const out = sanitizeControlPayload({ action: "stop" });
  assert.ok(out);
  assert.equal(out.action, "stop");
  assert.equal(out.value, undefined);
});
