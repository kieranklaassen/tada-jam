import { boardFor, isPad, type Bite, type Circuit, type OddKind, type Part } from './circuit'

// The model of the world. A circuit is solved as it lies: every pad is a node,
// every trace, lead and part is a resistance between two nodes, and a cell is
// a push with a small resistance of its own. Steady direct current, ideal
// parts of fixed resistance. Nothing is scripted to light: what runs is what
// the equations give.
//
// A motor is the one part that is also a source. While a cell turns it, it is
// a fixed resistance. Spun by hand it is a small source for as long as it
// turns (`Spin`), which lights a lamp with no cell and brakes the blade when a
// lead lies across its legs (`braking`).
//
// It leaves out, and the game never claims: cells running down, a filament's
// resistance changing as it heats, why a turning motor is a source
// (magnetism), and static electricity.
//
// The numbers are in the model's own units: one cell pushes 1, one lamp
// resists 1, so one cell through one lamp is a current of a little under 1.

/** The push of one full cell. */
export const CELL_PUSH = 1
export const RESISTANCE = {
  /** A trace, a lead, a closed switch. */
  wire: 0.002,
  /** Inside a full cell. It is why a short is large and not endless, and why many lamps on one cell each glow a little less. */
  cell: 0.05,
  /** Inside a flat cell: it pushes nothing and lets only a little through. */
  flatCell: 3,
  lamp: 1,
  motor: 1,
  buzzer: 1,
  /** A spoon, a key, a ball of foil. */
  metal: 0.02,
  /** The graphite of a pencil: it lets a little through. */
  pencil: 4,
} as const

/** A cell that gives more than this pops its cutout flag. A lead straight across one cell gives about 19. */
export const CUTOUT = 8
/** A lamp that carries this much blows. Two cells on one lamp give about 1.8, three about 2.6. */
export const BLOW = 2.4
/** Below this a part does not run at all. */
export const RUNS_FROM = 0.05

const LETS_THROUGH: Record<OddKind, number | null> = {
  spoon: RESISTANCE.metal, key: RESISTANCE.metal, foil: RESISTANCE.metal,
  pencil: RESISTANCE.pencil,
  rubber: null, stick: null, string: null,
}

/** The resistance of a bench odd, or null for one that lets nothing through. */
export function oddResistance(what: OddKind): number | null {
  return LETS_THROUGH[what]
}

/**
 * The current in everything, signed. Through a part it runs from `a` to `b`:
 * positive for a cell that is giving, and for a motor that turns forward.
 * Through a trace or a lead it runs from its `a` to its `b`, and through the
 * test lamp from its first clip to its second.
 */
export type Reading = {
  parts: number[]
  traces: number[]
  leads: number[]
  /** The parts that lie loose on the mat: a part held only by its leads runs like any other. */
  loose: number[]
  probe: number
}

/** A motor's blade turned by hand pushes like a small source. Keyed by the motor's index in `parts`; positive is forward. */
export type Spin = Readonly<Record<number, number>>

type Element = { a: number; b: number; g: number; push: number }

function partElement(part: Part, spin: number): Element | null {
  const el = (ohms: number, push = 0): Element => ({ a: part.a, b: part.b, g: 1 / ohms, push })
  switch (part.kind) {
    case 'cell':
      if (part.popped) return null
      return part.flat ? el(RESISTANCE.flatCell) : el(RESISTANCE.cell, CELL_PUSH / RESISTANCE.cell)
    case 'switch': return part.down ? el(RESISTANCE.wire) : null
    case 'lamp': return part.blown ? null : el(RESISTANCE.lamp)
    // A blade turned forward by hand drives current out of the motor's `a`, against the way that would turn it forward.
    case 'motor': return part.dead ? null : el(RESISTANCE.motor, -spin / RESISTANCE.motor)
    case 'buzzer': return part.dead ? null : el(RESISTANCE.buzzer)
    case 'odd': {
      const ohms = LETS_THROUGH[part.what]
      return ohms === null ? null : el(ohms)
    }
  }
}

/** Gaussian elimination with partial pivoting. `m` is n rows of n + 1 numbers and is used up. */
function eliminate(m: number[][]): number[] {
  const n = m.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
    const top = m[pivot]
    m[pivot] = m[col]
    m[col] = top
    const lead = top[col]
    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / lead
      if (factor === 0) continue
      const line = m[row]
      for (let k = col; k <= n; k++) line[k] -= factor * top[k]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let sum = m[row][n]
    for (let k = row + 1; k < n; k++) sum -= m[row][k] * x[k]
    x[row] = sum / m[row][row]
  }
  return x
}

/** How many times the circuit has been solved since the game loaded. A frame that only draws solves nothing: the frame-budget test reads this. */
export const WORK = { solves: 0 }

/** A pad that nothing reaches still needs a level: this leak to ground gives it one and is far too small to show. */
const LEAK = 1e-9

/**
 * Solve the circuit as it lies. Pops no flag and blows no lamp: `settle` in settle.ts does that.
 *
 * Every pad is a node. So is each end of a part that lies loose, and each
 * clip of a lead: a clip that bites a pad or a part's end is at that node, a
 * clip that bites another lead's clip is at that clip's node, and a clip
 * that bites nothing has a node of its own, which another clip may share.
 */
export function read(circuit: Circuit, spin: Spin = {}): Reading {
  WORK.solves++
  const board = boardFor(circuit)
  const pads = board.pads.length, looseFrom = pads, clipsFrom = pads + 2 * circuit.loose.length
  const n = clipsFrom + 2 * circuit.leads.length
  const clipNode = (lead: number, end: 0 | 1, depth = 0): number => {
    const l = circuit.leads[lead], bite = end === 0 ? l.a : l.b
    if (bite === null) return clipsFrom + 2 * lead + end
    if (isPad(bite)) return bite
    if ('loose' in bite) return looseFrom + 2 * bite.loose + bite.end
    // The clip of another lead. A join is two clips only; anything deeper is read as a clip of its own.
    return depth > 0 || !circuit.leads[bite.lead] ? clipsFrom + 2 * lead + end : clipNode(bite.lead, bite.end, depth + 1)
  }
  const nodeOf = (bite: Bite): number => (isPad(bite) ? bite : 'loose' in bite ? looseFrom + 2 * bite.loose + bite.end : clipNode(bite.lead, bite.end, 1))
  const cracked = new Set(circuit.cracks)
  const wire = (a: number, b: number): Element | null => (a === b ? null : { a, b, g: 1 / RESISTANCE.wire, push: 0 })
  const traces = board.traces.map((t, i) => (cracked.has(i) ? null : wire(t.a, t.b)))
  const leads = circuit.leads.map((_, i) => wire(clipNode(i, 0), clipNode(i, 1)))
  const parts = circuit.parts.map((part, i) => partElement(part, spin[i] ?? 0))
  const loose = circuit.loose.map((body, i) => partElement({ ...body, a: looseFrom + 2 * i, b: looseFrom + 2 * i + 1 } as Part, 0))
  const [p0, p1] = circuit.probe
  const probe: Element | null = p0 === null || p1 === null || nodeOf(p0) === nodeOf(p1) ? null : { a: nodeOf(p0), b: nodeOf(p1), g: 1 / (RESISTANCE.lamp + 2 * RESISTANCE.wire), push: 0 }

  const m: number[][] = []
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n + 1).fill(0)
    row[i] = LEAK
    m.push(row)
  }
  const stamp = (el: Element | null) => {
    if (!el) return
    m[el.a][el.a] += el.g
    m[el.b][el.b] += el.g
    m[el.a][el.b] -= el.g
    m[el.b][el.a] -= el.g
    // A push drives current through the element from a to b: out of node a, into node b.
    m[el.a][n] -= el.push
    m[el.b][n] += el.push
  }
  for (const el of traces) stamp(el)
  for (const el of leads) stamp(el)
  for (const el of parts) stamp(el)
  for (const el of loose) stamp(el)
  stamp(probe)
  const v = eliminate(m)
  const through = (el: Element | null) => (el ? (v[el.a] - v[el.b]) * el.g + el.push : 0)
  return { parts: parts.map(through), traces: traces.map(through), leads: leads.map(through), loose: loose.map(through), probe: through(probe) }
}

/**
 * How hard a blade spun by hand is held back: the current its own push drives
 * through it. With its legs joined to nothing it freewheels (none). With a
 * lamp in its loop it is held back a little, and the lamp glints. With a lead
 * straight across its legs it is held back most and stops short.
 */
export function braking(circuit: Circuit, motor: number, push: number): number {
  return Math.abs(read(circuit, { [motor]: push }).parts[motor])
}

/** How much a lamp, a motor or a buzzer is doing: nothing, a little, as meant, or too much. Never shown as a number. */
export type Level = 0 | 1 | 2 | 3

export function level(current: number): Level {
  const size = Math.abs(current)
  if (size < RUNS_FROM) return 0
  if (size < 0.7) return 1
  if (size < 1.4) return 2
  return 3
}
