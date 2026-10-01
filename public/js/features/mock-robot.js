const MOCK_CRUZR_CAPS = {
  robotModel: "cruzr",
  locomotion: {
    available: true,
    backwardMode: "continuous",
    speed: true,
    speedMin: 0.35,
    speedMax: 1,
    speedDefault: 1,
  },
  audio: {
    beep: true,
    volume: true,
    volumeMin: 0,
    volumeMax: 15,
    volumeLevel: 8,
  },
  head: {
    available: true,
    yaw: true,
    pitch: true,
  },
  flashlight: {
    available: true,
    modes: ["toggle"],
  },
  power: {
    available: true,
  },
};

const MOCK_TEMI_CAPS = {
  robotModel: "temi",
  locomotion: {
    available: true,
    backwardMode: "pulse",
    backwardPulseDistanceM: 0.2,
    speed: true,
    speedMin: 0.35,
    speedMax: 1,
    speedDefault: 0.75,
  },
  audio: {
    beep: true,
    volume: true,
    volumeMin: 0,
    volumeMax: 10,
    volumeLevel: 5,
  },
  head: {
    available: false,
  },
  flashlight: {
    available: false,
  },
  power: {
    available: true,
  },
};

/**
 * @param {string | null | undefined} search
 * @returns {boolean}
 */
export function isMockRequested(search) {
  if (!search) return false;
  try {
    const params = new URLSearchParams(search);
    if (params.has("mock") && params.get("mock") !== "false") return true;
    if (params.has("demo") && params.get("demo") !== "false") return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * @param {string | null | undefined} search
 * @returns {"cruzr" | "temi"}
 */
export function resolveMockType(search) {
  if (!search) return "cruzr";
  try {
    const params = new URLSearchParams(search);
    const val = (params.get("mock") || params.get("demo") || "").toLowerCase();
    if (val === "temi") return "temi";
  } catch {
    return "cruzr";
  }
  return "cruzr";
}

/**
 * @param {string} [type]
 * @returns {typeof MOCK_CRUZR_CAPS}
 */
export function getMockCapabilities(type = "cruzr") {
  return type === "temi" ? MOCK_TEMI_CAPS : MOCK_CRUZR_CAPS;
}

/**
 * @param {string} [type]
 * @returns {object}
 */
export function getMockStatus(type = "cruzr") {
  const isCruzr = type !== "temi";
  return {
    battery: {
      pct: 85,
      charging: true,
    },
    audio: {
      min: 0,
      max: isCruzr ? 15 : 10,
      volume: isCruzr ? 8 : 5,
    },
  };
}

/**
 * Resolves whether the mock toggle button should be visible.
 * The mock button only appears when no real robot is connected or present in the room.
 *
 * @param {object} [state]
 * @param {boolean} [state.connected]
 * @param {object | null} [state.liveCapabilities]
 * @returns {boolean}
 */
export function shouldShowMockToggle({ connected = false, liveCapabilities = null } = {}) {
  if (connected) return false;
  if (liveCapabilities && Object.keys(liveCapabilities).length > 0) return false;
  return true;
}

