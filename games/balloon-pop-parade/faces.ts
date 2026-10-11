import { PALETTE } from './palette'
import type { Vec3 } from './shapes'

// A face as a handful of small pillows: the whites of two eyes, two pupils
// that look where something is, a shine in each, two brows and a mouth of two
// halves that turn up or down, with an open middle. Pure: a face is a plan
// (where its parts sit on whatever carries them) and a state (what it is doing
// now), and `faceBits` turns the two into the pillows of this frame, which the
// stage draws as one batch for every face on screen. Nothing here is a sign:
// a brow is a short bar that never crosses anything, a mouth is a curve, and
// a shut eye is an arc: no face ever shows two level bars side by side.

export type FacePlan = {
  /** The left eye as the child sees it; the other is its mirror in x. Its middle, in the space of whatever carries the eyes, and its half-height. */
  eye: Vec3
  eyeSize: number
  /** Whether it has brows. */
  brows: boolean
  /** The middle of the mouth and its whole width, in the space of whatever carries it; none for a beak or a jaw that is a part of its own. */
  mouth: Vec3 | null
  mouthWide: number
  /** What is printed: the pupils, the brows and the mouth. */
  ink: string
  /** Whether the eyes have whites. A face printed on something white has none. */
  whites: boolean
  /**
   * A mouth that is a part of the toy (a beak, a muzzle) has no printed line: only its two corners are printed,
   * `wide` apart and each `long`, where it meets the cheeks, and they turn up and down as a printed mouth does.
   * `gape` is the dark of it, seen when it opens, for one that has no jaw to drop.
   */
  corners?: { at: Vec3; wide: number; long: number; gape: { at: Vec3; wide: number; tall: number } | null }
}

export type FaceState = {
  /** Where it looks, each from -1 to 1: to the child's right, and up. */
  lookX: number
  lookY: number
  /** 0 open, 1 shut. */
  blink: number
  /** The brows: -1 worried, the inner ends up; 0 level; 1 cross, the inner ends down. And how far they are raised, 0 to 1. */
  brow: number
  browLift: number
  /** The mouth: -1 turned down, 0 level, 1 a wide smile. And how far it is open, 0 to 1. */
  smile: number
  open: number
  /** How wide the eyes are: 1 at rest, more in surprise. */
  wide: number
}

export function restFace(): FaceState {
  return { lookX: 0, lookY: 0, blink: 0, brow: 0, browLift: 0, smile: 0.5, open: 0, wide: 1 }
}

/** How far the two ends of a shut eye turn up. */
export const SHUT_TURN = 0.62

/** One small pillow of a face: its middle, its half-sizes, its turn about the line of sight, and its colour. */
export type Bit = (x: number, y: number, z: number, wide: number, tall: number, deep: number, turn: number, colour: string) => void

/** The eyes of a face, in the space of whatever carries them. */
export function eyeBits(plan: FacePlan, state: FaceState, bit: Bit): void {
  const s = plan.eyeSize * (0.85 + 0.15 * state.wide), [ex, ey, ez] = plan.eye
  const open = Math.max(0, 1 - state.blink)
  const lookX = Math.max(-1, Math.min(1, state.lookX)), lookY = Math.max(-1, Math.min(1, state.lookY))
  for (const side of [1, -1]) {
    const x = ex * side
    if (open < 0.25) {
      // Shut: an arc where the eye is, low in the middle and up at both ends, as a lid lies on a cheek. It is three
      // short pieces, the outer two turned up, and never one straight dash.
      const low = ey - s * 0.22, z = ez + s * 0.2
      bit(x, low, z, s * 0.34, s * 0.11, s * 0.2, 0, plan.ink)
      for (const end of [1, -1]) bit(x + end * s * 0.5, low + s * 0.15, z, s * 0.34, s * 0.11, s * 0.2, end * SHUT_TURN, plan.ink)
      continue
    }
    if (plan.whites) bit(x, ey, ez, s * 0.92, s * open, s * 0.42, 0, PALETTE.valve)
    const px = x + lookX * s * 0.34, py = ey + lookY * s * 0.3 * open
    bit(px, py, ez + s * 0.3, s * 0.52, s * 0.58 * open, s * 0.24, 0, plan.ink)
    // The shine sits up and to the side the light comes from, on both eyes alike.
    bit(px - s * 0.18, py + s * 0.22 * open, ez + s * 0.5, s * 0.17, s * 0.17 * open, s * 0.1, 0, PALETTE.valve)
  }
  if (!plan.brows) return
  for (const side of [1, -1]) {
    // Worried, the inner end of a brow goes up; cross, it comes down.
    const turn = side * Math.max(-1, Math.min(1, state.brow)) * 0.36
    bit(ex * side * 1.04, ey + s * (1.46 + state.browLift * 0.4), ez + s * 0.22, s * 0.7, s * 0.12, s * 0.14, turn, plan.ink)
  }
}

/** The mouth of a face, in the space of whatever carries it. A face with no mouth of this kind draws none. */
export function mouthBits(plan: FacePlan, state: FaceState, bit: Bit): void {
  const smile = Math.max(-1, Math.min(1, state.smile)), open = Math.max(0, Math.min(1, state.open))
  if (plan.corners) {
    // The corners of a beak or a muzzle: each a short piece that starts where the mouth ends and turns up or down.
    const { at: [cx, cy, cz], wide, long, gape } = plan.corners
    const way = smile >= -0.15 ? 1 : -1, turned = way * (0.3 + 0.6 * Math.abs(smile))
    for (const side of [1, -1]) bit(cx + side * (wide / 2 + Math.cos(turned) * long * 0.8), cy + Math.sin(turned) * long * 0.8, cz, long, long * 0.34, long * 0.5, side * turned, plan.ink)
    // The dark of it is seen only when it is well open, and is round from the moment it is seen: an "ooh" under
    // its breath shows none, and it is never a thin level line on the beak.
    const agape = (open - 0.45) / 0.55
    if (gape && agape > 0) bit(gape.at[0], gape.at[1], gape.at[2], gape.wide * (0.6 + 0.4 * agape), gape.tall * (0.55 + 0.45 * agape), gape.tall * 0.5, 0, plan.ink)
    return
  }
  if (!plan.mouth) return
  const [mx, my, mz] = plan.mouth, w = plan.mouthWide
  // Two halves that meet in the middle: each turned up at its outer end for a smile, down for the other thing. It
  // is never one straight bar: at its most level it still turns up a little, as a mouth does and a sign does not.
  const up = smile >= -0.15 ? 1 : -1, turn = up * (0.14 + 0.36 * Math.abs(smile)), rise = Math.abs(Math.sin(turn)) * w * 0.25 * up
  for (const side of [1, -1]) bit(mx + side * w * 0.235 * Math.cos(turn), my + rise * 0.5 - open * w * 0.04, mz, w * 0.27, w * 0.038, w * 0.07, side * turn, plan.ink)
  // Open, the middle of it is dark and round: an "oh", or a laugh when the corners are up.
  if (open > 0.05) bit(mx, my - open * w * 0.1 + rise * 0.1, mz - w * 0.02, w * (0.12 + 0.1 * open + 0.06 * Math.max(0, smile)), w * 0.2 * open, w * 0.06, 0, plan.ink)
}
