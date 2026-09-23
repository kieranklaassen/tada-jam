import * as THREE from 'three'
import { FX_CAPACITY, type ForestController, type FxKind } from '../controller'
import { HOME_KEYS, HOMES } from '../layout'
import type { Tier } from '../perf'
import { between, createRng } from '../rng'
import { brushTexture, homeUniforms, shared } from './gouache'
import { PALETTE, rgb } from './palette'

// Everything painted over the forest that is not a solid shape, in three
// draws: flat decals on the ground (soft blob shadows, the breathing hint
// ring), one points cloud (dust, splashes, leaves, sparkles, snore bubbles,
// feathers, fireflies, and the warm halo round each lit doorway), and the
// ghost hand. All buffers are preallocated; each frame only rewrites them.

const PREMULTIPLIED = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
} as const

function setRgb(out: Float32Array, i: number, color: readonly [number, number, number]): void {
  out[i * 3] = color[0]
  out[i * 3 + 1] = color[1]
  out[i * 3 + 2] = color[2]
}

// --- decals ----------------------------------------------------------------------

const DECAL_CAPACITY = 12
const SHADOW = 0
const RING = 1

const DECAL_VERTEX = /* glsl */ `
  attribute vec3 offset;
  attribute vec2 extent;
  attribute vec3 color;
  attribute vec4 params;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec4 vParams;
  void main() {
    vUv = position.xz;
    vColor = color;
    vParams = params;
    vec3 p = offset + vec3(position.x * extent.x, 0.0, position.z * extent.y);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`

const DECAL_FRAGMENT = /* glsl */ `
  uniform sampler2D brush;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec4 vParams;
  void main() {
    float r = length(vUv);
    vec3 b = texture2D(brush, vUv * 0.3 + vParams.w).rgb;
    float edge = r + (b.r - 0.5) * 0.16;
    float a;
    if (vParams.y < 0.5) {
      a = smoothstep(1.0, 0.5, edge) * (0.85 + 0.3 * b.b);
    } else {
      float band = smoothstep(0.6, 0.72, edge) * smoothstep(1.0, 0.88, edge);
      a = band * (0.75 + 0.5 * b.g);
    }
    a = clamp(a * vParams.x, 0.0, 1.0);
    gl_FragColor = vec4(vColor * a, a);
  }
`

class Decals {
  readonly mesh: THREE.Mesh
  private readonly geometry: THREE.InstancedBufferGeometry
  private readonly offset: THREE.InstancedBufferAttribute
  private readonly extent: THREE.InstancedBufferAttribute
  private readonly color: THREE.InstancedBufferAttribute
  private readonly params: THREE.InstancedBufferAttribute
  private count = 0

  constructor() {
    const plane = new THREE.PlaneGeometry(2, 2)
    plane.rotateX(-Math.PI / 2)
    const geometry = new THREE.InstancedBufferGeometry()
    geometry.setIndex(plane.getIndex())
    geometry.setAttribute('position', plane.getAttribute('position'))
    const attribute = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(DECAL_CAPACITY * size), size).setUsage(THREE.DynamicDrawUsage)
    this.offset = attribute(3)
    this.extent = attribute(2)
    this.color = attribute(3)
    this.params = attribute(4)
    geometry.setAttribute('offset', this.offset)
    geometry.setAttribute('extent', this.extent)
    geometry.setAttribute('color', this.color)
    geometry.setAttribute('params', this.params)
    geometry.instanceCount = 0
    this.geometry = geometry
    const material = new THREE.ShaderMaterial({
      ...PREMULTIPLIED,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      uniforms: { brush: { value: brushTexture() } },
      vertexShader: DECAL_VERTEX,
      fragmentShader: DECAL_FRAGMENT,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 1
  }

  begin(): void {
    this.count = 0
  }

  add(x: number, y: number, z: number, rx: number, rz: number, color: readonly [number, number, number], alpha: number, shape: number, seed: number): void {
    if (this.count >= DECAL_CAPACITY || alpha <= 0.004) return
    const i = this.count++
    const o = this.offset.array as Float32Array
    o[i * 3] = x
    o[i * 3 + 1] = y
    o[i * 3 + 2] = z
    const e = this.extent.array as Float32Array
    e[i * 2] = rx
    e[i * 2 + 1] = rz
    setRgb(this.color.array as Float32Array, i, color)
    const p = this.params.array as Float32Array
    p[i * 4] = alpha
    p[i * 4 + 1] = shape
    p[i * 4 + 2] = 0
    p[i * 4 + 3] = seed
  }

  end(): void {
    this.geometry.instanceCount = this.count
    this.offset.needsUpdate = true
    this.extent.needsUpdate = true
    this.color.needsUpdate = true
    this.params.needsUpdate = true
  }
}

// --- points: particles, fireflies, halos -------------------------------------------

const PARTICLES = 96
const FIREFLIES = 12
const HALOS = HOME_KEYS.length
const POINTS = PARTICLES + FIREFLIES + HALOS

const DOT = 0
const STAR = 1
const HALO = 2
const LEAF = 3
const BUBBLE = 4

const POINT_VERTEX = /* glsl */ `
  uniform vec2 resolution;
  attribute vec3 color;
  attribute vec4 data;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vShape;
  varying float vSpin;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = data.x * projectionMatrix[1][1] * resolution.y * 0.5 / max(1.0, -mv.z);
    gl_PointSize = data.y > 0.002 ? clamp(px, 1.0, 320.0) : 0.0;
    vColor = color;
    vAlpha = data.y;
    vShape = data.z;
    vSpin = data.w;
  }
`

const POINT_FRAGMENT = /* glsl */ `
  uniform sampler2D brush;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vShape;
  varying float vSpin;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    q.y = -q.y;
    float r = length(q);
    float cs = cos(vSpin);
    float sn = sin(vSpin);
    vec2 s = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
    float grain = texture2D(brush, gl_PointCoord * 0.25 + vSpin * 0.1).r - 0.5;
    float a = 0.0;
    float additive = 0.0;
    vec3 col = vColor;
    if (vShape < 0.5) {
      a = smoothstep(1.0, 0.72, r + grain * 0.3);
    } else if (vShape < 1.5) {
      float d = sqrt(abs(s.x)) + sqrt(abs(s.y));
      a = smoothstep(1.02, 0.86, d);
      col = mix(col, vec3(1.0, 0.98, 0.9), smoothstep(0.5, 0.1, d));
    } else if (vShape < 2.5) {
      a = exp(-r * r * 3.5) * smoothstep(1.0, 0.6, r);
      additive = 1.0;
    } else if (vShape < 3.5) {
      a = smoothstep(1.0, 0.8, length(vec2(s.x * 2.4, s.y)) + grain * 0.2);
      col *= 0.85 + 0.3 * smoothstep(-0.2, 0.3, s.x);
    } else {
      float rim = smoothstep(0.62, 0.86, r) * smoothstep(1.0, 0.9, r);
      float fill = smoothstep(1.0, 0.8, r) * 0.28;
      float shine = smoothstep(0.24, 0.0, length(q - vec2(-0.35, 0.35)));
      a = max(max(rim, fill), shine);
      col = mix(col, vec3(1.0), shine);
    }
    a *= vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col * a, a * (1.0 - additive));
  }
`

type Burst = { count: number; color: readonly (readonly [number, number, number])[]; shape: number }

const C = {
  dust: rgb('#e4d3a4'),
  earth: rgb(PALETTE.earth),
  water: rgb(PALETTE.waterLight),
  white: rgb('#fbf6ea'),
  leaf: rgb(PALETTE.leaf),
  leafLight: rgb(PALETTE.leafLight),
  autumn: rgb('#d99a3a'),
  glow: rgb(PALETTE.glow),
  ring: rgb(PALETTE.ring),
  pink: rgb(PALETTE.pink),
  bubble: rgb('#eef2ff'),
  owl: rgb(PALETTE.owlFace),
  bird: rgb(PALETTE.bird),
  firefly: rgb('#f3f59a'),
  halo: rgb('#ffb347'),
} as const

const BURSTS: Record<FxKind, Burst> = {
  dust: { count: 7, color: [C.dust, C.earth], shape: DOT },
  splash: { count: 12, color: [C.water, C.white], shape: DOT },
  leaves: { count: 7, color: [C.leaf, C.leafLight, C.autumn], shape: LEAF },
  sparkle: { count: 9, color: [C.glow, C.ring, C.pink], shape: STAR },
  puff: { count: 1, color: [C.bubble], shape: BUBBLE },
  feather: { count: 4, color: [C.owl, C.white], shape: LEAF },
}

class Points {
  readonly points: THREE.Points
  private readonly position: THREE.BufferAttribute
  private readonly color: THREE.BufferAttribute
  private readonly data: THREE.BufferAttribute
  private readonly rng = createRng(77)
  // particle state, structure of arrays
  private readonly px = new Float32Array(PARTICLES)
  private readonly py = new Float32Array(PARTICLES)
  private readonly pz = new Float32Array(PARTICLES)
  private readonly vx = new Float32Array(PARTICLES)
  private readonly vy = new Float32Array(PARTICLES)
  private readonly vz = new Float32Array(PARTICLES)
  private readonly age = new Float32Array(PARTICLES).fill(1)
  private readonly life = new Float32Array(PARTICLES).fill(1)
  private readonly size0 = new Float32Array(PARTICLES)
  private readonly size1 = new Float32Array(PARTICLES)
  private readonly alpha0 = new Float32Array(PARTICLES)
  private readonly gravity = new Float32Array(PARTICLES)
  private readonly drag = new Float32Array(PARTICLES)
  private readonly sway = new Float32Array(PARTICLES)
  private readonly spin = new Float32Array(PARTICLES)
  private readonly spinV = new Float32Array(PARTICLES)
  private readonly shape = new Float32Array(PARTICLES)
  private next = 0
  private seen = -1
  // fireflies
  private readonly flyAngle = new Float32Array(FIREFLIES)
  private readonly flyRadius = new Float32Array(FIREFLIES)
  private readonly flyHeight = new Float32Array(FIREFLIES)
  private readonly flySeed = new Float32Array(FIREFLIES)

  constructor() {
    const geometry = new THREE.BufferGeometry()
    this.position = new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3).setUsage(THREE.DynamicDrawUsage)
    this.color = new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3).setUsage(THREE.DynamicDrawUsage)
    this.data = new THREE.BufferAttribute(new Float32Array(POINTS * 4), 4).setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', this.position)
    geometry.setAttribute('color', this.color)
    geometry.setAttribute('data', this.data)
    const material = new THREE.ShaderMaterial({
      ...PREMULTIPLIED,
      uniforms: { brush: { value: brushTexture() }, resolution: shared.resolution },
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
    })
    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 2
    const rng = this.rng
    for (let i = 0; i < FIREFLIES; i++) {
      this.flyAngle[i] = (i / FIREFLIES) * Math.PI * 2 + between(rng, -0.2, 0.2)
      this.flyRadius[i] = between(rng, 1.05, 1.45)
      this.flyHeight[i] = between(rng, 8, 30)
      this.flySeed[i] = rng() * 10
    }
    const halos = this.color.array as Float32Array
    for (let h = 0; h < HALOS; h++) setRgb(halos, PARTICLES + FIREFLIES + h, C.halo)
  }

  update(forest: ForestController, dt: number, tier: Tier, night: number, morning: number): void {
    if (this.seen < 0) this.seen = forest.fxCount
    const from = Math.max(this.seen, forest.fxCount - FX_CAPACITY)
    for (let n = from; n < forest.fxCount; n++) this.spawn(forest.fx[n % FX_CAPACITY], tier.particles, forest)
    this.seen = forest.fxCount

    const pos = this.position.array as Float32Array
    const col = this.color.array as Float32Array
    const data = this.data.array as Float32Array
    for (let i = 0; i < PARTICLES; i++) {
      if (this.age[i] >= this.life[i]) {
        data[i * 4 + 1] = 0
        continue
      }
      this.age[i] += dt
      const k = Math.min(1, this.age[i] / this.life[i])
      const damp = Math.exp(-dt * this.drag[i])
      this.vx[i] *= damp
      this.vz[i] *= damp
      this.vy[i] = this.vy[i] * damp - this.gravity[i] * dt
      const sway = this.sway[i] * Math.sin(this.age[i] * 4 + i)
      this.px[i] += (this.vx[i] + sway) * dt
      this.py[i] += this.vy[i] * dt
      this.pz[i] += this.vz[i] * dt
      if (this.py[i] < 0.3 && this.gravity[i] > 0) {
        this.py[i] = 0.3
        this.vy[i] = 0
        this.vx[i] *= 0.5
        this.vz[i] *= 0.5
      }
      this.spin[i] += this.spinV[i] * dt
      pos[i * 3] = this.px[i]
      pos[i * 3 + 1] = this.py[i]
      pos[i * 3 + 2] = this.pz[i]
      data[i * 4] = this.size0[i] + (this.size1[i] - this.size0[i]) * k
      data[i * 4 + 1] = this.alpha0[i] * Math.min(1, k * 8) * (1 - k * k)
      data[i * 4 + 2] = this.shape[i]
      data[i * 4 + 3] = this.spin[i]
    }

    const t = forest.t
    const flyStrength = (0.45 + 0.55 * night) * (1 - morning)
    for (let f = 0; f < FIREFLIES; f++) {
      const i = PARTICLES + f
      const on = f < tier.fireflies ? flyStrength : 0
      const s = this.flySeed[f]
      const angle = this.flyAngle[f] + Math.sin(t * 0.07 + s) * 0.35
      const radius = this.flyRadius[f]
      pos[i * 3] = 4 + Math.cos(angle) * 70 * radius + Math.sin(t * 0.5 + s) * 6
      pos[i * 3 + 1] = this.flyHeight[f] + Math.sin(t * 0.8 + s * 2) * 4
      pos[i * 3 + 2] = -6 + Math.sin(angle) * 38 * radius + Math.cos(t * 0.4 + s) * 5
      const pulse = 0.5 + 0.5 * Math.sin(t * (0.9 + (s % 1) * 0.8) + s * 5)
      setRgb(col, i, C.firefly)
      data[i * 4] = 3.2
      data[i * 4 + 1] = on * (0.25 + 0.75 * pulse * pulse)
      data[i * 4 + 2] = HALO
      data[i * 4 + 3] = 0
    }

    const glow = homeUniforms.homeGlow.value
    for (let h = 0; h < HALOS; h++) {
      const i = PARTICLES + FIREFLIES + h
      const spec = HOMES[HOME_KEYS[h]]
      pos[i * 3] = spec.mouth.x
      pos[i * 3 + 1] = spec.mouth.y + (spec.key === 'pond' ? 2 : 0)
      pos[i * 3 + 2] = spec.mouth.z + 4
      data[i * 4] = spec.dropRadius * 2.6
      data[i * 4 + 1] = glow[h] * (0.4 + 0.45 * night)
      data[i * 4 + 2] = HALO
      data[i * 4 + 3] = 0
    }

    this.position.needsUpdate = true
    this.color.needsUpdate = true
    this.data.needsUpdate = true
  }

  private spawn(e: { kind: FxKind; x: number; y: number; z: number; animal: number; strength: number }, share: number, forest: ForestController): void {
    const burst = BURSTS[e.kind]
    const rng = this.rng
    const count = Math.max(1, Math.round(burst.count * (0.6 + 0.4 * Math.min(1.5, e.strength)) * share))
    const col = this.color.array as Float32Array
    const feather = e.kind === 'feather' && e.animal >= 0 && forest.creatures[e.animal].key === 'songbird' ? C.bird : null
    for (let n = 0; n < count; n++) {
      const i = this.next
      this.next = (this.next + 1) % PARTICLES
      const a = rng() * Math.PI * 2
      const s = e.strength
      this.age[i] = 0
      this.shape[i] = burst.shape
      this.spin[i] = rng() * Math.PI * 2
      this.spinV[i] = 0
      this.sway[i] = 0
      this.px[i] = e.x
      this.py[i] = e.y
      this.pz[i] = e.z
      switch (e.kind) {
        case 'dust': {
          const speed = between(rng, 10, 22) * (0.6 + s * 0.5)
          this.px[i] += Math.cos(a) * 2
          this.pz[i] += Math.sin(a) * 2
          this.vx[i] = Math.cos(a) * speed
          this.vz[i] = Math.sin(a) * speed * 0.6
          this.vy[i] = between(rng, 3, 8)
          this.gravity[i] = 0
          this.drag[i] = 4.5
          this.life[i] = between(rng, 0.55, 0.9)
          this.size0[i] = between(rng, 2.2, 3.4) * (0.7 + s * 0.4)
          this.size1[i] = this.size0[i] * 2.2
          this.alpha0[i] = 0.6
          break
        }
        case 'splash': {
          const speed = between(rng, 6, 18)
          this.px[i] += Math.cos(a) * 3
          this.pz[i] += Math.sin(a) * 3
          this.vx[i] = Math.cos(a) * speed
          this.vz[i] = Math.sin(a) * speed * 0.7
          this.vy[i] = between(rng, 28, 52) * (0.6 + s * 0.5)
          this.gravity[i] = 150
          this.drag[i] = 0.5
          this.life[i] = between(rng, 0.6, 0.85)
          this.size0[i] = between(rng, 1.6, 2.6)
          this.size1[i] = this.size0[i] * 0.6
          this.alpha0[i] = 0.95
          break
        }
        case 'leaves': {
          const speed = between(rng, 5, 14)
          this.px[i] += between(rng, -4, 4)
          this.py[i] += between(rng, 0, 6)
          this.vx[i] = Math.cos(a) * speed
          this.vz[i] = Math.sin(a) * speed * 0.6
          this.vy[i] = between(rng, 8, 20)
          this.gravity[i] = 22
          this.drag[i] = 2.2
          this.sway[i] = between(rng, 3, 7)
          this.spinV[i] = between(rng, -5, 5)
          this.life[i] = between(rng, 1.3, 1.9)
          this.size0[i] = this.size1[i] = between(rng, 2.4, 3.4)
          this.alpha0[i] = 1
          break
        }
        case 'sparkle': {
          const speed = between(rng, 8, 14)
          this.vx[i] = Math.cos(a) * speed
          this.vz[i] = Math.sin(a) * speed * 0.6
          this.vy[i] = between(rng, 10, 20)
          this.gravity[i] = -3
          this.drag[i] = 2.6
          this.spinV[i] = between(rng, -2, 2)
          this.life[i] = between(rng, 0.9, 1.4)
          this.size0[i] = between(rng, 2.6, 3.8)
          this.size1[i] = 0.4
          this.alpha0[i] = 1
          break
        }
        case 'puff': {
          this.px[i] += between(rng, -1, 1)
          this.vx[i] = between(rng, 0.8, 2)
          this.vz[i] = 0.4
          this.vy[i] = between(rng, 3.2, 4.4)
          this.gravity[i] = 0
          this.drag[i] = 0.3
          this.sway[i] = 1.2
          this.life[i] = between(rng, 2.2, 2.8)
          this.size0[i] = 1.2 * (0.6 + s * 0.6)
          this.size1[i] = 4.4 * (0.6 + s * 0.6)
          this.alpha0[i] = 0.85
          break
        }
        case 'feather': {
          this.vx[i] = Math.cos(a) * between(rng, 4, 9)
          this.vz[i] = Math.sin(a) * 3
          this.vy[i] = between(rng, 6, 12)
          this.gravity[i] = 9
          this.drag[i] = 3
          this.sway[i] = between(rng, 4, 8)
          this.spinV[i] = between(rng, -3, 3)
          this.life[i] = between(rng, 1.4, 1.9)
          this.size0[i] = this.size1[i] = between(rng, 2.2, 3)
          this.alpha0[i] = 1
          break
        }
        default: {
          const unreachable: never = e.kind
          return unreachable
        }
      }
      setRgb(col, i, feather ?? burst.color[Math.floor(rng() * burst.color.length)])
    }
  }
}

// --- the ghost hand ----------------------------------------------------------------

const HAND_VERTEX = /* glsl */ `
  uniform vec3 anchor;
  uniform vec2 size;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = viewMatrix * vec4(anchor, 1.0);
    mv.xy += vec2(position.x * size.x, (position.y + 0.5) * size.y);
    gl_Position = projectionMatrix * mv;
  }
`

const HAND_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    float a = c.a * opacity;
    gl_FragColor = vec4(c.rgb * a, a);
  }
`

const HAND_W = 128
const HAND_H = 176
/** Room around the painted hand for its soft shadow, which falls down and to the right. */
const PAD = { left: 6, top: 6, right: 16, bottom: 22 }
const TEX_W = HAND_W + PAD.left + PAD.right
const TEX_H = HAND_H + PAD.top + PAD.bottom
const TIP = { x: 45, y: 172 }

/**
 * A soft cream hand in gouache with a brown ink line, pointing its finger
 * down, over a soft violet shadow so it reads on pale rock as well as on
 * grass. The fingertip lands on the anchor (see FINGER_X and FINGER_Y).
 */
function paintHand(): THREE.Texture {
  const hand = document.createElement('canvas')
  hand.width = HAND_W
  hand.height = HAND_H
  const ctx = hand.getContext('2d')!
  const ink = PALETTE.ink
  const skin = '#fbe8d2'
  const shade = '#eecaa8'
  const round = (x: number, y: number, rw: number, rh: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + rw, y, x + rw, y + rh, r)
    ctx.arcTo(x + rw, y + rh, x, y + rh, r)
    ctx.arcTo(x, y + rh, x, y, r)
    ctx.arcTo(x, y, x + rw, y, r)
    ctx.closePath()
  }
  const paint = (fill: string) => {
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = ink
    ctx.stroke()
  }
  ctx.lineJoin = 'round'
  // sleeve cuff
  round(30, 4, 68, 30, 12)
  paint('#9fb4d8')
  // palm with curled fingers
  round(26, 26, 76, 70, 28)
  paint(skin)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.ellipse(52 + i * 17, 92, 9, 11, 0, 0, Math.PI * 2)
    paint(skin)
  }
  // thumb
  ctx.beginPath()
  ctx.ellipse(26, 68, 11, 20, -0.5, 0, Math.PI * 2)
  paint(skin)
  // the pointing finger
  round(34, 70, 22, 102, 11)
  paint(skin)
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.ellipse(45, 160, 6, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const out = canvas.getContext('2d')!
  out.shadowColor = 'rgba(43, 35, 80, 0.5)'
  out.shadowBlur = 10
  out.shadowOffsetX = 5
  out.shadowOffsetY = 9
  out.drawImage(hand, PAD.left, PAD.top)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  return texture
}

/** Where the fingertip sits in the texture, as offsets that move it onto the quad's anchor. */
const FINGER_X = (PAD.left + TIP.x) / TEX_W - 0.5
const FINGER_Y = (TEX_H - PAD.top - TIP.y) / TEX_H
/** World size of the quad: 17.2 units across the painted hand itself, grown by the shadow padding. */
const HAND_SIZE = { x: (17.2 * TEX_W) / HAND_W, y: ((17.2 * HAND_H) / HAND_W) * (TEX_H / HAND_H) }

class GhostHand {
  readonly mesh: THREE.Mesh
  private readonly uniforms: { anchor: { value: THREE.Vector3 }; size: { value: THREE.Vector2 }; opacity: { value: number }; map: { value: THREE.Texture } }

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1)
    geometry.translate(-FINGER_X, -FINGER_Y, 0)
    this.uniforms = { anchor: { value: new THREE.Vector3() }, size: { value: new THREE.Vector2(HAND_SIZE.x, HAND_SIZE.y) }, opacity: { value: 0 }, map: { value: paintHand() } }
    const material = new THREE.ShaderMaterial({ ...PREMULTIPLIED, depthTest: false, uniforms: this.uniforms, vertexShader: HAND_VERTEX, fragmentShader: HAND_FRAGMENT })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 30
    this.mesh.visible = false
  }

  set(x: number, y: number, z: number, press: number, opacity: number): void {
    this.mesh.visible = opacity > 0.01
    this.uniforms.anchor.value.set(x, y, z)
    const s = 1 - press * 0.08
    this.uniforms.size.value.set(HAND_SIZE.x * s, HAND_SIZE.y * s)
    this.uniforms.opacity.value = opacity * 0.92
  }
}

// --- all together ------------------------------------------------------------------

const SHADOW_COLOR = rgb(PALETTE.shadow)
const RING_COLOR = rgb(PALETTE.ring)

export class Overlays {
  readonly group = new THREE.Group()
  private readonly decals = new Decals()
  private readonly points = new Points()
  private readonly hand = new GhostHand()

  constructor() {
    this.group.add(this.decals.mesh, this.points.points, this.hand.mesh)
  }

  update(forest: ForestController, dt: number, tier: Tier, night: number, morning: number): void {
    const decals = this.decals
    decals.begin()
    const creatures = forest.creatures
    const shadowStrength = 0.34 * (1 - night * 0.5)
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i]
      const inTree = (c.atHome || c.mode === 'travel' || c.mode === 'toHome' || c.mode === 'react') && c.y > 3
      if (c.key === 'fish' && c.atHome) continue
      if (inTree) continue
      const size = c.spec.size
      const lift = Math.max(0, c.y)
      const spread = 1 + lift * 0.025
      decals.add(c.x, 0.2, c.z, c.spec.radius * 1.05 * spread, c.spec.radius * 0.72 * spread, SHADOW_COLOR, shadowStrength / (1 + lift * 0.06), SHADOW, i * 0.37)
      if (i === forest.glowIndex && forest.glow > 0) {
        const breathe = 1 + 0.06 * Math.sin(forest.t * 3.2)
        decals.add(c.x, 0.3, c.z, size * 1.05 * breathe, size * 0.72 * breathe, RING_COLOR, 0.9 * forest.glow, RING, 0.5)
      }
    }
    const pose = forest.hand
    let handY = 0
    if (forest.handAnimal >= 0 && pose.opacity > 0.01) {
      const c = creatures[forest.handAnimal]
      handY = c.mode === 'held' ? c.pivotY : c.y + c.spec.size * 0.95 + (1 - pose.press) * 9
      decals.add(pose.x, 0.25, pose.z, 3 + (1 - pose.press) * 2, 2.2 + (1 - pose.press) * 1.4, SHADOW_COLOR, 0.22 * pose.opacity, SHADOW, 0.9)
    }
    decals.end()
    this.hand.set(pose.x, handY, pose.z, pose.press, forest.handAnimal >= 0 ? pose.opacity : 0)
    this.points.update(forest, dt, tier, night, morning)
  }
}
