import { temperature } from './airs'
import { arrange } from './arrangement'
import { TASTES, type GuestId } from './guests'
import { roomCount, type House } from './hotel'

// A guest's demand: the door it stares at from the lobby, bag at its feet. It
// is the room that would suit this guest best if it had the house to itself,
// so two guests often stare at the same door. The demand is what a guest
// asks for; its worry is what must or must not reach it (mood.ts), and an
// arrangement settles the house when every worry is met, whichever doors were
// asked for.

/** The room a guest asks for in this house. */
export function demandOf(house: House, id: GuestId): number {
  const [coldest, warmest] = TASTES[id].comfort
  const empty = arrange(house, {})
  // A creature of the cold wants the coldest room, one of the warm the warmest, and the rest the mildest.
  const wish = warmest <= 0 && coldest < 0 ? -Infinity : coldest >= 1 ? Infinity : Math.max(coldest, Math.min(warmest, 0))
  let best = 0, bestGap = Infinity
  for (let room = 0; room < roomCount(house.shape); room++) {
    const warmth = temperature(empty, room)
    const gap = wish === -Infinity ? warmth : wish === Infinity ? -warmth : Math.abs(warmth - wish)
    // Among rooms that suit it equally it asks for the one highest up and furthest along: the room with the view.
    if (gap <= bestGap) {
      best = room
      bestGap = gap
    }
  }
  return best
}
