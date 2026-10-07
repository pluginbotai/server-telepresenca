/**
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @param {number} videoWidth
 * @param {number} videoHeight
 */
export function computeIntegerVideoLayout(
  viewportWidth,
  viewportHeight,
  videoWidth,
  videoHeight,
) {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return null;
  }

  const viewportAr = viewportWidth / viewportHeight;
  const videoAr = videoWidth / videoHeight;
  let width;
  let height;
  if (viewportAr > videoAr) {
    height = Math.max(1, Math.floor(viewportHeight));
    width = Math.max(1, Math.floor(height * videoAr));
  } else {
    width = Math.max(1, Math.floor(viewportWidth));
    height = Math.max(1, Math.floor(width / videoAr));
  }

  return {
    width,
    height,
    left: Math.floor((viewportWidth - width) / 2),
    top: Math.floor((viewportHeight - height) / 2),
  };
}

/**
 * @param {number} boxW
 * @param {number} boxH
 * @param {number} videoW
 * @param {number} videoH
 */
export function computeIntegerDrawRect(boxW, boxH, videoW, videoH) {
  const scale = Math.min(boxW / videoW, boxH / videoH);
  const w = Math.max(1, Math.floor(videoW * scale));
  const h = Math.max(1, Math.floor(videoH * scale));
  return {
    x: Math.floor((boxW - w) / 2),
    y: Math.floor((boxH - h) / 2),
    w,
    h,
  };
}
