import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { PLAN_MOST } from './gait'
import { MAX_MARKS, MAX_MARK_POINTS } from './marks'
import { WORK } from './path'
import { noFeels, type RiderKind } from './tastes'
import { Toy } from './toy'
import { freshWorld, type Rider } from './world'
import { CHALK_AREA, type PlaceId, type Pt } from './yard'

// Frame budget, counted rather than timed so it holds on a busy CI runner.
// The heaviest thing this game does is geometry: when the finger moves, the
// line under it is read again and tried against every mark on the tar. That
// work is counted in pairs of stretches tested against each other. What is
// drawn is counted in pictures and paths.

const DT = 1 / 60
const seat = (kind: RiderKind, stop: PlaceId, home: PlaceId, at: Rider['at']): Rider => ({ kind, stop, home, at, chalk: 0, tar: 0, felt: noFeels() })
const line = (from: Pt, to: Pt, steps: number): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))

/** What a frame of this toy would have the view draw: the board, the weed, and every moving thing. */
function drawn(toy: Toy): number {
  const stage = toy.company.stage()
  const cast = toy.company.cast.riders.size + toy.company.cast.gone.length
  return 1 + 1 + toy.bits.list.length + stage.homes.length + stage.stops.length + cast * 6 + 12 + 2 * 10 + (toy.live ? 2 : 0) + 3
}

/** As full a tar as play can make: every mark as long as a mark may be, crossing all the others, two riders aboard and two waiting. */
function fullTar(): Toy {
  const toy = new Toy({ ...freshWorld(null, 5), shown: true, position: 'two-at-once', ahead: 'two-at-once', riders: [seat('frog', 'mid-1', 'top-4', 'train'), seat('cat', 'mid-3', 'low-4', 'train'), seat('snail', 'top-1', 'top-3', 'next'), seat('chick', 'low-1', 'low-3', 'before')] }, 5, true)
  for (let m = 0; m < MAX_MARKS + 2; m++) {
    const y = CHALK_AREA.y0 + 10 + m * 38
    const raw = m % 2 ? line({ x: CHALK_AREA.x0, y }, { x: CHALK_AREA.x1, y: y + 300 }, 80) : line({ x: CHALK_AREA.x1, y: y + 320 }, { x: CHALK_AREA.x0, y: y - 40 }, 80)
    toy.press(raw[0])
    for (const p of raw.slice(1)) toy.move(p)
    toy.lift()
  }
  return toy
}

describe('frame budget', () => {
  it('reads a long line against a full tar within a flat budget of work, for every move of the finger and for the lift', () => {
    const toy = fullTar()
    // As much chalk as the tar holds: the cap on points is reached before the cap on marks.
    expect(toy.world.marks.length).toBeGreaterThanOrEqual(MAX_MARKS - 3)
    expect(toy.world.marks.reduce((sum, mark) => sum + mark.p.length, 0)).toBeGreaterThan(1000)
    // The worst line: as long as a mark may be, zigzagging across every mark there is.
    const zz: Pt[] = []
    for (let i = 0; i < 14; i++) zz.push(...line({ x: CHALK_AREA.x0 + i * 70, y: i % 2 ? 700 : 180 }, { x: CHALK_AREA.x0 + (i + 1) * 70, y: i % 2 ? 180 : 700 }, 12))
    toy.press(zz[0])
    let worstFrame = 0, worstDrawn = 0, longest = 0
    for (let i = 1; i < zz.length; i += 3) {
      // Three moves of the finger in one frame, as a fast screen sends them: the line is still read once.
      WORK.pairs = 0
      for (const p of zz.slice(i, i + 3)) toy.move(p)
      toy.step(DT)
      worstFrame = Math.max(worstFrame, WORK.pairs)
      worstDrawn = Math.max(worstDrawn, drawn(toy))
      longest = Math.max(longest, toy.live?.p.length ?? 0)
      expect(toy.journey.queued).toBeLessThanOrEqual(PLAN_MOST + 1)
    }
    WORK.pairs = 0
    toy.lift()
    const lift = WORK.pairs
    // The heavy moment happened: the line grew to a full mark's length over a full tar.
    expect(longest).toBeGreaterThan(MAX_MARK_POINTS * 0.9)
    // Measured when this was written: about 306,000 pairs in the worst frame and 292,000 at the lift.
    expect(worstFrame, 'pairs tested in one frame, however often the finger moved in it').toBeLessThan(450_000)
    expect(lift, 'pairs tested when the finger lifts').toBeLessThan(450_000)
    // Measured: 268 pictures and paths, most of them loose bits, which a cheaper tier holds fewer of.
    expect(worstDrawn, 'pictures and paths in a frame').toBeLessThan(320)
  })

  it('reads a line drawn toward the train, which is ridden from its far end, within the same budget at the lift', () => {
    for (const towardTrain of [false, true]) {
      const toy = fullTar()
      const train = toy.world.train
      // One mark's length of zigzag across the marks, ending or beginning beside the train.
      const zz: Pt[] = []
      for (let i = 0; i < 3; i++) zz.push(...line({ x: train.x + 80 + i * 150, y: i % 2 ? 700 : 180 }, { x: train.x + 80 + (i + 1) * 150, y: i % 2 ? 180 : 700 }, 40))
      const stroke = towardTrain ? [...zz].reverse() : zz
      toy.press(stroke[0])
      for (const p of stroke.slice(1)) toy.move(p)
      WORK.pairs = 0
      toy.lift()
      expect(WORK.pairs, towardTrain ? 'drawn toward the train' : 'drawn away from it').toBeLessThan(450_000)
    }
  })

  it('does no geometry in a frame while the train rides, a scene plays or nothing happens', () => {
    const toy = fullTar()
    let worst = 0, worstDrawn = 0
    for (let f = 0; f < 60 * 40; f++) {
      WORK.pairs = 0
      toy.step(DT)
      worst = Math.max(worst, WORK.pairs)
      worstDrawn = Math.max(worstDrawn, drawn(toy))
    }
    expect(worst).toBe(0)
    expect(worstDrawn).toBeLessThan(320)
  })

  it('holds no more loose bits than the tier allows, and fewer on a cheaper tier', () => {
    for (const tier of TIERS) {
      const toy = new Toy({ ...freshWorld(null, 5), shown: true }, 5, true)
      toy.bits.setCap(tier.bits)
      let most = 0
      for (let i = 0; i < 60; i++) {
        toy.press({ x: 300 + i * 9, y: 300 + (i % 5) * 60 })
        toy.lift()
        for (let f = 0; f < 3; f++) toy.step(DT)
        most = Math.max(most, toy.bits.list.length)
      }
      expect(most).toBeLessThanOrEqual(tier.bits)
    }
    expect(TIERS[TIERS.length - 1].bits).toBeLessThan(TIERS[0].bits)
  })
})
