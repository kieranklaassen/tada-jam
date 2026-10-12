import type { Ink } from './colours'
import type { Box } from './marble'

// A grid of values as a picture of flat colour with a smooth outline. The
// picture has several pixels to a cell. Away from an edge a cell is filled
// with its own value. Near an edge each pixel takes the value that the
// twenty-five cells round it vote for, each cell counting by how near its
// middle is to that pixel. The grid's staircase then comes out as a straight
// slant where it is steep and as a slow wave where it is shallow, at any
// angle, without ever blending two colours: a pixel is one ink or another.
// Along every edge between two colours runs a fine line of each colour's
// darker shade: the vein of marbled paper. Plain arrays in and out, so it is
// tested without a canvas.

/** How soft the vote is, in cells: wide enough to turn a step one cell high into a slope four cells long. */
const SOFT = 1.0
/** How much clear water's vote counts beside a colour's, where water is see-through: a line of colour one cell wide still wins its own middle. */
const THIN = 0.5
/** How many cells each way a pixel's vote reaches. */
const REACH = 2
const SPAN = REACH * 2 + 1

export class Raster {
  /** The picture's size in pixels: `fine` times the grid each way. */
  readonly width: number
  readonly height: number
  readonly fine: number
  /** Red, green, blue and alpha for each pixel. */
  readonly rgba: Uint8ClampedArray
  private readonly pixels: Uint32Array
  private readonly values: Uint8Array
  /** How much each of the five cells across counts for each pixel across a cell. */
  private readonly near: Float32Array
  private readonly votes = new Float32Array(8)
  private readonly round = new Uint8Array(SPAN * SPAN)
  private readonly cols: Int32Array
  private readonly rows: Int32Array
  private readonly w: number
  private readonly h: number

  constructor(w: number, h: number, fine: number) {
    this.w = w
    this.h = h
    this.fine = fine
    this.width = w * fine
    this.height = h * fine
    this.values = new Uint8Array(this.width * this.height)
    this.rgba = new Uint8ClampedArray(this.width * this.height * 4)
    this.pixels = new Uint32Array(this.rgba.buffer)
    this.near = new Float32Array(fine * SPAN)
    for (let sub = 0; sub < fine; sub++) {
      const at = (sub + 0.5) / fine - 0.5
      for (let n = 0; n < SPAN; n++) this.near[sub * SPAN + n] = Math.exp(-((n - REACH - at) ** 2) / (2 * SOFT * SOFT))
    }
    // The cells round a cell, with the grid's own edge cells standing in for what lies past the edge.
    this.cols = new Int32Array(w * SPAN)
    this.rows = new Int32Array(h * SPAN)
    for (let x = 0; x < w; x++) for (let n = 0; n < SPAN; n++) this.cols[x * SPAN + n] = Math.min(w - 1, Math.max(0, x + n - REACH))
    for (let y = 0; y < h; y++) for (let n = 0; n < SPAN; n++) this.rows[y * SPAN + n] = Math.min(h - 1, Math.max(0, y + n - REACH)) * w
  }

  /**
   * Paints the cells of `box`, or all of them, and returns the box of pixels it wrote. With `clear`, value 0 is
   * left see-through: the water shows the tray under it.
   */
  paint(cells: Uint8Array, inks: readonly Ink[], box: Box | null, clear: boolean): Box {
    const w = this.w, h = this.h, F = this.fine, W = this.width, H = this.height
    const values = this.values, near = this.near, votes = this.votes, round = this.round, cols = this.cols, rows = this.rows
    const water = clear ? THIN : 1
    // Three cells more each way: a pixel depends on the cells two round it, and its vein on the pixels round it.
    const x0 = Math.max(0, (box?.x0 ?? 0) - 3), y0 = Math.max(0, (box?.y0 ?? 0) - 3)
    const x1 = Math.min(w, (box?.x1 ?? w) + 3), y1 = Math.min(h, (box?.y1 ?? h) + 3)
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const own = cells[y * w + x], o = y * F * W + x * F
        let same = true
        for (let j = 0; j < SPAN; j++) {
          const row = rows[y * SPAN + j]
          for (let i = 0; i < SPAN; i++) {
            const value = cells[row + cols[x * SPAN + i]]
            round[j * SPAN + i] = value
            if (value !== own) same = false
          }
        }
        if (same) {
          for (let sy = 0; sy < F; sy++) values.fill(own, o + sy * W, o + sy * W + F)
          continue
        }
        for (let sy = 0; sy < F; sy++) {
          for (let sx = 0; sx < F; sx++) {
            votes.fill(0)
            for (let j = 0; j < SPAN; j++) {
              const wy = near[sy * SPAN + j]
              for (let i = 0; i < SPAN; i++) votes[round[j * SPAN + i]] += wy * near[sx * SPAN + i]
            }
            votes[0] *= water
            let best = 0, most = votes[0]
            for (let v = 1; v < 8; v++) {
              if (votes[v] > most) {
                best = v
                most = votes[v]
              }
            }
            values[o + sy * W + sx] = best
          }
        }
      }
    }
    // The colours, one cell in from the edge of what was voted, so every vein is drawn from finished pixels.
    const cx0 = x0 === 0 ? 0 : x0 + 1, cy0 = y0 === 0 ? 0 : y0 + 1, cx1 = x1 === w ? w : x1 - 1, cy1 = y1 === h ? h : y1 - 1
    const px0 = cx0 * F, py0 = cy0 * F, px1 = cx1 * F, py1 = cy1 * F
    const face = this.faces(inks, false), edge = this.faces(inks, true), pixels = this.pixels
    for (let y = py0; y < py1; y++) {
      const upRow = y > 0 ? -W : 0, downRow = y < H - 1 ? W : 0
      for (let x = px0; x < px1; x++) {
        const i = y * W + x, v = values[i]
        if (clear && v === 0) {
          pixels[i] = 0
          continue
        }
        const veined = values[i + (x > 0 ? -1 : 0)] !== v || values[i + (x < W - 1 ? 1 : 0)] !== v || values[i + upRow] !== v || values[i + downRow] !== v
        pixels[i] = veined ? edge[v] : face[v]
      }
    }
    return { x0: px0, y0: py0, x1: px1, y1: py1 }
  }

  private readonly packed = new Map<readonly Ink[], { face: Uint32Array; edge: Uint32Array }>()

  /** Each ink as one number, the way the picture's memory holds a pixel. */
  private faces(inks: readonly Ink[], edge: boolean): Uint32Array {
    let made = this.packed.get(inks)
    if (!made) {
      const one = (rgb: readonly [number, number, number]): number => (255 << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]
      made = { face: Uint32Array.from(inks, (ink) => one(ink.face) >>> 0), edge: Uint32Array.from(inks, (ink) => one(ink.edge) >>> 0) }
      this.packed.set(inks, made)
    }
    return edge ? made.edge : made.face
  }
}

/** The box of cells in which two grids differ, or null when they are the same. */
export function changedBox(before: Uint8Array, now: Uint8Array, w: number, h: number): Box | null {
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 0; y < h; y++) {
    const row = y * w
    let first = -1, last = -1
    for (let x = 0; x < w; x++) {
      if (before[row + x] !== now[row + x]) {
        if (first < 0) first = x
        last = x
      }
    }
    if (first < 0) continue
    if (first < x0) x0 = first
    if (last + 1 > x1) x1 = last + 1
    if (y < y0) y0 = y
    y1 = y + 1
  }
  return x1 > x0 ? { x0, y0, x1, y1 } : null
}
