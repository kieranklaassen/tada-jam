import { boardOf } from './board'
import { crackTrace, type Circuit, type Part } from './circuit'
import { asBuilt } from './gadgets'

// The stall's own sign: the harder thing the child may always pick, and the
// free place to build. It hangs at the back of the stall, broken in several
// ways from the first day, belongs to no customer, is never handed back and
// never judged, and it moves no position. Whatever the child makes of it
// stays and keeps running.

/** The sign as it hangs on the first day: the top rail cracked half way along, the second lamp blown, the lowest cell flat. */
export function firstDaySign(): Circuit {
  const board = boardOf('sign')
  const crack = board.traces.findIndex((t) => board.pads[t.a].y === 0 && board.pads[t.b].y === 0 && Math.min(board.pads[t.a].x, board.pads[t.b].x) === 6)
  const cracked = crackTrace(asBuilt('sign'), crack)
  let lamps = 0, cells = 0
  return {
    ...cracked,
    parts: cracked.parts.map((part): Part => {
      if (part.kind === 'lamp' && lamps++ === 1) return { ...part, blown: true }
      if (part.kind === 'cell' && cells++ === 0) return { ...part, flat: true }
      return part
    }),
  }
}
