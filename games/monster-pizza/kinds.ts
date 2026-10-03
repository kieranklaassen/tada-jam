import { ellipse, smooth, type Ring } from './shapes'

// The six kinds of topping. These are the pieces a child counts, so each is
// one flat colour inside one bold outline, told from the others by shape and
// colour together, all of one size, with no face, no pattern and no motion at
// rest (pack: game-design, working-objects-stay-plain.md). A shape is a ring
// inside a circle of radius 1 and is scaled where it is drawn.

export const KINDS = ['pepper', 'mushroom', 'olive', 'cheese', 'sock', 'worm'] as const
export type Kind = (typeof KINDS)[number]

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

export type KindLook = {
  /** The flat fill of the piece. */
  fill: string
  /** The outline of the piece in a circle of radius 1. */
  ring: Ring
  /** The marker colour of this kind's tub. */
  tub: string
}

const pepper = smooth([-0.92, -0.5, -0.3, -0.72, 0.5, -0.4, 0.94, 0.42, 0.72, 0.8, 0.3, 0.3, -0.25, 0.02, -0.82, -0.02], 5)
const mushroom = smooth([-0.95, 0.02, -0.72, -0.62, 0, -0.9, 0.72, -0.62, 0.95, 0.02, 0.36, 0.14, 0.34, 0.82, 0, 0.92, -0.34, 0.82, -0.36, 0.14], 4)
const olive = ellipse(0, 0, 0.8, 0.8, 22)
const cheese = smooth([0, -0.9, 0.18, -0.74, 0.86, 0.58, 0.8, 0.8, -0.8, 0.8, -0.86, 0.58, -0.18, -0.74], 3)
const sock = smooth([-0.56, -0.92, 0.12, -0.92, 0.16, 0.02, 0.84, 0.36, 0.86, 0.78, 0.2, 0.9, -0.5, 0.62, -0.6, 0.1], 4)
const worm = smooth([-0.94, 0.3, -0.62, -0.62, -0.06, -0.5, 0.2, 0.22, 0.56, 0.1, 0.7, -0.5, 0.96, -0.34, 0.9, 0.5, 0.26, 0.76, -0.2, 0.14, -0.46, -0.06, -0.58, 0.5], 4)

export const LOOKS: Record<Kind, KindLook> = {
  pepper: { fill: '#e4322b', ring: pepper, tub: '#f08a2c' },
  mushroom: { fill: '#b98a5e', ring: mushroom, tub: '#63b7e6' },
  olive: { fill: '#4d7a2a', ring: olive, tub: '#e9c62f' },
  cheese: { fill: '#ffd21f', ring: cheese, tub: '#e2574c' },
  sock: { fill: '#2f7fe0', ring: sock, tub: '#7cc65a' },
  worm: { fill: '#ff8fb4', ring: worm, tub: '#9a7ae0' },
}

/** The ring of a kind, scaled to radius `r` about (cx, cy) and turned by `turn`. */
export function pieceRing(kind: Kind, cx: number, cy: number, r: number, turn = 0): Ring {
  const src = LOOKS[kind].ring
  const cos = Math.cos(turn) * r, sin = Math.sin(turn) * r
  const out: Ring = []
  for (let i = 0; i < src.length; i += 2) out.push(cx + src[i] * cos - src[i + 1] * sin, cy + src[i] * sin + src[i + 1] * cos)
  return out
}
