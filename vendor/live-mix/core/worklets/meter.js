"use strict";
(() => {
  // src/core/analysis/loudness.ts
  var ABSOLUTE_GATE_LUFS = -70;
  var RELATIVE_GATE_LU = -10;
  var MOMENTARY_WINDOW_SECONDS = 0.4;
  var SHORT_TERM_WINDOW_SECONDS = 3;
  var GATING_HOP_SECONDS = 0.1;
  var LOUDNESS_OFFSET_LU = -0.691;
  var HISTOGRAM_LU_PER_BIN = 0.01;
  var HISTOGRAM_TOP_LUFS = 10;
  var HISTOGRAM_BINS = Math.round((HISTOGRAM_TOP_LUFS - ABSOLUTE_GATE_LUFS) / HISTOGRAM_LU_PER_BIN);
  var SHELF_F0 = 1681.974450955533;
  var SHELF_GAIN_DB = 3.999843853973347;
  var SHELF_Q = 0.7071752369554196;
  var HIGHPASS_F0 = 38.13547087602444;
  var HIGHPASS_Q = 0.5003270373238773;
  function kWeightingCoefficients(sampleRate2) {
    const k = Math.tan(Math.PI * SHELF_F0 / sampleRate2);
    const vh = 10 ** (SHELF_GAIN_DB / 20);
    const vb = vh ** 0.4996667741545416;
    const a0 = 1 + k / SHELF_Q + k * k;
    const shelf = {
      b0: (vh + vb * k / SHELF_Q + k * k) / a0,
      b1: 2 * (k * k - vh) / a0,
      b2: (vh - vb * k / SHELF_Q + k * k) / a0,
      a1: 2 * (k * k - 1) / a0,
      a2: (1 - k / SHELF_Q + k * k) / a0
    };
    const k2 = Math.tan(Math.PI * HIGHPASS_F0 / sampleRate2);
    const a02 = 1 + k2 / HIGHPASS_Q + k2 * k2;
    const highpass = {
      b0: 1,
      b1: -2,
      b2: 1,
      a1: 2 * (k2 * k2 - 1) / a02,
      a2: (1 - k2 / HIGHPASS_Q + k2 * k2) / a02
    };
    return { shelf, highpass };
  }
  var Biquad = class {
    c;
    s1 = 0;
    s2 = 0;
    constructor(coefficients) {
      this.c = coefficients;
    }
    process(x) {
      const c = this.c;
      const y = c.b0 * x + this.s1;
      this.s1 = c.b1 * x - c.a1 * y + this.s2;
      this.s2 = c.b2 * x - c.a2 * y;
      return y;
    }
    reset() {
      this.s1 = 0;
      this.s2 = 0;
    }
  };
  var TRUE_PEAK_FIR_PHASES = [
    [
      0.001708984375,
      0.010986328125,
      -0.0196533203125,
      0.033203125,
      -0.0594482421875,
      0.1373291015625,
      0.97216796875,
      -0.102294921875,
      0.047607421875,
      -0.026611328125,
      0.014892578125,
      -0.00830078125
    ],
    [
      -0.0291748046875,
      0.029296875,
      -0.0517578125,
      0.089111328125,
      -0.16650390625,
      0.465087890625,
      0.77978515625,
      -0.2003173828125,
      0.1015625,
      -0.0582275390625,
      0.0330810546875,
      -0.0189208984375
    ],
    [
      -0.0189208984375,
      0.0330810546875,
      -0.0582275390625,
      0.1015625,
      -0.2003173828125,
      0.77978515625,
      0.465087890625,
      -0.16650390625,
      0.089111328125,
      -0.0517578125,
      0.029296875,
      -0.0291748046875
    ],
    [
      -0.00830078125,
      0.014892578125,
      -0.026611328125,
      0.047607421875,
      -0.102294921875,
      0.97216796875,
      0.1373291015625,
      -0.0594482421875,
      0.033203125,
      -0.0196533203125,
      0.010986328125,
      0.001708984375
    ]
  ];
  var TRUE_PEAK_FIR_TAPS = 12;
  function truePeakOversampling(sampleRate2) {
    if (sampleRate2 < 64e3) return 4;
    if (sampleRate2 < 128e3) return 2;
    return 1;
  }
  var TruePeakDetector = class {
    phases;
    // Twelve samples stored twice so any 12-tap window is contiguous.
    history = new Float64Array(TRUE_PEAK_FIR_TAPS * 2);
    position = 0;
    constructor(sampleRate2) {
      const factor = truePeakOversampling(sampleRate2);
      if (factor === 4) this.phases = TRUE_PEAK_FIR_PHASES;
      else if (factor === 2) this.phases = [TRUE_PEAK_FIR_PHASES[0], TRUE_PEAK_FIR_PHASES[2]];
      else this.phases = [];
    }
    push(x) {
      let peak = Math.abs(x);
      if (this.phases.length === 0) return peak;
      const history = this.history;
      this.position = (this.position + 1) % TRUE_PEAK_FIR_TAPS;
      history[this.position] = x;
      history[this.position + TRUE_PEAK_FIR_TAPS] = x;
      const newest = this.position + TRUE_PEAK_FIR_TAPS;
      for (const phase of this.phases) {
        let y = 0;
        for (let i = 0; i < TRUE_PEAK_FIR_TAPS; i += 1) y += phase[i] * history[newest - i];
        const magnitude = Math.abs(y);
        if (magnitude > peak) peak = magnitude;
      }
      return peak;
    }
    reset() {
      this.history.fill(0);
      this.position = 0;
    }
  };
  function loudnessFromMeanSquare(meanSquare) {
    if (meanSquare <= 0) return -Infinity;
    return LOUDNESS_OFFSET_LU + 10 * Math.log10(meanSquare);
  }
  var LoudnessAnalyzer = class {
    sampleRate;
    hopFrames;
    shelfL;
    shelfR;
    highpassL;
    highpassR;
    truePeakL;
    truePeakR;
    momentaryHops;
    shortTermHops;
    /** Mean square (L + R) of each 100 ms hop, oldest overwritten. */
    hopRing;
    hopIndex = 0;
    hopsSeen = 0;
    hopSum = 0;
    hopCount = 0;
    binCount = new Uint32Array(HISTOGRAM_BINS);
    binPower = new Float64Array(HISTOGRAM_BINS);
    gatedCount = 0;
    gatedPower = 0;
    samplePeakL = 0;
    samplePeakR = 0;
    truePeakMaxL = 0;
    truePeakMaxR = 0;
    maxTruePeak = 0;
    frames = 0;
    constructor(sampleRate2) {
      this.sampleRate = sampleRate2;
      const coefficients = kWeightingCoefficients(sampleRate2);
      this.shelfL = new Biquad(coefficients.shelf);
      this.shelfR = new Biquad(coefficients.shelf);
      this.highpassL = new Biquad(coefficients.highpass);
      this.highpassR = new Biquad(coefficients.highpass);
      this.truePeakL = new TruePeakDetector(sampleRate2);
      this.truePeakR = new TruePeakDetector(sampleRate2);
      this.hopFrames = Math.max(1, Math.round(GATING_HOP_SECONDS * sampleRate2));
      this.momentaryHops = Math.round(MOMENTARY_WINDOW_SECONDS / GATING_HOP_SECONDS);
      this.shortTermHops = Math.round(SHORT_TERM_WINDOW_SECONDS / GATING_HOP_SECONDS);
      this.hopRing = new Float64Array(this.shortTermHops);
    }
    /** Analyse `frames` samples (default: the whole left array); mono input passes the same array twice. */
    process(left, right, frames = left.length) {
      let hopSum = this.hopSum;
      let hopCount = this.hopCount;
      let samplePeakL = this.samplePeakL;
      let samplePeakR = this.samplePeakR;
      let truePeakMaxL = this.truePeakMaxL;
      let truePeakMaxR = this.truePeakMaxR;
      for (let i = 0; i < frames; i += 1) {
        const l = left[i];
        const r = right[i];
        const absL = l < 0 ? -l : l;
        const absR = r < 0 ? -r : r;
        if (absL > samplePeakL) samplePeakL = absL;
        if (absR > samplePeakR) samplePeakR = absR;
        const tpL = this.truePeakL.push(l);
        const tpR = this.truePeakR.push(r);
        if (tpL > truePeakMaxL) truePeakMaxL = tpL;
        if (tpR > truePeakMaxR) truePeakMaxR = tpR;
        const kl = this.highpassL.process(this.shelfL.process(l));
        const kr = this.highpassR.process(this.shelfR.process(r));
        hopSum += kl * kl + kr * kr;
        hopCount += 1;
        if (hopCount === this.hopFrames) {
          this.completeHop(hopSum / hopCount);
          hopSum = 0;
          hopCount = 0;
        }
      }
      this.hopSum = hopSum;
      this.hopCount = hopCount;
      this.samplePeakL = samplePeakL;
      this.samplePeakR = samplePeakR;
      this.truePeakMaxL = truePeakMaxL;
      this.truePeakMaxR = truePeakMaxR;
      const channelMax = truePeakMaxL > truePeakMaxR ? truePeakMaxL : truePeakMaxR;
      if (channelMax > this.maxTruePeak) this.maxTruePeak = channelMax;
      this.frames += frames;
    }
    completeHop(meanSquare) {
      this.hopRing[this.hopIndex] = meanSquare;
      this.hopIndex = (this.hopIndex + 1) % this.shortTermHops;
      this.hopsSeen += 1;
      if (this.hopsSeen < this.momentaryHops) return;
      const block = this.windowMeanSquare(this.momentaryHops);
      const loudness = loudnessFromMeanSquare(block);
      if (loudness <= ABSOLUTE_GATE_LUFS) return;
      let bin = Math.floor((loudness - ABSOLUTE_GATE_LUFS) / HISTOGRAM_LU_PER_BIN);
      if (bin >= HISTOGRAM_BINS) bin = HISTOGRAM_BINS - 1;
      this.binCount[bin] += 1;
      this.binPower[bin] += block;
      this.gatedCount += 1;
      this.gatedPower += block;
    }
    /** Mean of the most recent `hops` hop mean-squares (missing hops count as silence). */
    windowMeanSquare(hops) {
      let sum = 0;
      let index = this.hopIndex;
      for (let n = 0; n < hops; n += 1) {
        index = index === 0 ? this.shortTermHops - 1 : index - 1;
        sum += this.hopRing[index];
      }
      return sum / hops;
    }
    get momentary() {
      return loudnessFromMeanSquare(this.windowMeanSquare(this.momentaryHops));
    }
    get shortTerm() {
      return loudnessFromMeanSquare(this.windowMeanSquare(this.shortTermHops));
    }
    /** Gated integrated loudness of everything since the last reset. */
    get integrated() {
      if (this.gatedCount === 0) return -Infinity;
      const ungated = loudnessFromMeanSquare(this.gatedPower / this.gatedCount);
      const threshold = ungated + RELATIVE_GATE_LU;
      let firstBin = Math.ceil((threshold - ABSOLUTE_GATE_LUFS) / HISTOGRAM_LU_PER_BIN);
      if (firstBin < 0) firstBin = 0;
      let count = 0;
      let power = 0;
      for (let bin = firstBin; bin < HISTOGRAM_BINS; bin += 1) {
        count += this.binCount[bin];
        power += this.binPower[bin];
      }
      return count === 0 ? -Infinity : loudnessFromMeanSquare(power / count);
    }
    get elapsedSec() {
      return this.frames / this.sampleRate;
    }
    /** Snapshot; sample and true peaks restart from zero for the next span. */
    read() {
      const reading = {
        momentary: this.momentary,
        shortTerm: this.shortTerm,
        integrated: this.integrated,
        samplePeak: [this.samplePeakL, this.samplePeakR],
        truePeak: [this.truePeakMaxL, this.truePeakMaxR],
        maxTruePeak: this.maxTruePeak,
        elapsedSec: this.elapsedSec
      };
      this.samplePeakL = 0;
      this.samplePeakR = 0;
      this.truePeakMaxL = 0;
      this.truePeakMaxR = 0;
      return reading;
    }
    /** Forget everything: filters, windows, gating history, peaks. */
    reset() {
      this.shelfL.reset();
      this.shelfR.reset();
      this.highpassL.reset();
      this.highpassR.reset();
      this.truePeakL.reset();
      this.truePeakR.reset();
      this.hopRing.fill(0);
      this.hopIndex = 0;
      this.hopsSeen = 0;
      this.hopSum = 0;
      this.hopCount = 0;
      this.binCount.fill(0);
      this.binPower.fill(0);
      this.gatedCount = 0;
      this.gatedPower = 0;
      this.samplePeakL = 0;
      this.samplePeakR = 0;
      this.truePeakMaxL = 0;
      this.truePeakMaxR = 0;
      this.maxTruePeak = 0;
      this.frames = 0;
    }
  };

  // src/core/analysis/meter-protocol.ts
  var METER_PROCESSOR_NAME = "live-mix-meter";
  var DEFAULT_METER_INTERVAL_MS = 50;
  var MIN_METER_INTERVAL_MS = 1e3 / 30;
  var MAX_METER_INTERVAL_MS = 1e3;
  function clampMeterInterval(intervalMs) {
    if (!Number.isFinite(intervalMs)) return DEFAULT_METER_INTERVAL_MS;
    return Math.min(MAX_METER_INTERVAL_MS, Math.max(MIN_METER_INTERVAL_MS, intervalMs));
  }

  // src/dsp/worklets/meter.processor.ts
  var DEFAULT_RENDER_QUANTUM = 128;
  var MeterProcessor = class extends AudioWorkletProcessor {
    analyzer = new LoudnessAnalyzer(sampleRate);
    intervalFrames = 1;
    framesSincePost = 0;
    alive = true;
    silence = new Float32Array(DEFAULT_RENDER_QUANTUM);
    constructor(options) {
      super();
      const processorOptions = options?.processorOptions;
      this.setInterval(processorOptions?.intervalMs ?? DEFAULT_METER_INTERVAL_MS);
      this.port.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }
    setInterval(intervalMs) {
      this.intervalFrames = Math.max(
        1,
        Math.round(clampMeterInterval(intervalMs) / 1e3 * sampleRate)
      );
    }
    handleMessage(message) {
      switch (message.type) {
        case "reset":
          this.analyzer.reset();
          this.framesSincePost = 0;
          break;
        case "set-interval":
          this.setInterval(message.intervalMs);
          break;
        case "dispose":
          this.alive = false;
          break;
        default: {
          const unhandled = message;
          throw new Error(`live-mix: unhandled meter message ${JSON.stringify(unhandled)}`);
        }
      }
    }
    process(inputs) {
      if (!this.alive) return false;
      const input = inputs[0];
      let frames;
      if (input !== void 0 && input.length > 0) {
        const left = input[0];
        const right = input.length > 1 ? input[1] : left;
        frames = left.length;
        this.analyzer.process(left, right, frames);
      } else {
        frames = this.silence.length;
        this.analyzer.process(this.silence, this.silence, frames);
      }
      if (frames > this.silence.length) this.silence = new Float32Array(frames);
      this.framesSincePost += frames;
      if (this.framesSincePost >= this.intervalFrames) {
        this.framesSincePost = 0;
        const message = { type: "reading", reading: this.analyzer.read() };
        this.port.postMessage(message);
      }
      return true;
    }
  };
  registerProcessor(METER_PROCESSOR_NAME, MeterProcessor);
})();
