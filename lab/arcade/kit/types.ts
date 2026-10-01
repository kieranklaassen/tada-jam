// The arcade round's contract. A prototype here is judged by a person playing
// it, not by the persona panel, so there is no pure sim, no signature, and no
// affordance list: one module exports a `proto`, the stage hands it a canvas,
// pointers, sound and effects, and it plays.

import type { Fx } from './fx.ts'
import type { Sfx } from './sfx.ts'

// Logical field, landscape, the same as the first round. The stage letterboxes
// it into whatever the viewport is.
export const W = 1180
export const H = 820

export interface ProtoMeta {
  // Kebab-case, equal to the folder name.
  key: string
  name: string
  // One emoji for the card.
  emoji: string
  // Whole years, youngest and oldest child this is for.
  ages: [number, number]
  // One sentence a parent reads on the card: what the child does.
  pitch: string
  // Shown beside the title while playing, for the grown-up rating it.
  howTo: string
  // The hits or toys this loop is borrowed from.
  basedOn: string
  // Why it should be fun, in the research's words (see RESEARCH.md).
  whyFun: string
  // Which batch it belongs to. 'gentle' is the calm, Montessori and Waldorf
  // rooted set (see GENTLE.md); anything else is the first arcade set.
  set?: 'gentle'
}

// One finger (or the mouse). The stage keeps it up to date between events.
export interface Pointer {
  id: number
  x: number
  y: number
  // Where this touch began.
  startX: number
  startY: number
  // Movement since the previous event.
  dx: number
  dy: number
  // Smoothed speed in logical pixels per second, for flings and swipes.
  vx: number
  vy: number
  // stage.time when it went down.
  downAt: number
  down: boolean
}

export interface Game {
  // dt is seconds, never more than 1/30. Not called during a hit-stop.
  update(dt: number): void
  // Logical 1180 by 820 coordinates. Screen shake is already applied; the
  // stage draws fx (particles, floating text) on top after this returns.
  draw(g: CanvasRenderingContext2D): void
  down?(p: Pointer): void
  move?(p: Pointer): void
  up?(p: Pointer): void
  // Stop anything the stage does not own (it owns the loop, fx and sfx).
  dispose?(): void
}

export interface Stage {
  readonly W: number
  readonly H: number
  // Seconds of play since this game was created (hit-stop does not advance it).
  readonly time: number
  // Every finger currently down.
  readonly pointers: ReadonlyMap<number, Pointer>
  readonly fx: Fx
  readonly sfx: Sfx
  // Seeded 0..1. Use it (or the helpers in math.ts) for layout; Math.random is
  // fine for sparkle.
  rand(): number
  // Run once after `seconds` of play time. Cleared on restart.
  after(seconds: number, fn: () => void): void
  // Calls fn(0..1 eased) every frame for `seconds`, then `done`.
  tween(seconds: number, fn: (t: number) => void, ease?: (t: number) => number, done?: () => void): void
  // Throw this game away and create a fresh one.
  restart(): void
}

export interface Proto {
  meta: ProtoMeta
  create(stage: Stage): Game
}
