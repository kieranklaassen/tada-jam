import { beforeAll, describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { mat, middle, put, putOn, run, tap, tapBasket } from './drive'
import { IDLE_BEFORE_DEMO, IdleLadder } from './guidance'
import { useCanvases } from './paper'
import { PIECE_IDS } from './pieces'
import { Recording, recordingCanvases } from './recording'
import { firstPlaces, homePlaces } from './thing'
import { RainbowView } from './view'
import { World } from './world'

// Frame budget, counted rather than timed, so it holds on a busy machine. A frame of this canvas game is
// sprites stamped (things cut once from paper) plus fresh fills and strokes (faces, shade, rings). The real
// view draws into a recording context at both sizes the game is held to, and one number is held: the draws of
// a frame, a draw being one stamp or one fresh fill or stroke. The jam's bar is under about 80.

/**
 * The most a frame may cost, in draws, at either size and in any moment a child can reach. Counted on
 * 2026-10-12 at tier 0, the larger of the two sizes: 44 at rest, 51 idle with the light round every thing and
 * the ghost hand, 54 with all eight things set down apart and one in hand (50 idle, with the light round two of them
 * and the ghost hand), 56 with them crowded one before another (each on
 * its veil), rings in the mat and on the pane and a thing in hand, 38 with the basket on its side and every
 * thing in it (only three heads are drawn), 50 at most in the march and in the ghost, 50 in a tower five high.
 */
const DRAWS = 60
const SIZES: readonly [number, number][] = [[1180, 820], [1024, 768]]
const RATIO = 2

type Stage = { surface: Recording; view: RainbowView; w: number; h: number }
const stages: Stage[] = []
let cut: Recording[]

beforeAll(() => {
  const canvases = recordingCanvases()
  useCanvases(canvases.make)
  cut = canvases.made
  for (const [w, h] of SIZES) {
    const surface = new Recording(w * RATIO, h * RATIO)
    const view = new RainbowView({ getContext: () => surface.ctx } as unknown as HTMLCanvasElement, 1)
    view.setTier(TIERS[0])
    view.resize(w, h, RATIO)
    stages.push({ surface, view, w, h })
  }
})

/** Draws one frame of a world at both sizes and returns the larger count of draws. */
function draws(world: World, idle: number, label: string): number {
  let most = 0
  for (const { surface, view, w, h } of stages) {
    const ladder = new IdleLadder(0)
    surface.reset()
    const drawn = { ...view.draw(world, world.scene ? null : ladder.update(idle)) }
    // What the view says it drew is what reached the surface.
    expect(surface.count('drawImage'), label).toBe(drawn.stamps)
    expect(surface.count('fill') + surface.count('stroke'), label).toBe(drawn.pen)
    expect(surface.stamps.filter((stamp) => stamp.width >= w * RATIO && stamp.height >= h * RATIO).length, label).toBe(1)
    expect(drawn.fullSurface, label).toBe(1)
    most = Math.max(most, drawn.stamps + drawn.pen)
  }
  expect(most, `${label}: draws`).toBeLessThanOrEqual(DRAWS)
  expect(most, `${label}: the jam's bar`).toBeLessThan(80)
  return most
}

/** Every thing on the mat, each standing clear of the others where the game set it down. */
function fullMat(): World {
  const world = mat({})
  const spots: [number, number][] = [[380, 520], [800, 520], [590, 650], [470, 590], [710, 590], [590, 500], [350, 640], [830, 640]]
  PIECE_IDS.forEach((id, i) => { put(world, id, spots[i][0], spots[i][1]); run(world, 0.6) })
  expect(world.pieces.every((piece) => piece.at === 'mat')).toBe(true)
  return world
}

describe('the frame budget', () => {
  it('cuts every sprite once, at the surface\'s density, and paints the setting once', () => {
    for (const { view, w, h } of stages) {
      const before = cut.length
      view.resize(w, h, RATIO)
      // The same size again cuts no sprite: only the setting is painted again.
      expect(cut.length - before).toBe(1)
    }
    expect(cut.every((canvas) => canvas.image.width <= SIZES[0][0] * RATIO && canvas.image.height <= SIZES[0][1] * RATIO)).toBe(true)
  })

  it('holds at rest on a first visit, and idle with the glow and the ghost hand up', () => {
    draws(new World(firstPlaces(true)), 0, 'at rest')
    draws(new World(homePlaces()), IDLE_BEFORE_DEMO + 1, 'idle, glow and hand')
  })

  it('holds with all eight things on the mat, rings in its paper, taps on the pane and a thing in hand', () => {
    const world = fullMat()
    for (const x of [40, 80, 1160]) tap(world, x, 180)
    const at = middle(world, 'doll-tall')
    tap(world, at.x, at.y)
    run(world, 0.05)
    expect(world.hand).not.toBeNull()
    draws(world, IDLE_BEFORE_DEMO + 1, 'a full mat')
    // And idle with nothing by the mat: the light round the two things the hand will show, and the hand.
    const idle = fullMat()
    run(idle, 2)
    expect(draws(idle, IDLE_BEFORE_DEMO + 1, 'a full mat, idle')).toBe(draws(idle, 0, 'a full mat, quiet') + 3)
  })

  it('holds with the things crowded one before another, each dimming what is behind it', () => {
    // Where the child puts them: three rows deep, every one in front of another.
    const world = mat({
      'arch-large': { x: 600, y: 500 }, 'arch-middle': { x: 560, y: 540 }, 'arch-small': { x: 640, y: 570 }, 'doll-tall': { x: 520, y: 590 },
      'doll-round': { x: 600, y: 620 }, 'doll-small': { x: 680, y: 640 }, horse: { x: 560, y: 660 }, silk: { x: 660, y: 680 },
    })
    // Two fresh landings ring in the mat's paper, three taps ring on the pane, and a thing is in hand.
    put(world, 'doll-small', 760, 600)
    put(world, 'silk', 420, 640)
    for (const x of [40, 80, 1160]) tap(world, x, 180)
    const at = middle(world, 'horse')
    tap(world, at.x, at.y)
    run(world, 0.05)
    expect(world.hand).not.toBeNull()
    draws(world, IDLE_BEFORE_DEMO + 1, 'a crowded mat')
  })

  it('holds through the scenes with the most on the surface: the ghost, the march into the basket and the way out again', () => {
    const ghost = fullMat()
    putOn(ghost, 'silk', 'doll-round')
    for (let i = 0; i < 20; i++) { run(ghost, 0.25); if (ghost.scene) draws(ghost, 0, `the ghost, frame ${i}`) }
    const march = fullMat()
    tapBasket(march)
    for (let i = 0; i < 40; i++) { run(march, 0.25); draws(march, 0, `the march, frame ${i}`) }
    expect(march.basket).toBe('tipped')
    draws(march, IDLE_BEFORE_DEMO + 1, 'the basket on its side with every thing in it')
    tapBasket(march)
    for (let i = 0; i < 20; i++) { run(march, 0.25); draws(march, 0, `out again, frame ${i}`) }
  })

  it('holds with one tall tower and the silk over it', () => {
    const world = mat({ 'arch-large': { x: 590, y: 640, turned: true } })
    for (const [upper, lower] of [['doll-round', 'arch-large'], ['doll-tall', 'doll-round'], ['horse', 'doll-tall'], ['doll-small', 'horse'], ['arch-large', 'doll-small'], ['silk', 'doll-small']] as const) {
      putOn(world, upper, lower)
      for (let i = 0; i < 28; i++) { run(world, 0.25); draws(world, 0, `${upper} on ${lower}, frame ${i}`) }
    }
  })

  it('draws fewer motes on a lower tier and never another full-surface stamp', () => {
    const world = new World(firstPlaces(true)), { view, surface } = stages[0]
    const count = (): number => { surface.reset(); return view.draw(world, null).stamps }
    const full = count()
    view.setTier(TIERS[TIERS.length - 1])
    const least = count()
    view.setTier(TIERS[0])
    expect(full - least).toBe(TIERS[0].motes - TIERS[TIERS.length - 1].motes)
  })
})
