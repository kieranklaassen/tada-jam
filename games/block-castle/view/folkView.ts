import * as THREE from 'three'
import { DRAGON_RINGS, dragonHead, type FolkPose } from '../folk'
import { NOSE_TUCK } from '../castle'
import { FOLK, type Who } from '../layout'
import { clamp01, smooth } from '../motion'
import { along, type Placing, type Vec3 } from '../troupe'

// The three folk as meshes, and the mapping from a pose (numbers, folk.ts)
// onto them. Each is made of things from under the trees: the king a fat
// conker with a crown of spiky husk, the cook an acorn whose cup is his cap,
// the dragon a long pine cone. They are the size of toys left round the rug
// and large in the frame. No colour on them is brighter than the wood.

export type Part = { geometry: THREE.BufferGeometry; colour: string; at?: [number, number, number]; turn?: [number, number, number]; scale?: [number, number, number] }

/** Several primitives as one mesh's geometry, each tinted with its own colour. */
export function merge(parts: readonly Part[]): THREE.BufferGeometry {
  const position: number[] = [], normal: number[] = [], color: number[] = []
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3(), v = new THREE.Vector3(), tint = new THREE.Color()
  for (const part of parts) {
    const flat = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry
    matrix.compose(new THREE.Vector3(...(part.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.turn ?? [0, 0, 0]))), new THREE.Vector3(...(part.scale ?? [1, 1, 1])))
    normalMatrix.getNormalMatrix(matrix)
    tint.set(part.colour)
    const p = flat.getAttribute('position'), n = flat.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix)
      position.push(v.x, v.y, v.z)
      v.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize()
      normal.push(v.x, v.y, v.z)
      color.push(tint.r, tint.g, tint.b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3))
  return geometry
}

const ball = (r: number, w = 14, h = 10): THREE.BufferGeometry => new THREE.SphereGeometry(r, w, h)
const stick = (r0: number, r1: number, long: number, sides = 7): THREE.BufferGeometry => new THREE.CylinderGeometry(r1, r0, long, sides)

// Made on first use, never when the module loads: the jam loads every game's
// code at once, and a material made here would draw from `Math.random` (its
// id) in every other game's page too.
let materials: { matte: THREE.Material; glossy: THREE.Material; dark: THREE.Material } | null = null
const shared = () =>
  (materials ??= {
    matte: new THREE.MeshLambertMaterial({ vertexColors: true }),
    glossy: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: new THREE.Color('#8a6a48') }),
    dark: new THREE.MeshBasicMaterial({ color: '#2b160c' }),
  })

const TONE = {
  conker: '#74351b', scar: '#dcbd90', husk: '#8f9645', huskIn: '#e6dab0', twig: '#6d5139', linen: '#e9dcc0', linenShade: '#cdbd98',
  acorn: '#c0904f', cup: '#7b5b3a', cupLight: '#96744c', walnut: '#8c6b46', cone: '#7a573a', coneTip: '#a9855c', wing: '#cdab72', white: '#fbf6ea', mouth: '#5a2a1c',
}

/** What the evening asks of one of the folk besides where he is. Each is 0 to 1. */
export type Manner = {
  /** The king: seated, his cushion under him. */
  sits: number
  /** The cook: come up high, his eyes shut and his pot on his head. */
  high: number
  /** The dragon: his nose tucked in. */
  tuck: number
  /** Shaking himself dry. */
  shake: number
  /** Seconds of play so far. */
  time: number
}

/** One who stands on a board that bends goes down and up with it and is tipped with it, about the point he stands on: applied after `apply`. */
export function ride(root: THREE.Group, rise: number, lean: number): void {
  root.position.y += rise
  // About the room's depth, whichever way he faces: the board dips along the room's width.
  if (lean !== 0) root.quaternion.premultiply(tip.setFromAxisAngle(DEPTH, lean))
}
const tip = new THREE.Quaternion()
const DEPTH = new THREE.Vector3(0, 0, 1)

/** The lowest point of an egg shape in the dragon's head once his head is turned down by `nod` and rolled by `roll`: its middle and its three half-widths, in the head's own units. */
function lowest(nod: number, roll: number, cx: number, cy: number, a: number, b: number, c: number): number {
  const sn = Math.sin(nod), cn = Math.cos(nod), sr = Math.sin(roll), cr = Math.cos(roll)
  return (cx * sn + cy * cn) * cr - Math.sqrt(a * a * sn * sn * cr * cr + b * b * cn * cn * cr * cr + c * c * sr * sr)
}

/** The dragon's pillow: how high it stands unpressed, in his own units. */
const PILLOW_TOP = 0.35

export type FolkView = {
  who: Who
  root: THREE.Group
  /** Where he is and how he lies, then his pose. */
  apply(pose: FolkPose, placing: Placing, manner: Manner): void
}

/** The two eyes of each of the folk, in his own units: the middle of one, mirrored for the other, and its radius. */
export const EYE = { king: { x: 0.18, y: 0.74, z: 0.52, r: 0.14 }, cook: { x: 0.15, y: 0.76, z: 0.33, r: 0.115 }, dragon: { x: 0.05, y: 0.2, z: 0.17, r: 0.13 } }
/** An eyelid of the king and of the cook, in eye radii: the skin lies on the eye from `inner` out to `outer`. */
export const LID = { outer: 1.08, inner: 1.04 }
/** The same for the dragon, whose two eyes are on top of his head, one each side of it (`z` is the way across). */
export const DRAGON_LID = { outer: 1.09, inner: 1.05 }
const LID_SIDES = 12, LID_RINGS = 6

/**
 * An eyelid: the upper half of a ball, with a thickness. It is a skin and not an open shell: a dome outside, a dome
 * inside and the edge between them, so it is a closed solid with nothing in it but the skin itself.
 */
function lidSkin(outer: number, inner: number): THREE.BufferGeometry {
  const dome = (r: number): THREE.BufferGeometry => new THREE.SphereGeometry(r, LID_SIDES, LID_RINGS, 0, Math.PI * 2, 0, Math.PI / 2)
  const out = dome(outer), within = dome(inner)
  const position: number[] = [], normal: number[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const face = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3, n: [number, number, number][]): void => {
    position.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z)
    for (const one of n) normal.push(...one)
  }
  // The outside as it is; the inside turned to face the eye.
  for (const [geometry, flip] of [[out, false], [within, true]] as const) {
    const flat = geometry.toNonIndexed(), p = flat.getAttribute('position'), n = flat.getAttribute('normal')
    const sign = flip ? -1 : 1
    const at = (i: number): [number, number, number] => [n.getX(i) * sign, n.getY(i) * sign, n.getZ(i) * sign]
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2)
      if (flip) face(a, c, b, [at(i), at(i + 2), at(i + 1)])
      else face(a, b, c, [at(i), at(i + 1), at(i + 2)])
    }
  }
  // The edge: a flat ring from the rim of one dome to the rim of the other, on the very corners of both.
  const rim = LID_RINGS * (LID_SIDES + 1), po = out.getAttribute('position'), pi = within.getAttribute('position')
  const d = new THREE.Vector3(), down: [number, number, number][] = [[0, -1, 0], [0, -1, 0], [0, -1, 0]]
  for (let i = 0; i < LID_SIDES; i++) {
    a.fromBufferAttribute(pi, rim + i); b.fromBufferAttribute(pi, rim + i + 1)
    c.fromBufferAttribute(po, rim + i); d.fromBufferAttribute(po, rim + i + 1)
    face(a, d, c, down)
    face(a, b, d, down)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  return geometry
}

/** Two eyes side by side: the whites are part of the body; this adds the pupils, the lids and the brows, and returns how to pose them. */
function face(body: THREE.Group, who: Who, eye: { x: number; y: number; z: number; r: number }, lidColour: string, mouthAt: [number, number, number], mouthSize: number): (pose: FolkPose, shut: number) => void {
  const pupilGeometry = merge([
    { geometry: ball(eye.r * 0.5, 10, 8), colour: '#1c0f08', at: [-eye.x, 0, 0], scale: [1, 1, 0.5] },
    { geometry: ball(eye.r * 0.5, 10, 8), colour: '#1c0f08', at: [eye.x, 0, 0], scale: [1, 1, 0.5] },
    { geometry: ball(eye.r * 0.16, 6, 5), colour: '#ffffff', at: [-eye.x + eye.r * 0.16, eye.r * 0.18, eye.r * 0.22] },
    { geometry: ball(eye.r * 0.16, 6, 5), colour: '#ffffff', at: [eye.x + eye.r * 0.16, eye.r * 0.18, eye.r * 0.22] },
  ])
  const pupils = new THREE.Mesh(pupilGeometry, new THREE.MeshBasicMaterial({ vertexColors: true }))
  pupils.name = `${who}-pupils`
  body.add(pupils)
  // The lids: the upper half of a skin a little bigger than each eye, turned down over it.
  const shell = (): THREE.BufferGeometry => lidSkin(eye.r * LID.outer, eye.r * LID.inner)
  const lids = new THREE.Mesh(merge([{ geometry: shell(), colour: lidColour, at: [-eye.x, 0, 0] }, { geometry: shell(), colour: lidColour, at: [eye.x, 0, 0] }]), shared().matte)
  lids.name = `${who}-lids`
  lids.position.set(0, eye.y, eye.z)
  body.add(lids)
  const brows = new THREE.Mesh(merge([
    { geometry: stick(eye.r * 0.16, eye.r * 0.12, eye.r * 1.7, 6), colour: TONE.twig, at: [-eye.x, 0, 0], turn: [0, 0, Math.PI / 2 - 0.25] },
    { geometry: stick(eye.r * 0.16, eye.r * 0.12, eye.r * 1.7, 6), colour: TONE.twig, at: [eye.x, 0, 0], turn: [0, 0, Math.PI / 2 + 0.25] },
  ]), shared().matte)
  brows.name = `${who}-brows`
  body.add(brows)
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshBasicMaterial({ color: TONE.mouth }))
  mouth.name = `${who}-mouth`
  mouth.position.set(...mouthAt)
  body.add(mouth)
  return (pose, shut) => {
    const lid = Math.max(pose.lid, shut)
    pupils.position.set(pose.gazeX * eye.r * 0.42, eye.y + pose.gazeY * eye.r * 0.36, eye.z + eye.r * 0.86 - Math.abs(pose.gazeX) * eye.r * 0.12)
    // Open, the lid sits back on top of the eye; shut, it has turned down over the front of it.
    lids.rotation.x = -0.75 + lid * 1.75
    brows.position.set(0, eye.y + eye.r * (1.25 + 0.45 * pose.brow), eye.z + eye.r * 0.7)
    brows.rotation.x = -0.3
    mouth.scale.set(mouthSize * (0.35 + 0.65 * pose.mouthWide), mouthSize * (0.07 + 0.6 * pose.mouthOpen), mouthSize * 0.12)
  }
}

/** Sets one of the upright folk where he is: lifted, he stretches; shaking, he turns to and fro like a wet dog. */
function stand(root: THREE.Group, who: Who, placing: Placing, manner: Manner): void {
  const place = FOLK[who]
  root.position.set(placing.at[0], placing.at[1], placing.at[2])
  const lying = Math.abs(placing.lie)
  root.rotation.set(0, place.faces * (1 - lying) + manner.shake * 0.55 * Math.sin(manner.time * 46), -placing.lie * Math.PI / 2)
  const stretch = 1 + 0.12 * placing.air
  root.scale.set(place.size / Math.sqrt(stretch), place.size * stretch, place.size / Math.sqrt(stretch))
}

function king(): FolkView {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const nut = new THREE.Mesh(merge([{ geometry: ball(0.62, 22, 16), colour: TONE.conker, at: [0, 0.57, 0], scale: [1, 0.92, 0.96] }]), shared().glossy)
  nut.name = 'king-nut'
  body.add(nut)
  const eye = EYE.king
  const front = new THREE.Mesh(merge([
    // The pale scar of a conker is his face.
    { geometry: ball(0.4, 18, 12), colour: TONE.scar, at: [0, 0.6, 0.37], scale: [1, 0.86, 0.72] },
    { geometry: ball(eye.r), colour: TONE.white, at: [-eye.x, eye.y, eye.z] },
    { geometry: ball(eye.r), colour: TONE.white, at: [eye.x, eye.y, eye.z] },
  ]), shared().matte)
  front.name = 'king-face'
  body.add(front)
  const pose = face(body, 'king', eye, TONE.scar, [0, 0.45, 0.64], 0.2)
  // The crown: a spiky husk cup, too big for him.
  const spikes: Part[] = []
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2
    spikes.push({ geometry: new THREE.ConeGeometry(0.07, 0.3, 6), colour: i % 2 ? TONE.husk : '#a3a653', at: [Math.cos(angle) * 0.44, 0.24, Math.sin(angle) * 0.44], turn: [Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5] })
  }
  const crown = new THREE.Mesh(merge([
    { geometry: new THREE.CylinderGeometry(0.46, 0.38, 0.26, 16, 1, true), colour: TONE.husk },
    { geometry: new THREE.CylinderGeometry(0.43, 0.36, 0.25, 16, 1, true), colour: TONE.huskIn },
    ...spikes,
  ]), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }))
  crown.name = 'king-crown'
  body.add(crown)
  // His cushion, held up over his head on two twig arms by day. In the evening he sits on it.
  const arms = new THREE.Mesh(merge([
    { geometry: stick(0.045, 0.035, 1.25), colour: TONE.twig, at: [-0.56, -0.5, 0.02], turn: [0, 0, -0.18] },
    { geometry: stick(0.045, 0.035, 1.25), colour: TONE.twig, at: [0.56, -0.5, 0.02], turn: [0, 0, 0.18] },
  ]), shared().matte)
  arms.name = 'king-arms'
  body.add(arms)
  const cushion = new THREE.Mesh(merge([
    { geometry: ball(0.4, 14, 10), colour: TONE.linen, at: [0, 0.14, 0], scale: [1.25, 0.42, 0.9] },
    { geometry: ball(0.06, 8, 6), colour: TONE.linenShade, at: [0, 0.31, 0] },
    { geometry: ball(0.07, 6, 5), colour: TONE.linenShade, at: [-0.5, 0.14, 0] },
    { geometry: ball(0.07, 6, 5), colour: TONE.linenShade, at: [0.5, 0.14, 0] },
  ]), shared().matte)
  cushion.name = 'king-cushion'
  root.add(cushion)
  return {
    who: 'king', root,
    apply(p, placing, manner) {
      stand(root, 'king', placing, manner)
      const sits = manner.sits
      // Seated, he is on his cushion: it is under him, and his arms hang down behind it.
      body.position.y = p.y + 0.3 * sits
      body.rotation.set(p.nod, 0, p.lean)
      const wide = 1 / Math.sqrt(Math.max(0.4, p.squash))
      body.scale.set(wide, p.squash, wide)
      pose(p, 0)
      // Dropped, the crown sits over his eyes.
      crown.position.set(0, 1.14 - p.prop * 0.4, 0.02 + p.prop * 0.1)
      crown.rotation.set(-0.12 + p.prop * 0.2, 0, p.propTilt)
      const up = 1.62 + p.hold * 0.5
      // His arms draw up into the cushion first, each where it stood beside his crown. Then the cushion comes
      // round in front of him and in under him, never through him.
      const drawn = clamp01(sits / 0.3)
      const round = smooth(clamp01((sits - 0.15) / 0.85))
      const out = Math.sin(round * Math.PI) ** 0.6
      arms.position.set(0, up, 0.02)
      arms.scale.set(1, Math.max(0.001, 1 - drawn), 1)
      arms.visible = drawn < 0.97
      cushion.position.set(0, (up + p.y) * (1 - round) ** 1.5, 0.02 + 1.15 * out)
      cushion.rotation.set(1.2 * out, 0, -p.lean * 0.6 * (1 - round))
    },
  }
}

/** How much shorter a hop makes the cook where he lies, for each unit of the hop. */
const LYING_SHORT = 0.5
/** How much of its pop his cap keeps where he lies. */
const LYING_POP = 0.35
/** How high on him his cap sits, in his own units. */
const CAP_AT = 0.9

function cook(): FolkView {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const eye = EYE.cook
  // An acorn standing on its point; two twig arms hold a walnut-shell pot out in front.
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    profile.push(new THREE.Vector2(0.44 * Math.sin(t * Math.PI * 0.5) ** 0.75 * (1 - 0.1 * t), 0.04 + t * 1.0))
  }
  const shiny = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 24, specular: new THREE.Color('#5a4630'), side: THREE.DoubleSide })
  const nut = new THREE.Mesh(merge([
    { geometry: new THREE.LatheGeometry(profile, 18), colour: TONE.acorn },
    { geometry: ball(0.06, 6, 5), colour: TONE.cup, at: [0, 0.066, 0] },
    { geometry: ball(eye.r), colour: TONE.white, at: [-eye.x, eye.y, eye.z] },
    { geometry: ball(eye.r), colour: TONE.white, at: [eye.x, eye.y, eye.z] },
    { geometry: stick(0.035, 0.03, 0.5), colour: TONE.twig, at: [-0.33, 0.47, 0.34], turn: [1.15, 0, 0.35] },
    { geometry: stick(0.035, 0.03, 0.5), colour: TONE.twig, at: [0.33, 0.47, 0.34], turn: [1.15, 0, -0.35] },
  ]), shiny)
  nut.name = 'cook-nut'
  body.add(nut)
  // His pot is half a walnut shell. Up high it is on his head.
  const pot = new THREE.Mesh(merge([
    { geometry: new THREE.SphereGeometry(0.25, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), colour: TONE.walnut },
    { geometry: new THREE.CircleGeometry(0.24, 14), colour: '#4f3520', at: [0, -0.01, 0], turn: [-Math.PI / 2, 0, 0] },
  ]), shiny)
  pot.name = 'cook-pot'
  body.add(pot)
  const pose = face(body, 'cook', eye, TONE.acorn, [0, 0.6, 0.35], 0.13)
  // The cup of the acorn is his cap, with its stalk for a bobble.
  const bumps: Part[] = []
  for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + ring * 0.3, tilt = 0.35 + ring * 0.38
    bumps.push({ geometry: ball(0.075, 6, 5), colour: (i + ring) % 2 ? TONE.cup : TONE.cupLight, at: [Math.sin(tilt) * Math.cos(angle) * 0.47, Math.cos(tilt) * 0.34, Math.sin(tilt) * Math.sin(angle) * 0.47], scale: [1, 0.6, 1] })
  }
  const cap = new THREE.Mesh(merge([
    { geometry: new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), colour: TONE.cup, scale: [1, 0.72, 1] },
    { geometry: stick(0.04, 0.05, 0.2, 6), colour: TONE.twig, at: [0.03, 0.4, 0], turn: [0, 0, -0.3] },
    ...bumps,
  ]), shared().matte)
  cap.name = 'cook-cap'
  body.add(cap)
  const spoon = new THREE.Mesh(merge([
    { geometry: stick(0.022, 0.022, 0.52, 6), colour: TONE.twig, at: [0.1, 0.22, 0], turn: [0, 0, -0.4] },
    { geometry: ball(0.06, 8, 6), colour: TONE.twig, at: [0.0, -0.02, 0], scale: [1, 0.5, 1] },
  ]), shared().matte)
  spoon.name = 'cook-spoon'
  body.add(spoon)
  return {
    who: 'cook', root,
    apply(p, placing, manner) {
      stand(root, 'cook', placing, manner)
      // Standing, he hops and rocks on his point, and his cap pops up and tips. Lying with his cap in at a window
      // he is under the top of the room, and of whatever is built over it: there a hop draws him up short along the
      // floor, his cap out of the window with him; his cap pops off his head by a part of what it does standing, off
      // a head drawn back by as much; he sways from side to side on the floor and never lifts his head; and his
      // cap turns on his head where it would tip. So nothing he does sends the cap up or further in.
      const lying = Math.abs(placing.lie), rocks = 1 - 0.8 * lying
      body.position.y = p.y * (1 - lying)
      body.rotation.set(p.nod * rocks, 0, p.lean * (1 - lying))
      const wide = 1 / Math.sqrt(Math.max(0.4, p.squash))
      const pop = p.prop * (1 - (1 - LYING_POP) * lying)
      const drawnBack = 1 - lying * (1 - CAP_AT / (CAP_AT + pop))
      const long = (p.squash > 1 ? 1 + (p.squash - 1) * (1 - lying) : p.squash) * (1 - LYING_SHORT * p.y * lying) * drawnBack
      body.scale.set(1 + (wide - 1) * (1 - lying), long, 1 + (wide - 1) * (1 - lying))
      pose(p, manner.high)
      cap.position.set(0, CAP_AT + pop, 0)
      cap.rotation.set(0, p.propTilt * lying, p.propTilt * (1 - lying))
      // The pot: out in front on his two arms, or turned over on top of his cap while he is carried up high. Lying
      // beside his room his cap is in at the window, so the pot is out in front of him again, where it is seen
      // and the spoon turns in it.
      const high = manner.high * (1 - lying)
      pot.position.set(0, 0.44 + (1.52 + p.prop - 0.44) * high + 0.5 * Math.sin(high * Math.PI), 0.62 * (1 - high))
      pot.rotation.set(Math.PI * high, 0, p.propTilt * high)
      // The spoon goes round the pot.
      spoon.position.set(Math.cos(p.hold) * 0.11, 0.5, 0.62 + Math.sin(p.hold) * 0.11)
      spoon.rotation.set(0, -p.hold, 0)
    },
  }
}

function dragon(): FolkView {
  const root = new THREE.Group()
  // His body is a long pine cone: ring after ring of woody scales, each ring's scales lying over the gaps of the
  // ring behind, their pale tips turned up and out toward his tail.
  const SCALES = 9
  const scales: Part[] = [{ geometry: new THREE.CylinderGeometry(0.4, 0.3, 0.4, 10, 1, false), colour: '#4f3723', turn: [0, 0, Math.PI / 2] }]
  for (let k = 0; k < SCALES; k++) {
    const angle = (k / SCALES) * Math.PI * 2
    const cy = Math.cos(angle), sz = Math.sin(angle)
    // A scale: a thick flat tongue of wood rooted at the core and lifting away from it toward the tail.
    scales.push({ geometry: ball(0.24, 8, 6), colour: k % 2 ? TONE.cone : '#86603f', at: [-0.03, cy * 0.4, sz * 0.4], turn: [angle, 0, 0], scale: [1.15, 0.36, 0.86] })
    scales.push({ geometry: ball(0.11, 6, 5), colour: TONE.coneTip, at: [-0.25, cy * 0.5, sz * 0.5], turn: [angle, 0, 0], scale: [0.9, 0.5, 1.3] })
  }
  const rings = new THREE.InstancedMesh(merge(scales), new THREE.MeshLambertMaterial({ vertexColors: true }), DRAGON_RINGS)
  rings.name = 'dragon-rings'
  rings.frustumCulled = false
  root.add(rings)
  /** How fat he is at each ring: slim shoulders, a belly, a long taper to the tail. */
  const girth = (ring: number): number => 0.55 + 0.5 * Math.sin(Math.min(1, (ring + 0.6) / 4) * Math.PI * 0.5) - 0.085 * Math.max(0, ring - 3)
  const tail = new THREE.Mesh(merge([
    { geometry: new THREE.ConeGeometry(0.16, 0.6, 8), colour: TONE.cone, at: [-0.3, 0, 0], turn: [0, 0, Math.PI / 2] },
    { geometry: ball(0.1, 8, 6), colour: TONE.coneTip, at: [-0.62, 0, 0], scale: [1.4, 0.5, 1] },
  ]), shared().matte)
  tail.name = 'dragon-tail'
  root.add(tail)
  // His head and what is under it turn together, away from the way his body runs.
  const fore = new THREE.Group()
  root.add(fore)
  // His pillow under his chin, and two twig paws on it. It stays at home when he goes out.
  const rest = new THREE.Mesh(merge([
    { geometry: ball(0.36, 14, 10), colour: TONE.linen, at: [0.42, 0.17, 0.02], scale: [1.35, 0.5, 1.5] },
    { geometry: stick(0.05, 0.04, 0.42), colour: TONE.twig, at: [0.3, 0.33, 0.36], turn: [0, 0.3, Math.PI / 2 - 0.2] },
    { geometry: stick(0.05, 0.04, 0.42), colour: TONE.twig, at: [0.3, 0.33, -0.32], turn: [0, -0.3, Math.PI / 2 - 0.2] },
  ]), shared().matte)
  rest.name = 'dragon-pillow'
  fore.add(rest)
  // His head: a smaller cone lying on the pillow, snout to the right, with his eyes on top like a frog's and two winged seeds for ears.
  const head = new THREE.Group()
  head.position.set(0.3, 0.5, 0)
  fore.add(head)
  const eye = EYE.dragon
  const skull = new THREE.Mesh(merge([
    { geometry: ball(0.3, 16, 12), colour: TONE.cone, at: [0.22, 0.03, 0], scale: [1.55, 0.62, 1] },
    { geometry: ball(0.12, 10, 8), colour: TONE.coneTip, at: [0.6, 0.06, 0], scale: [1.2, 0.8, 1.5] },
    { geometry: ball(0.03, 6, 5), colour: '#2b160c', at: [0.68, 0.14, 0.08] },
    { geometry: ball(0.03, 6, 5), colour: '#2b160c', at: [0.68, 0.14, -0.08] },
    { geometry: ball(eye.r), colour: TONE.white, at: [eye.x, eye.y, eye.z] },
    { geometry: ball(eye.r), colour: TONE.white, at: [eye.x, eye.y, -eye.z] },
    { geometry: ball(0.2, 10, 6), colour: TONE.wing, at: [-0.26, 0.26, 0.2], turn: [0.5, 0.3, 0.9], scale: [1.7, 0.12, 0.6] },
    { geometry: ball(0.2, 10, 6), colour: TONE.wing, at: [-0.26, 0.26, -0.2], turn: [-0.5, -0.3, 0.9], scale: [1.7, 0.12, 0.6] },
  ]), shared().matte)
  skull.name = 'dragon-head'
  head.add(skull)
  const jaw = new THREE.Mesh(merge([
    { geometry: ball(0.27, 14, 8), colour: TONE.cone, at: [0.28, -0.04, 0], scale: [1.5, 0.34, 0.92] },
    { geometry: ball(0.22, 12, 6), colour: TONE.mouth, at: [0.3, 0.0, 0], scale: [1.5, 0.2, 0.86] },
  ]), shared().matte)
  jaw.name = 'dragon-jaw'
  jaw.position.set(-0.05, -0.05, 0)
  head.add(jaw)
  // His eyes face the child from the top of his head: pupils on the near, upper side of each.
  const toChild = new THREE.Vector3(0, 0.6, 0.8).normalize(), upChild = new THREE.Vector3(0, 0.8, -0.6)
  const pupilGeometry = merge([
    { geometry: ball(eye.r * 0.5, 10, 8), colour: '#1c0f08', at: [0, 0, eye.z], scale: [1, 1, 1] },
    { geometry: ball(eye.r * 0.5, 10, 8), colour: '#1c0f08', at: [0, 0, -eye.z], scale: [1, 1, 1] },
  ])
  const pupils = new THREE.Mesh(pupilGeometry, shared().dark)
  pupils.name = 'dragon-pupils'
  head.add(pupils)
  // His lids are skins like theirs, a little fuller.
  const lidGeometry = (): THREE.BufferGeometry => lidSkin(eye.r * DRAGON_LID.outer, eye.r * DRAGON_LID.inner)
  const lids = [1, -1].map((side) => {
    const lid = new THREE.Mesh(merge([{ geometry: lidGeometry(), colour: TONE.cone }]), shared().matte)
    lid.name = 'dragon-lid'
    lid.position.set(eye.x, eye.y, eye.z * side)
    head.add(lid)
    return lid
  })
  const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), turn = new THREE.Quaternion(), size = new THREE.Vector3(), twist = new THREE.Quaternion()
  const tailward = new THREE.Vector3(-1, 0, 0), way = new THREE.Vector3(), xAxis = new THREE.Vector3(1, 0, 0)
  const a = { p: [0, 0, 0] as Vec3, t: [0, 0, 0] as Vec3 }, b = { p: [0, 0, 0] as Vec3, t: [0, 0, 0] as Vec3 }
  const scale = FOLK.dragon.size
  const before = new THREE.Vector3(), after = new THREE.Vector3()
  /** A point of the line he lies along, a distance back from his shoulders in his own units: between the line he is leaving and the line he is taking. */
  const point = (placing: Placing, distance: number, out: THREE.Vector3): void => {
    along(placing.pathFrom, distance * scale, a)
    along(placing.pathTo, distance * scale, b)
    const m = placing.mix
    out.set((a.p[0] + (b.p[0] - a.p[0]) * m) / scale, (a.p[1] + (b.p[1] - a.p[1]) * m) / scale, (a.p[2] + (b.p[2] - a.p[2]) * m) / scale)
  }
  /** The point of his spine there and the way it runs. A cone bends in a curve: a corner of the line is rounded over a ring's length each way. */
  const ROUND = 0.42
  const spine = (placing: Placing, distance: number): void => {
    point(placing, distance - ROUND, before)
    point(placing, distance + ROUND, after)
    point(placing, distance, at)
    at.multiplyScalar(2).add(before).add(after).multiplyScalar(0.25)
    way.copy(after).sub(before)
    if (way.lengthSq() < 1e-6) way.copy(tailward)
    way.normalize()
  }
  return {
    who: 'dragon', root,
    apply(p, placing, manner) {
      root.position.set(placing.at[0], placing.at[1], placing.at[2])
      root.rotation.set(0, 0, 0)
      const stretch = 1 + 0.08 * placing.air
      root.scale.set(scale, scale * stretch, scale)
      // At home he lies on his pillow. Out in the castle he has left it, and his chin is on the ground.
      const home = Math.max(0, 1 - Math.hypot(placing.at[0] - FOLK.dragon.x, placing.at[1], placing.at[2] - FOLK.dragon.z) / 0.6)
      // The rings: his breath swells them, and a ruffle opens each one out and tips it up.
      for (let ring = 0; ring < DRAGON_RINGS; ring++) {
        const ruffle = p.ruffle[ring] ?? 0, fat = girth(ring) * (1 + 0.32 * ruffle) * (1 + (p.squash - 1) * (ring < 5 ? 1 : 0.4))
        spine(placing, 0.08 + ring * 0.33)
        at.y += 0.47 * girth(ring) * (1 + (p.squash - 1) * 0.8)
        // Each ring is turned half a scale round from the one before, as on a cone, and lies along his spine.
        turn.setFromUnitVectors(tailward, way)
        twist.setFromAxisAngle(xAxis, (ring % 2) * (Math.PI / SCALES) + 0.1 * ruffle)
        turn.multiply(twist)
        // A ruffle lifts his scales up more than out to his sides, where a wall may stand.
        size.set(1 + 0.25 * ruffle, fat, fat * (1 + 0.2 * ruffle) / (1 + 0.32 * ruffle))
        matrix.compose(at, turn, size)
        rings.setMatrixAt(ring, matrix)
      }
      rings.instanceMatrix.needsUpdate = true
      spine(placing, 0.08 + DRAGON_RINGS * 0.33 - 0.12)
      tail.position.set(at.x, at.y + 0.13, at.z)
      tail.quaternion.setFromUnitVectors(tailward, way)
      tail.rotateY(p.hold)
      // His head points away from the way his body runs, and tucks back when the grille comes down past his nose.
      point(placing, 0, before)
      point(placing, 0.2, after)
      way.copy(after).sub(before).normalize()
      // Under the grille his head goes straight back the way it points.
      const back = NOSE_TUCK * manner.tuck, backX = way.x * back, backZ = way.z * back
      // Before he is lifted he pulls his head right in among his first scales, as a cone shuts: back along the
      // line he lies on, round its bend where it bends, never out through his side.
      const pulled = smooth(placing.tuck), drawn = 1.05 * pulled
      point(placing, drawn - 0.6, before)
      point(placing, drawn + 0.2, after)
      const wayX = after.x - before.x, wayZ = after.z - before.z
      // Where his body hangs straight down from a gate up high, his head keeps the way it pointed.
      if (Math.hypot(wayX, wayZ) > 0.05) way.set(wayX, 0, wayZ)
      fore.rotation.set(0, Math.atan2(way.z, -way.x), 0)
      point(placing, drawn, at)
      fore.position.set(at.x + backX, at.y + 0.04 * pulled, at.z + backZ)
      fore.scale.setScalar(1 - 0.4 * pulled)
      rest.visible = home > 0.02
      // On his pillow his chin sinks into it; on the ground it stays level, and his head lifts a little instead.
      const turned = dragonHead(p, home)
      head.rotation.set(p.lean, 0, turned.head)
      head.position.y = 0.5 - 0.24 * (1 - home) + p.y
      // The pillow gives under his head: it is pressed as flat as the underside of his skull and his snout come
      // down, so his head lies on it and is never in it.
      const under = head.position.y + Math.min(lowest(turned.head, p.lean, 0.22, 0.03, 0.465, 0.186, 0.3), lowest(turned.head, p.lean, 0.6, 0.06, 0.144, 0.096, 0.18))
      const wide = Math.max(0.001, home)
      rest.scale.set(wide, wide * Math.min(1, Math.max(0.3, (under - 0.01) / PILLOW_TOP)), wide)
      jaw.rotation.z = turned.jaw
      pupils.position.set(eye.x + toChild.x * eye.r * 0.8 + p.gazeX * eye.r * 0.45, eye.y + toChild.y * eye.r * 0.8 + upChild.y * p.gazeY * eye.r * 0.4, toChild.z * eye.r * 0.8 + upChild.z * p.gazeY * eye.r * 0.4)
      // Half shut, each lid lies over the far side of its eye; shut, it has come forward over the pupil.
      for (const lid of lids) lid.rotation.set(-0.9 + p.lid * 1.7, 0, 0)
    },
  }
}

/** The three folk. Where each is and the way he faces are set each frame from where the toy has him. */
export function buildFolk(): Record<Who, FolkView> {
  const all = { king: king(), cook: cook(), dragon: dragon() }
  for (const view of Object.values(all)) {
    const place = FOLK[view.who]
    view.root.name = view.who
    view.root.userData.jamObject = view.who
    view.root.position.set(place.x, place.y, place.z)
    view.root.rotation.y = place.faces
    view.root.scale.setScalar(place.size)
  }
  return all
}
