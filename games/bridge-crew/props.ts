import type { Kind, Part } from './kit'
import { INK, SHADOW, pin, string, wood, type Pen, type Wood } from './look'
import type { Difference } from './order'
import type { Idea } from './sites'
import { drawWhole } from './symbols'

// The game's props drawn: the test trolley with its weights, the tracing
// paper, the barge, and the small models the crew chief pins together in the
// margin. Like the vehicles they are made of the kit's own stuff, and each is
// drawn from numbers the game hands it: nothing here decides what happens.

function cutOut(pen: Pen, c: number, colour: string, path: () => void) {
  pen.save()
  pen.translate(SHADOW.x * c, SHADOW.y * c)
  pen.fillStyle = INK.shadow
  pen.beginPath(); path(); pen.fill()
  pen.restore()
  pen.fillStyle = colour
  pen.beginPath(); path(); pen.fill()
}

/** One steel weight, as on a pair of scales: wider at its foot than at its shoulder, with a knob on top. Not a flat bar: one alone beside its numeral would read as a sign. */
function weight(pen: Pen, x: number, y: number, c: number) {
  const body = () => { pen.moveTo(x - c * 0.24, y); pen.lineTo(x - c * 0.17, y - c * 0.13); pen.lineTo(x + c * 0.17, y - c * 0.13); pen.lineTo(x + c * 0.24, y); pen.closePath() }
  cutOut(pen, c, INK.steel, body)
  pen.strokeStyle = INK.steelDark
  pen.lineWidth = Math.max(0.75, c * 0.018)
  pen.beginPath(); body(); pen.stroke()
  pen.fillStyle = INK.steelDark
  pen.beginPath(); pen.arc(x, y - c * 0.13, c * 0.035, Math.PI, Math.PI * 2); pen.fill()
}

/**
 * The test trolley at (x, y), the point of the deck or the pin it is on, in
 * pixels. `how` says whether it stands on the deck, rides under the plank or
 * hangs from a pin by its hook, where `swing` is its pendulum's angle. The
 * numeral beside its stack names the weights the child put on it; `counted`
 * false leaves it out.
 */
export function trolley(pen: Pen, x: number, y: number, c: number, weights: number, how: 'deck' | 'under' | 'pin' | 'tray', swing: number, random: () => number, counted = true) {
  pen.save()
  pen.translate(x, y)
  let bed = -c * 0.2
  if (how === 'pin' || how === 'under') {
    // It hangs: by one string from the pin, or by two from its wheels on the plank above.
    pen.rotate(how === 'pin' ? swing : 0)
    const drop = c * (how === 'pin' ? 0.7 : 0.55)
    if (how === 'pin') string(pen, 0, 0, 0, drop, c * 0.8)
    else { string(pen, -c * 0.3, -c * 0.1, -c * 0.3, drop, c * 0.8); string(pen, c * 0.3, -c * 0.1, c * 0.3, drop, c * 0.8) }
    bed = drop + c * 0.06
  }
  // Standing on its wheels it has a push handle at its back. Nothing stands upright at its front, where its numeral is.
  if (how === 'deck' || how === 'tray') {
    wood(pen, 'stick', -c * 0.42, bed, -c * 0.58, bed - c * 0.62, c * 0.6, random)
    wood(pen, 'stick', -c * 0.58, bed - c * 0.62, -c * 0.78, bed - c * 0.62, c * 0.6, random)
  }
  wood(pen, 'plank', -c * 0.42, bed, c * 0.42, bed, c * 0.9, random)
  const onTop = how === 'under' ? -c * 0.1 : how === 'pin' ? null : bed + c * 0.09
  if (onTop !== null) for (const wx of [-0.3, 0.3]) {
    cutOut(pen, c, INK.paper, () => pen.arc(c * wx, onTop, c * 0.13, 0, Math.PI * 2))
    pin(pen, c * wx, onTop, c * 0.6, false)
  }
  for (let i = 0; i < weights; i++) weight(pen, 0, bed - c * 0.08 - i * c * 0.14, c)
  // The numeral beside its stack. Riding under the plank it hangs on a string each side of the stack, so there the
  // numeral lies under the bed: no upright stands between the stack and its numeral.
  // At home in its compartment with the one weight it comes with, it has no numeral: the numeral names a stack the child set.
  if (!counted) { pen.restore(); return }
  if (how === 'under') drawWhole(pen, weights, 0, bed + c * 0.44, c * 0.5, { fill: INK.line, edge: INK.sheetDeep, edgeWidth: c * 0.12 })
  else drawWhole(pen, weights, c * 0.62, bed - c * 0.08 - (weights * c * 0.14) / 2, c * 0.5, { fill: INK.line, edge: INK.sheetDeep, edgeWidth: c * 0.12 })
  pen.restore()
}

/** The weights not on the trolley, lying in its compartment in a row. No numeral: nobody set this pile. */
export function spareWeights(pen: Pen, x: number, y: number, c: number, count: number) {
  for (let i = 0; i < count; i++) weight(pen, x + (i % 3) * c * 0.6, y - Math.floor(i / 3) * c * 0.18, c)
}

const lineOf = (kind: Kind, turned: boolean): number => (kind === 'thread' ? 0.03 : kind === 'tube' ? 0.14 : kind === 'plank' ? (turned ? 0.2 : 0.09) : 0.05)

/** A design as a line drawing: each part one stroke, its weight by its kind, as on tracing paper. `at` turns grid cells into pixels. */
export function lineDrawing(pen: Pen, parts: readonly Part[], ends: readonly { a: readonly [number, number]; b: readonly [number, number] }[], at: (x: number, y: number) => [number, number], c: number, colour: string, alpha: number, curve: (index: number) => readonly { share: number; off: readonly [number, number] }[] = () => [], broken: number | null = null) {
  pen.strokeStyle = colour
  pen.lineCap = 'round'
  pen.lineJoin = 'round'
  pen.globalAlpha = alpha
  parts.forEach((part, index) => {
    const a = ends[index].a, b = ends[index].b
    pen.lineWidth = Math.max(1, lineOf(part.kind, part.turned) * c)
    if (part.kind === 'thread') pen.setLineDash([c * 0.12, c * 0.1])
    pen.beginPath()
    if (broken === index) {
      // It would give under this load: its line is drawn parted in the middle, each half hanging from its own end.
      const dx = b[0] - a[0], dy = b[1] - a[1]
      pen.moveTo(...at(a[0], a[1])); pen.lineTo(...at(a[0] + dx * 0.42, a[1] + dy * 0.42 - 0.45))
      pen.moveTo(...at(b[0], b[1])); pen.lineTo(...at(b[0] - dx * 0.42, b[1] - dy * 0.42 - 0.45))
    } else {
      // A plank's line bends as the plank would: through each point along it.
      pen.moveTo(...at(a[0], a[1]))
      for (const point of curve(index)) pen.lineTo(...at(a[0] + (b[0] - a[0]) * point.share + point.off[0], a[1] + (b[1] - a[1]) * point.share + point.off[1]))
      pen.lineTo(...at(b[0], b[1]))
    }
    pen.stroke()
    pen.setLineDash([])
  })
  pen.globalAlpha = 1
}

/** A sheet of tracing paper in its compartment, with the design traced on it drawn small. Empty when `parts` is null. */
export function tracingSheet(pen: Pen, x: number, y: number, wide: number, tall: number, c: number, parts: readonly Part[] | null) {
  if (!parts) {
    // An empty place for a tracing: a dashed outline, as a draughtsman marks where something will go.
    pen.strokeStyle = INK.line
    pen.globalAlpha = 0.55
    pen.lineWidth = Math.max(1, c * 0.028)
    pen.setLineDash([c * 0.12, c * 0.1])
    pen.strokeRect(x, y, wide, tall)
    pen.setLineDash([])
    pen.globalAlpha = 1
    return
  }
  pen.globalAlpha = 0.92
  cutOut(pen, c, '#e8eef6', () => pen.roundRect(x, y, wide, tall, c * 0.05))
  pen.globalAlpha = 1
  if (parts.length === 0) return
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const p of parts) for (const e of [p.a, p.b]) { x0 = Math.min(x0, e[0]); x1 = Math.max(x1, e[0]); y0 = Math.min(y0, e[1]); y1 = Math.max(y1, e[1]) }
  const scale = Math.min((wide - c * 0.2) / Math.max(x1 - x0, 1), (tall - c * 0.2) / Math.max(y1 - y0, 1))
  const at = (gx: number, gy: number): [number, number] => [x + wide / 2 + (gx - (x0 + x1) / 2) * scale, y + tall / 2 - (gy - (y0 + y1) / 2) * scale]
  lineDrawing(pen, parts, parts, at, scale, INK.sheetDeep, 0.9)
}

/**
 * The barge, its waterline at (x, y) in pixels and its bow to the right: a
 * balsa hull, a paper cabin with the captain's face, and a flowerpot on the
 * roof that `spill` (0 to 1) tips into the water, where it bobs.
 */
export function barge(pen: Pen, x: number, y: number, c: number, bob: number, scrape: number, spill: number, mood: number) {
  pen.save()
  pen.translate(x + c * 0.06 * Math.sin(scrape * 40) * scrape, y - c * bob)
  pen.rotate(0.05 * Math.sin(scrape * 31) * scrape)
  cutOut(pen, c, INK.balsa, () => { pen.moveTo(-c * 1.5, -c * 0.32); pen.lineTo(c * 1.7, -c * 0.32); pen.lineTo(c * 1.25, c * 0.12); pen.lineTo(-c * 1.3, c * 0.12); pen.closePath() })
  pen.strokeStyle = INK.balsaGrain
  pen.lineWidth = Math.max(0.75, c * 0.016)
  pen.beginPath(); pen.moveTo(-c * 1.4, -c * 0.12); pen.lineTo(c * 1.5, -c * 0.12); pen.stroke()
  cutOut(pen, c, INK.paper, () => pen.roundRect(-c * 1.05, -c * 0.95, c * 1.1, c * 0.63, c * 0.06))
  pen.fillStyle = INK.steelDark
  pen.strokeStyle = INK.steelDark
  pen.lineWidth = Math.max(1, c * 0.028)
  for (const ex of [-0.52, -0.3]) { pen.beginPath(); pen.arc(c * ex, -c * 0.7, c * 0.04, 0, Math.PI * 2); pen.fill() }
  pen.beginPath(); pen.moveTo(-c * 0.52, -c * 0.52); pen.quadraticCurveTo(-c * 0.41, -c * (0.52 - 0.08 * mood), -c * 0.3, -c * 0.52); pen.stroke()
  // The flowerpot: on the cabin roof, or off it and in the water beside the hull.
  const px = -c * 0.2 + spill * c * 2.2, py = -c * 0.95 + spill * c * 1.0 - c * 0.5 * Math.sin(Math.PI * Math.min(1, spill * 1.4))
  cutOut(pen, c, INK.paperShade, () => { pen.moveTo(px - c * 0.14, py - c * 0.2); pen.lineTo(px + c * 0.14, py - c * 0.2); pen.lineTo(px + c * 0.09, py); pen.lineTo(px - c * 0.09, py); pen.closePath() })
  pen.strokeStyle = INK.balsaEdge
  pen.lineWidth = Math.max(1, c * 0.03)
  pen.beginPath(); pen.moveTo(px, py - c * 0.2); pen.lineTo(px - c * 0.08, py - c * 0.42); pen.moveTo(px, py - c * 0.2); pen.lineTo(px + c * 0.1, py - c * 0.4); pen.stroke()
  pen.restore()
}

type Mini = (ax: number, ay: number, bx: number, by: number, kind?: Wood) => void

/**
 * The small model of an idea, standing at (x, y) in pixels: first the way
 * that fails, which gives by `fail` (0 to 1), then the idea, which holds.
 * `holds` chooses which of the two is drawn. One cell of the model is `c`.
 * `built` (0 to 1) is how far the chief has pinned it together.
 */
export function ideaModel(pen: Pen, idea: Idea, x: number, y: number, c: number, holds: boolean, fail: number, random: () => number, failure: string | null = null, built = 1): void {
  // Pinned together piece by piece: `built` is the share of its pieces that are on it so far.
  modelOf(pen, idea, x, y, c, holds, fail, random, failure, built >= 1 ? Infinity : Math.max(1, Math.ceil(built * ideaPieces(idea, holds))))
}

/** How many pieces the model of an idea is pinned together from: its strips, sticks and tubes, its thread and its pins. Counted from the model itself. */
export function ideaPieces(idea: Idea, holds: boolean): number {
  return modelOf(null, idea, 0, 0, 1, holds, 0, () => 0.5, null, Infinity)
}

/** Draws the first `pieces` pieces of a model, or with no pen only counts them; returns how many it has in all. */
function modelOf(pen: Pen | null, idea: Idea, x: number, y: number, c: number, holds: boolean, fail: number, random: () => number, failure: string | null, pieces: number): number {
  const w = c * 0.9
  let laid = 0
  // The way that fails is filled in from how the child's own run failed: a build that folded goes right over, a part
  // that gave shows its splinter, and a vehicle that went in off the road's end, a tube or a thread shows the water.
  if (failure === 'folds') fail = Math.min(1, fail * 1.35)
  if (pen && !holds && fail > 0.8 && failure && failure !== 'folds') {
    pen.strokeStyle = INK.line
    pen.lineWidth = Math.max(1, c * 0.03)
    pen.globalAlpha = (fail - 0.8) / 0.2
    pen.beginPath()
    if (failure === 'gives') {
      // Three chips flying off it, filled.
      pen.fillStyle = INK.balsa
      for (const [turn, far] of [[0.6, 0.2], [2.4, 0.24], [4.3, 0.18]] as const) { const cx = x + 0.7 * w + Math.cos(turn) * c * far, cy = y - 0.28 * w + Math.sin(turn) * c * far; pen.moveTo(cx + c * 0.05, cy); pen.lineTo(cx - c * 0.03, cy + c * 0.04); pen.lineTo(cx - c * 0.02, cy - c * 0.04); pen.closePath() }
      pen.fill()
      pen.beginPath()
    } else for (const [from, to] of [[0.2, 0.55], [0.7, 1.0], [1.1, 1.35]] as const) { pen.moveTo(x + from * w, y + c * 0.1); pen.quadraticCurveTo(x + ((from + to) / 2) * w, y + c * 0.2, x + to * w, y + c * 0.1) }
    pen.stroke()
    pen.globalAlpha = 1
  }
  const stick: Mini = (ax, ay, bx, by, kind = 'stick') => { if (laid++ < pieces && pen) wood(pen, kind, x + ax * w, y - ay * w, x + bx * w, y - by * w, c * 0.55, random) }
  const dot = (px: number, py: number) => { if (laid++ < pieces && pen) pin(pen, x + px * w, y - py * w, c * 0.5, false) }
  const sag = fail * 0.35
  switch (idea) {
    case 'triangle': case 'row': {
      // A square of four pinned sticks leans over; with a diagonal it cannot.
      const cells = idea === 'row' ? 2 : 1, lean = holds ? 0 : fail * 0.75, top = Math.sqrt(Math.max(0.05, 1 - lean * lean))
      for (let i = 0; i <= cells; i++) stick(i, 0, i + lean, top)
      for (let i = 0; i < cells; i++) { stick(i + lean, top, i + 1 + lean, top); if (holds) stick(i, 0, i + 1, 1) }
      for (let i = 0; i <= cells; i++) { dot(i, 0); dot(i + lean, top) }
      break
    }
    case 'profile':
      // A strip laid flat dips between its two pins; the same strip on edge does not.
      if (holds) stick(0, 0.5, 1.4, 0.5, 'plank-edge')
      else { stick(0, 0.5, 0.7, 0.5 - sag, 'plank'); stick(0.7, 0.5 - sag, 1.4, 0.5, 'plank') }
      dot(0, 0.5); dot(1.4, 0.5)
      // The same small block presses on both: one dips under it and the other does not.
      if (pen) cutOut(pen, c, INK.steel, () => pen.rect(x + 0.52 * w, y - (0.5 - (holds ? 0 : sag)) * w - c * (holds ? 0.36 : 0.22), 0.36 * w, c * 0.16))
      break
    case 'prop':
      // The same strip dips with nothing under it, and lies level on a post.
      // Each end of the strip rests on a block of its own, so the model is a bridge and not a bar on a post.
      for (const bx of [-0.08, 1.24]) if (pen) cutOut(pen, c, INK.balsaEdge, () => pen.rect(x + bx * w, y - 0.66 * w, 0.24 * w, 0.66 * w))
      if (holds) { stick(0, 0.7, 1.4, 0.7, 'plank'); stick(0.7, 0, 0.7, 0.7) } else { stick(0, 0.7, 0.7, 0.7 - sag, 'plank'); stick(0.7, 0.7 - sag, 1.4, 0.7, 'plank') }
      dot(0, 0.7); dot(1.4, 0.7); if (holds) dot(0.7, 0)
      break
    case 'tube':
      // Two thin posts under a strip with a block on it bow in the middle; two rolled tubes of the same height stand straight.
      for (const px0 of [0.25, 1.15]) {
        if (holds) stick(px0, 0, px0, 1.0, 'tube')
        else { const out = px0 < 0.7 ? -1 : 1; stick(px0, 0, px0 + out * 0.26 * fail, 0.5 - 0.08 * fail); stick(px0 + out * 0.26 * fail, 0.5 - 0.08 * fail, px0, 1.0 - 0.22 * fail) }
        dot(px0, 0)
      }
      stick(0.05, 1.0 - (holds ? 0 : 0.22 * fail) + 0.08, 1.35, 1.0 - (holds ? 0 : 0.22 * fail) + 0.08, 'plank')
      if (pen) cutOut(pen, c, INK.steel, () => pen.rect(x + 0.5 * w, y - (1.0 - (holds ? 0 : 0.22 * fail) + 0.16) * w - c * 0.2, 0.4 * w, c * 0.2))
      break
    case 'thread':
      // Two strips hinged in the middle drop into a V inside a frame of two posts and a beam; a thread down from the
      // middle of the beam holds the hinge up. The frame is closed all round: a thread straight up from a level strip
      // to a lone pin would read as a letter, and so would one post with a strip.
      stick(0, 0.4, 0.7, 0.4 - (holds ? 0 : sag), 'plank'); stick(0.7, 0.4 - (holds ? 0 : sag), 1.4, 0.4, 'plank')
      stick(0, 0.4, 0, 1.25); stick(1.4, 0.4, 1.4, 1.25); stick(0, 1.25, 1.4, 1.25)
      dot(0, 0.4); dot(1.4, 0.4); dot(0, 1.25); dot(1.4, 1.25); dot(0.7, 0.4 - (holds ? 0 : sag))
      if (holds) { if (laid++ < pieces && pen) string(pen, x + 0.7 * w, y - 0.4 * w, x + 0.7 * w, y - 1.25 * w, c * 0.6); dot(0.7, 1.25) }
      break
    case 'wide-base':
      // A mast on one footing topples; two legs on a wide base stand.
      if (holds) { stick(0, 0, 0.5, 1.2); stick(1, 0, 0.5, 1.2); dot(0, 0); dot(1, 0) }
      else { const a = fail * 1.3; stick(0.5, 0, 0.5 + Math.sin(a) * 1.2, Math.cos(a) * 1.2); dot(0.5, 0) }
      dot(holds ? 0.5 : 0.5 + Math.sin(fail * 1.3) * 1.2, holds ? 1.2 : Math.cos(fail * 1.3) * 1.2)
      break
    case 'arch':
      // Three sticks pinned in a curve fold flat by themselves; posts up to a strip above hold their joints.
      if (holds) { stick(0, 0, 0.45, 0.5); stick(0.45, 0.5, 0.95, 0.5); stick(0.95, 0.5, 1.4, 0); stick(0.45, 0.5, 0.45, 0.95); stick(0.95, 0.5, 0.95, 0.95); stick(0, 0.95, 1.4, 0.95, 'plank'); dot(0.45, 0.5); dot(0.95, 0.5) }
      else { const h = 0.5 * (1 - fail); stick(0, 0, 0.45 + 0.1 * fail, h); stick(0.45 + 0.1 * fail, h, 0.95 + 0.25 * fail, h * 0.4); stick(0.95 + 0.25 * fail, h * 0.4, 1.4, 0) }
      dot(0, 0); dot(1.4, 0)
      break
  }
  return laid
}

/**
 * The two small models of the one change, side by side from (x, y): each a
 * strip on two pins under a block. The second differs from the first in the
 * two things `differences` names until `swapped`, and in one of them after.
 * `load` (0 to 1) presses both, and each dips by what holds it.
 */
/** One side of one of the chief's two models: what holds that half of the deck up, where its foot is, and whether that half of the deck is on edge. */
type Side = { strut: Wood | 'thread' | null; foot: number; edge: boolean }

/**
 * How far a model dips under the block, as a share of its own unit: each strut
 * or stay, and each half on edge, makes it stiffer, each by its own amount: a
 * tube more than a stick, a stay less, a strut whose foot has been moved toward
 * the middle less again. So any one difference between two models shows.
 */
export function modelDip(left: Side, right: Side): number {
  const hold = (side: Side) => (side.strut ? ({ tube: 1.5, stick: 1, thread: 0.6, plank: 1.2, 'plank-edge': 1.35 } as const)[side.strut] * (side.foot > 0 ? 0.6 : 1) : 0) + (side.edge ? 1 : 0)
  return Math.max(0.05, 0.34 - 0.1 * (hold(left) + hold(right)))
}

/**
 * What a difference is in the first of the two models and in the second, by
 * what it is: a part added (only the second has it), left out (only the
 * first), moved (both have it, its foot elsewhere), turned (that half of the
 * deck flat in one and on edge in the other), or changed for another kind.
 */
export function modelSides(d: Difference | undefined): [Side, Side] {
  const bare: Side = { strut: null, foot: 0, edge: false }
  if (!d) return [bare, bare]
  const strut: Wood | 'thread' = d.kind === 'thread' ? 'thread' : d.kind === 'plank' ? 'plank-edge' : d.kind
  switch (d.what) {
    case 'added': return [bare, { ...bare, strut }]
    case 'left-out': return [{ ...bare, strut }, bare]
    case 'moved': return [{ ...bare, strut }, { ...bare, strut, foot: 0.3 }]
    case 'turned': return [bare, { ...bare, edge: true }]
    case 'changed': return [{ ...bare, strut: strut === 'stick' ? 'tube' : 'stick' }, { ...bare, strut }]
  }
}

export function compareModels(pen: Pen, differences: readonly Difference[], x: number, y: number, c: number, swapped: boolean, load: number, random: () => number) {
  const w = c * 0.9
  const sides = modelSides
  const model = (ox: number, left: Side, right: Side) => {
    const dip = load * w * modelDip(left, right)
    wood(pen, left.edge ? 'plank-edge' : 'plank', ox, y - w * 0.6, ox + w * 0.6, y - w * 0.6 + dip, c * 0.55, random)
    wood(pen, right.edge ? 'plank-edge' : 'plank', ox + w * 0.6, y - w * 0.6 + dip, ox + w * 1.2, y - w * 0.6, c * 0.55, random)
    ;[left, right].forEach((side, i) => {
      if (!side.strut) return
      const foot = i ? 1.0 - side.foot : 0.2 + side.foot
      if (side.strut === 'thread') string(pen, ox + w * 0.6, y - w * 0.6 + dip, ox + w * (i ? 1.2 - side.foot : side.foot), y - w * 1.25, c * 0.6)
      else wood(pen, side.strut, ox + w * foot, y, ox + w * 0.6, y - w * 0.6 + dip, c * 0.55, random)
    })
    pin(pen, ox, y - w * 0.6, c * 0.5, false); pin(pen, ox + w * 1.2, y - w * 0.6, c * 0.5, false)
    // The block that loads it comes down on the middle.
    cutOut(pen, c, INK.steel, () => pen.rect(ox + w * 0.42, y - w * 0.6 + dip - c * (0.24 + 0.5 * (1 - load)), w * 0.36, c * 0.18))
  }
  const [firstA, firstB] = sides(differences[0]), [secondA, secondB] = sides(differences[1] ?? differences[0])
  // Side by side they differ in two things; with one part swapped back, in one.
  model(x, firstA, secondA)
  model(x + w * 1.7, firstB, swapped ? secondA : secondB)
}
