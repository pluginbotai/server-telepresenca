/** @param {object} state */
export function refreshVideoQualityPanelLabels(state) {
  const preset = state.presetByIndex(state.selectedIndex);
  if (state.valueLabel) state.valueLabel.textContent = state.t(preset.labelKey);
  if (!state.ticks) return;
  state.ticks.querySelectorAll("[data-index]").forEach((node) => {
    const idx = Number(node.getAttribute("data-index"));
    node.classList.toggle("is-active", idx === state.selectedIndex);
    const tickPreset = state.presetByIndex(idx);
    node.setAttribute("aria-selected", idx === state.selectedIndex ? "true" : "false");
    const label = node.querySelector(".quality-tick-label");
    if (label) {
      label.textContent = state.t(tickPreset.labelKey);
      label.dataset.i18n = tickPreset.labelKey;
    }
  });
  if (state.thumb && state.slider) {
    const ratio =
      state.presets.length <= 1 ? 0 : state.selectedIndex / (state.presets.length - 1);
    state.thumb.style.left = `${ratio * 100}%`;
  }
  if (state.slider) {
    state.slider.setAttribute(
      "aria-valuetext",
      state.t("video.currentQuality", { quality: state.t(preset.labelKey) }),
    );
    state.slider.setAttribute("aria-valuenow", String(state.selectedIndex));
    state.slider.setAttribute(
      "aria-valuemax",
      String(Math.max(state.presets.length - 1, 0)),
    );
  }
}

/** @param {object} state */
export function renderVideoQualityTicks(state) {
  if (!state.ticks) return;
  state.ticks.innerHTML = "";
  state.presets.forEach((preset, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quality-tick";
    button.dataset.index = String(index);
    button.setAttribute("role", "option");
    button.setAttribute(
      "aria-selected",
      index === state.selectedIndex ? "true" : "false",
    );
    button.innerHTML = `<span class="quality-tick-mark" aria-hidden="true"></span><span class="quality-tick-label" data-i18n="${preset.labelKey}"></span>`;
    button.addEventListener("click", () => state.selectIndex(index, { commit: true }));
    state.ticks.appendChild(button);
  });
  refreshVideoQualityPanelLabels(state);
}
