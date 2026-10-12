import { POKE, opening, openings, type Cell, type Opening } from './face'
import { FEET, LUMP, babySide, corner, highest, lumpAt, rectOf, topOf, type Rect } from './fort'
import { FIRED, ON_FLOOR, ON_HEAP, type FortState } from './fortState'
import { BABY_HOME, BABY_SCALE, BLANKET_HOME, BOARD, CAT_RUG, CAT_SEAT_X, CELL, COIL, CUSHIONS, CUSHION_HALF, CUSHION_RUG, FRONT_Z, GRAN, HEAP, HOOK, STRIP, TANGLE, faceToRoom, kindOf, type Vec } from './layout'

// Where everything rests, given only the saved state. Nothing here knows a
// clock: toy.ts moves things between these places, and when nothing is moving
// the picture is exactly these places. That is what makes the fort found as
// it was left: a load and a put-away both end here.

/** Where a thing is: its foot for a box, its middle for anything else. `flat` is 1 for a box folded on the heap, `side` 1 for one lying on its side. */
export type Pose = { x: number; y: number; z: number; flat: number; side: number }

const at = (x: number, y: number, z: number): Pose => ({ x, y, z, flat: 0, side: 0 })

/**
 * The boxes on the heap from the bottom up; the last is on top and is the one a finger takes. The smallest lies
 * on top, and of two the same size the lower id. A smaller box can stand wherever a bigger one can: on every
 * lid that bears the bigger one, in every gap on the rug, and it tips into less room. So while any box on the
 * heap has a place in the fort, the one on top has one.
 */
export function heaped(state: FortState): number[] {
  return state.boxes.filter((box) => box.on === ON_HEAP).map((box) => box.id).sort((a, b) => kindOf(b).w - kindOf(a).w || b - a)
}

export function restBox(state: FortState, id: number): Pose {
  const rect = rectOf(state, id)
  if (rect) return { x: rect.x, y: rect.foot, z: 0, flat: 0, side: rect.side ? 1 : 0 }
  const layer = heaped(state).indexOf(id)
  return { x: HEAP.x + (layer % 2 ? 0.05 : -0.04), y: 0.03 + layer * 0.07, z: HEAP.z - FRONT_Z, flat: 1, side: 0 }
}

/** How high the middle of a cushion in a box is above the box's foot, and how high its top: light from a hole below that is blocked. */
export const CUSHION_MID = 0.42
export const CUSHION_TOP = CUSHION_MID + 0.37

/** How much further back in a box its cushions are while the grandmother sits in it, and while the cat is at a hole of it or in it: behind where its head draws back to. */
export const CUSHION_BACK = 0.72
export const CUSHION_CAT = 0.28
/** The nearest the middle of a cushion comes to the back wall of its box, and how much nearer the front the first of two stays, so that they never share a plane. */
const CUSHION_WALL = 0.13, CUSHION_APART = 0.1

export function restCushion(state: FortState, index: number): Pose {
  const where = state.cushions[index]
  if (where === FIRED) {
    const layer = state.cushions.slice(0, index).filter((other) => other === FIRED).length
    return at(CUSHION_RUG.x + layer * 0.06, CUSHION_RUG.y + layer * 0.24, CUSHION_RUG.z + layer * 0.03)
  }
  if (where === ON_FLOOR) {
    // Flat on the rug in front of the boxes, where it was let go; one let go on another lies on it.
    const x = state.cushionAt[index] / 100, under = state.cushions.slice(0, index).filter((other, i) => other === ON_FLOOR && Math.abs(state.cushionAt[i] / 100 - x) < CUSHION_HALF * 2).length
    return { x, y: STRIP.y + under * STRIP.pile, z: FRONT_Z + STRIP.out, flat: STRIP.flat, side: 0 }
  }
  const rect = where >= 0 ? rectOf(state, where) : null
  if (!rect) return at(CUSHIONS[index].x, CUSHIONS[index].y, CUSHIONS[index].z)
  const slot = state.cushions.slice(0, index).filter((other) => other === where).length
  // Side by side where the box is wide enough, one behind the other where it is not; always clear of its walls.
  // With the grandmother sitting in the box they are at the back of it, behind her.
  // With the cat at a hole of the box, or in it, they are behind where its head is and draws back to.
  const cat = state.cat, catThere = (cat.at === 'look' || cat.at === 'in') && cat.box === where
  const behind = state.gran.at === 'in' && state.gran.box === where ? CUSHION_BACK : catThere ? CUSHION_CAT : 0
  // Never further back than the box is deep.
  const wall = FRONT_Z - kindOf(where).d + BOARD + CUSHION_WALL + (slot ? 0 : CUSHION_APART)
  return at(rect.x + (slot ? 1 : -1) * Math.max(0.03, Math.min(0.2 * rect.w, rect.w / 2 - 0.5)), rect.foot + Math.min(CUSHION_MID, rect.h / 2), Math.max(wall, FRONT_Z - 0.24 - behind - slot * 0.12))
}

/** How far behind the back of a box the one who is behind it is: the baby lying there, the cat that dropped down there. */
export const BEHIND = 0.2

/**
 * Where the baby is: its feet. At a box it lies on the rug behind it, hidden by it, with both feet out past the
 * wall on the side that has room (`babySide`); at a box on its side it sits in the open end.
 */
export function babyAt(state: FortState): Vec {
  const rect = state.baby >= 0 ? rectOf(state, state.baby) : null
  if (!rect) return BABY_HOME
  if (rect.side) return { x: rect.x, y: 0.04, z: FRONT_Z - 0.3 }
  const side = babySide(state, rect.id) || -1
  // Further behind than the cat, so that the rattle in its fist, which is cut in front of it, stays behind the board too.
  return { x: rect.x + side * (rect.w / 2 + FEET.out), y: 0, z: FRONT_Z - kindOf(rect.id).d - BEHIND - 0.25 }
}

/** What each toy is: how wide a slot must be for it to go through, in metres. A rattle, a ball and a block. */
export const TOY_SIZES: readonly number[] = [0.3, 0.12, 0.2]
const TOY_HELD: readonly Vec[] = [{ x: -0.36, y: 1.22, z: 0.03 }, { x: 0.39, y: 0.2, z: 0.1 }, { x: 0.62, y: 0.1, z: 0.3 }]

export function restToy(state: FortState, index: number): Pose {
  const where = state.toys[index], rect = where >= 0 ? rectOf(state, where) : null
  if (rect) return at(rect.x + (index - 1) * 0.24, rect.foot + 0.11, FRONT_Z - 0.42)
  const baby = babyAt(state), held = TOY_HELD[index]
  // A toy the baby holds is with the baby, and out of sight behind the box while the baby is at one.
  const home = state.baby >= 0 ? rectOf(state, state.baby) : null
  if (home) return home.side ? at(baby.x + 0.3, baby.y + 0.12, baby.z - 0.2) : at(home.x + Math.sign(baby.x - home.x) * (home.w / 2 - 0.3 - index * 0.06), 0.12, baby.z - index * 0.03)
  return at(baby.x + held.x * BABY_SCALE, baby.y + held.y * BABY_SCALE, baby.z + held.z * BABY_SCALE)
}

/** Where the cat sits on a box whose foot is at `pose`: its feet, to the left of the middle of the lid and clear of its edge. */
export function seatOn(id: number, pose: { x: number; y: number; z: number }, side = false): Vec {
  const kind = kindOf(id), w = side ? kind.h : kind.w, h = side ? kind.d : kind.h
  return { x: pose.x + Math.max(-w / 2 + 0.36, Math.min(w / 2 - 0.36, CAT_SEAT_X)), y: pose.y + h, z: FRONT_Z + pose.z - 0.5 }
}

/** Where the cat is once it has dropped down behind a box whose foot is at `pose`: out of sight, on whatever that box stands on. */
export function behindOf(id: number, pose: { x: number; y: number; z: number }): Vec {
  return { x: seatOn(id, pose).x, y: pose.y, z: FRONT_Z + pose.z - kindOf(id).d - BEHIND - 0.2 }
}

/** Where the cat sits when it is on the highest box or on the rug: its feet. */
export function catSeat(state: FortState): Vec {
  const top = state.cat.at === 'top' ? highest(state) : null
  return top ? seatOn(top.id, { x: top.x, y: top.foot, z: 0 }, top.side) : CAT_RUG
}

/** Whether the blanket lies over a box as a roof. */
export const roofed = (state: FortState, id: number): boolean => state.blanket.length === 2 && state.blanket.includes(id)

/** On a box this high or higher the cat lies down, so it stays under the home control. */
export const LOAF_FROM = 1.75

/** A hole as a character meets it: its middle in the room, and how wide a round thing goes through it. */
export type Hole = { box: number; cell: number; at: Vec; /** Metres. */ radius: number; /** The hole's own width, height and lowest edge, in metres. */ w: number; h: number; low: number; tunnel: boolean }

function holeOf(rect: Rect, open: Opening): Hole {
  return { box: rect.id, cell: open.cell, at: faceToRoom(rect, open.x, open.y), radius: open.radius * CELL, w: (open.right - open.left + 1) * CELL, h: (open.high - open.low + 1) * CELL, low: open.low * CELL, tunnel: false }
}

/** Every hole of the fort, and the open end of every box that lies on its side, which is a hole anyone fits. */
export function holes(state: FortState): Hole[] {
  return state.boxes.flatMap((box) => {
    const rect = rectOf(state, box.id)
    if (!rect) return []
    if (rect.side) return [{ box: box.id, cell: 0, at: { x: rect.x, y: rect.foot + rect.h / 2, z: FRONT_Z }, radius: Math.min(rect.w, rect.h) / 2 - 0.04, w: rect.w, h: rect.h, low: 0, tunnel: true }]
    return openings(box.face).map((open) => holeOf(rect, open))
  })
}

/** The hole a saved cell belongs to, or null. */
export function holeAt(state: FortState, box: number, cell: number): Hole | null {
  const rect = rectOf(state, box)
  if (!rect) return null
  if (rect.side) return holes(state).find((hole) => hole.box === box) ?? null
  const open = opening(state.boxes[box].face, cell)
  return open ? holeOf(rect, open) : null
}

/** The door of a box: its largest hole that reaches the floor, or null. It is where the grandmother goes in. */
export function doorOf(state: FortState, box: number): Hole | null {
  return holes(state).filter((hole) => hole.box === box && !hole.tunnel && hole.low <= 0.06).sort((p, q) => q.w * q.h - p.w * p.h)[0] ?? null
}

/** Half the room the grandmother takes up across a box she sits in, and half the width of her legs where they stick out of its door. */
export const GRAN_IN = { half: 0.4, legs: 0.3 }

/** Where the grandmother is: her feet. */
export function granAt(state: FortState): Vec {
  const gran = state.gran, rect = gran.at === 'chair' ? null : rectOf(state, gran.box)
  if (!rect) return { x: GRAN.x, y: 0, z: GRAN.z }
  // Wearing a box she stands in the middle of it, with all of her inside its walls.
  if (gran.at === 'skirt') return { x: rect.x, y: 0, z: FRONT_Z - SKIRT_IN }
  // Sitting in a box she sits behind its door, so that her legs come out where the board is cut away, and inside its walls.
  const door = doorOf(state, gran.box), half = rect.w / 2 - GRAN_IN.half
  return { x: door ? Math.max(rect.x - half, Math.min(rect.x + half, door.at.x)) : rect.x, y: 0, z: FRONT_Z - 0.45 }
}

/** How far behind the face the grandmother stands in a box she wears. */
export const SKIRT_IN = 0.75

/** The blanket as a strip of cloth: points along it from left to right, how far back it reaches, and how far its front edge hangs down. */
export type Cloth = { xs: number[]; ys: number[]; front: number; back: number; hang: number }
export const CLOTH_POINTS = 17

function cloth(shape: (t: number) => readonly [number, number], front: number, back: number, hang: number): Cloth {
  const xs: number[] = [], ys: number[] = []
  for (let i = 0; i < CLOTH_POINTS; i++) { const [x, y] = shape(i / (CLOTH_POINTS - 1)); xs.push(x); ys.push(y) }
  return { xs, ys, front, back, hang }
}

/** The blanket folded over the back of the sofa. */
export const foldedCloth = (): Cloth => cloth((t) => [BLANKET_HOME.x - 0.32 + t * 0.64, BLANKET_HOME.y + 0.2 + Math.sin(t * Math.PI) * 0.02], BLANKET_HOME.z + 0.16, BLANKET_HOME.z - 0.12, 0.62)

/** The blanket heaped on the rug, its middle at `x`. */
export const lumpCloth = (x: number): Cloth => cloth((t) => [x - LUMP / 2 + 0.04 + t * (LUMP - 0.08), 0.03 + Math.sin(t * Math.PI) ** 0.6 * 0.24 + Math.sin(t * 19) * 0.02], FRONT_Z - 0.05, FRONT_Z - 0.6, 0.02)

/** The blanket where the save has it: folded, heaped beside one box, or sagging between two as a roof. */
export function restCloth(state: FortState): Cloth {
  const under = state.blanket.map((id) => rectOf(state, id)).filter((rect): rect is Rect => rect !== null).sort((a, b) => a.x - b.x)
  if (under.length === 2) {
    const [a, b] = under, left = a.x - a.w / 2, right = b.x + b.w / 2, span = right - left + 0.3
    const edge = (x: number): number => {
      // Over a box it lies on the top; between two it sags; past the ends it hangs.
      if (x < left) return topOf(a) + 0.03 - (left - x) * 1.6
      if (x > right) return topOf(b) + 0.03 - (x - right) * 1.6
      if (x <= a.x + a.w / 2) return topOf(a) + 0.03
      if (x >= b.x - b.w / 2) return topOf(b) + 0.03
      const gap = b.x - b.w / 2 - (a.x + a.w / 2), t = (x - (a.x + a.w / 2)) / gap
      return topOf(a) + (topOf(b) - topOf(a)) * t + 0.03 - Math.sin(t * Math.PI) * Math.min(0.35, gap * 0.35)
    }
    // A point of it lies on each edge it bends over, so that it turns the corner of a lid and never cuts through it.
    const xs = Array.from({ length: CLOTH_POINTS }, (_, i) => left - 0.15 + (i / (CLOTH_POINTS - 1)) * span)
    const near = (x: number, from: number): number => xs.reduce((best, at, i) => (i >= from && Math.abs(at - x) < Math.abs(xs[best] - x) ? i : best), from)
    const first = near(left, 1), inner = near(a.x + a.w / 2, first + 1), next = near(b.x - b.w / 2, inner + 1), last = near(right, next + 1)
    xs[first] = left; xs[inner] = a.x + a.w / 2; xs[next] = Math.max(b.x - b.w / 2, xs[inner] + 0.01); xs[last] = right
    return cloth((t) => { const x = xs[Math.round(t * (CLOTH_POINTS - 1))]; return [x, edge(x)] }, FRONT_Z + 0.06, FRONT_Z - 0.8, 0.14)
  }
  const lump = lumpAt(state)
  return lump === null ? foldedCloth() : lumpCloth(lump)
}

/** The string of lights as the places of its bulbs, in order along it. */
export const BULBS = 12
/** How far in front of the corners it is hooked over a draped string hangs. */
export const BULBS_OUT = 0.13
/** A cushion laid flat, as the `flat` of its pose: level, where 1 is leaning. */
export const LIES_FLAT = 1.163

/** The bulbs of a string draped over `corners`, with `end` (when given) as the place its loose end is held. */
export function drapedBulbs(state: FortState, corners: readonly number[], end: Vec | null): Vec[] {
  const pins = corners.map((code) => corner(state, code)).filter((pin): pin is Vec => pin !== null)
  const first = pins[0] ?? end ?? HOOK
  // It hangs down from its first pin, loops from pin to pin, and ends hanging from the last, or in the hand.
  const path: Vec[] = [{ x: first.x - 0.12, y: first.y - 0.34, z: first.z }, ...pins, end ?? { x: pins[pins.length - 1].x + 0.12, y: pins[pins.length - 1].y - 0.34, z: first.z }]
  let whole = 0
  const lengths = path.slice(1).map((p, i) => { const length = Math.hypot(p.x - path[i].x, p.y - path[i].y) + 0.001; whole += length; return length })
  return Array.from({ length: BULBS }, (_, n) => {
    let along = ((n + 0.5) / BULBS) * whole, leg = 0
    while (leg < lengths.length - 1 && along > lengths[leg]) { along -= lengths[leg]; leg++ }
    const a = path[leg], b = path[leg + 1], t = Math.min(1, along / lengths[leg])
    const sag = leg === 0 || (leg === lengths.length - 1 && !end) ? 0 : Math.min(0.3, lengths[leg] * 0.22)
    // The string hangs a little way in front of the faces: in front of the blanket's hanging edge, and of the blanket when it comes down past it.
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag, z: a.z + (b.z - a.z) * t + BULBS_OUT }
  })
}

/** The bulbs where the save has the string: draped, in a tangle on the rug, or in a coil on its hook. */
export function restBulbs(state: FortState): Vec[] {
  if (state.lights.length > 0) return drapedBulbs(state, state.lights, null)
  return Array.from({ length: BULBS }, (_, n) => {
    const turn = n * 2.4
    // In a tangle on the rug: every bulb lies on it, none in it.
    if (state.tangled) return { x: TANGLE.x + Math.cos(turn) * 0.05 * (1 + (n % 4)), y: TANGLE.y + 0.1 + (n % 3) * 0.03, z: TANGLE.z + Math.sin(turn) * 0.04 * (1 + (n % 3)) }
    return { x: HOOK.x + Math.sin(turn) * 0.07 * (1 + (n % 3) * 0.5), y: HOOK.y - 0.08 - (n / (BULBS - 1)) * (COIL - 0.08), z: HOOK.z + 0.08 + (n % 2) * 0.03 }
  })
}

/** Where a finger takes the string: its loose end when it is draped, the tangle, or the coil on the hook. */
export function lightsGrip(state: FortState): Vec {
  if (state.lights.length > 0) { const bulbs = restBulbs(state); return bulbs[bulbs.length - 1] }
  return state.tangled ? { x: TANGLE.x, y: TANGLE.y + 0.05, z: TANGLE.z } : { x: HOOK.x, y: HOOK.y - COIL * 0.55, z: HOOK.z + 0.08 }
}

/** How far in front of the faces a fallen piece lies, and the strip of rug it may lie on: clear of the baby on the left and of the grandmother's way on the right, and behind the lanes the three walk along. */
export const PIECE_OUT = 0.24
export const PIECE_RUG = { left: -1.1, right: 1.75, deep: 0.34, wide: 0.9 }

export type PieceRest = {
  /** The middle and the lowest edge of the piece on its face, in cells, and its size in metres. */
  middle: number
  low: number
  wide: number
  tall: number
  /** How small it lies on the rug, 0 to 1, and where its middle lies along the rug. */
  small: number
  lies: number
}

/**
 * Where the piece that fell out of a cut lies: on the rug in front of and below the face it came from, small
 * enough to stay on its strip of rug. `left` is the left edge of that face along the rug.
 */
export function pieceRest(path: readonly Cell[], disc: boolean, left: number): PieceRest {
  let low = Infinity, high = -Infinity, least = Infinity, most = -Infinity
  for (const p of disc ? [{ x: path[0].x - POKE, y: path[0].y - POKE }, { x: path[0].x + POKE, y: path[0].y + POKE }] : path) { low = Math.min(low, p.y); high = Math.max(high, p.y); least = Math.min(least, p.x); most = Math.max(most, p.x) }
  const middle = (least + most) / 2, wide = (most - least) * CELL, tall = (high - low) * CELL
  const small = Math.min(1, PIECE_RUG.deep / Math.max(tall, 0.01), PIECE_RUG.wide / Math.max(wide, 0.01))
  const half = (wide * small) / 2
  return { middle, low, wide, tall, small, lies: Math.min(PIECE_RUG.right - half, Math.max(PIECE_RUG.left + half, left + middle * CELL)) }
}
