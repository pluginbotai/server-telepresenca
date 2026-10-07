const SPEED_STORAGE_KEY = "telepresenca.locomotion.speedFactor";

export function readStoredSpeedFactor(fallback) {
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    if (raw == null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

export function persistSpeedFactor(factor) {
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, String(factor));
  } catch (_) {
    /* ignore */
  }
}
