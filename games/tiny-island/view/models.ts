import * as THREE from 'three'
import { CHIMNEY } from '../island'
import { LAND_R, LAND_Y, PEGS, RIM_IN, RIM_OUT, RIM_TOP, SHORE_R, TRAY_HALF, TRAY_TOP, type Kind } from '../toys'
import { Shape, rgb, type Rgb } from './shapes'

// Every shape in the game, built once at mount from flat-faced primitives.
// The toys are chunky and plain: no face but the sheep's two painted dots.
// The residents have the faces. Each thing stands on its own origin, facing
// +z, and its one moving part is a geometry of its own about its own pivot.

/** The milk-paint palette, as shown. */
export const C = {
  skyTop: rgb(0xffd3c4), skyLow: rgb(0xfff2d8), sun: rgb(0xfff7cf), cloud: rgb(0xfffaf1), cloudUnder: rgb(0xfbdccf),
  sea: rgb(0x8cc6cf), seaDeep: rgb(0x7dbac8), lagoon: rgb(0xb9e6dd), lagoonPale: rgb(0xc8eee2),
  sand: rgb(0xf7e4bd), grass: rgb(0xcfe8b2), grassDeep: rgb(0xbfdfa4),
  wood: rgb(0xe3c093), woodDeep: rgb(0xd4ad7d), bark: rgb(0xb98b63), slot: rgb(0x5f8fb4),
  cream: rgb(0xfbf0dc), coral: rgb(0xf08f7d), teal: rgb(0x6fb6b0), blue: rgb(0x5f8fb0), slate: rgb(0x7f90b4), butter: rgb(0xffe2a8), lamp: rgb(0xffe79a),
  rose: rgb(0xe58a8a), brick: rgb(0xd98b7a), glass: rgb(0x9ad4e0), leaf: rgb(0x62b08c), leafPale: rgb(0x86c79a),
  fleece: rgb(0xfdf6ea), plum: rgb(0x5a4a5c), ink: rgb(0x3c3350),
  cat: rgb(0xf6b27c), catPale: rgb(0xfff0de), pink: rgb(0xf08f9a),
  gull: rgb(0xfdfaf2), wing: rgb(0xb4c0d4), beak: rgb(0xf6a54c),
  wave: rgb(0x62b2c6), waveDeep: rgb(0x4f9db6), foam: rgb(0xf6fbf6), whale: rgb(0x8aa4d6), whalePale: rgb(0xa9bde4),
  islet: rgb(0xb9cdb8), isletTop: rgb(0xc9dcc0), white: rgb(0xfffdf8), hand: rgb(0xfff6e6),
} satisfies Record<string, Rgb>

const HALF = Math.PI / 2
const SHEEP = 1.25
/** A four-sided point with its base square to the axes. */
const wedge = (r: number, h: number): THREE.BufferGeometry => new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4)
/** A three-sided beam lying along x with one edge up. */
const ridge = (r: number, length: number): THREE.BufferGeometry => new THREE.CylinderGeometry(r, r, length, 3).rotateY(HALF).rotateZ(HALF)
/** A round button facing +z: an eye's pupil, a painted dot. */
const dot = (r: number): THREE.BufferGeometry => new THREE.CylinderGeometry(r, r, 0.03, 8).rotateX(HALF)

export type ToyModel = {
  body: THREE.BufferGeometry
  part: THREE.BufferGeometry
  /** Where the part turns, from the toy's origin. */
  pivot: readonly [number, number, number]
}

export function toyModel(kind: Kind): ToyModel {
  const body = new Shape(), part = new Shape()
  switch (kind) {
    case 'lighthouse': {
      body.post(0.58, 0.62, 0.22, 8, C.slate, { at: [0, 0.11, 0] })
      body.post(0.52, 0.6, 0.68, 8, C.coral, { at: [0, 0.56, 0] })
      body.post(0.45, 0.52, 0.6, 8, C.cream, { at: [0, 1.2, 0] })
      body.post(0.39, 0.45, 0.55, 8, C.coral, { at: [0, 1.775, 0] })
      body.post(0.56, 0.5, 0.1, 8, C.slate, { at: [0, 2.1, 0] })
      // Four thin posts hold the roof over the lamp.
      for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) body.box(0.07, 0.5, 0.07, C.slate, { at: [x, 2.4, z] })
      body.cone(0.5, 0.36, 8, C.blue, { at: [0, 2.83, 0] })
      body.lump(0.08, C.cream, { at: [0, 3.02, 0] })
      body.box(0.24, 0.38, 0.06, C.teal, { at: [0, 0.42, 0.585], turn: [-0.115, 0, 0] })
      // The lamp turns: a block of light.
      part.post(0.2, 0.2, 0.42, 6, C.lamp, { at: [0, 0, 0] })
      return { body: body.build(), part: part.build(0.02), pivot: [0, 2.4, 0] }
    }
    case 'boat': {
      // The bow points along +x.
      // A short, tubby hull: it has to turn about on its own ground.
      body.box(0.86, 0.34, 0.62, C.coral, { at: [-0.1, 0.2, 0] })
      body.add(wedge(0.438, 0.6), C.coral, { at: [0.63, 0.2, 0], turn: [0, 0, -HALF], size: [0.55, 1, 1] })
      body.box(0.88, 0.06, 0.66, C.cream, { at: [-0.1, 0.4, 0] })
      // The mast stands on the bow, so the whole deck behind it is clear: the sheep is as big as the boat.
      body.post(0.04, 0.05, 1.22, 6, C.bark, { at: [0.7, 0.89, 0] })
      body.lump(0.06, C.coral, { at: [0.7, 1.5, 0] })
      // The sail swings about the mast.
      const sail = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.06, 0.05, 0.02), new THREE.Vector3(-0.06, 0.92, 0.02), new THREE.Vector3(-0.8, 0.05, 0.02), new THREE.Vector3(-0.06, 0.05, -0.02), new THREE.Vector3(-0.8, 0.05, -0.02), new THREE.Vector3(-0.06, 0.92, -0.02)])
      part.add(sail, C.white)
      part.box(0.78, 0.05, 0.06, C.bark, { at: [-0.43, 0.03, 0] })
      // The hull is as long before its middle as behind it, so it keeps to its own ground when it flaps.
      return { body: body.build().translate(-0.2, 0, 0), part: part.build(0.02), pivot: [0.5, 0.5, 0] }
    }
    case 'sheep': {
      // Its four legs stand close under it: aboard the boat they all have to find the deck.
      for (const [x, z] of [[0.16, 0.22], [-0.16, 0.22], [0.16, -0.16], [-0.16, -0.16]]) body.post(0.07, 0.06, 0.32, 5, C.plum, { at: [x, 0.16, z] })
      body.lump(0.42, C.fleece, { at: [0, 0.58, 0], size: [0.9, 0.84, 1] }, true)
      body.lump(0.2, C.fleece, { at: [0.16, 0.86, -0.18] })
      body.lump(0.2, C.fleece, { at: [-0.17, 0.84, 0.05] })
      body.lump(0.17, C.fleece, { at: [0.05, 0.88, 0.22] })
      body.lump(0.11, C.fleece, { at: [0, 0.62, -0.38] })
      // The head nods from the neck. Two painted dots are its whole face.
      part.lump(0.2, C.plum, { at: [0, 0.03, 0.11], size: [0.92, 1, 1.12] }, true)
      part.box(0.08, 0.05, 0.16, C.plum, { at: [0.21, 0.1, 0.06], turn: [0, 0, -0.5] })
      part.box(0.08, 0.05, 0.16, C.plum, { at: [-0.21, 0.1, 0.06], turn: [0, 0, 0.5] })
      part.lump(0.13, C.fleece, { at: [0, 0.2, 0.04] })
      part.add(dot(0.04), C.white, { at: [0.09, 0.08, 0.3] })
      part.add(dot(0.04), C.white, { at: [-0.09, 0.08, 0.3] })
      // A fat sheep: a quarter bigger than it was modelled, so it is no smaller in the hand than the others.
      // Its middle is half-way between its nose and its tail, so it turns on its own ground.
      return { body: body.build().translate(0, 0, -0.05).scale(SHEEP, SHEEP, SHEEP), part: part.build().scale(SHEEP, SHEEP, SHEEP), pivot: [0, 0.7 * SHEEP, 0.19 * SHEEP] }
    }
    case 'tree': {
      body.post(0.2, 0.3, 0.12, 6, C.bark, { at: [0, 0.06, 0] })
      body.post(0.13, 0.2, 0.86, 6, C.bark, { at: [0, 0.55, 0] })
      // The crown is the part: it sways, shrinks as it is eaten and flies off when the tree is shaken.
      part.lump(0.62, C.leaf, { at: [0, 0.5, 0] }, true)
      part.lump(0.38, C.leafPale, { at: [0.25, 0.22, 0.12] })
      part.lump(0.37, C.leafPale, { at: [-0.25, 0.28, -0.1] })
      part.lump(0.34, C.leaf, { at: [0.04, 0.98, 0] })
      return { body: body.build(), part: part.build(0.05), pivot: [0, 0.82, 0] }
    }
    case 'house': {
      body.box(1.1, 0.75, 0.95, C.butter, { at: [0, 0.375, 0] })
      // The door and the shutters are pieces of their own (HOUSE_BITS): behind the door the house is dark.
      body.box(0.24, 0.4, 0.02, C.plum, { at: [0, 0.21, 0.476] })
      body.box(0.24, 0.24, 0.05, C.glass, { at: [0.36, 0.44, 0.49] })
      body.box(0.24, 0.24, 0.05, C.glass, { at: [-0.36, 0.44, 0.49] })
      // The roof is a lid, and takes the chimney with it.
      part.add(ridge(0.5, 1.2), C.rose, { at: [0, 0.25, 0], size: [1, 1, 1.2] })
      part.box(0.2, 0.46, 0.2, C.brick, { at: [CHIMNEY.x, CHIMNEY.y - 0.75 - 0.27, CHIMNEY.z] })
      part.box(0.26, 0.06, 0.26, C.cream, { at: [CHIMNEY.x, CHIMNEY.y - 0.75 - 0.03, CHIMNEY.z] })
      return { body: body.build(), part: part.build(), pivot: [0, 0.75, 0] }
    }
  }
}

/** The house's door and its two shutters, in the house's own units: where each is hinged, its size, which way it lies from its hinge, and how far it swings open. */
export const HOUSE_BITS: readonly { hinge: readonly [number, number, number]; size: readonly [number, number, number]; out: 1 | -1; swing: number; color: Rgb }[] = [
  { hinge: [-0.13, 0.21, 0.5], size: [0.26, 0.42, 0.05], out: 1, swing: -1.7, color: C.teal },
  { hinge: [0.49, 0.44, 0.5], size: [0.1, 0.28, 0.04], out: 1, swing: -1.3, color: C.coral },
  { hinge: [-0.49, 0.44, 0.5], size: [0.1, 0.28, 0.04], out: -1, swing: 1.3, color: C.coral },
]

/** One plain box, a unit each way: the view sizes and tints each door and shutter from it. */
export function bitShape(): THREE.BufferGeometry {
  return new Shape().box(1, 1, 1, [1, 1, 1]).build(0, false)
}

/** The lamp's beam: a hollow cone from the lamp, level, along +z. */
export function beamShape(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.7, 3.4, 10, 1, true).rotateX(-HALF).translate(0, -0.2, 1.8)
}

export type CatModel = { body: THREE.BufferGeometry; head: THREE.BufferGeometry; pupils: THREE.BufferGeometry; tail: THREE.BufferGeometry; paw: THREE.BufferGeometry }
export const CAT = { head: [0, 0.98, 0.08], pupils: [0, 0.3, 0.352], tail: [0, 0.16, -0.3], paw: [-0.17, 0.5, 0.34] } as const

export function catModel(): CatModel {
  const body = new Shape(), head = new Shape(), pupils = new Shape(), tail = new Shape(), paw = new Shape()
  body.lump(0.5, C.cat, { at: [0, 0.5, 0], size: [1, 1.06, 0.95] }, true)
  body.lump(0.33, C.catPale, { at: [0, 0.44, 0.27], size: [0.9, 1, 0.62] })
  body.lump(0.24, C.cat, { at: [0.36, 0.2, 0.06] })
  body.lump(0.24, C.cat, { at: [-0.36, 0.2, 0.06] })
  body.post(0.09, 0.1, 0.44, 6, C.cat, { at: [0.17, 0.24, 0.36] })
  body.lump(0.105, C.catPale, { at: [0.17, 0.07, 0.42] })
  // The other front leg is its own piece: it pats.
  paw.post(0.09, 0.1, 0.44, 6, C.cat, { at: [0, -0.26, 0.02] })
  paw.lump(0.105, C.catPale, { at: [0, -0.43, 0.08] })
  head.lump(0.36, C.cat, { at: [0, 0.22, 0], size: [1.14, 0.92, 0.95] }, true)
  for (const side of [1, -1]) {
    head.cone(0.14, 0.26, 4, C.cat, { at: [side * 0.24, 0.56, 0], turn: [0, 0, -side * 0.25] })
    head.cone(0.07, 0.14, 4, C.pink, { at: [side * 0.24, 0.53, 0.05], turn: [0, 0, -side * 0.25] })
    head.lump(0.1, C.white, { at: [side * 0.15, 0.3, 0.3], size: [1, 1, 0.5] }, true)
    head.lump(0.11, C.catPale, { at: [side * 0.08, 0.13, 0.31], size: [1.1, 0.8, 0.8] })
  }
  head.lump(0.05, C.pink, { at: [0, 0.18, 0.4] })
  for (const side of [1, -1]) pupils.add(dot(0.055), C.ink, { at: [side * 0.15, 0, 0] })
  // The tail curls up and back in three pieces.
  tail.post(0.08, 0.1, 0.42, 6, C.cat, { at: [0, 0.14, -0.1], turn: [-0.6, 0, 0] })
  tail.post(0.07, 0.08, 0.4, 6, C.cat, { at: [0, 0.46, -0.2], turn: [-0.1, 0, 0] })
  tail.lump(0.1, C.catPale, { at: [0, 0.7, -0.2] })
  return { body: body.build(), head: head.build(), pupils: pupils.build(0, false), tail: tail.build(), paw: paw.build() }
}

export type GullModel = { body: THREE.BufferGeometry; head: THREE.BufferGeometry; jaw: THREE.BufferGeometry; pupils: THREE.BufferGeometry; wing: THREE.BufferGeometry }
export const GULL = { head: [0, 1.42, 0.3], jaw: [0, 0.33, 0.28], pupils: [0, 0.5, 0.345], wing: [0.5, 1.2, -0.02] } as const

export function gullModel(): GullModel {
  const body = new Shape(), head = new Shape(), jaw = new Shape(), pupils = new Shape(), wing = new Shape()
  for (const side of [1, -1]) {
    body.post(0.035, 0.035, 0.42, 5, C.beak, { at: [side * 0.16, 0.21, 0] })
    body.box(0.2, 0.04, 0.3, C.beak, { at: [side * 0.16, 0.02, 0.08] })
  }
  body.lump(0.6, C.gull, { at: [0, 0.95, -0.05], size: [1, 0.95, 1.25] }, true)
  body.add(wedge(0.3, 0.6), C.wing, { at: [0, 1, -0.95], turn: [-HALF, 0, 0], size: [1, 1, 0.45] })
  // One wing, hung from its shoulder; the view mirrors it for the other side.
  wing.box(0.1, 0.8, 0.78, C.wing, { at: [0.04, -0.36, -0.06] })
  wing.add(wedge(0.39, 0.34), C.plum, { at: [0.04, -0.93, -0.06], turn: [Math.PI, 0, 0], size: [0.13, 1, 1] })
  head.post(0.17, 0.22, 0.34, 6, C.gull, { at: [0, 0.1, 0] })
  head.lump(0.32, C.gull, { at: [0, 0.42, 0.05] }, true)
  head.add(wedge(0.15, 0.56), C.beak, { at: [0, 0.4, 0.58], turn: [HALF, 0, 0], size: [1, 1, 0.6] })
  for (const side of [1, -1]) head.lump(0.1, C.white, { at: [side * 0.17, 0.5, 0.29], size: [1, 1, 0.5] }, true)
  jaw.add(wedge(0.11, 0.42), C.beak, { at: [0, -0.02, 0.23], turn: [HALF, 0, 0], size: [1, 1, 0.5] })
  for (const side of [1, -1]) pupils.add(dot(0.055), C.ink, { at: [side * 0.17, 0, 0] })
  return { body: body.build(), head: head.build(), jaw: jaw.build(), pupils: pupils.build(0, false), wing: wing.build() }
}

/** The bell buoy: the gull stands on its top, 1.75 above the water. */
export function buoyShape(): THREE.BufferGeometry {
  const s = new Shape()
  s.post(0.78, 0.86, 0.5, 8, C.coral, { at: [0, 0.2, 0] })
  s.post(0.3, 0.7, 0.55, 8, C.cream, { at: [0, 0.72, 0] })
  s.post(0.24, 0.3, 0.3, 8, C.coral, { at: [0, 1.145, 0] })
  s.post(0.2, 0.24, 0.3, 8, C.cream, { at: [0, 1.445, 0] })
  s.post(0.36, 0.3, 0.155, 8, C.coral, { at: [0, 1.6725, 0] })
  s.lump(0.13, C.lamp, { at: [0, 1.05, 0.42] })
  return s.build()
}

export type WaveModel = { body: THREE.BufferGeometry; lids: THREE.BufferGeometry }

/** The wave: a curl seen from the side, breaking toward -x, with two sleepy eyes on the flank that faces +z. */
export function waveModel(): WaveModel {
  const body = new Shape(), lids = new Shape()
  body.lump(1.5, C.waveDeep, { at: [0.2, 0.05, 0], size: [1.55, 0.5, 1.2] }, true)
  // The curl is long: at work it is drawn three times as long again, and five toys ride it side by side.
  body.add(new THREE.TorusGeometry(0.85, 0.44, 5, 8, Math.PI * 1.3), C.wave, { at: [0, 1, 0], size: [1, 1, 3.4] })
  // Foam along the lip.
  for (const [x, y, z, r] of [[-0.72, 0.5, 0.85, 0.3], [-0.76, 0.52, -0.15, 0.34], [-0.7, 0.5, -1, 0.28], [-0.95, 0.85, 0.35, 0.22], [-0.1, 1.98, 0.2, 0.2], [0.35, 1.9, -0.7, 0.17]]) body.lump(r, C.foam, { at: [x, y, z] })
  for (const x of [-0.42, 0.22]) {
    body.lump(0.2, C.white, { at: [x, 1.52, 1.38], size: [1, 1, 0.5] }, true)
    // The pupils sit low and toward the island: its eyes rest on it.
    body.add(dot(0.085), C.ink, { at: [x - 0.07, 1.45, 1.485] })
    // A heavy lid over each eye: the view slides it up to wake the wave.
    lids.lump(0.215, C.wave, { at: [x, 1.6, 1.42], size: [1.12, 0.7, 0.62] }, true)
  }
  return { body: body.build(), lids: lids.build() }
}

export type WhaleModel = { body: THREE.BufferGeometry; pupil: THREE.BufferGeometry }
export const WHALE_EYE = [1.25, 0.34, 0.74] as const

/** The whale: a back, a tail and one eye, looking toward +x. */
export function whaleModel(): WhaleModel {
  const body = new Shape(), pupil = new Shape()
  body.lump(1, C.whale, { at: [0, 0.02, 0], size: [2, 0.8, 1.1] }, true)
  body.post(0.16, 0.3, 0.7, 6, C.whale, { at: [-1.95, 0.42, 0], turn: [0, 0, 0.9] })
  for (const side of [1, -1]) body.add(wedge(0.26, 0.6), C.whalePale, { at: [-2.3, 0.78, side * 0.3], turn: [side * 1.2, 0, 0.3], size: [1, 1, 0.4] })
  body.lump(0.14, C.white, { at: [1.25, 0.34, 0.66], size: [1, 1, 0.5] }, true)
  body.post(0.09, 0.09, 0.03, 6, C.ink, { at: [0.5, 0.815, 0] })
  pupil.add(dot(0.07), C.ink)
  return { body: body.build(), pupil: pupil.build(0, false) }
}

/** The turntable: the island, the shallow sea round it and the wooden rim with its pegs. One geometry, one draw. */
export function turntableShape(): THREE.BufferGeometry {
  const s = new Shape()
  s.disc(RIM_IN + 0.02, 6, C.lagoon, C.lagoonPale, { at: [0, 0.02, 0] }, true, 5)
  s.add(new THREE.CylinderGeometry(LAND_R, SHORE_R, LAND_Y - 0.02, 24, 1, true), C.sand, { at: [0, (LAND_Y + 0.02) / 2, 0] })
  s.disc(LAND_R, 5, C.grass, C.grassDeep, { at: [0, LAND_Y, 0] }, false, 9)
  // Painted on, flat: daisies in the grass and lily pads in the shallows. A toy stands on them as on the ground.
  for (const [x, z, r] of [[-2.2, 0.9, 0.1], [-1.5, 2.1, 0.08], [0.7, 2.5, 0.1], [2.3, 1.2, 0.09], [2.5, -0.6, 0.08], [1.2, -2.3, 0.1], [-0.9, -2.5, 0.09], [-2.4, -1.1, 0.1], [-0.4, 0.6, 0.08], [0.9, -0.5, 0.07]] as const) {
    s.post(r, r, 0.004, 6, C.white, { at: [x, LAND_Y + 0.004, z] })
    s.post(r * 0.45, r * 0.45, 0.004, 6, C.lamp, { at: [x, LAND_Y + 0.008, z] })
  }
  for (const [x, z, r] of [[-4.6, 1.6, 0.34], [-4.1, 2.3, 0.22], [3.9, 3, 0.3], [4.8, -1.5, 0.32], [-3.2, -3.6, 0.28], [1.6, -4.6, 0.24]] as const) {
    s.post(r, r, 0.004, 7, C.leafPale, { at: [x, 0.026, z] })
    s.post(r * 0.3, r * 0.3, 0.004, 5, C.pink, { at: [x + r * 0.2, 0.03, z - r * 0.1] })
  }
  const top = RIM_TOP
  // The outer wall goes down under the water, so a rocking island never shows its underside.
  s.add(new THREE.CylinderGeometry(RIM_OUT, RIM_OUT, top + 0.4, 32, 1, true), C.wood, { at: [0, (top - 0.4) / 2, 0] })
  s.add(new THREE.CylinderGeometry(RIM_IN, RIM_IN, top, 32, 1, true), C.woodDeep, { at: [0, top / 2, 0], size: [-1, 1, 1] })
  s.add(new THREE.RingGeometry(RIM_IN, RIM_OUT, 32), C.wood, { at: [0, top, 0], turn: [-HALF, 0, 0] })
  for (let i = 0; i < PEGS; i++) {
    const a = ((i + 0.5) / PEGS) * Math.PI * 2, r = (RIM_IN + RIM_OUT) / 2
    s.post(0.19, 0.23, 0.3, 6, i % 2 === 0 ? C.coral : C.teal, { at: [Math.cos(a) * r, top + 0.15, Math.sin(a) * r] })
  }
  return s.build(0.045)
}

/**
 * The open sea: facets from under the turntable's rim out to the round edge of the diorama, which is the
 * horizon. It has a hole where the turntable is, so the island can dip and rock in it.
 */
export function seaShape(farZ: number): THREE.BufferGeometry {
  const s = new Shape(), rings = 7, around = 36, inner = (RIM_IN + RIM_OUT) / 2
  // The edge is a circle about a point in front of the island, so the sea reaches further toward the child.
  const middle = 9, reach = middle - farZ
  const edge = (a: number): number => {
    const sin = Math.sin(a)
    return middle * sin + Math.sqrt(reach * reach - middle * middle * (1 - sin * sin))
  }
  let seed = 3
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const rows: THREE.Vector3[][] = []
  for (let ring = 0; ring <= rings; ring++) {
    const row: THREE.Vector3[] = []
    for (let i = 0; i < around; i++) {
      const fixed = ring === 0 || ring === rings
      const a = ((i + (fixed ? 0 : (next() - 0.5) * 0.4)) / around) * Math.PI * 2
      // The rings crowd toward the turntable, where the eye is.
      const t = Math.pow((ring + (fixed ? 0 : (next() - 0.5) * 0.4)) / rings, 1.5)
      const r = inner + (edge(a) - inner) * t
      row.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    rows.push(row)
  }
  // A facet, wound so that it faces up.
  const facet = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3): void => {
    const up = (q.z - p.z) * (r.x - p.x) - (q.x - p.x) * (r.z - p.z)
    s.add(new THREE.BufferGeometry().setFromPoints(up >= 0 ? [p, q, r] : [p, r, q]), next() < 0.5 ? C.sea : C.seaDeep, {}, true)
  }
  for (let ring = 0; ring < rings; ring++) {
    const near = rows[ring], far = rows[ring + 1]
    for (let i = 0; i < around; i++) {
      const j = (i + 1) % around
      // The squares are cut one way and then the other, so the facets lean both ways.
      if ((i + ring) % 2 === 0) { facet(near[i], near[j], far[i]); facet(near[j], far[j], far[i]) }
      else { facet(near[i], near[j], far[j]); facet(near[i], far[j], far[i]) }
    }
  }
  return s.build(0.03, false)
}

/** What stands still: the tray with its five slots, and the far islets. */
export function settingShape(trayZ: number, slots: readonly number[]): THREE.BufferGeometry {
  const s = new Shape()
  const plank = (TRAY_HALF.z * 2) / 4
  for (let i = 0; i < 4; i++) s.box(TRAY_HALF.x * 2 - (i % 2) * 0.16, TRAY_TOP - 0.002, plank - 0.05, i % 2 === 0 ? C.wood : C.woodDeep, { at: [0, (TRAY_TOP - 0.002) / 2, trayZ + (i - 1.5) * plank] })
  for (const x of slots) s.post(0.94, 0.94, 0.002, 10, C.slot, { at: [x, TRAY_TOP - 0.001, trayZ] })
  // Two far islets at the back left, pale, clear of every post the residents take on a wide surface and of the wave's road.
  for (const [x, z, r, h] of [[-5.6, -5.9, 0.95, 0.6], [-6.9, -5, 0.55, 0.32]]) {
    s.post(r * 0.45, r, h, 7, C.islet, { at: [x, h / 2, z] })
    s.lump(r * 0.36, C.isletTop, { at: [x - r * 0.1, h + r * 0.1, z] })
  }
  // Rocks in the near sea at the front right, where nothing else is.
  for (const [x, z, r] of [[7.1, 5.5, 0.55], [7.7, 4.7, 0.35], [6.6, 6.3, 0.26]] as const) {
    s.lump(r, C.islet, { at: [x, r * 0.25, z], size: [1, 0.7, 1] })
    s.lump(r * 0.45, C.isletTop, { at: [x + r * 0.2, r * 0.75, z - r * 0.1] })
  }
  return s.build()
}

/** One chunky cloud, about three wide and two tall, with its middle at the origin. The view stands several beyond the sea. */
export function cloudShape(): THREE.BufferGeometry {
  const s = new Shape()
  for (const [dx, dy, r] of [[0, 0, 0.62], [0.72, -0.12, 0.48], [-0.72, -0.14, 0.46], [0.3, 0.36, 0.4], [-1.2, -0.24, 0.3], [1.2, -0.22, 0.3]]) {
    s.lump(r, dy < -0.2 ? C.cloudUnder : C.cloud, { at: [dx, dy, 0], size: [1, 0.72, 0.6] }, r > 0.45)
  }
  return s.build(0.02)
}

/**
 * The sky: one upright card behind the sea, cream where it meets the water and peach at the top of the frame,
 * with the sun on it. Flat colour, no light. It is made for one surface: `low` and `high` are the heights
 * between which the colour runs, `half` half its width, and the sun is given where it stands on the card.
 */
export function skyShape(z: number, low: number, high: number, half: number, sun: { x: number; y: number; r: number }): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = []
  const quad = (y0: number, y1: number, from: Rgb, to: Rgb): void => {
    for (const [x, y] of [[-half, y0], [half, y0], [half, y1], [-half, y0], [half, y1], [-half, y1]]) {
      positions.push(x, y, z)
      colors.push(...(y === y0 ? from : to))
    }
  }
  const tall = high - low
  quad(low - tall * 6, low, C.skyLow, C.skyLow)
  quad(low, high, C.skyLow, C.skyTop)
  quad(high, high + tall * 2, C.skyTop, C.skyTop)
  // The sun: a ten-sided disc with rays round it.
  const disc = (r: number, forward: number, color: Rgb): void => {
    for (let i = 0; i < 10; i++) {
      const a = ((i + 0.5) / 10) * Math.PI * 2, b = ((i + 1.5) / 10) * Math.PI * 2
      positions.push(sun.x, sun.y, z + forward, sun.x + Math.cos(a) * r, sun.y + Math.sin(a) * r, z + forward, sun.x + Math.cos(b) * r, sun.y + Math.sin(b) * r, z + forward)
      colors.push(...color, ...color, ...color)
    }
  }
  // Round it, ten short rays in a paler colour, each a pointed wedge: a sun, and no ring within a ring.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, half = 0.17, ray: Rgb = [1, 0.955, 0.86]
    positions.push(sun.x + Math.cos(a - half) * sun.r * 0.98, sun.y + Math.sin(a - half) * sun.r * 0.98, z + 0.3, sun.x + Math.cos(a) * sun.r * 1.5, sun.y + Math.sin(a) * sun.r * 1.5, z + 0.3, sun.x + Math.cos(a + half) * sun.r * 0.98, sun.y + Math.sin(a + half) * sun.r * 0.98, z + 0.3)
    colors.push(...ray, ...ray, ...ray)
  }
  disc(sun.r, 0.6, C.sun)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

/** One lump for whatever flies in pieces: smoke balls, drops, leaves. The view tints each. */
export function puffShape(): THREE.BufferGeometry {
  return new Shape().lump(1, [1, 1, 1]).build(0.03, false)
}

/** The hand of the idle guidance: a wooden mitten with one finger out and a coral cuff. The fingertip is its origin, and it points up its own y. */
export function handShape(): THREE.BufferGeometry {
  const s = new Shape()
  s.post(0.1, 0.13, 0.62, 6, C.hand, { at: [0, -0.31, 0] })
  s.box(0.62, 0.6, 0.26, C.hand, { at: [0.06, -0.9, 0] })
  s.post(0.09, 0.11, 0.36, 6, C.hand, { at: [0.44, -0.78, 0], turn: [0, 0, -0.9] })
  s.box(0.5, 0.26, 0.3, C.coral, { at: [0.06, -1.33, 0] })
  return s.build(0.01)
}
