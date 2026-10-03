import { type Bench } from './bench'
import { handBack } from './handback'
import { HELD, HELD_AT_WINDOW, HUNG, lidBox, OWNER, padAt, probeGrip, type Box, type P } from './stage'

// What an idle child is shown: the things that can be touched now, and one
// move the hand could make. The move is never a mend. Before the gadget is
// open it is the touch that opens it; while it lies open it is the stall's
// one tool, the test lamp, taken to the cell; once the gadget runs it is the
// hand-back; and when the cycle is over it is the customer who waits.

export type Hint = { glow: P[]; from: P; to: P; drag: boolean }

const mid = (box: Box): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

/** The one obvious want of the scene, as a place: what the hand goes to first. */
export function suggest(bench: Bench): Hint {
  const stall = bench.stall
  if (stall.onMat === 'sign') {
    // The sign is the child's own: nothing is wanted of it. The way back is where the gadget hangs.
    const at = mid(HUNG)
    return { glow: [at], from: at, to: at, drag: false }
  }
  if (stall.finished) {
    const at = mid(HELD_AT_WINDOW)
    return { glow: [at], from: at, to: at, drag: false }
  }
  if (!stall.job.open) {
    const at = mid(HELD)
    return { glow: [at], from: at, to: at, drag: false }
  }
  const circuit = bench.live
  if (handBack(circuit).ran) {
    // It runs on the mat: it can go back to its owner, by its lid.
    const from = mid(lidBox(circuit)), to = { x: OWNER.x + OWNER.w / 2, y: 150 }
    return { glow: [from, to], from, to, drag: true }
  }
  // It does not run. The test lamp is shown going to the cell: one clip, one place it could go. Never a mend.
  const cell = circuit.parts.find((part) => part.kind === 'cell')
  const free: 0 | 1 = circuit.probe[0] === null ? 0 : 1
  if (cell && circuit.probe[free] === null) {
    const from = probeGrip(circuit, free), to = padAt(circuit, free === 0 ? cell.b : cell.a)
    return { glow: [probeGrip(circuit, 0), probeGrip(circuit, 1)], from, to, drag: true }
  }
  // Both its clips are on: one of them can be taken somewhere else.
  const from = probeGrip(circuit, 0)
  return { glow: [from, probeGrip(circuit, 1)], from, to: from, drag: false }
}
