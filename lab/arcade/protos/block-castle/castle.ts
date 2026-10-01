// What the blocks become when the bell is rung. Each block turns to dressed
// stone in the box it already fills; open tops grow battlements, cones and
// triangles become tiled roofs, arches become lit gateways, every roofed-over
// gap gets a lantern, branch blocks leaf out, pennants fly from the highest
// points, and four small folk come and use it: a king on the tallest flat
// top, a baker pacing before the gate, a child flying a kite from the next
// roof-walk, and a sleepy dragon curled round the widest foot of it all.
//
// Nothing here chooses a shape. It only reads what the child built.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Room } from './scene.ts'
import type { Sound } from './sound.ts'
import { paintGlow, paintHall, paintStone, paintTiles, paintWindow } from './tex.ts'
import { BUILD, POSES, WALL_Z, bases, centreOf, coveredShare, flatTopped, hollows, sizeOf, skyline, solidAt, topOf } from './world.ts'
import type { Block } from './world.ts'

export interface Castle {
  // True once everyone has arrived and the picture is simply living.
  settled: boolean
  update(t: number, dt: number): void
  // Turn back into blocks.
  leave(): void
  // A touch on the living picture. True if something answered.
  touch(ray: THREE.Ray, px: number, py: number): boolean
  dispose(): void
}

export interface CastleHooks {
  toStone(b: Block): void
  toWood(b: Block): void
  gone(): void
  // A few motes of light or a wisp of smoke at a place in the room.
  spark(x: number, y: number, z: number, kind: 'warm' | 'pale' | 'smoke'): void
}

const STONES = ['#f1e8d8', '#ecdcc8', '#e8d2c4', '#e9e2d6', '#dfd3c8']
const ROOFS = ['#d0694e', '#c9584a', '#6f8fb4', '#d88a4a', '#7f9a78']
const FLAGS = ['#d2493c', '#ebb93f', '#5a86c2']

// ------------------------------------------------------------------- the kit
// Shapes, textures and materials that every evening shares, made once.

interface Kit {
  stone: THREE.MeshLambertMaterial[]
  round: THREE.MeshLambertMaterial[]
  roof: THREE.MeshLambertMaterial[]
  roofRound: THREE.MeshLambertMaterial[]
  box(sx: number, sy: number, sz: number): THREE.BufferGeometry
  merlon: THREE.BufferGeometry
  merlonMat: THREE.MeshLambertMaterial
  pane: THREE.BufferGeometry
  windowMat: THREE.MeshBasicMaterial
  glowMat: THREE.MeshBasicMaterial
  poolMat: THREE.MeshBasicMaterial
  unit: THREE.BufferGeometry
  hallMat: THREE.MeshBasicMaterial
  ball: THREE.BufferGeometry
  ballMat: THREE.MeshBasicMaterial
  pole: THREE.BufferGeometry
  poleMat: THREE.MeshLambertMaterial
  flagMats: THREE.MeshLambertMaterial[]
  crown: THREE.BufferGeometry
  folkMat: THREE.MeshLambertMaterial
  kiteMat: THREE.MeshLambertMaterial
  king: THREE.BufferGeometry
  baker: THREE.BufferGeometry
  child: THREE.BufferGeometry
  kite: THREE.BufferGeometry
  head: THREE.BufferGeometry
  stringMat: THREE.LineBasicMaterial
}

const kits = new WeakMap<Room, Kit>()

const P = new THREE.Vector3()
const Qt = new THREE.Quaternion()
const S = new THREE.Vector3()
const E = new THREE.Euler()
const M = new THREE.Matrix4()
const C = new THREE.Color()

function at(x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz))
}

// Place a simple shape and give every corner of it a colour, so a whole
// figure can be one mesh.
function part(g: THREE.BufferGeometry, m: THREE.Matrix4, color: string, shade?: (n: THREE.Vector3, out: THREE.Color) => void): THREE.BufferGeometry {
  g.applyMatrix4(m)
  const n = g.getAttribute('normal')
  const count = g.getAttribute('position').count
  const col = new Float32Array(count * 3)
  const base = new THREE.Color(color)
  const v = new THREE.Vector3()
  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    c.copy(base)
    if (shade) shade(v.fromBufferAttribute(n, i), c)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  if (!merged) throw new Error('could not merge')
  return merged
}

const sph = () => new THREE.SphereGeometry(1, 12, 9)
const cyl = (top: number, bottom: number, h: number, seg = 14) => new THREE.CylinderGeometry(top, bottom, h, seg, 1)
const SKIN = '#f3d4b0'
const EYE = '#4b3b36'

function eyes(y: number, z: number, gap = 0.05, r = 0.017): THREE.BufferGeometry[] {
  return [-1, 1].map((s) => part(sph(), at(s * gap, y, z, r), EYE))
}

function kingGeo(): THREE.BufferGeometry {
  const gold = '#e9bd4c'
  const parts = [
    part(cyl(0.1, 0.235, 0.5), at(0, 0.25, 0), '#b9483d'),
    part(cyl(0.238, 0.25, 0.075), at(0, 0.04, 0), '#f5ecdb'),
    part(sph(), at(0, 0.5, 0, 0.15, 0.075, 0.15), '#f5ecdb'),
    part(sph(), at(-0.17, 0.35, 0.02, 0.06, 0.14, 0.065), '#b9483d'),
    part(sph(), at(0.17, 0.35, 0.02, 0.06, 0.14, 0.065), '#b9483d'),
    part(sph(), at(0, 0.62, 0, 0.135), SKIN),
    part(sph(), at(0, 0.555, 0.085, 0.1, 0.09, 0.07), '#f8f3e8'),
    ...eyes(0.645, 0.122),
    part(cyl(0.118, 0.105, 0.08, 10), at(0, 0.765, 0), gold),
  ]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3
    parts.push(part(new THREE.ConeGeometry(0.032, 0.085, 6), at(Math.cos(a) * 0.1, 0.84, Math.sin(a) * 0.1), gold))
  }
  return merge(parts)
}

function bakerGeo(): THREE.BufferGeometry {
  const cloth = '#f3e9d6'
  return merge([
    part(cyl(0.1, 0.215, 0.46), at(0, 0.23, 0), cloth),
    part(cyl(0.17, 0.2, 0.2, 14), at(0, 0.2, 0.012), '#d9c3a0'),
    part(sph(), at(0, 0.57, 0, 0.13), SKIN),
    ...eyes(0.59, 0.118),
    part(cyl(0.105, 0.095, 0.1), at(0, 0.71, 0), '#fdfaf3'),
    part(sph(), at(0, 0.8, 0, 0.15, 0.1, 0.15), '#fdfaf3'),
    part(sph(), at(-0.11, 0.36, 0.14, 0.05, 0.05, 0.12), cloth),
    part(sph(), at(0.11, 0.36, 0.14, 0.05, 0.05, 0.12), cloth),
    part(new THREE.BoxGeometry(0.38, 0.03, 0.2), at(0, 0.37, 0.28), '#b98654'),
    part(sph(), at(-0.09, 0.42, 0.28, 0.075, 0.05, 0.055), '#dba050'),
    part(sph(), at(0.09, 0.42, 0.28, 0.075, 0.05, 0.055), '#d1924a'),
  ])
}

function childGeo(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.08, 0.19, 0.4), at(0, 0.2, 0), '#5f88b4'),
    part(sph(), at(0, 0.5, 0, 0.125), SKIN),
    ...eyes(0.515, 0.113, 0.046, 0.016),
    part(new THREE.ConeGeometry(0.135, 0.24, 12), at(0, 0.69, -0.01, 1, 1, 1, -0.16, 0, 0), '#cc4d3e'),
    part(sph(), at(0.15, 0.43, 0, 0.045, 0.13, 0.045, 0, 0, -0.6), '#5f88b4'),
    part(sph(), at(-0.14, 0.32, 0.02, 0.045, 0.11, 0.045), '#5f88b4'),
  ])
}

function kiteGeo(): THREE.BufferGeometry {
  const parts = [
    part(new THREE.PlaneGeometry(0.44, 0.44), at(0, 0, 0, 0.82, 1.2, 1, 0, 0, Math.PI / 4), '#e8693f'),
    part(new THREE.BoxGeometry(0.02, 0.7, 0.012), at(0, 0, 0.008), '#f3e0ac'),
    part(new THREE.BoxGeometry(0.52, 0.02, 0.012), at(0, 0.02, 0.008), '#f3e0ac'),
    part(new THREE.BoxGeometry(0.012, 0.8, 0.008), at(0, -0.75, 0), '#f3e0ac'),
  ]
  const bows = ['#ebb93f', '#5a86c2', '#d2493c']
  bows.forEach((c, i) => parts.push(part(new THREE.PlaneGeometry(0.11, 0.11), at(0, -0.55 - i * 0.26, 0.004, 1.5, 0.7, 1, 0, 0, Math.PI / 4), c)))
  return merge(parts)
}

const DRAGON_BACK = '#6f9c5e'
const DRAGON_BELLY = '#dfe0a6'
const bellyShade = (n: THREE.Vector3, out: THREE.Color) => {
  const k = THREE.MathUtils.smoothstep(n.y, -0.75, 0.1)
  out.set(DRAGON_BELLY).lerp(C.set(DRAGON_BACK), k)
}

// The dragon's head, asleep, lying on the floor and facing +z.
function headGeo(): THREE.BufferGeometry {
  const parts = [
    part(sph(), at(0, 0.25, 0.08, 0.31, 0.25, 0.31), DRAGON_BACK, bellyShade),
    part(sph(), at(0, 0.185, 0.42, 0.225, 0.17, 0.29), DRAGON_BACK, bellyShade),
    part(sph(), at(-0.085, 0.27, 0.665, 0.026), '#3f5238'),
    part(sph(), at(0.085, 0.27, 0.665, 0.026), '#3f5238'),
    part(new THREE.ConeGeometry(0.065, 0.22, 8), at(-0.16, 0.5, -0.04, 1, 1, 1, -0.5, 0, 0.35), '#f3e3bc'),
    part(new THREE.ConeGeometry(0.065, 0.22, 8), at(0.16, 0.5, -0.04, 1, 1, 1, -0.5, 0, -0.35), '#f3e3bc'),
    // Paws tucked under the chin.
    part(sph(), at(-0.36, 0.085, 0.3, 0.13, 0.085, 0.19), DRAGON_BACK, bellyShade),
    part(sph(), at(0.36, 0.085, 0.3, 0.13, 0.085, 0.19), DRAGON_BACK, bellyShade),
  ]
  // Eyes shut: two small downward curves.
  for (const s of [-1, 1]) parts.push(part(new THREE.TorusGeometry(0.06, 0.013, 5, 10, Math.PI), at(s * 0.2, 0.36, 0.26, 1, 1, 1, Math.PI, s * 0.95, 0), '#3f5238'))
  return merge(parts)
}

function crownGeo(): THREE.BufferGeometry {
  const greens = ['#76a85c', '#8cba68', '#a0ca78', '#80b262']
  const parts: THREE.BufferGeometry[] = []
  const blobs = [
    [0, 0.34, 0, 0.5],
    [0.36, 0.2, 0.1, 0.36],
    [-0.34, 0.22, -0.08, 0.38],
    [0.08, 0.2, 0.36, 0.34],
    [-0.1, 0.24, -0.36, 0.34],
    [0.1, 0.66, -0.04, 0.34],
  ]
  blobs.forEach(([x, y, z, r], i) => parts.push(part(new THREE.IcosahedronGeometry(1, 1), at(x!, y!, z!, r!, r! * 0.86, r!, i, i * 2, 0), greens[i % greens.length]!)))
  // Blossom.
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4
    const up = 0.25 + ((i * 37) % 10) / 16
    const rad = 0.5 * Math.sqrt(Math.max(0.05, 1 - (up - 0.36) * (up - 0.36) * 3))
    parts.push(part(new THREE.IcosahedronGeometry(1, 0), at(Math.cos(a) * rad, up, Math.sin(a) * rad, 0.055), i % 3 ? '#f7d3d0' : '#fbeeda'))
  }
  // Icosahedra carry no index; give every part one so they merge.
  return merge(parts.map((p) => (p.index ? p : indexed(p))))
}

function indexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.getAttribute('position').count
  g.setIndex(Array.from({ length: n }, (_, i) => i))
  return g
}

function kitFor(room: Room): Kit {
  const had = kits.get(room)
  if (had) return had
  const own = room.own
  const stoneTex = room.texture(paintStone(71), true)
  const roundTex = room.texture(paintStone(73), true)
  roundTex.repeat.set(3, 2)
  const tileTex = room.texture(paintTiles(75), true)
  tileTex.repeat.set(1.6, 1.6)
  const tileRound = room.texture(paintTiles(77), true)
  tileRound.repeat.set(5, 2)
  const glowTex = room.texture(paintGlow())
  const boxes = new Map<string, THREE.BufferGeometry>()
  const kit: Kit = {
    stone: STONES.map((c) => own(new THREE.MeshLambertMaterial({ map: stoneTex, color: c }))),
    round: STONES.map((c) => own(new THREE.MeshLambertMaterial({ map: roundTex, color: c }))),
    roof: ROOFS.map((c) => own(new THREE.MeshLambertMaterial({ map: tileTex, color: c }))),
    roofRound: ROOFS.map((c) => own(new THREE.MeshLambertMaterial({ map: tileRound, color: c }))),
    box(sx, sy, sz) {
      const key = `${sx},${sy},${sz}`
      let g = boxes.get(key)
      if (!g) {
        g = own(new RoundedBoxGeometry(sx, sy, sz, 3, 0.045))
        const uv = g.getAttribute('uv') as THREE.BufferAttribute
        const per = uv.count / 6
        const dims = [
          [sz, sy],
          [sz, sy],
          [sx, sz],
          [sx, sz],
          [sx, sy],
          [sx, sy],
        ] as const
        for (let i = 0; i < uv.count; i++) {
          const d = dims[Math.min(5, Math.floor(i / per))]!
          uv.setXY(i, uv.getX(i) * d[0], uv.getY(i) * d[1])
        }
        boxes.set(key, g)
      }
      return g
    },
    merlon: own(new THREE.BoxGeometry(0.2, 0.22, 0.2)),
    merlonMat: own(new THREE.MeshLambertMaterial({ color: '#ffffff' })),
    pane: own(new THREE.PlaneGeometry(0.27, 0.4)),
    windowMat: own(new THREE.MeshBasicMaterial({ map: room.texture(paintWindow()), transparent: true, opacity: 0, depthWrite: false })),
    glowMat: own(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true })),
    poolMat: own(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    unit: own(new THREE.PlaneGeometry(1, 1)),
    hallMat: own(new THREE.MeshBasicMaterial({ map: room.texture(paintHall()), transparent: true, opacity: 0 })),
    ball: own(new THREE.SphereGeometry(1, 12, 9)),
    ballMat: own(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
    pole: own(new THREE.CylinderGeometry(0.022, 0.028, 1, 6)),
    poleMat: own(new THREE.MeshLambertMaterial({ color: '#8a6a4a' })),
    flagMats: FLAGS.map((c) => own(new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.25 }))),
    crown: own(crownGeo()),
    folkMat: own(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#3a2a22', emissiveIntensity: 0.5 })),
    kiteMat: own(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#4a3020', emissiveIntensity: 0.6 })),
    king: own(kingGeo()),
    baker: own(bakerGeo()),
    child: own(childGeo()),
    kite: own(kiteGeo()),
    head: own(headGeo()),
    stringMat: own(new THREE.LineBasicMaterial({ color: '#f3e6c4', transparent: true, opacity: 0.8 })),
  }
  kits.set(room, kit)
  return kit
}

// Make the kit ahead of time, and have the renderer build every material the
// evening will need, so the first ring of the bell does not stumble.
export function prepareCastle(room: Room): void {
  const kit = kitFor(room)
  const warm = new THREE.Group()
  const many = (geo: THREE.BufferGeometry, mat: THREE.Material, tinted: boolean) => {
    const mesh = new THREE.InstancedMesh(geo, mat, 1)
    mesh.setMatrixAt(0, M.identity())
    if (tinted) mesh.setColorAt(0, C.set('#ffffff'))
    warm.add(mesh)
    return mesh
  }
  const made = [many(kit.merlon, kit.merlonMat, true), many(kit.pane, kit.windowMat, false), many(kit.unit, kit.glowMat, false), many(kit.unit, kit.poolMat, false), many(kit.ball, kit.ballMat, true)]
  for (const mat of [kit.stone[0]!, kit.roof[0]!, kit.hallMat, kit.poleMat, kit.flagMats[0]!]) warm.add(new THREE.Mesh(kit.unit, mat))
  warm.add(new THREE.Mesh(kit.king, kit.folkMat))
  warm.add(new THREE.Mesh(kit.kite, kit.kiteMat))
  const thread = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)])
  warm.add(new THREE.Line(thread, kit.stringMat))
  room.scene.add(warm)
  room.renderer.compile(room.scene, room.camera)
  room.scene.remove(warm)
  for (const mesh of made) mesh.dispose()
  thread.dispose()
}

// ---------------------------------------------------------------- the dragon

// A line along the floor round the back of the building's foot: head by the
// near right corner, tail curling out at the near left one.
function dragonPath(base: { x0: number; x1: number; z0: number; z1: number } | null): [number, number][] {
  const raw: [number, number][] = []
  if (!base) {
    // Nothing built: it curls up in the middle of the floor.
    const cx = (BUILD.x0 + BUILD.x1) / 2
    for (let i = 0; i <= 40; i++) {
      const a = 0.9 - (i / 40) * 5.3
      const r = 1.05 - (i / 40) * 0.3
      raw.push([cx + Math.cos(a) * r, 0.2 + Math.sin(a) * r * 0.8])
    }
    return raw
  }
  const m = 0.62
  const xr = Math.min(base.x1 + m, BUILD.x1 + 0.62)
  const xl = base.x0 - m
  const zb = Math.max(base.z0 - m, WALL_Z + 0.62)
  const zf = base.z1
  const corner = (cx: number, cz: number, a0: number, a1: number, r: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + ((a1 - a0) * i) / 6
      raw.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  const r = 0.5
  raw.push([xr + 0.05, zf + 0.42])
  raw.push([xr, zf - 0.1])
  corner(xr - r, zb + r, 0, -Math.PI / 2, r)
  corner(xl + r, zb + r, -Math.PI / 2, -Math.PI, r)
  raw.push([xl, zf - 0.2])
  // The tail turns in toward the front and curls.
  corner(xl + 0.45, zf + 0.1, Math.PI, Math.PI * 0.35, 0.45)
  return raw
}

// Walk a polyline at even steps.
function resample(raw: [number, number][], step: number, maxLen: number): [number, number][] {
  const out: [number, number][] = [raw[0]!]
  let need = step
  let total = 0
  for (let i = 1; i < raw.length; i++) {
    let [ax, az] = raw[i - 1]!
    const [bx, bz] = raw[i]!
    let seg = Math.hypot(bx - ax, bz - az)
    while (seg >= need) {
      const k = need / seg
      ax += (bx - ax) * k
      az += (bz - az) * k
      out.push([ax, az])
      total += step
      if (total >= maxLen) return out
      seg -= need
      need = step
    }
    need -= seg
  }
  return out
}

function dragonBody(path: [number, number][]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const n = path.length
  for (let i = 1; i < n; i++) {
    const k = i / (n - 1)
    // Neck, a full middle, and a long thinning tail.
    const r = k < 0.12 ? 0.25 + (k / 0.12) * 0.13 : k < 0.45 ? 0.38 + Math.sin(((k - 0.12) / 0.33) * Math.PI) * 0.05 : 0.38 * Math.pow(1 - (k - 0.45) / 0.55, 0.8) + 0.05
    const [x, z] = path[i]!
    const [px, pz] = path[i - 1]!
    const yaw = Math.atan2(x - px, z - pz)
    parts.push(part(sph(), at(x, r * 0.9, z, r * 0.95, r * 0.9, r * 1.25, 0, yaw, 0), DRAGON_BACK, bellyShade))
    if (i % 2 === 0 && k < 0.9) parts.push(part(new THREE.ConeGeometry(r * 0.3, r * 0.55, 6), at(x, r * 1.8 + r * 0.16, z, 0.55, 1, 1.2, 0, yaw, 0), '#e7ab55'))
  }
  // A leaf at the tip of the tail.
  const [tx, tz] = path[n - 1]!
  const [qx, qz] = path[n - 2]!
  const yaw = Math.atan2(tx - qx, tz - qz)
  parts.push(part(new THREE.ConeGeometry(0.13, 0.3, 6), at(tx + Math.sin(yaw) * 0.12, 0.07, tz + Math.cos(yaw) * 0.12, 1, 1, 0.35, Math.PI / 2, yaw, 0, ), '#e7ab55'))
  return merge(parts)
}

// ----------------------------------------------------------------- the build

interface Stone {
  b: Block
  holder: THREE.Group | null
  pop: number
  vel: number
  shown: boolean
  // Lights that belong to this block, to brighten when it is touched.
  glows: number[]
}

interface Glow {
  x: number
  y: number
  z: number
  size: number
  ph: number
  pulse: number
}

interface Person {
  mesh: THREE.Mesh
  x: number
  y: number
  z: number
  size: number
  show: number
  want: number
  hop: number
  turn: number
  face: number
}

export function raiseCastle(room: Room, blocks: Block[], sound: Sound, hooks: CastleHooks): Castle {
  const kit = kitFor(room)
  const root = new THREE.Group()
  room.scene.add(root)
  const mine: { dispose(): void }[] = []

  const order = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z)
  const stones: Stone[] = order.map((b) => ({ b, holder: null, pop: 1, vel: 0, shown: false, glows: [] }))

  // ---- stone for every block (branches stay branches)
  stones.forEach((s, i) => {
    const b = s.b
    if (b.kind === 'log') return
    const size = sizeOf(b)
    const pose = POSES[b.kind][b.o]!
    const tone = b.tone % STONES.length
    const roof = (b.id * 2 + i) % ROOFS.length
    let mesh: THREE.Mesh
    if (b.kind === 'cube' || b.kind === 'plank') mesh = new THREE.Mesh(kit.box(size[0], size[1], size[2]), kit.stone[tone])
    else {
      let material: THREE.Material | THREE.Material[]
      if (b.kind === 'column') material = [kit.round[tone]!, kit.stone[tone]!]
      else if (b.kind === 'cone') material = [kit.roofRound[roof]!, kit.stone[tone]!]
      else if (b.kind === 'arch') material = kit.stone[tone]!
      else material = [kit.stone[tone]!, kit.roof[roof]!]
      mesh = new THREE.Mesh(room.geo[b.kind], material)
      mesh.rotation.set(pose.rot[0], pose.rot[1], pose.rot[2])
    }
    const holder = new THREE.Group()
    holder.add(mesh)
    const [cx, cy, cz] = centreOf(b)
    holder.position.set(cx, cy, cz)
    holder.visible = false
    holder.userData.stone = s
    root.add(holder)
    s.holder = holder
  })

  // ---- battlements on every open flat top
  const merlons: { x: number; y: number; z: number; yaw: number; tone: number }[] = []
  for (const b of blocks) {
    if (!flatTopped(b) || b.kind === 'log') continue
    const size = sizeOf(b)
    const top = topOf(b)
    const free = (x: number, z: number) => !solidAt(blocks, x, top + 0.12, z, b)
    if (b.kind === 'column') {
      const [cx, , cz] = centreOf(b)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        const x = cx + Math.cos(a) * 0.385
        const z = cz + Math.sin(a) * 0.385
        if (free(x, z)) merlons.push({ x, y: top, z, yaw: -a, tone: b.tone })
      }
      continue
    }
    const inset = 0.115
    const nx = Math.max(2, Math.round((size[0] - inset * 2) / 0.37) + 1)
    const nz = Math.max(2, Math.round((size[2] - inset * 2) / 0.37) + 1)
    for (let i = 0; i < nx; i++) {
      const x = b.x + inset + ((size[0] - inset * 2) * i) / (nx - 1)
      for (const z of [b.z + inset, b.z + size[2] - inset]) if (free(x, z)) merlons.push({ x, y: top, z, yaw: 0, tone: b.tone })
    }
    for (let i = 1; i < nz - 1; i++) {
      const z = b.z + inset + ((size[2] - inset * 2) * i) / (nz - 1)
      for (const x of [b.x + inset, b.x + size[0] - inset]) if (free(x, z)) merlons.push({ x, y: top, z, yaw: 0, tone: b.tone })
    }
  }
  const merlonMesh = new THREE.InstancedMesh(kit.merlon, kit.merlonMat, Math.max(1, merlons.length))
  merlonMesh.count = merlons.length
  merlonMesh.frustumCulled = false
  merlons.forEach((m, i) => merlonMesh.setColorAt(i, C.set(STONES[m.tone % STONES.length]!).multiplyScalar(0.97)))
  root.add(merlonMesh)
  mine.push(merlonMesh)
  let grown = -1
  const growMerlons = (k: number) => {
    if (k === grown) return
    grown = k
    merlons.forEach((m, i) => {
      M.compose(P.set(m.x, m.y + 0.11 * k - 0.02, m.z), Qt.setFromEuler(E.set(0, m.yaw, 0)), S.set(1, Math.max(0.001, k), 1))
      merlonMesh.setMatrixAt(i, M)
    })
    merlonMesh.instanceMatrix.needsUpdate = true
  }
  growMerlons(0)

  // ---- windows, lanterns, gateways: the lights
  const glows: Glow[] = []
  const pools: Glow[] = []
  const panes: { x: number; y: number; z: number; side: boolean }[] = []
  const balls: { x: number; y: number; z: number; r: number; color: string }[] = []
  const stoneOf = new Map(stones.map((s) => [s.b, s]))
  const addGlow = (b: Block | null, x: number, y: number, z: number, size: number) => {
    glows.push({ x, y, z, size, ph: glows.length * 1.7, pulse: 0 })
    if (b) stoneOf.get(b)?.glows.push(glows.length - 1)
  }
  const windowAt = (b: Block, x: number, y: number, z: number, side: boolean) => {
    // Only where the wall is open to the air.
    if (solidAt(blocks, x + (side ? 0.25 : 0), y, z + (side ? 0 : 0.25))) return
    panes.push({ x, y, z, side })
    addGlow(b, x + (side ? 0.05 : 0), y, z + (side ? 0 : 0.05), 0.95)
  }
  for (const b of blocks) {
    const size = sizeOf(b)
    const [cx, , cz] = centreOf(b)
    const x1 = b.x + size[0] + 0.006
    const z1 = b.z + size[2] + 0.006
    if (b.kind === 'cube') {
      windowAt(b, cx, b.y + 0.5, z1, false)
      windowAt(b, x1, b.y + 0.5, cz, true)
    } else if (b.kind === 'column' && b.o === 0) {
      windowAt(b, cx, b.y + 1.32, z1, false)
      windowAt(b, x1, b.y + 0.62, cz, true)
    } else if (b.kind === 'plank' && b.o === 2) {
      windowAt(b, cx, b.y + 2.3, z1, false)
      windowAt(b, x1, b.y + 2.3, cz, true)
      windowAt(b, x1, b.y + 1.1, cz, true)
    }
  }
  // A gateway in every arch.
  const halls: THREE.Mesh[] = []
  for (const b of blocks) {
    if (b.kind !== 'arch') continue
    const [cx, , cz] = centreOf(b)
    const hall = new THREE.Mesh(kit.unit, kit.hallMat)
    hall.scale.set(1.24, 1.16, 1)
    const alongX = b.o === 0
    hall.position.set(cx - (alongX ? 0 : 0.28), b.y + 0.58, cz - (alongX ? 0.28 : 0))
    if (!alongX) hall.rotation.y = Math.PI / 2
    root.add(hall)
    halls.push(hall)
    addGlow(b, cx + (alongX ? 0 : 0.3), b.y + 0.55, cz + (alongX ? 0.3 : 0), 1.9)
    balls.push({ x: cx, y: b.y + 0.98, z: cz, r: 0.07, color: '#ffe9a8' })
    const under = b.y
    pools.push({ x: cx + (alongX ? 0 : 0.9), y: under + 0.025, z: cz + (alongX ? 0.9 : 0), size: 2.4, ph: 0, pulse: 0 })
  }
  // A lantern in every roofed-over space.
  const rooms = hollows(blocks)
  for (const h of rooms) {
    const y = h.y + h.h / 2 - 0.3
    balls.push({ x: h.x, y, z: h.z, r: 0.085, color: '#ffe9a8' })
    balls.push({ x: h.x, y: y + 0.17, z: h.z, r: 0.02, color: '#8a6a4a' })
    addGlow(h.under, h.x, y, h.z, 2.1)
    pools.push({ x: h.x, y: h.y - h.h / 2 + 0.025, z: h.z, size: Math.max(h.w, h.d) + 1.3, ph: 0, pulse: 0 })
  }
  // A gilt ball on every roof point.
  for (const b of blocks) {
    if (b.kind !== 'cone') continue
    const [cx, , cz] = centreOf(b)
    balls.push({ x: cx, y: topOf(b) + 0.03, z: cz, r: 0.06, color: '#f0c85a' })
  }

  const paneMesh = new THREE.InstancedMesh(kit.pane, kit.windowMat, Math.max(1, panes.length))
  paneMesh.count = panes.length
  paneMesh.frustumCulled = false
  paneMesh.renderOrder = 5
  panes.forEach((w, i) => {
    M.compose(P.set(w.x, w.y, w.z), Qt.setFromEuler(E.set(0, w.side ? Math.PI / 2 : 0, 0)), S.set(1, 1, 1))
    paneMesh.setMatrixAt(i, M)
  })
  root.add(paneMesh)
  mine.push(paneMesh)

  const ballMesh = new THREE.InstancedMesh(kit.ball, kit.ballMat, Math.max(1, balls.length))
  ballMesh.count = balls.length
  ballMesh.frustumCulled = false
  balls.forEach((b, i) => ballMesh.setColorAt(i, C.set(b.color)))
  root.add(ballMesh)
  mine.push(ballMesh)
  const growBalls = (k: number) => {
    balls.forEach((b, i) => {
      M.compose(P.set(b.x, b.y, b.z), Qt.identity(), S.setScalar(Math.max(0.0001, b.r * k)))
      ballMesh.setMatrixAt(i, M)
    })
    ballMesh.instanceMatrix.needsUpdate = true
  }
  growBalls(0)

  // ---- leaves on the branch blocks
  const crowns: { mesh: THREE.Mesh; size: number }[] = []
  for (const b of blocks) {
    if (b.kind !== 'log') continue
    const open = coveredShare(blocks, b) < 0.3
    const [cx, , cz] = centreOf(b)
    const mesh = new THREE.Mesh(kit.crown, kit.folkMat)
    const upright = b.o === 0
    const size = upright && open ? 1.05 : 0.5
    mesh.position.set(cx + (upright ? 0 : 0.35), topOf(b) - (upright && open ? 0.08 : 0.12), cz + (upright && open ? 0 : 0.3))
    mesh.rotation.y = b.id * 1.3
    mesh.scale.setScalar(0.0001)
    root.add(mesh)
    crowns.push({ mesh, size })
  }

  // ---- pennants on the highest points
  const peaks = blocks
    .filter((b) => coveredShare(blocks, b) === 0 && b.kind !== 'log' && topOf(b) > 0.9)
    .sort((a, b) => topOf(b) - topOf(a))
  const flags: { pole: THREE.Mesh; flag: THREE.Mesh; geo: THREE.BufferGeometry; x: number; y: number; z: number; show: number }[] = []
  const flagged: Block[] = []
  for (const b of peaks) {
    if (flags.length >= 3) break
    const [cx, , cz] = centreOf(b)
    if (flagged.some((f) => Math.hypot(centreOf(f)[0] - cx, centreOf(f)[2] - cz) < 0.9)) continue
    flagged.push(b)
    const pointed = !flatTopped(b)
    const size = sizeOf(b)
    // On a flat top the pole stands at the back corner, out of the way.
    const x = pointed ? cx : b.x + Math.min(0.2, size[0] / 2)
    const z = pointed ? cz : b.z + Math.min(0.2, size[2] / 2)
    const y = topOf(b) - (pointed && b.kind !== 'cone' ? 0.03 : 0)
    const pole = new THREE.Mesh(kit.pole, kit.poleMat)
    pole.position.set(x, y + 0.5, z)
    const geo = new THREE.PlaneGeometry(0.72, 0.34, 6, 1)
    geo.translate(0.36, 0, 0)
    mine.push(geo)
    const flag = new THREE.Mesh(geo, kit.flagMats[flags.length % kit.flagMats.length])
    flag.position.set(x + 0.02, y + 0.82, z)
    pole.visible = false
    flag.visible = false
    root.add(pole)
    root.add(flag)
    flags.push({ pole, flag, geo, x, y, z, show: 0 })
  }

  // ---- the folk
  const person = (geo: THREE.BufferGeometry, x: number, y: number, z: number, size: number, face = 0): Person => {
    const mesh = new THREE.Mesh(geo, kit.folkMat)
    mesh.position.set(x, y, z)
    mesh.scale.setScalar(0.0001)
    mesh.rotation.y = face
    root.add(mesh)
    return { mesh, x, y, z, size, show: 0, want: 0, hop: 0, turn: 0, face }
  }
  const lookout = 0.32
  // Can a place be seen from where the child sits, or is it behind a wall?
  const eye = new THREE.Vector3(0, 0, 1).applyQuaternion(room.camera.quaternion)
  const seen = (x: number, y: number, z: number): boolean => {
    for (let d = 0.3; d < 7; d += 0.2) if (solidAt(blocks, x + eye.x * d, y + 0.45 + eye.y * d, z + eye.z * d)) return false
    return true
  }
  // Open flat tops someone could stand on: the middle of the top if all of it
  // is open, else the open place nearest the middle. Highest first, but a
  // place that can be seen before one that is hidden.
  const spotOn = (b: Block): [number, number] | null => {
    const size = sizeOf(b)
    const top = topOf(b)
    const [cx, , cz] = centreOf(b)
    if (coveredShare(blocks, b) === 0 && seen(cx, top, cz)) return [cx, cz]
    let best: [number, number] | null = null
    let bestD = Infinity
    for (let x = b.x + 0.25; x < b.x + size[0]; x += 0.5) {
      for (let z = b.z + 0.25; z < b.z + size[2]; z += 0.5) {
        if (solidAt(blocks, x, top + 0.2, z, b)) continue
        const d = Math.hypot(x - cx, z - cz - 0.1) + (seen(x, top, z) ? 0 : 10)
        if (d < bestD) {
          bestD = d
          best = [size[0] <= 0.5 ? cx : x, size[2] <= 0.5 ? cz : z]
        }
      }
    }
    return best
  }
  const walks = blocks
    .filter((b) => flatTopped(b) && b.kind !== 'log' && topOf(b) > 0.4)
    .map((b) => {
      const spot = spotOn(b)
      return spot ? { x: spot[0], y: topOf(b), z: spot[1], seen: seen(spot[0], topOf(b), spot[1]) } : null
    })
    .filter((w): w is { x: number; y: number; z: number; seen: boolean } => w !== null)
    .sort((a, b) => Number(b.seen) - Number(a.seen) || b.y - a.y || b.z - a.z)
  const feet = bases(blocks)
  const base = feet[0] ?? null
  const frontZ = base ? Math.min(base.z1 + 0.75, BUILD.z1 + 0.95) : 2.45
  const midX = base ? (base.x0 + base.x1) / 2 : (BUILD.x0 + BUILD.x1) / 2

  // With nowhere to stand, they stand on the floor before the building (or,
  // with nothing built at all, either side of the sleeping dragon).
  const kingSpot = walks[0] ?? (base ? { x: midX + 0.9, y: 0, z: frontZ + 0.65 } : { x: midX + 1.9, y: 0, z: 0.5 })
  const king = person(kit.king, kingSpot.x, kingSpot.y, kingSpot.z, 1, lookout)

  const childWalk = walks.find((w) => w !== walks[0] && Math.hypot(w.x - kingSpot.x, w.z - kingSpot.z) > 0.9)
  const childSpot = childWalk ?? (base ? { x: Math.min(base.x0 + 0.4, midX - 0.3), y: 0, z: frontZ + 0.65 } : { x: midX - 2.0, y: 0, z: 1.1 })
  const child = person(kit.child, childSpot.x, childSpot.y, childSpot.z, 0.95, 0.2)
  const kite = new THREE.Mesh(kit.kite, kit.kiteMat)
  kite.scale.setScalar(0.0001)
  root.add(kite)
  const stringGeo = new THREE.BufferGeometry()
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9 * 3), 3))
  mine.push(stringGeo)
  const string = new THREE.Line(stringGeo, kit.stringMat)
  string.frustumCulled = false
  string.visible = false
  root.add(string)
  // The kite flies up and toward the middle of the room.
  const kiteHome = new THREE.Vector3(childSpot.x + (childSpot.x < -1.5 ? 1.5 : -1.5), Math.min(childSpot.y + 3.5, 5.2), childSpot.z - 0.6)
  let kiteLoop = 0

  // The baker walks to and fro before the gate (or the front of the building).
  const gate = blocks.find((b) => b.kind === 'arch' && b.y < 0.01 && b.o === 0)
  const bakerX = gate ? centreOf(gate)[0] : midX + 0.4
  const bakerZ = gate ? Math.min(gate.z + sizeOf(gate)[2] + 0.7, BUILD.z1 + 0.95) : frontZ
  const baker = person(kit.baker, bakerX, 0, bakerZ, 1, 0)
  const pace = { from: Math.max(base ? base.x0 + 0.2 : BUILD.x0, bakerX - 1.3), to: Math.min(base ? base.x1 - 0.2 : BUILD.x1, bakerX + 1.3), dir: 1, rest: 1.5 }

  // The dragon.
  const path = resample(dragonPath(base), 0.3, 8.4)
  const bodyGeo = dragonBody(path)
  mine.push(bodyGeo)
  const dragon = new THREE.Group()
  const body = new THREE.Mesh(bodyGeo, kit.folkMat)
  dragon.add(body)
  const head = new THREE.Mesh(kit.head, kit.folkMat)
  const [hx, hz] = path[0]!
  const [nx1, nz1] = path[1]!
  head.rotation.y = Math.atan2(hx - nx1, hz - nz1)
  head.scale.setScalar(1.15)
  dragon.add(head)
  // It grows from where its middle lies.
  const mid = path[Math.floor(path.length * 0.3)]!
  dragon.position.set(mid[0], 0, mid[1])
  body.position.set(-mid[0], 0, -mid[1])
  head.position.set(hx - mid[0], 0, hz - mid[1])
  dragon.scale.setScalar(0.0001)
  root.add(dragon)
  const nose = new THREE.Vector3(hx + Math.sin(head.rotation.y) * 0.85, 0.34, hz + Math.cos(head.rotation.y) * 0.85)
  let dragonShow = 0
  let dragonWant = 0
  let wake = 0
  let nextPuff = 6
  pools.push({ x: nose.x, y: 0.02, z: nose.z, size: 0.0001, ph: 0, pulse: 0 })
  const nosePool = pools.length - 1

  // A warm lamp held by the king, and warmth on the stone near the gate.
  addGlow(null, king.x + 0.2, king.y + 0.45, king.z + 0.12, 0.6)
  const kingGlow = glows.length - 1
  const lamp = room.lamp
  lamp.position.set(gate ? centreOf(gate)[0] : midX, 1.1, (gate ? gate.z + 1 : (base?.z1 ?? 0)) + 1.1)

  const glowMesh = new THREE.InstancedMesh(kit.unit, kit.glowMat, Math.max(1, glows.length))
  glowMesh.count = glows.length
  glowMesh.frustumCulled = false
  glowMesh.renderOrder = 7
  root.add(glowMesh)
  mine.push(glowMesh)
  const poolMesh = new THREE.InstancedMesh(kit.unit, kit.poolMat, Math.max(1, pools.length))
  poolMesh.count = pools.length
  poolMesh.frustumCulled = false
  poolMesh.renderOrder = 6
  root.add(poolMesh)
  mine.push(poolMesh)
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))

  // ---- the tune: the building's own outline, read left to right
  const line = skyline(blocks, 8)
  const tune = line.length ? line.map((h) => (h < 0.2 ? null : Math.max(-5, Math.min(7, Math.round(h * 1.7) - 4)))) : [0, 2, 4, 2, 0, null, -1, 0]
  let tuneAt = 0
  let tuneI = 0
  let phrase = 0
  let nextCricket = 5

  // ---- time
  let age = 0
  let leaving = -1
  let lights = 0
  let lightsWant = 0
  let grow = 0
  let growWant = 0
  let done = false
  const n = stones.length
  const riseFor = Math.min(2.4, 0.17 * n)
  const t1 = 0.9 + riseFor + 0.35
  const fallFor = Math.min(1.3, 0.09 * n)
  const events: { at: number; fn: () => void }[] = []
  const exits: { at: number; fn: () => void }[] = []
  stones.forEach((s, i) => {
    const [cx, cy, cz] = centreOf(s.b)
    events.push({
      at: 0.9 + (n > 1 ? (i / (n - 1)) * riseFor : 0),
      fn: () => {
        if (s.holder) {
          hooks.toStone(s.b)
          s.holder.visible = true
        }
        s.shown = true
        s.pop = 1.07
        s.vel = 0
        sound.stone(i)
        hooks.spark(cx, cy, cz + sizeOf(s.b)[2] / 2, 'pale')
      },
    })
    exits.push({
      at: 0.75 + (n > 1 ? ((n - 1 - i) / (n - 1)) * fallFor : 0),
      fn: () => {
        if (s.holder) s.holder.visible = false
        s.shown = false
        hooks.toWood(s.b)
        if (i % 3 === 0) sound.clack(1.5, false, 0.3)
      },
    })
  })
  events.push({ at: t1, fn: () => (growWant = 1) })
  events.push({
    at: t1 + 0.55,
    fn: () => {
      lightsWant = 1
      sound.lyre(0, 0.06)
      sound.lyre(2, 0.05, 0.35)
      sound.lyre(4, 0.05, 0.7)
    },
  })
  flags.forEach((f, i) =>
    events.push({
      at: t1 + 1.3 + i * 0.3,
      fn: () => {
        f.show = 0.001
        sound.flag()
      },
    }),
  )
  const arrive = (who: Person, when: number, step: number) =>
    events.push({
      at: when,
      fn: () => {
        who.want = 1
        sound.lyre(step, 0.055)
        hooks.spark(who.x, who.y + 0.4, who.z, 'warm')
      },
    })
  arrive(king, t1 + 2.0, 4)
  arrive(baker, t1 + 2.7, 2)
  arrive(child, t1 + 3.4, 5)
  events.push({
    at: t1 + 4.1,
    fn: () => {
      dragonWant = 1
      sound.purr()
    },
  })
  events.push({ at: t1 + 5.6, fn: () => (done = true) })
  events.sort((a, b) => a.at - b.at)
  exits.push({ at: fallFor + 1.0, fn: () => hooks.gone() })
  exits.sort((a, b) => a.at - b.at)

  const updatePerson = (who: Person, dt: number, t: number, bob: number) => {
    who.show += (who.want - who.show) * Math.min(1, dt * (who.want ? 5 : 9))
    if (who.hop > 0) who.hop = Math.max(0, who.hop - dt * 1.8)
    const k = who.show
    const pop = who.want ? 1 + Math.sin(Math.min(1, k) * Math.PI) * 0.18 : 1
    const duck = Math.sin(who.hop * Math.PI)
    who.mesh.visible = k > 0.01
    who.mesh.scale.set(who.size * k * pop, who.size * k * pop * (1 - duck * 0.28), who.size * k * pop)
    who.mesh.position.set(who.x, who.y + Math.abs(Math.sin(t * 1.1 + bob)) * 0.012, who.z)
    who.mesh.rotation.y = who.face + who.turn
  }

  const camQ = room.camera.quaternion
  const toCam = new THREE.Vector3(0, 0, 1).applyQuaternion(camQ)

  return {
    get settled() {
      return done
    },

    update(t, dt) {
      age += dt
      if (leaving < 0) {
        while (events.length && events[0]!.at <= age) events.shift()!.fn()
      } else {
        leaving += dt
        while (exits.length && exits[0]!.at <= leaving) exits.shift()!.fn()
      }

      // Stone settles with a small swell.
      for (const s of stones) {
        if (s.pop === 1 && s.vel === 0) continue
        s.vel += (1 - s.pop) * 260 * dt - s.vel * 14 * dt
        s.pop += s.vel * dt
        if (Math.abs(s.pop - 1) < 0.0005 && Math.abs(s.vel) < 0.002) {
          s.pop = 1
          s.vel = 0
        }
        s.holder?.scale.setScalar(s.pop)
      }

      grow += (growWant - grow) * Math.min(1, dt * 5)
      const g = growWant ? Math.min(1, grow * 1.04) : grow < 0.01 ? 0 : grow
      growMerlons(Math.round(g * 200) / 200)
      growBalls(g)
      for (const c of crowns) c.mesh.scale.setScalar(Math.max(0.0001, c.size * g * (1 + Math.sin(t * 0.8 + c.size * 9) * 0.012)))

      lights += (lightsWant - lights) * Math.min(1, dt * (lightsWant ? 1.6 : 5))
      kit.windowMat.opacity = lights
      kit.hallMat.opacity = Math.min(1, lights * 1.4)
      for (const h of halls) h.visible = lights > 0.01
      paneMesh.visible = lights > 0.01
      kit.glowMat.opacity = lights * 0.75
      kit.poolMat.opacity = lights * 0.42
      lamp.intensity = lights * 9

      // Lamplight breathes a little; a touched window flares and settles.
      glows.forEach((gl, i) => {
        if (gl.pulse > 0) gl.pulse = Math.max(0, gl.pulse - dt * 1.3)
        const flick = 1 + Math.sin(t * 2.3 + gl.ph) * 0.035 + Math.sin(t * 5.1 + gl.ph * 2) * 0.02
        let size = gl.size * flick * (1 + gl.pulse * 0.9)
        if (i === kingGlow) {
          size *= king.show
          P.set(king.x + 0.2, king.y + 0.45, king.z + 0.14)
        } else P.set(gl.x, gl.y, gl.z)
        // Held a little toward the eye, so the wall it shines on does not cut it.
        P.addScaledVector(toCam, 0.3 + gl.size * 0.25)
        M.compose(P, camQ, S.setScalar(Math.max(0.0001, size)))
        glowMesh.setMatrixAt(i, M)
      })
      glowMesh.instanceMatrix.needsUpdate = true
      pools.forEach((p, i) => {
        const size = i === nosePool ? 1.3 * wake : p.size
        M.compose(P.set(p.x, p.y, p.z), flat, S.setScalar(Math.max(0.0001, size)))
        poolMesh.setMatrixAt(i, M)
      })
      poolMesh.instanceMatrix.needsUpdate = true

      // Pennants unfurl, then ripple in the evening air.
      for (const f of flags) {
        if (f.show <= 0) continue
        const want = leaving >= 0 ? 0 : 1
        f.show = Math.max(0.0005, f.show + (want - f.show) * Math.min(1, dt * 4))
        f.pole.visible = f.flag.visible = f.show > 0.004
        f.pole.scale.set(1, Math.min(1, f.show * 1.6), 1)
        f.pole.position.y = f.y + 0.5 * Math.min(1, f.show * 1.6)
        f.flag.scale.set(Math.max(0.0001, f.show), 1, 1)
        const pos = f.geo.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const taper = 1 - (x / 0.72) * 0.9
          const side = i < pos.count / 2 ? 1 : -1
          pos.setY(i, side * 0.17 * taper + Math.sin(t * 3.2 - x * 7 + f.x) * 0.035 * (x / 0.72))
          pos.setZ(i, Math.sin(t * 3.2 - x * 6 + f.x * 2) * 0.09 * (x / 0.72))
        }
        pos.needsUpdate = true
      }

      // The king looks out, slowly, this way and that.
      king.turn = Math.sin(t * 0.35) * 0.55
      updatePerson(king, dt, t, 0)

      // The baker paces with the bread.
      if (baker.show > 0.9 && leaving < 0) {
        if (pace.rest > 0) pace.rest -= dt
        else {
          baker.x += pace.dir * 0.28 * dt
          if ((pace.dir > 0 && baker.x >= pace.to) || (pace.dir < 0 && baker.x <= pace.from)) {
            pace.dir *= -1
            pace.rest = 2.2
          }
        }
      }
      const wantFace = pace.rest > 0 ? 0.15 : pace.dir * 1.25
      baker.face += (wantFace - baker.face) * Math.min(1, dt * 3)
      updatePerson(baker, dt, t, 2)
      if (pace.rest <= 0) baker.mesh.position.y += Math.abs(Math.sin(t * 5)) * 0.02

      // The child and the kite.
      child.turn = Math.sin(t * 0.5 + 1) * 0.25
      updatePerson(child, dt, t, 4)
      const ks = child.show
      if (kiteLoop > 0) kiteLoop = Math.max(0, kiteLoop - dt / 1.6)
      const loop = (1 - kiteLoop) * Math.PI * 2
      const kx = kiteHome.x + Math.sin(t * 0.5) * 0.45 + (kiteLoop > 0 ? Math.sin(loop) * 0.5 : 0)
      const ky = kiteHome.y + Math.sin(t * 0.8 + 1) * 0.22 + (kiteLoop > 0 ? (1 - Math.cos(loop)) * 0.35 : 0)
      const kz = kiteHome.z
      kite.visible = ks > 0.01
      string.visible = ks > 0.5
      // It rises from the child's hand as it arrives.
      const handX = child.x + 0.2 * 0.95
      const handY = child.y + 0.53 * 0.95
      const rise = Math.min(1, ks * ks)
      kite.position.set(handX + (kx - handX) * rise, handY + (ky - handY) * rise, child.z + (kz - child.z) * rise)
      kite.scale.setScalar(Math.max(0.0001, 1.6 * ks))
      kite.rotation.set(-0.25, 0.25, 0.5 + Math.sin(t * 0.9) * 0.14 + (kiteLoop > 0 ? loop : 0))
      const sp = stringGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < 9; i++) {
        const k = i / 8
        const sag = Math.sin(k * Math.PI) * 0.22
        sp.setXYZ(i, handX + (kite.position.x - handX) * k, handY + (kite.position.y - handY) * k - sag, child.z + (kite.position.z - child.z) * k)
      }
      sp.needsUpdate = true

      // The dragon sleeps; touched, it stirs and settles again.
      dragonShow += (dragonWant - dragonShow) * Math.min(1, dt * (dragonWant ? 2.2 : 7))
      dragon.visible = dragonShow > 0.01
      const breath = Math.sin(t * 1.15)
      dragon.scale.set(Math.max(0.0001, dragonShow), Math.max(0.0001, dragonShow * (1 + breath * 0.025)), Math.max(0.0001, dragonShow))
      if (wake > 0) wake = Math.max(0, wake - dt * 0.5)
      const lift = Math.sin(Math.min(1, wake * 1.4) * Math.PI * 0.5)
      head.rotation.x = -lift * 0.3
      head.position.y = lift * 0.12 + breath * 0.008
      if (dragonShow > 0.95 && leaving < 0) {
        nextPuff -= dt
        if (nextPuff <= 0) {
          nextPuff = 6 + Math.random() * 5
          hooks.spark(nose.x, nose.y, nose.z, 'smoke')
        }
      }

      // The tune and the crickets.
      if (done && leaving < 0) {
        tuneAt -= dt
        if (tuneAt <= 0) {
          const i = phrase % 2 === 0 ? tuneI : tune.length - 1 - tuneI
          const step = tune[i]
          if (step !== null && step !== undefined) sound.lyre(step + (phrase % 4 === 3 ? -5 : 0), 0.06)
          tuneI++
          if (tuneI >= tune.length) {
            tuneI = 0
            phrase++
            tuneAt = 5.5
          } else tuneAt = 0.9
        }
        nextCricket -= dt
        if (nextCricket <= 0) {
          nextCricket = 5 + Math.random() * 7
          if (tuneAt > 2) sound.cricket()
        }
      }
    },

    leave() {
      if (leaving >= 0) return
      leaving = 0
      done = false
      king.want = 0
      baker.want = 0
      child.want = 0
      dragonWant = 0
      lightsWant = 0
      growWant = 0
      // Anything that had not yet turned to stone stays as it is.
      events.length = 0
    },

    touch(ray, px, py) {
      if (leaving >= 0) return false
      const near = (x: number, y: number, z: number, r: number) => {
        const [sx, sy] = room.project(x, y, z)
        return Math.hypot(sx - px, sy - py) < r
      }
      if (king.show > 0.8 && near(king.x, king.y + 0.45, king.z, 46)) {
        king.hop = 1
        sound.lyre(4, 0.06)
        glows[kingGlow]!.pulse = 1
        return true
      }
      if (baker.show > 0.8 && near(baker.x, 0.4, baker.z, 46)) {
        baker.hop = 1
        pace.rest = 2
        sound.lyre(2, 0.06)
        hooks.spark(baker.x, 0.55, baker.z + 0.25, 'smoke')
        return true
      }
      if (child.show > 0.8 && (near(child.x, child.y + 0.35, child.z, 44) || near(kite.position.x, kite.position.y - 0.2, kite.position.z, 54))) {
        if (kiteLoop <= 0) kiteLoop = 1
        sound.flag()
        sound.lyre(6, 0.05)
        return true
      }
      if (dragonShow > 0.8) {
        let hit = near(nose.x, 0.3, nose.z, 60)
        for (let i = 0; i < path.length && !hit; i += 2) hit = near(path[i]![0], 0.35, path[i]![1], 38)
        if (hit) {
          wake = 1
          sound.purr()
          hooks.spark(nose.x, nose.y, nose.z, 'smoke')
          nextPuff = 7
          return true
        }
      }
      // A stone: its lights flare and it sounds its own height.
      const raycaster = new THREE.Raycaster(ray.origin, ray.direction)
      const hits = raycaster.intersectObjects(
        stones.filter((s) => s.holder && s.shown).map((s) => s.holder!),
        true,
      )
      const stone = hits[0]?.object.parent?.userData.stone as Stone | undefined
      if (stone) {
        for (const i of stone.glows) glows[i]!.pulse = 1
        stone.pop = 1.035
        sound.lyre(Math.max(-5, Math.min(8, Math.round(topOf(stone.b) * 1.7) - 4)), 0.06)
        const [cx, cy, cz] = centreOf(stone.b)
        hooks.spark(cx, cy + sizeOf(stone.b)[1] / 2, cz, 'warm')
        return true
      }
      return false
    },

    dispose() {
      room.scene.remove(root)
      for (const thing of mine) thing.dispose()
      kit.windowMat.opacity = 0
      kit.glowMat.opacity = 0
      kit.poolMat.opacity = 0
      kit.hallMat.opacity = 0
      lamp.intensity = 0
    },
  }
}
