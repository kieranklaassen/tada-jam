import * as THREE from 'three'
import { POT, bowlOf, dishOf, surfaceOf } from './forms'
import { Guide, type Shown } from './guide'
import type { Guidance } from './guidance'
import { GATE, WAITING, type Hint } from './hint'
import type { Spot } from './layout'
import { Drops, Puddles, Ripples, Stream } from './liquid'
import type { ActionKind } from './motion'
import { GOLD, INK, TURN_SEGMENTS, cupGeometry, makeKit, merged, plain, poolGeometry, saucerGeometry, teaDiscGeometry, turn, type Kit } from './pieces'
import { liftOf, type Pot } from './pour'
import { CORNER } from './overlay'
import { SPOUT_TIP, WALL, clothMesh, gateMesh, looseTile, potGeometry, shadowBlobs, spongeGeometry, spoonGeometry, wallMesh } from './props'
import { SENT_EVERY, SENT_FIRST, TILE_SECONDS, anchorOf, sizeOfGuest, spoonRest, tileMotion, type PieceAct, type Stage } from './stage'
import { Troupe } from './troupe'
import { holds, thingById, type GuestId, type Thing, type World } from './world'

// The table as three.js draws it. It is given the model (the world's things,
// the pot, the guests) and shows it: where each piece stands, how high the
// tea is in each cup, the stream, the puddles, the guests. Springs and short
// motions live here because they are only looks: a piece that is nudged
// wobbles and settles, and the model never hears of it.

type Piece = {
  group: THREE.Group
  tea?: THREE.Mesh
  pool?: THREE.Mesh
  /** What the thing looked like when its meshes were built; a change rebuilds them. */
  key: string
  wobble: number
  speed: number
  height: number
  girth: number
  /** Where the model says it stands, and where it is on its way there: the piece eases from one to the other. */
  to: THREE.Vector3
  at: THREE.Vector3
  /** A short motion of its own that is playing: its name and how far along it is, 0 to 1. */
  act: { name: PieceAct; t: number; to?: { x: number; y: number; z: number } } | null
  /** Lifted toward a guest's mouth: who, how far and how tipped. */
  held: { who: GuestId; amount: number; tilt: number; toward: { x: number; y: number; z: number } | null } | null
  /** Which way a carried spoon's handle trails, and how far the sponge has gone since it last left a damp mark. */
  swing: number
  trailed: number
  /** The tea to draw in place of the world's, while a guest drinks. */
  showTea: number | null
  /** Upside down on a head, or lying on a nose. */
  turned: number
  /** How the head it is worn on is tipped and turned at this moment. */
  lean: { pitch: number; yaw: number; roll: number } | null
  /** How big it is drawn: smaller than life only in the paw of a guest that is still coming in. */
  small: number
  /** How far a walking guest has it in hand, 0 on its saucer to 1 over the guest's head. */
  carriedBy: number
  /** How far it leans after a finger that has not yet carried it off, and how its tea leans as it is carried. */
  tug: { x: number; z: number; toX: number; toZ: number }
  slosh: { x: number; z: number }
  /** How high it rides in the hand at this moment. */
  rise: number
  /** Seconds it still waits before it sets off, and the piece it waits for: things that are sent off together go one after another, each when the one before it is there, or when its wait is over. */
  wait: number
  after: Piece | null
  /** The thing it has come to rest on and now goes with, as that thing is drawn: carried, hopping or lifted to a mouth. */
  rides: string | null
  /** Where the model last put it, and what it then stood on. */
  goal: THREE.Vector3
  base: string | null
}

const ACT_SECONDS: Record<PieceAct, number> = { spin: 1.1, flip: 0.5, whirl: 0.9, flash: 0.35, rattle: 0.4, hop: 0.38, fish: 1.3, glint: 0.5, 'slide-in': 0.45, tip: 0.6, squirt: 0.3, skim: 0.6, stir: 1.2, toot: 1.2, arrive: 2.6 }
const CAMERA = { fov: 27, pitch: 0.8, lookAt: new THREE.Vector3(0, 0.75, 0.7), halfWidth: 6.75, halfDepth: 4.8 } as const

export class TableView implements Stage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 1, 80)
  readonly renderer: THREE.WebGLRenderer
  private readonly kit: Kit
  private readonly segments: number
  private readonly pieces = new Map<string, Piece>()
  private readonly troupe: Troupe
  private readonly shadows: THREE.InstancedMesh
  private readonly stream: Stream
  private readonly drops: Drops
  private readonly ripples = new Ripples()
  private readonly puddles = new Puddles()
  private readonly guide: Guide
  private readonly potRoot = new THREE.Group()
  private readonly potTilt = new THREE.Group()
  private readonly lid: THREE.Mesh
  private readonly fish: THREE.Mesh
  private readonly gate: THREE.Group
  private gateWobble = 0
  private gateSpeed = 0
  private fishTurn = 1
  private lidHop = 0
  /** Who sits where, as the game last said: a cup at a guest's place is that guest's to carry when it walks. */
  private seats: readonly { who: GuestId; seat: Spot }[] = []
  private readonly lidTop = new THREE.Vector3()
  /** The cups the guests who are walking off take with them. */
  private parting: { piece: Piece; who: GuestId }[] = []
  /** The damp marks a carried sponge has left, each drying out. */
  private readonly damp: { x: number; z: number; left: number }[] = Array.from({ length: 8 }, () => ({ x: 0, z: 0, left: 0 }))
  private dampNext = 0
  private lidSpeed = 0
  private potSquash = 0
  private potSquashSpeed = 0
  private readonly potLean = { x: 0, z: 0, toX: 0, toZ: 0 }
  private lifted: string | null = null
  private fanning = false
  private readonly matrix = new THREE.Matrix4()
  private readonly vector = new THREE.Vector3()
  private readonly vector2 = new THREE.Vector3()
  private width = 1
  /** The tile of the wall that a touch has loosened, which picture it carries, where it hangs and how far along it is. */
  private readonly loose: ReturnType<typeof looseTile>
  private loosened: { picture: number; x: number; y: number; t: number } | null = null
  private height = 1
  private time = 0

  constructor(canvas: HTMLCanvasElement, doc: Document, tier: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor('#dfe6f2')
    this.renderer.info.autoReset = false
    this.kit = makeKit(doc)
    this.segments = TURN_SEGMENTS[Math.min(TURN_SEGMENTS.length - 1, Math.max(0, tier))]
    const wall = wallMesh(doc)
    this.loose = looseTile(wall)
    this.scene.add(clothMesh(doc), wall, this.loose.mesh)
    this.shadows = shadowBlobs(doc, 36)
    this.stream = new Stream(this.kit.tea)
    this.drops = new Drops(this.kit.tea)
    this.guide = new Guide(doc)
    this.troupe = new Troupe(this.kit.glaze, this.segments)
    this.gate = gateMesh(this.kit.glaze, this.segments)
    this.gate.position.set(GATE.x, 0, GATE.z)
    this.scene.add(this.shadows, this.puddles.mesh, this.ripples.mesh, this.stream.mesh, this.drops.mesh, this.guide.group, this.troupe.group, this.gate)
    const pot = potGeometry(this.segments)
    const body = new THREE.Mesh(pot.body, this.kit.glaze)
    body.name = 'pot-body'
    this.lid = new THREE.Mesh(pot.lid, this.kit.glaze)
    this.lid.name = 'pot-lid'
    // The fish that swims round the belly when the pot is rubbed, like the one painted on its side: a small cobalt body and tail just outside the glaze.
    const fishBody = plain(new THREE.SphereGeometry(0.16, 10, 6))
    const fishTail = plain(new THREE.ConeGeometry(0.15, 0.2, 3))
    fishTail.rotateZ(-Math.PI / 2)
    fishTail.translate(-0.24, 0, 0)
    this.fish = new THREE.Mesh(merged([fishBody, fishTail]), new THREE.MeshBasicMaterial({ color: '#1d3f9e' }))
    this.fish.scale.set(1.6, 0.7, 0.18)
    this.fish.visible = false
    this.fish.name = 'pot-fish'
    // The pot tips about the front of its foot, under the spout.
    this.potTilt.position.set(0.6, 0, 0)
    body.position.set(-0.6, 0, 0)
    this.lid.position.set(-0.6, 0, 0)
    this.potTilt.add(body, this.lid, this.fish)
    this.potRoot.add(this.potTilt)
    this.potRoot.name = 'pot'
    this.potRoot.userData.jamObject = 'pot'
    this.gate.userData.jamObject = 'gate'
    this.scene.add(this.potRoot)
  }

  /** The bare table, before the slot has been read: the cloth, the wall and the gate, and nothing on them. */
  blank(): { drawCalls: number; triangles: number } {
    this.potRoot.visible = false
    this.renderer.info.reset()
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** The surface was sized: `ratio` is the pixel ratio the tier allows. */
  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    this.camera.aspect = aspect
    // The whole table stays in view at any shape of surface: fit its width, or its depth on a tall one.
    const half = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
    const distance = Math.max(CAMERA.halfWidth / (half * aspect), CAMERA.halfDepth / half)
    this.camera.position.set(CAMERA.lookAt.x, CAMERA.lookAt.y + Math.sin(CAMERA.pitch) * distance, CAMERA.lookAt.z + Math.cos(CAMERA.pitch) * distance)
    this.camera.lookAt(CAMERA.lookAt)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  private build(thing: Thing): Piece {
    const group = new THREE.Group()
    group.name = thing.id
    // One thing is one object to the intersection audit: a cup and the tea in it never count as strangers.
    group.userData.jamObject = thing.id
    const piece: Piece = { group, key: keyOf(thing), wobble: 0, speed: 0, height: 0.3, girth: 0.5, to: new THREE.Vector3(thing.x, 0, thing.z), at: new THREE.Vector3(thing.x, 0, thing.z), act: null, held: null, showTea: null, turned: 0, lean: null, small: 1, rise: 0, swing: 0, trailed: 0, carriedBy: 0, wait: 0, after: null, rides: null, goal: new THREE.Vector3(thing.x, 0, thing.z), base: thing.on, tug: { x: 0, z: 0, toX: 0, toZ: 0 }, slosh: { x: 0, z: 0 } }
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string) => {
      const made = new THREE.Mesh(geometry, material)
      made.name = `${thing.id}-${name}`
      group.add(made)
      return made
    }
    if (thing.kind === 'cup') {
      const bowl = bowlOf(thing.size)
      mesh(cupGeometry(bowl, thing.ring, this.segments), this.kit.glaze, 'glaze')
      piece.tea = mesh(teaDiscGeometry(this.segments), this.kit.teaSkin, 'tea')
      piece.tea.renderOrder = 2
      piece.height = bowl.rimY
      piece.girth = bowl.rimR
    } else if (thing.kind === 'saucer') {
      const dish = dishOf(thing.size)
      mesh(saucerGeometry(thing.size, this.segments), this.kit.glaze, 'glaze')
      piece.pool = mesh(poolGeometry(this.segments), this.kit.tea, 'pool')
      piece.height = dish.rimY
      piece.girth = dish.rimR
    } else if (thing.kind === 'spoon') {
      mesh(spoonGeometry(), this.kit.glaze, 'glaze').rotation.y = -0.25
      piece.height = 0.12
      piece.girth = 0.3
    } else if (thing.kind === 'sponge') {
      mesh(spongeGeometry(), this.kit.matte, 'body')
      piece.height = 0.34
      piece.girth = 0.5
    } else if (thing.kind === 'bowl') {
      // The slop bowl of the same service: a gilt rim, and a painted line round the outside and the inside.
      const profile = [{ r: 0, y: 0 }, { r: 0.5, y: 0 }, { r: 0.52, y: 0.08 }, { r: 0.72, y: 0.31 }, { r: 0.75, y: 0.345 }, { r: 0.78, y: 0.38 }, { r: 0.82, y: 0.42 }, { r: 0.92, y: 0.62 }, { r: 0.87, y: 0.64 }, { r: 0.845, y: 0.59 }, { r: 0.82, y: 0.54 }, { r: 0.8, y: 0.5 }, { r: 0.76, y: 0.42 }, { r: 0.42, y: 0.12 }, { r: 0, y: 0.1 }]
      mesh(turn(profile, this.segments, { color: (j) => (j === 7 || j === 8 ? GOLD : j === 4 || j === 5 || j === 10 || j === 11 ? INK : null) }), this.kit.glaze, 'glaze')
      piece.tea = mesh(teaDiscGeometry(this.segments), this.kit.teaSkin, 'tea')
      piece.height = 0.64
      piece.girth = 0.92
    }
    this.scene.add(group)
    return piece
  }

  /** Where the model puts a thing: on the cloth, on the thing under it, or in a guest's paw, on its head or on its nose. */
  private place(world: World, thing: Thing, piece: Piece): boolean {
    piece.turned = 0
    piece.lean = null
    piece.small = 1
    if (thing.heldBy) {
      const seat = this.troupe.spotOf(thing.heldBy)
      if (!seat) return false
      const at = anchorOf(thing, seat, thing.heldBy)
      // What a guest wears rides its head, wherever a hop, a stretch or a lean takes that. An upturned cup hangs from its foot, which is then its top.
      if (thing.worn) piece.lean = this.troupe.onHead(thing.heldBy, at.y + (thing.kind === 'cup' ? piece.height : 0), at.z - seat.z, piece.to)
      else {
        // A cup in the paw of a guest that is still small, on its way in from the gate, is as small as its guest.
        piece.small = this.troupe.scaleOf(thing.heldBy)
        // On foot a guest carries its cup over its head, above a hat if it wears one, so it walks into nobody with it.
        const size = sizeOfGuest(thing.heldBy), who = thing.heldBy
        const aloft = this.troupe.raisedOf(who)
        const over = Math.max(size.height, size.crown) + 0.15 + (world.things.some((other) => other.heldBy === who && other.worn) ? 0.65 : 0)
        piece.to.set(at.x, (at.y + (over - at.y) * aloft) * piece.small + this.troupe.ride(who), seat.z + (at.z - seat.z) * (1 - aloft) * piece.small)
      }
      piece.turned = thing.worn && thing.kind === 'cup' ? Math.PI : 0
      return true
    }
    const under = thingById(world, thing.on)
    // A thing that stands on another stands at its spot, raised by what is under it.
    let lift = 0
    for (let base = under, depth = 0; base && depth < 6; base = thingById(world, base.on), depth++) {
      lift += base.kind === 'saucer' ? (thing.kind === 'saucer' || depth > 0 ? dishOf(base.size).rimY * 0.55 : 0.041 * Math.cbrt(holds(base) / 0.2)) : base.kind === 'cup' ? bowlOf(base.size).rimY * (thing.kind === 'spoon' ? 0.5 : 1) : 0.1
    }
    const base = under ? this.pieces.get(under.id) : undefined
    piece.to.set(under ? under.x : thing.x, lift, under ? under.z : thing.z)
    // On a cup that a guest holds in its paw it is where that cup is.
    if (base && under && under.heldBy !== null) piece.to.set(base.to.x, base.to.y + lift, base.to.z)
    // A spoon rests where a spoon can: leaning in a cup with its bowl on the floor and its handle over the rim, on
    // the rim of a saucer beside the cup that stands on it, or in the dish of an empty saucer, never flat through
    // the middle of the thing.
    if (thing.kind === 'spoon' && under && base && (under.kind === 'cup' || under.kind === 'saucer')) {
      const rest = spoonRest(under, world.things.find((other) => other.kind === 'cup' && other.on === under.id))
      piece.to.set(base.to.x + rest.x, base.to.y + rest.y, base.to.z + rest.z)
      piece.turned = -rest.tip
    }
    // A guest on foot has its cup in hand: the cup at its place leaves its saucer, rides over the guest's head, and
    // comes down on the saucer at the place where the guest sits down.
    piece.carriedBy = 0
    if (thing.kind === 'cup' && under && under.kind === 'saucer') {
      const owner = this.seats.find((guest) => Math.abs(guest.seat.x - thing.x) < 0.1)
      const aloft = owner ? this.troupe.aloftOf(owner.who) : 0
      const where = owner && aloft > 0.01 ? this.troupe.spotOf(owner.who) : null
      if (owner && where) {
        const size = sizeOfGuest(owner.who)
        piece.carriedBy = aloft
        piece.to.lerp(this.vector2.set(where.x, Math.max(size.height, size.crown) + 0.15 + this.troupe.ride(owner.who), where.z), aloft)
      }
    }
    return true
  }

  showWorld(world: World, guests: readonly { who: GuestId; seat: Spot }[], atOnce: boolean): void {
    this.seats = guests
    for (const [id, piece] of this.pieces) {
      const thing = thingById(world, id)
      if (thing && keyOf(thing) === piece.key) continue
      this.scene.remove(piece.group)
      piece.group.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() })
      this.pieces.delete(id)
    }
    const sent: { piece: Piece; rides: string | null }[] = []
    for (const thing of world.things) {
      if (thing.kind === 'pot') continue
      let piece = this.pieces.get(thing.id)
      const fresh = !piece
      if (!piece) this.pieces.set(thing.id, (piece = this.build(thing)))
      piece.group.visible = this.place(world, thing, piece)
      if (atOnce || fresh) piece.group.position.copy(piece.at.copy(piece.to))
      // Things of the table that are sent somewhere far in the same moment, as when a party leaves, go one after
      // another, so that no two of them fly through each other.
      if (!atOnce && !fresh && !thing.heldBy && piece.carriedBy === 0 && piece.wait <= 0 && this.lifted !== thing.id && Math.hypot(piece.to.x - piece.goal.x, piece.to.z - piece.goal.z) > 1) sent.push({ piece, rides: thing.on !== null && thing.on === piece.base ? thing.on : null })
      piece.goal.copy(piece.to)
      piece.base = thing.on
      const tea = piece.showTea ?? thing.tea
      if (piece.tea) {
        const bowl = thing.kind === 'cup' ? bowlOf(thing.size) : { floorR: 0.42, rimR: 0.87, floorY: 0.12, rimY: 0.62, holds: holds(thing) }
        const surface = surfaceOf(bowl, tea)
        piece.tea.visible = tea > 1e-4 && piece.turned === 0
        // A cup filled to its rim bulges a little above it before it runs over.
        piece.tea.position.y = surface.y + (tea >= bowl.holds * 0.985 ? 0.012 : 0)
        // A hair inside the wall, so the rocking surface never shows through it.
        piece.tea.scale.set(surface.r * 0.97, 1, surface.r * 0.97)
      }
      if (piece.pool) {
        const dish = dishOf(thing.size)
        const share = Math.min(1, tea / dish.holds)
        piece.pool.visible = share > 0.01
        const reach = dish.wellR * 1.3 + (dish.rimR * 0.95 - dish.wellR * 1.3) * Math.sqrt(share)
        piece.pool.scale.set(reach, 1, reach)
        piece.pool.position.y = 0.04 + dish.rimY * (reach / dish.rimR) ** 2 * 0.9
      }
    }
    if (sent.length > 1) {
      // The spoons first, which lie singly, and then the rest in the order they stack in: what comes down on
      // another sets off after it. What stands on a thing that is sent goes with it.
      const alone = sent.filter((one) => one.rides === null || !sent.some((other) => this.pieces.get(one.rides!) === other.piece))
      const stacks = (one: { piece: Piece }) => (one.piece.key.startsWith('spoon') ? 0 : 1)
      alone.sort((a, b) => stacks(a) - stacks(b)).forEach((one, turn) => {
        one.piece.wait = SENT_FIRST + SENT_EVERY * turn
        one.piece.after = turn > 0 ? alone[turn - 1].piece : null
      })
      for (const one of sent) {
        const base = alone.includes(one) ? undefined : this.pieces.get(one.rides!)
        if (base) { one.piece.wait = base.wait; one.piece.after = base.after }
      }
    }
    if (atOnce) this.puddles.update(world, 0)
  }

  setParty(guests: readonly { who: GuestId; seat: Spot }[], waiting: readonly GuestId[], atOnce: boolean): void {
    this.troupe.setParty(guests, waiting, atOnce)
  }

  guestHold(who: GuestId, kind: ActionKind | null): void {
    this.troupe.hold(who, kind)
  }

  guestDo(who: GuestId, kind: ActionKind): void {
    this.troupe.do(who, kind)
  }

  guestSettled(who: GuestId): void {
    this.troupe.settled(who)
  }

  guestLook(who: GuestId, at: Spot | null): void {
    this.troupe.look(who, at)
  }

  guestsSeated(): boolean {
    return this.troupe.seatedAll()
  }

  guestLeave(who: GuestId, cup: string | null = null): void {
    this.troupe.leave(who)
    // It leaves with its cup: the cup is no longer a thing of the table, and rides over its guest's head until the guest has gone.
    const piece = cup ? this.pieces.get(cup) : undefined
    if (!cup || !piece) return
    this.pieces.delete(cup)
    piece.held = null
    piece.act = null
    this.parting.push({ piece, who })
  }

  guestWalk(who: GuestId, to: Spot, lane = 0, past: GuestId | null = null): void {
    this.troupe.walk(who, to, lane, past)
  }

  guestsRest(): void {
    this.troupe.rest()
  }

  nudge(id: string, strength: number): void {
    if (id === 'pot') {
      this.potSquashSpeed -= strength * 5
      this.lidSpeed += strength * 2.2
    } else if (id === 'gate') this.gateSpeed += strength * 14
    else {
      const piece = this.pieces.get(id)
      if (piece) piece.speed -= strength * 5
    }
  }

  act(id: string, act: PieceAct): void {
    if (id === 'pot') {
      if (act === 'fish') this.fishTurn = 0
      // The lid hops and lets out a puff of steam.
      if (act === 'toot') {
        this.lidSpeed += 2.4
        this.guide.toot()
      }
      return
    }
    const piece = this.pieces.get(id)
    if (!piece) return
    piece.act = { name: act, t: 0 }
    // A saucer or a spoon that comes in with its guest starts at the gate and is carried to its place.
    // The spoon keeps its place beside the saucer all the way, and both start clear of the guests who wait.
    if (act === 'arrive') piece.act.to = { x: WAITING.x + 1.0 - piece.to.x - (id.startsWith('spoon') ? 1.32 : 0), y: 0, z: WAITING.z + 1.7 - piece.to.z + (id.startsWith('spoon') ? 0.12 : 0) }
    if (act === 'stir') {
      // A spoon stirs in the cup nearest it: over the rim, round in the tea, and back to where it lay.
      let far = 2.4
      for (const [other, cup] of this.pieces) {
        const gap = Math.hypot(cup.at.x - piece.at.x, cup.at.z - piece.at.z)
        if (!other.startsWith('cup') || !cup.tea || gap >= far) continue
        far = gap
        piece.act.to = { x: cup.at.x - piece.at.x, y: cup.at.y + cup.height * 0.62 - piece.at.y, z: cup.at.z - piece.at.z }
      }
    }
  }

  lift(id: string | null): void {
    this.lifted = id
  }

  hold(id: string, who: GuestId | null, amount: number, tilt: number, toward: { x: number; y: number; z: number } | null = null): void {
    const piece = this.pieces.get(id)
    if (piece) piece.held = who && amount > 0 ? { who, amount, tilt, toward } : null
  }

  showTea(id: string, amount: number | null): void {
    const piece = this.pieces.get(id)
    if (piece) piece.showTea = amount
  }

  lean(id: string, x: number, z: number): void {
    const piece = this.pieces.get(id)
    if (!piece) return
    piece.tug.toX = x * piece.girth * 0.3
    piece.tug.toZ = z * piece.girth * 0.3
  }

  splash(on: string | { x: number; y: number; z: number }, reach: number, drops: number): void {
    const piece = typeof on === 'string' ? this.pieces.get(on) : undefined
    if (typeof on === 'string' && !piece) return
    const at = piece ? { x: piece.group.position.x, y: piece.group.position.y + piece.height * 0.8, z: piece.group.position.z } : (on as { x: number; y: number; z: number })
    this.ripples.ring(at.x, at.y, at.z, 0.22 + reach * 0.3)
    const from = this.vector2.set(at.x, at.y + 0.05, at.z)
    for (let i = 0; i < drops; i++) {
      const angle = i * 2.4 + this.time * 3
      this.drops.fall(from, reach > 0 ? { x: at.x + Math.cos(angle) * reach, y: 0.02, z: at.z + Math.sin(angle) * reach * 0.6 + reach * 0.5 } : { x: at.x, y: at.y - 0.45, z: at.z - 0.12 })
    }
  }

  runOver(id: string): void {
    const piece = this.pieces.get(id)
    if (!piece) return
    // Down the side the child sees, a little further round each time.
    const angle = Math.PI * (0.15 + 0.7 * ((this.time * 1.7) % 1))
    const at = piece.group.position, out = piece.girth + 0.05
    this.drops.fall(this.vector2.set(at.x + Math.cos(angle) * out, at.y + piece.height, at.z + Math.sin(angle) * out), { x: at.x + Math.cos(angle) * out * 0.92, y: at.y + 0.06, z: at.z + Math.sin(angle) * out * 0.92 })
  }

  leanPot(x: number, z: number): void {
    this.potLean.toX = x * 0.16
    this.potLean.toZ = z * 0.16
  }

  drop(to: { x: number; y: number; z: number }): void {
    this.drops.fall(this.spoutTip(this.vector), to)
  }

  fan(on: boolean): void {
    this.fanning = on
  }

  /** Where the tea leaves the spout, in the world. */
  private spoutTip(out: THREE.Vector3): THREE.Vector3 {
    return this.potTilt.localToWorld(out.copy(SPOUT_TIP).sub(this.vector2.set(0.6, 0, 0)))
  }

  /** How high the tallest thing is that a carried thing of this girth is over at a spot: other pieces, the pot, a guest. */
  private topUnder(world: World, pot: Pot, id: string, x: number, z: number, girth: number): number {
    // It is at full height by the time it is a finger's width from a thing, and starts up well before: nothing is climbed in one frame.
    const near = (gap: number) => Math.min(1, Math.max(0, 1 - (gap - 0.15) / 0.9))
    let top = 0
    for (const thing of world.things) {
      const other = this.pieces.get(thing.id)
      if (!other || thing.id === id || thing.on === id || thing.heldBy !== null || !other.group.visible) continue
      // Where the other thing stands, not how high it is riding itself: two that are both on their way do not climb each other.
      top = Math.max(top, (Math.min(other.at.y, other.to.y) + other.height) * near(Math.hypot(other.at.x - x, other.at.z - z) - girth - other.girth))
    }
    top = Math.max(top, (liftOf(pot) + POT.height + 0.75) * near(Math.hypot(pot.x - x, pot.z - z) - girth - POT.spoutReach))
    for (const guest of this.troupe.standing()) top = Math.max(top, (guest.height + 0.1) * near(Math.hypot(guest.x - x, guest.z - z) - girth - guest.girth))
    return top
  }

  /** A piece's short motion, as offsets to how it is drawn this frame. */
  private playAct(piece: Piece, dt: number): { x: number; y: number; turn: number; roll: number; pitch: number; scale: number; z: number } {
    const out = { x: 0, y: 0, turn: 0, roll: 0, pitch: 0, scale: 1, z: 0 }
    const act = piece.act
    if (!act) return out
    act.t = Math.min(1, act.t + dt / ACT_SECONDS[act.name])
    const t = act.t, arc = Math.sin(t * Math.PI)
    if (act.name === 'spin') {
      // A spun coin: fast at first, then wobbling down flat.
      out.turn = (1 - (1 - t) ** 3) * Math.PI * 7
      out.roll = 0.32 * (1 - t) * Math.sin(t * 34)
      out.y = 0.12 * (1 - t) * Math.abs(Math.sin(t * 17))
    } else if (act.name === 'flip') {
      // Up first, then over: the handle is clear of the cloth before it comes round.
      const turn = Math.min(1, Math.max(0, (t - 0.18) / 0.64))
      out.pitch = turn * turn * (3 - 2 * turn) * Math.PI * 2
      out.y = arc * 1.35
    } else if (act.name === 'whirl') out.turn = (1 - (1 - t) ** 2) * Math.PI * 4
    else if (act.name === 'flash' || act.name === 'glint') out.scale = 1 + 0.12 * arc
    else if (act.name === 'rattle') out.turn = 0.5 * (1 - t) * Math.sin(t * 46)
    else if (act.name === 'hop') out.y = arc * 0.42
    else if (act.name === 'slide-in') out.z = (1 - t) ** 2 * 1.6
    else if (act.name === 'tip') {
      out.roll = -1.9 * arc
      out.y = arc * 0.6
    } else if (act.name === 'squirt') out.scale = 1 - 0.25 * arc
    else if (act.name === 'skim') out.turn = (1 - (1 - t) ** 2) * Math.PI * 2
    else if (act.name === 'arrive' && act.to) {
      const e = t * t * (3 - 2 * t)
      out.x = act.to.x * (1 - e)
      out.z = act.to.z * (1 - e)
      out.y = 1.2 * Math.sin(Math.PI * Math.min(1, t * 1.15))
      out.scale = 0.5 + 0.5 * Math.min(1, t * 2.5)
    } else if (act.name === 'stir' && act.to) {
      const smooth = (from: number, to: number) => { const u = Math.min(1, Math.max(0, (t - from) / (to - from))); return u * u * (3 - 2 * u) }
      // There by a quarter of the way, back from three quarters; in between the bowl of the spoon goes round in the tea, its handle up.
      const there = smooth(0, 0.25) * (1 - smooth(0.76, 1))
      const round = t * Math.PI * 5
      // A small circle in the middle of the cup, clear of its wall.
      out.x = act.to.x * there + Math.cos(round) * 0.06 * there
      out.z = act.to.z * there + Math.sin(round) * 0.06 * there
      out.y = act.to.y * there + 0.5 * (Math.sin(Math.PI * Math.min(1, t / 0.25)) + Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.76) / 0.24))))
      out.pitch = -0.8 * there
    }
    if (act.t >= 1) piece.act = null
    return out
  }

  frame(dt: number, world: World, pot: Pot, stream: { x: number; y: number; z: number } | null, guidance: Guidance, hint: Hint | null): { drawCalls: number; triangles: number } {
    this.time += dt
    this.potRoot.visible = true
    const spring = (x: number, v: number, stiffness: number, damping: number): [number, number] => {
      const speed = v + (-stiffness * x - damping * v) * Math.min(dt, 0.05)
      return [x + speed * Math.min(dt, 0.05), speed]
    }
    ;[this.potSquash, this.potSquashSpeed] = spring(this.potSquash, this.potSquashSpeed, 260, 13)
    ;[this.lidHop, this.lidSpeed] = spring(this.lidHop, this.lidSpeed, 420, 9)
    ;[this.gateWobble, this.gateSpeed] = spring(this.gateWobble, this.gateSpeed, 180, 7)
    this.gate.rotation.z = this.gateWobble * 0.12
    // The lid chatters while the tea runs.
    if (pot.flow > 0) this.lidSpeed += Math.sin(this.time * 61) * dt * 9
    this.potLean.x += (this.potLean.toX - this.potLean.x) * Math.min(1, dt * 18)
    this.potLean.z += (this.potLean.toZ - this.potLean.z) * Math.min(1, dt * 18)
    this.potRoot.position.set(pot.x + this.potLean.x, liftOf(pot), pot.z + this.potLean.z)
    this.potRoot.rotation.y = -pot.heading
    this.potRoot.scale.set(1 - this.potSquash * 0.5, 1 + this.potSquash, 1 - this.potSquash * 0.5)
    this.potTilt.rotation.z = -pot.tilt * 0.62
    this.lid.position.y = Math.max(0, this.lidHop) * 0.5
    this.lid.rotation.z = this.lidHop * 0.35
    // The fish swims once round the belly, a hair outside the glaze, and is gone.
    this.fishTurn = Math.min(1, this.fishTurn + dt / ACT_SECONDS.fish)
    this.fish.visible = this.fishTurn < 1
    if (this.fish.visible) {
      const a = this.fishTurn * Math.PI * 2
      this.fish.position.set(-0.6 + Math.cos(a) * (POT.bellyR + 0.03), 0.5 + 0.08 * Math.sin(a * 3), Math.sin(a) * (POT.bellyR + 0.03))
      this.fish.rotation.y = -a + Math.PI / 2
    }
    this.potRoot.updateMatrixWorld(true)

    let blobs = 0
    const blob = (x: number, z: number, size: number) => {
      this.matrix.makeScale(size, 1, size * 0.82).setPosition(x, 0.004, z)
      if (blobs < this.shadows.instanceMatrix.count) this.shadows.setMatrixAt(blobs++, this.matrix)
    }
    blob(pot.x, pot.z, POT.bellyR * 1.25 * (1 - liftOf(pot) * 0.18))
    this.troupe.update(dt, this.time, pot, blob)
    // What stands on a thing is moved after that thing, so it goes with it in the same frame.
    const deep = (thing: Thing) => { let depth = 0; for (let base = thingById(world, thing.on); base && depth < 6; base = thingById(world, base.on)) depth++; return depth }
    const ordered = world.things.some((thing) => thing.on !== null) ? world.things.map((thing) => ({ thing, depth: deep(thing) })).sort((one, other) => one.depth - other.depth).map((each) => each.thing) : world.things
    for (const thing of ordered) {
      const piece = this.pieces.get(thing.id)
      if (!piece || !piece.group.visible) continue
      ;[piece.wobble, piece.speed] = spring(piece.wobble, piece.speed, 300, 11)
      // A thing a guest holds rides with the guest; everything else eases to where the model put it.
      if (thing.heldBy) this.place(world, thing, piece)
      const carried = this.lifted === thing.id
      const offset = this.playAct(piece, dt)
      const at = this.vector.copy(piece.to)
      // A thing in the hand rides above the cloth, and over whatever it passes: a cup, the pot, a guest's head.
      if (carried) {
        piece.rise += (0.55 + this.topUnder(world, pot, thing.id, at.x, at.z, piece.girth) - piece.rise) * Math.min(1, dt * 16)
        at.y += piece.rise
      } else {
        // A piece on its way somewhere rides over whatever is between, and comes down when it is there.
        const far = Math.hypot(piece.to.x - piece.at.x, piece.to.z - piece.at.z)
        const over = far > 0.12 && !thing.heldBy && piece.wait <= 0 ? this.topUnder(world, pot, thing.id, piece.at.x, piece.at.z, piece.girth) + 0.08 : 0
        piece.rise += (over - piece.rise) * Math.min(1, dt * (over > piece.rise ? 22 : 9))
        if (piece.rise > 0.01) at.set(far > 0.12 && piece.at.y < piece.rise - 0.05 ? piece.at.x : at.x, Math.max(at.y, piece.rise), far > 0.12 && piece.at.y < piece.rise - 0.05 ? piece.at.z : at.z)
      }
      if (piece.held) {
        const seat = this.troupe.spotOf(piece.held.who)
        const size = sizeOfGuest(piece.held.who)
        // To the mouth: the foot of the cup stops clear of the face, and the tilt brings its rim to the lips.
        // Or out to a point it is held to: the Ducklings hold their cups rim to rim between them.
        if (piece.held.toward) at.lerp(this.vector2.set(piece.held.toward.x, piece.held.toward.y, piece.held.toward.z), piece.held.amount)
        else if (seat) at.lerp(this.vector2.set(seat.x, size.mouth[0], seat.z + size.mouth[1]), piece.held.amount)
      }
      // What has come to rest on a thing goes with that thing as it is drawn, carried, hopping or lifted to a mouth:
      // a spoon in a cup tips with the cup. Until it has come to rest it eases there like anything else.
      const under = thing.on !== null && !carried && piece.held === null ? this.pieces.get(thing.on) : undefined
      let tipped = 0
      if (!under) piece.rides = null
      else {
        const want = this.vector2.copy(piece.to).sub(under.to)
        if (thing.kind === 'spoon' && under.held) {
          tipped = under.group.rotation.x
          want.applyAxisAngle(ACROSS, tipped)
        }
        want.add(under.group.position)
        if (piece.rides === thing.on || piece.at.distanceTo(want) < 0.08) {
          piece.rides = thing.on
          at.copy(want)
        } else piece.rides = null
      }
      const quick = carried || thing.heldBy !== null || piece.held !== null || piece.carriedBy > 0.5 || piece.rides !== null
      const wasX = piece.at.x, wasZ = piece.at.z
      // One that waits its turn stays where it lies until the one before it is there.
      const before = piece.after
      if (quick || (before && before.wait <= 0 && Math.hypot(before.to.x - before.at.x, before.to.z - before.at.z) < 0.12)) piece.wait = 0
      if (piece.wait > 0) piece.wait -= dt
      else {
        piece.after = null
        piece.at.lerp(at, quick ? 1 : Math.min(1, dt * 14))
      }
      const went = Math.hypot(piece.at.x - wasX, piece.at.z - wasZ)
      if (thing.kind === 'spoon') {
        // A carried spoon swings round behind the finger: its handle trails the way it came from, and it lies straight again when it is let go.
        // Only once it is up off the cloth, clear of the spoons it lay beside.
        const want = carried && went > 0.004 && piece.rise > 0.4 ? Math.atan2(wasX - piece.at.x, wasZ - piece.at.z) : carried ? piece.swing : 0
        piece.swing += Math.atan2(Math.sin(want - piece.swing), Math.cos(want - piece.swing)) * Math.min(1, dt * (carried ? 9 : 12))
      } else if (thing.kind === 'sponge' && carried) {
        // A carried sponge leaves a damp streak on the cloth, which dries from its ends.
        piece.trailed += went
        if (piece.trailed > 0.3) {
          piece.trailed = 0
          this.damp[this.dampNext++ % this.damp.length] = { x: piece.at.x, z: piece.at.z, left: 1 }
        }
      }
      // It leans after the finger before it follows, and the tea in a carried cup leans back from the way it goes.
      piece.tug.x += (piece.tug.toX - piece.tug.x) * Math.min(1, dt * 18)
      piece.tug.z += (piece.tug.toZ - piece.tug.z) * Math.min(1, dt * 18)
      const pull = (speed: number) => Math.max(-0.3, Math.min(0.3, speed * 0.05))
      piece.slosh.x += ((carried && dt > 0 ? pull((piece.at.x - wasX) / dt) : 0) - piece.slosh.x) * Math.min(1, dt * 7)
      piece.slosh.z += ((carried && dt > 0 ? pull((piece.at.z - wasZ) / dt) : 0) - piece.slosh.z) * Math.min(1, dt * 7)
      // A thing that leans comes up off the cloth a little as it does, clear of what lies beside it.
      const tugged = Math.min(0.18, Math.hypot(piece.tug.x, piece.tug.z) * 2.2)
      piece.group.position.set(piece.at.x + offset.x + piece.tug.x, piece.at.y + offset.y + tugged, piece.at.z + offset.z + piece.tug.z)
      const lean = piece.lean
      piece.group.rotation.set(piece.turned + tipped + offset.pitch - (piece.held ? piece.held.tilt : 0) + (lean ? lean.pitch : 0), offset.turn + (lean ? lean.yaw : 0) + piece.swing, offset.roll + (lean ? (piece.turned ? -lean.roll : lean.roll) : 0))
      // The sponge swells with the tea it holds.
      const scale = offset.scale * piece.small * (thing.kind === 'sponge' ? 1 + 0.22 * Math.min(1, thing.tea / holds(thing)) : 1)
      piece.group.scale.set(scale * (1 - piece.wobble * 0.5), scale * (1 + piece.wobble), scale * (1 - piece.wobble * 0.5))
      // The tea rocks against the wall as the cup settles, and turns with a whirl.
      if (piece.tea) piece.tea.rotation.set(piece.wobble * 0.35 - piece.slosh.z, piece.act && piece.act.name === 'whirl' ? offset.turn * 1.5 : 0, piece.speed * 0.003 + piece.slosh.x)
      // A spoon that is stirring is in the cup, and casts no shadow where it lay.
      // Its shadow is under where it is drawn: a saucer on its way in from the gate has its shadow with it.
      if (!thing.on && !thing.heldBy && !(piece.act && piece.act.name === 'stir')) blob(piece.group.position.x, piece.group.position.z, piece.girth * 1.2 * (carried ? 0.85 : 1) * Math.min(1, piece.group.scale.x))
    }
    blob(GATE.x, GATE.z, 0.9)
    if (this.loosened) {
      // The touched tile does what its picture would, and is back in the wall when it is done.
      const loosened = this.loosened, tile = this.loose.mesh
      loosened.t += dt / TILE_SECONDS
      const motion = tileMotion(loosened.picture, loosened.t)
      // It comes a finger's width off the wall, never as far as the gate that stands before it.
      tile.position.set(loosened.x + motion.x * WALL.tile, loosened.y + motion.y * WALL.tile, WALL.z + 0.02 + 0.1 * (motion.scale - 1))
      tile.rotation.z = motion.turn
      tile.scale.setScalar(motion.scale)
      if (loosened.t >= 1) {
        tile.visible = false
        this.loosened = null
      }
    }
    this.parting = this.parting.filter(({ piece, who }) => {
      const at = this.troupe.leavingSpot(who)
      if (!at) {
        this.scene.remove(piece.group)
        piece.group.traverse((node) => { if (node instanceof THREE.Mesh) node.geometry.dispose() })
        return false
      }
      // Up first, and only then over its guest's head: it never goes through the face on its way.
      const size = sizeOfGuest(who), over = Math.max(size.height, size.crown) + 0.15
      piece.at.y += (over - piece.at.y) * Math.min(1, dt * 12)
      if (piece.at.y > over - 0.2) piece.at.lerp(this.vector.set(at.x, piece.at.y, at.z), Math.min(1, dt * 12))
      piece.group.position.copy(piece.at)
      piece.group.rotation.set(0, 0, 0)
      return true
    })
    for (const mark of this.damp) {
      if (mark.left <= 0) continue
      mark.left -= dt / 1.8
      if (mark.left > 0) blob(mark.x, mark.z, 0.42 * Math.sqrt(mark.left))
    }
    this.shadows.count = blobs
    this.shadows.instanceMatrix.needsUpdate = true

    const tip = this.spoutTip(this.vector)
    this.stream.update(dt, stream ? pot.flow / 0.27 : 0, tip, stream ? this.vector2.set(stream.x, stream.y, stream.z) : tip, this.time)
    this.drops.update(dt)
    for (const landed of this.drops.landed.splice(0)) this.ripples.ring(landed.x, landed.y, landed.z, 0.3)
    if (stream && pot.flow > 0 && Math.floor(this.time * 7) !== Math.floor((this.time - dt) * 7)) this.ripples.ring(stream.x, stream.y, stream.z, this.fanning ? 0.9 : 0.22 + 0.2 * (pot.flow / 0.27))
    this.ripples.update(dt)
    this.puddles.update(world, dt)
    const resting = pot.tilt === 0 && pot.hop === null && !pot.carried
    const spout = resting ? this.spoutTip(this.vector) : null
    const lid = this.lid.getWorldPosition(this.lidTop)
    if (this.guide.update(dt, guidance, this.shown(world, pot, hint), spout, lid.setY(lid.y + POT.height)) && hint) this.nudge(hint.on, 0.07)

    this.renderer.info.reset()
    this.renderer.render(this.scene, this.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** What the guide marks and where the ghost hand goes, from the game's hint. */
  private shown(world: World, pot: Pot, hint: Hint | null): Shown | null {
    if (!hint) return null
    const size = hint.on === 'gate' ? { height: 1.7, girth: 0.8 } : this.sizeOf(hint.on)
    const thing = thingById(world, hint.on)
    const held = thing && thing.heldBy ? this.troupe.spotOf(thing.heldBy) : null
    const at = thing && thing.heldBy && held ? anchorOf(thing, held, thing.heldBy) : { x: hint.at.x, y: 0, z: hint.at.z }
    const top = hint.on === 'pot' ? POT.height + 0.5 + liftOf(pot) : at.y + size.height
    return { move: hint.move, at: { x: at.x, y: top, z: at.z }, to: 'to' in hint ? { x: hint.to.x, y: 0.3, z: hint.to.z } : null, girth: size.girth }
  }

  screenOf(x: number, y: number, z: number): { x: number; y: number } {
    this.vector.set(x, y, z).project(this.camera)
    return { x: (this.vector.x * 0.5 + 0.5) * this.width, y: (-this.vector.y * 0.5 + 0.5) * this.height }
  }

  tile(px: number, py: number): number | null {
    // The corner the grown-ups' overlay is opened from, and the tiles round it, answer nothing.
    if (px > this.width - 2 * CORNER && py < 2 * CORNER) return null
    const near = this.vector.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1, 0.5).unproject(this.camera)
    const origin = this.camera.position
    const t = (WALL.z - origin.z) / (near.z - origin.z)
    const x = origin.x + (near.x - origin.x) * t, y = origin.y + (near.y - origin.y) * t
    if (!(t > 0) || y < 0 || y >= WALL.height || Math.abs(x) >= WALL.width / 2) return null
    const picture = this.loose.show(Math.floor((x + WALL.width / 2) / WALL.tile), Math.floor(y / WALL.tile))
    this.loosened = { picture, x: this.loose.mesh.position.x, y: this.loose.mesh.position.y, t: 0 }
    return picture
  }

  clothAt(px: number, py: number): Spot {
    const near = this.vector.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1, 0.5).unproject(this.camera)
    const origin = this.camera.position
    const t = origin.y / (origin.y - near.y)
    return { x: origin.x + (near.x - origin.x) * t, z: origin.z + (near.z - origin.z) * t }
  }

  sizeOf(id: string): { height: number; girth: number } {
    if (id === 'pot') return { height: POT.height, girth: POT.bellyR }
    const piece = this.pieces.get(id)
    return piece ? { height: piece.height, girth: piece.girth } : { height: 0.3, girth: 0.5 }
  }

  dispose(): void {
    this.guide.dispose()
    this.troupe.dispose()
    this.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose()
        const material = node.material as THREE.Material & { map?: THREE.Texture | null }
        material.map?.dispose()
        material.dispose()
      }
    })
    this.kit.dispose()
    this.renderer.dispose()
  }
}

/** The axis a cup tips about when it is lifted to a mouth. */
const ACROSS = new THREE.Vector3(1, 0, 0)

function keyOf(thing: Thing): string {
  return `${thing.kind}:${thing.size}:${thing.ring}`
}
