import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { routeControl } from "../../public/js/signaling/control-route.js";

function harness({ p2pOk = true } = {}) {
  const calls = [];
  return {
    calls,
    args: {
      sendP2P: (action, value) => {
        calls.push(["p2p", action, value]);
        return p2pOk;
      },
      sendSocket: (action, value, opts) => calls.push(["socket", action, value, opts]),
    },
  };
}

test("volatile commands go through P2P only when the channel accepts them", () => {
  const h = harness();
  routeControl({ action: "forward", opts: { volatile: true }, ...h.args });
  assert.deepEqual(h.calls, [["p2p", "forward", undefined]]);
});

test("volatile commands fall back to the socket when P2P is unavailable", () => {
  const h = harness({ p2pOk: false });
  routeControl({ action: "forward", opts: { volatile: true }, ...h.args });
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1][0], "socket");
  assert.equal(h.calls[1][1], "forward");
});

test("locomotion.speed.set is never sent over the lossy P2P channel", () => {
  const h = harness();
  routeControl({
    action: "locomotion.speed.set",
    value: { factor: 0.35 },
    opts: { volatile: false },
    ...h.args,
  });
  assert.deepEqual(h.calls, [
    ["socket", "locomotion.speed.set", { factor: 0.35 }, { volatile: false }],
  ]);
});

test("state commands without opts default to the reliable socket", () => {
  const h = harness();
  routeControl({ action: "ring.start", ...h.args });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], "socket");
});

test("stop goes through both paths so it is fast and reliable", () => {
  const h = harness();
  routeControl({ action: "stop", opts: { volatile: false }, ...h.args });
  assert.deepEqual(
    h.calls.map((c) => c[0]),
    ["p2p", "socket"],
  );
});

test("stop still reaches the socket when P2P rejects it", () => {
  const h = harness({ p2pOk: false });
  routeControl({ action: "stop", opts: { volatile: false }, ...h.args });
  assert.deepEqual(
    h.calls.map((c) => c[0]),
    ["p2p", "socket"],
  );
});
