import { describe, expect, it } from 'vitest'
import { SUPPLY_LANES, hourX, rowEnd, type Point } from './board'
import { deserializeCamp } from './camp'
import { Game, GLIDE } from './game'
import { Look } from './look'
import { STATE_VERSION } from './state'
import type { Supply } from './world'

// The frame budget, counted and never timed, so that it holds on a busy
// machine: the cost of a canvas frame is set by how much it draws, and a
// count is the same everywhere. The real game is played through its heaviest
// moments and every frame is painted by the real view onto a surface that
// only counts.
//
// Budgets for one frame: at most 2 stamps of a whole layer (the cached map,
// and the night film when it is night), no new layer made outside a change
// of size, at most 140 figures as the view counts them, and at most 2,600
// fills and strokes. The lead measures the frame rate itself on a real
// graphics card.

const FIGURES = 140
const STROKES = 2600

type Count = { fills: number; stamps: number; text: number; layers: number }
function surface(count: Count): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {}
  return new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        if (name === 'fill' || name === 'stroke' || name === 'fillRect' || name === 'strokeRect' || name === 'clearRect') count.fills++
        if (name === 'fillText' || name === 'strokeText') count.text++
        if (name === 'drawImage') count.stamps++
        if (name === 'measureText') return { width: 8 * String(args[0]).length }
        if (name === 'createImageData') { const [w, h] = args as [number, number]; return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } }
        if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return { addColorStop: () => {} }
        return undefined
      }
    },
    set(target, name, value) { if (typeof name === 'string') target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

const tap = (game: Game, p: Point) => { game.press(p); game.lift() }
const lay = (game: Game, supply: Supply, count: number) => tap(game, { x: rowEnd(game.board, supply, count).x, y: game.board.lanes[SUPPLY_LANES.indexOf(supply)] })

/** Plays a game and paints every frame; returns the heaviest of each count, and how many layers were made after the first frame. */
function play(game: Game, script: (run: (seconds: number) => void) => void) {
  const layer: Count = { fills: 0, stamps: 0, text: 0, layers: 0 }, frame: Count = { fills: 0, stamps: 0, text: 0, layers: 0 }
  const look = new Look(() => { layer.layers++; return { width: 0, height: 0, getContext: () => surface(layer) } as unknown as HTMLCanvasElement })
  const ctx = surface(frame), worst = { figures: 0, fills: 0, stamps: 0, text: 0 }
  let frames = 0, layersAfterFirst = 0, sawNight = false, sawShow = false
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      game.step(1 / 60, { glow: 1, demo: (frames % 180) / 180, demoIndex: 0 }); game.takeSounds(); game.takeChanged()
      frame.fills = 0; frame.stamps = 0; frame.text = 0
      const made = layer.layers
      const figures = look.paint(ctx, 1180, 820, 2, game.board, game.frame, {})
      if (frames > 0) layersAfterFirst += layer.layers - made
      worst.figures = Math.max(worst.figures, figures); worst.fills = Math.max(worst.fills, frame.fills); worst.stamps = Math.max(worst.stamps, frame.stamps); worst.text = Math.max(worst.text, frame.text)
      if (game.frame.night.film > 0.9) sawNight = true
      if (game.frame.effects.length > 2) sawShow = true
      frames++
    }
  }
  script(run)
  return { worst, frames, layersAfterFirst, sawNight, sawShow }
}

describe('the frame budget, counted', () => {
  it('holds through the heaviest night: every rod full, both lanterns, a kettle round at every hour, strips stamped, and shows going off', { timeout: 40000 }, () => {
    const game = new Game(1180, 820, deserializeCamp({ v: STATE_VERSION, position: 'summit', variant: 0, shown: ['out-fire', 'out-lantern', 'out-kettle'], strips: { fire: Array(8).fill({ card: 0, side: 'single' }), lantern: [{ card: 0, side: 'single' }, { card: 0, side: 'doubled' }], kettle: Array(8).fill({ card: 0, side: 'single' }) } }), 3)
    const seen = play(game, (run) => {
      lay(game, 'logs', 14); lay(game, 'oil', 5); lay(game, 'water', 7); run(1)
      tap(game, { x: hourX(game.board, 0), y: game.board.ruler.y - 12 * game.board.u })
      run(2 / GLIDE)
      // Three wrong uses in the middle of the night, one after another.
      for (const to of [game.board.fire, game.board.pins[0], { x: game.frame.places.reader.x, y: game.frame.places.reader.y }]) {
        const from = { x: game.board.pile, y: game.board.lanes[2] - 12 }
        game.press(from); game.move({ x: from.x, y: game.board.walkway - 30 }); game.move(to); game.lift(); run(0.3)
      }
      run(6 / GLIDE + 8)
    })
    expect(seen.frames).toBeGreaterThan(600)
    expect(seen.sawNight, 'the night was reached').toBe(true)
    expect(seen.sawShow, 'the shows were playing').toBe(true)
    expect(seen.worst.stamps, 'stamps of a whole layer in one frame').toBeLessThanOrEqual(2)
    expect(seen.layersAfterFirst, 'layers made after the first frame, with the size unchanged').toBeLessThanOrEqual(1)
    expect(seen.worst.figures, 'figures in one frame').toBeLessThanOrEqual(FIGURES)
    expect(seen.worst.fills, 'fills and strokes in one frame').toBeLessThanOrEqual(STROKES)
  })

  it('holds with sixty logs out and a heap past the rod, at dusk', { timeout: 20000 }, () => {
    const game = new Game(1180, 820, deserializeCamp({ v: STATE_VERSION, position: 'ford', variant: 2 }), 3)
    const seen = play(game, (run) => {
      game.press({ x: game.board.pile, y: game.board.lanes[0] - 12 }); game.move({ x: game.board.rodX + game.board.rodLen + 60, y: game.board.lanes[0] - 19 }); run(2); game.lift(); run(2)
    })
    expect(game.camp.logs).toBe(60)
    expect(seen.worst.stamps).toBeLessThanOrEqual(1)
    expect(seen.worst.figures).toBeLessThanOrEqual(FIGURES)
    expect(seen.worst.fills).toBeLessThanOrEqual(STROKES)
  })

  it('draws no more in the last frame of a long night than in the first: nothing piles up', { timeout: 40000 }, () => {
    const game = new Game(1180, 820, deserializeCamp({ v: STATE_VERSION, position: 'ridge', variant: 2, shown: ['out-fire', 'out-lantern', 'out-kettle'] }), 3)
    lay(game, 'logs', 30); lay(game, 'oil', 5); lay(game, 'water', 4)
    const early = play(game, (run) => { run(1); tap(game, { x: hourX(game.board, 0), y: game.board.ruler.y - 12 * game.board.u }); run(3) })
    const late = play(game, (run) => { run(1); for (let i = 0; i < 3; i++) { tap(game, { x: rowEnd(game.board, 'logs', 30 + i).x, y: game.board.lanes[0] }); run(1); tap(game, { x: hourX(game.board, 0), y: game.board.ruler.y - 12 * game.board.u }); run(10 / GLIDE + 9) } })
    expect(late.worst.figures).toBeLessThanOrEqual(early.worst.figures + 60)
    expect(late.worst.fills).toBeLessThanOrEqual(STROKES)
  })
})
