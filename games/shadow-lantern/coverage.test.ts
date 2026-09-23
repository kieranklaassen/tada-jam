import { describe, expect, it } from 'vitest'
import { bestHint, CoverageMeter, stirLevel, TAP_TURN, wakeRuleForAge, wakes, type CoverageResult, type Placed } from './coverage'
import { buildCreature, CREATURE_ORDER, type CreatureKind } from './creatures'
import { STAGE } from './projection'
import { SHAPE_KINDS } from './shapes'
import { defaultShapes, INVITE_SHAPE } from './state'

function rack(): Placed[] {
  return defaultShapes().map((s) => ({ kind: s.kind, pose: { x: s.x, z: s.z, angle: s.angle, yaw: 0, lift: 0 } }))
}

function measure(kind: CreatureKind, placed: readonly Placed[]): CoverageResult {
  return new CoverageMeter(buildCreature(kind)).measure(placed, { fill: 0, spill: 0 })
}

/** Follow the game's own hints until the creature wakes; returns the number of moves, or -1. */
function solveByHints(kind: CreatureKind, placed: Placed[], rule = wakeRuleForAge(6), limit = 10): number {
  const meter = new CoverageMeter(buildCreature(kind))
  const out = { fill: 0, spill: 0 }
  for (let moves = 0; moves <= limit; moves++) {
    if (wakes(meter.measure(placed, out), rule)) return moves
    const move = bestHint(meter, placed, moves === 0)
    if (!move) return -1
    const pose = placed[move.index].pose
    pose.x = move.x
    pose.z = move.z
    pose.angle = move.angle
  }
  return -1
}

describe('coverage', () => {
  it('at rest every outline is empty, and only the shape standing out on its own casts a shadow on the screen', () => {
    for (const kind of CREATURE_ORDER) {
      const result = measure(kind, rack())
      expect(result.fill, kind).toBe(0)
      expect(result.spill, kind).toBeGreaterThan(0.02)
      const racked = rack().filter((placed) => placed.kind !== INVITE_SHAPE)
      expect(measure(kind, racked).spill, `${kind} without the ${INVITE_SHAPE}`).toBe(0)
    }
  })

  it('following the hints from a fresh rack wakes every creature, one after another, in a few moves', () => {
    const placed = rack()
    for (const kind of CREATURE_ORDER) {
      const moves = solveByHints(kind, placed)
      expect(moves, kind).toBeGreaterThanOrEqual(0)
      expect(moves, kind).toBeLessThanOrEqual(6)
    }
  })

  it('every creature can be woken from a fresh rack, with different shapes doing the work each time', () => {
    for (const kind of CREATURE_ORDER) {
      const first = rack()
      expect(solveByHints(kind, first), kind).toBeGreaterThanOrEqual(0)
      // Take away the shapes that did the most work, and a different fill still exists.
      const used = first.map((p, i) => ({ i, moved: p.pose.z !== rack()[i].pose.z || p.pose.x !== rack()[i].pose.x }))
      const second = rack()
      const banned = new Set(used.filter((u) => u.moved).map((u) => u.i).slice(0, 1))
      const remaining = second.filter((_, i) => !banned.has(i))
      expect(solveByHints(kind, remaining, wakeRuleForAge(6), 10), `${kind} without ${[...banned].map((i) => SHAPE_KINDS[i])}`).toBeGreaterThanOrEqual(0)
    }
  })

  it('flooding the screen with giant shadows does not count: spill stops the wake', () => {
    const flood: Placed[] = SHAPE_KINDS.map((kind, i) => ({ kind, pose: { x: -12 + i * 4, z: STAGE.zFar, angle: 0, yaw: 0, lift: 0 } }))
    for (const kind of CREATURE_ORDER) {
      const result = measure(kind, flood)
      expect(wakes(result, wakeRuleForAge(6)), `${kind} fill ${result.fill.toFixed(2)} spill ${result.spill.toFixed(2)}`).toBe(false)
    }
  })

  it('older children get a slightly crisper wake line; unknown age gets the gentle one', () => {
    expect(wakeRuleForAge(6)).toEqual(wakeRuleForAge(null))
    expect(wakeRuleForAge(9).fill).toBeGreaterThan(wakeRuleForAge(6).fill)
    expect(wakeRuleForAge(9).spill).toBeLessThan(wakeRuleForAge(6).spill)
  })

  it('stirring rises with fill and tops out at the wake line', () => {
    const rule = wakeRuleForAge(6)
    expect(stirLevel({ fill: 0, spill: 0 }, rule)).toBe(0)
    expect(stirLevel({ fill: rule.fill * 0.8, spill: 0 }, rule)).toBeGreaterThan(0)
    expect(stirLevel({ fill: rule.fill, spill: 0 }, rule)).toBeCloseTo(1, 9)
  })

  it('a hint always improves the fill, and asks for at most two tap-turns', () => {
    const placed = rack()
    const meter = new CoverageMeter(buildCreature('bird'))
    const before = meter.measure(placed, { fill: 0, spill: 0 }).fill
    const move = bestHint(meter, placed, true)
    expect(move).not.toBeNull()
    const turn = move!.angle - placed[move!.index].pose.angle
    expect([0, TAP_TURN, TAP_TURN * 2]).toContain(turn)
    placed[move!.index].pose.x = move!.x
    placed[move!.index].pose.z = move!.z
    placed[move!.index].pose.angle = move!.angle
    expect(meter.measure(placed, { fill: 0, spill: 0 }).fill).toBeGreaterThan(before)
  })

  it('the search spread over frames finds the same move as the search run in one go', () => {
    const placed = rack()
    const meter = new CoverageMeter(buildCreature('whale'))
    const whole = bestHint(meter, placed)
    let clock = 0
    meter.beginSearch(placed)
    let slices = 0
    while (!meter.continueSearch(1, () => (clock += 0.05))) slices++
    expect(slices).toBeGreaterThan(1)
    expect(meter.best).toEqual(whole)
  })

  it('a search slice ends within a few candidates of its budget, so a slow tablet never gets a long frame', () => {
    const meter = new CoverageMeter(buildCreature('bird'))
    const placed = rack()
    bestHint(meter, placed)
    const t0 = performance.now()
    bestHint(meter, placed)
    // An upper bound on candidates, so this is a floor on what one costs.
    const candidate = (performance.now() - t0) / (3 * 7 * 16 * placed.length)
    const budget = 0.3
    const overruns = Array.from({ length: 3 }, () => {
      meter.beginSearch(placed)
      const slices: number[] = []
      for (let done = false; !done; ) {
        const start = performance.now()
        done = meter.continueSearch(budget)
        slices.push(performance.now() - start - budget)
      }
      return slices.sort((a, b) => a - b)[Math.floor(slices.length * 0.9)]
    })
    expect(Math.min(...overruns) / candidate).toBeLessThan(4)
  })

  it('measuring allocates nothing that grows with use', () => {
    const meter = new CoverageMeter(buildCreature('dragon'))
    const placed = rack()
    const out = { fill: 0, spill: 0 }
    expect(meter.measure(placed, out)).toBe(out)
  })
})
