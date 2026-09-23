import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { LAMP, PEG_RAIL, SHELF, TRAY, WALL_Z, WINDOW } from '../layout'
import type { Vec2 } from '../pieces'
import { merge, stained, woodBox, woodLathe, woodSlab } from './shapes'
import { PALETTE, useTier } from './stage'
import { woodMaterial } from './wood'

// The playroom around the build: floorboards, a cream felt rug, a plaster
// wall with a window, a beech shelf, a floor lamp and a peg rail, and the
// wooden tray the pieces live in. Everything static is built once and merged
// by material (one draw for all the wood), and the soft contact shadows
// under and behind the furniture are painted once into two textures.

export const FLOOR_Y = -0.05
export const RUG = { x0: -8.9, x1: 8.9, z0: -1.5, z1: 6.35, radius: 0.55 }
const FLOOR = { x0: -16, x1: 16, z0: WALL_Z, z1: 9.6 }
const WALL = { x0: -16, x1: 16, y0: FLOOR_Y, y1: 12 }
const SUN = { top: [-7.4, 8.4, -2.25], topRight: [-4.6, 8.4, -2.25], bottom: [-3.0, 0.004, 2.0], bottomRight: [0.4, 0.004, 2.0] } as const

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function canvasTexture(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d')!)
  const texture = new THREE.CanvasTexture(canvas)
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

// ---- wood ------------------------------------------------------------------

const STAIN = {
  floor: ['#eddab8', '#e8d1ab', '#f1e0c2', '#e5cca3'],
  paint: '#f7f0e3',
  shelf: '#f4e4c8',
  back: '#d5e3cb',
  tray: '#f1dfbf',
  lamp: '#ead3aa',
}

function floorboards(): THREE.BufferGeometry[] {
  const rng = lcg(11)
  const parts: THREE.BufferGeometry[] = []
  const width = 0.94
  for (let x = FLOOR.x0; x < FLOOR.x1; x += width + 0.025) {
    let z = FLOOR.z0 - rng() * 2.5
    while (z < FLOOR.z1) {
      const length = 2.4 + rng() * 1.4
      const z0 = Math.max(FLOOR.z0, z)
      const z1 = Math.min(FLOOR.z1, z + length)
      z += length + 0.02
      const hidden = x > RUG.x0 + 0.3 && x + width < RUG.x1 - 0.3 && z0 > RUG.z0 + 0.3 && z1 < RUG.z1 - 0.3
      if (z1 - z0 < 0.3 || hidden) continue
      const board = woodBox(width, 0.12, z1 - z0, { x: x + width / 2, y: FLOOR_Y - 0.06, z: (z0 + z1) / 2 }, 'z', { bevel: 0.022, segments: 2, offset: { x: rng() * 2, y: rng() * 0.6 } })
      parts.push(stained(board, STAIN.floor[Math.floor(rng() * STAIN.floor.length)]))
    }
  }
  return parts
}

function shelf(): THREE.BufferGeometry[] {
  const { x0, x1, back, front, boards, top, side, board } = SHELF
  const cx = (x0 + x1) / 2
  const depth = front - back
  const mz = (front + back) / 2
  const parts: THREE.BufferGeometry[] = []
  const add = (g: THREE.BufferGeometry, color: string) => parts.push(stained(g, color))
  add(woodBox(side, top - 0.16, depth, { x: x0 + side / 2, y: (top - 0.16) / 2, z: mz }, 'y', { offset: { x: 0.4, y: 0.1 } }), STAIN.shelf)
  add(woodBox(side, top - 0.16, depth, { x: x1 - side / 2, y: (top - 0.16) / 2, z: mz }, 'y', { offset: { x: 1.3, y: 0.3 } }), STAIN.shelf)
  boards.forEach((y, i) => add(woodBox(x1 - x0 - side * 2 + 0.02, board, depth - 0.06, { x: cx, y: y - board / 2, z: mz + 0.02 }, 'x', { offset: { x: i * 0.7, y: 0.2 } }), STAIN.shelf))
  add(woodBox(x1 - x0 + 0.14, 0.16, depth + 0.1, { x: cx, y: top - 0.08, z: mz + 0.03 }, 'x', { offset: { x: 0.2, y: 0.4 } }), STAIN.shelf)
  add(woodBox(x1 - x0 - side * 2 + 0.04, top - 0.3, 0.05, { x: cx, y: (top - 0.3) / 2 + 0.1, z: back + 0.04 }, 'y', { bevel: 0.015, segments: 1 }), STAIN.back)
  // A ring stacker and books on the bottom board, a house and a ball on the next, a jar above, a little
  // tree on top. The stacker sits right behind Pip's head, so it is pale and cool: a saturated arch there
  // read as one of her blocks and cut into her silhouette.
  const stackX = x0 + 1.0
  const stackZ = mz + 0.1
  const stackBase = woodLathe(
    [
      { x: 0, y: 0 },
      { x: 0.46, y: 0 },
      { x: 0.5, y: 0.04 },
      { x: 0.48, y: 0.1 },
      { x: 0, y: 0.1 },
    ],
    24,
  )
  stackBase.translate(stackX, boards[0], stackZ)
  add(stackBase, STAIN.lamp)
  const rings: [number, string][] = [
    [0.44, '#9cc3dc'],
    [0.38, '#8ec5b4'],
    [0.32, '#b3a4d6'],
    [0.26, '#a9cde8'],
  ]
  const RING_HEIGHT = 0.19
  rings.forEach(([outer, color], i) => {
    const r = RING_HEIGHT / 2
    const profile: Vec2[] = [{ x: 0.08, y: 0 }]
    for (let k = 0; k <= 8; k++) {
      const a = -Math.PI / 2 + (Math.PI * k) / 8
      profile.push({ x: outer - r + Math.cos(a) * r, y: r + Math.sin(a) * r })
    }
    profile.push({ x: 0.08, y: RING_HEIGHT })
    const ring = woodLathe(profile, 24)
    ring.translate(stackX, boards[0] + 0.1 + i * RING_HEIGHT, stackZ)
    add(ring, color)
  })
  const pegTop = 0.1 + rings.length * RING_HEIGHT
  const stackPeg = woodLathe(
    [
      { x: 0, y: 0.1 },
      { x: 0.08, y: 0.1 },
      { x: 0.08, y: pegTop },
      { x: 0.1, y: pegTop + 0.03 },
      { x: 0.1, y: pegTop + 0.1 },
      { x: 0.06, y: pegTop + 0.15 },
      { x: 0, y: pegTop + 0.16 },
    ],
    16,
  )
  stackPeg.translate(stackX, boards[0], stackZ)
  add(stackPeg, STAIN.lamp)
  const books: [number, number, string][] = [
    [0.22, 1.25, '#7c5bab'],
    [0.18, 1.1, '#27a39a'],
    [0.26, 1.35, '#e7799f'],
    [0.2, 1.0, '#3f86c8'],
  ]
  let bx = x1 - side - 0.2
  for (const [w, h, color] of books) {
    add(woodBox(w, h, 0.85, { x: bx - w / 2, y: boards[0] + h / 2, z: mz + 0.05 }, 'y', { bevel: 0.025, segments: 2 }), color)
    bx -= w + 0.03
  }
  const house = woodBox(0.7, 0.6, 0.6, { x: x0 + 0.75, y: boards[1] + 0.3, z: mz }, 'y', { bevel: 0.03 })
  add(house, '#f2c230')
  const roof = woodSlab(
    [
      { x: -0.45, y: 0 },
      { x: 0.45, y: 0 },
      { x: 0, y: 0.42 },
    ],
    0.62,
    'x',
    { bevel: 0.03 },
  )
  roof.translate(x0 + 0.75, boards[1] + 0.6, mz)
  add(roof, '#d9473b')
  const ball = woodLathe(
    Array.from({ length: 13 }, (_, i) => {
      const a = -Math.PI / 2 + (Math.PI * i) / 12
      return { x: Math.max(0, Math.cos(a) * 0.36), y: 0.36 + Math.sin(a) * 0.36 }
    }),
    24,
  )
  ball.translate(x1 - 0.7, boards[1], mz + 0.1)
  add(ball, '#5fae4f')
  const jar = woodLathe(
    [
      { x: 0, y: 0 },
      { x: 0.3, y: 0 },
      { x: 0.34, y: 0.08 },
      { x: 0.34, y: 0.62 },
      { x: 0.26, y: 0.7 },
      { x: 0.26, y: 0.8 },
      { x: 0, y: 0.8 },
    ],
    24,
  )
  jar.translate(x0 + 0.6, boards[2], mz)
  add(jar, '#6f9fc4')
  const tree = woodLathe(
    [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.1, y: 0.3 },
      { x: 0.42, y: 0.34 },
      { x: 0.36, y: 0.6 },
      { x: 0.2, y: 0.95 },
      { x: 0.02, y: 1.12 },
      { x: 0, y: 1.12 },
    ],
    20,
  )
  tree.translate(x0 + 0.55, top, mz)
  add(tree, '#7fb069')
  return parts
}

function windowFrame(): THREE.BufferGeometry[] {
  const { x0, x1, y0, y1, sill } = WINDOW
  const bar = 0.18
  const deep = 0.2
  const z = WALL_Z + deep / 2 - 0.04
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const parts = [
    woodBox(x1 - x0 + bar * 2, bar, deep, { x: cx, y: y1 + bar / 2, z }, 'x'),
    woodBox(x1 - x0 + bar * 2, bar, deep, { x: cx, y: y0 - bar / 2, z }, 'x'),
    woodBox(bar, y1 - y0, deep, { x: x0 - bar / 2, y: cy, z }, 'y'),
    woodBox(bar, y1 - y0, deep, { x: x1 + bar / 2, y: cy, z }, 'y'),
    woodBox(0.1, y1 - y0, 0.1, { x: cx, y: cy, z: WALL_Z - 0.1 }, 'y', { bevel: 0.02, segments: 2 }),
    woodBox(x1 - x0, 0.1, 0.1, { x: cx, y: y0 + (y1 - y0) * 0.62, z: WALL_Z - 0.1 }, 'x', { bevel: 0.02, segments: 2 }),
    woodBox(x1 - x0 + 0.7, 0.12, 0.72, { x: cx, y: sill - 0.06, z: WALL_Z + 0.36 }, 'x', { offset: { x: 0.5, y: 0.1 } }),
  ]
  return parts.map((g) => stained(g, STAIN.paint))
}

function lamp(): THREE.BufferGeometry[] {
  const base = woodLathe(
    [
      { x: 0, y: 0 },
      { x: 0.6, y: 0 },
      { x: 0.65, y: 0.04 },
      { x: 0.62, y: 0.12 },
      { x: 0.22, y: 0.17 },
      { x: 0.08, y: 0.24 },
      { x: 0, y: 0.24 },
    ],
    32,
  )
  const poleTop = LAMP.shadeY - 0.35
  const pole = woodLathe(
    [
      { x: 0, y: 0.2 },
      { x: 0.058, y: 0.2 },
      { x: 0.058, y: poleTop },
      { x: 0.09, y: poleTop + 0.04 },
      { x: 0.09, y: poleTop + 0.14 },
      { x: 0, y: poleTop + 0.14 },
    ],
    16,
  )
  for (const g of [base, pole]) g.translate(LAMP.x, 0, LAMP.z)
  return [stained(base, STAIN.lamp), stained(pole, STAIN.lamp)]
}

function pegRail(): THREE.BufferGeometry[] {
  const { x0, x1, y } = PEG_RAIL
  const parts = [stained(woodBox(x1 - x0, 0.34, 0.12, { x: (x0 + x1) / 2, y, z: WALL_Z + 0.06 }, 'x', { bevel: 0.03 }), STAIN.paint)]
  for (const px of [-1.4, -0.2, 1.0, 2.0]) {
    const peg = woodLathe(
      [
        { x: 0, y: 0 },
        { x: 0.065, y: 0 },
        { x: 0.065, y: 0.3 },
        { x: 0.1, y: 0.34 },
        { x: 0.1, y: 0.4 },
        { x: 0.065, y: 0.44 },
        { x: 0, y: 0.44 },
      ],
      16,
    )
    peg.rotateX(Math.PI / 2)
    peg.translate(px, y - 0.02, WALL_Z + 0.12)
    parts.push(stained(peg, STAIN.lamp))
  }
  const ring = new THREE.TorusGeometry(0.36, 0.07, 10, 36)
  const ringUv = ring.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < ringUv.count; i++) ringUv.setXY(i, 0.02 + ringUv.getX(i) * 0.55, 0.52 + ringUv.getY(i) * 0.05)
  const ringWear = new Float32Array(ringUv.count * 2).fill(1)
  ring.setAttribute('wear', new THREE.BufferAttribute(ringWear, 2))
  for (let i = 0; i < ringUv.count; i++) ringWear[i * 2] = 0
  ring.translate(1.0, y - 0.45, WALL_Z + 0.36)
  parts.push(stained(ring, '#27a39a'))
  return parts
}

/** The tray in its own frame (x across, y up from the bed, z toward the viewer), then tipped and placed. */
function tray(): THREE.BufferGeometry[] {
  const { halfX, halfZ, rim, tilt, center } = TRAY
  const wall = 0.14
  const outerX = halfX + wall
  const outerZ = halfZ + wall
  const local = [
    woodBox(outerX * 2, 0.14, outerZ * 2, { x: 0, y: -0.07, z: 0 }, 'x', { offset: { x: 0.3, y: 0.05 } }),
    woodBox(outerX * 2, rim + 0.14, wall, { x: 0, y: (rim - 0.14) / 2, z: -halfZ - wall / 2 }, 'x', { offset: { x: 1.1, y: 0.2 } }),
    woodBox(outerX * 2, rim + 0.14, wall, { x: 0, y: (rim - 0.14) / 2, z: halfZ + wall / 2 }, 'x', { offset: { x: 0.6, y: 0.5 } }),
    woodBox(wall, rim + 0.14, halfZ * 2, { x: -halfX - wall / 2, y: (rim - 0.14) / 2, z: 0 }, 'z', { offset: { x: 0.2, y: 0.3 } }),
    woodBox(wall, rim + 0.14, halfZ * 2, { x: halfX + wall / 2, y: (rim - 0.14) / 2, z: 0 }, 'z', { offset: { x: 1.4, y: 0.1 } }),
    woodBox(halfX * 2, 0.1, 0.07, { x: 0, y: 0.05, z: 0.18 }, 'x', { bevel: 0.025, segments: 2 }),
  ]
  const parts = local.map((g) => {
    g.rotateX(tilt)
    g.translate(center.x, center.y, center.z)
    return stained(g, STAIN.tray)
  })
  const backY = center.y - 0.14 * Math.cos(tilt) + (halfZ + wall) * Math.sin(tilt)
  const backZ = center.z - (halfZ + wall) * Math.cos(tilt)
  for (const x of [-5.6, 5.6]) parts.push(stained(woodBox(0.62, backY, 0.5, { x, y: backY / 2, z: backZ + 0.35 }, 'y', { bevel: 0.03 }), STAIN.tray))
  return parts
}

function woodGeometry(): THREE.BufferGeometry {
  return merge([
    ...floorboards(),
    stained(woodBox(WALL.x1 - WALL.x0, 0.5, 0.1, { x: 0, y: FLOOR_Y + 0.25, z: WALL_Z + 0.05 }, 'x', { bevel: 0.03 }), STAIN.paint),
    ...shelf(),
    ...windowFrame(),
    ...lamp(),
    ...pegRail(),
    ...tray(),
  ])
}

// ---- wall, rug, sky ------------------------------------------------------

function wallGeometry(): THREE.BufferGeometry {
  const outline = new THREE.Shape()
  outline.moveTo(WALL.x0, WALL.y0)
  outline.lineTo(WALL.x1, WALL.y0)
  outline.lineTo(WALL.x1, WALL.y1)
  outline.lineTo(WALL.x0, WALL.y1)
  outline.closePath()
  const hole = new THREE.Path()
  hole.moveTo(WINDOW.x0, WINDOW.y0)
  hole.lineTo(WINDOW.x0, WINDOW.y1)
  hole.lineTo(WINDOW.x1, WINDOW.y1)
  hole.lineTo(WINDOW.x1, WINDOW.y0)
  hole.closePath()
  outline.holes.push(hole)
  const wall = new THREE.ShapeGeometry(outline)
  wall.translate(0, 0, WALL_Z)
  const w = WINDOW.x1 - WINDOW.x0
  const h = WINDOW.y1 - WINDOW.y0
  const reveal = (sx: number, sy: number, x: number, y: number) => {
    const g = new THREE.BoxGeometry(sx, sy, 0.3)
    g.translate(x, y, WALL_Z - 0.15)
    return g
  }
  const reveals = [
    reveal(w + 0.2, 0.1, (WINDOW.x0 + WINDOW.x1) / 2, WINDOW.y1 + 0.05),
    reveal(w + 0.2, 0.1, (WINDOW.x0 + WINDOW.x1) / 2, WINDOW.y0 - 0.05),
    reveal(0.1, h, WINDOW.x0 - 0.05, (WINDOW.y0 + WINDOW.y1) / 2),
    reveal(0.1, h, WINDOW.x1 + 0.05, (WINDOW.y0 + WINDOW.y1) / 2),
  ]
  const merged = merge([wall.toNonIndexed(), ...reveals.map((g) => g.toNonIndexed())])
  return merged
}

function plasterTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(256, 256, (context) => {
    const image = context.createImageData(256, 256)
    const rng = lcg(5)
    for (let i = 0; i < 256 * 256; i++) {
      const v = 238 + Math.floor(rng() * 12)
      image.data[i * 4] = v
      image.data[i * 4 + 1] = v
      image.data[i * 4 + 2] = v
      image.data[i * 4 + 3] = 255
    }
    context.putImageData(image, 0, 0)
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(0.35, 0.35)
  return texture
}

function rugGeometry(): THREE.BufferGeometry {
  const { x0, x1, z0, z1, radius: r } = RUG
  const shape = new THREE.Shape()
  shape.moveTo(x0 + r, -z1)
  shape.lineTo(x1 - r, -z1)
  shape.quadraticCurveTo(x1, -z1, x1, -z1 + r)
  shape.lineTo(x1, -z0 - r)
  shape.quadraticCurveTo(x1, -z0, x1 - r, -z0)
  shape.lineTo(x0 + r, -z0)
  shape.quadraticCurveTo(x0, -z0, x0, -z0 - r)
  shape.lineTo(x0, -z1 + r)
  shape.quadraticCurveTo(x0, -z1, x0 + r, -z1)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.04, bevelSegments: 3, curveSegments: 8 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -0.05, 0)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) - x0) / (x1 - x0), 1 - (position.getZ(i) - z0) / (z1 - z0))
  geometry.computeVertexNormals()
  return geometry
}

/** Cream felt: soft fibres, a slightly deeper border band and a running stitch. */
function feltTexture(): THREE.CanvasTexture {
  const width = 2048
  const height = Math.round((width * (RUG.z1 - RUG.z0)) / (RUG.x1 - RUG.x0))
  const perUnit = width / (RUG.x1 - RUG.x0)
  return canvasTexture(width, height, (context) => {
    context.fillStyle = PALETTE.rug
    context.fillRect(0, 0, width, height)
    const rng = lcg(3)
    for (let i = 0; i < 90000; i++) {
      const x = rng() * width
      const y = rng() * height
      const a = rng() * Math.PI
      const l = 2 + rng() * 5
      const light = rng() > 0.5
      context.strokeStyle = light ? 'rgba(255,252,242,0.35)' : 'rgba(150,120,80,0.09)'
      context.lineWidth = 0.8
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
      context.stroke()
    }
    const inset = 0.32 * perUnit
    const band = 0.2 * perUnit
    context.strokeStyle = 'rgba(196, 170, 120, 0.22)'
    context.lineWidth = band
    context.beginPath()
    context.roundRect(inset + band / 2, inset + band / 2, width - 2 * inset - band, height - 2 * inset - band, RUG.radius * perUnit)
    context.stroke()
    context.strokeStyle = 'rgba(150, 118, 80, 0.45)'
    context.lineWidth = 2.2
    context.setLineDash([0.12 * perUnit, 0.08 * perUnit])
    context.beginPath()
    const stitch = inset * 0.55
    context.roundRect(stitch, stitch, width - 2 * stitch, height - 2 * stitch, RUG.radius * perUnit * 0.8)
    context.stroke()
  })
}

/** Soft sky through the window: a pale gradient, two clouds, a hill and a round tree. */
function skyTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 320, (context) => {
    const sky = context.createLinearGradient(0, 0, 0, 320)
    sky.addColorStop(0, '#a9d3ea')
    sky.addColorStop(0.7, '#e3eee8')
    sky.addColorStop(1, '#f6ecd3')
    context.fillStyle = sky
    context.fillRect(0, 0, 256, 320)
    const cloud = (x: number, y: number, s: number) => {
      context.fillStyle = 'rgba(255,255,255,0.85)'
      for (const [dx, dy, r] of [
        [0, 0, 22],
        [24, -8, 26],
        [50, 2, 20],
        [26, 8, 22],
      ]) {
        context.beginPath()
        context.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
        context.fill()
      }
    }
    cloud(40, 70, 0.9)
    cloud(170, 120, 0.6)
    context.fillStyle = '#b5d49a'
    context.beginPath()
    context.ellipse(90, 330, 220, 90, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#9cc585'
    context.beginPath()
    context.ellipse(250, 320, 150, 60, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#9b7b5a'
    context.fillRect(188, 225, 8, 40)
    context.fillStyle = '#86b872'
    context.beginPath()
    context.arc(192, 215, 26, 0, Math.PI * 2)
    context.fill()
  })
}

// ---- baked contact shadows -------------------------------------------------

type Painter = { context: CanvasRenderingContext2D; px: (x: number) => number; py: (y: number) => number; scale: number }

/** Draw a shape's blurred shadow only (the shape itself is drawn off-canvas and its shadow offset back in). */
function softly(p: Painter, blur: number, alpha: number, draw: (context: CanvasRenderingContext2D, shift: number) => void): void {
  const { context } = p
  const shift = context.canvas.width * 2
  context.save()
  context.shadowColor = `rgba(255,255,255,${alpha})`
  context.shadowBlur = blur * p.scale
  context.shadowOffsetX = shift
  context.fillStyle = '#fff'
  context.beginPath()
  draw(context, -shift)
  context.fill()
  context.restore()
}

function floorShadows(): THREE.CanvasTexture {
  const scale = 40
  const width = (FLOOR.x1 - FLOOR.x0) * scale
  const height = (FLOOR.z1 - FLOOR.z0) * scale
  const texture = canvasTexture(
    width,
    height,
    (context) => {
      context.fillStyle = '#000'
      context.fillRect(0, 0, width, height)
      const p: Painter = { context, px: (x) => (x - FLOOR.x0) * scale, py: (z) => (z - FLOOR.z0) * scale, scale }
      const box = (x0: number, z0: number, x1: number, z1: number, blur: number, alpha: number) =>
        softly(p, blur, alpha, (c, s) => c.rect(p.px(x0) + s, p.py(z0), p.px(x1) - p.px(x0), p.py(z1) - p.py(z0)))
      const wall = context.createLinearGradient(0, p.py(WALL_Z), 0, p.py(WALL_Z + 0.9))
      wall.addColorStop(0, 'rgba(255,255,255,0.6)')
      wall.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = wall
      context.fillRect(0, 0, width, p.py(WALL_Z + 0.9))
      box(SHELF.x0 - 0.05, SHELF.back, SHELF.x1 + 0.05, SHELF.front + 0.08, 0.25, 0.75)
      box(SHELF.x0 - 0.1, SHELF.back, SHELF.x1 + 0.1, SHELF.front + 0.3, 0.5, 0.35)
      softly(p, 0.2, 0.7, (c, s) => c.ellipse(p.px(LAMP.x) + s, p.py(LAMP.z), 0.72 * scale, 0.72 * scale, 0, 0, Math.PI * 2))
      softly(p, 0.6, 0.3, (c, s) => c.ellipse(p.px(LAMP.x + 0.4) + s, p.py(LAMP.z + 0.3), 1.2 * scale, 0.9 * scale, 0, 0, Math.PI * 2))
      // The rug's edge on the boards: a ring, since the rug's own decal reads this same texture.
      context.save()
      context.shadowColor = 'rgba(255,255,255,0.5)'
      context.shadowBlur = 0.12 * scale
      context.shadowOffsetX = width * 2
      context.strokeStyle = '#fff'
      context.lineWidth = 0.14 * scale
      context.beginPath()
      context.roundRect(p.px(RUG.x0 - 0.05) - width * 2, p.py(RUG.z0 - 0.05), (RUG.x1 - RUG.x0 + 0.1) * scale, (RUG.z1 - RUG.z0 + 0.1) * scale, RUG.radius * scale)
      context.stroke()
      context.restore()
      const trayZ0 = TRAY.center.z - (TRAY.halfZ + 0.14) * Math.cos(TRAY.tilt)
      const trayZ1 = TRAY.center.z + (TRAY.halfZ + 0.14) * Math.cos(TRAY.tilt)
      box(-TRAY.halfX - 0.2, trayZ0 - 0.1, TRAY.halfX + 0.2, trayZ1 + 0.05, 0.45, 0.42)
      box(-TRAY.halfX - 0.1, trayZ1 - 0.25, TRAY.halfX + 0.1, trayZ1 + 0.04, 0.12, 0.5)
      for (const x of [-5.6, 5.6]) box(x - 0.36, trayZ0 + 0.05, x + 0.36, trayZ0 + 0.7, 0.12, 0.6)
    },
    false,
  )
  return texture
}

function wallShadows(): THREE.CanvasTexture {
  const scale = 40
  const width = (WALL.x1 - WALL.x0) * scale
  const height = (WALL.y1 - WALL.y0) * scale
  return canvasTexture(
    width,
    height,
    (context) => {
      context.fillStyle = '#000'
      context.fillRect(0, 0, width, height)
      const p: Painter = { context, px: (x) => (x - WALL.x0) * scale, py: (y) => (WALL.y1 - y) * scale, scale }
      const box = (x0: number, y0: number, x1: number, y1: number, blur: number, alpha: number) =>
        softly(p, blur, alpha, (c, s) => c.rect(p.px(x0) + s, p.py(y1), p.px(x1) - p.px(x0), p.py(y0) - p.py(y1)))
      const base = context.createLinearGradient(0, p.py(FLOOR_Y + 0.5), 0, p.py(1.3))
      base.addColorStop(0, 'rgba(255,255,255,0.45)')
      base.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = base
      context.fillRect(0, p.py(1.3), width, p.py(FLOOR_Y + 0.5) - p.py(1.3))
      box(SHELF.x0 - 0.02, 0, SHELF.x1 + 0.02, SHELF.top - 0.05, 0.35, 0.7)
      box(SHELF.x0 - 0.2, 0, SHELF.x1 + 0.25, SHELF.top - 0.3, 0.8, 0.3)
      box(WINDOW.x0 - 0.2, WINDOW.sill - 0.55, WINDOW.x1 + 0.2, WINDOW.sill - 0.05, 0.3, 0.5)
      box(WINDOW.x0 - 0.25, WINDOW.y0 - 0.1, WINDOW.x1 + 0.25, WINDOW.y1 + 0.25, 0.2, 0.25)
      box(PEG_RAIL.x0 - 0.02, PEG_RAIL.y - 0.28, PEG_RAIL.x1 + 0.02, PEG_RAIL.y + 0.1, 0.18, 0.45)
      for (const px of [-1.4, -0.2, 1.0, 2.0]) softly(p, 0.12, 0.5, (c, s) => c.ellipse(p.px(px + 0.05) + s, p.py(PEG_RAIL.y - 0.22), 0.1 * scale, 0.16 * scale, 0, 0, Math.PI * 2))
      softly(p, 0.2, 0.4, (c, s) => c.ellipse(p.px(1.05) + s, p.py(PEG_RAIL.y - 0.5), 0.42 * scale, 0.42 * scale, 0, 0, Math.PI * 2))
      softly(p, 0.9, 0.3, (c, s) => c.ellipse(p.px(LAMP.x + 0.35) + s, p.py(LAMP.shadeY - 0.1), 1.1 * scale, 0.7 * scale, 0, 0, Math.PI * 2))
      softly(p, 0.35, 0.28, (c, s) => c.rect(p.px(LAMP.x + 0.05) + s, p.py(LAMP.shadeY - 0.6), 0.2 * scale, (LAMP.shadeY - 0.6) * scale))
    },
    false,
  )
}

// ---- sunbeam and motes -----------------------------------------------------

function beamTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (context) => {
    const along = context.createLinearGradient(0, 0, 0, 256)
    along.addColorStop(0, 'rgba(255,236,196,0.0)')
    along.addColorStop(0.12, 'rgba(255,236,196,0.9)')
    along.addColorStop(0.7, 'rgba(255,230,184,0.45)')
    along.addColorStop(1, 'rgba(255,230,184,0)')
    context.fillStyle = along
    context.fillRect(0, 0, 256, 256)
    context.globalCompositeOperation = 'destination-in'
    const across = context.createLinearGradient(0, 0, 256, 0)
    across.addColorStop(0, 'rgba(0,0,0,0)')
    across.addColorStop(0.25, 'rgba(0,0,0,1)')
    across.addColorStop(0.46, 'rgba(0,0,0,0.75)')
    across.addColorStop(0.5, 'rgba(0,0,0,0.35)')
    across.addColorStop(0.54, 'rgba(0,0,0,0.75)')
    across.addColorStop(0.75, 'rgba(0,0,0,1)')
    across.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = across
    context.fillRect(0, 0, 256, 256)
  })
}

/** Four window panes of sunlight on the rug. */
function patchTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (context) => {
    context.clearRect(0, 0, 256, 256)
    context.shadowColor = 'rgba(255,236,200,0.9)'
    context.shadowBlur = 18
    context.fillStyle = 'rgba(255,236,200,0.9)'
    for (const [x, y, w, h] of [
      [34, 34, 88, 100],
      [134, 34, 88, 100],
      [34, 146, 88, 76],
      [134, 146, 88, 76],
    ]) {
      context.beginPath()
      context.roundRect(x, y, w, h, 6)
      context.fill()
    }
  })
}

function quad(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2))
  geometry.setIndex([0, 2, 1, 1, 2, 3])
  return geometry
}

const MOTES_MAX = 40

function moteGeometry(): THREE.BufferGeometry {
  const rng = lcg(21)
  const positions = new Float32Array(MOTES_MAX * 3)
  const seeds = new Float32Array(MOTES_MAX)
  for (let i = 0; i < MOTES_MAX; i++) {
    const t = 0.1 + rng() * 0.75
    const s = 0.15 + rng() * 0.7
    const top = [SUN.top[0] + (SUN.topRight[0] - SUN.top[0]) * s, SUN.top[1], SUN.top[2]]
    const bottom = [SUN.bottom[0] + (SUN.bottomRight[0] - SUN.bottom[0]) * s, SUN.bottom[1], SUN.bottom[2]]
    positions[i * 3] = top[0] + (bottom[0] - top[0]) * t
    positions[i * 3 + 1] = top[1] + (bottom[1] - top[1]) * t
    positions[i * 3 + 2] = top[2] + (bottom[2] - top[2]) * t + (rng() - 0.5) * 0.8
    seeds[i] = rng() * 100
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(-3.5, 4, 0), 8)
  return geometry
}

function moteMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `attribute float seed;
uniform float time;
uniform float pixelRatio;
varying float vGlint;
void main() {
  vec3 p = position;
  p.x += sin(time * 0.21 + seed) * 0.35;
  p.y += sin(time * 0.13 + seed * 1.7) * 0.4;
  p.z += cos(time * 0.17 + seed * 0.6) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = pixelRatio * 90.0 / -mv.z;
  vGlint = 0.45 + 0.55 * sin(time * 0.9 + seed * 3.0);
}`,
    fragmentShader: `varying float vGlint;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * a * a * vGlint * 0.55, 1.0);
}`,
  })
}

function Motes({ count }: { count: number }) {
  const geometry = useMemo(moteGeometry, [])
  const material = useMemo(moteMaterial, [])
  const dpr = useThree((state) => state.viewport.dpr)
  useEffect(() => {
    geometry.setDrawRange(0, count)
  }, [geometry, count])
  useEffect(() => {
    material.uniforms.pixelRatio.value = dpr
  }, [material, dpr])
  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime
  })
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return <points geometry={geometry} material={material} renderOrder={5} />
}

// ---- the room ----------------------------------------------------------------

export function Room() {
  const tier = useTier()
  const built = useMemo(() => {
    const wood = new THREE.Mesh(woodGeometry(), woodMaterial({ vertexColors: true }))
    const wall = new THREE.Mesh(wallGeometry(), new THREE.MeshStandardMaterial({ color: PALETTE.wall, map: plasterTexture(), roughness: 1, emissive: '#fbf3e6', emissiveIntensity: 0.32 }))
    const felt = feltTexture()
    const rug = new THREE.Mesh(rugGeometry(), new THREE.MeshStandardMaterial({ color: '#ffffff', map: felt, roughness: 1 }))
    const skyPlane = new THREE.PlaneGeometry(WINDOW.x1 - WINDOW.x0 + 0.4, WINDOW.y1 - WINDOW.y0 + 0.4)
    skyPlane.translate((WINDOW.x0 + WINDOW.x1) / 2, (WINDOW.y0 + WINDOW.y1) / 2, WALL_Z - 0.32)
    const sky = new THREE.Mesh(skyPlane, new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: false }))
    const shadeGeometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.9, 0),
        new THREE.Vector2(0.88, 0.05),
        new THREE.Vector2(0.62, 0.98),
        new THREE.Vector2(0.6, 1.02),
      ],
      40,
    )
    shadeGeometry.translate(LAMP.x, LAMP.shadeY - 0.5, LAMP.z)
    const shade = new THREE.Mesh(
      shadeGeometry,
      new THREE.MeshStandardMaterial({ color: '#f7ebd6', emissive: '#ffcf8f', emissiveIntensity: 0.32, roughness: 1, side: THREE.DoubleSide }),
    )
    const shadowMaterial = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ color: PALETTE.shadow, alphaMap: map, transparent: true, depthWrite: false, toneMapped: false })
    const floorMap = floorShadows()
    const floorPlane = new THREE.PlaneGeometry(FLOOR.x1 - FLOOR.x0, FLOOR.z1 - FLOOR.z0)
    floorPlane.rotateX(-Math.PI / 2)
    floorPlane.translate((FLOOR.x0 + FLOOR.x1) / 2, FLOOR_Y + 0.004, (FLOOR.z0 + FLOOR.z1) / 2)
    const rugPlane = new THREE.PlaneGeometry(RUG.x1 - RUG.x0, RUG.z1 - RUG.z0)
    rugPlane.rotateX(-Math.PI / 2)
    rugPlane.translate((RUG.x0 + RUG.x1) / 2, 0.004, (RUG.z0 + RUG.z1) / 2)
    const rugUv = rugPlane.getAttribute('uv') as THREE.BufferAttribute
    const rugPosition = rugPlane.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < rugUv.count; i++) rugUv.setXY(i, (rugPosition.getX(i) - FLOOR.x0) / (FLOOR.x1 - FLOOR.x0), 1 - (rugPosition.getZ(i) - FLOOR.z0) / (FLOOR.z1 - FLOOR.z0))
    const floorShadow = new THREE.Mesh(merge([floorPlane, rugPlane]), shadowMaterial(floorMap))
    const wallPlane = new THREE.PlaneGeometry(WALL.x1 - WALL.x0, WALL.y1 - WALL.y0)
    wallPlane.translate((WALL.x0 + WALL.x1) / 2, (WALL.y0 + WALL.y1) / 2, WALL_Z + 0.004)
    const wallShadow = new THREE.Mesh(wallPlane, shadowMaterial(wallShadows()))
    for (const m of [floorShadow, wallShadow]) m.renderOrder = 1
    const beam = new THREE.Mesh(
      quad(SUN.top, SUN.topRight, SUN.bottom, SUN.bottomRight),
      new THREE.MeshBasicMaterial({
        map: beamTexture(),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        forceSinglePass: true,
        toneMapped: false,
      }),
    )
    beam.renderOrder = 4
    const patch = new THREE.Mesh(
      quad([-3.5, 0.006, 1.0], [0.3, 0.006, 1.0], [-2.7, 0.006, 3.3], [1.3, 0.006, 3.3]),
      new THREE.MeshBasicMaterial({ map: patchTexture(), transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    )
    patch.renderOrder = 2
    wood.name = 'room-wood'
    wall.name = 'room-wall'
    rug.name = 'room-rug'
    sky.name = 'room-sky'
    shade.name = 'lamp-shade'
    floorShadow.name = 'floor-shadows'
    wallShadow.name = 'wall-shadows'
    beam.name = 'sunbeam'
    patch.name = 'sun-patch'
    const group = new THREE.Group()
    group.add(wood, wall, rug, sky, shade, floorShadow, wallShadow, beam, patch)
    for (const child of group.children) child.matrixAutoUpdate = false
    group.traverse((object) => object.updateMatrix())
    return group
  }, [])
  useEffect(
    () => () =>
      built.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const material = object.material as THREE.MeshBasicMaterial
          material.map?.dispose()
          material.alphaMap?.dispose()
          material.dispose()
        }
      }),
    [built],
  )
  return (
    <>
      <primitive object={built} />
      {tier.motes > 0 && <Motes count={tier.motes} />}
    </>
  )
}
