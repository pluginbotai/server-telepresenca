/** Tempo para operador voltar (F5, queda de rede) antes de peer-left / liberar sala. */
export const OPERATOR_DEPARTURE_GRACE_MS = 60_000;

/**
 * @param {import("./store.js").Room | undefined} room
 */
export function clearOperatorDeparture(room) {
  if (!room?.operatorDepartTimer) return;
  clearTimeout(room.operatorDepartTimer);
  room.operatorDepartTimer = null;
}
