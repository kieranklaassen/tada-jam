import { FEEDING, insideCircle, type Point } from './layout'
import type { Piece } from './state'

// Fair Feeding (R9, KTD5). Plates and the bowl are zones over the shared
// pieces. Amounts are quarter-stones, so two halves match one whole. The
// party eats together when every seated plate matches and the bowl cannot
// make another full round; whatever is left in the bowl is the leftover,
// and the knife is only there while a leftover is.

export type FeedingView = {
  plates: number[]
  plateIds: number[][]
  bowl: number
  bowlIds: number[]
  seated: number[]
  shareComplete: boolean
  leftover: boolean
}

export function plateOf(point: Point): number | null {
  const index = FEEDING.seats.findIndex((seat) => insideCircle(point, { ...seat.plate, r: FEEDING.plateRadius }))
  return index < 0 ? null : index
}

export function inBowl(point: Point): boolean {
  return insideCircle(point, FEEDING.bowl)
}

export function viewFeeding(pieces: readonly Piece[], seats: readonly boolean[]): FeedingView {
  const plates = FEEDING.seats.map(() => 0)
  const plateIds: number[][] = FEEDING.seats.map(() => [])
  let bowl = 0
  const bowlIds: number[] = []
  for (const piece of pieces) {
    if (inBowl(piece)) {
      bowl += piece.q
      bowlIds.push(piece.id)
      continue
    }
    const plate = plateOf(piece)
    if (plate !== null && seats[plate]) {
      plates[plate] += piece.q
      plateIds[plate].push(piece.id)
    }
  }
  const seated = seats.flatMap((isSeated, index) => (isSeated ? [index] : []))
  const seatedTotals = seated.map((index) => plates[index])
  const allMatch = seatedTotals.length > 0 && seatedTotals.every((total) => total === seatedTotals[0]) && seatedTotals[0] > 0
  const canDealRound = bowlIds.length >= seated.length
  const shareComplete = allMatch && !canDealRound
  return { plates, plateIds, bowl, bowlIds, seated, shareComplete, leftover: shareComplete && bowl > 0 }
}

/** The next seated plate after `lastSeat` in clockwise order, or null with nobody seated. */
export function nextSeat(seats: readonly boolean[], lastSeat: number | null): number | null {
  const count = seats.length
  const start = lastSeat === null ? 0 : lastSeat + 1
  for (let i = 0; i < count; i++) {
    const index = (start + i) % count
    if (seats[index]) return index
  }
  return null
}

/** Where a guest looks: toward the fullest plate when theirs holds less, otherwise straight ahead. */
export function gazeTarget(view: FeedingView, seat: number): number | null {
  const fullest = view.seated.reduce<number | null>(
    (best, index) => (best === null || view.plates[index] > view.plates[best] ? index : best),
    null,
  )
  if (fullest === null || fullest === seat) return null
  return view.plates[seat] < view.plates[fullest] ? fullest : null
}

export const GUEST_RADIUS = 58

/** A free spot on a plate, spiralling out from the center and keeping clear of the guest. */
export function freeSpotOnPlate(seat: number, occupied: readonly Point[], radius: number): Point {
  const { plate: center, guest } = FEEDING.seats[seat]
  for (let ring = 0; ring < 4; ring++) {
    const count = ring === 0 ? 1 : ring * 6
    for (let k = 0; k < count; k++) {
      const angle = (k / count) * Math.PI * 2 + ring * 0.4
      const spot = { x: center.x + Math.cos(angle) * ring * radius * 2, y: center.y + Math.sin(angle) * ring * radius * 2 }
      if (Math.hypot(guest.x - spot.x, guest.y - spot.y) < GUEST_RADIUS + radius) continue
      if (occupied.every((p) => Math.hypot(p.x - spot.x, p.y - spot.y) > radius * 1.9)) return spot
    }
  }
  return { x: center.x, y: center.y }
}
