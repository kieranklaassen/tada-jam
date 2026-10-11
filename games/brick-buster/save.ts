import { BUMPER, LANE, PLACES, WALL } from './layout'
import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'
import { layWall } from './walls'

// What the table saves, around the template's fields (state.ts): the wall as
// it stands, the rubble as it lies, where the bumper is, what the ball is and
// which first showings have started. The ball itself is never saved in the
// air: a saved ball rests on the bumper, where along the bumper it lay, or on
// its middle if it was in the air. Every field is read by itself, and a field
// that cannot be read takes its default.

export type Glass = { kind: 'glass'; state: 'whole' | 'cracked' | 'sagged' }
export type Jelly = { kind: 'jelly'; state: 'fresh' | 'thrown-once' | 'thrown-twice'; swollen: boolean }
/** An ice brick, or the pool it melted into, lying in its place. */
export type Ice = { kind: 'ice'; state: 'whole' | 'pool'; dimpled: boolean; icicle: boolean }
/**
 * A seed brick. `gone` is a seed that was popped or driven in after its vine had grown: the seed lies in the tray
 * and its vine stays where it grew. Such a vine is kept in the place of the lane it stands in, the first column of
 * the seed's row, so the place the seed stood in is empty and a sleepy brick may move into it.
 */
export type Seed = { kind: 'seed'; state: 'whole' | 'vine' | 'tall-vine'; browned: boolean; gone: boolean }
export type Sleepy = { kind: 'sleepy'; state: 'asleep' | 'deep' }
export type Brick = Glass | Jelly | Ice | Seed | Sleepy
export type BrickKind = Brick['kind']

/** What a brick falls as: its kind and, where a kind can lie in the tray in two forms, its form. */
export type FallenKind = { kind: 'glass' } | { kind: 'jelly'; form: 'splat' | 'syrup' } | { kind: 'seed'; form: 'flower' | 'sprout' } | { kind: 'sleepy' }
/** What lies in the tray: a fallen brick, and the column of the wall it fell from, under which it lies. */
export type Fallen = FallenKind & { col: number }

export const BALL_KINDS = ['plain', 'wet', 'hot', 'heavy'] as const
export type BallKind = (typeof BALL_KINDS)[number]

export const SHOWINGS = ['hot-gate', 'wet-gate'] as const
export type Showing = (typeof SHOWINGS)[number]

export type Save = GameState & {
  /** The places of the wall, row by row from the top, each empty or holding a brick. */
  wall: (Brick | null)[]
  /** The bricks that have fallen, in the order they fell. */
  rubble: Fallen[]
  /** Where the middle of the bumper stands along the floor, in stage units. */
  bumper: number
  /** Where along the bumper a resting ball lies, from -1 at its left end to 1 at its right. */
  seat: number
  ball: BallKind
  /** The first showings that have started. */
  shown: Showing[]
}

const MIDDLE = (BUMPER.minX + BUMPER.maxX) / 2

/**
 * A pool is what an ice brick left behind and a vine is what a seed left behind, and neither is a brick: a wall
 * with nothing but pools and a vine on it is cleared.
 */
export function stands(brick: Brick | null): brick is Brick {
  return brick !== null && !(brick.kind === 'ice' && brick.state === 'pool') && !(brick.kind === 'seed' && brick.gone)
}

/**
 * A vine whose seed is gone stands in the lane and is kept there, in the first column of its row: one found in the
 * seed's own place is moved over, so that the place the seed stood in is empty.
 */
export function settleVines(wall: (Brick | null)[]): void {
  wall.forEach((brick, place) => {
    const lane = place - (place % WALL.cols) + LANE.col
    if (brick === null || brick.kind !== 'seed' || !brick.gone || place === lane || wall[lane] !== null) return
    wall[lane] = brick
    wall[place] = null
  })
}

export function isCleared(wall: readonly (Brick | null)[]): boolean {
  return !wall.some(stands)
}

export function freshSave(childAge: number | null, seed = 1): Save {
  const base = readBase(null, childAge)
  return { ...base, wall: layWall(base.position, seed), rubble: [], bumper: MIDDLE, seat: 0, ball: 'plain', shown: [] }
}

const isOneOf = <T extends string>(value: unknown, of: readonly T[]): value is T => typeof value === 'string' && (of as readonly string[]).includes(value)

/** One place of the wall: `null` for an empty place, a brick, or `undefined` for something unreadable. */
function readBrick(raw: unknown): Brick | null | undefined {
  if (raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const brick = raw as Record<string, unknown>
  switch (brick.kind) {
    case 'glass':
      return isOneOf(brick.state, ['whole', 'cracked', 'sagged'] as const) ? { kind: 'glass', state: brick.state } : undefined
    case 'jelly':
      return isOneOf(brick.state, ['fresh', 'thrown-once', 'thrown-twice'] as const) ? { kind: 'jelly', state: brick.state, swollen: brick.swollen === true } : undefined
    case 'ice':
      return isOneOf(brick.state, ['whole', 'pool'] as const) ? { kind: 'ice', state: brick.state, dimpled: brick.dimpled === true, icicle: brick.icicle === true } : undefined
    case 'seed':
      return isOneOf(brick.state, ['whole', 'vine', 'tall-vine'] as const) ? { kind: 'seed', state: brick.state, browned: brick.browned === true, gone: brick.gone === true && brick.state !== 'whole' } : undefined
    case 'sleepy':
      return isOneOf(brick.state, ['asleep', 'deep'] as const) ? { kind: 'sleepy', state: brick.state } : undefined
    default:
      return undefined
  }
}

/** One fallen brick. `index` is its order in the tray: one saved without a readable column lies under the column its order gives it. */
function readFallen(raw: unknown, index: number): Fallen | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const fallen = raw as Record<string, unknown>
  const col = typeof fallen.col === 'number' && Number.isInteger(fallen.col) && fallen.col >= 0 && fallen.col < WALL.cols ? fallen.col : index % WALL.cols
  switch (fallen.kind) {
    case 'glass':
      return { kind: 'glass', col }
    case 'sleepy':
      return { kind: 'sleepy', col }
    case 'jelly':
      return isOneOf(fallen.form, ['splat', 'syrup'] as const) ? { kind: 'jelly', form: fallen.form, col } : undefined
    case 'seed':
      return isOneOf(fallen.form, ['flower', 'sprout'] as const) ? { kind: 'seed', form: fallen.form, col } : undefined
    default:
      return undefined
  }
}

/**
 * Saved state is untrusted, and each field is repaired by itself. A wall that cannot be read is a new wall laid
 * out from the position, which is kept, with no rubble. Whether the wall is cleared is read from the wall itself,
 * which wins over the stored flag.
 */
export function deserialize(raw: unknown, childAge: number | null = null, seed = 1): Save {
  const base = readBase(raw, childAge)
  if (!isReadable(raw)) return freshSave(childAge, seed)

  let wall: (Brick | null)[] | null = null
  if (Array.isArray(raw.wall) && raw.wall.length === PLACES) {
    const read = raw.wall.map(readBrick)
    if (read.every((brick) => brick !== undefined)) wall = read as (Brick | null)[]
  }
  let rubble: Fallen[] = []
  if (Array.isArray(raw.rubble)) {
    const read = raw.rubble.map((fallen, index) => readFallen(fallen, index))
    if (read.every((fallen) => fallen !== undefined)) rubble = read as Fallen[]
  }
  // A wall and its tray never hold more bricks than there are places. A vine whose seed is gone is no brick: its seed is counted in the tray.
  if (!wall || wall.filter((brick) => brick !== null && !(brick.kind === 'seed' && brick.gone)).length + rubble.length > PLACES) {
    wall = layWall(base.position, seed)
    rubble = []
  }
  settleVines(wall)
  const seat = typeof raw.seat === 'number' && Number.isFinite(raw.seat) ? Math.max(-1, Math.min(1, raw.seat)) : 0
  const bumper = typeof raw.bumper === 'number' && Number.isFinite(raw.bumper) ? Math.max(BUMPER.minX, Math.min(BUMPER.maxX, raw.bumper)) : MIDDLE
  const shown = Array.isArray(raw.shown) ? SHOWINGS.filter((showing) => (raw.shown as unknown[]).includes(showing)) : []
  return { ...base, finished: isCleared(wall), wall, rubble, bumper, seat, ball: isOneOf(raw.ball, BALL_KINDS) ? raw.ball : 'plain', shown }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    wall: save.wall.map((brick) => (brick ? { ...brick } : null)),
    rubble: save.rubble.map((fallen) => ({ ...fallen })),
    bumper: Math.round(save.bumper),
    seat: Math.round(save.seat * 100) / 100,
    ball: save.ball,
    shown: [...save.shown],
  }
}
