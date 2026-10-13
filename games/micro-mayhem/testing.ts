import type { Game } from './game'
import type { RoomId } from './house'
import type { Point } from './input'
import { BUTTONS, CORD, GLASS, PULL, boxOfShape, isOval, type Rect, type Shape } from './layout'
import { Pen, type Box } from './pen'
import { below, type Rng } from './rng'
import { segmentsOf } from './sprites'
import { STAGE } from './stage'

// What the tests of this game share, and nothing the game itself uses: a pen
// that paints into a coarse grid, a canvas that draws nothing and counts, and
// a player that touches the game at random from a seeded stream. No test
// writes a file or reads the environment.

export const CELL = 4
const COLS = Math.ceil(STAGE.width / CELL), ROWS = Math.ceil(STAGE.height / CELL)

/** Paints a picture into a grid of cells: a cell is inked when its middle is inside a shape. What a picture cuts away is taken out again. */
export class GridPen extends Pen {
  readonly cells = new Uint8Array(COLS * ROWS)
  private only: Box | null = null

  private each(x0: number, y0: number, x1: number, y1: number, inside: (x: number, y: number) => boolean, cut: boolean): void {
    const only = this.only
    if (only) { x0 = Math.max(x0, only.x); y0 = Math.max(y0, only.y); x1 = Math.min(x1, only.x + only.w); y1 = Math.min(y1, only.y + only.h) }
    const c0 = Math.max(0, Math.floor(x0 / CELL)), c1 = Math.min(COLS - 1, Math.floor(x1 / CELL))
    const r0 = Math.max(0, Math.floor(y0 / CELL)), r1 = Math.min(ROWS - 1, Math.floor(y1 / CELL))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL
        if (only && (x < only.x || x >= only.x + only.w || y < only.y || y >= only.y + only.h)) continue
        if (inside(x, y)) this.cells[r * COLS + c] = cut ? 0 : 1
      }
    }
  }

  protected clip(box: Box, picture: () => void): void {
    const before = this.only
    if (before) {
      const x = Math.max(before.x, box.x), y = Math.max(before.y, box.y)
      this.only = { x, y, w: Math.max(0, Math.min(before.x + before.w, box.x + box.w) - x), h: Math.max(0, Math.min(before.y + before.h, box.y + box.h) - y) }
    } else this.only = box
    picture()
    this.only = before
  }

  protected oval(cx: number, cy: number, rx: number, ry: number, turn: number, cut: boolean): void {
    const cos = Math.cos(turn), sin = Math.sin(turn), reach = Math.max(rx, ry)
    this.each(cx - reach, cy - reach, cx + reach, cy + reach, (x, y) => {
      const dx = x - cx, dy = y - cy
      return ((dx * cos + dy * sin) / rx) ** 2 + ((-dx * sin + dy * cos) / ry) ** 2 <= 1
    }, cut)
  }

  protected path(points: readonly number[], closed: boolean, smooth: boolean, width: number, cut: boolean): void {
    const line = flatten(points, closed, smooth)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const [x, y] of line) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    if (width > 0) {
      const half = width / 2
      this.each(x0 - half, y0 - half, x1 + half, y1 + half, (x, y) => line.some((a, i) => i > 0 && fromSegment(x, y, line[i - 1], a) <= half), cut)
      return
    }
    this.each(x0, y0, x1, y1, (x, y) => {
      let inside = false
      for (let i = 0, j = line.length - 1; i < line.length; j = i++) {
        const [xi, yi] = line[i], [xj, yj] = line[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }, cut)
  }
}

function fromSegment(x: number, y: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length))
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)
}

/** The outline the canvas pen draws through `points`, as short straight pieces. */
function flatten(points: readonly number[], closed: boolean, smooth: boolean): [number, number][] {
  const n = points.length / 2
  const at = (i: number): [number, number] => [points[((i + n) % n) * 2], points[((i + n) % n) * 2 + 1]]
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  if (!smooth) return Array.from({ length: n }, (_, i) => at(i))
  const out: [number, number][] = []
  const curve = (from: [number, number], control: [number, number], to: [number, number]): void => {
    for (let s = 1; s <= 6; s++) {
      const t = s / 6, u = 1 - t
      out.push([u * u * from[0] + 2 * u * t * control[0] + t * t * to[0], u * u * from[1] + 2 * u * t * control[1] + t * t * to[1]])
    }
  }
  if (closed) {
    out.push(mid(at(-1), at(0)))
    for (let i = 0; i < n; i++) curve(out[out.length - 1], at(i), mid(at(i), at(i + 1)))
    return out
  }
  out.push(at(0))
  for (let i = 1; i < n - 1; i++) curve(out[out.length - 1], at(i), i === n - 2 ? at(i + 1) : mid(at(i), at(i + 1)))
  return out
}

/** The middles of the cells a picture inks, in stage units. */
export function cellsOf(picture: (pen: Pen) => void): { x: number; y: number }[] {
  const pen = new GridPen()
  picture(pen)
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < pen.cells.length; i++) if (pen.cells[i]) out.push({ x: ((i % COLS) + 0.5) * CELL, y: (Math.floor(i / COLS) + 0.5) * CELL })
  return out
}

const grids = new Map<string, Uint8Array>()

/** The cells a segment of `room` inks. */
export function gridOf(room: RoomId, name: string): Uint8Array {
  const key = `${room} ${name}`
  let grid = grids.get(key)
  if (!grid) {
    const picture = segmentsOf(room)[name]
    if (!picture) throw new Error(`the ${room} has no segment ${name}`)
    const pen = new GridPen()
    picture(pen)
    grids.set(key, (grid = pen.cells))
  }
  return grid
}

/**
 * How a segment's ink stands in the columns of the grid: of the columns it inks, the share whose ink is one
 * unbroken run from top to bottom. One mass has nearly all of them; two level strokes, one over the other, have
 * none. `within` looks at one box of the stage only.
 */
export function oneMass(room: RoomId, name: string, within?: Rect): number {
  const grid = gridOf(room, name)
  const r0 = within ? Math.max(0, Math.floor(within.y / CELL)) : 0, r1 = within ? Math.min(ROWS - 1, Math.floor((within.y + within.h) / CELL)) : ROWS - 1
  const c0 = within ? Math.max(0, Math.floor(within.x / CELL)) : 0, c1 = within ? Math.min(COLS - 1, Math.floor((within.x + within.w) / CELL)) : COLS - 1
  let inkedColumns = 0, single = 0
  for (let c = c0; c <= c1; c++) {
    let runs = 0
    for (let r = r0; r <= r1; r++) if (grid[r * COLS + c] && (r === r0 || !grid[(r - 1) * COLS + c])) runs += 1
    if (runs > 0) inkedColumns += 1
    if (runs === 1) single += 1
  }
  return inkedColumns === 0 ? 0 : single / inkedColumns
}

/** How many cells a segment inks. */
export function inked(room: RoomId, name: string): number {
  return gridOf(room, name).reduce((sum, cell) => sum + cell, 0)
}

/** How many of a segment's cells lie inside `shape`. */
export function inkedIn(room: RoomId, name: string, shape: Shape): number {
  const grid = gridOf(room, name), box = boxOfShape(shape)
  let count = 0
  for (let r = Math.max(0, Math.floor(box.y / CELL)); r <= Math.min(ROWS - 1, Math.floor((box.y + box.h) / CELL)); r++) {
    for (let c = Math.max(0, Math.floor(box.x / CELL)); c <= Math.min(COLS - 1, Math.floor((box.x + box.w) / CELL)); c++) {
      if (!grid[r * COLS + c]) continue
      const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL
      if (isOval(shape) ? ((x - shape.x) / shape.rx) ** 2 + ((y - shape.y) / shape.ry) ** 2 <= 1 : true) count += 1
    }
  }
  return count
}

const shared = new Map<string, number>()

/** How many cells two segments of `room` both ink. */
export function sharedCells(room: RoomId, a: string, b: string): number {
  const key = a < b ? `${room} ${a} ${b}` : `${room} ${b} ${a}`
  let count = shared.get(key)
  if (count === undefined) {
    const ga = gridOf(room, a), gb = gridOf(room, b)
    count = 0
    for (let i = 0; i < ga.length; i++) if (ga[i] && gb[i]) count += 1
    shared.set(key, count)
  }
  return count
}

/** Every inked cell of a segment lies on the glass. */
export function offGlass(room: RoomId, name: string): number {
  const grid = gridOf(room, name)
  let count = 0
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue
    const x = ((i % COLS) + 0.5) * CELL, y = (Math.floor(i / COLS) + 0.5) * CELL
    if (x < GLASS.x || x > GLASS.x + GLASS.w || y < GLASS.y || y > GLASS.y + GLASS.h) count += 1
  }
  return count
}

// --- A canvas that draws nothing ------------------------------------------------

export type Count = { stamps: number; fills: number; whole: number }

/** A 2D context that draws nothing and counts what it is asked to stamp and fill. */
export function fakeContext(count: Count | null): CanvasRenderingContext2D {
  const held: Record<string | symbol, unknown> = {}
  return new Proxy(held, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      return (...args: unknown[]) => {
        if (!count) return
        if (prop === 'drawImage') {
          count.stamps += 1
          if ((args[3] as number) >= STAGE.width) count.whole += 1
        }
        if (prop === 'fill' || prop === 'fillRect' || prop === 'stroke') count.fills += 1
      }
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

/** Canvases that only keep their size, so that a test can add up the pixels that are alive. */
export function fakeCanvases() {
  const all: { width: number; height: number }[] = []
  const make = (w: number, h: number): HTMLCanvasElement => {
    const canvas = { width: w, height: h, getContext: () => fakeContext(null) }
    all.push(canvas)
    return canvas as unknown as HTMLCanvasElement
  }
  return {
    make,
    /** How many canvases were ever made. */
    get made(): number { return all.length },
    /** The bytes of every canvas that still has a size: four a pixel. */
    get bytes(): number { return all.reduce((sum, canvas) => sum + canvas.width * canvas.height * 4, 0) },
  }
}

// --- A player ---------------------------------------------------------------------

const middle = (shape: Shape): Point => (isOval(shape) ? { x: shape.x, y: shape.y } : { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 })

/** A point inside `shape`, near its middle. */
function inside(rng: Rng, shape: Shape): Point {
  const at = middle(shape), box = boxOfShape(shape)
  return { x: at.x + (rng.next() - 0.5) * box.w * 0.5, y: at.y + (rng.next() - 0.5) * box.h * 0.5 }
}

export type Options = {
  /** Called after every frame the player lets pass. */
  frame?: (game: Game) => void
  /** Called after every call that is a touch: a press, a move, a lift or a cancel. */
  touched?: (game: Game, what: 'press' | 'move' | 'release' | 'cancel') => void
  /** How often the lamp's cord is pulled all the way, one touch in this many. */
  cordEvery?: number
}

/**
 * Touches the game `touches` times at random from `rng`: taps on what answers, on bare glass, on the case and its
 * buttons; rubs and pulls where a finger can stay down; fingers taken away; and now and then the lamp's cord
 * pulled down and held. Between touches it lets anything from no frame to some seconds pass.
 */
export function play(game: Game, rng: Rng, touches: number, options: Options = {}): void {
  const frames = (n: number): void => {
    for (let i = 0; i < n; i++) {
      game.step(1 / 60)
      options.frame?.(game)
    }
  }
  const touched = (what: 'press' | 'move' | 'release' | 'cancel'): void => options.touched?.(game, what)
  const press = (at: Point): void => { game.press(at); touched('press') }
  const lift = (): void => {
    if (below(rng, 12) === 0) { game.cancel(); touched('cancel') } else { game.release(); touched('release') }
  }
  for (let n = 0; n < touches; n++) {
    const roll = below(rng, 100)
    if (below(rng, options.cordEvery ?? 60) === 0) {
      // The cord, pulled down in two steps and held until the lamp clicks, or let go a moment too soon.
      press({ x: CORD.x, y: CORD.y[0] })
      game.move({ x: CORD.x, y: CORD.y[0] + PULL[0] + 4 }); touched('move')
      frames(3)
      game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 6 }); touched('move')
      frames(below(rng, 4) === 0 ? 10 : 40)
      lift()
    } else if (roll < 6) {
      const button = BUTTONS[below(rng, 2)]
      press({ x: button.x, y: button.y })
      frames(below(rng, 30))
      lift()
    } else if (roll < 9) {
      press({ x: 20 + rng.next() * 1140, y: 8 })
      lift()
    } else if (roll < 20) {
      press({ x: GLASS.x + rng.next() * GLASS.w, y: GLASS.y + rng.next() * GLASS.h })
      frames(below(rng, 3))
      lift()
    } else {
      const targets = game.targets()
      // The doors and the lamp are four of the targets everywhere: the room's own things are touched more often.
      const own = targets.filter((target) => !target.id.startsWith('door') && target.id !== 'lamp')
      const target = own.length > 0 && below(rng, 4) > 0 ? own[below(rng, own.length)] : targets[below(rng, targets.length)]
      const at = inside(rng, target.shape)
      press(at)
      if (target.grip === 'rub') {
        // A rub: the finger wanders over the glass.
        const box = boxOfShape(target.shape)
        for (let i = 0, steps = 2 + below(rng, 14); i < steps; i++) {
          game.move({ x: box.x + rng.next() * box.w, y: box.y + rng.next() * box.h }); touched('move')
          frames(1 + below(rng, 3))
        }
      } else if (target.grip === 'pull') {
        // A pull: upward, by anything from a tug to well past what is needed.
        const far = 20 + rng.next() * 180
        for (let i = 1; i <= 4; i++) {
          game.move({ x: at.x, y: at.y - (far * i) / 4 }); touched('move')
          frames(1 + below(rng, 3))
        }
      } else frames(below(rng, 4))
      lift()
    }
    frames(below(rng, 4) === 0 ? below(rng, 6) : below(rng, 5) === 0 ? 120 + below(rng, 240) : below(rng, 90))
  }
}
