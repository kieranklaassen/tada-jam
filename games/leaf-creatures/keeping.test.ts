import { describe, expect, it } from 'vitest'
import { EARTH, GROUND, HEAPS, inEllipse } from './clearing'
import { MAX_CAPS, MAX_CREATURES, MAX_LOOSE, MAX_PARTS, MAX_REACH } from './config'
import { SHAPES, type Kind } from './parts'
import { ACORNS, buried, fresh, read, write, type Saved, type SavedThing } from './save'
import { Toy } from './toy'

const DT = 1 / 60

/** A saved thing with these parts laid in a ring round its middle; two caps or more make it a creature. */
function thing(id: number, x: number, y: number, kinds: readonly Kind[], woke = 0): SavedThing {
  const caps = kinds.filter((kind) => kind === 'cap').length
  return {
    id, x, y, turn: 0, awake: caps >= 2, woke: caps >= 2 ? woke : 0, drowsy: false, bedded: false,
    parts: kinds.map((kind, i) => ({ kind, x: Math.round(Math.cos(i * 2.4) * 30), y: Math.round(Math.sin(i * 2.4) * 30), turn: (i * 47) % 360 })),
  }
}

const many = (kind: Kind, n: number): Kind[] => Array.from({ length: n }, () => kind)
const clearing = (things: SavedThing[]): Saved => ({ ...fresh(6, 7), things })
const play = (toy: Toy, seconds: number): void => { for (let f = 0; f < Math.round(seconds / DT); f++) toy.step(DT) }
const tapHeap = (toy: Toy, kind: Kind): void => { toy.press(HEAPS[kind].x, HEAPS[kind].y); toy.tap() }
/** What a put-away and a new visit do: the record goes through the slot as text and is read back defensively. */
const again = (toy: Toy, age: number | null = 6): Toy => new Toy(read(JSON.parse(JSON.stringify(write(toy.saved()))), age, 99), 99)

describe('a first visit', () => {
  it('finds a thing begun for a child of four or younger and for a child of no known age, and bare earth from five on, with no upper end', () => {
    for (const age of [null, 2, 3, 4]) {
      const saved = fresh(age, 1)
      expect(saved.things, String(age)).toHaveLength(1)
      // One cap on, and a second one wanted: a youngest child's first act makes a creature.
      expect(saved.things[0].parts.filter((part) => part.kind === 'cap'), String(age)).toHaveLength(1)
      expect(saved.things[0].awake).toBe(false)
    }
    for (const age of [5, 7, 12, 40]) expect(fresh(age, 1).things, String(age)).toHaveLength(0)
  })

  it('buries three acorns in the ground, in the same places for the same clearing', () => {
    expect(buried(5)).toEqual(buried(5))
    expect(buried(5)).not.toEqual(buried(6))
    for (const acorn of buried(5)) expect(inEllipse(acorn.x, acorn.y, GROUND)).toBe(true)
    expect(fresh(3, 5).acorns).toHaveLength(ACORNS)
  })
})

describe('the record', () => {
  it('is read back as it was written', () => {
    const saved = clearing([thing(1, 500, 400, ['willow', 'twig', 'cap', 'cap'], 1), thing(2, 700, 440, ['maple', 'seed'])])
    expect(read(JSON.parse(JSON.stringify(write(saved))), 6, 3)).toEqual(write(saved))
  })

  it('gives a fresh clearing for anything that is not a record, and never throws', () => {
    for (const raw of [null, undefined, 5, 'x', [], {}, { v: 99 }, { v: 1 }, { v: 1, things: 'no' }, { v: 1, position: 7, things: [null, 4, {}] }]) {
      const got = read(raw, 3, 11)
      expect(got.v).toBe(1)
      expect(got.position).toBe('clearing')
      expect(got.acorns).toHaveLength(ACORNS)
      expect(Array.isArray(got.things)).toBe(true)
    }
  })

  it('repairs a damaged record field by field: a bad part is dropped, a part said to lie too far out is brought in, a thing with no part left is dropped, the rest is kept', () => {
    const good = thing(1, 520, 410, ['round', 'twig'])
    const raw = { ...write(clearing([good])), things: [
      { ...good, parts: [...good.parts, { kind: 'rocket', x: 0, y: 0, turn: 0 }, { kind: 'twig', x: 'far', y: 0, turn: 0 }, { kind: 'twig', x: 9000, y: 0, turn: 0 }] },
      { id: 2, x: 600, y: 400, parts: [{ kind: 'nothing' }] },
      { id: 1, x: 640, y: 400, parts: [{ kind: 'seed', x: 0, y: 0, turn: 0 }] },
      { id: 3, x: -4000, y: 9000, turn: 'round', parts: [{ kind: 'seed', x: 0, y: 0, turn: 725 }] },
    ] }
    const got = read(raw, 6, 1)
    expect(got.things.map((kept) => kept.id)).toEqual([1, 3])
    // The twig said to lie 9000 away is kept, as far out as a thing may reach.
    expect(got.things[0]).toEqual({ ...good, parts: [...good.parts, { kind: 'twig', x: MAX_REACH - SHAPES.twig.half - SHAPES.twig.r, y: 0, turn: 0 }] })
    // A thing said to lie far off the earth is found at the nearest point of it, and a turn is kept inside one whole turn.
    expect(got.things[1].turn).toBe(0)
    expect(inEllipse(got.things[1].x, got.things[1].y, EARTH, 1)).toBe(true)
    expect(got.things[1].x).toBeLessThan(EARTH.x)
    expect(got.things[1].y).toBeGreaterThan(EARTH.y)
    expect(got.things[1].parts[0].turn).toBe(5)
  })

  it('lets the caps decide who is awake, and holds a record to the limits of the clearing', () => {
    const lying = { ...thing(1, 500, 400, ['twig', 'cap']), awake: true, woke: 3 }
    const asleep = { ...thing(2, 600, 400, ['twig', 'cap', 'cap'], 0), awake: false }
    const got = read(write(clearing([lying, asleep])), 6, 1)
    expect(got.things[0]).toMatchObject({ awake: false, woke: 0 })
    expect(got.things[1]).toMatchObject({ awake: true, woke: 1 })
    // Too many creatures: the ones woken last stay. Too many parts on one: the first fourteen and four caps stay.
    const crowd = Array.from({ length: 8 }, (_, i) => thing(i + 1, 400 + i * 40, 420, ['cap', 'cap', 'twig'], i + 1))
    expect(read(write(clearing(crowd)), 6, 1).things.map((kept) => kept.id)).toEqual([4, 5, 6, 7, 8])
    const heavy = read(write(clearing([thing(1, 500, 400, [...many('twig', 20), ...many('cap', 7)], 1)])), 6, 1).things[0]
    expect(heavy.parts.filter((part) => part.kind !== 'cap')).toHaveLength(MAX_PARTS)
    expect(heavy.parts.filter((part) => part.kind === 'cap')).toHaveLength(MAX_CAPS)
    // Too many loose parts: the things begun first go.
    const litter = Array.from({ length: 6 }, (_, i) => thing(i + 1, 420 + i * 60, 420, many('seed', 6)))
    expect(read(write(clearing(litter)), 6, 1).things.map((kept) => kept.id)).toEqual([3, 4, 5, 6])
  })

  it('stays small: the fullest clearing there can be is under a fifth of what a slot holds', () => {
    const full = [
      ...Array.from({ length: MAX_CREATURES }, (_, i) => thing(i + 1, 400 + i * 80, 420, [...many('feather', MAX_PARTS), ...many('cap', MAX_CAPS)], i + 1)),
      ...Array.from({ length: 4 }, (_, i) => thing(10 + i, 440 + i * 70, 470, many('willow', MAX_LOOSE / 4))),
    ]
    // And one more creature, as full as the others, waits behind the trees.
    const waiting = { side: 1 as const, thing: thing(20, 1100, 284, [...many('feather', MAX_PARTS), ...many('cap', MAX_CAPS)], 6) }
    const kept = read(write({ ...clearing(full), waiting }), 6, 1)
    expect(kept.things).toHaveLength(full.length)
    expect(kept.waiting?.thing.parts).toHaveLength(MAX_PARTS + MAX_CAPS)
    // Under 12 KB, as the sheet says, where a slot holds 64.
    expect(JSON.stringify(write(kept)).length).toBeLessThan(12 * 1024)
  })
})

describe('found as left', () => {
  it('finds everything where it was, and a creature awake where it stood, with nothing waking a second time', () => {
    const toy = new Toy(fresh(3, 1), 1)
    tapHeap(toy, 'cap')
    play(toy, 4)
    tapHeap(toy, 'round')
    play(toy, 1)
    const next = again(toy)
    expect(write(next.saved())).toEqual(write(toy.saved()))
    expect(next.creatures).toHaveLength(1)
    expect(next.creatures[0].inScene).toBe(false)
    expect(next.creatures[0].eyes).toBe(2)
    expect(next.scene).toBeNull()
    expect(next.asked).toEqual([])
    expect(next.changed).toBe(0)
    // No eye opens and no gust blows on the way in: the scene of the waking is not played again.
    for (let f = 0; f < 120; f++) {
      next.step(DT)
      for (const sound of next.asked.splice(0)) expect(['blink', 'gust', 'press-cap']).not.toContain(sound.key)
    }
    expect(next.air.gust).toBe(-1)
  })

  it('keeps a part that is in the air where it will land, so a put-away in the middle of a flight loses nothing', () => {
    const toy = new Toy(fresh(6, 1), 1)
    tapHeap(toy, 'feather')
    const inFlight = JSON.stringify(write(toy.saved()))
    expect(toy.things[0].parts[0].fall).toBeGreaterThan(0)
    play(toy, 2)
    expect(JSON.stringify(write(toy.saved()))).toBe(inFlight)
  })

  it('finds a thing put away in the instant of its waking awake, and plays no waking for it', () => {
    const toy = new Toy(fresh(3, 1), 1)
    tapHeap(toy, 'cap')
    // The second cap is still in the air.
    const next = again(toy, 3)
    expect(next.creatures).toHaveLength(1)
    expect(next.creatures[0].inScene).toBe(false)
    expect(next.scene).toBeNull()
    play(toy, 3)
    expect(write(toy.saved()).things.map((kept) => [kept.awake, kept.woke])).toEqual(write(next.saved()).things.map((kept) => [kept.awake, kept.woke]))
  })

  it('keeps nothing of a part that is only in the hand, fresh from its heap', () => {
    const toy = new Toy(fresh(6, 1), 1)
    toy.press(HEAPS.maple.x, HEAPS.maple.y)
    toy.move(EARTH.x, EARTH.y)
    play(toy, 1)
    expect(toy.saved().things).toHaveLength(0)
    expect(toy.changed).toBe(0)
  })
})

describe('the limits', () => {
  it('has a creature shake off a fifteenth part, which flutters back to its heap', () => {
    const toy = new Toy(clearing([thing(1, EARTH.x, EARTH.y, [...many('twig', MAX_PARTS), 'cap', 'cap'], 1)]), 1)
    toy.press(HEAPS.maple.x, HEAPS.maple.y)
    toy.move(toy.things[0].x, toy.things[0].y + 60)
    play(toy, 1.5)
    toy.asked.length = 0
    toy.drop()
    expect(toy.asked.map((sound) => sound.key)).toEqual(['back'])
    expect(toy.things[0].parts).toHaveLength(MAX_PARTS + 2)
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['maple'])
    expect(toy.creatures[0].body.squash).toBeLessThan(0)
  })

  it('has the small wind child puff the part laid longest ago back to its heap when a twenty-fifth lies loose', () => {
    const toy = new Toy(clearing([thing(1, 470, 400, ['seed', ...many('willow', 11)]), thing(2, 700, 430, many('round', 12))]), 1)
    tapHeap(toy, 'twig')
    expect(toy.things.reduce((sum, t) => sum + t.parts.length, 0)).toBe(MAX_LOOSE)
    expect(toy.things[0].parts.some((part) => part.kind === 'seed')).toBe(false)
    expect(toy.air.strays.map((stray) => stray.kind)).toEqual(['seed'])
    expect(toy.asked.map((sound) => sound.key)).toContain('puff')
    expect(toy.cast.small.blowLeft).toBeGreaterThan(0)
  })

  it('has the creature woken longest ago walk off when a sixth wakes, and keeps it out of the record from that step', () => {
    const five = Array.from({ length: MAX_CREATURES }, (_, i) => thing(i + 1, 380 + i * 100, 400 + (i % 2) * 60, ['cap', 'cap', 'twig'], i + 1))
    const toy = new Toy(clearing([...five, thing(9, EARTH.x, EARTH.y + 90, ['willow', 'cap'])]), 1)
    expect(toy.creatures).toHaveLength(MAX_CREATURES)
    tapHeap(toy, 'cap')
    let frames = 0
    while (toy.creatures.length === MAX_CREATURES && frames++ < 120) toy.step(DT)
    expect(toy.creatures).toHaveLength(MAX_CREATURES + 1)
    expect(toy.creatures.filter((creature) => creature.leaving).map((creature) => creature.thing.id)).toEqual([1])
    expect(toy.saved().things.map((kept) => kept.id)).not.toContain(1)
    expect(toy.saved().things.filter((kept) => kept.awake)).toHaveLength(MAX_CREATURES)
    play(toy, 30)
    expect(toy.creatures).toHaveLength(MAX_CREATURES)
  })
})

describe('at rest', () => {
  it('is alive with no finger on it: the wind children fill and leak, a leaf comes down, the toad nods off', () => {
    const toy = new Toy(fresh(6, 1), 1)
    const puffs = new Set<number>()
    let leaves = 0, leaks = 0
    for (let f = 0; f < 60 * 12; f++) {
      toy.step(DT)
      puffs.add(Math.round(toy.cast.big.puff * 100))
      leaves = Math.max(leaves, toy.air.leaves.length)
      leaks += toy.cast.events.filter((event) => event.what === 'leak').length
    }
    expect(puffs.size).toBeGreaterThan(20)
    expect(leaks).toBeGreaterThanOrEqual(3)
    expect(leaves).toBeGreaterThanOrEqual(1)
    expect(toy.cast.toad.lids).toBeGreaterThan(0.8)
    // Nothing that only lives at rest is a change to keep, and none of it is heard.
    expect(toy.changed).toBe(0)
    expect(toy.asked).toEqual([])
  })

  it('has a creature wander by itself, on the ground and nowhere else', () => {
    const toy = new Toy(clearing([thing(1, EARTH.x, EARTH.y, ['maple', 'maple', 'cap', 'cap'], 1)]), 1)
    const from = { x: toy.things[0].x, y: toy.things[0].y }
    let furthest = 0
    for (let f = 0; f < 60 * 20; f++) {
      toy.step(DT)
      furthest = Math.max(furthest, Math.hypot(toy.things[0].x - from.x, toy.things[0].y - from.y))
      expect(inEllipse(toy.things[0].x, toy.things[0].y, GROUND)).toBe(true)
    }
    expect(furthest).toBeGreaterThan(80)
  })
})
