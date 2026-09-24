import * as CANNON from 'cannon-es'
import { BODY_R, HAIR, HEAD_R, HEAD_Y, NECK_Y } from './doll'
import { PIECES, PLAY_MAX_X, PLAY_MIN_X, pieceShape, type Pose, type PieceShape, type Vec2 } from './pieces'

// Real wooden-block physics on one build plane (KTD1). Every body is
// extruded from the same convex parts the planner and the mesh use (KTD2),
// may only slide in x and y and turn about z, and falls under a softened
// gravity so a topple reads as a slow, funny tumble instead of a crash. The
// held piece hovers with no collision at all (KTD5) and drops from where it
// is. The doll's weight is a real force on whatever it stands on (KTD4).
// The doll is also in the way of anything loose: a block that falls, slides
// or tumbles into her bounces off her outline instead of passing through,
// and the controller hears when it came in hard enough to knock her over.
// Blocks at rest, and whatever is under her feet, never meet her, so her own
// steps and climbs never shove the build.

export const GRAVITY = -30
export const STEP = 1 / 60
export const DOLL_WEIGHT = 0.7
const MAX_IMPACTS = 16
const IMPACT_SPEED = 0.9
/** A knock at least this hard is a clatter rather than a block being set down. */
export const HARD_KNOCK = 2
const STILL_SPEED = 0.12
const SETTLE_SECONDS = 0.3
const LOST_Y = -3
/** Below this speed a body may fall asleep. Cannon's 0.1 never lets a straight tower sleep: it creeps a hair a frame and keeps the solver running (and the doll on top rides the creep). */
const SLEEP_SPEED = 0.4
/**
 * A loaded tower can still jiggle above that speed for seconds without going
 * anywhere, and the doll waits for rest before she climbs. So a body that
 * stays within this much of one pose (units, radians) for CALM_SECONDS is put
 * to sleep too. A real topple leaves the window well inside that time.
 */
const CALM_DRIFT = 0.04
const CALM_SECONDS = 0.8

/** Collision groups: every piece is SOLID, a loose one is LOOSE too, and the doll meets only LOOSE pieces. */
const SOLID = 1
const DOLL = 2
const LOOSE = 4
/** A piece this fast (as `speedOf` counts it) is loose; a loaded tower's jiggle stays well under it. */
const LOOSE_SPEED = 0.8
/** A piece that touched the doll stays loose this long, so one that comes to rest against her never sinks into her. */
const TOUCH_SECONDS = 0.3
/** Further than this in a frame and the doll is put there instead of swept there. */
const DOLL_JUMP = 0.5
/**
 * Room round her head a loose piece meets: a block falling onto her moves up
 * to its speed times a step before the contact holds it, so it stops here, a
 * hair out from her paint, rather than dipping into her head. The body keeps
 * its own width, so walking close past the build never jostles it.
 */
const HEAD_SKIN = 0.04
/** The doll's outline in her own frame (feet at the origin): the body as wide as its hem up to the neck, and the head and hair inside an octagon. */
const HEAD_OCTAGON = (HEAD_R + HAIR + HEAD_SKIN) / Math.cos(Math.PI / 8)
export const DOLL_PARTS: readonly (readonly Vec2[])[] = [
  [
    { x: -BODY_R, y: 0.03 },
    { x: BODY_R, y: 0.03 },
    { x: BODY_R, y: NECK_Y },
    { x: -BODY_R, y: NECK_Y },
  ],
  Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    return { x: Math.cos(a) * HEAD_OCTAGON, y: HEAD_Y + Math.sin(a) * HEAD_OCTAGON }
  }),
]
const DOLL_DEPTH = 0.8

export type StepReport = {
  /** How many knocks this frame were hard enough to hear; ids and speeds are in `impactIds` and `impactSpeeds`. */
  impacts: number
  impactIds: Int16Array
  impactSpeeds: Float32Array
  /** How many of this frame's fixed steps had a knock over HARD_KNOCK, so a slow frame counts a clatter like fast ones do. */
  hardKnocks: number
  /** Anything loose still moving. */
  moving: boolean
  /** True on the one step the world came to rest. */
  settledNow: boolean
  /** A piece that left the room (only possible through a numeric glitch); the controller sends it home. */
  lost: number
  /** A loose piece that came into the doll at a hard knock this frame, or -1. */
  dollHit: number
}

/**
 * A convex part as a prism. Every body lives on the z = 0 plane, so two
 * prisms always overlap in z and only the in-plane side normals can separate
 * them: the hull tests just those, and skips cannon's edge-pair axes, which
 * for prisms only repeat the side normals or give z.
 */
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
  const axes: CANNON.Vec3[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push([i, i + n, j + n, j])
    const dx = parts[j].x - parts[i].x
    const dy = parts[j].y - parts[i].y
    const length = Math.hypot(dx, dy)
    const axis = new CANNON.Vec3(dy / length, -dx / length, 0)
    if (!axes.some((a) => Math.abs(a.x * axis.y - a.y * axis.x) < 1e-6)) axes.push(axis)
  }
  const hull = new CANNON.ConvexPolyhedron({ vertices, faces, axes })
  hull.uniqueEdges.length = 0
  return hull
}

type Hull = { hull: CANNON.ConvexPolyhedron; offset: CANNON.Vec3 }

/**
 * The shared hulls of each piece kind, built once. Each convex part is
 * extruded around its own centre and attached at an offset: cannon checks
 * face normals against the hull's origin, and an arch's or half-moon's centre
 * of mass lies outside most of its segments.
 */
const hulls = new Map<PieceShape, Hull[]>()
function hullOf(shape: PieceShape): Hull[] {
  let parts = hulls.get(shape)
  if (!parts) {
    parts = hullsOf(shape.parts, shape.depth)
    hulls.set(shape, parts)
  }
  return parts
}

function hullsOf(parts: readonly (readonly Vec2[])[], depth: number): Hull[] {
  return parts.map((part) => {
    const cx = part.reduce((sum, p) => sum + p.x, 0) / part.length
    const cy = part.reduce((sum, p) => sum + p.y, 0) / part.length
    return { hull: extrude(part.map((p) => ({ x: p.x - cx, y: p.y - cy })), depth), offset: new CANNON.Vec3(cx, cy, 0) }
  })
}

export function angleOf(body: CANNON.Body): number {
  return 2 * Math.atan2(body.quaternion.z, body.quaternion.w)
}

type Held = { x: number; y: number; angle: number }

export class PlayPhysics {
  readonly world: CANNON.World
  private readonly bodies: (CANNON.Body | null)[] = PIECES.map(() => null)
  /** Each body's reference pose and how long it has stayed near it. */
  private readonly calm = PIECES.map(() => ({ x: 0, y: 0, angle: 0, seconds: 0 }))
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
    hardKnocks: 0,
    moving: false,
    settledNow: false,
    lost: -1,
    dollHit: -1,
  }
  /** The other piece in each knock this frame, or -1 for the rug, floor or a wall. */
  private readonly heardWith = new Int16Array(MAX_IMPACTS)
  /** The first knock of the fixed step being run: knocks only merge within one step. */
  private stepFirst = 0
  private readonly doll: CANNON.Body
  private readonly dollAt = { x: 0, y: 0, solid: false, from: -1, to: -1 }
  /** Seconds each piece stays loose after touching the doll. */
  private readonly touched = new Float32Array(PIECES.length)
  /** Each piece's speed going into the fixed step, before any bounce off the doll. */
  private readonly approach = new Float32Array(PIECES.length)

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

    const doll = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: this.woodMaterial, allowSleep: false })
    for (const { hull, offset } of hullsOf(DOLL_PARTS, DOLL_DEPTH)) doll.addShape(hull, offset)
    doll.collisionFilterGroup = DOLL
    doll.collisionFilterMask = 0
    this.world.addBody(doll)
    this.doll = doll
  }

  /** Every piece touching the doll after a step stays loose a while longer; one that came in at a hard knock is reported as having knocked her over. */
  private noticeDollContacts(): void {
    const contacts = this.world.contacts
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const other = c.bi === this.doll ? c.bj : c.bj === this.doll ? c.bi : null
      if (!other) continue
      const id = this.bodies.indexOf(other)
      if (id < 0) continue
      this.touched[id] = TOUCH_SECONDS
      if (this.approach[id] > HARD_KNOCK) this.report.dollHit = id
    }
  }

  /**
   * Where the doll stands (feet), whether she is in the build plane at all
   * (not up with the kite or out in front), and the pieces under her feet:
   * the one she stands on or steps from, and the one she steps onto. Those
   * carry her, even tilted or jiggling under her weight, so they never
   * count as knocking into her.
   */
  setDoll(x: number, y: number, solid: boolean, from: number | null = null, to: number | null = null): void {
    const at = this.dollAt
    const doll = this.doll
    if (solid && (!at.solid || Math.hypot(x - doll.position.x, y - doll.position.y) > DOLL_JUMP)) {
      doll.position.set(x, y, 0)
      doll.velocity.setZero()
    }
    at.x = x
    at.y = y
    at.solid = solid
    at.from = from ?? -1
    at.to = to ?? -1
    doll.collisionFilterMask = solid ? LOOSE : 0
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
      sleepSpeedLimit: SLEEP_SPEED,
      sleepTimeLimit: 0.35,
    })
    for (const { hull, offset } of hullOf(shape)) body.addShape(hull, offset)
    body.position.set(pose.x, pose.y, 0)
    body.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Z, pose.angle)
    body.addEventListener('collide', (event: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
      if (this.held.has(id)) return
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())
      if (speed >= IMPACT_SPEED) this.hear(id, this.bodies.indexOf(event.body), speed)
    })
    this.world.addBody(body)
    this.bodies[id] = body
    this.touched[id] = 0
    this.wakeAll()
    return body
  }

  /**
   * Cannon raises a collide event for every contact point of a new touch, on
   * both bodies, so one block landing flat arrives as two to four events and
   * a plank landing across two cubes as more. Everything touching in one
   * step is heard as one knock at its hardest, in the voice of the piece
   * that was moving (events come before the solver, so that one is faster).
   */
  private hear(id: number, other: number, speed: number): void {
    const report = this.report
    const touches = (piece: number) => piece >= 0 && (piece === id || piece === other)
    const voice = other >= 0 && this.speedOf(other) > this.speedOf(id) ? other : id
    for (let i = this.stepFirst; i < report.impacts; i++) {
      if (!touches(report.impactIds[i]) && !touches(this.heardWith[i])) continue
      if (speed > report.impactSpeeds[i]) report.impactSpeeds[i] = speed
      if (this.speedOf(voice) > this.speedOf(report.impactIds[i])) report.impactIds[i] = voice
      if (this.heardWith[i] < 0) this.heardWith[i] = voice === id ? other : id
      return
    }
    if (report.impacts >= MAX_IMPACTS) return
    report.impactIds[report.impacts] = voice
    report.impactSpeeds[report.impacts] = speed
    this.heardWith[report.impacts] = voice === id ? other : id
    report.impacts += 1
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
    for (const calm of this.calm) calm.seconds = 0
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
    report.hardKnocks = 0
    report.settledNow = false
    report.lost = -1
    report.dollHit = -1
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * this.maxSubsteps)
    const doll = this.doll
    while (this.accumulator >= STEP) {
      for (const [id, target] of this.held) {
        const body = this.bodies[id]!
        body.velocity.set((target.x - body.position.x) / STEP, (target.y - body.position.y) / STEP, 0)
        let turn = target.angle - angleOf(body)
        turn = Math.atan2(Math.sin(turn), Math.cos(turn))
        body.angularVelocity.set(0, 0, turn / STEP)
      }
      const at = this.dollAt
      doll.velocity.set((at.x - doll.position.x) / STEP, (at.y - doll.position.y) / STEP, 0)
      for (let id = 0; id < this.bodies.length; id++) {
        const body = this.bodies[id]
        if (!body || this.held.has(id)) continue
        if (this.touched[id] > 0) this.touched[id] -= STEP
        const speed = this.speedOf(id)
        this.approach[id] = speed
        const loose = id !== at.from && id !== at.to && (this.touched[id] > 0 || speed > LOOSE_SPEED)
        body.collisionFilterGroup = loose ? SOLID | LOOSE : SOLID
      }
      const load = this.loadId === null ? null : this.bodies[this.loadId]
      if (load && load.type === CANNON.Body.DYNAMIC && load.sleepState !== CANNON.Body.SLEEPING) {
        this.loadPoint.vsub(load.position, this.scratch)
        this.scratch.z = 0
        load.applyForce(this.loadForce, this.scratch)
      }
      this.stepFirst = report.impacts
      this.world.step(STEP)
      this.accumulator -= STEP
      if (this.dollAt.solid) this.noticeDollContacts()
      for (let i = this.stepFirst; i < report.impacts; i++) {
        if (report.impactSpeeds[i] <= HARD_KNOCK) continue
        report.hardKnocks += 1
        break
      }
    }
    this.stepFirst = 0
    for (const [id, target] of this.held) {
      const body = this.bodies[id]!
      body.position.set(target.x, target.y, 0)
      body.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Z, target.angle)
      body.velocity.setZero()
      body.angularVelocity.setZero()
    }
    doll.position.set(this.dollAt.x, this.dollAt.y, 0)
    doll.velocity.setZero()
    let moving = false
    for (let id = 0; id < this.bodies.length; id++) {
      const body = this.bodies[id]
      if (!body || this.held.has(id)) continue
      if (body.position.y < LOST_Y || body.position.x < PLAY_MIN_X - 2 || body.position.x > PLAY_MAX_X + 2) report.lost = id
      if (body.sleepState === CANNON.Body.SLEEPING) continue
      const calm = this.calm[id]
      const angle = angleOf(body)
      if (Math.abs(body.position.x - calm.x) < CALM_DRIFT && Math.abs(body.position.y - calm.y) < CALM_DRIFT && Math.abs(angle - calm.angle) < CALM_DRIFT) {
        calm.seconds += elapsed
        if (calm.seconds >= CALM_SECONDS) {
          calm.seconds = 0
          body.sleep()
          continue
        }
      } else {
        calm.x = body.position.x
        calm.y = body.position.y
        calm.angle = angle
        calm.seconds = 0
      }
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
