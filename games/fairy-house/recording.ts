import type { Sheet } from './art'
import type { Pen } from './pencil'

// A stand-in for a canvas, for tests that have none: it draws nothing and
// counts what would have been drawn. A stamp is one `drawImage`; a live path
// is one `fill` or `stroke`. Every other call is taken and ignored.

export type Tally = {
  stamps: number
  paths: number
  /** Stamps at least as wide as the stage: the wood. */
  wide: number
  /** The room those wide stamps cover between them, in stage units squared. */
  area: number
  sheets: number
}

export function makeRecording(wideFrom: number): { pen: Pen; make: () => Sheet; tally: Tally; reset: () => void } {
  const tally: Tally = { stamps: 0, paths: 0, wide: 0, area: 0, sheets: 0 }
  const nothing = (): void => {}
  const calls: Record<string, (...args: number[]) => void> = {
    drawImage: (...args) => {
      tally.stamps += 1
      // The room the image is drawn into is the last four numbers: where, how wide and how high.
      const w = args[args.length - 2], h = args[args.length - 1]
      if (w < wideFrom) return
      tally.wide += 1
      tally.area += w * h
    },
    fill: () => { tally.paths += 1 },
    stroke: () => { tally.paths += 1 },
  }
  const pen = new Proxy({}, {
    get: (_, name) => (typeof name === 'string' && calls[name]) || nothing,
    set: () => true,
  }) as unknown as Pen
  const make = (): Sheet => {
    tally.sheets += 1
    return { width: 0, height: 0, getContext: () => pen }
  }
  const reset = (): void => {
    tally.stamps = 0
    tally.paths = 0
    tally.wide = 0
    tally.area = 0
  }
  return { pen, make, tally, reset }
}
