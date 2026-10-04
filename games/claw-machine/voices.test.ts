import { describe, expect, it } from 'vitest'
import type { GameEvent } from './events'
import { GOBBLER, GOBBLERS } from './gobblers'
import { RANGE, TRAY_NOTES, voiceOf } from './voices'

type Samples = { [T in GameEvent['type']]: Extract<GameEvent, { type: T }>[] }

/** Every happening, at the ends of whatever it varies in. A new kind of event does not compile until it is listed here. */
const SAMPLES: Samples = {
  chirp: [{ type: 'chirp', distance: 0 }, { type: 'chirp', distance: 60 }],
  tick: [{ type: 'tick' }], clack: [{ type: 'clack' }], bite: [{ type: 'bite' }],
  ratchet: [{ type: 'ratchet', progress: 0, heavy: 0 }, { type: 'ratchet', progress: 1, heavy: 2 }],
  'let-go': [{ type: 'let-go' }],
  pop: [{ type: 'pop', heavy: 1, level: 0 }, { type: 'pop', heavy: 2, level: 2 }],
  settle: [{ type: 'settle' }],
  bonk: TRAY_NOTES.map((_, column) => ({ type: 'bonk' as const, column })),
  click: [{ type: 'click', heavy: 1, level: 0 }, { type: 'click', heavy: 2, level: 2 }],
  boing: [{ type: 'boing' }], teeter: [{ type: 'teeter' }], knock: [{ type: 'knock' }],
  domino: [{ type: 'domino', nth: 0 }, { type: 'domino', nth: 2 }],
  rattle: [{ type: 'rattle', speed: 0 }, { type: 'rattle', speed: 60 }],
  jaws: [{ type: 'jaws' }],
  catch: [{ type: 'catch', heavy: 1 }, { type: 'catch', heavy: 2 }],
  chomp: GOBBLERS.map((who) => ({ type: 'chomp' as const, heavy: 1, who })),
  gulp: GOBBLERS.flatMap((who) => [{ type: 'gulp' as const, heavy: 1, who }, { type: 'gulp' as const, heavy: 2, who }]),
  plink: [{ type: 'plink', nth: 0 }, { type: 'plink', nth: 5 }],
  hmm: GOBBLERS.map((who) => ({ type: 'hmm' as const, who })),
  wrong: GOBBLERS.map((who) => ({ type: 'wrong' as const, way: GOBBLER[who].wrong })),
  groan: [{ type: 'groan' }],
  lifted: GOBBLERS.map((who) => ({ type: 'lifted' as const, way: GOBBLER[who].lifted })),
  thud: GOBBLERS.map((who) => ({ type: 'thud' as const, who })),
  squeak: GOBBLERS.map((who) => ({ type: 'squeak' as const, who })),
  snap: [{ type: 'snap' }],
  gargle: GOBBLERS.map((who) => ({ type: 'gargle' as const, who })),
  cork: [{ type: 'cork' }], clank: [{ type: 'clank' }], slap: [{ type: 'slap' }], whistle: [{ type: 'whistle' }], grunt: [{ type: 'grunt' }], huff: [{ type: 'huff' }],
  creak: [{ type: 'creak', nth: 0 }, { type: 'creak', nth: 2 }],
  stare: [{ type: 'stare' }], 'gate-rattle': [{ type: 'gate-rattle' }],
  ping: [{ type: 'ping', nth: 0 }, { type: 'ping', nth: 2 }],
  scrape: [{ type: 'scrape' }], comb: [{ type: 'comb' }], 'gate-creak': [{ type: 'gate-creak' }],
  bell: [{ type: 'bell' }],
  peep: [{ type: 'peep' }], giggle: [{ type: 'giggle' }], 'double-ding': [{ type: 'double-ding' }], zip: [{ type: 'zip' }], 'rim-thud': [{ type: 'rim-thud' }], 'bell-hum': [{ type: 'bell-hum' }],
  'jaw-hum': [{ type: 'jaw-hum' }], 'jaw-click': [{ type: 'jaw-click' }], wind: [{ type: 'wind' }],
  show: GOBBLERS.map((who) => ({ type: 'show' as const, who })),
  tip: [{ type: 'tip', nth: 0 }, { type: 'tip', nth: 4 }],
  waddle: [{ type: 'waddle' }],
  'hop-in': [{ type: 'hop-in', nth: 0 }, { type: 'hop-in', nth: 2 }],
  grow: [{ type: 'grow' }],
  ring: [{ type: 'ring', size: 'big', kind: 'duck', nth: 0 }, { type: 'ring', size: 'small', kind: 'car', nth: 3 }, { type: 'ring', size: 'small', kind: 'rocket', nth: 5 }],
  burp: [{ type: 'burp', nth: 0 }, { type: 'burp', nth: 2 }],
  'slide-in': [{ type: 'slide-in' }], pour: [{ type: 'pour' }],
}
const EVERY: GameEvent[] = Object.values(SAMPLES).flat()

/** The sound of each cell of the grid: the events a child hears when the claw meets each thing in each way. */
const GRID: GameEvent[][][] = [
  // A toy on the tray.
  [[{ type: 'pop', heavy: 1, level: 0 }], [{ type: 'click', heavy: 1, level: 1 }], [{ type: 'click', heavy: 2, level: 1 }], [{ type: 'knock' }], [{ type: 'jaw-hum' }]],
  // Bare studs.
  [[{ type: 'bonk', column: 2 }], [{ type: 'click', heavy: 1, level: 0 }], [{ type: 'click', heavy: 2, level: 0 }], [{ type: 'rattle', speed: 20 }], [{ type: 'jaw-click' }]],
  // A stack of toys.
  [[{ type: 'pop', heavy: 1, level: 1 }, { type: 'settle' }], [{ type: 'click', heavy: 1, level: 2 }], [{ type: 'teeter' }], [{ type: 'domino', nth: 0 }], [{ type: 'wind' }]],
  // A gobbler.
  [[{ type: 'groan' }, { type: 'lifted', way: 'spins' }], [{ type: 'gulp', heavy: 1, who: 'red' }], [{ type: 'gulp', heavy: 2, who: 'red' }], [{ type: 'squeak', who: 'red' }], [{ type: 'gargle', who: 'red' }]],
  // The ledge where the next ones wait.
  [[{ type: 'cork' }], [{ type: 'slap' }, { type: 'whistle' }], [{ type: 'grunt' }, { type: 'huff' }], [{ type: 'creak', nth: 0 }], [{ type: 'stare' }]],
  // The ledge with no one on it.
  [[{ type: 'gate-rattle' }], [{ type: 'ping', nth: 0 }], [{ type: 'scrape' }], [{ type: 'comb' }], [{ type: 'gate-creak' }]],
  // The end of the rail.
  [[{ type: 'bell' }], [{ type: 'zip' }], [{ type: 'rim-thud' }], [{ type: 'double-ding' }], [{ type: 'bell-hum' }]],
]

describe('the voices', () => {
  it('keeps every part of every voice inside the stated ranges', () => {
    for (const event of EVERY) {
      const parts = voiceOf(event)
      expect(parts.length, event.type).toBeGreaterThan(0)
      for (const part of parts) {
        for (const hz of [part.freq, part.to ?? part.freq]) {
          expect(hz, event.type).toBeGreaterThanOrEqual(RANGE.lowHz)
          expect(hz, event.type).toBeLessThanOrEqual(RANGE.highHz)
        }
        expect(part.peak).toBeGreaterThan(0)
        expect(part.peak, event.type).toBeLessThanOrEqual(RANGE.mostPeak)
        expect(part.attack).toBeGreaterThanOrEqual(RANGE.leastAttack)
        expect((part.delay ?? 0) + part.attack + part.decay, event.type).toBeLessThanOrEqual(RANGE.longest)
      }
    }
  })

  it('never lets two different happenings share a voice', () => {
    const seen = new Map<string, string>()
    for (const event of EVERY) {
      const voice = JSON.stringify(voiceOf(event)), what = JSON.stringify(event)
      expect(seen.get(voice) ?? what).toBe(what)
      seen.set(voice, what)
    }
  })

  it('gives every cell of the grid a sound, and no two cells the same one', () => {
    const cells = GRID.flat().map((events) => JSON.stringify(events.map(voiceOf)))
    expect(cells.length).toBe(35)
    for (const events of GRID.flat()) expect(events.flatMap(voiceOf).length).toBeGreaterThan(0)
    expect(new Set(cells).size).toBe(35)
  })

  it('gives every gobbler its own voice, its own way with a wrong toy and its own way of being lifted', () => {
    for (const type of ['chomp', 'gulp', 'hmm', 'thud', 'squeak', 'gargle', 'show', 'wrong', 'lifted'] as const) {
      const voices = GOBBLERS.map((who) => JSON.stringify(voiceOf(SAMPLES[type].find((event) => ('who' in event ? event.who === who : 'way' in event && (event.way === GOBBLER[who].wrong || event.way === GOBBLER[who].lifted)))!)))
      expect(new Set(voices).size, type).toBe(GOBBLERS.length)
    }
  })

  it('rings a higher note for each column of the tray', () => {
    const notes = TRAY_NOTES.map((_, column) => voiceOf({ type: 'bonk', column })[0].freq)
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1])
  })

  it('pitches by weight and by height: a big toy lower, a stack higher, the hoist higher as it climbs', () => {
    expect(voiceOf({ type: 'pop', heavy: 2, level: 0 })[0].freq).toBeLessThan(voiceOf({ type: 'pop', heavy: 1, level: 0 })[0].freq)
    expect(voiceOf({ type: 'pop', heavy: 1, level: 1 })[0].freq).toBeGreaterThan(voiceOf({ type: 'pop', heavy: 1, level: 0 })[0].freq)
    expect(voiceOf({ type: 'click', heavy: 2, level: 0 })[1].freq).toBeLessThan(voiceOf({ type: 'click', heavy: 1, level: 0 })[1].freq)
    expect(voiceOf({ type: 'click', heavy: 1, level: 2 })[0].freq).toBeGreaterThan(voiceOf({ type: 'click', heavy: 1, level: 0 })[0].freq)
    expect(voiceOf({ type: 'ratchet', progress: 1, heavy: 1 })[0].freq).toBeGreaterThan(voiceOf({ type: 'ratchet', progress: 0, heavy: 1 })[0].freq)
    // The ending's tune: low for a big toy and high for a small one.
    expect(voiceOf({ type: 'ring', size: 'big', kind: 'duck', nth: 0 })[0].freq).toBeLessThan(voiceOf({ type: 'ring', size: 'small', kind: 'duck', nth: 0 })[0].freq)
    expect(voiceOf({ type: 'ring', size: 'big', kind: 'duck', nth: 0 })[0].wave).not.toBe(voiceOf({ type: 'ring', size: 'big', kind: 'car', nth: 0 })[0].wave)
  })
})
