import type { Sleeper } from './things'

// How each of them moves, as numbers. No two share an act: the goat is stiff and jerks from the beard, the hippo
// is slow and everything follows late, the hen is quick from the neck and freezes between, the crocodile sways
// from a vain jaw, the pig bounces from the belly. The view only maps a pose onto parts.

export type Pose = {
  x: number; up: number; turn: number; flip: number; wide: number; tall: number
  headX: number; headY: number; headTurn: number
  /** 0 shut, 1 open, over 1 staring. */
  eyes: number; lookX: number; lookY: number
  /** -1 worried, 1 cross. */
  brow: number
  mouth: number; smile: number
  /** 0 hanging, 1 straight up, and how far both hands cover the face. */
  armL: number; armR: number; cover: number
  legL: number; legR: number
  /** The funniest part: beard, ears, comb, jaw, belly. */
  own: number
}

export const ACTS = ['sleepy', 'awake', 'gasp', 'look', 'appalled', 'love', 'late', 'bare', 'knight', 'lady', 'rider', 'sulk', 'glow', 'poke', 'caught', 'scuttle', 'yawn', 'tap'] as const
export type Act = (typeof ACTS)[number]

/** Seconds each act takes; 0 goes on as long as it is left. */
export const LASTS: Record<Act, number> = {
  sleepy: 0, awake: 0, gasp: 0.7, look: 0.7, appalled: 1.7, love: 1.7, late: 2.4, bare: 1.5, knight: 2.6, lady: 2.6, rider: 2.6,
  sulk: 0, glow: 0, poke: 0.8, caught: 1.3, scuttle: 0, yawn: 1, tap: 0.9,
}

const still = (): Pose => ({ x: 0, up: 0, turn: 0, flip: 0, wide: 1, tall: 1, headX: 0, headY: 0, headTurn: 0, eyes: 1, lookX: 0, lookY: 0, brow: 0, mouth: 0, smile: 0, armL: 0, armR: 0, cover: 0, legL: 0, legR: 0, own: 0 })

const sin = Math.sin
const hump = (u: number) => (u <= 0 || u >= 1 ? 0 : sin(u * Math.PI))
const part = (u: number, a: number, b: number) => Math.max(0, Math.min(1, (u - a) / (b - a)))
const ease = (u: number) => u * u * (3 - 2 * u)
const fade = (u: number) => 1 - u
const shake = (u: number, n: number) => sin(u * Math.PI * 2 * n)

type Nature = {
  idle: (p: Pose, t: number) => void
  /** Blinks: every so many seconds, for so long. */
  blink: [number, number]
  acts: Record<'gasp' | 'appalled' | 'love' | 'late' | 'bare' | 'sulk' | 'glow' | 'poke' | 'yawn' | 'caught' | 'tap', (p: Pose, u: number, t: number) => void>
  /** How its whole body goes into a part. */
  flair: number
  /** In the dark: breaths a second, how far the quilt rises, and what its twitch does to it. */
  breath: number; rise: number
  twitch: (u: number) => { x: number; up: number; lean: number }
  /** Its step on the floor: seconds a step, and the print it leaves. */
  stride: number
}

export const NATURE: Record<Sleeper, Nature> = {
  goat: {
    idle: (p, t) => { p.headTurn = Math.round(sin(t * 0.7) * 1.4) * 0.05; p.own = sin(t * 5.5) * 0.12; p.tall = 1 + sin(t * 2.2) * 0.008 },
    blink: [3.1, 0.1], flair: 0.8, breath: 0.42, rise: 10, stride: 0.2,
    twitch: (u) => ({ x: shake(u, 5) * 4 * fade(u), up: hump(u * 3) * 10, lean: 0 }),
    acts: {
      gasp: (p, u) => { p.up = hump(u * 1.6) * 58; p.eyes = 1.5; p.own = -0.9 * hump(u); p.mouth = 0.7 * fade(u); p.legL = p.legR = hump(u * 1.6) },
      appalled: (p, u) => { const k = Math.floor(u * 7); p.legR = k % 2; p.up = (k % 2) * 8; p.headY = 8; p.headTurn = k % 2 ? 0.07 : -0.04; p.own = 1; p.eyes = 1.4; p.lookY = 0.9; p.brow = 1; p.mouth = k % 2 ? 0.6 : 0.2; p.smile = -0.8 },
      love: (p, u) => { p.armL = 0.94 * ease(part(u, 0, 0.3)); p.headTurn = shake(u, 2) * 0.16; p.eyes = 0.35; p.smile = 1; p.own = sin(u * 30) * 0.5; p.up = Math.abs(shake(u, 2)) * 14 },
      late: (p, u) => { if (u < 0.55) { p.lookX = u < 0.28 ? -1 : 1; p.headTurn = u < 0.28 ? -0.14 : 0.14; p.smile = 0.5 } else { const v = part(u, 0.55, 1); p.lookY = 1; p.eyes = 1.7; p.up = hump(v * 1.5) * 84; p.own = -1; p.legL = p.legR = hump(v * 1.5); p.mouth = 0.9; p.brow = -0.6 } },
      bare: (p, u) => { p.headY = Math.abs(shake(u, 4)) * -9; p.own = shake(u, 6) * 0.6; p.mouth = 0.4 + shake(u, 8) * 0.2; p.smile = 1; p.eyes = 0.3 },
      sulk: (p, _u, t) => { p.headTurn = 0.1; p.brow = 0.9; p.smile = -0.7; p.lookX = -0.7; p.own = 0.5 + Math.round(sin(t * 1.3)) * 0.15; p.legR = Math.max(0, Math.round(sin(t * 1.1))) * 0.25 },
      glow: (p, _u, t) => { p.headTurn = sin(t * 1.4) * 0.08; p.smile = 1; p.eyes = 0.75; p.armL = 0.9; p.own = sin(t * 4) * 0.2 },
      poke: (p, u) => { p.turn = shake(u, 3) * 0.07 * fade(u); p.headY = -hump(u * 2) * 18; p.own = shake(u, 5); p.mouth = hump(u * 2) * 0.7; p.eyes = 1.3 },
      yawn: (p, u) => { p.headY = -10 * hump(u); p.mouth = hump(u) * 0.8; p.own = hump(u) * -0.6; p.eyes = 0.12 },
      caught: (p, u) => { p.legR = 1; p.turn = -0.06; p.eyes = 1.6; p.lookX = u < 0.35 ? -1 : u < 0.7 ? 1 : 0; p.own = -0.6; p.armL = 0.3; p.armR = 0.5 },
      tap: (p, u) => { p.legL = Math.round(u * 8) % 2; p.lookY = 1; p.own = 0.5; p.brow = 0.5 },
    },
  },
  hippo: {
    idle: (p, t) => { p.wide = 1 + sin(t * 1.1) * 0.018; p.tall = 1 - sin(t * 1.1) * 0.014; p.headY = sin(t * 1.1 - 0.9) * 3; p.own = Math.max(0, sin(t * 0.8)) * 0.2 },
    blink: [4.6, 0.26], flair: 0.6, breath: 0.2, rise: 22, stride: 0.42,
    twitch: (u) => ({ x: 0, up: hump(u) * 26, lean: sin(u * Math.PI * 2) * 0.05 }),
    acts: {
      gasp: (p, u) => { p.tall = 1 - hump(u) * 0.1; p.wide = 1 + hump(u) * 0.09; p.up = part(u, 0.25, 0.5) * fade(part(u, 0.5, 0.9)) * 18; p.eyes = 0.2 + ease(u) * 1.1; p.mouth = ease(part(u, 0.2, 1)) * 0.9; p.own = part(u, 0.3, 1) },
      appalled: (p, u) => { const k = ease(part(u, 0, 0.35)); p.cover = k; p.tall = 1 - 0.16 * k; p.wide = 1 + 0.08 * k; p.headY = 16 * k; p.own = 0.5 + sin(u * 26) * 0.5 * part(u, 0.4, 0.5); p.x = part(u, 0.35, 0.5) * shake(u, 6) * 2.4; p.eyes = 0.4; p.brow = -1; p.smile = -0.6 },
      love: (p, u) => { const k = ease(part(u, 0, 0.3)); p.turn = sin(u * Math.PI * 4) * 0.1 * k; p.up = hump(part(u, 0.3, 0.75)) * 20; p.armL = p.armR = 0.7 * k; p.eyes = 0.15; p.smile = 1; p.own = k; p.legR = 0.4 * k },
      late: (p, u) => { if (u < 0.6) { p.smile = 0.4; p.eyes = 0.5; p.mouth = hump(u / 0.6) * 0.3; p.lookX = sin(u * 5) * 0.5 } else { const v = part(u, 0.6, 1); p.lookY = 1; p.headY = ease(v) * 14; p.eyes = 0.5 + v * 1.1; p.mouth = v; p.own = v; p.brow = -v; p.wide = 1 + hump(v) * 0.14; p.tall = 1 - hump(v) * 0.14 } },
      bare: (p, u) => { p.wide = 1 + shake(u, 3) * 0.04; p.tall = 1 - shake(u, 3) * 0.04; p.cover = 0.45; p.eyes = 0.1; p.smile = 1; p.mouth = 0.3 + shake(u, 3) * 0.1; p.own = shake(u, 3) * 0.5 },
      sulk: (p, _u, t) => { p.cover = 0.82 + sin(t * 0.7) * 0.12; p.headY = 10; p.tall = 0.93; p.wide = 1.04; p.brow = -0.8; p.own = 0.3; p.eyes = 0.5 + Math.max(0, sin(t * 0.7)) * 0.4; p.smile = -0.5 },
      glow: (p, _u, t) => { p.turn = sin(t * 0.9) * 0.05; p.armL = p.armR = 0.3 + sin(t * 0.9) * 0.1; p.smile = 1; p.eyes = 0.4; p.own = 0.5 },
      poke: (p, u) => { p.wide = 1 + shake(u, 2) * 0.09 * fade(u); p.tall = 1 - shake(u, 2) * 0.09 * fade(u); p.mouth = hump(u) * 0.8; p.eyes = 1.15; p.own = hump(u) },
      yawn: (p, u) => { p.mouth = hump(u) * 1.2; p.headY = -8 * hump(u); p.tall = 1 + hump(u) * 0.05; p.eyes = 0.05; p.own = -hump(u) },
      caught: (p, u) => { p.legL = 0.8; p.eyes = 1.3; p.lookX = sin(u * 6); p.own = 1; p.armL = p.armR = 0.45; p.brow = -1; p.x = sin(u * 9) * 5 },
      tap: (p, u) => { p.legR = hump(u) * 0.7; p.lookY = 0.8; p.own = hump(u); p.headY = 6 },
    },
  },
  hen: {
    idle: (p, t) => { const k = Math.floor(t * 1.3); p.headX = ((k * 7) % 3 - 1) * 7; p.headY = (k * 5) % 2 ? -5 : 0; p.headTurn = ((k * 3) % 3 - 1) * 0.12; p.own = sin(t * 9) * 0.06 },
    blink: [1.7, 0.07], flair: 1.2, breath: 0.7, rise: 7, stride: 0.13,
    twitch: (u) => ({ x: (Math.floor(u * 6) % 2 ? 5 : -5) * (u < 0.8 ? 1 : 0), up: Math.abs(shake(u, 2)) * 14, lean: 0 }),
    acts: {
      gasp: (p, u) => { p.headY = -32 * hump(part(u, 0, 0.6)) - 8; p.eyes = 1.7; p.armL = p.armR = u < 0.6 ? 0.8 : 0.4; p.own = 1; p.mouth = u < 0.6 ? 0.9 : 0.2 },
      appalled: (p, u) => { const down = u < 0.18 ? ease(u / 0.18) : u < 0.5 ? 1 : u < 0.62 ? 1 - part(u, 0.5, 0.62) : u < 0.72 ? ease(part(u, 0.62, 0.72)) : 1; p.flip = down * Math.PI; p.up = down * 12 + hump(down) * 40; p.tall = 1 - 0.2 * down; p.wide = 1 + 0.1 * down; p.legL = p.legR = -0.4 * down + (Math.floor(u * 14) % 2) * 0.5 * down; p.eyes = down > 0.8 ? 0.02 : 1.7; p.armL = p.armR = down * 0.9; p.mouth = 0.6; p.own = -down },
      love: (p, u) => { const k = Math.floor(u * 10); p.up = k % 2 ? 22 : 0; p.headX = k % 2 ? 10 : -10; p.armL = k % 2 ? 0.7 : 0.1; p.armR = k % 2 ? 0.1 : 0.7; p.lookY = 0.8; p.eyes = 1.2; p.own = 0.5; p.smile = 1; p.legL = k % 2; p.legR = 1 - (k % 2) },
      late: (p, u) => { const k = Math.floor(u * 9); if (u < 0.5) { p.headX = [-10, 10, -10, 10, 0][k] ?? 0; p.headTurn = k % 2 ? 0.2 : -0.2; p.smile = 0.3 } else if (u < 0.62) { p.lookY = 1; p.headY = 12; p.eyes = 1.8 } else { const v = part(u, 0.62, 1); p.up = hump(v * 1.1) * 110; p.armL = p.armR = k % 2; p.eyes = 1.8; p.mouth = 1; p.own = 1; p.legL = p.legR = 0.8 } },
      bare: (p, u) => { const k = Math.floor(u * 12); p.headY = k % 2 ? -12 : 4; p.mouth = k % 2 ? 0.7 : 0; p.armR = 0.5; p.smile = 0.8; p.eyes = 0.8; p.own = k % 2 ? 0.4 : 0 },
      sulk: (p, _u, t) => { const k = Math.floor(t * 0.9); p.headX = 20; p.headY = 16; p.headTurn = 0.62; p.armR = 0.74; p.eyes = k % 4 === 3 ? 1.5 : 0.02; p.lookX = -1; p.legL = k % 3 === 0 ? 0.5 : 0; p.own = -1; p.brow = 0.8 },
      glow: (p, _u, t) => { const k = Math.floor(t * 2); p.lookY = 0.8; p.headX = k % 3 === 0 ? 8 : -4; p.legL = k % 4 === 1 ? 0.5 : 0; p.legR = k % 4 === 3 ? 0.5 : 0; p.smile = 1; p.own = 0.3 },
      poke: (p, u) => { p.up = u < 0.4 ? hump(u / 0.4) * 46 : 0; p.armL = p.armR = Math.floor(u * 12) % 2; p.headX = Math.floor(u * 8) % 2 ? 9 : -9; p.mouth = Math.floor(u * 8) % 2 ? 0.7 : 0; p.eyes = 1.5; p.own = 0.8 },
      yawn: (p, u) => { p.headY = -18 * hump(u); p.mouth = u > 0.2 && u < 0.7 ? 0.8 : 0; p.eyes = u > 0.2 ? 0.02 : 0.6; p.own = -0.4; p.armL = hump(u) * 0.5 },
      caught: (p, u) => { p.legL = 1; p.headX = u < 0.3 ? -12 : u < 0.6 ? 12 : -12; p.headTurn = u < 0.3 ? -0.3 : 0.3; p.eyes = 1.8; p.armL = p.armR = 0.25; p.own = 1 },
      tap: (p, u) => { const k = Math.floor(u * 10); p.legL = k % 2; p.legR = 1 - (k % 2); p.lookY = 1; p.headY = 8 },
    },
  },
  croc: {
    idle: (p, t) => { p.turn = sin(t * 0.9) * 0.025; p.headTurn = sin(t * 0.9 - 0.6) * 0.06; p.headX = sin(t * 0.9 - 0.4) * 4; p.own = Math.max(0, sin(t * 0.45)) * 0.06 },
    blink: [3.8, 0.34], flair: 1, breath: 0.3, rise: 13, stride: 0.3,
    twitch: (u) => ({ x: sin(u * Math.PI * 2) * 12 * fade(u), up: 0, lean: sin(u * Math.PI * 2) * 0.09 }),
    acts: {
      gasp: (p, u) => { p.own = ease(part(u, 0, 0.4)); p.mouth = p.own; p.headY = -14 * hump(u); p.eyes = 1.4; p.armL = 0.6 * hump(u) },
      appalled: (p, u) => { if (u < 0.5) { p.own = ease(part(u, 0, 0.2)) * 1.25; p.lookY = 0.9; p.eyes = 1.5; p.headY = -10 } else { const v = part(u, 0.5, 0.58); p.own = (1 - v) * 1.25; p.headTurn = v * 0.34; p.turn = v * 0.06; p.eyes = 0.25; p.brow = 0.8; p.smile = -0.9; p.armR = 0.45 * v; p.lookX = 1 } },
      love: (p, u) => { p.headTurn = sin(u * Math.PI * 2) * 0.3; p.headX = sin(u * Math.PI * 2) * 14; p.turn = -sin(u * Math.PI * 2) * 0.07; p.armR = 0.85; p.eyes = 0.45; p.smile = 1; p.own = 0.1 },
      late: (p, u) => { if (u < 0.6) { p.headTurn = sin(u * 8) * 0.18; p.eyes = 0.4; p.smile = 0.8; p.armL = 0.3 } else { const v = part(u, 0.6, 1); p.lookY = 1; p.own = ease(part(v, 0, 0.5)) * 1.5; p.eyes = 1.6; p.headY = -30 * hump(v); p.armL = p.armR = v * 0.8; p.tall = 1 + hump(v) * 0.12 } },
      bare: (p, u) => { p.own = 0.3 + shake(u, 4) * 0.2; p.headTurn = -0.16; p.armR = 0.62; p.eyes = 0.3; p.smile = 1; p.turn = -0.04 },
      sulk: (p, _u, t) => { p.headTurn = 0.32; p.turn = 0.05 + sin(t * 0.8) * 0.02; p.eyes = 0.3; p.brow = 0.8; p.smile = -0.9; p.lookX = sin(t * 0.5) > 0.7 ? -1 : 1; p.armR = 0.4 },
      glow: (p, _u, t) => { p.headTurn = sin(t * 0.8) * 0.22; p.turn = -sin(t * 0.8) * 0.04; p.eyes = 0.5; p.smile = 1; p.armR = 0.7 + sin(t * 1.6) * 0.06 },
      poke: (p, u) => { p.turn = sin(u * Math.PI * 2) * 0.11 * fade(u); p.own = u < 0.5 ? hump(u * 2) : 0; p.eyes = 1.2; p.headTurn = sin(u * Math.PI * 2 - 0.8) * 0.2 },
      yawn: (p, u) => { p.own = hump(u) * 1.5; p.headY = -16 * hump(u); p.eyes = 0.08; p.armL = hump(u) * 0.5 },
      caught: (p, u) => { p.legR = 0.9; p.armL = 0.6; p.armR = 0.2; p.own = 0.7; p.eyes = 1.4; p.headTurn = u < 0.5 ? -0.3 : 0.3; p.lookX = u < 0.5 ? -1 : 1 },
      tap: (p, u) => { p.legR = Math.max(0, shake(u, 2)) * 0.8; p.lookY = 0.9; p.headTurn = 0.16; p.eyes = 0.6 },
    },
  },
  pig: {
    idle: (p, t) => { const b = Math.abs(sin(t * 1.6)); p.wide = 1.02 - b * 0.03; p.tall = 0.985 + b * 0.03; p.own = sin(t * 3.2) * 0.2 },
    blink: [2.5, 0.12], flair: 1.1, breath: 0.34, rise: 16, stride: 0.24,
    twitch: (u) => ({ x: 0, up: Math.abs(shake(u, 1.5)) * 22 * fade(u), lean: shake(u, 3) * 0.04 }),
    acts: {
      gasp: (p, u) => { p.up = hump(u * 1.3) * 34; p.wide = 1 - hump(u) * 0.14; p.tall = 1 + hump(u) * 0.17; p.eyes = 1.5; p.mouth = 0.5; p.own = shake(u, 4) },
      appalled: (p, u) => { p.wide = u < 0.5 ? Math.cos(u * Math.PI * 4) : 1 + shake(u, 5) * 0.05; p.up = Math.abs(shake(u, 3)) * 20; p.eyes = 1.5; p.lookX = u > 0.5 ? -0.8 : 0; p.lookY = 0.6; p.mouth = u > 0.45 ? 0.95 : 0.4; p.armL = p.armR = u > 0.45 ? 0.75 : 0.2; p.own = shake(u, 6); p.brow = -0.8 },
      love: (p, u) => { p.up = Math.abs(shake(u, 2.5)) * 40; p.wide = 1 + Math.cos(u * Math.PI * 10) * 0.07; p.tall = 1 - Math.cos(u * Math.PI * 10) * 0.07; p.armL = p.armR = 0.95; p.smile = 1; p.mouth = 0.5; p.eyes = 0.2; p.own = shake(u, 5) },
      late: (p, u) => { if (u < 0.5) { p.smile = 1; p.eyes = 0.7; p.turn = sin(u * 20) * 0.05; p.lookX = sin(u * 12) } else { const v = part(u, 0.5, 1); p.lookY = v < 0.3 ? 1 : 0; p.up = v > 0.25 ? Math.abs(shake(v, 1.5)) * 70 : 0; p.wide = v > 0.25 ? Math.cos(v * Math.PI * 6) : 1; p.eyes = 1.7; p.mouth = v; p.armL = p.armR = v } },
      bare: (p, u) => { p.wide = 1 + shake(u, 5) * 0.06; p.tall = 1 - shake(u, 5) * 0.06; p.armL = p.armR = 0.15; p.smile = 1; p.mouth = 0.6; p.eyes = 0.1; p.own = shake(u, 5) },
      sulk: (p, _u, t) => { p.turn = 0.08; p.lookX = -0.9; p.lookY = 0.5; p.headTurn = -0.12; p.brow = -0.7; p.smile = -0.8; p.armL = 0.35; p.own = 0.4 + Math.abs(sin(t * 1.2)) * 0.2; p.wide = 1.03; p.tall = 0.97 },
      glow: (p, _u, t) => { p.up = Math.abs(sin(t * 2.4)) * 7; p.smile = 1; p.eyes = 0.6; p.armL = p.armR = 0.5; p.own = sin(t * 4.8) * 0.4 },
      poke: (p, u) => { p.wide = 1 + shake(u, 2.5) * 0.14 * fade(u); p.tall = 1 - shake(u, 2.5) * 0.14 * fade(u); p.mouth = hump(u * 1.6) * 0.8; p.eyes = 1.2; p.own = shake(u, 4) },
      yawn: (p, u) => { p.tall = 1 + hump(u) * 0.09; p.wide = 1 - hump(u) * 0.06; p.mouth = hump(u); p.armL = p.armR = hump(u) * 0.95; p.eyes = 0.05; p.own = hump(u) * 0.5 },
      caught: (p, u) => { p.legL = 1; p.turn = 0.1; p.eyes = 1.5; p.lookX = u < 0.4 ? 1 : -1; p.armL = p.armR = 0.65; p.mouth = 0.4; p.up = 4 },
      tap: (p, u) => { p.up = Math.abs(shake(u, 3)) * 8; p.legL = Math.max(0, shake(u, 3)); p.legR = Math.max(0, -shake(u, 3)); p.lookY = 1; p.smile = 0.3 },
    },
  },
}

/** How a sleeper stands at second `t` of the game, `age` seconds into an act. `watch` is where it looks when nothing else has its eyes. */
export function poseOf(sleeper: Sleeper, act: Act, age: number, t: number, watch: { x: number; y: number }): Pose {
  const nature = NATURE[sleeper], p = still(), lasts = LASTS[act]
  const u = lasts > 0 ? Math.min(1, age / lasts) : Math.min(1, age)
  nature.idle(p, t)
  p.lookX = watch.x
  p.lookY = watch.y
  if (act === 'sleepy') {
    // Wanting sleep: lids half down, and now and then its own yawn.
    const beat = (t * 0.16 + nature.breath * 3.7) % 1
    p.eyes = 0.42; p.brow = -0.3
    if (beat < 0.22) nature.acts.yawn(p, beat / 0.22, t)
  } else if (act === 'look') {
    p.lookX = 0; p.lookY = 1; p.eyes = 1.3; p.headY += 6
  } else if (act === 'knight') {
    // Salutes, chin up, once for each clank.
    const k = ease(part(u, 0, 0.15)), f = nature.flair
    p.armR = k * (0.82 + shake(u, 3) * 0.06); p.headY -= 12 * k; p.tall += 0.05 * k * f; p.brow = 0.7; p.eyes = 0.8; p.smile = 0.2
    p.legL = Math.max(0, shake(u, 3)) * 0.8 * f; p.legR = Math.max(0, -shake(u, 3)) * 0.8 * f; p.lookY = -0.6
  } else if (act === 'lady') {
    // Curtsies low, fans itself.
    const dip = hump(part(u, 0.05, 0.6)), f = nature.flair
    p.tall -= 0.2 * dip; p.wide += 0.12 * dip; p.headTurn += sin(u * Math.PI * 2) * 0.16 * f; p.armL = 0.3 + dip * 0.2; p.armR = 0.62 + shake(u, 9) * 0.07 * part(u, 0.55, 0.65); p.eyes = 0.3; p.smile = 0.7
  } else if (act === 'rider') {
    // Turns on one toe.
    const k = ease(part(u, 0, 0.12)) * fade(ease(part(u, 0.88, 1))), f = nature.flair
    p.wide = 1 - k + k * (Math.cos(u * Math.PI * 8) || 0.05); p.up = 16 * k * f; p.armL = 0.5 + 0.3 * k; p.armR = 0.5 + 0.48 * k; p.legL = 0.9 * k; p.smile = 1; p.eyes = 0.7
  } else if (act === 'scuttle') {
    const s = t * Math.PI / nature.stride
    p.legL = Math.max(0, sin(s)); p.legR = Math.max(0, -sin(s)); p.up = Math.abs(sin(s)) * 8; p.turn = sin(s) * 0.05; p.eyes = 1.4; p.armL = p.armR = 0.3
  } else if (act !== 'awake') {
    nature.acts[act](p, u, t)
  }
  if (p.eyes > 0.3 && (t + nature.breath * 9) % nature.blink[0] < nature.blink[1]) p.eyes = 0.05
  // A turn is drawn by width: never quite nothing.
  if (Math.abs(p.wide) < 0.08) p.wide = p.wide < 0 ? -0.08 : 0.08
  return p
}
