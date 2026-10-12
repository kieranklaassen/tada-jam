import { HULLS, MAKINGS, bareBuild, deckSpot, shapeOf, type Build, type HullKind, type LoadKind, type Making, type MastKind, type SailKind, type Slot } from './build'
import { BANK, STONE, clamp, shoreAt, type Spot, WATER } from './layout'
import type { SoundName } from './voices'

// The twelve makings as things in the world: where each rests, and where it
// is drawn while it is held, flies, floats or is part of an answer. The
// boat's build is read off the pieces that are on it, so there is one truth.

/** Where a piece rests, or will rest once it has stopped moving. */
export type Place =
  | { on: 'bank'; x: number; y: number }
  /** The hull of the boat: on the stone or afloat. */
  | { on: 'hull' }
  | { on: 'mast'; index: 0 | 1 }
  | { on: 'sail'; index: 0 | 1 }
  /** On the deck; `order` only says which was put there first. */
  | { on: 'deck'; order: number }

/** `act`: an answer has it and says where it is drawn. */
export type Mode = 'rest' | 'held' | 'fly' | 'float' | 'act'

export type Piece = {
  kind: Making
  place: Place
  mode: Mode
  /** Where it is drawn, in stage units. For a piece at rest on the boat the boat's own pose decides. */
  x: number
  y: number
  /** Turned and scaled by an answer that has it; 0 and 1 otherwise. */
  rot: number
  scale: number
  alpha: number
  /** An answer draws it behind whoever has it. */
  behind: boolean
  /** A flight: where it began, how long it takes and how far along it is, in seconds. */
  fromX: number
  fromY: number
  flight: number
  t: number
  /** How high the flight arcs over the straight line, in stage units. */
  arc: number
  /** It is on its way back to where it was picked up from, which nobody answers. */
  back: boolean
  /** A spot it knocks on before it flies on to where it rests: the stone, for a thing the boat had no room for. */
  knock: Spot | null
  /** Afloat: the push a ring has given it, in stage units a second, dying away. */
  pushX: number
  pushY: number
  /** The sound of its next landing, when that is not its own. */
  lands: SoundName | null
  /** 0 lying as on the bank, 1 standing as on the boat. */
  stand: number
  /** A squash that rings out after a landing or a lift: -1 to 1, easing to 0. */
  squash: number
  squashV: number
  /** The swing of a thing held by one end, in radians. */
  swing: number
  swingV: number
  /** How far it sits lifted over the place it rests on while it rolls there: a berry coming to its place. */
  roll: number
  /** Who rides it while it floats: the dragonfly on a leaf, a beetle in the acorn cap. */
  rider: 'fly' | 'beetle' | null
}

export function newPiece(kind: Making, place: Place): Piece {
  const at = place.on === 'bank' ? place : { x: 0, y: 0 }
  return {
    kind, place, mode: 'rest', x: at.x, y: at.y, rot: 0, scale: 1, alpha: 1, behind: false, fromX: at.x, fromY: at.y, flight: 0, t: 0, arc: 0, back: false, knock: null, pushX: 0, pushY: 0, lands: null,
    stand: place.on === 'bank' ? 0 : 1, squash: 0, squashV: 0, swing: 0, swingV: 0, roll: 0, rider: null,
  }
}

export const onBoat = (piece: Piece): boolean => piece.place.on !== 'bank'

/** The pieces on the deck, in the order they were put there. */
function deckPieces(pieces: readonly Piece[]): Piece[] {
  return pieces
    .filter((piece) => piece.place.on === 'deck')
    .sort((a, b) => (a.place as { order: number }).order - (b.place as { order: number }).order)
}

/** The boat as built, read off the pieces. */
export function buildOf(pieces: readonly Piece[]): Build {
  const build = bareBuild(null)
  for (const piece of pieces) {
    if (piece.place.on === 'hull') build.hull = piece.kind as HullKind
    else if (piece.place.on === 'mast') build.masts[piece.place.index] = piece.kind as MastKind
    else if (piece.place.on === 'sail') build.sails[piece.place.index] = piece.kind as SailKind
  }
  build.deck = deckPieces(pieces).map((piece) => piece.kind as LoadKind | SailKind)
  return build
}

/** The slot of a piece that is on the hull, in the words of build.ts. */
export function slotOf(piece: Piece, pieces: readonly Piece[]): Slot | null {
  if (piece.place.on === 'mast' || piece.place.on === 'sail') return { on: piece.place.on, index: piece.place.index }
  if (piece.place.on === 'deck') return { on: 'deck', index: deckPieces(pieces).indexOf(piece) }
  return null
}

/** The place for a slot `placeFor` gave: a new thing on the deck comes after everything already there. */
export function placeOf(slot: Slot, pieces: readonly Piece[]): Place {
  if (slot.on !== 'deck') return { on: slot.on, index: slot.index }
  const last = deckPieces(pieces).reduce((most, piece) => Math.max(most, (piece.place as { order: number }).order), 0)
  return { on: 'deck', order: last + 1 }
}

/** Where a piece on the boat sits, from the keel point: the middle of a mast, the middle of a sail, the middle of a thing on the deck. The hull sits at the keel point. */
export function seatOf(piece: Piece, pieces: readonly Piece[]): Spot {
  const slot = slotOf(piece, pieces)
  if (!slot) return { x: 0, y: 0 }
  const build = buildOf(pieces), shape = shapeOf(build)
  if (slot.on === 'mast') return { x: shape.holes[slot.index], y: shape.deck - MAKINGS[piece.kind].length / 2 }
  if (slot.on === 'sail') {
    const mast = build.masts[slot.index]
    return { x: shape.holes[slot.index], y: shape.deck - (mast ? MAKINGS[mast].length : 170) * 0.6 }
  }
  return deckSpot(build, slot.index)
}

/** The top of the mast in hole `index`, from the keel point; the deck when the hole is empty. */
export function mastTop(build: Build, index: 0 | 1): Spot {
  const shape = shapeOf(build), mast = build.masts[index]
  return { x: shape.holes[index], y: shape.deck - (mast ? MAKINGS[mast].length : 0) }
}

/** The room a making takes lying at `at`, as a box. */
export type Box = { left: number; right: number; top: number; bottom: number }

export function boxOf(kind: Making, at: Spot): Box {
  const { hw, hh } = MAKINGS[kind]
  return { left: at.x - hw, right: at.x + hw, top: at.y - hh, bottom: at.y + hh }
}

export const overlaps = (a: Box, b: Box): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/** The top of the flat stone, with the room a hull standing on it and the gnome beside it take: nothing is set down there. */
export const STONE_TOP: Box = { left: STONE.left - 6, right: STONE.right + 6, top: STONE.edge, bottom: 670 }

/** Whether a spot on the bank is clear for `kind`: inside the bank, off the stone's top, and on no other thing lying there. */
export function clear(at: Spot, kind: Making, self: Piece | null, pieces: readonly Piece[]): boolean {
  const box = boxOf(kind, at)
  if (box.left < BANK.left || box.right > BANK.right || box.bottom > BANK.bottom) return false
  if (box.top < Math.max(shoreAt(box.left), shoreAt(box.right), shoreAt(at.x)) + 8) return false
  if (overlaps(box, STONE_TOP)) return false
  for (const other of pieces) {
    if (other === self || other.place.on !== 'bank') continue
    if (overlaps(box, boxOf(other.kind, other.place))) return false
  }
  return true
}

/**
 * The nearest clear spot on the bank to where a thing was let go or is set down, so a thing dropped onto
 * another comes to lie beside it and never on it. Every spot of the bank is tried, nearest first, so that
 * while there is room anywhere a thing has a place of its own. Whole numbers, since whole numbers are what
 * is saved: a spot that is clear stays clear.
 */
export function freeSpot(want: Spot, kind: Making, self: Piece | null, pieces: readonly Piece[]): Spot {
  const { hw, hh } = MAKINGS[kind]
  const x = clamp(want.x, BANK.left + hw, BANK.right - hw)
  const start = { x: Math.round(x), y: Math.round(clamp(want.y, shoreAt(x) + 8 + hh, BANK.bottom - hh)) }
  if (clear(start, kind, self, pieces)) return start
  let best: Spot | null = null, nearest = Infinity
  for (let gx = Math.ceil(BANK.left + hw); gx <= BANK.right - hw; gx += 10) {
    // A fine step down the bank: the sand is laid close, and a long thing fits between two others only to a hair.
    for (let gy = Math.ceil(WATER.bottom + 8 + hh); gy <= BANK.bottom - hh; gy += 2) {
      // A step across the bank is nearer than the same step up or down it: things come to lie side by side.
      const far = Math.hypot(gx - start.x, (gy - start.y) * 1.5)
      if (far < nearest && clear({ x: gx, y: gy }, kind, self, pieces)) { best = { x: gx, y: gy }; nearest = far }
    }
  }
  return best ?? start
}

/** A spring that eases a value to 0 and overshoots on the way: one step. */
export function ringOut(value: number, speed: number, dt: number, stiffness: number, damping: number): [number, number] {
  const v = speed + (-stiffness * value - damping * speed) * dt
  return [value + v * dt, v]
}

/** The hull's shape for a kind, or the bark's when the stone is bare. */
export const hullShape = (kind: HullKind | null) => HULLS[kind ?? 'bark']
