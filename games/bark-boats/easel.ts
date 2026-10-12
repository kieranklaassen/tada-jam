import { IdleLadder, type Guidance } from './guidance'
import { useCanvases } from './print'
import { Recording, recordingSheets } from './recording'
import { BrookView } from './view'
import type { World } from './world'

// The real view on a recording surface, for the tests: no canvas, no
// browser, no clock and no file. A frame drawn here is counted and folded
// into one number, and nothing is shown.

export const SURFACE = { width: 1180, height: 820, ratio: 2 } as const

export type Easel = {
  view: BrookView
  surface: Recording
  /** How many sheets have been asked for since the easel was set up. */
  made: () => number
  /** Draws one frame, `idle` seconds into the idle ladder (0: no glow and no hand), and says what it cost. */
  frame: (w: World | null, idle?: number) => { stamps: number; pen: number; draws: number; full: number; digest: number }
}

/** The guidance the ladder shows after `idle` seconds without a touch. */
export function guidanceAt(idle: number): Guidance {
  return { ...new IdleLadder(0).update(idle) }
}

export function setUp(width: number = SURFACE.width, height: number = SURFACE.height, ratio: number = SURFACE.ratio): Easel {
  const sheets = recordingSheets()
  useCanvases(sheets.make)
  const surface = new Recording()
  const view = new BrookView({ getContext: () => surface } as unknown as HTMLCanvasElement)
  view.resize(width, height, ratio)
  return {
    view,
    surface,
    made: sheets.made,
    frame: (w, idle = 0) => {
      if (w) view.sync(w)
      surface.reset()
      view.draw(w, guidanceAt(idle))
      const full = surface.stamped.filter((s) => s.w >= width * ratio * 0.8 && s.h >= height * ratio * 0.8).length
      return { stamps: view.stamps, pen: view.pen, draws: view.stamps + view.pen, full, digest: surface.digest }
    },
  }
}
