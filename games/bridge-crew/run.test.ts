import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { hang, lowPoint, park, roadOf, run } from './run'
import { settle, solve } from './frame'
import { isFooting, site } from './sites'
import { VEHICLES, trainOf, trolleyTrain } from './vehicles'

const van = trainOf(VEHICLES['post-van']), piano = trainOf(VEHICLES['piano-mover'])
const gap = site('plank-gap', 0)

describe('a run over the bridge as built', () => {
  it('a plank on edge carries the van and the same plank flat cracks under it where it bends most', () => {
    expect(run(gap, [part('plank', 10, 6, 14, 6, true)], van).ending).toEqual({ kind: 'crossed' })
    const flat = run(gap, [part('plank', 10, 6, 14, 6)], van)
    expect(flat.ending).toMatchObject({ kind: 'gives', part: 0, strain: 'bend' })
    // It gives while the wheels are on it, at a place the wheels have reached.
    if (flat.ending.kind !== 'gives') throw new Error('unreachable')
    expect(flat.ending.spot[0]).toBeGreaterThan(10)
    expect(flat.ending.spot[0]).toBeLessThanOrEqual(flat.steps[flat.steps.length - 1].x)
    // The strain rose step by step before it gave: the last step is the first over the limit.
    const use = flat.steps.map((step) => step.use[0])
    expect(Math.max(...use.slice(0, -1))).toBeLessThanOrEqual(1)
    expect(use[use.length - 1]).toBeGreaterThan(1)
  })

  it('no road, or a road that stops short, lets the wheels roll off its end', () => {
    expect(run(gap, [], van).ending).toEqual({ kind: 'road-ends', at: [10, 6] })
    // Two cells of plank lie on the bank and two reach out over the water.
    expect(run(gap, [part('plank', 8, 6, 12, 6, true)], van).ending).toEqual({ kind: 'road-ends', at: [12, 6] })
  })

  it('a hinge with nothing under it has already folded, so the road ends at the bank', () => {
    const at = site('rock-prop', 0), built = CROSSINGS['rock-prop']
    const result = run(at, built.slice(0, 2), van)
    expect(result.frame.firm).toEqual([false, false])
    expect(result.ending).toEqual({ kind: 'road-ends', at: [8, 6] })
    expect(run(at, built, van).ending).toEqual({ kind: 'crossed' })
  })

  it('a thread where a push is goes slack and the build folds', () => {
    // A post above the hinge with threads down to the banks would have to push: it cannot hold the hinge up.
    const at = site('thin-kit', 0)
    const pushed = [part('plank', 8, 6, 12, 6, true), part('plank', 12, 6, 16, 6, true), part('stick', 12, 6, 12, 8), part('thread', 12, 8, 8, 6), part('thread', 12, 8, 16, 6)]
    expect(run(at, pushed, piano).frame.firm.some(Boolean)).toBe(false)
    // The same three parts below the deck pull, and hold.
    expect(run(at, CROSSINGS['thin-kit'], piano).ending).toEqual({ kind: 'crossed' })
  })

  it('an arch of pinned sticks carries by squeeze, and keeps its shape only when posts tie it to the deck', () => {
    const at = site('arch-gorge', 0), bridge = CROSSINGS['arch-gorge']
    const arch = [part('stick', 9, 4, 11, 6), part('stick', 11, 6, 13, 6), part('stick', 13, 6, 15, 4)]
    expect(settle(arch, isFooting(at)).firm).toEqual([false, false, false])
    const frame = settle(bridge, isFooting(at))
    expect(frame.firm.every(Boolean)).toBe(true)
    const loaded = solve(frame, [{ node: frame.at.get('12,8')!, weight: 3 }])
    for (const index of [5, 6, 7]) expect(loaded.parts[index].force).toBeLessThan(-1)
    // With the arch under it the deck dips less than the same deck on its two braces alone.
    const bus = trainOf(VEHICLES['giraffe-bus'])
    expect(run(at, bridge, bus).ride.dip).toBeLessThan(0.8 * run(at, bridge.slice(0, 5), bus).ride.dip)
  })

  it('the wrong road works too, each in its own way', () => {
    // A stick as road is carried by bending between its pins and snaps under the wheel.
    expect(run(gap, [part('stick', 10, 6, 14, 6)], van).ending).toMatchObject({ kind: 'gives', part: 0, strain: 'bend', spot: [10.5, 6] })
    // A tube rolls the wheels off.
    const tube = [part('plank', 10, 6, 12, 6, true), part('tube', 12, 6, 14, 6), part('stick', 12, 6, 10, 4)]
    expect(run(gap, tube, van).ending).toEqual({ kind: 'rolls-off', part: 1, at: [12.5, 6] })
    // A thread dips into a V.
    const rope = [part('thread', 10, 6, 12, 5), part('thread', 12, 5, 14, 6)]
    expect(run(gap, rope, van).ending).toMatchObject({ kind: 'dunks', part: 0 })
  })

  it('the wheels take the plank nearest to level where two leave a pin', () => {
    const forked = [part('plank', 10, 6, 14, 6, true), part('plank', 10, 6, 12, 8, true), part('stick', 12, 8, 12, 6)]
    const frame = settle(forked, isFooting(gap)), road = roadOf(gap, frame)
    expect(road.complete).toBe(true)
    expect(new Set(road.parts)).toEqual(new Set([0]))
  })

  it('reads the ride from the model: dip, corner, slope, what hangs low, what stands in the channel, where the road is held', () => {
    const stays = run(site('high-thread', 0), CROSSINGS['high-thread'], piano)
    expect(stays.ride.dip).toBeGreaterThan(0.02)
    expect(stays.ride.dipAt).toBeGreaterThan(8)
    expect(stays.ride.held).toEqual([4, 4])
    // The threads come down to the deck at its middle: lower than three cells over the road, but not lower than one for long.
    expect(stays.ride.low[2]).toEqual([2, 3])
    const under = run(site('tall-bus', 0), CROSSINGS['tall-bus'], trainOf(VEHICLES['giraffe-bus']))
    expect(under.ride.low[2]).toEqual([])
    const barge = site('barge-below', 0)
    expect(run(barge, CROSSINGS['barge-below'], van).ride.blocked).toEqual([])
    const propped = [...CROSSINGS['barge-below'], part('tube', 14, 1, 14, 6)]
    expect(run(barge, propped, van).ride.blocked).toEqual([5])
    // A road built on a slope has a corner at each bank and a steep piece.
    const humped = [part('plank', 10, 6, 12, 7, true), part('plank', 12, 7, 14, 6, true), part('stick', 12, 7, 10, 4), part('stick', 12, 7, 14, 4)]
    const hump = run(gap, humped, van)
    expect(hump.ending).toEqual({ kind: 'crossed' })
    expect(hump.ride.slope).toBeCloseTo(0.5, 1)
    expect(hump.ride.kink).toBeCloseTo(1, 1)
  })

  it('the trolley parked on the deck dips it in proportion to its weights', () => {
    const bridge = CROSSINGS['plank-gap']
    const dip = (weights: number) => {
      const parked = park(gap, bridge, 12, trolleyTrain(weights)[0].weight)!
      return parked.step.moved[2 * parked.frame.at.get('12,6')! + 1] - park(gap, bridge, 12, 0)!.step.moved[2 * parked.frame.at.get('12,6')! + 1]
    }
    expect(dip(1)).toBeLessThan(0)
    expect(dip(4) / dip(1)).toBeCloseTo(4, 2)
    expect(park(gap, bridge, 9, 1)).toBeNull()
    expect(park(gap, [part('plank', 10, 6, 14, 6)], 12, 6)!.ending).toMatchObject({ kind: 'gives', strain: 'bend' })
  })

  it('the trolley trundles to the lowest point of the deck as it lies under it', () => {
    // Set down near one end of a level plank, it rolls to the middle, where the dip under it is deepest.
    expect(lowPoint(gap, CROSSINGS['plank-gap'], 10.5, 3)).toBe(12)
    expect(lowPoint(gap, CROSSINGS['plank-gap'], 13.5, 3)).toBe(12)
    expect(lowPoint(gap, CROSSINGS['plank-gap'], 12, 3)).toBe(12)
    // Over a prop the deck is held up: it rolls into the span beside the prop and not across it.
    const at = site('rock-prop', 0), rest = lowPoint(at, CROSSINGS['rock-prop'], 11.5, 3)!
    expect(rest).toBeGreaterThan(8)
    expect(rest).toBeLessThan(12)
    expect(lowPoint(gap, CROSSINGS['plank-gap'], 9, 3)).toBeNull()
  })

  it('the trolley hung from a pin drags that one joint straight down', () => {
    const at = site('first-triangle', 0), king = CROSSINGS['first-triangle']
    const hung = hang(at, king, [12, 4], 3)!
    const node = hung.frame.at.get('12,4')!
    expect(hung.ending).toBeNull()
    expect(hung.step.moved[2 * node + 1]).toBeLessThan(hang(at, king, [12, 4], 1)!.step.moved[2 * node + 1])
    expect(Math.abs(hung.step.moved[2 * node])).toBeLessThan(1e-3)
    expect(hang(at, king, [3, 3], 3)).toBeNull()
  })

  it('is the same every time, and quick enough to run between two frames of a drag', () => {
    const at = site('truss-span', 0), bridge = CROSSINGS['truss-span'], train = trainOf(VEHICLES['caterpillar-bus'])
    const first = run(at, bridge, train)
    const started = performance.now()
    const second = run(at, bridge, train)
    const took = performance.now() - started
    expect(second.ride).toEqual(first.ride)
    expect(second.steps.map((s) => Array.from(s.use))).toEqual(first.steps.map((s) => Array.from(s.use)))
    // A generous bound for a shared machine; on a desk it is a few milliseconds.
    expect(took).toBeLessThan(400)
  })
})
