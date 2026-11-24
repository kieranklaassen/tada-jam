import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Lithographed tin: pressed shells with their picture printed on them. One
// lacquer for everything, a matcap drawn once, and a printed sheet for each
// figure. Colours are authored as they are shown (no colour conversion).
// Nothing is made when this file is read.

/** A rectangle of a printed sheet, in pixels. */
export type Tile = readonly [x: number, y: number, w: number, h: number]
export const SHEET = 1024
export const BODY: Tile = [0, 0, 1024, 512]
export const HEAD: Tile = [0, 512, 512, 512]
const SWATCH = 64

/** One plain colour of a sheet. Swatches stand in the lower right quarter, eight to a row. */
export const swatch = (n: number): Tile => [512 + (n % 8) * SWATCH, 512 + Math.floor(n / 8) * SWATCH, SWATCH, SWATCH]

export function canvas(width: number, height: number): { sheet: HTMLCanvasElement; pen: CanvasRenderingContext2D } {
  const sheet = document.createElement('canvas')
  sheet.width = width
  sheet.height = height
  return { sheet, pen: sheet.getContext('2d')! }
}

export function texture(sheet: HTMLCanvasElement, mip = true): THREE.CanvasTexture {
  const made = new THREE.CanvasTexture(sheet)
  made.colorSpace = THREE.NoColorSpace
  made.anisotropy = 4
  made.generateMipmaps = mip
  if (!mip) made.minFilter = THREE.LinearFilter
  return made
}

/** The lacquer: daylight from a tall window on the left, a warm floor below, a thin bright rim. */
export function lacquer(): THREE.CanvasTexture {
  const { sheet, pen } = canvas(256, 256)
  const ground = pen.createLinearGradient(0, 0, 0, 256)
  ground.addColorStop(0, '#f4f4ec')
  ground.addColorStop(0.42, '#dcdcd6')
  ground.addColorStop(0.62, '#b9b2aa')
  ground.addColorStop(0.8, '#9a8e84')
  ground.addColorStop(1, '#b59a7e')
  pen.fillStyle = ground
  pen.fillRect(0, 0, 256, 256)
  const soft = pen.createRadialGradient(92, 84, 4, 92, 84, 120)
  soft.addColorStop(0, 'rgba(255,255,255,0.75)')
  soft.addColorStop(0.5, 'rgba(255,255,255,0.22)')
  soft.addColorStop(1, 'rgba(255,255,255,0)')
  pen.fillStyle = soft
  pen.fillRect(0, 0, 256, 256)
  const edge = pen.createRadialGradient(128, 128, 88, 128, 128, 128)
  edge.addColorStop(0, 'rgba(40,36,52,0)')
  edge.addColorStop(0.75, 'rgba(40,36,52,0.2)')
  edge.addColorStop(1, 'rgba(40,36,52,0.4)')
  pen.fillStyle = edge
  pen.fillRect(0, 0, 256, 256)
  // The window itself, in four panes, small and hard: that is what makes it tin and not clay.
  pen.save()
  pen.translate(88, 70)
  pen.rotate(-0.32)
  pen.fillStyle = 'rgba(255,255,255,0.95)'
  for (const [x, y] of [[-15, -19], [1, -19], [-15, 1], [1, 1]]) pen.fillRect(x, y, 13, 17)
  pen.restore()
  return texture(sheet)
}

// --- Printing ----------------------------------------------------------------

/** Degrees round a shell from its front (towards +x) and up from its middle. */
export class Print {
  constructor(private readonly pen: CanvasRenderingContext2D, private readonly tile: Tile) {}

  private at(lon: number, lat: number): [number, number] {
    const [x, y, w, h] = this.tile
    return [x + (0.25 + lon / 360) * w, y + (0.5 - lat / 180) * h]
  }

  private around(draw: () => void): void {
    const [x, y, w, h] = this.tile, pen = this.pen
    pen.save()
    pen.beginPath()
    pen.rect(x, y, w, h)
    pen.clip()
    for (const shift of [-w, 0, w]) {
      pen.save()
      pen.translate(shift, 0)
      draw()
      pen.restore()
    }
    pen.restore()
  }

  fill(colour: string): this {
    const [x, y, w, h] = this.tile
    this.pen.fillStyle = colour
    this.pen.fillRect(x, y, w, h)
    return this
  }

  /** A printed shade towards the bottom, as coarse dots: the mark of lithography. */
  screen(colour: string, from = 10, to = -80, alpha = 0.5): this {
    const pen = this.pen
    this.around(() => {
      pen.fillStyle = colour
      pen.globalAlpha = alpha
      for (let lat = from, row = 0; lat > to; lat -= 4.2, row++) {
        const size = 0.4 + 1.9 * ((from - lat) / (from - to))
        for (let lon = -180 + (row % 2) * 3; lon < 180; lon += 6) {
          const [x, y] = this.at(lon, lat)
          pen.beginPath()
          pen.arc(x, y, size * (this.tile[2] / 900), 0, 7)
          pen.fill()
        }
      }
    })
    return this
  }

  oval(lon: number, lat: number, w: number, h: number, colour: string, line?: string, width = 3): this {
    const pen = this.pen, [, , tw, th] = this.tile
    this.around(() => {
      const [x, y] = this.at(lon, lat)
      pen.beginPath()
      pen.ellipse(x, y, (w / 360) * tw, (h / 180) * th, 0, 0, 7)
      if (colour) { pen.fillStyle = colour; pen.fill() }
      if (line) { pen.strokeStyle = line; pen.lineWidth = width; pen.stroke() }
    })
    return this
  }

  /** A closed or open run of points, given as degrees. */
  path(points: readonly (readonly [number, number])[], fill: string | null, line?: string, width = 3, round = true): this {
    const pen = this.pen
    this.around(() => {
      pen.beginPath()
      points.forEach(([lon, lat], i) => {
        const [x, y] = this.at(lon, lat)
        if (i === 0) pen.moveTo(x, y)
        else if (round && i < points.length - 1) {
          const [nx, ny] = this.at(...points[i + 1])
          pen.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
        } else pen.lineTo(x, y)
      })
      if (fill) { pen.closePath(); pen.fillStyle = fill; pen.fill() }
      if (line) { pen.strokeStyle = line; pen.lineWidth = width; pen.lineCap = 'round'; pen.lineJoin = 'round'; pen.stroke() }
    })
    return this
  }

  /** A patch between two longitudes and two latitudes. */
  patch(lon0: number, lon1: number, lat0: number, lat1: number, colour: string): this {
    const pen = this.pen
    this.around(() => {
      const [x0, y0] = this.at(lon0, lat1), [x1, y1] = this.at(lon1, lat0)
      pen.fillStyle = colour
      pen.fillRect(x0, y0, x1 - x0, y1 - y0)
    })
    return this
  }

  stripes(lon0: number, lon1: number, lat0: number, lat1: number, step: number, colour: string): this {
    for (let lat = lat0; lat < lat1; lat += step * 2) this.patch(lon0, lon1, lat, Math.min(lat1, lat + step), colour)
    return this
  }

  dots(lon0: number, lon1: number, lat0: number, lat1: number, step: number, size: number, colour: string): this {
    for (let lat = lat0, row = 0; lat <= lat1; lat += step * 0.8, row++)
      for (let lon = lon0 + (row % 2) * step * 0.5; lon <= lon1; lon += step) this.oval(lon, lat, size, size, colour)
    return this
  }

  scallops(lat: number, lon0: number, lon1: number, step: number, h: number, colour: string, line?: string): this {
    for (let lon = lon0; lon < lon1 - 0.1; lon += step) this.oval(lon + step / 2, lat, step / 2, h, colour, line, 2)
    return this
  }
}

/** A printed sheet: the body's shell, the head's shell, and the plain colours. */
export function sheetOf(body: (p: Print) => void, head: (p: Print) => void, colours: readonly string[]): THREE.CanvasTexture {
  const { sheet, pen } = canvas(SHEET, SHEET)
  pen.fillStyle = '#888'
  pen.fillRect(0, 0, SHEET, SHEET)
  body(new Print(pen, BODY))
  head(new Print(pen, HEAD))
  colours.forEach((colour, n) => {
    const [x, y, w, h] = swatch(n)
    pen.fillStyle = colour
    pen.fillRect(x, y, w, h)
  })
  return texture(sheet)
}

// --- Pressing ----------------------------------------------------------------

export type At = { at?: readonly [number, number, number]; turn?: readonly [number, number, number]; size?: readonly [number, number, number] | number }

/** Gathers the pieces of one rigid part and welds them into one geometry. */
export class Press {
  private readonly parts: THREE.BufferGeometry[] = []

  add(geometry: THREE.BufferGeometry, tile: Tile, place: At = {}): this {
    const part = geometry.index ? geometry.toNonIndexed() : geometry
    if (part !== geometry) geometry.dispose()
    const [x, y, w, h] = tile, flat = w <= SWATCH, uv = part.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) {
      const u = flat ? 0.5 : uv.getX(i), v = flat ? 0.5 : uv.getY(i)
      uv.setXY(i, (x + u * w) / SHEET, 1 - (y + (1 - v) * h) / SHEET)
    }
    for (const name of Object.keys(part.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') part.deleteAttribute(name)
    const size = place.size ?? 1
    part.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...(place.at ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(place.turn ?? [0, 0, 0]))),
      typeof size === 'number' ? new THREE.Vector3(size, size, size) : new THREE.Vector3(...size),
    ))
    this.parts.push(part)
    return this
  }

  /** A pressed shell: its picture runs round it, the front at +z. */
  shell(tile: Tile, at: readonly [number, number, number], size: readonly [number, number, number], turn?: readonly [number, number, number], detail = 28): this {
    return this.add(new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7)), tile, { at, size, turn })
  }

  /** A tube of changing thickness through points, closed at both ends. */
  tube(tile: Tile, points: readonly (readonly [number, number, number])[], radius: (t: number) => number, rings = 18, sides = 12): this {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    const geometry = new THREE.TubeGeometry(curve, rings, 1, sides, false), at = geometry.getAttribute('position') as THREE.BufferAttribute
    const middle = new THREE.Vector3(), v = new THREE.Vector3()
    for (let i = 0; i <= rings; i++) {
      curve.getPointAt(i / rings, middle)
      for (let j = 0; j <= sides; j++) {
        const n = i * (sides + 1) + j
        v.fromBufferAttribute(at, n).sub(middle).multiplyScalar(radius(i / rings)).add(middle)
        at.setXYZ(n, v.x, v.y, v.z)
      }
    }
    geometry.computeVertexNormals()
    this.add(geometry, tile)
    for (const t of [0, 1]) {
      curve.getPointAt(t, middle)
      this.shell(tile, [middle.x, middle.y, middle.z], [radius(t), radius(t), radius(t)], undefined, 12)
    }
    return this
  }

  disc(tile: Tile, at: readonly [number, number, number], r: number, h: number, turn?: readonly [number, number, number], top = r, sides = 24): this {
    return this.add(new THREE.CylinderGeometry(top, r, h, sides), tile, { at, turn })
  }

  /** The folded seam round a shell, where its two halves are tabbed together. */
  seam(tile: Tile, at: readonly [number, number, number], size: readonly [number, number, number]): this {
    return this.add(new THREE.TorusGeometry(1, 0.022, 6, 40), tile, { at, size: [size[2], size[1], size[0]], turn: [0, Math.PI / 2, 0] })
  }

  weld(): THREE.BufferGeometry {
    const whole = mergeGeometries(this.parts)
    for (const part of this.parts) part.dispose()
    this.parts.length = 0
    return whole
  }
}
