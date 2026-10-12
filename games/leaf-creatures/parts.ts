// The seven kinds of part, as plain numbers: how big each is, what of it
// touches, and how it answers a hand. Nothing here draws or reads a clock.
// Lengths are stage units, angles radians, times seconds.

export const KINDS = ['twig', 'maple', 'willow', 'round', 'feather', 'seed', 'cap'] as const
export type Kind = (typeof KINDS)[number]

/** The four kinds a creature can travel by, in no order of rank: the one it has most of decides. */
export const MOVERS = ['twig', 'maple', 'willow', 'round'] as const
export type Mover = (typeof MOVERS)[number]

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/**
 * What of a part touches: a capsule along its long axis, `half` to each side
 * of its middle and `r` thick. A part that is not turned lies along x, stem
 * to the left.
 */
export type Shape = { half: number; r: number; long: number; wide: number }

/** How much larger a part is on the stage than it is drawn in partArt.ts: the parts are what the child moves, so they are large. */
export const PART_SIZE = 1.3

export const SHAPES: Record<Kind, Shape> = {
  twig: { half: 52, r: 10, long: 130, wide: 34 },
  maple: { half: 16, r: 46, long: 128, wide: 120 },
  willow: { half: 65, r: 17, long: 172, wide: 44 },
  round: { half: 0, r: 41, long: 99, wide: 91 },
  feather: { half: 55, r: 18, long: 151, wide: 50 },
  seed: { half: 20, r: 25, long: 100, wide: 60 },
  cap: { half: 0, r: 30, long: 65, wide: 65 },
}

/** Two parts this much apart or nearer are pressed together. */
export const STICK_SLACK = 5
/** A finger this near a part that lies on the earth has it. Generous, for a small hand. */
export const PICK_REACH = 30

export type Placed = { kind: Kind; x: number; y: number; turn: number }

export function ends(p: Placed): [number, number, number, number] {
  const h = SHAPES[p.kind].half, c = Math.cos(p.turn), s = Math.sin(p.turn)
  return [p.x - c * h, p.y - s * h, p.x + c * h, p.y + s * h]
}

/** How far a point is from a stretch from (ax, ay) to (bx, by). */
export function toStretch(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy
  const t = len > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
  return Math.hypot(px - ax - dx * t, py - ay - dy * t)
}

/** How far a point is from the outside of a part: under 0 inside it. */
export function reach(p: Placed, x: number, y: number): number {
  const [ax, ay, bx, by] = ends(p)
  return toStretch(x, y, ax, ay, bx, by) - SHAPES[p.kind].r
}

function side(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax)
}

/** Whether the long axes of two parts cross one another: what two sticks laid over each other do, and two that only meet at an end do not. */
export function crosses(a: Placed, b: Placed): boolean {
  const [ax, ay, bx, by] = ends(a), [cx, cy, dx, dy] = ends(b)
  return side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) < 0 && side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) < 0
}

/** Whether a kind is long and thin: a twig, a willow leaf or a feather, which go on to a thing by one end. */
export function isLong(kind: Kind): boolean {
  return SHAPES[kind].half > 30
}

/** The gap between two parts: 0 or under when they overlap. Two stretches that cross are no distance apart; otherwise they are nearest at an end of one of them. */
export function gap(a: Placed, b: Placed): number {
  const [ax, ay, bx, by] = ends(a), [cx, cy, dx, dy] = ends(b)
  const crossing = crosses(a, b)
  const nearest = crossing ? 0 : Math.min(toStretch(ax, ay, cx, cy, dx, dy), toStretch(bx, by, cx, cy, dx, dy), toStretch(cx, cy, ax, ay, bx, by), toStretch(dx, dy, ax, ay, bx, by))
  return nearest - SHAPES[a.kind].r - SHAPES[b.kind].r
}

export function touches(a: Placed, b: Placed): boolean {
  return gap(a, b) <= STICK_SLACK
}

/**
 * How a kind answers the hand. Every number differs between kinds, so no two
 * are lifted, carried or set down alike.
 */
export type Manner = {
  /** How far above the finger its middle rides, so a small hand never covers it. */
  rope: number
  /** How quickly it catches up with the finger, per second: a twig is rigid, a feather lags. */
  follow: number
  /** How high it jumps when the finger lands on it, and how fast that jump rings out. */
  jump: number
  ring: number
  /** How long it takes to come down once let go, before it touches. */
  fall: number
  /** How many times it bounces after it touches, and the seconds between touches. */
  bounces: number
  bounceGap: number
  /** How far its heap sinks when one is taken, and how springy the heap is. */
  slump: number
  /** Stage units carried between two rustles. */
  rustleEvery: number
}

export const MANNERS: Record<Kind, Manner> = {
  twig: { rope: 82, follow: 40, jump: 26, ring: 22, fall: 0.07, bounces: 0, bounceGap: 0, slump: 0.3, rustleEvery: 70 },
  maple: { rope: 96, follow: 14, jump: 18, ring: 9, fall: 0.2, bounces: 0, bounceGap: 0, slump: 0.16, rustleEvery: 95 },
  willow: { rope: 100, follow: 9, jump: 12, ring: 6, fall: 0.3, bounces: 0, bounceGap: 0, slump: 0.12, rustleEvery: 120 },
  round: { rope: 84, follow: 18, jump: 22, ring: 14, fall: 0.14, bounces: 3, bounceGap: 0.16, slump: 0.2, rustleEvery: 85 },
  feather: { rope: 92, follow: 5, jump: 8, ring: 4, fall: 0.55, bounces: 0, bounceGap: 0, slump: 0.08, rustleEvery: 150 },
  seed: { rope: 78, follow: 26, jump: 30, ring: 26, fall: 0.1, bounces: 2, bounceGap: 0.13, slump: 0.24, rustleEvery: 60 },
  cap: { rope: 72, follow: 22, jump: 16, ring: 12, fall: 0.09, bounces: 0, bounceGap: 0, slump: 0.18, rustleEvery: 105 },
}

/** Turns an angle into the range from minus half a turn to half a turn. */
export function wrap(angle: number): number {
  let a = angle % (Math.PI * 2)
  if (a > Math.PI) a -= Math.PI * 2
  if (a < -Math.PI) a += Math.PI * 2
  return a
}
