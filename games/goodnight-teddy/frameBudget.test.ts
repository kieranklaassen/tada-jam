import { describe, expect, it, vi } from 'vitest'
import { DRAW_BUDGET, TIERS } from './config'
import { walkEverything } from './finger'
import { freshFur } from './fur'
import { Game } from './game'
import { freshSave } from './save'
import { DEMO_SECONDS, type Guidance } from './guidance'
import { RoomView } from './view'

// The frame budget, counted and not timed: the real view draws every frame of the walk through every state
// (finger.ts) onto a surface that only counts what is put on it, and no frame may go over the budget. The count
// is of the calls that reach the surface: sprites stamped (drawImage) and live fills and strokes.

type Count = { stamps: number; pen: number; full: number }

/** A 2D context that accepts everything and counts what would reach the surface. */
function fakeContext(count: Count | null, size: { width: number; height: number }): CanvasRenderingContext2D {
  const anything: unknown = new Proxy(function () {}, { get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : anything), set: () => true, apply: () => anything })
  let scale = 1
  return new Proxy({}, {
    get(_target, key) {
      if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      if (key === 'setTransform') return (a: number) => { scale = a }
      if (key === 'drawImage') return (image: { width: number; height: number }, _x: number, _y: number, w: number, h: number) => {
        if (!count) return
        count.stamps += 1
        // A stamp that covers the whole surface: the frame may have one, the room itself.
        if (w * scale >= size.width && h * scale >= size.height) count.full += 1
        void image
      }
      if (key === 'fill' || key === 'stroke' || key === 'fillRect') return () => { if (count) count.pen += 1 }
      return anything
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

function fakeCanvas(count: Count | null): HTMLCanvasElement {
  const canvas = { width: 0, height: 0, getContext: () => context }
  const context = fakeContext(count, canvas)
  return canvas as unknown as HTMLCanvasElement
}

describe('the frame budget', () => {
  it('never puts more on the surface than the budget, in any state a child can reach, and stamps the whole surface once', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas(null) })
    const count: Count = { stamps: 0, pen: 0, full: 0 }
    const surface = fakeCanvas(count)
    surface.width = 2360; surface.height = 1640
    const view = new RoomView(surface)
    view.bits = TIERS[0].bits
    view.resize(1180, 820, 2)
    // The idle ladder at its most: the glow full and the hand in the middle of its move.
    const guidance: Guidance = { glow: 1, demo: 0.5 } as Guidance
    let frames = 0, most = 0, worst = '', mostBits = 0
    walkEverything((game: Game) => {
      count.stamps = 0; count.pen = 0; count.full = 0
      view.draw(game, game.busy ? null : guidance, 1 / 60)
      const total = count.stamps + count.pen
      frames += 1
      // The number the grown-up overlay shows is the number that reached the surface.
      if (view.drawn.stamps !== count.stamps || view.drawn.pen !== count.pen) throw new Error(`the view counted ${view.drawn.stamps} + ${view.drawn.pen} and drew ${count.stamps} + ${count.pen}`)
      if (count.full !== 1) throw new Error(`${count.full} full-surface stamps in a frame`)
      if (total > most) { most = total; worst = `${game.rec.phase} ${game.sceneId ?? ''} at ${game.time.toFixed(2)} with ${game.bits.length} bits` }
      mostBits = Math.max(mostBits, game.bits.length)
    })
    vi.unstubAllGlobals()
    expect(frames).toBeGreaterThan(20000)
    expect(mostBits).toBeGreaterThan(20)
    expect(most, worst).toBeLessThanOrEqual(DRAW_BUDGET)
    // A frame at rest is far below it.
    expect(most).toBeGreaterThan(40)
    expect(DEMO_SECONDS).toBeGreaterThan(0)
  }, 120_000)

  it('keeps the budget the jam asks for', () => {
    expect(DRAW_BUDGET).toBeLessThanOrEqual(80)
    for (const tier of TIERS) expect(tier.bits).toBeLessThan(DRAW_BUDGET)
  })

  it('lifts the blanket over his foot when it thumps: the bump is drawn, not only heard', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas(null) })
    const count: Count = { stamps: 0, pen: 0, full: 0 }
    const surface = fakeCanvas(count)
    surface.width = 2360; surface.height = 1640
    const view = new RoomView(surface)
    view.resize(1180, 820, 2)
    const stampsWith = (blanket: 'teddy' | 'bed', stamp: number): number => {
      const game = new Game({ ...freshSave(null), fur: freshFur([]), mudPlaces: [], blanket }, 1)
      game.step(1 / 60)
      game.teddy.stamp = stamp
      count.stamps = 0
      view.draw(game, null, 1 / 60)
      return count.stamps
    }
    // Bare, the thump redraws his foot apart from his body: one stamp more. Under the blanket there are two more again: the shade and the bump.
    expect(stampsWith('bed', 1) - stampsWith('bed', 0)).toBe(1)
    expect(stampsWith('teddy', 1) - stampsWith('teddy', 0)).toBe(3)
    vi.unstubAllGlobals()
  })

  it('opens a room with the halo where the saved lamp leaves it: loaded is as parked', () => {
    vi.stubGlobal('document', { createElement: () => fakeCanvas(null) })
    const make = (): RoomView => { const surface = fakeCanvas(null); surface.width = 2360; surface.height = 1640; const view = new RoomView(surface); view.resize(1180, 820, 2); return view }
    for (const lamp of ['down', 'up'] as const) {
      const room = (): Game => new Game({ ...freshSave(null), lamp }, 1)
      // Parked: the view has been drawing this room for a long while.
      const parked = make(), kept = room()
      for (let n = 0; n < 600; n++) { kept.step(1 / 60); parked.draw(kept, null, 1 / 60) }
      // Loaded: a new view draws the room it is handed, once.
      const loaded = make()
      loaded.draw(room(), null, 1 / 60)
      expect(loaded.haloWidth).toBeCloseTo(parked.haloWidth, 2)
    }
  })
})
