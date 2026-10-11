import { VISITORS, type VisitorId } from './cast'
import { LADDER } from './config'
import { PATH, PATH_HOLDS, BOOT } from './layout'
import { EARTH } from './place'
import { BED, MIN_PIECE, MIN_STALK, fullOf } from './plants'
import { STATE_VERSION, deserialize as readTurn, isReadable, serialize as writeTurn, type GameState } from './state'

// What the garden hands to ctx.storage: the turn of the ring (state.ts), and
// around it the bed, the vase and the path as the child left them. Read
// defensively, field by field and piece by piece: a damaged piece is left out
// and the rest is kept.
//
// Around those: the bouquets out in the street, one for each visitor at the
// most, and the first showings already seen. Each is repaired by itself.

/** A piece of a stem: which stem of the bed it was cut from, and which stretch of it. */
export type SavedPiece = {
  /** The stem of the bed it was cut from, which gives its plant and its size. */
  stem: number
  /** How high above the earth its cut end was. */
  base: number
  len: number
  /** It still has its flower. */
  head: boolean
  /** Its flower is spent: a poppy without petals, a bald dandelion. */
  spent: boolean
}
/** A piece in the vase, and where across the mouth it was let go, in tenths from -10 at the window side to 10. */
export type InVase = SavedPiece & { at: number }
/** A piece on the path: where its cut end lies and how it is turned, in radians from upright. */
export type OnPath = SavedPiece & { x: number; y: number; rot: number }

export type Saved = GameState & {
  /** The height each of the twelve stems now stands at. */
  bed: number[]
  /** The pieces in the vase, in the order they were put in. */
  vase: InVase[]
  /** The pieces on the path, oldest first. */
  path: OnPath[]
  /** The bouquets out in the street, at most one for each visitor, each as it was when it was carried off. */
  street: Bouquet[]
  /** The first showings already seen. */
  shown: Showing[]
}

export type Bouquet = { who: VisitorId; pieces: InVase[] }

/** The one first showing: the visitor reaches for the vase, once ever. */
export const SHOWINGS = ['hand-over'] as const
export type Showing = (typeof SHOWINGS)[number]

const whole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)
const real = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const round1 = (value: number): number => Math.round(value * 10) / 10

function readPiece(raw: unknown): SavedPiece | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { stem, base, len, head, spent } = raw as Record<string, unknown>
  if (!whole(stem) || stem < 0 || stem >= BED.length || !real(base) || !real(len)) return null
  const full = fullOf(stem)
  if (base < 0 || len < MIN_PIECE || base + len > full + 0.5) return null
  // Only the top of a stem has the flower, and only a flower can be spent.
  const top = base + len >= full - 0.5
  return { stem, base: round1(base), len: round1(len), head: head === true && top, spent: spent === true && head === true && top }
}

function readList<T>(raw: unknown, most: number, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return []
  const list: T[] = []
  for (const item of raw) {
    const piece = read(item)
    if (piece) list.push(piece)
  }
  // The newest are kept: the oldest on the path are the ones the robin would have taken.
  return list.slice(-most)
}

export function freshBed(): number[] {
  return BED.map((_, index) => fullOf(index))
}

export function deserialize(raw: unknown, childAge: number | null = null, ladder: readonly string[] = LADDER): Saved {
  const turn = readTurn(raw, childAge, ladder)
  if (!isReadable(raw)) return { ...turn, bed: freshBed(), vase: [], path: [], street: [], shown: [] }
  const bed = freshBed().map((full, index) => {
    const height = Array.isArray(raw.bed) ? raw.bed[index] : undefined
    return real(height) ? Math.min(full, Math.max(MIN_STALK, round1(height))) : full
  })
  const standing = (item: unknown): InVase | null => {
    const piece = readPiece(item)
    const at = (item as { at?: unknown } | null)?.at
    return piece ? { ...piece, at: whole(at) ? Math.min(10, Math.max(-10, at)) : 0 } : null
  }
  // A finished turn has no vase on the table, so nothing stands in one.
  const vase = turn.finished ? [] : readList<InVase>(raw.vase, BOOT.holds, standing)
  const street: Bouquet[] = []
  for (const item of Array.isArray(raw.street) ? raw.street : []) {
    if (typeof item !== 'object' || item === null) continue
    const { who, pieces } = item as Record<string, unknown>
    if (typeof who !== 'string' || !(VISITORS as readonly string[]).includes(who) || street.some((bouquet) => bouquet.who === who)) continue
    const kept = readList<InVase>(pieces, BOOT.holds, standing)
    // A bouquet with nothing left of it is no bouquet. The one at the table carries none: it gave its old one up as it came in.
    if (kept.length > 0 && (turn.finished || who !== turn.position.split('-')[0])) street.push({ who: who as VisitorId, pieces: kept })
  }
  const shown = SHOWINGS.filter((showing) => Array.isArray(raw.shown) && raw.shown.includes(showing))
  const path = readList<OnPath>(raw.path, PATH_HOLDS, (item) => {
    const piece = readPiece(item)
    if (!piece) return null
    const { x, y, rot } = item as Record<string, unknown>
    if (!real(x) || !real(y) || !real(rot)) return null
    return { ...piece, x: Math.round(Math.min(PATH.right, Math.max(PATH.left, x))), y: Math.round(Math.abs(rot) < 0.5 ? Math.min(EARTH.bottom, Math.max(EARTH.top, y)) : Math.min(PATH.bottom, Math.max(PATH.top, y))), rot: Math.round(Math.max(-Math.PI, Math.min(Math.PI, rot)) * 100) / 100 }
  })
  return { ...turn, bed, vase, path, street, shown }
}

export function serialize(state: Saved): Saved {
  const standing = ({ stem, base, len, head, spent, at }: InVase): InVase => ({ stem, base: round1(base), len: round1(len), head, spent, at })
  return {
    ...writeTurn(state),
    bed: state.bed.map(round1),
    vase: state.vase.map(standing),
    street: state.street.map(({ who, pieces }) => ({ who, pieces: pieces.map(standing) })),
    shown: [...state.shown],
    path: state.path.map(({ stem, base, len, head, spent, x, y, rot }) => ({ stem, base: round1(base), len: round1(len), head, spent, x: Math.round(x), y: Math.round(y), rot: Math.round(rot * 100) / 100 })),
  }
}

export { STATE_VERSION }
