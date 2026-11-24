import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { CORD, MIDDLE, OSTRICH, SACKS, placeAt, shelfOf } from './layout'
import { useCanvases } from './marker'
import { BODIES, PARTS, PLACES, bare, type Body, type Monster, type Part } from './monster'
import { Play, meetingLength } from './play'
import { freshWorld } from './save'
import { STAGE, type Point } from './stage'
import { BoardView } from './view'

// The frame budget, counted and not timed, so it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// The view's own count, which the Mount reports, is held to what a counting
// canvas saw; the heaviest moments stay under the jam's budget of about 80;
// a frame has one full-surface composite and no blur, shadow or filter.

const BUDGET = 80
const FRAME = 1 / 60
const DRAWS = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect'])
const counter = { draws: 0, full: 0, effects: 0 }
const SURFACE = { width: STAGE.width, height: STAGE.height, ratio: 2 }

function countingCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = { width, height } as { width: number; height: number; getContext: () => unknown }
  const store: Record<string, unknown> = { canvas }
  const context = new Proxy(store, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'createPattern') return () => ({})
      if (name === 'createLinearGradient') return () => ({ addColorStop() {} })
      return (...args: unknown[]) => {
        if (!DRAWS.has(name)) return undefined
        counter.draws += 1
        const source = args[0] as { width?: number; height?: number } | undefined
        if (name === 'drawImage' && source?.width === SURFACE.width * SURFACE.ratio && source.height === SURFACE.height * SURFACE.ratio) counter.full += 1
        return undefined
      }
    },
    set(target, name: string, value) {
      if ((name === 'shadowBlur' && value !== 0) || (name === 'filter' && value !== 'none') || (name === 'globalCompositeOperation' && value !== 'source-over')) counter.effects += 1
      target[name] = value
      return true
    },
  })
  canvas.getContext = () => context
  return canvas as unknown as HTMLCanvasElement
}
beforeAll(() => useCanvases(countingCanvas))
afterAll(() => useCanvases(null))

function viewOf(): BoardView {
  const view = new BoardView(countingCanvas(SURFACE.width * SURFACE.ratio, SURFACE.height * SURFACE.ratio))
  view.resize(SURFACE.width, SURFACE.height, SURFACE.ratio)
  view.warm()
  return view
}
const GUIDED: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }
const full = (body: Body, part: Part, large: boolean): Monster => { const m = bare(body); for (const place of PLACES) m.on[place] = { part, large }; return m }

/** One visit of everything that can stand on the board at once. */
function visit(a: Body, b: Body, each: (play: Play) => void): void {
  const w = freshWorld(6, 3)
  w.shown = true
  w.a = full(a, 'eye', true); w.b = full(b, 'eye', false)
  w.worn = { ostrich: 'eye', mole: 'hand' }
  for (let i = 0; i < 3; i++) w.pairs.push([full('round', PARTS[i], true), full('tall', PARTS[i + 3], false)])
  const play = new Play(w)
  const run = (seconds: number): void => { for (let t = 0; t < seconds; t += FRAME) { play.step(FRAME); each(play) } }
  let id = 0
  const drag = (from: Point, to: Point): number => { const i = ++id; play.down(i, from); play.move(i, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); run(0.08); play.move(i, to); run(0.08); return i }
  each(play)
  for (let i = 0; i < 6; i++) play.up(drag({ x: 1000, y: 120 + i * 20 }, { x: 900, y: 100 + i * 10 }))
  play.down(90, { x: 300, y: 300 }); play.down(91, OSTRICH); run(0.1); play.up(91); run(1.4)
  const hands = [drag(shelfOf('eye'), { x: 500, y: 640 }), drag(shelfOf('nose'), { x: 900, y: 640 })]
  for (const place of PLACES) { play.down(92, placeAt('b', b, place)); run(0.05); play.up(92) }
  run(1)
  for (const one of hands) play.up(one)
  play.up(90); run(1)
  play.up(drag(CORD, { x: CORD.x, y: CORD.y + 70 }))
  const list = play.meeting!
  run(meetingLength(list) + 0.3)
  for (const place of PLACES) { play.down(93, placeAt('a', a, place)); run(0.03); play.up(93) }
  const two = [drag(shelfOf('eye'), { x: 600, y: 630 }), drag(shelfOf('ear'), { x: 900, y: 630 })]
  play.up(drag(SACKS[1], MIDDLE.a)); run(4.6)
  for (const one of two) play.up(one)
  run(0.5)
}

describe('frame budget', () => {
  it('counts every draw, stays within the budget for every pair of bodies, and composites the page once', () => {
    let most = 0, at = '', frames = 0
    for (const a of BODIES) for (const b of BODIES) {
      const view = viewOf()
      visit(a, b, (play) => {
        counter.draws = counter.full = counter.effects = 0
        view.draw(play, play.now === 0 ? GUIDED : null, TIERS[0])
        const said = view.tally.stamps + view.tally.pen
        if (counter.full !== 1) throw new Error('not one composite')
        if (counter.effects) throw new Error('an effect')
        // A pair that has just met is painted once, into its own small picture.
        if (counter.draws !== said && play.since('met') > 0.1 && play.now > 0) throw new Error(`${a}/${b}: the view says ${said} and drew ${counter.draws}`)
        if (said > most) { most = said; at = `${a} and ${b} at ${play.now.toFixed(2)}` }
        frames++
        play.heard = []
      })
    }
    console.info(`monster-telephone frame budget: most draws ${most} (${at}) over ${frames} frames`)
    expect(frames).toBeGreaterThan(5000)
    expect(most, at).toBeLessThanOrEqual(BUDGET)
  }, 30000)

  it('a lower tier draws no more than the top one', () => {
    const counts = TIERS.map((tier) => { const view = viewOf(); let most = 0; visit('tall', 'round', (play) => { view.draw(play, null, tier); most = Math.max(most, view.tally.stamps + view.tally.pen) }); return most })
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
  })

  it('with nothing loaded it draws the board and its tray alone', () => {
    const view = viewOf()
    counter.draws = 0
    view.draw(null, null, TIERS[0])
    expect(counter.draws).toBe(2)
  })
})
