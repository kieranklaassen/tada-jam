// The sound of each material, quietly: bark knocks, twigs tick, pebbles
// clack, moss hushes. Chimes are kept for the sun and the folk.

import type { Sfx } from '../../kit/sfx.ts'
import type { Kind } from './art.ts'

export interface Sounds {
  pick(kind: Kind): void
  drop(kind: Kind, strength?: number): void
  clack(): void
  earth(): void
  wood(): void
  hollow(): void
  rustle(): void
  air(): void
  plop(step?: number): void
  drip(): void
  splash(): void
  chime(step: number, vol?: number): void
  fifth(): void
  cricket(): void
  owl(): void
  bird(): void
  tick(): void
  sip(): void
  hush(): void
}

export function makeSounds(sfx: Sfx): Sounds {
  const v = (amount = 0.06) => 1 + (Math.random() * 2 - 1) * amount

  const drop = (kind: Kind, k = 1): void => {
    switch (kind) {
      case 'bark':
        sfx.tone({ freq: 172 * v(), to: 96, dur: 0.15, vol: 0.16 * k })
        sfx.noise({ dur: 0.07, freq: 520, filter: 'lowpass', vol: 0.09 * k })
        sfx.noise({ dur: 0.03, freq: 1800, q: 2, vol: 0.04 * k, delay: 0.01 })
        break
      case 'twig':
        sfx.tone({ freq: 660 * v(), to: 430, dur: 0.05, type: 'triangle', vol: 0.09 * k })
        sfx.noise({ dur: 0.03, freq: 2600, q: 3, vol: 0.06 * k })
        sfx.tone({ freq: 720 * v(), to: 500, dur: 0.04, type: 'triangle', vol: 0.04 * k, delay: 0.07 })
        break
      case 'pebble':
        sfx.tone({ freq: 1250 * v(), to: 820, dur: 0.045, vol: 0.11 * k })
        sfx.tone({ freq: 180, to: 120, dur: 0.06, vol: 0.07 * k })
        sfx.noise({ dur: 0.02, freq: 2600, filter: 'highpass', vol: 0.05 * k })
        break
      case 'moss':
        sfx.noise({ dur: 0.17, freq: 320, to: 150, filter: 'lowpass', vol: 0.1 * k })
        sfx.tone({ freq: 110, to: 78, dur: 0.11, vol: 0.06 * k })
        break
      case 'acorn':
        sfx.tone({ freq: 560 * v(), to: 430, dur: 0.07, vol: 0.1 * k })
        sfx.tone({ freq: 1120 * v(), dur: 0.04, vol: 0.03 * k })
        break
      case 'leaf':
        sfx.noise({ dur: 0.18, freq: 3200, to: 1400, q: 0.7, vol: 0.05 * k })
        sfx.noise({ dur: 0.08, freq: 4200, filter: 'highpass', vol: 0.025 * k, delay: 0.08 })
        break
      case 'feather':
        sfx.noise({ dur: 0.24, freq: 5200, filter: 'highpass', vol: 0.03 * k })
        break
      case 'shell':
        sfx.tone({ freq: 1750 * v(0.03), dur: 0.18, vol: 0.06 * k })
        sfx.tone({ freq: 2620 * v(0.03), dur: 0.1, vol: 0.025 * k })
        sfx.tone({ freq: 240, to: 170, dur: 0.05, vol: 0.05 * k })
        break
    }
  }

  return {
    drop,
    pick(kind) {
      switch (kind) {
        case 'bark':
          sfx.noise({ dur: 0.06, freq: 900, q: 1.5, vol: 0.06 })
          sfx.tone({ freq: 210, to: 260, dur: 0.06, vol: 0.06 })
          break
        case 'twig':
          sfx.tone({ freq: 820 * v(), to: 940, dur: 0.03, type: 'triangle', vol: 0.06 })
          sfx.noise({ dur: 0.02, freq: 3000, q: 3, vol: 0.04 })
          break
        case 'pebble':
          sfx.tone({ freq: 1500 * v(), dur: 0.03, vol: 0.06 })
          sfx.noise({ dur: 0.05, freq: 700, filter: 'lowpass', vol: 0.04 })
          break
        case 'moss':
          sfx.noise({ dur: 0.1, freq: 420, filter: 'lowpass', vol: 0.06 })
          break
        case 'acorn':
          sfx.tone({ freq: 640 * v(), to: 700, dur: 0.04, vol: 0.06 })
          break
        case 'leaf':
          sfx.noise({ dur: 0.1, freq: 3600, q: 0.7, vol: 0.04 })
          break
        case 'feather':
          sfx.noise({ dur: 0.14, freq: 6000, filter: 'highpass', vol: 0.022 })
          break
        case 'shell':
          sfx.tone({ freq: 1960 * v(0.03), dur: 0.1, vol: 0.045 })
          break
      }
    },
    clack() {
      sfx.tone({ freq: 1900 * v(0.1), to: 1500, dur: 0.03, vol: 0.07, delay: 0.035 })
    },
    earth() {
      sfx.noise({ dur: 0.07, freq: 240, filter: 'lowpass', vol: 0.09 })
      sfx.tone({ freq: 96 * v(), to: 70, dur: 0.08, vol: 0.07 })
    },
    wood() {
      sfx.tone({ freq: 215 * v(), to: 150, dur: 0.09, vol: 0.1 })
      sfx.noise({ dur: 0.04, freq: 700, vol: 0.04 })
    },
    hollow() {
      sfx.tone({ freq: 131 * v(0.02), to: 108, dur: 0.26, vol: 0.12 })
      sfx.tone({ freq: 262, to: 220, dur: 0.14, vol: 0.03 })
    },
    rustle() {
      sfx.noise({ dur: 0.22, freq: 2600, to: 4200, q: 0.6, vol: 0.045 })
      sfx.noise({ dur: 0.16, freq: 3800, to: 2200, q: 0.6, vol: 0.03, delay: 0.12 })
    },
    air() {
      sfx.noise({ dur: 0.4, freq: 700, to: 1300, q: 0.5, vol: 0.03 })
    },
    plop(step = 0) {
      const f = 300 * 2 ** (step / 6)
      sfx.tone({ freq: f * v(), to: f * 2.4, dur: 0.09, vol: 0.11 })
      sfx.noise({ dur: 0.06, freq: 900, filter: 'lowpass', vol: 0.04 })
    },
    drip() {
      sfx.tone({ freq: 900 * v(0.15), to: 1500, dur: 0.05, vol: 0.04 })
    },
    splash() {
      sfx.noise({ dur: 0.16, freq: 1600, to: 500, filter: 'lowpass', vol: 0.08 })
      sfx.tone({ freq: 360, to: 620, dur: 0.07, vol: 0.05 })
    },
    chime(step, vol = 0.085) {
      const f = sfx.scale(step) / 2
      sfx.tone({ freq: f, dur: 1.2, vol, attack: 0.012 })
      sfx.tone({ freq: f * 2.005, dur: 0.6, vol: vol * 0.22, attack: 0.012 })
    },
    fifth() {
      sfx.tone({ freq: 196, dur: 2.2, vol: 0.07, attack: 0.25 })
      sfx.tone({ freq: 293.7, dur: 2.2, vol: 0.05, attack: 0.35 })
    },
    cricket() {
      const f = 4100 * v(0.04)
      for (let i = 0; i < 3; i++) sfx.tone({ freq: f, dur: 0.035, vol: 0.011, delay: i * 0.075 })
    },
    owl() {
      sfx.tone({ freq: 372, to: 338, dur: 0.38, vol: 0.03, attack: 0.05 })
      sfx.tone({ freq: 352, to: 322, dur: 0.5, vol: 0.03, attack: 0.05, delay: 0.62 })
    },
    bird() {
      const f = 2300 * v(0.12)
      sfx.tone({ freq: f, to: f * 1.3, dur: 0.08, vol: 0.028 })
      sfx.tone({ freq: f * 1.2, to: f * 1.05, dur: 0.1, vol: 0.024, delay: 0.13 })
    },
    tick() {
      sfx.tone({ freq: 760 * v(0.1), to: 560, dur: 0.035, type: 'triangle', vol: 0.045 })
    },
    sip() {
      sfx.tone({ freq: 480, to: 660, dur: 0.07, vol: 0.03 })
    },
    hush() {
      sfx.noise({ dur: 0.12, freq: 380, filter: 'lowpass', vol: 0.045 })
    },
  }
}
