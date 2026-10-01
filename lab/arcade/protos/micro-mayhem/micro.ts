// What one microgame is, and the few drawing helpers they share. The runner in
// index.ts owns the clock, the hearts and the transitions; a microgame only
// plays its own four seconds and then acts out its own joke ending.

import type { Fx } from '../../kit/fx.ts'
import { TAU } from '../../kit/math.ts'
import type { Sfx } from '../../kit/sfx.ts'
import type { Pointer, Stage } from '../../kit/types.ts'
import { H, W } from '../../kit/types.ts'

export type MicroState = 'play' | 'won' | 'lost'

export interface Env {
  readonly stage: Stage
  readonly fx: Fx
  readonly sfx: Sfx
  // Speed level, 0 at the start of a run, one more every four games.
  readonly level: number
  // How fast everything is, 1 at level 0.
  readonly pace: number
  // Seconds of play this microgame gets.
  readonly dur: number
  // Seconds since play began (0 while the word is being shouted).
  readonly t: number
  // Seconds since this microgame appeared, for animation.
  readonly age: number
  readonly state: MicroState
  // Seconds since it was won or lost.
  readonly since: number
  win(): void
  lose(): void
  // Like stage.after, but dropped when this microgame goes away.
  after(seconds: number, fn: () => void): void
  // Any finger that is down right now.
  finger(): Pointer | null
}

export interface Micro {
  update(dt: number): void
  draw(g: CanvasRenderingContext2D): void
  down?(p: Pointer): void
  move?(p: Pointer): void
  up?(p: Pointer): void
  // The clock ran out while still playing. Call env.win() or env.lose(); doing
  // neither is a loss.
  timeout?(): void
  // A result word that depends on how it ended, instead of the default.
  resultWord?(): string | null
  // Where the idle hint should point.
  hint(): [number, number]
}

export interface MicroDef {
  key: string
  word: string
  icon: string
  winWord: string
  loseWord: string
  // Painted once per appearance onto a cached layer.
  backdrop(g: CanvasRenderingContext2D, rand: () => number): void
  make(env: Env): Micro
}

export function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#ffffff'): void {
  g.fillStyle = color
  g.beginPath()
  g.arc(x - 50 * s, y + 6 * s, 34 * s, 0, TAU)
  g.arc(x - 12 * s, y - 16 * s, 44 * s, 0, TAU)
  g.arc(x + 36 * s, y - 2 * s, 38 * s, 0, TAU)
  g.arc(x + 74 * s, y + 10 * s, 26 * s, 0, TAU)
  g.rect(x - 60 * s, y + 6 * s, 140 * s, 30 * s)
  g.fill()
}

export function vgrad(g: CanvasRenderingContext2D, y0: number, y1: number, top: string, bottom: string): void {
  const grad = g.createLinearGradient(0, y0, 0, y1)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  g.fillStyle = grad
  g.fillRect(0, y0, W, y1 - y0)
}

// A rolling hill line filled down to the bottom of the field.
export function hills(g: CanvasRenderingContext2D, baseY: number, amp: number, color: string, phase = 0, freq = 0.006): void {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, H)
  for (let x = 0; x <= W; x += 20) g.lineTo(x, baseY - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.3 + phase * 2) * amp * 0.35)
  g.lineTo(W, H)
  g.closePath()
  g.fill()
}

export function poly(g: CanvasRenderingContext2D, points: readonly number[], fill: string, stroke?: string, width = 4): void {
  g.beginPath()
  g.moveTo(points[0]!, points[1]!)
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.stroke()
  }
}

// Rotating rays from a point: the backdrop of every "between games" moment.
export function sunburst(g: CanvasRenderingContext2D, x: number, y: number, time: number, a: string, b: string, rays = 14): void {
  g.fillStyle = a
  g.fillRect(0, 0, W, H)
  g.fillStyle = b
  const r = 1500
  for (let i = 0; i < rays; i++) {
    const a0 = time * 0.5 + (i / rays) * TAU
    const a1 = a0 + TAU / rays / 2
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r)
    g.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r)
    g.closePath()
    g.fill()
  }
}
