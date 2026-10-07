/**
 * Decide por qual caminho um comando de controle sai do operador.
 *
 * O DataChannel `control` é não confiável e sem ordem (maxRetransmits: 0), ideal para
 * comandos contínuos (volatile). Comandos de estado como `locomotion.speed.set` são enviados
 * uma única vez: se o pacote se perder, o robô fica com o valor antigo. Por isso vão pelo
 * Socket.IO (confiável e ordenado). O `stop` segue pelos dois caminhos (idempotente).
 *
 * @param {object} args
 * @param {string} args.action
 * @param {unknown} [args.value]
 * @param {{ volatile?: boolean }} [args.opts]
 * @param {(action: string, value?: unknown) => boolean} args.sendP2P
 * @param {(action: string, value?: unknown, opts?: { volatile?: boolean }) => void} args.sendSocket
 */
export function routeControl({ action, value, opts = {}, sendP2P, sendSocket }) {
  if (opts.volatile) {
    if (!sendP2P(action, value)) sendSocket(action, value, opts);
    return;
  }
  if (action === "stop") sendP2P(action, value);
  sendSocket(action, value, opts);
}
