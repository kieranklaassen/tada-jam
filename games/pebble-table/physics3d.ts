import type * as RapierModule from '@dimforge/rapier3d-compat'
import { GUEST_ARM, GUEST_RADIUS, GUEST_REACH, guestYaw } from './feeding'
import { JAR_SCALE, JARS, PART_KINDS, type PartKind } from './parts'
import { BAG, DOOR, FEEDING, HOUSE_FOOTPRINT, HOUSE_REACH, RADIUS_BY_QUARTERS, SCALE, SHELF, TABLE, WORLD, type Circle, type MatKey, type Point, type Quarters } from './layout'
import { JAR_LIFT, JAR_MOUTH, JAR_REACH, JAR_TOP, jarLabelBox, NEST_SPAN, partCollider, partRest } from './partShape'
import { outlineCorners, STONE_CUTS, stoneOutline, stoneReachAlong, stoneRest } from './stoneShape'
import { BOWL_FLOOR, BOWL_OUTSIDE, BOWL_WALL, BOWL_WALL_THICKNESS, DISH_PROFILE, feedingFloor, HEM_LINE, HEM_POINTS, ON_RUG, PAN_DEPTH, PAN_FLOOR, PAN_RIM, panOutline, panRimReach, PLATE_TOP, radiusAt, RUG, RUG_HEM_REACH, RUG_HEM_TOP, type Surfaces } from './surfaces'
import { Quat, V3 } from './vec'

// Real stone physics (Rapier, WebAssembly) under the same world coordinates
// the game rules use. One 3D unit is one centimetre and ten world units; the
// table top is y = 0 and the world's centre is the origin. Stones are low
// hulls around their drawn outline (stoneShape.ts) so they lie flat, stack,
// and touch where they are drawn; parts are the balls and hulls partShape.ts
// fits to their drawing; the rug, plates, bowl, and pans are solid at the
// heights they are drawn (surfaces.ts), and walls make the bowl and pans hold
// what falls into them; anything that leaves the table top falls and is
// reported so it can go home to the bag. Continuous collision keeps a fast
// landing from passing into what it lands on; the step is fixed, whatever
// the quality tier.

type Rapier = typeof RapierModule
type RigidBody = RapierModule.RigidBody
type Collider = RapierModule.Collider
type ColliderDesc = RapierModule.ColliderDesc

let rapier: Rapier | null = null
let loading: Promise<void> | null = null

/**
 * Loads and starts Rapier (its WebAssembly is bundled with the game, never
 * fetched from elsewhere). Call once, while the game loads, before making a
 * TablePhysics; later calls return the same promise.
 */
export function physicsReady(): Promise<void> {
  loading ??= import('@dimforge/rapier3d-compat').then(async (module) => {
    const loaded = ((module as { default?: unknown }).default ?? module) as unknown as Rapier
    await loaded.init()
    rapier = loaded
  })
  return loading
}

function engine(): Rapier {
  if (!rapier) throw new Error('physicsReady() must finish before the table makes its physics')
  return rapier
}

export const UNIT = 0.1
export const GRAVITY = -981
export const STEP = 1 / 120
export const HOLD_HEIGHT = 11
export const PAN_REST_HEIGHT = 6
/**
 * The most time (s) one frame catches up, in whole steps: two display frames
 * at 60 Hz and a leftover step never reach it, so an on-time frame never
 * loses a step, whatever the quality tier.
 */
export const LONGEST_FRAME = 1 / 20
/**
 * A frame longer than this (s) is a device falling behind, not a dropped frame:
 * longer than two 60 Hz frames and a leftover step, and than the 33 ms frames
 * the intersection audit steps its clock by. Such a frame catches up only
 * SLOW_FRAME_STEPS whole steps and lets the rest of its time go, so a slow
 * frame never makes the next one slower; on-time frames and the audit's never
 * reach this, so their game time is whole.
 */
export const SLOW_FRAME = 5 * STEP
const SLOW_FRAME_STEPS = 2
/** Against rounding in sums of frame times: this close to a whole step (in steps) still makes it. */
export const STEP_SLACK = 1e-6
/**
 * Rapier's length scale for its tolerances and its sleep threshold (0.4 of
 * it a second): at 10, a body that stays slower than 4 cm/s (the table's own
 * calm speed) falls asleep, and contacts are resolved to about 0.01 cm.
 */
const LENGTH_UNIT = 10
/**
 * How far ahead (cm) a loose body looks for what it is about to meet, so two
 * stones flung at each other meet at their surfaces instead of a step inside
 * each other: about as far as a thrown stone travels in a step. (Full
 * continuous collision only starts once a body moves more than its own
 * thickness in a step.)
 */
const SOFT_CCD = 1
/** A contact faster than this (cm/s) along its normal makes a sound. */
const IMPACT_HEARD = 25
/**
 * Round fixtures and guests' arms stand this much wider than drawn (as far as
 * a ten-sided post around the drawing reaches), so what rests against one is
 * drawn a hair clear of it, and a stone tipping against an arm meets it
 * before it can stand up on its own.
 */
const FIXTURE_PROUD = 1 / Math.cos(Math.PI / 10)
const RUG_SIDES = 16
const DISC_SIDES = 12
/** The hem is split into this many stretches of boxes. */
const HEM_ARCS = 16
const BOWL_SEGMENTS = 14
const FALL_LIMIT = -12
/** How tall the little house stands, for what is carried over it (cm). */
const HOUSE_TOP = 34
/** How deep the table and what lies on it are solid. */
const SLAB = 4
/** A sweeping finger's collider reaches this high above the table, and as deep into it. */
const BROOM_TOP = 3
/** A loose body slower than this (units/s, spin included) for `LOOSE_CALM_SECONDS` is put to sleep, with whatever it lies against (see `settleLoose`). */
const LOOSE_CALM_SPEED = 4
const LOOSE_CALM_SECONDS = 1
/** A body still stirring this long (s) since it last slept is only jittering against its neighbours, so it counts as calm below `LOOSE_RESTLESS_SPEED`. */
const LOOSE_RESTLESS_SECONDS = 6
const LOOSE_RESTLESS_SPEED = 3 * LOOSE_CALM_SPEED
/** A stone touching a seated guest this soon (s) before it came to rest leans on the guest. */
const LEAN_WINDOW = 0.5
/** How far apart (cm) two shapes may be and still count as touching for `sunk`. */
const SUNK_PREDICTION = 0.05
/** How many times sunk goes over the contacts it finds, so lifting a part out of one does not leave it in another. */
const SUNK_PASSES = 4
/** Damping given as the share of speed lost each second, turned into Rapier's per-step rate (speed kept 1 / (1 + d dt) a step). */
const damping = (keptLoss: number) => -Math.log(1 - keptLoss)
const PART_BODY: Record<PartKind, { mass: number; damping: number }> = {
  acorn: { mass: 2, damping: 0.4 },
  shell: { mass: 1, damping: 0.5 },
  stick: { mass: 4, damping: 0.45 },
  boulder: { mass: 12, damping: 0.65 },
}
/** Friction and bounce of stones and parts, and of the wood, clay and cloth they meet (averaged per contact). */
const STONE_SURFACE = { friction: 0.35, restitution: 0.22 }
const WOOD_SURFACE = { friction: 0.55, restitution: 0.02 }
/** The jars with lids; the boulder's nest is open. */
const LIDDED_JARS = ['acorn', 'shell', 'stick'] as const
/** Collision groups: everything meets everything; a held stone meets nothing. */
const MEETS_ALL = 0xffffffff
const MEETS_NOTHING = 0

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

/** An upright prism around an outline (corners from +x toward +z, seen from above), from `bottom` to `top`: its corner points. */
export function prismPoints(corners: readonly { x: number; z: number }[], bottom: number, top: number): V3[] {
  return corners.flatMap(({ x, z }) => [new V3(x, bottom, z), new V3(x, top, z)])
}

/**
 * The same prism in pieces whose every face has at most four corners, fanned
 * out from its first corner. Rapier meets a flat face by at most four of its
 * corners, so a stone lying on an eight-sided face would bear on only half of
 * it, rock, and let what lands on it sink in.
 */
export function prismPieces(corners: readonly { x: number; z: number }[], bottom: number, top: number): V3[][] {
  const pieces: V3[][] = []
  for (let k = 1; k + 1 < corners.length; k += 2) {
    const fan = [corners[0], corners[k], corners[k + 1]]
    if (k + 2 < corners.length) fan.push(corners[k + 2])
    pieces.push(prismPoints(fan, bottom, top))
  }
  return pieces
}

/** A stone's collider: the hull of its drawn outline, from its drawn bottom to its drawn top. */
export function stoneHullPoints(q: Quarters): V3[] {
  const outline = stoneOutline(STONE_CUTS[q])
  return prismPoints(outlineCorners(outline.reach), outline.bottom, outline.top)
}

/** A stone's collider in pieces (see `prismPieces`). */
function stonePieces(q: Quarters): V3[][] {
  const outline = stoneOutline(STONE_CUTS[q])
  return prismPieces(outlineCorners(outline.reach), outline.bottom, outline.top)
}

/** The corners of a regular polygon of `sides` sides reaching `radius`. */
function roundCorners(radius: number, sides: number): { x: number; z: number }[] {
  return Array.from({ length: sides }, (_, k) => ({ x: Math.cos((k / sides) * Math.PI * 2) * radius, z: Math.sin((k / sides) * Math.PI * 2) * radius }))
}

const flat = (points: readonly V3[]) => Float32Array.from(points.flatMap((p) => [p.x, p.y, p.z]))

/** How a body lies, as the game reads it: synced from Rapier after every frame (see `TablePhysics.sync`). */
export class TableBody {
  readonly position = new V3()
  readonly quaternion = new Quat()
  readonly velocity = new V3()
  readonly angularVelocity = new V3()
  /** Whether it has come to rest and been put to sleep. */
  asleep = false
  /** Whether a finger holds it (it follows the finger and meets nothing). */
  held = false
  /** Its bounding radius (cm) about its origin. */
  readonly boundingRadius: number

  constructor(
    readonly rigid: RigidBody,
    boundingRadius: number,
    private readonly wakeAll: (body: TableBody) => void,
  ) {
    this.boundingRadius = boundingRadius
    this.sync()
  }

  sync(): void {
    const b = this.rigid
    this.position.copy(b.translation())
    this.quaternion.copy(b.rotation())
    this.velocity.copy(b.linvel())
    this.angularVelocity.copy(b.angvel())
    this.asleep = b.isSleeping()
  }

  /** Puts it where `position` and `quaternion` say (test and tooling use). */
  place(position: Vec3, quaternion?: { x: number; y: number; z: number; w: number }): void {
    this.wakeUp()
    this.rigid.setTranslation(position, false)
    if (quaternion) this.rigid.setRotation(quaternion, false)
    this.sync()
  }

  /** Sets how fast it moves (test and tooling use). */
  setVelocity(x: number, y: number, z: number): void {
    this.wakeUp()
    this.rigid.setLinvel({ x, y, z }, false)
    this.sync()
  }

  /** Stops it moving and spinning (test and tooling use). */
  halt(): void {
    this.wakeUp()
    this.rigid.setLinvel({ x: 0, y: 0, z: 0 }, false)
    this.rigid.setAngvel({ x: 0, y: 0, z: 0 }, false)
    this.sync()
  }

  /** Wakes it, and everything asleep that it lies against. */
  wakeUp(): void {
    this.wakeAll(this)
  }
}

type StoneEntry = { body: TableBody; q: Quarters }
/** A contact `sunk` found between two bodies: how deep one lies in the other, along the normal from the first to the second. */
type SunkContact = { bi: TableBody; bj: TableBody; ni: V3; depth: number }
/** The contacts `sunk` found between one pair of bodies, and where the two lay (position, then quaternion, of each). */
type SunkPair = { pose: number[]; found: SunkContact[] }

export type StepReport = {
  fallen: number[]
  impacts: number[]
  moving: boolean
}

export class TablePhysics {
  readonly world: RapierModule.World
  private readonly R: Rapier
  private readonly events: RapierModule.EventQueue
  private readonly stones = new Map<number, StoneEntry>()
  private readonly byRigid = new Map<number, TableBody>()
  private readonly fixtures = new Map<string, RigidBody>()
  private readonly guests = new Set<RigidBody>()
  /** When (world time) each stone last touched a seated guest, and when it last fell asleep. */
  private readonly touchedGuest = new Map<number, number>()
  private readonly sleptAt = new Map<number, number>()
  /** The round fixtures something held must ride over, how tall they stand, and (a guest) how far out its head reaches. */
  private readonly tops = new Map<string, { circle: Circle; height: number; over?: number }>()
  private readonly openJars = new Set<PartKind>()
  private readonly pans: RigidBody[] = []
  private readonly brooms = new Map<number, RigidBody>()
  private panDrops: [number, number] = [0, 0]
  private panSway = 0
  private readonly targets = new Map<RigidBody, Vec3>()
  /** Stones and parts, with how long each has been calm, awake and asleep. */
  private readonly calm = new Map<TableBody, { calm: number; awake: number; asleep: number }>()
  /** Velocity of every awake body before the step, for the speed of contacts that begin in it. */
  private readonly before = new Map<number, V3>()
  private impacts: number[] = []
  private accumulator = 0
  private time = 0
  /** How many physics steps have run, for counted work budgets. */
  steps = 0
  /** What sunk found for each pair of bodies it tried last time, and where the two lay. */
  private sunkPairs = new Map<string, SunkPair>()
  private readonly contact: RapierModule.ShapeContact

  constructor() {
    const R = engine()
    this.R = R
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 })
    this.world.timestep = STEP
    this.world.lengthUnit = LENGTH_UNIT
    this.events = new R.EventQueue(true)
    this.contact = new R.ShapeContact(0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })
    this.addTable()
    // Fitting a part's balls to its drawn shape is slow the first time for each kind: do it now, while the game loads.
    for (const kind of PART_KINDS) partCollider(kind)
  }

  private fixed(x: number, y: number, z: number): RigidBody {
    return this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(x, y, z))
  }

  private wood(desc: ColliderDesc): ColliderDesc {
    return desc.setFriction(WOOD_SURFACE.friction).setRestitution(WOOD_SURFACE.restitution)
  }

  private addTable(): void {
    const center = to3({ x: TABLE.x + TABLE.w / 2, y: TABLE.y + TABLE.h / 2 })
    const table = this.fixed(center.x, -SLAB / 2, center.z)
    this.world.createCollider(this.wood(this.R.ColliderDesc.cuboid((TABLE.w * UNIT) / 2, SLAB / 2, (TABLE.h * UNIT) / 2)), table)
    const shelfLeft = TABLE.x + TABLE.w
    const shelfRight = SHELF.x + SHELF.w
    const shelfCenter = to3({ x: (shelfLeft + shelfRight) / 2, y: TABLE.y + TABLE.h / 2 })
    const shelf = this.fixed(shelfCenter.x, -2, shelfCenter.z)
    this.world.createCollider(this.wood(this.R.ColliderDesc.cuboid(((shelfRight - shelfLeft) * UNIT) / 2, 2, (TABLE.h * UNIT) / 2)), shelf)
  }

  /**
   * A wall of boxes around the y axis whose inner face runs along `line`
   * ((radius, height) points up the wall) and whose inner corners touch it,
   * so nothing resting against the wall reaches into what is drawn there.
   */
  private wall(body: RigidBody, line: readonly (readonly [number, number])[], thickness: number, baseY = 0): void {
    const inset = Math.cos(Math.PI / BOWL_SEGMENTS)
    for (let band = 0; band + 1 < line.length; band++) {
      const [r0, h0] = line[band]
      const [r1, h1] = line[band + 1]
      const length = Math.hypot(r1 - r0, h1 - h0)
      const along = { r: (r1 - r0) / length, h: (h1 - h0) / length }
      const out = { r: along.h, h: -along.r }
      const ring = out.r < 0 ? (2 * inset) / (1 + inset) : inset
      const centre = { r: ((r0 + r1) / 2) * ring + (out.r * thickness) / 2, h: baseY + (h0 + h1) / 2 + (out.h * thickness) / 2 }
      const half = [thickness / 2, length / 2, Math.tan(Math.PI / BOWL_SEGMENTS) * (Math.max(r0, r1) + thickness)] as const
      const tilt = new Quat().setFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.atan2(-along.r, along.h))
      for (let i = 0; i < BOWL_SEGMENTS; i++) {
        const angle = (i / BOWL_SEGMENTS) * Math.PI * 2
        const turn = new Quat().setFromAxisAngle({ x: 0, y: 1, z: 0 }, -angle).mult(tilt)
        const desc = this.R.ColliderDesc.cuboid(...half)
          .setTranslation(Math.cos(angle) * centre.r, centre.h, Math.sin(angle) * centre.r)
          .setRotation(turn)
        this.world.createCollider(this.wood(desc), body)
      }
    }
  }

  /** Solid pieces (see `prismPieces`) on a body. */
  private pieces(body: RigidBody, pieces: readonly V3[][]): void {
    for (const points of pieces) this.world.createCollider(this.wood(this.R.ColliderDesc.convexHull(flat(points))!), body)
  }

  /** A flat disc from `bottom` to `top` (relative to its body) whose twelve corners reach `radius`, so it never sticks out past what is drawn. */
  private disc(body: RigidBody, radius: number, bottom: number, top: number): void {
    this.pieces(body, prismPieces(roundCorners(radius, DISC_SIDES), bottom, top))
  }

  /**
   * The bowl's flared outside overhangs the rug. Up to a lying stone's
   * thickness a ring outside its inner wall is solid out to where the flare
   * reaches at that height, so a stone pushed against the bowl meets an
   * upright face instead of being wedged under the overhang into the rug.
   */
  private addBowl(): void {
    const at = to3(FEEDING.bowl)
    const bowl = this.fixed(at.x, ON_RUG, at.z)
    const stone = stoneOutline('whole')
    const skirt = stone.top - stone.bottom
    const inside = radiusAt(BOWL_WALL, skirt)
    this.wall(bowl, [[inside, -SLAB], [inside, skirt]], radiusAt(BOWL_OUTSIDE, skirt) - inside)
    this.disc(bowl, BOWL_WALL[0][0], -SLAB, BOWL_FLOOR - ON_RUG)
    this.wall(bowl, BOWL_WALL, BOWL_WALL_THICKNESS)
    this.fixtures.set('bowl', bowl)
  }

  /** The rug is solid at its drawn top: a prism inside its drawn ellipse. */
  private addRug(): void {
    const at = to3(RUG.center)
    const rug = this.fixed(at.x, 0, at.z)
    const corners = roundCorners(1, RUG_SIDES).map(({ x, z }) => ({ x: x * RUG.rx * UNIT, z: z * RUG.rz * UNIT }))
    this.pieces(rug, prismPieces(corners, -SLAB, RUG.top))
    this.fixtures.set('rug', rug)
    this.addHem()
  }

  /** The hem's rope is solid as drawn: a box along each stretch of its line, as wide as its lumps reach and as tall as the highest. */
  private addHem(): void {
    const per = HEM_POINTS / HEM_ARCS
    for (let arc = 0; arc < HEM_ARCS; arc++) {
      const body = this.fixed(0, 0, 0)
      for (let i = arc * per; i < (arc + 1) * per; i++) {
        const [a, b] = [to3(HEM_LINE[i], 0), to3(HEM_LINE[i + 1], 0)]
        const [dx, dz] = [b.x - a.x, b.z - a.z]
        const turn = new Quat().setFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.atan2(dz, dx))
        const desc = this.R.ColliderDesc.cuboid(Math.hypot(dx, dz) / 2, (RUG_HEM_TOP + SLAB) / 2, RUG_HEM_REACH)
          .setTranslation((a.x + b.x) / 2, (RUG_HEM_TOP - SLAB) / 2, (a.z + b.z) / 2)
          .setRotation(turn)
        this.world.createCollider(this.wood(desc), body)
      }
      this.fixtures.set(`hem-${arc}`, body)
    }
  }

  /** The scale's pans and post exist only while the scale is the live mat; the rug and bowl only with Fair Feeding. */
  setMat(mat: MatKey): void {
    for (const pan of this.pans) {
      this.world.removeRigidBody(pan)
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
      const at = to3(pan)
      const body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(at.x, PAN_REST_HEIGHT, at.z))
      const r = pan.r * UNIT
      this.disc(body, r * PAN_RIM, DISH_PROFILE[0][1] * PAN_DEPTH, PAN_FLOOR)
      this.wall(body, panOutline(r), 0.8)
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
    const turn = new Quat().setFromEuler(...label.rotation, 'XYZ')
    const [hx, hy, hz] = label.half.map((h) => h * JAR_SCALE)
    const desc = this.R.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(x * JAR_SCALE, (y + JAR_LIFT) * JAR_SCALE - body.translation().y, z * JAR_SCALE)
      .setRotation(turn)
    this.world.createCollider(this.wood(desc), body)
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
    const at = to3(JARS.boulder)
    const nest = this.fixed(at.x, 0, at.z)
    const [inner, outer] = [NEST_SPAN.inner * JAR_SCALE, NEST_SPAN.outer * JAR_SCALE]
    this.disc(nest, inner, -SLAB, NEST_SPAN.bed * JAR_SCALE)
    this.wall(nest, [[inner, 0], [inner, NEST_SPAN.top * JAR_SCALE]], outer - inner * Math.cos(Math.PI / BOWL_SEGMENTS))
    this.fixtures.set('nest', nest)
  }

  /** A seated guest's plate is solid at its drawn top; an empty seat has no plate. */
  setPlates(seats: readonly boolean[]): void {
    FEEDING.seats.forEach((seat, index) => {
      const key = `plate-${index}`
      this.removeFixture(key)
      if (!seats[index]) return
      const at = to3(seat.plate)
      const body = this.fixed(at.x, 0, at.z)
      this.disc(body, FEEDING.plateRadius * UNIT, -SLAB, PLATE_TOP)
      this.fixtures.set(key, body)
    })
  }

  /** What a piece lying on the live mat rests on, as `surfaceUnder` needs it. */
  surfaces(mat: MatKey, seats: readonly boolean[]): Surfaces {
    return { mat, seats, panFloors: [this.panFloor(0), this.panFloor(1)], panSway: this.panSwung(0) }
  }

  /**
   * Beam tilt drives the pans up and down, and its turning swings them
   * sideways (`sway`, cm); what lies in them rides along. Only what lies in
   * or on a pan is woken as it moves: waking the whole table every frame the
   * beam swings kept every part and stone on it awake and stepped. The pans
   * move only once they would move a visible amount (a hundredth of a unit):
   * the beam's sway dies away slowly, and pans nudged by a hair for ever
   * after keep what leans on them from ever falling asleep.
   */
  setPanDrops(drops: readonly [number, number], sway = 0): void {
    const tilted = Math.abs(drops[0] - this.panDrops[0]) > 0.01 || Math.abs(drops[1] - this.panDrops[1]) > 0.01
    const swung = Math.abs(sway - this.panSway) > 0.01
    if (!tilted && !swung) return
    this.pans.forEach((pan, side) => {
      const at = to3(SCALE.pans[side])
      this.targets.set(pan, { x: at.x + sway, y: PAN_REST_HEIGHT - drops[side] * UNIT, z: at.z })
      const hung = pan.translation()
      const reach = SCALE.pans[side].r * UNIT + 1
      const top = hung.y + PAN_DEPTH
      for (const { body } of this.stones.values()) {
        if (!body.asleep) continue
        const [dx, dz] = [body.position.x - hung.x, body.position.z - hung.z]
        const r = reach + body.boundingRadius
        if (dx * dx + dz * dz <= r * r && body.position.y - body.boundingRadius <= top) body.wakeUp()
      }
    })
    this.panDrops = [drops[0], drops[1]]
    this.panSway = sway
  }

  /** How far (cm) a pan has swung sideways from where it hangs at rest. */
  panSwung(side: 0 | 1): number {
    const pan = this.pans[side]
    return pan ? pan.translation().x - to3(SCALE.pans[side]).x : 0
  }

  /** Where a pan hangs from its ropes (its drawn origin). */
  panY(side: 0 | 1): number {
    return this.pans[side]?.translation().y ?? PAN_REST_HEIGHT
  }

  /** The top of a pan's floor, where pieces in it rest. */
  panFloor(side: 0 | 1): number {
    return this.panY(side) + PAN_FLOOR
  }

  /**
   * A round thing standing on the table, as round and as wide as drawn. It
   * reaches as deep into the table as it stands above it. Something held
   * rides over it (see `heldClearance`) unless something else overhangs it,
   * as the scale's beam does its post.
   */
  setFixture(key: string, circle: Circle, height = 12, overhung = false): void {
    this.removeFixture(key)
    const at = to3(circle)
    const body = this.fixed(at.x, 0, at.z)
    this.world.createCollider(this.wood(this.R.ColliderDesc.cylinder(height, circle.r * UNIT * FIXTURE_PROUD)), body)
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
    for (const side of [-1, 1]) {
      const x = side * GUEST_ARM.x
      const desc = this.R.ColliderDesc.cylinder((GUEST_ARM.high - GUEST_ARM.low) / 2, GUEST_ARM.r * FIXTURE_PROUD).setTranslation(
        x * Math.cos(turn) + GUEST_ARM.z * Math.sin(turn),
        middle,
        -x * Math.sin(turn) + GUEST_ARM.z * Math.cos(turn),
      )
      this.world.createCollider(this.wood(desc), body)
    }
    this.guests.add(body)
    this.tops.set(key, { circle: { ...at, r: GUEST_RADIUS }, height, over: GUEST_REACH / UNIT })
  }

  removeFixture(key: string): void {
    const body = this.fixtures.get(key)
    if (body) {
      this.world.removeRigidBody(body)
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
      const t = pan.translation()
      const hung = toWorld2(t)
      if (Math.hypot(at.x - hung.x, at.y - hung.y) * UNIT < rim.out + reach) top = Math.max(top, t.y + rim.knots)
    })
    return top
  }

  /** The little house stands solid over its drawn walls and shut door (HOUSE_FOOTPRINT), as far into the table as above it. */
  private addHouse(): void {
    this.removeFixture('house')
    const at = to3(DOOR.house)
    const s = DOOR.houseScale
    const body = this.fixed(at.x, 0, at.z)
    for (const box of HOUSE_FOOTPRINT) {
      const desc = this.R.ColliderDesc.cuboid(((box.right - box.left) * s) / 2, HOUSE_TOP, ((box.front - box.back) * s) / 2).setTranslation(((box.right + box.left) * s) / 2, 0, ((box.front + box.back) * s) / 2)
      this.world.createCollider(this.wood(desc), body)
    }
    this.fixtures.set('house', body)
    this.tops.set('house', { circle: { ...DOOR.house, r: HOUSE_REACH }, height: HOUSE_TOP })
  }

  addBag(): void {
    this.setFixture('bag', { x: BAG.x, y: BAG.y + 10, r: 72 }, 14)
  }

  private loose(at: Vec3, options: { velocity?: Vec3; spin?: number; yaw?: number }, lossPerSecond: number, spinLossPerSecond: number): RigidBody {
    const desc = this.R.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z)
      .setLinearDamping(damping(lossPerSecond))
      .setAngularDamping(damping(spinLossPerSecond))
      .setCcdEnabled(true)
      .setSoftCcdPrediction(SOFT_CCD)
      .setCanSleep(true)
    if (options.yaw) desc.setRotation(new Quat().setFromAxisAngle({ x: 0, y: 1, z: 0 }, options.yaw))
    if (options.velocity) desc.setLinvel(options.velocity.x, options.velocity.y, options.velocity.z)
    if (options.spin) desc.setAngvel({ x: 0, y: options.spin, z: 0 })
    return this.world.createRigidBody(desc)
  }

  private stoneSurface(desc: ColliderDesc): ColliderDesc {
    return desc.setFriction(STONE_SURFACE.friction).setRestitution(STONE_SURFACE.restitution).setMass(0).setActiveEvents(this.R.ActiveEvents.COLLISION_EVENTS)
  }

  /**
   * A loose body weighs `mass` at its own origin (the drawn piece's middle),
   * turning as a box as big as `points` reach would: where its weight lies
   * decides whether a stone tipped up on its rim falls flat or stands.
   */
  private weigh(rigid: RigidBody, mass: number, points: readonly Vec3[]): void {
    const low = { x: Infinity, y: Infinity, z: Infinity }
    const high = { x: -Infinity, y: -Infinity, z: -Infinity }
    for (const p of points) {
      for (const axis of ['x', 'y', 'z'] as const) {
        low[axis] = Math.min(low[axis], p[axis])
        high[axis] = Math.max(high[axis], p[axis])
      }
    }
    const [x, y, z] = [high.x - low.x, high.y - low.y, high.z - low.z]
    rigid.setAdditionalMassProperties(mass, { x: 0, y: 0, z: 0 }, { x: (mass * (y * y + z * z)) / 12, y: (mass * (x * x + z * z)) / 12, z: (mass * (x * x + y * y)) / 12 }, { x: 0, y: 0, z: 0, w: 1 }, true)
  }

  private enter(id: number, rigid: RigidBody, q: Quarters, reach: number): TableBody {
    const body = new TableBody(rigid, reach, (woken) => this.wake(woken))
    this.stones.set(id, { body, q })
    this.byRigid.set(rigid.handle, body)
    this.calm.set(body, { calm: 0, awake: 0, asleep: 0 })
    return body
  }

  addStone(id: number, q: Quarters, at: Point, options: { y?: number; velocity?: Vec3; spin?: number } = {}): void {
    this.removeStone(id)
    const rigid = this.loose(to3(at, options.y ?? stoneRest(q)), options, 0.35, 0.75)
    const pieces = stonePieces(q)
    for (const points of pieces) this.world.createCollider(this.stoneSurface(this.R.ColliderDesc.convexHull(flat(points))!), rigid)
    const points = pieces.flat()
    this.weigh(rigid, q, points)
    this.enter(id, rigid, q, Math.max(...points.map((p) => p.length())))
  }

  /** A loose part (acorn, shell, stick, boulder) with its own shape and weight; it moves, holds, and falls like a stone. */
  addPart(id: number, kind: PartKind, at: Point, options: { y?: number; velocity?: Vec3; spin?: number; yaw?: number } = {}): void {
    this.removeStone(id)
    const { mass, damping: loss } = PART_BODY[kind]
    const rigid = this.loose(to3(at, options.y ?? partRest(kind)), options, loss, 0.9)
    const collider = partCollider(kind)
    const bounds: Vec3[] = []
    let reach = 0
    if (collider.prism) {
      for (const points of prismPieces(outlineCorners(collider.prism.reach), collider.prism.bottom, collider.prism.top)) {
        this.world.createCollider(this.stoneSurface(this.R.ColliderDesc.convexHull(flat(points))!), rigid)
        reach = Math.max(reach, ...points.map((p) => p.length()))
        bounds.push(...points)
      }
    }
    for (const ball of collider.balls) {
      this.world.createCollider(this.stoneSurface(this.R.ColliderDesc.ball(ball.r).setTranslation(ball.x, ball.y, ball.z)), rigid)
      reach = Math.max(reach, Math.hypot(ball.x, ball.y, ball.z) + ball.r)
      bounds.push({ x: ball.x - ball.r, y: ball.y - ball.r, z: ball.z - ball.r }, { x: ball.x + ball.r, y: ball.y + ball.r, z: ball.z + ball.r })
    }
    this.weigh(rigid, mass, bounds)
    this.enter(id, rigid, 4, reach)
  }

  removeStone(id: number): void {
    const entry = this.stones.get(id)
    if (!entry) return
    const { rigid } = entry.body
    this.targets.delete(rigid)
    this.calm.delete(entry.body)
    this.byRigid.delete(rigid.handle)
    this.before.delete(rigid.handle)
    this.world.removeRigidBody(rigid)
    this.stones.delete(id)
    this.touchedGuest.delete(id)
    this.sleptAt.delete(id)
  }

  hasStone(id: number): boolean {
    return this.stones.has(id)
  }

  stoneIds(): number[] {
    return [...this.stones.keys()]
  }

  body(id: number): TableBody | undefined {
    return this.stones.get(id)?.body
  }

  /** Every stone and part as it lies (position, then quaternion), in the order they were added. */
  poses(): number[] {
    return [...this.stones.values()].flatMap(({ body }) => [...body.position.toArray(), ...body.quaternion.toArray()])
  }

  /** Whether a stone has come to rest and been put to sleep. */
  asleep(id: number): boolean {
    return this.body(id)?.asleep ?? false
  }

  /** Whether a stone touched a seated guest as it came to rest: asleep, it leans on the guest. */
  leansOnGuest(id: number): boolean {
    const body = this.body(id)
    const [touched, slept] = [this.touchedGuest.get(id), this.sleptAt.get(id)]
    return body !== undefined && body.asleep && touched !== undefined && slept !== undefined && touched >= slept - LEAN_WINDOW
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

  /** Every collider of a body meets everything, or (held) nothing. */
  private meet(rigid: RigidBody, groups: number): void {
    for (let i = 0; i < rigid.numColliders(); i++) rigid.collider(i).setCollisionGroups(groups)
  }

  /** Lift a stone into the child's fingers: it follows the finger and lies level, and meets nothing while held. */
  hold(id: number): void {
    const body = this.body(id)
    if (!body) return
    const { rigid } = body
    rigid.setBodyType(this.R.RigidBodyType.KinematicPositionBased, true)
    this.meet(rigid, MEETS_NOTHING)
    rigid.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rigid.setAngvel({ x: 0, y: 0, z: 0 }, true)
    rigid.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.held = true
    body.sync()
  }

  /** Follow the finger with a little lag, which reads as weight; `follow` is the fraction closed per call. */
  moveHeld(id: number, at: Point, height = HOLD_HEIGHT, follow = 1): void {
    const body = this.body(id)
    if (!body) return
    const goal = to3(at, height)
    const from = this.targets.get(body.rigid) ?? body.position
    this.targets.set(body.rigid, {
      x: from.x + (goal.x - from.x) * follow,
      y: from.y + (goal.y - from.y) * follow,
      z: from.z + (goal.z - from.z) * follow,
    })
  }

  /** Let go: the stone drops from where it is, carrying the finger's flick. */
  release(id: number, velocity: Point): void {
    const body = this.body(id)
    if (!body) return
    const { rigid } = body
    this.targets.delete(rigid)
    rigid.setBodyType(this.R.RigidBodyType.Dynamic, true)
    this.meet(rigid, MEETS_ALL)
    rigid.setLinvel({ x: velocity.x * UNIT, y: 0, z: velocity.y * UNIT }, true)
    rigid.setAngvel({ x: velocity.y * UNIT * 0.05, y: 0, z: -velocity.x * UNIT * 0.05 }, true)
    body.held = false
    body.sync()
  }

  /**
   * A sweeping finger: a low cylinder dragged across the table top. It
   * reaches as deep into the table as above it, so a stone it meets is
   * pushed along or lifted over it, never down through the table.
   */
  setBroom(pointerId: number, at: Point | null): void {
    let body = this.brooms.get(pointerId)
    if (!at) {
      if (body) {
        this.world.removeRigidBody(body)
        this.targets.delete(body)
      }
      this.brooms.delete(pointerId)
      return
    }
    if (!body) {
      const start = to3(at)
      body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, start.y, start.z))
      this.world.createCollider(this.wood(this.R.ColliderDesc.cylinder(BROOM_TOP, 4.2)), body)
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
    const up = new V3()
    const q = new Quat()
    for (const { body } of this.stones.values()) {
      const rigid = body.rigid
      if (body.held || rigid.isSleeping()) continue
      q.copy(rigid.rotation())
      q.vmult({ x: 0, y: 1, z: 0 }, up)
      const onRim = 1 - Math.abs(up.y)
      if (onRim < 0.25 || rigid.translation().y > 6) continue
      const keep = 1 - onRim * 0.15
      const [v, w] = [rigid.linvel(), rigid.angvel()]
      rigid.setAngvel({ x: w.x * keep, y: w.y, z: w.z * keep }, false)
      rigid.setLinvel({ x: v.x * (1 - onRim * 0.08), y: v.y, z: v.z * (1 - onRim * 0.08) }, false)
    }
  }

  /**
   * Loose bodies calm for a while are put to sleep: a pile can nudge itself
   * just above Rapier's own sleep limit for a long time. Only a whole group
   * of touching bodies sleeps at once, and only when nothing awake touches
   * it: one body put to sleep while something touching it is awake is left
   * out of its neighbours' contacts, and it sinks or floats where it lies.
   */
  private settleLoose(): void {
    const calm = new Set<TableBody>()
    for (const [body, timer] of this.calm) {
      const rigid = body.rigid
      if (body.held || rigid.isSleeping()) {
        timer.asleep += STEP
        if (timer.asleep >= LOOSE_CALM_SECONDS) timer.awake = 0
        continue
      }
      timer.asleep = 0
      timer.awake += STEP
      const limit = timer.awake < LOOSE_RESTLESS_SECONDS ? LOOSE_CALM_SPEED : LOOSE_RESTLESS_SPEED
      const [v, w] = [rigid.linvel(), rigid.angvel()]
      const speedSquared = v.x * v.x + v.y * v.y + v.z * v.z + w.x * w.x + w.y * w.y + w.z * w.z
      timer.calm = speedSquared < limit ** 2 ? timer.calm + STEP : 0
      if (timer.calm >= LOOSE_CALM_SECONDS) calm.add(body)
    }
    const grouped = new Set<TableBody>()
    for (const first of calm) {
      if (grouped.has(first)) continue
      grouped.add(first)
      const group = [first]
      let restless = false
      for (let k = 0; k < group.length; k++) {
        this.touching(group[k], (other) => {
          if (other === 'kinematic') {
            restless = true
            return
          }
          if (other.held || other.rigid.isSleeping() || grouped.has(other)) return
          if (!calm.has(other)) {
            restless = true
            return
          }
          grouped.add(other)
          group.push(other)
        })
      }
      if (restless) continue
      for (const body of group) {
        this.calm.get(body)!.calm = 0
        body.rigid.sleep()
      }
    }
  }

  /**
   * Wakes `body` and every sleeping body it lies against, and every one they
   * lie against, and so on: waking one body of a pile put to sleep together
   * leaves the rest asleep but moved with it, never meeting what they lie on.
   */
  private wake(body: TableBody): void {
    const woken = [body]
    const seen = new Set(woken)
    for (let k = 0; k < woken.length; k++) {
      const next = woken[k]
      next.rigid.wakeUp()
      next.asleep = false
      this.touching(next, (other) => {
        if (other === 'kinematic' || seen.has(other) || !other.rigid.isSleeping()) return
        seen.add(other)
        woken.push(other)
      })
    }
  }

  /**
   * Calls `visit` with every stone and part near enough `body` to have a
   * contact pair with it, touching or not (everything Rapier may count as in
   * its island), and with 'kinematic' for each pan or sweeping finger still
   * awake from moving: Rapier moves what it touches with it, asleep or not.
   */
  private touching(body: TableBody, visit: (other: TableBody | 'kinematic') => void): void {
    const rigid = body.rigid
    for (let i = 0; i < rigid.numColliders(); i++) {
      this.world.contactPairsWith(rigid.collider(i), (other) => {
        const parent = other.parent()
        if (!parent) return
        const neighbour = this.byRigid.get(parent.handle)
        if (neighbour) {
          if (neighbour !== body) visit(neighbour)
        } else if (parent.isKinematic() && !parent.isSleeping()) visit('kinematic')
      })
    }
  }

  /**
   * A body still asleep that Rapier moved anyway (part of its island woke,
   * so it falls without meeting what it lies on) is put back where it lay,
   * and it and everything it lies against are woken to meet it next step.
   */
  private keepSleepersStill(): void {
    for (const { body } of this.stones.values()) {
      const rigid = body.rigid
      if (!body.asleep || body.held || !rigid.isSleeping()) continue
      const p = rigid.translation()
      if (p.x === body.position.x && p.y === body.position.y && p.z === body.position.z) continue
      rigid.setTranslation(body.position, false)
      rigid.setRotation(body.quaternion, false)
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, false)
      rigid.setAngvel({ x: 0, y: 0, z: 0 }, false)
      this.wake(body)
    }
  }

  /** The speed of every contact that began this step, from how fast its bodies were closing before it. */
  private noteImpacts(): void {
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      const [c1, c2] = [this.world.getCollider(h1), this.world.getCollider(h2)]
      const [b1, b2] = [c1?.parent(), c2?.parent()]
      if (!c1 || !c2 || !b1 || !b2) return
      const [v1, v2] = [this.before.get(b1.handle), this.before.get(b2.handle)]
      if (!v1 && !v2) return
      let speed = 0
      this.world.contactPair(c1, c2, (manifold, flipped) => {
        const n = manifold.normal()
        const dir = flipped ? -1 : 1
        const [ax, ay, az] = v1 ? [v1.x, v1.y, v1.z] : [0, 0, 0]
        const [bx, by, bz] = v2 ? [v2.x, v2.y, v2.z] : [0, 0, 0]
        speed = Math.max(speed, Math.abs(((ax - bx) * n.x + (ay - by) * n.y + (az - bz) * n.z) * dir))
      })
      if (speed > IMPACT_HEARD) this.impacts.push(speed)
    })
  }

  /** Notes when stones touch a seated guest: a stone resting against one touches it only now and then as it settles. */
  private noteLeaning(): void {
    if (this.guests.size === 0) {
      this.touchedGuest.clear()
      return
    }
    for (const guest of this.guests) {
      for (let i = 0; i < guest.numColliders(); i++) {
        const collider = guest.collider(i)
        this.world.contactPairsWith(collider, (other) => {
          const body = other.parent() && this.byRigid.get(other.parent()!.handle)
          if (!body) return
          let touching = false
          this.world.contactPair(collider, other, (manifold) => {
            if (manifold.numSolverContacts() > 0) touching = true
          })
          if (!touching) return
          for (const [id, entry] of this.stones) if (entry.body === body) this.touchedGuest.set(id, this.time)
        })
      }
    }
  }

  private sync(): void {
    for (const [id, { body }] of this.stones) {
      const was = body.asleep
      body.sync()
      if (body.asleep && !was) this.sleptAt.set(id, this.time)
    }
  }

  step(elapsed: number): StepReport {
    const slow = elapsed > SLOW_FRAME + STEP_SLACK * STEP
    this.accumulator = Math.min(this.accumulator + elapsed, slow ? SLOW_FRAME_STEPS * STEP : LONGEST_FRAME)
    const substeps = Math.floor(this.accumulator / STEP + STEP_SLACK)
    this.accumulator = Math.max(0, this.accumulator - substeps * STEP)
    for (let left = substeps; left > 0; left--) {
      // What follows a target gets there evenly over this frame's steps, not in a jump and a stop.
      for (const [rigid, target] of this.targets) {
        const p = rigid.translation()
        const [dx, dy, dz] = [target.x - p.x, target.y - p.y, target.z - p.z]
        // One already there (to Rapier's single precision) is left still, so what rests on it can fall asleep.
        if (dx * dx + dy * dy + dz * dz > 1e-8) rigid.setNextKinematicTranslation({ x: p.x + dx / left, y: p.y + dy / left, z: p.z + dz / left })
      }
      this.before.clear()
      for (const { body } of this.stones.values()) if (!body.rigid.isSleeping()) this.before.set(body.rigid.handle, new V3().copy(body.rigid.linvel()))
      this.world.step(this.events)
      this.time += STEP
      this.steps += 1
      this.keepSleepersStill()
      this.noteImpacts()
      this.noteLeaning()
      this.resistRolling()
      this.settleLoose()
      this.sync()
    }
    const fallen: number[] = []
    let moving = false
    for (const [id, { body }] of this.stones) {
      if (body.held) continue
      if (body.position.y < FALL_LIMIT) fallen.push(id)
      else if (!body.asleep && body.velocity.length() > 1.5) moving = true
    }
    const impacts = this.impacts
    this.impacts = []
    return { fallen, impacts, moving }
  }

  /**
   * How far (cm) each of `bodies` lies sunk into the stones and parts it
   * touches, as the way out along the contacts' normals: one landing fast can
   * end a step a little inside what it lands on, and its contacts push it out
   * over the next few. Found afresh from where the bodies lie now.
   */
  sunk(bodies: ReadonlySet<TableBody>): Map<TableBody, V3> {
    const out = new Map<TableBody, V3>()
    if (bodies.size === 0) return out
    // Bodies placed by hand since the last step are where they now lie.
    this.world.propagateModifiedBodyPositionsToColliders()
    const pairs = new Map<string, SunkPair>()
    const sunk: SunkContact[] = []
    for (const body of bodies) {
      if (body.held) continue
      const rigid = body.rigid
      for (const { body: neighbour } of this.stones.values()) {
        if (neighbour === body || neighbour.held || (bodies.has(neighbour) && neighbour.rigid.handle < rigid.handle)) continue
        const reach = body.boundingRadius + neighbour.boundingRadius + SUNK_PREDICTION
        if (body.position.distanceSquared(neighbour.position) > reach * reach) continue
        const key = `${rigid.handle} ${neighbour.rigid.handle}`
        const pair = this.sunkPair(this.sunkPairs.get(key), body, neighbour)
        pairs.set(key, pair)
        for (const contact of pair.found) {
          sunk.push(contact)
          for (const touched of [contact.bi, contact.bj]) if (bodies.has(touched) && !out.has(touched)) out.set(touched, new V3())
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
  private sunkPair(last: SunkPair | undefined, body: TableBody, other: TableBody): SunkPair {
    if (last && samePose(last.pose, 0, body) && samePose(last.pose, 7, other)) return last
    const pose = [body, other].flatMap(({ position: p, quaternion: q }) => [p.x, p.y, p.z, q.x, q.y, q.z, q.w])
    const found: SunkContact[] = []
    for (let i = 0; i < body.rigid.numColliders(); i++) {
      const mine: Collider = body.rigid.collider(i)
      for (let j = 0; j < other.rigid.numColliders(); j++) {
        const hit = mine.contactCollider(other.rigid.collider(j), SUNK_PREDICTION, this.contact)
        if (!hit || hit.distance >= 0) continue
        found.push({ bi: body, bj: other, ni: new V3(hit.normal1.x, hit.normal1.y, hit.normal1.z), depth: -hit.distance })
      }
    }
    return { pose, found }
  }
}

/** Whether `pose` (position, then quaternion) from `at` on is where a body lies now. */
function samePose(pose: readonly number[], at: number, body: TableBody): boolean {
  const { position: p, quaternion: q } = body
  return pose[at] === p.x && pose[at + 1] === p.y && pose[at + 2] === p.z && pose[at + 3] === q.x && pose[at + 4] === q.y && pose[at + 5] === q.z && pose[at + 6] === q.w
}
