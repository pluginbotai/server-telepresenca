/**
 * @param {object} cfg
 */
export function attachDrawerInteraction(cfg) {
  const onToggleClick = (e) => {
    e?.preventDefault?.();
    if (cfg.getEnabled()) cfg.setOpen(!cfg.getOpen());
  };
  const onCloseClick = (e) => {
    e?.preventDefault?.();
    cfg.setOpen(false);
  };
  const onKeyDown = (e) => {
    if (e?.key === "Escape" && cfg.getOpen()) {
      e.preventDefault?.();
      cfg.setOpen(false);
    }
  };

  cfg.toggleBtn?.addEventListener("click", onToggleClick);
  cfg.closeBtn?.addEventListener("click", onCloseClick);
  cfg.backdropEl?.addEventListener("click", onCloseClick);
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", onKeyDown);
  }

  return () => {
    cfg.toggleBtn?.removeEventListener("click", onToggleClick);
    cfg.closeBtn?.removeEventListener("click", onCloseClick);
    cfg.backdropEl?.removeEventListener("click", onCloseClick);
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", onKeyDown);
    }
  };
}
