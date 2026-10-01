// The sounds of the wood and the room, all made from the kit's tone and
// noise at low volume. Each is the sound of the thing itself.

import type { Sfx } from '../../kit/sfx.ts'
import type { Season } from './seasons.ts'

// A footfall: snow squeaks, dry leaves crackle, grass is nearly silent.
export function step(sfx: Sfx, season: Season): void {
  if (season === 0) {
    sfx.noise({ dur: 0.12, freq: 1100, to: 480, vol: 0.07, filter: 'lowpass' })
    sfx.noise({ dur: 0.05, freq: 3200, vol: 0.018, q: 2 })
  } else if (season === 3) {
    sfx.noise({ dur: 0.07, freq: 2600 + Math.random() * 1200, vol: 0.045, q: 1.2 })
    sfx.noise({ dur: 0.05, freq: 4200, vol: 0.025, q: 2, delay: 0.035 })
  } else {
    sfx.noise({ dur: 0.06, freq: 420, vol: 0.055, filter: 'lowpass' })
    sfx.tone({ freq: 105, to: 80, dur: 0.06, vol: 0.03 })
  }
}

export function stone(sfx: Sfx): void {
  sfx.tone({ freq: 470 + Math.random() * 70, to: 380, dur: 0.05, type: 'triangle', vol: 0.07 })
  sfx.noise({ dur: 0.03, freq: 1800, vol: 0.03 })
}

// A soft bell-like note, for a found thing and for the candle.
export function chime(sfx: Sfx, note: number, vol = 0.09, delay = 0): void {
  const f = sfx.scale(note)
  sfx.tone({ freq: f, dur: 0.9, type: 'sine', vol, attack: 0.008, delay })
  sfx.tone({ freq: f * 2, dur: 0.35, type: 'sine', vol: vol * 0.25, delay })
}

export function wicker(sfx: Sfx): void {
  sfx.noise({ dur: 0.07, freq: 800, to: 520, vol: 0.07, q: 3 })
  sfx.noise({ dur: 0.05, freq: 1500, vol: 0.03, q: 4, delay: 0.05 })
  sfx.tone({ freq: 170, to: 120, dur: 0.07, vol: 0.06 })
}

export function rustle(sfx: Sfx, vol = 0.05): void {
  for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.08, freq: 3200 + Math.random() * 2200, vol, q: 1.4, delay: i * 0.05 })
}

export function swish(sfx: Sfx): void {
  sfx.noise({ dur: 0.2, freq: 1700, to: 3300, vol: 0.045, q: 0.9 })
}

export function snowFall(sfx: Sfx): void {
  sfx.noise({ dur: 0.25, freq: 700, to: 300, vol: 0.08, filter: 'lowpass' })
}

export function tick(sfx: Sfx): void {
  sfx.noise({ dur: 0.014, freq: 5200, vol: 0.02, filter: 'highpass' })
}

export function whirr(sfx: Sfx): void {
  for (let i = 0; i < 6; i++) sfx.noise({ dur: 0.03, freq: 2400, vol: 0.025, q: 3, delay: i * 0.035 })
}

export function scrabble(sfx: Sfx): void {
  for (let i = 0; i < 5; i++) sfx.noise({ dur: 0.025, freq: 2800 + Math.random() * 800, vol: 0.035, q: 2.5, delay: i * 0.055 })
}

export function chuk(sfx: Sfx, delay = 0.3): void {
  for (let i = 0; i < 2; i++) sfx.tone({ freq: 1500, to: 950, dur: 0.055, type: 'triangle', vol: 0.045, delay: delay + i * 0.13 })
}

export function thump(sfx: Sfx): void {
  sfx.tone({ freq: 125, to: 70, dur: 0.13, vol: 0.13 })
  sfx.noise({ dur: 0.05, freq: 300, vol: 0.04, filter: 'lowpass' })
}

export function plink(sfx: Sfx): void {
  const f = 700 + Math.random() * 500
  sfx.tone({ freq: f, to: f * 1.6, dur: 0.07, vol: 0.05 })
  sfx.noise({ dur: 0.22, freq: 1400, to: 700, vol: 0.03, q: 0.8 })
}

export function plop(sfx: Sfx): void {
  sfx.tone({ freq: 430, to: 130, dur: 0.13, vol: 0.14 })
  sfx.noise({ dur: 0.16, freq: 1300, to: 300, vol: 0.07, filter: 'lowpass' })
  sfx.tone({ freq: 900, to: 1500, dur: 0.05, vol: 0.04, delay: 0.1 })
}

export function croak(sfx: Sfx): void {
  for (let i = 0; i < 5; i++) sfx.tone({ freq: 210 - i * 4, dur: 0.035, type: 'triangle', vol: 0.07, delay: i * 0.045 })
}

export function burble(sfx: Sfx): void {
  const f = 480 + Math.random() * 700
  sfx.tone({ freq: f, to: f * (1.2 + Math.random() * 0.4), dur: 0.05 + Math.random() * 0.04, vol: 0.022 })
}

export function birdsong(sfx: Sfx, vol = 0.05, seed = Math.random()): void {
  const n = 4 + Math.floor(seed * 3)
  let t = 0
  for (let i = 0; i < n; i++) {
    const base = 2300 + ((seed * 7 + i * 3) % 5) * 260
    sfx.tone({ freq: base, to: base * (i % 2 ? 1.25 : 0.85), dur: 0.09, vol, delay: t })
    t += 0.11 + (i % 3 === 2 ? 0.12 : 0)
  }
}

export function peep(sfx: Sfx): void {
  sfx.tone({ freq: 3000, to: 3600, dur: 0.06, vol: 0.04 })
  sfx.tone({ freq: 3300, to: 2800, dur: 0.07, vol: 0.035, delay: 0.1 })
}

export function wind(sfx: Sfx, vol = 0.05): void {
  sfx.noise({ dur: 1.5, freq: 380, to: 900, vol, q: 0.7 })
  sfx.noise({ dur: 1.2, freq: 900, to: 500, vol: vol * 0.6, q: 0.7, delay: 0.5 })
}

export function ratchet(sfx: Sfx): void {
  sfx.tone({ freq: 340 + Math.random() * 30, dur: 0.03, type: 'triangle', vol: 0.07 })
  sfx.noise({ dur: 0.018, freq: 1500, vol: 0.04, q: 2 })
}

export function clonk(sfx: Sfx): void {
  sfx.tone({ freq: 210, to: 160, dur: 0.1, type: 'triangle', vol: 0.1 })
  sfx.noise({ dur: 0.03, freq: 900, vol: 0.04 })
}

const SEASON_NOTES: [number, number][] = [
  [-3, 0],
  [0, 2],
  [2, 4],
  [-1, -3],
]

export function seasonChime(sfx: Sfx, season: Season): void {
  const [a, b] = SEASON_NOTES[season]
  chime(sfx, a, 0.07, 0.25)
  chime(sfx, b, 0.07, 0.5)
}

export function creak(sfx: Sfx): void {
  sfx.tone({ freq: 170, to: 230, dur: 0.3, type: 'triangle', vol: 0.035 })
  sfx.tone({ freq: 240, to: 200, dur: 0.2, type: 'triangle', vol: 0.03, delay: 0.25 })
  sfx.noise({ dur: 0.02, freq: 2200, vol: 0.04, delay: 0.02 })
}

export function setDown(sfx: Sfx, soft: boolean): void {
  if (soft) sfx.noise({ dur: 0.09, freq: 2600, vol: 0.03, filter: 'highpass' })
  else sfx.tone({ freq: 620 + Math.random() * 120, to: 460, dur: 0.045, type: 'triangle', vol: 0.07 })
  sfx.noise({ dur: 0.05, freq: 380, vol: 0.07, filter: 'lowpass' })
}

export function match(sfx: Sfx): void {
  sfx.noise({ dur: 0.28, freq: 2600, to: 5200, vol: 0.05, filter: 'highpass' })
}

export function puff(sfx: Sfx): void {
  sfx.noise({ dur: 0.22, freq: 900, to: 400, vol: 0.06, filter: 'lowpass' })
}

export function pat(sfx: Sfx): void {
  sfx.noise({ dur: 0.05, freq: 320, vol: 0.06, filter: 'lowpass' })
  sfx.tone({ freq: 140, to: 100, dur: 0.05, vol: 0.04 })
}

export function tink(sfx: Sfx): void {
  sfx.tone({ freq: 1900, dur: 0.12, vol: 0.035 })
  sfx.tone({ freq: 2850, dur: 0.07, vol: 0.015 })
}

export function hum(sfx: Sfx): void {
  sfx.tone({ freq: sfx.scale(-3), dur: 0.16, type: 'triangle', vol: 0.06 })
  sfx.tone({ freq: sfx.scale(-1), dur: 0.22, type: 'triangle', vol: 0.06, delay: 0.15 })
}
