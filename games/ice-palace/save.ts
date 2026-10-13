import { BALL, BERRY_LEN, ICICLE, KINDS, MOST_DENTS, PLACES, SMALL_BALL, STUB, bears, freeSpot, hangPlace, restOnBank, widthOf, type Kind, type Place, type Rest } from './blocks'
import { BERRY, firstWorld } from './first'
import { BOUGH, GROUND_Y, MAX_LEN, MIN_LEN, SCOOPS, inHole, onPond, sawable, type Hole } from './ground'
import { MOST_BLOCKS, MOST_HOLES } from './limits'
import { STAGE } from './stage'
import { deserialize, isReadable, serialize, type GameState } from './state'
import type { World } from './toy'

// The clearing as it is saved: the template's fields (state.ts) and the
// game's own, read a second time from the same record and repaired one by
// one. A save holds everything at rest; toy.ts says where a thing in the
// hand or in the air counts as being.
//
// The game has one place in its designed order, so `position` never moves.
// `night` says whether the sun is down, and `finished` always equals it: the
// night is the ending of a cycle, and it stands until the child lifts the sun.

export type Saved = GameState & World

const whole = (value: unknown, least: number, most: number): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= least && value <= most ? Math.round(value) : null)

function holeFrom(raw: unknown): Hole | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const x = whole(r.x, 0, STAGE.width), y = whole(r.y, 0, STAGE.height), len = whole(r.len, MIN_LEN, MAX_LEN)
  if (x === null || y === null || len === null || typeof r.angle !== 'number' || !Number.isFinite(r.angle) || !sawable(x, y)) return null
  return { x, y, len, angle: Math.round(r.angle * 100) / 100 }
}

/** The length a thing of this kind may have: the berry block, a snowball and an icicle have their own, and everything else is as long as it was cut or scooped. */
function lenFrom(kind: Kind, raw: unknown): number | null {
  if (kind === 'berry') return BERRY_LEN
  if (kind === 'ball') return raw === SMALL_BALL ? SMALL_BALL : BALL
  if (kind === 'icicle') return raw === STUB ? STUB : ICICLE
  return whole(raw, MIN_LEN, MAX_LEN)
}

function blockFrom(raw: unknown): Rest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!(KINDS as readonly unknown[]).includes(r.kind) || !(PLACES as readonly unknown[]).includes(r.place)) return null
  const kind = r.kind as Kind
  const x = whole(r.x, 0, STAGE.width), y = whole(r.y, 0, STAGE.height), len = lenFrom(kind, r.len)
  if (x === null || y === null || len === null) return null
  // Only a snow block is dented, and only a block that bears others wears a cap.
  const dent = kind === 'snow' && Array.isArray(r.dent) ? r.dent.map((d) => whole(d, -len / 2, len / 2)).filter((d): d is number => d !== null).slice(-MOST_DENTS) : []
  return { kind, len, x, y, place: r.place as Place, dent, cap: bears(kind) && r.cap === true }
}

/**
 * A clearing in which nothing covers anything, whatever the record held: each thing is set down again exactly
 * as the game would set it, and a thing that is already in a legal place stays there. There is always one
 * berry block and never two.
 */
export function legalWorld(blocks: readonly Rest[], holes: readonly Hole[]): { blocks: Rest[]; holes: Hole[] } {
  const kept: Rest[] = []
  const placed = new Map<Rest, Rest>()
  let berry = false
  // The standing things first and lowest first, so each finds what bore it already in place; then what hangs, then what lies.
  const standing = blocks.filter((b) => b.place === 'built').sort((a, b) => b.y - a.y)
  const hung = blocks.filter((b) => b.place === 'hung')
  for (const block of [...standing, ...hung, ...blocks.filter((b) => b.place !== 'built' && b.place !== 'hung')]) {
    // One place is kept for the berry block until it has been found.
    if (kept.length >= MOST_BLOCKS - (berry || block.kind === 'berry' ? 0 : 1)) continue
    if (block.kind === 'berry') {
      if (berry) continue
      berry = true
    }
    const w = widthOf(block)
    const built = kept.filter((b) => b.place === 'built' || b.place === 'hung'), lying = kept.filter((b) => b.place !== 'built' && b.place !== 'hung')
    const hole = holes.find((h) => inHole(h, block.x, block.y) && !kept.some((b) => b.place === 'afloat' && b.x === h.x && b.y === h.y))
    const hang = block.place === 'hung' && block.kind === 'icicle' ? hangPlace(block.x, block.y, built) : null
    const rest = block.place === 'built' || block.place === 'hung' ? restOnBank(w, block.x, block.y, built) : null
    let now: Rest
    if (block.place === 'afloat' && (block.kind === 'berry' || block.kind === 'ball') && hole) now = { ...block, x: hole.x, y: hole.y }
    else if (hang) now = { ...block, x: hang.x, y: hang.y }
    else if (rest) now = { ...block, x: rest.x, y: rest.y, place: 'built' }
    else {
      const spot = freeSpot(w, block.x, Math.max(block.y, GROUND_Y), lying, holes)
      // Only an icicle on the pond's ice stays frozen in; anything else lies.
      now = { ...block, ...spot, place: block.place === 'frozen' && block.kind === 'icicle' && onPond(spot.x, spot.y) ? 'frozen' : 'lying' }
    }
    kept.push(now)
    placed.set(block, now)
  }
  if (!berry) {
    const spot = freeSpot(BERRY.len, BERRY.x, BERRY.y, kept.filter((b) => b.place !== 'built' && b.place !== 'hung'), holes)
    kept.push({ ...BERRY, x: spot.x, y: spot.y })
  }
  // In the order the record had them, so a save read and written again is the same record.
  const inOrder = blocks.map((block) => placed.get(block)).filter((block): block is Rest => block !== undefined)
  return { blocks: [...inOrder, ...kept.filter((block) => !inOrder.includes(block))], holes: holes.map((hole) => ({ ...hole })) }
}

/** Saved state is untrusted. A record this build cannot read gives a first visit for the child's age; inside a record each field is repaired by itself. */
export function deserializeClearing(raw: unknown, childAge: number | null): Saved {
  const base = deserialize(raw, childAge)
  if (!isReadable(raw)) {
    const first = firstWorld(childAge)
    return { ...base, finished: false, ...first, ...legalWorld(first.blocks, first.holes) }
  }
  const holes = Array.isArray(raw.holes) ? raw.holes.map(holeFrom).filter((hole): hole is Hole => hole !== null).slice(0, MOST_HOLES) : []
  const blocks = Array.isArray(raw.blocks) ? raw.blocks.map(blockFrom).filter((block): block is Rest => block !== null) : []
  // The game's own field wins over the template's, so the two never disagree.
  const night = raw.night === true
  const icicles = Array.isArray(raw.icicles) ? [...new Set(raw.icicles.map((i) => whole(i, 0, BOUGH.length - 1)).filter((i): i is number => i !== null))] : []
  return { ...base, finished: night, night, drift: whole(raw.drift, 0, SCOOPS) ?? 0, icicles, ...legalWorld(blocks, holes) }
}

export function serializeClearing(state: Saved): Saved {
  return {
    ...serialize(state),
    finished: state.night,
    night: state.night,
    blocks: state.blocks.map(({ kind, len, x, y, place, dent, cap }) => ({ kind, len, x, y, place, dent: [...dent], cap })),
    holes: state.holes.map(({ x, y, angle, len }) => ({ x, y, angle, len })),
    drift: state.drift,
    icicles: [...state.icicles],
  }
}
