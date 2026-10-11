import * as THREE from 'three'
import { BAR, CROWD, GATE, KEEPER, MAYOR, STREET, YARD } from '../places'
import { addOnlooker } from './people'
import { Sculpt, quiet } from './sculpt'

// The place round the street, sculpted once: a row of painted house fronts,
// the mayor's stand, the gate's posts and arch, lamp posts and strings of
// bunting in one mesh, and the crowd along both kerbs in another. The two
// leaves of the gate are a mesh of their own, since they swing. All of it is
// painted quieter than anything a child can touch, and nothing in it changes;
// its flags, fringes and big heads move in the vertex shader.

const PI = Math.PI

/** A soft shadow under something that never moves: where, how wide and deep, and how dark. */
export type Blob = { x: number; z: number; wide: number; deep: number; dark: number }

const FLAGS = [0xd8343c, 0xffd23c, 0x2f7fe0, 0x35b07a, 0xf08ab0, 0xfdf3dc].map((hex) => quiet(hex, 0.18))

/** A string of bunting from one point to another, sagging in the middle, with a flag every so often. */
function bunting(sculpt: Sculpt, from: readonly [number, number, number], to: readonly [number, number, number], flags: number, seed: number): void {
  const along = Math.atan2(to[2] - from[2], to[0] - from[0])
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags, sag = Math.sin(t * PI) * 0.55
    const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t - sag, z = from[2] + (to[2] - from[2]) * t
    sculpt.strip(0.5, 0.62, { c: FLAGS[(i + seed) % FLAGS.length] }, { at: [x, y, z], turn: [0, -along, 0], sway: [0.07, i * 1.9 + seed, 0] })
  }
  // The string itself: a thin sagging line of short tubes.
  const pieces = 8
  for (let i = 0; i < pieces; i++) {
    const t0 = i / pieces, t1 = (i + 1) / pieces
    const p = (t: number): THREE.Vector3 => new THREE.Vector3(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - Math.sin(t * PI) * 0.55, from[2] + (to[2] - from[2]) * t)
    const a = p(t0), b = p(t1), long = a.distanceTo(b), dir = b.clone().sub(a).normalize()
    const turn = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), 'XYZ')
    sculpt.tube(0.025, 0.025, long, { c: quiet(0x6a4630, 0.2) }, { at: [a.x, a.y, a.z], turn: [turn.x, turn.y, turn.z], lump: 0 }, 4)
  }
}

function house(sculpt: Sculpt, x: number, wide: number, high: number, wall: number, roof: number, which: number): void {
  const z = -8.2, deep = 2.4
  sculpt.box(wide, high, deep, { c: wall }, { at: [x, 0, z] })
  // A roof with a ridge, seen from above: a long prism.
  sculpt.add(new THREE.CylinderGeometry(wide * 0.62, wide * 0.62, deep + 0.5, 3, 1).rotateX(PI / 2).rotateZ(PI / 2), { c: roof }, { at: [x, high + wide * 0.3, z], size: [1, 0.55, 1], hard: true })
  // Windows with shutters, and a door or an awning at street level.
  const rows = Math.max(1, Math.floor((high - 2.2) / 1.7)), cols = Math.max(1, Math.floor(wide / 1.5))
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = x - wide / 2 + (col + 0.5) * (wide / cols), wy = 2.5 + row * 1.7
      sculpt.box(0.7, 1.0, 0.1, { c: quiet(0x2c5f7a, 0.3) }, { at: [wx, wy, z + deep / 2] })
      sculpt.box(0.24, 1.0, 0.14, { c: roof }, { at: [wx - 0.5, wy, z + deep / 2] })
      sculpt.box(0.24, 1.0, 0.14, { c: roof }, { at: [wx + 0.5, wy, z + deep / 2] })
    }
  }
  if (which % 2 === 0) sculpt.box(wide * 0.8, 0.14, 0.9, { c: quiet(0xd8343c, 0.3), c2: quiet(0xfdf3dc, 0.15), pattern: 'bars', count: 1.6 }, { at: [x, 1.9, z + deep / 2 + 0.4], turn: [0.35, 0, 0] })
  else sculpt.box(0.9, 1.7, 0.1, { c: roof }, { at: [x, 0, z + deep / 2] })
}

/** The setting, and apart from it the crowd, which is a mesh of its own so that what touches an onlooker is told from what touches a wall. */
export function makeSetting(): { geometry: THREE.BufferGeometry; crowd: THREE.BufferGeometry; blobs: Blob[] } {
  const sculpt = new Sculpt(true), crowd = new Sculpt(true), blobs: Blob[] = []
  const walls = [0xf2c6a0, 0xbfe0c8, 0xf5d98a, 0xc9c4ee, 0xf2b0b8, 0xbcdcf0, 0xf0d0a0].map((hex) => quiet(hex, 0.3))
  const roofs = [0xc8684a, 0x7a9a6a, 0xb0563c, 0x6a6aa8, 0xc8684a, 0x5a8aa8, 0xb0563c].map((hex) => quiet(hex, 0.3))
  // The row of houses behind the far pavement.
  const fronts: readonly [number, number, number][] = [[-12.4, 4.0, 6.2], [-8.3, 4.2, 7.4], [-4.3, 3.6, 5.6], [-0.4, 4.2, 6.8], [3.6, 3.6, 5.8], [7.5, 4.2, 7.2], [11.7, 4.0, 6.0]]
  fronts.forEach(([x, wide, high], which) => house(sculpt, x, wide, high, walls[which], roofs[which], which))
  blobs.push({ x: 0, z: -6.7, wide: 30, deep: 1.6, dark: 0.8 })

  // The mayor's stand: a striped box with a rail, a fringe along its top and a swag of bunting.
  const standX = (MAYOR.x0 + MAYOR.x1) / 2, standWide = MAYOR.x1 - MAYOR.x0 + 2.4
  sculpt.box(standWide, MAYOR.floor, 1.7, { c: 0xd8343c, c2: 0xfdf3dc, pattern: 'bars', count: 1.1 }, { at: [standX, 0, MAYOR.z] })
  sculpt.box(standWide + 0.2, 0.12, 1.9, { c: quiet(0xffd23c, 0.15) }, { at: [standX, MAYOR.floor, MAYOR.z] })
  sculpt.tube(0.07, 0.07, standWide, { c: quiet(0xffd23c, 0.15) }, { at: [standX - standWide / 2, MAYOR.floor + 0.62, MAYOR.z + 0.86], turn: [0, 0, -PI / 2], lump: 0 }, 6)
  for (let i = 0; i <= 4; i++) sculpt.tube(0.06, 0.06, 0.62, { c: quiet(0xffd23c, 0.15) }, { at: [standX - standWide / 2 + (i * standWide) / 4, MAYOR.floor, MAYOR.z + 0.86], lump: 0 }, 6)
  for (let i = 0; i < 26; i++) sculpt.strip(0.2, 0.34, { c: i % 2 ? 0x2f7fe0 : 0xffd23c }, { at: [standX - standWide / 2 + 0.1 + (i * (standWide - 0.2)) / 25, MAYOR.floor, MAYOR.z + 0.97], sway: [0.035, i * 1.1, 0] })
  blobs.push({ x: standX + 0.3, z: MAYOR.z + 0.5, wide: standWide + 0.8, deep: 2.6, dark: 1 })

  // The gate: two striped posts, an arch with a fringe and poms, and a dark way through behind it. Its leaves are apart.
  const post = { c: 0xffd23c, c2: 0xd8343c, pattern: 'bands' as const, count: 1.4 }
  const postHigh = GATE.high - GATE.half
  sculpt.tube(0.2, 0.24, postHigh, post, { at: [GATE.x - GATE.half, 0, GATE.z], lump: 0.02 })
  sculpt.tube(0.2, 0.24, postHigh, post, { at: [GATE.x + GATE.half, 0, GATE.z], lump: 0.02 })
  sculpt.ring(GATE.half, 0.2, { c: 0xffd23c }, { at: [GATE.x, postHigh, GATE.z], lump: 0.03 }, PI)
  sculpt.ball(0.3, { c: 0xd8343c }, { at: [GATE.x - GATE.half, postHigh + 0.12, GATE.z], lump: 0.03 })
  sculpt.ball(0.3, { c: 0xd8343c }, { at: [GATE.x + GATE.half, postHigh + 0.12, GATE.z], lump: 0.03 })
  sculpt.ball(0.34, { c: 0x2f7fe0 }, { at: [GATE.x, GATE.high + 0.2, GATE.z], lump: 0.03 })
  for (let i = 0; i < 13; i++) {
    const a = (i + 0.5) / 13 * PI
    sculpt.strip(0.24, 0.42, { c: i % 2 ? 0xd8343c : 0x2f7fe0 }, { at: [GATE.x + Math.cos(a) * (GATE.half - 0.2), postHigh + Math.sin(a) * (GATE.half - 0.2), GATE.z + 0.2], sway: [0.04, i * 1.4, 0] })
  }
  // The short bar on the near post, where the gate keeper keeps a hand.
  sculpt.tube(0.06, 0.06, GATE.x - GATE.half - BAR.x + 0.1, { c: quiet(0x3a2a52, 0.1) }, { at: [BAR.x - 0.1, BAR.y, BAR.z], turn: [0, 0, -PI / 2], lump: 0 }, 5)
  // Behind the gate a yard where the next street waits, and a dark way on through the houses.
  sculpt.box(GATE.half * 2 + 0.6, 0.02, 2.6, { c: quiet(0x8a6a8a, 0.3) }, { at: [GATE.x, 0, YARD.z - 0.2] })
  sculpt.box(GATE.half * 2 - 0.2, GATE.high - 0.5, 0.14, { c: 0x2a1f4a }, { at: [GATE.x, 0, YARD.z - 1.55] })
  blobs.push({ x: GATE.x + 0.3, z: GATE.z + 0.4, wide: GATE.half * 2 + 1.2, deep: 1.4, dark: 0.9 })
  blobs.push({ x: KEEPER.x + 0.2, z: KEEPER.z + 0.25, wide: 1.5, deep: 1.0, dark: 0.9 })

  // Lamp posts at both ends of the street, with bunting strung between them and the gate.
  const lamps: readonly [number, number][] = [[STREET.x0 - 1.5, -5.5], [STREET.x1 + 1.5, -5.6], [-1.7, -5.3], [STREET.x0 - 1.4, 3.9], [STREET.x1 + 1.4, 3.9]]
  for (const [x, z] of lamps) {
    sculpt.tube(0.09, 0.14, 5.2, { c: quiet(0x35807a, 0.25) }, { at: [x, 0, z], lump: 0.01 }, 7)
    sculpt.ball(0.34, { c: quiet(0xfff0b0, 0.1) }, { at: [x, 5.4, z], lump: 0.03 })
    sculpt.cone(0.4, 0.3, { c: quiet(0x35807a, 0.25) }, { at: [x, 5.62, z], lump: 0.01 })
    blobs.push({ x: x + 0.15, z: z + 0.1, wide: 0.9, deep: 0.6, dark: 0.8 })
  }
  bunting(sculpt, [lamps[0][0], 5.0, lamps[0][1]], [lamps[2][0], 5.1, lamps[2][1]], 13, 0)
  bunting(sculpt, [lamps[2][0], 5.1, lamps[2][1]], [GATE.x, GATE.high + 0.2, GATE.z], 12, 3)
  bunting(sculpt, [GATE.x, GATE.high + 0.2, GATE.z], [lamps[1][0], 5.0, lamps[1][1]], 6, 1)
  bunting(sculpt, [-13, 6.0, -6.9], [13, 6.0, -6.9], 34, 2)

  // The crowd: beyond the far kerb, and along the near kerb seen from behind, where the tops of big heads fill the bottom of the frame.
  CROWD.forEach((one, which) => {
    // No pointed hats in the near row: nothing of it reaches up over the near kerb.
    addOnlooker(crowd, one, one.back ? which * 3 + 1 + (which % 2) : which)
    blobs.push({ x: one.x + 0.2, z: one.z + (one.back ? -0.1 : 0.3), wide: 1.9 * one.size, deep: 1.2 * one.size, dark: 0.9 })
  })
  // A rope on striped posts keeps the crowd off the street, with a fringe along the rope; a tub of paper flowers stands at each far corner of the street.
  const posts = 4, ropeFrom = -1.8, ropeTo = 1.2, ropeZ = STREET.z0 - 0.95
  for (let i = 0; i < posts; i++) {
    const x = ropeFrom + (i * (ropeTo - ropeFrom)) / (posts - 1)
    sculpt.tube(0.09, 0.11, 0.85, { c: 0xfdf3dc, c2: 0x2f7fe0, pattern: 'bands', count: 3 }, { at: [x, 0, ropeZ], lump: 0.01 }, 8)
    sculpt.ball(0.14, { c: quiet(0xffd23c, 0.1) }, { at: [x, 0.86, ropeZ], lump: 0.02 })
    blobs.push({ x: x + 0.08, z: ropeZ + 0.06, wide: 0.5, deep: 0.36, dark: 0.9 })
    if (i === posts - 1) break
    const span = (ropeTo - ropeFrom) / (posts - 1)
    for (let j = 0; j < 7; j++) {
      const t = (j + 0.5) / 7
      sculpt.strip(0.16, 0.24, { c: FLAGS[(i + j) % FLAGS.length] }, { at: [x + t * span, 0.8 - Math.sin(t * PI) * 0.22, ropeZ], sway: [0.03, j * 1.3 + i, 0] })
    }
  }
  for (const x of [STREET.x1 + 1.5, STREET.x0 - 0.9]) {
    const z = STREET.z0 - 0.2
    sculpt.tube(0.36, 0.28, 0.5, { c: quiet(0xc8684a, 0.2), c2: quiet(0xfdf3dc, 0.2), pattern: 'bands', count: 3 }, { at: [x, 0, z], lump: 0.03 })
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2
      sculpt.ball(0.17, { c: FLAGS[(k * 2 + Math.abs(Math.round(x))) % FLAGS.length] }, { at: [x + Math.cos(a) * 0.2, 0.62 + (k % 2) * 0.12, z + Math.sin(a) * 0.2], lump: 0.03, sway: [0.02, k * 1.9, 1] })
    }
    blobs.push({ x: x + 0.12, z: z + 0.1, wide: 1.1, deep: 0.8, dark: 0.9 })
  }
  // A stall at each end of the street: a striped tent and its counter.
  for (const x of [STREET.x0 - 2.9, STREET.x1 + 2.9]) {
    sculpt.tube(1.5, 1.5, 2.0, { c: quiet(0xfdf3dc, 0.1), c2: quiet(0x35b07a, 0.25), pattern: 'spokes', count: 8 }, { at: [x, 0, 0.6], lump: 0.03 }, 12)
    sculpt.cone(1.9, 1.5, { c: quiet(0x35b07a, 0.25), c2: quiet(0xfdf3dc, 0.1), pattern: 'spokes', count: 8 }, { at: [x, 2.0, 0.6], lump: 0.03 }, 14)
    sculpt.ball(0.2, { c: quiet(0xd8343c, 0.2) }, { at: [x, 3.55, 0.6], lump: 0.02 })
    blobs.push({ x: x + 0.3, z: 1.0, wide: 4.0, deep: 3.4, dark: 1 })
  }
  // Paper clouds beyond the roofs.
  for (const [x, y, size] of [[-9, 9.5, 1.6], [-2, 10.5, 1.2], [6, 9.8, 1.8], [13, 10.6, 1.3]] as const) {
    sculpt.ball(1.2, { c: 0xfffaf0 }, { at: [x, y, -12], size: [size * 1.6, size * 0.7, 0.6], lump: 0.12 })
    sculpt.ball(0.9, { c: 0xfffaf0 }, { at: [x + size, y - 0.25, -12], size: [size * 1.2, size * 0.6, 0.6], lump: 0.1 })
  }
  return { geometry: sculpt.build(), crowd: crowd.build(), blobs }
}

/** One leaf of the gate: bars between two rails, from its hinge at the origin along x. */
export function makeLeaf(): THREE.BufferGeometry {
  const bar = { c: quiet(0x3a2a52, 0.1) }, wide = GATE.half - 0.12, sculpt = new Sculpt(true)
  for (let i = 0; i < 5; i++) sculpt.tube(0.05, 0.05, 2.5 + 0.16 * i, bar, { at: [0.2 + i * ((wide - 0.3) / 4), 0.12, 0], lump: 0 }, 5)
  sculpt.tube(0.06, 0.06, wide, bar, { at: [0, 0.5, 0], turn: [0, 0, -PI / 2], lump: 0 }, 5)
  sculpt.tube(0.06, 0.06, wide, bar, { at: [0, 2.2, 0], turn: [0, 0, -PI / 2], lump: 0 }, 5)
  return sculpt.build()
}
