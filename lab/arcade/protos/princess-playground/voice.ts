// The cast's voices, built from the kit's tone and noise. Nobody speaks; they
// giggle, yowl, toot and blow raspberries. `p` is a pitch factor per character
// (the cat is high, the knight is low).

import type { Sfx } from '../../kit/sfx.ts'

export interface Voice {
  giggle(p: number): void
  squeak(p: number): void
  wheee(p: number): void
  oof(p: number): void
  yowl(): void
  meow(): void
  mrrp(): void
  hiss(): void
  raspberry(): void
  toot(): void
  nyah(p: number): void
  whistle(): void
  ribbit(): void
  trumpet(): void
  clank(): void
  flame(): void
  bonk(): void
  splash(): void
  blup(): void
  shake(): void
  squelch(): void
  bell(): void
  jingle(): void
  creak(): void
}

export function makeVoice(sfx: Sfx): Voice {
  const v = (a = 0.05): number => 1 + (Math.random() * 2 - 1) * a
  return {
    giggle(p) {
      const f = 640 * p * v()
      const steps = [1, 1.26, 1.12, 1.4, 1.2]
      steps.forEach((s, i) => sfx.tone({ freq: f * s, to: f * s * 0.8, dur: 0.075, type: 'triangle', vol: 0.17, delay: i * 0.085 }))
    },
    squeak(p) {
      const f = 720 * p * v(0.1)
      sfx.tone({ freq: f, to: f * 1.6, dur: 0.09, type: 'sine', vol: 0.2 })
    },
    wheee(p) {
      const f = 520 * p * v()
      sfx.tone({ freq: f, to: f * 2.1, dur: 0.32, type: 'triangle', vol: 0.16 })
      sfx.tone({ freq: f * 2.1, to: f * 1.4, dur: 0.36, type: 'triangle', vol: 0.14, delay: 0.3 })
    },
    oof(p) {
      const f = 340 * p * v()
      sfx.tone({ freq: f, to: f * 0.55, dur: 0.16, type: 'triangle', vol: 0.22 })
    },
    yowl() {
      sfx.tone({ freq: 520, to: 1250, dur: 0.22, type: 'sawtooth', vol: 0.1 })
      sfx.tone({ freq: 1250, to: 1080, dur: 0.3, type: 'sawtooth', vol: 0.1, delay: 0.21 })
      sfx.tone({ freq: 1080, to: 430, dur: 0.5, type: 'sawtooth', vol: 0.09, delay: 0.5 })
      sfx.tone({ freq: 520, to: 1250, dur: 0.22, type: 'sine', vol: 0.12 })
      sfx.tone({ freq: 1250, to: 430, dur: 0.75, type: 'sine', vol: 0.1, delay: 0.21 })
    },
    meow() {
      const f = 640 * v(0.08)
      sfx.tone({ freq: f, to: f * 1.55, dur: 0.14, type: 'triangle', vol: 0.18 })
      sfx.tone({ freq: f * 1.55, to: f * 0.85, dur: 0.3, type: 'triangle', vol: 0.16, delay: 0.13 })
    },
    mrrp() {
      const f = 500 * v(0.08)
      sfx.tone({ freq: f, to: f * 1.7, dur: 0.16, type: 'triangle', vol: 0.16 })
      for (let i = 0; i < 4; i++) sfx.noise({ dur: 0.02, freq: 500, vol: 0.06, delay: i * 0.035, filter: 'lowpass' })
    },
    hiss() {
      sfx.noise({ dur: 0.38, freq: 3600, vol: 0.14, filter: 'highpass' })
    },
    raspberry() {
      for (let i = 0; i < 12; i++) {
        sfx.noise({ dur: 0.03, freq: 340, vol: 0.26, filter: 'lowpass', delay: i * 0.042 })
        sfx.tone({ freq: 108 * v(0.1), to: 82, dur: 0.03, type: 'sawtooth', vol: 0.16, delay: i * 0.042 })
      }
    },
    toot() {
      sfx.tone({ freq: 150 * v(0.1), to: 95, dur: 0.2, type: 'sawtooth', vol: 0.2 })
      sfx.tone({ freq: 95, to: 215, dur: 0.14, type: 'sawtooth', vol: 0.18, delay: 0.19 })
      sfx.noise({ dur: 0.3, freq: 240, vol: 0.12, filter: 'lowpass' })
    },
    nyah(p) {
      const f = 520 * p
      const tune: [number, number][] = [[1.5, 0], [1.26, 0.16], [1.68, 0.32], [1.5, 0.44], [1.26, 0.6]]
      for (const [s, at] of tune) sfx.tone({ freq: f * s, dur: 0.14, type: 'triangle', vol: 0.16, delay: at })
    },
    whistle() {
      sfx.tone({ freq: 1200, to: 1800, dur: 0.12, type: 'sine', vol: 0.16 })
      sfx.tone({ freq: 1500, to: 2100, dur: 0.18, type: 'sine', vol: 0.16, delay: 0.16 })
    },
    ribbit() {
      sfx.tone({ freq: 150, to: 230, dur: 0.1, type: 'square', vol: 0.13 })
      sfx.tone({ freq: 170, to: 300, dur: 0.17, type: 'square', vol: 0.13, delay: 0.13 })
    },
    trumpet() {
      const notes: [number, number, number][] = [[392, 0, 0.1], [392, 0.12, 0.1], [523, 0.24, 0.1], [659, 0.36, 0.42]]
      for (const [f, at, dur] of notes) {
        sfx.tone({ freq: f, dur, type: 'square', vol: 0.09, delay: at })
        sfx.tone({ freq: f, dur, type: 'sawtooth', vol: 0.07, delay: at })
      }
    },
    clank() {
      sfx.tone({ freq: 880, dur: 0.05, type: 'square', vol: 0.12 })
      sfx.tone({ freq: 1320, dur: 0.26, type: 'sine', vol: 0.13 })
      sfx.tone({ freq: 2090, dur: 0.18, type: 'sine', vol: 0.08 })
      sfx.noise({ dur: 0.05, freq: 4000, vol: 0.14, filter: 'highpass' })
    },
    flame() {
      sfx.noise({ dur: 0.5, freq: 320, to: 1900, vol: 0.22, q: 0.7 })
      sfx.tone({ freq: 92, to: 60, dur: 0.4, type: 'sawtooth', vol: 0.08 })
    },
    bonk() {
      sfx.tone({ freq: 300, to: 140, dur: 0.12, type: 'sine', vol: 0.3 })
      sfx.tone({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.1, delay: 0.02 })
    },
    splash() {
      sfx.noise({ dur: 0.28, freq: 1800, to: 5000, vol: 0.15, filter: 'highpass' })
      sfx.noise({ dur: 0.2, freq: 900, to: 300, vol: 0.14, filter: 'lowpass' })
    },
    blup() {
      const f = 180 * v(0.2)
      sfx.tone({ freq: f, to: f * 2.3, dur: 0.09, type: 'sine', vol: 0.14 })
    },
    shake() {
      for (let i = 0; i < 9; i++) sfx.noise({ dur: 0.035, freq: 1400, vol: 0.16, delay: i * 0.07, q: 2 })
    },
    squelch() {
      sfx.noise({ dur: 0.3, freq: 700, to: 180, vol: 0.22, filter: 'lowpass' })
      sfx.tone({ freq: 130 * v(), to: 60, dur: 0.22, type: 'sine', vol: 0.2 })
    },
    bell() {
      sfx.tone({ freq: 1568, dur: 0.3, type: 'sine', vol: 0.16 })
      sfx.tone({ freq: 2093, dur: 0.4, type: 'sine', vol: 0.12, delay: 0.1 })
    },
    jingle() {
      const tune = [4, 2, 4, 2, 4, 5, 7]
      tune.forEach((s, i) => sfx.tone({ freq: sfx.scale(s), dur: 0.16, type: 'triangle', vol: 0.15, delay: i * 0.13 }))
    },
    creak() {
      sfx.tone({ freq: 420 * v(0.1), to: 520, dur: 0.08, type: 'triangle', vol: 0.06 })
    },
  }
}
