import { coverPieces, toadPiece } from './footprints'
import { DIP, FAR_BANK, FOOT_SPOTS, GROUND, LOG_FOOT, NOSE, STEP, THING_R, TUCKS, type P } from './layout'
import { EDGE_SPOTS, PAIR_REACH, TABLE, TABLE_R, TOAD_TABLE, onTable } from './room'
import { toadRest } from './things'
import { createToy, savedOf, type Toy, type ToySave } from './toy'
import { PLACES, THINGS, type ThingId } from './wood'

// Where a thing may lie, and where the toad may sit, so that nothing the
// game sets down lies on anything: the open ground of the wood and the top
// of the table. Pure sums over the model.

/** The spots a thing is set down on by the game outside the two stretches of open ground. */
const FIXED: readonly P[] = [NOSE, DIP, LOG_FOOT, FAR_BANK, STEP, TUCKS.stone, TUCKS.grass, TUCKS.front, ...FOOT_SPOTS]

/** The stretch of open ground nearest a point: 0 is the path at the front, 1 the foot of the jay's tree. */
export function stretchOf(at: P): number {
  let best = 0, nearest = Infinity
  GROUND.forEach((box, index) => {
    const far = Math.hypot(at.x - Math.min(box.x1, Math.max(box.x0, at.x)), at.y - Math.min(box.y1, Math.max(box.y0, at.y)))
    if (far < nearest) { nearest = far; best = index }
  })
  return best
}

/** The nearest point of the open ground to a point. */
export function onGround(at: P): P {
  const box = GROUND[stretchOf(at)]
  return { x: Math.min(box.x1, Math.max(box.x0, at.x)), y: Math.min(box.y1, Math.max(box.y0, at.y)) }
}

/** Where the toad's feet go when he sits at a point of the ground: on the row of that stretch where he is clear of everything. */
export function toadFeetFor(at: P): P {
  return stretchOf(at) === 0 ? { x: Math.min(450, Math.max(366, at.x)), y: 744 } : { x: Math.min(956, Math.max(872, at.x)), y: 566 }
}

/** The things that lie on the ground of the wood, but for one. */
function lying(toy: Toy, but?: ThingId): P[] {
  const points: P[] = []
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (thing !== but && where.at === 'path') points.push({ x: where.x, y: where.y })
  }
  return points
}

/**
 * Whether a thing can lie at a point of the wood: on no other thing, not under the toad, and under no cover where
 * it rests. The worm where it tucks its head in is the one exception: its head is under that cover, which is the
 * point of it, so the stone and the long grass are not in its way there.
 */
export function clearAt(toy: Toy, at: P, but?: ThingId): boolean {
  const tucked = but === 'worm' ? (['stone', 'grass'] as const).find((place) => Math.hypot(TUCKS[place].x - at.x, TUCKS[place].y - at.y) < 0.5) : undefined
  for (const other of lying(toy, but)) if (Math.hypot(other.x - at.x, other.y - at.y) < THING_R * 2) return false
  const toad = toadRest(toy)
  if (!toad.room && toy.toadAt.at !== 'stone') for (const disc of toadPiece(toad.feet).discs) if (Math.hypot(disc.x - at.x, disc.y - at.y) < disc.r + THING_R) return false
  for (const place of PLACES) if (place !== tucked) for (const piece of coverPieces(place, toy.covers[place].open)) for (const disc of piece.discs) if (Math.hypot(disc.x - at.x, disc.y - at.y) < disc.r + THING_R - 2) return false
  return true
}

/** The free point of the open ground nearest a point. */
export function freeSpot(toy: Toy, want: P, but?: ThingId): P {
  const first = onGround(want)
  if (clearAt(toy, first, but)) return first
  let best: P | null = null, nearest = Infinity
  for (const box of GROUND) for (let x = box.x0; x <= box.x1; x += 10) for (let y = box.y0; y <= box.y1; y += 10) {
    const far = Math.hypot(x - want.x, y - want.y)
    if (far < nearest && clearAt(toy, { x, y }, but)) { nearest = far; best = { x, y } }
  }
  return best ?? first
}

/** One of the game's own spots if it is free, and otherwise the free ground nearest it. */
export function settleAt(toy: Toy, spot: P, but?: ThingId): P {
  return clearAt(toy, spot, but) ? { x: spot.x, y: spot.y } : freeSpot(toy, spot, but)
}

/** A point a save may hold for a thing on the ground: one of the game's own spots, or the open ground nearest it. */
export function legal(at: P): P {
  for (const spot of FIXED) if (Math.hypot(spot.x - at.x, spot.y - at.y) < 0.5) return { x: spot.x, y: spot.y }
  return onGround(at)
}

// --- The table ---------------------------------------------------------------------------

function onTheTable(toy: Toy, but?: ThingId): P[] {
  const points: P[] = []
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (thing !== but && where.at === 'table') points.push({ x: where.x, y: where.y })
  }
  return points
}

/** Whether the toad, sitting on the table, is in the way of a point of it. */
export function underToad(toy: Toy, at: P): boolean {
  return toy.toadAt.at === 'table' && Math.abs(at.x - toy.toadAt.x) < 74 + TABLE_R
}

/** Whether a thing can lie by itself at a point of the table: out of reach of every other thing, and not under the toad. */
export function aloneAt(toy: Toy, at: P, but?: ThingId): boolean {
  if (underToad(toy, at)) return false
  for (const other of onTheTable(toy, but)) if (Math.hypot(other.x - at.x, other.y - at.y) <= PAIR_REACH + 2) return false
  return true
}

/** The point of the table nearest a point where a thing can lie by itself, or null when the table is full. */
export function freeTable(toy: Toy, want: P, but?: ThingId): P | null {
  let best: P | null = null, nearest = Infinity
  for (let x = TABLE.x0; x <= TABLE.x1; x += 8) for (let y = TABLE.y0; y <= TABLE.y1; y += 8) {
    const far = Math.hypot(x - want.x, y - want.y)
    if (far < nearest && aloneAt(toy, { x, y }, but)) { nearest = far; best = { x, y } }
  }
  return best
}

/** Where a thing sent in through the door lands: the first free spot along the near edge of the table. */
export function edgeSpot(toy: Toy, but?: ThingId): P | null {
  for (const spot of EDGE_SPOTS) if (aloneAt(toy, spot, but)) return { x: spot.x, y: spot.y }
  return freeTable(toy, EDGE_SPOTS[0], but)
}

/** Where the toad's feet go on the table when he sits where a thing came from. */
export function toadOnTable(at: P): P {
  return { x: Math.min(TOAD_TABLE.x1, Math.max(TOAD_TABLE.x0, at.x)), y: TOAD_TABLE.y }
}

// --- A save that was read ------------------------------------------------------------------

/**
 * A save as the game itself could have written it. A save is untrusted: its fields are of the right kind once
 * read (save.ts), and here every point it holds is put where a thing may lie: on the open ground or one of the
 * game's own spots, on the table's top, on nothing else that lies there, and the toad on a row he can sit on.
 * A save the game wrote comes back as it was.
 */
export function legalised(saved: ToySave): ToySave {
  const toy = createToy(saved, 1)
  if (toy.toadAt.at === 'path') { const feet = toadFeetFor(toy.toadAt); toy.toadAt = { at: 'path', x: feet.x, y: feet.y } }
  if (toy.toadAt.at === 'table') { const feet = toadOnTable(toy.toadAt); toy.toadAt = { at: 'table', x: feet.x, y: feet.y } }
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (where.at === 'path') {
      const spot = legal(where), free = clearAt(toy, spot, thing) ? spot : freeSpot(toy, spot, thing)
      toy.things[thing] = { at: 'path', x: free.x, y: free.y }
    }
    if (where.at === 'table') {
      const spot = onTable(where)
      // On another thing's very point it would be drawn through it: it moves to the nearest free point of the table.
      const taken = THINGS.some((other) => { const there = toy.things[other]; return other !== thing && THINGS.indexOf(other) < THINGS.indexOf(thing) && there.at === 'table' && Math.hypot(there.x - spot.x, there.y - spot.y) < TABLE_R })
      const free = taken || underToad(toy, spot) ? freeTable(toy, spot, thing) : spot
      toy.things[thing] = free ? { at: 'table', x: free.x, y: free.y } : { at: 'home' }
    }
  }
  return savedOf(toy)
}
