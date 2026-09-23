import * as CANNON from 'cannon-es'
import { BAG, DOOR, FEEDING, RADIUS_BY_QUARTERS, SCALE, SHELF, TABLE, WORLD, type Circle, type MatKey, type Point, type Quarters } from './layout'

// Real stone physics (cannon-es) under the same world coordinates the game
// rules use. One 3D unit is one centimetre and ten world units; the table
// top is y = 0 and the world's centre is the origin. Stones are short
// cylinders so they lie flat and stack; walls make the bowl and pans hold
// what falls into them; anything that leaves the table top falls and is
// reported so it can go home to the bag.

export const UNIT = 0.1
export const GRAVITY = -981
export const STEP = 1 / 120
export const HOLD_HEIGHT = 11
export const PAN_REST_HEIGHT = 6
export const PAN_WALL = 1.6
export const BOWL_WALL = 4.8
const STONE_THICKNESS = 0.64
/** Catch-up substeps per frame by default. More would let one slow frame make the next one slower (a spiral), so an overloaded frame slows time slightly instead. */
export const DEFAULT_MAX_SUBSTEPS = 3
// Convex-convex collision cost grows with faces times edges, and a spill is
// almost all stone-on-stone contacts, so colliders use few sides. The drawn
// pebbles are separate meshes and stay round.
const STONE_SIDES = 8
const FIXTURE_SIDES = 10
const FALL_LIMIT = -12

export type Vec3 = { x: number; y: number; z: number }

export function to3(p: Point, y = 0): Vec3 {
  return { x: (p.x - WORLD.w / 2) * UNIT, y, z: (p.y - WORLD.h / 2) * UNIT }
}

export function toWorld2(v: { x: number; z: number }): Point {
  return { x: v.x / UNIT + WORLD.w / 2, y: v.z / UNIT + WORLD.h / 2 }
}

export function stoneRadius3(q: Quarters): number {
  return RADIUS_BY_QUARTERS[q] * UNIT
}

export function stoneHeight3(q: Quarters): number {
  return stoneRadius3(q) * STONE_THICKNESS
}

type StoneEntry = { body: CANNON.Body; q: Quarters }

export type StepReport = {
  fallen: number[]
  impacts: number[]
  moving: boolean
}

export class TablePhysics {
  readonly world: CANNON.World
  private readonly stones = new Map<number, StoneEntry>()
  private readonly stoneMaterial = new CANNON.Material('stone')
  private readonly woodMaterial = new CANNON.Material('wood')
  private readonly fixtures = new Map<string, CANNON.Body>()
  private readonly pans: CANNON.Body[] = []
  private readonly brooms = new Map<number, CANNON.Body>()
  private panDrops: [number, number] = [0, 0]
  private readonly targets = new Map<CANNON.Body, Vec3>()
  private impacts: number[] = []
  private accumulator = 0
  maxSubsteps = DEFAULT_MAX_SUBSTEPS

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
    this.world.allowSleep = true
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.defaultContactMaterial.friction = 0.4
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.woodMaterial, { friction: 0.45, restitution: 0.12 }))
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.stoneMaterial, { friction: 0.35, restitution: 0.22 }))
    this.addTable()
    this.addBowl()
  }

  private addTable(): void {
    const center = to3({ x: TABLE.x + TABLE.w / 2, y: TABLE.y + TABLE.h / 2 })
    const table = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    table.addShape(new CANNON.Box(new CANNON.Vec3((TABLE.w * UNIT) / 2, 2, (TABLE.h * UNIT) / 2)))
    table.position.set(center.x, -2, center.z)
    this.world.addBody(table)
    const shelfLeft = TABLE.x + TABLE.w
    const shelfRight = SHELF.x + SHELF.w
    const shelf = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    shelf.addShape(new CANNON.Box(new CANNON.Vec3(((shelfRight - shelfLeft) * UNIT) / 2, 2, (TABLE.h * UNIT) / 2)))
    const shelfCenter = to3({ x: (shelfLeft + shelfRight) / 2, y: TABLE.y + TABLE.h / 2 })
    shelf.position.set(shelfCenter.x, -2, shelfCenter.z)
    this.world.addBody(shelf)
  }

  private ring(body: CANNON.Body, radius: number, height: number, baseY: number): void {
    const segments = 14
    const thickness = 0.8
    const half = Math.tan(Math.PI / segments) * (radius + thickness)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const offset = new CANNON.Vec3(Math.cos(angle) * (radius + thickness / 2), baseY + height / 2, Math.sin(angle) * (radius + thickness / 2))
      const orientation = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle)
      body.addShape(new CANNON.Box(new CANNON.Vec3(thickness / 2, height / 2, half)), offset, orientation)
    }
  }

  private addBowl(): void {
    const bowl = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(FEEDING.bowl)
    bowl.position.set(at.x, 0, at.z)
    this.ring(bowl, FEEDING.bowl.r * UNIT, BOWL_WALL, 0)
    this.fixtures.set('bowl', bowl)
  }

  /** The scale's pans and post exist only while the scale is the live mat; the bowl only with Fair Feeding. */
  setMat(mat: MatKey): void {
    const bowl = this.fixtures.get('bowl')!
    for (const pan of this.pans) {
      this.world.removeBody(pan)
      this.targets.delete(pan)
    }
    this.pans.length = 0
    this.world.removeBody(bowl)
    this.removeFixture('post')
    this.removeFixture('house')
    if (mat === 'door') {
      this.setFixture('house', { ...DOOR.house, r: 130 * DOOR.houseScale }, 34)
      return
    }
    if (mat === 'feeding') {
      this.world.addBody(bowl)
      return
    }
    for (const pan of SCALE.pans) {
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.woodMaterial })
      const at = to3(pan)
      body.position.set(at.x, PAN_REST_HEIGHT, at.z)
      body.addShape(new CANNON.Cylinder(pan.r * UNIT, pan.r * UNIT, 0.6, FIXTURE_SIDES + 2), new CANNON.Vec3(0, -0.3, 0))
      this.ring(body, pan.r * UNIT, PAN_WALL, 0)
      this.world.addBody(body)
      this.pans.push(body)
    }
    this.setFixture('post', { ...SCALE.post, r: 18 }, 30)
    this.panDrops = [0, 0]
  }

  /** Beam tilt drives the pans up and down; stones in them ride along. `drops` are world units. */
  setPanDrops(drops: readonly [number, number]): void {
    const moved = Math.abs(drops[0] - this.panDrops[0]) > 0.01 || Math.abs(drops[1] - this.panDrops[1]) > 0.01
    this.pans.forEach((pan, side) => {
      this.targets.set(pan, { x: pan.position.x, y: PAN_REST_HEIGHT - drops[side] * UNIT, z: pan.position.z })
    })
    if (moved) for (const { body } of this.stones.values()) body.wakeUp()
    this.panDrops = [drops[0], drops[1]]
  }

  panTop(side: 0 | 1): number {
    return this.pans[side]?.position.y ?? PAN_REST_HEIGHT
  }

  setFixture(key: string, circle: Circle, height = 12): void {
    this.removeFixture(key)
    const body = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(circle)
    body.position.set(at.x, height / 2, at.z)
    body.addShape(new CANNON.Cylinder(circle.r * UNIT, circle.r * UNIT, height, FIXTURE_SIDES))
    this.world.addBody(body)
    this.fixtures.set(key, body)
  }

  removeFixture(key: string): void {
    const body = this.fixtures.get(key)
    if (body && key !== 'bowl') {
      this.world.removeBody(body)
      this.fixtures.delete(key)
    }
  }

  addBag(): void {
    this.setFixture('bag', { x: BAG.x, y: BAG.y + 10, r: 72 }, 14)
  }

  addStone(id: number, q: Quarters, at: Point, options: { y?: number; velocity?: Vec3; spin?: number } = {}): void {
    this.removeStone(id)
    const r = stoneRadius3(q)
    const h = stoneHeight3(q)
    const body = new CANNON.Body({
      mass: q,
      material: this.stoneMaterial,
      linearDamping: 0.35,
      angularDamping: 0.75,
      sleepSpeedLimit: 1.2,
      sleepTimeLimit: 0.4,
    })
    body.addShape(new CANNON.Cylinder(r, r, h, STONE_SIDES))
    const p = to3(at, options.y ?? h / 2)
    body.position.set(p.x, p.y, p.z)
    if (options.velocity) body.velocity.set(options.velocity.x, options.velocity.y, options.velocity.z)
    if (options.spin) body.angularVelocity.set(0, options.spin, 0)
    body.addEventListener('collide', (event: { contact: CANNON.ContactEquation }) => {
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())
      if (speed > 25) this.impacts.push(speed)
    })
    this.world.addBody(body)
    this.stones.set(id, { body, q })
  }

  removeStone(id: number): void {
    const entry = this.stones.get(id)
    if (!entry) return
    this.targets.delete(entry.body)
    this.world.removeBody(entry.body)
    this.stones.delete(id)
  }

  hasStone(id: number): boolean {
    return this.stones.has(id)
  }

  stoneIds(): number[] {
    return [...this.stones.keys()]
  }

  body(id: number): CANNON.Body | undefined {
    return this.stones.get(id)?.body
  }

  /** Where a stone is on the table plane, in world units. */
  position2(id: number): Point | null {
    const body = this.body(id)
    return body ? toWorld2(body.position) : null
  }

  /** Lift a stone into the child's fingers: it follows the finger and pushes others, but nothing pushes it. */
  hold(id: number): void {
    const body = this.body(id)
    if (!body) return
    body.type = CANNON.Body.KINEMATIC
    body.collisionResponse = false
    body.velocity.setZero()
    body.angularVelocity.setZero()
    body.quaternion.set(0, 0, 0, 1)
    body.wakeUp()
  }

  /** Follow the finger with a little lag, which reads as weight; `follow` is the fraction closed per call. */
  moveHeld(id: number, at: Point, height = HOLD_HEIGHT, follow = 1): void {
    const body = this.body(id)
    if (!body) return
    const goal = to3(at, height)
    const from = this.targets.get(body) ?? { x: body.position.x, y: body.position.y, z: body.position.z }
    this.targets.set(body, {
      x: from.x + (goal.x - from.x) * follow,
      y: from.y + (goal.y - from.y) * follow,
      z: from.z + (goal.z - from.z) * follow,
    })
  }

  /** Let go: the stone drops from where it is, carrying the finger's flick. */
  release(id: number, velocity: Point): void {
    const body = this.body(id)
    if (!body) return
    this.targets.delete(body)
    body.type = CANNON.Body.DYNAMIC
    body.collisionResponse = true
    body.velocity.set(velocity.x * UNIT, 0, velocity.y * UNIT)
    body.angularVelocity.set(velocity.y * UNIT * 0.05, 0, -velocity.x * UNIT * 0.05)
    body.wakeUp()
  }

  /** A sweeping finger: a low kinematic cylinder dragged across the table top. */
  setBroom(pointerId: number, at: Point | null): void {
    let body = this.brooms.get(pointerId)
    if (!at) {
      if (body) {
        this.world.removeBody(body)
        this.targets.delete(body)
      }
      this.brooms.delete(pointerId)
      return
    }
    if (!body) {
      body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.woodMaterial })
      body.addShape(new CANNON.Cylinder(4.2, 4.2, 3, STONE_SIDES))
      const start = to3(at, 1.5)
      body.position.set(start.x, start.y, start.z)
      this.world.addBody(body)
      this.brooms.set(pointerId, body)
    }
    this.targets.set(body, to3(at, 1.5))
    for (const { body: stone } of this.stones.values()) stone.wakeUp()
  }

  clearBrooms(): void {
    for (const pointerId of [...this.brooms.keys()]) this.setBroom(pointerId, null)
  }

  /** Clay pebbles are not wheels: a stone rolling on its rim loses speed and spin fast, so it tips flat instead of rolling away. */
  private resistRolling(): void {
    const up = new CANNON.Vec3()
    for (const { body } of this.stones.values()) {
      if (body.type !== CANNON.Body.DYNAMIC || body.sleepState === CANNON.Body.SLEEPING) continue
      body.quaternion.vmult(CANNON.Vec3.UNIT_Y, up)
      const onRim = 1 - Math.abs(up.y)
      if (onRim < 0.25 || body.position.y > 6) continue
      const keep = 1 - onRim * 0.15
      body.angularVelocity.x *= keep
      body.angularVelocity.z *= keep
      body.velocity.x *= 1 - onRim * 0.08
      body.velocity.z *= 1 - onRim * 0.08
    }
  }

  step(elapsed: number): StepReport {
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * this.maxSubsteps)
    while (this.accumulator >= STEP) {
      for (const [body, target] of this.targets) {
        body.velocity.set((target.x - body.position.x) / STEP, (target.y - body.position.y) / STEP, (target.z - body.position.z) / STEP)
      }
      this.world.step(STEP)
      this.resistRolling()
      this.accumulator -= STEP
    }
    for (const [body, target] of this.targets) {
      body.position.set(target.x, target.y, target.z)
      body.velocity.setZero()
    }
    const fallen: number[] = []
    let moving = false
    for (const [id, { body }] of this.stones) {
      if (body.type === CANNON.Body.KINEMATIC) continue
      if (body.position.y < FALL_LIMIT) fallen.push(id)
      else if (body.sleepState !== CANNON.Body.SLEEPING && body.velocity.length() > 1.5) moving = true
    }
    const impacts = this.impacts
    this.impacts = []
    return { fallen, impacts, moving }
  }
}
