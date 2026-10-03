import { CUP_HOLDS, dishOf, type CupSize } from './forms'
import { CLOTH, type Spot } from './layout'

// The model of the world: the things on the table and the tea in and under
// them. No renderer and no clock: tea moves only when a function here is
// called with an amount, and every drop is accounted for. Tea that leaves a
// cup over its rim goes into the saucer under it, tea that leaves a saucer
// goes onto the cloth, and tea on the cloth lies in a coarse grid of puddles
// until a sponge takes it up.
//
// Amounts are in cupfuls (forms.ts). Functions change the world they are
// given; the saved copy is made by save.ts.

export type ThingKind = 'pot' | 'cup' | 'saucer' | 'spoon' | 'sponge' | 'bowl'
export type GuestId = 'bear' | 'mouse' | 'hen' | 'duckling-a' | 'duckling-b'

export type Thing = {
  /** Stable within a saved table, such as `cup-bear` or `saucer-2`. */
  id: string
  kind: ThingKind
  /** The size of a cup or a saucer; `house` for everything else. */
  size: CupSize
  /** A cup's painted ring, as the amount of tea that reaches it, or null for a cup with no ring and for other things. */
  ring: number | null
  /** The guest a cup belongs to, or null. */
  owner: GuestId | null
  /** Where it stands on the cloth. A thing that stands on another keeps that thing's spot. */
  x: number
  z: number
  /** The thing it stands on or in: a cup on a saucer, a spoon in a cup, a saucer on the stack. */
  on: string | null
  /** Cupfuls of tea in it. */
  tea: number
}

/** The puddle grid: a continuous surface kept as a coarse grid ("Found as left" in the guide). */
export const PUDDLE_COLS = 24
export const PUDDLE_ROWS = 12
/** What one cell of cloth holds before the tea creeps on to the next. */
export const CELL_HOLDS = 0.12

export type World = {
  things: Thing[]
  /** `PUDDLE_COLS * PUDDLE_ROWS` amounts, row by row from the far left. */
  puddles: number[]
}

export function emptyWorld(): World {
  return { things: [], puddles: new Array<number>(PUDDLE_COLS * PUDDLE_ROWS).fill(0) }
}

/** What a thing holds before it runs over. The pot is never empty and never full: it is where tea comes from and may go back to. */
export function holds(thing: Thing): number {
  switch (thing.kind) {
    case 'cup': return CUP_HOLDS[thing.size]
    case 'saucer': return dishOf(thing.size).holds
    case 'bowl': return 4
    case 'sponge': return 0.3
    case 'pot': return Infinity
    case 'spoon': return 0
  }
}

export function thingById(world: World, id: string | null): Thing | undefined {
  return id === null ? undefined : world.things.find((thing) => thing.id === id)
}

/** The cell of cloth under a spot; a spot off the cloth takes the nearest cell. */
export function cellAt(spot: Spot): number {
  const col = Math.floor(((spot.x - CLOTH.minX) / (CLOTH.maxX - CLOTH.minX)) * PUDDLE_COLS)
  const row = Math.floor(((spot.z - CLOTH.minZ) / (CLOTH.maxZ - CLOTH.minZ)) * PUDDLE_ROWS)
  return Math.max(0, Math.min(PUDDLE_ROWS - 1, row)) * PUDDLE_COLS + Math.max(0, Math.min(PUDDLE_COLS - 1, col))
}

/** The middle of a cell, for drawing a puddle and for asking what is near it. */
export function cellSpot(cell: number): Spot {
  const col = cell % PUDDLE_COLS, row = Math.floor(cell / PUDDLE_COLS)
  return {
    x: CLOTH.minX + ((col + 0.5) / PUDDLE_COLS) * (CLOTH.maxX - CLOTH.minX),
    z: CLOTH.minZ + ((row + 0.5) / PUDDLE_ROWS) * (CLOTH.maxZ - CLOTH.minZ),
  }
}

/** Where tea went, for the view and the sounds: nothing here is a verdict. */
export type Flow = {
  /** Tea each thing took, in the order it flowed. */
  into: { id: string; amount: number }[]
  /** Tea that reached the cloth. */
  spilled: number
  /** Tea that ran off the edge of a cloth that could hold no more. */
  lost: number
}

const noFlow = (): Flow => ({ into: [], spilled: 0, lost: 0 })

/**
 * Tea lands on the cloth at a spot. A cell holds a little; the rest creeps to
 * the cells around it, nearest first, so a big spill makes a wide puddle whose
 * size is the amount that ran over.
 */
export function spill(world: World, spot: Spot, amount: number, flow: Flow = noFlow()): Flow {
  let left = Math.max(0, amount)
  if (left <= 0) return flow
  const start = cellAt(spot)
  const startCol = start % PUDDLE_COLS, startRow = Math.floor(start / PUDDLE_COLS)
  const reach = Math.max(PUDDLE_COLS, PUDDLE_ROWS)
  for (let ring = 0; ring <= reach && left > 1e-9; ring++) {
    for (let row = startRow - ring; row <= startRow + ring && left > 1e-9; row++) {
      for (let col = startCol - ring; col <= startCol + ring && left > 1e-9; col++) {
        // Only the cells on the edge of this ring: the ones inside were filled on an earlier ring.
        if (Math.max(Math.abs(row - startRow), Math.abs(col - startCol)) !== ring) continue
        if (row < 0 || row >= PUDDLE_ROWS || col < 0 || col >= PUDDLE_COLS) continue
        const cell = row * PUDDLE_COLS + col
        const took = Math.min(left, Math.max(0, CELL_HOLDS - world.puddles[cell]))
        world.puddles[cell] += took
        flow.spilled += took
        left -= took
      }
    }
  }
  flow.lost += left
  return flow
}

/**
 * Tea is poured into a thing. What it cannot hold runs over: from a cup into
 * the saucer it stands on, and from anything else, or from a cup on the bare
 * cloth, onto the cloth where it stands. Tea poured at the pot goes back in.
 */
export function pourInto(world: World, id: string, amount: number, flow: Flow = noFlow()): Flow {
  const thing = thingById(world, id)
  let left = Math.max(0, amount)
  if (!thing || left <= 0) return flow
  if (thing.kind === 'pot') {
    flow.into.push({ id, amount: left })
    return flow
  }
  const took = Math.min(left, Math.max(0, holds(thing) - thing.tea))
  if (took > 0) {
    thing.tea += took
    flow.into.push({ id, amount: took })
    left -= took
  }
  if (left <= 1e-12) return flow
  const under = thingById(world, thing.on)
  if (thing.kind === 'cup' && under && under.kind === 'saucer') return pourInto(world, under.id, left, flow)
  return spill(world, thing, left, flow)
}

/** One thing is tipped into another: all its tea goes over, and what the other cannot hold runs on as in `pourInto`. */
export function tip(world: World, fromId: string, intoId: string): Flow {
  const from = thingById(world, fromId)
  if (!from || from.kind === 'pot' || fromId === intoId || !thingById(world, intoId)) return noFlow()
  const amount = from.tea
  from.tea = 0
  return pourInto(world, intoId, amount)
}

/** A sponge is rubbed over the cloth: it takes up the tea in the cells within its reach, until it is full. Returns what it took. */
export function wipe(world: World, spongeId: string, spot: Spot, reach = 0.75): number {
  const sponge = thingById(world, spongeId)
  if (!sponge || sponge.kind !== 'sponge') return 0
  let taken = 0
  for (let cell = 0; cell < world.puddles.length; cell++) {
    if (world.puddles[cell] <= 0) continue
    const middle = cellSpot(cell)
    if (Math.hypot(middle.x - spot.x, middle.z - spot.z) > reach) continue
    const took = Math.min(world.puddles[cell], holds(sponge) - sponge.tea - taken)
    if (took <= 0) break
    world.puddles[cell] -= took
    taken += took
  }
  sponge.tea += taken
  return taken
}

/** A sponge is dabbed in a cup or a saucer: it takes a thimbleful, or what is there, or what it has room for. */
export function dab(world: World, spongeId: string, fromId: string): number {
  const sponge = thingById(world, spongeId), from = thingById(world, fromId)
  if (!sponge || sponge.kind !== 'sponge' || !from || from.kind === 'pot') return 0
  const took = Math.max(0, Math.min(CUP_HOLDS.thimble, from.tea, holds(sponge) - sponge.tea))
  from.tea -= took
  sponge.tea += took
  return took
}

/** Tea lying on the cloth, in all. */
export function puddled(world: World): number {
  return world.puddles.reduce((sum, amount) => sum + amount, 0)
}

/** Tea lying on the cloth within `reach` of a spot: what the Mouse minds by her place, and what the Ducklings paddle in. */
export function puddleNear(world: World, spot: Spot, reach: number): number {
  let sum = 0
  for (let cell = 0; cell < world.puddles.length; cell++) {
    if (world.puddles[cell] <= 0) continue
    const middle = cellSpot(cell)
    if (Math.hypot(middle.x - spot.x, middle.z - spot.z) <= reach) sum += world.puddles[cell]
  }
  return sum
}

/** All the tea on the table that is not in the pot: in cups, saucers, the bowl, the sponge and on the cloth. */
export function teaOut(world: World): number {
  return world.things.reduce((sum, thing) => sum + (thing.kind === 'pot' ? 0 : thing.tea), 0) + puddled(world)
}
