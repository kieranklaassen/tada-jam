// One yard as three.js draws it: its far fence and gate, the things that stand
// in it, the animals, the steam and the ripples. It decides nothing. The game
// says what stands where (world.ts, places.ts) and how everything is posed
// (yardMotion.ts), and this module copies that onto models that are built
// once. The stage keeps two of these, so that on the way to the next yard the
// one being left can slide away while the next slides in.

import * as THREE from 'three'
import { PETAL_COUNT, flowerOf, leafDrop, petalOpen } from './flower'
import { FENCE_Z } from './gardenModel'
import { BELL, GATE, PEEK_X, SPOTS, TRUCK, type Place } from './layout'
import { FLOWER_PAINT, SAND, THINGS_PAINT, WATER } from './look'
import { BOAT, PATCH, WHEEL, buildBee, buildBoat, buildPatch, buildSnail, buildWheel, buildWorm } from './moreModels'
import { NEST, lowSideOf, placeOf } from './places'
import type { Channels } from './scenes'
import { DAMP_STEPS, LEAF_TIP, PETAL, POOL, POT, SCALE, buildCat, buildDuck, buildFire, buildGate, buildPool, buildPot } from './thingModels'
import { BOAT_HEADS } from './thingMotion'
import type { Kind } from './things'
import { afloat, type Yard } from './world'
import { PUFFS, RINGS, type YardMotion } from './yardMotion'

/** A ball round something tall, so a finger on its picture counts as on it. */
export type Proxy = { readonly ball: THREE.Sphere; to: Place }

export type Materials = { plastic: THREE.Material; glow: THREE.Material; water: THREE.Material }

const MAX_SHADOWS = 12
const dryPatch = new THREE.Color(THINGS_PAINT.patch), dampSand = new THREE.Color(SAND.damp), mudSand = new THREE.Color(SAND.mud)
const drySoil = new THREE.Color(THINGS_PAINT.soilDry), wetSoil = new THREE.Color(THINGS_PAINT.soil)

export class YardSet {
  readonly root = new THREE.Group()
  /** What a finger can land on above the ground in this yard: the first `proxyCount` of these. */
  readonly proxies: Proxy[] = Array.from({ length: 8 }, () => ({ ball: new THREE.Sphere(new THREE.Vector3(), 1), to: { x: 0, z: 0 } }))
  proxyCount = 0
  private readonly gate
  private readonly fire
  private readonly pool
  private readonly duck
  private readonly pot
  private readonly bee
  private readonly patch
  private readonly snail
  private readonly boat
  private readonly wheel
  private readonly cat
  private readonly worm
  private readonly steam: THREE.InstancedMesh
  private readonly rings: THREE.InstancedMesh
  private readonly shadows: THREE.InstancedMesh
  private readonly peeks: Record<'fire' | 'pool' | 'seed' | 'patch', THREE.Object3D>
  private readonly own: THREE.Material[] = []
  private readonly matrix = new THREE.Matrix4()
  private readonly flat = new THREE.Quaternion()
  private readonly size = new THREE.Vector3()
  private readonly spot = new THREE.Vector3()
  private readonly turn = new THREE.Quaternion()
  private readonly upright = new THREE.Vector3(0, 1, 0)
  private readonly colour = new THREE.Color()
  private shadowCount = 0
  private flowerShown = -1

  constructor(name: string, farSide: THREE.BufferGeometry, materials: Materials, shadow: THREE.Material, shadowPlane: THREE.BufferGeometry) {
    const { plastic, glow, water } = materials
    this.root.name = name
    const fence = new THREE.Mesh(farSide, plastic)
    fence.name = 'far-side'
    this.root.add(fence)

    this.gate = buildGate(plastic, GATE.half, BELL.x - (GATE.x + GATE.half), BELL.z - GATE.z)
    this.gate.root.position.set(GATE.x, 0, GATE.z)
    this.fire = buildFire(plastic, glow)
    this.pool = buildPool(plastic, water)
    this.duck = buildDuck(plastic)
    this.pot = buildPot(plastic, water)
    this.bee = buildBee(plastic)
    this.patch = buildPatch(water)
    this.snail = buildSnail(plastic)
    this.boat = buildBoat(plastic, water)
    this.wheel = buildWheel(plastic)
    this.cat = buildCat(plastic)
    this.worm = buildWorm(plastic)
    this.fire.root.scale.setScalar(SCALE.fire)
    // The flames wobble about their own upright first and lean after, so the lean keeps its direction.
    this.fire.flames.rotation.order = 'ZXY'
    this.pool.root.scale.setScalar(SCALE.pool)
    this.duck.scale.setScalar(SCALE.duck)
    this.pot.root.scale.setScalar(SCALE.seed)
    this.bee.root.scale.setScalar(SCALE.bee)
    this.snail.root.scale.setScalar(SCALE.snail)
    this.boat.root.scale.setScalar(SCALE.boat)
    // It heads first and then rolls, so it rolls about its own keel.
    this.boat.root.rotation.order = 'YXZ'
    this.wheel.root.scale.setScalar(SCALE.wheel)
    this.worm.root.scale.setScalar(SCALE.worm)
    // She heads first and then rocks, so she rocks about the way she faces.
    this.cat.root.rotation.order = 'YXZ'
    this.root.add(this.gate.root, this.fire.root, this.pool.root, this.duck, this.pot.root, this.bee.root, this.patch.root, this.snail.root, this.boat.root, this.wheel.root, this.cat.root, this.worm.root)
    this.own.push(this.patch.mound.material as THREE.Material, this.pot.soil.material as THREE.Material, this.pool.wall.material as THREE.Material)
    // For the intersection audit: the petals, which are instances of one ball, are parts of the plant like its stem and leaves.
    this.pot.root.userData.jamObject = `${name}-seed`
    this.pot.petals.userData.jamInstanceObjects = Array.from({ length: PETAL_COUNT + 1 }, () => `${name}-seed`)

    // What waits beyond the fence, beside the gate: a wisp of smoke, a duck, a bee or a snail's shell.
    const smoke = new THREE.Group()
    smoke.name = 'peek-smoke'
    const puffPaint = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0.85, depthWrite: false })
    this.own.push(puffPaint)
    const puffBall = new THREE.IcosahedronGeometry(1, 1)
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(puffBall, puffPaint)
      puff.name = `peek-puff-${i}`
      smoke.add(puff)
    }
    const peekDuck = buildDuck(plastic)
    peekDuck.name = 'peek-duck'
    peekDuck.scale.setScalar(SCALE.duck)
    const peekBee = buildBee(plastic).root
    peekBee.name = 'peek-bee'
    peekBee.scale.setScalar(SCALE.bee)
    const peekSnail = buildSnail(plastic).root
    peekSnail.name = 'peek-snail'
    peekSnail.scale.setScalar(SCALE.snail)
    this.peeks = { fire: smoke, pool: peekDuck, seed: peekBee, patch: peekSnail }
    for (const peek of Object.values(this.peeks)) this.root.add(peek)

    this.steam = new THREE.InstancedMesh(puffBall, puffPaint, PUFFS)
    this.steam.name = 'steam'
    this.rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: WATER.light, transparent: true, opacity: 0.7, depthWrite: false }), RINGS)
    this.rings.name = 'ripples'
    this.own.push(this.rings.material as THREE.Material)
    this.shadows = new THREE.InstancedMesh(shadowPlane, shadow, MAX_SHADOWS)
    this.shadows.name = 'shadows'
    this.shadows.renderOrder = 1
    for (const instanced of [this.steam, this.rings, this.shadows]) {
      instanced.count = 0
      instanced.frustumCulled = false
      this.root.add(instanced)
    }
    this.steam.renderOrder = 2
    this.rings.renderOrder = 2
  }

  /** Shows the yard: what stands in it, where, and how each thing is posed. `peek` is the kind that waits beyond the gate, or null. */
  show(yard: Yard, motion: YardMotion, channels: Channels, wormAt: Place | null, peek: Kind | null): void {
    this.proxyCount = 0
    this.shadowCount = 0
    const has = motion.has
    const thing = (kind: Kind) => (has[kind] >= 0 ? yard.things[has[kind]] : undefined)
    const at = (kind: Kind) => placeOf(yard, has[kind])
    const time = motion.time

    // The gate, its latch and its bell.
    this.gate.leaf.rotation.y = channels.gate * 1.95
    this.gate.latch.rotation.z = -motion.bell.latch * 1.25
    this.gate.bell.rotation.z = motion.bell.swing
    this.gate.bell.rotation.x = motion.bell.swing * 0.6
    this.shadow(BELL, 0.5)
    this.proxy(BELL.x, 1.3, BELL.z, 0.85, BELL)

    const fire = thing('fire')
    this.fire.root.visible = fire !== undefined
    if (fire) {
      const pose = motion.fire.pose, place = at('fire')
      this.fire.root.position.set(place.x, 0, place.z)
      const flames = this.fire.flames
      flames.visible = pose.flame > 0.02
      const lick = 1 + Math.sin(pose.flicker * 6.3) * 0.09 + Math.sin(pose.flicker * 13.7) * 0.04 + pose.spit * 0.35
      const wide = (0.5 + 0.5 * pose.flame) * (1 + pose.flat * 0.5) * (1 + Math.sin(pose.flicker * 9.1) * 0.05)
      flames.scale.set(wide, Math.max(0.05, pose.flame * (1 - pose.flat * 0.85) * lick), wide)
      // It leans away from the stream, which comes from the truck: its top tips the way the water flies.
      const far = Math.max(0.001, Math.hypot(place.x - TRUCK.x, place.z - TRUCK.z))
      flames.rotation.z = (-pose.lean * (place.x - TRUCK.x)) / far
      flames.rotation.x = (pose.lean * (place.z - TRUCK.z)) / far
      flames.rotation.y = Math.sin(pose.flicker * 2.2) * 0.5
      this.fire.dryLogs.visible = !pose.wet
      this.fire.wetLogs.visible = pose.wet
      this.fire.logs.position.set(pose.logsX, pose.logsY, pose.logsZ)
      this.fire.logs.rotation.y = pose.logsTurn
      this.shadow(place, 1.35)
      this.proxy(place.x, 0.8, place.z, 1.0, place)
    }

    const pool = thing('pool')
    this.pool.root.visible = this.duck.visible = pool !== undefined
    let waterY = 0
    if (pool) {
      const pose = motion.pool.pose, place = at('pool')
      this.pool.root.position.set(place.x, 0, place.z)
      // The low side of its rim points where it will run over.
      this.pool.root.rotation.y = lowSideOf(yard, has.pool)
      this.pool.root.scale.set(SCALE.pool, SCALE.pool * (1 - pose.bonk * 0.02), SCALE.pool)
      const inside = POOL.floor + 0.03 + pose.level * (POOL.wall - POOL.floor - 0.05)
      this.pool.sheet.visible = pose.level > 0.02
      this.pool.sheet.position.y = inside
      this.pool.sheet.rotation.z = pose.slosh * 0.012
      this.pool.sheet.scale.setScalar(pose.level > 1 ? 1.06 : 1)
      // Water crosses the low side of the rim as the pool runs over.
      this.pool.spill.visible = pose.spill > 0.05
      this.pool.spill.scale.set(1, 1, Math.max(0.05, pose.spill))
      waterY = inside * SCALE.pool
      this.shadow(place, 1.8)
      const duck = motion.duck.pose
      const floor = POOL.floor * SCALE.pool
      // The duck's height is its own: on the floor, on the water, or over the rim and onto the sand.
      this.duck.position.set(place.x + NEST.duckInPool.x + duck.x, floor + 0.02 + duck.y - (duck.y > 0.03 && duck.z < 0.9 ? 0.1 : 0), place.z + NEST.duckInPool.z + duck.z)
      this.duck.rotation.set(duck.wiggle, -duck.turn, -duck.tilt)
      let count = 0
      for (const ring of motion.ripples.rings) {
        if (!ring.alive || ring.radius <= 0) continue
        this.matrix.makeScale(ring.radius, 1, ring.radius).setPosition(place.x + ring.x, Math.max(floor, waterY) + 0.03, place.z + ring.z)
        this.rings.setMatrixAt(count++, this.matrix)
      }
      this.rings.count = count
      this.rings.instanceMatrix.needsUpdate = true
    } else this.rings.count = 0

    const seed = thing('seed')
    this.pot.root.visible = this.bee.root.visible = seed !== undefined
    if (seed) {
      const pose = motion.seed.pose, place = at('seed')
      this.pot.root.position.set(place.x, 0, place.z)
      ;(this.pot.soil.material as THREE.MeshLambertMaterial).color.copy(drySoil).lerp(wetSoil, pose.soil)
      const sway = pose.flutter * 0.06 + Math.sin(time * 1.1) * 0.03
      const grown = 0.3 + 0.7 * pose.leaves
      this.pot.shoot.visible = pose.shoot > 0.02
      this.pot.shoot.scale.set(1, Math.max(0.02, pose.shoot * grown * (1 + pose.pop * 0.03)), 1)
      this.pot.shoot.rotation.z = sway
      this.pot.leaves.visible = pose.leaves > 0.03
      this.pot.leaves.scale.setScalar(Math.max(0.03, pose.leaves))
      this.pot.leaves.rotation.z = sway * 1.5
      const top = POT.soil + POT.stem * pose.shoot * grown
      this.pot.bud.visible = pose.bud > 0.05 && pose.flower < 0.25
      this.pot.bud.scale.setScalar(Math.max(0.05, pose.bud))
      this.pot.bud.position.y = top - POT.stem * Math.max(0.05, pose.bud)
      // Where the seed holds the want, the flower opens petal by petal as the ending plays.
      const open = has.seed === yard.want ? Math.max(channels.petals, yard.met ? 0 : 1) : 1
      this.pot.flower.visible = pose.flower > 0.05
      this.pot.flower.position.y = top + 0.06
      this.pot.flower.scale.setScalar(Math.max(0.05, pose.flower))
      this.petals(open, flowerOf(yard.place, yard.arrangement))
      this.pot.flower.rotation.z = sway + pose.nod * 1.2 - channels.beeLands * 0.14
      this.pot.saucerWater.visible = pose.saucer > 0.5
      // The dark that climbs the pot when it drinks from below.
      this.pot.damp.visible = pose.soak > 0.04
      this.pot.damp.geometry = this.pot.dampSteps[Math.min(DAMP_STEPS - 1, Math.floor(pose.soak * DAMP_STEPS))]
      // A drop hangs from a leaf's tip as the ending closes, lets go and falls.
      const drop = leafDrop(has.seed === yard.want ? channels.leafDrop : 0)
      this.pot.leafDrop.visible = drop.size > 0.05
      this.pot.leafDrop.position.set(LEAF_TIP.x, LEAF_TIP.y - 0.06 - drop.fallen * LEAF_TIP.fall, 0)
      this.pot.leafDrop.scale.setScalar(Math.max(0.05, drop.size))
      this.shadow(place, 1.2)
      this.proxy(place.x, 1.1, place.z, 0.95, place)
      const bee = motion.bee.pose
      this.bee.root.position.set(place.x + bee.x * SCALE.seed, (bee.y + bee.landed * 0.12) * SCALE.seed, place.z + bee.z * SCALE.seed)
      this.bee.root.rotation.y = -bee.turn
      this.bee.wings.rotation.x = Math.sin(time * 58) * 0.7 * bee.wings
    }

    const patch = thing('patch')
    this.patch.root.visible = this.snail.root.visible = patch !== undefined
    if (patch) {
      const pose = motion.patch.pose, place = at('patch')
      this.patch.root.position.set(place.x, 0, place.z)
      this.patch.root.scale.setScalar(SCALE.patch * (1 + pose.blot * 0.006))
      ;(this.patch.mound.material as THREE.MeshLambertMaterial).color.copy(dryPatch).lerp(dampSand, Math.max(pose.wet, pose.line * 0.6)).lerp(mudSand, pose.mud)
      this.patch.sheet.visible = pose.puddle > 0.05
      this.patch.sheet.scale.set(Math.max(0.05, pose.puddle), 1, Math.max(0.05, pose.puddle))
      const snail = motion.snail.pose
      this.snail.root.position.set(place.x + snail.x, PATCH.top * (Math.hypot(snail.x, snail.z) < PATCH.radius ? 1 : 0), place.z + snail.z)
      this.snail.root.rotation.y = -snail.turn
      const out = Math.max(snail.out, snail.feelers * 0.35)
      this.snail.body.visible = out > 0.03
      this.snail.body.scale.set(Math.max(0.05, out), 1, 1)
      this.snail.feelers.scale.set(1, Math.max(0.05, snail.feelers), 1)
      this.shadow({ x: place.x + snail.x, z: place.z + snail.z }, 0.55)
    }

    const boat = thing('boat')
    this.boat.root.visible = boat !== undefined
    let boatY = 0
    let boatAt: Place = SPOTS[0]
    if (boat) {
      const pose = motion.boat.pose, place = at('boat')
      const floats = afloat(yard, has.boat)
      const inPool = boat.in !== undefined
      // On the pool's floor until the water is deep enough; then on the water, lower the more it holds.
      // On sand it is lifted as it tips, so its ends never dig in.
      // In the pool it rests on the floor until the water is deep enough to carry it, and then rides lower the more it holds.
      const carried = waterY - 0.16 - pose.water * 0.08 + (floats ? pose.bob * 0.02 - pose.sunk * 0.2 : 0)
      // Not before: until the pool is deep enough it stands on the floor, however far the water has climbed its hull.
      boatY = inPool ? (floats ? Math.max(POOL.floor * SCALE.pool + 0.012, carried) : POOL.floor * SCALE.pool + 0.012) : 0.02 + Math.abs(pose.rock * 0.09 + pose.brim * 0.1) * 0.5
      boatAt = { x: place.x + pose.pushX + pose.carryX, z: place.z + pose.pushZ + pose.carryZ }
      // Rolling over, it comes up out of the water far enough that its rim never dips under the pool's floor.
      boatY += pose.carryY + (Math.abs(Math.sin(pose.roll)) * 0.4 + ((1 - Math.cos(pose.roll)) / 2) * 0.33) * SCALE.boat
      this.boat.root.position.set(boatAt.x, boatY, boatAt.z)
      this.boat.root.rotation.set(pose.roll, -BOAT_HEADS - pose.yaw, pose.rock * 0.09 + pose.brim * 0.1)
      this.boat.inside.visible = pose.water > 0.05
      this.boat.inside.position.y = BOAT.floor + 0.02 + pose.water * (BOAT.brim - BOAT.floor - 0.07)
      if (!inPool) this.shadow(boatAt, 0.95)
    }

    const wheel = thing('wheel')
    this.wheel.root.visible = wheel !== undefined
    if (wheel) {
      const pose = motion.wheel.pose, place = at('wheel')
      this.wheel.root.position.set(place.x + pose.shuffle, 0, place.z)
      this.wheel.wheel.rotation.z = -pose.angle
      this.shadow(place, 1.25)
      this.proxy(place.x, WHEEL.axle * SCALE.wheel, place.z, 1.1, place)
    }

    const cat = thing('cat')
    this.cat.root.visible = cat !== undefined
    if (cat) {
      const pose = motion.cat.pose
      const inBoat = cat.in !== undefined
      const onRoof = cat.spot === 'roof'
      // In the boat she rides on its floor; anywhere else her height is her own.
      const base = inBoat ? boatY + (BOAT.floor + 0.02) * SCALE.boat : 0
      const x = inBoat ? boatAt.x : pose.x, z = inBoat ? boatAt.z : pose.z
      const size = SCALE.cat * pose.size
      this.cat.root.position.set(x, base + pose.y, z)
      this.cat.root.rotation.y = -pose.turn + pose.shake
      this.cat.root.rotation.x = pose.lean
      const wide = 1 / Math.sqrt(Math.max(0.4, pose.squash))
      this.cat.root.scale.set(size * wide, size * pose.squash, size * wide)
      this.cat.head.rotation.set(0, -pose.headTurn, pose.headTilt - pose.ears * 0.12)
      this.cat.lids.visible = pose.eyesShut > 0.15
      this.cat.lids.scale.set(1, Math.max(0.15, pose.eyesShut), 1)
      // A bottle brush is fatter, so it is lifted to stay on the sand. Up, it swings up from its root on her near side.
      this.cat.tail.scale.set(1, 1 + pose.tail * 0.9, 1 + pose.tail * 0.5)
      this.cat.tail.position.y = 0.12 + pose.tail * 0.1
      this.cat.tail.rotation.x = -pose.tailUp * 1.0
      this.cat.paw.position.y = 0.07 + pose.paw * 0.28
      this.cat.pawFar.position.y = 0.07 + pose.pawFar * 0.28
      if (!inBoat && pose.y < 1.2) this.shadow({ x, z }, 1.05 * pose.size * (1 - Math.min(0.5, pose.y * 0.3)))
      if (!onRoof) this.proxy(x, base + 0.75 * size, z, inBoat ? 0.6 : 0.85, { x, z })
    }

    // The worm comes up where the mud is, looks about and goes down.
    const up = channels.wormUp * (1 - channels.wormDown)
    this.worm.root.visible = wormAt !== null && up > 0.02
    if (wormAt) {
      this.worm.root.position.set(wormAt.x, -0.85 * SCALE.worm * (1 - up), wormAt.z)
      this.worm.root.rotation.y = Math.sin(channels.wormLooks * Math.PI * 3) * 1.1 - 1.2
    }

    // Steam.
    let puffs = 0
    for (const puff of motion.steam.puffs) {
      if (!puff.alive || puff.age < 0 || puff.size <= 0.01) continue
      this.matrix.makeScale(puff.size, puff.size * 0.86, puff.size).setPosition(puff.x, puff.y, puff.z)
      this.steam.setMatrixAt(puffs++, this.matrix)
    }
    this.steam.count = puffs
    this.steam.instanceMatrix.needsUpdate = true

    this.peek(peek, time, motion.peek)
    this.shadows.count = this.shadowCount
    this.shadows.instanceMatrix.needsUpdate = true
  }

  /** What waits beyond the fence, to the right of the gate, alive and in no hurry. */
  private peek(kind: Kind | null, time: number, hop: number): void {
    const x = PEEK_X, z = FENCE_Z - 1.5
    for (const [of, model] of Object.entries(this.peeks)) model.visible = of === kind
    if (kind === 'fire') {
      this.peeks.fire.children.forEach((puff, i) => {
        const rise = (time * 0.35 + i / 3) % 1
        puff.position.set(x + Math.sin(rise * 5 + i) * 0.25, 0.5 + rise * 2.6 + hop, z - 0.4)
        puff.scale.setScalar(0.22 + rise * 0.38 * (1 - Math.max(0, rise - 0.7) / 0.3))
      })
    } else if (kind === 'pool') {
      this.peeks.pool.position.set(x, Math.abs(Math.sin(time * 1.7)) * 0.1 + hop, z)
      this.peeks.pool.rotation.y = -Math.PI / 2 + Math.sin(time * 0.8) * 0.5
    } else if (kind === 'seed') {
      this.peeks.seed.position.set(x + Math.cos(time * 2.3) * 0.7, 1.7 + Math.sin(time * 5.3) * 0.08 + hop * 1.5, z + Math.sin(time * 2.3) * 0.5)
      this.peeks.seed.rotation.y = -(time * 2.3 + Math.PI / 2)
    } else if (kind === 'patch') {
      // A shell on the gate's left post.
      this.peeks.patch.position.set(GATE.x - GATE.half, 2.33 + hop * 0.5, GATE.z)
      this.peeks.patch.rotation.y = -Math.PI / 2
    }
  }

  /** The flower's petals, each as far open as its turn has come, and its heart, in the colour of the arrangement. */
  private petals(open: number, colour: number): void {
    const petals = this.pot.petals
    for (let i = 0; i < PETAL_COUNT; i++) {
      const round = (i / PETAL_COUNT) * Math.PI * 2
      const by = petalOpen(open, i)
      // A shut petal is small and close in to the heart; it comes out to its place as it opens.
      this.matrix.compose(
        this.spot.set(Math.cos(round) * PETAL.ring * by, 0, Math.sin(round) * PETAL.ring * by),
        this.turn.setFromAxisAngle(this.upright, -round),
        this.size.set(PETAL.size[0] * by, PETAL.size[1], PETAL.size[2] * by),
      )
      petals.setMatrixAt(i, this.matrix)
    }
    this.matrix.compose(this.spot.set(0, PETAL.heartY, 0), this.flat, this.size.set(PETAL.heart[0], PETAL.heart[1], PETAL.heart[2]))
    petals.setMatrixAt(PETAL_COUNT, this.matrix)
    petals.instanceMatrix.needsUpdate = true
    if (colour !== this.flowerShown) {
      this.flowerShown = colour
      this.colour.set(FLOWER_PAINT[colour] ?? FLOWER_PAINT[0])
      for (let i = 0; i < PETAL_COUNT; i++) petals.setColorAt(i, this.colour)
      if (petals.instanceColor) petals.instanceColor.needsUpdate = true
    }
  }

  private shadow(at: Place, size: number): void {
    if (this.shadowCount >= MAX_SHADOWS) return
    this.matrix.compose(this.spot.set(at.x + size * 0.12, 0.02 + this.shadowCount * 0.0006, at.z + size * 0.1), this.flat, this.size.set(size, 1, size * 0.86))
    this.shadows.setMatrixAt(this.shadowCount++, this.matrix)
  }

  private proxy(x: number, y: number, z: number, radius: number, to: Place): void {
    const proxy = this.proxies[this.proxyCount]
    if (!proxy) return
    this.proxyCount++
    proxy.ball.center.set(x, y, z + this.root.position.z)
    proxy.ball.radius = radius
    proxy.to = to
  }

  dispose(): void {
    for (const step of this.pot.dampSteps) step.dispose()
    for (const material of this.own) material.dispose()
  }
}
