import { dealPair, layOut } from './deal'
import { makeRng, nextSeed } from './rng'
import { MEET } from './rules'
import type { Game } from './save'
import { outcomeOf, showingOf, type Showing } from './showing'
import { beginCycle, finishCycle, type CycleOutcome } from './state'
import { seatFriend, withRibbon, type Seat } from './world'

// A cycle is one customer. The child ends it by pulling the cape off, and
// starts the next by touching the door where the next pair waits. Nothing
// here starts anything by itself, reads a clock or counts a cycle.

/**
 * The child pulled the cape off. The first time in a cycle it is judged, and
 * the position moves one step for the next customer; after that the scene
 * plays again from the hair as it is and nothing is judged. The outcome is
 * part of the game the moment this returns, so a put-away in the middle of
 * the scene loses nothing and the scene does not play again on load.
 */
export function capeOff(game: Game): { game: Game; showing: Showing; judged: CycleOutcome | null } {
  const showing = showingOf(game)
  if (game.cape === 'off') return { game, showing, judged: null }
  if (game.finished) return { game: { ...game, cape: 'off' }, showing, judged: null }
  const judged = outcomeOf(game.lock, game.model)
  const moved = finishCycle(game, judged)
  return { game: { ...game, position: moved.position, finished: moved.finished, cape: 'off' }, showing, judged }
}

/** The child touched the chair: the customer is back under the cape, and its hair stays as cut again. */
export function backUnderCape(game: Game): Game {
  return game.cape === 'off' ? { ...game, cape: 'on' } : game
}

/**
 * The child touched the door. The pair that waited comes in only when the
 * cape is off, so a haircut in progress is never swept away by a stray touch.
 * They are laid out now, from the position as it stands, which is why a
 * position that just moved shows on this very customer.
 */
export function letIn(game: Game): { game: Game; came: boolean } {
  if (game.cape !== 'off') return { game, came: false }
  const rng = makeRng(game.seed)
  const [chair, friend] = game.waiting
  const layout = layOut(game.position, rng)
  const began = beginCycle(game)
  return {
    came: true,
    game: {
      ...game,
      finished: began.finished,
      chair, friend, waiting: dealPair(rng, chair), seed: nextSeed(game.seed),
      lock: layout.lock, model: layout.model, seat: layout.seat, mane: layout.mane, cape: 'on',
      // The pair that leaves takes what it wears. What lies on the floor stays, and the ribbon goes back to its peg.
      clippings: game.clippings.filter((c) => c.on === 'floor'),
      ribbon: game.ribbon ? { len: game.ribbon.len, at: game.ribbon.at === 'floor' ? 'floor' : 'peg' } : null,
    },
  }
}

/** The child sent the friend to the stool or to the bench, at any moment and as often as they like. */
export function sendFriend(game: Game, seat: Seat): Game {
  const seated = seatFriend(game, seat)
  return seated === game ? game : { ...game, seat: seated.seat }
}

/** The three things a character shows once, before the child tries them. */
export type Idea = 'snip' | 'pull' | 'ribbon'

/** What is due to be shown now, in the order it is shown. Nothing is due while the cape is off. */
export function ideasDue(game: Game): Idea[] {
  if (game.cape !== 'on') return []
  const due: Idea[] = []
  if (!game.shown.snip) due.push('snip')
  if (!game.shown.pull && game.lock < game.model - MEET) due.push('pull')
  if (!game.shown.ribbon && game.seat === 'across') due.push('ribbon')
  return due
}

/** A showing has started: it is marked at once, so it is never shown twice. Showing the ribbon brings the ribbon into the salon. */
export function markShown(game: Game, idea: Idea): Game {
  const marked: Game = { ...game, shown: { ...game.shown, [idea]: true } }
  return idea === 'ribbon' ? { ...marked, ribbon: withRibbon(marked).ribbon } : marked
}
