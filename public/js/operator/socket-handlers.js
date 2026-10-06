import {
  EVENT_JOINED,
  EVENT_PEER_JOINED,
  EVENT_PEER_LEFT,
  EVENT_REPLACED,
  EVENT_ROOM_STATE,
  EVENT_SESSION_EXPIRED,
  EVENT_SIGNAL,
  EVENT_STATUS,
  EVENT_ROBOT_ALERT,
} from "../protocol/events.js";
import { buildFeatureContext } from "./feature-context.js";
import { beginCallWithRobot } from "./call-setup.js";
import { armGrace, clearGrace, paintEnded } from "./session-end.js";
import { isTransientDisconnect } from "../invite/reconnect.js";

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {import("socket.io-client").Socket} socket
 */
function registerJoinHandlers(runtime, socket) {
  const { status, signaling } = runtime;

  socket.on("connect", async () => {
    if (runtime.endedByExpiry) return;
    runtime.endedByReplace = false;
    clearGrace(runtime);
    status.setStatus("status.connected", "online");
    const ack = await signaling.join(
      runtime.roomId,
      runtime.expiresAt ? { expiresAt: runtime.expiresAt } : {},
    );
    if (ack && !ack.ok) {
      if (String(ack.error || "").includes("expired")) runtime.endedByExpiry = true;
      status.setStatus("status.joinFailed", "");
      runtime.disconnect({ ended: true });
      return;
    }
    if (ack?.robot) runtime.robotPeerPresent = true;
    if (ack?.robotCapabilities) {
      runtime.applyRobotCapabilities(ack.robotCapabilities);
    } else {
      runtime.updateMockToggleVisibility();
    }
  });

  socket.on(EVENT_JOINED, async (payload) => {
    if (Array.isArray(payload?.iceServers) && payload.iceServers.length) {
      runtime.iceServers = payload.iceServers;
    }
    runtime.setConnectedUi(true);
    runtime.countdown.start();
    status.setPlaceholder("status.waitingRobot");
    status.setStatus("status.waitingRobot", "online");
    runtime.robotPeerPresent = Boolean(payload?.peerPresent);
    if (payload?.robotCapabilities) {
      runtime.applyRobotCapabilities(payload.robotCapabilities);
    } else {
      runtime.registry.apply(runtime.robotCapabilities, buildFeatureContext(runtime));
    }
    runtime.updateMockToggleVisibility();
    if (payload.peerPresent) {
      await beginCallWithRobot(runtime);
    }
  });
}

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {import("socket.io-client").Socket} socket
 */
function registerPeerHandlers(runtime, socket) {
  const { status, peer } = runtime;

  socket.on(EVENT_PEER_JOINED, async (payload) => {
    runtime.robotPeerPresent = true;
    if (runtime.isMockActive) {
      runtime.setMockRobotActive(false);
    }
    if (payload?.robotCapabilities) {
      runtime.applyRobotCapabilities(payload.robotCapabilities);
    }
    runtime.updateMockToggleVisibility();
    await beginCallWithRobot(runtime);
  });

  socket.on(EVENT_PEER_LEFT, () => {
    runtime.robotPeerPresent = false;
    runtime.rtcWithRobot = false;
    runtime.liveRobotCapabilities = null;
    runtime.updateMockToggleVisibility();
    runtime.meteredAllowed = false;
    peer.cleanupPeer();
    status.setPlaceholder("status.waitingRobot");
    status.setStatus("status.robotLeft", "online");
  });

  socket.on(EVENT_ROOM_STATE, (state) => {
    runtime.robotPeerPresent = Boolean(state?.robot);
    runtime.liveRobotCapabilities = state?.robotCapabilities || null;
    if (runtime.liveRobotCapabilities && runtime.isMockActive) {
      runtime.setMockRobotActive(false);
    }
    if (!runtime.isMockActive && state?.robotCapabilities) {
      runtime.applyRobotCapabilities(state.robotCapabilities);
    }
    runtime.updateMockToggleVisibility();
  });
}

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {import("socket.io-client").Socket} socket
 */
function registerSessionHandlers(runtime, socket) {
  const { status, peer, locomotion } = runtime;

  socket.on(EVENT_SIGNAL, async (message) => {
    try {
      await peer.handleSignal(message);
    } catch (err) {
      console.error(err);
      status.setRtcState("error");
    }
  });

  socket.on(EVENT_STATUS, (payload) => {
    if (!runtime.isMockActive) {
      runtime.registry.applyStatus(payload);
    }
  });

  socket.on(EVENT_ROBOT_ALERT, (payload) => {
    if (runtime.isMockActive) return;
    runtime.obstacleAlert?.handleRobotAlert(payload);
  });

  socket.on("hangup", () => {
    peer.cleanupPeer();
    status.setPlaceholder("status.endedByRobot");
    status.setStatus("status.endedByRobot", "online");
    runtime.disconnect({ ended: true, endedByRobot: true });
  });

  socket.on(EVENT_REPLACED, () => {
    runtime.endedByReplace = true;
    clearGrace(runtime);
    peer.cleanupPeer();
    paintEnded(runtime, { replaced: true });
  });

  socket.on(EVENT_SESSION_EXPIRED, () => {
    runtime.endedByExpiry = true;
    runtime.disconnect({ ended: true });
  });

  socket.on("disconnect", (reason) => {
    locomotion.stopMovement(true);
    peer.cleanupPeer();
    runtime.setConnectedUi(false);
    if (runtime.endedByExpiry) {
      paintEnded(runtime, { expired: true });
      return;
    }
    if (runtime.endedByReplace || !isTransientDisconnect(reason)) {
      paintEnded(runtime, { replaced: runtime.endedByReplace, transient: false });
      return;
    }
    paintEnded(runtime, { transient: true });
    armGrace(runtime);
  });
}

/**
 * @param {import("./runtime.js").OperatorRuntime} runtime
 * @param {import("socket.io-client").Socket} socket
 */
export function registerOperatorSocketHandlers(runtime, socket) {
  registerJoinHandlers(runtime, socket);
  registerPeerHandlers(runtime, socket);
  registerSessionHandlers(runtime, socket);
}
