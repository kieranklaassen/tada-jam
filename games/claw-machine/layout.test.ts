import { describe, expect, it } from 'vitest'
import { toySpan } from './builds'
import { LADDER } from './config'
import { ON_DECK, deckSpots } from './layout'
import { layCycle } from './order'
import { placesFor } from './world'
import { CRATE } from './places'

describe('the load on the deck of a crate', () => {
  it('stands in one row or two, inside the deck, in the order of its places, and no two toys of it meet', () => {
    for (const position of LADDER) for (let seed = 1; seed <= 60; seed++) {
      const toys = layCycle(position, seed).toys, places = placesFor(seed), spots = deckSpots(toys, places)
      expect(spots.length).toBe(toys.length)
      expect(new Set(spots.map((spot) => spot.z)).size).toBeLessThanOrEqual(2)
      spots.forEach((spot, i) => {
        const half = (toySpan(toys[i]).length * ON_DECK) / 2
        expect(Math.abs(spot.x) + half).toBeLessThanOrEqual(CRATE.width / 2 - 0.5)
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
