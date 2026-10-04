import { describe, expect, it } from 'vitest'
import { BODIES, type KindName } from './bodies'
import { GROUND, skySlots, viewFor, waitingSpot } from './layout'
import type { Pose } from './pose'
import { PERSONALITIES } from './clips'
import { saveOf } from './moments'
import { freshSave } from './save'
import { MAX_BALLOONS, MAX_SHADOWS, MAX_STRINGS } from './scenery'
import { Theatre, type Painter } from './theatre'

// The frame budget, counted and not timed, so it holds on a busy machine. What a frame costs the renderer is fixed
// by what the theatre asks the stage to draw: six draws for each friend on stage (seven for a hippo, whose jaw is
// a part of its own), and a fixed handful for
// everything else, however many balloons there are. The test plays whole games with a seeded child who taps fast
// and at random, through every scene, and holds the most any frame asked for under the jam's bar.

/** Draws a frame makes besides the friends: the sky, two hills, three clouds, the three batches, four parade batches and the ghost hand. */
const FIXED_DRAWS = 1 + 2 + 3 + 3 + 4 + 1
const DRAWS_A_FRIEND = 6
/** The jam's bar is about 80 draw calls; the game keeps a margin under it. */
const DRAW_BUDGET = 76

const VIEW = viewFor(1180, 820)

function counter() {
  const frame = { friends: new Map<string, KindName>(), balloons: 0, strings: 0, shadows: 0, marchers: 0 }
  const painter: Painter = {
    place: (name: string, kind: KindName, _pose: Pose) => void frame.friends.set(name, kind),
    drop: (name) => void frame.friends.delete(name),
    balloon: () => void (frame.balloons += 1),
    string: () => void (frame.strings += 1),
    shadow: () => void (frame.shadows += 1),
    marcher: () => void (frame.marchers += 1),
    hand: () => {},
    cloud: () => {},
  }
  return { frame, painter, clear: () => { frame.balloons = 0; frame.strings = 0; frame.shadows = 0; frame.marchers = 0 } }
}

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

describe('the frame budget', () => {
  it('stays under the jam\'s bar of draw calls and inside every batch through whole games played fast and at random', () => {
    const most = { draws: 0, friends: 0, balloons: 0, strings: 0, shadows: 0, marchers: 0 }
    let cycles = 0
    for (const [age, seed] of [[2, 11], [3, 12], [4, 13], [4, 14]] as const) {
      const theatre = new Theatre(freshSave(age, seed), seed), { frame, painter, clear } = counter()
      let state = seed
      const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648
      for (let i = 0; i < 60 * 90; i++) {
        if (i % 9 === 0) {
          const roll = random()
          if (roll < 0.55) {
            // A bunch, most often one of the troop's own colour, so cycles end and troops step in.
            const own = theatre.sky.map((bunch, slot) => (bunch.colour === theatre.troop.kind ? slot : -1)).filter((slot) => slot >= 0)
            const slot = random() < 0.7 && own.length > 0 ? own[Math.floor(random() * own.length)] : Math.floor(random() * theatre.sky.length)
            const at = skySlots(theatre.sky.length, VIEW)[slot]
            theatre.press(at.x, at.y, VIEW)
          } else if (roll < 0.75) {
            const spot = waitingSpot(0, VIEW)
            theatre.press(spot.x, GROUND + 0.8, VIEW)
          } else theatre.press((random() - 0.5) * VIEW.width, (random() - 0.5) * VIEW.height, VIEW)
          if (random() < 0.92) theatre.release(VIEW)
          else theatre.cancel()
        }
        theatre.step(1 / 60)
        clear()
        theatre.paint(painter, VIEW, { glow: 1, demo: 0.4, demoIndex: i % 4 })
        const draws = FIXED_DRAWS + [...frame.friends.values()].reduce((sum, kind) => sum + DRAWS_A_FRIEND + (BODIES[kind].jaw.length > 0 ? 1 : 0), 0)
        most.draws = Math.max(most.draws, draws)
        most.friends = Math.max(most.friends, frame.friends.size)
        most.balloons = Math.max(most.balloons, frame.balloons)
        most.strings = Math.max(most.strings, frame.strings)
        most.shadows = Math.max(most.shadows, frame.shadows)
        most.marchers = Math.max(most.marchers, frame.marchers)
      }
      cycles += theatre.save.parade.length
      theatre.sounds.length = 0
    }
    expect(cycles, 'the games got somewhere: troops were served and stepped in').toBeGreaterThan(8)
    expect(most.draws, `${most.friends} friends at most`).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(most.balloons).toBeLessThanOrEqual(MAX_BALLOONS)
    expect(most.strings).toBeLessThanOrEqual(MAX_STRINGS)
    expect(most.shadows).toBeLessThanOrEqual(MAX_SHADOWS)
    // Four troops of three round the far hill, and a troop of three that passed going over its shoulder.
    expect(most.marchers).toBeLessThanOrEqual(15)
    // The heaviest frame is a real one: a troop marching off, one walking in and one coming to the edge.
    expect(most.friends).toBeGreaterThanOrEqual(6)
  }, 30_000)
})
