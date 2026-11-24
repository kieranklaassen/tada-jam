import type { G } from './silk'

// Painted parts kept as pictures. A face is thirty floods and gold lines; kept
// on its own sheet it is one picture, painted again only when it changes. A
// part that only nods, swings or breathes is the same picture, moved.

export type MakeSheet = (width: number, height: number) => { canvas: CanvasImageSource; g: G }
export type Box = readonly [x: number, y: number, width: number, height: number]

/**
 * Puts the picture `name` down. `what` is what it is of: a change is painted at once. `how` is the look on its face:
 * a change may wait a frame when other pictures are being painted.
 */
export type Stamp = (g: G, name: string, box: Box, what: string, how: string, paint: (g: G) => void) => void

/** Paints in place, with no picture kept. */
export const direct: Stamp = (g, _name, _box, _what, _how, paint) => paint(g)

/** Pictures whose `how` changed that are painted again in one frame. The others are a frame late. */
const PER_FRAME = 2

type Kept = { canvas: CanvasImageSource; g: G; what: string; how: string }

export class Stamps {
  private readonly kept = new Map<string, Kept>()
  private readonly make: MakeSheet
  private scale = 1
  private left = PER_FRAME
  /** Names refused a repaint this frame: first in line next frame. */
  private waiting = new Set<string>()
  painted = 0
  /** Pictures put down since the frame began. */
  puts = 0

  constructor(make: MakeSheet) {
    this.make = make
  }

  /** Starts a frame drawn at this many pixels to a unit. */
  begin(scale: number): void {
    if (scale !== this.scale) this.kept.clear()
    this.scale = scale
    this.left = PER_FRAME
    this.painted = 0
    this.puts = 0
  }

  clear(): void {
    this.kept.clear()
  }

  readonly put: Stamp = (g, name, box, what, how, paint) => {
    this.puts += 1
    const [x, y, w, h] = box
    let kept = this.kept.get(name)
    if (!kept) {
      kept = { ...this.make(Math.ceil(w * this.scale), Math.ceil(h * this.scale)), what: '-', how: '-' }
      this.kept.set(name, kept)
    }
    const other = kept.what !== what
    if (other || kept.how !== how) {
      const mayWait = !other && !this.waiting.has(name) && this.left <= 0
      if (mayWait) this.waiting.add(name)
      else {
        this.left -= 1
        this.waiting.delete(name)
        this.painted += 1
        const s = this.scale
        kept.what = what
        kept.how = how
        kept.g.setTransform(1, 0, 0, 1, 0, 0)
        kept.g.clearRect(0, 0, Math.ceil(w * s), Math.ceil(h * s))
        kept.g.setTransform(s, 0, 0, s, -x * s, -y * s)
        paint(kept.g)
      }
    }
    g.drawImage(kept.canvas, x, y, Math.ceil(w * this.scale) / this.scale, Math.ceil(h * this.scale) / this.scale)
  }
}

/** A number to the nearest step, for a key. */
export const step = (v: number, size: number): number => Math.round(v / size)
