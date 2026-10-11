import { describe, expect, it } from 'vitest'
import { CLOTH_COL } from './board'
import { HOPS, RIGHT, playUntil, visitAt } from './careful'
import { LADDER } from './config'
import { stampStill, type Surface } from './frame'
import { SLIDE } from './layout'
import { hop, startShowing } from './play'
import { below, makeRng } from './rng'
import { boardOf, type Saved } from './save'
import { Scene } from './scene'
import { sceneryOf } from './scenery'
import { picnic, showing, slide, type Theatre } from './scenes'
import { BoardView } from './view'

// The frame budget, counted and not timed, so it holds on a busy runner. A frame costs two things: the stamp of
// the still picture, which is the one full-surface composite, and the figures painted over it. Both are counted
// here, in the moments that cost most: a full board in the middle of a hop, the duck's showing, the picnic, the
// lifted leaf and the slide.

type Counts = { stamps: number; stamped: number; filled: number; paths: number; forbidden: string[] }
const FORBIDDEN = new Set(['getImageData', 'putImageData', 'createPattern', 'drawImage'])
/** A 2D context that only counts what is asked of it. `stamping` lets `drawImage` through, for the stamp itself. */
function recorder(counts: Counts, stamping: boolean): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} }
  const target: Record<string, unknown> = {}
  return new Proxy(target, {
    get(_t, name: string) {
      if (name in target) return target[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      return (...args: number[]) => {
        if (name === 'drawImage' && stamping) {
          counts.stamps++
          counts.stamped += args[7] * args[8]
        } else if (FORBIDDEN.has(name)) counts.forbidden.push(name)
        // The first rectangle filled is the table the leaf has left.
        if (name === 'fillRect' && stamping && counts.filled === 0) counts.filled = args[2] * args[3]
        if (name === 'fill' || name === 'stroke' || name === 'fillRect' || name === 'strokeRect') counts.paths++
      }
    },
    set(_t, name: string, value) {
      // A blur or a filter is a pass over the pixels: none is in the budget.
      if ((name === 'filter' && value !== 'none') || (name === 'shadowBlur' && value !== 0)) counts.forbidden.push(name)
      target[name] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}
const fresh = (): Counts => ({ stamps: 0, stamped: 0, filled: 0, paths: 0, forbidden: [] })

// An 11-inch tablet lying down, at pixel ratio 2: the stage fits its width.
const ON: Surface = { w: 2360, h: 1640, k: 2, x: 0, y: 0 }
const STILL = {} as CanvasImageSource

describe('the still picture is the one full-surface composite of a frame', () => {
  it('is one stamp of the whole surface at rest', () => {
    const counts = fresh()
    expect(stampStill(recorder(counts, true), STILL, ON, 0, 0, '#000')).toBe(1)
    expect(counts.stamps).toBe(1)
    expect(counts.stamped).toBe(ON.w * ON.h)
  })

  it('is one stamp of the part in view while the board slides', () => {
    for (const slid of [0, 1, SLIDE / 3, SLIDE - 0.4, SLIDE]) {
      const counts = fresh()
      expect(stampStill(recorder(counts, true), STILL, ON, 0, slid, '#000')).toBe(1)
      expect(counts.stamped).toBe(ON.w * ON.h)
    }
  })

  it('is four bands that cover the surface once, less the table the leaf has left, while the leaf is lifted', () => {
    for (const leaf of [0.01, 0.3, 0.77, 1]) {
      const counts = fresh()
      expect(stampStill(recorder(counts, true), STILL, ON, leaf, 0, '#000')).toBe(4)
      expect(counts.stamps).toBe(4)
      expect(counts.stamped).toBeLessThanOrEqual(ON.w * ON.h)
      // The bands and the strip of table between them are the whole surface, to the pixel.
      expect(counts.stamped + counts.filled).toBe(ON.w * ON.h)
    }
  })
})

/**
 * The most figures a frame may paint, and the most paths those figures may fill or stroke. Counted when this was
 * written: 39 figures and 451 paths at most, over one stamp of the still picture (four bands while the leaf is
 * lifted). The figures and the stamps together are what the grown-up's overlay shows as draw calls.
 */
const MOST_FIGURES = 60
const MOST_PATHS = 700

describe('the figures painted over it', () => {
  const worst = { figures: 0, paths: 0 }
  const frame = (view: BoardView, time: number, label: string) => {
    const counts = fresh()
    view.draw(recorder(counts, false), time, 1 / 60, { glow: 1, demo: 0.4, demoIndex: 0 }, true)
    expect(counts.forbidden, label).toEqual([])
    expect(view.figures, label).toBeLessThanOrEqual(MOST_FIGURES)
    expect(counts.paths, label).toBeLessThanOrEqual(MOST_PATHS)
    worst.figures = Math.max(worst.figures, view.figures)
    worst.paths = Math.max(worst.paths, counts.paths)
  }
  const viewOf = (saved: Saved) => {
    const view = new BoardView()
    view.reset(boardOf(saved), sceneryOf(saved), saved.finished)
    return view
  }
  const theatre = (view: BoardView, clock: { now: number }): Theatre => ({ view, now: () => clock.now, sound: () => {}, slideOver: () => {} })
  /** Draws a scene's frames from its start to its end. */
  const through = (view: BoardView, beats: ReturnType<typeof picnic>, clock: { now: number }, label: string) => {
    const scene = new Scene(beats)
    scene.start(clock.now, () => {})
    for (let n = 0; scene.running && n < 600; n++) {
      clock.now += 1 / 20
      scene.update(clock.now)
      frame(view, clock.now, label)
    }
  }

  it('stay within the budget on every position, at rest and through every hop of a walk', () => {
    for (const position of LADDER) {
      const rng = makeRng(21)
      let saved = visitAt(position, 2)
      const view = viewOf(saved)
      let time = 5
      frame(view, time, `${position} at rest`)
      for (let n = 0; n < 60; n++) {
        const turn = hop(saved, below(rng, 2) === 0 ? RIGHT : HOPS[below(rng, HOPS.length)])
        if (turn.slide) break
        saved = turn.saved
        view.apply(turn.board, turn.events, time)
        for (const after of [0.02, 0.15, 0.3, 0.6]) frame(view, time + after, `${position}, hop ${n}`)
        time += 0.7
      }
    }
  })

  it('stay within it through the duck\'s showing, the picnic, the tip and the slide', () => {
    for (const position of ['cars', 'lorry', 'logs', 'turtle', 'bell']) {
      const saved = visitAt(position, 1, true)
      const started = startShowing(saved)!
      const view = viewOf(saved), clock = { now: 3 }
      through(view, showing(started.show, boardOf(saved).lanes[started.show.col], theatre(view, clock)), clock, `${position}: showing`)
    }
    const last = playUntil(visitAt('logs', 1), (turn) => turn.picnic)!
    const eating = viewOf(last.before), clock = { now: 3 }
    eating.apply(last.turn.board, last.turn.events, clock.now)
    through(eating, picnic(['wet', 'tracked', 'dry', 'wet'], theatre(eating, clock)), clock, 'picnic')

    const reached = playUntil(visitAt('logs', 1), (turn) => turn.saved.family[0].c === CLOTH_COL)!
    const turn = hop(reached.turn.saved, RIGHT)
    const tipping = viewOf(reached.turn.saved)
    clock.now = 3
    tipping.apply(turn.board, turn.events, clock.now)
    through(tipping, slide(turn.slide!.tipped, turn.slide!.board, sceneryOf(turn.saved), theatre(tipping, clock)), clock, 'tip and slide')
  })

  it('have been counted at their most', () => {
    // The heavy moments happened: a board with nearly everything on it was drawn.
    expect(worst.figures).toBeGreaterThan(30)
    expect(worst.paths).toBeGreaterThan(300)
  })
})
