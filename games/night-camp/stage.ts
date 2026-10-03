import { makeTerrain, type Terrain } from './terrain'
import { ROD_LENGTH, type CamperId, type Supply } from './world'

// Where everything lies on the surface, and what a finger at a point is on.
// Pure geometry, shared by the view (look.ts) and the toy (toy.ts): the view
// draws a thing where the stage says it is, and a touch is read against the
// same numbers, so nothing can be drawn in one place and answer in another.
//
// Everything is in proportion to the surface, which is designed at 1180 by
// 820 and resizes without notice: no pixel geometry is fixed.

/** The seed of the printed map. The sheet is the same on every visit. */
export const MAP_SEED = 1904
/** The map's terrain: one height function, with the stream and its pool. */
export const TERRAIN: Terrain = makeTerrain(MAP_SEED)

export const SUPPLY_LANES: readonly Supply[] = ['logs', 'oil', 'water']

/** Where each tent stands: the direction from the fire, how far away in design pixels, a little lean so nothing lines up, which side of the tent the camper lies on, and the tent's two inks. */
export const CAMP: readonly { who: CamperId; angle: number; away: number; lean: number; side: 1 | -1; light: string; dark: string }[] = [
  { who: 'cook', angle: -1.05, away: 140, lean: 0.12, side: 1, light: '#b3c070', dark: '#8d9a4c' },
  { who: 'reader', angle: -2.5, away: 160, lean: -0.1, side: -1, light: '#9db6cf', dark: '#6283a6' },
  { who: 'sleeper', angle: 2.97, away: 224, lean: 0.08, side: 1, light: '#a9829c', dark: '#7d5470' },
  { who: 'small', angle: 1.78, away: 158, lean: -0.14, side: -1, light: '#86bab3', dark: '#4f8e88' },
  { who: 'scout', angle: 0.5, away: 210, lean: 0.06, side: 1, light: '#e6c067', dark: '#cc9a34' },
]

/** The figures are drawn a little over design size. */
export const FIGURE_SCALE = 1.1

export type Point = { x: number; y: number }

/** Where everything lies, in proportion to the surface. Designed at 1180 by 820. */
export function layout(w: number, h: number) {
  const u = Math.min(w / 1180, h / 820)
  const rodX = w * 0.16, rodLen = w * 0.69
  // The flap's free edge leans a little; its bottom corner (c) has curled over along the line a to b, so the map
  // shows where the corner lay and the corner's printed side lies turned over on the flap (a, b and c mirrored).
  const top = w * 0.874, bottom = w * 0.892, rise = 74 * u
  const a = { x: bottom - ((bottom - top) * rise) / h, y: h - rise }, b = { x: bottom + 62 * u, y: h }
  const along = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / along, ny = (b.x - a.x) / along
  const off = (bottom - a.x) * nx + (h - a.y) * ny
  return {
    w, h, u,
    /** The printed neat line, inset from the edge of the sheet. */
    inset: 15 * u,
    fire: { x: w * 0.34, y: h * 0.325 },
    /** How far the fire's light reaches at its present setting. */
    fireReach: 172 * u,
    /** The lit lantern, standing on its pin, and how far its light reaches. */
    lantern: { x: w * 0.34 + 268 * u, y: h * 0.325 + 22 * u, reach: 122 * u },
    /** The folded-over flap: where its free edge meets the top of the sheet, its outline, and its curled-over corner. */
    flap: { top, shape: [top, 0, w, 0, w, h, b.x, b.y, a.x, a.y], curl: [a.x, a.y, b.x, b.y, bottom - 2 * off * nx, h - 2 * off * ny] },
    compass: { x: w * 0.795, y: h * 0.14, r: 50 * u },
    card: w * 0.058, pile: w * 0.128, rodX, rodLen,
    /** The three rods: logs, oil, water. */
    lanes: [h * 0.662, h * 0.728, h * 0.794],
    ruler: { y: h * 0.892, hour: (rodLen * 0.8) / 8, hours: 8 },
    mule: { x: w * 0.942, y: h * 0.39 },
    sled: { x: w * 0.945, y: h * 0.535 },
  }
}
export type Layout = ReturnType<typeof layout>

/** The length of one piece of a supply along its rod, in surface pixels. */
export function unitLength(place: Layout, supply: Supply): number {
  return place.rodLen / ROD_LENGTH[supply]
}

/** How many units along its rod a point lies, from the pile end. Below zero is over the pile; above the rod's length is past its end. */
export function unitsAt(place: Layout, supply: Supply, x: number): number {
  return (x - place.rodX) / unitLength(place, supply)
}

/** The point on the surface where so many units of a supply end, at the height the row lies. */
export function rowEnd(place: Layout, supply: Supply, units: number): Point {
  return { x: place.rodX + units * unitLength(place, supply), y: place.lanes[SUPPLY_LANES.indexOf(supply)] - 19 * place.u }
}

/** A point of a figure's own frame of design pixels, on the surface: the figure stands at `at`, turned by `turn`. */
function fromFigure(at: Point, turn: number, u: number, x: number, y: number): Point {
  const c = Math.cos(turn), s = Math.sin(turn), k = u * FIGURE_SCALE
  return { x: at.x + (x * c - y * s) * k, y: at.y + (x * s + y * c) * k }
}

/** A tent's centre, and the turn that points its door at the fire. */
export function tentAt(place: Layout, who: CamperId): { at: Point; turn: number } {
  const camp = CAMP.find((one) => one.who === who)!
  return {
    at: { x: place.fire.x + Math.cos(camp.angle) * camp.away * place.u, y: place.fire.y + Math.sin(camp.angle) * camp.away * place.u },
    turn: camp.angle + Math.PI + camp.lean,
  }
}

/** Where a camper lies beside the tent: the origin of the camper's own frame (the head is just above it, the feet below), and the frame's turn. */
export function camperAt(place: Layout, who: CamperId): { at: Point; turn: number; head: Point; middle: Point } {
  const camp = CAMP.find((one) => one.who === who)!, tent = tentAt(place, who), big = who === 'sleeper'
  const at = fromFigure(tent.at, tent.turn, place.u, big ? -44 : -26, camp.side * (big ? 34 : 33)), turn = tent.turn - Math.PI / 2
  return { at, turn, head: fromFigure(at, turn, place.u, 0, big ? 6 : -3), middle: fromFigure(at, turn, place.u, 0, big ? 42 : 26) }
}

/** The tent's own centre on the surface, where it is drawn: beside the camper, off the line from the fire. */
export function tentMiddle(place: Layout, who: CamperId): Point {
  const camp = CAMP.find((one) => one.who === who)!, tent = tentAt(place, who)
  return fromFigure(tent.at, tent.turn, place.u, 0, -camp.side * (who === 'sleeper' ? 32 : 23))
}

/** Where the dog lies when nothing calls it, and the turn that points its nose at the small one. */
export function dogHome(place: Layout): { at: Point; turn: number } {
  return { at: { x: place.fire.x + 52 * place.u, y: place.fire.y + 150 * place.u }, turn: -2.5 }
}
export function kettleAt(place: Layout): Point {
  return { x: place.fire.x + 70 * place.u, y: place.fire.y - 42 * place.u }
}
/** The frog sits on the rim of the pool. */
export function frogAt(place: Layout): Point {
  const pool = TERRAIN.pool
  return { x: (pool.x - pool.rx * 0.5) * place.w, y: (pool.y - pool.ry * 0.62) * place.h }
}
export function poolAt(place: Layout): Point {
  return { x: TERRAIN.pool.x * place.w, y: TERRAIN.pool.y * place.h }
}

/** Everything a finger can be on. */
export type Target =
  | { kind: 'pile'; supply: Supply }
  /** On a rod's lane, with how many units along it the finger is. */
  | { kind: 'rod'; supply: Supply; units: number }
  | { kind: 'camper'; who: CamperId }
  | { kind: 'tent'; who: CamperId }
  | { kind: 'dog' | 'frog' | 'mule' | 'kettle' | 'fire' | 'compass' }

/** The least half-width of anything that answers a touch: 48 pixels across at any size of surface. */
const LEAST = 24
const near = (p: Point, q: Point, r: number) => Math.hypot(p.x - q.x, p.y - q.y) <= Math.max(LEAST, r)

/**
 * What a finger at a point is on, or nothing. `dog` is where the dog is now,
 * since it walks. The top right corner is the grown-up's, and nothing that
 * answers lies there. Small things are asked before the large things they
 * lie on or near.
 */
export function targetAt(place: Layout, p: Point, dog: Point = dogHome(place).at): Target | null {
  const u = place.u
  for (let i = 0; i < SUPPLY_LANES.length; i++) {
    const y = place.lanes[i], supply = SUPPLY_LANES[i]
    // A lane is its row, its rod and the gap up to the next: the lanes touch, so a finger between two is on one.
    if (p.y < y - 40 * u || p.y >= y + 14 * u) continue
    if (Math.abs(p.x - place.pile) <= Math.max(LEAST, 33 * u)) return { kind: 'pile', supply }
    if (p.x > place.pile && p.x < place.flap.top) return { kind: 'rod', supply, units: unitsAt(place, supply, p.x) }
  }
  if (near(p, dog, 24 * u)) return { kind: 'dog' }
  if (near(p, frogAt(place), 20 * u)) return { kind: 'frog' }
  if (near(p, kettleAt(place), 20 * u)) return { kind: 'kettle' }
  if (near(p, place.fire, 34 * u)) return { kind: 'fire' }
  if (near(p, place.compass, place.compass.r)) return { kind: 'compass' }
  if (near(p, { x: place.mule.x - 8 * u, y: place.mule.y - 6 * u }, 56 * u)) return { kind: 'mule' }
  for (const camp of CAMP) {
    const camper = camperAt(place, camp.who)
    if (near(p, camper.head, 20 * u) || near(p, camper.middle, camp.who === 'sleeper' ? 40 * u : 26 * u)) return { kind: 'camper', who: camp.who }
  }
  for (const camp of CAMP) if (near(p, tentMiddle(place, camp.who), 34 * u)) return { kind: 'tent', who: camp.who }
  return null
}

/** The places that answer a touch, for the checks on the size and the spacing of targets. */
export function targetSpots(place: Layout): { name: string; at: Point; radius: number }[] {
  const u = place.u, spots: { name: string; at: Point; radius: number }[] = []
  SUPPLY_LANES.forEach((supply, i) => spots.push({ name: `pile ${supply}`, at: { x: place.pile, y: place.lanes[i] - 13 * u }, radius: Math.max(LEAST, 27 * u) }))
  spots.push({ name: 'dog', at: dogHome(place).at, radius: Math.max(LEAST, 24 * u) }, { name: 'frog', at: frogAt(place), radius: Math.max(LEAST, 20 * u) })
  spots.push({ name: 'kettle', at: kettleAt(place), radius: Math.max(LEAST, 20 * u) }, { name: 'fire', at: place.fire, radius: Math.max(LEAST, 34 * u) })
  spots.push({ name: 'compass', at: place.compass, radius: Math.max(LEAST, place.compass.r) }, { name: 'mule', at: { x: place.mule.x - 8 * u, y: place.mule.y - 6 * u }, radius: Math.max(LEAST, 56 * u) })
  for (const camp of CAMP) spots.push({ name: `camper ${camp.who}`, at: camperAt(place, camp.who).middle, radius: Math.max(LEAST, 26 * u) }, { name: `tent ${camp.who}`, at: tentMiddle(place, camp.who), radius: Math.max(LEAST, 34 * u) })
  return spots
}
