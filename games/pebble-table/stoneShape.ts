import { STONE_RADIUS, type Quarters } from './layout'

// One set of dimensions for a stone: the drawn pebble (and its cut halves and
// quarters) and the collider it rests and stacks on are both built from the
// vertices here, so what is drawn is what collides.

export type Cut = 'whole' | 'half' | 'quarter'

export const STONE_CUTS: Record<Quarters, Cut> = { 4: 'whole', 2: 'half', 1: 'quarter' }

/** Every piece is cut from a whole stone, so every size is drawn at the whole stone's radius (cm). */
export const STONE_DRAWN_RADIUS = STONE_RADIUS * 0.1

/** Grid of the table's stones; the collider is measured on the same grid. */
export const STONE_SEGMENTS = 28

export function pebbleRings(segments: number): number {
  return Math.max(4, Math.round(segments * 0.7))
}

/** A unit sphere point pressed into a pebble: flattened belly, lower dome, a little wobble. */
function pebblePoint(x: number, y: number, z: number, out: number[], at: number): void {
  const flat = y * (y < 0 ? 0.3 : 0.47)
  const wobble = 1 + Math.sin(x * 3.1 + z * 2.3) * 0.03 + Math.sin(z * 5.7 + y * 4) * 0.012
  out[at] = x * wobble
  out[at + 1] = flat
  out[at + 2] = z * 0.94 * wobble
}

/**
 * Unit-radius vertices of a pebble or a piece cut from one, in the vertex
 * order of a three.js sphere of `segments` × `pebbleRings(segments)`. Cut
 * faces are flat, and each piece is centred on its own footprint so the
 * body's origin, its shadow, and its place in the game rules sit under it.
 */
export function stoneVertices(cut: Cut, segments: number): Float32Array {
  const rings = pebbleRings(segments)
  const out: number[] = new Array((segments + 1) * (rings + 1) * 3)
  let at = 0
  for (let iy = 0; iy <= rings; iy++) {
    const v = iy / rings
    for (let ix = 0; ix <= segments; ix++) {
      const u = ix / segments
      pebblePoint(-Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI), Math.cos(v * Math.PI), Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI), out, at)
      if (cut !== 'whole') out[at] = Math.min(out[at], 0) + (cut === 'half' ? 0.22 : 0.18)
      if (cut === 'quarter') out[at + 2] = Math.min(out[at + 2], 0) + 0.18
      at += 3
    }
  }
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < out.length; i += 3) {
    minX = Math.min(minX, out[i])
    maxX = Math.max(maxX, out[i])
    minZ = Math.min(minZ, out[i + 2])
    maxZ = Math.max(maxZ, out[i + 2])
  }
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  for (let i = 0; i < out.length; i += 3) {
    out[i] -= cx
    out[i + 2] -= cz
  }
  return Float32Array.from(out)
}

/** Directions of the collider's side faces: an octagon, as few sides as the old cylinders so a spill costs the same. */
export const OUTLINE_SIDES = 8

/** The collider: how far the drawn piece reaches along each side's outward normal (angle k·45° from +x toward +z), and its bottom and top, in cm. */
export type StoneOutline = { reach: number[]; bottom: number; top: number }

const outlines = new Map<Cut, StoneOutline>()

export function stoneOutline(cut: Cut): StoneOutline {
  let outline = outlines.get(cut)
  if (outline) return outline
  const vertices = stoneVertices(cut, STONE_SEGMENTS)
  const reach = new Array<number>(OUTLINE_SIDES).fill(-Infinity)
  let bottom = Infinity
  let top = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const [x, y, z] = [vertices[i], vertices[i + 1], vertices[i + 2]]
    bottom = Math.min(bottom, y)
    top = Math.max(top, y)
    for (let k = 0; k < OUTLINE_SIDES; k++) {
      const angle = (k / OUTLINE_SIDES) * Math.PI * 2
      reach[k] = Math.max(reach[k], x * Math.cos(angle) + z * Math.sin(angle))
    }
  }
  outline = { reach: reach.map((r) => r * STONE_DRAWN_RADIUS), bottom: bottom * STONE_DRAWN_RADIUS, top: top * STONE_DRAWN_RADIUS }
  outlines.set(cut, outline)
  return outline
}

/**
 * Corners of the outline, counterclockwise from +x toward +z. A side that
 * only touches the piece at a corner (a cut piece's square shoulders) has no
 * length, so its two corners are one.
 */
export function outlineCorners(reach: readonly number[]): { x: number; z: number }[] {
  const n = reach.length
  const step = Math.sin((Math.PI * 2) / n)
  const corners = reach.map((r, k) => {
    const a = (k / n) * Math.PI * 2
    const b = (((k + 1) % n) / n) * Math.PI * 2
    const next = reach[(k + 1) % n]
    return { x: (r * Math.sin(b) - next * Math.sin(a)) / step, z: (Math.cos(a) * next - Math.cos(b) * r) / step }
  })
  return corners.filter((c, k) => {
    const next = corners[(k + 1) % n]
    return Math.hypot(c.x - next.x, c.z - next.z) > 1e-3
  })
}

/** Height of a resting piece's origin above what it rests on. */
export function stoneRest(q: Quarters): number {
  return -stoneOutline(STONE_CUTS[q]).bottom
}
