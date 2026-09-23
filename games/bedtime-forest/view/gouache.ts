import * as THREE from 'three'
import { createRng, between } from '../rng'
import { PALETTE, rgb } from './palette'

// The gouache materials. Fill: flat pigment from vertex colours, lit in
// two or three hard tone bands (cool violet shadow, the pigment itself,
// a warm light) whose edges wander with a procedurally painted dry-brush
// texture, sampled in each shape's rest space so strokes stick to a body
// as it moves. Ink: an inverted hull pushed out in screen space by a
// per-vertex width, so the line thickens and thins like a brush. Both
// share one set of uniforms for the dusk/night/morning grade.

export const BRUSH_SIZE = 256

function vec3(hex: string): THREE.Vector3 {
  const [r, g, b] = rgb(hex)
  return new THREE.Vector3(r, g, b)
}

/** Dry-brush strokes in red, bristle speckle in green, a soft cloud in blue; tiles seamlessly. */
function paintBrushTexture(): THREE.Texture {
  const size = BRUSH_SIZE
  const layer = (paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgb(128,128,128)'
    ctx.fillRect(0, 0, size, size)
    paint(ctx)
    return ctx.getImageData(0, 0, size, size).data
  }
  const rng = createRng(4242)
  const wrapped = (draw: (ox: number, oy: number) => void) => {
    for (let ox = -size; ox <= size; ox += size) for (let oy = -size; oy <= size; oy += size) draw(ox, oy)
  }
  const strokes = layer((ctx) => {
    ctx.lineCap = 'round'
    for (let i = 0; i < 520; i++) {
      const x = rng() * size
      const y = rng() * size
      const angle = (rng() < 0.7 ? 0.5 : -0.9) + between(rng, -0.35, 0.35)
      const length = between(rng, 14, 60)
      const width = between(rng, 1.5, 7)
      const v = Math.round(between(rng, 60, 200))
      ctx.strokeStyle = `rgba(${v},${v},${v},${between(rng, 0.12, 0.34).toFixed(2)})`
      ctx.lineWidth = width
      const dx = Math.cos(angle) * length
      const dy = Math.sin(angle) * length
      const bendX = dx * 0.5 + between(rng, -4, 4)
      const bendY = dy * 0.5 + between(rng, -4, 4)
      wrapped((ox, oy) => {
        ctx.beginPath()
        ctx.moveTo(x + ox, y + oy)
        ctx.quadraticCurveTo(x + ox + bendX, y + oy + bendY, x + ox + dx, y + oy + dy)
        ctx.stroke()
      })
    }
  })
  const speckle = layer((ctx) => {
    for (let i = 0; i < 2600; i++) {
      const x = rng() * size
      const y = rng() * size
      const v = Math.round(between(rng, 40, 230))
      ctx.fillStyle = `rgba(${v},${v},${v},0.5)`
      const r = between(rng, 0.6, 2.2)
      wrapped((ox, oy) => ctx.fillRect(x + ox, y + oy, r, r))
    }
  })
  const cloud = layer((ctx) => {
    for (let i = 0; i < 90; i++) {
      const x = rng() * size
      const y = rng() * size
      const v = Math.round(between(rng, 70, 190))
      const r = between(rng, 16, 54)
      wrapped((ox, oy) => {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
        g.addColorStop(0, `rgba(${v},${v},${v},0.35)`)
        g.addColorStop(1, `rgba(${v},${v},${v},0)`)
        ctx.fillStyle = g
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
      })
    }
  })
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = strokes[i * 4]
    data[i * 4 + 1] = speckle[i * 4]
    data[i * 4 + 2] = cloud[i * 4]
    data[i * 4 + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

let brush: THREE.Texture | null = null
export function brushTexture(): THREE.Texture {
  brush ??= paintBrushTexture()
  return brush
}

/** Uniform objects shared by every gouache material, so one write updates the whole forest. */
export const shared = {
  time: { value: 0 },
  night: { value: 0 },
  morning: { value: 0 },
  resolution: { value: new THREE.Vector2(1, 1) },
  inkPx: { value: 1.7 },
  lightDir: { value: new THREE.Vector3(-0.55, 0.75, 0.45).normalize() },
  shadowTint: { value: new THREE.Vector3(0.6, 0.56, 0.8) },
  lightTint: { value: new THREE.Vector3(1.1, 1.0, 0.86) },
  haze: { value: vec3('#8e8fb4') },
  hazeNight: { value: vec3('#1c2448') },
  ink: { value: vec3(PALETTE.ink) },
  glowColor: { value: vec3(PALETTE.glow) },
  waterLight: { value: vec3(PALETTE.waterLight) },
}

export const HOME_COUNT = 6

/** Scenery-only uniforms: each home's shake (0..1), window glow (0..1), base, and height. */
export const homeUniforms = {
  homeShake: { value: new Float32Array(HOME_COUNT) },
  homeGlow: { value: new Float32Array(HOME_COUNT) },
  homeBase: { value: Array.from({ length: HOME_COUNT }, () => new THREE.Vector3()) },
}

const TRANSFORM = /* glsl */ `
  uniform float time;
  attribute float part;
  #ifdef PARTS
    uniform mat4 parts[PARTS];
  #endif
  #ifdef HOMES
    uniform float homeShake[${HOME_COUNT}];
    uniform float homeGlow[${HOME_COUNT}];
    uniform vec3 homeBase[${HOME_COUNT}];
  #endif
  vec4 place(inout vec3 n, out float glow) {
    vec4 p = vec4(position, 1.0);
    n = normal;
    glow = 0.0;
    #ifdef PARTS
      mat4 m = parts[int(part + 0.5)];
      p = m * p;
      n = mat3(m) * n;
    #endif
    #ifdef HOMES
      int h = int(part + 0.5) - 1;
      if (h >= 0) {
        float s = homeShake[h];
        float up = clamp((position.y - homeBase[h].y) / 30.0, 0.0, 1.0);
        p.x += sin(time * 31.0 + float(h)) * s * up * 1.8;
        p.z += cos(time * 26.0 + float(h)) * s * up * 0.9;
        glow = homeGlow[h];
      }
    #endif
    return modelMatrix * p;
  }
`

const FILL_VERTEX = /* glsl */ `
  ${TRANSFORM}
  attribute vec3 tint;
  attribute float kind;
  varying vec3 vTint;
  varying vec3 vNormal;
  varying vec3 vRest;
  varying vec3 vWorld;
  varying float vKind;
  varying float vGlow;
  void main() {
    vec3 n;
    float glow;
    vec4 world = place(n, glow);
    vTint = tint;
    vKind = kind;
    vGlow = glow;
    vRest = position;
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FILL_FRAGMENT = /* glsl */ `
  uniform sampler2D brush;
  uniform float time;
  uniform float night;
  uniform float morning;
  uniform vec3 lightDir;
  uniform vec3 shadowTint;
  uniform vec3 lightTint;
  uniform vec3 haze;
  uniform vec3 hazeNight;
  uniform vec3 glowColor;
  uniform vec3 waterLight;
  uniform float brushScale;
  uniform float hazeNear;
  uniform float hazeFar;
  varying vec3 vTint;
  varying vec3 vNormal;
  varying vec3 vRest;
  varying vec3 vWorld;
  varying float vKind;
  varying float vGlow;

  vec3 brushAt(vec3 p, vec3 n) {
    vec3 w = abs(n);
    w /= (w.x + w.y + w.z + 1e-4);
    return texture2D(brush, p.zy).rgb * w.x + texture2D(brush, p.xz).rgb * w.y + texture2D(brush, p.xy).rgb * w.z;
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 b = brushAt(vRest * brushScale, n);
    float ndl = dot(n, lightDir) * 0.5 + 0.5;
    float x = ndl + (b.r - 0.5) * 0.34 + (b.b - 0.5) * 0.12;
    float lo = smoothstep(0.43, 0.47, x);
    float hi = smoothstep(0.76, 0.8, x);
    vec3 base = vTint * (0.9 + 0.2 * b.g);
    vec3 col = mix(base * shadowTint, base, lo);
    col = mix(col, base * lightTint, hi);

    if (vKind > 1.5) {
      float wave = sin(vWorld.x * 0.32 + time * 0.7 + sin(vWorld.z * 0.45 + time * 0.4) * 1.6);
      col = mix(col, waterLight, smoothstep(0.7, 0.95, wave + (b.r - 0.5) * 0.7) * 0.45);
    }

    vec3 moonlit = col * vec3(0.34, 0.4, 0.66) + vec3(0.015, 0.025, 0.07);
    col = mix(col, moonlit, night);
    col = mix(col, col * vec3(1.05, 1.04, 1.0) + vec3(0.035, 0.03, 0.01), morning);

    if (vKind > 0.5 && vKind < 1.5) {
      col = mix(col, glowColor * (0.85 + 0.3 * b.b), clamp(vGlow, 0.0, 1.0));
    }

    float d = distance(vWorld, cameraPosition);
    float h = smoothstep(hazeNear, hazeFar, d) * 0.6;
    col = mix(col, mix(haze, hazeNight, night), h);
    gl_FragColor = vec4(col, 1.0);
  }
`

const INK_VERTEX = /* glsl */ `
  ${TRANSFORM}
  uniform vec2 resolution;
  uniform float inkPx;
  attribute float ink;
  void main() {
    vec3 n;
    float glow;
    vec4 world = place(n, glow);
    vec4 clip = projectionMatrix * viewMatrix * world;
    vec3 nView = normalize(mat3(viewMatrix) * normalize(mat3(modelMatrix) * n));
    vec2 dir = (projectionMatrix * vec4(nView, 0.0)).xy;
    float len = length(dir);
    dir = len > 1e-5 ? dir / len : vec2(0.0);
    clip.xy += dir * (inkPx * ink) * 2.0 / resolution * clip.w;
    gl_Position = clip;
  }
`

const INK_FRAGMENT = /* glsl */ `
  uniform vec3 ink;
  uniform float night;
  void main() {
    gl_FragColor = vec4(mix(ink, ink * 0.55 + vec3(0.02, 0.025, 0.07), night), 1.0);
  }
`

export type MaterialOptions = { parts?: number; homes?: boolean; brushScale?: number; hazeNear?: number; hazeFar?: number }

export function fillMaterial(options: MaterialOptions = {}): THREE.ShaderMaterial {
  const defines: Record<string, string | number> = {}
  if (options.parts) defines.PARTS = options.parts
  if (options.homes) defines.HOMES = 1
  const uniforms: Record<string, THREE.IUniform> = {
    ...shared,
    brush: { value: brushTexture() },
    brushScale: { value: options.brushScale ?? 0.08 },
    hazeNear: { value: options.hazeNear ?? 330 },
    hazeFar: { value: options.hazeFar ?? 620 },
  }
  if (options.homes) Object.assign(uniforms, homeUniforms)
  if (options.parts) uniforms.parts = { value: new Float32Array(options.parts * 16) }
  return new THREE.ShaderMaterial({ defines, uniforms, vertexShader: FILL_VERTEX, fragmentShader: FILL_FRAGMENT })
}

/** An ink hull that shares its fill's part matrices (pass the same Float32Array). */
export function inkMaterial(options: MaterialOptions = {}, parts?: Float32Array): THREE.ShaderMaterial {
  const defines: Record<string, string | number> = {}
  if (options.parts) defines.PARTS = options.parts
  if (options.homes) defines.HOMES = 1
  const uniforms: Record<string, THREE.IUniform> = { ...shared }
  if (options.homes) Object.assign(uniforms, homeUniforms)
  if (options.parts) uniforms.parts = { value: parts ?? new Float32Array(options.parts * 16) }
  return new THREE.ShaderMaterial({ defines, uniforms, vertexShader: INK_VERTEX, fragmentShader: INK_FRAGMENT, side: THREE.BackSide })
}
