import type { CustomerId } from './tastes'

// What each customer looks like: its colours and the shapes that are its
// own. Paint only: where things are and how they move is elsewhere. Each has
// one strong colour for its lock, which is also the colour of the pieces cut
// from it, chosen to stand off the cape's cool blue.

export type Point = { x: number; y: number }

export type Look = {
  fur: string
  furEdge: string
  blush: string
  mane: string
  maneEdge: string
  /** Colours dropped into the mane wet. */
  maneBlooms: readonly [string, string]
  /** The flat colour of its lock and of what is cut from it, and its darker rim. */
  lock: string
  lockEdge: string
  nose: string
  /** How its tufts are cut: flames, round poms, a hanging curtain, soft fluff. */
  tuft: 'flame' | 'pom' | 'curtain' | 'fluff'
  /** The ruff of hair behind the face: how much wider and taller than the head it is, and how ragged. */
  ruff: { wide: number; tall: number; ragged: number }
  /** Its ears: where each sits on the head (the right one; the left is mirrored), its size, and its kind. */
  ears: { x: number; y: number; rx: number; ry: number; kind: 'round' | 'pom' | 'leaf' | 'long'; swing: number }
  /** Its face: how far apart and how big the eyes are, and the kind of nose. */
  eyes: { apart: number; size: number; y: number }
  snout: 'cat' | 'button' | 'muzzle' | 'bunny'
  horns: boolean
  /** What is at the end of its tail. */
  tail: 'tuft' | 'pom' | 'brush' | 'scut'
}

export const LOOKS: Record<CustomerId, Look> = {
  lion: {
    fur: '#f3c668', furEdge: '#cf9a36', blush: '#f29a8a', mane: '#ee8232', maneEdge: '#b9501d', maneBlooms: ['#cf4f1f', '#f8b04a'],
    lock: '#e96a2a', lockEdge: '#a9441a', nose: '#b5532d', tuft: 'flame', ruff: { wide: 30, tall: 24, ragged: 0.09 },
    ears: { x: 78, y: -60, rx: 30, ry: 28, kind: 'round', swing: 0.42 }, eyes: { apart: 40, size: 13, y: -14 }, snout: 'cat', horns: false, tail: 'tuft',
  },
  poodle: {
    fur: '#f8dfe2', furEdge: '#dca6b4', blush: '#f4a9b8', mane: '#f09ab8', maneEdge: '#c25a86', maneBlooms: ['#dd6394', '#f8dfe2'],
    lock: '#e4588c', lockEdge: '#a8366a', nose: '#3b3136', tuft: 'pom', ruff: { wide: 6, tall: 4, ragged: 0.12 },
    ears: { x: 96, y: 26, rx: 38, ry: 46, kind: 'pom', swing: 0.3 }, eyes: { apart: 36, size: 11, y: -18 }, snout: 'button', horns: false, tail: 'pom',
  },
  yak: {
    fur: '#d2ad86', furEdge: '#8f6a47', blush: '#d98f7a', mane: '#8a5a3a', maneEdge: '#4e2f1b', maneBlooms: ['#5d3a22', '#b07d55'],
    lock: '#74452a', lockEdge: '#3f2515', nose: '#6a4038', tuft: 'curtain', ruff: { wide: 40, tall: 34, ragged: 0.07 },
    ears: { x: 100, y: -22, rx: 30, ry: 16, kind: 'leaf', swing: 0.5 }, eyes: { apart: 46, size: 11, y: -22 }, snout: 'muzzle', horns: true, tail: 'brush',
  },
  rabbit: {
    fur: '#f6f0ea', furEdge: '#c3b5aa', blush: '#f5b3bd', mane: '#e4dcec', maneEdge: '#a89bbd', maneBlooms: ['#c9bde0', '#fbf7f2'],
    lock: '#8e5a9c', lockEdge: '#5d3769', nose: '#e88a9c', tuft: 'fluff', ruff: { wide: 22, tall: 14, ragged: 0.13 },
    ears: { x: 40, y: -84, rx: 22, ry: 74, kind: 'long', swing: 0.9 }, eyes: { apart: 42, size: 12, y: -10 }, snout: 'bunny', horns: false, tail: 'scut',
  },
}

/** The ribbon, and fluff. */
export const RIBBON = { fill: '#3fa58f', edge: '#27705f', clip: '#d3a373', clipEdge: '#a3713f' } as const
export const FLUFF = '#f3e6d6'

/** The flat colour of a piece of this hue, and its rim: a customer's lock, or the ribbon. */
export function hueOf(hue: string): { fill: string; edge: string } {
  if (hue === 'ribbon') return { fill: RIBBON.fill, edge: RIBBON.edge }
  const look = LOOKS[hue as CustomerId]
  return look ? { fill: look.lock, edge: look.lockEdge } : { fill: FLUFF, edge: '#c9b9a4' }
}

/**
 * The outline of one tuft, pointing straight up from its root at the origin:
 * as long as `reach`, as wide as `width`, hooked by `curl`. Each customer's
 * hair is cut its own way.
 */
export function tuftOutline(kind: Look['tuft'], reach: number, width: number, curl: number): Point[] {
  const w = width / 2
  const at = (along: number, across: number): Point => ({ x: across + curl * along * along * reach, y: -along * reach })
  if (kind === 'flame') {
    const hook = Math.sign(curl || 1) * w * 0.5
    return [at(-0.12, -w * 0.9), at(0.22, -w * 1.15), at(0.55, -w * 0.7), at(0.82, -w * 0.34 + hook * 0.4), at(1, hook), at(0.86, w * 0.2 + hook * 0.5), at(0.6, w * 0.62), at(0.26, w * 1.1), at(-0.12, w * 0.9)]
  }
  if (kind === 'pom') {
    // A short stalk and a round ball at the end of it.
    const r = Math.min(w, reach * 0.55)
    return [at(-0.1, -w * 0.4), at(0.3, -w * 0.34), at(0.52, -r * 0.92), at(0.78, -r * 1.02), at(1, -r * 0.5), at(1.04, r * 0.5), at(0.8, r * 1.02), at(0.5, r * 0.9), at(0.28, w * 0.34), at(-0.1, w * 0.4)]
  }
  if (kind === 'curtain') {
    // A long straight hank, nearly as wide at its end as at its root, cut off blunt.
    return [at(-0.1, -w * 0.8), at(0.3, -w * 0.9), at(0.7, -w * 0.82), at(0.96, -w * 0.7), at(1, -w * 0.2), at(1, w * 0.3), at(0.95, w * 0.72), at(0.68, w * 0.84), at(0.28, w * 0.9), at(-0.1, w * 0.8)]
  }
  // Fluff: a soft wide puff with a scalloped end.
  return [at(-0.1, -w * 0.7), at(0.3, -w * 1.05), at(0.66, -w * 0.98), at(0.94, -w * 0.6), at(0.9, -w * 0.18), at(1.02, w * 0.12), at(0.9, w * 0.56), at(0.64, w * 0.98), at(0.28, w * 1.04), at(-0.1, w * 0.7)]
}
