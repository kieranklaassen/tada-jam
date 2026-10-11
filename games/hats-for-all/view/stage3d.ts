import * as THREE from 'three'
import type { LetGo, Target } from '../game'
import type { Hint } from '../guide'
import { MOST, type HatKind } from '../kinds'
import { DIMPLE_SECONDS, MARK_SECONDS, MOST_CRUMBS, MOST_MARKS, type ActorPose, type Play } from '../play'
import { CREATURE_DEPTH, HAND, HAT_HALF, HAT_HEIGHT, SLAB, TILE_DEPTH } from '../sizes'
import { BALL_RADIUS, BALL_ROLL, BRICK_HOP, BRICK_REST_Y, PROPS, PROP_AT, PROP_LEAN } from '../props'
import { ARCH_X, ARCH_Z, LANE_Z, TILE_Z, tileX } from '../stage'
import { COUNTS_FROM } from '../input'
import { tileWidth } from '../tile'
import { CREATURE_COLOUR, EAR_DEPTH, HAT_COLOUR, MAT_BACK, PALETTE, buildArch, buildMat, buildPieces, buildTile, type Pieces } from './build'
import { BALLOON_WAY, BEADS, CLOUD_AT, TINT, WALL_TINT, balloonCentre, blockTint, cloudCentre, roomUnder, buildBall, buildBrick, buildCloud, buildCrown, buildRoomPlanes, buildScenery } from './room'
import { RING_CLEAR, blobTexture, foamMaterials, handTexture, ringTexture } from './foam'

// The foam scene as three.js objects, with no renderer: it is built once,
// moves what is there from the theatre's numbers each frame, and answers
// where a finger landed. A test can build it and count what a frame would
// draw. It holds no rule and no timing of its own.

/** The most creatures on the mat at once: a crew walking off, the next walking in, and no more. */
const BODIES = MOST * 2
const BLOBS = BODIES + MOST + 11
const GLOWS = MOST
/** A drag that counts when partly done was aimed: it began at least this far from the creature, in pixels, and was let go no further to the side of the straight line to it than this share of the line's length. */
const AIMED_FROM_PX = 90
const AIMED_WITHIN = 0.2
/** The dots of a face: two pupils, the open mouth, two cheeks, two brows and the two halves of the shut mouth's line. */
const DOTS = 9
const CHEEK = new THREE.Color('#ff8fa6')
const WHITE = new THREE.Color('#ffffff')
const HAT_REACH = 1.15
/** A hat in the hand floats on a wall in front of the row, and never lower than this above the floor: clear of every head, loose hat and the tile. */
const HOLD_Z = LANE_Z + 0.45
const CARRY_Y = 1.95

export type Guide = { hint: Hint; glow: number; press: number; opacity: number }

export class FoamStage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(34, 1, 1, 200)
  private readonly foam = foamMaterials()
  private readonly pieces: Pieces = buildPieces()
  private readonly solid: THREE.Mesh[] = []
  private readonly tile: THREE.Mesh
  private readonly arch: THREE.Mesh
  private readonly hats: THREE.Mesh[] = []
  private readonly bodies: THREE.Mesh[] = []
  private readonly ears: THREE.Mesh[] = []
  private readonly dots: THREE.InstancedMesh
  private readonly hands: THREE.InstancedMesh
  private readonly blobs: THREE.InstancedMesh
  private readonly glows: THREE.InstancedMesh
  private readonly hand: THREE.Sprite
  private readonly crown: THREE.Mesh
  private readonly cloud: THREE.Mesh
  private readonly brick: THREE.Mesh
  private readonly ball: THREE.Mesh
  private readonly dark = new THREE.Color(PALETTE.dot)
  private readonly textures = [blobTexture(), handTexture(), ringTexture()]
  private readonly m = new THREE.Matrix4()
  private readonly body = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly w = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly colour = new THREE.Color()
  private readonly tint = new THREE.Color()
  private readonly ray = new THREE.Raycaster()
  private readonly pose = {} as ActorPose
  private tileFor = ''
  private width = 1
  private height = 1

  constructor() {
    // Daylight from a window, not a lamp: a broad sky light and one soft sun, and no shadow map.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#d9d2c2', 2.5))
    const sun = new THREE.DirectionalLight('#ffffff', 1.25)
    sun.position.set(-7, 15, 10)
    this.scene.add(sun)
    const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material = this.foam.stippled): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = name
      this.scene.add(mesh)
      if (material === this.foam.stippled) this.solid.push(mesh)
      return mesh
    }
    // The room: its flat floor, wall and window pane; then everything of it that stands still, in one mesh; then the four things that move.
    add('room', buildRoomPlanes(), this.foam.plain)
    add('scenery', buildScenery())
    this.crown = add('tree-crown', buildCrown())
    this.cloud = add('cloud', buildCloud(), this.foam.plain)
    this.brick = add('brick', buildBrick())
    this.ball = add('ball', buildBall())
    this.crown.matrixAutoUpdate = false
    add('mat', buildMat())
    this.arch = add('arch', buildArch())
    this.arch.position.set(ARCH_X, 0, ARCH_Z)
    this.tile = add('tile', new THREE.BufferGeometry())
    this.tile.visible = false
    for (let i = 0; i < MOST; i++) {
      const hat = add(`hat-${i}`, this.pieces.hats.cone)
      hat.rotation.order = 'YZX'
      hat.visible = false
      this.hats.push(hat)
    }
    for (let i = 0; i < BODIES; i++) {
      const body = add(`creature-${i}-body`, this.pieces.bodies.bop)
      body.matrixAutoUpdate = false
      body.userData.jamObject = `creature-${i}`
      body.visible = false
      this.bodies.push(body)
    }
    for (let i = 0; i < 4; i++) {
      const ear = add(`ear-${i}`, this.pieces.ear)
      ear.matrixAutoUpdate = false
      ear.visible = false
      this.ears.push(ear)
    }
    const instanced = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geometry, material, count)
      mesh.name = name
      mesh.frustumCulled = false
      mesh.count = 0
      this.scene.add(mesh)
      return mesh
    }
    const flat = (colour: string, opacity: number, map = 0): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: colour, map: this.textures[map], transparent: true, opacity, depthWrite: false })
    this.hands = instanced('hands', this.pieces.hand, this.foam.plain, BODIES * 2)
    this.dots = instanced('dots', this.pieces.dot, new THREE.MeshBasicMaterial({ color: '#ffffff' }), BODIES * DOTS + MOST_CRUMBS + MOST_MARKS + 3)
    this.blobs = instanced('shadow-blobs', this.pieces.blob, flat(PALETTE.shadow, 0.5), BLOBS)
    this.glows = instanced('glow-blobs', this.pieces.blob, flat(PALETTE.glow, 1, 2), GLOWS)
    this.blobs.renderOrder = 1
    this.glows.renderOrder = 2
    // The owners of each hand and each dot, for a check that reads the scene: they belong to their creature.
    this.hands.userData.jamInstanceObjects = Array.from({ length: BODIES * 2 }, (_, i) => `creature-${Math.floor(i / 2)}`)
    this.dots.userData.jamInstanceObjects = Array.from({ length: BODIES * DOTS + MOST_CRUMBS + MOST_MARKS + 3 }, (_, i) => (i < BODIES * DOTS ? `creature-${Math.floor(i / DOTS)}` : 'crumbs'))
    this.hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures[1], transparent: true, depthTest: false, depthWrite: false }))
    this.hand.name = 'ghost-hand'
    this.hand.center.set(0.5, 1)
    this.hand.renderOrder = 3
    this.hand.visible = false
    this.scene.add(this.hand)
  }

  /** The stipple is the first thing a slower tier sheds. Both materials exist from the start. */
  setStipple(on: boolean): void {
    for (const mesh of this.solid) mesh.material = on ? this.foam.stippled : this.foam.plain
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    // The whole row, the arch and the tile stay in view at any shape: a narrow surface moves the camera back.
    const aspect = width / height, half = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const far = Math.max(8.5 / (Math.tan(half) * aspect), 5.2 / Math.tan(half))
    this.camera.aspect = aspect
    this.camera.position.set(0.2, 2.1 + far * Math.sin(0.6), 1.2 + far * Math.cos(0.6))
    this.camera.lookAt(0.2, 2.1, 1.2)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
  }

  /** Cuts the tile for this cycle's hats, when they have changed. */
  private cutTile(play: Play): void {
    const kinds: HatKind[] = []
    for (let hat = 0; hat < play.hatCount; hat++) kinds.push(play.hatKind(hat))
    const key = kinds.join(' ')
    if (key === this.tileFor) return
    this.tileFor = key
    this.tile.geometry.dispose()
    this.tile.geometry = buildTile(kinds)
    // The tile is cut again for each cycle's hats. Its name says which, so anything that reads the scene and
    // remembers a geometry by its name never takes one tile for another.
    this.tile.geometry.uuid = `tile ${key}`
    this.hats.forEach((mesh, hat) => { if (hat < kinds.length) mesh.geometry = this.pieces.hats[kinds[hat]] })
  }

  /** Moves everything to where the theatre has it this frame. With no theatre yet, the bare mat and the arch. */
  update(play: Play | null, guide: Guide | null): void {
    let blob = 0, dotCount = 0, hand = 0, ear = 0, glow = 0
    const shade = (x: number, z: number, wide: number, deep: number, y = 0.012): void => {
      if (blob < BLOBS) this.blobs.setMatrixAt(blob++, this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set(wide, 1, deep)))
    }
    const lit = (target: Target): boolean => guide !== null && guide.glow > 0 && guide.hint.glow.some((one) => one.type === target.type && (one.type === 'hat' ? one.hat === (target as { hat: number }).hat : one.type === 'creature' && one.who === (target as { who: string }).who))
    // A ring round a thing that is `halfWide` by `halfDeep`: the thing fits in the ring's clear middle with a little room, so the ring marks it and never lies over it or runs into the next.
    const halo = (x: number, y: number, z: number, halfWide: number, halfDeep: number): void => {
      const grow = (1 + 0.06 * pulse) * 2 / RING_CLEAR
      if (glow < GLOWS) this.glows.setMatrixAt(glow++, this.m.compose(this.v.set(x, y, z), this.q.identity(), this.s.set((halfWide + 0.07) * grow, 1, (halfDeep + 0.07) * grow)))
    }
    const pulse = guide ? guide.glow * (0.75 + 0.25 * Math.sin((play?.time ?? 0) * 4)) : 0
    this.tile.visible = play !== null && play.hatCount > 0
    const cast = play ? play.cast : []
    this.bodies.forEach((mesh, i) => {
      const who = cast[i]
      mesh.visible = play !== null && who !== undefined
      if (!play || who === undefined) return
      const kind = play.kindOf(who), pose = play.actorPose(who, this.pose), cut = this.pieces.cuts[kind], wide = 1 / Math.sqrt(pose.squash)
      mesh.geometry = this.pieces.bodies[kind]
      // A body leans as foam does, by sliding its top across over planted feet: a shear, set straight into its matrix.
      this.body.makeShear(0, 0, -Math.tan(pose.lean), 0, 0, 0).scale(this.s.set(wide, pose.squash, 1))
      this.body.premultiply(this.m.makeRotationY(pose.turn)).setPosition(pose.x, pose.y, pose.z)
      mesh.matrix.copy(this.body)
      mesh.matrixWorldNeedsUpdate = true
      const front = CREATURE_DEPTH / 2
      const part = (x: number, y: number, z: number, sx: number, sy: number, turn = 0): THREE.Matrix4 => this.m.compose(this.v.set(x, y, z), this.q.setFromAxisAngle(this.w.set(0, 0, 1), turn), this.s.set(sx, sy, 1)).premultiply(this.body)
      const dot = (n: number, matrix: THREE.Matrix4, colour: THREE.Color): void => {
        this.dots.setMatrixAt(i * DOTS + n, matrix)
        this.dots.setColorAt(i * DOTS + n, colour)
      }
      const eye = cut.eyeSize, pupil = eye * 0.5, wander = eye * 0.42, smile = Math.max(0, pose.smile), frown = Math.max(0, -pose.smile)
      // Its cheeks are a warmer tint of its own colour, and rise and round out when it smiles.
      this.colour.set(CREATURE_COLOUR[kind]).lerp(CHEEK, 0.6)
      for (const side of [-1, 1]) {
        const n = (side + 1) / 2
        // Crossed eyes turn each pupil in towards the other.
        const lookX = pose.gazeX * (1 - pose.cross) - side * pose.cross
        dot(n, part(side * cut.eyeGap + lookX * wander, cut.faceY + pose.gazeY * wander, front + 0.17, pupil, pupil * pose.eyes), this.dark)
        dot(3 + n, part(side * (cut.eyeGap + eye * 0.95), cut.faceY - eye * 1.0 + 0.05 * smile, front + 0.012, eye * (0.44 + 0.1 * smile), eye * (0.34 + 0.08 * smile)), this.colour)
        // Its brows: raised when it is glad, tipped up in the middle when it wonders, down in the middle when it is cross.
        dot(5 + n, part(side * cut.eyeGap, cut.faceY + eye * 1.22 + 0.07 * pose.browLift, front + 0.012, eye * 0.6, eye * 0.15, side * pose.browTilt * 0.45), this.dark)
        // A hand rests at its side, and goes up to pat the top of its bare head.
        const hx = side * (cut.reach + (0.36 - cut.reach) * pose.pat), hy = cut.top * 0.42 + (cut.top * 0.56 + 0.08) * pose.pat
        this.hands.setMatrixAt(i * 2 + n, part(hx, hy, HAND.front - HAND.depth / 2, 1, 1))
        this.hands.setColorAt(i * 2 + n, this.tint.set(CREATURE_COLOUR[kind]).multiplyScalar(0.86))
        if (kind === 'flop' && ear < this.ears.length) this.swing(this.ears[ear++], i, side, cut.top, pose)
      }
      // Its mouth. Shut, it is a line in two halves that turn up at the ends for a smile and down for a sulk; open, it is a round hole that hides the line.
      const open = Math.min(1, pose.mouth * 1.4), mouthY = cut.faceY - eye * 1.55, half = 0.11 + 0.07 * smile - 0.02 * frown, bend = 0.5 * pose.smile
      for (const side of [-1, 1]) dot(7 + (side + 1) / 2, part(side * half * 0.8, mouthY + Math.abs(Math.sin(bend)) * half * 0.8 * Math.sign(bend), front + 0.02, half * (1 - open), 0.05 * (1 - open), side * bend), this.dark)
      dot(2, part(0, mouthY, front + 0.024, (0.13 + 0.05 * smile) * open, (0.1 + 0.11 * pose.mouth) * open), this.dark)
      dotCount = (i + 1) * DOTS
      hand = (i + 1) * 2
      shade(pose.x, pose.z + 0.1, cut.ground * 2.3 / (1 + pose.y * 0.4), 1.5 / (1 + pose.y * 0.4))
      if (lit({ type: 'creature', who })) halo(pose.x, 0.02, pose.z + 0.1, cut.ground * 1.05, 0.85)
    })
    while (ear < this.ears.length) this.ears[ear++].visible = false
    if (play) {
      this.cutTile(play)
      this.tile.position.set(tileX(play.hatCount), 0, play.tileZ)
      this.hats.forEach((mesh, hat) => {
        mesh.visible = hat < play.hatCount
        if (!mesh.visible) return
        const pose = play.hatPose(hat), flat = 1 - pose.up, give = 1 - pose.squash, glowing = lit({ type: 'hat', hat })
        // Lying in its hole a hat gives under the finger as foam does: it gets thinner and its underside stays on
        // the mat. Standing, it squashes onto what it stands on and spreads.
        const thin = 1 - flat * Math.max(0, give) * 0.7
        mesh.position.set(pose.x, pose.y - flat * (1 - thin) * SLAB / 2, pose.z)
        mesh.rotation.set(-Math.PI / 2 * flat + pose.flip, pose.turn, pose.tilt)
        mesh.scale.set(1 + pose.up * (1 / Math.sqrt(pose.squash) - 1), 1 - pose.up * give, thin)
        if (pose.up > 0.02) shade(pose.x, pose.z, 2 / (1 + pose.y * 0.25), 1.1 / (1 + pose.y * 0.25))
        // A hat in its hole is ringed on the tile, close round its own outline; a hat standing on the floor or a head is ringed on the floor under it.
        if (glowing && flat > 0.5) halo(pose.x, SLAB + 0.02, pose.z - HAT_HEIGHT[play.hatKind(hat)] / 2, HAT_HALF[play.hatKind(hat)] + 0.06, HAT_HEIGHT[play.hatKind(hat)] / 2 + 0.1)
        else if (glowing) halo(pose.x, 0.02, pose.z, HAT_HALF[play.hatKind(hat)] + 0.25, 0.75)
      })
      this.arch.scale.set(1 / Math.sqrt(play.arch.x), play.arch.x, 1)
      for (const dimple of play.dimples) {
        const size = Math.sin(Math.PI * dimple.age / DIMPLE_SECONDS) * 3.2
        shade(dimple.x, dimple.z, size, size * 0.8, Math.abs(dimple.z - play.tileZ) < TILE_DEPTH / 2 && Math.abs(dimple.x - tileX(play.hatCount)) < tileWidth(play.hatCount) / 2 ? SLAB + 0.012 : 0.012)
      }
    } else for (const mesh of this.hats) mesh.visible = false
    shade(ARCH_X - 2.3, ARCH_Z + 0.1, 1.5, 1.3)
    shade(ARCH_X + 2.3, ARCH_Z + 0.1, 1.5, 1.3)
    // Crumbs and leaves are drawn with the faces' dots, after the last face: they cost no draw of their own. Each shrinks away at the end of its time.
    if (play) for (const crumb of play.crumbs) {
      const size = crumb.size * Math.min(1, (crumb.life - crumb.age) / 0.3), leaf = crumb.of === 'leaf'
      this.dots.setMatrixAt(dotCount, this.m.compose(this.v.set(crumb.x, crumb.y, crumb.z), this.q.setFromAxisAngle(this.w.set(0, 0, 1), crumb.sway + crumb.age * (crumb.y > 0.05 ? 5 : 0)), this.s.set(size * (leaf ? 1.5 : 1), size, 1)))
      this.dots.setColorAt(dotCount++, crumb.of === 'leaf' ? this.colour.set(TINT.crown) : this.colour.set(HAT_COLOUR[crumb.of]).lerp(WHITE, 0.45))
    }
    // The room's passer-by: a balloon on its string rises past the window, outside, and is gone behind the board. Three more dots.
    const balloon = balloonCentre(play ? play.time : 0)
    if (balloon) {
      // Poked, it swells and swings on its string.
      const poked = play ? play.balloon.x : 0, big = 1 + 0.35 * Math.abs(poked), x = balloon.x + 0.22 * poked, y = balloon.y
      const put = (dy: number, wide: number, high: number, tint: string): void => {
        this.dots.setMatrixAt(dotCount, this.m.compose(this.v.set(x, y + dy, BALLOON_WAY.z), this.q.identity(), this.s.set(wide, high, 1)))
        this.dots.setColorAt(dotCount++, this.colour.set(tint))
      }
      put(0, 0.27 * big, 0.33 * big, TINT.balloon)
      put(-0.36 * big, 0.05, 0.05, TINT.balloon)
      put(-0.36 * big - 0.26, 0.014, 0.24, TINT.string)
    }
    // Where the room was touched, a mark for a moment: a block gives under the finger, a bead swells, the wall and the window board dent.
    if (play) for (const mark of play.marks) {
      const pulse = Math.sin(Math.PI * mark.age / MARK_SECONDS)
      if (mark.what === 'cloud' || mark.what === 'balloon') continue
      const bead = mark.what === 'bead' ? BEADS[mark.n] : null
      const size = bead ? bead.r * (1 + 0.55 * pulse) : (mark.what === 'block' ? 0.46 : 0.3) * pulse
      this.dots.setMatrixAt(dotCount, this.m.compose(this.v.set(mark.x, mark.y, mark.z), this.q.identity(), this.s.set(size, size, 1)))
      this.dots.setColorAt(dotCount++, bead ? this.colour.set(bead.tint).lerp(WHITE, 0.45) : this.colour.set(mark.what === 'block' ? blockTint(mark.n) : WALL_TINT).multiplyScalar(0.8))
    }
    this.dots.count = dotCount
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true
    this.hands.count = hand
    this.blobs.count = blob
    this.glows.count = glow
    // The rings breathe together: they come up and go down with the idle ladder's glow.
    ;(this.glows.material as THREE.MeshBasicMaterial).opacity = Math.min(1, pulse * 1.15)
    for (const mesh of [this.dots, this.hands, this.blobs, this.glows]) {
      mesh.instanceMatrix.needsUpdate = true
      // An instanced mesh with nothing in it is not submitted at all.
      mesh.visible = mesh.count > 0
    }
    if (this.hands.instanceColor) this.hands.instanceColor.needsUpdate = true
    this.moveRoom(play)
    // The ghost hand comes down on one thing, once, and goes: it is a hand, and it shows a tap.
    const at = play && guide && guide.opacity > 0 && guide.hint.hand ? this.whereIs(guide.hint.hand, play) : null
    this.hand.visible = at !== null
    if (at && guide) {
      this.hand.position.set(at.x + 0.15, at.y + 0.1 + 0.6 * (1 - guide.press), at.z + 0.1)
      const size = 2.4 * (1 - 0.12 * guide.press)
      this.hand.scale.set(size, size, 1)
      this.hand.material.opacity = guide.opacity * 0.92
    }
  }

  /** The room's four moving things: the crown sways a little all the time and the cloud drifts in the window; the crown, the ball and the brick wobble when poked. */
  private moveRoom(play: Play | null): void {
    const time = play ? play.time : 0, wobble = (name: (typeof PROPS)[number]): number => (play ? play.props[name].x : 0)
    const lean = 0.03 * Math.sin(time * 0.9) + PROP_LEAN * wobble('tree')
    // The crown hangs on the top of the trunk and in front of it; it leans as foam does, from where it is held.
    this.crown.matrix.makeShear(0, 0, -Math.tan(lean), 0, 0, 0).setPosition(PROP_AT.tree.x, 2.7, PROP_AT.tree.z + 0.62)
    this.crown.matrixWorldNeedsUpdate = true
    // The cloud drifts; poked, it dips and flattens a little and comes back. It never grows wider or higher: it stays inside the pane.
    const drift = cloudCentre(time), dip = play ? Math.abs(play.cloud.x) : 0
    this.cloud.position.set(drift.x, drift.y - 0.3 * dip, CLOUD_AT.z)
    this.cloud.scale.set(1, 1 - 0.22 * dip, 1)
    // The ball rolls a little way along its block and back, turning as far as it rolls; the brick hops and lands.
    const roll = BALL_ROLL * wobble('ball')
    this.ball.position.set(PROP_AT.ball.x + roll, PROP_AT.ball.y, PROP_AT.ball.z)
    this.ball.rotation.z = -roll / BALL_RADIUS
    this.brick.position.set(PROP_AT.brick.x, BRICK_REST_Y + BRICK_HOP * Math.abs(wobble('brick')), PROP_AT.brick.z)
    if (this.blobs.count < BLOBS) this.blobs.setMatrixAt(this.blobs.count++, this.m.compose(this.v.set(PROP_AT.tree.x, 0.012, PROP_AT.tree.z + 0.1), this.q.identity(), this.s.set(2.4, 1, 1.3)))
    this.blobs.instanceMatrix.needsUpdate = true
    this.blobs.visible = this.blobs.count > 0
  }

  /** Flop's ears hang from the top of its head, swing a little behind its lean, and fling out or droop as it feels. */
  private swing(ear: THREE.Mesh, slot: number, side: number, top: number, pose: ActorPose): void {
    ear.visible = true
    ear.userData.jamObject = `creature-${slot}`
    // An ear swings out from where it hangs and never in across the face: the eyes stand proud of the face, and an ear lies flat on it.
    const out = 0.2 + 0.5 * pose.pat + 0.9 * Math.max(0, pose.ears) - 0.15 * Math.max(0, -pose.ears) - side * pose.lean * 1.5 + (1 - pose.squash) * 1.0
    this.q.setFromAxisAngle(this.v.set(0, 0, 1), side * Math.max(0.12, out))
    // In front of the body's face and behind its hands.
    ear.matrix.compose(this.v.set(side * 0.78, top - 0.42, CREATURE_DEPTH / 2 + EAR_DEPTH / 2 + 0.01), this.q, this.s.set(1, 1, 1)).premultiply(this.body)
    ear.matrixWorldNeedsUpdate = true
  }

  /** The middle of a thing a finger can land on. */
  private whereIs(target: Target, play: Play): THREE.Vector3 | null {
    if (target.type === 'hat') {
      if (target.hat >= play.hatCount) return null
      const pose = play.hatPose(target.hat), half = HAT_HEIGHT[play.hatKind(target.hat)] / 2
      return this.w.set(pose.x, pose.y + half * pose.up, pose.z - half * (1 - pose.up))
    }
    if (target.type === 'creature') {
      if (!play.has(target.who)) return null
      const pose = play.actorPose(target.who, this.pose)
      return this.w.set(pose.x, pose.y + this.pieces.cuts[play.kindOf(target.who)].top / 2, pose.z)
    }
    if (target.type === 'prop') return this.w.set(PROP_AT[target.prop].x, PROP_AT[target.prop].y, PROP_AT[target.prop].z)
    return target.type === 'arch' ? this.w.set(ARCH_X, 2.4, ARCH_Z) : null
  }

  private toScreen(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(x, y, z).project(this.camera)
    return out.set((out.x + 1) / 2 * this.width, (1 - out.y) / 2 * this.height, 0)
  }

  /** Where on the surface a point of the mat is drawn, in its own pixels. */
  screenOf(x: number, y: number, z: number): { x: number; y: number } {
    const at = this.toScreen(x, y, z, new THREE.Vector3())
    return { x: at.x, y: at.y }
  }

  private aim(x: number, y: number): THREE.Ray {
    this.ray.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera)
    return this.ray.ray
  }

  private floorUnder(x: number, y: number): { x: number; z: number } {
    const ray = this.aim(x, y)
    // A finger on the wall, above the mat's far edge, presses the mat at that edge.
    if (ray.direction.y > -0.02) return { x: ray.origin.x + ray.direction.x * 40, z: MAT_BACK + 0.5 }
    const t = -ray.origin.y / ray.direction.y
    return { x: ray.origin.x + ray.direction.x * t, z: Math.max(MAT_BACK + 0.5, ray.origin.z + ray.direction.z * t) }
  }

  /** What is under a finger. A small hand is given room: the nearest thing within its reach wins, and `but` (a hat in the hand) is passed over. */
  /** The mat under a finger, and nothing that stands on it: for a touch that is to be answered and to move nothing. */
  floorAt(x: number, y: number): Target {
    return { type: 'floor', ...this.floorUnder(x, y) }
  }

  pick(x: number, y: number, play: Play, but = -1): Target {
    let best: Target | null = null, bestScore = 1
    const centre = new THREE.Vector3(), edge = new THREE.Vector3()
    const tryFor = (target: Target, reach: number, favour = 1): void => {
      const at = this.whereIs(target, play)
      if (!at) return
      const cx = at.x, cy = at.y, cz = at.z
      this.toScreen(cx, cy, cz, centre)
      this.toScreen(cx + reach, cy, cz, edge)
      const score = Math.hypot(centre.x - x, centre.y - y) / Math.max(50, edge.x - centre.x) * favour
      if (score < bestScore) { bestScore = score; best = target }
    }
    for (let hat = 0; hat < play.hatCount; hat++) if (hat !== but) tryFor({ type: 'hat', hat }, HAT_REACH, 0.9)
    for (const who of play.cast) {
      const cut = this.pieces.cuts[play.kindOf(who)]
      tryFor({ type: 'creature', who }, Math.max(cut.reach, cut.top / 2) + 0.15)
    }
    tryFor({ type: 'arch' }, 2.4, 1.15)
    for (const prop of PROPS) tryFor({ type: 'prop', prop }, PROP_AT[prop].reach, 1.1)
    if (best) return best
    // Nothing near: the finger is on the foam floor, at the place its ray meets the mat; or past the mat's far edge, on the room behind it, which answers where the finger is as well.
    const floor = this.floorUnder(x, y), ray = this.aim(x, y), o = ray.origin, d = ray.direction
    const beyond = d.y > -0.02 || o.z + d.z * (-o.y / d.y) < MAT_BACK - 0.55
    const room = beyond ? roomUnder(o.x, o.y, o.z, d.x, d.y, d.z, play.time) : null
    return room ? { type: 'floor', ...floor, room } : { type: 'floor', ...floor }
  }

  /** Where a dragged thing is let go: on a creature (or the hat on its head), on the tile, or on the floor. A drag counts when it gets near. */
  letGoAt(x: number, y: number, play: Play, held: Target, from?: { x: number; y: number }): LetGo {
    const under = this.pick(x, y, play, held.type === 'hat' ? held.hat : -1)
    if (under.type === 'creature' && !(held.type === 'creature' && held.who === under.who)) return { on: 'creature', who: under.who }
    if (under.type === 'hat') {
      const seen = play.seen(under.hat)
      if (seen.at === 'head' && !(held.type === 'creature' && held.who === seen.who)) return { on: 'creature', who: seen.who }
    }
    const floor = this.floorUnder(x, y)
    if (Math.abs(floor.z - play.tileZ) < TILE_DEPTH / 2 + 0.4 && Math.abs(floor.x - tileX(play.hatCount)) < tileWidth(play.hatCount) / 2 + 0.4) return { on: 'tile' }
    // A drag counts when partly done: let go over the open floor at least half way along the straight line from where it began to a
    // creature, and close to that line, it is finished for the child. Only a drag that was plainly going to that creature counts:
    // one let go to the side of the line, or beyond the creature, or going nowhere near one, is let go where it is.
    if (from) {
      let nearest: string | null = null, left = Infinity
      const to = new THREE.Vector3()
      for (const who of play.cast) {
        if (held.type === 'creature' && held.who === who) continue
        const at = this.whereIs({ type: 'creature', who }, play)
        if (!at) continue
        this.toScreen(at.x, at.y, at.z, to)
        const lineX = to.x - from.x, lineY = to.y - from.y, long = Math.hypot(lineX, lineY)
        if (long < AIMED_FROM_PX) continue
        const along = ((x - from.x) * lineX + (y - from.y) * lineY) / (long * long), aside = Math.abs((x - from.x) * lineY - (y - from.y) * lineX) / long
        const still = Math.hypot(to.x - x, to.y - y)
        if (along >= COUNTS_FROM && along <= 1 && aside <= AIMED_WITHIN * long && still < left) { nearest = who; left = still }
      }
      if (nearest) return { on: 'creature', who: nearest }
    }
    return { on: 'floor', ...floor }
  }

  /** Where a hat in the hand floats under a finger: on a wall in front of the row, and over the floor in front of that. */
  handPoint(x: number, y: number): { x: number; y: number; z: number } {
    const ray = this.aim(x, y), wall = (HOLD_Z - ray.origin.z) / ray.direction.z, wallY = ray.origin.y + ray.direction.y * wall
    if (wallY >= CARRY_Y) return { x: ray.origin.x + ray.direction.x * wall, y: wallY, z: HOLD_Z }
    const t = (CARRY_Y - ray.origin.y) / ray.direction.y
    return { x: ray.origin.x + ray.direction.x * t, y: CARRY_Y, z: Math.max(HOLD_Z, Math.min(TILE_Z + 4, ray.origin.z + ray.direction.z * t)) }
  }

  dispose(): void {
    this.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
    for (const geometry of [...Object.values(this.pieces.hats), ...Object.values(this.pieces.bodies)]) geometry.dispose()
    for (const material of [this.foam.stippled, this.foam.plain, this.dots.material, this.blobs.material, this.glows.material, this.hand.material]) (material as THREE.Material).dispose()
    this.foam.stipple.dispose()
    for (const texture of this.textures) texture.dispose()
  }
}
