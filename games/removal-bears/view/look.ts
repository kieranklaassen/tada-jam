import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The look: sugar cubes and biscuit (ART.md, "The look"). Surfaces are painted
// on canvases from a fixed stream and colours sit in the vertices, so a figure
// of many parts is one mesh. Nothing here is made when the module loads.

export const COLOURS = {
  sugar: '#fffaf0', crust: '#b8763a', biscuit: '#dda55c', biscuitPale: '#efc98b', dark: '#4a2a1c', cream: '#fff3dc', jam: '#c8283c', jamDark: '#8f1830',
  mint: '#9fd8c0', vanilla: '#f7df9c', pink: '#f4b6c2', sky: '#a9cfe6', wafer: '#c98a4b', waferDark: '#8d5528', loftFloor: '#c08a52', tile: '#cfe0df', tileDark: '#b2cbca', bun: '#a9662d', duck: '#ffd23f', beak: '#f08a24', black: '#2b1a14', milk: '#f6fbff',
} as const

function stream(seed: number): () => number {
  let a = seed
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 2 ** 32 }
}

function canvas(size: number, paint: (g: CanvasRenderingContext2D, roll: () => number) => void, seed = 7, high = size): THREE.Texture {
  // The scene can be built where there is nothing to paint on, to be counted.
  if (typeof document === 'undefined') return new THREE.Texture()
  const el = document.createElement('canvas')
  el.width = size; el.height = high
  const g = el.getContext('2d')!
  paint(g, stream(seed))
  const texture = new THREE.CanvasTexture(el)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Grains: a pressed surface of small lit and shaded specks over white, so the vertex colour shows through. */
const grain = (base: string, specks: number, size: [number, number], light: number, dark: number, seed: number): THREE.Texture => canvas(256, (g, roll) => {
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < specks; i++) {
    const s = size[0] + roll() * (size[1] - size[0]), up = roll() < 0.5
    g.fillStyle = up ? `rgba(255,255,255,${light * roll()})` : `rgba(90,50,20,${dark * roll()})`
    g.fillRect(roll() * 256, roll() * 256, s, s)
  }
}, seed)

const wafer = (): THREE.Texture => canvas(256, (g, roll) => {
  g.fillStyle = '#e6e0d8'
  g.fillRect(0, 0, 256, 256)
  const n = 4, c = 256 / n
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
    const grad = g.createLinearGradient(x * c, y * c, (x + 1) * c, (y + 1) * c)
    grad.addColorStop(0, '#b9aa98'); grad.addColorStop(0.5, '#d8cdc0'); grad.addColorStop(1, '#f4eee6')
    g.fillStyle = grad
    g.fillRect(x * c + 8, y * c + 8, c - 16, c - 16)
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3
    g.strokeRect(x * c + 4, y * c + 4, c - 8, c - 8)
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(80,40,10,${0.12 * roll()})`; g.fillRect(roll() * 256, roll() * 256, 2, 2) }
}, 3)

const blob = (): THREE.Texture => canvas(128, (g) => {
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.6, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
})

const hand = (): THREE.Texture => canvas(128, (g) => {
  g.lineJoin = 'round'
  g.fillStyle = '#fffdf6'; g.strokeStyle = 'rgba(74,42,28,.8)'; g.lineWidth = 6
  g.beginPath()
  g.moveTo(52, 10); g.quadraticCurveTo(66, 4, 68, 20); g.lineTo(70, 56); g.quadraticCurveTo(84, 48, 88, 60); g.quadraticCurveTo(102, 56, 104, 70); g.quadraticCurveTo(114, 70, 112, 88)
  g.quadraticCurveTo(108, 122, 76, 122); g.quadraticCurveTo(50, 122, 40, 100); g.lineTo(22, 78); g.quadraticCurveTo(22, 64, 38, 70); g.lineTo(48, 78); g.closePath()
  g.fill(); g.stroke()
})

const gingham = (): THREE.Texture => canvas(128, (g, roll) => {
  g.fillStyle = '#fff6ea'; g.fillRect(0, 0, 128, 128)
  g.fillStyle = 'rgba(200,60,70,.34)'; g.fillRect(0, 0, 64, 128); g.fillRect(0, 0, 128, 64)
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${0.12 * roll()})`; g.fillRect(roll() * 128, roll() * 128, 1, 5) }
}, 5)

/** The kitchen behind, 40 units by 14 and 51 dots to the unit: pale tiles, and on each side of the house shelves of jars. */
const kitchen = (): THREE.Texture => canvas(2048, (g, roll) => {
  const t = 51.2
  for (let x = 0; x < 40; x++) for (let y = 0; y < 14; y++) {
    g.fillStyle = `hsl(172,${24 + roll() * 6}%,${80 + roll() * 5}%)`
    g.fillRect(x * t, y * t, t, t)
    g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 3
    g.strokeRect(x * t, y * t, t, t)
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x * t + 5, y * t + 5, t * 0.5, 5)
  }
  const jar = (x: number, y: number, w: number, h: number, fill: string, lid: string): void => {
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.roundRect(x, y - h, w, h, 10); g.fill()
    g.fillStyle = fill; g.beginPath(); g.roundRect(x + 5, y - h * 0.74, w - 10, h * 0.7, 8); g.fill()
    g.fillStyle = lid; g.beginPath(); g.roundRect(x + 2, y - h - 12, w - 4, 17, 5); g.fill()
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 9, y - h * 0.82, 5, h * 0.6)
  }
  const fills = ['#c8283c', '#f2b33d', '#8f5a9c', '#e88aa0', '#7fb56a', '#d9772f']
  for (const side of [0, 1]) for (const [n, y] of [190, 350, 510].entries()) {
    const x0 = side ? 1024 + 6.2 * t : 1024 - 19 * t, x1 = x0 + 12.8 * t
    g.fillStyle = '#c08a55'; g.fillRect(x0, y, x1 - x0, 16)
    g.fillStyle = 'rgba(80,50,30,.22)'; g.fillRect(x0, y + 16, x1 - x0, 8)
    for (let x = x0 + 12 + n * 9; x < x1 - 60;) { const w = 40 + roll() * 22, h = 56 + roll() * 46; jar(x, y, w, h, fills[Math.floor(roll() * 6)], ['#fff', '#e7c27d', '#9fd8c0'][Math.floor(roll() * 3)]); x += w + 10 }
  }
}, 11, 716)

export type Look = ReturnType<typeof makeLook>

export function makeLook() {
  const textures = { sugar: grain('#f3eee6', 5200, [1, 3], 1, 0.16, 1), crumb: grain('#efe6da', 3600, [1, 4], 0.4, 0.34, 2), wafer: wafer(), blob: blob(), hand: hand(), gingham: gingham(), kitchen: kitchen() }
  textures.gingham.wrapS = textures.gingham.wrapT = THREE.RepeatWrapping
  const solid = (map: THREE.Texture | null, roughness: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness, metalness: 0 })
  return {
    textures,
    sugar: solid(textures.sugar, 0.62), crumb: solid(textures.crumb, 0.86), wafer: solid(textures.wafer, 0.8), icing: solid(null, 0.42), jelly: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.14 }),
    milk: new THREE.MeshStandardMaterial({ color: COLOURS.milk, roughness: 0.2 }), lit: new THREE.MeshBasicMaterial({ vertexColors: true }),
    flat: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    dispose(): void { for (const t of Object.values(textures)) t.dispose() },
  }
}

// --- geometry ----------------------------------------------------------------

/** One colour all over, ready to be merged with others. */
export function paint(geometry: THREE.BufferGeometry, colour: string): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry, c = new THREE.Color(colour), n = g.attributes.position.count, data = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) data.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(data, 3))
  return g
}

export function join(parts: THREE.BufferGeometry[], name: string): THREE.BufferGeometry {
  const g = mergeGeometries(parts)!
  g.name = name
  return g
}

export const box = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0, segments = 2): THREE.BufferGeometry => new RoundedBoxGeometry(w, h, d, segments, r).translate(x, y, z)
export const ball = (r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 12): THREE.BufferGeometry => new THREE.SphereGeometry(r, detail, Math.max(6, detail - 4)).scale(sx, sy, sz).translate(x, y, z)
export const rod = (a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, r2 = r): THREE.BufferGeometry => {
  const from = new THREE.Vector3().copy(a), d = new THREE.Vector3().copy(b).sub(from), g = new THREE.CylinderGeometry(r2, r, d.length(), 10)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))
  return g.translate(from.x + d.x / 2, from.y + d.y / 2, from.z + d.z / 2)
}

/** A round biscuit lying flat: a soft rim of small waves, one unit high and one in radius. */
export function biscuit(waves: number, deep: number): THREE.BufferGeometry {
  const profile = [[0, -0.5], [0.8, -0.5], [0.95, -0.42], [1, -0.18], [1, 0.18], [0.95, 0.42], [0.8, 0.5], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y))
  const g = new THREE.LatheGeometry(profile, 40), p = g.attributes.position, colour = new Float32Array(p.count * 3), pale = new THREE.Color(COLOURS.biscuit), crust = new THREE.Color(COLOURS.crust), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), k = 1 + (r > 0.5 ? Math.cos(Math.atan2(z, x) * waves) * deep : 0)
    p.setXYZ(i, x * k, p.getY(i), z * k)
    c.copy(pale).lerp(crust, Math.abs(p.getY(i)) > 0.3 && r > 0.9 ? 0.75 : r > 0.97 ? 0.35 : 0.1)
    colour.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  g.computeVertexNormals()
  return g
}
