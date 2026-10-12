import { describe, expect, it } from 'vitest'
import { GROUND, WAIT_AT, inEllipse } from './clearing'
import { MAX_CREATURES, TIERS } from './config'
import { facing, type Creature } from './creatures'
import { Painter } from './painter'
import { SLOTS } from './pen'
import { roomAt } from './reach'
import type { SavedThing } from './save'
import { STAGE } from './stage'
import type { Kind } from './parts'
import { DT, RecordingPen, again, clearing, drawnAt, drawnPoints, heard, kept, lying, many, play, tapHeap, thing, toyOf } from './testing'
import { LEAVE_WITHIN, hasteOf } from './travel'
import { IN_SIGHT, MOST_LEAVING, Toy, putAway } from './toy'
import { WAIT_EYES, drawFrame } from './view'
import { read, write } from './save'

// The eldest that walks off can be had back. When a sixth creature wakes,
// the one woken longest ago walks off between the trees and waits behind
// them at the edge it left by, its eyes showing between the trunks; a tap
// there brings it back, and the one that is then eldest walks off in turn.
// Only the last to leave waits, and it is saved.

const five = (): SavedThing[] => [0, 1, 2, 3, 4].map((i) => thing(i + 1, 380 + i * 100, 360 + (i % 2) * 120, ['twig', 'cap', 'cap'], i + 1))
const begun = (n: number): SavedThing[] => Array.from({ length: n }, (_, i) => thing(20 + i, 330 + i * 75, 470 - (i % 2) * 150, ['cap']))

/** Wakes the next thing that wants a second eye, by a tap on the caps, and plays to the frame it wakes. */
function wakeNext(toy: Toy): Creature {
  const before = toy.creatures.length + (toy.away && !toy.away.creature ? 0 : 0), known = new Set(toy.creatures)
  tapHeap(toy, 'cap')
  for (let f = 0; f < 200 && toy.creatures.every((creature) => known.has(creature)); f++) toy.step(DT)
  const woken = toy.creatures.find((creature) => !known.has(creature))!
  expect(woken, `a creature woke (${before})`).toBeDefined()
  return woken
}

/** The eyes that show between the trunks in a frame of this toy, as the pen was asked to draw them. */
function eyesShown(toy: Toy): { side: -1 | 1; open: number; shut: number } | null {
  const pen = new RecordingPen(), painter = new Painter()
  drawFrame(pen, toy, null, TIERS[0], painter)
  for (const side of [-1, 1] as const) {
    const here = pen.log.filter((line) => line.startsWith('|stamp|')).map((line) => line.split('|')[2].split(',')).filter((stamp) => Math.abs(Math.abs(Number(stamp[1]) - WAIT_AT[side].x) - WAIT_EYES) < 0.01 && Math.abs(Number(stamp[2]) - WAIT_AT[side].y) < 40)
    if (here.length > 0) return { side, open: here.filter((stamp) => stamp[0].startsWith('eye-')).length, shut: here.filter((stamp) => stamp[0].startsWith('cap-')).length }
  }
  return null
}

/** A sixth creature has woken and the eldest has walked right off. */
function gone(): { toy: Toy; eldest: Creature } {
  const toy = toyOf(clearing([...five(), ...begun(1)]))
  wakeNext(toy)
  const eldest = toy.creatures.find((creature) => creature.thing.id === 1)!
  for (let f = 0; f < 60 * 80 && toy.creatures.includes(eldest); f++) toy.step(DT)
  expect(toy.creatures).not.toContain(eldest)
  return { toy, eldest }
}

describe('the eldest that walks off', () => {
  it('is saved as the one that waits from the step it sets out, and is no longer one of the things on the clearing', () => {
    const toy = toyOf(clearing([...five(), ...begun(1)]))
    wakeNext(toy)
    const eldest = toy.creatures.find((creature) => creature.thing.id === 1)!
    expect(eldest.leaving).toBe(true)
    expect(toy.away?.thing).toBe(eldest.thing)
    const record = write(toy.saved())
    expect(record.things.map((one) => one.id)).toEqual([2, 3, 4, 5, 20])
    expect(record.waiting?.thing.id).toBe(1)
    expect(record.waiting?.thing.parts.map((part) => part.kind)).toEqual(['twig', 'cap', 'cap'])
    // It is seen to go, in its own way, and no eyes show between the trunks until it is there.
    expect(eyesShown(toy)).toBeNull()
    const from = eldest.thing.x
    play(toy, 3)
    expect(Math.abs(eldest.thing.x - from)).toBeGreaterThan(40)
    expect(toy.creatures).toContain(eldest)
  })

  it('answers a tap as a poke while it walks off, and goes on walking', () => {
    const toy = toyOf(clearing([...five(), ...begun(1)]))
    wakeNext(toy)
    const eldest = toy.creatures.find((creature) => creature.thing.id === 1)!
    play(toy, 0.5)
    toy.press(300, 300); toy.tap()
    heard(toy)
    const at = drawnAt(eldest, 0)
    toy.press(at.x, at.y)
    expect(heard(toy)).toEqual(['feel'])
    toy.tap()
    expect(heard(toy)).toEqual(['poke-twig'])
    expect(eldest.poke?.kind).toBe('twig')
    expect(eldest.leaving).toBe(true)
    for (let f = 0; f < 60 * 80 && toy.creatures.includes(eldest); f++) toy.step(DT)
    expect(toy.creatures).not.toContain(eldest)
  })

  it('waits behind the trees at the edge it left by, with its eyes showing between the trunks, in the game and in the record', () => {
    const { toy, eldest } = gone()
    const side = toy.away!.side
    expect(side).toBe(eldest.thing.x < 0 ? -1 : 1)
    expect(toy.away!.creature).toBeNull()
    const shown = eyesShown(toy)!
    expect([shown.side, shown.open + shown.shut]).toEqual([side, 2])
    // The place is clear of the home control and the corner, on the stage, and off the ground.
    expect(roomAt(WAIT_AT[side].x, WAIT_AT[side].y)).toBeGreaterThan(60)
    expect(inEllipse(WAIT_AT[side].x, WAIT_AT[side].y, GROUND, 60)).toBe(false)
    expect(WAIT_AT[1].x).toBe(STAGE.width - WAIT_AT[-1].x)
    for (const found of [again(toy), putAway(toy, 6, 99)]) {
      expect(found.away?.thing.id).toBe(1)
      expect(found.away?.side).toBe(side)
      expect(found.creatures).toHaveLength(MAX_CREATURES)
      expect(eyesShown(found)?.side).toBe(side)
    }
  })

  it('is found waiting, not walking, when the game is put away while it is still on its way off', () => {
    const toy = toyOf(clearing([...five(), ...begun(1)]))
    wakeNext(toy)
    play(toy, 1)
    expect(toy.creatures.some((creature) => creature.leaving)).toBe(true)
    const found = again(toy)
    expect(found.creatures.some((creature) => creature.leaving)).toBe(false)
    expect(found.away?.thing.id).toBe(1)
    expect(eyesShown(found)).not.toBeNull()
    expect(lying(found)).toEqual(kept(write(toy.saved())))
  })

  it('comes back at a tap on its eyes, on to the ground, and the one that is then eldest walks off in its turn and waits', () => {
    const { toy } = gone()
    const side = toy.away!.side
    heard(toy)
    toy.press(WAIT_AT[side].x + 6, WAIT_AT[side].y - 4)
    expect(heard(toy)).toContain('blink')
    toy.tap()
    const back = toy.creatures.find((creature) => creature.thing.id === 1)!
    expect(back).toBeDefined()
    expect(toy.things).toContain(back.thing)
    // The one woken longest ago of the others goes in its turn, and is the one that waits now.
    const next = toy.creatures.find((creature) => creature.leaving)!
    expect(next.thing.id).toBe(2)
    expect(toy.away?.thing.id).toBe(2)
    expect(write(toy.saved()).things.map((one) => one.id).sort((a, b) => a - b)).toEqual([1, 3, 4, 5, 20])
    expect(write(toy.saved()).waiting?.thing.id).toBe(2)
    // Put away while it is coming back: it is found on the ground, where it was going.
    const found = again(toy).things.find((one) => one.id === 1)!
    expect(inEllipse(found.x, found.y, GROUND)).toBe(true)
    play(toy, 20)
    expect(inEllipse(back.thing.x, back.thing.y, GROUND)).toBe(true)
    expect(back.entering).toBeNull()
    expect(toy.creatures.filter((creature) => !creature.leaving)).toHaveLength(MAX_CREATURES)
    // It is the youngest now: it is the last of these to be sent off again.
    expect(back.thing.woke).toBeGreaterThan(Math.max(...toy.creatures.filter((creature) => creature !== back).map((creature) => creature.thing.woke)))
  })

  it('is never out of reach: with a creature standing right over the waiting place, the eyes are drawn over it and a tap there brings the waiting one back', () => {
    const { toy } = gone()
    const side = toy.away!.side, cover = toy.creatures.find((creature) => !creature.leaving)!
    cover.thing.x = WAIT_AT[side].x; cover.thing.y = WAIT_AT[side].y; cover.target = null; cover.rest = 999
    const pen = new RecordingPen(), painter = new Painter()
    drawFrame(pen, toy, null, TIERS[0], painter)
    const drawn = pen.log.filter((line) => line.startsWith('|stamp|') || line.startsWith('|sprite|'))
    const eyes = drawn.map((line, i) => (line.startsWith('|stamp|eye-') && Math.abs(Math.abs(Number(line.split('|')[2].split(',')[1]) - WAIT_AT[side].x) - WAIT_EYES) < 0.01 ? i : -1)).filter((i) => i >= 0)
    const bodies = drawn.map((line, i) => (line.startsWith('|sprite|') ? i : -1)).filter((i) => i >= 0)
    expect(eyes).toHaveLength(2)
    expect(bodies.length).toBeGreaterThanOrEqual(5)
    expect(Math.min(...eyes)).toBeGreaterThan(Math.max(...bodies))
    // The tap is the waiting one's, not a poke of the one that stands there.
    toy.press(WAIT_AT[side].x, WAIT_AT[side].y)
    expect(toy.grip).toBeNull()
    toy.tap()
    expect(toy.creatures.some((creature) => creature.thing.id === 1)).toBe(true)
    expect(cover.held).toBe(-1)
  })

  it('is the only one that waits: when another walks off after it, its eyes shut and are gone, and the record holds the new one', () => {
    const toy = toyOf(clearing([...five(), ...begun(2)]))
    wakeNext(toy)
    const first = toy.creatures.find((creature) => creature.thing.id === 1)!
    for (let f = 0; f < 60 * 80 && toy.creatures.includes(first); f++) toy.step(DT)
    const side = toy.away!.side
    wakeNext(toy)
    expect(toy.away?.thing.id).toBe(2)
    expect(toy.left?.side).toBe(side)
    const shutting = eyesShown(toy)!
    expect([shutting.side, shutting.open, shutting.shut]).toEqual([side, 0, 2])
    play(toy, 0.7)
    expect(toy.left).toBeNull()
    expect(write(toy.saved()).waiting?.thing.id).toBe(2)
    // A tap where the first one waited brings nobody back while the second is still on its way.
    const before = toy.creatures.length
    toy.press(WAIT_AT[side].x, WAIT_AT[side].y); toy.tap()
    expect(toy.creatures).toHaveLength(before)
    expect(toy.creatures.some((creature) => creature.thing.id === 1)).toBe(false)
  })
})

/** One creature of each way of going, and the slowest of them. */
const bodies: Record<string, Kind[]> = {
  'a scuttler': ['twig', 'twig'],
  'a hopper': ['maple'],
  'a slitherer': ['willow', 'willow'],
  'a roller': ['round'],
  'a strutter with one feather': ['feather'],
  'a strutter that is all tail': many('feather', 14),
  'a creeper': ['seed', 'seed', 'seed'],
  'two eyes and nobody': [],
}

describe('a creature that walks off is soon gone', () => {
  for (const [name, kinds] of Object.entries(bodies)) {
    it(`${name} is past the trees within ${LEAVE_WITHIN} seconds of setting out, in its own way of going, quickened`, () => {
      // It stands in the very middle of the ground, as far from either edge as it can be.
      const eldest = thing(1, GROUND.x - 2, GROUND.y, [...kinds, 'cap', 'cap'], 1)
      const others = [0, 1, 2, 3].map((i) => thing(i + 2, 330 + i * 170, i % 2 ? 300 : 540, ['twig', 'cap', 'cap'], i + 2))
      const toy = toyOf(clearing([eldest, ...others, ...begun(1)]))
      wakeNext(toy)
      const leaver = toy.creatures.find((creature) => creature.thing.id === 1)!
      expect(leaver.leaving).toBe(true)
      const from = leaver.gone
      let frames = 0, strode = 0
      while (toy.creatures.includes(leaver) && frames < 60 * 30) { const phase = leaver.body.clock; toy.step(DT); frames++; if (leaver.body.clock !== phase) strode++ }
      expect(toy.creatures).not.toContain(leaver)
      expect(from + frames * DT).toBeLessThanOrEqual(LEAVE_WITHIN)
      // It went in its own way for most of that, not carried: its stride ran in nearly every frame.
      expect(strode).toBeGreaterThan(frames * 0.6)
      expect(toy.away?.thing.id).toBe(1)
    })
  }

  for (const [name, kinds] of Object.entries(bodies)) {
    it(`${name} with a finger held on it all the way is still past the trees within ${LEAVE_WITHIN} seconds, and the lift after it has gone pokes nobody`, () => {
      const eldest = thing(1, GROUND.x - 2, GROUND.y, [...kinds, 'cap', 'cap'], 1)
      const others = [0, 1, 2, 3].map((i) => thing(i + 2, 330 + i * 170, i % 2 ? 300 : 540, ['twig', 'cap', 'cap'], i + 2))
      const toy = toyOf(clearing([eldest, ...others, ...begun(1)]))
      wakeNext(toy)
      const leaver = toy.creatures.find((creature) => creature.thing.id === 1)!
      expect(leaver.leaving).toBe(true)
      const from = leaver.gone, at = drawnAt(leaver, 0)
      // The finger comes down on it as it sets out, and stays down.
      toy.press(at.x, at.y)
      expect(toy.grip?.creature).toBe(leaver)
      expect(leaver.held).toBeGreaterThanOrEqual(0)
      let frames = 0
      while (toy.creatures.includes(leaver) && frames < 60 * 30) { toy.step(DT); frames++ }
      expect(toy.creatures).not.toContain(leaver)
      expect(from + frames * DT).toBeLessThanOrEqual(LEAVE_WITHIN)
      // It was held up: it did not go at its own pace and leave early.
      expect(from + frames * DT).toBeGreaterThan(LEAVE_WITHIN - 1)
      // Nothing is left of the hold once it has gone, and the lift makes no sound.
      expect(toy.grip).toBeNull()
      expect(leaver.held).toBe(-1)
      heard(toy)
      toy.tap()
      expect(heard(toy)).toEqual([])
      expect(leaver.poke).toBeNull()
      expect(toy.away?.thing.id).toBe(1)
    })
  }

  it('is not quickened when it is quick enough by itself, and never while it is not leaving', () => {
    const toy = toyOf(clearing([thing(1, 900, 300, ['twig', 'twig', 'twig', 'cap', 'cap'], 1)]))
    const creature = toy.creatures[0]
    expect(hasteOf(creature, 'feather', 14, 900)).toBe(1)
    creature.leaving = true
    expect(hasteOf(creature, 'twig', 3, 300)).toBe(1)
    expect(hasteOf(creature, 'feather', 14, 600)).toBeGreaterThan(3)
  })
})

describe('no creature is lost unseen', () => {
  it('finds the eldest waiting between the trunks, eyes showing, when the game was put away while the cap that makes a sixth creature was in the air', () => {
    const toy = toyOf(clearing([...five(), ...begun(1)]))
    tapHeap(toy, 'cap')
    toy.step(DT)
    // The cap is still flying: nobody has woken and nobody has set out.
    expect(toy.creatures).toHaveLength(MAX_CREATURES)
    expect(toy.away).toBeNull()
    const left = write(toy.saved())
    expect(left.things.filter((one) => one.awake).map((one) => one.id).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 20])
    expect(left.waiting?.thing.id).toBe(1)
    expect(left.waiting?.thing.parts).toHaveLength(3)
    for (const found of [again(toy), putAway(toy, 6, 99)]) {
      expect(found.creatures.map((creature) => creature.thing.id).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 20])
      expect(found.away?.thing.id).toBe(1)
      expect(found.away?.creature ?? null).toBeNull()
      expect(eyesShown(found)).toEqual({ side: left.waiting!.side, open: 2, shut: 0 })
      // And it can be had back, like any that waits.
      const side = found.away!.side
      found.press(WAIT_AT[side].x, WAIT_AT[side].y); found.tap()
      expect(found.creatures.some((creature) => creature.thing.id === 1)).toBe(true)
    }
    // The game that was not put away comes to the same: the same five up, the same one waiting at the same edge.
    const live = toyOf(clearing([...five(), ...begun(1)]))
    tapHeap(live, 'cap')
    play(live, LEAVE_WITHIN + 6)
    expect(live.creatures.map((creature) => creature.thing.id).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 20])
    expect([live.away?.thing.id, live.away?.side]).toEqual([1, left.waiting!.side])
  })

  it('reads a record that holds six creatures and nobody waiting as five up and the eldest waiting, never as one dropped', () => {
    const six = [...five(), thing(6, 590, 300, ['round', 'cap', 'cap'], 6)]
    const found = new Toy(read(JSON.parse(JSON.stringify(clearing(six))), 6, 1), 1)
    expect(found.creatures).toHaveLength(MAX_CREATURES)
    expect(found.away?.thing.id).toBe(1)
    expect(eyesShown(found)?.open).toBe(2)
  })
})

describe('a creature that is called back is seen coming at once', () => {
  for (const [name, kinds] of Object.entries(bodies)) {
    for (const side of [-1, 1] as const) {
      it(`${name}, waiting at the ${side < 0 ? 'left' : 'right'}: at the tap it is at the edge with its foremost part inside the stage, facing in, and half a second later it is further in`, () => {
        const waiting = { side, thing: thing(9, 0, 0, [...kinds, 'cap', 'cap'], 1) }
        const toy = toyOf(clearing([0, 1, 2].map((i) => thing(i + 2, 420 + i * 150, 520, ['twig', 'cap', 'cap'], i + 2)), { waiting }))
        toy.press(WAIT_AT[side].x, WAIT_AT[side].y); toy.tap()
        const back = toy.creatures.find((creature) => creature.thing.id === 9)!
        expect(back).toBeDefined()
        // Before a frame has passed: some of it is well inside the stage, and its eyes lead inward.
        const inside = (): number => Math.max(...drawnPoints(back).map((point) => (side < 0 ? point.x + point.r : STAGE.width - point.x + point.r)))
        const first = inside()
        expect(first).toBeGreaterThanOrEqual(IN_SIGHT - 12)
        expect(Math.cos(facing(back)) * -side).toBeGreaterThan(0.6)
        const from = back.thing.x
        play(toy, 0.5)
        expect((back.thing.x - from) * -side, 'it has come on').toBeGreaterThan(4)
        expect(inside()).toBeGreaterThan(first)
        // And it is on the ground within the time a leaver is given.
        play(toy, LEAVE_WITHIN)
        expect(inEllipse(back.thing.x, back.thing.y, GROUND)).toBe(true)
        expect(back.entering).toBeNull()
      })
    }
  }
})

describe('no creature is ever unseen', () => {
  it('keeps a picture for every creature there can be: five that stay, every one that can be leaving, and one whose eyes came off', () => {
    expect(SLOTS).toBeGreaterThanOrEqual(MAX_CREATURES + MOST_LEAVING + 1)
  })

  it('gives every creature its own picture in every frame while one wakes after another as fast as taps can wake them, and takes none away while it can be seen', () => {
    const toy = toyOf(clearing([...five(), ...begun(8)]))
    const pen = new RecordingPen(), painter = new Painter()
    painter.prime(pen, toy, TIERS[0])
    let most = 0
    const frame = (): void => {
      const before = [...toy.creatures]
      toy.step(DT)
      // Whoever is no longer among the creatures had walked right off the stage.
      for (const creature of before) if (!toy.creatures.includes(creature)) expect(creature.thing.x < 0 || creature.thing.x > STAGE.width, `creature ${creature.thing.id} at ${Math.round(creature.thing.x)}`).toBe(true)
      // What each is drawn from in this frame: a picture made at the end of the frame is seen from the next.
      const from = new Map(toy.creatures.map((creature) => [creature, painter.pictureOf(creature)]))
      pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter)
      const leaving = toy.creatures.filter((creature) => creature.leaving)
      most = Math.max(most, leaving.length)
      expect(leaving.length).toBeLessThanOrEqual(MOST_LEAVING)
      for (const creature of toy.creatures) {
        // Seen: from its own picture, or, in the frames of its waking, still in the picture of the place.
        const key = from.get(creature) ?? null
        if (key !== null) expect(pen.keys.filter((one) => one === key), `creature ${creature.thing.id}`).toHaveLength(1)
        else expect(creature.thing.parts.every((part) => painter.holds(part) || pen.keys.some((one) => one.startsWith(part.kind))), `creature ${creature.thing.id}`).toBe(true)
        // And all of what is seen of it is on the page while it stays, or on its way off it.
        for (const point of drawnPoints(creature)) expect(roomAt(point.x, point.y) - point.r).toBeGreaterThanOrEqual(0)
      }
    }
    for (let wake = 0; wake < 8; wake++) {
      const known = new Set(toy.creatures)
      tapHeap(toy, 'cap')
      for (let f = 0; f < 200 && toy.creatures.every((creature) => known.has(creature)); f++) frame()
    }
    for (let f = 0; f < 120; f++) frame()
    // Several were on their way off at once.
    expect(most).toBeGreaterThanOrEqual(2)
    expect(toy.creatures.filter((creature) => !creature.leaving)).toHaveLength(MAX_CREATURES)
  })
})
