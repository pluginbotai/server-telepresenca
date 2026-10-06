import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { expressionsFeature } from "../../public/js/features/expressions.js";
import { createAudioMonitor } from "../../public/js/media/audio-monitor.js";

function fakeElement(initialClasses = []) {
  const classes = new Set(initialClasses);
  const attributes = new Map();
  const listeners = new Map();
  const children = [];

  const el = {
    tagName: "div",
    dataset: {},
    classList: {
      add: (...tokens) => tokens.forEach((token) => classes.add(token)),
      remove: (...tokens) => tokens.forEach((token) => classes.delete(token)),
      contains: (token) => classes.has(token),
      toggle: (token, force) => {
        if (typeof force === "boolean") {
          if (force) classes.add(token);
          else classes.delete(token);
          return force;
        }
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      },
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => attributes.get(name) ?? null,
    removeAttribute: (name) => attributes.delete(name),
    disabled: false,
    hidden: false,
    title: "",
    innerHTML: "",
    textContent: "",
    children,
    append: (...items) => items.forEach((item) => children.push(item)),
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    replaceChildren: (...items) => {
      children.length = 0;
      children.push(...items);
    },
    remove: () => {},
    get firstChild() {
      return children[0] || null;
    },
    querySelectorAll: (selector) => {
      const results = [];
      function traverse(node) {
        if (!node) return;
        if (
          selector === ".robot-drawer-preset-btn" &&
          node.classList?.contains("robot-drawer-preset-btn")
        ) {
          results.push(node);
        }
        if (node.children) {
          for (const c of node.children) traverse(c);
        }
      }
      for (const c of children) traverse(c);
      return results;
    },
    addEventListener: (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type) || [];
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    },
    dispatchEvent: (type, event = {}) => {
      const list = listeners.get(type) || [];
      for (const handler of list) {
        handler({ type, target: el, preventDefault: () => {}, ...event });
      }
    },
  };
  return el;
}

function installDom() {
  const prevDoc = globalThis.document;
  globalThis.document = {
    createElement: (tag) => {
      const el = fakeElement();
      el.tagName = tag;
      return el;
    },
  };
  return {
    restore() {
      globalThis.document = prevDoc;
    },
  };
}

function createMockHost() {
  const host = fakeElement();
  host.hidden = true;
  return host;
}

test("expressionsFeature is opt-in and gated by robot capabilities", () => {
  assert.equal(expressionsFeature.optIn, true);
  assert.equal(expressionsFeature.isAvailable(null), false);
  assert.equal(expressionsFeature.isAvailable({}), false);
  assert.equal(
    expressionsFeature.isAvailable({ emotions: { available: false } }),
    false,
  );
  assert.equal(expressionsFeature.isAvailable({ emotions: { available: true } }), true);
});

test("expressionsFeature mounts in drawer section and dispatches operator.face on click", () => {
  const dom = installDom();
  const mockHost = createMockHost();
  const sentControls = [];
  let connected = true;

  const ctx = {
    isConnected: () => connected,
    sendControl: (action, value, opts) => {
      sentControls.push({ action, value, opts });
    },
    host: (id) => (id === "expressions" ? mockHost : null),
    t: (k) => {
      if (k === "emotions.title") return "Expressões Faciais";
      if (k === "emotions.default") return "Padrão";
      if (k === "emotions.smile") return "Sorriso";
      if (k === "emotions.happy") return "Feliz";
      return k;
    },
  };

  const unmount = expressionsFeature.mount(ctx);
  assert.equal(mockHost.hidden, false);
  assert.ok(mockHost.firstChild);

  // Verifies inner structure with dataset.feature = expressions
  assert.equal(mockHost.firstChild.dataset.feature, "expressions");

  // Operator clicks smile
  expressionsFeature.selectFace("smile", { send: true });
  assert.equal(sentControls.length, 1);
  assert.equal(sentControls[0].action, "operator.face");
  assert.deepEqual(sentControls[0].value, { name: "smile" });
  assert.equal(expressionsFeature.getCurrentFace(), "smile");

  // Operator clicks happy
  expressionsFeature.selectFace("happy", { send: true });
  assert.equal(sentControls.length, 2);
  assert.equal(sentControls[1].action, "operator.face");
  assert.deepEqual(sentControls[1].value, { name: "happy" });
  assert.equal(expressionsFeature.getCurrentFace(), "happy");

  unmount();
  assert.equal(mockHost.hidden, true);
  dom.restore();
});

test("audioMonitor detects speech above RMS threshold and dispatches voice state", () => {
  const sentEvents = [];
  const monitor = createAudioMonitor({
    threshold: 10,
    holdTimeMs: 50,
    onVoiceStateChange: (speaking) => {
      sentEvents.push(speaking);
    },
  });

  // Level below threshold -> silence
  monitor.processLevel(5);
  assert.equal(sentEvents.length, 0);

  // Level above threshold -> speech triggered
  monitor.processLevel(25);
  assert.equal(sentEvents.length, 1);
  assert.equal(sentEvents[0], true);

  // Level returns to silence immediately -> still held by holdTimeMs
  monitor.processLevel(2);
  assert.equal(sentEvents.length, 1);

  // Fast forward past holdTimeMs
  monitor.forceSilence();
  assert.equal(sentEvents.length, 2);
  assert.equal(sentEvents[1], false);
});
