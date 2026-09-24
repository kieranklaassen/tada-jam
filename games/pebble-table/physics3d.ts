import * as CANNON from 'cannon-es'
import { JAR_SCALE, JARS, type PartKind } from './parts'
import { BAG, DOOR, FEEDING, HOUSE_FOOTPRINT, HOUSE_REACH, RADIUS_BY_QUARTERS, SCALE, SHELF, TABLE, WORLD, type Circle, type MatKey, type Point, type Quarters } from './layout'
import { JAR_LIFT, JAR_MOUTH, JAR_REACH, JAR_TOP, jarLabelBox, NEST_SPAN, partCollider, partRest } from './partShape'
import { outlineCorners, STONE_CUTS, stoneOutline, stoneRest } from './stoneShape'
import { BOWL_FLOOR, BOWL_OUTSIDE, BOWL_WALL, BOWL_WALL_THICKNESS, DISH_PROFILE, HEM_LINE, HEM_POINTS, ON_RUG, PAN_DEPTH, PAN_FLOOR, PAN_RIM, panOutline, PLATE_TOP, radiusAt, RUG, RUG_HEM_REACH, RUG_HEM_TOP, type Surfaces } from './surfaces'

// Real stone physics (cannon-es) under the same world coordinates the game
// rules use. One 3D unit is one centimetre and ten world units; the table
// top is y = 0 and the world's centre is the origin. Stones are low
// prisms around their drawn outline (stoneShape.ts) so they lie flat,
// stack, and touch where they are drawn; the rug, plates, bowl, and pans
// are solid at the heights they are drawn (surfaces.ts), and walls make the
// bowl and pans hold what falls into them; anything that leaves the table
// top falls and is reported so it can go home to the bag.

export const UNIT = 0.1
export const GRAVITY = -981
export const STEP = 1 / 120
export const HOLD_HEIGHT = 11
export const PAN_REST_HEIGHT = 6
/** Catch-up substeps per frame by default. More would let one slow frame make the next one slower (a spiral), so an overloaded frame slows time slightly instead. */
export const DEFAULT_MAX_SUBSTEPS = 3
// Convex-convex collision cost grows with faces times edges, and a spill is
// almost all stone-on-stone contacts, so colliders use few sides. The drawn
// pebbles are separate meshes and stay round.
const STONE_SIDES = 8
const FIXTURE_SIDES = 10
const RUG_SIDES = 16
/** The hem is split into this many static bodies, so a stone only meets the stretch of it beside it. */
const HEM_ARCS = 16
const BOWL_SEGMENTS = 14
const FALL_LIMIT = -12
/** How tall the little house stands, for what is carried over it (cm). */
const HOUSE_TOP = 34
/** How deep the table and what lies on it are solid: a thin collider lets a fast stone sink past its middle and be pushed out underneath. */
const SLAB = 4
/** A sweeping finger's collider reaches this high above the table, and as deep into it. */
const BROOM_TOP = 3
/** A loose part slower than this (units/s, spin included) for `LOOSE_CALM_SECONDS` is put to sleep: parts in a pile can nudge each other just above cannon's own sleep limit for a long time. */
const LOOSE_CALM_SPEED = 4
const LOOSE_CALM_SECONDS = 1
/** A part still stirring this long (s) since it last slept a whole `LOOSE_CALM_SECONDS` is only jittering against its neighbours, so it counts as calm below `LOOSE_RESTLESS_SPEED`. */
const LOOSE_RESTLESS_SECONDS = 6
const LOOSE_RESTLESS_SPEED = 3 * LOOSE_CALM_SPEED
/** A loose part's sleep speed: cannon wakes a sleeping body when a neighbour moves faster than √2 times the neighbour's own, so only a part faster than `LOOSE_CALM_SPEED` wakes the pile it rests in. */
const PART_SLEEP_SPEED = LOOSE_CALM_SPEED / Math.SQRT2
const PART_BODY: Record<PartKind, { mass: number; damping: number }> = {
  acorn: { mass: 2, damping: 0.4 },
  shell: { mass: 1, damping: 0.5 },
  stick: { mass: 4, damping: 0.45 },
  boulder: { mass: 12, damping: 0.65 },
}
/** The jars with lids; the boulder's nest is open. */
const LIDDED_JARS = ['acorn', 'shell', 'stick'] as const

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

export type Collider = { shape: CANNON.ConvexPolyhedron; offset: CANNON.Vec3 }

/**
 * An upright prism around an outline (corners counterclockwise from +x toward
 * +z, seen from above), from `bottom` to `top`: the same vertices, faces, and
 * cost as a cannon cylinder of that many sides, but sized to what is drawn.
 * The hull is built around its own middle and placed at `offset`, because
 * cannon points a contact's normal from one shape's origin to the other's:
 * a hull hanging below its origin pushes whatever sinks past that origin
 * down through it instead of back out.
 */
export function prism(corners: readonly { x: number; z: number }[], bottom: number, top: number): Collider {
  const n = corners.length
  const half = (top - bottom) / 2
  const vertices = corners.flatMap(({ x, z }) => [new CANNON.Vec3(x, -half, z), new CANNON.Vec3(x, half, z)])
  const faces: number[][] = []
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n
    faces.push([2 * k, 2 * k + 1, 2 * next + 1, 2 * next])
  }
  faces.push(corners.map((_, k) => 2 * k))
  faces.push(corners.map((_, k) => 2 * (n - 1 - k) + 1))
  return { shape: new CANNON.ConvexPolyhedron({ vertices, faces }), offset: new CANNON.Vec3(0, bottom + half, 0) }
}

export function stoneCollider(q: Quarters): Collider {
  const outline = stoneOutline(STONE_CUTS[q])
  return prism(outlineCorners(outline.reach), outline.bottom, outline.top)
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
  /** The round fixtures something held must ride over, and how tall they stand. */
  private readonly tops = new Map<string, { circle: Circle; height: number }>()
  private readonly openJars = new Set<PartKind>()
  private readonly pans: CANNON.Body[] = []
  private readonly brooms = new Map<number, CANNON.Body>()
  private panDrops: [number, number] = [0, 0]
  private panSway = 0
  private readonly targets = new Map<CANNON.Body, Vec3>()
  /** Loose parts, with how long each has been calm, awake and asleep. */
  private readonly calm = new Map<CANNON.Body, { calm: number; awake: number; asleep: number }>()
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
  }

  private addTable(): void {
    const center = to3({ x: TABLE.x + TABLE.w / 2, y: TABLE.y + TABLE.h / 2 })
    const table = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    table.addShape(new CANNON.Box(new CANNON.Vec3((TABLE.w * UNIT) / 2, SLAB / 2, (TABLE.h * UNIT) / 2)))
    table.position.set(center.x, -SLAB / 2, center.z)
    this.world.addBody(table)
    const shelfLeft = TABLE.x + TABLE.w
    const shelfRight = SHELF.x + SHELF.w
    const shelf = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    shelf.addShape(new CANNON.Box(new CANNON.Vec3(((shelfRight - shelfLeft) * UNIT) / 2, 2, (TABLE.h * UNIT) / 2)))
    const shelfCenter = to3({ x: (shelfLeft + shelfRight) / 2, y: TABLE.y + TABLE.h / 2 })
    shelf.position.set(shelfCenter.x, -2, shelfCenter.z)
    this.world.addBody(shelf)
  }

  /**
   * A wall of boxes around the y axis whose inner face runs along `line`
   * ((radius, height) points up the wall) and whose inner corners touch it,
   * so nothing resting against the wall reaches into what is drawn there.
   * Where the line turns back down the outside, the boxes' faces look away
   * from the axis and lie as far inside what is drawn at their middles as
   * they stand off it at their corners.
   */
  private wall(body: CANNON.Body, line: readonly (readonly [number, number])[], thickness: number, baseY = 0): void {
    const inset = Math.cos(Math.PI / BOWL_SEGMENTS)
    for (let band = 0; band + 1 < line.length; band++) {
      const [r0, h0] = line[band]
      const [r1, h1] = line[band + 1]
      const length = Math.hypot(r1 - r0, h1 - h0)
      const along = { r: (r1 - r0) / length, h: (h1 - h0) / length }
      const out = { r: along.h, h: -along.r }
      const ring = out.r < 0 ? (2 * inset) / (1 + inset) : inset
      const centre = { r: ((r0 + r1) / 2) * ring + (out.r * thickness) / 2, h: baseY + (h0 + h1) / 2 + (out.h * thickness) / 2 }
      const half = new CANNON.Vec3(thickness / 2, length / 2, Math.tan(Math.PI / BOWL_SEGMENTS) * (Math.max(r0, r1) + thickness))
      const tilt = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.atan2(-along.r, along.h))
      for (let i = 0; i < BOWL_SEGMENTS; i++) {
        const angle = (i / BOWL_SEGMENTS) * Math.PI * 2
        const turn = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle)
        body.addShape(new CANNON.Box(half), new CANNON.Vec3(Math.cos(angle) * centre.r, centre.h, Math.sin(angle) * centre.r), turn.mult(tilt))
      }
    }
  }

  /** A flat disc from `bottom` to `top` (relative to its body) whose corners reach `radius`, so it never sticks out past what is drawn. */
  private disc(body: CANNON.Body, radius: number, bottom: number, top: number): void {
    body.addShape(new CANNON.Cylinder(radius, radius, top - bottom, FIXTURE_SIDES + 2), new CANNON.Vec3(0, (top + bottom) / 2, 0))
  }

  /**
   * The bowl's flared outside overhangs the rug. Up to a lying stone's
   * thickness a ring outside its inner wall is solid out to where the flare
   * reaches at that height, so a stone pushed against the bowl meets an
   * upright face instead of being wedged under the overhang into the rug.
   */
  private addBowl(): void {
    const bowl = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(FEEDING.bowl)
    bowl.position.set(at.x, ON_RUG, at.z)
    const stone = stoneOutline('whole')
    const skirt = stone.top - stone.bottom
    const inside = radiusAt(BOWL_WALL, skirt)
    this.wall(bowl, [[inside, -SLAB], [inside, skirt]], radiusAt(BOWL_OUTSIDE, skirt) - inside)
    this.disc(bowl, BOWL_WALL[0][0], -SLAB, BOWL_FLOOR - ON_RUG)
    this.wall(bowl, BOWL_WALL, BOWL_WALL_THICKNESS)
    this.world.addBody(bowl)
    this.fixtures.set('bowl', bowl)
  }

  private addRug(): void {
    const rug = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(RUG.center)
    rug.position.set(at.x, 0, at.z)
    const corners = Array.from({ length: RUG_SIDES }, (_, k) => {
      const a = (k / RUG_SIDES) * Math.PI * 2
      return { x: Math.cos(a) * RUG.rx * UNIT, z: Math.sin(a) * RUG.rz * UNIT }
    })
    const { shape, offset } = prism(corners, -SLAB, RUG.top)
    rug.addShape(shape, offset)
    this.world.addBody(rug)
    this.fixtures.set('rug', rug)
    this.addHem()
  }

  /** The hem's rope is solid as drawn: a box along each stretch of its line, as wide as its lumps reach and as tall as the highest. */
  private addHem(): void {
    const per = HEM_POINTS / HEM_ARCS
    for (let arc = 0; arc < HEM_ARCS; arc++) {
      const body = new CANNON.Body({ mass: 0, material: this.woodMaterial })
      for (let i = arc * per; i < (arc + 1) * per; i++) {
        const [a, b] = [to3(HEM_LINE[i], 0), to3(HEM_LINE[i + 1], 0)]
        const [dx, dz] = [b.x - a.x, b.z - a.z]
        const box = new CANNON.Box(new CANNON.Vec3(Math.hypot(dx, dz) / 2, (RUG_HEM_TOP + SLAB) / 2, RUG_HEM_REACH))
        const turn = new CANNON.Quaternion().setFromAxisAngle(CANNON.Vec3.UNIT_Y, -Math.atan2(dz, dx))
        body.addShape(box, new CANNON.Vec3((a.x + b.x) / 2, (RUG_HEM_TOP - SLAB) / 2, (a.z + b.z) / 2), turn)
      }
      this.world.addBody(body)
      this.fixtures.set(`hem-${arc}`, body)
    }
  }

  /** The scale's pans and post exist only while the scale is the live mat; the rug and bowl only with Fair Feeding. */
  setMat(mat: MatKey): void {
    for (const pan of this.pans) {
      this.world.removeBody(pan)
      this.targets.delete(pan)
    }
    this.pans.length = 0
    this.removeFixture('bowl')
    this.removeFixture('rug')
    for (let arc = 0; arc < HEM_ARCS; arc++) this.removeFixture(`hem-${arc}`)
    this.removeFixture('post')
    this.removeFixture('house')
    for (const kind of LIDDED_JARS) this.removeFixture(`jar-${kind}`)
    this.removeFixture('nest')
    if (mat === 'door') {
      this.addHouse()
      return
    }
    if (mat === 'feeding') {
      this.addRug()
      this.addBowl()
      return
    }
    for (const pan of SCALE.pans) {
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.woodMaterial })
      const at = to3(pan)
      body.position.set(at.x, PAN_REST_HEIGHT, at.z)
      const r = pan.r * UNIT
      this.disc(body, r * PAN_RIM, DISH_PROFILE[0][1] * PAN_DEPTH, PAN_FLOOR)
      this.wall(body, panOutline(r), 0.8)
      this.world.addBody(body)
      this.pans.push(body)
    }
    this.setFixture('post', { ...SCALE.post, r: 18 }, 30, true)
    for (const kind of LIDDED_JARS) this.addJar(kind)
    this.addNest()
    this.panDrops = [0, 0]
    this.panSway = 0
  }

  /**
   * A jar stands as wide as its pot and as tall as its lid, or only as tall
   * as its mouth once it is empty and its lid is off; its label stands out
   * of the pot's front as a box.
   */
  private addJar(kind: (typeof LIDDED_JARS)[number]): void {
    const key = `jar-${kind}`
    this.setFixture(key, { ...JARS[kind], r: (JAR_REACH * JAR_SCALE) / UNIT }, (this.openJars.has(kind) ? JAR_MOUTH : JAR_TOP) * JAR_SCALE)
    const body = this.fixtures.get(key)!
    const label = jarLabelBox(kind)
    const [x, y, z] = label.center
    const turn = new CANNON.Quaternion().setFromEuler(...label.rotation, 'XYZ')
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(...label.half.map((h) => h * JAR_SCALE))),
      new CANNON.Vec3(x * JAR_SCALE, (y + JAR_LIFT) * JAR_SCALE - body.position.y, z * JAR_SCALE),
      turn,
    )
  }

  /** An empty jar's lid comes off, so parts can pour out over its mouth; one with parts in it has its lid on. */
  setJarOpen(kind: PartKind, open: boolean): void {
    if (kind === 'boulder' || open === this.openJars.has(kind)) return
    if (open) this.openJars.add(kind)
    else this.openJars.delete(kind)
    if (this.fixtures.has(`jar-${kind}`)) this.addJar(kind)
  }

  /** The boulder's nest: a soft bed inside a ring of twigs, solid as drawn, so nothing rolls through it. */
  private addNest(): void {
    const nest = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(JARS.boulder)
    nest.position.set(at.x, 0, at.z)
    const [inner, outer] = [NEST_SPAN.inner * JAR_SCALE, NEST_SPAN.outer * JAR_SCALE]
    this.disc(nest, inner, -SLAB, NEST_SPAN.bed * JAR_SCALE)
    this.wall(nest, [[inner, 0], [inner, NEST_SPAN.top * JAR_SCALE]], outer - inner * Math.cos(Math.PI / BOWL_SEGMENTS))
    this.world.addBody(nest)
    this.fixtures.set('nest', nest)
  }

  /** A seated guest's plate is solid at its drawn top; an empty seat has no plate. */
  setPlates(seats: readonly boolean[]): void {
    FEEDING.seats.forEach((seat, index) => {
      const key = `plate-${index}`
      this.removeFixture(key)
      if (!seats[index]) return
      const body = new CANNON.Body({ mass: 0, material: this.woodMaterial })
      const at = to3(seat.plate)
      body.position.set(at.x, 0, at.z)
      this.disc(body, FEEDING.plateRadius * UNIT, -SLAB, PLATE_TOP)
      this.world.addBody(body)
      this.fixtures.set(key, body)
    })
  }

  /** What a piece lying on the live mat rests on, as `surfaceUnder` needs it. */
  surfaces(mat: MatKey, seats: readonly boolean[]): Surfaces {
    return { mat, seats, panFloors: [this.panFloor(0), this.panFloor(1)] }
  }

  /** Beam tilt drives the pans up and down, and its turning swings them sideways (`sway`, cm); stones in them ride along. `drops` are world units. */
  setPanDrops(drops: readonly [number, number], sway = 0): void {
    const moved = Math.abs(drops[0] - this.panDrops[0]) > 0.01 || Math.abs(drops[1] - this.panDrops[1]) > 0.01 || Math.abs(sway - this.panSway) > 0.01
    this.pans.forEach((pan, side) => {
      const at = to3(SCALE.pans[side])
      this.targets.set(pan, { x: at.x + sway, y: PAN_REST_HEIGHT - drops[side] * UNIT, z: at.z })
    })
    if (moved) for (const { body } of this.stones.values()) body.wakeUp()
    this.panDrops = [drops[0], drops[1]]
    this.panSway = sway
  }

  /** How far (cm) a pan has swung sideways from where it hangs at rest. */
  panSwung(side: 0 | 1): number {
    const pan = this.pans[side]
    return pan ? pan.position.x - to3(SCALE.pans[side]).x : 0
  }

  /** Where a pan hangs from its ropes (its drawn origin). */
  panY(side: 0 | 1): number {
    return this.pans[side]?.position.y ?? PAN_REST_HEIGHT
  }

  /** The top of a pan's floor, where pieces in it rest. */
  panFloor(side: 0 | 1): number {
    return this.panY(side) + PAN_FLOOR
  }

  /**
   * A round thing standing on the table: its collider's faces (not its corners)
   * lie on the circle, so nothing resting against it reaches into what is drawn
   * there. It reaches as deep into the table as it stands above it, so its
   * origin is below everything that rests beside it (see `prism`).
   * Something held rides over it (see `heldClearance`) unless something else
   * overhangs it, as the scale's beam does its post.
   */
  setFixture(key: string, circle: Circle, height = 12, overhung = false): void {
    this.removeFixture(key)
    const body = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(circle)
    const corner = (circle.r * UNIT) / Math.cos(Math.PI / FIXTURE_SIDES)
    body.position.set(at.x, 0, at.z)
    body.addShape(new CANNON.Cylinder(corner, corner, 2 * height, FIXTURE_SIDES))
    this.world.addBody(body)
    this.fixtures.set(key, body)
    if (!overhung) this.tops.set(key, { circle, height })
  }

  removeFixture(key: string): void {
    const body = this.fixtures.get(key)
    if (body) {
      this.world.removeBody(body)
      this.fixtures.delete(key)
    }
    this.tops.delete(key)
  }

  /** How high (cm) something held at `at`, reaching `reach` (cm) round, must ride to clear the round fixtures under it: the top of the tallest, or 0. */
  heldClearance(at: Point, reach: number): number {
    let top = 0
    for (const { circle, height } of this.tops.values()) if (Math.hypot(at.x - circle.x, at.y - circle.y) * UNIT < circle.r * UNIT + reach) top = Math.max(top, height)
    return top
  }

  /** The little house stands solid over its drawn walls and shut door (HOUSE_FOOTPRINT), as far into the table as above it. */
  private addHouse(): void {
    this.removeFixture('house')
    const body = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(DOOR.house)
    const s = DOOR.houseScale
    body.position.set(at.x, 0, at.z)
    for (const box of HOUSE_FOOTPRINT) {
      body.addShape(new CANNON.Box(new CANNON.Vec3(((box.right - box.left) * s) / 2, HOUSE_TOP, ((box.front - box.back) * s) / 2)), new CANNON.Vec3(((box.right + box.left) * s) / 2, 0, ((box.front + box.back) * s) / 2))
    }
    this.world.addBody(body)
    this.fixtures.set('house', body)
    this.tops.set('house', { circle: { ...DOOR.house, r: HOUSE_REACH }, height: HOUSE_TOP })
  }

  addBag(): void {
    this.setFixture('bag', { x: BAG.x, y: BAG.y + 10, r: 72 }, 14)
  }

  addStone(id: number, q: Quarters, at: Point, options: { y?: number; velocity?: Vec3; spin?: number } = {}): void {
    this.removeStone(id)
    const body = new CANNON.Body({
      mass: q,
      material: this.stoneMaterial,
      linearDamping: 0.35,
      angularDamping: 0.75,
      sleepSpeedLimit: 1.2,
      sleepTimeLimit: 0.4,
    })
    const { shape, offset } = stoneCollider(q)
    body.addShape(shape, offset)
    const p = to3(at, options.y ?? stoneRest(q))
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

  /** A loose part (acorn, shell, stick, boulder) with its own shape and weight; it moves, holds, and falls like a stone. */
  addPart(id: number, kind: PartKind, at: Point, options: { y?: number; velocity?: Vec3; spin?: number; yaw?: number } = {}): void {
    this.removeStone(id)
    const { mass, damping } = PART_BODY[kind]
    const body = new CANNON.Body({ mass, material: this.stoneMaterial, linearDamping: damping, angularDamping: 0.9, sleepSpeedLimit: PART_SLEEP_SPEED, sleepTimeLimit: 0.3 })
    const collider = partCollider(kind)
    if (collider.prism) {
      const { shape, offset } = prism(outlineCorners(collider.prism.reach), collider.prism.bottom, collider.prism.top)
      body.addShape(shape, offset)
    }
    for (const ball of collider.balls) body.addShape(new CANNON.Sphere(ball.r), new CANNON.Vec3(ball.x, ball.y, ball.z))
    const p = to3(at, options.y ?? partRest(kind))
    body.position.set(p.x, p.y, p.z)
    if (options.yaw) body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), options.yaw)
    if (options.velocity) body.velocity.set(options.velocity.x, options.velocity.y, options.velocity.z)
    if (options.spin) body.angularVelocity.set(0, options.spin, 0)
    body.addEventListener('collide', (event: { contact: CANNON.ContactEquation }) => {
      const speed = Math.abs(event.contact.getImpactVelocityAlongNormal())
      if (speed > 25) this.impacts.push(speed)
    })
    this.world.addBody(body)
    this.stones.set(id, { body, q: 4 })
    this.calm.set(body, { calm: 0, awake: 0, asleep: 0 })
  }

  removeStone(id: number): void {
    const entry = this.stones.get(id)
    if (!entry) return
    this.targets.delete(entry.body)
    this.calm.delete(entry.body)
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

  /**
   * A sweeping finger: a low kinematic cylinder dragged across the table top.
   * It reaches as deep into the table as above it, so its origin stays below
   * every stone it meets and a deep overlap lifts the stone over it instead
   * of pushing it down through the table (see `prism`).
   */
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
      body.addShape(new CANNON.Cylinder(4.2, 4.2, 2 * BROOM_TOP, STONE_SIDES))
      const start = to3(at)
      body.position.set(start.x, start.y, start.z)
      this.world.addBody(body)
      this.brooms.set(pointerId, body)
    }
    this.targets.set(body, to3(at))
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

  private settleLooseParts(): void {
    for (const [body, timer] of this.calm) {
      if (body.type !== CANNON.Body.DYNAMIC || body.sleepState === CANNON.Body.SLEEPING) {
        timer.asleep += STEP
        if (timer.asleep >= LOOSE_CALM_SECONDS) timer.awake = 0
        continue
      }
      timer.asleep = 0
      timer.awake += STEP
      const limit = timer.awake < LOOSE_RESTLESS_SECONDS ? LOOSE_CALM_SPEED : LOOSE_RESTLESS_SPEED
      const speedSquared = body.velocity.lengthSquared() + body.angularVelocity.lengthSquared()
      timer.calm = speedSquared < limit ** 2 ? timer.calm + STEP : 0
      if (timer.calm < LOOSE_CALM_SECONDS) continue
      timer.calm = 0
      body.sleep()
    }
  }

  step(elapsed: number): StepReport {
    this.accumulator = Math.min(this.accumulator + elapsed, STEP * this.maxSubsteps)
    // What follows a target gets there evenly over this frame's substeps, not in a jump at twice its speed and a stop.
    let substeps = Math.floor(this.accumulator / STEP)
    while (this.accumulator >= STEP) {
      const time = Math.max(1, substeps--) * STEP
      for (const [body, target] of this.targets) {
        body.velocity.set((target.x - body.position.x) / time, (target.y - body.position.y) / time, (target.z - body.position.z) / time)
      }
      this.world.step(STEP)
      this.resistRolling()
      this.settleLooseParts()
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
