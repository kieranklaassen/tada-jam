import { type GadgetKind } from './board'
import { benchOdd, boardFor, crackTrace, partAcross, placePart, removeLead, trayPart, turnPart, type Circuit, type OddKind, type Part } from './circuit'
import { LADDER } from './config'
import { asBuilt, hasSwitch } from './gadgets'
import { handBack } from './handback'
import { read, RUNS_FROM } from './solve'
import { CUSTOMERS, type Who } from './tastes'

// The designed order. A job is one customer with one gadget and what is broken
// in it, laid out from a position of the ladder in config.ts and a seeded
// stream, so the same position and the same stream always lay out the same
// job. Each position adds one idea to those before it. At `gap` and `switch`
// a job is always the position's own. From `flat` on a position lays out its
// own idea two times in three and an earlier one otherwise, so kinds are
// mixed and the child has to tell which is which: a job with a single break
// still comes at every position, `double` and `ticket` included.

/** The kinds of break, in the order the ladder brings them in. */
export type BreakKind = 'gap' | 'flat' | 'dead' | 'stuff' | 'backwards' | 'short' | 'branch'

/** What was broken, and where: enough to say what a mend of it is. Never saved and never shown. */
export type Break =
  | { kind: 'gap'; how: 'crack'; trace: number }
  | { kind: 'gap'; how: 'loose' }
  | { kind: 'flat'; a: number; b: number }
  | { kind: 'dead'; a: number; b: number }
  | { kind: 'stuff'; what: OddKind }
  | { kind: 'backwards'; how: 'motor' | 'cell' | 'nose-to-nose'; a: number; b: number }
  | { kind: 'short'; a: number; b: number }
  | { kind: 'branch'; how: 'crack'; trace: number }
  | { kind: 'branch'; how: 'dead'; a: number; b: number }

/** An order ticket: this many of this part are asked for. The count is the one numeral of the game; the drawing carries it without. */
export type Ticket = { part: 'lamp' | 'cell' | 'switch'; count: 1 | 2 | 3 }

export type Job = {
  who: Who
  /**
   * The job's own idea: the id of the position its breaks were drawn for when it was laid out. That is the position's
   * own id when the job holds the position's own kind, and the id of the earlier position that brought the kind in
   * otherwise. The neat way shown after the job is this idea's. It is not read from the stored position, which may
   * have moved since, and it is never shown.
   */
  idea: string
  circuit: Circuit
  ticket: Ticket | null
  /** The lid is open and the board is on the mat. */
  open: boolean
  /** A hand-back has already failed in this cycle. */
  missed: boolean
}

// --- The seeded stream ---------------------------------------------------------

/** One step of the stream: a number in [0, 1) and the state to carry on from. No clock and no `Math.random`. */
export function draw(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

class Stream {
  constructor(public state: number) {}
  next(): number {
    const [value, state] = draw(this.state)
    this.state = state
    return value
  }
  pick<T>(from: readonly T[]): T {
    return from[Math.min(from.length - 1, Math.floor(this.next() * from.length))]
  }
}

// --- The breaks ------------------------------------------------------------------

const INSULATORS: readonly OddKind[] = ['rubber', 'stick', 'string']
const linkLead = (circuit: Circuit) => {
  const [a, b] = boardFor(circuit).linkSocket
  return circuit.leads.findIndex((lead) => lead.a === a && lead.b === b)
}
const isLoad = (part: Part) => part.kind === 'lamp' || part.kind === 'motor' || part.kind === 'buzzer'
const killed = (part: Part): Part => (part.kind === 'lamp' ? { ...part, blown: true } : part.kind === 'motor' || part.kind === 'buzzer' ? { ...part, dead: true } : part)
const replace = (circuit: Circuit, index: number, part: Part): Circuit => ({ ...circuit, parts: circuit.parts.map((p, i) => (i === index ? part : p)) })

/** Break a whole gadget in one way. Returns null where this kind of break has no place in the circuit as it lies. */
function breakIt(circuit: Circuit, kind: BreakKind, stream: Stream): { circuit: Circuit; broke: Break } | null {
  const board = boardFor(circuit)
  const rungPads = new Set(board.rungs.flat())
  const onRung = (trace: number) => rungPads.has(board.traces[trace].a) || rungPads.has(board.traces[trace].b)
  switch (kind) {
    case 'gap': {
      const link = linkLead(circuit)
      if (link >= 0 && stream.next() < 1 / 3) {
        return { circuit: { ...circuit, leads: circuit.leads.map((lead, i) => (i === link ? { a: lead.a, b: null } : lead)) }, broke: { kind, how: 'loose' } }
      }
      // A crack in plain sight: on a trace that every part depends on, which is one the whole of the cell's current runs through.
      const whole = read(asBuilt(circuit.gadget))
      const most = Math.max(...whole.traces.map(Math.abs))
      const traces = whole.traces.flatMap((c, i) => (Math.abs(c) > most * 0.99 && !circuit.cracks.includes(i) ? [i] : []))
      if (traces.length === 0) return null
      const trace = stream.pick(traces)
      return { circuit: crackTrace(circuit, trace), broke: { kind, how: 'crack', trace } }
    }
    case 'flat': {
      const cell = circuit.parts.findIndex((p) => p.kind === 'cell' && !p.flat)
      const part = circuit.parts[cell]
      if (!part || part.kind !== 'cell') return null
      return { circuit: replace(circuit, cell, { ...part, flat: true }), broke: { kind, a: part.a, b: part.b } }
    }
    case 'dead': {
      // The gadget's main part, on its last rung.
      const [a, b] = board.rungs[board.rungs.length - 1]
      const main = partAcross(circuit, a, b)
      const part = circuit.parts[main]
      if (!part || !isLoad(part) || killed(part) === part) return null
      return { circuit: replace(circuit, main, killed(part)), broke: { kind, a: part.a, b: part.b } }
    }
    case 'stuff': {
      const link = linkLead(circuit)
      if (link < 0) return null
      const what = stream.pick(INSULATORS), [a, b] = board.linkSocket
      return { circuit: placePart(removeLead(circuit, link), benchOdd(what, a, b)), broke: { kind, what } }
    }
    case 'backwards': {
      const motor = circuit.parts.findIndex((p) => p.kind === 'motor')
      if (motor >= 0) {
        const cell = circuit.parts.findIndex((p) => p.kind === 'cell')
        const turn = stream.next() < 0.5 ? motor : cell
        const part = circuit.parts[turn]
        return { circuit: turnPart(circuit, turn), broke: { kind, how: turn === motor ? 'motor' : 'cell', a: part.b, b: part.a } }
      }
      // No motor to show a direction: a second cell stands in the row, nose to nose with the first.
      const link = linkLead(circuit)
      if (link < 0) return null
      const [a, b] = board.linkSocket
      return { circuit: placePart(removeLead(circuit, link), trayPart('cell', b, a)), broke: { kind, how: 'nose-to-nose', a: b, b: a } }
    }
    case 'short': {
      const rung = board.rungs.find(([a, b]) => partAcross(circuit, a, b) < 0)
      if (!rung) return null
      return { circuit: placePart(circuit, benchOdd('foil', rung[0], rung[1])), broke: { kind, a: rung[0], b: rung[1] } }
    }
    case 'branch': {
      // Two or more things on one cell, and one of them is cut off: a crack in its own stub, or the part itself.
      const loads = circuit.parts.flatMap((p, i) => (isLoad(p) && killed(p) !== p ? [i] : []))
      if (loads.length < 2) return null
      const part = circuit.parts[stream.pick(loads)]
      if (stream.next() < 0.5) return { circuit: replace(circuit, circuit.parts.indexOf(part), killed(part)), broke: { kind, how: 'dead', a: part.a, b: part.b } }
      const stubs = board.traces.flatMap((t, i) => (onRung(i) && (t.a === part.a || t.b === part.a || t.a === part.b || t.b === part.b) && !circuit.cracks.includes(i) ? [i] : []))
      if (stubs.length === 0) return null
      const trace = stream.pick(stubs)
      return { circuit: crackTrace(circuit, trace), broke: { kind, how: 'crack', trace } }
    }
  }
}

/**
 * Whether one act of the easy kind makes the gadget run: one lead between any
 * two pads, or one part swapped for a fresh one from the tray. A job laid out
 * for `double` or `ticket` holds two breaks that no such act mends: the sheet
 * allows a single lead that spans both, and the layout does not lay such a
 * pair out, so trying every lead or every swap in turn does not get a child
 * through those.
 */
export function oneActMends(circuit: Circuit): boolean {
  const pads = boardFor(circuit).pads.length
  for (let a = 0; a < pads; a++) for (let b = a + 1; b < pads; b++) {
    if (handBack({ ...circuit, leads: [...circuit.leads, { a, b }] }).ran) return true
  }
  return circuit.parts.some((part, i) => part.kind !== 'switch' && part.kind !== 'odd' && handBack(replace(circuit, i, trayPart(part.kind, part.a, part.b))).ran)
}

// --- The positions ---------------------------------------------------------------

const PLAIN: readonly GadgetKind[] = ['lamp-plain', 'fan-plain', 'bell-plain']
const SWITCHED: readonly GadgetKind[] = ['lamp', 'fan', 'bell']
const BRANCHED: readonly GadgetKind[] = ['car', 'robot']

/** The break each position brings in. `double` and `ticket` bring in none: they combine. */
const BRINGS_IN: Record<string, BreakKind | null> = { gap: 'gap', switch: null, flat: 'flat', dead: 'dead', stuff: 'stuff', backwards: 'backwards', short: 'short', branch: 'branch', double: null, ticket: null }

/** The kinds of break a child at this position has already met, this position's own included. */
export function kindsMetBy(position: string): BreakKind[] {
  const at = Math.max(0, LADDER.indexOf(position))
  return LADDER.slice(0, at + 1).flatMap((id) => BRINGS_IN[id] ?? [])
}

const TICKETS: readonly Ticket[] = [{ part: 'lamp', count: 2 }, { part: 'lamp', count: 3 }, { part: 'cell', count: 2 }, { part: 'switch', count: 2 }]

/**
 * Lay out the job for a customer who steps up to the window. `avoid` is the
 * customer already at the bench, so the same face is not on screen twice.
 * Returns the job, the breaks in it, and the stream's state to carry on from.
 */
export function layOut(position: string, state: number, avoid?: Who): { job: Job; breaks: Break[]; stream: number } {
  const stream = new Stream(state >>> 0)
  const id = LADDER.includes(position) ? position : LADDER[0]
  const who = stream.pick(CUSTOMERS.filter((c) => c !== avoid))
  const met = kindsMetBy(id), own = BRINGS_IN[id]
  // Which kinds to break, in order of preference; the first that fit the gadget are used.
  const earlier = met.filter((kind) => kind !== own)
  const shuffled = (kinds: BreakKind[]) => kinds.map((kind) => ({ kind, key: stream.next() })).sort((x, y) => x.key - y.key).map((x) => x.kind)
  // `double` and `ticket` have no kind of break of their own: their own idea is two breaks at once. One time in three
  // they too lay out an earlier idea, which is a single break.
  const combines = (id === 'double' || id === 'ticket') && stream.next() < 2 / 3
  let wanted: BreakKind[]
  if (combines || id === 'double' || id === 'ticket') wanted = shuffled(met)
  else if (own && (earlier.length === 0 || stream.next() < 2 / 3)) wanted = [own, ...shuffled(earlier)]
  else wanted = [...shuffled(earlier), ...(own ? [own] : [])]
  const pool = id === 'gap' ? PLAIN : wanted[0] === 'branch' ? BRANCHED : LADDER.indexOf(id) >= LADDER.indexOf('branch') ? [...SWITCHED, ...BRANCHED] : SWITCHED
  const gadget = stream.pick(pool)
  let circuit = asBuilt(gadget)
  // From the second position on a gadget arrives switched off: its lever is up, and that is no break.
  if (hasSwitch(gadget)) circuit = { ...circuit, parts: circuit.parts.map((p): Part => (p.kind === 'switch' ? { ...p, down: false } : p)) }
  const breaks: Break[] = []
  if (combines) {
    // Two breaks of different kinds, the first pair in the shuffled order that holds. A pair is not used when its
    // breaks undo each other (a flat cell beside one that pushes the wrong way lights a lamp dimly), or when one
    // lead or one swap mends both. A flat cell with a dead part always holds, so a pair is always found.
    search: for (let i = 0; i < wanted.length; i++) for (let j = i + 1; j < wanted.length; j++) {
      const one = breakIt(circuit, wanted[i], stream)
      const two = one && breakIt(one.circuit, wanted[j], stream)
      if (!one || !two || handBack(two.circuit).ran || oneActMends(two.circuit)) continue
      circuit = two.circuit
      breaks.push(one.broke, two.broke)
      break search
    }
  } else {
    for (const kind of wanted) {
      const broken = breakIt(circuit, kind, stream)
      if (!broken) continue
      circuit = broken.circuit
      breaks.push(broken.broke)
      break
    }
  }
  // A job laid out for an earlier idea carries that idea: the id of the position that brought its kind of break in.
  const first = breaks[0]?.kind
  const earlierIdea = first && first !== own && id !== 'switch' && !combines
  const idea = earlierIdea ? (LADDER.find((step) => BRINGS_IN[step] === first) ?? id) : id
  // Only a job laid out for `ticket` itself brings a ticket.
  const ticket = idea === 'ticket' ? stream.pick(TICKETS) : null
  return { job: { who, idea, circuit, ticket, open: false, missed: false }, breaks, stream: stream.state }
}

/** Whether the gadget, switched on, holds what the ticket asks for: at least that many of that part carrying current. */
export function meetsTicket(circuit: Circuit, ticket: Ticket): boolean {
  const on: Circuit = { ...circuit, probe: [null, null], parts: circuit.parts.map((p): Part => (p.kind === 'switch' ? { ...p, down: true } : p)) }
  const reading = read(on)
  return on.parts.filter((p, i) => p.kind === ticket.part && Math.abs(reading.parts[i]) >= RUNS_FROM).length >= ticket.count
}
