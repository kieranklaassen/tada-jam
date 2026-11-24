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

/** Pictures whose `how` changed that are painted again in one frame. The others are a frame late. */
const PER_FRAME = 2

type Kept = { canvas: CanvasImageSource; g: G; what: string; how: string }

export class Stamps {
  private readonly kept = new Map<string, Kept>()
  private readonly make: MakeSheet
  private scale = 1
  /** Set by the tier: whether a picture that is turned or stretched is smoothed. One that is only moved never needs it. */
  smooth = true
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
    const [x, y, w, h] = box, { scale } = this
    const pw = Math.ceil(w * scale), ph = Math.ceil(h * scale)
    let kept = this.kept.get(name)
    if (!kept) {
      kept = { ...this.make(pw, ph), what: '-', how: '-' }
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
        kept.g.clearRect(0, 0, pw, ph)
        kept.g.setTransform(s, 0, 0, s, -x * s, -y * s)
        paint(kept.g)
      }
    }
    const at = g.getTransform()
    if (Math.abs(at.b) < 1e-4 && Math.abs(at.c) < 1e-4 && Math.abs(Math.abs(at.a) - scale) < 1e-4 && Math.abs(at.d - scale) < 1e-4) {
      // Only moved, or mirrored: pixel for pixel.
      g.imageSmoothingEnabled = false
      g.setTransform(Math.sign(at.a), 0, 0, 1, Math.round(at.e + at.a * x), Math.round(at.f + at.d * y))
      g.drawImage(kept.canvas, 0, 0)
      g.setTransform(at)
    } else {
      g.imageSmoothingEnabled = this.smooth
      g.drawImage(kept.canvas, x, y, pw / scale, ph / scale)
    }
  }
}

/** A number to the nearest step, for a key. */
export const step = (v: number, size: number): number => Math.round(v / size)
