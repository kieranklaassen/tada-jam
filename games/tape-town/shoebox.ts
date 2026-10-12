import { startAct } from './going'
import { ACTS, MOVERS } from './habits'
import { BOX_MOUTH, HOME_ORDER, HOME_PLACE, OUT_PLACE, TOY_SIZE, type Pose } from './layout'
import { takeUpQuietly } from './going'
import { PEGS, type PegId } from './save'
import { nearestOn } from './tape'
import type { Ride, Town } from './town'
import { freePlace } from './way'
import { HOP, LAND, boxKnock, boxThump, hup, inScene } from './voices'

// The two scenes of the shoebox, and the bus's passengers. A scene is a row
// of flights, each with its own take-off and landing; a touch ends it with
// every toy where it was going.

export const TUMBLE_SECONDS = 0.55
export const HOME_SECONDS = 0.5
const BOARD_SECONDS = 0.4

/** Where a peg aboard the bus is: on its roof, in a row along it. */
export function roofOf(town: Town, peg: PegId): Pose {
  const bus = town.poseOf('bus'), aboard = PEGS.filter((other) => town.state.riding[other]), k = aboard.indexOf(peg) - (aboard.length - 1) / 2
  return { x: bus.x + Math.cos(bus.a) * k * 58, y: bus.y + Math.sin(bus.a) * k * 58, a: bus.a }
}

/** The box goes over: the toys tumble out one after another, each to free floor near its own place. */
export function tipOut(town: Town): void {
  const state = town.state
  state.out = true
  town.boxAt = town.time
  town.say(inScene(boxThump))
  HOME_ORDER.forEach((id, k) => {
    const body = town.bodies[id]
    // Free floor near its own place, turned another way if that is what fits; on a floor taped over from edge to edge, its own place.
    let to: Pose | null = null
    for (const turn of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) to ??= freePlace(town, id, { ...OUT_PLACE[id], a: OUT_PLACE[id].a + turn }, 900, 0)
    // With no bare floor left that fits it, on the tape but on nobody.
    body.at = state.toys[id] = to ?? freePlace(town, id, OUT_PLACE[id], 900, 0, undefined, false) ?? { ...OUT_PLACE[id] }
    body.doing = { is: 'stand', as: 'plain', since: town.time }
    // Out of the mouth of the box, one after another: until its turn a toy is inside and not seen.
    body.flight = { from: { x: BOX_MOUTH.x, y: BOX_MOUTH.y + (k - 3.5) * 22, a: OUT_PLACE[id].a - 1.2 }, wait: 0.3 + k * 0.24, t: 0, lasts: TUMBLE_SECONDS, started: false, scene: true, loud: true, off: inScene(HOP[id]), land: inScene(LAND[id]), then: 'decide' }
  })
  town.sceneOn = true
  town.mark('now')
}

/** The box is stood upright: every toy stops and goes home, smallest first, a peg aboard the bus getting off first. */
export function callHome(town: Town): void {
  const state = town.state
  const from = Object.fromEntries(HOME_ORDER.map((id) => [id, town.poseOf(id)])) as Record<string, Pose>
  state.out = false
  town.boxAt = town.time
  town.say(inScene(boxKnock))
  town.leader = null
  for (const peg of PEGS) state.riding[peg] = false
  HOME_ORDER.forEach((id, k) => {
    const body = town.bodies[id]
    body.at = state.toys[id] = { ...HOME_PLACE[id] }
    // Home in the box is a fresh start: the dog that had lain down follows again when it is out.
    body.asides = 0
    body.doing = { is: 'stand', as: 'plain', since: town.time }
    body.hidden = false
    body.hatAt = body.leafAt = -Infinity
    body.flight = { from: { x: from[id].x, y: from[id].y, a: from[id].a }, wait: 0.2 + k * 0.3, t: 0, lasts: HOME_SECONDS, started: false, scene: true, loud: true, off: inScene(HOP[id]), land: inScene(LAND[id]), then: 'stand' }
  })
  town.sceneOn = true
  town.mark('now')
}

/** A touch ends the scene: every toy stands where it was going, and nothing more of the scene is heard. */
export function finishScene(town: Town, cut = true): void {
  if (!town.sceneOn) return
  town.sceneOn = false
  for (const id of HOME_ORDER) if (town.bodies[id].flight?.scene) town.bodies[id].flight = null
  if (cut) town.cutScene()
  if (town.state.out) for (const id of MOVERS) takeUpQuietly(town, id)
}

/** A peg that stands and waits: not aboard, not in the air or in the hand, and not under a finger that rests on it. */
const waits = (town: Town, peg: PegId): boolean => !town.state.riding[peg] && !town.bodies[peg].flight && town.bodies[peg].doing.is === 'stand' && !town.stopped(peg)

/**
 * The bus beside a peg person: it stops, whoever rides hops off, the one who waits hops aboard. True when it
 * stopped. The passengers' places are settled, and saved, when the stop starts.
 */
export function stopAt(town: Town, ride: Ride): boolean {
  const state = town.state, bus = town.bodies.bus, strip = town.nets[0].strips[ride.rider.s]
  for (const peg of [...town.served]) {
    const at = town.bodies[peg].at
    if (!state.riding[peg] && Math.hypot(at.x - bus.at.x, at.y - bus.at.y) > 200) town.served.delete(peg)
  }
  const waiter = PEGS.find((peg) => {
    if (!waits(town, peg) || town.served.has(peg)) return false
    const near = nearestOn(strip, town.bodies[peg].at)
    return near.off <= 150 && Math.abs(near.d - ride.rider.d) <= 24
  })
  if (!waiter) return false
  startAct(town, 'bus', 'stop', ride)
  const off = ACTS.stop.cues[1].at, on = ACTS.stop.cues[2].at
  const their = town.bodies[waiter].at, side = Math.sign(-Math.sin(bus.at.a) * (their.x - bus.at.x) + Math.cos(bus.at.a) * (their.y - bus.at.y)) || 1
  PEGS.filter((peg) => state.riding[peg]).forEach((peg, k) => {
    // Off on the side the stop is on, a little way along from whoever waits there.
    const out = TOY_SIZE.bus.wide / 2 + 64, back = -70 - k * 84
    const want = { x: bus.at.x + Math.cos(bus.at.a) * back - Math.sin(bus.at.a) * out * side, y: bus.at.y + Math.sin(bus.at.a) * back + Math.cos(bus.at.a) * out * side, a: their.a }
    const from = roofOf(town, peg), to = freePlace(town, peg, want, 200, bus.at.a + (Math.PI / 2) * side)
    if (!to) return
    state.riding[peg] = false
    town.served.add(peg)
    const body = town.bodies[peg]
    body.at = state.toys[peg] = to
    body.flight = { from, wait: off, t: 0, lasts: BOARD_SECONDS, started: false, scene: false, loud: false, off: HOP[peg], land: LAND[peg], then: 'stand' }
  })
  const from = { ...their }
  state.riding[waiter] = true
  const body = town.bodies[waiter]
  body.at = state.toys[waiter] = roofOf(town, waiter)
  body.flight = { from, wait: on, t: 0, lasts: BOARD_SECONDS, started: false, scene: false, loud: false, off: hup, land: LAND[waiter], then: 'stand' }
  town.mark('now')
  return true
}

/** How far the bus's doors stand open, 0 to 1: wide at a stop, and opening as it comes up to a peg who waits. */
export function doorsOf(town: Town): number {
  const bus = town.bodies.bus, doing = bus.doing
  if (doing.is === 'act' && doing.name === 'stop') return Math.max(0, Math.min(1, doing.t / 0.3, (ACTS.stop.lasts - doing.t) / 0.4))
  if (doing.is !== 'ride' || doing.kind !== 0) return 0
  let open = 0
  for (const peg of PEGS) {
    if (!waits(town, peg) || town.served.has(peg)) continue
    const at = town.bodies[peg].at
    open = Math.max(open, 1 - (Math.hypot(at.x - bus.at.x, at.y - bus.at.y) - 110) / 120)
  }
  return Math.max(0, Math.min(0.7, open))
}

/** Which side of the bus its doors open on: the side of the nearest peg who is not sitting on its roof. 1 is its right. */
export function doorSideOf(town: Town): 1 | -1 {
  const bus = town.bodies.bus.at
  let side: 1 | -1 = 1, far = Infinity
  for (const peg of PEGS) {
    const body = town.bodies[peg], flight = body.flight
    if (town.state.riding[peg] && !flight) continue
    const at = town.state.riding[peg] && flight ? flight.from : body.at, gap = Math.hypot(at.x - bus.x, at.y - bus.y)
    if (gap >= far) continue
    far = gap
    side = -Math.sin(bus.a) * (at.x - bus.x) + Math.cos(bus.a) * (at.y - bus.y) < 0 ? -1 : 1
  }
  return side
}
