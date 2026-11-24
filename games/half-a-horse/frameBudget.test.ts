import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { GROUND, HANG, pegAt } from './layout'
import { Play } from './play'
import { deserialize, freshSave } from './save'
import { STAGE } from './stage'
import { useCanvases } from './stitch'
import { YardView } from './view'

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
class NoPath { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} arc() {} ellipse() {} rect() {} roundRect() {} closePath() {} }

let had: unknown
beforeAll(() => {
  had = (globalThis as Record<string, unknown>).Path2D
  ;(globalThis as Record<string, unknown>).Path2D = NoPath
  useCanvases(countingCanvas)
})
afterAll(() => {
  ;(globalThis as Record<string, unknown>).Path2D = had
  useCanvases(null)
})

function viewOf(): YardView {
  const view = new YardView(countingCanvas(SURFACE.width * SURFACE.ratio, SURFACE.height * SURFACE.ratio))
  view.resize(SURFACE.width, SURFACE.height, SURFACE.ratio)
  view.warm()
  return view
}
const GUIDED: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }

function open(front: number, rear: number): Play {
  let s = 5
  const fresh = freshSave()
  const rest = [...Array(8).keys()].filter((end) => end !== front && end !== rear)
  return new Play(deserialize({ ...fresh, halves: [{ ...fresh.halves[0], wear: front }, { ...fresh.halves[1], wear: rear }], pegs: [...rest, null, null], food: [300, 420, 600, 745, 880].map((x, i) => ({ kind: ['apple', 'carrot', 'egg'][i % 3], x })) }), () => ((s = (s * 16807) % 2147483647) / 2147483647))
}

/** One visit of everything that can stand in the yard at once. */
function visit(play: Play, each: () => void): void {
  const run = (seconds: number): void => { for (let t = 0; t < seconds; t += FRAME) { play.step(FRAME); each() } }
  const a = { x: play.halves[0].x, y: GROUND - 190 }, b = { x: play.halves[1].x, y: GROUND - 190 }
  each()
  play.down(1, a); run(0.1); play.up(1); play.down(2, b); run(0.1); play.up(2); run(1.2)
  play.down(1, a); play.down(2, b)
  const go = (by: [number, number, number, number], seconds: number): void => { const n = seconds / FRAME; for (let i = 0; i < n; i++) { a.x += by[0] / n; a.y += by[1] / n; b.x += by[2] / n; b.y += by[3] / n; play.move(1, a); play.move(2, b); play.step(FRAME); each() } }
  go([250, -200, -100, 0], 0.6); play.up(1); play.up(2); run(0.6)
  Object.assign(a, { x: play.halves[0].x, y: GROUND - 190 }); Object.assign(b, { x: play.halves[1].x, y: GROUND - 190 })
  play.down(1, a); play.down(2, b)
  go([-340, 0, 420, 0], 0.8); run(0.5)
  for (const [id, peg] of [[3, 0]] as const) { play.down(id, { x: pegAt(peg).x, y: pegAt(peg).y + HANG }); play.move(id, { x: 600, y: 320 }); run(0.3); play.up(id); run(0.5) }
  play.up(1); play.up(2)
  for (const peg of [1, 2, 3]) { play.down(5, { x: pegAt(peg).x, y: pegAt(peg).y + HANG }); play.up(5); run(0.2) }
  play.down(6, { x: 1076, y: 500 }); run(0.1); play.up(6); run(0.5)
  play.halves[0].call = 850; run(3)
  play.down(7, { x: 60, y: 480 }); run(0.1); play.up(7); run(8)
}

describe('frame budget', () => {
  it('counts every draw, stays within the budget for every pair of ends, and composites the page once', () => {
    let most = 0, at = '', frames = 0
    for (let front = 0; front < 8; front++) for (const rear of [(front + 4) % 8, (front + 1) % 8]) {
      const view = viewOf(), play = open(front, rear)
      visit(play, () => {
        counter.draws = counter.full = counter.effects = 0
        view.draw(play, play.now === 0 ? GUIDED : null, TIERS[0])
        const said = view.tally.stamps + view.tally.pen
        if (counter.draws !== said) throw new Error(`${front}/${rear}: the view says ${said} and drew ${counter.draws}`)
        if (counter.full !== 1) throw new Error('not one composite')
        if (counter.effects) throw new Error('an effect')
        if (said > most) { most = said; at = `${front} and ${rear} at ${play.now.toFixed(2)}` }
        frames++
        play.heard = []
      })
    }
    console.info(`half-a-horse frame budget: most draws ${most} (${at}) over ${frames} frames`)
    expect(frames).toBeGreaterThan(5000)
    expect(most, at).toBeLessThanOrEqual(BUDGET)
  }, 30000)

  it('a lower tier draws no more than the top one', () => {
    const counts = TIERS.map((tier) => {
      const view = viewOf(), play = open(2, 4)
      let most = 0
      visit(play, () => { view.draw(play, null, tier); most = Math.max(most, view.tally.stamps + view.tally.pen) })
      return most
    })
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
  })

  it('with nothing loaded it draws the page alone', () => {
    const view = viewOf()
    counter.draws = 0
    view.draw(null, null, TIERS[0])
    expect(counter.draws).toBe(1)
  })
})
