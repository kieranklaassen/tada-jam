import { describe, expect, it } from 'vitest'
import { cellOf } from './grid'
import { CALL_LIFT, ENTRANCE_SECONDS, IDLE_SECONDS, JOIN_SECONDS, REST, SQUASH_SECONDS, TRICKS, WEIGHT, blend, calling, eggCalling, entrance, idle, join, joinNote, nextTrick, squash, trick, type Move } from './motion'
import { BLINKS, ENTRANCES, IDLES, JOINS, TRICK_SET } from './motionKinds'
import { KINDS, RUSTLE, shapeOf, type Kind } from './voices'

// These tests fail when two kinds come to move alike. The measure, wherever
// two movements are held apart: both are sampled at 41 even points, the
// straight-line distance between the two moves is taken at each point over
// the fields named, and the root of the mean of its square is the distance
// between the movements. MARGIN is the least that counts as different.

type Field = keyof Move
/** Everything a move has. */
const ALL: readonly Field[] = ['dx', 'dy', 'sx', 'sy', 'lean', 'wings', 'reach', 'turn', 'blink', 'face']
/** What the whole body does, and all an egg can do: an entrance and a call are compared on these. */
const BODY: readonly Field[] = ['dx', 'dy', 'sx', 'sy', 'lean', 'face']
const MARGIN = 0.08
/** An idle is a few hundredths of a body height at most, so two idles are held apart by half the margin. */
const IDLE_MARGIN = 0.04

const sampled = (curve: (t: number) => Move, points = 41) => Array.from({ length: points }, (_, i) => curve(i / (points - 1)))
const apart = (a: Move[], b: Move[], fields: readonly Field[]) => Math.sqrt(a.reduce((sum, move, i) => sum + fields.reduce((at, f) => at + (move[f] - b[i][f]) ** 2, 0), 0) / a.length)
const away = (move: Move, field: Field) => move[field] - REST[field]

function expectAllApart(curves: { id: string; moves: Move[] }[], fields: readonly Field[], margin: number) {
  for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length; j++) {
    expect(apart(curves[i].moves, curves[j].moves, fields), `${curves[i].id} and ${curves[j].id}`).toBeGreaterThanOrEqual(margin)
  }
}

const RANGES: Readonly<Record<Field, readonly [number, number]>> = { dx: [-0.6, 0.6], dy: [-1.4, 0.05], sx: [0.15, 1.9], sy: [0.15, 1.9], lean: [-0.9, 0.9], wings: [0, 1], reach: [-1, 1], turn: [-1, 1], blink: [0, 1], face: [-1, 1] }
function expectInRange(move: Move, what: string) {
  for (const field of ALL) {
    expect(Number.isFinite(move[field]), `${what} ${field}`).toBe(true)
    expect(move[field], `${what} ${field}`).toBeGreaterThanOrEqual(RANGES[field][0])
    expect(move[field], `${what} ${field}`).toBeLessThanOrEqual(RANGES[field][1])
  }
}

/** Every movement that runs from 0 to 1, by name. `rests` says at which ends it stands at rest. */
function timed(): { id: string; curve: (t: number) => Move; rests: readonly (0 | 1)[] }[] {
  return [
    ...KINDS.map((kind) => ({ id: `${kind} entrance`, curve: (t: number) => entrance(kind, t), rests: [1] as const })),
    ...KINDS.flatMap((kind) => TRICKS[kind].map((one, which) => ({ id: `${kind} ${one.name}`, curve: (t: number) => trick(kind, which, t), rests: [0, 1] as const }))),
    ...KINDS.map((kind) => ({ id: `${kind} join`, curve: (t: number) => join(kind, t), rests: [0, 1] as const })),
    ...KINDS.map((kind) => ({ id: `${kind} calling`, curve: (t: number) => calling(shapeOf(kind), t), rests: [0, 1] as const })),
    ...KINDS.map((kind) => ({ id: `${kind} egg calling`, curve: (t: number) => eggCalling(shapeOf(kind), t), rests: [0, 1] as const })),
    { id: 'rustle', curve: (t: number) => eggCalling(RUSTLE, t), rests: [0, 1] as const },
    ...KINDS.map((kind) => ({ id: `${kind} squash`, curve: (t: number) => squash(t, WEIGHT[kind]), rests: [0, 1] as const })),
    { id: 'squash, no weight given', curve: (t: number) => squash(t), rests: [0, 1] as const },
  ]
}

const tricks = () => KINDS.flatMap((kind) => TRICKS[kind].map((one, which) => ({ kind, which, ...one })))
const peaks = (values: number[]) => values.filter((v, i) => i > 0 && i < values.length - 1 && v > values[i - 1] && v >= values[i + 1]).length
const signChanges = (values: number[]) => { const signs = values.filter((v) => Math.abs(v) > 1e-9).map(Math.sign); return signs.filter((s, i) => i > 0 && s !== signs[i - 1]).length }

describe('every movement', () => {
  it('stays finite and on its own spot at 101 instants', () => {
    for (const { id, curve } of timed()) for (const move of sampled(curve, 101)) expectInRange(move, id)
  })

  it('holds t between 0 and 1, and makes nothing of a number that is not one', () => {
    for (const { id, curve } of timed()) {
      expect(curve(-3), id).toEqual(curve(0))
      expect(curve(7), id).toEqual(curve(1))
      for (const odd of [NaN, Infinity, -Infinity]) expectInRange(curve(odd), id)
    }
    for (const kind of KINDS) {
      for (const odd of [NaN, Infinity, -1, 99, 1.5]) expectInRange(trick(kind, odd, 0.5), `${kind} trick ${odd}`)
      for (const odd of [NaN, Infinity, -Infinity]) { expectInRange(idle(kind, odd, 0), `${kind} idle`); expectInRange(idle(kind, 1, odd), `${kind} idle`); expectInRange(squash(0.5, odd), 'squash') }
    }
  })

  it('stands exactly at rest where it starts and ends, and comes to rest without a jump', () => {
    const close = (move: Move) => Math.max(...ALL.map((field) => Math.abs(away(move, field))))
    for (const { id, curve, rests } of timed()) {
      for (const end of rests) {
        expect(curve(end), `${id} at ${end}`).toEqual(REST)
        // One two-hundredth from the end it is already almost there: the exact rest is no cut.
        expect(close(curve(end === 0 ? 0.005 : 0.995)), `${id} near ${end}`).toBeLessThan(0.08)
      }
    }
  })

  it('hands out a fresh move each time, so nobody can spoil REST', () => {
    const first = trick('pip', 0, 0)
    first.dy = -1
    expect(trick('pip', 0, 0)).toEqual(REST)
    expect(REST).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1, lean: 0, wings: 0, reach: 0, turn: 0, blink: 0, face: 1 })
  })
})

describe('blend', () => {
  const a: Move = { dx: 0.1, dy: -0.2, sx: 1.2, sy: 0.8, lean: 0.1, wings: 0.3, reach: 0.7, turn: -0.4, blink: 0.2, face: -1 }
  const b: Move = { dx: 0.05, dy: -0.1, sx: 0.5, sy: 1.5, lean: -0.3, wings: 0.6, reach: 0.6, turn: -0.9, blink: 0.1, face: 0.5 }

  it('changes nothing when the other move is rest', () => {
    expect(blend(a, REST)).toEqual(a)
    expect(blend(REST, a)).toEqual(a)
  })

  it('adds offsets and angles, multiplies stretches and face, takes the larger of wings and blink, and holds reach and turn in', () => {
    const both = blend(a, b)
    expect(both.dx).toBeCloseTo(0.15)
    expect(both.dy).toBeCloseTo(-0.3)
    expect(both.sx).toBeCloseTo(0.6)
    expect(both.sy).toBeCloseTo(1.2)
    expect(both.lean).toBeCloseTo(-0.2)
    expect(both.wings).toBe(0.6)
    expect(both.blink).toBe(0.2)
    expect(both.reach).toBe(1)
    expect(both.turn).toBe(-1)
    expect(both.face).toBe(-0.5)
  })

  it('keeps an idle under anything else inside the ranges', () => {
    for (const kind of KINDS) for (const move of sampled((t) => blend(idle(kind, t * 7, 1), blend(trick(kind, 0, t), squash(t, WEIGHT[kind]))), 101)) expectInRange(move, kind)
  })
})

describe('the way out of the egg', () => {
  const out = (kind: Kind, points = 101) => sampled((t) => entrance(kind, t), points)

  it('starts squashed down in the shell and overshoots before it stands', () => {
    for (const kind of KINDS) {
      expect(entrance(kind, 0).sy, kind).toBeLessThanOrEqual(0.25)
      const beyond = Math.max(...out(kind).map((move) => Math.max(move.sy - 1, move.sx - 1, -move.dy, Math.abs(move.lean))))
      expect(beyond, kind).toBeGreaterThan(0.25)
    }
  })

  it('is shared by no two kinds', () => {
    expectAllApart(KINDS.map((kind) => ({ id: kind, moves: out(kind, 41) })), BODY, MARGIN)
    expect(new Set(KINDS.map((kind) => ENTRANCE_SECONDS[kind])).size).toBe(KINDS.length)
    for (const kind of KINDS) {
      expect(ENTRANCE_SECONDS[kind], kind).toBeGreaterThanOrEqual(0.5)
      expect(ENTRANCE_SECONDS[kind], kind).toBeLessThanOrEqual(1.2)
    }
  })

  it('is the one grid.ts names for each kind', () => {
    const top = (kind: Kind) => Math.max(...out(kind).map((move) => -move.dy))
    // pip, like a cork: higher than anyone, and it tumbles once in the air.
    for (const kind of KINDS) if (kind !== 'pip') expect(top('pip'), kind).toBeGreaterThan(top(kind))
    expect(Math.min(...out('pip').map((move) => move.face))).toBeLessThan(-0.9)
    // tok, in two pecks: it comes up in two jerks with a stop between them.
    const taller = out('tok').map((move, i, all) => (i > 0 && move.sy - all[i - 1].sy > 0.03 ? 1 : 0))
    expect(taller.filter((now, i) => now === 1 && taller[i - 1] === 0).length).toBe(2)
    // hoom, like a blanket: never off the ground, right over on one side, and wide.
    expect(top('hoom')).toBeCloseTo(0, 12)
    expect(Math.min(...out('hoom').map((move) => move.lean))).toBeLessThan(-0.4)
    expect(Math.max(...out('hoom').map((move) => move.sx))).toBeGreaterThan(1.25)
    // brrl, the neck first: tall and thin, shivering.
    expect(Math.max(...out('brrl').map((move) => move.sy))).toBeGreaterThan(1.4)
    expect(Math.min(...out('brrl').map((move) => move.sx))).toBeLessThan(0.7)
    expect(signChanges(out('brrl').map((move) => move.dx))).toBeGreaterThanOrEqual(6)
    // wheep, on its springs: three bounces, each lower than the one before.
    expect(peaks(out('wheep').map((move) => -move.dy))).toBe(3)
    // dooo slides in from the side lying down, stands up, and then flops.
    expect(entrance('dooo', 0).dx).toBeLessThanOrEqual(-0.4)
    const stands = out('dooo').findIndex((move) => move.sy > 1)
    expect(stands).toBeGreaterThan(40)
    expect(Math.min(...out('dooo').slice(stands).map((move) => move.sy))).toBeLessThan(0.9)
  })
})

describe('tricks', () => {
  it('come at least three to a kind, the first being the one grid.ts names', () => {
    for (const kind of KINDS) {
      expect(TRICKS[kind].length, kind).toBeGreaterThanOrEqual(3)
      expect(TRICKS[kind][0].name).toBe(cellOf(kind, 'tapWhenOut').move)
      expect(TRICKS[kind]).toEqual(TRICK_SET[kind].map(({ name, seconds }) => ({ name, seconds })))
    }
  })

  it('have a name each, shared with no other, and a length a small child will wait for', () => {
    const all = tricks()
    expect(all.length).toBeGreaterThanOrEqual(18)
    expect(new Set(all.map((one) => one.name)).size).toBe(all.length)
    for (const one of all) {
      expect(one.name).toMatch(/^[a-z]+(-[a-z]+)+$/)
      expect(one.seconds, one.name).toBeGreaterThanOrEqual(0.5)
      expect(one.seconds, one.name).toBeLessThanOrEqual(1.4)
    }
  })

  it('are no near-copies: every two of them, of one kind or of two, differ by the margin', () => {
    expectAllApart(tricks().map((one) => ({ id: one.name, moves: sampled((t) => trick(one.kind, one.which, t)) })), ALL, MARGIN)
  })

  // The field each trick winds up in: in its first 12 percent it goes the other way from where that field ends up
  // furthest from rest. A crouch before a jump, a lean back before a peck, a breath in before a droop.
  const WINDS_UP: Readonly<Record<string, Field>> = {
    'spins-on-the-spot': 'sy', 'three-tiny-bounces': 'sy', 'rolls-side-to-side': 'lean',
    'pecks-the-ground-twice': 'lean', 'hops-in-a-zigzag': 'dx', 'snaps-its-beak-left-and-right': 'turn',
    'swells-up-belly-wobbling': 'sx', 'rocks-like-a-boat': 'lean', 'sits-down-with-a-bump': 'sy',
    'shiver-runs-up-from-body-to-head': 'sy', 'head-circles-on-its-neck': 'sy', 'bows-low-and-sweeps': 'sy',
    'crouches-and-springs-with-the-glide': 'sy', 'boings-on-the-spot': 'sy', 'twangs-side-to-side': 'lean',
    'droops-to-the-ground-and-snaps-back': 'sy', 'flaps-its-ears': 'turn', 'slumps-sideways-and-pops-up': 'lean',
  }

  it('start with a small move the other way', () => {
    for (const one of tricks()) {
      const field = WINDS_UP[one.name]
      expect(field, `${one.name} has no wind-up named`).toBeDefined()
      const off = sampled((t) => trick(one.kind, one.which, t), 101).map((move) => away(move, field))
      const furthest = off.reduce((far, now) => (Math.abs(now) > Math.abs(far) ? now : far), 0)
      const early = off.slice(1, 13).reduce((sum, now) => sum + now, 0) / 12
      expect(Math.abs(early), `${one.name} winds up`).toBeGreaterThan(0.02)
      expect(Math.sign(early), `${one.name} winds up the other way`).toBe(-Math.sign(furthest))
      // The wind-up is the small move and the trick the big one.
      expect(Math.abs(furthest), one.name).toBeGreaterThan(2 * Math.abs(early))
    }
  })

  it('wrap round, so any whole number picks one', () => {
    for (const kind of KINDS) {
      const count = TRICKS[kind].length
      expect(trick(kind, count, 0.4)).toEqual(trick(kind, 0, 0.4))
      expect(trick(kind, -1, 0.4)).toEqual(trick(kind, count - 1, 0.4))
    }
  })
})

describe('joining in', () => {
  it('is different for every two kinds, and at rest at both ends', () => {
    expectAllApart(KINDS.map((kind) => ({ id: kind, moves: sampled((t) => join(kind, t)) })), ALL, MARGIN)
    for (const kind of KINDS) {
      expect(JOIN_SECONDS[kind], kind).toBeGreaterThanOrEqual(0.5)
      expect(JOIN_SECONDS[kind], kind).toBeLessThanOrEqual(1.4)
    }
    expect(new Set(KINDS.map((kind) => JOIN_SECONDS[kind])).size).toBe(KINDS.length)
  })

  it('is not one of the same kind\'s tricks over again', () => {
    for (const kind of KINDS) for (const [which, one] of TRICKS[kind].entries()) {
      expect(apart(sampled((t) => join(kind, t)), sampled((t) => trick(kind, which, t)), ALL), `${kind} join and ${one.name}`).toBeGreaterThanOrEqual(MARGIN)
    }
  })
})

describe('idle', () => {
  const bodyOf = (move: Move) => ({ ...move, blink: 0 })
  const round = (kind: Kind, late = 0, points = 41) => sampled((t) => bodyOf(idle(kind, t * IDLE_SECONDS[kind], late)), points)

  it('never leaves its spot', () => {
    for (const kind of KINDS) for (const late of [0, 1, 2.5, -4]) for (let s = 0; s < 20; s += 0.05) {
      const move = idle(kind, s, late)
      expectInRange(move, `${kind} idle`)
      expect(Math.abs(move.dx), kind).toBeLessThanOrEqual(0.03)
      expect(move.dy, kind).toBeLessThanOrEqual(0)
      expect(move.dy, kind).toBeGreaterThanOrEqual(-0.03)
    }
  })

  it('moves: nobody stands still', () => {
    for (const kind of KINDS) {
      const moves = round(kind)
      expect(Math.max(...ALL.map((field) => Math.max(...moves.map((move) => move[field])) - Math.min(...moves.map((move) => move[field])))), kind).toBeGreaterThan(0.05)
    }
  })

  it('has a tempo for each kind, a tenth or more from every other', () => {
    for (const a of KINDS) for (const b of KINDS) if (a !== b) expect(Math.max(IDLE_SECONDS[a], IDLE_SECONDS[b]) / Math.min(IDLE_SECONDS[a], IDLE_SECONDS[b]), `${a} and ${b}`).toBeGreaterThanOrEqual(1.1)
  })

  it('goes round in exactly the time it says, and in no shorter one', () => {
    for (const kind of KINDS) {
      const after = (seconds: number) => sampled((t) => bodyOf(idle(kind, t * IDLE_SECONDS[kind] + seconds, 0)))
      expect(apart(round(kind), after(IDLE_SECONDS[kind]), ALL), kind).toBeLessThan(1e-9)
      for (const part of [2, 3, 4]) expect(apart(round(kind), after(IDLE_SECONDS[kind] / part), ALL), `${kind} at 1/${part}`).toBeGreaterThan(0.01)
    }
  })

  it('is shaped differently for every two kinds, even with the tempo taken out', () => {
    expectAllApart(KINDS.map((kind) => ({ id: kind, moves: round(kind) })), ALL, IDLE_MARGIN)
  })

  it('keeps two of one kind out of step', () => {
    for (const kind of KINDS) for (const [one, other] of [[0, 1], [1, 2], [0, 3], [2, 7]]) {
      expect(apart(round(kind, one), round(kind, other), ALL), `${kind} ${one} and ${other}`).toBeGreaterThan(0.02)
    }
  })

  it('blinks now and then, each kind in its own time, and two of a kind not together', () => {
    const shut = (kind: Kind, late: number) => { const out: number[] = []; for (let s = 0; s < 60; s += 0.01) out.push(idle(kind, s, late).blink); return out }
    for (const kind of KINDS) {
      const blinks = shut(kind, 0)
      expect(Math.max(...blinks), kind).toBeGreaterThan(0.9)
      expect(blinks.filter((b) => b > 0).length / blinks.length, kind).toBeLessThan(0.15)
      const other = shut(kind, 1)
      expect(blinks.filter((b, i) => b > 0.5 && other[i] > 0.5).length, kind).toBe(0)
    }
    expect(new Set(KINDS.map((kind) => BLINKS[kind][0])).size).toBe(KINDS.length)
  })
})

describe('weight', () => {
  const byWeight = [...KINDS].sort((a, b) => WEIGHT[a] - WEIGHT[b])

  it('is different for every kind: pip the lightest and hoom the heaviest', () => {
    expect(new Set(KINDS.map((kind) => WEIGHT[kind])).size).toBe(KINDS.length)
    expect(byWeight[0]).toBe('pip')
    expect(byWeight[byWeight.length - 1]).toBe('hoom')
    for (const kind of KINDS) { expect(WEIGHT[kind]).toBeGreaterThanOrEqual(0); expect(WEIGHT[kind]).toBeLessThanOrEqual(1) }
  })

  it('shows in how long things take: the tiny ones are out of the egg before the middle ones, and those before the big ones', () => {
    for (const light of ['pip', 'tok'] as const) for (const middle of ['wheep', 'dooo'] as const) for (const heavy of ['hoom', 'brrl'] as const) {
      expect(ENTRANCE_SECONDS[light]).toBeLessThan(ENTRANCE_SECONDS[middle])
      expect(ENTRANCE_SECONDS[middle]).toBeLessThan(ENTRANCE_SECONDS[heavy])
    }
    // More than that is held: of any two kinds the heavier takes longer over its entrance and over a round of its idle.
    for (let i = 1; i < byWeight.length; i++) {
      expect(ENTRANCE_SECONDS[byWeight[i]], byWeight[i]).toBeGreaterThan(ENTRANCE_SECONDS[byWeight[i - 1]])
      expect(IDLE_SECONDS[byWeight[i]], byWeight[i]).toBeGreaterThan(IDLE_SECONDS[byWeight[i - 1]])
    }
  })

  it('shows under a finger: a heavier thing squashes less, and later', () => {
    const widest = (weight: number) => { const moves = sampled((t) => squash(t, weight), 101); const most = Math.max(...moves.map((move) => move.sx)); return { most, at: moves.findIndex((move) => move.sx === most) / 100 } }
    expect(SQUASH_SECONDS).toBeGreaterThanOrEqual(0.2)
    expect(SQUASH_SECONDS).toBeLessThanOrEqual(0.4)
    expect(widest(0).at).toBeGreaterThanOrEqual(0.1)
    expect(widest(0).at).toBeLessThanOrEqual(0.2)
    expect(squash(0.15).sy).toBeLessThan(0.8)
    for (let i = 1; i < byWeight.length; i++) {
      expect(widest(WEIGHT[byWeight[i]]).most, byWeight[i]).toBeLessThan(widest(WEIGHT[byWeight[i - 1]]).most)
      expect(widest(WEIGHT[byWeight[i]]).at, byWeight[i]).toBeGreaterThanOrEqual(widest(WEIGHT[byWeight[i - 1]]).at)
    }
    expect(widest(1).at).toBeGreaterThan(widest(0).at)
  })

  it('springs back too far before it stands: taller than at rest after the squash, whatever the weight', () => {
    for (const weight of [0, ...KINDS.map((kind) => WEIGHT[kind])]) {
      const moves = sampled((t) => squash(t, weight), 101)
      const flattest = moves.findIndex((move) => move.sy === Math.min(...moves.map((m) => m.sy)))
      expect(Math.max(...moves.slice(flattest).map((move) => move.sy)), `weight ${weight}`).toBeGreaterThan(1.03)
    }
  })
})

describe.each([['on a body in the open', calling], ['on an egg', eggCalling]] as const)('the picture of a call %s', (_, picture) => {
  const call = (kind: Kind, points = 101) => sampled((t) => picture(shapeOf(kind), t), points)
  const top = (kind: Kind) => Math.max(...call(kind).map((move) => -move.dy))

  it('lifts higher for a higher voice: by the lift of the shape exactly', () => {
    for (const kind of KINDS) expect(top(kind), kind).toBeCloseTo(shapeOf(kind).lift * CALL_LIFT, 6)
    expect(Math.min(top('pip'), top('tok'))).toBeGreaterThan(Math.max(top('wheep'), top('dooo')) + 0.1)
    expect(Math.min(top('wheep'), top('dooo'))).toBeGreaterThan(Math.max(top('hoom'), top('brrl')) + 0.1)
    expect(CALL_LIFT).toBeGreaterThanOrEqual(0.35)
    expect(CALL_LIFT).toBeLessThanOrEqual(0.55)
  })

  it('goes up once for each note: twice for tok and once for the others', () => {
    for (const kind of KINDS) expect(peaks(call(kind).map((move) => -move.dy)), kind).toBe(kind === 'tok' ? 2 : 1)
    // Between its two notes tok is back on the ground.
    expect(picture(shapeOf('tok'), 0.5).dy).toBeCloseTo(0, 9)
  })

  it('shivers for a warble and for nothing else', () => {
    for (const kind of KINDS) {
      const changes = signChanges(call(kind).map((move) => move.dx))
      if (kind === 'brrl') expect(changes).toBeGreaterThanOrEqual(6)
      else expect(changes, kind).toBe(0)
    }
  })

  it('goes up through an up-glide and down through a down-glide', () => {
    const highestAt = (kind: Kind) => { const up = call(kind).map((move) => -move.dy); return up.indexOf(Math.max(...up)) / 100 }
    expect(highestAt('wheep')).toBeGreaterThan(0.6)
    expect(highestAt('dooo')).toBeLessThan(0.4)
    expect(highestAt('pip')).toBe(0.5)
  })

  it('leans a low, long voice over instead of lifting it, and a high one not at all', () => {
    for (const kind of ['hoom', 'brrl'] as const) expect(Math.abs(picture(shapeOf(kind), 0.5).lean), kind).toBeGreaterThan(0.15)
    for (const kind of ['pip', 'tok'] as const) expect(Math.max(...call(kind).map((move) => Math.abs(move.lean))), kind).toBeLessThan(0.02)
  })

  it('is a different picture for every two kinds', () => {
    expectAllApart(KINDS.map((kind) => ({ id: kind, moves: call(kind, 41) })), BODY, MARGIN)
  })
})

describe('a glide', () => {
  it('tips a body up for wheep and down for dooo, most in the middle of the call', () => {
    expect(calling(shapeOf('wheep'), 0.5).lean).toBeGreaterThan(0.2)
    expect(calling(shapeOf('dooo'), 0.5).lean).toBeLessThan(-0.2)
    expect(calling(shapeOf('wheep'), 0.5).lean).toBeCloseTo(-calling(shapeOf('dooo'), 0.5).lean, 9)
  })

  it('rocks an egg from one end to the other, ending on the side the voice ends on', () => {
    expect(eggCalling(shapeOf('wheep'), 0.25).lean).toBeLessThan(-0.2)
    expect(eggCalling(shapeOf('wheep'), 0.75).lean).toBeGreaterThan(0.2)
    expect(eggCalling(shapeOf('dooo'), 0.25).lean).toBeGreaterThan(0.2)
    expect(eggCalling(shapeOf('dooo'), 0.75).lean).toBeLessThan(-0.2)
  })
})

describe('a call from inside', () => {
  it('moves a shell, which has no wings and no face', () => {
    for (const kind of KINDS) for (const move of sampled((t) => eggCalling(shapeOf(kind), t), 101)) {
      expect([move.wings, move.reach, move.turn, move.blink, move.face], kind).toEqual([0, 0, 0, 0, 1])
    }
    // In the open the wings come out with the voice.
    for (const kind of KINDS) expect(calling(shapeOf(kind), 0.5).wings, kind).toBe(1)
  })

  it('is stiffer than a body: an egg stretches less than the one inside would in the open', () => {
    for (const kind of KINDS) expect(eggCalling(shapeOf(kind), 0.5).sy - 1, kind).toBeLessThan(calling(shapeOf(kind), 0.5).sy - 1 + 1e-12)
    expect(eggCalling(shapeOf('pip'), 0.5).sy).toBeLessThan(calling(shapeOf('pip'), 0.5).sy - 0.05)
  })

  it('rustles a leaf pile the same small way whoever calls: the shape is all it is given', () => {
    expect(eggCalling.length).toBe(2)
    const rustle = sampled((t) => eggCalling(RUSTLE, t), 101)
    expect(sampled((t) => eggCalling({ ...RUSTLE }, t), 101)).toEqual(rustle)
    // It shakes from side to side all through, and it is over before the shortest voice has been answered.
    expect(signChanges(rustle.map((move) => move.dx))).toBeGreaterThanOrEqual(5)
    expect(RUSTLE.seconds).toBeLessThan(Math.min(...KINDS.map((kind) => shapeOf(kind).seconds)) + 0.25)
    for (const move of rustle) {
      expect(Math.abs(move.dx)).toBeLessThanOrEqual(0.1)
      expect(-move.dy).toBeLessThanOrEqual(0.1)
      expect(Math.abs(move.lean)).toBeLessThanOrEqual(0.15)
    }
    // And it is nobody's own picture, so it gives nobody away.
    for (const kind of KINDS) expect(apart(sampled((t) => eggCalling(RUSTLE, t)), sampled((t) => eggCalling(shapeOf(kind), t)), BODY), kind).toBeGreaterThanOrEqual(MARGIN)
  })
})

describe('which trick comes next', () => {
  const rolls = Array.from({ length: 200 }, (_, i) => i / 200)

  it('is the grid\'s own the first time', () => {
    for (const kind of KINDS) for (const roll of rolls) expect(nextTrick(kind, -1, roll)).toBe(0)
  })

  it('is never the one before, always one that exists, and in time every one', () => {
    for (const kind of KINDS) {
      const count = TRICKS[kind].length
      for (let last = 0; last < count; last++) {
        const seen = new Set<number>()
        for (const roll of [...rolls, 0.999999, 1, -1, NaN]) {
          const next = nextTrick(kind, last, roll)
          expect(Number.isInteger(next) && next >= 0 && next < count, `${kind} after ${last}`).toBe(true)
          expect(next, `${kind} after ${last}`).not.toBe(last)
          seen.add(next)
        }
        expect(seen.size, `${kind} after ${last}`).toBe(count - 1)
      }
      // A walk through a stream of rolls: no trick twice running, and all of them come up.
      let last = -1
      const walked = new Set<number>()
      for (let i = 0; i < 60; i++) { const next = nextTrick(kind, last, (i * 0.618034) % 1); expect(next).not.toBe(last); walked.add(next); last = next }
      expect(walked.size).toBe(count)
    }
  })

  it('starts over with the grid\'s own when it is told of a trick that does not exist', () => {
    for (const last of [99, 1.5, NaN, -7]) expect(nextTrick('hoom', last, 0.5)).toBe(0)
  })
})

describe('the tables behind it', () => {
  it('have an entry for every kind and no other', () => {
    for (const table of [ENTRANCES, IDLES, JOINS, TRICK_SET, BLINKS, WEIGHT, IDLE_SECONDS, ENTRANCE_SECONDS, JOIN_SECONDS, TRICKS]) expect(Object.keys(table).sort()).toEqual([...KINDS].sort())
  })
})

// The fifth column of the grid in ART.md, for the two kinds that join in note by note.
describe('one note of a join that is sounded note by note', () => {
  const NOTE = 0.12

  it('pip hops once for each peep and is on the ground between them: the hops are on the peeps', () => {
    const shape = shapeOf('pip')
    expect(-joinNote('pip', shape, NOTE, NOTE / 2).dy).toBeGreaterThan(0.2)
    for (const since of [-0.05, 0, NOTE, 0.2]) expect(joinNote('pip', shape, NOTE, since).dy).toBeCloseTo(0, 12)
    // What it does for the whole join has no hop of its own in it.
    for (let i = 0; i <= 40; i++) expect(join('pip', i / 40).dy).toBeCloseTo(0, 12)
  })

  it('tok pecks at its foot once for each of its two peeps, lowest as the note starts and up again before the next', () => {
    const shape = shapeOf('tok'), lean = (since: number) => joinNote('tok', shape, NOTE, since).lean
    expect(lean(0)).toBeGreaterThan(0.45)
    expect(lean(0)).toBeGreaterThan(lean(-0.04))
    expect(lean(0)).toBeGreaterThan(lean(0.08))
    for (const since of [-0.07, 0.15, 0.25]) expect(lean(since)).toBeCloseTo(0, 12)
    // One note is one hop of the picture, whatever the whole call has.
    expect(joinNote('tok', shape, NOTE, NOTE / 2).dy).toBeCloseTo(calling({ ...shape, hops: 1, seconds: NOTE }, 0.5).dy, 12)
    // What it does for the whole join is a lean held over its foot, with no peck of its own in it.
    const held = Array.from({ length: 21 }, (_, i) => join('tok', 0.3 + (0.4 * i) / 20).lean)
    expect(Math.max(...held) - Math.min(...held)).toBeLessThan(0.01)
  })

  it('is nothing but the picture of the note for a kind with no move of its own on a note', () => {
    for (const kind of ['pip', 'hoom', 'brrl', 'wheep', 'dooo'] as const) {
      const shape = shapeOf(kind)
      for (const since of [-0.02, 0.03, 0.06, 0.1]) expect(joinNote(kind, shape, NOTE, since), kind).toEqual(calling({ ...shape, hops: 1, seconds: NOTE }, since / NOTE))
    }
  })
})

describe('brrl joining in', () => {
  it('takes its head round a loop: out to one side, down through the bottom, out to the other and over the top, twice', () => {
    // Where the head is: across by the turn of the face and the lean, up and down by the stretch of the neck.
    const head = (t: number) => { const move = join('brrl', t); return [move.turn, move.sy] as const }
    const points = Array.from({ length: 201 }, (_, i) => head(0.25 + (0.5 * i) / 200))
    // The area the path goes round, by the shoelace rule: a sway from side to side goes round none.
    let area = 0
    for (let i = 1; i < points.length; i++) area += (points[i - 1][0] * points[i][1] - points[i][0] * points[i - 1][1]) / 2
    expect(Math.abs(area)).toBeGreaterThan(0.2)
    const across = points.map((one) => one[0]), tall = points.map((one) => one[1])
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(1.5)
    expect(Math.max(...tall) - Math.min(...tall)).toBeGreaterThan(0.3)
  })
})
