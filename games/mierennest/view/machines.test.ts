import { describe, expect, it } from 'vitest'
import { MACHINE_SIZE, paintMachine } from './machines'
import type { Load, MachineKind, MachinePose } from './machines'

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

const KINDS: MachineKind[] = ['catapult', 'cannon']
const LOADS: Load[] = ['sand', 'mud', 'stone', null]
const POSES: MachinePose[] = ['ready', 'fired']

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
  }
})
