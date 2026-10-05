import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function splitCsv(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadEnvFile(env = process.env) {
  const envPath = path.join(ROOT_DIR, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
  return env;
}

/**
 * @typedef {object} AppConfig
 * @property {number} port
 * @property {string | string[]} corsOrigin
 * @property {string[]} stunUrls
 * @property {string[]} turnUrls
 * @property {string} turnUsername
 * @property {string} turnCredential
 * @property {string} turnStaticAuthSecret
 * @property {string} turnRealm
 * @property {string} turnUserId
 * @property {number} turnCredentialTtl
 * @property {number} turnRobotCredentialTtl
 * @property {string} robotsApiUrl
 */

export const DEFAULT_STUN_URLS = Object.freeze([
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun.relay.metered.ca:80",
]);

/**
 * @param {string | undefined} raw
 * @param {number} fallback
 * @returns {number}
 */
function parseIntOr(raw, fallback) {
  return Number.parseInt(raw || "", 10) || fallback;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {AppConfig}
 */
export function loadConfig(env = process.env) {
  const corsRaw = env.CORS_ORIGIN;
  /** @type {string | string[]} */
  let corsOrigin = "*";
  if (typeof corsRaw === "string" && corsRaw.trim() && corsRaw.trim() !== "*") {
    const origins = splitCsv(corsRaw);
    corsOrigin = origins.length <= 1 ? origins[0] || "*" : origins;
  }

  const stunUrls =
    env.STUN_URLS === undefined ? [...DEFAULT_STUN_URLS] : splitCsv(env.STUN_URLS);

  return {
    port: parseIntOr(env.PORT, 4040),
    corsOrigin,
    stunUrls,
    turnUrls: splitCsv(env.TURN_URLS),
    turnUsername: env.TURN_USERNAME || "",
    turnCredential: env.TURN_CREDENTIAL || "",
    turnStaticAuthSecret: env.TURN_STATIC_AUTH_SECRET || "",
    turnRealm: env.TURN_REALM || "telepresenca",
    turnUserId: env.TURN_USER_ID || "telepresenca",
    turnCredentialTtl: parseIntOr(env.TURN_CREDENTIAL_TTL, 86400),
    // O robô só recebe a senha TURN ao entrar na sala e pode esperar dias (waitForOperator).
    turnRobotCredentialTtl: parseIntOr(env.TURN_ROBOT_CREDENTIAL_TTL, 604800),
    robotsApiUrl: (env.ROBOTS_API_URL || "").replace(/\/$/, ""),
  };
}

export { ROOT_DIR };
