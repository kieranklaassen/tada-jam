import { bowlOf, dishOf } from './forms'
import { CLOTH, onCloth, type Spot } from './layout'
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
  /** Seconds for the pot to tip, and to right itself. */
  tipSeconds: 0.14,
  rightSeconds: 0.22,
  /** The stream runs once the pot has tipped this far. */
  runsFrom: 0.55,
  /** Seconds a hop to another cup takes. */
  hopSeconds: 0.34,
  /** How far in front of the pot's middle the tea lands. The spout stops short of that, so it never hangs over the cup and hides the tea: the stream arcs the rest of the way. */
  reach: 2.5,
} as const

/** Where the pot stands to pour on a spot: to its right and a little nearer the child, so neither pot nor hand covers the cup. */
const STATION = { x: 2.12, z: 1.325 } as const

export type Pot = {
  /** Where its foot stands on the cloth. */
  x: number
  z: number
  /** The way its spout points, in radians: 0 is toward +x, a quarter turn is toward the child. */
  heading: number
  /** The thing under its spout, or null when it pours on the bare cloth. */
  over: string | null
  held: boolean
  /** Seconds the stream has been running in this hold. */
  running: number
  /** 0 upright, 1 tipped to pour. */
  tilt: number
  /** Cupfuls a second leaving the spout now. */
  flow: number
  /** Seconds until the last drop of a hold falls, or null. */
  dripIn: number | null
  /** A hop in progress: where from, where to, and how far along (0 to 1). */
  hop: { fromX: number; fromZ: number; toX: number; toZ: number; fromHeading: number; toHeading: number; t: number } | null
}

export type PourEvent =
  | { type: 'drop'; amount: number; flow: Flow }
  | { type: 'stream-start' }
  | { type: 'stream'; amount: number; flow: Flow }
  | { type: 'stream-stop' }
  | { type: 'hop' }
  | { type: 'land' }

export function restingPot(at: Spot, heading = Math.PI): Pot {
  return { x: at.x, z: at.z, heading, over: null, held: false, running: 0, tilt: 0, flow: 0, dripIn: null, hop: null }
}

/** The spot on the cloth under the spout when the pot is tipped. */
export function spoutSpot(pot: Pot): Spot {
  return { x: pot.x + Math.cos(pot.heading) * POUR.reach, z: pot.z + Math.sin(pot.heading) * POUR.reach }
}

/** Where the pot stands, and which way it faces, to pour on a spot. Near the right edge of the cloth it stands on the other side. */
export function stationFor(target: Spot): { x: number; z: number; heading: number } {
  const side = target.x + STATION.x > CLOTH.maxX - 1.1 ? -1 : 1
  const near = target.z + STATION.z > CLOTH.maxZ - 0.9 ? -1 : 1
  const heading = Math.atan2(-near * STATION.z, -side * STATION.x)
  return { x: target.x - Math.cos(heading) * POUR.reach, z: target.z - Math.sin(heading) * POUR.reach, heading }
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
    if (reach <= 0) continue
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
export function callTo(pot: Pot, target: Spot, id: string | null): PourEvent[] {
  const station = stationFor(target)
  pot.hop = { fromX: pot.x, fromZ: pot.z, toX: station.x, toZ: station.z, fromHeading: pot.heading, toHeading: station.heading, t: 0 }
  pot.over = id
  pot.held = false
  return [{ type: 'hop' }]
}

/** The pot is carried: it goes where the finger takes it, upright, and pours nothing on the way. */
export function carryTo(pot: Pot, world: World, at: Spot): void {
  const spot = onCloth(at, 1.0)
  pot.x = spot.x
  pot.z = spot.z
  pot.hop = null
  pot.held = false
  pot.over = thingUnder(world, spoutSpot(pot))
}

function deliver(pot: Pot, world: World, amount: number): Flow {
  if (pot.over !== null) return pourInto(world, pot.over, amount)
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
    hop.t = Math.min(1, hop.t + dt / POUR.hopSeconds)
    const k = smooth(hop.t)
    pot.x = hop.fromX + (hop.toX - hop.fromX) * k
    pot.z = hop.fromZ + (hop.toZ - hop.fromZ) * k
    // The short way round.
    const turn = Math.atan2(Math.sin(hop.toHeading - hop.fromHeading), Math.cos(hop.toHeading - hop.fromHeading))
    pot.heading = hop.fromHeading + turn * k
    if (hop.t >= 1) {
      pot.hop = null
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

/** How high the pot's foot is lifted off the cloth: it rises as it tips, and arcs over the table in a hop. */
export function liftOf(pot: Pot): number {
  const hop = pot.hop ? Math.sin(pot.hop.t * Math.PI) * 0.9 : 0
  return hop + pot.tilt * 0.62
}
