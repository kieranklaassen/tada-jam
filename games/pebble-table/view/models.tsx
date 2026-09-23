import { useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { BAG, FEEDING, SCALE, SHELF, shelfTile, TABLE, type MatKey, type Point, type Quarters } from '../layout'
import { stoneRadius3, to3, UNIT, type Vec3 } from '../physics3d'
import { createClayMaterials, merge, PALETTE, piece, type ClayMaterials } from './clay'
import { furTime, MAX_SHELLS, quillGeometry, quillLayout, withShells } from './fur'
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
const scratch = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler() }

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
    material.normalScale = new THREE.Vector2(0.8, 0.8)
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

type Squash = Spring & { lastVy: number; wasHeld: boolean }

const STONE_SHAPE: Record<Quarters, V3> = { 4: [1, 1, 1], 2: [1.1, 1.05, 0.72], 1: [1, 1.1, 0.8] }
const MAX_STONES = 64

/** All stones in one instanced draw: physics pose plus squash on landing and stretch on pickup. */
export function StonesModel({ read }: { read: () => StoneState[] }) {
  const { stones } = useClay()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const squash = useRef(new Map<number, Squash>())
  const geometry = useMemo(() => geo.pebble(28), [])
  useEffect(() => {
    const instanced = mesh.current
    if (!instanced) return
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < MAX_STONES; i++) instanced.setColorAt(i, scratch.c.set('#ffffff'))
  }, [])
  useFrame((_, dt) => {
    const instanced = mesh.current
    if (!instanced) return
    const list = read()
    const seen = new Set<number>()
    list.slice(0, MAX_STONES).forEach((stone, i) => {
      seen.add(stone.id)
      let s = squash.current.get(stone.id)
      if (!s) {
        s = { x: 0, v: 0, lastVy: 0, wasHeld: stone.held }
        squash.current.set(stone.id, s)
      }
      if (stone.held && !s.wasHeld) s.v -= 3.2
      if (!stone.held && s.lastVy < -30 && stone.velocityY > -6) s.v += Math.min(4.5, -s.lastVy * 0.045)
      s.wasHeld = stone.held
      s.lastVy = stone.velocityY
      const amount = THREE.MathUtils.clamp(springStep(s, stone.held ? -0.07 : 0, dt, 330, 11), -0.3, 0.35)
      const r = stoneRadius3(stone.q)
      const shape = STONE_SHAPE[stone.q]
      const pop = 1 + stone.pulse * 0.22 + stone.glow * 0.06
      const rotation = new THREE.Matrix4().makeRotationFromQuaternion(scratch.q.set(...stone.quaternion))
      const shapeScale = new THREE.Matrix4().makeScale(r * shape[0] * pop, r * shape[1] * pop, r * shape[2] * pop)
      const squashScale = new THREE.Matrix4().makeScale(1 + amount * 0.6, 1 - amount, 1 + amount * 0.6)
      const lift = amount > 0 ? -amount * r * 0.35 : 0
      scratch.m.makeTranslation(stone.position.x, stone.position.y + lift, stone.position.z).multiply(squashScale).multiply(rotation).multiply(shapeScale)
      instanced.setMatrixAt(i, scratch.m)
      const bright = 1 + stone.pulse * 0.28 + stone.glow * 0.18
      instanced.setColorAt(i, scratch.c.setRGB(bright, bright, bright))
    })
    for (const id of squash.current.keys()) if (!seen.has(id)) squash.current.delete(id)
    instanced.count = Math.min(list.length, MAX_STONES)
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geometry, stones, MAX_STONES]} frustumCulled={false} />
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
  const p = to3(BAG)
  useFrame((_, dt) => {
    const pose = read()
    const group = body.current
    if (group) {
      if (pose.tipAge !== null && pose.tipAge < dt * 1.5 && lastTip.current !== pose.tipAge) settle.current.v += 7
      lastTip.current = pose.tipAge
      const t = pose.tipAge ?? 10
      const anticipation = t < 0.12 ? Math.sin((t / 0.12) * Math.PI) * 0.12 : 0
      const lurch = t >= 0.12 && t < 0.55 ? Math.sin(((t - 0.12) / 0.43) * Math.PI) * 0.42 : 0
      const wobble = springStep(settle.current, 0, dt, 90, 7)
      const girth = 0.7 + pose.fullness * 0.32
      const breathe = 1 + Math.sin(pose.now * 1.4) * 0.014
      const invite = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI * 6) * 0.1 * Math.sin(pose.peek * Math.PI)
      group.scale.set(BAG_GIRTH * girth * breathe * (1 + anticipation), BAG_LENGTH * (1 - anticipation * 0.6), BAG_GIRTH * girth * breathe * (1 + anticipation) * 1.1)
      group.position.y = BAG_GIRTH * girth * 0.88
      group.rotation.set(invite + wobble * 0.04, 0, -1.42 - lurch + anticipation * 0.6 + wobble * 0.02)
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
  return merge([
    piece(geo.capsule(16), PALETTE.scaleWood, { rotation: [0, 0, Math.PI / 2], scale: [1.4, half, 1.4] }, { lump: 0.12, frequency: 0.8, ground: null }),
    piece(geo.sphere(16), PALETTE.scaleWood, { position: [-half, 0, 0], scale: 1.5 }, { lump: 0.1, ground: null }),
    piece(geo.sphere(16), PALETTE.scaleWood, { position: [half, 0, 0], scale: 1.5 }, { lump: 0.1, ground: null }),
  ])
}

function panGeometry(radius: number): THREE.BufferGeometry {
  return merge([piece(geo.dish(40), PALETTE.pan, { scale: [radius, 14, radius] }, { lump: 0.25, frequency: 0.35, seed: 5, ground: null })])
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
    chain: merge([piece(geo.cylinder(6), PALETTE.pan, { position: [0, 0.5, 0] }, { ground: null })]),
  }))
  useFrame(() => {
    const pose = read()
    const angle = pose.angle + Math.sin(pose.now * 0.9) * 0.003
    if (beam.current) beam.current.rotation.z = -angle
    const instanced = chains.current
    SCALE.pans.forEach((pan, side) => {
      const center = to3(pan, pose.panY[side])
      pans[side].current?.position.set(center.x, center.y, center.z)
      const sign = side === 0 ? -1 : 1
      const end = new THREE.Vector3(post.x + Math.cos(angle) * half * sign, PIVOT_Y - Math.sin(angle) * half * sign, post.z)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5
        const rim = new THREE.Vector3(center.x + Math.cos(a) * pan.r * UNIT * 0.93, center.y + 1.4, center.z + Math.sin(a) * pan.r * UNIT * 0.93)
        const dir = rim.clone().sub(end)
        const length = dir.length()
        scratch.m.compose(end, scratch.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), scratch.s.set(0.22, length, 0.22))
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

export function FeedingSetting({ seats }: { seats: readonly boolean[] }) {
  const { clay, rug } = useClay()
  const center = to3({ x: 780, y: 470 })
  const bowl = to3(FEEDING.bowl)
  const shapes = once('feeding', () => ({
      rug: geo.cloth(40),
      bowl: merge([piece(geo.bowl(44), PALETTE.bowl, { scale: FEEDING.bowl.r * UNIT }, { lump: 0.2, frequency: 0.4, seed: 8 })]),
      plate: merge([piece(geo.plate(36), PALETTE.plate, { scale: [FEEDING.plateRadius * UNIT, 5, FEEDING.plateRadius * UNIT] }, { lump: 0.15, frequency: 0.5, seed: 3, occlusion: 0.15 })]),
      stool: merge([piece(geo.cylinder(28, 0.9, 1), PALETTE.stool, { position: [0, 1.4, 0], scale: [4.2, 2.8, 4.2] }, { lump: 0.25, frequency: 0.6, seed: 6 })]),
    }))
  const plates = useRef<THREE.InstancedMesh>(null)
  const stools = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    let plateCount = 0
    let stoolCount = 0
    FEEDING.seats.forEach((seat, index) => {
      if (seats[index]) {
        const p = to3(seat.plate, 0.12)
        scratch.m.makeTranslation(p.x, p.y, p.z)
        plates.current?.setMatrixAt(plateCount++, scratch.m)
      } else {
        const p = to3(seat.guest)
        scratch.m.makeTranslation(p.x, 0, p.z)
        stools.current?.setMatrixAt(stoolCount++, scratch.m)
      }
    })
    if (plates.current) {
      plates.current.count = plateCount
      plates.current.instanceMatrix.needsUpdate = true
    }
    if (stools.current) {
      stools.current.count = stoolCount
      stools.current.instanceMatrix.needsUpdate = true
    }
  }, [seats])
  return (
    <group>
      <mesh geometry={shapes.rug} material={rug} position={[center.x, 0.04, center.z]} scale={[42, 4, 30]} />
      <mesh geometry={shapes.bowl} material={clay} position={[bowl.x, 0, bowl.z]} />
      <instancedMesh ref={plates} args={[shapes.plate, clay, 5]} frustumCulled={false} />
      <instancedMesh ref={stools} args={[shapes.stool, clay, 5]} frustumCulled={false} />
    </group>
  )
}

// --- guests ------------------------------------------------------------------

export type Species = 'rabbit' | 'bear' | 'hedgehog'
export const SEAT_SPECIES: readonly Species[] = ['bear', 'rabbit', 'hedgehog', 'bear', 'hedgehog']

export type GuestPose = {
  look: Point | null
  reach: number
  munchAt: number | null
  hopAt: number | null
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
  head.push(piece(sphere, PALETTE.nose, { position: [0, 2.8, muzzle.position[2] + muzzle.scale[2] * 0.85], scale: [0.55, 0.42, 0.4] }, { ground: null }))
  for (const side of [-1, 1]) {
    head.push(piece(sphere, PALETTE.cheek, { position: [side * 2.4, 2.3, 2.5], scale: [0.8, 0.5, 0.35] }, { ground: null }))
    if (species === 'rabbit') {
      head.push(piece(geo.capsule(14), fur, { position: [side * 1.4, 7.6, -0.3], rotation: [-0.12, 0, -side * 0.16], scale: [1.4, 3.3, 0.9] }, { lump: 0.12, ground: null }))
      head.push(piece(geo.capsule(12), PALETTE.rabbitInner, { position: [side * 1.4, 7.7, 0.25], rotation: [-0.12, 0, -side * 0.16], scale: [0.75, 2.6, 0.35] }, { ground: null }))
    } else if (species === 'bear') {
      head.push(piece(sphere, fur, { position: [side * 2.7, 5.9, 0], scale: [1.35, 1.35, 0.9] }, { lump: 0.1, ground: null }))
      head.push(piece(sphere, PALETTE.bearMuzzle, { position: [side * 2.7, 5.9, 0.6], scale: [0.75, 0.75, 0.4] }, { ground: null }))
    } else {
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
    chain: merge([piece(geo.cylinder(6), PALETTE.pan, { position: [0, 0.5, 0] }, { ground: null })]),
  }))
}

const GUEST_SIZE = 1.5

function easeOutBack(t: number): number {
  const c = 1.9
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}

/**
 * A clay guest. Idle: breathes, blinks, sways. Looks at what matters. Hops
 * when a stone lands on its plate (anticipation squash, jump, landing squash,
 * wobble), munches with the party (lean back, three chomps, follow-through),
 * and pops in with an overshoot when seated.
 */
export function Guest({ seat, at, read }: { seat: number; at: Point; read: () => GuestPose }) {
  const { clay, fur, quill } = useClay()
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)
  const furParts = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const quillParts = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const species = SEAT_SPECIES[seat % SEAT_SPECIES.length]
  const shapes = speciesShapes(species)
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Mesh>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const springs = useRef({ yaw: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, squash: { x: 0, v: 0 }, landedFrom: null as number | null })
  const facing = FEEDING.seats[seat].facing
  const face = new THREE.Vector2(-facing.x * 0.8, -facing.y + 1.5).normalize()
  const yaw = Math.atan2(face.x, face.y)
  const p = to3(at)
  const phase = seat * 1.37

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
    const a = new THREE.Vector3(p.x, 6, p.z).project(camera)
    const b = new THREE.Vector3(p.x + 6 * GUEST_SIZE, 6, p.z).project(camera)
    const pixels = (Math.abs(b.x - a.x) / 2) * viewport.width * dpr
    const shells = THREE.MathUtils.clamp(Math.round(pixels / 12), 3, MAX_SHELLS)
    for (const ref of furParts) if (ref.current) ref.current.count = shells

    let lookYaw = Math.sin(now * 0.5 + phase) * 0.12
    if (pose.look) {
      const target = to3(pose.look)
      const worldAngle = Math.atan2(target.x - p.x, target.z - p.z)
      lookYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(worldAngle - yaw), Math.cos(worldAngle - yaw)), -0.38, 0.38)
    }
    springStep(s.yaw, lookYaw, dt, 60, 9)

    let pitchTarget = pose.look ? 0.18 : 0
    const munchAge = pose.munchAt === null ? Infinity : now - pose.munchAt
    let mouthOpen = 0
    if (munchAge < 1.4) {
      if (munchAge < 0.22) pitchTarget = -0.28
      else {
        const chomp = Math.abs(Math.sin(((munchAge - 0.22) / 1.1) * Math.PI * 3))
        pitchTarget = 0.12 + chomp * 0.3
        mouthOpen = 1 - chomp
      }
    }
    springStep(s.pitch, pitchTarget - pose.reach * 0.1, dt, 140, 9)

    let hopY = 0
    let stretch = 0
    const hopAge = pose.hopAt === null ? Infinity : now - pose.hopAt
    if (hopAge < 0.1) stretch = -0.16 * Math.sin((hopAge / 0.1) * Math.PI * 0.5)
    else if (hopAge < 0.42) {
      const k = (hopAge - 0.1) / 0.32
      hopY = Math.sin(k * Math.PI) * 3.4
      stretch = 0.12 * (1 - k)
    } else if (hopAge < 1 && s.landedFrom !== pose.hopAt) {
      s.squash.v += 6
      s.landedFrom = pose.hopAt
    }
    const squash = springStep(s.squash, 0, dt, 260, 10)
    const breathe = Math.sin(now * 1.8 + phase) * 0.022
    const arrive = pose.arriveAt === null ? 1 : THREE.MathUtils.clamp((now - pose.arriveAt) / 0.55, 0, 1)
    const pop = pose.arriveAt === null || arrive >= 1 ? 1 : Math.max(0.01, easeOutBack(arrive))
    const vertical = 1 + breathe + stretch - squash * 0.5
    const horizontal = 1 - breathe * 0.5 - stretch * 0.5 + squash * 0.35

    if (root.current) {
      root.current.position.y = hopY
      root.current.scale.set(GUEST_SIZE * horizontal * pop, GUEST_SIZE * vertical * pop, GUEST_SIZE * horizontal * pop)
      root.current.rotation.x = pose.reach * 0.16
    }
    if (head.current) {
      head.current.rotation.set(s.pitch.x, s.yaw.x, Math.sin(now * 0.7 + phase) * 0.05)
    }
    const blink = (now + phase) % 4.3 < 0.13
    if (eyes.current) eyes.current.scale.set(1, blink ? 0.12 : 1, 1)
    if (mouth.current) mouth.current.scale.set(1, 1 + mouthOpen * 2.4, 1)
    arms.forEach((ref, side) => {
      if (!ref.current) return
      const sign = side === 0 ? -1 : 1
      const flap = hopAge < 0.42 ? Math.sin(hopAge * 18) * 0.35 : 0
      ref.current.rotation.set(-pose.reach * 1.35, 0, sign * (0.45 + flap - pose.reach * 0.25) + Math.sin(now * 2 + side + phase) * 0.04)
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
  useFrame((_, dt) => {
    const pose = read()
    const group = ref.current
    if (!group) return
    group.visible = pose.visible
    const y = springStep(lift.current, pose.held ? 5 : 0.5, dt, 120, 12)
    const p = to3(pose.at, y)
    group.position.set(p.x, p.y, p.z)
    group.rotation.set(0, 0.5 + (pose.held ? 0 : Math.sin(pose.now * 0.8) * 0.03), pose.held ? 0.25 : 0)
  })
  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={clay} />
    </group>
  )
}

function tileGeometry(mat: MatKey): THREE.BufferGeometry {
  const parts = [piece(geo.roundedBox(10, 0.14), PALETTE.tile, { scale: [9.5, 1.2, 12] }, { lump: 0.12, frequency: 0.4, ground: null })]
  if (mat === 'scale') {
    parts.push(piece(geo.cylinder(8), PALETTE.scaleWood, { position: [0, 0.9, 0], scale: [0.5, 0.8, 5.6], rotation: [0, 0, 0] }, { ground: null }))
    parts.push(piece(geo.capsule(8), PALETTE.scaleWood, { position: [0, 0.9, -2.8], rotation: [0, 0, Math.PI / 2], scale: [0.45, 6, 0.45] }, { ground: null }))
    for (const side of [-1, 1]) parts.push(piece(geo.dish(16), PALETTE.pan, { position: [side * 3, 0.8, 1.2], scale: [1.7, 4, 1.7] }, { ground: null }))
  } else {
    parts.push(piece(geo.bowl(16), PALETTE.bowl, { position: [0, 0.6, 0], scale: 1.8 }, { ground: null }))
    for (const [x, z] of [
      [-3, -3.4],
      [3, -3.4],
      [0, 3.8],
    ]) {
      parts.push(piece(geo.plate(16), PALETTE.plate, { position: [x, 0.65, z], scale: [1.4, 2, 1.4] }, { ground: null }))
    }
  }
  return merge(parts)
}

export function ShelfModel({ read }: { read: () => { mats: MatKey[]; drag: { mat: MatKey; at: Point } | null; glow: number; now: number } }) {
  const { clay } = useClay()
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const mats: MatKey[] = ['scale', 'feeding']
  const tiles = once('tiles', () => mats.map(tileGeometry))
  const rack = once('rack', () => {
    const center = shelfTile(0)
    const p = to3({ x: center.x, y: center.y + 95 })
    return merge([
      piece(geo.roundedBox(12, 0.2), PALETTE.shelf, { position: [p.x, 0.8, p.z], scale: [12, 1.6, 42] }, { lump: 0.2, frequency: 0.3 }),
      piece(geo.roundedBox(12, 0.3), PALETTE.shelf, { position: [p.x + 5.5, 3, p.z], scale: [2, 6, 42] }, { lump: 0.2, frequency: 0.3 }),
    ])
  })
  const hover = useRef([{ x: 0, v: 0 }, { x: 0, v: 0 }])
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
        group.rotation.set(0, 0, 0)
        group.scale.setScalar(1.25)
        return
      }
      const tile = shelfTile(index)
      const bob = springStep(hover.current[i], pose.glow * (0.8 + 0.6 * Math.sin(pose.now * 3)), dt, 80, 10)
      const p = to3(tile, tile.height + bob)
      group.position.set(p.x, p.y, p.z)
      group.rotation.set(0, 0, 0.5)
      group.scale.setScalar(1)
    })
  })
  return (
    <group>
      <mesh geometry={rack} material={clay} />
      {mats.map((mat, i) => (
        <group key={mat} ref={refs[i]}>
          <mesh geometry={tiles[i]} material={clay} />
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
