import type { G, MakeSheet, Sheet } from './surface'

// A stand-in for a canvas, for tests: sheets that draw nothing and keep
// count of what was asked of them. With it the real view runs on a machine
// with no canvas, and a test can hold the frame's draw number.

/** What a stand-in sheet was asked to draw. */
export type Count = { images: number; fills: number; strokes: number; rects: number; puts: number }

const COUNTED: Record<string, keyof Count> = { drawImage: 'images', fill: 'fills', stroke: 'strokes', fillRect: 'rects', strokeRect: 'rects', putImageData: 'puts' }

export type Recorded = Sheet & { count: Count; width: number; height: number }

/** One stand-in sheet. */
export function recordedSheet(width: number, height: number): Recorded {
  const count: Count = { images: 0, fills: 0, strokes: 0, rects: 0, puts: 0 }
  const kept = new Map<string | symbol, unknown>()
  const nothing = (): void => {}
  const g = new Proxy({}, {
    get(_, name) {
      if (typeof name === 'string' && name in COUNTED) return () => { count[COUNTED[name]] += 1 }
      if (name === 'createImageData') return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
      return kept.has(name) ? kept.get(name) : nothing
    },
    set(_, name, value) {
      kept.set(name, value)
      return true
    },
  }) as unknown as G
  return { canvas: { width, height } as unknown as CanvasImageSource, g, count, width, height }
}

/** A factory of stand-in sheets that remembers every sheet it made. */
export function recorder(): { make: MakeSheet; made: Recorded[] } {
  const made: Recorded[] = []
  return {
    made,
    make: (width, height) => {
      const sheet = recordedSheet(width, height)
      made.push(sheet)
      return sheet
    },
  }
}

/** Everything a sheet was asked to put on itself, as one number. */
export function drawsOf(count: Count): number {
  return count.images + count.fills + count.strokes + count.rects
}
