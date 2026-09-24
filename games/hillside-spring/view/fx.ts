import * as THREE from 'three'
import { RACK, type GardenController, type Scenery } from '../controller'
import { handPose, type HandPose } from '../guidance'
import type { Point } from '../input'
import { cellIndex, PLOTS, type CropKind } from '../layout'
import { PIECE_WEIGHT } from '../pieces'
import type { DemoPiece, ShadowSink } from './pieces'
import { WHEEL_R, WHEEL_Y } from './pieces'
import { uvRect } from './paint'
import type { Projector } from './projector'
import type { WaterView } from './water'
import { cellX, CREEK_Y, floorY, RACK_Y, RACK_Z, rackX, rowZ, SPRING } from './world'

// Everything small and soft that sits over the painting: blob shadows under
// whatever stands on the hillside, glowing rings on what can be touched,
// pooled particles (spray where water lands, petals, flour, dust), and the
// ghost hand that demonstrates a move when the child stops. Four draw calls,
// fixed-size buffers, nothing allocated per frame.

/** A full hillside: 31 pieces of up to three arms and a hub each, plus the rack, the visitors and pieces in hand. */
const MAX_SHADOWS = 144
const MAX_RINGS = 24
const MAX_PARTICLES = 360
const MAX_RIPPLES = 4
const RIPPLE_SECONDS = 1.1
const RIPPLE_LAGS = [0, 0.28] as const
const HAND_DISTANCE = 9
const HAND_SIZE = 0.62

const Kind = { Dust: 0, Drop: 1, Petal: 2, Sparkle: 3, Puff: 4 } as const
type Kind = (typeof Kind)[keyof typeof Kind]

/** Atlas sprite quadrant per particle kind: soft dot, petal, sparkle, puff. */
const SPRITE_OF = [0, 0, 1, 2, 3] as const
const POINT_ATTRIBUTES = ['position', 'aColour', 'aLook'] as const

const CROP_COLOURS: Record<CropKind, readonly THREE.Color[]> = {
  sunflower: [new THREE.Color('#f6cf48'), new THREE.Color('#f2b62a'), new THREE.Color('#fbe38a')],
  rice: [new THREE.Color('#ecd27a'), new THREE.Color('#d8b95a'), new THREE.Color('#a8c860')],
  pumpkin: [new THREE.Color('#f09a3a'), new THREE.Color('#e27a22'), new THREE.Color('#8ab04a')],
  cosmos: [new THREE.Color('#f29ac0'), new THREE.Color('#fbe8f0'), new THREE.Color('#d8609a')],
}
const WATER = [new THREE.Color('#e8f6fa'), new THREE.Color('#bfe4f0'), new THREE.Color('#ffffff')]
const DUST = [new THREE.Color('#e8d8b4'), new THREE.Color('#d8c49c')]
/** Sun-baked clay, warmer and darker than the dry beds so a puff reads over them and over the grass. */
const DRY = [new THREE.Color('#c99a58'), new THREE.Color('#b07e44')]
const LEAF = [new THREE.Color('#8cc056'), new THREE.Color('#6aa640'), new THREE.Color('#b4d27a')]
const BLOSSOM = [new THREE.Color('#f8d2de'), new THREE.Color('#eea8c0'), new THREE.Color('#fff0d8')]
/** The side meadows' own wildflowers (cream, pink, buttercup) plus a leaf, so a flick reads on green grass. */
const MEADOW = [new THREE.Color('#f8f2de'), new THREE.Color('#f2b0c8'), new THREE.Color('#f4d45c'), new THREE.Color('#8cc056')]
const FLOUR = [new THREE.Color('#fbf6ea')]
const GOLD = [new THREE.Color('#fff3c0'), new THREE.Color('#ffe08a')]
/** Pale enough to read against yellow petals. */
const POLLEN = new THREE.Color('#fffbe8')
const RING_WARM = new THREE.Color(1, 0.88, 0.58)
const RING_DROP = new THREE.Color(1, 0.97, 0.86)

function flatQuad(region: 'ring' | 'blob'): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const r = uvRect(region)
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + (r.u1 - r.u0) * uv.getX(i), r.v0 + (r.v1 - r.v0) * uv.getY(i))
  return g
}

const FLAT_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vUv = uv;
  vTint = vec3(1.0);
#ifdef USE_INSTANCING_COLOR
  vTint = instanceColor;
#endif
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const SHADOW_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 uColour;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  float a = texture2D(map, vUv).a;
  gl_FragColor = vec4(uColour, min(1.0, a * 1.4) * vTint.r * 0.55);
  #include <colorspace_fragment>
}
`

const RING_FRAGMENT = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(t.rgb * t.a * vTint, 1.0);
  #include <colorspace_fragment>
}
`

const POINT_VERTEX = /* glsl */ `
attribute vec3 aColour;
attribute vec2 aLook;
uniform float uScale;
varying vec3 vColour;
varying float vAlpha;
varying float vSprite;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vColour = aColour;
  vAlpha = aLook.y;
  vSprite = floor(aLook.x / 100.0);
  gl_PointSize = mod(aLook.x, 100.0) * 0.01 * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const POINT_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec4 uRect;
varying vec3 vColour;
varying float vAlpha;
varying float vSprite;
void main() {
  vec2 q = vec2(mod(vSprite, 2.0), floor(vSprite / 2.0));
  vec2 p = (q + vec2(gl_PointCoord.x, gl_PointCoord.y)) * 0.5;
  vec2 uv = vec2(uRect.x + (uRect.z - uRect.x) * p.x, uRect.w - (uRect.w - uRect.y) * p.y);
  float a = texture2D(map, uv).a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColour, a);
  #include <colorspace_fragment>
}
`

/** The ghost hand's demonstration this frame, worked out once and shared with the pieces view. */
export class Demo implements DemoPiece {
  active = false
  readonly pose: HandPose = { at: { x: 0, y: 0 }, press: 0, opacity: 0 }
  kind: DemoPiece['kind'] = null
  readonly at = new THREE.Vector3()
  scale = 0
  pressCell = -1
  press = 0
  /** World point under the hand's fingertip target (where a press lands). */
  readonly target = new THREE.Vector3()
  private readonly from: Point = { x: 0, y: 0 }
  private readonly to: Point = { x: 0, y: 0 }

  update(garden: GardenController, projector: Projector): void {
    const hint = garden.hint
    const progress = garden.guide.demo
    this.kind = null
    this.scale = 0
    this.pressCell = -1
    this.press = 0
    if (!hint || progress === null || garden.held.size > 0) {
      this.active = false
      return
    }
    this.active = true
    let to: Point | null = null
    switch (hint.kind) {
      case 'turn':
        projector.cellScreen(hint.c, hint.r, this.from)
        this.target.set(cellX(hint.c), floorY(hint.r), rowZ(hint.r))
        break
      case 'place': {
        const slot = RACK.indexOf(hint.piece)
        projector.rackScreen(slot, this.from)
        to = projector.cellScreen(hint.c, hint.r, this.to)
        this.target.set(cellX(hint.c), floorY(hint.r), rowZ(hint.r))
        break
      }
      case 'harvest': {
        const plot = PLOTS[hint.plot]
        projector.cellScreen(plot.c, plot.r, this.from)
        this.target.set(cellX(plot.c), floorY(plot.r), rowZ(plot.r))
        break
      }
      default: {
        const never: never = hint
        return never
      }
    }
    handPose(this.from, to, progress, this.pose)
    if (hint.kind === 'turn') {
      this.pressCell = cellIndex(hint.c, hint.r)
      this.press = this.pose.press
    }
    if (hint.kind === 'place' && this.pose.press > 0.5) {
      this.kind = hint.piece
      projector.hill(this.pose.at, this.at)
      this.scale = Math.min(1, this.pose.opacity * 1.4) * (0.7 + 0.3 * this.pose.press)
    }
  }
}

export class FxView implements ShadowSink {
  readonly group = new THREE.Group()
  readonly demo = new Demo()
  private readonly shadows: THREE.InstancedMesh
  private readonly rings: THREE.InstancedMesh
  private readonly points: THREE.Points
  private readonly hand: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly handTexture: THREE.Texture
  private readonly pointMaterial: THREE.ShaderMaterial
  private shadowCount = 0
  private ringCount = 0
  private alive = 0
  private particles = 1
  private readonly pos = new Float32Array(MAX_PARTICLES * 3)
  private readonly vel = new Float32Array(MAX_PARTICLES * 3)
  private readonly colours = new Float32Array(MAX_PARTICLES * 3)
  private readonly looks = new Float32Array(MAX_PARTICLES * 2)
  private readonly life = new Float32Array(MAX_PARTICLES)
  private readonly span = new Float32Array(MAX_PARTICLES)
  private readonly size = new Float32Array(MAX_PARTICLES)
  private readonly kind = new Uint8Array(MAX_PARTICLES)
  private readonly seed = new Float32Array(MAX_PARTICLES)
  private readonly splashDebt = new Float32Array(64)
  private millDebt = 0
  private ripeDebt = 0
  private reaching = false
  /** Creek ripples as x, z, start time; the oldest is reused. */
  private readonly ripples = new Float32Array(MAX_RIPPLES * 3).fill(-100)
  private nextRipple = 0
  private readonly m = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly c = new THREE.Color()
  private camera: THREE.Camera | null = null

  constructor(atlas: THREE.Texture, handTexture: THREE.Texture) {
    this.handTexture = handTexture
    const shadowMaterial = new THREE.ShaderMaterial({
      vertexShader: FLAT_VERTEX,
      fragmentShader: SHADOW_FRAGMENT,
      uniforms: { map: { value: atlas }, uColour: { value: new THREE.Color('#3a2c3c') } },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    this.shadows = new THREE.InstancedMesh(flatQuad('blob'), shadowMaterial, MAX_SHADOWS)
    this.shadows.name = 'shadows'
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.shadows.setColorAt(0, this.c.setRGB(1, 1, 1))
    this.shadows.frustumCulled = false
    this.shadows.renderOrder = 1
    this.group.add(this.shadows)

    const ringMaterial = new THREE.ShaderMaterial({
      vertexShader: FLAT_VERTEX,
      fragmentShader: RING_FRAGMENT,
      uniforms: { map: { value: atlas } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
    this.rings = new THREE.InstancedMesh(flatQuad('ring'), ringMaterial, MAX_RINGS)
    this.rings.name = 'rings'
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.rings.setColorAt(0, this.c.setRGB(0, 0, 0))
    this.rings.frustumCulled = false
    this.rings.renderOrder = 3
    this.group.add(this.rings)

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aColour', new THREE.BufferAttribute(this.colours, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aLook', new THREE.BufferAttribute(this.looks, 2).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    const sprites = uvRect('sprites', 1)
    this.pointMaterial = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: { map: { value: atlas }, uScale: { value: 800 }, uRect: { value: new THREE.Vector4(sprites.u0, sprites.v0, sprites.u1, sprites.v1) } },
      transparent: true,
      depthWrite: false,
    })
    this.points = new THREE.Points(g, this.pointMaterial)
    this.points.name = 'particles'
    this.points.frustumCulled = false
    this.points.renderOrder = 4
    this.group.add(this.points)

    // The fingertip of the painted hand sits at the quad's origin, so the pose point is where it presses.
    const handGeometry = new THREE.PlaneGeometry(1, 1).translate(0.07, -0.38, 0)
    this.hand = new THREE.Mesh(handGeometry, new THREE.MeshBasicMaterial({ map: handTexture, transparent: true, depthTest: false, depthWrite: false }))
    this.hand.name = 'ghost-hand'
    this.hand.frustumCulled = false
    this.hand.renderOrder = 20
    this.hand.visible = false
    this.group.add(this.hand)
  }

  /** Point sizes are in world units; this turns them into pixels for the current buffer height. */
  resize(camera: THREE.PerspectiveCamera, bufferHeight: number): void {
    this.camera = camera
    this.pointMaterial.uniforms.uScale.value = bufferHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  }

  setParticles(scale: number): void {
    this.particles = scale
  }

  /** Called by whoever stands on the hillside, every frame, before `update`. */
  shadow(x: number, y: number, z: number, radius: number, strength: number): void {
    this.streak(x, y, z, 0, radius * 2 * 0.8, radius * 2, strength)
  }

  streak(x: number, y: number, z: number, yaw: number, length: number, width: number, strength: number): void {
    if (this.shadowCount >= MAX_SHADOWS) return
    this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
    this.m.compose(this.v.set(x, y + 0.012, z), this.q, this.s.set(width, 1, length))
    this.shadows.setMatrixAt(this.shadowCount, this.m)
    this.shadows.setColorAt(this.shadowCount, this.c.setRGB(strength, strength, strength))
    this.shadowCount++
  }

  beginFrame(garden: GardenController, projector: Projector): void {
    this.shadowCount = 0
    this.ringCount = 0
    this.demo.update(garden, projector)
  }

  private ring(x: number, y: number, z: number, size: number, colour: THREE.Color, strength: number): void {
    if (this.ringCount >= MAX_RINGS || strength <= 0.01) return
    this.q.identity()
    this.m.compose(this.v.set(x, y + 0.02, z), this.q, this.s.set(size, 1, size * 0.9))
    this.rings.setMatrixAt(this.ringCount, this.m)
    this.rings.setColorAt(this.ringCount, this.c.copy(colour).multiplyScalar(strength))
    this.ringCount++
  }

  private emit(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, colour: THREE.Color): void {
    if (this.alive >= MAX_PARTICLES) return
    const i = this.alive++
    this.pos[i * 3] = x
    this.pos[i * 3 + 1] = y
    this.pos[i * 3 + 2] = z
    this.vel[i * 3] = vx
    this.vel[i * 3 + 1] = vy
    this.vel[i * 3 + 2] = vz
    this.colours[i * 3] = colour.r
    this.colours[i * 3 + 1] = colour.g
    this.colours[i * 3 + 2] = colour.b
    this.life[i] = life
    this.span[i] = life
    this.size[i] = size
    this.kind[i] = kind
    this.seed[i] = Math.random() * 6.28
  }

  private burst(kind: Kind, n: number, x: number, y: number, z: number, spread: number, up: number, life: number, size: number, palette: readonly THREE.Color[]): void {
    const count = Math.max(1, Math.round(n * this.particles))
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2
      const r = spread * (0.4 + Math.random() * 0.6)
      this.emit(kind, x + Math.cos(a) * r * 0.3, y, z + Math.sin(a) * r * 0.3, Math.cos(a) * r, up * (0.6 + Math.random() * 0.6), Math.sin(a) * r, life * (0.7 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6), palette[k % palette.length])
    }
  }

  private drainEffects(garden: GardenController, projector: Projector): void {
    const effects = garden.effects
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i]
      switch (effect.type) {
        case 'place': {
          const y = floorY(effect.r)
          const weight = PIECE_WEIGHT[effect.kind]
          this.burst(Kind.Puff, 8 * weight, cellX(effect.c), y + 0.05, rowZ(effect.r), 1.4 * weight, 0.3, 0.6, 0.13, DUST)
          this.burst(Kind.Dust, 8 * weight, cellX(effect.c), y + 0.04, rowZ(effect.r), 1.1 * weight, 0.6, 0.7, 0.07, DUST)
          break
        }
        case 'putBack':
          projector.hill(effect.at, this.v)
          this.burst(Kind.Puff, 7, this.v.x, this.v.y + 0.1, this.v.z, 0.8, 0.5, 0.6, 0.16, DUST)
          break
        case 'harvest': {
          const plot = PLOTS[effect.plot]
          const x = cellX(plot.c)
          const y = floorY(plot.r) + 0.3
          const z = rowZ(plot.r)
          this.burst(Kind.Petal, 18, x, y, z, 1.6, 2.4, 1.4, 0.09, CROP_COLOURS[plot.kind])
          this.burst(Kind.Sparkle, 8, x, y + 0.2, z, 1.0, 1.2, 0.9, 0.1, GOLD)
          break
        }
        case 'bloom': {
          const plot = PLOTS[effect.plot]
          const x = cellX(plot.c)
          const y = floorY(plot.r) + 0.45
          const z = rowZ(plot.r)
          this.burst(Kind.Sparkle, 12, x, y, z, 0.9, 0.9, 1.2, 0.11, GOLD)
          this.burst(Kind.Petal, 8, x, y, z, 0.8, 1.4, 1.6, 0.08, CROP_COLOURS[plot.kind])
          break
        }
        case 'rustle':
          this.burst(Kind.Petal, 6, cellX(effect.c), floorY(effect.r) + 0.08, rowZ(effect.r), 0.9, 1.3, 0.8, 0.06, LEAF)
          break
        case 'splash':
          this.burst(Kind.Drop, 16, SPRING.x, SPRING.y + 0.02, SPRING.z, 1.2, 2.6, 0.8, 0.06, WATER)
          break
        case 'wiggle': {
          const plot = PLOTS[effect.plot]
          this.burst(Kind.Petal, 4, cellX(plot.c), floorY(plot.r) + 0.2, rowZ(plot.r), 0.7, 1.1, 0.8, 0.06, LEAF)
          if (garden.wetness[plot.id] < 0.5) this.burst(Kind.Dust, 8, cellX(plot.c), floorY(plot.r) + 0.06, rowZ(plot.r), 0.8, 0.6, 1.1, 0.12, DRY)
          break
        }
        case 'touch':
          this.touchScenery(effect.where, projector.sceneryPoint(effect.where, effect.at, this.v), garden.now)
          break
        default: {
          const never: never = effect
          return never
        }
      }
    }
    garden.effects.length = 0
  }

  private emitContinuous(garden: GardenController, water: WaterView, dt: number): void {
    const now = garden.now
    const splashes = water.splashes
    for (let i = 0; i < water.splashCount; i++) {
      const o = i * 6
      if (now < splashes[o + 3] || now > splashes[o + 4]) continue
      this.splashDebt[i] += dt * 14 * splashes[o + 5] * this.particles
      while (this.splashDebt[i] >= 1) {
        this.splashDebt[i] -= 1
        const a = Math.random() * Math.PI * 2
        const r = 0.25 + Math.random() * 0.35
        this.emit(Kind.Drop, splashes[o], splashes[o + 1] + 0.02, splashes[o + 2], Math.cos(a) * r, 0.9 + Math.random() * 0.7, Math.sin(a) * r * 0.6, 0.45, 0.045 + Math.random() * 0.025, WATER[i % 3])
      }
    }
    const pieces = garden.state.pieces
    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p]
      if (piece.kind !== 'wheel') continue
      const m = garden.motion[cellIndex(piece.c, piece.r)]
      const spin = Math.min(1, Math.abs(m.wheelSpeed) / 3)
      if (spin < 0.2) continue
      this.millDebt += dt * 5 * spin * this.particles
      while (this.millDebt >= 1) {
        this.millDebt -= 1
        const x = cellX(piece.c)
        const y = floorY(piece.r)
        const z = rowZ(piece.r)
        if (Math.random() < 0.5) this.emit(Kind.Puff, x - 0.31, y + 0.12, z + 0.3, (Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.2, 1.1, 0.1, FLOUR[0])
        else this.emit(Kind.Drop, x + (Math.random() - 0.5) * 0.1, y + WHEEL_Y + WHEEL_R, z + 0.05, (Math.random() - 0.5) * 0.6, 0.8, 0.3, 0.5, 0.045, WATER[1])
      }
    }
    const hint = garden.hint
    if (hint?.kind === 'harvest' && garden.held.size === 0) {
      const plot = PLOTS[hint.plot]
      this.ripeDebt += dt * 8 * garden.guide.glow * this.particles
      while (this.ripeDebt >= 1) {
        this.ripeDebt -= 1
        const a = Math.random() * Math.PI * 2
        const r = 0.1 + Math.random() * 0.25
        const x = cellX(plot.c) + Math.cos(a) * r
        const z = rowZ(plot.r) + Math.sin(a) * r * 0.8
        this.emit(Kind.Sparkle, x, floorY(plot.r) + 0.25 + Math.random() * 0.35, z, 0, 0.3 + Math.random() * 0.2, 0, 1.6, 0.1 + Math.random() * 0.04, POLLEN)
      }
    }
  }

  private stepParticles(dt: number, now: number): void {
    let i = 0
    while (i < this.alive) {
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        this.alive--
        this.move(this.alive, i)
        continue
      }
      const k = this.kind[i]
      const o = i * 3
      const gravity = k === Kind.Drop ? -6 : k === Kind.Petal ? -0.9 : k === Kind.Sparkle ? -0.1 : 0.15
      const drag = k === Kind.Drop ? 0.4 : k === Kind.Petal ? 2.2 : 2.6
      const damp = Math.max(0, 1 - drag * dt)
      this.vel[o] *= damp
      this.vel[o + 1] = this.vel[o + 1] * damp + gravity * dt
      this.vel[o + 2] *= damp
      let sway = 0
      if (k === Kind.Petal) sway = Math.sin(now * 5 + this.seed[i]) * 0.35 * dt
      this.pos[o] += this.vel[o] * dt + sway
      this.pos[o + 1] += this.vel[o + 1] * dt
      this.pos[o + 2] += this.vel[o + 2] * dt
      const t = this.life[i] / this.span[i]
      let alpha = Math.min(1, t * 3)
      let size = this.size[i]
      if (k === Kind.Sparkle) alpha *= 0.55 + 0.45 * Math.sin(now * 18 + this.seed[i])
      if (k === Kind.Puff || k === Kind.Dust) {
        size *= 1 + (1 - t) * 1.4
        alpha *= 0.75
      }
      this.looks[i * 2] = SPRITE_OF[k] * 100 + Math.min(99, size * 100)
      this.looks[i * 2 + 1] = alpha
      i++
    }
  }

  private move(from: number, to: number): void {
    if (from === to) return
    for (let k = 0; k < 3; k++) {
      this.pos[to * 3 + k] = this.pos[from * 3 + k]
      this.vel[to * 3 + k] = this.vel[from * 3 + k]
      this.colours[to * 3 + k] = this.colours[from * 3 + k]
    }
    this.life[to] = this.life[from]
    this.span[to] = this.span[from]
    this.size[to] = this.size[from]
    this.kind[to] = this.kind[from]
    this.seed[to] = this.seed[from]
  }

  private glowRings(garden: GardenController): void {
    for (const held of garden.held.values()) {
      if (held.hover) this.ring(cellX(held.hover.c), floorY(held.hover.r), rowZ(held.hover.r), 1.05, RING_DROP, 0.8)
    }
    const glow = garden.guide.glow
    const hint = garden.hint
    if (hint && glow > 0 && garden.held.size === 0) {
      switch (hint.kind) {
        case 'turn':
          this.ring(cellX(hint.c), floorY(hint.r), rowZ(hint.r), 1.0, RING_WARM, glow)
          break
        case 'place': {
          const slot = RACK.indexOf(hint.piece)
          this.ring(rackX(slot, RACK.length), RACK_Y, RACK_Z, 1.05, RING_WARM, glow)
          this.ring(cellX(hint.c), floorY(hint.r), rowZ(hint.r), 0.9, RING_WARM, glow * 0.45)
          break
        }
        case 'harvest': {
          // Wide enough that the bright rim circles the bed on the grass instead of washing out its wet soil.
          const plot = PLOTS[hint.plot]
          this.ring(cellX(plot.c), floorY(plot.r), rowZ(plot.r), 1.3, RING_WARM, glow * 0.8)
          break
        }
        default: {
          const never: never = hint
          return never
        }
      }
    }
    const demo = this.demo
    if (demo.active && demo.pose.press > 0.05) {
      const t = demo.target
      this.ring(t.x, t.y, t.z, 0.7 + demo.pose.press * 0.35, RING_DROP, demo.pose.press * demo.pose.opacity * 0.9)
    }
    for (let i = 0; i < MAX_RIPPLES * 3; i += 3) {
      for (let k = 0; k < RIPPLE_LAGS.length; k++) {
        const age = (garden.now - this.ripples[i + 2] - RIPPLE_LAGS[k]) / RIPPLE_SECONDS
        if (age < 0 || age > 1) continue
        const fade = 1 - age
        this.ring(this.ripples[i], CREEK_Y, this.ripples[i + 1], 0.2 + age * 0.9, RING_DROP, fade * fade * 0.7)
      }
    }
  }

  private placeHand(projector: Projector): void {
    const demo = this.demo
    const pose = demo.pose
    this.hand.visible = demo.active && pose.opacity > 0.01 && this.camera !== null
    if (!this.hand.visible || !this.camera) return
    projector.along(pose.at, HAND_DISTANCE, this.hand.position)
    this.hand.quaternion.copy(this.camera.quaternion)
    this.hand.scale.setScalar(HAND_SIZE * (1 - 0.12 * pose.press))
    this.hand.material.opacity = pose.opacity * 0.94
  }

  /** Every touch gets an answer, even off the grid: the meadow flicks up wildflower petals, the creek rings and throws drops, the sky lets go of blossom. */
  private touchScenery(where: Scenery, at: THREE.Vector3, now: number): void {
    switch (where) {
      case 'meadow':
        this.burst(Kind.Petal, 10, at.x, at.y, at.z, 0.6, 1.8, 1.0, 0.13, MEADOW)
        return
      case 'creek': {
        const i = this.nextRipple * 3
        this.ripples[i] = at.x
        this.ripples[i + 1] = at.z
        this.ripples[i + 2] = now
        this.nextRipple = (this.nextRipple + 1) % MAX_RIPPLES
        this.burst(Kind.Drop, 12, at.x, at.y + 0.02, at.z, 0.7, 2.2, 0.6, 0.065, WATER)
        return
      }
      case 'sky':
        this.burst(Kind.Petal, 9, at.x, at.y, at.z, 0.9, 0.2, 2.4, 0.13, BLOSSOM)
        return
      default: {
        const never: never = where
        return never
      }
    }
  }

  /** As the thirsty plants start an idle reach, their dry beds give up a little puff of dust: motion that finds the want. */
  private dryPuffs(garden: GardenController): void {
    const reaching = garden.guide.lean !== null
    if (reaching && !this.reaching) {
      for (const plot of PLOTS) {
        if (garden.state.growth[plot.id] >= 1 || garden.wetness[plot.id] >= 0.5) continue
        this.burst(Kind.Dust, 10, cellX(plot.c), floorY(plot.r) + 0.06, rowZ(plot.r), 0.9, 0.7, 1.3, 0.13, DRY)
      }
    }
    this.reaching = reaching
  }

  update(garden: GardenController, projector: Projector, water: WaterView, dt: number): void {
    this.drainEffects(garden, projector)
    this.dryPuffs(garden)
    this.emitContinuous(garden, water, dt)
    this.stepParticles(dt, garden.now)
    this.glowRings(garden)
    this.placeHand(projector)

    this.shadows.count = this.shadowCount
    this.shadows.instanceMatrix.needsUpdate = true
    if (this.shadows.instanceColor) this.shadows.instanceColor.needsUpdate = true
    this.rings.count = this.ringCount
    this.rings.instanceMatrix.needsUpdate = true
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true
    const g = this.points.geometry
    for (let i = 0; i < POINT_ATTRIBUTES.length; i++) {
      const attribute = g.getAttribute(POINT_ATTRIBUTES[i]) as THREE.BufferAttribute
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(0, this.alive * attribute.itemSize)
      attribute.needsUpdate = true
    }
    g.setDrawRange(0, this.alive)
  }

  dispose(): void {
    this.shadows.geometry.dispose()
    ;(this.shadows.material as THREE.Material).dispose()
    this.rings.geometry.dispose()
    ;(this.rings.material as THREE.Material).dispose()
    this.points.geometry.dispose()
    this.pointMaterial.dispose()
    this.hand.geometry.dispose()
    this.hand.material.dispose()
    this.handTexture.dispose()
  }
}
