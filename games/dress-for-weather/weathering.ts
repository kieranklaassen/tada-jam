import type { Figure, Wearer } from './kinds'
import { ARMS, BODIES, CREASE_Y, GARDEN, scarfTip, type Box, type Point } from './layout'
import type { Act, DogAct, Move, Step } from './outing'

// The cells of outing.ts as numbers: how far a garment and its wearer are
// from rest at each moment of a cell. Pure, so the view only lays the result
// on the paper and a test can hold every move to its ends. `u` runs from 0
// to 1 over the cell.

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const span = (u: number, a: number, b: number): number => clamp01((u - a) / (b - a))
const ease = (t: number): number => t * t * (3 - 2 * t)
/** Up and back down over the cell. */
const bump = (u: number): number => Math.sin(Math.PI * clamp01(u))
/** `n` swings to and fro inside the cell, small at both ends. */
const wob = (u: number, n: number): number => Math.sin(2 * Math.PI * n * u) * bump(u)
/** Up, held, and back. */
const held = (u: number): number => ease(span(u, 0, 0.25)) * (1 - ease(span(u, 0.78, 1)))

/** How far a garment is from where it lies at rest. */
export type Shift = {
  dx: number
  dy: number
  rot: number
  /** Its paper grown or shrunk across and down: the weather may soak, fill or stretch what a hand cannot. */
  sx: number
  sy: number
  /** For a pair: how far apart the two pieces are, as a share of their rest distance. */
  apart: number
  /** The umbrella's canopy turned inside out, 0 to 1. */
  flip: number
  /** For a pair, the piece on the viewer's left when it alone moves. */
  other: { dx: number; dy: number; rot: number } | null
  /** The garment has left its wearer for good. */
  gone: boolean
}

export const AT_REST: Shift = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, apart: 1, flip: 0, other: null, gone: false }

/** A frozen scarf is stiff from here to here of its cell, and the figure has its tip at the gate's post from `RULER.knocks`. */
export const RULER = { stiff: 0.25, knocks: 0.55, stays: 0.8, soft: 0.85 } as const

/**
 * A garment's move at `u`. `reach` is, for the hat the wind takes, the way from where it sat to where the dog
 * will bring it. `lay` is how the garment is turned where it lies at rest, for the move that turns it to a
 * heading of its own.
 */
export function garmentShift(move: Move, u: number, reach: Point = { x: 0, y: 0 }, lay = 0): Shift {
  const s: Shift = { ...AT_REST }
  switch (move) {
    case 'none': break
    case 'drum': s.dy = 1.6 * wob(u, 8); break
    case 'hang': s.rot = 0.035 * wob(u, 1); s.sy = 1 + 0.03 * bump(u); break
    case 'stiff': s.rot = 0.06 * Math.sign(Math.sin(4 * Math.PI * u)) * bump(u); break
    case 'sail': s.sx = 1 + 0.28 * bump(u); s.rot = 0.08 * wob(u, 5); break
    case 'hood': s.dy = -2.5 * Math.abs(wob(u, 9)); break
    case 'stretch': s.sy = 1 + 0.3 * bump(u); break
    case 'gape': s.sx = 1 + 0.12 * bump(u); break
    case 'rattle': s.rot = 0.035 * wob(u, 10); break
    case 'droopy': s.dy = 10 * bump(u); s.sy = 1 + 0.06 * bump(u); break
    case 'slosh': s.rot = 0.12 * wob(u, 2); break
    case 'whistle': s.dy = -3 * Math.abs(wob(u, 2)); break
    case 'pulloff': s.other = { dx: -46 * bump(u), dy: -30 * bump(u), rot: -0.6 * bump(u) }; break
    case 'droop': s.dy = 20 * bump(u); s.rot = 0.14 * bump(u); break
    case 'blowoff': {
      const away = ease(span(u, 0.1, 0.9))
      s.dx = reach.x * away + 170 * Math.sin(3 * Math.PI * u) * bump(u)
      // Up off the head, down to the lawn while it is still near the figure, and along the lawn in bounces: it is low before it crosses the middle of the sheet, where the home control is.
      s.dy = reach.y * ease(span(u, 0.05, 0.45)) - 90 * bump(span(u, 0, 0.3)) - 46 * Math.abs(Math.sin(3 * Math.PI * span(u, 0.45, 1)))
      s.rot = 4 * Math.PI * ease(u)
      s.gone = u >= 1
      break
    }
    case 'itch': s.dx = 3 * wob(u, 7); break
    case 'limp': s.sy = 1 + 0.28 * bump(u); s.dy = 8 * bump(u); break
    case 'ruler': {
      // The tail stands out level whatever way the scarf lies: straight as a ruler, pointing at the gate.
      let turn = -Math.PI / 2 - lay
      while (turn <= -Math.PI) turn += 2 * Math.PI
      while (turn > Math.PI) turn -= 2 * Math.PI
      s.rot = turn * ease(span(u, 0, RULER.stiff)) * (1 - ease(span(u, RULER.soft, 1)))
      break
    }
    case 'stream': s.rot = -1.2 * held(u) + 0.1 * wob(u, 9); break
    case 'mop': s.dy = -50 * held(u); s.dx = 14 * wob(u, 3); break
    case 'wring': s.sx = 1 - 0.3 * Math.abs(wob(u, 2)); s.rot = 0.5 * wob(u, 2); break
    // The two mittens pat the ball between them, and open as it is lobbed.
    case 'pat': s.apart = 1 - 0.7 * ease(span(u, 0, 0.1)) * (1 - ease(span(u, LOB.from - 0.04, LOB.from + 0.1))); s.dy = u < LOB.from ? -10 * Math.abs(Math.sin(2 * Math.PI * 3 * u)) * bump(u / LOB.from) : -34 * bump(span(u, LOB.from, LOB.from + 0.2)); break
    case 'kites': s.dy = -90 * held(u); s.rot = 0.5 * wob(u, 6); s.apart = 1 + 0.5 * held(u); break
    case 'peel': s.other = { dx: 40 * bump(u), dy: -120 * bump(u), rot: 0.8 * bump(u) }; break
    case 'stick': s.dy = -10 * Math.abs(Math.sin(2 * Math.PI * u)); break
    case 'prod': s.dy = 14 * Math.abs(Math.sin(2 * Math.PI * u)); break
    case 'bendump': s.dy = 6 * span(u, 0, 0.6) * (1 - span(u, 0.85, 1)); s.rot = 0.5 * ease(span(u, 0.6, 0.78)) * (1 - ease(span(u, 0.85, 1))); break
    case 'invert': s.flip = ease(span(u, 0.05, 0.2)) * (1 - ease(span(u, 0.9, 1))); s.rot = 0.12 * wob(u, 3); break
    case 'reed': s.dx = 2.5 * wob(u, 14); break
    case 'shade': s.rot = (Math.PI / 2) * held(u); break
    case 'twirl': s.rot = u >= 1 ? 0 : 2 * Math.PI * ease(u); break
    case 'tremble': s.dy = 1.2 * wob(u, 12); break
  }
  return s
}

/** How far a figure is from standing at rest: moved along and up, tipped on its stand, squashed, bent at the crease, or laid right over. */
export type Stance = { dx: number; up: number; tilt: number; squash: number; bend: number; lie: number }

export const STANDING: Stance = { dx: 0, up: 0, tilt: 0, squash: 0, bend: 0, lie: 0 }

function plain(act: Act, u: number): Stance {
  const s: Stance = { ...STANDING }
  switch (act) {
    case 'strut': s.up = 14 * Math.abs(wob(u, 2)); s.tilt = 0.04 * wob(u, 2); break
    case 'hunch': s.squash = 0.05 * bump(u); break
    case 'stiffstep': s.tilt = 0.07 * Math.sign(Math.sin(4 * Math.PI * u)) * bump(u); break
    case 'towed': s.dx = -110 * held(u); s.tilt = 0.12 * held(u); break
    case 'fan': s.tilt = 0.03 * wob(u, 6); break
    case 'sag': s.squash = 0.08 * bump(u); break
    case 'sink': s.squash = 0.1 * held(u); break
    case 'leap': s.up = 70 * bump(span(u, 0.3, 0.7)); break
    case 'planted': s.squash = 0.03 * bump(u); break
    case 'wilt': s.tilt = 0.16 * held(u); s.squash = 0.07 * held(u); break
    case 'jump': s.up = 90 * bump(span(u, 0, 0.42)); s.squash = 0.14 * bump(span(u, 0.42, 0.7)); break
    case 'stomp': s.tilt = 0.09 * wob(u, 2); s.up = 8 * Math.abs(wob(u, 2)); break
    case 'onefoot': s.tilt = 0.14 * held(u); break
    case 'peer': s.squash = -0.03 * held(u); break
    case 'chase': s.dx = 110 * wob(u, 1); s.up = 10 * Math.abs(wob(u, 4)); break
    case 'scratch': s.tilt = 0.05 * wob(u, 7); break
    case 'leanaway': s.tilt = -0.14 * held(u); break
    case 'bite': s.tilt = -0.06 * bump(u); break
    case 'walk': s.dx = 30 * wob(u, 1); s.up = 6 * Math.abs(wob(u, 2)); break
    case 'dumped': s.squash = 0.16 * bump(span(u, 0.72, 1)); break
    case 'lifted': s.up = 190 * bump(span(u, 0.15, 0.95)); s.dx = 40 * wob(u, 1); s.tilt = 0.1 * wob(u, 2); break
    case 'liedown': s.lie = held(u); break
    case 'squish': s.tilt = 0.06 * wob(u, 2); s.squash = 0.03 * Math.abs(wob(u, 2)); break
    case 'hopfoot': s.tilt = 0.12 * Math.sign(Math.sin(8 * Math.PI * u)) * bump(u); s.up = 12 * Math.abs(wob(u, 4)); break
    case 'curl': s.tilt = 0.04 * wob(u, 3); s.squash = 0.02 * bump(u); break
    case 'stamp': s.up = 16 * Math.abs(wob(u, 3)); s.squash = 0.05 * Math.abs(Math.cos(6 * Math.PI * u)) * bump(u); break
    case 'tug': s.tilt = 0.03 * wob(u, 8); s.squash = -0.02 * bump(u); break
    case 'straighten': s.squash = -0.04 * held(u); s.bend = -0.06 * held(u); break
    case 'heron': s.tilt = 0.15 * wob(u, 1.5); s.up = 26 * Math.abs(wob(u, 1.5)); break
    case 'pats': s.tilt = 0.12 * wob(u, 4); break
    case 'cower': s.squash = 0.1 * held(u); break
    case 'look': s.tilt = 0.03 * bump(u); break
    // The walk to the gate is each figure's own (stanceOf).
    case 'togate': break
  }
  return s
}

/** How late the grandfather starts every move: the weather reaches him last. */
export const LATE = 0.22

/**
 * What a figure does at `u` of a cell, in its own manner: the child fast and whole-bodied, with a bounce of its
 * own; the grandfather late and from the crease; the baby by rocking, and carried furthest.
 */
export function stanceOf(act: Act | null, who: Figure, u: number, reach = 0): Stance {
  if (!act) return { ...STANDING }
  if (act === 'togate') {
    // Each sets off in its own time and is there, standing still, when the scarf knocks the post.
    const from = who === 'grandfather' ? LATE : who === 'baby' ? 0.08 : 0.14
    const going = span(u, from, RULER.knocks), there = ease(going) * (1 - ease(span(u, RULER.stays, 1)))
    const back = span(u, RULER.stays, 1)
    const step = going < 1 ? going : back
    return {
      dx: reach * there,
      up: who === 'child' ? 12 * Math.abs(Math.sin(3 * Math.PI * step)) : 0,
      tilt: who === 'baby' ? 0.12 * Math.sin(4 * Math.PI * step) : 0,
      squash: 0,
      bend: who === 'grandfather' ? 0.05 * Math.sin(2 * Math.PI * step) : 0,
      lie: 0,
    }
  }
  if (who === 'grandfather') {
    const s = plain(act, span(u, LATE, 1))
    return { dx: s.dx * 0.7, up: s.up * 0.45, tilt: s.tilt * 0.25, squash: s.squash * 0.7, bend: s.bend + s.tilt * 1.4, lie: s.lie }
  }
  const s = plain(act, u)
  if (who === 'baby') return { ...s, dx: s.dx * 1.3, up: s.up * 1.45, tilt: s.tilt * 1.5 + 0.06 * wob(u, 3) }
  return { ...s, up: s.up + (s.up > 0 || s.dx !== 0 ? 4 * Math.abs(wob(u, 4)) : 0) }
}

/** What the dog does beside the figure: `reach` is how far along the ground it has to go to do it. */
export function dogStance(act: DogAct | null, u: number, reach = 0): Stance {
  const s: Stance = { ...STANDING }
  switch (act) {
    case null: break
    // The splash has reached it (BURST.lands): it ducks, and shakes.
    case 'soaked': s.squash = 0.16 * bump(span(u, BURST.lands, 0.95)); s.tilt = 0.1 * wob(span(u, BURST.lands, 1), 4); break
    case 'fetch': s.dx = reach * 0.5 * wob(u, 1); s.up = 12 * Math.abs(wob(u, 5)); break
    case 'squeeze': s.dx = reach * held(u); s.squash = 0.06 * held(u); break
    case 'flump': s.squash = 0.2 * bump(span(u, LOB.lands, 1)); break
    case 'shake': s.tilt = 0.16 * wob(u, 5); break
  }
  return s
}

/** How far along the lawn the dog has to go to be beside the figure. */
export const DOG_REACH = GARDEN.figure.x - GARDEN.dog.x - 150

/** The figure's stance at `u` of a step of an outing: for a frozen scarf it walks until the scarf's tip is at the gate's post. */
export function figureIn(step: Step | null, who: Figure, u: number): Stance {
  if (!step) return { ...STANDING }
  const act = step.kind === 'taste' ? step.taste.act : step.cell.act
  const reach = act === 'togate' && step.kind === 'cell' ? GARDEN.post.x - scarfTip(who, step.part).x : 0
  return stanceOf(act, who, u, reach)
}

/** The dog's stance at `u` of a step of an outing. */
export function dogIn(step: Step | null, u: number): Stance {
  return dogStance(step && step.kind !== 'taste' ? step.cell.dog : null, u, DOG_REACH)
}

// --- Where a stance puts a figure: the one transform the view draws by and the tests measure by ---------

/**
 * How far a figure that lies down slides along the lawn, as a share of its height: back toward the middle of
 * the sheet, as its head goes down toward the gate, so that all of it lies on the sheet.
 */
export const LIE_SLIDE = -0.76
/** How far over a figure that lies down goes, in radians: on its side, head toward the gate. */
export const LIE_TURN = 1.45
/** Half the width of each stand: a figure that lies down lies on the lawn, not half under it. */
export const STAND_HALF: Record<Wearer, number> = { child: 76, grandfather: 64, baby: 92, dog: 52 }

/** A stand with a stance laid over it: where its middle is, how it is turned, and how it is squashed. */
export function standing(at: Point, stance: Stance, who: Wearer): { x: number; y: number; rot: number; sx: number; sy: number } {
  const height = BODIES[who].height
  return { x: at.x + stance.dx + stance.lie * height * LIE_SLIDE, y: at.y - stance.up - stance.lie * STAND_HALF[who], rot: stance.tilt + stance.lie * LIE_TURN, sx: 1 + stance.squash * 0.6, sy: 1 - stance.squash }
}

/** Where a point of a figure (from the middle of its stand) is on the stage in a stance. The grandfather bends at his crease: everything of him above it turns about it. */
export function placed(p: Point, at: Point, stance: Stance, who: Wearer): Point {
  let { x, y } = p
  if (who === 'grandfather' && y < CREASE_Y) {
    const cos = Math.cos(stance.bend), sin = Math.sin(stance.bend), dy = y - CREASE_Y
    ;[x, y] = [x * cos - dy * sin, CREASE_Y + x * sin + dy * cos]
  }
  const by = standing(at, stance, who), cos = Math.cos(by.rot), sin = Math.sin(by.rot)
  x *= by.sx
  y *= by.sy
  return { x: by.x + x * cos - y * sin, y: by.y + x * sin + y * cos }
}

// --- What a cell shows beside the garment's own move ------------------------------------------------------

/** The snowball: patted until `from`, in the air until it `lands` on the dog, and then in pieces. */
export const LOB = { from: 0.5, lands: 0.86 } as const

/** Where the snowball is at `u`, between the mittens (`from`) and the dog's back (`to`): how big it is, and how far it has burst. */
export function lobAt(u: number, from: Point, to: Point): Point & { r: number; burst: number } {
  if (u < LOB.from) return { ...from, r: 8 + 20 * Math.min(1, u / (LOB.from - 0.08)), burst: 0 }
  if (u < LOB.lands) {
    const p = span(u, LOB.from, LOB.lands)
    return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - 200 * Math.sin(Math.PI * p), r: 28, burst: 0 }
  }
  return { ...to, r: 28, burst: span(u, LOB.lands, 1) }
}

/** The splash of a jump in boots: it leaves the puddle at `from` and has reached the dog at `lands`. */
export const BURST = { from: 0.42, lands: 0.72 } as const

/**
 * Where drop `i` of `n` is at `u`, from the feet: half go the dog's way, the furthest as far as the dog
 * (`reach`, to the left), half the other way and not so far. Null until the feet come down.
 */
export function burstAt(i: number, n: number, u: number, reach: number): Point | null {
  const out = span(u, BURST.from, BURST.lands)
  if (out <= 0) return null
  const along = (i + 0.5) / n, high = 0.5 + ((along * 7) % 1) * 0.5
  const x = along < 0.5 ? (-(1 - 2 * along) / (1 - 1 / n)) * reach : (2 * along - 1) * 210
  return { x: x * out, y: -150 * high * Math.sin(Math.PI * out) }
}

/** The raincoat's hood in the wind: how far up it is, 0 to 1, and how far it is shaken over, in radians. */
export function hoodOf(u: number): { up: number; shake: number } {
  const up = ease(span(u, 0, 0.1)) * (1 - ease(span(u, 0.8, 1)))
  return { up, shake: 0.09 * Math.sin(2 * Math.PI * 9 * u) * up }
}

/** How far the toes of the socks have curled up in the warm grass, 0 to 1. */
export function toeCurl(u: number): number {
  return ease(span(u, 0.18, 0.4)) * (1 - ease(span(u, 0.82, 1)))
}

/** The moments within its cell at which each act of the hands strokes, pats or pulls: the moments of its sounds in outing.ts. */
export const STROKES: Partial<Record<Act, readonly number[]>> = { scratch: [0.15, 0.4, 0.65], tug: [0.1, 0.55], pats: [0.55, 0.72] }

/** 1 at each stroke of an act and 0 between them. */
export function strokeOf(act: Act, u: number): number {
  let most = 0
  for (const at of STROKES[act] ?? []) most = Math.max(most, bump(span(u, at - 0.1, at + 0.1)))
  return most
}

/** The acts a figure does with its hands. */
export const HAND_ACTS: readonly Act[] = ['fan', 'scratch', 'tug', 'pats', 'cower']

/** Where each hand goes for a thing it scratches or pats, from the middle of the stand, as the viewer sees them. */
export type Reach = { left: Point; right: Point }

/**
 * Where the hands go for a piece of paper worn somewhere on a figure (`box`, from the middle of its stand):
 * each to the point of it that is nearest its own shoulder, a little in from the edge. So a hand scratches
 * under the brim of a hat on the head, and at the top of a hat on the feet.
 */
export function reachFor(who: Figure, box: Box): Reach {
  const shoulder = ARMS[who].shoulder, inset = 12
  const near = (x: number, y: number): Point => ({
    x: Math.max(Math.min(box.x0 + inset, box.x1), Math.min(Math.max(box.x1 - inset, box.x0), x)),
    y: Math.max(Math.min(box.y0 + inset, box.y1), Math.min(Math.max(box.y1 - inset, box.y0), y)),
  })
  return { left: near(-shoulder.x, shoulder.y), right: near(shoulder.x, shoulder.y) }
}

/**
 * Where a figure's hands are at `u` of an act, from the middle of its stand, as the viewer sees them: `left`
 * and `right`, each null while that arm hangs at rest. One hand fans the face, scratches or pulls at the
 * collar, and it is the left, since what a figure holds it holds in the right; patting takes both, and so do
 * the ears. `reach` is where the hands go for what is scratched or patted (`reachFor`), and the sides of the
 * head when nothing is given. Between two strokes a hand draws back along its own way, so that a stroke is
 * seen even where a short arm cannot get all the way.
 */
export function handsOf(act: Act | null, who: Figure, u: number, reach: Reach | null = null): { left: Point | null; right: Point | null } {
  if (!act || !HAND_ACTS.includes(act)) return { left: null, right: null }
  const body = BODIES[who], rest = ARMS[who].hand
  const raised = ease(span(u, 0, 0.12)) * (1 - ease(span(u, 0.88, 1)))
  if (raised <= 0) return { left: null, right: null }
  const at = reach ?? { left: { x: -(body.faceR - 12), y: body.face.y - body.faceR * 0.6 }, right: { x: body.faceR - 12, y: body.face.y - body.faceR * 0.6 } }
  const to = (x: number, y: number, side: 1 | -1, back = 0): Point => {
    const far = raised * (1 - back)
    return { x: side * rest.x + (x - side * rest.x) * far, y: rest.y + (y - rest.y) * far }
  }
  switch (act) {
    // Beside the face, to and fro.
    case 'fan': return { left: to(-(body.faceR + 24) + 12 * Math.sin(2 * Math.PI * 5 * u), body.face.y + 8, -1), right: null }
    // At the thing that itches, one scratch for each skritch.
    case 'scratch': return { left: to(at.left.x + 12 * (2 * strokeOf(act, u) - 1), at.left.y, -1, 0.14 * (1 - strokeOf(act, u))), right: null }
    // A finger in the collar, pulled out for air.
    case 'tug': return { left: to(-18 - 30 * strokeOf(act, u), (body.pin.neck?.y ?? body.face.y) + 4, -1), right: null }
    // A hand over each ear, held there.
    case 'cower': return { left: to(-(body.faceR + 2), body.face.y + 8, -1), right: to(body.faceR + 2, body.face.y + 8, 1) }
    // Both hands on the thing on its head, drawn back and brought down on it for each pat.
    default: {
      const back = 0.22 * (1 - strokeOf(act, u))
      return { left: to(at.left.x, at.left.y, -1, back), right: to(at.right.x, at.right.y, 1, back) }
    }
  }
}
