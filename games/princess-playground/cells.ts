import { inCompany, lean, placeOf, type Arrangement } from './arrangement'
import type { Deed } from './grid'
import type { Act } from './motion'
import * as v from './voices'
import type { Part } from './voices'
import { FRIENDS, type End, type FriendId } from './world'

// The grid in play: what each friend does, and what is heard, when the child
// has put it somewhere. Pure. The game works out where a friend was put the
// moment the child lets go (`landingOf`), and plays the cell's own motion and
// sound when the friend lands (`reactionsTo`). Nothing here rates anything:
// every cell is a thing that happens.

export type Landing = {
  id: FriendId
  /** Which column of the grid this is. A friend sent onto a level or empty plank counts as landing on a high end that it tips. */
  deed: Exclude<Deed, 'tap'>
  /** The end it landed on, or null in the sand. */
  end: End | null
  /** Its landing changes which end is down. */
  tips: boolean
  /** The plank floats level once it has landed. */
  levels: boolean
  /** The friend it landed on, or null. */
  below: FriendId | null
  /** It is the only one on the plank. */
  alone: boolean
  /** Dot's sense of company, after the landing. */
  company: boolean
  /** The weight now on the end it landed on. */
  weightThere: number
}

export type Reaction = {
  who: FriendId
  /** Seconds after the landing. */
  after: number
  act?: Act
  seconds?: number
  way?: number
  voice?: readonly Part[]
  /** A mark to leave in the sand at the friend's feet. */
  mark?: 'ring'
}

/** Where a friend was put, read from the arrangement before and after the child's move. */
export function landingOf(before: Arrangement, after: Arrangement, id: FriendId): Landing {
  const place = placeOf(after, id)
  const company = inCompany(after)
  if (place.at !== 'end') return { id, deed: 'in-the-sand', end: null, tips: false, levels: false, below: null, alone: false, company, weightThere: 0 }
  // The plank as it lay without this friend: that is what it landed on.
  const without = lean(before, id), now = lean(after)
  const side = place.end === 'right' ? 1 : -1
  const below = place.level > 0 ? after[place.end][place.level - 1] : null
  const deed: Landing['deed'] = below ? 'on-a-friend' : without === side ? 'low-end' : 'high-end'
  const weightThere = after[place.end].reduce((sum, other) => sum + FRIENDS[other].weight, 0)
  return { id, deed, end: place.end, tips: now === side && without !== side, levels: now === 0, below, alone: after.left.length + after.right.length === 1, company, weightThere }
}

const react = (who: FriendId, after: number, rest: Omit<Reaction, 'who' | 'after'>): Reaction => ({ who, after, ...rest })

/** What a friend makes of being landed on: each in its own way. */
function underneath(below: FriendId, by: FriendId): Reaction[] {
  // Under Bo everyone is squashed flat with a wheeze; the body's own squash is the motion model's.
  if (by === 'bo') return [react(below, 0.05, { voice: v.wheeze() })]
  if (below === 'pim') return [react('pim', 0.35, { voice: v.raspberry(), act: 'stamp', seconds: 0.5 })]
  if (below === 'mog') return [react('mog', 0.2, { voice: v.scrunch(), act: 'duck', seconds: 0.5 })]
  if (below === 'bo') return [react('bo', 0.3, { act: 'tall', seconds: 0.9 })]
  return [react('dot', 0.3, { act: 'sway', seconds: 1.2, way: 1 })]
}

/** The cell's own motion and sound for a friend that has just landed where the child put it. */
export function reactionsTo(l: Landing): Reaction[] {
  const out: Reaction[] = []
  const add = (after: number, rest: Omit<Reaction, 'who' | 'after'>) => out.push(react(l.id, after, rest))
  const toward = l.end === 'right' ? -1 : 1
  if (l.below) out.push(...underneath(l.below, l.id))
  switch (l.id) {
    case 'pim':
      if (l.deed === 'low-end') add(0.1, { voice: v.tick(), act: 'stamp', seconds: 0.6 })
      else if (l.deed === 'high-end') add(0.05, l.tips ? { voice: v.clack() } : { voice: v.trill(), act: 'kick', seconds: 1.3 })
      else if (l.deed === 'on-a-friend') add(0.1, { voice: v.crow(), act: 'bounce', seconds: 0.7 })
      else add(0.05, { voice: v.rattle(), act: 'kick', seconds: 0.5 })
      break
    case 'mog':
      if (l.deed === 'low-end') add(0.15, { act: 'spin', seconds: 0.8 })
      else if (l.deed === 'high-end') {
        if (!l.tips) add(0.3, { voice: v.purr(), act: 'tall', seconds: 1.2 })
      } else if (l.deed === 'on-a-friend') add(0.1, { voice: v.knead(), act: 'knead', seconds: 0.7 })
      else add(0.1, { voice: v.scrunch(), act: 'spin', seconds: 0.7 })
      break
    case 'dot':
      if (l.deed === 'low-end') add(0.1, { voice: v.hum(l.alone), act: l.alone ? 'look' : 'sway', seconds: 1, way: toward })
      else if (l.deed === 'high-end') add(0.1, l.tips ? { voice: v.ringOver() } : { voice: v.longNote(), act: 'sway', seconds: 1.4, way: toward })
      else if (l.deed === 'on-a-friend') {
        add(0.15, { voice: v.duet(), act: 'sway', seconds: 1.4, way: 1 })
        if (l.below) out.push(react(l.below, 0.15, { act: 'sway', seconds: 1.4, way: 1 }))
      } else if (l.company) add(0.2, { voice: v.softNote() })
      else add(0.5, { voice: v.scratch(), act: 'spin', seconds: 1.1, mark: 'ring' })
      break
    case 'bo':
      if (l.deed === 'high-end') add(0, l.tips ? { voice: v.slam() } : { voice: v.chirp('bo', 1), act: 'look', seconds: 1.2 })
      // On the low end he digs it deeper into the sand.
      else if (l.deed === 'low-end') add(0.05, { voice: v.crunch(l.weightThere), act: 'sink', seconds: 0.9 })
      else if (l.deed === 'in-the-sand') add(0.2, { voice: v.sigh(), act: 'sink', seconds: 1.1 })
      else if (l.deed === 'on-a-friend') add(0.3, { act: 'sway', seconds: 1.6, way: 1 })
      break
  }
  return out
}

/** What a friend makes of being thrown: Pim loves it, Mog hates it, Bo barely notices. */
export function tossed(id: FriendId, speed: number): Reaction[] {
  if (id === 'pim') return [react('pim', 0, { voice: v.squeal(), act: 'spin', seconds: 0.7 })]
  if (id === 'mog') return [react('mog', 0, { voice: v.yowl() })]
  return [react(id, 0, { voice: v.whoop(id, speed) })]
}

/** The asker has been carried where it wanted: its own delight. */
export function delight(id: FriendId): Reaction[] {
  if (id === 'pim') return [react('pim', 0, { voice: v.squeal(), act: 'spin', seconds: 0.7 })]
  if (id === 'mog') return [react('mog', 0, { voice: v.purr(), act: 'tall', seconds: 1.2 })]
  if (id === 'bo') return [react('bo', 0, { voice: v.chuckle(), act: 'chuckle', seconds: 1 })]
  return [react('dot', 0, { voice: v.hum(false), act: 'spin', seconds: 0.8 })]
}
