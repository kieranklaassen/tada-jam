import { EMPTY_MOUTH, KIND, heightOf, widthOf, type Kind } from './kinds'
import { ENTRY, STREET } from './places'
import { makeRng, type Rng } from './rng'
import { routeIn, type Block } from './route'
import { hiddenBy, hidesGate, seenApart, seenClear } from './seen'

// The street: its bounds, what stands on it, and where. No renderer here.
// x runs along the street, left to right; z runs across it, from the far kerb
// (negative, where the bystanders stand) to the near one.

export { ENTRY, STREET }

/** A thing or a stack standing on the street: its parts from the bottom up, and where it stands. */
export type Standing = { parts: Kind[]; x: number; z: number }

type Hole = { x: number; z: number; mouth: number }
type Spot = { x: number; z: number }

/** The things of a street, by how full it is. The ids are the ladder's (config.ts). */
export const STOCK: Readonly<Record<string, readonly Kind[]>> = {
  few: ['pie', 'pie', 'pie', 'hat', 'dog', 'balloon', 'balloon', 'tuba', 'drummer'],
  some: ['pie', 'pie', 'pie', 'hat', 'dog', 'dog', 'balloon', 'balloon', 'tuba', 'drummer'],
  many: ['pie', 'pie', 'pie', 'pie', 'hat', 'dog', 'dog', 'dog', 'balloon', 'balloon', 'tuba', 'tuba', 'drummer'],
}

export function stockOf(position: string): readonly Kind[] {
  return STOCK[position] ?? STOCK.few
}

/** Where the hole lies on a street nobody has played on yet. */
export const HOLE_START = { x: 6.05, z: 1.6 } as const

/** Room left between two things, and between a thing and the hole's mouth. */
export const GAP = 0.25
/** The strip of street along the far kerb, under the bystanders: nothing is stood or set down on it. */
export const STRIP = 0.55
/** Room left round the place where the things come in, so the widest of them can stand there. */
const ENTRY_ROOM = 1.25

function inside(x: number, z: number, width: number): boolean {
  return x >= STREET.x0 + width / 2 && x <= STREET.x1 - width / 2 && z >= STREET.z0 + width / 2 + STRIP && z <= STREET.z1 - width / 4
}

function apart(x: number, z: number, width: number, others: readonly Standing[], gap: number): boolean {
  for (const other of others) {
    if (Math.hypot(other.x - x, other.z - z) < (widthOf(other.parts) + width) / 2 + gap) return false
  }
  return true
}

/** Whether a thing this wide goes in a straight line from (ax, az) to (bx, bz) without touching any of `others` where they stand. */
export function wayClear(ax: number, az: number, bx: number, bz: number, width: number, others: readonly Standing[]): boolean {
  const wx = bx - ax, wz = bz - az, long = wx * wx + wz * wz
  for (const other of others) {
    const t = long > 1e-9 ? Math.max(0, Math.min(1, ((other.x - ax) * wx + (other.z - az) * wz) / long)) : 0
    if (Math.hypot(ax + wx * t - other.x, az + wz * t - other.z) < (widthOf(other.parts) + width) / 2) return false
  }
  return true
}

function offHole(x: number, z: number, width: number, hole: Hole | null): boolean {
  return !hole || Math.hypot(x - hole.x, z - hole.z) >= (hole.mouth + width) / 2 + GAP
}

/** Whether a thing this wide stands at (x, z) inside the street, off the far strip, touching nothing and clear of the hole's mouth. */
export function standsClear(x: number, z: number, width: number, street: readonly Standing[], hole: Hole | null): boolean {
  return inside(x, z, width) && apart(x, z, width, street, GAP) && offHole(x, z, width, hole)
}

function round(value: number): number {
  // Never minus nought, which plain JSON does not keep.
  return Math.round(value * 100) / 100 + 0
}

/** The nearest place to (x, z) that `ok` allows, looking outward ring by ring, or null when the whole street has none. */
function nearest(x: number, z: number, ok: (x: number, z: number) => boolean): Spot | null {
  const first = { x: round(x), z: round(z) }
  if (ok(first.x, first.z)) return first
  for (let ring = 1; ring <= 64; ring++) {
    const radius = ring * 0.25, steps = 8 + ring * 4
    for (let step = 0; step < steps; step++) {
      // Start toward the near kerb and the right, so a stack lands in view and not behind the hole.
      const angle = (step / steps) * Math.PI * 2 + Math.PI / 4
      const px = round(x + Math.cos(angle) * radius), pz = round(z + Math.sin(angle) * radius)
      if (ok(px, pz)) return { x: px, z: pz }
    }
  }
  return null
}

/** The same over the whole street a hand's width at a time, for a street so full that the rings step over its last free place. */
function combed(x: number, z: number, ok: (x: number, z: number) => boolean): Spot | null {
  let best: Spot | null = null, least = Infinity
  for (let px = STREET.x0; px <= STREET.x1; px += 0.1) {
    for (let pz = STREET.z0; pz <= STREET.z1; pz += 0.1) {
      const far = Math.hypot(px - x, pz - z)
      if (far < least && ok(round(px), round(pz))) { least = far; best = { x: round(px), z: round(pz) } }
    }
  }
  return best
}

/**
 * The nearest place to (x, z) where a thing of this width stands clear of everything on the street and of the
 * hole's mouth, inside the street. On a street with no such place it is the asked place, kept inside.
 */
export function freeSpot(x: number, z: number, width: number, street: readonly Standing[], hole: Hole | null): Spot {
  return nearest(x, z, (px, pz) => standsClear(px, pz, width, street, hole))
    ?? { x: round(Math.max(STREET.x0 + width / 2, Math.min(STREET.x1 - width / 2, x))), z: round(Math.max(STREET.z0 + width / 2 + STRIP, Math.min(STREET.z1 - width / 4, z))) }
}

/** How many layouts are tried for one street before the one with the fewest things walled off is taken. */
const LAYOUTS = 8

/**
 * Lays a street out from a seed: the same seed and set give the same street. The list is in the order the
 * things come in from the gate, biggest first (scenes.ts). The big ones stand in a row along the far kerb and
 * the small ones in a row along the near kerb, each row filled from the end furthest from the gate, so every
 * thing has a way to its spot past those that came before it. The pies come last and stand nearest the hole,
 * which lies at the gate end of the near row. Nothing stands on or against the hole, nothing touches another
 * thing, and nothing stands where the things come in.
 */
export function layStreet(position: string, seed: number, hole: Hole = { ...HOLE_START, mouth: EMPTY_MOUTH }): Standing[] {
  let best: Standing[] = [], least = Infinity
  for (let layout = 0; layout < LAYOUTS && least > 0; layout++) {
    const street = layOnce(position, makeRng((seed + layout * 7919) >>> 0), hole)
    const walled = walledOff(street, hole)
    if (walled < least) { best = street; least = walled }
  }
  return best
}

/** How many things of a street have no way in from the gate, in the order they come. */
export function walledOff(street: readonly Standing[], hole: Hole): number {
  const standing: Block[] = [{ x: hole.x, z: hole.z, wide: hole.mouth }]
  let walled = 0
  for (const thing of street) {
    const wide = widthOf(thing.parts)
    if (routeIn(thing, wide, standing).over) walled += 1
    standing.push({ x: thing.x, z: thing.z, wide })
  }
  return walled
}

/** A thing this wide or wider stands in the far row, where its height hides nothing a finger wants. */
const BIG = 1.7
/** How far along the street the far row may reach: short of where the things come in. */
const FAR_END = ENTRY.x - 1.0

/** Shares `room` out over `slots` gaps by chance. */
function shares(room: number, slots: number, rng: Rng): number[] {
  const parts = Array.from({ length: slots }, () => 0.2 + rng.next())
  const sum = parts.reduce((total, part) => total + part, 0)
  return parts.map((part) => (Math.max(0, room) * part) / sum)
}

function layOnce(position: string, rng: Rng, hole: Hole): Standing[] {
  // Widest first: the big ones come in first.
  const kinds = [...stockOf(position)].sort((a, b) => KIND[b].width - KIND[a].width)
  const farRoom = FAR_END - STREET.x0
  const far: Kind[] = [], near: Kind[] = []
  let farLong = 0
  for (const kind of kinds) {
    const width = KIND[kind].width
    if (width >= BIG && farLong + width <= farRoom) { far.push(kind); farLong += width + GAP } else near.push(kind)
  }
  const nearRoom = Math.min(STREET.x1, hole.x - hole.mouth / 2 - GAP) - STREET.x0
  const spots = new Map<number, Spot>()
  const order = kinds.map((kind, index) => ({ kind, index }))
  const take = (row: Kind[]): number[] => row.map((kind) => { const at = order.findIndex((one) => one.kind === kind); return order.splice(at, 1)[0].index })
  const farIndex = take(far), nearIndex = take(near)
  // The far row, from the end away from the gate, with what room is over shared out between the things.
  let slack = shares(farRoom - (farLong - GAP), far.length + 1, rng), x = STREET.x0
  far.forEach((kind, at) => {
    const width = KIND[kind].width
    x += slack[at] + width / 2
    spots.set(farIndex[at], { x: round(x), z: round(STREET.z0 + STRIP + width / 2 + rng.next() * 0.2) })
    x += width / 2 + GAP
  })
  // The near row ends short of the hole. Pies stand two deep where the row would be too long, and here and there by chance.
  const columns: Kind[][] = near.map((kind) => [kind])
  const long = (): number => columns.reduce((total, column) => total + KIND[column[0]].width, 0) + GAP * (columns.length - 1)
  const pair = (): boolean => {
    for (let at = columns.length - 1; at > 0; at--) {
      if (columns[at].length === 1 && columns[at][0] === 'pie' && columns[at - 1].length === 1 && columns[at - 1][0] === 'pie') { columns[at - 1].push('pie'); columns.splice(at, 1); return true }
    }
    return false
  }
  while (long() > nearRoom && pair()) { /* two deep until the row fits */ }
  if (rng.next() < 0.35) pair()
  // The last of the row stands right beside the hole: the first thing an empty hole takes is a short glide away.
  slack = shares(nearRoom - long(), columns.length, rng)
  x = STREET.x0
  let at = 0
  columns.forEach((column, slot) => {
    const width = KIND[column[0]].width
    x += slack[slot] + width / 2
    column.forEach((_kind, deep) => {
      // The second pie of a column stands in front of the first, toward the middle of the street.
      const z = deep === 0 ? STREET.z1 - width / 4 - rng.next() * 0.15 : STREET.z1 - width / 4 - width - GAP - 0.05
      spots.set(nearIndex[at], { x: round(x + (deep === 0 ? 0 : (rng.next() - 0.5) * 0.3)), z: round(z) })
      at += 1
    })
    x += width / 2 + GAP
  })
  // In the order they come. A spot that turned out not to be clear is moved to the nearest that is.
  const street: Standing[] = []
  kinds.forEach((kind, index) => {
    const spot = spots.get(index) ?? { x: 0, z: 0 }, width = KIND[kind].width
    const ok = (px: number, pz: number): boolean => standsClear(px, pz, width, street, hole) && offEntry(px, pz, width)
    street.push({ parts: [kind], ...(nearest(spot.x, spot.z, ok) ?? freeSpot(spot.x, spot.z, width, street, hole)) })
  })
  return street
}

function offEntry(x: number, z: number, width: number): boolean {
  return Math.hypot(x - ENTRY.x, z - ENTRY.z) >= width / 2 + ENTRY_ROOM
}

/** The room left between two things on a street too full for `GAP`. */
export const CLOSE = 0.05
/** A thing that steps aside goes over a thing alone where it has to, the drummer at most; a stack taller than that it goes round where it can. */
const TOWER = 3.05

/** How far a set-down stack means to walk from where it drops. */
const WALK = 1.4

/**
 * Where a stack let down from the breath drops, and where it then stands. `clear` is false only on a street with
 * no place where it covers nothing: it then stands where the fewest things must step out, and `hides` are those
 * things: the ones that stand where it comes down, have their middle behind it there, or stand before its own.
 */
export type SetDown = { drop: Spot; spot: Spot; clear: boolean; hides: Standing[] }

/** Every place within reach of (x, z) that `ok` allows, the ones `cost` likes best first; of equals, the nearest first. */
function cheapest(x: number, z: number, ok: (x: number, z: number) => boolean, cost: (x: number, z: number) => number): Spot[] {
  const found: { spot: Spot; costs: number; far: number }[] = []
  const tried = (px: number, pz: number, far: number): void => {
    if (ok(px, pz)) found.push({ spot: { x: px, z: pz }, costs: cost(px, pz), far })
  }
  tried(round(x), round(z), 0)
  for (let ring = 1; ring <= 64; ring++) {
    const radius = ring * 0.25, steps = 8 + ring * 4
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * Math.PI * 2 + Math.PI / 4
      tried(round(x + Math.cos(angle) * radius), round(z + Math.sin(angle) * radius), radius)
    }
  }
  return found.sort((a, b) => a.costs - b.costs || a.far - b.far).map((one) => one.spot)
}

/**
 * A stack is let down at `from` and the hole has gone the way of (`awayX`, `awayZ`). It drops onto the nearest
 * place clear of every thing, the hole and the far strip. From there a stack of two or more walks a few steps,
 * away from the hole, and a thing alone stays, unless where it dropped it covers another thing, the gate keeper or
 * the gate as the child sees them: then it walks to the nearest place where it covers none of them. The way there
 * is clear too. On a street with no such place it comes down where the fewest things are in its way or behind it,
 * never before the gate keeper or the gate where it can help it, and each of those things steps out (`stepOut`).
 */
export function setDown(parts: readonly Kind[], from: Spot, awayX: number, awayZ: number, street: readonly Standing[], hole: Hole | null): SetDown {
  const width = widthOf(parts)
  // It hops to where it drops over nothing, if the street has such a place near.
  const drop = nearest(from.x, from.z, (x, z) => standsClear(x, z, width, street, hole) && wayClear(from.x, from.z, x, z, width, street)) ?? freeSpot(from.x, from.z, width, street, hole)
  const far = Math.hypot(awayX, awayZ)
  const aim = parts.length > 1 && far > 1e-6 ? { x: drop.x - (awayX / far) * WALK, z: drop.z - (awayZ / far) * WALK } : drop
  const walkable = (x: number, z: number): boolean => {
    const long = Math.hypot(x - drop.x, z - drop.z), steps = Math.ceil(long / 0.3)
    for (let step = 1; step < steps; step++) {
      const t = step / steps
      if (!apart(drop.x + (x - drop.x) * t, drop.z + (z - drop.z) * t, width, street, 0.05)) return false
    }
    return true
  }
  const stands = (x: number, z: number): boolean => standsClear(x, z, width, street, hole) && walkable(x, z)
  const spot = nearest(aim.x, aim.z, (x, z) => stands(x, z) && seenApart(parts, x, z, street)) ?? nearest(aim.x, aim.z, (x, z) => stands(x, z) && seenClear(parts, x, z, street))
  if (spot) return { drop, spot, clear: true, hides: [] }
  // Hemmed in where it dropped, with no way on foot to a place where it covers nothing: it comes down straight onto the nearest such place.
  const lands = (x: number, z: number): boolean => standsClear(x, z, width, street, hole) && seenClear(parts, x, z, street)
  const open = nearest(from.x, from.z, (x, z) => lands(x, z) && wayClear(from.x, from.z, x, z, width, street)) ?? nearest(from.x, from.z, lands)
  if (open) return { drop: open, spot: open, clear: true, hides: [] }
  // No such place on the whole street. It comes down, inside the street and off the mouth, where the least has to step
  // out of its way or out from behind it: a wide thing counts for more than a narrow one, since it is harder to find a
  // place for, and the gate keeper and the gate count for most, since they cannot step.
  const moved = (x: number, z: number): Standing[] => {
    const under = street.filter((other) => !apart(x, z, width, [other], GAP))
    const hidden = hiddenBy(parts, x, z, street.filter((other) => !under.includes(other)))
    return [...under, ...hidden.behind, ...hidden.before]
  }
  // Whether each of them, one after the other, has a place to step to.
  const allStep = (at: Spot): boolean => {
    const stack = { parts: [...parts], ...at }, hangs = { parts: [...parts], ...from }, now = [...street]
    for (const thing of moved(at.x, at.z)) {
      const spot = stepOut(thing, stack, now.filter((other) => other !== thing), hole, hangs)
      if (!spot) return false
      now[now.indexOf(thing)] = { parts: thing.parts, ...spot }
    }
    return true
  }
  const places = cheapest(from.x, from.z, (x, z) => inside(x, z, width) && offHole(x, z, width, hole), (x, z) => moved(x, z).reduce((sum, thing) => sum + widthOf(thing.parts), hidesGate(parts, x, z) ? 100 : 0))
  const least = places.slice(0, 40).find(allStep) ?? places[0] ?? drop
  return { drop: least, spot: least, clear: false, hides: moved(least.x, least.z) }
}

/**
 * Where a thing goes that stands where a stack is coming down (`stack`), that the stack hides, or that hides the stack: the nearest place where
 * it stands clear of everything and is in nobody's way in the picture; failing that, the nearest where it and the
 * stack leave each other's middle in view. The stack still hangs where it rode (`hangs`) while the thing steps: the
 * place is clear of it there too, and of the places the street has, one the thing reaches without going over anything
 * comes first. Null on a street with no room at all.
 */
export function stepOut(thing: Standing, stack: Standing, others: readonly Standing[], hole: Hole | null, hangs: Standing | null = null): Spot | null {
  const width = widthOf(thing.parts), around = [...others, stack], now = hangs ? [...others, hangs] : others
  const stands = (x: number, z: number): boolean => standsClear(x, z, width, around, hole) && (!hangs || apart(x, z, width, [hangs], 0))
  const open = (x: number, z: number): boolean => stands(x, z) && seenClear(thing.parts, x, z, around)
  const beside = (x: number, z: number): boolean => stands(x, z) && seenClear(thing.parts, x, z, [stack])
  const walked = (x: number, z: number): boolean => wayClear(thing.x, thing.z, x, z, width, now)
  // Failing a way on the ground, one past the hanging stack and every other tower: it goes over the low things only.
  const towers = now.filter((other) => other === hangs || heightOf(other.parts) > TOWER)
  const past = (x: number, z: number): boolean => wayClear(thing.x, thing.z, x, z, width, towers)
  return nearest(thing.x, thing.z, (x, z) => open(x, z) && walked(x, z)) ?? nearest(thing.x, thing.z, (x, z) => open(x, z) && past(x, z)) ?? nearest(thing.x, thing.z, open) ?? combed(thing.x, thing.z, open)
    ?? nearest(thing.x, thing.z, (x, z) => beside(x, z) && past(x, z)) ?? nearest(thing.x, thing.z, beside) ?? combed(thing.x, thing.z, beside)
}

/**
 * Where a thing goes that stands where a stack is about to hang on the hole's breath (`column`): the nearest place
 * straight away from it where the thing stands clear of the stack, of every other thing and of the mouth, and
 * covers nothing if the street has such a place. What rides there already (`rode`) is narrower and stays: of the
 * places the street has, one the thing reaches without going over it or over anything else comes first. A thing the
 * mouth cannot take may keep its edge over the lip by `bite`. On a street with no clear place it stands close against
 * the others. Null on a street with no room at all.
 */
export function aside(thing: Standing, column: Standing, others: readonly Standing[], hole: Hole | null, rode: Standing | null = null, bite = 0): Spot | null {
  const width = widthOf(thing.parts), need = (width + widthOf(column.parts)) / 2 + GAP + 0.02
  const dx = thing.x - column.x, dz = thing.z - column.z, far = Math.hypot(dx, dz)
  const from = far > 1e-6 ? { x: column.x + (dx / far) * need, z: column.z + (dz / far) * need } : { x: column.x + need, z: column.z }
  const around = [...others, column], now = rode ? [...others, rode] : others
  // A thing the mouth cannot take may keep its edge over the lip by `bite`, as it does when the hole stops at its foot; any other stands clear of the mouth.
  const offMouth = (x: number, z: number): boolean => !hole || Math.hypot(x - hole.x, z - hole.z) >= (hole.mouth + width) / 2 + (bite > 0 ? -bite : GAP)
  const stands = (x: number, z: number): boolean => inside(x, z, width) && apart(x, z, width, around, GAP) && offMouth(x, z)
  const open = (x: number, z: number): boolean => stands(x, z) && seenClear(thing.parts, x, z, others)
  const walked = (x: number, z: number): boolean => wayClear(thing.x, thing.z, x, z, width, now)
  const towers = now.filter((other) => other === rode || heightOf(other.parts) > TOWER)
  const past = (x: number, z: number): boolean => wayClear(thing.x, thing.z, x, z, width, towers)
  // On a street with no such place it stands close against the others.
  const close = (x: number, z: number): boolean => inside(x, z, width) && apart(x, z, width, around, CLOSE) && offMouth(x, z)
  return nearest(from.x, from.z, (x, z) => open(x, z) && walked(x, z)) ?? nearest(from.x, from.z, (x, z) => open(x, z) && past(x, z)) ?? nearest(from.x, from.z, open)
    ?? nearest(from.x, from.z, (x, z) => stands(x, z) && past(x, z)) ?? nearest(from.x, from.z, stands)
    ?? combed(from.x, from.z, stands) ?? nearest(from.x, from.z, close) ?? combed(from.x, from.z, close)
}

/** Keeps the hole on the street: its middle stays far enough inside that the mouth hangs over a kerb by very little. */
export function clampHole(x: number, z: number, mouth: number): { x: number; z: number } {
  const reach = Math.max(0, mouth / 2 - 0.25)
  return {
    x: Math.max(STREET.x0 + reach, Math.min(STREET.x1 - reach, x)),
    z: Math.max(STREET.z0 + reach, Math.min(STREET.z1 - reach, z)),
  }
}
