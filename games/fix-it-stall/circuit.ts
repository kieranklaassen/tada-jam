import { boardOf, isSocket, type Board, type GadgetKind } from './board'

// A circuit as it lies on the mat: the board, which of its traces are cracked,
// the parts across its pads, the leads clipped between them, and the test lamp.
// Plain data, no renderer. Every change returns a new circuit, so the one the
// child left is always still there to compare with.

/** What a bench odd is made of. The first three let current through, the pencil a little, the last three not at all. */
export type OddKind = 'spoon' | 'key' | 'foil' | 'pencil' | 'rubber' | 'stick' | 'string'
export const ODD_KINDS: readonly OddKind[] = ['spoon', 'key', 'foil', 'pencil', 'rubber', 'stick', 'string']

/**
 * A part sits across pads `a` and `b`. The order is the part's own direction:
 * a cell pushes current out of `b`, its cap, and a motor turns forward when
 * current runs through it from `a` to `b`. Turning a part round swaps the two.
 */
export type Part =
  | { kind: 'cell'; a: number; b: number; flat: boolean; popped: boolean }
  | { kind: 'switch'; a: number; b: number; down: boolean }
  | { kind: 'lamp'; a: number; b: number; blown: boolean }
  | { kind: 'motor'; a: number; b: number; dead: boolean }
  | { kind: 'buzzer'; a: number; b: number; dead: boolean }
  | { kind: 'odd'; a: number; b: number; what: OddKind }

export type PartKind = Part['kind']
export const PART_KINDS: readonly PartKind[] = ['cell', 'switch', 'lamp', 'motor', 'buzzer', 'odd']

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A part without its pads: what it is, and the state it is in. */
export type Body = DistributiveOmit<Part, 'a' | 'b'>

/**
 * A part that lies loose on the mat beside the board, joined to nothing: one
 * taken off and put down, or one a fan has rolled away. `at` is its place as
 * a cell of a coarse grid over the mat, counted along the rows. It takes no
 * part in the circuit until it is seated across two pads.
 */
export type Loose = Body & { at: number }

/** The coarse grid over the mat. One loose part to a cell. */
export const MAT = { cols: 12, rows: 8 } as const

/** A lead with a clip on each end. `b` is null while its second clip lies loose on the mat. */
export type Lead = { a: number; b: number | null }

export type Circuit = {
  gadget: GadgetKind
  /** Indexes into the board's traces: the ones that are cracked through. */
  cracks: number[]
  parts: Part[]
  leads: Lead[]
  /** The parts that lie loose on the mat. */
  loose: Loose[]
  /** The test lamp's two clips: a pad each, or null while a clip lies on the mat. With neither clipped it lies at its own place on the mat. */
  probe: [number | null, number | null]
}

/** The most a board may carry. A save beyond these is not this game's, and the size test rests on them. */
export const MAX_PARTS = 24
export const MAX_LEADS = 16
export const MAX_LOOSE = 12

/** A fresh part from the tray: a full cell, a switch with its lever up, a whole lamp. */
export function trayPart(kind: Exclude<PartKind, 'odd'>, a: number, b: number): Part {
  switch (kind) {
    case 'cell': return { kind, a, b, flat: false, popped: false }
    case 'switch': return { kind, a, b, down: false }
    case 'lamp': return { kind, a, b, blown: false }
    case 'motor': return { kind, a, b, dead: false }
    case 'buzzer': return { kind, a, b, dead: false }
  }
}

export function benchOdd(what: OddKind, a: number, b: number): Part {
  return { kind: 'odd', a, b, what }
}

export function emptyCircuit(gadget: GadgetKind): Circuit {
  return { gadget, cracks: [], parts: [], leads: [], loose: [], probe: [null, null] }
}

export function boardFor(circuit: Circuit): Board {
  return boardOf(circuit.gadget)
}

/** The part that sits across these two pads, either way round, or -1. */
export function partAcross(circuit: Circuit, a: number, b: number): number {
  return circuit.parts.findIndex((part) => (part.a === a && part.b === b) || (part.a === b && part.b === a))
}

// --- What a finger can do -----------------------------------------------------
// Each returns the circuit unchanged when the act is not possible, so a touch
// that lands somewhere odd never throws and never loses anything.

/** Put a part across two pads one unit apart, if nothing sits there. */
export function placePart(circuit: Circuit, part: Part): Circuit {
  if (circuit.parts.length >= MAX_PARTS) return circuit
  if (!isSocket(boardFor(circuit), part.a, part.b) || partAcross(circuit, part.a, part.b) >= 0) return circuit
  return { ...circuit, parts: [...circuit.parts, part] }
}

/** Take a part off the board. It goes back to the tray, which never runs out. */
export function removePart(circuit: Circuit, index: number): Circuit {
  if (!circuit.parts[index]) return circuit
  return { ...circuit, parts: circuit.parts.filter((_, i) => i !== index) }
}

const bodyOf = (part: Part): Body => {
  const { a: _a, b: _b, ...body } = part
  return body as Body
}
const freeOnMat = (circuit: Circuit, at: number) => Number.isInteger(at) && at >= 0 && at < MAT.cols * MAT.rows && !circuit.loose.some((l) => l.at === at)

/** Take a part off the board and lay it on the mat, as it is: a blown lamp stays blown. Nothing is laid on a place that is taken. */
export function layDown(circuit: Circuit, index: number, at: number): Circuit {
  const part = circuit.parts[index]
  if (!part || circuit.loose.length >= MAX_LOOSE || !freeOnMat(circuit, at)) return circuit
  return { ...circuit, parts: circuit.parts.filter((_, i) => i !== index), loose: [...circuit.loose, { ...bodyOf(part), at } as Loose] }
}

/** Seat a loose part across two pads one unit apart, `a` first: the order is the way round it lies. */
export function seat(circuit: Circuit, index: number, a: number, b: number): Circuit {
  const loose = circuit.loose[index]
  if (!loose || !isSocket(boardFor(circuit), a, b) || partAcross(circuit, a, b) >= 0) return circuit
  const { at: _at, ...body } = loose
  return { ...circuit, parts: [...circuit.parts, { ...body, a, b } as Part], loose: circuit.loose.filter((_, i) => i !== index) }
}

/** Move a loose part to another place on the mat, or put it back in the tray with `null`. */
export function moveLoose(circuit: Circuit, index: number, at: number | null): Circuit {
  const loose = circuit.loose[index]
  if (!loose) return circuit
  if (at === null) return { ...circuit, loose: circuit.loose.filter((_, i) => i !== index) }
  if (!freeOnMat(circuit, at)) return circuit
  return { ...circuit, loose: circuit.loose.map((l, i) => (i === index ? ({ ...l, at } as Loose) : l)) }
}

/** Turn a part round: its two ends swap pads. */
export function turnPart(circuit: Circuit, index: number): Circuit {
  const part = circuit.parts[index]
  if (!part) return circuit
  return { ...circuit, parts: circuit.parts.map((p, i) => (i === index ? { ...p, a: p.b, b: p.a } : p)) }
}

/** Flick a part: a switch throws, a popped flag is set back. Anything else only rings, which the view plays. */
export function flickPart(circuit: Circuit, index: number): Circuit {
  const part = circuit.parts[index]
  if (!part) return circuit
  if (part.kind === 'switch') return { ...circuit, parts: circuit.parts.map((p, i) => (i === index ? { ...part, down: !part.down } : p)) }
  if (part.kind === 'cell' && part.popped) return { ...circuit, parts: circuit.parts.map((p, i) => (i === index ? { ...part, popped: false } : p)) }
  return circuit
}

const onBoard = (circuit: Circuit, pad: number) => Number.isInteger(pad) && pad >= 0 && pad < boardFor(circuit).pads.length

/** Bite a pad with a lead's first clip. Its other clip lies loose until `clipLeadEnd`. Returns the circuit and the lead's index, or -1. */
export function startLead(circuit: Circuit, a: number): { circuit: Circuit; lead: number } {
  if (circuit.leads.length >= MAX_LEADS || !onBoard(circuit, a)) return { circuit, lead: -1 }
  return { circuit: { ...circuit, leads: [...circuit.leads, { a, b: null }] }, lead: circuit.leads.length }
}

/** Bite a pad with a lead's loose clip, or let that clip go again with `null`. Both clips on one pad is a loop of nothing, and is allowed. */
export function clipLeadEnd(circuit: Circuit, index: number, b: number | null): Circuit {
  const lead = circuit.leads[index]
  if (!lead || (b !== null && !onBoard(circuit, b))) return circuit
  return { ...circuit, leads: circuit.leads.map((l, i) => (i === index ? { a: lead.a, b } : l)) }
}

/** A whole lead in one act: both clips bite. */
export function clipLead(circuit: Circuit, a: number, b: number): Circuit {
  const started = startLead(circuit, a)
  return started.lead < 0 ? circuit : clipLeadEnd(started.circuit, started.lead, b)
}

/** Take a lead off. It goes back to the coil. */
export function removeLead(circuit: Circuit, index: number): Circuit {
  if (!circuit.leads[index]) return circuit
  return { ...circuit, leads: circuit.leads.filter((_, i) => i !== index) }
}

/** Clip one end of the test lamp to a pad, or lay it back on the mat with `null`. */
export function clipProbe(circuit: Circuit, end: 0 | 1, pad: number | null): Circuit {
  if (pad !== null && !onBoard(circuit, pad)) return circuit
  const probe: [number | null, number | null] = [circuit.probe[0], circuit.probe[1]]
  probe[end] = pad
  return { ...circuit, probe }
}

/** Crack a trace through, or mend nothing: a crack is only ever bridged, by a lead across it. Used when a job is laid out. */
export function crackTrace(circuit: Circuit, trace: number): Circuit {
  if (!boardFor(circuit).traces[trace] || circuit.cracks.includes(trace)) return circuit
  return { ...circuit, cracks: [...circuit.cracks, trace].sort((x, y) => x - y) }
}
