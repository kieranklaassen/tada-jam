// The eight things a child carries, in stage units. Each has a foot point (the middle of where it stands), a
// half width and a height above the foot, a place by the mat where it lies when it is not on the mat, and its
// own note. The numbers are the design sheet's: every target about 100 units across or more, three of a kind at
// most. Nothing here draws or reads a clock.

export const PIECE_IDS = ['arch-large', 'arch-middle', 'arch-small', 'doll-tall', 'doll-round', 'doll-small', 'horse', 'silk'] as const
export type PieceId = (typeof PIECE_IDS)[number]
export type Kind = 'arch' | 'doll' | 'horse' | 'silk'

export type PieceDef = {
  id: PieceId
  kind: Kind
  /** Half its width where it is widest. */
  halfWidth: number
  /** How far it reaches above its foot. */
  height: number
  /** The foot of its place by the mat. */
  home: { x: number; y: number }
  /** Its own note in hertz: a bar of the xylophone the mat is. The horse's is its first hoof, the silk's its bell. */
  note: number
  /** Half the width it keeps clear on the mat, so that feet never stand in each other. */
  reach: number
}

/** The arches as half rings: outer and inner radius. The rings overlap a little when nested, so the colours deepen there. */
export const ARCH_RING: Record<'arch-large' | 'arch-middle' | 'arch-small', { outer: number; inner: number }> = {
  'arch-large': { outer: 105, inner: 72 },
  'arch-middle': { outer: 78, inner: 46 },
  'arch-small': { outer: 52, inner: 20 },
}

const NEST = { x: 118, y: 332 }

export const PIECES: Record<PieceId, PieceDef> = {
  'arch-large': { id: 'arch-large', kind: 'arch', halfWidth: 105, height: 105, home: NEST, note: 261.63, reach: 96 },
  'arch-middle': { id: 'arch-middle', kind: 'arch', halfWidth: 78, height: 78, home: NEST, note: 329.63, reach: 72 },
  'arch-small': { id: 'arch-small', kind: 'arch', halfWidth: 52, height: 52, home: NEST, note: 392.0, reach: 50 },
  'doll-tall': { id: 'doll-tall', kind: 'doll', halfWidth: 55, height: 215, home: { x: 400, y: 302 }, note: 440.0, reach: 52 },
  'doll-round': { id: 'doll-round', kind: 'doll', halfWidth: 75, height: 175, home: { x: 590, y: 302 }, note: 523.25, reach: 70 },
  'doll-small': { id: 'doll-small', kind: 'doll', halfWidth: 62, height: 160, home: { x: 780, y: 302 }, note: 587.33, reach: 56 },
  horse: { id: 'horse', kind: 'horse', halfWidth: 94, height: 152, home: { x: 118, y: 612 }, note: 880.0, reach: 88 },
  silk: { id: 'silk', kind: 'silk', halfWidth: 90, height: 100, home: { x: 1062, y: 332 }, note: 1318.51, reach: 84 },
}

export const ALL_PIECES: readonly PieceDef[] = PIECE_IDS.map((id) => PIECES[id])

export function isPieceId(value: unknown): value is PieceId {
  return typeof value === 'string' && (PIECE_IDS as readonly string[]).includes(value)
}

/** The dolls and the horse are the characters: they have faces and move by themselves. The rest are plain. */
export function isCharacter(kind: Kind): boolean {
  return kind === 'doll' || kind === 'horse'
}

/** The order in which the idle hand offers things that lie by the mat: the dolls first, who are the nearest and the liveliest. */
export const OFFER_ORDER: readonly PieceId[] = ['doll-round', 'doll-tall', 'doll-small', 'arch-large', 'horse', 'arch-middle', 'silk', 'arch-small']
