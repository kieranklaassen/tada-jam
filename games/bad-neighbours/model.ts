import Matter from 'matter-js'

// The stacking simulation from Bad Neighbours, with the later "secured
// foundations" rules: settled buildings lock into static colliders so tall
// towers stay stable and cheap to simulate. Kid mode is the old Free build:
// a wide slab, slow deliveries, no lives, no score.

const { Engine, Bodies, Body, Composite, Events, Query, Constraint, Vector, Sleeping } = Matter
export const CELL = 32
export const FLOOR = 520
export const STEP = 1000 / 120
export const PLATFORM_WIDTH = 272
const MAX_LANDING_SPEED = 3
export const SECURE_DELAY = 2500
export const SECURE_STILL_TIME = 400
const STABILITY_DISTANCE = 0.45
const STABILITY_ANGLE = 0.006
export const MAX_DELIVERIES = 150
export type Shape = 'O' | 'T' | 'L' | 'J' | 'I' | 'S' | 'Z'
export const SHAPES: Record<Shape, number[][]> = {
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  L: [[0, 0], [0, 1], [1, 1], [2, 1]],
  J: [[2, 0], [0, 1], [1, 1], [2, 1]],
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
}
export const BUILDINGS: Record<Shape, { light: string; main: string; dark: string }> = {
  O: { light: '#e8c988', main: '#d6aa59', dark: '#987444' }, // corner café
  T: { light: '#e9e0c4', main: '#d2c6a4', dark: '#918c78' }, // laundromat
  L: { light: '#f2a07a', main: '#dd7754', dark: '#985844' }, // terracotta terrace
  J: { light: '#9cb7c7', main: '#6b92ad', dark: '#425e78' }, // bluebird apartments
  I: { light: '#eaa081', main: '#cb644e', dark: '#91483d' }, // red row
  S: { light: '#bdc59a', main: '#8c9f77', dark: '#607557' }, // olive & co.
  Z: { light: '#adbed0', main: '#879eaf', dark: '#526c82' }, // night owl
}
export function isShape(value: unknown): value is Shape {
  return typeof value === 'string' && value in SHAPES
}
export function seededRandom(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296 }
}
export function cellsFor(shape: Shape) {
  const cells = SHAPES[shape]
  const cx = cells.reduce((sum, p) => sum + p[0], 0) / 4
  const cy = cells.reduce((sum, p) => sum + p[1], 0) / 4
  return cells.map(([x, y]) => ({ x: (x - cx) * CELL, y: (y - cy) * CELL }))
}
export function outlineCenter(body: Matter.Body) {
  // Matter's position is the center of mass, which is off-center for L/J/T.
  // Use the unpadded outline for placement; body.bounds also includes velocity.
  const { min, max } = Matter.Bounds.create(body.vertices)
  return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 }
}
/** Deliveries fall at this speed times the pace; age sets the pace as a hint. */
export function paceForAge(age: number | null) {
  if (age === null) return 1
  if (age <= 4) return 0.8
  if (age >= 7) return 1.25
  return 1
}
export interface Piece { body: Matter.Body; shape: Shape; landed: boolean; scored: boolean; glued: boolean; contactTime: number; born: number; securedAt: number; stableSince: number; stablePose: { x: number; y: number; angle: number } | null }
export type GameEvent = { type: 'land' | 'impact' | 'rotate' | 'lost' | 'glue' | 'spawn' | 'secure'; piece?: Piece; level?: boolean }
/** A settled building as saved between sessions. */
export type SavedPiece = { shape: Shape; x: number; y: number; angle: number; secured: boolean }
/** A scaffold between two saved buildings, by index into the saved list; −1 is the slab. */
export type SavedBond = readonly [number, number]
export type GameOptions = { pace?: number; restore?: readonly SavedPiece[]; bonds?: readonly SavedBond[]; next?: readonly Shape[] }

function buildingBody(shape: Shape, label: string) {
  // The renderer fills these same square cells: no invisible rounded corners.
  const parts = cellsFor(shape).map(p => Bodies.rectangle(p.x, p.y, CELL, CELL, { friction: 0.7 }))
  const body = Body.create({ parts, friction: 0.75, frictionStatic: 1.1, restitution: 0.035, frictionAir: 0.012, sleepThreshold: 100, label })
  body.plugin.inertia = body.inertia
  return body
}
function clearSolverState(body: Matter.Body) {
  // Residual solver impulses can move even a newly static body on the next
  // step. Clear them without changing its pose or any vertex.
  const solver = body as Matter.Body & { positionImpulse: Matter.Vector; constraintImpulse: Matter.Vector & { angle: number } }
  solver.positionImpulse.x = solver.positionImpulse.y = 0
  solver.constraintImpulse.x = solver.constraintImpulse.y = solver.constraintImpulse.angle = 0
  body.force.x = body.force.y = body.torque = 0
}

export class Game {
  engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 })
  platform: Matter.Body
  pieces: Piece[] = []
  active: Piece | null = null
  next: Shape[] = []
  random: () => number
  bag: Shape[] = []
  pace: number
  time = 0
  placed = 0
  secured = 0
  spawned = 0
  maxHeight = 0
  height = 0
  hardDropping = false
  spawnAt = 0
  onEvent: (event: GameEvent) => void
  private accumulator = 0
  /** Scaffold pairs in the world; capped so a child can't pile up thousands of constraints. */
  bonds = 0
  private foundationTicks = 0
  constructor(seed: number, onEvent: (event: GameEvent) => void = () => {}, options: GameOptions = {}) {
    this.random = seededRandom(seed); this.onEvent = onEvent; this.pace = options.pace ?? 1
    this.engine.gravity.y = 1
    this.engine.gravity.scale = 0.0012
    this.platform = Bodies.rectangle(0, FLOOR + 19, PLATFORM_WIDTH, 38, { isStatic: true, friction: 0.85, label: 'construction-platform' })
    Composite.add(this.engine.world, this.platform)
    Events.on(this.engine, 'collisionStart', event => {
      if (!this.active) return
      for (const pair of event.pairs) {
        const a = pair.bodyA.parent, b = pair.bodyB.parent
        if (a === this.active?.body || b === this.active?.body) {
          const piece = this.active
          piece.landed = true; piece.contactTime = this.time
          // Keep fast travel responsive, but release the controlled building
          // with a gentler impact before Matter resolves the contact impulses.
          // getVelocity returns a normalized speed at our 120 Hz timestep.
          const velocity = Body.getVelocity(piece.body)
          if (velocity.y > MAX_LANDING_SPEED) Body.setVelocity(piece.body, { x: velocity.x, y: MAX_LANDING_SPEED })
          Body.setInertia(piece.body, piece.body.plugin.inertia)
          this.active = null; this.hardDropping = false; this.spawnAt = this.time + 650
          this.onEvent({ type: 'impact', piece })
          break
        }
      }
    })
    for (const saved of options.restore ?? []) this.restorePiece(saved)
    // Scaffolding comes back with the buildings it held, so a braced tower stays braced.
    const restored = this.pieces.map(p => p.body)
    for (const [i, j] of options.bonds ?? []) {
      const a = i === -1 ? this.platform : restored[i], b = j === -1 ? this.platform : restored[j]
      if (!a || !b || a === b || (a.isStatic && b.isStatic)) continue
      this.brace(a, b)
      this.bonds++
    }
    this.next = options.next?.length === 3 ? [...options.next] : [this.takeShape(), this.takeShape(), this.takeShape()]
    this.spawn()
  }
  get full() { return this.spawned >= MAX_DELIVERIES }
  takeShape(): Shape {
    if (!this.bag.length) {
      this.bag = Object.keys(SHAPES) as Shape[]
      for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]] }
      if (this.spawned === 0) { this.bag = this.bag.filter(x => x !== 'O'); this.bag.push('O') }
    }
    return this.bag.pop()!
  }
  private restorePiece(saved: SavedPiece) {
    const body = buildingBody(saved.shape, `building-${this.spawned}`)
    Body.setAngle(body, saved.angle); Body.setPosition(body, { x: saved.x, y: saved.y })
    const piece: Piece = { body, shape: saved.shape, landed: true, scored: true, glued: false, contactTime: 0, born: 0, securedAt: 0, stableSince: 0, stablePose: null }
    if (saved.secured) { Body.setStatic(body, true); Sleeping.set(body, true); clearSolverState(body); piece.securedAt = -1; this.secured++ }
    else Sleeping.set(body, true)
    Composite.add(this.engine.world, body); this.pieces.push(piece); this.spawned++; this.placed++
  }
  /**
   * The next three deliveries as they should be saved. A building the child is
   * still steering is not settled, so it goes back to the front of the queue and
   * comes down again after put-away instead of being lost.
   */
  queue(): Shape[] {
    return (this.active ? [this.active.shape, ...this.next] : this.next).slice(0, 3)
  }
  /** Scaffolds between settled buildings (and the slab), indexed like `snapshot()`. */
  bondPairs(): [number, number][] {
    const index = new Map<Matter.Body, number>([[this.platform, -1]])
    this.pieces.filter(p => p.scored).forEach((p, i) => index.set(p.body, i))
    const pairs = new Map<string, [number, number]>()
    for (const bond of Composite.allConstraints(this.engine.world)) {
      const i = bond.bodyA && index.get(bond.bodyA), j = bond.bodyB && index.get(bond.bodyB)
      if (i === undefined || j === undefined || i === null || j === null) continue
      const pair: [number, number] = i < j ? [i, j] : [j, i]
      pairs.set(pair.join(':'), pair)
    }
    return [...pairs.values()]
  }
  /** Settled buildings in a form that survives put-away. The falling one is left out. */
  snapshot(): SavedPiece[] {
    return this.pieces.filter(p => p.scored).map(p => ({
      shape: p.shape, x: Math.round(p.body.position.x * 100) / 100, y: Math.round(p.body.position.y * 100) / 100,
      angle: Math.round(p.body.angle * 10000) / 10000, secured: p.securedAt !== 0,
    }))
  }
  spawn() {
    if (this.full) return
    const shape = this.next.shift()!; this.next.push(this.takeShape())
    const highest = Math.min(FLOOR, ...this.pieces.filter(p => p.landed && p.body.position.y < FLOOR).map(p => p.body.bounds.min.y))
    const y = Math.min(FLOOR - 270, highest - 155)
    const body = buildingBody(shape, `building-${this.spawned}`)
    const center = outlineCenter(body)
    Body.translate(body, { x: -center.x, y: y - center.y }); Body.setInertia(body, Infinity)
    const piece: Piece = { body, shape, landed: false, scored: false, glued: false, contactTime: 0, born: this.time, securedAt: 0, stableSince: 0, stablePose: null }
    Composite.add(this.engine.world, body); this.pieces.push(piece); this.active = piece; this.spawned++
    this.onEvent({ type: 'spawn', piece })
  }
  move(direction: number) {
    if (!this.active || this.hardDropping) return
    const body = this.active.body
    const old = { ...body.position }
    const center = outlineCenter(body), step = CELL / 2
    const limit = Math.floor(180 / step) * step
    const target = Math.max(-limit, Math.min(limit, center.x + direction * step))
    Body.setPosition(body, { x: old.x + target - center.x, y: old.y })
    if (Query.collides(body, [this.platform, ...this.pieces.filter(p => p !== this.active).map(p => p.body)]).length) Body.setPosition(body, old)
    Body.setVelocity(body, { x: 0, y: body.velocity.y })
  }
  aim(x: number) {
    if (!this.active || this.hardDropping) return
    const steps = Math.round((x - outlineCenter(this.active.body).x) / (CELL / 2))
    for (let i = 0; i < Math.min(24, Math.abs(steps)); i++) this.move(Math.sign(steps))
  }
  rotate(direction = 1) {
    if (!this.active || this.hardDropping) return false
    const body = this.active.body, angle = body.angle, position = { ...body.position }
    const center = outlineCenter(body)
    Body.setAngle(body, angle + direction * Math.PI / 2)
    const offset = Vector.sub(center, outlineCenter(body))
    const others = [this.platform, ...this.pieces.filter(p => p !== this.active).map(p => p.body)]
    for (const dx of [0, -16, 16, -32, 32]) {
      Body.setPosition(body, { x: position.x + offset.x + dx, y: position.y + offset.y })
      if (!Query.collides(body, others).length) { this.onEvent({ type: 'rotate', piece: this.active }); return true }
    }
    Body.setAngle(body, angle); Body.setPosition(body, position); return false
  }
  drop() { if (this.active) { this.hardDropping = true; Body.setVelocity(this.active.body, { x: 0, y: 11 }) } }
  /** Scaffolding braces touching, still-moving buildings. There are no charges to spend. */
  glue() {
    if (this.bonds >= 100) return false
    const seen = new Set<string>(); let added = 0
    for (const pair of this.engine.pairs.list) {
      if (!pair.isActive) continue
      const a = pair.bodyA.parent, b = pair.bodyB.parent
      if (a === this.active?.body || b === this.active?.body) continue
      if (a.isStatic && b.isStatic) continue
      const key = [a.id, b.id].sort().join(':'); if (seen.has(key)) continue; seen.add(key)
      if (a.plugin.bonded?.includes(b.id)) continue
      this.brace(a, b)
      added++; if (added >= 10) break
    }
    if (!added) return false
    this.bonds += added; this.onEvent({ type: 'glue' }); return true
  }
  /** Two zero-length ties between a pair of bodies, pinned where they meet. */
  private brace(a: Matter.Body, b: Matter.Body) {
    const anchor = { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 }
    const resistance = a.inverseMass + b.inverseMass + a.inverseInertia + b.inverseInertia
    // The ties sit a cell either side: closer together they turn like a hinge, and the
    // weight above folds the pair into each other. Matter turns a tie's pull into spin by
    // its lever from each centre, so a tie far from a centre is softened until one pass
    // corrects no more than its stretch; stiffer, each pass overshoots the last until the
    // pair is flung through each other or the slab.
    for (const dx of [-CELL, CELL]) {
      const p = { x: anchor.x + dx, y: anchor.y }, pointA = Vector.sub(p, a.position), pointB = Vector.sub(p, b.position)
      const spin = Vector.magnitudeSquared(pointA) * a.inverseInertia + Vector.magnitudeSquared(pointB) * b.inverseInertia
      const stiffness = Math.min(0.75, resistance / (resistance + spin) / (STEP / (1000 / 60)))
      Composite.add(this.engine.world, Constraint.create({ bodyA: a, bodyB: b, pointA, pointB, length: 0, stiffness, damping: 0.12 }))
    }
    a.plugin.bonded = [...a.plugin.bonded || [], b.id]
    this.pieces.filter(p => p.body === a || p.body === b).forEach(p => p.glued = true)
  }
  /** Physics steps the last `advance` ran. */
  lastSteps = 0
  /**
   * Runs the fixed 120 Hz steps a display frame owes. At most `maxSteps` catch up in one frame: a slow frame
   * slows game time a little instead of asking the next frame for even more steps.
   */
  advance(delta: number, softDrop = false, maxSteps = 12) {
    this.accumulator += Math.min(100, Math.max(0, delta))
    // The epsilon keeps floating-point drift from losing a step that is owed exactly.
    const steps = Math.min(maxSteps, Math.floor(this.accumulator / STEP + 1e-6))
    for (let i = 0; i < steps; i++) this.tick(softDrop)
    this.accumulator = Math.min(STEP, Math.max(0, this.accumulator - steps * STEP))
    this.lastSteps = steps
  }
  private prepareLanding(body: Matter.Body, speed: number) {
    // Check the next physics step with the actual compound shape. Slowing only
    // in collisionStart is too late: fast travel has already penetrated the stack.
    const stepScale = STEP / (1000 / 60)
    const fall = speed * stepScale * (1 - body.frictionAir * stepScale)
      + this.engine.gravity.y * this.engine.gravity.scale * STEP * STEP
    const candidates: Matter.Body[] = []
    for (const other of this.engine.world.bodies) {
      if (other !== body && other.bounds.min.x <= body.bounds.max.x && other.bounds.max.x >= body.bounds.min.x
        && other.bounds.min.y <= body.bounds.max.y + fall && other.bounds.max.y >= body.bounds.min.y) candidates.push(other)
    }
    if (!candidates.length) return speed
    const position = { ...body.position }
    Body.setPosition(body, { x: position.x, y: position.y + fall })
    const contact = Query.collides(body, candidates).length > 0
    Body.setPosition(body, position)
    if (!contact) return speed
    // Wake the stack before detection so its floor/support contacts participate
    // in this solve, rather than being rediscovered a step after an impact.
    for (const piece of this.pieces) if (piece.landed && !piece.body.isStatic && piece.body.isSleeping) Sleeping.set(piece.body, false)
    return Math.min(speed, MAX_LANDING_SPEED)
  }
  private secureFoundations() {
    // Only unsettled bodies need contact checks. Static foundations keep their
    // exact colliders but no longer integrate gravity or transmit movement.
    const pending = this.pieces.filter(p => p.landed && !p.securedAt)
    if (!pending.length) return
    const supports = [this.platform, ...this.pieces.filter(p => p.landed).map(p => p.body)]
    const anchors = new Set(supports.filter(b => b.isStatic))
    const edges = new Map<Matter.Body, Set<Matter.Body>>()
    const connect = (a: Matter.Body, b: Matter.Body) => { if (!edges.has(a)) edges.set(a, new Set()); edges.get(a)!.add(b) }
    for (const piece of pending) {
      // Query the current geometry: sleeping pairs may be absent from Matter's
      // active pair list. A remembered collision alone is not proof of support.
      for (const collision of Query.collides(piece.body, supports.filter(other => other !== piece.body))) {
        const a = collision.bodyA.parent, b = collision.bodyB.parent
        if (a === b) continue
        const ny = collision.normal.y
        if (ny < -0.35) connect(a, b)
        if (ny > 0.35) connect(b, a)
      }
    }
    // Scaffolding can legitimately support a cantilever through its constraints.
    for (const bond of Composite.allConstraints(this.engine.world)) {
      if (bond.bodyA && bond.bodyB) { connect(bond.bodyA, bond.bodyB); connect(bond.bodyB, bond.bodyA) }
    }
    const grounded = (body: Matter.Body, seen = new Set<Matter.Body>()): boolean => {
      if (anchors.has(body)) return true
      if (seen.has(body)) return false
      seen.add(body)
      return [...edges.get(body) || []].some(other => grounded(other, seen))
    }
    let locked = false
    for (const piece of pending) {
      const body = piece.body, pose = piece.stablePose
      const still = piece.scored && body.speed < 0.08 && body.angularSpeed < 0.0015 && grounded(body)
      if (!still) { piece.stableSince = 0; piece.stablePose = null; continue }
      if (!pose || Math.hypot(body.position.x - pose.x, body.position.y - pose.y) > STABILITY_DISTANCE || Math.abs(body.angle - pose.angle) > STABILITY_ANGLE) {
        piece.stableSince = this.time
        piece.stablePose = { ...body.position, angle: body.angle }
        continue
      }
      if (this.time - piece.contactTime + 1e-7 < SECURE_DELAY || this.time - piece.stableSince + 1e-7 < SECURE_STILL_TIME) continue
      Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0)
      Body.setStatic(body, true); Sleeping.set(body, true); clearSolverState(body)
      piece.securedAt = this.time; this.secured++; anchors.add(body); locked = true
      this.onEvent({ type: 'secure', piece })
    }
    if (locked) {
      let removed = 0
      for (const bond of Composite.allConstraints(this.engine.world)) if (bond.bodyA?.isStatic && bond.bodyB?.isStatic) { Composite.remove(this.engine.world, bond); removed++ }
      this.bonds = Math.max(0, this.bonds - removed / 2)
    }
  }
  private tick(softDrop: boolean) {
    this.time += STEP
    if (this.active) {
      const body = this.active.body
      const speed = this.hardDropping ? 11 : softDrop ? 6 : 0.85 * this.pace
      Body.setVelocity(body, { x: 0, y: this.prepareLanding(body, speed) }); Body.setAngularVelocity(body, 0)
    }
    Engine.update(this.engine, STEP)
    for (const piece of [...this.pieces]) {
      const body = piece.body
      if (body.position.y > FLOOR + 190 || Math.abs(body.position.x) > 450) {
        // Its scaffolds go with it, and give their share of the budget back.
        let removed = 0
        for (const bond of Composite.allConstraints(this.engine.world)) if (bond.bodyA === body || bond.bodyB === body) { Composite.remove(this.engine.world, bond); removed++ }
        this.bonds = Math.max(0, this.bonds - removed / 2)
        Composite.remove(this.engine.world, body); this.pieces.splice(this.pieces.indexOf(piece), 1)
        if (this.active === piece) { this.active = null; this.hardDropping = false; this.spawnAt = this.time + 500 }
        if (piece.scored) this.placed--
        // A lost building is simply returned to the delivery queue: nothing is used up.
        this.spawned = Math.max(0, this.spawned - 1)
        this.onEvent({ type: 'lost', piece })
      } else if (piece.landed && !piece.scored && this.time - piece.contactTime > 450 && body.speed < 1.3 && body.position.y < FLOOR) {
        piece.scored = true; this.placed++
        const level = Math.abs(Math.sin(body.angle * 2)) < 0.09 && body.speed < 0.45
        this.onEvent({ type: 'land', piece, level })
      }
    }
    const top = Math.min(FLOOR, ...this.pieces.filter(p => p.scored && p.body.speed < 1.3).map(p => p.body.bounds.min.y))
    this.height = Math.max(0, (FLOOR - top) / CELL)
    this.maxHeight = Math.max(this.maxHeight, this.height)
    // A fixed 30 Hz contact audit is independent of rendering and viewport size.
    if (++this.foundationTicks % 4 === 0) this.secureFoundations()
    if (!this.active && this.time >= this.spawnAt) this.spawn()
  }
  dispose() { Events.off(this.engine, 'collisionStart'); Composite.clear(this.engine.world, false); Engine.clear(this.engine) }
}
