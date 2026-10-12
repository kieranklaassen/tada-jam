import { describe, expect, it } from 'vitest'
import { FOUND, HOLLOW, type Kind } from './kinds'
import { bedOf, floodOf, HEAP_ROOM, heapPlace, PAIR_ROOM, planEvening, type Plan } from './evening'
import { build, laidOf, topOf, type Laid } from './rest'

// The evening as a plan: what the three do with the house as it stands, in
// order, and what is saved when the sun is let go. No drawing and no time.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const leaf = (n = 0): number => idOf('leaf', n), cap = (n = 0): number => idOf('cap', n), twig = (n = 0): number => idOf('twig', n)
const plan = (laid: Laid[], snapped: number[] = [], soaked: number[] = []): Plan => planEvening(laidOf(build(laid, new Set(snapped))), snapped, soaked)
const acts = (p: Plan): string[] => p.parts.map((part) => `${part.who} ${part.act}`)

describe('the order of the evening', () => {
  it('is the fat one, then the tiny one, then the tidy one', () => {
    const p = plan([{ id: leaf(), x: 640 }, { id: cap(), x: 760 }, { id: idOf('feather'), x: 420 }])
    expect(acts(p)).toEqual(['fat rug', 'tiny bath', 'tidy broom'])
  })

  it('with none of its things each does its own thing, and the three sleep in a heap on the floor', () => {
    const p = plan([{ id: idOf('pebble'), x: 700 }])
    expect(acts(p)).toEqual(['fat noLeaf', 'tiny noCap', 'tidy noFeather'])
    expect(p.asleep.map((entry) => entry.on)).toEqual([null, null, null])
    expect(new Set(p.asleep.map((entry) => entry.x)).size).toBe(1)
  })

  it('gives the same evening from the same house, every time', () => {
    const laid = [{ id: twig(0), x: 600 }, { id: twig(1), x: 700 }, { id: leaf(), x: 650 }, { id: idOf('moss'), x: 420 }, { id: leaf(1), x: 420 }, { id: cap(), x: 780 }]
    expect(JSON.stringify(plan(laid))).toBe(JSON.stringify(plan(laid)))
  })
})

describe('the fat one tries every leaf, from the left', () => {
  it('lies on each in turn and sleeps in the first bed, going no further', () => {
    const p = plan([{ id: leaf(0), x: 420 }, { id: idOf('moss'), x: 600 }, { id: leaf(1), x: 600 }, { id: leaf(2), x: 770 }])
    expect(acts(p).filter((name) => name.startsWith('fat'))).toEqual(['fat rug', 'fat bed'])
    expect(p.asleep[0]).toEqual({ who: 'fat', on: leaf(1), x: 600 })
  })

  it('snaps the twigs under a roof, and the roof comes down on the stumps', () => {
    const laid = [{ id: twig(0), x: 600 }, { id: twig(1), x: 700 }, { id: leaf(), x: 650 }]
    const before = build(laid), p = plan(laid)
    const roof = p.parts[0]
    expect(roof).toMatchObject({ who: 'fat', act: 'roof', twigs: [twig(0), twig(1)] })
    expect(p.snapped).toEqual([twig(0), twig(1)])
    const fallen = roof.house.find((r) => r.id === leaf())!
    expect(fallen.cell.is).toBe('roof')
    expect(fallen.y - before[2].y).toBe(54)
    // The fat one does not sleep there: it ends in the heap.
    expect(p.asleep[0].on).toBeNull()
  })

  it('is asleep before it gets to the roof when a bed lies to its left', () => {
    const p = plan([{ id: idOf('moss'), x: 420 }, { id: leaf(1), x: 420 }, { id: twig(0), x: 600 }, { id: twig(1), x: 700 }, { id: leaf(), x: 650 }])
    expect(acts(p).filter((name) => name.startsWith('fat'))).toEqual(['fat bed'])
    expect(p.snapped).toEqual([])
  })

  it('pulls the tablecloth off: the leaf is back on the forest floor', () => {
    const laid = [{ id: idOf('bark'), x: 640 }, { id: leaf(), x: 640 }]
    const p = plan(laid)
    expect(acts(p)[0]).toBe('fat tablecloth')
    expect(p.things.map((thing) => thing.id)).toEqual([idOf('bark')])
  })

  it('slides off a slide and sleeps nowhere', () => {
    const p = plan([{ id: idOf('pebble'), x: 640 }, { id: leaf(), x: 650 }])
    expect(acts(p)[0]).toBe('fat slide')
    expect(p.things).toHaveLength(2)
  })
})

describe('the tiny one gets into every acorn cap', () => {
  it('floods what lies no higher than a bath, as far as the water runs, and from the root step what lies on the floor below', () => {
    const laid = [{ id: cap(), x: 440 }, { id: idOf('moss'), x: 600 }, { id: leaf(), x: 600 }, { id: idOf('pebble'), x: 800 }]
    const p = plan(laid)
    const bath = p.parts.find((part) => part.act === 'bath')!
    // The bed below the step is soaked, the pebble far along the floor is not.
    expect(bath.flooded.sort()).toEqual([leaf(), idOf('moss')].sort())
    expect(p.soaked).toEqual([leaf(), idOf('moss')].sort((a, b) => a - b))
    expect(bath.spill).toMatchObject({ y: HOLLOW.floorY })
    // A bath on the floor does not reach up onto the step.
    const low = plan([{ id: cap(), x: 560 }, { id: idOf('pebble'), x: 420 }])
    expect(low.soaked).toEqual([])
    const house = build(laid)
    expect(floodOf(house, house[0]).to - floodOf(house, house[0]).from).toBeLessThan(310)
  })

  it('gets into every acorn cap, the cradles last, and sleeps in the last cradle; and wakes the fat one with a bell', () => {
    const bell = plan([{ id: idOf('moss'), x: 420 }, { id: leaf(), x: 420 }, { id: twig(), x: 700 }, { id: cap(), x: 700 }])
    expect(acts(bell)).toEqual(['fat bed', 'tiny bell', 'tidy noFeather'])
    expect(bell.parts[1].wakes).toBe(true)
    // Woken, the fat one has no bed any more.
    expect(bell.asleep[0].on).toBeNull()
    const cradle = plan([{ id: idOf('moss'), x: 700 }, { id: cap(), x: 700 }, { id: cap(1), x: 560 }])
    // A cradle to the right of a bath: the bath is got into too, before the cradle it sleeps in.
    expect(acts(cradle).filter((name) => name.startsWith('tiny'))).toEqual(['tiny bath', 'tiny cradle'])
    expect(cradle.parts.filter((part) => part.who === 'tiny').map((part) => part.sleeps)).toEqual([false, true])
    expect(cradle.asleep[2]).toEqual({ who: 'tiny', on: cap(), x: 700 })
    // Two cradles: it rocks in both, and falls asleep in the second.
    const two = plan([{ id: idOf('moss'), x: 700 }, { id: cap(), x: 700 }, { id: idOf('moss', 1), x: 560 }, { id: cap(1), x: 560 }])
    expect(two.parts.filter((part) => part.who === 'tiny').map((part) => [part.act, part.thing, part.sleeps])).toEqual([['cradle', cap(), false], ['cradle', cap(1), true]])
    expect(two.asleep[2]).toEqual({ who: 'tiny', on: cap(1), x: 560 })
    // With no sleeper the bell wakes nobody.
    expect(plan([{ id: twig(), x: 700 }, { id: cap(), x: 700 }]).parts[1].wakes).toBe(false)
  })

  it('uses a lamp and a bowl and leaves the house as it was', () => {
    const laid = [{ id: idOf('pebble'), x: 560 }, { id: cap(), x: 560 }, { id: idOf('bark'), x: 740 }, { id: cap(1), x: 740 }]
    const p = plan(laid)
    expect(acts(p).filter((name) => name.startsWith('tiny'))).toEqual(['tiny bowl', 'tiny lamp'])
    expect(p.things).toEqual(laidOf(build(laid)))
  })
})

describe('the tidy one sweeps with the first feather from the right', () => {
  it('has an act for each cell of its feather', () => {
    const on: [string, Laid[]][] = [
      ['broom', []], ['quilt', [{ id: idOf('moss'), x: 700 }]], ['tickler', [{ id: idOf('pebble'), x: 700 }]],
      ['flag', [{ id: twig(), x: 700 }]], ['sail', [{ id: idOf('bark'), x: 700 }]],
    ]
    for (const [name, under] of on) expect(acts(plan([...under, { id: idOf('feather'), x: 700 }])).at(-1), name).toBe(`tidy ${name}`)
    // Of two feathers it takes the one further right.
    const two = plan([{ id: idOf('feather', 0), x: 420 }, { id: idOf('moss'), x: 760 }, { id: idOf('feather', 1), x: 760 }])
    expect(two.parts.at(-1)).toMatchObject({ act: 'quilt', thing: idOf('feather', 1) })
  })

  it('sails off on a slab that lies on ground a bath has spilt over this evening, with what rests on the slab', () => {
    const laid = [{ id: cap(), x: 440 }, { id: idOf('bark'), x: 590 }, { id: idOf('feather'), x: 590 }]
    const p = plan(laid)
    const sail = p.parts.at(-1)!
    expect(sail).toMatchObject({ who: 'tidy', act: 'sail', sails: idOf('bark') })
    const slab = sail.house.find((r) => r.id === idOf('bark'))!
    expect(slab.x).toBe(HOLLOW.right - slab.w / 2)
    const rider = sail.house.find((r) => r.id === idOf('feather'))!
    expect(rider).toMatchObject({ x: slab.x, under: [slab.id] })
    expect(p.things.find((thing) => thing.id === idOf('bark'))!.x).toBe(slab.x)
    // With no bath spilling over its ground it only polishes.
    const dry = plan([{ id: idOf('bark'), x: 590 }, { id: idOf('feather'), x: 590 }])
    expect(dry.parts.at(-1)).toMatchObject({ act: 'sail', sails: null })
    expect(dry.things).toEqual(laidOf(build(laid.slice(1))))
    // A slab that was soaked on an earlier evening does not sail again by itself.
    const old = plan([{ id: idOf('bark'), x: 590 }, { id: idOf('feather'), x: 590 }], [], [idOf('bark')])
    expect(old.parts.at(-1)!.sails).toBeNull()
  })
})

describe('what the evening saves', () => {
  it('is a house that builds again as the plan left it', () => {
    const laid = [{ id: twig(0), x: 600 }, { id: twig(1), x: 700 }, { id: leaf(), x: 650 }, { id: cap(), x: 440 }, { id: idOf('bark'), x: 780 }, { id: idOf('feather'), x: 780 }, { id: idOf('pebble'), x: 540 }]
    const p = plan(laid)
    const again = build(p.things, new Set(p.snapped))
    expect(laidOf(again)).toEqual(p.things)
    expect(again).toEqual(p.parts.at(-1)!.house)
    // Only what is in the hollow is snapped or soaked.
    const inHouse = new Set(again.map((r) => r.id))
    for (const id of [...p.snapped, ...p.soaked]) expect(inHouse.has(id)).toBe(true)
  })

  it('lays each sleeper on the thing it ended on, or in the heap on the widest free stretch of floor', () => {
    const laid = [{ id: idOf('moss'), x: 560 }, { id: leaf(), x: 560 }, { id: idOf('pebble'), x: 660 }]
    const p = plan(laid), house = build(p.things)
    const bed = house.find((r) => r.id === leaf())!
    expect(bedOf(house, p.asleep[0])).toEqual({ x: bed.x, y: topOf(bed) })
    const heap = heapPlace(house, false)
    expect(p.asleep[2]).toEqual({ who: 'tiny', on: null, x: heap })
    // Right of the pebble the floor is free up to the wall. The fat one is in its bed, so the other two sit there side by side, with room before the wall.
    expect(Math.round((692 + HOLLOW.right) / 2)).toBe(772)
    expect(heap).toBe(772)
    expect(heap).toBeLessThanOrEqual(PAIR_ROOM.to)
    // With the fat one on the floor the heap is as long as it is: it keeps further from the wall and from the root step.
    expect(heapPlace(house, true)).toBe(HEAP_ROOM.to)
    expect(heapPlace([])).toBe(Math.round((HOLLOW.stepRight + HOLLOW.right) / 2))
    expect(heapPlace(build([{ id: idOf('bark'), x: 700 }, { id: idOf('moss'), x: 820 }]))).toBe(HEAP_ROOM.from)
    expect(bedOf(house, p.asleep[2]).y).toBe(HOLLOW.floorY)
  })
})
