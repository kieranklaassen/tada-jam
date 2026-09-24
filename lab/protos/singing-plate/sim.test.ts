// Proof for Singing Plate. The characteristic moment: at a hidden tone the
// sand hops off the plate's shaking places and settles onto that tone's quiet
// lines, and because the sand stays where the last tone left it, the ORDER of
// tones decides the picture. Written before the sim.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { BAR, PLATE, TIP, TONE_HALF, TONE_NAMES, createSim, toneX } from './sim.ts'
import type { SingingPlateSnapshot } from './sim.ts'

const RING = 0
const CROSS = 1
const EX = 2
const STAR = 3

const barY = BAR.y + BAR.h / 2

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

// Screen coordinates of a point on the plate, from plate units (-1 to 1).
const at = (u: number, v: number) => ({ x: PLATE.x + ((u + 1) / 2) * PLATE.w, y: PLATE.y + ((v + 1) / 2) * PLATE.h })

// Hold a finger on the plate: a pinch on the way down, a trickle while held.
function pour(sim: Sim, u: number, v: number, ticks: number, id = 1): void {
  const p = at(u, v)
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  run(sim, ticks)
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

// A spread of sand that sits on no tone's lines in particular.
const SPOTS: Array<[number, number]> = [
  [0.72, 0.31],
  [-0.68, 0.36],
  [0.29, -0.71],
  [-0.33, -0.66],
  [0.12, 0.78],
  [-0.15, 0.2],
]
function pourPile(sim: Sim): void {
  for (const [u, v] of SPOTS) pour(sim, u, v, 25)
}

// Lift the finger, strike a tone with a fresh touch, and hold it.
function holdTone(sim: Sim, tone: number, ticks: number, id = 2): void {
  const x = toneX(tone)
  sim.pointer({ id, phase: 'down', x, y: barY })
  run(sim, ticks)
  sim.pointer({ id, phase: 'up', x, y: barY })
  run(sim, 2)
}

function chain(sim: Sim, tones: readonly number[], ticks = 110): void {
  for (const tone of tones) holdTone(sim, tone, ticks)
  run(sim, 40)
}

function snap(sim: Sim): SingingPlateSnapshot {
  return sim.snapshot() as SingingPlateSnapshot
}

// The sand in plate units, read back from screen coordinates so the checks do
// not lean on the sim's own geometry.
function sand(sim: Sim): Array<[number, number]> {
  const g = snap(sim).grains
  const out: Array<[number, number]> = []
  for (let i = 0; i < g.length; i += 2) out.push([((g[i]! - PLATE.x) / PLATE.w) * 2 - 1, ((g[i + 1]! - PLATE.y) / PLATE.h) * 2 - 1])
  return out
}

const share = (points: Array<[number, number]>, test: (u: number, v: number) => boolean) =>
  points.filter(([u, v]) => test(u, v)).length / Math.max(1, points.length)

const onRing = (u: number, v: number) => Math.abs(Math.hypot(u, v) - 0.6) < 0.1
const onCross = (u: number, v: number) => Math.min(Math.abs(u), Math.abs(v)) < 0.1
const onEx = (u: number, v: number) => Math.min(Math.abs(u - v), Math.abs(u + v)) * Math.SQRT1_2 < 0.1
const onStar = (u: number, v: number) => onCross(u, v) || onEx(u, v)

// The share of grains whose position differs between two snapshots.
function movedShare(before: number[], after: number[]): number {
  let moved = 0
  for (let i = 0; i < before.length; i += 2) if (before[i] !== after[i] || before[i + 1] !== after[i + 1]) moved++
  return moved / Math.max(1, before.length / 2)
}

function signature(sim: Sim): string {
  return sim.observe().signature
}

describe('the singing plate', () => {
  it('starts as a bare plate with a bar under it and something to reach for', () => {
    const sim = start()
    expect(snap(sim).grains).toHaveLength(0)
    expect(signature(sim)).toBe('bare')
    expect(sim.affordances().length).toBeGreaterThan(0)
    expect(TONE_NAMES.length).toBe(7)
  })

  it('a touch pours a pinch of sand where the finger is', () => {
    const sim = start()
    sim.observe()
    const p = at(-0.4, 0.4)
    sim.pointer({ id: 1, phase: 'down', x: p.x, y: p.y })
    sim.pointer({ id: 1, phase: 'up', x: p.x, y: p.y })
    const points = sand(sim)
    expect(points.length).toBeGreaterThanOrEqual(20)
    expect(share(points, (u, v) => Math.hypot(u + 0.4, v - 0.4) < 0.3)).toBeGreaterThan(0.9)
    expect(signature(sim)).toBe('heap')
  })

  it('CHARACTERISTIC MOMENT: at the ring tone the sand hops off the shaking places and settles into a ring', () => {
    const sim = start()
    pourPile(sim)
    sim.observe()
    expect(share(sand(sim), onRing)).toBeLessThan(0.3)
    expect(signature(sim)).toBe('heap')

    holdTone(sim, RING, 120)
    run(sim, 20)

    expect(share(sand(sim), onRing)).toBeGreaterThan(0.85)
    const obs = sim.observe()
    expect(obs.signature).toBe('ring')
    expect(obs.features.settled).toBeGreaterThanOrEqual(0.72)
    expect(obs.features.woven).toBe(1)
    expect(obs.features.found).toBe(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'found:ring' })
    expect(obs.events).toContainEqual({ kind: 'state', name: 'settle:ring' })
  })

  it('between the tones the plate stays still, and only the bar hums', () => {
    const sim = start()
    pourPile(sim)
    const before = JSON.stringify(snap(sim).grains)
    const gap = (toneX(RING) + toneX(CROSS)) / 2
    sim.pointer({ id: 2, phase: 'down', x: gap, y: barY })
    run(sim, 90)
    expect(JSON.stringify(snap(sim).grains)).toBe(before)
    expect(snap(sim).hum).toBeGreaterThan(0)
    expect(snap(sim).ringing).toBe(false)
    sim.pointer({ id: 2, phase: 'up', x: gap, y: barY })
    expect(signature(sim)).toBe('heap')
  })

  it('sliding quickly across a tone does not ring it, but a slow slide into it does', () => {
    const cx = toneX(CROSS)
    const fast = start()
    pourPile(fast)
    const before = JSON.stringify(snap(fast).grains)
    // Start in the gap beside the cross, then cross its window in one tick.
    fast.pointer({ id: 2, phase: 'down', x: cx - 90, y: barY })
    for (let s = 1; s <= 4; s++) {
      fast.pointer({ id: 2, phase: 'move', x: cx - 90 + s * 45, y: barY })
      fast.step()
    }
    fast.pointer({ id: 2, phase: 'up', x: cx + 90, y: barY })
    run(fast, 40)
    expect(JSON.stringify(snap(fast).grains)).toBe(before)

    const slow = start()
    pourPile(slow)
    slow.pointer({ id: 2, phase: 'down', x: cx - 100, y: barY })
    for (let s = 1; s <= 8; s++) {
      slow.pointer({ id: 2, phase: 'move', x: cx - 100 + s * 12, y: barY })
      slow.step()
    }
    run(slow, 120)
    expect(share(sand(slow), onCross)).toBeGreaterThan(0.85)
  })

  it('a quick tap plucks a tone: the sand stirs, then the plate goes still and the sand stays put', () => {
    const sim = start()
    pourPile(sim)
    const before = JSON.stringify(snap(sim).grains)
    sim.pointer({ id: 2, phase: 'down', x: toneX(RING), y: barY })
    sim.step()
    sim.pointer({ id: 2, phase: 'up', x: toneX(RING), y: barY })
    run(sim, 30)
    const stirred = JSON.stringify(snap(sim).grains)
    expect(stirred).not.toBe(before)
    run(sim, 120)
    const later = JSON.stringify(snap(sim).grains)
    run(sim, 30)
    expect(JSON.stringify(snap(sim).grains)).toBe(later)
  })

  it('the next tone only scatters the sand that sits on its own shaking places', () => {
    const sim = start()
    pourPile(sim)
    chain(sim, [CROSS])
    expect(signature(sim)).toBe('cross')
    expect(share(sand(sim), onCross)).toBeGreaterThan(0.85)

    // The star's quiet lines include the cross, so the sand stays put (a few
    // stragglers that had not reached the cross's lines may still hop).
    const cross = snap(sim).grains
    sim.observe()
    holdTone(sim, STAR, 80)
    expect(movedShare(cross, snap(sim).grains)).toBeLessThan(0.05)
    const stars = sim.observe()
    expect(stars.signature).toBe('cross')
    expect(stars.events).toContainEqual({ kind: 'state', name: 'fits' })

    // The ex has quiet lines the cross sand is not on, so it all moves.
    holdTone(sim, EX, 120)
    run(sim, 30)
    expect(signature(sim)).toBe('ex<cross')
    expect(share(sand(sim), onEx)).toBeGreaterThan(0.85)
  })

  it('ORDER MATTERS: ring, star, cross is not cross, star, ring', () => {
    const first = start()
    pourPile(first)
    chain(first, [RING, STAR, CROSS])
    const second = start()
    pourPile(second)
    chain(second, [CROSS, STAR, RING])

    const a = first.observe()
    const b = second.observe()
    expect(a.signature).toBe('cross<star')
    expect(b.signature).toBe('ring<cross')
    expect(a.signature).not.toBe(b.signature)
    // The ring-to-star walk gave three different shapes; the star between
    // cross and ring fitted the sand already and shaped nothing.
    expect(a.features.woven).toBe(3)
    expect(b.features.woven).toBe(2)
    expect(JSON.stringify(snap(first).grains)).not.toBe(JSON.stringify(snap(second).grains))
  })

  it('the sand remembers where the last tone left it: ring then star leaves beads on the ring radius', () => {
    const viaRing = start()
    pourPile(viaRing)
    chain(viaRing, [RING, STAR])
    const direct = start()
    pourPile(direct)
    chain(direct, [STAR])

    const beads = (sim: Sim) => share(sand(sim), (u, v) => Math.abs(Math.hypot(u, v) - 0.6) < 0.2)
    expect(signature(viaRing)).toBe('star<ring')
    expect(share(sand(viaRing), onStar)).toBeGreaterThan(0.85)
    expect(signature(direct)).toBe('star')
    expect(beads(viaRing)).toBeGreaterThan(beads(direct) + 0.15)
  })

  it('tipping the plate empties it and clears what the sand remembers', () => {
    const sim = start()
    pourPile(sim)
    chain(sim, [RING])
    expect(sim.observe().features.woven).toBe(1)
    sim.pointer({ id: 3, phase: 'down', x: TIP.x + TIP.w / 2, y: TIP.y + TIP.h / 2 })
    sim.pointer({ id: 3, phase: 'up', x: TIP.x + TIP.w / 2, y: TIP.y + TIP.h / 2 })
    sim.step()
    const obs = sim.observe()
    expect(snap(sim).grains).toHaveLength(0)
    expect(obs.signature).toBe('bare')
    expect(obs.features.woven).toBe(0)
  })

  it('each tone window is a forgiving target', () => {
    expect(TONE_HALF * 2).toBeGreaterThanOrEqual(60)
    for (let t = 1; t < TONE_NAMES.length; t++) expect(toneX(t) - toneX(t - 1)).toBeGreaterThan(TONE_HALF * 2 + 20)
  })

  it('the same seed and script give the same signature and the same sand; another seed lands it differently', () => {
    const play = (seed: number) => {
      const sim = start({ seed })
      pourPile(sim)
      chain(sim, [RING, STAR, CROSS], 60)
      return { signature: signature(sim), grains: JSON.stringify(snap(sim).grains) }
    }
    expect(play(5)).toEqual(play(5))
    expect(play(5).grains).not.toBe(play(6).grains)
  })

  it('with an empty hooks list nothing ever reports a hook', () => {
    expect(meta.hooks).toEqual([])
    const sim = start({ hooks: [] })
    pourPile(sim)
    chain(sim, [RING, STAR, CROSS], 60)
    const events = sim.observe().events
    expect(events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('an idle plate hints only when hints are on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    expect(snap(on).hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(snap(on).hint).not.toBeNull()
    expect(snap(off).hint).toBeNull()
  })

  it('declares an honest signature bound', () => {
    const n = TONE_NAMES.length
    expect(meta.signatureBound).toBe(4 + n + n * (n - 1))
  })
})
