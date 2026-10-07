import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "../helpers/test.js";
import { createTurnRestCredentials } from "../../src/ice/turn-rest-credentials.js";

test("TURN REST password matches coturn HMAC-SHA1 rule", () => {
  const secret = "test-secret";
  const now = 1_700_000_000;
  const cred = createTurnRestCredentials({
    secret,
    ttlSeconds: 3600,
    userId: "robot",
    nowSeconds: now,
  });
  assert.match(cred.username, /^1700003600:robot$/);
  const expected = crypto
    .createHmac("sha1", secret)
    .update(cred.username)
    .digest("base64");
  assert.equal(cred.credential, expected);
});

test("buildIceServers prefers auth-secret over static user", async () => {
  const { buildIceServers } = await import("../../src/ice/ice-servers.js");
  const list = buildIceServers({
    stunUrls: [],
    turnUrls: ["turn:turn.example:3478"],
    turnUsername: "static",
    turnCredential: "static-pass",
    turnStaticAuthSecret: "shared-secret",
    turnRealm: "example.com",
    turnUserId: "telepresenca",
    turnCredentialTtl: 86400,
  });
  assert.equal(list.length, 1);
  assert.match(list[0].username, /:telepresenca$/);
  assert.notEqual(list[0].credential, "static-pass");
});
