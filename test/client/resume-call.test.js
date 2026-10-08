import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  ICE_DISCONNECTED_GRACE_MS,
  planMediaResumeStep,
  resumeCallAfterSignalingReconnect,
} from "../../public/js/webrtc/resume-call.js";

test("planMediaResumeStep skips healthy and in-progress ICE", () => {
  assert.equal(planMediaResumeStep("connected", "connected"), "skip");
  assert.equal(planMediaResumeStep("completed", "connected"), "skip");
  assert.equal(planMediaResumeStep("checking", "connecting"), "skip");
});

test("planMediaResumeStep waits on disconnected before restart", () => {
  assert.equal(planMediaResumeStep("disconnected", "connected"), "wait");
  assert.equal(planMediaResumeStep("connected", "disconnected"), "wait");
  assert.equal(planMediaResumeStep("failed", "connected"), "restart");
});

test("resume after signaling reconnect waits ICE grace then restarts if still disconnected", async () => {
  const calls = [];
  let ice = "disconnected";
  let conn = "connected";
  const pc = {
    get iceConnectionState() {
      return ice;
    },
    get connectionState() {
      return conn;
    },
  };
  const sleeps = [];
  await resumeCallAfterSignalingReconnect(
    {
      robotPeerPresent: true,
      peer: {
        getPc: () => pc,
        startCallAsOfferer: async (opts) => {
          calls.push(opts);
        },
      },
      beginCallWithRobot: async () => {
        calls.push("begin");
      },
    },
    {
      sleep: async (ms) => {
        sleeps.push(ms);
        ice = "disconnected";
      },
    },
  );
  assert.deepEqual(sleeps, [ICE_DISCONNECTED_GRACE_MS]);
  assert.deepEqual(calls, [{ iceRestart: true }]);
});

test("resume skips offer when ICE self-heals during grace window", async () => {
  const calls = [];
  let ice = "disconnected";
  const pc = {
    get iceConnectionState() {
      return ice;
    },
    get connectionState() {
      return "connected";
    },
  };
  await resumeCallAfterSignalingReconnect(
    {
      robotPeerPresent: true,
      peer: {
        getPc: () => pc,
        startCallAsOfferer: async (opts) => calls.push(opts),
      },
      beginCallWithRobot: async () => calls.push("begin"),
    },
    {
      sleep: async () => {
        ice = "connected";
      },
    },
  );
  assert.equal(calls.length, 0);
});

test("resume does not begin call when no peer connection on reconnect", async () => {
  const calls = [];
  await resumeCallAfterSignalingReconnect({
    robotPeerPresent: true,
    peer: { getPc: () => null, startCallAsOfferer: async () => calls.push("offer") },
    beginCallWithRobot: async () => calls.push("begin"),
  });
  assert.deepEqual(calls, ["begin"]);
});
