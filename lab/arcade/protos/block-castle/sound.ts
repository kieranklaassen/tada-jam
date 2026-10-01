// The sounds of the room, all quiet: wood on wood, wood on floorboards, the
// creak of wicker, a small brass bell, and in the evening a lyre.

import type { Sfx } from '../../kit/sfx.ts'

export interface Sound {
  // `size` is roughly the block's volume in cubes: bigger wood is lower.
  lift(size: number): void
  clack(size: number, onFloor: boolean, soft?: number): void
  turn(size: number): void
  wobble(size: number): void
  wicker(): void
  floor(): void
  wall(): void
  bell(): void
  // One plucked string; step walks the pentatonic scale.
  lyre(step: number, vol?: number, delay?: number): void
  stone(i: number): void
  purr(): void
  flag(): void
  cricket(): void
}

export function createSound(sfx: Sfx): Sound {
  const pitch = (size: number) => 1180 / Math.pow(Math.max(0.3, size), 0.38)
  const jitter = () => 0.96 + Math.random() * 0.08
  const lyre = (step: number, vol = 0.07, delay = 0) => {
    const f = sfx.scale(step) / 2
    sfx.tone({ freq: f, dur: 1.5, type: 'sine', vol, delay, attack: 0.012 })
    sfx.tone({ freq: f * 2, dur: 0.5, type: 'triangle', vol: vol * 0.3, delay, attack: 0.006 })
    sfx.tone({ freq: f * 3.01, dur: 0.22, type: 'sine', vol: vol * 0.12, delay })
  }
  return {
    lift(size) {
      const f = pitch(size) * 0.8 * jitter()
      sfx.tone({ freq: f, to: f * 1.15, dur: 0.045, type: 'sine', vol: 0.07 })
      sfx.noise({ dur: 0.03, freq: 2400, vol: 0.025, filter: 'bandpass', q: 1.5 })
    },
    clack(size, onFloor, soft = 1) {
      // A wooden block is a short, dry, pitched knock with a second partial.
      const f = pitch(size) * jitter()
      sfx.tone({ freq: f, to: f * 0.94, dur: 0.075, type: 'sine', vol: 0.17 * soft })
      sfx.tone({ freq: f * 2.76, dur: 0.03, type: 'sine', vol: 0.06 * soft })
      sfx.noise({ dur: 0.022, freq: 1900, vol: 0.07 * soft, filter: 'bandpass', q: 0.8 })
      if (onFloor) {
        sfx.tone({ freq: 132 * jitter(), to: 84, dur: 0.13, type: 'sine', vol: 0.13 * soft })
        sfx.noise({ dur: 0.05, freq: 320, vol: 0.05 * soft, filter: 'lowpass' })
      }
    },
    turn(size) {
      // Wood dragged round on wood; the knock comes when it settles.
      sfx.noise({ dur: 0.13, freq: 650 * Math.pow(size, -0.2), to: 1500, vol: 0.05, filter: 'bandpass', q: 1.4 })
    },
    wobble(size) {
      const f = pitch(size) * jitter()
      sfx.tone({ freq: f, dur: 0.05, type: 'sine', vol: 0.09 })
      sfx.tone({ freq: f * 0.97, dur: 0.05, type: 'sine', vol: 0.06, delay: 0.09 })
    },
    wicker() {
      for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.035, freq: 1500 + Math.random() * 1400, vol: 0.035, filter: 'bandpass', q: 6, delay: i * 0.035 + Math.random() * 0.02 })
    },
    floor() {
      sfx.tone({ freq: 150 * jitter(), to: 96, dur: 0.11, type: 'sine', vol: 0.12 })
      sfx.noise({ dur: 0.03, freq: 500, vol: 0.04, filter: 'lowpass' })
    },
    wall() {
      sfx.noise({ dur: 0.05, freq: 420, vol: 0.05, filter: 'lowpass' })
      sfx.tone({ freq: 210 * jitter(), to: 170, dur: 0.06, type: 'sine', vol: 0.05 })
    },
    bell() {
      // A small hand bell: a strike, a hum, and inharmonic partials that die
      // away at different speeds.
      const f = 1046
      sfx.tone({ freq: f, dur: 2.4, type: 'sine', vol: 0.11, attack: 0.003 })
      sfx.tone({ freq: f * 0.5, dur: 2.8, type: 'sine', vol: 0.045, attack: 0.02 })
      sfx.tone({ freq: f * 2.0, dur: 1.4, type: 'sine', vol: 0.05, attack: 0.003 })
      sfx.tone({ freq: f * 2.74, dur: 0.9, type: 'sine', vol: 0.035 })
      sfx.tone({ freq: f * 4.07, dur: 0.45, type: 'sine', vol: 0.02 })
      sfx.noise({ dur: 0.025, freq: 4200, vol: 0.03, filter: 'highpass' })
      // The clapper swings back.
      sfx.tone({ freq: f, dur: 1.6, type: 'sine', vol: 0.05, delay: 0.42, attack: 0.003 })
      sfx.tone({ freq: f * 2.0, dur: 0.8, type: 'sine', vol: 0.02, delay: 0.42 })
    },
    lyre,
    stone(i) {
      // Blocks turning to stone, low to high: a soft dull tap and a low string.
      sfx.noise({ dur: 0.05, freq: 380, vol: 0.035, filter: 'lowpass' })
      if (i % 2 === 0) lyre(-5 + Math.floor(i / 2), 0.045)
    },
    purr() {
      sfx.tone({ freq: 82, to: 66, dur: 0.9, type: 'triangle', vol: 0.07, attack: 0.12 })
      sfx.noise({ dur: 0.8, freq: 260, to: 150, vol: 0.03, filter: 'lowpass', delay: 0.05 })
    },
    flag() {
      sfx.noise({ dur: 0.16, freq: 600, to: 1300, vol: 0.03, filter: 'bandpass', q: 0.7 })
    },
    cricket() {
      for (let i = 0; i < 3; i++) sfx.tone({ freq: 4300, dur: 0.035, type: 'sine', vol: 0.012, delay: i * 0.07 })
    },
  }
}
