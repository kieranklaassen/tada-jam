import { clampToPanel, CREATURES, defaultLayout, PIECE_IDS, PIECES, slotPoint, trayAngle, type PieceId, type PiecePose, type Point } from './layout'

// The garden's saved shape: where every piece stands and which way it
// faces, and where each creature last lay down to sleep. Whether a creature
// is awake is not saved; they nap while the table is put away, and wake
// again as soon as their light finds them.

export const STATE_VERSION = 1

export type GardenState = {
  v: typeof STATE_VERSION
  pieces: PiecePose[]
  beds: Point[]
}

export function defaultGarden(childAge: number | null): GardenState {
  const { pieces, beds } = defaultLayout(childAge)
  return { v: STATE_VERSION, pieces, beds }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function wrapAngle(angle: number): number {
  if (angle >= -Math.PI && angle <= Math.PI) return angle
  const turn = Math.PI * 2
  return ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI
}

/** Saved state is untrusted: repair what can be repaired, default the rest. */
export function deserialize(raw: unknown, childAge: number | null): GardenState {
  const fallback = defaultGarden(childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return fallback

  const saved = new Map<PieceId, PiecePose>()
  if (Array.isArray(raw.pieces)) {
    for (const item of raw.pieces) {
      if (!isRecord(item) || typeof item.id !== 'string' || !(PIECE_IDS as readonly string[]).includes(item.id)) continue
      const id = item.id as PieceId
      if (saved.has(id)) continue
      const spec = PIECES.find((piece) => piece.id === id)!
      const x = finite(item.x)
      const y = finite(item.y)
      const angle = finite(item.angle)
      if (item.inTray === true || x === null || y === null) {
        const slot = slotPoint(spec.slot)
        saved.set(id, { id, x: slot.x, y: slot.y, angle: trayAngle(spec.kind), inTray: true })
        continue
      }
      const at = clampToPanel({ x, y }, spec.radius)
      saved.set(id, { id, x: at.x, y: at.y, angle: wrapAngle(angle ?? 0), inTray: false })
    }
  }
  const pieces = fallback.pieces.map((piece) => saved.get(piece.id) ?? piece)

  const beds = fallback.beds.map((bed, index) => {
    const item = Array.isArray(raw.beds) ? raw.beds[index] : undefined
    if (!isRecord(item)) return bed
    const x = finite(item.x)
    const y = finite(item.y)
    if (x === null || y === null) return bed
    return clampToPanel({ x, y }, CREATURES[index].radius + 1)
  })
  return { v: STATE_VERSION, pieces, beds }
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

export function serialize(state: GardenState): GardenState {
  return {
    v: STATE_VERSION,
    pieces: state.pieces.map((piece) => ({ id: piece.id, x: round(piece.x, 1), y: round(piece.y, 1), angle: round(wrapAngle(piece.angle), 3), inTray: piece.inTray })),
    beds: state.beds.map((bed) => ({ x: round(bed.x, 1), y: round(bed.y, 1) })),
  }
}
