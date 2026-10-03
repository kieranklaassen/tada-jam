// Moulding: how every toy in the yard is built. A toy is a handful of rounded
// parts, each painted one colour in its vertices and fused into a single
// geometry, so a toy is one draw call of the one satin plastic (ART.md, "The
// look"). The parts are made once when the yard is set up, never per frame.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { darker } from './look'

export type Part = THREE.BufferGeometry

const colour = new THREE.Color()

/** Paints a part one colour in its vertices, and drops what the one material does not read. */
export function paint(part: Part, hex: number): Part {
  const count = part.getAttribute('position').count
  const colours = new Float32Array(count * 3)
  colour.setHex(hex)
  for (let i = 0; i < count; i++) colour.toArray(colours, i * 3)
  part.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  part.deleteAttribute('uv')
  return part
}

/** A box with fat rounded edges: the basic blow-moulded shell. */
export function box(width: number, height: number, depth: number, radius: number, hex: number): Part {
  return paint(new RoundedBoxGeometry(width, height, depth, 3, Math.min(radius, width / 2, height / 2, depth / 2)), hex)
}

/** A shape turned on a lathe about the upright, from a profile of [radius, height] pairs, bottom first. */
export function lathe(profile: readonly (readonly [number, number])[], hex: number, segments = 20): Part {
  const points = profile.map(([radius, y]) => new THREE.Vector2(Math.max(0, radius), y))
  return paint(new THREE.LatheGeometry(points, segments), hex)
}

/** A ball, which can be squashed into a pebble or stretched into a body. */
export function ball(radius: number, hex: number, squash: readonly [number, number, number] = [1, 1, 1], detail = 14): Part {
  const part = new THREE.SphereGeometry(radius, detail, Math.max(6, Math.round(detail * 0.7)))
  part.scale(squash[0], squash[1], squash[2])
  return paint(part, hex)
}

/** A rod or a cone standing upright: a wheel on its side, a log, a post, an ear. */
export function rod(radiusTop: number, radiusBottom: number, height: number, hex: number, segments = 14): Part {
  return paint(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), hex)
}

/** A ring lying flat: the rim of a pool, a tyre. */
export function ring(radius: number, thickness: number, hex: number, segments = 24): Part {
  const part = new THREE.TorusGeometry(radius, thickness, 8, segments)
  part.rotateX(Math.PI / 2)
  return paint(part, hex)
}

/** Turns a part (about x, then y, then z) and then moves it into its place in the toy. */
export function at(part: Part, x: number, y: number, z: number, turnX = 0, turnY = 0, turnZ = 0): Part {
  if (turnX) part.rotateX(turnX)
  if (turnY) part.rotateY(turnY)
  if (turnZ) part.rotateZ(turnZ)
  part.translate(x, y, z)
  return part
}

/** The mould seam of a box-shaped shell of this width and height: a thin darker band round its middle, where the two halves meet, standing a hair proud. */
export function seam(width: number, height: number, radius: number, hex: number): Part {
  return box(width + 0.012, height + 0.012, 0.045, Math.min(radius, 0.02), darker(hex))
}

/** A screw boss: the small sunk dot where a toy's two halves are screwed together. */
export function boss(hex: number): Part {
  return at(rod(0.055, 0.055, 0.03, darker(hex, 0.7), 10), 0, 0, 0, Math.PI / 2)
}

/** Fuses the parts into one geometry: one toy, one draw call. The parts are used up. */
export function mould(parts: readonly Part[]): THREE.BufferGeometry {
  // Parts either all share vertices or none does; when they differ, none does.
  const mixed = parts.some((part) => !part.index) && parts.some((part) => part.index)
  const alike = mixed ? parts.map((part) => (part.index ? part.toNonIndexed() : part)) : parts
  const fused = mergeGeometries(alike as THREE.BufferGeometry[], false)
  for (const part of parts) part.dispose()
  if (mixed) for (const part of alike) part.dispose()
  if (!fused) throw new Error('parts of one toy must carry the same attributes')
  fused.computeBoundingSphere()
  return fused
}
