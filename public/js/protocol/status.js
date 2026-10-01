/**
 * Robot → operator telemetry (battery + volume).
 *
 * @param {any} payload
 */
export function parseRobotStatus(payload) {
  if (!payload || typeof payload !== "object") {
    return { power: null, audio: null, head: null };
  }
  return {
    power: parsePower(payload.power),
    audio: parseAudio(payload.audio),
    head: parseHead(payload.head),
  };
}

/**
 * @param {any} raw
 */
function parseHead(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {
    yaw: null,
    pitch: null,
    source: null,
    atLimit: null,
  };
  if (typeof raw.yaw === "number" && Number.isFinite(raw.yaw)) {
    out.yaw = clampUnit(raw.yaw);
  }
  if (typeof raw.pitch === "number" && Number.isFinite(raw.pitch)) {
    out.pitch = clampUnit(raw.pitch);
  }
  if (raw.source === "measured" || raw.source === "commanded") {
    out.source = raw.source;
  }
  const atLimit = parseHeadAtLimit(raw.atLimit);
  if (atLimit) out.atLimit = atLimit;
  if (out.yaw == null && out.pitch == null) return null;
  return out;
}

/**
 * @param {any} raw
 */
function parseHeadAtLimit(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const key of [
    "yawMin",
    "yawMax",
    "pitchMin",
    "pitchMax",
  ]) {
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  }
  return Object.keys(out).length ? out : null;
}

function clampUnit(value) {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

/**
 * @param {any} raw
 */
function parsePower(raw) {
  if (!raw || typeof raw !== "object") return null;
  const level = Number(raw.level);
  if (!Number.isFinite(level)) return null;
  return {
    level: clampInt(level, 0, 100),
    charging: Boolean(raw.charging),
  };
}

/**
 * @param {any} raw
 */
function parseAudio(raw) {
  if (!raw || typeof raw !== "object") return null;
  const volume = Number(raw.volume);
  if (!Number.isFinite(volume)) return null;
  const min = Number.isFinite(Number(raw.min)) ? Math.round(Number(raw.min)) : 0;
  let max = Number.isFinite(Number(raw.max)) ? Math.round(Number(raw.max)) : 10;
  if (max <= min) max = min + 1;
  return {
    volume: clampInt(volume, min, max),
    min,
    max,
  };
}

/**
 * @param {any} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
export function parseVolumeLevel(value, min, max, fallback) {
  let level = fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    level = value;
  } else if (value && typeof value === "object") {
    if (typeof value.level === "number") level = value.level;
    else if (typeof value.volume === "number") level = value.volume;
  }
  return clampInt(level, min, max);
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
