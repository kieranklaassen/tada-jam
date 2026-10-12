import { cellOnBiscuit } from './benches'
import type { Stall } from './places'
import { GRID, LEFT, type Biscuit, type Thing } from './things'
import type { Sound } from './voices'

// A thing used at another stall: the twelve cells of the grid's first table
// that are not a stall's own craft. Each either changes the thing, which then
// goes back where it came from (dipped in wax, wrapped in paper, a stencil, a
// ring cutter), or sticks the thing onto the piece in work (a candle behind
// the star, a star on the ring, a candle in a biscuit). Pure: no clock.

export type Use = {
  /** What was done, for the view: the thing is dipped, wrapped, pressed on the dough, or set on the piece. */
  kind: 'dip' | 'wrap' | 'stencil' | 'ring' | 'set'
  /** The things that go back to where the used thing came from, the used thing first when it does not stay. */
  back: Thing[]
  /** The cell's two sounds: one as it happens, one a moment after, on the game's clock. */
  first: Sound
  then: Sound
  /** How many times the second sound comes: a run of plips, a patter of ticks. */
  times: number
  /** A third sound that closes the cell, where the grid names three. */
  last?: Sound
}

const s = (name: Sound['name']): Sound => ({ name } as Sound)

/**
 * The icing cells a star laid on the dough keeps bare: the round of its points, as a ring of eight cells round
 * the middle one, which the hole in the star's middle lets the icing through to. On the coarse grid the print
 * is a bare ring with a dot in it, on a biscuit of any tin.
 */
const STENCIL: readonly [number, number][] = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]]

function stencil(biscuit: Biscuit): void {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (!cellOnBiscuit(biscuit.tin, row, col)) continue
      const shadowed = STENCIL.some(([r, c]) => r === row && c === col)
      if (shadowed) biscuit.icing[row] &= ~(1 << col)
      else biscuit.icing[row] |= 1 << col
    }
  }
}

/** Sets a thing on the piece in work. What was on the piece before, and what the thing itself carried, come off. */
function set(piece: Thing, thing: Thing): Thing[] {
  const back: Thing[] = []
  if (thing.on) { back.push(thing.on); thing.on = null }
  if (piece.on) back.push(piece.on)
  piece.on = thing
  return back
}

/**
 * Uses `thing` at `stall`, on that stall's piece in work. `tint` is the colour the stall has out: the wax in the
 * pot, the paper on the pile. Both things are changed in place.
 */
export function use(stall: Stall, thing: Thing, piece: Thing, tint: number): Use {
  switch (stall) {
    case 'candle':
      // Dipped: a wax coat over the whole thing, whatever is on it.
      thing.left = LEFT.wax
      thing.tint = tint
      if (thing.craft === 'star') return { kind: 'dip', back: [thing], first: s('crackle'), then: s('plipHigh'), times: 3 }
      if (thing.craft === 'wreath') return { kind: 'dip', back: [thing], first: s('hiss'), then: s('tick'), times: 4 }
      return { kind: 'dip', back: [thing], first: s('glub'), then: s('plop'), times: 1 }
    case 'star':
      // A candle behind the star makes it a lantern; a wreath frames it; a biscuit is wrapped in its paper.
      if (thing.craft === 'candle') return { kind: 'set', back: set(piece, thing), first: { name: 'chime', colour: piece.craft === 'star' ? piece.colour : 0 }, then: s('fwip'), times: 0 }
      if (thing.craft === 'wreath') return { kind: 'set', back: set(piece, thing), first: s('hookCreak'), then: s('glassTap'), times: 1 }
      thing.left = LEFT.wrap
      thing.tint = tint
      // A crinkle, a crinkle and a tucked tp.
      return { kind: 'wrap', back: [thing], first: s('crinkle'), then: s('crinkle'), times: 1, last: s('tp') }
    case 'wreath':
      // Pushed into the ring, tied to its top, or tied on as an ornament.
      if (thing.craft === 'candle') return { kind: 'set', back: set(piece, thing), first: s('needles'), then: s('thock'), times: 1 }
      if (thing.craft === 'star') return { kind: 'set', back: set(piece, thing), first: s('zip'), then: s('paperFlutter'), times: 1 }
      return { kind: 'set', back: set(piece, thing), first: s('zip'), then: s('clack'), times: 1 }
    case 'biscuit': {
      const biscuit = piece as Biscuit
      // Whatever is done with the dough cuts a biscuit from it first, with the tin that is out.
      biscuit.cut = true
      // Stuck in: a cake. Laid on as a stencil. Pressed in: a ring biscuit.
      if (thing.craft === 'candle') return { kind: 'set', back: set(piece, thing), first: s('snap'), then: s('fwip'), times: 1 }
      if (thing.craft === 'star') {
        stencil(biscuit)
        // Two soft pats and a squeak of icing.
        return { kind: 'stencil', back: [thing], first: s('pat'), then: s('pat'), times: 1, last: s('squeak') }
      }
      biscuit.left = LEFT.ring
      return { kind: 'ring', back: [thing], first: s('squelch'), then: s('tick'), times: 4 }
    }
  }
}

/** How many things a use sends back besides the used thing itself: each needs a place in the basket. */
export function comesOff(stall: Stall, thing: Thing, piece: Thing): number {
  const sets = (stall === 'star' && thing.craft !== 'biscuit') || stall === 'wreath' || (stall === 'biscuit' && thing.craft === 'candle')
  return sets ? (thing.on ? 1 : 0) + (piece.on ? 1 : 0) : 0
}
