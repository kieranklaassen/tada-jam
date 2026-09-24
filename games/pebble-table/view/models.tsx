import { useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { albumSlot, BAG, DOOR, FEEDING, SCALE, SHELF, shelfTile, TABLE, type MatKey, type Point, type Quarters } from '../layout'
import { DOOR_HINGE, DOOR_SWING, visitorPose } from '../visitors'
import { BAG_HEADING, BAG_LENGTH, bagShape, bagTip } from '../bag'
import { stoneRadius3, to3, UNIT, type Vec3 } from '../physics3d'
import { pebbleRings, STONE_CUTS, STONE_SEGMENTS, stoneReachAlong, stoneReachOf, stoneVertices } from '../stoneShape'
import { createClayMaterials, merge, paint, PALETTE, piece, type ClayMaterials, type Hold } from './clay'
import {
  coverOf,
  JAR,
  JAR_LID_CLOSED,
  JAR_LIFT,
  JAR_WOBBLE,
  jarBody,
  jarLidOpen,
  labelTurn,
  NEST,
  NEST_LIFT,
  nestBed,
  nestRing,
  PART_DRAW_SCALE,
  PART_PIECES,
  partCover,
  partPieceVertices,
  shellRib,
  sphereGrid,
  STOOL,
  STOOL_LIFT,
  STOOL_REACH,
  stoolButton,
  stoolCushion,
  stoolRim,
  type Ball,
  type Lumped,
} from '../partShape'
import { BOWL_LUMP, BOWL_PROFILE, BOWL_SCALE, DECAL_LIFT, decalReach, DISH_PROFILE, feedingFloor, HEM_POINTS, hemAt, ON_RUG, PAN_DEPTH, PAN_ROLL, PAN_SEGMENTS, PLATE_HEIGHT, PLATE_LUMP, PLATE_PROFILE, ROPE_KNOT, RUG, RUG_HEM, RUG_HEM_Y, type Surfaces } from '../surfaces'
import { furTime, MAX_SHELLS } from './fur'
import { ARM_AT, CHEEK_AT, EAR_AT, GUEST_SIZE, guestFloor, NECK_Y, poseGuest, soleDepth, speciesShapes } from './guest'
import { useQuality } from './quality'
import { MotionDirector, PERSONALITIES, SEAT_SPECIES } from '../motion'
import { guestYaw } from '../feeding'
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
  useWarmup(materials)
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
      <mesh name="table-top" geometry={slab} material={tableClay} />
      <mesh name="floor" material={floor} position={[0, -SLAB_THICKNESS - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
const STONE_NAMES = ['stone-whole', 'stone-half', 'stone-quarter'] as const

/** A stone's squash, rock and pop this frame, before its neighbours hold them back. */
export type StoneMotion = { stone: StoneState; amount: number; rock: number; pop: number }

const turned = new THREE.Quaternion()
const along = new THREE.Vector3()

/** How far (cm) a drawn piece reaches below its origin (`sign` -1) or above it (1) when turned by `turn`. */
function reachUpright(q: Quarters, turn: THREE.Quaternion, sign: 1 | -1): number {
  along.set(0, sign, 0).applyQuaternion(turned.copy(turn).invert())
  return stoneReachAlong(q, along.x, along.y, along.z)
}

/** The drawn turn of a stone: its body's, rocked by `rock` about an axis of its own. */
function stoneTurn(stone: StoneState, rock: number, out: THREE.Quaternion): THREE.Quaternion {
  rockAxis.set(Math.cos(stone.id * 2.39), 0, Math.sin(stone.id * 2.39))
  rockTurn.setFromAxisAngle(rockAxis, THREE.MathUtils.clamp(rock, -0.35, 0.35))
  return out.set(...stone.quaternion).premultiply(rockTurn)
}

/**
 * How far a stone's squash (`amount`), rock and pop move it from where its
 * body lies: they turn and scale it about its middle, and it is lifted so its
 * lowest point stays where the body's is. Returns the lift, and how far past
 * its reach it may now stick out from its body's origin (cm).
 */
function stoneStretch(stone: StoneState, amount: number, rock: number, pop: number): { lift: number; out: number } {
  if (amount === 0 && rock === 0 && pop === 1) return { lift: 0, out: 0 }
  const below = reachUpright(stone.q, stoneTurn(stone, rock, scratch.q), -1) * (1 - amount) * pop
  const lift = below - reachUpright(stone.q, scratch.q.set(...stone.quaternion), -1)
  const grow = Math.max(0, (1 + Math.abs(amount) * 0.6) * pop - 1, (1 - amount) * pop - 1)
  return { lift, out: stoneReachOf(stone.q) * grow + Math.abs(lift) }
}

/**
 * How much of a stone's squash, rock and pop it keeps (0 to 1) so it never
 * swells into a stone beside it. A still stone lying wholly below it cannot
 * be reached: everything turns and scales about the stone's lowest point,
 * which stays put.
 */
export function stoneRoom(motion: StoneMotion, motions: readonly StoneMotion[]): number {
  const { stone } = motion
  const moving = (m: StoneMotion) => m.amount !== 0 || m.rock !== 0 || m.pop !== 1
  const full = stoneStretch(stone, motion.amount, motion.rock, motion.pop).out
  if (full === 0) return 1
  const reach = stoneReachOf(stone.q)
  const bottom = stone.position.y - reachUpright(stone.q, scratch.q.set(...stone.quaternion), -1)
  let room = Infinity
  for (const other of motions) {
    if (other === motion) continue
    const p = other.stone.position
    const gap = Math.hypot(p.x - stone.position.x, p.y - stone.position.y, p.z - stone.position.z) - reach - stoneReachOf(other.stone.q)
    if (gap >= full) continue
    const still = !moving(other)
    if (still && p.y + reachUpright(other.stone.q, scratch.q.set(...other.stone.quaternion), 1) <= bottom) continue
    room = Math.min(room, still ? gap : gap / 2)
  }
  if (room >= full) return 1
  let keep = Math.max(0, room / full)
  while (keep > 0.01 && stoneStretch(stone, motion.amount * keep, motion.rock * keep, 1 + (motion.pop - 1) * keep).out > room) keep *= 0.7
  return keep > 0.01 ? keep : 0
}

const shapeScale = new THREE.Matrix4()
const squashScale = new THREE.Matrix4()
const stoneRotation = new THREE.Matrix4()
const stoneQuaternion = new THREE.Quaternion()

/** Where a stone is drawn: its body's pose, with `keep` of its squash, rock and pop. */
const stoneCovers = new Map<Quarters, Ball[]>()

/** A stone's cover (see `coverOf`), about its body's origin, as `stoneMatrix` draws it resting and unturned. */
export function stoneCover(q: Quarters): Ball[] {
  let cover = stoneCovers.get(q)
  if (!cover) {
    const r = stoneRadius3(4)
    cover = coverOf([{ vertices: stoneVertices(STONE_CUTS[q], STONE_SEGMENTS).map((v) => v * r), segments: STONE_SEGMENTS, rings: pebbleRings(STONE_SEGMENTS) }])
    stoneCovers.set(q, cover)
  }
  return cover
}

export function stoneMatrix(motion: StoneMotion, keep: number, out: THREE.Matrix4): THREE.Matrix4 {
  const { stone } = motion
  const amount = motion.amount * keep
  const rock = motion.rock * keep
  const pop = 1 + (motion.pop - 1) * keep
  const r = stoneRadius3(4) * pop
  const { lift } = stoneStretch(stone, amount, rock, pop)
  stoneRotation.makeRotationFromQuaternion(stoneTurn(stone, rock, stoneQuaternion))
  shapeScale.makeScale(r, r, r)
  squashScale.makeScale(1 + amount * 0.6, 1 - amount, 1 + amount * 0.6)
  return out.makeTranslation(stone.position.x, stone.position.y + lift, stone.position.z).multiply(squashScale).multiply(stoneRotation).multiply(shapeScale)
}

/** Stones in three instanced draws (whole, half, quarter): physics pose plus squash on landing and stretch on pickup. */
export function StonesModel({ read }: { read: () => StoneState[] }) {
  const { stones } = useClay()
  const meshes = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const squash = useRef(new Map<number, Squash>())
  const motions = useRef<StoneMotion[]>([])
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
    const moving = motions.current
    moving.length = 0
    for (const stone of list) {
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
      const pop = 1 + stone.pulse * 0.22 + stone.glow * 0.06
      moving.push({ stone, amount: Math.abs(amount) < 1e-4 ? 0 : amount, rock: Math.abs(rock) < 1e-4 ? 0 : rock, pop })
    }
    for (const motion of moving) {
      const { stone } = motion
      const slot = PIECE_SIZES.indexOf(stone.q)
      const instanced = meshes[slot].current
      if (!instanced || counts[slot] >= MAX_STONES) continue
      const i = counts[slot]++
      instanced.setMatrixAt(i, stoneMatrix(motion, stoneRoom(motion, moving), scratch.m))
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
        <instancedMesh key={slot} name={STONE_NAMES[slot]} ref={meshes[slot]} args={[geometry, stones, MAX_STONES]} frustumCulled={false} />
      ))}
    </>
  )
}

// --- blob shadows and glows ----------------------------------------------------

/** A blob shadow or glow; `cover` (cm) is how small it can shrink and still show past what casts it, when that rests on it. */
export type Blob = { at: Point; ground: number; radius: number; strength: number; stretch?: number; cover?: number }

const LIGHT_OFFSET = { x: 0.32, z: -0.12 }
/** Decals smaller than this (cm), or than their blob's `cover`, are not drawn: they would hide under what casts them. */
const DECAL_SMALLEST = 0.2
/** A lying stone hides a shadow or glow shrunk to under this much of its radius. */
export const STONE_COVER = 0.5
const decalAt: Point = { x: 0, y: 0 }

/**
 * Soft blob shadows and glow rings: the height above the ground widens and
 * fades a shadow. Each is a flat disc (its texture fades out at the disc's
 * edge) shrunk so it never reaches up into a rim or hem beside it.
 */
export function Overlays({ kind, read, surfaces, capacity }: { kind: 'shadow' | 'glow'; read: () => Blob[]; surfaces: () => Surfaces; capacity: number }) {
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
    const blobs = read()
    const under = surfaces()
    let count = 0
    for (const blob of blobs) {
      if (count === capacity) break
      const offset = kind === 'shadow' ? blob.stretch ?? 0 : 0
      decalAt.x = blob.at.x + (LIGHT_OFFSET.x * offset) / UNIT
      decalAt.y = blob.at.y + (LIGHT_OFFSET.z * offset) / UNIT
      const radius = decalReach(decalAt, blob.ground, under, blob.radius)
      if (radius < Math.max(DECAL_SMALLEST, blob.cover ?? 0)) continue
      const p = to3(decalAt, blob.ground + DECAL_LIFT)
      scratch.m.compose(scratch.p.set(p.x, p.y, p.z), scratch.q.setFromEuler(scratch.e.set(-Math.PI / 2, 0, 0)), scratch.s.set(radius * 2, radius * 2, 1))
      instanced.setMatrixAt(count, scratch.m)
      instanced.setColorAt(count, scratch.c.setRGB(Math.max(0, blob.strength), 0, 0))
      count++
    }
    instanced.count = count
    instanced.instanceMatrix.needsUpdate = true
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
  })
  const disc = useMemo(() => new THREE.CircleGeometry(0.5, 32), [])
  return <instancedMesh name={kind === 'shadow' ? 'shadow-decals' : 'glow-rings'} ref={mesh} args={[disc, kind === 'shadow' ? shadow : glow, capacity]} frustumCulled={false} renderOrder={kind === 'shadow' ? 1 : 3} />
}

// --- bag ---------------------------------------------------------------------

export type BagPose = { fullness: number; tipAge: number | null; shakeOut: boolean; peek: number | null; now: number }

export function bagGeometry(): THREE.BufferGeometry {
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
      // An empty bag is floppy: softer spring, longer wobble.
      const wobble = springStep(settle.current, 0, dt, 55 + pose.fullness * 45, 4 + pose.fullness * 4)
      const breathe = 1 + Math.sin(pose.now * 1.4) * 0.014
      const invite = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI * 6) * 0.1 * Math.sin(pose.peek * Math.PI)
      const shape = bagShape(pose.fullness, bagTip(pose.tipAge, pose.shakeOut), breathe)
      group.scale.set(...shape.scale)
      group.position.y = shape.y
      group.rotation.set(shape.roll + invite + wobble * 0.04, 0, shape.lie + wobble * 0.02)
    }
    if (peek.current) {
      const k = pose.peek === null ? 0 : Math.sin(pose.peek * Math.PI)
      peek.current.visible = k > 0.02
      peek.current.position.set(BAG_LENGTH * 1.05 + k * 3.4, 3.4 + k * 0.9, 0)
      peek.current.rotation.set(0.2, 0, -0.3 + k * 0.3)
    }
  })
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, BAG_HEADING, 0]}>
      <group ref={body} userData={{ jamObject: 'bag' }}>
        <mesh name="bag" geometry={geometry} material={clay} />
      </group>
      <mesh name="bag-peek-stone" ref={peek} geometry={pebble} material={stones} scale={stoneRadius3(4)} />
    </group>
  )
}

// --- scale -------------------------------------------------------------------

/** One ball of a held stone or part as the pan ropes see it: they are laid over it. */
export type RopeBall = { center: Vec3; radius: number }

/**
 * The beam's tilt, where the pans hang and how far they have swung on their
 * ropes (cm, as the physics holds them), and the held stones and parts the
 * ropes are laid over, each as the balls it fills.
 */
export type ScalePose = { angle: number; panY: [number, number]; panSway: [number, number]; held: readonly (readonly RopeBall[])[]; now: number }

/** The most straight pieces a rope is drawn in, laid over what is held in its way. */
const ROPE_PIECES = 8
/** The pan ropes and their knots are part of the scale they hang from (for the intersection audit). */
const ROPE_OBJECTS = Array.from({ length: 6 * ROPE_PIECES }, () => 'scale')
const KNOT_OBJECTS = Array.from({ length: 8 }, () => 'scale')

export const PIVOT_Y = 25
/** The balls on the beam's ends that the pan ropes hang from. */
export const BEAM_END_RADIUS = 2.1
/** The smooth ball the beam turns on, part of the beam: the post's column and knob meet it the same way at every tilt. */
export const HUB_RADIUS = 2.1
/** The knob on top of the pivot ball, high enough that the beam's own thickness clears it at full tilt. */
const KNOB = { y: PIVOT_Y + 3, radius: 1.1 }
/**
 * Clay knots the pan ropes are tied into, one under each beam end and one on
 * a pan's rim per rope, each pressed this far into what it hangs from or sits
 * on. A rope ends at a knot's middle, so it meets the knot the same way
 * however the beam tilts and the pan swings.
 */
/** How thick the pan ropes are drawn, as a scale on the unit coil. */
const ROPE_THICKNESS = 0.95

const PAN_ANGLES = [0.5, 0.5 + (Math.PI * 2) / 3, 0.5 + (Math.PI * 4) / 3]

/** Where a pan hangs: its centre, the knot under its beam end, and the knots its ropes are tied into on its rim. */
export function panHang(side: 0 | 1, angle: number, panY: number, sway: number): { center: THREE.Vector3; top: THREE.Vector3; rims: THREE.Vector3[] } {
  const post = to3(SCALE.post)
  const pan = SCALE.pans[side]
  const half = SCALE.beamHalf * UNIT
  const sign = side === 0 ? -1 : 1
  const at = to3(pan, panY)
  const center = new THREE.Vector3(at.x + sway, at.y, at.z)
  const hang = BEAM_END_RADIUS + ROPE_KNOT.radius - ROPE_KNOT.press
  const top = new THREE.Vector3(post.x + Math.cos(angle) * half * sign, PIVOT_Y - Math.sin(angle) * half * sign - hang, post.z)
  const reach = pan.r * UNIT * PAN_ROLL.radius
  const sit = PAN_ROLL.y + reach * PAN_ROLL.tube + ROPE_KNOT.radius - ROPE_KNOT.press
  const rims = PAN_ANGLES.map((a) => new THREE.Vector3(center.x + Math.cos(a) * reach, center.y + sit, center.z + Math.sin(a) * reach))
  return { center, top, rims }
}

/** How far a rope's drawing reaches from its line: the unit coil's widest twist, at the rope's thickness. */
export const ROPE_REACH = 0.5 * 1.28 * ROPE_THICKNESS
/** A rope passes this much farther than touching round a held ball. */
const ROPE_ROOM = 0.05

/** A held ball's slice through the plane a rope is laid in is drawn as a polygon of this many sides round it. */
const ROPE_SIDES = 8
/** A point in the plane a rope is laid in: along the straight rope from its top knot, and out from it. */
type Flat = [number, number]

/**
 * The way from (0, 0) to (length, 0) round every point on the far side of the
 * line between them (s > 0): the far side of the convex hull of them all,
 * which may reach past either end.
 */
function over(points: readonly Flat[], length: number): Flat[] {
  const [start, end]: Flat[] = [[0, 0], [length, 0]]
  const all = [start, end, ...points.filter((p) => p[1] > 0)].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const half = (list: readonly Flat[]) => {
    const hull: Flat[] = []
    for (const p of list) {
      while (hull.length >= 2) {
        const [o, a] = [hull[hull.length - 2], hull[hull.length - 1]]
        if ((a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]) > 0) break
        hull.pop()
      }
      hull.push(p)
    }
    return hull.slice(0, -1)
  }
  // Counter-clockwise from the rim knot round to the top knot is the way over them, backwards.
  const ring = [...half(all), ...half([...all].reverse())]
  const way: Flat[] = []
  for (let i = ring.indexOf(end), k = 0; k < ring.length; i = (i + 1) % ring.length, k++) {
    way.push(ring[i])
    if (ring[i] === start) return way.reverse()
  }
  return [start, end]
}

/**
 * How far above its rim knot's middle, and below its top knot's, a rope stays
 * between them: so it passes over the rolled rim and under the beam end clear.
 */
const ROPE_KNOT_CLEAR = ROPE_REACH + ROPE_ROOM - (ROPE_KNOT.radius - ROPE_KNOT.press)
/** The sides a rope is tried laid over a held thing, turned about its line from straight off the thing's middle: nearest first. */
const ROPE_TURNS = [0, 1, -1, 2, -2, 3, -3, 4].map((k) => (k * Math.PI) / 4)

/**
 * A way over the top of things cut to at most `most` pieces: again and again,
 * the piece whose two neighbours, run on along their lines to where they meet,
 * take in least room is left out for them. The way only ever moves outward,
 * so it still passes over everything. Null if it cannot be cut so.
 */
function fewer(way: readonly Flat[], most: number): Flat[] | null {
  const out = [...way]
  while (out.length - 1 > most) {
    let [best, least, meet]: [number, number, Flat | null] = [-1, Infinity, null]
    for (let i = 1; i + 2 < out.length; i++) {
      const [a, b, c, d] = [out[i - 1], out[i], out[i + 1], out[i + 2]]
      const [ux, uy, vx, vy, wx, wy] = [b[0] - a[0], b[1] - a[1], c[0] - d[0], c[1] - d[1], c[0] - b[0], c[1] - b[1]]
      const det = vx * uy - ux * vy
      if (Math.abs(det) < 1e-12) continue
      const [p, q] = [(vx * wy - vy * wx) / det, (ux * wy - uy * wx) / det]
      if (p < 0 || q < 0) continue
      const m: Flat = [b[0] + ux * p, b[1] + uy * p]
      const room = Math.abs((m[0] - b[0]) * wy - (m[1] - b[1]) * wx) / 2
      if (room < least) [best, least, meet] = [i, room, m]
    }
    if (!meet) return null
    out.splice(best, 2, meet)
  }
  return out
}

/** A held ball as a rope passes it: its middle, from the rope's top knot, and how far the rope's line keeps from it. */
type Clearance = { at: THREE.Vector3; room: number }

/**
 * The way a rope from `top` along `u` for `length` runs over `balls` on the
 * `n` side of its line: the shortest way from knot to knot, in the plane of
 * the rope and `n`, that passes every ball sliced by that plane (drawn as a
 * polygon round the slice) on that side, cut to ROPE_PIECES pieces (see
 * `fewer`). Null if it cannot be.
 */
function wayOver(top: THREE.Vector3, rim: THREE.Vector3, u: THREE.Vector3, length: number, n: THREE.Vector3, balls: readonly Clearance[]): THREE.Vector3[] | null {
  const m = new THREE.Vector3().crossVectors(u, n)
  const slices: Flat[] = []
  for (const { at, room } of balls) {
    const aside = at.dot(m)
    if (Math.abs(aside) >= room) continue
    const size = Math.sqrt(room * room - aside * aside) / Math.cos(Math.PI / ROPE_SIDES)
    const [t, s] = [at.dot(u), at.dot(n)]
    for (let k = 0; k < ROPE_SIDES; k++) slices.push([t + Math.cos(((k + 0.5) * Math.PI * 2) / ROPE_SIDES) * size, s + Math.sin(((k + 0.5) * Math.PI * 2) / ROPE_SIDES) * size])
  }
  const way = fewer(over(slices, length), ROPE_PIECES)
  if (!way) return null
  return way.map(([t, s], i) => (i === 0 ? top : i === way.length - 1 ? rim : top.clone().addScaledVector(u, t).addScaledVector(n, s)))
}

/**
 * The points a pan rope runs through from `top` to `rim`: straight, or, where
 * a held stone or part stands in its way, laid over every ball of what it cuts
 * (see `wayOver`): pushed straight off the middle of the thing it would cut
 * deepest, or, if that would take it past a knot's height, turned about its
 * line as little as keeps it between them. A ball reaching a knot is passed
 * only as far off as leaves the knot outside its slice.
 */
export function ropeRun(top: THREE.Vector3, rim: THREE.Vector3, held: readonly (readonly RopeBall[])[]): THREE.Vector3[] {
  const toRim = new THREE.Vector3().subVectors(rim, top)
  const length = toRim.length()
  const u = toRim.clone().divideScalar(length)
  const clearance = (ball: RopeBall): Clearance => {
    const at = new THREE.Vector3(ball.center.x, ball.center.y, ball.center.z).sub(top)
    const knot = Math.min(at.length(), at.distanceTo(toRim))
    return { at, room: Math.min(ball.radius + ROPE_REACH + ROPE_ROOM, (knot - ROPE_ROOM) * Math.cos(Math.PI / ROPE_SIDES)) }
  }
  const inWay: Clearance[] = []
  let deepest: Clearance[] | null = null
  let share = 1
  for (const balls of held) {
    const clear = balls.map(clearance).filter((ball) => ball.room > 0)
    let cut = 1
    for (const { at, room } of clear) cut = Math.min(cut, u.clone().multiplyScalar(THREE.MathUtils.clamp(at.dot(u), 0, length)).sub(at).length() / room)
    if (cut >= 1) continue
    inWay.push(...clear)
    if (cut < share) [deepest, share] = [clear, cut]
  }
  if (!deepest) return [top, rim]
  const off = new THREE.Vector3()
  for (const { at } of deepest) off.sub(at)
  off.divideScalar(deepest.length)
  off.addScaledVector(u, -off.dot(u))
  if (off.lengthSq() < 1e-8) off.copy(UP).addScaledVector(u, -UP.dot(u))
  off.normalize()
  const [low, high] = [rim.y + ROPE_KNOT_CLEAR, top.y - ROPE_KNOT_CLEAR]
  let first: THREE.Vector3[] | null = null
  for (const turn of ROPE_TURNS) {
    const way = wayOver(top, rim, u, length, off.clone().applyAxisAngle(u, turn), inWay)
    if (!way) continue
    first ??= way
    if (way.every((p, i) => i === 0 || i === way.length - 1 || (p.y >= low && p.y <= high))) return way
  }
  return first ?? [top, rim]
}

/** A rope's instance matrix: the unit coil stretched from one knot's middle to another's. */
export function ropeMatrix(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Matrix4): THREE.Matrix4 {
  const dir = scratch.p2.subVectors(to, from)
  const length = dir.length()
  return out.compose(from, scratch.q.setFromUnitVectors(UP, dir.divideScalar(length)), scratch.s.set(ROPE_THICKNESS, length, ROPE_THICKNESS))
}

const UP = new THREE.Vector3(0, 1, 0)

/** How far the post is drawn above the table: clear of the contact shadow under it too, so its flat foot fights neither for the same depth. */
export const POST_LIFT = DECAL_LIFT * 2

export function postGeometry(): THREE.BufferGeometry {
  const turned = new THREE.LatheGeometry(
    [
      [0, 0],
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
      [0, 23.2],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    28,
  )
  return merge([
    // Its foot stays flat on the table while the rest is lumped.
    piece(turned, PALETTE.scaleWood, {}, { lump: 0.18, frequency: 0.5, seed: 2, hold: holdLathe([], [[0, 0], [7.4, 0]]) }),
    piece(geo.sphere(14), PALETTE.scaleWood, { position: [0, KNOB.y, 0], scale: KNOB.radius }, { ground: null }),
  ])
}

export function beamGeometry(half: number): THREE.BufferGeometry {
  const collars = [-0.72, -0.4, 0.4, 0.72].map((t) =>
    piece(geo.torus(20, 0.45), PALETTE.pan, { position: [t * half, 0, 0], rotation: [0, Math.PI / 2, 0], scale: 1.25 }, { lump: 0.06, ground: null }),
  )
  return merge([
    piece(geo.capsule(18), PALETTE.scaleWood, { rotation: [0, 0, Math.PI / 2], scale: [2.5, half, 2.5] }, { lump: 0.18, frequency: 0.7, ground: null }),
    piece(geo.sphere(20), PALETTE.scaleWood, { scale: HUB_RADIUS }, { ground: null }),
    piece(geo.sphere(18), PALETTE.scaleWood, { position: [-half, 0, 0], scale: BEAM_END_RADIUS }, { lump: 0.12, ground: null }),
    piece(geo.sphere(18), PALETTE.scaleWood, { position: [half, 0, 0], scale: BEAM_END_RADIUS }, { lump: 0.12, ground: null }),
    ...collars,
  ])
}

export function knotGeometry(): THREE.BufferGeometry {
  return merge([piece(geo.sphere(12), PALETTE.pan, { scale: ROPE_KNOT.radius }, { lump: 0.05, ground: null })])
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
    piece(geo.dish(PAN_SEGMENTS), PALETTE.pan, { scale: [radius, PAN_DEPTH, radius] }, { lump: 0.3, frequency: 0.35, seed: 5, ground: null, hold: holdLathe(DISH_PROFILE.slice(4)) }),
    piece(geo.torus(40, PAN_ROLL.tube), PALETTE.pan, { position: [0, PAN_ROLL.y, 0], rotation: [Math.PI / 2, 0, 0], scale: radius * PAN_ROLL.radius }, { lump: 0.04, frequency: 0.5, ground: null }),
  ])
}

export function ScaleModel({ read }: { read: () => ScalePose }) {
  const { clay } = useClay()
  const beam = useRef<THREE.Group>(null)
  const pans = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const chains = useRef<THREE.InstancedMesh>(null)
  const knots = useRef<THREE.InstancedMesh>(null)
  const post = to3(SCALE.post)
  const shapes = once('scale', scaleShapes)
  // The ropes are laid over held stones and parts as their covers: made now, not on the first hold.
  once('covers', () => [...PART_KINDS.map(partCover), ...([1, 2, 4] as const).map(stoneCover)])
  useFrame(() => {
    const pose = read()
    const angle = pose.angle + Math.sin(pose.now * 0.9) * 0.003
    if (beam.current) beam.current.rotation.z = -angle
    // Pans hang on ropes: when the beam moves they lag, then swing back and settle (see `stepSway`).
    let pieces = 0
    SCALE.pans.forEach((_, side) => {
      const hang = panHang(side as 0 | 1, angle, pose.panY[side], pose.panSway[side])
      pans[side].current?.position.copy(hang.center)
      knots.current?.setMatrixAt(side * 4, scratch.m.makeTranslation(hang.top))
      hang.rims.forEach((rim, k) => {
        const run = ropeRun(hang.top, rim, pose.held)
        for (let i = 0; i + 1 < run.length; i++) chains.current?.setMatrixAt(pieces++, ropeMatrix(run[i], run[i + 1], scratch.m))
        knots.current?.setMatrixAt(side * 4 + 1 + k, scratch.m.makeTranslation(rim))
      })
    })
    if (chains.current) {
      chains.current.count = pieces
      chains.current.instanceMatrix.needsUpdate = true
    }
    if (knots.current) knots.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group userData={{ jamObject: 'scale' }}>
      <mesh name="scale-post" geometry={shapes.post} material={clay} position={[post.x, POST_LIFT, post.z]} />
      <group ref={beam} position={[post.x, PIVOT_Y, post.z]}>
        <mesh name="scale-beam" geometry={shapes.beam} material={clay} />
      </group>
      {shapes.pans.map((geometry, side) => (
        <mesh key={side} name={side === 0 ? 'scale-pan-left' : 'scale-pan-right'} ref={pans[side]} geometry={geometry} material={clay} />
      ))}
      <instancedMesh name="scale-ropes" ref={chains} args={[shapes.chain, clay, 6 * ROPE_PIECES]} frustumCulled={false} userData={{ jamInstanceObjects: ROPE_OBJECTS }} />
      <instancedMesh name="scale-knots" ref={knots} args={[shapes.knot, clay, 8]} frustumCulled={false} userData={{ jamInstanceObjects: KNOT_OBJECTS }} />
    </group>
  )
}

// --- Fair Feeding --------------------------------------------------------------

/** A rolled clay rope along the rug's scalloped elliptical hem, around the rug's centre. */
function hemRope(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < HEM_POINTS; i++) {
    const at = hemAt(i / HEM_POINTS)
    points.push(new THREE.Vector3((at.x - RUG.center.x) * UNIT, 0, (at.y - RUG.center.y) * UNIT))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 240, RUG_HEM.tube, 8, true)
}

/** Keep a lathe's named profile points (radius, height) true while the rest of it is lumped. */
function holdLathe(fixed: readonly (readonly [number, number])[], level: readonly (readonly [number, number])[] = []): Hold {
  const on = (points: readonly (readonly [number, number])[], x: number, y: number, z: number) =>
    points.some(([r, h]) => Math.abs(Math.hypot(x, z) - r) < 1e-4 && Math.abs(y - h) < 1e-4)
  return (x, y, z) => (on(fixed, x, y, z) ? 'fixed' : on(level, x, y, z) ? 'level' : null)
}

export function feedingShapes() {
  return {
    rug: geo.cloth(40),
    bowl: merge([
      piece(geo.bowl(48), PALETTE.bowl, { scale: BOWL_SCALE }, { lump: BOWL_LUMP, frequency: 0.4, seed: 8, occlusion: 0.42, hold: holdLathe(BOWL_PROFILE.slice(8), BOWL_PROFILE.slice(0, 3)) }),
    ]),
    plate: merge([
      piece(geo.plate(36), PALETTE.plate, { scale: [FEEDING.plateRadius * UNIT, PLATE_HEIGHT, FEEDING.plateRadius * UNIT] }, { lump: PLATE_LUMP, frequency: 0.5, seed: 3, occlusion: 0.15, hold: holdLathe(PLATE_PROFILE.slice(4), PLATE_PROFILE.slice(0, 2)) }),
    ]),
    stool: merge([
      paint(geo.fromGrid(stoolCushion(), STOOL.cushion.segments, STOOL.cushion.rings), PALETTE.stool, -STOOL_LIFT),
      paint(geo.fromGrid(stoolButton(), STOOL.button.segments, STOOL.button.rings), '#c79a45', null),
      paint(geo.fromRing(stoolRim(), STOOL.rim.tube, STOOL.rim.radial, STOOL.rim.tubular), '#c79a45', null),
    ]).translate(0, STOOL_LIFT, 0),
    rugRope: merge([piece(hemRope(), '#d8c39c', { position: [0, RUG_HEM_Y, 0], scale: [1, RUG_HEM.flatten, 1] }, { lump: 2 * RUG_HEM.lump, frequency: 0.5, ground: null })]),
  }
}

export function FeedingSetting({ seats, showStools, readBowl }: { seats: readonly boolean[]; showStools: boolean; readBowl: () => { dingAt: number | null; now: number } }) {
  const { clay, rug } = useClay()
  const center = to3(RUG.center)
  const bowl = to3(FEEDING.bowl)
  const shapes = once('feeding', feedingShapes)
  const plates = useRef<THREE.InstancedMesh>(null)
  const stools = useRef<THREE.InstancedMesh>(null)
  const bowlMesh = useRef<THREE.Mesh>(null)
  const seatKey = seats.map(Number).join('')
  const reveal = useRef<{ at: number | null; shown: boolean }>({ at: null, shown: showStools })
  const placeStools = (scale: number) => {
    let stoolCount = 0
    FEEDING.seats.forEach((seat, index) => {
      if (seats[index] || !showStools) return
      const p = to3(seat.guest)
      scratch.m.makeTranslation(p.x, feedingFloor(seat.guest, STOOL_REACH), p.z).multiply(scratch.m2.makeScale(scale, scale, scale))
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
      const p = to3(seat.plate, ON_RUG)
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
    const ding = readBowl()
    const age = ding.dingAt === null ? Infinity : ding.now - ding.dingAt
    if (bowlMesh.current) {
      const wobble = age < 1.4 ? Math.sin(age * 22) * 0.07 * Math.exp(-age * 3) : 0
      bowlMesh.current.rotation.set(wobble * 0.6, 0, wobble)
      // It rocks on the edge of its flat base, which stays on the rug.
      bowlMesh.current.position.y = ON_RUG + BOWL_PROFILE[1][0] * BOWL_SCALE * Math.sin(Math.hypot(wobble * 0.6, wobble))
    }
    const at = reveal.current.at
    if (at === null) return
    const k = Math.min(1, (performance.now() - at) / 650)
    placeStools(Math.max(0.01, easeOutBack(k)))
    if (k >= 1) reveal.current.at = null
  })
  return (
    <group>
      <group userData={{ jamObject: 'rug' }} position={[center.x, 0, center.z]}>
        <mesh name="rug" geometry={shapes.rug} material={rug} position={[0, RUG.bottom, 0]} scale={[RUG.rx * UNIT, (RUG.top - RUG.bottom) / 0.02, RUG.rz * UNIT]} />
        <mesh name="rug-rope" geometry={shapes.rugRope} material={clay} />
      </group>
      <mesh name="bowl" ref={bowlMesh} geometry={shapes.bowl} material={clay} position={[bowl.x, ON_RUG, bowl.z]} />
      <instancedMesh name="plates" ref={plates} args={[shapes.plate, clay, 5]} frustumCulled={false} />
      <instancedMesh name="stools" ref={stools} args={[shapes.stool, clay, 5]} frustumCulled={false} />
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

export function scaleShapes() {
  return {
    post: postGeometry(),
    beam: beamGeometry(SCALE.beamHalf * UNIT),
    pans: SCALE.pans.map((pan) => panGeometry(pan.r * UNIT)),
    chain: coilGeometry(),
    knot: knotGeometry(),
  }
}

/**
 * Everything a child can bring out later, built one small piece at a time
 * after load (WebKit has no requestIdleCallback, so each task gets its own
 * timer slot), then its shaders are compiled against the live scene's
 * lights. Opening an activity for the first time then costs no long frame.
 */
const WARMUP: readonly (() => unknown)[] = [
  () => once('bag', bagGeometry),
  () => once('feeding', feedingShapes),
  ...(['rabbit', 'bear', 'hedgehog'] as const).map((species) => () => speciesShapes(species)),
  () => once('scale', scaleShapes),
  ...PART_KINDS.map((kind) => () => jarShapes(kind)),
  ...PART_KINDS.map((kind) => () => partShapes(kind)),
  () => once('house', houseGeometry),
  () => once('door-leaf', doorLeafGeometry),
  () => once('mouse', mouseGeometry),
  () => once('knife', knifeGeometry),
]
const WARMUP_START_MS = 400
const WARMUP_GAP_MS = 60

/** One object per material and variant the activities draw, for compiling their shaders against the real scene's lights. */
function warmupScene(materials: ClayMaterials): THREE.Scene {
  const scene = new THREE.Scene()
  const rabbit = speciesShapes('rabbit')
  const hedgehog = speciesShapes('hedgehog')
  const feeding = once('feeding', feedingShapes)
  const objects: THREE.Object3D[] = [
    new THREE.Mesh(feeding.bowl, materials.clay),
    new THREE.InstancedMesh(feeding.plate, materials.clay, 1),
    new THREE.Mesh(feeding.rug, materials.rug),
    new THREE.InstancedMesh(once('mouse', mouseGeometry), materials.clay, 1),
  ]
  if (rabbit.furBody) objects.push(new THREE.InstancedMesh(rabbit.furBody, materials.fur, 1))
  if (hedgehog.quill) {
    const quills = new THREE.InstancedMesh(hedgehog.quill, materials.quill, 1)
    quills.setColorAt(0, new THREE.Color('#ffffff'))
    objects.push(quills)
  }
  for (const object of objects) {
    object.frustumCulled = false
    scene.add(object)
  }
  return scene
}

/**
 * Compile for the screen (the tiers without a post pass) and for an offscreen target (the post pass renders the
 * scene into one, and three.js builds a different variant there: no tone mapping, linear output).
 */
function compileBothWays(gl: THREE.WebGLRenderer, warm: THREE.Scene, camera: THREE.Camera, scene: THREE.Scene): void {
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(null)
  void gl.compileAsync(warm, camera, scene).catch(() => {})
  const target = new THREE.WebGLRenderTarget(1, 1)
  gl.setRenderTarget(target)
  void gl
    .compileAsync(warm, camera, scene)
    .catch(() => {})
    .finally(() => target.dispose())
  gl.setRenderTarget(previous)
}

/**
 * Draw the warm-up objects once inside the live scene, into a 1x1 target like the post pass's (half float, no
 * multisampling): WebKit finishes a shader's GPU pipeline only at its first real draw, which a compile cannot reach.
 */
function drawOnce(gl: THREE.WebGLRenderer, warm: THREE.Scene, camera: THREE.Camera, scene: THREE.Scene): void {
  const group = new THREE.Group()
  group.add(...warm.children)
  scene.add(group)
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  gl.render(scene, camera)
  gl.setRenderTarget(previous)
  scene.remove(group)
  target.dispose()
}

function useWarmup(materials: ClayMaterials): void {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    let next = 0
    let timer = setTimeout(function step() {
      const task = WARMUP[next++]
      if (task) {
        task()
        timer = setTimeout(step, WARMUP_GAP_MS)
      } else {
        const warm = warmupScene(materials)
        compileBothWays(gl, warm, camera, scene)
        timer = setTimeout(() => drawOnce(gl, warm, camera, scene), WARMUP_GAP_MS)
      }
    }, WARMUP_START_MS)
    return () => clearTimeout(timer)
  }, [gl, camera, scene, materials])
}

/** How high a guest being dragged is lifted: clear of the bowl, the plates and the stones on them. */
const GUEST_CARRY = BOWL_PROFILE.reduce((top, [, h]) => Math.max(top, h), 0) * BOWL_SCALE + ON_RUG + 1

export function easeOutBack(t: number): number {
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
export function Guest({ seat, at, carried, read }: { seat: number; at: Point; carried: boolean; read: () => GuestPose }) {
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
  const cheeks = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const ears = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const arms = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const springs = useRef({ yaw: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, carry: { x: 0, v: 0 } })
  const yaw = guestYaw(seat)
  const p = to3(at)
  const floor = useMemo(() => guestFloor(seat, at), [seat, at])

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

    const carry = springStep(s.carry, carried ? GUEST_CARRY : 0, dt, 160, 18)
    if (root.current && head.current && nose.current) {
      const rig = { root: root.current, head: head.current, nose: nose.current, cheeks: cheeks.map((ref) => ref.current), ears: ears.map((ref) => ref.current), arms: arms.map((ref) => ref.current) }
      poseGuest(rig, shapes, m, { yaw: s.yaw.x, pitch: s.pitch.x }, pop)
      root.current.position.y = 0
      root.current.updateMatrix()
      // It rocks and leans on its lowest point, which stays on the highest thing under it.
      root.current.position.y = floor + soleDepth(shapes.sole, root.current.matrix) + Math.max(0, m.lift, carry)
    }
    if (eyes.current) eyes.current.scale.set(1 + Math.max(0, m.eyes - 1) * 0.5, m.eyes, 1)
    if (mouth.current) mouth.current.scale.set(personality.mouthWidth * (1 + m.mouth * 0.35), 1 + m.mouth * 3.4, 1 + m.mouth * 0.5)
    for (const ref of quillParts) if (ref.current) ref.current.scale.setScalar(1 + m.quills * 0.22)
  })

  return (
    <group position={[p.x, 0, p.z]} rotation={[0, yaw, 0]} userData={{ jamObject: `guest-${species}-${seat}` }}>
      <group ref={root}>
        <mesh name="guest-body" geometry={shapes.body} material={clay} />
        {shapes.furBody && <instancedMesh name="guest-fur-body" ref={furParts[0]} args={[shapes.furBody, fur, MAX_SHELLS]} frustumCulled={false} />}
        {shapes.quill && <instancedMesh name="guest-quills-body" ref={quillParts[0]} args={[shapes.quill, quill, shapes.quillsBody.length]} frustumCulled={false} />}
        {[-1, 1].map((side, i) => (
          <group key={side} ref={arms[i]} position={[side * ARM_AT[0], ARM_AT[1], ARM_AT[2]]}>
            <mesh name={side < 0 ? 'guest-arm-left' : 'guest-arm-right'} geometry={shapes.arm} material={clay} />
          </group>
        ))}
        <group ref={head} position={[0, NECK_Y, 0]}>
          <mesh name="guest-head" geometry={shapes.head} material={clay} />
          {shapes.furHead && <instancedMesh name="guest-fur-head" ref={furParts[1]} args={[shapes.furHead, fur, MAX_SHELLS]} frustumCulled={false} />}
          {shapes.quill && <instancedMesh name="guest-quills-head" ref={quillParts[1]} args={[shapes.quill, quill, shapes.quillsHead.length]} frustumCulled={false} />}
          <mesh name="guest-eyes" ref={eyes} geometry={shapes.eyes} material={clay} position={[0, 3.7, 0]} />
          <mesh name="guest-mouth" ref={mouth} geometry={shapes.mouth} material={clay} position={[0, 1.65, species === 'hedgehog' ? 4.9 : 3.85]} />
          <mesh name="guest-nose" ref={nose} geometry={shapes.nose} material={clay} position={shapes.noseAt} />
          {cheeks.map((ref, i) => (
            <mesh key={i} name={i === 0 ? 'guest-cheek-left' : 'guest-cheek-right'} ref={ref} geometry={shapes.cheek} material={clay} position={[(i === 0 ? -1 : 1) * CHEEK_AT[0], CHEEK_AT[1], CHEEK_AT[2]]} />
          ))}
          {shapes.ears?.map((geometry, i) => (
            <group key={i} ref={ears[i]} position={[(i === 0 ? -1 : 1) * EAR_AT[0], EAR_AT[1], EAR_AT[2]]}>
              <mesh name={i === 0 ? 'guest-ear-left' : 'guest-ear-right'} geometry={geometry} material={clay} />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

// --- knife, shelf, hand ---------------------------------------------------------

function knifeGeometry(): THREE.BufferGeometry {
  return merge([
    piece(geo.blade(), PALETTE.knifeBlade, { scale: 1.3 }, { lump: 0.05, ground: null }),
    piece(geo.capsule(16), PALETTE.knifeHandle, { position: [-3.2, 0.5, 0], rotation: [0, 0, Math.PI / 2], scale: [1.3, 2.2, 1.3] }, { lump: 0.1, ground: null }),
  ])
}

export function KnifeModel({ read }: { read: () => { at: Point; visible: boolean; held: boolean; now: number } }) {
  const { clay } = useClay()
  const ref = useRef<THREE.Group>(null)
  const geometry = once('knife', knifeGeometry)
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
      <mesh name="knife" geometry={geometry} material={clay} />
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
export const ALBUM_SCALE = 1.1

export function albumGeometry(): THREE.BufferGeometry {
  return merge([
    piece(geo.roundedBox(10, 0.15), '#3f7d8c', { position: [0, 1.2, 0], scale: [11, 2.4, 13] }, { lump: 0.12, frequency: 0.5, seed: 51 }),
    piece(geo.roundedBox(8, 0.1), '#fbf1de', { position: [0.5, 1.2, 0], scale: [10.2, 1.8, 12.4] }, { lump: 0.05, ground: null }),
    piece(geo.torus(16, 0.3), '#e0a13c', { position: [-5.3, 1.3, 3.5], rotation: [0, 0, Math.PI / 2], scale: 0.9 }, { ground: null }),
    piece(geo.torus(16, 0.3), '#e0a13c', { position: [-5.3, 1.3, -3.5], rotation: [0, 0, Math.PI / 2], scale: 0.9 }, { ground: null }),
  ])
}

export function AlbumModel({ read }: { read: () => { pages: readonly AlbumPage[]; at: number | null; now: number } }) {
  const { clay } = useClay()
  const book = once('album', albumGeometry)
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
    g.scale.setScalar(Math.max(0.01, easeOutBack(appear)) * ALBUM_SCALE)
    g.rotation.set(0, -0.35 + Math.sin(pose.now * 0.8) * 0.04, 0)
  })
  return (
    <group ref={group} visible={false} userData={{ jamObject: 'album' }}>
      <mesh name="album" geometry={book} material={clay} />
      <mesh name="album-cover" material={cover.material} position={[0.5, 2.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.6, 11.8]} />
      </mesh>
    </group>
  )
}

// --- loose parts and their jars ---------------------------------------------------

const PART_COLORS = {
  acorn: { nut: '#a8703d', cap: '#6e4a2c', stem: '#6e4a2c' },
  shell: { body: '#f4d3c0' },
  stick: { bark: '#7a5238', twig: '#8f6644' },
  boulder: { rock: '#8d8176' },
} as const satisfies { [K in PartKind]: Record<keyof (typeof PART_PIECES)[K], string> }
const SHELL_RIB = '#e3a98f'
const JAR_COLORS: Record<PartKind, string> = { acorn: '#d9a441', shell: '#5f9fb8', stick: '#5d8a5a', boulder: '#d8b36a' }
const JAR_LID = '#fbe7cf'
const NEST_BED = '#c9a45c'

/** A part at its drawn size, from the same vertices its collider is fitted to (partShape.ts). */
export function partGeometry(kind: PartKind): THREE.BufferGeometry {
  const pieces: Record<string, Lumped> = PART_PIECES[kind]
  const colors: Record<string, string> = PART_COLORS[kind]
  return merge(
    Object.entries(pieces).map(([name, p]) => {
      const g = paint(geo.fromGrid(partPieceVertices(kind, name), p.segments, p.rings), colors[name], null)
      if (kind === 'shell') ribbed(g, sphereGrid(p.segments, p.rings))
      return g
    }),
  )
}

/** A shell's pressed ribs take a deeper colour than its back. */
function ribbed(geometry: THREE.BufferGeometry, normals: Float32Array): void {
  const color = geometry.attributes.color
  const rib = new THREE.Color(SHELL_RIB)
  for (let i = 0; i < color.count; i++) {
    const k = shellRib(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2])
    color.setXYZ(i, THREE.MathUtils.lerp(color.getX(i), rib.r, k), THREE.MathUtils.lerp(color.getY(i), rib.g, k), THREE.MathUtils.lerp(color.getZ(i), rib.b, k))
  }
}

function jarGeometry(kind: PartKind): { body: THREE.BufferGeometry; lid: THREE.BufferGeometry | null } {
  const color = JAR_COLORS[kind]
  if (kind === 'boulder') {
    const { ring, bed } = NEST
    return {
      body: merge([paint(geo.fromRing(nestRing(), ring.tube, ring.radial, ring.tubular), color, -NEST_LIFT), paint(geo.fromGrid(nestBed(), bed.segments, bed.rings), NEST_BED, -NEST_LIFT)]),
      lid: null,
    }
  }
  const { body, neck, lid, label } = JAR
  const labelPiece = partGeometry(kind).applyMatrix4(
    new THREE.Matrix4().compose(new THREE.Vector3(...label.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...labelTurn(kind))), new THREE.Vector3().setScalar(label.scale / PART_DRAW_SCALE)),
  )
  return {
    body: merge([
      paint(geo.fromGrid(jarBody(), body.segments, body.rings), color, -JAR_LIFT),
      piece(geo.cylinder(20), color, { position: [0, neck.y, 0], scale: [neck.radius, neck.height, neck.radius] }, { lump: neck.lump, ground: null }),
      labelPiece,
    ]),
    lid: merge([
      piece(geo.cylinder(20), JAR_LID, { scale: [lid.radius, lid.height, lid.radius] }, { lump: lid.lump, ground: null }),
      piece(geo.sphere(24), JAR_LID, { position: [0, lid.height, 0], scale: lid.knob }, { ground: null }),
    ]),
  }
}

export type PartState = { id: number; kind: PartKind; position: Vec3; quaternion: [number, number, number, number]; held: boolean }

const partShapes = (kind: PartKind) => once(`part-${kind}`, () => partGeometry(kind))
const jarShapes = (kind: PartKind) => once(`jar-${kind}`, () => jarGeometry(kind))

/** Loose parts in one instanced draw per kind, posed from physics, lifted a little while held. */
export function PartsModel({ read }: { read: () => PartState[] }) {
  const { clay } = useClay()
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)]
  const geometries = PART_KINDS.map(partShapes)
  useFrame(() => {
    const counts = [0, 0, 0, 0]
    for (const part of read()) {
      const slot = PART_KINDS.indexOf(part.kind)
      const instanced = refs[slot].current
      if (!instanced) continue
      scratch.q.set(...part.quaternion)
      const grow = part.held ? 1.12 : 1
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
        <instancedMesh key={kind} name={`part-${kind}`} ref={refs[slot]} args={[geometries[slot], clay, PART_COUNTS[kind]]} frustumCulled={false} />
      ))}
    </>
  )
}

/** How much the nest squashes at the height of its wobble: tipped like a jar, its wide ring would dip into the table. */
const NEST_SQUASH = 0.06

/**
 * The jars on the scale mat's back row: each wobbles about where it stands
 * when tipped or when a part comes home, and once it is empty its lid stands
 * on edge against it. The nest squashes instead.
 */
export function JarsModel({ read }: { read: () => { tips: ReadonlyMap<PartKind, number>; full: Record<PartKind, number>; glow: number; now: number } }) {
  const { clay } = useClay()
  const shapes = PART_KINDS.map(jarShapes)
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const closedLids = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const openLids = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const openAt = useMemo(() => PART_KINDS.map((kind) => (kind === 'boulder' ? null : jarLidOpen(kind))), [])
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
      const w = THREE.MathUtils.clamp(springStep(wobble.current[i], 0, dt, 70, 5), -1, 1)
      const group = refs[i].current
      if (group) {
        const hop = pose.full[kind] > 0 ? pose.glow * Math.max(0, Math.sin(pose.now * 3 + i)) * 0.6 : 0
        if (kind === 'boulder') group.scale.set(1, 1 - Math.abs(w) * NEST_SQUASH, 1)
        else group.rotation.set(w * JAR_WOBBLE[0], w * JAR_WOBBLE[1], w * JAR_WOBBLE[2])
        group.position.y = hop
      }
      const open = pose.full[kind] === 0
      const closed = closedLids[i].current
      if (closed) {
        closed.visible = !open
        closed.position.y = JAR_LID_CLOSED + Math.abs(w) * 0.05
      }
      const lying = openLids[i].current
      if (lying) lying.visible = open
    })
  })
  return (
    <>
      {PART_KINDS.map((kind, i) => {
        const at = to3(JARS[kind])
        const lift = kind === 'boulder' ? NEST_LIFT : JAR_LIFT
        const lid = shapes[i].lid
        const leaning = openAt[i]
        return (
          <group key={kind} position={[at.x, 0, at.z]} scale={JAR_SCALE} userData={{ jamObject: `jar-${kind}` }}>
            <group ref={refs[i]}>
              <group position-y={lift}>
                <mesh name={kind === 'boulder' ? 'boulder-nest' : `jar-${kind}`} geometry={shapes[i].body} material={clay} />
                {lid && <mesh name={`jar-lid-${kind}`} ref={closedLids[i]} geometry={lid} material={clay} />}
              </group>
            </group>
            {lid && leaning && (
              <mesh name={`jar-lid-open-${kind}`} ref={openLids[i]} geometry={lid} material={clay} visible={false} position={[leaning.position[0], leaning.position[1] + lift, leaning.position[2]]} rotation={leaning.rotation} />
            )}
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

/** A merged shape raised so its lowest point, wherever its lumps put it, stands on y = 0. */
function standing(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const position = geometry.attributes.position
  let lowest = Infinity
  for (let i = 0; i < position.count; i++) lowest = Math.min(lowest, position.getY(i))
  return geometry.translate(0, -lowest, 0)
}

export function mouseGeometry(): THREE.BufferGeometry {
  const sphere = geo.sphere(16)
  return standing(merge([
    piece(sphere, MOUSE.fur, { position: [0, 1.4, 0], scale: [1.7, 1.45, 2.1] }, { lump: 0.12, seed: 31 }),
    piece(sphere, MOUSE.fur, { position: [0, 2.2, 1.9], scale: [1.15, 1.05, 1.25] }, { lump: 0.08, ground: null }),
    ...[-1, 1].flatMap((side) => [
      piece(sphere, MOUSE.fur, { position: [side * 0.95, 3.25, 1.5], scale: [0.72, 0.72, 0.25] }, { ground: null }),
      piece(sphere, MOUSE.ear, { position: [side * 0.95, 3.25, 1.6], scale: [0.48, 0.48, 0.18] }, { ground: null }),
      piece(sphere, MOUSE.eye, { position: [side * 0.45, 2.45, 2.95], scale: 0.24 }, { ground: null }),
    ]),
    piece(sphere, MOUSE.nose, { position: [0, 2.05, 3.15], scale: 0.22 }, { ground: null }),
    piece(geo.capsule(8), MOUSE.ear, { position: [0, 0.9, -2.6], rotation: [1.1, 0, 0], scale: [0.18, 1.6, 0.18] }, { ground: null }),
  ]))
}

export function houseGeometry(): THREE.BufferGeometry {
  return merge(houseParts(1, [0, 0, 0]))
}

/** The open door's angle: swung round flat against the front wall, not quite touching it. */
export const DOOR_OPEN = -Math.PI + 0.12
/** The farthest a knock can rattle the door round. */
export const DOOR_FARTHEST = -Math.PI + 0.1

export function doorLeafGeometry(): THREE.BufferGeometry {
  return standing(merge([piece(geo.roundedBox(8, 0.18), HOUSE.door, { position: [3.4, 4.8, 0], scale: [6.8, 9.6, 0.9] }, { lump: 0.1, ground: null }), piece(geo.sphere(10), HOUSE.frame, { position: [5.9, 4.8, 0.6], scale: 0.45 }, { ground: null })]))
}

/** How far round the door has swung at `now`: 0 shut, DOOR_OPEN open; it opens at `openAt` and shuts at `closeAt`, each over DOOR_SWING. */
export function doorSwing(openAt: number | null, closeAt: number | null, now: number): number {
  if (openAt === null) return 0
  const opening = THREE.MathUtils.smoothstep(now - openAt, 0, DOOR_SWING)
  return DOOR_OPEN * (closeAt === null ? opening : Math.min(opening, 1 - THREE.MathUtils.smoothstep(now - closeAt, 0, DOOR_SWING)))
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

/** How much bigger than their model the mice are drawn; a drawn visitor must still reach no farther than VISITOR_REACH. */
export const MOUSE_SCALE = 2.2

/**
 * The Knock-Knock house. Knocks shake the door; the house's answer shakes it
 * from inside; then it swings open and visitors hop out to their spots in the
 * yard and wiggle there, hopping when poked. While nobody is out, a face
 * peeks from the lit window.
 */
export function DoorModel({ read }: { read: () => DoorPose }) {
  const { clay } = useClay()
  const house = once('house', houseGeometry)
  const doorLeaf = once('door-leaf', doorLeafGeometry)
  const mouse = once('mouse', mouseGeometry)
  const leaf = useRef<THREE.Group>(null)
  const face = useRef<THREE.Mesh>(null)
  const mice = useRef<THREE.InstancedMesh>(null)
  const rattle = useRef<Spring>({ x: 0, v: 0 })
  const lastKnock = useRef<number | null>(null)
  const p = to3(DOOR.house)
  useFrame((_, dt) => {
    const pose = read()
    const now = pose.now
    // Knocks and the house's answer only ever rattle the door outwards, so it never swings into its frame.
    if (pose.knockAt !== null && pose.knockAt !== lastKnock.current) {
      rattle.current.v -= 3
      lastKnock.current = pose.knockAt
    }
    const answering = pose.answerTimes.some((t) => now >= t && now - t < 0.05)
    if (answering) rattle.current.v -= 2.4
    springStep(rattle.current, 0, dt, 60, 8)
    if (rattle.current.x > 0) rattle.current.x = rattle.current.v = 0
    if (leaf.current) leaf.current.rotation.y = Math.max(DOOR_FARTHEST, doorSwing(pose.openAt, pose.closeAt, now) + rattle.current.x)
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
      const at = visitorPose(visitor, count, now)
      if (!at) continue
      const s = MOUSE_SCALE * at.grow
      scratch.q.setFromEuler(scratch.e.set(0, at.facing, 0))
      scratch.m.compose(scratch.p.set(at.x, at.y, at.z), scratch.q, scratch.s.set(s, s * at.squash, s))
      instanced.setMatrixAt(count++, scratch.m)
    }
    instanced.count = count
    instanced.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <group position={[p.x, 0, p.z]} scale={DOOR.houseScale} userData={{ jamObject: 'house' }}>
        <mesh name="house" geometry={house} material={clay} />
        <group ref={leaf} position={DOOR_HINGE}>
          <mesh name="house-door" geometry={doorLeaf} material={clay} />
        </group>
        <mesh name="window-mouse" ref={face} geometry={mouse} material={clay} scale={0.9} visible={false} />
      </group>
      <instancedMesh name="visitor-mice" ref={mice} args={[mouse, clay, 10]} frustumCulled={false} />
    </group>
  )
}

export type CarrierMouse = { x: number; z: number; heading: number; hop: number }

/** The hidden-delight mice that scurry a fallen stone back to the bag, nudging it along from behind. */
export function CarrierMice({ read }: { read: () => CarrierMouse[] }) {
  const { clay } = useClay()
  const mouse = once('mouse', mouseGeometry)
  const mice = useRef<THREE.InstancedMesh>(null)
  useFrame(() => {
    const instanced = mice.current
    if (!instanced) return
    let count = 0
    for (const carrier of read().slice(0, 2)) {
      scratch.q.setFromEuler(scratch.e.set(0.12 * carrier.hop, carrier.heading, 0))
      scratch.m.compose(scratch.p.set(carrier.x, carrier.hop * 1.6, carrier.z), scratch.q, scratch.s.set(MOUSE_SCALE, MOUSE_SCALE, MOUSE_SCALE))
      instanced.setMatrixAt(count++, scratch.m)
    }
    instanced.count = count
    instanced.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh name="carrier-mice" ref={mice} args={[mouse, clay, 2]} frustumCulled={false} />
}

/** A big clay token for an activity: a cushion to sit on, with a small model of the activity on top. */
export function chooserGeometry(mat: MatKey): THREE.BufferGeometry {
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

export const CHOOSER_SCALE = 1.2

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
          <mesh name={`chooser-${mat}`} geometry={tokens[i]} material={clay} />
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

/** How far the ghost stone reaches below its middle, and out from it. */
export const GHOST_BELOW = stoneReachAlong(4, 0, -1, 0)
export const GHOST_REACH = stoneReachOf(4)

/**
 * A big friendly cartoon hand, always facing the camera, fingertip on the
 * target; carries a ghost stone for drags, lying on `floor` (cm): the stone
 * it is lifted from, or what it is carried over.
 */
export function GhostHand({ read, carry, floor }: { read: () => { at: Point; press: number; opacity: number } | null; carry: () => boolean; floor: (at: Point) => number }) {
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
      if (stone.current.visible) stone.current.position.set(p.x, Math.max(1.4, p.y - 0.4, floor(pose.at) + GHOST_BELOW), p.z)
      ghost.opacity = pose.opacity * 0.65
    }
  })
  return (
    <>
      <mesh name="ghost-stone" ref={stone} geometry={pebble} material={ghost} scale={stoneRadius3(4)} renderOrder={9} />
      <sprite name="ghost-hand" ref={sprite} material={material} center={[0.5, 0.02]} scale={[15, 18.75, 1]} renderOrder={10} />
    </>
  )
}
