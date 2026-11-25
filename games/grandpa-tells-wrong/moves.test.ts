import { describe, expect, it } from 'vitest'
import { ACT, actPose, idlePose, type Stance } from './moves'
import { BARE, CAST, THINGS, type Who } from './tale'

const stance = (who: Who, over: Partial<Stance> = {}): Stance => ({ who, worn: { ...BARE }, t: 2, asleep: false, asking: false, look: null, under: null, poked: 99, stare: 99, protest: 99, accused: 99, ...over })
const numbers = (value: unknown): number[] => (typeof value === 'number' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(numbers) : [])

describe('how they move', () => {
  it('is an answer of their own to every thing', () => {
    const film = (who: Who, what: (typeof THINGS)[number]) => JSON.stringify([0.4, 0.6, 0.8, 1, 1.2].map((t) => actPose(stance(who), what, t, false)))
    expect(new Set(CAST.flatMap((who) => THINGS.map((what) => film(who, what)))).size).toBe(30)
  })
  it('is a breath, a poke and a sleep of their own', () => {
    for (const over of [{}, { poked: 0.2 }, { asleep: true }]) expect(new Set(CAST.map((who) => JSON.stringify(idlePose(stance(who, over))))).size).toBe(5)
  })
  it('keeps every number finite and nobody far from their place', () => {
    for (const who of CAST) for (const what of THINGS) for (const lie of [false, true]) for (let t = 0; t <= ACT; t += 0.05) {
      const pose = actPose(stance(who, { t: 2 + t }), what, t, lie)
      expect(numbers(pose).every(Number.isFinite)).toBe(true)
      expect(Math.abs(pose.x)).toBeLessThan(90)
      expect(pose.sx).toBeGreaterThan(0.4)
      expect(pose.sy).toBeGreaterThan(0.4)
    }
  })
  it('ends an answer near where it began, so nothing snaps', () => {
    for (const who of CAST) for (const what of THINGS) {
      const end = actPose(stance(who), what, ACT, false), idle = idlePose(stance(who))
      expect(Math.abs(end.x - idle.x)).toBeLessThan(12)
      expect(Math.abs(end.turn - idle.turn)).toBeLessThan(0.25)
      expect(Math.abs(end.sy - idle.sy)).toBeLessThan(0.15)
    }
  })
})
