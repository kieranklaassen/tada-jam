import { POT, bowlOf, dishOf } from './forms'
import { CLOTH, POT_ROW_Z, ROW_FRONT, TRAY, onCloth, type Spot } from './layout'
import { pourInto, spill, type Flow, type Thing, type World } from './world'

// The toy: a pot that pours for as long as it is held. No renderer and no
// clock of its own: `step` is given the seconds to play. The finger is on the
// pot and never on the cup, so the tea in the cup can be read through the
// whole pour.
//
// - A press answers at once: one drop leaves the spout in the same step.
// - While held, the pot tips and the stream thickens from a dribble to a
//   steady rope over the first half second, then stays steady. Nothing ever
//   speeds up after that: a house cup takes about four seconds, so the child
//   judges an amount, not an instant.
// - On the lift the pot rights itself, and one last drop falls a moment later.
// - The pot stands beside whatever it pours on, always on the same side, with
//   its spout over it. A tap on a cup calls it there in one hop.

export const POUR = {
  /** Cupfuls a second as a hold begins, and once the stream is steady. */
  dribble: 0.035,
  steady: 0.27,
  /** Seconds from dribble to steady. */
  rampSeconds: 0.55,
  /** The drop that answers every press, and the one that falls after a stream. */
  drop: 0.012,
  lastDrop: 0.004,
  lastDropAfter: 0.26,
  /** Seconds for the pot to tip, and to right itself. It tips slowly enough that a tap is over before the stream starts: a tap gives its one drop and no more. */
  tipSeconds: 0.36,
  rightSeconds: 0.22,
  /** The stream runs once the pot has tipped this far. */
  runsFrom: 0.55,
  /** Seconds a hop to another cup takes. */
  hopSeconds: 0.34,
  /** The furthest the tea can fly, from a pot that had to stand further off on a full table. */
  farthest: 5.6,
  /** How much nearer than a pour's reach it stands when there is room nowhere else but in the guests' row. */
  nearer: 0.85,
  /** How far in front of the pot's middle the tea lands. The spout stops short of that, so it never hangs over the cup and hides the tea: the stream arcs the rest of the way. */
  reach: 2.75,
} as const

/** Where the pot stands to pour on a spot: to its right and a little nearer the child, so neither pot nor hand covers the cup. */
const STATION = { x: 2.332, z: 1.4575 } as const

export type Pot = {
  /** Where its foot stands on the cloth. */
  x: number
  z: number
  /** The way its spout points, in radians: 0 is toward +x, a quarter turn is toward the child. */
  heading: number
  /** The thing under its spout, or null when it pours on the bare cloth. */
  over: string | null
  held: boolean
  /** It is in the child's hand, lifted clear of everything on the table. */
  carried: boolean
  /** A guest is drinking from the spout: what is poured goes into the guest and not onto the table. */
  gulped: boolean
  /** How far in front of its middle the tea lands from where it stands now: `POUR.reach` beside a cup, more where it had to stand further off. */
  reach: number
  /** Seconds the stream has been running in this hold. */
  running: number
  /** 0 upright, 1 tipped to pour. */
  tilt: number
  /** Cupfuls a second leaving the spout now. */
  flow: number
  /** Seconds until the last drop of a hold falls, or null. */
  dripIn: number | null
  /** A hop in progress: where from, where to, and how far along (0 to 1). */
  hop: { fromX: number; fromZ: number; toX: number; toZ: number; fromHeading: number; toHeading: number; t: number; lifted?: number; wait?: number } | null
}

export type PourEvent =
  | { type: 'drop'; amount: number; flow: Flow }
  | { type: 'stream-start' }
  | { type: 'stream'; amount: number; flow: Flow }
  | { type: 'stream-stop' }
  | { type: 'hop' }
  | { type: 'land' }

export function restingPot(at: Spot, heading = Math.PI): Pot {
  return { x: at.x, z: at.z, heading, over: null, held: false, carried: false, gulped: false, reach: POUR.reach, running: 0, tilt: 0, flow: 0, dripIn: null, hop: null }
}

/** The spot on the cloth under the spout when the pot is tipped. */
export function spoutSpot(pot: Pot): Spot {
  return { x: pot.x + Math.cos(pot.heading) * pot.reach, z: pot.z + Math.sin(pot.heading) * pot.reach }
}

/** How far from its middle a thing reaches over the cloth: what the pot must stand clear of. */
export function footprint(thing: Thing): number {
  if (thing.kind === 'saucer') return dishOf(thing.size).rimR
  if (thing.kind === 'cup') return bowlOf(thing.size).rimR * 1.05
  if (thing.kind === 'bowl') return 0.92
  if (thing.kind === 'pot') return POT.bellyR
  // A spoon is narrow; it lies with its handle toward the child.
  if (thing.kind === 'spoon') return 0.3
  // The sponge is a block: this is out to its corners.
  return 0.58
}

/** A round patch of cloth that something covers. */
/** A round patch that is kept clear. `air` marks room above the cloth that only something as tall as the pot is in the way of (where a guest lifts its cup to drink): a spout may reach across it. */
export type Circle = { x: number; z: number; r: number; air?: boolean }

/** What a thing covers on the cloth: one circle for a round thing, a second for a cup's ear, which is on the child's side, and three along a spoon, which lies with its handle toward the child and a little to the left. */
export function shapeOf(thing: Thing, at: Spot = thing): Circle[] {
  if (thing.kind === 'cup') return [{ x: at.x, z: at.z, r: footprint(thing) }, { x: at.x, z: at.z + bowlOf(thing.size).rimR * 1.12, r: bowlOf(thing.size).rimR * 0.36 }]
  if (thing.kind !== 'spoon') return [{ x: at.x, z: at.z, r: footprint(thing) }]
  return [{ x: at.x, z: at.z, r: 0.22 }, { x: at.x - 0.12, z: at.z + 0.5, r: 0.15 }, { x: at.x - 0.24, z: at.z + 0.95, r: 0.12 }]
}

const apart = (a: Circle, b: Circle, gap = 0) => Math.hypot(a.x - b.x, a.z - b.z) >= a.r + b.r + gap

/** How far apart two things are, edge to edge, by what each covers; negative when one stands in the other. */
export function gapBetween(a: Thing, b: Thing): number {
  let least = Infinity
  for (const one of shapeOf(a)) for (const other of shapeOf(b)) least = Math.min(least, Math.hypot(one.x - other.x, one.z - other.z) - one.r - other.r)
  return least
}

/**
 * Nothing on the table stands within `radius` of the spot. A thing that
 * stands on another, or that a guest holds, is no obstacle of its own.
 * `extra` holds whatever else must be kept clear of: the guests at their
 * seats.
 */
export function clearOf(world: Pick<World, 'things'>, spot: Spot, radius: number, extra: readonly Circle[] = []): boolean {
  const here = { x: spot.x, z: spot.z, r: radius }
  return extra.every((circle) => apart(here, circle))
    && world.things.every((thing) => thing.kind === 'pot' || thing.on !== null || thing.heldBy !== null || shapeOf(thing).every((circle) => apart(here, circle)))
}

/** The room the pot's belly needs round its middle, with a finger's width to spare. */
const POT_ROOM = POT.bellyR + 0.06
/** The pot stands on the cloth, a belly's width in from its edges. */
const onTable = (spot: Spot) => spot.x <= CLOTH.maxX - 1.1 + 1e-9 && spot.x >= CLOTH.minX + 1.1 - 1e-9 && spot.z <= CLOTH.maxZ - 0.9 + 1e-9 && spot.z >= CLOTH.minZ + 0.9 - 1e-9
/** How far in front of the pot's middle its spout runs when it is tipped, from the belly to the tip: none of it may be in a guest. */
const SPOUT = [1.2, 1.6, 2.05] as const
/** A station is good when the pot stands in nothing there and its tipped spout is in no guest but the one it pours for. */
const stands = (world: Pick<World, 'things'>, station: { x: number; z: number; heading: number }, extra: readonly Circle[], target: Spot) => {
  const spoutClear = (circle: Circle, gap: number) => SPOUT.every((far) => Math.hypot(station.x + Math.cos(station.heading) * far - circle.x, station.z + Math.sin(station.heading) * far - circle.z) >= circle.r + gap)
  return clearOf(world, station, POT_ROOM, extra)
    && extra.every((circle) => circle.air === true || Math.hypot(target.x - circle.x, target.z - circle.z) < circle.r || spoutClear(circle, 0.08))
    // Nor does the tipped spout dip into a cup or the bowl that stands beside the line of the pour: only into the one it pours for.
    && world.things.every((thing) => (thing.kind !== 'cup' && thing.kind !== 'bowl') || thing.heldBy !== null || Math.hypot(target.x - thing.x, target.z - thing.z) < footprint(thing) || spoutClear({ x: thing.x, z: thing.z, r: footprint(thing) }, 0.1))
}

/** `short` marks a place it cannot pour on the spot from: there was none, and this is only the nearest free room. */
export type Station = { x: number; z: number; heading: number; reach: number; short?: true }

/**
 * Where the pot stands, which way it faces and how far its tea flies, to pour
 * on a spot. It stands to the right and nearer the child, a pour's reach
 * away, when that spot is free. On a full table it stands in the nearest
 * free room it can pour from, further off if it must: the stream then arcs
 * further. With a world given it never stands in another thing, nor in a
 * guest, and with or without one never in the guests' row.
 */
export function stationFor(target: Spot, world?: World, extra: readonly Circle[] = [], standOff: number = POUR.reach): Station {
  // Beside the spot and nearer the child, to its right for choice: the pot is then in front of everything, where a finger finds it.
  const sides: [number, number][] = [[1, 1], [-1, 1]]
  const beside = ([side, near]: [number, number]): Station => {
    const heading = Math.atan2(-near * STATION.z, -side * STATION.x)
    return { x: target.x - Math.cos(heading) * standOff, z: target.z - Math.sin(heading) * standOff, heading, reach: standOff }
  }
  // Never in the guests' row: the pot is the one thing the child must always find, in front of everybody.
  const inRow = (station: Spot) => station.z - POT.bellyR < ROW_FRONT
  const classic = sides.map(beside).filter(onTable).filter((station) => !inRow(station))
  const table = world ?? { things: [] }
  const free = classic.find((station) => stands(table, station, extra, target))
  if (free) return free
  // No room beside it: the nearest room it can pour from, looked for over the whole cloth, nearer the child for choice.
  // And if there is none at a pour's reach or further, nearer than it likes: its spout is then right over the spot.
  // The second search looks closer, at every half step.
  for (const [least, step] of [[standOff - 0.3, 0.3], [standOff - POUR.nearer, 0.15]]) {
    let best: Station | null = null, bestCost = Infinity
    for (let z = CLOTH.minZ + 0.9; z <= CLOTH.maxZ - 0.9 + 1e-9; z += step) {
      for (let x = CLOTH.minX + 1.1; x <= CLOTH.maxX - 1.1 + 1e-9; x += step) {
        const reach = Math.hypot(target.x - x, target.z - z)
        if (inRow({ x, z }) || reach < least || reach > POUR.farthest || !stands(table, { x, z, heading: Math.atan2(target.z - z, target.x - x) }, extra, target)) continue
        // Further back than the spot is a poor place.
        const cost = Math.abs(reach - standOff) + (z < target.z ? 1.2 : 0) + (x < target.x ? 0.1 : 0)
        if (cost < bestCost) {
          best = { x, z, heading: Math.atan2(target.z - z, target.x - x), reach }
          bestCost = cost
        }
      }
    }
    if (best) return best
  }
  // No room anywhere it could pour from: the nearest free room to where it would have stood, facing the spot. Its
  // spout is then over whatever it is over, which is asked again when it lands.
  if (world) {
    const room = roomFor(world, classic[0] ?? beside(sides[0]), extra)
    return { x: room.x, z: room.z, heading: Math.atan2(target.z - room.z, target.x - room.x), reach: standOff, short: true }
  }
  return classic[0] ?? beside(sides[0])
}

/** The nearest spot to `spot` where the pot stands in nothing: the spot itself if it is free, else the first free one on widening rings round it, starting on the child's side. */
export function roomFor(world: World, spot: Spot, extra: readonly Circle[] = []): Spot {
  const inFront = (at: Spot) => ({ x: at.x, z: Math.max(POT_ROW_Z, at.z) })
  const want = inFront(onCloth(spot, 1.0))
  for (let ring = 0; ring <= 60; ring++) {
    const radius = ring * 0.2, around = ring === 0 ? 1 : 8 + ring * 4
    for (let k = 0; k < around; k++) {
      const angle = Math.PI / 2 + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / around)
      const at = inFront(onCloth({ x: want.x + Math.cos(angle) * radius, z: want.z + Math.sin(angle) * radius }, 1.0))
      if (clearOf(world, at, POT_ROOM, extra)) return at
    }
  }
  // A table with no room for it anywhere: its own stand on the tray, which nothing else is ever set down on.
  return { x: TRAY.pot.x, z: TRAY.pot.z }
}

/** How near the spout must be to a thing's middle to pour into it. */
function catches(thing: Thing): number {
  if (thing.kind === 'cup') return bowlOf(thing.size).rimR * 1.15
  if (thing.kind === 'saucer') return dishOf(thing.size).rimR * 1.05
  if (thing.kind === 'bowl') return 0.9
  if (thing.kind === 'sponge') return 0.5
  return 0
}

/** The thing under a spot that tea would fall into: a cup before the saucer it stands on, and nothing for the bare cloth. */
export function thingUnder(world: World, spot: Spot): string | null {
  let best: Thing | null = null, bestScore = Infinity
  for (const thing of world.things) {
    const reach = catches(thing)
    // What a guest holds or wears is not where its place is: the game looks for a cup in a paw itself (host.ts).
    if (reach <= 0 || thing.heldBy !== null) continue
    const far = Math.hypot(thing.x - spot.x, thing.z - spot.z)
    if (far > reach) continue
    // A cup wins over the saucer under it, and of two cups the nearer.
    const score = far + (thing.kind === 'cup' ? 0 : 10)
    if (score < bestScore) {
      best = thing
      bestScore = score
    }
  }
  return best ? best.id : null
}

/** A tap on a cup, or the pot let go near one: it hops to stand beside that spot with its spout over it. */
export function callTo(pot: Pot, target: Spot, id: string | null, world?: World, extra: readonly Circle[] = []): PourEvent[] {
  // The bowl is wide and deep: the pot stands further from it than from a cup, so its tipped spout stops at the bowl's rim too.
  const under = world && id !== null ? world.things.find((thing) => thing.id === id) : undefined
  const station = stationFor(target, world, extra, POUR.reach + (under && under.kind === 'bowl' ? 0.4 : 0))
  if (station.short && world) {
    // Nowhere to pour on it from, short of the guests' row: the pot does not come. It stays where it stands, or,
    // let go from the hand, comes down in the nearest free room.
    const lifted = liftOf(pot), inHand = pot.carried
    pot.held = false
    pot.carried = false
    if (!inHand) return []
    const room = roomFor(world, pot, extra)
    if (Math.hypot(room.x - pot.x, room.z - pot.z) < 1e-6) return [{ type: 'land' }]
    pot.hop = { fromX: pot.x, fromZ: pot.z, toX: room.x, toZ: room.z, fromHeading: pot.heading, toHeading: pot.heading, t: 0, lifted }
    pot.over = null
    return [{ type: 'hop' }]
  }
  // Let go from the hand, it sets off from the height it was carried at: it never drops into what it was let go over.
  pot.hop = { fromX: pot.x, fromZ: pot.z, toX: station.x, toZ: station.z, fromHeading: pot.heading, toHeading: station.heading, t: 0, lifted: liftOf(pot) }
  pot.reach = station.reach
  pot.over = id
  pot.held = false
  pot.carried = false
  return [{ type: 'hop' }]
}

/**
 * The pot is let go. Over a cup, a saucer or the bowl it takes its place
 * beside it with its spout over it. Anywhere else it comes down where it is,
 * or beside whatever is under it: it never comes down in another thing.
 */
export function setDown(pot: Pot, world: World, extra: readonly Circle[] = []): PourEvent[] {
  const lifted = liftOf(pot)
  const under = world.things.find((thing) => thing.id === pot.over)
  if (under) {
    const events = callTo(pot, under, under.id, world, extra)
    pot.carried = false
    return events
  }
  pot.carried = false
  const room = roomFor(world, pot, extra)
  if (Math.hypot(room.x - pot.x, room.z - pot.z) < 1e-6) return [{ type: 'land' }]
  pot.hop = { fromX: pot.x, fromZ: pot.z, toX: room.x, toZ: room.z, fromHeading: pot.heading, toHeading: pot.heading, t: 0, lifted }
  // What its spout is over is known again when it lands.
  pot.over = null
  return [{ type: 'hop' }]
}

/** The pot is carried: it goes where the finger takes it, upright, and pours nothing on the way. */
export function carryTo(pot: Pot, world: World, at: Spot): void {
  const spot = onCloth(at, 1.0)
  pot.x = spot.x
  // It is kept out of the guests' row: its spout reaches a guest from in front.
  pot.z = Math.max(POT_ROW_Z, spot.z)
  pot.reach = POUR.reach
  pot.hop = null
  pot.held = false
  pot.carried = true
  pot.over = thingUnder(world, spoutSpot(pot))
}

function deliver(pot: Pot, world: World, amount: number): Flow {
  if (pot.over !== null) return pourInto(world, pot.over, amount)
  if (pot.gulped) return { into: [{ id: 'guest', amount }], spilled: 0, lost: 0 }
  return spill(world, onCloth(spoutSpot(pot), 0.05), amount)
}

/** The finger lands on the pot: one drop falls at once, and the pot begins to tip. */
export function press(pot: Pot, world: World): PourEvent[] {
  if (pot.hop) return []
  pot.held = true
  pot.running = 0
  pot.dripIn = null
  return [{ type: 'drop', amount: POUR.drop, flow: deliver(pot, world, POUR.drop) }]
}

/** The finger lifts: the stream stops as the pot rights itself, and a last drop is owed if a stream ran. */
export function release(pot: Pot): PourEvent[] {
  if (!pot.held) return []
  pot.held = false
  const ran = pot.running > 0
  if (ran) pot.dripIn = POUR.lastDropAfter
  pot.flow = 0
  return ran ? [{ type: 'stream-stop' }] : []
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** The stream's strength for a time held: it only ever grows, and stops growing at steady. */
export function flowAfter(running: number): number {
  return POUR.dribble + (POUR.steady - POUR.dribble) * smooth(Math.min(1, Math.max(0, running / POUR.rampSeconds)))
}

/** Plays `dt` seconds. Tea that leaves the spout is in the world when this returns. */
export function step(pot: Pot, world: World, dt: number): PourEvent[] {
  const events: PourEvent[] = []
  if (dt <= 0) return events
  if (pot.hop) {
    const hop = pot.hop
    // A hop may wait before it sets off, as while a table is cleared: the pot stands where it stood until then.
    if (hop.wait !== undefined && hop.wait > 0) hop.wait -= dt
    else hop.t = Math.min(1, hop.t + dt / POUR.hopSeconds)
    // Up first, then across, then down: it has risen over whatever stands beside it before it has moved a finger's width.
    const k = smooth(smooth(hop.t))
    pot.x = hop.fromX + (hop.toX - hop.fromX) * k
    pot.z = hop.fromZ + (hop.toZ - hop.fromZ) * k
    // The short way round.
    const turn = Math.atan2(Math.sin(hop.toHeading - hop.fromHeading), Math.cos(hop.toHeading - hop.fromHeading))
    pot.heading = hop.fromHeading + turn * k
    if (hop.t >= 1) {
      pot.hop = null
      if (pot.over === null) pot.over = thingUnder(world, spoutSpot(pot))
      events.push({ type: 'land' })
    }
  }
  const before = pot.tilt
  pot.tilt = pot.held ? Math.min(1, pot.tilt + dt / POUR.tipSeconds) : Math.max(0, pot.tilt - dt / POUR.rightSeconds)
  if (pot.held && pot.tilt >= POUR.runsFrom) {
    // The part of this step after the pot had tipped far enough.
    const late = before >= POUR.runsFrom ? dt : dt * ((pot.tilt - POUR.runsFrom) / Math.max(1e-9, pot.tilt - before))
    if (pot.running === 0) events.push({ type: 'stream-start' })
    const from = pot.running
    pot.running += Math.max(late, 1e-6)
    // The amount is the stream's strength at the middle of the step, so the same hold pours the same tea at any frame rate.
    pot.flow = flowAfter(pot.running)
    const amount = flowAfter((from + pot.running) / 2) * (pot.running - from)
    events.push({ type: 'stream', amount, flow: deliver(pot, world, amount) })
  } else if (!pot.held) pot.flow = 0
  if (pot.dripIn !== null) {
    pot.dripIn -= dt
    if (pot.dripIn <= 0) {
      pot.dripIn = null
      events.push({ type: 'drop', amount: POUR.lastDrop, flow: deliver(pot, world, POUR.lastDrop) })
    }
  }
  return events
}

/** A carried pot, and a hopping one at the top of its hop, clears the tallest thing that can stand on the table (a house cup on its saucer, 0.56 high) by a hand. */
export const CARRY_LIFT = 1.0
export const HOP_LIFT = 1.3

/** How high the pot's foot is lifted off the cloth: it rises as it tips, arcs over the table in a hop, and rides in the hand. */
export function liftOf(pot: Pot): number {
  if (pot.carried) return CARRY_LIFT
  // Up at once and down at the last: it is above every cup before it has gone a hand's width sideways.
  if (!pot.hop) return pot.tilt * 0.42
  const arc = (1 - (2 * pot.hop.t - 1) ** 4) * HOP_LIFT
  // A hop that starts in the air comes down from that height as it sets off.
  const start = (pot.hop.lifted ?? 0) * Math.max(0, 1 - pot.hop.t * 3)
  return Math.max(arc, start) + pot.tilt * 0.42
}
