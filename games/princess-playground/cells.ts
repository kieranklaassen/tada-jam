import { companyOf, lean, placeOf, type Arrangement } from './arrangement'
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
  /**
   * Which column of the grid this is. The end that is down always holds someone, so a friend sent onto the low end
   * lands on a head there: that is the low-end column, and the one below answers as it does to anyone on its head.
   * A head on an end that is up or level is the on-a-friend column. A friend sent onto a level or empty plank
   * counts as landing on a high end that it tips.
   */
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
  /** Everyone else on the plank, on either end, after the landing. */
  others: readonly FriendId[]
  /** Whoever stands in the sand within a body's width of where it was set down. Empty on the plank. */
  near?: readonly FriendId[]
}

export type Reaction = {
  who: FriendId
  /** Seconds after the landing. */
  after: number
  act?: Act
  seconds?: number
  way?: number
  voice?: readonly Part[]
  /** A mark to leave in the sand at the friend's feet, or sand to let run off the low end of the board. */
  mark?: 'swirl' | 'trickle' | 'settle'
  /** A slow blink of this many seconds. */
  blink?: number
  /** The friend it turns to as it does this. */
  toward?: FriendId
  /** The plank is shaken this hard, as a chuckle shakes it. */
  rock?: number
}

/** Where a friend was put, read from the arrangement before and after the child's move. */
export function landingOf(before: Arrangement, after: Arrangement, id: FriendId): Landing {
  const place = placeOf(after, id)
  const company = companyOf(after).length > 0
  const others = [...after.left, ...after.right].filter((other) => other !== id)
  if (place.at !== 'end') return { id, deed: 'in-the-sand', end: null, tips: false, levels: false, below: null, alone: false, company, weightThere: 0, others, near: place.at === 'sand' ? companyOf(after, id) : [] }
  // The plank as it lay without this friend: that is what it landed on.
  const without = lean(before, id), now = lean(after)
  const side = place.end === 'right' ? 1 : -1
  const below = place.level > 0 ? after[place.end][place.level - 1] : null
  const deed: Landing['deed'] = without === side ? 'low-end' : below ? 'on-a-friend' : 'high-end'
  const weightThere = after[place.end].reduce((sum, other) => sum + FRIENDS[other].weight, 0)
  return { id, deed, end: place.end, tips: now === side && without !== side, levels: now === 0, below, alone: after.left.length + after.right.length === 1, company, weightThere, others }
}

/** How hard each beat of Bo's chuckle pushes the plank. */
export const CHUCKLE_ROCK = 0.4

const react = (who: FriendId, after: number, rest: Omit<Reaction, 'who' | 'after'>): Reaction => ({ who, after, ...rest })

/** What a friend makes of being landed on: each in its own way. */
export function underneath(below: FriendId, by: FriendId): Reaction[] {
  // Under Bo everyone is squashed flat with a wheeze first; the body's own squash is the motion model's. Then each
  // says what it always says to being underneath, a little later than under anyone lighter.
  const out: Reaction[] = by === 'bo' ? [react(below, 0.05, { voice: v.wheeze() })] : []
  const late = by === 'bo' ? 0.25 : 0
  // Pim underneath: cheeks out and a raspberry.
  if (below === 'pim') out.push(react('pim', 0.35 + late, { voice: v.raspberry(), act: 'puff', seconds: 0.6 }))
  // Mog underneath: he ducks, ears flat, and hisses. Under Bo he is flat already.
  else if (below === 'mog') out.push(react('mog', 0.2 + late, by === 'bo' ? { voice: v.spit() } : { voice: v.spit(), act: 'duck', seconds: 0.5 }))
  // Bo underneath holds very still, proud: he only draws himself up.
  else if (below === 'bo') out.push(react('bo', 0.3, { act: 'tall', seconds: 0.9 }))
  // Dot underneath hums its duet with whoever is over it, and sways.
  else out.push(react('dot', 0.3 + late, { voice: v.duet(), act: 'sway', seconds: 1.2, way: 1 }))
  return out
}

/** The cell's own motion and sound for a friend that has just landed where the child put it. */
export function reactionsTo(l: Landing): Reaction[] {
  const out: Reaction[] = []
  const add = (after: number, rest: Omit<Reaction, 'who' | 'after'>) => out.push(react(l.id, after, rest))
  const toward = l.end === 'right' ? -1 : 1
  if (l.below) out.push(...underneath(l.below, l.id))
  // It made the two ends the same: nobody is up and nobody is down. The plank floats, and everyone on it hums and
  // sways, which is the level plank's own answer and the newcomer's too; only the greeting of Dot is added.
  if (l.levels && l.deed === 'high-end') {
    if (l.id === 'dot') l.others.forEach((other, index) => out.push(react(other, 0.25 + index * 0.12, { act: 'greet', seconds: 0.7, toward: 'dot' })))
    return out
  }
  switch (l.id) {
    case 'pim':
      if (l.deed === 'low-end') {
        // On top of someone she crows, as always; then, cross that nothing moved, a tiny tick and she stamps.
        add(0.1, { voice: v.crow(), act: 'bounce', seconds: 0.5 })
        add(0.65, { voice: v.tick(), act: 'stamp', seconds: 0.6 })
      } else if (l.deed === 'high-end') add(0.05, l.tips ? { voice: v.clack() } : { voice: v.trill(), act: 'kick', seconds: 1.3 })
      else if (l.deed === 'on-a-friend') add(0.1, { voice: v.crow(), act: 'bounce', seconds: 0.7 })
      else add(0.05, { voice: v.rattle(), act: 'slip', seconds: 1.1 })
      break
    case 'mog':
      if (l.deed === 'low-end') {
        // He circles once, kneads the head he has landed on, and sits with his purr and his slow blink.
        add(0.15, { act: 'spin', seconds: 0.45 })
        add(0.65, { voice: v.knead(), act: 'knead', seconds: 0.5 })
        add(1.2, { voice: v.purr(), act: 'tall', seconds: 1.2, blink: 0.7 })
      } else if (l.deed === 'high-end') {
        if (!l.tips) add(0.3, { voice: v.purr(), act: 'tall', seconds: 1.2, blink: 0.7 })
      } else if (l.deed === 'on-a-friend') {
        // On top of a stack he kneads the head below, then sits tall with his purr and his slow blink.
        add(0.1, { voice: v.knead(), act: 'knead', seconds: 0.5 })
        add(0.6, { voice: v.purr(), act: 'tall', seconds: 1.2, blink: 0.7 })
      }
      else add(0.1, { voice: v.scrunch(), act: 'spin', seconds: 0.7 })
      break
    case 'dot':
      // The friends already on the plank turn to Dot and bounce, one after another: it is their answer to its coming.
      if (l.end) l.others.forEach((other, index) => { if (other !== l.below) out.push(react(other, 0.25 + index * 0.12, { act: 'greet', seconds: 0.7, toward: 'dot' })) })
      if (l.deed === 'low-end') {
        // A bright two-note hum, and then its duet with the one it has landed on, both swaying.
        add(0.1, { voice: v.hum(false), act: 'sway', seconds: 0.6, way: toward })
        add(0.75, { voice: v.duet(), act: 'sway', seconds: 1.4, way: 1 })
        if (l.below) out.push(react(l.below, 0.75, { act: 'sway', seconds: 1.4, way: 1 }))
      } else if (l.deed === 'high-end') {
        add(0.1, l.tips ? { voice: v.ringOver() } : { voice: v.longNote(), act: 'sway', seconds: 1.4, way: toward })
        // Alone on the plank: the hum dies away, and Dot peeks over at the others.
        if (l.alone) add(0.7, { voice: v.hum(true), act: 'look', seconds: 1, way: toward })
      } else if (l.deed === 'on-a-friend') {
        add(0.15, { voice: v.duet(), act: 'sway', seconds: 1.4, way: 1 })
        if (l.below) out.push(react(l.below, 0.15, { act: 'sway', seconds: 1.4, way: 1 }))
      } else if (l.company) {
        add(0.2, { voice: v.softNote() })
        // Whoever it was set down beside turns to it and bounces, as those on the plank do.
        ;(l.near ?? []).forEach((other, index) => out.push(react(other, 0.25 + index * 0.12, { act: 'greet', seconds: 0.7, toward: 'dot' })))
      }
      else add(0.5, { voice: v.scratch(), act: 'spin', seconds: 1.1, mark: 'swirl' })
      break
    case 'bo':
      if (l.deed === 'high-end') {
        if (l.tips) add(0, { voice: v.slam() })
        else {
          // High for once: his slow chuckle, which shakes the plank under him.
          add(0.1, { voice: v.chuckle(), act: 'chuckle', seconds: 1, rock: CHUCKLE_ROCK })
        }
      }
      // On the low end he digs it deeper into the sand, and the stack he tops sways.
      else if (l.deed === 'low-end') {
        add(0.05, { voice: v.crunch(l.weightThere), act: 'dig', seconds: 0.55 })
        add(0.65, { act: 'sway', seconds: 1.6, way: 1 })
      }
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

/**
 * A friend finds itself on the end that is up, lifted there by the others: what the two who like being high say to it,
 * every time. Mog sits tall with his purr and slow blink; Bo gives his slow chuckle, which shakes the plank.
 */
export function perched(id: FriendId): Reaction[] {
  if (id === 'mog') return [react('mog', 0.3, { voice: v.purr(), act: 'tall', seconds: 1.2, blink: 0.7 })]
  if (id === 'bo') return [react('bo', 0.3, { voice: v.chuckle(), act: 'chuckle', seconds: 1, rock: CHUCKLE_ROCK })]
  return []
}

/** The asker has been carried where it wanted: its own delight. */
export function delight(id: FriendId): Reaction[] {
  if (id === 'pim') return [react('pim', 0, { voice: v.squeal(), act: 'spin', seconds: 0.7 })]
  if (id === 'mog') return [react('mog', 0, { voice: v.purr(), act: 'tall', seconds: 1.2, blink: 0.7 })]
  if (id === 'bo') return [react('bo', 0, { voice: v.chuckle(), act: 'chuckle', seconds: 1 })]
  return [react('dot', 0, { voice: v.hum(false), act: 'spin', seconds: 0.8 })]
}
