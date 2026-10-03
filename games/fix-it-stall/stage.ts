import { boardFor, type Circuit } from './circuit'

// Where the toy's things lie, and what a finger is on. Pure geometry, no
// drawing: the view paints from the same numbers the touch is read with, so
// what looks touchable is what answers.
//
// Everything is in stage units: the scene is 1180 by 820, fitted whole into
// whatever surface the shell gives and centred there.

export type P = { x: number; y: number }

export const STAGE = { w: 1180, h: 820 } as const

/** Stage units to surface pixels: one scale and an offset. */
export type Fit = { scale: number; x: number; y: number }

export function fit(width: number, height: number): Fit {
  const scale = Math.min(width / STAGE.w, height / STAGE.h)
  return { scale, x: (width - STAGE.w * scale) / 2, y: (height - STAGE.h * scale) / 2 }
}

/** A point on the surface, in stage units. */
export function toStage(f: Fit, point: P): P {
  return { x: (point.x - f.x) / f.scale, y: (point.y - f.y) / f.scale }
}

/** The toy on the mat: pad (0, 0) of its board, the size of one pad unit, and the coil of leads beside it. */
export const TOY = { x: 400, y: 330, u: 112, coil: { x: 196, y: 404, r: 66 } } as const

/** How near a finger must be, in stage units. Each is a target of 60 or more across at the scene's own size. */
export const REACH = { pad: 36, boot: 30, clip: 38, lamp: 28, wire: 20 } as const

export function padAt(circuit: Circuit, pad: number): P {
  const p = boardFor(circuit).pads[pad]
  return { x: TOY.x + p.x * TOY.u, y: TOY.y + p.y * TOY.u }
}

/** The lazy curve a lead lies in between two points, bowed to one side by `bend`. */
export function leadCurve(p: P, q: P, bend: number): [P, P, P, P] {
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1
  const nx = -dy / d, ny = dx / d
  return [p, { x: p.x + dx * 0.25 + nx * bend, y: p.y + dy * 0.25 + ny * bend }, { x: p.x + dx * 0.75 + nx * bend, y: p.y + dy * 0.75 + ny * bend }, q]
}

export function onCurve([a, b, c, d]: [P, P, P, P], t: number): P {
  const s = 1 - t
  return { x: s * s * s * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t * t * t * d.x, y: s * s * s * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t * t * t * d.y }
}

/** How far a lead bows when it lies at rest: a short one stands well clear of what it bridges. Alternate leads bow to opposite sides. */
export function restBend(p: P, q: P, index: number): number {
  const span = Math.hypot(q.x - p.x, q.y - p.y)
  return (index % 2 ? -1 : 1) * (span < TOY.u * 1.6 ? TOY.u * 0.7 : TOY.u * 0.34)
}

/**
 * Where a lead's loose clip lies on the mat: out from its pad, away from the
 * middle of the toy, each lead fanned a little from the last so two never lie
 * on each other. It is derived, not stored: a lead is saved as one pad and a
 * loose end, and the end is found again here.
 */
export function looseEnd(circuit: Circuit, lead: number): P {
  const board = boardFor(circuit), from = padAt(circuit, circuit.leads[lead].a)
  const mid = { x: TOY.x + ((board.cols - 1) * TOY.u) / 2, y: TOY.y + ((board.rows - 1) * TOY.u) / 2 }
  const out = Math.atan2(from.y - mid.y, from.x - mid.x) + ((lead % 5) - 2) * 0.42
  return { x: from.x + Math.cos(out) * TOY.u * 1.05, y: from.y + Math.sin(out) * TOY.u * 1.05 }
}

/** The two ends of a lead as it lies: its first clip on its pad, its second on a pad or loose on the mat. */
export function leadEnds(circuit: Circuit, lead: number): [P, P] {
  const l = circuit.leads[lead]
  return [padAt(circuit, l.a), l.b === null ? looseEnd(circuit, lead) : padAt(circuit, l.b)]
}

/** The boot of a clip: the coloured grip a finger takes to pull the clip off. It sits a little way back along the lead. */
export function bootAt(circuit: Circuit, lead: number, end: 0 | 1, bend: number): P {
  const [p, q] = leadEnds(circuit, lead)
  return onCurve(leadCurve(p, q, bend), end === 0 ? 0.17 : 0.83)
}

export type Hit =
  /** The boot of a clip that bites a pad. */
  | { on: 'boot'; lead: number; end: 0 | 1 }
  | { on: 'pad'; pad: number }
  /** A lead's loose clip, lying on the mat. */
  | { on: 'clip'; lead: number }
  /** The body of a part: the cell in its holder, the lamp's glass. */
  | { on: 'part'; part: number }
  /** The wire of a lead, between its clips. */
  | { on: 'wire'; lead: number }
  | { on: 'coil' }
  | { on: 'mat' }

const near = (a: P, b: P, r: number) => Math.hypot(a.x - b.x, a.y - b.y) <= r

/**
 * What the finger is on, the most particular thing first: a boot before the
 * pad it bites, the middle of a part before its pads, a pad before a wire
 * that crosses it. `bends` is how far each lead bows now.
 */
export function hitTest(circuit: Circuit, at: P, bends: readonly number[]): Hit {
  const bendOf = (i: number) => bends[i] ?? restBend(...leadEnds(circuit, i), i)
  // The newest lead is on top, so it is tried first.
  for (let i = circuit.leads.length - 1; i >= 0; i--) {
    if (circuit.leads[i].b === null) {
      if (near(at, looseEnd(circuit, i), REACH.clip)) return { on: 'clip', lead: i }
    } else if (near(at, bootAt(circuit, i, 1, bendOf(i)), REACH.boot)) return { on: 'boot', lead: i, end: 1 }
    if (near(at, bootAt(circuit, i, 0, bendOf(i)), REACH.boot)) return { on: 'boot', lead: i, end: 0 }
  }
  // The middle of a part is the part itself; its two ends are its pads.
  for (let i = 0; i < circuit.parts.length; i++) {
    const part = circuit.parts[i], p = padAt(circuit, part.a), q = padAt(circuit, part.b)
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
    if (part.kind === 'cell') {
      // The holder: a box along the cell, between its two pads.
      const along = Math.abs(((at.x - mid.x) * (q.x - p.x) + (at.y - mid.y) * (q.y - p.y)) / TOY.u), across = Math.abs(((at.x - mid.x) * (q.y - p.y) - (at.y - mid.y) * (q.x - p.x)) / TOY.u)
      if (along <= TOY.u * 0.28 && across <= TOY.u * 0.34) return { on: 'part', part: i }
    } else if (near(at, mid, REACH.lamp)) return { on: 'part', part: i }
  }
  const pads = boardFor(circuit).pads
  let best = -1, bestD: number = REACH.pad
  for (let i = 0; i < pads.length; i++) {
    const d = Math.hypot(at.x - padAt(circuit, i).x, at.y - padAt(circuit, i).y)
    if (d <= bestD) { best = i; bestD = d }
  }
  if (best >= 0) return { on: 'pad', pad: best }
  for (let i = circuit.leads.length - 1; i >= 0; i--) {
    const curve = leadCurve(...leadEnds(circuit, i), bendOf(i))
    for (let t = 0.28; t <= 0.72; t += 0.04) if (near(at, onCurve(curve, t), REACH.wire)) return { on: 'wire', lead: i }
  }
  if (near(at, TOY.coil, TOY.coil.r)) return { on: 'coil' }
  return { on: 'mat' }
}
