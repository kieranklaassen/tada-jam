import { asSaved } from './build'
import { COLS, MOUTH, OPEN, ROCK, ROWS, at, generate, makeGround, put, settle, type Ground, type Kind } from './ground'
import { SHOTS, type Shot } from './habits'
import { ROUND, SHOWINGS, arrived, type MachineKind } from './order'
import { STATE_VERSION, deserialize as readPosition, isReadable, type GameState } from './state'

// What goes into ctx.storage for this game, wrapped round the template's state.ts as its header asks: the position
// is read there, and every other field is read here, each repaired by itself. A save holds the nest as built and
// never a raid: no invader, no shot in the air, no mark where a wall gave, and nothing in the jaws or under the
// finger, since a carried lump and a dragged machine stay where they were until they are set down.

export type Machine = {
  kind: MachineKind
  /** The cell it stands on. */
  x: number
  y: number
  /** The way it faces along the row. */
  facing: -1 | 1
  load: Shot | null
}

/** The game as it is played. */
export type Game = {
  position: string
  ground: Ground
  /** The cell the child's ant stands in. */
  ant: { x: number; y: number }
  machines: Machine[]
  /** Which party of the open kingdom's round sits at the log. */
  muster: number
  /** The first showings that have started. */
  shown: string[]
  /** The great raid was turned back. */
  ended: boolean
}

/** The record in storage: plain JSON, under a kilobyte or two. `finished` is the template's field and always false here. */
export type Save = GameState & {
  ground: string
  ant: number
  machines: Machine[]
  muster: number
  shown: string[]
  ended: boolean
}

const MARKS = '.#smoX'

/** The cells as a run-length string, row by row: a mark for the kind, then how many when more than one. */
export function encodeGround(ground: Ground): string {
  let text = ''
  for (let i = 0; i < ground.cells.length; ) {
    let run = 1
    while (i + run < ground.cells.length && ground.cells[i + run] === ground.cells[i]) run++
    text += MARKS[ground.cells[i]] + (run > 1 ? String(run) : '')
    i += run
  }
  return text
}

/** The ground a string holds, or null when it is not a whole ground of this size. */
export function decodeGround(text: unknown, cols = COLS, rows = ROWS): Ground | null {
  if (typeof text !== 'string' || text.length > cols * rows * 2) return null
  const ground = makeGround(cols, rows, OPEN)
  let i = 0
  for (const part of text.matchAll(/([.#smoX])(\d{0,4})/gy)) {
    const kind = MARKS.indexOf(part[1]) as Kind, run = part[2] === '' ? 1 : Number(part[2])
    if (run < 1 || i + run > ground.cells.length) return null
    ground.cells.fill(kind, i, i + run)
    i += run
  }
  return i === ground.cells.length && text.replace(/[.#smoX]\d{0,4}/g, '') === '' ? ground : null
}

/** A read ground is made a nest again: turf with the open mouth on top, bedrock below, and everything at rest. */
function repairGround(ground: Ground): Ground {
  for (let x = 0; x < ground.cols; x++) {
    put(ground, x, 0, MOUTH.includes(x) ? OPEN : ROCK)
    put(ground, x, ground.rows - 1, ROCK)
    for (let y = 1; y < ground.rows - 1; y++) if (at(ground, x, y) === ROCK) put(ground, x, y, OPEN)
  }
  settle(ground)
  return ground
}

/** Where the ant stands in a new nest, and where anything is put that has lost its place: the foot of the shaft. */
function shaftFoot(ground: Ground): { x: number; y: number } {
  let y = 0
  while (y + 1 < ground.rows && at(ground, MOUTH[0], y + 1) === OPEN) y++
  return { x: MOUTH[0], y: Math.max(1, y) }
}

export function freshGame(childAge: number | null, seed: number): Game {
  const ground = generate(seed)
  return { position: readPosition(undefined, childAge).position, ground, ant: shaftFoot(ground), machines: [], muster: 0, shown: [], ended: false }
}

/**
 * The record to store. The ground is saved as it will come to rest. A lump in the jaws is still in the cell it
 * was picked from, and a machine under the finger still stands where it stood, so neither needs a word here.
 */
export function serialize(game: Game): Save {
  return {
    v: STATE_VERSION,
    position: game.position,
    finished: false,
    ground: encodeGround(asSaved(game.ground)),
    ant: game.ant.y * game.ground.cols + game.ant.x,
    machines: game.machines.map((m) => ({ kind: m.kind, x: m.x, y: m.y, facing: m.facing, load: m.load })),
    muster: game.muster,
    shown: [...game.shown],
    ended: game.ended,
  }
}

const isWhole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)

/** One stored machine, or null when it is not one that can stand where it says in this ground. */
function readMachine(raw: unknown, ground: Ground, allowed: readonly MachineKind[]): Machine | null {
  if (typeof raw !== 'object' || raw === null) return null
  const m = raw as Record<string, unknown>
  const kind = allowed.find((k) => k === m.kind)
  if (!kind || !isWhole(m.x) || !isWhole(m.y) || m.y < 1 || at(ground, m.x, m.y) !== OPEN) return null
  const load = SHOTS.find((shot) => shot === m.load) ?? null
  return { kind, x: m.x, y: m.y, facing: m.facing === -1 ? -1 : 1, load }
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a fresh game, and so does a version above
 * this one. Inside a record each field is repaired by itself: a damaged field takes its default and the rest is kept.
 */
export function deserialize(raw: unknown, childAge: number | null, seed: number): Game {
  if (!isReadable(raw)) return freshGame(childAge, seed)
  const position = readPosition(raw, childAge).position
  const read = decodeGround(raw.ground)
  const ground = read ? repairGround(read) : generate(seed)
  const foot = shaftFoot(ground)
  const antCell = isWhole(raw.ant) && raw.ant >= ground.cols && raw.ant < ground.cells.length && ground.cells[raw.ant] === OPEN ? raw.ant : foot.y * ground.cols + foot.x
  const shown = Array.isArray(raw.shown) ? SHOWINGS.filter((id) => (raw.shown as unknown[]).includes(id)) : []
  const allowed = arrived(position)
  const machines: Machine[] = []
  for (const entry of Array.isArray(raw.machines) ? raw.machines.slice(0, 8) : []) {
    const machine = readMachine(entry, ground, allowed)
    if (machine && !machines.some((m) => m.kind === machine.kind)) machines.push(machine)
  }
  // A machine whose showing has started is in the nest. One that lost its entry stands at the foot of the shaft, empty.
  for (const kind of allowed) {
    if (shown.includes(kind) && !machines.some((m) => m.kind === kind)) machines.push({ kind, x: foot.x, y: foot.y, facing: 1, load: null })
  }
  const muster = isWhole(raw.muster) && raw.muster >= 0 && raw.muster < ROUND.length ? raw.muster : 0
  // The kingdom is open only after the great raid was turned back, so the two cannot disagree.
  return { position, ground, ant: { x: antCell % ground.cols, y: Math.floor(antCell / ground.cols) }, machines, muster, shown, ended: position === 'open-kingdom' }
}
