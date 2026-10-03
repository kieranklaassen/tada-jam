import { boardOf, type GadgetKind } from './board'
import { emptyCircuit, trayPart, type Circuit, type Part, type PartKind } from './circuit'

// Each gadget as it left its maker, whole and running: the parts it came with
// and where they sit. A job is one of these with something broken in it
// (jobs.ts). Current leaves the cell's cap, runs along the top rail, down
// through the rungs and back along the bottom rail, so a motor stands with
// its `a` on the top pad of its rung and turns forward.

export type Load = Extract<PartKind, 'lamp' | 'motor' | 'buzzer'>
export const LOADS: readonly Load[] = ['lamp', 'motor', 'buzzer']

/** What stands on each rung, left to right. The last rung holds the gadget's main part. */
const RUNGS: Record<GadgetKind, readonly (Load | null)[]> = {
  'lamp-plain': [null, null, 'lamp'],
  'fan-plain': [null, null, 'motor'],
  'bell-plain': [null, null, 'buzzer'],
  lamp: [null, null, 'lamp'],
  fan: [null, null, 'motor'],
  bell: [null, null, 'buzzer'],
  car: [null, 'lamp', 'motor'],
  robot: ['lamp', 'buzzer', 'motor'],
  sign: ['lamp', 'lamp', 'lamp', 'lamp', 'lamp', 'motor', 'buzzer'],
}

/** A plain gadget has copper where the others have a switch. */
export function hasSwitch(kind: GadgetKind): boolean {
  return !kind.endsWith('-plain')
}

/** The gadget whole and switched on. */
export function asBuilt(kind: GadgetKind): Circuit {
  const board = boardOf(kind)
  const parts: Part[] = board.cellSockets.map(([base, cap]) => trayPart('cell', base, cap))
  if (hasSwitch(kind)) parts.push({ kind: 'switch', a: board.switchSocket[0], b: board.switchSocket[1], down: true })
  RUNGS[kind].forEach((load, rung) => {
    if (load) parts.push(trayPart(load, board.rungs[rung][0], board.rungs[rung][1]))
  })
  return { ...emptyCircuit(kind), parts, leads: [{ a: board.linkSocket[0], b: board.linkSocket[1] }] }
}

/** How many lamps, motors and buzzers the gadget came with. A mend has made it run when at least as many of each run again. */
export function cameWith(kind: GadgetKind): Record<Load, number> {
  const count = { lamp: 0, motor: 0, buzzer: 0 }
  for (const load of RUNGS[kind]) if (load) count[load]++
  return count
}
