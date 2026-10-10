import { ROLE_OPERATOR, ROLE_ROBOT } from "../protocol/events.js";
import {
  clearOperatorDeparture,
  OPERATOR_DEPARTURE_GRACE_MS,
} from "../rooms/departure-grace.js";
import { clearExpiryTimer } from "../rooms/lifecycle.js";

/**
 * @typedef {object} RoomHandlerDeps
 * @property {import("socket.io").Server} io
 * @property {ReturnType<import("../rooms/store.js").createRoomStore>} rooms
 */

/**
 * @param {RoomHandlerDeps} deps
 * @param {import("socket.io").Socket} socket
 * @param {string} roomId
 * @param {import("../rooms/store.js").Room} room
 */
export function beginOperatorDepartureGrace(deps, socket, roomId, room) {
  const { io, rooms } = deps;
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
}

/**
 * @param {RoomHandlerDeps} deps
 * @param {{ socket: import("socket.io").Socket, roomId: string, room: import("../rooms/store.js").Room, role: string }} leave
 */
export function leaveRoomOccupant(deps, leave) {
  const { io, rooms } = deps;
  const { socket, roomId, room, role } = leave;
  // A robot leaving must not cancel the operator grace timer. Doing so
  // keeps the departed operator id in the room with nothing left to remove it.
  if (role === ROLE_OPERATOR) {
    clearOperatorDeparture(room);
  }

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
