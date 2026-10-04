// The thirty cells of the grid as motion (ART.md, "The object-by-action
// grid" and "The error as a consequence"): what the animal and the thing do
// when a care thing, or the hand, is given to an animal with a need. grid.ts
// names each cell's motion and voice; this module is the motion itself, as
// timed keys in beats, played in the animal's own beat and ease.
//
// A cell plays ON TOP of the sign (signs.ts). The sign goes on underneath:
// the shiver still shakes, the paw is still held up. A key moves the whole
// sticker from where the sign has it, and may ease any part of the sign to a
// value of its own for a while (the tongue comes out longer, the paw is laid
// in the hand). A cell that does not help starts and ends with nothing of its
// own, so the animal is left showing its need, which the rules have by then
// made one step plainer. The cell that helps has `ends`: from that beat the
// sign fades away, and the animal is left at rest and well.
//
// A frightened animal is never pressed: a wrong thing comes to rest at the
// edge of its hiding place or over it, never on the animal, and its
// trembling never grows. No cell is a cry of pain.
//
// Pure: no renderer, no DOM, no clock.

import type { Species } from './cast'
import { GRID, type Given } from './grid'
import { REST, beatSeconds, ease, type Face, type Pose } from './motion'
import { FITS, type Need } from './needs'
import type { Anchor, CallMood } from './reactions'
import { NO_SHOW, blend, type Show, type Signed } from './signs'

/**
 * Where a thing can be held in a cell: a place on the animal (reactions.ts),
 * the paw that is held up, the edge of the hiding place (on the floor, at the
 * front of the dark under the table), or over the hiding place (on the
 * table's top above it).
 */
export type CellAnchor = Anchor | 'paw' | 'edge' | 'over'

/** A key of the animal's track: at beat `t` the whole sticker has moved this far from where the sign has it, and these parts of the sign have been eased to these values. Parts not named are the sign's own. */
export type CellKey = { t: number } & Pose & { parts?: Partial<Show> }

export type CellThing = { t: number; at: CellAnchor; dx: number; dy: number; rot: number; size: number; front: boolean; ride: number }

/** What is heard and seen at a beat: the cell's own voice (voices.ts), a call of the animal, water drops, a footfall, the lamp dimming a little. */
/**
 * `voice` plays the cell's whole voice. Where the things a voice names happen at different beats, the voice is
 * played in pieces, each at the beat where its thing is drawn: `first` plays its first so many notes, `note` the one
 * note at that place, and `rest` every note from that place on.
 */
export type CellCue = { t: number; voice?: true; first?: number; note?: number; rest?: number; call?: CallMood; drops?: number; thump?: number; dim?: number; /** The cloth goes on rustling. */ rustle?: true }

export type CellTrack = {
  /** The name grid.ts gives this cell's motion. */
  motion: string
  given: Given
  need: Need
  beats: number
  animal: readonly CellKey[]
  /** The thing's own track. Empty for the hand. */
  thing: readonly CellThing[]
  /** Spans of beats in which the animal is out of sight under the thing. */
  hidden: readonly (readonly [number, number])[]
  /** The blanket is spread out, and until this beat it is as large as the animal it covers. */
  open: boolean
  coversUntil: number
  cues: readonly CellCue[]
  /** Only in the cell that helps: the beat from which the sign fades away, over one beat. */
  ends: number | null
}

export const a = (t: number, x: number, y: number, rot: number, sx: number, sy: number, face: Face, parts?: Partial<Show>): CellKey => ({ t, x, y, rot, sx, sy, face, ...(parts ? { parts } : {}) })
export const rest = (t: number, face: Face = 'calm'): CellKey => ({ ...REST, t, face })
export const k = (t: number, at: CellAnchor, dx: number, dy: number, rot = 0, size = 1, front = true, ride = 1): CellThing => ({ t, at, dx, dy, rot, size, front, ride })

export function track(given: Given, need: Need, beats: number, animal: CellKey[], thing: CellThing[], cues: CellCue[], more: Partial<Pick<CellTrack, 'hidden' | 'open' | 'coversUntil' | 'ends'>> = {}): CellTrack {
  return {
    motion: GRID[given][need].motion, given, need, beats,
    animal: [rest(0), ...animal, rest(beats)],
    thing, cues,
    hidden: more.hidden ?? [], open: more.open ?? false, coversUntil: more.coversUntil ?? 0,
    ends: more.ends ?? null,
  }
}

function lerp(from: number, to: number, by: number): number {
  return from + (to - from) * by
}

function around<T extends { t: number }>(keys: readonly T[], at: number): { from: T; to: T; progress: number } {
  let index = 0
  while (index < keys.length - 1 && keys[index + 1].t <= at) index++
  const from = keys[index], to = keys[Math.min(keys.length - 1, index + 1)]
  const span = to.t - from.t
  return { from, to, progress: span > 0 ? Math.min(1, Math.max(0, (at - from.t) / span)) : 1 }
}

export type HeldInCell = { from: CellThing; to: CellThing; by: number; rot: number; size: number; front: boolean; ride: number }

export type SampledCell = {
  done: boolean
  /** The whole sticker's pose and the parts of the sign that show, with the sign underneath taken in. */
  pose: Pose
  show: Show
  hidden: boolean
  thing: HeldInCell | null
  covers: boolean
  /** How much of the sign is still there: 1 until the cell that helps reaches its `ends`, then down to 0 over a beat. */
  signLeft: number
}

/** The parts of the sign with a key's own values laid over them. */
function withParts(base: Show, parts: Partial<Show> | undefined): Show {
  return parts ? { ...base, ...parts } : base
}

/**
 * Where the animal and the thing are `seconds` after the cell began, for
 * this animal, given what its sign shows at this moment.
 */
export function sampleCell(cell: CellTrack, species: Species, seconds: number, signed: Signed): SampledCell {
  const beat = Math.max(0, seconds) / beatSeconds(species)
  const at = Math.min(beat, cell.beats)
  const signLeft = cell.ends === null ? 1 : 1 - Math.min(1, Math.max(0, at - cell.ends))
  // The sign underneath, fading away once the care that fits has landed and done its work.
  const under: Pose = {
    x: signed.pose.x * signLeft, y: signed.pose.y * signLeft, rot: signed.pose.rot * signLeft,
    sx: 1 + (signed.pose.sx - 1) * signLeft, sy: 1 + (signed.pose.sy - 1) * signLeft,
    face: signLeft > 0.5 ? signed.pose.face : 'calm',
  }
  // Where it hides is not a part that fades: the one that hid comes out in the scene that follows.
  const base = blend({ ...NO_SHOW, under: signed.show.under }, signed.show, signLeft)
  const body = around(cell.animal, at)
  const by = ease(species, body.progress)
  const key: Pose = {
    x: lerp(body.from.x, body.to.x, by), y: lerp(body.from.y, body.to.y, by), rot: lerp(body.from.rot, body.to.rot, by),
    sx: lerp(body.from.sx, body.to.sx, by), sy: lerp(body.from.sy, body.to.sy, by),
    face: body.progress > 0 ? body.to.face : body.from.face,
  }
  // A bouncy animal's ease passes its mark; a part of a sign has its range and stays inside it.
  const loose = blend(withParts(base, body.from.parts), withParts(base, body.to.parts), by)
  const within = (value: number, top: number) => Math.min(top, Math.max(0, value))
  const show: Show = { ...loose, arms: within(loose.arms, 1), tongue: within(loose.tongue, 2), burrs: within(loose.burrs, 3), puff: within(loose.puff, 1), shake: within(loose.shake, 1), out: within(loose.out, 1), ears: within(loose.ears, 2), fur: within(loose.fur, 1), rings: within(loose.rings, 1), eyes: within(loose.eyes, 1), eye: within(loose.eye, 1), blink: within(loose.blink, 1), dip: within(loose.dip, 1), reach: within(loose.reach, 1), foot: within(loose.foot, 2) }
  const pose: Pose = { x: under.x + key.x, y: under.y + key.y, rot: under.rot + key.rot, sx: under.sx * key.sx, sy: under.sy * key.sy, face: key.face !== 'calm' ? key.face : under.face }
  let thing: HeldInCell | null = null
  if (cell.thing.length > 0) {
    const held = around(cell.thing, at), along = ease(species, held.progress)
    thing = { from: held.from, to: held.to, by: along, rot: lerp(held.from.rot, held.to.rot, along), size: lerp(held.from.size, held.to.size, along), front: held.progress >= 0.5 ? held.to.front : held.from.front, ride: lerp(held.from.ride, held.to.ride, along) }
  }
  return { done: beat >= cell.beats, pose, show, hidden: cell.hidden.some(([from, to]) => at >= from && at < to), thing, covers: at < cell.coversUntil, signLeft }
}

export function cellLasts(cell: CellTrack, species: Species): number {
  return cell.beats * beatSeconds(species)
}

export function cellCuesBetween(cell: CellTrack, species: Species, before: number, now: number): CellCue[] {
  const beat = beatSeconds(species)
  return cell.cues.filter((cue) => cue.t * beat >= before && cue.t * beat < now)
}

const TURN = Math.PI * 2

// --- The cells ---------------------------------------------------------------
// One track for each of the thirty cells, in the words of the sheet's grid.
// Two were written first as the pattern (the bowl to one that droops, the
// plaster to one that shivers); the rest follow in the same manner.
//
// A key's part is a value of its own, not a change to the sign's, and the
// sign may be at any of its three steps. So a part that must never grow (the
// trembling of the one that hides, the burrs of the one being brushed, the
// shiver of the one being warmed) is only ever set at or below what the
// quietest step shows.

/** Where a thing lies once a cell that did not help is over: the table's left end, beside the animal, to be picked up again. */
const beside = (t: number): CellThing => k(t, 'seat', -150, -6, 0, 1, true, 0)

/**
 * The hind foot of the one that was brushed, thumping the table in bliss: out
 * at its side, lifted and brought down flat. The leg that scratched has
 * stopped; this is not a paw held up, and no sign shows it.
 */
const FOOT_UP: Partial<Show> = { paw: 0, foot: 2 }
const FOOT_DOWN: Partial<Show> = { paw: 0, foot: 1 }

const TRACKS: CellTrack[] = [
  // --- The bowl of water ---

  // The bowl to one that droops. HELPS: a long gulping drink; the ears lift one after the other and the body
  // fills out straight; a hiccup.
  track('bowl', 'thirsty', 7,
    [a(0.5, 0, 12, 0.12, 1, 0.94, 'worn', { tongue: 2, ears: 2 }), a(1, 0, 16, 0.14, 1, 0.92, 'bliss', { tongue: 1, ears: 2 }), a(1.5, 0, 12, 0.12, 1, 0.95, 'bliss', { tongue: 1, ears: 2 }), a(2, 0, 16, 0.14, 1, 0.92, 'bliss', { tongue: 1, ears: 2 }), a(2.5, 0, 12, 0.12, 1, 0.95, 'bliss', { tongue: 1, ears: 2 }), a(3.2, 0, 0, 0, 1, 1.04, 'glad', { tongue: 0, ears: 1 }), a(4, 0, -8, 0, 0.98, 1.07, 'glad', { ears: 1 }), a(4.8, 0, 0, 0, 1, 1, 'glad', { ears: 0 }), a(5.2, 0, -14, 0, 0.97, 1.08, 'wow'), a(5.5, 0, 0, 0, 1.03, 0.95, 'glad'), rest(6.2, 'glad')],
    [k(0, 'lap', 0, -10, 0, 1, true, 0)],
    // The gulps while it drinks; the hiccup when it hiccups.
    [{ t: 0.5, first: 4 }, { t: 3.3, call: 'glad' }, { t: 5.2, rest: 4 }],
    { ends: 3 }),
  // The bowl to one that shivers. One lap and a bigger shiver; the bowl rattles and rings spread in it.
  track('bowl', 'cold', 6,
    [a(0.5, 0, 10, 0.1, 1, 0.94, 'miserable', { tongue: 1 }), a(0.9, 0, 13, 0.12, 1, 0.93, 'miserable', { tongue: 1 }), a(1.3, 0, -5, 0, 0.97, 1.05, 'wow', { tongue: 0, shake: 1, rings: 1 }), a(3.2, 0, 0, 0, 0.97, 1.02, 'miserable', { shake: 1, rings: 1 }), rest(4.4, 'miserable')],
    [k(0, 'lap', 0, -10, 0, 1, true, 0), k(1.3, 'lap', 0, -10, 0, 1, true, 0), k(1.6, 'lap', 4, -10, 0.08, 1, true, 0), k(1.9, 'lap', -4, -10, -0.08, 1, true, 0), k(2.2, 'lap', 4, -10, 0.08, 1, true, 0), k(2.5, 'lap', -4, -10, -0.08, 1, true, 0), k(2.8, 'lap', 3, -10, 0.05, 1, true, 0), k(3.2, 'lap', 0, -10, 0, 1, true, 0), k(4.6, 'lap', 0, -10, 0, 1, true, 0), beside(5.8)],
    [{ t: 0.1, voice: true }, { t: 0.9, drops: 1 }, { t: 1.3, call: 'wow' }]),
  // The bowl to one that limps. The sore paw is dipped in, a cool "aah", shaken dry, and held up again.
  track('bowl', 'sore', 6.5,
    [a(0.5, 0, 0, 0.03, 1, 1.02, 'wow', { paw: 1, pawX: 0, pawY: -36, pawRot: 0.3 }), a(1.1, 4, 6, 0.1, 1, 0.96, 'wow', { paw: 1, pawX: 0, pawY: 12, pawRot: 0, dip: 1 }), a(2.3, 4, 8, 0.1, 1.02, 0.95, 'bliss', { paw: 1, pawX: 0, pawY: 14, pawRot: 0, dip: 1 }), a(2.8, 0, -4, 0, 1, 1.03, 'wow', { paw: 1, pawX: 8, pawY: -36, pawRot: 0.7, dip: 0 }), a(3.05, 0, -4, 0.04, 1, 1.03, 'wow', { paw: 1, pawX: 8, pawY: -36, pawRot: -0.3 }), a(3.3, 0, -4, -0.04, 1, 1.03, 'wow', { paw: 1, pawX: 8, pawY: -36, pawRot: 0.7 }), a(3.55, 0, -4, 0.04, 1, 1.03, 'wow', { paw: 1, pawX: 8, pawY: -36, pawRot: -0.3 }), a(3.8, 0, -2, 0, 1, 1.02, 'wow', { paw: 1, pawX: 8, pawY: -36, pawRot: 0.6 }), a(4.6, 0, 0, 0, 1, 1, 'hurting', { paw: 1, pawX: 0, pawY: -28, pawRot: 0.3 }), rest(5.2, 'hurting')],
    [k(0, 'lap', 0, -10, 0, 1, true, 0), k(5, 'lap', 0, -10, 0, 1, true, 0), beside(6.3)],
    [{ t: 0.1, voice: true }, { t: 1.6, call: 'hum' }, { t: 3.05, drops: 3 }]),
  // The bowl to one that scratches. The scratching leg kicks the bowl; a splash, and a shake that sprays the room.
  track('bowl', 'itchy', 6,
    [a(0.35, 0, 0, 0.06, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -26, pawRot: 0.8 }), a(0.6, 0, 0, -0.04, 1, 1, 'bothered', { paw: 1, pawX: -22, pawY: 0, pawRot: -0.5 }), a(0.9, 14, -10, 0.08, 1, 1.06, 'wow'), a(1.4, 12, 0, 0, 1.05, 0.93, 'wow'), a(1.8, 10, 0, 0.14, 1, 1, 'wow'), a(2.05, 10, 0, -0.14, 1, 1, 'wow'), a(2.3, 8, 0, 0.14, 1, 1, 'wow'), a(2.55, 8, 0, -0.14, 1, 1, 'wow'), a(2.8, 6, 0, 0.12, 1, 1, 'wow'), a(3.05, 6, 0, -0.1, 1, 1, 'wow'), a(3.5, 0, 0, 0, 1.04, 0.97, 'bothered'), a(4.3, 0, 0, 0.05, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -22, pawRot: 0.7 }), rest(4.9, 'bothered')],
    [k(0, 'lap', 0, -10, 0, 1, true, 0), k(0.6, 'lap', 0, -10, 0, 1, true, 0), k(1, 'seat', -70, -70, -0.5, 1, true, 0), k(1.4, 'seat', -112, -6, 0.25, 1, true, 0), k(1.7, 'seat', -112, -6, 0, 1, true, 0), k(4.6, 'seat', -112, -6, 0, 1, true, 0), beside(5.8)],
    [{ t: 0.6, voice: true }, { t: 0.7, drops: 5 }, { t: 0.9, call: 'wow' }, { t: 1.4, thump: 1 }, { t: 1.9, drops: 4 }]),
  // The bowl to one that hides. A tongue comes out of the hiding place for one lap, and the water trembles.
  track('bowl', 'scared', 5.5,
    [a(0.8, 0, 0, 0, 1, 1, 'afraid', { out: 0 }), a(1.6, 0, 0, 0, 1, 1, 'afraid', { out: 0.35 }), a(2.2, 0, 2, 0.04, 1, 0.98, 'afraid', { out: 0.5, tongue: 2 }), a(2.6, 0, 3, 0.05, 1, 0.97, 'afraid', { out: 0.55, tongue: 2, rings: 1 }), a(2.9, 0, 0, 0, 1, 1, 'afraid', { out: 0.1, tongue: 0, rings: 1 }), a(3.6, 0, 0, 0, 1, 1, 'afraid', { out: 0, rings: 1 }), rest(4.4, 'afraid')],
    [k(0, 'edge', 0, 0, 0, 1, true, 0), k(2.6, 'edge', 0, 0, 0, 1, true, 0), k(2.8, 'edge', 0, 0, 0.04, 1, true, 0), k(3, 'edge', 0, 0, -0.04, 1, true, 0), k(3.2, 'edge', 0, 0, 0.03, 1, true, 0), k(3.4, 'edge', 0, 0, -0.02, 1, true, 0), k(3.6, 'edge', 0, 0, 0, 1, true, 0), k(4.2, 'edge', 0, 0, 0, 1, true, 0), beside(5.5)],
    [{ t: 0.2, voice: true }, { t: 2.7, drops: 1 }]),

  // --- The blanket ---

  // The blanket to one that droops. Too warm: faster panting under it, then the animal oozes out from under and
  // lies flat.
  track('blanket', 'thirsty', 7,
    [a(0.4, 0, 0, 0, 1, 0.92, 'worn'), a(0.8, 0, 0, 0, 1.02, 0.97, 'worn'), a(1.2, 0, 0, 0, 1, 0.9, 'worn'), a(1.5, 0, 0, 0, 1.02, 0.97, 'worn'), a(1.8, 0, 0, 0, 1, 0.9, 'worn'), a(2, 0, 0, 0, 1.02, 0.97, 'worn'), a(2.2, 0, 0, 0, 1, 0.9, 'worn'), a(2.4, 0, 0, 0, 1.02, 0.97, 'worn'), a(2.55, 0, 0, 0, 1, 0.9, 'worn'), a(2.7, 0, 0, 0, 1.02, 0.97, 'worn'), a(2.85, 0, 0, 0, 1, 0.9, 'worn'), a(3, 0, 4, 0, 1.05, 0.88, 'worn'), a(4.4, 70, 8, 0.05, 1.15, 0.82, 'worn', { tongue: 2 }), a(5.4, 76, 8, 0.05, 1.18, 0.8, 'worn', { tongue: 2 }), a(6.2, 20, 2, 0, 1.05, 0.95, 'worn', { tongue: 1 })],
    [k(0, 'seat', 0, 0, 0, 1, true, 0), k(3, 'seat', 0, 0, 0, 1, true, 0), k(4.4, 'seat', -20, 0, 0, 0.62, true, 0), k(5.6, 'seat', -20, 0, 0, 0.62, true, 0), beside(6.8)],
    [{ t: 0.1, voice: true }, { t: 4.6, call: 'hum' }],
    { hidden: [[0.4, 3]], open: true, coversUntil: 3.2 }),
  // The blanket to one that shivers. HELPS: the shaking slows and stops, a long warm sigh, pink cheeks, the head
  // pops out.
  track('blanket', 'cold', 8,
    [a(0.5, 0, 0, 0, 1, 0.92, 'miserable'), a(1.8, 0, 0, 0, 1, 0.95, 'miserable', { shake: 0.15 }), a(2.8, 0, 0, 0, 1, 0.97, 'miserable', { shake: 0.06 }), a(3.5, 0, 0, 0, 1, 1, 'calm', { shake: 0, arms: 0, puff: 0 }), a(4.3, 0, 2, 0, 1.05, 0.95, 'bliss', { shake: 0, arms: 0, puff: 0 }), a(4.8, 0, -22, 0, 0.97, 1.1, 'glad', { shake: 0, arms: 0, puff: 0 }), a(5.3, 0, 0, 0, 1.03, 0.96, 'glad'), a(6, 8, 0, 0.07, 1, 1, 'bliss'), a(6.7, -8, 0, -0.07, 1, 1, 'bliss'), rest(7.3, 'glad')],
    [k(0, 'seat', 0, 0), k(4.4, 'seat', 0, 0), k(5.2, 'lap', 0, 30, 0, 0.62)],
    [{ t: 0.1, voice: true }, { t: 3.6, call: 'hum' }, { t: 4.8, call: 'glad' }],
    { hidden: [[0.5, 4.6]], open: true, coversUntil: 4.4, ends: 3.5 }),
  // The blanket to one that limps. Tucked in, but the sore paw sticks out of the blanket and waves.
  track('blanket', 'sore', 6,
    [a(0.5, 0, 4, 0, 1.03, 0.95, 'wow'), a(1.2, 0, 0, 0, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -52, pawRot: 0.2 }), a(1.7, 0, 0, -0.03, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -54, pawRot: 0.8 }), a(2.2, 0, 0, 0.03, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -54, pawRot: -0.3 }), a(2.7, 0, 0, -0.03, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -54, pawRot: 0.8 }), a(3.2, 0, 0, 0.03, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -54, pawRot: -0.3 }), a(3.7, 0, 0, 0, 1, 1, 'wow', { paw: 1, pawX: 22, pawY: -54, pawRot: 0.6 }), a(4.4, 0, 0, 0, 1, 1, 'hurting', { paw: 1, pawX: 0, pawY: -28, pawRot: 0.3 }), rest(5, 'hurting')],
    [k(0, 'lap', 0, 6, 0, 0.95), k(4.4, 'lap', 0, 6, 0, 0.95), beside(5.8)],
    [{ t: 0.1, voice: true }, { t: 1.3, call: 'hum' }],
    { open: true }),
  // The blanket to one that scratches. The lump under it keeps scratching, the blanket bounces and is kicked off.
  track('blanket', 'itchy', 6,
    [a(0.4, 0, 0, 0, 1, 0.9, 'bothered'), a(0.9, 0, 0, 0.1, 1, 0.92, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.7 }), a(1.2, 0, -6, -0.06, 1, 0.96, 'bothered', { paw: 1, pawX: 6, pawY: -8, pawRot: 0.3 }), a(1.5, 0, 0, 0.1, 1, 0.9, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.7 }), a(1.8, 0, -8, -0.06, 1, 0.97, 'bothered', { paw: 1, pawX: 6, pawY: -8, pawRot: 0.3 }), a(2.1, 0, 0, 0.1, 1, 0.9, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.7 }), a(2.4, 0, -8, -0.06, 1, 0.97, 'bothered', { paw: 1, pawX: 6, pawY: -8, pawRot: 0.3 }), a(2.7, 0, 0, 0.1, 1, 0.9, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.7 }), a(3.1, 0, 2, 0, 1.05, 0.88, 'bothered'), a(3.4, 0, -20, 0, 0.96, 1.1, 'wow', { paw: 1, pawX: 14, pawY: -50, pawRot: 1.2 }), a(3.9, 0, 0, 0, 1.03, 0.96, 'wow'), a(4.5, 0, 0, 0.05, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.6 }), rest(5, 'bothered')],
    [k(0, 'seat', 0, 0), k(0.9, 'seat', 0, 0), k(1.2, 'seat', 0, -10), k(1.5, 'seat', 0, 0), k(1.8, 'seat', 0, -12), k(2.1, 'seat', 0, 0), k(2.4, 'seat', 0, -12), k(2.7, 'seat', 0, 0), k(3.2, 'seat', 0, 0), k(3.8, 'seat', -80, -110, -0.8, 0.8, true, 0), k(4.6, 'seat', -140, -30, -0.2, 0.9, true, 0), beside(5.2)],
    [{ t: 0.2, voice: true }, { t: 0.9, thump: 1 }, { t: 1.5, thump: 1 }, { t: 2.1, thump: 1 }, { t: 2.7, thump: 1 }, { t: 3.4, call: 'wow' }],
    { hidden: [[0.4, 3.4]], open: true, coversUntil: 3.4 }),
  // The blanket to one that hides. The blanket settles over the hiding place and the lump under it goes on
  // trembling, no more than before.
  track('blanket', 'scared', 5,
    [a(0.4, 0, 3, 0, 1.03, 0.94, 'afraid', { out: 0 }), a(3.4, 0, 3, 0, 1.03, 0.94, 'afraid', { out: 0 }), rest(4.2, 'afraid')],
    [k(0, 'over', 0, -30, 0.08, 1, true, 0), k(0.8, 'over', 0, 0, 0, 1, true, 0), k(1.6, 'over', 2, 0, 0.02, 1, true, 0), k(2.4, 'over', -2, 0, -0.02, 1, true, 0), k(3.2, 'over', 2, 0, 0.02, 1, true, 0), k(3.6, 'over', 0, 0, 0, 1, true, 0), beside(5)],
    // The rustle does not stop while the blanket moves: it is heard again at every beat until the cloth lies still.
    [{ t: 0.1, voice: true }, { t: 1.4, rustle: true }, { t: 2, rustle: true }, { t: 2.6, rustle: true }, { t: 3.2, rustle: true }],
    { open: true, coversUntil: 0 }),

  // --- The plaster ---

  // The plaster to one that droops. It lands on the hanging tongue; the tongue goes in with it, a sour face, and
  // the tongue comes out longer. The sour face is a shudder up and down: never a tilt one way and the other, which
  // would be a head shaken.
  track('plaster', 'thirsty', 5.5,
    [a(0.4, 0, 0, 0, 1, 1.02, 'wow', { tongue: 1 }), a(1, 0, -4, 0, 0.98, 1.04, 'wow', { tongue: 0 }), a(1.5, 0, 0, 0, 1.06, 0.92, 'wary', { tongue: 0 }), a(1.85, 0, 3, 0, 1.03, 0.96, 'wary', { tongue: 0 }), a(2.2, 0, 0, 0, 1.08, 0.89, 'wary', { tongue: 0 }), a(2.7, 0, 4, 0.1, 1, 0.97, 'wary', { tongue: 2 }), a(4, 0, 4, 0.08, 1, 0.97, 'worn', { tongue: 2 }), rest(4.6, 'worn')],
    // On the tongue it lies along it, at a slant and small: never level across the top of it.
    [k(0, 'mouth', 3, 20, 1.05, 0.62), k(0.6, 'mouth', 3, 20, 1.05, 0.62), k(1, 'mouth', 0, 0, 0.8, 0.2, false), k(2.2, 'mouth', 0, 0, 0.8, 0.2, false), k(2.7, 'mouth', 3, 38, 1.1, 0.62), k(4, 'mouth', 3, 38, 1.1, 0.62), beside(5.3)],
    [{ t: 0.1, voice: true }, { t: 2.7, call: 'wary' }]),
  // The plaster to one that shivers. The shiver shakes it loose and it flaps like a flag, then flutters off.
  track('plaster', 'cold', 5,
    [a(0.4, 0, 0, 0, 1, 1.03, 'wow'), a(1.2, 0, 0, 0, 1, 1, 'miserable', { shake: 1 }), a(2.6, 0, 0, 0, 1, 1, 'miserable', { shake: 1 }), a(3.4, 0, 0, 0, 0.98, 0.97, 'miserable', { arms: 1 }), rest(4.4, 'miserable')],
    [k(0, 'lap', 10, -60, -0.2), k(1, 'lap', 10, -60, -0.2), k(1.4, 'lap', 22, -66, 0.9), k(1.8, 'lap', 20, -62, 0.3), k(2.2, 'lap', 24, -68, 1), k(2.6, 'lap', 22, -64, 0.4), k(3.4, 'seat', -120, -90, -TURN * 0.7, 1, true, 0), k(4.2, 'seat', -150, -6, -TURN, 1, true, 0), beside(4.2)],
    [{ t: 0.1, voice: true }, { t: 0.5, call: 'wow' }]),
  // The plaster to one that limps. HELPS: it goes on the held-up paw; the animal tests the paw, stamps twice and
  // struts.
  track('plaster', 'sore', 8,
    [a(0.4, 0, 0, 0, 1, 1.03, 'wow', { paw: 1, pawX: 8, pawY: -34, pawRot: 0.2 }), a(1.2, 0, 0, 0.04, 1, 1, 'wow', { paw: 1, pawX: 10, pawY: -36, pawRot: 0.5 }), a(2, 0, 0, 0, 1, 1, 'calm', { paw: 1, pawX: 4, pawY: -20, pawRot: 0.2 }), a(2.6, 0, 2, 0, 1, 0.98, 'wow', { paw: 1, pawX: 0, pawY: -2, pawRot: 0 }), a(3, 0, 0, 0, 1, 1.01, 'wow', { paw: 1, pawX: 0, pawY: -12, pawRot: 0.1 }), a(3.4, 0, 2, 0, 1.02, 0.97, 'glad', { paw: 1, pawX: 0, pawY: 0, pawRot: 0 }), a(3.8, 0, -16, 0, 1, 1.05, 'glad'), a(4.1, 0, 2, 0, 1.05, 0.93, 'glad'), a(4.5, 0, -16, 0, 1, 1.05, 'glad'), a(4.8, 0, 2, 0, 1.05, 0.93, 'glad'), a(5.3, 24, -8, 0.07, 1.03, 1.05, 'glad'), a(5.7, 44, 0, 0.05, 1.03, 1.04, 'glad'), a(6.1, 22, -8, -0.07, 1.03, 1.05, 'glad'), a(6.5, 0, 0, -0.04, 1.03, 1.04, 'glad'), rest(7.2, 'glad')],
    // On the paw it is wrapped at a slant, as it will lie when the paw is down: never level across it.
    [k(0, 'paw', 0, 0, 0.9, 0.8), k(0.5, 'paw', 0, 0, 0.5, 0.8)],
    [{ t: 0.1, voice: true }, { t: 0.5, call: 'wow' }, { t: 3.4, call: 'glad' }, { t: 4.1, thump: 1 }, { t: 4.8, thump: 1 }],
    { ends: 2 }),
  // The plaster to one that scratches. The scratching leg sticks to it and the animal hops in a circle on three
  // legs until it pops free. The circle is walked on the table: right, far, left, near.
  track('plaster', 'itchy', 7,
    [a(0.5, 0, 0, 0.06, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -22, pawRot: 0.7 }), a(0.9, 0, 0, 0, 1, 1.04, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(1.3, 28, -32, 0.12, 1, 1.05, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(1.7, 56, 0, 0.1, 1.04, 0.93, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(2.1, 30, -40, 0.05, 0.96, 1, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(2.5, 0, -12, 0, 0.94, 0.9, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(2.9, -30, -40, -0.1, 0.97, 1.02, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(3.3, -56, 0, -0.12, 1.04, 0.93, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(3.7, -28, -30, -0.06, 1, 1.05, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(4.1, 0, 4, 0, 1.05, 0.92, 'wow', { paw: 1, pawX: 12, pawY: -34, pawRot: 1 }), a(4.6, 0, -14, 0, 0.97, 1.08, 'wow', { paw: 1, pawX: 22, pawY: -44, pawRot: 1.4 }), a(5, 0, 0, 0, 1.04, 0.95, 'wow', { paw: 1, pawX: 0, pawY: -10, pawRot: 0.2 }), rest(5.8, 'bothered')],
    [k(0, 'lap', 16, -48, 0.2), k(0.6, 'lap', 16, -48, 0.2), k(0.9, 'paw', 0, 0, 0.3), k(4.6, 'paw', 0, 0, 0.3), k(5, 'seat', -60, -120, -2.5, 1, true, 0), k(5.8, 'seat', -150, -6, -TURN, 1, true, 0), beside(5.8)],
    [{ t: 0.4, voice: true }, { t: 0.9, call: 'wow' }, { t: 1.7, thump: 1 }, { t: 2.5, thump: 1 }, { t: 3.3, thump: 1 }, { t: 4.1, thump: 1 }]),
  // The plaster to one that hides. It lands beside the nose that peeks out; the nose sniffs it and pulls in, and
  // two eyes blink in the dark.
  track('plaster', 'scared', 5,
    [a(0.3, 0, 0, 0, 1, 1, 'afraid', { out: 0.45 }), a(1, 0, 0, 0, 1, 1, 'afraid', { out: 0.5 }), a(1.3, 0, -2, 0, 1, 1.03, 'afraid', { out: 0.55 }), a(1.5, 0, 0, 0, 1, 0.99, 'afraid', { out: 0.5 }), a(1.7, 0, -2, 0, 1, 1.03, 'afraid', { out: 0.56 }), a(1.9, 0, 0, 0, 1, 1, 'afraid', { out: 0.5 }), a(2.3, 0, 0, 0, 1, 1, 'afraid', { out: 0, eyes: 1 }), a(2.9, 0, 0, 0, 1, 0.96, 'afraid', { out: 0, eyes: 1, blink: 1 }), a(3.1, 0, 0, 0, 1, 1, 'afraid', { out: 0, eyes: 1 }), a(3.5, 0, 0, 0, 1, 0.96, 'afraid', { out: 0, eyes: 1, blink: 1 }), a(3.7, 0, 0, 0, 1, 1, 'afraid', { out: 0, eyes: 1 }), a(4.4, 0, 0, 0, 1, 1, 'afraid', { out: 0, eyes: 1 }), rest(4.9, 'afraid')],
    [k(0, 'edge', 18, 0, 0.3, 1, true, 0), k(1.7, 'edge', 18, 0, 0.3, 1, true, 0), k(1.9, 'edge', 22, 0, 0.45, 1, true, 0), k(3.6, 'edge', 22, 0, 0.45, 1, true, 0), beside(5)],
    [{ t: 0.1, voice: true }]),

  // --- The brush ---

  // The brush to one that droops. Brushed flat like a rug, chin on the table, tongue out.
  track('brush', 'thirsty', 6.5,
    [a(0.4, 0, 0, 0, 1.01, 0.99, 'worn'), a(1.2, 0, 4, 0, 1.06, 0.93, 'worn', { tongue: 1 }), a(2.4, 0, 7, 0, 1.12, 0.87, 'worn', { tongue: 2 }), a(3.6, 0, 10, 0.03, 1.18, 0.81, 'worn', { tongue: 2 }), a(5, 0, 10, 0.03, 1.18, 0.81, 'worn', { tongue: 2 }), rest(5.8, 'worn')],
    [k(0, 'head', -50, 0, -0.3), k(1.2, 'head', 50, 4, 0.3), k(2.4, 'head', -50, 8, -0.3), k(3.6, 'head', 50, 12, 0.3), k(5, 'head', 50, 12, 0.3), beside(6.3)],
    [{ t: 0.1, voice: true }, { t: 3.8, call: 'hum' }]),
  // The brush to one that shivers. The fur stands up in a crackling puff and the puff shivers.
  track('brush', 'cold', 5.5,
    [a(0.8, 0, 0, 0, 1, 1, 'miserable'), a(1.1, 0, -6, 0, 1.1, 1.07, 'wow', { arms: 0, shake: 0.3, fur: 1 }), a(1.6, 0, 0, 0, 1.1, 1.06, 'wow', { arms: 0, shake: 0.9, fur: 1 }), a(3.4, 0, 0, 0, 1.09, 1.05, 'miserable', { arms: 0, shake: 1, fur: 1 }), a(4.2, 0, 0, 0, 1.03, 1.01, 'miserable'), rest(4.8, 'miserable')],
    [k(0, 'head', -40, 10, -0.5), k(0.8, 'head', 40, 10, 0.5), k(1.2, 'lap', 0, 0, 0, 1, true, 0), k(4, 'lap', 0, 0, 0, 1, true, 0), beside(5.3)],
    [{ t: 0.3, voice: true }, { t: 1.1, call: 'wow' }]),
  // The brush to one that limps. The fur goes big and fluffy while the sore paw is lifted well away from the brush.
  track('brush', 'sore', 6,
    [a(0.5, 0, 0, 0, 1.03, 1.01, 'wow', { paw: 1, pawX: 26, pawY: -56, pawRot: 0.5 }), a(1.2, 0, 0, 0.03, 1.04, 1.02, 'wow', { paw: 1, pawX: 26, pawY: -56, pawRot: 0.5, fur: 0.4 }), a(2.4, 0, 0, 0.03, 1.07, 1.03, 'wow', { paw: 1, pawX: 28, pawY: -58, pawRot: 0.5, fur: 0.7 }), a(3.4, 0, 0, 0.03, 1.09, 1.04, 'wow', { paw: 1, pawX: 30, pawY: -60, pawRot: 0.5, fur: 1 }), a(4.4, 0, 0, 0, 1.09, 1.04, 'hurting', { paw: 1, pawX: 10, pawY: -40, pawRot: 0.4, fur: 1 }), rest(5.2, 'hurting')],
    [k(0, 'lap', -40, -90, -0.3, 1, true, 0), k(0.9, 'lap', -40, -20, -0.3, 1, true, 0), k(1.2, 'lap', -40, -90, -0.3, 1, true, 0), k(2.1, 'lap', -40, -20, -0.3, 1, true, 0), k(2.4, 'lap', -40, -90, -0.3, 1, true, 0), k(3.3, 'lap', -40, -20, -0.3, 1, true, 0), k(4.5, 'lap', -40, -20, -0.3, 1, true, 0), beside(5.8)],
    [{ t: 0.1, voice: true }, { t: 0.5, call: 'wow' }]),
  // The brush to one that scratches. HELPS: the burrs fly out one by one, the leg stops, and a blissful hind foot
  // thumps the table.
  track('brush', 'itchy', 7.5,
    [a(0.5, 0, 0, -0.05, 1, 1, 'bothered'), a(1, 0, 0, 0.06, 1, 1.02, 'wow', { burrs: 3 }), a(1.8, 0, 0, -0.06, 1, 1.02, 'wow', { burrs: 1.5 }), a(2.6, 0, 0, 0.06, 1, 1.02, 'wow', { burrs: 0, paw: 0 }), a(3, 0, 0, 0, 1, 1, 'calm', { burrs: 0, paw: 0 }), a(3.5, 0, 2, 0.06, 1.03, 0.97, 'bliss', { burrs: 0, ...FOOT_UP }), a(3.8, 0, -5, 0.08, 1, 1.02, 'bliss', { burrs: 0, ...FOOT_UP }), a(4, 0, 2, 0.08, 1.03, 0.97, 'bliss', { burrs: 0, ...FOOT_DOWN }), a(4.3, 0, -5, 0.08, 1, 1.02, 'bliss', FOOT_UP), a(4.5, 0, 2, 0.08, 1.03, 0.97, 'bliss', FOOT_DOWN), a(4.8, 0, -5, 0.08, 1, 1.02, 'bliss', FOOT_UP), a(5, 0, 2, 0.08, 1.03, 0.97, 'bliss', FOOT_DOWN), a(5.5, 0, 3, 0.04, 1.05, 0.95, 'bliss', FOOT_DOWN), a(5.8, 0, 3, 0.04, 1.05, 0.95, 'bliss'), rest(6.6, 'glad')],
    [k(0, 'lap', -36, -70, -0.4), k(1, 'lap', 36, -50, 0.4), k(1.8, 'lap', -36, -70, -0.4), k(2.6, 'lap', 36, -50, 0.4), k(3.4, 'lap', 0, 0, 0, 1, true, 0)],
    // Three pops, one as each burr flies out; the thumping purr as the foot starts to thump.
    [{ t: 1, note: 0 }, { t: 1.53, note: 1 }, { t: 2.07, note: 2 }, { t: 3.4, rest: 3 }, { t: 3.5, call: 'bliss' }, { t: 4, thump: 1 }, { t: 4.5, thump: 1 }, { t: 5, thump: 1 }, { t: 6, call: 'glad' }],
    { ends: 3 }),
  // The brush to one that hides. The brush stops short and lies down; the fur nearest it bristles and one eye
  // watches it.
  track('brush', 'scared', 4.5,
    [a(0.7, 0, 0, 0, 1, 1, 'afraid', { out: 0 }), a(1.2, 0, -2, 0, 1.03, 1.02, 'afraid', { out: 0, fur: 1 }), a(1.6, 0, 0, 0, 1.03, 1.01, 'afraid', { out: 0, fur: 1, eye: 1 }), a(3.2, 0, 0, 0, 1.02, 1.01, 'afraid', { out: 0, fur: 1, eye: 1 }), rest(3.8, 'afraid')],
    [k(0, 'edge', 70, -50, -0.5, 1, true, 0), k(0.7, 'edge', 36, -44, 0.3, 1, true, 0), k(1.3, 'edge', 30, 0, 0, 1, true, 0), k(3, 'edge', 30, 0, 0, 1, true, 0), beside(4.5)],
    [{ t: 0.2, voice: true }]),

  // --- The basket bed ---

  // The basket to one that droops. Hangs over the rim like a wet towel, tongue on the table.
  track('basket', 'thirsty', 6,
    [a(0.6, 0, -12, 0, 1, 1.03, 'worn'), a(1.1, 0, 0, 0, 1.02, 0.96, 'worn'), a(2.4, 34, 10, 0.28, 1.1, 0.84, 'worn', { tongue: 2 }), a(4.2, 36, 11, 0.3, 1.11, 0.83, 'worn', { tongue: 2 }), a(5, 10, 0, 0.08, 1.02, 0.96, 'worn', { tongue: 1 })],
    [k(0, 'seat', 0, 0, 0, 1, true, 0), k(1.1, 'seat', 0, 0, 0, 1, true, 0), k(2.4, 'seat', 0, 0, 0.12, 1, true, 0), k(4.5, 'seat', 0, 0, 0.12, 1, true, 0), beside(5.8)],
    [{ t: 0.2, voice: true }, { t: 3, call: 'hum' }]),
  // The basket to one that shivers. Curls up inside and the shivering walks the basket across the table.
  track('basket', 'cold', 7,
    [a(0.5, 0, -20, 0, 1, 1.05, 'miserable'), a(0.9, 0, 2, 0, 1.05, 0.88, 'miserable', { arms: 1 }), a(1.4, -12, 0, 0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(1.9, -26, 0, -0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(2.4, -40, 0, 0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(2.9, -54, 0, -0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(3.4, -68, 0, 0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(3.9, -82, 0, -0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(4.4, -96, 0, 0.04, 1.05, 0.88, 'miserable', { arms: 1, shake: 1 }), a(4.9, -104, 0, 0, 1.05, 0.88, 'wow', { arms: 1, shake: 1 }), a(5.3, -104, 0, 0, 1.03, 0.92, 'wow'), a(5.8, -56, -22, 0, 1, 1.04, 'miserable'), a(6.3, -10, 0, 0, 1.02, 0.97, 'miserable')],
    [k(0, 'seat', 0, 0, 0, 1, true, 0), k(0.9, 'seat', 0, 0, 0, 1, true, 0), k(1, 'seat', 0, 0, 0, 1, true, 1), k(5, 'seat', 0, 0, 0, 1, true, 1), k(5.2, 'seat', -104, 0, 0, 1, true, 0), k(5.5, 'seat', -104, 0, 0, 1, true, 0), beside(6.6)],
    [{ t: 0.3, voice: true }, { t: 4.9, call: 'wow' }, { t: 6.3, thump: 1 }]),
  // The basket to one that limps. Climbs in on three legs with the sore paw hung over the rim.
  track('basket', 'sore', 6.5,
    [a(0.5, 0, 0, -0.05, 1, 1, 'hurting'), a(1, -26, -14, -0.08, 1, 1.03, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(1.3, -28, 0, -0.04, 1.02, 0.96, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(1.8, -54, -16, -0.08, 1, 1.03, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(2.1, -56, 0, -0.04, 1.02, 0.96, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(2.6, -78, -26, -0.06, 1, 1.05, 'hurting', { paw: 1, pawX: 0, pawY: -34, pawRot: 0.3 }), a(3, -80, -4, 0, 1.03, 0.94, 'wow', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(3.6, -80, -4, 0.06, 1, 1, 'wow', { paw: 1, pawX: 26, pawY: -2, pawRot: 1.3 }), a(4.6, -80, -4, 0.06, 1, 1, 'hurting', { paw: 1, pawX: 26, pawY: -2, pawRot: 1.3 }), a(5.2, -40, -18, 0, 1, 1.03, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 }), a(5.7, 0, 0, 0, 1.02, 0.97, 'hurting', { paw: 1, pawX: 0, pawY: -30, pawRot: 0.3 })],
    [k(0, 'seat', -80, 0, 0, 1, true, 0), k(5.2, 'seat', -80, 0, 0, 1, true, 0), beside(6.3)],
    [{ t: 0.1, voice: true }, { t: 1.3, thump: 1 }, { t: 2.1, thump: 1 }, { t: 3, thump: 1 }]),
  // The basket to one that scratches. Scratches inside it until the basket spins like a top.
  track('basket', 'itchy', 6.5,
    [a(0.5, 0, -18, 0, 1, 1.05, 'bothered'), a(0.9, 0, 0, 0, 1.03, 0.95, 'bothered'), a(1.2, 0, 0, 0.08, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -22, pawRot: 0.8 }), a(1.5, 0, 0, -0.04, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -10, pawRot: 0.3 }), a(1.8, 0, 0, 0.08, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -22, pawRot: 0.8 }), a(2.1, 0, 0, -0.04, 1, 1, 'bothered', { paw: 1, pawX: 6, pawY: -10, pawRot: 0.3 }), a(2.4, 0, -4, 0, 0.97, 1.05, 'wow'), a(2.8, 8, -4, 0.06, 0.97, 1.05, 'wow'), a(3.2, -8, -4, -0.06, 0.97, 1.05, 'wow'), a(3.6, 8, -4, 0.06, 0.97, 1.05, 'wow'), a(4, -8, -4, -0.06, 0.97, 1.05, 'wow'), a(4.3, 0, 0, 0, 1.03, 0.96, 'wow'), a(4.9, 6, 0, 0.14, 1, 1, 'wow'), a(5.4, -4, -16, -0.1, 1, 1.03, 'wow'), a(5.9, 0, 0, 0, 1.02, 0.97, 'bothered', { paw: 1, pawX: 6, pawY: -20, pawRot: 0.6 })],
    [k(0, 'seat', 0, 0, 0, 1, true, 0), k(1.2, 'seat', 0, 0, 0.15, 1, true, 0), k(1.5, 'seat', 0, 0, -0.1, 1, true, 0), k(1.8, 'seat', 0, 0, 0.3, 1, true, 0), k(2.2, 'seat', 0, 0, 0, 1, true, 0), k(4.2, 'seat', 0, 0, TURN * 3, 1, true, 0), k(4.2, 'seat', 0, 0, 0, 1, true, 0), k(5, 'seat', 0, 0, 0, 1, true, 0), beside(6.3)],
    [{ t: 0.5, voice: true }, { t: 2.4, call: 'wow' }, { t: 5.9, thump: 1 }]),
  // The basket to one that hides. HELPS: the basket slides to the hiding place, the animal creeps in, the lamp
  // dims a little, the trembling slows to deep breathing; then a peek and a stretch. The scene that follows
  // brings it out tall.
  track('basket', 'scared', 8,
    [a(0.6, 0, 0, 0, 1, 1, 'afraid', { out: 0 }), a(1.4, 0, 0, 0, 1, 1, 'afraid', { out: 0.3 }), a(2.2, 0, 0, 0, 1, 1.01, 'afraid', { out: 0.65 }), a(3, 0, 0, 0, 1, 1, 'afraid', { out: 1, shake: 0.2 }), a(3.8, 0, 2, 0, 1.04, 0.97, 'afraid', { out: 1, shake: 0.1 }), a(4.5, 0, 0, 0, 0.99, 1.03, 'calm', { out: 1, shake: 0, paw: 0 }), a(5.3, 0, 2, 0, 1.04, 0.96, 'bliss', { out: 1, shake: 0, paw: 0 }), a(6, 0, 0, 0, 1, 1.02, 'bliss', { out: 1, shake: 0, paw: 0 }), a(6.5, 0, -8, 0, 1, 1.04, 'wow', { out: 1 }), a(7.2, 0, -4, 0, 0.95, 1.14, 'glad', { out: 1 })],
    [k(0, 'edge', 70, 0, 0, 1, true, 0), k(1.2, 'edge', 0, 0, 0, 1, true, 0)],
    [{ t: 0.2, voice: true }, { t: 3, dim: 1 }, { t: 5.3, call: 'hum' }, { t: 6.5, call: 'glad' }],
    { ends: 4.5 }),

  // --- The hand: a stroke. It helps no need. ---
  // Each is written for a finger on the animal's right as the child sees it; the view turns it round for a finger on
  // the other side, so the animal always leans to the hand and never away from it.

  // The hand to one that droops. Licks the finger with a dry tongue.
  track('hand', 'thirsty', 4,
    [a(0.5, 6, -2, 0.06, 1, 1.02, 'worn', { tongue: 1 }), a(1, 10, -8, 0.1, 0.98, 1.05, 'worn', { tongue: 2 }), a(1.5, 8, 0, 0.04, 1, 1, 'worn', { tongue: 1 }), a(2, 10, -8, 0.1, 0.98, 1.05, 'worn', { tongue: 2 }), a(2.6, 4, 0, 0, 1, 1, 'worn', { tongue: 1 }), rest(3.2, 'worn')],
    [],
    [{ t: 0.5, voice: true }]),
  // The hand to one that shivers. Presses against the warm hand; the shaking eases while the finger stays and
  // comes back when it lifts.
  track('hand', 'cold', 5,
    [a(0.6, 10, 0, 0.1, 1.02, 1, 'miserable'), a(1.4, 14, 0, 0.12, 1.03, 0.99, 'miserable', { shake: 0.15 }), a(3, 14, 0, 0.12, 1.03, 0.99, 'miserable', { shake: 0.1 }), a(3.6, 4, 0, 0.03, 1, 1, 'miserable'), rest(4.2, 'miserable')],
    [],
    [{ t: 0.2, voice: true }]),
  // The hand to one that limps. Leans in and lays the sore paw in the hand.
  track('hand', 'sore', 4.5,
    [a(0.6, 8, 0, 0.08, 1, 1, 'hurting'), a(1.4, 12, 2, 0.1, 1, 0.99, 'hurting', { paw: 1, pawX: 26, pawY: -8, pawRot: -0.2, reach: 1 }), a(3.2, 12, 2, 0.1, 1, 0.99, 'hurting', { paw: 1, pawX: 26, pawY: -8, pawRot: -0.2, reach: 1 }), rest(3.9, 'hurting')],
    [],
    [{ t: 0.2, voice: true }, { t: 1.5, call: 'hum' }]),
  // The hand to one that scratches. Turns the itchy place to the finger and the hind leg thumps while it is stroked.
  track('hand', 'itchy', 4.5,
    [a(0.5, -6, 0, -0.16, 1, 1, 'bothered'), a(1, -6, -4, -0.18, 1, 1.02, 'bliss', { paw: 1, pawX: 10, pawY: -6, pawRot: 0.2 }), a(1.2, -6, 0, -0.16, 1.02, 0.98, 'bliss', { paw: 1, pawX: 10, pawY: 4, pawRot: 0 }), a(1.5, -6, -4, -0.18, 1, 1.02, 'bliss', { paw: 1, pawX: 10, pawY: -6, pawRot: 0.2 }), a(1.7, -6, 0, -0.16, 1.02, 0.98, 'bliss', { paw: 1, pawX: 10, pawY: 4, pawRot: 0 }), a(2, -6, -4, -0.18, 1, 1.02, 'bliss', { paw: 1, pawX: 10, pawY: -6, pawRot: 0.2 }), a(2.2, -6, 0, -0.16, 1.02, 0.98, 'bliss', { paw: 1, pawX: 10, pawY: 4, pawRot: 0 }), a(2.5, -6, -4, -0.18, 1, 1.02, 'bliss', { paw: 1, pawX: 10, pawY: -6, pawRot: 0.2 }), a(2.7, -6, 0, -0.16, 1.02, 0.98, 'bliss', { paw: 1, pawX: 10, pawY: 4, pawRot: 0 }), a(3.3, -3, 0, -0.08, 1, 1, 'bothered'), rest(3.8, 'bothered')],
    [],
    [{ t: 0.3, voice: true }, { t: 1.2, thump: 1 }, { t: 1.7, thump: 1 }, { t: 2.2, thump: 1 }, { t: 2.7, thump: 1 }]),
  // The hand to one that hides. Sniffs the still finger and creeps one step out. A second quick touch sends it
  // back: here the stroke simply ends and it draws back in.
  track('hand', 'scared', 5,
    [a(0.8, 0, 0, 0, 1, 1, 'afraid', { out: 0.3 }), a(1.1, 0, -2, 0, 1, 1.03, 'afraid', { out: 0.4 }), a(1.3, 0, 0, 0, 1, 1, 'afraid', { out: 0.35 }), a(1.5, 0, -2, 0, 1, 1.03, 'afraid', { out: 0.42 }), a(2.4, 0, 0, 0, 1, 1, 'afraid', { out: 0.8 }), a(3.4, 0, 0, 0, 1, 1, 'afraid', { out: 0.8 }), rest(4.2, 'afraid')],
    [],
    [{ t: 0.3, voice: true }]),
]

/** Every cell's track. */
export function allTracks(): readonly CellTrack[] {
  return TRACKS
}

/** The track of a cell, or null where it is not written yet. */
export function cellTrack(given: Given, need: Need): CellTrack | null {
  return TRACKS.find((cell) => cell.given === given && cell.need === need) ?? null
}

/** Whether the cell helps: the care that fits the need. */
export function isHelp(cell: CellTrack): boolean {
  return cell.given !== 'hand' && FITS[cell.need] === cell.given
}

