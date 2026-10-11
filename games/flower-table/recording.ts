// A canvas that counts what is drawn on it and paints nothing, for the tests
// that hold a frame to its budget on a machine with no canvas. It is not part
// of the game: nothing but a test imports it.

/** What one frame put on the surface. */
export type Tally = {
  /** Sprites stamped: `drawImage` calls. */
  stamps: number
  /** Paths and rectangles filled or stroked. */
  pen: number
  /** Stamps that cover the whole surface: the still garden, once. */
  fullSurface: number
  /** Clips set. */
  clips: number
}

export const emptyTally = (): Tally => ({ stamps: 0, pen: 0, fullSurface: 0, clips: 0 })

/** How many canvases have been made, so a test can say that a frame makes none. */
export const made = { canvases: 0 }

/** A canvas whose context counts into `tally`, or counts nothing when there is none (a sprite, painted once). */
export function recordingCanvas(tally: Tally | null, width = 300, height = 150): HTMLCanvasElement {
  made.canvases++
  const canvas = { width, height } as { width: number; height: number; getContext: (kind: string) => unknown }
  const gradient = { addColorStop: (): void => {} }
  const counted: Record<string, (...args: unknown[]) => unknown> = {
    drawImage: (image: unknown, ...rest: unknown[]) => {
      if (!tally) return
      tally.stamps++
      const source = image as { width: number; height: number }
      if (rest.length === 2 && source.width >= canvas.width && source.height >= canvas.height) tally.fullSurface++
    },
    fill: () => { if (tally) tally.pen++ },
    stroke: () => { if (tally) tally.pen++ },
    fillRect: () => { if (tally) tally.pen++ },
    strokeRect: () => { if (tally) tally.pen++ },
    clip: () => { if (tally) tally.clips++ },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }
  const set: Record<string | symbol, unknown> = {}
  const nothing = (): void => {}
  const context = new Proxy(set, {
    get: (target, name) => (name in target ? target[name] : (counted[name as string] ?? nothing)),
    set: (target, name, value) => { target[name] = value; return true },
  })
  canvas.getContext = () => context
  return canvas as unknown as HTMLCanvasElement
}
