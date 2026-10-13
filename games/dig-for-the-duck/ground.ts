import {
  CLAY, CLAY_SLICK, CLAY_WET, COLS, EARTH, EARTH_WET, HOT, HOT_WET, LOOSE, MOSS, MOSS_FULL, MOSS_GROWN, OPEN, ROCK, ROCK_WET, ROOT, ROWS, SAND_COLOURS, SEED, SPROUT, STEAM,
  TIN, TIP_LEFT, TIP_RIGHT, WATER, WET, boxCells, colourOf, inBox, isAir, isClay, isEarth, isFluid, isHot, isLoose, isRock, isSand, isWet, type Box, type Layout,
} from './cells'

// The hill behind the pane, as a grid of cells: how each ground answers the
// finger, how sand crumbles and slides, how water finds its way down, and what
// each ground does when water reaches it. Pure: no canvas, no clock and no
// chance. The same rub on the same hill gives the same hill on every machine.

/** How wide a rub is in sand, moss and seed earth, as a radius in cells, and how far beyond it sand is loosened. */
export const RUB_RADIUS = 4.4
export const LOOSEN = 1.2
/** Clay is stiff: a rub peels only this narrow a groove in dry clay. On wet clay the finger skids: it peels nothing and polishes out to the second radius. */
export const CLAY_RADIUS = 1.7
export const SLICK_RADIUS = 3
/** A thumbprint in clay. */
export const DENT_RADIUS = 2.3
/** One wetted cell of sand or earth in this many drinks the water that wetted it. */
export const SAND_DRINKS_ONE_IN = 12
/** The share of the bath that lifts the duck, and the share that must be water. */
export const FLOATS_FROM = 0.6
export const WATER_FROM = 0.2
/** Once the duck floats, the spring fills the pond only while the hill holds less than this many baths of water. */
export const PLENTY_BATHS = 2.5
/** How far along a level floor water looks for a way down, and steam along a ceiling for a way up. */
const REACH = 48
/** How far drunk moss swells into the open space beside it, in cells. */
export const SWELL = 10
/** Ticks between two steps of a growing root, two drips of a hanging moss, two steps of a drifting cloud and two drops of its rain. */
const ROOT_EVERY = 2
const DRIP_EVERY = 45
const DRIFT_EVERY = 4
const RAIN_EVERY = 5
/** Ticks between two cells of steam from one cell of a hot stone's top that water stands deep on: a stone boils a pool away faster than the spring fills it. */
const BOIL_OFF_EVERY = 4
/** Fewer cells of steam than this in the whole hill are a wisp, which rains as soon as it is over the drying ground. More are a cloud, which carries on along the line. */
export const CLOUD_FROM = 8
/** Over the line, one cell of a cloud in this many lets go as rain at each step of its drift. */
const RAIN_ONE_IN = 20
/** A cloud gathers in these rows of the sky. */
export const CLOUD_TOP = 3
export const CLOUD_BOTTOM = 8

/** What one rub met and did, for the sound and for what flies off. */
export type Dug = {
  /** Cells of dry sand taken away, by colour. */
  dry: number[]
  /** Cells of wet sand taken away: mud. */
  mud: number
  /** Cells loosened at the rim. */
  loosened: number
  tin: boolean
  water: boolean
  /** Dry clay peeled, and wet clay under a finger that skids on it: polished, never peeled. */
  clay: number
  slick: number
  /** Clay left hanging over what the rub took from under it. */
  shelf: number
  /** Rock under the finger, dry and wet: scraped, never dug. */
  rock: number
  rockWet: number
  /** Dry moss torn off, swollen moss squeezed away, and drunk moss pressed. */
  moss: number
  squeezed: number
  mossFull: number
  /** Hot stone under the finger, dry and steaming. */
  hot: number
  hotWet: number
  /** Seed earth crumbled, and seeds that the rub freed from the last of the earth that held them. */
  earth: number
  seeds: number
  /** Root under the finger, and root a hard rub broke off. */
  roots: number
  snapped: number
}

export function nothingDug(): Dug {
  return { dry: new Array(SAND_COLOURS).fill(0), mud: 0, loosened: 0, tin: false, water: false, clay: 0, slick: 0, shelf: 0, rock: 0, rockWet: 0, moss: 0, squeezed: 0, mossFull: 0, hot: 0, hotWet: 0, earth: 0, seeds: 0, roots: 0, snapped: 0 }
}

/** What one tick moved, for the sound and for whoever is watching. */
export type Moved = {
  water: number
  /** Loose grains that slid or fell. */
  grains: number
  /** Cells of sand or earth that turned wet. */
  wetted: number
  /** Cells of water that arrived in the bath. */
  intoBath: number
  /** Water that moved with clay under it, and beside rock. */
  onClay: number
  onRock: number
  /** Moss that drank. */
  drunk: number
  /** Water turned to steam, water boiling against a hot stone in a pool, and cloud turned to rain. */
  steamed: number
  boiling: number
  rained: number
  /** Seeds that put out a root, and seeds that landed. */
  sprouted: number
  seedsLanded: number
  /** Cells of seed earth that fell. */
  earthFell: number
  /** Moss that dripped. */
  dripped: number
  /** A rock or a hot stone that came to rest after falling: where its foot is, and how many cells it is. */
  thud: { hot: boolean; col: number; row: number; cells: number } | null
  /** Where the last of each of these happened this tick, as a cell's index, or -1. */
  clayAt: number
  rockAt: number
  /** The cell of the cloud the last drop of rain fell from, and the cell it fell to. */
  rainAt: number
  rainTo: number
  steamAt: number
  boilAt: number
  dripAt: number
  sproutAt: number
}

export class Ground {
  readonly cells = new Uint8Array(COLS * ROWS)
  /** Cells written since the view last looked: it repaints these and clears them. */
  readonly changed = new Uint8Array(COLS * ROWS)
  /** The rows that hold a changed cell: from `changedFrom` up to but not including `changedTo`. */
  changedFrom = ROWS
  changedTo = 0
  readonly layout: Layout
  /** How many cells hold each code. */
  private readonly tally = new Int32Array(64)
  /** How many cells of each row hold water, and how many hold something that can fall: the rules pass over a row with none. */
  private readonly rowWater = new Int32Array(ROWS)
  private readonly rowLoose = new Int32Array(ROWS)
  private readonly stamp = new Uint16Array(COLS * ROWS)
  private readonly mark = new Uint8Array(COLS * ROWS)
  private readonly body: number[] = []
  private tick = 1
  /** Wettings since the last drink, so that one in twelve drinks whatever the order. */
  private wettings = 0
  private inBath = 0
  private steps = 0
  private readonly falling = [false, false]
  private readonly landed: { col: number; row: number; cells: number }[] = [{ col: 0, row: 0, cells: 0 }, { col: 0, row: 0, cells: 0 }]

  constructor(layout: Layout, cells: Uint8Array) {
    this.layout = layout
    this.cells.set(cells)
    for (let i = 0; i < this.cells.length; i++) {
      const code = this.cells[i], row = (i / COLS) | 0
      this.tally[code]++
      if (code === WATER) this.rowWater[row]++
      if (falls(code)) this.rowLoose[row]++
    }
    this.inBath = this.count(layout.bath, WATER)
    this.touchAll()
  }

  at(col: number, row: number): number {
    return col < 0 || col >= COLS || row < 0 || row >= ROWS ? TIN : this.cells[row * COLS + col]
  }

  /** How many cells hold a code. */
  has(code: number): number {
    return this.tally[code]
  }

  put(index: number, code: number): void {
    const was = this.cells[index]
    if (was === code) return
    this.tally[was]--
    this.tally[code]++
    this.cells[index] = code
    this.changed[index] = 1
    const row = (index / COLS) | 0
    if (was === WATER) this.rowWater[row]--
    else if (falls(was)) this.rowLoose[row]--
    if (code === WATER) this.rowWater[row]++
    else if (falls(code)) this.rowLoose[row]++
    if (row < this.changedFrom) this.changedFrom = row
    if (row + 1 > this.changedTo) this.changedTo = row + 1
  }

  /** Marks every cell as changed: the view paints the whole hill. */
  touchAll(): void {
    this.changed.fill(1)
    this.changedFrom = 0
    this.changedTo = ROWS
  }

  /** The view has painted what changed. */
  seen(): void {
    if (this.changedTo <= this.changedFrom) return
    this.changed.fill(0, this.changedFrom * COLS, this.changedTo * COLS)
    this.changedFrom = ROWS
    this.changedTo = 0
  }

  count(box: Box, code: number): number {
    let n = 0
    for (let row = box.row0; row <= box.row1; row++) for (let col = box.col0; col <= box.col1; col++) if (this.cells[row * COLS + col] === code) n++
    return n
  }

  /** All the water in the hill, in cells. */
  get water(): number {
    return this.tally[WATER]
  }

  /**
   * How full the bath is, 0 to 1: how high its water stands. The water and everything under its surface are
   * counted together, as in any bath. `water` is the share of the bath that is water itself.
   */
  bathState(): { fill: number; water: number; floats: boolean } {
    const { bath } = this.layout, room = boxCells(bath), wide = bath.col1 - bath.col0 + 1
    const water = this.inBath / room
    let under = 0, found = false
    for (let row = bath.row0; row <= bath.row1; row++) {
      let wet = 0, held = 0
      for (let col = bath.col0; col <= bath.col1; col++) {
        const code = this.cells[row * COLS + col]
        if (code === WATER) wet++
        if (!isAir(code)) held++
      }
      // The surface is the first row the water lies across, not a drop on its way down.
      if (!found && wet >= Math.min(3, wide)) found = true
      if (found) under += held
    }
    const fill = under / room
    return { fill, water, floats: fill >= FLOATS_FROM && water >= WATER_FROM }
  }

  get bathFill(): number {
    return this.bathState().fill
  }

  /** The share of a box that is under water, 0 to 1: how wet a room is. */
  flooded(box: Box): number {
    return this.count(box, WATER) / boxCells(box)
  }

  /** How many rows of a room the water lies across: its depth in cells. */
  level(box: Box): number {
    const need = 0.4 * (box.col1 - box.col0 + 1)
    let rows = 0
    for (let row = box.row1; row >= box.row0; row--) {
      let wet = 0
      for (let col = box.col0; col <= box.col1; col++) if (this.cells[row * COLS + col] === WATER) wet++
      if (wet >= need) rows++
    }
    return rows
  }

  /** How high what lies on the bath's floor is piled under some columns, in cells: sand, a stone, a seed. */
  stack(col0: number, col1: number): number {
    const { bath } = this.layout
    let most = 0
    for (let col = col0; col <= col1; col++) {
      let high = 0
      for (let row = bath.row1; row >= bath.row0 && !isFluid(this.cells[row * COLS + col]); row--) high++
      if (high > most) most = high
    }
    return most
  }

  private kept(col: number, row: number): boolean {
    for (const box of this.layout.kept) if (inBox(box, col, row)) return true
    return false
  }

  // --- The finger -----------------------------------------------------------

  /**
   * The finger rubs from one place to another, in cells. Each ground answers in its own way: sand, moss and
   * seed earth go at the finger's width, clay peels in a narrow groove, rock and hot stone are only scraped.
   * A hard rub snaps a root.
   */
  rub(col0: number, row0: number, col1: number, row1: number, hard = false): Dug {
    const dug = nothingDug()
    const steps = Math.max(1, Math.ceil(Math.hypot(col1 - col0, row1 - row0)))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      this.bite(col0 + (col1 - col0) * t, row0 + (row1 - row0) * t, dug, hard)
    }
    return dug
  }

  private bite(col: number, row: number, dug: Dug, hard: boolean): void {
    const reach = RUB_RADIUS + LOOSEN
    const inner = RUB_RADIUS * RUB_RADIUS, outer = reach * reach, narrow = CLAY_RADIUS * CLAY_RADIUS, polish = SLICK_RADIUS * SLICK_RADIUS
    // On wet clay the finger skids: where any of the clay under it is wet, none of it is peeled.
    let skids = false
    for (let r = Math.max(0, Math.floor(row - SLICK_RADIUS)); r <= Math.min(ROWS - 1, Math.ceil(row + SLICK_RADIUS)) && !skids; r++) {
      for (let c = Math.max(0, Math.floor(col - SLICK_RADIUS)); c <= Math.min(COLS - 1, Math.ceil(col + SLICK_RADIUS)); c++) {
        const code = this.cells[r * COLS + c]
        if ((code === CLAY_WET || code === CLAY_SLICK) && (c + 0.5 - col) * (c + 0.5 - col) + (r + 0.5 - row) * (r + 0.5 - row) <= polish) { skids = true; break }
      }
    }
    for (let r = Math.max(0, Math.floor(row - reach)); r <= Math.min(ROWS - 1, Math.ceil(row + reach)); r++) {
      for (let c = Math.max(0, Math.floor(col - reach)); c <= Math.min(COLS - 1, Math.ceil(col + reach)); c++) {
        const d = (c + 0.5 - col) * (c + 0.5 - col) + (r + 0.5 - row) * (r + 0.5 - row)
        if (d > outer) continue
        const index = r * COLS + c, code = this.cells[index]
        if (d > inner) {
          if (isSand(code) && !isLoose(code)) {
            this.put(index, code | LOOSE)
            dug.loosened++
            // Loosened sand under clay is on its way out from under it.
            if (index >= COLS && isClay(this.cells[index - COLS])) dug.shelf++
          }
          continue
        }
        if (isSand(code)) {
          if (isWet(code)) dug.mud++
          else dug.dry[colourOf(code)]++
          this.take(index, dug)
        } else if (code === TIN) dug.tin = true
        else if (code === WATER) dug.water = true
        else if (isClay(code)) {
          if (skids) {
            if (code !== CLAY && d <= polish) {
              if (code === CLAY_WET) this.put(index, CLAY_SLICK)
              dug.slick++
            }
          } else if (d <= narrow) { dug.clay++; this.take(index, dug) }
        } else if (code === ROCK) dug.rock++
        else if (code === ROCK_WET) dug.rockWet++
        else if (code === HOT) dug.hot++
        else if (code === HOT_WET) dug.hotWet++
        else if (code === MOSS) { dug.moss++; this.take(index, dug) }
        else if (code === MOSS_FULL) dug.mossFull++
        else if (code === MOSS_GROWN) {
          // Squeezed: it lets go of the water it holds, one cell in three, and shrinks away.
          dug.squeezed++
          this.put(index, dug.squeezed % 3 === 1 ? WATER : OPEN)
        } else if (isEarth(code)) { dug.earth++; this.take(index, dug); dug.seeds += this.freed(index) }
        else if (code === ROOT || code === TIP_LEFT || code === TIP_RIGHT) {
          dug.roots++
          if (hard) { dug.snapped++; this.put(index, OPEN) }
        }
      }
    }
  }

  /** Takes a cell away, and notes clay left hanging over the gap. */
  private take(index: number, dug: Dug): void {
    this.put(index, OPEN)
    if (index >= COLS && isClay(this.cells[index - COLS])) dug.shelf++
  }

  /** How many seeds beside a cell of seed earth that was just taken away now touch no earth at all: they have popped out. */
  private freed(index: number): number {
    const cells = this.cells, col = index % COLS
    let seeds = 0
    for (const step of [COLS, -COLS, col > 0 ? -1 : 0, col < COLS - 1 ? 1 : 0]) {
      const seed = index + step
      if (step === 0 || seed < 0 || seed >= cells.length || cells[seed] !== SEED) continue
      const at = seed % COLS
      const held = (seed + COLS < cells.length && isEarth(cells[seed + COLS])) || (seed >= COLS && isEarth(cells[seed - COLS])) || (at > 0 && isEarth(cells[seed - 1])) || (at < COLS - 1 && isEarth(cells[seed + 1]))
      if (!held) seeds++
    }
    return seeds
  }

  /** A thumb pressed into clay: a shallow dent of open cells. Returns how many cells it took. */
  dent(col: number, row: number): number {
    let took = 0
    for (let r = Math.max(0, Math.floor(row - DENT_RADIUS)); r <= Math.min(ROWS - 1, Math.ceil(row + DENT_RADIUS)); r++) {
      for (let c = Math.max(0, Math.floor(col - DENT_RADIUS)); c <= Math.min(COLS - 1, Math.ceil(col + DENT_RADIUS)); c++) {
        if ((c + 0.5 - col) * (c + 0.5 - col) + (r + 0.5 - row) * (r + 0.5 - row) > DENT_RADIUS * DENT_RADIUS) continue
        if (isClay(this.cells[r * COLS + c])) { this.put(r * COLS + c, OPEN); took++ }
      }
    }
    return took
  }

  /** Puts water into open cells round a place, nearest first: a cup tipped, a sock wrung. Returns how many cells it put. */
  pour(col: number, row: number, cells: number): number {
    let put = 0
    for (let ring = 0; ring <= 6 && put < cells; ring++) {
      for (let r = row - ring; r <= row + ring && put < cells; r++) {
        for (let c = col - ring; c <= col + ring && put < cells; c++) {
          if (Math.max(Math.abs(r - row), Math.abs(c - col)) !== ring || r < 0 || r >= ROWS || c < 0 || c >= COLS) continue
          if (this.cells[r * COLS + c] === OPEN) { this.put(r * COLS + c, WATER); put++ }
        }
      }
    }
    return put
  }

  /** The plug is held up: water leaves the bath by its floor, lowest first. Returns how many cells went. */
  drain(cells: number): number {
    const { bath, chain } = this.layout
    let gone = 0
    for (let row = bath.row1; row >= bath.row0 && gone < cells; row--) {
      for (let n = 0; n <= bath.col1 - bath.col0 && gone < cells; n++) {
        for (const col of n === 0 ? [chain.col0] : [chain.col0 - n, chain.col0 + n]) {
          if (col < bath.col0 || col > bath.col1 || gone >= cells) continue
          if (this.cells[row * COLS + col] === WATER) { this.put(row * COLS + col, OPEN); gone++ }
        }
      }
    }
    return gone
  }

  // --- A tick ---------------------------------------------------------------

  /** One sixtieth of a second of the hill's own rules. */
  step(): Moved {
    const moved: Moved = { water: 0, grains: 0, wetted: 0, intoBath: 0, onClay: 0, onRock: 0, drunk: 0, steamed: 0, boiling: 0, rained: 0, sprouted: 0, seedsLanded: 0, earthFell: 0, dripped: 0, thud: null, clayAt: -1, rockAt: -1, rainAt: -1, rainTo: -1, steamAt: -1, boilAt: -1, dripAt: -1, sproutAt: -1 }
    this.steps++
    this.slide(moved)
    const t = this.tally
    if (t[ROCK] + t[ROCK_WET] + t[HOT] + t[HOT_WET] > 0) this.stones(moved)
    this.run(moved, false)
    this.run(moved, false)
    if (t[CLAY_SLICK] > 0) this.run(moved, true)
    if (t[STEAM] + t[TIP_LEFT] + t[TIP_RIGHT] + t[MOSS_FULL] > 0) this.tend(moved)
    this.spring()
    const inBath = this.count(this.layout.bath, WATER)
    moved.intoBath = Math.max(0, inBath - this.inBath)
    this.inBath = inBath
    return moved
  }

  private next(): number {
    this.tick = this.tick === 65535 ? 1 : this.tick + 1
    if (this.tick === 1) this.stamp.fill(0)
    return this.tick
  }

  /** Loose sand and seeds fall, sink through water, and slide down a slope steeper than one in one. Seed earth falls straight. */
  private slide(moved: Moved): void {
    const tick = this.next(), cells = this.cells
    for (let row = ROWS - 2; row >= 0; row--) {
      if (this.rowLoose[row] === 0) continue
      const lean = (row + tick) & 1 ? 1 : -1
      for (let k = 0; k < COLS; k++) {
        const col = lean > 0 ? k : COLS - 1 - k
        const index = row * COLS + col, code = cells[index]
        const earth = isEarth(code), seed = code === SEED
        if (!(isLoose(code) || earth || seed) || this.stamp[index] === tick) continue
        const under = index + COLS
        let to = -1
        if (isFluid(cells[under])) to = under
        // Loose sand slides, and so does a seed that lies loose; a seed still in its earth stays there.
        else if (!earth && !(seed && isEarth(cells[under]))) {
          // Under water a pile slumps as it does in air: the grain changes places with the water beside and below it.
          for (let n = 0, side = lean; n < 2 && to < 0; n++, side = -lean) {
            const beside = col + side
            if (beside >= 0 && beside < COLS && isFluid(cells[index + side]) && isFluid(cells[under + side])) to = under + side
          }
        }
        if (to < 0) continue
        const swapped = cells[to]
        this.put(to, swapped !== WATER ? code : earth ? EARTH_WET : seed ? SEED : code | WET)
        this.put(index, swapped)
        this.stamp[to] = tick
        if (earth) moved.earthFell++
        else if (seed) { if (to + COLS >= cells.length || !isFluid(cells[to + COLS])) moved.seedsLanded++ }
        else moved.grains++
      }
    }
  }

  /**
   * Rocks and hot stones: each lump of touching cells is one stone, and it drops whole, a cell a tick, for as
   * long as nothing but space, water or steam lies under all of it.
   */
  private stones(moved: Moved): void {
    const cells = this.cells, mark = this.mark, body = this.body
    mark.fill(0)
    const moving = [false, false]
    for (let start = cells.length - 1; start >= 0; start--) {
      const first = cells[start]
      if (mark[start] || !(isRock(first) || isHot(first))) continue
      const hot = isHot(first), same = hot ? isHot : isRock
      body.length = 0
      body.push(start)
      mark[start] = 1
      let held = false
      for (let i = 0; i < body.length; i++) {
        const index = body[i], col = index % COLS
        if (index + COLS >= cells.length) held = true
        else {
          const below = cells[index + COLS]
          if (!same(below) && !isFluid(below)) held = true
        }
        for (const step of [COLS, -COLS, col < COLS - 1 ? 1 : 0, col > 0 ? -1 : 0]) {
          const beside = index + step
          if (step === 0 || beside < 0 || beside >= cells.length || mark[beside] || !same(cells[beside])) continue
          mark[beside] = 1
          body.push(beside)
        }
      }
      if (held) continue
      // Lowest cells first, so each steps into what the one below it left, and the water under the stone comes out on top of it.
      body.sort((a, b) => b - a)
      let colSum = 0
      for (const index of body) {
        const code = cells[index], under = cells[index + COLS]
        this.put(index + COLS, code)
        this.put(index, under)
        mark[index + COLS] = 1
        colSum += index % COLS
      }
      const which = hot ? 1 : 0, at = this.landed[which]
      moving[which] = true
      at.col = Math.round(colSum / body.length); at.row = ((body[0] / COLS) | 0) + 1; at.cells = body.length
    }
    for (const which of [0, 1]) {
      if (this.falling[which] && !moving[which]) moved.thud = { hot: which === 1, ...this.landed[which] }
      this.falling[which] = moving[which]
    }
  }

  /** Water falls, runs down a slope, and along a level floor toward the nearest way down or away from water on its back. */
  private run(moved: Moved, slickOnly: boolean): void {
    const tick = this.next(), cells = this.cells
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.rowWater[row] === 0) continue
      const lean = (row + tick) & 1 ? 1 : -1
      for (let k = 0; k < COLS; k++) {
        const col = lean > 0 ? k : COLS - 1 - k
        const index = row * COLS + col
        if (cells[index] !== WATER || this.stamp[index] === tick) continue
        // Polished clay is a chute: water on it or beside it gets one more move in the tick.
        if (slickOnly && !(row < ROWS - 1 && cells[index + COLS] === CLAY_SLICK) && !(col > 0 && cells[index - 1] === CLAY_SLICK) && !(col < COLS - 1 && cells[index + 1] === CLAY_SLICK)) continue
        if (!slickOnly && this.touches(index, col, row, moved)) continue
        const under = index + COLS
        let to = -1
        if (row < ROWS - 1 && isAir(cells[under])) to = under
        else {
          const pressed = row > 0 && cells[index - COLS] === WATER
          for (let n = 0, side = lean; n < 2 && to < 0; n++, side = -lean) {
            const beside = col + side
            if (beside < 0 || beside >= COLS || !isAir(cells[index + side])) continue
            if (row < ROWS - 1 && isAir(cells[under + side])) to = under + side
            else if (pressed || this.wayDown(col, row, side)) to = index + side
          }
        }
        if (to < 0) continue
        const was = cells[to]
        this.put(to, WATER)
        this.put(index, was)
        this.stamp[to] = tick
        moved.water++
        if (to + COLS < cells.length) {
          const floor = cells[to + COLS]
          if (isClay(floor)) { moved.onClay++; moved.clayAt = to }
          else if (isRock(floor) || (col > 0 && isRock(cells[to - 1])) || (col < COLS - 1 && isRock(cells[to + 1]))) { moved.onRock++; moved.rockAt = to }
        }
      }
    }
  }

  /** Whether a level run of open cells that way reaches a drop within reach. */
  private wayDown(col: number, row: number, side: number): boolean {
    if (row >= ROWS - 1) return false
    for (let n = 1; n <= REACH; n++) {
      const c = col + side * n
      if (c < 0 || c >= COLS || !isAir(this.cells[row * COLS + c])) return false
      if (isAir(this.cells[(row + 1) * COLS + c])) return true
    }
    return false
  }

  /**
   * What a cell of water does to the ground it touches. Sand and seed earth go dark, two cells deep, so the way
   * the water went can be read afterwards, and one wetting in twelve drinks the water; clay shines; rock
   * glistens; dry moss drinks and swells; a hot stone turns water that lands on it to steam; a seed puts out
   * a root. Returns whether the water is gone.
   */
  private touches(index: number, col: number, row: number, moved: Moved): boolean {
    const cells = this.cells
    // Water with water or space all round it touches nothing: most of a pool is passed over here.
    const down = row < ROWS - 1 ? cells[index + COLS] : TIN, left = col > 0 ? cells[index - 1] : TIN, right = col < COLS - 1 ? cells[index + 1] : TIN, up = row > 0 ? cells[index - COLS] : OPEN
    if (down <= TIN && left <= TIN && right <= TIN && up <= TIN) return false
    this.drank = false
    if (down > TIN && this.touch(index, index + COLS, COLS, row, moved)) return true
    if (left > TIN && this.touch(index, index - 1, -1, row, moved)) return true
    if (right > TIN && this.touch(index, index + 1, 1, row, moved)) return true
    if (up > TIN && this.touch(index, index - COLS, -COLS, row, moved)) return true
    if (this.drank) this.put(index, OPEN)
    return this.drank
  }

  private drank = false

  /** One cell of water against one cell beside it. Returns whether the water is gone already. */
  private touch(index: number, beside: number, step: number, row: number, moved: Moved): boolean {
    const cells = this.cells, code = cells[beside]
    if (code === SEED) { this.sprout(beside, moved); return false }
    if (code === MOSS) { this.swell(beside, -step, moved); return true }
    if (step === -COLS) return false
    if ((isSand(code) && !isWet(code)) || code === EARTH) {
      this.put(beside, code === EARTH ? EARTH_WET : code | WET)
      if (code === EARTH) this.wake(beside, moved)
      const beyond = beside + step, further = beyond >= 0 && beyond < cells.length ? cells[beyond] : OPEN
      // The second cell is in the same row for a step sideways: a step off the end of a row is no neighbour.
      if (step === COLS || ((beyond / COLS) | 0) === row) {
        if (isSand(further) && !isWet(further)) this.put(beyond, further | WET)
        else if (further === EARTH) { this.put(beyond, EARTH_WET); this.wake(beyond, moved) }
      }
      moved.wetted++
      this.wettings++
      if (this.wettings >= SAND_DRINKS_ONE_IN) { this.wettings = 0; this.drank = true }
    } else if (code === CLAY) this.put(beside, CLAY_WET)
    else if (code === ROCK) this.put(beside, ROCK_WET)
    else if (isHot(code)) {
      if (code === HOT) this.put(beside, HOT_WET)
      // Water that lands on the stone goes up as steam at once. Water that stands deep on it boils, and the boil sends a cell
      // of steam up through it every few ticks, so the pool is seen to go down. In the bath it only boils, at any depth, and
      // loses nothing: a bath with a hot stone in it fills as any bath does.
      if (step === COLS && !inBox(this.layout.bath, index % COLS, row) && (!(row > 0 && cells[index - COLS] === WATER) || (this.steps + index * 7) % BOIL_OFF_EVERY === 0)) {
        this.put(index, STEAM)
        moved.steamed++
        moved.steamAt = index
        return true
      }
      moved.boiling++
      moved.boilAt = index
    }
    return false
  }

  /** Wet seed earth wakes the seeds that lie against it. */
  private wake(index: number, moved: Moved): void {
    const col = index % COLS
    for (const step of [COLS, -COLS, col > 0 ? -1 : 0, col < COLS - 1 ? 1 : 0]) {
      const beside = index + step
      if (step !== 0 && beside >= 0 && beside < this.cells.length && this.cells[beside] === SEED) this.sprout(beside, moved)
    }
  }

  /** Dry moss drinks the water that touched it and swells toward where it came from, as far as the space is open. */
  private swell(base: number, toward: number, moved: Moved): void {
    this.put(base, MOSS_FULL)
    const row = (base / COLS) | 0
    for (let n = 1; n <= SWELL; n++) {
      const index = base + toward * n
      if (index < 0 || index >= this.cells.length) break
      if (Math.abs(toward) === 1 && ((index / COLS) | 0) !== row) break
      if (!isFluid(this.cells[index]) || this.kept(index % COLS, (index / COLS) | 0)) break
      this.put(index, MOSS_GROWN)
    }
    moved.drunk++
  }

  /** A wet seed puts out a root: a growing end to each side, where there is space for one. */
  private sprout(index: number, moved: Moved): void {
    const col = index % COLS, row = (index / COLS) | 0
    this.put(index, SPROUT)
    if (col > 0 && isFluid(this.cells[index - 1]) && !this.kept(col - 1, row)) this.put(index - 1, TIP_LEFT)
    if (col < COLS - 1 && isFluid(this.cells[index + 1]) && !this.kept(col + 1, row)) this.put(index + 1, TIP_RIGHT)
    moved.sprouted++
    moved.sproutAt = index
  }

  /** Steam rises, a cloud drifts and rains, a root grows on, and hanging moss drips. */
  private tend(moved: Moved): void {
    const tick = this.next(), cells = this.cells, { surface, wind, rain } = this.layout
    const grows = this.steps % ROOT_EVERY === 0, drifts = this.steps % DRIFT_EVERY === 0
    for (let row = 0; row < ROWS; row++) {
      const lean = (row + tick) & 1 ? 1 : -1
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col, code = cells[index]
        if (code < MOSS_FULL || code > TIP_RIGHT || this.stamp[index] === tick) continue
        if (code === STEAM) {
          const above = row > 0 ? cells[index - COLS] : TIN
          if (row < surface[col] && row <= CLOUD_BOTTOM) {
            // In the cloud. A wisp rains as soon as the wind has it over the drying ground. A cloud carries on along the
            // line and lets its rain go a drop here and a drop there, and the last of it where the line ends or the wind can carry it no further.
            const ahead = col + wind
            const over = col >= rain.col0 && col <= rain.col1
            const last = ahead < 0 || ahead >= COLS || (over && (ahead < rain.col0 || ahead > rain.col1))
            if (last || (over && this.tally[STEAM] < CLOUD_FROM)) {
              if ((this.steps + col * 7 + row * 3) % RAIN_EVERY === 0) this.rain(index, moved)
            } else if (over && drifts && (((Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(this.steps, 0x85ebca6b)) >>> 16) % RAIN_ONE_IN) === 0) this.rain(index, moved)
            else if (row > CLOUD_TOP && above === OPEN) this.move(index, index - COLS, tick)
            else if (drifts && cells[index + wind] === OPEN) this.move(index, index + wind, tick)
            continue
          }
          if (above === OPEN || above === WATER) { this.move(index, index - COLS, tick); continue }
          // Under a roof it goes sideways toward a way up, through open space and through water alike.
          for (const side of [lean, -lean]) {
            const beside = col + side
            if (beside < 0 || beside >= COLS || (cells[index + side] !== OPEN && cells[index + side] !== WATER)) continue
            if (row > 0 && (isFluid(cells[index - COLS + side]) || this.wayUp(col, row, side))) { this.move(index, index + side, tick); break }
          }
        } else if (code === TIP_LEFT || code === TIP_RIGHT) {
          if (!grows) continue
          const side = code === TIP_LEFT ? -1 : 1, ahead = col + side
          this.put(index, ROOT)
          if (ahead >= 0 && ahead < COLS && isFluid(cells[index + side]) && !this.kept(ahead, row)) { this.put(index + side, code); this.stamp[index + side] = tick }
        } else if (code === MOSS_FULL) {
          // Drunk moss with nothing under it hangs as a beard and lets its water go, a drop at a time.
          // The drop lets go a cell clear of the moss, or the moss would drink it straight back.
          if (row < ROWS - 2 && cells[index + COLS] === OPEN && cells[index + 2 * COLS] === OPEN && (this.steps + index * 7) % DRIP_EVERY === 0) {
            this.put(index + 2 * COLS, WATER)
            this.put(index, MOSS)
            moved.dripped++
            moved.dripAt = index
          }
        }
      }
    }
  }

  /**
   * A cell of cloud lets go as a drop of rain, which falls straight down. Sand and seed earth soak it up and go dark, two
   * cells deep, so rain never stands on them: a cloud is water that leaves the hill, and the spring makes it up. On
   * anything else the drop lands as water, and the hill's own rules carry it on.
   */
  private rain(index: number, moved: Moved): void {
    const cells = this.cells
    let under = index + COLS
    while (under < cells.length && isAir(cells[under])) under += COLS
    const land = under - COLS
    this.put(index, OPEN)
    moved.rained++
    moved.rainAt = index
    moved.rainTo = land
    if (under >= cells.length) return
    const code = cells[under]
    if (isSand(code) || isEarth(code)) {
      for (const soaked of [under, under + COLS]) {
        const was = soaked < cells.length ? cells[soaked] : TIN
        if (isSand(was) && !isWet(was)) this.put(soaked, was | WET)
        else if (was === EARTH) { this.put(soaked, EARTH_WET); this.wake(soaked, moved) }
      }
      return
    }
    // Steam that lay where the drop lands goes up to where the drop came from.
    if (cells[land] === STEAM && land !== index) this.put(index, STEAM)
    this.put(land, WATER)
  }

  private move(from: number, to: number, tick: number): void {
    const was = this.cells[to]
    this.put(to, this.cells[from])
    this.put(from, was)
    this.stamp[to] = tick
  }

  /** Whether a level run of open cells or water that way reaches a way up within reach. */
  private wayUp(col: number, row: number, side: number): boolean {
    for (let n = 1; n <= REACH; n++) {
      const c = col + side * n
      if (c < 0 || c >= COLS || (this.cells[row * COLS + c] !== OPEN && this.cells[row * COLS + c] !== WATER)) return false
      if (isFluid(this.cells[(row - 1) * COLS + c])) return true
    }
    return false
  }

  // --- The spring -----------------------------------------------------------

  /** The spring at the pond's edge: two cells of water a tick, a running stream, for as long as it runs (`springing`). */
  private spring(): void {
    if (!this.springing) return
    for (const index of this.springCells()) if (this.cells[index] === OPEN) this.put(index, WATER)
  }

  /** The two cells the spring runs into: the bowl's edge on the side away from the wind, at the brim. */
  springCells(): [number, number] {
    const { pond, wind } = this.layout
    const col = pond.col - wind * (pond.half - 1)
    return [pond.brim * COLS + col, pond.brim * COLS + col + wind]
  }

  /** How many columns the wind has carried the cloud since the hill was laid or loaded. */
  get drifted(): number {
    return Math.floor(this.steps / DRIFT_EVERY)
  }

  /**
   * Whether the spring is running now: the pond's bowl has room, and the duck does not yet float or the hill has less than
   * plenty. Until the duck floats there is always more water, so no pit a child digs can hold all there will ever be.
   */
  get springing(): boolean {
    if (this.water >= PLENTY_BATHS * boxCells(this.layout.bath) && this.bathState().floats) return false
    const { pond } = this.layout
    for (let row = pond.brim; row < pond.brim + pond.depth; row++) {
      for (let col = pond.col - pond.half; col <= pond.col + pond.half; col++) if (inBowl(pond, col, row) && this.cells[row * COLS + col] === OPEN) return true
    }
    return false
  }
}

export function inBowl(pond: Layout['pond'], col: number, row: number): boolean {
  const x = (col - pond.col) / pond.half, y = (row - pond.brim + 0.5) / pond.depth
  return row >= pond.brim && x * x + y * y <= 1
}

/** What can fall by itself: loose sand, seed earth and a seed. */
function falls(code: number): boolean {
  return isLoose(code) || isEarth(code) || code === SEED
}
