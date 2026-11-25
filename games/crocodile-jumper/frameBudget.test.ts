import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { ROUND, PARTY, type Who } from './cast'
import { MAGPIE, NECK, STRIP, trayPoint } from './layout'
import { Play } from './play'
import { KINDS, LENGTH, type Piece } from './row'
import { freshSave } from './save'
import { STAGE } from './stage'
import { useCanvases } from './foil'
import { ShopView } from './view'

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

function viewOf(): ShopView {
  const view = new ShopView(countingCanvas(SURFACE.width * SURFACE.ratio, SURFACE.height * SURFACE.ratio))
  view.resize(SURFACE.width, SURFACE.height, SURFACE.ratio)
  return view
}
const GUIDED: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }


function open(on: readonly Who[], row: Piece[], wait: Who[]): Play {
  return new Play({ ...freshSave(null), on: [...on], wait, row, open: { sausage: true, shoe: true, duck: true }, shown: ['touching', 'long', 'duck', 'shoe', 'mix', 'two'], out: { who: ['croc'], worn: [{ k: 'sausage', x: 0 }] } }).settled()
}

/** The heaviest things that can be on at once. */
function visit(play: Play, each: () => void): void {
  let clock = 0
  const run = (seconds: number): void => { for (let t = 0; t < seconds; t += FRAME) { clock += 16.7; play.advance(FRAME, clock); each() } }
  const tap = (x: number, y: number): void => { play.down(1, { x, y }, clock); run(0.04); play.up(1, { x, y }, clock); run(0.1) }
  each()
  tap(100, 150)
  for (const k of KINDS) { tap(trayPoint(k).x, trayPoint(k).y); run(0.2) }
  const p = play.save.row[0]
  if (p) { play.down(2, { x: NECK + p.x + 20, y: STRIP.mid }, clock); for (let i = 0; i < 20; i++) { play.move(2, { x: NECK + p.x + 20 + i * 4, y: STRIP.mid }); run(FRAME) } play.up(2, { x: NECK + p.x + 60, y: STRIP.mid }, clock); run(0.5) }
  tap(NECK + 100, 320)
  play.down(3, trayPoint('duck'), clock); play.move(3, { x: 500, y: 600 }); play.move(3, { x: 120, y: 340 }); run(0.2); play.up(3, { x: 120, y: 340 }, clock); run(1)
  tap(100, 150)
  tap(MAGPIE.x + 100, 700)
  run(3.5)
  tap(1000, 120)
  run(7)
  tap(100, 150)
}
const FULL: Piece[] = Array.from({ length: 14 }, (_, i) => ({ k: 'duck', x: Math.min(i * LENGTH.duck, 828) - (i > 11 ? (i - 11) * 40 : 0) }))

describe('frame budget', () => {
  it('counts every draw, stays within the budget, and composites the room once', () => {
    let most = 0, at = '', frames = 0
    for (const on of [...Object.values(PARTY), ...ROUND]) for (const row of [[], FULL.slice(0, 9), FULL]) for (const wait of [['seal'], ['dog', 'snail']] as Who[][]) {
      const view = viewOf(), play = open(on, row.map((p) => ({ ...p })), wait)
      view.warm(play)
      view.draw(play, null, TIERS[0])
      const bake = (): void => { view.draw(play, play.now === 0 ? GUIDED : null, TIERS[0]) }
      visit(play, () => {
        bake()
        counter.draws = counter.full = counter.effects = 0
        bake()
        const said = view.tally
        if (counter.draws !== said) throw new Error(on.join() + ': the view says ' + said + ' and drew ' + counter.draws)
        if (counter.full !== 1) throw new Error('not one composite')
        if (counter.effects) throw new Error('an effect')
        if (said > most) { most = said; at = on.join() + ' ' + row.length + ' ' + wait.join() + ' at ' + play.now.toFixed(2) + ' ' + play.scene?.is }
        frames++
        play.heard = []
      })
    }
    console.info('crocodile-jumper frame budget: most draws ' + most + ' (' + at + ') over ' + frames + ' frames')
    expect(frames).toBeGreaterThan(5000)
    expect(most, at).toBeLessThanOrEqual(BUDGET)
  }, 60000)

  it('with nothing loaded it draws the room alone', () => {
    const view = viewOf()
    view.draw(null, null, TIERS[0])
    counter.draws = 0
    view.draw(null, null, TIERS[0])
    expect(counter.draws).toBe(1)
  })
})
