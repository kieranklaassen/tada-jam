import { GUEST_BOX, STANCE, restsInBed } from './inkGuests'
import type { InkGuest } from './inkScene'
import type { PageLayout, Rect } from './layout'

// Where each guest stands on the page: the middle of its feet, whether its
// figure is mirrored, and the box a finger can land in. Pure arithmetic over
// the layout, shared by the page that draws a guest and by the toy that has
// to know which guest a finger landed on, so the two can never disagree.

export type Spot = { x: number; y: number; flip: boolean }

/** Where a guest is drawn. `lobbyPlace` is how many guests stand in the lobby before it. Null when the house has no such room. */
export function spotOf(guest: InkGuest, page: PageLayout, lobbyPlace: number): Spot | null {
  const u = page.scale, stance = STANCE[guest.id]
  /** Mirrors a figure so that it faces the way asked. */
  const flipTo = (way: 'left' | 'right') => stance.faces !== 'front' && stance.faces !== way
  if (guest.place === 'bench') {
    const box = page.benchGuest
    return { x: box.x + 36 * u, y: box.y + box.h, flip: false }
  }
  if (guest.place === 'lobby') {
    const spot = page.lobbySpots[Math.min(lobbyPlace, page.lobbySpots.length - 1)]
    // It faces the house, whose doors it stares at.
    return spot ? { x: spot.x, y: spot.y, flip: flipTo('left') } : null
  }
  const room = page.rooms[guest.place.room]
  if (!room) return null
  const inward = room.bedSide === 'right' ? 'right' : 'left'
  const turned = guest.turnedTo === 'left' || guest.turnedTo === 'right' ? guest.turnedTo : null
  const pose = { awake: guest.awake, mood: guest.mood, turnedTo: guest.turnedTo, wrapped: guest.wrapped, bag: false, frame: 0 }
  if (restsInBed(guest.id, pose)) {
    // Sitting up against the head of the bed it looks down the bed; turned to the wall behind it, it sits at the foot.
    const away = room.bedSide === 'right' ? 'left' : 'right'
    const way = turned ?? away
    const fromHead = way === away ? 22 : 70
    const x = room.bedSide === 'right' ? room.bed.x + room.bed.w - fromHead * u : room.bed.x + fromHead * u
    return { x, y: room.stand.y, flip: flipTo(way) }
  }
  const flip = flipTo(turned ?? inward)
  return { x: room.stand.x + stance.shift * u * (flip ? -1 : 1), y: room.stand.y, flip }
}

/** Every guest of a scene with its spot, in the order the page draws them: guests in the lobby take its standing places in turn. */
export function spotsOf(guests: readonly InkGuest[], page: PageLayout): { guest: InkGuest; spot: Spot }[] {
  const spots: { guest: InkGuest; spot: Spot }[] = []
  let lobbyPlace = 0
  for (const guest of guests) {
    const spot = spotOf(guest, page, lobbyPlace)
    if (guest.place === 'lobby') lobbyPlace++
    if (spot) spots.push({ guest, spot })
  }
  return spots
}

/** How much of a figure's box a finger can land in: its middle, where the body is, never the empty corners. */
const BODY = { w: 104, h: 150 }

/** The box a finger lands in to touch a guest standing at a spot. */
export function bodyBox(spot: Spot, page: PageLayout): Rect {
  const u = page.scale
  const w = Math.min(GUEST_BOX.w, BODY.w) * u, h = Math.min(GUEST_BOX.h, BODY.h) * u
  return { x: spot.x - w / 2, y: spot.y - h, w, h }
}
