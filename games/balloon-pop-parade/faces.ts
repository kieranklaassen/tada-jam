import { PALETTE } from './palette'
import type { Vec3 } from './shapes'

// A face as a handful of small pillows: the whites of two eyes, two pupils
// that look where something is, a shine in each, two brows and a mouth of two
// halves that turn up or down, with an open middle. Pure: a face is a plan
// (where its parts sit on whatever carries them) and a state (what it is doing
// now), and `faceBits` turns the two into the pillows of this frame, which the
// stage draws as one batch for every face on screen. Nothing here is a sign:
// a brow is a short bar that never crosses anything, and a mouth is a curve.

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
      // Shut: a short dark line where the eye is.
      bit(x, ey - s * 0.1, ez + s * 0.2, s * 0.8, s * 0.11, s * 0.2, side * -0.12, plan.ink)
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
    const turn = side * state.brow * 0.42
    bit(ex * side * 1.04, ey + s * (1.62 + state.browLift * 0.5), ez + s * 0.22, s * 0.74, s * 0.13, s * 0.14, turn, plan.ink)
  }
}

/** The mouth of a face, in the space of whatever carries it. A face with no mouth of this kind draws none. */
export function mouthBits(plan: FacePlan, state: FaceState, bit: Bit): void {
  if (!plan.mouth) return
  const [mx, my, mz] = plan.mouth, w = plan.mouthWide
  const smile = Math.max(-1, Math.min(1, state.smile)), open = Math.max(0, Math.min(1, state.open))
  // Two halves that meet in the middle: each turned up at its outer end for a smile, down for the other thing.
  const turn = smile * 0.5, rise = Math.abs(Math.sin(turn)) * w * 0.25 * Math.sign(smile)
  for (const side of [1, -1]) bit(mx + side * w * 0.235 * Math.cos(turn), my + rise * 0.5 - open * w * 0.06, mz, w * 0.27, w * 0.055, w * 0.07, side * turn, plan.ink)
  // Open, the middle of it is dark and round: an "oh", or a laugh when the corners are up.
  if (open > 0.05) bit(mx, my - open * w * 0.12 + rise * 0.1, mz - w * 0.02, w * (0.16 + 0.12 * open + 0.06 * Math.max(0, smile)), w * 0.24 * open, w * 0.06, 0, plan.ink)
}
