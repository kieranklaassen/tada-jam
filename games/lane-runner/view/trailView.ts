import * as THREE from 'three'
import { BACKDROP, TIERS, type Tier } from '../config'
import { shotFor, type Shot } from '../camera'
import { fromRows, type Plaque } from '../beads'
import { BEADS } from '../palette'
import { eyeTilesOf } from '../placing'
import { CLOUD_WIDTHS, cloudAt, cloudPlaque, handPlaque, sunAt, sunPlaque } from '../sky'
import { laidOut, type Laid } from '../props'
import { POND, layOut, makeShapes, pondPlaque, type Standing } from '../scenery'
import { FADE, LOOSE_SIZE } from '../spray'
import { everyFigure, type Stage } from '../stage'
import { PLACES, TRAIL_HALF, offset, shownAt, wrap } from '../trail'
import { Atlas } from './atlas'
import { LONG, MOST_LIGHTS, MOST_PLAQUES, inSight as seen } from './budget'
import { LIES, STAND } from './heights'
import { BOARD_TILE, TRAIL_TILE, boardTexture, glowTexture, shadeTexture, skyTexture, trailTexture } from './paint'
import { Quads } from './quads'

// Everything drawn: one renderer on the Mount's canvas, the board and the
// trail on it, the far sky, and every plaque of beads as a flat rectangle
// that shows its piece of a picture painted at mount. The fox stands still
// at the middle of this world and the trail is drawn past it, so no number
// grows as the fox runs on. It shows what the stage holds and decides
// nothing.
//
// A frame is ten draws at most and a few thousand triangles: the floor, the
// trail, the sky, the sun and clouds, the setting, the soft darks, everyone
// and everything of the stage, the loose beads, the idle light and the hand.

/** The colour the far end of the trail fades into. */
const HAZE = '#d6eef9'
const FLOOR_WIDE = 1500
const FLOOR_LONG = 1200
/** The floor reaches this far behind the fox; the rest of its length lies ahead. */
const FLOOR_BEHIND = 200
/** Pixels to a bead in the two pictures: the characters and what they hold, and the setting. */
const FIGURE_PX = 12
const SETTING_PX = 8
const MOST = 2048

export class TrailView {
  readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 20, 2400)
  private readonly figureAtlas: Atlas
  private readonly settingAtlas: Atlas
  private readonly figures: Quads
  private readonly loose: Quads
  private readonly setting: Quads
  private readonly skyQuads: Quads
  private readonly hand: Quads
  private readonly handTile: Plaque
  private readonly beadTiles: Plaque[]
  private readonly shapes = makeShapes()
  private readonly standing: Standing[] = layOut()
  private readonly laid = laidOut()
  private readonly pond: Laid
  private readonly sun: Plaque
  private readonly cloudTiles: Plaque[]
  private readonly floor: THREE.Mesh
  private readonly trail: THREE.Mesh
  private readonly sky: THREE.Mesh
  private readonly shades: THREE.InstancedMesh
  private readonly lights: THREE.InstancedMesh
  private readonly textures: THREE.Texture[] = []
  private readonly fog: THREE.Fog
  private readonly matrix = new THREE.Matrix4()
  private readonly colour = new THREE.Color()
  private readonly size = new THREE.Vector3()
  private tier: Tier = TIERS[0]
  private width = 1
  private height = 1
  private leanX = 0
  /** The shot the last frame was drawn with: the Mount reads a finger against it. */
  shot: Shot = shotFor(1, 1)

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(new THREE.Color(BACKDROP))
    this.fog = new THREE.Fog(new THREE.Color(HAZE), 300, 600)
    this.scene.fog = this.fog
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    const keep = <T extends THREE.Texture>(texture: T): T => {
      this.textures.push(texture)
      return texture
    }

    // The two pictures. Loose beads, drops, burrs and the like are painted as separate round beads.
    const figurePlaques: Plaque[] = [], round = new Set<Plaque>()
    for (const figure of everyFigure()) {
      for (const part of figure.parts) {
        figurePlaques.push(part.plaque)
        if (part.loose) round.add(part.plaque)
        for (const eye of part.eyes ?? []) figurePlaques.push(...eyeTilesOf(eye))
      }
    }
    this.handTile = handPlaque()
    this.beadTiles = BEADS.map((bead) => fromRows([bead.key]))
    for (const tile of this.beadTiles) round.add(tile)
    this.figureAtlas = new Atlas([...figurePlaques, this.handTile, ...this.beadTiles], round, FIGURE_PX, MOST, anisotropy)
    this.pond = { name: 'pond', plaque: pondPlaque(), x: POND.x, s: POND.s - POND.halfS, lift: LIES.laid }
    this.sun = sunPlaque()
    this.cloudTiles = CLOUD_WIDTHS.map(cloudPlaque)
    const settingPlaques: Plaque[] = [this.pond.plaque, this.laid.stream.plaque, this.laid.mud.plaque, ...this.laid.puddles.map((one) => one.plaque), this.sun, ...this.cloudTiles]
    for (const kind of Object.values(this.shapes)) settingPlaques.push(...kind)
    this.settingAtlas = new Atlas(settingPlaques, new Set(), SETTING_PX, MOST, anisotropy)

    // The floor: the board, and the trail laid along its middle.
    const board = keep(boardTexture(anisotropy))
    board.repeat.set(FLOOR_WIDE / BOARD_TILE, FLOOR_LONG / BOARD_TILE)
    this.floor = this.lying(FLOOR_WIDE, FLOOR_LONG, new THREE.MeshBasicMaterial({ map: board }), 'board')
    const laid = keep(trailTexture(anisotropy))
    laid.repeat.set(1, FLOOR_LONG / TRAIL_TILE)
    this.trail = this.lying(TRAIL_HALF * 2, FLOOR_LONG, new THREE.MeshBasicMaterial({ map: laid }), 'trail')
    this.trail.position.y = LIES.trail
    for (const mesh of [this.floor, this.trail]) {
      mesh.position.z = FLOOR_BEHIND - FLOOR_LONG / 2
      this.scene.add(mesh)
    }

    // The far sky, which never comes nearer, with the sun and the clouds in it.
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(3600, 560), new THREE.MeshBasicMaterial({ map: keep(skyTexture(HAZE)), fog: false, depthWrite: false }))
    this.sky.name = 'sky'
    this.sky.position.set(0, 190, -1100)
    this.sky.renderOrder = -2
    this.scene.add(this.sky)
    this.skyQuads = new Quads(this.settingAtlas, 4, 'sun-and-clouds', { fog: false })
    this.scene.add(this.skyQuads.mesh)

    this.setting = new Quads(this.settingAtlas, this.standing.length + 8, 'setting')
    this.scene.add(this.setting.mesh)

    // The soft dark under whatever stands, in one draw.
    const lying = new THREE.PlaneGeometry(1, 1)
    lying.rotateX(-Math.PI / 2)
    this.shades = new THREE.InstancedMesh(lying, new THREE.MeshBasicMaterial({ map: keep(shadeTexture()), transparent: true, depthWrite: false }), this.standing.length + 64)
    this.shades.name = 'shades'
    this.shades.frustumCulled = false
    this.shades.renderOrder = 1
    this.scene.add(this.shades)

    this.figures = new Quads(this.figureAtlas, MOST_PLAQUES, 'plaques')
    this.scene.add(this.figures.mesh)
    this.loose = new Quads(this.figureAtlas, TIERS[0].loose, 'loose-beads')
    this.scene.add(this.loose.mesh)

    // The idle guidance: pools of light, and the ghost hand over everything.
    this.lights = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: keep(glowTexture()), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), MOST_LIGHTS)
    this.lights.name = 'idle-light'
    this.lights.frustumCulled = false
    this.lights.renderOrder = 2
    this.lights.count = 0
    this.scene.add(this.lights)
    this.hand = new Quads(this.figureAtlas, 1, 'ghost-hand', { fog: false, transparent: true, overlay: true })
    this.hand.mesh.renderOrder = 8
    this.scene.add(this.hand.mesh)

    this.setTier(TIERS[0])
    // Every program is compiled now, so the first run does not stall on one.
    this.renderer.compile(this.scene, this.camera)
  }

  /** The bare backdrop: what is shown until the saved slot has been read. */
  blank(): void {
    this.renderer.clear()
  }

  private lying(wide: number, long: number, material: THREE.Material, name: string): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(wide, long)
    geometry.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    return mesh
  }

  /** A quality tier changes how far things are drawn and how sharp the far beads are: never what happens, and never how a thing is made. */
  setTier(tier: Tier): void {
    this.tier = tier
    this.fog.near = tier.reach * 0.55
    this.fog.far = tier.reach
    const anisotropy = Math.min(tier.anisotropy, this.renderer.capabilities.getMaxAnisotropy())
    for (const texture of [this.figureAtlas.texture, this.settingAtlas.texture]) {
      if (texture.anisotropy === anisotropy) continue
      texture.anisotropy = anisotropy
      texture.needsUpdate = true
    }
  }

  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
  }

  private aim(foxX: number, along: number): void {
    const shot = shotFor(this.width, this.height, foxX, along)
    this.shot = shot
    this.camera.fov = shot.fov
    this.camera.position.set(shot.eye[0], shot.eye[1], shot.eye[2])
    this.camera.lookAt(shot.target[0], shot.target[1], shot.target[2])
    this.camera.updateProjectionMatrix()
  }

  /**
   * Lays the frame out from the stage. `at` is where the fox is along the trail and `foxX` how far right of the
   * trail's middle; `puddle` is whether a slop has made the puddle on the mud; `seconds` is the frame's step and
   * `t` the attended clock, for what only drifts.
   */
  update(seconds: number, t: number, stage: Stage, at: number, foxX: number, puddle: boolean): void {
    const reach = this.tier.reach
    // The camera leans after the fox, a little late; where it stands follows only where the fox is.
    this.leanX += (foxX - this.leanX) * (1 - Math.exp(-seconds * 7))
    if (seconds === 0) this.leanX = foxX
    this.aim(this.leanX, offset(PLACES.shelf, at))

    // The floor slides under the fox: only its picture moves.
    const near = this.floor.position.z + FLOOR_LONG / 2
    const board = (this.floor.material as THREE.MeshBasicMaterial).map!, laid = (this.trail.material as THREE.MeshBasicMaterial).map!
    board.offset.y = (wrap(at - near) / BOARD_TILE) % 1
    laid.offset.y = (wrap(at - near) / TRAIL_TILE) % 1
    // The board's picture is as wide as the floor is not a whole number of tiles: keep its middle on the trail's middle.
    board.offset.x = (-FLOOR_WIDE / 2 / BOARD_TILE) % 1

    const ahead = (s: number): number => shownAt(at, s, reach)
    const inSight = (d: number, long = 0): boolean => seen(d, reach, long)
    let shade = 0
    const shadeAt = (x: number, z: number, wide: number, deep: number): void => {
      this.matrix.makeScale(wide, 1, deep)
      this.matrix.setPosition(x, LIES.shade, z)
      this.shades.setMatrixAt(shade++, this.matrix)
    }

    // The sun and the clouds, far off.
    const sky = this.skyQuads
    sky.begin()
    const sun = sunAt()
    sky.upright(this.sun, sun.x, sun.y, sun.z, this.sun.w * sun.scale, 0, 0, this.sun.h * sun.scale)
    this.cloudTiles.forEach((cloud, i) => {
      const at = cloudAt(i, t)
      sky.upright(cloud, at.x, at.y, at.z, cloud.w * at.scale, 0, 0, cloud.h * at.scale)
    })
    sky.end()

    // The setting: what stands round the trail, and what lies on it.
    const setting = this.setting
    setting.begin()
    for (const thing of this.standing) {
      const d = ahead(thing.s)
      if (!inSight(d)) continue
      const plaque = this.shapes[thing.kind][thing.shape]
      setting.upright(plaque, thing.x, STAND + plaque.h / 2, -(d + thing.deep), plaque.w, 0, 0, plaque.h)
      shadeAt(thing.x, -(d + thing.deep) + 1, plaque.w * 1.25, 7)
    }
    const lay = (one: Laid, lift: number): void => {
      const d = ahead(one.s)
      if (!inSight(d, one.plaque.h)) return
      setting.flat(one.plaque, one.x, lift, -(d + one.plaque.h / 2), one.plaque.w, one.plaque.h)
    }
    lay(this.pond, LIES.laid)
    lay(this.laid.stream, LIES.laid)
    lay(this.laid.mud, LIES.laid)
    if (puddle) for (const one of this.laid.puddles) lay(one, LIES.puddle)
    setting.end()

    // Everyone and everything of the stage.
    const figures = this.figures
    figures.begin()
    for (const item of stage.items) {
      const d = item.key === 'fox' ? 0 : ahead(item.s)
      if (!inSight(d, LONG)) continue
      const z0 = -d + item.z
      for (let i = item.from; i < item.to; i++) {
        const quad = stage.quads[i]
        if (quad.flat) figures.flat(quad.tile, item.x + quad.x, quad.y, z0 + quad.z, quad.ax, quad.by, item.key)
        else figures.upright(quad.tile, item.x + quad.x, STAND + item.y + quad.y, z0 + quad.z, quad.ax, quad.ay, quad.bx, quad.by, item.key)
      }
      if (item.shade > 0) {
        // Its soft dark lies under it and draws in as it leaves the board.
        const lift = 1 / (1 + Math.max(0, item.y + item.bounds.minY) * 0.06)
        shadeAt(item.x + (item.bounds.minX + item.bounds.maxX) / 2, z0, (item.bounds.maxX - item.bounds.minX) * 1.15 * lift, item.shade * lift)
      }
    }
    figures.end()
    this.shades.count = shade
    this.shades.instanceMatrix.needsUpdate = true

    // Loose beads, shrinking away at the end.
    const loose = this.loose
    loose.begin()
    const beads = stage.spray.beads
    const count = Math.min(beads.length, this.tier.loose)
    for (let i = 0; i < count; i++) {
      const bead = beads[i]
      const size = LOOSE_SIZE * Math.min(1, bead.life / FADE)
      // A round bead looks the same however it turns, so it is drawn square to the child and no corner of it dips.
      loose.upright(this.beadTiles[bead.colour - 1], bead.x, STAND + bead.y, -ahead(bead.s), size, 0, 0, size)
    }
    loose.end()

    // What an idle child is shown.
    let light = 0
    for (const one of stage.lights) {
      if (light >= MOST_LIGHTS) break
      const z = -ahead(one.s) + one.z
      if (one.flat) {
        this.matrix.makeRotationX(-Math.PI / 2)
        this.matrix.scale(this.size.set(one.wide, one.tall, 1))
        this.matrix.setPosition(one.x, LIES.light, z)
      } else {
        this.matrix.makeScale(one.wide, one.tall, 1)
        this.matrix.setPosition(one.x, STAND + one.y, z)
      }
      this.lights.setMatrixAt(light, this.matrix)
      this.lights.setColorAt(light, this.colour.setRGB(one.strength, one.strength * 0.92, one.strength * 0.7))
      light += 1
    }
    this.lights.count = light
    this.lights.instanceMatrix.needsUpdate = true
    if (this.lights.instanceColor) this.lights.instanceColor.needsUpdate = true

    const hand = this.hand, ghost = stage.ghost
    hand.begin()
    if (ghost.opacity > 0.01) {
      // The fingertip is the top of the plaque: it hangs down and to the right of where it points, tilted.
      const size = 1.25 - ghost.press * 0.12
      const w = this.handTile.w * size, h = this.handTile.h * size
      const c = Math.cos(0.5), s = Math.sin(0.5)
      // The middle of the plaque, from its fingertip (three and a half pegs in from the left, at the top).
      const ox = (this.handTile.w / 2 - 3.5) * size, oy = (-this.handTile.h / 2) * size
      hand.upright(this.handTile, ghost.x + c * ox - s * oy, STAND + ghost.y + s * ox + c * oy, -ahead(ghost.s) + ghost.z, c * w, s * w, -s * h, c * h)
      hand.material.opacity = ghost.opacity * 0.92
    }
    hand.end()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  get counts(): { drawCalls: number; triangles: number } {
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  /** How many things stand round the trail: the frame-budget test counts with it. */
  static settingCount(): number {
    return layOut().length
  }

  dispose(): void {
    for (const quads of [this.figures, this.loose, this.setting, this.skyQuads, this.hand]) quads.dispose()
    for (const mesh of [this.floor, this.trail, this.sky]) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    for (const mesh of [this.shades, this.lights]) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      mesh.dispose()
    }
    this.figureAtlas.dispose()
    this.settingAtlas.dispose()
    for (const texture of this.textures) texture.dispose()
    this.renderer.dispose()
  }
}
