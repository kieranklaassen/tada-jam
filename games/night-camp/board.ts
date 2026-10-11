import { DOG_HOME, FIGURE_SCALE, KETTLE, LAMP_HIGH, LAMP_LOW, REACH, TIN, camperSpot, pinSpots, tentMiddle, tentSpot, type Spot } from './ground'
import { makeTerrain, type Terrain } from './terrain'
import { PLACES, ROD_LENGTH, SECTION_HOURS, SUPPLY_OF, nightHours, sectionsAt, usersAt, type CamperId, type Ring, type Site, type Supply, type User } from './world'

// The board: where everything of one site lies on the surface, and what a
// finger at a point is on. Pure geometry, shared by the view and the game:
// the view draws a thing where the board says it is, and a touch is read
// against the same numbers, so nothing is drawn in one place and answers in
// another. The camp's own plan comes from ground.ts in design pixels and is
// scaled here; the kit along the bottom is laid out in proportion to the
// surface, which is designed at 1180 by 820 and resizes without notice.

/** The seed of the printed map. The sheet is the same on every visit. */
export const MAP_SEED = 1904
export const TERRAIN: Terrain = makeTerrain(MAP_SEED)
export const SUPPLY_LANES: readonly Supply[] = ['logs', 'oil', 'water']
export const USER_ROWS: readonly User[] = ['fire', 'lantern', 'kettle']
/** The most hours the ruler ever shows: the longest night with both extra sections unfolded. */
export const RULER_MOST = 16

export type Point = { x: number; y: number }
export type BoardCamper = { who: CamperId; ring: Ring; tent: { at: Point; turn: number }; tentMiddle: Point; at: Point; turn: number; head: Point; middle: Point }

export type Board = {
  w: number; h: number
  /** The size of one design pixel on this surface. */
  u: number
  site: Site
  /** The night's length as the ruler now lies, and how many extra sections are unfolded of how many there are. */
  hours: number; unfolded: number; sections: number
  inset: number
  fire: Point
  /** How far the fire's circle reaches at each setting of its dial, in surface pixels. */
  reach: number[]
  campers: BoardCamper[]
  kettle: Point | null
  tin: Point
  dog: { at: Point; turn: number }
  frog: Point; pool: Point
  /** Where each lantern pin stands, and how far a lantern throws its light on the low wick and the high. */
  pins: Point[]; lampLow: number; lampHigh: number
  compass: { x: number; y: number; r: number }
  flap: { top: number; shape: number[]; curl: number[] }
  /** The corner of the folded edge, which is pulled to turn to the next site. */
  corner: Point
  mule: Point
  /** The sled's bed, seen from above on the folded edge: its front, the length of one place, and how many places it has. None at a site without a sled. */
  sled: { x: number; top: number; place: number; places: number; width: number } | null
  /** The kit along the bottom: the amount cards, the piles, the rods (only those the site has), the ruler and what lies under it. */
  card: number; pile: number; rodX: number; rodLen: number; lanes: number[]; rods: Supply[]
  ruler: { x: number; y: number; hour: number; thick: number }
  /** The rows of ash and of pencil strips under the ruler: the top of the first row, and the height of a row. One row a user. */
  ash: { y: number; row: number }
  strips: { y: number; row: number }
  /** The strip of bare map between the camp and the rows, where the dog walks. */
  walkway: number
}

const onto = (fire: Point, u: number, spot: Spot): Point => ({ x: fire.x + spot.x * u, y: fire.y + spot.y * u })

/** The board of a site on a surface of this size, with so many sections of the ruler unfolded. */
export function boardFor(w: number, h: number, site: Site, unfolded = 0): Board {
  const u = Math.min(w / 1180, h / 820), fire = { x: w * 0.34, y: h * 0.305 }
  const rodX = w * 0.16, rodLen = w * 0.655, lanes = [h * 0.652, h * 0.713, h * 0.774], rulerY = h * 0.845
  // The flap's free edge leans a little; its bottom corner has curled over along the line a to b.
  const top = w * 0.874, bottom = w * 0.892, rise = 74 * u
  const a = { x: bottom - ((bottom - top) * rise) / h, y: h - rise }, b = { x: bottom + 62 * u, y: h }
  const along = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / along, ny = (b.x - a.x) / along
  const off = (bottom - a.x) * nx + (h - a.y) * ny
  const pool = TERRAIN.pool, users = usersAt(site)
  const campers = site.tents.map((tent): BoardCamper => {
    const pitched = tentSpot(tent.camper, tent.ring), lying = camperSpot(tent.camper, tent.ring)
    return {
      who: tent.camper, ring: tent.ring, tent: { at: onto(fire, u, pitched.at), turn: pitched.turn }, tentMiddle: onto(fire, u, tentMiddle(tent.camper, tent.ring)),
      at: onto(fire, u, lying.at), turn: lying.turn, head: onto(fire, u, lying.head), middle: onto(fire, u, lying.middle),
    }
  })
  return {
    w, h, u, site, hours: nightHours(site, unfolded), unfolded: Math.max(0, Math.min(sectionsAt(site), Math.round(unfolded) || 0)), sections: sectionsAt(site),
    inset: 15 * u, fire, reach: site.fire.map((setting) => REACH[setting.reach] * u), campers,
    kettle: site.kettle ? onto(fire, u, KETTLE) : null, tin: onto(fire, u, TIN), dog: { at: onto(fire, u, DOG_HOME), turn: Math.PI },
    frog: { x: (pool.x - pool.rx * 0.5) * w, y: (pool.y - pool.ry * 0.62) * h }, pool: { x: pool.x * w, y: pool.y * h },
    pins: pinSpots(site).map((spot) => onto(fire, u, spot)), lampLow: LAMP_LOW * u, lampHigh: LAMP_HIGH * u,
    compass: { x: w * 0.795, y: h * 0.14, r: 50 * u },
    flap: { top, shape: [top, 0, w, 0, w, h, b.x, b.y, a.x, a.y], curl: [a.x, a.y, b.x, b.y, bottom - 2 * off * nx, h - 2 * off * ny] },
    corner: { x: (a.x + b.x) / 2 + 14 * u, y: (a.y + b.y) / 2 + 6 * u },
    // The mule stands below the corner that is kept for the grown-up, however small the surface.
    mule: { x: w * 0.945, y: Math.max(h * 0.17, 74 + Math.max(24, 50 * u)) },
    // A site with a sled has its bed; a site whose load is given has a bed just as long as that load, strapped on.
    sled: site.sled === null && site.given === null ? null : { x: w * 0.945, top: h * 0.3, place: (h * 0.52) / 60, places: site.sled ?? SUPPLY_LANES.reduce((sum, supply) => sum + (site.given?.[supply] ?? 0) * PLACES[supply], 0), width: 46 * u },
    card: w * 0.058, pile: w * 0.128, rodX, rodLen, lanes, rods: SUPPLY_LANES.filter((supply) => users.some((user) => SUPPLY_OF[user] === supply)),
    ruler: { x: rodX, y: rulerY, hour: rodLen / RULER_MOST, thick: 17 * u },
    ash: { y: rulerY + 20 * u, row: 9 * u },
    strips: { y: rulerY + 49 * u, row: 19 * u },
    walkway: lanes[0] - 50 * u,
  }
}

/** The length of one piece of a supply along its rod, in surface pixels. */
export function unitLength(board: Board, supply: Supply): number {
  return board.rodLen / ROD_LENGTH[supply]
}
/** How many units along its rod a point lies, from the pile end. */
export function unitsAt(board: Board, supply: Supply, x: number): number {
  return (x - board.rodX) / unitLength(board, supply)
}
/** The point on the surface where so many units of a supply end, at the height the row lies. */
export function rowEnd(board: Board, supply: Supply, units: number): Point {
  return { x: board.rodX + units * unitLength(board, supply), y: board.lanes[SUPPLY_LANES.indexOf(supply)] - 19 * board.u }
}
/** Where on the ruler an hour of the night lies, and which hour a point is over. */
export function hourX(board: Board, hour: number): number {
  return board.ruler.x + hour * board.ruler.hour
}
export function hourAt(board: Board, x: number): number {
  return (x - board.ruler.x) / board.ruler.hour
}
/** Where a user's amount card lies when it is at home: beside its supply's pile. */
export function cardHome(board: Board, user: User): Point {
  return { x: board.card, y: board.lanes[SUPPLY_LANES.indexOf(SUPPLY_OF[user])] - 12 * board.u }
}
/** The handle that unfolds one more section of the ruler, at its far end; and the one that folds the last back. */
export function sectionHandle(board: Board): Point {
  // Far enough past the end that the cursor, standing at dawn, does not cover it.
  return { x: hourX(board, board.hours) + 46 * board.u, y: board.ruler.y }
}
/** How many places a load takes on the sled, and where along its bed a place lies. */
export function loadPlaces(rows: Record<Supply, number>): number {
  return SUPPLY_LANES.reduce((sum, supply) => sum + rows[supply] * PLACES[supply], 0)
}
export function placeY(board: Board, place: number): number {
  return board.sled ? board.sled.top + place * board.sled.place : 0
}
/** The cell of the coarse grid over the map that a point lies in, for the marshmallow trail, or -1 off the map. */
export const TRAIL_COLS = 16
export const TRAIL_ROWS = 11
export function trailCell(board: Board, p: Point): number {
  const right = board.flap.top - board.inset, bottom = board.walkway - 24 * board.u
  if (p.x < board.inset || p.x >= right || p.y < board.inset || p.y >= bottom) return -1
  return Math.floor(((p.y - board.inset) / (bottom - board.inset)) * TRAIL_ROWS) * TRAIL_COLS + Math.floor(((p.x - board.inset) / (right - board.inset)) * TRAIL_COLS)
}
export function trailPoint(board: Board, cell: number): Point {
  const right = board.flap.top - board.inset, bottom = board.walkway - 24 * board.u
  return { x: board.inset + (((cell % TRAIL_COLS) + 0.5) / TRAIL_COLS) * (right - board.inset), y: board.inset + ((Math.floor(cell / TRAIL_COLS) + 0.5) / TRAIL_ROWS) * (bottom - board.inset) }
}

/**
 * The shell draws one round home control over the game in the middle of the top edge: so many pixels across and so
 * far down from the edge, at any size of surface. A touch on it goes home and never reaches the game.
 */
export const HOME_CONTROL = { size: 48, top: 10 } as const
/** Whether a thing a finger would press at a point, the least size anything that answers has, lies under the home control in any part. */
export function underHomeControl(board: Board, p: Point): boolean {
  return Math.hypot(p.x - board.w / 2, p.y - (HOME_CONTROL.top + HOME_CONTROL.size / 2)) < HOME_CONTROL.size / 2 + LEAST
}

/** The dog's way from where it lies to a row's end: straight down to the walkway, then along it. */
export function dogPath(board: Board, supply: Supply, units: number): Point[] {
  return [board.dog.at, { x: board.dog.at.x, y: board.walkway }, { x: rowEnd(board, supply, units).x, y: board.walkway }]
}

/** Everything a finger can be on. */
export type Target =
  | { kind: 'pile'; supply: Supply }
  /** On a rod's lane: how many units along it, and whether up on the row or down on the rod itself. */
  | { kind: 'rod'; supply: Supply; units: number; onRow: boolean }
  | { kind: 'card'; user: User }
  /** The cursor on the ruler, the ruler itself with the hour under the finger, and the handle that unfolds or folds a section. */
  | { kind: 'cursor' }
  | { kind: 'ruler'; hour: number }
  | { kind: 'section'; unfold: boolean }
  | { kind: 'dial' }
  | { kind: 'lantern'; index: number }
  | { kind: 'pin'; index: number }
  | { kind: 'camper'; who: CamperId }
  | { kind: 'tent'; who: CamperId }
  | { kind: 'marshmallow'; cell: number }
  | { kind: 'dog' | 'frog' | 'mule' | 'fire' | 'compass' | 'tin' | 'corner' }

/** Where the things that move are now, for a touch to be read against. */
export type Live = { dog: Point; cursorHour: number; lanterns: readonly Point[]; trail: readonly number[] }

/** The least half-width of anything that answers a touch: 48 pixels across at any size of surface. */
const LEAST = 24
const near = (p: Point, q: Point, r: number) => Math.hypot(p.x - q.x, p.y - q.y) <= Math.max(LEAST, r)

/**
 * What a finger at a point is on, or nothing. Small things are asked before
 * the large things they lie on or near, and the kit before the map. The top
 * right corner is the grown-up's, and nothing that answers lies there.
 */
export function targetAt(board: Board, p: Point, live: Live): Target | null {
  const u = board.u
  // The top right corner is the grown-up's: three quick taps there bring up the overlay, and nothing of the game answers.
  if (p.x >= board.w - 72 && p.y <= 72) return null
  if (near(p, { x: hourX(board, live.cursorHour), y: board.ruler.y - 12 * u }, 30 * u)) return { kind: 'cursor' }
  if (board.sections > 0) {
    const handle = sectionHandle(board)
    if (near(p, handle, 26 * u)) return { kind: 'section', unfold: board.unfolded < board.sections }
    // The last unfolded section folds back from its own far half.
    if (board.unfolded > 0 && Math.abs(p.y - board.ruler.y) <= Math.max(LEAST, board.ruler.thick) && p.x > hourX(board, board.hours - SECTION_HOURS / 2) && p.x <= hourX(board, board.hours)) return { kind: 'section', unfold: false }
  }
  if (Math.abs(p.y - board.ruler.y) <= Math.max(LEAST, board.ruler.thick + 4 * u) && p.x >= board.ruler.x - 10 * u && p.x <= hourX(board, board.hours) + 6 * u) return { kind: 'ruler', hour: hourAt(board, p.x) }
  for (let i = 0; i < SUPPLY_LANES.length; i++) {
    const y = board.lanes[i], supply = SUPPLY_LANES[i]
    if (!board.rods.includes(supply) || p.y < y - 37 * u || p.y >= y + 13 * u) continue
    if (Math.abs(p.x - board.card) <= Math.max(LEAST, 43 * u)) return { kind: 'card', user: USER_ROWS[i] }
    if (Math.abs(p.x - board.pile) <= Math.max(LEAST, 33 * u)) return { kind: 'pile', supply }
    if (p.x > board.pile && p.x < board.flap.top) return { kind: 'rod', supply, units: unitsAt(board, supply, p.x), onRow: p.y < y - 7 * u }
  }
  if (near(p, board.corner, 40 * u)) return { kind: 'corner' }
  for (let i = 0; i < live.lanterns.length; i++) if (near(p, live.lanterns[i], 30 * u)) return { kind: 'lantern', index: i }
  for (let i = 0; i < board.pins.length; i++) if (near(p, board.pins[i], 20 * u)) return { kind: 'pin', index: i }
  if (near(p, board.tin, 24 * u)) return { kind: 'tin' }
  for (const cell of live.trail) if (near(p, trailPoint(board, cell), 14 * u)) return { kind: 'marshmallow', cell }
  if (near(p, live.dog, 24 * u)) return { kind: 'dog' }
  if (near(p, board.frog, 20 * u)) return { kind: 'frog' }
  // The kettle stands on the fire's ring of stones and answers with it: it is too small to be a target of its own.
  const fromFire = Math.hypot(p.x - board.fire.x, p.y - board.fire.y)
  const hearth = Math.max(LEAST, 36 * u)
  if (fromFire <= hearth) return { kind: 'fire' }
  if (fromFire <= Math.max(hearth + 16, 62 * u)) return { kind: 'dial' }
  if (near(p, board.compass, board.compass.r)) return { kind: 'compass' }
  if (near(p, board.mule, 50 * u)) return { kind: 'mule' }
  for (const camper of board.campers) if (near(p, camper.head, 20 * u) || near(p, camper.middle, camper.who === 'sleeper' ? 38 * u : 26 * u)) return { kind: 'camper', who: camper.who }
  for (const camper of board.campers) if (near(p, camper.tentMiddle, 34 * u)) return { kind: 'tent', who: camper.who }
  return null
}

/** The places that answer a touch on a board at rest, for the checks on the size and the finding of targets. */
export function targetSpots(board: Board): { name: string; at: Point; radius: number }[] {
  const u = board.u, spots: { name: string; at: Point; radius: number }[] = []
  const big = (r: number) => Math.max(LEAST, r)
  for (const supply of board.rods) {
    const y = board.lanes[SUPPLY_LANES.indexOf(supply)]
    spots.push({ name: `pile ${supply}`, at: { x: board.pile, y: y - 12 * u }, radius: big(27 * u) }, { name: `card ${USER_ROWS[SUPPLY_LANES.indexOf(supply)]}`, at: { x: board.card, y: y - 12 * u }, radius: big(25 * u) })
  }
  spots.push({ name: 'cursor', at: { x: hourX(board, 0), y: board.ruler.y - 12 * u }, radius: big(30 * u) })
  if (board.sections > 0) spots.push({ name: 'section', at: sectionHandle(board), radius: big(26 * u) })
  spots.push({ name: 'corner', at: board.corner, radius: big(40 * u) }, { name: 'tin', at: board.tin, radius: big(24 * u) }, { name: 'dog', at: board.dog.at, radius: big(24 * u) })
  spots.push({ name: 'frog', at: board.frog, radius: big(20 * u) }, { name: 'fire', at: board.fire, radius: big(36 * u) }, { name: 'dial', at: { x: board.fire.x - Math.max(LEAST + 8, 50 * u), y: board.fire.y }, radius: 12 * u })
  spots.push({ name: 'compass', at: board.compass, radius: big(board.compass.r) }, { name: 'mule', at: board.mule, radius: big(50 * u) })
  for (const camper of board.campers) spots.push({ name: `camper ${camper.who}`, at: camper.middle, radius: big(26 * u) }, { name: `tent ${camper.who}`, at: camper.tentMiddle, radius: big(34 * u) })
  board.pins.forEach((at, index) => spots.push({ name: `pin ${index}`, at, radius: big(20 * u) }))
  return spots
}

/** The point of the stream nearest a place, on the surface. */
export function streamPoint(board: Board, from: Point): Point {
  let best: Point = board.pool, least = Infinity
  for (const p of TERRAIN.stream) {
    const at = { x: p.x * board.w, y: p.y * board.h }, away = Math.hypot(at.x - from.x, at.y - from.y)
    // Only the stream as it crosses the map: not under the folded edge, and not down among the rods.
    if (at.x < board.flap.top - 30 * board.u && at.y < board.walkway - 20 * board.u && at.y > board.inset + 20 * board.u && away < least) { least = away; best = at }
  }
  return best
}

export { FIGURE_SCALE }
