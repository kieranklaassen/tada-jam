import { dealPair, layOut } from './deal'
import { makeRng, nextSeed } from './rng'
import { MEET, MIN_LEN, toLength } from './rules'
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
export function capeOff(game: Game): { game: Game; showing: Showing | null; judged: CycleOutcome | null } {
  const showing = showingOf(game)
  // With nobody in the chair there is no cape to pull.
  if (!showing || game.cape === 'off') return { game, showing, judged: null }
  if (game.finished) return { game: { ...game, cape: 'off' }, showing, judged: null }
  const judged = outcomeOf(game.lock, game.model)
  const moved = finishCycle(game, judged)
  return { game: { ...game, position: moved.position, finished: moved.finished, cape: 'off' }, showing, judged }
}

/** The child touched the chair: the customer is back under the cape, and its hair stays as cut again. An empty chair stays empty. */
export function backUnderCape(game: Game): Game {
  return game.cape === 'off' && game.chair !== null ? { ...game, cape: 'on' } : game
}

/**
 * The child touched the door. The pair that waited comes in only when the
 * cape is off, so a haircut in progress is never swept away by a stray touch.
 * They are laid out now, from the position as it stands, which is why a
 * position that just moved shows on this very customer. Everything the
 * coming-in changes is in the game the moment this returns, so a put-away in
 * the middle of that scene opens with the new pair in place.
 */
export function letIn(game: Game): { game: Game; came: boolean } {
  if (game.cape !== 'off') return { game, came: false }
  const rng = makeRng(game.seed)
  const [chair, friend] = game.waiting
  const layout = layOut(game.position, rng)
  const began = beginCycle(game)
  const ribbon = game.ribbon
  return {
    came: true,
    game: {
      ...game,
      finished: began.finished,
      chair, friend, waiting: dealPair(rng, chair), seed: nextSeed(game.seed),
      lock: layout.lock, model: layout.model, seat: layout.seat, mane: layout.mane, cape: 'on',
      // The pair that goes out wears out of the door what is stuck on their faces. What lies on the floor stays where it lies.
      clippings: game.clippings.filter((c) => c.on === 'floor'),
      // A ribbon that hung beside a lock, in the mane or round a face is back on its peg, at the length it has.
      ribbon: !ribbon ? null : ribbon.at === 'floor' ? ribbon : { len: ribbon.len, at: 'peg' },
    },
  }
}

/** The child sent the friend to the stool or to the bench, at any moment and as often as they like. With nobody in the salon there is no friend to send. */
export function sendFriend(game: Game, seat: Seat): Game {
  if (game.friend === null) return game
  const seated = seatFriend(game, seat)
  return seated === game ? game : { ...game, seat: seated.seat }
}

/** The three things a character shows once, before the child tries them. */
export type Idea = 'snip' | 'pull' | 'ribbon'

/** What is due to be shown now, in the order it is shown. Nothing is due while nobody is under the cape. */
export function ideasDue(game: Game): Idea[] {
  if (game.cape !== 'on' || game.chair === null) return []
  const due: Idea[] = []
  if (!game.shown.snip) due.push('snip')
  if (!game.shown.pull && game.lock < game.model - MEET) due.push('pull')
  if (!game.shown.ribbon && game.seat === 'across') due.push('ribbon')
  return due
}

/** How much longer the customer tugs a tuft when it shows the pull. */
export const SHOWN_PULL = 30

/**
 * A showing has started. Its whole outcome is in the game the moment this
 * returns, so it is never shown twice and a put-away in the middle of it
 * loses nothing: the mark, and what the showing changes. The snip takes the
 * longest tuft of the mane to half its length, which gives fluff and no
 * piece, as in the grid. The pull takes the shortest tuft longer. The ribbon
 * arrives on its peg, as long as a tail. No showing touches the lock or the
 * model: it is a move, never the answer.
 */
export function markShown(game: Game, idea: Idea): Game {
  if (game.shown[idea]) return game
  const marked: Game = { ...game, shown: { ...game.shown, [idea]: true } }
  if (idea === 'ribbon') return { ...marked, ribbon: withRibbon(marked).ribbon }
  if (game.mane.length === 0) return marked
  const pick = idea === 'snip' ? Math.max(...game.mane) : Math.min(...game.mane)
  const tuft = game.mane.indexOf(pick)
  const to = idea === 'snip' ? Math.max(MIN_LEN, Math.round(pick / 2)) : toLength(pick + SHOWN_PULL)
  return { ...marked, mane: game.mane.map((steps, i) => (i === tuft ? to : steps)) }
}
