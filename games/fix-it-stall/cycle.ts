import { type Circuit } from './circuit'
import { handBack, type Handed } from './handback'
import { layOut } from './jobs'
import { type Stall } from './save'
import { settle, type Consequence } from './settle'
import { beginCycle, finishCycle, type CycleOutcome } from './state'
import { reaction, type Reaction } from './tastes'

// One cycle is one customer: the gadget comes onto the mat, is opened, mended
// and handed back. This module is the few moves that are not the circuit's:
// opening the gadget, changing a board, handing back, and calling the next
// customer. Each returns a new stall and never reads a clock.
//
// How a cycle is judged, as the design sheet has it:
//   well    it ran the first time it was handed back
//   mixed   it ran, on a later hand-back
//   badly   the child called the next customer while it had not run
// The ticket and the tastes never enter the judgement.

/** The board that lies on the mat. */
export function boardOnMat(stall: Stall): Circuit {
  return stall.onMat === 'sign' ? stall.sign : stall.job.circuit
}

/** The child touches the gadget its owner holds out: it comes onto the mat and its lid opens. */
export function openGadget(stall: Stall): Stall {
  if (stall.finished || stall.job.open) return stall
  return { ...stall, job: { ...stall.job, open: true }, onMat: 'job' }
}

/** The child touches the sign, or the gadget again: the other board comes onto the mat. Nothing else changes. */
export function swapBoards(stall: Stall): Stall {
  return { ...stall, onMat: stall.onMat === 'sign' ? 'job' : 'sign' }
}

/**
 * Change the board on the mat with one of the finger's acts (circuit.ts), and
 * let the world answer: it is solved, and whatever must give way gives way.
 * A gadget that has been handed back and ran is its owner's again and is not
 * changed; the sign always can be.
 */
export function change(stall: Stall, act: (circuit: Circuit) => Circuit): { stall: Stall; consequences: Consequence[] } {
  const onSign = stall.onMat === 'sign'
  if (!onSign && (stall.finished || !stall.job.open)) return { stall, consequences: [] }
  const before = boardOnMat(stall)
  const after = act(before)
  if (after === before) return { stall, consequences: [] }
  const settled = settle(after)
  return { stall: onSign ? { ...stall, sign: settled.circuit } : { ...stall, job: { ...stall.job, circuit: settled.circuit } }, consequences: settled.consequences }
}

export type HandOver = {
  stall: Stall
  handed: Handed
  reaction: Reaction
  /** Set when the gadget ran and the cycle ended with this hand-back. */
  outcome: CycleOutcome | null
  /** The id of the idea whose neat way the old hand now shows, once, or null. */
  neatWay: string | null
}

/**
 * The child hands the gadget to its owner, who switches it on. If it runs,
 * the cycle ends here: the outcome is fixed, the position moves, and the
 * stall is ready to be saved at once, before the scene plays. If it does not,
 * the owner lays it back on the mat with the lid open and the cycle goes on.
 */
export function handOver(stall: Stall): HandOver | null {
  if (stall.finished || !stall.job.open || stall.onMat !== 'job') return null
  const handed = handBack(stall.job.circuit)
  const taken = reaction(stall.job.who, handed)
  if (!handed.ran) return { stall: { ...stall, job: { ...stall.job, missed: true } }, handed, reaction: taken, outcome: null, neatWay: null }
  const outcome: CycleOutcome = stall.job.missed ? 'mixed' : 'well'
  const idea = stall.job.idea
  const neatWay = stall.shown.includes(idea) ? null : idea
  const judged = finishCycle(stall, outcome)
  return {
    // Her practice board stands mended from the moment the scene starts until the next cycle does.
    stall: { ...stall, ...judged, job: { ...stall.job, open: false }, shown: neatWay ? [...stall.shown, neatWay] : stall.shown, board: neatWay },
    handed, reaction: taken, outcome, neatWay,
  }
}

/**
 * The child touches the customer who waits at the window. If the cycle on
 * screen has ended, its owner walks off with the gadget running. If it has
 * not, the owner shrugs and takes the gadget as it is, and that cycle went
 * badly. Either way the one at the window comes to the bench and a new one
 * steps up, laid out from the position as it now stands: so a position that
 * has just moved first shows in the customer after next.
 */
export function callNext(stall: Stall): { stall: Stall; sentAway: boolean } {
  const sentAway = !stall.finished
  const judged = sentAway ? finishCycle(stall, 'badly') : stall
  const laid = layOut(judged.position, stall.stream, stall.next.who)
  const begun = beginCycle(judged)
  return { stall: { ...stall, ...begun, stream: laid.stream, job: stall.next, next: laid.job, onMat: 'job', board: null }, sentAway }
}
