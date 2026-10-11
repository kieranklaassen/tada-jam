// Where everything on the page goes, in logical pixels. Pure arithmetic: no
// renderer, no DOM. The one module that holds the page's geometry.
//
// The page is a framed plate. On it, from the left: the hotel as a cut-away
// front (the roof with the wheel on its ridge, the rooms, and under them a
// band of foundations in which the boiler stands under its column), then, at
// the height of the ground floor, the lobby with the front door at its far
// end, the cupboard in a loft over it, and under the lobby the street, where
// the coach and the bench wait. The drawing is laid out in its own units, scaled
// to fit the surface with its aspect kept, and centred.

import { SHAPES, edgesOf, outerEdgesOf, type ShapeId } from './hotel'

export type Rect = { x: number; y: number; w: number; h: number }

export type RoomLayout = {
  /** The inside of the room, between its walls, floor and ceiling. */
  rect: Rect
  floor: number
  col: number
  /** The bed stands against this wall; the door is in the back wall toward the other. */
  bedSide: 'left' | 'right'
  bed: Rect
  door: Rect
  /** Where a guest who is up stands when it has the room to itself: the middle of its feet. Two who share a room for two have a half each (`sharedSpot` in inkPlaces.ts). */
  stand: { x: number; y: number }
}

export type EdgeLayout = { id: string; kind: 'wall' | 'floor'; a: number; b: number; rect: Rect }

export type PageLayout = {
  width: number
  height: number
  shape: ShapeId
  /** Logical pixels to one unit of the drawing. Line weights and figures scale by it. */
  scale: number
  /** The plate: everything drawn lies inside it. */
  plate: Rect
  /** The outside of the block of rooms, walls included. */
  house: Rect
  rooms: RoomLayout[]
  edges: EdgeLayout[]
  /** The roof, from the eaves to the ridge. `roofInset` is how far each end of the ridge stands in from the eaves. */
  roof: Rect
  roofInset: number
  /** The square the day-and-night wheel turns in. */
  wheel: Rect
  chimney: Rect
  /** For each column, the part of the roof right over it, where a snow hole opens. */
  roofBays: Rect[]
  /** The band of foundations under the rooms, and the bay of it under each column, where a boiler stands. */
  cellar: Rect
  cellarBays: Rect[]
  /** The lobby: its inside, level with the ground floor. The cupboard is the loft on top of it. */
  lobby: Rect
  /** The lean-to roof over the cupboard. */
  canopy: Rect
  frontDoor: Rect
  cupboard: Rect
  /** One slot of the cupboard for each of the five things, in the order quilt, pipe, stove, ice box, clock. */
  slots: Rect[]
  /** Where the porter stands with the trolley. */
  porter: Rect
  /** Standing places in the lobby, as the middle of a guest's feet, from the house outward. */
  lobbySpots: { x: number; y: number }[]
  /** The street under the lobby, down to the kerb line the coach stands on. */
  kerb: Rect
  /** The steps from the front door down to the street. */
  steps: Rect
  coach: Rect
  coachDoor: Rect
  bench: Rect
  /** Where the guest on the bench sits: the box it is drawn in. */
  benchGuest: Rect
  luggage: Rect
  /** How tall a standing guest is drawn. */
  guest: number
}

/** A finger needs this much of anything it can touch, in logical pixels. */
export const TOUCH = 48

/** The home control the shell lays over the game: round, this many logical pixels across, in the middle of the top edge. `clear` is the room a finger is left beside it. */
export const HOME = { size: 48, clear: 6 }

// The drawing's own units. One unit is one logical pixel on a 1180 by 820 surface showing the long house.
const U = {
  wall: 10, slab: 12, roomW: 204, roomH: 200,
  padLeft: 24, padRight: 20, padTop: 10, padBottom: 12,
  wheel: 84, wheelRise: 66, roof: 100, roofInset: 78,
  cellar: 132, lobbyW: 500, lobbyMax: 640, aspect: 1.45, canopy: 24,
  slot: 78, guest: 124,
  coachW: 216, coachH: 118, benchW: 96, steps: 40,
}

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

/** The page for a surface of this size showing a house of this shape. */
export function layoutPage(width: number, height: number, shape: ShapeId): PageLayout {
  const { floors, cols } = SHAPES[shape]
  const houseW = U.wall + cols * (U.roomW + U.wall)
  const houseH = U.slab + floors * (U.roomH + U.slab)
  const plateH = U.padTop + U.wheelRise + U.roof + houseH + U.cellar + U.padBottom
  // A narrow house leaves the page room to spare beside it, and the lobby takes it, up to a point.
  const lobbyOuter = Math.min(U.lobbyMax, Math.max(U.lobbyW, plateH * U.aspect - U.padLeft - houseW - U.padRight))
  const plateW = U.padLeft + houseW + lobbyOuter + U.padRight
  const margin = Math.max(8, Math.min(width, height) * 0.015)
  const s = Math.max(0.05, Math.min((width - 2 * margin) / plateW, (height - 2 * margin) / plateH))
  const ox = (width - plateW * s) / 2, oy = (height - plateH * s) / 2
  /** A rectangle given in the drawing's units, on the page. */
  const at = (x: number, y: number, w: number, h: number): Rect => rect(ox + x * s, oy + y * s, w * s, h * s)

  const houseX = U.padLeft, roofY = U.padTop + U.wheelRise, houseY = roofY + U.roof
  const house = at(houseX, houseY, houseW, houseH)
  const roomX = (col: number) => houseX + U.wall + col * (U.roomW + U.wall)
  // Floor 0 is on the ground, so it is the lowest row on the page.
  const roomY = (floor: number) => houseY + U.slab + (floors - 1 - floor) * (U.roomH + U.slab)

  const rooms: RoomLayout[] = []
  for (let floor = 0; floor < floors; floor++) {
    for (let col = 0; col < cols; col++) {
      const x = roomX(col), y = roomY(floor), ground = y + U.roomH
      // Beds alternate by column, so two sleepers on either side of one wall lie head to head against it.
      const bedSide = col % 2 === 0 ? 'right' : 'left'
      const bedW = 100, bedH = 86
      const bedX = bedSide === 'right' ? x + U.roomW - bedW - 3 : x + 3
      const doorX = bedSide === 'right' ? x + 20 : x + U.roomW - 20 - 56
      const standX = bedSide === 'right' ? x + 56 : x + U.roomW - 56
      rooms.push({
        rect: at(x, y, U.roomW, U.roomH), floor, col, bedSide,
        bed: at(bedX, ground - bedH, bedW, bedH),
        door: at(doorX, ground - 128, 56, 128),
        stand: { x: ox + standX * s, y: oy + (ground - 3) * s },
      })
    }
  }

  const edges: EdgeLayout[] = edgesOf(shape).map((edge) => {
    const a = rooms[edge.a]!.rect, b = rooms[edge.b]!.rect
    // A wall stands between a and the room to its right; a floor lies between a and the room over it.
    const r = edge.kind === 'wall' ? rect(a.x + a.w, a.y, b.x - a.x - a.w, a.h) : rect(a.x, b.y + b.h, a.w, a.y - b.y - b.h)
    return { id: edge.id, kind: edge.kind, a: edge.a, b: edge.b, rect: r }
  })
  // The outer sides of the house: the slab under each ground room and over each top room, and the outer wall at either end of each floor.
  for (const edge of outerEdgesOf(shape)) {
    const a = rooms[edge.a]!.rect, side = edge.id.slice(0, edge.id.indexOf('-'))
    const r = side === 'under' ? rect(a.x, a.y + a.h, a.w, U.slab * s) : side === 'over' ? rect(a.x, a.y - U.slab * s, a.w, U.slab * s) : side === 'left' ? rect(a.x - U.wall * s, a.y, U.wall * s, a.h) : rect(a.x + a.w, a.y, U.wall * s, a.h)
    edges.push({ id: edge.id, kind: edge.kind, a: edge.a, b: edge.b, rect: r })
  }

  const cellarY = houseY + houseH
  const roofBays: Rect[] = [], cellarBays: Rect[] = []
  for (let col = 0; col < cols; col++) {
    roofBays.push(at(roomX(col), roofY, U.roomW, U.roof))
    cellarBays.push(at(roomX(col), cellarY, U.roomW, U.cellar - 8))
  }

  // The lobby is level with the ground floor, and the street lies under it, at the height of the cellar.
  const lobbyX = houseX + houseW, lobbyY = roomY(0), lobbyW = lobbyOuter - 4, floorY = lobbyY + U.roomH
  const lobby = at(lobbyX, lobbyY, lobbyW, U.roomH)
  // The cupboard is a loft over the lobby, so that guests waiting below never stand in front of the things.
  // What can be touched keeps a finger's width however small the page is drawn, so its slots are laid out on
  // the page itself; on a surface too small for five fingers in a row they take what there is.
  const pad = 6 * s, pitch = lobby.w / 5
  const slot = Math.min(Math.max(TOUCH + 2, U.slot * s), pitch - 2 * s)
  const cupboard = rect(lobby.x, lobby.y - U.slab * s - slot - 2 * pad, lobby.w, slot + 2 * pad)
  const slots: Rect[] = []
  for (let i = 0; i < 5; i++) slots.push(rect(lobby.x + pitch * (i + 0.5) - slot / 2, cupboard.y + pad, slot, slot))
  const frontDoor = at(lobbyX + lobbyW - 62, floorY - 124, 52, 124)
  const porter = at(lobbyX + 8, floorY - 104, 116, 104)
  const lobbySpots: { x: number; y: number }[] = []
  // The queue starts in front of the porter, who stands at the back of the lobby, and runs to the front door: in the
  // long house's narrow lobby five guests still stand apart enough to be told and touched.
  // In a wide lobby the queue starts clear of the porter; in a narrow one it closes up toward him, never nearer the
  // house wall than a figure's half width.
  const lastSpot = lobbyX + lobbyW - 118
  const firstSpot = lobbyX + Math.max(112, Math.min(176, lobbyW - 118 - 4 * 86))
  // Five places: the most guests a coach brings. In a narrow lobby they stand close, like a queue.
  for (let i = 0; i < 5; i++) lobbySpots.push({ x: ox + (firstSpot + (i * (lastSpot - firstSpot)) / 4) * s, y: oy + (floorY - 3) * s })
  // A sixth, just inside the front door, for the guest from the bench when a coach-load of five still waits: it has come in last and stands nearest the door, where a finger can still take it.
  lobbySpots.push({ x: ox + (lobbyX + lobbyW - 58) * s, y: oy + (floorY - 3) * s })

  const streetY = floorY + U.slab, groundY = cellarY + U.cellar - 6
  const kerb = at(lobbyX, streetY, lobbyW, groundY - streetY)
  const steps = at(lobbyX + lobbyW - U.steps, streetY, U.steps, groundY - streetY)
  const coachX = lobbyX + lobbyW - U.steps - 6 - U.coachW
  const coach = at(coachX, groundY - U.coachH, U.coachW, U.coachH)
  const doorW = Math.max((TOUCH + 2) / s, 52), doorH = Math.max((TOUCH + 2) / s, 76)
  const coachDoor = at(coachX + 74, groundY - 22 - doorH, doorW, doorH)
  // The shell lays one round home control over the top centre of the surface (HOME), and a touch on it never
  // reaches the game. On the plain page only sky is under it. The bat's page is the plate turned half round about
  // its middle, which brings the street to the top and, in the two narrow houses, the bench to the middle of it. So
  // the bench and its luggage stand far enough toward the coach that whoever sits there is clear of the control on
  // that page too: a finger takes the bench guest from 16 units left of its box (`spotOf` and `bodyBox` in
  // inkPlaces.ts). The luggage, which nobody has to touch, is what the control lies over there. In the long house
  // the bench is clear where it stands.
  const benchShift = Math.max(0, Math.min(coachX - 8 - (lobbyX + 176), plateW / 2 + (HOME.size / 2 + HOME.clear) / s - (lobbyX + 64 - 16)))
  const bench = at(lobbyX + 62 + benchShift, groundY - 64, U.benchW, 64)
  const benchGuest = at(lobbyX + 64 + benchShift, groundY - 126, 112, 126)
  const luggage = at(lobbyX + 2 + benchShift, groundY - 108, 62, 108)

  const wheelSize = Math.max((TOUCH + 2) / s, U.wheel)
  const ridgeX = houseX + houseW / 2
  return {
    width, height, shape, scale: s,
    plate: at(0, 0, plateW, plateH),
    house, rooms, edges,
    roof: at(houseX - 6, roofY, houseW + 12, U.roof),
    roofInset: U.roofInset * s,
    wheel: at(ridgeX - wheelSize / 2, roofY - U.wheelRise + 4, wheelSize, wheelSize),
    chimney: at(houseX + 30, roofY - 34, 34, 80),
    roofBays,
    cellar: at(houseX, cellarY, houseW, U.cellar),
    cellarBays,
    lobby,
    canopy: rect(lobby.x, cupboard.y - U.canopy * s, lobby.w + 4 * s, U.canopy * s),
    frontDoor, cupboard, slots, porter, lobbySpots,
    kerb, steps, coach, coachDoor, bench, benchGuest, luggage,
    guest: U.guest * s,
  }
}
