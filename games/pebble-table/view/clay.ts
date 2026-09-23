import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { furMaterial, quillMaterial, tuftTexture } from './fur'

// Pebble Table's claymation look (games/pebble-table/ART.md): everything is plasticine.
// One shared clay material with vertex colours and a tiling thumbprint
// normal map covers nearly every object, so a whole character or prop is one
// merged mesh and one draw call. Lumps are pushed into the geometry, contact
// occlusion is baked into the vertex colours, and shadows are soft blobs.
// Every texture here is drawn procedurally at runtime; nothing is fetched.

export const PALETTE = {
  backdrop: '#ecd2aa',
  floor: '#e2c49a',
  table: '#6e9a9b',
  tableEdge: '#5e8788',
  stone: '#c9683d',
  bag: '#dcaa3c',
  cord: '#efe1c3',
  scaleWood: '#9a5a38',
  pan: '#d8a54c',
  rug: '#e8d7b6',
  plate: '#3f9a8e',
  bowl: '#f0dec2',
  stool: '#d9b25b',
  shelf: '#c46e45',
  tile: '#f0e2c8',
  knifeBlade: '#dcd6ca',
  knifeHandle: '#b5623a',
  eye: '#1f1712',
  shine: '#ffffff',
  cheek: '#ef9f96',
  nose: '#3a2419',
  mouth: '#6e2e25',
  rabbit: '#e6d3b2',
  rabbitInner: '#eeaaa2',
  bear: '#a0613d',
  bearMuzzle: '#e8cfa6',
  hedgehog: '#efd8b0',
  spikes: '#6b4a33',
  glow: '#fff4d6',
} as const

// --- noise -----------------------------------------------------------------

function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}

function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

// --- geometry helpers --------------------------------------------------------

/** Push vertices in and out along their normals: hand-pressed, never perfect. */
export function lump(geometry: THREE.BufferGeometry, amount: number, frequency = 2.2, seed = 0): THREE.BufferGeometry {
  const g = geometry.clone()
  g.computeVertexNormals()
  const position = g.attributes.position
  const normal = g.attributes.normal
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const n = noise3(x * frequency + seed, y * frequency + seed * 1.7, z * frequency - seed) - 0.5
    position.setXYZ(i, x + normal.getX(i) * n * amount, y + normal.getY(i) * n * amount, z + normal.getZ(i) * n * amount)
  }
  g.computeVertexNormals()
  return g
}

export type Placement = { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number] }

export function place(geometry: THREE.BufferGeometry, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Placement): THREE.BufferGeometry {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(s[0], s[1], s[2]),
  )
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  g.applyMatrix4(matrix)
  return g
}

/**
 * Colour a placed piece. `ground` is the height of the surface it sits on in
 * the same space; vertices near it are darkened, which reads as contact
 * occlusion without an AO pass.
 */
export function paint(geometry: THREE.BufferGeometry, color: string, ground: number | null = 0, occlusion = 0.32): THREE.BufferGeometry {
  const base = new THREE.Color(color)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    let shade = 1
    if (ground !== null) {
      const height = position.getY(i) - ground
      shade = 1 - occlusion * (1 - THREE.MathUtils.smoothstep(height, 0, 2.2))
    }
    colors[i * 3] = base.r * shade
    colors[i * 3 + 1] = base.g * shade
    colors[i * 3 + 2] = base.b * shade
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(position.count * 2), 2))
  return geometry
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name)
    return g
  })
  const merged = mergeGeometries(normalized, false)
  if (!merged) throw new Error('clay: could not merge parts')
  return merged
}

/** A primitive, lumped, placed, and painted in one go. */
export function piece(
  geometry: THREE.BufferGeometry,
  color: string,
  placement: Placement,
  options: { lump?: number; frequency?: number; seed?: number; ground?: number | null; occlusion?: number } = {},
): THREE.BufferGeometry {
  const lumped = options.lump ? lump(geometry, options.lump, options.frequency, options.seed) : geometry
  return paint(place(lumped, placement), color, options.ground === undefined ? 0 : options.ground, options.occlusion)
}

// --- textures ----------------------------------------------------------------

function canvas(size: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const element = document.createElement('canvas')
  element.width = size
  element.height = size
  draw(element.getContext('2d')!)
  return element
}

/** Turn a grey height canvas into a tangent-space normal map. */
function heightToNormal(height: HTMLCanvasElement, strength: number): THREE.Texture {
  const size = height.width
  const source = height.getContext('2d')!.getImageData(0, 0, size, size).data
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const g = out.getContext('2d')!
  const image = g.createImageData(size, size)
  const at = (x: number, y: number) => source[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const length = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      image.data[i] = ((-dx / length) * 0.5 + 0.5) * 255
      image.data[i + 1] = ((-dy / length) * 0.5 + 0.5) * 255
      image.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255
      image.data[i + 3] = 255
    }
  }
  g.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(out)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  return texture
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

/** Thumbprints, tool drags, and soft lumps: the shared clay surface. */
function thumbprintNormal(): THREE.Texture {
  const size = 512
  const random = seeded(9)
  const height = canvas(size, (g) => {
    g.fillStyle = '#808080'
    g.fillRect(0, 0, size, size)
    for (let blob = 0; blob < 60; blob++) {
      const x = random() * size
      const y = random() * size
      const r = 20 + random() * 60
      const gradient = g.createRadialGradient(x, y, 0, x, y, r)
      const light = random() > 0.5
      gradient.addColorStop(0, light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)')
      gradient.addColorStop(1, 'rgba(128,128,128,0)')
      g.fillStyle = gradient
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    for (let print = 0; print < 7; print++) {
      const cx = random() * size
      const cy = random() * size
      const rx = 34 + random() * 30
      const tilt = random() * Math.PI
      for (let ring = 3; ring < 20; ring++) {
        g.strokeStyle = ring % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'
        g.lineWidth = 2.4
        g.beginPath()
        g.ellipse(cx, cy, (ring / 20) * rx, (ring / 20) * rx * 0.72, tilt, 0.3, Math.PI * 2 - 0.5)
        g.stroke()
      }
    }
    for (let drag = 0; drag < 14; drag++) {
      const x = random() * size
      const y = random() * size
      const a = random() * Math.PI
      g.strokeStyle = 'rgba(0,0,0,0.12)'
      g.lineWidth = 1.5 + random() * 2
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30 + 10, x + Math.cos(a) * 60, y + Math.sin(a) * 60)
      g.stroke()
    }
  })
  return heightToNormal(height, 3.2)
}

/** A coiled rope rug, centred in the texture. */
function ropeTextures(): { map: THREE.Texture; normal: THREE.Texture } {
  const size = 512
  const draw = (color: boolean) =>
    canvas(size, (g) => {
      g.fillStyle = color ? PALETTE.rug : '#808080'
      g.fillRect(0, 0, size, size)
      for (let r = 6; r < size * 0.72; r += 9) {
        g.lineWidth = 7
        g.strokeStyle = color ? 'rgba(160,130,90,0.16)' : 'rgba(255,255,255,0.5)'
        g.beginPath()
        g.arc(size / 2, size / 2, r, 0, Math.PI * 2)
        g.stroke()
        g.lineWidth = 2
        g.strokeStyle = color ? 'rgba(120,95,60,0.28)' : 'rgba(0,0,0,0.6)'
        g.beginPath()
        g.arc(size / 2, size / 2, r + 4.5, 0, Math.PI * 2)
        g.stroke()
      }
    })
  const map = new THREE.CanvasTexture(draw(true))
  map.colorSpace = THREE.SRGBColorSpace
  const normal = heightToNormal(draw(false), 2)
  for (const texture of [map, normal]) {
    texture.repeat.set(0.5, 0.5)
    texture.offset.set(0.5, 0.5)
  }
  return { map, normal }
}

function blobTexture(): THREE.Texture {
  const element = canvas(128, (g) => {
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gradient
    g.fillRect(0, 0, 128, 128)
  })
  return new THREE.CanvasTexture(element)
}

// --- materials ---------------------------------------------------------------

export type ClayMaterials = {
  clay: THREE.MeshStandardMaterial
  /** The same clay with per-instance colour, for the instanced stones. */
  stones: THREE.MeshStandardMaterial
  rug: THREE.MeshStandardMaterial
  shadow: THREE.MeshBasicMaterial
  glow: THREE.MeshBasicMaterial
  /** Instanced clay-tuft shells over furry guests. */
  fur: THREE.MeshStandardMaterial
  /** Instanced hedgehog quills that sway. */
  quill: THREE.MeshStandardMaterial
  dispose(): void
}

/** Instanced soft overlays: the instance colour's red channel is the opacity. */
function overlayMaterial(color: string, blending: THREE.Blending): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color, map: blobTexture(), transparent: true, depthWrite: false, blending, toneMapped: false })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#ifdef USE_INSTANCING_COLOR
        diffuseColor.a *= vColor.r;
      #endif`,
    )
  }
  return material
}

export function createClayMaterials(): ClayMaterials {
  const normalMap = thumbprintNormal()
  normalMap.repeat.set(3.5, 3.5)
  const clayLike = (extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, normalMap, normalScale: new THREE.Vector2(1.3, 1.3), side: THREE.DoubleSide, ...extra })
  const clay = clayLike()
  const stones = new THREE.MeshStandardMaterial({ color: PALETTE.stone, vertexColors: true, roughness: 0.42, normalMap, normalScale: new THREE.Vector2(1.2, 1.2) })
  const rope = ropeTextures()
  const rug = new THREE.MeshStandardMaterial({ map: rope.map, normalMap: rope.normal, roughness: 0.95 })
  const tufts = tuftTexture()
  const fur = furMaterial(clay, tufts, 0.55)
  const quill = quillMaterial(clay)
  const shadow = overlayMaterial('#4a2a18', THREE.NormalBlending)
  const glow = overlayMaterial(PALETTE.glow, THREE.NormalBlending)
  return {
    clay,
    stones,
    rug,
    shadow,
    glow,
    fur,
    quill,
    dispose() {
      for (const material of [clay, stones, rug, shadow, glow, fur, quill]) material.dispose()
      tufts.dispose()
      normalMap.dispose()
      rope.map.dispose()
      rope.normal.dispose()
    },
  }
}
