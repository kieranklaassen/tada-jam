import { describe, expect, it } from 'vitest'
import { MACHINE_SIZE, paintMachine } from './machines'
import type { Load, MachineKind, MachinePose } from './machines'
import { MACHINE, MUD, SAND, STONE } from './palette'

// A stand-in context: it takes every call and remembers its name and its numbers, and every colour that is set.
function standIn(): { ctx: CanvasRenderingContext2D; calls: string[]; seen: string[] } {
  const calls: string[] = []
  const seen: string[] = []
  const ctx = new Proxy(
    {},
    {
      get:
        (_, name) =>
        (...n: unknown[]) => {
          calls.push(String(name))
          seen.push(`${String(name)} ${n.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(' ')}`)
          return undefined
        },
      set: (_, name, value) => {
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
  const ctx = new Proxy({}, { get: (_, name) => does[String(name)] ?? (() => undefined), set: () => true }) as unknown as CanvasRenderingContext2D
  return { ctx, xs, ys }
}

const KINDS: MachineKind[] = ['catapult', 'cannon']
const LOADS: Load[] = ['sand', 'mud', 'stone', null]
const POSES: MachinePose[] = ['ready', 'fired']
const LOAD_COLOUR = { sand: SAND.fill, mud: MUD.fill, stone: STONE.fill } as const

/** Whether a colour was set as a fill or as a stroke. */
const sets = (seen: string[], colour: string) => seen.includes(`fillStyle = ${colour}`) || seen.includes(`strokeStyle = ${colour}`)

function painted(kind: MachineKind, load: Load, pose: MachinePose) {
  const s = standIn()
  paintMachine(s.ctx, kind, load, pose)
  return s
}

describe('the machines', () => {
  it('are two cells wide and two high', () => {
    expect(MACHINE_SIZE).toEqual({ width: 56, height: 56 })
  })

  for (const kind of KINDS) {
    for (const pose of POSES) {
      for (const load of LOADS) {
        it(`paints the ${kind}, ${pose}, loaded with ${load ?? 'nothing'}, in shapes and no writing`, () => {
          const s = standIn()
          expect(() => paintMachine(s.ctx, kind, load, pose)).not.toThrow()
          expect(s.calls).toContain('fill')
          expect(s.calls).not.toContain('fillText')
          expect(s.calls).not.toContain('strokeText')
          expect(s.calls.filter((c) => c === 'save')).toHaveLength(s.calls.filter((c) => c === 'restore').length)
        })
      }
    }

    for (const load of LOADS) {
      it(`paints the ${kind} with ${load ?? 'nothing'} differently ready and fired`, () => {
        expect(painted(kind, load, 'ready').seen).not.toEqual(painted(kind, load, 'fired').seen)
      })
    }

    // The load shows plainly while it waits, and leaves its crumbs behind once it has gone.
    for (const pose of POSES) {
      it(`shows each load of the ${kind}, ${pose}, differently from the others and from none`, () => {
        const pictures = LOADS.map((load) => painted(kind, load, pose).seen.join('\n'))
        expect(new Set(pictures).size).toBe(LOADS.length)
      })
    }

    // The one fresh green under the grass: a machine is found by its colour.
    it(`paints the ${kind} in the green of the machines`, () => {
      for (const load of LOADS) expect(sets(painted(kind, load, 'ready').seen, MACHINE.body), String(load)).toBe(true)
    })

    // What is loaded is seen at a glance: the plain colour of the lump itself, and an empty machine has none of it.
    for (const load of ['sand', 'mud', 'stone'] as const) {
      it(`shows the ${load} in the ${kind} in the colour of ${load}`, () => {
        const full = painted(kind, load, 'ready').seen
        const empty = painted(kind, null, 'ready').seen
        expect(sets(full, LOAD_COLOUR[load])).toBe(true)
        expect(sets(empty, LOAD_COLOUR[load])).toBe(false)
        expect(full).not.toEqual(empty)
        for (const other of ['sand', 'mud', 'stone'] as const) if (other !== load) expect(sets(full, LOAD_COLOUR[other]), other).toBe(false)
      })
    }

    // Ready, a machine fills its place of 56 by 56 and stays in it: every point of every path lies within a few
    // units of the box, and the painting reaches near each of its four sides.
    for (const load of LOADS) {
      it(`keeps the ${kind}, ready with ${load ?? 'nothing'}, in its place and fills it`, () => {
        const t = tracing()
        paintMachine(t.ctx, kind, load, 'ready')
        const half = MACHINE_SIZE.width / 2
        expect(Math.min(...t.xs)).toBeGreaterThanOrEqual(-half - 6)
        expect(Math.max(...t.xs)).toBeLessThanOrEqual(half + 6)
        expect(Math.min(...t.ys)).toBeGreaterThanOrEqual(-MACHINE_SIZE.height - 6)
        expect(Math.max(...t.ys)).toBeLessThanOrEqual(4)
        // The width of a stroke is not counted here, and it adds two units or more at each side.
        expect(Math.min(...t.xs)).toBeLessThanOrEqual(-half + 5)
        expect(Math.max(...t.xs)).toBeGreaterThanOrEqual(half - 5)
        expect(Math.min(...t.ys)).toBeLessThanOrEqual(-MACHINE_SIZE.height + 6)
        expect(Math.max(...t.ys)).toBeGreaterThanOrEqual(-2)
      })
    }

    // Fired, the arm of the catapult may stand above the box and the barrel of the cannon slides back out of it,
    // but neither leaves the room there is round a machine: 40 either side, 68 up.
    it(`keeps the fired ${kind} near its place`, () => {
      for (const load of LOADS) {
        const t = tracing()
        paintMachine(t.ctx, kind, load, 'fired')
        expect(Math.min(...t.xs), String(load)).toBeGreaterThanOrEqual(-40)
        expect(Math.max(...t.xs), String(load)).toBeLessThanOrEqual(40)
        expect(Math.min(...t.ys), String(load)).toBeGreaterThanOrEqual(-68)
        expect(Math.max(...t.ys), String(load)).toBeLessThanOrEqual(4)
      }
    })
  }
})
