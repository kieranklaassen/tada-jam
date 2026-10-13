import { BOARD, RING, STAR } from './places'
import { GRID, POINTS, RING_PLACES, type Biscuit, type Star, type Thing, type Wreath } from './things'

// The handwork of the three benches that are not the wax pot: folding a
// point of the star, binding a twig on the ring, cutting the dough and piping
// icing on it. Each answers the finger where it lands and as it moves, and
// changes the piece in work at once. Pure numbers on the seconds it is
// stepped by; what it sounds like is the fair's to say (fair.ts).

export type BenchEvent =
  /** The finger landed on the piece: it gives, and nothing is made yet. */
  | { type: 'touch' }
  /** A point was folded: the crease, and the fft of it pressed flat a moment after. */
  | { type: 'fold' }
  /** The star has no point left to fold: the paper only flutters. */
  | { type: 'paper' }
  /** A twig was bound on, or one that is there was brushed. */
  | { type: 'bind' }
  | { type: 'brush' }
  /** The tin came down on the dough. */
  | { type: 'cut' }
  /** One more cell of icing was piped, or icing that is there was patted. */
  | { type: 'pipe' }
  | { type: 'pat' }

type Spring = { x: number; v: number }

/** How far from where it landed a finger may lift and still have tapped. */
export const TAP_REACH = 40

/** Seconds between two icing squeaks, so a fast stroke is a row of squeaks and not one noise. */
const SQUEAK_GAP = 0.07

export class Bench {
  /** The piece gives under the finger and springs back: 0 at rest. */
  readonly give: Spring = { x: 0, v: 0 }
  /** And swings on its hook or rocks on its board, in radians. */
  readonly sway: Spring = { x: 0, v: 0 }
  /** Which point, twig or cell was made last, and how long ago: the view pops it into place. */
  readonly made = { index: -1, age: 9 }
  readonly events: BenchEvent[] = []
  private sinceSqueak = 9
  /** Where the finger landed, until its touch has made something by moving or is over. */
  private start: { x: number; y: number } | null = null

  /**
   * The finger lands on the piece: it gives under the finger, and nothing is made yet. The work comes from the
   * move that makes it: a tap (`lift`), or a rub along the ring or across the biscuit (`move`). So a finger that
   * lands on a piece makes nothing of it by landing; what a pull makes on its way off the piece stays on it.
   */
  touch(x: number, y: number): void {
    this.give.v += 5
    this.start = { x, y }
    this.events.push({ type: 'touch' })
  }

  /** The finger moves on the piece: round the ring it binds twig after twig, over the biscuit it pipes a line. Returns whether the piece changed. */
  move(piece: Thing, x: number, y: number): boolean {
    if (piece.craft === 'wreath') {
      const place = ringPlace(x, y)
      if (place < 0) return false
      const from = this.start
      if (!from) return this.bind(piece, x, y, false)
      // A rub begins when the finger has gone from one place on the ring to the next: both take a twig.
      const first = ringPlace(from.x, from.y)
      if (first < 0) { this.start = { x, y }; return false }
      if (first === place) return false
      this.start = null
      const began = this.bind(piece, from.x, from.y, true)
      return this.bind(piece, x, y, false) || began
    }
    if (piece.craft === 'biscuit' && piece.cut) {
      const cell = icingCell(piece, x, y)
      if (!cell) return false
      const from = this.start
      if (!from) return this.ice(piece, x, y, false)
      // A line begins when the finger has gone from one cell to the next.
      const first = icingCell(piece, from.x, from.y)
      if (!first) { this.start = { x, y }; return false }
      if (first.row === cell.row && first.col === cell.col) return false
      this.start = null
      const began = this.ice(piece, from.x, from.y, true)
      return this.ice(piece, x, y, false) || began
    }
    return false
  }

  /**
   * The finger lifts from the piece. A touch that made nothing by moving was a tap, and `acts` says whether the
   * child lifted (and not the browser), at (x, y): a point is folded, a twig bound where the finger landed, the dough cut,
   * a dot of icing piped. Returns whether the piece changed.
   */
  lift(piece: Thing, acts: boolean, x = this.start?.x ?? 0, y = this.start?.y ?? 0): boolean {
    const from = this.start
    this.start = null
    // A finger that lifts somewhere else did not tap: it wandered off, or tried to pull an unmade piece away.
    if (!from || !acts || Math.hypot(x - from.x, y - from.y) > TAP_REACH) return false
    switch (piece.craft) {
      case 'star':
        return this.fold(piece)
      case 'wreath':
        return this.bind(piece, from.x, from.y, true)
      case 'biscuit':
        return this.ice(piece, from.x, from.y, true)
      case 'candle':
        return false
    }
  }

  private fold(star: Star): boolean {
    if (star.points >= POINTS[star.size]) {
      this.sway.v += 3
      this.events.push({ type: 'paper' })
      return false
    }
    this.made.index = star.points
    this.made.age = 0
    star.points += 1
    this.events.push({ type: 'fold' })
    return true
  }

  private bind(wreath: Wreath, x: number, y: number, pressed: boolean): boolean {
    const place = ringPlace(x, y)
    if (place < 0) {
      // Inside the ring or beyond it: the ring only swings.
      if (pressed) this.sway.v += x >= RING.x ? -2.4 : 2.4
      return false
    }
    if (wreath.twigs[place]) {
      if (pressed) { this.sway.v += 1.2; this.events.push({ type: 'brush' }) }
      return false
    }
    wreath.twigs[place] = 1
    this.made.index = place
    this.made.age = 0
    this.sway.v += x >= RING.x ? -0.8 : 0.8
    this.events.push({ type: 'bind' })
    return true
  }

  private ice(biscuit: Biscuit, x: number, y: number, pressed: boolean): boolean {
    if (!biscuit.cut) {
      // The simplest use works: a finger on the dough cuts it with the tin that is out.
      if (!pressed) return false
      biscuit.cut = true
      this.events.push({ type: 'cut' })
      return true
    }
    const cell = icingCell(biscuit, x, y)
    if (!cell) return false
    if (biscuit.icing[cell.row] & (1 << cell.col)) {
      if (pressed) this.events.push({ type: 'pat' })
      return false
    }
    biscuit.icing[cell.row] |= 1 << cell.col
    this.made.index = cell.row * GRID + cell.col
    this.made.age = 0
    if (pressed || this.sinceSqueak >= SQUEAK_GAP) {
      this.sinceSqueak = 0
      this.events.push({ type: 'pipe' })
    }
    return true
  }

  /** Something was pushed onto the piece or pulled off it: it rocks. */
  knock(strength: number): void {
    this.give.v += strength
    this.sway.v += strength * 0.4
  }

  step(dt: number): void {
    if (dt <= 0) return
    this.give.v += (-this.give.x * 260 - this.give.v * 14) * dt
    this.give.x += this.give.v * dt
    this.sway.v += (-this.sway.x * 30 - this.sway.v * 2.6) * dt
    this.sway.x += this.sway.v * dt
    this.made.age += dt
    this.sinceSqueak += dt
  }

  /** As a load finds it: still, with nothing popping into place. */
  settle(): void {
    this.give.x = 0; this.give.v = 0
    this.sway.x = 0; this.sway.v = 0
    this.made.index = -1; this.made.age = 9
    this.sinceSqueak = 9
    this.start = null
    this.events.length = 0
  }
}

/** Which of the twelve places round the ring a point is at, counted clockwise from the top, or -1 off the band. */
export function ringPlace(x: number, y: number): number {
  const dx = x - RING.x, dy = y - RING.y
  if (Math.abs(Math.hypot(dx, dy) - RING.r) > RING.band) return -1
  const turn = Math.atan2(dx, -dy) / (Math.PI * 2)
  return ((Math.round(turn * RING_PLACES) % RING_PLACES) + RING_PLACES) % RING_PLACES
}

/** Where on the ring a place is. */
export function ringPoint(place: number, r: number = RING.r): { x: number; y: number } {
  const a = (place / RING_PLACES) * Math.PI * 2
  return { x: RING.x + Math.sin(a) * r, y: RING.y - Math.cos(a) * r }
}

/** The middle of an icing cell, measured from the middle of the biscuit. */
export function cellOffset(row: number, col: number): { x: number; y: number } {
  return { x: (col - (GRID - 1) / 2) * BOARD.cell, y: (row - (GRID - 1) / 2) * BOARD.cell }
}

/** Whether a cell lies on a biscuit cut with this tin. */
export function cellOnBiscuit(tin: number, row: number, col: number): boolean {
  const at = cellOffset(row, col)
  return Math.hypot(at.x, at.y) <= BOARD.r[tin] - 10
}

/** The icing cell under a point, if it lies on the biscuit. */
export function icingCell(biscuit: Biscuit, x: number, y: number): { row: number; col: number } | null {
  const col = Math.floor((x - BOARD.x) / BOARD.cell + GRID / 2), row = Math.floor((y - BOARD.y) / BOARD.cell + GRID / 2)
  if (col < 0 || col >= GRID || row < 0 || row >= GRID || !cellOnBiscuit(biscuit.tin, row, col)) return null
  return { row, col }
}

/** Whether a point is on the piece itself, where a finger works on it. */
export function onPiece(piece: Thing, x: number, y: number): boolean {
  switch (piece.craft) {
    case 'star':
      return Math.hypot(x - STAR.x, y - STAR.y) <= STAR.r[piece.size] + 22
    case 'wreath':
      return Math.hypot(x - RING.x, y - RING.y) <= RING.r + RING.band
    case 'biscuit':
      return Math.hypot(x - BOARD.x, y - BOARD.y) <= BOARD.dough
    case 'candle':
      return false
  }
}

/** How far from its middle a finger must pull a piece before it comes off its bench and is carried. */
export function pullOff(piece: Thing): { x: number; y: number; r: number } {
  switch (piece.craft) {
    case 'star':
      return { x: STAR.x, y: STAR.y, r: STAR.r[piece.size] + 70 }
    case 'wreath':
      return { x: RING.x, y: RING.y, r: RING.r + RING.band + 50 }
    default:
      return { x: BOARD.x, y: BOARD.y, r: BOARD.dough + 46 }
  }
}
