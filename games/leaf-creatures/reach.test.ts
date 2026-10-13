import { describe, expect, it } from 'vitest'
import { CORNER, GROUND, HEAPS, HOME } from './clearing'
import { MAX_REACH } from './config'
import { SHAPES, type Kind } from './parts'
import { clearOfBoth, pressOn } from './placing'
import { CORNER_FROM, keepIn, liftFor, needOf, roomAt } from './reach'
import type { SavedThing } from './save'
import { STAGE } from './stage'
import { DT, clearing, drawnPoints, play, thing, toyOf } from './testing'
import { radius } from './things'
import type { Toy } from './toy'

// Nothing of a creature passes under the home control or into the top
// right corner: not a limb, not a leap, not a hop drawn larger. Each
// creature is kept in by its own reach. Held here with the longest creature
// the game lets a child make, in each way of going, and with a hopper of
// three wings, standing, called to the top of the ground, bowled over,
// leapt over, walking off and coming back.

/** The longest thing of one kind the game allows: parts out to the full reach on both sides, and two eyes in the middle. */
function longest(id: number, x: number, y: number, kind: Kind, woke = id): SavedThing {
  const out = MAX_REACH - SHAPES[kind].half - SHAPES[kind].r
  const places = [-out, -out * 0.5, out * 0.5, out]
  return {
    id, x, y, turn: 0, awake: true, woke, drowsy: false, bedded: false,
    parts: [...places.map((px) => ({ kind, x: px, y: 0, turn: 0 })), { kind: 'cap' as const, x: -34, y: 0, turn: 0 }, { kind: 'cap' as const, x: 34, y: 0, turn: 0 }],
  }
}

/** How near any drawn part of any creature comes to the home control or the corner: under 0 when part of it is under one of them. */
function clearance(toy: Toy): number {
  let least = Infinity
  for (const creature of [...toy.creatures, ...(toy.ghost ? [toy.ghost] : [])]) {
    for (const point of drawnPoints(creature)) least = Math.min(least, roomAt(point.x, point.y) - point.r)
  }
  return least
}

/** Plays `seconds`, calling the creatures to each of `calls` in turn, and gives the least clearance of any frame. */
function watch(toy: Toy, seconds: number, calls: readonly (readonly [number, number])[] = []): number {
  let least = Infinity
  const frames = Math.round(seconds / DT)
  for (let f = 0; f < frames; f++) {
    if (calls.length > 0) { const [x, y] = calls[Math.floor((f / frames) * calls.length)]; toy.finger = { x, y }; for (const creature of toy.creatures) if (!creature.leaving && !creature.thing.bedded && !creature.inScene && !creature.entering) creature.target = { x, y } }
    toy.step(DT)
    least = Math.min(least, clearance(toy))
  }
  return least
}

const TOP: readonly (readonly [number, number])[] = [[HOME.x, GROUND.y - GROUND.ry + 20], [860, 300], [HOME.x - 40, 262], [930, 330], [HOME.x + 60, 250]]

describe('the room a creature needs', () => {
  it('measures the corner as the narrowest surface shows it, and the home control by its rim', () => {
    // 72 pixels of a surface 1024 wide are 83 stage units.
    expect(STAGE.width - CORNER_FROM.x).toBeGreaterThanOrEqual(Math.ceil((CORNER * STAGE.width) / 1024))
    expect(roomAt(HOME.x, HOME.y + HOME.r + 10)).toBeCloseTo(10)
    expect(roomAt(CORNER_FROM.x - 10, 20)).toBeCloseTo(10)
    expect(roomAt(STAGE.width - 5, CORNER + 7)).toBeCloseTo(7)
  })

  it('keeps the longest creature the game allows where it can turn right round clear of both, and there is such a place on the ground', () => {
    for (const span of [60, 150, 240, MAX_REACH]) {
      for (const [x, y] of [[HOME.x, 250], [900, 280], [300, 300], [590, 424], [960, 424]] as const) {
        const at = keepIn(x, y, span)
        expect(roomAt(at.x, at.y), `${span} at ${x},${y}`).toBeGreaterThanOrEqual(needOf(span) - 1)
        expect(Math.hypot((at.x - GROUND.x) / GROUND.rx, (at.y - GROUND.y) / GROUND.ry)).toBeLessThanOrEqual(1.001)
      }
    }
  })

  it('draws a hop only as high, and as much nearer, as leaves the creature clear', () => {
    // Plenty of room: the hop is drawn in full. Under the control: it is drawn lower, and not at all where there is no room.
    expect(liftFor(590, 560, 80, 60)).toBe(60)
    const low = liftFor(590, 300, 150, 150)
    expect(low).toBeLessThan(150)
    expect(roomAt(590, 300 - low)).toBeGreaterThanOrEqual(150 * (1 + low / 260) * 1.15 + 30 - 1)
  })
})

describe('nothing of a creature passes under the home control or into the corner', () => {
  for (const kind of ['twig', 'maple', 'willow', 'round', 'feather', 'seed'] as const) {
    it(`the longest ${kind} creature, called to the top of the ground and along its top right`, () => {
      const toy = toyOf(clearing([longest(1, 590, 440, kind)]))
      expect(radius(toy.things[0])).toBeGreaterThan(MAX_REACH - 2)
      expect(watch(toy, 30, TOP)).toBeGreaterThanOrEqual(0)
    })
  }

  it('a hopper with three wings: hopping at the top, and leaping over a crawler that lies there', () => {
    const hopper = thing(1, 590, 300, ['maple', 'maple', 'maple', 'cap', 'cap'], 1), crawler = thing(2, 640, 280, ['willow', 'willow', 'cap', 'cap'], 2)
    const toy = toyOf(clearing([hopper, crawler]))
    let leaps = 0, highest = 0, least = Infinity
    for (let f = 0; f < 60 * 60; f++) {
      const top = TOP[Math.floor(f / 240) % TOP.length]
      // The crawler stays at the top; the hopper is called there, and teases it.
      toy.creatures[1].target = { x: top[0], y: top[1] }
      if (f % 240 < 120) toy.creatures[0].target = { x: top[0], y: top[1] }
      const leaping = toy.creatures[0].leap !== null
      toy.step(DT)
      if (!leaping && toy.creatures[0].leap) leaps++
      highest = Math.max(highest, toy.creatures[0].body.lift)
      least = Math.min(least, clearance(toy))
    }
    // It did hop and leap up there: the model's lift is high, and what is drawn of it stays clear.
    expect(leaps).toBeGreaterThan(0)
    expect(highest).toBeGreaterThan(40)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('a creature bowled over at the top, and the one that bowls it', () => {
    const roller = thing(1, 420, 300, ['round', 'round', 'round', 'cap', 'cap'], 1), other = longest(2, 590, 440, 'feather', 2)
    const toy = toyOf(clearing([roller, other]))
    let tumbles = 0, least = Infinity
    for (let f = 0; f < 60 * 60; f++) {
      const was = toy.creatures[1].tumble !== null
      toy.step(DT)
      if (!was && toy.creatures[1].tumble) tumbles++
      least = Math.min(least, clearance(toy))
    }
    expect(tumbles).toBeGreaterThan(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('a creature that grows while it stands at the top: a part pressed on that would lie under the control is shaken off, and one that makes it too long to stand there slides it clear without turning', () => {
    const toy = toyOf(clearing([thing(1, 590, 280, ['twig', 'cap', 'cap'], 1)]))
    const creature = toy.creatures[0]
    creature.rest = 999
    play(toy, 0.5)
    const { x, y } = creature.thing
    const before = creature.thing.parts.length
    // A willow leaf pressed on straight up from its leg: taken, and still clear.
    expect(pressOn(toy.things, 'willow', 0, { kind: 'willow', x, y: y - 60, turn: Math.PI / 2 }, () => 9).how).toBe('on')
    // A second one on the end of that, which would lie under the control: the creature shakes it off.
    const under = { kind: 'willow' as const, x, y: y - 170, turn: Math.PI / 2 }
    expect(clearOfBoth(under)).toBe(false)
    expect(pressOn(toy.things, 'willow', 0, under, () => 9)).toEqual({ how: 'shaken', thing: creature.thing })
    expect(creature.thing.parts).toHaveLength(before + 1)
    // One more out to the side: it is longer now than it can be and stand there, so it slides clear, and does not turn as it slides.
    expect(pressOn(toy.things, 'willow', 0, { kind: 'willow', x: x + 120, y, turn: 0 }, () => 9).how).toBe('on')
    expect(needOf(radius(creature.thing))).toBeGreaterThan(roomAt(x, y))
    const turn = creature.thing.turn
    let least = Infinity, slid = 0
    for (let f = 0; f < 240; f++) { toy.step(DT); if (creature.sliding) { slid++; expect(creature.thing.turn).toBe(turn) } least = Math.min(least, clearance(toy)) }
    expect(slid).toBeGreaterThan(0)
    expect(least).toBeGreaterThanOrEqual(0)
    expect(roomAt(creature.thing.x, creature.thing.y)).toBeGreaterThanOrEqual(needOf(radius(creature.thing)) - 1)
  })

  it('a thing that wakes at the top of the earth with its parts as far up as the earth lets them lie', () => {
    const lying = { id: 1, x: 590, y: 300, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false, parts: [{ kind: 'twig' as const, x: 0, y: -30, turn: 90 }, { kind: 'willow' as const, x: 60, y: 10, turn: 0 }, { kind: 'cap' as const, x: 0, y: 30, turn: 0 }] }
    const toy = toyOf(clearing([lying]))
    toy.focus = toy.things[0]
    toy.press(HEAPS.cap.x, HEAPS.cap.y); toy.tap()
    let least = Infinity
    for (let f = 0; f < 60 * 12; f++) { toy.step(DT); least = Math.min(least, clearance(toy)) }
    expect(toy.creatures).toHaveLength(1)
    expect(least).toBeGreaterThanOrEqual(0)
  })
})
