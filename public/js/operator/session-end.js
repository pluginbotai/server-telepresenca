import {
  endedOverlayState,
  monitorInviteRejoinExpiry,
  paintCallEnded,
  RECONNECT_GRACE_MS,
} from "../invite/reconnect.js";
import {
  canReturnToPlatform,
  REDIRECT_COUNTDOWN_SECONDS,
  startRedirectCountdown,
} from "../invite/redirect.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function clearGrace(runtime) {
  if (runtime.graceTimer) {
    clearTimeout(runtime.graceTimer);
    runtime.graceTimer = null;
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function paintEnded(runtime, flags = {}) {
  const { status, els, t, inviteBound, expiresAt } = runtime;
  paintCallEnded(
    endedOverlayState({
      expired: runtime.endedByExpiry,
      replaced: runtime.endedByReplace,
      inviteBound,
      expiresAt,
      ...flags,
    }),
    status,
    els,
    t,
  );
  if (inviteBound && expiresAt) {
    if (runtime.inviteExpiryMonitor) runtime.inviteExpiryMonitor.stop();
    runtime.inviteExpiryMonitor = monitorInviteRejoinExpiry({
      inviteBound,
      expiresAt,
      els,
      t,
    });
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function armGrace(runtime) {
  clearGrace(runtime);
  runtime.graceTimer = setTimeout(() => {
    paintEnded(runtime, { transient: false });
  }, RECONNECT_GRACE_MS);
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function triggerReturnRedirect(runtime) {
  if (!canReturnToPlatform(runtime.inviteBound)) return;
  if (runtime.redirectController) return;

  const { els, t } = runtime;
  if (els.redirectCountdown) {
    els.redirectCountdown.classList.remove("hidden");
    els.redirectCountdown.textContent = t("call.redirecting", {
      seconds: REDIRECT_COUNTDOWN_SECONDS,
    });
  }

  runtime.redirectController = startRedirectCountdown({
    countdownSeconds: REDIRECT_COUNTDOWN_SECONDS,
    onTick(remaining) {
      if (els.redirectCountdown) {
        els.redirectCountdown.textContent = t("call.redirecting", {
          seconds: remaining,
        });
      }
    },
    onRedirect() {
      if (els.redirectCountdown) els.redirectCountdown.classList.add("hidden");
    },
  });
}

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {{ ended?: boolean, endedByRobot?: boolean }} [opts]
 */
export function disconnectOperator(
  runtime,
  { ended = true, endedByRobot = false } = {},
) {
  clearGrace(runtime);
  runtime.countdown.stop();
  runtime.locomotion.stopMovement(true);
  runtime.videoQuality.setPanelOpen(false);
  runtime.robotDrawer.close();
  runtime.signaling.hangupAndLeave();
  runtime.peer.cleanupPeer();
  runtime.media.stopLocal();
  runtime.robotPeerPresent = false;
  runtime.rtcWithRobot = false;
  runtime.setConnectedUi(false);
  runtime.media.refreshMediaButtons(false);
  if (ended) {
    paintEnded(runtime, {
      expired: runtime.endedByExpiry,
      replaced: runtime.endedByReplace,
      endedByRobot,
    });
    triggerReturnRedirect(runtime);
  }
}
