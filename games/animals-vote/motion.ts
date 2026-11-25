import type { Mouth } from './figures'
import type { Animal, Thing } from './things'

// How each animal moves, idle and in each of the five things. No two share a
// motion. A pose is laid on whatever the animal is doing; where two things
// happen at once their poses add, and each pair has a twist of its own.

export type Pose = { x: number; y: number; rot: number; sx: number; sy: number; hx: number; hy: number; hr: number; lid: number; mouth: Mouth; gx: number; gy: number }
export const still = (): Pose => ({ x: 0, y: 0, rot: 0, sx: 1, sy: 1, hx: 0, hy: 0, hr: 0, lid: 1, mouth: 'line', gx: 0, gy: 0 })

const S = Math.sin, C = Math.cos, abs = Math.abs, PI = Math.PI
/** A push that rings down, `t` seconds after it. */
export const ring = (t: number, rate = 22, fall = 6): number => (t > 2 || t < 0 ? 0 : Math.exp(-t * fall) * S(t * rate))
/** A beat: up and down again in the first part of each. */
const beat = (t: number, per: number, on = 0.5): number => { const k = (t % per) / (per * on); return k < 1 ? S(k * PI) : 0 }
const step = (t: number, per: number): number => (Math.floor(t / per) % 2 ? 1 : -1)

type Move = (t: number) => Partial<Pose>

const IDLE: Record<Animal, Move> = {
  pig: (t) => ({ sy: 1 + S(t * 3.1) * 0.018, sx: 1 - S(t * 3.1) * 0.012, hr: beat(t, 4.3, 0.2) * 0.12, mouth: 'smile', lid: t % 3.7 < 0.13 ? 0 : 1 }),
  elephant: (t) => ({ rot: S(t * 0.8) * 0.018, hx: S(t * 0.8 + 0.6) * 4, hr: S(t * 0.8 + 0.4) * 0.025, mouth: 'smile', lid: t % 5.3 < 0.22 ? 0 : 1 }),
  cat: (t) => ({ hr: beat(t, 6.1, 0.1) * 0.1, mouth: 'line', lid: t % 6.1 < 0.5 ? 0.35 : 1 }),
  mouse: (t) => ({ y: -beat(t, 1.9, 0.18) * 8, hr: S(t * 9) * 0.02, sy: 1 + beat(t, 1.9, 0.18) * 0.05, mouth: 'smile', lid: t % 2.9 < 0.1 ? 0 : 1 }),
  goat: (t) => ({ hx: S(t * 5) * (t % 5 < 2.2 ? 3 : 0), hy: abs(S(t * 5)) * (t % 5 < 2.2 ? 3 : 0), mouth: t % 5 < 2.2 ? (S(t * 10) > 0 ? 'wave' : 'line') : 'line', lid: t % 4.7 < 0.16 ? 0 : 1 }),
  giraffe: (t) => ({ hr: S(t * 0.55) * 0.06, hx: S(t * 0.55) * 5, mouth: 'line', lid: t % 5.9 < 0.4 ? 0.2 : 1 }),
}
export const idle = (who: Animal, t: number): Partial<Pose> => IDLE[who](t)

export const ACTS: Record<Thing, Record<Animal, Move>> = {
  bath: {
    pig: (t) => ({ x: S(t * 15) * 9, y: 22 - abs(S(t * 15)) * 16, rot: S(t * 15) * 0.1, mouth: 'open', gy: -1 }),
    elephant: (t) => ({ y: 6 + S(t * 2) * 5, hr: -0.14 + S(t * 4) * 0.08, hy: -8, mouth: 'smile', lid: 0.5 }),
    cat: (t) => ({ y: 12 + S(t * 26) * 1.5, sy: 1.12, sx: 0.88, hr: 0, mouth: 'frown', gx: S(t * 2) > 0 ? 1 : -1, gy: -0.6 }),
    mouse: (t) => ({ x: S(t * 3.4) * 46, y: 18 + S(t * 6.8) * 6, rot: C(t * 3.4) > 0 ? 0.3 : -0.3, mouth: 'smile' }),
    goat: (t) => ({ y: 16, hy: 20 + abs(S(t * 4)) * 12, hr: S(t * 4) * 0.06, mouth: S(t * 8) > 0 ? 'round' : 'line', gy: 1 }),
    giraffe: (t) => ({ y: 30, hr: S(t * 1.6) * 0.1, hy: -10, mouth: 'line', gy: -1, lid: 0.5 }),
  },
  mud: {
    pig: (t) => ({ rot: S(t * 2.2) * 1.5, y: -abs(S(t * 2.2)) * 34, mouth: 'open', lid: S(t * 4.4) > 0.6 ? 0 : 1 }),
    elephant: (t) => ({ y: 12 - beat(t, 2.4, 0.4) * 20, sy: 1 - beat(t + 0.5, 2.4, 0.3) * 0.06, hr: 0.06, mouth: 'wave', gy: 1 }),
    cat: (t) => ({ rot: -beat(t, 1.3, 0.6) * 0.16, hr: 0.14 * step(t, 0.65), x: beat(t, 0.26) * 4, mouth: 'frown', lid: 0.45 }),
    mouse: (t) => ({ y: 64 + beat(t, 2.6, 0.5) * 18, hr: S(t * 8) * 0.2, mouth: 'round', gy: -1 }),
    goat: (t) => ({ rot: 0.14, hy: 46 - beat(t, 0.8, 0.5) * 18, hx: 10, hr: 0.5, mouth: S(t * 14) > 0 ? 'open' : 'line', gy: 1 }),
    giraffe: (t) => ({ y: 20, hr: S(t * 9) * 0.12 * beat(t, 2, 0.5), hx: S(t * 30) * 2, sy: 0.97, mouth: 'wave', gx: -1, gy: 1 }),
  },
  dance: {
    pig: (t) => ({ x: step(t, 0.5) * 18 * S(((t % 0.5) / 0.5) * PI), rot: S(t * 2 * PI) * 0.16, sy: 1 - beat(t, 0.5) * 0.08, sx: 1 + beat(t, 0.5) * 0.07, mouth: 'smile' }),
    elephant: (t) => ({ rot: step(t, 1) * 0.09 * S((t % 1) * PI), y: -beat(t, 1, 0.5) * 22, sy: 1 - beat(t + 0.5, 1, 0.3) * 0.07, mouth: 'open' }),
    cat: (t) => ({ x: ((abs(((t / 2) % 2) - 1) * 2 - 1) * 26), hr: 0, hy: -beat(t, 0.5, 0.3) * 6, sy: 1.06, mouth: 'line', lid: 0.6, gx: step(t, 2) }),
    mouse: (t) => ({ x: C(t * 7) * 40, y: -abs(S(t * 14)) * 12 + S(t * 7) * 10 - 10, rot: S(t * 14) * 0.2, mouth: 'open' }),
    goat: (t) => ({ y: -beat(t, 0.25, 0.8) * 10, hr: S(t * 2) * 0.05, rot: 0, mouth: 'frown', lid: 0.5, gx: -1 }),
    giraffe: (t) => ({ hr: S(t * PI) * 0.3, hx: S(t * PI + 1) * 22, x: S(t * PI + 2) * 8, y: -beat(t, 1, 0.3) * 6, mouth: 'smile', lid: 0.3 }),
  },
  fly: {
    pig: (t) => ({ y: -480 - S(t * 1.5) * 26, x: 10 + S(t * 0.9) * 30, rot: PI + S(t * 2) * 0.2, mouth: 'open' }),
    elephant: (t) => ({ y: -54 - S(t * 1.2) * 18, rot: S(t * 1.2) * 0.07, sy: 1.04, mouth: 'wave', gy: 1 }),
    cat: (t) => ({ y: -130 + S(t * 1.8) * 18, x: 6, rot: S(t * 3) * 0.24, sy: 1.14, sx: 0.9, mouth: 'frown', gy: 1 }),
    mouse: (t) => ({ y: -610 + beat(t, 2.6, 0.6) * 110, x: 56 + S(t * 5) * 14, rot: S(t * 5) * 0.3, mouth: 'open' }),
    goat: (t) => ({ y: -90 - S(t * 1.1) * 24, x: 26, hr: -0.2 + S(t * 8) * 0.08, hy: -10, mouth: S(t * 16) > 0 ? 'open' : 'line', gy: -1 }),
    giraffe: (t) => ({ y: -118 - S(t * 0.9) * 20, rot: 0.1 + S(t * 0.9) * 0.08, hr: S(t * 1.8) * 0.12, mouth: 'round', gy: 1 }),
  },
  sleep: {
    pig: (t) => ({ rot: PI * 0.96, y: -74 - S(t * 2.5) * 5, sy: 1 + S(t * 2.5) * 0.07, lid: 0, mouth: S(t * 2.5) > 0 ? 'round' : 'line' }),
    elephant: (t) => ({ sy: 1 + S(t * 1.2) * 0.035, hy: 14 + S(t * 1.2) * 6, hr: 0.05, lid: 0, mouth: 'line' }),
    cat: (t) => ({ sy: 0.5 + S(t * 3) * 0.02, sx: 1.3, hy: 34, hr: 0.2, lid: 0, mouth: 'smile' }),
    mouse: (t) => ({ y: -beat(t, 1.2, 0.5) * 46, rot: beat(t, 1.2, 0.5) * 0.4, lid: 0, mouth: beat(t, 1.2, 0.5) > 0.2 ? 'round' : 'line' }),
    goat: (t) => ({ rot: S(t * 0.9) * 0.05, hr: -0.04, sy: 1 + S(t * 1.8) * 0.02, lid: 1, mouth: 'wave', gx: 0, gy: 0 }),
    giraffe: (t) => ({ hr: -0.95 + S(t * 1.5) * 0.05, hy: 22, lid: 0, mouth: 'round', sy: 1 + S(t * 1.5) * 0.015 }),
  },
}

export const pairsOf = (won: readonly Thing[]): string[] => won.flatMap((a, i) => won.slice(i + 1).map((b) => [a, b].sort((p, q) => ORDER.indexOf(p) - ORDER.indexOf(q)).join('+')))
const ORDER: readonly Thing[] = ['bath', 'mud', 'dance', 'fly', 'sleep']
const PLACE: Record<Animal, number> = { pig: 0, elephant: 1, cat: 2, mouse: 3, goat: 4, giraffe: 5 }

/** What a pair of things does to everybody beyond the two of them. */
export const TWISTS: Readonly<Record<string, (who: Animal, t: number) => Partial<Pose>>> = {
  'bath+mud': (who, t) => ({ y: S(t * 18 + PLACE[who]) * 4, rot: S(t * 9 + PLACE[who]) * 0.05 }),
  'bath+dance': (who, t) => ({ x: S(t * 1.7 + PLACE[who] * 0.2) * 60, rot: C(t * 1.7 + PLACE[who] * 0.2) * 0.24 }),
  'bath+fly': (who, t) => ({ rot: S(t * 0.8 + PLACE[who]) * 0.5 }),
  'bath+sleep': (who, t) => ({ y: 10 + S(t * 1.4 + PLACE[who]) * 7 }),
  'mud+dance': (who, t) => ({ y: -beat(t + PLACE[who] * 0.09, 0.5, 0.4) * 24 }),
  'mud+fly': (who, t) => ({ y: S(t * 5 + PLACE[who]) * 10 }),
  'mud+sleep': () => ({ y: 8 }),
  'dance+fly': (_who, t) => ({ rot: PI, x: S(t * 2 * PI) * 12 }),
  'dance+sleep': (who, t) => ({ x: S(t * 1.1) * 70 * (PLACE[who] % 2 ? 1 : 0.8), lid: 0, y: -beat(t, 0.5, 0.5) * 6 }),
  'fly+sleep': (who, t) => ({ y: S(t * 1.6 + PLACE[who] * 0.3) * 46, lid: 0 }),
}

function lay(on: Pose, by: Partial<Pose>, k: number): void {
  on.x += (by.x ?? 0) * k
  on.y += (by.y ?? 0) * k
  on.rot += (by.rot ?? 0) * k
  on.sx *= 1 + ((by.sx ?? 1) - 1) * k
  on.sy *= 1 + ((by.sy ?? 1) - 1) * k
  on.hx += (by.hx ?? 0) * k
  on.hy += (by.hy ?? 0) * k
  on.hr += (by.hr ?? 0) * k
  if (k > 0.4) {
    if (by.lid !== undefined) on.lid = Math.min(on.lid, by.lid)
    if (by.mouth) on.mouth = by.mouth
    if (by.gx !== undefined) on.gx = by.gx
    if (by.gy !== undefined) on.gy = by.gy
  }
}

/** How strongly a result acts `t` seconds in: in quickly, out slowly. */
export const strength = (t: number, length: number): number => {
  const a = Math.max(0, Math.min(1, t / 0.5)), b = Math.max(0, Math.min(1, (length - t) / 0.9)), k = Math.min(a, b)
  return k * k * (3 - 2 * k)
}

/** Somebody on the ground, in whatever is happening. */
export function poseOf(who: Animal, time: number, won: readonly Thing[], t: number, k: number): Pose {
  const pose = still()
  lay(pose, IDLE[who](time), 1)
  for (const thing of won) lay(pose, ACTS[thing][who](t), k)
  for (const pair of pairsOf(won)) lay(pose, TWISTS[pair](who, t), k)
  // A turn right over in two things at once is one turn and not two.
  if (won.length > 1) {
    pose.rot = Math.max(-PI * 1.1, Math.min(PI * 1.1, pose.rot))
    pose.sy = Math.max(0.5, Math.min(1.25, pose.sy))
    pose.sx = Math.max(0.75, Math.min(1.35, pose.sx))
  }
  return pose
}
