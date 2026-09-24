import { describe, expect, it } from 'vitest'
import { canGrab, CLEARANCE, headClearAlong, headroom, planClimb, standableSpots, type MoveKind, type Spot } from './climb'
import { BODY_PROFILE, HAIR, HEAD_R, HEAD_Y } from './doll'
import { movePoint } from './hero'
import { PIECES, pieceShape, pointInConvex, restHeight, SHAPES, worldParts, type Placed, type Vec2 } from './pieces'

// Piece ids by kind: cubes 0, 1, 3, 8; archL 2; plank 4, 11; half 5, 9; pillar 6, 10; archM 7.
function place(id: number, x: number, y: number, angle = 0): Placed {
  return { id, parts: worldParts(pieceShape(id), { x, y, angle }) }
}

const LOW_KITE = { x: 5.2, grabY: 3.95 }

describe('planClimb', () => {
  it('climbs one cube beside the doll to reach the lowest kite', () => {
    const plan = planClimb([place(0, 5, 0.5)], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.on).toBe(0)
    expect(plan?.moves.some((m) => m.kind === 'climb')).toBe(true)
  })

  it('cannot reach the lowest kite from the bare rug', () => {
    const plan = planClimb([], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.y).toBe(0)
  })

  it('cannot pull itself up a lone pillar', () => {
    const plan = planClimb([place(6, 5, 0.95)], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.on).toBeNull()
  })

  it('climbs stairs two high', () => {
    const placed = [place(0, 2, 0.5), place(1, 3, 0.5), place(3, 3, 1.5)]
    const plan = planClimb(placed, { x: 0, y: 0, on: null }, { x: 3, grabY: 5 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.y).toBeCloseTo(2)
    expect(plan?.moves.filter((m) => m.kind === 'climb').length).toBeGreaterThanOrEqual(2)
  })

  it('waits a hand’s width back from a tower under the kite, so her reaching arm is clear of it', () => {
    const placed = [place(0, 5.2, 0.5), place(1, 5.2, 1.5)]
    const plan = planClimb(placed, { x: 2, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.y).toBe(0)
    const face = 5.2 - 0.5
    expect(face - plan!.goal.x).toBeGreaterThanOrEqual(0.75)
    expect(face - plan!.goal.x).toBeLessThan(1.2)
    const again = planClimb(placed, { x: face - 0.3, y: 0, on: null }, LOW_KITE)
    expect(face - again!.goal.x).toBeGreaterThanOrEqual(0.75)
  })

  it('needs the step: two stacked cubes alone are too tall', () => {
    const placed = [place(1, 3, 0.5), place(3, 3, 1.5)]
    expect(planClimb(placed, { x: 0, y: 0, on: null }, { x: 3, grabY: 5 })?.reachesKite).toBe(false)
  })

  it('walks up a plank ramp onto a pillar', () => {
    const angle = Math.atan2(1.9, Math.sqrt(3.4 ** 2 - 1.9 ** 2))
    const placed = [place(6, 5, 0.95), place(4, 3.1, 1.08, angle)]
    const plan = planClimb(placed, { x: 0, y: 0, on: null }, { x: 5, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.moves.some((m) => m.to.on === 4)).toBe(true)
  })

  it('cannot cross a gap wider than a hop to a higher ledge', () => {
    const placed = [place(0, 1, 0.5), place(6, 3.1, 0.95)]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 3.1, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(false)
  })

  it('pulls up to a higher ledge across a small gap', () => {
    const placed = [place(0, 1, 0.5), place(6, 2.3, 0.95)]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 2.3, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
  })

  it('crosses the wide gap on a plank bridge', () => {
    const angle = Math.atan2(0.9, 1.2)
    const bridge = place(4, 2.1 - Math.sin(angle) * 0.16, 1.45 + Math.cos(angle) * 0.16, angle)
    const placed = [place(0, 1, 0.5), place(6, 3.1, 0.95), bridge]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 3.1, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.on).toBe(4)
  })

  it('never stands on a covered surface', () => {
    const spots = standableSpots([place(0, 0, 0.5), place(1, 0, 1.5)])
    expect(spots.some((s) => s.on === 0)).toBe(false)
    expect(spots.some((s) => s.on === 1 && Math.abs(s.y - 2) < 1e-6)).toBe(true)
  })

  it('stands on the top of an arch but not inside its hole', () => {
    const spots = standableSpots([place(2, 0, 0.7)])
    const onArch = spots.filter((s) => s.on === 2)
    expect(onArch.length).toBeGreaterThan(0)
    expect(Math.min(...onArch.map((s) => s.y))).toBeGreaterThan(1)
  })

  it('climbs as high as it can near the kite when the kite is out of reach', () => {
    const plan = planClimb([place(0, 1, 0.5)], { x: 0, y: 0, on: null }, { x: 1, grabY: 8 })
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.on).toBe(0)
  })

  it('ignores a climbable block far from the kite', () => {
    const plan = planClimb([place(0, -5, 0.5)], { x: 4.8, y: 0, on: null }, { x: 5, grabY: 8 })
    expect(plan?.moves.length).toBe(0)
  })

  it('reports nothing underfoot when the support is gone', () => {
    expect(planClimb([], { x: 0, y: 2, on: 3 }, LOW_KITE)).toBeNull()
  })

  it('keeps the search small with every piece out', () => {
    const placed = [
      place(0, -4, 0.5),
      place(1, -3, 0.5),
      place(3, -3, 1.5),
      place(8, -2, 0.5),
      place(6, 0, 0.95),
      place(10, 1, 0.95),
      place(2, 0.5, 2.6),
      place(5, 3, 0.4),
      place(9, 4.5, 0.4),
      place(7, 6, 0.3),
    ]
    // The search is quadratic in the spot count, so the count is its cost.
    const rug = standableSpots([]).length
    expect(standableSpots(placed).length).toBeLessThanOrEqual(rug + 30)
    expect(planClimb(placed, { x: -6, y: 0, on: null }, { x: 5.6, grabY: 6.6 })?.moves.length).toBeGreaterThan(0)
  })

  it('grabs only when close and high enough', () => {
    expect(canGrab({ x: 5, y: 1, on: 0 }, LOW_KITE)).toBe(true)
    expect(canGrab({ x: 3.5, y: 1, on: 0 }, LOW_KITE)).toBe(false)
    expect(canGrab({ x: 5, y: 0, on: null }, LOW_KITE)).toBe(false)
  })

  it('walks from the rug onto a low step, though she keeps a body’s width back from its face', () => {
    const plan = planClimb([place(4, 3, 0.16)], { x: 0, y: 0, on: null }, { x: 3, grabY: 8 })
    expect(plan?.goal.on).toBe(4)
    expect(plan?.moves.some((m) => m.kind === 'climb')).toBe(false)
  })

  it('never plans onto the piece that just tipped under her', () => {
    const placed = [place(0, 5, 0.5)]
    expect(planClimb(placed, { x: 3.8, y: 0, on: null }, LOW_KITE)?.reachesKite).toBe(true)
    const wary = planClimb(placed, { x: 3.8, y: 0, on: null }, LOW_KITE, 0)
    expect(wary?.reachesKite).toBe(false)
    expect(wary?.goal.on).toBeNull()
  })
})

describe('standableSpots: room for her whole outline', () => {
  it('stands her in room up past her hair', () => {
    expect(CLEARANCE).toBeGreaterThanOrEqual(HEAD_Y + HEAD_R + HAIR)
  })

  it('never under a board that would go through her head, however clear her shoulders are', () => {
    // A plank bridging two pillars, its underside 1.9 up.
    const placed = [place(6, -1.3, 0.95), place(10, 1.3, 0.95), place(4, 0, 1.9 + 0.16)]
    expect(standableSpots(placed).filter((s) => s.y === 0 && Math.abs(s.x) < 0.9)).toEqual([])
  })

  it('keeps her head and body clear of a block beside her, not just her middle', () => {
    const spots = standableSpots([place(6, 0, 0.95)]).filter((s) => s.y === 0)
    expect(spots.length).toBeGreaterThan(0)
    for (const s of spots) expect(Math.abs(s.x) - 0.4, `rug spot at ${s.x}`).toBeGreaterThanOrEqual(HEAD_R + HAIR)
  })

  it('still stands on the gentle top of a dome', () => {
    const halfRest = -Math.min(...SHAPES.half.parts.flat().map((p) => p.y))
    expect(standableSpots([place(5, 0, halfRest)]).some((s) => s.on === 5)).toBe(true)
  })

  it('never on piece `avoid`', () => {
    const placed = [place(0, 2, 0.5)]
    expect(standableSpots(placed).some((s) => s.on === 0)).toBe(true)
    expect(standableSpots(placed, 0).some((s) => s.on === 0)).toBe(false)
  })

  it('stands her flat hem on a ramp, touching its high side, never dug into it', () => {
    for (const angle of [0.08, 0.2, 0.35, -0.35, 0.5, -0.6]) {
      const placed = [place(4, 0, 1.5, angle)]
      const spots = standableSpots(placed).filter((s) => s.on === 4)
      expect(spots.length, `spots on a plank at ${angle}`).toBeGreaterThan(2)
      for (const s of spots) {
        const depth = bodyDepth(placed, s)
        expect(depth, `hem in a plank at ${angle}, spot ${s.x.toFixed(2)}`).toBeLessThan(0.01)
        expect(depth, `hem touching a plank at ${angle}, spot ${s.x.toFixed(2)}`).toBeGreaterThan(-0.02)
      }
    }
  })
})

/** How far her lathed body, drawn with its feet at `p`, reaches into `placed` (negative: the gap to the nearest wood). */
function bodyDepth(placed: readonly Placed[], p: Vec2): number {
  const outline = [...BODY_PROFILE, ...[...BODY_PROFILE].reverse().map((q) => ({ x: -q.x, y: q.y }))]
  let deepest = -Infinity
  for (let i = 0; i + 1 < outline.length; i++) {
    const a = outline[i]
    const b = outline[i + 1]
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.01))
    for (let k = 0; k <= n; k++) {
      const at = { x: p.x + a.x + ((b.x - a.x) * k) / n, y: p.y + a.y + ((b.y - a.y) * k) / n }
      for (const piece of placed) {
        for (const part of piece.parts) {
          let edge = Infinity
          for (let j = 0; j < part.length; j++) {
            const c = part[j]
            const d = part[(j + 1) % part.length]
            const dx = d.x - c.x
            const dy = d.y - c.y
            const t = Math.max(0, Math.min(1, ((at.x - c.x) * dx + (at.y - c.y) * dy) / (dx * dx + dy * dy)))
            edge = Math.min(edge, Math.hypot(at.x - c.x - dx * t, at.y - c.y - dy * t))
          }
          deepest = Math.max(deepest, pointInConvex(part, at) ? edge : -edge)
        }
      }
    }
  }
  return deepest
}

/** How far a head drawn with its feet at `p` reaches into `placed` (0 when clear), measured on the round outline itself. */
function headDepth(placed: readonly Placed[], p: Vec2): number {
  const middle = { x: p.x, y: p.y + HEAD_Y }
  let deepest = 0
  for (const piece of placed) {
    for (const part of piece.parts) {
      let edge = Infinity
      for (let i = 0; i < part.length; i++) {
        const a = part[i]
        const b = part[(i + 1) % part.length]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const t = Math.max(0, Math.min(1, ((middle.x - a.x) * dx + (middle.y - a.y) * dy) / (dx * dx + dy * dy)))
        edge = Math.min(edge, Math.hypot(middle.x - a.x - dx * t, middle.y - a.y - dy * t))
      }
      const signed = pointInConvex(part, middle) ? -edge : edge
      deepest = Math.max(deepest, HEAD_R + HAIR - signed)
    }
  }
  return deepest
}

function pathDepth(placed: readonly Placed[], kind: MoveKind, a: Spot, b: Spot): number {
  const at = { x: 0, y: 0 }
  let deepest = 0
  for (let i = 0; i <= 200; i++) deepest = Math.max(deepest, headDepth(placed, movePoint(kind, a, b, i / 200, at)))
  return deepest
}

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** A heap of pieces each set straight down onto what is already there, at quarter turns and slight tilts: overhangs, arches and bridges. */
function heap(rnd: () => number): Placed[] {
  const placed: Placed[] = []
  const ids = PIECES.map((_, id) => id).sort(() => rnd() - 0.5)
  const count = 6 + Math.floor(rnd() * 6)
  for (const id of ids.slice(0, count)) {
    const shape = pieceShape(id)
    const angle = [0, Math.PI / 2, 0.3, -0.3, 0.6, -0.6][Math.floor(rnd() * 6)]
    const x = -2.5 + rnd() * 5
    placed.push({ id, parts: worldParts(shape, { x, y: restHeight(shape, angle, x, placed) - 0.06, angle }) })
  }
  return placed
}

describe('her head on the way', () => {
  // A plank hung with its underside 2.2 up: room for her head standing (CLEARANCE), none for a hop's arc.
  const board = [place(4, 0, 2.2 + 0.16)]

  it('a hop under a low board would put her head through it; a walk keeps under', () => {
    const a: Spot = { x: -0.5, y: 0, on: null }
    const b: Spot = { x: 0.6, y: 0, on: null }
    expect(headClearAlong(board, 'hop', a, b)).toBe(false)
    expect(pathDepth(board, 'hop', a, b)).toBeGreaterThan(0.2)
    expect(headClearAlong(board, 'walk', a, b)).toBe(true)
    expect(pathDepth(board, 'walk', a, b)).toBe(0)
  })

  it('measures the room over her head, for a spring that stays under the board', () => {
    expect(headroom(board, 0, 0)).toBeCloseTo(2.2 - CLEARANCE, 6)
    expect(headroom(board, 3, 0)).toBe(Infinity)
    expect(headroom([place(4, 0, 2 + 0.16)], 0, 0)).toBe(0)
  })

  it('climbs from where she really stands, a little off the nearest spot, only if her head clears the wood from there too', () => {
    // A heap found by search: from the nearest spot the climb onto the tipped cube clears the leaning pillar; from here it would not.
    const placed = [place(2, 1.029, 0.8331), place(3, -2.433, 0.695, -0.6), place(10, 0.036, 2.4199, 0.3)]
    for (const x of [-0.65, -0.6]) {
      const at: Spot = { x, y: 0, on: null }
      expect(headDepth(placed, at)).toBe(0)
      const plan = planClimb(placed, at, { x: 0, grabY: 4.5 })!
      let from = at
      for (const move of plan.moves) {
        expect(pathDepth(placed, move.kind, from, move.to), `${move.kind} from ${from.x.toFixed(2)}`).toBeLessThan(0.03)
        from = move.to
      }
    }
  })

  it('every plan keeps her head out of the wood along each move, starting from wherever she really stands', () => {
    let plans = 0
    let offSpot = 0
    let climbs = 0
    for (let seed = 1; seed <= 200; seed++) {
      const rnd = lcg(seed * 7919)
      const placed = heap(rnd)
      const rug = standableSpots(placed).filter((s) => s.y === 0)
      for (let k = 0; k < 4 && rug.length; k++) {
        const spot = rug[Math.floor(rnd() * rug.length)]
        const at: Spot = { x: spot.x + (rnd() - 0.5) * 0.5, y: 0, on: null }
        if (headDepth(placed, at) > 0) continue
        if (Math.abs(at.x - spot.x) > 0.1) offSpot++
        const plan = planClimb(placed, at, { x: -3 + rnd() * 6, grabY: 3 + rnd() * 3 })
        if (!plan) continue
        plans++
        let from = at
        for (const move of plan.moves) {
          if (move.kind !== 'walk') climbs++
          const where = `seed ${seed}: ${move.kind} from ${from.x.toFixed(2)},${from.y.toFixed(2)} to ${move.to.x.toFixed(2)},${move.to.y.toFixed(2)}`
          expect(pathDepth(placed, move.kind, from, move.to), where).toBeLessThan(0.03)
          from = move.to
        }
      }
    }
    expect(plans).toBeGreaterThan(600)
    expect(offSpot).toBeGreaterThan(300)
    expect(climbs).toBeGreaterThan(80)
  })
})
