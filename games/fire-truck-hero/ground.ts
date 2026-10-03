// The ground of a yard: how wet the sand is, as a coarse grid. No renderer and
// no DOM. The view draws a finer picture on top of it, and this grid is what
// is saved, so a yard is found as it was left (ART.md, "The designed order,
// and what is stored").
//
// Water is counted in gulps, the unit of the whole game: one tap of the hose.

/** The yard is this many cells across and deep. A cell is one yard unit square. */
export const COLS = 16
export const ROWS = 10

/** One spot of ground has its fill at this many gulps: the water stands as a puddle. */
export const PUDDLE_AT = 3
/** Water after its fill turns the puddle to mud. */
export const MUD_AT = 4
/** No cell holds more than this. No amount in the game is larger than five. */
export const MOST = 5

/**
 * Damp sand loses this many gulps a second, on attended game time only, so a
 * blot of one gulp is pale again in a quarter of a minute and a line drawn
 * with two in half a minute. A puddle and mud do not dry: what the child
 * brought to its fill stays for as long as the yard is on screen.
 */
export const DRYING_GULPS_PER_S = 1 / 15

/** What the sand at one place is like. The saved form is its index. */
export const LEVELS = ['dry', 'damp', 'puddle', 'mud'] as const
export type Level = (typeof LEVELS)[number]

/** Gulps of water in each cell, row by row from the far edge of the yard. */
export type Ground = readonly number[]

export function dryGround(): Ground {
  return new Array<number>(COLS * ROWS).fill(0)
}

/** The cell under a point of the yard, or -1 outside it. */
export function cellAt(x: number, z: number): number {
  if (!(x >= 0 && x < COLS && z >= 0 && z < ROWS)) return -1
  return Math.floor(z) * COLS + Math.floor(x)
}

export function levelOf(gulps: number): Level {
  if (gulps >= MUD_AT) return 'mud'
  if (gulps >= PUDDLE_AT) return 'puddle'
  return gulps > 0 ? 'damp' : 'dry'
}

export function levelAt(ground: Ground, x: number, z: number): Level {
  const cell = cellAt(x, z)
  return cell < 0 ? 'dry' : levelOf(ground[cell])
}

/** Water lands on the sand. Outside the yard it is lost, as over a fence. */
export function pour(ground: Ground, x: number, z: number, gulps: number): Ground {
  const cell = cellAt(x, z)
  if (cell < 0 || !(gulps > 0)) return ground
  const next = ground.slice()
  next[cell] = Math.min(MOST, next[cell] + gulps)
  return next
}

/** Damp sand dries over attended game time. Puddles and mud stay. */
export function dry(ground: Ground, seconds: number): Ground {
  if (!(seconds > 0)) return ground
  const lost = seconds * DRYING_GULPS_PER_S
  let changed = false
  const next = ground.map((gulps) => {
    if (gulps <= 0 || gulps >= PUDDLE_AT) return gulps
    changed = true
    return Math.max(0, gulps - lost)
  })
  return changed ? next : ground
}

/** The cells at one level, for whoever likes or dislikes them (the snail, the cat, the worm). */
export function cellsAt(ground: Ground, level: Level): number[] {
  const cells: number[] = []
  ground.forEach((gulps, cell) => {
    if (levelOf(gulps) === level) cells.push(cell)
  })
  return cells
}

/** The middle of a cell, in yard units. */
export function centreOf(cell: number): { x: number; z: number } {
  return { x: (cell % COLS) + 0.5, z: Math.floor(cell / COLS) + 0.5 }
}

// --- The saved form ---------------------------------------------------------

/** What a saved level is read back as: the least water that gives that level. */
const GULPS_OF_LEVEL = [0, 1, PUDDLE_AT, MUD_AT] as const

/** One character a cell, the index of its level: 160 characters for a yard. */
export function encode(ground: Ground): string {
  let out = ''
  for (let cell = 0; cell < COLS * ROWS; cell++) out += String(LEVELS.indexOf(levelOf(ground[cell] ?? 0)))
  return out
}

/** Saved ground is untrusted: anything that is not a whole grid gives dry sand, and a damaged cell is dry. */
export function decode(raw: unknown): Ground {
  if (typeof raw !== 'string' || raw.length !== COLS * ROWS) return dryGround()
  const ground: number[] = []
  for (const mark of raw) {
    const level = mark >= '0' && mark <= '3' ? Number(mark) : 0
    ground.push(GULPS_OF_LEVEL[level])
  }
  return ground
}
