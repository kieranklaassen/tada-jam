import type { FacePlan } from './faces'
import { FAR_HILL, farGroundAt, groundAt, GROUND, PARADE_RING, viewFor } from './layout'
import { PALETTE, SETTING_COLOURS as C } from './palette'
import type { Pillow, Vec3 } from './shapes'

// The place the parade is in: a seaside of pool toys, in the look's own forms.
// Behind, a pale sea with three islands, lollipop trees and a lighthouse; in
// the middle, a hill with two palms to the left and the far hill to the right
// with a hut on it; in front, on the air bed, a paddling pool, a few flowers
// and a beach ball. Pure data. Everything that stands still is one list of
// pillows, which the scenery merges into one mesh and draws once; each pillow
// carries its own haze, so far things are pale without a second material.
//
// Three small toys live in it and take no part in the task: a whale in the
// pool, a keeper bird on the far hill, and the ball. They are meshes of their
// own, one draw each, and the theatre moves them.
//
// What it must not do is in the tests beside this file: nothing of it stands
// behind the row of balloons, which keeps bare sky; nothing is in the
// grown-up's corner; and every colour is paler than every balloon.

/** How far the eye stands from the friends' plane on the surface the setting was laid out for. */
const EYE = viewFor(1180, 820).distance
/** How much larger a thing at depth `z` must be than in the friends' plane to be seen the same size. */
const far = (z: number): number => (EYE - z) / EYE

/** A mound: the top of a pillow, by its middle and its half-sizes. */
type Mound = { x: number; y: number; z: number; rx: number; ry: number; rz: number }

function topOf(mound: Mound, x: number, z: number): number {
  const dx = (x - mound.x) / mound.rx, dz = (z - mound.z) / mound.rz
  return mound.y + mound.ry * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz))
}

function mound(m: Mound, colour: string, haze: number): Pillow {
  return { at: [m.x, m.y, m.z], size: [m.rx, m.ry, m.rz], colour, haze, detail: [40, 16] }
}

const SMALL: readonly [number, number] = [14, 10]
const TINY: readonly [number, number] = [10, 8]

// The sea, three islands in it and the hill to the left, from the back forwards.
const SEA: Mound = { x: 0, y: -11.4, z: -44, rx: 80, ry: 5.6, rz: 3 }
const LILAC: Mound = { x: -13.5, y: -6.6, z: -38, rx: 9, ry: 9, rz: 5 }
const MINT: Mound = { x: 3.2, y: -7.4, z: -36, rx: 7.2, ry: 8, rz: 5 }
const CREAM: Mound = { x: 17.8, y: -6.9, z: -34.5, rx: 7.6, ry: 9, rz: 5 }
const LEFT: Mound = { x: -13.5, y: GROUND - 5.2, z: -15.5, rx: 10.5, ry: 6.6, rz: 5 }

/** A lollipop tree: a thin trunk and a round crown, standing on a mound. */
function tree(on: Mound, x: number, z: number, tall: number, colour: string, haze: number): Pillow[] {
  const foot = topOf(on, x, z) - 0.1
  return [
    { at: [x, foot + tall * 0.3, z], size: [tall * 0.07, tall * 0.34, tall * 0.07], colour: C.sand, haze, detail: TINY },
    { at: [x, foot + tall * 0.72, z], size: [tall * 0.3, tall * 0.33, tall * 0.28], colour, haze, detail: SMALL },
  ]
}

/** A palm: a trunk of ringed pillows that leans a little, and a crown of long leaves with two nuts under it. */
function palm(on: Mound, x: number, z: number, tall: number, lean: number, haze: number): Pillow[] {
  const foot = topOf(on, x, z) - 0.25, parts: Pillow[] = [], rings = 5, k = tall / 4.6
  for (let i = 0; i < rings; i++) {
    const u = i / (rings - 1)
    parts.push({ at: [x + lean * u * u * tall * 0.3, foot + (0.4 + u * 0.82 * 4.6) * k, z], size: [(0.36 - u * 0.1) * k, 0.56 * k, (0.36 - u * 0.1) * k], turn: [0, 0, -lean * u * 0.5], colour: C.sand, haze, detail: SMALL })
  }
  const cx = x + lean * tall * 0.3, cy = foot + 4.5 * k
  for (const angle of [-0.5, 0.05, 0.6, Math.PI - 0.6, Math.PI - 0.05, Math.PI + 0.5]) {
    parts.push({ at: [cx + Math.cos(angle) * 1.25 * k, cy + Math.sin(angle) * 1.25 * k - Math.abs(Math.cos(angle)) * 0.12 * k, z], size: [1.35 * k, 0.24 * k, 0.4 * k], turn: [0, 0, angle], colour: C.leaf, haze, detail: SMALL })
  }
  parts.push({ at: [cx - 0.24 * k, cy - 0.34 * k, z + 0.2 * k], size: [0.2 * k, 0.2 * k, 0.2 * k], colour: C.coral, haze, detail: TINY })
  parts.push({ at: [cx + 0.2 * k, cy - 0.4 * k, z + 0.2 * k], size: [0.2 * k, 0.2 * k, 0.2 * k], colour: C.coral, haze, detail: TINY })
  return parts
}

/** An inflatable flower on a short stalk, its face to the child. */
function flower(x: number, z: number, size: number): Pillow[] {
  const foot = groundAt(x, z), head = foot + size * 1.5, parts: Pillow[] = [{ at: [x, foot + size * 0.7, z], size: [size * 0.1, size * 0.8, size * 0.1], colour: C.leaf, detail: TINY }]
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.3
    parts.push({ at: [x + Math.cos(angle) * size * 0.42, head + Math.sin(angle) * size * 0.42, z], size: [size * 0.3, size * 0.3, size * 0.16], colour: C.petal, detail: TINY })
  }
  parts.push({ at: [x, head, z + size * 0.1], size: [size * 0.26, size * 0.26, size * 0.2], colour: C.pollen, detail: TINY })
  return parts
}

/** Where the paddling pool is, on the air bed in front and to the right, and how wide. */
export const POOL = { x: 5.15, z: 3.3, radius: 1.35 } as const
/** Where the beach ball rests, in front and to the left, and its radius. */
export const BALL = { x: -4.9, z: 3.8, radius: 0.52 } as const
/** Where the hut stands on the far hill, inside the ring the parade walks, and where its keeper stands in front of it. */
export const HUT = { x: FAR_HILL.x + 0.3, z: FAR_HILL.z + PARADE_RING.forward - 0.6 } as const
export const KEEPER = { x: FAR_HILL.x - 0.9, z: FAR_HILL.z + PARADE_RING.forward + 0.9 } as const

function pool(): Pillow[] {
  const foot = groundAt(POOL.x, POOL.z), parts: Pillow[] = [], pieces = 14
  // The wall: a ring of fat pillows.
  for (let i = 0; i < pieces; i++) {
    const angle = (i / pieces) * Math.PI * 2
    parts.push({ at: [POOL.x + Math.cos(angle) * POOL.radius, foot + 0.3, POOL.z + Math.sin(angle) * POOL.radius], size: [0.4, 0.34, 0.4], colour: C.aqua, detail: SMALL })
  }
  parts.push({ at: [POOL.x, foot + 0.36, POOL.z], size: [POOL.radius, 0.06, POOL.radius], colour: C.water, detail: [20, 8] })
  return parts
}

function hut(): Pillow[] {
  const foot = farGroundAt(HUT.x, HUT.z) - 0.15, haze = 0.24
  return [
    { at: [HUT.x, foot + 0.8, HUT.z], size: [1.1, 0.9, 0.9], colour: C.petal, panels: 6, haze, detail: [20, 12] },
    // The roof: a fat cap, like a mushroom's.
    { at: [HUT.x, foot + 1.75, HUT.z], size: [1.4, 0.55, 1.15], colour: C.coral, haze, detail: [20, 12] },
    { at: [HUT.x, foot + 2.32, HUT.z], size: [0.16, 0.2, 0.16], colour: C.petal, haze, detail: TINY },
    // The door: a round pale opening, low in the front.
    { at: [HUT.x, foot + 0.5, HUT.z + 0.84], size: [0.36, 0.48, 0.1], colour: C.aqua, haze, detail: SMALL },
  ]
}

function lighthouse(): Pillow[] {
  const x = 8.6, z = MINT.z + 0.6, foot = topOf(MINT, x, z) - 0.2, haze = 0.42
  return [
    { at: [x, foot + 0.6, z], size: [0.62, 0.7, 0.62], colour: C.petal, haze, detail: SMALL },
    { at: [x, foot + 1.5, z], size: [0.54, 0.6, 0.54], colour: C.coral, haze, detail: SMALL },
    { at: [x, foot + 2.3, z], size: [0.46, 0.55, 0.46], colour: C.petal, haze, detail: SMALL },
    { at: [x, foot + 2.95, z], size: [0.56, 0.24, 0.56], colour: C.coral, haze, detail: SMALL },
  ]
}

/** Everything of the setting that stands still, as one list: one mesh, one draw. */
export const SETTING: readonly Pillow[] = [
  mound(SEA, C.sea, 0.3),
  mound(LILAC, C.lilacHill, 0.4),
  mound(MINT, C.mintHill, 0.4),
  mound(CREAM, C.creamHill, 0.4),
  ...tree(LILAC, -18, -36.2, 2.2, C.mintHill, 0.42),
  ...tree(LILAC, -13.6, -35.4, 2.8, C.leaf, 0.42),
  ...tree(LILAC, -9.2, -36.4, 2.0, C.mintHill, 0.42),
  ...tree(MINT, 0.4, -33.8, 2.4, C.leaf, 0.42),
  ...tree(MINT, 5.2, -33.6, 1.9, C.lilacHill, 0.42),
  ...tree(CREAM, 14.6, -32.6, 2.3, C.leaf, 0.42),
  ...tree(CREAM, 19.4, -32.4, 1.8, C.mintHill, 0.42),
  ...lighthouse(),
  mound(LEFT, C.peachHill, 0.2),
  ...palm(LEFT, -7.9, -13.2, 4.3, -0.3, 0.16),
  ...palm(LEFT, -11.3, -14.4, 3.2, 0.3, 0.18),
  ...tree(LEFT, -6.2, -13.4, 1.5, C.mintHill, 0.16),
  ...hut(),
  ...pool(),
  ...flower(-2.7, 3.5, 0.42),
  ...flower(1.6, 3.9, 0.36),
  ...flower(-6.4, 2.0, 0.4),
  ...flower(3.2, 2.7, 0.34),
]

export type ToyName = 'whale' | 'keeper' | 'ball'

/** A toy of the setting: its pillows, standing with its feet at y = 0 and facing +z, its face, and where the face's parts ride. */
export type Toy = { pillows: Pillow[]; face: FacePlan; tall: number; haze: number }

/** The whale in the paddling pool: round, with a pale belly and a tail up behind. */
export const WHALE: Toy = {
  pillows: [
    { at: [0, 0.62, 0], size: [0.86, 0.62, 0.74], colour: C.whale, detail: [20, 14] },
    { at: [0, 0.4, 0.14], size: [0.7, 0.4, 0.66], colour: C.belly, detail: [16, 10] },
    { at: [-0.86, 0.6, -0.1], size: [0.26, 0.14, 0.3], turn: [0, 0, 0.5], colour: C.whale, detail: SMALL },
    { at: [0.86, 0.6, -0.1], size: [0.26, 0.14, 0.3], turn: [0, 0, -0.5], colour: C.whale, detail: SMALL },
    { at: [0, 1.0, -0.72], size: [0.16, 0.36, 0.16], turn: [-0.6, 0, 0], colour: C.whale, detail: SMALL },
    { at: [-0.26, 1.34, -0.9], size: [0.3, 0.12, 0.2], turn: [0, 0, -0.4], colour: C.whale, detail: SMALL },
    { at: [0.26, 1.34, -0.9], size: [0.3, 0.12, 0.2], turn: [0, 0, 0.4], colour: C.whale, detail: SMALL },
  ],
  face: { eye: [0.36, 0.84, 0.6], eyeSize: 0.13, brows: false, mouth: [0, 0.52, 0.78], mouthWide: 0.5, ink: PALETTE.ink, whites: true },
  tall: 1.3,
  haze: 0,
}

/** The keeper of the far hill: a round bird with a little beak, two stub wings and a tuft. */
export const KEEPER_TOY: Toy = {
  pillows: [
    { at: [0, 0.66, 0], size: [0.62, 0.66, 0.56], colour: C.keeper, detail: [18, 12] },
    { at: [0, 0.66, 0.56], size: [0.16, 0.1, 0.2], colour: C.coral, detail: TINY },
    { at: [-0.62, 0.62, 0], size: [0.16, 0.3, 0.24], turn: [0, 0, 0.4], colour: C.keeper, detail: TINY },
    { at: [0.62, 0.62, 0], size: [0.16, 0.3, 0.24], turn: [0, 0, -0.4], colour: C.keeper, detail: TINY },
    { at: [0, 1.36, -0.04], size: [0.09, 0.18, 0.09], turn: [0.5, 0, 0], colour: C.coral, detail: TINY },
    { at: [-0.24, 0.05, 0.14], size: [0.18, 0.07, 0.24], colour: C.coral, detail: TINY },
    { at: [0.24, 0.05, 0.14], size: [0.18, 0.07, 0.24], colour: C.coral, detail: TINY },
  ],
  face: { eye: [0.24, 0.88, 0.46], eyeSize: 0.12, brows: false, mouth: null, mouthWide: 0, ink: PALETTE.ink, whites: true },
  tall: 1.5,
  haze: 0.24,
}

/** The beach ball: one pillow with six welded panels. */
export const BALL_TOY: Toy = {
  pillows: [{ at: [0, BALL.radius, 0], size: [BALL.radius, BALL.radius, BALL.radius], turn: [0.5, 0, 0.3], colour: C.ball, panels: 6, detail: [20, 14] }],
  face: { eye: [0, 0, 0], eyeSize: 0, brows: false, mouth: null, mouthWide: 0, ink: PALETTE.ink, whites: false },
  tall: BALL.radius * 2,
  haze: 0,
}

export const TOYS: Record<ToyName, Toy> = { whale: WHALE, keeper: KEEPER_TOY, ball: BALL_TOY }

/** The face printed on a cloud, in the cloud's own space: asleep until it is squeezed, and pale. */
export const CLOUD_FACE: FacePlan = { eye: [0.42, 0.0, 0.66], eyeSize: 0.13, brows: false, mouth: [0, -0.2, 0.7], mouthWide: 0.34, ink: C.cloudInk, whites: false }

/** The top of a pillow of the setting as it is seen, in the friends' plane, and its left and right edges: for the tests. */
export function seenBox(pillow: Pillow): { left: number; right: number; top: number; bottom: number; z: number } {
  // A turned pillow reaches no further than its longest half-size.
  const turned = pillow.turn !== undefined && (pillow.turn[0] !== 0 || pillow.turn[2] !== 0), most = Math.max(...pillow.size)
  const rx = turned ? most : pillow.size[0], ry = turned ? most : pillow.size[1]
  const [x, y, z] = pillow.at as Vec3, scale = 1 / far(z + pillow.size[2])
  return { left: (x - rx) * scale, right: (x + rx) * scale, top: (y + ry) * scale, bottom: (y - ry) * scale, z }
}
