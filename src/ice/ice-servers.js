import { ROLE_ROBOT } from "../protocol/events.js";
import { createTurnRestCredentials } from "./turn-rest-credentials.js";

/**
 * @typedef {import("../config.js").AppConfig} AppConfig
 * @typedef {{ urls: string, username?: string, credential?: string }} IceServer
 * @typedef {{ role?: string }} IceServerOptions
 */

/**
 * @param {AppConfig} config
 * @param {IceServerOptions} options
 * @returns {{ username: string, credential: string } | null}
 */
function resolveTurnAuth(config, { role } = {}) {
  if (config.turnStaticAuthSecret) {
    const { username, credential } = createTurnRestCredentials({
      secret: config.turnStaticAuthSecret,
      ttlSeconds:
        role === ROLE_ROBOT ? config.turnRobotCredentialTtl : config.turnCredentialTtl,
      userId: config.turnUserId,
    });
    return { username, credential };
  }
  if (config.turnUsername && config.turnCredential) {
    return {
      username: config.turnUsername,
      credential: config.turnCredential,
    };
  }
  return null;
}

/**
 * Build RTCConfiguration.iceServers from env-backed config.
 * Pure: never reads process.env.
 *
 * @param {AppConfig} config
 * @param {IceServerOptions} [options] `role` escolhe a validade da senha TURN.
 * @returns {IceServer[]}
 */
export function buildIceServers(config, options = {}) {
  /** @type {IceServer[]} */
  const iceServers = [];
  for (const urls of config.stunUrls) {
    iceServers.push({ urls });
  }
  const auth = resolveTurnAuth(config, options);
  if (auth) {
    for (const urls of config.turnUrls) {
      iceServers.push({
        urls,
        username: auth.username,
        credential: auth.credential,
      });
    }
  }
  return iceServers;
}

/**
 * @param {AppConfig} config
 * @returns {(options?: IceServerOptions) => IceServer[]}
 */
export function createIceServersProvider(config) {
  return (options) => buildIceServers(config, options);
}
