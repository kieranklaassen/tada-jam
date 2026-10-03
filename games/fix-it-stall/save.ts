import { boardOf, isGadgetKind, isSocket, type GadgetKind } from './board'
import { MAX_LEADS, MAX_PARTS, ODD_KINDS, type Circuit, type Lead, type Part } from './circuit'
import { LADDER } from './config'
import { layOut, type Job, type Ticket } from './jobs'
import { firstDaySign } from './sign'
import { deserialize, freshState, serialize, type GameState } from './state'
import { isWho } from './tastes'

// Everything the stall keeps. It wraps the template's state.ts, which holds
// the version, the position and whether the cycle on screen has ended, and
// adds this game's own fields. Each is read from the raw record by itself and
// repaired by itself: one damaged field takes its default and the rest stays.
//
// Found as left: nothing in the hand is stored, and nothing that only shows
// the circuit running (beads, a glow, a turning blade). No date, no duration
// and no count of visits or mends is kept.

export type Stall = GameState & {
  /** The state of the seeded stream jobs are laid out from, so a reload deals nothing new. */
  stream: number
  /** The customer at the bench. */
  job: Job
  /** The customer at the window, as laid out. */
  next: Job
  /** The circuit of the stall's own sign. */
  sign: Circuit
  /** Which board lies on the mat. */
  onMat: 'job' | 'sign'
  /** The ids of the ideas whose neat way has been shown: each is shown once. */
  shown: string[]
}

/** Where every child's stream starts. The first two customers are the same for everyone; what follows depends on the play. */
export const FIRST_STREAM = 20261003

export function freshStall(childAge: number | null): Stall {
  const base = freshState(childAge)
  const first = layOut(base.position, FIRST_STREAM)
  const second = layOut(base.position, first.stream, first.job.who)
  return { ...base, stream: second.stream, job: first.job, next: second.job, sign: firstDaySign(), onMat: 'job', shown: [] }
}

// --- Reading a raw record, strictly ----------------------------------------------

const isRecord = (raw: unknown): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null && !Array.isArray(raw)
const isIndex = (raw: unknown, below: number): raw is number => typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < below

function readPart(raw: unknown, pads: number): Part | null {
  if (!isRecord(raw) || !isIndex(raw.a, pads) || !isIndex(raw.b, pads)) return null
  const { a, b } = raw
  switch (raw.kind) {
    case 'cell': return { kind: 'cell', a, b, flat: raw.flat === true, popped: raw.popped === true }
    case 'switch': return { kind: 'switch', a, b, down: raw.down === true }
    case 'lamp': return { kind: 'lamp', a, b, blown: raw.blown === true }
    case 'motor': return { kind: 'motor', a, b, dead: raw.dead === true }
    case 'buzzer': return { kind: 'buzzer', a, b, dead: raw.dead === true }
    case 'odd': {
      const what = ODD_KINDS.find((kind) => kind === raw.what)
      return what ? { kind: 'odd', a, b, what } : null
    }
    default: return null
  }
}

/** A circuit as this game could have left it, or null. Anything that could not lie on the board is refused whole. */
export function readCircuit(raw: unknown, want?: (kind: GadgetKind) => boolean): Circuit | null {
  if (!isRecord(raw) || !isGadgetKind(raw.gadget) || (want && !want(raw.gadget))) return null
  const board = boardOf(raw.gadget), pads = board.pads.length
  if (!Array.isArray(raw.cracks) || !Array.isArray(raw.parts) || !Array.isArray(raw.leads) || !Array.isArray(raw.probe)) return null
  if (raw.cracks.length > board.traces.length || raw.parts.length > MAX_PARTS || raw.leads.length > MAX_LEADS || raw.probe.length !== 2) return null
  const cracks: number[] = []
  for (const crack of raw.cracks) {
    if (!isIndex(crack, board.traces.length) || cracks.includes(crack)) return null
    cracks.push(crack)
  }
  const parts: Part[] = []
  for (const item of raw.parts) {
    const part = readPart(item, pads)
    // A part sits across two pads one unit apart, and no two parts share a pair.
    if (!part || !isSocket(board, part.a, part.b)) return null
    if (parts.some((p) => (p.a === part.a && p.b === part.b) || (p.a === part.b && p.b === part.a))) return null
    parts.push(part)
  }
  const leads: Lead[] = []
  for (const item of raw.leads) {
    if (!isRecord(item) || !isIndex(item.a, pads) || !(item.b === null || isIndex(item.b, pads))) return null
    leads.push({ a: item.a, b: item.b })
  }
  const [p0, p1] = raw.probe as unknown[]
  if (!(p0 === null || isIndex(p0, pads)) || !(p1 === null || isIndex(p1, pads))) return null
  return { gadget: raw.gadget, cracks: cracks.sort((x, y) => x - y), parts, leads, probe: [p0, p1] }
}

function readTicket(raw: unknown): Ticket | null | undefined {
  if (raw === null) return null
  if (!isRecord(raw)) return undefined
  const part = (['lamp', 'cell', 'switch'] as const).find((p) => p === raw.part)
  const count = ([1, 2, 3] as const).find((n) => n === raw.count)
  return part && count ? { part, count } : undefined
}

/** A job as this game could have left it, or null. */
export function readJob(raw: unknown): Job | null {
  if (!isRecord(raw) || !isWho(raw.who) || typeof raw.from !== 'string' || !LADDER.includes(raw.from)) return null
  // A customer never brings the stall's own sign.
  const circuit = readCircuit(raw.circuit, (kind) => kind !== 'sign')
  const ticket = readTicket(raw.ticket)
  if (!circuit || ticket === undefined) return null
  return { who: raw.who, from: raw.from, circuit, ticket, open: raw.open === true, missed: raw.missed === true }
}

/**
 * Saved state is untrusted. The template's `deserialize` decides whether this
 * is the game's record at all and repairs its three fields; a record it does
 * not know gives a fresh stall. Then each field of the stall is read again
 * from the same raw record and repaired by itself.
 */
export function deserializeStall(raw: unknown, childAge: number | null = null): Stall {
  const base = deserialize(raw, childAge)
  if (!isRecord(raw) || raw.v !== base.v) return freshStall(childAge)
  let stream = typeof raw.stream === 'number' && Number.isInteger(raw.stream) && raw.stream >= 0 && raw.stream <= 0xffffffff ? raw.stream : FIRST_STREAM
  let job = readJob(raw.job)
  if (!job) {
    // The customer at the bench is lost: another steps up, laid out from where the child is.
    const laid = layOut(base.position, stream)
    job = laid.job
    stream = laid.stream
  }
  let next = readJob(raw.next)
  if (!next || next.who === job.who) {
    const laid = layOut(base.position, stream, job.who)
    next = laid.job
    stream = laid.stream
  }
  const sign = readCircuit(raw.sign, (kind) => kind === 'sign') ?? firstDaySign()
  const shown = Array.isArray(raw.shown) ? LADDER.filter((id) => (raw.shown as unknown[]).includes(id)) : []
  return { ...base, stream, job, next, sign, onMat: raw.onMat === 'sign' ? 'sign' : 'job', shown }
}

const plainCircuit = (c: Circuit): Circuit => ({
  gadget: c.gadget,
  cracks: [...c.cracks],
  parts: c.parts.map((part) => ({ ...part })),
  leads: c.leads.map((lead) => ({ a: lead.a, b: lead.b })),
  probe: [c.probe[0], c.probe[1]],
})
const plainJob = (job: Job): Job => ({ who: job.who, from: job.from, circuit: plainCircuit(job.circuit), ticket: job.ticket ? { part: job.ticket.part, count: job.ticket.count } : null, open: job.open, missed: job.missed })

/** The stall as plain JSON: these fields and no others. */
export function serializeStall(stall: Stall): Stall {
  return { ...serialize(stall), stream: stall.stream, job: plainJob(stall.job), next: plainJob(stall.next), sign: plainCircuit(stall.sign), onMat: stall.onMat, shown: [...stall.shown] }
}
