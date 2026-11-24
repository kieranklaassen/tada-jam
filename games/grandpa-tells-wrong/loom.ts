// A picture drawn small, one pixel to a bead of weft, and woven: every pixel
// is one of a few dyes, a colour spans at least two warps, and where a tone
// lies between two dyes of one family the rows take turns, so shading becomes
// the comb of hatching a tapestry has. Then it is shown through a rib.

export type G = CanvasRenderingContext2D
export type MakeSheet = (width: number, height: number, read?: boolean) => { canvas: CanvasImageSource; g: G }

/** One bead of weft in stage units. */
export const CELL = { x: 4, y: 3 } as const

/** The dyes, dark to light in each family. */
export const DYES = {
  indigo: ['#1b2740', '#2d476b', '#527699', '#93b3bf'],
  sage: ['#22352c', '#42603f', '#728b54', '#aab87a'],
  madder: ['#561b1a', '#952f28', '#c5563d', '#e08f6b'],
  rose: ['#87464a', '#bb706d', '#dc9d92', '#f0cab8'],
  ochre: ['#68431b', '#a37229', '#d2a543', '#ecd38d'],
  walnut: ['#191317', '#3b281f', '#6b4c33', '#a38560'],
  cream: ['#8a7f66', '#bfb292', '#e4dabd', '#f8f2df'],
  violet: ['#2c203c', '#513d67', '#7f668d', '#b59bb6'],
} as const
export type Family = keyof typeof DYES

export const dye = (family: Family, shade: 0 | 1 | 2 | 3): string => DYES[family][shade]

const FAMILIES = Object.values(DYES)
/** Which rows take the lighter dye first, as the tone climbs from one to the next. */
const ROWS = [0.14, 0.64, 0.36, 0.88] as const

/** For each of 32768 colours: family, and the tone in quarters of a step. */
let table: Uint8Array | null = null
let shades: Uint32Array | null = null

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function build(): void {
  const made = new Uint8Array(32768)
  const all = FAMILIES.map((family) => family.map(rgb))
  shades = new Uint32Array(FAMILIES.length * 4)
  all.forEach((family, f) => family.forEach(([r, g, b], i) => { shades![f * 4 + i] = (255 << 24) | (b << 16) | (g << 8) | r }))
  for (let key = 0; key < 32768; key++) {
    const r = ((key >> 10) & 31) * 8 + 4, g = ((key >> 5) & 31) * 8 + 4, b = (key & 31) * 8 + 4
    let best = Infinity, value = 0
    all.forEach((family, f) => {
      for (let i = 0; i < 3; i++) {
        const from = family[i], to = family[i + 1]
        const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]
        const along = Math.max(0, Math.min(1, ((r - from[0]) * dx + (g - from[1]) * dy + (b - from[2]) * dz) / (dx * dx + dy * dy + dz * dz)))
        const ex = r - from[0] - dx * along, ey = g - from[1] - dy * along, ez = b - from[2] - dz * along
        const off = ex * ex * 2 + ey * ey * 4 + ez * ez * 3
        if (off < best) {
          best = off
          value = (f << 4) | Math.min(12, i * 4 + Math.round(along * 4))
        }
      }
    })
    made[key] = value
  }
  table = made
}

/** The table a picture is dyed by; made on first use. */
export function dyed(r: number, g: number, b: number): { family: number; tone: number } {
  if (!table) build()
  const value = table![((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]
  return { family: value >> 4, tone: value & 15 }
}

export class Loom {
  private thread: { canvas: CanvasImageSource; g: G } | null = null
  private cloth: { canvas: CanvasImageSource; g: G } | null = null
  private rib: CanvasImageSource | null = null
  private out: ImageData | null = null
  private codes = new Uint8Array(0)
  cols = 0
  rows = 0
  private offX = 0
  private offY = 0
  private cellW = 1
  private cellH = 1
  private readonly make: MakeSheet

  constructor(make: MakeSheet) {
    this.make = make
  }

  /** Strings the loom for a surface in device pixels, with the stage's scale and corner on it. Returns whether it was strung anew. */
  string(width: number, height: number, scale: number, x: number, y: number, ribs: boolean): boolean {
    this.cellW = CELL.x * scale
    this.cellH = CELL.y * scale
    // Beads start left of and above the surface so that the stage's own corner falls on a bead.
    const left = Math.ceil(x / this.cellW), top = Math.ceil(y / this.cellH)
    const cols = left + Math.ceil((width - x) / this.cellW), rows = top + Math.ceil((height - y) / this.cellH)
    this.offX = x - left * this.cellW
    this.offY = y - top * this.cellH
    const anew = cols !== this.cols || rows !== this.rows || !this.thread
    if (anew) {
      this.cols = cols
      this.rows = rows
      this.thread = this.make(cols, rows, true)
      this.cloth = this.make(cols * 2, rows)
      this.out = this.cloth.g.createImageData(cols * 2, rows)
      this.codes = new Uint8Array(cols * rows)
    }
    this.left = left
    this.top = top
    this.rib = this.ribs(width, height, ribs)
    return anew
  }
  private left = 0
  private top = 0

  /** The small canvas, set so that stage units draw on it. */
  begin(): G {
    const g = this.thread!.g
    g.setTransform(1 / CELL.x, 0, 0, 1 / CELL.y, this.left, this.top)
    return g
  }

  /** A sheet of the loom's own size, for what stands still. */
  still(paint: (g: G) => void): CanvasImageSource {
    const sheet = this.make(this.cols, this.rows)
    sheet.g.setTransform(1 / CELL.x, 0, 0, 1 / CELL.y, this.left, this.top)
    paint(sheet.g)
    return sheet.canvas
  }

  /** Lays a still sheet down, or only as much of it as has been woven up from the bottom edge. */
  lay(still: CanvasImageSource, woven = 1): void {
    const g = this.thread!.g, from = Math.round(this.rows * (1 - woven)), tall = this.rows - from
    if (tall <= 0) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(still, 0, from, this.cols, tall, 0, from, this.cols, tall)
    this.begin()
  }

  /** Weaves what was drawn and puts the cloth on the surface. */
  weave(surface: G): void {
    if (!table) build()
    const { cols, rows, codes } = this
    const read = this.thread!.g.getImageData(0, 0, cols, rows).data
    const lookup = table!, ink = shades!
    for (let i = 0, p = 0; i < codes.length; i++, p += 4) codes[i] = lookup[((read[p] >> 3) << 10) | ((read[p + 1] >> 3) << 5) | (read[p + 2] >> 3)]
    const out = new Uint32Array(this.out!.data.buffer)
    for (let y = 0; y < rows; y++) {
      const row = y * cols
      const level = ROWS[y & 3] * 4
      for (let x = 0; x < cols; x++) {
        const i = row + x
        let code = codes[i]
        const family = code >> 4
        if (x > 0 && x < cols - 1) {
          const a = codes[i - 1], b = codes[i + 1]
          // A lone bead of another dye is the blur of an edge: it goes with its neighbour.
          if (a >> 4 !== family && b >> 4 !== family) code = codes[i] = a
          else if (y > 0 && y < rows - 1) {
            const up = codes[i - cols]
            if (up >> 4 !== family && codes[i + cols] >> 4 !== family && a >> 4 === family && b >> 4 === family) code = up
          }
        }
        const tone = code & 15
        const step = tone >> 2
        const shade = (tone & 3) > level ? step + 1 : step
        const at = ((code >> 4) << 2) | (shade > 3 ? 3 : shade)
        const colour = ink[at]
        const o = (row + x) * 2
        // Where two colours meet along a warp the weave leaves a slit.
        const slit = x > 0 && codes[i - 1] >> 4 !== code >> 4
        out[o] = slit ? (((colour >>> 2) & 0x3f3f3f) + ((colour >>> 3) & 0x1f1f1f)) | 0xff000000 : colour
        out[o + 1] = colour
      }
    }
    this.cloth!.g.putImageData(this.out!, 0, 0)
    surface.imageSmoothingEnabled = false
    surface.drawImage(this.cloth!.canvas, this.offX, this.offY, cols * this.cellW, rows * this.cellH)
    surface.drawImage(this.rib!, 0, 0)
  }

  /** The relief of the cloth, painted once for a surface. */
  private ribs(width: number, height: number, full: boolean): CanvasImageSource {
    const sheet = this.make(width, height), g = sheet.g
    const { cellW, cellH } = this
    if (full && cellW >= 3) {
      for (let x = 0; x < this.cols; x++) {
        const left = this.offX + x * cellW
        g.fillStyle = 'rgba(20,10,16,0.20)'
        g.fillRect(left, 0, Math.max(1, cellW * 0.16), height)
        g.fillStyle = 'rgba(255,244,220,0.08)'
        g.fillRect(left + cellW * 0.35, 0, cellW * 0.3, height)
      }
      g.strokeStyle = 'rgba(20,10,16,0.17)'
      g.lineWidth = Math.max(1, cellH * 0.2)
      g.setLineDash([cellW, cellW])
      for (let y = 0; y <= this.rows; y++) {
        const at = this.offY + y * cellH
        // Over one warp and under the next: every second seam is half a bead lower.
        for (const odd of [0, 1]) {
          const line = at + odd * cellH * 0.5
          g.lineDashOffset = odd * cellW
          g.beginPath()
          g.moveTo(this.offX, line)
          g.lineTo(width, line)
          g.stroke()
        }
      }
    }
    // Yarn from one vat and the next: bands of the same dye a little off.
    let s = 7
    for (let y = 0; y < height;) {
      s = (s * 48271) % 2147483647
      const tall = cellH * (2 + (s % 9))
      g.fillStyle = s & 64 ? `rgba(20,10,16,${(s % 5) * 0.011})` : `rgba(255,240,210,${(s % 5) * 0.011})`
      g.fillRect(0, y, width, tall)
      y += tall
    }
    return sheet.canvas
  }
}
