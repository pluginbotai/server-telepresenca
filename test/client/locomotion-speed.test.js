import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { createLocomotionSpeedFeature } from "../../public/js/features/locomotion-speed.js";
import {
  clampLocomotionSpeedFactor,
  locomotionSpeedRange,
  snapLocomotionSpeedFactor,
} from "../../public/js/protocol/capabilities.js";

function fakeElement() {
  const listeners = {};
  const attrs = {};
  const el = {
    children: [],
    dataset: {},
    className: "",
    textContent: "",
    disabled: false,
    hidden: true,
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute(k, v) {
      attrs[k] = v;
    },
    getAttribute: (k) => attrs[k],
    removeAttribute(k) {
      delete attrs[k];
    },
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    click() {
      listeners.click?.();
    },
    append(...c) {
      el.children.push(...c);
    },
    appendChild(c) {
      el.children.push(c);
    },
    replaceChildren(...c) {
      el.children = [...c];
    },
    remove() {},
    querySelector: () => null,
    querySelectorAll(sel) {
      return sel === "button" || sel === "[data-speed-step]"
        ? el.children.filter((c) => c.tagName === "button")
        : [];
    },
  };
  return el;
}

function installDom() {
  const prevDoc = globalThis.document;
  const prevLs = globalThis.localStorage;
  const store = new Map();
  globalThis.document = {
    createElement: (tag) => Object.assign(fakeElement(), { tagName: tag }),
  };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  return {
    store,
    restore() {
      globalThis.document = prevDoc;
      globalThis.localStorage = prevLs;
    },
  };
}

function mountFeature(caps, { connected = true } = {}) {
  const sent = [];
  const host = fakeElement();
  const ctx = {
    caps,
    isConnected: () => connected,
    host: () => host,
    sendControl: (action, value, opts) => sent.push({ action, value, opts }),
  };
  const feature = createLocomotionSpeedFeature({}, (k) => k);
  feature.mount(ctx);
  const root = host.children[0];
  const group = root.children[1];
  return { feature, sent, group, ctx };
}

const TEMI = { locomotion: { speed: true, speedMin: 0.35, speedMax: 1, speedDefault: 0.75 } };
const CRUZR = { locomotion: { speed: true, speedMin: 0.35, speedMax: 1, speedDefault: 1 } };

test("speed feature renders slow/normal/fast and sends the robot default on mount", () => {
  const dom = installDom();
  try {
    const { sent, group } = mountFeature(TEMI);
    assert.deepEqual(
      group.children.map((b) => b.getAttribute("data-speed-step")),
      ["0.35", "0.75", "1"],
    );
    assert.deepEqual(sent, [
      { action: "locomotion.speed.set", value: { factor: 0.75 }, opts: { volatile: false } },
    ]);
  } finally {
    dom.restore();
  }
});

test("clicking a step sends a non-volatile factor and persists it", () => {
  const dom = installDom();
  try {
    const { sent, group } = mountFeature(CRUZR);
    sent.length = 0;
    group.children[0].click();
    assert.deepEqual(sent, [
      { action: "locomotion.speed.set", value: { factor: 0.35 }, opts: { volatile: false } },
    ]);
    assert.equal(dom.store.get("telepresenca.locomotion.speedFactor"), "0.35");
    group.children[2].click();
    assert.equal(sent.at(-1).value.factor, 1);
  } finally {
    dom.restore();
  }
});

test("stored factor wins over robot default and is re-sent on mount", () => {
  const dom = installDom();
  try {
    dom.store.set("telepresenca.locomotion.speedFactor", "0.35");
    const { sent } = mountFeature(TEMI);
    assert.equal(sent[0].value.factor, 0.35);
  } finally {
    dom.restore();
  }
});

test("garbage in storage falls back to the robot default", () => {
  const dom = installDom();
  try {
    dom.store.set("telepresenca.locomotion.speedFactor", "abc");
    const { sent } = mountFeature(TEMI);
    assert.equal(sent[0].value.factor, 0.75);
  } finally {
    dom.restore();
  }
});

test("setEnabled(true) re-sends the factor (robot reconnect) and never when disconnected", () => {
  const dom = installDom();
  try {
    const { feature, sent } = mountFeature(CRUZR);
    sent.length = 0;
    feature.setEnabled(true);
    assert.equal(sent.length, 1);

    const offline = mountFeature(CRUZR, { connected: false });
    assert.equal(offline.sent.length, 0);
    offline.feature.setEnabled(true);
    assert.equal(offline.sent.length, 0);
  } finally {
    dom.restore();
  }
});

test("speed range helpers clamp and snap to advertised steps", () => {
  const range = locomotionSpeedRange(TEMI);
  assert.deepEqual(range, { min: 0.35, max: 1, default: 0.75 });
  assert.equal(snapLocomotionSpeedFactor(0.5, range), 0.35);
  assert.equal(snapLocomotionSpeedFactor(0.6, range), 0.75);
  assert.equal(snapLocomotionSpeedFactor(5, range), 1);
  assert.equal(snapLocomotionSpeedFactor(-1, range), 0.35);
  assert.equal(clampLocomotionSpeedFactor(NaN, 0.35, 1), 0.35);
  assert.deepEqual(locomotionSpeedRange(null), { min: 0.35, max: 1, default: 1 });
});

test("a robot capped below 1.0 only offers the steps inside its range", () => {
  const dom = installDom();
  try {
    const { group } = mountFeature({
      locomotion: { speed: true, speedMin: 0.35, speedMax: 0.75, speedDefault: 0.75 },
    });
    assert.deepEqual(
      group.children.map((b) => b.getAttribute("data-speed-step")),
      ["0.35", "0.75"],
    );
  } finally {
    dom.restore();
  }
});
