import { peerRole, ROLE_OPERATOR, ROLE_ROBOT } from "../protocol/events.js";
import { sanitizeControlPayload } from "../protocol/control-sanitize.js";
import { handleJoin } from "./handlers-join.js";

/**
 * Android Socket.IO sometimes delivers JSON as a string.
 * @param {unknown} payload
 */
function coerceStatusPayload(payload) {
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return payload;
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {object} ctx
 */
export function registerSocketHandlers(socket, ctx) {
  const { io, rooms, log, leaveRoom } = ctx;

  socket.on("join", (payload, ack) => handleJoin(socket, payload, ack, ctx));

  socket.on("signal", (payload) => {
    const { roomId, role } = socket.data;
    if (!roomId || !role || !payload?.type) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const targetId = room[peerRole(role)];
    if (!targetId) return;
    io.to(targetId).emit("signal", {
      type: payload.type,
      data: payload.data,
      from: role,
    });
  });

  socket.on("control", (payload) => {
    const { roomId, role } = socket.data;
    if (!roomId || role !== ROLE_OPERATOR || !payload) return;
    const room = rooms.get(roomId);
    if (!room?.robot) return;
    const sanitized = sanitizeControlPayload(payload);
    if (!sanitized) return;
    io.to(room.robot).emit("control", {
      action: sanitized.action,
      value: sanitized.value,
      from: ROLE_OPERATOR,
    });
  });

  socket.on("status", (payload) => {
    const { roomId, role } = socket.data;
    const body = coerceStatusPayload(payload);
    if (!roomId || role !== ROLE_ROBOT || !body) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.lastStatus = body;
    rooms.set(roomId, room);
    if (room.operator) {
      io.to(room.operator).emit("status", body);
    }
  });

  socket.on("robot-alert", (payload) => {
    const { roomId, role } = socket.data;
    const body = coerceStatusPayload(payload);
    if (!roomId || role !== ROLE_ROBOT || !body) return;
    const room = rooms.get(roomId);
    if (!room?.operator) return;
    io.to(room.operator).emit("robot-alert", body);
  });

  socket.on("video-quality", (payload) => {
    const { roomId, role } = socket.data;
    if (!roomId || role !== ROLE_OPERATOR || !payload) return;
    const presetId =
      typeof payload.presetId === "string" ? payload.presetId.trim() : "";
    if (!presetId) return;
    const room = rooms.get(roomId);
    if (!room?.robot) return;
    io.to(room.robot).emit("video-quality", {
      presetId,
      from: ROLE_OPERATOR,
    });
  });

  socket.on("hangup", () => {
    const { roomId } = socket.data;
    if (!roomId) return;
    socket.to(roomId).emit("hangup", { from: socket.data.role });
  });

  socket.on("leave", () => {
    leaveRoom(socket);
  });

  socket.on("disconnect", () => {
    log.info(`[-] disconnected ${socket.id}`);
    const deferGrace = socket.data.role === ROLE_OPERATOR;
    leaveRoom(socket, { deferOperatorGrace: deferGrace });
  });
}
