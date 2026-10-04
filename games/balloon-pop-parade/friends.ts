import { type BufferGeometry, Group, Mesh, type ShaderMaterial, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BODIES, type Body, type KindName } from './bodies'
import { PALETTE } from './palette'
import { forwardOf, spread, type Pose } from './pose'
import { peg, pillows, type Pillow } from './shapes'
import { vinylMaterial, type VinylUniforms } from './vinyl'

// A friend as meshes: five draws, one per part that moves by itself (four for
// the crab, whose face is on its shell), and one more for the hippo, whose jaw
// drops when it yawns. Its face is not a mesh of its own: the stage draws it
// from small pillows, in one batch for every face on screen (`faces.ts`). The
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
  /** What carries the eyes: the head, or the crab's stalks. */
  eyesOn: Group
  armL: Group
  armR: Group
  extra: Group
  /** The lower jaw, on the head: only a kind whose plan has one. */
  jaw: Group | null
  material: ShaderMaterial
  /** Where the right arm holds a string, in the arm's own space. */
  hand: Vector3
}

type Parts = { body: BufferGeometry; head: BufferGeometry | null; armL: BufferGeometry; armR: BufferGeometry; extra: BufferGeometry; jaw: BufferGeometry | null }

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
      head: plan.head.length > 0 ? pillows(plan.head) : null,
      armL: pillows(plan.arm),
      armR: pillows(mirrored(plan.arm)),
      extra: pillows(plan.extra),
      jaw: plan.jaw.length > 0 ? pillows([...plan.jaw, ...plan.inside]) : null,
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
  if (parts.head) head.add(mesh(parts.head, 'face'))
  squash.add(head)

  let jaw: Group | null = null
  if (parts.jaw) {
    jaw = new Group()
    jaw.name = 'jaw'
    jaw.position.set(...plan.jawPivot)
    jaw.add(mesh(parts.jaw, 'chin'))
    head.add(jaw)
  }

  const extra = new Group()
  extra.name = 'extra'
  extra.position.set(...plan.extraPivot)
  extra.add(mesh(parts.extra, 'part'))
  ;(plan.extraOnHead ? head : squash).add(extra)

  // The eyes ride on whatever carries them: the head, or the crab's stalks.
  const eyesOn = plan.extraOnHead ? extra : head

  const armL = new Group(), armR = new Group()
  armL.name = 'armL'
  armR.name = 'armR'
  armL.position.set(...plan.shoulder)
  armR.position.set(-plan.shoulder[0], plan.shoulder[1], plan.shoulder[2])
  armL.add(mesh(parts.armL, 'limb'))
  armR.add(mesh(parts.armR, 'limb'))
  squash.add(armL, armR)

  return { kind, plan, root, squash, head, eyesOn, armL, armR, extra, jaw, material, hand: new Vector3(-plan.hand[0], plan.hand[1], plan.hand[2]) }
}

/**
 * A whole friend as one geometry: what a friend on the far hill is drawn from, where it is too small for its
 * parts to be seen moving. One that `holds` a balloon walks with its string hand up; one that has none walks
 * with both arms down, as it does in front. One draw for every such friend of a kind.
 */
export function marcherGeometry(kind: KindName, holds = true): BufferGeometry {
  const plan = BODIES[kind]
  // The face is printed still at that distance: the eyes on what carries them, the mouth on the head.
  const head = pillows([...plan.head, ...plan.print]).translate(...plan.neck)
  const eyes = pillows(plan.eyes)
  const extra = pillows(plan.extra).translate(...plan.extraPivot)
  if (plan.extraOnHead) {
    // The crab's stalks ride on its head, and its eyes on the stalks.
    extra.translate(...plan.neck)
    eyes.translate(plan.neck[0] + plan.extraPivot[0], plan.neck[1] + plan.extraPivot[1], plan.neck[2] + plan.extraPivot[2])
  } else eyes.translate(...plan.neck)
  // The crab cannot let a claw hang: on the far hill it marches with both up.
  const down = plan.lowest > 0 ? plan.reach : 0.25
  const armL = pillows(plan.arm).rotateZ(-down).rotateY(forwardOf(down)).translate(...plan.shoulder)
  const right = holds ? plan.reach : down
  const armR = pillows(mirrored(plan.arm)).rotateZ(right).rotateY(-forwardOf(right)).translate(-plan.shoulder[0], plan.shoulder[1], plan.shoulder[2])
  const parts = [pillows(plan.body), head, eyes, extra, armL, armR]
  // A mouth that opens is shut on the far hill, and built without its lining.
  if (plan.jaw.length > 0) parts.push(pillows(plan.jaw).translate(plan.neck[0] + plan.jawPivot[0], plan.neck[1] + plan.jawPivot[1], plan.neck[2] + plan.jawPivot[2]))
  const whole = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  return whole
}

/** Puts a friend in a pose. The crab's funniest part is its eye stalks, which stretch upwards; the others puff all round. */
export function applyPose(rig: FriendRig, pose: Pose): void {
  rig.root.position.set(pose.x, pose.y, pose.z)
  rig.root.rotation.set(pose.bow, pose.turn, pose.lean)
  rig.root.scale.setScalar(pose.scale)
  const wide = spread(pose.squash)
  rig.squash.scale.set(wide, pose.squash, wide)
  rig.head.rotation.set(pose.nod, pose.headTurn, pose.tilt)
  // An arm hangs from its shoulder; the left swings out to the left and the right to the right, each coming round to the front on its way.
  const left = Math.max(rig.plan.lowest, pose.armL), right = Math.max(rig.plan.lowest, pose.armR)
  rig.armL.rotation.set(-pose.armLForward, forwardOf(left), -left)
  rig.armR.rotation.set(-pose.armRForward, -forwardOf(right), right)
  rig.extra.rotation.set(-pose.flick, pose.wag, 0)
  // The jaw hinges at the back of the mouth and drops at the front.
  if (rig.jaw) rig.jaw.rotation.x = pose.jaw
  if (rig.plan.extraOnHead) rig.extra.scale.set(1, pose.puff, 1)
  else rig.extra.scale.setScalar(pose.puff)
  rig.material.uniforms.uGlow.value = pose.glow
}

/** Frees the shared geometry of every kind. Call once when the game is torn down, after the friends are gone. */
export function disposeFriends(): void {
  for (const parts of built.values()) for (const part of Object.values(parts)) if (part && typeof part !== 'number') part.dispose()
  built.clear()
}
