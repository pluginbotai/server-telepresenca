import {
  isFlashlightAvailable,
  isHeadAvailable,
  isLocomotionSpeedAvailable,
  isVolumeAvailable,
} from "../protocol/capabilities.js";

/**
 * Checks if the robot advertises capabilities that belong to the robot drawer.
 * @param {object | null | undefined} caps
 * @returns {boolean}
 */
export function isRobotDrawerAvailable(caps) {
  if (!caps) return false;
  return (
    isLocomotionSpeedAvailable(caps) ||
    isVolumeAvailable(caps) ||
    isFlashlightAvailable(caps) ||
    isHeadAvailable(caps)
  );
}

function updateDrawerLabels({
  drawerEl,
  toggleBtn,
  closeBtn,
  quickDockEl,
  btnQuickVolume,
  btnQuickHeadReset,
  btnQuickFlashlight,
  btnMockToggle,
  isMockActive = false,
  open,
  t,
}) {
  const labelKey = open ? "media.robotControlsClose" : "media.robotControlsOpen";
  const label = t(labelKey);
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-label", label);
    const arrowEl = toggleBtn.querySelector?.(".panel-icon-arrow");
    if (arrowEl) {
      arrowEl.setAttribute("d", open ? "m8 9 3 3-3 3" : "m10 15-3-3 3-3");
    }
  }
  if (closeBtn) {
    closeBtn.setAttribute("aria-label", t("media.robotControlsClose"));
    closeBtn.title = t("media.robotControlsClose");
  }
  if (drawerEl) {
    drawerEl.setAttribute("aria-label", t("media.robotControls"));
  }
  if (quickDockEl) {
    quickDockEl.setAttribute("aria-label", t("media.quickDock"));
  }
  if (btnQuickVolume) {
    btnQuickVolume.setAttribute("aria-label", t("volume.panel"));
  }
  if (btnQuickHeadReset) {
    btnQuickHeadReset.setAttribute("aria-label", t("media.headReset"));
  }
  if (btnQuickFlashlight) {
    btnQuickFlashlight.setAttribute("aria-label", t("media.flashlight"));
  }
  if (btnMockToggle) {
    const mockLabel = t(isMockActive ? "media.mockDisable" : "media.mockEnable");
    btnMockToggle.setAttribute("aria-label", mockLabel);
    btnMockToggle.title = mockLabel;
  }
}

/**
 * @param {object} options
 * @param {HTMLElement} options.drawerEl
 * @param {HTMLButtonElement} options.toggleBtn
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLElement} [options.backdropEl]
 * @param {HTMLElement} [options.quickDockEl]
 * @param {HTMLButtonElement} [options.btnQuickVolume]
 * @param {HTMLButtonElement} [options.btnQuickHeadReset]
 * @param {HTMLButtonElement} [options.btnQuickFlashlight]
 * @param {HTMLButtonElement} [options.btnMockToggle]
 * @param {() => boolean} [options.getIsMockActive]
 * @param {(key: string, vars?: object) => string} options.t
 * @param {(isOpen: boolean) => void} [options.onToggle]
 */
export function createRobotDrawer({
  drawerEl,
  toggleBtn,
  closeBtn,
  backdropEl,
  quickDockEl,
  btnQuickVolume,
  btnQuickHeadReset,
  btnQuickFlashlight,
  btnMockToggle,
  getIsMockActive,
  t,
  onToggle,
}) {
  let open = false;
  let enabled = true;

  const resolveMockActive = () => {
    try {
      return Boolean(typeof getIsMockActive === "function" ? getIsMockActive() : false);
    } catch (_) {
      return false;
    }
  };

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    drawerEl?.classList.toggle("is-open", open);
    drawerEl?.setAttribute("aria-hidden", open ? "false" : "true");
    toggleBtn?.setAttribute("aria-expanded", open ? "true" : "false");
    backdropEl?.classList.toggle("is-active", open);
    updateDrawerLabels({
      drawerEl,
      toggleBtn,
      closeBtn,
      quickDockEl,
      btnQuickVolume,
      btnQuickHeadReset,
      btnQuickFlashlight,
      btnMockToggle,
      isMockActive: resolveMockActive(),
      open,
      t,
    });
    if (typeof onToggle === "function") onToggle(open);
  }

  const onToggleClick = (e) => {
    e?.preventDefault?.();
    if (enabled) setOpen(!open);
  };
  const onCloseClick = (e) => {
    e?.preventDefault?.();
    setOpen(false);
  };
  const onKeyDown = (e) => {
    if (e?.key === "Escape" && open) {
      e.preventDefault?.();
      setOpen(false);
    }
  };

  toggleBtn?.addEventListener("click", onToggleClick);
  closeBtn?.addEventListener("click", onCloseClick);
  backdropEl?.addEventListener("click", onCloseClick);
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", onKeyDown);
  }

  setOpen(false);

  return {
    open: () => enabled && setOpen(true),
    close: () => setOpen(false),
    toggle: () => enabled && setOpen(!open),
    isOpen: () => open,
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (toggleBtn) toggleBtn.disabled = !enabled;
      if (btnQuickVolume) btnQuickVolume.disabled = !enabled;
      if (!enabled && open) setOpen(false);
    },
    refreshLabels: (opts = {}) =>
      updateDrawerLabels({
        drawerEl,
        toggleBtn,
        closeBtn,
        quickDockEl,
        btnQuickVolume,
        btnQuickHeadReset,
        btnQuickFlashlight,
        btnMockToggle,
        isMockActive:
          typeof opts.isMockActive === "boolean"
            ? opts.isMockActive
            : resolveMockActive(),
        open,
        t,
      }),
    destroy() {
      toggleBtn?.removeEventListener("click", onToggleClick);
      closeBtn?.removeEventListener("click", onCloseClick);
      backdropEl?.removeEventListener("click", onCloseClick);
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", onKeyDown);
      }
    },
  };
}
