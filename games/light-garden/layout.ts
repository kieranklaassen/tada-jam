import { BLUE, GREEN, RED, WHITE, type Mask } from './optics'

// The light table in table-plane centimetres: x to the right, y toward the
// child. The glowing panel is where light plays; a dark frame rings it, and
// the near lip holds a felt-lined tray with a slot for every piece.

export type Point = { x: number; y: number }

export const PANEL = { minX: -60, maxX: 60, minY: -34, maxY: 34 } as const
export const FRAME = 8
export const TABLE = { minX: PANEL.minX - FRAME, maxX: PANEL.maxX + FRAME, minY: PANEL.minY - FRAME, maxY: 64 } as const
export const TRAY = { minX: -62, maxX: 62, minY: 41, maxY: 59, y: 50 } as const

export type PieceKind = 'lamp' | 'mirror' | 'prism' | 'filter'
export type PieceId = 'lampA' | 'lampB' | 'mirror1' | 'mirror2' | 'prism' | 'filterR' | 'filterG' | 'filterB'

export type PieceSpec = { id: PieceId; kind: PieceKind; slot: number; mask: Mask; radius: number }

export const PIECES: readonly PieceSpec[] = [
  { id: 'lampA', kind: 'lamp', slot: 0, mask: WHITE, radius: 5 },
  { id: 'lampB', kind: 'lamp', slot: 1, mask: WHITE, radius: 5 },
  { id: 'prism', kind: 'prism', slot: 2, mask: WHITE, radius: 5.5 },
  { id: 'mirror1', kind: 'mirror', slot: 3, mask: WHITE, radius: 5.5 },
  { id: 'mirror2', kind: 'mirror', slot: 4, mask: WHITE, radius: 5.5 },
  { id: 'filterR', kind: 'filter', slot: 5, mask: RED, radius: 5 },
  { id: 'filterG', kind: 'filter', slot: 6, mask: GREEN, radius: 5 },
  { id: 'filterB', kind: 'filter', slot: 7, mask: BLUE, radius: 5 },
]

export const PIECE_IDS = PIECES.map((piece) => piece.id)

/** Half the length of a mirror or filter pane, and the prism's circumradius. */
export const MIRROR_HALF = 5.6
export const FILTER_HALF = 4.6
export const PRISM_RADIUS = 5.6
/** A lamp's body swallows light; its lens sits this far in front of its centre. */
export const LAMP_BODY = 3.4
export const LAMP_LENS = 4.4

/** Where each piece keeps its turning knob: an angle relative to the piece, and a distance from its centre. */
export const KNOB: Readonly<Record<PieceKind, { angle: number; distance: number }>> = {
  lamp: { angle: Math.PI, distance: 9.5 },
  mirror: { angle: Math.PI / 2, distance: 8.5 },
  prism: { angle: Math.PI, distance: 9 },
  filter: { angle: Math.PI / 2, distance: 8 },
}

/** One tap turns a piece this far (a sixteenth of a turn). */
export const TURN_STEP = Math.PI / 8

export function slotPoint(slot: number): Point {
  return { x: -52.5 + slot * 15, y: TRAY.y }
}

export type CreatureKind = 'moth' | 'fish' | 'snail' | 'jelly'
export type CreatureSpec = { kind: CreatureKind; wants: Mask; radius: number }

/** The four sleepers and the one colour of light that wakes each. */
export const CREATURES: readonly CreatureSpec[] = [
  { kind: 'moth', wants: WHITE, radius: 4.6 },
  { kind: 'fish', wants: RED, radius: 4.6 },
  { kind: 'snail', wants: RED | GREEN, radius: 4.6 },
  { kind: 'jelly', wants: GREEN | BLUE, radius: 4.6 },
]

export function clampToPanel(at: Point, margin: number): Point {
  return {
    x: Math.min(PANEL.maxX - margin, Math.max(PANEL.minX + margin, at.x)),
    y: Math.min(PANEL.maxY - margin, Math.max(PANEL.minY + margin, at.y)),
  }
}

export function onPanel(at: Point, margin = 0): boolean {
  return at.x >= PANEL.minX + margin && at.x <= PANEL.maxX - margin && at.y >= PANEL.minY + margin && at.y <= PANEL.maxY - margin
}

/** A drop here sends a piece home to its tray slot. */
export function overTray(at: Point): boolean {
  return at.y > PANEL.maxY + 2.5 && at.x > TABLE.minX - 6 && at.x < TABLE.maxX + 6
}

export type PiecePose = { id: PieceId; x: number; y: number; angle: number; inTray: boolean }

/**
 * Where everything starts. Age is a dial for the first puzzle, never a gate:
 * at 7–8 (or unknown) one tap of the lamp swings its beam onto the moth; from
 * 9 the moth sleeps on the other side, a knob turn or a mirror away.
 */
export function defaultLayout(childAge: number | null): { pieces: PiecePose[]; beds: Point[] } {
  const older = childAge !== null && childAge >= 9
  const pieces: PiecePose[] = PIECES.map((spec) => {
    const slot = slotPoint(spec.slot)
    return { id: spec.id, x: slot.x, y: slot.y, angle: trayAngle(spec.kind), inTray: true }
  })
  const lamp = pieces[0]
  Object.assign(lamp, { x: -46, y: 2, angle: 0, inTray: false })
  const beds: Point[] = older
    ? [
        { x: 4, y: -18 },
        { x: 38, y: 20 },
        { x: -14, y: 22 },
        { x: 36, y: -20 },
      ]
    : [
        { x: 2, y: 21 },
        { x: 40, y: -18 },
        { x: -16, y: -22 },
        { x: 36, y: 16 },
      ]
  return { pieces, beds }
}

/** How a piece sits in its tray slot: turned to show its best face to the camera. */
export function trayAngle(kind: PieceKind): number {
  switch (kind) {
    case 'lamp':
      return -Math.PI / 2
    case 'mirror':
    case 'filter':
      return 0
    case 'prism':
      return -Math.PI / 2
    default: {
      const never: never = kind
      return never
    }
  }
}

export function specOf(id: PieceId): PieceSpec {
  return PIECES.find((piece) => piece.id === id)!
}
