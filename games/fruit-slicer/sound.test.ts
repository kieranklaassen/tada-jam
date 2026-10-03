import { describe, expect, it } from 'vitest'
import { NOISE_Q, voiceOf } from './sound'
import { VOICES, notesOf, type VoiceId } from './voices'

type Made = { kind: 'tone' | 'noise'; args: unknown[] }
function recorder() {
  const made: Made[] = []
  const make = {
    tone: (...args: unknown[]) => void made.push({ kind: 'tone', args: args.slice(2) }),
    noise: (...args: unknown[]) => void made.push({ kind: 'noise', args: args.slice(2) }),
  }
  return { made, make: make as unknown as Parameters<typeof voiceOf>[1] }
}
const context = {} as AudioContext, out = {} as AudioNode

describe('the bridge from numbers to sound', () => {
  it('plays a tone as pitch, wave, peak, attack, length and glide, at its own delay after the touch', () => {
    const r = recorder()
    voiceOf([{ kind: 'tone', hz: 440, to: 220, wave: 'square', peak: 0.2, attack: 0.01, length: 0.3, after: 0.05 }], r.make)(context, out, 10)
    expect(r.made).toEqual([{ kind: 'tone', args: [10.05, 440, 'square', 0.2, 0.01, 0.3, 220] }])
  })

  it('plays a noise as a wide band round its pitch, and a note with no delay at the touch', () => {
    const r = recorder()
    voiceOf([{ kind: 'noise', hz: 900, peak: 0.1, attack: 0.02, length: 0.2 }], r.make)(context, out, 3)
    expect(r.made).toEqual([{ kind: 'noise', args: [3, 900, NOISE_Q, 0.1, 0.02, 0.2, undefined] }])
  })

  it('plays every note of every voice, and adds none', () => {
    for (const id of Object.keys(VOICES) as VoiceId[]) {
      const r = recorder()
      const notes = notesOf(id, 600, 4)
      voiceOf(notes, r.make)(context, out, 0)
      expect(r.made.map((one) => one.kind), id).toEqual(notes.map((note) => note.kind))
    }
  })
})
