import * as THREE from 'three'
import { BOARD, TRAY, traySlot, TRAY_SLOT_RADIUS, TURNTABLE } from '../layout'
import { BODY, HEAD_RADIUS, PART_KINDS } from '../parts'
import { HUE_HEX, PALETTE } from '../palette'
import { EYE_BALL, PART_REACH, PUPIL_RADIUS, type BatchKey } from '../rig'
import { collar, lump, merge, noise, paint, place, taperedTube, type Paint, type Placement } from './clay'

// Every clay shape in the workshop, built once. Parts are modelled in the
// rig's part frame: the base sits at the origin on the surface it is pressed
// onto and the part reaches out along +y (for legs, +y points at the
// ground), with +z leaning toward the face's "up" or the body's front.
// Each part keeps to PART_REACH, EYE_BALL, and PUPIL_RADIUS so the rig's
// hit points, feet, and pupils land where the clay is.

type Build = { paint: Paint; at?: Placement; lump?: [amount: number, frequency: number, seed: number] }

/** Place, then press irregularity in at world scale, then paint. */
function shape(geometry: THREE.BufferGeometry, { paint: paintWith, at, lump: lumpWith }: Build): THREE.BufferGeometry {
  if (at) place(geometry, at)
  if (lumpWith) lump(geometry, lumpWith[0], lumpWith[1], lumpWith[2])
  else geometry.computeVertexNormals()
  return paint(geometry, paintWith)
}

const HUE: Paint = { color: null }
const hue = (extra: Omit<Paint, 'color'> = {}): Paint => ({ color: null, ...extra })
/** A pale version of the plasticine hue (inner ears, tufts). */
function pale(geometry: THREE.BufferGeometry, amount: number): THREE.BufferGeometry {
  const tint = geometry.attributes.tint
  for (let i = 0; i < tint.count; i++) tint.setX(i, amount)
  return geometry
}

const curve = (...points: [number, number, number][]) => new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))

// --- critter parts -----------------------------------------------------------------

/** Three pressed-on toe nubs across the front of a foot. */
function toes(sole: number, front: number, spread: number, radius: number, seed: number): THREE.BufferGeometry[] {
  return [-1, 0, 1].map((i) =>
    shape(new THREE.SphereGeometry(radius, 10, 8), { paint: HUE, at: { at: [i * spread, sole - radius * 0.9, front - Math.abs(i) * radius * 0.5], scale: [1, 0.85, 1.1] }, lump: [0.04, 2, seed + i] }),
  )
}

function legStub(): THREE.BufferGeometry {
  const reach = PART_REACH.legStub
  return merge([
    shape(collar(1.3, 0.55, 1.4, 18), { paint: hue({ creaseBelow: 0.3, creaseDepth: 0.9, crease: 0.3 }), lump: [0.12, 1.1, 4] }),
    shape(new THREE.CylinderGeometry(1.12, 1.32, 2.5, 18, 4), { paint: HUE, at: { at: [0, 1.4, 0] }, lump: [0.16, 0.9, 5] }),
    shape(new THREE.SphereGeometry(1.45, 18, 12), { paint: hue({ uvScale: 0.5 }), at: { at: [0, reach - 0.9, 0.38], scale: [1.1, 0.62, 1.32] }, lump: [0.14, 1.2, 6] }),
    ...toes(reach, 1.95, 0.62, 0.46, 60),
  ])
}

function legLong(): THREE.BufferGeometry {
  const reach = PART_REACH.legLong
  return merge([
    shape(collar(1.05, 0.5, 1.45, 16), { paint: hue({ creaseBelow: 0.3, creaseDepth: 0.9, crease: 0.3 }), lump: [0.1, 1.1, 7] }),
    shape(taperedTube(curve([0, 0.1, 0], [0, 1.8, 0.25], [0, 3.3, 0.42], [0, 4.8, 0.22], [0, 5.7, 0.1]), 16, 12, 0.92, 0.78), { paint: hue({ uvScale: 0.6 }), lump: [0.12, 1, 8] }),
    shape(new THREE.SphereGeometry(1.02, 14, 10), { paint: HUE, at: { at: [0, 3.3, 0.36], scale: [1, 1.1, 1] }, lump: [0.08, 1.3, 9] }),
    shape(new THREE.SphereGeometry(1.4, 18, 12), { paint: hue({ uvScale: 0.5 }), at: { at: [0, reach - 0.84, 0.55], scale: [1.05, 0.6, 1.5] }, lump: [0.12, 1.2, 10] }),
    ...toes(reach, 2.35, 0.6, 0.45, 64),
  ])
}

function eye(): THREE.BufferGeometry {
  return merge([
    shape(collar(1.08, 0.62, 1.5, 20), { paint: hue({ creaseBelow: 0.2, creaseDepth: 0.7, crease: 0.25 }), lump: [0.08, 1.4, 11] }),
    shape(new THREE.SphereGeometry(EYE_BALL.radius, 24, 16), { paint: { color: PALETTE.eyeWhite, uvScale: 0.3 }, at: { at: [0, EYE_BALL.center, 0] }, lump: [0.05, 1.6, 12] }),
  ])
}

function pupil(): THREE.BufferGeometry {
  return merge([
    shape(new THREE.SphereGeometry(PUPIL_RADIUS, 16, 10), { paint: { color: PALETTE.pupil, uvScale: 0.2 }, at: { scale: [1, 0.42, 1] } }),
    shape(new THREE.SphereGeometry(0.19, 10, 6), { paint: { color: PALETTE.glint }, at: { at: [-0.2, 0.2, 0.24], scale: [1, 0.6, 1] } }),
  ])
}

/** A clay lid: a hemisphere over the eye with a rolled lip, turned about x from shut (0) to tucked away (1). */
function lid(): THREE.BufferGeometry {
  const r = EYE_BALL.radius * 1.1
  return merge([
    shape(new THREE.SphereGeometry(r, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), { paint: hue({ uvScale: 0.35 }), lump: [0.05, 1.6, 13] }),
    shape(new THREE.TorusGeometry(r, 0.2, 8, 28), { paint: hue({ creaseBelow: 0.08, creaseDepth: 0.3, crease: 0.25 }), at: { rotate: [Math.PI / 2, 0, 0] } }),
  ])
}

function mark(): THREE.BufferGeometry {
  return shape(new THREE.SphereGeometry(1, 16, 8), { paint: { color: PALETTE.mark, uvScale: 0.2 }, at: { at: [0, 0.04, 0], scale: [1, 0.26, 1] } })
}

/** A sleepy closed eye: a rolled clay arc, lowest in the middle, pressed onto the face. */
function crescent(): THREE.BufferGeometry {
  return shape(new THREE.TorusGeometry(1, 0.24, 8, 20, Math.PI), { paint: { color: PALETTE.mark, uvScale: 0.2 }, at: { at: [0, 0.06, 0.45], rotate: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.7] } })
}

function nose(): THREE.BufferGeometry {
  return merge([
    shape(new THREE.SphereGeometry(1.28, 22, 16), { paint: hue({ uvScale: 0.35, creaseBelow: -0.2, creaseDepth: 0.8, crease: 0.3 }), at: { at: [0, 0.55, 0], scale: [1.18, 0.86, 0.96] }, lump: [0.06, 1.2, 14] }),
    shape(new THREE.SphereGeometry(0.24, 10, 6), { paint: { color: PALETTE.mark }, at: { at: [-0.44, 1.18, -0.28], scale: [1, 0.55, 1.2] } }),
    shape(new THREE.SphereGeometry(0.24, 10, 6), { paint: { color: PALETTE.mark }, at: { at: [0.44, 1.18, -0.28], scale: [1, 0.55, 1.2] } }),
  ])
}

/** An ear: a flattened clay leaf standing up from its base, facing +z, with a pale thumb-pressed inside. */
function earRound(): THREE.BufferGeometry {
  return merge([
    shape(collar(0.95, 0.5, 1.5, 14), { paint: HUE, at: { scale: [1.3, 1, 0.8] } }),
    shape(new THREE.SphereGeometry(1.75, 20, 14), { paint: hue({ uvScale: 0.4, creaseBelow: 0.6, creaseDepth: 1, crease: 0.22 }), at: { at: [0, 1.68, 0], scale: [1, 1, 0.42] }, lump: [0.08, 1, 15] }),
    pale(shape(new THREE.SphereGeometry(1.2, 16, 10), { paint: hue({ uvScale: 0.3 }), at: { at: [0, 1.8, 0.5], scale: [1, 1, 0.3] } }), 0.32),
  ])
}

function earPoint(): THREE.BufferGeometry {
  const leaf = (r: number, depth: number, lift: number, seed: number) => {
    const points: THREE.Vector2[] = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      points.push(new THREE.Vector2(r * Math.sin(Math.PI * Math.min(1, t * 1.25)) ** 0.8 * (1 - t) ** 0.55 + 0.05, t * (PART_REACH.earPoint - lift)))
    }
    const g = new THREE.LatheGeometry(points, 18)
    g.scale(1, 1, depth)
    g.translate(0, lift, 0)
    return lump(g, 0.07, 1, seed)
  }
  return merge([
    shape(collar(0.95, 0.45, 1.5, 14), { paint: HUE, at: { scale: [1.3, 1, 0.8] } }),
    paint(leaf(1.75, 0.46, 0.1, 16), hue({ uvScale: 0.4, creaseBelow: 0.7, creaseDepth: 1, crease: 0.22 })),
    pale(paint(place(leaf(1.15, 0.28, 0.55, 17), { at: [0, 0, 0.38], scale: [1, 0.8, 1] }), hue({ uvScale: 0.3 })), 0.32),
  ])
}

function earFlop(): THREE.BufferGeometry {
  const reach = PART_REACH.earFlop
  const spoon = taperedTube(curve([0, 0, 0], [0, reach * 0.35, 0.35], [0, reach * 0.7, 0.3], [0, reach - 1.2, 0]), 14, 14, 0.85, 1.25)
  spoon.scale(1.25, 1, 0.5)
  return merge([
    shape(collar(0.9, 0.5, 1.5, 14), { paint: HUE, at: { scale: [1.3, 1, 0.8] } }),
    shape(spoon, { paint: hue({ uvScale: 0.5 }), lump: [0.08, 1, 18] }),
    pale(shape(new THREE.SphereGeometry(1, 14, 10), { paint: hue({ uvScale: 0.3 }), at: { at: [0, reach * 0.62, 0.42], scale: [0.9, 1.6, 0.25] } }), 0.34),
  ])
}

function tailCurl(): THREE.BufferGeometry {
  const spiral = curve([0, 0, 0], [0, 1.5, 0.15], [0, 2.9, 0.8], [0, 3.7, 2.1], [0, 3.3, 3.3], [0, 2.3, 3.4], [0, 1.9, 2.5], [0, 2.4, 1.8])
  return merge([shape(collar(0.9, 0.4, 1.5, 14), { paint: HUE }), shape(taperedTube(spiral, 40, 12, 0.95, 0.42), { paint: hue({ uvScale: 0.6 }), lump: [0.07, 1.2, 19] })])
}

function tailLong(): THREE.BufferGeometry {
  const reach = PART_REACH.tailLong
  return merge([
    shape(collar(1, 0.4, 1.5, 14), { paint: HUE }),
    shape(taperedTube(curve([0, 0, 0], [0, reach * 0.35, 0.3], [0, reach * 0.7, 1.2], [0, reach - 0.9, 2.5]), 28, 12, 1, 0.5), { paint: hue({ uvScale: 0.8 }), lump: [0.1, 0.8, 20] }),
    pale(shape(new THREE.SphereGeometry(1.25, 16, 12), { paint: hue({ uvScale: 0.35 }), at: { at: [0, reach - 0.5, 2.95], scale: [1, 1.2, 1] }, lump: [0.3, 1.6, 21] }), 0.55),
  ])
}

/** A big round head (it becomes the face) with a neck smoothed down into the body and two pressed-on cheeks. */
function head(): THREE.BufferGeometry {
  const r = HEAD_RADIUS
  const neck = new THREE.CylinderGeometry(r * 0.66, r * 0.9, r * 1.1, 24, 3, true)
  const toBody = new THREE.Vector3(0, -0.87, -0.5).normalize()
  neck.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), toBody))
  neck.translate(toBody.x * r * 0.7, toBody.y * r * 0.7, toBody.z * r * 0.7)
  const cheek = (side: number) => {
    const at = new THREE.Vector3(side * 0.64, -0.3, 0.7).normalize().multiplyScalar(r * 0.93)
    return shape(new THREE.SphereGeometry(1.05, 12, 8), { paint: { color: '#f5b7c6', uvScale: 0.3 }, at: { at: [at.x, at.y, at.z], scale: [1, 0.8, 0.5] } })
  }
  const g = merge([
    shape(new THREE.SphereGeometry(r, 36, 26), { paint: hue({ underside: 0.35, uvScale: 1.2 }), lump: [0.42, 0.42, 22] }),
    shape(neck, { paint: hue({ underside: 0.3 }), lump: [0.3, 0.5, 23] }),
    cheek(-1),
    cheek(1),
  ])
  g.computeBoundingSphere()
  return g
}

function horn(): THREE.BufferGeometry {
  const g = taperedTube(curve([0, 0, 0], [0, 1.4, -0.08], [0, 2.5, -0.35], [0, PART_REACH.horn - 0.4, -0.85]), 18, 12, 0.95, 0.22)
  // pressed rings: darken bands along the horn
  const position = g.attributes.position
  paint(g, hue({ uvScale: 0.4 }))
  const color = g.attributes.color
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    const band = 1 - 0.18 * Math.max(0, Math.sin(y * 5.2)) ** 6
    color.setXYZ(i, color.getX(i) * band, color.getY(i) * band, color.getZ(i) * band)
  }
  return merge([shape(collar(0.95, 0.4, 1.5, 14), { paint: HUE }), g])
}

/** The body at its real size: a soft egg with a flattened belly where it sits. */
function body(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 40, 28)
  g.scale(BODY.rx, BODY.ry, BODY.rz)
  const position = g.attributes.position
  const floor = -BODY.ry * 0.78
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    if (y < floor) position.setY(i, floor + (y - floor) * 0.35)
  }
  lump(g, 0.55, 0.32, 24)
  return paint(g, hue({ underside: 0.5, uvScale: 1.4 }))
}

const BUILDERS: Record<BatchKey, () => THREE.BufferGeometry> = {
  legStub,
  legLong,
  eye,
  earRound,
  earPoint,
  earFlop,
  tailCurl,
  tailLong,
  head,
  horn,
  body,
  nose,
  pupil,
  lid,
  mark,
  crescent,
}

export function buildPartShapes(): Record<BatchKey, THREE.BufferGeometry> {
  const shapes = {} as Record<BatchKey, THREE.BufferGeometry>
  for (const key of Object.keys(BUILDERS) as BatchKey[]) shapes[key] = BUILDERS[key]()
  return shapes
}

// --- the workshop bench ------------------------------------------------------------

function roundedRect(halfWidth: number, halfDepth: number, radius: number): THREE.Shape {
  const s = new THREE.Shape()
  const w = halfWidth
  const d = halfDepth
  s.moveTo(-w + radius, -d)
  s.lineTo(w - radius, -d)
  s.quadraticCurveTo(w, -d, w, -d + radius)
  s.lineTo(w, d - radius)
  s.quadraticCurveTo(w, d, w - radius, d)
  s.lineTo(-w + radius, d)
  s.quadraticCurveTo(-w, d, -w, d - radius)
  s.lineTo(-w, -d + radius)
  s.quadraticCurveTo(-w, -d, -w + radius, -d)
  return s
}

/** A flat slab from a 2D shape, lying on the bench with its top at `top`. */
function slab(outline: THREE.Shape, thickness: number, top: number, bevel: number, x: number, z: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 })
  g.rotateX(-Math.PI / 2)
  g.translate(x, top - thickness - bevel, z)
  return g
}

/** Wood grain drawn into the vertex colours of a finely divided bench top. */
function benchTop(): THREE.BufferGeometry {
  const width = 300
  const depth = 170
  const g = new THREE.PlaneGeometry(width, depth, 90, 48)
  g.rotateX(-Math.PI / 2)
  g.translate(-4, -1.6, -8)
  paint(g, { color: PALETTE.bench, uvScale: 6 })
  const position = g.attributes.position
  const color = g.attributes.color
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const grain = noise(x * 0.02, z * 0.35, 0, 31) * 0.7 + noise(x * 0.08, z * 1.1, 0, 32) * 0.3
    const plank = Math.abs(((z + 200) % 28) - 14) < 0.35 ? 0.82 : 1
    const shade = (0.9 + 0.16 * grain) * plank
    color.setXYZ(i, color.getX(i) * shade, color.getY(i) * shade, color.getZ(i) * shade)
  }
  return g
}

function propLumps(): THREE.BufferGeometry[] {
  const pieces: THREE.BufferGeometry[] = []
  // plasticine bars, stacked in their three colours
  const bars: [number, number, number, number][] = [
    [0, -46, 0, 0.05],
    [1, -46, 1, -0.08],
    [2, -46, 2, 0.12],
  ]
  for (const [h, z, level, turn] of bars) {
    const bar = new THREE.BoxGeometry(15, 2.6, 5.5, 10, 3, 5)
    pieces.push(shape(bar, { paint: { color: HUE_HEX[h as 0 | 1 | 2], underside: 0.3, uvScale: 0.6 }, at: { at: [-44, -1.6 + 1.3 + level * 2.5, z - level * 0.3], rotate: [0, turn, 0] }, lump: [0.4, 0.4, 40 + h] }))
  }
  // a torn-off pink lump with a thumbprint in it, and a cobalt snake
  pieces.push(shape(new THREE.SphereGeometry(3.4, 20, 14), { paint: { color: HUE_HEX[2], underside: 0.4, uvScale: 0.5 }, at: { at: [-24, -1.6 + 1.8, -44], scale: [1.2, 0.7, 1] }, lump: [1.2, 0.5, 44] }))
  pieces.push(shape(taperedTube(curve([-14, 0, -48], [-8, 0, -45], [-3, 0, -49], [3, 0, -46]), 30, 10, 1.1, 0.9), { paint: { color: HUE_HEX[0], underside: 0.35, uvScale: 1.2 }, at: { at: [0, -1.6 + 1, 0] }, lump: [0.25, 0.5, 45] }))
  pieces.push(shape(new THREE.SphereGeometry(2.4, 16, 12), { paint: { color: HUE_HEX[1], underside: 0.4, uvScale: 0.4 }, at: { at: [10, -1.6 + 1.4, -44], scale: [1.1, 0.72, 1] }, lump: [0.8, 0.6, 46] }))
  return pieces
}

function rollingPin(): THREE.BufferGeometry[] {
  const y = -1.6 + 2.4
  const at: [number, number, number] = [24, y, -46]
  const turn = -0.18
  const along = (offset: number): [number, number, number] => [at[0] + Math.cos(turn) * offset, y, at[2] - Math.sin(turn) * offset]
  return [
    shape(new THREE.CylinderGeometry(2.4, 2.4, 22, 24, 6), { paint: { color: PALETTE.toolWood, uvScale: 0.5 }, at: { at, rotate: [0, turn, Math.PI / 2] }, lump: [0.1, 0.4, 47] }),
    shape(new THREE.CapsuleGeometry(1, 5, 4, 12), { paint: { color: '#b3854f' }, at: { at: along(-14.5), rotate: [0, turn, Math.PI / 2] } }),
    shape(new THREE.CapsuleGeometry(1, 5, 4, 12), { paint: { color: '#b3854f' }, at: { at: along(14.5), rotate: [0, turn, Math.PI / 2] } }),
  ]
}

function toolJar(): THREE.BufferGeometry[] {
  const x = 46
  const z = -52
  const base = -1.6
  const pieces = [
    shape(new THREE.CylinderGeometry(4.6, 4.3, 11, 24, 3), { paint: { color: PALETTE.jar, underside: 0.3, creaseBelow: base + 1.5, creaseDepth: 2, crease: 0.25 }, at: { at: [x, base + 5.5, z] } }),
    shape(new THREE.TorusGeometry(4.6, 0.45, 8, 28), { paint: { color: '#a3b8c9' }, at: { at: [x, base + 11, z], rotate: [Math.PI / 2, 0, 0] } }),
  ]
  const sticks: [number, number, number][] = [
    [-1.6, 0.25, -0.3],
    [1.4, -0.2, 0.2],
    [0.2, 0.1, 1.5],
  ]
  for (const [dx, lean, dz] of sticks) {
    pieces.push(shape(new THREE.CylinderGeometry(0.42, 0.5, 15, 8), { paint: { color: PALETTE.toolWood }, at: { at: [x + dx, base + 11, z + dz], rotate: [lean, 0, -lean] } }))
  }
  pieces.push(shape(new THREE.TorusGeometry(1.6, 0.22, 6, 18), { paint: { color: PALETTE.toolWire }, at: { at: [x - 1.6 - 1.9, base + 19.6, z - 0.3 - 1.9], rotate: [0.25, 0.4, -0.25] } }))
  pieces.push(shape(new THREE.TorusGeometry(1.3, 0.2, 6, 18), { paint: { color: PALETTE.toolWire }, at: { at: [x + 1.4 + 1.5, base + 19, z + 0.2], rotate: [-0.2, -0.3, 0.2] } }))
  return pieces
}

/** Everything that never moves, merged into one draw: bench, wall, slate board, parts tray, turntable foot, and the props at the back. */
export function buildBench(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  pieces.push(benchTop())
  pieces.push(shape(new THREE.BoxGeometry(300, 12, 3, 1, 1, 1), { paint: { color: PALETTE.benchEdge, uvScale: 4 }, at: { at: [-4, -7.6, 77] } }))
  const wall = new THREE.PlaneGeometry(300, 140, 1, 12)
  wall.translate(-4, 68.4, -93)
  paint(wall, { color: PALETTE.wall, uvScale: 5 })
  const wallPos = wall.attributes.position
  const wallColor = wall.attributes.color
  for (let i = 0; i < wallPos.count; i++) {
    const k = 1 - 0.1 * Math.exp(-(wallPos.getY(i) + 1.6) / 10)
    wallColor.setXYZ(i, wallColor.getX(i) * k, wallColor.getY(i) * k, wallColor.getZ(i) * k)
  }
  pieces.push(wall)
  pieces.push(paint(slab(roundedRect(BOARD.halfWidth, BOARD.halfDepth, 7), 1.2, 0, 0.4, BOARD.x, BOARD.z), { color: PALETTE.board, creaseBelow: -0.2, creaseDepth: 1.2, crease: 0.32, uvScale: 1 / 26 }))
  // the parts tray, with a dimple for each kind of part
  pieces.push(paint(slab(roundedRect(TRAY.halfWidth, TRAY.halfDepth, 4), 0.8, TRAY.height, 0.3, TRAY.x, TRAY.z), { color: PALETTE.tray, creaseBelow: 0.4, creaseDepth: 0.8, crease: 0.3, uvScale: 1 / 12 }))
  const rim = roundedRect(TRAY.halfWidth + 0.2, TRAY.halfDepth + 0.2, 4.2)
  rim.holes.push(roundedRect(TRAY.halfWidth - 1.3, TRAY.halfDepth - 1.3, 3))
  pieces.push(paint(slab(rim, 0.7, TRAY.height + 0.9, 0.2, TRAY.x, TRAY.z), { color: PALETTE.trayRim, creaseBelow: TRAY.height + 0.2, creaseDepth: 0.6, crease: 0.2, uvScale: 1 / 12 }))
  for (const kind of PART_KINDS) {
    const slot = traySlot(kind)
    pieces.push(shape(new THREE.CylinderGeometry(TRAY_SLOT_RADIUS, TRAY_SLOT_RADIUS * 0.94, 0.16, 28), { paint: { color: PALETTE.slot, uvScale: 0.4 }, at: { at: [slot.x, TRAY.height + 0.04, slot.z] } }))
  }
  // turntable foot
  pieces.push(shape(new THREE.CylinderGeometry(5.2, 6.4, 0.9, 32), { paint: { color: PALETTE.turntableFoot, creaseBelow: 0.2, creaseDepth: 0.4, crease: 0.25 }, at: { at: [TURNTABLE.x, 0.45, TURNTABLE.z] } }))
  pieces.push(...propLumps(), ...rollingPin(), ...toolJar())
  return merge(pieces)
}

/** The turntable's top, which spins (drawn as its own mesh): a pale disc with a rolled rim and dots of colour to show it turning. */
export function buildTurntableTop(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const top = TURNTABLE.height
  pieces.push(shape(new THREE.CylinderGeometry(TURNTABLE.r, TURNTABLE.r - 0.3, 0.7, 48, 1), { paint: { color: PALETTE.turntable, creaseBelow: top - 0.3, creaseDepth: 0.5, crease: 0.2, uvScale: 0.5 }, at: { at: [0, top - 0.35, 0] } }))
  pieces.push(shape(new THREE.TorusGeometry(TURNTABLE.r - 0.1, 0.32, 8, 48), { paint: { color: PALETTE.turntableRim }, at: { at: [0, top - 0.35, 0], rotate: [Math.PI / 2, 0, 0] } }))
  pieces.push(shape(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 16), { paint: { color: PALETTE.turntableRim }, at: { at: [0, 0.95, 0] } }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r = TURNTABLE.r - 1.6
    pieces.push(shape(new THREE.SphereGeometry(0.62, 10, 6), { paint: { color: HUE_HEX[(i % 3) as 0 | 1 | 2] }, at: { at: [Math.cos(a) * r, top, Math.sin(a) * r], scale: [1, 0.4, 1] } }))
  }
  return merge(pieces)
}
