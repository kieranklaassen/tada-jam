// What every part of the market shares: the places, the things a child can
// make, the visit they are on, and the quiet sounds of the materials.

import type { Sfx } from '../../kit/sfx.ts'
import type { Pointer, Stage } from '../../kit/types.ts'
import type { G, Sprite } from './art.ts'
import type { CandleShape } from './candle.ts'

export type StallKey = 'candle' | 'stars' | 'wreath' | 'ginger' | 'cave' | 'apple'
export type Place = 'market' | StallKey | 'spiral' | 'home'

// Something the child made (or was handed), as it travels in the basket and
// comes out again at home.
export interface Made {
  kind: 'candle' | 'star' | 'wreath' | 'biscuit' | 'crystal' | 'apple'
  from: StallKey
  // Where it was in its stall when the child stepped back, for the hop into
  // the basket.
  x: number
  y: number
  // Natural height in logical pixels at scale 1.
  h: number
  // Standing things (candle, apple, crystal) are drawn with the middle of
  // their foot on (x, y); flat things (star, wreath, biscuit) centred on it.
  // `lit` 0..1 is a flame, or daylight through paper.
  draw(g: G, x: number, y: number, scale: number, time: number, lit?: number): void
  candle?: CandleShape
  // An apple holder without its own small candle, for a dipped one to stand in.
  bare?(g: G, x: number, y: number, scale: number): void
}

export interface Scene {
  // Called each time the child arrives here.
  enter?(): void
  // The finished things on the table, asked for as the child steps back.
  made?(): Made[]
  // A new visit: fresh materials.
  reset?(): void
  update(dt: number): void
  draw(g: G): void
  down?(p: Pointer): void
  move?(p: Pointer): void
  up?(p: Pointer): void
}

// A candle the child set down on the spiral on an earlier visit.
export interface Kept {
  u: number
  shape: CandleShape | null
  apple: boolean
}

export interface Memory {
  visits: number
  spiral: Kept[]
}

export interface Visit {
  n: number
  basket: Made[]
  // The candle the child carried round the spiral has been set down there.
  given: boolean
}

export interface Sounds {
  wood(vol?: number): void
  paper(vol?: number): void
  crease(): void
  bloop(vol?: number): void
  plip(): void
  cloth(): void
  fir(): void
  wire(step: number): void
  lyre(step: number, vol?: number): void
  chime(step: number, vol?: number): void
  breath(): void
  pat(): void
  squeeze(): void
  clink(): void
  step(): void
}

export function createSounds(sfx: Sfx): Sounds {
  const vary = (amount = 0.05) => 1 + (Math.random() * 2 - 1) * amount
  return {
    // A soft knock of wood on wood.
    wood(vol = 1) {
      sfx.tone({ freq: 300 * vary(0.08), to: 170, dur: 0.07, type: 'sine', vol: 0.09 * vol })
      sfx.noise({ dur: 0.035, freq: 700, vol: 0.05 * vol, filter: 'lowpass' })
    },
    // Thin paper moved or laid down.
    paper(vol = 1) {
      sfx.noise({ dur: 0.09, freq: 2600 * vary(0.2), to: 4200, vol: 0.045 * vol, q: 0.6 })
      sfx.noise({ dur: 0.05, freq: 5200, vol: 0.02 * vol, filter: 'highpass', delay: 0.04 })
    },
    // A fold pressed flat with a fingernail.
    crease() {
      sfx.noise({ dur: 0.06, freq: 3400 * vary(0.15), to: 1800, vol: 0.07, q: 1.2 })
      sfx.tone({ freq: 520 * vary(), to: 380, dur: 0.04, type: 'sine', vol: 0.03, delay: 0.03 })
    },
    // Something going into thick warm wax.
    bloop(vol = 1) {
      sfx.tone({ freq: 230 * vary(), to: 140, dur: 0.2, type: 'sine', vol: 0.1 * vol })
      sfx.noise({ dur: 0.14, freq: 320, vol: 0.05 * vol, filter: 'lowpass' })
    },
    // One drop.
    plip() {
      const f = 880 * vary(0.2)
      sfx.tone({ freq: f, to: f * 0.72, dur: 0.05, type: 'sine', vol: 0.035 })
    },
    cloth() {
      sfx.noise({ dur: 0.13, freq: 900 * vary(0.2), to: 480, vol: 0.05, filter: 'lowpass' })
    },
    // Fir needles brushing each other.
    fir() {
      sfx.noise({ dur: 0.1, freq: 3200 * vary(0.25), vol: 0.04, q: 0.5 })
      sfx.noise({ dur: 0.08, freq: 2100 * vary(0.25), vol: 0.03, q: 0.5, delay: 0.05 })
    },
    // Ribbon drawn tight round straw: a short dry zip that rises with each turn.
    wire(step) {
      const f = 900 + (step % 5) * 120
      sfx.noise({ dur: 0.07, freq: f, to: f * 1.6, vol: 0.05, q: 2.5 })
    },
    // A plucked lyre string: soft attack, long ring, a little of the octave.
    lyre(step, vol = 1) {
      const f = sfx.scale(step)
      sfx.tone({ freq: f, dur: 1.5, type: 'triangle', vol: 0.085 * vol, attack: 0.012 })
      sfx.tone({ freq: f, dur: 1.9, type: 'sine', vol: 0.06 * vol, attack: 0.02 })
      sfx.tone({ freq: f * 2.003, dur: 0.6, type: 'sine', vol: 0.018 * vol, attack: 0.01 })
    },
    // A small bell-like note, for glass and crystal.
    chime(step, vol = 1) {
      const f = sfx.scale(step)
      sfx.tone({ freq: f, dur: 0.9, type: 'sine', vol: 0.06 * vol, attack: 0.008 })
      sfx.tone({ freq: f * 2.76, dur: 0.35, type: 'sine', vol: 0.012 * vol })
    },
    // A wick taking the flame.
    breath() {
      sfx.noise({ dur: 0.35, freq: 500, to: 1500, vol: 0.035, q: 0.6 })
    },
    // A finger pressing something soft flat.
    pat() {
      sfx.tone({ freq: 190 * vary(0.1), to: 120, dur: 0.06, type: 'sine', vol: 0.07 })
      sfx.noise({ dur: 0.04, freq: 1500, vol: 0.025, q: 0.7 })
    },
    // Icing leaving the bag.
    squeeze() {
      sfx.noise({ dur: 0.09, freq: 520 * vary(0.2), to: 380, vol: 0.022, filter: 'lowpass' })
    },
    // China touched lightly.
    clink() {
      sfx.tone({ freq: 1560 * vary(0.03), dur: 0.28, type: 'sine', vol: 0.035 })
      sfx.tone({ freq: 2340 * vary(0.03), dur: 0.14, type: 'sine', vol: 0.015 })
    },
    // A soft footfall on boards.
    step() {
      sfx.tone({ freq: 110 * vary(0.1), to: 70, dur: 0.07, type: 'sine', vol: 0.05 })
    },
  }
}

export interface World {
  stage: Stage
  snd: Sounds
  // How many backing pixels a logical pixel gets (1 or 2), for cached paint.
  dpr: number
  // The same for whole-screen backdrops, kept a little lower to spare memory:
  // soft paint does not need every pixel.
  bg: number
  visit: Visit
  memory: Memory
  // Warm halo for flames in lit rooms, and a brighter one for dark rooms.
  halo: Sprite
  haloDark: Sprite
  // Change place. (fx, fy) is where the eye is drawn as we step closer.
  go(to: Place, fx?: number, fy?: number): void
  // Step back from a stall: what was made hops into the basket first.
  stepBack(): void
  // The answer to a touch that lands on nothing in particular.
  quiet(x: number, y: number): void
  // Begin a new visit from home.
  again(): void
  // The basket with `items` in it, its rim centred on (x, y).
  basket(g: G, x: number, y: number, items: readonly Made[], bounce?: number): void
}

// Where the basket sits in the market and in every stall.
export const BASKET_AT = { x: 124, y: 664 }

export function nearBasket(x: number, y: number): boolean {
  return Math.abs(x - BASKET_AT.x) < 104 && y > BASKET_AT.y - 104 && y < BASKET_AT.y + 104
}
