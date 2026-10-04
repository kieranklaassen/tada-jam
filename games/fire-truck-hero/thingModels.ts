// The things that stand in a yard, as moulded toys: the pool with its duck,
// the small fire, the cat, the seed in its pot, and the gate with its bell.
// Each is built once from moulded parts (mould.ts) and stands at the origin;
// the stage puts it on its spot. The things of the grid other than the cat stay
// plain and have no faces. The animals have them, the cat among them (ART.md,
// "The characters").

import * as THREE from 'three'
import { GARDEN, THINGS_PAINT as PAINT, TRUCK_PAINT, WATER } from './look'
import { at, ball, box, lathe, mould, rod, type Part } from './mould'

/** The gate's arm and posts are the gate's colour. */
const GATE_PAINT = GARDEN.gate

function named(name: string, parts: Part[], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(mould(parts), material)
  mesh.name = name
  return mesh
}

/** A dark dot of an eye. */
function eye(x: number, y: number, z: number, size = 0.06): Part {
  return at(ball(size, TRUCK_PAINT.pupil, [1, 1, 1], 8), x, y, z)
}

export const POOL = { radius: 1.2, wall: 0.46, floor: 0.06 } as const

/** The paddling pool: a fat blue ring with a pale floor. Its water is a sheet the stage raises and lowers. */
export function buildPool(plastic: THREE.Material, water: THREE.Material): { root: THREE.Group; sheet: THREE.Mesh } {
  const root = new THREE.Group()
  root.name = 'pool'
  root.add(
    named(
      'pool-shell',
      [
        // The profile runs from the middle of the underside, up the outside of the wall, over the rim and down to the floor.
        lathe([[0, 0], [POOL.radius - 0.02, 0], [POOL.radius + 0.03, 0.2], [POOL.radius, POOL.wall - 0.03], [1.12, POOL.wall], [1.04, POOL.wall - 0.06], [1.0, POOL.floor], [0, POOL.floor]], PAINT.poolWall, 28),
        at(rod(1.0, 1.0, 0.02, PAINT.poolFloor, 28), 0, POOL.floor + 0.011, 0),
      ],
      plastic,
    ),
  )
  const sheet = named('pool-water', [rod(1.03, 1.03, 0.02, WATER.body, 28)], water)
  sheet.position.y = POOL.floor + 0.03
  sheet.visible = false
  root.add(sheet)
  return { root, sheet }
}

/** The rubber duck, who wants to float. It faces +x. */
export function buildDuck(plastic: THREE.Material): THREE.Group {
  const root = new THREE.Group()
  root.name = 'duck'
  root.add(
    named(
      'duck-body',
      [
        at(ball(0.36, PAINT.duck, [1.2, 0.85, 1]), 0, 0.3, 0),
        at(ball(0.2, PAINT.duck, [1.1, 0.7, 0.8]), -0.4, 0.42, 0, 0, 0, -0.5),
        at(ball(0.24, PAINT.duck), 0.26, 0.68, 0),
        at(ball(0.11, PAINT.beak, [1.5, 0.55, 1.1]), 0.5, 0.64, 0),
        eye(0.4, 0.76, 0.15, 0.045),
        eye(0.4, 0.76, -0.15, 0.045),
      ],
      plastic,
    ),
  )
  return root
}

/** A flame: a fat teardrop. */
function flame(height: number, width: number, hex: number): Part {
  return lathe([[0, 0], [width * 0.8, height * 0.12], [width, height * 0.32], [width * 0.72, height * 0.58], [width * 0.3, height * 0.84], [0, height]], hex, 14)
}

export type FireModel = { root: THREE.Group; flames: THREE.Mesh; logs: THREE.Group; dryLogs: THREE.Mesh; wetLogs: THREE.Mesh }

function logs(hex: number): Part[] {
  const parts: Part[] = []
  for (let i = 0; i < 3; i++) parts.push(at(rod(0.12, 0.13, 1.15, hex, 10), 0, 0.2 + i * 0.02, 0, Math.PI / 2 - 0.16, (i / 3) * Math.PI))
  return parts
}

/** The small fire: a ring of pebbles, three logs (dry, and black and wet once it is out), and flames that the stage keeps moving. */
export function buildFire(plastic: THREE.Material, glow: THREE.Material): FireModel {
  const root = new THREE.Group()
  root.name = 'fire'
  const pebbles: Part[] = []
  for (let i = 0; i < 9; i++) {
    const turn = (i / 9) * Math.PI * 2
    pebbles.push(at(ball(0.2, PAINT.pebble, [1.1, 0.7, 0.95], 10), Math.cos(turn) * 0.86, 0.12, Math.sin(turn) * 0.86, 0, turn))
  }
  root.add(named('fire-ring', pebbles, plastic))
  // The logs can float off on a puddle, so they hang in a group of their own.
  const logGroup = new THREE.Group()
  logGroup.name = 'fire-logs'
  const dryLogs = named('fire-logs-dry', logs(PAINT.log), plastic)
  const wetLogs = named('fire-logs-wet', logs(PAINT.logWet), plastic)
  wetLogs.visible = false
  logGroup.add(dryLogs, wetLogs)
  root.add(logGroup)
  const flames = named(
    'fire-flames',
    [at(flame(1.25, 0.42, PAINT.flameOuter), 0, 0, 0), at(flame(0.85, 0.3, PAINT.flameOuter), -0.36, 0, 0.1), at(flame(0.75, 0.27, PAINT.flameOuter), 0.36, 0, -0.06), at(flame(0.72, 0.22, PAINT.flameInner), 0.02, 0.04, 0.3)],
    glow,
  )
  flames.position.y = 0.22
  root.add(flames)
  return { root, flames, logs: logGroup, dryLogs, wetLogs }
}

export type CatModel = { root: THREE.Group; body: THREE.Mesh; head: THREE.Group; lids: THREE.Mesh; tail: THREE.Mesh; paw: THREE.Mesh; pawFar: THREE.Mesh }

/** The cat, who wants a warm dry place. She sits facing +x. Her head, her eyelids, her tail and her two front paws move by themselves. */
export function buildCat(plastic: THREE.Material): CatModel {
  const root = new THREE.Group()
  root.name = 'cat'
  const body = named(
    'cat-body',
    [lathe([[0, 0], [0.44, 0.02], [0.5, 0.2], [0.42, 0.55], [0.27, 0.86], [0, 0.94]], PAINT.cat, 18), at(ball(0.2, PAINT.catPale, [0.6, 1.15, 0.85], 10), 0.27, 0.42, 0)],
    plastic,
  )
  root.add(body)
  // The paw she shakes and washes, and the other one: out of creeping wet she lifts them one at a time.
  const paw = named('cat-paw', [ball(0.12, PAINT.cat, [1.3, 0.7, 1], 8)], plastic)
  paw.position.set(0.4, 0.07, 0.18)
  const pawFar = named('cat-paw-far', [ball(0.12, PAINT.cat, [1.3, 0.7, 1], 8)], plastic)
  pawFar.position.set(0.4, 0.07, -0.18)
  root.add(paw, pawFar)
  // The tail lies curled round her on the ground, from its root behind her.
  const curve = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.16, -0.01, 0.26), new THREE.Vector3(0.08, -0.01, 0.52), new THREE.Vector3(0.5, -0.01, 0.56), new THREE.Vector3(0.76, -0.01, 0.42)]),
    14,
    0.1,
    8,
  )
  const colours = new Float32Array(curve.getAttribute('position').count * 3)
  const lilac = new THREE.Color(PAINT.cat)
  for (let i = 0; i < colours.length; i += 3) lilac.toArray(colours, i)
  curve.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  curve.deleteAttribute('uv')
  const tail = named('cat-tail', [curve, ball(0.1, PAINT.cat, [1, 1, 1], 8)], plastic)
  tail.position.set(-0.36, 0.12, 0)
  root.add(tail)
  const head = new THREE.Group()
  head.name = 'cat-head'
  head.position.set(0.08, 1.12, 0)
  head.add(
    named(
      'cat-skull',
      [
        ball(0.36, PAINT.cat, [0.95, 0.88, 1.05]),
        at(rod(0, 0.17, 0.36, PAINT.cat, 8), 0.02, 0.38, 0.22, 0.25),
        at(rod(0, 0.17, 0.36, PAINT.cat, 8), 0.02, 0.38, -0.22, -0.25),
        at(ball(0.15, PAINT.catPale, [0.7, 0.7, 1.25], 10), 0.27, -0.08, 0),
        at(ball(0.045, PAINT.petal, [1, 0.8, 1.2], 8), 0.385, -0.03, 0),
        eye(0.3, 0.08, 0.15, 0.08),
        eye(0.3, 0.08, -0.15, 0.08),
      ],
      plastic,
    ),
  )
  // Eyelids: two lilac caps that come down over her eyes when she is content.
  const lids = named('cat-lids', [at(ball(0.1, PAINT.cat, [0.7, 1, 1], 8), 0.305, 0.1, 0.15), at(ball(0.1, PAINT.cat, [0.7, 1, 1], 8), 0.305, 0.1, -0.15)], plastic)
  lids.visible = false
  head.add(lids)
  root.add(head)
  return { root, body, head, lids, tail, paw, pawFar }
}

export type PotModel = { root: THREE.Group; soil: THREE.Mesh; shoot: THREE.Mesh; leaves: THREE.Mesh; bud: THREE.Mesh; flower: THREE.Group; petals: THREE.InstancedMesh; saucerWater: THREE.Mesh; leafDrop: THREE.Mesh }

/** The flower: five petals round a heart. Where each petal sits when it is open, and how big it and the heart are. */
export const PETALS = 5
export const PETAL = { ring: 0.24, size: [0.2, 0.09, 0.16], heart: [0.15, 0.105, 0.15], heartY: 0.04 } as const
/** The tip of the leaf a drop hangs from, in the pot's own units, and how far the drop falls from it. */
export const LEAF_TIP = { x: 0.52, y: 1.4, fall: 0.5 } as const

/** How high the soil's top is in the pot, and how tall the grown stem stands above it. */
export const POT = { soil: 0.82, stem: 1.0 } as const

/**
 * The seed in its pot. The plant is in parts that the stage grows one after
 * another as water comes: the shoot, two leaves, a closed bud, and the flower
 * that opens in its place. The flower's petals and its heart are instances of
 * one ball, each with its own colour, so the stage can open them one by one
 * and paint them the colour of the arrangement in one draw call.
 */
export function buildPot(plastic: THREE.Material, water: THREE.Material): PotModel {
  const root = new THREE.Group()
  root.name = 'seed'
  root.add(
    named(
      'seed-pot',
      [lathe([[0, 0], [0.48, 0], [0.5, 0.06], [0.66, 0.74], [0.74, 0.76], [0.74, 0.9], [0.62, 0.9], [0.6, 0.78], [0, 0.78]], PAINT.pot, 22), at(lathe([[0, 0], [0.86, 0], [0.92, 0.07], [0.84, 0.1], [0, 0.06]], PAINT.pot, 22), 0, 0, 0)],
      plastic,
    ),
  )
  // The soil has a material of its own: it turns dark when it is watered.
  const soil = named('seed-soil', [rod(0.6, 0.6, 0.04, 0xffffff, 22)], new THREE.MeshLambertMaterial({ vertexColors: true, color: PAINT.soilDry }))
  soil.position.y = POT.soil - 0.02
  root.add(soil)
  const saucerWater = named('seed-saucer-water', [rod(0.8, 0.8, 0.02, WATER.body, 22)], water)
  saucerWater.position.y = 0.085
  saucerWater.visible = false
  root.add(saucerWater)
  const shoot = named('seed-shoot', [at(rod(0.05, 0.065, POT.stem, PAINT.shoot, 8), 0, POT.stem / 2, 0)], plastic)
  const leaves = named('seed-leaves', [at(ball(0.2, PAINT.shoot, [1.5, 0.3, 0.8], 10), 0.26, 0.42, 0, 0, 0, 0.5), at(ball(0.2, PAINT.shoot, [1.5, 0.3, 0.8], 10), -0.26, 0.56, 0, 0, 0, -0.5)], plastic)
  const bud = named('seed-bud', [at(ball(0.15, PAINT.shoot, [0.9, 1.25, 0.9], 10), 0, POT.stem + 0.08, 0), at(ball(0.07, TRUCK_PAINT.cream, [1, 1, 1], 8), 0, POT.stem + 0.24, 0)], plastic)
  const flower = new THREE.Group()
  flower.name = 'seed-flower'
  flower.position.y = POT.stem + 0.06
  const petals = new THREE.InstancedMesh(mould([ball(1, 0xffffff, [1, 1, 1], 10)]), plastic, PETALS + 1)
  petals.name = 'seed-petals'
  petals.frustumCulled = false
  const pink = new THREE.Color(PAINT.petal)
  for (let i = 0; i <= PETALS; i++) petals.setColorAt(i, i < PETALS ? pink : pink.clone().set(PAINT.bee))
  flower.add(petals)
  // The drop that hangs from a leaf's tip and falls when the flower has opened.
  const leafDrop = named('seed-leaf-drop', [ball(0.11, WATER.body, [1, 1.2, 1], 8)], water)
  leafDrop.visible = false
  root.add(leafDrop)
  for (const part of [shoot, leaves, bud, flower]) {
    part.position.y += POT.soil
    part.visible = false
    root.add(part)
  }
  return { root, soil, shoot, leaves, bud, flower, petals, saucerWater, leafDrop }
}

/** How much bigger than its parts each toy stands in the yard, so the smallest is still a fat target for a small finger. */
export const SCALE = { pool: 1.15, duck: 1.15, fire: 1.2, cat: 1.45, seed: 1.25, bell: 1.45, boat: 0.76, wheel: 1.3, patch: 1.0, snail: 1.3, bee: 1.35, worm: 1.4 } as const

export type GateModel = { root: THREE.Group; leaf: THREE.Group; bell: THREE.Group; latch: THREE.Mesh }

/**
 * The gate in the far fence, seen from the yard: two posts `half` apart from
 * its middle, a leaf of pickets hinged on the left one, a red latch on the
 * right one, and the bell hanging out over the sand on an arm from the right
 * post, `armX` to the side and `armZ` toward the child. It stands at the
 * origin with the fence along x.
 */
export function buildGate(plastic: THREE.Material, half: number, armX: number, armZ: number): GateModel {
  const root = new THREE.Group()
  root.name = 'gate'
  const reach = Math.hypot(armX, armZ)
  root.add(
    named(
      'gate-posts',
      [
        at(box(0.44, 2.0, 0.44, 0.15, GATE_PAINT), -half, 1.0, 0),
        at(ball(0.28, TRUCK_PAINT.cream, [1, 0.8, 1], 10), -half, 2.08, 0),
        at(box(0.44, 2.9, 0.44, 0.15, GATE_PAINT), half, 1.45, 0),
        // The arm the bell hangs from.
        at(box(0.2, 0.18, reach + 0.3, 0.07, GATE_PAINT), half + armX / 2, 2.72, armZ / 2, 0, Math.atan2(armX, armZ)),
      ],
      plastic,
    ),
  )
  const leaf = new THREE.Group()
  leaf.name = 'gate-leaf'
  leaf.position.set(-half + 0.2, 0, 0.02)
  const span = 2 * half - 0.5
  const slats: Part[] = [at(box(span, 0.14, 0.12, 0.05, GATE_PAINT), span / 2, 0.45, 0), at(box(span, 0.14, 0.12, 0.05, GATE_PAINT), span / 2, 1.2, 0)]
  const pickets = Math.round(span / 0.46)
  for (let i = 0; i < pickets; i++) slats.push(at(box(0.32, 1.45, 0.15, 0.1, GATE_PAINT), 0.24 + (i * (span - 0.48)) / (pickets - 1), 0.86, 0.05))
  leaf.add(named('gate-slats', slats, plastic))
  root.add(leaf)
  // The latch: a red lever on the right post that each ring of the bell lifts by a third.
  const latch = named('gate-latch', [at(box(0.62, 0.14, 0.12, 0.05, TRUCK_PAINT.red), -0.24, 0, 0), ball(0.1, TRUCK_PAINT.red)], plastic)
  latch.position.set(half - 0.1, 1.2, 0.3)
  root.add(latch)
  const bell = new THREE.Group()
  bell.name = 'bell'
  bell.position.set(half + armX, 2.66, armZ)
  bell.scale.setScalar(SCALE.bell)
  bell.add(
    named(
      'bell-body',
      [
        at(rod(0.035, 0.035, 0.3, TRUCK_PAINT.grey, 6), 0, -0.15, 0),
        at(lathe([[0, -0.02], [0.52, -0.04], [0.55, 0.02], [0.39, 0.2], [0.33, 0.5], [0.2, 0.67], [0, 0.7]], TRUCK_PAINT.yellow, 20), 0, -1.0, 0),
        at(ball(0.16, TRUCK_PAINT.red), 0, -1.1, 0),
      ],
      plastic,
    ),
  )
  root.add(bell)
  return { root, leaf, bell, latch }
}
