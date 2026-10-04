import type { Ending } from './cycle'
import { CAST, type Customer } from './orders'
import { ruling } from './serve'
import type { Beat } from './scene'
import type { VoiceId } from './voices'

// The game's three short scenes, as lists of timed beats for scene.ts. Each
// beat writes how far it has got into one plain record, the show, which the
// figures read: nothing here draws. A scene's outcome is in the game before
// its first beat starts (cycle.ts applies it at once), so a scene only shows
// what has already happened, and a touch that ends it leaves every number of
// the show at its end, which is the pose the game is found in on load.

/** How far each part of the scene on screen has got, 0 to 1 unless it counts something. */
export type Show = {
  kind: 'serve' | 'showing' | 'glider'
  // The serve.
  /** The lid coming down: it shuts, or bounces on what sticks out. */
  lid: number
  /** The tin lifted to the customer. */
  lift: number
  /** Pieces eaten so far; the part after the point is how far through the next one. */
  bites: number
  /** The customer's body answering these exact pieces. */
  taste: number
  /** Coming to rest with its tin. */
  settle: number
  // The first showing.
  /** The roller dropping from its hook to the rail. */
  drop: number
  /** Equal parts ruled so far along the rail. */
  ruled: number
  /** The ordered parts filling with the fruit's colour, up to the jaw. */
  fill: number
  /** The twins' divider dropping in the middle; for the cat, the beat after which the sign stands between its two tickets. */
  extra: number
  // The glider.
  /** Tries at closing the beak on the fruit: two of them. */
  tries: number
  wings: number
  /** Gliding out of the window, the fruit across its beak. */
  away: number
  feather: number
}

export const restShow = (kind: Show['kind']): Show => ({ kind, lid: 0, lift: 0, bites: 0, taste: 0, settle: 0, drop: 0, ruled: 0, fill: 0, extra: 0, tries: 0, wings: 0, away: 0, feather: 0 })

/** The serve as it is found on load: every beat at its end. `pieces` is how many pieces the customer ate. */
export const servedShow = (pieces: number): Show => ({ ...restShow('serve'), lid: 1, lift: 1, bites: pieces, taste: 1, settle: 1 })

/** A sound a beat makes as it starts. A scene ended by a touch makes none of the sounds it had not reached. */
export type Cue = (id: VoiceId, length?: number, count?: number) => void

/** The most pieces eaten one at a time; the rest go down in one go. */
export const BITES_SHOWN = 6

/**
 * The serve: the ending of a cycle, 4 to 8 seconds. The lid, or the shrug at a lid that will not shut; the tin
 * is lifted; the pieces are eaten one at a time in the order they lie, up to six and then the rest in one go;
 * the taste lands; the customer settles with its tin. A customer fed by hand has no lid and no lift: the piece
 * has gone from the hand to its mouth with a gulp already, and the serve is only its going down, the taste and
 * the settling, about three seconds.
 */
export function serveBeats(show: Show, ending: Ending, cue: Cue): Beat[] {
  const lengths = ending.result.parts.flatMap((part) => part.pieces.map((piece) => piece.length))
  const single = Math.min(lengths.length, BITES_SHOWN)
  // Each customer gulps and speaks in its own throat.
  const who = CAST.indexOf(ending.taste.who)
  const beats: Beat[] = ending.fed
    ? [{ at: 0, lasts: 0, play: () => (show.lid = show.lift = 1) }]
    : [
        { at: 0, lasts: 0, play: () => cue(ending.result.kind === 'fit' ? 'click' : ending.result.kind === 'over' ? 'clang' : 'slide') },
        { at: 0, lasts: 0.5, play: (p) => (show.lid = p) },
        { at: 0.5, lasts: 0.6, play: (p) => (show.lift = p) },
      ]
  let at = ending.fed ? 0.25 : 1.1
  for (let i = 0; i < single; i++) {
    const length = lengths[i]
    if (!ending.fed) beats.push({ at, lasts: 0, play: () => cue('gulp', length, who) })
    beats.push({ at, lasts: 0.6, play: (p) => (show.bites = Math.max(show.bites, i + p)) })
    at += 0.6
  }
  if (lengths.length > single) {
    beats.push({ at, lasts: 0, play: () => cue('gulp', lengths[single], who) })
    beats.push({ at, lasts: 0.8, play: (p) => (show.bites = Math.max(show.bites, single + (lengths.length - single) * p)) })
    at += 0.8
  }
  // The taste is heard as it is seen: a hiccup for every seam, the creak of the twins' pull, a squash for every flattened ant, a sneeze
  // for every crumb. A body that has nothing against these pieces only says so, in its own throat.
  const taste = ending.taste
  beats.push({
    at,
    lasts: 0,
    play: () => {
      if (taste.who === 'pelican' && taste.hiccups > 0) cue('hiccup', undefined, taste.hiccups)
      else if (taste.who === 'twins' && taste.pulled !== null) cue('tug')
      else if (taste.who === 'ants' && taste.flattened.length > 0) cue('squish', undefined, taste.flattened.length)
      else if (taste.who === 'boa' && taste.sneezes > 0) cue('sneeze', undefined, taste.sneezes)
      else cue('babble', undefined, who)
    },
  })
  beats.push({ at, lasts: 1.4, play: (p) => (show.taste = p) })
  beats.push({ at: at + 1.4, lasts: 0.9, play: (p) => (show.settle = p) })
  return beats
}

/**
 * The first showing: 3 to 5 seconds, once for each idea. The roller drops from its hook, runs along the rail
 * under the open tin and rules the whole into its equal parts, one tick a part; the ordered parts fill with the
 * fruit's colour up to the jaw; then the twins' divider drops, or the sign is laid between the cat's two tickets.
 */
export function showingBeats(show: Show, customer: Customer, cue: Cue): Beat[] {
  // Every part along the rail is ruled, one tick each: for an order longer than one fruit, the parts of every fruit it takes.
  const parts = ruling(customer).along
  const ruleFor = Math.max(1.2, Math.min(2.6, parts * 0.25))
  let laid = 0
  const beats: Beat[] = [
    { at: 0, lasts: 0.4, play: (p) => (show.drop = p) },
    {
      at: 0.4,
      lasts: ruleFor,
      // The beat lays ticks as it goes and counts what it has laid, since a touch jumps it to its end.
      play: (p) => {
        show.ruled = parts * p
        while (laid < Math.floor(parts * p + 0.0001)) {
          laid += 1
          cue('rule', undefined, 1)
        }
      },
    },
    { at: 0.4 + ruleFor, lasts: 0.8, play: (p) => (show.fill = p) },
  ]
  const more = customer.who === 'twins' || customer.who === 'cat'
  if (more) beats.push({ at: 1.2 + ruleFor, lasts: 0.5, play: (p) => (show.extra = p) })
  // A last still beat, so the child's piece is seen lying beside the lit parts before anything else happens.
  beats.push({ at: 1.2 + ruleFor + (more ? 0.5 : 0), lasts: 0.6, play: () => {} })
  return beats
}

/**
 * The glider: a secret, about 5 seconds, every time. The beak will not close on a whole fruit; the pelican
 * tries twice; it spreads its wings, tips forward and glides out of the window with the fruit across its beak
 * like a balancing pole; a feather drifts down.
 */
export function gliderBeats(show: Show, cue: Cue): Beat[] {
  return [
    { at: 0, lasts: 0, play: () => cue('castanet') },
    { at: 0, lasts: 1.4, play: (p) => (show.tries = 2 * p) },
    { at: 0.7, lasts: 0, play: () => cue('castanet') },
    { at: 1.4, lasts: 0.8, play: (p) => (show.wings = p) },
    { at: 2.2, lasts: 0, play: () => cue('whistle') },
    { at: 2.2, lasts: 1.6, play: (p) => (show.away = p) },
    { at: 3.8, lasts: 1.2, play: (p) => (show.feather = p) },
  ]
}
