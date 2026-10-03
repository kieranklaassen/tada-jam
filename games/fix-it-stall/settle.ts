import { type Circuit, type Part } from './circuit'
import { BLOW, CUTOUT, read, type Reading, type Spin } from './solve'

// What the world does after any change: it is solved, a cell that gives too
// much pops its flag, a lamp that carries too much blows, and it is solved
// again until nothing more gives way. These are the errors as consequences:
// each says where, because it happens to the very part that was misused.

export type Consequence =
  /** A cell's cutout flag popped. `hot` is the way the current took: the traces, leads and parts that carried most of it. */
  | { type: 'pop'; part: number; hot: { traces: number[]; leads: number[]; parts: number[] } }
  /** A lamp blew. It is now a gap, and it rattles. */
  | { type: 'blow'; part: number }

export type Settled = { circuit: Circuit; reading: Reading; consequences: Consequence[] }

const over = (reading: Reading, share: number) => {
  const list = (currents: number[]) => currents.flatMap((c, i) => (Math.abs(c) >= share ? [i] : []))
  return { traces: list(reading.traces), leads: list(reading.leads), parts: list(reading.parts) }
}

/**
 * Solve, let whatever must give way give way, and solve again. A flag pops
 * before a lamp can blow, as a cutout is the quicker of the two. The loop is
 * bounded by the number of parts: each pass takes at least one part out.
 */
export function settle(circuit: Circuit, spin: Spin = {}): Settled {
  const consequences: Consequence[] = []
  let now = circuit
  for (let pass = 0; pass <= circuit.parts.length; pass++) {
    const reading = read(now, spin)
    const popping = now.parts.flatMap((part, i) => (part.kind === 'cell' && !part.popped && Math.abs(reading.parts[i]) > CUTOUT ? [i] : []))
    if (popping.length > 0) {
      for (const i of popping) consequences.push({ type: 'pop', part: i, hot: over(reading, Math.abs(reading.parts[i]) / 2) })
      now = { ...now, parts: now.parts.map((part, i): Part => (part.kind === 'cell' && popping.includes(i) ? { ...part, popped: true } : part)) }
      continue
    }
    const blowing = now.parts.flatMap((part, i) => (part.kind === 'lamp' && !part.blown && Math.abs(reading.parts[i]) >= BLOW ? [i] : []))
    if (blowing.length > 0) {
      for (const i of blowing) consequences.push({ type: 'blow', part: i })
      now = { ...now, parts: now.parts.map((part, i): Part => (part.kind === 'lamp' && blowing.includes(i) ? { ...part, blown: true } : part)) }
      continue
    }
    return { circuit: now, reading, consequences }
  }
  return { circuit: now, reading: read(now, spin), consequences }
}
