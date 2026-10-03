import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Foam play mats: everything is a thick slab cut from one outline, with a
// small rounded bevel, one matte material and a fine stipple (ART.md, "The
// look"). This module makes the slabs, the stipple and the two materials. It
// builds everything once; nothing here runs per frame.

export const BEVEL = 0.055

/**
 * A slab cut from an outline drawn in x and y, `depth` thick, centred on z, in one flat colour. Its rounded edge
 * is cut inside the outline, so the slab is exactly as wide as drawn. An outline with sharp teeth cannot be cut
 * that way (the inner edge crosses itself), so with `inset` false the edge is rounded outside the outline instead.
 */
export function slab(shape: THREE.Shape, depth: number, colour: THREE.ColorRepresentation, curveSegments = 10, inset = true): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    // The floor's edges are far from the eye and many: one step of bevel is enough there.
    depth: depth - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: inset ? -BEVEL : 0, bevelSegments: inset ? 2 : 1, curveSegments,
  })
  geometry.translate(0, 0, -depth / 2 + BEVEL)
  return paint(geometry, colour)
}

/** Gives every vertex one colour, so slabs of different colours can share a material and be merged. */
export function paint(geometry: THREE.BufferGeometry, colour: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(colour), count = geometry.attributes.position.count, colours = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) colours.set([c.r, c.g, c.b], i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  return geometry
}

/** One geometry from several, which are thrown away. */
export function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const whole = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)), false)!
  for (const part of parts) part.dispose()
  return whole
}

/** Lays a slab drawn upright down flat on the floor: its y becomes the way to the back wall, and its thickness stands up. */
export function laidFlat(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.rotateX(-Math.PI / 2)
}

export function disc(radius: number, x = 0, y = 0): THREE.Shape {
  const shape = new THREE.Shape()
  shape.absellipse(x, y, radius, radius, 0, Math.PI * 2, false, 0)
  return shape
}

export function roundedRect(x: number, y: number, width: number, height: number, radius: number): THREE.Shape {
  const r = Math.min(radius, width / 2, height / 2), shape = new THREE.Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false)
  shape.lineTo(x + width, y + height - r)
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false)
  shape.lineTo(x + r, y + height)
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false)
  shape.lineTo(x, y + r)
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return shape
}

/**
 * The fine stipple of the foam, as one small normal-map tile that repeats.
 * Dots are pressed into a height field at seeded places, so every load and
 * every still shows the same foam.
 */
export function stippleTile(size = 64): THREE.DataTexture {
  const height = new Float32Array(size * size)
  let s = 20261003
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let dot = 0; dot < size * size * 0.09; dot++) {
    const cx = random() * size, cy = random() * size, r = 1 + random() * 1.2, depth = 0.5 + random() * 0.5
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy) / r
      if (d >= 1) continue
      const x = (Math.floor(cx) + dx + size) % size, y = (Math.floor(cy) + dy + size) % size
      height[y * size + x] = Math.max(height[y * size + x], depth * (1 - d * d))
    }
  }
  const data = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = at(x - 1, y) - at(x + 1, y), ny = at(x, y - 1) - at(x, y + 1), length = Math.hypot(nx, ny, 1)
    data.set([Math.round((nx / length * 0.5 + 0.5) * 255), Math.round((ny / length * 0.5 + 0.5) * 255), Math.round((1 / length * 0.5 + 0.5) * 255), 255], (y * size + x) * 4)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.2, 2.2)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** The one foam material, with its stipple and without. Both exist from the start, so a tier change swaps and never compiles. */
export function foamMaterials(): { stippled: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial; stipple: THREE.DataTexture } {
  const stipple = stippleTile()
  const base = { vertexColors: true, roughness: 0.95, metalness: 0 }
  const stippled = new THREE.MeshStandardMaterial({ ...base, normalMap: stipple, normalScale: new THREE.Vector2(0.8, 0.8) })
  return { stippled, plain: new THREE.MeshStandardMaterial(base), stipple }
}

/** A soft round shadow to lay under a thing: no shadow map is ever drawn. */
export function blobTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2)
    const a = Math.max(0, 1 - d)
    data.set([255, 255, 255, Math.round(255 * a * a * (3 - 2 * a))], (y * size + x) * 4)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/**
 * The ghost hand: a white mitten with one finger out and a dark edge, drawn
 * from distances so it needs no canvas. Its fingertip is at the middle of the
 * top edge. It is a picture of a hand and no symbol to decode: it only ever
 * presses the thing a child could press.
 */
export function handTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const capsule = (x: number, y: number, ax: number, ay: number, bx: number, by: number, r: number): number => {
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
    return Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t) - r
  }
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    // x across, y up from the bottom edge, both 0..1.
    const x = (i + 0.5) / size, y = (j + 0.5) / size
    const d = Math.min(capsule(x, y, 0.5, 0.5, 0.5, 0.86, 0.085), capsule(x, y, 0.42, 0.2, 0.62, 0.36, 0.2), capsule(x, y, 0.3, 0.42, 0.34, 0.5, 0.07))
    const edge = 0.035, inside = Math.max(0, Math.min(1, -d / 0.015)), rim = Math.max(0, Math.min(1, (edge - d) / 0.015))
    const shade = Math.round(40 + 215 * inside)
    data.set([shade, shade, Math.round(46 + 209 * inside), Math.round(255 * rim)], (j * size + i) * 4)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

/** A soft ring, clear in the middle: the glow that lies round a thing and never over it, so a hat keeps its own colour while it is lit. */
export function ringTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2)
    const a = Math.max(0, Math.min(1, (d - 0.5) / 0.22)) * Math.max(0, Math.min(1, (1 - d) / 0.3))
    data.set([255, 255, 255, Math.round(255 * a)], (y * size + x) * 4)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
