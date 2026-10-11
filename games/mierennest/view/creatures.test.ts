import { describe, expect, it } from 'vitest'
import { paintCreature, POSES, SIZE } from './creatures'
import type { CreatureKind } from './creatures'

// The painters need no canvas to be checked: a stand-in context takes every call and remembers its name.

function standIn(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = []
  const ctx = new Proxy(
    {},
    {
      get: (_, name) => () => {
        calls.push(String(name))
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

const KINDS = Object.keys(POSES) as CreatureKind[]

describe('the creatures', () => {
  it('have the sizes the ground was cut for', () => {
    expect(SIZE).toEqual({
      ant: { width: 112, height: 28 },
      queen: { width: 120, height: 72 },
      worker: { width: 84, height: 24 },
      raider: { width: 118, height: 28 },
      beetle: { width: 124, height: 56 },
      fly: { width: 118, height: 56 },
      dungBeetle: { width: 124, height: 56 },
      dungBall: { width: 84, height: 84 },
      dungFly: { width: 118, height: 56 },
    })
  })

  it('have the poses the scenes ask for', () => {
    expect(KINDS).toHaveLength(9)
    expect(POSES.ant).toEqual(['stand', 'dig', 'look'])
    expect(POSES.queen).toEqual(['wedged', 'sit'])
    expect(POSES.worker).toEqual(['walk', 'carry', 'hips'])
    expect(POSES.raider).toEqual(['pillow', 'walk', 'stuck', 'nap'])
    expect(POSES.beetle).toEqual(['napkin', 'walk', 'onBack', 'lean'])
    expect(POSES.fly).toEqual(['hands', 'fly', 'bump'])
    expect(POSES.dungBeetle).toEqual(['polish', 'push', 'sit'])
    expect(POSES.dungBall).toEqual(['plain', 'sandy'])
    expect(POSES.dungFly).toEqual(['point', 'fly'])
  })

  for (const kind of KINDS) {
    for (const pose of POSES[kind]) {
      it(`paints ${kind} in pose ${pose} with shapes and no writing`, () => {
        for (const t of [0, 1.7]) {
          const { ctx, calls } = standIn()
          expect(() => paintCreature(ctx, kind, pose, { x: 0.4, y: -0.6 }, t)).not.toThrow()
          expect(calls).toContain('fill')
          expect(calls).not.toContain('fillText')
          expect(calls).not.toContain('strokeText')
          // Whatever a painter saves it gives back, so the caller's frame is as it left it.
          expect(calls.filter((c) => c === 'save')).toHaveLength(calls.filter((c) => c === 'restore').length)
        }
      })
    }
  }

  it('paints the first pose of a kind when asked for one it has not, and needs neither a look nor a time', () => {
    const asked = standIn()
    const first = standIn()
    paintCreature(asked.ctx, 'beetle', 'no such pose')
    paintCreature(first.ctx, 'beetle', POSES.beetle[0], { x: 0, y: 0 }, 0)
    expect(asked.calls).toEqual(first.calls)
  })
})
