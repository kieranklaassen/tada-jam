import { OWNERS, type OwnerId } from './owners'
import { DEEP, THINGS, type ThingId } from './things'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// A damaged field takes its default and the rest is kept.

export const STATE_VERSION = 1

export type GameState = {
  v: typeof STATE_VERSION
  owner: OwnerId
  /** What lies in each owner's shoe, in the order it went in. By day only the present owner's holds anything. */
  shoes: Record<OwnerId, ThingId[]>
  night: boolean
  /** The whole round has been shown. */
  shown: boolean
  /** A foot has gone in. */
  begun: boolean
}

export function emptyShoes(): Record<OwnerId, ThingId[]> {
  return { oma: [], bear: [], goose: [], elephant: [], horse: [] }
}

export function freshState(): GameState {
  return { v: STATE_VERSION, owner: 'oma', shoes: emptyShoes(), night: false, shown: false, begun: false }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function deserialize(raw: unknown): GameState {
  const state = freshState()
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return state
  state.owner = OWNERS.find((o) => o === raw.owner) ?? state.owner
  state.night = raw.night === true
  state.begun = raw.begun === true || state.night
  state.shown = raw.shown === true || state.begun
  if (isRecord(raw.shoes)) {
    const used = new Set<ThingId>()
    for (const o of OWNERS) {
      const list = raw.shoes[o]
      // By day the other shoes are away, so anything in them is at home.
      if (!Array.isArray(list) || (!state.night && o !== state.owner)) continue
      for (const v of list as unknown[]) {
        const id = THINGS.find((t) => t === v)
        if (id && !used.has(id) && state.shoes[o].length < DEEP) { used.add(id); state.shoes[o].push(id) }
      }
    }
  }
  return state
}

export function serialize(s: GameState): GameState {
  const shoes = emptyShoes()
  for (const o of OWNERS) shoes[o] = [...s.shoes[o]]
  return { v: STATE_VERSION, owner: s.owner, shoes, night: s.night, shown: s.shown, begun: s.begun }
}
