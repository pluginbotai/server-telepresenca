export function resolveRoomId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("room") || params.get("roomId");
    if (fromUrl?.trim()) return fromUrl.trim();
  } catch (_) {
    /* ignore */
  }
  return "telepresenca";
}
