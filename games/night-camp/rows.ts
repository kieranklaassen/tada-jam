import { SUPPLY_LANES } from './board'
import type { RowFrame } from './frame'
import { GURGLE, SLOSH, TUMBLE, clink, clunk, logHome, logOut, type Note } from './voices'
import { ROD_LENGTH, type Supply } from './world'

// The rows on the rods, as they move: the toy of the game (ART.md, "The
// toy"). How many pieces a row is set to is decided elsewhere (the saved camp,
// through its limits); this module is how the row gets there and how it
// feels on the way: logs run a piece at a time, each with its note; oil
// follows the finger as a stiff band; water lags and sloshes; a row let go
// settles in a wave; what does not fit tumbles into a heap and hops home.
//
// Pure, on game time alone. It queues its sounds through `say`.

/** How fast a row runs out to a mark or home again, in pieces a second, at the least. A long run goes faster, so it is over in a rattle. */
const RUN_PER_SECOND = 45
const RUN_SECONDS = 0.35
/** A piece's voice begun a little late, and a little softer when several pieces pass in one step, so that a fast run is a rattle and not a bang. */
const late = (notes: Note[], delay: number, together = 1): Note[] => (delay <= 0 && together <= 1 ? notes : notes.map((note) => ({ ...note, delay: note.delay + delay, peak: Math.max(0.01, note.peak / Math.sqrt(together)) })))
export const MOST_FLYING = 12
export const MOST_HEAP = 8
const HEAP_LINGERS = 1.1
const FLIGHT_SECONDS = 0.26
const TAP_SECONDS = 0.5

type Row = {
  target: number; shown: number; velocity: number
  held: boolean; following: boolean; finger: number
  popAge: number; waveAge: number; rattle: number
  flying: { from: number; t: number }[]
  heap: number; heapWanted: number; heapAge: number
  tapped: number; tapAge: number
  sinceGurgle: number; sinceTumble: number; pace: number
}

const makeRow = (count: number): Row => ({
  target: count, shown: count, velocity: 0, held: false, following: false, finger: count, popAge: 9, waveAge: 9, rattle: 0,
  flying: [], heap: 0, heapWanted: 0, heapAge: 9, tapped: -1, tapAge: 9, sinceGurgle: 9, sinceTumble: 9, pace: RUN_PER_SECOND,
})

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
/** A piece popping out: from nothing, a little over, and settled. */
const pop = (age: number) => (age >= 0.4 ? 1 : 1 - Math.exp(-age * 16) * Math.cos(age * 30))

export class Rows {
  private readonly rows: Record<Supply, Row>

  constructor(counts: Record<Supply, number>) {
    this.rows = { logs: makeRow(counts.logs), oil: makeRow(counts.oil), water: makeRow(counts.water) }
  }

  /** The rows lie whole at these counts, at once: a site just laid out, or a save just read. Nothing eases in and nothing sounds. */
  lay(counts: Record<Supply, number>): void {
    for (const supply of SUPPLY_LANES) this.rows[supply] = makeRow(counts[supply])
  }

  /** The count a row is set to. It runs there a piece at a time. */
  set(supply: Supply, count: number): void {
    const row = this.rows[supply]
    if (count === row.target) return
    row.target = count
    row.pace = Math.max(RUN_PER_SECOND, Math.abs(count - row.shown) / RUN_SECONDS)
  }

  target(supply: Supply): number { return this.rows[supply].target }
  shown(supply: Supply): number { return this.rows[supply].shown }
  /** The largest heap lying past the end of any rod. */
  heap(): number { return Math.max(...SUPPLY_LANES.map((supply) => this.rows[supply].heap)) }

  /** The finger has taken hold of a row. While `following`, a poured band goes with the finger between its marks. */
  hold(supply: Supply, finger: number, following: boolean): void {
    const row = this.rows[supply]
    row.held = true; row.following = following; row.finger = finger
  }
  finger(supply: Supply, units: number, following: boolean): void {
    const row = this.rows[supply]
    row.finger = units; row.following = following
  }
  /** The finger let go: the row settles in a wave, and what lies in a heap lies a moment more. Returns whether there is a row to settle. */
  release(supply: Supply): boolean {
    const row = this.rows[supply]
    row.held = false; row.following = false; row.heapWanted = 0; row.heapAge = 0
    if (row.target > 0) row.waveAge = 0
    return row.target > 0
  }
  /** So many pieces do not fit and tumble past the end of what holds them. */
  wantHeap(supply: Supply, pieces: number): void { this.rows[supply].heapWanted = clamp(Math.ceil(pieces), 0, MOST_HEAP) }
  rattle(supply: Supply): void { this.rows[supply].rattle = 1 }
  /** One piece of a row answers a tap by itself. */
  tap(supply: Supply, index: number): void { const row = this.rows[supply]; row.tapped = index; row.tapAge = 0 }

  step(dt: number, say: (notes: readonly Note[]) => void): void {
    for (const supply of SUPPLY_LANES) {
      const row = this.rows[supply], before = row.shown
      row.popAge += dt; row.waveAge += dt; row.tapAge += dt; row.heapAge += dt; row.sinceGurgle += dt; row.sinceTumble += dt
      row.rattle = Math.max(0, row.rattle - dt * 3.2)
      if (row.tapAge > TAP_SECONDS) row.tapped = -1
      for (const piece of row.flying) piece.t += dt / FLIGHT_SECONDS
      row.flying = row.flying.filter((piece) => piece.t < 1)

      if (supply === 'logs') {
        const gap = row.target - row.shown
        if (gap !== 0) row.shown = gap > 0 ? Math.min(row.target, row.shown + row.pace * dt) : Math.max(row.target, row.shown - row.pace * dt)
      } else {
        // Oil and water pour: one band that goes with the finger while it is followed and to its whole mark when let go.
        const goal = row.held && row.following ? clamp(row.finger, 0, Math.max(row.target, Math.min(ROD_LENGTH[supply], row.target + 0.49))) : row.target
        const stiff = supply === 'oil' ? 260 : 70, damp = supply === 'oil' ? 30 : 9
        row.velocity += ((goal - row.shown) * stiff - row.velocity * damp) * dt
        row.shown = clamp(row.shown + row.velocity * dt, 0, ROD_LENGTH[supply])
        if (!row.held && Math.abs(goal - row.shown) < 0.004 && Math.abs(row.velocity) < 0.02) { row.shown = goal; row.velocity = 0 }
        if (Math.abs(row.velocity) > (supply === 'oil' ? 1.2 : 0.6) && row.sinceGurgle > (supply === 'oil' ? 0.09 : 0.28)) { row.sinceGurgle = 0; say(supply === 'oil' ? GURGLE : SLOSH) }
      }

      // Every whole mark the row's end passes is heard, going out and coming home.
      const was = Math.floor(before + 1e-9), is = Math.floor(row.shown + 1e-9)
      if (is > was) {
        row.popAge = 0
        // Every piece is heard, however fast the row runs: those that come out in one step follow one another inside it.
        for (let k = was + 1; k <= is; k++) say(late(supply === 'logs' ? logOut(k) : supply === 'oil' ? clink(k) : clunk(k), ((k - was - 1) / (is - was)) * dt, is - was))
      } else if (is < was) {
        if (supply === 'logs') for (let k = was; k > is && row.flying.length < MOST_FLYING; k--) row.flying.push({ from: k, t: 0 })
        for (let k = was; k > is; k--) say(late(supply === 'logs' ? logHome(k) : supply === 'oil' ? clink(k) : clunk(k), ((was - k) / (was - is)) * dt, was - is))
      }

      const wanted = row.held ? row.heapWanted : row.heapAge < HEAP_LINGERS ? row.heap : 0
      if (wanted > row.heap) {
        const next = Math.min(wanted, row.heap + dt * 30)
        if (Math.ceil(next) > Math.ceil(row.heap) && row.sinceTumble >= 0.07) { row.sinceTumble = 0; say(TUMBLE) }
        row.heap = next
      } else if (wanted < row.heap) {
        const next = Math.max(wanted, row.heap - dt * 14)
        if (Math.ceil(next) < Math.ceil(row.heap) && row.flying.length < MOST_FLYING) row.flying.push({ from: ROD_LENGTH[supply] + 1, t: 0 })
        row.heap = next
      }
    }
  }

  write(into: Record<Supply, RowFrame>): void {
    for (const supply of SUPPLY_LANES) {
      const row = this.rows[supply], frame = into[supply], most = ROD_LENGTH[supply]
      frame.length = row.shown
      frame.pop = supply === 'logs' ? pop(row.popAge) : 1
      const span = Math.max(1, row.shown), runs = supply === 'logs' ? 0.42 : 0.5
      frame.wave = row.waveAge < runs ? 1 - row.waveAge / runs : 0
      frame.waveAt = span * (1 - row.waveAge / runs)
      frame.rattle = row.rattle
      frame.slosh = supply === 'logs' ? 0 : clamp(row.velocity / (most * 0.6), -1, 1)
      frame.flying = row.flying
      frame.heap = row.heap
      frame.held = row.held
      frame.tapped = row.tapped
      frame.tap = row.tapped >= 0 ? clamp(row.tapAge / TAP_SECONDS, 0, 1) : 0
    }
  }
}
