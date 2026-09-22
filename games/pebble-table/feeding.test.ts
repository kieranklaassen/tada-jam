import { describe, expect, it } from 'vitest'
import { freeSpotOnPlate, gazeTarget, GUEST_RADIUS, nextSeat, plateOf, viewFeeding } from './feeding'
import { FEEDING } from './layout'
import type { Piece } from './state'

let nextId = 1
const onPlate = (seat: number, count: number, q: 1 | 2 | 4 = 4): Piece[] =>
  Array.from({ length: count }, (_, i) => ({ id: nextId++, q, x: FEEDING.seats[seat].plate.x - 20 + i * 20, y: FEEDING.seats[seat].plate.y }))
const inBowl = (count: number): Piece[] =>
  Array.from({ length: count }, (_, i) => ({ id: nextId++, q: 4 as const, x: FEEDING.bowl.x - 30 + i * 30, y: FEEDING.bowl.y }))

const seatsOf = (...seated: number[]) => FEEDING.seats.map((_, index) => seated.includes(index))

describe('Fair Feeding', () => {
  it('Covers AE1. five stones, two guests, two each: share complete, one leftover, knife; a third guest takes the fifth', () => {
    const twoGuests = seatsOf(1, 4)
    const leftoverStone = inBowl(1)
    const pieces = [...onPlate(1, 2), ...onPlate(4, 2), ...leftoverStone]
    const view = viewFeeding(pieces, twoGuests)
    expect(view.shareComplete).toBe(true)
    expect(view.bowl).toBe(4)
    expect(view.leftover).toBe(true)

    const threeGuests = seatsOf(0, 1, 4)
    const dealtToThird = [...onPlate(1, 2), ...onPlate(4, 2), ...onPlate(0, 1)]
    const after = viewFeeding(dealtToThird, threeGuests)
    expect(after.leftover).toBe(false)
  })

  it('completes for 2 and 2 with an empty bowl, not for 2 and 1', () => {
    expect(viewFeeding([...onPlate(1, 2), ...onPlate(4, 2)], seatsOf(1, 4)).shareComplete).toBe(true)
    expect(viewFeeding([...onPlate(1, 2), ...onPlate(4, 1)], seatsOf(1, 4)).shareComplete).toBe(false)
  })

  it('is not complete while the bowl can make another round', () => {
    const view = viewFeeding([...onPlate(1, 1), ...onPlate(4, 1), ...inBowl(3)], seatsOf(1, 4))
    expect(view.shareComplete).toBe(false)
    expect(view.leftover).toBe(false)
  })

  it('matches two halves against one whole', () => {
    expect(viewFeeding([...onPlate(1, 2, 2), ...onPlate(4, 1, 4)], seatsOf(1, 4)).shareComplete).toBe(true)
  })

  it('ignores plates at empty chairs', () => {
    const view = viewFeeding([...onPlate(1, 1), ...onPlate(4, 1), ...onPlate(2, 3)], seatsOf(1, 4))
    expect(view.plates[2]).toBe(0)
    expect(view.shareComplete).toBe(true)
  })

  it('deals round-robin in seat order and skips empty chairs', () => {
    const seats = seatsOf(1, 4)
    expect(nextSeat(seats, null)).toBe(1)
    expect(nextSeat(seats, 1)).toBe(4)
    expect(nextSeat(seats, 4)).toBe(1)
    expect(nextSeat(seatsOf(), null)).toBeNull()
  })

  it('has the guest with fewer look toward the fullest plate; equal plates look ahead', () => {
    const view = viewFeeding([...onPlate(1, 3), ...onPlate(4, 1)], seatsOf(1, 4))
    expect(gazeTarget(view, 4)).toBe(1)
    expect(gazeTarget(view, 1)).toBeNull()
    const even = viewFeeding([...onPlate(1, 2), ...onPlate(4, 2)], seatsOf(1, 4))
    expect(gazeTarget(even, 4)).toBeNull()
  })

  it('finds free spots that do not overlap what is already on the plate', () => {
    const first = freeSpotOnPlate(1, [], 30)
    const second = freeSpotOnPlate(1, [first], 30)
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(55)
    expect(plateOf(second)).toBe(1)
  })

  it('never puts a dealt stone where the guest would push it off the plate', () => {
    const occupied: { x: number; y: number }[] = []
    for (let i = 0; i < 6; i++) {
      const spot = freeSpotOnPlate(1, occupied, 30)
      const guest = FEEDING.seats[1].guest
      expect(Math.hypot(spot.x - guest.x, spot.y - guest.y)).toBeGreaterThanOrEqual(GUEST_RADIUS + 30)
      occupied.push(spot)
    }
  })
})
