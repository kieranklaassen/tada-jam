import { describe, expect, it } from 'vitest'
import { CELL, COLS, OPEN, ROWS, at, atRest, generate } from '../ground'
import { kingdom } from '../chambers'
import { STAGE } from '../stage'
import { POSES, SIZE } from './creatures'
import { FRAME, GRASS_Y, GROUND, cellUnder } from './layout'
import { SPIKE_SEED, spikeScene, type Cast } from './spike'

// The spike's scenes are still, so their overlap test is a test of where things stand: nobody stands inside the
// ground, nobody floats, and nobody is cut off by the frame.

const SCENES = [1, 2, 3]
/** A spike frame draws its creatures and nothing else: what stands still is on layers of its own, painted once. */
const STILL_DRAWS = 0
const DRAW_BUDGET = 80

/** The body box of a cast member in stage units. The wedged queen and the upright worker have boxes of their own. */
function box(one: Cast): { left: number; right: number; top: number; bottom: number } {
  const size = one.kind === 'queen' && one.pose === 'wedged' ? { width: 56, height: 96 } : one.kind === 'worker' && one.pose === 'hips' ? { width: 28, height: 56 } : SIZE[one.kind]
  return { left: one.x - size.width / 2, right: one.x + size.width / 2, top: one.y - size.height, bottom: one.y }
}

describe('the spike scenes', () => {
  it('are laid out from one fixed seed and lie at rest', () => {
    for (const which of SCENES) expect(atRest(spikeScene(which).ground), `scene ${which}`).toBe(true)
    expect(spikeScene(1).ground.cells.length).toBe(generate(SPIKE_SEED).cells.length)
    expect(spikeScene(7).cast).toEqual(spikeScene(1).cast)
  })

  it('cast only poses that exist', () => {
    for (const which of SCENES) for (const one of spikeScene(which).cast) expect(POSES[one.kind], `${one.kind}/${one.pose}`).toContain(one.pose)
  })

  it('stay under the draw budget', () => {
    for (const which of SCENES) expect(spikeScene(which).cast.length + STILL_DRAWS, `scene ${which}`).toBeLessThanOrEqual(DRAW_BUDGET)
  })

  it('show a new nest with no chamber in the first frame, and a kingdom of several in the others', () => {
    expect(kingdom(spikeScene(1).ground).chambers.length).toBe(0)
    expect(kingdom(spikeScene(2).ground).chambers.length).toBeGreaterThanOrEqual(4)
    expect(kingdom(spikeScene(3).ground).workers).toBeGreaterThanOrEqual(8)
  })

  it('keep every creature inside the frame', () => {
    for (const which of SCENES) for (const one of spikeScene(which).cast) {
      const b = box(one)
      expect(b.left, `${which} ${one.kind}/${one.pose}`).toBeGreaterThanOrEqual(FRAME)
      expect(b.right, `${which} ${one.kind}/${one.pose}`).toBeLessThanOrEqual(STAGE.width - FRAME)
      expect(b.top, `${which} ${one.kind}/${one.pose}`).toBeGreaterThanOrEqual(FRAME)
    }
  })

  it('stand every creature in the ground on a floor, with its whole body in open cells', () => {
    for (const which of SCENES) {
      const scene = spikeScene(which)
      for (const one of scene.cast) {
        if (one.y <= GRASS_Y || (one.kind === 'queen' && one.pose === 'wedged')) continue
        const name = `${which} ${one.kind}/${one.pose}`
        const b = box(one)
        // Fliers hang in the air; everyone else has ground under the middle of their feet.
        const feet = cellUnder(one.x, one.y - 1)
        if (!one.pose.startsWith('fly')) expect(at(scene.ground, feet.x, feet.y + 1), `${name} floor`).not.toBe(OPEN)
        const from = cellUnder(b.left + 3, b.top + 3), to = cellUnder(b.right - 3, b.bottom - 3)
        for (let y = from.y; y <= to.y; y++) for (let x = from.x; x <= to.x; x++) expect(at(scene.ground, x, y), `${name} at ${x},${y}`).toBe(OPEN)
      }
    }
  })

  it('wedge the queen in the shaft of the first frame, which is too narrow for her', () => {
    const queen = spikeScene(1).cast.find((one) => one.kind === 'queen')!
    const b = box(queen)
    expect(b.right - b.left).toBe(2 * CELL)
    expect(cellUnder(b.left + 1, queen.y - 1).x).toBe(19)
    expect(cellUnder(b.right - 1, queen.y - 1).x).toBe(20)
    expect(SIZE.queen.width).toBeGreaterThan(2 * CELL)
  })

  it('lay the ground out as the stage says', () => {
    expect([GROUND.width, GROUND.height]).toEqual([COLS * CELL, ROWS * CELL])
    expect(GROUND.y + GROUND.height).toBe(STAGE.height - FRAME)
    expect(GROUND.x + GROUND.width).toBe(STAGE.width - FRAME)
  })

  it('show creatures in the tunnels about a tenth of the frame wide or more', () => {
    for (const kind of ['ant', 'raider', 'beetle', 'fly', 'dungBeetle', 'dungFly'] as const) expect(SIZE[kind].width / STAGE.width, kind).toBeGreaterThanOrEqual(0.094)
  })
})
