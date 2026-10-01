import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  HEAD_INPUT_GRACE_MS,
  HEAD_MEASURED_TRUST_EPS,
  shouldApplyHeadTelemetry,
} from "../../public/js/protocol/head-telemetry.js";

test("stale commanded head status does not overwrite a fresh operator pose", () => {
  const now = 1_000_000;
  assert.equal(
    shouldApplyHeadTelemetry({
      pose: { yaw: 0, pitch: 0.12 },
      head: { pitch: 0, source: "commanded" },
      lastInputAt: now - 50,
      now,
    }),
    false,
  );
});

test("measured head status applies after the input grace window", () => {
  const now = 1_000_000;
  assert.equal(
    shouldApplyHeadTelemetry({
      pose: { yaw: 0, pitch: 0.12 },
      head: { pitch: 0.11, source: "measured" },
      lastInputAt: now - HEAD_INPUT_GRACE_MS - 1,
      now,
    }),
    true,
  );
});

test("measured head status is ignored when it disagrees with operator pose", () => {
  const now = 1_000_000;
  assert.equal(
    shouldApplyHeadTelemetry({
      pose: { yaw: 0, pitch: 0.7 },
      head: { pitch: -0.9, source: "measured" },
      lastInputAt: now - HEAD_INPUT_GRACE_MS - 1,
      now,
    }),
    false,
  );
  assert.equal(HEAD_MEASURED_TRUST_EPS, 0.18);
});

test("matching commanded echo still applies when idle", () => {
  const now = 1_000_000;
  assert.equal(
    shouldApplyHeadTelemetry({
      pose: { yaw: 0, pitch: 0.1 },
      head: { pitch: 0.1, source: "commanded" },
      lastInputAt: now - HEAD_INPUT_GRACE_MS - 1,
      now,
    }),
    true,
  );
});
