import { beforeAll, describe, expect, it } from 'vitest'
import type { Build } from './build'
import { BANK_ACTS } from './bankActs2'
import { carry, launch, liftSun, poke, ringBehind, run, sail, worldWith } from './drive'
import { SURFACE, setUp, type Easel } from './easel'
import { FROG, KINGFISHER, LAID_OUT, SPRITE } from './layout'
import { startAct } from './play'
import { step } from './tick'
import { STEP, type World } from './world'

// The frame budget, counted and not timed, so it holds on a busy machine.
// A frame is sheets printed once and stamped, plus the pen's strokes and
// fills for what moves. Their sum is the game's one draw count, the number
// the grown-up overlay shows; it stays under 80 in the fullest frames a
// child can reach, and nothing is printed inside a frame.

const LIMIT = 80

const FULL: Partial<Build> = { hull: 'bark', masts: ['twig', 'stalk'], sails: ['maple', 'feather'], deck: ['berry', 'cap', 'pebble', 'birch'] }
const POND_BEFORE: Build[] = [
  { hull: 'walnut', masts: ['twig', 'stem'], sails: ['feather', 'birch'], deck: ['cap', 'berry'] },
  { hull: 'bark', masts: ['twig', null], sails: ['birch', null], deck: ['pebble'] },
  { hull: 'pod', masts: ['stem', null], sails: ['birch', null], deck: ['cap'] },
  { hull: 'bark', masts: ['stalk', 'twig'], sails: ['maple', 'feather'], deck: ['berry', 'cap', 'pebble'] },
]

/** The three sizes the count is taken at: the still's, a tablet's on its side, and the same tablet upright. */
const SIZES = [[SURFACE.width, SURFACE.height], [1024, 768], [768, 1024]] as const

for (const [width, height] of SIZES) {
let easel: Easel
let printedAtStart = 0
let madeAtStart = 0
/** The fullest frame of each part of the game at this size, kept for the report. */
const fullest: Record<string, number> = {}

/** Where the surface is not the stage's shape, the paper beside the print is one fill more in every frame. */
const paper = width * SURFACE.height === height * SURFACE.width ? 0 : 1

/** Draws a frame and holds it to the budget. The view's own tally must be what was really drawn. */
function drawn(part: string, w: World | null, idle = 0): number {
  const cost = easel.frame(w, idle)
  expect(cost.stamps, 'the tally of stamps is what was stamped').toBe(easel.surface.stamped.length)
  expect(cost.pen, 'the tally of the pen is its strokes and fills').toBe(easel.surface.strokes + easel.surface.fills)
  expect(cost.full, `${part}: one sheet covers the surface`).toBeLessThanOrEqual(1)
  fullest[part] = Math.max(fullest[part] ?? 0, cost.draws)
  return cost.draws
}

/** Plays on, drawing every third step, and gives the fullest frame. */
function watch(part: string, w: World, seconds: number, idle = 0): number {
  let most = 0
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    step(w, STEP)
    if (i % 3 === 0) most = Math.max(most, drawn(part, w, idle))
  }
  return most
}

describe(`frame budget at ${width} by ${height}`, () => {
  beforeAll(() => {
    easel = setUp(width, height)
    printedAtStart = easel.view.printed
    madeAtStart = easel.made()
  })

  it('draws the empty print, before the slot is read, with a handful of stamps', () => {
    expect(drawn('no world yet', null)).toBeLessThan(12)
  })

  it('stays under 80 draws at rest on the bank, with the one glow and the ghost hand showing', () => {
    for (const age of [4, 8]) {
      const w = worldWith(age === 4 ? { masts: ['twig', null] } : { hull: null })
      run(w, 0.5)
      expect(drawn('the bank at rest', w)).toBeLessThan(LIMIT)
      expect(drawn('the bank with glow and hand', w, 6)).toBeLessThan(LIMIT)
    }
  })

  it('stays under 80 through every cell of the bank grid', () => {
    for (const act of BANK_ACTS) {
      const w = worldWith(FULL)
      run(w, 0.3)
      const [family] = act.id.split(':')
      const kind = family === 'mast' ? 'stem' : family === 'leaf' ? 'birch' : family
      const piece = w.pieces.find((each) => each.kind === kind && each.place.on === 'bank') ?? null
      startAct(w, act, piece, { x: 480, y: 420 })
      expect(watch('the bank grid', w, act.length + 0.8), act.id).toBeLessThan(LIMIT)
    }
  })

  it('stays under 80 with everyone poked at once, a full boat afloat, rings on the water and puffs on the bank', () => {
    const w = worldWith(FULL)
    run(w, 0.3)
    launch(w)
    carry(w, LAID_OUT.stem, { x: FROG.mouth.x, y: FROG.mouth.y })
    poke(w, KINGFISHER.tap.x, KINGFISHER.tap.y)
    poke(w, SPRITE.tap.x, SPRITE.tap.y)
    for (const [x, y] of [[880, 470], [920, 520], [300, 420], [760, 560], [840, 400]] as const) poke(w, x, y)
    poke(w, 300, 780)
    poke(w, 520, 790)
    expect(watch('the bank at its busiest', w, 2.5)).toBeLessThan(LIMIT)
    expect(FROG.x).toBeLessThan(SPRITE.x)
  })

  it('stays under 80 down the whole brook, for a full boat, a bare one and a heavy one, the view moving on between places', () => {
    for (const build of [FULL, {}, { masts: ['twig', null], sails: ['birch', null], deck: ['pebble', 'berry'] }, { hull: 'walnut', masts: ['twig', 'stem'], sails: ['maple', 'birch'], deck: ['berry', 'cap'] }] as Partial<Build>[]) {
      const w = worldWith(build, { pond: POND_BEFORE })
      run(w, 0.3)
      launch(w)
      let since = 0
      for (let i = 0; i < 260 / STEP && !(w.finished && !w.scene); i++) {
        step(w, STEP)
        since += STEP
        const still = w.boat.mode === 'afloat' || (w.boat.mode === 'brook' && (w.journey.phase === 'held' || w.journey.phase === 'wait'))
        if (still && since > 1.2) { ringBehind(w); since = 0 }
        if (i % 4 === 0) expect(drawn(w.scene ? 'the lamp scene' : w.journey.phase === 'pan' ? 'the view moving on' : 'the brook', w), `frame ${w.frame} ${w.journey.phase}`).toBeLessThan(LIMIT)
      }
      expect(w.finished).toBe(true)
    }
  })

  it('stays under 80 at the finished pond with four boats moored, every lamp lit, dusk down and the ghost hand on the sun', () => {
    const w = worldWith(FULL, { pond: POND_BEFORE })
    run(w, 0.3)
    launch(w)
    expect(sail(w, (world) => world.finished && !world.scene)).toBe(true)
    expect(w.pond.length).toBe(5)
    expect(drawn('the finished pond', w)).toBeLessThan(LIMIT)
    expect(drawn('the finished pond with glow and hand', w, 6)).toBeLessThan(LIMIT)
    liftSun(w)
    expect(watch('the morning scene', w, 4.5)).toBeLessThan(LIMIT)
  })

  it('prints every sheet when the surface is sized or the pond\'s boats change, and none in a frame', () => {
    const w = worldWith({ masts: ['twig', null] })
    run(w, 0.5)
    drawn('the bank at rest', w)
    const made = easel.made(), printed = easel.view.printed
    for (let i = 0; i < 30; i++) { step(w, STEP); drawn('the bank with glow and hand', w, i / 5) }
    expect(easel.made()).toBe(made)
    expect(easel.view.printed).toBe(printed)
    expect(printedAtStart).toBeGreaterThan(0)
    expect(madeAtStart).toBeGreaterThan(20)
    // The same size again prints nothing; a new density prints once.
    easel.view.resize(width, height, SURFACE.ratio)
    expect(easel.made()).toBe(made)
    easel.view.resize(width, height, 1)
    expect(easel.made()).toBeGreaterThan(made)
    easel.view.resize(width, height, SURFACE.ratio)
  })

  it('reports its fullest frames', () => {
    // Held here so the numbers in REFINEMENT.md are the numbers a run gives.
    expect(Object.keys(fullest).length).toBeGreaterThan(6)
    for (const [part, draws] of Object.entries(fullest)) expect(draws, part).toBeLessThan(LIMIT)
    expect(fullest).toMatchObject(Object.fromEntries(Object.entries(REPORTED).map(([part, draws]) => [part, draws + paper])))
  })
})
}

/**
 * The fullest frame of each part at 1180 by 820, as counted on 2026-10-12: stamps plus the pen's strokes and fills.
 * At 1024 by 768 and at 768 by 1024 each is one more, the paper beside the print, so the fullest frame of all is 67.
 */
const REPORTED: Record<string, number> = {
  'no world yet': 9,
  'the bank at rest': 49,
  'the bank with glow and hand': 51,
  'the bank grid': 52,
  'the bank at its busiest': 66,
  'the brook': 54,
  'the view moving on': 64,
  'the lamp scene': 52,
  'the finished pond': 45,
  'the finished pond with glow and hand': 47,
  'the morning scene': 57,
}
