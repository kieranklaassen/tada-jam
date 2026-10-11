import type { Ctx, MakeCanvas } from './pencil'

// A stand-in for the canvas, for tests: it draws nothing and counts. The view
// and the art take what makes their canvases as a parameter, so a test hands
// them this, and the same code runs that runs on a tablet.

/** One stamp as it was laid: the image, the transform it was laid under, and where in the image's own units. */
export type Stamp = { image: unknown; a: number; b: number; c: number; d: number; e: number; f: number; x: number; y: number; w: number; h: number; alpha: number }

export type Tally = {
  stamps: number
  strokes: number
  fills: number
  clips: number
  /** What was stamped, in order. */
  stamped: unknown[]
  /** The same stamps with where each was laid. */
  placed: Stamp[]
  /** Every call and every value set, in order, with its numbers: two frames drawn alike leave the same log. */
  log: string[]
}

/** A canvas maker, a context to draw the frame on, and the count of what was drawn through either since `reset`. The log is kept only when `logging` is asked for. */
export function standIn(logging = false): { make: MakeCanvas; ctx: Ctx; tally: Tally; reset(): void } {
  const tally: Tally = { stamps: 0, strokes: 0, fills: 0, clips: 0, stamped: [], placed: [], log: [] }
  const values: Record<string, unknown> = {}
  let at = [1, 0, 0, 1, 0, 0]
  const counted: Record<string, (...args: unknown[]) => void> = {
    drawImage: (image, x = 0, y = 0, w = 0, h = 0) => {
      tally.stamps += 1
      tally.stamped.push(image)
      tally.placed.push({ image, a: at[0], b: at[1], c: at[2], d: at[3], e: at[4], f: at[5], x: x as number, y: y as number, w: w as number, h: h as number, alpha: typeof values.globalAlpha === 'number' ? values.globalAlpha : 1 })
    },
    stroke: () => { tally.strokes += 1 },
    fill: () => { tally.fills += 1 },
    fillRect: () => { tally.fills += 1 },
    clip: () => { tally.clips += 1 },
    setTransform: (...args) => { at = args as number[] },
  }
  const text = (value: unknown): string => typeof value === 'number' ? value.toFixed(4) : typeof value === 'string' ? value : ''
  const ctx = new Proxy({}, {
    get: (_, name) => {
      if (typeof name !== 'string') return undefined
      // No pattern: a stroke takes the plain ink, as it does where a pattern cannot be made.
      if (name === 'createPattern') return () => null
      if (name in values) return values[name]
      return (...args: unknown[]) => {
        if (logging) tally.log.push(`${name}(${args.map(text).join(',')})`)
        counted[name]?.(...args)
      }
    },
    set: (_, name, value) => {
      if (typeof name === 'string') {
        values[name] = value
        if (logging) tally.log.push(`${name}=${text(value)}`)
      }
      return true
    },
  }) as unknown as Ctx
  const make: MakeCanvas = (width, height) => ({ width, height, getContext: () => ctx }) as unknown as HTMLCanvasElement
  return {
    make, ctx, tally,
    reset: () => {
      tally.stamps = 0; tally.strokes = 0; tally.fills = 0; tally.clips = 0
      tally.stamped.length = 0; tally.placed.length = 0; tally.log.length = 0
    },
  }
}
