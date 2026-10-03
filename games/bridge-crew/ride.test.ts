import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { PARK, SPEED, WAIT, between, creaks, crossingTime, ended, frontAt, roadHeight, seat, stepAt } from './ride'
import { run } from './run'
import { site } from './sites'
import { VEHICLES, trainOf } from './vehicles'

const gap = site('plank-gap', 0), van = trainOf(VEHICLES['post-van'])
const crossing = run(gap, CROSSINGS['plank-gap'], van)

describe('a run as it is watched', () => {
  it('the vehicle sets off from where it waited and drives at one steady pace', () => {
    expect(frontAt(gap, 0)).toBe(gap.left[0] - WAIT.before)
    expect(frontAt(gap, 2) - frontAt(gap, 1)).toBeCloseTo(SPEED)
    expect(stepAt(gap, crossing, gap.left[0] - 0.5)).toBe(0)
    expect(stepAt(gap, crossing, gap.left[0] + 1)).toBe(2)
    expect(stepAt(gap, crossing, 99)).toBe(crossing.steps.length - 1)
    expect(ended(gap, crossing, gap.left[0] + 1)).toBe(false)
    expect(ended(gap, crossing, gap.right[0] + 1)).toBe(true)
    // It parks past the far lip by its own length and a little more.
    expect(frontAt(gap, crossingTime(gap, van))).toBeCloseTo(gap.right[0] + PARK + 1)
  })

  it('reads the bridge out between two steps: half-way in time is half-way in dip and in strain', () => {
    const a = between(crossing, 2), b = between(crossing, 3), mid = between(crossing, 2.5)
    const node = crossing.frame.at.get('12,6')!
    expect(mid.moved(node)[1]).toBeCloseTo((a.moved(node)[1] + b.moved(node)[1]) / 2, 6)
    expect(mid.use[0]).toBeCloseTo((a.use[0] + b.use[0]) / 2, 6)
    expect(between(crossing, crossing.steps.length - 1).use[0]).toBeCloseTo(crossing.steps[crossing.steps.length - 1].use[0])
  })

  it('the wheels ride the road as it lies now: level on the banks, down in the dip, with the dip drawn larger', () => {
    const under = between(crossing, 4)
    expect(roadHeight(gap, crossing, under, gap.left[0] - 1, 6)).toBe(gap.left[1])
    expect(roadHeight(gap, crossing, under, gap.right[0] + 1, 6)).toBe(gap.right[1])
    const true1 = roadHeight(gap, crossing, under, 12, 1), drawn6 = roadHeight(gap, crossing, under, 12, 6)
    expect(true1).toBeLessThan(6)
    expect(6 - drawn6).toBeCloseTo(6 * (6 - true1), 6)
    // Between two road nodes the height is on the line between them.
    expect(roadHeight(gap, crossing, under, 12.25, 6)).toBeCloseTo((roadHeight(gap, crossing, under, 12, 6) + roadHeight(gap, crossing, under, 12.5, 6)) / 2, 9)
  })

  it('the body tilts between its first axle and its last', () => {
    const under = between(crossing, 2)
    const going = seat(gap, crossing, under, van, 11, 6)
    expect(going.axles).toHaveLength(2)
    // Front wheels a cell onto the plank, back wheels at the lip: nose down.
    expect(going.tilt).toBeLessThan(0)
    expect(seat(gap, crossing, under, van, gap.left[0] - 0.8, 6).tilt).toBe(0)
    // A road that stops short keeps its last height past its end, for the moment before the fall.
    const short = run(gap, [part('plank', 8, 6, 12, 6, true)], van)
    const past = roadHeight(gap, short, between(short, short.steps.length - 1), 12.4, 6)
    expect(past).toBeLessThan(6)
    expect(past).toBeGreaterThan(5.8)
  })

  it('homeward the same bridge is met from the far end: the same places, the other way round', () => {
    const out = run(gap, CROSSINGS['plank-gap'], van), home = run(gap, CROSSINGS['plank-gap'], van, true)
    expect(home.ending).toEqual({ kind: 'crossed' })
    expect(home.steps).toHaveLength(out.steps.length)
    expect(home.steps[0].x).toBe(gap.right[0])
    expect(home.steps[1].x).toBe(gap.right[0] - 0.5)
    // The plank works hardest with the van at mid-span, whichever way it is going.
    const peak = (r: typeof out) => Math.max(...r.steps.map((s) => s.use[0]))
    expect(peak(home)).toBeCloseTo(peak(out), 4)
    expect(frontAt(gap, 0, true)).toBe(gap.right[0] + PARK)
    expect(stepAt(gap, home, gap.right[0] - 1, true)).toBe(2)
    expect(ended(gap, home, gap.left[0] - 2, true)).toBe(true)
    // Facing home, the other axle is ahead of the leading one's x by as far as it was behind.
    expect(seat(gap, home, between(home, 2), van, 12, 6, true).axles.map((a) => a.x)).toEqual([12, 13])
    // With no road to the far lip there is nothing to drive onto.
    expect(run(gap, [part('plank', 8, 6, 12, 6, true)], van, true).ending).toEqual({ kind: 'road-ends', at: gap.right })
  })

  it('on a stick the wheels ride a rail, most between two pins and not at all on a pin; on a plank on edge, a kerb', () => {
    // A rail of one-cell sticks, each joint held from a bank by a diagonal: light wheels can ride it.
    const rail = [part('stick', 10, 6, 11, 6), part('stick', 11, 6, 12, 6), part('stick', 12, 6, 13, 6), part('stick', 13, 6, 14, 6), part('stick', 11, 6, 10, 5), part('stick', 12, 6, 10, 4), part('stick', 13, 6, 14, 5)]
    const ride = run(gap, rail, van)
    expect(ride.road.complete).toBe(true)
    expect(ride.ending).toEqual({ kind: 'crossed' })
    const at = (x: number) => seat(gap, ride, between(ride, stepAt(gap, ride, x)), van, x, 6, false, rail)
    expect(at(10.5).rail).toBe(1)
    expect(at(10.1).rail).toBeCloseTo(0.4)
    // Both axles on pins: it sits level for a moment, so it rocks from stick to stick.
    expect(at(12).rail).toBe(0)
    expect(at(gap.left[0] - 0.5).rail).toBe(0)
    expect(at(10.5).kerb).toBe(0)
    // The same wheels on a longer stick are too much for it: it snaps under them.
    expect(run(gap, [part('stick', 10, 6, 12, 6), part('stick', 12, 6, 14, 6), part('stick', 12, 6, 10, 4)], van).ending).toMatchObject({ kind: 'gives', part: 0, strain: 'bend' })
    const edge = CROSSINGS['plank-gap'], flat = edge.map((p) => ({ ...p, turned: false }))
    expect(seat(gap, crossing, between(crossing, 2), van, 11, 6, false, edge).kerb).toBe(1)
    expect(seat(gap, crossing, between(crossing, 2), van, 11, 6, false, flat).kerb).toBe(0)
    expect(seat(gap, crossing, between(crossing, 0), van, gap.left[0] - 0.5, 6, false, edge).kerb).toBe(0)
    expect(seat(gap, crossing, between(crossing, 2), van, 11, 6, false, edge).rail).toBe(0)
  })

  it('a part creaks once each time its strain passes a threshold on the way up', () => {
    expect(creaks([0.2, 0.2], [0.6, 0.3])).toEqual([{ part: 0, use: 0.6 }])
    expect(creaks([0.6], [0.7])).toEqual([])
    expect(creaks([0.6], [0.95])).toEqual([{ part: 0, use: 0.95 }])
    expect(creaks([0.95], [0.4])).toEqual([])
    // Over a whole run of a flat plank that gives, it is heard more than once before it goes.
    const flat = run(gap, [part('plank', 10, 6, 14, 6)], van)
    let heard = 0
    for (let i = 1; i < flat.steps.length; i++) heard += creaks(Array.from(flat.steps[i - 1].use), Array.from(flat.steps[i].use)).length
    expect(heard).toBeGreaterThanOrEqual(2)
  })
})
