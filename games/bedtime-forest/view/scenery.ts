import * as THREE from 'three'
import { CLEARING, HOME_KEYS, HOMES, POND_RADIUS, type HomeKey } from '../layout'
import { between, createRng, type Rng } from '../rng'
import { ShapeBuilder, shapes } from './geometry'
import { PALETTE } from './palette'

// The storybook clearing: a painted meadow, a ring of round-crowned trees
// and firs, mushrooms and flowers, and the six homes. Everything static is
// one merged geometry (one fill draw, one ink draw); each home's pieces
// carry part = home index + 1 so the shader can shake it and light its
// doorway without extra draw calls.

const HOME_PART: Record<HomeKey, number> = Object.fromEntries(HOME_KEYS.map((key, index) => [key, index + 1])) as Record<HomeKey, number>

function ground(): THREE.BufferGeometry {
  const geometry = new THREE.RingGeometry(0.001, 190, 96, 48)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position')
  const tint: number[] = []
  const grass = new THREE.Color(PALETTE.grass)
  const edge = new THREE.Color(PALETTE.grassEdge)
  const moss = new THREE.Color(PALETTE.moss)
  const path = new THREE.Color(PALETTE.path)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i) - 10
    const dx = (x - CLEARING.x) / (CLEARING.rx + 30)
    const dz = (z - CLEARING.z) / (CLEARING.rz + (z > CLEARING.z ? 58 : 26))
    const d = Math.hypot(dx, dz)
    const wobble = Math.sin(x * 0.07) * 0.08 + Math.cos(z * 0.09 + x * 0.02) * 0.08
    // Display-space mixing: THREE.Color stores what we give it, so no conversion happens here.
    c.copy(grass).lerp(edge, Math.min(1, Math.max(0, (d + wobble - 0.8) / 0.5)))
    c.lerp(moss, Math.min(1, Math.max(0, (d + wobble - 1.4) / 0.6)))
    const meander = Math.abs(x - 14 - Math.sin(z * 0.045) * 16) / 10
    const trail = z > 24 ? Math.max(0, 1 - meander) * Math.min(1, (z - 24) / 16) * 0.55 : 0
    c.lerp(path, trail)
    tint.push(c.r, c.g, c.b)
  }
  const result = new THREE.BufferGeometry()
  result.setAttribute('position', position)
  result.setAttribute('normal', geometry.getAttribute('normal'))
  result.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 3))
  result.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(position.count), 1))
  result.setAttribute('kind', new THREE.Float32BufferAttribute(new Float32Array(position.count), 1))
  result.setIndex(geometry.getIndex())
  result.translate(0, 0, -10)
  return result
}

function roundTree(b: ShapeBuilder, rng: Rng, x: number, z: number, height: number, part = 0): void {
  const s = shapes()
  const trunkR = height * 0.07
  b.add(s.taper, { at: [x, 0, z], scale: [trunkR, height * 0.62, trunkR], color: PALETTE.trunk, part, ink: 0.9 })
  const crown = height * 0.3
  const tones = [PALETTE.leaf, PALETTE.leafDark, PALETTE.leafLight]
  b.add(s.sphere, { at: [x, height * 0.72, z], scale: [crown * 1.05, crown * 0.95, crown], color: tones[Math.floor(rng() * 2)], part, ink: 1.1 })
  for (let i = 0; i < 3; i++) {
    const a = rng() * Math.PI * 2
    b.add(s.sphere, {
      at: [x + Math.cos(a) * crown * 0.7, height * (0.62 + rng() * 0.25), z + Math.sin(a) * crown * 0.5],
      scale: crown * between(rng, 0.55, 0.75),
      color: tones[Math.floor(rng() * 3)],
      part,
      ink: 1,
    })
  }
}

function fir(b: ShapeBuilder, rng: Rng, x: number, z: number, height: number): void {
  const s = shapes()
  b.add(s.cylinder, { at: [x, 0, z], scale: [height * 0.04, height * 0.2, height * 0.04], color: PALETTE.bark, ink: 0.8 })
  for (let i = 0; i < 3; i++) {
    const w = height * (0.3 - i * 0.07)
    b.add(s.cone, {
      at: [x, height * (0.14 + i * 0.24), z],
      scale: [w, height * 0.42, w],
      rot: [0, rng() * 3, 0],
      color: i === 1 ? PALETTE.firDark : PALETTE.fir,
      ink: 1.1,
    })
  }
}

function mushroom(b: ShapeBuilder, x: number, z: number, size: number, part = 0): void {
  const s = shapes()
  b.add(s.taper, { at: [x, 0, z], scale: [size * 0.28, size * 0.7, size * 0.28], color: PALETTE.stem, part, ink: 0.7 })
  b.add(s.dome, { at: [x, size * 0.62, z], scale: [size * 0.75, size * 0.55, size * 0.75], color: PALETTE.mushroom, part, ink: 0.9 })
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + x
    b.add(s.ball, {
      at: [x + Math.cos(a) * size * 0.42, size * (0.95 + (i === 0 ? 0.18 : 0)), z + Math.sin(a) * size * 0.42],
      scale: [size * 0.12, size * 0.06, size * 0.12],
      color: PALETTE.dot,
      part,
      ink: 0,
    })
  }
}

function flower(b: ShapeBuilder, rng: Rng, x: number, z: number): void {
  const s = shapes()
  const colors = [PALETTE.flowerA, PALETTE.flowerB, PALETTE.flowerC]
  const h = between(rng, 2.2, 4)
  b.add(s.cylinder, { at: [x, 0, z], scale: [0.18, h, 0.18], color: PALETTE.reed, ink: 0 })
  b.add(s.ball, { at: [x, h + 0.4, z], scale: [1.1, 0.7, 1.1], color: colors[Math.floor(rng() * 3)], ink: 0.6 })
}

function tuft(b: ShapeBuilder, rng: Rng, x: number, z: number, size: number): void {
  const s = shapes()
  for (let i = 0; i < 3; i++) {
    b.add(s.cone, {
      at: [x + (i - 1) * size * 0.35, 0, z],
      scale: [size * 0.18, size * between(rng, 0.8, 1.3), size * 0.18],
      rot: [0, 0, (i - 1) * 0.35],
      color: i === 1 ? PALETTE.leafLight : PALETTE.leaf,
      ink: 0.6,
    })
  }
}

function stone(b: ShapeBuilder, x: number, z: number, size: number, part = 0): void {
  b.add(shapes().sphere, { at: [x, size * 0.2, z], scale: [size, size * 0.6, size * 0.8], color: PALETTE.rock, part, ink: 0.9 })
}

// --- the homes -----------------------------------------------------------------

function hollowTree(b: ShapeBuilder): void {
  const s = shapes()
  const home = HOMES.hollow
  const part = HOME_PART.hollow
  const { x, z } = home.at
  b.add(s.taper, { at: [x, 0, z], scale: [10, 50, 10], color: PALETTE.trunk, part, ink: 1.2 })
  for (let i = 0; i < 3; i++) {
    const a = 0.4 + i * 2.1
    b.add(s.cone, { at: [x + Math.cos(a) * 8, 0, z + Math.sin(a) * 8], rot: [0, -a, 1.1], scale: [3.5, 9, 3.5], color: PALETTE.trunk, part, ink: 0.9 })
  }
  const m = home.mouth
  b.add(s.torus, { at: [m.x, m.y, m.z - 0.6], scale: [5.4, 6.8, 3], color: PALETTE.bark, part, ink: 1 })
  b.add(s.disc, { at: [m.x, m.y, m.z], scale: [5, 6.4, 1], color: PALETTE.hole, part, kind: 1, ink: 0 })
  b.add(s.sphere, { at: [m.x, home.bed.y - 0.8, m.z + 1], scale: [7, 1.6, 4.5], color: PALETTE.bark, part, ink: 1 })
  const tones = [PALETTE.leaf, PALETTE.leafDark, PALETTE.leafLight]
  const crowns: [number, number, number, number][] = [
    [0, 58, 0, 20],
    [-15, 52, 4, 14],
    [14, 54, 2, 13],
    [2, 70, -3, 13],
  ]
  crowns.forEach(([dx, y, dz, r], i) => b.add(s.sphere, { at: [x + dx, y, z + dz], scale: [r, r * 0.9, r * 0.9], color: tones[i % 3], part, ink: 1.2 }))
  mushroom(b, x + 12, z + 12, 5, part)
}

function den(b: ShapeBuilder): void {
  const s = shapes()
  const home = HOMES.den
  const part = HOME_PART.den
  const { x, z } = home.at
  b.add(s.dome, { at: [x, 0, z], rot: [0, home.facing, 0], scale: [22, 15, 19], color: PALETTE.earth, part, ink: 1.1 })
  b.add(s.dome, { at: [x - 2, 6, z - 2], rot: [0, home.facing, 0], scale: [18, 11, 15], color: PALETTE.grassEdge, part, ink: 0.9 })
  const m = home.mouth
  b.add(s.torus, { at: [m.x - 0.4, m.y, m.z - 0.4], rot: [0, home.facing, 0], scale: [7.4, 6.8, 3], color: PALETTE.earthDark, part, ink: 1 })
  b.add(s.disc, { at: [m.x, m.y, m.z], rot: [0, home.facing, 0], scale: [7, 6.4, 1], color: PALETTE.hole, part, kind: 1, ink: 0 })
  // A root arching over the door, and the old tree the den is dug under.
  b.add(s.torus, { at: [m.x - 1, m.y + 1, m.z - 1], rot: [0, home.facing, 0], scale: [10, 10, 2.2], color: PALETTE.bark, part, ink: 1 })
  roundTreeAt(b, x - 8, z - 10, 62, part)
}

function roundTreeAt(b: ShapeBuilder, x: number, z: number, height: number, part: number): void {
  roundTree(b, createRng(Math.round(x * 13 + z * 7)), x, z, height, part)
}

function burrow(b: ShapeBuilder, rng: Rng): void {
  const s = shapes()
  const home = HOMES.burrow
  const part = HOME_PART.burrow
  const { x, z } = home.at
  b.add(s.dome, { at: [x, 0, z], rot: [0, home.facing, 0], scale: [15, 9, 12], color: PALETTE.grassEdge, part, ink: 1 })
  const m = home.mouth
  b.add(s.dome, { at: [m.x - 1, 0, m.z - 1], rot: [0, home.facing, 0], scale: [8, 6.2, 5], color: PALETTE.earth, part, ink: 1 })
  b.add(s.torus, { at: [m.x + 0.3, m.y, m.z - 0.3], rot: [0, home.facing, 0], scale: [5.2, 4.8, 2.4], color: PALETTE.earthDark, part, ink: 0.9 })
  b.add(s.disc, { at: [m.x, m.y, m.z], rot: [0, home.facing, 0], scale: [4.9, 4.4, 1], color: PALETTE.hole, part, kind: 1, ink: 0 })
  for (let i = 0; i < 4; i++) tuft(b, rng, x - 6 + i * 4, z - 6 + (i % 2) * 3, 4)
  b.add(s.sphere, { at: [m.x + 6, 1, m.z + 5], scale: [4, 2, 3], color: PALETTE.earth, part, ink: 0.8 })
}

function cave(b: ShapeBuilder): void {
  const s = shapes()
  const home = HOMES.cave
  const part = HOME_PART.cave
  const { x, z } = home.at
  b.add(s.sphere, { at: [x, 2, z], scale: [28, 26, 17], color: PALETTE.rock, part, ink: 1.3 })
  b.add(s.sphere, { at: [x - 24, 0, z + 4], scale: [14, 14, 12], color: PALETTE.rockDark, part, ink: 1.1 })
  b.add(s.sphere, { at: [x + 25, 0, z + 2], scale: [15, 17, 12], color: PALETTE.rockDark, part, ink: 1.1 })
  b.add(s.sphere, { at: [x + 6, 25, z - 2], scale: [15, 9, 11], color: PALETTE.moss, part, ink: 1 })
  const m = home.mouth
  b.add(s.disc, { at: [m.x, 3, m.z - 0.6], scale: [12, 15, 1], color: PALETTE.hole, part, kind: 1, ink: 0 })
  b.add(s.torus, { at: [m.x, 3, m.z - 1.2], scale: [12.4, 15.4, 3], color: PALETTE.rockDark, part, ink: 1 })
  stone(b, x - 14, z + 18, 4, part)
  stone(b, x + 13, z + 19, 3, part)
}

function pond(b: ShapeBuilder, rng: Rng): void {
  const s = shapes()
  const home = HOMES.pond
  const part = HOME_PART.pond
  const { x, z } = home.at
  const r = POND_RADIUS
  b.add(s.disc, { at: [x, 0.25, z], rot: [-Math.PI / 2, 0, 0], scale: [r, r * 0.8, 1], color: PALETTE.water, part, kind: 2, ink: 0 })
  b.add(s.torus, { at: [x, 0.2, z], rot: [Math.PI / 2, 0, 0], scale: [r + 0.6, (r + 0.6) * 0.8, 1.6], color: PALETTE.earth, part, ink: 1 })
  for (let i = 0; i < 7; i++) {
    const a = -2.2 + i * 0.28
    b.add(s.cone, {
      at: [x + Math.cos(a) * (r + 1.5), 0, z + Math.sin(a) * (r + 1.5) * 0.8],
      scale: [0.7, between(rng, 9, 15), 0.7],
      rot: [0, 0, between(rng, -0.15, 0.15)],
      color: PALETTE.reed,
      part,
      ink: 0.6,
    })
  }
  const pads: [number, number][] = [
    [-9, -3],
    [8, 5],
    [5, -6],
  ]
  for (const [dx, dz] of pads) b.add(s.disc, { at: [x + dx, 0.4, z + dz], rot: [-Math.PI / 2, 0, 0], scale: [3, 2.6, 1], color: PALETTE.lily, part, ink: 0.7 })
  b.add(s.ball, { at: [x + 8.5, 1.4, z + 5], scale: [1.4, 1.6, 1.4], color: PALETTE.flowerB, part, kind: 1, ink: 0.7 })
  stone(b, x - r - 2, z + 6, 3.5, part)
  stone(b, x + r + 1, z - 3, 3, part)
}

function nestTree(b: ShapeBuilder): void {
  const s = shapes()
  const home = HOMES.nest
  const part = HOME_PART.nest
  const { x, z } = home.at
  b.add(s.taper, { at: [x, 0, z], scale: [7, 46, 7], color: PALETTE.trunk, part, ink: 1.1 })
  const m = home.mouth
  b.add(s.cylinder, { at: [x, m.y - 3, z + 2], rot: [Math.PI / 2 - 0.25, 0, 0], scale: [1.4, 10, 1.4], color: PALETTE.bark, part, ink: 0.9 })
  b.add(s.torus, { at: [m.x, m.y - 2, m.z], rot: [Math.PI / 2, 0, 0], scale: [7.4, 7.4, 4.4], color: PALETTE.nest, part, ink: 1.2 })
  b.add(s.disc, { at: [m.x, m.y - 1.2, m.z], rot: [-Math.PI / 2, 0, 0], scale: [5.6, 5.6, 1], color: PALETTE.nestDark, part, kind: 1, ink: 0 })
  b.add(s.dome, { at: [m.x, m.y - 2.6, m.z], rot: [Math.PI, 0, 0], scale: [7, 4.4, 7], color: PALETTE.nestDark, part, ink: 1 })
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3
    b.add(s.cylinder, {
      at: [m.x + Math.cos(a) * 7.4, m.y - 1.6, m.z + Math.sin(a) * 7.4],
      rot: [Math.PI / 2, -a + Math.PI / 2, 0.5],
      scale: [0.35, 4, 0.35],
      color: PALETTE.nest,
      part,
      ink: 0.5,
    })
  }
  const crowns: [number, number, number, number, string][] = [
    [0, 50, -2, 17, PALETTE.leafDark],
    [-12, 44, 3, 11, PALETTE.leaf],
    [12, 46, 1, 12, PALETTE.leafLight],
  ]
  for (const [dx, y, dz, r, color] of crowns) b.add(s.sphere, { at: [x + dx, y, z + dz], scale: [r, r * 0.9, r * 0.9], color, part, ink: 1.2 })
}

export function buildScenery(): { ground: THREE.BufferGeometry; fill: THREE.BufferGeometry; ink: THREE.BufferGeometry } {
  const rng = createRng(9001)
  const b = new ShapeBuilder(0.12)

  // The far ring: firs behind round crowns, thinning toward the sides.
  for (let i = 0; i < 17; i++) {
    const x = -200 + i * 25 + between(rng, -6, 6)
    const z = -118 + between(rng, -8, 8) - Math.abs(x) * 0.08
    if (i % 3 === 1) fir(b, rng, x, z - 10, between(rng, 70, 92))
    else roundTree(b, rng, x, z, between(rng, 58, 78))
  }
  for (let i = 0; i < 9; i++) {
    const x = -165 + i * 42 + between(rng, -8, 8)
    if (Math.abs(x - HOMES.cave.at.x) < 30) continue
    roundTree(b, rng, x, -92 + between(rng, -6, 6), between(rng, 48, 60))
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -62 + i * 30
      const x = side * (150 + between(rng, -6, 10) + i * 4)
      if (i % 2 === 0) fir(b, rng, x, z, between(rng, 64, 80))
      else roundTree(b, rng, x, z, between(rng, 52, 66))
    }
  }

  hollowTree(b)
  den(b)
  burrow(b, rng)
  cave(b)
  pond(b, rng)
  nestTree(b)

  const mushrooms: [number, number, number][] = [
    [40, -34, 4],
    [46, -30, 3],
    [-40, -32, 3.5],
    [64, 34, 4.5],
    [-104, 30, 4],
    [110, 34, 3.5],
  ]
  for (const [x, z, size] of mushrooms) mushroom(b, x, z, size)
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2
    const r = between(rng, 1.12, 1.5)
    const x = CLEARING.x + Math.cos(a) * (CLEARING.rx + 8) * r
    const z = CLEARING.z + Math.sin(a) * (CLEARING.rz + 10) * r
    if (Math.hypot(x - HOMES.pond.at.x, z - HOMES.pond.at.z) < POND_RADIUS + 6) continue
    if (i % 3 === 0) tuft(b, rng, x, z, between(rng, 3, 5))
    else flower(b, rng, x, z)
  }
  const stones: [number, number, number][] = [
    [26, 38, 3],
    [-20, -34, 2.5],
    [120, -20, 4],
    [-128, -30, 4],
  ]
  for (const [x, z, size] of stones) stone(b, x, z, size)
  // Foreground framing, like the painted edge of a picture-book spread.
  for (const [x, z, h] of [
    [-150, 70, 30],
    [150, 74, 26],
  ] as const)
    roundTree(b, rng, x, z, h)
  for (const [x, z] of [
    [-118, 66],
    [-96, 76],
    [100, 70],
    [124, 62],
    [30, 82],
  ] as const)
    tuft(b, rng, x, z, 6)

  const { fill, ink } = b.build()
  return { ground: ground(), fill, ink }
}
