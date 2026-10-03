import type { CreatureKind, HatKind } from './kinds'

// The sizes the motion and the view share, in mat units. Pure numbers: the
// motion says where a hat rests on a head, the view cuts the head to match.

/** How thick a mat tile and a hat are. A hat is cut from its tile, so the two match. */
export const SLAB = 0.5

/** How tall each hat stands from its base. */
export const HAT_HEIGHT: Record<HatKind, number> = { cone: 1.55, dome: 1.0, brim: 1.3 }

/** How deep the hat tile is from front to back. */
export const TILE_DEPTH = 2.7

export type Body = {
  /** The top of its head, where a hat's base rests. */
  top: number
  /** The middle of its face, how far its eyes are from the middle, and how big they are. */
  faceY: number
  eyeGap: number
  eyeSize: number
  /** Half its width at the shoulders, where its hands rest. */
  reach: number
  /** How wide the shadow under it is. */
  ground: number
}

export const BODY: Record<CreatureKind, Body> = {
  bop: { top: 2.2, faceY: 1.42, eyeGap: 0.42, eyeSize: 0.27, reach: 1.08, ground: 1.25 },
  lanky: { top: 3.56, faceY: 3.06, eyeGap: 0.25, eyeSize: 0.2, reach: 0.74, ground: 0.95 },
  flop: { top: 2.3, faceY: 1.7, eyeGap: 0.3, eyeSize: 0.22, reach: 1.02, ground: 1.2 },
  wig: { top: 1.7, faceY: 1.06, eyeGap: 0.5, eyeSize: 0.24, reach: 1.3, ground: 1.45 },
  pip: { top: 1.56, faceY: 1.02, eyeGap: 0.24, eyeSize: 0.2, reach: 0.66, ground: 1.0 },
}

/** The arch, standing on y = 0: half the width of its opening and of the whole, how high its sides stand before they curve, and how thick it is. */
export const ARCH = { inner: 1.9, outer: 2.7, straight: 2.6, depth: 0.9 } as const

/** A creature's hand: a small disc at its side. How wide it is from its middle, and how far its front stands out from the middle of the body when it pats. */
export const HAND = { radius: 0.27, front: 0.53 } as const

/** How thick a creature is. */
export const CREATURE_DEPTH = 0.7
