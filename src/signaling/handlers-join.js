import {
  isKnownRole,
  normalizeRole,
  peerRole,
  ROLE_OPERATOR,
  ROLE_ROBOT,
} from "../protocol/events.js";
import { isExpired, parseExpiresAt } from "../rooms/expiry.js";

/**
 * @typedef {object} JoinPayload
 * @property {string} [roomId]
 * @property {string} [role]
 * @property {object} [capabilities]
 * @property {number|string} [expiresAt]
 * @property {number|string} [expires_at]
 */

/**
 * @param {unknown} payload
 * @returns {{ roomId: string, effectiveRole: string, capabilities: object | undefined }}
 */
function parseJoinPayload(payload) {
  const body = /** @type {JoinPayload} */ (
    payload && typeof payload === "object" ? payload : {}
  );
  const roomId = body.roomId;
  if (!roomId || typeof roomId !== "string") {
    throw new Error("roomId inválido");
  }
  const effectiveRole = normalizeRole(body.role);
  if (!isKnownRole(effectiveRole)) {
    throw new Error('role deve ser "operator", "visitor" ou "robot"');
  }
  return { roomId, effectiveRole, capabilities: body.capabilities };
}

/**
 * @param {object} room
 * @param {unknown} payload
 */
function applyJoinExpiry(room, payload) {
  const body = /** @type {JoinPayload} */ (
    payload && typeof payload === "object" ? payload : {}
  );
  const incomingExpiry = parseExpiresAt(
    body.expiresAt != null ? body.expiresAt : body.expires_at,
  );
  if (isExpired(incomingExpiry) || isExpired(room.expiresAt)) {
    throw new Error("session expired");
  }
  if (incomingExpiry) {
    room.expiresAt = incomingExpiry;
  }
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {object} join
 * @param {object} ctx
 */
function emitJoinEvents(socket, join, ctx) {
  const { roomId, effectiveRole } = join;
  const { rooms, getIceServers, io } = ctx;
  const room = rooms.get(roomId);
  const peerId = room[peerRole(effectiveRole)];

  socket.emit("joined", {
    roomId,
    role: effectiveRole,
    peerPresent: Boolean(peerId),
    robotCapabilities:
      effectiveRole === ROLE_OPERATOR ? room.robotCapabilities || null : undefined,
    iceServers: getIceServers({ role: effectiveRole }),
  });

  if (effectiveRole === ROLE_OPERATOR && room.lastStatus) {
    socket.emit("status", room.lastStatus);
  }

  if (peerId) {
    socket.to(peerId).emit("peer-joined", {
      role: effectiveRole,
      socketId: socket.id,
      robotCapabilities:
        effectiveRole === ROLE_ROBOT ? room.robotCapabilities || null : undefined,
    });
  }

  io.to(roomId).emit("room-state", rooms.state(roomId));
}

/**
 * @param {import("socket.io").Socket} socket
 * @param {unknown} payload
 * @param {Function | undefined} ack
 * @param {object} ctx
 */
export function handleJoin(socket, payload, ack, ctx) {
  const { rooms, log, leaveRoom, kickSocket, armRoomExpiry, io } = ctx;
  try {
    const join = parseJoinPayload(payload);
    leaveRoom(socket);

    const room = rooms.ensure(join.roomId);
    applyJoinExpiry(room, payload);

    if (
      join.effectiveRole === ROLE_ROBOT &&
      join.capabilities &&
      typeof join.capabilities === "object"
    ) {
      room.robotCapabilities = join.capabilities;
    }
    if (room[join.effectiveRole] && room[join.effectiveRole] !== socket.id) {
      const previous = io.sockets.sockets.get(room[join.effectiveRole]);
      kickSocket(previous, "replaced", {
        role: join.effectiveRole,
        roomId: join.roomId,
      });
    }

    room[join.effectiveRole] = socket.id;
    rooms.set(join.roomId, room);
    socket.data.roomId = join.roomId;
    socket.data.role = join.effectiveRole;
    socket.join(join.roomId);

    emitJoinEvents(socket, join, ctx);
    armRoomExpiry(join.roomId);
    log.info(`[*] ${socket.id} joined room=${join.roomId} as ${join.effectiveRole}`);

    if (typeof ack === "function") {
      ack({ ok: true, ...rooms.state(join.roomId) });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`[!] join error: ${message}`);
    if (typeof ack === "function") {
      ack({ ok: false, error: message });
    } else {
      socket.emit("error-message", { message });
    }
  }
}
