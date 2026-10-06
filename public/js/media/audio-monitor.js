/**
 * Monitor de volume e atividade de voz do microfone do operador (VAD leve).
 * Evita oscilação rápida (jitter) de estados de boca/expressão através de hold-time.
 */

/**
 * @typedef {object} AudioPipeline
 * @property {AudioContext} audioCtx
 * @property {AnalyserNode} analyser
 * @property {MediaStreamAudioSourceNode} source
 * @property {ReturnType<typeof setInterval>} sampleInterval
 */

/**
 * @param {MediaStream | null} stream
 * @param {(level: number) => void} onLevel
 * @returns {AudioPipeline | null}
 */
function setupAudioPipeline(stream, onLevel) {
  if (!stream) return null;
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return null;

  try {
    const AudioCtxClass =
      globalThis.AudioContext ||
      /** @type {typeof AudioContext} */ (globalThis.webkitAudioContext);
    if (!AudioCtxClass) return null;

    const audioCtx = new AudioCtxClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const sampleInterval = setInterval(() => {
      analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        sum += buffer[i];
      }
      onLevel(sum / buffer.length);
    }, 100);

    return { audioCtx, source, analyser, sampleInterval };
  } catch (err) {
    console.warn("AudioMonitor setupAudioPipeline falhou:", err);
    return null;
  }
}

/**
 * @param {AudioPipeline | null} pipeline
 */
function teardownAudioPipeline(pipeline) {
  if (!pipeline) return;
  if (pipeline.sampleInterval !== null) {
    clearInterval(pipeline.sampleInterval);
  }
  if (pipeline.source) {
    try {
      pipeline.source.disconnect();
    } catch {
      /* ignore */
    }
  }
  if (pipeline.audioCtx) {
    try {
      pipeline.audioCtx.close().catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

/**
 * @typedef {object} AudioMonitorOptions
 * @property {number} [threshold=12] Limiar RMS para considerar voz ativa
 * @property {number} [holdTimeMs=400] Tempo mínimo de manutenção do estado falando
 * @property {(speaking: boolean) => void} onVoiceStateChange Callback disparado na transição de estado
 */

/**
 * @param {AudioMonitorOptions} [opts]
 */
export function createAudioMonitor(opts = {}) {
  const threshold = typeof opts.threshold === "number" ? opts.threshold : 12;
  const holdTimeMs = typeof opts.holdTimeMs === "number" ? opts.holdTimeMs : 400;
  const onVoiceStateChange =
    typeof opts.onVoiceStateChange === "function" ? opts.onVoiceStateChange : () => {};

  let isSpeaking = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let holdTimer = null;
  /** @type {AudioPipeline | null} */
  let pipeline = null;

  /**
   * @param {number} level
   */
  function processLevel(level) {
    if (level >= threshold) {
      if (holdTimer !== null) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (!isSpeaking) {
        isSpeaking = true;
        onVoiceStateChange(true);
      }
    } else if (isSpeaking && holdTimer === null) {
      holdTimer = setTimeout(() => {
        holdTimer = null;
        isSpeaking = false;
        onVoiceStateChange(false);
      }, holdTimeMs);
    }
  }

  function forceSilence() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (isSpeaking) {
      isSpeaking = false;
      onVoiceStateChange(false);
    }
  }

  return {
    processLevel,
    forceSilence,
    attachStream: (stream) => {
      teardownAudioPipeline(pipeline);
      forceSilence();
      pipeline = setupAudioPipeline(stream, processLevel);
    },
    detachStream: () => {
      teardownAudioPipeline(pipeline);
      pipeline = null;
      forceSilence();
    },
    destroy: () => {
      teardownAudioPipeline(pipeline);
      pipeline = null;
      forceSilence();
    },
    isSpeaking: () => isSpeaking,
  };
}
