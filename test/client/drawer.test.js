import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  createRobotDrawer,
  isRobotDrawerAvailable,
} from "../../public/js/ui/drawer.js";

function createMockElement(initialClasses = []) {
  const classes = new Set(initialClasses);
  const attributes = new Map();
  const listeners = new Map();
  const children = [];

  return {
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
    children,
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
        handler({ type, target: this, preventDefault: () => {}, ...event });
      }
    },
  };
}

test("isRobotDrawerAvailable returns true only when robot has drawer capabilities", () => {
  assert.equal(isRobotDrawerAvailable(null), false);
  assert.equal(isRobotDrawerAvailable({}), false);
  assert.equal(isRobotDrawerAvailable({ locomotion: { available: true } }), false);

  assert.equal(isRobotDrawerAvailable({ audio: { volume: true } }), true);
  assert.equal(isRobotDrawerAvailable({ flashlight: { available: true } }), true);
  assert.equal(isRobotDrawerAvailable({ head: { available: true } }), true);
});

test("createRobotDrawer starts closed with proper ARIA attributes", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const backdropEl = createMockElement();
  const translations = {
    "media.robotControlsOpen": "Abrir controles do robô",
    "media.robotControlsClose": "Recolher controles",
  };
  const t = (key) => translations[key] || key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    backdropEl,
    t,
  });

  assert.equal(drawer.isOpen(), false);
  assert.equal(drawerEl.classList.contains("is-open"), false);
  assert.equal(toggleBtn.getAttribute("aria-expanded"), "false");
  assert.equal(drawerEl.getAttribute("aria-hidden"), "true");
  assert.equal(toggleBtn.getAttribute("aria-label"), "Abrir controles do robô");
});

test("createRobotDrawer open, close and toggle methods manage classes and attributes", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    t,
  });

  drawer.open();
  assert.equal(drawer.isOpen(), true);
  assert.equal(drawerEl.classList.contains("is-open"), true);
  assert.equal(toggleBtn.getAttribute("aria-expanded"), "true");
  assert.equal(drawerEl.getAttribute("aria-hidden"), "false");

  drawer.close();
  assert.equal(drawer.isOpen(), false);
  assert.equal(drawerEl.classList.contains("is-open"), false);
  assert.equal(toggleBtn.getAttribute("aria-expanded"), "false");
  assert.equal(drawerEl.getAttribute("aria-hidden"), "true");

  drawer.toggle();
  assert.equal(drawer.isOpen(), true);
  drawer.toggle();
  assert.equal(drawer.isOpen(), false);
});

test("createRobotDrawer click listeners trigger toggle, close, and backdrop dismissal", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const backdropEl = createMockElement();
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    backdropEl,
    t,
  });

  toggleBtn.dispatchEvent("click");
  assert.equal(drawer.isOpen(), true);

  closeBtn.dispatchEvent("click");
  assert.equal(drawer.isOpen(), false);

  drawer.open();
  assert.equal(drawer.isOpen(), true);
  backdropEl.dispatchEvent("click");
  assert.equal(drawer.isOpen(), false);
});

test("createRobotDrawer setEnabled closes drawer and disables toggle button", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    t,
  });

  drawer.open();
  assert.equal(drawer.isOpen(), true);

  drawer.setEnabled(false);
  assert.equal(drawer.isOpen(), false);
  assert.equal(toggleBtn.disabled, true);

  drawer.setEnabled(true);
  assert.equal(toggleBtn.disabled, false);
});

test("createRobotDrawer wires quick volume shortcut and quick dock integration", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const quickDockEl = createMockElement();
  const btnQuickVolume = createMockElement();
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    quickDockEl,
    btnQuickVolume,
    t,
  });

  assert.equal(drawer.isOpen(), false);
  btnQuickVolume.dispatchEvent("click");
  assert.equal(drawer.isOpen(), true);
  assert.equal(drawerEl.classList.contains("is-open"), true);
});

test("createRobotDrawer synchronizes title and aria attributes on all quick dock buttons", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const quickDockEl = createMockElement();
  const btnQuickVolume = createMockElement();
  const btnQuickHeadReset = createMockElement();
  const btnQuickFlashlight = createMockElement();
  const btnMockToggle = createMockElement();
  const dict = {
    "media.robotControlsOpen": "Abrir controles",
    "media.robotControlsClose": "Recolher controles",
    "media.robotControls": "Controles do robô",
    "media.quickDock": "Ações rápidas",
    "volume.panel": "Volume do robô",
    "media.headReset": "Centralizar câmera",
    "media.flashlight": "Lanterna",
    "media.mockEnable": "Simular robô conectado",
  };
  const t = (key) => dict[key] || key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    quickDockEl,
    btnQuickVolume,
    btnQuickHeadReset,
    btnQuickFlashlight,
    btnMockToggle,
    t,
  });

  drawer.refreshLabels();

  assert.equal(btnQuickVolume.title, "Volume do robô");
  assert.equal(btnQuickVolume.getAttribute("aria-label"), "Volume do robô");
  assert.equal(btnQuickHeadReset.title, "Centralizar câmera");
  assert.equal(btnQuickHeadReset.getAttribute("aria-label"), "Centralizar câmera");
  assert.equal(btnQuickFlashlight.title, "Lanterna");
  assert.equal(btnQuickFlashlight.getAttribute("aria-label"), "Lanterna");
  assert.equal(btnMockToggle.title, "Simular robô conectado");
  assert.equal(btnMockToggle.getAttribute("aria-label"), "Simular robô conectado");
});

test("createRobotDrawer safely handles getIsMockActive callback throwing an error", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const btnMockToggle = createMockElement();
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    btnMockToggle,
    getIsMockActive: () => {
      throw new ReferenceError("can't access lexical declaration before initialization");
    },
    t,
  });

  assert.equal(drawer.isOpen(), false);
  assert.doesNotThrow(() => drawer.refreshLabels());
});

test("createRobotDrawer toggles panel-icon-arrow d attribute between open and close", () => {
  const drawerEl = createMockElement();
  const toggleBtn = createMockElement();
  const closeBtn = createMockElement();
  const arrowEl = createMockElement(["panel-icon-arrow"]);
  arrowEl.setAttribute("d", "m10 15-3-3 3-3");
  toggleBtn.appendChild(arrowEl);
  const t = (key) => key;

  const drawer = createRobotDrawer({
    drawerEl,
    toggleBtn,
    closeBtn,
    t,
  });

  assert.equal(arrowEl.getAttribute("d"), "m10 15-3-3 3-3");

  drawer.open();
  assert.equal(arrowEl.getAttribute("d"), "m8 9 3 3-3 3");

  drawer.close();
  assert.equal(arrowEl.getAttribute("d"), "m10 15-3-3 3-3");
});




