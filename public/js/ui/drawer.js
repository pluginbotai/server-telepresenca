import {
  isFlashlightAvailable,
  isHeadAvailable,
  isLocomotionSpeedAvailable,
  isVolumeAvailable,
  isEmotionsAvailable,
} from "../protocol/capabilities.js";
import { createRobotDrawerController } from "./drawer-controller.js";

export function isRobotDrawerAvailable(caps) {
  if (!caps) return false;
  return (
    isLocomotionSpeedAvailable(caps) ||
    isVolumeAvailable(caps) ||
    isFlashlightAvailable(caps) ||
    isHeadAvailable(caps) ||
    isEmotionsAvailable(caps)
  );
}

export function createRobotDrawer(options) {
  const labelTargets = {
    drawerEl: options.drawerEl,
    toggleBtn: options.toggleBtn,
    closeBtn: options.closeBtn,
    quickDockEl: options.quickDockEl,
    btnQuickVolume: options.btnQuickVolume,
    btnQuickHeadReset: options.btnQuickHeadReset,
    btnQuickFlashlight: options.btnQuickFlashlight,
    btnQuickEmotions: options.btnQuickEmotions,
    btnMockToggle: options.btnMockToggle,
    t: options.t,
  };
  return createRobotDrawerController({ ...options, labelTargets });
}
