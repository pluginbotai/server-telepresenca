import crypto from "node:crypto";

/**
 * Credenciais temporárias compatíveis com coturn (use-auth-secret / static-auth-secret).
 * @see https://github.com/coturn/coturn/blob/master/README.turnserver
 *
 * @param {object} options
 * @param {string} options.secret
 * @param {number} [options.ttlSeconds]
 * @param {string} [options.userId]
 * @param {number} [options.nowSeconds]
 */
export function createTurnRestCredentials({
  secret,
  ttlSeconds = 86400,
  userId = "telepresenca",
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  if (!secret || typeof secret !== "string") {
    throw new Error("TURN secret is required");
  }
  const expiry = nowSeconds + Math.max(60, ttlSeconds);
  const username = `${expiry}:${userId}`;
  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");
  return { username, credential, expiry };
}
