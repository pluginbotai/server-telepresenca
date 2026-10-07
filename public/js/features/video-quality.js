import { createVideoQualityPanel } from "./video-quality-panel.js";
import { mountVideoQualityUi } from "./video-quality-mount.js";
import {
  DEFAULT_PRESETS,
  loadSavedPresetId,
  resolveVideoCapabilities,
} from "./video-quality-presets.js";

export {
  DEFAULT_PRESETS,
  loadSavedPresetId,
  resolveVideoCapabilities,
  savePresetId,
} from "./video-quality-presets.js";

const QUALITY_BADGE = { auto: "A", low: "L", mid: "M", high: "H", max: "X" };

/** @param {object} els @param {object | null} panel @param {object} caps @param {object} preset */
function syncQualityChrome(els, panel, caps, preset) {
  if (els.qualityBadge && preset) {
    els.qualityBadge.textContent =
      QUALITY_BADGE[preset.id] || preset.id.slice(0, 1).toUpperCase();
  }
  if (!els.qualityTrackFill || !panel) return;
  const presets = caps?.presets || DEFAULT_PRESETS;
  const index = presets.findIndex((item) => item.id === preset.id);
  const ratio = presets.length <= 1 ? 0 : Math.max(0, index) / (presets.length - 1);
  els.qualityTrackFill.style.width = `${ratio * 100}%`;
}

/**
 * @param {object} els
 * @param {(key: string, vars?: object) => string} t
 */
export function createVideoQualityFeature(els, t) {
  const panelRef = { current: null };
  let videoCapabilities = resolveVideoCapabilities(null);
  /** @type {((preset: object) => Promise<void>) | null} */
  let onChange = null;

  function setPanelOpen(open) {
    if (!panelRef.current || !els.btnVideoQuality) return;
    panelRef.current.setPanelOpen(open);
    els.btnVideoQuality.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function applyPresetsToPanel() {
    if (!panelRef.current) return null;
    const preset = panelRef.current.setPresets(
      videoCapabilities.presets,
      loadSavedPresetId(videoCapabilities.defaultPreset),
    );
    syncQualityChrome(els, panelRef.current, videoCapabilities, preset);
    return preset;
  }

  return {
    id: "video-quality",
    optIn: false,
    isAvailable: () => true,
    /** @param {import("./registry.js").FeatureContext} ctx */
    mount(ctx) {
      onChange = ctx.onQualityPresetChange || null;
      panelRef.current = createVideoQualityPanel({
        root: els.qualityPanel,
        slider: els.qualitySlider,
        thumb: els.qualityThumb,
        ticks: els.qualityTicks,
        valueLabel: els.qualityValueLabel,
        closeButton: els.btnCloseQuality,
        t,
        onPresetChange(preset) {
          if (typeof onChange === "function") {
            onChange(preset).catch((err) => console.error(err));
          }
        },
      });
      applyPresetsToPanel();
      return mountVideoQualityUi({ els, ctx, panelRef, setPanelOpen });
    },
    update(caps) {
      videoCapabilities = resolveVideoCapabilities(caps);
      applyPresetsToPanel();
    },
    getPanel: () => panelRef.current,
    setPanelOpen,
    refreshLabels() {
      panelRef.current?.refreshLabels();
      if (els.btnVideoQuality) {
        els.btnVideoQuality.setAttribute("aria-label", t("video.openPanel"));
      }
      if (els.btnCloseQuality) {
        els.btnCloseQuality.setAttribute("aria-label", t("dialog.close"));
      }
    },
    applyCapabilities(caps) {
      this.update(caps);
    },
  };
}
