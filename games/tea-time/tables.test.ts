import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CLOTH, SEAT_COUNT, placeSpot, seatSpot } from './layout'
import { partyFor, setTable } from './order'
import { gapBetween, spoutSpot, stationFor } from './pour'
import type { Thing, World } from './world'

// Nothing stands in anything else on any table the designed order can lay.
// This is the model's side of "nothing passes through anything" for a table
// at rest; hands.test.ts holds it for everything a finger can do, and the
// audit of the drawn scene holds it for what is drawn.

/** Every pair of things that stand on the cloth themselves, with how far their edges are apart (negative when they overlap). */
function gaps(things: readonly Thing[]): { a: string; b: string; gap: number }[] {
  const standing = things.filter((thing) => thing.on === null && thing.heldBy === null)
  const out: { a: string; b: string; gap: number }[] = []
  for (let i = 0; i < standing.length; i++) {
    for (let j = i + 1; j < standing.length; j++) {
      const a = standing[i], b = standing[j]
      out.push({ a: a.id, b: b.id, gap: gapBetween(a, b) })
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

describe('the table of every position', () => {
  it('lays nothing in anything else, for many parties', () => {
    for (const position of LADDER) {
      let seed = 7
      for (let turn = 0; turn < 40; turn++) {
        const laid = partyFor(position, seed)
        seed = laid.seed
        expectApart(setTable(laid.party), `${position}, turn ${turn}`)
      }
    }
  })

  it('leaves room for a saucer at every place, for the guest behind it, and for the pot beside it', () => {
    for (let party = 1; party <= SEAT_COUNT; party++) {
      for (let seat = 0; seat < party; seat++) {
        const place = placeSpot(party, seat), guest = seatSpot(party, seat)
        if (seat > 0) expect(place.x - placeSpot(party, seat - 1).x).toBeGreaterThan(2.0)
        expect(place.z - guest.z).toBeGreaterThan(2.0)
        const station = stationFor(place)
        expect(Math.hypot(station.x - place.x, station.z - place.z)).toBeGreaterThan(2.0)
        const spout = spoutSpot({ x: station.x, z: station.z, heading: station.heading, reach: station.reach } as never)
        expect(Math.hypot(spout.x - place.x, spout.z - place.z)).toBeLessThan(1e-6)
      }
    }
  })
})
