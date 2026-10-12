import { BUILDS_FIRST_FROM } from './config'
import { blank, decode, encode, type Face } from './face'
import { BOX_COUNT, FIRST_X, kindOf } from './layout'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'

// The fort as it is saved: the template's fields, and round them every field
// the sheet in ART.md lists. `deserialize` in state.ts reads the template's
// fields; this module reads the same record again for its own, each repaired
// by itself, so one damaged field never costs the rest. What a field may hold
// given the others (a tape only across a seam, a cat only at a hole that is
// there) is settled in fort.ts by `repair`, which the load calls last.

/** Where a box rests: on the box with that id, on the rug, or flat on the heap. */
export const ON_RUG = -1
export const ON_HEAP = -2
/** Where a cushion or a toy is when it is in no box: a cushion on the sofa or on the rug, a toy in the baby's hand. */
export const ON_SOFA = -1
export const FIRED = -2
/** A cushion that was let go on bare rug lies there, in front of the boxes: `cushionAt` has where along the rug. */
export const ON_FLOOR = -3
export const HELD = -1
export const CUSHION_COUNT = 3
export const TOY_COUNT = 3
export const MAX_TAPES = 8
export const MAX_LIGHTS = 12
/** The most points an unfinished cut is saved with: a longer one is saved by every second point, and the scissors finish one twice as long where it is (toy.ts, `MAX_PATH`). */
export const MAX_LINE = 800

export type BoxState = {
  /** 0 to 4; the id fixes the size (layout.ts). */
  id: number
  /** The middle of its face along the rug, in whole centimetres. */
  x: number
  on: number
  /** Lying on its side. */
  side: boolean
  /** The face turned to the child. */
  face: Face
}

export type CatState = {
  /** On the highest box, on the rug, looking out of a hole from inside, stuck in a hole, or inside a box. */
  at: 'top' | 'rug' | 'look' | 'stuck' | 'in'
  box: number
  /** A cell of the hole it is at. */
  cell: number
}

export type GranState = {
  /** In her chair, sitting in a box, or wearing one. */
  at: 'chair' | 'in' | 'skirt'
  box: number
}

/** A cut that was begun and not closed: the line waits on its face. `path` is its points in cells of that face, x then y, to a tenth of a cell. */
export type Line = { box: number; path: number[] }

export type FortState = GameState & {
  boxes: BoxState[]
  /** Pairs of box ids that are taped together. */
  tapes: [number, number][]
  /** The boxes the blanket lies over: none (folded on the sofa), one (heaped beside it) or two (a roof). */
  blanket: number[]
  /** For each cushion: the box it is in, the sofa, the rug in front of the sofa, or the rug in front of the boxes. */
  cushions: number[]
  /** For each cushion: where it lies along the rug in whole centimetres, read only while it lies in front of the boxes. */
  cushionAt: number[]
  /** Where the blanket lies heaped on bare rug, in whole centimetres along it, or null. Read only while it lies over no box. */
  lump: number | null
  /** The corners the string of lights is draped over, in order: a box id doubled, plus one for its right corner. */
  lights: number[]
  /** The string lies in a tangle on the rug under its hook. */
  tangled: boolean
  dark: boolean
  cat: CatState
  /** The box the baby is in, or the rug. */
  baby: number
  /** For each toy: the box it lies in, or the baby's hand. */
  toys: number[]
  gran: GranState
  /** The line of a cut the finger has not closed yet, or null. */
  line: Line | null
}

/** The boxes of a first visit. Age only sets how many already stand: a child of 6 or older begins with the big box alone. */
export function firstBoxes(childAge: number | null): BoxState[] {
  const standing = childAge !== null && childAge >= BUILDS_FIRST_FROM ? [0] : [0, 3]
  return Array.from({ length: BOX_COUNT }, (_, id) => {
    const kind = kindOf(id)
    return { id, x: FIRST_X[id], on: standing.includes(id) ? ON_RUG : ON_HEAP, side: false, face: blank(kind.cols, kind.rows) }
  })
}

function freshRest(): Omit<FortState, keyof GameState | 'boxes'> {
  return {
    tapes: [], blanket: [], cushions: Array.from({ length: CUSHION_COUNT }, () => ON_SOFA), cushionAt: Array.from({ length: CUSHION_COUNT }, () => 0), lump: null, lights: [], tangled: false, dark: false,
    cat: { at: 'top', box: 0, cell: 0 }, baby: ON_RUG, toys: Array.from({ length: TOY_COUNT }, () => HELD), gran: { at: 'chair', box: 0 }, line: null,
  }
}

export function freshFort(childAge: number | null): FortState {
  return { ...deserialize(null, childAge), boxes: firstBoxes(childAge), ...freshRest() }
}

const whole = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high
const boxId = (value: unknown): value is number => whole(value, 0, BOX_COUNT - 1)

function readBoxes(raw: unknown, childAge: number | null): BoxState[] {
  const boxes = firstBoxes(childAge)
  if (!Array.isArray(raw)) return boxes
  for (const entry of raw) {
    if (!isRecord(entry) || !boxId(entry.id)) continue
    const box = boxes[entry.id], kind = kindOf(box.id)
    if (whole(entry.x, -400, 400)) box.x = entry.x
    if (whole(entry.on, ON_HEAP, BOX_COUNT - 1) && entry.on !== box.id) box.on = entry.on
    box.side = entry.side === true
    box.face = decode(entry.holes, kind.cols, kind.rows) ?? box.face
  }
  return boxes
}

const list = (raw: unknown, most: number, keep: (entry: unknown) => boolean): unknown[] => (Array.isArray(raw) ? raw.filter(keep).slice(0, most) : [])
const fixed = (raw: unknown, count: number, low: number, otherwise: number): number[] => Array.from({ length: count }, (_, i) => (Array.isArray(raw) && whole(raw[i], low, BOX_COUNT - 1) ? raw[i] : otherwise))

/** An unfinished cut is read only when it is whole: a box, and an even run of finite numbers that lie on that box's face. */
function readLine(raw: unknown): Line | null {
  if (!isRecord(raw) || !boxId(raw.box) || !Array.isArray(raw.path)) return null
  const kind = kindOf(raw.box), path = raw.path as unknown[]
  if (path.length < 4 || path.length % 2 !== 0 || path.length > MAX_LINE * 2) return null
  const ok = path.every((value, i) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (i % 2 ? kind.rows : kind.cols))
  return ok ? { box: raw.box, path: path.map((value) => Math.round((value as number) * 10) / 10) } : null
}

const CAT_PLACES: readonly CatState['at'][] = ['top', 'rug', 'look', 'stuck', 'in']
const GRAN_PLACES: readonly GranState['at'][] = ['chair', 'in', 'skirt']

/**
 * Saved state is untrusted: anything that is not this game's record gives a first visit for the child's age.
 * Each field is read by its own shape here; `repair` in fort.ts then settles the fields against each other.
 */
export function deserializeFort(raw: unknown, childAge: number | null = null): FortState {
  if (!isReadable(raw)) return freshFort(childAge)
  const cat = isRecord(raw.cat) && CAT_PLACES.includes(raw.cat.at as CatState['at']) && boxId(raw.cat.box) && whole(raw.cat.cell, 0, 1 << 20) ? { at: raw.cat.at as CatState['at'], box: raw.cat.box, cell: raw.cat.cell } : freshRest().cat
  const gran = isRecord(raw.gran) && GRAN_PLACES.includes(raw.gran.at as GranState['at']) && boxId(raw.gran.box) ? { at: raw.gran.at as GranState['at'], box: raw.gran.box } : freshRest().gran
  return {
    // Open pretend play has no judged cycle, whatever the record says.
    ...deserialize(raw, childAge), finished: false,
    boxes: readBoxes(raw.boxes, childAge),
    tapes: list(raw.tapes, MAX_TAPES, (pair) => Array.isArray(pair) && pair.length === 2 && boxId(pair[0]) && boxId(pair[1]) && pair[0] !== pair[1]).map((pair) => [...(pair as [number, number])] as [number, number]),
    blanket: list(raw.blanket, 2, boxId) as number[],
    cushions: fixed(raw.cushions, CUSHION_COUNT, ON_FLOOR, ON_SOFA),
    cushionAt: Array.from({ length: CUSHION_COUNT }, (_, i) => (Array.isArray(raw.cushionAt) && whole(raw.cushionAt[i], -400, 400) ? raw.cushionAt[i] : 0)),
    lump: whole(raw.lump, -400, 400) ? raw.lump : null,
    lights: list(raw.lights, MAX_LIGHTS, (corner) => whole(corner, 0, BOX_COUNT * 2 - 1)) as number[],
    tangled: raw.tangled === true,
    dark: raw.dark === true,
    cat, gran,
    baby: whole(raw.baby, ON_RUG, BOX_COUNT - 1) ? raw.baby : ON_RUG,
    toys: fixed(raw.toys, TOY_COUNT, HELD, HELD),
    line: readLine(raw.line),
  }
}

export type SavedFort = GameState & Omit<FortState, keyof GameState | 'boxes'> & { boxes: { id: number; x: number; on: number; side: boolean; holes: string }[] }

export function serializeFort(state: FortState): SavedFort {
  return {
    ...serialize(state),
    finished: false,
    boxes: state.boxes.map((box) => ({ id: box.id, x: box.x, on: box.on, side: box.side, holes: encode(box.face) })),
    tapes: state.tapes.map(([a, b]) => [a, b] as [number, number]),
    blanket: [...state.blanket],
    cushions: [...state.cushions],
    cushionAt: [...state.cushionAt],
    lump: state.lump,
    lights: [...state.lights],
    tangled: state.tangled,
    dark: state.dark,
    cat: { ...state.cat },
    baby: state.baby,
    toys: [...state.toys],
    gran: { ...state.gran },
    line: state.line ? { box: state.line.box, path: [...state.line.path] } : null,
  }
}
