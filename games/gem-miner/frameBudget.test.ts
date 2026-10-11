import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { CAGE, COLS, LIFT, centre, indexOf } from './layout'
import type { Play } from './play'
import { FRAME, H, W, rig, watched } from './rig'
import { layWorld, type World } from './world'

// Frame budget, counted rather than timed, so it holds on a busy machine. A
// frame of this game is one stamp of the cached hillside, then stamps of
// pictures that were drawn once, plus a few pen strokes and fills for what
// moves (eyes, a flame, a rope, drops). The real view draws into a recording
// surface at a pixel ratio of 2, and the counts are held here in the
// heaviest moments a child can reach.

/**
 * What a frame may cost. Counted on 2026-10-11 with the real view: 60 draws at the worst of ordinary play on a
 * fresh hillside (48 stamps and 16 pen strokes and fills, not in the same frame), 54 at the worst of the ride
 * with its rolled hide, and 76 at the worst of a full cave (eight lived-in places and nine free gems, a blow
 * landing with chips in the air, the ghost hand up) and of the blast and the run (64 stamps, 15 pen). Counted
 * again the same day with what was added since: 77 at the worst of a gem carried across the full cave and of the
 * ride from the full cave with a full bucket in his paw (the heaviest frames there are), 51 for the wedge's split
 * with its two halves, 47 for the mammoth's invitation. The jam's bar is under about 80 draws.
 */
const BUDGET = { ordinary: 68, draws: 80, stamps: 70, pen: 22, fullSurface: 1 }
const RATIO = 2
/** The counts of the last test below, as they were counted: a change that moves one of them shows here by name. */
const COUNTED = 'carried gem 77 (65 + 13), ride from the full cave 77 (64 + 15), split 51 (39 + 12), invitation 47 (38 + 9)'
const view = rig(RATIO)
const mid = (index: number) => centre(index % COLS, Math.floor(index / COLS))

type Cost = { stamps: number; pen: number; full: number; draws: number }
function cost(play: Play): Cost {
  const stamps = view.frame(play, FRAME)
  // The view's own count, which the grown-up's overlay shows, is the count that was made.
  expect(view.view.stamps).toBe(stamps.length)
  expect(view.view.pen).toBe(view.surface.fills + view.surface.strokes)
  return { stamps: stamps.length, pen: view.view.pen, full: stamps.filter((one) => one.w >= W * RATIO * 0.8 && one.h >= H * RATIO * 0.8).length, draws: stamps.length + view.view.pen }
}
const most = (a: Cost, b: Cost): Cost => ({ stamps: Math.max(a.stamps, b.stamps), pen: Math.max(a.pen, b.pen), full: Math.max(a.full, b.full), draws: Math.max(a.draws, b.draws) })

/** Plays a visit with a finger held on a block, and gives back the worst frame. */
function worst(play: Play, seconds: number, at: { x: number; y: number } | null): Cost {
  let out: Cost = { stamps: 0, pen: 0, full: 0, draws: 0 }
  if (at) play.press(at, false)
  for (let t = 0; t < seconds; t += FRAME) {
    play.step(FRAME, at !== null)
    out = most(out, cost(play))
  }
  if (at) play.release('drop', at, false)
  return out
}

/** A cave dug wide and lit in strips, so that many kinds live in it at once, with every gem out of the rock. */
function fullCave(): World {
  const world = drawn(
    'eeeeee@eeeeee',
    'oooeoooeoooee',
    'eeeeeeoeeeeee',
    'oooeoooeoooee',
    'eeeeeeoeeeeee',
    'oooeoooeoooeo',
    'eeeeeeeeeeeeo',
  )
  const lamps: [number, number, ('red' | 'green' | 'blue')[]][] = [[1, 1, ['red']], [5, 1, ['green']], [9, 1, ['blue']], [1, 3, ['red', 'green']], [9, 3, ['green', 'blue']], [1, 5, ['red', 'blue']]]
  for (const [c, r, colours] of lamps) for (const colour of colours) world.gems.push({ colour, at: indexOf(c, r), rest: 'floor' })
  for (const c of [8, 9, 10]) world.wet[indexOf(c, 5)] = true
  world.mole.at = indexOf(6, 3)
  return world
}

describe('frame budget', () => {
  it('draws every picture once, when the surface is sized, and none in a frame', () => {
    const { play } = watched(layWorld(1, 'near'))
    cost(play)
    const made = view.made()
    // The grain twice, the wall, the shade and the hillside, and the pictures: 24 blocks, the gems and their
    // shines, the tools, the mole, the mammoth, the lift, the dwellers, the herd's heads and the small things.
    expect(made).toBeGreaterThan(60)
    expect(made).toBeLessThan(140)
    worst(play, 2, mid(indexOf(6, 3)))
    expect(view.made()).toBe(made)
  })

  it('stamps the whole surface once a frame, and paints the hillside again only when it is a fresh one', () => {
    const world = layWorld(1, 'near')
    const { play } = watched(world)
    cost(play)
    const before = view.view.repaints
    const digging = worst(play, 4, mid(indexOf(6, 3)))
    expect(digging.full).toBe(BUDGET.fullSurface)
    expect(view.view.repaints).toBe(before)
    // The ride lays a fresh hillside, and that one is painted whole, once.
    const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
    play.press(lift, false); play.release('tap', lift, false)
    worst(play, 4, null)
    play.press(lift, false); play.release('tap', lift, false)
    expect(play.game.sceneName).toBe('ride')
    const riding = worst(play, 9, null)
    expect(play.game.sceneName).toBeNull()
    expect(riding.full).toBe(BUDGET.fullSurface)
    expect(view.view.repaints).toBe(before + 1)
    // The rolled hide adds one stamp of the bare wall, of the hill's size at most, and a few fills.
    expect(riding.draws).toBeLessThanOrEqual(BUDGET.ordinary)
  })

  it('keeps ordinary play on a fresh hillside under the bar: digging, a blow on granite, the ghost hand', () => {
    let all: Cost = { stamps: 0, pen: 0, full: 0, draws: 0 }
    for (const seed of [1, 2, 3]) {
      const { play } = watched(layWorld(seed, seed === 1 ? 'near' : 'wild'))
      all = most(all, worst(play, 5, mid(indexOf(6, 4))))
      all = most(all, worst(play, 9, null))
    }
    expect(all.stamps).toBeGreaterThan(30)
    expect(all.draws).toBeLessThanOrEqual(BUDGET.ordinary)
    expect(all.full).toBe(BUDGET.fullSurface)
  })

  it('keeps the full cave inside the budget: eight lived-in places and more, nine gems, a blow landing, and the three scenes', () => {
    const { play } = watched(fullCave())
    let all = worst(play, 1, null)
    expect(play.cast.lodgers.length).toBeGreaterThanOrEqual(8)
    all = most(all, worst(play, 3, mid(indexOf(6, 5))))
    all = most(all, worst(play, 8, null))
    // The blast and the run, from the same cave.
    const blast = watched(drawn('oee', 'oee', 'oee', '@ae'))
    all = most(all, worst(blast.play, 6, mid(indexOf(1, 3))))
    const run = watched(drawn('eweeeee', '@eeeeee', 'oeeeeee', 'oooooee'))
    all = most(all, worst(run.play, 7, mid(indexOf(1, 0))))
    expect(all.draws).toBeLessThanOrEqual(BUDGET.draws)
    expect(all.stamps).toBeLessThanOrEqual(BUDGET.stamps)
    expect(all.pen).toBeLessThanOrEqual(BUDGET.pen)
    expect(all.full).toBe(BUDGET.fullSurface)
  })
  it('keeps the rest of what a child can reach inside it: a gem carried across the full cave, the ride from it with a full bucket, a split, the invitation', () => {
    const report: string[] = []
    const note = (name: string, one: Cost): Cost => { report.push(`${name} ${one.draws} (${one.stamps} + ${one.pen})`); return one }
    // A gem carried from room to room: its light goes with it, and who lives where waits until it is set down.
    const carry = watched(fullCave())
    let all = worst(carry.play, 1.5, null)
    const lodgers = carry.play.cast.lodgers.length
    carry.play.press(carry.play.game.gemPlace(carry.play.game.world.gems[0]), false)
    let carried: Cost = { stamps: 0, pen: 0, full: 0, draws: 0 }
    for (const stop of [indexOf(5, 1), indexOf(9, 1), indexOf(9, 3), indexOf(1, 3), indexOf(1, 5), indexOf(9, 5)]) {
      carry.play.drag({ x: mid(stop).x, y: mid(stop).y + 30 }, false)
      for (let t = 0; t < 0.5; t += FRAME) { carry.play.step(FRAME, true); carried = most(carried, cost(carry.play)) }
      expect(carry.play.cast.lodgers.length).toBe(lodgers)
    }
    carry.play.release('drop', mid(indexOf(9, 5)), false)
    all = most(all, note('carried gem', most(carried, worst(carry.play, 2, null))))
    // The ride from the full cave, the mole with a bucket of earth in his paw.
    const cave = fullCave()
    cave.mole.at = CAGE
    cave.mole.tool = 'bucket'
    cave.mole.load = 'earth'
    const ride = watched(cave)
    worst(ride.play, 1, null)
    const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }
    ride.play.press(lift, false)
    ride.play.release('tap', lift, false)
    expect(ride.play.game.sceneName).toBe('ride')
    all = most(all, note('ride from the full cave', worst(ride.play, 9, null)))
    // The wedge splitting sandstone, with its two halves drawn.
    const stone = drawn('@s')
    stone.mole.tool = 'wedge'
    all = most(all, note('split', worst(watched(stone).play, 3, mid(1))))
    // The mammoth's invitation, with the mole waiting in the cage.
    const waits = layWorld(3, 'near')
    waits.mole.at = CAGE
    all = most(all, note('invitation', worst(watched(waits).play, 9, null)))
    expect(all.draws, report.join(', ')).toBeLessThan(BUDGET.draws)
    expect(all.stamps, report.join(', ')).toBeLessThanOrEqual(BUDGET.stamps)
    expect(all.pen, report.join(', ')).toBeLessThanOrEqual(BUDGET.pen)
    expect(all.full).toBe(BUDGET.fullSurface)
    expect(report.join(', ')).toBe(COUNTED)
  })
})
