import { describe, expect, it } from 'vitest'
import { SPECIES } from './cast'
import { NEEDS, OPEN, PLAIN, QUIET, type Need, type Step } from './needs'
import { NO_SHOW, SIGN_FACE, blend, sign, type Show } from './signs'

const STEPS: readonly Step[] = [QUIET, PLAIN, OPEN]

/** What a sign shows over six seconds, as the largest value each part reaches. */
function most(species: (typeof SPECIES)[number], need: Need, step: Step): Show & { sag: number; rock: number } {
  const top = { ...NO_SHOW, sag: 0, rock: 0 }
  for (let frame = 0; frame < 360; frame++) {
    const { pose, show } = sign(species, need, step, frame / 60, 4)
    for (const key of Object.keys(NO_SHOW) as (keyof Show)[]) top[key] = Math.max(top[key], Math.abs(show[key]))
    top.sag = Math.max(top.sag, 1 - pose.sy)
    top.rock = Math.max(top.rock, Math.abs(pose.rot))
  }
  return top
}

describe('a sign', () => {
  it('shows each need at its own place with its own movement, the same for every animal', () => {
    for (const species of SPECIES) {
      expect(most(species, 'thirsty', PLAIN).tongue).toBeGreaterThan(0)
      expect(most(species, 'thirsty', PLAIN).sag).toBeGreaterThan(0.08)
      expect(most(species, 'cold', PLAIN).shake).toBeGreaterThan(0.5)
      expect(most(species, 'sore', PLAIN).paw).toBe(1)
      expect(most(species, 'itchy', PLAIN).burrs).toBeGreaterThan(0)
      expect(most(species, 'scared', PLAIN).under).toBe(1)
      // And no need borrows another's place.
      expect(most(species, 'thirsty', OPEN)).toMatchObject({ paw: 0, arms: 0, burrs: 0, under: 0, shake: 0 })
      expect(most(species, 'cold', OPEN)).toMatchObject({ paw: 0, tongue: 0, burrs: 0, under: 0 })
      expect(most(species, 'sore', OPEN)).toMatchObject({ arms: 0, tongue: 0, burrs: 0, under: 0, shake: 0 })
      expect(most(species, 'itchy', OPEN)).toMatchObject({ arms: 0, tongue: 0, under: 0, shake: 0 })
      expect(most(species, 'scared', OPEN)).toMatchObject({ arms: 0, tongue: 0, burrs: 0 })
    }
  })

  it('is the same need shown more fully at each step: quiet is the movement alone, plain adds the face, open shows the place itself', () => {
    for (const species of SPECIES) {
      for (const need of NEEDS) {
        expect(sign(species, need, QUIET, 1, 4).pose.face, `${species} ${need}`).toBe('calm')
        expect(sign(species, need, PLAIN, 1, 4).pose.face).toBe(SIGN_FACE[need])
        expect(sign(species, need, OPEN, 1, 4).pose.face).toBe(SIGN_FACE[need])
      }
      expect(most(species, 'thirsty', OPEN).tongue).toBeGreaterThan(most(species, 'thirsty', PLAIN).tongue)
      expect(most(species, 'thirsty', PLAIN).sag).toBeGreaterThan(most(species, 'thirsty', QUIET).sag)
      expect(most(species, 'cold', PLAIN).shake).toBeGreaterThan(most(species, 'cold', QUIET).shake)
      // It hugs itself at the open step, where it turns to the child: not before.
      expect(most(species, 'cold', OPEN).arms).toBe(1)
      expect(most(species, 'cold', PLAIN).arms).toBe(0)
      expect(most(species, 'cold', QUIET).arms).toBe(0)
      expect(most(species, 'cold', OPEN).puff).toBeGreaterThan(0.5)
      expect(most(species, 'sore', OPEN).pawY).toBeGreaterThan(most(species, 'sore', PLAIN).pawY)
      expect(most(species, 'sore', PLAIN).pawY).toBeGreaterThan(most(species, 'sore', QUIET).pawY)
      expect(most(species, 'sore', OPEN).pawX).toBeGreaterThan(10)
      // The burrs are the place and are all there at every step, so that all three can be brushed out.
      for (const step of [QUIET, PLAIN, OPEN] as const) expect(most(species, 'itchy', step).burrs).toBe(3)
      expect(most(species, 'scared', QUIET).out).toBe(0)
      expect(most(species, 'scared', OPEN).out).toBeGreaterThan(most(species, 'scared', PLAIN).out)
      expect(most(species, 'scared', OPEN).paw).toBe(1)
    }
  })

  it('gives every need a face of its own, and none of them a face of a well animal', () => {
    const faces = Object.values(SIGN_FACE)
    expect(new Set(faces).size).toBe(NEEDS.length)
    for (const face of faces) expect(['calm', 'glad', 'wow', 'bliss', 'wary']).not.toContain(face)
  })

  it('is alive and bounded: it moves, it never grows while it waits, and it is the same at the same moment', () => {
    for (const species of SPECIES) {
      for (const need of NEEDS) {
        for (const step of STEPS) {
          const first = most(species, need, step)
          // The same six seconds a minute later reach no further: a sign does not grow with time.
          let later = 0, moved = false
          let before = JSON.stringify(sign(species, need, step, 60, 4))
          for (let frame = 0; frame < 360; frame++) {
            const now = sign(species, need, step, 60 + frame / 60, 4)
            later = Math.max(later, now.show.shake, now.show.out)
            const text = JSON.stringify(now)
            if (text !== before) moved = true
            before = text
            for (const value of [now.pose.x, now.pose.y, now.pose.rot, now.pose.sx, now.pose.sy, ...Object.values(now.show)]) expect(Number.isFinite(value)).toBe(true)
            expect(now.pose.sy).toBeGreaterThan(0.8)
            expect(Math.abs(now.pose.rot)).toBeLessThan(0.2)
          }
          expect(moved, `${species} ${need} ${step}`).toBe(true)
          expect(later).toBeLessThanOrEqual(Math.max(first.shake, first.out) + 1e-9)
          expect(sign(species, need, step, 3.3, 4)).toEqual(sign(species, need, step, 3.3, 4))
        }
      }
    }
  })

  it('times the same sign by the animal: no two animals pant, wobble or scratch in step', () => {
    for (const need of ['thirsty', 'sore', 'itchy'] as Need[]) {
      const seen = new Set(SPECIES.map((species) => JSON.stringify(Array.from({ length: 40 }, (_, frame) => sign(species, need, PLAIN, frame / 20, 4).pose.sy.toFixed(4) + sign(species, need, PLAIN, frame / 20, 4).show.pawY.toFixed(2) + sign(species, need, PLAIN, frame / 20, 4).pose.rot.toFixed(4)))))
      expect(seen.size, need).toBe(SPECIES.length)
    }
  })

  it('eases from one show to another', () => {
    const from = sign('bear', 'cold', OPEN, 1, 4).show, to = NO_SHOW
    expect(blend(from, to, 0)).toEqual(from)
    expect(blend(from, to, 1)).toEqual({ ...to })
    expect(blend(from, to, 0.5).shake).toBeCloseTo(from.shake / 2)
  })
})
