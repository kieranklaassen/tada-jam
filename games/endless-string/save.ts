import { HOOK } from './layout'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// It holds where the string hangs, never a thing in the air.

export const SAVE_VERSION = 1

export type Saved = {
  v: typeof SAVE_VERSION
  /** Which boxful: what comes out, in what order. */
  seed: number
  /** The places the string hangs on, from the box. */
  hooks: string[]
  /** Where in the snow the end lies, if it lies there. */
  snow: number | null
  lit: boolean
  /** The opening round has been shown. */
  shown: boolean
  /** The crank has turned up. */
  crank: boolean
}

export function fresh(): Saved {
  return { v: SAVE_VERSION, seed: 0, hooks: [], snow: null, lit: false, shown: false, crank: false }
}

export function serialize(saved: Saved): Saved {
  return { ...saved, hooks: [...saved.hooks] }
}

/** Repairs field by field: what cannot be read takes its first value, and a later version is not read. */
export function deserialize(value: unknown): Saved {
  const saved = fresh()
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return saved
  const from = value as Record<string, unknown>
  if (from.v !== SAVE_VERSION) return saved
  if (Number.isSafeInteger(from.seed) && (from.seed as number) >= 0) saved.seed = from.seed as number
  if (Array.isArray(from.hooks)) saved.hooks = [...new Set(from.hooks.filter((id): id is string => typeof id === 'string' && HOOK.has(id)))]
  if (typeof from.snow === 'number' && Number.isFinite(from.snow)) saved.snow = from.snow
  saved.lit = from.lit === true
  saved.shown = from.shown === true
  saved.crank = from.crank === true
  return saved
}
