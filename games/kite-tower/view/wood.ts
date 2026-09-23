import * as THREE from 'three'

// One procedural sanded-beech texture for the whole playroom (KTD7). The top
// half of the atlas is long grain (a face or edge cut along the board), the
// bottom half is end grain (a cut across it); each is four by two units at
// 256 pixels per unit. Geometry picks a window inside the right half per
// face, so grain follows the form; long grain repeats seamlessly along the
// board for anything longer than the atlas. Stains multiply it; the same
// texture is the roughness (its green channel) and a faint bump.

export const PX_PER_UNIT = 256
export const REGION_W = 4
export const REGION_H = 2
const SIZE = PX_PER_UNIT * REGION_W

export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Value noise along one row of pixels. The row's y is fixed, so each cell
 * column's y-blend is done once in `set`, and a pixel only eases between two
 * of them along x: the same value as blending four corner hashes per pixel,
 * at a fraction of the cost (the atlas is built before the first frame).
 * With `period` (cells) it repeats along x, so long grain tiles seamlessly.
 */
export class NoiseRow {
  private columns = new Float64Array(0)
  private first = 0

  /** Ready the row at `y` for every x in [xMin, xMax]. */
  set(y: number, xMin: number, xMax: number, period = 0): void {
    const yi = Math.floor(y)
    const yf = y - yi
    const v = yf * yf * (3 - 2 * yf)
    this.first = Math.floor(xMin)
    const count = Math.floor(xMax) - this.first + 2
    if (this.columns.length < count) this.columns = new Float64Array(count)
    for (let i = 0; i < count; i++) {
      const xi = this.first + i
      const x = period > 0 ? ((xi % period) + period) % period : xi
      const a = hash(x, yi)
      this.columns[i] = a + (hash(x, yi + 1) - a) * v
    }
  }

  at(x: number): number {
    const xi = Math.floor(x)
    const xf = x - xi
    const u = xf * xf * (3 - 2 * xf)
    const i = xi - this.first
    const a = this.columns[i]
    return a + (this.columns[i + 1] - a) * u
  }
}

/** Three octaves of `NoiseRow`; with `period` the first octave repeats every `period` cells along x. */
export class FbmRow {
  private readonly low = new NoiseRow()
  private readonly mid = new NoiseRow()
  private readonly high = new NoiseRow()

  set(y: number, xMin: number, xMax: number, period = 0): void {
    this.low.set(y, xMin, xMax, period)
    this.mid.set(y * 2.1 + 1.3, xMin * 2 + 5, xMax * 2 + 5, period * 2)
    this.high.set(y * 4.3 + 3.7, xMin * 4 + 9, xMax * 4 + 9, period * 4)
  }

  at(x: number): number {
    return this.low.at(x) * 0.55 + this.mid.at(x * 2 + 5) * 0.3 + this.high.at(x * 4 + 9) * 0.15
  }
}

function band(f: number): number {
  const rise = Math.min(1, Math.max(0, (f - 0.64) / 0.2))
  const fall = Math.min(1, Math.max(0, (1 - f) / 0.12))
  return rise * rise * (3 - 2 * rise) * fall
}

function paint(data: Uint8ClampedArray, index: number, r: number, g: number, b: number): void {
  data[index] = r * 255
  data[index + 1] = g * 255
  data[index + 2] = b * 255
  data[index + 3] = 255
}

/**
 * Long grain: soft growth-ring bands wandering along x, fine pores, and
 * beech's little ray flecks. Every term repeats every REGION_W units along x
 * (each frequency is a whole number of cells per region), so the texture
 * wraps along the grain without a seam.
 */
function longGrain(data: Uint8ClampedArray, width: number, rows: number, offsetRow: number): void {
  const cells = (f: number) => Math.round(REGION_W * f)
  const last = (width - 1) / PX_PER_UNIT
  const wander = new FbmRow()
  const streaks = new NoiseRow()
  const poreRow = new NoiseRow()
  const flecks = new NoiseRow()
  const tones = new FbmRow()
  // The slow sway sin(a + b) splits into a column part and a row part, so there is no sine per pixel.
  const swaySin = new Float64Array(width)
  const swayCos = new Float64Array(width)
  for (let px = 0; px < width; px++) {
    const a = ((px / PX_PER_UNIT) * Math.PI * 2) / REGION_W
    swaySin[px] = Math.sin(a) * 0.025
    swayCos[px] = Math.cos(a) * 0.025
  }
  for (let py = 0; py < rows; py++) {
    const Y = py / PX_PER_UNIT
    const rowSin = Math.sin(Y * 0.5)
    const rowCos = Math.cos(Y * 0.5)
    wander.set(Y * 0.9, 0, last * 0.5, cells(0.5))
    streaks.set(Y * 38, 0, last, cells(1))
    poreRow.set(Y * 90, 0, last * 3, cells(3))
    flecks.set(Y * 4.5, 3, last * 16 + 3, cells(16))
    tones.set(Y * 0.8, 11, last * 0.75 + 11, cells(0.75))
    for (let px = 0; px < width; px++) {
      const X = px / PX_PER_UNIT
      const warp = (wander.at(X * 0.5) - 0.5) * 0.28 + swaySin[px] * rowCos + swayCos[px] * rowSin
      const phase = (Y + warp) * 8.5
      const ring = band(phase - Math.floor(phase))
      const streak = (streaks.at(X) - 0.5) * 0.9
      const pores = Math.max(0, poreRow.at(X * 3) - 0.62) * 2.2
      const fleck = Math.max(0, flecks.at(X * 16 + 3) - 0.82) * 4
      const tone = (tones.at(X * 0.75 + 11) - 0.5) * 0.05
      const dark = ring * 0.3 + pores * 0.1 + fleck * 0.12 + streak * 0.12
      const r = 0.985 + tone - dark * 0.13
      const g = 0.95 + tone - dark * 0.2
      const b = 0.885 + tone - dark * 0.29
      paint(data, ((py + offsetRow) * width + px) * 4, r, g, b)
    }
  }
}

/** End grain: rings as gentle arcs around a pith far off the block, crossed by fine rays; it drinks more stain, so it is darker. */
function endGrain(data: Uint8ClampedArray, width: number, rows: number, offsetRow: number): void {
  const pithX = -2.4
  const pithY = -5.5
  const last = (width - 1) / PX_PER_UNIT
  const wobble = new FbmRow()
  const rayRow = new NoiseRow()
  const poreRow = new NoiseRow()
  for (let py = 0; py < rows; py++) {
    const Y = py / PX_PER_UNIT
    wobble.set(Y * 1.4, 0, last * 1.4)
    rayRow.set(Y * 6, 0, last * 6)
    poreRow.set(Y * 40, 0, last * 40)
    for (let px = 0; px < width; px++) {
      const X = px / PX_PER_UNIT
      const dx = X - pithX
      const dy = Y - pithY
      const r = Math.sqrt(dx * dx + dy * dy) + (wobble.at(X * 1.4) - 0.5) * 0.08
      const phase = r * 8.5
      const ring = band(phase - Math.floor(phase))
      const angle = Math.atan2(dy, dx)
      const rayPhase = angle * 260 + rayRow.at(X * 6) * 2
      const ray = Math.max(0, Math.sin(rayPhase) - 0.93) * 12
      const pores = Math.max(0, poreRow.at(X * 40) - 0.7) * 1.6
      const dark = ring * 0.4 + ray * 0.1 + pores * 0.1
      const rr = 0.95 - dark * 0.15
      const gg = 0.895 - dark * 0.22
      const bb = 0.81 - dark * 0.3
      paint(data, ((py + offsetRow) * width + px) * 4, rr, gg, bb)
    }
  }
}

let atlas: THREE.CanvasTexture | null = null

/** The shared atlas, built once. Canvas row 0 is the top (long grain), which is v = 1 with flipY. */
export function woodAtlas(): THREE.CanvasTexture {
  if (atlas) return atlas
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')!
  const image = context.createImageData(SIZE, SIZE)
  const half = SIZE / 2
  longGrain(image.data, SIZE, half, 0)
  endGrain(image.data, SIZE, half, half)
  context.putImageData(image, 0, 0)
  atlas = new THREE.CanvasTexture(canvas)
  atlas.colorSpace = THREE.SRGBColorSpace
  atlas.anisotropy = 4
  atlas.wrapS = THREE.RepeatWrapping
  atlas.wrapT = THREE.ClampToEdgeWrapping
  atlas.needsUpdate = true
  return atlas
}

/** Atlas UV of a point `units` into a region window (long grain on top, end grain below). */
export function atlasUv(long: boolean, u: number, v: number, out: [number, number]): [number, number] {
  out[0] = u / REGION_W
  out[1] = long ? 0.5 + v / (REGION_H * 2) : v / (REGION_H * 2)
  return out
}

/**
 * The wood material: stain from the instance colour (or `color`), sanded
 * edges a little paler (the `wear.x` attribute), and a contact darkening
 * (`wear.y`). One compiled program serves every wooden thing.
 */
export function woodMaterial(
  options: { color?: THREE.ColorRepresentation; instanced?: boolean; vertexColors?: boolean; roughness?: number; bump?: number } = {},
): THREE.MeshStandardMaterial {
  const map = woodAtlas()
  const material = new THREE.MeshStandardMaterial({
    color: options.color ?? '#ffffff',
    vertexColors: options.vertexColors ?? false,
    map,
    roughness: options.roughness ?? 0.95,
    metalness: 0,
  })
  const bump = options.bump ?? 0.9
  const instanced = options.instanced ?? false
  // One atlas read per pixel: software GL and small tablet GPUs pay for every
  // texture tap, so roughness is that texel's green and the grain relief is the
  // screen-space slope of its red (the same one-pixel difference a bump map
  // takes with three extra reads).
  material.onBeforeCompile = (shader) => {
    shader.uniforms.woodBump = { value: bump }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec2 wear;\nvarying vec2 vWear;${instanced ? '\nattribute float grainShift;' : ''}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWear = wear;')
    if (instanced) shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv.x += grainShift;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vWear;
uniform float woodBump;
vec3 woodRelief( vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDirection ) {
  vec3 sigmaX = normalize( dFdx( surfPos ) );
  vec3 sigmaY = normalize( dFdy( surfPos ) );
  vec3 r1 = cross( sigmaY, surfNorm );
  vec3 r2 = cross( surfNorm, sigmaX );
  float det = dot( sigmaX, r1 ) * faceDirection;
  vec3 grad = sign( det ) * ( dHdxy.x * r1 + dHdxy.y * r2 );
  return normalize( abs( det ) * surfNorm - grad );
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
  diffuseColor.rgb *= mix( vColor.rgb, vec3( 1.0 ), vWear.x * 0.42 );
#else
  diffuseColor.rgb *= mix( diffuse, vec3( 1.0 ), vWear.x * 0.42 ) / max( diffuse, vec3( 0.001 ) );
#endif
  diffuseColor.rgb *= vWear.y;`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * sampledDiffuseColor.g;')
      .replace(
        '#include <normal_fragment_maps>',
        `float woodHeight = woodBump * sampledDiffuseColor.r;
  normal = woodRelief( - vViewPosition, normal, vec2( dFdx( woodHeight ), dFdy( woodHeight ) ), faceDirection );`,
      )
  }
  material.customProgramCacheKey = () => (instanced ? 'kite-wood-instanced' : 'kite-wood')
  return material
}
