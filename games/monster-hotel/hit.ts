import type { GuestId } from './guests'
import type { ThingKind } from './arrangement'
import type { House } from './hotel'
import { bodyBox, reachBoxes, thingBox, thingTouch, type Spot } from './inkPlaces'
import type { InkGuest, InkThing } from './inkScene'
import { treeBox } from './inkSky'
import type { PageLayout, Rect, RoomLayout } from './layout'

// What a finger landed on. Pure arithmetic over the layout and the guests'
// standing places, in plain-page points (a point on a page drawn from a
// guest's place is taken back with `toPlain` first). Everything on the page
// answers a touch, so every point is something.

export type Point = { x: number; y: number }

export type Hit =
  /** One of the five things, wherever it is. */
  | { kind: 'thing'; thing: ThingKind }
  /** A guest, and how high on its body the finger landed: 0 at its feet, 1 at the top of its head. */
  | { kind: 'guest'; id: GuestId; where: number }
  | { kind: 'wheel' }
  | { kind: 'coach' }
  /** Inside a room, away from its walls, its door and its beds: the air under its lamp. */
  | { kind: 'room'; room: number }
  /** The door in a room's back wall. */
  | { kind: 'roomDoor'; room: number }
  /** A bed in a room: its one bed, or either bed of a room for two. */
  | { kind: 'bed'; room: number }
  /** The boiler in its bay of the foundations. */
  | { kind: 'boiler' }
  /** The mountain of luggage beside the bench, and the empty bird cage on top of it. */
  | { kind: 'luggage' }
  | { kind: 'cage' }
  /** A wall or a floor between two rooms, with the room on the nearer side of the finger. */
  | { kind: 'edge'; id: string; nearer: number }
  | { kind: 'lobby' }
  | { kind: 'bench' }
  | { kind: 'porter' }
  | { kind: 'door' }
  /** The roof, the foundations, an outside wall: plaster and slate that knock. */
  | { kind: 'house' }
  /** The bare tree behind the lobby, where the crows sit. */
  | { kind: 'tree' }
  /** Only paper: the sky, the street, the margin. */
  | { kind: 'paper' }
  /** The top right corner, which is the grown-up's (overlay.ts) and answers nothing. */
  | { kind: 'corner' }

/** The grown-up's corner, in logical pixels. */
export const CORNER = 72

/** How far to either side of a wall or floor a finger still lands on it. */
const EDGE_REACH = 9

const inside = (rect: Rect, point: Point, grow = 0): boolean =>
  point.x >= rect.x - grow && point.x <= rect.x + rect.w + grow && point.y >= rect.y - grow && point.y <= rect.y + rect.h + grow

export type Standing = { guest: InkGuest; spot: Spot }

/**
 * The guest under a point, or null. Where guests stand close, as in a queue
 * in the lobby, it is the one whose middle is nearest the finger. A guest
 * that is being carried is in the hand, not on the page. With `reach`, a
 * point on no guest's body but on what one holds out in the spot colour (a
 * horn, its music, its cloud, its bag) is that guest too: the spot colour
 * marks what can be touched. A body comes before anything held out over it.
 */
export function guestAt(page: PageLayout, standing: readonly Standing[], point: Point, except: GuestId | null = null, reach = false): { id: GuestId; where: number } | null {
  let found: { id: GuestId; where: number } | null = null, nearest = Infinity
  for (const { guest, spot } of standing) {
    if (guest.id === except || guest.carried) continue
    const box = bodyBox(spot, page)
    if (!inside(box, point)) continue
    const distance = Math.abs(point.x - (box.x + box.w / 2))
    if (distance < nearest) {
      nearest = distance
      found = { id: guest.id, where: Math.max(0, Math.min(1, (box.y + box.h - point.y) / box.h)) }
    }
  }
  if (found || !reach) return found
  for (const { guest, spot } of standing) {
    if (guest.id === except || guest.carried) continue
    const body = bodyBox(spot, page)
    for (const box of reachBoxes(guest, spot, page)) {
      if (!inside(box, point)) continue
      const distance = Math.hypot(point.x - (box.x + box.w / 2), point.y - (box.y + box.h / 2))
      if (distance < nearest) {
        nearest = distance
        found = { id: guest.id, where: Math.max(0, Math.min(1, (body.y + body.h - point.y) / body.h)) }
      }
    }
  }
  return found
}

/** The other bed of a room for two: its bed mirrored across the middle of the room, against the other wall. */
const secondBed = (layout: RoomLayout): Rect => ({ ...layout.bed, x: 2 * (layout.rect.x + layout.rect.w / 2) - layout.bed.x - layout.bed.w })

function edgeAt(page: PageLayout, point: Point, twins: readonly number[] = []): { id: string; nearer: number } | null {
  // A bed answers for itself: no wall or floor reaches over one, though a finger right on the slab or the wall still lands on it. The slab under a room on the ground and the outer wall beside it lie along the bed's own sides, and a room for two has such a bed against either wall.
  const onBed = page.rooms.some((layout, room) => inside(layout.bed, point) || (twins.includes(room) && inside(secondBed(layout), point)))
  const reach = onBed ? 0 : EDGE_REACH * page.scale
  for (const edge of page.edges) {
    if (!inside(edge.rect, point, reach)) continue
    const a = page.rooms[edge.a].rect, b = page.rooms[edge.b].rect
    // The nearer room is the one whose middle the finger is closer to, along the way the edge divides.
    const nearer = edge.kind === 'wall'
      ? (Math.abs(point.x - (a.x + a.w / 2)) <= Math.abs(point.x - (b.x + b.w / 2)) ? edge.a : edge.b)
      : (Math.abs(point.y - (a.y + a.h / 2)) <= Math.abs(point.y - (b.y + b.h / 2)) ? edge.a : edge.b)
    return { id: edge.id, nearer }
  }
  return null
}

/** The least a finger needs of a thing, in logical pixels. */
const FINGER = 48

/** The thing under a point, or null. A thing with a guest or on a bed lies over the guest or the room, so things are asked first. A carried thing is in the hand. */
export function thingAt(page: PageLayout, standing: readonly Standing[], things: readonly InkThing[], point: Point): ThingKind | null {
  let found: ThingKind | null = null, nearest = Infinity
  for (const thing of things) {
    if (thing.carried) continue
    const box = thingBox(thing, page, standing)
    if (!box || !inside(thingTouch(box, FINGER), point)) continue
    // Where two things' finger boxes overlap, the one whose middle is nearer the finger is meant.
    const distance = Math.hypot(point.x - (box.x + box.w / 2), point.y - (box.y + box.h / 2))
    if (distance < nearest) {
      nearest = distance
      found = thing.kind
    }
  }
  return found
}

/** What is under a point of a room that is no guest, thing or wall: its door, a bed, or the air under its lamp. `twin` is a room for two, which has a second bed against the other wall. */
function inRoom(page: PageLayout, room: number, point: Point, twin: boolean): Hit {
  const layout = page.rooms[room]
  if (inside(layout.bed, point) || (twin && inside(secondBed(layout), point))) return { kind: 'bed', room }
  if (inside(layout.door, point)) return { kind: 'roomDoor', room }
  return { kind: 'room', room }
}

/** Where the bird cage stands on the luggage: the top of the heap, a finger wide. In the drawing's units from the heap's top left. */
const CAGE = { x: 2, w: 48, h: 30 }

/** What is under a finger that lands or taps. `things` are the things on the page, `coach` whether the coach stands at the kerb, and `house` what is built into this house: its boilers and its rooms for two. */
export function hitAt(page: PageLayout, standing: readonly Standing[], point: Point, things: readonly InkThing[] = [], coach = false, house: Pick<House, 'fixtures' | 'twins'> | null = null): Hit {
  if (point.x >= page.width - CORNER && point.y <= CORNER) return { kind: 'corner' }
  const thing = thingAt(page, standing, things, point)
  if (thing) return { kind: 'thing', thing }
  const guest = guestAt(page, standing, point, null, true)
  if (guest) return { kind: 'guest', ...guest }
  if (inside(page.wheel, point)) return { kind: 'wheel' }
  if (coach && inside(page.coach, point)) return { kind: 'coach' }
  const edge = edgeAt(page, point, house?.twins)
  if (edge) return { kind: 'edge', ...edge }
  const room = page.rooms.findIndex((layout) => inside(layout.rect, point))
  if (room >= 0) return inRoom(page, room, point, !!house?.twins.includes(room))
  if (inside(page.porter, point)) return { kind: 'porter' }
  if (inside(page.frontDoor, point)) return { kind: 'door' }
  if (inside(page.lobby, point)) return { kind: 'lobby' }
  if (inside(page.bench, point, 6 * page.scale) || inside(page.benchGuest, point)) return { kind: 'bench' }
  if (inside(page.luggage, point)) {
    const u = page.scale, lg = page.luggage
    return point.y <= lg.y + CAGE.h * u && point.x >= lg.x + CAGE.x * u && point.x <= lg.x + (CAGE.x + CAGE.w) * u ? { kind: 'cage' } : { kind: 'luggage' }
  }
  for (const fixture of house?.fixtures ?? []) {
    const bay = fixture.kind === 'boiler' ? page.cellarBays[fixture.col] : undefined
    if (bay && inside(bay, point)) return { kind: 'boiler' }
  }
  if (inside(page.house, point) || inside(page.roof, point) || inside(page.cellar, point) || inside(page.cupboard, point)) return { kind: 'house' }
  if (inside(treeBox(page), point)) return { kind: 'tree' }
  return { kind: 'paper' }
}

/** Where a carried guest would be set down: on another guest, in a room, on a wall or floor, in the lobby, on the bench, or nowhere it can stay. */
export type Drop =
  | { kind: 'guest'; id: GuestId }
  | { kind: 'room'; room: number }
  | { kind: 'edge'; id: string; nearer: number }
  | { kind: 'lobby' }
  | { kind: 'bench' }
  | { kind: 'coach' }
  | { kind: 'cupboard' }
  | { kind: 'nowhere' }

export function dropAt(page: PageLayout, standing: readonly Standing[], point: Point, carried: GuestId, coach = false): Drop {
  const guest = guestAt(page, standing, point, carried)
  if (guest) return { kind: 'guest', id: guest.id }
  if (coach && inside(page.coach, point, 4 * page.scale)) return { kind: 'coach' }
  // A wall or floor takes a guest only when the finger is right on it: a guest set down near a wall goes into the room.
  for (const edge of page.edges) {
    if (!inside(edge.rect, point, 1.5 * page.scale)) continue
    const hit = edgeAt(page, point)
    if (hit) return { kind: 'edge', ...hit }
  }
  const room = page.rooms.findIndex((layout) => inside(layout.rect, point, 3 * page.scale))
  if (room >= 0) return { kind: 'room', room }
  if (inside(page.lobby, point) || inside(page.cupboard, point)) return { kind: 'lobby' }
  if (inside(page.kerb, point)) return { kind: 'bench' }
  return { kind: 'nowhere' }
}

/** The room a carried guest is held over, for the large room of its view, or null. */
export function roomUnder(page: PageLayout, point: Point): number | null {
  const room = page.rooms.findIndex((layout) => inside(layout.rect, point, 6 * page.scale))
  return room >= 0 ? room : null
}

/**
 * Where a carried thing would be set down: with a guest, on a wall or a
 * floor, in a room, back in the cupboard, or nowhere it can stay. A wall or
 * floor is generous to a thing: hanging the quilt on one is what it is for.
 */
export function dropThingAt(page: PageLayout, standing: readonly Standing[], point: Point): Drop {
  const guest = guestAt(page, standing, point)
  if (guest) return { kind: 'guest', id: guest.id }
  const edge = edgeAt(page, point)
  if (edge) return { kind: 'edge', ...edge }
  const room = page.rooms.findIndex((layout) => inside(layout.rect, point, 3 * page.scale))
  if (room >= 0) return { kind: 'room', room }
  if (inside(page.cupboard, point, 6 * page.scale) || inside(page.lobby, point) || inside(page.kerb, point)) return { kind: 'cupboard' }
  return { kind: 'nowhere' }
}
