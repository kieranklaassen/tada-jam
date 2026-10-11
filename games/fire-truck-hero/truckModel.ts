// The toy fire truck: a fat blow-moulded shell on four wheels, with a face in
// its headlights, a light on its roof and a nozzle that turns and tilts. It is
// built once from moulded parts (mould.ts). The parts that move by themselves
// are separate meshes, each with a name the intersection audit reads.
//
// The truck faces along +x, toward the yard. Lengths are yard units.

import * as THREE from 'three'
import { TRUCK_PAINT as PAINT } from './look'
import { at, ball, boss, box, lathe, mould, rod, seam, type Part } from './mould'
import type { TruckPose } from './truckMotion'

/** Where the nozzle pivots, measured from the truck's middle on the ground. layout.ts places the water's start here. */
export const NOZZLE_PIVOT = { x: 0.92, y: 2.58 } as const
/** The barrel never tilts down further than this, in radians, so it stays clear of the cab's roof. */
export const LOWEST_TILT = -0.26
/** The length of the nozzle's barrel, from its pivot to its mouth. */
export const BARREL = 0.95

const WHEEL_RADIUS = 0.42
const AXLES = [-0.98, 0.98] as const
const TRACK = 0.74
/** The body rocks about a point at this height: its springs sit just above the axles. */
const ROCK_HEIGHT = 0.55

export type TruckModel = {
  /** The whole truck, standing at the origin. */
  root: THREE.Group
  /** The shell on its springs: it rocks back with every gulp and hops on a honk. */
  body: THREE.Group
  /** The pupils of the headlight eyes: they look where the nozzle points. */
  pupils: THREE.Mesh
  /** The roof light, which turns. */
  light: THREE.Mesh
  /** Turns about the upright to face the target. */
  turret: THREE.Group
  /** Tilts up and down. */
  nozzle: THREE.Group
  wheels: THREE.Mesh
}

/** Where the roof light stands on the rear deck, clear of the barrel's swing. */
const LIGHT = { x: -0.5, y: 1.84, z: 0.02 } as const

/** Where the eyes sit on the windscreen, measured from the truck's middle on the ground. */
const EYES = { x: 1.56, y: 1.8, apart: 0.31 } as const

function shell(): Part[] {
  const parts: Part[] = [
    // The lower body, one fat moulding, with its seam round the middle and a cream stripe along each side.
    at(box(3.2, 0.82, 1.5, 0.3, PAINT.red), 0, 1.0, 0),
    at(seam(3.2, 0.82, 0.3, PAINT.red), 0, 1.0, 0),
    at(box(3.02, 0.16, 1.54, 0.06, PAINT.cream), 0, 0.92, 0),
    // The cab, at the front, with a window in each side.
    at(box(1.25, 0.78, 1.44, 0.3, PAINT.red), 0.94, 1.74, 0),
    // A hair thicker than the body's seam, so that where the two cross their faces do not lie in one plane.
    at(seam(1.25, 0.78, 0.3, PAINT.red, 0.06), 0.94, 1.74, 0),
    at(box(0.6, 0.38, 1.47, 0.06, PAINT.glass), 0.9, 1.8, 0),
    // The windscreen holds the face: two big whites, with the pupils a separate moulding in front of them.
    at(ball(0.3, PAINT.cream, [0.45, 1, 0.95]), EYES.x, EYES.y, EYES.apart),
    at(ball(0.3, PAINT.cream, [0.45, 1, 0.95]), EYES.x, EYES.y, -EYES.apart),
    // The bumper, which reads as a mouth, and a headlamp at each end of it.
    at(box(0.3, 0.26, 1.58, 0.12, PAINT.cream), 1.56, 0.78, 0),
    at(ball(0.15, PAINT.yellow, [0.6, 1, 1], 10), 1.64, 1.14, 0.5),
    at(ball(0.15, PAINT.yellow, [0.6, 1, 1], 10), 1.64, 1.14, -0.5),
    // A small hose reel at the back.
    at(rod(0.27, 0.27, 0.46, PAINT.grey, 16), -1.18, 1.62, 0.32, Math.PI / 2),
    at(rod(0.34, 0.34, 0.07, PAINT.yellow, 16), -1.18, 1.62, 0.58, Math.PI / 2),
    at(rod(0.34, 0.34, 0.07, PAINT.yellow, 16), -1.18, 1.62, 0.06, Math.PI / 2),
    // The pedestal the turret stands on, in the middle of the cab's roof, so the barrel swings clear of everything.
    at(lathe([[0.36, 0], [0.36, 0.08], [0.27, 0.16], [0.25, 0.38], [0, 0.38]], PAINT.grey, 16), NOZZLE_PIVOT.x, 2.1, 0),
    // The stalk of the roof light, on the rear deck.
    at(rod(0.16, 0.2, 0.46, PAINT.grey, 12), LIGHT.x, 1.62, LIGHT.z),
  ]
  // The ladder, lying along the far side of the roof: what makes a red truck a fire truck from above.
  for (const side of [-0.34, -0.66]) parts.push(at(box(2.05, 0.09, 0.09, 0.04, PAINT.yellow), -0.48, 1.5, side))
  for (let rung = 0; rung < 6; rung++) parts.push(at(box(0.08, 0.07, 0.36, 0.03, PAINT.yellow), -1.38 + rung * 0.36, 1.5, -0.5))
  // Screw bosses: where the two halves of the shell are screwed together.
  for (const x of [-1.25, 0.2, 1.25]) {
    for (const side of [1, -1]) parts.push(at(boss(PAINT.red), x, 1.22, side * 0.755))
  }
  return parts
}

function wheels(): Part[] {
  const parts: Part[] = []
  for (const x of AXLES) {
    for (const side of [1, -1]) {
      parts.push(at(rod(WHEEL_RADIUS, WHEEL_RADIUS, 0.36, PAINT.tyre, 20), x, WHEEL_RADIUS, side * TRACK, Math.PI / 2))
      parts.push(at(rod(0.21, 0.21, 0.4, PAINT.yellow, 14), x, WHEEL_RADIUS, side * TRACK, Math.PI / 2))
    }
  }
  return parts
}

export function buildTruck(plastic: THREE.Material): TruckModel {
  const root = new THREE.Group()
  root.name = 'truck'

  const wheelMesh = new THREE.Mesh(mould(wheels()), plastic)
  wheelMesh.name = 'truck-wheels'
  root.add(wheelMesh)

  // The body hangs in a group whose origin is where it rocks, so a tilt reads as springs and not as sliding.
  const body = new THREE.Group()
  body.name = 'truck-body'
  body.position.y = ROCK_HEIGHT
  root.add(body)
  const shellMesh = new THREE.Mesh(mould(shell()), plastic)
  shellMesh.name = 'truck-shell'
  shellMesh.position.y = -ROCK_HEIGHT
  body.add(shellMesh)

  const pupils = new THREE.Mesh(mould([at(ball(0.14, PAINT.pupil, [0.5, 1, 1]), 0, 0, EYES.apart), at(ball(0.14, PAINT.pupil, [0.5, 1, 1]), 0, 0, -EYES.apart)]), plastic)
  pupils.name = 'truck-pupils'
  pupils.position.set(EYES.x + 0.11, EYES.y - ROCK_HEIGHT, 0)
  body.add(pupils)

  // The roof light: a blue dome, which is round and would not show its turning, with a cream bar through it
  // whose two ends stand well out of its sides, and a cream lamp on one side of its top. Both go round with it.
  const light = new THREE.Mesh(
    mould([
      lathe([[0.3, 0], [0.3, 0.12], [0.24, 0.29], [0.12, 0.38], [0, 0.4]], PAINT.lightDome, 16),
      at(box(0.82, 0.12, 0.16, 0.05, PAINT.cream), 0, 0.12, 0),
      at(ball(0.09, PAINT.cream, [1, 0.8, 1], 8), 0.15, 0.33, 0),
    ]),
    plastic,
  )
  light.name = 'truck-light'
  light.position.set(LIGHT.x, LIGHT.y - ROCK_HEIGHT, LIGHT.z)
  body.add(light)

  const turret = new THREE.Group()
  turret.name = 'truck-turret'
  turret.position.set(NOZZLE_PIVOT.x, NOZZLE_PIVOT.y - ROCK_HEIGHT, 0)
  body.add(turret)
  const yoke = new THREE.Mesh(mould([ball(0.27, PAINT.grey), at(rod(0.1, 0.1, 0.66, PAINT.grey, 10), 0, 0, 0, Math.PI / 2)]), plastic)
  yoke.name = 'truck-yoke'
  turret.add(yoke)

  const nozzle = new THREE.Group()
  nozzle.name = 'truck-nozzle'
  turret.add(nozzle)
  const barrel = new THREE.Mesh(
    mould([
      // The barrel lies along +x from the pivot, fat at the back and with a red mouth.
      at(rod(0.13, 0.2, BARREL, PAINT.yellow, 14), BARREL / 2, 0, 0, 0, 0, -Math.PI / 2),
      at(rod(0.18, 0.15, 0.16, PAINT.red, 14), BARREL - 0.02, 0, 0, 0, 0, -Math.PI / 2),
      at(ball(0.2, PAINT.yellow), -0.05, 0, 0),
    ]),
    plastic,
  )
  barrel.name = 'truck-barrel'
  nozzle.add(barrel)

  return { root, body, pupils, light, turret, nozzle, wheels: wheelMesh }
}

/**
 * Puts the truck into a pose (truckMotion.ts). `faces` is how far the whole
 * truck is turned about the upright, so the nozzle can point at a place in
 * the yard and not at a place on the truck.
 */
export function poseTruck(model: TruckModel, pose: TruckPose, faces: number): void {
  model.body.rotation.z = pose.rock
  // A hop takes the wheels with it; the idle bob is the body on its springs.
  model.root.position.y = pose.lift
  model.body.position.y = ROCK_HEIGHT + pose.bob
  // Squashed it is wider, stretched it is thinner: it keeps its bulk.
  const wide = 1 / Math.sqrt(pose.squash)
  model.body.scale.set(wide, pose.squash, wide)
  // The pose turns toward +z, and three.js turns the other way about the upright.
  model.turret.rotation.y = -pose.turn - faces
  model.nozzle.rotation.z = Math.max(LOWEST_TILT, pose.tilt - pose.rock)
  model.light.rotation.y = pose.light
  model.pupils.position.z = pose.lookSide * 0.09
  model.pupils.position.y = EYES.y - ROCK_HEIGHT + pose.lookUp * 0.07
  model.pupils.scale.y = Math.max(0.12, pose.eyesOpen)
}
