import { HELD, PAPER, PEGS, POOL, POT, TOOL, lineY, type ToolId } from './layout'
import type { InHand } from './save'

// What the ghost hand shows an idle child: one move that can be made now,
// chosen from what is on the table, and never a picture to copy: the hand
// leaves no colour behind. One next act is offered at a time, and they take
// turns: on plain water a touch on the water; once there is colour, the
// corner of paper first, so the way to a print is shown at the next pause,
// then a pull through the colour, a dip in the next pot, and the newest tool
// (taken up, or used when it is in the hand). A print in the cat's paws over
// plain water is shown going up to the line.
// The turns do not start again at the paper after every touch: `Turns` keeps
// how many the hand has shown since the water was last plain, which is since
// the last print, and a new stillness goes on from there. So a child who
// touches between showings is shown the pull, the pot and the tool as well.

export type Move = { kind: 'tap'; x: number; y: number } | { kind: 'pull'; x: number; y: number; toX: number; toY: number }

/** What the hand's choice goes by. */
export type Table = { inked: boolean; pot: number; tool: InHand; tools: readonly ToolId[]; held: boolean; free: number }

const MID = { x: POOL.x + POOL.w * 0.56, y: POOL.y + POOL.h * 0.56 }
const middle = (r: { x: number; y: number; w: number; h: number }): { x: number; y: number } => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** The move for the `index`th showing of an idle stretch. */
export function moveFor(index: number, table: Table): Move {
  const onWater: Move = { kind: 'tap', x: MID.x, y: MID.y }
  const across: Move = { kind: 'pull', x: MID.x - 130, y: MID.y + 40, toX: MID.x + 120, toY: MID.y - 50 }
  if (!table.inked) {
    // Plain water waits. A print in the paws goes up to the line every other time.
    if (table.held && table.free >= 0 && index % 2 === 1) {
      const from = middle(HELD), peg = PEGS[table.free]
      return { kind: 'pull', x: from.x, y: from.y, toX: peg.x, toY: lineY(peg.x) + 40 }
    }
    return onWater
  }
  const newest = table.tools[table.tools.length - 1]
  const turn = index % 4
  if (turn === 0) return { kind: 'tap', ...middle(PAPER) }
  if (turn === 1) return table.tool === 'straw' || table.tool === 'soap' ? onWater : across
  if (turn === 2) return { kind: 'tap', x: POT.x, y: POT.ys[(table.pot + 1) % POT.ys.length] }
  if (newest) {
    if (table.tool !== newest) return { kind: 'tap', ...middle(TOOL[newest]) }
    return newest === 'comb' ? across : onWater
  }
  return across
}

/**
 * Which turn the hand and the glow are on. It is asked once a frame with what the idle ladder shows: the showing
 * that plays (`demoIndex`, or -1 between showings) and whether the glow is lit. While a showing plays the turn is
 * that showing's; between two showings it stays on the one last shown; when a stillness begins it is the next one
 * not yet shown. Over plain water the count begins again.
 */
export class Turns {
  /** The turns shown in stillnesses that have ended, and in this one. */
  private before = 0
  private now = 0

  turn(demoIndex: number, glowing: boolean, inked: boolean): number {
    if (demoIndex >= 0) this.now = demoIndex + 1
    else if (!glowing && this.now > 0) {
      // The stillness is over: a touch took the ladder back, or it went quiet.
      this.before += this.now
      this.now = 0
    }
    if (!inked) this.before = 0
    return this.before + Math.max(0, this.now - 1)
  }
}
