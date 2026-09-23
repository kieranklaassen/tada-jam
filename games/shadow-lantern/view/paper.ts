import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Point } from '../geometry2d'
import { LAMP } from '../projection'

// Cut construction paper, built once. Every card is an SVG-like outline
// extruded 2–3 mm with a small bevel, coloured per vertex (face, back and
// cut edge), multiplied by one shared procedural grain texture. Static
// scenery bakes the lamp's warm Lambert light and the moon's cool fill into
// its vertex colours so it can be drawn unlit in a single merged mesh.

/** Hex sRGB to a colour in three's linear working space. */
export function paper(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

let grain: THREE.CanvasTexture | null = null

/** A 256² paper-fibre texture around white, tiled every few centimetres. Built once per page. */
export function grainTexture(): THREE.CanvasTexture {
  if (grain) return grain
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const image = g.createImageData(size, size)
  let seed = 7
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < size * size; i++) {
    const v = 238 + random() * 17
    image.data[i * 4] = v
    image.data[i * 4 + 1] = v
    image.data[i * 4 + 2] = v - 3
    image.data[i * 4 + 3] = 255
  }
  g.putImageData(image, 0, 0)
  // Fibres: short, faint, slightly curved strokes in every direction.
  g.lineCap = 'round'
  for (let i = 0; i < 520; i++) {
    const x = random() * size
    const y = random() * size
    const a = random() * Math.PI * 2
    const len = 3 + random() * 11
    g.strokeStyle = random() < 0.5 ? 'rgba(90,70,50,0.07)' : 'rgba(255,255,255,0.22)'
    g.lineWidth = 0.6 + random() * 0.9
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a + 0.5) * len * 0.5, y + Math.sin(a + 0.5) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len)
    g.stroke()
  }
  // Soft mottling, the way pressed pulp is never quite even.
  for (let i = 0; i < 60; i++) {
    const x = random() * size
    const y = random() * size
    const r = 10 + random() * 26
    const blot = g.createRadialGradient(x, y, 0, x, y, r)
    blot.addColorStop(0, random() < 0.5 ? 'rgba(80,60,40,0.045)' : 'rgba(255,255,255,0.06)')
    blot.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = blot
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  grain = new THREE.CanvasTexture(canvas)
  grain.wrapS = THREE.RepeatWrapping
  grain.wrapT = THREE.RepeatWrapping
  grain.colorSpace = THREE.SRGBColorSpace
  grain.anisotropy = 1
  grain.generateMipmaps = true
  grain.minFilter = THREE.LinearMipmapLinearFilter
  return grain
}

/** Paper grain is tiled every 7 cm. Cap UVs from ExtrudeGeometry are in centimetres. */
export const GRAIN_REPEAT = 1 / 7

function shapeOf(outline: readonly Point[]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(outline[0].x, outline[0].y)
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i].x, outline[i].y)
  shape.closePath()
  return shape
}

/**
 * An outline extruded into a card `depth` thick with a small bevel, centred
 * on z = 0 (so the face is at +depth/2). Non-indexed, with normals and UVs.
 */
export function cardGeometry(outline: readonly Point[], depth: number, bevel = Math.min(0.08, depth * 0.3)): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shapeOf(outline), {
    depth: Math.max(0.01, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 1,
    steps: 1,
  })
  geometry.translate(0, 0, -(depth - bevel * 2) / 2)
  return geometry.index ? geometry.toNonIndexed() : geometry
}

/** A flat outline (no thickness), facing +z. Non-indexed. */
export function flatGeometry(outline: readonly Point[]): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(shapeOf(outline), 1)
  return geometry.index ? geometry.toNonIndexed() : geometry
}

/** Colour every vertex: faces toward +z get `front`, toward −z `back`, bevels and cut edges `edge`. */
export function paintCard(geometry: THREE.BufferGeometry, front: THREE.Color, back: THREE.Color = front, edge: THREE.Color = front): THREE.BufferGeometry {
  const normal = geometry.getAttribute('normal')
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const nz = normal ? normal.getZ(i) : 1
    const c = nz > 0.7 ? front : nz < -0.7 ? back : edge
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export function paintFlat(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  return paintCard(geometry, color, color, color)
}

export type Bake = {
  /** Strength of the lamp's warm light (0 for things it cannot reach). */
  lamp: number
  /** Strength of the cool moonlight from high up and behind the screen. */
  moon: number
  /** Night ambient (always present). */
  ambient: number
}

const LAMP_COLOR = new THREE.Color('#ffd9a0')
const MOON_COLOR = new THREE.Color('#9fb4ff')
const NIGHT_COLOR = new THREE.Color('#5a5c9c')
const MOON_DIR = new THREE.Vector3(-0.35, 0.8, 0.5).normalize()

/**
 * Multiply a world-space geometry's vertex colours by baked light: a warm
 * Lambert term from the lamp with a gentle falloff, a cool moon fill, and a
 * dim indigo ambient. Paper is matte, so there is no specular term.
 */
export function bakeLight(geometry: THREE.BufferGeometry, bake: Bake): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const color = geometry.getAttribute('color')
  const n = new THREE.Vector3()
  const l = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    n.set(normal.getX(i), normal.getY(i), normal.getZ(i)).normalize()
    l.set(LAMP.x - position.getX(i), LAMP.y - position.getY(i), LAMP.z - position.getZ(i))
    const d = l.length()
    l.divideScalar(d || 1)
    const lambert = Math.max(0, n.dot(l))
    const falloff = 1 / (1 + (d / 85) ** 2)
    const lamp = bake.lamp * lambert * falloff * 2.1
    const moon = bake.moon * Math.max(0, n.dot(MOON_DIR))
    const r = NIGHT_COLOR.r * bake.ambient + LAMP_COLOR.r * lamp + MOON_COLOR.r * moon
    const g = NIGHT_COLOR.g * bake.ambient + LAMP_COLOR.g * lamp + MOON_COLOR.g * moon
    const b = NIGHT_COLOR.b * bake.ambient + LAMP_COLOR.b * lamp + MOON_COLOR.b * moon
    color.setXYZ(i, color.getX(i) * r, color.getY(i) * g, color.getZ(i) * b)
  }
  color.needsUpdate = true
  return geometry
}

/** Merge static pieces into one geometry; attributes are made to match first. */
export function mergeStatic(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = pieces.map((piece) => {
    const g = piece.index ? piece.toNonIndexed() : piece
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'color' && name !== 'uv' && name !== 'normal') g.deleteAttribute(name)
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2))
    return g
  })
  const merged = mergeGeometries(prepared, false)
  if (!merged) throw new Error('scenery merge failed')
  merged.deleteAttribute('normal')
  for (const piece of prepared) piece.dispose()
  return merged
}

/** Give a geometry planar UVs from its world x, y (for grain on flat-facing pieces like the screen). */
export function planarUV(geometry: THREE.BufferGeometry, axis: 'xy' | 'xz' = 'xy'): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = position.getX(i)
    uv[i * 2 + 1] = axis === 'xy' ? position.getY(i) : position.getZ(i)
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}

/**
 * Let an instanced mesh fade each instance: adds an `instanceAlpha`
 * attribute and multiplies it into the material's alpha.
 */
export function withInstanceAlpha(material: THREE.Material, mesh: THREE.InstancedMesh): THREE.InstancedBufferAttribute {
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count).fill(1), 1)
  alpha.setUsage(THREE.DynamicDrawUsage)
  mesh.geometry.setAttribute('instanceAlpha', alpha)
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instanceAlpha;\nvarying float vInstanceAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceAlpha = instanceAlpha;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceAlpha;')
      .replace('#include <alphatest_fragment>', 'diffuseColor.a *= vInstanceAlpha;\n#include <alphatest_fragment>')
  }
  material.customProgramCacheKey = () => 'instance-alpha'
  return alpha
}

/** A soft round spot (white centre to clear edge) for halos, glows and contact shadows. */
export function softSpotTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const spot = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  spot.addColorStop(0, 'rgba(255,255,255,1)')
  spot.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  spot.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = spot
  g.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
