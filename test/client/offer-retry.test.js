import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  EVENT_SIGNAL,
  SIGNAL_ANSWER,
  SIGNAL_OFFER,
} from "../../public/js/protocol/events.js";
import {
  handlePeerSignal,
  planOfferRetryAction,
  runOfferRetry,
} from "../../public/js/webrtc/peer-signaling.js";

test("planOfferRetry waits while ICE is still coming up and stops after two tries", () => {
  assert.equal(
    planOfferRetryAction({
      connectionState: "connecting",
      signalingState: "stable",
      retryCount: 0,
    }),
    "wait",
  );
  assert.equal(
    planOfferRetryAction({
      connectionState: "connected",
      signalingState: "stable",
      retryCount: 1,
    }),
    "wait",
  );
  assert.equal(
    planOfferRetryAction({
      connectionState: "failed",
      signalingState: "stable",
      retryCount: 2,
    }),
    "stop",
  );
});

test("planOfferRetry resends a lost offer and restarts only a dead ICE", () => {
  assert.equal(
    planOfferRetryAction({
      connectionState: "new",
      signalingState: "have-local-offer",
      retryCount: 0,
    }),
    "resend",
  );
  assert.equal(
    planOfferRetryAction({
      connectionState: "failed",
      signalingState: "stable",
      retryCount: 0,
    }),
    "restart",
  );
  assert.equal(
    planOfferRetryAction({
      connectionState: "disconnected",
      signalingState: "stable",
      retryCount: 0,
    }),
    "restart",
  );
  assert.equal(
    planOfferRetryAction({
      connectionState: "new",
      signalingState: "stable",
      retryCount: 0,
    }),
    "renegotiate",
  );
});

/**
 * @param {object} pc
 * @param {object} [extra]
 */
function retryRuntime(pc, extra = {}) {
  const sent = [];
  const runtime = {
    pc,
    offerRetryCount: 0,
    offerRetryTimer: null,
    sent,
    hasRenderableRemoteVideo: () => false,
    getSocket: () => ({
      emit(event, payload) {
        sent.push({ event, payload });
      },
    }),
    clearOfferRetryTimer() {
      if (runtime.offerRetryTimer) {
        clearTimeout(runtime.offerRetryTimer);
        runtime.offerRetryTimer = null;
      }
    },
    clearOfferRetry() {
      runtime.clearOfferRetryTimer();
      runtime.offerRetryCount = 0;
    },
    hostFallback: {
      async escalate() {
        return false;
      },
    },
    ...extra,
  };
  return runtime;
}

test("a lost offer is re-emitted instead of calling createOffer again", async () => {
  let created = 0;
  const localDescription = { type: "offer", sdp: "v=0\r\noffer" };
  const runtime = retryRuntime({
    connectionState: "new",
    signalingState: "have-local-offer",
    localDescription,
    async createOffer() {
      created += 1;
      return localDescription;
    },
  });

  try {
    await runOfferRetry(runtime);
  } finally {
    runtime.clearOfferRetryTimer();
  }

  assert.equal(created, 0);
  assert.equal(runtime.sent.length, 1);
  assert.equal(runtime.sent[0].event, EVENT_SIGNAL);
  assert.equal(runtime.sent[0].payload.type, SIGNAL_OFFER);
  assert.equal(runtime.sent[0].payload.data.sdp, "v=0\r\noffer");
  assert.equal(runtime.offerRetryCount, 1);
});

test("failed ICE restarts once when TURN was already used", async () => {
  const offers = [];
  const runtime = retryRuntime({
    connectionState: "failed",
    signalingState: "stable",
    localDescription: { type: "offer", sdp: "old" },
    async createOffer(opts) {
      offers.push(opts);
      return { type: "offer", sdp: "new" };
    },
    async setLocalDescription(description) {
      this.localDescription = description;
    },
  });
  runtime.hostFallback = {
    arm() {},
    async escalate() {
      return false;
    },
  };

  try {
    await runOfferRetry(runtime);
  } finally {
    runtime.clearOfferRetryTimer();
  }

  assert.deepEqual(offers, [{ iceRestart: true }]);
  assert.equal(runtime.sent.length, 1);
  assert.equal(runtime.sent[0].payload.type, SIGNAL_OFFER);
  assert.equal(runtime.sent[0].payload.data.sdp, "new");
});

test("failed ICE does not send a second offer when TURN escalation already restarted", async () => {
  let created = 0;
  let escalations = 0;
  const runtime = retryRuntime({
    connectionState: "failed",
    signalingState: "stable",
    localDescription: { type: "offer", sdp: "old" },
    async createOffer() {
      created += 1;
      return { type: "offer", sdp: "new" };
    },
  });
  runtime.hostFallback = {
    async escalate() {
      escalations += 1;
      return true;
    },
  };

  try {
    await runOfferRetry(runtime);
  } finally {
    runtime.clearOfferRetryTimer();
  }

  assert.equal(escalations, 1);
  assert.equal(created, 0);
  assert.equal(runtime.sent.length, 0);
});

test("a repeated answer on a stable peer is ignored", async () => {
  let remoteSet = 0;
  const sent = [];
  const pc = {
    signalingState: "stable",
    async setRemoteDescription() {
      remoteSet += 1;
    },
    async addIceCandidate() {},
  };
  await handlePeerSignal(
    {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      isPolite: true,
      iceQueue: { async flush() {} },
      getSocket: () => ({
        emit(_event, payload) {
          sent.push(payload);
        },
      }),
    },
    { type: SIGNAL_ANSWER, data: { type: "answer", sdp: "late" } },
  );
  assert.equal(remoteSet, 0);
  assert.equal(sent.length, 0);
});

test("an answer is applied only in have-local-offer and a missing socket does not throw", async () => {
  let remoteSet = 0;
  const pc = {
    signalingState: "have-local-offer",
    localDescription: null,
    async setRemoteDescription() {
      remoteSet += 1;
      this.signalingState = "stable";
    },
    async addIceCandidate() {},
  };
  await handlePeerSignal(
    {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      isPolite: true,
      iceQueue: {
        async flush() {},
      },
      getSocket: () => null,
    },
    { type: SIGNAL_ANSWER, data: { type: "answer", sdp: "ok" } },
  );
  assert.equal(remoteSet, 1);

  const offerPc = {
    signalingState: "stable",
    localDescription: { type: "answer", sdp: "local-answer" },
    async setRemoteDescription() {
      this.signalingState = "have-remote-offer";
    },
    async createAnswer() {
      return { type: "answer", sdp: "local-answer" };
    },
    async setLocalDescription(description) {
      this.localDescription = description;
      this.signalingState = "stable";
    },
    async addIceCandidate() {},
  };
  await handlePeerSignal(
    {
      pc: offerPc,
      makingOffer: false,
      ignoreOffer: false,
      isPolite: true,
      iceQueue: { async flush() {} },
      getSocket: () => null,
    },
    { type: SIGNAL_OFFER, data: { type: "offer", sdp: "remote" } },
  );
  assert.equal(offerPc.signalingState, "stable");
});
