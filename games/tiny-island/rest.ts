import type { Guidance } from './guidance'
import type { Hush } from './hush'
import type { Island } from './island'

// What a put-away does to the game, apart from stopping its loop and its
// clock. The Mount calls this the moment the game is no longer attended.
//
// The game becomes the game its save loads (`rested` in island.ts), and the
// three things a loaded game does not have are taken away with it: every
// sound that was set to play, the ghost hand's place on its ladder, and a
// turn of the island that storage has not been told of. A game put away and
// returned is then the same as one closed and opened again, to the eye and to
// the ear.

/** The idle ladder, as much of it as a put-away needs. */
type Ladder = { touch(now: number): void; update(now: number): Guidance }

/**
 * `hush` is the gain of the wave's sounds and `all` the gain every sound goes through (hush.ts): both are cut at
 * once, so nothing that was set to sound before the put-away sounds after it, and `all` stays shut until the next
 * touch opens it. The ladder is taken back to its bottom at `seconds` of the attended clock, as a touch takes it.
 * The island that comes back has `dirty` set when it holds something storage has not been handed: the Mount writes it.
 */
export function putAway(island: Island, childAge: number | null, hush: Hush, all: Hush, ladder: Ladder, seconds: number): { island: Island; guidance: Guidance } {
  const rested = island.rested(childAge)
  // Nothing it found as it was made is a change of the child's, and nothing of it sounds.
  rested.sounds.length = 0
  hush.cut()
  all.shutNow()
  ladder.touch(seconds)
  return { island: rested, guidance: ladder.update(seconds) }
}
