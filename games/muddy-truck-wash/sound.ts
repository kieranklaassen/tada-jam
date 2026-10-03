import { tone, type Voice } from './audio'
import type { VoiceSpec } from './voices'

// Turns a voice's numbers into Web Audio nodes for the template's GameAudio.
// A note that is a wave goes through the template's `tone`; a note that is
// noise is a band of white noise with the same envelope.

const buffers = new WeakMap<BaseAudioContext, AudioBuffer>()

function noiseBuffer(context: AudioContext): AudioBuffer {
  let buffer = buffers.get(context)
  if (!buffer) {
    buffer = context.createBuffer(1, Math.round(context.sampleRate * 1.5), context.sampleRate)
    const data = buffer.getChannelData(0)
    // A fixed stream, so the grain is the same on every device.
    let s = 0x1234abcd
    for (let i = 0; i < data.length; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      data[i] = ((s >>> 0) / 2 ** 31) - 1
    }
    buffers.set(context, buffer)
  }
  return buffer
}

/** A voice the template's `GameAudio.play` takes. `gain` scales every peak, for something further away or smaller. */
export function voiced(spec: VoiceSpec, gain = 1): Voice {
  return (context, out, at) => {
    for (const note of spec) {
      const start = at + (note.delay ?? 0), peak = note.peak * gain
      if (note.wave !== 'noise') {
        tone(context, out, start, note.pitch, note.wave, peak, note.attack, note.length, note.glideTo)
        continue
      }
      const source = context.createBufferSource()
      source.buffer = noiseBuffer(context)
      source.loop = true
      const band = context.createBiquadFilter()
      band.type = 'bandpass'
      band.Q.value = note.q ?? 1
      band.frequency.setValueAtTime(note.pitch, start)
      if (note.glideTo) band.frequency.exponentialRampToValueAtTime(note.glideTo, start + note.attack + note.length)
      const level = context.createGain()
      level.gain.setValueAtTime(0.0001, start)
      level.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + note.attack)
      level.gain.exponentialRampToValueAtTime(0.0001, start + note.attack + note.length)
      source.connect(band).connect(level).connect(out)
      // Each note starts somewhere else in the noise, so two never sound the same.
      source.start(start, (start * 7.31) % 1.2)
      source.stop(start + note.attack + note.length + 0.05)
      source.onended = () => {
        source.disconnect()
        band.disconnect()
        level.disconnect()
      }
    }
  }
}
