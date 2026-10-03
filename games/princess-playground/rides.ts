import { emptyArrangement, lean, placeOf, putInSand, putOnEnd, type Arrangement } from './arrangement'
import { LADDER, MIXED_WITHIN, MOVES_CAP, WELL_WITHIN } from './config'
import type { CycleOutcome } from './state'
import { FRIEND_IDS, homeOn, otherEnd, type End, type FriendId } from './world'

// The rides: the designed order of the game. A ride is one friend on an end
// who wants to go the other way; it ends when the plank carries that friend
// there. Each kind adds one new thing to the kind before. Pure.

/** The five kinds of ride, in the order they are met. Each is also a position id. */
export const KINDS = ['little-asks', 'middle-asks', 'big-asks', 'near-side', 'high-asks'] as const
export type Kind = (typeof KINDS)[number]

/** The last position: the five kinds in turn. */
export const MIXED = 'any-asks'

/** Turns wrap here: twice round the five kinds, so every kind is met both ways round. */
export const TURNS = 10

export type Ride = {
  kind: Kind
  /** Laid out the other way round: the asker on the right. */
  mirrored: boolean
  asker: FriendId
  /** Where the asker wants to go. */
  asks: 'up' | 'down'
}

type Plan = {
  asker: FriendId
  asks: 'up' | 'down'
  /** On the far end from the asker when the ride opens. */
  opposite: FriendId[]
  /** Standing in the sand on the asker's own side. Everyone else stands on the far side. */
  nearSide: FriendId[]
  /** The fewest moves that take the asker there. */
  fewest: number
}

const PLANS: Readonly<Record<Kind, Plan>> = {
  // Any one friend on the other end sends Pim up.
  'little-asks': { asker: 'pim', asks: 'up', opposite: [], nearSide: [], fewest: 1 },
  // Size matters: Pim is too light for Mog, Dot floats the plank, Bo lifts.
  'middle-asks': { asker: 'mog', asks: 'up', opposite: [], nearSide: [], fewest: 1 },
  // Two together: nobody lifts Bo alone, any two do.
  'big-asks': { asker: 'bo', asks: 'up', opposite: [], nearSide: [], fewest: 2 },
  // Sides matter: Bo stands on Pim's own side, and a tap puts him on her head.
  'near-side': { asker: 'pim', asks: 'up', opposite: [], nearSide: ['bo'], fewest: 1 },
  // Turned round: Pim is up, Bo dozes on the low end, and she wants down.
  'high-asks': { asker: 'pim', asks: 'down', opposite: ['bo'], nearSide: ['mog', 'dot'], fewest: 1 },
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

export function wrapTurn(turn: number): number {
  return ((Math.floor(turn) % TURNS) + TURNS) % TURNS
}

/** The kind of ride a position lays out on a turn. An id this build does not know lays out the first kind. */
export function kindAt(position: string, turn: number): Kind {
  if (position === MIXED) return KINDS[wrapTurn(turn) % KINDS.length]
  return isKind(position) ? position : KINDS[0]
}

export function rideOf(kind: Kind, turn: number): Ride {
  const plan = PLANS[kind]
  return { kind, mirrored: wrapTurn(turn) % 2 === 1, asker: plan.asker, asks: plan.asks }
}

/** The end the asker sits on when the ride opens. */
export function askerEnd(ride: Ride): End {
  return ride.mirrored ? 'right' : 'left'
}

export function fewestMoves(kind: Kind): number {
  return PLANS[kind].fewest
}

/** The ride as it opens: the asker on its end, everyone else in the sand at their places, Dot at the rim. */
export function layout(ride: Ride): Arrangement {
  const plan = PLANS[ride.kind], near = askerEnd(ride), far = otherEnd(near)
  let a = emptyArrangement()
  // Sand first, so the places are the default ones whatever the order.
  for (const id of FRIEND_IDS) a = putInSand(a, id, homeOn(id, plan.nearSide.includes(id) ? near : far))
  a = putOnEnd(a, ride.asker, near)
  for (const id of plan.opposite) a = putOnEnd(a, id, far)
  return a
}

/** The plank carries the asker where it wanted to go: it sits on an end, and that end is up (or down). */
export function wantMet(ride: Ride, a: Arrangement): boolean {
  const place = placeOf(a, ride.asker)
  if (place.at !== 'end') return false
  const way = lean(a)
  if (way === 0) return false
  const low: End = way > 0 ? 'right' : 'left'
  return ride.asks === 'down' ? place.end === low : place.end !== low
}

/** A move: a friend arrived on an end or left one. Carrying a friend from sand to sand is not one. */
export function isMove(before: Arrangement, after: Arrangement): boolean {
  for (const id of FRIEND_IDS) {
    const was = placeOf(before, id), now = placeOf(after, id)
    if ((was.at === 'end') !== (now.at === 'end')) return true
    if (was.at === 'end' && now.at === 'end' && was.end !== now.end) return true
  }
  return false
}

export function countMove(moves: number): number {
  return Math.min(MOVES_CAP, moves + 1)
}

/** How a finished ride went, by how many moves it took beyond the fewest. Most go well. */
export function judge(kind: Kind, moves: number): CycleOutcome {
  const extra = moves - PLANS[kind].fewest
  return extra <= WELL_WITHIN ? 'well' : extra <= MIXED_WITHIN ? 'mixed' : 'badly'
}

/**
 * What a move did, as the world shows it. Nothing here is a verdict: each is
 * a state of the plank that the friends on it then react to.
 * - `there`: the plank carried the asker where it wanted.
 * - `level`: both ends weigh the same and the plank floats.
 * - `wrong-side`: the newcomer landed on the asker's own end, which is now heavier (or, for an asker who wants down, lighter on the far one).
 * - `too-light`: the newcomer sits on the far end and the plank did not turn.
 * - `too-much`: the plank turned, past where the asker wanted.
 * - `none`: the move left the plank as it was.
 */
export type Consequence = 'there' | 'level' | 'wrong-side' | 'too-light' | 'too-much' | 'none'

export function consequence(ride: Ride, before: Arrangement, after: Arrangement): { what: Consequence; where: End | null } {
  if (wantMet(ride, after)) return { what: 'there', where: placeOf(after, ride.asker).at === 'end' ? (placeOf(after, ride.asker) as { end: End }).end : null }
  const asker = placeOf(after, ride.asker)
  const mover = FRIEND_IDS.find((id) => {
    const was = placeOf(before, id), now = placeOf(after, id)
    return now.at === 'end' && (was.at !== 'end' || was.end !== now.end)
  })
  const moved = mover ? (placeOf(after, mover) as { end: End }).end : null
  if (lean(after) === 0 && after.left.length > 0 && after.right.length > 0) return { what: 'level', where: null }
  if (asker.at !== 'end' || !moved) return { what: lean(before) === lean(after) ? 'none' : 'too-much', where: moved }
  if (lean(before) !== lean(after)) return { what: 'too-much', where: moved }
  if (ride.asks === 'up') return { what: moved === asker.end ? 'wrong-side' : 'too-light', where: moved }
  return { what: moved === asker.end ? 'too-light' : 'wrong-side', where: moved }
}

/** The position ids, checked once against the ladder: every kind and the mixed place, in order. */
export function ladderIsWhole(ladder: readonly string[] = LADDER): boolean {
  return ladder.length === KINDS.length + 1 && KINDS.every((kind, index) => ladder[index] === kind) && ladder[KINDS.length] === MIXED
}
