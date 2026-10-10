import { savePresetId } from "../features/video-quality.js";
import { applyOutgoingVideoQuality } from "../webrtc/quality.js";
import { resumeCallAfterSignalingReconnect } from "../webrtc/resume-call.js";

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export async function handleQualityPresetChange(runtime, preset) {
  if (!preset || runtime.qualityApplying) return;
  runtime.qualityApplying = true;
  try {
    savePresetId(preset.id);
    runtime.videoQuality.refreshLabels();
    if (runtime.els.qualityBadge) {
      const badge = { auto: "A", low: "L", mid: "M", high: "H", max: "X" };
      runtime.els.qualityBadge.textContent =
        badge[preset.id] || preset.id.slice(0, 1).toUpperCase();
    }
    if (runtime.connected) runtime.signaling.sendVideoQuality(preset.id);
    if (runtime.connected && runtime.signaling.getSocket()) {
      await applyOutgoingVideoQuality(runtime.peer.getPc(), preset);
    }
  } finally {
    runtime.qualityApplying = false;
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export async function resumeCallAfterReconnect(runtime) {
  await resumeCallAfterSignalingReconnect({
    ...runtime,
    beginCallWithRobot: () => beginCallWithRobot(runtime),
  });
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export async function beginCallWithRobot(runtime) {
  if (runtime.callStartInFlight) return;
  runtime.callStartInFlight = true;
  try {
    await runtime.media.ensureMedia({ timeoutMs: 4000 });
    await runtime.peer.startCallAsOfferer();
    runtime.peer.scheduleOfferRetryIfNeeded();
  } finally {
    runtime.callStartInFlight = false;
  }
}

/** @param {import("./runtime.js").OperatorRuntime} runtime */
export function attachCallSetup(runtime) {
  runtime.handleQualityPresetChange = (preset) =>
    handleQualityPresetChange(runtime, preset);
  runtime.beginCallWithRobot = () => beginCallWithRobot(runtime);
}
