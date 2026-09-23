import { FROG_COUNT, PAD_COUNT, padAt } from './layout'

// The saved pond: which pad each frog sits on. That is the whole
// composition, so it is all that persists. The loop's phase, lifted frogs,
// and guidance are session-only: put-away at any instant loses nothing.

export const STATE_VERSION = 1

export type PondState = {
  v: typeof STATE_VERSION
  /** Pad index per frog, all distinct. */
  frogs: number[]
}

/** A rising staircase, near-left to far-right, so the first loop shows that far means high. */
export function defaultPond(): PondState {
  return { v: STATE_VERSION, frogs: Array.from({ length: FROG_COUNT }, (_, frog) => padAt(frog, frog)!.index) }
}

/** Beats per minute. Age is a dial for defaults, never a gate. */
export function tempoForAge(childAge: number | null): number {
  if (childAge === null) return 80
  if (childAge <= 4) return 72
  if (childAge >= 7) return 88
  return 80
}

function isPadIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < PAD_COUNT
}

/** Saved state is untrusted: keep what is valid and distinct, seat the rest on free pads, prefer their default pads. */
export function deserialize(raw: unknown): PondState {
  const fallback = defaultPond()
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fallback
  const record = raw as Record<string, unknown>
  if (record.v !== STATE_VERSION || !Array.isArray(record.frogs)) return fallback

  const taken = new Set<number>()
  const frogs: (number | null)[] = []
  for (let frog = 0; frog < FROG_COUNT; frog++) {
    const pad = record.frogs[frog]
    if (isPadIndex(pad) && !taken.has(pad)) {
      taken.add(pad)
      frogs.push(pad)
    } else frogs.push(null)
  }
  for (let frog = 0; frog < FROG_COUNT; frog++) {
    if (frogs[frog] !== null) continue
    const preferred = fallback.frogs[frog]
    let pad = taken.has(preferred) ? -1 : preferred
    for (let candidate = 0; pad < 0 && candidate < PAD_COUNT; candidate++) if (!taken.has(candidate)) pad = candidate
    taken.add(pad)
    frogs[frog] = pad
  }
  return { v: STATE_VERSION, frogs: frogs as number[] }
}

export function serialize(state: PondState): PondState {
  return { v: STATE_VERSION, frogs: [...state.frogs] }
}

export function frogOnPad(state: PondState, pad: number): number | null {
  const frog = state.frogs.indexOf(pad)
  return frog < 0 ? null : frog
}

/**
 * Put a frog on a pad. If another frog sits there they trade places.
 * Returns the frog that moved to the vacated pad, or null.
 */
export function moveFrog(state: PondState, frog: number, pad: number): number | null {
  const from = state.frogs[frog]
  if (from === pad) return null
  const other = frogOnPad(state, pad)
  state.frogs[frog] = pad
  if (other !== null) state.frogs[other] = from
  return other
}
