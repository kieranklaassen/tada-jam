import { describe, expect, it } from 'vitest'
import { ROUND, drivePose, givePose, poke, reactPose, waitPose, type VehiclePose } from './acts'
import type { VehicleId } from './sites'
import { driverAt } from './fleet'
import { VEHICLES, type Reaction } from './vehicles'

const ids = Object.keys(VEHICLES) as VehicleId[]
const flat = (pose: VehiclePose) => [pose.bounce, pose.pitch, pose.creep, ...pose.cargo, pose.face, pose.upset]
const looks = (pose: VehiclePose) => [pose.lookX, pose.lookY, pose.gasp, pose.lids, pose.fret, pose.puff]
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

  it('on a kerb every vehicle wobbles, and its wheels never go under the road for it', () => {
    for (const id of ids) {
      const level = trace((t) => drivePose(id, t), 4), kerb = trace((t) => drivePose(id, t, 1), 4)
      expect(apart(level, kerb), id).toBeGreaterThan(0.03)
      for (let i = 0; i <= 80; i++) {
        const plain = drivePose(id, (i / 80) * 4), wobbling = drivePose(id, (i / 80) * 4, 1)
        // The body rocks nose-down about its front wheels and hops: its back wheels lift and never sink.
        expect(wobbling.pitch).toBeLessThanOrEqual(plain.pitch)
        expect(wobbling.bounce).toBeGreaterThanOrEqual(plain.bounce)
      }
    }
  })

  it('put out by a ride that shed its parcels, the van\'s driver gets out, restacks them at the tail and gets in again', () => {
    const at = (t: number) => reactPose('post-van', dislike, t)
    // It sits in the cab while the parcels slide off.
    for (const t of [0, 0.2, 0.4, 0.5]) expect(at(t).upset).toBe(0)
    expect(Math.min(...at(0.5).cargo.slice(0, 3))).toBeLessThan(-1)
    // It is at the tail before the first parcel goes back, and stays there until the last is on the tower.
    for (const t of [0.7, 0.78, 0.9]) expect(at(t).upset).toBeCloseTo(1, 6)
    expect(Math.min(...at(0.97).cargo.slice(0, 3))).toBeCloseTo(0, 1)
    expect(at(1).upset).toBeCloseTo(0, 6)
    // A ride it liked, or one that was neither, keeps it in the cab.
    for (const t of [0.3, 0.6, 0.8]) { expect(reactPose('post-van', like, t).upset).toBe(0); expect(reactPose('post-van', plain, t).upset).toBe(0) }
    // On foot it stays beside the van, between its axles: where the van stands on a bank, so does its driver.
    const long = Math.max(...VEHICLES['post-van'].axles)
    for (let out = 0; out <= 1.0001; out += 0.1) { expect(driverAt(long, out)).toBeLessThan(0); expect(driverAt(long, out)).toBeGreaterThan(-long) }
  })

  it('every driver has a face that says what it is looking at: the gap, the far bank, the road under it, the water it is in', () => {
    for (const id of ids) {
      // At the edge it looks down, is not sure, looks across, and backs up. Further back it only looks round at its load.
      const down = waitPose(id, ROUND[id] * 0.36, true), across = waitPose(id, ROUND[id] * 0.6, true), behind = waitPose(id, ROUND[id] * 0.68, false)
      expect(down.lookY, id).toBeLessThan(-0.6); expect(down.fret).toBeGreaterThan(0.6)
      expect(across.lookX).toBeGreaterThan(0.6)
      expect(behind.lookX).toBeLessThan(-0.5); expect(behind.fret).toBe(0)
      // On a road that shows no strain it looks ahead. The more strain shows, the further down it looks; near the limit its mouth opens.
      const easy = drivePose(id, 1, 0, undefined, 0.3), hard = drivePose(id, 1, 0, undefined, 0.75), limit = drivePose(id, 1, 0, undefined, 0.98)
      expect(easy.fret).toBe(0); expect(easy.lookX).toBeGreaterThan(0.5); expect(easy.gasp).toBe(0)
      expect(hard.fret).toBeGreaterThan(0.5); expect(hard.lookY).toBeLessThan(easy.lookY)
      expect(limit.fret).toBe(1); expect(limit.gasp).toBeGreaterThan(0.6)
      expect(easy.puff).toBe(1)
      // Falling: eyes wide, mouth round. Afloat: lids half down and a flat mouth. Shaking dry: eyes shut.
      const falling = givePose(id, 1, { fall: 0.6, paddle: 0, climb: 0, shake: 0 }), afloat = givePose(id, 1, { fall: 1, paddle: 0.5, climb: 0, shake: 0 }), shaking = givePose(id, 1, { fall: 1, paddle: 1, climb: 1, shake: 0.5 })
      expect(falling.gasp).toBe(1); expect(falling.lids).toBe(0); expect(falling.fret).toBe(1)
      expect(afloat.lids).toBe(0.5); expect(afloat.gasp).toBe(0); expect(Math.abs(afloat.face)).toBeLessThan(0.2)
      expect(shaking.lids).toBe(1)
      // A touch opens its eyes and its mouth.
      expect(poke(id, 0.2, waitPose(id, 1, false)).gasp).toBeGreaterThan(0.5)
      for (const pose of [down, across, behind, easy, hard, limit, falling, afloat, shaking, reactPose(id, like, 0.45), reactPose(id, dislike, 0.2), reactPose(id, plain, 0.5)]) {
        for (const value of looks(pose)) { expect(Number.isFinite(value)).toBe(true); expect(Math.abs(value)).toBeLessThanOrEqual(1) }
      }
    }
  })

  it('a deck with no dip at all bores the jelly truck: its driver yawns, mouth wide and eyes shut', () => {
    const bored: Reaction = { mood: 'plain', act: 'driver-yawns', amount: 1, parts: [] }
    const mid = reactPose('jelly-truck', bored, 0.5)
    expect(mid.gasp).toBeGreaterThan(0.8)
    expect(mid.lids).toBeCloseTo(1)
    expect(reactPose('jelly-truck', bored, 0).gasp).toBe(0)
    expect(reactPose('jelly-truck', bored, 1).gasp).toBeCloseTo(0)
    // A ride that was neither, without the yawn, keeps its mouth shut.
    expect(reactPose('jelly-truck', plain, 0.5).gasp).toBe(0)
  })
})

describe('what a full reading found of the characters', () => {
  const at = (id: Parameters<typeof reactPose>[0], mood: 'like' | 'dislike', amount: number, t: number, act = '') => ({ ...reactPose(id, { mood, act, amount, parts: [] }, t) })

  it('the van\'s driver is seen whistling: its mouth is a small round while the parcels stand', () => {
    expect(at('post-van', 'like', 1, 0.3).gasp).toBeGreaterThan(0.25)
    expect(at('post-van', 'like', 1, 0.3).gasp).toBeLessThan(0.45)
    expect(at('post-van', 'like', 1, 0.02).gasp).toBe(0)
    expect(at('post-van', 'like', 1, 0.8).gasp).toBe(0)
  })

  it('the parcels slide off the back one at a time: each is down before the next begins to go', () => {
    const gone = (t: number) => { const pose = at('post-van', 'dislike', 1, t); return [pose.cargo[2], pose.cargo[1], pose.cargo[0]].map((c) => -c / 1.6) }
    for (let t = 0; t <= 0.6; t += 0.01) {
      const [top, middle, bottom] = gone(t)
      // The next one has not started until the one before it is all the way off.
      if (middle > 0.001) expect(top).toBeGreaterThan(0.999)
      if (bottom > 0.001) expect(middle).toBeGreaterThan(0.999)
    }
    expect(gone(0.52).every((share) => share > 0.999)).toBe(true)
    // And as each lands it is heard: the three thuds are at the three landings.
    for (const [k, landed] of [0.22, 0.36, 0.5].entries()) expect(gone(landed)[k]).toBeGreaterThan(0.999)
  })

  it('the jelly rolls in one slow wave: over to one side and to the other, once', () => {
    const lean = Array.from({ length: 99 }, (_, i) => at('jelly-truck', 'like', 1, (i + 1) / 100).cargo[0])
    let turns = 0
    for (let i = 1; i < lean.length; i++) if (Math.sign(lean[i]) !== Math.sign(lean[i - 1]) && lean[i] !== 0 && lean[i - 1] !== 0) turns++
    expect(turns).toBe(1)
    expect(Math.max(...lean)).toBeGreaterThan(0.3); expect(Math.min(...lean)).toBeLessThan(-0.3)
  })
})

