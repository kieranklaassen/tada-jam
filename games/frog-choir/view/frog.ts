import * as THREE from 'three'
import { PALETTE } from './palette'
import { mergeParts, paintedPart, part, shapes, stick, type Paint, type Part } from './parts'

// Each frog is one skinned mesh plus an outline hull on the same skeleton:
// two draw calls. Parts are bound rigidly to bones, so squash, blinks, the
// throat bubble, gaze, arms, legs, and hats are all bone transforms that the
// personalities pose. The frog stands with its feet at y = 0, facing +z (the
// child), one unit wide before its cast scale.

export type Character = 'showoff' | 'bouncy' | 'sleepy' | 'shy' | 'crooner'

export type FrogSpec = {
  character: Character
  skin: string
  back: string
  belly: string
  bubble: string
  scale: number
}

/** Frog index is cast index: the default pond seats them near-left to far-right. */
export const CAST: readonly FrogSpec[] = [
  { character: 'showoff', skin: '#ff9270', back: '#f27a60', belly: '#fff0d8', bubble: '#ffd6c8', scale: 1.2 },
  { character: 'bouncy', skin: '#72bdf0', back: '#4f93d6', belly: '#f1f8ff', bubble: '#d2eaff', scale: 1.06 },
  { character: 'sleepy', skin: '#8fd173', back: '#72b85c', belly: '#f5f8d9', bubble: '#dff4cc', scale: 1.36 },
  { character: 'shy', skin: '#ffd873', back: '#f3c257', belly: '#fff8e2', bubble: '#fff1c4', scale: 1.0 },
  { character: 'crooner', skin: '#d9a36b', back: '#bf8a58', belly: '#fbead0', bubble: '#f6dcc2', scale: 1.26 },
]

export const BONE = {
  root: 0,
  body: 1,
  head: 2,
  lidL: 3,
  lidR: 4,
  pupils: 5,
  mouth: 6,
  bubble: 7,
  armL: 8,
  armR: 9,
  legL: 10,
  legR: 11,
  hat: 12,
  cheeks: 13,
} as const

type BoneName = keyof typeof BONE

// Pivots in frog space (bind pose) and parents.
const PIVOTS: Record<BoneName, readonly [number, number, number]> = {
  root: [0, 0, 0],
  body: [0, 0.02, 0],
  head: [0, 0.6, 0.04],
  lidL: [-0.21, 1.04, 0.2],
  lidR: [0.21, 1.04, 0.2],
  pupils: [0, 1.04, 0.3],
  mouth: [0, 0.69, 0.42],
  bubble: [0, 0.54, 0.3],
  armL: [-0.36, 0.42, 0.2],
  armR: [0.36, 0.42, 0.2],
  legL: [-0.34, 0.16, -0.06],
  legR: [0.34, 0.16, -0.06],
  hat: [0, 1.12, 0],
  cheeks: [0, 0.84, 0.36],
}

const PARENT: Record<BoneName, BoneName | null> = {
  root: null,
  body: 'root',
  head: 'body',
  lidL: 'head',
  lidR: 'head',
  pupils: 'head',
  mouth: 'head',
  bubble: 'body',
  armL: 'body',
  armR: 'body',
  legL: 'root',
  legR: 'root',
  hat: 'head',
  cheeks: 'head',
}

const NAMES = Object.keys(BONE) as BoneName[]

export type FrogRig = {
  spec: FrogSpec
  index: number
  /** Positioned and turned in the world by the view; scaled by the cast. */
  group: THREE.Group
  bones: THREE.Bone[]
  restPosition: THREE.Vector3[]
  restRotation: THREE.Euler[]
}

/** Lids are shells over the eye whites; rotating the bone forward by this much closes them. */
export const LID_CLOSED = Math.PI / 2
export const LID_OPEN = -1.25

function eye(side: -1 | 1, spec: FrogSpec, parts: Part[], size: number): void {
  const x = side * 0.21
  parts.push(part(shapes.sphere(1), spec.skin, { position: [x, 1.0, 0.13], scale: 0.19 * size }, BONE.head))
  parts.push(part(shapes.sphere(1), PALETTE.eyeWhite, { position: [x, 1.04, 0.2], scale: 0.145 * size }, BONE.head))
  parts.push(part(shapes.sphere(0), PALETTE.pupil, { position: [x, 1.04, 0.33], scale: [0.078 * size, 0.092 * size, 0.035] }, BONE.pupils, false))
  parts.push(part(shapes.tiny(), PALETTE.eyeWhite, { position: [x + 0.03, 1.08, 0.36], scale: 0.024 * size }, BONE.pupils, false))
  const lid = side < 0 ? BONE.lidL : BONE.lidR
  parts.push(part(shapes.lid(), spec.back, { position: [x, 1.04, 0.2], scale: 0.152 * size }, lid))
}

/** A patch in unit-sphere coordinates: true where the direction is within `radius` radians of `center`. */
function spots(centers: readonly (readonly [number, number, number])[], radius: number): (p: THREE.Vector3) => boolean {
  const normalized = centers.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize())
  const threshold = Math.cos(radius)
  const n = new THREE.Vector3()
  return (p) => {
    n.copy(p).normalize()
    return normalized.some((c) => c.dot(n) > threshold)
  }
}

function bodyPaint(spec: FrogSpec, spotted: ((p: THREE.Vector3) => boolean) | null): Paint {
  const skin = new THREE.Color(spec.skin)
  const back = new THREE.Color(spec.back)
  const belly = new THREE.Color(spec.belly)
  return (p, _, out) => {
    const front = THREE.MathUtils.smoothstep(p.z, 0.28, 0.46) * (1 - THREE.MathUtils.smoothstep(p.y, 0.3, 0.5))
    if (front > 0.5) out.copy(belly)
    else if (spotted?.(p)) out.copy(back)
    else out.copy(skin).lerp(back, THREE.MathUtils.smoothstep(-p.z, 0.2, 0.9) * 0.6)
  }
}

function headPaint(spec: FrogSpec, spotted: ((p: THREE.Vector3) => boolean) | null): Paint {
  const skin = new THREE.Color(spec.skin)
  const back = new THREE.Color(spec.back)
  const belly = new THREE.Color(spec.belly)
  return (p, _, out) => {
    if (p.y < -0.34 && p.z > 0.3) out.copy(belly)
    else if (spotted?.(p)) out.copy(back)
    else out.copy(skin)
  }
}

function limbs(spec: FrogSpec, parts: Part[], legScale: number): void {
  for (const side of [-1, 1] as const) {
    const arm = side < 0 ? BONE.armL : BONE.armR
    const leg = side < 0 ? BONE.legL : BONE.legR
    parts.push(part(shapes.capsule(), spec.skin, { position: [side * 0.37, 0.26, 0.29], scale: [0.14, 0.17, 0.14], rotation: [-0.46, 0, side * 0.08] }, arm))
    parts.push(part(shapes.sphere(0), spec.skin, { position: [side * 0.38, 0.07, 0.38], scale: [0.1, 0.055, 0.11] }, arm))
    parts.push(part(shapes.sphere(1), spec.skin, { position: [side * 0.4, 0.2, -0.05], scale: [0.2 * legScale, 0.18 * legScale, 0.28 * legScale] }, leg))
    parts.push(part(shapes.sphere(0), spec.skin, { position: [side * 0.47, 0.035, 0.18], scale: [0.14 * legScale, 0.04, 0.18 * legScale] }, leg))
    for (let toe = -1; toe <= 1; toe++) {
      const a = side * 0.35 + toe * 0.42
      parts.push(
        part(shapes.tiny(), spec.back, { position: [side * 0.47 + Math.sin(a) * 0.17 * legScale, 0.045, 0.18 + Math.cos(a) * 0.17 * legScale], scale: 0.04 }, leg, false),
      )
    }
  }
}

function base(spec: FrogSpec, parts: Part[], options: { eyes?: number; spotted?: ((p: THREE.Vector3) => boolean) | null; legs?: number; belly?: number } = {}): void {
  const spotted = options.spotted ?? null
  const belly = options.belly ?? 1
  parts.push(paintedPart(shapes.sphere(2), bodyPaint(spec, spotted), { position: [0, 0.36, 0], scale: [0.5 * belly, 0.39, 0.44 * belly] }, BONE.body))
  parts.push(paintedPart(shapes.sphere(2), headPaint(spec, spotted), { position: [0, 0.78, 0.05], scale: [0.5, 0.33, 0.42] }, BONE.head))
  eye(-1, spec, parts, options.eyes ?? 1)
  eye(1, spec, parts, options.eyes ?? 1)
  parts.push(part(shapes.smile(), PALETTE.mouth, { position: [0, 0.745, 0.43], scale: [0.2, 0.12, 0.2], rotation: [0.25, 0, -Math.PI / 2 - Math.PI * 0.36] }, BONE.head, false))
  parts.push(
    paintedPart(
      shapes.sphere(1),
      (p, _, out) => out.set(p.y > -0.35 ? PALETTE.mouth : PALETTE.mouthInside),
      { position: [0, 0.69, 0.42], scale: [0.12, 0.085, 0.07] },
      BONE.mouth,
      false,
    ),
  )
  for (const side of [-1, 1]) parts.push(part(shapes.tiny(), PALETTE.cheek, { position: [side * 0.33, 0.84, 0.35], scale: [0.075, 0.045, 0.035] }, BONE.cheeks, false))
  parts.push(
    paintedPart(
      shapes.sphere(2),
      (p, _, out) => out.set(spec.bubble).lerp(new THREE.Color('#ffffff'), p.y > 0.55 && p.x < -0.1 && p.z > 0.3 ? 0.75 : 0),
      { position: [0, 0.42, 0.46], scale: 0.24 },
      BONE.bubble,
    ),
  )
  limbs(spec, parts, options.legs ?? 1)
}

/** Parts attached to a bone whose rest pose is rotated: authored where they appear at rest, stored in bind space. */
function posed(parts: Part[], pivot: readonly [number, number, number], rest: THREE.Euler): Part[] {
  const p = new THREE.Vector3(...pivot)
  const inverse = new THREE.Matrix4()
    .makeTranslation(p.x, p.y, p.z)
    .multiply(new THREE.Matrix4().makeRotationFromEuler(rest))
    .multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z))
    .invert()
  for (const piece of parts) piece.geometry.applyMatrix4(inverse)
  return parts
}

const REST: Partial<Record<Character, Partial<Record<BoneName, THREE.Euler>>>> = {
  shy: { armR: new THREE.Euler(-0.2, 0, 2.55) },
}

function showoff(spec: FrogSpec, parts: Part[]): void {
  base(spec, parts, { belly: 1.06 })
  const petal = '#fff1f4'
  const tip = '#ffb4c8'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    parts.push(
      paintedPart(
        shapes.sphere(0),
        (p, _, out) => out.set(petal).lerp(new THREE.Color(tip), THREE.MathUtils.smoothstep(p.z, 0.2, 0.9)),
        { position: [0.2 + Math.sin(a) * 0.1, 1.16, -0.02 + Math.cos(a) * 0.1], scale: [0.07, 0.035, 0.14], rotation: [-0.5, a, 0], order: 'YXZ' },
        BONE.hat,
      ),
    )
  }
  parts.push(part(shapes.sphere(0), '#ffd55e', { position: [0.2, 1.17, -0.02], scale: [0.07, 0.05, 0.07] }, BONE.hat))
}

function bouncy(spec: FrogSpec, parts: Part[]): void {
  const spotted = spots(
    [
      [0.5, 0.5, -0.6],
      [-0.6, 0.3, -0.5],
      [0.1, 0.8, -0.4],
      [-0.2, 0.9, 0.1],
      [0.7, 0.1, -0.2],
      [-0.75, -0.1, 0.1],
      [0.3, -0.2, -0.9],
    ],
    0.27,
  )
  base(spec, parts, { spotted, legs: 1.2, eyes: 1.08 })
  parts.push(part(shapes.sphere(0), spec.back, { position: [0, 1.13, -0.05], scale: [0.05, 0.09, 0.05], rotation: [-0.4, 0, 0] }, BONE.hat))
  parts.push(part(shapes.sphere(0), spec.back, { position: [0.06, 1.12, -0.1], scale: [0.04, 0.07, 0.04], rotation: [-0.7, 0, -0.5] }, BONE.hat))
}

function sleepy(spec: FrogSpec, parts: Part[]): void {
  base(spec, parts, { belly: 1.1, eyes: 0.95 })
  // A floppy nightcap: a crown sitting back on the head, and a tip that droops over one side to a pom-pom.
  const cap = '#7d86e0'
  const band = '#fff1c2'
  const brim: [number, number, number] = [0.02, 1.04, -0.16]
  const bend: [number, number, number] = [-0.12, 1.36, -0.24]
  const tip: [number, number, number] = [-0.42, 1.26, -0.2]
  parts.push(part(shapes.frustum(), cap, stick(brim, bend, 1), BONE.hat))
  parts.push(part(shapes.cone(), cap, stick(bend, tip, 0.12), BONE.hat))
  parts.push(part(shapes.torus(), band, { position: brim, scale: [0.26, 0.26, 0.3], rotation: [Math.PI / 2 - 0.3, 0, 0.35] }, BONE.hat))
  parts.push(part(shapes.torus(), band, { position: bend, scale: [0.12, 0.12, 0.14], rotation: [Math.PI / 2 - 0.2, 0, 0.9] }, BONE.hat))
  parts.push(part(shapes.sphere(1), '#ffffff', { position: [tip[0] - 0.03, tip[1] - 0.05, tip[2]], scale: 0.1 }, BONE.hat))
}

function shy(spec: FrogSpec, parts: Part[]): void {
  base(spec, parts, { eyes: 1.12 })
  const leaf = '#8fcf8c'
  const vein = '#b9e6ad'
  // Authored where it is held at rest: a leaf parasol over her head.
  const hand = restHand('armR', REST.shy!.armR!)
  const top: [number, number, number] = [0.14, 1.42, 0.12]
  const umbrella: Part[] = [
    part(shapes.cylinder(), '#6fae78', stick([hand.x, hand.y, hand.z], top, 0.024), BONE.armR),
    paintedPart(
      shapes.sphere(1),
      (p, _, out) => out.set(Math.abs(p.x) < 0.08 || (p.y > 0 && Math.abs(Math.abs(p.x) - Math.abs(p.z) * 0.8) < 0.05) ? vein : leaf),
      { position: [top[0] - 0.06, top[1] + 0.03, top[2]], scale: [0.44, 0.05, 0.36], rotation: [0.1, 0.4, 0.22] },
      BONE.armR,
    ),
  ]
  parts.push(...posed(umbrella, PIVOTS.armR, REST.shy!.armR!))
}

/** Where a hand ends up when its arm bone is in a rotated rest pose. */
function restHand(arm: 'armL' | 'armR', rest: THREE.Euler): THREE.Vector3 {
  const side = arm === 'armL' ? -1 : 1
  const pivot = new THREE.Vector3(...PIVOTS[arm])
  return new THREE.Vector3(side * 0.38, 0.07, 0.38).sub(pivot).applyEuler(rest).add(pivot)
}

function crooner(spec: FrogSpec, parts: Part[]): void {
  const warts = spots(
    [
      [0.4, 0.6, -0.5],
      [-0.5, 0.5, -0.4],
      [0.7, 0.2, -0.4],
      [-0.2, 0.3, -0.9],
      [0.2, 0.9, 0.1],
      [-0.6, 0.1, 0.2],
    ],
    0.16,
  )
  base(spec, parts, { spotted: warts, eyes: 0.9, belly: 1.04 })
  const bumps: [number, number, number][] = [
    [0.3, 0.62, -0.25],
    [-0.32, 0.58, -0.22],
    [0.12, 0.72, -0.32],
    [-0.1, 1.0, -0.2],
    [0.36, 0.95, -0.05],
  ]
  for (const position of bumps) parts.push(part(shapes.tiny(), spec.back, { position, scale: 0.05 }, position[1] > 0.8 ? BONE.head : BONE.body, false))
  const rim = '#5a3f6e'
  for (const side of [-1, 1]) {
    parts.push(part(shapes.torus(), rim, { position: [side * 0.21, 1.03, 0.35], scale: [0.16, 0.16, 0.2] }, BONE.head, false))
    parts.push(part(shapes.sphere(1), '#fbfbf4', { position: [side * 0.24, 1.22, 0.26], scale: [0.13, 0.05, 0.06], rotation: [0, 0, side * -0.25] }, BONE.hat))
  }
  parts.push(part(shapes.cylinder(), rim, { position: [0, 1.04, 0.37], scale: [0.014, 0.13, 0.014], rotation: [0, 0, Math.PI / 2] }, BONE.head, false))
  parts.push(part(shapes.sphere(1), '#b85c7a', { position: [-0.08, 0.58, 0.47], scale: [0.09, 0.06, 0.04], rotation: [0, 0, 0.5] }, BONE.body))
  parts.push(part(shapes.sphere(1), '#b85c7a', { position: [0.08, 0.58, 0.47], scale: [0.09, 0.06, 0.04], rotation: [0, 0, -0.5] }, BONE.body))
  parts.push(part(shapes.tiny(), '#9a4665', { position: [0, 0.58, 0.49], scale: 0.035 }, BONE.body, false))
}

const BUILDERS: Record<Character, (spec: FrogSpec, parts: Part[]) => void> = { showoff, bouncy, sleepy, shy, crooner }

export type FrogMaterials = { toon: THREE.Material; outline: THREE.Material }

export function buildFrog(index: number, materials: FrogMaterials): FrogRig {
  const spec = CAST[index]
  const parts: Part[] = []
  BUILDERS[spec.character](spec, parts)

  const group = new THREE.Group()
  group.scale.setScalar(spec.scale)
  const mesh = new THREE.SkinnedMesh(mergeParts(parts, { skin: true }), materials.toon)
  const hull = new THREE.SkinnedMesh(mergeParts(parts, { skin: true, outlineOnly: true }), materials.outline)
  mesh.frustumCulled = false
  hull.frustumCulled = false

  const bones: THREE.Bone[] = []
  const restPosition: THREE.Vector3[] = []
  const restRotation: THREE.Euler[] = []
  for (const name of NAMES) {
    const bone = new THREE.Bone()
    bone.name = name
    const pivot = PIVOTS[name]
    const parent = PARENT[name]
    const origin = parent ? PIVOTS[parent] : [0, 0, 0]
    bone.position.set(pivot[0] - origin[0], pivot[1] - origin[1], pivot[2] - origin[2])
    restPosition.push(bone.position.clone())
    restRotation.push(REST[spec.character]?.[name]?.clone() ?? new THREE.Euler())
    bones.push(bone)
    if (parent) bones[BONE[parent]].add(bone)
  }
  mesh.add(bones[BONE.root])
  group.add(mesh, hull)
  group.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)
  mesh.bind(skeleton)
  hull.bind(skeleton, mesh.bindMatrix)
  return { spec, index, group, bones, restPosition, restRotation }
}
