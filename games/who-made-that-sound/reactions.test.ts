import { describe, expect, it } from 'vitest'
import { REST, WEIGHT, type Move } from './motion'
import { IN_STEP_TAIL, REACT_SECONDS, react, reactionName } from './reactions'
import { TASTES, moveOf, reactionOf, type Reaction } from './tastes'
import { KINDS, VOICES, callSeconds, familyOf, nearOf, type Kind } from './voices'

// These tests fail when two reactions come to look alike. The measure is the
// one of motion.test.ts: both movements are sampled at 41 even points, the
// straight-line distance between the two moves is taken at each point over
// every field, and the root of the mean of its square is the distance between
// the movements. MARGIN is the least that counts as different.

type Field = keyof Move
const ALL: readonly Field[] = ['dx', 'dy', 'sx', 'sy', 'lean', 'wings', 'reach', 'turn', 'blink', 'face']
/** In step is a small move laid over the picture of a call, and it is held to the whole margin all the same. */
const MARGIN = 0.08
const REACTIONS: readonly Reaction[] = ['in-step', 'puzzled', 'delighted', 'startled']
/** What reactions.ts promises to stay inside: on its own spot, and no further over than flat on its back. */
const RANGES: Readonly<Record<Field, readonly [number, number]>> = { dx: [-0.5, 0.5], dy: [-1, 0.05], sx: [0.2, 1.8], sy: [0.2, 1.8], lean: [-1.2, 1.2], wings: [0, 1], reach: [-1, 1], turn: [-1, 1], blink: [0, 1], face: [-1, 1] }

const sampled = (curve: (t: number) => Move, points = 41) => Array.from({ length: points }, (_, i) => curve(i / (points - 1)))
const apart = (a: Move[], b: Move[]) => Math.sqrt(a.reduce((sum, move, i) => sum + ALL.reduce((at, f) => at + (move[f] - b[i][f]) ** 2, 0), 0) / a.length)
const moves = (kind: Kind, how: Reaction, away: -1 | 1 = 1, points = 101) => sampled((t) => react(kind, how, t, away), points)
/** How far a move is from standing still, over every field. */
const size = (move: Move) => Math.sqrt(ALL.reduce((sum, f) => sum + (move[f] - REST[f]) ** 2, 0))
/** The value furthest from rest that a field takes, with its sign. */
const extreme = (all: Move[], field: Field) => all.map((move) => move[field] - REST[field]).reduce((far, now) => (Math.abs(now) > Math.abs(far) ? now : far), 0)
const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length
/** The first instant, as a share of the move, at which it is half as big as it ever gets. */
const halfWayAt = (all: Move[]) => { const most = Math.max(...all.map(size)); return all.findIndex((move) => size(move) >= most / 2) / (all.length - 1) }
/** How long each look to `side` lasts, in samples: the stretches where the face is turned more than 0.4 that way. */
function looks(all: Move[], side: number): number[] {
  const runs: number[] = []
  let run = 0
  for (const move of all) { if (move.turn * side > 0.4) run++; else { if (run) runs.push(run); run = 0 } }
  return run ? [...runs, run] : runs
}
const every = () => KINDS.flatMap((kind) => REACTIONS.map((how) => ({ kind, how, id: `${kind} ${how}` })))
const byWeight = [...KINDS].sort((a, b) => WEIGHT[a] - WEIGHT[b])

describe('every reaction', () => {
  it('stays finite and on its own spot at 101 instants, whichever side the voice came from', () => {
    for (const { kind, how, id } of every()) for (const away of [-1, 1] as const) for (const move of moves(kind, how, away)) for (const field of ALL) {
      expect(Number.isFinite(move[field]), `${id} ${field}`).toBe(true)
      expect(move[field], `${id} ${field}`).toBeGreaterThanOrEqual(RANGES[field][0])
      expect(move[field], `${id} ${field}`).toBeLessThanOrEqual(RANGES[field][1])
    }
  })

  it('stands exactly at rest where it starts and ends, and comes to rest without a jump', () => {
    for (const { kind, how, id } of every()) for (const away of [-1, 1] as const) {
      expect(react(kind, how, 0, away), id).toEqual(REST)
      expect(react(kind, how, 1, away), id).toEqual(REST)
      for (const near of [0.005, 0.995]) expect(size(react(kind, how, near, away)), `${id} near ${near}`).toBeLessThan(0.08)
    }
  })

  it('holds t between 0 and 1, makes nothing of a number that is not one, and hands out a fresh move each time', () => {
    for (const { kind, how, id } of every()) {
      expect(react(kind, how, -3), id).toEqual(REST)
      expect(react(kind, how, 7), id).toEqual(REST)
      for (const odd of [NaN, Infinity, -Infinity]) for (const field of ALL) expect(Number.isFinite(react(kind, how, odd)[field]), `${id} ${field}`).toBe(true)
      // With no side given the voice came from the left, and a side that is not one is taken as that too.
      expect(react(kind, how, 0.4), id).toEqual(react(kind, how, 0.4, 1))
      expect(react(kind, how, 0.4, NaN as unknown as 1), id).toEqual(react(kind, how, 0.4, 1))
    }
    react('pip', 'startled', 0).dy = -1
    expect(react('pip', 'startled', 0)).toEqual(REST)
  })

  it('moves: nobody hears a voice and stands still', () => {
    for (const { kind, how, id } of every()) expect(Math.max(...moves(kind, how).map(size)), id).toBeGreaterThan(how === 'in-step' ? 0.1 : 0.4)
  })
})

describe('no two reactions are alike', () => {
  const curves = every().map((one) => ({ ...one, moves: moves(one.kind, one.how, 1, 41) }))

  it('all 24 differ by the margin: every two, of one kind or of two, and the small ones in step as well', () => {
    expect(curves.length).toBe(24)
    for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length; j++) {
      expect(apart(curves[i].moves, curves[j].moves), `${curves[i].id} and ${curves[j].id}`).toBeGreaterThanOrEqual(MARGIN)
    }
  })

  it('no two kinds take the same voice alike, from whichever side it comes', () => {
    for (const how of REACTIONS) for (const away of [-1, 1] as const) for (const a of KINDS) for (const b of KINDS) {
      if (a < b) expect(apart(moves(a, how, away, 41), moves(b, how, away, 41)), `${a} and ${b} ${how}`).toBeGreaterThanOrEqual(MARGIN)
    }
  })
})

describe('delighted and startled', () => {
  // One plain thing to look at for each kind, in which its like and its dislike go opposite ways. Above zero is the
  // first word and below zero the second. `away` is the side the voice did not come from.
  const OPPOSITE: Readonly<Record<Kind, { what: string; of: (all: Move[], away: number) => number }>> = {
    pip: { what: 'tall or squashed: the furthest sy goes from 1', of: (all) => extreme(all, 'sy') },
    tok: { what: 'away from the voice or towards it: the mean lean', of: (all, away) => mean(all.map((move) => move.lean * away)) },
    hoom: { what: 'belly out or drawn in: the furthest sx goes from 1', of: (all) => extreme(all, 'sx') },
    brrl: { what: 'neck long or gone: the furthest sy goes from 1', of: (all) => extreme(all, 'sy') },
    wheep: { what: 'tall or ducked: the furthest sy goes from 1', of: (all) => extreme(all, 'sy') },
    dooo: { what: 'up or flat: the furthest sy goes from 1', of: (all) => extreme(all, 'sy') },
  }

  it('are opposites for each kind in the one thing named for it', () => {
    for (const kind of KINDS) for (const away of [-1, 1] as const) {
      const { what, of } = OPPOSITE[kind], glad = of(moves(kind, 'delighted', away), away), scared = of(moves(kind, 'startled', away), away)
      expect(Math.abs(glad), `${kind} delighted, ${what}`).toBeGreaterThan(0.1)
      expect(Math.abs(scared), `${kind} startled, ${what}`).toBeGreaterThan(0.1)
      expect(Math.sign(glad), `${kind}, ${what}`).toBe(-Math.sign(scared))
    }
  })
})

describe('startled', () => {
  it('goes away from the voice, by a step or a lean or both, and never towards it', () => {
    for (const kind of KINDS) for (const away of [-1, 1] as const) {
      const all = moves(kind, 'startled', away)
      expect(Math.max(extreme(all, 'dx') * away, extreme(all, 'lean') * away), kind).toBeGreaterThan(0.1)
      expect(mean(all.map((move) => move.dx * away)), `${kind} dx`).toBeGreaterThan(0)
      expect(mean(all.map((move) => move.lean * away)), `${kind} lean`).toBeGreaterThan(0)
    }
  })

  it('mirrors when the voice comes from the other side: the step and the lean change sign and the rest is the same', () => {
    for (const kind of KINDS) {
      const right = moves(kind, 'startled', 1), left = moves(kind, 'startled', -1)
      for (const [i, move] of right.entries()) {
        expect(left[i].dx, `${kind} dx`).toBeCloseTo(-move.dx, 12)
        expect(left[i].lean, `${kind} lean`).toBeCloseTo(-move.lean, 12)
        expect({ ...left[i], dx: 0, lean: 0 }, kind).toEqual({ ...move, dx: 0, lean: 0 })
      }
    }
  })

  it('is quick to start: half as big as it ever gets within the first fifth', () => {
    for (const kind of KINDS) expect(halfWayAt(moves(kind, 'startled')), kind).toBeLessThanOrEqual(0.2)
  })

  it('passes within the move: in the last tenth it is less than half of what it was', () => {
    for (const kind of KINDS) { const all = moves(kind, 'startled'), most = Math.max(...all.map(size)); expect(Math.max(...all.slice(90).map(size)), kind).toBeLessThan(most / 2) }
  })
})

describe('puzzled', () => {
  it('looks towards the voice at two separate moments, the second look longer than the first', () => {
    for (const kind of KINDS) for (const away of [-1, 1] as const) {
      const runs = looks(moves(kind, 'puzzled', away), -away)
      expect(runs.length, kind).toBeGreaterThanOrEqual(2)
      expect(runs[runs.length - 1], kind).toBeGreaterThan(runs[0])
    }
  })

  it('mirrors when the voice comes from the other side', () => {
    for (const kind of KINDS) for (const [i, move] of moves(kind, 'puzzled', 1).entries()) expect(react(kind, 'puzzled', i / 100, -1).turn, kind).toBeCloseTo(-move.turn, 12)
  })

  it('is slow to start: not half as big as it gets before 15 percent', () => {
    for (const kind of KINDS) expect(halfWayAt(moves(kind, 'puzzled')), kind).toBeGreaterThanOrEqual(0.15)
  })
})

describe('weight', () => {
  it('shows in how long every reaction takes: of any two kinds the heavier takes longer', () => {
    for (const how of REACTIONS) for (let i = 1; i < byWeight.length; i++) {
      expect(REACT_SECONDS[byWeight[i]][how], `${byWeight[i]} ${how}`).toBeGreaterThan(REACT_SECONDS[byWeight[i - 1]][how])
    }
  })

  it('keeps every reaction to a length a small child will wait for', () => {
    expect(Object.keys(REACT_SECONDS).sort()).toEqual([...KINDS].sort())
    for (const { kind, how, id } of every()) {
      expect(REACT_SECONDS[kind][how], id).toBeGreaterThanOrEqual(how === 'in-step' ? 0.5 : 0.9)
      expect(REACT_SECONDS[kind][how], id).toBeLessThanOrEqual(how === 'in-step' ? 1.2 : 1.4)
    }
  })

  it('shows in the air: the lightest goes highest, nobody goes higher than a lighter one, and the two heavy ones never leave the ground', () => {
    const top = (kind: Kind) => Math.max(...REACTIONS.flatMap((how) => moves(kind, how).map((move) => -move.dy)))
    for (let i = 1; i < byWeight.length; i++) expect(top(byWeight[i]), byWeight[i]).toBeLessThanOrEqual(top(byWeight[i - 1]))
    expect(top('pip')).toBeGreaterThan(0.3)
    for (const kind of ['brrl', 'hoom'] as const) expect(top(kind), kind).toBeCloseTo(0, 12)
  })
})

describe('the name of a reaction', () => {
  it('is the one tastes.ts gives for every pair of kinds', () => {
    for (const listener of KINDS) for (const heard of KINDS) expect(reactionName(listener, reactionOf(listener, heard)), `${listener} hears ${heard}`).toBe(moveOf(listener, heard))
  })

  it('is the listener\'s own, and every reaction of every kind is brought about by some voice', () => {
    for (const kind of KINDS) {
      expect(reactionName(kind, 'delighted')).toBe(TASTES[kind].delight)
      expect(reactionName(kind, 'startled')).toBe(TASTES[kind].startle)
      expect(reactionName(kind, 'puzzled')).toBe(moveOf(kind, nearOf(kind)))
      expect(reactionName(kind, 'in-step')).toBe(`${kind}-in-step`)
      expect(new Set(KINDS.map((heard) => reactionOf(kind, heard)))).toEqual(new Set(REACTIONS))
      expect(familyOf(nearOf(kind))).toBe(familyOf(kind))
    }
    expect(new Set(every().map(({ kind, how }) => reactionName(kind, how))).size).toBe(24)
  })
})

// The second column of the grid in ART.md. `away` is the side the other of the pair is not on, so towards it is `-away`.
describe('two who sound as one, kind by kind', () => {
  const both = [-1, 1] as const
  /** Where a moment `seconds` into the call is in the in-step move, which lasts the call and IN_STEP_TAIL more. */
  const at = (kind: Kind, seconds: number) => seconds / (callSeconds(VOICES[kind]) + IN_STEP_TAIL)

  it('tok: the two jab at each other once on each note, turned to each other, and stand up between the notes', () => {
    const second = VOICES.tok.length + VOICES.tok.gap
    for (const away of both) {
      const jab = (seconds: number) => react('tok', 'in-step', at('tok', seconds), away)
      for (const note of [0, second]) {
        // On the note it leans and reaches towards the other, with its beak turned that way.
        const on = jab(note + VOICES.tok.length / 2)
        expect(on.lean * -away).toBeGreaterThan(0.4)
        expect(on.dx * -away).toBeGreaterThan(0.1)
        expect(on.turn * -away).toBeGreaterThan(0.8)
      }
      // Between the two notes it is nearly upright again, so they are two knocks and not one long lean.
      expect(Math.abs(jab(second - 0.02).lean)).toBeLessThan(0.1)
    }
  })

  it('hoom: each comes over to the other and swells, so the bellies meet', () => {
    for (const away of both) {
      const mid = react('hoom', 'in-step', 0.5, away)
      expect(mid.dx * -away).toBeGreaterThan(0.12)
      expect(mid.sx).toBeGreaterThan(1.08)
    }
  })

  it('brrl: both necks go up long and sway the same way at the same moment, side by side, each head turned to the other', () => {
    const left = sampled((t) => react('brrl', 'in-step', t, -1), 81), right = sampled((t) => react('brrl', 'in-step', t, 1), 81)
    left.forEach((move, i) => {
      // The same lean at every instant: two necks that lean alike lie along each other and never cross.
      expect(move.lean).toBe(right[i].lean)
      expect(move.dx).toBe(right[i].dx)
      expect(move.sy).toBe(right[i].sy)
      // Only the heads differ: each is turned to the other.
      expect(move.turn).toBeCloseTo(-right[i].turn, 12)
    })
    const leans = right.map((move) => move.lean)
    expect(Math.max(...leans)).toBeGreaterThan(0.2)
    expect(Math.min(...leans)).toBeLessThan(-0.2)
    expect(Math.max(...right.map((move) => move.sy))).toBeGreaterThan(1.15)
    expect(react('brrl', 'in-step', 0.5, 1).turn).toBeLessThan(-0.6)
  })

  it('wheep: a bounce off the ground, and higher the more it is given', () => {
    const top = (much: number) => Math.max(...sampled((t) => react('wheep', 'in-step', t, 1, much), 101).map((move) => -move.dy))
    expect(top(1 / 3)).toBeGreaterThan(0.05)
    expect(top(2 / 3)).toBeGreaterThan(top(1 / 3) + 0.05)
    expect(top(1)).toBeGreaterThan(top(2 / 3) + 0.05)
    // Given nothing to say how much, it is the highest; and anything that is not a share counts as all of it.
    expect(sampled((t) => react('wheep', 'in-step', t, 1), 21)).toEqual(sampled((t) => react('wheep', 'in-step', t, 1, 1), 21))
    expect(top(Number.NaN)).toBe(top(1))
    expect(top(7)).toBe(top(1))
  })

  it('dooo: the two sink with the glide and slide the same way, side by side', () => {
    const left = react('dooo', 'in-step', 0.6, -1), right = react('dooo', 'in-step', 0.6, 1)
    expect(left).toEqual(right)
    expect(Math.abs(left.dx)).toBeGreaterThan(0.25)
    expect(left.sy).toBeLessThan(0.75)
    // Lowest when the glide is at its end.
    expect(react('dooo', 'in-step', at('dooo', callSeconds(VOICES.dooo)), 1).sy).toBeLessThan(0.7)
  })

  it('pip: the two rock as one, the same way whichever side the other is on, since one sits on the other', () => {
    expect(sampled((t) => react('pip', 'in-step', t, -1), 41)).toEqual(sampled((t) => react('pip', 'in-step', t, 1), 41))
  })

  it('leans towards the other from either side: the two sides of a pair mirror each other, for the kinds that lean', () => {
    for (const kind of ['tok', 'hoom'] as const) {
      const left = sampled((t) => react(kind, 'in-step', t, -1), 41), right = sampled((t) => react(kind, 'in-step', t, 1), 41)
      left.forEach((move, i) => {
        expect(move.lean, kind).toBeCloseTo(-right[i].lean, 9)
        expect(move.dx, kind).toBeCloseTo(-right[i].dx, 9)
        expect(move.sy, kind).toBeCloseTo(right[i].sy, 9)
      })
    }
  })
})
