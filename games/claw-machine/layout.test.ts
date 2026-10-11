import { describe, expect, it } from 'vitest'
import { toySpan } from './builds'
import { LADDER } from './config'
import { BED, ON_DECK, deckSpots } from './layout'
import { layCycle } from './order'
import { placesFor } from './world'

describe('the load on the bed of a crate', () => {
  it('stands in one row or two, inside the bed, as it will stand on the tray, and no two toys of it meet', () => {
    for (const position of LADDER) for (let seed = 1; seed <= 60; seed++) {
      const toys = layCycle(position, seed).toys, places = placesFor(seed), spots = deckSpots(toys, places)
      expect(spots.length).toBe(toys.length)
      expect(new Set(spots.map((spot) => spot.z)).size).toBeLessThanOrEqual(2)
      spots.forEach((spot, i) => {
        const half = (toySpan(toys[i]).length * ON_DECK) / 2
        expect(Math.abs(spot.x) + half).toBeLessThanOrEqual(BED.half)
        // The front row of the tray is the front row of the bed.
        for (const other of spots) if (places[spots.indexOf(other)] < 5 && places[i] >= 5) expect(spot.z).toBeGreaterThan(other.z)
        spots.forEach((other, j) => {
          if (j <= i || other.z !== spot.z) return
          expect(Math.abs(other.x - spot.x)).toBeGreaterThanOrEqual(half + (toySpan(toys[j]).length * ON_DECK) / 2 + 0.19)
          // Left to right on the deck as left to right on the tray.
          expect(Math.sign(other.x - spot.x)).toBe(Math.sign(places[j] - places[i]))
        })
      })
    }
  })
})
