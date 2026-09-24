// Proof for Pass the Glow. The characteristic moment is the glow handoff: the
// finger steers the glowing It into a runner, the glow and the control jump into
// that runner's body, and the old It scampers away the way IT always does (the
// hare bolts, the tortoise freezes, the magpie runs to whoever tagged it, the
// mouse dashes for a burrow). Everything else here is the habit each body has,
// and the choice of whose body to be next.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { KINDS, createSim } from './sim.ts'
import type { Kind, PassSnapshot } from './sim.ts'

type S = Sim<PassSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const indexOf = (s: PassSnapshot, kind: Kind) => s.critters.findIndex((c) => c.kind === kind)
const itKind = (sim: S): Kind => {
  const s = sim.snapshot()
  return s.critters[s.it]!.kind
}
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

// The first seed whose opening layout satisfies `wanted`.
function seedWhere(wanted: (s: PassSnapshot) => boolean): number {
  for (let seed = 1; seed < 200; seed++) if (wanted(start({ seed }).snapshot())) return seed
  throw new Error('no seed matches')
}

// Holds a finger on a creature and follows it every tick until the glow moves.
// Returns the ticks used, or -1 if the glow never moved.
function chase(sim: S, pick: (s: PassSnapshot) => number, max = 900, sink?: SimEvent[]): number {
  const before = sim.snapshot().tags
  const first = sim.snapshot()
  const t0 = first.critters[pick(first)]!
  sim.pointer({ id: 1, phase: 'down', x: t0.x, y: t0.y })
  let used = -1
  for (let i = 0; i < max && used < 0; i++) {
    const s = sim.snapshot()
    const t = s.critters[pick(s)]!
    sim.pointer({ id: 1, phase: 'move', x: t.x, y: t.y })
    sim.step()
    if (sink) sink.push(...sim.observe().events)
    if (sim.snapshot().tags > before) used = i + 1
  }
  const end = sim.snapshot()
  sim.pointer({ id: 1, phase: 'up', x: end.critters[end.it]!.x, y: end.critters[end.it]!.y })
  return used
}

// Tries each kind in order (skipping the current It) until the glow moves.
// Returns the kind that became It (not always the one chased: whoever the
// glow touches first gets it), or null.
function passOnce(sim: S, order: readonly Kind[], sink?: SimEvent[]): Kind | null {
  for (const kind of order) {
    if (kind === itKind(sim)) continue
    if (chase(sim, (s) => indexOf(s, kind), 900, sink) >= 0) return itKind(sim)
  }
  return null
}

// The first seed where the first thing the glow touches, chasing `kind`, is
// that very kind, starting from a glow of `from`.
function seedForDirectPass(from: Kind, kind: Kind): number {
  for (let seed = 1; seed < 300; seed++) {
    const sim = start({ seed })
    if (itKind(sim) !== from) continue
    const target = indexOf(sim.snapshot(), kind)
    if (chase(sim, () => target, 1500) >= 0 && sim.snapshot().it === target) return seed
  }
  throw new Error(`no seed lets a ${from} tag a ${kind} first`)
}

// A child who always follows the nearest runner that can be tagged.
function naive(sim: S, ticks: number, sink?: SimEvent[]): void {
  sim.pointer({ id: 1, phase: 'down', x: FIELD_W / 2, y: FIELD_H / 2 })
  for (let t = 0; t < ticks; t++) {
    const s = sim.snapshot()
    const me = s.critters[s.it]!
    let best = -1
    let bestD = Infinity
    s.critters.forEach((c, i) => {
      if (i === s.it || c.safe || c.hidden || c.mode === 'shell') return
      if (dist(c, me) < bestD) {
        best = i
        bestD = dist(c, me)
      }
    })
    if (best >= 0) sim.pointer({ id: 1, phase: 'move', x: s.critters[best]!.x, y: s.critters[best]!.y })
    sim.step()
    if (sink) sink.push(...sim.observe().events)
  }
}

const CHEAP_FIRST: readonly Kind[] = ['tortoise', 'magpie', 'mouse', 'hare']

// Finger on the It itself, so it stops.
function stillFinger(sim: S): void {
  const s = sim.snapshot()
  const c = s.critters[s.it]!
  sim.pointer({ id: 1, phase: 'move', x: c.x, y: c.y })
}

// Finger far from the creature, on the other side of the It, so the It backs off.
function backOffFrom(sim: S, target: number): void {
  const s = sim.snapshot()
  const me = s.critters[s.it]!
  const other = s.critters[target]!
  sim.pointer({ id: 1, phase: 'move', x: me.x + (me.x - other.x) * 3, y: me.y + (me.y - other.y) * 3 })
}

// Steers the It at a creature until that creature leaves its `from` mode.
// 'rush' puts the finger on the creature; 'sneak' keeps it a hair ahead of the
// It, so the It creeps.
function approach(sim: S, target: number, style: 'rush' | 'sneak', from = 'graze', max = 1200): string {
  sim.pointer({ id: 1, phase: 'down', x: 590, y: 410 })
  for (let i = 0; i < max; i++) {
    const s = sim.snapshot()
    const t = s.critters[target]!
    const me = s.critters[s.it]!
    if (style === 'rush') sim.pointer({ id: 1, phase: 'move', x: t.x, y: t.y })
    else {
      const d = Math.max(1, dist(me, t))
      sim.pointer({ id: 1, phase: 'move', x: me.x + ((t.x - me.x) / d) * 10, y: me.y + ((t.y - me.y) / d) * 10 })
    }
    sim.step()
    const mode = sim.snapshot().critters[target]!.mode
    if (mode !== from) return mode
  }
  return 'none'
}

describe('the opening', () => {
  it('has four creatures, exactly one glowing It, and something to touch at tick 0', () => {
    const sim = start()
    const s = sim.snapshot()
    expect(s.critters.map((c) => c.kind).sort()).toEqual([...KINDS].sort())
    expect(s.critters.filter((c, i) => i === s.it && c.mode === 'it')).toHaveLength(1)
    expect(s.critters.filter((c) => c.mode === 'it')).toHaveLength(1)
    expect(sim.affordances().length).toBeGreaterThan(0)
  })

  it('different seeds lay the field out differently, the same seed the same', () => {
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).toBe(JSON.stringify(start({ seed: 1 }).snapshot()))
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).not.toBe(JSON.stringify(start({ seed: 2 }).snapshot()))
  })

  it('the glow can begin in any of the four bodies', () => {
    const kinds = new Set<Kind>()
    for (let seed = 1; seed <= 40; seed++) kinds.add(itKind(start({ seed })))
    expect(kinds.size).toBe(4)
  })

  it('the It stays where it is until a finger says otherwise', () => {
    const sim = start()
    const before = sim.snapshot().critters[sim.snapshot().it]!
    run(sim, 60)
    const after = sim.snapshot().critters[sim.snapshot().it]!
    expect([after.x, after.y]).toEqual([before.x, before.y])
  })
})

describe('the glow handoff (the characteristic moment)', () => {
  it('touching a runner moves the glow and the control into it', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'tortoise')
    const sim = start({ seed })
    const events: SimEvent[] = []
    const oldIt = sim.snapshot().it
    const became = passOnce(sim, CHEAP_FIRST, events)
    expect(became).not.toBeNull()
    const after = sim.snapshot()
    expect(after.critters[after.it]!.kind).toBe(became)
    expect(after.it).not.toBe(oldIt)
    expect(after.critters[after.it]!.mode).toBe('it')
    expect(after.critters.filter((c) => c.mode === 'it')).toHaveLength(1)
    expect(after.tags).toBe(1)
    expect(events).toContainEqual({ kind: 'state', name: 'pass' })
    expect(sim.observe().signature).toBe(`${became}/pass`)
  })

  it('the new It answers the finger in its own body, the old one no longer does', () => {
    const sim = start({ seed: seedWhere((s) => s.critters[s.it]!.kind !== 'tortoise') })
    passOnce(sim, CHEAP_FIRST)
    const s = sim.snapshot()
    const me = s.critters[s.it]!
    sim.pointer({ id: 2, phase: 'down', x: FIELD_W / 2, y: FIELD_H / 2 })
    run(sim, 30)
    const moved = sim.snapshot().critters[s.it]!
    expect(dist(moved, me)).toBeGreaterThan(20)
  })

  // The old It scampers by ITS habit. Start the glow in each body in turn.
  const scamper: Record<Kind, string[]> = { hare: ['bolt'], tortoise: ['shell'], magpie: ['home', 'flee'], mouse: ['dash'] }
  for (const kind of KINDS) {
    it(`the old It as a ${kind} scampers the way a ${kind} does, and cannot be tagged straight back`, () => {
      const seed = seedWhere((s) => s.critters[s.it]!.kind === kind)
      const sim = start({ seed })
      const old = sim.snapshot().it
      expect(passOnce(sim, CHEAP_FIRST)).not.toBeNull()
      const s = sim.snapshot()
      const c = s.critters[old]!
      expect(scamper[kind]).toContain(c.mode)
      expect(c.safe).toBe(true)
      // The finger sits on the old It for a while; it is not tagged back in that time.
      const tags = s.tags
      const sitting = sim.snapshot().critters[old]!
      sim.pointer({ id: 3, phase: 'down', x: sitting.x, y: sitting.y })
      run(sim, 10)
      expect(sim.snapshot().tags).toBe(tags)
    })
  }
})

describe('each body has its own habit', () => {
  it('the hare bolts away, doubles back toward where it started, then catches its breath', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'hare')
    const sim = start({ seed })
    const hare = indexOf(sim.snapshot(), 'hare')
    expect(approach(sim, hare, 'rush')).toBe('bolt')
    const origin = { x: sim.snapshot().critters[hare]!.x, y: sim.snapshot().critters[hare]!.y }
    const modes: string[] = []
    let farthest = 0
    let atEndOfBolt = 0
    let atEndOfDouble = 0
    for (let i = 0; i < 90 && sim.snapshot().critters[hare]!.mode !== 'graze'; i++) {
      backOffFrom(sim, hare)
      sim.step()
      const c = sim.snapshot().critters[hare]!
      if (modes[modes.length - 1] !== c.mode) {
        if (c.mode === 'double') atEndOfBolt = dist(c, origin)
        if (c.mode === 'breathe') atEndOfDouble = dist(c, origin)
        modes.push(c.mode)
      }
      farthest = Math.max(farthest, dist(c, origin))
    }
    expect(modes.slice(0, 4)).toEqual(['bolt', 'double', 'breathe', 'graze'])
    expect(atEndOfBolt).toBeGreaterThan(150)
    // It came back toward where it began (swinging wide of the chaser on one side).
    expect(atEndOfDouble).toBeLessThan(atEndOfBolt * 0.6)
    expect(farthest).toBeGreaterThanOrEqual(atEndOfBolt)
  })

  it('the tortoise freezes in its shell when rushed, and cannot be tagged while frozen', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'tortoise')
    const sim = start({ seed })
    const tortoise = indexOf(sim.snapshot(), 'tortoise')
    expect(approach(sim, tortoise, 'rush')).toBe('shell')
    const tags = sim.snapshot().tags
    // Finger stays on the frozen tortoise for its whole shell time.
    for (let i = 0; i < 40; i++) {
      const t = sim.snapshot().critters[tortoise]!
      sim.pointer({ id: 1, phase: 'move', x: t.x, y: t.y })
      sim.step()
      expect(sim.snapshot().critters[tortoise]!.mode).toBe('shell')
    }
    expect(sim.snapshot().tags).toBe(tags)
    expect(sim.snapshot().critters[tortoise]!.safe).toBe(false)
    // Then it plods out, and can be tagged.
    expect(chase(sim, (s) => indexOf(s, 'tortoise'), 600)).toBeGreaterThanOrEqual(0)
  })

  it('the tortoise does not freeze if the glow creeps up on it slowly', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'tortoise')
    const sim = start({ seed })
    const tortoise = indexOf(sim.snapshot(), 'tortoise')
    expect(approach(sim, tortoise, 'sneak')).toBe('plod')
  })

  it('the magpie with nobody who ever tagged it just flees away from the glow', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'magpie')
    const sim = start({ seed })
    const magpie = indexOf(sim.snapshot(), 'magpie')
    expect(approach(sim, magpie, 'rush')).toBe('flee')
    sim.step()
    const s = sim.snapshot()
    const m = s.critters[magpie]!
    const it = s.critters[s.it]!
    expect((m.x - it.x) * m.vx + (m.y - it.y) * m.vy).toBeGreaterThan(0)
    expect(m.tagger).toBe(-1)
  })

  it('the magpie runs toward whoever tagged it, whichever way the chaser is', () => {
    const seed = seedForDirectPass('tortoise', 'magpie')
    const sim = start({ seed })
    const tagger = sim.snapshot().it
    const magpie = indexOf(sim.snapshot(), 'magpie')
    // The tortoise tags the magpie: the magpie now remembers the tortoise.
    expect(chase(sim, () => magpie, 1500)).toBeGreaterThanOrEqual(0)
    expect(sim.snapshot().it).toBe(magpie)
    expect(sim.snapshot().critters[magpie]!.tagger).toBe(tagger)
    // As the magpie, tag somebody else (never the tortoise). The magpie scampers.
    const others = KINDS.filter((k) => k !== 'magpie' && k !== 'tortoise')
    expect(passOnce(sim, others)).not.toBeNull()
    const s = sim.snapshot()
    expect(s.it).not.toBe(tagger)
    const m = s.critters[magpie]!
    expect(m.mode).toBe('home')
    expect(m.tagger).toBe(tagger)
    // It heads for the tortoise, wherever the new glow is.
    const t = s.critters[tagger]!
    sim.step()
    const moving = sim.snapshot().critters[magpie]!
    expect((t.x - m.x) * moving.vx + (t.y - m.y) * moving.vy).toBeGreaterThan(0)
  })

  it('the magpie ends up right beside the body that tagged it, so wearing that body puts it in reach', () => {
    const seed = seedForDirectPass('tortoise', 'magpie')
    const sim = start({ seed })
    const tortoise = sim.snapshot().it
    const magpie = indexOf(sim.snapshot(), 'magpie')
    expect(chase(sim, () => magpie, 1500)).toBeGreaterThanOrEqual(0)
    // The magpie (now the glow) tags someone who is not the tortoise, then the
    // finger goes still and the magpie, no longer It, settles by the tortoise.
    expect(passOnce(sim, KINDS.filter((k) => k !== 'magpie' && k !== 'tortoise'))).not.toBeNull()
    stillFinger(sim)
    run(sim, 120)
    const s = sim.snapshot()
    expect([magpie, tortoise]).not.toContain(s.it)
    const m = s.critters[magpie]!
    expect(m.tagger).toBe(tortoise)
    expect(dist(m, s.critters[tortoise]!)).toBeLessThan(260)
  })

  it('the mouse dashes for a burrow, hides, and pops out of the OTHER burrow', () => {
    const seed = seedWhere((s) => s.critters[s.it]!.kind !== 'mouse')
    const sim = start({ seed })
    const mouse = indexOf(sim.snapshot(), 'mouse')
    expect(approach(sim, mouse, 'rush')).toBe('dash')
    const burrows = sim.snapshot().burrows
    const from = sim.snapshot().critters[mouse]!
    const near = dist(from, burrows[0]!) <= dist(from, burrows[1]!) ? 0 : 1
    let hidden = false
    let popped = false
    for (let i = 0; i < 200 && !popped; i++) {
      backOffFrom(sim, mouse)
      sim.step()
      const c = sim.snapshot().critters[mouse]!
      if (c.mode === 'hidden') {
        hidden = true
        expect(c.hidden).toBe(true)
      }
      if (c.mode === 'pop') {
        popped = true
        expect(dist(c, burrows[1 - near]!)).toBeLessThan(1)
      }
    }
    expect(hidden).toBe(true)
    expect(popped).toBe(true)
  })

  it('a runner fleeing into a wall is pinned there, and the signature says so', () => {
    let seen = false
    for (let seed = 1; seed <= 12 && !seen; seed++) {
      const sim = start({ seed })
      for (let chunk = 0; chunk < 30 && !seen; chunk++) {
        naive(sim, 100)
        seen = sim.observe().signature.endsWith('/pinned') || sim.observe().features.pinned > 0
      }
    }
    expect(seen).toBe(true)
  })
})

describe('the sweep hook', () => {
  // Wear every body once, in any order, cheapest catch first.
  function visitAll(sim: S, sink: SimEvent[], maxPasses = 40): boolean {
    const worn = new Set<Kind>([itKind(sim)])
    for (let n = 0; n < maxPasses; n++) {
      if (sink.some((e) => e.kind === 'hook')) return true
      const unworn = CHEAP_FIRST.filter((k) => !worn.has(k))
      const order = [...unworn, ...CHEAP_FIRST.filter((k) => worn.has(k))]
      const got = passOnce(sim, order, sink)
      if (got === null) return sink.some((e) => e.kind === 'hook')
      worn.add(got)
    }
    return sink.some((e) => e.kind === 'hook')
  }

  it('fires once everybody has had a turn as the glow, and the next It is golden', () => {
    const sim = start({ seed: seedWhere((s) => s.critters[s.it]!.kind === 'magpie') })
    const sink: SimEvent[] = []
    expect(visitAll(sim, sink)).toBe(true)
    expect(sink).toContainEqual({ kind: 'hook', name: 'sweep' })
    const s = sim.snapshot()
    expect(s.sweeps).toBe(1)
    expect(s.golden).toBe(true)
    expect(s.been!.filter(Boolean)).toHaveLength(1)
  })

  it('with no hooks there are no hook events, no sweep count, and no golden glow', () => {
    const sim = start({ seed: seedWhere((s) => s.critters[s.it]!.kind === 'magpie'), hooks: [] })
    const sink: SimEvent[] = []
    visitAll(sim, sink)
    for (let i = 0; i < 6; i++) passOnce(sim, CHEAP_FIRST, sink)
    expect(sink.some((e) => e.kind === 'hook')).toBe(false)
    const s = sim.snapshot()
    expect(s.sweeps).toBeNull()
    expect(s.been).toBeNull()
    expect(s.golden).toBe(false)
    expect(s.tags).toBeGreaterThan(3)
  })
})

describe('the observation', () => {
  it('names a discrete class made of the body being worn and what the world is doing', () => {
    const sim = start()
    const sig = sim.observe().signature
    expect(sig).toMatch(/^(hare|tortoise|magpie|mouse)\/(pass|shell|double|home|burrow|pinned|bolt|chase|calm)$/)
  })

  it('counts tags and bodies worn, and stays inside the declared bound', () => {
    const sim = start({ seed: seedWhere((s) => s.critters[s.it]!.kind === 'magpie') })
    expect(sim.observe().features.tags).toBe(0)
    expect(sim.observe().features.bodies).toBe(1)
    passOnce(sim, CHEAP_FIRST)
    passOnce(sim, CHEAP_FIRST)
    const obs = sim.observe()
    expect(obs.features.tags).toBe(2)
    expect(obs.features.bodies).toBeGreaterThanOrEqual(2)
    expect(meta.signatureBound).toBe(KINDS.length * 9)
  })

  it('the same seed and script give the same signature and snapshot', () => {
    const play = () => {
      const sim = start({ seed: 5 })
      passOnce(sim, CHEAP_FIRST)
      run(sim, 40)
      return { sig: sim.observe().signature, snap: JSON.stringify(sim.snapshot()) }
    }
    expect(play()).toEqual(play())
  })

  it('reports affordances as top-left rectangles that centre on the creatures', () => {
    const sim = start()
    const s = sim.snapshot()
    for (const c of s.critters) {
      const a = sim.affordances().find((x) => Math.abs(x.x + x.w / 2 - c.x) < 1e-6 && Math.abs(x.y + x.h / 2 - c.y) < 1e-6)
      expect(a, `an affordance on the ${c.kind}`).toBeDefined()
      expect(a!.w).toBeGreaterThanOrEqual(60)
    }
  })
})

describe('hints and bad input', () => {
  it('a hint points at a catchable runner after a quiet spell, only when hints are on, and never changes the outcome', () => {
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
    on.pointer({ id: 1, phase: 'down', x: 100, y: 100 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('ignores non-finite coordinates and a move or up that never had a down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'move', x: 500, y: 500 })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 40; i++) passOnce(sim, CHEAP_FIRST)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })

  it('never lets a creature leave the field, however long it runs', () => {
    const sim = start({ seed: 7 })
    sim.pointer({ id: 1, phase: 'down', x: 5, y: 5 })
    for (let i = 0; i < 3000; i++) {
      if (i % 40 === 0) sim.pointer({ id: 1, phase: 'move', x: (i * 37) % FIELD_W, y: (i * 91) % FIELD_H })
      sim.step()
      for (const c of sim.snapshot().critters) {
        expect(c.x).toBeGreaterThanOrEqual(c.r)
        expect(c.x).toBeLessThanOrEqual(FIELD_W - c.r)
        expect(c.y).toBeGreaterThanOrEqual(c.r)
        expect(c.y).toBeLessThanOrEqual(FIELD_H - c.r)
      }
    }
  })
})

describe('the meta', () => {
  it('declares its one hook, marks the aims worth pushing on, and observes every feature', () => {
    expect(meta.hooks).toEqual(['sweep'])
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['tags', 'bodies'])
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
