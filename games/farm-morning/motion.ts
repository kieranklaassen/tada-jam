import type { AnswerId } from './cells'
import { CROONS, CROW, GLUGS, PECK_BEAT, STRUT } from './timeline'

// How every character moves, as numbers. A rig is a handful of amounts (a
// lean, a squash, a head angle, a mouth) that the view maps onto card pieces.
// Each animal has its own tempo, weight and funniest part, written here once
// as a personality, and its own track for every cell of the grid. Nothing is
// shared between two animals: no curve, no period, no pose. Everything is a
// function of time alone, so the same moment always looks the same.

export type Rig = {
  /** The whole body, in stage units: sideways, and up (negative) or down. */
  dx: number
  dy: number
  /** A lean towards the animal's own front, in radians. */
  rot: number
  /** Squash and stretch about the feet. */
  sx: number
  sy: number
  /** The head: its nose down (positive) or up, in radians, and a shift in stage units. */
  head: number
  headX: number
  headY: number
  /** The ears, each down (positive) or up from where it rests. */
  earL: number
  earR: number
  /** The tail's swing. For the pig it is how far the curl has wound. */
  tail: number
  /** 0 shut to 1 wide: a lip that hangs, a beak, a jaw that drops. */
  mouth: number
  /** The pig's grin, 0 to 1: its shut mouth turned up at both corners. An open mouth is drawn instead of it. */
  grin: number
  /** The goat's jaw, sideways: -1 to 1. */
  jaw: number
  /** 0 open to 1 shut. */
  lid: number
  /** What the cell puts on the animal or does to it, 0 to 1: the wig, the fluff, the roll, the swollen belly. */
  extra: number
  /** A second amount for a cell that needs one: kicking trotters, a head that has popped out. */
  extra2: number
}

export type HenRig = {
  /** A hop: negative is up. */
  dy: number
  /** The body tipped forward, tail in the air, in radians. */
  rot: number
  /** The head down (positive, a peck) or up, in radians. */
  head: number
  /** The neck stretched out in front, 0 to 1. */
  neck: number
  /** The wings, 0 folded to 1 out. */
  wing: number
  /** Fluffed up: added to her size, 0 to about 0.6. */
  puff: number
  lid: number
  /** A sideways lean, for a tumble or a shake. */
  lean: number
  /** The cell's own amount: a crest, a cover of hay. */
  extra: number
  /** Her head out of the top of the hay. */
  extra2: number
  /** One foot raking the ground beside the empty trough: -1 to 1, back and forward. */
  scratch: number
  /** Sat down beside the full trough, her legs folded under her: 0 to 1. */
  sit: number
}

export const blankRig = (): Rig => ({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, head: 0, headX: 0, headY: 0, earL: 0, earR: 0, tail: 0, mouth: 0, grin: 0, jaw: 0, lid: 0, extra: 0, extra2: 0 })
export const blankHen = (): HenRig => ({ dy: 0, rot: 0, head: 0, neck: 0, wing: 0, puff: 0, lid: 0, lean: 0, extra: 0, extra2: 0, scratch: 0, sit: 0 })

const TAU = Math.PI * 2
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** 0 before `a`, 1 after `b`, eased between. */
const e = (t: number, a: number, b: number): number => { const p = clamp01((t - a) / (b - a)); return p * p * (3 - 2 * p) }
/** 0 at `a` and `b`, 1 half way. */
const bump = (t: number, a: number, b: number): number => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))
/** A spring let go at `a`: it overshoots at `f` a second and dies away. */
const boing = (t: number, a: number, f: number, d: number): number => (t < a ? 0 : Math.exp(-d * (t - a)) * Math.sin(TAU * f * (t - a)))
/** A shake between `a` and `b` at `f` a second, swelling and dying inside the stretch. */
const shake = (t: number, a: number, b: number, f: number): number => bump(t, a, b) * Math.sin(TAU * f * (t - a))
/** On for `length` in every `period`: how far through it is, or -1 while it is off. */
const every = (time: number, period: number, offset: number, length: number): number => { const at = (((time + offset) % period) + period) % period; return at < length ? at / length : -1 }
const pulse = (p: number): number => (p < 0 ? 0 : Math.sin(p * Math.PI))
/** Eyes that shut for a moment, at a rhythm of the animal's own, twice now and then. */
const blink = (time: number, period: number, offset: number): number => Math.max(pulse(every(time, period, offset, 0.14)), pulse(every(time, period * 2.7, offset + 0.31, 0.14)))

/**
 * Each character's tempo, weight and funniest part, decided before any curve. `breath` is seconds a breath,
 * `depth` how far it moves the body, `blink` seconds between blinks, `fidget` the period of the thing it does when
 * nothing is happening, and `settle` how springy it is when an answer ends: the pony heavy and late, the goat sudden,
 * the pig wobbling on after every move, the hens in starts and stops.
 */
export const PERSONALITY = {
  pony: { breath: 4.6, depth: 0.012, blink: 5.3, fidget: 9.4, settle: 1.6, funniest: 'a huge lower lip' },
  goat: { breath: 2.2, depth: 0.007, blink: 3.1, fidget: 6.7, settle: 4.2, funniest: 'a jaw that chews sideways' },
  pig: { breath: 3.4, depth: 0.024, blink: 6.9, fidget: 10.3, settle: 2.4, funniest: 'a tail that winds and unwinds' },
  hens: [
    { breath: 1.9, depth: 0.012, blink: 2.3, fidget: 5.3, settle: 3.2, funniest: 'a neck that shoots out' },
    { breath: 1.3, depth: 0.01, blink: 1.7, fidget: 3.7, settle: 5.5, funniest: 'a tail that goes up' },
    { breath: 0.9, depth: 0.016, blink: 1.1, fidget: 2.9, settle: 7, funniest: 'a hop that comes late' },
  ],
} as const

/** An answer fades in over its first moment and out over its last, so a pose never jumps as it starts or as it ends. An answer that is replaced or taken away has no last moment: its pose is dropped at once (farm.ts). */
function weight(t: number, lasts: number): number {
  return Math.min(1, t / 0.07) * clamp01((lasts - t) / 0.28)
}

function mix(out: Rig, d: Rig, w: number): Rig {
  out.dx += d.dx * w; out.dy += d.dy * w; out.rot += d.rot * w
  out.sx += (d.sx - 1) * w; out.sy += (d.sy - 1) * w
  out.head += d.head * w; out.headX += d.headX * w; out.headY += d.headY * w
  out.earL += d.earL * w; out.earR += d.earR * w; out.tail += d.tail * w
  out.mouth = clamp01(out.mouth * (1 - w) + d.mouth * w)
  out.grin = clamp01(out.grin * (1 - w) + d.grin * w)
  out.jaw = out.jaw * (1 - w) + d.jaw * w
  // A lid below 0 asks for wide eyes: it takes the idle blink and the settled half-shut away, as far as it goes.
  out.lid = d.lid < 0 ? out.lid * (1 - w * Math.min(1, -d.lid)) : Math.max(out.lid, clamp01(d.lid) * w)
  out.extra = d.extra * w
  out.extra2 = d.extra2 * w
  return out
}

const scratch: Rig = blankRig()
function fresh(): Rig {
  return Object.assign(scratch, blankRig())
}

// --- The pony: slow and heavy, everything arrives late -------------------------------------

function ponyIdle(time: number, filled: number, r: Rig): void {
  const p = PERSONALITY.pony
  const breath = Math.sin((time * TAU) / p.breath)
  r.sy = 1 + p.depth * breath
  r.sx = 1 - p.depth * 0.5 * breath
  // Content, one hip drops: its hind end sinks a little.
  r.rot = 0.012 * Math.sin((time * TAU) / 7.3) - 0.05 * filled
  r.head = 0.03 * Math.sin((time * TAU) / 5.9) + 0.07 * filled
  r.earL = 0.08 * Math.sin(time * 0.9) - 0.5 * pulse(every(time, 3.1, 0.4, 0.22))
  r.earR = 0.06 * Math.sin(time * 0.7 + 1) - 0.5 * pulse(every(time, 4.3, 1.9, 0.22))
  r.tail = 0.1 * Math.sin((time * TAU) / 3.7) + 0.55 * pulse(every(time, 6.1, 1.2, 0.5)) * (1 - 0.6 * filled)
  r.mouth = 0.06 + 0.34 * filled + 0.02 * Math.sin(time * 2.1)
  r.lid = Math.max(blink(time, p.blink, 0.7), 0.55 * filled)
  // Short of the brush, it itches: now and then it rubs its flank on the post.
  const itch = every(time, p.fidget, 3, 1.3)
  if (itch >= 0 && filled < 1) {
    const w = (1 - filled) * pulse(itch)
    r.dx += 14 * w
    r.rot += -0.05 * w + 0.018 * w * Math.sin(itch * TAU * 5)
    r.tail += 0.3 * w
  }
}

function ponyAnswer(id: AnswerId, t: number, d: Rig): void {
  switch (id) {
    case 'scoop-pony':
      // The lip sucks the grain off the scoop, the jaws shut twice with a crunch, a long breath in, and a sneeze.
      d.head = 0.32 * e(t, 0.1, 0.4) * (1 - e(t, 1.45, 1.7)) - 0.42 * bump(t, 1.45, 1.95) + 0.55 * bump(t, 1.88, 2.25) + 0.12 * boing(t, 2.25, 2.2, 3)
      d.mouth = t < 1 ? 0.25 + 0.75 * Math.abs(Math.sin(TAU * 9.5 * t)) * e(t, 0.4, 0.5) : t < 1.5 ? 0.7 * (bump(t, 0.98, 1.1) + bump(t, 1.23, 1.35)) : bump(t, 1.86, 2.4)
      d.lid = e(t, 1.5, 1.8) * (1 - e(t, 2.3, 2.7))
      d.sy = 1 + 0.07 * bump(t, 1.45, 1.9) - 0.1 * bump(t, 1.88, 2.2)
      d.sx = 1 + 0.08 * bump(t, 1.88, 2.2)
      d.dx = 14 * bump(t, 1.9, 2.3)
      d.earL = d.earR = -0.4 * bump(t, 0, 0.5) + 0.7 * bump(t, 1.88, 2.5)
      d.tail = 0.8 * boing(t, 1.9, 2.4, 2.5)
      break
    case 'bucket-pony':
      // A flinch under the water, then a shudder from nose to tail, and a whinny.
      d.sy = 1 - 0.1 * bump(t, 0.16, 0.5)
      d.lid = e(t, 0.16, 0.3) * (1 - e(t, 2.2, 2.5))
      d.rot = 0.085 * shake(t, 0.92, 2.15, 7.2)
      d.dx = 7 * shake(t, 0.92, 2.15, 7.2)
      // The head, the ears and the tail follow the body late, each later than the last.
      d.head = 0.2 * shake(t, 1.0, 2.25, 7.2) - 0.42 * bump(t, 2.5, 3.3)
      d.earL = 0.9 * shake(t, 1.05, 2.3, 7.2)
      d.earR = -0.9 * shake(t, 1.08, 2.3, 7.2)
      d.tail = 1.1 * shake(t, 1.12, 2.4, 7.2)
      d.mouth = bump(t, 2.55, 3.3) * (0.7 + 0.3 * Math.sin(TAU * 13 * t))
      break
    case 'brush-pony':
      // It leans into each stroke a little further, until it nearly falls over.
      d.rot = 0.05 * e(t, 0.3, 0.6) + 0.05 * e(t, 0.9, 1.2) + 0.05 * e(t, 1.5, 1.8) + 0.07 * e(t, 2.1, 2.5) - 0.22 * e(t, 2.72, 2.86) + 0.05 * boing(t, 2.86, 2.1, 3.5)
      d.dx = 22 * e(t, 0.3, 2.5) - 22 * e(t, 2.72, 2.9)
      d.lid = 0.85 * e(t, 0.4, 1.0)
      d.mouth = 0.9 * e(t, 0.5, 1.4) + 0.1 * Math.sin(TAU * 11 * t) * e(t, 0.5, 1.4)
      d.head = 0.16 * e(t, 0.4, 1.6) - 0.3 * bump(t, 2.7, 3.0)
      d.earL = d.earR = 0.5 * e(t, 0.5, 1.5)
      d.tail = 0.25 * Math.sin(TAU * 0.8 * t)
      break
    case 'fork-pony':
      // The hay lands as a wig; it tosses it proudly, and eats it from the fringe down.
      d.head = 0.22 * bump(t, 0.16, 0.5) - 0.45 * bump(t, 0.7, 1.15) + 0.28 * bump(t, 1.1, 1.45) - 0.3 * bump(t, 1.4, 1.8) + 0.1 * e(t, 1.9, 2.1)
      d.sy = 1 - 0.07 * bump(t, 0.16, 0.42)
      d.mouth = t < 1.9 ? bump(t, 0.75, 1.6) : 0.85 * Math.abs(Math.sin((TAU * (t - 2)) / 0.9))
      d.lid = 0.5 * e(t, 1.9, 2.2)
      d.tail = 0.9 * bump(t, 0.7, 1.8)
      d.rot = -0.04 * bump(t, 0.7, 1.8)
      // One chomp takes a quarter of the wig.
      d.extra = e(t, 0.16, 0.24) * (1 - 0.25 * (e(t, 2.0, 2.1) + e(t, 2.45, 2.55) + e(t, 2.9, 3.0) + e(t, 3.35, 3.45)))
      break
    case 'finger-pony':
      // A snort and a raspberry.
      d.head = -0.2 * bump(t, 0, 0.3)
      d.mouth = e(t, 0.2, 0.26) * (1 - e(t, 0.62, 0.7)) * (0.4 + 0.6 * Math.abs(Math.sin(TAU * 9.6 * t)))
      d.earL = -0.7 * bump(t, 0.05, 0.4)
      d.tail = 1.0 * boing(t, 0.1, 1.9, 2.4)
      d.sy = 1 + 0.03 * bump(t, 0, 0.25)
      break
  }
}

export function ponyRig(time: number, filled: number, id: AnswerId | null, t: number, lasts: number, eager: boolean, out: Rig = blankRig()): Rig {
  Object.assign(out, blankRig())
  ponyIdle(time, filled, out)
  if (eager) { out.head -= 0.12; out.earL -= 0.3; out.earR -= 0.3; out.mouth = Math.max(out.mouth, 0.4) }
  if (id) { const d = fresh(); ponyAnswer(id, t, d); mix(out, d, weight(t, lasts)) }
  return out
}

// --- The goat: thin, springy and sudden ----------------------------------------------------

function goatIdle(time: number, filled: number, r: Rig): void {
  const p = PERSONALITY.goat
  const breath = Math.sin((time * TAU) / p.breath)
  r.sy = 1 + p.depth * breath
  // Content, it folds down beside the rack and chews the cud round and round. Short of hay, it chews air in fits.
  r.dy = 40 * filled
  const fit = every(time, 3.5, 0, 2)
  r.jaw = filled * Math.sin(time * 4.1) + (1 - filled) * (fit >= 0 ? Math.sin(fit * TAU * 4.5) * pulse(fit) : 0)
  r.mouth = 0.12 * Math.abs(r.jaw)
  r.tail = 0.5 * pulse(every(time, 1.7, 0.3, 0.16)) + 0.3 * pulse(every(time, 2.9, 1.1, 0.16))
  r.earL = 0.12 * Math.sin(time * 2.3)
  r.earR = 0.12 * Math.sin(time * 1.9 + 2)
  r.lid = Math.max(blink(time, p.blink, 1.6), 0.5 * filled)
  // Short of hay, it noses the empty rack; and now and then it hops on the spot for no reason.
  const nose = every(time, p.fidget, 2.2, 1.4)
  if (nose >= 0 && filled < 1) { r.head -= 0.2 * pulse(nose) * (1 - filled); r.headX += 10 * pulse(nose) * (1 - filled) }
  const hop = every(time, 11.3, 5, 0.34)
  if (hop >= 0 && filled < 0.5) { r.dy -= 16 * pulse(hop); r.sy += 0.05 * pulse(hop) }
}

function goatAnswer(id: AnswerId, t: number, d: Rig): void {
  switch (id) {
    case 'scoop-goat':
      // One gritty mouthful, then it bites the scoop: teeth on tin, and a recoil.
      d.head = 0.3 * bump(t, 0.15, 0.55) - 0.5 * e(t, 1.1, 1.3) * (1 - e(t, 1.45, 1.5)) + 0.3 * bump(t, 1.8, 2.3)
      d.jaw = Math.sin(TAU * 7.7 * t) * e(t, 0.45, 0.55) * (1 - e(t, 1.0, 1.1))
      d.mouth = 0.25 * Math.abs(d.jaw) + e(t, 1.15, 1.35) * (1 - e(t, 1.43, 1.47))
      d.dx = 5 * shake(t, 1.45, 1.85, 16)
      d.lid = -1
      d.earL = d.earR = -0.6 * bump(t, 1.45, 2.3)
      d.tail = 0.6 * shake(t, 1.45, 2.4, 6)
      break
    case 'bucket-goat': {
      // Glug after glug, a belly round as a ball, a slosh, and a hiccup.
      let belly = 0
      for (let i = 0; i < GLUGS.count; i++) belly += e(t, GLUGS.from + i * GLUGS.every, GLUGS.from + 0.12 + i * GLUGS.every) / GLUGS.count
      d.extra = belly * (1 - e(t, 2.95, 3.5))
      d.head = -0.42 * e(t, 0.1, 0.3) * (1 - e(t, 1.9, 2.1)) + 0.05 * Math.sin((TAU * (t - GLUGS.from)) / GLUGS.every) * e(t, GLUGS.from, GLUGS.from + 0.1) * (1 - e(t, 1.8, 1.9)) - 0.3 * bump(t, 2.92, 3.3)
      d.mouth = 0.8 * e(t, 0.1, 0.3) * (1 - e(t, 1.9, 2.0)) + bump(t, 2.93, 3.4)
      d.rot = 0.08 * shake(t, 2.0, 2.95, 1.6)
      d.dy = -24 * bump(t, 2.93, 3.2)
      d.lid = 0.6 * e(t, 0.3, 0.6) * (1 - e(t, 2.9, 2.95))
      d.sy = 1 + 0.05 * bump(t, 2.93, 3.2)
      break
    }
    case 'brush-goat':
      // Every hair stands on end, and one spark off a horn makes it jump.
      d.extra = e(t, 0.3, 1.7) * (1 - e(t, 2.35, 2.85)) + 0.12 * boing(t, 2.35, 3, 4) * (1 - e(t, 2.8, 2.9))
      d.earL = d.earR = -0.8 * e(t, 0.3, 1.0) * (1 - e(t, 2.4, 2.8))
      d.lid = -1
      d.dx = 1.5 * Math.sin(TAU * 21 * t) * e(t, 0.3, 1.7) * (1 - e(t, 1.9, 2.0))
      d.dy = -52 * bump(t, 1.95, 2.4)
      d.mouth = bump(t, 1.98, 2.5)
      d.sy = 1 + 0.08 * bump(t, 1.95, 2.2) - 0.07 * bump(t, 2.38, 2.6)
      d.tail = 1.2 * bump(t, 1.95, 2.5)
      break
    case 'fork-goat':
      // It springs straight up on stiff legs, then chews with its jaw going round and round.
      d.dy = -74 * bump(t, 0.48, 0.98) - 12 * bump(t, 1.0, 1.2)
      d.sy = 1 + 0.09 * bump(t, 0.48, 0.8) - 0.1 * bump(t, 0.96, 1.15)
      d.mouth = bump(t, 0.85, 1.15) + 0.3 * e(t, 1.3, 1.4) * (1 - e(t, 2.9, 3.0)) + bump(t, 3.0, 3.3)
      d.jaw = Math.sin(TAU * 1.56 * (t - 1.3)) * e(t, 1.3, 1.45) * (1 - e(t, 2.9, 3.0))
      d.head = 0.2 * e(t, 1.2, 1.4) * (1 - e(t, 2.9, 3.1)) + 0.06 * Math.cos(TAU * 1.56 * (t - 1.3)) * e(t, 1.3, 1.45) * (1 - e(t, 2.9, 3.0))
      d.headX = 12 * e(t, 1.2, 1.4) * (1 - e(t, 2.9, 3.1))
      d.tail = Math.sin(TAU * 8 * t) * e(t, 0.5, 0.6)
      d.earL = 0.3 * Math.sin(TAU * 1.56 * (t - 1.3)) * e(t, 1.3, 1.45)
      break
    case 'finger-goat':
      // It butts at the finger and wags its stub of a tail.
      d.head = 0.5 * bump(t, 0, 0.36)
      d.headX = 16 * bump(t, 0.05, 0.36)
      d.sx = 1 + 0.08 * bump(t, 0.05, 0.3)
      d.mouth = bump(t, 0, 0.32)
      d.tail = Math.sin(TAU * 9 * t) * e(t, 0.25, 0.35)
      d.dy = 6 * bump(t, 0, 0.3)
      break
    case 'soaked-goat':
      // Flat ears, a shiver, one cross bleat, and it shakes the water off.
      d.earL = d.earR = 1.0 * e(t, 0, 0.12) * (1 - e(t, 1.6, 2.2))
      d.sy = 1 - 0.07 * e(t, 0, 0.12) * (1 - e(t, 1.6, 2.2))
      d.dx = 2.2 * Math.sin(TAU * 14 * t) * e(t, 0.15, 0.25) * (1 - e(t, 0.8, 0.9))
      d.lid = 0.55 * e(t, 0, 0.15) * (1 - e(t, 0.8, 0.85)) + bump(t, 0.3, 0.44) + bump(t, 0.56, 0.7)
      d.mouth = bump(t, 0.85, 1.4)
      d.head = 0.16 * bump(t, 0.85, 1.4) + 0.14 * shake(t, 1.6, 2.4, 6.5)
      d.rot = 0.07 * shake(t, 1.6, 2.4, 6.5)
      d.tail = 0.9 * shake(t, 1.65, 2.5, 6.5)
      break
  }
}

export function goatRig(time: number, filled: number, id: AnswerId | null, t: number, lasts: number, eager: boolean, out: Rig = blankRig()): Rig {
  Object.assign(out, blankRig())
  goatIdle(time, filled, out)
  if (eager) { out.head -= 0.25; out.mouth = Math.max(out.mouth, 0.5); out.dy -= 6 }
  if (id) {
    const d = fresh(); goatAnswer(id, t, d)
    const w = weight(t, lasts)
    // An answer gets the goat up off its folded legs.
    out.dy *= 1 - w
    mix(out, d, w)
  }
  return out
}

// --- The pig: enormous and unhurried, with a wobble that goes on after every move -----------

function pigIdle(time: number, filled: number, r: Rig): void {
  const p = PERSONALITY.pig
  const breath = Math.sin((time * TAU) / p.breath)
  r.sy = 1 + p.depth * breath
  r.sx = 1 - p.depth * 0.7 * breath
  r.dy = 24 * filled
  // The tail winds up for three seconds and lets go.
  const wind = (time % 4.4) / 4.4
  r.tail = wind < 0.7 ? wind / 0.7 : 1 - e(wind, 0.7, 0.78) + 0.25 * boing(wind, 0.78, 14, 9)
  r.earL = 0.3 * pulse(every(time, 2.7, 0.2, 0.3))
  r.earR = 0.3 * pulse(every(time, 3.9, 1.5, 0.3))
  // The snout works by itself.
  const sniff = every(time, 2.3, 0, 0.9)
  r.head = sniff >= 0 ? 0.035 * Math.sin(sniff * TAU * 5) : 0
  r.lid = Math.max(blink(time, p.blink, 2.9), 0.6 * filled)
  // Content, it grins with its mouth shut.
  r.grin = filled
  // Short of water, it tries to roll in the dry mud.
  const roll = every(time, p.fidget, 4.1, 1.5)
  if (roll >= 0 && filled < 1) { r.rot += 0.11 * Math.sin(roll * TAU * 2) * pulse(roll) * (1 - filled); r.dy += 5 * pulse(roll) * (1 - filled) }
}

function pigAnswer(id: AnswerId, t: number, d: Rig): void {
  switch (id) {
    case 'scoop-pig':
      // Snout first through the mud, a row of bubbles, and up with a moustache.
      d.head = 0.6 * e(t, 0.25, 0.5) * (1 - e(t, 2.3, 2.5)) - 0.18 * bump(t, 2.4, 2.9)
      d.headY = 16 * e(t, 0.25, 0.5) * (1 - e(t, 2.3, 2.5))
      d.dx = 34 * Math.sin(TAU * 0.62 * (t - 0.5)) * e(t, 0.5, 0.7) * (1 - e(t, 2.1, 2.4))
      d.sx = 1 + 0.03 * Math.sin(TAU * 3.1 * t) * e(t, 0.5, 0.7) * (1 - e(t, 2.1, 2.4))
      d.extra = e(t, 2.3, 2.45)
      d.mouth = bump(t, 2.65, 3.1)
      d.lid = 0.7 * e(t, 0.3, 0.5) * (1 - e(t, 2.3, 2.4))
      d.earL = d.earR = 0.5 * e(t, 0.3, 0.5) * (1 - e(t, 2.3, 2.5))
      break
    case 'bucket-pig':
      // Up, a great splat, a roll one way and the other, and grunts that go lower.
      d.dy = -46 * bump(t, 0.55, 1.0) + 22 * bump(t, 1.0, 1.35)
      d.sy = 1 + 0.1 * bump(t, 0.55, 0.9) - 0.3 * bump(t, 0.98, 1.3) + 0.08 * boing(t, 1.3, 2.4, 2.6)
      d.sx = 1 + 0.24 * bump(t, 0.98, 1.3) - 0.06 * boing(t, 1.3, 2.4, 2.6)
      d.rot = 0.42 * Math.sin(TAU * 0.7 * (t - 1.4)) * e(t, 1.4, 1.6) * (1 - e(t, 2.7, 3.1))
      // After the last and lowest grunt the mouth shuts into a grin, and it lies still.
      d.mouth = (0.6 + 0.4 * (bump(t, 1.6, 1.9) + bump(t, 2.0, 2.3) + bump(t, 2.45, 2.8) + bump(t, 2.95, 3.3))) * e(t, 0.3, 0.6) * (1 - e(t, 3.3, 3.42))
      d.grin = e(t, 3.36, 3.5)
      d.lid = 0.8 * e(t, 1.0, 1.3)
      d.earL = d.earR = 0.6 * boing(t, 1.0, 2.4, 2.2)
      d.tail = 0.5
      break
    case 'brush-pig':
      // Giggles, kicking trotters, right over onto its back, a sigh, and back.
      d.sy = 1 + 0.045 * Math.sin(TAU * 7.7 * t) * e(t, 0.25, 0.35) * (1 - e(t, 1.5, 1.7)) + 0.05 * bump(t, 2.6, 3.2)
      d.sx = 1 - 0.035 * Math.sin(TAU * 7.7 * t) * e(t, 0.25, 0.35) * (1 - e(t, 1.5, 1.7))
      d.extra2 = e(t, 0.3, 0.5) * (1 - e(t, 2.3, 2.6))
      d.extra = e(t, 1.5, 2.05) * (1 - e(t, 3.15, 3.6))
      d.rot = 0.07 * Math.sin(TAU * 2.6 * t) * e(t, 2.05, 2.2) * (1 - e(t, 2.6, 2.8))
      d.lid = 0.9 * e(t, 0.25, 0.4)
      d.mouth = 0.5 + 0.5 * Math.abs(Math.sin(TAU * 3.85 * t)) * (1 - e(t, 2.3, 2.6))
      d.earL = 0.6 * Math.sin(TAU * 7.7 * t) * e(t, 0.25, 0.35) * (1 - e(t, 1.5, 1.7))
      d.earR = -d.earL
      d.dy = -16 * bump(t, 1.5, 2.05) - 16 * bump(t, 3.15, 3.6)
      break
    case 'fork-pig':
      // A pig of straw: it turns to look at itself, sniffs three times, and sneezes it all off.
      d.sy = 1 - 0.08 * bump(t, 0.16, 0.45) + 0.03 * (bump(t, 1.9, 2.1) + bump(t, 2.2, 2.4) + bump(t, 2.5, 2.7)) + 0.07 * e(t, 2.7, 2.98) * (1 - e(t, 3.0, 3.06)) - 0.12 * bump(t, 3.0, 3.3)
      d.sx = 1 + 0.1 * bump(t, 3.0, 3.3)
      d.head = -0.3 * bump(t, 0.9, 1.3) + 0.3 * bump(t, 1.25, 1.7) - 0.1 * (bump(t, 1.9, 2.1) + bump(t, 2.2, 2.4) + bump(t, 2.5, 2.7)) - 0.4 * e(t, 2.7, 2.98) * (1 - e(t, 3.0, 3.05)) + 0.55 * bump(t, 3.0, 3.35)
      d.rot = 0.05 * bump(t, 1.25, 1.7) - 0.05 * bump(t, 0.9, 1.3) + 0.09 * boing(t, 3.05, 2.4, 2.4)
      d.lid = -1 + 2 * e(t, 2.75, 2.95) * (1 - e(t, 3.3, 3.5))
      d.mouth = bump(t, 2.98, 3.4)
      d.extra = e(t, 0.16, 0.26) * (1 - e(t, 3.0, 3.06))
      d.earL = d.earR = -0.5 * bump(t, 0.9, 1.7) + 0.8 * bump(t, 3.0, 3.5)
      break
    case 'finger-pig':
      // A belly that wobbles like jelly.
      d.sx = 1 + 0.07 * boing(t, 0, 5, 3.2)
      d.sy = 1 - 0.07 * boing(t, 0, 5, 3.2)
      d.mouth = bump(t, 0, 0.18) + bump(t, 0.2, 0.42)
      d.tail = 0.6 * Math.sin(TAU * 3 * t)
      d.earL = 0.5 * boing(t, 0, 5, 3.2)
      d.earR = -0.4 * boing(t, 0.05, 5, 3.2)
      d.head = -0.08 * bump(t, 0, 0.3)
      break
  }
}

export function pigRig(time: number, filled: number, id: AnswerId | null, t: number, lasts: number, eager: boolean, out: Rig = blankRig()): Rig {
  Object.assign(out, blankRig())
  pigIdle(time, filled, out)
  if (eager) { out.head -= 0.18; out.mouth = Math.max(out.mouth, 0.5); out.earL -= 0.3; out.earR -= 0.3 }
  if (id) { const d = fresh(); pigAnswer(id, t, d); mix(out, d, weight(t, lasts)) }
  return out
}

// --- The hens: round and jerky, in starts and stops, never in step ----------------------------

/** When each hen scratches the ground, on the yard's clock: every so many seconds, for so long. The model raises her dust by the same numbers. */
export const SCRATCHES = { every: [7.9, 6.1, 4.7], offset: [2.6, 5.5, 8.4], lasts: [1.1, 0.9, 0.7] } as const

/** Time in steps, so a hen holds a pose and then snaps to the next. */
const stepped = (time: number, fps: number): number => Math.floor(time * fps) / fps

/**
 * One hen. `i` is which hen, `mode` what the model has her doing, `speed` how fast she is going, `lead` whether
 * she is the hen the answer is about, `filled` how full the trough is, and `pecked` how long she has been pecking.
 */
export function henRig(i: number, time: number, mode: 'stand' | 'go' | 'peck', speed: number, filled: number, id: AnswerId | null, t: number, lasts: number, lead: boolean, pecked = 0, out: HenRig = blankHen()): HenRig {
  Object.assign(out, blankHen())
  const p = PERSONALITY.hens[i]
  // Idle: a breath, a head that snaps from pose to pose, and now and then a peck at nothing.
  const snap = stepped(time + i * 1.3, [3, 4.5, 6][i])
  out.puff = p.depth * Math.sin((time * TAU) / p.breath) + 0.1 * filled
  out.head = 0.22 * Math.sin(snap * [1.9, 2.7, 3.4][i] + i) + 0.08 * Math.sin(snap * 5.1 + i * 2) - 0.1 * filled
  out.lid = Math.max(blink(time, p.blink, i * 0.83), 0.6 * filled)
  const fidget = every(time, p.fidget, i * 1.7, [0.5, 0.36, 0.26][i])
  if (fidget >= 0 && filled < 1 && mode === 'stand') { out.head += 0.95 * pulse(fidget) * (1 - filled); out.rot += 0.22 * pulse(fidget) * (1 - filled) }
  // Short of grain, she scratches the ground beside the trough: one foot rakes back three times, and she looks at what it turned up.
  const rake = every(time, SCRATCHES.every[i], SCRATCHES.offset[i], SCRATCHES.lasts[i])
  if (rake >= 0 && filled < 1 && mode === 'stand') {
    const w = pulse(rake) * (1 - filled)
    out.scratch = Math.sin(rake * TAU * 3) * w
    out.rot += 0.12 * w
    out.head += 0.45 * w
  }
  // By a full trough she sits, her legs folded under her, and swells a little each time the hens croon.
  if (mode === 'stand' && !(id && id.endsWith('-hens'))) {
    out.sit = filled
    out.puff += 0.07 * filled * pulse(every(time, CROONS.every, CROONS.offset + CROONS.leads, CROONS.lasts + CROONS.leads))
  }
  if (mode === 'go') {
    // Running, the neck shoots out and the body tips forward; walking, the head nods with each step.
    const fast = clamp01((speed - 200) / 200)
    out.neck = fast
    out.rot += 0.2 * fast
    out.head = 0.12 * Math.sin(time * [13, 17, 22][i]) * (1 - fast) - 0.1 * fast
    out.dy = -5 * Math.abs(Math.sin(time * [9, 12, 16][i])) * (0.4 + fast)
    out.wing = 0.3 * fast
  }
  // Water scatters them to stand and shake (the model holds them there as it holds a pecking hen), so that is no peck.
  const pecks = mode === 'peck' && id !== 'bucket-hens'
  if (pecks) {
    // Each pecks at her own speed, tail in the air: her head is down, with a tok, half way through each beat.
    const peck = Math.abs(Math.sin((pecked * Math.PI) / PECK_BEAT[i]))
    out.head = 1.05 * peck
    out.rot = 0.34 + 0.08 * peck
    out.puff = 0
  }
  // A hen pecking at grain pecks on through another hen's answer: the brush, the fork and the finger are one hen's.
  if (!id || !id.endsWith('-hens') || (pecks && id !== 'scoop-hens')) return out
  const w = weight(t, lasts)
  const late = [0.1, 0, 0.05][i]
  switch (id) {
    case 'scoop-hens':
      // The neck shoots out at the grain before she is down pecking it.
      if (mode !== 'peck') out.neck = Math.max(out.neck, w * e(t, 0.05, 0.18) * (1 - e(t, 0.5 + late, 0.7 + late)))
      break
    case 'bucket-hens': {
      // A squawk and a flap as it lands, a shake, and up into a round ball; then one small sneeze each.
      const sneeze = bump(t, 2.5 + [0, 0.22, 0.45][i], 2.72 + [0, 0.22, 0.45][i])
      out.wing = Math.max(out.wing, w * bump(t, 0.2, 1.1) * Math.abs(Math.sin(TAU * 6 * t + i)))
      out.lean = w * 0.3 * shake(t, 1.4 + late, 2.05 + late, [8, 9.5, 11][i])
      out.puff += w * 0.62 * e(t, 1.75 + late, 2.1 + late) * (1 - e(t, 3.05, 3.5))
      out.dy += w * (-22 * bump(t, 0.2 + late, 0.5 + late) - 10 * sneeze)
      out.head += w * 0.5 * sneeze
      out.lid = Math.max(out.lid, w * (bump(t, 0.18, 0.6) + sneeze))
      break
    }
    case 'brush-hens':
      if (lead) {
        // A crest, one squawk, and a stiff strut in time with her clucks.
        out.extra = w * e(t, 0.2, 0.75) * (1 - e(t, 3.3, 3.6))
        out.dy += w * (-26 * bump(t, 0.85, 1.2) - 8 * Math.abs(Math.sin((Math.PI * (t - STRUT.off)) / STRUT.every)) * e(t, STRUT.off - 0.05, STRUT.off + 0.05) * (1 - e(t, STRUT.off + STRUT.every * STRUT.steps - 0.25, STRUT.off + STRUT.every * STRUT.steps - 0.15)))
        out.head = out.head * (1 - w) - w * 0.42 * e(t, 1.2, 1.5)
        out.wing = Math.max(out.wing, w * bump(t, 0.85, 1.25))
        out.rot = out.rot * (1 - w) - w * 0.12 * e(t, 1.3, 1.6)
        out.lid = out.lid * (1 - w)
      } else {
        // The other two stare.
        out.head = out.head * (1 - w) - w * 0.3 * e(t, 0.9 + late, 1.1 + late)
        out.neck = w * 0.5 * e(t, 0.9 + late, 1.2 + late) * (1 - e(t, 3.2, 3.5))
        out.lid = out.lid * (1 - w)
      }
      break
    case 'fork-hens':
      if (lead) {
        // A haystack with two feet walks off; then her head pops out of the top.
        out.extra = w * e(t, 0.16, 0.3)
        out.extra2 = e(t, 3.38, 3.5)
        out.dy += w * (8 * bump(t, 0.16, 0.5) - 14 * bump(t, 3.38, 3.7))
        out.lean = w * 0.16 * Math.sin(TAU * 2.2 * t) * e(t, 0.7, 0.9) * (1 - e(t, 3.2, 3.4))
        out.head = out.head * (1 - w)
      } else {
        // The other two stare. Each jumps when the haystack walks into her, which the yard says (henExtras).
        out.head = out.head * (1 - w) - w * 0.25 * e(t, 0.5, 0.8)
      }
      break
    case 'finger-hens':
      if (lead) {
        out.dy += w * -44 * bump(t, 0, 0.42)
        out.wing = Math.max(out.wing, w * bump(t, 0, 0.55) * (0.6 + 0.4 * Math.sin(TAU * 9 * t)))
        out.head = out.head * (1 - w) - w * 0.3 * bump(t, 0, 0.5)
        out.lid = out.lid * (1 - w)
      } else {
        // The other two cluck, a nod to each cluck, on the clucks' own beat.
        out.head += w * 0.4 * (bump(t, 0.45, 0.6) + bump(t, 0.7, 0.85))
      }
      break
  }
  return out
}

// --- The bystanders --------------------------------------------------------------------------

/** The cat's tail under the hatch: a slow swing with a curl at the tip that comes late. */
export function catTail(time: number): number {
  return 0.5 * Math.sin((time * TAU) / 2.9) + 0.18 * Math.sin((time * TAU) / 1.3 + 0.8)
}

/** How far the loft hatch is lifted, 0 to 1, for the seconds since it was touched: up fast, held, and down with a clap. */
export function hatchLift(since: number): number {
  if (since < 0) return 0
  return e(since, 0, 0.22) * (1 - e(since, 1.9, 2.3)) + 0.08 * boing(since, 0.22, 3, 5)
}

/** A cloud's slow drift, each at its own pace. */
export function cloudDrift(index: number, time: number): number {
  return 22 * Math.sin((time * TAU) / [41, 57][index] + index * 2)
}

// --- Asleep, and settled ------------------------------------------------------------------------

const SNORE = { pony: 3.9, goat: 2.6, pig: 3.2 } as const

/**
 * Asleep where it stands: eyes shut, head low, ears and tail let go, and a slow breath of its own. Laid over
 * the rig the animal already has, by how far asleep it is.
 */
export function asleepRig(out: Rig, amount: number, time: number, which: keyof typeof SNORE): Rig {
  if (amount <= 0) return out
  const breath = Math.sin((time * TAU) / SNORE[which])
  out.lid = Math.max(out.lid, amount)
  out.head += amount * { pony: 0.24, goat: 0.34, pig: 0.1 }[which]
  out.sy += amount * breath * { pony: 0.03, goat: 0.016, pig: 0.05 }[which]
  out.sx -= amount * breath * { pony: 0.012, goat: 0, pig: 0.03 }[which]
  out.tail *= 1 - amount
  out.jaw *= 1 - amount
  out.dx *= 1 - amount
  out.rot *= 1 - amount
  out.earL = out.earL * (1 - amount) + amount * 0.45
  out.earR = out.earR * (1 - amount) + amount * 0.45
  // The pony's lip flutters on each breath out; the goat's and the pig's mouths hang a little open.
  out.mouth = out.mouth * (1 - amount) + amount * (which === 'pony' ? 0.2 + 0.25 * Math.max(0, -breath) * Math.abs(Math.sin(time * 21)) : 0.12 + 0.1 * Math.max(0, breath))
  return out
}

/** A thing has just been lifted: the ears come up, and stay up for a moment. `since` is seconds since the lift. */
export function perkRig(out: Rig, since: number): Rig {
  const w = e(since, 0, 0.1) * (1 - e(since, 0.9, 1.4))
  out.earL -= 0.5 * w
  out.earR -= 0.5 * w
  return out
}

/**
 * A knock on the bare page close by: the head comes round to it, up or down, with the ears up, and goes back.
 * `since` is seconds since the knock; `up` is whether the knock was above the head.
 */
export function turnedRig(out: Rig, since: number, up: boolean): Rig {
  const w = e(since, 0, 0.14) * (1 - e(since, 0.8, 1.25))
  out.head += (up ? -0.36 : 0.3) * w
  out.headY += (up ? -6 : 6) * w
  out.earL -= 0.4 * w
  out.earR -= 0.4 * w
  out.lid *= 1 - w
  return out
}

/**
 * Its thing was taken away in the middle of a use: the head goes after it with the mouth left open, and the ears,
 * up at first, sink flat before it gives up and looks back. `since` is seconds since the thing left.
 */
export function leftRig(out: Rig, since: number, up: boolean): Rig {
  const w = e(since, 0, 0.12) * (1 - e(since, 0.95, 1.3))
  const sink = e(since, 0.3, 0.55) * (1 - e(since, 0.95, 1.3))
  out.head += (up ? -0.42 : 0.34) * w
  out.headY += (up ? -8 : 8) * w
  out.earL += -0.45 * w + 0.85 * sink
  out.earR += -0.45 * w + 0.85 * sink
  out.lid *= 1 - w
  out.mouth = Math.max(out.mouth, 0.4 * w)
  return out
}

/** The same for a hen, who turns to face the knock (the view turns her): her neck comes out and her head goes up. */
export function henTurned(out: HenRig, since: number): HenRig {
  const w = e(since, 0, 0.1) * (1 - e(since, 0.8, 1.25))
  out.neck += 0.5 * w
  out.head = out.head * (1 - w) - 0.3 * w
  out.lid *= 1 - w
  out.scratch *= 1 - w
  return out
}

/** Waking with a yawn: the mouth comes wide open and the head goes back. `since` is seconds, or below 0. */
export function yawnRig(out: Rig, since: number): Rig {
  if (since < 0) return out
  const b = bump(since, 0, 0.75)
  out.mouth = Math.max(out.mouth, b)
  out.head -= 0.16 * b
  return out
}

/** How far the white hen's beak is thrown up at each note of her crow, 0 to 1. `since` is seconds since she began. */
export function crowLift(since: number): number {
  if (since < 0) return 0
  return CROW.notes.reduce((lift, note, n) => Math.max(lift, bump(since, note, note + (n === CROW.notes.length - 1 ? 0.56 : 0.16))), 0)
}

/** The moment an animal gives its settled sound in the ending: each with its own small move. `since` is seconds, or below 0. */
export function settledRig(out: Rig, since: number, which: keyof typeof SNORE): Rig {
  if (since < 0) return out
  const b = bump(since, 0, 0.9)
  if (which === 'pony') { out.head -= 0.14 * b; out.mouth = Math.max(out.mouth, 0.8 * b); out.tail += 0.5 * boing(since, 0.1, 1.8, 3) }
  else if (which === 'goat') { out.jaw += Math.sin(since * TAU * 3.3) * b; out.mouth = Math.max(out.mouth, 0.5 * b); out.tail += Math.sin(since * 40) * b }
  else { out.sx += 0.06 * boing(since, 0, 4, 3.5); out.sy -= 0.06 * boing(since, 0, 4, 3.5); out.mouth = Math.max(out.mouth, b) }
  return out
}

/**
 * What a hen does on her way out: the russet hen trips over the sill and pitches forward, and the white hen
 * shakes herself once she is out. And, in the ending, the settled hens puff up as they croon.
 */
export function henExtras(out: HenRig, trip: number, shook: number, settled: number, bumped = -1): HenRig {
  // The haystack has walked into her: she jumps with her wings out and rocks as she lands.
  if (bumped >= 0) { out.dy += -34 * bump(bumped, 0, 0.44); out.wing = Math.max(out.wing, bump(bumped, 0, 0.54)); out.lean += 0.25 * boing(bumped, 0, 3, 4) }
  if (trip >= 0) { out.rot += 0.75 * bump(trip, 0, 0.5); out.dy += -14 * bump(trip, 0.1, 0.5); out.wing = Math.max(out.wing, bump(trip, 0, 0.6)) }
  if (shook >= 0) { out.lean += 0.3 * shake(shook, 0, 0.8, 9); out.puff += 0.3 * bump(shook, 0, 0.9); out.wing = Math.max(out.wing, 0.5 * bump(shook, 0, 0.8)) }
  if (settled >= 0) out.puff += 0.14 * bump(settled, 0, 1.0)
  return out
}

/** How far round a touch has the sun's rays, in radians: one whole turn, unwinding as `spin` falls from 1 to 0. */
export function sunTurn(spin: number): number {
  return (1 - (1 - clamp01(spin)) ** 3) * TAU
}

/** The cat's stretch on the roof: long and low, then back. `since` is seconds, or below 0. */
export function catStretches(since: number): number {
  return since < 0 ? 0 : bump(since, 0, 1.4)
}
