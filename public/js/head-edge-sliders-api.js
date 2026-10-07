/** @param {object} s shared slider state */
export function createHeadEdgeSlidersApi(s) {
  return {
    setAxes(next) {
      s.axes = { yaw: next?.yaw !== false, pitch: next?.pitch !== false };
      s.applyAxisVisibility();
    },
    setPose(pose) {
      if (s.axes.yaw) {
        s.rails.yaw.input.value = String(Math.round(s.clampUnit(pose?.yaw) * 100));
        s.syncVisual("yaw");
      }
      if (s.axes.pitch) {
        s.rails.pitch.input.value = String(Math.round(s.clampUnit(pose?.pitch) * 100));
        s.syncVisual("pitch");
      }
    },
    setEnabled(value) {
      s.enabled = Boolean(value);
      for (const axis of Object.keys(s.rails)) {
        s.rails[axis].input.disabled = !s.enabled;
      }
      s.layer.classList.toggle("head-edge--disabled", !s.enabled);
      if (!s.enabled) {
        s.pointerDragging = false;
        s.layer.classList.remove("head-edge--interacting", "head-edge--revealed");
        if (s.idleTimer) clearTimeout(s.idleTimer);
        s.idleTimer = null;
      }
    },
    refreshLabels() {
      s.rails.yaw.input.setAttribute("aria-label", s.axisLabel("yaw"));
      s.rails.pitch.input.setAttribute("aria-label", s.axisLabel("pitch"));
    },
    isInteracting() {
      return s.pointerDragging;
    },
    setAtLimit(atLimit) {
      if (!atLimit) return;
      if (s.axes.yaw) {
        s.rails.yaw.rail.classList.toggle("head-edge--at-min", Boolean(atLimit.yawMin));
        s.rails.yaw.rail.classList.toggle("head-edge--at-max", Boolean(atLimit.yawMax));
      }
      if (s.axes.pitch) {
        s.rails.pitch.rail.classList.toggle(
          "head-edge--at-min",
          Boolean(atLimit.pitchMin),
        );
        s.rails.pitch.rail.classList.toggle(
          "head-edge--at-max",
          Boolean(atLimit.pitchMax),
        );
      }
    },
    reveal: () => s.reveal(),
    destroy() {
      for (const release of s.releasePointerDrags) release();
      s.releasePointerDrags.length = 0;
      s.pointerDragging = false;
      s.layer.removeEventListener("pointermove", s.onLayerMove);
      if (s.idleTimer) clearTimeout(s.idleTimer);
      s.rails.yaw.rail.remove();
      s.rails.pitch.rail.remove();
      s.layer.classList.remove(
        "head-edge--revealed",
        "head-edge--interacting",
        "head-edge--disabled",
        "head-edge--yaw-only",
        "head-edge--pitch-only",
        "head-edge--dual",
      );
    },
  };
}
