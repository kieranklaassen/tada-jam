import { describe, expect, it } from 'vitest'
import * as voices from './voices'
import { LIMITS, type VoiceSpec } from './voices'

// Nobody on the build machine can hear, so every voice is held inside stated
// ranges: no note too loud, too sharp, too low or too long.

function all(): [string, VoiceSpec][] {
  const out: [string, VoiceSpec][] = []
  for (const variant of [0, 1, 2, 3, 7, -1]) {
    for (const speed of [0, 0.5, 1, 4]) out.push([`scrub ${speed} ${variant}`, voices.scrub(speed, variant)])
    out.push([`foamUp ${variant}`, voices.foamUp(variant)], [`rasp ${variant}`, voices.rasp(variant)], [`rinse ${variant}`, voices.rinse(variant)])
    out.push([`spray ${variant}`, voices.spray(variant, false)], [`spray gurgle ${variant}`, voices.spray(variant, true)])
    for (const [name, make] of Object.entries(voices.lather)) out.push([`lather ${name} ${variant}`, make(variant)])
    for (const [name, make] of Object.entries(voices.water)) out.push([`water ${name} ${variant}`, make(variant)])
  }
  for (const t of [-1, 0, 0.3, 1, 2]) out.push([`shine ${t}`, voices.shine(t)], [`pop ${t}`, voices.pop(t)], [`plip ${t}`, voices.plip(t)], [`clack ${t}`, voices.clack(t)], [`slap ${t}`, voices.slap(t)])
  out.push(['scratch', voices.scratch()], ['smear', voices.smear()], ['fizz', voices.fizz()])
  for (const mood of ['call', 'proud', 'plain', 'muddy', 'bubbly', 'wet'] as const) for (const [low, high, hold] of [[147, 175, 0.22], [392, 523, 0.16], [196, 247, 0.34]]) out.push([`horn ${mood} ${low}`, voices.horn(low, high, hold, mood)])
  for (const size of [0, 0.5, 1]) out.push([`rev ${size}`, voices.rev(size)])
  out.push(['brake', voices.brake()], ['splash', voices.splash()], ['shake', voices.shake()], ['settle', voices.settle()], ['clods', voices.clods()], ['drip', voices.drip()], ['clink', voices.clink()], ['squeakLow', voices.squeakLow()], ['puzzled', voices.puzzled(196, 247)])
  for (const [name, make] of Object.entries(voices.feel)) out.push([`feel ${name}`, (make as (n: number) => VoiceSpec)(262)])
  for (const pitch of [147, 262, 523]) for (const [name, make] of Object.entries(voices.face)) out.push([`face ${name} ${pitch}`, (make as (n: number) => VoiceSpec)(pitch)])
  for (const [name, make] of Object.entries(voices.poke)) out.push([`poke ${name}`, make()])
  for (const [name, make] of Object.entries(voices.take)) out.push([`take ${name}`, make()])
  for (const [name, make] of Object.entries(voices.place)) out.push([`place ${name}`, make()])
  return out
}

describe('voices', () => {
  it.each(all())('%s stays inside the stated ranges', (_name, spec) => {
    expect(spec.length).toBeGreaterThan(0)
    expect(spec.length).toBeLessThanOrEqual(LIMITS.notes)
    for (const note of spec) {
      expect(note.pitch).toBeGreaterThanOrEqual(LIMITS.pitch[0])
      expect(note.pitch).toBeLessThanOrEqual(LIMITS.pitch[1])
      if (note.glideTo !== undefined) {
        expect(note.glideTo).toBeGreaterThanOrEqual(LIMITS.pitch[0])
        expect(note.glideTo).toBeLessThanOrEqual(LIMITS.pitch[1])
      }
      expect(note.peak).toBeGreaterThanOrEqual(LIMITS.peak[0])
      expect(note.peak).toBeLessThanOrEqual(LIMITS.peak[1])
      expect(note.attack).toBeGreaterThanOrEqual(LIMITS.attack[0])
      expect(note.attack).toBeLessThanOrEqual(LIMITS.attack[1])
      expect(note.length).toBeGreaterThanOrEqual(LIMITS.length[0])
      expect(note.length).toBeLessThanOrEqual(LIMITS.length[1])
      expect((note.delay ?? 0) + note.attack + note.length).toBeLessThanOrEqual(LIMITS.seconds)
    }
  })

  it('the four variants of a scrub differ, so a rub never repeats one sound', () => {
    const pitches = [0, 1, 2, 3].map((v) => voices.scrub(0.5, v)[0].pitch)
    expect(new Set(pitches).size).toBe(4)
  })

  it('a faster rub scrubs higher, and a later stroke of the cloth squeaks higher', () => {
    expect(voices.scrub(1, 0)[0].pitch).toBeGreaterThan(voices.scrub(0, 0)[0].pitch)
    expect(voices.shine(1)[0].pitch).toBeGreaterThan(voices.shine(0)[0].pitch)
  })

  it('a small bubble pops higher than a big one', () => {
    expect(voices.pop(0)[0].pitch).toBeGreaterThan(voices.pop(1)[0].pitch)
  })
})

describe('the horn of a vehicle that leaves muddy', () => {
  it('is a horn and no verdict: no buzz in it, nothing in it falls, and it ends on the vehicle\'s high note', () => {
    for (const [low, high, hold] of [[147, 175, 0.22], [392, 523, 0.16], [196, 247, 0.34], [262, 330, 0.28]]) {
      const spec = voices.horn(low, high, hold, 'muddy')
      for (const n of spec) {
        expect(n.wave).not.toBe('sawtooth')
        if (n.glideTo !== undefined) expect(n.glideTo).toBeGreaterThan(n.pitch)
        if (n.wave !== 'noise') expect(n.pitch).toBeGreaterThanOrEqual(low * 0.9)
      }
      const last = [...spec].sort((a, b) => (a.delay ?? 0) - (b.delay ?? 0)).at(-1)!
      expect(last.pitch).toBeGreaterThanOrEqual(high)
      // It opens on the vehicle's own toot, as every horn of its does.
      expect(spec[0]).toEqual(voices.horn(low, high, hold, 'plain')[0] && { ...voices.horn(low, high, hold, 'plain')[0], length: spec[0].length })
    }
  })
})
