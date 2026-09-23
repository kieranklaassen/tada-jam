import * as THREE from 'three'
import { hex, PALETTE } from './palette'

// All solid things share one unlit facet shader (KTD5). Lighting is decided
// per vertex from the world normal (tops brightest, left faces mid, right
// faces darker, undersides and backs tinted violet), and the colour fades
// into the dusk below the tower and during travel. The fragment shader only
// writes the interpolated colour, so fill cost stays minimal on weak GPUs.

const SKY = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyBottom;
vec3 skyAt(vec2 ndc) {
  float t = clamp(0.5 - 0.36 * ndc.y + 0.14 * ndc.x, 0.0, 1.0);
  vec3 c = t < 0.5 ? mix(uSkyTop, uSkyMid, t * 2.0) : mix(uSkyMid, uSkyBottom, t * 2.0 - 1.0);
  return c;
}
`

const FACET_VERTEX = /* glsl */ `
attribute vec3 color;
uniform vec3 uShade;
uniform float uFade;
uniform float uFogTop;
uniform float uFogBottom;
uniform float uFogAmount;
uniform vec3 uTint;
uniform float uTintAmount;
uniform float uLift;
varying vec3 vColor;
${SKY}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 a = abs(n);
  float light = (max(n.y, 0.0) * 1.0 + max(-n.y, 0.0) * 0.42 + max(n.z, 0.0) * 0.8 + max(-n.z, 0.0) * 0.55 + max(n.x, 0.0) * 0.63 + max(-n.x, 0.0) * 0.5) / (a.x + a.y + a.z);
  // Colours above 1.5 are emissive (baked as colour + 2): lit windows, lantern glass, door light.
  float emissive = step(1.5, color.r);
  vec3 base = color - 2.0 * emissive;
  vec3 c = mix(base * mix(uShade, vec3(1.0), light), base, emissive);
  c += uLift * max(n.y, 0.0) * 0.06;
  gl_Position = projectionMatrix * viewMatrix * world;
  vec3 sky = skyAt(gl_Position.xy / gl_Position.w);
  float fog = smoothstep(uFogTop, uFogBottom, world.y) * uFogAmount;
  c = mix(c, sky, max(fog, uFade));
  c = mix(c, uTint, uTintAmount);
  vColor = c;
}
`

const FACET_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`

export type FacetUniforms = {
  uSkyTop: { value: THREE.Color }
  uSkyMid: { value: THREE.Color }
  uSkyBottom: { value: THREE.Color }
  uShade: { value: THREE.Color }
  uFade: { value: number }
  uFogTop: { value: number }
  uFogBottom: { value: number }
  uFogAmount: { value: number }
  uTint: { value: THREE.Color }
  uTintAmount: { value: number }
  uLift: { value: number }
}

/** A raw sRGB colour for shader uniforms (the facet shader works in display space). */
export function raw(value: string): THREE.Color {
  const [r, g, b] = hex(value)
  const color = new THREE.Color()
  color.r = r
  color.g = g
  color.b = b
  return color
}

export function facetMaterial(options: { fogTop?: number; fogBottom?: number; fog?: number; shade?: string } = {}): THREE.ShaderMaterial & { uniforms: FacetUniforms } {
  const uniforms: FacetUniforms = {
    uSkyTop: { value: raw(PALETTE.skyTop) },
    uSkyMid: { value: raw(PALETTE.skyMid) },
    uSkyBottom: { value: raw(PALETTE.skyBottom) },
    uShade: { value: raw(options.shade ?? PALETTE.shade) },
    uFade: { value: 0 },
    uFogTop: { value: options.fogTop ?? -0.5 },
    uFogBottom: { value: options.fogBottom ?? -4 },
    uFogAmount: { value: options.fog ?? 0.92 },
    uTint: { value: raw(PALETTE.doorLight) },
    uTintAmount: { value: 0 },
    uLift: { value: 0 },
  }
  return new THREE.ShaderMaterial({ uniforms, vertexShader: FACET_VERTEX, fragmentShader: FACET_FRAGMENT }) as THREE.ShaderMaterial & { uniforms: FacetUniforms }
}

const SKY_VERTEX = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`

const SKY_FRAGMENT = /* glsl */ `
varying vec2 vNdc;
uniform float uDither;
uniform vec3 uGlow;
${SKY}
void main() {
  vec3 c = skyAt(vNdc);
  float glow = 1.0 - smoothstep(0.0, 1.1, length((vNdc - vec2(-0.1, 0.35)) * vec2(0.8, 1.2)));
  c = mix(c, uGlow, glow * 0.22);
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(c + noise * uDither / 255.0, 1.0);
}
`

/** One full-screen triangle behind everything: the dusk gradient. */
export function skyMesh(): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSkyTop: { value: raw(PALETTE.skyTop) },
      uSkyMid: { value: raw(PALETTE.skyMid) },
      uSkyBottom: { value: raw(PALETTE.skyBottom) },
      uGlow: { value: raw('#fff1dc') },
      uDither: { value: 1 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -10
  return mesh
}

const MOTE_VERTEX = /* glsl */ `
attribute vec4 seed;
uniform float uTime;
uniform float uPixel;
uniform float uFade;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * (0.05 + seed.w * 0.05) + seed.x * 10.0;
  p.y += mod(t, 1.0) * 6.0 - 3.0;
  p.x += sin(uTime * 0.31 + seed.y * 6.28) * 0.5;
  p.z += cos(uTime * 0.27 + seed.z * 6.28) * 0.5;
  vec4 view = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  float life = mod(t, 1.0);
  vAlpha = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.7, 1.0, life)) * (1.0 - uFade);
  gl_PointSize = uPixel * (2.0 + seed.y * 2.6);
}
`

const MOTE_FRAGMENT = /* glsl */ `
varying float vAlpha;
uniform vec3 uColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = max(abs(d.x) + abs(d.y), 0.0);
  float a = (1.0 - smoothstep(0.3, 0.5, r)) * vAlpha;
  gl_FragColor = vec4(uColor, a * 0.75);
}
`

/** Drifting dusk motes, animated entirely on the GPU so they cost nothing per frame. */
export function motes(count: number, spread: number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const positions: number[] = []
  const seeds: number[] = []
  let s = 11
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < count; i++) {
    positions.push((rand() - 0.5) * spread, (rand() - 0.5) * 4, (rand() - 0.5) * spread)
    seeds.push(rand(), rand(), rand(), rand())
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 2 }, uFade: { value: 0 }, uColor: { value: raw('#fff6e4') } },
    vertexShader: MOTE_VERTEX,
    fragmentShader: MOTE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return points
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  // Sampled as-is: every shader here works in display space.
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

const FLAT_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FLAT_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uOpacity;
uniform sampler2D uMap;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  gl_FragColor = vec4(uColor * texel.rgb, texel.a * uOpacity);
}
`

export type FlatUniforms = {
  uColor: { value: THREE.Color }
  uOpacity: { value: number }
  uMap: { value: THREE.Texture }
}

/** A textured, unlit, transparent quad material for glows, shadows, ripples and the ghost hand. */
export function flatMaterial(
  map: THREE.Texture,
  color: string,
  options: { additive?: boolean; depthTest?: boolean; opacity?: number } = {},
): THREE.ShaderMaterial & { uniforms: FlatUniforms } {
  const uniforms: FlatUniforms = { uColor: { value: raw(color) }, uOpacity: { value: options.opacity ?? 1 }, uMap: { value: map } }
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FLAT_VERTEX,
    fragmentShader: FLAT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: options.depthTest ?? true,
    side: THREE.DoubleSide,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }) as THREE.ShaderMaterial & { uniforms: FlatUniforms }
}

const PLAIN_VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PLAIN_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
}
`

/** Untextured flat colour (the ring track, the lit tray under the current diorama). */
export function plainMaterial(color: string, opacity: number): THREE.ShaderMaterial & { uniforms: { uColor: { value: THREE.Color }; uOpacity: { value: number } } } {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: raw(color) }, uOpacity: { value: opacity } },
    vertexShader: PLAIN_VERTEX,
    fragmentShader: PLAIN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }) as THREE.ShaderMaterial & { uniforms: { uColor: { value: THREE.Color }; uOpacity: { value: number } } }
}

/** A soft round glow, drawn once at startup (no fetched textures). */
export function glowTexture(): THREE.CanvasTexture {
  return canvasTexture(128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
}

/** A four-pointed glint for an impossible join appearing. */
export function glintTexture(): THREE.CanvasTexture {
  return canvasTexture(128, (ctx, size) => {
    const c = size / 2
    ctx.translate(c, c)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.4)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-c, -c, size, size)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, -c * 0.95)
      ctx.lineTo(c * 0.07, 0)
      ctx.lineTo(-c * 0.07, 0)
      ctx.closePath()
      ctx.fill()
    }
  })
}

/** Soft blob shadow. */
export function shadowTexture(): THREE.CanvasTexture {
  return canvasTexture(64, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.75)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.4)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
}

/** The ghost hand: a soft pointing hand silhouette, drawn with canvas paths. */
export function handTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (ctx) => {
    ctx.translate(128, 128)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    const shape = () => {
      ctx.beginPath()
      // Index finger pointing up to the tip at (0, -104).
      ctx.moveTo(-16, -8)
      ctx.lineTo(-16, -90)
      ctx.quadraticCurveTo(-16, -106, 0, -106)
      ctx.quadraticCurveTo(16, -106, 16, -90)
      ctx.lineTo(16, -30)
      // Folded fingers.
      ctx.quadraticCurveTo(30, -44, 44, -30)
      ctx.quadraticCurveTo(58, -38, 66, -20)
      ctx.quadraticCurveTo(80, -24, 82, 0)
      ctx.lineTo(80, 40)
      ctx.quadraticCurveTo(76, 92, 22, 100)
      ctx.lineTo(-8, 100)
      ctx.quadraticCurveTo(-40, 96, -52, 60)
      // Thumb.
      ctx.lineTo(-72, 14)
      ctx.quadraticCurveTo(-78, -6, -58, -8)
      ctx.quadraticCurveTo(-44, -6, -34, 14)
      ctx.lineTo(-16, 30)
      ctx.closePath()
    }
    ctx.shadowColor = 'rgba(60, 40, 90, 0.35)'
    ctx.shadowBlur = 14
    ctx.fillStyle = 'rgba(255, 250, 244, 0.96)'
    shape()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(90, 70, 130, 0.55)'
    shape()
    ctx.stroke()
  })
}

/** A thin ring for touch ripples. */
export function ringTexture(): THREE.CanvasTexture {
  return canvasTexture(128, (ctx, size) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2)
    ctx.stroke()
  })
}
