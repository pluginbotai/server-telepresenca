import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { createRoomStore } from "../../src/rooms/store.js";
import { attachSignaling } from "../../src/signaling/handlers.js";

test("relays that read io from the signaling context reach the other peer", () => {
  const rooms = createRoomStore();
  /** @type {Array<{ target: string, event: string, payload: unknown }>} */
  const forwarded = [];
  const harness = createHarness(rooms, forwarded);
  const robot = harness.connect("bot-1");
  const operator = harness.connect("op-1");

  /** @type {{ ok?: boolean }} */
  let robotAck = {};
  /** @type {{ ok?: boolean }} */
  let operatorAck = {};
  robot.listeners.join({ roomId: "sala", role: "robot" }, (result) => {
    robotAck = result;
  });
  operator.listeners.join({ roomId: "sala", role: "operator" }, (result) => {
    operatorAck = result;
  });

  operator.listeners.signal({ type: "offer", data: { sdp: "v=0" } });
  operator.listeners.control({ action: "beep", value: 1 });
  operator.listeners["video-quality"]({ presetId: " 720p " });
  robot.listeners.status('{"battery":80}');
  robot.listeners["robot-alert"]({ kind: "obstacle" });
  operator.listeners.hangup();

  assert.equal(robotAck.ok, true);
  assert.equal(operatorAck.ok, true);
  assert.deepEqual(
    forwarded.filter((item) => item.event !== "room-state"),
    [
      {
        target: "bot-1",
        event: "signal",
        payload: { type: "offer", data: { sdp: "v=0" }, from: "operator" },
      },
      {
        target: "bot-1",
        event: "control",
        payload: { action: "beep", value: 1, from: "operator" },
      },
      {
        target: "bot-1",
        event: "video-quality",
        payload: { presetId: "720p", from: "operator" },
      },
      { target: "op-1", event: "status", payload: { battery: 80 } },
      { target: "op-1", event: "robot-alert", payload: { kind: "obstacle" } },
    ],
  );
  assert.deepEqual(
    operator.broadcasts.filter((item) => item.event === "hangup"),
    [{ target: "sala", event: "hangup", payload: { from: "operator" } }],
  );
});

test("an already expired join does not create a room", () => {
  const rooms = createRoomStore();
  const harness = createHarness(rooms, []);
  const operator = harness.connect("op-1");
  /** @type {{ ok?: boolean, error?: string }} */
  let ack = {};
  operator.listeners.join(
    { roomId: "sala-expirada", role: "operator", expiresAt: Date.now() - 1000 },
    (result) => {
      ack = result;
    },
  );
  assert.equal(ack.ok, false);
  assert.equal(String(ack.error).includes("expired"), true);
  assert.equal(rooms.get("sala-expirada"), undefined);
});

test("a second operator replaces the first and keeps the room", () => {
  const rooms = createRoomStore();
  const harness = createHarness(rooms, []);
  const first = harness.connect("op-1");
  const second = harness.connect("op-2");
  /** @type {{ ok?: boolean }} */
  let firstAck = {};
  /** @type {{ ok?: boolean }} */
  let secondAck = {};
  first.listeners.join({ roomId: "sala", role: "operator" }, (result) => {
    firstAck = result;
  });
  second.listeners.join({ roomId: "sala", role: "operator" }, (result) => {
    secondAck = result;
  });

  assert.equal(firstAck.ok, true);
  assert.equal(secondAck.ok, true);
  assert.equal(rooms.get("sala")?.operator, "op-2");
  assert.equal(
    first.emitted.some((item) => item.event === "replaced"),
    true,
  );
  assert.equal(first.socket.data.role, undefined);
});

/**
 * @param {ReturnType<typeof createRoomStore>} rooms
 * @param {Array<{ target: string, event: string, payload: unknown }>} forwarded
 */
function createHarness(rooms, forwarded) {
  /** @type {(socket: object) => void} */
  let onConnection = () => {};
  const sockets = new Map();
  const io = {
    on(event, handler) {
      assert.equal(event, "connection");
      onConnection = handler;
    },
    to(target) {
      return {
        emit(event, payload) {
          forwarded.push({ target, event, payload });
        },
      };
    },
    sockets: { sockets },
  };
  attachSignaling(io, {
    rooms,
    getIceServers: () => [],
    log: { info() {}, error() {} },
  });

  return {
    /**
     * @param {string} id
     */
    connect(id) {
      /** @type {Record<string, Function>} */
      const listeners = {};
      /** @type {Array<{ target: string, event: string, payload: unknown }>} */
      const broadcasts = [];
      /** @type {Array<{ event: string, payload: unknown }>} */
      const emitted = [];
      const socket = {
        id,
        data: {},
        on(event, handler) {
          listeners[event] = handler;
        },
        emit(event, payload) {
          emitted.push({ event, payload });
        },
        join() {},
        leave() {},
        to(target) {
          return {
            emit(event, payload) {
              broadcasts.push({ target, event, payload });
            },
          };
        },
        disconnect() {},
      };
      sockets.set(id, socket);
      onConnection(socket);
      return { listeners, broadcasts, emitted, socket };
    },
  };
}
