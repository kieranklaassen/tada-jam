import { describe, expect, it } from 'vitest'
import { CUP_HOLDS, type CupSize } from './forms'
import { placeSpot, spoonSpot, TRAY, type Spot } from './layout'
import { LIKES } from './party'
import { BEAR_FROM, HEN_RANGE, MOUSE_RANGE, PUDDLE_MINDS, TWINS_APART, TWINS_LEAST, cupOf, drink, judgeLift, placeLaid, twinOf, type Lift } from './tastes'
import { emptyWorld, spill, thingById, type GuestId, type Thing, type World } from './world'

const thing = (id: string, kind: Thing['kind'], over: Partial<Thing> = {}): Thing => ({ id, kind, size: 'house', ring: null, owner: null, x: 0, z: 0, on: null, heldBy: null, worn: false, tea: 0, ...over })

const LEFT = placeSpot(2, 0), RIGHT = placeSpot(2, 1)

/** A laid place: a saucer, a cup with this much tea on it, and a spoon lying to its right. */
function lay(world: World, name: string, place: Spot, tea: number, size: CupSize = 'house'): World {
  world.things.push(
    thing(`saucer-${name}`, 'saucer', { ...place, size }),
    thing(`cup-${name}`, 'cup', { ...place, size, on: `saucer-${name}`, tea }),
    thing(`spoon-${name}`, 'spoon', { x: place.x + 1.12, z: place.z + 0.12 }),
  )
  return world
}

const table = (tea: number, size: CupSize = 'house') => lay(emptyWorld(), 'left', LEFT, tea, size)
const twins = (a: number, b: number) => lay(lay(emptyWorld(), 'left', LEFT, a), 'right', RIGHT, b)

/** The lift of a guest who does lift; a guest who waits fails the test. */
function lift(world: World, guest: GuestId, place: Spot = LEFT, twinPlace?: Spot): Lift {
  const found = judgeLift(world, guest, place, twinPlace)
  if ('waits' in found) throw new Error(`${guest} waits: ${found.waits}`)
  return found
}

describe('each guest and its own amount', () => {
  it('finds the amount it likes to its taste and drinks it', () => {
    for (const guest of ['bear', 'mouse', 'hen'] as const) expect(lift(table(LIKES[guest]), guest)).toMatchObject({ taste: 'right', drinks: true })
  })

  it('the Bear wants a full cup and never finds one too full', () => {
    expect(lift(table(BEAR_FROM - 0.01), 'bear')).toMatchObject({ taste: 'short', drinks: false })
    expect(lift(table(BEAR_FROM), 'bear').taste).toBe('right')
    for (let tea = 0.01; tea <= 1; tea += 0.01) expect(lift(table(tea), 'bear').taste).not.toBe('over')
    const flooded = table(1)
    thingById(flooded, 'saucer-left')!.tea = 0.2
    spill(flooded, LEFT, 0.5)
    expect(lift(flooded, 'bear')).toEqual({ taste: 'right', drinks: true, details: ['brimful', 'saucer-wet'] })
  })

  it('the Mouse wants a drop: short below it, over above it', () => {
    expect(lift(table(MOUSE_RANGE[0] - 0.01), 'mouse').taste).toBe('short')
    expect(lift(table(MOUSE_RANGE[0]), 'mouse').taste).toBe('right')
    expect(lift(table(MOUSE_RANGE[1]), 'mouse').taste).toBe('right')
    expect(lift(table(MOUSE_RANGE[1] + 0.01), 'mouse')).toMatchObject({ taste: 'over', drinks: false })
  })

  it('the Hen wants half a cup: short below it, over above it', () => {
    expect(lift(table(HEN_RANGE[0] - 0.01), 'hen').taste).toBe('short')
    expect(lift(table(HEN_RANGE[0]), 'hen').taste).toBe('right')
    expect(lift(table(HEN_RANGE[1]), 'hen').taste).toBe('right')
    expect(lift(table(HEN_RANGE[1] + 0.01), 'hen')).toMatchObject({ taste: 'over', drinks: false })
  })

  it('does not depend on whose cup it is or on the ring painted in it', () => {
    for (const guest of ['bear', 'mouse', 'hen'] as const) for (const tea of [0.03, 0.15, 0.5, 0.94]) {
      const { taste, drinks } = lift(table(tea), guest)
      for (const owner of ['bear', 'mouse', 'duckling-a'] as const) for (const ring of [0.15, 0.5, 0.94]) {
        const world = table(tea)
        Object.assign(thingById(world, 'cup-left')!, { owner, ring })
        expect(lift(world, guest)).toMatchObject({ taste, drinks })
        // A ringed cup is of the house size and is anyone's: only a plain cup can be the wrong size.
        expect(lift(world, guest).details).not.toContain('cup-wrong-size')
      }
    }
  })
})

describe('a cup too small or too big for its guest', () => {
  it('the Bear drains a full thimble and is still short', () => {
    expect(lift(table(CUP_HOLDS.thimble, 'thimble'), 'bear')).toEqual({ taste: 'short', drinks: true, details: ['cup-too-small', 'cup-wrong-size', 'brimful'] })
    expect(lift(table(0.07, 'thimble'), 'bear')).toEqual({ taste: 'short', drinks: false, details: ['cup-wrong-size'] })
    // A plain house cup is his size.
    expect(lift(table(0.94), 'bear')).toEqual({ taste: 'right', drinks: true, details: [] })
  })

  it('the Mouse leaves a full house cup, and drinks a drop from one', () => {
    expect(lift(table(1), 'mouse')).toEqual({ taste: 'over', drinks: false, details: ['cup-wrong-size', 'brimful'] })
    // A drop in the big plain cup is drunk, and is still tea in a cup of the wrong size.
    expect(lift(table(0.15), 'mouse')).toEqual({ taste: 'right', drinks: true, details: ['cup-wrong-size'] })
    expect(lift(table(CUP_HOLDS.thimble, 'thimble'), 'mouse')).toMatchObject({ taste: 'right', drinks: true })
  })
})

describe('a guest who waits', () => {
  it('waits for a cup, and for tea in it', () => {
    expect(judgeLift(emptyWorld(), 'bear', LEFT)).toEqual({ waits: 'no-cup' })
    expect(judgeLift(table(0), 'bear', LEFT)).toEqual({ waits: 'cup-empty' })
  })

  it('waits for a saucer, cup in paw or cup on the bare cloth', () => {
    const held = emptyWorld()
    held.things.push(thing('cup', 'cup', { ...LEFT, heldBy: 'bear', tea: 1 }))
    expect(judgeLift(held, 'bear', LEFT)).toEqual({ waits: 'no-saucer' })
    const bare = emptyWorld()
    bare.things.push(thing('cup', 'cup', { ...LEFT, tea: 1 }))
    expect(judgeLift(bare, 'bear', LEFT)).toEqual({ waits: 'no-saucer' })
    bare.things[0].tea = 0
    expect(judgeLift(bare, 'bear', LEFT)).toEqual({ waits: 'cup-empty' })
  })

  it('waits for a spoon, wherever at its place it is laid: the Hen, and everyone else', () => {
    const world = table(0.5)
    // Her own cup, with her ring.
    Object.assign(thingById(world, 'cup-left')!, { owner: 'hen', ring: 0.5 })
    const spoon = thingById(world, 'spoon-left')!
    expect(placeLaid(world, 'hen', LEFT)).toEqual({ saucer: true, spoon: true })
    Object.assign(spoon, TRAY.spoons)
    expect(placeLaid(world, 'hen', LEFT)).toEqual({ saucer: true, spoon: false })
    expect(judgeLift(world, 'hen', LEFT)).toEqual({ waits: 'no-spoon' })
    expect(judgeLift(world, 'bear', LEFT)).toEqual({ waits: 'no-spoon' })
    spoon.on = 'saucer-left'
    expect(lift(world, 'hen').details).toEqual([])
    spoon.on = 'cup-left'
    expect(lift(world, 'hen')).toEqual({ taste: 'right', drinks: true, details: ['spoon-in-cup'] })
    Object.assign(spoon, spoonSpot(2, 0), { on: null })
    expect(placeLaid(world, 'hen', LEFT).spoon).toBe(true)
  })

  it('the Mouse waits for a dry cloth by her place, and nobody else does', () => {
    const world = table(0.15)
    spill(world, { x: LEFT.x + 4, z: LEFT.z }, 0.6)
    spill(world, LEFT, PUDDLE_MINDS - 0.01)
    expect(lift(world, 'mouse').taste).toBe('right')
    spill(world, LEFT, 0.2)
    expect(judgeLift(world, 'mouse', LEFT)).toEqual({ waits: 'puddle-near' })
    expect(lift(world, 'bear').taste).toBe('short')
    world.puddles.fill(0)
    expect(lift(world, 'mouse').taste).toBe('right')
  })
})

describe('the Ducklings', () => {
  it('are each the other\'s twin, and nobody else has one', () => {
    expect(twinOf('duckling-a')).toBe('duckling-b')
    expect(twinOf('duckling-b')).toBe('duckling-a')
    for (const guest of ['bear', 'mouse', 'hen'] as const) expect(twinOf(guest)).toBeNull()
  })

  it('drink when the two cups are the same, at any height', () => {
    // At any height: one drop in each is the same in each.
    for (const [a, b] of [[0.3, 0.3], [0.9, 0.9 + TWINS_APART], [0.3, 0.3 + TWINS_APART], [TWINS_LEAST, TWINS_LEAST + TWINS_APART], [0.012, 0.012]]) {
      expect(lift(twins(a, b), 'duckling-a', LEFT, RIGHT)).toEqual({ taste: 'right', drinks: true, details: [] })
      expect(lift(twins(a, b), 'duckling-b', RIGHT, LEFT).taste).toBe('right')
    }
  })

  it('do not drink when one has more: the one with less is short and the one with more is over', () => {
    for (const [a, b] of [[0.3, 0.6], [0.6, 0.3]]) {
      const world = twins(a, b)
      const less: [GuestId, Spot, Spot] = a < b ? ['duckling-a', LEFT, RIGHT] : ['duckling-b', RIGHT, LEFT]
      const more: [GuestId, Spot, Spot] = a < b ? ['duckling-b', RIGHT, LEFT] : ['duckling-a', LEFT, RIGHT]
      expect(lift(world, ...less)).toEqual({ taste: 'short', drinks: false, details: ['twin-has-more'] })
      expect(lift(world, ...more)).toEqual({ taste: 'over', drinks: false, details: ['twin-has-less'] })
    }
  })

  it('wait while the twin\'s cup is not poured, or there is no twin\'s cup', () => {
    // Less than a drop is no tea yet.
    const world = twins(0.5, 0.002)
    expect(judgeLift(world, 'duckling-a', LEFT, RIGHT)).toEqual({ waits: 'twin-not-poured' })
    expect(lift(world, 'duckling-b', RIGHT, LEFT)).toEqual({ taste: 'short', drinks: false, details: [] })
    expect(judgeLift(twins(0.5, 0), 'duckling-b', RIGHT, LEFT)).toEqual({ waits: 'cup-empty' })
    expect(judgeLift(twins(0.5, 0.5), 'duckling-a', LEFT)).toEqual({ waits: 'twin-not-poured' })
    expect(judgeLift(table(0.5), 'duckling-a', LEFT, RIGHT)).toEqual({ waits: 'twin-not-poured' })
    expect(judgeLift(table(0.5), 'duckling-a', LEFT, LEFT)).toEqual({ waits: 'twin-not-poured' })
  })
})

describe('whose cup it is at the moment', () => {
  it('is the cup in the paw, then the cup on a saucer at the place, then the nearest cup, or none', () => {
    const world = table(0.4)
    world.things.push(thing('loose', 'cup', { x: LEFT.x + 0.2, z: LEFT.z }), thing('looser', 'cup', { x: LEFT.x - 0.6, z: LEFT.z }))
    expect(cupOf(world, 'bear', LEFT)?.id).toBe('cup-left')
    // A cup on a saucer at the place comes before a loose cup that stands nearer.
    for (const id of ['saucer-left', 'cup-left']) thingById(world, id)!.x = LEFT.x + 0.5
    expect(cupOf(world, 'bear', LEFT)?.id).toBe('cup-left')
    thingById(world, 'cup-left')!.on = null
    expect(cupOf(world, 'bear', LEFT)?.id).toBe('loose')
    expect(placeLaid(world, 'bear', LEFT).saucer).toBe(false)
    world.things.push(thing('held', 'cup', { ...RIGHT, heldBy: 'bear' }), thing('hers', 'cup', { ...LEFT, heldBy: 'mouse' }))
    expect(cupOf(world, 'bear', LEFT)?.id).toBe('held')
    expect(cupOf(world, 'hen', LEFT)?.id).toBe('loose')
    expect(cupOf(world, 'hen', { x: LEFT.x, z: LEFT.z + 2 })).toBeUndefined()
    expect(cupOf(world, 'hen', RIGHT)).toBeUndefined()
  })
})

describe('the tea after a lift', () => {
  it('finds too much for a Duckling only in the cup that was poured into last: the cup filled first is never the miss', () => {
    const world = twins(0.5, 0.2)
    // The left cup was filled first and the right one is being filled: the two have too little between them.
    expect(judgeLift(world, 'duckling-a', LEFT, RIGHT, 'cup-right')).toEqual({ taste: 'short', drinks: false, details: ['twin-has-less'] })
    expect(judgeLift(world, 'duckling-b', RIGHT, LEFT, 'cup-right')).toEqual({ taste: 'short', drinks: false, details: ['twin-has-more'] })
    // Opened again, with no pour remembered: the same.
    expect(judgeLift(world, 'duckling-a', LEFT, RIGHT, null)).toMatchObject({ taste: 'short' })
    // The left cup was the one poured into last, past its twin's: that is too much.
    expect(judgeLift(world, 'duckling-a', LEFT, RIGHT, 'cup-left')).toEqual({ taste: 'over', drinks: false, details: ['twin-has-less'] })
    // A brimful cup that was filled first is not drained as too small: it waits for its twin's.
    const brim = twins(CUP_HOLDS.house, 0.2)
    expect(judgeLift(brim, 'duckling-a', LEFT, RIGHT, 'cup-right')).toMatchObject({ taste: 'short', drinks: false })
  })

  it('stays exactly as it was, and only a drink empties the cup', () => {
    for (const [guest, tea] of [['bear', 0.4], ['mouse', 0.8], ['hen', 0.2], ['hen', 0.9], ['bear', 1]] as const) {
      const world = table(tea)
      const before = structuredClone(world)
      judgeLift(world, guest, LEFT)
      expect(world).toEqual(before)
    }
    const world = twins(0.3, 0.7)
    const before = structuredClone(world)
    judgeLift(world, 'duckling-a', LEFT, RIGHT)
    judgeLift(world, 'duckling-b', RIGHT, LEFT)
    expect(world).toEqual(before)
    expect(drink(world, 'cup-right')).toBe(0.7)
    expect(thingById(world, 'cup-right')!.tea).toBe(0)
    expect(thingById(world, 'cup-left')!.tea).toBe(0.3)
    expect(drink(world, 'saucer-left')).toBe(0)
    expect(drink(world, 'nothing')).toBe(0)
  })
})
