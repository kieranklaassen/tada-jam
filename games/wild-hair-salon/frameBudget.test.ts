import { describe, expect, it } from 'vitest'
import { blankSheets, recordingSheet, type Recording } from './recorder'
import { Sprites } from './sprites'
import { drawFrame } from './view'
import { visit } from './visit'
import type { Ctx } from './wash'

// The frame budget, counted (never timed: a shared runner's stalls are not the
// game's). A scripted finger plays whole visits at sixty frames a second, and
// every frame is drawn on a context that keeps what was asked of it. What is
// counted is what sets the cost on a tablet: how many things a frame draws,
// how many times it covers the whole surface, and how many pieces it paints
// afresh, which is the heavy work of this look. The idle ladder is at its
// fullest, glow and ghost hand, whenever the finger is off the glass, which is
// more than the real ladder ever shows.

const W = 2360, H = 1640
/** The jam's bar: about this many draws a frame. */
const DRAWS = 80
/** Fresh paintings a frame may make once the first frame is done. */
const PAINTED = 2

describe('the frame budget', () => {
  it.each([7, 20261003])('holds on every frame of two customers seen through (seed %i)', (seed) => {
    const sprites = new Sprites(blankSheets, W, H, 1)
    const kept: Recording = { shapes: [], stamps: [], texts: 0 }
    const surface = recordingSheet(W, H, kept)
    const worst = { draws: 0, counted: 0, full: 0, painted: 0, at: '' }
    let first = true, repaintsAtRest = 0
    const done = visit(seed, (play, doing, idle) => {
      kept.shapes.length = 0
      kept.stamps.length = 0
      const before = sprites.painted
      const counted = drawFrame(surface.g as Ctx, W, H, sprites, { play, guidance: idle ? { glow: 1, demo: (play.time * 0.4) % 1, demoIndex: Math.floor(play.time / 3) } : null })
      const draws = kept.shapes.length + kept.stamps.length
      const full = kept.stamps.filter((stamp) => (stamp.image as { width: number }).width === W && (stamp.image as { height: number }).height === H).length
      if (draws > worst.draws) { worst.draws = draws; worst.at = doing }
      worst.counted = Math.max(worst.counted, counted - draws, draws - counted)
      worst.full = Math.max(worst.full, full)
      if (!first) worst.painted = Math.max(worst.painted, sprites.painted - before)
      first = false
      if (doing === 'seated') repaintsAtRest = sprites.repaints
    })
    // The heavy moments happened: every kind of move, both seats, the cape off, a scene cut short, three pairs let in.
    for (const move of ['lock snipped', 'model pulled', 'ribbon snipped', 'tuft snipped', 'mane ruffled', 'ribbon to a face', 'piece to a face', 'friend sent across', 'friend sent back', 'cape off', 'scene cut by a touch', 'cape on']) expect(done.did).toContain(move)
    expect(done.did.filter((move) => move === 'door')).toHaveLength(3)
    expect(done.frames).toBeGreaterThan(60 * 60)
    expect(done.play.game!.clippings.length).toBeGreaterThan(0)

    expect(worst.draws, `most draws in one frame (${worst.at})`).toBeLessThanOrEqual(DRAWS)
    // What the view reports to the grown-up overlay is what it drew.
    expect(worst.counted, 'the view\'s own count against the context\'s').toBe(0)
    expect(worst.full, 'whole-surface stamps in one frame').toBe(1)
    expect(worst.painted, 'pieces painted afresh in one frame after the first').toBeLessThanOrEqual(PAINTED)
    // Three customers' manes and a few cuts: a tuft is painted when it is dealt and when it is cut, not as it moves.
    expect(repaintsAtRest).toBeLessThanOrEqual(3 * 9 + 24)
    expect(kept.texts).toBe(0)
  })
})
