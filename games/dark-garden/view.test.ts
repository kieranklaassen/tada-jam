import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CARRIERS } from './cast'
import { heart, PLACES } from './garden'
import { IdleLadder } from './guidance'
import { handAt, want } from './guide'
import { Play } from './play'
import { fresh } from './save'
import { View } from './view'

// What a frame costs, counted and not timed, and that no number goes wrong.

let canvases = 0
function pen(): CanvasRenderingContext2D {
  let depth = 0
  return new Proxy({} as Record<string, unknown>, {
    get: (_, name) => {
      if (name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      if (name === 'createPattern') return () => ({})
      if (name === 'globalAlpha') return 1
      return (...args: unknown[]) => {
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) throw new Error(`${String(name)} was given a number that is not one`)
        if (name === 'save') depth++
        if (name === 'restore' && --depth < 0) throw new Error('restored more than saved')
      }
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}
class FakePath { constructor(d?: unknown) { if (typeof d === 'string' && /NaN|undefined|Infinity/.test(d)) throw new Error(`a shape went wrong: ${d}`) } addPath() {} moveTo() {} lineTo() {} closePath() {} ellipse() {} }

beforeEach(() => {
  canvases = 0
  vi.stubGlobal('Path2D', FakePath)
  vi.stubGlobal('document', { createElement: () => { canvases++; return { width: 100, height: 100, getContext: pen } } })
})
afterEach(() => vi.unstubAllGlobals())
const STEP = 1 / 60

describe('a frame', () => {
  it('stays in its budget and paints nothing anew, through a whole garden, every sleeper, the tune and the puff', () => {
    for (let turn = 0; turn < 4; turn++) {
      const view = new View(pen()), play = new Play({ ...fresh(), shown: true, queue: [...CARRIERS.slice(turn), ...CARRIERS.slice(0, turn)] })
      let most = 0
      const run = (seconds: number) => { for (let i = 0; i < seconds * 30; i++) { play.step(STEP * 2); most = Math.max(most, view.draw(play, null, STEP * 2, 1180, 820, 2)) } }
      run(0.2)
      for (const place of PLACES) { const p = heart(place); play.act({ type: 'press', at: p }); play.act({ type: 'tap', at: p }); run(5.5) }
      run(10)
      const made = canvases
      play.act({ type: 'press', at: { x: 152, y: 650 } }); play.act({ type: 'tap', at: { x: 152, y: 650 } })
      run(6)
      expect(play.shown.every((one) => one.who === null)).toBe(true)
      expect(canvases).toBe(made)
      expect(most).toBeLessThan(560)
    }
  }, 30000)
  it('draws nothing on a surface with no size, and the window before the slot is read', () => {
    const view = new View(pen())
    expect(view.draw(null, null, 0, 0, 0, 2)).toBe(0)
    expect(view.draw(null, null, 0, 800, 600, 2)).toBeGreaterThan(2)
  })
})

describe('the guidance', () => {
  it('asks for one thing at a time: the light, then a dark place, then the breath', () => {
    const play = new Play({ ...fresh(), shown: true })
    play.step(STEP)
    expect(want(play).what).toBe('light')
    const lit = new Play({ ...fresh(), shown: true, lit: true, u: 1200 })
    const w = want(lit)
    expect(w.what).toBe('place')
    expect(lit.save.set[w.place]).toBeNull()
    const end = handAt(lit, w, 1)
    expect(Math.hypot(end.x - w.to.x, end.y - w.to.y)).toBeLessThan(1)
    const full = new Play({ ...fresh(), shown: true, set: fresh().set.map(() => 'hare') })
    full.step(STEP)
    expect(want(full).what).toBe('blow')
    const view = new View(pen()), ladder = new IdleLadder(0)
    for (const one of [play, lit, full]) for (let t = 0; t < 7; t += 0.1) view.draw(one, ladder.update(t), STEP, 1180, 820, 1)
  })
})
