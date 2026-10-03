// More of the toys of a yard: the boat, the wheel, the dry patch, and the
// small animals (the snail, the bee, the worm). Like the others they are
// moulded once from painted parts (mould.ts) and stand at the origin, facing
// +x. Parts that move by themselves are meshes of their own, with names the
// intersection audit reads.

import * as THREE from 'three'
import { THINGS_PAINT as PAINT, TRUCK_PAINT, WATER } from './look'
import { at, ball, box, lathe, mould, ring, rod, type Part } from './mould'

function named(name: string, parts: Part[], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(mould(parts), material)
  mesh.name = name
  return mesh
}

function eye(x: number, y: number, z: number, size = 0.05): Part {
  return at(ball(size, TRUCK_PAINT.pupil, [1, 1, 1], 8), x, y, z)
}

export const BOAT = { length: 1.5, floor: 0.1, brim: 0.4 } as const

export type BoatModel = { root: THREE.Group; hull: THREE.Mesh; inside: THREE.Mesh }

/** The boat: an open tub of a dinghy with a bench and a little flag. Water gathers inside it. */
export function buildBoat(plastic: THREE.Material, water: THREE.Material): BoatModel {
  const root = new THREE.Group()
  root.name = 'boat'
  // A bowl turned on a lathe and drawn out lengthways into a hull.
  const bowl = lathe([[0, 0], [0.28, 0.02], [0.44, 0.16], [0.5, BOAT.brim], [0.44, BOAT.brim + 0.02], [0.4, BOAT.brim - 0.04], [0.36, 0.2], [0.24, BOAT.floor], [0, BOAT.floor]], PAINT.boat, 20)
  bowl.scale(BOAT.length, 1, 1)
  const gunwale = ring(0.47, 0.045, PAINT.bench, 22)
  gunwale.scale(BOAT.length, 1, 1)
  gunwale.translate(0, BOAT.brim + 0.01, 0)
  const hull = named(
    'boat-hull',
    [bowl, gunwale, at(box(0.18, 0.08, 0.8, 0.03, PAINT.bench), -0.1, BOAT.brim - 0.07, 0), at(rod(0.035, 0.035, 0.75, PAINT.bench, 6), -0.5, BOAT.brim + 0.33, 0), at(box(0.42, 0.28, 0.04, 0.02, TRUCK_PAINT.red), -0.28, BOAT.brim + 0.54, 0)],
    plastic,
  )
  root.add(hull)
  const sheet = rod(0.36, 0.36, 0.02, WATER.body, 20)
  sheet.scale(BOAT.length, 1, 1)
  const inside = named('boat-water', [sheet], water)
  inside.position.y = BOAT.floor + 0.02
  inside.visible = false
  root.add(inside)
  return { root, hull, inside }
}

export const WHEEL = { axle: 1.0, radius: 0.82, lean: 0.62 } as const

export type WheelModel = { root: THREE.Group; wheel: THREE.Mesh }

/**
 * The wheel: a paddle wheel on a post, leaning back so that its face is
 * toward the child, which the water turns. Its paddles are two colours in
 * turn, so its turning shows.
 */
export function buildWheel(plastic: THREE.Material): WheelModel {
  const root = new THREE.Group()
  root.name = 'wheel'
  root.add(
    named(
      'wheel-stand',
      [at(lathe([[0, 0], [0.5, 0], [0.5, 0.08], [0.2, 0.2], [0.14, 0.3], [0, 0.3]], TRUCK_PAINT.grey, 16), 0, 0, -0.2), at(rod(0.11, 0.14, WHEEL.axle, TRUCK_PAINT.grey, 10), 0, WHEEL.axle / 2 + 0.1, -0.2)],
      plastic,
    ),
  )
  const parts: Part[] = [at(ring(WHEEL.radius * 0.7, 0.07, PAINT.wheel, 24), 0, 0, 0, Math.PI / 2), at(rod(0.17, 0.17, 0.3, TRUCK_PAINT.red, 12), 0, 0, 0.02, Math.PI / 2), at(rod(0.09, 0.09, 0.34, TRUCK_PAINT.grey, 8), 0, 0, -0.18, Math.PI / 2)]
  for (let i = 0; i < 6; i++) {
    const turn = (i / 6) * Math.PI * 2
    // A spoke, and a fat paddle at its end to catch the water.
    parts.push(at(box(0.08, WHEEL.radius * 0.7, 0.08, 0.03, PAINT.wheel), -Math.sin(turn) * WHEEL.radius * 0.35, Math.cos(turn) * WHEEL.radius * 0.35, 0, 0, 0, turn))
    parts.push(at(box(0.42, 0.26, 0.2, 0.08, i % 2 ? PAINT.bench : TRUCK_PAINT.red), -Math.sin(turn) * WHEEL.radius * 0.82, Math.cos(turn) * WHEEL.radius * 0.82, 0.02, 0, 0, turn))
  }
  // The wheel turns about its own axle, inside a head that leans back.
  const head = new THREE.Group()
  head.name = 'wheel-head'
  head.position.set(0, WHEEL.axle + 0.1, 0)
  head.rotation.x = -WHEEL.lean
  const wheel = named('wheel-wheel', parts, plastic)
  head.add(wheel)
  root.add(head)
  return { root, wheel }
}

export const PATCH = { radius: 1.05, top: 0.07 } as const

export type PatchModel = { root: THREE.Group; mound: THREE.Mesh; sheet: THREE.Mesh }

/** The dry patch: a low pale mound of baked sand. It is ground, so it stays plain; its colour is the stage's to change as it is watered. */
export function buildPatch(water: THREE.Material): PatchModel {
  const root = new THREE.Group()
  root.name = 'patch'
  const mound = named(
    'patch-mound',
    [lathe([[0, 0], [PATCH.radius, 0], [PATCH.radius - 0.06, 0.04], [PATCH.radius * 0.7, PATCH.top], [0, PATCH.top + 0.01]], 0xffffff, 26)],
    new THREE.MeshLambertMaterial({ vertexColors: true, color: PAINT.patch }),
  )
  root.add(mound)
  const sheet = named('patch-puddle', [rod(PATCH.radius * 0.62, PATCH.radius * 0.62, 0.016, WATER.body, 24)], water)
  sheet.position.y = PATCH.top + 0.014
  sheet.visible = false
  root.add(sheet)
  return { root, mound, sheet }
}

export type SnailModel = { root: THREE.Group; shell: THREE.Mesh; body: THREE.Mesh; feelers: THREE.Mesh }

/** The snail, who wants wet ground. Its body slides out of its shell and its feelers unroll. It faces +x. */
export function buildSnail(plastic: THREE.Material): SnailModel {
  const root = new THREE.Group()
  root.name = 'snail'
  const body = named('snail-body', [at(ball(0.2, PAINT.snailBody, [2.1, 0.55, 0.8], 12), 0.16, 0.11, 0), at(ball(0.15, PAINT.snailBody, [1, 0.9, 0.9], 10), 0.5, 0.2, 0)], plastic)
  root.add(body)
  const feelers = named(
    'snail-feelers',
    [at(rod(0.03, 0.035, 0.3, PAINT.snailBody, 6), 0, 0.15, 0.09), at(rod(0.03, 0.035, 0.3, PAINT.snailBody, 6), 0, 0.15, -0.09), eye(0, 0.32, 0.09, 0.06), eye(0, 0.32, -0.09, 0.06)],
    plastic,
  )
  feelers.position.set(0.52, 0.28, 0)
  body.add(feelers)
  // The shell: a fat coil, drawn as a ball with a darker whorl on each side.
  const shell = named(
    'snail-shell',
    [at(ball(0.34, PAINT.snailShell, [1, 1, 0.72], 14), 0, 0.36, 0), at(ring(0.17, 0.045, PAINT.log, 14), 0, 0.37, 0.235, Math.PI / 2), at(ring(0.17, 0.045, PAINT.log, 14), 0, 0.37, -0.235, Math.PI / 2)],
    plastic,
  )
  root.add(shell)
  return { root, shell, body, feelers }
}

export type BeeModel = { root: THREE.Group; body: THREE.Mesh; wings: THREE.Mesh }

/** The bee, who wants a flower: a fat striped body with two wings that blur. She faces +x. */
export function buildBee(plastic: THREE.Material): BeeModel {
  const root = new THREE.Group()
  root.name = 'bee'
  const body = named(
    'bee-body',
    [
      ball(0.2, PAINT.bee, [1.25, 1, 1], 12),
      at(ring(0.185, 0.04, PAINT.beeStripe, 12), -0.02, 0, 0, 0, 0, Math.PI / 2),
      at(ring(0.15, 0.04, PAINT.beeStripe, 12), -0.15, 0, 0, 0, 0, Math.PI / 2),
      at(ball(0.13, PAINT.beeStripe, [1, 1, 1], 10), 0.24, 0.02, 0),
      at(ball(0.035, TRUCK_PAINT.cream, [1, 1, 1], 6), 0.33, 0.06, 0.07),
      at(ball(0.035, TRUCK_PAINT.cream, [1, 1, 1], 6), 0.33, 0.06, -0.07),
    ],
    plastic,
  )
  root.add(body)
  const wings = named('bee-wings', [at(ball(0.16, PAINT.wing, [0.75, 0.12, 1.3], 8), -0.02, 0, 0.2), at(ball(0.16, PAINT.wing, [0.75, 0.12, 1.3], 8), -0.02, 0, -0.2)], plastic)
  wings.position.y = 0.2
  root.add(wings)
  return { root, body, wings }
}

export type WormModel = { root: THREE.Group; worm: THREE.Mesh }

/** The worm that comes up out of mud, looks about and goes back down. It stands upright and the stage raises it. */
export function buildWorm(plastic: THREE.Material): WormModel {
  const root = new THREE.Group()
  root.name = 'worm'
  const worm = named(
    'worm-body',
    [at(rod(0.1, 0.1, 0.7, PAINT.worm, 10), 0, 0.35, 0), at(ball(0.115, PAINT.worm, [1, 1, 1], 10), 0, 0.72, 0), eye(0.09, 0.76, 0.05, 0.035), eye(0.09, 0.76, -0.05, 0.035), at(ring(0.1, 0.02, PAINT.petal, 10), 0, 0.5, 0)],
    plastic,
  )
  root.add(worm)
  return { root, worm }
}
