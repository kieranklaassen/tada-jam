import type { ThingId } from './things'

// The five whose feet go in. Each has a way of leaving the ground that is
// nobody else's, a voice pitch, and one thing it likes best.

export const OWNERS = ['oma', 'bear', 'goose', 'elephant', 'horse'] as const
export type OwnerId = (typeof OWNERS)[number]

export type Lift = { dx: number; dy: number; rot: number; sx: number; sy: number; arms: number }

export type Owner = {
  /** What it likes best. It changes nothing but how long and how round the bliss is. */
  loves: ThingId
  /** What makes it shudder at the end, which is as funny. */
  minds: ThingId
  /** Hertz of its yelp. */
  voice: number
  /** How quick its small movements are, 1 is plain. */
  tempo: number
  /** One leap over 0..1, `h` units high. */
  leap: (u: number, h: number, out: Lift) => void
}

const { sin, PI, max, min } = Math
const up = (u: number): number => sin(PI * min(1, max(0, u)))
/** Squash at both ends of a leap: the push off and the landing. */
const ends = (u: number): number => up(u / 0.16) + up((u - 0.84) / 0.16)

export const OWNER: Record<OwnerId, Owner> = {
  // Straight up like a cork, and slowly down under her skirt.
  oma: {
    loves: 'mandarin', minds: 'frog', voice: 620, tempo: 1.15,
    leap(u, h, o) {
      const y = u < 0.3 ? sin((u / 0.3) * PI * 0.5) : 1 - ((u - 0.3) / 0.7) ** 1.6
      const falling = u > 0.3 ? up((u - 0.3) / 0.7) : 0
      o.dx = falling * sin(u * 16) * 14; o.dy = -h * y; o.rot = falling * sin(u * 16) * 0.06
      o.sx = 1 + falling * 0.12 + ends(u) * 0.08; o.sy = 1 - ends(u) * 0.12; o.arms = y
    },
  },
  // Too heavy to leave the ground by much, so it goes round instead.
  bear: {
    loves: 'porridge', minds: 'bell', voice: 190, tempo: 0.75,
    leap(u, h, o) {
      o.dx = sin(u * PI * 2) * 26; o.dy = -h * 0.5 * up(u); o.rot = sin(u * PI * 2) * 0.34
      o.sx = 1 + ends(u) * 0.2; o.sy = 1 - ends(u) * 0.2; o.arms = 0.5 + 0.5 * up(u)
    },
  },
  // Many small flaps that get nowhere.
  goose: {
    loves: 'bell', minds: 'porridge', voice: 420, tempo: 1.5,
    leap(u, h, o) {
      const flap = Math.abs(sin(u * PI * 4))
      o.dx = sin(u * PI * 6) * 12; o.dy = -h * (0.4 * up(u) + 0.36 * flap * up(u)); o.rot = sin(u * PI * 8) * 0.09
      o.sx = 1 - flap * 0.06 + ends(u) * 0.06; o.sy = 1 + flap * 0.07 - ends(u) * 0.08; o.arms = 0.5 + 0.5 * sin(u * PI * 16)
    },
  },
  // Up like a balloon, round and slow, and down all at once.
  elephant: {
    loves: 'mouse', minds: 'biscuit', voice: 130, tempo: 0.65,
    leap(u, h, o) {
      const y = u < 0.72 ? sin((u / 0.72) * PI * 0.5) ** 1.4 : 1 - ((u - 0.72) / 0.28) ** 3
      o.dx = sin(u * 7) * 8; o.dy = -h * 0.62 * y; o.rot = sin(u * 9) * 0.05
      o.sx = 1 + 0.1 * y + ends(u) * 0.26; o.sy = 1 + 0.05 * y - ends(u) * 0.28; o.arms = 0.3 + 0.4 * y
    },
  },
  // Rears right back on the other leg.
  horse: {
    loves: 'carrot', minds: 'mouse', voice: 300, tempo: 1,
    leap(u, h, o) {
      o.dx = -14 * up(u); o.dy = -h * 0.72 * up(u); o.rot = -0.28 * up(u) + 0.12 * max(0, sin(u * PI * 2 + PI))
      o.sx = 1 - 0.05 * up(u) + ends(u) * 0.1; o.sy = 1 + 0.09 * up(u) - ends(u) * 0.14; o.arms = up(u)
    },
  },
}

export function nextOwner(id: OwnerId): OwnerId {
  return OWNERS[(OWNERS.indexOf(id) + 1) % OWNERS.length]
}
