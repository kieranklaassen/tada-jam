import { GUEST_BOX, STANCE, restsInBed } from './inkGuests'
import type { InkGuest, InkView } from './inkScene'
import type { PageLayout, Rect } from './layout'

// Where each guest stands on the page: the middle of its feet, whether its
// figure is mirrored, and the box a finger can land in. Pure arithmetic over
// the layout, shared by the page that draws a guest and by the toy that has
// to know which guest a finger landed on, so the two can never disagree.

export type Spot = {
  x: number
  y: number
  flip: boolean
  /** How tall its body is where it is not standing: a guest on the bench sits. In the drawing's units. */
  tall?: number
}

/** Where a guest is drawn. `lobbyPlace` is which standing place of the lobby is its own (`spotsOf` gives each guest one). Null when the house has no such room. */
export function spotOf(guest: InkGuest, page: PageLayout, lobbyPlace: number): Spot | null {
  const u = page.scale, stance = STANCE[guest.id]
  /** Mirrors a figure so that it faces the way asked. */
  const flipTo = (way: 'left' | 'right') => stance.faces !== 'front' && stance.faces !== way
  if (guest.place === 'bench') {
    const box = page.benchGuest
    return { x: box.x + 36 * u, y: box.y + box.h, flip: false, tall: 116 }
  }
  if (guest.place === 'lobby') {
    // The place beside the porter is the last to be taken: a small coach-load stands clear of him.
    const order = [1, 2, 3, 4, 0]
    const spot = page.lobbySpots[order[Math.min(lobbyPlace, order.length - 1)] ?? 0]
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

/**
 * Every guest of a scene with its spot, in the order the page draws them.
 * Each guest keeps a standing place of its own in the lobby, by where it
 * comes in the scene's list of guests, so nobody shuffles along when another
 * is carried off.
 */
export function spotsOf(guests: readonly InkGuest[], page: PageLayout): { guest: InkGuest; spot: Spot }[] {
  const spots: { guest: InkGuest; spot: Spot }[] = []
  const taken = new Set<number>()
  let place = 0
  for (const guest of guests) {
    let spot = spotOf(guest, page, place)
    if (guest.place !== 'bench') place++
    if (!spot) continue
    if (typeof guest.place === 'object') {
      // The second guest of a room with two beds stands at the room's second place.
      if (taken.has(guest.place.room)) spot = secondSpot(page, guest.place.room, spot)
      taken.add(guest.place.room)
    }
    spots.push({ guest, spot })
  }
  return spots
}

/** How much of a figure's box a finger can land in: its middle, where the body is, never the empty corners. */
const BODY = { w: 104, h: 150 }

/** The box a finger lands in to touch a guest standing at a spot. */
export function bodyBox(spot: Spot, page: PageLayout): Rect {
  const u = page.scale
  const w = Math.min(GUEST_BOX.w, BODY.w) * u, h = Math.min(GUEST_BOX.h, spot.tall ?? BODY.h) * u
  return { x: spot.x - w / 2, y: spot.y - h, w, h }
}

// --- The page from a guest's place -------------------------------------------
// The page and the finger must agree on where things are when the page is
// drawn from a guest's place, so the two transforms of a view live here: the
// large room (a lens) and the bat's page, which is upside down.

/** How much larger the view's own room is drawn. */
export const LENS = 1.3

export type Lens = {
  /** The part of the plain page that is enlarged: the room with a little of its walls. */
  from: Rect
  /** Where it is drawn: `from` enlarged about its middle, moved as little as it takes to stay on the plate. */
  to: Rect
  scale: number
}

/** The lens over a room, or null when the house has no such room. */
export function lensOf(page: PageLayout, room: number | null): Lens | null {
  const layout = room === null ? undefined : page.rooms[room]
  if (!layout) return null
  const pad = 5 * page.scale
  const from = { x: layout.rect.x - pad, y: layout.rect.y - pad, w: layout.rect.w + 2 * pad, h: layout.rect.h + 2 * pad }
  const w = from.w * LENS, h = from.h * LENS
  const plate = page.plate
  const x = Math.max(plate.x, Math.min(plate.x + plate.w - w, from.x + from.w / 2 - w / 2))
  const y = Math.max(plate.y, Math.min(plate.y + plate.h - h, from.y + from.h / 2 - h / 2))
  return { from, to: { x, y, w, h }, scale: LENS }
}

/**
 * Whether this guest's page is drawn upside down: the bat hangs from its
 * ceiling. The plate is turned half round about its middle. Not while the
 * guest is in the child's hand: the house never moves under a carrying finger.
 */
export function upsideDown(from: InkGuest['id'] | null, inHand = false): boolean {
  return from === 'bat' && !inHand
}

/**
 * Where a point on the drawn page lies on the plain page: the upside-down
 * page turned back, and a point inside the lens taken back into its room.
 * With no view the point is where it is.
 */
export function toPlain(page: PageLayout, view: InkView | null, point: { x: number; y: number }): { x: number; y: number } {
  if (!view) return point
  let { x, y } = point
  if (upsideDown(view.from, view.inHand)) {
    x = 2 * (page.plate.x + page.plate.w / 2) - x
    y = 2 * (page.plate.y + page.plate.h / 2) - y
  }
  const lens = view.large === false ? null : lensOf(page, view.room)
  if (lens && x >= lens.to.x && x <= lens.to.x + lens.to.w && y >= lens.to.y && y <= lens.to.y + lens.to.h) {
    x = lens.from.x + (x - lens.to.x) / lens.scale
    y = lens.from.y + (y - lens.to.y) / lens.scale
  }
  return { x, y }
}

/** The other way: where a point of the plain page is drawn in a view. A point of the lens's room goes into the lens. */
export function fromPlain(page: PageLayout, view: InkView | null, point: { x: number; y: number }): { x: number; y: number } {
  if (!view) return point
  let { x, y } = point
  const lens = view.large === false ? null : lensOf(page, view.room)
  if (lens && x >= lens.from.x && x <= lens.from.x + lens.from.w && y >= lens.from.y && y <= lens.from.y + lens.from.h) {
    x = lens.to.x + (x - lens.from.x) * lens.scale
    y = lens.to.y + (y - lens.from.y) * lens.scale
  }
  if (upsideDown(view.from, view.inHand)) {
    x = 2 * (page.plate.x + page.plate.w / 2) - x
    y = 2 * (page.plate.y + page.plate.h / 2) - y
  }
  return { x, y }
}

// --- Where the things are ------------------------------------------------------
// The five things, wherever the child has put them: in the cupboard, in a
// room, on a wall or a floor, or with a guest. The page draws each thing in
// its box and the game finds a finger in the same box.

type ThingLike = { kind: 'quilt' | 'pipe' | 'stove' | 'ice' | 'clock'; at: 'cupboard' | { room: number } | { edge: string } | { guest: InkGuest['id'] } }

/** The order of the cupboard's slots. */
const SLOT: Record<ThingLike['kind'], number> = { quilt: 0, pipe: 1, stove: 2, ice: 3, clock: 4 }

/** Each thing in a room: how far its middle is from the wall at the head of the bed, how high its foot is off the floor, and its size, all in the drawing's units. */
const IN_ROOM: Record<ThingLike['kind'], { fromBedWall: number; up: number; w: number; h: number }> = {
  // Folded on the bed.
  quilt: { fromBedWall: 54, up: 54, w: 66, h: 24 },
  // Standing in the corner behind the head of the bed, like a hat stand.
  pipe: { fromBedWall: 9, up: 0, w: 16, h: 118 },
  // On the floor in front of the bed, side by side: the ice box by its head, the stove by its foot.
  stove: { fromBedWall: 88, up: 0, w: 42, h: 52 },
  ice: { fromBedWall: 42, up: 0, w: 44, h: 50 },
  // On the head of the bed.
  clock: { fromBedWall: 32, up: 84, w: 26, h: 28 },
}

/** Each thing on a wall or a floor: where along it (0 to 1, from the top of a wall or the left of a floor), and its size along and across the edge. */
const ON_EDGE: Partial<Record<ThingLike['kind'], { along: number; len: number; across: number }>> = {
  quilt: { along: 0.52, len: 112, across: 24 },
  pipe: { along: 0.26, len: 26, across: 58 },
  clock: { along: 0.12, len: 28, across: 28 },
}

/** Each thing with a guest: where its handle is from the guest's feet, on the side the guest faces away from (the quilt's tassel, the pipe at its mouth, the clock in its hand), and its size. */
const WITH_GUEST: Partial<Record<ThingLike['kind'], { out: number; up: number; w: number; h: number }>> = {
  quilt: { out: -50, up: 34, w: 26, h: 40 },
  pipe: { out: 52, up: 112, w: 56, h: 26 },
  clock: { out: -48, up: 78, w: 26, h: 28 },
}

/** The box a thing is drawn in, on the plain page, or null when the house has no such place. */
export function thingBox(thing: ThingLike, page: PageLayout, standing: readonly { guest: InkGuest; spot: Spot }[]): Rect | null {
  const u = page.scale
  const at = thing.at
  if (at === 'cupboard') return page.slots[SLOT[thing.kind]] ?? null
  if ('room' in at) {
    const room = page.rooms[at.room]
    if (!room) return null
    const size = IN_ROOM[thing.kind]
    const wall = room.bedSide === 'right' ? room.rect.x + room.rect.w : room.rect.x
    const cx = room.bedSide === 'right' ? wall - size.fromBedWall * u : wall + size.fromBedWall * u
    const foot = room.rect.y + room.rect.h - size.up * u
    return { x: cx - (size.w * u) / 2, y: foot - size.h * u, w: size.w * u, h: size.h * u }
  }
  if ('edge' in at) {
    const edge = page.edges.find((one) => one.id === at.edge)
    const size = ON_EDGE[thing.kind]
    if (!edge || !size) return null
    const r = edge.rect
    if (edge.kind === 'wall') {
      const cy = r.y + r.h * size.along, cx = r.x + r.w / 2
      return { x: cx - (size.across * u) / 2, y: cy - (size.len * u) / 2, w: size.across * u, h: size.len * u }
    }
    const cx = r.x + r.w * size.along, cy = r.y + r.h / 2
    return { x: cx - (size.len * u) / 2, y: cy - (size.across * u) / 2, w: size.len * u, h: size.across * u }
  }
  const held = standing.find((one) => one.guest.id === at.guest)
  const size = WITH_GUEST[thing.kind]
  if (!held || !size) return null
  // `out` is toward the way the figure faces when positive; a mirrored figure faces the other way.
  const drawn = STANCE[held.guest.id].faces === 'left' ? -1 : 1
  const stance = drawn * (held.spot.flip ? -1 : 1)
  let x = held.spot.x + size.out * u * stance - (size.w * u) / 2
  // What a guest holds stays in the room it stands in: by a wall it is held in closer.
  const room = typeof held.guest.place === 'object' ? page.rooms[held.guest.place.room] : undefined
  if (room) x = Math.max(room.rect.x + u, Math.min(room.rect.x + room.rect.w - size.w * u - u, x))
  return { x, y: held.spot.y - size.up * u - size.h * u, w: size.w * u, h: size.h * u }
}

/** The box a finger can land in to touch a thing: its own box, grown to a finger's width where it is smaller. */
export function thingTouch(box: Rect, least: number): Rect {
  const w = Math.max(box.w, least), h = Math.max(box.h, least)
  return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h }
}

/** Where the second guest of a room with two beds stands: `spotOf` gives every guest the first place, and the page moves the second one here. */
export function secondSpot(page: PageLayout, room: number, spot: Spot): Spot {
  const layout = page.rooms[room]
  return layout ? { ...spot, x: layout.stand2.x, y: layout.stand2.y } : spot
}
