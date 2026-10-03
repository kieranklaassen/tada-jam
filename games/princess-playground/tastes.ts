import { inCompany, lean, placeOf, type Arrangement } from './arrangement'
import type { FriendId } from './world'

// The friends' fixed tastes. Each has one want that can always be seen and a
// few likes and dislikes that never change, so a child can learn them and
// test them on purpose. Pure: what a friend feels follows from the
// arrangement and from what just happened to it, and from nothing else. No
// feeling is about the child, about time, or about how often anything was done.

/** Where a friend finds itself, as it would notice. Several can hold at once. */
export type Situation =
  | 'up' // on the end that is up
  | 'down' // on the end that is down
  | 'level' // on a plank that floats level
  | 'on-top' // sitting on another friend
  | 'underneath' // another friend sits on it
  | 'alone-on-plank' // the only one on the plank
  | 'in-company' // Dot's sense of it: with someone on the plank, or beside someone in the sand
  | 'apart' // not in company
  | 'in-sand' // standing in the sand

/** What can happen to a friend in a moment. */
export type Happening = 'tossed' | 'landed-on' | 'touched' | 'carried' | 'nothing-moved'

export type Feeling = 'likes' | 'dislikes' | 'unmoved'

export type Taste = {
  /** What it always wants, as something in the scene it looks at. */
  wants: 'the-sky' | 'the-highest-seat' | 'the-others' | 'the-high-end'
  likes: readonly (Situation | Happening)[]
  dislikes: readonly (Situation | Happening)[]
}

export const TASTES: Readonly<Record<FriendId, Taste>> = {
  // Pim wants to fly: tossed is the best thing there is, and so is sitting on anyone. Underneath is the worst.
  pim: { wants: 'the-sky', likes: ['tossed', 'on-top', 'up'], dislikes: ['underneath', 'nothing-moved'] },
  // Mog wants a high perch and to be left on it: he hates flying and hates being sat on.
  mog: { wants: 'the-highest-seat', likes: ['up', 'on-top'], dislikes: ['tossed', 'underneath'] },
  // Dot wants to be with the others: company and a touch warm it; being apart turns it pale.
  dot: { wants: 'the-others', likes: ['in-company', 'touched', 'carried'], dislikes: ['apart', 'alone-on-plank'] },
  // Bo wants to go up for once: he is proud to carry friends, and dozes when left alone on the plank.
  bo: { wants: 'the-high-end', likes: ['up', 'underneath'], dislikes: ['alone-on-plank'] },
}

/** Every situation that holds for a friend in an arrangement. */
export function situationsOf(a: Arrangement, id: FriendId): Situation[] {
  const place = placeOf(a, id)
  const out: Situation[] = []
  if (place.at === 'end') {
    const way = lean(a)
    if (way === 0) out.push('level')
    else out.push((way > 0 ? 'right' : 'left') === place.end ? 'down' : 'up')
    const stack = a[place.end]
    if (place.level > 0) out.push('on-top')
    if (place.level < stack.length - 1) out.push('underneath')
    if (a.left.length + a.right.length === 1) out.push('alone-on-plank')
  } else out.push('in-sand')
  out.push(inCompany(a, id) ? 'in-company' : 'apart')
  return out
}

export function feelingAbout(id: FriendId, what: Situation | Happening): Feeling {
  const taste = TASTES[id]
  return taste.likes.includes(what) ? 'likes' : taste.dislikes.includes(what) ? 'dislikes' : 'unmoved'
}

/**
 * How a friend is, standing as it stands: glad if anything it likes holds
 * and nothing it dislikes does, put out if something it dislikes holds.
 * A dislike wins, because it is the funnier thing to see.
 */
export function moodOf(a: Arrangement, id: FriendId): { mood: 'glad' | 'put-out' | 'plain'; about: Situation | null } {
  const situations = situationsOf(a, id)
  const bad = situations.find((s) => feelingAbout(id, s) === 'dislikes')
  if (bad) return { mood: 'put-out', about: bad }
  const good = situations.find((s) => feelingAbout(id, s) === 'likes')
  return good ? { mood: 'glad', about: good } : { mood: 'plain', about: null }
}
