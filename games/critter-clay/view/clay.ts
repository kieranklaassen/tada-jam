import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PALETTE } from '../palette'

// Critter Clay's plasticine (games/critter-clay/ART.md). Every piece is
// built from primitives pushed into lumps, painted with baked occlusion in
// its vertex colours, and marked by one shared, procedurally drawn normal
// map of thumbprints, fingernail crescents, and loop-tool drags. Instanced
// clay adds two things in its shader: a per-vertex `tint` that decides
// whether the instance colour (the plasticine hue) applies, so white eyes
// and dark pupils live in the same draw as the hue, and the stop-motion
// "boil": a small wobble of the surface that changes twelve times a second,
// only on instances that are moving.

// --- noise -------------------------------------------------------------------------

function hash(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Smooth value noise in 0..1. */
export function noise(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = fade(x - xi)
  const v = fade(y - yi)
  const w = fade(z - zi)
  let total = 0
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const weight = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w)
        total += weight * hash(xi + dx, yi + dy, zi + dz, seed)
      }
    }
  }
  return total
}

// --- geometry --------------------------------------------------------------------

/**
 * Hand-pressed irregularity: every vertex moves by a 3D noise vector, so
 * vertices shared across UV seams move together and nothing cracks.
 */
export function lump(geometry: THREE.BufferGeometry, amount: number, frequency = 0.5, seed = 1): THREE.BufferGeometry {
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) * frequency
    const y = position.getY(i) * frequency
    const z = position.getZ(i) * frequency
    position.setXYZ(
      i,
      position.getX(i) + (noise(x, y, z, seed) - 0.5) * amount,
      position.getY(i) + (noise(x + 31.7, y, z, seed) - 0.5) * amount,
      position.getZ(i) + (noise(x, y + 47.3, z, seed) - 0.5) * amount,
    )
  }
  geometry.computeVertexNormals()
  if (geometry.userData.weld) weldNormals(geometry)
  return geometry
}

/** Average the normals of vertices that share a position, so UV seams on a tube shade as one smooth surface. */
function weldNormals(geometry: THREE.BufferGeometry): void {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const key = (i: number) => `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`
  const sums = new Map<string, THREE.Vector3>()
  for (let i = 0; i < position.count; i++) {
    const k = key(i)
    let sum = sums.get(k)
    if (!sum) sums.set(k, (sum = new THREE.Vector3()))
    sum.x += normal.getX(i)
    sum.y += normal.getY(i)
    sum.z += normal.getZ(i)
  }
  for (let i = 0; i < position.count; i++) {
    const sum = sums.get(key(i))!
    const l = sum.length() || 1
    normal.setXYZ(i, sum.x / l, sum.y / l, sum.z / l)
  }
}

export type Placement = { at?: [number, number, number]; rotate?: [number, number, number]; scale?: number | [number, number, number] }

const scratch = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }

export function place(geometry: THREE.BufferGeometry, { at = [0, 0, 0], rotate = [0, 0, 0], scale = 1 }: Placement): THREE.BufferGeometry {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale
  scratch.m.compose(scratch.p.set(...at), scratch.q.setFromEuler(scratch.e.set(...rotate)), scratch.s.set(s[0], s[1], s[2]))
  geometry.applyMatrix4(scratch.m)
  return geometry
}

export type Paint = {
  /** A fixed colour (sRGB hex), or null to take the instance's plasticine hue. */
  color: string | null
  /** Darken vertices below this local height (a crease into whatever it is pressed onto). */
  creaseBelow?: number
  creaseDepth?: number
  crease?: number
  /** Darken vertices whose normal faces down (the underside, near the ground). */
  underside?: number
  /** Darken soft kneaded patches: the clay cue that stays when the thumbprint normal map is off (tier 0). */
  mottle?: number
  /** Scale UVs so the thumbprint texture keeps its size on large props. */
  uvScale?: number
}

const MOTTLE_FREQUENCY = 0.45

/** Colour a piece: vertex colour is the paint (or white, to be tinted) times baked occlusion; `tint` marks hue-coloured vertices. */
export function paint(geometry: THREE.BufferGeometry, options: Paint): THREE.BufferGeometry {
  const base = new THREE.Color(options.color ?? '#ffffff')
  const position = geometry.attributes.position
  if (!geometry.attributes.normal) geometry.computeVertexNormals()
  const normal = geometry.attributes.normal
  const colors = new Float32Array(position.count * 3)
  const tint = new Float32Array(position.count).fill(options.color === null ? 1 : 0)
  const depth = options.creaseDepth ?? 1.2
  for (let i = 0; i < position.count; i++) {
    let shade = 1
    if (options.creaseBelow !== undefined) {
      const k = THREE.MathUtils.smoothstep(position.getY(i), options.creaseBelow - depth, options.creaseBelow)
      shade *= 1 - (options.crease ?? 0.35) * (1 - k)
    }
    if (options.underside) shade *= 1 - options.underside * Math.max(0, -normal.getY(i)) ** 1.5
    if (options.mottle) {
      const n = noise(position.getX(i) * MOTTLE_FREQUENCY, position.getY(i) * MOTTLE_FREQUENCY, position.getZ(i) * MOTTLE_FREQUENCY, 7)
      shade *= 1 - options.mottle * THREE.MathUtils.smoothstep(n, 0.4, 0.8)
    }
    colors[i * 3] = base.r * shade
    colors[i * 3 + 1] = base.g * shade
    colors[i * 3 + 2] = base.b * shade
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 1))
  if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2))
  if (options.uvScale) {
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * options.uvScale, uv.getY(i) * options.uvScale)
  }
  return geometry
}

const KEEP = ['position', 'normal', 'uv', 'color', 'tint']

/** Merge painted pieces into one geometry (one draw call). */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part
    for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name)
    return g
  })
  const merged = mergeGeometries(normalized, false)
  if (!merged) throw new Error('clay: could not merge pieces')
  for (const part of parts) part.dispose()
  return merged
}

/** A primitive, lumped, placed, and painted. */
export function piece(geometry: THREE.BufferGeometry, paintWith: Paint, placement: Placement = {}, lumpAmount = 0, seed = 1, frequency = 0.5): THREE.BufferGeometry {
  if (lumpAmount) lump(geometry, lumpAmount, frequency, seed)
  place(geometry, placement)
  geometry.computeVertexNormals()
  return paint(geometry, paintWith)
}

/** A tube along `curve` whose radius runs from `r0` to `r1`, capped with a ball at the tip. */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, segments: number, radial: number, r0: number, r1: number): THREE.BufferGeometry {
  const tube = new THREE.TubeGeometry(curve, segments, 1, radial, false)
  const position = tube.attributes.position
  const center = new THREE.Vector3()
  const offset = new THREE.Vector3()
  for (let s = 0; s <= segments; s++) {
    const t = s / segments
    curve.getPointAt(t, center)
    const r = r0 + (r1 - r0) * t ** 0.9
    for (let j = 0; j <= radial; j++) {
      const i = s * (radial + 1) + j
      offset.set(position.getX(i), position.getY(i), position.getZ(i)).sub(center).multiplyScalar(r)
      position.setXYZ(i, center.x + offset.x, center.y + offset.y, center.z + offset.z)
    }
  }
  tube.computeVertexNormals()
  const tip = new THREE.SphereGeometry(r1 * 1.05, radial, Math.max(4, radial / 2))
  const end = curve.getPointAt(1)
  tip.translate(end.x, end.y, end.z)
  const base = new THREE.SphereGeometry(r0, radial, Math.max(4, radial / 2))
  const start = curve.getPointAt(0)
  base.translate(start.x, start.y, start.z)
  // kept indexed: normals computed on a triangle soup come out flat, and the clay would look faceted
  const merged = mergeGeometries([tube, tip, base], false)
  tube.dispose()
  tip.dispose()
  base.dispose()
  if (!merged) throw new Error('clay: could not build tube')
  merged.userData.weld = true
  merged.computeVertexNormals()
  weldNormals(merged)
  return merged
}

/** A flared skirt of clay where a part is smoothed onto the body: wide and thin at the bottom, meeting the part at `top`. */
export function collar(radius: number, top: number, flare = 1.7, segments = 20): THREE.BufferGeometry {
  const points: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const r = radius * (flare - (flare - 1) * Math.sin((t * Math.PI) / 2))
    points.push(new THREE.Vector2(r, -0.45 + (top + 0.45) * t * t))
  }
  return new THREE.LatheGeometry(points, segments)
}

// --- the shared clay surface ---------------------------------------------------------

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x9e3779b9) >>> 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t ^= t >>> 15
    t = Math.imul(t, 0x735a2d97)
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296
  }
}

/** Thumbprint whorls, fingernail crescents, loop-tool drags, and soft pressing: drawn in grey, turned into a tangent-space normal map. */
function toolMarkNormalMap(): THREE.Texture {
  const size = 512
  const height = document.createElement('canvas')
  height.width = size
  height.height = size
  const g = height.getContext('2d')!
  const random = seeded(23)
  g.fillStyle = '#808080'
  g.fillRect(0, 0, size, size)
  // wrap-around drawing so the tile repeats without seams
  const wrapped = (draw: (ox: number, oy: number) => void) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) draw(ox, oy)
  }
  for (let i = 0; i < 90; i++) {
    const x = random() * size
    const y = random() * size
    const r = 14 + random() * 46
    const up = random() > 0.5
    wrapped((ox, oy) => {
      const grad = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
      grad.addColorStop(0, up ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)')
      grad.addColorStop(1, 'rgba(128,128,128,0)')
      g.fillStyle = grad
      g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
    })
  }
  for (let i = 0; i < 5; i++) {
    const cx = random() * size
    const cy = random() * size
    const r = 26 + random() * 22
    const tilt = random() * Math.PI
    wrapped((ox, oy) => {
      for (let ring = 2; ring < 14; ring++) {
        g.strokeStyle = ring % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)'
        g.lineWidth = 1.8
        g.beginPath()
        const k = ring / 14
        g.ellipse(cx + ox, cy + oy, r * k, r * k * 0.66, tilt, 0.6 + k * 0.4, Math.PI * 1.7 + k)
        g.stroke()
      }
    })
  }
  for (let i = 0; i < 22; i++) {
    const x = random() * size
    const y = random() * size
    const a = random() * Math.PI * 2
    const r = 5 + random() * 6
    wrapped((ox, oy) => {
      g.strokeStyle = 'rgba(0,0,0,0.22)'
      g.lineWidth = 1.6
      g.beginPath()
      g.arc(x + ox, y + oy, r, a, a + 2.1)
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.14)'
      g.beginPath()
      g.arc(x + ox, y + oy, r + 1.6, a + 0.1, a + 2)
      g.stroke()
    })
  }
  for (let i = 0; i < 9; i++) {
    const x = random() * size
    const y = random() * size
    const a = random() * Math.PI
    const length = 60 + random() * 110
    const bend = (random() - 0.5) * 40
    wrapped((ox, oy) => {
      for (const [offset, shade] of [
        [-2.5, 'rgba(255,255,255,0.12)'],
        [0, 'rgba(0,0,0,0.2)'],
        [2.5, 'rgba(255,255,255,0.12)'],
      ] as const) {
        const nx = -Math.sin(a) * offset
        const ny = Math.cos(a) * offset
        g.strokeStyle = shade
        g.lineWidth = 1.4
        g.beginPath()
        g.moveTo(x + ox + nx, y + oy + ny)
        g.quadraticCurveTo(x + ox + nx + Math.cos(a) * length * 0.5 - Math.sin(a) * bend, y + oy + ny + Math.sin(a) * length * 0.5 + Math.cos(a) * bend, x + ox + nx + Math.cos(a) * length, y + oy + ny + Math.sin(a) * length)
        g.stroke()
      }
    })
  }
  const source = g.getImageData(0, 0, size, size).data
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const og = out.getContext('2d')!
  const image = og.createImageData(size, size)
  const at = (x: number, y: number) => source[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255
  const strength = 3.4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y) + 0.5 * (at(x + 1, y - 1) - at(x - 1, y - 1) + at(x + 1, y + 1) - at(x - 1, y + 1))) * strength * 0.5
      const dy = (at(x, y + 1) - at(x, y - 1) + 0.5 * (at(x - 1, y + 1) - at(x - 1, y - 1) + at(x + 1, y + 1) - at(x + 1, y - 1))) * strength * 0.5
      const l = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      image.data[i] = ((-dx / l) * 0.5 + 0.5) * 255
      image.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255
      image.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
      image.data[i + 3] = 255
    }
  }
  og.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(out)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.anisotropy = 2
  return texture
}

// --- materials -----------------------------------------------------------------------

export type ClayMaterials = {
  /** The static bench and props: painted vertex colours. */
  props: THREE.MeshStandardMaterial
  /** Instanced critters and parts: tinted by hue, boiling while they move. */
  critters: THREE.MeshStandardMaterial
  /** The see-through part the ghost hand carries. */
  ghost: THREE.MeshStandardMaterial
  shadow: THREE.ShaderMaterial
  glow: THREE.ShaderMaterial
  overlay: THREE.ShaderMaterial
  /** The stop-motion clock, stepped at twelve frames a second. */
  boilStep: { value: number }
  setNormalMaps(on: boolean): void
  dispose(): void
}

export const BOIL_FPS = 12
const BOIL_AMPLITUDE = 0.075

function clayShader(material: THREE.MeshStandardMaterial, boilStep: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBoilStep = boilStep
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float tint;
        #ifdef USE_INSTANCING
          attribute vec2 boil;
        #endif
        uniform float uBoilStep;`,
      )
      .replace(
        '#include <color_vertex>',
        `#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vColor = vec4( 1.0 );
        #endif
        #ifdef USE_COLOR
          vColor.rgb *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= mix( vec3( 1.0 ), instanceColor, tint );
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          if ( boil.x > 0.001 ) {
            vec3 q = position * 0.62 + vec3( boil.y * 37.0 + uBoilStep * 5.3 );
            vec3 wobble = vec3(
              sin( q.y * 2.3 + q.z * 1.1 + uBoilStep * 1.7 ),
              sin( q.z * 1.9 + q.x * 1.3 + uBoilStep * 2.9 ),
              sin( q.x * 2.1 + q.y * 1.7 + uBoilStep * 2.3 ) );
            transformed += wobble * boil.x * ${BOIL_AMPLITUDE.toFixed(3)};
          }
        #endif`,
      )
  }
  material.customProgramCacheKey = () => 'critter-clay'
}

/** Soft blobs and thumbprint dents lying flat on the bench; the instance colour carries (strength, shape, spare). */
function shadowMaterial(): THREE.ShaderMaterial {
  const color = new THREE.Color(PALETTE.shadow)
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vParams;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vParams = instanceColor;
        #else
          vParams = vec3( 1.0, 0.0, 0.0 );
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vParams;
      void main() {
        float d = length( vUv - 0.5 ) * 2.0;
        if ( d > 1.0 ) discard;
        float a;
        vec3 color = uColor;
        if ( vParams.y < 0.5 ) {
          // a plateau, not a peak: from the camera the body hides the middle, so the outer half has to carry the weight
          a = ( 1.0 - smoothstep( 0.45, 1.0, d ) ) * 0.5 + ( 1.0 - smoothstep( 0.0, 0.5, d ) ) * 0.25;
        } else {
          float ridges = 0.5 + 0.5 * sin( d * 34.0 + vUv.x * 3.0 );
          a = ( 0.28 * ( 1.0 - d ) + 0.22 * ridges * ( 1.0 - d * d ) ) * smoothstep( 1.0, 0.7, d );
        }
        gl_FragColor = vec4( color, a * vParams.x );
      }`,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    toneMapped: false,
  })
}

/** Camera-facing glows (what can be touched), snore bubbles, and clay crumbs; params are (strength, shape, spare). */
function glowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uCore: { value: new THREE.Color(PALETTE.glow) }, uEdge: { value: new THREE.Color(PALETTE.glowEdge) } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vParams;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vParams = instanceColor;
        #else
          vParams = vec3( 1.0, 0.0, 0.0 );
        #endif
        vec4 center = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
        float size = length( instanceMatrix[0].xyz );
        center.xy += position.xy * size;
        gl_Position = projectionMatrix * center;
      }`,
    fragmentShader: `
      uniform vec3 uCore;
      uniform vec3 uEdge;
      varying vec2 vUv;
      varying vec3 vParams;
      void main() {
        vec2 p = vUv - 0.5;
        float d = length( p ) * 2.0;
        if ( d > 1.0 ) discard;
        vec3 color;
        float a;
        if ( vParams.y < 0.5 ) {
          float ring = exp( -pow( ( d - 0.62 ) * 7.0, 2.0 ) );
          float halo = pow( 1.0 - d, 2.0 ) * 0.55;
          color = mix( uEdge, uCore, ring );
          a = ring * 0.95 + halo;
        } else if ( vParams.y < 1.5 ) {
          float rim = smoothstep( 0.72, 0.98, d ) * ( 1.0 - smoothstep( 0.98, 1.0, d ) );
          float shine = exp( -pow( length( p - vec2( -0.16, 0.18 ) ) * 9.0, 2.0 ) );
          color = mix( vec3( 0.78, 0.88, 1.0 ), vec3( 1.0 ), shine );
          a = 0.12 + rim * 0.6 + shine * 0.9;
        } else {
          color = uCore;
          a = 1.0 - smoothstep( 0.6, 1.0, d );
        }
        gl_FragColor = vec4( color, a * vParams.x );
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}

/** One full-screen triangle, no render target: a cool vignette and stop-motion film grain that changes twelve times a second. */
function overlayMaterial(boilStep: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uStep: boilStep, uAspect: { value: 1.44 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4( position.xy, 0.0, 1.0 );
      }`,
    fragmentShader: `
      uniform float uStep;
      uniform float uAspect;
      varying vec2 vUv;
      float grain( vec2 p ) {
        return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) + uStep * 0.618 ) * 43758.5453 );
      }
      void main() {
        vec2 c = ( vUv - 0.5 ) * vec2( uAspect, 1.0 );
        float vignette = smoothstep( 0.45, 1.05, length( c ) );
        float g = grain( floor( gl_FragCoord.xy / 2.0 ) ) - 0.5;
        vec3 color = g > 0.0 ? vec3( 1.0 ) : vec3( 0.05, 0.07, 0.13 );
        float a = abs( g ) * 0.032;
        color = mix( color, vec3( 0.07, 0.1, 0.18 ), vignette );
        a = max( a, vignette * 0.34 );
        gl_FragColor = vec4( color, a );
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  })
}

export function createClayMaterials(): ClayMaterials {
  const boilStep = { value: 0 }
  const normalMap = toolMarkNormalMap()
  const propMap = normalMap.clone()
  normalMap.repeat.set(2, 2)
  propMap.repeat.set(1, 1)
  propMap.needsUpdate = true
  const props = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0, normalMap: propMap, normalScale: new THREE.Vector2(0.9, 0.9) })
  clayShader(props, boilStep)
  const critters = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.56, metalness: 0, normalMap, normalScale: new THREE.Vector2(1.6, 1.6) })
  clayShader(critters, boilStep)
  // drawn through the body: the demonstration part settles into sockets the body hides (a leg under the belly)
  const ghost = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#9cc7ff'), emissiveIntensity: 0.14, transparent: true, opacity: 0.8, depthWrite: false, depthTest: false, roughness: 0.5 })
  const shadow = shadowMaterial()
  const glow = glowMaterial()
  const overlay = overlayMaterial(boilStep)
  return {
    props,
    critters,
    ghost,
    shadow,
    glow,
    overlay,
    boilStep,
    setNormalMaps(on) {
      const next = on ? normalMap : null
      if (critters.normalMap === next) return
      critters.normalMap = next
      props.normalMap = on ? propMap : null
      critters.needsUpdate = true
      props.needsUpdate = true
    },
    dispose() {
      for (const material of [props, critters, ghost, shadow, glow, overlay]) material.dispose()
      normalMap.dispose()
      propMap.dispose()
    },
  }
}
