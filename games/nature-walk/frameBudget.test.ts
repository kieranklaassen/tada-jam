import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { blankSheets, clear, emptyRecording, recordingContext } from './recorder'
import { WHEEL } from './layout'
import { Finger, walk } from './script'
import { freshWorld } from './save'
import { step } from './step'
import { createToy } from './toy'
import { PLACES, THINGS } from './wood'
import { REPAINTS } from './sprites'
import { HELD, View } from './view'

// The frame budget, counted and never timed: a shared machine's stalls are not
// the game's. A scripted finger plays the whole game, every lap of it, and
// every frame is drawn on a context that keeps what was asked of it. A draw
// is one stamp of a painted piece or one live path, which is what the view
// reports to the grown-up overlay. The idle ladder is at its fullest, glow
// and ghost hand, on every frame with no scene and nothing in the hand,
// which is far more than the real ladder shows.
// There is one number: the draws of the busiest frame.

/** A tablet in landscape at pixel ratio 2. */
const WIDTH = 1180, HEIGHT = 820, DPR = 2
/** Bare wood, where a touch is a knock. */
const BARE = { x: 590, y: 330 }
/** The jam's bar: under this many draws a frame. */
const DRAWS = 80

describe('the frame budget', () => {
  it('holds on the busiest frame of a walk through the whole game', () => {
    const kept = emptyRecording(), painted = emptyRecording()
    const view = new View(blankSheets(painted))
    const g = recordingContext(kept)
    const worst = { draws: 0, at: '', apart: 0, full: 0, fresh: 0, freshAt: '' }
    let first = true
    const done = walk(1, 30, (toy, doing) => {
      clear(kept)
      const before = view.sprites.painted
      const full = toy.scene === null && toy.hand === null
      const counted = view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: full ? { glow: 1, demo: (toy.time * 0.4) % 1, demoIndex: 0 } : null, tier: TIERS[0] })
      const draws = kept.stamps.length + kept.paths
      if (draws > worst.draws) { worst.draws = draws; worst.at = `${doing}, ${toy.room ? 'room' : 'wood'}, at ${toy.time.toFixed(1)} s` }
      worst.apart = Math.max(worst.apart, Math.abs(counted - draws))
      worst.full = Math.max(worst.full, kept.stamps.filter((stamp) => stamp.w >= 1180 && stamp.h >= 820).length)
      const fresh = view.sprites.painted - before
      if (!first && fresh > worst.fresh) { worst.fresh = fresh; worst.freshAt = doing }
      first = false
    })
    expect(done.frames).toBeGreaterThan(30 * 300)
    expect(worst.draws, `most draws in one frame (${worst.at})`).toBeLessThan(DRAWS)
    expect(worst.draws).toBeGreaterThan(30)
    expect(worst.apart, 'the view\'s own count against the context\'s').toBe(0)
    // One whole-surface stamp a frame, and two only while the view slides between the wood and the room: the back
    // board with the sky is stamped only as far down as it shows, and the hills and the front strip are bands.
    expect(worst.full, 'whole-surface stamps in one frame').toBeLessThanOrEqual(2)
    // Painting is the heavy work of this look. A piece is painted the first time it is seen, a few in a frame.
    // The most in the walk is when a touch ends the turn of the year a quarter of a second in: the new season's
    // sides that had not yet been painted ahead.
    expect(worst.fresh, `pieces painted afresh in one frame (${worst.freshAt})`).toBe(REPAINTED)
    expect(kept.texts + painted.texts, 'text drawn').toBe(0)
    // The one number, where a reader of the test run finds it.
    expect({ busiestFrame: worst.draws }).toEqual({ busiestFrame: BUSIEST })
  }, 30000)

  it('holds on a wood made as full as a save can make it: six wet things on the ground, the glow and the ghost hand', () => {
    const spots = [{ x: 850, y: 470 }, { x: 930, y: 466 }, { x: 1004, y: 470 }, { x: 356, y: 650 }, { x: 440, y: 650 }, { x: 400, y: 730 }]
    for (const open of [[], [...PLACES]]) {
      const world = { ...freshWorld(null), open, wet: [...THINGS], finished: false }
      THINGS.forEach((thing, index) => { world.things[thing] = { at: 'path', ...spots[index] } })
      const toy = createToy(world, 1)
      const kept = emptyRecording(), view = new View(blankSheets(emptyRecording())), g = recordingContext(kept)
      let most = 0
      for (let frame = 0; frame < 240; frame++) {
        step(toy, 1 / 30)
        clear(kept)
        view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: { glow: 1, demo: (frame / 90) % 1, demoIndex: 0 }, tier: TIERS[0] })
        most = Math.max(most, kept.stamps.length + kept.paths)
      }
      expect(most, `covers ${open.length ? 'open' : 'shut'}`).toBeLessThan(DRAWS)
    }
  })

  it('counts the worst repaint there is: a touch that ends the turn of the year in the frame after it began', () => {
    const view = new View(blankSheets(emptyRecording())), g = recordingContext(emptyRecording())
    let most = 0, first = true
    const finger: Finger = new Finger(1, 60, (toy) => {
      const before = view.sprites.painted
      view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: null, tier: TIERS[0] })
      if (!first) most = Math.max(most, view.sprites.painted - before)
      first = false
    })
    finger.wait(0.5)
    finger.down(WHEEL, 'wheel'); finger.up()
    finger.wait(1 / 60)
    // The turn is a frame old, and nothing of the coming season has been painted ahead but the first two sheets.
    finger.down(BARE, 'a touch in the turn'); finger.up()
    finger.wait(0.5)
    expect(most).toBe(REPAINTED_AT_WORST)
    // In a turn left alone the sheets are painted ahead two to a frame, and no frame paints more than a few.
    const calm = new View(blankSheets(emptyRecording()))
    let calmMost = 0, started = true
    const other: Finger = new Finger(1, 60, (toy) => {
      const before = calm.sprites.painted
      calm.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: null, tier: TIERS[0] })
      if (!started) calmMost = Math.max(calmMost, calm.sprites.painted - before)
      started = false
    })
    other.wait(0.5)
    other.down(WHEEL, 'wheel'); other.up()
    other.wait(4.5)
    expect(calmMost).toBeLessThanOrEqual(3)
  })

  it('before the saved state has been read nothing half-drawn shows: the back board only, and then the whole wood in one frame', () => {
    const kept = emptyRecording()
    const view = new View(blankSheets(emptyRecording())), g = recordingContext(kept)
    // One stamp, the back board with its sky, and one fill of bare board below where that sheet ends.
    expect(view.draw(g, 1024, 768, 2, { toy: null, guidance: null, tier: TIERS[0] })).toBe(2)
    expect(kept.stamps).toHaveLength(1)
    expect(view.sprites.keyOf(kept.stamps[0].image)).toBe('sky')
    expect(kept.fills).toBe(1)
    // The frame the state is read in draws all of it: every piece is painted in that frame, and the next paints none.
    const toy = createToy({ ...freshWorld(null), finished: false }, 1)
    clear(kept)
    const before = view.sprites.painted
    const draws = view.draw(g, 1024, 768, 2, { toy, guidance: null, tier: TIERS[0] })
    expect(draws).toBeGreaterThan(30)
    expect(view.sprites.painted - before).toBeGreaterThan(30)
    const after = view.sprites.painted
    clear(kept)
    expect(view.draw(g, 1024, 768, 2, { toy, guidance: null, tier: TIERS[0] })).toBe(draws)
    expect(view.sprites.painted).toBe(after)
  })

  it('holds every sheet it keeps under 24 megapixels through the whole walk: all four seasons, both places and every cover', () => {
    const view = new View(blankSheets(emptyRecording())), g = recordingContext(emptyRecording())
    const most = { pixels: 0, at: '' }
    const seasons = new Set<string>(), places = new Set<boolean>(), opened = new Set<string>()
    const done = walk(1, 30, (toy, doing) => {
      view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: null, tier: TIERS[0] })
      if (view.sprites.pixels > most.pixels) { most.pixels = view.sprites.pixels; most.at = `${doing}, ${toy.room ? 'room' : 'wood'}, at ${toy.time.toFixed(1)} s` }
      seasons.add(toy.season); places.add(toy.room)
      for (const place of PLACES) if (toy.covers[place].open) opened.add(place)
    })
    expect(done.frames).toBeGreaterThan(30 * 300)
    expect(seasons.size).toBe(4)
    expect(places.size).toBe(2)
    expect(opened.size).toBe(PLACES.length)
    expect(most.pixels / 1e6, `most megapixels held (${most.at})`).toBeLessThan(MEGAPIXELS)
    expect({ megapixels: Math.round(most.pixels / 1e4) / 100 }).toEqual({ megapixels: MOST_HELD })
    // The store is trimmed to this at the end of a frame; only what one frame stamps can stand above it.
    expect(HELD * WIDTH * DPR * HEIGHT * DPR / 1e6).toBeLessThan(MEGAPIXELS)
  }, 30000)

  it('a change of tier or of size is spread: at most ten pieces painted again in a frame, the rest stamped as they were until their turn', () => {
    const kept = emptyRecording(), view = new View(blankSheets(emptyRecording())), g = recordingContext(kept)
    const toy = createToy({ ...freshWorld(null), open: [...PLACES], finished: false }, 1)
    const frame = (width: number, height: number, tier: number): { painted: number; draws: number } => {
      step(toy, 1 / 60)
      clear(kept)
      const before = view.sprites.painted
      const draws = view.draw(g, width, height, DPR, { toy, guidance: null, tier: TIERS[tier] })
      return { painted: view.sprites.painted - before, draws }
    }
    const first = frame(WIDTH, HEIGHT, 0)
    expect(first.painted).toBeGreaterThan(30)
    expect(frame(WIDTH, HEIGHT, 0).painted).toBe(0)
    for (const change of [{ width: WIDTH, height: HEIGHT, tier: 2 }, { width: 1024, height: 768, tier: 2 }, { width: WIDTH, height: HEIGHT, tier: 0 }]) {
      const pixels = view.sprites.pixels
      let frames = 0, total = 0
      for (;;) {
        const now = frame(change.width, change.height, change.tier)
        // Every frame draws the whole wood, whatever is still to be painted again.
        expect(now.draws).toBe(first.draws)
        expect(now.painted).toBeLessThanOrEqual(REPAINTS)
        total += now.painted
        frames += 1
        // While old and new stand side by side the store holds no more than the larger of the two.
        expect(view.sprites.pixels).toBeLessThanOrEqual(Math.max(pixels, MEGAPIXELS * 1e6))
        if (now.painted === 0) break
        expect(frames).toBeLessThan(40)
      }
      // All of it was painted again, over several frames.
      expect(total).toBeGreaterThan(30)
      expect(frames).toBeGreaterThan(4)
      expect(view.sprites.stale).toBe(0)
    }
  })

  it('draws nothing on a surface with no size', () => {
    const kept = emptyRecording()
    const view = new View(blankSheets(emptyRecording()))
    expect(view.draw(recordingContext(kept), 0, 0, 2, { toy: null, guidance: null, tier: TIERS[0] })).toBe(0)
    expect(kept.stamps).toHaveLength(0)
  })
})

/** The most pieces painted afresh in one frame of the walk, and in the worst case there is: both counted. */
const REPAINTED = 7
const REPAINTED_AT_WORST = 10

/** The bound on every sheet the game keeps, in megapixels, at 1180 by 820 and pixel ratio 2. */
const MEGAPIXELS = 24
/** The most the walk held at the end of any frame, counted: the store's own limit, which the walk reaches. */
const MOST_HELD = 22.83

/** The draws of the busiest frame of the walk: the game's one draw number. */
const BUSIEST = 76
