import { bounds, ellipse, smooth, type Ring } from './shapes'

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

/** Centres a ring and scales it so that its farthest point is `reach` from the middle: every kind is then of one size. */
function fitted(ring: Ring, reach = 1): Ring {
  const box = bounds(ring)
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2
  let far = 0
  for (let i = 0; i < ring.length; i += 2) far = Math.max(far, Math.hypot(ring[i] - cx, ring[i + 1] - cy))
  return ring.map((v, i) => ((v - (i % 2 === 0 ? cx : cy)) / far) * reach)
}

// A plump pepper with a thick shoulder and a blunt tip: bent, but too fat to be an arc, which over two round things would be a brow.
const pepper = smooth([-0.9, -0.62, -0.2, -0.86, 0.56, -0.56, 0.96, 0.3, 0.8, 0.84, 0.38, 0.66, 0.0, 0.5, -0.5, 0.3, -0.92, 0.0], 5)
const mushroom = smooth([-0.95, 0.02, -0.72, -0.62, 0, -0.9, 0.72, -0.62, 0.95, 0.02, 0.36, 0.14, 0.34, 0.82, 0, 0.92, -0.34, 0.82, -0.36, 0.14], 4)
const olive = ellipse(0, 0, 0.8, 0.8, 22)
// A wedge of cheese lying on its side, thin at one end and tall at the other, with a round bite out of its top and
// one out of its bottom, as a child draws cheese with holes at its edge. Its sides are not straight and it does not
// stand on a base: it is no triangle, which is the shape of a sign, and no arrowhead.
const cheese = smooth([-0.94, 0.34, -0.5, 0.04, -0.34, -0.12, -0.2, 0.12, -0.02, -0.28, 0.3, -0.52, 0.62, -0.76, 0.9, -0.62, 0.96, 0.02, 0.9, 0.72, 0.34, 0.8, 0.14, 0.74, 0.02, 0.48, -0.2, 0.72, -0.62, 0.74], 3)

/** How far the sock's own outline is tipped from lying flat, in radians. Wherever a sock is drawn it is turned a little more, and never so far that it stands on its toe or its heel. */
export const SOCK_LEAN = 0.2

/** The same ring turned by `by` radians about (0, 0). */
function turned(ring: number[], by: number): number[] {
  const cos = Math.cos(by), sin = Math.sin(by)
  return ring.map((_, i) => (i % 2 === 0 ? ring[i] * cos - ring[i + 1] * sin : ring[i - 1] * sin + ring[i] * cos))
}

// A sock lying down: a long foot with a round toe and a heel that sticks out, and a short cuff at the back. Low and
// long, it is not two bars that meet in a corner, which upright read as a letter and leaning as a sign for less.
const sock = turned(smooth([-0.78, -0.56, -0.28, -0.66, -0.12, -0.2, 0.62, -0.1, 0.98, 0.2, 0.96, 0.58, 0.36, 0.76, -0.56, 0.74, -0.98, 0.46, -0.92, -0.12], 4), SOCK_LEAN)

// A worm as a row of four soft bumps, the head the fattest and the tail the thinnest, lying at a lean: a grub that
// wriggles, and not a bent stroke that could be read as a letter or a sign.
const worm = turned(smooth([-1.0, 0.06, -0.66, -0.3, -0.42, -0.1, -0.18, -0.36, 0.03, -0.14, 0.24, -0.26, 0.43, -0.06, 0.62, -0.1, 0.88, 0.14, 0.62, 0.34, 0.43, 0.2, 0.24, 0.28, 0.03, 0.14, -0.18, 0.22, -0.42, 0.28, -0.66, 0.42], 4), -0.32)

/**
 * What two kinds turn into for the moment of their baking move, in a circle of radius 1: the worm curled up into a
 * ball, head to tail, and the cheese with every corner gone soft and round. Each springs back to its own outline.
 */
export const SOFT: Partial<Record<Kind, Ring>> = {
  worm: fitted(smooth([-0.2, -0.86, 0.36, -0.8, 0.78, -0.42, 0.86, 0.1, 0.6, 0.62, 0.08, 0.84, -0.48, 0.7, -0.84, 0.26, -0.82, -0.3, -0.5, -0.44, -0.3, -0.16, -0.02, -0.3, -0.04, -0.6], 4), 0.86),
  // Still a wedge with its two bites, every point of it rounded off: a lump, not a rounded triangle.
  cheese: fitted(smooth([-0.78, 0.36, -0.5, 0.1, -0.3, 0.02, -0.16, 0.14, 0.0, -0.18, 0.3, -0.44, 0.58, -0.62, 0.82, -0.44, 0.88, 0.08, 0.8, 0.6, 0.38, 0.72, 0.16, 0.64, 0.04, 0.48, -0.16, 0.64, -0.6, 0.66], 5)),
}

/** The colours a bowl may have: neither is the colour of any kind. */
export const BOWL = { violet: '#9a7ae0', orange: '#f08a2c' } as const

export const LOOKS: Record<Kind, KindLook> = {
  // A bowl is never the colour of a kind, its own or another's: a child who is choosing the kind sees the kind in
  // the pieces heaped in the bowl and nowhere else. Two bowl colours, violet and orange, which no kind has.
  pepper: { fill: '#e4322b', ring: fitted(pepper), tub: BOWL.violet },
  mushroom: { fill: '#b98a5e', ring: fitted(mushroom), tub: BOWL.violet },
  olive: { fill: '#4d7a2a', ring: fitted(olive, 0.86), tub: BOWL.orange },
  cheese: { fill: '#ffd21f', ring: fitted(cheese), tub: BOWL.violet },
  sock: { fill: '#2f7fe0', ring: fitted(sock), tub: BOWL.orange },
  worm: { fill: '#ff8fb4', ring: fitted(worm), tub: BOWL.orange },
}

/** The ring of a kind, scaled to radius `r` about (cx, cy) and turned by `turn`. */
export function pieceRing(kind: Kind, cx: number, cy: number, r: number, turn = 0): Ring {
  const src = LOOKS[kind].ring
  const cos = Math.cos(turn) * r, sin = Math.sin(turn) * r
  const out: Ring = []
  for (let i = 0; i < src.length; i += 2) out.push(cx + src[i] * cos - src[i + 1] * sin, cy + src[i] * sin + src[i + 1] * cos)
  return out
}
