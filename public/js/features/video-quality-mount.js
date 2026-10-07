import { bindPopoverDismiss } from "../ui/popover.js";

/** @param {object} params */
export function mountVideoQualityUi(params) {
  const { els, ctx, panelRef, setPanelOpen } = params;

  const onQualityClick = (event) => {
    event.stopPropagation();
    if (!ctx.isConnected()) return;
    setPanelOpen(!panelRef.current?.isPanelOpen());
  };
  if (els.btnVideoQuality) {
    els.btnVideoQuality.addEventListener("click", onQualityClick);
  }
  const host = els.btnVideoQuality?.closest(".popover-host") || els.qualityPanel;
  const unbindDismiss = host
    ? bindPopoverDismiss(host, {
        isOpen: () => Boolean(panelRef.current?.isPanelOpen()),
        setOpen: setPanelOpen,
      })
    : () => {};

  return () => {
    if (els.btnVideoQuality) {
      els.btnVideoQuality.removeEventListener("click", onQualityClick);
    }
    unbindDismiss();
    setPanelOpen(false);
    panelRef.current = null;
  };
}
