import type { Canvases } from './stencil'

// A stand-in for a canvas, for the tests: it draws nothing and counts. The
// frame-budget test runs the real view on it, on a machine with no canvas,
// and reads back how many sprites a frame stamped and how many live strokes
// and fills it made.

/** A stamp as drawn: its image, its size, and where the pen had been moved to since its transform was last set. */
export type Stamp = { image: unknown; w: number; h: number; at: { x: number; y: number } | null }

/** What one stand-in surface was asked to do since the last `reset`. */
export class Count {
  stamps: Stamp[] = []
  strokes = 0
  fills = 0

  reset(): void {
    this.stamps = []
    this.strokes = 0
    this.fills = 0
  }
}

/** A stand-in canvas of a size. Every drawing call is accepted; stamps, strokes and fills are counted into `count`. */
export function standIn(width: number, height: number, count: Count): HTMLCanvasElement {
  const canvas = { width, height } as { width: number; height: number; getContext?: () => unknown }
  const state: Record<string, unknown> = { canvas }
  const gradient = { addColorStop: () => {} }
  let at: { x: number; y: number } | null = null
  const calls: Record<string, (...args: unknown[]) => unknown> = {
    // A stamp's size is taken as drawn: the last two numbers when a size is given, the image's own otherwise.
    drawImage: (image: unknown, _x: unknown, _y: unknown, w?: unknown, h?: unknown) => {
      const from = image as { width: number; height: number }
      count.stamps.push({ image, w: typeof w === 'number' ? w : from.width, h: typeof h === 'number' ? h : from.height, at })
    },
    setTransform: () => { at = null },
    translate: (x: unknown, y: unknown) => { if (at === null && typeof x === 'number' && typeof y === 'number') at = { x, y } },
    stroke: () => { count.strokes += 1 },
    fill: () => { count.fills += 1 },
    fillRect: () => { count.fills += 1 },
    // Wiping a patch of a layer is a draw too.
    clearRect: () => { count.fills += 1 },
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
  }
  const pen = new Proxy(state, {
    get: (target, key: string) => (key in target ? target[key] : (calls[key] ?? (() => {}))),
    set: (target, key: string, value) => {
      target[key] = value
      return true
    },
  })
  canvas.getContext = () => pen
  return canvas as unknown as HTMLCanvasElement
}

/** A factory of stand-in canvases for the sprites, and how many it has been asked for. */
export function standIns(): { make: Canvases; made: () => number } {
  let made = 0
  const unused = new Count()
  return {
    make: (width, height) => {
      made += 1
      return standIn(width, height, unused)
    },
    made: () => made,
  }
}
