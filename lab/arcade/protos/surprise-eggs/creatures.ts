// Who can be inside an egg: what it looks like, how it sounds, and the trick
// it does when it lands in the meadow or gets tapped there.

import { TAU, ease } from '../../kit/math.ts'
import type { Sfx } from '../../kit/sfx.ts'

export type Tier = 'common' | 'rare' | 'gag'
export type Trick =
  | 'hop'
  | 'bighop'
  | 'flip'
  | 'spin'
  | 'wiggle'
  | 'grow'
  | 'dash'
  | 'hide'
  | 'flutter'
  | 'fire'
  | 'rainbow'
  | 'robot'
  | 'stomp'
  | 'beam'
  | 'boo'
  | 'tall'
  | 'stink'
  | 'flop'
  | 'grump'
  | 'sizzle'

export type Voice =
  | 'cheep'
  | 'tweet'
  | 'ribbit'
  | 'quack'
  | 'hoot'
  | 'hiss'
  | 'buzz'
  | 'bubble'
  | 'squeak'
  | 'squawk'
  | 'snap'
  | 'honk'
  | 'slow'
  | 'magic'
  | 'roar'
  | 'beep'
  | 'ufo'
  | 'boo'
  | 'fart'
  | 'trombone'
  | 'cockadoodle'
  | 'sizzle'

export interface Creature {
  e: string
  tier: Tier
  trick: Trick
  voice: Voice
  // Seconds the trick lasts.
  dur: number
}

const c = (e: string, tier: Tier, trick: Trick, voice: Voice, dur = 0.9): Creature => ({ e, tier, trick, voice, dur })

export const CREATURES: readonly Creature[] = [
  c('🐥', 'common', 'hop', 'cheep', 0.7),
  c('🐸', 'common', 'bighop', 'ribbit', 0.8),
  c('🐢', 'common', 'hide', 'slow', 1.3),
  c('🐧', 'common', 'wiggle', 'honk'),
  c('🦆', 'common', 'dash', 'quack'),
  c('🐍', 'common', 'wiggle', 'hiss', 1.0),
  c('🦉', 'common', 'spin', 'hoot', 1.0),
  c('🐊', 'common', 'grow', 'snap', 0.7),
  c('🐙', 'common', 'wiggle', 'bubble'),
  c('🐞', 'common', 'flip', 'squeak', 0.7),
  c('🐝', 'common', 'flutter', 'buzz', 1.1),
  c('🦎', 'common', 'dash', 'squeak', 0.6),
  c('🦜', 'common', 'flip', 'squawk'),
  c('🐠', 'common', 'flip', 'bubble', 0.8),
  c('🦩', 'common', 'tall', 'squawk', 1.0),
  c('🦋', 'common', 'flutter', 'squeak', 1.2),
  c('🐌', 'common', 'hide', 'slow', 1.4),
  c('🦀', 'common', 'dash', 'snap', 0.8),
  c('🐦', 'common', 'hop', 'tweet', 0.7),
  c('🦄', 'rare', 'rainbow', 'magic', 1.2),
  c('🐉', 'rare', 'fire', 'roar', 1.3),
  c('🤖', 'rare', 'robot', 'beep', 1.2),
  c('🦖', 'rare', 'stomp', 'roar', 1.0),
  c('👽', 'rare', 'beam', 'ufo', 1.3),
  c('👻', 'rare', 'boo', 'boo', 1.4),
  c('🦕', 'rare', 'tall', 'roar', 1.2),
  c('🧦', 'gag', 'flop', 'trombone', 1.1),
  c('🐓', 'gag', 'grump', 'cockadoodle', 1.2),
  c('💩', 'gag', 'stink', 'fart', 1.0),
  c('🍳', 'gag', 'sizzle', 'sizzle', 1.0),
]

export function speak(sfx: Sfx, voice: Voice): void {
  const j = 0.94 + Math.random() * 0.12
  switch (voice) {
    case 'cheep':
      for (let i = 0; i < 3; i++) sfx.tone({ freq: 2300 * j, to: 3100 * j, dur: 0.07, type: 'sine', vol: 0.2, delay: i * 0.11 })
      break
    case 'tweet':
      sfx.tone({ freq: 1800 * j, to: 2600 * j, dur: 0.09, vol: 0.2 })
      sfx.tone({ freq: 2600 * j, to: 2000 * j, dur: 0.09, vol: 0.2, delay: 0.11 })
      sfx.tone({ freq: 2200 * j, to: 3000 * j, dur: 0.12, vol: 0.2, delay: 0.22 })
      break
    case 'ribbit':
      sfx.tone({ freq: 170 * j, to: 260 * j, dur: 0.12, type: 'square', vol: 0.16 })
      sfx.tone({ freq: 210 * j, to: 340 * j, dur: 0.16, type: 'square', vol: 0.16, delay: 0.15 })
      break
    case 'quack':
      sfx.tone({ freq: 520 * j, to: 330 * j, dur: 0.13, type: 'sawtooth', vol: 0.16 })
      sfx.tone({ freq: 500 * j, to: 300 * j, dur: 0.16, type: 'sawtooth', vol: 0.16, delay: 0.17 })
      break
    case 'hoot':
      sfx.tone({ freq: 360 * j, to: 330 * j, dur: 0.18, type: 'sine', vol: 0.3, attack: 0.03 })
      sfx.tone({ freq: 340 * j, to: 290 * j, dur: 0.34, type: 'sine', vol: 0.3, delay: 0.24, attack: 0.03 })
      break
    case 'hiss':
      sfx.noise({ dur: 0.5, vol: 0.2, freq: 5200, to: 7000, filter: 'highpass' })
      break
    case 'buzz':
      sfx.tone({ freq: 190 * j, to: 240 * j, dur: 0.25, type: 'sawtooth', vol: 0.12 })
      sfx.tone({ freq: 240 * j, to: 180 * j, dur: 0.3, type: 'sawtooth', vol: 0.12, delay: 0.22 })
      break
    case 'bubble':
      for (let i = 0; i < 4; i++) sfx.tone({ freq: (300 + i * 90) * j, to: (800 + i * 140) * j, dur: 0.08, vol: 0.22, delay: i * 0.09 })
      break
    case 'squeak':
      sfx.tone({ freq: 1200 * j, to: 1900 * j, dur: 0.08, vol: 0.2 })
      sfx.tone({ freq: 1500 * j, to: 2200 * j, dur: 0.08, vol: 0.2, delay: 0.1 })
      break
    case 'squawk':
      sfx.tone({ freq: 950 * j, to: 620 * j, dur: 0.16, type: 'square', vol: 0.12 })
      sfx.tone({ freq: 1100 * j, to: 700 * j, dur: 0.2, type: 'square', vol: 0.12, delay: 0.18 })
      break
    case 'snap':
      sfx.chomp()
      sfx.tone({ freq: 140 * j, to: 90, dur: 0.12, type: 'square', vol: 0.15, delay: 0.12 })
      break
    case 'honk':
      sfx.tone({ freq: 520 * j, to: 440 * j, dur: 0.14, type: 'triangle', vol: 0.3 })
      sfx.tone({ freq: 620 * j, to: 470 * j, dur: 0.2, type: 'triangle', vol: 0.3, delay: 0.16 })
      break
    case 'slow':
      sfx.tone({ freq: 220 * j, to: 150 * j, dur: 0.5, type: 'sine', vol: 0.3, attack: 0.05 })
      sfx.tone({ freq: 150 * j, to: 230 * j, dur: 0.4, type: 'sine', vol: 0.25, delay: 0.6, attack: 0.05 })
      break
    case 'magic':
      for (let i = 0; i < 8; i++) sfx.note(i + 2, 0.22, 'sine', 0.2 - i * 0.012)
      for (let i = 0; i < 8; i++) sfx.tone({ freq: sfx.scale(i + 4), dur: 0.2, vol: 0.16, delay: i * 0.06 })
      break
    case 'roar':
      sfx.tone({ freq: 170 * j, to: 60, dur: 0.7, type: 'sawtooth', vol: 0.22, attack: 0.04 })
      sfx.noise({ dur: 0.7, vol: 0.22, freq: 700, to: 200, filter: 'lowpass' })
      break
    case 'beep':
      for (let i = 0; i < 5; i++) sfx.tone({ freq: sfx.scale(Math.floor(Math.random() * 9) - 2), dur: 0.07, type: 'square', vol: 0.1, delay: i * 0.09 })
      break
    case 'ufo':
      sfx.tone({ freq: 500, to: 1300, dur: 0.35, type: 'sine', vol: 0.2 })
      sfx.tone({ freq: 1300, to: 500, dur: 0.35, type: 'sine', vol: 0.2, delay: 0.35 })
      sfx.tone({ freq: 500, to: 1500, dur: 0.4, type: 'sine', vol: 0.2, delay: 0.7 })
      break
    case 'boo':
      sfx.tone({ freq: 300, to: 620, dur: 0.45, type: 'triangle', vol: 0.25, attack: 0.1 })
      sfx.tone({ freq: 620, to: 240, dur: 0.6, type: 'triangle', vol: 0.25, delay: 0.45 })
      break
    case 'fart':
      sfx.tone({ freq: 120 * j, to: 55, dur: 0.45, type: 'sawtooth', vol: 0.25 })
      sfx.tone({ freq: 95 * j, to: 70, dur: 0.18, type: 'square', vol: 0.12, delay: 0.3 })
      break
    case 'trombone':
      sfx.tone({ freq: 392, to: 370, dur: 0.22, type: 'sawtooth', vol: 0.14 })
      sfx.tone({ freq: 370, to: 349, dur: 0.22, type: 'sawtooth', vol: 0.14, delay: 0.26 })
      sfx.tone({ freq: 349, to: 250, dur: 0.6, type: 'sawtooth', vol: 0.14, delay: 0.52 })
      break
    case 'cockadoodle':
      sfx.tone({ freq: 620, to: 660, dur: 0.1, type: 'square', vol: 0.12 })
      sfx.tone({ freq: 830, to: 830, dur: 0.1, type: 'square', vol: 0.12, delay: 0.14 })
      sfx.tone({ freq: 830, to: 800, dur: 0.1, type: 'square', vol: 0.12, delay: 0.28 })
      sfx.tone({ freq: 1050, to: 700, dur: 0.5, type: 'square', vol: 0.12, delay: 0.42 })
      break
    case 'sizzle':
      sfx.noise({ dur: 0.8, vol: 0.18, freq: 6000, to: 4000, filter: 'highpass' })
      sfx.splat()
      break
  }
}

export interface Pose {
  dx: number
  dy: number
  rot: number
  sx: number
  sy: number
  alpha: number
}

// Where a creature is `p` (0..1) of the way through its trick. `size` is its
// height in pixels, so big creatures move big.
export function poseFor(trick: Trick, p: number, size: number): Pose {
  const out: Pose = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, alpha: 1 }
  const arc = Math.sin(p * Math.PI)
  switch (trick) {
    case 'hop':
      out.dy = -Math.abs(Math.sin(p * TAU)) * size * 0.7
      out.sy = 1 + Math.abs(Math.cos(p * TAU)) * 0.12
      break
    case 'bighop':
      out.dy = -arc * size * 1.9
      out.sy = 1 + arc * 0.25
      out.sx = 1 - arc * 0.12
      break
    case 'flip':
      out.dy = -arc * size * 1.1
      out.rot = ease.inOutQuad(p) * TAU
      break
    case 'spin':
      out.sx = Math.cos(p * TAU * 2)
      out.dy = -arc * size * 0.3
      break
    case 'wiggle':
      out.rot = Math.sin(p * TAU * 3) * 0.42 * (1 - p * 0.5)
      out.dy = -Math.abs(Math.sin(p * TAU * 3)) * size * 0.12
      break
    case 'grow':
      out.sx = out.sy = 1 + arc * 0.75
      out.rot = Math.sin(p * TAU * 2) * 0.12
      break
    case 'dash':
      out.dx = Math.sin(p * TAU) * size * 1.0
      out.rot = Math.cos(p * TAU) * 0.22
      out.sx = 1 + Math.abs(Math.cos(p * TAU)) * 0.18
      break
    case 'hide':
      out.sy = 1 - Math.sin(Math.min(1, p * 1.3) * Math.PI) * 0.62
      out.sx = 1 + arc * 0.22
      break
    case 'flutter':
      out.dy = -arc * size * 1.5 + Math.sin(p * 40) * 5
      out.dx = Math.sin(p * TAU * 2) * size * 0.6
      out.sx = 0.65 + Math.abs(Math.cos(p * 45)) * 0.35
      break
    case 'fire':
      out.sx = out.sy = 1 + arc * 0.3
      out.rot = Math.sin(p * TAU * 4) * 0.06
      break
    case 'rainbow':
      out.dy = -arc * size * 1.1
      out.rot = Math.sin(p * TAU) * 0.3
      break
    case 'robot':
      out.rot = Math.round(Math.sin(p * TAU * 3)) * 0.3
      out.dy = -Math.abs(Math.sin(p * TAU * 3)) * size * 0.15
      break
    case 'stomp': {
      const q = Math.min(1, p / 0.7)
      out.dy = -Math.sin(q * Math.PI) * size * 1.5
      if (p > 0.7) {
        const s = Math.sin(((p - 0.7) / 0.3) * Math.PI)
        out.sy = 1 - s * 0.35
        out.sx = 1 + s * 0.3
      }
      break
    }
    case 'beam':
      out.dy = -arc * size * 1.6
      out.sx = 1 + Math.sin(p * 50) * 0.06
      out.rot = Math.sin(p * TAU * 2) * 0.2
      break
    case 'boo':
      if (p < 0.3) out.alpha = 1 - p / 0.3
      else if (p < 0.45) out.alpha = 0
      else {
        const q = (p - 0.45) / 0.55
        out.sx = out.sy = 1 + (1 - ease.outElastic(q)) * -0.2 + (1 - q) * 1.1
        out.alpha = Math.min(1, q * 6)
      }
      break
    case 'tall':
      out.sy = 1 + arc * 0.9
      out.sx = 1 - arc * 0.28
      break
    case 'stink':
      out.sy = 1 - Math.abs(Math.sin(p * TAU * 2)) * 0.3
      out.sx = 1 + Math.abs(Math.sin(p * TAU * 2)) * 0.25
      break
    case 'flop':
      out.rot = Math.sin(Math.min(1, p * 1.2) * Math.PI) * 1.5
      out.dy = -Math.sin(Math.min(1, p * 3) * Math.PI) * size * 0.5
      break
    case 'grump':
      out.dx = Math.sin(p * TAU * 6) * size * 0.1
      out.sy = 1 + arc * 0.25
      break
    case 'sizzle':
      out.sx = 1 + Math.sin(p * TAU * 5) * 0.12
      out.sy = 1 - Math.sin(p * TAU * 5) * 0.12
      out.rot = p * TAU
      out.dy = -arc * size * 1.2
      break
  }
  return out
}
