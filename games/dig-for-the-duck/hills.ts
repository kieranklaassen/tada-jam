import { CLAY, COLS, EARTH, HOT, MOSS, OPEN, ROCK, ROWS, SEED, TIN, WATER, WET, isSand, sand, type Box, type GroundKind, type Layout } from './cells'
import { CLOUD_BOTTOM, inBowl } from './ground'

// The hills, laid by hand. Each id of the designed order (config.ts) has three
// layouts. A layout is one of three frames, which say where the pond, the
// bath, the residents' rooms and the drying ground lie, and the grounds its
// id puts between the pond and the bath. Whatever a hill holds beyond sand
// also lies once beside the resident who shows it. Pure: the same id and
// variant always give the same hill.

export const VARIANTS = 3

/** The sizes every hill shares, in cells. */
export const MOLE_ROOM = { cols: 39, rows: 32 }
export const WORM_ROOM = { cols: 41, rows: 26 }
export const HALL = { cols: 8, rows: 7 }
export const BATH = { cols: 33, rows: 12 }
export const SEAT_COLS = 21
export const CHAIN_COLS = 5
const CHAMBER_TOP = 91
const POND = { brim: 26, half: 24, depth: 10 }
const DRYING = { cols: 63, row: 24 }
/** The column the badger's head is in, counted from the end of the drying ground she stands at. */
const HEAD_COL = 10

/** Where the big things of a hill lie. The mole lives on the pond's side of the way down and the worm on the other. */
type Frame = {
  pond: number; drying: number; mole: [number, number]; worm: [number, number]; bath: number
  /** The duck sits at the left end of the bath and the chain hangs at the right, or the other way round. The chain is always on the pond's side. */
  duckLeft: boolean
  /** The column a standing stone stands in, clear of the rooms and the chamber. */
  stone: number
  pin: number
}

const FRAMES: readonly Frame[] = [
  { pond: 58, drying: 116, mole: [6, 46], worm: [137, 58], bath: 76, duckLeft: false, stone: 127, pin: 12 },
  { pond: 126, drying: 0, mole: [137, 47], worm: [8, 56], bath: 70, duckLeft: true, stone: 121, pin: 78 },
  { pond: 40, drying: 116, mole: [8, 52], worm: [137, 44], bath: 70, duckLeft: false, stone: 121, pin: 76 },
]
/** The wind blows from the pond toward the badger's line on every hill, so a cloud that rises over the way down is carried to the washing. */
const windOf = (frame: Frame): 1 | -1 => (frame.drying > frame.pond ? 1 : -1)

/** The colours of the bands from the top down, turning. */
const BANDS = [0, 1, 2, 4, 3, 1, 0, 2, 3, 4]

/** A hill being laid: the cells, and the helpers the layouts paint with. */
class Laying {
  readonly cells = new Uint8Array(COLS * ROWS)
  readonly surface = new Int16Array(COLS)
  readonly spots: Layout['spots'] = {}
  readonly frame: Frame
  readonly moleRoom: Box
  readonly wormRoom: Box
  readonly hall: Box
  readonly bath: Box
  readonly chamber: Box
  readonly seat: { col0: number; col1: number }
  readonly chain: { col0: number; col1: number }
  private carved = false

  constructor(frame: Frame, shift: number) {
    this.frame = frame
    const [mc, mr] = frame.mole, [wc, wr] = frame.worm
    this.moleRoom = { col0: mc, row0: mr, col1: mc + MOLE_ROOM.cols - 1, row1: mr + MOLE_ROOM.rows - 1 }
    this.wormRoom = { col0: wc, row0: wr, col1: wc + WORM_ROOM.cols - 1, row1: wr + WORM_ROOM.rows - 1 }
    this.hall = { col0: this.moleRoom.col1 + 1, row0: this.moleRoom.row1 - HALL.rows + 1, col1: this.moleRoom.col1 + HALL.cols, row1: this.moleRoom.row1 }
    this.bath = { col0: frame.bath, row0: ROWS - BATH.rows, col1: frame.bath + BATH.cols - 1, row1: ROWS - 1 }
    this.chamber = { col0: this.bath.col0 - 12, row0: CHAMBER_TOP, col1: this.bath.col1 + 12, row1: this.bath.row0 - 1 }
    for (let col = 0; col < COLS; col++) {
      let top = Math.round(25 + 2.4 * Math.sin((col + shift) / 15) + 1.4 * Math.sin((col + shift) / 6 + 1))
      // Level ground round the pond and under the badger's line.
      if (Math.abs(col - frame.pond) <= POND.half + 4) top = POND.brim
      // The level ground runs on past the line's end the wind comes from, where the badger stands and her hot stone lies.
      const from = windOf(frame) > 0 ? frame.drying - 8 : frame.drying, to = windOf(frame) > 0 ? frame.drying + DRYING.cols : frame.drying + DRYING.cols + 8
      if (col >= from && col < to) top = DRYING.row
      this.surface[col] = top
      for (let row = top; row < ROWS; row++) {
        const wave = 3.2 * Math.sin((col + shift) / 21 + 0.6) + 1.6 * Math.sin((col + shift) / 8 + 2) + 5 * Math.sin((col + row + shift) / 61)
        const band = Math.floor((row - 24 + wave + 40) / 8)
        this.cells[row * COLS + col] = sand(BANDS[band % BANDS.length])
      }
    }
    const { bath, chamber, moleRoom, wormRoom, hall } = this
    this.room(moleRoom, 7)
    this.room(wormRoom, 6)
    this.room(chamber, 9)
    this.box(hall.col0, hall.row0, hall.col1, hall.row1, OPEN)
    for (let row = bath.row0; row <= bath.row1; row++) {
      this.set(bath.col0 - 1, row, TIN)
      this.set(bath.col1 + 1, row, TIN)
      for (let col = bath.col0; col <= bath.col1; col++) this.set(col, row, OPEN)
    }
    this.seat = frame.duckLeft ? { col0: bath.col0, col1: bath.col0 + SEAT_COLS - 1 } : { col0: bath.col1 - SEAT_COLS + 1, col1: bath.col1 }
    this.chain = frame.duckLeft ? { col0: bath.col1 - CHAIN_COLS + 1, col1: bath.col1 } : { col0: bath.col0, col1: bath.col0 + CHAIN_COLS - 1 }
    this.carved = true
  }

  /** Whether a cell is part of a room, the doorway, the chamber or the bath: a ground is never laid there. */
  private roomy(col: number, row: number): boolean {
    const { bath, chamber, moleRoom, wormRoom, hall } = this
    if (col >= bath.col0 - 1 && col <= bath.col1 + 1 && row >= bath.row0) return true
    for (const box of [chamber, moleRoom, wormRoom, hall]) if (col >= box.col0 && col <= box.col1 && row >= box.row0 && row <= box.row1 && this.cells[row * COLS + col] === OPEN) return true
    return false
  }

  /** A point of the short way: 0 under the pond, 1 at the chamber's roof over the gap between the duck and the chain. `off` is cells to the side. */
  way(t: number, off = 0): { col: number; row: number } {
    const top = POND.brim + POND.depth + 1, to = this.frame.duckLeft ? (this.seat.col1 + this.chain.col0) / 2 : (this.chain.col1 + this.seat.col0) / 2
    return { col: Math.round(this.frame.pond + (to - this.frame.pond) * t + off), row: Math.round(top + (CHAMBER_TOP - 2 - top) * t) }
  }

  set(col: number, row: number, code: number): void {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
    if (this.carved && code !== OPEN && this.roomy(col, row)) return
    this.cells[row * COLS + col] = code
  }

  /** Lays a cell where a room was carved: the lip of the clay under the table, the seed in the doorway. */
  inRoom(col: number, row: number, code: number): void {
    this.cells[row * COLS + col] = code
  }

  box(col0: number, row0: number, col1: number, row1: number, code: number): void {
    for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) this.set(col, row, code)
  }

  /** A lump: an ellipse of one ground round a middle, `rx` by `ry` cells. */
  lump(col: number, row: number, rx: number, ry: number, code: number): void {
    for (let r = Math.floor(row - ry); r <= Math.ceil(row + ry); r++) {
      for (let c = Math.floor(col - rx); c <= Math.ceil(col + rx); c++) {
        const x = (c - col) / rx, y = (r - row) / ry
        // A little squarer than an ellipse, so a lump has no single cell standing out at its four ends.
        if (Math.abs(x * x * x) + Math.abs(y * y * y) <= 0.9) this.set(c, r, code)
      }
    }
  }

  /** A room: open space with an arched roof and a flat floor. */
  room(box: Box, arch: number): void {
    const mid = (box.col0 + box.col1) / 2, half = (box.col1 - box.col0) / 2
    for (let col = box.col0; col <= box.col1; col++) {
      const x = (col - mid) / half
      const top = box.row0 + Math.round(arch * x * x * x * x)
      for (let row = top; row <= box.row1; row++) this.set(col, row, OPEN)
    }
  }

  // --- The grounds, as the layouts put them ---------------------------------

  /** A clay shelf across the way: water stands on it until a groove is peeled through it or a way is dug round its end. */
  shelf(t: number, off: number, half: number): void {
    const at = this.way(t, off)
    this.box(at.col - half, at.row, at.col + half, at.row + 3, CLAY)
  }

  /** A boulder that rests on sand and can be dropped. */
  boulder(t: number, off: number, rx: number, ry: number): void {
    const at = this.way(t, off)
    this.lump(at.col, at.row, rx, ry, ROCK)
  }

  /** A standing stone: rock from its rounded top down to the bottom of the case, so nothing can be dug from under it. */
  standing(top: number, half: number): void {
    const col = this.frame.stone
    this.lump(col, top + half, half, half, ROCK)
    this.box(col - half, top + half, col + half, ROWS - 1, ROCK)
  }

  /** Moss on both sides of a stretch of the way, a tunnel's width apart: a chain of cushions down each side, the two sides out of step. */
  mossy(t0: number, t1: number, off: number): void {
    const from = this.way(t0, off), to = this.way(t1, off)
    for (const side of [-1, 1]) {
      for (let row = from.row + (side < 0 ? 1 : 3); row <= to.row; row += 4) {
        const col = Math.round(from.col + ((to.col - from.col) * (row - from.row)) / Math.max(1, to.row - from.row))
        this.lump(col + side * 9, row, 2.6, (row >> 2) % 2 ? 2.6 : 2, MOSS)
      }
    }
  }

  /** A hot stone lying in the sand. */
  hot(t: number, off: number, rx = 4.5, ry = 2.6): void {
    const at = this.way(t, off)
    this.lump(at.col, at.row, rx, ry, HOT)
  }

  /** A stone over the gap between the duck and the chain: dug out from under, it drops into the bath beside the duck. */
  overBay(row: number, rx: number, ry: number, code: number): void {
    this.lump(this.way(1).col, row, rx, ry, code)
  }

  /** A pit on the way with seed earth at both lips and a seed in each, facing the pit: a root can floor it over. */
  pit(t: number, off: number, deep: number): void {
    const at = this.way(t, off)
    this.box(at.col - 5, at.row, at.col + 5, at.row + deep, OPEN)
    for (const side of [-1, 1]) {
      this.box(at.col + side * 6 + (side < 0 ? -7 : 0), at.row, at.col + side * 6 + (side < 0 ? 0 : 7), at.row + 4, EARTH)
      this.set(at.col + side * 6, at.row, SEED)
      this.set(at.col + side * 9, at.row + 2, SEED)
    }
  }

  // --- Each ground once more, beside the resident who shows it --------------

  /** Clay as the floor under the mole's table, with a lip, so his tea stands on it. */
  showClay(): void {
    const { col0, row1 } = this.moleRoom
    this.box(col0 - 2, row1 + 1, col0 + 8, row1 + 3, CLAY)
    this.box(col0 - 2, row1 - 2, col0 - 1, row1, CLAY)
    this.inRoom(col0 + 8, row1, CLAY)
    this.spots.clay = { col: col0 + 3, row: row1 }
  }

  /** A rock in the wall of the worm's room, on the side the way runs. */
  showRock(): void {
    const { col0, row1 } = this.wormRoom
    this.lump(col0 - 3, row1 - 4, 2.6, 4, ROCK)
    this.spots.rock = { col: col0 - 1, row: row1 - 4 }
  }

  /** Moss in the roof of the worm's room, over the one bare stretch of it. */
  showMoss(): void {
    const { col0, row0 } = this.wormRoom
    let under = row0
    while (this.cells[under * COLS + col0 + 9] !== OPEN) under++
    this.box(col0 + 7, under - 3, col0 + 10, under - 1, MOSS)
    for (let col = col0 + 7; col <= col0 + 10; col++) for (let row = under; this.cells[row * COLS + col] !== OPEN && row < under + 3; row++) this.set(col, row, MOSS)
    this.spots.moss = { col: col0 + 9, row: under + 1 }
  }

  /** A hot stone at the edge of the drying ground beside the badger, at the end of the line the wind comes from: a rounded stone that stands half out of the ground, as the stones in the hill lie. */
  showHot(): void {
    const col = windOf(this.frame) > 0 ? this.frame.drying - 4 : this.frame.drying + DRYING.cols + 3
    this.lump(col, DRYING.row, 3.6, 2.6, HOT)
    // Where it stands, the ground's top is the stone's.
    for (let c = col - 4; c <= col + 4; c++) while (this.surface[c] > 0 && this.cells[(this.surface[c] - 1) * COLS + c] === HOT) this.surface[c]--
    this.spots.hot = { col, row: DRYING.row - 4 }
  }

  /** Seed earth under the mole's doorway and a seed on it. */
  showEarth(): void {
    const { col0, col1, row1 } = this.hall
    this.box(col0 + 2, row1 + 1, col1 + 1, row1 + 3, EARTH)
    this.inRoom(col1 - 1, row1, SEED)
    this.spots.earth = { col: col1 - 1, row: row1 }
  }

  /** Fills the pond and gives the hill back. */
  done(): Hill {
    const { frame, bath, chamber, moleRoom, wormRoom, hall, seat, chain } = this
    const pond = { col: frame.pond, ...POND }
    this.carved = false
    for (let row = pond.brim; row < pond.brim + pond.depth; row++) for (let col = pond.col - pond.half; col <= pond.col + pond.half; col++) if (inBowl(pond, col, row)) this.set(col, row, WATER)
    // The pond has stood a long time: the sand of its bowl is dark already, two cells deep.
    for (let row = pond.brim; row < pond.brim + pond.depth; row++) {
      for (let col = pond.col - pond.half; col <= pond.col + pond.half; col++) {
        if (this.cells[row * COLS + col] !== WATER) continue
        for (const [dc, dr] of [[0, 1], [-1, 0], [1, 0]]) for (const far of [1, 2]) {
          const index = (row + dr * far) * COLS + col + dc * far, code = this.cells[index]
          if (isSand(code)) this.cells[index] = code | WET
        }
      }
    }
    const layout: Layout = {
      surface: this.surface, pond, bath, chamber, moleRoom, wormRoom,
      drying: { col0: frame.drying, col1: frame.drying + DRYING.cols - 1, row: DRYING.row },
      seat, chain, wind: windOf(frame),
      // A cloud lets its rain go from over the badger's head to the far post of her line.
      rain: windOf(frame) > 0 ? { col0: frame.drying + HEAD_COL, col1: frame.drying + DRYING.cols - 4 } : { col0: frame.drying + 3, col1: frame.drying + DRYING.cols - 1 - HEAD_COL },
      kept: [
        moleRoom,
        // The worm's room: the row of boots, the worm's own column, the umbrella and the shelf.
        { col0: wormRoom.col0, row0: wormRoom.row1 - 10, col1: wormRoom.col1, row1: wormRoom.row1 },
        { col0: wormRoom.col0 + 13, row0: wormRoom.row0, col1: wormRoom.col1, row1: wormRoom.row1 },
        { col0: wormRoom.col0, row0: wormRoom.row0, col1: wormRoom.col0 + 6, row1: wormRoom.row1 },
        // The duck and the plug's chain, from the chamber's roof to the bath's floor.
        { col0: seat.col0, row0: chamber.row0, col1: seat.col1, row1: bath.row1 },
        { col0: chain.col0, row0: chamber.row0, col1: chain.col1, row1: bath.row1 },
      ],
      spots: this.spots,
    }
    return { layout, cells: this.cells, hall, pin: frame.pin }
  }
}

export type Hill = { layout: Layout; cells: Uint8Array; /** The mole's doorway. */ hall: Box; /** The column the pinwheel stands in. */ pin: number }

/** What each id's three layouts put between the pond and the bath. The frame is the layout's number. */
const LAY: Record<string, ((h: Laying) => void)[]> = {
  dune: [() => {}, () => {}, () => {}],
  claypit: [
    (h) => { h.shelf(0.42, 0, 22); h.showClay() },
    (h) => { h.shelf(0.55, 6, 18); h.showClay() },
    (h) => { h.shelf(0.3, 12, 14); h.shelf(0.68, 8, 14); h.showClay() },
  ],
  scree: [
    (h) => { h.boulder(0.4, -2, 7, 5); h.standing(66, 3); h.showRock() },
    (h) => { h.boulder(0.4, -2, 5, 4); h.standing(52, 3); h.showRock() },
    (h) => { h.boulder(0.3, 2, 6, 4); h.boulder(0.62, -3, 7, 4); h.standing(60, 3); h.overBay(84, 3, 2.4, ROCK); h.showRock() },
  ],
  fen: [
    (h) => { h.mossy(0.3, 0.62, 0); h.showMoss() },
    (h) => { h.mossy(0.42, 0.78, 0); h.showMoss() },
    (h) => { h.mossy(0.2, 0.45, 0); h.mossy(0.6, 0.8, 4); h.showMoss() },
  ],
  'hot-spring': [
    (h) => { h.overBay(82, 3, 2.4, HOT); h.showHot() },
    (h) => { h.hot(0.3, 2); h.overBay(78, 3, 2.4, HOT); h.showHot() },
    (h) => { h.hot(0.36, 8); h.overBay(84, 3, 2.4, HOT); h.showHot() },
  ],
  orchard: [
    (h) => { h.pit(0.38, 0, 16); h.showEarth() },
    (h) => { h.pit(0.5, 3, 14); h.showEarth() },
    (h) => { h.pit(0.3, 10, 12); h.showEarth() },
  ],
  foothills: [
    (h) => { h.shelf(0.3, -6, 14); h.boulder(0.5, -8, 6, 4); h.mossy(0.62, 0.84, 0); h.showClay(); h.showRock(); h.showMoss() },
    (h) => { h.mossy(0.22, 0.42, 0); h.overBay(80, 3, 2.4, HOT); h.pit(0.68, 4, 8); h.showMoss(); h.showHot(); h.showEarth() },
    (h) => { h.shelf(0.5, 4, 14); h.hot(0.3, 6); h.pit(0.66, -2, 8); h.showClay(); h.showHot(); h.showEarth() },
  ],
  massif: [
    (h) => { h.shelf(0.26, 10, 12); h.boulder(0.3, -14, 6, 4); h.mossy(0.44, 0.6, -8); h.overBay(81, 3, 2.4, HOT); h.pit(0.7, 2, 8); all(h) },
    (h) => { h.pit(0.24, 0, 8); h.shelf(0.5, -10, 12); h.overBay(80, 3, 2.4, HOT); h.mossy(0.62, 0.8, 0); h.boulder(0.36, 10, 6, 4); all(h) },
    (h) => { h.boulder(0.26, 14, 5, 4); h.hot(0.44, -2); h.mossy(0.34, 0.5, 10); h.shelf(0.56, 6, 12); h.pit(0.7, 8, 8); all(h) },
  ],
}

function all(h: Laying): void {
  h.showClay(); h.showRock(); h.showMoss(); h.showHot(); h.showEarth()
}

/** The hill of an id and a layout, as first laid. An id or a layout this game does not know gives the first sand hill. */
export function layHill(id: string, variant: number): Hill {
  const lay = LAY[id] ?? LAY.dune
  const v = Number.isInteger(variant) && variant >= 0 && variant < VARIANTS ? variant : 0
  const laying = new Laying(FRAMES[v], v * 37)
  lay[v](laying)
  return laying.done()
}

/** The grounds a hill holds beyond sand: the ones whose first showing it can play. */
export const groundsOf = (layout: Layout): GroundKind[] => (Object.keys(layout.spots) as GroundKind[])

/** The rows a cloud gathers in lie in open sky on every hill: the ground's top is always below them. */
export const SKY_ROWS = CLOUD_BOTTOM + 1
