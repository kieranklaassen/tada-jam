import { describe, expect, it } from 'vitest'
import { BABY_IDLES, CAT_IDLES, CAT_LASTS, CAT_REST, Director, GRAN_IDLES, babyPose, catPose, granPose, type BabyIn, type BabyPose, type CatIn, type CatPose, type GranIn, type GranPose } from './motion'
import { makeRng } from './rng'

const NEVER = 1e9
const cat = (more: Partial<CatIn>): CatPose => catPose({ time: 1, idle: null, idleAt: 0, stage: 'top', p: 1, fit: 'eye', tapped: NEVER, shown: NEVER, patted: NEVER, watching: 0, ...more }, {} as CatPose)
const baby = (more: Partial<BabyIn>): BabyPose => babyPose({ time: 1, idle: null, idleAt: 0, tapped: NEVER, squealed: NEVER, watching: 0, ...more }, {} as BabyPose)
const gran = (more: Partial<GranIn>): GranPose => granPose({ time: 1, idle: null, idleAt: 0, tapped: NEVER, startled: NEVER, watching: 0, ...more }, {} as GranPose)

/** A pose over a stretch, as one list of numbers. */
const series = (pose: (t: number) => object): number[] => Array.from({ length: 40 }, (_, i) => Object.values(pose(i / 40)) as number[]).flat()
const apart = (a: number[], b: number[]): number => a.reduce((most, value, i) => Math.max(most, Math.abs(value - b[i])), 0)

describe('the director of idle moves', () => {
  it('never plays the same move twice running, rests between moves, and is the same for the same seed', () => {
    const run = (seed: number): string[] => {
      const director = new Director(CAT_IDLES, CAT_LASTS, CAT_REST, makeRng(seed), 1)
      const played: string[] = []
      let last: string | null = null
      for (let time = 0; time < 120; time += 0.05) {
        const progress = director.update(time)
        expect(progress).toBeGreaterThanOrEqual(0); expect(progress).toBeLessThanOrEqual(1)
        if (director.current !== last) { played.push(director.current ?? 'rest'); last = director.current }
      }
      return played
    }
    const played = run(7)
    expect(played.length).toBeGreaterThan(20)
    played.forEach((move, i) => { if (i > 0) expect(move === 'rest').toBe(played[i - 1] !== 'rest') })
    const moves = played.filter((move) => move !== 'rest')
    moves.forEach((move, i) => { if (i > 0) expect(move).not.toBe(moves[i - 1]) })
    expect(new Set(moves).size).toBe(CAT_IDLES.length)
    expect(run(7)).toEqual(played)
    expect(run(8)).not.toEqual(played)
  })
})

describe('every character moves like itself', () => {
  it('gives each idle move of a character its own shape', () => {
    const sets = [
      CAT_IDLES.map((idle) => series((t) => cat({ idle, idleAt: t }))),
      BABY_IDLES.map((idle) => series((t) => baby({ idle, idleAt: t }))),
      GRAN_IDLES.map((idle) => series((t) => gran({ idle, idleAt: t }))),
    ]
    for (const set of sets) for (let a = 0; a < set.length; a++) for (let b = a + 1; b < set.length; b++) expect(apart(set[a], set[b])).toBeGreaterThan(0.05)
  })

  it('gives no two characters the same answer to a touch', () => {
    // The part of each that moves most when it is touched, over the two seconds after.
    const touched = [
      Array.from({ length: 60 }, (_, i) => cat({ tapped: i / 30 }).paw),
      Array.from({ length: 60 }, (_, i) => baby({ tapped: i / 30 }).armL - baby({}).armL),
      Array.from({ length: 60 }, (_, i) => gran({ tapped: i / 30, time: i / 30 }).needleL),
    ]
    for (const curve of touched) expect(Math.max(...curve.map(Math.abs))).toBeGreaterThan(0.1)
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(apart(touched[a], touched[b])).toBeGreaterThan(0.1)
  })

  it('answers the same instant in three ways when the cat shows at a hole', () => {
    expect(cat({ stage: 'look', fit: 'head', shown: 0.1 }).mouth).toBe(1)
    expect(baby({ squealed: 0.3 }).mouth).toBe(1)
    expect(baby({ squealed: 0.3 }).armR).toBeGreaterThan(0.8)
    expect(gran({ startled: 0.1 }).glasses).toBeGreaterThan(0.05)
    expect(gran({ startled: 0.1 }).mouth).toBe(1)
  })

  it('lays the ears flat while the head comes through a hole, and springs them after', () => {
    expect(cat({ stage: 'rise', fit: 'head', p: 0.5 }).ears).toBeLessThan(0.5)
    expect(cat({ stage: 'look', fit: 'head', shown: 0.05 }).ears).toBeGreaterThan(1.1)
    expect(cat({ stage: 'look', fit: 'head', shown: 5 }).ears).toBeCloseTo(1, 2)
    // Only a paw reaches out of a middling hole.
    expect(cat({ stage: 'look', fit: 'paw' }).reach).toBe(1)
    expect(cat({ stage: 'look', fit: 'eye' }).reach).toBe(0)
  })

  it('keeps every number of every pose finite and small, whatever the moment', () => {
    const rng = makeRng(3)
    for (let i = 0; i < 400; i++) {
      const time = rng.next() * 200, age = (): number => (rng.next() < 0.3 ? NEVER : rng.next() * 4)
      const poses = [
        cat({ time, idle: CAT_IDLES[i % 4], idleAt: rng.next(), stage: (['top', 'prick', 'drop', 'rise', 'look', 'back', 'up'] as const)[i % 7], p: rng.next(), fit: (['eye', 'paw', 'head'] as const)[i % 3], tapped: age(), shown: age(), patted: age(), watching: rng.next() }),
        baby({ time, idle: BABY_IDLES[i % 4], idleAt: rng.next(), tapped: age(), squealed: age(), watching: rng.next() }),
        gran({ time, idle: GRAN_IDLES[i % 4], idleAt: rng.next(), tapped: age(), startled: age(), watching: rng.next() }),
      ]
      for (const pose of poses) for (const value of Object.values(pose) as number[]) { expect(Number.isFinite(value)).toBe(true); expect(Math.abs(value)).toBeLessThanOrEqual(2.6) }
    }
  })
})
