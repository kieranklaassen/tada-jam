// Proof for Sideways Rain Day. The characteristic moment is a creature relaxing
// because the child held the leaf on the WINDWARD side of it, where the same
// leaf held straight overhead leaves it soaked. The second proof is that a
// leaf shifted a beat ahead of each gust beats a leaf that only reads the
// day's steady slant. The shared suite (lab/kit/contract.test.ts) covers
// determinism, fuzz, affordances, and hygiene without any of this.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { DROP_VY, LEAF_MAX_X, LEAF_MAX_Y, LEAF_MIN_X, LEAF_MIN_Y, LEAF_HW, createSim, gustAt, idealX, shelterX } from './sim.ts'
import type { RainSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): Sim<RainSnapshot> {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

// First seed whose day satisfies the predicate. Days are a function of the
// seed, so a change to the generator moves the seed, not the claim.
function firstSeed(pick: (snap: RainSnapshot) => boolean, hooks: readonly string[] = meta.hooks): number {
  for (let seed = 1; seed <= 800; seed++) if (pick(start({ seed, hooks }).snapshot())) return seed
  throw new Error('no seed in 1..800 matched')
}

// The leaf can be put where creature `i` is sheltered for the whole gust swing.
function reachable(snap: RainSnapshot, i: number): boolean {
  const c = snap.creatures[i]!
  const calm = idealX(snap.day.s0, c, snap.leaf.y)
  const gusty = idealX(snap.day.s0 + snap.day.dir * snap.day.amp, c, snap.leaf.y)
  return Math.min(calm, gusty) >= LEAF_MIN_X + 10 && Math.max(calm, gusty) <= LEAF_MAX_X - 10
}

type Stance = 'ahead' | 'steady' | 'overhead'

// Where the leaf should be, this tick, for creature `i`.
function aimX(snap: RainSnapshot, i: number, stance: Stance): number {
  const c = snap.creatures[i]!
  if (stance === 'overhead') return c.x
  if (stance === 'steady') return idealX(snap.day.s0, c, snap.leaf.y)
  return shelterX(snap.day, c, snap.leaf.y, snap.tick + 1)
}

// One finger holds the leaf on creature `i` for `ticks`, collecting the
// events. Stops early when `until` says so.
function holdLeaf(sim: Sim<RainSnapshot>, i: number, stance: Stance, ticks: number, until?: (s: RainSnapshot) => boolean) {
  const names: string[] = []
  let snap = sim.snapshot()
  sim.pointer({ id: 1, phase: 'down', x: snap.leaf.x, y: snap.leaf.y })
  for (let t = 0; t < ticks; t++) {
    snap = sim.snapshot()
    if (until?.(snap)) break
    sim.pointer({ id: 1, phase: 'move', x: aimX(snap, i, stance), y: snap.leaf.y })
    sim.step()
    for (const e of sim.observe().events) names.push(`${e.kind}:${e.name}`)
  }
  snap = sim.snapshot()
  sim.pointer({ id: 1, phase: 'up', x: snap.leaf.x, y: snap.leaf.y })
  return names
}

const HARD = (snap: RainSnapshot) => Math.abs(snap.day.s0) >= 1 && snap.creatures[0]!.r <= 58 && reachable(snap, 0)

describe('the characteristic moment: windward beats overhead', () => {
  it('a leaf held on the windward side relaxes a creature that a leaf held overhead leaves soaked', () => {
    const seed = firstSeed(HARD)
    const windward = start({ seed })
    const overhead = start({ seed })
    const events = holdLeaf(windward, 0, 'ahead', 240)
    const overEvents = holdLeaf(overhead, 0, 'overhead', 240)
    const w = windward.snapshot().creatures[0]!
    const o = overhead.snapshot().creatures[0]!
    expect(w.relaxed).toBe(true)
    expect(events).toContain('state:relax')
    expect(w.comfort).toBeGreaterThan(0.9)
    expect(overEvents).not.toContain('state:relax')
    expect(o.relaxed).toBe(false)
    expect(o.comfort).toBeLessThan(0.3)
    expect(w.hits).toBeLessThan(o.hits / 3)
  })

  it('shifting a beat ahead of each gust takes fewer drops than holding the steady slant', () => {
    const seed = firstSeed(
      (snap) => snap.day.amp >= 0.8 && snap.day.period <= 102 && Math.abs(snap.day.s0) >= 0.5 && reachable(snap, 0) && snap.creatures[0]!.r <= 58,
    )
    const ahead = start({ seed })
    const steady = start({ seed })
    holdLeaf(ahead, 0, 'ahead', 400)
    holdLeaf(steady, 0, 'steady', 400)
    expect(ahead.snapshot().creatures[0]!.hits).toBeLessThan(steady.snapshot().creatures[0]!.hits * 0.7)
  })

  it('the leaf posture shows in the signature: sheltered, overhead, near, away', () => {
    const seed = firstSeed(HARD)
    const posture = (stance: Stance | 'away') => {
      const sim = start({ seed })
      if (stance === 'away') {
        // Park the leaf far from every creature, high up in the sky.
        const c = sim.snapshot().creatures[0]!
        const far = c.x < FIELD_W / 2 ? LEAF_MAX_X : LEAF_MIN_X
        sim.pointer({ id: 1, phase: 'down', x: sim.snapshot().leaf.x, y: sim.snapshot().leaf.y })
        for (let i = 0; i < 40; i++) {
          sim.pointer({ id: 1, phase: 'move', x: far, y: LEAF_MIN_Y })
          sim.step()
        }
        return sim.observe().signature.split('/')[1]
      }
      holdLeaf(sim, 0, stance, 60)
      return sim.observe().signature.split('/')[1]
    }
    expect(posture('steady')).toBe('sheltered')
    expect(posture('overhead')).toBe('overhead')
    // Nearest creature is not the one the leaf is sheltering, and not overhead.
    const sim = start({ seed })
    const c1 = sim.snapshot().creatures[1]!
    const c0 = sim.snapshot().creatures[0]!
    expect(c1.x).not.toBe(c0.x)
    expect(['away', 'near']).toContain(posture('away'))
  })
})

describe('the day', () => {
  it('slant, rhythm, rain, and visitors change with the seed', () => {
    const days = Array.from({ length: 40 }, (_, i) => start({ seed: i + 1 }).snapshot())
    expect(new Set(days.map((d) => d.day.slantClass)).size).toBe(5)
    expect(new Set(days.map((d) => d.day.period)).size).toBeGreaterThanOrEqual(3)
    expect(new Set(days.map((d) => d.day.rain)).size).toBe(3)
    expect(new Set(days.map((d) => d.creatures.map((c) => c.kind).join())).size).toBeGreaterThan(10)
    for (const d of days) {
      expect(d.creatures.length).toBeGreaterThanOrEqual(3)
      for (const c of d.creatures) {
        expect(c.x - c.r).toBeGreaterThan(0)
        expect(c.x + c.r).toBeLessThan(FIELD_W)
      }
    }
  })

  it('the streaks lean the way the day leans', () => {
    for (const cls of ['hard-left', 'left', 'right', 'hard-right'] as const) {
      const seed = firstSeed((s) => s.day.slantClass === cls)
      const sim = start({ seed })
      run(sim, 20)
      const snap = sim.snapshot()
      expect(snap.drops.length).toBeGreaterThan(50)
      const lean = snap.drops.reduce((sum, d) => sum + d[2] / DROP_VY, 0) / snap.drops.length
      expect(Math.sign(lean)).toBe(Math.sign(snap.day.s0))
      expect(Math.abs(lean)).toBeGreaterThan(0.4)
    }
  })

  it('a gust shows in the sky well before it reaches the leaf', () => {
    const seed = firstSeed((s) => s.day.amp >= 0.8 && Math.abs(s.day.s0) >= 0.5)
    const sim = start({ seed })
    let snap = sim.snapshot()
    for (let i = 0; i < 600 && snap.gust < 0.9; i++) {
      sim.step()
      snap = sim.snapshot()
    }
    expect(snap.gust).toBeGreaterThanOrEqual(0.9)
    const slope = (d: [number, number, number]) => d[2] / DROP_VY
    const top = snap.drops.filter((d) => d[1] < 60).map(slope)
    const belowLeaf = snap.drops.filter((d) => d[1] > snap.leaf.y + 60 && d[0] > -50 && d[0] < FIELD_W + 50).map(slope)
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    // The sky leans further than the streaks lower down, by most of the gust.
    expect((mean(top) - mean(belowLeaf)) * snap.day.dir).toBeGreaterThan(0.5 * snap.day.amp)
    // And the leaf is well over half a second of fall away from that sky.
    expect((snap.leaf.y + 12) / DROP_VY / 30).toBeGreaterThan(0.6)
  })

  it('gustAt is a periodic bump that is zero outside its beat', () => {
    const snap = start({ seed: 3 }).snapshot()
    const { gustStart, period } = snap.day
    expect(gustAt(snap.day, gustStart - 1)).toBe(0)
    expect(gustAt(snap.day, gustStart + 15)).toBeGreaterThan(0.95)
    expect(gustAt(snap.day, gustStart + 15 + 3 * period)).toBeCloseTo(gustAt(snap.day, gustStart + 15), 9)
    expect(gustAt(snap.day, gustStart + 45)).toBe(0)
  })
})

describe('the leaf', () => {
  it('follows a held finger, clamped to its range, even far outside the field', () => {
    const sim = start()
    const leaf = sim.snapshot().leaf
    sim.pointer({ id: 1, phase: 'down', x: leaf.x, y: leaf.y })
    sim.pointer({ id: 1, phase: 'move', x: 1e9, y: -1e9 })
    run(sim, 120)
    const after = sim.snapshot().leaf
    expect(after.x).toBe(LEAF_MAX_X)
    expect(after.y).toBe(LEAF_MIN_Y)
    sim.pointer({ id: 1, phase: 'move', x: -1e9, y: 1e9 })
    run(sim, 120)
    expect(sim.snapshot().leaf.x).toBe(LEAF_MIN_X)
    expect(sim.snapshot().leaf.y).toBe(LEAF_MAX_Y)
  })

  it('a tap on a creature sends the leaf over it at the leaf s own height', () => {
    const sim = start()
    const before = sim.snapshot()
    const c = before.creatures[before.creatures.length - 1]!
    sim.pointer({ id: 1, phase: 'down', x: c.x, y: c.y })
    sim.step()
    sim.pointer({ id: 1, phase: 'up', x: c.x, y: c.y })
    run(sim, 60)
    const after = sim.snapshot().leaf
    expect(Math.abs(after.x - c.x)).toBeLessThan(40)
    expect(after.y).toBe(before.leaf.y)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'send' })
  })

  it('a gust blows a leaf nobody holds downwind, and a held leaf stays put', () => {
    const seed = firstSeed((s) => s.day.amp >= 0.8 && s.day.period <= 102)
    const drift = (held: boolean) => {
      const sim = start({ seed })
      const leaf = sim.snapshot().leaf
      sim.pointer({ id: 1, phase: 'down', x: leaf.x, y: leaf.y })
      if (!held) sim.pointer({ id: 1, phase: 'up', x: leaf.x, y: leaf.y })
      run(sim, 4 * sim.snapshot().day.period)
      return { moved: sim.snapshot().leaf.x - leaf.x, dir: sim.snapshot().day.dir }
    }
    const free = drift(false)
    expect(free.moved * free.dir).toBeGreaterThan(20)
    expect(Math.abs(drift(true).moved)).toBeLessThan(1)
  })

  it('one finger drives it: another finger is ignored, a lost finger is replaced', () => {
    const sim = start()
    const leaf = sim.snapshot().leaf
    sim.pointer({ id: 1, phase: 'down', x: leaf.x, y: leaf.y })
    sim.pointer({ id: 2, phase: 'move', x: 100, y: 300 })
    run(sim, 30)
    expect(Math.abs(sim.snapshot().leaf.x - leaf.x)).toBeLessThan(1)
    // A new finger lands while the old one never lifts: the newest one wins.
    sim.pointer({ id: 2, phase: 'down', x: 100, y: 300 })
    run(sim, 60)
    expect(Math.abs(sim.snapshot().leaf.x - 100)).toBeLessThan(2)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 300; i++) {
      sim.pointer({ id: 1, phase: 'down', x: 500, y: 440 })
      sim.pointer({ id: 1, phase: 'up', x: 500, y: 440 })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('affordances', () => {
  it('name the leaf and every creature as top-left rectangles a small finger can hit', () => {
    const sim = start()
    const snap = sim.snapshot()
    const list = sim.affordances()
    expect(list.length).toBe(1 + snap.creatures.length)
    for (const c of snap.creatures) {
      const match = list.find((a) => Math.abs(a.x + a.w / 2 - c.x) < 1e-9 && Math.abs(a.y + a.h / 2 - c.y) < 1e-9)
      expect(match, `an affordance centred on the ${c.kind} at ${c.x}`).toBeDefined()
      expect(match!.w).toBeGreaterThanOrEqual(60)
      expect(match!.h).toBeGreaterThanOrEqual(60)
      expect(match!.kind).toBe('tap')
    }
    const leaf = list.find((a) => a.kind === 'drag')!
    expect(leaf.h).toBeGreaterThanOrEqual(60)
    expect(leaf.x + leaf.w / 2).toBeCloseTo(snap.leaf.x, 6)
    expect(leaf.w).toBeGreaterThanOrEqual(2 * LEAF_HW - 1)
  })

  it('stay inside the field with the leaf pushed to every edge', () => {
    const sim = start()
    const leaf = sim.snapshot().leaf
    sim.pointer({ id: 1, phase: 'down', x: leaf.x, y: leaf.y })
    for (const [x, y] of [[-1e6, -1e6], [1e6, -1e6], [1e6, 1e6], [-1e6, 1e6]] as const) {
      sim.pointer({ id: 1, phase: 'move', x, y })
      run(sim, 80)
      for (const a of sim.affordances()) {
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
        expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
      }
    }
  })
})

describe('the seed and the script', () => {
  const script = (sim: Sim<RainSnapshot>) => {
    holdLeaf(sim, 0, 'steady', 90)
    run(sim, 30)
  }

  it('the same seed and script give the same signature and snapshot', () => {
    const a = start({ seed: 7 })
    const b = start({ seed: 7 })
    script(a)
    script(b)
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('different seeds give at least two distinct signatures after the same script', () => {
    const signatures = new Set<string>()
    for (const cls of ['hard-left', 'straight', 'hard-right'] as const) {
      const sim = start({ seed: firstSeed((s) => s.day.slantClass === cls) })
      script(sim)
      signatures.add(sim.observe().signature)
    }
    expect(signatures.size).toBeGreaterThanOrEqual(2)
  })

  it('every signature is slant / posture / mood', () => {
    const sim = start({ seed: 5 })
    script(sim)
    expect(sim.observe().signature).toMatch(/^(hard-left|left|straight|right|hard-right)\/(sheltered|overhead|near|away)\/(none|some|all)$/)
  })
})

// Shelters each creature in turn until it relaxes, keeping the leaf on the
// windward side of it.
function calmEveryone(sim: Sim<RainSnapshot>): string[] {
  const names: string[] = []
  const count = sim.snapshot().creatures.length
  for (let i = 0; i < count; i++) {
    names.push(...holdLeaf(sim, i, 'ahead', 320, (s) => s.creatures[i]!.relaxed))
  }
  names.push(...holdLeaf(sim, count - 1, 'ahead', 30))
  return names
}

describe('the rainbow hook', () => {
  // A drizzle day is gentle enough that a relaxed creature stays relaxed
  // while the leaf goes to the next one.
  const found = (() => {
    for (let seed = 1; seed <= 300; seed++) {
      const sim = start({ seed })
      if (sim.snapshot().day.rain !== 'drizzle') continue
      const names = calmEveryone(sim)
      if (names.includes('hook:rainbow')) return { seed, names }
    }
    return null
  })()

  it('fires when every creature is relaxed at once, and the sun thins the rain', () => {
    expect(found, 'a drizzle day where sheltering each creature in turn lights the rainbow').not.toBeNull()
    const sim = start({ seed: found!.seed })
    const rate: number[] = []
    let sawSun = false
    for (let i = 0; i < 4; i++) {
      calmEveryone(sim)
      const s = sim.snapshot()
      sawSun = sawSun || s.sun > 0
      rate.push(s.rainbows ?? -1)
    }
    expect(sawSun).toBe(true)
    expect(rate[0]).toBeGreaterThanOrEqual(1)
  })

  it('an empty hooks list gives no hook events, no counter, and no thinner rain', () => {
    expect(found).not.toBeNull()
    const off = start({ seed: found!.seed, hooks: [] })
    const names = calmEveryone(off)
    expect(names.some((n) => n.startsWith('hook:'))).toBe(false)
    expect(off.snapshot().rainbows).toBeNull()
    expect(off.snapshot().sun).toBe(0)
    expect(off.observe().features.rainbows).toBe(0)
    const on = start({ seed: found!.seed })
    calmEveryone(on)
    expect(on.snapshot().rainbows).toBeGreaterThanOrEqual(1)
  })
})

describe('hints', () => {
  it('show a ghost over the dampest creature after a quiet spell, only when hints are on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 40)
    run(off, 200)
    expect(on.snapshot().hint).toBeNull()
    run(on, 160)
    const hint = on.snapshot().hint!
    expect(hint).not.toBeNull()
    const damp = on.snapshot().creatures[hint.creature]!
    expect(hint.x).toBe(damp.x)
    expect(off.snapshot().hint).toBeNull()
  })

  it('go away when the child touches, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 200)
    run(off, 200)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    off.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    expect(JSON.stringify({ ...on.snapshot(), hint: null })).toBe(JSON.stringify({ ...off.snapshot(), hint: null }))
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    expect(meta.signatureBound).toBe(5 * 4 * 3)
  })

  it('observes every declared feature, finite', () => {
    const obs = start().observe()
    for (const f of meta.features) expect(Number.isFinite(obs.features[f.name])).toBe(true)
    expect(Object.keys(obs.features).sort()).toEqual(meta.features.map((f) => f.name).sort())
  })
})
