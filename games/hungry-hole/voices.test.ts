import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { KIND, KINDS } from './kinds'
import { bobSeconds } from './motion'
import { BOUNCE_SECONDS, type Cue } from './play'
import { MOST_NOTES, TAKES, notesFor, notesOf, pitchOf } from './voices'

// Nobody has listened to these sounds. What can be held without an ear is
// held here: every note is in a range a tablet's speaker plays and a child's
// ear takes without a start, and each thing sounds unlike the others.

/** What a finger sets off in the frame it lands or lifts. */
const TOUCH: Cue[] = [
  { type: 'slide' }, { type: 'pucker' }, { type: 'hiccup' },
  ...KINDS.flatMap((kind): Cue[] => [{ type: 'poke', kind }, { type: 'poke', kind, deep: true }, { type: 'strain', kind }, { type: 'teeter', kind }, { type: 'drop', kind }, { type: 'burp', kind, onto: null, rest: 0 }]),
  ...KINDS.flatMap((kind): Cue[] => KINDS.map((onto): Cue => ({ type: 'burp', kind, onto, rest: 1 }))),
  { type: 'bystander', who: 'mayor', head: -1 }, { type: 'bystander', who: 'keeper', head: -1 }, { type: 'bystander', who: 'crowd', head: 3 }, { type: 'bystander', who: 'gate', head: -1 },
  ...KINDS.map((kind): Cue => ({ type: 'growl', kind })),
]
/** What follows by itself: a stack bobbing, let down and walking, the secrets, and the two scenes. */
const FOLLOWS: Cue[] = [
  { type: 'setdown', parts: ['pie'], x: 0, z: 0 }, { type: 'setdown', parts: ['dog', 'hat', 'tuba', 'pie', 'pie', 'balloon', 'drummer', 'pie', 'dog', 'dog'], x: 0, z: 0 },
  { type: 'bob', parts: ['dog', 'tuba'] }, { type: 'bob', parts: ['pie', 'drummer'] }, { type: 'bob', parts: ['hat', 'balloon'] }, { type: 'bob', parts: ['dog', 'tuba', 'drummer', 'balloon'] }, { type: 'bob', parts: ['tuba', 'drummer', 'balloon'] }, { type: 'bob', parts: ['tuba', 'balloon'] },
  ...KINDS.flatMap((kind): Cue[] => [0, 1].map((step): Cue => ({ type: 'step', parts: [kind, 'pie'], step, x: 0, z: 0 }))),
  { type: 'step', parts: ['dog', 'tuba', 'drummer'], step: 3, x: 0, z: 0 },
  { type: 'secret', which: 'march' }, { type: 'secret', which: 'bounce' }, { type: 'secret', which: 'peek' },
  { type: 'muffled', tuba: false }, { type: 'muffled', tuba: true },
  { type: 'thud', parts: ['pie', 'hat'], x: 0, z: 0 }, { type: 'clunk' },
  ...KINDS.flatMap((kind): Cue[] => [{ type: 'burp', kind, onto: null, rest: 0, late: true }, { type: 'burp', kind, onto: 'pie', rest: 1, late: true }]),
  ...KINDS.flatMap((kind): Cue[] => [{ type: 'clack', kind }, { type: 'pass', kind }, { type: 'arrive', kind }, { type: 'loose', kind }, { type: 'roll', kind, step: 0 }, { type: 'roll', kind, step: 1 }]),
  { type: 'gate', open: true }, { type: 'gate', open: false },
]
const ALL: Cue[] = [...TOUCH, ...FOLLOWS]

const ends = (note: Note): number => (note.delay ?? 0) + note.attack + note.decay
const shape = (notes: readonly Note[]): string => JSON.stringify(notes)
/** The mayor's voice: a reedy note that comes after the thing's own sound. */
const mayors = (cue: Cue): Note[] => notesOf(cue).filter((note) => note.wave === 'sawtooth' && (note.delay ?? 0) >= 0.44)

describe('every sound of the toy', () => {
  it('has at least one note, and every note is in range, in each of its takes', () => {
    for (const cue of ALL) {
      for (let take = 0; take < TAKES.length; take++) {
        const notes = notesOf(cue, take)
        expect(notes.length, JSON.stringify(cue)).toBeGreaterThan(0)
        for (const note of notes) {
          const label = `${JSON.stringify(cue)} take ${take}`
          expect(note.frequency, label).toBeGreaterThanOrEqual(40)
          expect(note.frequency, label).toBeLessThanOrEqual(7000)
          if (note.glideTo !== undefined) {
            expect(note.glideTo, label).toBeGreaterThanOrEqual(40)
            expect(note.glideTo, label).toBeLessThanOrEqual(7000)
          }
          expect(note.peak, label).toBeGreaterThan(0)
          expect(note.peak, label).toBeLessThanOrEqual(0.32)
          expect(note.attack, label).toBeGreaterThan(0)
          expect(note.attack, label).toBeLessThanOrEqual(0.1)
          expect(note.decay, label).toBeGreaterThan(0)
          expect(note.decay, label).toBeLessThanOrEqual(0.7)
          expect(note.delay ?? 0, label).toBeGreaterThanOrEqual(0)
          if (note.kind === 'noise') expect(note.wave).toBeUndefined()
          else expect(note.q).toBeUndefined()
        }
      }
    }
  })

  it('is short: over within a second and a half, or within three where the mayor has his say; a balloon on top hums for the one bob and no longer', () => {
    for (const cue of ALL) {
      const long = Math.max(...notesOf(cue).map(ends))
      const mayor = mayors(cue).length > 0 || (cue.type === 'secret' && cue.which === 'peek')
      if (cue.type === 'bob' && cue.parts[cue.parts.length - 1] === 'balloon') {
        const bob = bobSeconds(cue.parts.reduce((sum, kind) => sum + KIND[kind].width, 0))
        // It runs into the next bob, where it is taken up again, and is over before that one is half done.
        expect(long, JSON.stringify(cue)).toBeGreaterThanOrEqual(bob)
        expect(long, JSON.stringify(cue)).toBeLessThanOrEqual(bob * 1.5)
        continue
      }
      expect(long, JSON.stringify(cue)).toBeLessThanOrEqual(mayor ? 3 : 1.6)
    }
  })

  it('the balloon on top of a stack hums without a break for as long as one bob lasts', () => {
    for (const parts of [['hat', 'balloon'], ['pie', 'balloon'], ['dog', 'tuba', 'drummer', 'balloon'], ['tuba', 'balloon']] as const) {
      const hums = notesOf({ type: 'bob', parts: [...parts] }).filter((note) => note.frequency > 500 || (parts[0] === 'tuba' && parts.length === 2)).sort((a, b) => (a.delay ?? 0) - (b.delay ?? 0))
      expect(hums.length, parts.join('+')).toBeGreaterThan(2)
      expect(hums[0].delay ?? 0).toBe(0)
      // Each breath of the hum is still sounding when the next begins.
      for (let i = 1; i < hums.length; i++) expect(hums[i].delay ?? 0, parts.join('+')).toBeLessThanOrEqual(ends(hums[i - 1]))
    }
    // A balloon that is not on top does not hum.
    expect(notesOf({ type: 'bob', parts: ['pie', 'balloon', 'hat'] })).toEqual([])
  })

  it('the mouth straining at a thing creaks upward, lower for a bigger thing, and the puff is the lip letting go: a cue of its own with no delay', () => {
    const creaks = KINDS.map((kind) => notesOf({ type: 'strain', kind }))
    for (let i = 0; i < KINDS.length; i++) {
      const [creak] = creaks[i]
      expect(creak.glideTo!).toBeGreaterThan(creak.frequency)
      expect(creaks[i].every((note) => (note.delay ?? 0) === 0)).toBe(true)
      const puff = notesOf({ type: 'loose', kind: KINDS[i] })
      expect(puff.length).toBeGreaterThan(0)
      expect(puff.every((note) => (note.delay ?? 0) === 0)).toBe(true)
      expect(puff.some((note) => note.kind === 'noise')).toBe(true)
      if (i > 0) expect(creak.frequency).toBeLessThan(creaks[i - 1][0].frequency)
      // It is no thing's own sound on the rim.
      expect(shape(creaks[i])).not.toBe(shape(notesOf({ type: 'teeter', kind: KINDS[i] })))
    }
  })

  it('starts with the touch: the first note of every sound a finger sets off has no delay', () => {
    for (const cue of TOUCH) expect(Math.min(...notesOf(cue).map((note) => note.delay ?? 0)), JSON.stringify(cue)).toBe(0)
  })

  it('never sums to more than a full signal at the moment a touch lands', () => {
    for (const cue of ALL) expect(notesOf(cue).filter((note) => (note.delay ?? 0) === 0).reduce((sum, note) => sum + note.peak, 0), JSON.stringify(cue)).toBeLessThanOrEqual(0.6)
  })

  it('a stack on which nothing plays bobs in silence', () => {
    expect(notesOf({ type: 'bob', parts: ['pie'] })).toEqual([])
    expect(notesOf({ type: 'bob', parts: ['dog', 'pie', 'hat'] })).toEqual([])
  })
})

describe('size is heard as pitch', () => {
  it('a wider thing has a lower pitch', () => {
    for (let i = 1; i < KINDS.length; i++) expect(pitchOf(KINDS[i])).toBeLessThan(pitchOf(KINDS[i - 1]))
    expect(pitchOf('pie')).toBeGreaterThan(pitchOf('drummer') * 2)
  })

  it('the bloop of each thing going in falls from that pitch, and lasts longer for a wider thing', () => {
    const bloops = KINDS.map((kind) => notesOf({ type: 'drop', kind }).find((note) => note.kind === 'tone' && Math.abs(note.frequency - pitchOf(kind)) < 1e-6)!)
    bloops.forEach((bloop, i) => {
      expect(bloop, KINDS[i]).toBeDefined()
      expect(bloop.glideTo!).toBeLessThan(bloop.frequency / 2)
      if (i > 0) expect(bloop.decay).toBeGreaterThan(bloops[i - 1].decay)
    })
  })

  it('the burp that gives a thing back is lower and longer for a wider thing', () => {
    const growls = KINDS.map((kind) => notesOf({ type: 'burp', kind, onto: null, rest: 0 })[0])
    for (let i = 1; i < KINDS.length; i++) {
      expect(growls[i].frequency).toBeLessThan(growls[i - 1].frequency)
      expect(growls[i].decay).toBeGreaterThan(growls[i - 1].decay)
    }
    expect(KIND.pie.width).toBeLessThan(KIND.drummer.width)
  })
})

describe('each thing sounds like itself', () => {
  const cueOf = (type: 'poke' | 'teeter' | 'drop' | 'burp' | 'clack', kind: (typeof KINDS)[number]): Cue => type === 'burp' ? { type, kind, onto: null, rest: 0 } : { type, kind }

  it('no two things share a sound for the same action', () => {
    for (const type of ['poke', 'teeter', 'drop', 'burp', 'clack'] as const) {
      const shapes = KINDS.map((kind) => shape(notesOf(cueOf(type, kind))))
      expect(new Set(shapes).size, type).toBe(KINDS.length)
    }
  })

  it('no thing has the same sound for two actions', () => {
    for (const kind of KINDS) {
      const shapes = (['poke', 'teeter', 'drop', 'burp', 'clack'] as const).map((type) => shape(notesOf(cueOf(type, kind))))
      expect(new Set(shapes).size, kind).toBe(5)
    }
  })

  it('no two things walk with the same sound, and the heavier a balloon is loaded the lower its boing', () => {
    const steps = KINDS.map((kind) => shape(notesOf({ type: 'step', parts: [kind], step: 0, x: 0, z: 0 })))
    expect(new Set(steps).size).toBe(KINDS.length)
    const boing = (parts: Cue & { type: 'step' }): number => notesOf(parts)[0].frequency
    expect(boing({ type: 'step', parts: ['balloon', 'drummer', 'tuba'], step: 0, x: 0, z: 0 })).toBeLessThan(boing({ type: 'step', parts: ['balloon', 'pie'], step: 0, x: 0, z: 0 }))
  })

  it('each thing has a sound for coming to sit on top and another for being pushed up underneath: twelve in all', () => {
    const tops = KINDS.map((onto) => shape(notesOf({ type: 'burp', kind: 'pie', onto, rest: 1 })))
    const unders = KINDS.map((kind) => shape(notesOf({ type: 'burp', kind, onto: 'pie', rest: 1 }).slice(3)))
    expect(new Set(tops).size).toBe(KINDS.length)
    expect(new Set(unders).size).toBe(KINDS.length)
  })

  it('what sits in the tuba sounds through it, an octave down: as it comes to sit there, on every bob, and when a finger touches it', () => {
    const plain = notesOf({ type: 'burp', kind: 'pie', onto: 'dog', rest: 1 }), through = notesOf({ type: 'burp', kind: 'tuba', onto: 'dog', rest: 1 })
    const yap = plain[plain.length - 2], low = through[through.length - 2]
    expect(low.frequency).toBeCloseTo(yap.frequency / 2, 5)
    // On the bob: the drummer in the tuba booms an octave under the drummer on anything else.
    const boom = notesOf({ type: 'bob', parts: ['dog', 'drummer'] })[0], under = notesOf({ type: 'bob', parts: ['tuba', 'drummer'] })[0]
    expect(under.frequency).toBeCloseTo(boom.frequency / 2, 5)
    // Only the thing that sits in it: one further up sounds as it always does.
    const third = notesOf({ type: 'bob', parts: ['tuba', 'pie', 'drummer'] })[0], same = notesOf({ type: 'bob', parts: ['dog', 'pie', 'drummer'] })[0]
    expect(third.frequency).toBe(same.frequency)
    // Under a finger.
    for (const kind of KINDS) {
      const own = notesOf({ type: 'poke', kind }), deep = notesOf({ type: 'poke', kind, deep: true })
      expect(deep).toHaveLength(own.length)
      deep.forEach((note, i) => expect(note.frequency, kind).toBeCloseTo(Math.max(50, own[i].frequency / 2), 5))
    }
  })

  it('the tuba on a stack plays one note to a bob, lower the bigger the thing that plays it, and the drummer booms lighter on a smaller seat', () => {
    const honk = (below: 'pie' | 'dog' | 'drummer'): number => notesOf({ type: 'bob', parts: [below, 'tuba'] })[0].frequency
    expect(honk('pie')).toBeGreaterThan(honk('dog'))
    expect(honk('dog')).toBeGreaterThan(honk('drummer'))
    const boom = (below: 'pie' | 'tuba'): number => notesOf({ type: 'bob', parts: [below, 'drummer'] })[0].peak
    expect(boom('pie')).toBeLessThan(boom('tuba'))
    expect(notesOf({ type: 'bob', parts: ['dog', 'tuba'] })).toEqual(notesOf({ type: 'bob', parts: ['dog', 'tuba'] }, 1))
  })

  it('the dog, the tuba and the drummer in one stack walk to a march: a tune of the tuba, a drum and a wheel on every step', () => {
    const tune = [0, 1, 2, 3, 4, 5, 6, 7].map((step) => notesOf({ type: 'step', parts: ['dog', 'tuba', 'drummer'], step, x: 0, z: 0 }))
    for (const notes of tune) expect(notes).toHaveLength(3)
    expect(new Set(tune.map((notes) => notes[0].frequency)).size).toBeGreaterThan(4)
  })

  it('the mayor is heard for his hat and for no other thing, and differently for each place it comes to be', () => {
    for (const kind of KINDS) {
      expect(mayors({ type: 'drop', kind }).length > 0, `drop ${kind}`).toBe(kind === 'hat')
      expect(mayors({ type: 'burp', kind, onto: null, rest: 0 }).length > 0, `burp ${kind}`).toBe(kind === 'hat')
    }
    const wail = mayors({ type: 'drop', kind: 'hat' }), ah = mayors({ type: 'burp', kind: 'hat', onto: null, rest: 0 })
    const ho = mayors({ type: 'burp', kind: 'dog', onto: 'hat', rest: 1 }), top = mayors({ type: 'burp', kind: 'pie', onto: 'hat', rest: 1 }), moan = mayors({ type: 'burp', kind: 'hat', onto: 'pie', rest: 1 })
    // In the hole: a wail that falls, and his call down the hole. Out again: a breath that rises.
    expect(wail[0].glideTo!).toBeLessThan(wail[0].frequency)
    expect(wail.length).toBe(3)
    expect(ah[0].glideTo!).toBeGreaterThan(ah[0].frequency)
    // On the dog: ho, ho, ho. On top of anything else: the breath. Underneath: a moan that sinks.
    expect(ho).toHaveLength(3)
    expect(shape(top)).toBe(shape(ah))
    expect(moan[0].glideTo!).toBeLessThan(moan[0].frequency)
    expect(moan[0].decay).toBeGreaterThan(ah[0].decay)
  })

  it('the gate keeper puffs at every burp, and whistles up one step for each thing in a stack that is let down', () => {
    for (const kind of KINDS) expect(notesOf({ type: 'burp', kind, onto: null, rest: 0 }).some((note) => note.kind === 'noise' && note.frequency === 1500)).toBe(true)
    const whistle = notesOf({ type: 'setdown', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 }).slice(1)
    expect(whistle).toHaveLength(3)
    expect(whistle[1].frequency).toBeGreaterThan(whistle[0].frequency)
    expect(whistle[2].frequency).toBeGreaterThan(whistle[1].frequency)
  })

  it('each bystander and the gate answer a finger with a sound of their own', () => {
    const shapes = (['mayor', 'keeper', 'crowd', 'gate'] as const).map((who) => shape(notesOf({ type: 'bystander', who, head: -1 })))
    expect(new Set(shapes).size).toBe(4)
  })

  it('the gate creaks up as it opens and down as it shuts, and the clunk is a cue of its own with no delay: it sounds in the frame the leaves meet', () => {
    const open = notesOf({ type: 'gate', open: true }), shut = notesOf({ type: 'gate', open: false }), clunk = notesOf({ type: 'clunk' })
    expect(open[0].glideTo!).toBeGreaterThan(open[0].frequency)
    expect(shut[0].glideTo!).toBeLessThan(shut[0].frequency)
    // The creak of the shutting is over before the leaves meet, however short the scene's shut.
    expect(Math.max(...shut.map(ends))).toBeLessThan(0.5)
    expect(shut.every((note) => note.frequency > 150)).toBe(true)
    expect(clunk).toHaveLength(1)
    expect(clunk[0].frequency).toBeLessThan(100)
    expect(clunk[0].delay ?? 0).toBe(0)
  })

  it('a landing is heard in its frame: the thud of a stack and the first step of the whistle, the thud of the float\'s tower, a clack, a thing stopping on its spot, a hop and a bounce', () => {
    const landings: Cue[] = [
      { type: 'setdown', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 }, { type: 'thud', parts: ['pie', 'hat'], x: 0, z: 0 },
      ...KINDS.flatMap((kind): Cue[] => [{ type: 'clack', kind }, { type: 'arrive', kind }]),
      { type: 'step', parts: ['hat', 'pie'], step: 0, x: 0, z: 0 }, { type: 'step', parts: ['balloon', 'pie'], step: 0, x: 0, z: 0 },
    ]
    for (const cue of landings) expect(Math.min(...notesOf(cue).map((note) => note.delay ?? 0)), JSON.stringify(cue)).toBe(0)
    // The whistle starts in the frame the stack lands, and climbs from there.
    const whistle = notesOf({ type: 'setdown', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 }).slice(1)
    expect(whistle[0].delay ?? 0).toBe(0)
    expect(whistle[1].delay!).toBeGreaterThan(0)
    expect(whistle[2].delay!).toBeGreaterThan(whistle[1].delay!)
    // The tower's creak begins with its sway, which begins as it lands.
    expect(notesOf({ type: 'thud', parts: ['pie', 'hat'], x: 0, z: 0 }).every((note) => (note.delay ?? 0) === 0)).toBe(true)
    // The float's own cue only starts the scene, and an ending is silent.
    expect(notesOf({ type: 'float', parts: ['pie', 'hat'], x: 0, z: 0 })).toEqual([])
    expect(notesOf({ type: 'over', cause: 'breath' })).toEqual([])
  })

  it('a thing that waited down in the mouth pops in the frame it comes up: the growl was the tap\'s, and the rest follows the pop as closely as ever', () => {
    for (const kind of KINDS) {
      const now = notesOf({ type: 'burp', kind, onto: 'pie', rest: 1 }), late = notesOf({ type: 'burp', kind, onto: 'pie', rest: 1, late: true }), growl = notesOf({ type: 'growl', kind })
      // At the tap: the growl, with no delay. As it comes up: everything but the growl, the pop first and at once.
      expect(growl.map((note) => note.frequency)).toEqual(now.slice(0, growl.length).map((note) => note.frequency))
      expect(growl.every((note) => (note.delay ?? 0) === 0)).toBe(true)
      expect(late).toHaveLength(now.length - growl.length)
      expect(late[0].delay ?? 0).toBe(0)
      const pop = now[growl.length].delay!
      // What follows the pop is the thing's own: it belongs to the stack on the breath, and keeps its distance from the pop.
      const own = late.filter((note) => note.cause === 'breath'), was = now.filter((note) => note.cause === 'breath')
      expect(own.length).toBeGreaterThan(0)
      own.forEach((note, index) => expect(note.delay ?? 0).toBeCloseTo((was[index].delay ?? 0) - pop, 9))
    }
  })

  it('the drummer\'s boom on the breath has no delay: it sounds in the frame the bob begins, when his sticks are down', () => {
    for (const parts of [['pie', 'drummer'], ['tuba', 'drummer'], ['dog', 'tuba', 'drummer']] as const) {
      const boom = notesOf({ type: 'bob', parts: [...parts] }).filter((note) => note.glideTo !== undefined && note.frequency <= 105)
      expect(boom.length, parts.join('+')).toBeGreaterThan(0)
      for (const note of boom) expect(note.delay ?? 0).toBe(0)
    }
  })

  it('the long bounce is heard going up for as long as the stack goes up, and coming down from its top', () => {
    const [up, down] = notesOf({ type: 'secret', which: 'bounce' })
    expect(up.delay ?? 0).toBe(0)
    expect(up.glideTo!).toBeGreaterThan(up.frequency)
    expect(down.delay!).toBeCloseTo(BOUNCE_SECONDS / 2, 9)
    expect(down.glideTo!).toBeLessThan(down.frequency)
    expect(ends(down)).toBeLessThanOrEqual(BOUNCE_SECONDS)
  })

  it('a thing passing the gate post and a thing stopping on its spot give the sound they give a finger', () => {
    for (const kind of KINDS) {
      expect(notesOf({ type: 'pass', kind })).toEqual(notesOf({ type: 'poke', kind }))
      expect(notesOf({ type: 'arrive', kind })).toEqual(notesOf({ type: 'poke', kind }))
    }
  })

  it('a taller stack lands with a lower thud and one step of the whistle for each thing, as many as the tallest stack a street can make', () => {
    const one = notesOf({ type: 'setdown', parts: ['pie'], x: 0, z: 0 }), three = notesOf({ type: 'setdown', parts: ['pie', 'hat', 'dog'], x: 0, z: 0 })
    expect(three[0].frequency).toBeLessThan(one[0].frequency)
    expect(three.length - one.length).toBe(2)
    expect(notesOf({ type: 'setdown', parts: Array(12).fill('pie'), x: 0, z: 0 })).toHaveLength(13)
  })
})

describe('the same touch twice', () => {
  it('sounds a little apart in pitch each time, and the same in everything else', () => {
    const cue: Cue = { type: 'poke', kind: 'dog' }
    const takes = TAKES.map((_, take) => notesOf(cue, take))
    expect(new Set(takes.map((notes) => notes[0].frequency)).size).toBe(TAKES.length)
    for (const notes of takes) expect(notes.map((note) => [note.peak, note.decay, note.delay])).toEqual(takes[0].map((note) => [note.peak, note.decay, note.delay]))
    expect(notesOf(cue, TAKES.length)).toEqual(notesOf(cue, 0))
  })

  it('takes the next take each time that kind of sound plays', () => {
    const takes = new Map<string, number>()
    const first = notesFor([{ type: 'poke', kind: 'pie' }], takes), second = notesFor([{ type: 'poke', kind: 'pie' }], takes)
    expect(second[0].frequency).not.toBe(first[0].frequency)
    expect(takes.get('poke')).toBe(2)
  })
})

describe('everything one touch sets off', () => {
  it('is one list in order, capped so a tall stack going in is heard as its first few things', () => {
    const takes = new Map<string, number>()
    const two = notesFor([{ type: 'poke', kind: 'pie' }, { type: 'slide' }], takes)
    expect(two).toHaveLength(notesOf({ type: 'poke', kind: 'pie' }).length + notesOf({ type: 'slide' }).length)
    const many = notesFor(Array.from({ length: 30 }, (): Cue => ({ type: 'drop', kind: 'drummer' })), takes)
    expect(many).toHaveLength(MOST_NOTES)
    expect(notesFor([], takes)).toEqual([])
  })
})
