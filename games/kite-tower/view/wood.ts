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

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Value noise; with `period` (cells) it repeats along x, so long grain tiles seamlessly along the board. */
function noise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const x0 = period > 0 ? ((xi % period) + period) % period : xi
  const x1 = period > 0 ? (x0 + 1) % period : xi + 1
  const a = hash(x0, yi)
  const b = hash(x1, yi)
  const c = hash(x0, yi + 1)
  const d = hash(x1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Three octaves; with `period` the first octave repeats every `period` cells along x. */
function fbm(x: number, y: number, period = 0): number {
  return noise(x, y, period) * 0.55 + noise(x * 2 + 5, y * 2.1 + 1.3, period * 2) * 0.3 + noise(x * 4 + 9, y * 4.3 + 3.7, period * 4) * 0.15
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
  for (let py = 0; py < rows; py++) {
    const Y = py / PX_PER_UNIT
    for (let px = 0; px < width; px++) {
      const X = px / PX_PER_UNIT
      const warp = (fbm(X * 0.5, Y * 0.9, cells(0.5)) - 0.5) * 0.28 + Math.sin((X * Math.PI * 2) / REGION_W + Y * 0.5) * 0.025
      const phase = (Y + warp) * 8.5
      const ring = band(phase - Math.floor(phase))
      const streak = (noise(X * 1, Y * 38, cells(1)) - 0.5) * 0.9
      const pores = Math.max(0, noise(X * 3, Y * 90, cells(3)) - 0.62) * 2.2
      const fleck = Math.max(0, noise(X * 16 + 3, Y * 4.5, cells(16)) - 0.82) * 4
      const tone = (fbm(X * 0.75 + 11, Y * 0.8, cells(0.75)) - 0.5) * 0.05
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
  for (let py = 0; py < rows; py++) {
    const Y = py / PX_PER_UNIT
    for (let px = 0; px < width; px++) {
      const X = px / PX_PER_UNIT
      const dx = X - pithX
      const dy = Y - pithY
      const r = Math.hypot(dx, dy) + (fbm(X * 1.4, Y * 1.4) - 0.5) * 0.08
      const phase = r * 8.5
      const ring = band(phase - Math.floor(phase))
      const angle = Math.atan2(dy, dx)
      const rayPhase = angle * 260 + noise(X * 6, Y * 6) * 2
      const ray = Math.max(0, Math.sin(rayPhase) - 0.93) * 12
      const pores = Math.max(0, noise(X * 40, Y * 40) - 0.7) * 1.6
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
    roughnessMap: map,
    roughness: options.roughness ?? 0.95,
    metalness: 0,
    bumpMap: map,
    bumpScale: options.bump ?? 0.9,
  })
  const instanced = options.instanced ?? false
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec2 wear;\nvarying vec2 vWear;${instanced ? '\nattribute float grainShift;' : ''}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWear = wear;')
    if (instanced) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        '#include <uv_vertex>\nvMapUv.x += grainShift;\nvRoughnessMapUv.x += grainShift;\nvBumpMapUv.x += grainShift;',
      )
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWear;').replace(
      '#include <color_fragment>',
      `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
  diffuseColor.rgb *= mix( vColor.rgb, vec3( 1.0 ), vWear.x * 0.42 );
#else
  diffuseColor.rgb *= mix( diffuse, vec3( 1.0 ), vWear.x * 0.42 ) / max( diffuse, vec3( 0.001 ) );
#endif
  diffuseColor.rgb *= vWear.y;`,
    )
  }
  material.customProgramCacheKey = () => (instanced ? 'kite-wood-instanced' : 'kite-wood')
  return material
}
