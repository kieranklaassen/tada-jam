import * as THREE from 'three'
import type { Picker, Scenery, Target } from '../controller'
import { RACK } from '../controller'
import type { CreatureKind } from '../creatures'
import type { Point } from '../input'
import { buildable, COLS, ROWS, type Cell } from '../layout'
import { backZ, BANK_Y, cellX, CREEK_Y, CREEK_Z0, CREEK_Z1, floorY, frontZ, PIPE_Y, RACK_Y, RACK_Z, rackX, rowZ, SPRING } from './world'

// Screen space and world space, both ways (KTD7). The camera never moves
// except on resize, so cell and rack centres are projected once per resize;
// touches are matched against those points by distance, which is forgiving
// for small fingers and costs nothing per frame.

const CREATURE_RADIUS = 44
/** A finger that meets the hillside plane further back than this is on the crest or in the sky. */
const CREST_Z = backZ(0) - 0.8
const IN_FRONT = 0.7

export type CreatureSpot = { kind: CreatureKind; visible: boolean; at: THREE.Vector3 }

export class Projector implements Picker {
  private readonly camera: THREE.PerspectiveCamera
  private width = 1
  private height = 1
  private readonly cells = new Float32Array(COLS * ROWS * 2)
  private readonly rack = new Float32Array(RACK.length * 2)
  private readonly spring = { x: 0, y: 0 }
  /** Half the on-screen distance between neighbouring columns: the reach of a touch. */
  private reach = 60
  private readonly v = new THREE.Vector3()
  private readonly ray = new THREE.Ray()
  private readonly plane: THREE.Plane
  private readonly creek = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CREEK_Y)
  private readonly bank = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BANK_Y)
  creatures: CreatureSpot[] = []

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    // A plane that lies along the terraces, used to carry pieces over the hillside.
    const low = new THREE.Vector3(0, floorY(ROWS - 1), frontZ(ROWS - 1))
    const high = new THREE.Vector3(0, floorY(0), backZ(0))
    const along = high.clone().sub(low)
    const normal = new THREE.Vector3(1, 0, 0).cross(along).normalize()
    this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, low)
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.camera.updateMatrixWorld()
    const out = { x: 0, y: 0 }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.toScreen(this.v.set(cellX(c), floorY(r) + PIPE_Y * 0.5, rowZ(r)), out)
        const i = (r * COLS + c) * 2
        this.cells[i] = out.x
        this.cells[i + 1] = out.y
      }
    }
    for (let s = 0; s < RACK.length; s++) {
      this.toScreen(this.v.set(rackX(s, RACK.length), RACK_Y + 0.1, RACK_Z), out)
      this.rack[s * 2] = out.x
      this.rack[s * 2 + 1] = out.y
    }
    this.toScreen(SPRING, this.spring)
    this.reach = (this.cells[2] - this.cells[0]) * 0.5
  }

  toScreen(world: THREE.Vector3, out: Point): Point {
    this.v.copy(world).project(this.camera)
    out.x = (this.v.x * 0.5 + 0.5) * this.width
    out.y = (-this.v.y * 0.5 + 0.5) * this.height
    return out
  }

  /** Screen point of a cell's centre (at pipe height). */
  cellScreen(c: number, r: number, out: Point): Point {
    const i = (r * COLS + c) * 2
    out.x = this.cells[i]
    out.y = this.cells[i + 1]
    return out
  }

  rackScreen(slot: number, out: Point): Point {
    out.x = this.rack[slot * 2]
    out.y = this.rack[slot * 2 + 1]
    return out
  }

  private setRay(at: Point): THREE.Ray {
    this.v.set((at.x / this.width) * 2 - 1, -(at.y / this.height) * 2 + 1, 0.5).unproject(this.camera)
    this.ray.origin.copy(this.camera.position)
    this.ray.direction.copy(this.v).sub(this.camera.position).normalize()
    return this.ray
  }

  /** Where a finger points on the hillside plane. */
  hill(at: Point, out: THREE.Vector3): THREE.Vector3 {
    return this.setRay(at).intersectPlane(this.plane, out) ?? out.set(0, 0, 0)
  }

  /** The ray from the camera through a finger (shared: valid until the next call that reads a finger). */
  fingerRay(at: Point): THREE.Ray {
    return this.setRay(at)
  }

  /** A point along the finger's ray at a given distance from the camera (for the ghost hand). */
  along(at: Point, distance: number, out: THREE.Vector3): THREE.Vector3 {
    return this.setRay(at).at(distance, out)
  }

  private nearestCell(at: Point, reach: number): Cell | null {
    let best = -1
    let bestD = reach * reach
    for (let i = 0; i < COLS * ROWS; i++) {
      const dx = at.x - this.cells[i * 2]
      const dy = (at.y - this.cells[i * 2 + 1]) * 1.25
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best < 0 ? null : { c: best % COLS, r: Math.floor(best / COLS) }
  }

  pick(at: Point): Target {
    const out = { x: 0, y: 0 }
    for (const spot of this.creatures) {
      if (!spot.visible) continue
      this.toScreen(spot.at, out)
      if (Math.hypot(at.x - out.x, at.y - out.y) < CREATURE_RADIUS) return { kind: 'creature', which: spot.kind }
    }
    for (let s = 0; s < RACK.length; s++) {
      if (Math.hypot(at.x - this.rack[s * 2], (at.y - this.rack[s * 2 + 1]) * 1.2) < this.reach * 1.05) return { kind: 'rack', slot: s }
    }
    if (Math.hypot(at.x - this.spring.x, at.y - this.spring.y) < this.reach * 0.9) return { kind: 'spring' }
    const cell = this.nearestCell(at, this.reach * 1.2)
    return cell ? { kind: 'cell', c: cell.c, r: cell.r } : { kind: 'scenery', where: this.scenery(at), at: { x: at.x, y: at.y } }
  }

  private scenery(at: Point): Scenery {
    const ray = this.setRay(at)
    const water = ray.intersectPlane(this.creek, this.v)
    if (water && water.z >= CREEK_Z0 && water.z <= CREEK_Z1) return 'creek'
    const hill = ray.intersectPlane(this.plane, this.v)
    return hill && hill.z > CREST_Z ? 'meadow' : 'sky'
  }

  /** Where a touch on the scenery should answer: on the water, on the grass or bank, or in the air in front of the crest. */
  sceneryPoint(where: Scenery, at: Point, out: THREE.Vector3): THREE.Vector3 {
    const ray = this.setRay(at)
    switch (where) {
      case 'creek':
        return ray.intersectPlane(this.creek, out) ?? out.copy(SPRING)
      case 'meadow': {
        const hill = ray.intersectPlane(this.plane, out)
        const ground = hill && hill.z <= CREEK_Z1 ? hill : ray.intersectPlane(this.bank, out)
        if (!ground) return out.copy(SPRING)
        // Back toward the camera along the finger, so the flick shows in front of the hedge or wall it touched.
        return ray.at(ray.origin.distanceTo(ground) - IN_FRONT, out)
      }
      case 'sky':
        return ray.at(this.camera.position.distanceTo(SPRING) + 1.2, out)
      default: {
        const never: never = where
        return never
      }
    }
  }

  dropCell(at: Point): Cell | null {
    const cell = this.nearestCell(at, this.reach * 1.3)
    return cell && buildable(cell.c, cell.r) ? cell : null
  }
}
