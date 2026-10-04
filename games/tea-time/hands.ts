import { aim, guestAt, guestCircles, pawSpot, potCircles, restPot, seatOf, placeOf, type Game } from './host'
import { POT_ROW_Z, ROW_FRONT, TRAY, onCloth, type Spot } from './layout'
import { callTo, carryTo as carryPot, clearOf, footprint, press, release, roomFor, setDown, shapeOf, spoutSpot, stationFor, thingUnder, type Circle, type PourEvent } from './pour'
import { SPOON_REACH, cupOf } from './tastes'
import { dab, holds, runOff, spill, thingById, tip, wipe, type Flow, type GuestId, type Thing, type ThingKind, type World } from './world'

// What a finger's acts do to the things on the table. Pure: each function
// changes the game it is given and says what came of it, by the names the
// grid gives its cells (grid.ts). Every wrong use works: a cup may be a hat,
// tea may go in a saucer, a spoon may sit on a nose. Nothing is refused, and
// nothing ever comes to rest inside another thing.

export type HandEvent =
  | { type: 'pour'; event: PourEvent }
  /** A thing was tapped. The sponge may give tea back to the cup it lies on (`gave`) or squirt a drop on the cloth (`squirted`). */
  | { type: 'tapped'; id: string; kind: ThingKind; gave: number; squirted: number }
  /** A thing was put down. `result` is the grid's name for what came of it; `onto` is the thing it met and `guest` the guest, if any. */
  | { type: 'put'; id: string; kind: ThingKind; result: string; onto: string | null; guest: GuestId | null; flow: Flow | null }
  /** A guest set the cup from its paw on the saucer that was laid at its place. */
  | { type: 'set-cup'; who: GuestId; cup: string; saucer: string }
  | { type: 'swap'; a: GuestId; b: GuestId }

const pours = (events: PourEvent[]): HandEvent[] => events.map((event) => ({ type: 'pour', event }))
const far = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.z - b.z)

/** Things that stand on others stand where those stand. */
export function settle(world: World): void {
  for (let pass = 0; pass < 4; pass++) {
    for (const thing of world.things) {
      const under = thingById(world, thing.on)
      if (under) Object.assign(thing, { x: under.x, z: under.z })
    }
  }
}

/** The thing a spot is on, for putting something down on it: the smallest thing whose edge the spot is inside. Things a guest wears are out of reach. */
export function thingAt(world: World, spot: Spot, ignore: string): Thing | undefined {
  let best: Thing | undefined
  for (const thing of world.things) {
    if (thing.id === ignore || thing.on === ignore || thing.heldBy !== null) continue
    if (far(thing, spot) > footprint(thing)) continue
    if (!best || footprint(thing) < footprint(best)) best = thing
  }
  // On a stack of saucers it is the top one: nothing is ever put down inside the stack.
  for (let above = best; above && above.kind === 'saucer'; above = world.things.find((thing) => thing.kind === 'saucer' && thing.on === above!.id && thing.id !== ignore)) best = above
  return best
}

/**
 * The nearest spot where a thing stands in nothing else: the spot itself if
 * it is free, else the first free one on widening rings round it, starting
 * on the child's side. A crowded corner is searched outward until room is
 * found, so a thing never comes to rest in another, nor in a guest.
 */
export function freeSpot(world: World, thing: Thing, spot: Spot, extra: readonly Circle[] = [], ignore: readonly string[] = []): Spot | null {
  const margin = footprint(thing) + 0.05
  const want = onCloth(spot, margin)
  for (let ring = 0; ring <= 60; ring++) {
    const radius = ring * 0.2, around = ring === 0 ? 1 : 8 + ring * 4
    for (let k = 0; k < around; k++) {
      // A quarter turn is toward the child; the ring is walked both ways from there.
      const angle = Math.PI / 2 + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / around)
      const at = onCloth({ x: want.x + Math.cos(angle) * radius, z: want.z + Math.sin(angle) * radius }, margin)
      // Nothing is set down in the guests' row: they sit there, and walk there when they change seats.
      if (shapeOf(thing, at).every((circle) => circle.z - circle.r >= ROW_FRONT) && fits(world, thing, at, [thing.id, ...ignore], extra, 0.02)) return at
    }
  }
  // The table is so full that there is no room for it anywhere.
  return null
}

/** A spot of bare cloth the pot is called to is never in the guests' row: a tap there calls it to the front of the row. */
const inFront = (spot: Spot): Spot => ({ x: spot.x, z: Math.max(ROW_FRONT + 0.3, spot.z) })

/** A thing would stand in nothing at the spot: not in another thing that stands on the cloth, the named ones left out of account, and not in a guest. */
function fits(world: World, thing: Thing, spot: Spot, ignore: readonly string[], extra: readonly Circle[] = [], gap = 0): boolean {
  const mine = shapeOf(thing, spot)
  const clear = (other: Circle) => mine.every((circle) => Math.hypot(circle.x - other.x, circle.z - other.z) >= circle.r + other.r + gap)
  return extra.every(clear) && world.things.every((other) => ignore.includes(other.id) || other.on !== null || other.heldBy !== null || shapeOf(other).every(clear))
}

/** A saucer lying at a guest's place, with or without a cup on it. */
function saucerAt(world: World, place: Spot, ignore = ''): Thing | undefined {
  return world.things.find((thing) => thing.kind === 'saucer' && thing.id !== ignore && thing.on === null && thing.heldBy === null && far(thing, place) <= 0.5)
}

const hasCup = (world: World, saucer: Thing) => world.things.some((thing) => thing.kind === 'cup' && thing.on === saucer.id)

/** The guest whose place a spot is at, if any. */
function placeNear(game: Game, spot: Spot, reach: number): GuestId | null {
  let best: GuestId | null = null, bestFar = reach
  for (const guest of game.tea.guests) {
    const gap = far(placeOf(game, guest.who), spot)
    if (gap <= bestFar) {
      best = guest.who
      bestFar = gap
    }
  }
  return best
}

/** The finger lands on the pot: it pours. Nothing happens while something else is in the hand. */
export function pressPot(game: Game): HandEvent[] {
  if (game.hand) return []
  // It pours on what is under its spout now: a cup that was carried off since the pot came is no longer there.
  if (!game.pot.hop && !game.pot.carried) aim(game)
  return pours(press(game.pot, game.world))
}

export function releasePot(game: Game): HandEvent[] {
  return pours(release(game.pot))
}

/** A tap on a thing, a guest or the cloth calls the pot: it hops over and stands with its spout there. */
export function callPot(game: Game, target: { id: string | null; guest: GuestId | null; spot: Spot }): HandEvent[] {
  const { pot, world } = game
  if (game.hand || pot.hop || pot.held) return []
  const thing = thingById(world, target.id)
  // A cup in a paw is called to where the paw holds it.
  const paw = thing && thing.kind === 'cup' && thing.heldBy !== null && !thing.worn ? thing : null
  const spot = target.guest ? { x: seatOf(game, target.guest).x, z: seatOf(game, target.guest).z + 0.5 } : paw ? pawSpot(game, paw) : thing ? { x: thing.x, z: thing.z } : inFront(onCloth(target.spot, 0.4))
  const over = target.guest ? null : paw ? paw.id : thingUnder(world, spot)
  if (far(spoutSpot(pot), spot) < 0.05 && over === pot.over) return []
  game.overGuest = null
  return pours(callTo(pot, spot, over, world, potCircles(game)))
}

/** A tap on a thing. Only the sponge does something to the tea: on a cup it gives its tea back, anywhere else it squirts a drop. */
export function tapThing(game: Game, id: string): HandEvent[] {
  const thing = thingById(game.world, id)
  if (!thing) return []
  let gave = 0, squirted = 0
  if (thing.kind === 'sponge' && thing.tea > 0) {
    const under = thingById(game.world, thing.on)
    if (under && under.kind === 'cup') {
      gave = thing.tea
      tip(game.world, thing.id, under.id)
    } else {
      squirted = Math.min(0.03, thing.tea)
      thing.tea -= squirted
      spill(game.world, runOff(thing), squirted)
    }
  }
  return [{ type: 'tapped', id, kind: thing.kind, gave, squirted }]
}

/** A thing is taken up. Of a stack of saucers the top one comes. Returns the id of the thing now in the hand, or null. */
export function pickUp(game: Game, id: string): string | null {
  if (game.hand) return null
  let thing = thingById(game.world, id)
  // The pot cannot be taken out of the air; anything else can be taken up while it hops.
  if (!thing || (thing.kind === 'pot' && game.pot.hop)) return null
  for (let top = thing; top.kind === 'saucer';) {
    const above = game.world.things.find((candidate) => candidate.kind === 'saucer' && candidate.on === top.id)
    if (!above) { thing = top; break }
    top = above
  }
  game.hand = { id: thing.id, from: { x: thing.x, z: thing.z, on: thing.on, heldBy: thing.heldBy, worn: thing.worn } }
  game.trail = 0
  if (thing.kind === 'pot') return thing.id
  Object.assign(thing, { on: null, heldBy: null, worn: false })
  return thing.id
}

/**
 * The thing in the hand goes back where it was picked up: the game is put
 * away with the finger still down, and nothing may happen that the child did
 * not do. A pot goes back to where it stood.
 */
export function dropBack(game: Game): void {
  const hand = game.hand
  const thing = hand ? thingById(game.world, hand.id) : undefined
  game.hand = null
  if (!hand || !thing) return
  if (thing.kind === 'pot') {
    Object.assign(game.pot, { x: hand.from.x, z: hand.from.z, carried: false, hop: null })
    restPot(game)
    return
  }
  Object.assign(thing, hand.from)
  settle(game.world)
}

/** A sponge that is full wrings itself out, in the hand or on the cloth, so wiping never stops for a full sponge. Returns what it held, or 0. */
export function wringIfFull(game: Game, id: string): number {
  const sponge = thingById(game.world, id)
  if (!sponge || sponge.kind !== 'sponge' || sponge.on !== null || sponge.tea < holds(sponge) - 1e-9) return 0
  const held = sponge.tea
  sponge.tea = 0
  return held
}

/** How far a brimful cup is carried between two drips, and how much of what it holds each drip is. */
const TRAIL = { every: 0.55, share: 0.005 } as const

/**
 * The thing in the hand goes where the finger takes it. A carried sponge
 * takes up the tea it passes over, and a cup that is full to the brim drips a
 * dot on the cloth every so often, until it is no longer brimful. Returns the
 * tea the sponge took or the cup dripped.
 */
export function carry(game: Game, spot: Spot): number {
  const thing = game.hand ? thingById(game.world, game.hand.id) : undefined
  if (!thing) return 0
  if (thing.kind === 'pot') {
    carryPot(game.pot, game.world, spot)
    return 0
  }
  const from = { x: thing.x, z: thing.z }
  Object.assign(thing, onCloth(spot, 0.3))
  settle(game.world)
  if (thing.kind === 'cup' && thing.tea >= 0.98 * holds(thing)) {
    game.trail += Math.hypot(thing.x - from.x, thing.z - from.z)
    if (game.trail < TRAIL.every) return 0
    game.trail = 0
    // Never less than a dot that can be seen on the cloth.
    const dot = Math.min(thing.tea, Math.max(0.003, TRAIL.share * holds(thing)))
    thing.tea -= dot
    spill(game.world, from, dot)
    return dot
  }
  return thing.kind === 'sponge' ? wipe(game.world, thing.id, thing) : 0
}

/**
 * The thing in the hand is put down at a spot, or on a guest. What comes of
 * it depends on what it is and what it met; the result is named as the grid
 * names it, and anything the grid does not name is a plain setting down.
 */
export function putDown(game: Game, spot: Spot, guest: GuestId | null): HandEvent[] {
  const hand = game.hand
  const thing = hand ? thingById(game.world, hand.id) : undefined
  game.hand = null
  if (!hand || !thing) return []
  const { world } = game
  const events: HandEvent[] = []
  const put = (result: string, onto: string | null = null, flow: Flow | null = null) => events.push({ type: 'put', id: thing.id, kind: thing.kind, result, onto, guest, flow })
  const guests = guestCircles(game)
  // The pot's stand on the tray is the pot's: nothing else is set down on it, so the pot always has somewhere to go.
  const kept = [...guests, { x: TRAY.pot.x, z: TRAY.pot.z, r: 1.02 }]
  // Beside the spot, in the nearest free room; on a table too full to take it anywhere, back where it was picked up.
  const beside = (near: Spot) => Object.assign(thing, freeSpot(world, thing, near, kept) ?? hand.from)
  const met = guest ? undefined : thingAt(world, spot, thing.id)
  /** A pot that stands where a place is being laid hops out of the way, to the nearest free room. */
  const potMakesRoom = () => {
    const { pot } = game
    // Where it stands, or where it is going if it is in the air: a hop is sent on to free room before it lands.
    const stands = pot.hop ? { x: pot.hop.toX, z: pot.hop.toZ } : pot
    if (pot.carried || clearOf(world, stands, 1.0, potCircles(game))) return
    const room = roomFor(world, stands, potCircles(game))
    if (pot.hop) Object.assign(pot.hop, { toX: room.x, toZ: room.z })
    else pot.hop = { fromX: pot.x, fromZ: pot.z, toX: room.x, toZ: room.z, fromHeading: pot.heading, toHeading: pot.heading, t: 0 }
    pot.over = null
    game.overGuest = null
  }

  if (thing.kind === 'pot') {
    // The pot is kept in front of the guests, so it is on a guest when its spout is over one.
    guest = guest ?? (game.pot.over === null ? guestAt(game, spoutSpot(game.pot)) : null)
    // On a table so full that it has nowhere to stand before that guest, short of the guests' row, it is let go like
    // any other pot there: set down on the nearest free spot in front of the places.
    if (guest && stationFor({ x: seatOf(game, guest).x, z: seatOf(game, guest).z + 0.5 }, world, potCircles(game)).short) guest = null
    if (guest) {
      const seat = seatOf(game, guest)
      put('drink-from-spout')
      // Still in the hand as it sets off, so it goes from the height it was carried at.
      events.push(...pours(callTo(game.pot, { x: seat.x, z: seat.z + 0.5 }, null, world, potCircles(game))))
      game.pot.carried = false
      return events
    }
    const bowl = thingById(world, game.pot.over)
    if (bowl && bowl.kind === 'bowl' && bowl.tea > 0) {
      bowl.tea = 0
      put('empty-bowl', bowl.id)
    } else put('set-down', game.pot.over)
    const landed = setDown(game.pot, world, potCircles(game))
    if (landed.some((event) => event.type === 'land')) restPot(game)
    events.push(...pours(landed))
    return events
  }

  if (thing.kind === 'cup') {
    if (guest) {
      // A hat. What was in it runs down onto the cloth by the guest.
      const flow = thing.tea > 0 ? spill(world, { x: seatOf(game, guest).x, z: seatOf(game, guest).z + 1.1 }, thing.tea) : null
      Object.assign(thing, seatOf(game, guest), { tea: 0, heldBy: guest, worn: true })
      put('hat', null, flow)
    } else if (met && met.kind === 'saucer' && !hasCup(world, met)) {
      thing.on = met.id
      put('seat', met.id)
    } else if (met && (met.kind === 'cup' || met.kind === 'bowl' || met.kind === 'pot' || met.kind === 'saucer')) {
      // Tipped in, all of it, and back to where it came from. A cup on a saucer takes it as the cup does.
      const flow = tip(world, thing.id, met.kind === 'saucer' ? world.things.find((cup) => cup.kind === 'cup' && cup.on === met.id)!.id : met.id)
      Object.assign(thing, hand.from)
      put('tip-in', met.id, flow)
    } else {
      const at = placeNear(game, spot, 0.9)
      const saucer = at ? saucerAt(world, placeOf(game, at)) : undefined
      if (saucer && !hasCup(world, saucer)) {
        thing.on = saucer.id
        put('seat', saucer.id)
      } else {
        beside(spot)
        put('set-down')
      }
    }
  } else if (thing.kind === 'saucer') {
    const carries = hasCup(world, thing)
    const loose = !guest && !carries ? world.things.find((cup) => cup.kind === 'cup' && cup.on === null && cup.heldBy === null && far(cup, spot) <= 0.75) : undefined
    const at = placeNear(game, spot, 1.3)
    if (guest) {
      // A flat hat slides off: it ends on the cloth in front of the guest.
      beside({ x: seatOf(game, guest).x + 0.4, z: seatOf(game, guest).z + 1.3 })
      put('flat-hat')
    } else if (!carries && far(spot, TRAY.saucers) <= 1.3) {
      const top = world.things.find((other) => other.kind === 'saucer' && other.id !== thing.id && far(other, TRAY.saucers) < 0.05 && !world.things.some((above) => above.on === other.id))
      if (top || fits(world, thing, TRAY.saucers, [thing.id], guests)) {
        Object.assign(thing, TRAY.saucers, { on: top ? top.id : null })
        put('stack', top ? top.id : null)
      } else {
        beside(spot)
        put('set-down')
      }
    } else if (loose && fits(world, thing, loose, [thing.id, loose.id], guests)) {
      Object.assign(thing, { x: loose.x, z: loose.z })
      loose.on = thing.id
      put('cup-hops-on', loose.id)
    } else if (at && fits(world, thing, placeOf(game, at), [thing.id, 'pot'], guests)) {
      Object.assign(thing, placeOf(game, at))
      put('lay')
      const paw = world.things.find((cup) => cup.kind === 'cup' && cup.heldBy === at && !cup.worn)
      if (paw && !carries) {
        Object.assign(paw, { on: thing.id, heldBy: null })
        events.push({ type: 'set-cup', who: at, cup: paw.id, saucer: thing.id })
        // A pot that stood with its spout over the cup in the paw goes with the cup, to stand beside it on its saucer.
        if (game.pot.over === paw.id && !game.pot.carried && !game.pot.held) events.push(...pours(callTo(game.pot, paw, paw.id, world, potCircles(game))))
      }
      potMakesRoom()
    } else {
      beside(spot)
      put('set-down')
    }
  } else if (thing.kind === 'spoon') {
    if (guest) {
      Object.assign(thing, seatOf(game, guest), { heldBy: guest, worn: true })
      put('nose-balance')
    } else if (met && met.kind === 'cup') {
      thing.on = met.id
      put('stir', met.id)
    } else if (met && met.kind === 'saucer') {
      const cup = world.things.find((other) => other.kind === 'cup' && other.on === met.id)
      // On the cup's side of the saucer it goes in the cup; out on the rim it rests on the saucer.
      if (cup && far(spot, met) < footprint(cup) * 0.8) {
        thing.on = cup.id
        put('stir', cup.id)
      } else {
        thing.on = met.id
        put('rest', met.id)
      }
    } else {
      // By a place the pot is no obstacle to a spoon: it makes room for it, as for a saucer.
      const laying = placeNear(game, spot, SPOON_REACH) !== null
      Object.assign(thing, freeSpot(world, thing, spot, kept, laying ? ['pot'] : []) ?? hand.from)
      put(placeNear(game, thing, SPOON_REACH) ? 'lay' : 'set-down')
      if (laying) potMakesRoom()
    }
  } else if (thing.kind === 'sponge') {
    // A sponge that is let go wrings itself out, so it is never too full to wipe with. Only on a cup does it keep its tea,
    // to give back at a tap; over the bowl it is wrung into the bowl.
    const wrung = (): Flow | null => {
      if (thing.tea <= 0) return null
      const flow: Flow = { into: [{ id: 'tray', amount: thing.tea }], spilled: 0, lost: 0 }
      thing.tea = 0
      return flow
    }
    if (guest) {
      beside({ x: seatOf(game, guest).x - 0.4, z: seatOf(game, guest).z + 1.5 })
      put('wipe-face', null, wrung())
    } else if (met && met.kind === 'bowl') {
      const flow = tip(world, thing.id, met.id)
      beside(spot)
      put('set-down', met.id, flow)
    } else if (met && (met.kind === 'cup' || met.kind === 'saucer')) {
      const from = met.kind === 'saucer' ? world.things.find((cup) => cup.kind === 'cup' && cup.on === met.id) ?? met : met
      dab(world, thing.id, from.id)
      if (from.kind === 'cup') thing.on = from.id
      else beside(spot)
      put('dab', from.id)
    } else {
      beside(spot)
      put('set-down', null, wrung())
    }
  } else {
    beside(spot)
    put('set-down')
  }
  settle(world)
  return events
}

/** Two guests change seats, each with its cup: a cup goes on the saucer at the new place if one lies there, and stays in the paw if not. */
export function swapSeats(game: Game, a: GuestId, b: GuestId): HandEvent[] {
  const guests = game.tea.guests
  const first = guests.find((guest) => guest.who === a), second = guests.find((guest) => guest.who === b)
  if (!first || !second || a === b) return []
  const cups = [cupOf(game.world, a, placeOf(game, a)), cupOf(game.world, b, placeOf(game, b))]
  for (const cup of cups) if (cup) Object.assign(cup, { on: null, heldBy: null })
  game.tea.guests = guests.map((guest) => (guest.who === a ? { ...guest, seat: second.seat } : guest.who === b ? { ...guest, seat: first.seat } : { ...guest }))
  ;[a, b].forEach((who, index) => {
    const cup = cups[index]
    if (!cup) return
    const place = placeOf(game, who)
    const saucer = saucerAt(game.world, place)
    Object.assign(cup, place, saucer && !hasCup(game.world, saucer) ? { on: saucer.id } : { heldBy: who, worn: false })
  })
  settle(game.world)
  // A pot that stands in the guests' row hops out of their way, to the nearest room in front.
  const { pot } = game
  if (!pot.carried && !pot.held && (pot.hop ? pot.hop.toZ : pot.z) - 1.0 < ROW_FRONT) {
    const room = roomFor(game.world, { x: pot.hop ? pot.hop.toX : pot.x, z: POT_ROW_Z }, potCircles(game))
    pot.hop = { fromX: pot.x, fromZ: pot.z, toX: room.x, toZ: room.z, fromHeading: pot.heading, toHeading: pot.heading, t: 0 }
    pot.over = null
    game.overGuest = null
  }
  // Each takes in its new place afresh.
  delete game.seen[a]
  delete game.seen[b]
  return [{ type: 'swap', a, b }]
}
