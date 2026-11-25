import { CELLS, FIELD, FULL, PLACES, SPOTS, START_R, THINGS, type Point, type ThingId } from './layout'
import { freshWorld, settled, type Ball, type World } from './world'

// What goes into ctx.storage: the world as it will be when nobody touches it.
// A hop is saved as landed and a walk as the heap it ends in, so nothing plays
// on load. Read field by field; anything not understood is made fresh.

export const VERSION = 1
type SavedBall = { r: number; s: number; t: [ThingId, number, number, number][] }
export type Saved = { v: number; stack: SavedBall[]; ball: (SavedBall & { x: number; y: number; n: number }) | null; loose: Partial<Record<ThingId, [number, number]>>; bare: string; seed: number; shown: boolean }

const round = (n: number): number => Math.round(n * 100) / 100
const packBall = (b: Ball): SavedBall => ({ r: round(b.r), s: round(b.spin), t: b.things.map((s) => [s.id, round(s.x), round(s.y), round(s.rot)]) })

export function serialize(world: World): Saved {
  const w = settled(world)
  let bare = ''
  for (let i = 0; i < CELLS; i += 4) bare += ((w.bare[i] ?? 0) | (w.bare[i + 1] ?? 0) << 1 | (w.bare[i + 2] ?? 0) << 2 | (w.bare[i + 3] ?? 0) << 3).toString(16)
  const loose: Saved['loose'] = {}
  for (const id of THINGS) { const p = w.loose[id]; if (p) loose[id] = [round(p.x), round(p.y)] }
  return { v: VERSION, stack: w.stack.map(packBall), ball: w.ball ? { ...packBall(w.ball), x: round(w.ball.x), y: round(w.ball.y), n: w.ball.taken } : null, loose, bare, seed: w.seed, shown: w.shown }
}

const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null)
const isThing = (v: unknown): v is ThingId => (THINGS as readonly unknown[]).includes(v)

function ballOf(v: unknown, full: number, seen: Set<ThingId>): Ball | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>, r = num(o.r, START_R, full)
  if (r === null) return null
  const things: Ball['things'] = []
  for (const e of Array.isArray(o.t) ? o.t.slice(0, THINGS.length) : []) {
    if (!Array.isArray(e) || !isThing(e[0]) || seen.has(e[0])) continue
    const x = num(e[1], -r, r), y = num(e[2], -r, r), rot = num(e[3], -1e4, 1e4)
    if (x === null || y === null || rot === null) continue
    seen.add(e[0])
    things.push({ id: e[0], x, y, rot })
  }
  return { r, spin: num(o.s, -1e4, 1e4) ?? 0, things }
}

export function deserialize(value: unknown): World {
  const base = freshWorld()
  if (!value || typeof value !== 'object') return base
  const o = value as Record<string, unknown>
  if (o.v !== VERSION || !Array.isArray(o.stack)) return base
  const seen = new Set<ThingId>(), stack: Ball[] = []
  for (const [i, v] of o.stack.slice(0, 3).entries()) {
    const b = ballOf(v, FULL[PLACES[i]], seen)
    if (!b) break
    stack.push(b)
  }
  const w: World = { ...base, stack, loose: {} }
  const raw = (o.ball && typeof o.ball === 'object' ? o.ball : {}) as Record<string, unknown>
  const b = stack.length < 3 ? ballOf(o.ball, FULL[PLACES[stack.length]], seen) : null
  w.ball = b ? { ...b, x: num(raw.x, FIELD.x0, FIELD.x1) ?? 236, y: num(raw.y, FIELD.y0, FIELD.y1) ?? 690, vx: 0, vy: 0, taken: Math.max(0, num(raw.n, 0, CELLS) ?? 0), fall: 0 } : null
  const loose = (o.loose && typeof o.loose === 'object' ? o.loose : {}) as Record<string, unknown>
  for (const id of THINGS) {
    if (seen.has(id)) continue
    const p = loose[id], x = Array.isArray(p) ? num(p[0], FIELD.x0, FIELD.x1) : null, y = Array.isArray(p) ? num(p[1], FIELD.y0, FIELD.y1) : null
    if (x !== null && y !== null) w.loose[id] = { x, y }
  }
  // A thing that is nowhere lies on the first free spot.
  for (const id of THINGS) if (!seen.has(id) && !w.loose[id]) w.loose[id] = { ...(SPOTS.find((s) => Object.values(w.loose).every((q: Point | undefined) => !q || Math.hypot(q.x - s.x, q.y - s.y) > 30)) ?? SPOTS[0]) }
  if (typeof o.bare === 'string') for (let i = 0; i < CELLS; i++) { const h = parseInt(o.bare[i >> 2] ?? '0', 16); w.bare[i] = Number.isFinite(h) ? (h >> (i & 3)) & 1 : 0 }
  w.seed = (num(o.seed, 0, 4294967295) ?? 7) >>> 0
  w.shown = o.shown === true
  // `settled` gives an unfinished snowman with no ball the next one.
  return settled(w)
}
