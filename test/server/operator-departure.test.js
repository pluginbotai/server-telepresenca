import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { OPERATOR_DEPARTURE_GRACE_MS } from "../../src/rooms/departure-grace.js";
import { createRoomHandlers } from "../../src/signaling/handlers-room.js";
import { createRoomStore } from "../../src/rooms/store.js";
import { ROLE_OPERATOR, ROLE_ROBOT } from "../../src/protocol/events.js";

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
  rooms.set("sala", room);

  leaveRoom({
    id: "op-old",
    data: { roomId: "sala", role: ROLE_OPERATOR },
    leave() {},
    to(_room) {
      return {
        emit(event, payload) {
          emissions.push({ event, payload });
        },
      };
    },
  });

  assert.equal(emissions.filter((e) => e.event === "peer-left").length, 1);
  assert.equal(rooms.get("sala")?.operator, undefined);
});

test("operator departure grace constant is 60 seconds", () => {
  assert.equal(OPERATOR_DEPARTURE_GRACE_MS, 60_000);
});

test("robot leave keeps the operator grace timer and still cleans the room", () => {
  const rooms = createRoomStore();
  const { leaveRoom } = createRoomHandlers(fakeIo(), { rooms });
  const room = rooms.ensure("sala");
  room.operator = "op-old";
  room.robot = "bot-1";
  rooms.set("sala", room);

  const pending = [];
  let cleared = 0;
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => {
    assert.equal(ms, OPERATOR_DEPARTURE_GRACE_MS);
    pending.push(fn);
    return 1;
  };
  globalThis.clearTimeout = (id) => {
    cleared += 1;
    return origClearTimeout(id);
  };

  try {
    leaveRoom(fakeSocket("op-old", ROLE_OPERATOR), { deferOperatorGrace: true });
    const clearedAfterOperator = cleared;
    leaveRoom(fakeSocket("bot-1", ROLE_ROBOT));
    assert.equal(cleared, clearedAfterOperator);
    assert.equal(rooms.get("sala")?.operator, "op-old");
    assert.equal(rooms.get("sala")?.robot, undefined);
    assert.equal(pending.length, 1);
    pending[0]();
    assert.equal(rooms.get("sala"), undefined);
  } finally {
    globalThis.setTimeout = origSetTimeout;
    globalThis.clearTimeout = origClearTimeout;
  }
});

test("a session longer than 24.8 days is not scheduled for 1ms", () => {
  const rooms = createRoomStore();
  const calls = [];
  const origSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => {
    calls.push({ fn, ms });
    return calls.length;
  };
  try {
    const { armRoomExpiry } = createRoomHandlers(fakeIo(), { rooms });
    const room = rooms.ensure("longa");
    const far = Date.now() + 40 * 24 * 60 * 60 * 1000;
    room.expiresAt = far;
    rooms.set("longa", room);
    armRoomExpiry("longa");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].ms, 2_147_483_647);
    calls[0].fn();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].ms, 2_147_483_647);
    assert.equal(rooms.get("longa")?.expiresAt, far);
    room.expiresAt = Date.now() - 1;
    calls[1].fn();
    assert.equal(rooms.get("longa"), undefined);
  } finally {
    globalThis.setTimeout = origSetTimeout;
  }
});

/** @returns {import("socket.io").Server} */
function fakeIo() {
  return /** @type {*} */ ({
    sockets: { sockets: new Map() },
    to() {
      return { emit() {} };
    },
  });
}

/**
 * @param {string} id
 * @param {string} role
 */
function fakeSocket(id, role) {
  return {
    id,
    data: { roomId: "sala", role },
    leave() {},
    to() {
      return { emit() {} };
    },
  };
}
