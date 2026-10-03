import { boardFor, isPad, MAT, ODD_KINDS, type Bite, type Circuit, type OddKind, type PartKind } from './circuit'

// Where everything in the stall lies, and what a finger is on. Pure geometry,
// no drawing: the view paints from the same numbers the touch is read with, so
// what looks touchable is what answers.
//
// Everything is in stage units: the scene is 1180 by 820, fitted whole into
// whatever surface the shell gives and centred there. The lane runs along the
// top, then the counter, then the mat. A customer leans over the counter in
// the middle and the next one waits at the window on the right. The board
// that is being worked on lies in the middle of the mat, the tray of parts to
// its right, the bench odds along the bottom, the test lamp beside them, and
// the old hand sleeps at the bottom left with her practice board by her. The
// board that is not on the mat hangs at the top left.

export type P = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

export const STAGE = { w: 1180, h: 820, counterTop: 140, counterBottom: 174 } as const

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

export const inBox = (at: P, box: Box) => at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h
const near = (a: P, b: P, r: number) => Math.hypot(a.x - b.x, a.y - b.y) <= r
export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// --- The fixed places ------------------------------------------------------------

/** Where the customer at the bench stands, and the one who waits at the window. */
export const AT_BENCH: P = { x: 590, y: 46 }
export const AT_WINDOW: P = { x: 1000, y: 62 }
/** The gadget as its owner holds it out over the counter, shut. */
export const HELD: Box = { x: 520, y: 112, w: 140, h: 78 }
export const HELD_AT_WINDOW: Box = { x: 948, y: 122, w: 104, h: 58 }
/** Where a customer can be touched: head, shoulders and hands. */
export const OWNER: Box = { x: 470, y: 0, w: 240, h: 196 }
export const WAITING: Box = { x: 912, y: 0, w: 176, h: 190 }
/** The board that is not on the mat hangs here. */
export const HUNG: Box = { x: 34, y: 14, w: 250, h: 116 }
/** The tray: two wide and three deep. The last place holds the coil of leads. */
export const TRAY: Box = { x: 908, y: 236, w: 260, h: 398 }
export const TRAY_KINDS: readonly (Exclude<PartKind, 'odd'> | 'coil')[] = ['cell', 'lamp', 'motor', 'buzzer', 'switch', 'coil']
export function trayPlace(i: number): Box {
  const gap = 8, w = (TRAY.w - 3 * gap) / 2, h = (TRAY.h - 4 * gap) / 3
  return { x: TRAY.x + gap + (i % 2) * (w + gap), y: TRAY.y + gap + Math.floor(i / 2) * (h + gap), w, h }
}
export const COIL: P = { x: trayPlace(5).x + trayPlace(5).w / 2, y: trayPlace(5).y + trayPlace(5).h / 2 }
/** The bench odds lie in a row along the bottom of the mat. There is always another of each. */
export function oddPlace(what: OddKind): P {
  return { x: 604 + ODD_KINDS.indexOf(what) * 50, y: 776 + (ODD_KINDS.indexOf(what) % 2 ? 10 : -8) }
}
/** The test lamp's own place on the mat, and where each of its clips lies when it bites nothing. */
export const TEST_LAMP: P = { x: 450, y: 700 }
export const PROBE_HOME: readonly [P, P] = [{ x: 364, y: 744 }, { x: 536, y: 668 }]
/** The old hand, her mug, and the practice board that hangs beside her. */
export const OLD_HAND: P = { x: 118, y: 708 }
export const OLD_HAND_BOX: Box = { x: 0, y: 590, w: 318, h: 230 }
export const MUG: P = { x: 60, y: 628 }
export const PRACTICE: Box = { x: 18, y: 488, w: 118, h: 64 }

// --- The board on the mat --------------------------------------------------------

/** Where a board lies on the mat: the place of its pad (0, 0), and the size of one pad unit. The sign is bigger, so its unit is smaller. */
export type Lay = { x: number; y: number; u: number }

export function layOf(circuit: Circuit): Lay {
  return circuit.gadget === 'sign' ? { x: 290, y: 270, u: 56 } : { x: 330, y: 316, u: 84 }
}

/** The rectangle a board takes on the mat, case and all. */
export function boardBox(circuit: Circuit): Box {
  const lay = layOf(circuit), board = boardFor(circuit), m = lay.u * 0.62
  return { x: lay.x - m, y: lay.y - m, w: (board.cols - 1) * lay.u + 2 * m, h: (board.rows - 1) * lay.u + 2 * m }
}
/** The lid of a gadget, standing open at the left of its case. A finger takes the gadget by it to hand it back. */
export function lidBox(circuit: Circuit): Box {
  const box = boardBox(circuit)
  return { x: box.x - 128, y: box.y + 8, w: 118, h: box.h - 16 }
}

/** How near a finger must be to a pad of this board: 60 across on a gadget, a little less on the sign, never less than 48. */
export function reach(lay: Lay) {
  const pad = Math.max(24, Math.min(34, lay.u * 0.44))
  return { pad, boot: 28, clip: 36, part: lay.u * 0.3, wire: 18 }
}

export function padAt(circuit: Circuit, pad: number): P {
  const lay = layOf(circuit), p = boardFor(circuit).pads[pad]
  return { x: lay.x + p.x * lay.u, y: lay.y + p.y * lay.u }
}

// --- The mat's coarse grid ---------------------------------------------------------

/** The middle of a cell of the coarse grid over the mat, where a part that lies loose is. */
export function matAt(cell: number): P {
  const col = cell % MAT.cols, row = Math.floor(cell / MAT.cols)
  return { x: 50 + ((col + 0.5) * (STAGE.w - 100)) / MAT.cols, y: 200 + ((row + 0.5) * (STAGE.h - 220)) / MAT.rows }
}
/** A loose part is drawn this long and this wide, whatever it is. */
export const LOOSE = { w: 84, h: 44 } as const
export function looseBox(cell: number): Box {
  const at = matAt(cell)
  return { x: at.x - LOOSE.w / 2, y: at.y - LOOSE.h / 2, w: LOOSE.w, h: LOOSE.h }
}

/** Everything that lies on the mat with this board down. A loose part is never laid on any of it. */
export function taken(circuit: Circuit): Box[] {
  const odds: Box = { x: 570, y: 736, w: 370, h: 84 }
  const lamp: Box = { x: 334, y: 640, w: 234, h: 132 }
  const board = boardBox(circuit)
  // A gadget's lid stands open at its left; the sign has none.
  return [circuit.gadget === 'sign' ? board : { x: lidBox(circuit).x, y: board.y, w: board.x + board.w - lidBox(circuit).x, h: board.h }, TRAY, odds, lamp, OLD_HAND_BOX, PRACTICE]
}

const cells = new Map<string, number[]>()
/**
 * The cells of the grid where a loose part may lie beside this board: on the
 * bare mat, clear of the board, the tray and everything else. A board's loose
 * parts are its own: they lie beside it while it is down and go up with it.
 */
export function matCells(circuit: Circuit): readonly number[] {
  const key = circuit.gadget === 'sign' ? 'sign' : 'gadget'
  let free = cells.get(key)
  if (!free) {
    const fixed = taken(circuit)
    free = []
    for (let cell = 0; cell < MAT.cols * MAT.rows; cell++) if (!fixed.some((box) => overlaps(looseBox(cell), box))) free.push(cell)
    cells.set(key, free)
  }
  return free
}

/** The place on the bare mat nearest a point, taken or not: where a lead let go there lies. */
export function nearestCell(circuit: Circuit, at: P): number {
  let best = 0, bestD = Infinity
  for (const cell of matCells(circuit)) {
    const p = matAt(cell), d = Math.hypot(p.x - at.x, p.y - at.y)
    if (d < bestD) { best = cell; bestD = d }
  }
  return best
}

/** The free cell nearest a point, or -1 when the mat is full. */
export function nearestFreeCell(circuit: Circuit, at: P): number {
  const used = new Set(circuit.loose.map((l) => l.at))
  let best = -1, bestD = Infinity
  for (const cell of matCells(circuit)) {
    if (used.has(cell)) continue
    const p = matAt(cell), d = Math.hypot(p.x - at.x, p.y - at.y)
    if (d < bestD) { best = cell; bestD = d }
  }
  return best
}

// --- Leads -------------------------------------------------------------------------

/** The size a lead and its clips are drawn at: a clip is about three quarters of this long. */
export const LEAD_U = 84

/** Where a clip that bites this is: on its pad, at one end of a loose part, or on the other lead's clip. */
export function biteAt(circuit: Circuit, bite: Bite): P {
  if (isPad(bite)) return padAt(circuit, bite)
  if ('loose' in bite) {
    const at = matAt(circuit.loose[bite.loose]?.at ?? 0)
    return { x: at.x + (bite.end === 0 ? -1 : 1) * LOOSE.w * 0.5, y: at.y }
  }
  // The clip of another lead. A join is two clips only, so that clip is on a pad, on a part, or lying loose.
  return circuit.leads[bite.lead] ? clipAt(circuit, bite.lead, bite.end, true) : COIL
}

/**
 * Where a clip of a lead is: on what it bites; or, biting nothing, lying on
 * the mat. A first clip that bites nothing lies at the lead's own place, and
 * a second one a little way off from the first (`looseEnd`). `own` stops a
 * clip that bites another lead's clip from being followed further than that.
 */
export function clipAt(circuit: Circuit, lead: number, end: 0 | 1, own = false): P {
  const l = circuit.leads[lead], bite = end === 0 ? l.a : l.b
  if (bite !== null && (isPad(bite) || 'loose' in bite || !own)) return biteAt(circuit, bite)
  if (end === 0) return matAt(l.at ?? 0)
  return looseEnd(circuit, lead)
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
  return (index % 2 ? -1 : 1) * (span < LEAD_U * 1.6 ? LEAD_U * 0.72 : LEAD_U * 0.36)
}

/**
 * Where a lead's loose second clip lies on the mat: out from where its first
 * clip is, away from the middle of the board, each lead fanned a little from
 * the last so two never lie on each other. It is derived, not stored: a lead
 * is saved as what each clip bites and, when nothing holds it, its place.
 */
export function looseEnd(circuit: Circuit, lead: number): P {
  const l = circuit.leads[lead]
  // A first clip that bites another lead's clip is where that clip is, without coming back round to this one.
  const from = l.a === null ? matAt(l.at ?? 0) : isPad(l.a) || 'loose' in l.a ? biteAt(circuit, l.a) : circuit.leads[l.a.lead] && circuit.leads[l.a.lead].a !== null && l.a.end === 0 ? clipAt(circuit, l.a.lead, 0, true) : matAt(l.at ?? 0)
  if (l.a === null) return { x: from.x + LEAD_U * 0.95, y: from.y + 16 }
  const box = boardBox(circuit)
  const mid = { x: box.x + box.w / 2, y: box.y + box.h / 2 }
  const out = Math.atan2(from.y - mid.y, from.x - mid.x) + ((lead % 5) - 2) * 0.42
  return { x: from.x + Math.cos(out) * LEAD_U * 1.05, y: Math.max(STAGE.counterBottom + 26, from.y + Math.sin(out) * LEAD_U * 1.05) }
}

/** The two ends of a lead as it lies: each clip on what it bites, or lying loose on the mat. */
export function leadEnds(circuit: Circuit, lead: number): [P, P] {
  return [clipAt(circuit, lead, 0), clipAt(circuit, lead, 1)]
}

/**
 * The boot of a clip: the coloured grip a finger takes to pull the clip off.
 * It stands a fixed way back from what the clip bites, along the way the
 * lead leaves it, which is exactly where the view draws it.
 */
export function bootOf(p: P, q: P, end: 0 | 1, bend: number): P {
  const curve = leadCurve(p, q, bend)
  const tip = end === 0 ? p : q, back = onCurve(curve, end === 0 ? 0.16 : 0.84)
  const d = Math.hypot(back.x - tip.x, back.y - tip.y) || 1
  return { x: tip.x + ((back.x - tip.x) / d) * LEAD_U * 0.54, y: tip.y + ((back.y - tip.y) / d) * LEAD_U * 0.54 }
}
export function bootAt(circuit: Circuit, lead: number, end: 0 | 1, bend: number): P {
  return bootOf(...leadEnds(circuit, lead), end, bend)
}

/** Where each clip of the test lamp is: on what it bites, or at its own place on the mat. */
export function probeEnds(circuit: Circuit): [P, P] {
  return [circuit.probe[0] === null ? PROBE_HOME[0] : biteAt(circuit, circuit.probe[0]), circuit.probe[1] === null ? PROBE_HOME[1] : biteAt(circuit, circuit.probe[1])]
}
/** How far each lead of the test lamp bows. */
export const PROBE_BEND = [26, -26] as const
/** Where a finger takes a clip of the test lamp: by its boot when it bites, where it lies when it does not. */
export function probeGrip(circuit: Circuit, end: 0 | 1): P {
  const at = probeEnds(circuit)[end]
  return circuit.probe[end] === null ? at : bootOf(at, TEST_LAMP, 0, PROBE_BEND[end])
}

// --- What a finger is on -----------------------------------------------------------

export type Hit =
  /** The boot of a lead's clip that bites something. */
  | { on: 'boot'; lead: number; end: 0 | 1 }
  /** A lead's loose clip, lying on the mat. */
  | { on: 'clip'; lead: number }
  /** A lead that lies wholly loose on the mat, by either of its clips. */
  | { on: 'whole'; lead: number }
  /** A clip of the test lamp, where it bites or where it lies. */
  | { on: 'probe'; end: 0 | 1 }
  /** The middle of a part on the board. */
  | { on: 'part'; part: number }
  | { on: 'pad'; pad: number }
  /** A part that lies loose on the mat. */
  | { on: 'loose'; loose: number }
  /** The wire of a lead, between its clips. */
  | { on: 'wire'; lead: number }
  | { on: 'tray'; kind: Exclude<PartKind, 'odd'> }
  | { on: 'coil' }
  | { on: 'odd'; what: OddKind }
  /** The glass of the test lamp itself. */
  | { on: 'testLamp' }
  /** The lid of the gadget on the mat, or the bare green of a board. */
  | { on: 'lid' }
  | { on: 'board' }
  /** The board that hangs at the top left. */
  | { on: 'hung' }
  | { on: 'owner' }
  | { on: 'waiting' }
  | { on: 'oldHand' }
  | { on: 'mug' }
  | { on: 'mat' }

/** What a clip in the hand would bite here: a pad, an end of a loose part, or another lead's loose clip. Or nothing. `self` is the lead whose clip it is. */
export function biteNear(circuit: Circuit, at: P, self: number | null): Bite | null {
  const lay = layOf(circuit), r = reach(lay)
  let best: Bite | null = null, bestD: number = r.pad * 1.25
  boardFor(circuit).pads.forEach((_, i) => {
    const d = Math.hypot(at.x - padAt(circuit, i).x, at.y - padAt(circuit, i).y)
    if (d <= bestD) { best = i; bestD = d }
  })
  if (best !== null) return best
  for (let i = 0; i < circuit.loose.length; i++) for (const end of [0, 1] as const) {
    if (near(at, biteAt(circuit, { loose: i, end }), 30)) return { loose: i, end }
  }
  for (let i = circuit.leads.length - 1; i >= 0; i--) {
    if (i === self) continue
    if (circuit.leads[i].b === null && near(at, clipAt(circuit, i, 1), r.clip)) return { lead: i, end: 1 }
    if (circuit.leads[i].a === null && near(at, clipAt(circuit, i, 0), r.clip)) return { lead: i, end: 0 }
  }
  return null
}

/**
 * What the finger is on, the most particular thing first: a boot before the
 * pad it bites, the middle of a part before its pads, a pad before a wire
 * that crosses it, anything on the mat before the mat. `bends` is how far
 * each lead bows now, and `open` whether a board lies open on the mat.
 */
export function hitTest(circuit: Circuit, at: P, bends: readonly number[], open: boolean): Hit {
  if (open) {
    const lay = layOf(circuit), r = reach(lay)
    const bendOf = (i: number) => bends[i] ?? restBend(...leadEnds(circuit, i), i)
    // The newest lead is on top, so it is tried first.
    for (let i = circuit.leads.length - 1; i >= 0; i--) {
      if (circuit.leads[i].a === null) {
        // It bites nothing: it is taken up whole, by either clip.
        if (near(at, clipAt(circuit, i, 0), r.clip) || near(at, clipAt(circuit, i, 1), r.clip)) return { on: 'whole', lead: i }
        continue
      }
      if (circuit.leads[i].b === null) {
        if (near(at, looseEnd(circuit, i), r.clip)) return { on: 'clip', lead: i }
      } else if (near(at, bootAt(circuit, i, 1, bendOf(i)), r.boot)) return { on: 'boot', lead: i, end: 1 }
      if (near(at, bootAt(circuit, i, 0, bendOf(i)), r.boot)) return { on: 'boot', lead: i, end: 0 }
    }
    for (const end of [0, 1] as const) if (near(at, probeGrip(circuit, end), r.boot + 4)) return { on: 'probe', end }
    // The middle of a part is the part itself; its two ends are its pads.
    for (let i = 0; i < circuit.parts.length; i++) {
      const part = circuit.parts[i], p = padAt(circuit, part.a), q = padAt(circuit, part.b)
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
      const along = Math.abs(((at.x - mid.x) * (q.x - p.x) + (at.y - mid.y) * (q.y - p.y)) / lay.u), across = Math.abs(((at.x - mid.x) * (q.y - p.y) - (at.y - mid.y) * (q.x - p.x)) / lay.u)
      if (along <= lay.u * 0.26 && across <= r.part) return { on: 'part', part: i }
    }
    let best = -1, bestD: number = r.pad
    boardFor(circuit).pads.forEach((_, i) => {
      const d = Math.hypot(at.x - padAt(circuit, i).x, at.y - padAt(circuit, i).y)
      if (d <= bestD) { best = i; bestD = d }
    })
    if (best >= 0) return { on: 'pad', pad: best }
    for (let i = 0; i < circuit.loose.length; i++) if (inBox(at, looseBox(circuit.loose[i].at))) return { on: 'loose', loose: i }
    for (let i = circuit.leads.length - 1; i >= 0; i--) {
      const curve = leadCurve(...leadEnds(circuit, i), bendOf(i))
      for (let t = 0.28; t <= 0.72; t += 0.04) if (near(at, onCurve(curve, t), r.wire)) return { on: 'wire', lead: i }
    }
    if (near(at, TEST_LAMP, 26)) return { on: 'testLamp' }
    for (let i = 0; i < TRAY_KINDS.length; i++) {
      const kind = TRAY_KINDS[i]
      if (inBox(at, trayPlace(i))) return kind === 'coil' ? { on: 'coil' } : { on: 'tray', kind }
    }
    for (const what of ODD_KINDS) if (near(at, oddPlace(what), 30)) return { on: 'odd', what }
    if (circuit.gadget !== 'sign' && inBox(at, lidBox(circuit))) return { on: 'lid' }
    if (inBox(at, boardBox(circuit))) return { on: 'board' }
  }
  if (inBox(at, HUNG)) return { on: 'hung' }
  if (inBox(at, WAITING)) return { on: 'waiting' }
  if (inBox(at, OWNER)) return { on: 'owner' }
  if (near(at, MUG, 34)) return { on: 'mug' }
  if (inBox(at, OLD_HAND_BOX)) return { on: 'oldHand' }
  return { on: 'mat' }
}
