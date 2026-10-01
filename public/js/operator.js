import { beepFeature } from "./features/beep.js";
import { flashlightFeature } from "./features/flashlight.js";
import { createHeadFeature } from "./features/head.js";
import { createLocomotionFeature } from "./features/locomotion.js";
import { createLocomotionSpeedFeature } from "./features/locomotion-speed.js";
import { createPowerFeature } from "./features/power.js";
import { createFeatureRegistry } from "./features/registry.js";
import { createVideoQualityFeature, savePresetId } from "./features/video-quality.js";
import { createVolumeFeature } from "./features/volume.js";
import { createMediaController } from "./media/local.js";
import { createLocalPreviewController } from "./media/local-preview.js";
import { normalizeCapabilities } from "./protocol/capabilities.js";
import {
  EVENT_JOINED,
  EVENT_PEER_JOINED,
  EVENT_PEER_LEFT,
  EVENT_REPLACED,
  EVENT_ROOM_STATE,
  EVENT_SESSION_EXPIRED,
  EVENT_SIGNAL,
  EVENT_STATUS,
} from "./protocol/events.js";
import { createSignalingClient } from "./signaling/client.js";
import { hostById } from "./ui/dom.js";
import { createSessionCountdown } from "./invite/countdown.js";
import {
  endedOverlayState,
  isTransientDisconnect,
  monitorInviteRejoinExpiry,
  paintCallEnded,
  RECONNECT_GRACE_MS,
} from "./invite/reconnect.js";
import {
  canReturnToPlatform,
  returnToPreviousOrUrl,
  startRedirectCountdown,
} from "./invite/redirect.js";
import { bindLangSwitch } from "./ui/lang-switch.js";
import { createRobotDrawer } from "./ui/drawer.js";
import {
  getMockCapabilities,
  getMockStatus,
  isMockRequested,
  resolveMockType,
  shouldShowMockToggle,
} from "./features/mock-robot.js";
import { createStatus } from "./ui/status.js";
import { initTooltips } from "./ui/tooltip.js";
import { fetchIceServers } from "./webrtc/ice.js";
import { liveStatusKey, liveStatusMode } from "./webrtc/ice-path.js";
import { createPeerController } from "./webrtc/peer.js";
import { applyOutgoingVideoQuality } from "./webrtc/quality.js";

function resolveRoomId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("room") || params.get("roomId");
    if (fromUrl?.trim()) return fromUrl.trim();
  } catch (_) {
    /* ignore */
  }
  return "telepresenca";
}

/**
 * @param {object} options
 * @param {ReturnType<import("./ui/dom.js").queryDom>} options.els
 * @param {import("./i18n/index.js").i18n} options.i18n
 * @param {typeof io} options.ioClient
 */
export function createOperator({
  els,
  i18n,
  ioClient,
  roomId: roomIdOption,
  expiresAt = null,
  beforeConnect = null,
}) {
  const t = (key, vars) => i18n.t(key, vars);
  const status = createStatus(els, t);
  const lang = bindLangSwitch(els, i18n);
  const signaling = createSignalingClient(ioClient);
  let isMockActive = false;
  let liveRobotCapabilities = null;
  let mockFlashlightActive = false;

  const robotDrawer = createRobotDrawer({
    drawerEl: els.robotDrawer,
    toggleBtn: els.btnToggleRobotDrawer,
    closeBtn: els.btnCloseRobotDrawer,
    backdropEl: els.robotDrawerBackdrop,
    quickDockEl: els.robotQuickDock,
    btnQuickVolume: els.btnQuickVolume,
    btnQuickHeadReset: els.btnQuickHeadReset,
    btnQuickFlashlight: els.btnQuickFlashlight,
    btnMockToggle: els.btnToggleMockRobot,
    getIsMockActive: () => isMockActive,
    t,
  });

  const roomId = roomIdOption || resolveRoomId();
  const inviteBound = typeof beforeConnect === "function";
  let graceTimer = null;
  let endedByExpiry = false;
  let endedByReplace = false;
  let redirectController = null;
  let inviteExpiryMonitor = null;
  const countdown = createSessionCountdown({
    els,
    t,
    expiresAt,
    onExpired() {
      endedByExpiry = true;
      disconnect({ ended: true });
    },
  });
  let iceServers = [];
  let meteredAllowed = false;
  let connected = false;
  let connecting = false;
  let robotCapabilities = null;
  let qualityApplying = false;
  let callStartInFlight = false;

  const locomotion = createLocomotionFeature(els, t);
  const locomotionSpeed = createLocomotionSpeedFeature(els, t);
  const head = createHeadFeature(els, t);
  const videoQuality = createVideoQualityFeature(els, t);
  const power = createPowerFeature(els, t);
  const volume = createVolumeFeature(els, t);
  const registry = createFeatureRegistry([
    locomotion,
    locomotionSpeed,
    head,
    beepFeature,
    videoQuality,
    flashlightFeature,
    power,
    volume,
  ]);

  const peer = createPeerController({
    els,
    getIceServers: () => (meteredAllowed ? iceServers : []),
    getFallbackIceServers: () => iceServers,
    onUseMetered() {
      meteredAllowed = true;
    },
    onIcePath(kind) {
      status.setStatus(liveStatusKey(kind), liveStatusMode(kind));
    },
    getSocket: () => signaling.getSocket(),
    getLocalStream: () => media.getLocalStream(),
    ensureMedia: () => media.ensureMedia(),
    setRtcState: status.setRtcState,
    setStatus: status.setStatus,
    onRemoteVideo(reason) {
      if (reason === "connected" || reason === "track") {
        const preset = videoQuality.getPanel()?.getSelectedPreset();
        if (preset) {
          applyOutgoingVideoQuality(peer.getPc(), preset).catch((err) =>
            console.warn(err),
          );
        }
      }
    },
  });

  /** @type {ReturnType<typeof createLocalPreviewController> | null} */
  let localPreview = null;

  const media = createMediaController({
    els,
    t,
    getPc: () => peer.getPc(),
    startCallAsOfferer: () => peer.startCallAsOfferer(),
    getSocket: () => signaling.getSocket(),
    onMediaStateChange: () => localPreview?.sync(),
  });

  localPreview = createLocalPreviewController({
    els,
    t,
    getStream: () => media.getLocalStream(),
    getCamTrack: () => media.getLocalStream()?.getVideoTracks()?.[0] || null,
  });

  function handleMockControl(action, value) {
    if (action === "volume.set") {
      const level =
        typeof value === "object" && value !== null ? value.level : value;
      registry.applyStatus({ volume: { level } });
    } else if (action === "flashlight.toggle" || action === "flashlight.on") {
      mockFlashlightActive = !mockFlashlightActive;
      if (els.btnQuickFlashlight) {
        els.btnQuickFlashlight.classList.toggle("active", mockFlashlightActive);
      }
    }
  }

  function isConnected() {
    return connected || isMockActive;
  }

  function featureContext() {
    return {
      sendControl: (action, value, opts) => {
        if (isMockActive && !connected) {
          handleMockControl(action, value);
          return;
        }
        if (!connected) return;
        const sentViaP2P = peer.sendDataChannelControl(action, value);
        if (!sentViaP2P) {
          signaling.sendControl(action, value, opts);
        }
      },
      sendVideoQuality: (presetId) => {
        if (!connected) return;
        signaling.sendVideoQuality(presetId);
      },
      t,
      host: (id) => hostById(id, els),
      isConnected,
      caps: robotCapabilities,
      onQualityPresetChange: handleQualityPresetChange,
    };
  }

  function applyRobotCapabilities(caps) {
    robotCapabilities = normalizeCapabilities(caps);
    videoQuality.applyCapabilities(robotCapabilities);
    registry.apply(robotCapabilities, featureContext());
    locomotion.updateMovementHint();
    if (els.btnToggleRobotDrawer) {
      els.btnToggleRobotDrawer.hidden = false;
    }
    if (els.btnQuickHeadReset) {
      els.btnQuickHeadReset.hidden = !robotCapabilities?.head?.available;
    }
    if (els.btnQuickFlashlight) {
      els.btnQuickFlashlight.hidden = !robotCapabilities?.flashlight?.available;
    }
    if (els.btnQuickVolume) {
      els.btnQuickVolume.hidden = robotCapabilities?.volume?.available === false;
    }
    if (els.drawerHeadHost) {
      if (robotCapabilities?.head?.available) {
        els.drawerHeadHost.hidden = false;
        if (!els.drawerHeadHost.querySelector("#btnResetHeadLook")) {
          const resetBtn = document.createElement("button");
          resetBtn.type = "button";
          resetBtn.id = "btnResetHeadLook";
          resetBtn.className = "robot-drawer-btn";
          resetBtn.setAttribute("data-i18n-aria", "media.headReset");
          resetBtn.setAttribute("aria-label", t("media.headReset"));
          resetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t("media.headReset")}</span>`;
          resetBtn.addEventListener("click", () => {
            if (connected) {
              signaling.sendControl("head.reset", undefined, { volatile: false });
            } else if (isMockActive) {
              handleMockControl("head.reset");
            }
          });
          els.drawerHeadHost.appendChild(resetBtn);
        }
      } else {
        els.drawerHeadHost.hidden = true;
        els.drawerHeadHost.innerHTML = "";
      }
    }
  }

  async function handleQualityPresetChange(preset) {
    if (!preset || qualityApplying) return;
    qualityApplying = true;
    try {
      savePresetId(preset.id);
      videoQuality.refreshLabels();
      if (els.qualityBadge) {
        const badge = { auto: "A", low: "L", mid: "M", high: "H", max: "X" };
        els.qualityBadge.textContent =
          badge[preset.id] || preset.id.slice(0, 1).toUpperCase();
      }
      if (connected) signaling.sendVideoQuality(preset.id);
      if (connected && signaling.getSocket()) {
        await applyOutgoingVideoQuality(peer.getPc(), preset);
      }
    } finally {
      qualityApplying = false;
    }
  }

  async function beginCallWithRobot() {
    if (callStartInFlight) return;
    callStartInFlight = true;
    try {
      await media.ensureMedia({ timeoutMs: 4000 });
      await peer.startCallAsOfferer();
      peer.scheduleOfferRetryIfNeeded();
    } finally {
      callStartInFlight = false;
    }
  }

  function updateControlEnabling() {
    const canControl = connected || isMockActive;
    locomotion.setEnabled(canControl);
    head.setEnabled(canControl);
    volume.setEnabled(canControl);
    robotDrawer.setEnabled(canControl);
    if (els.btnQuickVolume) els.btnQuickVolume.disabled = !canControl;
    if (els.btnQuickHeadReset) els.btnQuickHeadReset.disabled = !canControl;
    if (els.btnQuickFlashlight) els.btnQuickFlashlight.disabled = !canControl;
    const resetHeadBtn = els.drawerHeadHost?.querySelector("#btnResetHeadLook");
    if (resetHeadBtn) resetHeadBtn.disabled = !canControl;
    const flashlightBtn =
      els.drawerFlashlightHost?.querySelector('[data-feature="flashlight"]') ||
      els.featureHost?.querySelector('[data-feature="flashlight"]');
    if (flashlightBtn) flashlightBtn.disabled = !canControl;
  }

  function updateMockToggleVisibility() {
    if (!els.btnToggleMockRobot) return;
    const shouldShow = shouldShowMockToggle({
      connected,
      liveCapabilities: liveRobotCapabilities,
    });
    els.btnToggleMockRobot.hidden = !shouldShow;
  }

  function setMockRobotActive(active, model = "cruzr") {
    isMockActive = Boolean(active);
    if (els.btnToggleMockRobot) {
      els.btnToggleMockRobot.classList.toggle("is-active", isMockActive);
      const mockKey = isMockActive ? "media.mockDisable" : "media.mockEnable";
      els.btnToggleMockRobot.setAttribute("aria-label", t(mockKey));
    }

    if (isMockActive) {
      const mockCaps = getMockCapabilities(model);
      applyRobotCapabilities(mockCaps);
      const mockStatus = getMockStatus(model);
      registry.applyStatus(mockStatus);
      updateControlEnabling();
    } else {
      applyRobotCapabilities(connected ? liveRobotCapabilities : null);
      updateControlEnabling();
    }
    robotDrawer.refreshLabels({ isMockActive });
    updateMockToggleVisibility();
  }

  function setConnectedUi(isConnectedFlag) {
    connected = isConnectedFlag;
    connecting = false;
    if (isConnectedFlag && isMockActive) {
      setMockRobotActive(false);
    }
    updateMockToggleVisibility();
    els.btnHangup.disabled = !isConnectedFlag;
    els.btnToggleMic.disabled = !isConnectedFlag;
    els.btnToggleCam.disabled = !isConnectedFlag;
    if (els.btnToggleScreenShare) els.btnToggleScreenShare.disabled = !isConnectedFlag;
    if (els.btnVideoQuality) els.btnVideoQuality.disabled = !isConnectedFlag;
    if (els.btnSendCommand) els.btnSendCommand.disabled = !isConnectedFlag;
    media.refreshMediaButtons(isConnectedFlag);
    localPreview?.setConnected(isConnectedFlag);
    updateControlEnabling();
    if (isConnectedFlag) {
      status.showEnded(false);
    } else {
      videoQuality.setPanelOpen(false);
      if (!isMockActive) {
        registry.setEnabled?.(false);
      }
    }
  }

  function refreshDynamicText() {
    const statusKey = els.statusChip.dataset.i18n;
    if (statusKey) els.statusChip.textContent = t(statusKey);
    if (els.placeholderText?.dataset.i18n) {
      els.placeholderText.textContent = t(els.placeholderText.dataset.i18n);
    }
    els.roomLabel.textContent = t("room.label", { id: roomId });
    els.btnHangup.setAttribute("aria-label", t("call.hangup"));
    if (els.btnSendCommand && !registry.isMounted("beep")) {
      els.btnSendCommand.setAttribute("aria-label", t("media.ringStart"));
    }
    lang.updateLangFlag();
    countdown.paint();
    locomotion.refreshLabels();
    head.refreshLabels();
    videoQuality.refreshLabels();
    registry.refreshLabels();
    media.refreshMediaButtons(connected);
    localPreview?.refreshLabels();
    robotDrawer.refreshLabels({ isMockActive });
    if (els.btnToggleMockRobot) {
      const mockKey = isMockActive ? "media.mockDisable" : "media.mockEnable";
      els.btnToggleMockRobot.setAttribute("aria-label", t(mockKey));
    }
    if (els.btnQuickVolume) {
      els.btnQuickVolume.setAttribute("aria-label", t("volume.panel"));
    }
    if (els.btnQuickHeadReset) {
      els.btnQuickHeadReset.setAttribute("aria-label", t("media.headReset"));
    }
    if (els.btnQuickFlashlight) {
      els.btnQuickFlashlight.setAttribute("aria-label", t("media.flashlight"));
    }
    if (els.btnToggleRobotDrawer) {
      const drawerOpen = els.robotDrawer?.classList.contains("is-open");
      const toggleKey = drawerOpen
        ? "media.robotControlsClose"
        : "media.robotControlsOpen";
      els.btnToggleRobotDrawer.setAttribute("aria-label", t(toggleKey));
    }
    if (els.robotQuickDock) {
      els.robotQuickDock.setAttribute("aria-label", t("media.quickDock"));
    }
    const resetHeadSpan = els.drawerHeadHost?.querySelector("#btnResetHeadLook span");
    if (resetHeadSpan) resetHeadSpan.textContent = t("media.headReset");
    const flashlightBtn =
      els.drawerFlashlightHost?.querySelector('[data-feature="flashlight"]') ||
      els.featureHost?.querySelector('[data-feature="flashlight"]');
    if (flashlightBtn) {
      flashlightBtn.setAttribute("aria-label", t("media.flashlight"));
      const span = flashlightBtn.querySelector("span");
      if (span) span.textContent = t("media.flashlight");
    }
  }

  function clearGrace() {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  }

  function paintEnded(flags = {}) {
    paintCallEnded(
      endedOverlayState({
        expired: endedByExpiry,
        replaced: endedByReplace,
        inviteBound,
        expiresAt,
        ...flags,
      }),
      status,
      els,
      t,
    );
    if (inviteBound && expiresAt) {
      if (inviteExpiryMonitor) inviteExpiryMonitor.stop();
      inviteExpiryMonitor = monitorInviteRejoinExpiry({
        inviteBound,
        expiresAt,
        els,
        t,
      });
    }
  }

  function armGrace() {
    clearGrace();
    graceTimer = setTimeout(() => {
      paintEnded({ transient: false });
    }, RECONNECT_GRACE_MS);
  }

  async function connect({ force = false } = {}) {
    if (endedByExpiry || connecting) return;
    if (signaling.getSocket()) {
      if (!force) return;
      signaling.disconnectSocket();
    }
    if (typeof beforeConnect === "function") {
      const allowed = await beforeConnect();
      if (allowed === false) return;
    }
    connecting = true;
    if (inviteExpiryMonitor) {
      inviteExpiryMonitor.stop();
      inviteExpiryMonitor = null;
    }
    meteredAllowed = false;
    status.showEnded(false);
    status.setPlaceholder("status.connecting");
    status.setStatus("status.connecting", "online");
    els.remotePlaceholder.classList.remove("hidden");

    iceServers = await fetchIceServers();

    media.ensureMedia({ timeoutMs: 0 }).then((stream) => {
      if (
        !stream &&
        !window.isSecureContext &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        status.setStatus("status.httpRecvOnly", "online");
      }
    });

    const socket = signaling.connect();

    socket.on("connect", async () => {
      if (endedByExpiry) return;
      endedByReplace = false;
      clearGrace();
      status.setStatus("status.connected", "online");
      const ack = await signaling.join(roomId, expiresAt ? { expiresAt } : {});
      if (ack && !ack.ok) {
        if (String(ack.error || "").includes("expired")) endedByExpiry = true;
        status.setStatus("status.joinFailed", "");
        disconnect({ ended: true });
        return;
      }
      if (ack?.robotCapabilities) {
        applyRobotCapabilities(ack.robotCapabilities);
      }
    });

    socket.on(EVENT_JOINED, async (payload) => {
      if (Array.isArray(payload?.iceServers) && payload.iceServers.length) {
        iceServers = payload.iceServers;
      }
      setConnectedUi(true);
      countdown.start();
      status.setPlaceholder("status.waitingRobot");
      status.setStatus("status.waitingRobot", "online");
      if (payload?.robotCapabilities) {
        applyRobotCapabilities(payload.robotCapabilities);
      } else {
        registry.apply(robotCapabilities, featureContext());
      }
      updateMockToggleVisibility();
      if (payload.peerPresent) {
        await beginCallWithRobot();
      }
    });

    socket.on(EVENT_PEER_JOINED, async (payload) => {
      if (isMockActive) {
        setMockRobotActive(false);
      }
      if (payload?.robotCapabilities) {
        applyRobotCapabilities(payload.robotCapabilities);
      }
      updateMockToggleVisibility();
      await beginCallWithRobot();
    });

    socket.on(EVENT_PEER_LEFT, () => {
      liveRobotCapabilities = null;
      updateMockToggleVisibility();
      meteredAllowed = false;
      peer.cleanupPeer();
      status.setPlaceholder("status.waitingRobot");
      status.setStatus("status.robotLeft", "online");
    });

    socket.on(EVENT_ROOM_STATE, (state) => {
      liveRobotCapabilities = state?.robotCapabilities || null;
      if (liveRobotCapabilities && isMockActive) {
        setMockRobotActive(false);
      }
      if (!isMockActive && state?.robotCapabilities) {
        applyRobotCapabilities(state.robotCapabilities);
      }
      updateMockToggleVisibility();
    });

    socket.on(EVENT_SIGNAL, async (message) => {
      try {
        await peer.handleSignal(message);
      } catch (err) {
        console.error(err);
        status.setRtcState("error");
      }
    });

    socket.on(EVENT_STATUS, (payload) => {
      if (!isMockActive) {
        registry.applyStatus(payload);
      }
    });

    socket.on("hangup", () => {
      peer.cleanupPeer();
      status.setPlaceholder("status.endedByRobot");
      status.setStatus("status.endedByRobot", "online");
      disconnect({ ended: true, endedByRobot: true });
    });

    socket.on(EVENT_REPLACED, () => {
      endedByReplace = true;
      clearGrace();
      peer.cleanupPeer();
      paintEnded({ replaced: true });
    });

    socket.on(EVENT_SESSION_EXPIRED, () => {
      endedByExpiry = true;
      disconnect({ ended: true });
    });

    socket.on("disconnect", (reason) => {
      locomotion.stopMovement(true);
      peer.cleanupPeer();
      setConnectedUi(false);
      if (endedByExpiry) {
        paintEnded({ expired: true });
        return;
      }
      if (endedByReplace || !isTransientDisconnect(reason)) {
        paintEnded({ replaced: endedByReplace, transient: false });
        return;
      }
      paintEnded({ transient: true });
      armGrace();
    });
  }

  function triggerReturnRedirect() {
    if (!canReturnToPlatform(inviteBound)) return;
    if (redirectController) return;

    if (els.btnReturnNow) els.btnReturnNow.classList.remove("hidden");
    if (els.btnCancelRedirect) els.btnCancelRedirect.classList.remove("hidden");
    if (els.redirectCountdown) {
      els.redirectCountdown.classList.remove("hidden");
      els.redirectCountdown.textContent = t("call.redirecting", { seconds: 5 });
    }

    redirectController = startRedirectCountdown({
      countdownSeconds: 5,
      onTick(remaining) {
        if (els.redirectCountdown) {
          els.redirectCountdown.textContent = t("call.redirecting", {
            seconds: remaining,
          });
        }
      },
      onRedirect() {
        if (els.redirectCountdown) els.redirectCountdown.classList.add("hidden");
        if (els.btnReturnNow) els.btnReturnNow.classList.add("hidden");
        if (els.btnCancelRedirect) els.btnCancelRedirect.classList.add("hidden");
      },
    });
  }

  function disconnect({ ended = true, endedByRobot = false } = {}) {
    clearGrace();
    countdown.stop();
    locomotion.stopMovement(true);
    videoQuality.setPanelOpen(false);
    robotDrawer.close();
    signaling.hangupAndLeave();
    peer.cleanupPeer();
    media.stopLocal();
    setConnectedUi(false);
    media.refreshMediaButtons(false);
    if (ended) {
      paintEnded({ expired: endedByExpiry, replaced: endedByReplace, endedByRobot });
      triggerReturnRedirect();
    }
  }

  function bind() {
    registry.apply(null, featureContext());

    els.btnHangup.addEventListener("click", () => disconnect({ ended: true }));
    els.btnRejoin.addEventListener("click", () => {
      if (inviteExpiryMonitor) {
        inviteExpiryMonitor.stop();
        inviteExpiryMonitor = null;
      }
      if (redirectController) {
        redirectController.cancel();
        redirectController = null;
        if (els.redirectCountdown) els.redirectCountdown.classList.add("hidden");
        if (els.btnReturnNow) els.btnReturnNow.classList.add("hidden");
        if (els.btnCancelRedirect) els.btnCancelRedirect.classList.add("hidden");
      }
      endedByExpiry = false;
      endedByReplace = false;
      connect({ force: true }).catch((err) => console.error(err));
    });
    if (els.btnReturnNow) {
      els.btnReturnNow.addEventListener("click", () => {
        if (redirectController) {
          redirectController.executeNow();
        } else {
          returnToPreviousOrUrl();
        }
      });
    }
    if (els.btnCancelRedirect) {
      els.btnCancelRedirect.addEventListener("click", () => {
        if (redirectController) {
          redirectController.cancel();
          redirectController = null;
        }
        if (els.redirectCountdown) els.redirectCountdown.classList.add("hidden");
        if (els.btnCancelRedirect) els.btnCancelRedirect.classList.add("hidden");
      });
    }
    els.btnToggleMic.addEventListener("click", () => {
      media.toggleMic(connected).catch((err) => console.error(err));
    });
    els.btnToggleCam.addEventListener("click", () => {
      media.toggleCam(connected).catch((err) => console.error(err));
    });
    if (els.btnToggleScreenShare) {
      els.btnToggleScreenShare.addEventListener("click", () => {
        media.toggleScreenShare(connected).catch((err) => console.error(err));
      });
    }

    if (els.btnToggleMockRobot) {
      els.btnToggleMockRobot.addEventListener("click", () => {
        const targetModel = resolveMockType(window.location.search);
        setMockRobotActive(!isMockActive, targetModel);
      });
      updateMockToggleVisibility();
    }

    if (els.btnQuickHeadReset) {
      els.btnQuickHeadReset.addEventListener("click", () => {
        if (connected) {
          signaling.sendControl("head.reset", undefined, { volatile: false });
        } else if (isMockActive) {
          handleMockControl("head.reset");
        }
      });
    }

    if (els.btnQuickFlashlight) {
      els.btnQuickFlashlight.addEventListener("click", () => {
        const modes = robotCapabilities?.flashlight?.modes || ["toggle"];
        const action = modes.includes("toggle") ? "flashlight.toggle" : "flashlight.on";
        if (connected) {
          signaling.sendControl(action, undefined, { volatile: false });
        } else if (isMockActive) {
          handleMockControl(action);
        }
      });
    }

    if (isMockRequested(window.location.search)) {
      const mockModel = resolveMockType(window.location.search);
      setMockRobotActive(true, mockModel);
    }

    localPreview?.bind();

    const tooltips = initTooltips(document, ".ctrl, .quick-dock-btn");

    document.addEventListener("localechange", () => {
      refreshDynamicText();
      tooltips.update();
    });
    refreshDynamicText();
    tooltips.update();
    countdown.start();
  }

  return { bind, connect, disconnect, roomId };
}
