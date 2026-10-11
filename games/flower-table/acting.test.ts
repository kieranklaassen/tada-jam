import { describe, expect, it } from 'vitest'
import { MANNER, lasts, poseOf, type ActName, type Pose } from './acting'
import { VISITORS } from './cast'
import { KINDS, type Kind } from './plants'

// No two visitors share a move (docs: motion personality per character). Each
// act is sampled through its length for each visitor, and two visitors whose
// samples are the same, or one a faint copy of the other, fail here.

const SAMPLES = Array.from({ length: 41 }, (_, index) => index / 40)

/** What the eye can tell apart in a pose, each on a scale where 1 is plainly visible. */
const seen = (pose: Pose): number[] => [
  pose.dx / 8, pose.dy / 8, pose.headX / 8, pose.headY / 8, pose.tilt / 0.06, pose.turn / 0.5,
  pose.cross / 0.5, pose.roll / 0.5, pose.wide / 0.5, pose.shut / 0.5, pose.mouth / 0.5, pose.reach / 0.5, pose.special / 0.25, pose.tears / 0.5, pose.purple / 0.5,
  (pose.lookX ?? 0) / 0.7, (pose.lookY ?? 0) / 0.7,
]

/** How far apart two visitors play an act: the largest visible difference at any moment of it. */
function apart(name: ActName, plant: Kind | null, a: (typeof VISITORS)[number], b: (typeof VISITORS)[number]): number {
  let most = 0
  for (const u of SAMPLES) {
    const pa = seen(poseOf(a, { name, plant, u, flag: true })), pb = seen(poseOf(b, { name, plant, u, flag: true }))
    pa.forEach((value, index) => { most = Math.max(most, Math.abs(value - pb[index])) })
  }
  return most
}

const pairs = VISITORS.flatMap((a, i) => VISITORS.slice(i + 1).map((b) => [a, b] as const))
const acts: [string, ActName, Kind | null][] = [
  ...(['poke', 'lift', 'take', 'walk', 'leave', 'loves', 'cannot', 'stalks'] as const).map((name): [string, ActName, null] => [name, name, null]),
  ...KINDS.map((kind): [string, ActName, Kind] => [`sniff of the ${kind}`, 'sniff', kind]),
  ...KINDS.map((kind): [string, ActName, Kind] => [`${kind} let go on it`, 'drop', kind]),
]

describe('how the visitors move', () => {
  it.each(acts)('no two visitors play the %s alike', (_, name, plant) => {
    for (const [a, b] of pairs) expect(apart(name, plant, a, b), `${a} and ${b}`).toBeGreaterThanOrEqual(1)
  })

  it('gives each visitor its own tempo, size of gesture and walk', () => {
    for (const key of ['tempo', 'size', 'steps', 'bob'] as const) expect(new Set(VISITORS.map((who) => MANNER[who][key])).size).toBe(VISITORS.length)
    expect(lasts('goat', 'sniff')).toBeLessThan(lasts('aunt', 'sniff'))
    expect(lasts('aunt', 'sniff')).toBeLessThan(lasts('beekeeper', 'sniff'))
  })

  it('arrives each in its own way: the goat overshoots, the aunt moves at one speed, the others start softly', () => {
    expect(Math.max(...SAMPLES.map((t) => MANNER.goat.ease(t)))).toBeGreaterThan(1.02)
    expect(MANNER.aunt.ease(0.25)).toBeCloseTo(0.25)
    expect(MANNER.beekeeper.ease(0.25)).toBeLessThan(MANNER.bride.ease(0.25))
    for (const who of VISITORS) { expect(MANNER[who].ease(0)).toBeCloseTo(0); expect(MANNER[who].ease(1)).toBeCloseTo(1) }
  })

  it('begins and ends every act where the visitor stands, so nothing jumps', () => {
    for (const who of VISITORS) for (const [, name, plant] of acts) {
      if (name === 'walk' || name === 'leave' || name === 'take') continue
      for (const u of [0, 1]) {
        const pose = poseOf(who, { name, plant, u })
        expect(Math.abs(pose.dx) + Math.abs(pose.dy), `${who} ${name} ${plant} at ${u}`).toBeLessThan(1)
        expect(Math.abs(pose.turn)).toBeCloseTo(1)
      }
    }
  })

  it('each has its own sneeze', () => {
    for (const [a, b] of pairs) expect(apart('sniff', 'dandelion', a, b)).toBeGreaterThanOrEqual(1)
  })
})
