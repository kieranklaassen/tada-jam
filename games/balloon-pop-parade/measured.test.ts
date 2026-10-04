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
