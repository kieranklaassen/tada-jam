import { describe, expect, it } from 'vitest'
import { backUnderCape, capeOff, letIn, markShown, sendFriend } from './cycle'
import { Hair } from './hair'
import { COLLAR_Y, HEAD, LOCK_X, STEP } from './layout'
import { PERSONALITIES } from './personality'
import { onHead, placesOf, tuftPose, tuftTip } from './poses'
import { Puppet } from './puppet'
import { makeRng } from './rng'
import { TAIL_LEN, TUFTS } from './rules'
import { freshGame, type Game } from './save'
import { Scene, sceneLength, type Beat } from './scene'
import { PAW_HOME, capeComesOff, comingIn, shownOnce, tailOf, type Cast, type Cue } from './scenes'
import { DOORWAY, LOW, Staging, WINDOW, dipAt, lowFor, walk } from './staging'

function cast(game: Game): Cast & { cues: Cue[]; cut: boolean } {
  const customer = game.chair ? new Puppet(PERSONALITIES[game.chair], makeRng(1)) : null
  const friend = game.friend ? new Puppet(PERSONALITIES[game.friend], makeRng(2)) : null
  const cues: Cue[] = []
  return { staging: new Staging(), hair: new Hair(TUFTS, makeRng(3)), customer: () => customer, friend: () => friend, cue: (cue) => { cues.push(cue) }, cues, cut: false }
}
/** Plays beats from start to end at 60 frames a second and returns how long they took. */
function playThrough(beats: Beat[], each?: (t: number) => void): number {
  const scene = new Scene(beats)
  let t = 0
  scene.start(0, () => {})
  while (scene.running && t < 40) { scene.update(t); each?.(t); t += 1 / 60 }
  return sceneLength(beats)
}
const seated = (over: Partial<Game> = {}): Game => ({ ...letIn(freshGame(null)).game, ...over })

describe('the staging', () => {
  it('takes a walker the low way round the front of the chair, and only when its way crosses the customer', () => {
    const beside = { x: 708, y: 302, s: 0.65 }, across = { x: 133, y: 432, s: 0.65 }, peg = { x: 772, y: 330, s: 0.65 }
    expect(lowFor(beside, across)).toBe(LOW)
    expect(lowFor(across, beside)).toBe(LOW)
    expect(lowFor(beside, peg)).toBe(0)
    const gait = { hop: 0, steps: 2 }
    // Straight, its face would go through the customer's; the low way the two faces never meet.
    const into = (at: { x: number; y: number; s: number }): number => 1 + at.s - Math.hypot((at.x - HEAD.x) / HEAD.rx, (at.y - HEAD.y) / HEAD.ry)
    let straight = -Infinity, low = -Infinity
    for (let p = 0; p <= 1; p += 0.02) {
      straight = Math.max(straight, into(walk(beside, across, p, gait, 1)))
      low = Math.max(low, into(walk(beside, across, p, gait, 1, LOW)))
    }
    expect(straight).toBeGreaterThan(0.5)
    expect(low).toBeLessThanOrEqual(0)
    expect(walk(beside, across, 0, gait, 1, LOW)).toMatchObject({ x: beside.x, y: beside.y })
    expect(walk(beside, across, 1, gait, 1, LOW)).toMatchObject({ x: across.x, y: across.y, lift: 0 })
    expect(dipAt(0)).toBe(0)
    expect(dipAt(0.5)).toBeCloseTo(1)
  })

  it('puts everyone where the model has them when it is settled', () => {
    const staging = new Staging(), game = seated()
    staging.door = 0.6; staging.hats = 1; staging.fx = { kind: 'too-long', muddle: 0.3 }; staging.paw = { x: 1, y: 2, scissors: 1 }; staging.ribbon = { x: 1, y: 2, len: 9 }; staging.tails = 1
    staging.leaving = [{ who: 'yak', part: 'chair', at: { x: 0, y: 0, s: 1, lift: 0, seen: 1 }, from: { x: 0, y: 0, s: 1 }, lock: 30, mane: null, worn: [] }]
    staging.settle(game)
    const places = placesOf(game)
    expect(staging).toMatchObject({ customer: { ...places.customer, lift: 0, seen: 1 }, friend: { ...places.friend, lift: 0, seen: 1 }, leaving: [], door: 0, waiting: 1, cape: 1, hats: 0, fx: null, paw: null, ribbon: null, tails: 0 })
    staging.settle({ ...game, cape: 'off' })
    expect(staging.cape).toBe(0)
    staging.settle(freshGame(null))
    expect(staging).toMatchObject({ customer: null, friend: null, cape: 0 })
  })

  it('walks a figure from one place to another in hops of its own gait, and lands exactly', () => {
    const from = { x: 0, y: 100, s: 0.6 }, to = { x: 400, y: 200, s: 1 }
    const lion = PERSONALITIES.lion.gait, rabbit = PERSONALITIES.rabbit.gait
    expect(walk(from, to, 0, lion, 1)).toMatchObject({ x: 0, y: 100, s: 0.6, lift: 0 })
    expect(walk(from, to, 1, lion, 1)).toEqual({ x: 400, y: 200, s: 1, lift: 0, seen: 1 })
    const lifts = (gait: { hop: number; steps: number }) => Array.from({ length: 99 }, (_, i) => walk(from, to, (i + 1) / 100, gait, 1.6).lift)
    expect(Math.max(...lifts(rabbit))).toBeGreaterThan(Math.max(...lifts(lion)) * 2)
    const hops = (gait: { hop: number; steps: number }) => lifts(gait).filter((lift, i, all) => i > 0 && i < all.length - 1 && lift > all[i - 1] && lift >= all[i + 1]).length
    expect(hops(rabbit)).toBeGreaterThan(hops(lion))
    expect(WINDOW[0].s).toBeLessThan(DOORWAY.s)
  })
})

describe('coming in', () => {
  it('brings the pair from the doorway to their places, hats off and cape on, in 4 to 6 seconds', () => {
    const before = freshGame(null), after = letIn(before).game, c = cast(after)
    const beats = comingIn(c, before, after)
    let sawHats = false, sawDoor = false
    const length = playThrough(beats, () => { if (c.staging.hats === 1) sawHats = true; if (c.staging.door > 0.9) sawDoor = true })
    expect(length).toBeGreaterThanOrEqual(4)
    expect(length).toBeLessThanOrEqual(6)
    expect(sawHats && sawDoor).toBe(true)
    const places = placesOf(after)
    expect(c.staging).toMatchObject({ customer: { x: places.customer!.x, y: places.customer!.y, s: 1 }, friend: { x: places.friend!.x }, hats: 0, cape: 1, door: 0, waiting: 1, leaving: [] })
    expect(c.cues).toEqual(expect.arrayContaining(['door', 'hatOff', 'hairOut', 'capeOn', 'doorShut']))
    expect(c.customer()!.started).toEqual(expect.arrayContaining(['lion-settles-with-a-thump', 'lion-shakes-his-mane-free', 'lion-looks-from-his-lock-to-the-other']))
    expect(c.friend()!.started).toContain('poodle-points-her-nose-at-each-in-turn')
  })

  it('sends the pair that was done out past them', () => {
    const done = capeOff(seated()).game, after = letIn(done).game, c = cast(after)
    const scene = new Scene(comingIn(c, done, after))
    scene.start(0, () => {})
    scene.update(0)
    expect(c.staging.leaving.map((goer) => goer.who)).toEqual(['lion', 'poodle'])
    // Each goes with the hair it has: the customer's mane and lock as the child left them, the friend's own lock.
    expect(c.staging.leaving.map((goer) => goer.lock)).toEqual([done.lock, done.model])
    expect(c.staging.leaving.map((goer) => goer.mane)).toEqual([done.mane, null])
    scene.update(0.9)
    expect(c.staging.leaving[0].at.x).toBeGreaterThan(placesOf(done).customer!.x)
    scene.update(2)
    expect(c.staging.leaving).toEqual([])
  })

  it('lands where it was going when a touch cuts it short, and starts nothing on the way', () => {
    const before = freshGame(null), after = letIn(before).game, c = cast(after)
    const scene = new Scene(comingIn(c, before, after))
    scene.start(0, () => {})
    scene.update(0.3)
    const heard = c.cues.length
    c.cut = true
    scene.finish()
    expect(scene.running).toBe(false)
    const places = placesOf(after)
    expect(c.staging).toMatchObject({ customer: { x: places.customer!.x, y: places.customer!.y }, friend: { x: places.friend!.x }, hats: 0, cape: 1, door: 0, waiting: 1, leaving: [] })
    expect(c.cues.length).toBe(heard)
    expect(c.customer()!.started).toEqual([])
  })
})

describe('the cape coming off', () => {
  it.each([
    ['too long', {}, 'too-long', 'tooLong'],
    ['too short', { lock: 8 }, 'too-short', 'tooShort'],
    ['as long', { lock: 44, model: 44 }, 'as-long', 'asLong'],
  ] as const)('acts out a lock that is %s: the two locks, the customer\'s own reaction, and no verdict', (_name, over, kind, cue) => {
    const before = seated(over), done = capeOff(before), c = cast(done.game)
    const beats = capeComesOff(c, before, done.game, done.showing!)
    let acted: string | null = null
    const length = playThrough(beats, () => { if (c.staging.fx) acted = c.staging.fx.kind })
    expect(acted).toBe(kind)
    expect(length).toBeGreaterThanOrEqual(4)
    expect(length).toBeLessThanOrEqual(10)
    expect(c.cues).toEqual(expect.arrayContaining(['capeOff', cue]))
    expect(c.staging).toMatchObject({ cape: 0, fx: null })
    // What sounds is the two lengths, never a cheer or a buzzer: there is no such cue to give.
    expect(c.cues.every((heard) => ['capeOff', 'landed', 'tooLong', 'tooShort', 'asLong', 'flap', 'air'].includes(heard))).toBe(true)
    expect(c.staging.paw).toBeNull()
  })

  it('has the customer take hold of a lock that is too long level with the friend\'s end, and the piece below flaps the more the longer it is', () => {
    const flaps = (lock: number): number => {
      const before = seated({ lock, model: 40 }), done = capeOff(before), c = cast(done.game)
      const modelEnd = COLLAR_Y + 40 * STEP
      let held = 0, kicked = 0
      playThrough(capeComesOff(c, before, done.game, done.showing!), () => {
        if (c.staging.fx && c.staging.paw && Math.abs(c.staging.paw.y - modelEnd) < 1 && Math.abs(c.staging.paw.x - LOCK_X) < 8) held++
        kicked = Math.max(kicked, Math.abs(c.hair.strands.lock.kick.v))
      })
      expect(held).toBeGreaterThan(20)
      expect(kicked).toBeGreaterThan(2)
      return c.cues.filter((cue) => cue === 'flap').length
    }
    expect(flaps(90)).toBeGreaterThan(flaps(52))
  })

  it('has the customer feel on down from the end of a lock that is too short, as far as the friend\'s end, and find air there', () => {
    const before = seated({ lock: 20, model: 60 }), done = capeOff(before), c = cast(done.game)
    const lockEnd = COLLAR_Y + 20 * STEP, modelEnd = COLLAR_Y + 60 * STEP
    let top = Infinity, bottom = -Infinity, flicked = 0
    playThrough(capeComesOff(c, before, done.game, done.showing!), () => {
      if (c.staging.fx && c.staging.paw) { top = Math.min(top, c.staging.paw.y); bottom = Math.max(bottom, c.staging.paw.y) }
      flicked = Math.min(flicked, c.hair.strands.model.kick.v)
    })
    // From the end of its own lock down through the gap to where the friend's lock ends, and no further.
    expect(top).toBeLessThanOrEqual(lockEnd + 1)
    expect(bottom).toBeGreaterThan(modelEnd - 2)
    expect(bottom).toBeLessThanOrEqual(modelEnd + 1)
    expect(c.cues.filter((cue) => cue === 'air').length).toBeGreaterThanOrEqual(2)
    // Then the friend's longer end flicks over at it.
    expect(flicked).toBeLessThan(-2)
    expect(c.customer()!.started).toContain('lion-pats-for-it-and-an-ear-flicks-out')
  })

  it('has the two ends meet in the customer\'s paw when they are as long, and the two locks swing as one', () => {
    const before = seated({ lock: 44, model: 44 }), done = capeOff(before), c = cast(done.game)
    let together = 0, met = 0
    playThrough(capeComesOff(c, before, done.game, done.showing!), () => {
      const { lock, model } = c.hair.strands
      // Both are set swinging the same way at the same moment, with the paw at the place where the two ends meet.
      if (lock.swing.v > 1 && lock.swing.v === model.swing.v) together++
      if (c.staging.paw && Math.abs(c.staging.paw.y - (COLLAR_Y + 44 * STEP)) < 1 && c.staging.paw.x > LOCK_X && c.staging.paw.x < LOCK_X + 36) met++
    })
    expect(together).toBeGreaterThan(0)
    expect(met).toBeGreaterThan(10)
  })

  it('brings a friend who sat across the room over to stand cheek to cheek', () => {
    const before = seated({ seat: 'across' }), done = capeOff(before), c = cast(done.game)
    c.staging.settle(before)
    const startX = c.staging.friend!.x
    playThrough(capeComesOff(c, before, done.game, done.showing!))
    expect(startX).toBeLessThan(250)
    expect(c.staging.friend!.x).toBe(placesOf(done.game).friend!.x)
    expect(c.staging.friend!.x).toBeGreaterThan(600)
  })

  it('stars the exact haircut: the mane the customer likes or hates, its bow, and what it wears', () => {
    const liked = seated({ mane: Array(TUFTS).fill(90), ribbon: { len: 30, at: 'mane', tuft: 4 }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 9, hue: 'lion', on: 'face', who: 'friend', spot: 'lip' }] })
    const done = capeOff(liked), c = cast(done.game)
    const long = playThrough(capeComesOff(c, liked, done.game, done.showing!))
    expect(c.customer()!.started).toEqual(expect.arrayContaining(['lion-shakes-it-out-and-rumbles', 'lion-goes-cross-eyed-and-bats-at-it']))
    expect(c.friend()!.started).toContain('poodle-admires-it-sideways')
    const plain = seated({ mane: Array(TUFTS).fill(48) }), plainDone = capeOff(plain), c2 = cast(plainDone.game)
    const short = playThrough(capeComesOff(c2, plain, plainDone.game, plainDone.showing!))
    // A scene with more to show is longer; one with a middling mane and nothing worn says nothing about them.
    expect(long).toBeGreaterThan(short)
    expect(c2.customer()!.started.some((id) => id.includes('mane') || id.includes('rumbles') || id.includes('cape-over-head'))).toBe(false)
    expect(long).toBeLessThanOrEqual(10)
  })
})

describe('a thing shown once', () => {
  it('shows the snip on the customer\'s own mane: the longest tuft is drawn as it was until the paw has nipped it', () => {
    const before = seated({ mane: [40, 90, 12, 50, 55, 61, 47, 33, 58] }), after = markShown(before, 'snip'), c = cast(after)
    const beats = shownOnce(c, 'snip', before, after)
    const scene = new Scene(beats)
    scene.start(0, () => {})
    scene.update(0)
    // The paw comes out of the cape with the scissors, on the far side from the friend, and goes to that tuft.
    expect(c.staging.paw).toEqual({ ...PAW_HOME, scissors: 1 })
    expect(c.hair.tufts[1].rest).toBeGreaterThan(1.4)
    scene.update(1.2)
    const tuft = tuftPose('lion', 1, 90, 9), at = onHead({ x: HEAD.x, y: HEAD.y, s: 1 }, { x: tuft.base.x + (tuftTip(tuft).x - tuft.base.x) * 0.7, y: tuft.base.y + (tuftTip(tuft).y - tuft.base.y) * 0.7 })
    expect(c.staging.paw!.x).toBeCloseTo(at.x, 0)
    expect(c.staging.paw!.y).toBeCloseTo(at.y, 0)
    scene.update(1.6)
    expect(c.hair.tufts[1].rest).toBe(1)
    expect(c.cues).toContain('nip')
    scene.update(3)
    expect(c.staging.paw).toBeNull()
    expect(sceneLength(beats)).toBeGreaterThanOrEqual(2)
    expect(sceneLength(beats)).toBeLessThanOrEqual(8)
    expect(c.customer()!.started).toContain('lion-watches-his-own-paw')
  })

  it('shows the pull on the shortest tuft, which is drawn out as the paw tugs', () => {
    const before = seated({ mane: [40, 90, 12, 50, 55, 61, 47, 33, 58] }), after = markShown(before, 'pull'), c = cast(after)
    const scene = new Scene(shownOnce(c, 'pull', before, after))
    scene.start(0, () => {})
    scene.update(0)
    expect(c.staging.paw).toEqual({ ...PAW_HOME, scissors: null })
    const start = c.hair.tufts[2].rest
    expect(start).toBeLessThan(0.8)
    scene.update(0.75)
    const gripped = { ...c.staging.paw! }
    scene.update(1.2)
    expect(c.hair.tufts[2].rest).toBeGreaterThan(start)
    // The paw goes out along the tuft as it draws it longer.
    expect(Math.hypot(c.staging.paw!.x - gripped.x, c.staging.paw!.y - gripped.y)).toBeGreaterThan(10)
    scene.update(3)
    expect(c.hair.tufts[2].rest).toBe(1)
    expect(c.cues).toContain('tug')
  })

  it('shows the ribbon: the friend makes it as long as its own tail, holds it beside the customer\'s, and hangs it back', () => {
    const before = sendFriend(seated(), 'across'), after = markShown(before, 'ribbon'), c = cast(after)
    c.staging.settle(before)
    const beats = shownOnce(c, 'ribbon', before, after)
    const lengths: number[] = [], xs: number[] = []
    let tails = 0
    const length = playThrough(beats, () => { if (c.staging.ribbon) { lengths.push(c.staging.ribbon.len); xs.push(c.staging.ribbon.x) } tails = Math.max(tails, c.staging.tails) })
    expect(length).toBeGreaterThanOrEqual(3)
    expect(length).toBeLessThanOrEqual(8)
    expect(Math.min(...lengths)).toBeLessThan(TAIL_LEN)
    expect(Math.max(...lengths)).toBe(TAIL_LEN)
    expect(tails).toBe(1)
    // It was by the peg, and across the room by the customer's tail.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400)
    expect(c.staging).toMatchObject({ ribbon: null, tails: 0, friend: { x: placesOf(after).friend!.x } })
    expect(c.cues).toEqual(expect.arrayContaining(['ribbonTaken', 'ribbonTick', 'ribbonHome']))
    expect(after.ribbon).toEqual({ len: TAIL_LEN, at: 'peg' })
    expect(tailOf({ x: 0, y: 0, s: 1 }).x).toBeGreaterThan(0)
  })

  it('changes nothing about the lock or its model: it is a move, never the answer', () => {
    const before = seated()
    for (const idea of ['snip', 'pull', 'ribbon'] as const) {
      const after = markShown(idea === 'ribbon' ? sendFriend(before, 'across') : before, idea)
      expect([after.lock, after.model]).toEqual([before.lock, before.model])
    }
    expect(backUnderCape(before)).toBe(before)
  })
})
