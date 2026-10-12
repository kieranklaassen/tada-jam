import { describe, expect, it } from 'vitest'
import { BEFORE_HOG, IN_WATER, ON_BALL, ON_PATH, ON_STONE, PAIRED, STOLEN, TOUCHED, still, type Cell, type Go } from './cells'
import { NEST, NEST_SLOTS, THING_R } from './layout'
import { LOUSE } from './motion'
import { hedgehogPose, jayPose, toadPose } from './poses'
import { GRAB } from './rules'
import { freshWorld } from './save'
import { Finger, LAPS } from './script'
import { drawn, thingUnder } from './things'
import { createToy, savedOf, type Mover, type Toy } from './toy'
import { SOUNDS, type SoundId } from './voices'
import { PAIRS, THINGS, type ThingId } from './wood'

// Every cell of every table has its own sound and its own motion: each of
// the six things touched, set before the hedgehog (unrolled and as a ball),
// put on the path, set on the toad's stone, set in the water, taken by the
// jay, and each of the fifteen pairs on the table. Held as numbers, cell
// against cell, and held through the game: the whole walk reaches every
// cell, sees its motion and hears its sound while the motion is under way.

type Named = { name: string; kind: string; thing: ThingId; length: number; sounds: SoundId[]; pose: (s: number) => readonly Go[] }

const rows: [string, string, Partial<Record<ThingId, Cell>>][] = [
  ['touched', 'touched:', TOUCHED], ['before the hedgehog', 'hog:', BEFORE_HOG], ['on the ball', 'ball:', ON_BALL], ['on the path', 'path:', ON_PATH],
  ['on the stone', 'stone:', ON_STONE], ['in the water', 'water:', IN_WATER], ['taken by the jay', 'steal:', STOLEN],
]
const CELLS: Named[] = [
  ...rows.flatMap(([row, prefix, table]) => (Object.keys(table) as ThingId[]).map((thing) => {
    const cell = table[thing]!
    // The worm before the hedgehog is the scene of the two of them: its sounds are on his act.
    const sounds = row === 'before the hedgehog' && thing === 'worm' ? (['wormDive', 'hogHm'] as SoundId[]) : cell.cues.map((cue) => cue.sound)
    return { name: `${thing} ${row}`, kind: `${prefix}${thing}`, thing, length: cell.length, sounds, pose: (s: number) => [cell.pose(s)] }
  })),
  ...PAIRS.map((pair) => ({ name: `${pair} on the table`, kind: `pair:${pair}`, thing: pair.split('+')[0] as ThingId, length: PAIRED[pair].length, sounds: PAIRED[pair].cues.map((cue) => cue.sound), pose: (s: number) => PAIRED[pair].pose(s, 1) })),
]

const sample = (cell: Named): string => Array.from({ length: 12 }, (_, i) => cell.pose(((i + 0.5) / 12) * cell.length).map((go) => Object.values(go).map((value) => value.toFixed(2)).join(',')).join('|')).join(' ')

describe('every cell of every table', () => {
  it('is there: six things by seven answers, less the two that cannot be, and fifteen pairs', () => {
    // The worm is never set on the ball (he unrolls for it) and the button never lies on the path (the jay takes it).
    expect(CELLS.length).toBe(6 * 7 - 2 + 15)
    expect(Object.keys(ON_BALL).sort()).toEqual(THINGS.filter((thing) => thing !== 'worm').sort())
    expect(Object.keys(ON_PATH).sort()).toEqual(THINGS.filter((thing) => thing !== 'button').sort())
    expect(Object.keys(PAIRED).sort()).toEqual([...PAIRS].sort())
  })

  it('has its own sound: no two cells sound alike, and every sound is one that is written', () => {
    const voices = CELLS.map((cell) => cell.sounds.join('+'))
    for (const cell of CELLS) {
      expect(cell.sounds.length, cell.name).toBeGreaterThan(0)
      for (const id of cell.sounds) expect(SOUNDS[id], `${cell.name}: ${id}`).toBeDefined()
    }
    expect(new Set(voices).size).toBe(CELLS.length)
    // And no two are the same marks under two names.
    const marks = CELLS.map((cell) => cell.sounds.map((id) => JSON.stringify(SOUNDS[id].marks)).join('+'))
    expect(new Set(marks).size).toBe(CELLS.length)
  })

  it('has its own motion: no two cells move alike, each is seen to move, and each lasts long enough to be seen', () => {
    const moves = CELLS.map(sample)
    expect(new Set(moves).size).toBe(CELLS.length)
    const rest = Object.values(still()).map((value) => value.toFixed(2)).join(',')
    for (const cell of CELLS) {
      const seen = Array.from({ length: 12 }, (_, i) => cell.pose(((i + 0.5) / 12) * cell.length)).some((poses) => poses.some((go) => Object.values({ ...go, go: 0 }).map((value) => value.toFixed(2)).join(',') !== rest))
      // A thing that only travels (the worm into the hole, a thing carried off) is seen to move by going somewhere.
      const travels = cell.pose(cell.length * 0.9).some((go) => go.go > 0 || go.held > 0 || go.show < 1)
      expect(seen || travels, cell.name).toBe(true)
      expect(cell.length, cell.name).toBeGreaterThanOrEqual(0.5)
      expect(cell.length, cell.name).toBeLessThanOrEqual(6)
      // No sound of a cell begins after its motion is over.
      for (const poses of [cell.pose(0), cell.pose(cell.length)]) for (const go of poses) for (const value of Object.values(go)) expect(Number.isFinite(value), cell.name).toBe(true)
    }
    expect(LOUSE.length).toBeGreaterThan(0.5)
  })

  it('answers in the animals too: the hedgehog, the toad and the jay each do something different for each thing', () => {
    const during = (who: 'hedgehog' | 'toad' | 'jay', kind: string, length: number, rolled = false): string => {
      const toy: Toy = createToy({ ...freshWorld(null), rolled, finished: false }, 1)
      toy.acts[who] = { kind, since: 0, length, cues: [], fired: 0, scene: false, from: { x: 416, y: 690 }, to: { x: 440, y: 690 }, n: 0, room: false }
      const poses: string[] = []
      for (let i = 0; i < 12; i++) { toy.time = ((i + 0.5) / 12) * length; const pose = who === 'hedgehog' ? hedgehogPose(toy) : who === 'toad' ? toadPose(toy) : jayPose(toy); poses.push(Object.values({ ...pose, blink: 0, blinkLeft: 0, blinkRight: 0 }).map((value) => (typeof value === 'number' ? value.toFixed(2) : String(value))).join(',')) }
      return poses.join(' ')
    }
    const hog = [...THINGS.map((thing) => during('hedgehog', `hog:${thing}`, BEFORE_HOG[thing].length)), ...THINGS.filter((thing) => thing !== 'worm').map((thing) => during('hedgehog', `ball:${thing}`, ON_BALL[thing as Exclude<ThingId, 'worm'>].length, true))]
    expect(new Set(hog).size).toBe(11)
    const toad = THINGS.map((thing) => during('toad', `stone:${thing}`, ON_STONE[thing].length))
    expect(new Set(toad).size).toBe(6)
    const jay = [...THINGS.map((thing) => during('jay', `steal:${thing}`, STOLEN[thing].length)), ...THINGS.filter((thing) => thing !== 'button').map((thing) => during('jay', `path:${thing}`, ON_PATH[thing as Exclude<ThingId, 'button'>].length))]
    expect(new Set(jay).size).toBe(11)
  })

  it('is reached by the game: the whole walk sees every cell move and hears its sound while it moves', () => {
    const heardIn = new Map<string, Set<string>>()
    const finger: Finger = new Finger(1, 30)
    const play = finger.ears.play.bind(finger.ears)
    finger.ears.play = (events) => {
      for (const event of events) {
        // Whose sound it is: the act of that mover at this moment, and, for a scene, the act of whoever shares it.
        for (const mover of Object.keys(finger.toy.acts) as Mover[]) {
          const kind = finger.toy.acts[mover]!.kind, set = heardIn.get(kind) ?? new Set<string>()
          if (mover === event.mover || kind === finger.toy.acts[event.mover]?.kind) { set.add(event.id); heardIn.set(kind, set) }
        }
      }
      play(events)
    }
    for (const lap of Object.values(LAPS)) lap(finger)
    const missing: string[] = []
    for (const cell of CELLS) {
      if (!finger.seen.has(`thing>${cell.kind}`)) missing.push(`${cell.name}: never seen`)
      for (const id of cell.sounds) if (!heardIn.get(cell.kind)?.has(id)) missing.push(`${cell.name}: ${id} never heard with it`)
    }
    expect(missing).toEqual([])
    // The woodlouse too: it moves in, is touched, and trundles off.
    for (const kind of ['find>hello', 'find>act', 'find>louseOut']) expect(finger.seen.has(kind), kind).toBe(true)
    expect(finger.ears.heard.some((one) => one.event.id === 'louse')).toBe(true)
    expect(finger.ears.heard.some((one) => one.event.id === 'louseOut')).toBe(true)
  }, 30000)
})

describe('the jay takes a shiny thing: it is always seen in the nest and always got back with one touch', () => {
  const stealable = THINGS.filter((thing) => thing !== 'apple')

  it('whatever he takes shows over the rim of the nest, and one touch on the nest brings all of it back to the open ground', () => {
    for (let count = 1; count <= stealable.length; count++) {
      const world = { ...freshWorld(null), finished: false }
      for (const thing of stealable.slice(0, count)) world.things[thing] = { at: 'nest' }
      const finger = new Finger(1, 30, () => {}, world)
      const toy = finger.toy
      for (const thing of stealable.slice(0, count)) {
        const seen = drawn(toy, thing)!
        expect(seen.pose.show, thing).toBe(1)
        // Its top stands clear above the rim: a good part of it is seen.
        expect(seen.at.y - THING_R * seen.scale, thing).toBeLessThan(NEST.y - 20)
        expect(NEST_SLOTS.some((slot) => slot.x === seen.at.x && slot.y === seen.at.y)).toBe(true)
      }
      finger.tap(NEST, 'the nest')
      // In the save at once, before anything has finished falling.
      for (const thing of stealable.slice(0, count)) expect(savedOf(toy).things[thing].at, thing).toBe('path')
      finger.rest()
      const spots = stealable.slice(0, count).map((thing) => drawn(toy, thing)!.at)
      for (const [index, thing] of stealable.slice(0, count).entries()) {
        // Each lies in the open, by itself, where a finger takes it.
        expect(thingUnder(toy, spots[index], GRAB), thing).toBe(thing)
        for (const other of spots) if (other !== spots[index]) expect(Math.hypot(other.x - spots[index].x, other.y - spots[index].y)).toBeGreaterThanOrEqual(THING_R * 2)
        expect(toy.wet.includes(thing), `${thing} comes out dry`).toBe(false)
      }
    }
  })

  it('in play: each thing he takes is in the nest when the scene starts, however the scene is cut, and the apple is never taken', () => {
    for (const thing of THINGS) for (const cutAfter of [0.1, 1, 2.5, 99]) {
      const finger = new Finger(1, 30)
      // The button is shiny as it is; the others are shiny wet.
      if (thing !== 'button') finger.put(thing, { x: 902, y: 718 }, `${thing} in the puddle`)
      const at = finger.reach(thing)
      finger.drag(at, { x: 930, y: 500 }, `${thing} on the ground`)
      finger.wait(0.35)
      const expected = thing === 'apple' ? 'path' : 'nest'
      expect(finger.toy.things[thing].at, `${thing} as the scene starts`).toBe(expected)
      if (cutAfter < 99) { finger.wait(cutAfter); finger.tap({ x: 590, y: 330 }, 'a touch') } else finger.rest()
      finger.wait(0.1)
      expect(finger.toy.things[thing].at).toBe(expected)
      const seen = drawn(finger.toy, thing)!
      expect(seen.pose.show).toBeGreaterThan(0)
      if (thing === 'apple') continue
      expect(seen.at.y - THING_R * seen.scale).toBeLessThan(NEST.y - 20)
      // One touch.
      finger.tap(NEST, 'the nest'); finger.rest()
      expect(finger.toy.things[thing].at).toBe('path')
      expect(thingUnder(finger.toy, drawn(finger.toy, thing)!.at, GRAB)).toBe(thing)
    }
  })
})
