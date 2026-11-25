import type { DishId, GuestId } from './cast'
import { taste } from './save'

// How everyone moves, as numbers: the view puts them on the figures. Nobody
// shares a move with anybody else (moves.test.ts).

export type Pose = {
  x: number; y: number
  /** Radians, about the seat. */
  lean: number
  sx: number; sy: number
  /** The head: where it is moved to, turned and sized. */
  hx: number; hy: number; turn: number; hs: number
  /** -1 shut, 0 at rest, 1 wide. */
  eyes: number
  /** 0 a smile, 1 wide open, -1 pursed, -2 wavy. */
  mouth: number
  /** Arms: 0 on the table, 1 straight up; out: to the side. */
  armL: number; armR: number; reach: number
  /** Hair, ears or antlers. */
  top: number
  brow: number
}

export function still(p: Pose): Pose {
  p.x = p.y = p.lean = p.hx = p.hy = p.turn = p.eyes = p.mouth = p.armL = p.armR = p.reach = p.top = p.brow = 0
  p.sx = p.sy = p.hs = 1
  return p
}

const { sin, PI, max, min, abs } = Math
const bell = (u: number) => sin(max(0, min(1, u)) * PI)
const hold = (u: number) => min(1, max(0, u * 6)) * min(1, max(0, (1 - u) * 5))
const shake = (u: number, n: number) => sin(u * PI * 2 * n) * (1 - u)

type Move = (u: number, p: Pose, dir: number, w: number) => void

/** What each does to the one beside it. */
export const ACTS: Readonly<Record<GuestId, Move>> = {
  granny: (u, p, d) => { const k = hold(u); p.lean += d * 0.2 * k; p.reach += d * k; p.armR += 0.35 * k; p.mouth = -1 * k; p.brow += 3 * k; p.hx += d * 4 * shake(u, 5) },
  grandpa: (u, p, d) => { const k = hold(u); p.lean += d * 0.3 * k; p.turn += d * 0.5 * k; p.eyes = -k; p.mouth = 0.5 + 0.5 * sin(u * 19); p.hy += 10 * k },
  baby: (u, p, d) => { p.y -= 40 * bell(u); p.lean += d * 0.28 * bell(u); p.reach += d * 1.3 * bell(u); p.armL += 0.6 * bell(u); p.mouth = bell(u); p.eyes = bell(u) },
  aunt: (u, p, d) => { const k = hold(u); p.lean += d * 0.26 * k; p.reach += d * 1.2 * k; p.armL += 0.5 * k; p.armR += 0.5 * k; p.sx += 0.06 * shake(u, 3); p.eyes = -k; p.hx += d * 12 * k },
  uncle: (u, p, d) => { const k = hold(u); p.lean += d * 0.12 * k; p.turn += d * 0.25 * k; p.hs += 0.14 * k * (0.7 + 0.3 * sin(u * 40)); p.mouth = -1 * k; p.sx += 0.1 * k; p.eyes = 0.8 * k },
  dog: (u, p, d) => { p.lean += d * 0.24 * hold(u); p.hy -= 26 * sin(u * PI * 3) * hold(u); p.hx += d * 16 * hold(u); p.mouth = 1; p.top += shake(u, 4) },
  tall: (u, p, d) => { const k = hold(u); p.lean += d * 0.75 * k; p.turn += d * 1.7 * k; p.hy += 22 * k; p.eyes = k; p.brow -= 4 * k },
  goose: (u, p, d) => { p.lean += d * 0.2 * hold(u); p.hx += d * 18 * (abs(sin(u * PI * 2))); p.mouth = abs(sin(u * PI * 2)); p.sy += 0.1 * abs(sin(u * PI * 2)); p.top += 0.5 * bell(u) },
  little: (u, p, d) => { const down = u < 0.5 ? bell(u) : 0; p.y += 90 * min(1, down * 1.4) - (u > 0.5 ? 60 * bell((u - 0.5) * 2) : 0); p.armL += u > 0.5 ? bell((u - 0.5) * 2) : 0; p.armR += u > 0.5 ? bell((u - 0.5) * 2) : 0; p.mouth = u > 0.5 ? 1 : -1; p.eyes = u > 0.5 ? 1 : 0; p.lean += d * 0.05 },
  cow: (u, p, d) => { const k = hold(u); p.lean += d * 0.18 * k; p.hx += d * 10 * k; p.hy += 6 * sin(u * 26) * k; p.turn += d * 0.16 * sin(u * 13) * k; p.mouth = 0.5 + 0.5 * sin(u * 26); p.eyes = -0.4 * k },
  bear: (u, p, d) => { const k = hold(u); p.lean += d * 0.14 * k; p.reach += d * 1.5 * k; p.armL += 0.8 * k; p.armR += 0.8 * k; p.sy += 0.08 * k; p.y -= 12 * k; p.eyes = -k },
  moose: (u, p, d) => { const k = hold(u); p.lean += d * 0.16 * k; p.turn += d * 0.35 * k + 0.12 * sin(u * 16) * k; p.hy += 34 * k; p.brow += 2 * k; p.top += 0.4 * sin(u * 16) * k },
}

/** How each takes what is done to it. `d` points to whoever does it. */
export const TAKES: Readonly<Record<GuestId, Move>> = {
  granny: (u, p, d) => { p.top += 1.6 * bell(u * 1.4); p.y -= 18 * bell(u * 2); p.eyes = bell(u); p.lean -= d * 0.08 * bell(u); p.mouth = -bell(u) },
  grandpa: (u, p, d) => { p.brow += 16 * bell(u * 1.2); p.eyes = 1 - u; p.hx -= d * 8 * shake(u, 2); p.mouth = -2; p.sy -= 0.08 * bell(u) },
  baby: (u, p) => { p.x += 5 * shake(u, 9); p.sy += 0.08 * shake(u, 7); p.mouth = 1; p.eyes = -0.9; p.armL += 0.7; p.armR += 0.7 },
  aunt: (u, p) => { p.sx += 0.14 * bell(u); p.sy += 0.18 * bell(u); p.y -= 8 * bell(u); p.mouth = bell(u); p.eyes = -bell(u); p.brow += 8 * bell(u) },
  uncle: (u, p) => { p.top += u * 12.566; p.eyes = 0.7; p.turn += 0.2 * shake(u, 2); p.mouth = -1 },
  dog: (u, p) => { p.turn += 0.6 * sin(u * PI * 6) * (1 - u * 0.5); p.top += 1.4 * sin(u * PI * 6 + 1); p.y -= 14 * abs(sin(u * PI * 3)); p.mouth = 1 },
  tall: (u, p, d) => { p.lean -= d * 0.3 * sin(u * PI * 3) * (1 - u); p.sx -= 0.14 * hold(u); p.sy += 0.08 * hold(u); p.eyes = 1; p.mouth = -1 },
  goose: (u, p) => { p.hx += 24 * sin(u * PI * 4) * bell(u); p.hy += 20 * sin(u * PI * 4 + 1.5) * bell(u); p.sy -= 0.06 * bell(u); p.eyes = 1; p.mouth = 0.4 },
  little: (u, p) => { const a = min(1, u * 2), b = max(0, u * 2 - 1); p.lean += -0.2 * bell(a) * (u < 0.5 ? 1 : 0); p.hy += u < 0.5 ? -14 * a : 26 * bell(b); p.eyes = -1; p.mouth = u < 0.5 ? 1 : -1; p.hs += u < 0.5 ? 0.12 * a : 0 },
  cow: (u, p) => { p.eyes = 1.5 * bell(u); p.mouth = -2; p.turn += 0.14 * shake(u, 3); p.sx += 0.06 * shake(u, 4); p.hy += 8 * bell(u) },
  bear: (u, p) => { const k = hold(u); p.armL += 0.75 * k; p.armR += 0.75 * k; p.hy += 14 * k; p.sy -= 0.14 * k; p.eyes = u > 0.45 && u < 0.7 ? 1 : -1; p.mouth = 0 },
  moose: (u, p) => { p.top += 1.2 * shake(u, 12); p.hy -= 12 * bell(u * 2); p.turn += 0.05 * shake(u, 8); p.eyes = 0.6 * bell(u); p.mouth = 0.6 * bell(u) },
}

/** Eating: how each dish goes in. `w` is how much it is liked: -1, 0 or 1. */
export const EATS: Readonly<Record<DishId, Move>> = {
  corn: (u, p) => { p.hx += -14 + 28 * ((u * 3) % 1); p.mouth = abs(sin(u * 60)) },
  mash: (u, p) => { p.hy += 40 * bell(u); p.mouth = u > 0.8 ? 0 : 1; p.sy -= 0.05 * bell(u) },
  milk: (u, p) => { p.turn -= 0.25 * hold(u); p.hy -= 12 * hold(u); p.mouth = -1; p.armR += 0.5 * hold(u) },
  jelly: (u, p) => { p.sx += 0.1 * sin(u * 34); p.sy -= 0.1 * sin(u * 34); p.mouth = hold(u) },
  sausages: (u, p) => { p.hx += 12 * sin(u * 50) * hold(u); p.mouth = -1; p.hs += 0.06 * hold(u); p.eyes = 0.8 },
  gravy: (u, p) => { p.hy += 26 * hold(u); p.hx += 6 * sin(u * 20); p.mouth = 1; p.turn += 0.12 * sin(u * 10) },
  pancakes: (u, p) => { p.mouth = abs(sin(u * PI * 5)); p.sy += 0.16 * u; p.hy -= 10 * u },
  rolls: (u, p) => { p.mouth = u < 0.5 ? 1 : -1; p.sx += 0.1 * bell(u * 2); p.hs += 0.1 * min(1, u * 2); p.armL += hold(u) * 0.5; p.armR += hold(u) * 0.5 },
  pumpkin: (u, p) => { p.mouth = 1 - u; p.sx += 0.16 * u; p.y += 6 * bell(u); p.eyes = 1 - u },
  cheese: (u, p) => { p.mouth = -2; p.turn += 0.2 * sin(u * 9); p.eyes = -0.6; p.hy += 8 * bell(u) },
  honey: (u, p) => { p.hy += u < 0.75 ? 30 * min(1, u * 3) - 26 * max(0, u - 0.3) * abs(sin(u * 20)) : -24 * bell((u - 0.75) * 4); p.mouth = -1; p.eyes = 0.5 },
  pie: (u, p) => { p.hy += u < 0.35 ? -18 * bell(u / 0.35) : 34 * hold((u - 0.35) / 0.65); p.mouth = u < 0.35 ? 1 : 0; p.armR += u < 0.3 ? 0.6 : 0 },
}

/** The look of liking and hating what is eaten, over the eating. */
export function relish(who: GuestId, dish: DishId, u: number, p: Pose): void {
  const t = taste(who, dish)
  if (t === 'likes') { p.eyes = -1; p.y -= 10 * abs(sin(u * PI * 4)); p.brow += 5 }
  else if (t === 'hates') { p.x += 3 * sin(u * 90); p.top += 0.8 * sin(u * 70); p.brow -= 6; p.eyes = u > 0.5 ? -1 : 1 }
}

/** At rest each breathes at its own pace and depth. */
export const BREATH: Readonly<Record<GuestId, { pace: number; deep: number; sway: number }>> = {
  granny: { pace: 2.3, deep: 0.018, sway: 0.02 }, grandpa: { pace: 1.2, deep: 0.04, sway: 0.01 }, baby: { pace: 3.4, deep: 0.03, sway: 0.07 },
  aunt: { pace: 1.9, deep: 0.03, sway: 0.03 }, uncle: { pace: 1.6, deep: 0.035, sway: 0.016 }, dog: { pace: 5.2, deep: 0.03, sway: 0.024 },
  tall: { pace: 1.1, deep: 0.012, sway: 0.045 }, goose: { pace: 2.8, deep: 0.02, sway: 0.05 }, little: { pace: 3.0, deep: 0.024, sway: 0.036 },
  cow: { pace: 0.9, deep: 0.03, sway: 0.018 }, bear: { pace: 1.0, deep: 0.05, sway: 0.026 }, moose: { pace: 0.8, deep: 0.026, sway: 0.032 },
}
