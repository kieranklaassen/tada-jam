import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdleLadder } from './guidance'
import { HOOKS } from './layout'
import { Play } from './play'
import { fresh } from './save'
import { View } from './view'

// What a frame costs, counted and not timed: the canvases made, the sprites
// laid and the paths filled, with the string on every place and lit.

let canvases = 0, calls: Record<string, number> = {}

function fakeContext(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_, name) => (name === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : name === 'createPattern' ? () => ({}) : () => { calls[String(name)] = (calls[String(name)] ?? 0) + 1 }),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D
}

beforeEach(() => {
  canvases = 0
  calls = {}
  vi.stubGlobal('document', { createElement: () => { canvases += 1; return { width: 0, height: 0, getContext: fakeContext } } })
})
afterEach(() => vi.unstubAllGlobals())

const STEP = 1 / 60
const full = () => new Play({ ...fresh(), shown: true, hooks: HOOKS.map((hook) => hook.id), lit: false, crank: true })

describe('a frame', () => {
  it('paints nothing anew once all has been seen, and stays inside its budget with everything lit', () => {
    const view = new View(fakeContext()), play = full()
    const frame = () => { play.step(STEP); return view.draw(play, null, STEP, 1180, 820, 2, 2) }
    const run = (seconds: number) => { let most = 0; for (let i = 0; i < seconds * 60; i++) most = Math.max(most, frame()); return most }
    run(2); play.flip(true)
    const warm = canvases
    const most = run(14)
    const made = canvases
    calls = {}
    expect(run(2)).toBeLessThan(70)
    expect(most).toBeLessThan(120)
    expect(canvases).toBe(made)
    // All of it was painted before the switch was pressed.
    expect(made).toBe(warm)
    expect((calls.fill ?? 0) / 120).toBeLessThan(140)
    expect(play.bits.length).toBeLessThanOrEqual(90)
  })
  it('keeps the idle guidance cheap', () => {
    const view = new View(fakeContext()), play = new Play({ ...fresh(), shown: true }), ladder = new IdleLadder(0)
    let most = 0
    for (let i = 0; i < 600; i++) { play.step(STEP); most = Math.max(most, view.draw(play, ladder.update(i * STEP), STEP, 1180, 820, 2, 2)) }
    expect(most).toBeLessThan(45)
  })
  it('draws nothing on a surface with no size, and the bare night before there is a string', () => {
    const view = new View(fakeContext())
    expect(view.draw(null, null, 0, 0, 0, 2, 2)).toBe(0)
    expect(view.draw(null, null, 0, 1180, 820, 2, 2)).toBe(1)
  })
})
