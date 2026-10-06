import {
  getMockCapabilities,
  getMockStatus,
  shouldShowMockToggle,
} from "../features/mock-robot.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function handleMockControl(runtime, action, value) {
  if (action === "volume.set") {
    const level = typeof value === "object" && value !== null ? value.level : value;
    runtime.registry.applyStatus({ volume: { level } });
  } else if (action === "flashlight.toggle" || action === "flashlight.on") {
    runtime.mockFlashlightActive = !runtime.mockFlashlightActive;
    if (runtime.els.btnQuickFlashlight) {
      runtime.els.btnQuickFlashlight.classList.toggle(
        "active",
        runtime.mockFlashlightActive,
      );
    }
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function updateMockToggleVisibility(runtime) {
  if (!runtime.els.btnToggleMockRobot) return;
  const shouldShow = shouldShowMockToggle({
    robotPeerPresent: runtime.robotPeerPresent,
    rtcWithRobot: runtime.rtcWithRobot,
    search: window.location.search,
  });
  runtime.els.btnToggleMockRobot.hidden = !shouldShow;
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function setMockRobotActive(runtime, active, model = "cruzr") {
  runtime.isMockActive = Boolean(active);
  const { els, t } = runtime;
  if (els.btnToggleMockRobot) {
    els.btnToggleMockRobot.classList.toggle("is-active", runtime.isMockActive);
    const mockKey = runtime.isMockActive ? "media.mockDisable" : "media.mockEnable";
    els.btnToggleMockRobot.setAttribute("aria-label", t(mockKey));
  }

  if (runtime.isMockActive) {
    runtime.applyRobotCapabilities(getMockCapabilities(model), { fromMock: true });
    runtime.registry.applyStatus(getMockStatus(model));
    runtime.updateControlEnabling();
  } else {
    runtime.applyRobotCapabilities(
      runtime.connected ? runtime.liveRobotCapabilities : null,
    );
    runtime.updateControlEnabling();
  }
  runtime.robotDrawer.refreshLabels({ isMockActive: runtime.isMockActive });
  updateMockToggleVisibility(runtime);
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function attachMockHandlers(runtime) {
  runtime.handleMockControl = (action, value) =>
    handleMockControl(runtime, action, value);
  runtime.isConnected = () => runtime.connected || runtime.isMockActive;
  runtime.updateMockToggleVisibility = () => updateMockToggleVisibility(runtime);
  runtime.setMockRobotActive = (active, model) =>
    setMockRobotActive(runtime, active, model);
}
