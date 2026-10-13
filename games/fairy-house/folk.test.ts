import { describe, expect, it } from 'vitest'
import { ACTS, FOLK, Folk, PERSONALITY, REACTIONS, type Reaction } from './folk'
import { HOLLOW, HOME_CONTROL } from './kinds'
import { makeRng } from './rng'

const numbers = (r: Reaction): number[] => [r.lean, r.kick, r.part, r.prop, r.wide, r.brow, r.open, r.holds]
/** In how many of its numbers one answer differs from another. */
const apart = (a: Reaction, b: Reaction): number => numbers(a).filter((value, index) => value !== numbers(b)[index]).length + (a.mouth === b.mouth ? 0 : 1)

describe('the three folk move like themselves', () => {
  it('gives no two the same tempo, weight, eyes, breath or blink', () => {
    const fields = ['latency', 'stiffness', 'damping', 'partStiffness', 'partDamping', 'eyeSpeed', 'restLid'] as const
    for (const field of fields) expect(new Set(FOLK.map((who) => PERSONALITY[who][field])).size, field).toBe(3)
    expect(new Set(FOLK.map((who) => PERSONALITY[who].breath.hz)).size).toBe(3)
    expect(new Set(FOLK.map((who) => PERSONALITY[who].blink.lasts)).size).toBe(3)
  })

  it('answers every event differently from the other two, and each of its own events differently', () => {
    for (const act of ACTS) {
      expect(apart(REACTIONS.fat[act], REACTIONS.tidy[act]), act).toBeGreaterThanOrEqual(4)
      expect(apart(REACTIONS.fat[act], REACTIONS.tiny[act]), act).toBeGreaterThanOrEqual(4)
      expect(apart(REACTIONS.tidy[act], REACTIONS.tiny[act]), act).toBeGreaterThanOrEqual(4)
    }
    for (const who of FOLK) for (const a of ACTS) for (const b of ACTS) if (a < b) expect(apart(REACTIONS[who][a], REACTIONS[who][b]), `${who} ${a} ${b}`).toBeGreaterThanOrEqual(3)
  })

  it('answers within a few hundred milliseconds', () => {
    for (const who of FOLK) expect(PERSONALITY[who].latency).toBeLessThanOrEqual(0.3)
  })

  it('shares no idle delight, and has at least three each', () => {
    const names = FOLK.flatMap((who) => PERSONALITY[who].delights.map((delight) => delight.name))
    expect(new Set(names).size).toBe(names.length)
    for (const who of FOLK) expect(PERSONALITY[who].delights.length).toBeGreaterThanOrEqual(3)
  })

  it('never does the same delight twice running, and does every one of them in time', () => {
    for (const who of FOLK) {
      const folk = new Folk(who, makeRng(7))
      const done: string[] = []
      let last: string | null = null
      for (let i = 0; i < 120 * 240; i++) {
        folk.step(1 / 120)
        if (folk.doing !== last) {
          if (folk.doing) done.push(folk.doing)
          last = folk.doing
        }
      }
      expect(done.length).toBeGreaterThan(10)
      for (let i = 1; i < done.length; i++) expect(done[i], `${who} at ${i}`).not.toBe(done[i - 1])
      expect(new Set(done).size).toBe(PERSONALITY[who].delights.length)
    }
  })

  it('is alive with nothing happening: it breathes, blinks and looks', () => {
    for (const who of FOLK) {
      const folk = new Folk(who, makeRng(3))
      const bobs = new Set<number>(), lids = new Set<number>()
      for (let i = 0; i < 120 * 12; i++) {
        folk.step(1 / 120)
        bobs.add(Math.round(folk.pose.bob * 1000))
        lids.add(Math.round(folk.pose.lid * 10))
      }
      expect(bobs.size, who).toBeGreaterThan(3)
      expect(lids.size, who).toBeGreaterThan(1)
    }
  })

  it('answers a poke in the call that pokes it, and what it sees after its own latency', () => {
    for (const who of FOLK) {
      const folk = new Folk(who, makeRng(1))
      expect(folk.poke()).toBe('poke')
      expect(folk.answers).toBe(1)
      folk.notice('love')
      let steps = 0
      while (folk.answers === 1 && steps < 200) {
        folk.step(1 / 120)
        steps += 1
      }
      expect(steps / 120).toBeGreaterThanOrEqual(PERSONALITY[who].latency - 1 / 120)
      expect(steps / 120).toBeLessThanOrEqual(PERSONALITY[who].latency + 2 / 120)
    }
  })

  it('stays in a pose a face can show, whatever it is given', () => {
    for (const who of FOLK) {
      const folk = new Folk(who, makeRng(5))
      for (let i = 0; i < 120 * 30; i++) {
        if (i % 37 === 0) folk.notice(ACTS[(i / 37) % ACTS.length])
        if (i % 211 === 0) folk.poke()
        folk.step(1 / 120)
        const pose = folk.pose
        for (const value of Object.values(pose)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
        expect(pose.lid).toBeGreaterThanOrEqual(0)
        expect(pose.lid).toBeLessThanOrEqual(1)
        expect(Math.abs(pose.gazeX)).toBeLessThanOrEqual(1.001)
        expect(Math.abs(pose.lean)).toBeLessThan(30)
        expect(Math.abs(pose.bob)).toBeLessThan(0.4)
      }
    }
  })
})

describe('where the folk sit', () => {
  it('is clear of the hollow, of the home control and of the grown-up corner', () => {
    for (const who of FOLK) {
      const { feet, reach } = PERSONALITY[who]
      const left = feet.x - reach.halfWidth, right = feet.x + reach.halfWidth, top = feet.y - reach.height
      expect(right < HOLLOW.left || left > HOLLOW.right, who).toBe(true)
      expect(right < HOME_CONTROL.x - HOME_CONTROL.r - 10 || left > HOME_CONTROL.x + HOME_CONTROL.r + 10 || top > HOME_CONTROL.y + HOME_CONTROL.r + 10, who).toBe(true)
      expect(right < 1180 - 72 || top > 72, who).toBe(true)
    }
  })
})
