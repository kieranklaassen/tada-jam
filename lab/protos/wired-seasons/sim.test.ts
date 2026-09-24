// Scripted play for Wired Seasons. The characteristic moment is the three-part
// answer of the tree: a snipped tip forks into two limbs after a season, a
// wired limb grows on in the way it was bent, and a limb starved of light
// drops away. The shared suite (lab/kit/contract.test.ts) covers the rest.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { createSim } from './sim.ts'
import type { SnapLimb, WiredSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): Sim<WiredSnapshot> {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

const run = (sim: Sim, ticks: number) => {
  for (let i = 0; i < ticks; i++) sim.step()
}
const limbsOf = (sim: Sim<WiredSnapshot>) => sim.snapshot().limbs
const byId = (sim: Sim<WiredSnapshot>, id: number): SnapLimb | undefined => limbsOf(sim).find((l) => l.id === id)
const kidsOf = (sim: Sim<WiredSnapshot>, id: number) => limbsOf(sim).filter((l) => l.parent === id)

function tap(sim: Sim, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

function drag(sim: Sim, from: { x: number; y: number }, to: { x: number; y: number }, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 8; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 8, y: from.y + ((to.y - from.y) * s) / 8 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

function season(sim: Sim<WiredSnapshot>): void {
  const b = sim.snapshot().button
  tap(sim, b.x + b.w / 2, b.y + b.h / 2)
  run(sim, 25) // let the new growth finish drawing itself
}

// The upright leader and the side shoot of the starting sapling.
function sapling(sim: Sim<WiredSnapshot>) {
  const tips = limbsOf(sim).filter((l) => l.tip)
  const leader = tips.reduce((a, b) => (b.y2 < a.y2 ? b : a))
  const side = tips.find((l) => l.id !== leader.id)!
  return { leader, side }
}

const wireTo = (sim: Sim<WiredSnapshot>, limb: SnapLimb, heading: number) => {
  const mid = { x: (limb.x1 + limb.x2) / 2, y: (limb.y1 + limb.y2) / 2 }
  drag(sim, mid, { x: limb.x1 + Math.cos(heading) * 300, y: limb.y1 + Math.sin(heading) * 300 })
}

describe('the sapling', () => {
  it('starts as a trunk with a leader and a side shoot, at year zero', () => {
    const sim = start()
    const snap = sim.snapshot()
    expect(snap.year).toBe(0)
    expect(snap.limbs).toHaveLength(3)
    expect(sim.observe().signature).toBe('sapling')
    expect(sim.affordances().length).toBeGreaterThan(0)
  })

  it('differs by seed and repeats for the same seed', () => {
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).toBe(JSON.stringify(start({ seed: 1 }).snapshot()))
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).not.toBe(JSON.stringify(start({ seed: 2 }).snapshot()))
  })
})

describe('a cut forks the growth', () => {
  it('a snipped tip sprouts two buds below the cut on the next season', () => {
    const sim = start()
    sim.observe()
    const { leader } = sapling(sim)
    tap(sim, leader.x2, leader.y2)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'snip' })
    expect(byId(sim, leader.id)!.cut).toBe(true)
    expect(kidsOf(sim, leader.id)).toHaveLength(0)

    season(sim)
    const kids = kidsOf(sim, leader.id)
    expect(kids).toHaveLength(2)
    expect(Math.abs(kids[0]!.heading - kids[1]!.heading)).toBeGreaterThan(0.6)
    expect(byId(sim, leader.id)!.cut).toBe(false)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'fork' })
  })

  it('an uncut tip just carries on with one new limb', () => {
    const sim = start()
    const { leader } = sapling(sim)
    season(sim)
    expect(kidsOf(sim, leader.id)).toHaveLength(1)
  })

  it('a cut close to the joint takes the whole limb off with no buds', () => {
    const sim = start()
    const { side } = sapling(sim)
    tap(sim, side.x1 + (side.x2 - side.x1) * 0.1, side.y1 + (side.y2 - side.y1) * 0.1)
    expect(byId(sim, side.id)).toBeUndefined()
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'clean-cut' })
  })
})

describe('a wire sets the heading', () => {
  it('a wired limb grows on the way it was bent, an unwired one curls toward the light', () => {
    const wired = start()
    const plain = start()
    const { side } = sapling(wired)
    wireTo(wired, side, 0) // due east
    const bent = byId(wired, side.id)!
    expect(bent.wired).toBe(true)
    expect(bent.heading).toBeCloseTo(0, 1)
    expect(wired.observe().events).toContainEqual({ kind: 'state', name: 'wire' })

    season(wired)
    season(plain)
    const kid = kidsOf(wired, side.id)[0]!
    expect(kid.wired).toBe(true)
    expect(kid.heading).toBeCloseTo(0, 1)
    const untouched = byId(plain, side.id)!
    const plainKid = kidsOf(plain, side.id)[0]!
    const up = -Math.PI / 2
    expect(Math.abs(plainKid.heading - up)).toBeLessThan(Math.abs(untouched.heading - up))
  })

  it('bending a limb carries everything grown on it', () => {
    const sim = start()
    const { leader } = sapling(sim)
    season(sim)
    const before = kidsOf(sim, leader.id)[0]!
    wireTo(sim, byId(sim, leader.id)!, -0.3)
    const after = kidsOf(sim, leader.id)[0]!
    expect(Math.abs(after.x1 - before.x1)).toBeGreaterThan(5)
    expect(after.parent).toBe(leader.id)
  })
})

describe('shade starves a limb', () => {
  it.each([1, 2, 3, 4, 5])('a limb wired under the leader dims, then drops (seed %i)', (seed) => {
    const sim = start({ seed })
    sim.observe()
    const { side } = sapling(sim)
    wireTo(sim, side, -Math.PI / 2) // straight up, beside the leader and below it
    expect(byId(sim, side.id)!.shaded).toBe(true)

    season(sim)
    expect(byId(sim, side.id)).toBeDefined()
    expect(byId(sim, side.id)!.dim).toBe(1)

    season(sim)
    expect(byId(sim, side.id)).toBeUndefined()
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'drop' })
    expect(obs.features.lost).toBeGreaterThanOrEqual(2)
    expect(limbsOf(sim).some((l) => l.parent === -1)).toBe(true)
  })

  it('a starving limb that is freed to the light in time is kept', () => {
    const sim = start()
    const { side } = sapling(sim)
    wireTo(sim, side, -Math.PI / 2)
    season(sim)
    expect(byId(sim, side.id)!.dim).toBe(1)
    wireTo(sim, byId(sim, side.id)!, -0.2) // out from under the leader
    season(sim)
    expect(byId(sim, side.id)).toBeDefined()
    expect(byId(sim, side.id)!.dim).toBe(0)
  })
})

describe('the whole loop', () => {
  it('cut, wire, and season together shape a tree that reads as a different outcome class', () => {
    const sim = start({ seed: 3 })
    expect(sim.observe().signature).toBe('sapling')
    const { leader, side } = sapling(sim)
    tap(sim, leader.x2, leader.y2)
    wireTo(sim, side, 0.15)
    for (let i = 0; i < 4; i++) season(sim)
    const obs = sim.observe()
    expect(obs.signature).not.toBe('sapling')
    expect(obs.features.season).toBe(4)
    expect(obs.features.limbs).toBeGreaterThan(6)
    expect(obs.events.filter((e) => e.kind === 'state').map((e) => e.name)).toEqual(
      expect.arrayContaining(['snip', 'wire', 'season', 'fork']),
    )
  })

  it('same seed and same script give the same outcome', () => {
    const play = () => {
      const sim = start({ seed: 9 })
      const { leader, side } = sapling(sim)
      tap(sim, leader.x2, leader.y2)
      wireTo(sim, side, 0.4)
      season(sim)
      season(sim)
      return { signature: sim.observe().signature, snapshot: JSON.stringify(sim.snapshot()) }
    }
    expect(play()).toEqual(play())
  })

  it('keeps a bounded event queue and a bounded tree when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 200; i++) season(sim)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.snapshot().limbs.length).toBeLessThanOrEqual(200)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })
})

describe('the picture hook', () => {
  it('is a target silhouette only when the hook is on, and an empty list removes it', () => {
    expect(start({ hooks: [] }).snapshot().picture).toBeNull()
    const on = start({ hooks: ['picture'] }).snapshot().picture
    expect(on).not.toBeNull()
    expect(on!.blobs.length).toBeGreaterThan(0)
    const sim = start({ hooks: [] })
    for (let i = 0; i < 6; i++) season(sim)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })
})

// A deliberate umbrella: season once, top the leader, take the side shoot off
// clean, season again, lay the two forks flat, and let it grow.
function growUmbrella(sim: Sim<WiredSnapshot>): void {
  const { leader, side } = sapling(sim)
  season(sim)
  const topTip = limbsOf(sim).filter((l) => l.tip).reduce((a, b) => (b.y2 < a.y2 ? b : a))
  tap(sim, topTip.x2, topTip.y2)
  const s = byId(sim, side.id)!
  tap(sim, s.x1 + (s.x2 - s.x1) * 0.1, s.y1 + (s.y2 - s.y1) * 0.1)
  season(sim)
  const [left, right] = kidsOf(sim, topTip.id).sort((a, b) => a.heading - b.heading)
  wireTo(sim, left!, Math.PI + 0.05)
  wireTo(sim, right!, -0.05)
  for (let i = 0; i < 4; i++) season(sim)
  void leader
}

function seedWithFirstPicture(name: string): number {
  for (let seed = 1; seed < 200; seed++) {
    if (start({ seed, hooks: ['picture'] }).snapshot().picture!.name === name) return seed
  }
  throw new Error(`no seed starts with ${name}`)
}

describe('the picture hook fires', () => {
  it('a season that leaves the tree filling the silhouette fires the hook and offers the next picture', () => {
    const seed = seedWithFirstPicture('umbrella')
    const sim = start({ seed, hooks: ['picture'] })
    expect(sim.snapshot().picture!.matches).toBe(0)
    sim.observe()
    growUmbrella(sim)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'picture' })
    expect(sim.snapshot().picture!.matches).toBeGreaterThanOrEqual(1)
    expect(sim.snapshot().picture!.name).not.toBe('umbrella')
    expect(obs.signature.endsWith('+matched')).toBe(true)
  })

  it('an idle tree does not fill an umbrella', () => {
    const sim = start({ seed: seedWithFirstPicture('umbrella'), hooks: ['picture'] })
    for (let i = 0; i < 8; i++) season(sim)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('removing the hook leaves the tree, the affordances, and its growth exactly as they were', () => {
    const seed = seedWithFirstPicture('umbrella')
    const withHook = start({ seed, hooks: ['picture'] })
    const without = start({ seed, hooks: [] })
    growUmbrella(withHook)
    growUmbrella(without)
    expect(JSON.stringify(without.snapshot().limbs)).toBe(JSON.stringify(withHook.snapshot().limbs))
    expect(without.affordances()).toEqual(withHook.affordances())
    const obs = without.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(obs.signature.endsWith('+matched')).toBe(false)
  })

  it('a wired windswept lean fills the windswept picture (the other silhouettes are reachable too)', () => {
    const name = 'windswept-right'
    const sim = start({ seed: seedWithFirstPicture(name), hooks: ['picture'] })
    sim.observe()
    const tips = limbsOf(sim).filter((l) => l.tip).sort((a, b) => a.y2 - b.y2)
    wireTo(sim, tips[0]!, -0.4)
    wireTo(sim, tips[1]!, -0.05)
    for (let i = 0; i < 4; i++) season(sim)
    expect(sim.observe().events).toContainEqual({ kind: 'hook', name: 'picture' })
  })
})

describe('hints', () => {
  it('point somewhere after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })
})

describe('the meta', () => {
  it('names exactly one objective feature, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
