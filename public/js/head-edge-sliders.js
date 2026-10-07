/**
 * Edge-mounted head sliders (yaw top, pitch left). Native range for a11y + custom chrome.
 */

import { initHeadEdgeSliderDom } from "./head-edge-sliders-init.js";
import { createHeadEdgeSlidersApi } from "./head-edge-sliders-api.js";

export {
  pitchNormFromTrackY,
  pitchVisualPctFromNorm,
  yawNormFromTrackX,
} from "./head-edge-math.js";

export function createHeadEdgeSliders(layer, options) {
  const s = {
    layer,
    rails: {},
    releasePointerDrags: [],
    axes: { yaw: true, pitch: true },
    enabled: true,
    idleTimer: null,
    pointerDragging: false,
  };

  initHeadEdgeSliderDom(s, options);
  return createHeadEdgeSlidersApi(s);
}
