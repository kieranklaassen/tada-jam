import * as THREE from 'three'
import { BASKET, FELT, groundY, LOOM, SCARF } from '../layout'
import { ball, capsule, cone, cylinder, lathe, merge, once, part, torus } from './shapes'
import { PALETTE, type YarnMaterials } from './yarn'

// The still set, built once per page. A ribbed knit wall stands in for the
// sky and the snow is a knitted blanket of hills: both are one mesh with a
// fine, faint stitch so they recede. In front, a teal play blanket, the
// wooden loom with a plain felt backboard (the calmest, darkest surface in
// the scene, so the scarf's colours read at a glance), and the basket.

/** Extra rise of the far hills beyond the slope the animals stand on. */
function farRise(x: number, z: number): number {
  const far = THREE.MathUtils.smoothstep(-z, 110, 215)
  return far * (13 + 9 * Math.sin(x * 0.012 + 1.3) + 5 * Math.sin(x * 0.033 + 0.4))
}

export function landHeight(x: number, z: number): number {
  return groundY(x, z) + farRise(x, z)
}

const snow = new THREE.Color(PALETTE.snow)
const snowShade = new THREE.Color(PALETTE.snowShade)
const hillFar = new THREE.Color(PALETTE.hillFar)
const skyGlow = new THREE.Color(PALETTE.skyGlow)
const sky = new THREE.Color(PALETTE.sky)
const skyTop = new THREE.Color(PALETTE.skyTop)

function terrain(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(760, 400, 76, 56)
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0, -105)
  const position = g.attributes.position
  const uv = g.attributes.uv
  const colors = new Float32Array(position.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    position.setY(i, landHeight(x, z))
    uv.setXY(i, x / 3.4, z / 4.6)
    const far = THREE.MathUtils.smoothstep(-z, 40, 230)
    c.copy(snow).lerp(hillFar, far * 0.75)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.computeVertexNormals()
  // Valleys between hills sit a touch cooler: soft, baked, no light needed.
  const normal = g.attributes.normal
  for (let i = 0; i < position.count; i++) {
    const tilt = 1 - normal.getY(i)
    c.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]).lerp(snowShade, Math.min(0.5, tilt * 2.2))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

/** The sky: a tall curved wall of ribbed knit, warm at the horizon, blue above. */
function knitSky(): THREE.BufferGeometry {
  const radius = 560
  const segments = 40
  const rows = 12
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const index: number[] = []
  const c = new THREE.Color()
  for (let j = 0; j <= rows; j++) {
    const y = -40 + (j / rows) * 420
    const t = THREE.MathUtils.clamp((y - 10) / 330, 0, 1)
    if (t < 0.25) c.copy(skyGlow).lerp(sky, t / 0.25)
    else c.copy(sky).lerp(skyTop, (t - 0.25) / 0.75)
    for (let i = 0; i <= segments; i++) {
      const a = THREE.MathUtils.lerp(-1.35, 1.35, i / segments)
      positions.push(Math.sin(a) * radius, y, 150 - Math.cos(a) * radius)
      normals.push(-Math.sin(a), 0, Math.cos(a))
      uvs.push((a * radius) / 10, y / 7)
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i
      const b = a + segments + 1
      index.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(index)
  return g
}

function landGeometry(): THREE.BufferGeometry {
  return once('cosy-land', () => {
    const g = terrain()
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -100), 2000)
    return g
  })
}

function skyGeometry(): THREE.BufferGeometry {
  return once('cosy-sky', () => {
    const g = knitSky()
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -100), 2000)
    return g
  })
}

/** None stands in the loom's window, where the rows land. */
const PINES: [number, number, number][] = [
  [-128, -96, 1.2],
  [-96, -128, 1.5],
  [-160, -150, 1.4],
  [-66, -178, 1.2],
  [-205, -118, 1.6],
  [-56, -230, 1.1],
  [-112, -205, 1.3],
  [98, -104, 1.3],
  [134, -142, 1.6],
  [78, -168, 1.2],
  [168, -118, 1.4],
  [210, -165, 1.5],
  [-178, -70, 1.1],
  [186, -78, 1.2],
]

function pineGeometry(): THREE.BufferGeometry {
  return once('cosy-pine', () => {
    const green = new THREE.Color(PALETTE.pine)
    const cap = new THREE.Color(PALETTE.snow)
    // Each tier is green with a white crocheted rim of snow along its skirt.
    const tier = (height: number) => (p: THREE.Vector3) => (p.y < -height / 2 + height * 0.2 ? cap : green)
    return merge([
      part(cylinder(1.3, 1.6, 6, 1.4, 8), { color: PALETTE.basket, at: [0, 3, 0], ground: 0 }),
      part(cone(9.5, 11, 1.4, 12), { color: tier(11), at: [0, 10, 0] }),
      part(cone(7.6, 10, 1.4, 12), { color: tier(10), at: [0, 16.5, 0] }),
      part(cone(5.4, 9, 1.4, 12), { color: tier(9), at: [0, 22.5, 0] }),
      part(ball(1.6, 1, 8), { color: PALETTE.snow, at: [0, 27.4, 0] }),
    ])
  })
}

function blanketGeometry(): THREE.BufferGeometry {
  return once('cosy-blanket', () => {
    const shape = (x0: number, z0: number, x1: number, z1: number, r: number) => {
      const s = new THREE.Shape()
      s.moveTo(x0 + r, z0)
      s.lineTo(x1 - r, z0)
      s.quadraticCurveTo(x1, z0, x1, z0 + r)
      s.lineTo(x1, z1 - r)
      s.quadraticCurveTo(x1, z1, x1 - r, z1)
      s.lineTo(x0 + r, z1)
      s.quadraticCurveTo(x0, z1, x0, z1 - r)
      s.lineTo(x0, z0 + r)
      s.quadraticCurveTo(x0, z0, x0 + r, z0)
      return s
    }
    // Shapes are drawn in (x, -z) so that laying them flat faces them up.
    const flat = (geometry: THREE.ShapeGeometry, color: string, y: number, scaleU: number, scaleV: number) => {
      geometry.rotateX(-Math.PI / 2)
      geometry.translate(0, y, 0)
      const position = geometry.attributes.position
      const uv = geometry.attributes.uv
      for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / scaleU, position.getZ(i) / scaleV)
      return part(geometry, { color, underside: 0 })
    }
    const outer = shape(-150, -80, 150, 15, 9)
    const inner = shape(-146, -76, 146, 11, 6)
    const border = new THREE.Shape(outer.getPoints(12))
    border.holes.push(new THREE.Path(inner.getPoints(12).reverse()))
    // The base runs under the rib border too: the border is raised, and a gap between them shows the snow.
    return merge([flat(new THREE.ShapeGeometry(outer, 12), PALETTE.blanket, 0.2, 2.6, 1.9), flat(new THREE.ShapeGeometry(border, 12), PALETTE.blanketRib, 0.32, 1.2, 2.4)])
  })
}

function loomGeometry(): THREE.BufferGeometry {
  return once('cosy-loom', () => {
    const height = LOOM.rodY + 1.5
    const parts: THREE.BufferGeometry[] = []
    for (const side of [-1, 1]) {
      const x = LOOM.x + side * LOOM.postX
      parts.push(part(cylinder(1.7, 2, height, 1.1, 12), { color: PALETTE.loom, at: [x, height / 2, LOOM.z], ground: 0 }))
      parts.push(part(ball(2.7, 1, 14), { color: PALETTE.basketRim, at: [x, height + 2.1, LOOM.z] }))
      parts.push(part(torus(1.9, 0.7, 0.9), { color: PALETTE.loomDark, at: [x, height + 0.1, LOOM.z], rot: [Math.PI / 2, 0, 0] }))
      parts.push(part(capsule(1.7, 11, 1), { color: PALETTE.loomDark, at: [x, 1.4, LOOM.z + 0.8], rot: [Math.PI / 2, 0, 0], ground: 0 }))
    }
    parts.push(part(cylinder(1.15, 1.15, LOOM.postX * 2 + 5, 1, 12), { color: PALETTE.needle, at: [LOOM.x, LOOM.rodY, SCARF.z], rot: [0, 0, Math.PI / 2] }))
    parts.push(part(cylinder(1.1, 1.1, LOOM.postX * 2, 1, 10), { color: PALETTE.loom, at: [LOOM.x, 3.6, LOOM.z - 0.4], rot: [0, 0, Math.PI / 2], ground: 0 }))
    return merge(parts).translate(-LOOM.x, 0, -LOOM.z)
  })
}

function backboardGeometry(): THREE.BufferGeometry {
  return once('cosy-backboard', () => {
    const w = LOOM.postX * 2 - 3.2
    const bottom = FELT.bottom
    const top = LOOM.rodY + 0.6
    const r = 3
    const s = new THREE.Shape()
    const x0 = -w / 2
    const x1 = w / 2
    s.moveTo(x0, bottom)
    s.lineTo(x1, bottom)
    s.lineTo(x1, top - r)
    s.quadraticCurveTo(x1, top, x1 - r, top)
    s.lineTo(x0 + r, top)
    s.quadraticCurveTo(x0, top, x0, top - r)
    s.lineTo(x0, bottom)

    // A hanging felt cloth, not a doorway: a shade lighter where it hangs, a
    // quiet running stitch down its sides, two felt loops over the rod, and a
    // roll along its bottom edge. The felt shader unrolls it with the scarf.
    const high = new THREE.Color(PALETTE.backboard)
    const low = new THREE.Color(PALETTE.backboardLow)
    const c = new THREE.Color()
    const parts = [part(new THREE.ShapeGeometry(s, 8), { color: (p) => c.copy(low).lerp(high, THREE.MathUtils.smoothstep(p.y, bottom, top)), at: [0, 0, -0.2], underside: 0 })]
    const inset = 1.3
    const dash = (x: number, y: number, across: boolean) => part(new THREE.BoxGeometry(across ? 1.3 : 0.36, across ? 0.36 : 1.3, 0.2), { color: PALETTE.stitch, at: [x, y, -0.08], underside: 0 })
    const runX = w - 2 * r
    const runY = top - r - (bottom + FELT.roll * 2)
    const dashesX = Math.round(runX / 2.3)
    const dashesY = Math.round(runY / 2.3)
    for (let i = 0; i <= dashesX; i++) parts.push(dash(-runX / 2 + (i * runX) / dashesX, top - inset, true))
    for (let i = 0; i <= dashesY; i++) {
      const y = bottom + FELT.roll * 2 + (i * runY) / dashesY
      parts.push(dash(x0 + inset, y, false), dash(x1 - inset, y, false))
    }
    for (const side of [-1, 1]) parts.push(part(torus(1.9, 0.6, 0.8), { color: PALETTE.backboard, at: [side * (w / 2 - 1.6), LOOM.rodY, SCARF.z - LOOM.z], rot: [0, Math.PI / 2, 0], underside: 0 }))
    parts.push(part(cylinder(FELT.roll, FELT.roll, w + 0.6, 1, 14), { color: PALETTE.backboard, at: [0, bottom, FELT.roll - 0.2], rot: [0, 0, Math.PI / 2], underside: 0.1 }))
    return merge(parts)
  })
}

function basketGeometry(): THREE.BufferGeometry {
  return once('cosy-basket', () => {
    const basket = new THREE.Color(PALETTE.basket)
    const dark = new THREE.Color(PALETTE.basket).multiplyScalar(0.8)
    const woven = (p: THREE.Vector3) => (Math.floor(p.y / 1.7) % 2 === 0 ? basket : dark)
    const { radius, rimY } = BASKET
    const outer = lathe(
      [
        [0.2, 0.25],
        [radius - 3.4, 0.3],
        [radius - 1.6, 1.6],
        [radius - 0.7, 4.6],
        [radius - 0.1, rimY - 0.6],
        [radius, rimY],
        [radius - 1.2, rimY - 0.2],
        [radius - 1.9, rimY - 3],
      ],
      1.2,
      30,
    )
    return merge([
      part(outer, { color: woven, at: [0, 0, 0], ground: 0, occlusion: 0.4 }),
      part(torus(radius - 0.2, 1.35, 1), { color: PALETTE.basketRim, at: [0, rimY + 0.2, 0], rot: [Math.PI / 2, 0, 0] }),
      part(ball(radius - 1.8, 1.4, 20), { color: '#7b4a3a', at: [0, rimY - 2.4, 0], scale: [1, 0.3, 1] }),
      part(torus(3.6, 0.9, 1, Math.PI), { color: PALETTE.basketRim, at: [-radius + 0.2, rimY - 0.6, 0], rot: [0, Math.PI / 2, Math.PI / 2] }),
      part(torus(3.6, 0.9, 1, Math.PI), { color: PALETTE.basketRim, at: [radius - 0.2, rimY - 0.6, 0], rot: [0, -Math.PI / 2, -Math.PI / 2] }),
    ])
  })
}

export type World = {
  group: THREE.Group
  /** The basket (pivot at its base), for its little wobble when tapped. */
  basket: THREE.Mesh
  /** The loom (pivot at the foot of its middle), which rocks when a pattern repeats. */
  loom: THREE.Group
}

export function buildWorld(materials: YarnMaterials): World {
  const group = new THREE.Group()
  const land = new THREE.Mesh(landGeometry(), materials.land)
  land.matrixAutoUpdate = false
  const sky = new THREE.Mesh(skyGeometry(), materials.sky)
  sky.matrixAutoUpdate = false
  sky.renderOrder = -1
  group.add(land, sky)

  const pines = new THREE.InstancedMesh(pineGeometry(), materials.crochetInstanced, PINES.length)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const tint = new THREE.Color()
  PINES.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), x * 0.37)
    m.compose(new THREE.Vector3(x, landHeight(x, z) - 0.5, z), q, new THREE.Vector3(s, s * (0.95 + ((i * 7) % 5) * 0.04), s))
    pines.setMatrixAt(i, m)
    const far = THREE.MathUtils.smoothstep(-z, 80, 230)
    tint.setRGB(1, 1, 1).lerp(new THREE.Color(PALETTE.hillFar), far * 0.55)
    pines.setColorAt(i, tint)
  })
  pines.matrixAutoUpdate = false
  pines.computeBoundingSphere()
  group.add(pines)

  const blanket = new THREE.Mesh(blanketGeometry(), materials.blanket)
  blanket.matrixAutoUpdate = false
  group.add(blanket)

  const loom = new THREE.Group()
  loom.add(new THREE.Mesh(loomGeometry(), materials.crochet))
  loom.add(new THREE.Mesh(backboardGeometry(), materials.felt))
  loom.position.set(LOOM.x, 0, LOOM.z)
  group.add(loom)

  const basket = new THREE.Mesh(basketGeometry(), materials.crochet)
  basket.position.set(BASKET.x, 0, BASKET.z)
  group.add(basket)
  return { group, basket, loom }
}
