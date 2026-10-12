import { FOLK, type Who } from './hall'
import type { Craft } from './things'

// Where each fair-goer holds each craft: her fist, his cupped hand or his
// hat, the goat's mouth, the bell of the tuba, the mittens, the brow of the
// scarf, the hood. Round the body's foot, in stage units; the model sends a
// given thing here and the view draws it here, so they agree.

export type Grip = {
  x: number
  y: number
  /** Turned by this, in radians, and drawn at this share of its size on the bench. */
  rot: number
  scale: number
  /** Squashed flat by this, where a ring lies on a head. */
  flat?: number
  /** 0: behind the body (in or over the bell). 1: in front of the body, behind the face and the jaw. 2: in front of everything. */
  layer: 0 | 1 | 2
  /** Where the thing goes, and how far it turns, as the fair-goer's `use` goes from 0 to 1. */
  to?: { x?: number; y?: number; rot?: number }
}

export const HOLDS: Record<Who, Record<Craft, Grip>> = {
  maker: {
    // Upright in her fist; a thin one droops over it.
    candle: { x: 162, y: -200, rot: 0, scale: 0.5, layer: 1, to: { rot: 1.1, x: 186, y: -176 } },
    star: { x: 166, y: -172, rot: 0.2, scale: 0.42, layer: 1 },
    wreath: { x: 160, y: -158, rot: 0, scale: 0.4, layer: 1 },
    biscuit: { x: 168, y: -180, rot: 0.2, scale: 0.42, layer: 1 },
  },
  baker: {
    candle: { x: -168, y: -216, rot: 0, scale: 0.42, layer: 1 },
    // A badge on his hat, a crown on its band, and a biscuit he lifts to his teeth.
    star: { x: -8, y: -452, rot: 0, scale: 0.26, layer: 2 },
    wreath: { x: -8, y: -404, rot: 0, scale: 0.5, flat: 0.5, layer: 2 },
    biscuit: { x: -166, y: -198, rot: 0, scale: 0.4, layer: 1, to: { x: -30, y: -270 } },
  },
  goat: {
    candle: { x: 128, y: -44, rot: 1.35, scale: 0.36, layer: 1 },
    star: { x: 126, y: -28, rot: 0.5, scale: 0.26, layer: 1 },
    // Turned in its teeth like a corn cob.
    wreath: { x: 128, y: -42, rot: 0, scale: 0.36, layer: 1, to: { rot: 6 } },
    biscuit: { x: 124, y: -44, rot: 0, scale: 0.3, layer: 1 },
  },
  tuba: {
    // In the bell, where it rattles round; on the rim, where it spins; over the bell.
    candle: { x: -62, y: -462, rot: 0.5, scale: 0.28, layer: 0, to: { rot: 3 } },
    star: { x: -132, y: -520, rot: 0, scale: 0.32, layer: 2, to: { rot: 6 } },
    wreath: { x: -70, y: -470, rot: 0, scale: 0.6, layer: 0 },
    biscuit: { x: -62, y: -462, rot: 0, scale: 0.3, layer: 0 },
  },
  bundle: {
    // A staff in both mittens, which a thin one is twirled as.
    candle: { x: 0, y: -132, rot: 0, scale: 0.5, layer: 2, to: { rot: 6.28 } },
    star: { x: 0, y: -196, rot: 0, scale: 0.22, layer: 2 },
    // A crown over the hood, which slides down over the eyes.
    wreath: { x: -2, y: -236, rot: 0, scale: 0.5, flat: 0.5, layer: 2, to: { y: -176 } },
    biscuit: { x: 34, y: -128, rot: 0, scale: 0.28, layer: 1 },
  },
}

/** Where on the stage a fair-goer holds a craft, standing at rest. */
export function handAt(who: Who, craft: Craft): { x: number; y: number } {
  const hold = HOLDS[who][craft]
  return { x: FOLK[who].x + hold.x, y: FOLK[who].foot + hold.y }
}
