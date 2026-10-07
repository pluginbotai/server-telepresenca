import { bindTeleJoystickEvents } from "./joystick-bind.js";
import { applyJoystickPointer, resetJoystickStick } from "./joystick-motion.js";

export function createTeleJoystick(element, options) {
  const onDirection = options.onDirection || (() => {});
  const onEnd = options.onEnd || (() => {});
  const deadzone = options.deadzone == null ? 0.22 : options.deadzone;
  const stick = element.querySelector(".joystick-stick");
  if (!stick) {
    throw new Error("joystick requires .joystick-stick");
  }

  let pointerId = null;
  const dirState = { current: null };
  let enabled = true;

  function setEnabled(value) {
    enabled = Boolean(value);
    element.classList.toggle("is-disabled", !enabled);
    element.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (!enabled) {
      pointerId = null;
      dirState.current = null;
      resetJoystickStick(element, stick);
    }
  }

  function handle(clientX, clientY) {
    applyJoystickPointer({
      element,
      stick,
      clientX,
      clientY,
      deadzone,
      state: dirState,
      callbacks: { onDirection, onEnd },
    });
  }

  function onPointerDown(event) {
    if (!enabled) return;
    if (pointerId != null) return;
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    event.preventDefault();
    handle(event.clientX, event.clientY);
  }

  function onPointerMove(event) {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    handle(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    dirState.current = null;
    resetJoystickStick(element, stick);
    onEnd();
  }

  const unbind = bindTeleJoystickEvents(element, {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu: (event) => event.preventDefault(),
  });

  resetJoystickStick(element, stick);
  setEnabled(true);

  return { setEnabled, destroy: unbind };
}
