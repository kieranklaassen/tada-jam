import { describe, expect, it } from 'vitest'
import { ROUND, drivePose, poke, reactPose, waitPose, type VehiclePose } from './acts'
import type { VehicleId } from './sites'
import { VEHICLES, type Reaction } from './vehicles'

const ids = Object.keys(VEHICLES) as VehicleId[]
const flat = (pose: VehiclePose) => [pose.bounce, pose.pitch, pose.creep, ...pose.cargo, pose.face, pose.upset]
/** A pose function sampled through time, every channel. */
const trace = (make: (t: number) => VehiclePose, seconds: number) => Array.from({ length: 81 }, (_, i) => flat(make((i / 80) * seconds)))
const apart = (a: number[][], b: number[][]) => { let most = 0; a.forEach((row, t) => row.forEach((v, c) => { most = Math.max(most, Math.abs(v - b[t][c])) })); return most }
const pairs = <T,>(list: T[]) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b] as const))
const like: Reaction = { mood: 'like', act: 'x', amount: 1, parts: [] }, dislike: Reaction = { mood: 'dislike', act: 'x', amount: 1, parts: [] }, plain: Reaction = { mood: 'plain', act: 'x', amount: 0.5, parts: [] }

describe('how each vehicle moves', () => {
  it('no two vehicles wait, drive or react alike, and no two keep the same time', () => {
    expect(new Set(Object.values(ROUND)).size).toBe(ids.length)
    for (const [a, b] of pairs(ids)) {
      expect(apart(trace((t) => waitPose(a, t, false), 8), trace((t) => waitPose(b, t, false), 8)), `${a} and ${b} waiting`).toBeGreaterThan(0.1)
      expect(apart(trace((t) => drivePose(a, t), 4), trace((t) => drivePose(b, t), 4)), `${a} and ${b} driving`).toBeGreaterThan(0.05)
      for (const reaction of [like, dislike]) expect(apart(trace((t) => reactPose(a, reaction, t), 1), trace((t) => reactPose(b, reaction, t), 1)), `${a} and ${b} ${reaction.mood}`).toBeGreaterThan(0.2)
    }
  })

  it('every vehicle is alive while it waits, and the one at the gap shows the want: it creeps to the edge and backs up', () => {
    for (const id of ids) {
      const waiting = trace((t) => waitPose(id, t, false), ROUND[id])
      expect(apart(waiting, waiting.map(() => waiting[0])), id).toBeGreaterThan(0.03)
      const creep = Array.from({ length: 50 }, (_, i) => waitPose(id, (i / 50) * ROUND[id], true).creep)
      expect(Math.max(...creep)).toBeGreaterThan(0.3)
      expect(creep[0]).toBeCloseTo(0)
      expect(waitPose(id, ROUND[id] * 0.99, true).creep).toBeLessThan(0.05)
      // One behind it stays where it is.
      expect(Math.max(...Array.from({ length: 50 }, (_, i) => Math.abs(waitPose(id, (i / 50) * ROUND[id], false).creep)))).toBe(0)
      // It comes round again; the caterpillar's feet alone drift in and out of step on a longer beat of their own.
      if (id !== 'caterpillar-bus') flat(waitPose(id, 1.3, true)).forEach((v, c) => expect(v).toBeCloseTo(flat(waitPose(id, 1.3 + ROUND[id], true))[c], 6))
    }
  })

  it('a like, a dislike and a ride that is neither are three different things for each vehicle, and each begins and ends at rest', () => {
    for (const id of ids) {
      const all = [like, dislike, plain].map((reaction) => trace((t) => reactPose(id, reaction, t), 1))
      for (const [a, b] of pairs(all)) expect(apart(a, b), id).toBeGreaterThan(0.1)
      for (const reaction of [like, dislike, plain]) {
        for (const v of flat(reactPose(id, reaction, 0))) expect(Math.abs(v), id).toBeLessThan(1e-9)
        for (const v of flat(reactPose(id, reaction, 1))) expect(Math.abs(v), id).toBeLessThan(1e-9)
      }
      // The face is content at a like and put out at a dislike, and neither is about anyone but the cargo.
      expect(reactPose(id, like, 0.5).face).toBeGreaterThan(0.5)
      expect(reactPose(id, dislike, 0.5).face).toBeLessThan(-0.5)
      // A dislike is as much to watch as a like.
      const size = (r: Reaction) => apart(trace((t) => reactPose(id, r, t), 1), trace(() => reactPose(id, r, 0), 1))
      expect(size(dislike)).toBeGreaterThanOrEqual(0.5 * size(like))
    }
  })

  it('more of the cause shows as more of the reaction', () => {
    const some: Reaction = { ...dislike, amount: 0.1 }, much: Reaction = { ...dislike, amount: 1 }
    const off = (r: Reaction) => reactPose('post-van', r, 0.6).cargo.filter((c) => c < -1).length
    expect(off(much)).toBeGreaterThan(off(some))
    expect(reactPose('piano-mover', much, 0.5).upset).toBeGreaterThan(reactPose('piano-mover', some, 0.5).upset)
  })

  it('a touch gets each vehicle\'s own start, and it is over in under a second', () => {
    for (const id of ids) {
      const before = flat(waitPose(id, 2, false)), poked = flat(poke(id, 0.2, waitPose(id, 2, false))), later = flat(poke(id, 0.9, waitPose(id, 2, false)))
      expect(poked).not.toEqual(before)
      expect(later).toEqual(before)
    }
    const starts = ids.map((id) => JSON.stringify(flat(poke(id, 0.2, waitPose(id, 0, false))).map((v) => v.toFixed(3))))
    expect(new Set(starts).size).toBe(ids.length)
  })
})
