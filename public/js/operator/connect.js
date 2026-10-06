import { fetchIceServers } from "../webrtc/ice.js";
import { registerOperatorSocketHandlers } from "./socket-handlers.js";

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {{ force?: boolean }} [opts]
 */
export async function connectOperator(runtime, { force = false } = {}) {
  if (runtime.endedByExpiry || runtime.connecting) return;
  if (runtime.signaling.getSocket()) {
    if (!force) return;
    runtime.signaling.disconnectSocket();
  }
  if (typeof runtime.beforeConnect === "function") {
    const allowed = await runtime.beforeConnect();
    if (allowed === false) return;
  }
  runtime.connecting = true;
  if (runtime.inviteExpiryMonitor) {
    runtime.inviteExpiryMonitor.stop();
    runtime.inviteExpiryMonitor = null;
  }
  runtime.meteredAllowed = false;
  const { status, els, media, signaling } = runtime;
  status.showEnded(false);
  status.setPlaceholder("status.connecting");
  status.setStatus("status.connecting", "online");
  els.remotePlaceholder.classList.remove("hidden");

  runtime.iceServers = await fetchIceServers();

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
  registerOperatorSocketHandlers(runtime, socket);
}
