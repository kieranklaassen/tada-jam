import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from 'three'
import { BEE_SCALE, type Bee } from '../bee'
import type { SeedBody } from '../controller'
import type { Mouse, Snail } from '../critters'
import { PETALS, type Flower } from '../flowers'
import { BURROW, BURROW_STAND, groundTilt, groundY, POUCH, POUCH_LEAN, SEED_RADIUS, type PouchPose, type Tuft } from '../layout'
import { smoothstep } from '../math'
import { SNAIL_SHELL, TAIL_ROOT } from './geometry'

// Where the moving parts of a flower head, the bee, the two critters, the seeds, and the pouch sit,
// as plain functions of the controller's state. The view draws with them, and
// the tests pose the real meshes with them to check nothing passes through.

/** The right wing's root, on the surface of the bee's shoulder in its own units; the left wing mirrors it. */
export const WING_ROOT = { x: 1.25, y: 2.75, z: 0.3 }

const E = new Euler()
const Q = new Quaternion()
const V = new Vector3()
const S = new Vector3()
const PETAL = new Matrix4()
const BASE = new Matrix4().makeTranslation(1.05, 0, 0)
const LEAN = { x: 0, z: 0 }

/** The flower head's matrix (centre and petal frame) over a stem based at (bx, bz), written into `out`. */
export function flowerHeadMatrix(flower: Flower, head: { x: number; y: number; z: number }, bx: number, bz: number, out: Matrix4): Matrix4 {
  const bud = Math.max(0, flower.bud.x) * flower.pluckKeep()
  const squeeze = flower.budSqueeze
  const lean = flower.lean(head, bx, bz, LEAN)
  E.set(lean.x, flower.plot * 0.7, lean.z)
  Q.setFromEuler(E)
  const scale = Math.max(0.001, bud)
  return out.compose(V.set(head.x, head.y, head.z), Q, S.set(scale * (1 - squeeze * 0.14), scale * (1 + squeeze * 0.16), scale * (1 - squeeze * 0.14)))
}

/** Petal `i` of a head posed by `headMatrix`, written into `out`. */
export function petalMatrix(flower: Flower, i: number, headMatrix: Matrix4, out: Matrix4): Matrix4 {
  const open = flower.petals[i].x * (1 - flower.pluckClose())
  const lift = (Math.PI / 2 - 0.18) * (1 - Math.min(1, open)) + 0.14 - Math.max(0, open - 1) * 0.9
  E.set(0, (i / PETALS) * Math.PI * 2, lift)
  Q.setFromEuler(E)
  const scale = 0.62 + 0.38 * Math.min(1, Math.max(0, open))
  PETAL.compose(V.set(0, 0.25, 0), Q, S.set(scale, 1, scale))
  PETAL.premultiply(headMatrix)
  return out.multiplyMatrices(PETAL, BASE)
}

/** The bee as a whole: where it is, how it is turned (yaw, then pitch, then roll), and its squash, applied to `root`. */
export function poseBee(bee: Bee, root: Object3D): void {
  root.position.set(bee.x, bee.y, bee.z)
  root.rotation.set(bee.pitch, bee.yaw, bee.roll, 'YXZ')
  const s = bee.squash
  root.scale.set(BEE_SCALE * (1 + s * 0.45), BEE_SCALE * (1 - s), BEE_SCALE * (1 + s * 0.45))
}

/** The bee's head turn inside its body: a nod while sipping and an idle look about. */
export function beeHeadTurn(bee: Bee, out: Euler): Euler {
  return out.set(bee.headDip * 0.5 - 0.05, Math.sin(bee.t * 0.7) * 0.12, Math.sin(bee.t * 1.3) * 0.1)
}

/**
 * The lowest a wing beats (radians about its root), 0..1 folded: a folded wing lies back over the rounder middle of
 * the body, so it stays higher.
 */
function lowestBeat(fold: number): number {
  return -0.3 + 0.25 * fold
}

/**
 * Behind a giggle the wings stand up in front of the face, shrunk a little, like two hands over the mouth: each
 * covers half of it and their tips just meet in the middle, clear of the face, the eyes, and the smile.
 */
const COVER_ROOT = { x: 3.78, y: -0.76, z: 7.5 }
const COVER_TURN = { x: -Math.PI / 2, y: 0.4, z: Math.PI }
const COVER_SIZE = 0.62
/** The middle of a wing from its root, in its own units. */
const WING_MIDDLE = { x: 2.9, y: 0, z: -0.5 }
const MIDDLE = new Vector3()

/**
 * Wing `side` (1 right, -1 left): its root, rotation, and size in the bee's own units, written into the three.
 * A giggle snaps the wings to the mouth (and back): each shrinks into its own middle at the shoulder and grows again
 * in front of the face, so no wing ever sweeps through the head on the way.
 */
export function wingPose(bee: Bee, side: number, position: Vector3, rotation: Euler, scale: Vector3): void {
  const cover = bee.wingCover
  let size: number
  if (cover >= 0.5) {
    size = Math.max(0.001, COVER_SIZE * (2 * cover - 1))
    position.set(side * COVER_ROOT.x, COVER_ROOT.y, COVER_ROOT.z)
    rotation.set(COVER_TURN.x, side * COVER_TURN.y, side * COVER_TURN.z)
    MIDDLE.set(side * WING_MIDDLE.x, WING_MIDDLE.y, WING_MIDDLE.z).multiplyScalar(COVER_SIZE - size)
  } else {
    const spread = bee.wingSpread
    const fold = Math.min(1, Math.max(0, (1 - spread) / 0.55))
    const beat = Math.max(0.32 + Math.sin(bee.wingPhase) * 0.6 * spread, lowestBeat(fold))
    size = Math.max(0.001, 1 - 2 * cover)
    position.set(side * WING_ROOT.x, WING_ROOT.y, WING_ROOT.z)
    rotation.set(-0.15 * (1 - fold), side * (1 - spread) * 1.15, side * beat)
    MIDDLE.set(side * WING_MIDDLE.x, WING_MIDDLE.y, WING_MIDDLE.z).multiplyScalar(1 - size)
  }
  position.add(MIDDLE.applyEuler(rotation))
  scale.set(side * size, size, size)
}

/** The mouse is the smallest character; a size up keeps it readable beside the molehills. */
export const MOUSE_SCALE = 1.2
/**
 * The middle of the mouse seen end on, over its feet in its own units (halfway from its belly to its ear tips): it
 * dives and comes out turning about here, so this runs down the middle of the shaft.
 */
const MOUSE_AXIS = 2.8
/** Rearing pivots about the back of its haunches, in its own units. */
export const REAR_PIVOT = -2.4
const REAR = 0.95
/**
 * A dive in and a climb out, as `q` runs 0 (on its feet at the stand spot) to 1 (down the shaft): it hops over the
 * soil ring to the hole's middle by `travel`, `hop` high at the top, and drops `drop` down the shaft from `fall` on,
 * standing straight up by `fall + plunge`. On the way it tips no further than keeps the end it leads with (its
 * nose going in, `head` from its middle; its tail coming out, `tail`) within `clear` of the hole's middle.
 * Coming out runs the same path backward, nose up.
 */
export const DIVE_PATH = { travel: 0.6, hop: 2.6, fall: 0.45, plunge: 0.15, drop: 12, clear: 1.7, head: 8.1, tail: 9.7 }
/** Beside its hole and on its feet, the mouse holds its tail up this much (radians), clear of the soil ring. */
export const TAIL_UP = { near: 0.5, lift: 0.4 }
const TILT = { pitch: 0, roll: 0 }
const STAND_TURN = new Euler()
const AXIS_OFFSET = new Vector3()
const STAND_AXIS = new Vector3()
const ANCHOR = new Vector3()

export type MouseParts = { root: Object3D; tilt: Object3D; head: Object3D; tail: Object3D }

/**
 * The mouse on the hill, feet flat on the slope; or diving into its burrow, a hop over the soil ring and head
 * first down the shaft; or coming out, nose first up the shaft and over the ring onto its feet beyond it.
 */
export function poseMouse(mouse: Mouse, parts: MouseParts): void {
  const { root, tilt, head, tail } = parts
  const diving = mouse.mode === 'dive'
  let level = 1
  if (diving || mouse.mode === 'emerge') {
    const path = DIVE_PATH
    const q = 1 - mouse.out
    // Where it stands on the grass: the spot it dives from, or the one it lands on beyond the ring.
    const standX = diving ? mouse.x : BURROW.x + Math.sin(mouse.yaw) * BURROW_STAND
    const standZ = diving ? mouse.z : BURROW.z + Math.cos(mouse.yaw) * BURROW_STAND
    groundTilt(standX, standZ, mouse.yaw, TILT)
    STAND_TURN.set(TILT.pitch, mouse.yaw, TILT.roll, 'YXZ')
    AXIS_OFFSET.set(0, MOUSE_AXIS * MOUSE_SCALE, 0).applyEuler(STAND_TURN)
    STAND_AXIS.set(standX, groundY(standX, standZ), standZ).add(AXIS_OFFSET)
    // Its middle runs between over its feet there, flat on the slope, and over the hole's middle.
    const onGrass = 1 - smoothstep(0, path.travel, q)
    ANCHOR.set(BURROW.x, groundY(BURROW.x, BURROW.z) + MOUSE_AXIS * MOUSE_SCALE, BURROW.z).lerp(STAND_AXIS, onGrass)
    ANCHOR.y += path.hop * Math.sin(Math.PI * Math.min(1, q / path.travel)) - path.drop * smoothstep(path.fall, 1, q)
    const reach = Math.hypot(ANCHOR.x - BURROW.x, ANCHOR.z - BURROW.z)
    const hang = Math.acos(Math.min(1, (reach + path.clear) / (diving ? path.head : path.tail)))
    const tip = Math.max(hang, (Math.PI / 2) * smoothstep(path.fall, path.fall + path.plunge, q))
    level = smoothstep(0.7, 1, 1 - tip / (Math.PI / 2))
    root.rotation.set((diving ? tip : -tip) + TILT.pitch * onGrass, mouse.yaw, TILT.roll * onGrass, 'YXZ')
    AXIS_OFFSET.set(0, MOUSE_AXIS * MOUSE_SCALE, 0).applyEuler(root.rotation)
    root.position.copy(ANCHOR).sub(AXIS_OFFSET)
  } else {
    groundTilt(mouse.x, mouse.z, mouse.yaw, TILT)
    root.position.set(mouse.x, groundY(mouse.x, mouse.z) + mouse.hop, mouse.z)
    root.rotation.set(TILT.pitch, mouse.yaw, TILT.roll, 'YXZ')
  }
  root.scale.setScalar(MOUSE_SCALE)
  // Down the shaft it keeps straight and still; it sits up, looks round, and swings its tail once it is level.
  const rear = mouse.rear * level
  const groom = mouse.groom * level
  tilt.position.set(0, 0, REAR_PIVOT)
  tilt.rotation.set(-rear * REAR, 0, 0)
  tilt.scale.set(1 - mouse.stretch * 0.15, 1 - mouse.stretch * 0.22, 1 + mouse.stretch * 0.5)
  head.rotation.set(rear * 0.75 + mouse.sniff * 0.1 + Math.sin(mouse.t * Math.PI * 2 * 6) * 0.2 * groom, mouse.look * level, Math.sin(mouse.t * Math.PI * 2 * 3) * 0.28 * groom)
  // Sitting up tips the rump back, so the tail lifts as much and more, and trails behind clear of the grass; by its
  // hole it stands up over the soil ring.
  const byHole = level * (1 - smoothstep(BURROW_STAND, BURROW_STAND + 4, Math.hypot(root.position.x - BURROW.x, root.position.z - BURROW.z)))
  tail.position.set(0, TAIL_ROOT.y, TAIL_ROOT.z - REAR_PIVOT)
  tail.rotation.set(rear * (REAR + TAIL_UP.lift) + byHole * TAIL_UP.near, (Math.sin(mouse.t * 3.6) * 0.3 + mouse.tailFlick) * level, 0)
}

const SEED_STRETCH_MAX = 0.24
const SEED_STRETCH_PER_SPEED = 0.003
const UP = new Vector3(0, 1, 0)
const GROW = new Matrix4()
const TURN = new Matrix4()
const STRETCH = new Matrix4()

/** A seed's matrix: rolled, grown, squashed down onto its bottom, and drawn out along its path in flight, written into `out`. */
export function seedMatrix(seed: SeedBody, out: Matrix4): Matrix4 {
  const squash = seed.squash.x
  const grow = Math.max(0.001, seed.grow.x)
  E.set(seed.rollX, 0, seed.rollZ)
  out.makeRotationFromEuler(E)
  out.premultiply(GROW.makeScale(grow * (1 + squash * 0.45), grow * (1 - squash), grow * (1 + squash * 0.45)))
  const speed = Math.hypot(seed.vx, seed.vy, seed.vz)
  const stretch = seed.mode === 'held' || seed.mode === 'arc' ? Math.min(SEED_STRETCH_MAX, speed * SEED_STRETCH_PER_SPEED) : 0
  if (stretch > 0.01) {
    // A felt ball on the move draws out along its path and rounds up again when it stops.
    Q.setFromUnitVectors(UP, V.set(seed.vx, seed.vy, seed.vz).divideScalar(speed))
    TURN.makeRotationFromQuaternion(Q)
    STRETCH.makeScale(1 - stretch * 0.4, 1 + stretch, 1 - stretch * 0.4).premultiply(TURN)
    STRETCH.multiply(TURN.transpose())
    out.premultiply(STRETCH)
  }
  return out.setPosition(seed.x, seed.y - squash * SEED_RADIUS * grow, seed.z)
}

/** The pouch's matrix: on the grass, leaning toward the meadow, wiggled and squashed as `pose` says, written into `out`. */
export function pouchMatrix(pose: PouchPose, out: Matrix4): Matrix4 {
  E.set(POUCH_LEAN.x, POUCH_LEAN.y, pose.roll)
  Q.setFromEuler(E)
  return out.compose(V.set(POUCH.x, groundY(POUCH.x, POUCH.z), POUCH.z), Q, S.set(pose.width, pose.height, pose.width))
}

/** A grass tussock's matrix: set a little into the felt, turned and sized as it was scattered. */
export function tuftMatrix(tuft: Tuft, out: Matrix4): Matrix4 {
  E.set(0, tuft.turn, 0)
  Q.setFromEuler(E)
  return out.compose(V.set(tuft.x, groundY(tuft.x, tuft.z) - 0.15, tuft.z), Q, S.set(tuft.size, tuft.height, tuft.size))
}

export type SnailParts = { root: Object3D; body: Object3D; shell: Object3D }

/** The snail on the hill, its foot flat on the slope: its body stretching and pulling in, its shell riding on it. */
export function poseSnail(snail: Snail, parts: SnailParts): void {
  const { root, body, shell } = parts
  groundTilt(snail.x, snail.z, snail.yaw, TILT)
  root.position.set(snail.x, groundY(snail.x, snail.z), snail.z)
  root.rotation.set(TILT.pitch, snail.yaw, TILT.roll, 'YXZ')
  const reach = Math.max(0, Math.sin(snail.cycle * Math.PI * 2))
  const stretch = snail.stretch
  body.scale.set(1 + (1 - stretch) * 0.25, 1 + (1 - stretch) * 0.2, stretch)
  body.position.set(0, 0, (stretch - 1) * 3.2)
  shell.position.set(0, SNAIL_SHELL.y + reach * 0.15 - (1 - stretch) * 0.6, SNAIL_SHELL.z - (stretch - 1) * 1.2)
  shell.rotation.set(snail.shellTilt.x + reach * 0.03, 0, snail.shiver)
}
