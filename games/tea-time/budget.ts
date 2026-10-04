import type { Thing } from './world'

// What a frame costs to draw, counted from the model: one draw call for each
// mesh the view makes. The view draws nothing else, so this is the count the
// renderer reports for a table with everything in view, and a test holds the
// fullest table the game can lay under the jam's budget of about 80.
//
// The numbers follow tableView.ts, figurines.ts and guide.ts: change a mesh
// there and change its count here.

/** Draw calls for the setting and for what is always there: cloth, wall, the one tile of it that a touch has loosened, gate, shadows, puddles, ripples, stream, drops, and the guide's glow, hand and steam. */
export const FIXED_DRAWS = 12
/** The pot: its body, its lid, and the fish that swims round it when it is rubbed. */
export const POT_DRAWS = 3
/** Blob shadows the view can lay in its one instanced draw. */
export const SHADOW_BLOBS = 44

/** A guest: body, head, eyes and its funny part, a stool for a small one, and the Mouse's whiskers. */
export function guestDraws(who: string): number {
  return who === 'bear' || who === 'hen' ? 4 : who === 'mouse' ? 6 : 5
}

/** A thing: its glaze, and the tea in a cup or the bowl, or the pool in a saucer. */
export function thingDraws(thing: Thing): number {
  if (thing.kind === 'pot') return POT_DRAWS
  return thing.kind === 'cup' || thing.kind === 'saucer' || thing.kind === 'bowl' ? 2 : 1
}

/** Draw calls of a frame with every thing and every guest in view, each tea surface and pool wet, the stream running and the guide showing. */
export function drawCalls(things: readonly Thing[], guests: readonly string[], waiting: readonly string[]): number {
  return FIXED_DRAWS + things.reduce((sum, thing) => sum + thingDraws(thing), 0) + [...guests, ...waiting].reduce((sum, who) => sum + guestDraws(who), 0)
}

/** The damp marks a carried sponge leaves, each drawn as one more blob. */
export const DAMP_MARKS = 8

/** Shadows a frame lays: the pot, the gate, every guest, every thing that stands on the cloth itself, and the sponge's damp marks. */
export function shadowCount(things: readonly Thing[], guests: number): number {
  return 2 + DAMP_MARKS + guests + things.filter((thing) => thing.kind !== 'pot' && thing.on === null && thing.heldBy === null).length
}
