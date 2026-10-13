import * as THREE from 'three'
import type { Plaque } from '../beads'
import { BEADS } from '../palette'

// Every plaque of beads, painted once at mount onto one canvas: a bead is a
// round of colour with its hole and the light on its rim painted in, never
// modelled. A plaque is then drawn as one flat rectangle that shows its piece
// of this picture, so a whole character costs a handful of triangles.

/** The four numbers that find a plaque in the picture: left, bottom, width and height, each as a share of the whole. */
export type Rect = readonly [number, number, number, number]

/** Pixels left empty round every plaque, so that a neighbour never bleeds into it when the picture is drawn small. */
const GUTTER = 3

const shade = (hex: string, k: number): string => {
  const part = (i: number): number => Math.round(parseInt(hex.slice(i, i + 2), 16) * k)
  return `rgb(${part(1)},${part(3)},${part(5)})`
}

/** One bead, seen end on: `fused` beads fill their peg so a plaque is one solid shape, loose ones are round. */
function paintBead(g: CanvasRenderingContext2D, x: number, y: number, px: number, hex: string, fused: boolean): void {
  const cx = x + px / 2, cy = y + px / 2
  if (fused) {
    g.fillStyle = shade(hex, 0.74)
    g.fillRect(x, y, px, px)
  }
  g.fillStyle = hex
  g.beginPath()
  g.arc(cx, cy, px * (fused ? 0.47 : 0.5), 0, Math.PI * 2)
  g.fill()
  // The shadow side of the rim, the hole, and the light on the rim.
  g.strokeStyle = shade(hex, 0.8)
  g.lineWidth = Math.max(1, px * 0.09)
  g.beginPath()
  g.arc(cx, cy, px * 0.36, Math.PI * 0.05, Math.PI * 0.6)
  g.stroke()
  g.fillStyle = shade(hex, 0.5)
  g.beginPath()
  g.arc(cx, cy, px * 0.16, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.5)'
  g.beginPath()
  g.arc(cx, cy, px * 0.34, Math.PI * 1.05, Math.PI * 1.6)
  g.stroke()
}

export class Atlas {
  readonly texture: THREE.CanvasTexture
  /** Pixels to a bead. */
  readonly px: number
  private readonly rects = new Map<Plaque, Rect>()

  /**
   * `plaques` are painted fused; those also in `loose` are painted as separate round beads. `px` is how many
   * pixels a bead gets at most: it is lowered until everything fits a picture `most` pixels on a side.
   */
  constructor(plaques: Iterable<Plaque>, loose: ReadonlySet<Plaque>, px: number, most: number, anisotropy: number) {
    const all = [...new Set(plaques)].sort((a, b) => b.h - a.h || b.w - a.w)
    let size = px
    let placed: { plaque: Plaque; x: number; y: number }[] = []
    let high = 0
    for (;;) {
      placed = []
      let x = GUTTER, y = GUTTER, row = 0
      for (const plaque of all) {
        const w = plaque.w * size + GUTTER, h = plaque.h * size + GUTTER
        if (x + w > most) {
          x = GUTTER
          y += row
          row = 0
        }
        placed.push({ plaque, x, y })
        x += w
        row = Math.max(row, h)
      }
      high = y + row
      if (high <= most || size <= 4) break
      size -= 1
    }
    this.px = size
    const canvas = document.createElement('canvas')
    canvas.width = most
    canvas.height = Math.min(most, 2 ** Math.ceil(Math.log2(Math.max(64, high))))
    const g = canvas.getContext('2d')!
    for (const { plaque, x, y } of placed) {
      const fused = !loose.has(plaque)
      for (let py = 0; py < plaque.h; py++) {
        for (let px0 = 0; px0 < plaque.w; px0++) {
          const cell = plaque.cells[py * plaque.w + px0]
          if (cell !== 0) paintBead(g, x + px0 * size, y + py * size, size, BEADS[cell - 1].hex, fused)
        }
      }
      // The picture is laid with its first row at the top, and read from the bottom up.
      this.rects.set(plaque, [x / canvas.width, 1 - (y + plaque.h * size) / canvas.height, (plaque.w * size) / canvas.width, (plaque.h * size) / canvas.height])
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    this.texture = texture
  }

  rect(plaque: Plaque): Rect {
    const rect = this.rects.get(plaque)
    if (!rect) throw new Error('a plaque that was never painted')
    return rect
  }

  has(plaque: Plaque): boolean {
    return this.rects.has(plaque)
  }

  dispose(): void {
    this.texture.dispose()
  }
}
