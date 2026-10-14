import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { createRoomStore } from "../../src/rooms/store.js";
import { attachSignaling } from "../../src/signaling/handlers.js";

test("operator join without a robot acks ok and keeps the waiting state", () => {
  const rooms = createRoomStore();
  const roomEvents = [];
  /** @type {(socket: object) => void} */
  let onConnection = () => {};
  const io = {
    on(event, handler) {
      assert.equal(event, "connection");
      onConnection = handler;
    },
    to(roomId) {
      return {
        emit(event, payload) {
          roomEvents.push({ roomId, event, payload });
        },
      };
    },
  };

  attachSignaling(io, {
    rooms,
    getIceServers: () => [{ urls: "stun:example" }],
    log: { info() {}, error() {} },
  });

  /** @type {Record<string, Function>} */
  const listeners = {};
  /** @type {Array<{ event: string, payload: unknown }>} */
  const socketEvents = [];
  let disconnected = false;
  const socket = {
    id: "op-1",
    data: {},
    on(event, handler) {
      listeners[event] = handler;
    },
    emit(event, payload) {
      socketEvents.push({ event, payload });
    },
    join() {},
    leave() {},
    to() {
      return { emit() {} };
    },
    disconnect() {
      disconnected = true;
    },
  };

  onConnection(socket);
  /** @type {{ ok?: boolean, error?: string, robot?: boolean }} */
  let ack = {};
  listeners.join({ roomId: "sala-nova", role: "operator" }, (result) => {
    ack = result;
  });

  assert.equal(ack.ok, true);
  assert.equal(ack.error, undefined);
  assert.equal(ack.robot, false);
  assert.equal(disconnected, false);
  const joined = socketEvents.find((item) => item.event === "joined");
  assert.ok(joined);
  assert.equal(joined.payload.peerPresent, false);
  assert.equal(joined.payload.role, "operator");
  assert.deepEqual(
    roomEvents.map((item) => item.event),
    ["room-state"],
  );
});
