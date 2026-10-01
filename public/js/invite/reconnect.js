/** LiveKit departureTimeout default: 20s of silence before the session is gone. */
export const RECONNECT_GRACE_MS = 20_000;

/**
 * Socket.IO auto-reconnects on transport failures, not on explicit server/client disconnect.
 * @param {string | undefined} reason
 */
export function isTransientDisconnect(reason) {
  return reason !== "io server disconnect" && reason !== "io client disconnect";
}

/**
 * @param {boolean} inviteBound
 * @param {unknown} expiresAt
 * @param {number} [now]
 */
export function canRejoinInvite(inviteBound, expiresAt, now = Date.now()) {
  if (!inviteBound) return true;
  if (expiresAt == null || expiresAt === "") return true;
  const end = Date.parse(String(expiresAt));
  if (!Number.isFinite(end)) return true;
  return now < end;
}

/**
 * @param {object} options
 * @param {boolean} [options.expired]
 * @param {boolean} [options.replaced]
 * @param {boolean} [options.transient]
 * @param {boolean} [options.endedByRobot]
 * @param {boolean} [options.inviteBound]
 * @param {unknown} [options.expiresAt]
 * @param {number} [options.now]
 */
export function endedOverlayState({
  expired = false,
  replaced = false,
  transient = false,
  endedByRobot = false,
  inviteBound = false,
  expiresAt = null,
  now = Date.now(),
} = {}) {
  if (expired) {
    return { show: true, rejoin: false, messageKey: "invite.sessionExpired" };
  }
  if (replaced) {
    return {
      show: true,
      rejoin: canRejoinInvite(inviteBound, expiresAt, now),
      messageKey: "invite.replaced",
    };
  }
  if (transient) {
    return { show: false, rejoin: false, messageKey: "status.reconnecting" };
  }
  if (endedByRobot) {
    return {
      show: true,
      rejoin: canRejoinInvite(inviteBound, expiresAt, now),
      messageKey: "status.endedByRobot",
    };
  }
  return {
    show: true,
    rejoin: canRejoinInvite(inviteBound, expiresAt, now),
    messageKey: inviteBound ? "invite.accessAgain" : "call.ended",
  };
}

/**
 * @param {ReturnType<typeof endedOverlayState>} state
 * @param {{ setStatus: Function, showEnded: Function }} status
 * @param {{ btnRejoin?: { classList: { toggle: Function } }, endedOverlay?: { querySelector: Function } }} els
 * @param {(key: string) => string} t
 */
export function paintCallEnded(state, status, els, t) {
  if (!state.show) {
    status.setStatus(state.messageKey, "");
    status.showEnded(false);
    return;
  }
  status.showEnded(true);
  if (els.btnRejoin) els.btnRejoin.classList.toggle("hidden", !state.rejoin);
  const text = els.endedOverlay && els.endedOverlay.querySelector("p");
  if (text) {
    text.dataset.i18n = state.messageKey;
    text.textContent = t(state.messageKey);
  }
  const key =
    state.messageKey === "call.ended" ? "status.disconnected" : state.messageKey;
  status.setStatus(key, "");
}

/**
 * Monitora em tempo real a expiração do botão de reconectar para o visitante.
 * Quando o tempo restante zerar (now >= expiresAt), o botão 'btnRejoin' desaparece imediatamente
 * e a mensagem de encerramento é atualizada para 'invite.sessionExpired'.
 * @param {object} options
 * @param {boolean} [options.inviteBound]
 * @param {unknown} [options.expiresAt]
 * @param {object} [options.els]
 * @param {(key: string) => string} options.t
 * @param {() => number} [options.now]
 * @param {number} [options.intervalMs]
 * @param {() => void} [options.onExpired]
 * @returns {{ stop: () => void }}
 */
export function monitorInviteRejoinExpiry({
  inviteBound = false,
  expiresAt = null,
  els,
  t,
  now = () => Date.now(),
  intervalMs = 1000,
  onExpired = null,
}) {
  if (!inviteBound || !expiresAt) {
    return { stop() {} };
  }

  let timer = null;

  function check() {
    if (!canRejoinInvite(true, expiresAt, now())) {
      if (els?.btnRejoin) {
        els.btnRejoin.classList.add("hidden");
      }
      const titleEl = els?.endedOverlay && els.endedOverlay.querySelector("p");
      if (titleEl) {
        titleEl.dataset.i18n = "invite.sessionExpired";
        titleEl.textContent = t("invite.sessionExpired");
      }
      if (typeof onExpired === "function") {
        onExpired();
      }
      stop();
    }
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  check();
  if (canRejoinInvite(true, expiresAt, now())) {
    timer = setInterval(check, intervalMs);
  }

  return { stop };
}

