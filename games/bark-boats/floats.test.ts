import { describe, expect, it } from 'vitest'
import { LAID, carryTo, play, tapAt, visit, type Visit } from './hands'
import { WATER, shoreAt } from './layout'
import { STEP } from './world'

// "A finger laid in the water makes a ring that pushes whatever floats away
// from it": the boat, and also a making or a hull that floats on its way to
// the shore.

/** A visit with `kind` let go in the water and floating. */
function afloat(kind: 'walnut' | 'twig'): Visit {
  const v = visit({})
  play(v, 0.2)
  carryTo(v, LAID[kind], { x: 880, y: 450 })
  const piece = v.game.w.pieces.find((each) => each.kind === kind)
  for (let i = 0; i < 400 && piece?.mode !== 'float'; i++) play(v, STEP)
  expect(piece?.mode, kind).toBe('float')
  return v
}

describe('a ring pushes whatever floats', () => {
  it('a hull and a twig afloat ride away from the ring, stay in the water, and still come ashore', () => {
    for (const kind of ['walnut', 'twig'] as const) {
      const pushed = afloat(kind), left = afloat(kind)
      const a = pushed.game.w.pieces.find((each) => each.kind === kind), b = left.game.w.pieces.find((each) => each.kind === kind)
      if (!a || !b) throw new Error(kind)
      expect([a.x, a.y]).toEqual([b.x, b.y])
      // A finger in the water downstream of it, clear of the thing itself: the ring pushes it upstream, to the right.
      tapAt(pushed, a.x - { walnut: 172, twig: 144 }[kind], a.y)
      expect(pushed.game.w.rings.length, kind).toBeGreaterThanOrEqual(1)
      let away = 0
      for (let i = 0; i < 1.4 / STEP; i++) {
        play(pushed, STEP); play(left, STEP)
        away = Math.max(away, a.x - b.x)
        // While the push carries it, it is in open water; it crosses the shore only on its own way in.
        if (a.mode === 'float' && Math.hypot(a.pushX, a.pushY) > 14) {
          expect(a.y, kind).toBeGreaterThan(WATER.top + 8)
          expect(a.y, kind).toBeLessThan(shoreAt(a.x))
        }
      }
      expect(away, kind).toBeGreaterThan(20)
      // The push dies away and it comes ashore where it was going.
      play(pushed, 8)
      expect(a.mode, kind).toBe('rest')
      expect(a.place.on, kind).toBe('bank')
      expect([a.x, a.y], kind).toEqual([a.place.on === 'bank' ? a.place.x : 0, a.place.on === 'bank' ? a.place.y : 0])
    }
  })

  it('a making in the middle of its own water act is pushed too, and the act goes on while it drifts; a pebble that has sunk is not', () => {
    for (const [kind, id] of [['twig', 'mast:water'], ['cap', 'cap:water'], ['berry', 'berry:water']] as const) {
      const [pushed, left] = [visit({}), visit({})]
      const pieces = [pushed, left].map((v) => {
        play(v, 0.2)
        carryTo(v, LAID[kind], { x: 880, y: 450 })
        play(v, 0.25)
        const piece = v.game.w.pieces.find((each) => each.kind === kind)
        if (!piece) throw new Error(kind)
        return piece
      })
      const [a, b] = pieces
      // It is in its act, not yet floating.
      expect(a.mode, kind).toBe('act')
      expect(pushed.game.w.acts.map((run) => run.act.id), kind).toContain(id)
      expect([a.x, a.y]).toEqual([b.x, b.y])
      tapAt(pushed, a.x - 150, a.y)
      let away = 0, during = 0
      for (let i = 0; i < 1 / STEP; i++) {
        play(pushed, STEP); play(left, STEP)
        const acting = pushed.game.w.acts.some((run) => run.act.id === id)
        // The act is the same act, at the same moment of it, as with no ring: only where it is has moved.
        expect(acting, kind).toBe(left.game.w.acts.some((run) => run.act.id === id))
        if (acting) {
          during = Math.max(during, a.x - b.x)
          expect(pushed.game.w.acts.find((run) => run.act.id === id)?.t, kind).toBe(left.game.w.acts.find((run) => run.act.id === id)?.t)
          expect(a.y, kind).toBeGreaterThan(WATER.top + 8)
          expect(a.y, kind).toBeLessThan(shoreAt(a.x))
        }
        away = Math.max(away, a.x - b.x)
      }
      expect(during, kind).toBeGreaterThan(12)
      expect(away, kind).toBeGreaterThan(20)
      play(pushed, 9)
      expect(a.mode, kind).toBe('rest')
      expect(a.place.on, kind).toBe('bank')
    }
    // The pebble sinks: it does not float, and a ring over it moves nothing.
    const [pushed, left] = [visit({}), visit({})]
    const stones = [pushed, left].map((v) => {
      play(v, 0.2)
      carryTo(v, LAID.pebble, { x: 880, y: 450 })
      play(v, 0.25)
      return v.game.w.pieces.find((each) => each.kind === 'pebble')
    })
    tapAt(pushed, 730, 450)
    for (let i = 0; i < 1 / STEP; i++) {
      play(pushed, STEP); play(left, STEP)
      expect([stones[0]?.x, stones[0]?.y]).toEqual([stones[1]?.x, stones[1]?.y])
    }
  })
})
