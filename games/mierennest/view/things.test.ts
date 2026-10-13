import { describe, expect, it } from 'vitest'
import { paintEffect, paintThing, THING_SIZE } from './things'
import type { Effect, Thing } from './things'

// A stand-in context: it takes every call and remembers its name and its numbers, and every colour that is set.
function standIn(): { ctx: CanvasRenderingContext2D; calls: string[]; seen: string[] } {
  const calls: string[] = []
  const seen: string[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const ctx = new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === 'globalAlpha') return state.globalAlpha
        return (...n: unknown[]) => {
          calls.push(String(name))
          seen.push(`${String(name)} ${n.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(' ')}`)
          return undefined
        }
      },
      set: (_, name, value) => {
        state[String(name)] = value
        seen.push(`${String(name)} = ${String(value)}`)
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls, seen }
}

// A second stand-in that follows the moves of the drawing frame (save, restore, translate, rotate, scale) and
// remembers where every point of every path lands in the frame the painting started in. An oval is walked round
// in small steps; of a curve it keeps the ends and the handles, which lie round the curve. The width of a stroke
// is not counted, so a bound checked with it needs a few units of room.
function tracing(): { ctx: CanvasRenderingContext2D; xs: number[]; ys: number[] } {
  const xs: number[] = []
  const ys: number[] = []
  let m = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []
  const by = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]
  }
  const at = (x: number, y: number) => {
    xs.push(m[0] * x + m[2] * y + m[4])
    ys.push(m[1] * x + m[3] * y + m[5])
  }
  const points = (...n: number[]) => {
    for (let i = 0; i + 1 < n.length; i += 2) at(n[i], n[i + 1])
  }
  const round = (x: number, y: number, rx: number, ry: number, rot: number, from: number, to: number) => {
    for (let i = 0; i <= 32; i++) {
      const a = from + ((to - from) * i) / 32
      const ex = Math.cos(a) * rx
      const ey = Math.sin(a) * ry
      at(x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot))
    }
  }
  const does: Record<string, (...n: number[]) => void> = {
    save: () => void stack.push(m),
    restore: () => void (m = stack.pop() ?? m),
    translate: (x, y) => by(1, 0, 0, 1, x, y),
    rotate: (a) => by(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0),
    scale: (x, y) => by(x, 0, 0, y, 0, 0),
    moveTo: points,
    lineTo: points,
    quadraticCurveTo: points,
    bezierCurveTo: points,
    ellipse: round,
    arc: (x, y, r, from, to) => round(x, y, r, r, 0, from, to),
  }
  const ctx = new Proxy({}, { get: (_, name) => (name === 'globalAlpha' ? 1 : (does[String(name)] ?? (() => undefined))), set: () => true }) as unknown as CanvasRenderingContext2D
  return { ctx, xs, ys }
}

// The things of the back wall of a room, and the one keepsake that hangs at the camp on the grass.
const WALL_THINGS: Thing[] = ['seeds', 'bed', 'cup', 'shelf', 'lamp', 'washing']
const THINGS: Thing[] = [...WALL_THINGS, 'leaf']
const EFFECTS: Effect[] = ['scuff', 'prints', 'sandBlast', 'mudBall', 'stoneShot', 'puff', 'splat', 'smoke', 'twang']

/** Painted in shapes and no writing. The shake of a catapult is lines only, so its mark is a stroke. */
function plain(s: { calls: string[] }, mark: 'fill' | 'stroke' = 'fill'): void {
  expect(s.calls).toContain(mark)
  expect(s.calls).not.toContain('fillText')
  expect(s.calls).not.toContain('strokeText')
  expect(s.calls.filter((c) => c === 'save')).toHaveLength(s.calls.filter((c) => c === 'restore').length)
}

describe('the things on the back wall', () => {
  it('are each within 50 by 40, and the keepsake leaf is 30 by 44', () => {
    expect(Object.keys(THING_SIZE).sort()).toEqual([...THINGS].sort())
    expect(THING_SIZE.leaf).toEqual({ width: 30, height: 44 })
    for (const thing of WALL_THINGS) {
      expect(THING_SIZE[thing].width, thing).toBeGreaterThan(0)
      expect(THING_SIZE[thing].width, thing).toBeLessThanOrEqual(50)
      expect(THING_SIZE[thing].height, thing).toBeGreaterThan(0)
      expect(THING_SIZE[thing].height, thing).toBeLessThanOrEqual(40)
    }
  })

  for (const thing of THINGS) {
    for (const lit of [undefined, false, true]) {
      it(`paints the ${thing}${lit ? ', lit,' : lit === false ? ', unlit,' : ''} in shapes and no writing`, () => {
        const s = standIn()
        expect(() => paintThing(s.ctx, thing, lit)).not.toThrow()
        plain(s)
      })
    }
  }

  it('paints every thing inside its own size, standing on its foot', () => {
    for (const thing of THINGS) {
      const t = tracing()
      paintThing(t.ctx, thing, true)
      const { width, height } = THING_SIZE[thing]
      expect(Math.min(...t.xs), thing).toBeGreaterThanOrEqual(-width / 2 - 2)
      expect(Math.max(...t.xs), thing).toBeLessThanOrEqual(width / 2 + 2)
      expect(Math.min(...t.ys), thing).toBeGreaterThanOrEqual(-height - 2)
      expect(Math.max(...t.ys), thing).toBeLessThanOrEqual(2)
    }
  })

  it('paints the leaf the same lit or not', () => {
    const lit = standIn()
    const unlit = standIn()
    paintThing(lit.ctx, 'leaf', true)
    paintThing(unlit.ctx, 'leaf', false)
    expect(lit.seen).toEqual(unlit.seen)
  })

  it('paints the lit lamp differently from the unlit one, and a lamp that is told nothing as unlit', () => {
    const lit = standIn()
    const unlit = standIn()
    const untold = standIn()
    paintThing(lit.ctx, 'lamp', true)
    paintThing(unlit.ctx, 'lamp', false)
    paintThing(untold.ctx, 'lamp')
    expect(lit.seen).not.toEqual(unlit.seen)
    expect(untold.seen).toEqual(unlit.seen)
  })
})

describe('the effects', () => {
  for (const effect of EFFECTS) {
    it(`paints the ${effect} at every progress in shapes and no writing`, () => {
      for (const progress of [undefined, 0, 0.5, 1, -3, 7]) {
        const s = standIn()
        expect(() => paintEffect(s.ctx, effect, progress)).not.toThrow()
        plain(s, 'fill')
        expect(s.seen.join(' ')).not.toContain('NaN')
      }
    })
  }

  // An effect is stamped into a box of 96 by 96 about its origin: nothing of it may lie further out than 46.
  for (const effect of EFFECTS) {
    it(`keeps the ${effect} within 46 of its origin`, () => {
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const t = tracing()
        paintEffect(t.ctx, effect, progress)
        for (const v of [Math.min(...t.xs), Math.max(...t.xs), Math.min(...t.ys), Math.max(...t.ys)]) expect(Math.abs(v), `${effect} at ${progress}`).toBeLessThanOrEqual(46)
      }
    })
  }

  // The shots are large: each reaches most of the way to the edge of its box.
  it('paints the shots large', () => {
    const reach = (effect: Effect, progress: number) => {
      const t = tracing()
      paintEffect(t.ctx, effect, progress)
      return { left: Math.min(...t.xs), right: Math.max(...t.xs), high: Math.max(...t.ys) - Math.min(...t.ys), wide: Math.max(...t.xs) - Math.min(...t.xs) }
    }
    expect(reach('sandBlast', 1).right).toBeGreaterThanOrEqual(42)
    expect(reach('sandBlast', 1).high).toBeGreaterThanOrEqual(32)
    for (const ball of ['mudBall', 'stoneShot'] as const) {
      expect(reach(ball, 0.5).left, ball).toBeLessThanOrEqual(-40)
      expect(reach(ball, 0.5).right, ball).toBeGreaterThanOrEqual(12)
      expect(reach(ball, 0.5).high, ball).toBeGreaterThanOrEqual(24)
    }
    expect(reach('splat', 0.5).wide).toBeGreaterThanOrEqual(36)
    expect(reach('puff', 1).wide).toBeGreaterThanOrEqual(36)
    expect(reach('smoke', 0).wide).toBeGreaterThanOrEqual(26)
    expect(reach('smoke', 1).wide).toBeGreaterThanOrEqual(40)
    // The smoke opens to the right of the mouth it comes from and drifts upward.
    expect(reach('smoke', 0).left).toBeGreaterThanOrEqual(-4)
  })

  // The trail of the stone is three streaks of three lengths: two equal bars would read as a sign.
  it('trails the stone with three streaks of three clearly different lengths', () => {
    const s = standIn()
    paintEffect(s.ctx, 'stoneShot', 0.5)
    // Each streak is a pointed shape of three corners: its tail, and the two corners of its head.
    const lengths: number[] = []
    for (let i = 0; i + 2 < s.seen.length; i++) {
      const run = [s.seen[i], s.seen[i + 1], s.seen[i + 2], s.seen[i + 3]]
      if (!run.slice(0, 3).every((c) => c.startsWith('lineTo ')) || run[3] !== 'closePath ') continue
      const xs = run.slice(0, 3).map((c) => Number(c.split(' ')[1]))
      lengths.push(Math.max(...xs) - Math.min(...xs))
    }
    expect(lengths).toHaveLength(3)
    const sorted = [...lengths].sort((a, b) => a - b)
    expect(sorted[1] - sorted[0]).toBeGreaterThanOrEqual(5)
    expect(sorted[2] - sorted[1]).toBeGreaterThanOrEqual(5)
  })

  for (const effect of ['sandBlast', 'puff', 'smoke', 'twang'] as const) {
    it(`changes the ${effect} as it goes on`, () => {
      const pictures = [0, 0.5, 1].map((progress) => {
        const s = standIn()
        paintEffect(s.ctx, effect, progress)
        return s.seen.join('\n')
      })
      expect(new Set(pictures).size).toBe(3)
    })
  }

  it('paints the smoke at its start differently from its end', () => {
    const start = standIn()
    const end = standIn()
    paintEffect(start.ctx, 'smoke', 0)
    paintEffect(end.ctx, 'smoke', 1)
    expect(start.seen).not.toEqual(end.seen)
  })

  // Smoke and the shake of a catapult are round blobs and curved lines: no corner that could make a spike.
  it('paints the smoke and the twang without a straight edge', () => {
    for (const effect of ['smoke', 'twang'] as const) {
      for (const progress of [0, 0.5, 1]) {
        const s = standIn()
        paintEffect(s.ctx, effect, progress)
        expect(s.calls, effect).toContain('ellipse')
        expect(s.calls, effect).not.toContain('lineTo')
      }
    }
  })
})
