import { updateDrawerLabels } from "./drawer-labels.js";
import { attachDrawerInteraction } from "./drawer-interaction.js";

/**
 * @param {object} options
 */
export function createRobotDrawerController(options) {
  const {
    drawerEl,
    toggleBtn,
    closeBtn,
    backdropEl,
    btnQuickVolume,
    getIsMockActive,
    onToggle,
    labelTargets,
  } = options;

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
      ...labelTargets,
      isMockActive: resolveMockActive(),
      open,
    });
    if (typeof onToggle === "function") onToggle(open);
  }

  const detach = attachDrawerInteraction({
    toggleBtn,
    closeBtn,
    backdropEl,
    getOpen: () => open,
    getEnabled: () => enabled,
    setOpen,
  });

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
        ...labelTargets,
        isMockActive:
          typeof opts.isMockActive === "boolean"
            ? opts.isMockActive
            : resolveMockActive(),
        open,
      }),
    destroy: detach,
  };
}
