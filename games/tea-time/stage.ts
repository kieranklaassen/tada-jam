import type { Hint } from './hint'
import type { Guidance } from './guidance'
import type { Point } from './input'
import { bowlOf, cupOuterR, dishOf } from './forms'
import { CLOTH, GUEST_Z, ROW_FRONT, type Spot } from './layout'
import type { ActionKind } from './motion'
import type { Pot } from './pour'
import type { GuestId, Thing, World } from './world'

// What the game asks of whatever draws it. The game's side (play.ts) knows
// the rules, the finger and the sounds; the view knows three.js. This is the
// whole of what passes between them, so the view can be redone in another
// look without touching a rule, and the game can be tested with a stage that
// draws nothing.

/**
 * How big each kind of guest is, and where things go on it. The view's
 * figures are built to these numbers (figurines.ts), so a hat sits on the
 * head and not in it.
 * - `height` and `girth`: how tall it is with its stool, and how wide.
 * - `hat`: how high the rim of an upturned cup rests, on the widest part of the head it fits over, clear of ears and comb.
 * - `nose`: how high and how far forward the bowl of a spoon is when it is balanced there: on the tip of the nose or the beak, its handle toward the child.
 * - `mouth`: how high and how far forward the foot of a cup is held when it is lifted to drink, clear of the face.
 * - `crown`: how high a flat thing lies when it is balanced on top: on the ears or the comb where there are any.
 * - `walking`: how much room it takes on foot, with its arms, wings, tail or stool.
 */
export const GUEST_SIZE: Record<'bear' | 'mouse' | 'hen' | 'duckling', { height: number; girth: number; hat: number; nose: [number, number]; mouth: [number, number]; crown: number; walking: number }> = {
  bear: { height: 2.9, girth: 1.02, hat: 2.6, nose: [2.2, 1.12], mouth: [1.72, 1.72], crown: 2.95, walking: 1.12 },
  mouse: { height: 2.28, girth: 0.58, hat: 2.16, nose: [1.9, 0.88], mouth: [1.45, 1.42], crown: 2.54, walking: 0.66 },
  hen: { height: 2.06, girth: 0.82, hat: 1.9, nose: [1.72, 0.8], mouth: [1.3, 1.36], crown: 2.3, walking: 0.92 },
  duckling: { height: 1.98, girth: 0.62, hat: 1.6, nose: [1.6, 0.98], mouth: [1.18, 1.36], crown: 1.99, walking: 0.68 },
}

export function sizeOfGuest(who: GuestId): (typeof GUEST_SIZE)['bear'] {
  return GUEST_SIZE[who === 'duckling-a' || who === 'duckling-b' ? 'duckling' : who]
}

/** Where a thing a guest holds, wears or balances is drawn, and where a finger finds it: in the paw before the guest, upturned on the head, or on the nose. For a hat, `y` is the height of its rim. */
export function anchorOf(thing: Thing, seat: Spot, who: GuestId): { x: number; y: number; z: number } {
  const size = sizeOfGuest(who)
  if (!thing.worn) return { x: seat.x, y: 0.75, z: seat.z + size.girth + 0.75 }
  if (thing.kind === 'spoon') return { x: seat.x, y: size.nose[0], z: seat.z + size.nose[1] }
  if (thing.kind === 'saucer') return { x: seat.x, y: size.crown, z: seat.z }
  return { x: seat.x, y: size.hat, z: seat.z }
}

/**
 * How far two guests that change seats bow out of their row to pass each
 * other: the first figure is for the smaller one, toward the child, and the
 * second for the bigger one, toward the wall (negative). Each takes what room
 * there is between the wall and the places; where the two are too wide for
 * that, as the Bear is with anyone, they squeeze past.
 */
export function passingLanes(a: GuestId, b: GuestId): { [who: string]: number } {
  const [small, big] = sizeOfGuest(a).walking <= sizeOfGuest(b).walking ? [a, b] : [b, a]
  const need = sizeOfGuest(small).walking + sizeOfGuest(big).walking + 0.1
  const toWall = Math.max(0, GUEST_Z - (CLOTH.minZ - 1.5) - 0.05 - sizeOfGuest(big).walking)
  const toChild = Math.max(0, ROW_FRONT - GUEST_Z - sizeOfGuest(small).walking)
  const back = Math.min(toWall, (need * toWall) / (toWall + toChild))
  return { [big]: -back, [small]: Math.min(toChild, need - back) }
}

/** One-shot motions of a piece, each a cell of the grid or a moment of a scene. */
/** Things of the table that are sent off together, as when a party leaves, set off one after another: the first after `SENT_FIRST` seconds, each next one when the one before it is there, and `SENT_EVERY` seconds after it at the latest. */
export const SENT_FIRST = 0.2
export const SENT_EVERY = 0.45

export type PieceAct = 'spin' | 'flip' | 'whirl' | 'flash' | 'rattle' | 'hop' | 'fish' | 'glint' | 'slide-in' | 'tip' | 'squirt' | 'skim' | 'stir' | 'toot' | 'arrive'

export type Stage = {
  /** Where a point of the table is on the surface, in its own pixels, and the spot of the cloth under a point of the surface. */
  screenOf(x: number, y: number, z: number): Point
  clothAt(px: number, py: number): Spot
  /** How high and how wide a thing is. */
  sizeOf(id: string): { height: number; girth: number }
  /** Shows the world as it is. With `atOnce` nothing eases in: the table as it was left. */
  showWorld(world: World, guests: readonly { who: GuestId; seat: Spot }[], atOnce: boolean): void
  /** The guests at the table, each at its seat, and the party waiting at the gate. With `atOnce` they are simply there. */
  setParty(guests: readonly { who: GuestId; seat: Spot }[], waiting: readonly GuestId[], atOnce: boolean): void
  /** A guest starts an action of its own, looks at a spot (or at its cup, with null), walks to a spot, or settles. */
  guestDo(who: GuestId, kind: ActionKind): void
  /**
   * A touch on the wall at a point of the surface: the tile under it comes loose for a moment and answers as its
   * picture would. Returns which picture it carries (0 a flower, 1 a fish, 2 a bird, 3 a boat, 4 a tulip), or null
   * where no tile answers: off the wall, and in the corner the grown-ups' overlay is opened from.
   */
  tile(px: number, py: number): number | null
  /** A guest holds an action of this kind, once started, for as long as what causes it lasts; null lets it go, and it plays to its end. */
  guestHold(who: GuestId, kind: ActionKind | null): void
  guestLook(who: GuestId, at: Spot | null): void
  /** With a `lane` the guest walks past the guest named: it steps out of the row toward the child (positive) or the wall (negative), walks along, and steps back in at the spot, so two guests that change seats pass beside each other. */
  guestWalk(who: GuestId, to: Spot, lane?: number, past?: GuestId): void
  /** A guest gets up and walks off along its row, away from the gate, and is gone, taking the cup named with it, held high. If it is wanted again it comes in by the gate like anyone else. */
  guestLeave(who: GuestId, cup?: string | null): void
  /** Whether every guest of the party is at its seat: nobody is still on its way in. */
  guestsSeated(): boolean
  /** A guest is simply settled, as at a table that was put away after its sitting ended: no motion plays. */
  guestSettled(who: GuestId): void
  /** Every guest's actions end at once: a touch ended a scene. */
  guestsRest(): void
  /** A piece squashes and rings on its spring, or plays a motion of its own. */
  nudge(id: string, strength: number): void
  act(id: string, act: PieceAct): void
  /** The thing in the hand rides above the table; null sets it down. */
  lift(id: string | null): void
  /** A cup is lifted toward a guest's mouth: `amount` 0 on its saucer to 1 at the mouth, tipped by `tilt` radians. With `toward` it is held out to that point instead. Null lets it go. */
  hold(id: string, who: GuestId | null, amount: number, tilt: number, toward?: { x: number; y: number; z: number } | null): void
  /** The tea drawn in a cup while a guest drinks it, which the world has already taken; null shows the world's own. */
  showTea(id: string, amount: number | null): void
  leanPot(x: number, z: number): void
  /** A thing leans after the finger before it follows it: a share of its own width, toward where the finger has gone. Zeros let it stand. */
  lean(id: string, x: number, z: number): void
  /** Tea flies: a ring where it lands on a thing or at a point, and `drops` drops flung out as far as `reach`. With no reach, one drop falls straight down from there. */
  splash(on: string | { x: number; y: number; z: number }, reach: number, drops: number): void
  /** Tea runs down the outside of a cup that is over its rim, from the rim to what the cup stands on. */
  runOver(id: string): void
  /** A drop leaves the spout for where the tea lands; the stream fans out there or not. */
  drop(to: { x: number; y: number; z: number }): void
  fan(on: boolean): void
  /** One frame. `stream` is where the tea lands, or null; `hint` is what an idle child is shown. */
  frame(dt: number, world: World, pot: Pot, stream: { x: number; y: number; z: number } | null, guidance: Guidance, hint: Hint | null): { drawCalls: number; triangles: number }
}

/** Half the length of a spoon's bowl, and how far its handle runs from the middle of the bowl (props.ts, `spoonGeometry`). */
const SPOON_BOWL = 0.29
const SPOON_HANDLE = 1.08
/** Half the width of its bowl. */
const SPOON_WIDE = 0.215

/**
 * Where a spoon rests on a cup or a saucer, from the middle of that thing's
 * foot: how far to the side, how high and how far toward the child the
 * middle of its bowl is, and how far its handle is tipped up.
 */
export function spoonRest(under: Thing, cupOn: Thing | undefined): { x: number; y: number; z: number; tip: number } {
  if (under.kind === 'cup') {
    const cup = bowlOf(under.size)
    // A cup too narrow for the bowl of the spoon carries it across its rim, nearly level.
    if (cup.rimR < SPOON_BOWL + 0.08) return { x: 0, y: cup.rimY - 0.02, z: -0.1, tip: 0.1 }
    // Its bowl on the floor of the cup, its handle up over the rim on the child's side: tipped just far enough to clear the rim.
    let tip = 0.4, y = 0
    for (let i = 0; i < 4; i++) {
      y = cup.floorY + SPOON_BOWL * Math.sin(tip) + 0.04
      tip = Math.atan((cup.rimY + 0.03 - y - 0.07) / cup.rimR)
    }
    return { x: 0, y, z: 0, tip }
  }
  const dish = dishOf(under.size)
  // How high the top of the saucer is at a distance from its middle.
  const top = (r: number) => (r >= dish.rimR - 0.03 ? dish.rimY + 0.03 : 0.035 + dish.rimY * (Math.max(0, r - dish.wellR) / (dish.rimR - 0.03 - dish.wellR)) ** 2)
  // In the middle of an empty saucer; beside the cup that stands on a laid one, across the rim and clear of the
  // cup's wall, which swells out above its foot. It lies along the saucer with its middle over the saucer's, so
  // neither end hangs out further than the other, and as high as the saucer is under its ends.
  const half = (SPOON_BOWL + SPOON_HANDLE) / 2
  if (!cupOn) return { x: 0, y: top(half) - 0.035 + 0.012, z: SPOON_BOWL - half, tip: 0 }
  const y = dish.rimY + 0.03 - 0.035 + 0.012
  // The cup stands in the well of the saucer; the top of the spoon's bowl is 0.125 above where the spoon is put.
  const cupFoot = 0.041 * Math.cbrt(dish.holds / 0.2)
  return { x: cupOuterR(bowlOf(cupOn.size), y + 0.125 - cupFoot) + SPOON_WIDE + 0.05, y, z: SPOON_BOWL - half, tip: 0 }
}

/** How long a touched tile is loose. */
export const TILE_SECONDS = 0.9

/**
 * What a touched tile does while it is loose, `t` from 0 to 1, as its picture
 * would: the flower turns once round, the fish wriggles, the bird hops twice,
 * the boat rocks, the tulip nods. It comes off the wall toward the child as it
 * does, which is its `scale`; `turn` is in radians, and `x` and `y` are in
 * tiles. At every moment it is big enough to cover the still tile behind it.
 */
export function tileMotion(picture: number, t: number): { turn: number; x: number; y: number; scale: number } {
  const u = Math.min(1, Math.max(0, t))
  const up = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / 0.18), off = up * up * (3 - 2 * up)
  // The part of the time it is fully off the wall, 0 to 1: what it does, it does then.
  const w = Math.min(1, Math.max(0, (u - 0.12) / 0.7)), ease = w * w * (3 - 2 * w)
  switch (picture) {
    case 0: return { turn: Math.PI * 2 * ease, x: 0, y: 0, scale: 1 + 0.45 * off }
    case 1: return { turn: 0.1 * Math.sin(Math.PI * 6 * w) * Math.sin(Math.PI * w), x: 0.05 * Math.sin(Math.PI * 3 * w) * Math.sin(Math.PI * w), y: 0, scale: 1 + 0.26 * off }
    case 2: return { turn: 0, x: 0, y: 0.07 * Math.abs(Math.sin(Math.PI * 2 * w)), scale: 1 + 0.18 * off }
    case 3: return { turn: 0.14 * Math.sin(Math.PI * 4 * w) * (1 - w), x: 0, y: 0, scale: 1 + 0.17 * off }
    default: return { turn: 0.12 * Math.sin(Math.PI * 2 * w) * (1 - 0.5 * w), x: 0, y: 0, scale: 1 + 0.16 * off }
  }
}
