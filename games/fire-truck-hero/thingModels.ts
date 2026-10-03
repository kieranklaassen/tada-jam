// The things that stand in a yard, as moulded toys: the pool with its duck,
// the small fire, the cat, the seed in its pot, and the gate with its bell.
// Each is built once from moulded parts (mould.ts) and stands at the origin;
// the stage puts it on its spot. The seven things of the grid stay plain and
// have no faces. The animals have them (ART.md, "The characters").

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

/** The small fire: a ring of pebbles, three logs, and flames that the stage keeps moving. */
export function buildFire(plastic: THREE.Material, glow: THREE.Material): { root: THREE.Group; flames: THREE.Mesh } {
  const root = new THREE.Group()
  root.name = 'fire'
  const still: Part[] = []
  for (let i = 0; i < 9; i++) {
    const turn = (i / 9) * Math.PI * 2
    still.push(at(ball(0.2, PAINT.pebble, [1.1, 0.7, 0.95], 10), Math.cos(turn) * 0.86, 0.12, Math.sin(turn) * 0.86, 0, turn))
  }
  for (let i = 0; i < 3; i++) still.push(at(rod(0.12, 0.13, 1.15, PAINT.log, 10), 0, 0.2 + i * 0.02, 0, Math.PI / 2 - 0.16, (i / 3) * Math.PI))
  root.add(named('fire-ring', still, plastic))
  const flames = named(
    'fire-flames',
    [at(flame(1.25, 0.42, PAINT.flameOuter), 0, 0, 0), at(flame(0.85, 0.3, PAINT.flameOuter), -0.36, 0, 0.1), at(flame(0.75, 0.27, PAINT.flameOuter), 0.36, 0, -0.06), at(flame(0.72, 0.22, PAINT.flameInner), 0.02, 0.04, 0.3)],
    glow,
  )
  flames.position.y = 0.22
  root.add(flames)
  return { root, flames }
}

/** The cat, who wants a warm dry place. She sits facing +x, with her tail curled round. */
export function buildCat(plastic: THREE.Material): { root: THREE.Group; head: THREE.Mesh } {
  const root = new THREE.Group()
  root.name = 'cat'
  const tail = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([new THREE.Vector3(-0.36, 0.12, 0), new THREE.Vector3(-0.52, 0.11, 0.26), new THREE.Vector3(-0.28, 0.11, 0.52), new THREE.Vector3(0.14, 0.11, 0.56), new THREE.Vector3(0.4, 0.11, 0.42)]),
    14,
    0.1,
    8,
  )
  root.add(
    named(
      'cat-body',
      [
        lathe([[0, 0], [0.44, 0.02], [0.5, 0.2], [0.42, 0.55], [0.27, 0.86], [0, 0.94]], PAINT.cat, 18),
        at(ball(0.2, PAINT.catPale, [0.6, 1.15, 0.85], 10), 0.27, 0.42, 0),
        at(ball(0.12, PAINT.cat, [1.3, 0.7, 1], 8), 0.4, 0.07, 0.18),
        at(ball(0.12, PAINT.cat, [1.3, 0.7, 1], 8), 0.4, 0.07, -0.18),
        // The tail is a tube, which is painted like any other part.
        (() => {
          const colours = new Float32Array(tail.getAttribute('position').count * 3)
          const c = new THREE.Color(PAINT.cat)
          for (let i = 0; i < colours.length; i += 3) c.toArray(colours, i)
          tail.setAttribute('color', new THREE.BufferAttribute(colours, 3))
          tail.deleteAttribute('uv')
          return tail
        })(),
      ],
      plastic,
    ),
  )
  const head = named(
    'cat-head',
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
  )
  head.position.set(0.08, 1.12, 0)
  root.add(head)
  return { root, head }
}

/** The seed in its pot. The stage shows the plant at the stage the water has brought it to. */
export function buildPot(plastic: THREE.Material): { root: THREE.Group; plant: THREE.Mesh } {
  const root = new THREE.Group()
  root.name = 'seed'
  root.add(
    named(
      'seed-pot',
      [
        lathe([[0, 0], [0.48, 0], [0.5, 0.06], [0.66, 0.74], [0.74, 0.76], [0.74, 0.9], [0.62, 0.9], [0.6, 0.78], [0, 0.78]], PAINT.pot, 22),
        at(rod(0.6, 0.6, 0.04, PAINT.soil, 22), 0, 0.8, 0),
        at(lathe([[0, 0], [0.86, 0], [0.92, 0.07], [0.84, 0.1], [0, 0.06]], PAINT.pot, 22), 0, 0, 0),
      ],
      plastic,
    ),
  )
  // The open flower, as the spike shows it: a stem, two leaves and five petals round a yellow middle.
  const parts: Part[] = [at(rod(0.05, 0.065, 1.0, PAINT.shoot, 8), 0, 0.5, 0), at(ball(0.2, PAINT.shoot, [1.5, 0.3, 0.8], 10), 0.26, 0.42, 0, 0, 0, 0.5), at(ball(0.2, PAINT.shoot, [1.5, 0.3, 0.8], 10), -0.26, 0.56, 0, 0, 0, -0.5)]
  for (let i = 0; i < 5; i++) {
    const turn = (i / 5) * Math.PI * 2
    parts.push(at(ball(0.2, PAINT.petal, [1, 0.45, 0.8], 10), Math.cos(turn) * 0.24, 1.06, Math.sin(turn) * 0.24, 0, -turn))
  }
  parts.push(at(ball(0.15, PAINT.bee, [1, 0.7, 1], 10), 0, 1.1, 0))
  const plant = named('seed-plant', parts, plastic)
  plant.position.y = 0.8
  root.add(plant)
  return { root, plant }
}

/** How far the bell hangs out over the yard from the fence, and how far each gate post stands from the gate's middle. */
export const GATE_ARM = 1.35
export const GATE_HALF = 1.35

/** How much bigger than its parts each toy stands in the yard, so the smallest is still a fat target for a small finger. */
export const SCALE = { pool: 1.15, duck: 1.2, fire: 1.2, cat: 1.45, seed: 1.25, bell: 1.45 } as const

/**
 * The gate in the far fence, seen from the yard: two posts, a leaf of pickets
 * hinged on the right one, and the bell hanging out over the yard on an arm
 * from the left one. It stands at the origin with the fence along x.
 */
export function buildGate(plastic: THREE.Material): { root: THREE.Group; leaf: THREE.Group; bell: THREE.Group } {
  const root = new THREE.Group()
  root.name = 'gate'
  root.add(
    named(
      'gate-posts',
      [
        at(box(0.44, 2.9, 0.44, 0.15, GARDEN.gate), -GATE_HALF, 1.45, 0),
        at(box(0.44, 2.0, 0.44, 0.15, GARDEN.gate), GATE_HALF, 1.0, 0),
        at(ball(0.28, TRUCK_PAINT.cream, [1, 0.8, 1], 10), GATE_HALF, 2.08, 0),
        at(box(0.2, 0.18, GATE_ARM + 0.35, 0.07, GATE_PAINT), -GATE_HALF, 2.72, GATE_ARM / 2),
      ],
      plastic,
    ),
  )
  const leaf = new THREE.Group()
  leaf.name = 'gate-leaf'
  leaf.position.set(GATE_HALF - 0.2, 0, 0.02)
  const span = 2 * GATE_HALF - 0.5
  const slats: Part[] = [at(box(span, 0.14, 0.12, 0.05, GARDEN.gate), -span / 2, 0.45, 0), at(box(span, 0.14, 0.12, 0.05, GARDEN.gate), -span / 2, 1.2, 0)]
  for (let i = 0; i < 5; i++) slats.push(at(box(0.32, 1.45, 0.15, 0.1, GARDEN.gate), -0.24 - i * 0.44, 0.86, 0.05))
  leaf.add(named('gate-slats', slats, plastic))
  root.add(leaf)
  const bell = new THREE.Group()
  bell.name = 'bell'
  bell.position.set(-GATE_HALF, 2.66, GATE_ARM)
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
  return { root, leaf, bell }
}
