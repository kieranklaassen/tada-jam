import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CLOTH, SEAT_COUNT, placeSpot, seatSpot } from './layout'
import { partyFor, setTable } from './order'
import { clearOf, footprint, spoutSpot, stationFor } from './pour'
import { lookTable, toyTable } from './tableau'
import type { Thing, World } from './world'

// Nothing stands in anything else, on any table the game can lay: the two
// tables the Mount opens on, and the table of every position of the designed
// order. This is the model's side of "nothing passes through anything"; the
// audit of the drawn scene comes with the game.

/** Every pair of things that stand on the cloth themselves, with how far their edges are apart (negative when they overlap). */
function gaps(things: readonly Thing[]): { a: string; b: string; gap: number }[] {
  const standing = things.filter((thing) => thing.on === null)
  const out: { a: string; b: string; gap: number }[] = []
  for (let i = 0; i < standing.length; i++) {
    for (let j = i + 1; j < standing.length; j++) {
      const a = standing[i], b = standing[j]
      // Saucers on the stack and spoons in their row lie together on purpose.
      if (a.kind === b.kind && (a.kind === 'spoon' || a.kind === 'saucer') && Math.hypot(a.x - b.x, a.z - b.z) < 1) continue
      out.push({ a: a.id, b: b.id, gap: Math.hypot(a.x - b.x, a.z - b.z) - footprint(a) - footprint(b) })
    }
  }
  return out
}

function expectApart(world: World, label: string): void {
  for (const pair of gaps(world.things)) expect(pair.gap, `${label}: ${pair.a} and ${pair.b}`).toBeGreaterThan(0)
  for (const thing of world.things) {
    expect(thing.x, `${label}: ${thing.id}`).toBeGreaterThan(CLOTH.minX)
    expect(thing.x, `${label}: ${thing.id}`).toBeLessThan(CLOTH.maxX)
    expect(thing.z, `${label}: ${thing.id}`).toBeGreaterThan(CLOTH.minZ)
    expect(thing.z, `${label}: ${thing.id}`).toBeLessThan(CLOTH.maxZ)
  }
}

describe('the tables the Mount opens on', () => {
  it('are the same on every load', () => {
    expect(toyTable()).toEqual(toyTable())
    expect(lookTable()).toEqual(lookTable())
  })

  it('stand the pot clear of everything, with its spout over the cup on the toy table', () => {
    const toy = toyTable()
    expectApart(toy.world, 'toy')
    expect(clearOf(toy.world, toy.pot, 1.0)).toBe(true)
    expect(toy.pot.over).toBe('cup')
    const look = lookTable()
    expectApart(look.world, 'look')
    expect(clearOf(look.world, look.pot, 1.0)).toBe(true)
    expect(look.guests).toHaveLength(3)
  })

  it('fill each guest\'s cup to its ring on the look table', () => {
    const { world } = lookTable()
    for (const cup of world.things.filter((thing) => thing.kind === 'cup')) expect(cup.tea).toBeCloseTo(cup.ring!, 9)
  })
})

describe('the table of every position', () => {
  it('lays nothing in anything else, for many parties', () => {
    for (const position of LADDER) {
      let seed = 7
      for (let turn = 0; turn < 40; turn++) {
        const laid = partyFor(position, seed)
        seed = laid.seed
        const world = setTable(laid.party)
        // The pot stands on the table too: it is a thing of the world here.
        expectApart(world, `${position}, turn ${turn}`)
      }
    }
  })

  it('leaves room for a saucer at every place and for the pot beside every place', () => {
    for (let party = 1; party <= SEAT_COUNT; party++) {
      for (let seat = 0; seat < party; seat++) {
        const place = placeSpot(party, seat), guest = seatSpot(party, seat)
        // A saucer is about one unit from middle to rim; the next place and the guest behind it are clear of it.
        if (seat > 0) expect(place.x - placeSpot(party, seat - 1).x).toBeGreaterThan(2.0)
        expect(place.z - guest.z).toBeGreaterThan(2.0)
        const station = stationFor(place)
        expect(Math.hypot(station.x - place.x, station.z - place.z)).toBeGreaterThan(2.0)
        expect(Math.hypot(spoutSpot({ ...station } as never).x - place.x, 0)).toBeLessThan(1e-6)
      }
    }
  })
})
