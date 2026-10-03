import { type BufferGeometry, Group, Mesh, type ShaderMaterial, Vector3 } from 'three'
import { BODIES, type Body, type KindName } from './bodies'
import { PALETTE } from './palette'
import type { Pose } from './pose'
import { peg, pillows, type Pillow } from './shapes'
import { vinylMaterial, type VinylUniforms } from './vinyl'

// A friend as meshes: six draws, one per part that moves by itself. The
// geometry of each kind is built once and shared by every friend of that kind;
// a friend owns only its groups and one material, which carries its own glow.
// Every mesh is named and the root is tagged as one object, so the
// intersection audit reads a friend's parts as poses of one toy.

export type FriendRig = {
  kind: KindName
  plan: Body
  /** Placed on the ground: its origin is between the feet. */
  root: Group
  /** Everything above the feet; scaled for squash and stretch. */
  squash: Group
  head: Group
  eyes: Mesh
  armL: Group
  armR: Group
  extra: Group
  material: ShaderMaterial
  /** Where the right arm holds a string, in the arm's own space. */
  hand: Vector3
}

type Parts = { body: BufferGeometry; head: BufferGeometry; eyes: BufferGeometry; armL: BufferGeometry; armR: BufferGeometry; extra: BufferGeometry; eyeHeight: number }

const built = new Map<KindName, Parts>()

function mirrored(specs: readonly Pillow[]): Pillow[] {
  return specs.map((spec) => {
    const turn = spec.turn ?? [0, 0, 0]
    return { ...spec, at: [-spec.at[0], spec.at[1], spec.at[2]] as const, turn: [turn[0], -turn[1], -turn[2]] as const }
  })
}

function partsOf(kind: KindName): Parts {
  let parts = built.get(kind)
  if (!parts) {
    const plan = BODIES[kind]
    // The valve: a short white stub with a cap, on the trunk where an arm does not cover it.
    const valve = [
      peg({ at: plan.valve, radius: 0.06, length: 0.14, turn: [-0.9, 0, plan.valve[0] > 0 ? -0.7 : 0.7], colour: PALETTE.valve }),
    ]
    parts = {
      body: pillows(plan.body, valve),
      head: pillows(plan.head),
      // The eyes are built round their own middle, so a blink closes them where they are.
      eyes: pillows(plan.eyes).translate(0, -plan.eyes[0].at[1], 0),
      armL: pillows(plan.arm),
      armR: pillows(mirrored(plan.arm)),
      extra: pillows(plan.extra),
      eyeHeight: plan.eyes[0].at[1],
    }
    built.set(kind, parts)
  }
  return parts
}

/** Builds one friend. `name` goes on its root, and must be different for every friend on screen. */
export function buildFriend(kind: KindName, name: string, shared: VinylUniforms): FriendRig {
  const plan = BODIES[kind], parts = partsOf(kind)
  const material = vinylMaterial(shared, { uGlow: 0 })
  const mesh = (geometry: BufferGeometry, label: string) => {
    const made = new Mesh(geometry, material)
    made.name = label
    return made
  }
  const root = new Group()
  root.name = name
  root.userData.jamObject = name
  const squash = new Group()
  squash.name = 'squash'
  root.add(squash)
  squash.add(mesh(parts.body, 'body'))

  const head = new Group()
  head.name = 'head'
  head.position.set(...plan.neck)
  head.add(mesh(parts.head, 'face'))
  squash.add(head)

  const extra = new Group()
  extra.name = 'extra'
  extra.position.set(...plan.extraPivot)
  extra.add(mesh(parts.extra, 'part'))
  ;(plan.extraOnHead ? head : squash).add(extra)

  // The eyes ride on whatever carries them: the head, or the crab's stalks.
  const eyes = mesh(parts.eyes, 'eyes')
  eyes.position.y = parts.eyeHeight
  ;(plan.extraOnHead ? extra : head).add(eyes)

  const armL = new Group(), armR = new Group()
  armL.name = 'armL'
  armR.name = 'armR'
  armL.position.set(...plan.shoulder)
  armR.position.set(-plan.shoulder[0], plan.shoulder[1], plan.shoulder[2])
  armL.add(mesh(parts.armL, 'limb'))
  armR.add(mesh(parts.armR, 'limb'))
  squash.add(armL, armR)

  return { kind, plan, root, squash, head, eyes, armL, armR, extra, material, hand: new Vector3(-plan.hand[0], plan.hand[1], plan.hand[2]) }
}

/** Puts a friend in a pose. The crab's funniest part is its eye stalks, which stretch upwards; the others puff all round. */
export function applyPose(rig: FriendRig, pose: Pose): void {
  rig.root.position.set(pose.x, pose.y, pose.z)
  rig.root.rotation.set(pose.bow, pose.turn, pose.lean)
  rig.root.scale.setScalar(pose.scale)
  const wide = 1 / Math.sqrt(Math.max(0.2, pose.squash))
  rig.squash.scale.set(wide, pose.squash, wide)
  rig.head.rotation.set(pose.nod, pose.headTurn, pose.tilt)
  // An arm hangs from its shoulder; the left swings out to the left and the right to the right.
  rig.armL.rotation.set(-pose.armLForward, 0, -pose.armL)
  rig.armR.rotation.set(-pose.armRForward, 0, pose.armR)
  rig.extra.rotation.set(-pose.flick, pose.wag, 0)
  if (rig.plan.extraOnHead) rig.extra.scale.set(1, pose.puff, 1)
  else rig.extra.scale.setScalar(pose.puff)
  rig.eyes.scale.y = 1 - pose.blink * 0.9
  rig.material.uniforms.uGlow.value = pose.glow
}

/** Frees the shared geometry of every kind. Call once when the game is torn down, after the friends are gone. */
export function disposeFriends(): void {
  for (const parts of built.values()) for (const part of Object.values(parts)) if (typeof part !== 'number') part.dispose()
  built.clear()
}
