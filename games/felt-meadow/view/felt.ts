import {
  AddEquation,
  BackSide,
  Color,
  CustomBlending,
  DataTexture,
  DoubleSide,
  DstColorFactor,
  FrontSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MeshLambertMaterial,
  NoColorSpace,
  OneFactor,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  ZeroFactor,
  type Side,
} from 'three'
import { BLUE, BROWN, GREEN, ORANGE, PURPLE, RED, YELLOW, type Hue } from '../colors'

// Felt, procedurally. Colours are authored as the values they should show on
// screen and pass through untouched (the renderer outputs them as-is, with no
// tone mapping), so the one post pass can drop out on slow devices without
// shifting the palette. Felt itself is a Lambert surface with three cheap
// additions: a heather texture that varies the dye fibre by fibre, a fibre
// normal map, and a fresnel sheen where the surface turns away from the eye.
// The hero objects also get an inverted-hull fuzz shell: a second draw pushed
// out along the normals, back faces only, that dithers away into a soft halo.

export function paint(hex: number, out = new Color()): Color {
  return out.setHex(hex, LinearSRGBColorSpace)
}

export function hexCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

export const HUE_HEX: Readonly<Record<Hue, number>> = {
  [RED]: 0xcf4636,
  [ORANGE]: 0xec8434,
  [YELLOW]: 0xf6cb3c,
  [GREEN]: 0x8cc653,
  [BLUE]: 0x3e72d0,
  [PURPLE]: 0x9656c0,
  [BROWN]: 0xa8693c,
}

/** Petals are the seed's dye, a touch lighter, so a bloom reads as the same colour grown up. */
export const PETAL_HEX: Readonly<Record<Hue, number>> = {
  [RED]: 0xdc5443,
  [ORANGE]: 0xf49445,
  [YELLOW]: 0xfad75a,
  [GREEN]: 0x9dd467,
  [BLUE]: 0x5a88dc,
  [PURPLE]: 0xa76ccc,
  [BROWN]: 0xb97b4c,
}

export const CENTRE_HEX: Readonly<Record<Hue, number>> = {
  [RED]: 0xf8eed6,
  [ORANGE]: 0x6f4a2d,
  [YELLOW]: 0x6f4a2d,
  [GREEN]: 0xf8eed6,
  [BLUE]: 0xf8eed6,
  [PURPLE]: 0xf8eed6,
  [BROWN]: 0xf8eed6,
}

export const PALETTE = {
  floorNear: 0xe7dcc6,
  floorFar: 0xeee5d4,
  wallLow: 0xf1e9db,
  wallHigh: 0xf6f1e7,
  shadowTint: 0x39452c,
  soil: 0x5d3c2a,
  soilDeep: 0x3e281c,
  pouch: 0xece2cc,
  pouchShade: 0xcfc0a2,
  pouchInside: 0x3a2a21,
  string: 0xd4c19f,
  stem: 0x9bbd5e,
  leaf: 0x86b04e,
  leafVein: 0x6d953e,
  beeYellow: 0xf4c232,
  beeDark: 0x2d2622,
  wing: 0xfaf6ee,
  eyeWhite: 0xfcf8f0,
  cheek: 0xeb9c8d,
  snailBody: 0xdcd0dc,
  snailBelly: 0xbfb0c2,
  shell: 0xc98f47,
  shellStripe: 0xf1dfb7,
  mouse: 0xcfb394,
  mouseBelly: 0xf0e4d0,
  mousePink: 0xe7a2a0,
  bush: 0x4c663f,
  bushLight: 0x5d7a4b,
  stone: 0xbdb4a4,
  cloud: 0xfbf8f2,
  hand: 0xfbf4e6,
  glow: 0xfff1c9,
}

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE = 256

function wrap(i: number): number {
  return ((i % SIZE) + SIZE) % SIZE
}

/** Short curly fibres laid down at random: a tileable height field (and a dye offset per fibre). */
function fibreField(random: () => number, count: number): { height: Float32Array; dye: Float32Array } {
  const height = new Float32Array(SIZE * SIZE)
  const dye = new Float32Array(SIZE * SIZE * 3)
  const weight = new Float32Array(SIZE * SIZE)
  for (let f = 0; f < count; f++) {
    let x = random() * SIZE
    let y = random() * SIZE
    let angle = random() * Math.PI * 2
    const curl = (random() - 0.5) * 0.5
    const steps = 6 + Math.floor(random() * 14)
    const lift = 0.5 + random() * 0.5
    const shade = (random() - 0.62) * 0.2
    const tintR = (random() - 0.5) * 0.05
    const tintB = (random() - 0.5) * 0.05
    for (let s = 0; s < steps; s++) {
      const cx = Math.floor(x)
      const cy = Math.floor(y)
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const w = ox === 0 && oy === 0 ? 1 : ox === 0 || oy === 0 ? 0.45 : 0.2
          const index = wrap(cy + oy) * SIZE + wrap(cx + ox)
          height[index] += w * lift
          weight[index] += w
          dye[index * 3] += w * (shade + tintR)
          dye[index * 3 + 1] += w * shade
          dye[index * 3 + 2] += w * (shade + tintB)
        }
      }
      angle += curl + (random() - 0.5) * 0.35
      x += Math.cos(angle) * 1.1
      y += Math.sin(angle) * 1.1
    }
  }
  for (let i = 0; i < SIZE * SIZE; i++) {
    const w = Math.max(1, weight[i])
    dye[i * 3] /= w
    dye[i * 3 + 1] /= w
    dye[i * 3 + 2] /= w
  }
  return { height, dye }
}

function dataTexture(data: Uint8Array): DataTexture {
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = NoColorSpace
  texture.needsUpdate = true
  return texture
}

export type FeltTextures = { heather: DataTexture; fibre: DataTexture }

let shared: FeltTextures | null = null

/** Built once per page and shared by every mount. */
export function feltTextures(): FeltTextures {
  if (shared) return shared
  const random = seeded(2026)
  const { height, dye } = fibreField(random, 4200)
  const heather = new Uint8Array(SIZE * SIZE * 4)
  const fibre = new Uint8Array(SIZE * SIZE * 4)
  let maxHeight = 0
  for (let i = 0; i < height.length; i++) maxHeight = Math.max(maxHeight, height[i])
  const at = (x: number, y: number) => height[wrap(y) * SIZE + wrap(x)] / maxHeight
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const h = at(x, y)
      const base = 0.9 + h * 0.1
      heather[i * 4] = Math.round(Math.min(1, Math.max(0, base + dye[i * 3])) * 255)
      heather[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, base + dye[i * 3 + 1])) * 255)
      heather[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, base + dye[i * 3 + 2])) * 255)
      heather[i * 4 + 3] = 255
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.2
      const length = Math.hypot(dx, dy, 1)
      fibre[i * 4] = Math.round((-dx / length) * 127.5 + 127.5)
      fibre[i * 4 + 1] = Math.round((-dy / length) * 127.5 + 127.5)
      fibre[i * 4 + 2] = Math.round((1 / length) * 127.5 + 127.5)
      fibre[i * 4 + 3] = 255
    }
  }
  shared = { heather: dataTexture(heather), fibre: dataTexture(fibre) }
  return shared
}

export type FeltOptions = {
  color?: number
  vertexColors?: boolean
  /** Fresnel sheen strength: fibre tips catching the light at grazing angles. */
  sheen?: number
  normalScale?: number
  side?: Side
}

/** Felt: Lambert with heather, a fibre normal map, and a rim sheen. One shader program serves every felt material. */
export function feltMaterial(textures: FeltTextures, options: FeltOptions = {}): MeshLambertMaterial {
  const material = new MeshLambertMaterial({
    color: paint(options.color ?? 0xffffff),
    vertexColors: options.vertexColors ?? true,
    map: textures.heather,
    normalMap: textures.fibre,
    normalScale: new Vector2(options.normalScale ?? 0.55, options.normalScale ?? 0.55),
    side: options.side ?? FrontSide,
  })
  const sheen = { value: options.sheen ?? 0.3 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSheen = sheen
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSheen;').replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float feltRim = 1.0 - saturate(abs(dot(normal, normalize(vViewPosition))));
      totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.9), 0.4) * (feltRim * feltRim * feltRim) * uSheen;`,
    )
  }
  material.customProgramCacheKey = () => 'felt-sheen'
  return material
}

export type FuzzOptions = {
  /** How far the halo stands off the surface, in world units. */
  thickness: number
  /** Facing ratio where the halo is densest; about sqrt(1 - (r / (r + thickness))^2) for a ball of radius r. */
  edge: number
  /** Fibre noise frequency in object space. */
  fibre?: number
  /** 0 keeps the dye, 1 is cream: a lighter halo keeps characters apart from the ground. */
  lift?: number
  color?: number
  vertexColors?: boolean
}

const FUZZ_VERTEX = /* glsl */ `
uniform float uThickness;
uniform float uFibre;
uniform vec3 uColor;
varying vec3 vColor;
varying vec3 vFibre;
varying float vFacing;
varying float vUp;
void main() {
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
    model = modelMatrix * instanceMatrix;
  #endif
  vec4 world = model * vec4(position + normal * uThickness, 1.0);
  vec3 n = normalize(mat3(model) * normal);
  vFacing = abs(dot(n, normalize(cameraPosition - world.xyz)));
  vUp = n.y;
  vFibre = position * uFibre;
  vec3 base = uColor;
  #ifdef USE_INSTANCING_COLOR
    base *= instanceColor;
  #endif
  #ifdef USE_COLOR
    base *= color;
  #endif
  vColor = base;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FUZZ_FRAGMENT = /* glsl */ `
uniform float uEdge;
uniform float uLift;
varying vec3 vColor;
varying vec3 vFibre;
varying float vFacing;
varying float vUp;
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
void main() {
  float density = smoothstep(0.0, uEdge, vFacing);
  float fibres = noise(vFibre) * 0.6 + noise(vFibre * 2.9 + 7.0) * 0.4;
  density *= 0.2 + 1.05 * fibres;
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (density < dither) discard;
  vec3 halo = mix(vColor, vec3(1.0, 0.97, 0.9), uLift);
  gl_FragColor = vec4(halo * (0.8 + 0.28 * max(vUp, 0.0)), 1.0);
}
`

/** The inverted-hull fuzz shell. Drawn after its base mesh, so depth rejects the inside and only a silhouette band remains. */
export function fuzzMaterial(options: FuzzOptions): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uThickness: { value: options.thickness },
      uEdge: { value: options.edge },
      uFibre: { value: options.fibre ?? 2.2 },
      uLift: { value: options.lift ?? 0.35 },
      uColor: { value: paint(options.color ?? 0xffffff) },
    },
    vertexShader: FUZZ_VERTEX,
    fragmentShader: FUZZ_FRAGMENT,
    side: BackSide,
    vertexColors: options.vertexColors ?? false,
  })
}

const BLOB_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vStrength;
void main() {
  vUv = uv * 2.0 - 1.0;
  vStrength = 1.0;
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
    model = modelMatrix * instanceMatrix;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vStrength = instanceColor.r;
  #endif
  gl_Position = projectionMatrix * viewMatrix * model * vec4(position, 1.0);
}
`

/**
 * Soft contact shadows, multiplied onto the hill. They draw straight after the
 * hill with no depth test, so they never z-fight a slope, and everything that
 * stands on the hill draws over them. Instance colour red is the strength.
 */
export function blobMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uTint: { value: paint(PALETTE.shadowTint) } },
    vertexShader: BLOB_VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        float r = length(vUv);
        float a = 1.0 - smoothstep(0.15, 1.0, r);
        gl_FragColor = vec4(mix(vec3(1.0), uTint, a * a * vStrength), 1.0);
      }
    `,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: DstColorFactor,
    blendDst: ZeroFactor,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  })
}

/** The breathing glow ring of the guidance ladder: soft, warm, additive, drawn over everything. */
export function ringMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: paint(PALETTE.glow) } },
    vertexShader: BLOB_VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        float r = length(vUv);
        float ring = exp(-pow((r - 0.72) / 0.16, 2.0));
        float fill = (1.0 - smoothstep(0.0, 0.75, r)) * 0.18;
        gl_FragColor = vec4(uColor * (ring + fill) * vStrength * 0.55, 1.0);
      }
    `,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  })
}
