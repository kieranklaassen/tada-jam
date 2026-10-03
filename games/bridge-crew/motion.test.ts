import { describe, expect, it } from 'vitest'
import { stream } from './look'
import { ChiefDirector, IDLE, REACT, STILL, poseOf, stringSway, waterDrift, type Act, type ChiefPose, type Idle } from './motion'

const channels = Object.keys(STILL) as (keyof ChiefPose)[]
const acts = [...Object.keys(IDLE), ...Object.keys(REACT), 'poked'] as Act[]
/** The most each channel moves over an act. */
const reach = (act: Act): Record<string, number> => {
  const most: Record<string, number> = {}
  for (let i = 0; i <= 200; i++) { const pose = poseOf(act, i / 200); for (const c of channels) most[c] = Math.max(most[c] ?? 0, Math.abs(pose[c])) }
  return most
}

describe('how the crew chief moves', () => {
  it('every act begins and ends at rest and stays inside what a heron can do', () => {
    for (const act of acts) {
      for (const c of channels) { expect(Math.abs(poseOf(act, 0)[c])).toBeLessThan(1e-9); expect(Math.abs(poseOf(act, 1)[c])).toBeLessThan(1e-9) }
      const most = reach(act)
      expect(most.neck).toBeLessThanOrEqual(1)
      expect(most.tilt).toBeLessThanOrEqual(0.6)
      expect(most.hopX).toBeLessThanOrEqual(0.5)
      for (const c of ['crest', 'peck', 'tuck', 'preen', 'lean'] as const) expect(most[c]).toBeLessThanOrEqual(1.01)
    }
  })

  it('no two acts are the same move: each has its own leading part of the body, or its own shape in time', () => {
    const lead = (act: Act) => { const most = reach(act); return channels.filter((c) => most[c] > 0.05).sort().join('+') }
    const leads = acts.map(lead)
    expect(new Set(leads).size).toBe(acts.length)
    // And none is a slowed or scaled copy of another: sampled through time, every pair differs somewhere by a clear margin.
    const trace = (act: Act) => Array.from({ length: 41 }, (_, i) => channels.map((c) => poseOf(act, i / 40)[c]))
    for (let i = 0; i < acts.length; i++) for (let j = i + 1; j < acts.length; j++) {
      const a = trace(acts[i]), b = trace(acts[j])
      let apart = 0
      a.forEach((row, t) => row.forEach((value, c) => { apart = Math.max(apart, Math.abs(value - b[t][c])) }))
      expect(apart, `${acts[i]} and ${acts[j]}`).toBeGreaterThan(0.3)
    }
  })

  it('its two tastes look nothing alike: it reaches in for a triangle and hops back from a fold', () => {
    const likes = reach('taps-and-listens'), dislikes = reach('feathers-on-end')
    expect(likes.peck).toBeGreaterThan(0.9)
    expect(likes.hopX).toBe(0)
    expect(likes.crest).toBe(0)
    expect(dislikes.hopX).toBeGreaterThan(0.3)
    expect(dislikes.crest).toBeGreaterThan(0.9)
    expect(dislikes.peck).toBe(0)
    // Listening is a still hold with the head over: no nod.
    const held = [0.64, 0.7, 0.76].map((t) => poseOf('taps-and-listens', t))
    for (const pose of held) { expect(pose.tilt).toBeGreaterThan(0.5); expect(pose.peck).toBeLessThan(1e-9) }
    expect(held[0].neck).toBeCloseTo(held[2].neck)
  })

  it('at idle it is never still for long, never does the same thing twice running, and does everything in time', () => {
    const chief = new ChiefDirector(stream(7))
    const seen: Idle[] = []
    let last: Act = 'rest', moved = 0, before = { ...STILL }
    for (let i = 0; i < 60 * 240; i++) {
      const pose = chief.step(1 / 60)
      if (chief.act !== last) { if (chief.act !== 'rest') seen.push(chief.act as Idle); last = chief.act }
      moved += channels.reduce((sum, c) => sum + Math.abs(pose[c] - before[c]), 0)
      before = { ...pose }
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen)).toEqual(new Set(Object.keys(IDLE)))
    expect(seen.length).toBeGreaterThan(30)
    expect(moved).toBeGreaterThan(50)
  })

  it('a reaction takes over at once and gives way to rest', () => {
    const chief = new ChiefDirector(stream(3))
    for (let i = 0; i < 100; i++) chief.step(1 / 60)
    chief.react('feathers-on-end')
    expect(chief.act).toBe('feathers-on-end')
    expect(chief.step(0.2).crest).toBeGreaterThan(0.5)
    for (let i = 0; i < 60 * REACT['feathers-on-end']; i++) chief.step(1 / 60)
    expect(chief.act).toBe('rest')
    chief.poke()
    expect(chief.act).toBe('poked')
    expect(chief.step(0.3).neck).toBeLessThan(-0.3)
  })

  it('the same seed gives the same chief, and no time gives no change', () => {
    const run = (seed: number) => { const chief = new ChiefDirector(stream(seed)); const out: string[] = []; for (let i = 0; i < 2000; i++) { chief.step(1 / 60); out.push(chief.act) } return out.join() }
    expect(run(11)).toBe(run(11))
    expect(run(11)).not.toBe(run(12))
    const chief = new ChiefDirector(stream(1))
    const a = { ...chief.step(0.5) }, b = { ...chief.step(0) }
    expect(b.neck).toBe(a.neck)
    expect(Math.abs(stringSway(3))).toBeLessThan(0.3)
    expect(waterDrift(10, 0)).not.toBe(waterDrift(10, 1))
  })
})
