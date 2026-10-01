import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  getMockCapabilities,
  getMockStatus,
  isMockRequested,
  isMockUiEnabled,
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

test("isMockUiEnabled allows localhost and explicit mock query", () => {
  assert.equal(isMockUiEnabled("?room=x"), false);
  assert.equal(isMockUiEnabled("?mock=cruzr"), true);
  assert.equal(isMockUiEnabled("?demo=1"), true);
});

test("shouldShowMockToggle displays mock button only when no real robot is connected", () => {
  const dev = { search: "?mock=cruzr" };

  // Sem robô na sala -> show (em dev; localhost idem no browser)
  assert.equal(shouldShowMockToggle(dev), true);

  // Production hostname without mock param -> never show
  assert.equal(shouldShowMockToggle({ search: "?room=sala" }), false);

  // Robô real na sala ou WebRTC -> hide
  assert.equal(shouldShowMockToggle({ ...dev, robotPeerPresent: true }), false);
  assert.equal(shouldShowMockToggle({ ...dev, rtcWithRobot: true }), false);
});

