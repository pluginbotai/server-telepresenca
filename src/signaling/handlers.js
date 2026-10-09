import { createRoomHandlers } from "./handlers-room.js";
import { registerSocketHandlers } from "./handlers-socket.js";

/**
 * @param {import("socket.io").Server} io
 * @param {object} deps
 */
export function attachSignaling(io, deps) {
  const { rooms, log } = deps;
  const roomHandlers = createRoomHandlers(io, { rooms });
  const ctx = { ...deps, ...roomHandlers };

  io.on("connection", (socket) => {
    log.info(`[+] connected ${socket.id}`);
    registerSocketHandlers(socket, ctx);
  });
}
