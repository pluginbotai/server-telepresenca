import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  addLook,
  clampAxis,
  clampLook,
  grabStep,
  lookKeyDelta,
  parseLookValue,
} from "../../public/js/protocol/look.js";
import {
  createHeadEdgeSliders,
  pitchNormFromTrackY,
  pitchVisualPctFromNorm,
  yawNormFromTrackX,
} from "../../public/js/head-edge-sliders.js";
import { createHeadLookSurface } from "../../public/js/head-look.js";
import { createHeadFeature } from "../../public/js/features/head.js";
import { headAxes, isHeadAvailable } from "../../public/js/protocol/capabilities.js";

test("Street View grab: drag right looks left, drag down looks up", () => {
  const step = grabStep(100, 50, { width: 200, height: 200, sensitivity: 1.4 });
  assert.equal(step.yaw, -0.7);
  assert.equal(step.pitch, 0.35);
});

test("look pose clamps to the unit square", () => {
  assert.equal(clampAxis(2), 1);
  assert.equal(clampAxis(-4), -1);
  assert.equal(clampAxis("x"), 0);
  assert.deepEqual(clampLook({ yaw: 8, pitch: -3 }), { yaw: 1, pitch: -1 });
});

test("addLook respects disabled axes", () => {
  const next = addLook(
    { yaw: 0.2, pitch: 0.1 },
    { yaw: 0.5, pitch: 0.5 },
    { yaw: false },
  );
  assert.equal(next.yaw, 0.2);
  assert.equal(next.pitch, 0.6);
});

test("IJKL looks in the key direction", () => {
  assert.deepEqual(lookKeyDelta("i"), { yaw: 0, pitch: 1 });
  assert.deepEqual(lookKeyDelta("k"), { yaw: 0, pitch: -1 });
  assert.deepEqual(lookKeyDelta("j"), { yaw: -1, pitch: 0 });
  assert.deepEqual(lookKeyDelta("l"), { yaw: 1, pitch: 0 });
  assert.equal(lookKeyDelta("w"), null);
});

test("parseLookValue fills missing axes", () => {
  assert.deepEqual(parseLookValue(null), { yaw: 0, pitch: 0 });
  assert.deepEqual(parseLookValue({ yaw: 0.25 }), { yaw: 0.25, pitch: 0 });
});

test("head capability is opt-in", () => {
  assert.equal(isHeadAvailable(null), false);
  assert.equal(isHeadAvailable({}), false);
  assert.equal(isHeadAvailable({ head: { available: true } }), true);
  assert.deepEqual(headAxes({ head: { available: true, yaw: false } }), {
    yaw: false,
    pitch: true,
  });
});

test("head feature mounts only when advertised", () => {
  const feature = createHeadFeature({}, (key) => key);
  assert.equal(feature.id, "head");
  assert.equal(feature.optIn, true);
  assert.equal(feature.isAvailable(null), false);
  assert.equal(feature.isAvailable({ head: { available: true } }), true);
});

function mockLayer() {
  const listeners = {};
  const classes = new Set();
  const layer = {
    hidden: false,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle(name, on) {
        if (on) classes.add(name);
        else classes.delete(name);
      },
      has: (name) => classes.has(name),
    },
    style: {},
    setAttribute() {},
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    removeEventListener(type) {
      delete listeners[type];
    },
    setPointerCapture() {},
    getBoundingClientRect() {
      return { width: 200, height: 100, left: 0, top: 0 };
    },
    prepend(...nodes) {
      layer.edgeRails = {};
      for (const node of nodes) {
        if (node.dataset?.axis) layer.edgeRails[node.dataset.axis] = node;
      }
    },
    edgeRails: {},
    listeners,
    classes,
  };
  return layer;
}

function mockDocument() {
  return {
    createElement(tag) {
      if (tag === "input") {
        return {
          type: "range",
          className: "",
          value: "0",
          min: "-100",
          max: "100",
          step: "1",
          disabled: false,
          listeners: {},
          addEventListener(type, fn) {
            this.listeners[type] = fn;
          },
          setAttribute() {},
          removeAttribute() {},
        };
      }
      const node = {
        className: "",
        dataset: {},
        hidden: false,
        innerHTML: "",
        style: { setProperty() {} },
        children: [],
        listeners: {},
        setAttribute() {},
        addEventListener(type, fn) {
          this.listeners[type] = fn;
        },
        getBoundingClientRect() {
          return { top: 0, height: 200, width: 28, left: 0 };
        },
        append(...kids) {
          this.children.push(...kids);
          for (const kid of kids) {
            if (kid.className === "head-edge-input") this.input = kid;
            if (kid.className === "head-edge-slider-visual") this.visual = kid;
          }
        },
        remove() {},
      };
      return node;
    },
  };
}

test("head edge sliders hide yaw when axis unavailable", () => {
  const prevDoc = globalThis.document;
  globalThis.document = mockDocument();
  const layer = mockLayer();
  const ui = createHeadEdgeSliders(layer, { onAxis: () => {} });
  ui.setAxes({ yaw: false, pitch: true });
  assert.equal(layer.classes.has("head-edge--pitch-only"), true);
  ui.destroy();
  globalThis.document = prevDoc;
});

test("pitch track maps pointer Y to norm and thumb position", () => {
  const rect = { top: 100, height: 200 };
  assert.equal(pitchNormFromTrackY(100, rect), 1);
  assert.equal(pitchNormFromTrackY(300, rect), -1);
  assert.equal(pitchVisualPctFromNorm(0), 50);
});

test("yaw track maps pointer X to normalized yaw", () => {
  const rect = { left: 50, width: 200 };
  assert.equal(yawNormFromTrackX(50, rect), -1);
  assert.equal(yawNormFromTrackX(250, rect), 1);
  assert.equal(yawNormFromTrackX(150, rect), 0);
});

test("head edge sliders report normalized axis values", () => {
  const prevDoc = globalThis.document;
  globalThis.document = mockDocument();
  const layer = mockLayer();
  const calls = [];
  const ui = createHeadEdgeSliders(layer, {
    onAxis: (axis, value) => calls.push({ axis, value }),
  });
  const yawRail = layer.edgeRails.yaw;
  assert.ok(yawRail?.input?.listeners?.input);
  yawRail.input.value = "40";
  yawRail.input.listeners.input();
  assert.deepEqual(calls[0], { axis: "yaw", value: 0.4 });
  const pitchRail = layer.edgeRails.pitch;
  pitchRail.input.value = "40";
  pitchRail.input.listeners.input();
  assert.deepEqual(calls[1], { axis: "pitch", value: 0.4 });
  ui.destroy();
  globalThis.document = prevDoc;
});

test("yaw rail uses pointer drag on the rail like pitch", async () => {
  const prevDoc = globalThis.document;
  const prevWindow = globalThis.window;
  const windowListeners = {};
  globalThis.document = mockDocument();
  globalThis.window = {
    addEventListener(type, fn, capture) {
      windowListeners[`${type}:${capture ? "capture" : "bubble"}`] = fn;
    },
    removeEventListener(type, fn, capture) {
      const key = `${type}:${capture ? "capture" : "bubble"}`;
      if (windowListeners[key] === fn) delete windowListeners[key];
    },
  };
  const layer = mockLayer();
  const calls = [];
  const ui = createHeadEdgeSliders(layer, {
    onAxis: (axis, value) => calls.push({ axis, value }),
  });
  const yawRail = layer.edgeRails.yaw;
  yawRail.visual.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 28 });
  yawRail.listeners?.pointerdown?.({
    pointerId: 3,
    button: 0,
    clientX: 100,
    stopPropagation() {},
    preventDefault() {},
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { axis: "yaw", value: 0 });
  windowListeners["pointermove:capture"]?.({ pointerId: 3, clientX: 200 });
  assert.deepEqual(calls[calls.length - 1], { axis: "yaw", value: 1 });
  ui.destroy();
  globalThis.document = prevDoc;
  globalThis.window = prevWindow;
});

test("head edge sliders release interaction and blur after pointerup", async () => {
  const prevDoc = globalThis.document;
  const prevWindow = globalThis.window;
  const windowListeners = {};
  globalThis.document = mockDocument();
  globalThis.window = {
    addEventListener(type, fn, capture) {
      windowListeners[`${type}:${capture ? "capture" : "bubble"}`] = fn;
    },
    removeEventListener(type, fn, capture) {
      const key = `${type}:${capture ? "capture" : "bubble"}`;
      if (windowListeners[key] === fn) delete windowListeners[key];
    },
  };
  const layer = mockLayer();
  let blurred = false;
  const ui = createHeadEdgeSliders(layer, { onAxis: () => {} });
  const pitchRail = layer.edgeRails.pitch;
  const input = pitchRail.input;
  input.blur = () => {
    blurred = true;
  };
  assert.equal(ui.isInteracting(), false);
  pitchRail.listeners?.pointerdown?.({
    pointerId: 7,
    button: 0,
    clientY: 120,
    stopPropagation() {},
    preventDefault() {},
  });
  assert.equal(ui.isInteracting(), true);
  windowListeners["pointerup:capture"]?.({ pointerId: 7 });
  assert.equal(ui.isInteracting(), false);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(blurred, true);
  ui.destroy();
  globalThis.document = prevDoc;
  globalThis.window = prevWindow;
});

test("head-look surface ignores pointerdown on edge rails", () => {
  const layer = mockLayer();
  const deltas = [];
  createHeadLookSurface(layer, { onDelta: (delta) => deltas.push(delta) });
  layer.listeners.pointerdown({
    pointerId: 1,
    button: 0,
    clientX: 10,
    clientY: 10,
    target: { closest: (sel) => (sel === ".head-edge-rail" ? {} : null) },
    preventDefault() {},
  });
  assert.equal(deltas.length, 0);
});

test("head-look surface reports grab deltas while dragging", () => {
  const layer = mockLayer();
  const deltas = [];
  const surface = createHeadLookSurface(layer, {
    onDelta: (delta) => deltas.push(delta),
    rect: () => ({ width: 200, height: 100, left: 0, top: 0 }),
  });
  layer.listeners.pointerdown({
    pointerId: 1,
    button: 0,
    clientX: 80,
    clientY: 40,
    preventDefault() {},
  });
  layer.listeners.pointermove({
    pointerId: 1,
    clientX: 100,
    clientY: 50,
    preventDefault() {},
  });
  assert.equal(deltas.length, 1);
  assert.ok(deltas[0].yaw < 0, "drag right looks left");
  assert.ok(deltas[0].pitch > 0, "drag down looks up");
  surface.destroy();
});
