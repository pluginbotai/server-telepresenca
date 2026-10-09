import { ROLE_OPERATOR } from "../protocol/events.js";
import { clearOperatorDeparture } from "../rooms/departure-grace.js";
import {
  clearExpiryTimer,
  EVENT_SESSION_EXPIRED,
  expiryDelayMs,
  occupantSockets,
} from "../rooms/lifecycle.js";
import {
  beginOperatorDepartureGrace,
  leaveRoomOccupant,
} from "./handlers-room-leave.js";

/**
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket | undefined} socket
 * @param {string} event
 * @param {object} [payload]
 */
function kickSocket(io, socket, event, payload) {
  if (!socket) return;
  const previousRoom = socket.data.roomId;
  const previousRole = socket.data.role;
  if (previousRoom && previousRole) {
    socket.to(previousRoom).emit("peer-left", {
      role: previousRole,
      socketId: socket.id,
    });
  }
  socket.emit(event, payload);
  socket.data.roomId = undefined;
  socket.data.role = undefined;
  if (payload && payload.roomId) {
    socket.leave(payload.roomId);
  } else if (previousRoom) {
    socket.leave(previousRoom);
  }
  socket.disconnect(true);
}

/**
 * @param {import("socket.io").Server} io
 * @param {object} deps
 */
export function createRoomHandlers(io, { rooms }) {
  const leaveDeps = { io, rooms };
  function expireRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    clearExpiryTimer(room);
    clearOperatorDeparture(room);
    for (const occupant of occupantSockets(room)) {
      kickSocket(io, io.sockets.sockets.get(occupant.socketId), EVENT_SESSION_EXPIRED, {
        roomId,
        reason: EVENT_SESSION_EXPIRED,
      });
    }
    rooms.delete(roomId);
  }

  function armRoomExpiry(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    clearExpiryTimer(room);
    const delay = expiryDelayMs(room.expiresAt);
    if (delay == null) return;
    if (delay <= 0) {
      expireRoom(roomId);
      return;
    }
    room.expiryTimer = setTimeout(() => expireRoom(roomId), delay);
    rooms.set(roomId, room);
  }

  /**
   * @param {import("socket.io").Socket} socket
   * @param {{ deferOperatorGrace?: boolean }} [opts]
   */
  function leaveRoom(socket, { deferOperatorGrace = false } = {}) {
    const { roomId, role } = socket.data;
    if (!roomId || !role) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (role === ROLE_OPERATOR && deferOperatorGrace && room.operator === socket.id) {
      beginOperatorDepartureGrace(leaveDeps, socket, roomId, room);
      return;
    }

    leaveRoomOccupant(leaveDeps, { socket, roomId, room, role });
  }

  /** @param {import("socket.io").Socket} socket */
  function kickOccupant(socket, event, payload) {
    kickSocket(io, socket, event, payload);
  }

  return { kickSocket: kickOccupant, expireRoom, armRoomExpiry, leaveRoom };
}
