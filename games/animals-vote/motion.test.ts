import { describe, expect, it } from 'vitest'
import { SPOTS } from './layout'
import { ACTS, TWISTS, idle, pairsOf, poseOf, strength, type Pose } from './motion'
import { RESULT } from './play'
import { ANIMALS, THINGS, type Thing } from './things'

const track = (f: (t: number) => Partial<Pose>) => Array.from({ length: 40 }, (_, i) => f(i * 0.13)).map((p) => [p.x ?? 0, p.y ?? 0, (p.rot ?? 0) * 60, (p.hr ?? 0) * 60, p.hx ?? 0, p.hy ?? 0, ((p.sy ?? 1) - 1) * 100, ((p.sx ?? 1) - 1) * 100]).flat()
const apart = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / 40)

describe('motion', () => {
  it('gives no two animals one motion, idle or in anything that happens', () => {
    const sets: [string, number[][]][] = [['idle', ANIMALS.map((who) => track((t) => idle(who, t)))], ...THINGS.map((thing): [string, number[][]] => [thing, ANIMALS.map((who) => track(ACTS[thing][who]))])]
    for (const [name, tracks] of sets) for (let i = 0; i < tracks.length; i++) for (let j = 0; j < i; j++) expect(apart(tracks[i], tracks[j]), `${name}: ${ANIMALS[i]} and ${ANIMALS[j]}`).toBeGreaterThan(name === 'idle' ? 0.4 : 3)
  })
  it('gives one animal a motion of its own in each thing', () => {
    for (const who of ANIMALS) for (let i = 0; i < THINGS.length; i++) for (let j = 0; j < i; j++) expect(apart(track(ACTS[THINGS[i]][who]), track(ACTS[THINGS[j]][who])), `${who}: ${THINGS[i]} and ${THINGS[j]}`).toBeGreaterThan(3)
  })
  it('has a twist for every pair, all ten', () => {
    expect(Object.keys(TWISTS)).toHaveLength(10)
    for (const a of THINGS) for (const b of THINGS) if (a !== b) expect(TWISTS[pairsOf([a, b])[0]]).toBeTypeOf('function')
    expect(pairsOf(['mud', 'fly', 'sleep'])).toHaveLength(3)
  })
  it('never loses anybody: every pose is finite and near the stage', () => {
    const sets: Thing[][] = THINGS.flatMap((a, i) => [[a], ...THINGS.slice(i + 1).map((b) => [a, b])])
    sets.push(['mud', 'fly', 'sleep'], ['bath', 'mud', 'dance'])
    for (const won of sets) for (const who of ANIMALS) for (let t = 0; t < RESULT; t += 0.05) {
      const p = poseOf(who, t, won, t, strength(t, RESULT)), x = SPOTS[who].x + p.x, mid = SPOTS[who].y + p.y - SPOTS[who].h * 0.45
      expect(Number.isFinite(x + mid + p.rot + p.sx + p.sy + p.hr)).toBe(true)
      expect(x).toBeGreaterThan(-50)
      expect(x).toBeLessThan(1230)
      expect(mid, `${who} in ${won.join()}`).toBeGreaterThan(-30)
    }
    expect(strength(0, RESULT)).toBe(0)
    expect(strength(RESULT, RESULT)).toBe(0)
  })
})
