import { MAX_DELIVERIES, isShape, type SavedBond, type SavedPiece, type Shape } from './model'

// What goes into ctx.storage: the settled neighbourhood, the scaffolds that
// hold it, and the next three deliveries. Small plain JSON (150 buildings is
// roughly 9 KB), versioned, and read defensively so an old or damaged slot
// starts a fresh street. Version 1 slots (no scaffolds) still load.

export const SAVE_VERSION = 2
export type SavedStreet = { v: typeof SAVE_VERSION; pieces: SavedPiece[]; bonds: SavedBond[]; next: Shape[] }

export function serialize(pieces: readonly SavedPiece[], next: readonly Shape[], bonds: readonly SavedBond[] = []): SavedStreet {
  const kept = pieces.slice(0, MAX_DELIVERIES)
  return { v: SAVE_VERSION, pieces: kept, bonds: bonds.filter(([i, j]) => i < kept.length && j < kept.length).map(([i, j]) => [i, j] as const), next: next.slice(0, 3) }
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
  if ((raw.v !== 1 && raw.v !== SAVE_VERSION) || !Array.isArray(raw.pieces)) return null
  // Damaged pieces are dropped, so remember where each surviving one came from
  // and renumber the scaffolds to match; a scaffold to a dropped piece goes too.
  const pieces: SavedPiece[] = [], renumber = new Map<number, number>([[-1, -1]])
  raw.pieces.slice(0, MAX_DELIVERIES).forEach((value, index) => {
    const piece = readPiece(value)
    if (piece) { renumber.set(index, pieces.length); pieces.push(piece) }
  })
  const bonds: SavedBond[] = []
  for (const bond of Array.isArray(raw.bonds) ? raw.bonds : []) {
    if (!Array.isArray(bond) || bond.length !== 2 || !bond.every(Number.isInteger)) continue
    const i = renumber.get(bond[0]), j = renumber.get(bond[1])
    if (i !== undefined && j !== undefined && i !== j) bonds.push([i, j])
  }
  const next = Array.isArray(raw.next) && raw.next.length === 3 && raw.next.every(isShape) ? (raw.next as Shape[]) : []
  return { v: SAVE_VERSION, pieces, bonds, next }
}
