import { describe, expect, it } from 'vitest'
import { between, makeRng } from './rng'
import { Toy } from './toy'
import { freshWorld, railAt } from './world'
import { ENGINE_HALF, TAR, distance, type Pt } from './yard'

// Nothing passes through anything: the overlap tests of a canvas game. The
// real toy is played at 60 frames a second with seeded touches that reach
// every state (the first showing, rides of every form, riders boarding and
// getting home, full wagons, the roundabout, chalk on every thing), and each
// frame what a child would see cross is measured, in tar units.

const DT = 1 / 60
const line = (from: Pt, to: Pt, steps = 30): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const zigzag = (from: Pt): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 5; i++) out.push(...line({ x: from.x + i * 60, y: from.y + (i % 2 ? -110 : 0) }, { x: from.x + (i + 1) * 60, y: from.y + (i % 2 ? 0 : -110) }, 8))
  return out
}
const scribble = (c: Pt): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 10; i++) out.push(...line({ x: c.x - 40 + i * 8, y: c.y + (i % 2 ? 35 : -35) }, { x: c.x - 32 + i * 8, y: c.y + (i % 2 ? -35 : 35) }, 6))
  return out
}
const ring = (c: Pt, r: number): Pt[] => Array.from({ length: 61 }, (_, i) => ({ x: c.x + Math.cos((i / 60) * Math.PI * 1.97) * r, y: c.y + Math.sin((i / 60) * Math.PI * 1.97) * r }))

/**
 * What is drawn, as the box each thing takes up on the tar: the engine's body, each wagon, each rider on its
 * feet and each home, each measured from its picture.
 */
const WAGON_HALF = { w: 58, h: 36 }, RIDER_HALF = { w: 50, h: 55 }, HOME_HALF = { w: 85, h: 40 }
/** The train is at rest once nothing has moved for this many frames: its wagons have drawn up. */
const SETTLED = 100
/** And its wagons stand: none has moved for this many frames. */
const DRAWN_UP = 10
type Box = { at: Pt; w: number; h: number; what: string }
const up = (p: { x: number; y: number; angle: number }, by: number): Pt => ({ x: p.x + Math.sin(p.angle) * by, y: p.y - Math.cos(p.angle) * by })
function shapes(toy: Toy): { train: Box[]; standing: Box[] } {
  const train: Box[] = [{ at: toy.body, ...ENGINE_HALF, what: 'engine' }, { at: up(toy.wagon(0), 34), ...WAGON_HALF, what: 'wagon 1' }, { at: up(toy.wagon(1), 34), ...WAGON_HALF, what: 'wagon 2' }]
  const standing: Box[] = []
  for (const life of toy.company.cast.riders.values()) if (life.settledIn < 0 && !life.moving) standing.push({ at: { x: life.x, y: life.y - 50 }, ...RIDER_HALF, what: life.kind })
  for (const home of toy.company.stage().homes) standing.push({ at: { x: home.at.x, y: home.at.y - 26 }, ...HOME_HALF, what: `home of ${home.kind}` })
  return { train, standing }
}
/** How far one box stands in another: the lesser of how far they overlap sideways and up and down. */
const into = (a: Box, b: Box): number => Math.min(a.w + b.w - Math.abs(a.at.x - b.at.x), a.h + b.h - Math.abs(a.at.y - b.at.y))

type Seen = { frames: number; rested: number; moved: number; engineAtRest: number; engineRestFrames: number; wagonAtRest: number; wagonRestFrames: number; restOverlaps: string[]; engineThrough: number; wagonThrough: number; heap: number; twoInASeat: number; ridersCross: number }

function play(seed: number, marks: number, rests = false): Seen {
  const rng = makeRng(seed)
  const toy = new Toy(freshWorld(seed % 2 ? null : 4, seed), seed, true)
  const seen: Seen = { frames: 0, rested: 0, moved: 0, engineAtRest: 0, engineRestFrames: 0, wagonAtRest: 0, wagonRestFrames: 0, restOverlaps: [], engineThrough: 0, wagonThrough: 0, heap: Infinity, twoInASeat: 0, ridersCross: 0 }
  let still = 0, figuresThen = '', drawnUp = 0, wagonsThen = ''
  const look = () => {
    const { train, standing } = shapes(toy)
    seen.frames++
    // At rest: nothing has moved for a while, and nobody has been drawn in or rubbed away in that while either.
    const figures = standing.map((s) => `${s.what} ${Math.round(s.at.x)} ${Math.round(s.at.y)}`).join()
    if (figures !== figuresThen) still = 0
    figuresThen = figures
    still = !toy.journey.busy && !toy.journey.moving && !toy.company.playing && !toy.drawing ? still + 1 : 0
    // And its wagons have drawn up: a train that stopped with them the wrong way round swings them the long way
    // behind it, which takes longer than the while above, and on that way they pass what they pass.
    const wagons = train.slice(1).map((w) => `${Math.round(w.at.x)} ${Math.round(w.at.y)}`).join()
    drawnUp = wagons === wagonsThen ? drawnUp + 1 : 0
    wagonsThen = wagons
    const idle = still > SETTLED && drawnUp > DRAWN_UP
    // The train against everything that stands on the tar: at rest, and while the engine is riding.
    const riding = toy.journey.moving
    if (idle) seen.rested++
    if (riding) seen.moved++
    let engineIn = false, wagonIn = false, wagonRests = false, engineRests = false
    for (const part of train) for (const thing of standing) {
      const depth = into(part, thing)
      if (depth <= 0) continue
      const engine = part.what === 'engine'
      if (idle) {
        if (engine) {
          seen.engineAtRest = Math.max(seen.engineAtRest, depth)
          if (depth > 14) engineRests = true
        }
        else {
          if (depth > seen.wagonAtRest) seen.restOverlaps.push(`${part.what} in ${thing.what} by ${Math.round(depth)}`)
          seen.wagonAtRest = Math.max(seen.wagonAtRest, depth)
          if (depth > 12) wagonRests = true
        }
      } else if (riding && depth > 30) {
        if (engine) engineIn = true
        else wagonIn = true
      }
    }
    if (engineIn) seen.engineThrough++
    if (wagonIn) seen.wagonThrough++
    if (wagonRests) seen.wagonRestFrames++
    if (engineRests) seen.engineRestFrames++
    // The train itself: no wagon in the engine, no wagon in a wagon.
    seen.heap = Math.min(seen.heap, distance(toy.journey.pose, toy.wagon(0)), distance(toy.wagon(0), toy.wagon(1)))
    // Riders: never two in one wagon, and never one standing in another.
    const seats = [...toy.company.cast.riders.values()].filter((life) => life.settledIn >= 0).map((life) => life.settledIn)
    if (new Set(seats).size !== seats.length) seen.twoInASeat++
    const afoot = standing.filter((s) => !s.what.startsWith('home'))
    for (let i = 0; i < afoot.length; i++) for (let j = i + 1; j < afoot.length; j++) if (into(afoot[i], afoot[j]) > 10) seen.ridersCross++
  }
  const at = (): Pt => ({ x: toy.journey.pose.x, y: toy.journey.pose.y })
  for (let t = 0; t < 7; t += DT) { toy.step(DT); look() }
  for (let i = 0; i < marks; i++) {
    const c = { x: between(rng, 0, TAR.w), y: between(rng, 0, TAR.h) }
    const aim = toy.world.riders.find((r) => r.at === 'train') ?? toy.world.riders.find((r) => r.at === 'stop')
    const waiting = toy.world.riders.find((r) => r.at === 'next')
    const shape = Math.floor(rng.next() * 10)
    const raw = shape === 0 ? [c] : shape === 1 ? line(at(), c) : shape === 2 ? zigzag(c) : shape === 3 ? ring(c, between(rng, 50, 140)) : shape === 4 ? scribble(c)
      : shape === 5 && waiting ? line(at(), railAt(waiting.stop)) : aim ? line(at(), aim.at === 'train' ? railAt(aim.home) : railAt(aim.stop)) : [c]
    toy.press(raw[0])
    for (const p of raw.slice(1)) { toy.move(p); toy.step(DT); look() }
    toy.lift()
    for (let f = Math.floor(rests ? between(rng, 240, 460) : between(rng, 20, 260)); f > 0; f--) { toy.step(DT); look() }
  }
  for (let t = 0; t < 30 && (toy.journey.busy || toy.company.playing); t += DT) { toy.step(DT); look() }
  return seen
}

// What is held to nothing, and what is allowed with a reason and a cap. Measured over the eight seeded runs below,
// about 150,000 frames in all, when this was written; every cap sits a little above the worst run.
/**
 * The engine at rest may stand across the edge of a figure in one case. Reason: the model stops it at a spot
 * clear of every rider and home (`play.ts`), but two figures side by side on one row leave less room than the
 * engine is wide, and a ride that ends between them stands across the edge of both, drawn in front. An engine
 * that has set off along a line still being drawn, when the mark turns out to be no line, no longer stands where
 * it had got to in front of a home: it rolls on along that line to the first clear spot (`toy.ts`). Measured: 31
 * deep in one run, for 313 of its 6,148 frames at rest, 10 and 6 in two others and nothing in the other five.
 */
const ENGINE_REST = 45
const ENGINE_REST_SHARE = 0.1
/**
 * A wagon at rest covers nothing the child aims at: no rider and no home. At rest each wagon draws up behind the
 * one ahead, and where a rider or a home stands there it stands to one side instead, as far round as it takes
 * to be clear. Held to nothing: measured 0 in every run, over 18,000 frames at rest.
 */
const WAGON_REST = 0
/**
 * The riding train goes in front of a figure that the child's line crosses. Reason: the train rides the whole of
 * the line the child drew, and the child draws where it likes on a tar with twelve places; a train that stopped
 * at every figure on its way was tried, and four cycles in five no longer finished. It is drawn in front of what
 * it passes, both are flat chalk on one ground, and it does not stay there. Measured, of the frames in which it
 * rides: the engine 19 in 100 in the worst run and 8 to 10 in the others, a wagon 12.4 in 100, over the runs
 * made while this was written. The seeded play aims half its lines straight at a stop or a home, which a child
 * does less often.
 */
const ENGINE_PASSING = 0.24
const WAGON_PASSING = 0.2
/**
 * A rider on its feet may stand in another for a moment. Reason: a rider that gets out lands beside its wagon
 * before it walks home, and someone may be at home right there. Measured: 65 frames, about a second, in the
 * worst run made while this was written.
 */
const RIDERS_CROSS = 90

describe('nothing passes through anything', () => {
  // Five runs of a child who draws on and on, and three of one who watches each ride to its end and looks a while.
  const runs = [...[1, 2, 3, 4, 5].map((seed) => play(seed, 90)), ...[6, 7, 8].map((seed) => play(seed, 60, true))]

  it('reaches the states a child can reach: tens of thousands of frames, at rest and riding', () => {
    for (const seen of runs) {
      expect(seen.frames).toBeGreaterThan(8000)
      // The train rests less than it rides in this play: it waits for riders to climb in and squeezes through scribbles.
      expect(seen.rested).toBeGreaterThan(100)
      expect(seen.moved).toBeGreaterThan(2000)
    }
  })

  it('never has the train a heap: no wagon in the engine and no wagon in a wagon', () => {
    for (const seen of runs) expect(seen.heap).toBeGreaterThan(117)
  })

  it('never seats two riders in one wagon', () => {
    for (const seen of runs) expect(seen.twoInASeat).toBe(0)
  })

  it('stands one rider in another only for the moment it takes to get out of a wagon', () => {
    for (const seen of runs) expect(seen.ridersCross).toBeLessThanOrEqual(RIDERS_CROSS)
  })

  it('lets the engine at rest stand across the edge of a figure only between two that leave it no room', () => {
    for (const seen of runs) {
      expect(seen.engineAtRest).toBeLessThanOrEqual(ENGINE_REST)
      expect(seen.engineRestFrames / seen.rested).toBeLessThanOrEqual(ENGINE_REST_SHARE)
    }
  })

  it('never leaves a wagon at rest over a rider or a home', () => {
    for (const seen of runs) {
      expect(seen.wagonAtRest, seen.restOverlaps.slice(-3).join('; ')).toBeLessThanOrEqual(WAGON_REST)
      expect(seen.wagonRestFrames).toBe(0)
    }
  })

  it('takes the riding train in front of a figure only in passing', () => {
    for (const seen of runs) {
      expect(seen.engineThrough / seen.moved).toBeLessThanOrEqual(ENGINE_PASSING)
      expect(seen.wagonThrough / seen.moved).toBeLessThanOrEqual(WAGON_PASSING)
    }
  })
})
