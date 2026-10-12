import { stamp, stampPart, stampTurned, type Pen, type Sprite } from './paint'
import type { Sprites } from './sprites'

// One frame being drawn: the pen, the pictures, and the count of what the
// frame has cost so far. Everything the view draws goes through here, so the
// count is the game's draw count: sprite stamps plus live strokes and fills.

export class Frame {
  /** Sprite stamps plus live strokes and fills in this frame. */
  count = 0
  /** How many of those were stamps. */
  stamps = 0

  constructor(readonly g: Pen, readonly s: Sprites) {}

  begin(): void {
    this.count = 0
    this.stamps = 0
  }

  put(sprite: Sprite, x: number, y: number): void {
    stamp(this.g, sprite, x, y)
    this.count += 1
    this.stamps += 1
  }

  turn(sprite: Sprite, x: number, y: number, angle: number, sx = 1, sy = 1): void {
    stampTurned(this.g, sprite, x, y, angle, sx, sy)
    this.count += 1
    this.stamps += 1
  }

  part(sprite: Sprite, from: number, to: number, x: number, y: number): void {
    if (to - from <= 0) return
    stampPart(this.g, sprite, from, to, x, y)
    this.count += 1
    this.stamps += 1
  }

  /** Live strokes and fills made on the pen directly, and how many of them were stamps. */
  ops(n: number, stamps = 0): void {
    this.count += n
    this.stamps += stamps
  }

  /** Stamps a picture as light: added to what is there, at this strength. */
  shine(sprite: Sprite, x: number, y: number, strength: number, sx: number, sy: number = sx): void {
    const g = this.g
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = Math.max(0, Math.min(1, strength))
    this.turn(sprite, x, y, 0, sx, sy)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }
}
