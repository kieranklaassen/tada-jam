import type { G } from './ply'
import type { MakeSheet, Sheet } from './sprites'

// For the tests, which run with no canvas: a drawing context that draws
// nothing and keeps a count of what was asked of it. It takes any call and
// any setting a real context takes, so the view and every painter run on it
// as they are.

export type Recording = {
  /**
   * Stamps of a painted piece: the image, the size it was stamped at, where on the surface, in its pixels, the
   * piece's own origin fell, and the turn and scale it was stamped under, as a canvas has them.
   */
  stamps: { image: unknown; w: number; h: number; x: number; y: number; a: number; b: number; c: number; d: number }[]
  /** Paths begun: a live stroke or fill is one path. */
  paths: number
  fills: number
  strokes: number
  /** Text drawn, which the game never does. */
  texts: number
}

export function emptyRecording(): Recording {
  return { stamps: [], paths: 0, fills: 0, strokes: 0, texts: 0 }
}

export function clear(kept: Recording): void {
  kept.stamps.length = 0
  kept.paths = 0
  kept.fills = 0
  kept.strokes = 0
  kept.texts = 0
}

type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number }

/**
 * The transform of a context, kept as a real context keeps it, so that a painter or the view can ask where it
 * stands. `take` is handed every call; it answers `getTransform` and says nothing else.
 */
function transforms(): { take: (name: string | symbol, args: unknown[]) => Matrix | undefined; now: () => Matrix } {
  let m: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const kept: Matrix[] = []
  const num = (value: unknown): number => Number(value)
  return {
    now: () => m,
    take(name, args) {
      switch (name) {
        case 'save': kept.push({ ...m }); break
        case 'restore': m = kept.pop() ?? m; break
        case 'setTransform': m = args.length >= 6 ? { a: num(args[0]), b: num(args[1]), c: num(args[2]), d: num(args[3]), e: num(args[4]), f: num(args[5]) } : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; break
        case 'resetTransform': m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; break
        case 'translate': m = { ...m, e: m.e + m.a * num(args[0]) + m.c * num(args[1]), f: m.f + m.b * num(args[0]) + m.d * num(args[1]) }; break
        case 'scale': m = { ...m, a: m.a * num(args[0]), b: m.b * num(args[0]), c: m.c * num(args[1]), d: m.d * num(args[1]) }; break
        case 'rotate': { const cos = Math.cos(num(args[0])), sin = Math.sin(num(args[0])); m = { ...m, a: m.a * cos + m.c * sin, b: m.b * cos + m.d * sin, c: m.c * cos - m.a * sin, d: m.d * cos - m.b * sin }; break }
        case 'getTransform': return { ...m }
      }
      return undefined
    },
  }
}

/** Whatever a context hands back from a call (a gradient, a pattern): it takes any call too. */
function anything(): unknown {
  const made: unknown = new Proxy(() => undefined, { get: (_target, name) => (name === 'then' ? undefined : () => made) })
  return made
}

export function recordingContext(kept: Recording): G {
  const set: Record<string | symbol, unknown> = {}
  const stands = transforms()
  const context = new Proxy(set, {
    get(target, name) {
      if (name in target) return target[name]
      return (...args: unknown[]): unknown => {
        const asked = stands.take(name, args)
        if (asked) return asked
        if (name === 'drawImage') { const m = stands.now(); kept.stamps.push({ image: args[0], w: Number(args[3]), h: Number(args[4]), x: m.e, y: m.f, a: m.a, b: m.b, c: m.c, d: m.d }) }
        else if (name === 'beginPath') kept.paths += 1
        else if (name === 'fill' || name === 'fillRect') kept.fills += 1
        else if (name === 'stroke' || name === 'strokeRect') kept.strokes += 1
        else if (name === 'fillText' || name === 'strokeText') kept.texts += 1
        else if (typeof name === 'string' && name.startsWith('create')) return anything()
        return undefined
      }
    },
    set(target, name, value) {
      target[name] = value
      return true
    },
  })
  return context as unknown as G
}

/** Sheets with no pixels, for the view's store of painted pieces. What is painted into them is counted in `painted`. */
export function blankSheets(painted: Recording): MakeSheet {
  return (width, height): Sheet => ({ image: { width, height } as unknown as CanvasImageSource, g: recordingContext(painted) })
}

/**
 * A context that draws nothing and writes down everything asked of it, in order: every call with its numbers,
 * every setting, and which sheet a stamp took. Two frames that leave the same trace are the same picture.
 */
/** Every sheet and other object a trace has met, numbered once for all traces, so that the same sheet has the same name in each. */
const names = new WeakMap<object, number>()
let named = 0

export function tracingContext(): { g: G; trace: string[] } {
  const trace: string[] = []
  const say = (value: unknown): string => {
    if (typeof value === 'number') return (Math.round(value * 100) / 100).toString()
    if (typeof value === 'string' || typeof value === 'boolean' || value === undefined || value === null) return String(value)
    if (typeof value !== 'object' && typeof value !== 'function') return String(value)
    if (!names.has(value)) names.set(value, named++)
    return `#${names.get(value)}`
  }
  const set: Record<string | symbol, unknown> = {}
  const stands = transforms()
  const context = new Proxy(set, {
    get(target, name) {
      if (name in target) return target[name]
      return (...args: unknown[]): unknown => {
        const asked = stands.take(name, args)
        if (asked) return asked
        trace.push(`${String(name)}(${args.map(say).join(',')})`)
        if (typeof name === 'string' && name.startsWith('create')) return anything()
        return undefined
      }
    },
    set(target, name, value) {
      target[name] = value
      trace.push(`${String(name)}=${say(value)}`)
      return true
    },
  })
  return { g: context as unknown as G, trace }
}
