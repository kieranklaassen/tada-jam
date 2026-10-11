import { CELL, COLS, HOT_WET, PANE, ROWS, WATER, isFluid, isSand, type Box, type GroundKind, type Layout } from './cells'
import { LADDER } from './config'
import { Game, washingBox } from './game'
import { freshHill, freshSave, type Save } from './save'

// What the tests share: a game set up on any hill, the few things a test does
// to a hill by hand, and a canvas that records what is drawn on it and where.
// Nothing here is part of the game: only the test files import it.

export const ALL_SHOWN: GroundKind[] = ['clay', 'rock', 'moss', 'hot', 'earth']

/** A save on a hill of the order as first laid. With `shown` left out every ground has been shown, so no showing plays. */
export function saveOn(hill: string, variant = 0, more: Partial<Save> = {}): Save {
  return { ...freshSave(null), position: hill, ...freshHill(hill, variant), shown: ALL_SHOWN, ...more }
}

export function gameOn(hill: string, variant = 0, more: Partial<Save> = {}): Game {
  return new Game(saveOn(hill, variant, more), 1)
}

/** Plays a stretch of attended time in frames of a sixtieth of a second. */
export function play(game: Game, seconds: number): void {
  for (let i = Math.round(seconds * 60); i > 0; i--) game.step(1 / 60)
}

/** Fills the lowest `rows` rows of a box with water wherever they are open. */
export function flood(game: Game, box: Box, rows: number): void {
  const ground = game.on.ground
  for (let row = box.row1; row > box.row1 - rows; row--) for (let col = box.col0; col <= box.col1; col++) if (ground.cells[row * COLS + col] === 0) ground.put(row * COLS + col, WATER)
}

/** A spout of water let fall through the middle of the washing. */
export function spout(game: Game): void {
  const box = washingBox(game.on.ground.layout), mid = (box.col0 + box.col1) >> 1
  for (let col = mid - 2; col <= mid + 2; col++) game.on.ground.put((box.row0 + 4) * COLS + col, WATER)
}

/** Everything that can happen to the residents of a hill at once: the rooms and the bath full, a spout of water on the line. */
export function soak(game: Game): void {
  const { moleRoom, wormRoom, bath } = game.on.ground.layout
  flood(game, moleRoom, 12)
  flood(game, wormRoom, 3)
  spout(game)
  flood(game, bath, bath.row1 - bath.row0 + 1)
}

/** A hill opened as it is found some time after its duck floated: the bath full, the hill finished, the position one step on. Soaked, every resident's scene is over as well. */
export function finishedOn(hill: string, variant = 0, soaked = false): Game {
  const laid = gameOn(hill, variant)
  if (soaked) soak(laid)
  else { const { bath } = laid.on.ground.layout; flood(laid, bath, bath.row1 - bath.row0 + 1) }
  const position = LADDER[Math.min(LADDER.length - 1, LADDER.indexOf(hill) + 1)]
  return new Game({ ...laid.toSave(), finished: true, position, ...(soaked ? { mole: 'afloat', worm: 'squelching', badger: 'rained' } : {}) }, 1)
}

/** Whether a tunnel as wide as a rub and its loosened rim can be dug with its middle here and touch nothing but sand, space and water. */
function clear(cells: Uint8Array, col: number, row: number): boolean {
  for (let r = row - 5; r <= row + 5; r++) {
    for (let c = col - 5; c <= col + 5; c++) {
      if (c < 0 || c >= COLS || r >= ROWS) return false
      const code = cells[r * COLS + c]
      if (!(isSand(code) || isFluid(code))) return false
    }
  }
  return true
}

/**
 * A tunnel through sand alone that leads down to the chamber over the bath and never goes up: its cells from the top down, or
 * null when there is none. It starts under the pond, or at one of the cells in `starts`.
 */
export function sandWay(layout: Layout, cells: Uint8Array, starts?: readonly number[]): { col: number; row: number }[] | null {
  const { pond, chamber } = layout
  const from = new Int32Array(COLS * ROWS).fill(-2), queue: number[] = []
  const start = pond.brim + pond.depth - 4
  if (starts) { for (const index of starts) if (clear(cells, index % COLS, (index / COLS) | 0)) { queue.push(index); from[index] = -1 } }
  else for (let col = pond.col - 8; col <= pond.col + 8; col++) if (clear(cells, col, start)) { queue.push(start * COLS + col); from[start * COLS + col] = -1 }
  for (let i = 0; i < queue.length; i++) {
    const col = queue[i] % COLS, row = (queue[i] / COLS) | 0
    if (row >= chamber.row0 && col >= chamber.col0 + 6 && col <= chamber.col1 - 6) {
      const way: { col: number; row: number }[] = []
      for (let at = queue[i]; at >= 0; at = from[at]) way.unshift({ col: at % COLS, row: (at / COLS) | 0 })
      return way
    }
    for (const [dc, dr] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) {
      const c = col + dc, r = row + dr
      if (c < 0 || c >= COLS || r >= ROWS || from[r * COLS + c] !== -2 || !clear(cells, c, r)) continue
      from[r * COLS + c] = queue[i]
      queue.push(r * COLS + c)
    }
  }
  return null
}

/** The middle of a cell in stage units. */
export const spot = (col: number, row: number): { x: number; y: number } => ({ x: PANE.x + (col + 0.5) * CELL, y: PANE.y + (row + 0.5) * CELL })

/** The first cell that `fits`, reading the hill row by row from the top, or null. */
export function find(game: Game, fits: (code: number, col: number, row: number, cells: Uint8Array) => boolean): { col: number; row: number } | null {
  const cells = game.on.ground.cells
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (fits(cells[row * COLS + col], col, row, cells)) return { col, row }
  return null
}

/** Plays until `done` holds, a frame at a time, and says whether it came to hold within `seconds`. */
export function until(game: Game, seconds: number, done: () => boolean): boolean {
  for (let i = Math.round(seconds * 60); i > 0; i--) { if (done()) return true; game.step(1 / 60) }
  return done()
}

/** The six layouts with a hot stone over the gap between the duck and the chain: dug out from under, it drops into the bath. */
export const STONE_OVER_BATH: readonly (readonly [string, number])[] = [['hot-spring', 0], ['hot-spring', 1], ['hot-spring', 2], ['foothills', 1], ['massif', 0], ['massif', 1]]


/** One rub along a way of cells, from its first to its last. */
export function rubAlong(game: Game, way: readonly { col: number; row: number }[]): void {
  game.press(spot(way[0].col, way[0].row))
  for (let i = 3; i < way.length; i += 3) { game.rubTo(spot(way[i].col, way[i].row)); game.step(1 / 60) }
  game.rubTo(spot(way[way.length - 1].col, way[way.length - 1].row))
  game.release()
}

/**
 * The one rub that mends a hill: where a stream lands on a hot stone on its way and leaves as steam, a way through sand from
 * the stream above the stone, round it, to the chamber; otherwise a way through sand from under the pond. False when no
 * such way is left.
 */
export function mend(game: Game): boolean {
  const ground = game.on.ground, { layout, cells } = ground, { bath, pond } = layout
  const wet = find(game, (code, col, row) => code === HOT_WET && row > pond.brim + pond.depth && !(col >= bath.col0 && col <= bath.col1 && row >= bath.row0))
  const stream: number[] = []
  if (wet) for (let row = pond.brim + pond.depth + 2; row < wet.row; row++) for (let col = 0; col < COLS; col++) if (cells[row * COLS + col] === WATER) stream.push(row * COLS + col)
  const way = (wet ? sandWay(layout, cells, stream) : null) ?? sandWay(layout, cells)
  if (!way) return false
  rubAlong(game, way)
  return true
}

// --- A canvas that records ---------------------------------------------------

/** One thing drawn on the surface: what it was and the box it covers, in the surface's own units. */
export type Drawn = { name: string; how: 'stamp' | 'fill' | 'stroke'; /** The colour of a fill or a stroke. */ style: string; x0: number; y0: number; x1: number; y1: number }

type Matrix = [number, number, number, number, number, number]

/** A 2D context that draws nothing. Every method is there and does nothing; a gradient or image data comes back as a plain object. */
function blank(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => {} }
  return new Proxy({} as Record<string | symbol, unknown>, {
    get(target, name) {
      if (name in target) return target[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      if (name === 'createImageData') return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
      return () => {}
    },
    set(target, name, value) { target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

/** A canvas whose pictures are never painted: for the sprites and the sand's picture. Its label says what it is. */
export function blankCanvas(width: number, height: number): HTMLCanvasElement {
  const context = blank()
  return { width, height, getContext: () => context } as unknown as HTMLCanvasElement
}

/** The surface: it keeps the transform as a real canvas does and notes every stamp, fill and stroke with the box it covers. */
export class Recorder {
  readonly drawn: Drawn[] = []
  readonly canvas: HTMLCanvasElement
  private m: Matrix = [1, 0, 0, 1, 0, 0]
  private readonly stack: Matrix[] = []
  private path = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }

  constructor() {
    const note = (x: number, y: number): void => {
      const [a, b, c, d, e, f] = this.m, px = a * x + c * y + e, py = b * x + d * y + f
      const p = this.path
      p.x0 = Math.min(p.x0, px); p.y0 = Math.min(p.y0, py); p.x1 = Math.max(p.x1, px); p.y1 = Math.max(p.y1, py)
    }
    const round = (x: number, y: number, rx: number, ry: number): void => { note(x - rx, y - ry); note(x + rx, y - ry); note(x - rx, y + ry); note(x + rx, y + ry) }
    const put = (name: string, how: Drawn['how']): void => { this.drawn.push({ name, how, style: how === 'stamp' ? '' : String(own[how === 'fill' ? 'fillStyle' : 'strokeStyle'] ?? ''), ...this.path }) }
    const own: Record<string, unknown> = {
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { this.m = [a, b, c, d, e, f] },
      save: () => { this.stack.push([...this.m] as Matrix) },
      restore: () => { this.m = this.stack.pop() ?? this.m },
      translate: (x: number, y: number) => { const [a, b, c, d, e, f] = this.m; this.m = [a, b, c, d, a * x + c * y + e, b * x + d * y + f] },
      scale: (x: number, y: number) => { const [a, b, c, d, e, f] = this.m; this.m = [a * x, b * x, c * y, d * y, e, f] },
      rotate: (turn: number) => { const [a, b, c, d, e, f] = this.m, cos = Math.cos(turn), sin = Math.sin(turn); this.m = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, e, f] },
      beginPath: () => { this.path = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity } },
      moveTo: note,
      lineTo: note,
      quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => { note(cx, cy); note(x, y) },
      bezierCurveTo: (ax: number, ay: number, bx: number, by: number, x: number, y: number) => { note(ax, ay); note(bx, by); note(x, y) },
      rect: (x: number, y: number, w: number, h: number) => { note(x, y); note(x + w, y); note(x, y + h); note(x + w, y + h) },
      arc: (x: number, y: number, r: number) => round(x, y, r, r),
      ellipse: (x: number, y: number, rx: number, ry: number) => round(x, y, Math.max(rx, ry), Math.max(rx, ry)),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fill: () => put('pen', 'fill'),
      stroke: () => put('pen', 'stroke'),
      fillRect: (x: number, y: number, w: number, h: number) => { this.path = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; note(x, y); note(x + w, y + h); put('backdrop', 'fill') },
      drawImage: (image: { label?: string }, ...at: number[]) => {
        const [x, y, w, h] = at.length === 8 ? at.slice(4) : at
        this.path = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
        note(x, y); note(x + w, y); note(x, y + h); note(x + w, y + h)
        put(image.label ?? 'picture', 'stamp')
      },
    }
    const context = new Proxy(own, {
      get: (target, name) => (name in target ? target[name as string] : () => {}),
      set: (target, name, value) => { target[name as string] = value; return true },
    })
    this.canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement
  }

  /** Forgets what was drawn, before the next frame. */
  clear(): void {
    this.drawn.length = 0
  }
}
