import { describe, expect, it } from 'vitest'
import { DIVE_S } from './answers'
import { FULL, MOST, STEP_S } from './config'
import { SEATS, SNAIL, SUN, footFor } from './ground'
import { PLACES } from './hint'
import { freshSave, serialize, deserialize, type VillageSave } from './save'
import { DRIFT, OUT, OUT_AT_ONCE, ROOM, Village } from './village'

const SUNNY = { x: 1010, y: 500 }, BANK = { x: 640, y: 400 }, SHADY = { x: 290, y: 450 }, WATER = { x: 806, y: 742 }
/** Ten feet that fill the glade, each in its own room. */
const FEET = [[200, 400], [330, 470], [450, 400], [540, 480], [640, 400], [760, 440], [780, 548], [1030, 500], [1130, 540], [900, 520]] as const
const FRAME = 1 / 60
const LOOSEN_S = 0.65

const bare = (): Village => new Village(freshSave(6), 1)
const run = (village: Village, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += FRAME) village.step(FRAME) }
/** Presses, holds for `seconds`, and lets go. */
const hold = (village: Village, at: { x: number; y: number }, seconds: number): void => { village.press(at); run(village, seconds); village.lift() }
const sizes = (village: Village): number[] => village.toSave().mushrooms.map((m) => m.size)

describe('a finger pressed into the moss', () => {
  it('is answered when it lands: a button of a mushroom, a creak and a save, before any time has passed', () => {
    const village = bare()
    village.press(SUNNY)
    expect(village.toSave().mushrooms).toEqual([{ id: 1, x: SUNNY.x, y: SUNNY.y, size: 1, door: false }])
    expect(village.takeNotes().length).toBeGreaterThan(0)
    expect(village.takeChange()).toBe('now')
    expect(village.show().dimple).not.toBeNull()
  })

  it('swells the mushroom one step for each stretch the finger stays, and not at all once it lifts', () => {
    const village = bare()
    village.press(SUNNY)
    run(village, STEP_S * 4 + 0.02)
    expect(sizes(village)).toEqual([5])
    village.lift()
    run(village, 2)
    expect(sizes(village)).toEqual([5])
  })

  it('leaves a squat mushroom after a short press and a tall one after a long press', () => {
    const village = bare()
    hold(village, SUNNY, 0.1)
    hold(village, { x: 520, y: 470 }, 1.7)
    const [squat, tall] = sizes(village)
    expect(squat).toBeLessThanOrEqual(4)
    expect(tall).toBeGreaterThanOrEqual(9)
  })

  it('stops by itself at twelve steps, and a finger that goes on holding makes it tremble and squeak and no bigger', () => {
    const village = bare()
    village.press(SUNNY)
    run(village, STEP_S * FULL)
    expect(sizes(village)).toEqual([FULL])
    village.takeNotes()
    run(village, 1.2)
    expect(sizes(village)).toEqual([FULL])
    expect(village.takeNotes().length).toBeGreaterThan(0)
  })

  it('creaks at every step, in the same step of game time that the mushroom swells', () => {
    const village = bare()
    village.press(SUNNY)
    village.takeNotes()
    let last = 1
    for (let i = 0; i < 120; i++) {
      village.step(FRAME)
      const now = sizes(village)[0], notes = village.takeNotes()
      if (now !== last) expect(notes.length, `the step to ${now}`).toBeGreaterThan(0)
      last = now
    }
    expect(last).toBe(FULL)
  })

  it('takes its kind from the ground under the finger', () => {
    const village = bare()
    for (const at of [SUNNY, BANK, SHADY]) hold(village, at, 0.3)
    expect(village.show().mushrooms.map((m) => m.kind).sort()).toEqual(['bell', 'puff', 'red'])
  })

  it('saves the size at once when the finger lifts, and as a small change at each step before that', () => {
    const village = bare()
    village.press(SUNNY)
    village.takeChange()
    run(village, STEP_S + 0.02)
    expect(village.takeChange()).toBe('small')
    village.lift()
    expect(village.takeChange()).toBe('now')
  })

  it('keeps on holding under a finger that drifts a little, and stops when the finger runs off', () => {
    const village = bare()
    village.press(SUNNY)
    village.drag({ x: SUNNY.x + DRIFT - 6, y: SUNNY.y + 4 })
    run(village, STEP_S * 3 + 0.02)
    expect(sizes(village)).toEqual([4])
    village.drag({ x: SUNNY.x + DRIFT + 30, y: SUNNY.y })
    run(village, 1)
    expect(sizes(village)).toEqual([4])
  })

  it('never pulls out the mushroom it is growing, however the finger strays upward', () => {
    const village = bare()
    village.press(SUNNY)
    run(village, STEP_S * 3 + 0.02)
    village.drag({ x: SUNNY.x, y: SUNNY.y - OUT_AT_ONCE - 40 })
    village.lift()
    expect(village.count).toBe(1)
  })
})

describe('a mushroom that already stands', () => {
  const withOne = (at = SUNNY, seconds = 0.5): Village => { const village = bare(); hold(village, at, seconds); run(village, 2.5); village.takeNotes(); village.takeChange(); return village }

  it('is poked by a tap: it keeps its size and answers with a sound', () => {
    const village = withOne()
    const before = sizes(village)
    hold(village, { x: SUNNY.x, y: SUNNY.y - 30 }, 0.08)
    expect(sizes(village)).toEqual(before)
    expect(village.takeNotes().length).toBeGreaterThan(0)
    expect(village.takeChange()).toBe('none')
  })

  it('goes on swelling under a finger that stays on it', () => {
    const village = withOne()
    const before = sizes(village)[0]
    hold(village, { x: SUNNY.x, y: SUNNY.y - 30 }, 1.2)
    expect(sizes(village)[0]).toBeGreaterThan(before + 2)
    expect(village.count).toBe(1)
  })

  it('takes a press in its own room as a press on it, so two never stand in one place', () => {
    const village = withOne()
    hold(village, { x: SUNNY.x + ROOM.x - 20, y: SUNNY.y }, 0.4)
    expect(village.count).toBe(1)
    hold(village, { x: SUNNY.x + ROOM.x + 20, y: SUNNY.y }, 0.1)
    expect(village.count).toBe(2)
  })

  it('makes the puffball sneeze a moment after it is poked, spores and sound in the same step, and sets the sneezy gnome off after it', () => {
    const village = withOne(SHADY)
    hold(village, { x: SHADY.x, y: SHADY.y - 30 }, 0.05)
    village.takeNotes()
    let sneezed = -1, gnome = -1
    for (let i = 0; i < 90; i++) {
      village.step(FRAME)
      const notes = village.takeNotes().length, shown = village.show()
      if (sneezed < 0 && shown.specks.some((s) => s.what === 'spore')) { sneezed = i; expect(notes).toBeGreaterThan(0) }
      if (gnome < 0 && shown.gnomes.sneezy.face === 'shut') gnome = i
    }
    expect(sneezed).toBeGreaterThan(20)
    expect(gnome).toBeGreaterThan(sneezed)
  })

  it('comes out when it is pulled up by its cap far enough and let go, and is gone from the save at once', () => {
    const village = withOne()
    village.press({ x: SUNNY.x, y: SUNNY.y - 40 })
    village.drag({ x: SUNNY.x, y: SUNNY.y - 40 - OUT - 10 })
    run(village, LOOSEN_S)
    expect(village.count).toBe(1)
    village.lift()
    expect(village.count).toBe(0)
    expect(village.takeChange()).toBe('now')
    expect(village.show().leaving.length).toBe(1)
    run(village, DIVE_S + 0.1)
    expect(village.show().leaving.length).toBe(0)
  })

  it('comes out in the hand when it is pulled very far', () => {
    const village = withOne()
    village.press({ x: SUNNY.x, y: SUNNY.y - 40 })
    village.drag({ x: SUNNY.x + 10, y: SUNNY.y - 40 - OUT - 14 })
    run(village, LOOSEN_S)
    village.drag({ x: SUNNY.x + 10, y: SUNNY.y - 40 - OUT_AT_ONCE - 5 })
    expect(village.count).toBe(0)
  })

  it('snaps back when it is let go before it came out', () => {
    const village = withOne()
    village.press({ x: SUNNY.x, y: SUNNY.y - 40 })
    village.drag({ x: SUNNY.x, y: SUNNY.y - 40 - OUT + 2 })
    expect(village.show().mushrooms[0].pull).toBeGreaterThan(20)
    village.lift()
    expect(village.count).toBe(1)
    expect(village.show().mushrooms[0].pull).toBe(0)
  })

  it('gives the same mushroom again where one was pulled up: nothing is used up', () => {
    const village = withOne()
    village.press({ x: SUNNY.x, y: SUNNY.y - 40 })
    village.drag({ x: SUNNY.x, y: SUNNY.y - 40 - OUT - 10 })
    village.lift()
    run(village, 1)
    hold(village, SUNNY, 0.5)
    expect(village.count).toBe(1)
  })
})

describe('a touch that is taken away', () => {
  it('leaves a mushroom as tall as it was held, with no poke and no last sound', () => {
    const village = bare()
    village.press(SUNNY)
    run(village, STEP_S * 2 + 0.02)
    village.takeNotes()
    village.takeAway()
    expect(village.takeNotes()).toEqual([])
    expect(sizes(village)).toEqual([3])
  })

  it('pulls nothing out: a mushroom under a pulling finger stays where it stands', () => {
    const village = bare()
    hold(village, SUNNY, 0.5)
    run(village, 1)
    village.press({ x: SUNNY.x, y: SUNNY.y - 40 })
    village.drag({ x: SUNNY.x, y: SUNNY.y - 40 - OUT - 40 })
    village.takeAway()
    expect(village.count).toBe(1)
    expect(village.show().mushrooms[0].pull).toBe(0)
  })
})

describe('the rest of the place', () => {
  it('grows no mushroom in the water: a ring spreads, and a finger that stays raises a frog that goes when it lifts', () => {
    const village = bare()
    village.press(WATER)
    expect(village.count).toBe(0)
    expect(village.show().rings.length).toBe(1)
    expect(village.takeNotes().length).toBeGreaterThan(0)
    run(village, 0.6)
    expect(village.show().frog).not.toBeNull()
    run(village, 1.2)
    expect(village.takeNotes().length).toBeGreaterThan(0)
    village.lift()
    run(village, 1.5)
    expect(village.show().frog).toBeNull()
  })

  it('answers a finger on every gnome, on the sun, on the snail, on the log and on the leaves, each with a sound', () => {
    const places = [...Object.values(SEATS).map((seat) => ({ x: seat.x, y: seat.y - 100 })), SUN, SNAIL, { x: 170, y: 790 }, { x: 600, y: 120 }, { x: 1000, y: 650 }]
    const voices = new Set<string>()
    for (const at of places) {
      const village = bare()
      village.press(at)
      const notes = village.takeNotes()
      expect(notes.length, `at ${at.x},${at.y}`).toBeGreaterThan(0)
      voices.add(JSON.stringify(notes))
      expect(village.count).toBe(0)
    }
    expect(voices.size).toBe(places.length)
  })

  it('pokes a gnome on a tap and presses his hat down, grumbling, under a finger that stays', () => {
    const village = bare(), at = { x: SEATS.baker.x, y: SEATS.baker.y - 100 }
    hold(village, at, 0.05)
    expect(village.show().specks.some((s) => s.what === 'flour')).toBe(true)
    village.takeNotes()
    village.press(at)
    run(village, 1)
    expect(village.show().gnomes.baker.press).toBeGreaterThan(0.5)
    expect(village.takeNotes().length).toBeGreaterThan(2)
    village.lift()
    run(village, 1)
    expect(village.show().gnomes.baker.press).toBeLessThan(0.05)
  })

  it('has the tall gnome rise with a mushroom that swells and sag when it stays squat', () => {
    const village = bare()
    village.press(SUNNY)
    run(village, STEP_S * 9)
    expect(village.show().gnomes.tall.rise).toBeGreaterThan(0.4)
    const squat = bare()
    hold(squat, SUNNY, 0.05)
    run(squat, 0.5)
    expect(squat.show().gnomes.tall.rise).toBeLessThan(-0.2)
  })

  it('still answers where the glade is full: a cap peeks out and slips back, and nothing is added', () => {
    const save: VillageSave = { ...freshSave(6), mushrooms: FEET.map(([x, y], i) => ({ id: i + 1, x, y, size: 2, door: false })) }
    const village = new Village(deserialize(JSON.parse(JSON.stringify(serialize(save))), 6), 1)
    expect(village.count).toBe(MOST)
    // A place of the moss that no mushroom is crowding and none stands in front of: the glade holds no more, wherever the finger lands.
    let free = { x: 0, y: 0 }
    for (let x = 1140; x >= 40 && free.x === 0; x -= 10) for (let y = 360; y <= 560; y += 10) {
      const foot = footFor(x, y)
      if (foot && foot.y === y && FEET.every(([fx, fy]) => Math.abs(fx - x) > ROOM.x + 20 || Math.abs(fy - y) > 130)) { free = { x, y }; break }
    }
    expect(free.x).toBeGreaterThan(0)
    village.press(free)
    expect(village.count).toBe(MOST)
    expect(village.takeNotes().length).toBeGreaterThan(0)
    expect(village.show().props.filter((prop) => prop.what === 'peek').length).toBe(1)
    expect(PLACES.red.some((place) => village.hasRoom(place.x, place.y))).toBe(false)
  })

  it('never has more specks in the air than its tier draws', () => {
    const village = bare()
    village.maxSpecks = 14
    hold(village, SHADY, 2)
    for (let i = 0; i < 6; i++) { hold(village, { x: SHADY.x, y: SHADY.y - 40 }, 0.05); run(village, 0.6) }
    expect(village.show().specks.length).toBeLessThanOrEqual(14)
  })
})

describe('found as left', () => {
  it('opens a saved village exactly as it stood, with nothing easing in and nothing playing', () => {
    const village = bare()
    hold(village, SUNNY, 1.2)
    hold(village, BANK, 0.4)
    hold(village, SHADY, 0.1)
    const saved = JSON.parse(JSON.stringify(serialize(village.toSave())))
    const again = new Village(deserialize(saved, 2), 99)
    expect(again.toSave()).toEqual(village.toSave())
    expect(again.busy).toBe(false)
    expect(again.takeNotes()).toEqual([])
    for (const m of again.show().mushrooms) {
      expect(m.seen).toBe(m.size)
      expect(m.squash).toBe(0)
    }
    expect(again.show().specks.length).toBe(0)
  })

  it('saves a mushroom under the finger at the size it has reached, at any instant', () => {
    const village = bare()
    village.press(SUNNY)
    for (let i = 0; i < 70; i++) {
      village.step(FRAME)
      const kept = village.toSave().mushrooms[0]
      expect(Number.isInteger(kept.size)).toBe(true)
      expect(new Village(deserialize(JSON.parse(JSON.stringify(serialize(village.toSave()))), 6), 1).toSave().mushrooms).toEqual([kept])
    }
  })

  it('never uses an id twice in one village, also after a load', () => {
    const village = bare()
    hold(village, SUNNY, 0.1)
    hold(village, BANK, 0.1)
    const again = new Village(deserialize(JSON.parse(JSON.stringify(serialize(village.toSave()))), 6), 1)
    hold(again, SHADY, 0.1)
    const ids = again.toSave().mushrooms.map((m) => m.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('plays no time on a step of nothing, so a draw outside a frame changes nothing', () => {
    const village = bare()
    village.press(SUNNY)
    village.step(0)
    expect(sizes(village)).toEqual([1])
  })
})
