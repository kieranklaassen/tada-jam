// What the parts of the ink page need of the page itself: a figure by name,
// drawn once and kept, and a way to set it down under a transform. The page
// (ink.ts) is the stage; what moves on it (inkMoving.ts) asks it for these.

import type { Tier } from './config'
import type { Pen, Surface } from './inkHatch'
import type { Mat } from './inkLens'

/** A figure drawn once and kept: its surface, and its size and origin in logical pixels. */
export type Sprite = { surface: Surface; w: number; h: number; ox: number; oy: number }

export interface Stage {
  /** What the quality tier affords. */
  readonly settings: Tier
  /** A figure by name, drawn the first time it is asked for. `w`, `h`, `ox` and `oy` are in the figure's own units, `scale` logical pixels to one of them. */
  sprite(key: string, w: number, h: number, ox: number, oy: number, scale: number, draw: (pen: Pen) => void): Sprite
  /** Sets a figure down under a transform, with its origin at a point, squashed and turned about that point. */
  blit(ctx: CanvasRenderingContext2D, sprite: Sprite, m: Mat, x: number, y: number, sx: number, sy: number, turn: number): void
}
