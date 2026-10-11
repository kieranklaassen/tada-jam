import type { Surface } from './art'

// A stand-in for a canvas where there is none (a test under node). It draws
// nothing and counts what it was asked to draw: every call that puts
// something on the surface, by name. Anything else a painter calls on its
// context is accepted and ignored, and a gradient or a pattern asked of it is
// another stand-in.

/** The calls that put something on the surface: each is one draw. */
export const DRAWS = ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText'] as const
export type Draw = (typeof DRAWS)[number]

export type Tally = Record<Draw, number> & {
  /** Canvases asked for since the tally was made. */
  canvases: number
  /** The widest and tallest thing stamped, in the units of the transform at the time: not tracked, only the count is. */
  total(): number
  reset(): void
}

export function makeTally(): Tally {
  const tally = { canvases: 0 } as Tally
  tally.reset = () => { for (const draw of DRAWS) tally[draw] = 0 }
  tally.total = () => DRAWS.reduce((sum, draw) => sum + tally[draw], 0)
  tally.reset()
  return tally
}

const inert: unknown = new Proxy(() => inert, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : inert), apply: () => inert })

function context(tally: Tally): unknown {
  const held: Record<string | symbol, unknown> = {}
  return new Proxy(held, {
    get(target, key) {
      if (key in target) return target[key]
      if ((DRAWS as readonly string[]).includes(key as string)) return () => { tally[key as Draw] += 1 }
      // Any other method: accepted, and whatever it hands back accepts everything too.
      return () => inert
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  })
}

/** A canvas stand-in whose draws land in `tally`. */
export function recordingCanvas(tally: Tally, width = 1, height = 1): Surface {
  tally.canvases += 1
  const ctx = context(tally)
  return { width, height, getContext: () => ctx }
}
