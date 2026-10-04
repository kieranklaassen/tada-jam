import { bowlOf } from './forms'
import { TRAY, placeSpot, seatSpot, type Spot } from './layout'
import { partyFor, setTable } from './order'
import type { Showing } from './party'
import { POUR, clearOf, restingPot, roomFor, spoutSpot, step, thingUnder, type Circle, type Pot, type PourEvent } from './pour'
import { anchorOf, sizeOfGuest } from './stage'
import { deserializeTea, serializeTea, type StoredTea, type TeaState } from './save'
import { noteLift, noteOf, outcomeOf, seatParty, sittingEnded } from './sitting'
import { finishCycle, type CycleOutcome } from './state'
import { cupOf, drink, judgeLift, twinOf, type Lift, type Why } from './tastes'
import { puddled, thingById, type GuestId, type Thing, type World } from './world'

// The game as rules, with no renderer and no clock: the table, the pot, the
// guests and what each of them finds in its cup. The Mount's side gives it
// the seconds to play and the acts of a finger (hands.ts), and it says what
// happened; the view and the sounds follow from that.
//
// A guest gives no sign while tea is running. It lifts its cup when the cup
// has been left alone for a moment, finds the tea as it is, and what it finds
// is noted by the rules of sitting.ts. It reacts once to a state of its cup
// and again only when something has changed, so nothing nags.

/** Seconds a cup must be left alone before its guest lifts it. */
export const LIFT_AFTER = 0.3

export type GameEvent =
  | { type: 'pour'; event: PourEvent }
  /** A guest lifted its cup and found this. `had` is the tea that was in the cup; if the guest drinks, the cup is already empty in the world. `licked` is the tea the Bear takes from his saucer after a cup to his taste. */
  | { type: 'lift'; who: GuestId; cup: string; lift: Lift; had: number; licked: number }
  /** A guest cannot drink yet, and looks at what is missing. */
  | { type: 'waits'; who: GuestId; why: Why }
  /** The sponge or the bowl comes out of the tray: a tool appears when it means something. */
  | { type: 'tool'; which: 'sponge' | 'bowl' }
  /** Every guest has drunk a cup to its taste: the sitting is over, the position has moved, and the next party is laid out. */
  | { type: 'ended'; outcome: CycleOutcome }

export type Game = {
  /** What is saved. Its `things` and `puddles` are the world's own lists. */
  tea: TeaState
  world: World
  pot: Pot
  /** The sponge and the bowl while they are still in the tray: kept out of the world, so nothing pours into them or picks them up. */
  away: Thing[]
  /** The thing in the child's hand, and where it was picked up: a save puts it back there. */
  hand: { id: string; from: Pick<Thing, 'x' | 'z' | 'on' | 'heldBy' | 'worn'> } | null
  /** The position and the seed as they were when the sitting on the table ended: until the guests have clinked, the sitting is stored as not yet ended, so a put-away before the clink does not lose it. */
  unended: { position: string; seed: number } | null
  /** How far the cup in the hand has been carried since it last dripped: a brimful cup leaves a dotted trail. */
  trail: number
  /** The guest under the spout, when the pot was brought to a guest. */
  overGuest: GuestId | null
  /** What each guest last reacted to. Not saved: on load every guest takes in its cup afresh, without a scene. */
  seen: Partial<Record<GuestId, string>>
  /** Seconds since the tea in each cup last changed, and what it was. Not saved. */
  still: Record<string, number>
  /** The cup whose tea last rose: the one that was poured into last. Not stored: null at a table that has just been opened. */
  gained: string | null
  lastTea: Record<string, number>
}

/** The idea a guest shows once at each position where something is new. */
const SHOWS: Partial<Record<string, Showing>> = { brim: 'pour', 'lay-a-place': 'lay', halfway: 'halfway', twins: 'twins', 'whose-cup': 'sizes' }

export function seatOf(game: Game, who: GuestId): Spot {
  const guest = game.tea.guests.find((candidate) => candidate.who === who)
  return seatSpot(game.tea.guests.length, guest ? guest.seat : 0)
}

export function placeOf(game: Game, who: GuestId): Spot {
  const guest = game.tea.guests.find((candidate) => candidate.who === who)
  return placeSpot(game.tea.guests.length, guest ? guest.seat : 0)
}

/** The room each guest takes at its seat: nothing is set down in it, and the pot never stands in it. */
export function guestCircles(game: Game): Circle[] {
  return game.tea.guests.map((guest) => ({ ...seatSpot(game.tea.guests.length, guest.seat), r: sizeOfGuest(guest.who).girth + 0.12 }))
}

/** Where a thing is as the table is drawn: a cup in a paw is where the paw holds it, before the guest, and not at the place it will stand at. */
function drawnAt(guests: TeaState['guests'], thing: Thing): Spot {
  const holder = thing.heldBy !== null ? guests.find((guest) => guest.who === thing.heldBy) : undefined
  return holder ? anchorOf(thing, seatSpot(guests.length, holder.seat), holder.who) : thing
}

/**
 * What the pot's spout is over, as the table is drawn: a cup in a guest's paw
 * where the paw holds it, else whatever stands under the spout. What a guest
 * wears is out of the stream's way.
 */
export function underSpout(game: Game): string | null {
  const spot = spoutSpot(game.pot)
  for (const thing of game.world.things) {
    if (thing.kind !== 'cup' || thing.heldBy === null || thing.worn) continue
    const at = drawnAt(game.tea.guests, thing)
    if (Math.hypot(at.x - spot.x, at.z - spot.z) <= bowlOf(thing.size).rimR * 1.15) return thing.id
  }
  return thingUnder(game.world, spot)
}

/** Where a cup in a paw is, for the pot to be called to it. */
export function pawSpot(game: Game, cup: Thing): Spot {
  const at = drawnAt(game.tea.guests, cup)
  return { x: at.x, z: at.z }
}

/** The pot as it stands on a loaded table: facing the thing it stands beside, or the middle of the table. */
function potOf(world: World, guests: TeaState['guests']): Pot {
  const thing = world.things.find((candidate) => candidate.kind === 'pot')
  const at = thing ?? TRAY.pot
  // On its stand on the tray it faces the middle of the table and is by no cup. Anywhere else it faces the cup it stands
  // nearest to within its reach, at whatever distance it had to stand.
  let beside: Spot | undefined, bestFar = Infinity
  const onStand = Math.hypot(at.x - TRAY.pot.x, at.z - TRAY.pot.z) < 0.05
  for (const candidate of world.things) {
    if (onStand || candidate.kind !== 'cup' || (candidate.heldBy !== null && candidate.worn)) continue
    const where = drawnAt(guests, candidate)
    const far = Math.hypot(where.x - at.x, where.z - at.z)
    if (far >= POUR.reach - 0.35 && far <= POUR.farthest && (!beside || far < bestFar)) {
      beside = where
      bestFar = far
    }
  }
  const pot = restingPot(at, beside ? Math.atan2(beside.z - at.z, beside.x - at.x) : Math.atan2(0.2 - at.z, -at.x))
  if (beside) pot.reach = bestFar
  return pot
}

function build(tea: TeaState): Game {
  const away = tea.things.filter((thing) => (thing.kind === 'sponge' && !tea.tools.sponge) || (thing.kind === 'bowl' && !tea.tools.bowl))
  tea.things = tea.things.filter((thing) => !away.includes(thing))
  const world: World = { things: tea.things, puddles: tea.puddles }
  const game: Game = { tea, world, pot: potOf(world, tea.guests), away, hand: null, unended: null, trail: 0, overGuest: null, seen: {}, still: {}, gained: null, lastTea: {} }
  // On its stand on the tray the pot is by no cup; anywhere else it is over what its spout is over.
  game.pot.over = Math.hypot(game.pot.x - TRAY.pot.x, game.pot.z - TRAY.pot.z) < 0.05 ? null : underSpout(game)
  // Every guest takes in what it had already found before the load, so nothing plays again: what it lacks, and a cup
  // that was too little or too much. A cup that is to its taste and was not drunk yet is still to be lifted: the table
  // was put away between the pour and the sip, and the sip has not happened.
  for (const guest of tea.guests) {
    const { found, mark } = signature(game, guest.who)
    // What has not happened yet is still to come: a cup the guest will drink, and a cup with too much (or of the
    // wrong size) that it has not yet been noted for. It was put away between the pour and the lift.
    const toCome = !('waits' in found) && (found.drinks || (guest.note === null && noteOf(found) === 'not-to-taste'))
    if (!toCome) game.seen[guest.who] = mark
  }
  for (const thing of world.things) if (thing.kind === 'cup') game.lastTea[thing.id] = thing.tea
  return game
}

/** Opens the game from whatever the slot held. `seed`, when given, is the visit's own seed for a table that has never been played. */
export function openGame(raw: unknown, childAge: number | null, seed?: number): Game {
  const tea = deserializeTea(raw, childAge)
  const fresh = typeof raw !== 'object' || raw === null
  if (fresh && seed !== undefined && Number.isFinite(seed) && Math.floor(seed) !== 0) tea.seed = Math.floor(Math.abs(seed)) % 2147483647 || 1
  return build(tea)
}

/** What goes to storage: everything at rest. The thing in the hand lies where it was picked up, the pot stands where it stood or where its hop ends, and the tools in the tray are in the list. */
export function stored(game: Game): StoredTea {
  const things = [...game.world.things, ...game.away].map((thing) => ({ ...thing }))
  if (game.hand) {
    const held = things.find((thing) => thing.id === game.hand!.id)
    if (held) Object.assign(held, game.hand.from)
  }
  const pot = things.find((thing) => thing.kind === 'pot')
  if (pot && !(game.hand && game.hand.id === pot.id)) {
    pot.x = game.pot.hop ? game.pot.hop.toX : game.pot.x
    pot.z = game.pot.hop ? game.pot.hop.toZ : game.pot.z
  }
  return serializeTea({ ...game.tea, things })
}

/** The pot has come to rest: the pot among the things stands where the pot stands, and its spout is over a guest or not. */
export function restPot(game: Game): void {
  const thing = game.world.things.find((candidate) => candidate.kind === 'pot')
  if (thing) Object.assign(thing, { x: game.pot.x, z: game.pot.z })
  aim(game)
}

/** What the pot would pour on now, taken from where everything is drawn: the thing under its spout, or the guest it is held out to. */
export function aim(game: Game): void {
  game.pot.over = underSpout(game)
  game.overGuest = game.pot.over === null ? guestAt(game, spoutSpot(game.pot)) : null
}

/**
 * What the pot keeps clear of besides the things on the cloth: every guest,
 * and the room before each guest where it lifts its cup to drink, so a cup
 * at a mouth never meets the pot.
 */
export function potCircles(game: Game): Circle[] {
  return [...guestCircles(game), ...game.tea.guests.map((guest) => {
    const seat = seatSpot(game.tea.guests.length, guest.seat)
    return { x: seat.x, z: seat.z + sizeOfGuest(guest.who).mouth[1], r: 0.62, air: true }
  })]
}

/** A tool comes out of the tray and into the world. */
function bring(game: Game, which: 'sponge' | 'bowl', events: GameEvent[]): void {
  if (game.tea.tools[which]) return
  game.tea.tools[which] = true
  const tool = game.away.find((thing) => thing.kind === which)
  if (tool) {
    game.away.splice(game.away.indexOf(tool), 1)
    game.world.things.push(tool)
  }
  events.push({ type: 'tool', which })
}

/** What a guest would find now, and a mark of it: the guest reacts when the mark changes. */
function signature(game: Game, who: GuestId): { found: Lift | { waits: Why }; cup: Thing | undefined; mark: string } {
  const place = placeOf(game, who)
  const twin = twinOf(who)
  const twinAtTable = twin !== null && game.tea.guests.some((guest) => guest.who === twin)
  const found = judgeLift(game.world, who, place, twinAtTable ? placeOf(game, twin) : undefined, game.gained)
  const cup = cupOf(game.world, who, place)
  // A Duckling's cup is news whenever its twin's changes: the two look at both cups, and lift together.
  const other = twinAtTable ? cupOf(game.world, twin, placeOf(game, twin)) : undefined
  const mark = 'waits' in found ? `w:${found.waits}:${cup ? cup.id : ''}` : `l:${cup ? cup.id : ''}:${Math.round((cup ? cup.tea : 0) * 100)}:${found.taste}:${found.details.join()}${other ? `:${Math.round(other.tea * 100)}` : ''}`
  return { found, cup, mark }
}

/** The guest whose seat the spot is at, if any: what the pot's spout is over when it is brought to a guest. */
export function guestAt(game: Game, spot: Spot, reach = 1.0): GuestId | null {
  let best: GuestId | null = null, bestFar = reach
  for (const guest of game.tea.guests) {
    const seat = seatSpot(game.tea.guests.length, guest.seat)
    const far = Math.hypot(seat.x - spot.x, seat.z + 0.5 - spot.z)
    if (far <= bestFar) {
      best = guest.who
      bestFar = far
    }
  }
  return best
}

/**
 * Plays `dt` seconds. `busy` holds the guests who are in the middle of a scene
 * and must not start another. Returns what happened, in order.
 */
export function tick(game: Game, dt: number, busy: ReadonlySet<GuestId> = new Set()): GameEvent[] {
  const events: GameEvent[] = []
  if (dt <= 0) return events
  const { world, pot, tea } = game
  // The Bear gulps what is poured at him; on anyone else it runs off onto the cloth.
  pot.gulped = game.overGuest === 'bear'
  for (const event of step(pot, world, dt)) {
    events.push({ type: 'pour', event })
    if (event.type !== 'land') continue
    // It never comes to rest in anything: if something was put where it was going while it was in the air, it hops on
    // to the nearest free room.
    if (!clearOf(world, pot, 1.0, potCircles(game))) {
      const room = roomFor(world, pot, potCircles(game))
      pot.hop = { fromX: pot.x, fromZ: pot.z, toX: room.x, toZ: room.z, fromHeading: pot.heading, toHeading: pot.heading, t: 0 }
      pot.over = null
      game.overGuest = null
      events.push({ type: 'pour', event: { type: 'hop' } })
    } else restPot(game)
  }
  for (const thing of world.things) {
    if (thing.kind !== 'cup') continue
    const changed = Math.abs((game.lastTea[thing.id] ?? 0) - thing.tea) > 1e-9
    if (thing.tea > (game.lastTea[thing.id] ?? 0) + 1e-9) game.gained = thing.id
    game.still[thing.id] = changed ? 0 : (game.still[thing.id] ?? LIFT_AFTER) + dt
    game.lastTea[thing.id] = thing.tea
  }
  if (puddled(world) > 0.005 || world.things.some((thing) => thing.kind === 'saucer' && thing.tea > 0.005)) bring(game, 'sponge', events)
  if (tea.finished) return events
  // Everyone whose cup has news is judged on the table as it stands, before anyone drinks: the Ducklings look at each
  // other's cups, and one that drank first would leave the other an empty cup to compare with.
  const leftAlone = (cup: Thing | undefined) => !cup || !((game.still[cup.id] ?? LIFT_AFTER) < LIFT_AFTER || game.hand?.id === cup.id || (pot.over === cup.id && (pot.held || pot.flow > 0 || pot.tilt > 0 || pot.dripIn !== null)))
  const due: (ReturnType<typeof signature> & { who: GuestId })[] = []
  for (const guest of tea.guests) {
    if (busy.has(guest.who)) continue
    const judged = signature(game, guest.who)
    if (judged.mark === game.seen[guest.who] || !leftAlone(judged.cup)) continue
    // A Duckling lifts with its twin or not at all: both cups have been left alone, neither is in the middle of
    // something, and the twin is not waiting for its place to be laid or its cloth to be dry.
    const twin = twinOf(guest.who)
    if (twin !== null && tea.guests.some((other) => other.who === twin)) {
      const theirs = signature(game, twin)
      if (busy.has(twin) || !leftAlone(theirs.cup) || (!('waits' in judged.found) && 'waits' in theirs.found)) continue
    }
    due.push({ who: guest.who, ...judged })
  }
  const drank: GuestId[] = []
  for (const { who, found, cup, mark } of due) {
    const guest = { who }
    game.seen[guest.who] = mark
    if ('waits' in found) {
      // An empty cup is the ordinary want, shown by how the guest sits; it is not an event.
      if (found.waits !== 'cup-empty') events.push({ type: 'waits', who: guest.who, why: found.waits })
      continue
    }
    if (!cup) continue
    tea.guests = noteLift(tea.guests, guest.who, found)
    const had = cup.tea
    if (found.taste === 'over') bring(game, 'bowl', events)
    if (found.drinks) {
      drink(world, cup.id)
      game.lastTea[cup.id] = 0
      drank.push(guest.who)
    }
    // The Bear likes tea in the saucer too, and licks it up after a cup to his taste.
    const saucer = thingById(world, cup.on)
    let licked = 0
    if (guest.who === 'bear' && found.taste === 'right' && saucer && saucer.kind === 'saucer') {
      licked = saucer.tea
      saucer.tea = 0
    }
    events.push({ type: 'lift', who: guest.who, cup: cup.id, lift: found, had, licked })
  }
  // The empty cups are taken in at once: a guest that has drunk does not then find its cup, or its twin's, empty as news.
  for (const who of drank) game.seen[who] = signature(game, who).mark
  if (sittingEnded(tea.guests)) {
    const outcome = outcomeOf(tea.guests)
    game.unended = { position: tea.position, seed: tea.seed }
    Object.assign(tea, finishCycle(tea, outcome))
    const laid = partyFor(tea.position, tea.seed)
    tea.waiting = laid.party
    tea.seed = laid.seed
    events.push({ type: 'ended', outcome })
  }
  return events
}

/**
 * The child touched the gate: the seated guests leave with their cups, having
 * put the saucers and spoons back, and the waiting party sits down to a table
 * laid as its position lays it. The cloth keeps its puddles, and the tools
 * that have come out stay out. Returns false, and changes nothing, unless a
 * sitting has ended and a party waits.
 */
export function nextSitting(game: Game): boolean {
  const { tea } = game
  if (!tea.finished || !tea.waiting) return false
  const party = tea.waiting
  // A child who has been through a sitting has poured: the pour is not shown to it afterwards.
  if (!tea.shown.includes('pour')) tea.shown = [...tea.shown, 'pour']
  const laid = setTable(party)
  tea.things = laid.things
  tea.guests = seatParty(party)
  tea.finished = false
  tea.waiting = null
  const from = { x: game.pot.hop ? game.pot.hop.toX : game.pot.x, z: game.pot.hop ? game.pot.hop.toZ : game.pot.z, heading: game.pot.heading }
  const next = build(tea)
  // The new guests take in their places once they have sat down, so each shows what it still lacks.
  next.seen = {}
  // The pot hops from where it stood to the first cup of the new table.
  const to = next.pot
  if (Math.hypot(to.x - from.x, to.z - from.z) > 0.05) {
    to.hop = { fromX: from.x, fromZ: from.z, toX: to.x, toZ: to.z, fromHeading: from.heading, toHeading: to.heading, t: 0 }
    to.x = from.x
    to.z = from.z
    to.heading = from.heading
  }
  Object.assign(game, next)
  return true
}

/** The idea a guest has still to show at this sitting, or null: only at a sitting nobody has touched yet, and only once ever. */
export function dueShowing(game: Game): Showing | null {
  if (game.tea.finished) return null
  const untouched = game.tea.guests.every((guest) => guest.note === null && !guest.content) && game.world.things.every((thing) => thing.kind === 'pot' || thing.tea === 0)
  // The pour is shown once to every child, wherever its first visit starts: a child who starts further on sees it at
  // its first table, before the idea of that table. Then the idea of the position, once.
  const first = game.tea.guests[0]
  if (untouched && !game.tea.shown.includes('pour') && first && cupOf(game.world, first.who, placeOf(game, first.who))) return 'pour'
  const idea = SHOWS[game.tea.position]
  if (!idea || game.tea.shown.includes(idea)) return null
  if (idea === 'lay') {
    // A place is shown being laid only before any place has been laid: every cup still in its guest's paw, and every
    // saucer still on the stack.
    const inPaws = game.tea.guests.every((guest) => game.world.things.some((thing) => thing.kind === 'cup' && thing.heldBy === guest.who && !thing.worn))
    const stacked = game.world.things.every((thing) => thing.kind !== 'saucer' || Math.hypot(thing.x - TRAY.saucers.x, thing.z - TRAY.saucers.z) < 0.05)
    return inPaws && stacked && game.hand === null ? 'lay' : null
  }
  return untouched ? idea : null
}

/** The showing has started: its mark is stored, so it never plays again. */
export function markShown(game: Game, idea: Showing): void {
  if (!game.tea.shown.includes(idea)) game.tea.shown = [...game.tea.shown, idea]
}

/** The guest who shows an idea: the first at the table who can. */
export function showerOf(game: Game, idea: Showing): GuestId {
  const at = (who: GuestId) => game.tea.guests.some((guest) => guest.who === who)
  if (idea === 'halfway' && at('hen')) return 'hen'
  if (idea === 'twins' && at('duckling-a')) return 'duckling-a'
  if (idea === 'sizes' && at('mouse')) return 'mouse'
  return game.tea.guests[0].who
}

export { thingById }
