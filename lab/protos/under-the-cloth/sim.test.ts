// The characteristic moment of Under the Cloth: the child holds the hand
// magnet near something hidden, sees the beads RING away, flips the pole, and
// sees them CLUMP and the hand snap on. Flipping again shoves the hand off a
// magnet but not off an iron plate. The tests below script that play through
// createSim only; the hidden layout is read from the snapshot (which the view
// never draws before the lift) so the script can aim.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CLOTH, LIFT_BTN, POLE_BTN, TOKEN_SLOTS, createSim } from './sim.ts'
import type { ClothSnapshot } from './sim.ts'

type S = Sim<ClothSnapshot>
type Item = ClothSnapshot['items'][number]

function start(o: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: o.seed ?? 3, hooks: o.hooks ?? meta.hooks, hints: o.hints ?? true })
}
function run(sim: S, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}
const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
function tapAt(sim: S, x: number, y: number, id = 9): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}
function flip(sim: S): void {
  const c = centre(POLE_BTN)
  tapAt(sim, c.x, c.y, 8)
}
function drag(sim: S, from: { x: number; y: number }, to: { x: number; y: number }, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 6, y: from.y + ((to.y - from.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}
function nearBeads(snap: ClothSnapshot, p: { x: number; y: number }, r: number): number {
  let n = 0
  for (let i = 0; i < snap.beads.length; i += 2) if (Math.hypot(snap.beads[i]! - p.x, snap.beads[i + 1]! - p.y) <= r) n++
  return n
}
function findSeed(pred: (snap: ClothSnapshot) => boolean): number {
  for (let seed = 1; seed <= 400; seed++) if (pred(start({ seed }).snapshot())) return seed
  throw new Error('no seed matches')
}
const isolated = (it: Item, snap: ClothSnapshot, gap = 300) =>
  snap.items.every((o) => o === it || Math.hypot(o.x - it.x, o.y - it.y) >= gap)
const readable = (it: Item, snap: ClothSnapshot, kind: 'magnet' | 'iron') =>
  (kind === 'iron' ? it.kind === 2 : it.kind !== 2) && isolated(it, snap) && nearBeads(snap, it, 60) >= 2
const hasEvent = (sim: S, name: string) => sim.observe().events.some((e) => e.kind === 'state' && e.name === name)

// Drops the matching token on every hidden thing (the script reads the answer).
function markAll(sim: S): void {
  for (const it of sim.snapshot().items) drag(sim, centre(TOKEN_SLOTS[it.kind]!), { x: it.x, y: it.y }, 2)
}
const lift = (sim: S) => tapAt(sim, centre(LIFT_BTN).x, centre(LIFT_BTN).y, 7)

describe('the characteristic moment', () => {
  it('a magnet rings the beads under one pole, clumps them under the other, and the hand snaps on', () => {
    const seed = findSeed((s) => s.items.some((it) => readable(it, s, 'magnet')))
    const sim = start({ seed })
    const s0 = sim.snapshot()
    const m = s0.items.find((it) => readable(it, s0, 'magnet'))!
    // The same pole repels: north hand on a north-up magnet (kind 0).
    const repelPole = m.kind === 0 ? 1 : -1
    if (s0.pole !== repelPole) flip(sim)
    sim.observe()
    const before = nearBeads(sim.snapshot(), m, 60)
    expect(before).toBeGreaterThanOrEqual(2)

    // A finger holds the hand magnet 90 px from the hidden magnet.
    sim.pointer({ id: 1, phase: 'down', x: m.x, y: m.y + 90 })
    run(sim, 120)
    expect(sim.observe().signature).toContain('/ring/')
    expect(nearBeads(sim.snapshot(), m, 60)).toBe(0)

    // A second finger flips the pole: the ring collapses into a clump.
    flip(sim)
    run(sim, 120)
    expect(sim.observe().signature).toContain('/clump/')
    expect(nearBeads(sim.snapshot(), m, 45)).toBeGreaterThanOrEqual(3)

    // Let go: the hand magnet lurches across and snaps on.
    sim.pointer({ id: 1, phase: 'up', x: m.x, y: m.y + 90 })
    run(sim, 60)
    const obs = sim.observe()
    expect(obs.signature).toContain('/snap/')
    expect(sim.snapshot().hand.snapped).toBe(true)
    expect(sim.snapshot().hand.x).toBeCloseTo(m.x, 5)

    // The hand is on the magnet at the pole that attracts it, so a flip shoves it off.
    flip(sim)
    expect(hasEvent(sim, 'shove')).toBe(true)
    expect(sim.snapshot().hand.snapped).toBe(false)
  })

  it('an iron plate clumps the beads under BOTH poles and holds the hand when the pole flips', () => {
    const seed = findSeed((s) => s.items.some((it) => readable(it, s, 'iron')))
    const sim = start({ seed })
    const s0 = sim.snapshot()
    const plate = s0.items.find((it) => readable(it, s0, 'iron'))!
    sim.pointer({ id: 1, phase: 'down', x: plate.x, y: plate.y + 70 })
    run(sim, 120)
    expect(sim.observe().signature).toContain('/clump/')
    expect(nearBeads(sim.snapshot(), plate, 50)).toBeGreaterThanOrEqual(2)
    flip(sim)
    run(sim, 60)
    expect(sim.observe().signature).toContain('/clump/')
    expect(nearBeads(sim.snapshot(), plate, 50)).toBeGreaterThanOrEqual(2)
    sim.pointer({ id: 1, phase: 'up', x: plate.x, y: plate.y + 70 })
    run(sim, 60)
    expect(sim.observe().signature).toContain('/snap/')
    flip(sim)
    const events = sim.observe().events
    expect(events).toContainEqual({ kind: 'state', name: 'hold-firm' })
    expect(sim.snapshot().hand.snapped).toBe(true)
    expect(sim.snapshot().hand.x).toBeCloseTo(plate.x, 5)
  })

  it('flipping while snapped to a magnet shoves the hand off it', () => {
    const seed = findSeed((s) => s.items.some((it) => readable(it, s, 'magnet')))
    const sim = start({ seed })
    const s0 = sim.snapshot()
    const m = s0.items.find((it) => readable(it, s0, 'magnet'))!
    const attractPole = m.kind === 0 ? -1 : 1
    if (s0.pole !== attractPole) flip(sim)
    sim.pointer({ id: 1, phase: 'down', x: m.x, y: m.y + 60 })
    run(sim, 40)
    sim.pointer({ id: 1, phase: 'up', x: m.x, y: m.y + 60 })
    run(sim, 60)
    expect(sim.snapshot().hand.snapped).toBe(true)
    sim.observe()
    flip(sim)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'shove' })
    expect(sim.snapshot().hand.snapped).toBe(false)
    run(sim, 60)
    expect(Math.hypot(sim.snapshot().hand.x - m.x, sim.snapshot().hand.y - m.y)).toBeGreaterThan(60)
  })

  it('two close opposite magnets read as mixed: one pulls, one pushes, and the hand is torn between them', () => {
    const seed = findSeed((s) => s.twin)
    const sim = start({ seed })
    const [a, b] = sim.snapshot().items as [Item, Item]
    expect(a.kind).not.toBe(b.kind)
    const gap = Math.hypot(a.x - b.x, a.y - b.y)
    expect(gap).toBeLessThan(140)
    // Approach from the side: 100 px off the midpoint, square to the pair.
    const nx = -(b.y - a.y) / gap
    const ny = (b.x - a.x) / gap
    const at = { x: (a.x + b.x) / 2 + nx * 100, y: (a.y + b.y) / 2 + ny * 100 }
    sim.pointer({ id: 1, phase: 'down', x: at.x, y: at.y })
    const seen = new Set<string>()
    for (let i = 0; i < 120; i++) {
      sim.step()
      seen.add(sim.observe().signature)
    }
    expect([...seen].some((sig) => sig.includes('/mixed/') && sig.includes('/twin/'))).toBe(true)
    // The pull and the push add sideways: the hand magnet lurches off the finger.
    const hand = sim.snapshot().hand
    expect(Math.hypot(hand.x - at.x, hand.y - at.y)).toBeGreaterThan(10)
  })
})

describe('guessing and lifting the cloth', () => {
  it('a full set of right guesses lifts clean, fires score and level, and the next cloth is bigger with a twin', () => {
    const sim = start({ seed: 5 })
    const first = sim.snapshot().items.length
    sim.observe()
    markAll(sim)
    expect(sim.snapshot().markers).toHaveLength(first)
    lift(sim)
    const obs = sim.observe()
    expect(obs.signature).toMatch(/^lifted\/clean\//)
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'score' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'level' })
    expect(obs.features.correct).toBe(first)
    expect(sim.snapshot().revealed).toBe(true)
    expect(sim.snapshot().score).toBe(first)
    // The next cloth.
    tapAt(sim, centre(LIFT_BTN).x, centre(LIFT_BTN).y, 7)
    const next = sim.snapshot()
    expect(next.phase).toBe('dowse')
    expect(next.revealed).toBe(false)
    expect(next.markers).toHaveLength(0)
    expect(next.twin).toBe(true)
    expect(next.items.length).toBeGreaterThanOrEqual(4)
    expect(sim.observe().signature).toContain('/twin/')
  })

  it('a wrong guess is called out: partial with one right, wrong with none, none with no guess', () => {
    const partial = start({ seed: 5 })
    const items = partial.snapshot().items
    const [i0, i1] = items as [Item, Item]
    drag(partial, centre(TOKEN_SLOTS[i0.kind]!), { x: i0.x, y: i0.y }, 2)
    drag(partial, centre(TOKEN_SLOTS[(i1.kind + 1) % 3]!), { x: i1.x, y: i1.y }, 2)
    lift(partial)
    expect(partial.observe().signature).toMatch(/^lifted\/partial\//)
    expect(partial.snapshot().markers.map((m) => m.verdict)).toEqual(['ok', 'wrong'])

    const wrong = start({ seed: 5 })
    drag(wrong, centre(TOKEN_SLOTS[(i0.kind + 1) % 3]!), { x: i0.x, y: i0.y }, 2)
    lift(wrong)
    expect(wrong.observe().signature).toMatch(/^lifted\/wrong\//)

    const none = start({ seed: 5 })
    lift(none)
    expect(none.observe().signature).toMatch(/^lifted\/none\//)
  })

  it('a token dropped off the cloth is not placed, and a placed marker can be dragged off again', () => {
    const sim = start()
    drag(sim, centre(TOKEN_SLOTS[0]!), { x: FIELD_W - 20, y: 400 }, 2)
    expect(sim.snapshot().markers).toHaveLength(0)
    drag(sim, centre(TOKEN_SLOTS[1]!), { x: 400, y: 400 }, 2)
    expect(sim.snapshot().markers).toHaveLength(1)
    drag(sim, { x: 400, y: 400 }, { x: FIELD_W - 20, y: 400 }, 2)
    expect(sim.snapshot().markers).toHaveLength(0)
  })

  it('the cloth cannot be touched while lifted, only turned over', () => {
    const sim = start()
    lift(sim)
    const hand = sim.snapshot().hand
    tapAt(sim, 300, 300, 3)
    expect(sim.snapshot().hand).toEqual(hand)
    expect(sim.snapshot().phase).toBe('lifted')
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events and no hook behaviour', () => {
    const sim = start({ seed: 5, hooks: [] })
    markAll(sim)
    lift(sim)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(obs.signature).toMatch(/^lifted\/clean\//)
    expect(sim.snapshot().score).toBeNull()
    tapAt(sim, centre(LIFT_BTN).x, centre(LIFT_BTN).y, 7)
    expect(sim.snapshot().items.length).toBeLessThanOrEqual(4)
  })

  it('removing level alone keeps score, and removing score alone keeps level', () => {
    const noLevel = start({ seed: 5, hooks: ['score'] })
    markAll(noLevel)
    lift(noLevel)
    const a = noLevel.observe().events.filter((e) => e.kind === 'hook').map((e) => e.name)
    expect(a).toEqual(['score'])
    const noScore = start({ seed: 5, hooks: ['level'] })
    markAll(noScore)
    lift(noScore)
    const b = noScore.observe().events.filter((e) => e.kind === 'hook').map((e) => e.name)
    expect(b).toEqual(['level'])
  })
})

describe('determinism, variety, and hints', () => {
  const script = (sim: S) => {
    drag(sim, { x: 300, y: 300 }, { x: 700, y: 500 }, 1)
    flip(sim)
    run(sim, 40)
    markAll(sim)
    lift(sim)
  }
  it('the same seed and script give the same signature, features, and snapshot', () => {
    const a = start({ seed: 11 })
    const b = start({ seed: 11 })
    script(a)
    script(b)
    expect(a.observe()).toEqual(b.observe())
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('different seeds hide different things', () => {
    const layouts = new Set<string>()
    for (let seed = 1; seed <= 8; seed++) layouts.add(JSON.stringify(start({ seed }).snapshot().items))
    expect(layouts.size).toBe(8)
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) kinds.add(start({ seed }).snapshot().items.map((i) => i.kind).sort().join(''))
    expect(kinds.size).toBeGreaterThan(5)
  })

  it('hints show after a quiet spell only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe()).toEqual(off.observe())
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('reports affordances as top-left rectangles: the hand, the pole, tokens, and the lift', () => {
    const sim = start()
    const list = sim.affordances()
    const hand = sim.snapshot().hand
    expect(list.some((a) => a.kind === 'drag' && Math.abs(a.x + a.w / 2 - hand.x) < 1 && Math.abs(a.y + a.h / 2 - hand.y) < 1)).toBe(true)
    expect(list.some((a) => a.kind === 'tap' && a.x === POLE_BTN.x && a.y === POLE_BTN.y)).toBe(true)
    expect(list.filter((a) => TOKEN_SLOTS.some((t) => t.x === a.x && t.y === a.y))).toHaveLength(3)
    expect(list.some((a) => a.x === CLOTH.x && a.y === CLOTH.y)).toBe(true)
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
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

describe('the meta', () => {
  it('names one objective feature and observes every declared feature', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
