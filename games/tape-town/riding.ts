import { crossingsOn, type Crossing } from './crossings'
import { HOOT_AT, armRoom, armsOf, gateShut, openGate, railsEdge, shutGate, stopShort } from './gates'
import { beat, passed, startAct, turnToward, walkTo } from './going'
import { ACTS, BOO_EVERY, CROSS, GAITS, QUACK_EVERY, TURN, WANT, type Mover } from './habits'
import { TOY_SIZE } from './layout'
import { headingOf, placeOf, travel } from './roads'
import { stopAt } from './shoebox'
import type { Ride, Town } from './town'
import { nearestOn } from './tape'
import { freePlace, noseOf, roomToTurn, turnsAt, underReach, wayOf } from './way'
import { beepBack, bom, bomLow, boo, brake, chuffIn, clatter, hoot, putPut, quack, rustle, squeak, squeakBack, tonk } from './voices'

// A toy travelling its tape, and what happens where that tape crosses
// another. The pair of tapes decides what a crossing is, and each toy has
// its one thing there, the same every time.

const near = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y)
/**
 * A car or a bus that comes to a hedge having driven less than this since the last one is boxed in: it cannot
 * travel. It does not honk again; it waits there this many seconds, quietly, and turns back.
 */
const JAM_FAR = 400
const JAM_WAIT = 10
/** How far short of where it will stop a toy on the road takes a shut gate for its own: from there it brakes and rolls up to the arm. */
const GATE_ZONE = 70
/** How far ahead of the train's middle its front wheels are, and how far behind it its last. */
const AXLES = { front: 37, back: 63 }

export function turnBack(town: Town, id: Mover, ride: Ride): void {
  const turn = TURN[id]
  if (turn && !ride.back && (id === 'train' || roomToTurn(town, id))) return startAct(town, id, turn, ride, true)
  // No room to turn: it backs away, tail first, and the bus beeps as it does.
  ride.rider = { ...ride.rider, dir: ride.rider.dir === 1 ? -1 : 1, skip: -1 }
  if (id !== 'train') ride.back = !ride.back
  if (id === 'bus') town.hum(beepBack)
  if (id === 'car') town.hum(squeakBack)
}

/** The bus pulls up behind a car that honks at a hedge: it honks lower, and from then on they honk in turn. */
function joinJam(town: Town, ride: Ride): void {
  const honking = town.bodies.car.doing
  if (ride.kind !== 0 || honking.is !== 'act' || honking.name !== 'jamCar' || honking.after?.is !== 'ride') return
  const theirs = honking.after, gap = (theirs.rider.d - ride.rider.d) * ride.rider.dir
  if (theirs.kind !== 0 || theirs.rider.s !== ride.rider.s || !theirs.done || gap <= 0 || gap > noseOf('bus') + noseOf('car') + 90) return
  ride.done = theirs.done
  // The car starts over, so that there is a honk for each of the bus's; one it has only just given is not given twice.
  const since = honking.t - ACTS.jamCar.cues[Math.max(0, honking.cue - 1)].at
  if (since < 0.35) { honking.t = since; honking.cue = 1 } else startAct(town, 'car', 'jamCar', theirs)
  startAct(town, 'bus', 'jamBus', ride)
  const mine = town.bodies.bus.doing
  if (since < 0.35 && mine.is === 'act') mine.t = since
}

/** A toy afloat is under a bridge or a trestle for as long as any of it is, whether it travels or waits there, and from the moment it is found there. */
export function goesUnder(town: Town, id: Mover, ride: Ride): void {
  const body = town.bodies[id]
  if (ride.kind !== 1 || body.hidden) return
  const over = crossingsOn(town.crossings, town.nets[1].strips[ride.rider.s]).find((met) => (met.crossing.kind === 'bridge' || met.crossing.kind === 'trestle') && nearestOn(met.other, body.at).off <= underReach(id))
  if (over) { body.hidden = true; ride.inside = over.crossing }
}

export function stepRide(town: Town, id: Mover, ride: Ride, dt: number): void {
  const body = town.bodies[id], at = body.at, net = town.nets[ride.kind], strip = net.strips[ride.rider.s]
  // Somebody passed: the dog leaves the tape it was nosing along and goes after them.
  if (id === 'dog' && town.leader && town.time - town.leader.at < 0.3) { body.doing = walkTo({ ...at }, 'follow', true); return }
  // A toy on a strip that is being peeled stops and waits where it stands.
  if (town.grip?.mode === 'peel' && town.grip.strip === strip) return
  const mets = crossingsOn(town.crossings, strip), ahead = (d: number): number => (d - ride.rider.d) * ride.rider.dir
  let gated = false, across = 0
  if (ride.kind === 1) goesUnder(town, id, ride)
  for (const met of mets) {
    const crossing = met.crossing, gap = ahead(met.d) - met.reach
    if (ride.done === crossing && Math.abs(ahead(met.d)) > met.reach + 100) ride.done = null
    if (ride.hooted === crossing && Math.abs(ahead(met.d)) > met.reach + 200) ride.hooted = null
    if (gap < 0) continue
    // The train hoots before everything that crosses its line.
    // At a level crossing the gates are shut on the frame of the hoot.
    if (id === 'train' && gap < HOOT_AT && ride.hooted !== crossing) { ride.hooted = crossing; town.hum(hoot); body.soundedAt = town.time; shutGate(town, crossing) }
    if ((id === 'car' || id === 'bus') && ride.kind === 0 && gap < noseOf(id) + 90) {
      if (crossing.kind === 'jam' && ride.done !== crossing && gap < noseOf(id) + 12) {
        // A hedge across the road: it stops there and honks. Boxed in between hedges, with nothing changed since
        // it last honked, it does not honk on and on: it waits there quietly, and after a long wait turns back.
        if (body.jamAt !== null && body.gone - body.jamAt < JAM_FAR) {
          ride.held += dt
          if (ride.held < JAM_WAIT) return
          ride.held = 0
          ride.done = crossing
          body.jamAt = body.gone
          return turnBack(town, id, ride)
        }
        ride.done = crossing
        body.jamAt = body.gone
        return startAct(town, id, id === 'car' ? 'jamCar' : 'jamBus', ride)
      }
    }
    if (ride.kind === 0 && crossing.kind === 'level') {
      // Nobody stops on the rails. Before them, with the gates open or shut, it looks right across the crossing, and
      // drives onto it only when it can drive off it at the other side: with somebody in its way there, it waits.
      const short = ahead(met.d) - stopShort(crossing, id), before = ahead(met.d) > railsEdge(crossing, id)
      // So long as it is short of the rails the train has room to pass it, and does not wait for it.
      if (before && short < GATE_ZONE) body.offRailsAt = town.frames
      if (before && short < 12) {
        // A road that ends beyond the rails before there is room on it to stand off them is as good as ended here:
        // it turns back at the arm. Come back to the arm after a short way only, it stands there a long while first.
        const beyond = ahead(met.d) + met.reach + TOY_SIZE[id].long / 2
        if (id !== 'dog' && travel(net, ride.rider, beyond, noseOf(id), turnsAt(id)).ended) {
          if (body.jamAt !== null && body.gone - body.jamAt < JAM_FAR) {
            ride.held += dt
            if (ride.held < JAM_WAIT) return
            ride.held = 0
          }
          body.jamAt = body.gone
          return turnBack(town, id, ride)
        }
        across = Math.max(across, (beyond + 6) / GAITS[ride.gait].speed)
      }
      // The gate is shut. Whoever comes along the road stops with its nose short of the arm, and waits until the
      // train is past and the gate is opened. One that is past the arm and not yet on the rails waits where it is,
      // and the arm stays up over it; one that is on the rails drives on off them.
      if (before && short < GATE_ZONE && gateShut(town, crossing)) {
        gated = true
        if (id === 'car' || id === 'bus') {
          // A car or a bus brakes with a squeak and idles, put-put-put.
          if (!ride.braked) { ride.braked = true; ride.tootAt = town.time; town.hum(brake) }
          else if (town.time - ride.tootAt >= 0.4) { ride.tootAt = town.time; town.hum(putPut(town.level)) }
        }
        // It rolls up to the arm and stands there.
        if (short < 3) return
      }
    }
  }
  if (!gated) ride.braked = false
  if (id === 'bus' && ride.kind === 0 && stopAt(town, ride)) return
  // Behind a shut gate it is kept clear of the train by the gate, and does not look for the train on its way.
  const verdict = wayOf(town, id, ride, dt, gated ? 'train' : undefined, across)
  if (verdict === 'wait') { if (id === 'bus') joinJam(town, ride); return }
  if (verdict === 'back') return turnBack(town, id, ride)
  // Backing away with room to turn at last: it turns, and goes on nose first.
  if (ride.back && id !== 'train' && TURN[id] && roomToTurn(town, id, 6)) {
    ride.rider = { ...ride.rider, dir: ride.rider.dir === 1 ? -1 : 1, skip: -1 }
    return startAct(town, id, TURN[id], ride, true)
  }
  const gait = GAITS[ride.gait], before = ride.rider.d, sameStrip = ride.rider.s
  const went = travel(net, ride.rider, gait.speed * dt, noseOf(id), turnsAt(id))
  ride.rider = went.rider
  body.gone += gait.speed * dt
  const place = placeOf(net, ride.rider), heading = headingOf(net, ride.rider)
  at.x = place.x
  at.y = place.y
  // The train runs back as it stands; everyone else brings its nose round to the way it goes.
  const facing = (id === 'train' ? Math.cos(at.a - heading) < 0 : ride.back) ? heading + Math.PI : heading
  at.a = turnToward(at.a, facing, gait.turn * dt)
  if (went.turned) town.hum(squeak)
  const inTunnel = id === 'train' && body.hidden
  if (ride.gait === 'swim') {
    // A ripple at every stroke, and a quack at one stroke in five.
    const strokes = Math.floor(ride.odo / gait.every)
    ride.odo += gait.speed * dt
    const now = Math.floor(ride.odo / gait.every)
    if (now > strokes && !body.hidden) {
      town.puff('wake', at.x, at.y)
      if (now % QUACK_EVERY === 1) town.hum(quack)
    }
  } else if (ride.gait === 'sail') {
    const blasts = Math.floor((ride.odo + BOO_EVERY - 40) / BOO_EVERY)
    ride.odo += gait.speed * dt
    if (Math.floor((ride.odo + BOO_EVERY - 40) / BOO_EVERY) > blasts) { town.hum(boo); body.soundedAt = town.time }
    if (Math.floor(ride.odo / 60) > Math.floor((ride.odo - gait.speed * dt) / 60) && !body.hidden) town.puff('wake', at.x, at.y)
  } else if (inTunnel) {
    // In the hedge its chuffing goes muffled.
    const chuffs = Math.floor(ride.odo / gait.every)
    ride.odo += gait.speed * dt
    if (Math.floor(ride.odo / gait.every) > chuffs) town.hum(chuffIn(town.level))
  } else beat(town, id, ride, gait.speed * dt)
  passed(town, id)
  if (ride.rider.s === sameStrip) {
    for (const met of mets) {
      // Whoever is afloat is under a bridge for as long as any of it is.
      const crossing = met.crossing, under = ride.kind === 1 && (crossing.kind === 'bridge' || crossing.kind === 'trestle')
      const inside = under ? nearestOn(met.other, at).off <= underReach(id) : Math.abs(ride.rider.d - met.d) <= met.reach
      if (inside && ride.inside !== crossing) { ride.inside = crossing; entered(town, id, ride, crossing) }
      if ((before - met.d) * (ride.rider.d - met.d) <= 0 && before !== ride.rider.d && ride.done !== crossing) { ride.done = crossing; if (centre(town, id, ride, crossing)) return }
      if (!inside && ride.inside === crossing) { ride.inside = null; left(town, id, ride, crossing) }
      if (id === 'train' && crossing.kind === 'level') {
        // Clack as its first wheels come onto the road and clack as its last leave it, whichever end it runs with.
        // The gates open on the second, and from then on the crossing is one it will hoot at again.
        const dir = ride.rider.dir, was = (before - met.d) * dir, now = (ride.rider.d - met.d) * dir
        const nosing = Math.cos(at.a - heading) >= 0, lead = nosing ? AXLES.front : AXLES.back, trail = nosing ? AXLES.back : AXLES.front
        if (was < -met.reach - lead && now >= -met.reach - lead) { town.hum(clatter); shutGate(town, crossing) }
        if (was < met.reach + trail && now >= met.reach + trail) { town.hum(clatter); openGate(town, crossing); ride.hooted = null }
      }
    }
  } else if (ride.inside) { left(town, id, ride, ride.inside); ride.inside = null }
  if (went.ended) endOfTape(town, id, ride)
}

/**
 * As a load finds it: a train whose wheels are on the road at a level crossing has the gates shut, each arm down
 * where nobody is under it. They open at its second clack, as they would have.
 */
export function gatesAsFound(town: Town): void {
  const body = town.bodies.train, ride = body.doing
  if (!town.state.out || ride.is !== 'ride' || ride.kind !== 3) return
  const net = town.nets[3], strip = net.strips[ride.rider.s]
  if (!strip) return
  const nosing = Math.cos(body.at.a - headingOf(net, ride.rider)) >= 0, lead = nosing ? AXLES.front : AXLES.back, trail = nosing ? AXLES.back : AXLES.front
  for (const met of crossingsOn(town.crossings, strip)) {
    const now = (ride.rider.d - met.d) * ride.rider.dir
    if (met.crossing.kind !== 'level' || now < -met.reach - lead || now >= met.reach + trail) continue
    shutGate(town, met.crossing)
    ride.hooted = met.crossing
    const gate = town.gates[town.gates.length - 1], arms = armsOf(met.crossing)
    gate.down = [armRoom(town, arms[0]) >= 3 ? 1 : 0, armRoom(town, arms[1]) >= 3 ? 1 : 0]
  }
}

function entered(town: Town, id: Mover, ride: Ride, crossing: Crossing): void {
  const body = town.bodies[id], at = body.at
  // Only who is in the river is under what crosses it: a duck that walks the road or a rail is on top, and seen.
  const afloat = ride.kind === 1
  if (crossing.kind === 'bridge') {
    // Over hollow boards, or under them.
    if (afloat) body.hidden = true
    else if (ride.kind === 0 && id === 'car') { town.hum(bom); body.soundedAt = town.time }
    else if (ride.kind === 0 && id === 'bus') { town.hum(bomLow); body.soundedAt = town.time }
  }
  if (crossing.kind === 'trestle') {
    if (afloat) body.hidden = true
    else if (id === 'train') { town.hum(tonk); town.puff('drip', at.x, at.y) }
  }
  if (crossing.kind === 'tunnel' && id === 'train') {
    // In it goes, and the hedge shakes.
    body.hidden = true
    town.hum(rustle)
    town.puff('leaf', crossing.at.x, crossing.at.y)
  }
}

/** The middle of a crossing. True when the toy stopped there to do something. */
function centre(town: Town, id: Mover, ride: Ride, crossing: Crossing): boolean {
  const duck = town.bodies.duck
  switch (crossing.kind) {
    case 'bridge':
      // The drum of hollow boards belongs to who drives over them, not to who floats under.
      if (id === 'car' && ride.kind === 0) { town.hum(bom); town.bodies.car.soundedAt = town.time }
      if (id === 'bus' && ride.kind === 0) { town.hum(bomLow); town.bodies.bus.soundedAt = town.time }
      if (id === 'dog' && ride.kind === 0) { startAct(town, id, 'woof', ride); return true }
      return false
    case 'level':
      // Its clacks are its wheels coming onto the road and leaving it, heard where it travels.
      return false
    case 'trestle':
      if (id !== 'train') return false
      town.hum(tonk)
      town.puff('drip', crossing.at.x, crossing.at.y)
      // A duck swimming under as it passes gets a puff of steam on the head.
      if (duck.doing.is === 'ride' && duck.doing.kind === 1 && !duck.flight && near(duck.at, crossing.at) < 90) startAct(town, 'duck', 'sneeze', duck.doing)
      return false
    case 'reeds':
      if (id === 'duck' && ride.kind === 1) { startAct(town, id, 'hide', ride); return true }
      if (id === 'car' && ride.kind === 1) { startAct(town, id, 'snag', ride); return true }
      return false
    case 'jam':
      if (id === 'dog' && ride.kind === 0) { startAct(town, id, 'leg', ride); return true }
      return false
    default:
      if (id === 'train') town.puff('leaf', crossing.at.x, crossing.at.y)
      return false
  }
}

function left(town: Town, id: Mover, ride: Ride, crossing: Crossing): void {
  const body = town.bodies[id], at = body.at
  if (ride.kind === 1 && body.hidden) {
    body.hidden = false
    if (id !== 'duck' || crossing.kind !== 'bridge') return
    // Out the other side with a quack.
    town.hum(quack)
    town.puff('drop', at.x, at.y)
    body.landedAt = town.time
  }
  if (id === 'train' && crossing.kind === 'trestle') { town.hum(tonk); town.puff('drip', at.x, at.y) }
  if (id === 'train' && crossing.kind === 'tunnel') {
    // Out it comes with a leaf on its funnel, which the next hoot blows off.
    body.hidden = false
    body.leafAt = town.time
  }
}

/** The end of the tape: on its own tape a toy turns and comes back; on any other it does what its row says or steps off. */
function endOfTape(town: Town, id: Mover, ride: Ride): void {
  const body = town.bodies[id]
  // The train is out of its tunnel at the end of the line, and the car is washed up; a duck or a ferry that turns under a bridge is still under it.
  if (body.hidden && (ride.kind !== 1 || id === 'car')) body.hidden = false
  // Washed up at the end of the river with a splutter.
  if (id === 'car' && ride.kind === 1) return startAct(town, id, 'washed', null, false, 130)
  // Backed all the way to the end, it has only to drive off forwards again.
  if (ride.back) { ride.back = false; ride.rider = { ...ride.rider, dir: ride.rider.dir === 1 ? -1 : 1, skip: -1 }; return }
  const own = ride.kind === WANT[id] || (id === 'car' && ride.kind === 3) || (id === 'bus' && ride.kind === 1)
  if (own && TURN[id]) return turnBack(town, id, ride)
  // It steps off the end onto the nearest free floor, and takes up its habit from there.
  const want = { x: body.at.x + Math.cos(body.at.a) * 120, y: body.at.y + Math.sin(body.at.a) * 120, a: body.at.a }
  const to = freePlace(town, id, want, 150, body.at.a, undefined, true, body.at)
  if (to) body.doing = walkTo(to, id === 'dog' ? 'follow' : CROSS[id as 'car' | 'bus' | 'duck'].gait)
  else ride.rider = { ...ride.rider, dir: ride.rider.dir === 1 ? -1 : 1, skip: -1 }
}
