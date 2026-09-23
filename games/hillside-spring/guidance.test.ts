import { describe, expect, it } from 'vitest'
import { wantedSpot, type CreatureKind } from './creatures'
import { solveFlow } from './flow'
import { chooseHint, DEMO_SECONDS, FIRST_LEAN_DELAY, handPose, HintClock, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, LEAN_EVERY, LEAN_SECONDS, MAX_DEMOS, nearestWater, reachPose, type HandPose, type ReachPose } from './guidance'
import { cellIndex, PLOTS } from './layout'
import { defaultGarden, type GardenState } from './state'

const hintFor = (garden: GardenState) => chooseHint(garden, solveFlow(garden.pieces))

describe('chooseHint', () => {
  it('for the youngest, shows a tap on the bend that would turn the water toward a thirsty plot', () => {
    expect(hintFor(defaultGarden(6))).toEqual({ kind: 'turn', c: 3, r: 1 })
  })

  it('on an empty hillside, shows a piece carried to where the water runs', () => {
    const hint = hintFor(defaultGarden(9))
    expect(hint?.kind).toBe('place')
    if (hint?.kind === 'place') expect({ c: hint.c, r: hint.r }).toEqual({ c: 3, r: 0 })
  })

  it('once every plot drinks, suggests the waterwheel, then a harvest', () => {
    const garden = defaultGarden(9)
    garden.pieces = [{ kind: 'split', c: 3, r: 0, turn: 0, open: true }]
    garden.growth = PLOTS.map(() => 1)
    expect(hintFor(garden)?.kind).toBe('place')
    garden.pieces.push({ kind: 'wheel', c: 0, r: 0, turn: 0, open: true })
    expect(hintFor(garden)).toEqual({ kind: 'harvest', plot: 0 })
  })

  it('offers a harvest only once every bed has bloomed, on a bed no visitor is sitting on', () => {
    const garden = defaultGarden(9)
    garden.pieces = [
      { kind: 'split', c: 3, r: 0, turn: 0, open: true },
      { kind: 'wheel', c: 4, r: 1, turn: 0, open: true },
    ]
    garden.growth = [1, 1, 1, 0.6]
    expect(hintFor(garden)).toBeNull()
    garden.growth = PLOTS.map(() => 1)
    const hint = hintFor(garden)
    if (hint?.kind !== 'harvest') throw new Error(`expected a harvest, got ${JSON.stringify(hint)}`)
    const flow = solveFlow(garden.pieces)
    const wheels = garden.pieces.filter((piece) => piece.kind === 'wheel').map((piece) => cellIndex(piece.c, piece.r))
    const bed = { c: PLOTS[hint.plot].c, r: PLOTS[hint.plot].r }
    for (const kind of ['frog', 'sparrow', 'tanuki'] satisfies CreatureKind[]) expect(wantedSpot(kind, flow, garden.growth, wheels)).not.toEqual(bed)
  })

  it('never shows a move that would take the water from a plot still growing, and picks it up again once it blooms', () => {
    const garden = defaultGarden(6)
    garden.pieces[0].turn = 3
    const flow = solveFlow(garden.pieces)
    const drinking = PLOTS.filter((plot) => flow.plotFlow[plot.id] > 0)
    expect(drinking).toHaveLength(1)
    garden.growth[drinking[0].id] = 0.3
    // Turning the bend would move the water off the growing plot; a split above it shares the water instead.
    expect(chooseHint(garden, flow)).toEqual({ kind: 'place', piece: 'split', c: 3, r: 0 })
    const shared = solveFlow([...garden.pieces, { kind: 'split', c: 3, r: 0, turn: 0, open: true }])
    expect(shared.plotFlow[drinking[0].id]).toBeGreaterThan(0)
    expect(shared.plotFlow.filter((f) => f > 0).length).toBe(2)
    garden.growth[drinking[0].id] = 1
    expect(chooseHint(garden, flow)).toEqual({ kind: 'turn', c: 3, r: 1 })
  })

  it('suggests opening a shut sluice when that would water a thirsty plot', () => {
    const garden = defaultGarden(9)
    garden.pieces = [
      { kind: 'bend', c: 3, r: 0, turn: 3, open: true },
      { kind: 'sluice', c: 2, r: 0, turn: 1, open: false },
    ]
    garden.growth = [1, 0, 1, 1]
    expect(hintFor(garden)).toEqual({ kind: 'turn', c: 2, r: 0 })
  })
})

describe('HintClock', () => {
  it('glows after a few idle seconds, then demonstrates, backing off and stopping', () => {
    const clock = new HintClock(0)
    expect(clock.state(IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    expect(clock.state(IDLE_BEFORE_DEMO - 0.1).demo).toBeNull()
    expect(clock.state(IDLE_BEFORE_DEMO + 0.1).demo).not.toBeNull()
    const starts = Array.from({ length: MAX_DEMOS }, (_, i) => clock.demoStart(i))
    const gaps = starts.slice(1).map((s, i) => s - starts[i] - DEMO_SECONDS)
    ;[10, 20, 40].forEach((gap, i) => expect(gaps[i]).toBeCloseTo(gap))
    expect(clock.state(starts[MAX_DEMOS - 1] + DEMO_SECONDS + 200).demo).toBeNull()
  })

  it('any touch clears everything at once', () => {
    const clock = new HintClock(0)
    expect(clock.state(6).demo).not.toBeNull()
    clock.touch(6)
    const after = clock.state(6.01)
    expect(after.demo).toBeNull()
    expect(after.glow).toBe(0)
    expect(after.lean).toBeNull()
  })

  it('has the thirsty plots reach from the first moments, and again with the glow whenever the child stops', () => {
    const clock = new HintClock(0)
    expect(clock.state(FIRST_LEAN_DELAY - 0.1).lean).toBeNull()
    expect(clock.state(FIRST_LEAN_DELAY + 0.5).lean).not.toBeNull()
    expect(clock.state(FIRST_LEAN_DELAY + LEAN_SECONDS + 0.5).lean).toBeNull()
    expect(clock.state(FIRST_LEAN_DELAY + LEAN_EVERY * 20 + 0.5).lean).not.toBeNull()
    clock.touch(300)
    expect(clock.state(300 + IDLE_BEFORE_GLOW - 0.1).lean).toBeNull()
    expect(clock.state(300 + IDLE_BEFORE_GLOW + 0.5).lean).not.toBeNull()
    expect(clock.state(300 + IDLE_BEFORE_GLOW + 0.5).glow).toBeGreaterThan(0)
  })
})

describe('nearestWater', () => {
  it('points each thirsty plot at the nearest running water, and reports how close it is', () => {
    const garden = defaultGarden(9)
    const reach = nearestWater(solveFlow(garden.pieces))
    const byKind = Object.fromEntries(PLOTS.map((plot) => [plot.kind, reach[plot.id]]))
    // Untouched, the spring runs straight down its own column (3).
    expect(byKind.sunflower).toMatchObject({ dir: -1, cells: 1 })
    expect(byKind.cosmos).toMatchObject({ dir: 1, cells: 1 })
    expect(byKind.rice).toMatchObject({ dir: 1, cells: 2 })
    expect(byKind.pumpkin).toMatchObject({ dir: -1, cells: 2 })
  })

  it('comes closer as the child routes water toward a plot, and is right beside it once it drinks', () => {
    const rice = PLOTS.find((plot) => plot.kind === 'rice')!
    const before = nearestWater(solveFlow([]))[rice.id]
    const toward = nearestWater(solveFlow([{ kind: 'bend', c: 3, r: 0, turn: 3, open: true }]))[rice.id]
    expect(toward.cells).toBeLessThan(before.cells)
    const watered = solveFlow([
      { kind: 'split', c: 3, r: 0, turn: 0, open: true },
      { kind: 'split', c: 4, r: 0, turn: 2, open: true },
      { kind: 'wheel', c: 4, r: 1, turn: 0, open: true },
      { kind: 'split', c: 2, r: 2, turn: 3, open: true },
    ])
    expect(watered.plotFlow.every((flow) => flow > 0)).toBe(true)
    // A plot drinks from a pour in the next cell over.
    expect(nearestWater(watered).every((r) => r.cells <= 1)).toBe(true)
  })
})

describe('handPose', () => {
  it('carries from the rack to the cell and fades at both ends', () => {
    const out: HandPose = { at: { x: 0, y: 0 }, press: 0, opacity: 0 }
    handPose({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, out)
    expect(out.opacity).toBe(0)
    handPose({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.8, out)
    expect(out.at.x).toBeCloseTo(100)
    expect(out.press).toBeGreaterThan(0)
    handPose({ x: 5, y: 5 }, null, 0.28, out)
    expect(out.at).toEqual({ x: 5, y: 5 })
    expect(out.press).toBeGreaterThan(0.9)
  })
})

describe('reachPose', () => {
  const pose: ReachPose = { stand: 0, ask: 0, point: 0 }
  const at = (progress: number) => ({ ...reachPose(progress, pose) })

  it('asks the child first, then points at the water, as two separate beats', () => {
    expect(at(0.32).ask).toBeGreaterThan(0.99)
    expect(at(0.32).point).toBe(0)
    expect(at(0.74).point).toBeGreaterThan(0.99)
    expect(at(0.74).ask).toBe(0)
    for (let p = 0; p <= 1; p += 0.01) {
      const { ask, point } = at(p)
      expect(Math.min(ask, point)).toBe(0)
    }
  })

  it('starts and ends drooped, and never asks or points without standing up', () => {
    expect(at(0)).toEqual({ stand: 0, ask: 0, point: 0 })
    expect(at(1)).toEqual({ stand: 0, ask: 0, point: 0 })
    for (let p = 0; p <= 1; p += 0.01) {
      const { stand, ask, point } = at(p)
      expect(stand + 1e-9).toBeGreaterThanOrEqual(Math.max(ask, point))
    }
  })
})
