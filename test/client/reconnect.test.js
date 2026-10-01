import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  canRejoinInvite,
  endedOverlayState,
  isTransientDisconnect,
  monitorInviteRejoinExpiry,
  paintCallEnded,
  RECONNECT_GRACE_MS,
} from "../../public/js/invite/reconnect.js";

test("transient disconnects are transport failures, not explicit kicks", () => {
  assert.equal(isTransientDisconnect("transport close"), true);
  assert.equal(isTransientDisconnect("ping timeout"), true);
  assert.equal(isTransientDisconnect("io server disconnect"), false);
  assert.equal(isTransientDisconnect("io client disconnect"), false);
  assert.equal(RECONNECT_GRACE_MS, 20_000);
});

test("invite rejoin is allowed only while the window is open", () => {
  const end = "2026-09-19T13:15:00.000Z";
  const now = Date.parse(end);
  assert.equal(canRejoinInvite(false, end, now + 1), true);
  assert.equal(canRejoinInvite(true, end, now - 1), true);
  assert.equal(canRejoinInvite(true, end, now + 1), false);
  assert.equal(canRejoinInvite(true, null, now), true);
});

test("ended overlay hides rejoin after expiry and during reconnect grace", () => {
  const end = "2026-09-19T13:15:00.000Z";
  const now = Date.parse(end) - 1_000;
  assert.deepEqual(
    endedOverlayState({ expired: true, inviteBound: true, expiresAt: end, now }),
    {
      show: true,
      rejoin: false,
      messageKey: "invite.sessionExpired",
    },
  );
  assert.equal(
    endedOverlayState({ replaced: true, inviteBound: true, expiresAt: end, now })
      .messageKey,
    "invite.replaced",
  );
  assert.deepEqual(endedOverlayState({ transient: true }), {
    show: false,
    rejoin: false,
    messageKey: "status.reconnecting",
  });
  assert.equal(
    endedOverlayState({ inviteBound: true, expiresAt: end, now: Date.parse(end) + 1 })
      .rejoin,
    false,
  );
  assert.equal(
    endedOverlayState({ inviteBound: true, expiresAt: end, now }).messageKey,
    "invite.accessAgain",
  );
  const overlay = { dataset: {}, textContent: "" };
  const els = {
    btnRejoin: {
      classList: {
        hidden: true,
        toggle(_name, force) {
          this.hidden = !force;
        },
      },
    },
    endedOverlay: { querySelector: () => overlay },
  };
  const calls = [];
  paintCallEnded(
    { show: true, rejoin: false, messageKey: "invite.sessionExpired" },
    {
      setStatus(key) {
        calls.push(key);
      },
      showEnded(show) {
        calls.push(show);
      },
    },
    els,
    (key) => key,
  );
  assert.equal(overlay.textContent, "invite.sessionExpired");
  assert.equal(calls[0], true);
  assert.equal(calls[1], "invite.sessionExpired");
});

test("monitorInviteRejoinExpiry hides btnRejoin and updates text when invite expires in real time", async () => {
  let currentTime = 1000;
  const end = 1050; // 50ms in the future
  let hiddenAdded = false;
  const titleEl = { textContent: "", dataset: {} };
  const els = {
    btnRejoin: {
      classList: {
        add(cls) {
          if (cls === "hidden") hiddenAdded = true;
        },
      },
    },
    endedOverlay: {
      querySelector: () => titleEl,
    },
  };

  let expiredCalled = false;
  const monitor = monitorInviteRejoinExpiry({
    inviteBound: true,
    expiresAt: new Date(end).toISOString(),
    els,
    t: (key) => `translated:${key}`,
    now: () => currentTime,
    intervalMs: 10,
    onExpired: () => {
      expiredCalled = true;
    },
  });

  // Initially: not expired yet
  assert.equal(hiddenAdded, false);
  assert.equal(expiredCalled, false);

  // Advance time past expiration
  currentTime = 1100;
  await new Promise((resolve) => setTimeout(resolve, 35));

  assert.equal(hiddenAdded, true);
  assert.equal(expiredCalled, true);
  assert.equal(titleEl.textContent, "translated:invite.sessionExpired");
  assert.equal(titleEl.dataset.i18n, "invite.sessionExpired");

  monitor.stop();
});

test("monitorInviteRejoinExpiry is a no-op for non-invite sessions or missing expiresAt", () => {
  const monitorNoInvite = monitorInviteRejoinExpiry({
    inviteBound: false,
    expiresAt: "2026-10-01T12:00:00.000Z",
    els: {},
    t: (k) => k,
  });
  assert.equal(typeof monitorNoInvite.stop, "function");

  const monitorNoExpiry = monitorInviteRejoinExpiry({
    inviteBound: true,
    expiresAt: null,
    els: {},
    t: (k) => k,
  });
  assert.equal(typeof monitorNoExpiry.stop, "function");
});

