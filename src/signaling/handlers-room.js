import { ROLE_OPERATOR, ROLE_ROBOT } from "../protocol/events.js";
import {
  clearOperatorDeparture,
  OPERATOR_DEPARTURE_GRACE_MS,
} from "../rooms/departure-grace.js";
import {
  clearExpiryTimer,
  EVENT_SESSION_EXPIRED,
  expiryDelayMs,
  occupantSockets,
} from "../rooms/lifecycle.js";

/**
 * @param {import("socket.io").Server} io
 * @param {object} deps
 */
export function createRoomHandlers(io, { rooms }) {
  function kickSocket(socket, event, payload) {
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

  function expireRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    clearExpiryTimer(room);
    clearOperatorDeparture(room);
    for (const occupant of occupantSockets(room)) {
      kickSocket(io.sockets.sockets.get(occupant.socketId), EVENT_SESSION_EXPIRED, {
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
      clearOperatorDeparture(room);
      const departedId = socket.id;
      room.operatorDepartTimer = setTimeout(() => {
        const current = rooms.get(roomId);
        if (!current || current.operator !== departedId) return;
        delete current.operator;
        io.to(roomId).emit("peer-left", {
          role: ROLE_OPERATOR,
          socketId: departedId,
        });
        if (!current.operator && !current.robot) {
          clearExpiryTimer(current);
          rooms.delete(roomId);
        } else {
          rooms.set(roomId, current);
        }
        io.to(roomId).emit("room-state", rooms.state(roomId));
      }, OPERATOR_DEPARTURE_GRACE_MS);
      socket.leave(roomId);
      socket.data.roomId = undefined;
      socket.data.role = undefined;
      rooms.set(roomId, room);
      io.to(roomId).emit("room-state", rooms.state(roomId));
      return;
    }

    clearOperatorDeparture(room);

    if (room[role] === socket.id) {
      delete room[role];
      if (role === ROLE_ROBOT) {
        delete room.lastStatus;
      }
    }

    socket.to(roomId).emit("peer-left", { role, socketId: socket.id });
    socket.leave(roomId);

    if (!room.operator && !room.robot) {
      clearExpiryTimer(room);
      rooms.delete(roomId);
    } else {
      rooms.set(roomId, room);
    }

    io.to(roomId).emit("room-state", rooms.state(roomId));
    socket.data.roomId = undefined;
    socket.data.role = undefined;
  }

  return { kickSocket, expireRoom, armRoomExpiry, leaveRoom };
}
