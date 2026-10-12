import { BLOCK_H, BUILD, GROUND_Y, KEEP_OUT, LYING, awayFromBar, awayFromHole, type Hole } from './ground'
import { STAGE } from './stage'

// Where a thing comes to rest. Things rest where they are set: nothing
// topples. Above the bank's line a thing falls straight down until something
// bears it; below it, a thing lies where it was put, on the pond's ice or on
// the snow in front. Pure numbers, no chance.

/** The six things of the sheet's grid (ART.md). */
export const KINDS = ['clear', 'cloudy', 'snow', 'ball', 'icicle', 'berry'] as const
export type Kind = (typeof KINDS)[number]
/**
 * `built`: standing on the bank or on other blocks. `lying`: on the pond or the front snow. `afloat`: the berry
 * block or a snowball in a hole. `frozen`: an icicle frozen into the pond. `hung`: an icicle under a block.
 */
export const PLACES = ['built', 'lying', 'afloat', 'frozen', 'hung'] as const
export type Place = (typeof PLACES)[number]

/** A thing at rest, which is all a save holds of it. `dent` is a snow block's fingertip dents, as places along it from its middle; `cap` says it wears fresh snow. */
export type Rest = { kind: Kind; len: number; x: number; y: number; place: Place; dent: number[]; cap: boolean }

/** The berry block is always this long. */
export const BERRY_LEN = 78
/** A snowball is this wide, and half of it after a warm thumb. */
export const BALL = 46
export const SMALL_BALL = 23
/** An icicle is this long, and half of it after a warm thumb; it is always this wide. */
export const ICICLE = 44
export const STUB = 22
export const ICICLE_W = 18
/** A snow block keeps at most this many dents. */
export const MOST_DENTS = 4

/** A thing with nothing but its kind, its length and its place. */
export function restOf(kind: Kind, len: number, x: number, y: number, place: Place): Rest {
  return { kind, len, x, y, place, dent: [], cap: false }
}

/** How wide a thing is where it stands or lies: an icicle's `len` is its length from root to point, every other thing's is its width. */
export function widthOf(thing: { kind: Kind; len: number }): number {
  return thing.kind === 'icicle' ? ICICLE_W : thing.len
}
/** Whether a thing of this kind bears what is set on it. A snowball and an icicle bear nothing: what is let go over one comes down beside it. */
export function bears(kind: Kind): boolean {
  return kind !== 'ball' && kind !== 'icicle'
}

/** Two blocks that share any of their length bear each other: lengths and places are whole units, so the least they can share is half a unit. */
export const BEARS_FROM = 0.25
/** No block rests higher than this: the top of the frame belongs to the sky, the bough and the jam's home control. */
export const CEILING_Y = 150
/** Where the middle of a block is when it stands on the bank. */
export const ON_BANK_Y = GROUND_Y - BLOCK_H / 2

const shares = (ax: number, aw: number, bx: number, bw: number): number => Math.min(ax + aw / 2, bx + bw / 2) - Math.max(ax - aw / 2, bx - bw / 2)

/** Whether two level things cover any of the same place. Things that only touch do not. */
export function covers(ax: number, ay: number, aw: number, bx: number, by: number, bw: number, gap = 0): boolean {
  return shares(ax, aw, bx, bw) > -gap + 0.01 && Math.abs(ay - by) < BLOCK_H + gap - 0.01
}

/** The nearest place on the bank a thing this wide may stand, as far as the bank's two ends go. */
export function onBankX(x: number, w: number): number {
  return Math.round(Math.max(BUILD.x0 + w / 2, Math.min(BUILD.x1 - w / 2, x)))
}

type Stand = { x: number; y: number; on: 'snow' | 'block' }

function restInColumn(w: number, at: number, y: number, built: readonly Rest[]): Stand | null {
  const free = (cy: number) => cy >= CEILING_Y && built.every((b) => !covers(at, cy, w, b.x, b.y, widthOf(b)))
  const places: { y: number; on: 'snow' | 'block' }[] = [{ y: ON_BANK_Y, on: 'snow' }]
  for (const b of built) if (bears(b.kind) && b.place === 'built' && shares(at, w, b.x, widthOf(b)) >= BEARS_FROM) places.push({ y: b.y - BLOCK_H, on: 'block' })
  const open = places.filter((place) => free(place.y)).sort((a, b) => a.y - b.y)
  if (open.length === 0) return null
  const inside = built.some((b) => covers(at, y, w, b.x, b.y, widthOf(b)))
  // Falling: the first free place at or below where it was let go. Let go inside a block: the free place nearest to it, above or below.
  const below = open.find((place) => place.y >= y - 0.5)
  const nearest = [...open].sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0]
  const chosen = inside || !below ? nearest : below
  return { x: at, y: chosen.y, on: chosen.on }
}

/**
 * Where a thing `w` wide let go at `x`, `y` above the bank comes to rest among `built`: straight down onto the
 * first thing that bears it. Let go inside a block, it goes to the free place nearest to it instead. Where the
 * column has no place at all (a snowball or an icicle stands in it, or the pile has reached the ceiling) it
 * comes down beside it, in the nearest column that has one. Null when the whole bank is full.
 */
export function restOnBank(w: number, x: number, y: number, built: readonly Rest[]): Stand | null {
  const at = onBankX(x, w)
  for (let off = 0; off <= BUILD.x1 - BUILD.x0; off += 6) {
    for (const side of off === 0 ? [0] : [-off, off]) {
      const column = onBankX(at + side, w)
      if (off > 0 && column !== at + side) continue
      const rest = restInColumn(w, column, y, built)
      if (rest) return rest
    }
  }
  return null
}

/**
 * Where an icicle let go at `x`, `y` hangs: under a block that has a free place right below it, when it was let
 * go in that place. Null when it was let go anywhere else, and it then stands as any thing does.
 */
export function hangPlace(x: number, y: number, built: readonly Rest[]): { x: number; y: number } | null {
  const at = Math.round(x)
  for (const b of built) {
    if (!bears(b.kind) || b.place !== 'built') continue
    const under = b.y + BLOCK_H
    if (under > ON_BANK_Y + 0.5 || Math.abs(y - under) > BLOCK_H * 0.75) continue
    if (Math.abs(at - b.x) > widthOf(b) / 2 - ICICLE_W / 2) continue
    if (built.every((o) => !covers(at, under, ICICLE_W, o.x, o.y, widthOf(o)))) return { x: at, y: under }
  }
  return null
}

/** Whether something bears this thing: the bank or a block right under it for a standing thing, a block right over it for a hung icicle. */
export function borne(thing: Rest, built: readonly Rest[]): boolean {
  const beside = (dy: number) => built.some((b) => b !== thing && bears(b.kind) && b.place === 'built' && Math.abs(b.y - (thing.y + dy)) < 0.5 && shares(thing.x, widthOf(thing), b.x, widthOf(b)) >= BEARS_FROM)
  if (thing.place === 'hung') return beside(-BLOCK_H)
  return Math.abs(thing.y - ON_BANK_Y) < 0.5 || beside(BLOCK_H)
}

/**
 * After a block has been taken out of a pile, everything left with nothing to bear it comes down, lowest first;
 * an icicle that hung under the block stands where it lands. Returns where each thing that moved now rests, by
 * its index in `built`; `built` itself is not changed.
 */
export function settle(built: readonly Rest[]): Map<number, { x: number; y: number; place: Place }> {
  const now = built.map((b) => ({ ...b }))
  const moved = new Map<number, { x: number; y: number; place: Place }>()
  for (let pass = 0; pass < built.length + 1; pass++) {
    const order = now.map((_, index) => index).sort((a, b) => now[b].y - now[a].y)
    let any = false
    for (const index of order) {
      const thing = now[index]
      if (borne(thing, now)) continue
      const rest = restOnBank(widthOf(thing), thing.x, thing.y, now.filter((b) => b !== thing))
      if (!rest || (rest.y <= thing.y && thing.place !== 'hung')) continue
      Object.assign(thing, { x: rest.x, y: rest.y, place: 'built' })
      moved.set(index, { x: rest.x, y: rest.y, place: 'built' })
      any = true
    }
    if (!any) break
  }
  return moved
}

/**
 * Where a snowball set down at `x`, `y` rolls to: off the end of whatever block it lands on, down to the next
 * thing, and on until it is on the bank or lies against something. Returns each place it passes and rests at.
 */
export function rollBall(w: number, x: number, y: number, built: readonly Rest[]): Stand[] {
  const path: Stand[] = []
  let at = restOnBank(w, x, y, built)
  for (let turn = 0; at && turn < 12; turn++) {
    path.push(at)
    if (at.on === 'snow') break
    const here = at
    const under = built.find((b) => bears(b.kind) && b.place === 'built' && Math.abs(b.y - (here.y + BLOCK_H)) < 0.5 && shares(here.x, w, b.x, widthOf(b)) >= BEARS_FROM)
    if (!under) break
    // Towards the nearer end of what it stands on, and to the left when it stands in the middle.
    const side = here.x > under.x ? 1 : -1
    const edge = Math.round(under.x + side * (widthOf(under) / 2 + w / 2 + 1))
    if (onBankX(edge, w) !== edge || built.some((b) => covers(edge, here.y, w, b.x, b.y, widthOf(b)))) break
    const next = restInColumn(w, edge, here.y, built)
    if (!next || next.y <= here.y) break
    at = next
  }
  return path
}

const inRect = (x: number, y: number, w: number, r: { x: number; y: number; w: number; h: number }): boolean =>
  x + w / 2 > r.x && x - w / 2 < r.x + r.w && y + BLOCK_H / 2 > r.y && y - BLOCK_H / 2 < r.y + r.h

/** A thing let go with its middle this near open water goes in; any further off, it lies on the ice clear of the water. */
export const INTO_WATER = 22

/** Whether a level thing with its middle at `x`, `y` covers any of a hole's water. Both are measured at points a few units apart, which is finer than either is thick. */
export function overWater(w: number, x: number, y: number, hole: Hole): boolean {
  for (let u = -w / 2; u <= w / 2; u += Math.min(10, w / 2)) for (const v of [-BLOCK_H / 2, 0, BLOCK_H / 2]) if (awayFromHole(hole, x + u, y + v) < 2) return true
  const c = Math.cos(hole.angle), s = Math.sin(hole.angle)
  for (let u = -hole.len / 2; u <= hole.len / 2; u += Math.min(10, hole.len / 2)) for (const v of [-BLOCK_H / 2, 0, BLOCK_H / 2]) if (awayFromBar(x, y, w, hole.x + c * u - s * v, hole.y + s * u + c * v) < 2) return true
  return false
}

/** Whether a thing this wide may lie with its middle here, below the bank: on the stage, clear of the corners' characters and the drift, of the other lying things and of all open water. */
export function mayLie(w: number, x: number, y: number, lying: readonly Rest[], holes: readonly Hole[]): boolean {
  if (x - w / 2 < LYING.margin || x + w / 2 > STAGE.width - LYING.margin || y < LYING.y0 || y > LYING.y1) return false
  if (KEEP_OUT.some((r) => inRect(x, y, w, r))) return false
  if (lying.some((b) => covers(x, y, w, b.x, b.y, widthOf(b), 4))) return false
  return !holes.some((hole) => overWater(w, x, y, hole))
}

/** The free place nearest to `x`, `y` where a thing this wide may lie. The search is the same every time: rings of growing radius, each walked from straight up. */
export function freeSpot(w: number, x: number, y: number, lying: readonly Rest[], holes: readonly Hole[]): { x: number; y: number } {
  const cx = Math.round(Math.max(w / 2 + LYING.margin, Math.min(STAGE.width - w / 2 - LYING.margin, x)))
  const cy = Math.round(Math.max(LYING.y0, Math.min(LYING.y1, y)))
  if (mayLie(w, cx, cy, lying, holes)) return { x: cx, y: cy }
  for (let radius = 12; radius <= 1200; radius += 12) {
    const steps = Math.max(8, Math.round(radius / 6))
    for (let i = 0; i < steps; i++) {
      const turn = (i / steps) * Math.PI * 2 - Math.PI / 2
      const px = Math.round(cx + Math.cos(turn) * radius), py = Math.round(cy + Math.sin(turn) * radius)
      if (mayLie(w, px, py, lying, holes)) return { x: px, y: py }
    }
  }
  return { x: cx, y: cy }
}
