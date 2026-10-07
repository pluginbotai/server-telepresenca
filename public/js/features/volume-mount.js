import { bindPopoverDismiss, createPopover } from "../ui/popover.js";
import {
  createDrawerSectionHead,
  createDrawerSectionInner,
} from "../ui/robot-drawer-section.js";
import { VOLUME_ICON } from "./volume-icons.js";

/** @param {ReturnType<import("./volume-state.js").createVolumeState>} state */
function mountVolumeDrawer(state, host) {
  state.isDrawerMode = true;
  const { t } = state;
  const sliderRow = document.createElement("div");
  sliderRow.className = "robot-drawer-volume-row";
  sliderRow.setAttribute("role", "group");
  sliderRow.setAttribute("aria-label", t("volume.panel"));

  state.button = document.createElement("button");
  state.button.type = "button";
  state.button.className = "robot-drawer-mute-btn";
  state.button.innerHTML = VOLUME_ICON;

  const sliderWrap = document.createElement("div");
  sliderWrap.className = "volume-slider-wrap";
  state.slider = document.createElement("input");
  state.slider.type = "range";
  state.slider.className = "volume-slider volume-slider--drawer";
  state.slider.step = "1";
  state.slider.title = t("volume.sliderHint");
  sliderWrap.append(state.slider);
  sliderRow.append(state.button, sliderWrap);

  const { head, titleEl, badgeEl } = createDrawerSectionHead({
    title: t("volume.panel"),
    badgeText: String(state.level),
  });
  state.titleEl = titleEl;
  state.badgeEl = badgeEl;
  state.root = createDrawerSectionInner("volume", head, sliderRow);
  host.appendChild(state.root);

  const onInput = () => state.setLevel(Number(state.slider.value), true);
  const onChange = () => {
    state.setLevel(Number(state.slider.value), false);
    state.sendLevel(false);
  };
  state.button.addEventListener("click", state.onToggleMute);
  state.slider.addEventListener("input", onInput);
  state.slider.addEventListener("change", onChange);
  state.syncUi();

  return () => {
    if (state.sendTimer) clearTimeout(state.sendTimer);
    state.sendTimer = null;
    state.button?.removeEventListener("click", state.onToggleMute);
    state.slider?.removeEventListener("input", onInput);
    state.slider?.removeEventListener("change", onChange);
    state.root?.remove();
    state.clearMounted();
    host.hidden = true;
  };
}

/** @param {ReturnType<import("./volume-state.js").createVolumeState>} state */
function mountVolumePopover(state, host) {
  state.isDrawerMode = false;
  const { t } = state;
  host.classList.add("popover-host");
  state.root = document.createElement("div");
  state.root.className = "volume-widget";
  state.root.dataset.feature = "volume";
  state.button = document.createElement("button");
  state.button.type = "button";
  state.button.className = "ctrl";
  state.button.setAttribute("aria-haspopup", "dialog");
  state.button.setAttribute("aria-expanded", "false");
  state.button.innerHTML = VOLUME_ICON;

  const chrome = createPopover({ title: t("volume.panel") });
  state.panel = chrome.panel;
  state.titleEl = chrome.title;
  state.closeBtn = chrome.closeButton;
  state.panel.classList.add("volume-panel");
  chrome.body.classList.add("volume-body");
  state.slider = document.createElement("input");
  state.slider.type = "range";
  state.slider.className = "volume-slider";
  state.slider.step = "1";
  state.valueEl = document.createElement("span");
  state.valueEl.className = "volume-value";
  chrome.body.append(state.slider, state.valueEl);
  state.root.append(state.button, state.panel);
  host.appendChild(state.root);

  const onToggle = (event) => {
    event.preventDefault();
    if (state.button.disabled) return;
    state.setPanelOpen(state.panel.classList.contains("hidden"));
  };
  const onInput = () => state.setLevel(Number(state.slider.value), true);
  const onChange = () => {
    state.setLevel(Number(state.slider.value), false);
    state.sendLevel(false);
  };
  const onClose = (event) => {
    event.preventDefault();
    state.setPanelOpen(false);
  };

  state.button.addEventListener("click", onToggle);
  state.closeBtn.addEventListener("click", onClose);
  state.slider.addEventListener("input", onInput);
  state.slider.addEventListener("change", onChange);
  const unbindDismiss = bindPopoverDismiss(state.root, {
    isOpen: () => Boolean(state.panel && !state.panel.classList.contains("hidden")),
    setOpen: (open) => state.setPanelOpen(open),
  });
  state.syncUi();

  return () => {
    if (state.sendTimer) clearTimeout(state.sendTimer);
    state.sendTimer = null;
    unbindDismiss();
    state.button?.removeEventListener("click", onToggle);
    state.closeBtn?.removeEventListener("click", onClose);
    state.slider?.removeEventListener("input", onInput);
    state.slider?.removeEventListener("change", onChange);
    state.root?.remove();
    state.clearMounted();
    host.hidden = true;
  };
}

/**
 * @param {ReturnType<import("./volume-state.js").createVolumeState>} state
 * @param {import("./registry.js").FeatureContext} nextCtx
 */
export function mountVolumeFeature(state, nextCtx) {
  state.ctx = nextCtx;
  state.applyRangeFromCaps(nextCtx.caps);

  if (state.quickVolumeBtn) {
    state.quickVolumeBtn.removeEventListener("click", state.onToggleMute);
    state.quickVolumeBtn.addEventListener("click", state.onToggleMute);
  }

  const host = nextCtx.host("volume") || state.els?.volumeHost;
  if (!host) {
    state.syncUi();
    return () => {
      state.quickVolumeBtn?.removeEventListener("click", state.onToggleMute);
      state.ctx = null;
    };
  }
  host.hidden = false;
  const teardown = host.classList.contains("robot-drawer-section")
    ? mountVolumeDrawer(state, host)
    : mountVolumePopover(state, host);

  return () => {
    state.quickVolumeBtn?.removeEventListener("click", state.onToggleMute);
    teardown();
  };
}
