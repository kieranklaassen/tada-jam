import { describe, expect, it } from 'vitest'
import { Hair, MOST_PUFFS, STRANDS } from './hair'
import { COLLAR_Y, HEAD, LOCK_X } from './layout'
import { clippingBox, tuftPose } from './poses'
import { makeRng } from './rng'
import { TUFTS } from './rules'
import type { Clipping, Salon } from './world'

const salon = (over: Partial<Salon> = {}): Salon => ({
  chair: 'lion', friend: 'poodle', waiting: ['yak', 'rabbit'], seed: 1, lock: 60, model: 44, seat: 'beside', cape: 'on',
  mane: Array(TUFTS).fill(50), ribbon: { len: 40, at: 'peg' }, clippings: [], shown: { snip: true, pull: true, ribbon: true }, ...over,
})
const run = (hair: Hair, seconds: number, s: Salon = salon(), hz = 60, each?: () => void) => { for (let i = 0; i < seconds * hz; i++) { hair.step(1 / hz, s); each?.() } }
const fresh = () => new Hair(TUFTS, makeRng(1))
const ROOT = { x: LOCK_X, y: COLLAR_Y }

describe('strips that hang side by side', () => {
  // How far the right strip's end is past the left one's, at the depth of the shorter: less than nothing when they have crossed.
  const clear = (hair: Hair, s: Salon): number => 10 + (hair.strands.model.swing.x - hair.strands.lock.swing.x) * Math.min(s.lock, s.model) * 2.6

  it('knock each other and never cross: a lock flung at the model sends the model swinging', () => {
    const hair = fresh(), s = salon()
    hair.strands.lock.swing.v = 9
    let least = Infinity, most = 0
    run(hair, 3, s, 60, () => { least = Math.min(least, clear(hair, s)); most = Math.max(most, hair.strands.model.swing.x) })
    expect(least).toBeGreaterThanOrEqual(-0.5)
    expect(most).toBeGreaterThan(0.15)
    run(hair, 9, s)
    expect(hair.settled).toBe(true)
  })

  it('give way to a strip in the fingers, which stays with the finger', () => {
    const hair = fresh(), s = salon()
    hair.catch('lock', { x: LOCK_X, y: COLLAR_Y + 80 }, ROOT)
    hair.follow({ x: LOCK_X + 140, y: COLLAR_Y + 120 })
    let least = Infinity
    run(hair, 0.6, s, 60, () => { least = Math.min(least, clear(hair, s)) })
    expect(hair.strands.lock.swing.x).toBeGreaterThan(0.6)
    expect(hair.strands.model.swing.x).toBeGreaterThan(0.5)
    expect(least).toBeGreaterThanOrEqual(-0.5)
  })

  it('are pushed aside by a ruffled strip as it fans out', () => {
    const hair = fresh(), s = salon()
    hair.ruffled('lock')
    run(hair, 0.1, s)
    expect(hair.strands.model.swing.x).toBeGreaterThan(0.05)
  })

  it('leave each other alone when they hang far apart: the friend across, the ribbon on its peg', () => {
    const hair = fresh(), s = salon({ seat: 'across' })
    hair.strands.lock.swing.v = 9
    run(hair, 1, s)
    expect(hair.strands.model.swing.x).toBe(0)
    expect(hair.strands.ribbon.swing.x).toBe(0)
    // Beside the lock, the ribbon is the lock's neighbour on the other side.
    const beside = fresh(), t = salon({ ribbon: { len: 40, at: 'lock' } })
    beside.strands.lock.swing.v = -9
    run(beside, 0.5, t)
    expect(beside.strands.ribbon.swing.x).toBeLessThan(-0.1)
  })
})

describe('a strip that hangs', () => {
  it('squashes when it is caught, follows the finger to the side, and swings back when it is let go', () => {
    const hair = fresh(), lock = hair.strands.lock
    hair.catch('lock', { x: LOCK_X, y: COLLAR_Y + 80 }, ROOT)
    expect(lock.stretch.x).toBeLessThan(1)
    expect(hair.holds).toBe('lock')
    hair.follow({ x: LOCK_X + 120, y: COLLAR_Y + 120 })
    run(hair, 0.5)
    expect(lock.swing.x).toBeGreaterThan(0.6)
    expect(hair.pull).toEqual({ x: 120, y: 120 })
    hair.letGo()
    expect(hair.pull).toBeNull()
    let crossings = 0, side = 1
    run(hair, 3, salon(), 60, () => { if (lock.swing.x * side < -0.02) { crossings++; side = -side } })
    // It swings across the middle a few times, and no more.
    expect(crossings).toBeGreaterThanOrEqual(2)
    expect(crossings).toBeLessThanOrEqual(7)
    run(hair, 8)
    expect(Math.abs(lock.swing.x)).toBeLessThan(0.01)
    expect(lock.stretch.x).toBeCloseTo(1, 2)
  })

  it('moves each of the three strips by itself', () => {
    const hair = fresh()
    hair.plucked('model', 1)
    run(hair, 0.2)
    expect(Math.abs(hair.strands.model.swing.x)).toBeGreaterThan(0.1)
    expect(hair.strands.lock.swing.x).toBe(0)
    expect(hair.strands.ribbon.swing.x).toBe(0)
    expect(STRANDS).toEqual(['lock', 'model', 'ribbon'])
  })

  it('swings more slowly the longer it is', () => {
    const period = (lock: number) => {
      const hair = fresh()
      hair.plucked('lock', 1)
      let t = 0
      while (hair.strands.lock.swing.x >= 0 && t < 5) { hair.step(1 / 240, salon({ lock })); t += 1 / 240 }
      return t
    }
    expect(period(90)).toBeGreaterThan(period(20) * 1.5)
  })

  it('twangs when it is snipped, fans out when it is ruffled, and its end is kicked aside; all of it dies away', () => {
    const hair = fresh(), lock = hair.strands.lock
    hair.snipped('lock')
    expect(lock.stretch.x).toBeLessThan(0.8)
    let highest = 0
    run(hair, 1, salon(), 60, () => { highest = Math.max(highest, lock.stretch.x) })
    expect(highest).toBeGreaterThan(1.02)
    hair.ruffled('lock')
    hair.kicked('lock', 6)
    expect(lock.flutter).toBe(1)
    run(hair, 0.2)
    expect(lock.kick.x).toBeGreaterThan(0.2)
    run(hair, 10)
    expect(lock.flutter).toBe(0)
    expect(Math.abs(lock.kick.x)).toBeLessThan(0.01)
    expect(hair.settled).toBe(true)
  })

  it('springs back from as far as it was drawn out: hair that is not the child\'s to keep', () => {
    const hair = fresh(), model = hair.strands.model
    hair.catch('model', { x: 600, y: 480 }, { x: 600, y: 392 })
    hair.letGo(0.5)
    expect(model.stretch.x).toBeCloseTo(1.5)
    let lowest = Infinity
    run(hair, 2, salon(), 60, () => { lowest = Math.min(lowest, model.stretch.x) })
    expect(lowest).toBeLessThan(1)
    expect(model.stretch.x).toBeCloseTo(1, 1)
  })
})

describe('the mane', () => {
  it('leans a held tuft towards the finger and lets it spring back', () => {
    const hair = fresh(), pose = tuftPose('lion', 4, 50)
    const root = { x: HEAD.x + pose.base.x, y: HEAD.y + pose.base.y }
    hair.catch(4, { x: root.x + 140, y: root.y - 40 }, root)
    expect(hair.holds).toBe(4)
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

  it('sets the whole mane trembling for as long as scissors are near, no longer than it is, and lets it be when they go', () => {
    const hair = fresh()
    run(hair, 1)
    hair.scared = true
    let leans = new Set<number>()
    run(hair, 0.6, salon(), 60, () => leans.add(Math.round(hair.tufts[2].lean.x * 500)))
    // It is cut where it is seen to be, so being scared makes no tuft longer.
    for (const tuft of hair.tufts) expect(tuft.stretch.x).toBeCloseTo(1, 2)
    expect(leans.size).toBeGreaterThan(4)
    expect(hair.settled).toBe(false)
    hair.scared = false
    run(hair, 3)
    for (const tuft of hair.tufts) expect(tuft.stretch.x).toBeCloseTo(1, 1)
    leans = new Set()
  })

  it('droops the mane or runs a wave through it for a while, each tuft in its turn, and then it is as it was', () => {
    const droop = fresh()
    droop.moodOf('droop', 1.2)
    run(droop, 0.6)
    for (const tuft of droop.tufts) expect(tuft.stretch.x).toBeLessThan(0.9)
    // The two sides fall away from each other.
    expect(droop.tufts[0].lean.x).toBeLessThan(-0.15)
    expect(droop.tufts[TUFTS - 1].lean.x).toBeGreaterThan(0.15)
    const wave = fresh(), peaks: number[] = Array(TUFTS).fill(0)
    wave.moodOf('wave', 1.4)
    let t = 0
    const tallest: number[] = Array(TUFTS).fill(0)
    run(wave, 1.4, salon(), 60, () => { t += 1 / 60; wave.tufts.forEach((tuft, i) => { if (tuft.stretch.x > tallest[i]) { tallest[i] = tuft.stretch.x; peaks[i] = t } }) })
    for (const tall of tallest) expect(tall).toBeGreaterThan(1.05)
    // The first tuft is at its tallest before the last one is.
    expect(peaks[0]).toBeLessThan(peaks[TUFTS - 1])
    for (const hair of [droop, wave]) { run(hair, 4); expect(hair.settled).toBe(true) }
  })

  it('sends the whole mane straight up for a moment, at once or a little later, and lets it down', () => {
    const hair = fresh()
    hair.moodOf('up', 0.8, 0.5)
    run(hair, 0.4)
    for (const tuft of hair.tufts) expect(tuft.stretch.x).toBeLessThan(1.05)
    run(hair, 0.5)
    for (const tuft of hair.tufts) expect(tuft.stretch.x).toBeGreaterThan(1.15)
    run(hair, 4)
    expect(hair.settled).toBe(true)
  })

  it('ripples the tufts beside the lock when something happens to it, the nearest first and most', () => {
    const hair = fresh()
    hair.rippled(TUFTS - 1)
    let near = 0, far = 0
    run(hair, 0.6, salon(), 60, () => { near = Math.max(near, Math.abs(hair.tufts[TUFTS - 1].lean.x)); far = Math.max(far, Math.abs(hair.tufts[2].lean.x)) })
    expect(near).toBeGreaterThan(0.05)
    expect(near).toBeGreaterThan(far * 2)
  })

  it('snaps the ribbon up short like a rubber band and drops it back to its length', () => {
    const hair = fresh()
    hair.snapped('ribbon')
    expect(hair.strands.ribbon.stretch.x).toBeLessThan(0.6)
    let longest = 0
    run(hair, 1.5, salon(), 60, () => { longest = Math.max(longest, hair.strands.ribbon.stretch.x) })
    expect(longest).toBeGreaterThan(1)
    run(hair, 6)
    expect(hair.strands.ribbon.stretch.x).toBeCloseTo(1, 2)
    expect(hair.strands.lock.stretch.x).toBe(1)
  })

  it('springs the whole head of hair out from under a hat, and it comes to its own length', () => {
    const hair = fresh()
    hair.sprungOut()
    expect(hair.tufts.every((tuft) => tuft.stretch.x < 0.3)).toBe(true)
    expect(hair.strands.lock.stretch.x).toBeLessThan(0.3)
    run(hair, 6)
    for (const tuft of hair.tufts) expect(tuft.stretch.x).toBeCloseTo(1, 1)
    expect(hair.strands.lock.stretch.x).toBeCloseTo(1, 1)
  })

  it('holds a tuft at the length a showing gives it until it is let go', () => {
    const hair = fresh()
    hair.tufts[2].rest = 1.6
    run(hair, 3)
    expect(hair.tufts[2].stretch.x).toBeCloseTo(1.6, 1)
    hair.tufts[2].rest = 1
    run(hair, 3)
    expect(hair.tufts[2].stretch.x).toBeCloseTo(1, 1)
  })

  it('puffs fluff up from a snipped tuft, a few puffs that float off and are gone', () => {
    const hair = fresh()
    hair.tuftSnipped(2, { x: 400, y: 200 }, 'lion')
    expect(hair.puffs.length).toBe(5)
    expect(MOST_PUFFS).toBeLessThanOrEqual(24)
    hair.step(0.2, salon())
    expect(hair.puffs.every((puff) => puff.y < 215)).toBe(true)
    run(hair, 2)
    expect(hair.puffs).toEqual([])
    for (let i = 0; i < 20; i++) hair.fluff({ x: 1, y: 1 }, 'fluff', 5)
    expect(hair.puffs.length).toBeLessThanOrEqual(MOST_PUFFS)
    // However many are in the air, the next cut has all of its own: the oldest make way.
    hair.fluff({ x: 700, y: 300 }, 'poodle', 5)
    expect(hair.puffs.filter((puff) => puff.hue === 'poodle')).toHaveLength(5)
    expect(hair.puffs.length).toBeLessThanOrEqual(MOST_PUFFS)
  })
})

describe('loose things', () => {
  it('drops a cut piece to where the model has it, with one bounce, and then it lies', () => {
    const piece: Clipping = { len: 20, hue: 'lion', on: 'floor', x: 46 }
    const hair = fresh(), box = clippingBox(salon(), piece)!
    hair.fly(salon(), piece, { x: LOCK_X, y: 470 })
    expect(hair.flights.has(piece)).toBe(true)
    let lowest = 0, steps = 0
    while (hair.flights.has(piece) && steps < 600) { hair.step(1 / 120, salon()); const f = hair.flights.get(piece); if (f) lowest = Math.max(lowest, f.y); steps++ }
    expect(hair.flights.has(piece)).toBe(false)
    expect(steps / 120).toBeGreaterThan(0.2)
    expect(steps / 120).toBeLessThan(1.5)
    expect(lowest).toBeLessThanOrEqual(box.y + 25)
  })

  it('lets an offcut of ribbon come down slowly, turning like a leaf, and lie without a bounce', () => {
    const fall = (piece: Clipping): { seconds: number; rose: boolean; turned: number } => {
      const hair = fresh(), from = { x: LOCK_X, y: 420 }
      hair.fly(salon(), piece, from)
      const start = hair.flights.get(piece)!.turn
      let steps = 0, rose = false, last = from.y, turned = 0
      while (hair.flights.has(piece) && steps < 1200) {
        hair.step(1 / 120, salon())
        const f = hair.flights.get(piece)
        if (f) { if (f.y < last - 0.01) rose = true; last = f.y; turned = Math.abs(f.turn - start) }
        steps++
      }
      return { seconds: steps / 120, rose, turned }
    }
    const hairPiece = fall({ len: 20, hue: 'lion', on: 'floor', x: 46 }), offcut = fall({ len: 20, hue: 'ribbon', on: 'floor', x: 46 })
    expect(offcut.seconds).toBeGreaterThan(hairPiece.seconds * 1.5)
    expect(offcut.seconds).toBeLessThan(3)
    // It never goes back up, and it turns right round on the way.
    expect(offcut.rose).toBe(false)
    expect(offcut.turned).toBeGreaterThan(Math.PI)
  })

  it('does not fly a piece that nobody is there to wear', () => {
    const hair = fresh(), piece: Clipping = { len: 9, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }
    hair.fly(salon({ chair: null, friend: null }), piece, { x: 1, y: 1 })
    expect(hair.flights.size).toBe(0)
  })

  it('rolls a rubbed piece away as one fluff ball, towards the chair', () => {
    const hair = fresh()
    hair.rollAway({ x: 900, y: 700 }, 'fluff')
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

  it('stops everything where it belongs when it is settled: where a scene that is cut short ends', () => {
    const hair = fresh()
    hair.catch('lock', { x: 700, y: 500 }, ROOT)
    hair.sprungOut()
    hair.maneFrizzed()
    hair.fluff({ x: 1, y: 1 }, 'fluff', 5)
    hair.fly(salon(), { len: 20, hue: 'lion', on: 'floor', x: 46 }, { x: 1, y: 1 })
    hair.carried = { what: 'ribbon', at: { x: 1, y: 1 } }
    hair.tufts[0].rest = 2
    hair.settle()
    expect(hair.settled).toBe(true)
    expect(hair.holds).toBeNull()
    expect(hair.carried).toBeNull()
    expect(hair.tufts[0].rest).toBe(1)
  })

  it('moves the same at any frame rate', () => {
    const at = (hz: number) => { const hair = fresh(); hair.plucked('lock', 1); hair.tuftPoked(3); run(hair, 1, salon(), hz); return [hair.strands.lock.swing.x, hair.tufts[3].stretch.x, hair.tufts[5].lean.x] }
    const a = at(60), b = at(120), c = at(30)
    for (let i = 0; i < 3; i++) { expect(a[i]).toBeCloseTo(b[i], 2); expect(a[i]).toBeCloseTo(c[i], 2) }
  })
})
