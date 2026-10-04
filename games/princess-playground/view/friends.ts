import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { belly, spread } from '../overlap'
import type { FriendPose } from '../pose'
import { CROWN, EARS, FRIENDS, type FriendId } from '../world'

// The four friends: smooth painted pebbles. One body, a pair of eyes that can
// blink and look about, a small mouth, and the one part that makes each its
// own shape: Pim's shell crown, Mog's ear bumps, Dot's speckles, Bo's lids.
// The body's size is the idea, so nothing else about a body adds bulk.

const PAINT: Record<FriendId, { full: string; pale: string }> = {
  pim: { full: '#ff6a55', pale: '#ff6a55' },
  mog: { full: '#19c2ae', pale: '#19c2ae' },
  dot: { full: '#8c56e0', pale: '#d3c9e8' },
  bo: { full: '#1d6a8c', pale: '#1d6a8c' },
}

export type FriendView = {
  id: FriendId
  /** Origin at the bottom of the body, so a squash keeps it planted. */
  group: THREE.Group
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  whites: THREE.Mesh
  pupils: THREE.Mesh
  mouth: THREE.Mesh
  /** The part that follows through. */
  extra: THREE.Object3D | null
  full: THREE.Color
  pale: THREE.Color
}

/** Where an eye sits on a body, as a direction from its centre: high on the front, so the face reads from above. */
const EYE = { x: 0.37, y: 0.66, z: 0.66 }

const SCRATCH = new THREE.Vector3()
const INK = new THREE.MeshBasicMaterial({ color: '#1d1a2b' })
const WHITE = new THREE.MeshBasicMaterial({ color: '#fffaf0' })

/** A point on the body's surface in the direction given, from the body's centre. */
function onBody(id: FriendId, dx: number, dy: number, dz: number, out = new THREE.Vector3()): THREE.Vector3 {
  const { radius, halfHeight } = FRIENDS[id]
  const n = out.set(dx, dy, dz).normalize()
  return n.set(n.x * radius, n.y * halfHeight, n.z * radius * 0.94)
}

function eyeGeometry(id: FriendId, size: number, lift: number, forward: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    const at = onBody(id, side * EYE.x, EYE.y, EYE.z)
    const eye = new THREE.SphereGeometry(size, 16, 12)
    eye.scale(1, 1.1, 0.5)
    // Each eye lies flat on the body, looking out along the body's own slope there.
    const out = new THREE.Vector3(side * EYE.x, EYE.y * 1.6, EYE.z).normalize()
    eye.lookAt(out)
    eye.translate(at.x + out.x * forward, at.y + lift + out.y * forward, at.z + out.z * forward)
    parts.push(eye)
  }
  return mergeGeometries(parts)!
}

export function buildFriend(id: FriendId): FriendView {
  const spec = FRIENDS[id]
  const group = new THREE.Group()
  group.name = `friend-${id}`
  // One object for the intersection audit: a face lies on its body by design.
  group.userData.jamObject = `friend-${id}`
  const full = new THREE.Color(PAINT[id].full), pale = new THREE.Color(PAINT[id].pale)

  // The body: an egg a little heavier at the bottom, like a pebble lying on its flat side.
  const bodyGeometry = new THREE.SphereGeometry(1, 36, 24)
  const position = bodyGeometry.attributes.position, normal = bodyGeometry.attributes.normal
  const n = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const bulge = belly(y)
    position.setXYZ(i, x * spec.radius * bulge, y * spec.halfHeight, z * spec.radius * 0.94 * bulge)
    // The normal of a stretched ball: the ball's own, divided by the stretch.
    n.set(x / spec.radius, y / spec.halfHeight, z / (spec.radius * 0.94)).normalize()
    normal.setXYZ(i, n.x, n.y, n.z)
  }
  const merged = bodyGeometry
  merged.translate(0, spec.halfHeight, 0)
  const body = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ color: full, roughness: 0.34, metalness: 0 }))
  body.name = `${id}-body`
  group.add(body)

  const eyeSize = spec.radius * (id === 'bo' ? 0.19 : id === 'pim' ? 0.27 : 0.23)
  const whites = new THREE.Mesh(eyeGeometry(id, eyeSize, 0, 0.012), WHITE)
  const pupils = new THREE.Mesh(eyeGeometry(id, eyeSize * 0.56, 0, eyeSize * 0.34), INK)
  // The mouth is half a ring lying on the body's slope: a smile. Put out, it is pressed flat where it lies.
  const mouthGeometry = new THREE.TorusGeometry(spec.radius * 0.16, spec.radius * 0.04, 6, 14, Math.PI)
  const mouthAt = onBody(id, 0, 0.36, 0.93)
  const mouth = new THREE.Mesh(mouthGeometry, INK)
  mouth.name = `${id}-mouth`
  mouth.rotation.set(-0.55, 0, Math.PI)
  mouth.position.set(mouthAt.x, mouthAt.y + spec.halfHeight, mouthAt.z + 0.015)
  whites.name = `${id}-whites`
  pupils.name = `${id}-pupils`
  const face = new THREE.Group()
  face.position.y = spec.halfHeight
  face.add(whites, pupils)
  group.add(face, mouth)

  let extra: THREE.Object3D | null = null
  if (id === 'pim') extra = crown(spec.radius)
  if (id === 'dot') extra = speckles()
  if (id === 'mog') extra = ears()
  if (id === 'bo') extra = lids(eyeSize)
  if (extra) {
    if (id === 'pim') extra.position.set(0, spec.halfHeight * CROWN.seat, -spec.radius * 0.18)
    else if (id === 'mog') extra.position.y = spec.halfHeight * EARS.seat
    else extra.position.y = spec.halfHeight
    group.add(extra)
  }
  return { id, group, body, whites, pupils, mouth, extra, full, pale }
}

/** Pim's crown: a small spiral shell, point up. */
function crown(radius: number): THREE.Object3D {
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    // Whorls: the outline steps in as it rises.
    profile.push(new THREE.Vector2(radius * CROWN.girth * (1 - t) * (1 + 0.2 * Math.sin(t * Math.PI * 7)) + 0.004, radius * CROWN.rise * t))
  }
  const shell = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), new THREE.MeshStandardMaterial({ color: '#fff6dc', roughness: 0.4, emissive: '#5a4a20', emissiveIntensity: 0.35 }))
  shell.name = 'pim-crown'
  return shell
}

/** Mog's ear bumps: two low rounded bumps at the corners of his head, a lighter teal than his body. They lie flat when he is put out, and are laid right back under a friend. */
function ears(): THREE.Object3D {
  const radius = FRIENDS.mog.radius, parts: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    const ear = new THREE.SphereGeometry(radius * EARS.size, 14, 10)
    ear.scale(0.85, 1, 0.6)
    ear.rotateZ(-side * 0.4)
    ear.translate(side * radius * EARS.out, 0, radius * 0.1)
    parts.push(ear)
  }
  // Low as they are, they are painted a lighter teal than his body, as Pim's crown is cream and Dot's speckles are pale, so that they can be seen.
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, new THREE.MeshStandardMaterial({ color: '#8ff0e0', roughness: 0.34, metalness: 0 }))
  mesh.name = 'mog-ears'
  return mesh
}

/** Dot's speckles: a scatter of lighter spots over its back and brow. */
function speckles(): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = []
  const at = new THREE.Vector3()
  for (let i = 0; i < 16; i++) {
    // A sunflower scatter over the top and back, kept clear of the face.
    const a = i * 2.39996, out = Math.sqrt((i + 0.6) / 16)
    const dx = Math.cos(a) * out, dz = Math.sin(a) * out * 0.9 - 0.25
    if (dz > 0.28) continue
    onBody('dot', dx, Math.sqrt(Math.max(0.05, 1 - dx * dx - dz * dz)), dz, at)
    const spot = new THREE.SphereGeometry(0.055 + 0.035 * ((i * 0.37) % 1), 8, 6)
    spot.scale(1, 0.4, 1)
    spot.lookAt(at.clone().normalize())
    spot.translate(at.x, at.y, at.z)
    parts.push(spot)
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, new THREE.MeshBasicMaterial({ color: '#f3ecff' }))
  mesh.name = 'dot-speckles'
  return mesh
}

/** Bo's heavy lids: two caps of his own colour over the top of each eye. */
function lids(eyeSize: number): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    const at = onBody('bo', side * EYE.x, EYE.y, EYE.z)
    const cap = new THREE.SphereGeometry(eyeSize * 1.14, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.36)
    cap.scale(1, 1.1, 0.62)
    cap.lookAt(new THREE.Vector3(side * EYE.x, EYE.y * 1.6, EYE.z))
    cap.rotateX(-0.5)
    // Outer corners down: sleepy, not cross.
    cap.rotateZ(side * 0.4)
    cap.translate(at.x, at.y, at.z + 0.012)
    parts.push(cap)
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, new THREE.MeshStandardMaterial({ color: '#17587a', roughness: 0.4 }))
  mesh.name = 'bo-lids'
  return mesh
}

/** Lays one frame's pose onto a friend's meshes. */
export function poseFriend(view: FriendView, pose: FriendPose): void {
  const spec = FRIENDS[view.id]
  // Pressed flat, a body spreads, but only so far: it never grows into its neighbour or the rim.
  const wide = spread(pose.squash)
  view.group.position.set(pose.x, pose.y, pose.z)
  view.group.scale.set(wide, pose.squash, wide)
  view.group.rotation.set(-pose.nod, pose.turn, -pose.lean, 'YXZ')
  // A blink shuts the eyes by flattening them where they sit.
  const open = Math.max(0.08, 1 - pose.lids)
  const eyeY = spec.halfHeight * 0.66
  for (const eyes of [view.whites, view.pupils]) {
    eyes.scale.y = open
    eyes.position.y = eyeY * (1 - open)
  }
  // A shut eye is a dark line: the white is put away, so the two never lie in one plane.
  view.whites.visible = open > 0.3
  // The pupils travel as far as the whites allow, so a look can be read from the child's side of the tray.
  view.pupils.position.x = pose.gazeX * spec.radius * 0.085
  // Bo's heavy lids hang over the top of his eyes: his pupils rise less, so a look up never hides them.
  // A look down travels less: the whites are shallower below the pupil, where the face curves under.
  view.pupils.position.y += pose.gazeY * spec.radius * (view.id === 'bo' ? 0.03 : pose.gazeY < 0 ? 0.03 : 0.055)
  // Lower on the face the body comes further forward: a pupil that looks down comes forward with it, or it would sink out of sight.
  view.pupils.position.z = Math.max(0, -pose.gazeY) * spec.radius * 0.05
  // At the finger the eyes go wide.
  // The whole face grows from the middle of the body, whites and pupils together, so each pupil stays in its white as it lay.
  view.whites.parent!.scale.setScalar(1 + 0.1 * pose.wide)
  // Bo's lids lie over his eyes and grow with them.
  if (view.extra && view.id === 'bo') view.extra.scale.setScalar(1 + 0.1 * pose.wide)
  // Bo's belly is his funniest part: it wobbles from side to side after he stops, on his slowest spring.
  if (view.id === 'bo') view.body.scale.x = 1 + Math.max(-0.07, Math.min(0.07, pose.follow * 0.09))
  // Put out, the mouth is pressed to a short flat line. It is never turned down: no sad face is turned to the child.
  view.mouth.scale.set(pose.frown > 0.5 ? 0.7 : 1 + pose.mouth * 0.35, pose.frown > 0.5 ? 0.22 : 1 + pose.mouth * 0.9, 1)
  view.body.material.color.lerpColors(view.pale, view.full, pose.bright)
  // The crown swings on its base, and no further than it could without tipping into her head.
  const swing = Math.max(-0.3, Math.min(0.3, pose.follow))
  if (view.extra && view.id === 'pim') {
    // With a friend on her head the crown slips down to the side of it, out from under them.
    if (pose.pressed > 0.5) {
      view.extra.position.set(-spec.radius * 0.86, spec.halfHeight * 1.05, spec.radius * 0.12)
      view.extra.rotation.set(0, 0, 1.25)
    } else {
      // Set down in the sand, it slips forward off the top of her head and hangs over one eye, until she shakes it back.
      const slip = pose.slip, over = onBody('pim', EYE.x, EYE.y + 0.35, EYE.z, SCRATCH)
      // On its way it rides up and forward over the round of her head, never through it.
      const round = Math.sin(slip * Math.PI) * spec.radius
      view.extra.position.set(over.x * slip, spec.halfHeight * CROWN.seat * (1 - slip) + (over.y + spec.halfHeight) * slip + round * 0.22, -spec.radius * 0.18 * (1 - slip) + (over.z + 0.02) * slip + round * 0.3)
      // A low wide crown tips less far than a tall one before its rim would dig into her head.
      view.extra.rotation.set(0.1 + swing * 0.25 + slip * 0.95, 0, -swing * 0.6 - slip * 0.35)
    }
  }
  // Dot's speckles follow its moves, and shimmer, turning to and fro on its back, while it is glad.
  if (view.extra && view.id === 'dot') view.extra.rotation.y = pose.follow * 0.6 + pose.shimmer * 0.22
  // Mog's ears lie flat when he is put out, and flatter still under a friend.
  if (view.extra && view.id === 'mog') {
    // Under a friend, as when he is put out, they are laid flat: low bumps at the corners of his head, they stay in sight beside whoever sits on him.
    view.extra.scale.y = pose.frown > 0.5 || pose.pressed > 0.5 ? 0.4 : 1
  }
}
