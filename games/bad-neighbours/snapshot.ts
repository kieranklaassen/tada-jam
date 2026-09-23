import { MAX_DELIVERIES, isShape, type SavedPiece, type Shape } from './model'

// What goes into ctx.storage: the settled neighbourhood and the next three
// deliveries. Small plain JSON (150 buildings is roughly 9 KB), versioned,
// and read defensively so an old or damaged slot starts a fresh street.

export const SAVE_VERSION = 1
export type SavedStreet = { v: typeof SAVE_VERSION; pieces: SavedPiece[]; next: Shape[] }

export function serialize(pieces: readonly SavedPiece[], next: readonly Shape[]): SavedStreet {
  return { v: SAVE_VERSION, pieces: pieces.slice(0, MAX_DELIVERIES), next: next.slice(0, 3) }
}

function readPiece(value: unknown): SavedPiece | null {
  if (!value || typeof value !== 'object') return null
  const { shape, x, y, angle, secured } = value as Record<string, unknown>
  if (!isShape(shape)) return null
  if (typeof x !== 'number' || typeof y !== 'number' || typeof angle !== 'number') return null
  if (![x, y, angle].every(Number.isFinite)) return null
  // Anything outside the playable column would be removed as fallen on the first step.
  if (Math.abs(x) > 450 || y > 710 || y < -20000) return null
  return { shape, x, y, angle, secured: secured === true }
}

export function deserialize(value: unknown): SavedStreet | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.v !== SAVE_VERSION || !Array.isArray(raw.pieces)) return null
  const pieces = raw.pieces.slice(0, MAX_DELIVERIES).map(readPiece).filter((p): p is SavedPiece => p !== null)
  const next = Array.isArray(raw.next) && raw.next.length === 3 && raw.next.every(isShape) ? (raw.next as Shape[]) : []
  return { v: SAVE_VERSION, pieces, next }
}
