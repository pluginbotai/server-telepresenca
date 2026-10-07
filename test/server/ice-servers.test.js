import assert from "node:assert/strict";
import { test } from "../helpers/test.js";
import { buildIceServers } from "../../src/ice/ice-servers.js";
import { compileSchema } from "../helpers/load-schema.js";

const validate = compileSchema("schemas/ice-servers.schema.json");

test("STUN only when TURN credentials are missing", () => {
  const iceServers = buildIceServers({
    stunUrls: ["stun:stun.example:80"],
    turnUrls: ["turn:turn.example:80"],
    turnUsername: "",
    turnCredential: "",
  });
  assert.deepEqual(iceServers, [{ urls: "stun:stun.example:80" }]);
  assert.equal(validate({ iceServers }), true);
});

test("TURN entries include username and credential", () => {
  const iceServers = buildIceServers({
    stunUrls: ["stun:stun.example:80"],
    turnUrls: ["turn:turn.example:80", "turns:turn.example:443?transport=tcp"],
    turnUsername: "alice",
    turnCredential: "s3cret",
  });
  assert.equal(iceServers.length, 3);
  assert.equal(iceServers[1].username, "alice");
  assert.equal(iceServers[1].credential, "s3cret");
  assert.equal(validate({ iceServers }), true);
});

test("empty config yields an empty list (LAN host candidates)", () => {
  const iceServers = buildIceServers({
    stunUrls: [],
    turnUrls: [],
    turnUsername: "",
    turnCredential: "",
    turnStaticAuthSecret: "",
    turnRealm: "",
    turnUserId: "telepresenca",
    turnCredentialTtl: 86400,
  });
  assert.deepEqual(iceServers, []);
  assert.equal(validate({ iceServers }), true);
});

test("robot TURN password outlives the operator one", () => {
  const config = {
    stunUrls: [],
    turnUrls: ["turn:turn.example:3478"],
    turnUsername: "",
    turnCredential: "",
    turnStaticAuthSecret: "shared-secret",
    turnRealm: "example.com",
    turnUserId: "telepresenca",
    turnCredentialTtl: 86400,
    turnRobotCredentialTtl: 604800,
  };
  const now = Math.floor(Date.now() / 1000);
  /** @param {Array<{ username?: string }>} list */
  const ttlOf = (list) => Number(String(list[0].username).split(":")[0]) - now;
  assert.ok(
    Math.abs(ttlOf(buildIceServers(config, { role: "operator" })) - 86400) <= 5,
  );
  assert.ok(Math.abs(ttlOf(buildIceServers(config, { role: "robot" })) - 604800) <= 5);
});

test("TURN REST secret generates username with expiry prefix", () => {
  const iceServers = buildIceServers({
    stunUrls: ["stun:stun.example:3478"],
    turnUrls: ["turn:turn.example:3478"],
    turnUsername: "",
    turnCredential: "",
    turnStaticAuthSecret: "local-dev-secret",
    turnRealm: "telepresenca.lan",
    turnUserId: "telepresenca",
    turnCredentialTtl: 86400,
  });
  assert.equal(iceServers.length, 2);
  assert.match(iceServers[1].username, /^\d+:telepresenca$/);
  assert.ok(iceServers[1].credential);
  assert.equal(validate({ iceServers }), true);
});
