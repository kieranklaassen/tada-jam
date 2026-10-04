import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { PERSONALITIES } from './clips'
import { GROUND, skySlots, viewFor, waitingSpot } from './layout'
import { saveOf } from './moments'
import type { Pose } from './pose'
import { freshSave } from './save'
import { Theatre, type Painter } from './theatre'

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
    const frame = (theatre: Theatre, label: string) => {
      // The balloons far off, on the far hill, are small and are not followed; those in front all are.
      now.length = 0
      theatre.paint(painter, VIEW)
      if (before) for (const balloon of now) {
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
    tap(theatre, 1)
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
      const beside = balloons.filter((balloon) => balloon.z > -5 && balloon.wide > 0.8 && balloon.y < GROUND + 2.6 && Math.abs(balloon.x - pose.x) < 2.6).length
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

  it('sends frogs\' tongues over one another\'s heads to a bunch with one for each: they cross in the air above the frogs, and none goes through a frog', () => {
    // Three frogs and a bunch of three; and two frogs either side of one that has its balloon, with a bunch of two.
    for (const [held, count] of [[[false, false, false], 3], [[false, true, false], 2]] as const) {
      const theatre = new Theatre(saveOf({ position: 'bunches-own-colour', troop: { kind: 'frog', size: 3, held: [...held] }, sky: [{ colour: 'frog', count: 1 }, { colour: 'frog', count }], waiting: { kind: 'duck', size: 1 } }), 4)
      const poses = new Map<string, Pose>(), tongues: { x0: number; y0: number; x1: number; y1: number }[] = []
      const painter: Painter = { place: (name, _kind, pose) => void poses.set(name, { ...pose }), drop: () => {}, balloon: () => {}, string: (x0, y0, _z0, x1, y1, _z1, _colour, thick) => { if ((thick ?? 0) > 0.05 && (thick ?? 0) < 0.1) tongues.push({ x0, y0, x1, y1 }) }, shadow: () => {}, marcher: () => {}, hand: () => {}, cloud: () => {} }
      tap(theatre, 1)
      let crossedInAir = 0, out = 0
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
          if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98 && p.y0 + (p.y1 - p.y0) * t > GROUND + 2.2) crossing = true
        }
        if (crossing) crossedInAir += 1
      }
      expect(out, 'the tongues are out for a good while').toBeGreaterThan(15)
      expect(crossedInAir, `${count} for ${held.join()}: crossed in the air`).toBeGreaterThan(10)
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
