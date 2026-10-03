import { describe, expect, it } from 'vitest'
import { BLADES } from './hand'
import { COLLAR_Y, LOCK_X, STEP, tipY } from './layout'
import { Sprites } from './sprites'
import { Toy } from './toy'
import { drawFrame } from './view'
import type { Ctx, MakeSheet, Sheet } from './wash'

// A stand-in for a 2D context: it takes every call and every setting, and keeps the names of what was called.
function fakeSheets(): { make: MakeSheet; calls: string[]; made: () => number } {
  const calls: string[] = []
  let made = 0
  const make: MakeSheet = (width, height) => {
    made++
    const canvas = { width, height }
    const g = new Proxy({} as Record<string, unknown>, {
      get: (target, name: string) => {
        if (name in target) return target[name]
        return () => {
          calls.push(name)
          if (name === 'createRadialGradient') return { addColorStop: () => {} }
          if (name === 'createPattern') return {}
          return undefined
        }
      },
      set: (target, name: string, value) => { target[name] = value; return true },
    })
    return { canvas, g } as unknown as Sheet
  }
  return { make, calls, made: () => made }
}
const W = 2360, H = 1640
const opened = (): Toy => { const toy = new Toy(5); toy.open(null, null); return toy }
const frameOf = (toy: Toy, guidance: { glow: number; demo: number | null; demoIndex: number } | null = null) => ({ salon: toy.game, puppet: toy.puppet, hair: toy.hair, guidance, time: toy.time })

describe('one frame of the toy', () => {
  it('draws the bare room before the slot has been read, in one stamp', () => {
    const { make, calls } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), toy = new Toy(1)
    const painting = calls.length
    expect(drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy))).toBe(1)
    expect(calls.slice(painting)).toEqual(['setTransform', 'drawImage'])
  })

  it('writes nothing, ever: no text call in the painting or in any frame', () => {
    const { make, calls } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), toy = opened()
    for (let i = 0; i < 30; i++) { toy.step(1 / 60, true); drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy, { glow: 1, demo: i / 30, demoIndex: i % 2 })) }
    for (const name of ['fillText', 'strokeText', 'measureText']) expect(calls).not.toContain(name)
  })

  it('stays under the budget of pieces in the busiest frame: everything in the air, a full floor, the glow and the hand', () => {
    const { make } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H)
    const toy = new Toy(5)
    toy.open({ ...opened().save(), clippings: Array.from({ length: 12 }, (_, i) => ({ len: 20 + i, hue: 'lion', on: 'floor', x: i * 8 })) }, null)
    toy.gesture({ type: 'press', at: { x: 150, y: 150 } })
    toy.gesture({ type: 'dragStart', from: { x: 150, y: 150 } })
    toy.gesture({ type: 'dragMove', from: { x: 150, y: 150 }, at: { x: 900, y: 150 } })
    toy.gesture({ type: 'dragMove', from: { x: 150, y: 150 }, at: { x: LOCK_X - 80, y: tipY(20) - BLADES.y } })
    toy.gesture({ type: 'dragMove', from: { x: 150, y: 150 }, at: { x: LOCK_X + 80, y: tipY(20) - BLADES.y } })
    toy.hair.lockRuffled()
    toy.step(1 / 60, false)
    expect(toy.hair.puffs.length).toBeGreaterThan(5)
    const drawn = drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy, { glow: 1, demo: 0.5, demoIndex: 1 }))
    // The jam's bar is about 80 draws a frame.
    expect(drawn).toBeLessThanOrEqual(80)
    const calm = opened()
    expect(drawFrame(surface.g as Ctx, W, H, sprites, frameOf(calm))).toBeLessThanOrEqual(45)
  })

  it('paints each tuft once, and again only when its length has changed enough to show', () => {
    const { make } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), toy = opened()
    for (let i = 0; i < 60; i++) { toy.step(1 / 60, true); drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy)) }
    expect(sprites.repaints).toBe(toy.game!.mane.length)
    // A long, slow pull on one tuft: the sheet it has is stretched, and painted again only a few times.
    const start = { x: 520, y: 150 }
    toy.gesture({ type: 'press', at: start })
    toy.gesture({ type: 'dragStart', from: start })
    for (let i = 1; i <= 60; i++) {
      toy.gesture({ type: 'dragMove', from: start, at: { x: 520, y: 150 - i * 2 } })
      toy.step(1 / 60, false)
      drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy))
    }
    const during = sprites.repaints - toy.game!.mane.length
    expect(during).toBeLessThanOrEqual(4)
    toy.gesture({ type: 'dragEnd', from: start, at: { x: 520, y: 30 } })
    drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy))
    expect(sprites.repaints - toy.game!.mane.length).toBeLessThanOrEqual(during + 1)
  })

  it('makes its sheets once for a size: a frame makes none', () => {
    const { make, made } = fakeSheets()
    const sprites = new Sprites(make, W, H, 1), surface = make(W, H), toy = opened()
    drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy))
    const after = made()
    for (let i = 0; i < 20; i++) { toy.step(1 / 60, true); drawFrame(surface.g as Ctx, W, H, sprites, frameOf(toy)) }
    expect(made()).toBe(after)
    expect(COLLAR_Y + 100 * STEP).toBeGreaterThan(0)
  })
})
