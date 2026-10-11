import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ray } from './aim'
import { KINDS, PER_KIND, type Kind, type Placed } from './blocks'
import * as castle from './castle'
import { FIXED_STEP_S } from './config'
import { FALL_SECONDS } from './evening'
import { BELL } from './layout'
import { Play, type PlayEvent } from './play'

// What a frame of Block Castle costs is set by counts, and the counts are held
// here: fixed steps in a frame, how often the evening castle is worked out
// (the one heavy sum: where each of the folk may rest without hiding a thing),
// and how much one frame says happened. Counts are the same on every machine;
// no time is measured. The draw calls are counted on the built game (the
// stills and the shared probe report them).

vi.mock('./castle', async (original) => {
  const actual = await original<typeof import('./castle')>()
  return { ...actual, restsFor: vi.fn(actual.restsFor), things: vi.fn(actual.things) }
})

const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
const down = (x: number, z: number): Ray => ({ origin: [x, 12, z], dir: [0, -1, 0] })

/** Every block there is on the rug: three of each kind. */
const FULL: Placed[] = [
  ...[0, 1, 2].map((row) => at('long', 0, row)), ...[0, 1, 2].map((row) => at('arch', 3, row)), ...[0, 1, 2].map((row) => at('slope', 5, row)),
  ...[0, 1, 2].map((row) => at('cube', 0, row)), ...[0, 1, 2].map((row) => at('round', 1, row)), ...[0, 1, 2].map((row) => at('thin', 2, row)),
]

beforeEach(() => {
  vi.mocked(castle.restsFor).mockClear()
  vi.mocked(castle.things).mockClear()
})

describe('the frame budget', () => {
  it('plays two fixed steps in a 60 Hz frame, and no more than twenty-four after a stall', () => {
    const play = new Play(FULL, 1)
    const before = play.time
    play.advance(1 / 60)
    expect(Math.round((play.time - before) / FIXED_STEP_S)).toBe(2)
    const stalled = play.time
    play.advance(5)
    expect(Math.round((play.time - stalled) / FIXED_STEP_S)).toBeLessThanOrEqual(24)
  })

  it('works the evening castle out once when the bell is rung, and never again while it falls, stands or is played with', () => {
    const play = new Play(FULL, 1)
    expect(FULL).toHaveLength(KINDS.length * PER_KIND)
    vi.mocked(castle.restsFor).mockClear()
    vi.mocked(castle.things).mockClear()
    play.press(down(BELL.x, BELL.z))
    expect(castle.restsFor).toHaveBeenCalledTimes(1)
    expect(castle.things).toHaveBeenCalledTimes(1)
    // The heaviest moment there is: every block becoming its thing, the folk on their way, the sun going down.
    const events: PlayEvent[] = []
    let most = 0
    for (let frame = 0; frame < 60 * (FALL_SECONDS + 1); frame++) {
      play.advance(1 / 60)
      const said = play.take()
      most = Math.max(most, said.length)
      events.push(...said)
    }
    expect(events.filter((event) => event.type === 'become')).toHaveLength(FULL.length)
    expect(play.evening.dusk).toBe(1)
    expect(play.sceneRunning).toBe(false)
    expect(castle.restsFor).toHaveBeenCalledTimes(1)
    expect(castle.things).toHaveBeenCalledTimes(1)
    // No frame says more than a handful of things happened, so no frame builds more than a handful of sounds.
    expect(most).toBeLessThanOrEqual(6)
    // The standing castle, tapped and left alone, is worked out no further.
    for (let index = 0; index < FULL.length; index++) {
      play.evening.act(index)
      for (let frame = 0; frame < 30; frame++) { play.advance(1 / 60); most = Math.max(most, play.take().length) }
    }
    expect(castle.restsFor).toHaveBeenCalledTimes(1)
    expect(castle.things).toHaveBeenCalledTimes(1)
    expect(most).toBeLessThanOrEqual(6)
  })

  it('keeps the number of things that move to what the basket holds', () => {
    const play = new Play(FULL, 1, true)
    expect(play.pieces).toHaveLength(18)
    expect(play.evening.things).toHaveLength(18)
    expect(Object.keys(play.evening.actors)).toHaveLength(3)
  })
})
