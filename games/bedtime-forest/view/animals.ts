import type * as THREE from 'three'
import type { AnimalKey } from '../layout'
import { ShapeBuilder, shapes, type Vec3Tuple } from './geometry'
import { PALETTE } from './palette'

// The six animals, each built from painted ovals in its own local space:
// feet on y = 0, facing +z (toward the child). Each piece belongs to a
// rigid part (body, head, eyes, mouth, and the animal's own limbs); the
// rigs in rigs.ts pose those parts around the pivots below every frame.

const HALF_PI = Math.PI / 2

export const OWL = {
  parts: 8,
  body: 0,
  head: 1,
  eyes: 2,
  mouth: 3,
  wingL: 4,
  wingR: 5,
  footL: 6,
  footR: 7,
  neck: [0, 8.2, 0] as Vec3Tuple,
  eyePivot: [0, 10.4, 3.9] as Vec3Tuple,
  mouthPivot: [0, 9.0, 4.0] as Vec3Tuple,
  shoulderL: [3.5, 8.2, 0] as Vec3Tuple,
  shoulderR: [-3.5, 8.2, 0] as Vec3Tuple,
  hipL: [1.6, 1.2, 0.8] as Vec3Tuple,
  hipR: [-1.6, 1.2, 0.8] as Vec3Tuple,
}

export const FOX = {
  parts: 11,
  body: 0,
  head: 1,
  eyes: 2,
  mouth: 3,
  tail: 4,
  legFL: 5,
  legFR: 6,
  legBL: 7,
  legBR: 8,
  earL: 9,
  earR: 10,
  bodyPivot: [0, 5, 0] as Vec3Tuple,
  neck: [0, 8.2, 4.6] as Vec3Tuple,
  eyePivot: [0, 10.6, 8.2] as Vec3Tuple,
  mouthPivot: [0, 9.0, 8.4] as Vec3Tuple,
  tailBase: [0, 7.4, -5.4] as Vec3Tuple,
  hipFL: [1.6, 5.2, 3.4] as Vec3Tuple,
  hipFR: [-1.6, 5.2, 3.4] as Vec3Tuple,
  hipBL: [1.8, 5.2, -3.6] as Vec3Tuple,
  hipBR: [-1.8, 5.2, -3.6] as Vec3Tuple,
  earBaseL: [1.4, 12.0, 5.8] as Vec3Tuple,
  earBaseR: [-1.4, 12.0, 5.8] as Vec3Tuple,
}

export const RABBIT = {
  parts: 10,
  body: 0,
  head: 1,
  eyes: 2,
  mouth: 3,
  earL: 4,
  earR: 5,
  hindL: 6,
  hindR: 7,
  front: 8,
  tail: 9,
  /** Hops and sits up around its haunches. */
  bodyPivot: [0, 1.5, -1] as Vec3Tuple,
  neck: [0, 6.8, 1.8] as Vec3Tuple,
  eyePivot: [0, 9.0, 4.8] as Vec3Tuple,
  mouthPivot: [0, 7.6, 5.0] as Vec3Tuple,
  earBaseL: [1.1, 10.4, 2.2] as Vec3Tuple,
  earBaseR: [-1.1, 10.4, 2.2] as Vec3Tuple,
  hipL: [2.2, 2.6, -1.4] as Vec3Tuple,
  hipR: [-2.2, 2.6, -1.4] as Vec3Tuple,
  shoulder: [0, 3.4, 2.4] as Vec3Tuple,
  tailBase: [0, 4.2, -4.2] as Vec3Tuple,
}

export const BEAR = {
  parts: 8,
  body: 0,
  head: 1,
  eyes: 2,
  mouth: 3,
  armL: 4,
  armR: 5,
  legL: 6,
  legR: 7,
  neck: [0, 11.2, 6.2] as Vec3Tuple,
  eyePivot: [0, 14.2, 12.4] as Vec3Tuple,
  mouthPivot: [0, 11.4, 12.6] as Vec3Tuple,
  shoulderL: [3.6, 7.4, 5] as Vec3Tuple,
  shoulderR: [-3.6, 7.4, 5] as Vec3Tuple,
  hipL: [3.8, 7.2, -5] as Vec3Tuple,
  hipR: [-3.8, 7.2, -5] as Vec3Tuple,
  /** The bear sits back (and rolls onto its back) around its rump. */
  rump: [0, 3, -6] as Vec3Tuple,
}

export const FISH = {
  parts: 7,
  body: 0,
  tail: 1,
  eyes: 2,
  mouth: 3,
  finL: 4,
  finR: 5,
  dorsal: 6,
  center: [0, 4, 0] as Vec3Tuple,
  tailBase: [0, 4, -3.6] as Vec3Tuple,
  eyePivot: [0, 5.0, 2.8] as Vec3Tuple,
  mouthPivot: [0, 3.9, 4.1] as Vec3Tuple,
  finBaseL: [1.8, 3.5, 1.0] as Vec3Tuple,
  finBaseR: [-1.8, 3.5, 1.0] as Vec3Tuple,
  dorsalBase: [0, 6.6, 0.2] as Vec3Tuple,
}

export const BIRD = {
  parts: 8,
  body: 0,
  head: 1,
  eyes: 2,
  mouth: 3,
  wingL: 4,
  wingR: 5,
  tail: 6,
  legs: 7,
  neck: [0, 4.3, 0.8] as Vec3Tuple,
  eyePivot: [0, 5.5, 2.3] as Vec3Tuple,
  mouthPivot: [0, 5.0, 2.3] as Vec3Tuple,
  shoulderL: [1.7, 3.8, 0.4] as Vec3Tuple,
  shoulderR: [-1.7, 3.8, 0.4] as Vec3Tuple,
  tailBase: [0, 2.9, -2.1] as Vec3Tuple,
  hip: [0, 1.4, 0.1] as Vec3Tuple,
}

export const PART_COUNT: Record<AnimalKey, number> = {
  owl: OWL.parts,
  fox: FOX.parts,
  rabbit: RABBIT.parts,
  bear: BEAR.parts,
  fish: FISH.parts,
  songbird: BIRD.parts,
}

type Eye = { at: Vec3Tuple; r: number; part: number; white?: boolean; iris?: string }

/** A picture-book eye: a dark oval with one bright highlight (plus a coloured ring for the owl, a white for the fish). */
function eye(b: ShapeBuilder, e: Eye, side: 1 | -1): void {
  const s = shapes()
  const [x, y, z] = e.at
  const r = e.r
  if (e.iris) b.add(s.sphere, { at: [x * side, y, z - r * 0.15], scale: [r * 1.75, r * 1.75, r * 1.05], color: e.iris, part: e.part, ink: 0.8 })
  if (e.white) b.add(s.sphere, { at: [x * side, y, z - r * 0.25], scale: [r * 1.7, r * 1.85, r * 1.2], color: PALETTE.white, part: e.part, ink: 0.8 })
  b.add(s.sphere, { at: [x * side, y, z], scale: [r, r * 1.12, r * 0.7], color: PALETTE.eye, part: e.part, ink: e.iris || e.white ? 0 : 0.5 })
  b.add(s.ball, { at: [x * side - r * 0.3 * side, y + r * 0.38, z + r * 0.55], scale: r * 0.32, color: PALETTE.white, part: e.part, ink: 0 })
}

function mirrored(b: ShapeBuilder, geometry: THREE.BufferGeometry, at: Vec3Tuple, piece: Omit<Parameters<ShapeBuilder['add']>[1], 'at'>, parts?: [number, number]): void {
  const rot = piece.rot ?? [0, 0, 0]
  b.add(geometry, { ...piece, at, part: parts ? parts[0] : piece.part })
  b.add(geometry, { ...piece, at: [-at[0], at[1], at[2]], rot: [rot[0], -rot[1], -rot[2]], part: parts ? parts[1] : piece.part })
}

function owl(b: ShapeBuilder): void {
  const s = shapes()
  const P = OWL
  b.add(s.sphere, { at: [0, 5, 0], scale: [4.6, 5.3, 4.2], color: PALETTE.owl, part: P.body, ink: 1.2 })
  b.add(s.sphere, { at: [0, 4.6, 1.7], scale: [3.3, 3.9, 2.9], color: PALETTE.owlFace, part: P.body, ink: 0.5 })
  for (let i = 0; i < 3; i++) b.add(s.ball, { at: [(i - 1) * 1.2, 5.6 - (i % 2) * 1.4, 4.35], scale: [0.45, 0.28, 0.2], color: PALETTE.owlDark, part: P.body, ink: 0 })
  b.add(s.sphere, { at: [0, 10.2, 0.2], scale: [4.5, 3.9, 4.1], color: PALETTE.owl, part: P.head, ink: 1.2 })
  mirrored(b, s.sphere, [1.8, 10.3, 3.0], { scale: [2.1, 2.3, 1.1], color: PALETTE.owlFace, part: P.head, ink: 0.5 })
  mirrored(b, s.cone, [2.9, 12.6, 0], { rot: [0, 0, -0.45], scale: [1.1, 2.6, 1], color: PALETTE.owlDark, part: P.head, ink: 1 })
  b.add(s.cone, { at: [0, 10.0, 4.1], rot: [Math.PI, 0, 0], scale: [0.8, 1.7, 0.6], color: PALETTE.beak, part: P.head, ink: 0.7 })
  eye(b, { at: [1.75, 10.5, 3.75], r: 0.72, part: P.eyes, iris: PALETTE.amber }, 1)
  eye(b, { at: [1.75, 10.5, 3.75], r: 0.72, part: P.eyes, iris: PALETTE.amber }, -1)
  b.add(s.sphere, { at: [0, 8.6, 3.9], scale: [1.05, 1.15, 0.6], color: PALETTE.mouth, part: P.mouth, ink: 0.5 })
  mirrored(b, s.sphere, [4.3, 5.7, -0.3], { rot: [0.1, 0, 0.15], scale: [1.3, 3.9, 2.9], color: PALETTE.owlDark, ink: 1 }, [P.wingL, P.wingR])
  mirrored(b, s.sphere, [1.6, 0.5, 1.3], { scale: [1.15, 0.6, 1.45], color: PALETTE.beak, ink: 0.7 }, [P.footL, P.footR])
}

function fox(b: ShapeBuilder): void {
  const s = shapes()
  const P = FOX
  b.add(s.sphere, { at: [0, 6.6, 0], scale: [3.4, 3.3, 6.1], color: PALETTE.fox, part: P.body, ink: 1.2 })
  b.add(s.sphere, { at: [0, 6.2, 3.9], scale: [2.6, 2.8, 2.4], color: PALETTE.white, part: P.body, ink: 0.5 })
  const leg = { scale: [1.6, 2.7, 1.6] as Vec3Tuple, color: PALETTE.foxDark, ink: 0.9 }
  b.add(s.capsule, { ...leg, at: [1.6, 2.7, 3.4], part: P.legFL })
  b.add(s.capsule, { ...leg, at: [-1.6, 2.7, 3.4], part: P.legFR })
  b.add(s.capsule, { ...leg, at: [1.8, 2.7, -3.6], part: P.legBL })
  b.add(s.capsule, { ...leg, at: [-1.8, 2.7, -3.6], part: P.legBR })
  b.add(s.sphere, { at: [0, 10, 6.2], scale: [2.95, 2.65, 2.8], color: PALETTE.fox, part: P.head, ink: 1.2 })
  b.add(s.cone, { at: [0, 9.4, 7.4], rot: [HALF_PI, 0, 0], scale: [1.45, 3.7, 1.25], color: PALETTE.fox, part: P.head, ink: 1 })
  mirrored(b, s.sphere, [1.45, 9.1, 7.3], { scale: [1.5, 1.15, 1.5], color: PALETTE.white, part: P.head, ink: 0.5 })
  b.add(s.ball, { at: [0, 9.4, 11.1], scale: [0.62, 0.55, 0.55], color: PALETTE.foxDark, part: P.head, ink: 0.4 })
  eye(b, { at: [1.3, 10.6, 8.15], r: 0.62, part: P.eyes }, 1)
  eye(b, { at: [1.3, 10.6, 8.15], r: 0.62, part: P.eyes }, -1)
  b.add(s.sphere, { at: [0, 8.5, 8.9], scale: [1.1, 0.95, 1.3], color: PALETTE.mouth, part: P.mouth, ink: 0.5 })
  b.add(s.cone, { at: [1.5, 11.6, 5.8], rot: [0, 0, -0.25], scale: [1.25, 2.8, 0.8], color: PALETTE.fox, part: P.earL, ink: 1 })
  b.add(s.cone, { at: [-1.5, 11.6, 5.8], rot: [0, 0, 0.25], scale: [1.25, 2.8, 0.8], color: PALETTE.fox, part: P.earR, ink: 1 })
  b.add(s.cone, { at: [1.85, 13.3, 5.85], rot: [0, 0, -0.25], scale: [0.6, 1.2, 0.45], color: PALETTE.foxDark, part: P.earL, ink: 0 })
  b.add(s.cone, { at: [-1.85, 13.3, 5.85], rot: [0, 0, 0.25], scale: [0.6, 1.2, 0.45], color: PALETTE.foxDark, part: P.earR, ink: 0 })
  b.add(s.sphere, { at: [0, 8.6, -9.2], rot: [-0.55, 0, 0], scale: [2.4, 2.4, 4.4], color: PALETTE.fox, part: P.tail, ink: 1.2 })
  b.add(s.sphere, { at: [0, 10.6, -12.6], scale: [1.7, 1.7, 2], color: PALETTE.white, part: P.tail, ink: 1 })
}

function rabbit(b: ShapeBuilder): void {
  const s = shapes()
  const P = RABBIT
  b.add(s.sphere, { at: [0, 4.4, -0.5], scale: [3.6, 3.9, 4.4], color: PALETTE.rabbit, part: P.body, ink: 1.2 })
  b.add(s.sphere, { at: [0, 3.8, 1.9], scale: [2.6, 2.8, 2.5], color: PALETTE.white, part: P.body, ink: 0.5 })
  b.add(s.sphere, { at: [2.3, 1.1, 0.2], scale: [1.35, 1.1, 2.9], color: PALETTE.rabbitDark, part: P.hindL, ink: 0.9 })
  b.add(s.sphere, { at: [-2.3, 1.1, 0.2], scale: [1.35, 1.1, 2.9], color: PALETTE.rabbitDark, part: P.hindR, ink: 0.9 })
  mirrored(b, s.sphere, [1.2, 1.0, 3.1], { scale: [0.85, 1.05, 0.95], color: PALETTE.white, part: P.front, ink: 0.7 })
  b.add(s.ball, { at: [0, 4.2, -4.8], scale: 1.45, color: PALETTE.white, part: P.tail, ink: 0.8 })
  b.add(s.sphere, { at: [0, 8.4, 2.6], scale: [3.05, 2.85, 2.85], color: PALETTE.rabbit, part: P.head, ink: 1.2 })
  mirrored(b, s.sphere, [1.25, 7.8, 4.4], { scale: [1.35, 1.1, 1.05], color: PALETTE.white, part: P.head, ink: 0.4 })
  b.add(s.ball, { at: [0, 8.35, 5.4], scale: [0.6, 0.45, 0.45], color: PALETTE.pink, part: P.head, ink: 0 })
  eye(b, { at: [1.4, 9.05, 4.65], r: 0.64, part: P.eyes }, 1)
  eye(b, { at: [1.4, 9.05, 4.65], r: 0.64, part: P.eyes }, -1)
  b.add(s.sphere, { at: [0, 7.3, 5.1], scale: [0.75, 0.65, 0.55], color: PALETTE.mouth, part: P.mouth, ink: 0.4 })
  b.add(s.sphere, { at: [1.35, 13.8, 2.0], rot: [0, 0, -0.08], scale: [0.95, 3.5, 0.62], color: PALETTE.rabbit, part: P.earL, ink: 1 })
  b.add(s.sphere, { at: [-1.35, 13.8, 2.0], rot: [0, 0, 0.08], scale: [0.95, 3.5, 0.62], color: PALETTE.rabbit, part: P.earR, ink: 1 })
  b.add(s.sphere, { at: [1.35, 13.8, 2.45], rot: [0, 0, -0.08], scale: [0.55, 2.8, 0.3], color: PALETTE.pink, part: P.earL, ink: 0 })
  b.add(s.sphere, { at: [-1.35, 13.8, 2.45], rot: [0, 0, 0.08], scale: [0.55, 2.8, 0.3], color: PALETTE.pink, part: P.earR, ink: 0 })
}

function bear(b: ShapeBuilder): void {
  const s = shapes()
  const P = BEAR
  b.add(s.sphere, { at: [0, 8.6, 0], scale: [6.6, 6.4, 8.6], color: PALETTE.bear, part: P.body, ink: 1.3 })
  b.add(s.sphere, { at: [0, 7.4, 3.6], scale: [4.4, 4.6, 4.6], color: PALETTE.bearLight, part: P.body, ink: 0.4 })
  b.add(s.ball, { at: [0, 10.4, -8.4], scale: 1.3, color: PALETTE.bear, part: P.body, ink: 0.8 })
  const limb = { scale: [2.9, 3.7, 2.9] as Vec3Tuple, color: PALETTE.bear, ink: 1.1 }
  b.add(s.capsule, { ...limb, at: [3.6, 3.2, 5], part: P.armL })
  b.add(s.capsule, { ...limb, at: [-3.6, 3.2, 5], part: P.armR })
  b.add(s.capsule, { ...limb, at: [3.8, 3.2, -5.2], part: P.legL })
  b.add(s.capsule, { ...limb, at: [-3.8, 3.2, -5.2], part: P.legR })
  mirrored(b, s.sphere, [3.6, 0.9, 6.1], { scale: [1.5, 0.8, 1.2], color: PALETTE.bearLight, ink: 0 }, [P.armL, P.armR])
  b.add(s.sphere, { at: [0, 13, 9.4], scale: [4.5, 4.2, 4.1], color: PALETTE.bear, part: P.head, ink: 1.3 })
  b.add(s.sphere, { at: [0, 11.8, 12.4], scale: [2.3, 1.8, 1.9], color: PALETTE.bearLight, part: P.head, ink: 0.7 })
  b.add(s.ball, { at: [0, 12.6, 14.1], scale: [0.95, 0.65, 0.6], color: PALETTE.eye, part: P.head, ink: 0.3 })
  mirrored(b, s.sphere, [3.3, 16.5, 8.4], { scale: [1.6, 1.6, 1], color: PALETTE.bear, part: P.head, ink: 1 })
  mirrored(b, s.sphere, [3.3, 16.4, 8.95], { scale: [0.9, 0.9, 0.5], color: PALETTE.bearLight, part: P.head, ink: 0 })
  eye(b, { at: [1.75, 14.2, 12.3], r: 0.7, part: P.eyes }, 1)
  eye(b, { at: [1.75, 14.2, 12.3], r: 0.7, part: P.eyes }, -1)
  b.add(s.sphere, { at: [0, 10.6, 13], scale: [1.6, 1.3, 1.1], color: PALETTE.mouth, part: P.mouth, ink: 0.6 })
}

function fish(b: ShapeBuilder): void {
  const s = shapes()
  const P = FISH
  b.add(s.sphere, { at: [0, 4, 0], scale: [2.2, 2.9, 4.3], color: PALETTE.fish, part: P.body, ink: 1.2 })
  b.add(s.sphere, { at: [0, 3.2, 0.9], scale: [1.75, 2.0, 3.3], color: PALETTE.fishBelly, part: P.body, ink: 0.4 })
  for (let i = 0; i < 3; i++) b.add(s.sphere, { at: [0, 4.6, -1.6 + i * 1.3], scale: [2.25, 0.5, 0.35], color: PALETTE.fishFin, part: P.body, ink: 0 })
  b.add(s.cone, { at: [0, 4, -7.6], rot: [HALF_PI, 0, 0], scale: [0.45, 4.2, 3.1], color: PALETTE.fishFin, part: P.tail, ink: 1 })
  b.add(s.sphere, { at: [2.3, 3.2, 0.6], rot: [0, 0, 0.6], scale: [0.35, 1.05, 1.7], color: PALETTE.fishFin, part: P.finL, ink: 0.8 })
  b.add(s.sphere, { at: [-2.3, 3.2, 0.6], rot: [0, 0, -0.6], scale: [0.35, 1.05, 1.7], color: PALETTE.fishFin, part: P.finR, ink: 0.8 })
  b.add(s.cone, { at: [0, 6.0, 0.4], rot: [-0.3, 0, 0], scale: [0.4, 2.4, 2.4], color: PALETTE.fishFin, part: P.dorsal, ink: 0.9 })
  eye(b, { at: [1.45, 5.0, 2.95], r: 0.58, part: P.eyes, white: true }, 1)
  eye(b, { at: [1.45, 5.0, 2.95], r: 0.58, part: P.eyes, white: true }, -1)
  b.add(s.torus, { at: [0, 3.9, 4.05], scale: [0.8, 0.62, 0.7], color: PALETTE.fishFin, part: P.mouth, ink: 0.6 })
  b.add(s.disc, { at: [0, 3.9, 4.1], scale: [0.62, 0.45, 1], color: PALETTE.mouth, part: P.mouth, ink: 0 })
}

function songbird(b: ShapeBuilder): void {
  const s = shapes()
  const P = BIRD
  b.add(s.sphere, { at: [0, 3.0, 0], scale: [2.2, 2.2, 2.6], color: PALETTE.bird, part: P.body, ink: 1.1 })
  b.add(s.sphere, { at: [0, 2.7, 1.3], scale: [1.7, 1.8, 1.6], color: PALETTE.birdBreast, part: P.body, ink: 0.5 })
  mirrored(b, s.cylinder, [0.6, 0, 0.2], { scale: [0.2, 1.4, 0.2], color: PALETTE.beak, part: P.legs, ink: 0.5 })
  mirrored(b, s.ball, [0.6, 0.12, 0.55], { scale: [0.4, 0.15, 0.55], color: PALETTE.beak, part: P.legs, ink: 0.4 })
  b.add(s.sphere, { at: [0, 5.3, 1.2], scale: [1.6, 1.55, 1.55], color: PALETTE.bird, part: P.head, ink: 1.1 })
  b.add(s.cone, { at: [0, 5.15, 2.5], rot: [HALF_PI, 0, 0], scale: [0.48, 1.3, 0.42], color: PALETTE.beak, part: P.head, ink: 0.7 })
  eye(b, { at: [0.8, 5.55, 2.2], r: 0.36, part: P.eyes }, 1)
  eye(b, { at: [0.8, 5.55, 2.2], r: 0.36, part: P.eyes }, -1)
  b.add(s.cone, { at: [0, 4.85, 2.35], rot: [HALF_PI + 0.35, 0, 0], scale: [0.4, 1.0, 0.3], color: PALETTE.mouth, part: P.mouth, ink: 0.5 })
  mirrored(b, s.sphere, [2.0, 2.9, -0.2], { rot: [0.3, 0, 0], scale: [0.55, 1.55, 2.2], color: PALETTE.birdDark, ink: 0.9 }, [P.wingL, P.wingR])
  b.add(s.sphere, { at: [0, 3.5, -3.4], rot: [-0.5, 0, 0], scale: [1.05, 0.35, 1.9], color: PALETTE.birdDark, part: P.tail, ink: 0.9 })
}

const BUILDERS: Record<AnimalKey, (b: ShapeBuilder) => void> = { owl, fox, rabbit, bear, fish, songbird }

export function buildAnimal(key: AnimalKey): { fill: THREE.BufferGeometry; ink: THREE.BufferGeometry } {
  const b = new ShapeBuilder(0.55)
  BUILDERS[key](b)
  return b.build()
}
