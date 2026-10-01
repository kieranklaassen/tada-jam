// Farm Morning: the sounds of the things themselves, kept low. Wood knocks,
// water runs, grain patters, a brush whispers over a coat. Nothing here is a
// reward; a few soft pentatonic notes belong to the sky and the night.

import type { Sfx } from '../../kit/sfx.ts'

export interface Sounds {
  knock(vol?: number): void
  slide(): void
  creak(up: boolean): void
  cluck(pitch?: number, vol?: number): void
  purr(pitch?: number): void
  peck(): void
  scoop(): void
  grain(): void
  eggLift(): void
  eggNest(): void
  straw(vol?: number): void
  gurgle(): void
  gush(fill: number): void
  splash(): void
  pour(fill: number): void
  plip(): void
  gulp(): void
  sigh(): void
  nicker(): void
  brush(clean: boolean): void
  hay(): void
  bleat(): void
  pat(): void
  rustle(): void
  sky(step: number): void
  bird(): void
  lullaby(): void
}

export function makeSounds(sfx: Sfx, now: () => number): Sounds {
  const last = new Map<string, number>()
  const every = (key: string, gap: number): boolean => {
    const t = now()
    if (t - (last.get(key) ?? -9) < gap) return false
    last.set(key, t)
    return true
  }
  const v = (amount = 0.06): number => 1 + (Math.random() * 2 - 1) * amount

  return {
    knock(vol = 1) {
      sfx.tone({ freq: 196 * v(), to: 96, dur: 0.09, type: 'sine', vol: 0.15 * vol })
      sfx.noise({ dur: 0.035, freq: 700, vol: 0.05 * vol, filter: 'lowpass' })
    },
    slide() {
      if (!every('slide', 0.08)) return
      sfx.noise({ dur: 0.13, freq: 360 * v(0.2), to: 540, vol: 0.06, q: 2.5 })
    },
    creak(up) {
      if (!every('creak', 0.1)) return
      if (up) sfx.tone({ freq: 310 * v(), to: 420, dur: 0.16, type: 'triangle', vol: 0.03, attack: 0.03 })
      else sfx.tone({ freq: 230 * v(), to: 170, dur: 0.18, type: 'triangle', vol: 0.035, attack: 0.03 })
    },
    cluck(pitch = 1, vol = 1) {
      if (!every('cluck', 0.12)) return
      const f = 520 * pitch * v(0.08)
      sfx.tone({ freq: f, to: f * 0.72, dur: 0.06, type: 'triangle', vol: 0.06 * vol })
      sfx.tone({ freq: f * 1.16, to: f * 0.8, dur: 0.07, type: 'triangle', vol: 0.05 * vol, delay: 0.1 })
    },
    purr(pitch = 1) {
      if (!every('purr', 0.5)) return
      const f = 400 * pitch * v(0.05)
      for (let i = 0; i < 4; i++) sfx.tone({ freq: f * (1 + i * 0.03), to: f * 0.9, dur: 0.05, type: 'triangle', vol: 0.035, delay: i * 0.075 })
    },
    peck() {
      if (!every('peck', 0.05)) return
      sfx.tone({ freq: 1250 * v(0.15), to: 800, dur: 0.02, type: 'sine', vol: 0.035 })
    },
    scoop() {
      sfx.noise({ dur: 0.2, freq: 3200, to: 1500, vol: 0.08, q: 0.8 })
      sfx.noise({ dur: 0.1, freq: 5200, vol: 0.03, filter: 'highpass', delay: 0.08 })
    },
    grain() {
      if (!every('grain', 0.045)) return
      sfx.noise({ dur: 0.025, freq: 4200 * v(0.3), vol: 0.035, filter: 'highpass' })
    },
    eggLift() {
      sfx.tone({ freq: 660 * v(0.03), to: 720, dur: 0.06, type: 'sine', vol: 0.04 })
    },
    eggNest() {
      sfx.tone({ freq: 330 * v(0.04), to: 280, dur: 0.11, type: 'sine', vol: 0.07 })
      sfx.noise({ dur: 0.1, freq: 2600, vol: 0.035, q: 0.7, delay: 0.01 })
    },
    straw(vol = 1) {
      if (!every('straw', 0.1)) return
      sfx.noise({ dur: 0.14, freq: 3000 * v(0.2), to: 2000, vol: 0.045 * vol, q: 0.7 })
    },
    gurgle() {
      if (!every('gurgle', 0.2)) return
      sfx.tone({ freq: 180 * v(0.1), to: 110, dur: 0.12, type: 'sine', vol: 0.09 })
      sfx.tone({ freq: 240 * v(0.1), to: 150, dur: 0.1, type: 'sine', vol: 0.06, delay: 0.11 })
      sfx.noise({ dur: 0.12, freq: 500, vol: 0.03, filter: 'lowpass' })
    },
    // Water landing in the bucket: the note rises as it fills.
    gush(fill) {
      if (!every('gush', 0.07)) return
      const f = 520 + fill * 1100
      sfx.noise({ dur: 0.16, freq: f * v(0.08), to: f * 0.8, vol: 0.085, q: 1.6 })
      if (Math.random() < 0.4) sfx.tone({ freq: (300 + fill * 420) * v(0.2), to: 200, dur: 0.05, type: 'sine', vol: 0.03 })
    },
    splash() {
      if (!every('splash', 0.09)) return
      sfx.noise({ dur: 0.14, freq: 1500 * v(0.2), to: 600, vol: 0.06, filter: 'lowpass' })
    },
    pour(fill) {
      if (!every('pour', 0.075)) return
      const f = 700 + fill * 900
      sfx.noise({ dur: 0.15, freq: f * v(0.1), to: f * 0.85, vol: 0.075, q: 1.3 })
      if (Math.random() < 0.3) sfx.tone({ freq: (340 + fill * 380) * v(0.25), to: 240, dur: 0.05, type: 'sine', vol: 0.03 })
    },
    plip() {
      if (!every('plip', 0.1)) return
      const f = 880 * v(0.2)
      sfx.tone({ freq: f, to: f * 1.5, dur: 0.05, type: 'sine', vol: 0.045 })
    },
    gulp() {
      sfx.tone({ freq: 210 * v(0.08), to: 132, dur: 0.11, type: 'sine', vol: 0.08 })
      sfx.noise({ dur: 0.06, freq: 900, vol: 0.02, filter: 'lowpass', delay: 0.02 })
    },
    sigh() {
      sfx.noise({ dur: 0.5, freq: 620, to: 240, vol: 0.07, filter: 'lowpass' })
      sfx.tone({ freq: 120, to: 88, dur: 0.3, type: 'sine', vol: 0.04, attack: 0.06 })
    },
    nicker() {
      if (!every('nicker', 0.5)) return
      for (let i = 0; i < 5; i++) sfx.tone({ freq: (210 - i * 14) * v(0.04), to: 150 - i * 10, dur: 0.055, type: 'triangle', vol: 0.05, delay: i * 0.06 })
    },
    brush(clean) {
      if (!every('brush', 0.06)) return
      sfx.noise({ dur: 0.13, freq: (clean ? 2000 : 2700) * v(0.15), to: 1500, vol: clean ? 0.035 : 0.055, q: 1.2 })
    },
    hay() {
      sfx.noise({ dur: 0.22, freq: 3400, to: 1800, vol: 0.07, q: 0.6 })
      for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.03, freq: 2400 + Math.random() * 2000, vol: 0.04, delay: 0.04 + i * 0.05, q: 2 })
    },
    bleat() {
      if (!every('bleat', 0.6)) return
      const f = 400 * v(0.05)
      for (let i = 0; i < 5; i++) sfx.tone({ freq: f * (i % 2 === 0 ? 1 : 0.94), to: f * 0.9, dur: 0.06, type: 'triangle', vol: 0.045, delay: i * 0.055 })
    },
    pat() {
      sfx.tone({ freq: 126 * v(0.1), to: 80, dur: 0.07, type: 'sine', vol: 0.09 })
      sfx.noise({ dur: 0.05, freq: 500, vol: 0.03, filter: 'lowpass' })
    },
    rustle() {
      if (!every('rustle', 0.1)) return
      sfx.noise({ dur: 0.26, freq: 4200 * v(0.2), to: 2600, vol: 0.045, q: 0.6 })
    },
    sky(step) {
      sfx.note(step, 0.7, 'sine', 0.055)
    },
    bird() {
      const f = 2300 * v(0.06)
      sfx.tone({ freq: f, to: f * 1.2, dur: 0.08, type: 'sine', vol: 0.035 })
      sfx.tone({ freq: f * 1.25, to: f * 1.05, dur: 0.09, type: 'sine', vol: 0.035, delay: 0.14 })
      sfx.tone({ freq: f * 1.12, to: f * 1.4, dur: 0.12, type: 'sine', vol: 0.03, delay: 0.3 })
    },
    lullaby() {
      const steps = [2, 1, 0, -2]
      steps.forEach((s, i) => sfx.tone({ freq: sfx.scale(s) / 2, dur: 1.1, type: 'sine', vol: 0.05, delay: i * 0.75, attack: 0.04 }))
    },
  }
}
