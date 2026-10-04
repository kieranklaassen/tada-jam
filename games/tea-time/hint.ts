import { placeOf, type Game } from './host'
import { TRAY, spoonSpot, type Spot } from './layout'
import { spoutSpot } from './pour'
import { PUDDLE_MINDS, PUDDLE_REACH, cupOf, judgeLift, placeLaid, twinOf } from './tastes'
import { cellSpot, puddleNear, thingById, type GuestId } from './world'

// What an idle child is shown: one thing that can be touched now, and one
// move with it. Pure: it reads the table and names a thing and a move, and
// the view draws the glow and the ghost hand. It shows a move the child could
// make and where things can go, never an amount: the hand that holds the pot
// pours nothing, and no hint says when to let go.

export type Hint =
  /** Tap this thing, or the gate. */
  | { move: 'tap'; on: string; at: Spot }
  /** Press the pot and hold. */
  | { move: 'hold'; on: 'pot'; at: Spot }
  /** Carry this thing to there. */
  | { move: 'carry'; on: string; at: Spot; to: Spot }
  /** Rub this thing to and fro over there. */
  | { move: 'rub'; on: string; at: Spot; to: Spot }

/** Where the gate stands, against the wall at the far left of the table. */
export const GATE: Spot = { x: -6.4, z: -4.2 }
/** The middle of the party that waits before the gate: what the child touches to let it in. */
export const WAITING: Spot = { x: -6.38, z: -3.0 }

/** Where the guest for seat `index` waits: two columns and two rows before the gate, those for the far seats nearest the table, so nobody crosses anybody on the way in. */
export function waitingSpot(index: number): Spot {
  return { x: index >= 2 ? -5.85 : -6.9, z: index % 2 === 1 ? -2.35 : -3.55 }
}

/** The top saucer of the stack on the tray, if any is left there. */
function topOfStack(game: Game): string | null {
  const stack = game.world.things.filter((thing) => thing.kind === 'saucer' && Math.hypot(thing.x - TRAY.saucers.x, thing.z - TRAY.saucers.z) < 0.05)
  const top = stack.find((thing) => !stack.some((above) => above.on === thing.id))
  return top ? top.id : null
}

/** The first wet cell of cloth within reach of a spot. */
function puddleBy(game: Game, spot: Spot, reach: number): Spot | null {
  for (let cell = 0; cell < game.world.puddles.length; cell++) {
    if (game.world.puddles[cell] <= 0) continue
    const middle = cellSpot(cell)
    if (Math.hypot(middle.x - spot.x, middle.z - spot.z) <= reach) return middle
  }
  return null
}

/** The one thing to show now, or null when there is nothing to do but play. In seat order, so the hint does not jump about. */
export function hintFor(game: Game): Hint | null {
  const { world, tea, pot } = game
  if (game.hand) return null
  if (tea.finished) return tea.waiting ? { move: 'tap', on: 'gate', at: WAITING } : null
  const guests = [...tea.guests].sort((a, b) => a.seat - b.seat)
  for (const guest of guests) {
    if (guest.content) continue
    const who: GuestId = guest.who
    const place = placeOf(game, who)
    const cup = cupOf(world, who, place)
    if (!cup) {
      // It came without a cup: one of the plain cups on the tray goes to its place.
      const plain = world.things.find((thing) => thing.kind === 'cup' && thing.owner === null && thing.heldBy === null && thing.on === null && Math.abs(thing.z - TRAY.cups.z) < 0.6)
      if (plain) return { move: 'carry', on: plain.id, at: plain, to: place }
      continue
    }
    const laid = placeLaid(world, who, place)
    if (!laid.saucer) {
      const saucer = topOfStack(game)
      if (saucer) return { move: 'carry', on: saucer, at: TRAY.saucers, to: place }
    }
    // A spoon for every guest, one each, from the row on the tray: no guest drinks at a place that is not laid.
    if (!laid.spoon) {
      const spoon = world.things.find((thing) => thing.kind === 'spoon' && thing.on === null && thing.heldBy === null && Math.abs(thing.z - TRAY.spoons.z) < 0.6)
      if (spoon) return { move: 'carry', on: spoon.id, at: spoon, to: spoonSpot(game.tea.guests.length, guest.seat) }
    }
    if (who === 'mouse' && puddleNear(world, place, PUDDLE_REACH) > PUDDLE_MINDS) {
      const sponge = thingById(world, 'sponge'), wet = puddleBy(game, place, PUDDLE_REACH)
      if (sponge && wet) return { move: sponge.on === null && Math.hypot(sponge.x - wet.x, sponge.z - wet.z) < 0.6 ? 'rub' : 'carry', on: sponge.id, at: sponge, to: wet }
    }
    const twin = twinOf(who)
    const found = judgeLift(world, who, place, twin && tea.guests.some((other) => other.who === twin) ? placeOf(game, twin) : undefined, game.gained)
    if (!('waits' in found) && found.taste === 'over') {
      // Too much: the hand shows where a cup can be emptied, not how much to leave.
      const bowl = thingById(world, 'bowl')
      if (bowl) return { move: 'carry', on: cup.id, at: cup, to: bowl }
    }
    if (!('waits' in found) && found.taste === 'right') continue
    // A Duckling's cup that only waits for its twin's wants nothing itself: the hand goes to the twin's cup.
    if ('waits' in found && found.waits === 'twin-not-poured') continue
    // And so with the fuller of two unequal cups that was filled first: the lower one is the one to add to.
    if (!('waits' in found) && found.taste === 'short' && found.details.includes('twin-has-less')) continue
    // The cup wants tea: bring the pot to it, and then hold the pot.
    if (pot.over !== cup.id || Math.hypot(spoutSpot(pot).x - cup.x, spoutSpot(pot).z - cup.z) > 0.05) return { move: 'tap', on: cup.id, at: cup }
    return { move: 'hold', on: 'pot', at: pot }
  }
  return null
}
