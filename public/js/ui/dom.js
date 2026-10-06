export function queryDom() {
  return {
    btnHangup: document.getElementById("btnHangup"),
    btnRejoin: document.getElementById("btnRejoin"),
    btnToggleMic: document.getElementById("btnToggleMic"),
    btnToggleCam: document.getElementById("btnToggleCam"),
    btnToggleScreenShare: document.getElementById("btnToggleScreenShare"),
    btnVideoQuality: document.getElementById("btnVideoQuality"),
    btnCloseQuality: document.getElementById("btnCloseQuality"),
    qualityPanel: document.getElementById("qualityPanel"),
    qualitySlider: document.getElementById("qualitySlider"),
    qualityThumb: document.getElementById("qualityThumb"),
    qualityTrackFill: document.getElementById("qualityTrackFill"),
    qualityTicks: document.getElementById("qualityTicks"),
    qualityValueLabel: document.getElementById("qualityValueLabel"),
    qualityBadge: document.getElementById("qualityBadge"),
    btnSendCommand: document.getElementById("btnSendCommand"),
    remoteVideo: document.getElementById("remoteVideo"),
    remoteVideoHost: document.getElementById("remoteVideoHost"),
    remoteVideoCanvas: document.getElementById("remoteVideoCanvas"),
    localPreview: document.getElementById("localPreview"),
    localPreviewVideo: document.getElementById("localPreviewVideo"),
    btnLocalPreviewClose: document.getElementById("btnLocalPreviewClose"),
    remotePlaceholder: document.getElementById("remotePlaceholder"),
    placeholderText: document.querySelector("#remotePlaceholder p"),
    statusChip: document.getElementById("statusChip"),
    obstacleAlert: document.getElementById("obstacleAlert"),
    sessionCountdown: document.getElementById("sessionCountdown"),
    movementHint: document.getElementById("movementHint"),
    joystick: document.getElementById("joystick"),
    kbdHint: document.getElementById("kbdHint"),
    roomLabel: document.getElementById("roomLabel"),
    endedOverlay: document.getElementById("endedOverlay"),
    redirectCountdown: document.getElementById("redirectCountdown"),
    inviteOverlay: document.getElementById("inviteOverlay"),
    inviteOverlayText: document.getElementById("inviteOverlayText"),
    inviteLogo: document.getElementById("inviteLogo"),
    inviteWindow: document.getElementById("inviteWindow"),
    inviteEnter: document.getElementById("inviteEnter"),
    identifyForm: document.getElementById("identifyForm"),
    identifyDescription: document.getElementById("identifyDescription"),
    identifyInput: document.getElementById("identifyInput"),
    identifyError: document.getElementById("identifyError"),
    langToggle: document.getElementById("langToggle"),
    langMenu: document.getElementById("langMenu"),
    langCurrentFlag: document.getElementById("langCurrentFlag"),
    featureHost: document.getElementById("featureHost"),
    locomotionHost: document.getElementById("locomotionHost"),
    headLookLayer: document.getElementById("headLookLayer"),
    powerHost: document.getElementById("powerHost"),
    volumeHost: document.getElementById("volumeHost"),
    callBar: document.getElementById("callBar"),
    callBarExtra: document.getElementById("callBarExtra"),
    btnCallOverflow: document.getElementById("btnCallOverflow"),
    callOverflowDrawer: document.getElementById("callOverflowDrawer"),
    callOverflowBackdrop: document.getElementById("callOverflowBackdrop"),
    callOverflowList: document.getElementById("callOverflowList"),
    hudTooltip: document.getElementById("hudTooltip"),
    btnToggleRobotDrawer: document.getElementById("btnToggleRobotDrawer"),
    btnCloseRobotDrawer: document.getElementById("btnCloseRobotDrawer"),
    robotDrawer: document.getElementById("robotDrawer"),
    robotDrawerBackdrop: document.getElementById("robotDrawerBackdrop"),
    robotDrawerBody: document.getElementById("robotDrawerBody"),
    drawerFlashlightHost: document.getElementById("drawerFlashlightHost"),
    drawerLocomotionSpeedHost: document.getElementById("drawerLocomotionSpeedHost"),
    drawerHeadHost: document.getElementById("drawerHeadHost"),
    robotQuickDock: document.getElementById("robotQuickDock"),
    btnQuickVolume: document.getElementById("btnQuickVolume"),
    btnQuickHeadReset: document.getElementById("btnQuickHeadReset"),
    btnQuickFlashlight: document.getElementById("btnQuickFlashlight"),
    btnQuickEmotions: document.getElementById("btnQuickEmotions"),
    drawerExpressionsHost: document.getElementById("drawerExpressionsHost"),
    btnToggleMockRobot: document.getElementById("btnToggleMockRobot"),
  };
}

/**
 * @param {string} id
 * @param {ReturnType<typeof queryDom>} els
 */
export function hostById(id, els) {
  if (id === "call") return els.featureHost;
  if (id === "quality") return els.qualityPanel;
  if (id === "locomotion") return els.locomotionHost;
  if (id === "head" || id === "head-look") return els.headLookLayer;
  if (id === "power") return els.powerHost;
  if (id === "volume") return els.volumeHost;
  if (id === "locomotion-speed") {
    return els.drawerLocomotionSpeedHost;
  }
  if (id === "flashlight") return els.drawerFlashlightHost || els.featureHost;
  if (id === "head-drawer") return els.drawerHeadHost;
  if (id === "expressions") {
    return (
      els.drawerExpressionsHost || document.querySelector('[data-host="expressions"]')
    );
  }
  return document.querySelector(`[data-host="${id}"]`);
}
