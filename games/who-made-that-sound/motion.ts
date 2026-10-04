import { BLINKS, ENTRANCES, IDLES, IDLE_SECONDS, JOINS, JOIN_NOTE, JOIN_NOTE_SECONDS, REST, TAU, TRICK_SET, frac, hump, ramp, unit, type Move } from './motionKinds'
import type { Kind, Shape } from './voices'

// How everybody moves, as numbers and nothing else: no renderer, no clock and
// no dice of its own. The view asks what a body does at an instant and lays
// the answer on a figure. Each kind moves like itself (the tables are in
// motionKinds.ts); the one thing all six share is the picture of a call,
// where the difference between two kinds is the difference between their
// voices, which is the point (ART.md, "The representation").

export { ENTRANCE_SECONDS, IDLE_SECONDS, JOIN_SECONDS, REST, WEIGHT, type Move } from './motionKinds'

const between = (value: number, low: number, high: number, rest: number) => (Number.isFinite(value) ? Math.max(low, Math.min(high, value)) + 0 : rest)

/** Keeps a move on its own spot and inside what a figure can show, whatever a curve came up with. */
function fit(part: Partial<Move>): Move {
  const m = { ...REST, ...part }
  return {
    dx: between(m.dx, -0.6, 0.6, 0), dy: between(m.dy, -1.4, 0.05, 0),
    sx: between(m.sx, 0.15, 1.9, 1), sy: between(m.sy, 0.15, 1.9, 1),
    lean: between(m.lean, -0.9, 0.9, 0),
    wings: between(m.wings, 0, 1, 0), reach: between(m.reach, -1, 1, 0), turn: between(m.turn, -1, 1, 0), blink: between(m.blink, 0, 1, 0),
    face: between(m.face, -1, 1, 1),
  }
}

/** Two moves at once: offsets and angles add, stretches and face multiply, wings and blink take the larger, reach and turn add. */
export function blend(a: Move, b: Move): Move {
  return fit({
    dx: a.dx + b.dx, dy: a.dy + b.dy, sx: a.sx * b.sx, sy: a.sy * b.sy, lean: a.lean + b.lean,
    wings: Math.max(a.wings, b.wings), reach: a.reach + b.reach, turn: a.turn + b.turn, blink: Math.max(a.blink, b.blink), face: a.face * b.face,
  })
}

/** How far one individual's idle runs behind the next one's, in rounds: a step that never comes back to where it began, so no two are in step. */
const LATE = 0.618

/**
 * Alive at idle: each kind at its own tempo and with its own body part. `seconds` is game time, and `late` (any
 * number, one for each individual) shifts one against another. Small: nobody leaves its spot.
 */
export function idle(kind: Kind, seconds: number, late: number): Move {
  const [every, shut] = BLINKS[kind], behind = Number.isFinite(late) ? late : 0
  const move = fit(IDLES[kind](frac(seconds / IDLE_SECONDS[kind] + behind * LATE)))
  // The blink keeps its own time, apart from the body's, so that it does not land on the same place of every round.
  const blink = hump(frac(seconds / every + behind * (1 - LATE)), 0, shut / every)
  return { ...move, dx: between(move.dx, -0.03, 0.03, 0), dy: between(move.dy, -0.03, 0, 0), blink }
}

/** The way out of the egg, `t` from 0 to 1: squashed down in the shell at 0, an overshoot of the kind's own, standing at rest at 1. */
export function entrance(kind: Kind, t: number): Move {
  const u = unit(t)
  return u >= 1 ? { ...REST } : fit(ENTRANCES[kind](u))
}

const named = (kind: Kind) => TRICK_SET[kind].map(({ name, seconds }) => ({ name, seconds }))

/** Each kind's own tricks when it is tapped in the open, the one grid.ts names first: a name and a length in seconds. */
export const TRICKS: Readonly<Record<Kind, readonly { name: string; seconds: number }[]>> = {
  pip: named('pip'), tok: named('tok'), hoom: named('hoom'), brrl: named('brrl'), wheep: named('wheep'), dooo: named('dooo'),
}

/** Trick number `which` of a kind at `t` from 0 to 1: at rest at both ends, a small move the other way first, a settle last. */
export function trick(kind: Kind, which: number, t: number): Move {
  const set = TRICK_SET[kind], u = unit(t)
  const index = Number.isFinite(which) ? ((Math.floor(which) % set.length) + set.length) % set.length : 0
  return u <= 0 || u >= 1 ? { ...REST } : fit(set[index].curve(u))
}

/** What a kind does when it is tapped while another one calls, at `t` from 0 to 1: at rest at both ends. */
export function join(kind: Kind, t: number): Move {
  const u = unit(t)
  return u <= 0 || u >= 1 ? { ...REST } : fit(JOINS[kind](u))
}

/**
 * Which trick comes next for one individual, never the same twice in a row. `last` is the one it did before, or -1,
 * and `roll` is a number from 0 up to but not 1 from the caller's seeded stream. The first is always the grid's own.
 */
export function nextTrick(kind: Kind, last: number, roll: number): number {
  const count = TRICK_SET[kind].length
  if (!Number.isInteger(last) || last < 0 || last >= count) return 0
  const other = Math.min(count - 2, Math.floor(unit(roll) * (count - 1)))
  return other >= last ? other + 1 : other
}

// --- The picture of a call ---------------------------------------------------

/** How far off the ground a voice at the top of the range lifts a body, in body heights. */
export const CALL_LIFT = 0.45
/** How far a glide tips a body in the open, in radians. An egg rocks a little further, from one end to the other. */
const TIP = 0.35
const EGG_TIP = 0.4
/** A low, long voice barely leaves the ground: it leans over instead, slowly. A body leans less than an egg. */
const LOW_LEAN = 0.25
const EGG_LOW_LEAN = 0.4
/** Shivers a second: as fast as the warble (voices.ts), so that the eye and the ear get the same count. */
const SHIVER_RATE = 8

/** How far up a call is at `u`: one rise for each note. An up-glide is at its highest late and a down-glide early, so the one rises through the call and the other sinks. */
function rise(shape: Shape, u: number): number {
  const hop = Math.min(shape.hops - 1, Math.floor(u * shape.hops))
  return hump(u * shape.hops - hop, 0, 1, shape.tip > 0 ? 0.65 : shape.tip < 0 ? 0.35 : 0.5)
}

/** A shiver from side to side, all the way through the call and still at both ends. */
function shiver(shape: Shape, u: number): number {
  return shape.shiver ? Math.sin(TAU * SHIVER_RATE * shape.seconds * u) * ramp(u, 0, 0.1) * (1 - ramp(u, 0.9, 1)) : 0
}

/** How far a call with no glide leans over: all the way for a low voice that lasts, hardly at all for a high or a short one. */
function lowLean(shape: Shape, u: number): number {
  return shape.tip === 0 ? (1 - shape.lift) ** 2 * ramp(shape.seconds, 0.4, 0.9) * hump(u, 0, 1) : 0
}

/**
 * The picture of a call on a body in the open, `t` from 0 to 1 over `shape.seconds`: up by the shape's lift, once for
 * each note, shivering for a warble, tipped for a glide. At rest at both ends. The same for every kind: what differs
 * is the shape.
 */
export function calling(shape: Shape, t: number): Move {
  const u = unit(t)
  if (u <= 0 || u >= 1) return { ...REST }
  const up = rise(shape, u) * shape.lift, shake = shiver(shape, u)
  return fit({
    dx: 0.1 * shake, dy: -CALL_LIFT * up,
    sy: 1 + 0.2 * up, sx: 1 - 0.1 * up,
    lean: shape.tip * TIP * hump(u, 0, 1) + LOW_LEAN * lowLean(shape, u) + 0.08 * shake,
    // The wings open with the voice and stay open as long as it sounds.
    wings: ramp(u, 0, 0.15) * (1 - ramp(u, 0.85, 1)),
  })
}

/**
 * One note of a join that is sounded note by note (pip on the beats of another's call, tok in its gaps), `since`
 * seconds after the note began, or a moment before it: the picture of that one note of the call, `length` seconds
 * long, and with it what the kind's body does on each note (JOIN_NOTE), which is at its peak as the note begins.
 */
export function joinNote(kind: Kind, shape: Shape, length: number, since: number): Move {
  const note = calling({ ...shape, hops: 1, seconds: length }, since / length)
  const more = JOIN_NOTE[kind], u = unit(since / JOIN_NOTE_SECONDS + 0.3)
  return more && u > 0 && u < 1 ? blend(note, fit(more(u))) : note
}

/**
 * The same picture on an egg with someone inside. A shell has no wings and no face, so those stay at rest; it is
 * stiffer than a body, so it barely stretches; and for a glide it rocks from one end to the other, ending on the
 * side the voice ends on. A rustle (RUSTLE in voices.ts) is one shape, so it is the same whoever calls.
 */
export function eggCalling(shape: Shape, t: number): Move {
  const u = unit(t)
  if (u <= 0 || u >= 1) return { ...REST }
  const up = rise(shape, u) * shape.lift, shake = shiver(shape, u)
  return fit({
    dx: 0.09 * shake, dy: -CALL_LIFT * up,
    sy: 1 + 0.06 * up, sx: 1 - 0.03 * up,
    lean: -shape.tip * EGG_TIP * Math.sin(TAU * u) + EGG_LOW_LEAN * lowLean(shape, u) + 0.1 * shake,
  })
}

// --- A finger lands ----------------------------------------------------------

export const SQUASH_SECONDS = 0.3

/**
 * A finger landed on a thing: a quick squash that springs back, `t` from 0 to 1 over SQUASH_SECONDS. Widest and
 * flattest at about 0.15, then too tall, then at rest. `weight` (0 to 1, WEIGHT for a kind) makes a heavier thing
 * squash later and less, and wobble fewer times on the way back.
 */
export function squash(t: number, weight = 0): Move {
  const u = unit(t), heavy = unit(weight)
  if (u <= 0 || u >= 1) return { ...REST }
  const flattest = 0.15 + 0.13 * heavy, deep = 0.3 * (1 - 0.55 * heavy), back = (u - flattest) / (1 - flattest)
  const flat = u < flattest ? Math.sin((Math.PI / 2) * (u / flattest)) : Math.cos(Math.PI * (3 - heavy) * back) * (1 - back) ** 2
  return fit({ sy: 1 - deep * flat, sx: 1 + 0.8 * deep * flat })
}
