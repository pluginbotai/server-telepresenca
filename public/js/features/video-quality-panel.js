import {
  DEFAULT_PRESETS,
  clonePreset,
  loadSavedPresetId,
} from "./video-quality-presets.js";
import {
  refreshVideoQualityPanelLabels,
  renderVideoQualityTicks,
} from "./video-quality-panel-ui.js";
import { bindVideoQualitySlider } from "./video-quality-slider.js";

/** @param {object} options */
export function createVideoQualityPanel(options) {
  const { root, slider, thumb, ticks, valueLabel, closeButton, t, onPresetChange } =
    options;

  const state = {
    root,
    slider,
    thumb,
    ticks,
    valueLabel,
    t,
    presets: DEFAULT_PRESETS.map(clonePreset),
    selectedIndex: 0,
    dragging: false,
    panelOpen: false,
    commitIndex: 0,
    presetByIndex: null,
    selectIndex: null,
    pointerToIndex: null,
  };

  state.presetByIndex = (index) =>
    state.presets[Math.max(0, Math.min(state.presets.length - 1, index))];

  function indexOfPresetId(presetId) {
    const idx = state.presets.findIndex((item) => item.id === presetId);
    return idx >= 0 ? idx : 0;
  }

  state.selectIndex = (index, { commit = false } = {}) => {
    state.selectedIndex = Math.max(0, Math.min(state.presets.length - 1, index));
    refreshVideoQualityPanelLabels(state);
    const preset = state.presetByIndex(state.selectedIndex);
    if (commit && state.commitIndex !== state.selectedIndex) {
      state.commitIndex = state.selectedIndex;
      if (typeof onPresetChange === "function")
        onPresetChange(preset, state.selectedIndex);
    }
    return preset;
  };

  state.pointerToIndex = (clientX) => {
    if (!state.slider) return state.selectedIndex;
    const rect = state.slider.getBoundingClientRect();
    if (rect.width <= 0) return state.selectedIndex;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (state.presets.length - 1));
  };

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      state.panelOpen = false;
      if (state.root) state.root.classList.add("hidden");
    });
  }

  bindVideoQualitySlider(state);
  renderVideoQualityTicks(state);

  return {
    setPresets(nextPresets, defaultPresetId) {
      state.presets =
        Array.isArray(nextPresets) && nextPresets.length > 0
          ? nextPresets.map(clonePreset)
          : DEFAULT_PRESETS.map(clonePreset);
      state.selectedIndex = indexOfPresetId(
        loadSavedPresetId(defaultPresetId || "high"),
      );
      state.commitIndex = state.selectedIndex;
      renderVideoQualityTicks(state);
      return state.presetByIndex(state.selectedIndex);
    },
    getSelectedPreset: () => state.presetByIndex(state.selectedIndex),
    setPanelOpen(open) {
      state.panelOpen = Boolean(open);
      if (state.root) state.root.classList.toggle("hidden", !state.panelOpen);
    },
    isPanelOpen: () => state.panelOpen,
    refreshLabels: () => refreshVideoQualityPanelLabels(state),
  };
}
