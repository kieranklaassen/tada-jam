// The sounds of the real materials, all quiet: hollow cardboard, tape tearing
// off a roll, small scissors, a felt-tip squeaking, a blanket, a cat.

import type { Sfx } from '../../kit/sfx.ts'

const v = (amount = 0.06): number => 1 + (Math.random() * 2 - 1) * amount

export interface Sounds {
  knock(): void
  lift(size: number): void
  thump(size: number, strength?: number): void
  snip(): void
  cutOut(): void
  slap(): void
  squeak(): void
  rip(pull: number): void
  stick(): void
  cloth(big?: boolean): void
  bulb(i: number): void
  reel(): void
  clack(on: boolean): void
  purr(): void
  mrrp(): void
  pat(): void
  teddy(): void
  bead(): void
  paper(long?: boolean): void
  rain(night: number): void
  glass(): void
  hush(): void
  pick(): void
  put(): void
}

export function createSounds(sfx: Sfx): Sounds {
  return {
    // A knuckle on a cardboard wall.
    knock() {
      sfx.tone({ freq: 168 * v(), to: 96, dur: 0.09, vol: 0.09 })
      sfx.noise({ dur: 0.045, freq: 520, filter: 'lowpass', vol: 0.05 })
    },
    // A box scraping as it leaves the floor; big boxes are lower.
    lift(size) {
      sfx.noise({ dur: 0.1, freq: 700 + (1 - size) * 500, to: 1500, q: 1.2, vol: 0.045 })
      sfx.tone({ freq: (150 - size * 50) * v(), to: 190 - size * 50, dur: 0.08, vol: 0.05 })
    },
    // Hollow, with a second small bounce of the flaps.
    thump(size, strength = 1) {
      const k = Math.min(1, Math.max(0.3, strength))
      const f = (150 - size * 62) * v()
      sfx.tone({ freq: f, to: f * 0.55, dur: 0.17, vol: 0.17 * k })
      sfx.noise({ dur: 0.11, freq: 380, to: 160, filter: 'lowpass', vol: 0.1 * k })
      sfx.noise({ dur: 0.04, freq: 1500, q: 1.5, vol: 0.035 * k, delay: 0.012 })
      sfx.tone({ freq: f * 1.5, to: f, dur: 0.07, vol: 0.05 * k, delay: 0.085 })
    },
    snip() {
      sfx.noise({ dur: 0.022, freq: 5200, filter: 'highpass', vol: 0.045 })
      sfx.tone({ freq: 2500 * v(0.1), to: 1700, dur: 0.028, type: 'triangle', vol: 0.028 })
      sfx.noise({ dur: 0.05, freq: 900, to: 500, q: 1.2, vol: 0.04, delay: 0.012 })
    },
    // The cut piece letting go.
    cutOut() {
      sfx.noise({ dur: 0.13, freq: 800, to: 300, q: 0.9, vol: 0.08 })
      sfx.tone({ freq: 210 * v(), to: 150, dur: 0.07, vol: 0.05 })
    },
    // A flat piece of card landing.
    slap() {
      sfx.noise({ dur: 0.06, freq: 1100, to: 500, filter: 'lowpass', vol: 0.085 })
      sfx.tone({ freq: 270 * v(), to: 170, dur: 0.06, vol: 0.06 })
    },
    squeak() {
      const f = 1050 + Math.random() * 700
      sfx.tone({ freq: f, to: f * (Math.random() < 0.5 ? 1.18 : 0.86), dur: 0.05, vol: 0.02, attack: 0.012 })
      sfx.noise({ dur: 0.06, freq: 3000, q: 2.5, vol: 0.016 })
    },
    // Tape coming off the roll: tighter and higher the further it is pulled.
    rip(pull) {
      sfx.noise({ dur: 0.07, freq: 1500 + pull * 1300, to: 2300 + pull * 1500, q: 3.2, vol: 0.05 })
      sfx.noise({ dur: 0.03, freq: 5200, filter: 'highpass', vol: 0.014, delay: 0.02 })
    },
    stick() {
      sfx.noise({ dur: 0.05, freq: 2600, to: 900, q: 1.4, vol: 0.065 })
      sfx.tone({ freq: 250 * v(), to: 170, dur: 0.06, vol: 0.06, delay: 0.02 })
    },
    cloth(big = false) {
      sfx.noise({ dur: big ? 0.42 : 0.16, freq: big ? 520 : 700, to: big ? 180 : 320, filter: 'lowpass', vol: big ? 0.085 : 0.06 })
    },
    // One small glass bulb: a soft note that walks up the pentatonic scale.
    bulb(i) {
      sfx.tone({ freq: sfx.scale((i % 10) - 3) * 2, dur: 0.22, vol: 0.022 })
      sfx.noise({ dur: 0.012, freq: 4200, filter: 'highpass', vol: 0.02 })
    },
    reel() {
      sfx.tone({ freq: 1500 * v(0.1), dur: 0.02, type: 'triangle', vol: 0.025 })
    },
    clack(on) {
      sfx.tone({ freq: on ? 620 : 760, to: on ? 880 : 420, dur: 0.03, type: 'triangle', vol: 0.11 })
      sfx.noise({ dur: 0.016, freq: 2600, filter: 'highpass', vol: 0.06 })
      sfx.tone({ freq: 190, to: 120, dur: 0.06, vol: 0.07, delay: 0.01 })
    },
    purr() {
      for (let i = 0; i < 22; i++) sfx.tone({ freq: (i % 2 ? 88 : 96) * v(0.03), dur: 0.04, type: 'triangle', vol: 0.045, delay: i * 0.046 })
    },
    mrrp() {
      sfx.tone({ freq: 480 * v(), to: 760, dur: 0.13, vol: 0.04, attack: 0.02 })
      sfx.tone({ freq: 960 * v(), to: 1500, dur: 0.1, vol: 0.012, attack: 0.02 })
    },
    pat() {
      sfx.noise({ dur: 0.05, freq: 420, filter: 'lowpass', vol: 0.07 })
      sfx.noise({ dur: 0.04, freq: 380, filter: 'lowpass', vol: 0.05, delay: 0.07 })
    },
    teddy() {
      sfx.noise({ dur: 0.12, freq: 600, to: 300, filter: 'lowpass', vol: 0.06 })
      sfx.tone({ freq: 330 * v(0.03), to: 290, dur: 0.14, type: 'triangle', vol: 0.03, attack: 0.02 })
    },
    bead() {
      sfx.tone({ freq: 1250 * v(), to: 1050, dur: 0.035, vol: 0.07 })
      sfx.tone({ freq: 640 * v(), dur: 0.05, vol: 0.04 })
    },
    paper(long = false) {
      sfx.noise({ dur: long ? 0.7 : 0.16, freq: 2200, to: long ? 700 : 1300, q: 0.8, vol: long ? 0.05 : 0.04 })
      if (long) sfx.noise({ dur: 0.5, freq: 500, to: 250, filter: 'lowpass', vol: 0.04, delay: 0.1 })
    },
    // One drop on the window pane.
    rain(night) {
      const k = 0.45 + night * 0.55
      sfx.noise({ dur: 0.018 + Math.random() * 0.02, freq: 3800 + Math.random() * 3200, filter: 'highpass', vol: (0.006 + Math.random() * 0.009) * k })
      if (Math.random() < 0.18) sfx.tone({ freq: 1500 + Math.random() * 900, to: 900, dur: 0.03, vol: 0.008 * k })
    },
    glass() {
      sfx.tone({ freq: 1900 * v(), to: 1500, dur: 0.04, vol: 0.045 })
      sfx.tone({ freq: 620, to: 520, dur: 0.05, vol: 0.03 })
      for (let i = 1; i < 4; i++) sfx.noise({ dur: 0.02, freq: 5000, filter: 'highpass', vol: 0.012, delay: i * 0.06 + Math.random() * 0.03 })
    },
    // The lamp going out: a breath, then two soft notes a fifth apart.
    hush() {
      sfx.noise({ dur: 0.9, freq: 900, to: 220, filter: 'lowpass', vol: 0.03 })
      sfx.tone({ freq: sfx.scale(-5), dur: 1.4, vol: 0.035, attack: 0.25, delay: 0.35 })
      sfx.tone({ freq: sfx.scale(-2), dur: 1.6, vol: 0.028, attack: 0.3, delay: 0.75 })
    },
    pick() {
      sfx.tone({ freq: 720 * v(), to: 940, dur: 0.045, type: 'triangle', vol: 0.05 })
      sfx.noise({ dur: 0.03, freq: 2400, q: 2, vol: 0.03 })
    },
    put() {
      sfx.tone({ freq: 420 * v(), to: 300, dur: 0.05, type: 'triangle', vol: 0.06 })
      sfx.noise({ dur: 0.04, freq: 700, filter: 'lowpass', vol: 0.05 })
    },
  }
}
