import * as CANNON from 'cannon-es'
import { GUEST_ARM, GUEST_RADIUS, GUEST_REACH, guestYaw } from './feeding'
import { JAR_SCALE, JARS, PART_KINDS, type PartKind } from './parts'
import { BAG, DOOR, FEEDING, HOUSE_FOOTPRINT, HOUSE_REACH, RADIUS_BY_QUARTERS, SCALE, SHELF, TABLE, WORLD, type Circle, type MatKey, type Point, type Quarters } from './layout'
import { JAR_LIFT, JAR_MOUTH, JAR_REACH, JAR_TOP, jarLabelBox, NEST_SPAN, partCollider, partRest } from './partShape'
import { outlineCorners, STONE_CUTS, stoneOutline, stoneReachAlong, stoneRest } from './stoneShape'
import { BOWL_FLOOR, BOWL_OUTSIDE, BOWL_WALL, BOWL_WALL_THICKNESS, DISH_PROFILE, feedingFloor, HEM_LINE, HEM_POINTS, ON_RUG, PAN_DEPTH, PAN_FLOOR, PAN_RIM, panOutline, panRimReach, PLATE_TOP, radiusAt, RUG, RUG_HEM_REACH, RUG_HEM_TOP, type Surfaces } from './surfaces'

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
/**
 * The most time (s) one frame catches up, in whole steps: two display frames
 * at 60 Hz and a leftover step never reach it, so an on-time frame never
 * loses a step, whatever the quality tier. Only a genuinely long frame (a
 * stall, or a device far behind) is cut short here, which slows game time
 * instead of letting a slow frame make the next one slower (a spiral).
 */
export const LONGEST_FRAME = 1 / 20
/**
 * A frame longer than this (s) is a device falling behind, not a dropped frame:
 * longer than two 60 Hz frames and a leftover step, and than the 33 ms frames
 * the intersection audit steps its clock by. Such a frame catches up only
 * SLOW_FRAME_STEPS whole steps and runs at most SLOW_FRAME_WORK world steps,
 * and the rest of its time is let go. Catching up in full made each slow
 * frame slower than the last (a pour at 6x CPU never climbed back), and on
 * time frames and the audit's never reach this, so their game time is whole.
 */
export const SLOW_FRAME = 5 * STEP
const SLOW_FRAME_STEPS = 2
const SLOW_FRAME_WORK = 4
/** Against rounding in sums of frame times: this close to a whole step (in steps) still makes it. */
export const STEP_SLACK = 1e-6
/**
 * A shell or stick (a chain of balls with no prism) about to meet a stone or
 * part moves at most this many of its biggest ball's radii in one step, the
 * step cut finer while it does: cannon pushes a ball back out of a stone only
 * while the ball's middle is outside it, so one landing at a centimetre a
 * step sank in and stayed.
 */
const BALL_TRAVEL = 1
/** And never more than this (cm) a step while about to meet a stone or part: a stick's twig balls are far thinner than its biggest. */
const BALL_MOST_TRAVEL = 0.18
/** The most pieces a step is cut into. */
const MOST_PIECES = 6
/**
 * Two stones (or shaped parts) closing on each other close at most this share
 * of the smaller one's radius in one piece of a step: cannon has no continuous
 * collision, so one meets the other only once it is already inside it, as deep
 * as it travelled in that piece.
 */
const STONE_TRAVEL = 0.15
/** The most pieces a step is cut into for stones meeting, which only a spill's first moments or a fast drop reach. */
const MOST_STONE_PIECES = 12
/**
 * The most world steps one frame runs, catch-up steps and landing pieces
 * together. A slow frame catches up several steps, and cutting each of them
 * into pieces for a pour multiplied that into dozens of world steps, which
 * made the next frame slow too. Pieces are shared out under this; a frame
 * always runs at least its whole steps.
 */
const MOST_FRAME_STEPS = 2
/** How many times sunk goes over the contacts it finds, so lifting a part out of one does not leave it in another. */
const SUNK_PASSES = 4
/** Pairs of bodies with at least this many pairs of shapes between them are handed to cannon with only the shapes that reach the other. */
const NEAR_SHAPES_FROM = 8
/** How far (cm) past the other body's bounds a shape still counts as reaching it, against rounding. */
const NEAR_SHAPES_SLACK = 0.001
// Convex-convex collision cost grows with faces times edges, and a spill is
// almost all stone-on-stone contacts, so colliders use few sides. The drawn
// pebbles are separate meshes and stay round.
const STONE_SIDES = 8
const FIXTURE_SIDES = 10
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

const TABLE_LOW = to3({ x: TABLE.x, y: TABLE.y })
const TABLE_HIGH = to3({ x: SHELF.x + SHELF.w, y: TABLE.y + TABLE.h })

/** Whether a body's middle lies over the table top or the shelf beside it. */
function overTable(body: CANNON.Body): boolean {
  const { x, z } = body.position
  return x >= TABLE_LOW.x && x <= TABLE_HIGH.x && z >= TABLE_LOW.z && z <= TABLE_HIGH.z
}

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
/** A body's shapes placed in the world, and the pose (position, then quaternion) they were placed at. */
type Placed = { pose: number[]; at: CANNON.Vec3[]; turn: CANNON.Quaternion[]; low: CANNON.Vec3[]; high: CANNON.Vec3[]; bounded: boolean[] }
/** A contact `sunk` found between two bodies: how deep one lies in the other, along the contact's normal. */
type SunkContact = { bi: CANNON.Body; bj: CANNON.Body; ni: CANNON.Vec3; depth: number }
/** The contacts `sunk` found between one pair of bodies, and where the two lay (position, then quaternion, of each). */
type SunkPair = { pose: number[]; found: SunkContact[] }
/** One of cannon's narrowphase tests for a pair of shape types, called as its `getContacts` calls it. */
type Resolver = (this: CANNON.Narrowphase, ...args: unknown[]) => boolean | void

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
  private readonly guests = new Set<CANNON.Body>()
  /** Each shell's or stick's biggest ball radius (cm). */
  private readonly balls = new Map<CANNON.Body, number>()
  private readonly closing: CANNON.Body[] = []
  private readonly placed = new WeakMap<CANNON.Body, Placed>()
  private readonly surfacing = { local: new CANNON.Vec3(), out: new CANNON.Vec3(), way: new CANNON.Vec3(), back: new CANNON.Quaternion() }
  /** What sunk found last while everything lay asleep, and where everything lay. */
  private lastSunk: { bodies: ReadonlySet<CANNON.Body>; poses: readonly number[]; out: Map<CANNON.Body, CANNON.Vec3> } | null = null
  /** What sunk found for each pair of bodies it tried last time, and where the two lay. */
  private sunkPairs = new Map<string, SunkPair>()
  /** When (world time) each stone last touched a seated guest. */
  private readonly touchedGuest = new Map<number, number>()
  /** The round fixtures something held must ride over, how tall they stand, and (a guest) how far out its head reaches, which what rides over it clears before coming down. */
  private readonly tops = new Map<string, { circle: Circle; height: number; over?: number }>()
  private readonly openJars = new Set<PartKind>()
  private readonly pans: CANNON.Body[] = []
  /** The rug's top, while Fair Feeding is the live mat: a plane that holds only what lies over the rug (see `addRug`). */
  private rug: CANNON.Body | null = null
  /** Each pan's floor: a plane body that moves with the pan, and how far out from its middle it holds things. */
  private readonly panFloors = new Map<CANNON.Body, number>()
  /** The table top and the shelf beside it: one plane that holds only what lies over them (see `addTable`). */
  private table: CANNON.Body | null = null
  private readonly brooms = new Map<number, CANNON.Body>()
  private panDrops: [number, number] = [0, 0]
  private panSway = 0
  private readonly targets = new Map<CANNON.Body, Vec3>()
  /** Loose parts, with how long each has been calm, awake and asleep. */
  private readonly calm = new Map<CANNON.Body, { calm: number; awake: number; asleep: number }>()
  private impacts: number[] = []
  private accumulator = 0

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
    this.world.allowSleep = true
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.onlyPairsThatMayTouch()
    this.onlyNearShapes()
    this.world.defaultContactMaterial.friction = 0.4
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.woodMaterial, { friction: 0.45, restitution: 0.12 }))
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.stoneMaterial, { friction: 0.35, restitution: 0.22 }))
    this.addTable()
    // Fitting a part's balls to its drawn shape is slow the first time for each kind: do it now, while the game loads, not on the frame a child first tips a jar.
    for (const kind of PART_KINDS) partCollider(kind)
  }

  /**
   * A body's shapes where cannon places them in the world (the same sums in
   * the same order), worked out again only once the body has moved: cannon
   * places every shape of the second body again for each shape of the first,
   * and a stick is 47 balls.
   */
  private place(body: CANNON.Body): Placed {
    const { position: p, quaternion: q } = body
    let placed = this.placed.get(body)
    if (placed) {
      const pose = placed.pose
      if (pose[0] === p.x && pose[1] === p.y && pose[2] === p.z && pose[3] === q.x && pose[4] === q.y && pose[5] === q.z && pose[6] === q.w) return placed
    } else {
      const vectors = () => body.shapes.map(() => new CANNON.Vec3())
      placed = { pose: [], at: vectors(), turn: body.shapes.map(() => new CANNON.Quaternion()), low: vectors(), high: vectors(), bounded: [] }
      this.placed.set(body, placed)
    }
    placed.bounded = body.shapes.map(() => false)
    for (let i = 0; i < body.shapes.length; i++) {
      q.mult(body.shapeOrientations[i], placed.turn[i])
      q.vmult(body.shapeOffsets[i], placed.at[i])
      placed.at[i].vadd(p, placed.at[i])
    }
    placed.pose = [p.x, p.y, p.z, q.x, q.y, q.z, q.w]
    return placed
  }

  /** Whether two placed shapes' world bounds meet, each worked out once at its body's pose: shapes whose bounds miss cannot touch. */
  private boundsMeet(a: CANNON.Body, placedA: Placed, i: number, b: CANNON.Body, placedB: Placed, j: number): boolean {
    for (const [body, placed, k] of [[a, placedA, i], [b, placedB, j]] as const) {
      if (placed.bounded[k]) continue
      body.shapes[k].calculateWorldAABB(placed.at[k], placed.turn[k], placed.low[k], placed.high[k])
      placed.bounded[k] = true
    }
    const [lowA, highA, lowB, highB] = [placedA.low[i], placedA.high[i], placedB.low[j], placedB.high[j]]
    const slack = NEAR_SHAPES_SLACK
    return lowA.x <= highB.x + slack && lowB.x <= highA.x + slack && lowA.y <= highB.y + slack && lowB.y <= highA.y + slack && lowA.z <= highB.z + slack && lowB.z <= highA.z + slack
  }

  /** A chain of balls' bounds from its placed balls: each ball's are its middle give or take its radius, as cannon's are. */
  private ballBounds(body: CANNON.Body): void {
    const { at } = this.place(body)
    const { lowerBound: low, upperBound: high } = body.aabb
    for (let i = 0; i < at.length; i++) {
      const { x, y, z } = at[i]
      const r = (body.shapes[i] as CANNON.Sphere).radius
      if (i === 0) {
        low.set(x - r, y - r, z - r)
        high.set(x + r, y + r, z + r)
        continue
      }
      low.set(Math.min(low.x, x - r), Math.min(low.y, y - r), Math.min(low.z, z - r))
      high.set(Math.max(high.x, x + r), Math.max(high.y, y + r), Math.max(high.z, z + r))
    }
    body.aabbNeedsUpdate = false
  }

  /**
   * cannon tries every shape of one body against every shape of the other
   * whenever their bounds meet: a stick of 47 balls lying on another is two
   * thousand tries a step, and a pour lands dozens of parts on each other at
   * once. A shape whose bounding sphere stays clear of the other body's bounds
   * can touch none of its shapes, so leaving it out changes no contact. Pairs
   * with many shapes are tried here as cannon tries them, in its order, but
   * with each body's shapes placed once (see `place`) and only those near,
   * and two shapes tried only if their bounds meet (see `boundsMeet`).
   */
  private onlyNearShapes(): void {
    const narrowphase = this.world.narrowphase
    const contacts = narrowphase.getContacts.bind(narrowphase)
    const resolvers = narrowphase as unknown as Record<number, Resolver | undefined>
    const one: [CANNON.Body[], CANNON.Body[]] = [[], []]
    const near: [number[], number[]] = [[], []]
    const [xi, xj, qi, qj] = [new CANNON.Vec3(), new CANNON.Vec3(), new CANNON.Quaternion(), new CANNON.Quaternion()]
    const keep = (body: CANNON.Body, at: readonly CANNON.Vec3[], other: CANNON.Body, into: number[]): boolean => {
      into.length = 0
      const { lowerBound: low, upperBound: high } = other.aabb
      for (let i = 0; i < body.shapes.length; i++) {
        const centre = at[i]
        const reach = body.shapes[i].boundingSphereRadius + NEAR_SHAPES_SLACK
        const dx = Math.max(low.x - centre.x, 0, centre.x - high.x)
        const dy = Math.max(low.y - centre.y, 0, centre.y - high.y)
        const dz = Math.max(low.z - centre.z, 0, centre.z - high.z)
        if (dx * dx + dy * dy + dz * dz <= reach * reach) into.push(i)
      }
      return into.length > 0
    }
    const { KINEMATIC, STATIC } = CANNON.Body
    const SPHERE = CANNON.Shape.types.SPHERE
    narrowphase.getContacts = (p1, p2, world, result, oldcontacts, frictionResult, frictionPool) => {
      for (let k = 0; k < p1.length; k++) {
        const [a, b] = [p1[k], p2[k]]
        if (a.shapes.length * b.shapes.length < NEAR_SHAPES_FROM) {
          one[0][0] = a
          one[1][0] = b
          contacts(one[0], one[1], world, result, oldcontacts, frictionResult, frictionPool)
          continue
        }
        if (a.aabbNeedsUpdate) a.updateAABB()
        if (b.aabbNeedsUpdate) b.updateAABB()
        const [placedA, placedB] = [this.place(a), this.place(b)]
        if (!keep(a, placedA.at, b, near[0]) || !keep(b, placedB.at, a, near[1])) continue
        narrowphase.contactPointPool = oldcontacts
        narrowphase.frictionEquationPool = frictionPool
        narrowphase.result = result
        narrowphase.frictionResult = frictionResult
        const material = (a.material && b.material && world.getContactMaterial(a.material, b.material)) || null
        const justTest = Boolean((a.type & KINEMATIC && b.type & STATIC) || (a.type & STATIC && b.type & KINEMATIC) || (a.type & KINEMATIC && b.type & KINEMATIC))
        for (const i of near[0]) {
          const si = a.shapes[i]
          for (const j of near[1]) {
            const sj = b.shapes[j]
            if (!(si.collisionFilterMask & sj.collisionFilterGroup && sj.collisionFilterMask & si.collisionFilterGroup)) continue
            if (placedA.at[i].distanceTo(placedB.at[j]) > si.boundingSphereRadius + sj.boundingSphereRadius) continue
            if (!(si.type & sj.type & SPHERE) && !this.boundsMeet(a, placedA, i, b, placedB, j)) continue
            const shapeMaterial = (si.material && sj.material && world.getContactMaterial(si.material, sj.material)) || null
            narrowphase.currentContactMaterial = shapeMaterial || material || world.defaultContactMaterial
            const resolver = resolvers[si.type | sj.type]
            if (!resolver) continue
            xi.copy(placedA.at[i])
            xj.copy(placedB.at[j])
            qi.copy(placedA.turn[i])
            qj.copy(placedB.turn[j])
            const hit = si.type < sj.type ? resolver.call(narrowphase, si, sj, xi, xj, qi, qj, a, b, si, sj, justTest) : resolver.call(narrowphase, sj, si, xj, xi, qj, qi, b, a, si, sj, justTest)
            if (hit && justTest) {
              world.shapeOverlapKeeper.set(si.id, sj.id)
              world.bodyOverlapKeeper.set(a.id, b.id)
            }
          }
        }
      }
    }
  }

  /**
   * The table top and the shelf level with it are one plane at y = 0 that
   * holds a body only while its middle is over them, so what is pushed past
   * the edge still falls. Parts and stones lying awake on a slab box cost
   * 7 to 9 us a contact test, the most of any pair on the Honest Scale; on a
   * plane each is a pass over the body's corners.
   */
  private addTable(): void {
    const table = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    table.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    table.addShape(new CANNON.Plane())
    this.world.addBody(table)
    this.table = table
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

  /**
   * The rug is 1.2 mm of cloth, so all it does is hold what lies over it that
   * much above the table. A plane at its top does that for a sliver of a
   * polygon's cost (a stone on a 16-sided prism was a fifth of a spill's
   * physics), and it holds a body only while the body's middle is over the
   * rug. Near the edge the hem, taller than the cloth, is what a stone rests
   * on, and nothing slides onto the rug under the hem.
   */
  private addRug(): void {
    const rug = new CANNON.Body({ mass: 0, material: this.woodMaterial })
    const at = to3(RUG.center)
    rug.position.set(at.x, RUG.top, at.z)
    rug.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    rug.addShape(new CANNON.Plane())
    this.world.addBody(rug)
    this.fixtures.set('rug', rug)
    this.rug = rug
    this.addHem()
  }

  /** Whether a body lies in a pan: its middle within the floor's reach of the pan's middle, and not below the pan. */
  private inPan(floor: CANNON.Body, body: CANNON.Body): boolean {
    const reach = this.panFloors.get(floor) ?? 0
    const dx = body.position.x - floor.position.x
    const dz = body.position.z - floor.position.z
    return dx * dx + dz * dz <= reach * reach && body.position.y >= floor.position.y - PAN_FLOOR + DISH_PROFILE[0][1] * PAN_DEPTH
  }

  /** Whether a pair may touch at all: the table, the rug and the pan floors are planes that hold only what lies over them. */
  private mayTouch(a: CANNON.Body, b: CANNON.Body): boolean {
    if (a.type !== CANNON.Body.DYNAMIC && b.type !== CANNON.Body.DYNAMIC) return false
    for (const [plane, other] of [[a, b], [b, a]] as const) {
      if (plane === this.table && !overTable(other)) return false
      if (plane === this.rug && !this.overRug(other)) return false
      if (this.panFloors.has(plane) && !this.inPan(plane, other)) return false
    }
    return true
  }

  /**
   * The planes' rules apply to the broadphase's pairs, before any contact is
   * looked for, so they hold whichever way the narrowphase then runs.
   */
  private onlyPairsThatMayTouch(): void {
    const broadphase = this.world.broadphase
    const pairs = broadphase.collisionPairs.bind(broadphase)
    broadphase.collisionPairs = (world, p1, p2) => {
      pairs(world, p1, p2)
      let kept = 0
      for (let k = 0; k < p1.length; k++) {
        if (!this.mayTouch(p1[k], p2[k])) continue
        p1[kept] = p1[k]
        p2[kept] = p2[k]
        kept++
      }
      p1.length = kept
      p2.length = kept
    }
  }

  /** Whether a body's middle lies over the rug. */
  private overRug(body: CANNON.Body): boolean {
    const rug = this.rug
    if (!rug) return false
    const dx = (body.position.x - rug.position.x) / (RUG.rx * UNIT)
    const dz = (body.position.z - rug.position.z) / (RUG.rz * UNIT)
    return dx * dx + dz * dz <= 1
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
    for (const floor of this.panFloors.keys()) {
      this.world.removeBody(floor)
      this.targets.delete(floor)
    }
    this.panFloors.clear()
    this.removeFixture('bowl')
    this.removeFixture('rug')
    this.rug = null
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
      this.wall(body, panOutline(r), 0.8)
      // The floor is a plane that moves with the pan and holds only what lies
      // in it (see `inPan`): a stone on a 12-sided disc cost 23 us a contact
      // test. The pan only ever moves, never tilts, so its floor stays level.
      const floor = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.woodMaterial })
      floor.addShape(new CANNON.Plane())
      floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
      floor.position.set(at.x, PAN_REST_HEIGHT + PAN_FLOOR, at.z)
      this.world.addBody(floor)
      this.panFloors.set(floor, r * PAN_RIM)
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
    return { mat, seats, panFloors: [this.panFloor(0), this.panFloor(1)], panSway: this.panSwung(0) }
  }

  /**
   * Beam tilt drives the pans up and down, and its turning swings them
   * sideways (`sway`, cm); stones in them ride along. `drops` are world units.
   * A tilt wakes every stone and part; a swing only those in or against a
   * pan, as the pans swing on for seconds after the beam stops and would
   * keep every part on the table awake.
   */
  setPanDrops(drops: readonly [number, number], sway = 0): void {
    const tilted = Math.abs(drops[0] - this.panDrops[0]) > 0.01 || Math.abs(drops[1] - this.panDrops[1]) > 0.01
    const swung = Math.abs(sway - this.panSway) > 0.01
    const floors = [...this.panFloors.keys()]
    this.pans.forEach((pan, side) => {
      const at = to3(SCALE.pans[side])
      this.targets.set(pan, { x: at.x + sway, y: PAN_REST_HEIGHT - drops[side] * UNIT, z: at.z })
      if (floors[side]) this.targets.set(floors[side], { x: at.x + sway, y: PAN_REST_HEIGHT - drops[side] * UNIT + PAN_FLOOR, z: at.z })
    })
    // Only what lies in or on a pan feels it move: waking the whole table every
    // frame the beam swings kept every part and stone on it awake and stepped.
    if (tilted || swung) {
      // A pan's reach: its round footprint and the height it hangs over, without working out its many walls' bounds each frame.
      this.pans.forEach((pan, side) => {
        const reach = SCALE.pans[side].r * UNIT + 1
        const top = pan.position.y + PAN_DEPTH
        for (const { body } of this.stones.values()) {
          if (body.sleepState !== CANNON.Body.SLEEPING) continue
          const [dx, dz] = [body.position.x - pan.position.x, body.position.z - pan.position.z]
          const r = reach + body.boundingRadius
          if (dx * dx + dz * dz <= r * r && body.position.y - body.boundingRadius <= top) body.wakeUp()
        }
      })
    }
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

  /** A seated guest stands as a post as wide as its body and as tall as it ever stretches, with its idling arms held at its sides. */
  setGuest(key: string, seat: number, height: number): void {
    const at = FEEDING.seats[seat].guest
    this.setFixture(key, { ...at, r: GUEST_RADIUS }, height)
    const body = this.fixtures.get(key)!
    const turn = guestYaw(seat)
    const middle = feedingFloor(at, GUEST_RADIUS * UNIT) + (GUEST_ARM.low + GUEST_ARM.high) / 2
    const corner = GUEST_ARM.r / Math.cos(Math.PI / FIXTURE_SIDES)
    for (const side of [-1, 1]) {
      const x = side * GUEST_ARM.x
      const offset = new CANNON.Vec3(x * Math.cos(turn) + GUEST_ARM.z * Math.sin(turn), middle, -x * Math.sin(turn) + GUEST_ARM.z * Math.cos(turn))
      body.addShape(new CANNON.Cylinder(corner, corner, GUEST_ARM.high - GUEST_ARM.low, FIXTURE_SIDES), offset)
    }
    this.guests.add(body)
    this.tops.set(key, { circle: { ...at, r: GUEST_RADIUS }, height, over: GUEST_REACH / UNIT })
  }

  removeFixture(key: string): void {
    const body = this.fixtures.get(key)
    if (body) {
      this.world.removeBody(body)
      this.fixtures.delete(key)
      this.guests.delete(body)
    }
    this.tops.delete(key)
  }

  /**
   * How high (cm) something held at `at`, reaching `reach` (cm) round, must
   * ride to clear the round fixtures and the hanging pans' rims and rope knots
   * under it: the top of the tallest, or 0. Something already `riding` above
   * the hold height stays up over a guest until it is clear of the guest's
   * head, which reaches out well past its body, so it never comes down
   * through a face or a nose.
   */
  heldClearance(at: Point, reach: number, riding = false): number {
    let top = 0
    for (const { circle, height, over } of this.tops.values()) if (Math.hypot(at.x - circle.x, at.y - circle.y) * UNIT < ((riding && over) || circle.r) * UNIT + reach) top = Math.max(top, height)
    this.pans.forEach((pan, side) => {
      const rim = panRimReach(SCALE.pans[side].r * UNIT)
      const hung = toWorld2(pan.position)
      if (Math.hypot(at.x - hung.x, at.y - hung.y) * UNIT < rim.out + reach) top = Math.max(top, pan.position.y + rim.knots)
    })
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
    if (!collider.prism) {
      this.balls.set(body, Math.max(...collider.balls.map((ball) => ball.r)))
      body.updateAABB = () => this.ballBounds(body)
    }
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
    this.balls.delete(entry.body)
    this.world.removeBody(entry.body)
    this.stones.delete(id)
    this.touchedGuest.delete(id)
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

  /** Whether a stone has come to rest and been put to sleep. */
  asleep(id: number): boolean {
    return this.body(id)?.sleepState === CANNON.Body.SLEEPING
  }

  /** Whether a stone touched a seated guest as it came to rest: asleep, it leans on the guest. */
  leansOnGuest(id: number): boolean {
    const body = this.body(id)
    const touched = this.touchedGuest.get(id)
    return body !== undefined && touched !== undefined && touched >= body.timeLastSleepy
  }

  /** The height (cm) of a stone's highest drawn point, as it lies. */
  stoneTop(id: number): number | null {
    const entry = this.stones.get(id)
    if (!entry) return null
    const { x, y, z, w } = entry.body.quaternion
    return entry.body.position.y + stoneReachAlong(entry.q, 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x))
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
    body.aabbNeedsUpdate = true
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
    const slow = elapsed > SLOW_FRAME + STEP_SLACK * STEP
    this.accumulator = Math.min(this.accumulator + elapsed, slow ? SLOW_FRAME_STEPS * STEP : LONGEST_FRAME)
    // What follows a target gets there evenly over this frame's substeps, not in a jump at twice its speed and a stop.
    const substeps = Math.floor(this.accumulator / STEP + STEP_SLACK)
    const work = slow ? SLOW_FRAME_WORK : MOST_FRAME_STEPS
    this.accumulator = Math.max(0, this.accumulator - substeps * STEP)
    for (let left = substeps; left > 0; left--) {
      const time = left * STEP
      for (const [body, target] of this.targets) {
        body.velocity.set((target.x - body.position.x) / time, (target.y - body.position.y) / time, (target.z - body.position.z) / time)
      }
      const pieces = Math.max(1, Math.min(this.pieces(), Math.floor(work / substeps)))
      for (let piece = 0; piece < pieces; piece++) {
        this.world.step(STEP / pieces)
        this.surfaceBalls()
      }
      this.noteLeaning()
      this.resistRolling()
      this.settleLooseParts()
    }
    // A pan at rest falls asleep and stops moving itself, so its bounds are stale until marked here.
    for (const [body, target] of this.targets) {
      body.position.set(target.x, target.y, target.z)
      body.velocity.setZero()
      body.aabbNeedsUpdate = true
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

  /** How many pieces the next step is cut into, so no shell or stick about to meet a stone or part moves its balls further than BALL_TRAVEL allows in one, and no two stones or parts closing on each other close further than STONE_TRAVEL allows. */
  private pieces(): number {
    let pieces = 1
    for (const [body, reach] of this.balls) {
      if (body.type !== CANNON.Body.DYNAMIC || body.sleepState === CANNON.Body.SLEEPING) continue
      const speed = body.velocity.length()
      const travel = speed * STEP
      const most = Math.min(reach * BALL_TRAVEL, BALL_MOST_TRAVEL)
      // About to meet a stone or part faster than one ball's radius a step, a
      // shell or stick is slowed to that for this step instead of the whole
      // world's step being cut finer for it (a pour of shells onto stones did
      // that dozens of times a second): it meets what it lands on a step later.
      if (travel > most && this.nearLoose(body, travel)) body.velocity.scale(most / travel, body.velocity)
    }
    pieces = Math.min(pieces, MOST_PIECES)
    const { DYNAMIC, SLEEPING } = CANNON.Body
    const loose = this.closing
    loose.length = 0
    for (const { body } of this.stones.values()) if (body.type === DYNAMIC) loose.push(body)
    for (let i = 0; i < loose.length; i++) {
      const a = loose[i]
      const aAwake = a.sleepState !== SLEEPING
      for (let j = i + 1; j < loose.length; j++) {
        const b = loose[j]
        if (!aAwake && b.sleepState === SLEEPING) continue
        // Flat stones meet edge first, anywhere around them, even while their middles part; a spinning one's rim swings in too.
        const [vx, vy, vz] = [a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y, a.velocity.z - b.velocity.z]
        const travel = (Math.hypot(vx, vy, vz) + a.angularVelocity.length() * a.boundingRadius + b.angularVelocity.length() * b.boundingRadius) * STEP
        const need = Math.ceil(travel / (Math.min(a.boundingRadius, b.boundingRadius) * STONE_TRAVEL))
        if (need <= pieces) continue
        if (a.aabbNeedsUpdate) a.updateAABB()
        if (b.aabbNeedsUpdate) b.updateAABB()
        const [low, high, from, to] = [a.aabb.lowerBound, a.aabb.upperBound, b.aabb.lowerBound, b.aabb.upperBound]
        if (from.x - travel < high.x && to.x + travel > low.x && from.y - travel < high.y && to.y + travel > low.y && from.z - travel < high.z && to.z + travel > low.z) pieces = Math.min(need, MOST_STONE_PIECES)
      }
    }
    return pieces
  }

  /** Whether a stone or part other than `body` lies within `reach` (cm) of its bounds. */
  private nearLoose(body: CANNON.Body, reach: number): boolean {
    if (body.aabbNeedsUpdate) body.updateAABB()
    const { lowerBound: low, upperBound: high } = body.aabb
    for (const { body: other } of this.stones.values()) {
      if (other === body || other.type !== CANNON.Body.DYNAMIC) continue
      if (other.aabbNeedsUpdate) other.updateAABB()
      const { lowerBound: from, upperBound: to } = other.aabb
      if (from.x - reach < high.x && to.x + reach > low.x && from.y - reach < high.y && to.y + reach > low.y && from.z - reach < high.z && to.z + reach > low.z) return true
    }
    return false
  }

  /**
   * Pushes each awake shell or stick with a ball's middle inside a stone or a
   * part's prism back out through the side it lies least deep behind, and
   * stops it moving further in: cannon pushes a ball out of a convex shape
   * only while its middle is outside it, so a thin ball driven in past that (a
   * stick's twig or tip landing on a stone) stayed in.
   */
  private surfaceBalls(): void {
    const { local, out, way, back } = this.surfacing
    const { DYNAMIC, SLEEPING } = CANNON.Body
    for (const body of this.balls.keys()) {
      if (body.type !== DYNAMIC || body.sleepState === SLEEPING) continue
      for (const { body: other } of this.stones.values()) {
        if (other === body || other.type !== DYNAMIC) continue
        // Bounding spheres first: a stick's bounds are its 47 balls placed afresh, not worth working out for what lies nowhere near.
        const reach = body.boundingRadius + other.boundingRadius
        if (body.position.distanceSquared(other.position) > reach * reach) continue
        if (body.aabbNeedsUpdate) body.updateAABB()
        if (other.aabbNeedsUpdate) other.updateAABB()
        if (!body.aabb.overlaps(other.aabb)) continue
        other.quaternion.conjugate(back)
        for (let s = 0; s < other.shapes.length; s++) {
          const shape = other.shapes[s]
          if (!(shape instanceof CANNON.ConvexPolyhedron)) continue
          let need = 0
          const balls = this.place(body).at
          for (let b = 0; b < body.shapes.length; b++) {
            const ball = body.shapes[b] as CANNON.Sphere
            balls[b].vsub(other.position, local)
            back.vmult(local, local)
            local.vsub(other.shapeOffsets[s], local)
            if (local.length() >= shape.boundingSphereRadius) continue
            let least = -Infinity
            let face = 0
            for (let f = 0; f < shape.faces.length; f++) {
              const normal = shape.faceNormals[f]
              const side = normal.dot(local) - normal.dot(shape.vertices[shape.faces[f][0]])
              if (side > least) {
                least = side
                face = f
              }
            }
            if (least >= 0 || ball.radius - least <= need) continue
            need = ball.radius - least
            out.copy(shape.faceNormals[face])
          }
          if (need === 0) continue
          other.quaternion.vmult(out, way)
          body.position.addScaledVector(need, way, body.position)
          body.aabbNeedsUpdate = true
          const inward = body.velocity.vsub(other.velocity).dot(way)
          if (inward < 0) body.velocity.addScaledVector(-inward, way, body.velocity)
        }
      }
    }
  }

  /**
   * How far (cm) each of `bodies` lies sunk into the stones and parts it
   * touches, as the way out along the contacts' normals: one landing fast goes
   * up to a centimetre in within a step, before any contact is made, and its
   * contacts push it back out over the next few. The world's own contacts are
   * from before its last step moved things, and leave out a part asleep on a
   * sleeping stone, so these are found afresh.
   */
  sunk(bodies: ReadonlySet<CANNON.Body>): Map<CANNON.Body, CANNON.Vec3> {
    const out = new Map<CANNON.Body, CANNON.Vec3>()
    if (bodies.size === 0) return out
    const still = this.stillPoses()
    const last = this.lastSunk
    if (still && last && last.bodies.size === bodies.size && [...bodies].every((body) => last.bodies.has(body)) && still.length === last.poses.length && still.every((v, i) => v === last.poses[i])) return last.out
    this.lastSunk = still ? { bodies: new Set(bodies), poses: still, out } : null
    const pairs = new Map<string, SunkPair>()
    const sunk: SunkContact[] = []
    for (const body of bodies) {
      if (body.type !== CANNON.Body.DYNAMIC) continue
      if (body.aabbNeedsUpdate) body.updateAABB()
      for (const { body: other } of this.stones.values()) {
        if (other === body || other.type !== CANNON.Body.DYNAMIC || (bodies.has(other) && other.id < body.id)) continue
        if (other.aabbNeedsUpdate) other.updateAABB()
        if (!body.aabb.overlaps(other.aabb)) continue
        const key = `${body.id} ${other.id}`
        const pair = this.sunkPair(this.sunkPairs.get(key), body, other)
        pairs.set(key, pair)
        for (const contact of pair.found) {
          sunk.push(contact)
          for (const touched of [contact.bi, contact.bj]) if (bodies.has(touched) && !out.has(touched)) out.set(touched, new CANNON.Vec3())
        }
      }
    }
    this.sunkPairs = pairs
    // A part pressed between two things is lifted out of both where it can
    // be; two lifted parts pressed together each move half the way apart.
    for (let pass = 0; pass < SUNK_PASSES; pass++) {
      for (const { bi, bj, ni, depth } of sunk) {
        const [li, lj] = [out.get(bi), out.get(bj)]
        const need = depth - (lj?.dot(ni) ?? 0) + (li?.dot(ni) ?? 0)
        if (need <= 0) continue
        const share = li && lj ? need / 2 : need
        li?.addScaledVector(-share, ni, li)
        lj?.addScaledVector(share, ni, lj)
      }
    }
    return out
  }

  /** How far one pair lies sunk into each other: what was found last if neither has moved since, else found afresh. */
  private sunkPair(last: SunkPair | undefined, body: CANNON.Body, other: CANNON.Body): SunkPair {
    const pose = [body, other].flatMap(({ position: p, quaternion: q }) => [p.x, p.y, p.z, q.x, q.y, q.z, q.w])
    if (last && pose.every((v, i) => v === last.pose[i])) return last
    const contacts: CANNON.ContactEquation[] = []
    this.world.narrowphase.getContacts([body], [other], this.world, contacts, [], [], [])
    const gap = new CANNON.Vec3()
    const found: SunkContact[] = []
    for (const { bi, bj, ri, rj, ni } of contacts) {
      bj.position.vadd(rj, gap)
      gap.vsub(bi.position, gap)
      gap.vsub(ri, gap)
      const depth = -gap.dot(ni)
      if (depth > 0) found.push({ bi, bj, ni, depth })
    }
    return { pose, found }
  }

  /** Where every stone and part lies, while all of them sleep: nothing sunk can change until one moves. */
  private stillPoses(): number[] | null {
    const poses: number[] = []
    for (const { body } of this.stones.values()) {
      if (body.type === CANNON.Body.DYNAMIC && body.sleepState !== CANNON.Body.SLEEPING) return null
      const { position: p, quaternion: q } = body
      poses.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w)
    }
    return poses
  }

  /** Notes when stones touch a seated guest: a stone resting against one touches it only now and then as it settles. */
  private noteLeaning(): void {
    if (this.guests.size === 0) {
      this.touchedGuest.clear()
      return
    }
    const touching = new Set<CANNON.Body>()
    for (const { bi, bj } of this.world.contacts) {
      if (this.guests.has(bi)) touching.add(bj)
      else if (this.guests.has(bj)) touching.add(bi)
    }
    if (touching.size === 0) return
    for (const [id, { body }] of this.stones) if (touching.has(body)) this.touchedGuest.set(id, this.world.time)
  }
}
