import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { IdleLadder } from './guidance'
import { COCK, LAMP, SPOT, pictureAt, thingHome } from './layout'
import { CELL, DYES, Loom, dyed } from './loom'
import { Play } from './play'
import { fresh } from './save'
import { CAST, morning } from './tale'
import { View } from './view'

// The view over a stand-in canvas: it draws every state without falling over,
// makes nothing anew from frame to frame, and stays inside a budget.

let sheets = 0, calls = 0
function context(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_, name) => {
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      if (name === 'createImageData' || name === 'getImageData') return (...a: number[]) => ({ data: new Uint8ClampedArray((name === 'getImageData' ? a[2] * a[3] : a[0] * a[1]) * 4) })
      return (...args: unknown[]) => { calls += 1; for (const arg of args) if (typeof arg === 'number' && !Number.isFinite(arg)) throw new Error(`${String(name)}(${args.join()})`) }
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}
const make = () => { sheets += 1; return { canvas: {} as CanvasImageSource, g: context() } }
const viewOf = (tier = 0) => { const view = new View(3, make); view.setTier(TIERS[tier]); return view }
const tap = (play: Play, x: number, y: number) => { play.down(1, { x, y }); play.lift(1, { x, y }) }

describe('a frame', () => {
  it('draws a whole day and night with everyone in everything, and makes no canvas once strung', () => {
    const play = new Play(fresh(null), 2), view = viewOf(), surface = context(), ladder = new IdleLadder(0)
    let most = 0
    const run = (seconds: number) => {
      for (let i = 0; i < seconds * 30; i++) {
        play.step(1 / 30)
        view.hear(play.take(), play)
        view.step(1 / 30, play)
        calls = 0
        view.draw(surface, 1180, 820, 2, play, ladder.update(play.time))
        most = Math.max(most, calls)
      }
    }
    run(1)
    const made = sheets
    most = 0
    for (const thing of ['jam', 'pillow', 'balloon'] as const) { tap(play, thingHome(thing).x, thingHome(thing).y); run(2) }
    run(6)
    tap(play, SPOT.grandpa.x, 380)
    run(9)
    for (let i = 0; i < 3; i++) for (let n = 0; n < 6; n++) { tap(play, pictureAt(i).x + 80 + (n % 2) * 200, 720); run(0.4) }
    tap(play, LAMP.x, LAMP.y)
    run(11)
    tap(play, COCK.x, COCK.y)
    run(3)
    expect(play.save.phase).toBe('day')
    expect(sheets).toBe(made)
    expect(most).toBeLessThan(5200)
  })
  it('draws everyone in every coat, up and in underpants, by day, awake and asleep', () => {
    for (const coat of ['mud', 'jam', 'feathers'] as const) for (const finished of [false, true]) {
      const base = morning()
      for (const who of CAST) base[who] = { coat, pants: true, up: true }
      const day = [{ who: 'pig', what: 'pants' }, { who: 'pig', what: 'pants' }, { who: 'pig', what: 'pants' }] as never
      const view = viewOf(3)
      const play = new Play({ ...fresh(null), base, phase: 'told', day, told: day, first: day, finished }, 1)
      view.step(0.1, play)
      expect(() => view.draw(context(), 900, 700, 1, play, null)).not.toThrow()
    }
  })
  it('draws nothing on a surface with no size, and the bare yard before there is a day', () => {
    const view = viewOf()
    view.draw(context(), 0, 0, 2, null, null)
    expect(view.drawn).toBe(0)
    view.draw(context(), 1180, 820, 2, null, null)
    expect(view.drawn).toBeGreaterThan(0)
  })
})

describe('the loom', () => {
  it('gives every dye back as itself', () => {
    Object.values(DYES).forEach((family, f) => family.forEach((hex, shade) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      const at = dyed(r, g, b)
      if (shade > 0) expect([hex, at.family]).toEqual([hex, f])
      expect(Math.abs(at.tone / 4 - shade)).toBeLessThan(1.1)
    }))
  })
  it('covers any surface, with the stage on a bead', () => {
    const loom = new Loom(make)
    for (const [w, h, scale, x, y] of [[2360, 1640, 2, 0, 0], [768, 1024, 0.65, 0, 245], [1600, 700, 0.85, 298, 0]]) {
      loom.string(w, h, scale, x, y, true)
      expect(loom.cols * CELL.x * scale).toBeGreaterThanOrEqual(w)
      expect(loom.rows * CELL.y * scale).toBeGreaterThanOrEqual(h)
    }
  })
})
