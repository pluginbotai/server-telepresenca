/**
 * @param {object} cfg
 */
export function applyJoystickPointer(cfg) {
  const { element, stick, clientX, clientY, deadzone, state, callbacks } = cfg;
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const max = rect.width * 0.32;
  const mag = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(mag, max);
  dx = (dx / mag) * clamped;
  dy = (dy / mag) * clamped;
  stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  const dir = directionFrom(dx / max, dy / max, deadzone);
  element.classList.add("is-active");
  element.classList.toggle("dir-forward", dir === "forward");
  element.classList.toggle("dir-backward", dir === "backward");
  element.classList.toggle("dir-left", dir === "left");
  element.classList.toggle("dir-right", dir === "right");
  if (dir !== state.current) {
    state.current = dir;
    if (dir) callbacks.onDirection(dir);
    else callbacks.onEnd();
  }
}

export function directionFrom(nx, ny, deadzone) {
  const magnitude = Math.hypot(nx, ny);
  if (magnitude < deadzone) return null;
  if (Math.abs(nx) > Math.abs(ny)) {
    return nx > 0 ? "right" : "left";
  }
  return ny > 0 ? "backward" : "forward";
}

export function resetJoystickStick(element, stick) {
  stick.style.transform = "translate(-50%, -50%)";
  element.classList.remove(
    "is-active",
    "dir-forward",
    "dir-backward",
    "dir-left",
    "dir-right",
  );
}
