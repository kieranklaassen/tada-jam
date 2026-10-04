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

/**
 * What a clip bites: a pad of the board, by its number; one end or the other
 * of a part that lies loose on the mat (end 0 is the part's `a`); or the clip
 * of another lead, which joins the two leads end to end.
 */
export type Bite = number | { loose: number; end: 0 | 1 } | { lead: number; end: 0 | 1 }

export const isPad = (bite: Bite | null): bite is number => typeof bite === 'number'

/**
 * A lead with a clip on each end. A clip that bites nothing is null and lies
 * loose. Its first clip is the one that bites, when either does: `a` is null
 * only when `b` is too, and the whole lead then lies loose on the mat.
 *
 * `at` is the lead's own place, a cell of the coarse grid over the mat. It is
 * kept exactly when neither clip bites a pad or a part: the lead then lies
 * there, or, where a clip bites another lead's clip, would lie there if that
 * join were lost. A lead with a clip on a pad or a part has no `at`: it is
 * where that clip is.
 */
export type Lead = { a: Bite | null; b: Bite | null; at?: number }

/** A clip that bites a pad or a part holds its lead in place. One that bites another lead's clip, or nothing, does not. */
export const anchors = (bite: Bite | null): boolean => bite !== null && (isPad(bite) || 'loose' in bite)

/** The lead with its place kept or dropped as its clips now need: a place when neither holds it, none when one does. */
function placed(lead: Lead, at: number | undefined): Lead {
  if (anchors(lead.a) || anchors(lead.b)) return { a: lead.a, b: lead.b }
  return { a: lead.a, b: lead.b, at: lead.at ?? at ?? 0 }
}

export type Circuit = {
  gadget: GadgetKind
  /** Indexes into the board's traces: the ones that are cracked through. */
  cracks: number[]
  parts: Part[]
  leads: Lead[]
  /** The parts that lie loose on the mat. */
  loose: Loose[]
  /** The test lamp's two clips: each bites as a lead's clip does, or null while it lies on the mat. With neither clipped it lies at its own place on the mat. */
  probe: [Bite | null, Bite | null]
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

// --- How much room a part takes -------------------------------------------------

/**
 * The room each kind of part takes on the board, in pad units, about the
 * middle of the two pads it sits across: so long along them and so wide
 * across. The painters draw each part's body to exactly this, and no part is
 * seated where its room would run into another's.
 */
export const FOOT: Record<PartKind, { along: number; across: number }> = {
  cell: { along: 0.86, across: 0.6 },
  switch: { along: 0.96, across: 0.4 },
  lamp: { along: 0.6, across: 0.6 },
  motor: { along: 0.6, across: 0.6 },
  buzzer: { along: 0.6, across: 0.6 },
  odd: { along: 0.9, across: 0.16 },
}

/** The rectangle a part takes on the board, in pad units. Every pair of pads a part can sit across lies along a row or a column. */
export function footOf(circuit: Circuit, part: Part): { x: number; y: number; w: number; h: number } {
  const pads = boardFor(circuit).pads, p = pads[part.a], q = pads[part.b], foot = FOOT[part.kind]
  const flat = p.y === q.y, w = flat ? foot.along : foot.across, h = flat ? foot.across : foot.along
  return { x: (p.x + q.x) / 2 - w / 2, y: (p.y + q.y) / 2 - h / 2, w, h }
}

/** Whether a part has room where it would sit: its rectangle runs into no other part's. */
export function hasRoom(circuit: Circuit, part: Part): boolean {
  const mine = footOf(circuit, part)
  return circuit.parts.every((other) => {
    const theirs = footOf(circuit, other)
    return mine.x >= theirs.x + theirs.w - 1e-9 || theirs.x >= mine.x + mine.w - 1e-9 || mine.y >= theirs.y + theirs.h - 1e-9 || theirs.y >= mine.y + mine.h - 1e-9
  })
}

// --- What a finger can do -----------------------------------------------------
// Each returns the circuit unchanged when the act is not possible, so a touch
// that lands somewhere odd never throws and never loses anything.

/** Put a part across two pads one unit apart, if nothing sits there. */
export function placePart(circuit: Circuit, part: Part): Circuit {
  if (circuit.parts.length >= MAX_PARTS) return circuit
  if (!isSocket(boardFor(circuit), part.a, part.b) || partAcross(circuit, part.a, part.b) >= 0 || !hasRoom(circuit, part)) return circuit
  return { ...circuit, parts: [...circuit.parts, part] }
}

/** Take a part off the board. It goes back to the tray, which never runs out. */
export function removePart(circuit: Circuit, index: number): Circuit {
  if (!circuit.parts[index]) return circuit
  return { ...circuit, parts: circuit.parts.filter((_, i) => i !== index) }
}

/** Move a part from where it sits to another pair of pads. Where it cannot go, nothing changes: it is never taken off and not put down. */
export function movePart(circuit: Circuit, index: number, part: Part): Circuit {
  if (!circuit.parts[index]) return circuit
  const without = removePart(circuit, index), moved = placePart(without, part)
  return moved === without ? circuit : moved
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

/** Seat a loose part across two pads one unit apart, `a` first: the order is the way round it lies. Clips on its ends stay on: they now bite the pads. */
export function seat(circuit: Circuit, index: number, a: number, b: number): Circuit {
  const loose = circuit.loose[index]
  if (!loose || !isSocket(boardFor(circuit), a, b) || partAcross(circuit, a, b) >= 0) return circuit
  const { at: _at, ...body } = loose
  if (!hasRoom(circuit, { ...body, a, b } as Part)) return circuit
  return tidy({ ...circuit, parts: [...circuit.parts, { ...body, a, b } as Part] }, { loose: index, becomes: [a, b] })
}

/** Move a loose part to another place on the mat, or put it back in the tray with `null`: clips on its ends then let go. */
export function moveLoose(circuit: Circuit, index: number, at: number | null): Circuit {
  const loose = circuit.loose[index]
  if (!loose) return circuit
  if (at === null) return tidy(circuit, { loose: index, becomes: null })
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

/**
 * Whether a clip can bite this. A pad must be on the board and a loose part
 * on the mat. Another lead's clip can be bitten when that clip itself bites
 * a pad, a part or nothing: never a third lead's clip, so a join is always
 * two clips and where it lies is never in doubt. `self` is the lead whose
 * clip is biting, which cannot bite itself.
 */
export function canBite(circuit: Circuit, bite: Bite, self: number | null): boolean {
  if (isPad(bite)) return onBoard(circuit, bite)
  if (bite.end !== 0 && bite.end !== 1) return false
  if ('loose' in bite) return Number.isInteger(bite.loose) && bite.loose >= 0 && bite.loose < circuit.loose.length
  const other = circuit.leads[bite.lead]
  if (!Number.isInteger(bite.lead) || !other || bite.lead === self) return false
  const theirs = bite.end === 0 ? other.a : other.b
  return theirs === null || isPad(theirs) || 'loose' in theirs
}

type Change = { lead: number } | { loose: number; becomes: [number, number] | null }

/**
 * Take a lead or a loose part out and keep every clip's bite true. A clip
 * that bit what is gone lets go, or, for a part that was seated, bites the
 * pad its end now stands on. Numbers above the one taken out move down. A
 * lead left holding on by its second clip only is turned end for end, so its
 * first clip is the one that bites. A lead left biting nothing stays on the
 * mat where it is: at its own place, or at the place of the part it let go of.
 */
function tidy(circuit: Circuit, change: Change): Circuit {
  let leads: (Lead | null)[] = circuit.leads.map((l) => ({ ...l }))
  let probe: [Bite | null, Bite | null] = [circuit.probe[0], circuit.probe[1]]
  let loose = circuit.loose
  const each = (fix: (bite: Bite | null) => Bite | null) => {
    leads = leads.map((l) => (l ? { ...l, a: fix(l.a), b: fix(l.b) } : l))
    probe = [fix(probe[0]), fix(probe[1])]
  }
  const onLead = (bite: Bite | null): bite is { lead: number; end: 0 | 1 } => bite !== null && !isPad(bite) && 'lead' in bite
  // Where a lead lies once it has let go, when it had no place of its own.
  let fallen: number | undefined
  if ('loose' in change) {
    const { loose: gone, becomes } = change
    fallen = loose[gone]?.at
    loose = loose.filter((_, i) => i !== gone)
    each((bite) => {
      if (bite === null || isPad(bite) || !('loose' in bite)) return bite
      if (bite.loose === gone) return becomes ? becomes[bite.end] : null
      return bite.loose > gone ? { loose: bite.loose - 1, end: bite.end } : bite
    })
  } else {
    // A lead that bit a clip of the one taken out lets go there.
    leads[change.lead] = null
    each((bite) => (onLead(bite) && bite.lead === change.lead ? null : bite))
  }
  // A lead left with only its second clip biting is turned end for end, and whatever bit one of its clips follows it.
  leads.forEach((l, i) => {
    if (!l || l.a !== null || l.b === null) return
    leads[i] = { ...l, a: l.b, b: null }
    each((bite) => (onLead(bite) && bite.lead === i ? { lead: i, end: bite.end === 0 ? 1 : 0 } : bite))
  })
  // Close the gaps in the numbering, and give each lead a place or none, as its clips now need.
  const moved = new Map<number, number>()
  leads.forEach((l, i) => { if (l) moved.set(i, moved.size) })
  each((bite) => (onLead(bite) ? { lead: moved.get(bite.lead)!, end: bite.end } : bite))
  return { ...circuit, loose, leads: leads.flatMap((l) => (l ? [placed(l, fallen)] : [])), probe }
}

/**
 * Bite something with a lead's first clip. Its other clip lies loose until
 * `clipLeadEnd`. `at` is where the lead would lie if it came to bite nothing:
 * it is kept only when the first clip bites another lead's clip. Returns the
 * circuit and the lead's index, or -1.
 */
export function startLead(circuit: Circuit, a: Bite, at?: number): { circuit: Circuit; lead: number } {
  if (circuit.leads.length >= MAX_LEADS || !canBite(circuit, a, null)) return { circuit, lead: -1 }
  return { circuit: { ...circuit, leads: [...circuit.leads, placed({ a, b: null }, at)] }, lead: circuit.leads.length }
}

/** Lay a whole lead loose on the mat, biting nothing, at a place of the grid. It stays there until it is taken up again. */
export function layLead(circuit: Circuit, at: number): Circuit {
  if (circuit.leads.length >= MAX_LEADS || !Number.isInteger(at) || at < 0 || at >= MAT.cols * MAT.rows) return circuit
  return { ...circuit, leads: [...circuit.leads, { a: null, b: null, at }] }
}

/** Bite something with a lead's second clip, or let that clip go again with `null`. Both clips on one pad is a loop of nothing, and is allowed. */
export function clipLeadEnd(circuit: Circuit, index: number, b: Bite | null, at?: number): Circuit {
  const lead = circuit.leads[index]
  // A lead that lies wholly loose is taken up whole; its second clip does not bite while its first lies.
  if (!lead || lead.a === null || (b !== null && !canBite(circuit, b, index))) return circuit
  // A clip that others bite cannot itself go and bite a lead's clip: a join is two clips, never a chain.
  const bitten = circuit.leads.some((l) => [l.a, l.b].some((x) => x !== null && !isPad(x) && 'lead' in x && x.lead === index && x.end === 1))
  if (b !== null && !isPad(b) && 'lead' in b && bitten) return circuit
  return { ...circuit, leads: circuit.leads.map((l, i) => (i === index ? placed({ ...lead, b }, at) : l)) }
}

/** A whole lead in one act: both clips bite. */
export function clipLead(circuit: Circuit, a: Bite, b: Bite): Circuit {
  const started = startLead(circuit, a)
  return started.lead < 0 ? circuit : clipLeadEnd(started.circuit, started.lead, b)
}

/**
 * Turn a lead round: its two clips swap what they bite. Nothing in the
 * circuit changes by it. Only a lead with both clips biting can be turned; a
 * clip that bites one of its clips follows that clip to its new end.
 */
export function turnLead(circuit: Circuit, index: number): Circuit {
  const lead = circuit.leads[index]
  if (!lead || lead.a === null || lead.b === null) return circuit
  const follow = (bite: Bite | null): Bite | null => (bite !== null && !isPad(bite) && 'lead' in bite && bite.lead === index ? { lead: index, end: bite.end === 0 ? 1 : 0 } : bite)
  const leads = circuit.leads.map((l, i) => (i === index ? { ...l, a: lead.b, b: lead.a } : { ...l, a: follow(l.a), b: follow(l.b) }))
  return { ...circuit, leads, probe: [follow(circuit.probe[0]), follow(circuit.probe[1])] }
}

/** Take a lead off the mat altogether: it goes back to the coil, and any clip that bit one of its clips lets go. */
export function removeLead(circuit: Circuit, index: number): Circuit {
  if (!circuit.leads[index]) return circuit
  return tidy(circuit, { lead: index })
}

/**
 * Pull one clip of a lead off what it bites. The lead holds on with its
 * other clip, which becomes its first. A lead whose only biting clip is
 * pulled is whole in the hand: it leaves the mat until it is put down again.
 */
export function unclipLead(circuit: Circuit, index: number, end: 0 | 1): Circuit {
  const lead = circuit.leads[index]
  if (!lead || lead.a === null) return circuit
  if (end === 1) return lead.b === null ? circuit : { ...circuit, leads: circuit.leads.map((l, i) => (i === index ? placed({ ...lead, b: null }, undefined) : l)) }
  if (lead.b === null) return tidy(circuit, { lead: index })
  // Its first clip comes off: turn it end for end, and whatever bit a clip of it follows that clip.
  const follow = (bite: Bite | null): Bite | null => (bite !== null && !isPad(bite) && 'lead' in bite && bite.lead === index ? { lead: index, end: bite.end === 0 ? 1 : 0 } : bite)
  return {
    ...circuit,
    leads: circuit.leads.map((l, i) => (i === index ? placed({ ...lead, a: lead.b, b: null }, undefined) : { ...l, a: follow(l.a), b: follow(l.b) })),
    probe: [follow(circuit.probe[0]), follow(circuit.probe[1])],
  }
}

/** Clip one end of the test lamp to something, or lay it back on the mat with `null`. */
export function clipProbe(circuit: Circuit, end: 0 | 1, bite: Bite | null): Circuit {
  if (bite !== null && !canBite(circuit, bite, null)) return circuit
  const probe: [Bite | null, Bite | null] = [circuit.probe[0], circuit.probe[1]]
  probe[end] = bite
  return { ...circuit, probe }
}

/** Crack a trace through, or mend nothing: a crack is only ever bridged, by a lead across it. Used when a job is laid out. */
export function crackTrace(circuit: Circuit, trace: number): Circuit {
  if (!boardFor(circuit).traces[trace] || circuit.cracks.includes(trace)) return circuit
  return { ...circuit, cracks: [...circuit.cracks, trace].sort((x, y) => x - y) }
}
