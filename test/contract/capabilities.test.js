import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  backwardPulseDistanceM,
  isBeepAvailable,
  isContinuousBackward,
  isFlashlightAvailable,
  isFollowAvailable,
  isHeadAvailable,
  isLocomotionAvailable,
  isLocomotionSpeedAvailable,
  isPowerAvailable,
  isVolumeAvailable,
  isEmotionsAvailable,
  headAxisLimit,
  headMapping,
  headNormToDeg,
  headRangeMode,
  locomotionSpeedRange,
  normalizeCapabilities,
  snapLocomotionSpeedFactor,
} from "../../public/js/protocol/capabilities.js";
import { compileSchema, readJson } from "../helpers/load-schema.js";

const validate = compileSchema("schemas/capabilities.schema.json");
const cruzr = readJson("test/fixtures/cruzr-capabilities.json");
const flashlightRobot = readJson("test/fixtures/flashlight-robot.json");

test("Cruzr fixture matches capabilities schema", () => {
  assert.equal(validate(cruzr), true, JSON.stringify(validate.errors));
});

test("flashlight robot matches capabilities schema", () => {
  assert.equal(validate(flashlightRobot), true, JSON.stringify(validate.errors));
});

test("unknown modules are allowed on the root object", () => {
  assert.equal(validate({ lidar: { available: true } }), true);
});

test("legacy HUD stays on without capabilities", () => {
  assert.equal(isLocomotionAvailable(null), true);
  assert.equal(isBeepAvailable(null), true);
  assert.equal(isFlashlightAvailable(null), false);
  assert.equal(isHeadAvailable(null), false);
});

test("head look is opt-in like flashlight", () => {
  assert.equal(isHeadAvailable(cruzr), true);
  assert.equal(isHeadAvailable(flashlightRobot), false);
  assert.equal(isHeadAvailable({ head: { available: false } }), false);
});

test("emotions is opt-in like flashlight", () => {
  assert.equal(isEmotionsAvailable(cruzr), true);
  assert.equal(isEmotionsAvailable(flashlightRobot), false);
  assert.equal(isEmotionsAvailable({ emotions: { available: false } }), false);
  assert.equal(isEmotionsAvailable(null), false);
});

test("head limits and range mode parse from capabilities", () => {
  assert.equal(headRangeMode(cruzr), "full");
  const pitch = headAxisLimit(cruzr, "pitch");
  assert.ok(pitch);
  assert.equal(pitch.minDeg, 180);
  assert.equal(pitch.maxDeg, 270);
  const map = headMapping(cruzr);
  assert.equal(map.pitchInverted, true);
  const deg = headNormToDeg(0, pitch, map.pitchInverted);
  assert.ok(deg !== null && deg > 200 && deg < 240);
});

test("battery and volume HUD are opt-in", () => {
  assert.equal(isPowerAvailable(null), false);
  assert.equal(isVolumeAvailable(null), false);
  assert.equal(isPowerAvailable(cruzr), true);
  assert.equal(isVolumeAvailable(cruzr), true);
  assert.equal(isPowerAvailable(flashlightRobot), false);
  assert.equal(isVolumeAvailable(flashlightRobot), false);
});

test("flashlight is opt-in", () => {
  assert.equal(isFlashlightAvailable(cruzr), false);
  assert.equal(isFlashlightAvailable(flashlightRobot), true);
});

test("follow person is opt-in (Temi)", () => {
  assert.equal(isFollowAvailable(cruzr), false);
  assert.equal(isFollowAvailable(null), false);
  assert.equal(isFollowAvailable({ follow: { available: true } }), true);
});

test("beep can be explicitly disabled", () => {
  assert.equal(isBeepAvailable({ audio: { beep: false } }), false);
});

test("locomotion pulse vs continuous", () => {
  assert.equal(isContinuousBackward(cruzr), false);
  assert.equal(isContinuousBackward(flashlightRobot), true);
  assert.equal(isLocomotionAvailable({ locomotion: { available: false } }), false);
});

test("locomotion speed control is opt-in", () => {
  assert.equal(isLocomotionSpeedAvailable(null), false);
  assert.equal(isLocomotionSpeedAvailable(cruzr), true);
  const range = locomotionSpeedRange(cruzr);
  assert.equal(range.default, 1);
  assert.equal(snapLocomotionSpeedFactor(0.72, range), 0.75);
  assert.equal(snapLocomotionSpeedFactor(0.55, range), 0.75);
});

test("backward pulse defaults to 20cm", () => {
  assert.equal(backwardPulseDistanceM(null), 0.2);
  assert.equal(
    backwardPulseDistanceM({ locomotion: { backwardPulseDistanceM: 0.4 } }),
    0.4,
  );
});

test("normalizeCapabilities rejects non-objects", () => {
  assert.equal(normalizeCapabilities(null), null);
  assert.equal(normalizeCapabilities("x"), null);
  assert.deepEqual(normalizeCapabilities({ flashlight: { available: true } }), {
    flashlight: { available: true },
  });
});
