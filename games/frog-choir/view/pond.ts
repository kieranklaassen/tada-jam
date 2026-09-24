import * as THREE from 'three'
import { BANK_DEPTH, BANK_Z, PAD_RIM, PAD_TOP, PAD_UNDERSIDE, PADS, POND } from '../layout'
import { flatDisc, RING_REACH } from './overlays'
import { PALETTE } from './palette'
import { mergeParts, part, paintedPart, shapes, type Part } from './parts'
import { padTexture, rippleTexture, skyTexture } from './textures'
import { FIRE_BANDS, outlineMaterial, toonMaterial, type SharedUniforms } from './toon'

// The set: a painted dusk backdrop, a far bank with bushes and stones,
// reed clumps that sway, banded mint water, and twelve lily pads. The
// backdrop is fitted to the camera on resize so the sky always fills the
// top of the screen above the bank, like a diorama.

export const BACKDROP_Z = BANK_Z - 3.2

export type PondSet = {
  group: THREE.Group
  pads: THREE.InstancedMesh
  padOutlines: THREE.InstancedMesh
  padRings: THREE.InstancedMesh
  /** Each pad's resting tint; the view warms it briefly when the pad is struck. */
  padTints: THREE.Color[]
  backdrop: THREE.Mesh
  water: THREE.Mesh
  reeds: THREE.Mesh
  reedOutlines: THREE.Mesh
}

function bank(shared: SharedUniforms, gradient: THREE.Texture): [THREE.Mesh, THREE.Mesh] {
  const parts: Part[] = []
  const top = new THREE.Color(PALETTE.bankLight)
  const side = new THREE.Color(PALETTE.bank)
  const mound = (x: number, z: number, w: number, h: number, d: number) =>
    parts.push(paintedPart(shapes.sphere(1), (p, _, out) => out.copy(side).lerp(top, THREE.MathUtils.smoothstep(p.y, 0.2, 0.6)), { position: [x, 0, z], scale: [w, h, d] }))
  for (let i = -7; i <= 7; i++) mound(i * 2.1 + (i % 2) * 0.4, BANK_Z - 0.25 * (i % 3), 1.7 + (i % 3) * 0.3, 0.55 + ((i + 7) % 4) * 0.08, BANK_DEPTH)
  const bushLight = new THREE.Color(PALETTE.bush)
  const bushDark = new THREE.Color(PALETTE.bushDark)
  const bush = (x: number, z: number, r: number) => {
    for (const [dx, dy, s] of [
      [0, 0.5, 1],
      [-0.7, 0.3, 0.75],
      [0.72, 0.28, 0.7],
    ] as const) {
      parts.push(
        paintedPart(shapes.sphere(1), (p, _, out) => out.copy(bushDark).lerp(bushLight, THREE.MathUtils.smoothstep(p.y, -0.2, 0.6)), {
          position: [x + dx * r, dy * r + 0.25, z - 0.3],
          scale: [s * r, s * r * 0.85, s * r * 0.8],
        }),
      )
    }
  }
  for (const [x, r] of [
    [-10.5, 1.1],
    [-7.2, 0.8],
    [-3.1, 0.95],
    [1.4, 0.7],
    [4.6, 1.05],
    [8.3, 0.85],
    [11.2, 1],
  ] as const) {
    bush(x, BANK_Z - 0.6, r)
  }
  const stone = '#cdbde8'
  for (const [x, z, s] of [
    [-5.9, BANK_Z + 0.75, 0.32],
    [-5.4, BANK_Z + 0.95, 0.2],
    [3.2, BANK_Z + 0.85, 0.26],
    [6.6, BANK_Z + 0.7, 0.36],
    [7.1, BANK_Z + 0.95, 0.18],
  ] as const) {
    parts.push(part(shapes.sphere(0), stone, { position: [x, 0.04, z], scale: [s * 1.3, s * 0.7, s] }))
  }
  const geometry = mergeParts(parts)
  const mesh = new THREE.Mesh(geometry, toonMaterial(shared, gradient))
  const hull = new THREE.Mesh(geometry, outlineMaterial(shared, 0.035))
  mesh.name = 'bank'
  hull.name = 'bank-outline'
  return [mesh, hull]
}

type Clump = { x: number; z: number; count: number; height: number; cattails: number }

function reeds(shared: SharedUniforms, gradient: THREE.Texture): [THREE.Mesh, THREE.Mesh] {
  const parts: Part[] = []
  const clumps: Clump[] = [
    { x: POND.minX - 0.5, z: -0.8, count: 7, height: 2.1, cattails: 2 },
    { x: POND.maxX + 0.6, z: 0.6, count: 6, height: 1.9, cattails: 2 },
    { x: POND.minX + 0.6, z: BANK_Z + 0.8, count: 5, height: 1.6, cattails: 1 },
    { x: POND.maxX - 1.4, z: BANK_Z + 0.9, count: 6, height: 1.8, cattails: 2 },
    { x: -1.6, z: BANK_Z + 0.7, count: 4, height: 1.3, cattails: 1 },
    { x: POND.minX - 1.2, z: 2.9, count: 5, height: 1.6, cattails: 1 },
    { x: POND.maxX + 1.4, z: 3.4, count: 5, height: 1.7, cattails: 1 },
  ]
  let seed = 3
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const bladeLight = new THREE.Color(PALETTE.reed)
  const bladeDark = new THREE.Color(PALETTE.reedDark)
  for (const clump of clumps) {
    for (let i = 0; i < clump.count; i++) {
      const h = clump.height * (0.6 + random() * 0.5)
      const x = clump.x + (random() - 0.5) * 0.9
      const z = clump.z + (random() - 0.5) * 0.7
      const lean = (random() - 0.5) * 0.35
      const blade = paintedPart(shapes.cone(), (p, _, out) => out.copy(bladeDark).lerp(bladeLight, p.y + 0.5), {
        position: [x + lean * h * 0.5, h / 2, z],
        scale: [0.09, h, 0.06],
        rotation: [0, random() * Math.PI, -lean],
      })
      blade.sway = (p) => Math.max(0, p.y / clump.height) ** 1.5
      parts.push(blade)
    }
    for (let i = 0; i < clump.cattails; i++) {
      const h = clump.height * (0.9 + random() * 0.25)
      const x = clump.x + (random() - 0.5) * 0.6
      const z = clump.z + (random() - 0.5) * 0.4
      const stem = part(shapes.cylinder(), PALETTE.reedDark, { position: [x, h / 2, z], scale: [0.025, h, 0.025] })
      stem.sway = (p) => Math.max(0, p.y / clump.height) ** 1.5
      const head = part(shapes.capsule(), PALETTE.cattail, { position: [x, h + 0.12, z], scale: [0.16, 0.2, 0.16] })
      head.sway = (p) => Math.max(0, p.y / clump.height) ** 1.5
      parts.push(stem, head)
    }
  }
  const geometry = mergeParts(parts, { sway: true })
  const mesh = new THREE.Mesh(geometry, toonMaterial(shared, gradient, { sway: true }))
  const hull = new THREE.Mesh(geometry, outlineMaterial(shared, 0.022, { sway: true }))
  mesh.name = 'reeds'
  hull.name = 'reeds-outline'
  return [mesh, hull]
}

const WATER_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uFirePos;
  uniform vec3 uFireColor;
  uniform float uFireStrength;
  uniform vec3 uNear;
  uniform vec3 uFar;
  uniform vec3 uDusk;
  uniform vec3 uGlint;
  uniform float uNearZ;
  uniform float uFarZ;
  uniform float uSunX;
  varying vec3 vWorld;
  ${FIRE_BANDS}
  void main() {
    float depth = clamp((vWorld.z - uFarZ) / (uNearZ - uFarZ), 0.0, 1.0);
    float wobble = sin(vWorld.x * 0.8 + uTime * 0.5) * 0.03 + sin(vWorld.x * 2.1 - uTime * 0.37) * 0.012;
    float band = floor((depth + wobble) * 4.0 + 0.5) / 4.0;
    vec3 color = mix(uFar, uNear, clamp(band, 0.0, 1.0));
    color = mix(color, uDusk, step(depth + wobble, 0.14) * 0.45 + step(depth + wobble, 0.3) * 0.2);
    float column = 1.0 - smoothstep(0.1, 0.7 + depth * 1.1, abs(vWorld.x - uSunX));
    float dash = step(0.9, fract(vWorld.z * 1.7 + sin(vWorld.x * 1.3 + uTime * 0.6) * 0.12));
    dash *= step(0.55, fract(vWorld.x * 0.45 + vWorld.z * 0.3 + uTime * 0.08));
    color = mix(color, uGlint, column * dash * (1.0 - depth * 0.6) * 0.7);
    float fireD = distance(vWorld.xz, uFirePos.xz) + max(0.0, uFirePos.y - 1.0) * 0.45;
    color += uFireColor * fireBands(fireD) * uFireStrength * 0.32;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

function water(shared: SharedUniforms): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(60, 30, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, BANK_Z + 15)
  const material = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    uniforms: {
      uTime: shared.uTime,
      uFirePos: shared.uFirePos,
      uFireColor: shared.uFireColor,
      uFireStrength: shared.uFireStrength,
      uNear: { value: new THREE.Color(PALETTE.waterNear) },
      uFar: { value: new THREE.Color(PALETTE.waterFar) },
      uDusk: { value: new THREE.Color(PALETTE.waterDusk) },
      uGlint: { value: new THREE.Color(PALETTE.waterGlint) },
      uNearZ: { value: POND.nearZ + 2 },
      uFarZ: { value: BANK_Z + 0.4 },
      uSunX: { value: 2.4 },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'water'
  mesh.renderOrder = -1
  return mesh
}

/** A lily pad: a disc with a notch, extruded thin, lying flat with its top at PAD_TOP. */
function padGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  const notch = 0.16
  shape.moveTo(0, 0)
  shape.lineTo(Math.cos(notch), Math.sin(notch))
  shape.absarc(0, 0, 1, notch, Math.PI * 2 - notch, false)
  shape.lineTo(0, 0)
  const bevel = 0.03
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: PAD_TOP - PAD_UNDERSIDE - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: PAD_RIM - 1,
    bevelSegments: 2,
    curveSegments: 20,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, PAD_UNDERSIDE + bevel, 0)
  geometry.computeVertexNormals()
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = new Float32Array(position.count * 2)
  const color = new Float32Array(position.count * 3)
  const side = new THREE.Color(PALETTE.padSide)
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = position.getX(i) * 0.5 + 0.5
    uv[i * 2 + 1] = -position.getZ(i) * 0.5 + 0.5
    const top = normal.getY(i) > 0.6
    color[i * 3] = top ? 1 : side.r
    color[i * 3 + 1] = top ? 1 : side.g
    color[i * 3 + 2] = top ? 1 : side.b
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3))
  return geometry
}

/** By row, low note to high: the near, low pads are a cooler, deeper lilac and the far, high ones warm toward pink. */
const ROW_TINTS = ['#d8ccf6', '#e6d9fb', '#f3e6ff', '#fdebf8', '#ffeff1']

export function buildPond(shared: SharedUniforms, gradient: THREE.Texture): PondSet {
  const group = new THREE.Group()
  group.name = 'pond'

  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: skyTexture(), fog: false, depthWrite: false }))
  backdrop.name = 'sky'
  backdrop.renderOrder = -2
  group.add(backdrop)

  const [bankMesh, bankHull] = bank(shared, gradient)
  const [reedMesh, reedHull] = reeds(shared, gradient)
  const waterMesh = water(shared)
  group.add(waterMesh, bankMesh, bankHull, reedMesh, reedHull)

  const geometry = padGeometry()
  const pads = new THREE.InstancedMesh(geometry, toonMaterial(shared, gradient, { map: padTexture() }), PADS.length)
  const padOutlines = new THREE.InstancedMesh(geometry, outlineMaterial(shared, 0.03), PADS.length)
  const ringMaterial = new THREE.MeshBasicMaterial({
    map: rippleTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: new THREE.Color('#ffffff').multiplyScalar(0.05),
    fog: false,
  })
  const padRings = new THREE.InstancedMesh(flatDisc(RING_REACH), ringMaterial, PADS.length)
  pads.name = 'pads'
  padOutlines.name = 'pad-outlines'
  padRings.name = 'pad-ripples'
  padRings.renderOrder = 1
  const padTints = PADS.map((pad) => new THREE.Color(ROW_TINTS[pad.row]))
  for (let i = 0; i < PADS.length; i++) pads.setColorAt(i, padTints[i])
  for (const mesh of [pads, padOutlines, padRings]) {
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }
  group.add(pads, padOutlines, padRings)

  for (const mesh of [backdrop, waterMesh, bankMesh, bankHull, reedMesh, reedHull]) {
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
  }
  return { group, pads, padOutlines, padRings, padTints, backdrop, water: waterMesh, reeds: reedMesh, reedOutlines: reedHull }
}

const ray = new THREE.Vector3()
const origin = new THREE.Vector3()

function hitBackdrop(camera: THREE.PerspectiveCamera, ndcX: number, ndcY: number, out: THREE.Vector3): THREE.Vector3 {
  origin.setFromMatrixPosition(camera.matrixWorld)
  ray.set(ndcX, ndcY, 0.5).unproject(camera).sub(origin).normalize()
  const t = (BACKDROP_Z - origin.z) / ray.z
  return out.copy(origin).addScaledVector(ray, t)
}

const topLeft = new THREE.Vector3()
const topRight = new THREE.Vector3()
const bankTop = new THREE.Vector3()

/** Stretch the painted sky over the screen above the bank: its horizon sits just above the bank's top. */
export function fitBackdrop(backdrop: THREE.Mesh, camera: THREE.PerspectiveCamera): void {
  camera.updateMatrixWorld()
  hitBackdrop(camera, -1.05, 1.05, topLeft)
  hitBackdrop(camera, 1.05, 1.05, topRight)
  origin.setFromMatrixPosition(camera.matrixWorld)
  bankTop.set(0, 0.55, BANK_Z)
  ray.copy(bankTop).sub(origin)
  bankTop.copy(origin).addScaledVector(ray, (BACKDROP_Z - origin.z) / ray.z)
  const horizon = 0.3
  const height = (topLeft.y - bankTop.y) / (1 - horizon)
  // The frustum meets the upright backdrop in a trapezoid, wider at the bottom.
  const width = (topRight.x - topLeft.x) * 1.5
  backdrop.scale.set(width, height, 1)
  backdrop.position.set(0, bankTop.y - horizon * height + height / 2, BACKDROP_Z)
  backdrop.updateMatrix()
}
