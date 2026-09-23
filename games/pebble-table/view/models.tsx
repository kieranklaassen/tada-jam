import { useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { albumSlot, BAG, DOOR, FEEDING, SCALE, SHELF, shelfTile, TABLE, type MatKey, type Point, type Quarters } from '../layout'
import { stoneRadius3, to3, UNIT, type Vec3 } from '../physics3d'
import { createClayMaterials, merge, PALETTE, piece, type ClayMaterials } from './clay'
import { furTime, MAX_SHELLS, quillGeometry, quillLayout, withShells } from './fur'
import { useQuality } from './quality'
import { MotionDirector, PERSONALITIES, SEAT_SPECIES, type Species } from '../motion'
import { JAR_SCALE, JARS, PART_COUNTS, PART_KINDS, type PartKind } from '../parts'
import type { AlbumPage } from '../album'
import * as geo from './geometry'

// Claymation models. Rigid props are merged into one mesh each (one draw
// call), characters are a handful of animated parts, and everything that
// repeats (stones, blob shadows, glows, plates, chain links) is instanced.

const ClayContext = createContext<ClayMaterials | null>(null)

export function ClayProvider({ children }: { children: ReactNode }) {
  const materials = useMemo(() => createClayMaterials(), [])
  useEffect(() => () => materials.dispose(), [materials])
  useEffect(() => {
    const timer = setTimeout(prewarm, 400)
    return () => clearTimeout(timer)
  }, [])
  useFrame((state) => {
    furTime.value = state.clock.elapsedTime
  })
  return <ClayContext.Provider value={materials}>{children}</ClayContext.Provider>
}

export function useClay(): ClayMaterials {
  const materials = useContext(ClayContext)
  if (!materials) throw new Error('useClay outside ClayProvider')
  return materials
}

type V3 = [number, number, number]

const built = new Map<string, unknown>()

/** Build a merged geometry once per page: mounting a mat again must not stall a frame. */
function once<T>(key: string, make: () => T): T {
  if (!built.has(key)) built.set(key, make())
  return built.get(key) as T
}
const scratch = {
  m: new THREE.Matrix4(),
  m2: new THREE.Matrix4(),
  m3: new THREE.Matrix4(),
  m4: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  p2: new THREE.Vector3(),
  s: new THREE.Vector3(),
  c: new THREE.Color(),
  e: new THREE.Euler(),
}

// --- springs -----------------------------------------------------------------

export type Spring = { x: number; v: number }

/** Damped spring toward `target`; low damping overshoots, which is the point. */
export function springStep(spring: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    spring.v += (stiffness * (target - spring.x) - damping * spring.v) * h
    spring.x += spring.v * h
  }
  return spring.x
}

// --- table -------------------------------------------------------------------

const SLAB_LEFT = TABLE.x
const SLAB_RIGHT = SHELF.x + SHELF.w
const SLAB_THICKNESS = 6

export function TableModel() {
  const { clay } = useClay()
  const slab = useMemo(() => {
    const center = to3({ x: (SLAB_LEFT + SLAB_RIGHT) / 2, y: TABLE.y + TABLE.h / 2 })
    const w = (SLAB_RIGHT - SLAB_LEFT) * UNIT
    const d = TABLE.h * UNIT
    const geometry = merge([
      piece(geo.roundedBox(24, 0.018), PALETTE.table, { position: [center.x, -SLAB_THICKNESS / 2, center.z], scale: [w, SLAB_THICKNESS, d] }, { ground: -SLAB_THICKNESS, occlusion: 0.45 }),
    ])
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 6)
    return geometry
  }, [])
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 1 }), [])
  const tableClay = useMemo(() => {
    const material = clay.clone()
    material.normalScale = new THREE.Vector2(1.25, 1.25)
    return material
  }, [clay])
  return (
    <>
      <mesh geometry={slab} material={tableClay} />
      <mesh material={floor} position={[0, -SLAB_THICKNESS - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[600, 48]} />
      </mesh>
    </>
  )
}

// --- stones ------------------------------------------------------------------

export type StoneState = {
  id: number
  q: Quarters
  position: Vec3
  quaternion: [number, number, number, number]
  velocityY: number
  held: boolean
  pulse: number
  glow: number
}

type Squash = Spring & { lastVy: number; wasHeld: boolean; rock: Spring }

/**
 * How each size lands. A whole stone is heavy: a deep, slow squash and a
 * lazy rock as it settles. Halves and quarters are lighter: springier, a
 * smaller squash, and a quicker rattle. Nothing shares one bounce.
 */
const STONE_FEEL: Record<Quarters, { stiffness: number; damping: number; kick: number; rockStiffness: number; rockDamping: number; rockKick: number }> = {
  4: { stiffness: 300, damping: 10, kick: 0.05, rockStiffness: 70, rockDamping: 3.2, rockKick: 0.004 },
  2: { stiffness: 520, damping: 9, kick: 0.04, rockStiffness: 190, rockDamping: 4, rockKick: 0.006 },
  1: { stiffness: 760, damping: 8, kick: 0.032, rockStiffness: 420, rockDamping: 5, rockKick: 0.008 },
}
const rockAxis = new THREE.Vector3()
const rockTurn = new THREE.Quaternion()

const MAX_STONES = 64

const PIECE_SIZES: readonly Quarters[] = [4, 2, 1]

/** Stones in three instanced draws (whole, half, quarter): physics pose plus squash on landing and stretch on pickup. */
export function StonesModel({ read }: { read: () => StoneState[] }) {
  const { stones } = useClay()
  const meshes = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const squash = useRef(new Map<number, Squash>())
  const geometries = useMemo(() => [geo.pebble(28), geo.cutPebble(28, 'half'), geo.cutPebble(28, 'quarter')], [])
  useEffect(() => {
    for (const ref of meshes) {
      const instanced = ref.current
      if (!instanced) continue
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      for (let i = 0; i < MAX_STONES; i++) instanced.setColorAt(i, scratch.c.set('#ffffff'))
    }
  }, [])
  useFrame((_, dt) => {
    const list = read()
    const seen = new Set<number>()
    const counts = [0, 0, 0]
    for (const stone of list) {
      const slot = PIECE_SIZES.indexOf(stone.q)
      const instanced = meshes[slot].current
      if (!instanced || counts[slot] >= MAX_STONES) continue
      const i = counts[slot]++
      seen.add(stone.id)
      let s = squash.current.get(stone.id)
      if (!s) {
        s = { x: 0, v: 0, lastVy: 0, wasHeld: stone.held, rock: { x: 0, v: 0 } }
        squash.current.set(stone.id, s)
      }
      const feel = STONE_FEEL[stone.q]
      if (stone.held && !s.wasHeld) s.v -= 3.2
      if (!stone.held && s.lastVy < -30 && stone.velocityY > -6) {
        s.v += Math.min(4.5, -s.lastVy * feel.kick)
        s.rock.v += Math.min(2.2, -s.lastVy * feel.rockKick) * (stone.id % 2 === 0 ? 1 : -1)
      }
      s.wasHeld = stone.held
      s.lastVy = stone.velocityY
      const amount = THREE.MathUtils.clamp(springStep(s, stone.held ? -0.07 : 0, dt, feel.stiffness, feel.damping), -0.3, 0.35)
      const rock = springStep(s.rock, 0, dt, feel.rockStiffness, feel.rockDamping)
      const r = stoneRadius3(4)
      const pop = 1 + stone.pulse * 0.22 + stone.glow * 0.06
      rockAxis.set(Math.cos(stone.id * 2.39), 0, Math.sin(stone.id * 2.39))
      rockTurn.setFromAxisAngle(rockAxis, THREE.MathUtils.clamp(rock, -0.35, 0.35))
      const rotation = scratch.m2.makeRotationFromQuaternion(scratch.q.set(...stone.quaternion).premultiply(rockTurn))
      const shapeScale = scratch.m3.makeScale(r * pop, r * pop, r * pop)
      const squashScale = scratch.m4.makeScale(1 + amount * 0.6, 1 - amount, 1 + amount * 0.6)
      const lift = amount > 0 ? -amount * r * 0.35 : 0
      scratch.m.makeTranslation(stone.position.x, stone.position.y + lift, stone.position.z).multiply(squashScale).multiply(rotation).multiply(shapeScale)
      instanced.setMatrixAt(i, scratch.m)
      const bright = 1 + stone.pulse * 0.28 + stone.glow * 0.18
      instanced.setColorAt(i, scratch.c.setRGB(bright, bright, bright))
    }
    for (const id of squash.current.keys()) if (!seen.has(id)) squash.current.delete(id)
    meshes.forEach((ref, slot) => {
      const instanced = ref.current
      if (!instanced) return
      instanced.count = counts[slot]
      instanced.instanceMatrix.needsUpdate = true
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    })
  })
  return (
    <>
      {geometries.map((geometry, slot) => (
        <instancedMesh key={slot} ref={meshes[slot]} args={[geometry, stones, MAX_STONES]} frustumCulled={false} />
      ))}
    </>
  )
}

// --- blob shadows and glows ----------------------------------------------------

export type Blob = { at: Point; ground: number; radius: number; strength: number; stretch?: number }

const LIGHT_OFFSET = { x: 0.32, z: -0.12 }

/** Soft blob shadows: the height above the ground widens and fades them. */
export function Overlays({ kind, read, capacity }: { kind: 'shadow' | 'glow'; read: () => Blob[]; capacity: number }) {
  const { shadow, glow } = useClay()
  const mesh = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const instanced = mesh.current
    if (!instanced) return
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < capacity; i++) instanced.setColorAt(i, scratch.c.setRGB(0, 0, 0))
  }, [capacity])
  useFrame(() => {
    const instanced = mesh.current
    if (!instanced) return
    const blobs = read().slice(0, capacity)
    blobs.forEach((blob, i) => {
      const p = to3(blob.at, blob.ground + (kind === 'shadow' ? 0.06 : 0.12))
      const lift = Math.max(0, blob.strength)
      const offset = kind === 'shadow' ? blob.stretch ?? 0 : 0
      scratch.m.compose(
        scratch.p.set(p.x + LIGHT_OFFSET.x * offset, p.y, p.z + LIGHT_OFFSET.z * offset),
        scratch.q.setFromEuler(scratch.e.set(-Math.PI / 2, 0, 0)),
        scratch.s.set(blob.radius * 2, blob.radius * 2, 1),
      )
      instanced.setMatrixAt(i, scratch.m)
      instanced.setColorAt(i, scratch.c.setRGB(lift, 0, 0))
    })
    instanced.count = blobs.length
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
  })
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  return <instancedMesh ref={mesh} args={[plane, kind === 'shadow' ? shadow : glow, capacity]} frustumCulled={false} renderOrder={kind === 'shadow' ? 1 : 3} />
}

// --- bag ---------------------------------------------------------------------

export type BagPose = { fullness: number; tipAge: number | null; peek: number | null; now: number }

const BAG_LENGTH = 11.5
const BAG_GIRTH = 7.2

function bagGeometry(): THREE.BufferGeometry {
  return merge([
    piece(geo.sack(40), PALETTE.bag, {}, { lump: 0.05, frequency: 3.1, seed: 4, ground: null }),
    piece(geo.torus(32, 0.1), PALETTE.cord, { position: [0, 1.02, 0], rotation: [Math.PI / 2, 0, 0], scale: 0.43 }, { ground: null }),
    piece(geo.capsule(12), PALETTE.cord, { position: [0.36, 1.12, 0.52], rotation: [1.25, 0, 0.35], scale: [0.07, 0.42, 0.07] }, { ground: null }),
    piece(geo.sphere(12), PALETTE.cord, { position: [0.52, 1.18, 0.98], scale: 0.11 }, { ground: null, lump: 0.02 }),
  ])
}

/** The bag lies on its side, mouth to the table: tips with anticipation, slumps as it empties, wiggles to invite. */
export function BagModel({ read }: { read: () => BagPose }) {
  const { clay, stones } = useClay()
  const body = useRef<THREE.Group>(null)
  const peek = useRef<THREE.Mesh>(null)
  const geometry = once('bag', bagGeometry)
  const pebble = useMemo(() => geo.pebble(20), [])
  const settle = useRef<Spring>({ x: 0, v: 0 })
  const lastTip = useRef<number | null>(null)
  const tips = useRef(0)
  const p = to3(BAG)
  useFrame((_, dt) => {
    const pose = read()
    const group = body.current
    if (group) {
      if (pose.tipAge !== null && pose.tipAge < dt * 1.5 && lastTip.current !== pose.tipAge) {
        settle.current.v += 7
        tips.current += 1
      }
      lastTip.current = pose.tipAge
      const t = pose.tipAge ?? 10
      // Two ways to tip, alternating: a big lurch forward, or a shake-out that
      // jiggles the stones loose side to side.
      const shakeOut = tips.current % 2 === 0
      const anticipation = t < 0.12 ? Math.sin((t / 0.12) * Math.PI) * (shakeOut ? 0.08 : 0.12) : 0
      const lurch = t >= 0.12 && t < 0.55 ? Math.sin(((t - 0.12) / 0.43) * Math.PI) * (shakeOut ? 0.26 : 0.42) : 0
      const shake = shakeOut && t >= 0.12 && t < 0.8 ? Math.sin((t - 0.12) * 42) * 0.12 * Math.sin(((t - 0.12) / 0.68) * Math.PI) : 0
      // An empty bag is floppy: softer spring, longer wobble.
      const wobble = springStep(settle.current, 0, dt, 55 + pose.fullness * 45, 4 + pose.fullness * 4)
      const girth = 0.7 + pose.fullness * 0.32
      const breathe = 1 + Math.sin(pose.now * 1.4) * 0.014
      const invite = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI * 6) * 0.1 * Math.sin(pose.peek * Math.PI)
      group.scale.set(BAG_GIRTH * girth * breathe * (1 + anticipation), BAG_LENGTH * (1 - anticipation * 0.6), BAG_GIRTH * girth * breathe * (1 + anticipation) * 1.1)
      group.position.y = BAG_GIRTH * girth * 0.88
      group.rotation.set(invite + wobble * 0.04 + shake, 0, -1.42 - lurch + anticipation * 0.6 + wobble * 0.02)
    }
    if (peek.current) {
      const k = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI)
      peek.current.visible = k > 0.02
      peek.current.position.set(BAG_LENGTH * 1.05 + k * 3.4, 3.4 + k * 0.9, 0)
      peek.current.rotation.set(0.2, 0, -0.3 + k * 0.3)
    }
  })
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, 0.82, 0]}>
      <group ref={body}>
        <mesh geometry={geometry} material={clay} />
      </group>
      <mesh ref={peek} geometry={pebble} material={stones} scale={stoneRadius3(4)} />
    </group>
  )
}

// --- scale -------------------------------------------------------------------

export type ScalePose = { angle: number; panY: [number, number]; now: number }

const PIVOT_Y = 25

function postGeometry(): THREE.BufferGeometry {
  const turned = new THREE.LatheGeometry(
    [
      [0.01, 0],
      [7.4, 0],
      [7.6, 0.9],
      [6.4, 1.8],
      [3.2, 2.4],
      [1.9, 3.4],
      [1.5, 7],
      [2.1, 8],
      [1.4, 9],
      [1.3, 19],
      [2, 20],
      [1.5, 21.5],
      [1.6, 23],
      [0.01, 23.2],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    28,
  )
  return merge([
    piece(turned, PALETTE.scaleWood, {}, { lump: 0.18, frequency: 0.5, seed: 2 }),
    piece(geo.sphere(20), PALETTE.scaleWood, { position: [0, PIVOT_Y, 0], scale: 2.1 }, { lump: 0.15, ground: null }),
    piece(geo.sphere(14), PALETTE.scaleWood, { position: [0, PIVOT_Y + 2.6, 0], scale: 1.1 }, { ground: null }),
  ])
}

function beamGeometry(half: number): THREE.BufferGeometry {
  const collars = [-0.72, -0.4, 0.4, 0.72].map((t) =>
    piece(geo.torus(20, 0.45), PALETTE.pan, { position: [t * half, 0, 0], rotation: [0, Math.PI / 2, 0], scale: 1.25 }, { lump: 0.06, ground: null }),
  )
  return merge([
    piece(geo.capsule(18), PALETTE.scaleWood, { rotation: [0, 0, Math.PI / 2], scale: [2.5, half, 2.5] }, { lump: 0.18, frequency: 0.7, ground: null }),
    piece(geo.sphere(18), PALETTE.scaleWood, { position: [-half, 0, 0], scale: 2.1 }, { lump: 0.12, ground: null }),
    piece(geo.sphere(18), PALETTE.scaleWood, { position: [half, 0, 0], scale: 2.1 }, { lump: 0.12, ground: null }),
    ...collars,
  ])
}

/** A twisted clay rope, unit length along +y, for the pan hangers. */
function coilGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 48)
  geometry.translate(0, 0.5, 0)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = position.getY(i)
    const angle = Math.atan2(z, x)
    const twist = 1 + 0.28 * Math.sin(angle * 2 + y * 44)
    position.setX(i, x * twist)
    position.setZ(i, z * twist)
  }
  geometry.computeVertexNormals()
  return merge([piece(geometry, PALETTE.pan, {}, { ground: null })])
}

function panGeometry(radius: number): THREE.BufferGeometry {
  return merge([
    piece(geo.dish(40), PALETTE.pan, { scale: [radius, 13, radius] }, { lump: 0.3, frequency: 0.35, seed: 5, ground: null }),
    piece(geo.torus(40, 0.08), PALETTE.pan, { position: [0, 1.6, 0], rotation: [Math.PI / 2, 0, 0], scale: radius * 1.03 }, { lump: 0.12, frequency: 0.5, ground: null }),
  ])
}

export function ScaleModel({ read }: { read: () => ScalePose }) {
  const { clay } = useClay()
  const beam = useRef<THREE.Group>(null)
  const pans = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const chains = useRef<THREE.InstancedMesh>(null)
  const half = SCALE.beamHalf * UNIT
  const post = to3(SCALE.post)
  const shapes = once('scale', () => ({
    post: postGeometry(),
    beam: beamGeometry(half),
    pans: SCALE.pans.map((pan) => panGeometry(pan.r * UNIT)),
    chain: coilGeometry(),
  }))
  const swing = useRef({ last: 0, pans: [{ x: 0, v: 0 }, { x: 0, v: 0 }] as Spring[] })
  useFrame((_, dt) => {
    const pose = read()
    const angle = pose.angle + Math.sin(pose.now * 0.9) * 0.003
    if (beam.current) beam.current.rotation.z = -angle
    const instanced = chains.current
    // Pans hang on ropes: when the beam moves they lag, then swing back and settle.
    const turn = dt > 0 ? (angle - swing.current.last) / dt : 0
    swing.current.last = angle
    SCALE.pans.forEach((pan, side) => {
      const spring = swing.current.pans[side]
      spring.v -= turn * 5
      const sway = THREE.MathUtils.clamp(springStep(spring, 0, dt, 26, 2.6), -1.6, 1.6)
      const center = to3(pan, pose.panY[side])
      center.x += sway
      pans[side].current?.position.set(center.x, center.y, center.z)
      const sign = side === 0 ? -1 : 1
      const end = new THREE.Vector3(post.x + Math.cos(angle) * half * sign, PIVOT_Y - Math.sin(angle) * half * sign, post.z)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5
        const rim = new THREE.Vector3(center.x + Math.cos(a) * pan.r * UNIT * 0.96, center.y + 1.6, center.z + Math.sin(a) * pan.r * UNIT * 0.96)
        const dir = rim.clone().sub(end)
        const length = dir.length()
        scratch.m.compose(end, scratch.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), scratch.s.set(0.95, length, 0.95))
        instanced?.setMatrixAt(side * 3 + k, scratch.m)
      }
    })
    if (instanced) instanced.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh geometry={shapes.post} material={clay} position={[post.x, 0, post.z]} />
      <group ref={beam} position={[post.x, PIVOT_Y, post.z]}>
        <mesh geometry={shapes.beam} material={clay} />
      </group>
      {shapes.pans.map((geometry, side) => (
        <mesh key={side} ref={pans[side]} geometry={geometry} material={clay} />
      ))}
      <instancedMesh ref={chains} args={[shapes.chain, clay, 6]} frustumCulled={false} />
    </group>
  )
}

// --- Fair Feeding --------------------------------------------------------------

/** A rolled clay rope that follows the rug's scalloped elliptical hem. */
function ellipseRope(rx: number, rz: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2
    const scallop = 1 + Math.abs(Math.sin(a * 14)) * 0.02
    points.push(new THREE.Vector3(Math.cos(a) * rx * scallop, 0, Math.sin(a) * rz * scallop))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 240, 0.42, 8, true)
}

export function FeedingSetting({ seats, showStools }: { seats: readonly boolean[]; showStools: boolean }) {
  const { clay, rug } = useClay()
  const center = to3({ x: 780, y: 470 })
  const bowl = to3(FEEDING.bowl)
  const shapes = once('feeding', () => ({
      rug: geo.cloth(40),
      bowl: merge([piece(geo.bowl(48), PALETTE.bowl, { scale: FEEDING.bowl.r * UNIT }, { lump: 0.22, frequency: 0.4, seed: 8, occlusion: 0.42 })]),
      plate: merge([piece(geo.plate(36), PALETTE.plate, { scale: [FEEDING.plateRadius * UNIT, 5, FEEDING.plateRadius * UNIT] }, { lump: 0.15, frequency: 0.5, seed: 3, occlusion: 0.15 })]),
      stool: merge([
        piece(geo.sphere(28), PALETTE.stool, { position: [0, 1.5, 0], scale: [4.5, 1.7, 4.5] }, { lump: 0.3, frequency: 0.6, seed: 6 }),
        piece(geo.sphere(14), '#c79a45', { position: [0, 3.05, 0], scale: [0.9, 0.35, 0.9] }, { ground: null }),
        piece(geo.torus(32, 0.16), '#c79a45', { position: [0, 1.55, 0], rotation: [Math.PI / 2, 0, 0], scale: 4.35 }, { lump: 0.05, ground: null }),
      ]),
      rugRope: merge([piece(ellipseRope(42, 30), '#d8c39c', {}, { lump: 0.12, frequency: 0.5, ground: null })]),
    }))
  const plates = useRef<THREE.InstancedMesh>(null)
  const stools = useRef<THREE.InstancedMesh>(null)
  const seatKey = seats.map(Number).join('')
  const reveal = useRef<{ at: number | null; shown: boolean }>({ at: null, shown: showStools })
  const placeStools = (scale: number) => {
    let stoolCount = 0
    FEEDING.seats.forEach((seat, index) => {
      if (seats[index] || !showStools) return
      const p = to3(seat.guest)
      scratch.m.makeTranslation(p.x, 0, p.z).multiply(scratch.m2.makeScale(scale, scale, scale))
      stools.current?.setMatrixAt(stoolCount++, scratch.m)
    })
    if (stools.current) {
      stools.current.count = stoolCount
      stools.current.instanceMatrix.needsUpdate = true
    }
  }
  useEffect(() => {
    let plateCount = 0
    FEEDING.seats.forEach((seat, index) => {
      if (!seats[index]) return
      const p = to3(seat.plate, 0.12)
      scratch.m.makeTranslation(p.x, p.y, p.z)
      plates.current?.setMatrixAt(plateCount++, scratch.m)
    })
    if (plates.current) {
      plates.current.count = plateCount
      plates.current.instanceMatrix.needsUpdate = true
    }
    if (showStools && !reveal.current.shown) reveal.current.at = performance.now()
    reveal.current.shown = showStools
    placeStools(reveal.current.at === null ? 1 : 0.01)
    // seatKey stands in for `seats`, which the controller mutates in place.
  }, [seatKey, showStools])
  useFrame(() => {
    const at = reveal.current.at
    if (at === null) return
    const k = Math.min(1, (performance.now() - at) / 650)
    placeStools(Math.max(0.01, easeOutBack(k)))
    if (k >= 1) reveal.current.at = null
  })
  return (
    <group>
      <mesh geometry={shapes.rug} material={rug} position={[center.x, 0.04, center.z]} scale={[42, 4, 30]} />
      <mesh geometry={shapes.rugRope} material={clay} position={[center.x, 0.3, center.z]} />
      <mesh geometry={shapes.bowl} material={clay} position={[bowl.x, 0, bowl.z]} />
      <instancedMesh ref={plates} args={[shapes.plate, clay, 5]} frustumCulled={false} />
      <instancedMesh ref={stools} args={[shapes.stool, clay, 5]} frustumCulled={false} />
    </group>
  )
}

// --- guests ------------------------------------------------------------------


export type GuestPose = {
  look: Point | null
  reach: number
  munchAt: number | null
  /** A stone landed on this guest's plate. */
  hopAt: number | null
  /** The child tapped this guest. */
  pokeAt: number | null
  /** This guest's hungry tummy rumbled. */
  rumbleAt: number | null
  arriveAt: number | null
  now: number
}

const NECK_Y = 7.4

type GuestShapes = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry
  eyes: THREE.BufferGeometry
  mouth: THREE.BufferGeometry
  arm: THREE.BufferGeometry
  /** Parts that move on their own: nose (wiggles), cheeks (puff), rabbit ears (flick, left then right, built around their base). */
  nose: THREE.BufferGeometry
  cheeks: THREE.BufferGeometry
  ears: [THREE.BufferGeometry, THREE.BufferGeometry] | null
  noseAt: V3
  /** Shell geometry for clay-tuft fur (rabbit, bear), or null. */
  furBody: THREE.BufferGeometry | null
  furHead: THREE.BufferGeometry | null
  /** Hedgehog quills: one shared quill and where each instance sits, for the body and the head. */
  quill: THREE.BufferGeometry | null
  quillsBody: THREE.Matrix4[]
  quillsHead: THREE.Matrix4[]
}

function guestShapes(species: Species): GuestShapes {
  const fur = species === 'rabbit' ? PALETTE.rabbit : species === 'bear' ? PALETTE.bear : PALETTE.hedgehog
  const light = species === 'bear' ? PALETTE.bearMuzzle : '#f7ead3'
  const sphere = geo.sphere(26)
  const body = [
    piece(sphere, fur, { position: [0, 4, 0], scale: [4.4, 4.1, 4.1] }, { lump: 0.3, frequency: 0.55, seed: 1 }),
    piece(sphere, light, { position: [0, 3.5, 2.6], scale: [2.9, 2.8, 1.8] }, { lump: 0.15, frequency: 0.7 }),
    piece(sphere, fur, { position: [-2, 0.6, 2.2], scale: [1.5, 0.8, 1.9] }, { lump: 0.1 }),
    piece(sphere, fur, { position: [2, 0.6, 2.2], scale: [1.5, 0.8, 1.9] }, { lump: 0.1 }),
  ]
  if (species === 'rabbit') body.push(piece(sphere, '#fbf4e8', { position: [0, 2.2, -3.8], scale: 1.4 }, { lump: 0.2 }))

  const headSphere: V3 = [0, 3.1, 0.2]
  const head = [piece(sphere, fur, { position: headSphere, scale: species === 'hedgehog' ? [3.4, 3.1, 3.3] : [3.5, 3.3, 3.3] }, { lump: 0.22, frequency: 0.7, seed: 3, ground: null })]
  const muzzle = species === 'hedgehog' ? { position: [0, 2.3, 3.4] as V3, scale: [1.5, 1.3, 1.9] as V3 } : { position: [0, 2.3, 2.9] as V3, scale: [1.8, 1.3, 1.1] as V3 }
  head.push(piece(sphere, light, muzzle, { lump: 0.08, ground: null }))
  const nose = merge([piece(sphere, PALETTE.nose, { position: [0, 0, 0], scale: [0.55, 0.42, 0.4] }, { ground: null })])
  const cheeks = merge([-1, 1].map((side) => piece(sphere, PALETTE.cheek, { position: [side * 2.4, 0, 0], scale: [0.8, 0.5, 0.35] }, { ground: null })))
  const ears =
    species === 'rabbit'
      ? ([-1, 1].map((side) =>
          merge([
            piece(geo.capsule(14), fur, { position: [0, 2, 0], rotation: [-0.12, 0, -side * 0.16], scale: [1.4, 3.3, 0.9] }, { lump: 0.12, ground: null }),
            piece(geo.capsule(12), PALETTE.rabbitInner, { position: [0, 2.1, 0.55], rotation: [-0.12, 0, -side * 0.16], scale: [0.75, 2.6, 0.35] }, { ground: null }),
          ]),
        ) as [THREE.BufferGeometry, THREE.BufferGeometry])
      : null
  for (const side of [-1, 1]) {
    if (species === 'bear') {
      head.push(piece(sphere, fur, { position: [side * 2.7, 5.9, 0], scale: [1.35, 1.35, 0.9] }, { lump: 0.1, ground: null }))
      head.push(piece(sphere, PALETTE.bearMuzzle, { position: [side * 2.7, 5.9, 0.6], scale: [0.75, 0.75, 0.4] }, { ground: null }))
    } else if (species === 'hedgehog') {
      head.push(piece(sphere, fur, { position: [side * 2.4, 5.2, 0.2], scale: [0.8, 0.8, 0.5] }, { ground: null }))
    }
  }

  const eyes = [-1, 1].flatMap((side) => [
    piece(sphere, PALETTE.eye, { position: [side * 1.42, 0, 2.9], scale: [0.78, 0.9, 0.55] }, { ground: null }),
    piece(sphere, PALETTE.shine, { position: [side * 1.42 + 0.26, 0.32, 3.38], scale: 0.26 }, { ground: null }),
    piece(sphere, PALETTE.shine, { position: [side * 1.42 - 0.2, -0.28, 3.4], scale: 0.1 }, { ground: null }),
  ])
  return {
    body: merge(body),
    head: merge(head),
    eyes: merge(eyes),
    mouth: merge([piece(geo.capsule(10), PALETTE.mouth, { rotation: [0, 0, Math.PI / 2], scale: [0.3, 0.7, 0.3] }, { ground: null })]),
    arm: merge([piece(geo.capsule(12), fur, { position: [0, -1.5, 0], scale: [1.2, 1.6, 1.2] }, { lump: 0.08, ground: null })]),
    nose,
    cheeks,
    ears,
    noseAt: [0, 2.8, muzzle.position[2] + muzzle.scale[2] * 0.85],
    furBody: species === 'hedgehog' ? null : withShells(piece(sphere, fur, { position: [0, 4, 0], scale: [4.4, 4.1, 4.1] }, { lump: 0.3, frequency: 0.55, seed: 1 })),
    furHead: species === 'hedgehog' ? null : withShells(piece(sphere, fur, { position: headSphere, scale: [3.5, 3.3, 3.3] }, { lump: 0.22, frequency: 0.7, seed: 3, ground: null })),
    quill: species === 'hedgehog' ? quillGeometry(PALETTE.spikes, '#c9a27a') : null,
    quillsBody: species === 'hedgehog' ? quillLayout(70, [0, 4.2, 0], 4.0, 1, 0.12, 1.8) : [],
    quillsHead: species === 'hedgehog' ? quillLayout(26, headSphere, 3.2, 5, 0.15, 1.15) : [],
  }
}

const shapeCache = new Map<Species, GuestShapes>()

function speciesShapes(species: Species): GuestShapes {
  let cached = shapeCache.get(species)
  if (!cached) {
    cached = guestShapes(species)
    shapeCache.set(species, cached)
  }
  return cached
}

/** Build the bag, the scale, and every character's geometry early, so they are not built mid-play. */
function prewarm(): void {
  once('bag', bagGeometry)
  for (const species of ['rabbit', 'bear', 'hedgehog'] as const) speciesShapes(species)
  once('scale', () => ({
    post: postGeometry(),
    beam: beamGeometry(SCALE.beamHalf * UNIT),
    pans: SCALE.pans.map((pan) => panGeometry(pan.r * UNIT)),
    chain: coilGeometry(),
  }))
}

const GUEST_SIZE = 1.5

function easeOutBack(t: number): number {
  const c = 1.9
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}

/**
 * A clay guest with its own motion personality (see `motion.ts`): the
 * director blends idle life, reactions, eating, pokes, arrivals, and rare
 * delights into one pose, and this component maps it onto clay parts. Head
 * turns toward what matters use the species' own spring, so the bear turns
 * lazily and the rabbit snaps.
 */
export function Guest({ seat, at, read }: { seat: number; at: Point; read: () => GuestPose }) {
  const { clay, fur, quill } = useClay()
  const furCap = useQuality().furShells
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const furParts = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const quillParts = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const species = SEAT_SPECIES[seat % SEAT_SPECIES.length]
  const personality = PERSONALITIES[species]
  const shapes = speciesShapes(species)
  const director = useMemo(() => new MotionDirector(species, seat + 1), [species, seat])
  const seen = useRef({ hopAt: null as number | null, munchAt: null as number | null, pokeAt: null as number | null, arriveAt: null as number | null })
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Mesh>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const nose = useRef<THREE.Mesh>(null)
  const cheeks = useRef<THREE.Mesh>(null)
  const ears = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const springs = useRef({ yaw: { x: 0, v: 0 }, pitch: { x: 0, v: 0 } })
  const facing = FEEDING.seats[seat].facing
  const face = new THREE.Vector2(-facing.x * 0.8, -facing.y + 1.5).normalize()
  const yaw = Math.atan2(face.x, face.y)
  const p = to3(at)

  useEffect(() => {
    ;[shapes.quillsBody, shapes.quillsHead].forEach((matrices, i) => {
      const instanced = quillParts[i].current
      if (!instanced) return
      matrices.forEach((matrix, k) => {
        instanced.setMatrixAt(k, matrix)
        const tint = 0.9 + ((k * 37) % 17) / 17 * 0.2
        instanced.setColorAt(k, scratch.c.setRGB(tint, tint, tint))
      })
      instanced.instanceMatrix.needsUpdate = true
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
    })
  }, [shapes])

  useFrame((_, dt) => {
    const pose = read()
    const s = springs.current
    const now = pose.now

    // Shell LOD: more shells only when the guest is big on screen.
    const a = scratch.p.set(p.x, 6, p.z).project(camera)
    const ax = a.x
    const b = scratch.p2.set(p.x + 6 * GUEST_SIZE, 6, p.z).project(camera)
    const pixels = (Math.abs(b.x - ax) / 2) * viewport.width * dpr
    const shells = Math.min(furCap, THREE.MathUtils.clamp(Math.round(pixels / 12), 3, MAX_SHELLS))
    for (const ref of furParts) {
      if (!ref.current) continue
      ref.current.visible = shells > 0
      ref.current.count = shells
    }

    const last = seen.current
    if (pose.arriveAt !== null && pose.arriveAt !== last.arriveAt) director.trigger('arrive', pose.arriveAt)
    if (pose.hopAt !== null && pose.hopAt !== last.hopAt) director.trigger('react', pose.hopAt)
    if (pose.pokeAt !== null && pose.pokeAt !== last.pokeAt) director.trigger('poke', pose.pokeAt)
    if (pose.munchAt !== null && pose.munchAt !== last.munchAt) director.trigger('eat', pose.munchAt)
    seen.current = { hopAt: pose.hopAt, munchAt: pose.munchAt, pokeAt: pose.pokeAt, arriveAt: pose.arriveAt }
    const m = director.sample(now, pose.reach > 0.05, pose.reach)

    let lookYaw = 0
    if (pose.look) {
      const target = to3(pose.look)
      const worldAngle = Math.atan2(target.x - p.x, target.z - p.z)
      lookYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(worldAngle - yaw), Math.cos(worldAngle - yaw)), -0.38, 0.38)
    }
    springStep(s.yaw, lookYaw, dt, personality.look.stiffness, personality.look.damping)
    springStep(s.pitch, pose.look ? 0.18 : 0, dt, personality.look.stiffness * 1.4, personality.look.damping)

    const rumbleAge = pose.rumbleAt === null ? Infinity : now - pose.rumbleAt
    if (rumbleAge < 0.9) {
      const k = Math.exp(-rumbleAge * 4)
      m.squash += Math.sin(rumbleAge * 42) * 0.06 * k
      m.headPitch += 0.22 * Math.sin(Math.min(1, rumbleAge / 0.9) * Math.PI)
      m.armForward[0] += 0.5 * k
      m.armForward[1] += 0.5 * k
    }
    const arrive = pose.arriveAt === null ? 1 : THREE.MathUtils.clamp((now - pose.arriveAt) / 0.4, 0, 1)
    const pop = pose.arriveAt === null || arrive >= 1 ? 1 : Math.max(0.01, easeOutBack(arrive))
    const vertical = 1 - m.squash
    const horizontal = 1 + m.squash * 0.6

    if (root.current) {
      root.current.position.y = Math.max(0, m.lift)
      root.current.scale.set(GUEST_SIZE * horizontal * pop, GUEST_SIZE * vertical * pop, GUEST_SIZE * horizontal * pop)
      root.current.rotation.set(m.lean, m.twist, m.roll)
    }
    if (head.current) {
      head.current.position.y = NECK_Y - m.headDrop
      head.current.rotation.set(s.pitch.x + m.headPitch, s.yaw.x + m.headYaw, m.headRoll)
    }
    if (eyes.current) eyes.current.scale.set(1 + Math.max(0, m.eyes - 1) * 0.5, m.eyes, 1)
    if (mouth.current) mouth.current.scale.set(personality.mouthWidth * (1 + m.mouth * 0.35), 1 + m.mouth * 3.4, 1 + m.mouth * 0.5)
    if (nose.current) {
      nose.current.position.y = shapes.noseAt[1] + m.nose * 0.22
      nose.current.scale.set(1 + Math.abs(m.nose) * 0.18, 1 - Math.abs(m.nose) * 0.2, 1)
    }
    if (cheeks.current) cheeks.current.scale.set(1 + m.cheeks * 0.12, 1 + m.cheeks * 0.45, 1 + m.cheeks * 0.6)
    ears.forEach((ref, side) => {
      if (ref.current) ref.current.rotation.set(-0.05 - m.ears[side] * 0.9, 0, (side === 0 ? 1 : -1) * m.ears[side] * 0.15)
    })
    for (const ref of quillParts) if (ref.current) ref.current.scale.setScalar(1 + m.quills * 0.22)
    arms.forEach((ref, side) => {
      if (!ref.current) return
      const sign = side === 0 ? -1 : 1
      ref.current.rotation.set(-m.armForward[side], 0, sign * (0.45 + m.armUp[side]))
    })
  })

  return (
    <group position={[p.x, 0, p.z]} rotation={[0, yaw, 0]}>
      <group ref={root}>
        <mesh geometry={shapes.body} material={clay} />
        {shapes.furBody && <instancedMesh ref={furParts[0]} args={[shapes.furBody, fur, MAX_SHELLS]} frustumCulled={false} />}
        {shapes.quill && <instancedMesh ref={quillParts[0]} args={[shapes.quill, quill, shapes.quillsBody.length]} frustumCulled={false} />}
        {[-1, 1].map((side, i) => (
          <group key={side} ref={arms[i]} position={[side * 3.9, 4.7, 0.9]}>
            <mesh geometry={shapes.arm} material={clay} />
          </group>
        ))}
        <group ref={head} position={[0, NECK_Y, 0]}>
          <mesh geometry={shapes.head} material={clay} />
          {shapes.furHead && <instancedMesh ref={furParts[1]} args={[shapes.furHead, fur, MAX_SHELLS]} frustumCulled={false} />}
          {shapes.quill && <instancedMesh ref={quillParts[1]} args={[shapes.quill, quill, shapes.quillsHead.length]} frustumCulled={false} />}
          <mesh ref={eyes} geometry={shapes.eyes} material={clay} position={[0, 3.7, 0]} />
          <mesh ref={mouth} geometry={shapes.mouth} material={clay} position={[0, 1.65, species === 'hedgehog' ? 4.9 : 3.85]} />
          <mesh ref={nose} geometry={shapes.nose} material={clay} position={shapes.noseAt} />
          <mesh ref={cheeks} geometry={shapes.cheeks} material={clay} position={[0, 2.3, 2.5]} />
          {shapes.ears?.map((geometry, i) => (
            <group key={i} ref={ears[i]} position={[(i === 0 ? -1 : 1) * 1.4, 5.6, -0.3]}>
              <mesh geometry={geometry} material={clay} />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

// --- knife, shelf, hand ---------------------------------------------------------

export function KnifeModel({ read }: { read: () => { at: Point; visible: boolean; held: boolean; now: number } }) {
  const { clay } = useClay()
  const ref = useRef<THREE.Group>(null)
  const geometry = once('knife', () =>
    merge([
      piece(geo.blade(), PALETTE.knifeBlade, { scale: 1.3 }, { lump: 0.05, ground: null }),
      piece(geo.capsule(16), PALETTE.knifeHandle, { position: [-3.2, 0.5, 0], rotation: [0, 0, Math.PI / 2], scale: [1.3, 2.2, 1.3] }, { lump: 0.1, ground: null }),
    ]),
  )
  const lift = useRef<Spring>({ x: 0, v: 0 })
  const feel = useRef({ pop: { x: 0, v: 0 } as Spring, lean: { x: 0, v: 0 } as Spring, chop: { x: 0, v: 0 } as Spring, wasVisible: false, wasHeld: false, lastX: 0 })
  useFrame((_, dt) => {
    const pose = read()
    const group = ref.current
    if (!group) return
    const f = feel.current
    group.visible = pose.visible
    // Appears with a springy pop, leans into the direction it is dragged, and chops down when let go.
    if (pose.visible && !f.wasVisible) f.pop.x = 0.2
    if (!pose.held && f.wasHeld) f.chop.v -= 9
    f.wasVisible = pose.visible
    f.wasHeld = pose.held
    const velocity = dt > 0 ? (pose.at.x - f.lastX) / dt : 0
    f.lastX = pose.at.x
    const scale = springStep(f.pop, 1, dt, 180, 9)
    const lean = springStep(f.lean, pose.held ? THREE.MathUtils.clamp(-velocity * 0.0012, -0.35, 0.35) : 0, dt, 90, 9)
    const chop = springStep(f.chop, 0, dt, 260, 12)
    const y = springStep(lift.current, pose.held ? 5 : 0.5, dt, 120, 12)
    const p = to3(pose.at, y)
    group.position.set(p.x, p.y, p.z)
    group.scale.setScalar(Math.max(0.01, scale))
    group.rotation.set(lean, 0.5 + (pose.held ? 0 : Math.sin(pose.now * 0.8) * 0.03), (pose.held ? 0.25 : 0) + chop * 0.08)
  })
  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={clay} />
    </group>
  )
}

// --- the album ---------------------------------------------------------------------

/** A page's arrangement as a little dot map: the activity's zones faintly, the stones as terracotta dots. No words or numbers. */
function drawPageMap(canvas: HTMLCanvasElement, page: AlbumPage | null): void {
  const g = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  g.fillStyle = '#fbf1de'
  g.fillRect(0, 0, w, h)
  if (!page) return
  const sx = w / (TABLE.w + 60)
  const sy = h / (TABLE.h + 60)
  const at = (x: number, y: number) => [(x - TABLE.x + 30) * sx, (y - TABLE.y + 30) * sy] as const
  g.fillStyle = 'rgba(110,154,155,0.35)'
  const zone = (x: number, y: number, r: number) => {
    const [cx, cy] = at(x, y)
    g.beginPath()
    g.ellipse(cx, cy, r * sx, r * sy, 0, 0, Math.PI * 2)
    g.fill()
  }
  switch (page.mat) {
    case 'feeding':
      zone(FEEDING.bowl.x, FEEDING.bowl.y, FEEDING.bowl.r)
      for (const seat of FEEDING.seats) zone(seat.plate.x, seat.plate.y, FEEDING.plateRadius)
      break
    case 'scale':
      for (const pan of SCALE.pans) zone(pan.x, pan.y, pan.r)
      break
    case 'door':
      zone(DOOR.house.x, DOOR.house.y, 150)
      break
    default: {
      const unknown: never = page.mat
      return unknown
    }
  }
  g.fillStyle = PALETTE.stone
  for (const stone of page.stones) {
    const [cx, cy] = at(stone.x, stone.y)
    g.beginPath()
    g.arc(cx, cy, (stone.q === 4 ? 30 : stone.q === 2 ? 22 : 16) * sx * 1.4, 0, Math.PI * 2)
    g.fill()
  }
}

/**
 * The album: a clay photo book below the activity choosers, there only once a
 * page exists. Its cover shows the newest page as a dot map; tapping it sets
 * that table back. It hops whenever a page is kept or turned.
 */
export function AlbumModel({ read }: { read: () => { pages: readonly AlbumPage[]; at: number | null; now: number } }) {
  const { clay } = useClay()
  const book = once('album', () =>
    merge([
      piece(geo.roundedBox(10, 0.15), '#3f7d8c', { position: [0, 1.2, 0], scale: [11, 2.4, 13] }, { lump: 0.12, frequency: 0.5, seed: 51 }),
      piece(geo.roundedBox(8, 0.1), '#fbf1de', { position: [0.5, 1.2, 0], scale: [10.2, 1.8, 12.4] }, { lump: 0.05, ground: null }),
      piece(geo.torus(16, 0.3), '#e0a13c', { position: [-5.3, 1.3, 3.5], rotation: [0, 0, Math.PI / 2], scale: 0.9 }, { ground: null }),
      piece(geo.torus(16, 0.3), '#e0a13c', { position: [-5.3, 1.3, -3.5], rotation: [0, 0, Math.PI / 2], scale: 0.9 }, { ground: null }),
    ]),
  )
  const cover = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 96
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, texture, material: new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }) }
  }, [])
  useEffect(() => () => {
    cover.texture.dispose()
    cover.material.dispose()
  }, [cover])
  const group = useRef<THREE.Group>(null)
  const drawn = useRef<string>('')
  const shown = useRef<number | null>(null)
  const slot = albumSlot()
  const p = to3(slot)
  useFrame(() => {
    const pose = read()
    const g = group.current
    if (!g) return
    const newest = pose.pages[pose.pages.length - 1] ?? null
    g.visible = newest !== null
    if (!newest) {
      shown.current = null
      return
    }
    shown.current ??= pose.now
    const key = `${pose.pages.length}:${pose.at}`
    if (key !== drawn.current) {
      drawPageMap(cover.canvas, newest)
      cover.texture.needsUpdate = true
      drawn.current = key
    }
    const appear = Math.min(1, (pose.now - shown.current) / 0.6)
    const hopAge = pose.at === null ? Infinity : pose.now - pose.at
    const hop = hopAge < 0.6 ? Math.sin((hopAge / 0.6) * Math.PI) * 3 : 0
    g.position.set(p.x, hop, p.z)
    g.scale.setScalar(Math.max(0.01, easeOutBack(appear)) * 1.1)
    g.rotation.set(0, -0.35 + Math.sin(pose.now * 0.8) * 0.04, 0)
  })
  return (
    <group ref={group} visible={false}>
      <mesh geometry={book} material={clay} />
      <mesh material={cover.material} position={[0.5, 2.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.6, 11.8]} />
      </mesh>
    </group>
  )
}

// --- loose parts and their jars ---------------------------------------------------

const PARTS = { nut: '#a8703d', cap: '#6e4a2c', shell: '#f4d3c0', rib: '#e3a98f', bark: '#7a5238', twig: '#8f6644', rock: '#8d8176' }
/** Part meshes are modelled small; drawn at this size they match their colliders. */
const PART_DRAW_SCALE = 1.45
const JAR_COLORS: Record<PartKind, string> = { acorn: '#d9a441', shell: '#5f9fb8', stick: '#5d8a5a', boulder: '#d8b36a' }

function partGeometry(kind: PartKind): THREE.BufferGeometry {
  const sphere = geo.sphere(16)
  switch (kind) {
    case 'acorn':
      return merge([
        piece(sphere, PARTS.nut, { position: [0, -0.15, 0], scale: [0.85, 1.0, 0.85] }, { lump: 0.06, ground: null }),
        piece(sphere, PARTS.cap, { position: [0, 0.45, 0], scale: [0.98, 0.5, 0.98] }, { lump: 0.1, ground: null }),
        piece(geo.capsule(6), PARTS.cap, { position: [0, 0.95, 0], scale: [0.14, 0.35, 0.14] }, { ground: null }),
      ])
    case 'shell':
      return merge([
        piece(sphere, PARTS.shell, { scale: [1.35, 0.32, 1.15] }, { lump: 0.05, ground: null }),
        ...[-0.5, 0, 0.5].map((angle) => piece(geo.capsule(6), PARTS.rib, { position: [Math.sin(angle) * 0.55, 0.22, Math.cos(angle) * 0.35], rotation: [Math.PI / 2, angle, 0], scale: [0.12, 1.2, 0.12] }, { ground: null })),
      ])
    case 'stick':
      return merge([
        piece(geo.capsule(8), PARTS.bark, { rotation: [0, 0, Math.PI / 2], scale: [0.62, 5, 0.62] }, { lump: 0.1, frequency: 1.2, ground: null }),
        piece(geo.capsule(6), PARTS.twig, { position: [0.8, 0.35, 0.4], rotation: [0.6, 0, 0.9], scale: [0.3, 1.4, 0.3] }, { ground: null }),
      ])
    case 'boulder':
      return merge([piece(sphere, PARTS.rock, { scale: [3.3, 1.9, 3.1] }, { lump: 0.35, frequency: 0.8, seed: 41, ground: null })])
    default: {
      const unknown: never = kind
      return unknown
    }
  }
}

function jarGeometry(kind: PartKind): { body: THREE.BufferGeometry; lid: THREE.BufferGeometry } {
  const sphere = geo.sphere(24)
  const color = JAR_COLORS[kind]
  if (kind === 'boulder') {
    return {
      body: merge([
        piece(geo.torus(28, 0.35), color, { position: [0, 0.9, 0], rotation: [Math.PI / 2, 0, 0], scale: 4.6 }, { lump: 0.3, frequency: 1.4, seed: 44 }),
        piece(sphere, '#c9a45c', { position: [0, 0.3, 0], scale: [4.4, 0.5, 4.4] }, { lump: 0.2, frequency: 1.2 }),
      ]),
      lid: merge([piece(sphere, color, { scale: 0.01 }, { ground: null })]),
    }
  }
  const label = partGeometry(kind)
  const labelPiece = label.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 4.2, 3.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.3, 0, kind === 'stick' ? 0.4 : 0)), new THREE.Vector3(0.8, 0.8, 0.8)))
  return {
    body: merge([
      piece(sphere, color, { position: [0, 3.8, 0], scale: [3.6, 3.9, 3.6] }, { lump: 0.18, frequency: 0.6, seed: 45 }),
      piece(geo.cylinder(20), color, { position: [0, 7.6, 0], scale: [2.3, 1.2, 2.3] }, { lump: 0.08, ground: null }),
      labelPiece,
    ]),
    lid: merge([
      piece(geo.cylinder(20), '#fbe7cf', { scale: [2.7, 0.6, 2.7] }, { lump: 0.08, ground: null }),
      piece(sphere, '#fbe7cf', { position: [0, 0.6, 0], scale: 0.7 }, { ground: null }),
    ]),
  }
}

export type PartState = { id: number; kind: PartKind; position: Vec3; quaternion: [number, number, number, number]; held: boolean }

/** Loose parts in one instanced draw per kind, posed from physics, lifted a little while held. */
export function PartsModel({ read }: { read: () => PartState[] }) {
  const { clay } = useClay()
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const geometries = once('parts', () => PART_KINDS.map(partGeometry))
  useFrame(() => {
    const counts = [0, 0, 0, 0]
    for (const part of read()) {
      const slot = PART_KINDS.indexOf(part.kind)
      const instanced = refs[slot].current
      if (!instanced) continue
      scratch.q.set(...part.quaternion)
      const grow = (part.held ? 1.12 : 1) * PART_DRAW_SCALE
      scratch.m.compose(scratch.p.set(part.position.x, part.position.y, part.position.z), scratch.q, scratch.s.set(grow, grow, grow))
      instanced.setMatrixAt(counts[slot]++, scratch.m)
    }
    refs.forEach((ref, slot) => {
      if (!ref.current) return
      ref.current.count = counts[slot]
      ref.current.instanceMatrix.needsUpdate = true
    })
  })
  return (
    <>
      {PART_KINDS.map((kind, slot) => (
        <instancedMesh key={kind} ref={refs[slot]} args={[geometries[slot], clay, PART_COUNTS[kind]]} frustumCulled={false} />
      ))}
    </>
  )
}

/** The jars on the scale mat's back row: each wobbles when tipped or when a part comes home, and its lid lies open once it is empty. */
export function JarsModel({ read }: { read: () => { tips: ReadonlyMap<PartKind, number>; full: Record<PartKind, number>; glow: number; now: number } }) {
  const { clay } = useClay()
  const shapes = once('jars', () => PART_KINDS.map(jarGeometry))
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const lids = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const wobble = useRef(PART_KINDS.map(() => ({ x: 0, v: 0 }) as Spring))
  const seen = useRef(new Map<PartKind, number>())
  useFrame((_, dt) => {
    const pose = read()
    PART_KINDS.forEach((kind, i) => {
      const tipped = pose.tips.get(kind)
      if (tipped !== undefined && tipped !== seen.current.get(kind)) {
        wobble.current[i].v += 7
        seen.current.set(kind, tipped)
      }
      const w = springStep(wobble.current[i], 0, dt, 70, 5)
      const group = refs[i].current
      if (group) {
        const hop = pose.full[kind] > 0 ? pose.glow * Math.max(0, Math.sin(pose.now * 3 + i)) * 0.6 : 0
        group.rotation.set(w * 0.05, 0, w * 0.08)
        group.position.y = hop
      }
      const lid = lids[i].current
      if (lid) {
        const open = pose.full[kind] === 0
        lid.position.set(open ? 4.2 : 0, open ? 0.4 : 8.4 + Math.abs(w) * 0.05, open ? 1.5 : 0)
        lid.rotation.set(open ? 0.3 : 0, 0, open ? 1.3 : 0)
      }
    })
  })
  return (
    <>
      {PART_KINDS.map((kind, i) => {
        const at = to3(JARS[kind])
        return (
          <group key={kind} position={[at.x, 0, at.z]} scale={JAR_SCALE}>
            <group ref={refs[i]}>
              <mesh geometry={shapes[i].body} material={clay} />
            </group>
            {kind !== 'boulder' && <mesh ref={lids[i]} geometry={shapes[i].lid} material={clay} />}
          </group>
        )
      })}
    </>
  )
}

// --- Knock-Knock ----------------------------------------------------------------

const HOUSE = { walls: '#efc39c', roof: '#6d8db5', door: '#9a5a38', frame: '#fbe7cf', glass: '#ffe39a', chimney: '#c98f6a' }
const MOUSE = { fur: '#f3e8d8', ear: '#f2a7a0', eye: '#2b2220', nose: '#e0837c' }

/** The cottage without its door, scaled and placed for the mat (scale 1) or a chooser token. */
function houseParts(scale: number, offset: V3): THREE.BufferGeometry[] {
  const at = (x: number, y: number, z: number): V3 => [offset[0] + x * scale, offset[1] + y * scale, offset[2] + z * scale]
  const size = (x: number, y: number, z: number): V3 => [x * scale, y * scale, z * scale]
  return [
    piece(geo.roundedBox(12, 0.12), HOUSE.walls, { position: at(0, 7, 0), scale: size(26, 14, 19) }, { lump: 0.18, frequency: 0.25, seed: 21 }),
    piece(geo.cylinder(4, 0, 1), HOUSE.roof, { position: at(0, 18.5, 0), rotation: [0, Math.PI / 4, 0], scale: size(21, 9, 17) }, { lump: 0.12, frequency: 0.3, seed: 22, ground: null }),
    piece(geo.roundedBox(8, 0.2), HOUSE.chimney, { position: at(7, 20, -3), scale: size(3.2, 7, 3.2) }, { lump: 0.1, ground: null }),
    piece(geo.roundedBox(8, 0.2), HOUSE.frame, { position: at(0, 5, 9.6), scale: size(8, 11, 0.8) }, { lump: 0.08, ground: null }),
    piece(geo.roundedBox(8, 0.25), HOUSE.frame, { position: at(8.5, 8.5, 9.6), scale: size(6, 5.4, 0.8) }, { lump: 0.06, ground: null }),
    piece(geo.roundedBox(8, 0.25), HOUSE.glass, { position: at(8.5, 8.5, 9.85), scale: size(4.6, 4, 0.5) }, { ground: null }),
  ]
}

function mouseGeometry(): THREE.BufferGeometry {
  const sphere = geo.sphere(16)
  return merge([
    piece(sphere, MOUSE.fur, { position: [0, 1.4, 0], scale: [1.7, 1.45, 2.1] }, { lump: 0.12, seed: 31 }),
    piece(sphere, MOUSE.fur, { position: [0, 2.2, 1.9], scale: [1.15, 1.05, 1.25] }, { lump: 0.08, ground: null }),
    ...[-1, 1].flatMap((side) => [
      piece(sphere, MOUSE.fur, { position: [side * 0.95, 3.25, 1.5], scale: [0.72, 0.72, 0.25] }, { ground: null }),
      piece(sphere, MOUSE.ear, { position: [side * 0.95, 3.25, 1.6], scale: [0.48, 0.48, 0.18] }, { ground: null }),
      piece(sphere, MOUSE.eye, { position: [side * 0.45, 2.45, 2.95], scale: 0.24 }, { ground: null }),
    ]),
    piece(sphere, MOUSE.nose, { position: [0, 2.05, 3.15], scale: 0.22 }, { ground: null }),
    piece(geo.capsule(8), MOUSE.ear, { position: [0, 0.9, -2.6], rotation: [1.1, 0, 0], scale: [0.18, 1.6, 0.18] }, { ground: null }),
  ])
}

export type DoorPose = {
  visitors: readonly { home: Point; outAt: number; leaveAt: number | null; pokeAt: number | null }[]
  openAt: number | null
  closeAt: number | null
  knockAt: number | null
  answerTimes: readonly number[]
  peek: number | null
  now: number
}

const DOOR_OPEN = -1.75
const MOUSE_SCALE = 2.2
const VISITOR_WALK_TIME = 0.6

/**
 * The Knock-Knock house. Knocks shake the door; the house's answer shakes it
 * from inside; then it swings open and visitors hop out to their spots in the
 * yard and wiggle there, hopping when poked. While nobody is out, a face
 * peeks from the lit window.
 */
export function DoorModel({ read }: { read: () => DoorPose }) {
  const { clay } = useClay()
  const house = once('house', () => merge(houseParts(1, [0, 0, 0])))
  const doorLeaf = once('door-leaf', () => merge([piece(geo.roundedBox(8, 0.18), HOUSE.door, { position: [3, 4.8, 0], scale: [6, 9.6, 0.9] }, { lump: 0.1, ground: null }), piece(geo.sphere(10), HOUSE.frame, { position: [5.2, 4.8, 0.6], scale: 0.45 }, { ground: null })]))
  const mouse = once('mouse', mouseGeometry)
  const leaf = useRef<THREE.Group>(null)
  const face = useRef<THREE.Mesh>(null)
  const mice = useRef<THREE.InstancedMesh>(null)
  const swing = useRef<Spring>({ x: 0, v: 0 })
  const lastKnock = useRef<number | null>(null)
  const p = to3(DOOR.house)
  const threshold = to3(DOOR.door)
  useFrame((_, dt) => {
    const pose = read()
    const now = pose.now
    if (pose.knockAt !== null && pose.knockAt !== lastKnock.current) {
      swing.current.v -= 3
      lastKnock.current = pose.knockAt
    }
    const answering = pose.answerTimes.some((t) => now >= t && now - t < 0.05)
    if (answering) swing.current.v += 2.4
    const open = pose.openAt !== null && (pose.closeAt === null || now < pose.closeAt - 0.3) ? DOOR_OPEN : 0
    const angle = springStep(swing.current, open, dt, 60, 8)
    if (leaf.current) leaf.current.rotation.y = angle
    if (face.current) {
      const k = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI)
      face.current.visible = k > 0.02
      face.current.position.set(8.5, 4.6 + k * 1.6, 10.4)
      face.current.rotation.set(0, 0, Math.sin(now * 9) * 0.12 * k)
    }
    const instanced = mice.current
    if (!instanced) return
    let count = 0
    for (const visitor of pose.visitors) {
      const out = (now - visitor.outAt) / VISITOR_WALK_TIME
      if (out < 0) continue
      const back = visitor.leaveAt === null ? 0 : Math.min(1, (now - visitor.leaveAt) / VISITOR_WALK_TIME)
      const k = Math.min(1, out) * (1 - back)
      const home = to3(visitor.home)
      const x = threshold.x + (home.x - threshold.x) * k
      const z = threshold.z + 2 + (home.z - threshold.z - 2) * k
      const walking = (out < 1 || back > 0) && k > 0 && k < 1
      const hop = walking ? Math.abs(Math.sin(k * Math.PI * 3)) * 3 : 0
      const pokeAge = visitor.pokeAt === null ? Infinity : now - visitor.pokeAt
      const poke = pokeAge < 0.5 ? Math.sin((pokeAge / 0.5) * Math.PI) * 4 : 0
      const wiggle = walking ? 0 : Math.sin(now * 5 + count * 1.7) * 0.12
      const facing = walking && back > 0 ? Math.atan2(threshold.x - home.x, threshold.z - home.z) : 0
      scratch.q.setFromEuler(scratch.e.set(0, facing + wiggle, 0))
      scratch.m.compose(scratch.p.set(x, hop + poke, z), scratch.q, scratch.s.set(MOUSE_SCALE, MOUSE_SCALE * (1 - poke * 0.02), MOUSE_SCALE))
      instanced.setMatrixAt(count++, scratch.m)
    }
    instanced.count = count
    instanced.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <group position={[p.x, 0, p.z]} scale={DOOR.houseScale}>
        <mesh geometry={house} material={clay} />
        <group ref={leaf} position={[-3, 0, 9.9]}>
          <mesh geometry={doorLeaf} material={clay} />
        </group>
        <mesh ref={face} geometry={mouse} material={clay} scale={0.9} visible={false} />
      </group>
      <instancedMesh ref={mice} args={[mouse, clay, 10]} frustumCulled={false} />
    </group>
  )
}

/** A big clay token for an activity: a cushion to sit on, with a small model of the activity on top. */
function chooserGeometry(mat: MatKey): THREE.BufferGeometry {
  const parts = [
    piece(geo.sphere(28), PALETTE.tile, { position: [0, 1.2, 0], scale: [7.2, 1.6, 7.2] }, { lump: 0.25, frequency: 0.5, seed: 11 }),
    piece(geo.torus(32, 0.12), PALETTE.shelf, { position: [0, 1.25, 0], rotation: [Math.PI / 2, 0, 0], scale: 7.1 }, { lump: 0.05, ground: null }),
  ]
  const stone = (x: number, y: number, z: number) => piece(geo.pebble(14), PALETTE.stone, { position: [x, y, z], scale: 1.2 }, { ground: null })
  switch (mat) {
    case 'scale':
      parts.push(piece(geo.cylinder(10), PALETTE.scaleWood, { position: [0, 4.6, 0], scale: [0.7, 5.4, 0.7] }, { ground: null }))
      parts.push(piece(geo.capsule(10), PALETTE.scaleWood, { position: [0, 7.3, 0], rotation: [0, 0, Math.PI / 2 + 0.22], scale: [0.6, 7.4, 0.6] }, { ground: null }))
      parts.push(piece(geo.dish(18), PALETTE.pan, { position: [-3.4, 5.4, 0], scale: [2.4, 5, 2.4] }, { ground: null }))
      parts.push(piece(geo.dish(18), PALETTE.pan, { position: [3.4, 3.8, 0], scale: [2.4, 5, 2.4] }, { ground: null }))
      parts.push(stone(3.4, 4.5, 0))
      break
    case 'door':
      parts.push(...houseParts(0.34, [0, 2.4, 0]))
      break
    case 'feeding':
      parts.push(piece(geo.plate(24), PALETTE.plate, { position: [0, 2.9, 0], scale: [5, 3, 5] }, { ground: null }))
      parts.push(piece(geo.bowl(20), PALETTE.bowl, { position: [0, 3.2, 0], scale: 2.6 }, { ground: null }))
      parts.push(stone(-0.8, 4, 0.3), stone(0.9, 4.1, -0.4))
      break
    default: {
      const unknown: never = mat
      return unknown
    }
  }
  return merge(parts)
}

const CHOOSER_SCALE = 1.35

/** The activity choosers: big tokens on the table's right margin that bob when the guidance points at them; tap or drag one onto the table to switch. */
export function ShelfModel({ read }: { read: () => { mats: MatKey[]; drag: { mat: MatKey; at: Point } | null; glow: number; now: number } }) {
  const { clay } = useClay()
  const mats: MatKey[] = ['scale', 'feeding', 'door']
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const tokens = once('choosers', () => mats.map(chooserGeometry))
  const hover = useRef(mats.map(() => ({ x: 0, v: 0 })))
  useFrame((_, dt) => {
    const pose = read()
    mats.forEach((mat, i) => {
      const group = refs[i].current
      if (!group) return
      const index = pose.mats.indexOf(mat)
      group.visible = index >= 0
      if (index < 0) return
      if (pose.drag?.mat === mat) {
        const p = to3(pose.drag.at, 5)
        group.position.set(p.x, p.y, p.z)
        group.rotation.set(0, -0.4, 0)
        group.scale.setScalar(CHOOSER_SCALE * 1.15)
        return
      }
      const tile = shelfTile(index)
      const lift = springStep(hover.current[i], pose.glow * (1.2 + 0.8 * Math.sin(pose.now * 3)), dt, 80, 10)
      const p = to3(tile, tile.height + Math.max(0, lift))
      group.position.set(p.x, p.y, p.z)
      group.rotation.set(0, -0.4 + Math.sin(pose.now * 0.7 + i) * 0.06, Math.sin(pose.now * 1.1 + i * 2) * 0.03)
      group.scale.setScalar(CHOOSER_SCALE)
    })
  })
  return (
    <group>
      {mats.map((mat, i) => (
        <group key={mat} ref={refs[i]}>
          <mesh geometry={tokens[i]} material={clay} />
        </group>
      ))}
    </group>
  )
}

function pointingHandTexture(): THREE.Texture {
  const element = document.createElement('canvas')
  element.width = 256
  element.height = 320
  const g = element.getContext('2d')!
  g.translate(128, 0)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const shape = () => {
    g.beginPath()
    g.moveTo(-26, 296)
    g.quadraticCurveTo(-30, 190, -28, 150)
    g.quadraticCurveTo(-70, 150, -74, 110)
    g.quadraticCurveTo(-96, 96, -86, 64)
    g.quadraticCurveTo(-80, 20, -30, 14)
    g.lineTo(46, 14)
    g.quadraticCurveTo(92, 18, 90, 70)
    g.quadraticCurveTo(96, 110, 70, 132)
    g.quadraticCurveTo(52, 150, 30, 150)
    g.quadraticCurveTo(32, 190, 26, 296)
    g.quadraticCurveTo(0, 318, -26, 296)
    g.closePath()
  }
  shape()
  const fill = g.createLinearGradient(-90, 0, 90, 300)
  fill.addColorStop(0, '#ffffff')
  fill.addColorStop(1, '#f3ece2')
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 9
  g.strokeStyle = '#6a5040'
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = 'rgba(106,80,64,0.5)'
  for (const x of [-40, 0, 40]) {
    g.beginPath()
    g.moveTo(x, 30)
    g.quadraticCurveTo(x + 4, 70, x, 100)
    g.stroke()
  }
  const texture = new THREE.CanvasTexture(element)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A big friendly cartoon hand, always facing the camera, fingertip on the target; carries a ghost stone for drags. */
export function GhostHand({ read, carry }: { read: () => { at: Point; press: number; opacity: number } | null; carry: () => boolean }) {
  const { stones } = useClay()
  const ghost = useMemo(() => {
    const material = stones.clone()
    material.transparent = true
    material.depthWrite = false
    return material
  }, [stones])
  const pebble = useMemo(() => geo.pebble(20), [])
  const stone = useRef<THREE.Mesh>(null)
  const sprite = useRef<THREE.Sprite>(null)
  const material = useMemo(() => new THREE.SpriteMaterial({ map: pointingHandTexture(), transparent: true, depthTest: false, toneMapped: false }), [])
  useFrame(() => {
    const pose = read()
    const visible = !!pose && pose.opacity > 0.01
    if (sprite.current) sprite.current.visible = visible
    if (!pose || !visible) {
      if (stone.current) stone.current.visible = false
      return
    }
    const lift = (1 - pose.press) * 5
    const p = to3(pose.at, 0.8 + lift)
    sprite.current?.position.set(p.x, p.y, p.z)
    material.opacity = pose.opacity
    if (stone.current) {
      stone.current.visible = carry() && pose.press > 0.5
      stone.current.position.set(p.x, Math.max(1.4, p.y - 0.4), p.z)
      ghost.opacity = pose.opacity * 0.65
    }
  })
  return (
    <>
      <mesh ref={stone} geometry={pebble} material={ghost} scale={stoneRadius3(4)} renderOrder={9} />
      <sprite ref={sprite} material={material} center={[0.5, 0.02]} scale={[15, 18.75, 1]} renderOrder={10} />
    </>
  )
}
