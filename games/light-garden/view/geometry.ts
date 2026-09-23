import * as THREE from 'three'
import { FILTER_HALF, KNOB, MIRROR_HALF, PANEL, PRISM_RADIUS, slotPoint, TRAY, type CreatureKind, type PieceKind } from '../layout'
import { PART } from './materials'
import { PALETTE, type RGB } from './palette'

// Every mesh is built once per page from a few primitives, merged into one
// geometry per object with a colour, a part id (which bit a creature's vertex
// shader moves), and a glow weight (emissive bits: lamp lenses, the lantern
// dome, a moth's eyespots). Units are centimetres on the table: x right, z
// toward the child, y up; the panel's surface is y = 0.

const WHITE: RGB = [1, 1, 1]

class Builder {
  private positions: number[] = []
  private normals: number[] = []
  private colours: number[] = []
  private parts: number[] = []
  private glows: number[] = []
  private indices: number[] = []
  private readonly v = new THREE.Vector3()
  private readonly n = new THREE.Vector3()
  private readonly normalMatrix = new THREE.Matrix3()

  add(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, colour: RGB = WHITE, part: number = PART.rigid, glow = 0): this {
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    this.normalMatrix.getNormalMatrix(matrix)
    const base = this.positions.length / 3
    for (let i = 0; i < position.count; i++) {
      this.v.fromBufferAttribute(position, i).applyMatrix4(matrix)
      this.n.fromBufferAttribute(normal, i).applyMatrix3(this.normalMatrix).normalize()
      this.positions.push(this.v.x, this.v.y, this.v.z)
      this.normals.push(this.n.x, this.n.y, this.n.z)
      this.colours.push(colour[0], colour[1], colour[2])
      this.parts.push(part)
      this.glows.push(glow)
    }
    const index = geometry.getIndex()
    if (index) for (let i = 0; i < index.count; i++) this.indices.push(base + index.getX(i))
    else for (let i = 0; i < position.count; i++) this.indices.push(base + i)
    geometry.dispose()
    return this
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3))
    geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(this.parts, 1))
    geometry.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glows, 1))
    geometry.setIndex(this.indices)
    geometry.computeBoundingSphere()
    return geometry
  }
}

const euler = new THREE.Euler()
const quaternion = new THREE.Quaternion()

/** A transform: translate, rotate (XYZ radians), scale. */
function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.Matrix4 {
  quaternion.setFromEuler(euler.set(rx, ry, rz))
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), quaternion, new THREE.Vector3(sx, sy, sz))
}

const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

/** Flat-shaded copy (for faceted glass like the prism). */
function faceted(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  flat.computeVertexNormals()
  return flat
}

function roundedBox(width: number, height: number, depth: number, radius: number, segments = 3): THREE.BufferGeometry {
  // A box with softened edges: a capsule-cornered extrusion is overkill here, so blend a box toward a scaled sphere.
  const box = new THREE.BoxGeometry(width, height, depth, segments * 2, segments, segments)
  const position = box.getAttribute('position')
  const v = new THREE.Vector3()
  const hx = width / 2 - radius
  const hy = height / 2 - radius
  const hz = depth / 2 - radius
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i)
    const inner = new THREE.Vector3(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)))
    const out = v.clone().sub(inner)
    if (out.lengthSq() > 0) out.setLength(radius)
    position.setXYZ(i, inner.x + out.x, inner.y + out.y, inner.z + out.z)
  }
  box.computeVertexNormals()
  return box
}

/** The knob: a slim arm from the piece to a bead the child can grab and swing. */
function addKnob(builder: Builder, kind: PieceKind): void {
  const knob = KNOB[kind]
  const dx = Math.cos(knob.angle)
  const dz = Math.sin(knob.angle)
  const start = kind === 'lamp' ? 3.2 : kind === 'prism' ? 3.1 : 1.2
  const length = knob.distance - start - 0.9
  const mid = start + length / 2
  const yaw = -Math.atan2(dz, dx)
  builder.add(roundedBox(length, 0.45, 0.6, 0.2, 1), at(dx * mid, 0.55, dz * mid, 0, yaw, 0), [0.86, 0.93, 0.92], PART.knob)
  builder.add(new THREE.SphereGeometry(1.3, 16, 10), at(dx * knob.distance, 1.05, dz * knob.distance, 0, 0, 0, 1, 0.78, 1), [0.97, 1, 0.99], PART.knob, 0.16)
  builder.add(new THREE.TorusGeometry(1.35, 0.22, 6, 20), at(dx * knob.distance, 0.45, dz * knob.distance, Math.PI / 2), [0.8, 0.9, 0.9], PART.knob)
}

function lamp(): THREE.BufferGeometry {
  const b = new Builder()
  const brass: RGB = [0.95, 0.74, 0.4]
  b.add(new THREE.CylinderGeometry(3.4, 3.6, 0.9, 24), at(0, 0.45, 0), scale(WHITE, 0.72))
  b.add(new THREE.CylinderGeometry(2.8, 3.2, 2.3, 24), at(0, 2.0, 0))
  b.add(new THREE.TorusGeometry(2.85, 0.28, 8, 28), at(0, 3.1, 0, Math.PI / 2), brass)
  // The lantern dome glows softly: this is where the light comes from.
  b.add(new THREE.SphereGeometry(2.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 3.15, 0, 0, 0, 0, 1, 0.72, 1), [1, 0.97, 0.9], PART.rigid, 0.55)
  b.add(new THREE.SphereGeometry(0.55, 12, 8), at(0, 5.05, 0), brass)
  b.add(new THREE.CylinderGeometry(1.35, 1.2, 2.3, 20), at(3.3, 1.9, 0, 0, 0, -Math.PI / 2), brass)
  b.add(new THREE.CircleGeometry(1.12, 20), at(4.46, 1.9, 0, 0, Math.PI / 2, 0), [1, 0.98, 0.92], PART.rigid, 1.2)
  addKnob(b, 'lamp')
  return b.build()
}

function mirror(): THREE.BufferGeometry {
  const b = new Builder()
  const length = MIRROR_HALF * 2
  const foot: RGB = [0.72, 0.86, 0.84]
  b.add(roundedBox(length + 0.6, 0.9, 2.4, 0.4), at(0, 0.45, 0), foot)
  b.add(new THREE.BoxGeometry(length, 3.4, 0.62, 1, 1, 1), at(0, 2.5, 0), [0.92, 0.96, 1], PART.mirrorFace)
  b.add(roundedBox(length + 0.4, 0.42, 0.9, 0.18), at(0, 4.25, 0), foot)
  for (const end of [-1, 1]) b.add(new THREE.CylinderGeometry(0.5, 0.5, 3.9, 12), at(end * (MIRROR_HALF + 0.1), 2.45, 0), [0.9, 1, 0.98])
  addKnob(b, 'mirror')
  return b.build()
}

function filterPane(): THREE.BufferGeometry {
  const b = new Builder()
  const length = FILTER_HALF * 2
  const frame: RGB = [1, 1, 1]
  b.add(roundedBox(length + 0.8, 0.9, 2.2, 0.4), at(0, 0.45, 0), [0.62, 0.64, 0.64])
  b.add(roundedBox(length, 3.8, 0.7, 0.25), at(0, 2.7, 0))
  b.add(roundedBox(length + 0.5, 0.4, 0.95, 0.18), at(0, 4.7, 0), scale(frame, 1.25))
  for (const end of [-1, 1]) b.add(new THREE.CylinderGeometry(0.45, 0.45, 4.2, 10), at(end * (FILTER_HALF + 0.15), 2.6, 0), scale(frame, 1.25))
  addKnob(b, 'filter')
  return b.build()
}

function prism(): THREE.BufferGeometry {
  const b = new Builder()
  // Three segments starting at +x put a vertex where the optics expects its first one.
  b.add(faceted(new THREE.CylinderGeometry(PRISM_RADIUS, PRISM_RADIUS, 3.4, 3, 1, false, Math.PI / 2)), at(0, 1.95, 0), WHITE, PART.prismGlass)
  b.add(faceted(new THREE.CylinderGeometry(PRISM_RADIUS + 0.35, PRISM_RADIUS + 0.35, 0.3, 3, 1, false, Math.PI / 2)), at(0, 0.15, 0), [0.8, 0.9, 0.92], PART.prismGlass)
  addKnob(b, 'prism')
  return b.build()
}

export function pieceGeometry(kind: PieceKind): THREE.BufferGeometry {
  switch (kind) {
    case 'lamp':
      return lamp()
    case 'mirror':
      return mirror()
    case 'filter':
      return filterPane()
    case 'prism':
      return prism()
    default: {
      const never: never = kind
      return never
    }
  }
}

// --- creatures ---------------------------------------------------------------

function moth(): THREE.BufferGeometry {
  const b = new Builder()
  const fuzz: RGB = [1, 0.97, 0.92]
  b.add(new THREE.CapsuleGeometry(1.0, 2.6, 6, 14), at(-0.3, 2.3, 0, 0, 0, Math.PI / 2), fuzz)
  b.add(new THREE.SphereGeometry(1.15, 16, 12), at(2.1, 2.55, 0), fuzz)
  for (const side of [1, -1]) {
    const part = side > 0 ? PART.a : PART.b
    b.add(new THREE.SphereGeometry(1, 20, 10), at(0.7, 2.45, side * 2.35, 0, side * 0.35, 0, 2.2, 0.16, 1.9), WHITE, part)
    b.add(new THREE.SphereGeometry(1, 16, 8), at(-1.3, 2.4, side * 1.85, 0, -side * 0.5, 0, 1.6, 0.15, 1.35), scale(WHITE, 0.95), part)
    // Eyespots glow in the moth's light once it is awake.
    b.add(new THREE.SphereGeometry(0.62, 12, 6), at(0.9, 2.62, side * 2.7, 0, 0, 0, 1, 0.3, 1), [0.86, 0.8, 1], part, 0.4)
    b.add(new THREE.CapsuleGeometry(0.1, 2.0, 2, 6), at(2.9, 3.6, side * 0.45, side * 0.35, 0, -0.55), fuzz, PART.c)
    b.add(new THREE.SphereGeometry(0.28, 8, 6), at(3.5, 4.5, side * 0.8), [1, 0.95, 0.85], PART.c, 0.3)
  }
  return b.build()
}

function fish(): THREE.BufferGeometry {
  const b = new Builder()
  const belly: RGB = [1.05, 1.0, 0.95]
  b.add(new THREE.SphereGeometry(1, 28, 18), at(0.2, 2.5, 0, 0, 0, 0, 3.3, 2.1, 1.55))
  b.add(new THREE.SphereGeometry(1, 20, 12), at(0.5, 1.9, 0, 0, 0, 0, 2.5, 1.2, 1.2), belly)
  b.add(new THREE.SphereGeometry(1, 16, 8), at(-0.2, 4.35, 0, 0, 0, -0.35, 1.7, 0.95, 0.18), scale(WHITE, 1.05))
  for (const tilt of [0.55, -0.55]) b.add(new THREE.SphereGeometry(1, 16, 8), at(-4.0, 2.5 + tilt * 1.3, 0, 0, 0, tilt, 1.6, 0.85, 0.2), scale(WHITE, 1.05), PART.a)
  for (const side of [1, -1]) b.add(new THREE.SphereGeometry(1, 12, 6), at(0.4, 2.0, side * 1.55, side * 0.5, 0, -0.4, 1.05, 0.14, 0.7), scale(WHITE, 1.1), PART.b)
  b.add(new THREE.TorusGeometry(0.42, 0.16, 6, 14), at(3.45, 2.35, 0, 0, Math.PI / 2, 0), [1.05, 0.8, 0.78])
  return b.build()
}

function snail(): THREE.BufferGeometry {
  const b = new Builder()
  const body: RGB = [0.98, 0.95, 0.8]
  const shell: RGB = [1, 1, 1]
  // The foot and head (they slide out of the shell together).
  b.add(new THREE.CapsuleGeometry(0.85, 5.2, 6, 14), at(0.2, 0.85, 0, 0, 0, Math.PI / 2, 1, 1, 1.25), body, PART.a)
  b.add(new THREE.SphereGeometry(1.1, 16, 12), at(2.9, 1.55, 0), body, PART.a)
  for (const side of [1, -1]) {
    const part = side > 0 ? PART.b : PART.c
    b.add(new THREE.CapsuleGeometry(0.18, 2.0, 3, 8), at(3.05, 3.0, side * 0.6, side * 0.25, 0, -0.35), body, part)
    b.add(new THREE.SphereGeometry(0.36, 10, 8), at(3.45, 4.1, side * 0.75), body, part, 0.2)
  }
  // A coiled shell: nested rings that shrink and bulge outward.
  const coil = [
    { r: 2.1, tube: 1.05, z: 0, k: 1 },
    { r: 1.25, tube: 0.72, z: 0.55, k: 0.9 },
    { r: 0.55, tube: 0.45, z: 0.95, k: 0.8 },
  ]
  for (const ring of coil) b.add(new THREE.TorusGeometry(ring.r, ring.tube, 12, 28), at(-0.7, 3.35, ring.z, 0, 0, 0, 1, 1, 1.25), scale(shell, ring.k))
  b.add(new THREE.SphereGeometry(0.5, 10, 8), at(-0.7, 3.35, 1.35), scale(shell, 0.75), PART.rigid, 0.25)
  b.add(new THREE.SphereGeometry(1, 20, 14), at(-0.7, 3.35, -0.35, 0, 0, 0, 2.6, 2.6, 1.1), scale(shell, 0.92))
  return b.build()
}

function jelly(): THREE.BufferGeometry {
  const b = new Builder()
  b.add(new THREE.SphereGeometry(2.9, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 3.6, 0, 0, 0, 0, 1, 0.9, 1), WHITE, PART.a)
  b.add(new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 3.75, 0, 0, 0, 0, 1, 0.85, 1), [1, 1, 1], PART.a, 0.5)
  b.add(new THREE.TorusGeometry(2.8, 0.34, 8, 36), at(0, 3.6, 0, Math.PI / 2), scale(WHITE, 1.05), PART.a)
  const count = 7
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.3
    const radius = i % 2 ? 2.1 : 1.3
    b.add(new THREE.CapsuleGeometry(i % 2 ? 0.14 : 0.26, 3.0, 3, 6, 6), at(Math.cos(angle) * radius, 2.0, Math.sin(angle) * radius), scale(WHITE, i % 2 ? 1.05 : 0.95), PART.b)
  }
  return b.build()
}

export function creatureGeometry(kind: CreatureKind): THREE.BufferGeometry {
  switch (kind) {
    case 'moth':
      return moth()
    case 'fish':
      return fish()
    case 'snail':
      return snail()
    case 'jelly':
      return jelly()
    default: {
      const never: never = kind
      return never
    }
  }
}

/** Where each creature's eyes sit (local, before any part moves); a snail's ride its stalk tips. */
export const EYES: Readonly<Record<CreatureKind, { x: number; y: number; z: number; size: number }>> = {
  moth: { x: 2.95, y: 2.85, z: 0.55, size: 0.62 },
  fish: { x: 2.45, y: 3.1, z: 1.12, size: 0.72 },
  snail: { x: 3.55, y: 4.25, z: 0.75, size: 0.46 },
  jelly: { x: 2.45, y: 4.1, z: 0.85, size: 0.62 },
}

// --- table and room -----------------------------------------------------------

export function tableGeometry(): THREE.BufferGeometry {
  const b = new Builder()
  const top = 0.9
  const bottom = -11
  const outer = { minX: PANEL.minX - 8, maxX: PANEL.maxX + 8, minZ: PANEL.minY - 8, maxZ: TRAY.maxY + 5 }
  const box = (minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, colour: RGB, glow = 0) =>
    b.add(new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ), at((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2), colour, PART.rigid, glow)
  // Rails around the panel (the frame is darker than the glowing top so the play area reads).
  box(outer.minX, outer.maxX, bottom, top, outer.minZ, PANEL.minY - 0.6, PALETTE.frame)
  box(outer.minX, PANEL.minX - 0.6, bottom, top, PANEL.minY - 0.6, PANEL.maxY + 0.6, PALETTE.frame)
  box(PANEL.maxX + 0.6, outer.maxX, bottom, top, PANEL.minY - 0.6, PANEL.maxY + 0.6, PALETTE.frame)
  // The near lip holds the tray.
  box(outer.minX, outer.maxX, bottom, top, PANEL.maxY + 0.6, TRAY.minY, PALETTE.frame)
  box(outer.minX, outer.maxX, bottom, top, TRAY.maxY, outer.maxZ, PALETTE.frame)
  box(outer.minX, TRAY.minX, bottom, top, TRAY.minY, TRAY.maxY, PALETTE.frame)
  box(TRAY.maxX, outer.maxX, bottom, top, TRAY.minY, TRAY.maxY, PALETTE.frame)
  box(TRAY.minX, TRAY.maxX, bottom, 0.1, TRAY.minY, TRAY.maxY, PALETTE.felt)
  for (let slot = 0; slot < 8; slot++) {
    const p = slotPoint(slot)
    b.add(new THREE.CylinderGeometry(6.3, 6.3, 0.06, 32), at(p.x, 0.13, p.y), PALETTE.feltSlot)
  }
  // The acrylic edge of the light panel glows where it meets the frame.
  const edge = scale(PALETTE.panelRim, 0.7)
  box(PANEL.minX - 0.6, PANEL.maxX + 0.6, -0.4, 0.25, PANEL.minY - 0.6, PANEL.minY, edge, 0.12)
  box(PANEL.minX - 0.6, PANEL.maxX + 0.6, -0.4, 0.25, PANEL.maxY, PANEL.maxY + 0.6, edge, 0.12)
  box(PANEL.minX - 0.6, PANEL.minX, -0.4, 0.25, PANEL.minY, PANEL.maxY, edge, 0.12)
  box(PANEL.maxX, PANEL.maxX + 0.6, -0.4, 0.25, PANEL.minY, PANEL.maxY, edge, 0.12)
  // Rounded top edges catch the light: thin lighter strips along the rails.
  box(outer.minX, outer.maxX, top - 0.02, top + 0.04, outer.maxZ - 0.8, outer.maxZ, PALETTE.frameTop)
  // The front and sides of the table drop into the dark.
  box(outer.minX - 0.01, outer.maxX + 0.01, bottom, top - 0.2, outer.maxZ, outer.maxZ + 0.01, PALETTE.frameSide)
  return b.build()
}

export function panelGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(PANEL.maxX - PANEL.minX, PANEL.maxY - PANEL.minY)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate((PANEL.minX + PANEL.maxX) / 2, 0, (PANEL.minY + PANEL.maxY) / 2)
  return geometry
}

export function roomGeometry(): THREE.BufferGeometry {
  const floor = new THREE.PlaneGeometry(1400, 1400)
  floor.rotateX(-Math.PI / 2)
  floor.translate(0, -11, 0)
  return floor
}
