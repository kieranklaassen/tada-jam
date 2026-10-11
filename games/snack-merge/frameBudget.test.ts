import { PIB_NECK } from './figures'
import { describe, expect, it } from 'vitest'
import { Cast } from './cast'
import { TIERS } from './config'
import { IdleLadder } from './guidance'
import { ALL_KINDS, BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, radiusOf } from './kinds'
import { JAR, PLACES, SHELF } from './layout'
import { Play } from './play'
import { makeRng } from './rng'
import { freshSave, type Save } from './save'
import { SQUEEZE } from './jar'
import { View, squeezed, type CanvasMaker } from './view'

// The frame's cost, counted and not timed, so it holds on a busy machine. A
// frame of this game is stamps of sprites that were painted once, plus a few
// live strokes and fills for what moves inside a face or hangs on a string.
// The real view draws into a context that only counts, and the counts are
// held here in the heaviest moments a child can reach. The number the view
// hands back, and the grown-up overlay shows, is stamps plus strokes plus fills.

const W = 1180, H = 820, RATIO = 2

type Counts = { stamps: number; full: number; pen: number; made: number }

/** A 2D context that draws nothing and counts what it was asked to draw. */
function counting(counts: Counts, width: number, height: number): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => {} }
  const target: Record<string, unknown> = {
    canvas: { width, height },
    drawImage: (image: { width: number; height: number }) => {
      counts.stamps += 1
      if (image.width >= W * RATIO * 0.8 && image.height >= H * RATIO * 0.8) counts.full += 1
    },
    fill: () => { counts.pen += 1 },
    stroke: () => { counts.pen += 1 },
    fillRect: () => { counts.pen += 1 },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }
  return new Proxy(target, { get: (t, key) => (key in t ? t[key as string] : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D
}

function stage(): { view: View; counts: Counts; sprites: Counts } {
  const counts: Counts = { stamps: 0, full: 0, pen: 0, made: 0 }
  // What painting a sprite costs is paid once and is not the frame's.
  const sprites: Counts = { stamps: 0, full: 0, pen: 0, made: 0 }
  const make: CanvasMaker = (width, height) => {
    sprites.made += 1
    const context = counting(sprites, width, height)
    return { getContext: () => context }
  }
  const view = new View(counting(counts, W * RATIO, H * RATIO), make, makeRng(3))
  view.setTier(TIERS[0])
  view.resize(W, H, RATIO)
  return { view, counts, sprites }
}

function frame(view: View, counts: Counts, play: Play | null, cast: Cast | null, idle = 0): { count: number; stamps: number; pen: number; full: number } {
  counts.stamps = 0
  counts.pen = 0
  counts.full = 0
  const count = view.draw(play, cast, new IdleLadder(0).update(idle), 1 / 60)
  return { count, stamps: counts.stamps, pen: counts.pen, full: counts.full }
}

/** The fullest jar there is: bread to the rim, which nothing joins, with every place on the counter taken. */
function fullest(): Save {
  const r = radiusOf(BREAD)
  const jar: Save['jar'] = []
  for (let row = 0; jar.length < 30; row++) for (let i = 0; i < 5 && jar.length < 30; i++) jar.push({ k: BREAD, x: JAR.left + r + i * 2 * r, y: JAR.floor - r - row * 2 * r })
  return { ...freshSave(8), jar, counter: PLACES.map(() => BREAD | EGG), claw: BREAD | EGG, pick: 2 }
}

describe('the frame budget', () => {
  it('draws the empty shop as one full-surface stamp before the game is read', () => {
    const { view, counts } = stage()
    expect(frame(view, counts, null, null)).toEqual({ count: 1, stamps: 1, pen: 0, full: 1 })
  })

  it('counts what it draws: the number handed back is stamps plus live strokes and fills', () => {
    const { view, counts } = stage()
    const play = new Play(freshSave(5), 1), cast = new Cast(makeRng(2))
    const drawn = frame(view, counts, play, cast)
    expect(drawn.count).toBe(drawn.stamps + drawn.pen)
    expect(drawn.full).toBe(1)
  })

  it('opens on a frame of about forty draws', () => {
    const { view, counts } = stage()
    const play = new Play(freshSave(5), 1), cast = new Cast(makeRng(2))
    let worst = 0
    for (let i = 0; i < 600; i++) {
      play.step(1 / 60)
      cast.step(1 / 60)
      worst = Math.max(worst, frame(view, counts, play, cast, i / 60).count)
    }
    expect(worst).toBeLessThanOrEqual(44)
  })

  it('keeps the fullest jar, a full counter, the glow and the ghost hand under eighty draws', () => {
    const { view, counts } = stage()
    const play = new Play(fullest(), 1), cast = new Cast(makeRng(2))
    expect(play.jar.snacks).toHaveLength(30)
    let worst = { count: 0, stamps: 0, pen: 0, full: 0 }
    for (let i = 0; i < 720; i++) {
      play.step(1 / 60)
      cast.step(1 / 60)
      if (i === 300) cast.on({ what: 'join' })
      const drawn = frame(view, counts, play, cast, i / 60)
      expect(drawn.full).toBe(1)
      if (drawn.count > worst.count) worst = drawn
    }
    expect(worst.count).toBeLessThanOrEqual(80)
    expect(worst.pen).toBeLessThanOrEqual(18)
  })

  it('stays under ninety at the worst a child can make of it: a burp from the fullest jar with dust in the air', () => {
    const { view, counts } = stage()
    const play = new Play(fullest(), 1), cast = new Cast(makeRng(2))
    let worst = 0
    let burped = false
    for (let n = 0; n < 4 && !burped; n++) {
      play.press({ x: JAR.left + 60 + n * 70, y: 300 })
      play.release()
      for (let i = 0; i < 400; i++) {
        play.step(1 / 60)
        cast.step(1 / 60)
        for (const cue of play.drain()) {
          if (cue.type === 'puff') view.puff(cue.what, cue.x, cue.y, cue.n, cue.push)
          else if (cue.type === 'cast') cast.on(cue.cue)
        }
        burped ||= play.burping
        worst = Math.max(worst, frame(view, counts, play, cast).count)
      }
    }
    expect(burped).toBe(true)
    expect(worst).toBeLessThanOrEqual(90)
  })

  it('keeps each monster under eighty draws through the tip of its worst face, its pose, and the next one coming in', () => {
    const worstFaces = [CHEESE | JELLY | ICE, BREAD | EGG | CHILLI, CHEESE | CHILLI | ICE]
    for (const seat of [0, 1, 2]) {
      const { view, counts } = stage()
      const k = worstFaces[seat]
      const play = new Play({ ...freshSave(8), seat, jar: [{ k, x: 500, y: JAR.floor - radiusOf(k) }, { k: BREAD, x: 650, y: JAR.floor - radiusOf(BREAD) }], counter: PLACES.map(() => BREAD | EGG) }, 1)
      const cast = new Cast(makeRng(2))
      cast.sit(play.seat, play.pose)
      let worst = 0
      const go = (frames: number) => {
        for (let i = 0; i < frames; i++) {
          play.step(1 / 60)
          for (const cue of play.drain()) {
            if (cue.type === 'puff') view.puff(cue.what, cue.x, cue.y, cue.n, cue.push)
            else if (cue.type === 'cast') cast.on(cue.cue)
          }
          cast.step(1 / 60)
          const drawn = frame(view, counts, play, cast, 0)
          expect(drawn.full).toBe(1)
          worst = Math.max(worst, drawn.count)
        }
      }
      play.press({ x: 336, y: 430 })
      play.move({ x: 336 + 150, y: 430 })
      play.release()
      expect(play.playing).toBe('tip')
      go(720)
      expect(play.playing).toBeNull()
      play.press({ x: 160, y: 200 })
      play.release()
      expect(play.playing).toBe('next')
      go(400)
      expect(play.entrance).toBeNull()
      expect(worst).toBeLessThanOrEqual(80)
    }
  })

  it('paints every sprite once: a second minute of the same play makes none', () => {
    const { view, counts, sprites } = stage()
    const play = new Play({ ...freshSave(8), jar: [] }, 1), cast = new Cast(makeRng(2))
    const minute = () => {
      for (let i = 0; i < 6; i++) {
        play.press(SHELF[i])
        play.release()
        for (let f = 0; f < 40; f++) {
          play.step(1 / 60)
          frame(view, counts, play, cast, 0)
        }
      }
      for (let f = 0; f < 900; f++) {
        play.step(1 / 60)
        cast.step(1 / 60)
        frame(view, counts, play, cast, f / 60)
      }
    }
    minute()
    const made = sprites.made
    expect(made).toBeGreaterThan(15)
    minute()
    expect(sprites.made).toBe(made)
  })

  it('paints a sprite for every snack there is without failing', () => {
    const { view, counts, sprites } = stage()
    const cast = new Cast(makeRng(2))
    for (const k of ALL_KINDS) {
      const play = new Play({ ...freshSave(8), jar: [{ k, x: 500, y: JAR.floor - radiusOf(k) }], claw: k }, 1)
      expect(frame(view, counts, play, cast).count).toBeGreaterThan(20)
    }
    expect(sprites.made).toBeGreaterThanOrEqual(ALL_KINDS.length)
  })

  it('throws its sprites away when the surface changes density, and keeps them when it does not', () => {
    const { view, counts, sprites } = stage()
    const play = new Play(freshSave(5), 1), cast = new Cast(makeRng(2))
    frame(view, counts, play, cast)
    const made = sprites.made
    // The same size and pixel ratio again: nothing is painted again, the room included.
    view.resize(W, H, RATIO)
    frame(view, counts, play, cast)
    expect(sprites.made).toBe(made)
    // Another size at the same density: only the room, which is the size of the surface.
    view.resize(W + 200, H, RATIO)
    frame(view, counts, play, cast)
    expect(sprites.made).toBe(made + 1)
    view.resize(W, H, 1)
    frame(view, counts, play, cast)
    expect(sprites.made).toBeGreaterThan(made + 10)
  })

  it('draws nothing on a surface with no size', () => {
    const { view, counts } = stage()
    view.resize(0, 0, RATIO)
    expect(frame(view, counts, new Play(freshSave(5), 1), new Cast(makeRng(2))).count).toBe(0)
  })

  it('holds fewer puffs in the air on a cheaper tier', () => {
    const { view, counts } = stage()
    const play = new Play(freshSave(8), 1), cast = new Cast(makeRng(2))
    const base = frame(view, counts, play, cast).count
    view.puff('sugar', 500, 500, 40, 100)
    expect(frame(view, counts, play, cast).count).toBe(base + TIERS[0].puffs)
    view.setTier(TIERS[3])
    // The cheapest tier also leaves the drifting glint out.
    expect(frame(view, counts, play, cast).count).toBe(base + TIERS[3].puffs - 1)
  })

  it('draws two that are about to join pressed thin towards each other, more as the beat goes on, and draws the frame', () => {
    const cheese = { x: 500, y: 500, r: 48, squeeze: SQUEEZE }, bread = { x: 500, y: 586 }
    expect(squeezed(cheese)).toEqual({ px: 0, py: 0, thinX: 1, thinY: 1 })
    // The bread lies under it: it leans down into it and is pressed flat.
    const full = squeezed(cheese, bread)
    expect(full.py).toBeCloseTo(48 * 0.2)
    expect(full.px).toBeCloseTo(0)
    expect(full.thinY).toBeCloseTo(0.8)
    expect(full.thinX).toBeGreaterThan(1)
    const half = squeezed({ ...cheese, squeeze: SQUEEZE / 2 }, bread)
    expect(half.thinY).toBeGreaterThan(full.thinY)
    expect(half.thinY).toBeLessThan(1)
    // Side by side, it is pressed thin sideways.
    expect(squeezed(cheese, { x: 596, y: 500 }).thinX).toBeCloseTo(0.8)
    // The real view draws such a frame: a cheese let go on a bread, caught in the beat.
    const { view, counts } = stage()
    const play = new Play(freshSave(5), 1), cast = new Cast(makeRng(2))
    play.press({ x: play.jar.snacks[0].x, y: 300 })
    play.release()
    let caught = false
    for (let n = 0; n < 400 && !caught; n++) {
      play.step(1 / 240)
      caught = play.jar.snacks.some((s) => s.mate >= 0 && s.squeeze > 0)
    }
    expect(caught).toBe(true)
    expect(frame(view, counts, play, cast).count).toBeLessThanOrEqual(80)
  })

  it('never drops a made snack\'s flame, drip or steam for the cap on puffs: the oldest loose dust goes instead', () => {
    const { view, counts } = stage()
    view.setTier(TIERS[3])
    const play = new Play(freshSave(8), 1), cast = new Cast(makeRng(2))
    const base = frame(view, counts, play, cast).count
    view.puff('flame', 500, 500, 1, 0)
    view.puff('drip', 520, 500, 1, 0)
    view.puff('steam', 540, 500, 1, 26)
    view.puff('sugar', 500, 500, 40, 100)
    view.puff('smoke', 500, 500, 40, 100)
    expect(frame(view, counts, play, cast).count).toBe(base + 3 + TIERS[3].puffs)
    // And a flame that comes after the dust is kept too.
    view.puff('flame', 560, 500, 1, 0)
    expect(frame(view, counts, play, cast).count).toBe(base + 4 + TIERS[3].puffs)
  })

  it('stretches Pib\'s neck for cheese to half as long again', () => {
    const long = Math.hypot(PIB_NECK.long.x, PIB_NECK.long.y), rest = Math.hypot(PIB_NECK.rest.x, PIB_NECK.rest.y)
    expect(long / rest).toBeCloseTo(1.5, 1)
  })
})
