/** @param {object} panelState */
export function bindVideoQualitySlider(panelState) {
  const { slider, thumb, selectIndex, pointerToIndex } = panelState;

  if (!slider || !thumb) return;

  slider.addEventListener("pointerdown", (event) => {
    panelState.dragging = true;
    slider.setPointerCapture(event.pointerId);
    selectIndex(pointerToIndex(event.clientX), { commit: false });
  });
  slider.addEventListener("pointermove", (event) => {
    if (!panelState.dragging) return;
    selectIndex(pointerToIndex(event.clientX), { commit: false });
  });
  const finishDrag = (event) => {
    if (!panelState.dragging) return;
    panelState.dragging = false;
    try {
      slider.releasePointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
    selectIndex(pointerToIndex(event.clientX), { commit: true });
  };
  slider.addEventListener("pointerup", finishDrag);
  slider.addEventListener("pointercancel", finishDrag);
  slider.addEventListener("keydown", (event) => {
    const idx = panelState.selectedIndex;
    const last = panelState.presets.length - 1;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      selectIndex(idx + 1, { commit: true });
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      selectIndex(idx - 1, { commit: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      selectIndex(0, { commit: true });
    } else if (event.key === "End") {
      event.preventDefault();
      selectIndex(last, { commit: true });
    }
  });
}
