"use strict";
(() => {
  // src/core/automation/Modulator.ts
  function fract(value) {
    return value - Math.floor(value);
  }
  function lfoWaveform(shape, phase) {
    switch (shape) {
      case "sine":
        return Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
      case "triangle": {
        const p = fract(phase);
        if (p < 0.25) return 0.5 + 2 * p;
        if (p < 0.75) return 1.5 - 2 * p;
        return 2 * p - 1.5;
      }
      case "saw":
        return fract(phase);
      case "square":
        return fract(phase) < 0.5 ? 1 : 0;
      default: {
        const exhaustive = shape;
        return exhaustive;
      }
    }
  }
  function breathLaw(breathMod, depth) {
    return 1 - depth * (1 - breathMod);
  }
  function lfoPhaseAt(anchorPhase, anchorSec, rateHz, timeSec) {
    return fract(anchorPhase + (timeSec - anchorSec) * rateHz);
  }
  function hashToUnit(seed, index) {
    let h = (seed ^ Math.imul(index, 2654435769)) >>> 0;
    h = Math.imul(h ^ h >>> 16, 2246822507) >>> 0;
    h = Math.imul(h ^ h >>> 13, 3266489909) >>> 0;
    h = (h ^ h >>> 16) >>> 0;
    return h / 4294967296;
  }
  function randomValueAt(rateHz, seed, smooth, timeSec) {
    const position2 = timeSec * rateHz;
    const index = Math.floor(position2);
    const current = hashToUnit(seed >>> 0, index);
    if (!smooth) return current;
    const next = hashToUnit(seed >>> 0, index + 1);
    return current + (next - current) * (position2 - index);
  }

  // src/core/automation/param-modulation.ts
  function paramModSourceValue(source, timeSec) {
    if (source.kind === "lfo") {
      const phase = lfoPhaseAt(source.anchorPhase, source.anchorSec, source.rateHz, timeSec);
      return breathLaw(lfoWaveform(source.shape, phase), source.depth);
    }
    return randomValueAt(source.rateHz, source.seed, source.smooth, timeSec);
  }
  function paramModOffset(modulation, timeSec) {
    let offset = 0;
    for (const route of modulation.routes) {
      const value = paramModSourceValue(route.source, timeSec);
      offset += route.depth * (route.polarity === "bipolar" ? value * 2 - 1 : value);
    }
    return offset;
  }
  function position(travel, value) {
    if (travel.taper === "log" && travel.min > 0) {
      return Math.log(value / travel.min) / Math.log(travel.max / travel.min);
    }
    return (value - travel.min) / (travel.max - travel.min);
  }
  function valueAt(travel, at) {
    if (travel.taper === "log" && travel.min > 0) {
      return travel.min * Math.pow(travel.max / travel.min, at);
    }
    return travel.min + (travel.max - travel.min) * at;
  }
  function paramValueAtOffset(travel, base, offset) {
    const span = travel.max - travel.min;
    if (!(span > 0)) return travel.min;
    const from = Number.isFinite(base) ? Math.min(travel.max, Math.max(travel.min, base)) : travel.default;
    const moved = Number.isFinite(offset) && offset !== 0;
    const at = moved ? Math.min(1, Math.max(0, position(travel, from) + offset)) : 0;
    const value = moved ? Math.min(travel.max, Math.max(travel.min, valueAt(travel, at))) : from;
    const step = travel.choices?.length ? 1 : travel.step;
    if (step === void 0 || !(step > 0)) return value;
    return Math.min(travel.max, travel.min + Math.round((value - travel.min) / step) * step);
  }
  function modulatedParamValue(travel, base, modulation, timeSec) {
    return paramValueAtOffset(travel, base, paramModOffset(modulation, timeSec));
  }

  // src/core/load-mark.ts
  var LOAD_CELL_BUSY = 0;
  function loadCells(slot) {
    return slot && slot.slot > 0 ? new Int32Array(slot.buffer) : null;
  }

  // src/dsp/abi.ts
  var WASM_DEVICE_PROCESSOR_NAME = "live-mix-wasm-device";
  var BYPASS_RAMP_SECONDS = 5e-3;

  // src/dsp/zones/zone-map.ts
  var ZONE_FIELD_COUNT = 20;

  // src/dsp/zones/device.ts
  function beginDeviceZones(device) {
    device.device_zones_begin?.();
  }
  function writeDeviceZoneSample(device, channels, sampleRate2) {
    const { device_zone_sample, device_zone_sample_buffer } = device;
    if (!device_zone_sample || !device_zone_sample_buffer || channels.length === 0) return -1;
    const frames = channels[0].length;
    const count = Math.min(channels.length, 2);
    const index = device_zone_sample(frames, count, sampleRate2);
    if (index < 0) return -1;
    const store = new Float32Array(
      device.memory.buffer,
      device_zone_sample_buffer(index),
      frames * count
    );
    for (let channel = 0; channel < count; channel += 1) {
      store.set(channels[channel].subarray(0, frames), channel * frames);
    }
    return index;
  }
  function addDeviceZones(device, fields) {
    const { device_zone_fields, device_zone_add } = device;
    if (!device_zone_fields || !device_zone_add) return 0;
    const scratch = new Float32Array(device.memory.buffer, device_zone_fields(), ZONE_FIELD_COUNT);
    let added = 0;
    for (let at = 0; at + ZONE_FIELD_COUNT <= fields.length; at += ZONE_FIELD_COUNT) {
      scratch.set(fields.subarray(at, at + ZONE_FIELD_COUNT));
      if (device_zone_add() >= 0) added += 1;
    }
    return added;
  }

  // src/dsp/worklets/wasm-device.processor.ts
  var WasmDeviceProcessor = class extends AudioWorkletProcessor {
    // Null once the host has disposed the device: the instance and its memory are let go of there and then.
    device;
    maxBlockFrames;
    outLeft = new Float32Array(0);
    outRight = new Float32Array(0);
    inLeft = new Float32Array(0);
    inRight = new Float32Array(0);
    // Dry copies for the bypass crossfade; the device clears its input buffers.
    dryLeft = new Float32Array(0);
    dryRight = new Float32Array(0);
    // The dry signal of the last `latencySamples` frames, as a ring: the dry copy
    // is as late as the device's own output, so a bypass moves nothing in time.
    // Empty for a device that reports no latency.
    heldLeft;
    heldRight;
    heldAt = 0;
    // 0 = fully processed, 1 = fully dry. Ramps per sample toward the target.
    bypassMix = 0;
    bypassTarget = 0;
    bypassStep;
    // Meters are reported only while the main thread watches them.
    meterCount = 0;
    meterInterval = 0;
    meterElapsed = 0;
    // False when a sound of the instrument being loaded did not fit: its zones
    // name their sounds by position, so none of them is added.
    zonesWhole = true;
    // False once the host has disposed the device: `process` then ends the node.
    running = true;
    // Where this processor shows that it is at work, for the engine's load figure.
    load;
    loadMark;
    // The parameters moved on this thread. Replaced, never changed in place, by a message between blocks.
    modulated = [];
    constructor(options) {
      super();
      const processorOptions = options?.processorOptions;
      if (!processorOptions?.module) {
        throw new Error("live-mix: WasmDeviceProcessor needs processorOptions.module");
      }
      const instance = new WebAssembly.Instance(processorOptions.module, {});
      const device = instance.exports;
      this.device = device;
      device._initialize?.();
      this.maxBlockFrames = device.device_max_block_frames();
      device.device_init(sampleRate, this.maxBlockFrames);
      for (const [paramId, value] of processorOptions.params ?? []) {
        device.device_set_param(paramId, value);
      }
      this.modulated = (processorOptions.modulations ?? []).map((entry) => ({
        ...entry,
        last: Number.NaN
      }));
      this.bypassStep = 1 / Math.max(1, BYPASS_RAMP_SECONDS * sampleRate);
      if (processorOptions.bypassed) {
        this.bypassMix = 1;
        this.bypassTarget = 1;
      }
      const held = Math.max(0, Math.floor(processorOptions.latencySamples ?? 0));
      this.heldLeft = new Float32Array(held);
      this.heldRight = new Float32Array(held);
      this.load = loadCells(processorOptions.load);
      this.loadMark = processorOptions.load?.slot ?? 0;
      this.port.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      const ready = {
        type: "ready",
        deviceId: processorOptions.deviceId ?? "unknown",
        maxBlockFrames: this.maxBlockFrames
      };
      this.port.postMessage(ready);
    }
    handleMessage(message) {
      const device = this.device;
      if (!device) return;
      switch (message.type) {
        case "set-param": {
          const moved = this.modulated.find((entry) => entry.paramId === message.paramId);
          if (moved) moved.base = message.value;
          else device.device_set_param(message.paramId, message.value);
          break;
        }
        case "modulate": {
          const others = this.modulated.filter((entry) => entry.paramId !== message.paramId);
          if (message.modulation) {
            this.modulated = [
              ...others,
              {
                paramId: message.paramId,
                travel: message.travel,
                base: message.base,
                modulation: message.modulation,
                last: Number.NaN
              }
            ];
          } else {
            this.modulated = others;
            device.device_set_param(message.paramId, message.base);
          }
          break;
        }
        case "bypass":
          this.bypassTarget = message.enabled ? 1 : 0;
          break;
        case "note-on":
          device.device_note_on?.(message.noteId, message.frequency, message.gain);
          break;
        case "note-off":
          device.device_note_off?.(message.noteId);
          break;
        case "sample":
          this.loadSample(device, message.channels, message.sampleRate);
          break;
        // An instrument arrives as one message a sound, so the copies are
        // spread over as many gaps between blocks as the thread allows.
        case "zones-begin":
          beginDeviceZones(device);
          this.zonesWhole = true;
          break;
        case "zone-sample":
          if (writeDeviceZoneSample(device, message.channels, message.sampleRate) < 0) {
            this.zonesWhole = false;
          }
          break;
        case "zones":
          if (this.zonesWhole) addDeviceZones(device, message.fields);
          else beginDeviceZones(device);
          break;
        case "meters":
          this.meterCount = device.device_meter ? Math.max(0, Math.floor(message.count)) : 0;
          this.meterInterval = Math.max(1, Math.floor(message.intervalFrames));
          this.meterElapsed = this.meterInterval;
          break;
        case "dispose":
          this.running = false;
          this.release();
          break;
        default: {
          const unhandled = message;
          throw new Error(`live-mix: unhandled device message ${JSON.stringify(unhandled)}`);
        }
      }
    }
    // Let go of the instance and of every view into its memory, so the memory
    // can be reclaimed now. `process` returning false is not enough: a context
    // that has stopped rendering (an offline one, once its render is done) never
    // calls it again, its processors live as long as the page, and a browser has
    // room for only so many WASM memories at a time. Renders past that would
    // come out silent.
    release() {
      this.device = null;
      const none = new Float32Array(0);
      this.outLeft = none;
      this.outRight = none;
      this.inLeft = none;
      this.inRight = none;
      this.dryLeft = none;
      this.dryRight = none;
      this.heldLeft = none;
      this.heldRight = none;
    }
    // Give the device each moved parameter's value for the block that starts at `frame`.
    modulate(device, frame) {
      const timeSec = frame / sampleRate;
      for (const entry of this.modulated) {
        const value = modulatedParamValue(entry.travel, entry.base, entry.modulation, timeSec);
        if (value === entry.last) continue;
        entry.last = value;
        device.device_set_param(entry.paramId, value);
      }
    }
    // Copy a sound into a sample device's fixed store (cpp/kit/sample.h).
    // Runs between blocks on the audio thread; anything past the device's
    // capacity is dropped. Devices without the exports ignore the message.
    loadSample(device, channels, rate) {
      const { device_sample_capacity, device_sample_buffer, device_sample_commit } = device;
      if (!device_sample_capacity || !device_sample_buffer || !device_sample_commit) return;
      if (channels.length === 0) return;
      const capacity = device_sample_capacity();
      const frames = Math.min(channels[0].length, capacity);
      const count = Math.min(channels.length, 2);
      const store = new Float32Array(device.memory.buffer, device_sample_buffer(), capacity * 2);
      for (let channel = 0; channel < count; channel += 1) {
        store.set(channels[channel].subarray(0, frames), channel * capacity);
      }
      device_sample_commit(frames, count, rate);
    }
    // Read the device's meters and post them, once every `meterInterval` frames.
    reportMeters(device, frames) {
      this.meterElapsed += frames;
      if (this.meterElapsed < this.meterInterval) return;
      this.meterElapsed = 0;
      const read = device.device_meter;
      if (!read) return;
      const values = [];
      for (let index = 0; index < this.meterCount; index += 1) values.push(read(index));
      this.port.postMessage({ type: "meters", values });
    }
    process(inputs, outputs) {
      const device = this.device;
      if (!this.running || !device) return false;
      const load = this.load;
      if (!load) return this.render(device, inputs, outputs);
      Atomics.store(load, LOAD_CELL_BUSY, this.loadMark);
      const alive = this.render(device, inputs, outputs);
      Atomics.store(load, LOAD_CELL_BUSY, 0);
      return alive;
    }
    // Trade each dry sample for the one from `latencySamples` frames ago. Run on
    // every block, bypassed or not, so the held sound is the right one the moment
    // a bypass begins.
    holdDryBack(frames) {
      const heldLeft = this.heldLeft;
      const size = heldLeft.length;
      if (size === 0) return;
      const heldRight = this.heldRight;
      const dryLeft = this.dryLeft;
      const dryRight = this.dryRight;
      let at = this.heldAt;
      for (let i = 0; i < frames; i += 1) {
        const left = heldLeft[at];
        const right = heldRight[at];
        heldLeft[at] = dryLeft[i];
        heldRight[at] = dryRight[i];
        dryLeft[i] = left;
        dryRight[i] = right;
        at += 1;
        if (at === size) at = 0;
      }
      this.heldAt = at;
    }
    render(device, inputs, outputs) {
      const output = outputs[0];
      if (!output || output.length === 0) return true;
      const frames = Math.min(output[0].length, this.maxBlockFrames);
      if (this.outLeft.length !== frames) {
        const memory = device.memory.buffer;
        this.outLeft = new Float32Array(memory, device.device_out_left(), frames);
        this.outRight = new Float32Array(memory, device.device_out_right(), frames);
        this.inLeft = new Float32Array(memory, device.device_in_left(), frames);
        this.inRight = new Float32Array(memory, device.device_in_right(), frames);
        this.dryLeft = new Float32Array(frames);
        this.dryRight = new Float32Array(frames);
      }
      const input = inputs[0];
      const hasInput = input !== void 0 && input.length > 0;
      if (hasInput) {
        const left = input[0].subarray(0, frames);
        const right = (input.length > 1 ? input[1] : input[0]).subarray(0, frames);
        this.inLeft.set(left);
        this.inRight.set(right);
        this.dryLeft.set(left);
        this.dryRight.set(right);
      } else {
        this.dryLeft.fill(0);
        this.dryRight.fill(0);
      }
      this.holdDryBack(frames);
      if (this.modulated.length > 0) this.modulate(device, currentFrame);
      device.device_process(frames);
      if (this.meterCount > 0) this.reportMeters(device, frames);
      const outLeft = output[0];
      const outRight = output.length > 1 ? output[1] : null;
      if (this.bypassMix === this.bypassTarget && this.bypassMix === 0) {
        outLeft.set(this.outLeft);
        outRight?.set(this.outRight);
        return true;
      }
      for (let i = 0; i < frames; i += 1) {
        if (this.bypassMix < this.bypassTarget) {
          this.bypassMix = Math.min(this.bypassTarget, this.bypassMix + this.bypassStep);
        } else if (this.bypassMix > this.bypassTarget) {
          this.bypassMix = Math.max(this.bypassTarget, this.bypassMix - this.bypassStep);
        }
        const wet = 1 - this.bypassMix;
        outLeft[i] = processed(this.outLeft[i], wet) + this.dryLeft[i] * this.bypassMix;
        if (outRight) {
          outRight[i] = processed(this.outRight[i], wet) + this.dryRight[i] * this.bypassMix;
        }
      }
      return true;
    }
  };
  function processed(sample, wet) {
    return wet < 1 && !Number.isFinite(sample) ? 0 : sample * wet;
  }
  registerProcessor(WASM_DEVICE_PROCESSOR_NAME, WasmDeviceProcessor);
})();
