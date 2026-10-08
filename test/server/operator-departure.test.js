import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { OPERATOR_DEPARTURE_GRACE_MS } from "../../src/rooms/departure-grace.js";
import { createRoomHandlers } from "../../src/signaling/handlers-room.js";
import { createRoomStore } from "../../src/rooms/store.js";
import { ROLE_OPERATOR } from "../../src/protocol/events.js";

test("operator disconnect defers peer-left until grace timer fires", () => {
  const rooms = createRoomStore();
  const emissions = [];
  const io = {
    to(_roomId) {
      return {
        emit(event, payload) {
          emissions.push({ event, payload });
        },
      };
    },
  };
  const { leaveRoom } = createRoomHandlers(/** @type {*} */ (io), { rooms });
  const room = rooms.ensure("sala");
  room.operator = "op-old";
  room.robot = "bot-1";
  rooms.set("sala", room);

  const pending = [];
  const origSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => {
    assert.equal(ms, OPERATOR_DEPARTURE_GRACE_MS);
    pending.push(fn);
    return /** @type {*} */ (1);
  };

  try {
    leaveRoom(
      {
        id: "op-old",
        data: { roomId: "sala", role: ROLE_OPERATOR },
        leave() {},
        to() {
          return { emit() {} };
        },
      },
      { deferOperatorGrace: true },
    );
    assert.equal(emissions.filter((e) => e.event === "peer-left").length, 0);
    assert.equal(rooms.get("sala")?.operator, "op-old");
    assert.equal(pending.length, 1);
    pending[0]();
    assert.equal(emissions.filter((e) => e.event === "peer-left").length, 1);
    assert.equal(rooms.get("sala")?.operator, undefined);
  } finally {
    globalThis.setTimeout = origSetTimeout;
  }
});

test("explicit operator leave emits peer-left immediately", () => {
  const rooms = createRoomStore();
  const emissions = [];
  const io = {
    to(_roomId) {
      return { emit(event, payload) { emissions.push({ event, payload }); } };
    },
  };
  const { leaveRoom } = createRoomHandlers(/** @type {*} */ (io), { rooms });
  const room = rooms.ensure("sala");
  room.operator = "op-old";
  rooms.set("sala", room);

  leaveRoom({
    id: "op-old",
    data: { roomId: "sala", role: ROLE_OPERATOR },
    leave() {},
    to(_room) {
      return { emit(event, payload) { emissions.push({ event, payload }); } };
    },
  });

  assert.equal(emissions.filter((e) => e.event === "peer-left").length, 1);
  assert.equal(rooms.get("sala")?.operator, undefined);
});

test("operator departure grace constant is 60 seconds", () => {
  assert.equal(OPERATOR_DEPARTURE_GRACE_MS, 60_000);
});
