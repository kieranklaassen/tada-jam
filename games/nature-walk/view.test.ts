import { describe, expect, it, vi } from 'vitest'
import { BEFORE_HOG, IN_WATER, ON_BALL, ON_PATH, ON_STONE, PAIRED, STOLEN, TOUCHED, still, type Go } from './cells'
import { TIERS } from './config'
import { SPOTS } from './layout'
import { MANNERS, LOUSE } from './motion'
import { blankSheets, emptyRecording, tracingContext } from './recorder'
import { GRAB, press, targetAt } from './rules'
import { freshWorld } from './save'
import { Finger, LAPS } from './script'
import { step } from './step'
import { drawn } from './things'
import { createToy, type Toy, type ToySave } from './toy'
import { View } from './view'
import { PAIRS, PLACES, THINGS, type ThingId } from './wood'

// What the model computes is seen, and what is seen is what is touched.
// Every value of every pose the model hands the view is read by the view:
// here each one is changed by a little, in turn, behind the view's back, and
// the picture must change. And a thing is touched where it is drawn, in every
// state the whole walk passes through.

/** Which pose to change, which value of it, and by how much: read by the stand-ins below. */
const change = vi.hoisted(() => ({ who: '', field: '', by: 0 }))

function changed<T>(who: string, pose: T): T {
  if (change.who !== who || pose === null || typeof pose !== 'object') return pose
  const value = (pose as Record<string, unknown>)[change.field]
  if (typeof value === 'number') return { ...pose, [change.field]: value + change.by }
  if (typeof value === 'boolean') return { ...pose, [change.field]: !value }
  return pose
}

vi.mock('./poses', async (original) => {
  const actual = await original<typeof import('./poses')>()
  return {
    ...actual,
    hedgehogPose: (toy: Toy) => changed('hedgehog', actual.hedgehogPose(toy)),
    jayPose: (toy: Toy) => changed('jay', actual.jayPose(toy)),
    toadPose: (toy: Toy) => changed('toad', actual.toadPose(toy)),
    findPose: (toy: Toy, place: Parameters<typeof actual.findPose>[1]) => {
      const found = actual.findPose(toy, place)
      return found && change.who === `find:${place}` ? { ...changed(`find:${place}`, found), pose: changed(`find:${place}`, found.pose) } : found
    },
  }
})

vi.mock('./things', async (original) => {
  const actual = await original<typeof import('./things')>()
  return {
    ...actual,
    drawn: (toy: Toy, thing: ThingId) => {
      const seen = actual.drawn(toy, thing)
      return seen && change.who === `thing:${thing}` ? { ...changed(`thing:${thing}`, seen), pose: changed(`thing:${thing}`, seen.pose) } : seen
    },
  }
})

const view = new View(blankSheets(emptyRecording()))
function picture(toy: Toy): string {
  const { g, trace } = tracingContext()
  view.draw(g, 1180, 820, 2, { toy, guidance: null, tier: TIERS[0] })
  return trace.join(';')
}

/** Whether changing one value of one pose changes the picture of a game. */
function read(toy: Toy, who: string, field: string, by: number): boolean {
  Object.assign(change, { who: '', field: '', by: 0 })
  const before = picture(toy)
  Object.assign(change, { who, field, by })
  const after = picture(toy)
  Object.assign(change, { who: '', field: '', by: 0 })
  return before !== after
}

const world = (more: Partial<ToySave> = {}): ToySave => ({ ...freshWorld(null), finished: false, ...more })
const at = (toy: Toy, seconds: number): Toy => { step(toy, seconds); return toy }

describe('every pose value the model computes is read by the view', () => {
  it('the hedgehog: unrolled, rolling up, and a ball', () => {
    const states = [at(createToy(world(), 1), 0.4), at(createToy(world({ rolled: true }), 1), 0.4)]
    const rolling = createToy(world(), 1); press(rolling, { x: 160, y: 652 }); states.push(at(rolling, 0.12))
    for (const field of Object.keys(poseOf("hedgehog", states[0]))) expect(states.some((toy) => read(toy, 'hedgehog', field, 0.31)), `hedgehog.${field}`).toBe(true)
  })

  it('the jay: on his nest and down on the ground', () => {
    const states = [at(createToy(world(), 1), 0.4)]
    const down = createToy(world({ things: { ...freshWorld(null).things, button: { at: 'path', x: 930, y: 500 } } }), 1)
    down.acts.jay = { kind: 'path:acorn', since: 0, length: 3.2, cues: [], fired: 0, scene: false, from: { x: 416, y: 690 }, to: { x: 432, y: 740 }, n: 0, room: false }
    states.push(at(down, 1.6))
    for (const field of Object.keys(poseOf('jay', states[0]))) expect(states.some((toy) => read(toy, 'jay', field, 0.31)), `jay.${field}`).toBe(true)
  })

  it('the toad: on his stone, seen from behind, and on the table in the room', () => {
    const states = [at(createToy(world(), 1), 0.4), at(createToy(world({ finished: true, toad: { at: 'table', x: 500, y: 624 } }), 1), 0.4), at(createToy(world({ toad: { at: 'seat', place: 'log' } }), 1), 0.4)]
    for (const field of Object.keys(poseOf('toad', states[0]))) expect(states.some((toy) => read(toy, 'toad', field, 0.31)), `toad.${field}`).toBe(true)
  })

  it('whoever lives under a cover: every value of its pose, for each of the ten dwellers and the woodlouse', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const toy = at(createToy(world({ season, open: [...PLACES], things: { ...freshWorld(null).things, worm: { at: 'path', x: 930, y: 500 } } }), 1), 0.4)
      for (const place of PLACES) {
        const found = dwellerPose(toy, place)
        if (!found) continue
        // What each kind of dweller sets in its own act, beyond where it is and how it is turned and squashed.
        const manner = found.find === 'woodlouse' ? LOUSE : MANNERS[found.find]
        const own = Array.from({ length: 20 }, (_, i) => manner.pose((i + 0.5) / 20).own).some((value) => Math.abs(value) > 0.01)
        // The sleeper's legs paddle in two pictures by turns: its value shows in every other twelfth of a second.
        for (const field of ['dx', 'dy', 'turn', 'sx', 'sy', ...(own ? ['own'] : [])]) expect([0, 1 / 12].some((later) => { step(toy, later); return read(toy, `find:${place}`, field, 0.6) }), `${found.find}.${field}`).toBe(true)
        expect(read(toy, `find:${place}`, 'fade', -0.4), `${found.find}.fade`).toBe(true)
      }
    }
  })

  it('each of the six things: every value any of its cells sets is one the view draws for that thing', () => {
    const cellsOf = (thing: ThingId): ((s: number) => Go)[] => [
      TOUCHED[thing].pose, BEFORE_HOG[thing].pose, ON_STONE[thing].pose, IN_WATER[thing].pose, STOLEN[thing].pose,
      ...(thing === 'worm' ? [] : [ON_BALL[thing].pose]), ...(thing === 'button' ? [] : [ON_PATH[thing].pose]),
      ...PAIRS.filter((pair) => pair.split('+').includes(thing)).map((pair) => (s: number) => PAIRED[pair].pose(s, 1)[pair.split('+').indexOf(thing)]),
    ]
    const rest = still()
    for (const thing of THINGS) {
      const toy = at(createToy(world({ things: { ...freshWorld(null).things, [thing]: { at: 'path', x: 930, y: 500 } } }), 1), 0.4)
      const set = new Set<keyof Go>()
      for (const pose of cellsOf(thing)) for (let s = 0; s <= 6; s += 0.05) { const go = pose(s); for (const key of Object.keys(rest) as (keyof Go)[]) if (Math.abs(go[key] - rest[key]) > 1e-6) set.add(key) }
      // `go`, `dx`, `dy` and `held` say where it is, which the view reads as its place; the rest say how it is drawn.
      for (const key of set) {
        if (key === 'go' || key === 'dx' || key === 'dy' || key === 'held') continue
        expect(read(toy, `thing:${thing}`, key, key === 'show' ? -0.5 : key === 'sx' ? 0.2 : 0.6), `${thing}.${key}`).toBe(true)
      }
      expect(read(toy, `thing:${thing}`, 'scale', 0.2), `${thing}.scale`).toBe(true)
      expect(set.size, thing).toBeGreaterThan(3)
    }
  })

  it('the answer to a touch is never something a quality tier leaves out: a knock is drawn at every tier', () => {
    for (const tier of TIERS) {
      const toy = createToy(world(), 1)
      const draws = (): number => view.draw(tracingContext().g, 1180, 820, 2, { toy, guidance: null, tier })
      step(toy, 0.1)
      const before = draws()
      press(toy, { x: 590, y: 330 })
      step(toy, 0.05)
      expect(draws(), `tier ${TIERS.indexOf(tier)}`).toBeGreaterThan(before)
    }
  })
})

describe('a thing is touched where it is drawn, in every state', () => {
  it('at every frame of the whole walk: a finger on the middle of a thing that is seen lands on that thing', () => {
    let looked = 0
    const wrong: string[] = []
    const finger: Finger = new Finger(1, 20, (toy, doing) => {
      // A touch ends a scene before it lands, so what it lands on is the scene's end: those frames are held by the scene tests.
      if (toy.scene) return
      for (const thing of THINGS) {
        const seen = drawn(toy, thing)
        if (!seen || seen.pose.show <= 0 || seen.inHand || seen.room !== toy.room) continue
        const where = toy.things[thing].at
        looked += 1
        const target = targetAt(toy, seen.at)
        // In the nest it is the jay's: the touch is the nest's or his, and tips it out. Under its cover the touch
        // is the hollow's, which answers as the thing. Anywhere else the touch lands on a thing drawn right there.
        const ok = where === 'nest' ? target.kind === 'nest' || target.kind === 'jay' || target.kind === 'thing'
          : where === 'home' ? target.kind === 'find' || target.kind === 'thing' || target.kind === 'cover'
          : target.kind === 'thing' && Math.hypot(drawn(toy, target.thing)!.at.x - seen.at.x, drawn(toy, target.thing)!.at.y - seen.at.y) <= GRAB
        if (!ok && wrong.length < 12) wrong.push(`${thing} (${where}) at ${seen.at.x.toFixed(0)},${seen.at.y.toFixed(0)} during ${doing}: ${JSON.stringify(target)}`)
      }
    })
    for (const lap of Object.values(LAPS)) lap(finger)
    expect(wrong).toEqual([])
    expect(looked).toBeGreaterThan(20000)
  }, 30000)

  it('what lies under an open cover is touched in its hollow, where it is drawn', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const toy = at(createToy(world({ season, open: [...PLACES] }), 1), 0.4)
      for (const place of PLACES) {
        const target = targetAt(toy, SPOTS[place].find)
        expect(target.kind === 'find' && target.place === place, `${season} ${place}`).toBe(true)
        const thing = THINGS.find((one) => drawn(toy, one) && Math.hypot(drawn(toy, one)!.at.x - SPOTS[place].find.x, drawn(toy, one)!.at.y - SPOTS[place].find.y) < 1)
        const found = dwellerPose(toy, place)
        // Either a thing is drawn there or a dweller is, never both and never neither.
        expect(Boolean(thing) !== Boolean(found), `${season} ${place}`).toBe(true)
      }
    }
  })
})

import { findPose, hedgehogPose, jayPose, toadPose } from './poses'
function poseOf(who: 'hedgehog' | 'jay' | 'toad', toy: Toy): object {
  return who === 'hedgehog' ? hedgehogPose(toy) : who === 'jay' ? jayPose(toy) : toadPose(toy)
}
function dwellerPose(toy: Toy, place: (typeof PLACES)[number]) {
  return findPose(toy, place)
}
