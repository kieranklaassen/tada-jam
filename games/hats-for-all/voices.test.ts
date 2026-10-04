import { describe, expect, it } from 'vitest'
import { CREATURE_KINDS, HAT_KINDS } from './kinds'
import {
  RANGE, babble, bap, bip, bloopBlip, bomBom, chirrup, clap, creak, donk, dwong, flap, fwump, groan, hiss, hoot, hum, paf, pip, plap, plop, pok, pomf, rumble, rustle, thup, trundle,
  scuttle, shoop, squeak, squeal, squelch, thwop, tok, twang, voiceLength, whirr, whistle, zrrp, type Mood, type Partial,
} from './voices'

const MOODS: Mood[] = ['glad', 'grump', 'ask', 'plain']
const COUNTS = [0, 1, 2, 3, 4, 5, 11]

/** Every voice the game can make, by name. */
function everyVoice(): [string, Partial[]][] {
  const all: [string, Partial[]][] = []
  for (const count of COUNTS) {
    all.push([`creak ${count}`, creak(count)], [`squeak ${count}`, squeak(count)], [`scuttle ${count}`, scuttle(count)], [`hoot ${count}`, hoot(count)], [`squeal ${count}`, squeal(count)], [`whirr ${count}`, whirr(count)], [`whistle ${count}`, whistle(count)])
    for (const hat of HAT_KINDS) for (const [name, voice] of [['pok', pok], ['pip', pip], ['bap', bap], ['fwump', fwump], ['plop', plop], ['paf', paf], ['pomf', pomf], ['bloop-blip', bloopBlip], ['plap', plap], ['chirrup', chirrup], ['bom-bom', bomBom]] as const) all.push([`${name} ${hat} ${count}`, voice(hat, count)])
    for (const [name, voice] of [['groan', groan], ['squelch', squelch], ['hiss', hiss], ['thwop', thwop], ['bip', bip], ['shoop', shoop], ['zrrp', zrrp], ['rumble', rumble], ['donk', donk], ['twang', twang], ['dwong', dwong], ['tok', tok], ['flap', flap], ['clap', clap], ['rustle', rustle], ['trundle', trundle], ['thup', thup]] as const) all.push([`${name} ${count}`, voice(count)])
    for (const creature of CREATURE_KINDS) all.push([`hum ${creature} ${count}`, hum(creature, count)])
    for (const creature of CREATURE_KINDS) for (const mood of MOODS) all.push([`babble ${creature} ${mood} ${count}`, babble(creature, mood, count)])
  }
  return all
}

/** The loudest the partials of a voice can add up to at one moment, taking each at its peak for as long as it sounds. */
function loudestSum(partials: readonly Partial[]): number {
  let loudest = 0
  for (const one of partials) {
    const moment = one.at + one.attack
    loudest = Math.max(loudest, partials.filter((p) => p.at <= moment && moment <= p.at + p.attack + p.decay).reduce((sum, p) => sum + p.peak, 0))
  }
  return loudest
}

describe('every voice', () => {
  it('stays inside the stated ranges', () => {
    for (const [name, partials] of everyVoice()) {
      expect(partials.length, name).toBeGreaterThan(0)
      for (const partial of partials) {
        for (const hz of [partial.frequency, partial.glideTo ?? partial.frequency]) {
          expect(hz, name).toBeGreaterThanOrEqual(RANGE.frequency[0])
          expect(hz, name).toBeLessThanOrEqual(RANGE.frequency[1])
        }
        expect(partial.peak, name).toBeGreaterThan(0)
        expect(partial.peak, name).toBeLessThanOrEqual(RANGE.peak)
        expect(partial.attack, name).toBeGreaterThanOrEqual(RANGE.attack[0])
        expect(partial.attack, name).toBeLessThanOrEqual(RANGE.attack[1])
        expect(partial.decay, name).toBeGreaterThan(0)
        expect(partial.at, name).toBeGreaterThanOrEqual(0)
      }
      expect(loudestSum(partials), name).toBeLessThanOrEqual(RANGE.sum)
      expect(voiceLength(partials), name).toBeLessThanOrEqual(RANGE.length)
    }
  })

  it('differs from the one before it', () => {
    expect(pok('cone', 0)[0].frequency).not.toBe(pok('cone', 1)[0].frequency)
    expect(babble('bop', 'glad', 0)[0].frequency).not.toBe(babble('bop', 'glad', 1)[0].frequency)
  })
})

describe('the hats', () => {
  it('each sound their own size, the small dome highest and the tall cone lowest', () => {
    for (const voice of [pok, pip, bap, fwump, plop]) {
      const [cone, dome, brim] = HAT_KINDS.map((hat) => voice(hat, 0)[0].frequency)
      expect(cone).toBeLessThan(brim)
      expect(brim).toBeLessThan(dome)
    }
  })

  it('sound different going out, coming off, landing and going home', () => {
    const first = [pok, pip, bap, fwump, plop].map((voice) => `${voice('brim', 0)[0].kind} ${voice('brim', 0)[0].frequency}`)
    expect(new Set(first).size).toBe(5)
  })
})

describe('the sounds the grid names', () => {
  it('are each their own: no two start on the same kind of sound at the same pitch', () => {
    const voices: [string, Partial[]][] = [
      ['groan', groan(0)], ['paf', paf('brim', 0)], ['pomf', pomf('brim', 0)], ['bloop-blip', bloopBlip('brim', 0)], ['squelch', squelch(0)], ['hiss', hiss(0)], ['plap', plap('brim', 0)],
      ['chirrup', chirrup('brim', 0)], ['bom-bom', bomBom('brim', 0)], ['thwop', thwop(0)], ['bip', bip(0)], ['shoop', shoop(0)], ['zrrp', zrrp(0)], ['rumble', rumble(0)], ['donk', donk(0)],
      ['twang', twang(0)], ['dwong', dwong(0)], ['tok', tok(0)], ['flap', flap(0)], ['clap', clap(0)], ['pok', pok('brim', 0)], ['pip', pip('brim', 0)], ['bap', bap('brim', 0)], ['fwump', fwump('brim', 0)],
      ['plop', plop('brim', 0)], ['creak', creak(0)], ['squeak', squeak(0)], ['squeal', squeal(0)], ['whirr', whirr(0)], ['whistle', whistle(0)], ['hoot', hoot(0)], ['scuttle', scuttle(0)],
    ]
    const shapes = voices.map(([, partials]) => `${partials[0].kind} ${Math.round(partials[0].frequency)} ${Math.round(partials[0].glideTo ?? 0)} ${partials.length}`)
    expect(new Set(shapes).size).toBe(voices.length)
  })

  it('go the way their names say: a groan, a rumble and a donk are low, a chirrup and a shoop rise, a squeal and a whistle fall', () => {
    for (const low of [groan(0), rumble(0), donk(0), dwong(0), bomBom('brim', 0)]) expect(low[0].frequency).toBeLessThan(200)
    for (const up of [chirrup('brim', 0), shoop(0), thwop(0), bloopBlip('brim', 0)]) expect(up[0].glideTo!).toBeGreaterThan(up[0].frequency)
    for (const down of [squeal(0), whistle(0), twang(0), dwong(0)]) expect(down[0].glideTo!).toBeLessThan(down[0].frequency)
    // A hum is in the creature's own voice and ends going up, as a question does.
    expect(hum('wig', 0).at(-1)!.glideTo!).toBeGreaterThan(hum('wig', 0).at(-1)!.frequency)
    expect(hum('pip', 0)[0].frequency).toBeGreaterThan(hum('wig', 0)[0].frequency * 3)
  })
})

describe('the creatures', () => {
  it('each babble in a pitch and a rhythm of their own', () => {
    const pitches = CREATURE_KINDS.map((creature) => babble(creature, 'plain', 0)[0].frequency)
    const rhythms = CREATURE_KINDS.map((creature) => `${babble(creature, 'plain', 0).length} ${babble(creature, 'plain', 0)[0].decay}`)
    expect(new Set(pitches).size).toBe(CREATURE_KINDS.length)
    expect(new Set(rhythms).size).toBe(CREATURE_KINDS.length)
    // No two voices sit within a fifth of a tone of each other.
    const sorted = [...pitches].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] / sorted[i - 1]).toBeGreaterThan(1.3)
  })

  it('end a question going up and a grump going down', () => {
    for (const creature of CREATURE_KINDS) {
      const ask = babble(creature, 'ask', 0).at(-1)!, grump = babble(creature, 'grump', 0).at(-1)!
      expect(ask.glideTo!).toBeGreaterThan(ask.frequency)
      expect(grump.glideTo!).toBeLessThan(grump.frequency)
    }
  })
})
