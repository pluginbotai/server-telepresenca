import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  getMockCapabilities,
  getMockStatus,
  isMockRequested,
  resolveMockType,
  shouldShowMockToggle,
} from "../../public/js/features/mock-robot.js";

test("isMockRequested detects demo and mock query parameters", () => {
  assert.equal(isMockRequested("?mock=cruzr"), true);
  assert.equal(isMockRequested("?mock=temi"), true);
  assert.equal(isMockRequested("?mock=1"), true);
  assert.equal(isMockRequested("?demo=true"), true);
  assert.equal(isMockRequested("?demo=1"), true);
  assert.equal(isMockRequested("?room=sala1"), false);
  assert.equal(isMockRequested(""), false);
  assert.equal(isMockRequested(null), false);
});

test("resolveMockType returns normalized robot model or fallback", () => {
  assert.equal(resolveMockType("?mock=temi"), "temi");
  assert.equal(resolveMockType("?mock=cruzr"), "cruzr");
  assert.equal(resolveMockType("?demo=1"), "cruzr");
  assert.equal(resolveMockType(""), "cruzr");
});

test("getMockCapabilities returns valid capabilities for Cruzr and Temi", () => {
  const cruzr = getMockCapabilities("cruzr");
  assert.equal(cruzr.audio.volume, true);
  assert.equal(cruzr.audio.volumeMax, 15);
  assert.equal(cruzr.head.available, true);
  assert.equal(cruzr.power.available, true);

  const temi = getMockCapabilities("temi");
  assert.equal(temi.audio.volume, true);
  assert.equal(temi.audio.volumeMax, 10);
  assert.equal(temi.power.available, true);
});

test("getMockStatus provides initial telemetry for simulated robot", () => {
  const statusCruzr = getMockStatus("cruzr");
  assert.equal(typeof statusCruzr.battery.pct, "number");
  assert.equal(typeof statusCruzr.audio.volume, "number");
  assert.equal(statusCruzr.audio.volume, 8);
});

test("shouldShowMockToggle displays mock button only when no real robot is connected", () => {
  // Offline / no robot -> show
  assert.equal(shouldShowMockToggle(), true);
  assert.equal(shouldShowMockToggle({ connected: false, liveCapabilities: null }), true);
  assert.equal(shouldShowMockToggle({ connected: false, liveCapabilities: {} }), true);

  // Real robot connected -> hide
  assert.equal(shouldShowMockToggle({ connected: true, liveCapabilities: null }), false);
  assert.equal(shouldShowMockToggle({ connected: true, liveCapabilities: { locomotion: { available: true } } }), false);

  // Robot capabilities present in room state even before WebRTC establishes -> hide
  assert.equal(shouldShowMockToggle({ connected: false, liveCapabilities: { locomotion: { available: true } } }), false);
});

