import { WATER } from './colours'

// Floating colour as a grid of values, and the moves that marbling is made
// of: a drop that spreads, a pull, and a breath. Every move here is a map of
// the plane read backwards: for each cell of the result, where did its colour
// come from? The cell there gives the value, so a colour is never blended
// with its neighbour and every edge stays hard. Nothing here knows about
// time, the screen or a finger.

/** A box of cells, `x1` and `y1` not included. */
export type Box = { x0: number; y0: number; x1: number; y1: number }

/** One colour growing from a point: `added` is the area it has taken so far, in cells, over pi. */
export type Spread = { x: number; y: number; added: number; colour: number }

/**
 * The grid with drops grown into it. Each drop pushes everything round it outward by the area it takes: a point
 * at distance d from the drop's middle came from distance sqrt(d*d - added), and inside sqrt(added) is the new
 * colour. `spreads` are in the order they landed, so the newest is undone first.
 */
export function spreadInto(base: Uint8Array, out: Uint8Array, w: number, h: number, spreads: readonly Spread[]): void {
  const count = spreads.length
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let px = x + 0.5, py = y + 0.5, value = -1
      for (let i = count - 1; i >= 0; i--) {
        const spread = spreads[i]
        if (spread.added <= 0) continue
        const dx = px - spread.x, dy = py - spread.y, d2 = dx * dx + dy * dy
        if (d2 < spread.added) {
          value = spread.colour
          break
        }
        const back = Math.sqrt(1 - spread.added / d2)
        px = spread.x + dx * back
        py = spread.y + dy * back
      }
      if (value < 0) {
        const sx = px | 0, sy = py | 0
        value = sx >= 0 && sy >= 0 && sx < w && sy < h ? base[sy * w + sx] : WATER
      }
      out[row + x] = value
    }
  }
}

// --- Moves that keep their fractions ----------------------------------------
//
// A pull is made of many short pieces, and a breath of many small swells. Made
// on the grid itself, each piece would round where a colour came from to a
// whole cell, and a hundred roundings leave a ragged line. So these moves are
// made on a flow instead: for each cell, the place in the water as it was when
// the flow began that its colour comes from, kept as fractions. A move bends
// the flow, reading it between cells, and the grid is read off the flow once.
// What a pull leaves is then one smooth feather, however many pieces made it.

/** For each cell, where its colour comes from in the water as it was when the flow began, and two spare sheets. */
export type Flow = { x: Float32Array; y: Float32Array; spareX: Float32Array; spareY: Float32Array }

export function makeFlow(count: number): Flow {
  return { x: new Float32Array(count), y: new Float32Array(count), spareX: new Float32Array(count), spareY: new Float32Array(count) }
}

/** The flow of water nothing has moved: every cell's colour comes from the cell itself. */
export function stillFlow(flow: Flow, w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      flow.x[y * w + x] = x + 0.5
      flow.y[y * w + x] = y + 0.5
    }
  }
}

const at = { x: 0, y: 0 }

/** The spare flow read at a place between cells, into `at`. Past the edge of the grid nothing has ever moved. */
function read(flow: Flow, w: number, h: number, px: number, py: number): void {
  if (px < 0 || py < 0 || px >= w || py >= h) {
    at.x = px
    at.y = py
    return
  }
  const fx = px - 0.5, fy = py - 0.5
  const ix = fx < 0 ? 0 : fx >= w - 1 ? w - 2 : Math.floor(fx), iy = fy < 0 ? 0 : fy >= h - 1 ? h - 2 : Math.floor(fy)
  const tx = Math.min(1, Math.max(0, fx - ix)), ty = Math.min(1, Math.max(0, fy - iy))
  const i = iy * w + ix, sx = flow.spareX, sy = flow.spareY
  const a = (1 - tx) * (1 - ty), b = tx * (1 - ty), c = (1 - tx) * ty, d = tx * ty
  at.x = sx[i] * a + sx[i + 1] * b + sx[i + w] * c + sx[i + w + 1] * d
  at.y = sy[i] * a + sy[i + 1] * b + sy[i + w] * c + sy[i + w + 1] * d
}

function spare(flow: Flow, w: number, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    flow.spareX.set(flow.x.subarray(y * w + x0, y * w + x1), y * w + x0)
    flow.spareY.set(flow.y.subarray(y * w + x0, y * w + x1), y * w + x0)
  }
}

/**
 * A piece of a pull: what lies at `(ax, ay)` is carried to `(bx, by)`, and what lies round it is carried less
 * the further it is from there, down to nothing at `reach` cells. Within `core` cells of the middle everything is
 * carried whole, so a pull draws a line of what it started in the whole way; from there the share falls away
 * steeply, so what is dragged beside the line comes to a point: a feather. Returns the box of cells it moved, or
 * null when the piece is too short to matter. The piece must be shorter than half of what lies between core and
 * reach.
 */
export function pull(flow: Flow, w: number, h: number, ax: number, ay: number, bx: number, by: number, reach: number, core: number): Box | null {
  const mx = bx - ax, my = by - ay
  if (mx * mx + my * my < 1e-6) return null
  const x0 = Math.max(0, Math.floor(bx - reach)), y0 = Math.max(0, Math.floor(by - reach))
  const x1 = Math.min(w, Math.ceil(bx + reach) + 1), y1 = Math.min(h, Math.ceil(by + reach) + 1)
  if (x0 >= x1 || y0 >= y1) return null
  // What the piece reads may lie outside the box it writes, by its own length.
  const pad = Math.ceil(Math.max(Math.abs(mx), Math.abs(my))) + 2
  spare(flow, w, Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(w, x1 + pad), Math.min(h, y1 + pad))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - bx, dy = y + 0.5 - by, d = Math.sqrt(dx * dx + dy * dy)
      if (d >= reach) continue
      const near = d <= core ? 1 : 1 - (d - core) / (reach - core), share = near * near
      read(flow, w, h, x + 0.5 - mx * share, y + 0.5 - my * share)
      flow.x[y * w + x] = at.x
      flow.y[y * w + x] = at.y
    }
  }
  return { x0, y0, x1, y1 }
}

/**
 * A breath blown down at `(cx, cy)`: what lies under it swells outward and what lies round it is crowded toward
 * the edge of the `reach`, where nothing moves. `amount` is how much the middle swells, well under 1. The swell
 * is a little stronger along `lobes` spokes, turned by `phase`, so an edge it crowds frays into small tongues.
 * Nothing is added. Returns the box of cells it moved.
 */
export function bulge(flow: Flow, w: number, h: number, cx: number, cy: number, reach: number, amount: number, lobes: number, phase: number): Box | null {
  const x0 = Math.max(0, Math.floor(cx - reach)), y0 = Math.max(0, Math.floor(cy - reach))
  const x1 = Math.min(w, Math.ceil(cx + reach) + 1), y1 = Math.min(h, Math.ceil(cy + reach) + 1)
  if (x0 >= x1 || y0 >= y1) return null
  spare(flow, w, x0, y0, x1, y1)
  const reach2 = reach * reach
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy
      if (d2 >= reach2) continue
      const near = 1 - d2 / reach2
      const back = 1 - amount * near * near * (1 + 0.35 * Math.sin(lobes * Math.atan2(dy, dx) + phase))
      // The colour comes from nearer the middle.
      read(flow, w, h, cx + dx * back, cy + dy * back)
      flow.x[y * w + x] = at.x
      flow.y[y * w + x] = at.y
    }
  }
  return { x0, y0, x1, y1 }
}

/**
 * A drop that is already on the water takes `added` more (area over pi, in cells): everything is pushed outward
 * from its middle by that much, and the new room in the middle takes the colour of the middle.
 */
export function swell(flow: Flow, w: number, h: number, cx: number, cy: number, added: number): void {
  spare(flow, w, 0, 0, w, h)
  read(flow, w, h, cx, cy)
  const midX = at.x, midY = at.y
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy
      if (d2 <= added) {
        flow.x[y * w + x] = midX
        flow.y[y * w + x] = midY
        continue
      }
      const back = Math.sqrt(1 - added / d2)
      // Far from the drop nothing moves by as much as a hundredth of a cell.
      if ((1 - back) * (1 - back) * d2 < 1e-4) continue
      read(flow, w, h, cx + dx * back, cy + dy * back)
      flow.x[y * w + x] = at.x
      flow.y[y * w + x] = at.y
    }
  }
}

/** Reads the grid off the flow: each cell of `box`, or of the whole grid, takes the colour of the cell of `origin` its colour comes from. Clear water comes in from past the edge. */
export function readOff(flow: Flow, origin: Uint8Array, cells: Uint8Array, w: number, h: number, box: Box | null): void {
  const x0 = box?.x0 ?? 0, y0 = box?.y0 ?? 0, x1 = box?.x1 ?? w, y1 = box?.y1 ?? h
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * w + x, sx = Math.floor(flow.x[i]), sy = Math.floor(flow.y[i])
      cells[i] = sx >= 0 && sy >= 0 && sx < w && sy < h ? origin[sy * w + sx] : WATER
    }
  }
}

/** The smallest box that holds both, either of which may be null. */
export function union(a: Box | null, b: Box | null): Box | null {
  if (!a) return b
  if (!b) return a
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }
}

/** How many cells hold each value. */
export function tally(cells: Uint8Array, values: number): number[] {
  const counts = new Array<number>(values).fill(0)
  for (let i = 0; i < cells.length; i++) counts[cells[i]] += 1
  return counts
}

// --- Three bits to a cell, as text ------------------------------------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** A grid of values 0 to 7 as text: two cells to a character. The cell count must be even. */
export function pack(cells: Uint8Array): string {
  let text = ''
  for (let i = 0; i + 1 < cells.length; i += 2) text += ALPHABET[((cells[i] & 7) << 3) | (cells[i + 1] & 7)]
  return text
}

/** The grid a text holds, or null when the text is not a grid of `count` cells. */
export function unpack(text: unknown, count: number): Uint8Array | null {
  if (typeof text !== 'string' || text.length * 2 !== count) return null
  const cells = new Uint8Array(count)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // The alphabet read backwards without a table: capitals, small letters, digits, and the two signs.
    const six = code >= 65 && code <= 90 ? code - 65 : code >= 97 && code <= 122 ? code - 71 : code >= 48 && code <= 57 ? code + 4 : code === 45 ? 62 : code === 95 ? 63 : -1
    if (six < 0) return null
    cells[i * 2] = six >> 3
    cells[i * 2 + 1] = six & 7
  }
  return cells
}
