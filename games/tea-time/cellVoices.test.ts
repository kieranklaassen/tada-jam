import { describe, expect, it } from 'vitest'
import * as cells from './cellVoices'
import { type VoiceKind } from './cellVoices'
import * as first from './voices'
import { LIMITS, lengthOf, type Part, type VoiceSpec } from './voices'
import type { GuestId } from './world'

// As in voices.test.ts: nobody could listen to these where they were written,
// so every voice is held inside the stated ranges at the ends and the middle
// of whatever it takes (a turn, an amount, a level, a kind, a variant).

const amounts = [0, 0.5, 1, -3, 9]
const turns = [0, 1, 2, 7, 31, 400]
const kinds: VoiceKind[] = ['bear', 'mouse', 'hen', 'duckling']
const variants = [0, 1] as const

type Named = [string, VoiceSpec]

/** The voices of the things that take nothing. */
const plain: Record<string, VoiceSpec> = {
  seatClink: cells.seatClink,
  hatPlop: cells.hatPlop,
  stackClap: cells.stackClap,
  hopOn: cells.hopOn,
  hatSlide: cells.hatSlide,
  spoonTinkle: cells.spoonTinkle,
  restClick: cells.restClick,
  noseTing: cells.noseTing,
  steamToot: cells.steamToot,
  bowlGurgle: cells.bowlGurgle,
  risingBubbles: cells.risingBubbles,
  dabSuck: cells.dabSuck,
  squidge: cells.squidge,
  gateBell: cells.gateBell,
}

/** The voices of the things that repeat while a finger moves. */
const turning: Record<string, (turn: number) => VoiceSpec> = {
  ceramicHiss: cells.ceramicHiss,
  whirlHum: cells.whirlHum,
  glassyWhirr: cells.glassyWhirr,
  poolPatter: cells.poolPatter,
  cleanSqueak: cells.cleanSqueak,
  sheetHiss: cells.sheetHiss,
  thinScrape: cells.thinScrape,
  stirTing: cells.stirTing,
  tableRattle: cells.tableRattle,
  insideSlosh: cells.insideSlosh,
  spoutGurgle: cells.spoutGurgle,
  slurp: cells.slurp,
  slowDrip: cells.slowDrip,
  wetShush: cells.wetShush,
  giveBack: cells.giveBack,
  tileRing: cells.tileRing,
}

/** The voices of the things that follow an amount of tea. */
const measured: Record<string, (amount: number) => VoiceSpec> = { slosh: cells.slosh, tipGlug: cells.tipGlug }

/** The eleven guest voices, each as the list of what it can be asked for: one entry for each variant or turn, the same for every kind. */
const guestVoices: Record<string, ((kind: VoiceKind) => VoiceSpec)[]> = {
  pokeCall: variants.map((variant) => (kind: VoiceKind) => cells.pokeCall(kind, variant)),
  streamCall: [cells.streamCall],
  footstep: turns.map((turn) => (kind: VoiceKind) => cells.footstep(kind, turn)),
  squeezePast: [cells.squeezePast],
  giggle: turns.map((turn) => (kind: VoiceKind) => cells.giggle(kind, turn)),
  sipCall: [cells.sipCall],
  shortCall: [cells.shortCall],
  overCall: [cells.overCall],
  waitCall: [cells.waitCall],
  settleCall: [cells.settleCall],
  jokeCall: [cells.jokeCall],
}

const things: Named[] = [
  ...Object.entries(plain),
  ...Object.entries(turning).flatMap(([name, voice]) => turns.map((turn): Named => [`${name} ${turn}`, voice(turn)])),
  ...Object.entries(measured).flatMap(([name, voice]) => amounts.map((amount): Named => [`${name} at ${amount}`, voice(amount)])),
  ...amounts.flatMap((a) => amounts.map((b): Named => [`cupsClink at ${a} and ${b}`, cells.cupsClink(a, b)])),
]

const guests: Named[] = Object.entries(guestVoices).flatMap(([name, forms]) => forms.flatMap((form, i) => kinds.map((kind): Named => [`${name} of the ${kind}, form ${i}`, form(kind)])))

const all: Named[] = [...things, ...guests]

describe('every voice of the grid and the guests', () => {
  it('is in one of the lists above, so none goes unchecked', () => {
    const listed = [...Object.keys(plain), ...Object.keys(turning), ...Object.keys(measured), ...Object.keys(guestVoices), 'cupsClink', 'voiceKindOf']
    expect(Object.keys(cells).sort()).toEqual(listed.sort())
    expect(Object.keys(guestVoices)).toHaveLength(11)
  })

  it.each(all)('%s stays inside the stated ranges', (_name, voice) => {
    expect(voice.length).toBeGreaterThan(0)
    for (const part of voice) {
      for (const pitch of [part.pitch, part.to ?? part.pitch]) {
        expect(pitch).toBeGreaterThanOrEqual(LIMITS.minPitch)
        expect(pitch).toBeLessThanOrEqual(LIMITS.maxPitch)
      }
      expect(part.peak).toBeGreaterThanOrEqual(LIMITS.minPeak)
      expect(part.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
      expect(part.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
      expect(part.decay).toBeGreaterThan(0)
      expect(part.at).toBeGreaterThanOrEqual(0)
      if (part.kind === 'noise') expect(part.q).toBeGreaterThan(0)
      else expect(part.wave).toBeDefined()
    }
    expect(lengthOf(voice)).toBeLessThanOrEqual(LIMITS.maxSeconds)
  })

  it('answers a touch at once: the first part of each starts within a tenth of a second', () => {
    for (const [name, voice] of all) expect(Math.min(...voice.map((part) => part.at)), name).toBeLessThanOrEqual(0.1)
  })

  it('never sums to more than twice the loudest single part allowed, in its first fiftieth of a second', () => {
    for (const [name, voice] of all) {
      const together = voice.filter((part) => part.at < 0.02).reduce((sum, part) => sum + part.peak, 0)
      expect(together, name).toBeLessThanOrEqual(LIMITS.maxPeak * 2)
    }
  })
})

describe('a voice that repeats while the finger moves', () => {
  const repeating: [string, (turn: number) => VoiceSpec][] = [
    ...Object.entries(turning),
    ...kinds.flatMap((kind): [string, (turn: number) => VoiceSpec][] => [
      [`footstep of the ${kind}`, (turn) => cells.footstep(kind, turn)],
      [`giggle of the ${kind}`, (turn) => cells.giggle(kind, turn)],
    ]),
  ]

  it.each(repeating)('%s never plays two neighbouring turns alike', (_name, voice) => {
    for (let turn = 0; turn < 60; turn++) expect(voice(turn)[0].pitch).not.toBe(voice(turn + 1)[0].pitch)
  })
})

describe('the guests', () => {
  const starts = (voice: VoiceSpec) => voice.map((part) => Math.round(part.at * 100))
  const glides = (voice: VoiceSpec) => voice.map((part) => (part.to === undefined || part.to === part.pitch ? 'none' : part.to > part.pitch ? 'up' : 'down'))
  /** What is left of a voice with the pitch taken away: how many parts, when each starts, and which way each bends. */
  const shape = (voice: VoiceSpec) => JSON.stringify([voice.length, starts(voice), glides(voice)])
  const firstTone = (voice: VoiceSpec) => voice.find((part): part is Part => part.kind === 'tone')

  it('speak as four kinds, and both Ducklings as one', () => {
    const who: GuestId[] = ['bear', 'mouse', 'hen', 'duckling-a', 'duckling-b']
    expect(who.map(cells.voiceKindOf)).toEqual(['bear', 'mouse', 'hen', 'duckling', 'duckling'])
  })

  it.each(Object.entries(guestVoices))('%s differs between every two kinds in more than pitch', (_name, forms) => {
    for (const form of forms) {
      for (const a of kinds) for (const b of kinds) if (a < b) expect(shape(form(a)), `${a} and ${b}`).not.toBe(shape(form(b)))
    }
  })

  it.each(Object.entries(guestVoices))('%s is low for the Bear and high for the Mouse', (_name, forms) => {
    for (const form of forms) {
      expect(firstTone(form('bear'))?.pitch).toBeLessThan(220)
      expect(firstTone(form('mouse'))?.pitch).toBeGreaterThan(1300)
    }
  })

  it('have two pokes each, and the two are not the same', () => {
    for (const kind of kinds) expect(JSON.stringify(cells.pokeCall(kind, 0))).not.toBe(JSON.stringify(cells.pokeCall(kind, 1)))
  })
})

describe('two cups clinked together', () => {
  it('ring lower the fuller each is, by the law of a tapped cup', () => {
    let lastA = Infinity
    let lastB = Infinity
    for (let i = 0; i <= 10; i++) {
      const a = cells.cupsClink(i / 10, 0.3)[0].pitch
      const b = cells.cupsClink(0.3, i / 10)[1].pitch
      expect(a).toBe(first.cupRing(i / 10, 1)[0].pitch)
      expect(a).toBeLessThan(lastA)
      expect(b).toBeLessThan(lastB)
      lastA = a
      lastB = b
    }
    expect(cells.cupsClink(0, 0)[0].pitch / cells.cupsClink(1, 0)[0].pitch).toBeGreaterThan(1.3)
  })

  it('has parts for both cups: one cup does not move when the other is filled', () => {
    const empty = cells.cupsClink(0, 0)
    const oneFull = cells.cupsClink(0, 1)
    expect(oneFull[0].pitch).toBe(empty[0].pitch)
    expect(oneFull[1].pitch).toBeLessThan(empty[1].pitch)
    expect(oneFull[0].pitch / oneFull[1].pitch).toBeGreaterThan(1.3)
    // Filled alike they are within a fiftieth of each other, and the second is touched after the first.
    expect(empty[1].pitch / empty[0].pitch).toBeGreaterThan(1)
    expect(empty[1].pitch / empty[0].pitch).toBeLessThan(1.02)
    expect(empty[1].at).toBeGreaterThan(empty[0].at)
  })
})

describe('every cell sounds different', () => {
  // Each voice as it is first heard: turn 0, half an amount, two half cups.
  const mine: Named[] = [
    ...Object.entries(plain),
    ...Object.entries(turning).map(([name, voice]): Named => [name, voice(0)]),
    ...Object.entries(measured).map(([name, voice]): Named => [name, voice(0.5)]),
    ['cupsClink', cells.cupsClink(0.5, 0.5)],
  ]
  const before: Named[] = [
    ['potPress', first.potPress],
    ['plip', first.plip(0.5)],
    ['pat', first.pat],
    ['trickle', first.trickle(0.5, 1, 0)],
    ['glug', first.glug(0)],
    ['patter', first.patter(0)],
    ['cupRing', first.cupRing(0.5, 1)],
    ['lidClick', first.lidClick],
    ['hop', first.hop],
    ['land', first.land],
    ['saucerRattle', first.saucerRattle],
    ['clothThump', first.clothThump],
    ['squelch', first.squelch(0.5)],
    ['squeak', first.squeak(0)],
    ['brush', first.brush],
  ]

  it('checks against every voice of voices.ts', () => {
    const voicesThere = Object.keys(first).filter((name) => name !== 'LIMITS' && name !== 'lengthOf')
    expect(voicesThere.sort()).toEqual(before.map(([name]) => name).sort())
    expect(mine).toHaveLength(33)
  })

  it('no two voices of the things are the same list of parts', () => {
    const seen = new Map<string, string>()
    for (const [name, voice] of [...before, ...mine]) {
      const parts = JSON.stringify(voice)
      expect(seen.get(parts), `${name} is the same as ${seen.get(parts)}`).toBeUndefined()
      seen.set(parts, name)
    }
  })

  it('a saucer rubbed clean is not the sponge squeak: half as high again at the least, a sine, under half as long, and dry', () => {
    for (const turn of turns) {
      const clean = cells.cleanSqueak(turn)
      const sponge = first.squeak(turn)
      expect(clean[0].pitch).toBeGreaterThan(sponge[0].pitch * 1.5)
      expect(clean[0].wave).toBe('sine')
      expect(clean[0].attack + clean[0].decay).toBeLessThan((sponge[0].attack + sponge[0].decay) / 2)
      expect(clean.filter((part) => part.kind === 'noise').every((part) => part.attack + part.decay < 0.03)).toBe(true)
    }
  })
})
