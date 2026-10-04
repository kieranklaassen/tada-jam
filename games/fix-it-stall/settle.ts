import { type Circuit, type Loose, type Part } from './circuit'
import { BLOW, CUTOUT, read, type Reading, type Spin } from './solve'

// What the world does after any change: it is solved, a cell that gives too
// much pops its flag, a lamp that carries too much blows, and it is solved
// again until nothing more gives way. These are the errors as consequences:
// each says where, because it happens to the very part that was misused.

export type Consequence =
  /**
   * A cell's cutout flag popped. `hot` is the way the current took: the traces, leads and parts that carried most
   * of it, seated on the board (`parts`) or lying loose and held by their leads (`loose`). `onMat` marks a cell that lies loose on the mat, held only by its leads; `part` is then its place in `loose`.
   */
  | { type: 'pop'; part: number; hot: { traces: number[]; leads: number[]; parts: number[]; loose: number[] }; onMat?: true }
  /** A lamp blew. It is now a gap, and it rattles. */
  | { type: 'blow'; part: number; onMat?: true }

export type Settled = { circuit: Circuit; reading: Reading; consequences: Consequence[] }

/**
 * A way that carried this share of a short's current or more is part of the way it took. A lamp, a motor or a buzzer
 * beside a short carries a few thousandths of it; sixteen leads side by side, the most there can be, carry a sixteenth
 * each. So every lead of a short glows however many share it, and nothing that is a load does.
 */
const HOT_SHARE = 0.02

const over = (reading: Reading, share: number) => {
  const list = (currents: number[]) => currents.flatMap((c, i) => (Math.abs(c) >= share ? [i] : []))
  return { traces: list(reading.traces), leads: list(reading.leads), parts: list(reading.parts), loose: list(reading.loose) }
}

/**
 * Solve, let whatever must give way give way, and solve again. A flag pops
 * before a lamp can blow, as a cutout is the quicker of the two. A part that
 * lies loose on the mat and is held by its leads gives way like any other.
 * The loop is bounded by the number of parts: each pass takes at least one out.
 */
export function settle(circuit: Circuit, spin: Spin = {}): Settled {
  const consequences: Consequence[] = []
  let now = circuit
  for (let pass = 0; pass <= circuit.parts.length + circuit.loose.length; pass++) {
    const reading = read(now, spin)
    const popping = now.parts.flatMap((part, i) => (part.kind === 'cell' && !part.popped && Math.abs(reading.parts[i]) > CUTOUT ? [i] : []))
    const poppingLoose = now.loose.flatMap((part, i) => (part.kind === 'cell' && !part.popped && Math.abs(reading.loose[i]) > CUTOUT ? [i] : []))
    if (popping.length + poppingLoose.length > 0) {
      for (const i of popping) consequences.push({ type: 'pop', part: i, hot: over(reading, Math.abs(reading.parts[i]) * HOT_SHARE) })
      for (const i of poppingLoose) consequences.push({ type: 'pop', part: i, hot: over(reading, Math.abs(reading.loose[i]) * HOT_SHARE), onMat: true })
      now = {
        ...now,
        parts: now.parts.map((part, i): Part => (part.kind === 'cell' && popping.includes(i) ? { ...part, popped: true } : part)),
        loose: now.loose.map((part, i): Loose => (part.kind === 'cell' && poppingLoose.includes(i) ? { ...part, popped: true } : part)),
      }
      continue
    }
    const blowing = now.parts.flatMap((part, i) => (part.kind === 'lamp' && !part.blown && Math.abs(reading.parts[i]) >= BLOW ? [i] : []))
    const blowingLoose = now.loose.flatMap((part, i) => (part.kind === 'lamp' && !part.blown && Math.abs(reading.loose[i]) >= BLOW ? [i] : []))
    if (blowing.length + blowingLoose.length > 0) {
      for (const i of blowing) consequences.push({ type: 'blow', part: i })
      for (const i of blowingLoose) consequences.push({ type: 'blow', part: i, onMat: true })
      now = {
        ...now,
        parts: now.parts.map((part, i): Part => (part.kind === 'lamp' && blowing.includes(i) ? { ...part, blown: true } : part)),
        loose: now.loose.map((part, i): Loose => (part.kind === 'lamp' && blowingLoose.includes(i) ? { ...part, blown: true } : part)),
      }
      continue
    }
    return { circuit: now, reading, consequences }
  }
  return { circuit: now, reading: read(now, spin), consequences }
}
