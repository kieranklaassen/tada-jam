import { mulberry32, type Ctx, type Print, type Rnd } from './lookCut'

// The press. Every piece of the picture is printed the same way, once, into a
// cached sprite: flat inks laid on their plates, the key block cut over them,
// each plate worn by a noise mask so paper shows through, and the colours set
// down a little off the key block. Nothing here runs per frame.

/** Cream paper, three flat inks and the dark key block: the whole palette. */
export const INK = { paper: '#f2e7d0', blue: '#23467a', gold: '#e3a32e', red: '#c9432f', key: '#15161d' } as const

/** A printed piece, ready to composite: its canvas and its size in logical pixels. */
export type Sprite = { canvas: HTMLCanvasElement; w: number; h: number }

type Plate = 'gold' | 'red' | 'blue' | 'key'
// Printing order, and how far each plate sits off the key block in reference units:
// the sheet went through the press once per ink, and never landed twice in the same place.
const PRESS: readonly (readonly [Plate, number, number])[] = [['gold', 0.6, 0.5], ['red', -1.3, 1.8], ['blue', 2.7, -1.9], ['key', 0, 0]]
/** Reference units one noise tile covers before it repeats. */
const SPAN = 240

function blank(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  return canvas
}

/** Smooth noise that repeats every `period` cells, so a tile of it has no seam. */
function noise(period: number, rnd: Rnd): (x: number, y: number) => number {
  const cells = new Float32Array(period * period)
  for (let i = 0; i < cells.length; i++) cells[i] = rnd()
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const x0 = xi % period, x1 = (xi + 1) % period, y0 = (yi % period) * period, y1 = ((yi + 1) % period) * period
    const top = cells[y0 + x0] * (1 - sx) + cells[y0 + x1] * sx, low = cells[y1 + x0] * (1 - sx) + cells[y1 + x1] * sx
    return top * (1 - sy) + low * sy
  }
}

/** A tile of one colour whose alpha comes from three scales of noise: grit, blotch and patch. */
function tile(k: number, seed: number, rgb: readonly [number, number, number], alpha: (grit: number, blotch: number, patch: number) => number): HTMLCanvasElement {
  const size = Math.max(64, Math.round(SPAN * k)), canvas = blank(size, size), g = canvas.getContext('2d')
  if (!g) return canvas
  const rnd = mulberry32(seed), grit = noise(170, rnd), blotch = noise(44, rnd), patch = noise(5, rnd), image = g.createImageData(size, size)
  for (let y = 0, i = 0; y < size; y++) {
    for (let x = 0; x < size; x++, i += 4) {
      const u = x / size, v = y / size
      image.data[i] = rgb[0]; image.data[i + 1] = rgb[1]; image.data[i + 2] = rgb[2]
      image.data[i + 3] = 255 * Math.max(0, Math.min(1, alpha(grit(u * 170, v * 170), blotch(u * 44, v * 44), patch(u * 5, v * 5))))
    }
  }
  g.putImageData(image, 0, 0)
  return canvas
}

const step = (edge: number, x: number) => (x - edge) / 0.035

export class Press {
  private readonly plates: Record<Plate, HTMLCanvasElement>
  /** Where a colour ink did not take, where the key block did not, and the fibres of the sheet. */
  private readonly thin: HTMLCanvasElement
  private readonly salt: HTMLCanvasElement
  private readonly grain: HTMLCanvasElement

  /** `k` is device pixels per reference unit; the plates are as large as the largest printing, in device pixels. */
  constructor(private readonly k: number, private readonly dpr: number, width: number, height: number) {
    this.plates = { gold: blank(width, height), red: blank(width, height), blue: blank(width, height), key: blank(width, height) }
    this.thin = tile(k, 11, [0, 0, 0], (grit, blotch, patch) => step(0.79 - 0.17 * patch, grit * 0.55 + blotch * 0.45))
    this.salt = tile(k, 23, [0, 0, 0], (grit, blotch, patch) => step(0.84 - 0.15 * patch, grit * 0.6 + blotch * 0.4))
    this.grain = tile(k, 37, [150, 120, 78], (grit, blotch) => 0.1 * step(0.66, grit * 0.6 + blotch * 0.4))
  }

  /**
   * Prints one piece `w` by `h` reference units. `paint` works in reference units with (ox, oy) at the
   * piece's top left corner. A `sheet` starts as a whole sheet of paper; a sprite has paper only where
   * `paint` lays it, and is clear everywhere else.
   */
  print(w: number, h: number, seed: number, paint: (p: Print) => void, ox = 0, oy = 0, sheet = false): Sprite {
    const k = this.k, width = Math.ceil(w * k), height = Math.ceil(h * k), out = blank(width, height), base = out.getContext('2d')
    const sprite = { canvas: out, w: width / this.dpr, h: height / this.dpr }
    if (!base) return sprite
    const rnd = mulberry32(seed), print = { base, rnd } as Print
    base.fillStyle = INK.paper
    if (sheet) base.fillRect(0, 0, width, height)
    base.setTransform(k, 0, 0, k, -ox * k, -oy * k)
    for (const [name] of PRESS) {
      const g = this.plates[name].getContext('2d')
      if (!g) return sprite
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.globalCompositeOperation = 'source-over'
      // Only this piece's corner of the plate is wiped and inked, so a small piece costs a small wipe.
      g.clearRect(0, 0, width, height)
      g.save()
      g.beginPath(); g.rect(0, 0, width, height); g.clip()
      g.fillStyle = INK[name]
      g.setTransform(k, 0, 0, k, -ox * k, -oy * k)
      print[name] = g
    }
    paint(print)
    for (const [name] of PRESS) print[name].restore()
    // A tile laid from a different corner each time, so no two plates wear in the same places. The corners come
    // from a stream of their own: two printings of one seed wear alike however much of the stream `paint` used.
    const corner = mulberry32(seed ^ 0x9e3779b9)
    const lay = (g: Ctx, mask: HTMLCanvasElement, operation: GlobalCompositeOperation) => {
      const sx = Math.floor(corner() * mask.width), sy = Math.floor(corner() * mask.height), pattern = g.createPattern(mask, 'repeat')
      if (!pattern) return
      g.setTransform(1, 0, 0, 1, -sx, -sy)
      g.globalCompositeOperation = operation
      g.fillStyle = pattern
      g.fillRect(sx, sy, width, height)
      g.setTransform(1, 0, 0, 1, 0, 0)
    }
    lay(base, this.grain, 'source-atop')
    for (const [name, dx, dy] of PRESS) {
      const g = print[name]
      lay(g, name === 'key' ? this.salt : this.thin, 'destination-out')
      // Inks are thin: where two colours overlap they darken, as on a real sheet. The key block covers.
      base.globalCompositeOperation = name === 'key' ? 'source-over' : 'multiply'
      base.drawImage(g.canvas, 0, 0, width, height, Math.round(dx * k), Math.round(dy * k), width, height)
    }
    return sprite
  }

  /** Gives the plates and tiles back: only the printed sprites are kept. */
  done(): void {
    for (const canvas of [...Object.values(this.plates), this.thin, this.salt, this.grain]) { canvas.width = 0; canvas.height = 0 }
  }
}
