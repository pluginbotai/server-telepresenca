export const COMPACT_MAX_WIDTH_PX = 520;
export const COMPACT_MEDIA_QUERY = `(max-width: ${COMPACT_MAX_WIDTH_PX}px)`;

export function isCompactViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}

/**
 * @param {() => void} listener
 */
export function onCompactViewportChange(listener) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(COMPACT_MEDIA_QUERY);
  const handler = () => listener();
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}
