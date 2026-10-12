import { type Field, deltaAt } from './field'
import { type Guidance, type HandPose, handPose } from './guidance'
import { type Things, patchesOf } from './things'

// What the idle ladder shows on this beach: a soft glow on a stretch of open
// sand, and then the ghost hand drawing one stroke across it. One next act is
// offered at a time, and it is the toy: a finger drawn through the sand.

/** The strokes the hand may show, each over open sand in the middle of the beach: from, to, and how far it bows. */
export const SHOWN_STROKES = [
  { fromX: -1.9, fromZ: 3.5, toX: 1.5, toZ: 2.5, bow: 0.5 },
  { fromX: 1.8, fromZ: 0.6, toX: -1.4, toZ: 1.5, bow: -0.45 },
  { fromX: -0.6, fromZ: 4.6, toX: 2.6, toZ: 4.2, bow: 0.35 },
] as const

export type Hint = {
  /** The glow on the sand: where, and how strong (0 is none). */
  glowX: number
  glowZ: number
  glow: number
  /** The ghost hand: shown or not, where its fingertip is, how far it is pressed, and how solid it is. */
  hand: boolean
  handX: number
  handZ: number
  press: number
  opacity: number
}

export function emptyHint(): Hint {
  return { glowX: 0, glowZ: 0, glow: 0, hand: false, handX: 0, handZ: 0, press: 0, opacity: 0 }
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

/** How much of a stroke's path is still smooth sand with nothing lying on it, 0 to 1. */
function openness(field: Field, index: number, things: Things | null): number {
  const stroke = SHOWN_STROKES[index]
  const lying = things ? patchesOf(things) : []
  let smooth = 0
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const x = stroke.fromX + (stroke.toX - stroke.fromX) * t, z = stroke.fromZ + (stroke.toZ - stroke.fromZ) * t
    if (Math.abs(deltaAt(field, x, z)) < 0.03 && lying.every((patch) => Math.hypot(patch.x - x, patch.z - z) > patch.r + 0.7)) smooth += 1
  }
  return smooth / 9
}

/**
 * The hint for this frame, written into `out`. The stroke shown is the first
 * of the list whose sand is still mostly smooth and clear of the bucket, the
 * shells and the driftwood, so the hand never draws over what the child made
 * or put down; with none left it shows the one that is most open.
 */
export function hintFor(guidance: Guidance | null, field: Field, out: Hint, things: Things | null = null): Hint {
  out.glow = 0
  out.hand = false
  if (!guidance || (guidance.glow <= 0 && guidance.demo === null)) return out
  let index = 0, most = -1
  for (let i = 0; i < SHOWN_STROKES.length; i++) {
    const open = openness(field, i, things)
    if (open > 0.7) {
      index = i
      break
    }
    if (open > most) {
      most = open
      index = i
    }
  }
  const stroke = SHOWN_STROKES[index]
  out.glowX = (stroke.fromX + stroke.toX) / 2
  out.glowZ = (stroke.fromZ + stroke.toZ) / 2
  out.glow = guidance.glow
  if (guidance.demo === null) return out
  handPose(guidance.demo, true, pose)
  const t = pose.travel
  const bow = Math.sin(t * Math.PI) * stroke.bow
  const dx = stroke.toX - stroke.fromX, dz = stroke.toZ - stroke.fromZ, length = Math.hypot(dx, dz)
  out.hand = true
  out.handX = stroke.fromX + dx * t - (dz / length) * bow
  out.handZ = stroke.fromZ + dz * t + (dx / length) * bow
  out.press = pose.press
  out.opacity = pose.opacity
  return out
}
