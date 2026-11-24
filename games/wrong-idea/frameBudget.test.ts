import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdleLadder } from './guidance'
import { VESSELS, bodyMiddle } from './layout'
import { Play } from './play'
import { fresh } from './save'
import { View } from './view'

// What a frame costs, counted and not timed: the canvases made, the sprites
// laid and the paths filled, in the fullest house there is.

let canvases = 0, calls: Record<string, number> = {}

function fakeContext(): CanvasRenderingContext2D {
  return new Proxy({}, {
    get: (_, name) => (name === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : name === 'createPattern' ? () => ({}) : () => { calls[String(name)] = (calls[String(name)] ?? 0) + 1 }),
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
function carry(play: Play, id: string, place: 'soup' | 'bed' | 'bath') {
  const from = bodyMiddle(id, play.spotOf(id)), to = { x: VESSELS[place].x, y: VESSELS[place].rim }
  play.act([{ type: 'press', at: from }, { type: 'dragStart', from }, { type: 'dragMove', from, at: to }, { type: 'dragEnd', from, at: to }])
}

describe('a frame', () => {
  it('paints nothing anew once the house has been seen, and stays inside its budget in the fullest house', () => {
    const view = new View(fakeContext()), play = new Play(fresh(null), 3)
    const frame = () => { play.step(STEP); return view.draw(play, null, STEP, 1180, 820, 2) }
    const run = (seconds: number) => { let most = 0; for (let i = 0; i < seconds * 60; i++) most = Math.max(most, frame()); return most }
    run(1)
    carry(play, 'red-sock', 'soup')
    run(0.5)
    carry(play, 'yellow-pot', 'soup')
    const most = run(40)
    expect(play.busy).toBe(false)
    expect(play.house.butler).toBe('soup')
    const made = canvases
    calls = {}
    expect(run(1)).toBeLessThan(110)
    expect(most).toBeLessThan(130)
    expect(canvases).toBe(made)
    // A path costs more than a sprite: faces, sleeves and bubbles only.
    expect((calls.fill ?? 0) / 60).toBeLessThan(420)
  })

  it('keeps the idle guidance cheap', () => {
    const view = new View(fakeContext()), play = new Play(fresh(null), 3), ladder = new IdleLadder(0)
    let most = 0
    for (let i = 0; i < 600; i++) {
      play.step(STEP)
      most = Math.max(most, view.draw(play, ladder.update(i * STEP), STEP, 1180, 820, 2))
    }
    expect(most).toBeLessThan(110)
  })

  it('draws nothing on a surface with no size, and the bare chart before there is a house', () => {
    const view = new View(fakeContext())
    expect(view.draw(null, null, 0, 0, 0, 2)).toBe(0)
    expect(view.draw(null, null, 0, 1180, 820, 2)).toBe(1)
  })
})
