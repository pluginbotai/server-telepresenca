/**
 * Recuperação de mídia após reconnect do Socket.IO (signaling), não no primeiro join.
 * ICE disconnected: esperar self-heal (~2–3s, RTMA) antes de restartIce/offer.
 */

export const ICE_DISCONNECTED_GRACE_MS = 2500;

/**
 * @param {string} ice
 * @param {string} conn
 * @returns {"skip" | "wait" | "restart" | "offer"}
 */
export function planMediaResumeStep(ice, conn) {
  if (ice === "failed" || conn === "failed") {
    return "restart";
  }
  if (ice === "disconnected" || conn === "disconnected") {
    return "wait";
  }
  if (conn === "connected" && (ice === "connected" || ice === "completed")) {
    return "skip";
  }
  if (conn === "closed" || ice === "closed") {
    return "offer";
  }
  if (ice === "checking" || conn === "connecting" || conn === "new") {
    return "skip";
  }
  return "skip";
}

/**
 * @param {object} runtime
 * @param {{ sleep?: (ms: number) => Promise<void> }} [opts]
 */
export async function resumeCallAfterSignalingReconnect(runtime, opts = {}) {
  const sleep =
    opts.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  if (!runtime.robotPeerPresent) return;

  const pc = runtime.peer.getPc();
  if (!pc) {
    await runtime.beginCallWithRobot();
    return;
  }

  let ice = pc.iceConnectionState;
  let conn = pc.connectionState;
  let step = planMediaResumeStep(ice, conn);

  if (step === "wait") {
    await sleep(ICE_DISCONNECTED_GRACE_MS);
    ice = pc.iceConnectionState;
    conn = pc.connectionState;
    step = planMediaResumeStep(ice, conn);
    if (step === "wait") {
      step = "restart";
    }
  }

  if (step === "skip") return;
  if (step === "restart") {
    await runtime.peer.startCallAsOfferer({ iceRestart: true });
    return;
  }
  if (step === "offer") {
    await runtime.peer.startCallAsOfferer({ iceRestart: false });
  }
}
