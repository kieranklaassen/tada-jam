import type { Kind } from './cloth'
import type { FriendKind } from './layout'
import { below, type Rng } from './rng'

// The friends' fixed tastes, as pure rules. A taste belongs to the kind of
// friend and never changes, so a child can learn it and test it on purpose:
//
//   pig    likes things tight and likes water; a loose thing trips it
//   heron  hates wet and likes long things; a tight thing makes it stiff
//   goat   likes soap and hates the smell of mud; hangs things on its horns
//
// Every answer is to the exact thing the child made: this garment, this wet,
// this muddy, on this body. None is about the child.

/** How a garment sits on a body. */
export type Fit = 'tight' | 'loose' | 'long' | 'short' | 'fits'

const FITS: Record<FriendKind, Record<Kind, Fit>> = {
  pig: { sock: 'tight', hat: 'tight', scarf: 'tight', shirt: 'tight', jumper: 'loose', dungarees: 'loose' },
  heron: { sock: 'tight', hat: 'tight', scarf: 'long', shirt: 'fits', jumper: 'fits', dungarees: 'long' },
  goat: { sock: 'fits', hat: 'fits', scarf: 'fits', shirt: 'fits', jumper: 'fits', dungarees: 'short' },
}

export function fitOf(friend: FriendKind, garment: Kind): Fit {
  return FITS[friend][garment]
}

/** Where on a body a garment can go. */
export type Wear = 'ear' | 'foot' | 'tail' | 'beak' | 'horn' | 'eyes' | 'snout' | 'neck' | 'belly' | 'horns' | 'torso' | 'legs'

/** The places each garment fits on each body; the first is where it goes when nobody chose. */
const WEARS: Record<FriendKind, Record<Kind, readonly Wear[]>> = {
  pig: { sock: ['ear', 'foot', 'tail'], hat: ['eyes', 'snout'], scarf: ['neck', 'belly'], shirt: ['torso'], jumper: ['torso'], dungarees: ['legs'] },
  heron: { sock: ['beak', 'foot'], hat: ['eyes', 'beak'], scarf: ['neck', 'belly'], shirt: ['torso'], jumper: ['torso'], dungarees: ['legs'] },
  goat: { sock: ['horn', 'ear', 'tail'], hat: ['eyes', 'snout'], scarf: ['horns', 'neck', 'belly'], shirt: ['torso'], jumper: ['torso'], dungarees: ['legs'] },
}

export function wearsOf(friend: FriendKind, garment: Kind): readonly Wear[] {
  return WEARS[friend][garment]
}

/**
 * Where each place is on a body, from its feet and at the size it is stitched at: the part it belongs to (so it
 * moves with that part), its middle, how large the garment is drawn there and how far it is turned.
 */
export type Anchor = { part: 'legs' | 'body' | 'head'; x: number; y: number; size: number; turn: number }

const ANCHORS: Record<FriendKind, Partial<Record<Wear, Anchor>>> = {
  pig: {
    ear: { part: 'head', x: -52, y: -130, size: 64, turn: -0.5 },
    foot: { part: 'legs', x: 38, y: -22, size: 70, turn: 0 },
    tail: { part: 'body', x: -112, y: -150, size: 60, turn: 1.4 },
    eyes: { part: 'head', x: 0, y: -112, size: 150, turn: 0 },
    snout: { part: 'head', x: 0, y: -52, size: 92, turn: 0 },
    neck: { part: 'body', x: 0, y: -248, size: 150, turn: 0 },
    belly: { part: 'body', x: 0, y: -160, size: 216, turn: 0 },
    torso: { part: 'body', x: 0, y: -168, size: 236, turn: 0 },
    legs: { part: 'body', x: 0, y: -92, size: 232, turn: 0 },
  },
  heron: {
    beak: { part: 'head', x: -64, y: 6, size: 62, turn: 1.45 },
    foot: { part: 'legs', x: -17, y: -22, size: 60, turn: 0 },
    eyes: { part: 'head', x: -2, y: -20, size: 84, turn: 0 },
    neck: { part: 'body', x: -4, y: -330, size: 110, turn: 0 },
    belly: { part: 'body', x: 0, y: -236, size: 150, turn: 0 },
    torso: { part: 'body', x: 0, y: -252, size: 176, turn: 0 },
    legs: { part: 'body', x: 0, y: -128, size: 190, turn: 0 },
  },
  goat: {
    horn: { part: 'head', x: 62, y: -146, size: 62, turn: 0.5 },
    ear: { part: 'head', x: -74, y: -62, size: 60, turn: -1.2 },
    tail: { part: 'body', x: 96, y: -138, size: 58, turn: -1.3 },
    eyes: { part: 'head', x: 0, y: -92, size: 128, turn: 0 },
    snout: { part: 'head', x: 0, y: -26, size: 88, turn: 0 },
    horns: { part: 'head', x: 0, y: -136, size: 170, turn: 0 },
    neck: { part: 'body', x: 0, y: -252, size: 140, turn: 0 },
    belly: { part: 'body', x: 0, y: -150, size: 200, turn: 0 },
    torso: { part: 'body', x: 0, y: -170, size: 216, turn: 0 },
    legs: { part: 'body', x: 0, y: -96, size: 214, turn: 0 },
  },
}

/** Where the head's own pivot is, from the feet, for each kind: an anchor on the head is given from there. */
export const HEAD_AT: Record<FriendKind, { x: number; y: number }> = { pig: { x: 0, y: -252 }, heron: { x: -34, y: -390 }, goat: { x: 0, y: -262 } }

export function anchorOf(friend: FriendKind, wear: Wear): Anchor {
  return ANCHORS[friend][wear] ?? ANCHORS[friend].torso!
}

/** The middle of a place on a friend that stands still with its feet at (0, 0), at the size it is stitched at. */
export function anchorAtRest(friend: FriendKind, wear: Wear): { x: number; y: number } {
  const anchor = anchorOf(friend, wear)
  return anchor.part === 'head' ? { x: HEAD_AT[friend].x + anchor.x, y: HEAD_AT[friend].y + anchor.y } : { x: anchor.x, y: anchor.y }
}

/** Of the places a garment fits on a body, the one nearest to where the child let go of it. `dx`, `dy` are from the feet, at the stitched size. */
export function wearNear(friend: FriendKind, garment: Kind, dx: number, dy: number): Wear {
  let best = wearsOf(friend, garment)[0], bestFar = Infinity
  for (const wear of wearsOf(friend, garment)) {
    const at = anchorAtRest(friend, wear), far = Math.hypot(at.x - dx, at.y - dy)
    if (far < bestFar) { best = wear; bestFar = far }
  }
  return best
}

/** What a friend makes of what it wears. */
export type Mood =
  | 'strut' | 'trip' // the pig, in a tight thing and in a loose one
  | 'plank' | 'preen' | 'shudder' // the heron, in a tight thing, in a long dry one, in a wet one
  | 'lick' | 'sneeze' | 'pleased' // the goat, with soap, with mud, with a thing on its horns
  | 'patch' | 'squelch' | 'bubbly' | 'proud' // any of them: mud, wet, suds, and clean and dry and to its taste

/** What state a garment is in, as a friend meets it. `mud` is in steps, the rest in tenths. */
export type Made = { mud: number; wet: number; suds: number }

export const DAMP = 2
export const SOAPY = 2

/**
 * A friend's answer to a garment as it is: first what its taste says, then what the garment's state says. The
 * second is null when the first has said it all. `likes` is whether the friend is pleased with it on the whole.
 */
export function opinion(friend: FriendKind, garment: Kind, wear: Wear, made: Made): { first: Mood; second: Mood | null; likes: boolean } {
  const fit = fitOf(friend, garment)
  const muddy = made.mud > 0, wet = made.wet > DAMP, soapy = made.suds > SOAPY
  const clean = !muddy && !wet && !soapy
  const state: Mood | null = muddy ? 'patch' : wet ? 'squelch' : soapy ? 'bubbly' : null
  if (friend === 'pig') {
    // Tight is good and loose is not, whatever state the thing is in; wet does not trouble a pig.
    if (fit === 'loose') return { first: 'trip', second: state, likes: false }
    return { first: 'strut', second: clean ? 'proud' : state, likes: !muddy }
  }
  if (friend === 'heron') {
    // Wet comes first, and nothing makes up for it.
    if (wet) return { first: 'shudder', second: muddy ? 'patch' : null, likes: false }
    if (fit === 'tight') return { first: 'plank', second: state, likes: false }
    if (fit === 'long') return { first: 'preen', second: clean ? 'proud' : state, likes: !muddy }
    return clean ? { first: 'proud', second: null, likes: true } : { first: state!, second: null, likes: false }
  }
  // The goat: mud is the one thing it cannot bear, soap the thing it likes best, and horns are for hanging things on.
  if (muddy) return { first: 'sneeze', second: soapy ? 'lick' : null, likes: false }
  if (soapy) return { first: 'lick', second: wear === 'horn' || wear === 'horns' ? 'pleased' : null, likes: true }
  if (wear === 'horn' || wear === 'horns') return { first: 'pleased', second: wet ? 'squelch' : 'proud', likes: true }
  return wet ? { first: 'squelch', second: null, likes: true } : { first: 'proud', second: null, likes: true }
}

// --- The mud on a friend's own hide -----------------------------------------

/** A friend's hide as a coarse grid over its body, each cell 0 (clean) to 3 (caked). */
export const HIDE_COLS = 4
export const HIDE_ROWS = 5
export const HIDE_CELLS = HIDE_COLS * HIDE_ROWS

export function cleanHide(): number[] {
  return new Array<number>(HIDE_CELLS).fill(0)
}

/** A friend as it comes up the lane: seven to nine muddy cells, wherever they fall. */
export function muddyHide(rng: Rng): number[] {
  const hide = cleanHide()
  const count = 7 + below(rng, 3)
  for (let n = 0; n < count; n++) hide[below(rng, HIDE_CELLS)] = 1 + below(rng, 3)
  return hide
}

/** A rub at a point of the hide's unit box: the cells under the finger and beside it lose one step. Returns how many did. */
export function rubHide(hide: number[], u: number, v: number): number {
  let lifted = 0
  for (let i = 0; i < HIDE_CELLS; i++) {
    if (hide[i] <= 0) continue
    const cu = ((i % HIDE_COLS) + 0.5) / HIDE_COLS, cv = (Math.floor(i / HIDE_COLS) + 0.5) / HIDE_ROWS
    if (Math.abs(cu - u) > 0.3 || Math.abs(cv - v) > 0.25) continue
    hide[i] -= 1
    lifted += 1
  }
  return lifted
}

export function encodeHide(hide: readonly number[]): string {
  return hide.map((level) => String(Math.max(0, Math.min(3, Math.round(level))))).join('')
}

export function decodeHide(raw: unknown): number[] | null {
  if (typeof raw !== 'string' || raw.length !== HIDE_CELLS || !/^[0-3]+$/.test(raw)) return null
  return Array.from(raw, Number)
}
