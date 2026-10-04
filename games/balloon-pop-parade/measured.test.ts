import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { GROUND, skySlots, viewFor, waitingSpot, bunchOffsets } from './layout'
import { saveOf } from './moments'
import type { Pose } from './pose'
import { freshSave } from './save'
import { Theatre, type Painter } from './theatre'
import { give, type Bunch, type Given } from './world'

// What nobody sees by reading the theatre: the game is stepped frame by frame, through whole games played at
// random and through each thing a bunch can do, with a painter that keeps what was drawn, and what the sheet says
// a child sees is measured on that. Nothing is in two places from one frame to the next, a friend begins to answer
// inside half a second, every balloon in front is one size, and no two strings cross.

const VIEW = viewFor(1180, 820)

describe('whole games played fast and at random', () => {
  it('never set a friend of the troop down, or anywhere else, between one frame and the next: whatever cuts a motion short, it falls or rises from where it is', () => {
    for (const [age, seed] of [[3, 5], [4, 11], [2, 3], [4, 17]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const poses = new Map<string, Pose>()
      const painter: Painter = { place: (name, _kind, pose) => void poses.set(name, { ...pose }), drop: (name) => void poses.delete(name), balloon: () => {}, string: () => {}, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {} }
      let state = seed * 7919, before = new Map<string, Pose>(), scene = ''
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 180; i++) {
        let pressed = false
        if (i % 11 === 0) {
          const roll = random()
          if (roll < 0.6) {
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            const slot = random() < 0.6 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length)
            const at = skySlots(theatre.sky.length, VIEW, Math.max(1, ...theatre.sky.map((bunch) => bunch.count)))[slot]
            theatre.press(at.x, at.y, VIEW)
          } else if (roll < 0.72) theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW)
          else theatre.press((random() - 0.5) * VIEW.width, (random() - 0.5) * VIEW.height, VIEW)
          if (random() < 0.92) theatre.release(VIEW)
          else theatre.cancel()
          pressed = true
        }
        theatre.step(1 / 60)
        theatre.paint(painter, VIEW)
        theatre.sounds.length = 0
        // A new troop is a new set of friends, and a touch may end a scene with everything where it was going.
        const now = JSON.stringify([theatre.troop.kind, theatre.troop.size, theatre.save.parade.length, theatre.save.next])
        if (now === scene && !pressed) for (const [name, pose] of poses) {
          const was = before.get(name)
          if (!was || !name.startsWith('friend-')) continue
          expect(Math.abs(pose.y - was.y), `${theatre.troop.kind} ${name}, age ${age}, seed ${seed}, frame ${i}`).toBeLessThan(0.3)
          expect(Math.abs(pose.x - was.x), `${theatre.troop.kind} ${name}, age ${age}, seed ${seed}, frame ${i}`).toBeLessThan(0.45)
        }
        scene = now
        before = new Map([...poses].map(([name, pose]) => [name, { ...pose }]))
      }
    }
  }, 60_000)
})

describe('a balloon', () => {
  /** Every large balloon of one frame, by colour, and a check that each was somewhere near in the frame before: none jumps. */
  const follower = (step: number) => {
    let before: { x: number; y: number; colour: string }[] | null = null
    const now: { x: number; y: number; colour: string }[] = []
    const painter: Painter = { place: () => {}, drop: () => {}, balloon: (x, y, z, wide, _tall, _lean, colour) => { if (wide > 0.7 && z > -5) now.push({ x, y, colour }) }, string: () => {}, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {} }
    const frame = (theatre: Theatre, label: string, afresh = false) => {
      // The balloons far off, on the far hill, are small and are not followed; those in front all are.
      now.length = 0
      theatre.paint(painter, VIEW)
      if (before && !afresh) for (const balloon of now) {
        const near = before.filter((other) => other.colour === balloon.colour).map((other) => Math.hypot(other.x - balloon.x, other.y - balloon.y))
        // One that was not there a frame ago is new: it grows into the sky from nothing, or drifts down from above.
        if (near.length < now.filter((other) => other.colour === balloon.colour).length) continue
        expect(Math.min(...near), `${label}: a balloon at ${balloon.x.toFixed(2)}, ${balloon.y.toFixed(2)}`).toBeLessThan(step)
      }
      before = now.map((balloon) => ({ ...balloon }))
    }
    return { frame }
  }
  const tap = (theatre: Theatre, slot: number) => {
    const at = skySlots(theatre.sky.length, VIEW, Math.max(1, ...theatre.sky.map((bunch) => bunch.count)))[slot]
    theatre.press(at.x, at.y, VIEW)
    theatre.release(VIEW)
  }

  it('is never in two places from one frame to the next in whole games played at random, with pops and pokes among the taps', () => {
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed), { frame } = follower(0.62)
      let state = seed * 32452843
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      let scene = ''
      for (let i = 0; i < 60 * 150; i++) {
        let pressed = false
        if (i % 19 === 0) {
          const roll = random()
          if (roll < 0.5) tap(theatre, Math.floor(random() * theatre.sky.length))
          else if (roll < 0.58) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 6, VIEW); theatre.cancel() }
          pressed = true
        }
        theatre.step(1 / 60)
        theatre.sounds.length = 0
        // A touch may pop a balloon or end a scene, and a new troop is a new scene: the frame after either starts afresh.
        const now = JSON.stringify([theatre.troop.kind, theatre.troop.size, theatre.save.parade.length, theatre.save.next, theatre.playing])
        if (pressed || now !== scene) frame(theatre, `age ${age}, seed ${seed}, frame ${i}`, true)
        else frame(theatre, `age ${age}, seed ${seed}, frame ${i}`)
        scene = now
      }
    }
  }, 90_000)

  it.each(['duck', 'frog', 'hippo', 'crab'] as const)('of a bunch with one for each goes from the bunch to the hand of the %s that takes it, and is never in two places from one frame to the next', (kind) => {
    for (const size of [2, 3] as const) {
      const save = saveOf({ position: 'bunches-own-colour', troop: { kind, size, held: Array.from({ length: size }, () => false) }, sky: [{ colour: kind, count: 1 }, { colour: kind, count: size }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } })
      const theatre = new Theatre(save, 3), { frame } = follower(0.5)
      theatre.step(1 / 60)
      frame(theatre, 'before')
      tap(theatre, 1)
      for (let i = 0; i < 60 * 4; i++) { theatre.step(1 / 60); frame(theatre, `${size} ${kind}s, frame ${i}`) }
      expect(theatre.troop.held.every(Boolean)).toBe(true)
    }
  })

  it.each(['duck', 'frog', 'hippo', 'crab'] as const)('of a bunch that is too many, or one more each, is pulled to where it hangs over a %s and never jumps there', (kind) => {
    for (const [held, count] of [[[false, false], 3], [[true, false], 2], [[true, true], 2], [[true, true, true], 3], [[true], 3]] as const) {
      const save = saveOf({ position: 'bunches-own-colour', troop: { kind, size: held.length as 1 | 2 | 3, held: [...held] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 1 } })
      const theatre = new Theatre(save, 5), { frame } = follower(0.6)
      theatre.step(1 / 60)
      frame(theatre, 'before')
      tap(theatre, 1)
      // Until it is let go and gets away, which is fast and ends in a pop.
      for (let i = 0; i < 60 * (0.5 + PERSONALITIES[kind].cue.letGo) - 2; i++) { theatre.step(1 / 60); frame(theatre, `${count} for ${held.join()}, ${kind}, frame ${i}`) }
    }
  })

  it('that a passing troop takes goes from where it hung low to the hand that takes it, and follows as the troop walks off', () => {
    // New games of every first-visit start, and the first bunches shown inside a step-in, for each kind that can pass.
    const games: Theatre[] = []
    for (const age of [2, 3, 4]) for (const seed of [1, 2, 3, 5, 8, 13]) games.push(new Theatre(freshSave(age, seed), seed))
    for (const kind of ['duck', 'frog', 'hippo', 'crab'] as const) for (const seed of [1, 2, 3]) {
      const save = { ...saveOf({ position: 'bunches-own-colour', troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: kind === 'duck' ? 'frog' : 'duck', size: 3 } }), shown: { give: true, each: true, bunch: false } }
      const theatre = new Theatre(save, seed)
      theatre.step(1 / 60)
      theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW)
      theatre.cancel()
      expect(theatre.playing).toBe('arrival')
      games.push(theatre)
    }
    games.forEach((theatre, g) => {
      const { frame } = follower(0.5)
      for (let i = 0; i < 60 * 9; i++) { theatre.step(1 / 60); frame(theatre, `game ${g}, frame ${i}`) }
    })
  })
})

describe('what the sheet says of every kind, measured on a theatre that is stepped', () => {
  const kinds = ['duck', 'frog', 'hippo', 'crab'] as const
  const SMALL = viewFor(1024, 640)
  const recorder = () => {
    const poses = new Map<string, Pose>()
    const balloons: { x: number; y: number; z: number; wide: number; tall: number }[] = []
    const strings: { x0: number; y0: number; x1: number; y1: number }[] = []
    const painter: Painter = {
      place: (name, _kind, pose) => void poses.set(name, { ...pose }), drop: (name) => void poses.delete(name),
      balloon: (x, y, z, wide, tall) => void balloons.push({ x, y, z, wide, tall }),
      string: (x0, y0, z0, x1, y1, _z1, _colour, thick) => { if ((thick ?? 0.022) < 0.05 && z0 > -5) strings.push({ x0, y0, x1, y1 }) },
      shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {},
    }
    return { poses, balloons, strings, painter, clear: () => { balloons.length = 0; strings.length = 0 } }
  }
  const tap = (theatre: Theatre, slot: number, view = VIEW) => {
    const at = skySlots(theatre.sky.length, view, Math.max(1, ...theatre.sky.map((bunch) => bunch.count)))[slot]
    theatre.press(at.x, at.y, view)
    theatre.release(view)
  }
  const other = (kind: KindName): KindName => (kind === 'duck' ? 'frog' : 'duck')

  it.each(kinds)('a %s begins to answer a bunch well inside half a second of the touch, whatever the bunch turns out to be', (kind) => {
    // Taken, refused, and one too many: each time the friend it is coming to is seen to move by a third of a second.
    for (const [held, bunch] of [[false, { colour: kind, count: 1 }], [false, { colour: other(kind), count: 1 }], [true, { colour: kind, count: 1 }], [false, { colour: kind, count: 2 }]] as const) {
      const theatre = new Theatre(saveOf({ position: 'bunches-mixed', troop: { kind, size: 1, held: [held] }, sky: [{ ...bunch }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 2), { poses, painter } = recorder()
      const still = new Theatre(saveOf({ position: 'bunches-mixed', troop: { kind, size: 1, held: [held] }, sky: [{ ...bunch }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 2), rest = recorder()
      tap(theatre, 0)
      let moved = 0
      for (let i = 0; i < 20; i++) {
        theatre.step(1 / 60)
        still.step(1 / 60)
        theatre.paint(painter, VIEW)
        still.paint(rest.painter, VIEW)
        const pose = poses.get('friend-0')!, calm = rest.poses.get('friend-0')!
        moved = Math.max(moved, Math.abs(pose.y - calm.y) + Math.abs(pose.squash - calm.squash) + Math.abs(pose.nod - calm.nod) * 0.3)
      }
      // A third of a second after the touch it has stretched, risen or turned by more than a tenth of its own height.
      expect(moved, `${bunch.count} of ${bunch.colour} for a ${kind} that ${held ? 'has' : 'wants'} one`).toBeGreaterThan(0.12)
    }
  })

  it.each(kinds)('a %s that is in the air is touched where it is, answers a poke there, and does its proud move when it is down', (kind) => {
    // The balloon that serves it, and one more at once: it is carried off while its ending is due.
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 4), { poses, painter } = recorder()
    tap(theatre, 0)
    for (let i = 0; i < 12; i++) theatre.step(1 / 60)
    tap(theatre, 1)
    theatre.sounds.length = 0
    let proudHeard = -1, upWhenHeard = 0, poked = false, wobble = 0, last = 1
    for (let i = 0; i < 60 * 9; i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      const pose = poses.get('friend-0')!, high = pose.y - GROUND, tall = BODIES[kind].height * 1.08
      if (!poked && high > tall * 0.35 && kind !== 'hippo') {
        // Its head is up there; the ground under it is bare.
        expect(theatre.hit(pose.x, pose.y + tall * 0.7, VIEW), 'its head, in the air').toEqual({ on: 'friend', friend: 0 })
        expect(theatre.hit(pose.x, GROUND + 0.1, VIEW).on, 'the ground it left').not.toBe('friend')
        theatre.press(pose.x, pose.y + tall * 0.7, VIEW)
        theatre.cancel()
        poked = true
        last = pose.squash
      } else if (poked && i % 2 === 0 && wobble < 0.05) {
        wobble = Math.max(wobble, Math.abs(pose.squash - last))
        last = pose.squash
      }
      // The proud move's squeak is the quieter one; a poke's is at full strength.
      const proud = theatre.sounds.find((sound) => sound.voice === `${kind}Poke` && sound.gain === 0.8)
      if (proud && proudHeard < 0) { proudHeard = i; upWhenHeard = high }
    }
    if (kind !== 'hippo') {
      expect(poked).toBe(true)
      expect(wobble, 'it wobbles where it hangs').toBeGreaterThan(0.02)
    }
    // The proud move is heard once, and when it is heard the friend is on the ground doing it.
    expect(proudHeard).toBeGreaterThan(0)
    expect(upWhenHeard).toBeLessThan(0.3)
    expect(theatre.sounds.filter((sound) => sound.voice === `${kind}Poke` && sound.gain === 0.8)).toHaveLength(1)
  })

  it.each(kinds)('a %s gives one answer at a time: a balloon sent while it refuses another waits for the refusal, and one refused while it takes its own waits for the catch', (kind) => {
    for (const first of ['other', 'own'] as const) {
      const sky = first === 'other' ? [{ colour: other(kind), count: 1 as const }, { colour: kind, count: 1 as const }] : [{ colour: kind, count: 1 as const }, { colour: other(kind), count: 1 as const }]
      const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky, waiting: { kind: other(kind), size: 1 } }), 6)
      tap(theatre, 0)
      for (let i = 0; i < 24; i++) theatre.step(1 / 60)
      tap(theatre, 1)
      const heard: Record<string, number> = {}
      for (let i = 0; i < 60 * 6; i++) {
        theatre.step(1 / 60)
        for (const sound of theatre.sounds) heard[sound.voice] = heard[sound.voice] ?? i + Math.round(sound.after * 60)
      }
      const p = PERSONALITIES[kind], done = heard[kind === 'hippo' ? 'raspberry' : 'pop']
      expect(theatre.troop.held, first).toEqual([true])
      expect(heard[`${kind}Catch`], first).toBeGreaterThanOrEqual(0)
      expect(heard[`${kind}Refuse`], first).toBeGreaterThanOrEqual(0)
      // The refusal lands on the bunch when its motion has got there, and not before: the whole look is seen.
      expect(done - heard[`${kind}Refuse`], `${first} first: the refusal is played before it lands`).toBeGreaterThanOrEqual(Math.floor((p.cue.hit / 1.07) * 60) - 2)
      if (first === 'other') expect(heard[`${kind}Catch`], 'the catch comes after the refusal has landed').toBeGreaterThanOrEqual(done)
      else expect(heard[`${kind}Refuse`], 'the refusal begins when the catch is over').toBeGreaterThanOrEqual(heard[`${kind}Catch`] + Math.floor(((p.lasts.catch - p.cue.grab) / 1.07) * 60) - 2)
    }
  })

  it.each(kinds)('a %s that is served by a balloon sent while it is carried off catches it when it is down, and its ending waits for that catch', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 3 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 8), { poses, balloons, painter, clear } = recorder()
    tap(theatre, 0)
    for (let i = 0; i < Math.round((0.5 + PERSONALITIES[kind].cue.grab + 0.3) * 60); i++) theatre.step(1 / 60)
    // The single, where it is seen: the bunch that carries the friend off may have risen in front of part of it.
    const single = (theatre as unknown as { slots: (view: typeof VIEW) => { x: number; y: number }[] }).slots(VIEW)[1]
    const seen = [0, -0.35, 0.35, -0.7, 0.7].flatMap((dy) => [0, -0.35, 0.35, -0.7, 0.7].map((dx) => ({ x: single.x + dx, y: single.y + dy }))).find((at) => { const hit = theatre.hit(at.x, at.y, VIEW); return hit.on === 'bunch' && hit.slot === 1 })!
    theatre.press(seen.x, seen.y, VIEW)
    theatre.release(VIEW)
    expect(theatre.save.finished).toBe(true)
    let caught = -1, ending = -1, inHand = -1, proud = -1
    for (let i = 0; i < 60 * 8 && proud < 0; i++) {
      theatre.step(1 / 60)
      clear()
      theatre.paint(painter, VIEW)
      if (caught < 0 && theatre.sounds.some((sound) => sound.voice === `${kind}Catch`)) caught = i
      const pose = poses.get('friend-0')!
      // Its own balloon is in its hand when it bobs over its string hand, as a held balloon does.
      if (inHand < 0 && balloons.some((balloon) => balloon.z > -5 && balloon.wide === 1 && Math.abs(balloon.x - pose.x - 0.7) < 0.35 && Math.abs(balloon.y - GROUND - 4) < 0.5)) inHand = i
      if (ending < 0 && theatre.playing === 'ending') ending = i
      // The proud move's squeak is the quieter one.
      if (theatre.sounds.some((sound) => sound.voice === `${kind}Poke` && sound.gain === 0.8)) proud = i
    }
    expect(caught).toBeGreaterThan(0)
    expect(inHand).toBeGreaterThan(caught)
    // The ending begins with the catch that causes it, and its proud move comes when the whole catch has been
    // played and the balloon is in the hand.
    expect(ending).toBeGreaterThanOrEqual(caught)
    expect(proud - caught).toBeGreaterThanOrEqual(Math.floor(PERSONALITIES[kind].lasts.catch * 0.6 * 60))
    expect(proud).toBeGreaterThanOrEqual(inHand)
  })

  it.each(kinds)('a %s refuses two wrong bunches sent close together one at a time: each hangs beside it alone, and each is answered by a refusal of its own', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: other(kind), count: 1 }, { colour: other(kind), count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 9), { poses, balloons, painter, clear } = recorder()
    tap(theatre, 0)
    for (let i = 0; i < 18; i++) theatre.step(1 / 60)
    tap(theatre, 1)
    const refusals: number[] = [], done: number[] = []
    let most = 0, seen = 0, ends = 0
    for (let i = 0; i < 60 * 6; i++) {
      theatre.step(1 / 60)
      const begun = theatre.sounds.filter((sound) => sound.voice === `${kind}Refuse`).length
      while (refusals.length < begun) refusals.push(i)
      const landed = theatre.sounds.filter((sound) => sound.voice === (kind === 'hippo' ? 'raspberry' : 'pop')).length
      while (done.length < landed) done.push(i)
      clear()
      theatre.paint(painter, VIEW)
      const pose = poses.get('friend-0')!
      // Bunches hanging beside it: below the row, near it, and still.
      // (A bunch on its way or hanging is drawn at its own depth; one the frog has bounced off is on its way out, in front.)
      const beside = balloons.filter((balloon) => Math.abs(balloon.z - 0.35) < 0.03 && balloon.wide > 0.8 && balloon.y < GROUND + 2.6 && Math.abs(balloon.x - pose.x) < 2.6).length
      most = Math.max(most, beside)
      if (beside > 0) seen += 1
      else if (seen > 0 && ends === 0 && done.length === 1) ends = i
    }
    expect(refusals).toHaveLength(2)
    expect(done).toHaveLength(2)
    expect(most, 'never two beside it at once').toBe(1)
    const p = PERSONALITIES[kind]
    // Each refusal lands on its own bunch, at its own moment, and the second begins when the first is over.
    for (const k of [0, 1]) expect(done[k] - refusals[k], `refusal ${k}`).toBeGreaterThanOrEqual(Math.floor((p.cue.hit / 1.07) * 60) - 2)
    expect(done[1] - done[0]).toBeGreaterThanOrEqual(Math.floor((p.lasts.refuse / 1.07 - p.cue.hit / 0.93) * 60))
    expect(refusals[1]).toBeGreaterThan(done[0])
  })

  it.each(kinds)('a %s finishes the answer it is giving when it is poked or its balloon is popped meanwhile, and its start at a pop is not cut by the next balloon', (kind) => {
    // Poked during the look before a refusal: the refusal still lands at its moment, on the bunch.
    const refusing = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: other(kind), count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), look = recorder()
    tap(refusing, 0)
    let began = -1, landed = -1
    for (let i = 0; i < 60 * 3 && landed < 0; i++) {
      refusing.step(1 / 60)
      if (began < 0 && refusing.sounds.some((sound) => sound.voice === `${kind}Refuse`)) {
        began = i
        refusing.paint(look.painter, VIEW)
        const pose = look.poses.get('friend-0')!
        refusing.press(pose.x, pose.y + 0.8, VIEW)
        refusing.cancel()
      }
      if (refusing.sounds.some((sound) => sound.voice === (kind === 'hippo' ? 'raspberry' : 'pop'))) landed = i
    }
    expect(began).toBeGreaterThan(0)
    expect(refusing.sounds.some((sound) => sound.voice === `${kind}Poke`), 'the poke is heard').toBe(true)
    expect(landed - began, 'and the refusal is not cut short by it').toBeGreaterThanOrEqual(Math.floor((PERSONALITIES[kind].cue.hit / 1.07) * 60) - 2)

    // Its balloon popped, and another sent at once: the whole start is played before the catch begins.
    const popped = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), seen = recorder()
    popped.step(1 / 60)
    popped.paint(seen.painter, VIEW)
    const own = seen.balloons.find((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)!
    popped.press(own.x, own.y, VIEW)
    popped.cancel()
    expect(popped.troop.held).toEqual([false])
    for (let i = 0; i < 6; i++) popped.step(1 / 60)
    tap(popped, 0)
    let caught = -1
    for (let i = 0; i < 60 * 5 && caught < 0; i++) {
      popped.step(1 / 60)
      if (popped.sounds.some((sound) => sound.voice === `${kind}Catch`)) caught = i
    }
    const p = PERSONALITIES[kind]
    // The catch is heard as the balloon arrives, which is no sooner than the start is over.
    expect(caught + 6, `${kind}: the catch waits for the start`).toBeGreaterThanOrEqual(Math.floor((p.lasts.popped / 1.07) * 60) - 2)
    expect(popped.troop.held).toEqual([true])
  })

  it.each(kinds)('a %s has its ending from the moment its last balloon is in its hand: a pop a moment later is a touch that ends the scene, and the game goes on as the same save reopened would', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 5), { balloons, painter, clear } = recorder()
    const callWaiting = (stage: Theatre) => { stage.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); stage.cancel() }
    tap(theatre, 0)
    expect(theatre.save.finished).toBe(true)
    // The scene begins as the balloon arrives, half a second after the lift, and not later.
    let began = -1
    for (let i = 0; i < 45 && began < 0; i++) { theatre.step(1 / 60); if (theatre.playing === 'ending') began = i }
    expect(began).toBeGreaterThanOrEqual(28)
    expect(began).toBeLessThanOrEqual(33)
    // A third of a second on, the balloon is popped.
    for (let i = 0; i < 20; i++) theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.filter((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)[0]
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    expect(theatre.troop.held).toEqual([false])
    expect(theatre.playing, 'the touch ended the scene').toBe(null)
    for (let i = 0; i < 60 * 2; i++) theatre.step(1 / 60)
    // What a tap on the waiting troop does now is what it does when the same save is opened again: the troop steps in.
    const reopened = new Theatre(JSON.parse(JSON.stringify(theatre.save)), 5)
    callWaiting(reopened)
    callWaiting(theatre)
    expect(reopened.playing).toBe('arrival')
    expect(theatre.playing).toBe('arrival')
  })

  it('sends frogs\' tongues over one another\'s heads to a bunch with one for each: two cross in the air above the frogs, three go up side by side with no two crossing, and none goes through a frog', () => {
    // Three frogs and a bunch of three, where two that crossed would cross on the middle one's tongue, three lines
    // through one point; and two frogs either side of one that has its balloon, with a bunch of two.
    for (const [held, count] of [[[false, false, false], 3], [[false, true, false], 2]] as const) {
      const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind: 'frog', size: 3, held: [...held] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count }], waiting: { kind: 'duck', size: 1 } }), 4)
      const poses = new Map<string, Pose>(), tongues: { x0: number; y0: number; x1: number; y1: number }[] = []
      const painter: Painter = { place: (name, _kind, pose) => void poses.set(name, { ...pose }), drop: () => {}, balloon: () => {}, string: (x0, y0, _z0, x1, y1, _z1, _colour, thick) => { if ((thick ?? 0) > 0.05 && (thick ?? 0) < 0.1) tongues.push({ x0, y0, x1, y1 }) }, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {} }
      tap(theatre, 1)
      let crossedInAir = 0, crossed = 0, out = 0
      for (let i = 0; i < 90; i++) {
        theatre.step(1 / 60)
        tongues.length = 0
        theatre.paint(painter, VIEW)
        if (tongues.length === 0) continue
        out += 1
        // No piece of a tongue is in another frog's head: a head is 0.9 either side of its middle, from 0.9 to 2.15 up.
        // (A tongue is drawn as four pieces from its frog's mouth; the frog it starts at is its own.)
        tongues.forEach((piece, k) => {
          const first = tongues[k - (k % 4)]
          for (const pose of poses.values()) {
          const x = (piece.x0 + piece.x1) / 2, y = (piece.y0 + piece.y1) / 2
          if (Math.abs(first.x0 - pose.x) < 0.3) continue
          expect(Math.abs(x - pose.x) < 0.9 && y > pose.y + 0.9 && y < pose.y + 2.15, `${count} for ${held.join()}, frame ${i}: a tongue at ${x.toFixed(2)}, ${(y - GROUND).toFixed(2)} in the head of the frog at ${pose.x.toFixed(2)}`).toBe(false)
          }
        })
        // Two tongues cross where a piece of one meets a piece of another, above every head.
        let crossing = false
        for (let a = 0; a < tongues.length; a++) for (let b = a + 1; b < tongues.length; b++) {
          const p = tongues[a], q = tongues[b], d = (p.x1 - p.x0) * (q.y1 - q.y0) - (p.y1 - p.y0) * (q.x1 - q.x0)
          if (Math.abs(d) < 1e-9) continue
          const t = ((q.x0 - p.x0) * (q.y1 - q.y0) - (q.y0 - p.y0) * (q.x1 - q.x0)) / d, u = ((q.x0 - p.x0) * (p.y1 - p.y0) - (q.y0 - p.y0) * (p.x1 - p.x0)) / d
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && Math.floor(a / 4) !== Math.floor(b / 4)) crossed += 1
          if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98 && p.y0 + (p.y1 - p.y0) * t > GROUND + 2.2) crossing = true
        }
        if (crossing) crossedInAir += 1
      }
      expect(out, 'the tongues are out for a good while').toBeGreaterThan(15)
      if (count === 3) expect(crossed, 'three tongues: no two cross').toBe(0)
      else expect(crossedInAir, `${count} for ${held.join()}: crossed in the air`).toBeGreaterThan(10)
    }
  })

  it('never has a catch heard that is not played: in whole games played fast and at random, a friend is taking hold whenever its catch sounds', () => {
    let catches = 0
    for (const [age, seed] of [[2, 3], [4, 7], [4, 23]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const actors = () => (theatre as unknown as { actors: { clip: string | null; next: string | null; after?: string | null }[] }).actors
      let state = seed * 104729
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 150; i++) {
        if (i % 7 === 0) {
          const roll = random()
          if (roll < 0.75) {
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            tap(theatre, random() < 0.6 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length))
          } else if (roll < 0.85) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * VIEW.width, (random() - 0.5) * VIEW.height, VIEW); theatre.cancel() }
        }
        theatre.sounds.length = 0
        const kind = theatre.troop.kind
        theatre.step(1 / 60)
        const heard = theatre.sounds.filter((sound) => sound.voice === `${kind}Catch`).length
        if (heard === 0) continue
        catches += heard
        // Each catch that sounds belongs to a friend whose catch is being played, or is the next thing it does.
        const taking = actors().filter((actor) => actor.clip === 'catch' || actor.next === 'catch' || actor.after === 'catch').length
        expect(taking, `age ${age}, seed ${seed}, frame ${i}`).toBeGreaterThan(0)
      }
    }
    expect(catches).toBeGreaterThan(100)
  }, 60_000)

  it('takes a pop in its kind\'s own way again once a balloon is in the hand: a duck whose balloon is popped just after it took it leaps, and one popped in the air only wobbles', () => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind: 'duck', size: 1, held: [false] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 1 } }), 2), { poses, balloons, painter, clear } = recorder()
    tap(theatre, 0)
    // A few frames after the balloon is in its hand, while the catch still plays.
    for (let i = 0; i < 40; i++) theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.filter((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.6)[0]
    theatre.sounds.length = 0
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    expect(theatre.sounds.map((sound) => sound.voice)).toEqual(expect.arrayContaining(['pop', 'duckStartle']))
    let highest = 0
    for (let i = 0; i < 40; i++) {
      theatre.step(1 / 60)
      theatre.paint(painter, VIEW)
      highest = Math.max(highest, poses.get('friend-0')!.y - GROUND)
    }
    // Straight up, as a duck starts at a pop: far more than a wobble.
    expect(highest).toBeGreaterThan(0.6)
  })

  it('points the hand that shows the way at something a tap answers as the hand shows: the troop that waits once a tap there steps it in, and a bunch until then', () => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind: 'duck', size: 1, held: [false] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 1 } }), 2)
    let hand: { x: number; y: number } | null = null
    const painter: Painter = { ...recorder().painter, hand: (x, y, size) => { hand = size > 0.02 ? { x, y } : null } }
    const shown = () => { hand = null; theatre.paint(painter, VIEW, { glow: 1, demo: 0.5, demoIndex: 0 }); return hand as { x: number; y: number } | null }
    // Not served: the hand is in the sky, on a bunch.
    theatre.step(1 / 60)
    expect(shown()!.y).toBeGreaterThan(1.5)
    // Served, the ending left to play out: the hand is on the troop that waits, and a tap there steps it in.
    tap(theatre, 0)
    for (let i = 0; i < 60 * 9; i++) theatre.step(1 / 60)
    expect(theatre.playing).toBe(null)
    const at = shown()!
    expect(at.x).toBeLessThan(-VIEW.width / 2 + 3)
    // The fingertip is drawn at the point it touches.
    theatre.press(at.x - 0.3, at.y, VIEW)
    theatre.cancel()
    expect(theatre.playing).toBe('arrival')
  })

  it.each(kinds)('a bunch finds the troop as the rule found it when it was sent: bunches reach %ss in the order they were sent, with every earlier balloon already in its hand', (kind) => {
    // Two friends; the three (too many: one is carried off), the single (taken), the two (too many for the one that still wants one).
    const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind, size: 2, held: [false, false] }, sky: [{ colour: kind, count: 3 }, { colour: kind, count: 1 }, { colour: kind, count: 2 }], waiting: { kind: other(kind), size: 1 } }), 3), { poses, balloons, painter, clear } = recorder()
    const lifts: number[] = []
    for (const slot of [0, 1, 2]) {
      tap(theatre, slot)
      lifts.push(theatre.sounds.filter((sound) => sound.voice === 'letGo').length)
      for (let i = 0; i < 30; i++) theatre.step(1 / 60)
    }
    expect(lifts).toEqual([1, 2, 3])
    expect(theatre.troop.held.filter(Boolean)).toHaveLength(1)
    // The two is pulled apart over the troop when it takes hold: taller than wide, two of them. In that moment one
    // friend has its balloon in its hand, so one balloon of the two is over the friend that reaches and one over a gap.
    let seen = false
    for (let i = 0; i < 60 * 8 && !seen; i++) {
      theatre.step(1 / 60)
      // The second lift-off is the two taking hold: the first was the three.
      if (theatre.sounds.filter((sound) => sound.voice === `${kind}LiftOff`).length < 2) continue
      // Let it be pulled into place.
      for (let k = 0; k < 24; k++) theatre.step(1 / 60)
      clear()
      theatre.paint(painter, VIEW)
      // A bunch that has hold of a friend is drawn a little taller than wide, by fixed amounts.
      const two = balloons.filter((balloon) => balloon.z > -5 && Math.abs(balloon.wide - 0.96) < 1e-6 && Math.abs(balloon.tall - 1.08) < 1e-6).map((balloon) => balloon.x)
      expect(two).toHaveLength(2)
      const held = balloons.filter((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.tall === 1 && balloon.y < 2.2)
      expect(held, 'the single is in a hand by then').toHaveLength(1)
      const reaching = [0, 1].map((k) => poses.get(`friend-${k}`)!).filter((pose) => Math.abs(held[0].x - pose.x - 0.7) > 0.8)
      expect(reaching).toHaveLength(1)
      expect(two.filter((x) => Math.abs(x - reaching[0].x) < 0.35), 'one over the friend that reaches').toHaveLength(1)
      expect(two.filter((x) => [0, 1].every((k) => Math.abs(x - poses.get(`friend-${k}`)!.x) > 1.2)), 'one with nobody under it').toHaveLength(1)
      seen = true
    }
    expect(seen).toBe(true)
  })

  it.each(kinds)('a balloon sent to a %s that has one, whose own is popped while the new one is on its way, is taken: what arrives is answered as the troop is when it arrives', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), { balloons, painter, clear } = recorder()
    theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.find((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)!
    tap(theatre, 0)
    for (let i = 0; i < 10; i++) theatre.step(1 / 60)
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    // Popped, and wanting one again: the balloon on its way is the one it wants, and the save says so at once.
    expect(theatre.troop.held).toEqual([true])
    expect(theatre.unsaved).toBeGreaterThan(0)
    theatre.sounds.length = 0
    for (let i = 0; i < 60 * 5; i++) theatre.step(1 / 60)
    const heard = theatre.sounds.map((sound) => sound.voice)
    expect(heard).toContain(`${kind}Catch`)
    expect(heard).not.toContain(`${kind}LiftOff`)
    expect(heard).not.toContain('squeal')
    clear()
    theatre.paint(painter, VIEW)
    expect(balloons.filter((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.tall === 1 && balloon.y < 2.2)).toHaveLength(1)
  })

  it('answers a touch on a bunch that is on its way down, and on a balloon that has got away: the one squeaks and squashes and goes on, the other pops', () => {
    // Two wrong bunches for a duck alone: the second takes its time on the way down while the first is refused.
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind: 'duck', size: 1, held: [true] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count: 1 }, { colour: 'duck', count: 2 }], waiting: { kind: 'frog', size: 1 } }), 3), { balloons, painter, clear } = recorder()
    tap(theatre, 1)
    for (let i = 0; i < 18; i++) theatre.step(1 / 60)
    tap(theatre, 0)
    for (let i = 0; i < 22; i++) theatre.step(1 / 60)
    const flying = () => { clear(); theatre.paint(painter, VIEW); return balloons.filter((balloon) => balloon.z > 0.3 && balloon.z < 0.36 && balloon.y > 0) }
    const before = flying()
    expect(before.length).toBeGreaterThan(0)
    // The one still high in the air: the other hangs beside the duck, by the balloon it holds.
    const it = before.reduce((high, balloon) => (balloon.y > high.y ? balloon : high))
    expect(theatre.hit(it.x, it.y, VIEW).on).toBe('flying')
    theatre.sounds.length = 0
    theatre.press(it.x, it.y, VIEW)
    theatre.cancel()
    expect(theatre.sounds.map((sound) => sound.voice)).toEqual(['squeak'])
    theatre.step(1 / 60)
    const after = flying().reduce((high, balloon) => (balloon.y > high.y ? balloon : high))
    expect(Math.abs(after.wide - it.wide)).toBeGreaterThan(0.1)
    for (let i = 0; i < 60 * 4; i++) theatre.step(1 / 60)
    // Now two more for a duck that has one: carried off, it lets them go, and they are tapped as they get away.
    tap(theatre, 2)
    theatre.sounds.length = 0
    let popped = false
    for (let i = 0; i < 60 * 3 && !popped; i++) {
      theatre.step(1 / 60)
      clear()
      theatre.paint(painter, VIEW)
      // One that has got away is drawn in front of everything else, a little taller than wide.
      const away = balloons.find((balloon) => Math.abs(balloon.z - 0.4) < 1e-6)
      if (!away) continue
      expect(theatre.hit(away.x, away.y, VIEW).on).toBe('loose')
      const pops = theatre.sounds.filter((sound) => sound.voice === 'pop').length
      theatre.press(away.x, away.y, VIEW)
      theatre.cancel()
      expect(theatre.sounds.filter((sound) => sound.voice === 'pop').length).toBe(pops + 1)
      popped = true
    }
    expect(popped).toBe(true)
  })

  it('counts no slip for a bunch that is taken after all: sent as too many, read again after a pop and taken, it leaves the cycle one that went well', () => {
    const theatre = new Theatre(saveOf({ position: 'pair-singles', troop: { kind: 'duck', size: 2, held: [true, false] }, sky: [{ colour: 'duck', count: 2 }, { colour: 'duck', count: 1 }], waiting: { kind: 'frog', size: 1 } }), 3), { balloons, painter, clear } = recorder()
    expect(theatre.save.finished).toBe(false)
    theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.find((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)!
    tap(theatre, 0)
    expect(theatre.save.slips).toBe(1)
    for (let i = 0; i < 6; i++) theatre.step(1 / 60)
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    // Both want one now, and the two is one for each: nothing was refused and nothing got away.
    expect(theatre.troop.held).toEqual([true, true])
    expect(theatre.save.finished).toBe(true)
    expect(theatre.save.slips).toBe(0)
    expect(theatre.save.position).toBe('trio-singles')
  })

  it.each(kinds)('answers every bunch as the troop is seen when it arrives, also after a pop: a two that was too many for %ss is one each for two that are seen without a balloon, though a single sent after it had been stored for one of them', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'pair-singles', troop: { kind, size: 2, held: [true, false] }, sky: [{ colour: other(kind), count: 1 }, { colour: kind, count: 2 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), { balloons, painter, clear } = recorder()
    const inside = theatre as unknown as { flights: { bunch: Bunch; given: Given; landed: boolean }[]; held: { shown: boolean }[] }
    theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.find((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)!
    const answered: { count: number; result: string; seen: boolean[] }[] = []
    for (let i = 0; i < 60 * 14; i++) {
      // A wrong bunch, the two, the single, each a third of a second after the other, and then the pop.
      if (i === 30) tap(theatre, 0)
      if (i === 48) tap(theatre, 1)
      if (i === 66) tap(theatre, 2)
      if (i === 84) { theatre.press(own.x, own.y, VIEW); theatre.cancel() }
      const seen = inside.held.map((balloon) => balloon.shown), coming = inside.flights.filter((flight) => !flight.landed)
      theatre.step(1 / 60)
      for (const flight of coming) if (flight.landed) answered.push({ count: flight.bunch.count, result: flight.bunch.colour === kind ? flight.given.result : 'refused', seen })
    }
    // The two arrived over two friends seen without a balloon, and each took one; the single found none wanting.
    expect(answered).toEqual([
      { count: 1, result: 'refused', seen: [true, false] },
      { count: 2, result: 'taken', seen: [false, false] },
      { count: 1, result: 'gotAway', seen: [true, true] },
    ])
    expect(theatre.troop.held).toEqual([true, true])
    expect(theatre.save.finished).toBe(true)
    // One slip, the wrong bunch: the two was taken after all, and the single came after the troop was served.
    expect(theatre.save.slips).toBe(1)
    expect(theatre.save.position).toBe('pair-singles')
  })

  it('answers every bunch as the troop is seen when it arrives, in whole games played at random with pops among the taps: what the rule gives for the balloons seen in hands is what the bunch gets', () => {
    let arrived = 0, afterPop = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11], [2, 13], [4, 17], [3, 19], [4, 23]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed), { balloons, painter, clear } = recorder()
      const inside = theatre as unknown as { flights: { bunch: Bunch; given: Given; landed: boolean }[]; held: { shown: boolean }[] }
      let state = seed * 32452843, popped = -1000
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 150; i++) {
        if (i % 11 === 0) {
          const roll = random()
          if (roll < 0.6) {
            // Mostly the troop's own bunches, so that balloons are held, and popped.
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            tap(theatre, random() < 0.7 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length))
          } else if (roll < 0.66) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else {
            clear()
            theatre.paint(painter, VIEW)
            const held = balloons.filter((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.wide === 1 && balloon.y < 2.2)
            if (held.length > 0) {
              const one = held[Math.floor(random() * held.length)], before = theatre.troop.held.filter((holds) => holds).length
              theatre.press(one.x, one.y, VIEW)
              theatre.cancel()
              if (theatre.troop.held.filter((holds) => holds).length < before || inside.flights.some((flight) => !flight.landed)) popped = i
            }
          }
        }
        const troop = theatre.troop, seen = inside.held.slice(0, troop.size).map((balloon) => balloon.shown), coming = inside.flights.filter((flight) => !flight.landed)
        theatre.step(1 / 60)
        for (const flight of coming) {
          if (!flight.landed) continue
          const rule = give({ kind: troop.kind, size: troop.size, held: seen }, flight.bunch).given, given = flight.given
          arrived += 1
          if (i - popped < 240) afterPop += 1
          expect(given.result, `seed ${seed}, frame ${i}: a bunch of ${flight.bunch.count} for ${seen}`).toBe(rule.result)
          // One each from the left; a friend that was already taking hold when another's balloon was popped keeps what it is taking.
          if (given.result === 'taken' && rule.result === 'taken') {
            expect(given.takers.length, `seed ${seed}, frame ${i}`).toBe(rule.takers.length)
            if (i - popped > 60) expect(given.takers, `seed ${seed}, frame ${i}`).toEqual(rule.takers)
          }
          if (given.result === 'gotAway' && rule.result === 'gotAway') expect(given.spare, `seed ${seed}, frame ${i}`).toBe(rule.spare)
        }
      }
    }
    expect(arrived).toBeGreaterThan(400)
    expect(afterPop).toBeGreaterThan(40)
  }, 120_000)

  it.each(kinds)('a %s alone has no ending without its balloon: given one, sent a wrong bunch a quarter of a second later and popped inside the second, it marches for nothing, and has its ending when it is given another', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), { balloons, painter, clear } = recorder()
    let endings = 0, steps = 0, popped = false
    for (let i = 0; i < 60 * 9; i++) {
      if (i === 6) tap(theatre, 0)
      if (i === 21) tap(theatre, 1)
      if (i >= 40 && !popped) {
        // The balloon in its hand, as soon as it is there: the wrong bunch is still on its way, so the ending waits.
        clear()
        theatre.paint(painter, VIEW)
        const own = balloons.find((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.wide === 1 && balloon.y < 2.2)
        if (own) {
          expect(theatre.playing, 'the ending waits for the wrong bunch').toBe(null)
          theatre.press(own.x, own.y, VIEW)
          theatre.cancel()
          popped = theatre.troop.held[0] === false
        }
      }
      const before = theatre.playing
      theatre.step(1 / 60)
      if (theatre.playing === 'ending' && before !== 'ending') endings += 1
      steps += theatre.sounds.filter((sound) => sound.voice === `${kind}Step`).length
      theatre.sounds.length = 0
    }
    expect(popped).toBe(true)
    expect(endings, 'no ending for a friend without its balloon').toBe(0)
    expect(steps, 'and no march heard').toBe(0)
    // The cycle was judged when the balloon was sent, and stays judged; the ending comes with the next balloon.
    expect(theatre.save.finished).toBe(true)
    tap(theatre, 2)
    for (let i = 0; i < 60 * 3 && theatre.playing !== 'ending'; i++) theatre.step(1 / 60)
    expect(theatre.playing).toBe('ending')
    expect(theatre.troop.held).toEqual([true])
  })

  it('begins an ending only for a troop that is seen with all its balloons, and gives a touch to the balloon drawn in front: in whole games played at random, with pops as balloons land and taps on bunches on their way', () => {
    let endings = 0, flying = 0, got = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11], [2, 13], [4, 17], [3, 19], [4, 23]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed), { balloons, painter, clear } = recorder()
      const inside = theatre as unknown as { flights: { bunch: Bunch }[]; held: { shown: boolean }[]; loose: { x: number; y: number }[]; along: (flight: unknown) => { x: number; y: number } }
      let state = seed * 86028121
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      const full = () => theatre.troop.held.every((holds) => holds) && inside.held.slice(0, theatre.troop.size).every((balloon) => balloon.shown)
      for (let i = 0; i < 60 * 150; i++) {
        const before = theatre.playing
        if (i % 7 === 0) {
          const roll = random()
          if (roll < 0.45) {
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            tap(theatre, random() < 0.75 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length))
          } else if (roll < 0.55) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else if (roll < 0.8) {
            clear()
            theatre.paint(painter, VIEW)
            const held = balloons.filter((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.wide === 1 && balloon.y < 2.2)
            if (held.length > 0) { const one = held[Math.floor(random() * held.length)]; theatre.press(one.x, one.y, VIEW); theatre.cancel() }
          }
        }
        // Whatever is drawn in front is what a finger on it touches: a balloon that has got away, and then a bunch on its way.
        if (i % 5 === 0) {
          for (const loose of inside.loose) { expect(theatre.hit(loose.x, loose.y, VIEW).on, `seed ${seed}, frame ${i}`).toBe('loose'); got += 1 }
          for (const flight of inside.flights) {
            const at = inside.along(flight)
            for (const offset of bunchOffsets(flight.bunch.count)) {
              expect(['flying', 'loose'], `seed ${seed}, frame ${i}`).toContain(theatre.hit(at.x + offset.x * VIEW.balloon, at.y + offset.y * VIEW.balloon, VIEW).on)
              flying += 1
            }
          }
        }
        if (theatre.playing === 'ending' && before !== 'ending') { endings += 1; expect(full(), `seed ${seed}, frame ${i}: an ending at a touch for a troop that is not full`).toBe(true) }
        const still = theatre.playing
        theatre.step(1 / 60)
        if (theatre.playing === 'ending' && still !== 'ending') { endings += 1; expect(full(), `seed ${seed}, frame ${i}: an ending for a troop that is not full`).toBe(true) }
      }
    }
    expect(endings).toBeGreaterThan(40)
    expect(flying).toBeGreaterThan(2000)
    expect(got).toBeGreaterThan(200)
  }, 120_000)

  it.each(kinds)('a %s alone marches every step that is heard: given its balloon and one too many at once, with the waiting troop tapped inside the second, it marches its three steps when it is down, and none sounds before', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3)
    const actor = () => (theatre as unknown as { actors: { clip: string | null }[] }).actors[0]
    let steps = 0, began = -1
    for (let i = 0; i < 60 * 12; i++) {
      if (i === 6) tap(theatre, 0)
      if (i === 16) tap(theatre, 2)
      if (i === 60) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
      if (began < 0 && theatre.playing === 'ending') began = i
      // The ending is left to play: once it is over, the troop that waits is not tapped again.
      theatre.step(1 / 60)
      const heard = theatre.sounds.filter((sound) => sound.voice === `${kind}Step`).length
      if (heard > 0) expect(actor().clip, `frame ${i}: a step heard`).toBe('march')
      steps += heard
      theatre.sounds.length = 0
    }
    expect(began).toBeGreaterThan(0)
    expect(steps).toBe(3)
    expect(theatre.troop.held).toEqual([true])
  })

  it('turns no head of a new troop to an empty hand of the troop before it: after a pop and a step-in the troop sways from its first moment', () => {
    const theatre = new Theatre(saveOf({ position: 'pair-singles', troop: { kind: 'duck', size: 2, held: [true, true] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 2 } }), 3), { poses, balloons, painter, clear } = recorder()
    const inside = theatre as unknown as { lookAt: { until: number }; time: number; sway: number }
    theatre.step(1 / 60)
    clear()
    theatre.paint(painter, VIEW)
    const own = balloons.find((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.wide === 1 && balloon.y < 2.2)!
    theatre.press(own.x, own.y, VIEW)
    theatre.cancel()
    expect(inside.lookAt.until).toBeGreaterThan(inside.time)
    theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW)
    theatre.cancel()
    expect(theatre.playing).toBe('arrival')
    expect(theatre.troop.kind).toBe('frog')
    expect(inside.lookAt.until).toBeLessThanOrEqual(inside.time)
    const sway = inside.sway
    theatre.step(1 / 60)
    expect(inside.sway).toBeGreaterThan(sway)
    theatre.paint(painter, VIEW)
    for (const i of [0, 1]) expect(Math.abs(poses.get(`friend-${i}`)!.headTurn), `friend ${i}`).not.toBeCloseTo(0.55, 3)
  })

  it.each(kinds)('a troop of %ss does not set off without a balloon that is on its way to a hand: the waiting troop waves until it has arrived, and the parade holds what the troop is seen to carry', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'trio-singles', troop: { kind, size: 3, held: [true, false, false] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3)
    // Served before, by the look of the save: finished, with two balloons popped since.
    const save = { ...theatre.save, finished: true }
    const served = new Theatre(save, 3), { poses, balloons, painter, clear } = recorder()
    const callWaiting = () => { served.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); served.cancel() }
    served.step(1 / 60)
    tap(served, 0)
    for (let i = 0; i < 10; i++) served.step(1 / 60)
    callWaiting()
    expect(served.playing, 'not while the balloon is in the air').toBe(null)
    expect(served.save.parade).toHaveLength(0)
    for (let i = 0; i < 60 * 3; i++) served.step(1 / 60)
    // The ending for a troop that is not full does not play; the balloon is in a hand, and now the troop can go.
    callWaiting()
    if (served.playing === 'ending') callWaiting()
    expect(served.playing).toBe('arrival')
    expect(served.save.parade[0].balloons).toBe(2)
    served.step(1 / 60)
    clear()
    served.paint(painter, VIEW)
    // The troop that marches off is seen with as many balloons as the parade was given.
    const leaving = [0, 1, 2].map((i) => poses.get(`leaving-${i}`)!).filter(Boolean)
    expect(leaving).toHaveLength(3)
    const carried = balloons.filter((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.wide === 1 && balloon.y < 2.2)
    expect(carried).toHaveLength(2)
  })

  it.each(kinds)('a %s answers every wrong bunch in full however fast they are sent: a place stays empty until its bunch is answered, so none is hurried and none shares a refusal', (kind) => {
    const theatre = new Theatre(saveOf({ position: 'solo-three-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: other(kind), count: 1 }, { colour: other(kind), count: 1 }, { colour: kind, count: 1 }, { colour: other(kind), count: 1 }, { colour: other(kind), count: 1 }], waiting: { kind: other(kind), size: 1 } }), 11)
    const wrong = [0, 1, 3, 4], p = PERSONALITIES[kind]
    const sent: number[] = [], begun: number[] = [], landed: number[] = []
    let most = 0
    for (let i = 0; i < 60 * 30; i++) {
      // A wrong place is tapped three times a second for twelve seconds: far faster than a friend answers.
      if (i < 60 * 12 && i % 20 === 0) tap(theatre, wrong[(i / 20) % 4])
      theatre.step(1 / 60)
      const count = (voice: string) => theatre.sounds.filter((sound) => sound.voice === voice).length
      while (sent.length < count('letGo')) sent.push(i)
      while (begun.length < count(`${kind}Refuse`)) begun.push(i)
      while (landed.length < count(kind === 'hippo' ? 'raspberry' : 'pop')) landed.push(i)
      most = Math.max(most, sent.length - landed.length)
    }
    expect(sent.length).toBeGreaterThan(8)
    // Every bunch that left the sky was refused, and every refusal landed on its own bunch at its own moment.
    expect(begun).toHaveLength(sent.length)
    expect(landed).toHaveLength(sent.length)
    for (let k = 0; k < sent.length; k++) {
      expect(landed[k] - begun[k], `refusal ${k}`).toBeGreaterThanOrEqual(Math.floor((p.cue.hit / 1.07) * 60) - 2)
      if (k > 0) expect(begun[k], `refusal ${k} begins when the one before has landed`).toBeGreaterThan(landed[k - 1])
    }
    // Never more on their way than the sky has wrong places.
    expect(most).toBeLessThanOrEqual(4)
  })

  it('never lets a balloon of a sky that is over rise into the grown-up\'s corner, where a touch is not answered, on any shape of surface', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [820, 1180], [1024, 640]]) for (const sky of [[1, 1, 1, 1, 1], [2, 1, 3, 3], [3, 1, 2, 3]]) {
      const view = viewFor(w, h), corner = 72 / view.pixelsPerUnit
      const save = { ...saveOf({ position: 'bunches-mixed', troop: { kind: 'duck', size: 1, held: [true] }, sky: sky.map((count) => ({ colour: 'duck' as const, count: count as 1 | 2 | 3 })), waiting: { kind: 'frog', size: 1 } }), finished: true }
      const theatre = new Theatre(save, 2), { balloons, painter, clear } = recorder()
      theatre.paint(painter, view)
      theatre.step(1 / 60)
      theatre.press(waitingSpot(0, view).x, GROUND + 0.8, view)
      theatre.cancel()
      expect(theatre.playing).toBe('arrival')
      let drifting = 0
      for (let i = 0; i < 60 * 3; i++) {
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, view)
        // The balloons of the old sky are the ones in front of everything; the new sky has not come yet.
        for (const balloon of balloons) {
          if (Math.abs(balloon.z - 0.4) > 1e-6) continue
          drifting += 1
          const right = balloon.x + 0.66 * view.balloon * balloon.wide / view.balloon, top = balloon.y + 0.66 * 1.12 * view.balloon
          expect(right > view.width / 2 - corner && top > view.height / 2 - corner && balloon.x - 0.66 * view.balloon < view.width / 2, `${w} by ${h}, sky ${sky.join()}, frame ${i}: a balloon at ${balloon.x.toFixed(2)}, ${balloon.y.toFixed(2)}`).toBe(false)
        }
      }
      expect(drifting).toBeGreaterThan(20)
    }
  })

  it('springs a sent bunch back past round: flat under the finger, taller than wide a tenth of a second after the lift, and round soon after', () => {
    const theatre = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind: 'duck', size: 1, held: [false] }, sky: [{ colour: 'duck', count: 1 }, { colour: 'frog', count: 1 }], waiting: { kind: 'frog', size: 1 } }), 2), { balloons, painter, clear } = recorder()
    const at = skySlots(2, VIEW)[0]
    theatre.press(at.x, at.y, VIEW)
    for (let i = 0; i < 12; i++) theatre.step(1 / 60)
    // The bunch on its way is drawn in front of the sky's; until it leaves, it is the one in its place.
    const shape = () => { clear(); theatre.paint(painter, VIEW); return balloons.find((balloon) => Math.abs(balloon.z - 0.35) < 1e-6) ?? balloons.find((balloon) => Math.abs(balloon.z) < 1e-6 && Math.abs(balloon.x - at.x) < 1 && balloon.y > 2)! }
    const pressed = shape()
    expect(pressed.wide / pressed.tall, 'flat under the finger').toBeGreaterThan(1.6)
    theatre.release(VIEW)
    theatre.step(1 / 60)
    const lifted = shape()
    expect(lifted.wide / lifted.tall, 'still flat in the frame after the lift').toBeGreaterThan(1.3)
    let thinnest = Infinity
    for (let i = 0; i < 12; i++) { theatre.step(1 / 60); const now = shape(); thinnest = Math.min(thinnest, now.wide / now.tall) }
    expect(thinnest, 'past round').toBeLessThan(0.85)
    for (let i = 0; i < 14; i++) theatre.step(1 / 60)
    const settled = shape()
    expect(Math.abs(settled.wide / settled.tall - 1)).toBeLessThan(0.25)
  })

  it.each(kinds)('a %s plays its whole start at a pop before it answers a bunch that was already on its way, and its ending never cuts a refusal', (kind) => {
    const p = PERSONALITIES[kind]
    // A wrong bunch on its way, and the balloon it holds popped under it.
    const popped = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [true] }, sky: [{ colour: other(kind), count: 1 }, { colour: kind, count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3), seen = recorder()
    popped.step(1 / 60)
    popped.paint(seen.painter, VIEW)
    const own = seen.balloons.find((balloon) => balloon.z > -5 && balloon.wide === 1 && balloon.y < 2.2)!
    tap(popped, 0)
    for (let i = 0; i < 9; i++) popped.step(1 / 60)
    popped.sounds.length = 0
    popped.press(own.x, own.y, VIEW)
    popped.cancel()
    let refusal = -1
    for (let i = 0; i < 60 * 5 && refusal < 0; i++) { popped.step(1 / 60); if (popped.sounds.some((sound) => sound.voice === `${kind}Refuse`)) refusal = i }
    expect(refusal, `${kind}: the refusal begins when the start is over`).toBeGreaterThanOrEqual(Math.floor((p.lasts.popped / 1.07) * 60) - 2)

    // Served, then a wrong bunch, then the waiting troop tapped to bring the ending on: the refusal still lands, and the proud move follows it.
    const ending = new Theatre(saveOf({ position: 'solo-two-colours', troop: { kind, size: 1, held: [false] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }], waiting: { kind: other(kind), size: 1 } }), 3)
    tap(ending, 0)
    for (let i = 0; i < 12; i++) ending.step(1 / 60)
    tap(ending, 1)
    let began = -1, landed = -1, proud = -1, called = false
    for (let i = 0; i < 60 * 9; i++) {
      ending.step(1 / 60)
      const has = (voice: string, gain?: number) => ending.sounds.some((sound) => sound.voice === voice && (gain === undefined || sound.gain === gain))
      if (began < 0 && has(`${kind}Refuse`)) began = i
      if (began >= 0 && !called && i >= began + 4) { ending.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); ending.cancel(); called = true }
      if (landed < 0 && has(kind === 'hippo' ? 'raspberry' : 'pop')) landed = i
      if (proud < 0 && has(`${kind}Poke`, 0.8)) proud = i
    }
    expect(began).toBeGreaterThan(0)
    expect(landed - began, `${kind}: the refusal lands at its own moment`).toBeGreaterThanOrEqual(Math.floor((p.cue.hit / 1.07) * 60) - 2)
    if (proud >= 0) expect(proud, `${kind}: the proud move waits for it`).toBeGreaterThanOrEqual(landed)
  })

  it('lands every refusal on its bunch, at its own moment, through play in which balloons are popped, friends poked and the waiting troop tapped at random', () => {
    // Hippos: the raspberry is heard only when a sneeze blows a bunch away, so each one can be matched to its refusal.
    const hit = PERSONALITIES.hippo.cue.hit
    for (const [size, seed] of [[1, 3], [2, 5], [3, 7], [2, 11]] as const) {
      const theatre = new Theatre(saveOf({ position: 'bunches-mixed', troop: { kind: 'hippo', size, held: Array.from({ length: size }, () => false) }, sky: [{ colour: 'duck', count: 2 }, { colour: 'hippo', count: 1 }, { colour: 'frog', count: 3 }, { colour: 'hippo', count: size === 1 ? 2 : size }], waiting: { kind: 'duck', size: 2 } }), seed)
      let state = seed * 15485863
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      const begun: number[] = [], struck: number[] = []
      for (let i = 0; i < 60 * 120; i++) {
        const onStage = JSON.stringify([theatre.save.next, theatre.save.parade])
        if (i % 13 === 0) {
          const roll = random()
          if (roll < 0.5) tap(theatre, Math.floor(random() * 4) % theatre.sky.length)
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 5.5, VIEW); theatre.cancel() }
        }
        const kind = theatre.troop.kind
        theatre.step(1 / 60)
        // A troop that marches off leaves a bunch it had not answered to drift away: the count starts again with the next troop.
        if (JSON.stringify([theatre.save.next, theatre.save.parade]) !== onStage) { begun.length = 0; struck.length = 0 }
        if (kind !== 'hippo' || theatre.troop.kind !== 'hippo') { theatre.sounds.length = 0; continue }
        for (const sound of theatre.sounds) {
          if (sound.voice === 'hippoRefuse') begun.push(i)
          if (sound.voice === 'raspberry') struck.push(i)
        }
        theatre.sounds.length = 0
        expect(struck.length, `seed ${seed}, frame ${i}: a bunch blown away with no refusal begun`).toBeLessThanOrEqual(begun.length)
        if (struck.length > 0 && struck[struck.length - 1] === i) expect(i - begun[struck.length - 1], `seed ${seed}, frame ${i}: refusal ${struck.length}`).toBeGreaterThanOrEqual(Math.floor((hit / 1.07) * 60) - 2)
      }
      // Left alone, whatever was still on its way is answered too, and the counts meet.
      for (let i = 0; i < 60 * 12 && theatre.troop.kind === 'hippo'; i++) {
        theatre.step(1 / 60)
        for (const sound of theatre.sounds) {
          if (sound.voice === 'hippoRefuse') begun.push(i)
          if (sound.voice === 'raspberry') struck.push(i)
        }
        theatre.sounds.length = 0
      }
      expect(begun.length - struck.length, `seed ${seed}`).toBe(0)
      if (size === 1) expect(begun.length).toBeGreaterThan(5)
    }
  }, 60_000)

  it('never cuts an answer short: in whole games played at random, with pops, pokes and taps on the waiting troop, a friend that is carried off, starting at a pop, looking before a refusal or about to take a balloon always gets there', () => {
    type Seen = { clip: string | null; t: number }
    let answers = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11], [2, 13], [4, 17]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const actors = () => (theatre as unknown as { actors: Seen[] }).actors
      let state = seed * 49979687
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      let before: Seen[] = [], troop = ''
      for (let i = 0; i < 60 * 200; i++) {
        if (i % 17 === 0) {
          const roll = random()
          if (roll < 0.45) tap(theatre, Math.floor(random() * theatre.sky.length))
          else if (roll < 0.55) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 6, VIEW); theatre.cancel() }
        }
        theatre.step(1 / 60)
        const kind = theatre.troop.kind, p = PERSONALITIES[kind]
        const now = actors().map((actor) => ({ clip: actor.clip, t: actor.t }))
        const same = JSON.stringify([kind, theatre.troop.size, theatre.save.parade.length, theatre.save.next])
        if (same === troop) now.forEach((actor, k) => {
          const was = before[k]
          if (!was || !was.clip) return
          // How far the motion it was in has to get before anything else may begin.
          const must = was.clip === 'liftOff' ? p.lasts.liftOff - 0.05 : was.clip === 'popped' ? p.lasts.popped - 0.05 : was.clip === 'refuse' ? p.cue.hit : was.clip === 'catch' ? p.cue.grab : -1
          if (must < 0) return
          if (was.t < must - 0.04) {
            answers += 1
            // A start at a pop gives way to a poke, which is the child's own touch on that friend, and to nothing else.
            if (was.clip === 'popped' && (actor.clip === 'poke' || actor.clip === 'pokeB')) return
            expect(actor.clip === was.clip && actor.t >= was.t, `age ${age}, seed ${seed}, frame ${i}: a ${kind}'s ${was.clip} cut at ${was.t.toFixed(2)} of ${must.toFixed(2)} by ${actor.clip}`).toBe(true)
          }
        })
        troop = same
        before = now
        theatre.sounds.length = 0
      }
    }
    expect(answers).toBeGreaterThan(5000)
  }, 90_000)

  it('never keeps a bunch waiting for a friend that is free: in whole games played at random, the bunch that was sent first arrives within three quarters of a second of the moment whoever will answer it is free', () => {
    type Flying = { t: number; lasts: number; landed: boolean; friend: number; given: { result: string; takers?: number[]; spare?: number }; bunch: { count: number } }
    type Busy = { clip: string | null; t: number; next: string | null; after?: string | null }
    let waits = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const inside = theatre as unknown as { flights: Flying[]; actors: Busy[] }
      let state = seed * 86028121
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      const waited = new WeakMap<Flying, number>()
      for (let i = 0; i < 60 * 200; i++) {
        if (i % 17 === 0) {
          const roll = random()
          if (roll < 0.5) tap(theatre, Math.floor(random() * theatre.sky.length))
          else if (roll < 0.58) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 6, VIEW); theatre.cancel() }
        }
        theatre.step(1 / 60)
        theatre.sounds.length = 0
        const first = inside.flights.find((flight) => !flight.landed)
        if (!first) continue
        const whole = first.given.result === 'gotAway' && first.given.spare === first.bunch.count && first.bunch.count === theatre.troop.size && theatre.troop.size > 1
        const who = first.given.result === 'taken' ? first.given.takers! : whole ? inside.actors.map((_, k) => k) : [first.friend]
        // Free: in the middle of nothing, and owing nothing.
        const free = who.every((k) => { const actor = inside.actors[k]; return actor && !actor.clip && !actor.next && !actor.after })
        if (!free) continue
        waits += 1
        // Each frame its friends are free and it is still not there; more than three quarters of a second of them, and it was kept waiting.
        const idleFor = (waited.get(first) ?? 0) + 1
        waited.set(first, idleFor)
        expect(idleFor, `age ${age}, seed ${seed}, frame ${i}: the first bunch has ${(first.lasts - first.t).toFixed(2)} s to go`).toBeLessThanOrEqual(Math.round(0.75 * 60))
      }
    }
    expect(waits).toBeGreaterThan(2000)
  }, 90_000)

  it('never sounds a motion that is not played: in whole games played at random, each refusal, start, poke, proud move and lift-off that is heard is one a friend is beginning in that step', () => {
    type Seen = { clip: string | null; t: number; jolt?: number }
    let heard = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const inside = theatre as unknown as { actors: Seen[]; time: number }
      let state = seed * 67867967
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 200; i++) {
        theatre.sounds.length = 0
        const stage = [theatre.troop.kind, theatre.save.parade.length] as const
        if (i % 17 === 0) {
          const roll = random()
          if (roll < 0.45) tap(theatre, Math.floor(random() * theatre.sky.length))
          else if (roll < 0.55) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 6, VIEW); theatre.cancel() }
        }
        if (theatre.save.parade.length !== stage[1]) { theatre.sounds.length = 0; theatre.step(1 / 60); continue }
        const kind = theatre.troop.kind, size = theatre.troop.size, parade = theatre.save.parade.length
        const beginning = (clips: string[]) => inside.actors.some((actor) => clips.includes(actor.clip ?? '') && actor.t <= 0.06)
        const wobbling = () => inside.actors.some((actor) => actor.jolt !== undefined && inside.time - actor.jolt < 0.05)
        const check = (when: string) => {
          for (const sound of theatre.sounds) {
            if (sound.after > 0) continue
            const where = `age ${age}, seed ${seed}, frame ${i}: ${sound.voice} ${when}`
            if (sound.voice === `${kind}Refuse`) { heard += 1; expect(beginning(['refuse']), where).toBe(true) }
            else if (sound.voice === `${kind}Startle`) { heard += 1; expect(beginning(['popped']) || wobbling(), where).toBe(true) }
            else if (sound.voice === `${kind}LiftOff`) { heard += 1; expect(beginning(['liftOff']), where).toBe(true) }
            else if (sound.voice === `${kind}Poke` && sound.gain === 1) { heard += 1; expect(beginning(['poke', 'pokeB']) || wobbling(), where).toBe(true) }
            else if (sound.voice === `${kind}Poke` && sound.gain === 0.8) { heard += 1; expect(beginning(['proud']), where).toBe(true) }
          }
          theatre.sounds.length = 0
        }
        // What the touch itself sounded, in the moment of the touch; then what the step sounded. A touch that brings
        // the next troop in changes who is on stage: its sounds belong to the troop that leaves.
        if (theatre.save.parade.length === parade) check('at a touch')
        theatre.sounds.length = 0
        theatre.step(1 / 60)
        if (theatre.troop.kind === kind && theatre.troop.size === size && theatre.save.parade.length === parade) check('in a step')
      }
    }
    expect(heard).toBeGreaterThan(500)
  }, 90_000)

  it('shows the troop as the save has it whenever nothing is on its way: in whole games played at random, each friend holds a balloon on screen exactly when the save says it does', () => {
    let calm = 0
    for (const [age, seed] of [[2, 3], [3, 5], [4, 7], [4, 11]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed)
      const inside = theatre as unknown as { flights: unknown[]; held: { shown: boolean; owed?: boolean }[] }
      let state = seed * 122949829
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 200; i++) {
        if (i % 17 === 0) {
          const roll = random()
          if (roll < 0.5) tap(theatre, Math.floor(random() * theatre.sky.length))
          else if (roll < 0.58) { theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW); theatre.cancel() }
          else { theatre.press((random() - 0.5) * 9, GROUND + random() * 6, VIEW); theatre.cancel() }
        }
        theatre.step(1 / 60)
        theatre.sounds.length = 0
        if (inside.flights.length > 0) continue
        calm += 1
        expect(inside.held.map((balloon) => balloon.shown), `age ${age}, seed ${seed}, frame ${i}`).toEqual(theatre.save.troop.held)
      }
    }
    expect(calm).toBeGreaterThan(5000)
  }, 90_000)

  it.each(kinds)('a bunch that is read again when a balloon is popped goes on from where it is: for %ss it is not moved by the touch, whoever it goes to now', (kind) => {
    for (const wait of [6, 14, 24, 40]) for (const [held, count, pop] of [[[true, false], 2, 0], [[true, true], 2, 1], [[true, false, true], 3, 2], [[true], 1, 0]] as const) {
      const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind, size: held.length as 1 | 2 | 3, held: [...held] }, sky: [{ colour: kind, count: 1 }, { colour: kind, count }], waiting: { kind: other(kind), size: 1 } }), 3), { balloons, painter, clear } = recorder()
      theatre.step(1 / 60)
      clear()
      theatre.paint(painter, VIEW)
      // The balloons the troop holds, from the left: the one to pop is its friend's.
      const own = balloons.filter((balloon) => balloon.z > 0.29 && balloon.z < 0.31 && balloon.y < 2.2).sort((a, b) => a.x - b.x)
      const target = own[held.slice(0, pop).filter(Boolean).length]
      tap(theatre, 1)
      for (let i = 0; i < wait; i++) theatre.step(1 / 60)
      const flying = () => { clear(); theatre.paint(painter, VIEW); return balloons.filter((balloon) => Math.abs(balloon.z - 0.35) < 0.03).map((balloon) => ({ x: balloon.x, y: balloon.y })) }
      const before = flying()
      if (before.length === 0) continue
      theatre.press(target.x, target.y, VIEW)
      theatre.cancel()
      const after = flying()
      expect(after).toHaveLength(before.length)
      // In the touch itself nothing of the bunch moves; a step later it has moved no further than a bunch does in a step.
      after.forEach((balloon, k) => expect(Math.hypot(balloon.x - before[k].x, balloon.y - before[k].y), `${count} for ${held.join()}, popped ${wait} frames after the lift`).toBeLessThan(0.02))
      theatre.step(1 / 60)
      const next = flying()
      next.forEach((balloon, k) => { if (after[k]) expect(Math.hypot(balloon.x - after[k].x, balloon.y - after[k].y)).toBeLessThan(0.45) })
    }
  })

  it('keeps every balloon out of the grown-up\'s corner when the surface changes size and keeps its shape', () => {
    const theatre = new Theatre(saveOf({ position: 'bunches-mixed', troop: { kind: 'duck', size: 1, held: [false] }, sky: [{ colour: 'frog', count: 2 }, { colour: 'duck', count: 1 }, { colour: 'duck', count: 3 }, { colour: 'frog', count: 3 }], waiting: { kind: 'frog', size: 1 } }), 2), { balloons, painter, clear } = recorder()
    for (const [w, h] of [[1366, 1024], [1024, 768], [1366, 1024], [800, 600]]) {
      const view = viewFor(w, h), corner = 72 / view.pixelsPerUnit
      theatre.step(1 / 60)
      clear()
      theatre.paint(painter, view)
      for (const balloon of balloons) {
        if (balloon.z < -5 || balloon.wide < 0.5) continue
        const right = balloon.x + 0.66 * view.balloon, top = balloon.y + 0.66 * 1.12 * view.balloon
        expect(right > view.width / 2 - corner && top > view.height / 2 - corner, `${w} by ${h}: a balloon at ${balloon.x.toFixed(2)}, ${balloon.y.toFixed(2)}`).toBe(false)
        // And a touch on it is answered.
        if (balloon.y > 2) expect(theatre.hit(balloon.x, balloon.y, view).on).toBe('bunch')
      }
    }
  })

  it('draws every balloon in front at one size, also where balloons are drawn larger: in the sky, in a hand, on its way, beside a friend, carrying one off and passing by', () => {
    const big = SMALL.balloon
    expect(big).toBeGreaterThan(1.1)
    const games: Theatre[] = []
    for (const kind of kinds) {
      // A balloon taken, one refused, one too many, a pop, and then the step-in with the first bunches shown.
      const save = { ...saveOf({ position: 'bunches-own-colour', troop: { kind, size: 2, held: [false, false] }, sky: [{ colour: kind, count: 1 }, { colour: other(kind), count: 1 }, { colour: kind, count: 3 }, { colour: kind, count: 2 }], waiting: { kind: other(kind), size: 2 } }), shown: { give: true, each: true, bunch: false } }
      games.push(new Theatre(save, 7))
    }
    for (const theatre of games) {
      const { balloons, painter, clear } = recorder()
      const script: Record<number, () => void> = {
        10: () => tap(theatre, 1, SMALL), 80: () => tap(theatre, 2, SMALL), 260: () => tap(theatre, 0, SMALL), 330: () => tap(theatre, 0, SMALL),
        460: () => tap(theatre, 3, SMALL), 900: () => { theatre.press(waitingSpot(0, SMALL).x, GROUND + 0.8, SMALL); theatre.cancel() }, 1000: () => { theatre.press(waitingSpot(0, SMALL).x, GROUND + 0.8, SMALL); theatre.cancel() },
      }
      for (let i = 0; i < 60 * 28; i++) {
        script[i]?.()
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, SMALL)
        for (const balloon of balloons) {
          // Not the far hill's; not a scrap of a pop or a drop of a cloud; not one going flat, which is long and thin and grows small.
          if (balloon.z < -5 || Math.max(balloon.wide, balloon.tall) < 0.45 || balloon.tall > balloon.wide * 1.35) continue
          // A new one grows into its place in the sky, and one under a finger is squashed: both are in the row.
          if (balloon.y > 2.2) continue
          expect(Math.sqrt(balloon.wide * balloon.tall) / big, `${theatre.troop.kind}, frame ${i}, at ${balloon.x.toFixed(1)}, ${balloon.y.toFixed(1)}`).toBeGreaterThan(0.9)
          expect(Math.sqrt(balloon.wide * balloon.tall) / big).toBeLessThan(1.12)
        }
      }
      expect(theatre.save.parade.length, 'the troop stepped in').toBeGreaterThan(0)
    }
  })

  it('never crosses two thin strings while a troop passes by and takes what hangs low for it: frogs cross their tongues, which are bowed, and nothing else', () => {
    const crossing = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) => {
      const d = (a.x1 - a.x0) * (b.y1 - b.y0) - (a.y1 - a.y0) * (b.x1 - b.x0)
      if (Math.abs(d) < 1e-9) return false
      const t = ((b.x0 - a.x0) * (b.y1 - b.y0) - (b.y0 - a.y0) * (b.x1 - b.x0)) / d, u = ((b.x0 - a.x0) * (a.y1 - a.y0) - (b.y0 - a.y0) * (a.x1 - a.x0)) / d
      // Strings that meet at a knot or in a hand share an end; a crossing is in the middle of both.
      return t > 0.08 && t < 0.92 && u > 0.08 && u < 0.92
    }
    let frogs = 0
    for (const kind of kinds) for (const seed of [1, 2, 3, 4, 5, 6]) {
      const save = { ...saveOf({ position: 'bunches-own-colour', troop: { kind, size: 1, held: [true] }, sky: [{ colour: kind, count: 1 }], waiting: { kind: other(kind), size: 3 } }), shown: { give: true, each: true, bunch: false } }
      const theatre = new Theatre(save, seed), { poses, strings, painter, clear } = recorder()
      let passing: KindName | null = null
      const spy: Painter = { ...painter, place: (name, placed, pose) => { if (name === 'passer-0') passing = placed; painter.place(name, placed, pose) } }
      theatre.step(1 / 60)
      theatre.press(waitingSpot(0, VIEW).x, GROUND + 0.8, VIEW)
      theatre.cancel()
      for (let i = 0; i < 60 * 8; i++) {
        theatre.step(1 / 60)
        clear()
        theatre.paint(spy, VIEW)
        if (!poses.has('passer-0')) continue
        for (let a = 0; a < strings.length; a++) for (let b = a + 1; b < strings.length; b++) expect(crossing(strings[a], strings[b]), `${kind}, seed ${seed}, frame ${i}`).toBe(false)
      }
      if (passing === 'frog') frogs += 1
    }
    expect(frogs, 'frogs passed by under a bunch in some of these').toBeGreaterThan(0)
  })
})
