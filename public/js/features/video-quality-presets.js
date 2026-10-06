const STORAGE_KEY = "telepresenca.videoQuality.v2";

export const DEFAULT_PRESETS = [
  {
    id: "auto",
    labelKey: "video.preset.auto",
    width: 0,
    height: 0,
    fps: 0,
    maxBitrateKbps: 0,
    adaptive: true,
  },
  {
    id: "low",
    labelKey: "video.preset.low",
    width: 640,
    height: 480,
    fps: 15,
    maxBitrateKbps: 800,
    adaptive: false,
  },
  {
    id: "mid",
    labelKey: "video.preset.mid",
    width: 1280,
    height: 720,
    fps: 15,
    maxBitrateKbps: 1500,
    adaptive: false,
  },
  {
    id: "high",
    labelKey: "video.preset.high",
    width: 1280,
    height: 720,
    fps: 30,
    maxBitrateKbps: 2500,
    adaptive: false,
  },
  {
    id: "max",
    labelKey: "video.preset.max",
    width: 1920,
    height: 1080,
    fps: 30,
    maxBitrateKbps: 4500,
    adaptive: false,
  },
];

export function clonePreset(preset) {
  return { ...preset };
}

function normalizePreset(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  if (!id) return null;
  return {
    id,
    labelKey: raw.labelKey || `video.preset.${id}`,
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    fps: Number(raw.fps) || 0,
    maxBitrateKbps: Number(raw.maxBitrateKbps) || 0,
    adaptive: Boolean(raw.adaptive),
  };
}

export function resolveVideoCapabilities(robotCapabilities) {
  const video = robotCapabilities?.video;
  const robotPresets = Array.isArray(video?.presets)
    ? video.presets.map(normalizePreset).filter(Boolean)
    : [];

  const presets =
    robotPresets.length > 0 ? robotPresets : DEFAULT_PRESETS.map(clonePreset);

  const defaultPreset =
    typeof video?.defaultPreset === "string" && video.defaultPreset
      ? video.defaultPreset
      : "high";

  const hasPreset = presets.some((item) => item.id === defaultPreset);
  return {
    presets,
    defaultPreset: hasPreset ? defaultPreset : presets[0]?.id || "high",
    hardwareEncoder: Boolean(video?.hardwareEncoder),
    adaptiveSupported: video?.adaptiveSupported !== false,
  };
}

export function loadSavedPresetId(fallbackId) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && typeof saved === "string") return saved;
  } catch (_) {
    /* ignore */
  }
  return fallbackId || "high";
}

export function savePresetId(presetId) {
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
  } catch (_) {
    /* ignore */
  }
}
