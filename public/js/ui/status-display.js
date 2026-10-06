/** @type {Record<string, string>} */
export const STATUS_DISPLAY_SHORT = {
  "status.live": "status.liveShort",
  "status.connected": "status.connectedShort",
  "status.waitingRobot": "status.waitingRobotShort",
};

/**
 * @param {string} key
 * @param {boolean} compact
 */
export function resolveStatusDisplayKey(key, compact) {
  if (!compact || !key) return key;
  return STATUS_DISPLAY_SHORT[key] || key;
}
