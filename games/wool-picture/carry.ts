import { chance, type Ctx } from './felted'
import { CELL, COLS, FELT } from './layout'
import { BLUE, GREEN, RUSSET, WHITE, YELLOW, type Shape } from './wool'

// What each living thing carries, so that two things of one dye can be told
// apart in a still picture and not only by how they move: a hill has grass
// tips along its top, a bush has leaves in it, a treetop has a scalloped
// crown and a stem. All of it is stitched yarn: lines added to one path, which
// the view strokes once for each dye. Every mark is laid in the shape's own
// frame, so it rides the shape as the shape lives. None is saved.

const TAU = Math.PI * 2
const frac = (x: number): number => ((x % 1) + 1) % 1

/** How a shape lies, in stage units: its box, its middle, and the top of its wool over each of its columns (NaN where a column is empty). */
type Lie = { cells: Uint8Array; key: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; top: Float32Array }

/** A small leaf: two curves between its two points, and a rib from point to point that runs on as its stalk, so that it reads as a leaf and never as a ring. */
function leaf(c: Ctx, x: number, y: number, turn: number, long: number): void {
  const dx = Math.cos(turn) * long, dy = Math.sin(turn) * long
  c.moveTo(x - dx, y - dy)
  c.quadraticCurveTo(x - dy * 0.6, y + dx * 0.6, x + dx, y + dy)
  c.quadraticCurveTo(x + dy * 0.6, y - dx * 0.6, x - dx, y - dy)
  c.lineTo(x + dx * 1.7, y + dy * 1.7)
}

export class Carry {
  private lies = new Map<number, Lie>()

  /** How this shape lies now. Read again from its cells only when its wool has changed. */
  private lie(shape: Shape): Lie {
    const key = shape.count * 4099 + shape.mass
    const known = this.lies.get(shape.id)
    if (known && known.cells === shape.cells && known.key === key) return known
    const top = new Float32Array(shape.x1 - shape.x0 + 1)
    for (let col = shape.x0; col <= shape.x1; col++) {
      let row = shape.y0
      while (row <= shape.y1 && !shape.cells[row * COLS + col]) row++
      top[col - shape.x0] = row > shape.y1 ? NaN : FELT.y + row * CELL
    }
    const lie: Lie = {
      cells: shape.cells, key, top,
      x0: FELT.x + shape.x0 * CELL, y0: FELT.y + shape.y0 * CELL, x1: FELT.x + (shape.x1 + 1) * CELL, y1: FELT.y + (shape.y1 + 1) * CELL,
      cx: FELT.x + (shape.sumCol / shape.mass + 0.5) * CELL, cy: FELT.y + (shape.sumRow / shape.mass + 0.5) * CELL,
    }
    if (this.lies.size > 60) this.lies.clear()
    this.lies.set(shape.id, lie)
    return lie
  }

  /**
   * Adds what this shape carries to `c`'s path. `wet` is how wet it is (0 to 1): rained-on grass grows, a fire
   * sinks to embers, earth is mud and bubbles. `graze` holds where sheep graze, in stage units: the tips there
   * shorten and grow back. `reach` stretches a sun's rays while it reaches for the rain.
   */
  marks(c: Ctx, shape: Shape, t: number, wet: number, graze: readonly number[], reach: number): void {
    // Every chance here is seeded from the shape's saved place, so that a picture put away is found with the same marks.
    const lie = this.lie(shape), id = shape.seed, cols = shape.x1 - shape.x0 + 1, w = lie.x1 - lie.x0, h = lie.y1 - lie.y0
    const xOf = (col: number): number => FELT.x + (col + 0.5) * CELL
    const topAt = (col: number): number => lie.top[Math.max(0, Math.min(cols - 1, col - shape.x0))]
    /** Calls `each` at the top of the wool over every `step`th column that has wool. */
    const alongTop = (most: number, each: (x: number, y: number, col: number) => void): void => {
      const step = Math.max(2, Math.ceil(cols / most))
      for (let col = shape.x0 + 1; col < shape.x1; col += step) { const y = topAt(col); if (y === y) each(xOf(col), y, col) }
    }
    /** A row of scallops along the top line. */
    const scallops = (most: number, bulge: number): void => {
      const step = Math.max(2, Math.ceil(cols / most))
      for (let col = shape.x0; col + step <= shape.x1; col += step) {
        const y0 = topAt(col), y1 = topAt(col + step)
        if (y0 !== y0 || y1 !== y1) continue
        c.moveTo(xOf(col), y0 + 2)
        c.quadraticCurveTo(xOf(col + step / 2), Math.min(y0, y1) - bulge, xOf(col + step), y1 + 2)
      }
    }
    switch (shape.kind) {
      case 'hill': // Grass tips along its top: three blades a tuft, which flick. Rain puts out more of each; a grazing sheep crops them.
        alongTop(12, (x, y, col) => {
          let tall = 11 + 3 * chance(id, col, 1) + 7 * wet
          for (const at of graze) if (Math.abs(at - x) < 36) tall *= 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8))
          const flick = 3 * Math.sin(t * 2.2 + col * 0.9)
          c.moveTo(x - 4, y + 2); c.lineTo(x - 7 + flick, y - tall * 0.7)
          c.moveTo(x, y + 2); c.lineTo(x + flick, y - tall)
          c.moveTo(x + 4, y + 2); c.lineTo(x + 7 + flick, y - tall * 0.7)
        })
        break
      case 'bush': // Leaves inside it, pointing every way, and a few single grass tips along its top, which a grazing sheep crops.
        alongTop(BUSH_TIPS, (x, y, col) => {
          let tall = 8 + 3 * chance(id, col, 1) + 4 * wet
          for (const at of graze) if (Math.abs(at - x) < 36) tall *= 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8))
          const flick = 2 * Math.sin(t * 2.2 + col * 0.9)
          c.moveTo(x, y + 2); c.lineTo(x + flick, y - tall)
        })
        for (let i = 0, n = Math.min(9, Math.max(3, Math.floor(shape.count / 9))); i < n; i++) {
          const col = shape.x0 + Math.floor(chance(id, i, 2) * cols), y = topAt(col)
          if (y === y) leaf(c, xOf(col), y + 9 + chance(id, i, 3) * Math.max(0, lie.y1 - y - 18), chance(id, i, 4) * TAU, 6)
        }
        break
      case 'treetop': // A crown of scallops, a stem below it, and strands that stream from its side.
        scallops(8, 10)
        c.moveTo(lie.cx, lie.y1 - 6); c.lineTo(lie.cx, lie.y1 + 32)
        // Two strands of two lengths that part as they go: one long and lifting, one short and falling. Never a pair of even bars.
        for (const [dy, long, lift] of STRANDS) { const sway = 3 * Math.sin(t * 3 + dy); c.moveTo(lie.x1 - 4, lie.cy + dy); c.quadraticCurveTo(lie.x1 - 4 + long / 2, lie.cy + dy - lift * 0.8 + sway, lie.x1 - 4 + long, lie.cy + dy - lift) }
        break
      case 'mist': // Three long low wisps that slide, each of its own length.
        for (let r = 0; r < 3; r++) {
          const y = lie.y0 + h * (0.25 + 0.25 * r), a = lie.x0 + w * (0.04 + 0.2 * chance(id, r, 4)) + 14 * Math.sin(t * 0.5 + r * 2 + id), b = a + w * WISPS[r]
          c.moveTo(a, y); c.quadraticCurveTo((a + b) / 2, y - 6, b, y + 1)
        }
        break
      case 'smoke': // Two lines that curl up from its top.
        for (const side of [-1, 1]) {
          const x = lie.cx + side * 8, y = lie.y0 + 6
          c.moveTo(x, y)
          for (let s = 1; s <= 3; s++) c.quadraticCurveTo(x + side * 9 * (s % 2 ? 1 : -1) + 3 * Math.sin(t * 1.3 + s), y - s * 13 + 7, x + 2 * Math.sin(t * 0.9 + s), y - s * 13)
        }
        break
      case 'cloud': // Big puffs along its top.
        scallops(5, 15)
        break
      case 'pond': { // Rings that widen from its middle: two open halves each.
        for (let r = 0; r < 2; r++) {
          const u = frac(t / 2.6 + r * 0.5 + id * 0.37), rx = w * (0.1 + 0.3 * u), ry = h * (0.08 + 0.24 * u)
          for (const from of [0.2, 1.2]) { c.moveTo(lie.cx + rx * Math.cos(from * Math.PI), lie.cy + ry * Math.sin(from * Math.PI)); c.ellipse(lie.cx, lie.cy, rx, ry, 0, from * Math.PI, (from + 0.6) * Math.PI) }
        }
        break
      }
      case 'stream': // Wavelets that run along it.
        for (let i = 0, n = Math.min(6, Math.max(2, Math.floor(cols / 5))); i < n; i++) {
          const x = lie.x0 + frac(i / n + t * 0.22 + id * 0.1) * Math.max(1, w - 40), top = topAt(Math.floor((x - FELT.x) / CELL))
          const y = (top === top ? (top + lie.y1) / 2 : lie.cy) + (i % 2 ? 4 : -4)
          // A long ripple of five low humps, so that it reads as running water and as no sign.
          c.moveTo(x, y)
          for (let hump = 0; hump < 5; hump++) c.quadraticCurveTo(x + hump * 8 + 4, y + (hump % 2 ? 4 : -4), x + hump * 8 + 8, y)
        }
        break
      case 'wind': // Streaks that race and end in a curl.
        for (let r = 0; r < 3; r++) {
          const y = lie.y0 + h * (0.22 + 0.28 * r), a = lie.x0 + w * 0.5 * frac(t * 0.5 + r * 0.37 + id * 0.2), b = a + w * 0.45
          c.moveTo(a, y); c.lineTo(b, y); c.arc(b, y - 6, 6, Math.PI / 2, -Math.PI * 0.7, true)
        }
        break
      case 'corn': // Stalks along its top, each with an ear, leaning as the waves cross.
        alongTop(10, (x, y, col) => {
          const lean = 4 * Math.sin(t * 2.8 + col * 0.5)
          // The stalk runs up through its ear, which is pointed at both ends: an ear of corn, and no ring on a stick.
          c.moveTo(x, y + 4); c.lineTo(x + lean * 1.5, y - 26)
          c.moveTo(x + lean * 1.1, y - 12); c.quadraticCurveTo(x + lean * 1.3 - 4, y - 19, x + lean * 1.5, y - 26); c.quadraticCurveTo(x + lean * 1.3 + 4, y - 19, x + lean * 1.1, y - 12)
        })
        break
      case 'fire': // Tongues that leap, and sparks that rise. Under rain it sinks to embers and no spark rises.
        alongTop(7, (x, y, col) => {
          const leap = (12 + 11 * Math.abs(Math.sin(t * 7 + col * 1.7))) * (1 - 0.72 * wet), flick = 3 * Math.sin(t * 5 + col)
          c.moveTo(x - 5, y + 3); c.quadraticCurveTo(x - 4, y - leap * 0.5, x + flick, y - leap); c.quadraticCurveTo(x + 4, y - leap * 0.5, x + 5, y + 3)
        })
        if (wet < 0.5) for (let i = 0; i < 3; i++) {
          const u = frac(t * 0.7 + i * 0.33 + id * 0.1), x = lie.cx + (chance(id, i, 5) - 0.5) * w * 0.6 + 5 * Math.sin(t * 4 + i), y = lie.y0 - 12 - u * 34
          c.moveTo(x, y); c.lineTo(x + 1.5, y - 3.5)
        }
        break
      case 'sun': { // Rays all round it.
        const r0 = Math.max(w, h) / 2 + 3, long = (12 + 5 * Math.sin(t * 1.9 + id)) * reach
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, cos = Math.cos(a), sin = Math.sin(a); c.moveTo(lie.cx + r0 * cos, lie.cy + r0 * sin); c.lineTo(lie.cx + (r0 + long) * cos, lie.cy + (r0 + long) * sin) }
        break
      }
      case 'earth': // Clods along its top, cracks in it; wet, it is mud: the cracks close and bubbles rise and burst.
        alongTop(6, (x, y) => { c.moveTo(x - 6, y + 3); c.quadraticCurveTo(x, y - 6, x + 6, y + 3) })
        for (let i = 0; i < 3; i++) {
          const x = lie.x0 + w * (0.2 + 0.3 * i), y = lie.cy + (i % 2 ? 3 : -2)
          if (wet < 0.5) { c.moveTo(x, y); c.lineTo(x + 7, y + 5) } else {
            const u = frac(t * 0.6 + i * 0.4 + id * 0.3), r = 2 + 3.5 * u
            // A bubble is a dome that swells on the mud and is gone: half a ring, never a whole one.
            c.moveTo(x - r, y - 2 * u); c.arc(x, y - 2 * u, r, Math.PI, TAU)
          }
        }
        break
      case 'trunk': // Bark down it, and two roots at its foot.
        for (let i = 0; i < 3; i++) { const x = lie.x0 + w * (0.25 + 0.25 * i); c.moveTo(x, lie.y0 + 10); c.lineTo(x + 2, lie.cy - 5); c.moveTo(x - 1, lie.cy + 6); c.lineTo(x + 1, lie.y1 - 10) }
        for (const side of [-1, 1]) { c.moveTo(lie.cx + side * 5, lie.y1 - 5); c.quadraticCurveTo(lie.cx + side * 16, lie.y1 + 3, lie.cx + side * (w / 2 + 12), lie.y1 + 7) }
        break
      case 'leaves': // Leaves that loosen and tumble down through it.
        for (let i = 0, n = Math.min(7, Math.max(3, Math.floor(shape.count / 9))); i < n; i++) {
          const u = frac(t * 0.18 + chance(id, i, 5))
          leaf(c, lie.x0 + chance(id, i, 6) * w + 8 * Math.sin(t * 1.3 + i), lie.y0 + u * (h + 24), t * 1.5 + i * 2, 7)
        }
        break
      case 'fluff':
        break
    }
  }

  /** Adds the marks of a veil of dye `veil` to `c`'s path, on the shape it lies over. `amount` is how far it has come, 0 to 1. */
  veil(c: Ctx, shape: Shape, veil: number, t: number, amount: number): void {
    const lie = this.lie(shape), id = shape.seed, cols = shape.x1 - shape.x0 + 1, w = lie.x1 - lie.x0, h = lie.y1 - lie.y0
    if (veil === GREEN) {
      // Overgrown: a fringe of single grass tips along its top.
      for (let col = shape.x0 + 1; col < shape.x1; col += Math.max(2, Math.ceil(cols / 14))) {
        const y = lie.top[col - shape.x0], x = FELT.x + (col + 0.5) * CELL
        if (y === y) { c.moveTo(x, y + 2); c.lineTo(x + (col % 2 ? 3 : -3), y - 8 * amount) }
      }
    } else if (veil === WHITE) {
      // Hazed: frost lies on it in short strokes, each in a plot of its own, so that no two cross and make a sign.
      const across = Math.max(1, Math.min(FROST, Math.ceil(Math.sqrt((FROST * w) / Math.max(1, h))))), down = Math.ceil(FROST / across)
      const pw = w / across, ph = h / down, long = Math.min(5, 0.8 * pw, 0.8 * ph) * amount
      for (let i = 0; i < FROST; i++) {
        const x = lie.x0 + ((i % across) + 0.5 + (chance(id, i, 11) - 0.5) * (1 - long / pw)) * pw, y = lie.y0 + (Math.floor(i / across) + 0.5 + (chance(id, i, 12) - 0.5) * (1 - long / ph)) * ph
        const a = chance(id, i, 13) * Math.PI, dx = (long / 2) * Math.cos(a), dy = (long / 2) * Math.sin(a)
        c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy)
      }
    } else if (veil === BLUE) {
      // Wet: it drips from its lower edge, and glistens.
      for (let i = 0; i < 4; i++) { const x = lie.x0 + w * (0.15 + 0.23 * i), y = lie.y1 - 3 + frac(t * 0.5 + i * 0.31 + id * 0.2) * 18; c.moveTo(x, y); c.lineTo(x, y + 6 * amount) }
      c.moveTo(lie.x0 + w * 0.3, lie.y0 + h * 0.3); c.lineTo(lie.x0 + w * 0.3 + 5 * amount, lie.y0 + h * 0.3 - 3 * amount)
    } else if (veil === YELLOW) {
      // Lit: it shimmers at its edge.
      const r = Math.max(w, h) / 2 + 2, pulse = 4 + 4 * Math.abs(Math.sin(t * 5 + id))
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5, cos = Math.cos(a), sin = Math.sin(a) * (h / Math.max(1, w)); c.moveTo(lie.cx + r * cos, lie.cy + r * sin); c.lineTo(lie.cx + (r + pulse * amount) * cos, lie.cy + (r + pulse * amount) * sin) }
    } else if (veil === RUSSET) {
      // Weathered: it hangs in sagging folds.
      for (let i = 0; i < 3; i++) { const x = lie.x0 + w * (0.12 + 0.28 * i), y = lie.y0 + h * 0.35; c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.1, y + 9 * amount, x + w * 0.2, y) }
    }
  }
}

/** The two strands that stream from a treetop's side: where each leaves the wool (from its middle, downward), how far it goes, and how far it lifts. */
export const STRANDS: readonly (readonly [number, number, number])[] = [[-6, 40, 14], [8, 20, -9]]
/** At how many places along its top a bush carries a grass tip. */
export const BUSH_TIPS = 5

/** How long each of mist's three wisps is, as a share of the mist's width: no two alike. */
export const WISPS: readonly number[] = [0.5, 0.34, 0.64]
/** How many strokes of frost lie on a hazed thing. */
export const FROST = 7

/** The shade of each dye its marks are stitched in: lighter than the wool, or darker where the wool is pale. */
export const STITCH: readonly number[] = [0.5, -0.32, 0.5, 0.4, 0.45]
