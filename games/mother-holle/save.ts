import { COLUMNS, EDGE, FEATHERS, IDS, MOST_HIGH, QUILT, SLOTS, RIGHT, LEFT, STRIP, WAITS, isSled, type Id } from './layout'

// What goes into ctx.storage: small plain JSON, versioned, read defensively.
// A damaged field takes its default and the rest is kept.

export type SavedBody = { x: number; on: Id | null; out: boolean; face: 1 | -1; cap: number; egg: boolean }
export type GameState = { v: 1; quilt: number; empty: boolean; night: boolean; shown: boolean; snow: number[]; bodies: Record<Id, SavedBody> }

/** Open at both ends; no age given takes the youngest. */
export function freshState(childAge: number | null): GameState {
  const older = childAge !== null && childAge >= 5
  return {
    v: 1, quilt: QUILT.start, empty: false, night: false, shown: false,
    // A short run of snow ends under the tub: what snow is for, in the first picture.
    snow: Array.from({ length: COLUMNS }, (_, i) => { const x = LEFT + (i + 0.5) * STRIP; return x > -8.9 && x < -5.2 ? Math.min(0.2, (x + 8.9) * 0.4, (-5.2 - x) * 0.9) : 0 }),
    bodies: Object.fromEntries(IDS.map((id) => {
      const out = id === 'walrus' || !isSled(id) || (older && id === 'granny')
      return [id, { x: id === 'walrus' ? SLOTS[0] : older && id === 'granny' ? SLOTS[1] : WAITS[id].x, on: null, out, face: 1, cap: 0, egg: false }]
    })) as GameState['bodies'],
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, lo: number, hi: number, or: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : or)

export function deserialize(raw: unknown, childAge: number | null = null): GameState {
  const fresh = freshState(childAge)
  if (!isRecord(raw) || raw.v !== 1) return fresh
  const state: GameState = { ...fresh, quilt: num(raw.quilt, QUILT.left, QUILT.right, fresh.quilt), empty: raw.empty === true, night: raw.night === true, shown: raw.shown !== false }
  if (Array.isArray(raw.snow) && raw.snow.length === COLUMNS) state.snow = raw.snow.map((d) => num(d, 0, (FEATHERS / (RIGHT - LEFT)) * 12, 0))
  if (isRecord(raw.bodies)) {
    for (const id of IDS) {
      const b = raw.bodies[id]
      if (!isRecord(b)) continue
      const or = state.bodies[id]
      const out = !isSled(id) || (typeof b.out === 'boolean' ? b.out : or.out)
      state.bodies[id] = { x: out ? num(b.x, EDGE.left, EDGE.right, or.x) : WAITS[id].x, on: out && b.on !== id && IDS.includes(b.on as Id) ? (b.on as Id) : null, out, face: b.face === -1 ? -1 : 1, cap: num(b.cap, 0, 1, 0), egg: b.egg === true }
    }
  }
  // One on each head, nobody on somebody who waits, never round in a circle, never too high.
  const seats = new Set<Id>()
  for (const id of IDS) {
    const b = state.bodies[id]
    if (b.on && (seats.has(b.on) || !state.bodies[b.on].out)) b.on = null
    if (b.on) seats.add(b.on)
  }
  for (const id of IDS) {
    let n = 1
    for (let at: Id | null = state.bodies[id].on; at; at = state.bodies[at].on) if (++n > MOST_HIGH || at === id) { state.bodies[id].on = null; break }
  }
  // Never more snow than there are feathers.
  const lying = state.snow.reduce((s, d) => s + d, 0) * STRIP + IDS.reduce((s, id) => s + state.bodies[id].cap, 0)
  if (lying > FEATHERS) {
    const k = FEATHERS / lying
    state.snow = state.snow.map((d) => d * k)
    for (const id of IDS) state.bodies[id].cap *= k
  }
  return state
}
