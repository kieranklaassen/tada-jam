import { COLS, ROWS } from './layout'
import { BLUE, middle, topAt, type Kind, type Shape, type Sheet } from './wool'

// The weather, with no drawing in it and nothing of its own to save: every
// answer here is read from the wool on the sheet. A cloud rains on what lies
// under it, a sun dries the rain within its reach, a bow stands where a sun
// dries rain across bare felt, and a figure's place is what the wool under
// and round its feet makes it. On load the same wool gives the same weather,
// already under way.

/** How far a sun dries, in cells. */
export const SUN_REACH = 16
/**
 * A cloud rains while any of its wool lies more than one level thick. One tap of a handful or of a tuft lays two
 * levels under the finger, so a tapped cloud rains; combed down to a single level everywhere, it stops.
 */
export const canRain = (cloud: Shape): boolean => cloud.kind === 'cloud' && cloud.mass > cloud.count
/** Where drops stop in a sun's reach and turn to steam, as a share of the way down. */
export const STEAM_AT = 0.3
/** How many times a second a drop starts down each column of a rain, and how many are on their way at once. */
export const DROPS_A_SECOND = 1.5
export const DROPS_A_COLUMN = 2
/** How near a fire or a wind counts as beside a figure, and how near a trunk as against it, in cells. */
export const BESIDE = 7
export const AGAINST = 2
/** How tall a figure on the sheet stands, in cells: rain that stops above its head does not reach it. */
export const FIGURE_CELLS = 8

export type Rain = {
  cloud: Shape
  /** The columns it falls in, both counted. */
  x0: number
  x1: number
  /** The first row under the cloud, and the row where it stops: the top of the first living shape under it, or the bottom of the sheet. */
  top: number
  floor: number
  /** That first living shape, or null where the rain falls to the bottom. */
  under: Shape | null
  /** For each column from `x0`: a sun dries the rain there. */
  dry: boolean[]
}
export type Sun = { shape: Shape; col: number; row: number }
/** A bow: it rises at the rain's side, at column `from`, and comes down at the sun's side, at column `to`, on row `row`. */
export type Bow = { sun: number; cloud: number; from: number; to: number; row: number }
/** `pushed` holds the ids of the clouds a wind lies beside: each is pushed along as it drifts. */
export type Weather = { rains: Rain[]; suns: Sun[]; bows: Bow[]; pushed: number[] }

const gapToBox = (shape: Shape, col: number, row: number): number => Math.hypot(Math.max(shape.x0 - col, 0, col - shape.x1), Math.max(shape.y0 - row, 0, row - shape.y1))

/** Whether the felt is bare on the straight way between two cells, leaving out the two shapes it runs between. */
function bareBetween(sheet: Sheet, a: Shape, b: Shape, col0: number, row0: number, col1: number, row1: number): boolean {
  const steps = Math.max(2, Math.ceil(Math.hypot(col1 - col0, row1 - row0) * 2))
  let bare = 0
  for (let i = 0; i <= steps; i++) {
    const col = Math.floor(col0 + ((col1 - col0) * i) / steps), row = Math.floor(row0 + ((row1 - row0) * i) / steps)
    const top = topAt(sheet, col, row)
    if (!top) { bare++; continue }
    if (top !== a && top !== b && !(a.cells[row * COLS + col] || b.cells[row * COLS + col])) return false
  }
  return bare >= 4
}

export function weatherOf(sheet: Sheet): Weather {
  const suns: Sun[] = []
  for (const shape of sheet.shapes) if (shape.kind === 'sun') { const at = middle(shape); suns.push({ shape, col: at.col, row: at.row }) }
  const rains: Rain[] = []
  for (const cloud of sheet.shapes) {
    if (!canRain(cloud)) continue
    const mid = middle(cloud).row
    let under: Shape | null = null
    for (const shape of sheet.shapes) {
      if (shape === cloud || shape.kind === 'fluff' || shape.x1 < cloud.x0 || shape.x0 > cloud.x1 || shape.y0 <= mid) continue
      if (!under || shape.y0 < under.y0) under = shape
    }
    const top = cloud.y1 + 1, floor = under ? Math.max(top, under.y0) : ROWS
    const dry: boolean[] = []
    for (let col = cloud.x0; col <= cloud.x1; col++) {
      dry.push(suns.some((sun) => Math.hypot(sun.col - (col + 0.5), sun.row - Math.max(top, Math.min(floor, sun.row))) <= SUN_REACH))
    }
    rains.push({ cloud, x0: cloud.x0, x1: cloud.x1, top, floor, under, dry })
  }
  const bows: Bow[] = []
  for (const rain of rains) {
    if (!rain.dry.includes(true)) continue
    const at = middle(rain.cloud)
    for (const sun of suns) {
      if (Math.hypot(sun.col - at.col, sun.row - Math.max(rain.top, Math.min(rain.floor, sun.row))) > SUN_REACH + (rain.x1 - rain.x0) / 2) continue
      if (!bareBetween(sheet, sun.shape, rain.cloud, sun.col, sun.row, at.col, at.row)) continue
      bows.push({ sun: sun.shape.id, cloud: rain.cloud.id, from: at.col, to: sun.col, row: Math.min(ROWS - 1, Math.max(rain.floor, Math.floor(sun.row) + 6)) })
      break
    }
  }
  return { rains, suns, bows, pushed: sheet.shapes.filter((shape) => shape.kind === 'cloud' && pushed(sheet, shape)).map((shape) => shape.id) }
}

/**
 * Whether drops are drawn under a rain: it has room to fall in, in some column no sun dries, or far enough above
 * where a sun turns it to steam. The cloud's waking patter is heard only then (toy.ts), and sky.ts draws by the
 * same measure, in stage units a cell.
 */
export function dropsFall(rain: Rain, cell: number): boolean {
  const way = (rain.floor - rain.top) * cell + 4
  return rain.dry.includes(false) ? way >= 8 : way * STEAM_AT >= 8
}

/** The rain that falls on a figure whose feet stand at this cell where no sun dries it, or undefined. */
export function rainOver(weather: Weather, col: number, row: number): Rain | undefined {
  const c = Math.floor(col)
  return weather.rains.find((rain) => c >= rain.x0 && c <= rain.x1 && row >= rain.top && row - FIGURE_CELLS <= rain.floor && !rain.dry[c - rain.x0])
}

/** The column of a rain whose drops are drawn nearest this one: every other column, from its first. */
export function dropColumn(rain: Rain, col: number): number {
  const at = rain.x0 + 2 * Math.round((Math.floor(col) - rain.x0) / 2)
  return at > rain.x1 ? at - 2 : at
}

/** Where in its fall the drop of a column is at time 0, as a share of the way down: each column has its own. */
export function dropPhase(col: number, cloud: number): number {
  let h = (Math.imul(col, 374761393) + Math.imul(cloud, 668265263) + 3 * 1274126177) | 0
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** How far down a rain a row lies, as a share of the way from just under the cloud to where the rain stops, 0 to 1. */
export function wayDown(rain: Rain, row: number): number {
  return Math.max(0, Math.min(1, (row - rain.top + 0.4) / (rain.floor - rain.top + 0.4)))
}

/** Seconds from `t` until the next drop of a steady rain comes down as far as `way` in the column drawn nearest `col`. */
export function nextDrop(rain: Rain, col: number, way: number, t: number): number {
  const phase = dropPhase(dropColumn(rain, col), rain.cloud.id), to = Math.min(way, 0.999)
  let least = Infinity
  for (let drop = 0; drop < DROPS_A_COLUMN; drop++) {
    const u = to - (t * DROPS_A_SECOND + phase + drop / DROPS_A_COLUMN)
    least = Math.min(least, (((u % 1) + 1) % 1) / DROPS_A_SECOND)
  }
  return least
}

/** Whether rain falls on a figure whose feet stand at this cell and no sun dries it there. */
export function rainOn(weather: Weather, col: number, row: number): boolean {
  const c = Math.floor(col)
  return weather.rains.some((rain) => c >= rain.x0 && c <= rain.x1 && row >= rain.top && row - FIGURE_CELLS <= rain.floor && !rain.dry[c - rain.x0])
}

/** Whether a sun dries the rain that would fall on this cell. */
export function driedAt(weather: Weather, col: number, row: number): boolean {
  const c = Math.floor(col)
  return weather.rains.some((rain) => c >= rain.x0 && c <= rain.x1 && row >= rain.top && row - FIGURE_CELLS <= rain.floor && rain.dry[c - rain.x0])
}

/** The cloud whose rain a sun dries over this cell, by shape id, or -1. */
export function dryingCloud(weather: Weather, col: number, row: number): number {
  const c = Math.floor(col)
  const rain = weather.rains.find((one) => c >= one.x0 && c <= one.x1 && row >= one.top && row - FIGURE_CELLS <= one.floor && one.dry[c - one.x0])
  return rain ? rain.cloud.id : -1
}

/** Whether rain reaches a shape: it is the first living shape under a cloud, and some column over it is not dried. */
export function rainedOn(weather: Weather, shape: Shape): boolean {
  return weather.rains.some((rain) => {
    if (rain.under !== shape) return false
    for (let col = Math.max(rain.x0, shape.x0); col <= Math.min(rain.x1, shape.x1); col++) if (!rain.dry[col - rain.x0]) return true
    return false
  })
}

/** What a figure's place is made of, for its tastes (acts.ts). */
export type Env = {
  /** The living shape under its feet, and what that is; null on bare felt or on a scrap. */
  shape: Shape | null
  ground: Kind | null
  /** Rain falls on it and no sun dries it. */
  wet: boolean
  /** A sun dries the rain that would fall on it. */
  dried: boolean
  /** The earth under it is wet: rained on, or touching a pond or a stream. */
  mud: boolean
  /** That earth is wet without any rain: it touches a pond or a stream, or lies under a wet veil. */
  spring: boolean
  /** It stands in mist. */
  mist: boolean
  /** A fire or a wind is beside it, a trunk is against it, a sun is over it within its reach. */
  fire: boolean
  wind: boolean
  trunk: boolean
  sun: boolean
}

/** `tall` is how high the figure stands above its feet, in cells: a wind anywhere along it, up to its hat, is beside it. A fire and a trunk are beside its feet. */
export function envAt(sheet: Sheet, weather: Weather, col: number, row: number, tall = 0): Env {
  const c = Math.floor(col), r = Math.floor(row)
  let shape: Shape | null = null
  // The topmost living shape with wool under the feet, or a cell beside them.
  search: for (let i = sheet.shapes.length - 1; i >= 0; i--) {
    const candidate = sheet.shapes[i]
    if (candidate.kind === 'fluff') continue
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = c + dx, y = r + dy
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || !candidate.cells[y * COLS + x]) continue
      shape = candidate
      break search
    }
  }
  const kinds = (kind: Kind, reach: number, up = 0): boolean => sheet.shapes.some((other) => other.kind === kind && Math.hypot(Math.max(other.x0 - c, 0, c - other.x1), Math.max(other.y0 - r, 0, r - up - other.y1)) <= reach)
  const ground = shape ? shape.kind : null
  const water = (other: Shape): boolean => (other.kind === 'pond' || other.kind === 'stream') && shape !== null && Math.max(other.x0 - shape.x1, shape.x0 - other.x1) <= 1 && Math.max(other.y0 - shape.y1, shape.y0 - other.y1) <= 1
  return {
    shape,
    ground,
    wet: rainOn(weather, col, row),
    dried: driedAt(weather, col, row),
    mud: ground === 'earth' && shape !== null && (rainedOn(weather, shape) || shape.veil === BLUE || sheet.shapes.some(water)),
    spring: ground === 'earth' && shape !== null && (shape.veil === BLUE || sheet.shapes.some(water)),
    mist: sheet.shapes.some((other) => other.kind === 'mist' && (other.cells[r * COLS + c] > 0 || (r > 0 && other.cells[(r - 1) * COLS + c] > 0))),
    fire: ground !== 'fire' && kinds('fire', BESIDE),
    wind: kinds('wind', BESIDE, tall),
    trunk: kinds('trunk', AGAINST),
    sun: weather.suns.some((sun) => sun.row < row && Math.hypot(sun.col - col, sun.row - row) <= SUN_REACH),
  }
}

/** The middle of the nearest shape of this dye, in cells, or null where the sheet has none. */
export function nearestOfDye(sheet: Sheet, dye: number, col: number, row: number): { col: number; row: number } | null {
  let best: Shape | null = null, least = Infinity
  for (const shape of sheet.shapes) {
    if (shape.dye !== dye) continue
    const gap = gapToBox(shape, col, row)
    if (gap < least) { least = gap; best = shape }
  }
  return best ? middle(best) : null
}

/** Whether a wind lies beside a cloud and pushes it along: at about its height and within a few cells of its side. */
export function pushed(sheet: Sheet, cloud: Shape): boolean {
  return sheet.shapes.some((wind) => wind.kind === 'wind' && Math.max(wind.x0 - cloud.x1, cloud.x0 - wind.x1) <= 10 && Math.max(wind.y0 - cloud.y1, cloud.y0 - wind.y1) <= 3)
}

/**
 * The keys of what the weather is doing now: one for each cloud and what its rain reaches, one for each sun and
 * the rain it dries, one for each bow. A touch that adds a key has caused a scene (scenes.ts). `raining` holds
 * the clouds that rain at all: a figure set down under rain that already falls adds a key and causes no scene.
 */
export function weatherKeys(weather: Weather, folk: readonly ({ col: number; row: number } | null)[]): { rain: string[]; sun: string[]; bow: string[]; raining: number[] } {
  const rain: string[] = [], sun: string[] = []
  for (const fall of weather.rains) {
    if (fall.under) rain.push(`${fall.cloud.id}>${fall.under.id}`)
    folk.forEach((at, who) => { if (at && Math.floor(at.col) >= fall.x0 && Math.floor(at.col) <= fall.x1 && at.row >= fall.top && at.row - FIGURE_CELLS <= fall.floor) rain.push(`${fall.cloud.id}>f${who}`) })
    if (!fall.dry.includes(true)) continue
    const mid = middle(fall.cloud)
    for (const s of weather.suns) if (Math.hypot(s.col - mid.col, s.row - Math.max(fall.top, Math.min(fall.floor, s.row))) <= SUN_REACH + (fall.x1 - fall.x0) / 2) sun.push(`${s.shape.id}*${fall.cloud.id}`)
  }
  return { rain, sun, bow: weather.bows.map((bow) => `${bow.sun}~${bow.cloud}`), raining: weather.rains.map((fall) => fall.cloud.id) }
}
