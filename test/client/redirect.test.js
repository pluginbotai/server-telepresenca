import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import {
  attemptCloseOrRedirect,
  canReturnToPlatform,
  isSafeReturnUrl,
  parseReturnUrl,
  returnToPreviousOrUrl,
  startRedirectCountdown,
} from "../../public/js/invite/redirect.js";

test("parseReturnUrl extracts return_url from query search string or URL", () => {
  assert.equal(
    parseReturnUrl(
      "?return_url=https%3A%2F%2Fweb.robots-staging.pluginbot.ai%2Fapps%2Frc3",
    ),
    "https://web.robots-staging.pluginbot.ai/apps/rc3",
  );
  assert.equal(
    parseReturnUrl("?returnUrl=https%3A%2F%2Fdemo.robots.pluginbot.ai%2Fclient%2Frc3"),
    "https://demo.robots.pluginbot.ai/client/rc3",
  );
  assert.equal(
    parseReturnUrl("?leaveUrl=https%3A%2F%2Fcustom.domain.com%2Fdashboard"),
    "https://custom.domain.com/dashboard",
  );
  assert.equal(parseReturnUrl(""), null);
  assert.equal(parseReturnUrl("?room=123"), null);
});

test("isSafeReturnUrl accepts valid http and https URLs regardless of domain", () => {
  assert.equal(isSafeReturnUrl("https://web.robots-staging.pluginbot.ai/rc3"), true);
  assert.equal(isSafeReturnUrl("https://demo.robots.pluginbot.ai/"), true);
  assert.equal(isSafeReturnUrl("https://any-company.domain.com.br/path?param=1"), true);
  assert.equal(isSafeReturnUrl("http://localhost:3000/apps/rc3"), true);
});

test("isSafeReturnUrl rejects dangerous schemes and invalid strings", () => {
  assert.equal(isSafeReturnUrl("javascript:alert(1)"), false);
  assert.equal(isSafeReturnUrl("data:text/html,malicious"), false);
  assert.equal(isSafeReturnUrl("vbscript:msgbox"), false);
  assert.equal(isSafeReturnUrl("file:///etc/passwd"), false);
  assert.equal(isSafeReturnUrl(""), false);
  assert.equal(isSafeReturnUrl(null), false);
  assert.equal(isSafeReturnUrl("not a valid url"), false);
});

test("returnToPreviousOrUrl prefers window.history.back() when history stack exists", () => {
  let backCalled = false;
  let assignedUrl = "";

  const fakeWindowWithHistory = {
    history: {
      length: 3,
      back() {
        backCalled = true;
      },
    },
    location: {
      assign(url) {
        assignedUrl = url;
      },
    },
  };

  returnToPreviousOrUrl(
    "https://web.robots-staging.pluginbot.ai/",
    fakeWindowWithHistory,
  );
  assert.equal(backCalled, true);
  assert.equal(assignedUrl, "");

  // Fallback scenario: no previous history in stack
  backCalled = false;
  assignedUrl = "";
  const fakeWindowNoHistory = {
    history: {
      length: 1,
      back() {
        backCalled = true;
      },
    },
    location: {
      assign(url) {
        assignedUrl = url;
      },
    },
  };

  returnToPreviousOrUrl(
    "https://web.robots-staging.pluginbot.ai/",
    fakeWindowNoHistory,
  );
  assert.equal(backCalled, false);
  assert.equal(assignedUrl, "https://web.robots-staging.pluginbot.ai/");
});

test("startRedirectCountdown defaults to 5s, calls tick and triggers redirect", async () => {
  const ticks = [];
  let redirected = false;

  const fakeWindow = {
    history: {
      length: 2,
      back() {
        redirected = true;
      },
    },
    location: {
      assign() {},
    },
  };

  await new Promise((resolve) => {
    startRedirectCountdown({
      countdownSeconds: 5,
      tickIntervalMs: 10,
      windowObj: fakeWindow,
      onTick(remaining) {
        ticks.push(remaining);
      },
      onRedirect() {
        resolve();
      },
    });
  });

  assert.deepEqual(ticks, [5, 4, 3, 2, 1, 0]);
  assert.equal(redirected, true);
});

test("startRedirectCountdown allows user cancellation before 5s expire", async () => {
  const ticks = [];
  let redirected = false;

  const fakeWindow = {
    history: {
      length: 2,
      back() {
        redirected = true;
      },
    },
  };

  const controller = startRedirectCountdown({
    countdownSeconds: 5,
    tickIntervalMs: 20,
    windowObj: fakeWindow,
    onTick(remaining) {
      ticks.push(remaining);
      if (remaining === 3) {
        controller.cancel();
      }
    },
    onRedirect() {
      redirected = true;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 120));

  assert.equal(redirected, false);
  assert.equal(controller.isCancelled(), true);
  assert.equal(ticks.includes(3), true);
  assert.equal(ticks.includes(0), false);
});

test("attemptCloseOrRedirect closes window if allowed or navigates location", () => {
  let closedCalled = false;
  let assignedUrl = "";

  const successfulCloseWindow = {
    closed: false,
    close() {
      closedCalled = true;
      this.closed = true;
    },
    location: {
      assign(url) {
        assignedUrl = url;
      },
    },
  };

  attemptCloseOrRedirect(
    "https://web.robots-staging.pluginbot.ai/",
    successfulCloseWindow,
  );
  assert.equal(closedCalled, true);
  assert.equal(assignedUrl, "");

  closedCalled = false;
  assignedUrl = "";
  const blockedCloseWindow = {
    closed: false,
    close() {
      closedCalled = true;
      this.closed = false;
    },
    location: {
      assign(url) {
        assignedUrl = url;
      },
    },
  };

  attemptCloseOrRedirect(
    "https://web.robots-staging.pluginbot.ai/",
    blockedCloseWindow,
  );
  assert.equal(closedCalled, true);
  assert.equal(assignedUrl, "https://web.robots-staging.pluginbot.ai/");
});

test("canReturnToPlatform allows platform operator with history or url and blocks invite visitors", () => {
  const windowWithHistory = {
    history: { length: 2, back() {} },
  };
  const windowNoHistory = {
    history: { length: 1, back() {} },
  };

  // Positive: Operator in same tab with history stack
  assert.equal(canReturnToPlatform(null, false, windowWithHistory), true);

  // Positive: Operator with explicit safe returnUrl
  assert.equal(
    canReturnToPlatform("https://demo.robots.pluginbot.ai/rc3", false, windowNoHistory),
    true,
  );

  // Negative: External invite visitor is NEVER auto-redirected
  assert.equal(
    canReturnToPlatform(
      "http://localhost:3001/invite/abc/end",
      true,
      windowWithHistory,
    ),
    false,
  );
  assert.equal(canReturnToPlatform(null, true, windowWithHistory), false);

  // Negative: Operator with no history and no returnUrl
  assert.equal(canReturnToPlatform(null, false, windowNoHistory), false);
  assert.equal(canReturnToPlatform("javascript:evil()", false, windowNoHistory), false);
});
