import { describe, expect, it } from 'vitest'
import { Hair } from './hair'
import { COLLAR_Y, HEAD, LOCK_X } from './layout'
import { clippingBox, tuftPose } from './poses'
import { makeRng } from './rng'
import { TUFTS } from './rules'
import type { Clipping, Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 60, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: null, clippings: [], shown: { snip: true, pull: true, ribbon: false }, ...over,
})
const run = (hair: Hair, seconds: number, s: Salon = salon(), hz = 60, each?: () => void) => { for (let i = 0; i < seconds * hz; i++) { hair.step(1 / hz, s); each?.() } }
const fresh = () => new Hair(TUFTS, makeRng(1))

describe('the lock', () => {
  it('squashes when it is caught, follows the finger to the side, and swings back when it is let go', () => {
    const hair = fresh()
    hair.catchLock({ x: LOCK_X, y: COLLAR_Y + 80 })
    expect(hair.lockStretch.x).toBeLessThan(1)
    hair.follow({ x: LOCK_X + 120, y: COLLAR_Y + 120 })
    run(hair, 0.5)
    expect(hair.lockSwing.x).toBeGreaterThan(0.6)
    expect(hair.pull).toEqual({ x: 120, y: 120 })
    hair.letGo()
    expect(hair.pull).toBeNull()
    let crossings = 0, side = 1
    run(hair, 3, salon(), 60, () => { if (hair.lockSwing.x * side < -0.02) { crossings++; side = -side } })
    // It swings across the middle a few times, and no more.
    expect(crossings).toBeGreaterThanOrEqual(2)
    expect(crossings).toBeLessThanOrEqual(7)
    run(hair, 8)
    expect(Math.abs(hair.lockSwing.x)).toBeLessThan(0.01)
    expect(hair.lockStretch.x).toBeCloseTo(1, 2)
  })

  it('swings more slowly the longer it is', () => {
    const period = (lock: number) => {
      const hair = fresh()
      hair.lockPlucked(1)
      let t = 0
      while (hair.lockSwing.x >= 0 && t < 5) { hair.step(1 / 240, salon({ lock })); t += 1 / 240 }
      return t
    }
    expect(period(90)).toBeGreaterThan(period(20) * 1.5)
  })

  it('twangs when it is snipped and fans out when it is ruffled, and both die away', () => {
    const hair = fresh()
    hair.lockSnipped()
    expect(hair.lockStretch.x).toBeLessThan(0.8)
    let highest = 0
    run(hair, 1, salon(), 60, () => { highest = Math.max(highest, hair.lockStretch.x) })
    expect(highest).toBeGreaterThan(1.02)
    hair.lockRuffled()
    expect(hair.lockFlutter).toBe(1)
    run(hair, 10)
    expect(hair.lockFlutter).toBe(0)
    expect(hair.settled).toBe(true)
  })
})

describe('the mane', () => {
  it('leans a held tuft towards the finger and lets it spring back', () => {
    const hair = fresh(), pose = tuftPose(4, 50)
    const root = { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }
    hair.catchTuft(4, { x: root.x + 140, y: root.y - 40 })
    run(hair, 0.5)
    expect(hair.tufts[4].lean.x).toBeGreaterThan(0.5)
    expect(hair.tufts[3].lean.x).toBeLessThan(0.1)
    hair.letGo()
    run(hair, 6)
    expect(Math.abs(hair.tufts[4].lean.x)).toBeLessThan(0.06)
  })

  it('sways each tuft a little on its own while nothing touches it', () => {
    const hair = fresh()
    run(hair, 2)
    const leans = hair.tufts.map((tuft) => tuft.lean.x)
    for (const lean of leans) expect(Math.abs(lean)).toBeLessThan(0.08)
    expect(new Set(leans.map((lean) => lean.toFixed(4))).size).toBe(TUFTS)
  })

  it('ripples a poke outwards: the tufts next to it move later and less than the one poked', () => {
    const hair = fresh()
    hair.tuftPoked(4)
    hair.step(1 / 60, salon())
    expect(hair.tufts[4].stretch.v).not.toBe(0)
    expect(hair.tufts[5].stretch.v).toBe(0)
    let near = 0, far = 0
    run(hair, 0.6, salon(), 120, () => { near = Math.max(near, Math.abs(hair.tufts[5].stretch.x - 1)); far = Math.max(far, Math.abs(hair.tufts[8].stretch.x - 1)) })
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
    run(hair, 6)
    expect(hair.settled).toBe(true)
  })

  it('frizzes the whole mane and lets it sink back', () => {
    const hair = fresh()
    hair.maneFrizzed()
    expect(hair.tufts.every((tuft) => tuft.frizz === 1)).toBe(true)
    run(hair, 2)
    expect(hair.tufts.every((tuft) => tuft.frizz === 0)).toBe(true)
  })

  it('puffs fluff up from a snipped tuft, a few puffs that float off and are gone', () => {
    const hair = fresh()
    hair.tuftSnipped(2, { x: 400, y: 200 }, '#ee8232')
    expect(hair.puffs.length).toBe(5)
    hair.step(0.2, salon())
    expect(hair.puffs.every((puff) => puff.y < 215)).toBe(true)
    run(hair, 2)
    expect(hair.puffs).toEqual([])
    for (let i = 0; i < 20; i++) hair.fluff({ x: 1, y: 1 }, '#fff', 5)
    expect(hair.puffs.length).toBeLessThanOrEqual(12)
  })
})

describe('loose things', () => {
  it('drops a cut piece to where the model has it, with one bounce, and then it lies', () => {
    const piece: Clipping = { len: 20, hue: 'lion', on: 'floor', x: 46 }
    const hair = fresh(), box = clippingBox(piece)
    hair.fly(piece, { x: LOCK_X, y: 470 })
    expect(hair.flights.has(piece)).toBe(true)
    let lowest = 0, steps = 0
    while (hair.flights.has(piece) && steps < 600) { hair.step(1 / 120, salon()); const f = hair.flights.get(piece); if (f) lowest = Math.max(lowest, f.y); steps++ }
    expect(hair.flights.has(piece)).toBe(false)
    expect(steps / 120).toBeGreaterThan(0.2)
    expect(steps / 120).toBeLessThan(1.5)
    expect(lowest).toBeLessThanOrEqual(box.y + 25)
  })

  it('rolls a rubbed piece away as one fluff ball, towards the chair', () => {
    const hair = fresh()
    hair.rollAway({ x: 900, y: 700 }, '#ee8232')
    hair.step(0.3, salon())
    expect(hair.puffs[0].rolls).toBe(true)
    expect(hair.puffs[0].x).toBeLessThan(900)
    run(hair, 1)
    expect(hair.puffs).toEqual([])
  })

  it('opens the scissors as they come into the hand, shuts them on a snip, and lets them fade when they leave', () => {
    const hair = fresh()
    hair.scissorsIn({ x: 300, y: 300 })
    run(hair, 0.3)
    expect(hair.scissors.shown).toBe(1)
    expect(hair.scissors.open.x).toBeGreaterThan(0.8)
    hair.scissorsClose()
    expect(hair.scissors.open.x).toBe(0)
    run(hair, 0.3)
    expect(hair.scissors.open.x).toBeGreaterThan(0.8)
    hair.scissorsMove({ x: 500, y: 320 })
    expect(hair.scissors.at).toEqual({ x: 500, y: 320 })
    hair.scissorsOut()
    run(hair, 0.3)
    expect(hair.scissors.shown).toBe(0)
  })

  it('moves the same at any frame rate', () => {
    const at = (hz: number) => { const hair = fresh(); hair.lockPlucked(1); hair.tuftPoked(3); run(hair, 1, salon(), hz); return [hair.lockSwing.x, hair.tufts[3].stretch.x, hair.tufts[5].lean.x] }
    const a = at(60), b = at(120), c = at(30)
    for (let i = 0; i < 3; i++) { expect(a[i]).toBeCloseTo(b[i], 2); expect(a[i]).toBeCloseTo(c[i], 2) }
  })
})
