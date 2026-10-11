import { describe, expect, it } from 'vitest'
import { Sprites, Stamps, letGo } from './sprites'

// A canvas keeps its backing store until it is collected, unless its size is set to nothing first. These hold that
// every canvas the sprites and the stamps made is let go when they are made again at another scale, and when the
// view is disposed of. A stand-in canvas takes every drawing call and remembers only its size.

const anything: unknown = new Proxy(function () {}, { get: () => anything, apply: () => anything, set: () => true })
const made: { width: number; height: number }[] = []
const canvasOf = (width: number, height: number) => {
  const canvas = { width, height, getContext: () => anything }
  made.push(canvas)
  return canvas as unknown as HTMLCanvasElement
}
const pen = anything as CanvasRenderingContext2D
const box = { width: 40, height: 30, originX: 20, originY: 15 }

describe('painted canvases', () => {
  it('are let go when the sprites are made again at another scale, and when they are released', () => {
    made.length = 0
    const sprites = new Sprites(1, canvasOf)
    sprites.get('ant', 'stand')
    sprites.get('worker', 'stand')
    expect(made.map((canvas) => canvas.width > 0 && canvas.height > 0)).toEqual([true, true])
    // The same scale again makes nothing again and lets nothing go.
    sprites.rescale(1)
    expect(sprites.get('ant', 'stand').image).toBe(made[0])
    expect(made[0].width).toBeGreaterThan(0)
    sprites.rescale(2)
    expect(made.map((canvas) => [canvas.width, canvas.height])).toEqual([[0, 0], [0, 0]])
    sprites.get('ant', 'stand')
    expect(made.length).toBe(3)
    expect(made[2].width).toBeGreaterThan(0)
    sprites.release()
    expect(made.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true)
  })

  it('are let go when the stamps are made again at another scale, and when they are released', () => {
    made.length = 0
    const stamps = new Stamps(1, canvasOf)
    stamps.stamp(pen, 'one', box, () => {}, 0, 0)
    stamps.stamp(pen, 'two', box, () => {}, 0, 0, true)
    stamps.stamp(pen, 'one', box, () => {}, 5, 5)
    expect(made.map((canvas) => [canvas.width, canvas.height])).toEqual([[40, 30], [40, 30]])
    stamps.rescale(1.5)
    expect(made.map((canvas) => [canvas.width, canvas.height])).toEqual([[0, 0], [0, 0]])
    stamps.stamp(pen, 'one', box, () => {}, 0, 0)
    expect([made[2].width, made[2].height]).toEqual([60, 45])
    stamps.release()
    expect(made[2].width).toBe(0)
  })

  it('a canvas that is not there is let go without a word', () => {
    letGo(null)
    const canvas = { width: 3, height: 4 }
    letGo(canvas)
    expect(canvas).toEqual({ width: 0, height: 0 })
  })
})
