import * as CANNON from 'cannon-es'
import { PIECES, PLAY_MAX_X, PLAY_MIN_X, pieceShape, type Pose, type PieceShape } from './pieces'

// Real wooden-block physics on one build plane (KTD1). Every body is
// extruded from the same convex parts the planner and the mesh use (KTD2),
// may only slide in x and y and turn about z, and falls under a softened
// gravity so a topple reads as a slow, funny tumble instead of a crash. The
// held piece hovers with no collision at all (KTD5) and drops from where it
// is. The doll's weight is a real force on whatever it stands on (KTD4).

export const GRAVITY = -30
export const STEP = 1 / 60
export const DOLL_WEIGHT = 0.7
const MAX_IMPACTS = 16
const IMPACT_SPEED = 0.9
const STILL_SPEED = 0.12
const SETTLE_SECONDS = 0.3
const LOST_Y = -3

export type StepReport = {
  /** How many new contacts this step were hard enough to hear; ids and speeds are in `impactIds` and `impactSpeeds`. */
  impacts: number
  impactIds: Int16Array
  impactSpeeds: Float32Array
  /** Anything loose still moving. */
  moving: boolean
  /** True on the one step the world came to rest. */
  settledNow: boolean
  /** A piece that left the room (only possible through a numeric glitch); the controller sends it home. */
  lost: number
}

function extrude(parts: readonly { x: number; y: number }[], depth: number): CANNON.ConvexPolyhedron {
  const n = parts.length
  const vertices: CANNON.Vec3[] = []
  for (const p of parts) vertices.push(new CANNON.Vec3(p.x, p.y, depth / 2))
  for (const p of parts) vertices.push(new CANNON.Vec3(p.x, p.y, -depth / 2))
  const front: number[] = []
  const back: number[] = []
  for (let i = 0; i < n; i++) {
    front.push(i)
    back.push(2 * n - 1 - i)
  }
  const faces = [front, back]
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push([i, i + n, j + n, j])
  }
  return new CANNON.ConvexPolyhedron({ vertices, faces })
}

/** The shared hull of each piece kind, built once. */
const hulls = new Map<PieceShape, CANNON.ConvexPolyhedron[]>()
function hullOf(shape: PieceShape): CANNON.ConvexPolyhedron[] {
  let parts = hulls.get(shape)
  if (!parts) {
    parts = shape.parts.map((part) => extrude(part, shape.depth))
    hulls.set(shape, parts)
  }
  return parts
}

export function angleOf(body: CANNON.Body): number {
  return 2 * Math.atan2(body.quaternion.z, body.quaternion.w)
}

type Held = { x: number; y: number; angle: number }

export class PlayPhysics {
  readonly world: CANNON.World
  private readonly bodies: (CANNON.Body | null)[] = PIECES.map(() => null)
  private readonly held = new Map<number, Held>()
  private readonly woodMaterial = new CANNON.Material('wood')
  private readonly rugMaterial = new CANNON.Material('rug')
  private accumulator = 0
  private still = 0
  private resting = true
  private loadId: number | null = null
  private readonly loadPoint = new CANNON.Vec3()
  private readonly loadForce = new CANNON.Vec3(0, DOLL_WEIGHT * GRAVITY, 0)
  private readonly scratch = new CANNON.Vec3()
  /** Catch-up substeps allowed per frame (the quality tier lowers it). */
  maxSubsteps = 3
  private readonly report: StepReport = {
    impacts: 0,
    impactIds: new Int16Array(MAX_IMPACTS),
    impactSpeeds: new Float32Array(MAX_IMPACTS),
    moving: false,
    settledNow: false,
    lost: -1,
  }

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
    this.world.allowSleep = true
    this.world.broadphase = new CANNON.NaiveBroadphase()
    const solver = new CANNON.GSSolver()
    solver.iterations = 14
    solver.tolerance = 1e-4
    this.world.solver = solver
    this.world.defaultContactMaterial.friction = 0.6
    this.world.defaultContactMaterial.restitution = 0.04
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.woodMaterial, this.woodMaterial, { friction: 0.62, restitution: 0.06 }))
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.woodMaterial, this.rugMaterial, { friction: 0.85, restitution: 0.02 }))

    const rug = new CANNON.Body({ mass: 0, material: this.rugMaterial })
    rug.addShape(new CANNON.Plane())
    rug.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.world.addBody(rug)
    for (const x of [PLAY_MIN_X - 0.5, PLAY_MAX_X + 0.5]) {
      const wall = new CANNON.Body({ mass: 0, material: this.woodMaterial })
      wall.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 30, 2)))
      wall.position.set(x, 30, 0)
      this.world.addBody(wall)
    }
  }

  body(id: number): CANNON.Body | null {
    return this.bodies[id] ?? null
  }

  has(id: number): boolean {
    return this.bodies[id] !== null
  }

  isHeld(id: number): boolean {
    return this.held.has(id)
  }

  /** Put a piece on the plane, at rest, at a pose. */
  add(id: number, pose: Pose): CANNON.Body {
    this.remove(id)
    const shape = pieceShape(id)
    const body = new CANNON.Body({
      mass: shape.mass,
      material: this.woodMaterial,
      linearFactor: new CANNON.Vec3(1, 1, 0),
      angularFactor: new CANNON.Vec3(0, 0, 1),
      linearDamping: 0.04,
      angularDamping: 0.12,
      sleepSpeedLimit: 0.1,
      sleepTimeLimit: 0.35,
    })
    for (const hull of hullOf(shape)) body.addShape(hull)
    body.position.set(pose.x, pose.y, 0)
    body.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Z, pose.angle)
    body.addEventListener('collide', (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      if (this.held.has(id)) return
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())
      const report = this.report
      if (speed < IMPACT_SPEED || report.impacts >= MAX_IMPACTS) return
      report.impactIds[report.impacts] = id
      report.impactSpeeds[report.impacts] = speed
      report.impacts += 1
    })
    this.world.addBody(body)
    this.bodies[id] = body
    this.wakeAll()
    return body
  }

  remove(id: number): void {
    const body = this.bodies[id]
    if (!body) return
    this.world.removeBody(body)
    this.bodies[id] = null
    this.held.delete(id)
    if (this.loadId === id) this.loadId = null
    this.wakeAll()
  }

  /** Lift a piece into the child's fingers: no collisions at all, so nothing pushes it and it pushes nothing. */
  hold(id: number): void {
    const body = this.bodies[id]
    if (!body) return
    body.type = CANNON.Body.KINEMATIC
    body.collisionResponse = false
    body.collisionFilterMask = 0
    body.velocity.setZero()
    body.angularVelocity.setZero()
    this.held.set(id, { x: body.position.x, y: body.position.y, angle: angleOf(body) })
    if (this.loadId === id) this.loadId = null
    this.wakeAll()
  }

  /** Where the held piece should be next; it closes the gap within a step. */
  moveHeld(id: number, x: number, y: number, angle: number): void {
    const target = this.held.get(id)
    if (!target) return
    target.x = x
    target.y = y
    target.angle = angle
  }

  /** Let go: the piece drops from where it hovers, keeping a little of the finger's sideways swing. */
  release(id: number, vx: number): void {
    const body = this.bodies[id]
    if (!body || !this.held.has(id)) return
    this.held.delete(id)
    body.type = CANNON.Body.DYNAMIC
    body.collisionResponse = true
    body.collisionFilterMask = -1
    body.velocity.set(Math.max(-3, Math.min(3, vx)), 0, 0)
    body.angularVelocity.setZero()
    body.wakeUp()
    this.resting = false
    this.still = 0
  }

  /** The doll stands on `id` at world point (x, y), or on the rug when id is null. */
  setLoad(id: number | null, x = 0, y = 0): void {
    const changed = id !== this.loadId || Math.abs(x - this.loadPoint.x) > 0.05
    this.loadId = id
    this.loadPoint.set(x, y, 0)
    if (changed && id !== null) this.wakeAll()
  }

  wakeAll(): void {
    for (const body of this.bodies) {
      if (body && body.type === CANNON.Body.DYNAMIC) body.wakeUp()
    }
    this.resting = false
    this.still = 0
  }

  pose(id: number, out: Pose): Pose {
    const body = this.bodies[id]
    if (body) {
      out.x = body.position.x
      out.y = body.position.y
      out.angle = angleOf(body)
    }
    return out
  }

  /** Speed of a piece (linear plus a share of spin), used to tell when the doll's support gives way. */
  speedOf(id: number): number {
    const body = this.bodies[id]
    if (!body) return Infinity
    return body.velocity.length() + Math.abs(body.angularVelocity.z) * 0.6
  }

  get isResting(): boolean {
    return this.resting
  }

  step(elapsed: number): StepReport {
    const report = this.report
    report.impacts = 0
    report.settledNow = false
    report.lost = -1
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * this.maxSubsteps)
    while (this.accumulator >= STEP) {
      for (const [id, target] of this.held) {
        const body = this.bodies[id]!
        body.velocity.set((target.x - body.position.x) / STEP, (target.y - body.position.y) / STEP, 0)
        let turn = target.angle - angleOf(body)
        turn = Math.atan2(Math.sin(turn), Math.cos(turn))
        body.angularVelocity.set(0, 0, turn / STEP)
      }
      const load = this.loadId === null ? null : this.bodies[this.loadId]
      if (load && load.type === CANNON.Body.DYNAMIC && load.sleepState !== CANNON.Body.SLEEPING) {
        this.loadPoint.vsub(load.position, this.scratch)
        this.scratch.z = 0
        load.applyForce(this.loadForce, this.scratch)
      }
      this.world.step(STEP)
      this.accumulator -= STEP
    }
    for (const [id, target] of this.held) {
      const body = this.bodies[id]!
      body.position.set(target.x, target.y, 0)
      body.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Z, target.angle)
      body.velocity.setZero()
      body.angularVelocity.setZero()
    }
    let moving = false
    for (let id = 0; id < this.bodies.length; id++) {
      const body = this.bodies[id]
      if (!body || this.held.has(id)) continue
      if (body.position.y < LOST_Y || body.position.x < PLAY_MIN_X - 2 || body.position.x > PLAY_MAX_X + 2) report.lost = id
      if (body.sleepState === CANNON.Body.SLEEPING) continue
      if (body.velocity.length() > STILL_SPEED || Math.abs(body.angularVelocity.z) > STILL_SPEED * 1.5) moving = true
    }
    report.moving = moving
    if (moving) {
      this.still = 0
      this.resting = false
    } else if (!this.resting) {
      this.still += elapsed
      if (this.still >= SETTLE_SECONDS) {
        this.resting = true
        report.settledNow = true
      }
    }
    return report
  }
}
