import type { CreatureKind, PieceId } from '../layout'
import { BLUE, GREEN, RED, type Mask } from '../optics'

// Every colour is authored in display (sRGB) space: the shaders write them
// straight to the canvas, and additive light blends on the screen the way
// it looks. The room and the frame stay dark so the panel glows and the
// beams read; glass gets bright opaque rims so every piece stands off the
// panel.

export type RGB = readonly [number, number, number]

export const PALETTE = {
  room: [0.035, 0.085, 0.095] as RGB,
  roomGlow: [0.1, 0.2, 0.21] as RGB,
  frame: [0.1, 0.19, 0.2] as RGB,
  frameTop: [0.36, 0.56, 0.55] as RGB,
  frameSide: [0.03, 0.07, 0.075] as RGB,
  felt: [0.065, 0.14, 0.15] as RGB,
  feltSlot: [0.04, 0.1, 0.11] as RGB,
  panelCentre: [0.72, 0.71, 0.63] as RGB,
  panelEdge: [0.31, 0.41, 0.41] as RGB,
  panelRim: [0.62, 0.78, 0.76] as RGB,
} as const

/** The light itself: pure primaries so mixes add up on screen (red + green reads yellow). */
const PRIMARY: Readonly<Record<number, RGB>> = {
  [RED]: [1, 0.16, 0.1],
  [GREEN]: [0.12, 1, 0.22],
  [BLUE]: [0.16, 0.34, 1],
}

const BITS = [RED, GREEN, BLUE] as const

export function lightColour(mask: Mask, out: number[] | Float32Array, offset = 0): void {
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < 3; i++) {
    const bit = BITS[i]
    if (mask & bit) {
      r += PRIMARY[bit][0]
      g += PRIMARY[bit][1]
      b += PRIMARY[bit][2]
    }
  }
  const peak = Math.max(r, g, b, 1)
  out[offset] = r / peak
  out[offset + 1] = g / peak
  out[offset + 2] = b / peak
}

export type GlassLook = {
  tint: RGB
  rim: RGB
  /** Glow colour when light passes through it (filters glow their own colour). */
  core: RGB
}

export const PIECE_LOOK: Readonly<Record<PieceId, GlassLook>> = {
  lampA: { tint: [0.93, 0.86, 0.72], rim: [1, 0.97, 0.9], core: [1, 0.95, 0.8] },
  lampB: { tint: [0.8, 0.93, 0.9], rim: [0.93, 1, 0.98], core: [0.95, 1, 0.95] },
  prism: { tint: [0.72, 0.86, 0.9], rim: [0.97, 1, 1], core: [0.9, 0.95, 1] },
  mirror1: { tint: [0.9, 0.9, 0.88], rim: [1, 0.97, 0.9], core: [0.95, 0.98, 1] },
  mirror2: { tint: [0.9, 0.9, 0.88], rim: [1, 0.97, 0.9], core: [0.95, 0.98, 1] },
  filterR: { tint: [0.95, 0.22, 0.2], rim: [1, 0.78, 0.74], core: [1, 0.25, 0.18] },
  filterG: { tint: [0.24, 0.85, 0.36], rim: [0.8, 1, 0.8], core: [0.25, 1, 0.35] },
  filterB: { tint: [0.28, 0.44, 1], rim: [0.78, 0.86, 1], core: [0.3, 0.5, 1] },
}

export const CREATURE_LOOK: Readonly<Record<CreatureKind, GlassLook>> = {
  moth: { tint: [0.95, 0.93, 0.98], rim: [1, 0.98, 1], core: [1, 0.96, 0.9] },
  fish: { tint: [0.98, 0.5, 0.44], rim: [1, 0.86, 0.8], core: [1, 0.3, 0.2] },
  snail: { tint: [1, 0.82, 0.4], rim: [1, 0.96, 0.78], core: [1, 0.85, 0.2] },
  jelly: { tint: [0.46, 0.92, 0.94], rim: [0.86, 1, 1], core: [0.25, 0.95, 1] },
}
