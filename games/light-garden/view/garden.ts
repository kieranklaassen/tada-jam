import * as THREE from 'three'
import { CREATURE_SCALE } from '../bodies'
import { pieceHeight, type CreatureSim, type GardenController, type PieceSim } from '../controller'
import { isAwake } from '../creatures'
import { KNOB, LAMP_LENS, PANEL, type CreatureKind } from '../layout'
import { BLUE, END_BOUNDS, GREEN, MAX_SEGMENTS, RED, type Mask } from '../optics'
import type { TierSettings } from '../tiers'
import { TIERS, TOP_TIER } from '../tiers'
import { BeamRibbon, SpriteBatch } from './batches'
import { creatureGeometry, EYES, panelGeometry, pieceGeometry, roomGeometry, tableGeometry } from './geometry'
import { GLOW_LAYER } from './glow'
import { GhostHand } from './hand'
import { beamMaterial, FACING, glassMaterial, KIND, matteMaterial, panelMaterial, roomMaterial, SHAPE, spriteMaterial, type GlassUniforms } from './materials'
import { CREATURE_LOOK, lightColour, PALETTE, PIECE_LOOK } from './palette'

// The whole scene, built once and updated in place every frame from the
// controller: glass pieces and creatures (opaque fake glass), the beam
// ribbon, one batch of additive light sprites, one batch of shadows and eyes,
// and the ghost hand. Nothing here allocates per frame.

type GlassMesh = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial & { uniforms: GlassUniforms }>

type PieceView = { sim: PieceSim; mesh: GlassMesh; lit: number; knob: number }
/** `fed`: per primary (red, green, blue), how strongly that part of its dream is already reaching it. */
type CreatureView = { sim: CreatureSim; mesh: GlassMesh; awake: number; dream: number; fed: Float32Array }

const CREATURE_KIND: Readonly<Record<CreatureKind, number>> = { jelly: KIND.jelly, moth: KIND.moth, snail: KIND.snail, fish: KIND.fish }
const BITS = [RED, GREEN, BLUE] as const
const TAU = Math.PI * 2

const approach = (value: number, target: number, rate: number, dt: number) => value + (target - value) * (1 - Math.exp(-rate * dt))

export class GardenView {
  readonly root = new THREE.Group()
  private readonly pieces: PieceView[]
  private readonly creatures: CreatureView[]
  private readonly light = new SpriteBatch(320, spriteMaterial(true))
  private readonly shade = new SpriteBatch(48, spriteMaterial(false))
  private readonly ribbon = new BeamRibbon(MAX_SEGMENTS, beamMaterial())
  private readonly panel: ReturnType<typeof panelMaterial>
  private readonly hand = new GhostHand()
  private readonly disposables: { dispose(): void }[] = []
  private settings: TierSettings = TIERS[TOP_TIER]
  private readonly rgb = new Float32Array(3)
  private readonly eye = new THREE.Vector3()
  private lastT = 0

  constructor(garden: GardenController) {
    const matte = matteMaterial()
    const room = new THREE.Mesh(roomGeometry(), roomMaterial())
    const table = new THREE.Mesh(tableGeometry(), matte)
    this.panel = panelMaterial()
    const panel = new THREE.Mesh(panelGeometry(), this.panel)
    room.name = 'room'
    table.name = 'table'
    panel.name = 'panel'
    for (const mesh of [room, table, panel]) {
      mesh.matrixAutoUpdate = false
      this.root.add(mesh)
      this.disposables.push(mesh.geometry, mesh.material as THREE.Material)
    }

    const geometries = new Map<string, THREE.BufferGeometry>()
    this.pieces = garden.pieces.map((sim) => {
      let geometry = geometries.get(sim.spec.kind)
      if (!geometry) {
        geometry = pieceGeometry(sim.spec.kind)
        geometries.set(sim.spec.kind, geometry)
        this.disposables.push(geometry)
      }
      const material = glassMaterial(PIECE_LOOK[sim.spec.id], KIND.piece)
      this.disposables.push(material)
      const mesh = new THREE.Mesh(geometry, material) as GlassMesh
      mesh.name = sim.spec.id
      const knob = sim.pose.inTray ? 0 : 1
      mesh.morphTargetInfluences![0] = 1 - knob
      this.root.add(mesh)
      return { sim, mesh, lit: 0, knob }
    })
    this.creatures = garden.creatures.map((sim) => {
      const geometry = creatureGeometry(sim.c.kind)
      const material = glassMaterial(CREATURE_LOOK[sim.c.kind], CREATURE_KIND[sim.c.kind])
      this.disposables.push(geometry, material)
      const mesh = new THREE.Mesh(geometry, material) as GlassMesh
      mesh.name = sim.c.kind
      mesh.rotation.order = 'YXZ'
      this.root.add(mesh)
      return { sim, mesh, awake: 0, dream: 1, fed: new Float32Array(3) }
    })

    this.shade.mesh.name = 'shadows-and-eyes'
    this.ribbon.mesh.name = 'beams'
    this.light.mesh.name = 'light'
    this.hand.mesh.name = 'ghost-hand'
    this.shade.mesh.renderOrder = 1
    this.ribbon.mesh.renderOrder = 2
    this.light.mesh.renderOrder = 3
    for (const mesh of [this.ribbon.mesh, this.light.mesh]) mesh.layers.enable(GLOW_LAYER)
    this.root.add(this.shade.mesh, this.ribbon.mesh, this.light.mesh, this.hand.mesh)
    this.disposables.push(this.shade, this.ribbon, this.light, this.hand, this.shade.mesh.material as THREE.Material, this.ribbon.mesh.material as THREE.Material, this.light.mesh.material as THREE.Material)
  }

  setTier(settings: TierSettings): void {
    this.settings = settings
  }

  update(garden: GardenController, camera: THREE.Camera): void {
    const t = garden.t
    const dt = Math.min(0.1, Math.max(0, t - this.lastT))
    this.lastT = t
    const glow = garden.guide.glow
    this.light.begin()
    this.shade.begin()

    for (let i = 0; i < this.pieces.length; i++) this.updatePiece(this.pieces[i], t, dt, glow)
    for (let i = 0; i < this.creatures.length; i++) this.updateCreature(this.creatures[i], t, dt, glow)
    this.updateBeams(garden, t)
    this.updateRipples(garden, t)
    this.updateGuide(garden, camera)

    this.panel.uniforms.uTime.value = t
    this.panel.uniforms.uWave.value = t - garden.gardenAt
    ;(this.light.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t
    ;(this.ribbon.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t
    this.light.end()
    this.shade.end()
  }

  private updatePiece(view: PieceView, t: number, dt: number, glow: number): void {
    const { sim, mesh } = view
    const u = mesh.material.uniforms
    const inTray = sim.pose.inTray && sim.flying === 0
    const base = inTray ? 0.15 : 0
    const height = pieceHeight(sim)
    const lift = height - base
    mesh.position.set(sim.x, height, sim.y)
    mesh.rotation.y = -(sim.angle.x + sim.wobble.x)
    const squash = sim.squash.x
    mesh.scale.set(1 - squash * 0.35, 1 + squash * 0.9, 1 - squash * 0.35)

    const kind = sim.spec.kind
    let target = 0
    if (kind === 'lamp') target = inTray || sim.flying > 0 ? 0.04 : 0.16
    else if (kind === 'filter') target = sim.input & sim.spec.mask ? 1 : sim.input ? 0.3 : 0
    else if (kind === 'prism') target = sim.input ? 1 : 0
    // Light only bounces off a mirror, so it glints rather than glowing through like filter or prism glass.
    else target = sim.lit ? 0.2 : 0
    view.lit = approach(view.lit, target, 10, dt)
    view.knob = approach(view.knob, !sim.pose.inTray && sim.flying === 0 ? 1 : 0, 9, dt)
    u.uLit.value = view.lit
    u.uGlow.value = glow * 0.75 + (sim.heldBy !== null || sim.knobBy !== null ? 0.35 : 0)
    u.uUnder.value = inTray ? 0.12 : 1
    mesh.morphTargetInfluences![0] = 1 - view.knob
    u.uTime.value = t

    const r = sim.spec.radius
    const shadowAlpha = (inTray ? 0.3 : 0.42) / (1 + lift * 0.18)
    this.shade.push(sim.x + lift * 0.25, base + 0.06, sim.y + lift * 0.35, r * 2.3 * (1 + lift * 0.07), 0.02, 0.06, 0.07, shadowAlpha, SHAPE.shadow, FACING.flat, -(sim.angle.x + sim.wobble.x), kind === 'lamp' || kind === 'prism' ? 1 : 1.5)

    const halo = this.settings.halo
    if (kind === 'lamp' && !inTray && sim.flying === 0) {
      const angle = sim.angle.x + sim.wobble.x
      const lx = sim.x + Math.cos(angle) * (LAMP_LENS + 0.2)
      const lz = sim.y + Math.sin(angle) * (LAMP_LENS + 0.2)
      const flicker = 0.92 + 0.08 * Math.sin(t * 7.3 + sim.spec.slot)
      this.light.push(lx, 1.9 + lift, lz, 10 * halo, 1, 0.95, 0.82, 0.55 * flicker, SHAPE.glow, FACING.billboard)
      this.light.push(lx, 1.9 + lift, lz, 5.5, 1, 1, 0.95, 0.85, SHAPE.sparkle, FACING.billboard, t * 0.25)
      this.light.push(sim.x, 4.2 + lift, sim.y, 9 * halo, 1, 0.9, 0.7, 0.3 * flicker, SHAPE.glow, FACING.billboard)
      this.light.push(sim.x + Math.cos(angle) * 7, 0.08, sim.y + Math.sin(angle) * 7, 11, 1, 0.95, 0.85, 0.22, SHAPE.glow, FACING.flat)
    }
    if ((kind === 'filter' || kind === 'prism') && view.lit > 0.02) {
      const look = PIECE_LOOK[sim.spec.id].core
      this.light.push(sim.x, 2.8 + lift, sim.y, 11 * halo, look[0], look[1], look[2], 0.32 * view.lit, SHAPE.glow, FACING.billboard)
      if (this.settings.caustics) {
        lightColour(kind === 'filter' ? sim.input & sim.spec.mask : sim.input, this.rgb)
        this.light.push(sim.x, 0.07, sim.y, 13, this.rgb[0], this.rgb[1], this.rgb[2], 0.4 * view.lit, SHAPE.caustic, FACING.flat, 0, sim.spec.slot * 0.37)
      }
    }
    if (glow > 0.02 && !inTray) this.light.push(sim.x, 0.08, sim.y, r * 3.4, 0.85, 1, 0.97, glow * 0.22, SHAPE.glow, FACING.flat)
    if (glow > 0.02 && inTray) this.light.push(sim.x, 0.3, sim.y, 13, 0.85, 1, 0.97, glow * 0.3, SHAPE.glow, FACING.flat)
    if (view.knob > 0.5 && glow > 0.02) {
      const knob = KNOB[kind]
      const a = sim.angle.x + sim.wobble.x + knob.angle
      this.light.push(sim.x + Math.cos(a) * knob.distance, 0.1, sim.y + Math.sin(a) * knob.distance, 5, 0.85, 1, 0.97, glow * 0.35, SHAPE.ring, FACING.flat, 0, 0.45 + 0.1 * Math.sin(t * 2.4))
    }
  }

  private updateCreature(view: CreatureView, t: number, dt: number, glow: number): void {
    const { sim, mesh } = view
    const c = sim.c
    const pose = sim.pose
    const u = mesh.material.uniforms
    const awake = isAwake(c) ? 1 : 0
    view.awake = approach(view.awake, awake, 3, dt)
    const alt = sim.alt
    mesh.position.set(sim.x, alt, sim.y)
    mesh.rotation.set(pose.roll, -pose.heading, pose.pitch)
    const stretch = pose.stretch
    const squash = pose.squash
    mesh.scale.set(stretch * CREATURE_SCALE, squash * CREATURE_SCALE, CREATURE_SCALE / Math.sqrt(Math.max(0.2, stretch * squash)))
    u.uAnim.value.set(pose.a, pose.b, pose.c, 0)
    u.uTime.value = t
    // Awake glass glows at the rim and in its halo; the body keeps its markings instead of washing to white.
    u.uLit.value = pose.glow * 0.3
    u.uDim.value = 0.84 + 0.16 * view.awake
    u.uGlow.value = (sim.heldBy !== null ? 0.35 : 0) + 0.45 * pose.glow * view.awake
    u.uUnder.value = 1 / (1 + alt * 0.25)

    const r = c.radius
    this.shade.push(sim.x + alt * 0.22, 0.06, sim.y + alt * 0.3, r * 2.3 * CREATURE_SCALE * (1 + alt * 0.06), 0.02, 0.06, 0.07, 0.42 / (1 + alt * 0.16), SHAPE.shadow, FACING.flat, -pose.heading, 1.4)

    // Eyes: closed arcs asleep, open with a glint awake.
    mesh.updateMatrix()
    const spec = EYES[c.kind]
    for (let side = -1; side <= 1; side += 2) {
      if (c.kind === 'snail') {
        const len = Math.max(0.12, side > 0 ? pose.b : pose.c)
        const ext = 0.28 + 0.72 * pose.a
        const rootX = -0.4 + (2.7 + 0.4) * ext
        this.eye.set(rootX + (spec.x - 2.7) * len, 1.9 + (spec.y - 1.9) * len, side * spec.z)
      } else this.eye.set(spec.x, spec.y, side * spec.z)
      this.eye.applyMatrix4(mesh.matrix)
      this.shade.push(this.eye.x, this.eye.y, this.eye.z, spec.size * 2.1 * CREATURE_SCALE, 0.07, 0.09, 0.12, 0.95, SHAPE.eye, FACING.front, 0, pose.eyes)
    }

    const look = CREATURE_LOOK[c.kind].core
    const halo = this.settings.halo
    const shine = pose.glow * view.awake
    if (shine > 0.02) {
      this.light.push(sim.x, alt + 3, sim.y, 16 * halo, look[0], look[1], look[2], 0.3 * shine, SHAPE.glow, FACING.billboard)
      lightColour(c.wants, this.rgb)
      this.light.push(sim.x, 0.08, sim.y, 17, this.rgb[0], this.rgb[1], this.rgb[2], 0.3 * shine / (1 + alt * 0.08), SHAPE.glow, FACING.flat)
    }
    if (c.phase === 'waking' && c.phaseT < 1.2) {
      const k = c.phaseT / 1.2
      for (let i = 0; i < 5; i++) {
        const a = i * (TAU / 5) + t * 0.6
        const d = 3 + k * 7
        this.light.push(sim.x + Math.cos(a) * d, alt + 3 + k * 4, sim.y + Math.sin(a) * d, 3.2, look[0], look[1], look[2], 0.8 * (1 - k), SHAPE.sparkle, FACING.billboard, a)
      }
    }

    // The dream: sleepers dream of the colour that wakes them. Mixes are drawn
    // as their primaries drifting together, and additive light shows the sum.
    const dreaming = c.phase === 'asleep' && sim.heldBy === null ? 1 : 0
    view.dream = approach(view.dream, dreaming, dreaming ? 1.5 : 6, dt)
    if (view.dream > 0.02) this.dream(view, t, dt, glow)
  }

  private dream(view: CreatureView, t: number, dt: number, glow: number): void {
    const c = view.sim.c
    const poked = Math.max(0, 1 - (t - c.pokeAt) / 2.2)
    const stir = Math.max(0, 1 - (t - c.stirAt) / 1.6, poked)
    // The want dreams out loud; the other sleepers dream quietly until the child pauses and the glow comes,
    // or pokes one, which tells what it dreams of.
    const voice = 0.3 + 0.7 * Math.max(view.sim.carry.want, glow, poked)
    const bob = Math.sin(t * 1.1 + c.index * 1.7) * (0.5 + 0.7 * view.sim.carry.want)
    const x = c.bed.x - 1.2
    const y = 10.5 + bob
    const z = c.bed.y - 3.5
    const alpha = view.dream * voice * (0.62 + 0.3 * glow + 0.4 * stir)
    const size = 4.4 * (0.72 + 0.28 * voice) * (1 + 0.12 * stir)
    for (let i = 1; i <= 2; i++) {
      const k = i / 3
      this.light.push(c.bed.x + (x - c.bed.x) * k, 5 + (y - 5) * k, c.bed.y + (z - c.bed.y) * k, 1 + i * 0.5, 0.9, 1, 1, alpha * 0.5, SHAPE.glow, FACING.billboard)
    }
    let count = 0
    for (let b = 0; b < 3; b++) if (c.wants & BITS[b]) count++
    const breathe = 0.5 + 0.5 * Math.cos(t * 0.9 + c.index)
    const spread = count > 1 ? size * (0.2 + 0.26 * breathe) : 0
    let n = 0
    for (let b = 0; b < 3; b++) {
      const bit = BITS[b]
      if (!(c.wants & bit)) continue
      const a = (n / count) * TAU + Math.PI / 2 + (count === 2 ? Math.PI / 2 : 0)
      // A primary that already reaches it swells and sparkles: the part of the mix still missing is the one left dim.
      view.fed[b] = approach(view.fed[b], c.light & bit ? 1 : 0, 5, dt)
      const fed = view.fed[b]
      const ox = x + Math.cos(a) * spread
      const oy = y + Math.sin(a) * spread * 0.9
      lightColour(bit as Mask, this.rgb)
      this.light.push(ox, oy, z, size * (count > 1 ? 0.78 : 1) * (1 + 0.3 * fed), this.rgb[0], this.rgb[1], this.rgb[2], alpha * (1 + 0.7 * fed), SHAPE.orb, FACING.billboard)
      if (fed > 0.05) this.light.push(ox, oy, z + 0.6, 3.4, 1, 1, 1, 0.55 * fed * view.dream, SHAPE.sparkle, FACING.billboard, t * 0.5 + b)
      n++
    }
  }

  private updateBeams(garden: GardenController, t: number): void {
    const beams = garden.beams
    this.ribbon.update(beams, 1)
    for (let e = 0; e < beams.endCount; e++) {
      if (beams.endKind[e] !== END_BOUNDS) continue
      lightColour(beams.endMask[e], this.rgb)
      const x = beams.endX[e]
      const z = beams.endY[e]
      this.light.push(x, 0.08, z, 7, this.rgb[0], this.rgb[1], this.rgb[2], 0.5, SHAPE.caustic, FACING.flat, 0, e * 0.61)
      this.light.push(x, 1.9, z, 3.6, this.rgb[0], this.rgb[1], this.rgb[2], 0.6, SHAPE.sparkle, FACING.billboard, t * 0.4 + e)
    }
    const motes = beams.count > 0 ? this.settings.motes : 0
    for (let i = 0; i < motes; i++) {
      const s = (i * 7) % beams.count
      if (beams.inside[s]) continue
      const ax = beams.ax[s]
      const az = beams.ay[s]
      const dx = beams.bx[s] - ax
      const dz = beams.by[s] - az
      const length = Math.hypot(dx, dz)
      if (length < 2) continue
      const u = (t * (2.2 + (i % 5) * 0.4)) / length + i * 0.618
      const k = u - Math.floor(u)
      const wobble = Math.sin(i * 12.9898) * 1.4
      const px = ax + dx * k - (dz / length) * wobble
      const pz = az + dz * k + (dx / length) * wobble
      if (px < PANEL.minX || px > PANEL.maxX || pz < PANEL.minY || pz > PANEL.maxY) continue
      lightColour(beams.mask[s], this.rgb)
      const fade = Math.sin(k * Math.PI)
      this.light.push(px, 1.2 + Math.sin(t * 1.3 + i) * 1.1, pz, 0.9, this.rgb[0], this.rgb[1], this.rgb[2], 0.8 * fade, SHAPE.mote, FACING.billboard)
    }
  }

  private updateRipples(garden: GardenController, t: number): void {
    for (let i = 0; i < garden.ripples.length; i++) {
      const ripple = garden.ripples[i]
      const age = t - ripple.t0
      const life = 1.1 + ripple.size * 0.5
      if (age < 0 || age > life) continue
      const k = age / life
      if (ripple.mask) lightColour(ripple.mask, this.rgb)
      else {
        this.rgb[0] = PALETTE.panelRim[0]
        this.rgb[1] = PALETTE.panelRim[1]
        this.rgb[2] = PALETTE.panelRim[2]
      }
      this.light.push(ripple.x, 0.09, ripple.y, 10 + ripple.size * 26 * Math.sqrt(k), this.rgb[0], this.rgb[1], this.rgb[2], 0.75, SHAPE.ring, FACING.flat, 0, 0.35 + 0.6 * k)
    }
  }

  private updateGuide(garden: GardenController, camera: THREE.Camera): void {
    const guide = garden.guide
    const hand = guide.hand
    this.hand.update(guide.handVisible, hand.x, hand.y, hand.press, hand.opacity, camera)
    if (!guide.handVisible) return
    if (hand.press > 0.2) this.light.push(hand.x, 0.1, hand.y, 7, 0.9, 1, 0.97, hand.press * hand.opacity * 0.5, SHAPE.ring, FACING.flat, 0, 0.3 + 0.2 * hand.press)
    const hint = guide.hint
    if (hint && hint.to && hand.press > 0.5) {
      // What the ghost carries: the piece's glass glow, or the sleeper's own colour.
      const look = hint.piece ? PIECE_LOOK[hint.piece].core : CREATURE_LOOK[garden.creatures[hint.sleeper].c.kind].core
      this.light.push(hand.x, 1.6, hand.y, 9, look[0], look[1], look[2], hand.opacity * 0.4 * hand.press, SHAPE.glow, FACING.billboard)
    }
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose()
  }
}
