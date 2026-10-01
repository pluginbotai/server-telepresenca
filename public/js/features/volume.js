import { isVolumeAvailable, volumeRange } from "../protocol/capabilities.js";
import { parseRobotStatus, parseVolumeLevel } from "../protocol/status.js";
import { bindPopoverDismiss, createPopover } from "../ui/popover.js";

const ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4.5 9.5h3.2L12 6.2v11.6L7.7 14.5H4.5V9.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M15.2 9.2a4.2 4.2 0 0 1 0 5.6M17.6 7a7.2 7.2 0 0 1 0 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const ICON_MUTED = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4.5 9.5h3.2L12 6.2v11.6L7.7 14.5H4.5V9.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createVolumeFeature(els, t) {
  /** @type {import("./registry.js").FeatureContext | null} */
  let ctx = null;
  let root = null;
  let button = null;
  let slider = null;
  let valueEl = null;
  let panel = null;
  let titleEl = null;
  let closeBtn = null;
  let min = 0;
  let max = 10;
  let level = 5;
  let sendTimer = null;
  let isDrawerMode = false;

  function label() {
    return t("volume.level", { level });
  }

  function syncUi() {
    if (slider) {
      slider.min = String(min);
      slider.max = String(max);
      slider.value = String(level);
    }
    if (valueEl) valueEl.textContent = String(level);
    if (button) {
      if (isDrawerMode) {
        const isMuted = level <= min;
        const muteKey = isMuted ? "volume.unmute" : "volume.mute";
        button.setAttribute("aria-label", t(muteKey));
        button.title = t(muteKey);
        button.innerHTML = isMuted ? ICON_MUTED : ICON;
      } else {
        button.setAttribute("aria-label", label());
        button.title = label();
      }
      button.disabled = !ctx?.isConnected();
    }
    if (titleEl) titleEl.textContent = t("volume.panel");
    if (closeBtn) closeBtn.setAttribute("aria-label", t("dialog.close"));
    if (panel) panel.setAttribute("aria-label", t("volume.panel"));
  }

  function applyRangeFromCaps(caps) {
    const range = volumeRange(caps);
    min = range.min;
    max = range.max;
    const advertised = caps?.audio?.volumeLevel;
    level = parseVolumeLevel(
      typeof advertised === "number" ? advertised : level,
      min,
      max,
      min,
    );
  }

  function sendLevel(volatile) {
    if (!ctx?.isConnected()) return;
    ctx.sendControl("volume.set", { level }, { volatile: Boolean(volatile) });
  }

  function setLevel(next, send) {
    level = parseVolumeLevel(next, min, max, level);
    syncUi();
    if (!send) return;
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      sendTimer = null;
      sendLevel(true);
    }, 80);
  }

  function setPanelOpen(open) {
    if (!panel || !button) return;
    panel.classList.toggle("hidden", !open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  return {
    id: "volume",
    optIn: true,
    isAvailable: isVolumeAvailable,
    /**
     * @param {import("./registry.js").FeatureContext} nextCtx
     */
    mount(nextCtx) {
      ctx = nextCtx;
      applyRangeFromCaps(nextCtx.caps);
      const host = nextCtx.host("volume") || els.volumeHost;
      if (!host) return () => {};
      host.hidden = false;

      isDrawerMode = host.classList.contains("robot-drawer-card");

      if (isDrawerMode) {
        root = document.createElement("div");
        root.className = "robot-drawer-volume-inner";
        root.dataset.feature = "volume";

        const head = document.createElement("div");
        head.className = "robot-drawer-card-head";

        const labelWrap = document.createElement("div");
        labelWrap.className = "robot-drawer-card-label";
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = ICON;
        titleEl = document.createElement("span");
        titleEl.textContent = t("volume.panel");
        labelWrap.append(iconSpan, titleEl);

        valueEl = document.createElement("span");
        valueEl.className = "robot-drawer-card-badge";
        head.append(labelWrap, valueEl);

        const sliderRow = document.createElement("div");
        sliderRow.className = "robot-drawer-slider-row";

        button = document.createElement("button");
        button.type = "button";
        button.className = "robot-drawer-close";
        button.innerHTML = ICON;

        slider = document.createElement("input");
        slider.type = "range";
        slider.className = "robot-drawer-slider volume-slider";
        slider.step = "1";

        const presetsRow = document.createElement("div");
        presetsRow.className = "robot-drawer-presets";

        const btnHalf = document.createElement("button");
        btnHalf.type = "button";
        btnHalf.className = "robot-drawer-preset-btn";
        btnHalf.textContent = t("volume.presetLow");
        btnHalf.addEventListener("click", () => {
          if (!ctx?.isConnected()) return;
          setLevel(Math.round((max + min) / 2), true);
          sendLevel(false);
        });

        const btnFull = document.createElement("button");
        btnFull.type = "button";
        btnFull.className = "robot-drawer-preset-btn";
        btnFull.textContent = t("volume.presetMax");
        btnFull.addEventListener("click", () => {
          if (!ctx?.isConnected()) return;
          setLevel(max, true);
          sendLevel(false);
        });

        presetsRow.append(btnHalf, btnFull);
        sliderRow.append(button, slider);
        root.append(head, sliderRow, presetsRow);
        host.appendChild(root);

        let lastNonZero = level > min ? level : max;
        const onMuteToggle = (event) => {
          event.preventDefault();
          if (!ctx?.isConnected()) return;
          if (level > min) {
            lastNonZero = level;
            setLevel(min, true);
          } else {
            setLevel(lastNonZero || max, true);
          }
          sendLevel(false);
        };
        const onInput = () => setLevel(Number(slider.value), true);
        const onChange = () => {
          setLevel(Number(slider.value), false);
          sendLevel(false);
        };

        button.addEventListener("click", onMuteToggle);
        slider.addEventListener("input", onInput);
        slider.addEventListener("change", onChange);
        syncUi();

        return () => {
          if (sendTimer) clearTimeout(sendTimer);
          sendTimer = null;
          button.removeEventListener("click", onMuteToggle);
          slider.removeEventListener("input", onInput);
          slider.removeEventListener("change", onChange);
          root.remove();
          root = button = slider = valueEl = panel = titleEl = closeBtn = null;
          host.hidden = true;
          ctx = null;
          isDrawerMode = false;
        };
      }

      host.classList.add("popover-host");
      root = document.createElement("div");
      root.className = "volume-widget";
      root.dataset.feature = "volume";
      button = document.createElement("button");
      button.type = "button";
      button.className = "ctrl";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = ICON;

      const chrome = createPopover({ title: t("volume.panel") });
      panel = chrome.panel;
      titleEl = chrome.title;
      closeBtn = chrome.closeButton;
      panel.classList.add("volume-panel");
      chrome.body.classList.add("volume-body");

      slider = document.createElement("input");
      slider.type = "range";
      slider.className = "volume-slider";
      slider.step = "1";
      valueEl = document.createElement("span");
      valueEl.className = "volume-value";
      chrome.body.append(slider, valueEl);
      root.append(button, panel);
      host.appendChild(root);

      const onToggle = (event) => {
        event.preventDefault();
        if (button.disabled) return;
        setPanelOpen(panel.classList.contains("hidden"));
      };
      const onInput = () => setLevel(Number(slider.value), true);
      const onChange = () => {
        setLevel(Number(slider.value), false);
        sendLevel(false);
      };
      const onClose = (event) => {
        event.preventDefault();
        setPanelOpen(false);
      };

      button.addEventListener("click", onToggle);
      closeBtn.addEventListener("click", onClose);
      slider.addEventListener("input", onInput);
      slider.addEventListener("change", onChange);
      const unbindDismiss = bindPopoverDismiss(root, {
        isOpen: () => Boolean(panel && !panel.classList.contains("hidden")),
        setOpen: setPanelOpen,
      });
      syncUi();

      return () => {
        if (sendTimer) clearTimeout(sendTimer);
        sendTimer = null;
        unbindDismiss();
        button.removeEventListener("click", onToggle);
        closeBtn.removeEventListener("click", onClose);
        slider.removeEventListener("input", onInput);
        slider.removeEventListener("change", onChange);
        root.remove();
        root = button = slider = valueEl = panel = titleEl = closeBtn = null;
        host.hidden = true;
        ctx = null;
        isDrawerMode = false;
      };
    },
    update(caps, nextCtx) {
      ctx = nextCtx;
      applyRangeFromCaps(caps);
      syncUi();
    },
    onStatus(payload) {
      const parsed = parseRobotStatus(payload);
      if (!parsed.audio) return;
      min = parsed.audio.min;
      max = parsed.audio.max;
      level = parsed.audio.volume;
      syncUi();
    },
    setEnabled(enabled) {
      if (button) button.disabled = !enabled;
      if (!enabled) setPanelOpen(false);
    },
    refreshLabels() {
      syncUi();
    },
  };
}
