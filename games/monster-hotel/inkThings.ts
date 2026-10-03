// The five things wherever the child has put them. In the cupboard each is
// drawn as in inkProps.ts; here are the other shapes they take: the quilt
// folded on a bed, hung padded over a wall or a floor, or down to its tassel
// when a guest is rolled in it; the pipe stood up like a hat stand, let
// through a wall with a flange each side, or held to a mouth like a trumpet;
// the stove, the ice box and the clock at whatever size their place gives
// them. Every one is drawn inside the box inkPlaces.ts gives it, with the
// origin at the middle of its foot. All of them can be touched, so all of
// them carry the spot colour.

import { PAPER, SPOT, type Pen } from './inkHatch'
import { drawThing } from './inkProps'
import type { InkThing, InkThingKind } from './inkScene'

/** The shape a thing takes, by where it is. */
export type ThingForm = 'slot' | 'room' | 'wall' | 'floor' | 'held'

/** The form of a thing from its place; `upright` says whether the edge it is on is a wall. */
export function formOf(thing: InkThing, upright: boolean): ThingForm {
  const at = thing.at
  if (at === 'cupboard') return 'slot'
  if ('room' in at) return 'room'
  if ('edge' in at) return upright ? 'wall' : 'floor'
  return 'held'
}

/** How far each thing's cupboard drawing reaches from its own middle: left, top, right, bottom. */
const REACH: Record<InkThingKind, readonly [number, number, number, number]> = {
  quilt: [-29, -22, 33, 23],
  pipe: [-12, -30, 31, 27],
  stove: [-24, -33, 24, 29],
  ice: [-29, -23, 29, 31],
  clock: [-23, -32, 23, 28],
}

/** Where the numeral of a dial goes, beside its flames or its icicles, from the middle of the cupboard drawing, and how tall it is. */
const NUMERAL: Partial<Record<InkThingKind, { x: number; y: number; size: number }>> = {
  stove: { x: 17.5, y: 13.5, size: 12 },
  ice: { x: 15, y: 17.5, size: 12 },
}

/** How much the cupboard drawing is scaled to stand in a box, and where its middle then lies above the box's foot. */
function fit(kind: InkThingKind, w: number, h: number): { k: number; cx: number; cy: number } {
  const [x1, y1, x2, y2] = REACH[kind]
  const k = Math.min(w / (x2 - x1), h / (y2 - y1))
  return { k, cx: (-(x1 + x2) / 2) * k, cy: -y2 * k - (h - (y2 - y1) * k) / 2 }
}

/**
 * Where a dial's numeral is drawn, from the middle of the thing's foot, in
 * the units of its box, and its size. Null for a thing with no dial.
 */
export function numeralSpot(kind: InkThingKind, form: ThingForm, w: number, h: number): { x: number; y: number; size: number } | null {
  const at = NUMERAL[kind]
  if (!at || form === 'wall' || form === 'floor' || form === 'held') return null
  const { k, cx, cy } = fit(kind, w, h)
  return { x: cx + at.x * k, y: cy + at.y * k, size: at.size * k }
}

/** A quilted field inside a shape: diamonds of stitching. */
function stitched(pen: Pen, shape: number[], x1: number, y1: number, x2: number, y2: number, pitch: number): void {
  pen.inside(shape, false, () => {
    const tall = y2 - y1
    for (let k = x1 - tall; k < x2 + tall; k += pitch) {
      pen.line([k, y1 - 2, k + tall, y2 + 2], 0.9, true)
      pen.line([k + tall, y1 - 2, k, y2 + 2], 0.9, true)
    }
  })
}

/** The quilt folded flat on a bed: two thicknesses, the fold toward the foot. */
function quiltFolded(pen: Pen, w: number, h: number): void {
  const a = w / 2
  const under = [-a, -2, -a + 2, -h * 0.5, a - 3, -h * 0.5, a, -h * 0.26, a - 3, 0, -a + 3, 0]
  pen.shape(under, { fill: SPOT, w: 1.5 })
  const over = [-a + 1, -h * 0.42, -a + 5, -h + 2, a - 8, -h, a - 1, -h * 0.72, a - 5, -h * 0.4, -a + 6, -h * 0.36]
  pen.shape(over, { fill: SPOT, w: 0 })
  stitched(pen, over, -a, -h, a, -h * 0.36, 9)
  pen.shape(over, { w: 1.7 })
  pen.line([a - 4, -h * 0.4, a, -h * 0.26, a - 3, -2], 1.1)
  // The tassel at its corner, hanging off the bed.
  pen.line([-a + 3, -h * 0.4, -a - 2, -h * 0.1, -a - 1, 6], 1.2)
  for (const dx of [-3, 0, 3]) pen.line([-a - 1, 6, -a - 1 + dx, 13], 1)
}

/**
 * The quilt hung over a wall or a floor: a padded slab that covers it from
 * side to side, quilted, nailed up at its corners and along its edge.
 * Nothing gets through it.
 */
function quiltHung(pen: Pen, w: number, h: number): void {
  const a = w / 2, tall = h > w
  // Its edge is puffed between the nails, so it is drawn in scallops along its two long sides.
  const pad: number[] = []
  const long = tall ? h : w, puffs = Math.max(3, Math.round(long / 22))
  if (tall) {
    for (let i = 0; i <= puffs; i++) { pad.push(a - 1, -h + (h * i) / puffs); if (i < puffs) pad.push(a + 3.5, -h + (h * (i + 0.5)) / puffs) }
    for (let i = puffs; i >= 0; i--) { pad.push(-a + 1, -h + (h * i) / puffs); if (i > 0) pad.push(-a - 3.5, -h + (h * (i - 0.5)) / puffs) }
  } else {
    for (let i = 0; i <= puffs; i++) { pad.push(-a + (w * i) / puffs, -h + 1); if (i < puffs) pad.push(-a + (w * (i + 0.5)) / puffs, -h - 3.5) }
    for (let i = puffs; i >= 0; i--) { pad.push(-a + (w * i) / puffs, -1); if (i > 0) pad.push(-a + (w * (i - 0.5)) / puffs, 3.5) }
  }
  pen.shape(pad, { fill: SPOT, w: 0 })
  stitched(pen, pad, -a - 4, -h - 4, a + 4, 4, tall ? 12 : 11)
  pen.shape(pad, { w: 1.9 })
  // Nail heads where it is fastened.
  for (let i = 0; i <= puffs; i++) {
    const t = i / puffs
    for (const side of [-1, 1]) {
      const x = tall ? side * (a - 4.5) : -a + w * t + (i === 0 ? 4 : i === puffs ? -4 : 0)
      const y = tall ? -h + h * t + (i === 0 ? 4 : i === puffs ? -4 : 0) : side > 0 ? -4.5 : -h + 4.5
      pen.ellipse(x, y, 2, 2, { fill: PAPER, w: 1.1 })
    }
  }
}

/** The quilt's tassel, which is all that hangs loose of it when a guest is rolled inside: a cord, a knot, a fringe. */
function quiltTassel(pen: Pen, w: number, h: number): void {
  pen.line([0, -h, 2, -h * 0.82, -1, -h * 0.66], 1.6)
  pen.ellipse(0, -h * 0.6, w * 0.24, w * 0.22, { fill: SPOT, w: 1.6 })
  const skirt = [-w * 0.2, -h * 0.52, w * 0.2, -h * 0.52, w * 0.36, -2, w * 0.2, -6, w * 0.08, 0, -w * 0.06, -6, -w * 0.2, 0, -w * 0.36, -4]
  pen.shape(skirt, { fill: SPOT, w: 1.6 })
  for (const dx of [-0.16, 0, 0.16]) pen.line([w * dx * 0.6, -h * 0.5, w * dx * 1.5, -6], 0.8)
  pen.line([-w * 0.22, -h * 0.5, w * 0.22, -h * 0.5], 2.2, true)
}

/** The pipe stood on end in a corner, like a hat stand: a plain length, seamed, with a crimped foot. */
function pipeUpright(pen: Pen, w: number, h: number): void {
  const a = w / 2 - 1
  pen.rect(-a, -h + 3, 2 * a, h - 3, { fill: SPOT, w: 1.7 })
  pen.tone([a * 0.25, -h + 3, a, -h + 3, a, 0, a * 0.25, 0], 2, -1.2)
  for (let y = -h * 0.2; y > -h + 8; y -= h * 0.27) { pen.line([-a, y, a, y], 1.1, true); pen.line([-a, y + 3, a, y + 3], 0.6, true) }
  pen.ellipse(0, -h + 3, a, 2.8, { fill: PAPER, tone: 4, w: 1.5 })
  for (let x = -a + 2; x < a; x += 3.5) pen.line([x, 0, x + 0.6, -4], 0.8, true)
  pen.rect(-a - 2.5, -3, 2 * a + 5, 3, { fill: PAPER, w: 1.2 })
}

/**
 * The pipe let through a wall or a floor: a short length with a flange and
 * four bolts on each side, open at both ends. What can pass, passes here.
 */
function pipeThrough(pen: Pen, w: number, h: number): void {
  const g = pen.ctx
  g.save()
  // Drawn lying across a wall; through a floor it is the same pipe stood on end.
  const upright = h > w, long = upright ? h : w, wide = upright ? w : h
  if (upright) { g.translate(0, -h / 2); g.rotate(Math.PI / 2); g.translate(0, wide / 2) }
  const a = long / 2, r = wide * 0.3, mid = -wide / 2
  pen.rect(-a + 3, mid - r, long - 6, 2 * r, { fill: SPOT, w: 1.7 })
  pen.tone([-a + 3, mid + r * 0.2, a - 3, mid + r * 0.2, a - 3, mid + r, -a + 3, mid + r], 2, 0)
  for (const side of [-1, 1]) {
    // The flange against the wall, the bolts in it, and the dark mouth of the pipe beyond.
    pen.rect(side * 9 - 2.5, mid - wide / 2 + 1, 5, wide - 2, { fill: SPOT, w: 1.5 })
    for (const y of [mid - wide * 0.36, mid + wide * 0.36]) pen.dot(side * 9, y, 1.2)
    pen.ellipse(side * (a - 3.5), mid, 3.2, r, { fill: PAPER, tone: 4, w: 1.5 })
    pen.line([side * (a * 0.62), mid - r, side * (a * 0.62), mid + r], 1, true)
  }
  g.restore()
}

/** The pipe held to a mouth like a trumpet: the narrow end at the lips, a flare at the other. Drawn flaring to the right. */
function pipeHeld(pen: Pen, w: number, h: number): void {
  const a = w / 2, mid = -h / 2, r = h * 0.26
  pen.shape([-a + 2, mid - r, a - 12, mid - r, a - 3, mid - h * 0.46, a - 3, mid + h * 0.46, a - 12, mid + r, -a + 2, mid + r], { fill: SPOT, w: 1.7, sharp: true })
  pen.tone([-a + 2, mid + r * 0.3, a - 12, mid + r * 0.3, a - 12, mid + r, -a + 2, mid + r], 2, 0)
  pen.ellipse(a - 3, mid, 3.4, h * 0.46, { fill: PAPER, tone: 4, w: 1.5 })
  for (const x of [-a * 0.5, a * 0.1]) pen.line([x, mid - r, x, mid + r], 1, true)
  pen.rect(-a, mid - r - 1.5, 4, 2 * r + 3, { fill: PAPER, w: 1.2 })
  // What it gives off goes a room further this way: three short strokes at the flare.
  for (const dy of [-0.34, 0, 0.34]) pen.line([a + 2, mid + h * dy, a + 8, mid + h * dy * 1.5], 1.1, true)
}

/** One thing in the form its place gives it, inside a box `w` by `h`, the origin at the middle of the box's foot. */
export function drawThingIn(pen: Pen, kind: InkThingKind, dial: 1 | 2 | 3, form: ThingForm, w: number, h: number): void {
  if (kind === 'quilt' && form === 'room') return quiltFolded(pen, w, h)
  if (kind === 'quilt' && (form === 'wall' || form === 'floor')) return quiltHung(pen, w, h)
  if (kind === 'quilt' && form === 'held') return quiltTassel(pen, w, h)
  if (kind === 'pipe' && form === 'room') return pipeUpright(pen, w, h)
  if (kind === 'pipe' && (form === 'wall' || form === 'floor')) return pipeThrough(pen, w, h)
  if (kind === 'pipe' && form === 'held') return pipeHeld(pen, w, h)
  // Everything else is the cupboard's drawing at the size of its box.
  const { k, cx, cy } = fit(kind, w, h)
  const g = pen.ctx
  g.save()
  g.translate(cx, cy)
  g.scale(k, k)
  if (kind === 'clock' && (form === 'wall' || form === 'floor')) {
    // Hung as a wall clock: a nail and a loop over it. It changes nothing there.
    pen.line([0, -31, 0, -36], 1.4, true)
    pen.dot(0, -37, 1.6)
  }
  drawThing(pen, kind, dial)
  g.restore()
}
