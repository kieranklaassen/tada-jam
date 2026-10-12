import * as THREE from 'three'
import { EYE, HORIZON_Z, PITCH, cameraFor } from '../camera'
import type { Tier } from '../config'
import { CELL, COLS, ROWS, X0, X1, Z0, Z1, base, heightAt, inField } from '../field'
import type { Hint } from '../guide'
import { CLOUDS, EEL_HOLES, EEL_ROCK, LOG, LOG_STUB, LUMPS, STAR_ROCK, SUN, sunAt } from '../layout'
import { MOST_GRAINS, RING_SECONDS, type Play } from '../play'
import { FolkView } from './folkView'
import { type Shared, grainMaterial, lumpMaterial, makeShared, sandMaterial, seaMaterial, skyMaterial } from './materials'
import { Lumps, type Rgb } from './shapes'
import { ThingsView } from './thingsView'
import { woodShadow } from '../things'
import { cellOf } from '../water'

// Everything drawn: one renderer on the Mount's canvas, the beach raised from
// the game's height field, the sea, the sky, the rocks and the folk. It shows
// what the game holds and decides nothing.

const MOST_RINGS = 24

/** The beach plane: fine over the grid the child shapes, coarse beyond it, out to the horizon and past the frame. */
function beachGeometry(): THREE.BufferGeometry {
  const xs: number[] = [], zs: number[] = []
  for (let x = -44; x < X0; x += 4) xs.push(x)
  for (let i = 0; i <= COLS; i++) xs.push(X0 + i * CELL)
  for (let x = X1 + 4; x <= 44; x += 4) xs.push(x)
  for (let z = HORIZON_Z - 2; z < Z0; z += 2) zs.push(z)
  for (let i = 0; i <= ROWS; i++) zs.push(Z0 + i * CELL)
  for (let z = Z1 + 1; z <= Z1 + 10; z += 1) zs.push(z)
  const positions = new Float32Array(xs.length * zs.length * 3)
  let at = 0
  for (const z of zs) for (const x of xs) {
    positions[at++] = x
    positions[at++] = 0
    positions[at++] = z
  }
  const indices: number[] = []
  for (let row = 0; row < zs.length - 1; row++) for (let col = 0; col < xs.length - 1; col++) {
    const a = row * xs.length + col, b = a + 1, c = a + xs.length, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

/**
 * The rocks, the log and the pebbles: everything that stands still. The rock the eel lives in, with its hole,
 * is a mesh of its own (`hole`), so that what is in that rock can be told from what is in any other; the rest
 * is one mesh (`rest`).
 */
export function placeGeometry(which: 'all' | 'hole' | 'rest' = 'all'): THREE.BufferGeometry {
  const stone: Rgb = [0.5, 0.42, 0.44], dark: Rgb = [0.36, 0.3, 0.36], warm: Rgb = [0.62, 0.5, 0.46], hole: Rgb = [0.07, 0.05, 0.08]
  const wood: Rgb = [0.56, 0.4, 0.3], pale: Rgb = [0.74, 0.6, 0.48]
  const place = new Lumps()
  // The two big rocks with the small ones at their feet, the rocks out in the shallows and the pebbles: each
  // lump of the list the game rests things on.
  for (const rock of LUMPS) {
    if (which !== 'all' && (which === 'hole') !== (rock.of === 'eel' && rock.big)) continue
    const colour = rock.big || rock.of === 'sea' || rock.of === 'pebble' ? (rock.of === 'sea' || rock.of === 'pebble' ? dark : stone) : rock.of === 'star' && rock.x > STAR_ROCK.x ? stone : dark
    const top = rock.big || rock.of === 'sea' || rock.of === 'pebble' || (rock.of === 'star' && rock.x > STAR_ROCK.x) ? warm : stone
    place.rock(1, colour, { at: [rock.x, rock.y, rock.z], scale: [rock.rx, rock.ry, rock.rz], top })
  }
  if (which !== 'rest') place.ball(0.5, hole, { at: [EEL_HOLES[0].x, EEL_HOLES[0].y, EEL_HOLES[0].z - 0.12], scale: [1, 0.92, 0.35] }, 16)
  if (which === 'hole') return place.build()
  // The gulls' log, on two posts.
  const middle = (LOG.x0 + LOG.x1) / 2, length = LOG.x1 - LOG.x0
  place.rod(LOG.radius, length, wood, { at: [middle, LOG.top - LOG.radius, LOG.z], turn: [0, 0, Math.PI / 2], top: pale }, 12)
  place.rod(0.22, 1.0, pale, { at: [LOG.x0 + 0.55, LOG.top - 0.85, LOG.z - 0.05], top: wood }, 10)
  place.rod(0.22, 1.0, pale, { at: [LOG.x1 - 0.55, LOG.top - 0.85, LOG.z - 0.05], top: wood }, 10)
  place.rod(LOG_STUB.radius, LOG_STUB.length, wood, { at: [LOG_STUB.x, LOG_STUB.y, LOG_STUB.z], turn: [LOG_STUB.tip, 0, 0] }, 8)
  return place.build()
}

/** Tufts of beach grass in the near corners, which the wind leans. */
function grassGeometry(): THREE.BufferGeometry {
  const low: Rgb = [0.5, 0.52, 0.3], high: Rgb = [0.93, 0.78, 0.42]
  const grass = new Lumps()
  const tufts = [[-5.2, 8.0, 1.4], [-4.5, 8.4, 1.0], [-5.7, 7.6, 0.9], [5.2, 8.2, 1.3], [4.4, 8.5, 0.9], [5.8, 7.8, 1.0], [-8.4, 4.4, 1.0], [8.2, 3.6, 1.0]] as const
  tufts.forEach(([x, z, size], tuft) => {
    for (let i = 0; i < 7; i++) {
      const lean = ((i * 37 + tuft * 11) % 9) / 9 - 0.5, spread = ((i * 53 + tuft * 7) % 10) / 10 - 0.5
      const tall = (1.5 + (i % 3) * 0.4) * size
      grass.cone(0.09 * size, tall, low, { at: [x + spread * 0.7 * size, 0.1 * (z + 3) + tall * 0.4, z + lean * 0.4], turn: [lean * 0.5, 0, spread * -0.9], top: high }, 5)
    }
  })
  return grass.build()
}

/**
 * The ghost hand: a pale hand with one finger out, lying on the sand. The tip of that finger is its origin and
 * points up the beach; the fist, the thumb and the wrist trail back toward the child.
 */
function handGeometry(): THREE.BufferGeometry {
  const pale: Rgb = [1, 0.97, 0.9], shade: Rgb = [0.96, 0.88, 0.8]
  const hand = new Lumps()
  // The one finger out: long, and thinner than everything behind it.
  hand.rod(0.17, 0.95, pale, { at: [0, 0.17, 0.6], turn: [Math.PI / 2, 0, 0] }, 12)
  // The back of the hand, and three curled fingers as knuckles along its front, each lower than the last.
  hand.ball(0.5, shade, { at: [0.2, 0.26, 1.72], scale: [1.05, 0.55, 1.05], top: pale }, 16)
  hand.ball(0.19, pale, { at: [0.3, 0.3, 1.2], scale: [1, 0.9, 1.2] }, 10)
  hand.ball(0.18, pale, { at: [0.54, 0.28, 1.3], scale: [1, 0.9, 1.2] }, 10)
  hand.ball(0.16, pale, { at: [0.73, 0.25, 1.46], scale: [1, 0.9, 1.2] }, 10)
  // The thumb, folded across under the finger.
  hand.rod(0.13, 0.36, pale, { at: [-0.22, 0.22, 1.42], turn: [Math.PI / 2, -0.75, 0] }, 10)
  // The wrist.
  hand.rod(0.24, 0.5, shade, { at: [0.3, 0.26, 2.4], turn: [Math.PI / 2, 0.12, 0], scale: [1, 1, 0.6] }, 12)
  return hand.build()
}

/** A ripple on the water: two arcs of unlike length with gaps between, so it reads as a ripple and never as a drawn ring. */
function rippleGeometry(): THREE.BufferGeometry {
  const long = new THREE.RingGeometry(0.84, 1, 22, 1, 0.3, 3.3), short = new THREE.RingGeometry(0.84, 1, 12, 1, 4.1, 1.6)
  const positions: number[] = [], indices: number[] = []
  for (const part of [long, short]) {
    const from = positions.length / 3
    const at = part.getAttribute('position')
    for (let i = 0; i < at.count; i++) positions.push(at.getX(i), at.getY(i), at.getZ(i))
    const index = part.getIndex()!
    for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + from)
    part.dispose()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry.rotateX(-Math.PI / 2)
}

export class ShoreView {
  readonly counts = { drawCalls: 0, triangles: 0 }
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 90)
  private readonly shared: Shared = makeShared()
  private readonly sand: THREE.ShaderMaterial
  private readonly sky: THREE.ShaderMaterial
  private readonly seaMesh: THREE.Mesh
  /** Two numbers a cell: how far the sand stands from the smooth beach, and how far the evening water shows there. */
  private readonly heights = new Uint16Array(COLS * ROWS * 2)
  private readonly heightMap: THREE.DataTexture
  private readonly folk: FolkView
  private readonly things: ThingsView
  private readonly hollow: THREE.ShaderMaterial
  private readonly lump: THREE.ShaderMaterial
  private readonly grass: THREE.ShaderMaterial
  private readonly handMaterial: THREE.ShaderMaterial
  private readonly hand: THREE.Mesh
  private readonly grains: THREE.Points
  private readonly grainPositions: Float32Array
  private readonly grainColours: Float32Array
  private readonly rings: THREE.InstancedMesh
  private readonly disposables: { dispose(): void }[] = []
  private fieldVersion = -1
  private wetVersion = -1
  private mostGrains = MOST_GRAINS
  private pixelHeight = 1
  private readonly matrix = new THREE.Matrix4()
  private readonly colour = new THREE.Color()
  private readonly scale = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    // Colours are authored as shown.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.setClearColor(new THREE.Color(0.94, 0.64, 0.36))
    this.camera.position.set(EYE.x, EYE.y, EYE.z)
    this.camera.rotation.set(-PITCH, 0, 0)

    this.heightMap = new THREE.DataTexture(this.heights, COLS, ROWS, THREE.RGFormat, THREE.HalfFloatType)
    this.heightMap.magFilter = THREE.LinearFilter
    this.heightMap.minFilter = THREE.LinearFilter
    this.heightMap.needsUpdate = true
    this.shared.uHeight.value = this.heightMap

    this.sky = skyMaterial(this.shared)
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 44), this.sky)
    sky.name = 'sky'
    // The plane's own corners are world points on the sky, so the shader reads world x and height from them.
    sky.geometry.translate(0, 18, HORIZON_Z)
    sky.renderOrder = -2
    sky.frustumCulled = false
    this.scene.add(sky)

    this.sand = sandMaterial(this.shared)
    const beach = new THREE.Mesh(beachGeometry(), this.sand)
    beach.name = 'beach'
    beach.frustumCulled = false
    this.scene.add(beach)

    this.lump = lumpMaterial(this.shared, { gloss: 0.35 })
    const place = new THREE.Mesh(placeGeometry('rest'), this.lump)
    place.name = 'rocks'
    this.scene.add(place)
    const hole = new THREE.Mesh(placeGeometry('hole'), this.lump)
    hole.name = 'hole-rock'
    this.scene.add(hole)
    this.grass = lumpMaterial(this.shared, { gloss: 0, sway: 0.045 })
    const grass = new THREE.Mesh(grassGeometry(), this.grass)
    grass.name = 'grass'
    this.scene.add(grass)

    this.folk = new FolkView(this.lump)
    this.scene.add(this.folk.group)
    this.hollow = lumpMaterial(this.shared, { gloss: 0.5, hollow: true })
    this.things = new ThingsView(this.lump, this.hollow)
    this.scene.add(this.things.group)

    this.seaMesh = new THREE.Mesh(new THREE.PlaneGeometry(120, 30).rotateX(-Math.PI / 2).translate(0, 0, HORIZON_Z + 15 - 0.05), seaMaterial(this.shared))
    this.seaMesh.name = 'sea'
    this.seaMesh.renderOrder = 2
    this.seaMesh.frustumCulled = false
    this.scene.add(this.seaMesh)

    // Ripples on the water: broken arcs that widen and fade.
    const ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    this.rings = new THREE.InstancedMesh(rippleGeometry(), ringMaterial, MOST_RINGS)
    this.rings.name = 'rings'
    this.rings.count = 0
    this.rings.renderOrder = 3
    this.rings.frustumCulled = false
    this.scene.add(this.rings)

    this.grainPositions = new Float32Array(MOST_GRAINS * 3)
    this.grainColours = new Float32Array(MOST_GRAINS * 3)
    const grainGeometry = new THREE.BufferGeometry()
    grainGeometry.setAttribute('position', new THREE.BufferAttribute(this.grainPositions, 3))
    grainGeometry.setAttribute('color', new THREE.BufferAttribute(this.grainColours, 3))
    grainGeometry.setDrawRange(0, 0)
    this.grains = new THREE.Points(grainGeometry, grainMaterial())
    this.grains.name = 'grains'
    this.grains.renderOrder = 4
    this.grains.frustumCulled = false
    this.scene.add(this.grains)

    this.handMaterial = lumpMaterial(this.shared, { gloss: 0.2, opacity: 0 })
    this.handMaterial.depthTest = false
    this.hand = new THREE.Mesh(handGeometry(), this.handMaterial)
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 8
    this.hand.visible = false
    // It lies on the sand with its wrist a little raised toward the child.
    this.hand.rotation.set(0.2, 0, 0)
    this.scene.add(this.hand)

    this.disposables.push(this.heightMap, sky.geometry, beach.geometry, place.geometry, hole.geometry, grass.geometry, this.seaMesh.geometry, this.rings.geometry, ringMaterial, grainGeometry, this.hand.geometry)
    this.disposables.push(this.sky, this.sand, this.lump, this.hollow, this.grass, this.handMaterial, this.seaMesh.material as THREE.Material, this.grains.material as THREE.Material)
  }

  /** Sizes the drawing surface: the renderer's sizing takes the place of setting the canvas's own. */
  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    const camera = cameraFor(width, height)
    this.camera.fov = camera.fovY
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.pixelHeight = height * ratio
  }

  /** What a tier sets besides the pixel ratio: how many grains are drawn, and the fine ripples and glitter. */
  setTier(tier: Tier): void {
    this.mostGrains = tier.grains
    this.shared.uFine.value = tier.fine ? 1 : 0
  }

  /** Lays the game as it stands on the meshes. With no game yet, the bare beach stays as it was built. */
  update(play: Play, hint: Hint): void {
    const field = play.field
    if (field.version !== this.fieldVersion || play.wetVersion !== this.wetVersion) {
      this.fieldVersion = field.version
      this.wetVersion = play.wetVersion
      for (let i = 0; i < field.d.length; i++) {
        this.heights[i * 2] = THREE.DataUtils.toHalfFloat(field.d[i])
        this.heights[i * 2 + 1] = THREE.DataUtils.toHalfFloat(play.wet[i])
      }
      this.heightMap.needsUpdate = true
    }
    this.shared.uTime.value = play.time
    this.shared.uSea.value = play.sea
    this.shared.uDusk.value = play.dusk
    this.shared.uGold.value = play.gold
    this.seaMesh.position.y = play.sea
    // The sun on the sky, swelling for a moment under a finger, and the glare it throws along the wet sand.
    const sun = sunAt(play.sun.t)
    ;(this.sky.uniforms.uSun.value as THREE.Vector3).set(sun.x, sun.y, SUN.radius * (1 + play.sun.pulse * 0.07))
    this.shared.uSunDir.value.set(sun.x, sun.y + 1.2, HORIZON_Z - 2).normalize()
    ;(this.sand.uniforms.uWave.value as THREE.Vector3).set(play.wave.front, play.wave.show, play.wave.top)
    ;(this.sand.uniforms.uStain.value as THREE.Vector3).set(play.stain.x, play.stain.z, play.stain.show)
    const ground = (x: number, z: number): number => (inField(x, z) ? heightAt(field, x, z) : 0.1 * (z + 3))
    this.folk.update(play.folk, ground)
    this.things.update(play)

    // Shadows on the sand: the crab's goes with it, the others stand.
    const shadows = this.sand.uniforms.uShadows.value as THREE.Vector4[]
    shadows[0].set(play.folk.crab.x, play.folk.crab.z + 0.05, 1.15, 0.85)
    shadows[1].set(STAR_ROCK.x, STAR_ROCK.z + 0.2, 1.7, 1.5)
    shadows[2].set(EEL_ROCK.x, EEL_ROCK.z + 0.6, 2.4, 2.2)
    shadows[3].set((LOG.x0 + LOG.x1) / 2 - 0.9, LOG.z + 0.3, 1.3, 1.3)
    shadows[4].set((LOG.x0 + LOG.x1) / 2 + 0.9, LOG.z + 0.3, 1.3, 1.3)
    const bucket = play.drawn().bucket
    shadows[5].set(bucket.x, bucket.z + 0.05, 0.7, 0.9)
    const star = play.folk.starfish
    shadows[6].set(star.x, star.z, star.on === 'rock' && star.move === 'perched' ? 0 : 0.7, 0.6)
    // A bough's shadow lies along the bough, however it is turned: a long oval under it, never one across it.
    const axes = this.sand.uniforms.uShadowAxes.value as THREE.Vector2[]
    play.things.wood.forEach((piece, index) => {
      const shadow = woodShadow(piece)
      shadows[7 + index].set(shadow.x, shadow.z, shadow.long, shadow.wide)
      axes[7 + index].set(shadow.ax, shadow.az)
    })

    const clouds = this.sky.uniforms.uClouds.value as THREE.Vector4[]
    const xs = play.cloudXs()
    play.clouds.forEach((cloud, index) => {
      const base = clouds[index]
      // A cloud is drawn where the game says it is, and a pushed one is squashed flat and wide for a moment.
      base.x = xs[index]
      base.z = CLOUDS[index].w * (1 + cloud.squash * 0.25)
      base.w = CLOUDS[index].h * (1 - cloud.squash * 0.3)
    })

    const count = Math.min(play.grains.length, this.mostGrains)
    for (let i = 0; i < count; i++) {
      // The newest grains are the ones drawn when a tier draws fewer.
      const grain = play.grains[play.grains.length - 1 - i]
      this.grainPositions[i * 3] = grain.x
      this.grainPositions[i * 3 + 1] = grain.y
      this.grainPositions[i * 3 + 2] = grain.z
      this.grainColours[i * 3] = grain.wet ? 0.86 : 0.93
      this.grainColours[i * 3 + 1] = grain.wet ? 0.93 : 0.74
      this.grainColours[i * 3 + 2] = grain.wet ? 1.0 : 0.5
    }
    this.grains.geometry.setDrawRange(0, count)
    this.grains.geometry.getAttribute('position').needsUpdate = true
    this.grains.geometry.getAttribute('color').needsUpdate = true
    ;(this.grains.material as THREE.ShaderMaterial).uniforms.uSize.value = (0.085 * this.pixelHeight) / Math.tan((this.camera.fov * Math.PI) / 360)

    const rings = Math.min(play.rings.length, MOST_RINGS)
    for (let i = 0; i < rings; i++) {
      const ring = play.rings[i], t = ring.age / RING_SECONDS
      const size = (0.15 + t * 0.95) * (ring.big ? 3.6 : 1)
      // Each ripple is turned its own way, and lies on the water where it is: the sea, or a pool up the beach.
      // A streak of foam lies the way the game turns it, long and thin; water welling up lies where the game says.
      const level = ring.y ?? (inField(ring.x, ring.z) && play.wet[cellOf(ring.x, ring.z)] > 0.5 ? Math.max(play.sea, base(ring.z) - 0.07) : play.sea)
      if (ring.long !== undefined && ring.turn !== undefined) this.matrix.makeRotationY(-ring.turn).scale(this.scale.set(size * 0.32 * ring.long, 1, size * 0.32))
      else this.matrix.makeRotationY(ring.x * 3.1 + ring.z * 1.7).scale(this.scale.set(size, 1, size))
      this.matrix.setPosition(ring.x, level + 0.02, ring.z)
      this.rings.setMatrixAt(i, this.matrix)
      const fade = (1 - t) * (ring.big ? 0.95 : 0.6)
      this.rings.setColorAt(i, this.colour.setRGB(fade, fade * 0.95, fade * 0.85))
    }
    this.rings.count = rings
    this.rings.instanceMatrix.needsUpdate = true
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true

    ;(this.sand.uniforms.uGlow.value as THREE.Vector3).set(hint.glowX, hint.glowZ, hint.glow)
    this.hand.visible = hint.hand && hint.opacity > 0.01
    if (this.hand.visible) {
      this.hand.position.set(hint.handX, ground(hint.handX, hint.handZ) + 0.42 - hint.press * 0.4, hint.handZ)
      this.handMaterial.uniforms.uOpacity.value = hint.opacity * 0.92
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
    this.counts.drawCalls = this.renderer.info.render.calls
    this.counts.triangles = this.renderer.info.render.triangles
  }

  dispose(): void {
    this.folk.dispose()
    this.things.dispose()
    for (const item of this.disposables) item.dispose()
    this.renderer.dispose()
  }
}
