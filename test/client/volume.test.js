import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { createVolumeFeature } from "../../public/js/features/volume.js";

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
    value: "5",
    min: "0",
    max: "10",
    step: "1",
    style: {
      setProperty: () => {},
    },
    children,
    append: (...items) => items.forEach((item) => children.push(item)),
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    querySelector: (selector) => {
      if (selector.startsWith(".")) {
        const cls = selector.slice(1);
        return children.find((c) => c.classList?.contains(cls)) || null;
      }
      return null;
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
    remove: () => {},
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

test("createVolumeFeature wires btnQuickVolume for 1-click mute toggle (happy path)", () => {
  const dom = installDom();
  try {
    const volumeHost = fakeElement(["robot-drawer-section"]);
    const btnQuickVolume = fakeElement();
    const dict = {
      "volume.panel": "Volume do robô",
      "volume.mute": "Silenciar",
      "volume.unmute": "Ativar som",
      "volume.level": "Volume {{level}}",
    };
    const t = (k, vars) => {
      let text = dict[k] || k;
      if (vars) {
        for (const [key, val] of Object.entries(vars)) {
          text = text.replace(`{{${key}}}`, String(val));
        }
      }
      return text;
    };

    const sent = [];
    const ctx = {
      sendControl: (action, payload, opts) => sent.push({ action, payload, opts }),
      isConnected: () => true,
      host: (id) => (id === "volume" ? volumeHost : null),
      caps: { audio: { volume: true, volumeMin: 0, volumeMax: 10, volumeLevel: 7 } },
    };

    const feature = createVolumeFeature({ volumeHost, btnQuickVolume }, t);
    const unmount = feature.mount(ctx);

    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "false");
    assert.equal(btnQuickVolume.getAttribute("aria-label"), "Silenciar");
    assert.ok(
      btnQuickVolume.innerHTML.includes("quick-dock-icon"),
      "must include quick-dock-icon class for sizing",
    );
    assert.ok(
      btnQuickVolume.innerHTML.includes("M11 4.702"),
      "must display Lucide speaker cone",
    );
    assert.ok(
      btnQuickVolume.innerHTML.includes("M16 9"),
      "must display Lucide audio waves",
    );

    // 1-click on quick volume toggles mute
    btnQuickVolume.dispatchEvent("click");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].action, "volume.set");
    assert.equal(sent[0].payload.level, 0);
    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "true");
    assert.equal(btnQuickVolume.getAttribute("aria-label"), "Ativar som");
    assert.ok(
      btnQuickVolume.innerHTML.includes('line x1="22" x2="16"'),
      "must display Lucide muted icon cross line",
    );
    assert.ok(
      btnQuickVolume.innerHTML.includes("quick-dock-icon"),
      "must preserve quick-dock-icon class when muted",
    );

    // Next click on quick volume toggles unmute (restores previous level 7)
    btnQuickVolume.dispatchEvent("click");
    assert.equal(sent.length, 2);
    assert.equal(sent[1].action, "volume.set");
    assert.equal(sent[1].payload.level, 7);
    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "false");
    assert.equal(btnQuickVolume.getAttribute("aria-label"), "Silenciar");
    assert.ok(
      btnQuickVolume.innerHTML.includes("M16 9"),
      "must restore Lucide volume-2 audio waves on unmute",
    );

    unmount();
  } finally {
    dom.restore();
  }
});

test("createVolumeFeature quick volume syncs with drawer slider and robot status", () => {
  const dom = installDom();
  try {
    const volumeHost = fakeElement(["robot-drawer-section"]);
    const btnQuickVolume = fakeElement();
    const t = (k) => k;

    const ctx = {
      sendControl: () => {},
      isConnected: () => true,
      host: () => volumeHost,
      caps: { audio: { volume: true, volumeMin: 0, volumeMax: 10, volumeLevel: 5 } },
    };

    const feature = createVolumeFeature({ volumeHost, btnQuickVolume }, t);
    feature.mount(ctx);

    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "false");

    // Status arrives reporting volume 0 (robot muted)
    feature.onStatus({ audio: { min: 0, max: 10, volume: 0 } });
    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "true");

    // Status arrives reporting volume 8 (robot unmuted)
    feature.onStatus({ audio: { min: 0, max: 10, volume: 8 } });
    assert.equal(btnQuickVolume.getAttribute("aria-pressed"), "false");
  } finally {
    dom.restore();
  }
});

test("createVolumeFeature quick volume respects isConnected and setEnabled", () => {
  const dom = installDom();
  try {
    const volumeHost = fakeElement(["robot-drawer-section"]);
    const btnQuickVolume = fakeElement();
    const t = (k) => k;
    let connected = false;

    const sent = [];
    const ctx = {
      sendControl: (action, payload) => sent.push({ action, payload }),
      isConnected: () => connected,
      host: () => volumeHost,
      caps: { audio: { volume: true, volumeMin: 0, volumeMax: 10, volumeLevel: 5 } },
    };

    const feature = createVolumeFeature({ volumeHost, btnQuickVolume }, t);
    feature.mount(ctx);

    // When not connected, click does nothing
    btnQuickVolume.dispatchEvent("click");
    assert.equal(sent.length, 0);

    // setEnabled(false) disables the quick button
    feature.setEnabled(false);
    assert.equal(btnQuickVolume.disabled, true);

    feature.setEnabled(true);
    assert.equal(btnQuickVolume.disabled, false);
  } finally {
    dom.restore();
  }
});

test("robot-agnostic capability checks correctly gate quick actions", () => {
  // Robot without audio volume
  const robotWithoutVolume = { locomotion: { available: true } };
  assert.equal(
    createVolumeFeature({}, () => {}).isAvailable(robotWithoutVolume),
    false,
  );

  // Robot with audio volume
  const robotWithVolume = { audio: { volume: true } };
  assert.equal(createVolumeFeature({}, () => {}).isAvailable(robotWithVolume), true);

  // Robot with volume set to false
  const robotWithVolumeFalse = { audio: { volume: false } };
  assert.equal(
    createVolumeFeature({}, () => {}).isAvailable(robotWithVolumeFalse),
    false,
  );
});
