import { DOLL, DOLL_SCALE, headY, type DollId } from './figures'
import { BASKET, type Spot } from './layout'
import type { PieceId } from './pieces'
import { topOf } from './shape'
import type { Piece } from './thing'

// The basket and what is in it. Its wicker is dense: what is inside is hidden, and only heads look out, three
// at most, each whole and upright and none over another's face. Upright, they look over the rim. On its side
// the basket is seen into its round mouth, and the heads are in the mouth. A thing in the basket is a little
// way in, and drawn a little smaller. Everything else in the basket is not drawn. The view draws by these
// numbers and a touch is answered by them. Nothing here draws or reads a clock.

/** The upright basket's rim: what is behind the wicker below this line is hidden. */
export const RIM_Y = BASKET.y - BASKET.height * 0.72
/** The basket on its side, seen into its mouth: a disc, and the round opening in it. Things in it are drawn at `size`. */
export const LYING = { x: BASKET.x + 4, y: BASKET.y - 72, r: 96, opening: 84, size: 0.6 } as const
/** Things in the upright basket are a little way back, and drawn at this size. */
export const UPRIGHT_SIZE = 0.8

/** The size a thing is drawn at: its own outside the basket (`far` 0), and smaller the further in it is. */
export function sizeIn(far: number, tip: number): number {
  return 1 - far * ((1 - UPRIGHT_SIZE) + (UPRIGHT_SIZE - LYING.size) * tip)
}

/** The things with a head, in the order they are laid in the basket, the farthest first. */
export const HEADS: readonly PieceId[] = ['doll-tall', 'doll-small', 'doll-round', 'horse']
type Slot = 'middle' | 'right' | 'left'
/** Where a head looks out, as its middle from the basket's: upright from the rim's middle, lying from the mouth's middle. */
const SLOTS: Record<Slot, { up: Spot; side: Spot }> = {
  middle: { up: { x: 0, y: 0 }, side: { x: 0, y: -22 } },
  right: { up: { x: 64, y: 0 }, side: { x: 40, y: 44 } },
  left: { up: { x: -64, y: 0 }, side: { x: -40, y: 44 } },
}
const OWN: Partial<Record<PieceId, Slot>> = { 'doll-tall': 'middle', 'doll-round': 'right', 'doll-small': 'left' }

/** The middle of a thing's head from its foot, and the head's radius. The horse faces right. */
function head(id: PieceId): { x: number; up: number; r: number } {
  if (id === 'horse') return { x: 72, up: 142, r: 32 }
  const doll = id as DollId
  return { x: 0, up: -headY(doll) * DOLL_SCALE, r: DOLL[doll].head * DOLL_SCALE }
}

/** Which of the things in the basket look out, and from where: each doll from its own slot, and the horse from the middle or the right if no doll is there. At most three. */
export function lookingOut(inside: readonly PieceId[]): Partial<Record<PieceId, Slot>> {
  const out: Partial<Record<PieceId, Slot>> = {}
  for (const id of inside) if (OWN[id]) out[id] = OWN[id]
  if (inside.includes('horse')) {
    // The horse's neck and back reach to its left, so it never looks out from the left, where they would hang over the side.
    const free = (['middle', 'right'] as const).find((slot) => !Object.values(out).includes(slot))
    if (free) out.horse = free
  }
  return out
}

/** Where the foot of a thing that looks out stands, so that its whole head shows: over the rim of the upright basket, in the mouth of the lying one. */
export function lookoutFoot(id: PieceId, slot: Slot, tipped: boolean): Spot {
  const h = head(id)
  if (tipped) {
    const at = SLOTS[slot].side
    return { x: LYING.x + at.x - h.x * LYING.size, y: LYING.y + at.y + h.up * LYING.size }
  }
  // The horse's chin is on the rim, and at the right it stands a little further out, so that its mane is clear of the face in the middle. A doll's chin is a little over the rim, clear of the horse's back.
  const k = UPRIGHT_SIZE
  return id === 'horse' ? { x: BASKET.x + SLOTS[slot].up.x + (slot === 'right' ? 14 : 0) - h.x * k, y: RIM_Y + (h.up - h.r) * k } : { x: BASKET.x + SLOTS[slot].up.x, y: RIM_Y - 8 + (h.up - h.r) * k }
}

/** The middle of that head on the stage, and its radius as drawn. */
export function lookoutHead(id: PieceId, slot: Slot, tipped: boolean): { x: number; y: number; r: number } {
  const h = head(id), foot = lookoutFoot(id, slot, tipped), k = tipped ? LYING.size : UPRIGHT_SIZE
  return { x: foot.x + h.x * k, y: foot.y - h.up * k, r: h.r * k }
}

/** Where the foot of a thing that does not look out is: so deep that none of it shows. */
export function hiddenFoot(id: PieceId, tipped: boolean): Spot {
  return tipped ? { x: LYING.x, y: LYING.y + LYING.opening + topOf(id) * LYING.size + 10 } : { x: BASKET.x, y: RIM_Y + topOf(id) * UPRIGHT_SIZE + 10 }
}

/** Where a thing on its way in is, whole, before it sinks: just over the rim, or in the mouth. */
export function overRim(tipped: boolean): Spot {
  return tipped ? { x: LYING.x, y: LYING.y + LYING.opening - 4 } : { x: BASKET.x, y: RIM_Y - 4 }
}

/** Where every thing that is in the basket rests. */
export function basketRests(pieces: readonly Piece[], tipped: boolean): Map<Piece, Spot> {
  const inside = pieces.filter((p) => p.at === 'basket'), out = lookingOut(inside.map((p) => p.def.id))
  return new Map(inside.map((p) => { const slot = out[p.def.id]; return [p, slot ? lookoutFoot(p.def.id, slot, tipped) : hiddenFoot(p.def.id, tipped)] }))
}

/** The order the things in the basket are drawn in: the ones with no head first, then the heads by where they look out, the middle one behind the two at its sides. */
export function insideOrder(pieces: readonly Piece[]): Piece[] {
  const inside = pieces.filter((p) => p.far >= 1), out = lookingOut(inside.filter((p) => p.at === 'basket').map((p) => p.def.id))
  const rank = (p: Piece): number => { const slot = out[p.def.id]; return slot === 'middle' ? 1 : slot === 'right' ? 2 : slot === 'left' ? 3 : 0 }
  return inside.sort((a, b) => rank(a) - rank(b))
}

/** The highest any head, hat or ear reaches over the rim of the upright basket. */
const HEADROOM = Math.max(...HEADS.flatMap((id) => (['middle', 'right', 'left'] as const).map((slot) => RIM_Y - (lookoutFoot(id, slot, false).y - topOf(id) * UPRIGHT_SIZE))))
/** What answers a touch as the upright basket: the basket and every head and hat that can look over its rim. It stops short of the mat's end on the left, and on the right it takes in the peak of a cap. */
export const BASKET_BOX = { left: BASKET.x - BASKET.halfWidth - 6, right: BASKET.x + BASKET.halfWidth + 24, top: RIM_Y - HEADROOM - 6, bottom: BASKET.y + 6 } as const

/** Whether a point of the stage is where the basket lets a thing in it show: over the rim and between its sides, or inside the round mouth. The view draws what is in the basket inside this and nowhere else. */
export function inMouth(x: number, y: number, tipped: boolean): boolean {
  return tipped ? Math.hypot(x - LYING.x, y - LYING.y) <= LYING.opening : y <= RIM_Y && x >= BASKET_BOX.left && x <= BASKET_BOX.right
}

/** Whether a point of the stage is on the basket: its box upright, its disc lying. */
export function inBasket(x: number, y: number, tipped: boolean): boolean {
  return tipped ? Math.hypot(x - LYING.x, y - LYING.y) <= LYING.r + 4 : x >= BASKET_BOX.left && x <= BASKET_BOX.right && y >= BASKET_BOX.top && y <= BASKET_BOX.bottom
}

/** The middle of the basket, where the idle hand points. */
export function basketMiddle(tipped: boolean): Spot {
  return tipped ? { x: LYING.x, y: LYING.y } : { x: BASKET.x, y: BASKET.y - BASKET.height * 0.4 }
}
