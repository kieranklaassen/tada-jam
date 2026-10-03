import { BufferAttribute, CircleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import { BALLOON, GROUND, HILL } from './layout'
import { PALETTE } from './palette'
import { pillow, pillows } from './shapes'
import { vinylMaterial, type VinylUniforms } from './vinyl'

// What never changes: the sky, the two hills and the clouds; and the three
// batches everything small is drawn from: balloons, strings and blob shadows.
// Each batch is one draw however many are in it.

/** The most balloons on screen: five bunches of three would never be laid, but four of three with three held and a few in flight are. */
export const MAX_BALLOONS = 28
export const MAX_STRINGS = 64
export const MAX_SHADOWS = 10

/** How far behind the friends the sky stands, and the clouds in front of it. */
const SKY_DEPTH = -40
const CLOUD_DEPTH = -15

export type Scenery = {
  group: Group
  sky: Mesh
  clouds: Mesh[]
  balloons: InstancedMesh
  strings: InstancedMesh
  shadows: InstancedMesh
  dispose(): void
}

function sky(): Mesh {
  const geometry = new PlaneGeometry(1, 1, 1, 8)
  const position = geometry.getAttribute('position')
  const colours = new Float32Array(position.count * 3)
  const top = new Color(PALETTE.skyTop), low = new Color(PALETTE.skyLow), mixed = new Color()
  for (let i = 0; i < position.count; i++) {
    // Pale at the horizon and a little below the middle, since the hill hides what is lower.
    const t = Math.min(1, Math.max(0, (position.getY(i) + 0.32) / 0.82))
    mixed.copy(low).lerp(top, t * t * (3 - 2 * t))
    colours[i * 3] = mixed.r; colours[i * 3 + 1] = mixed.g; colours[i * 3 + 2] = mixed.b
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3))
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, depthWrite: false }))
  mesh.name = 'sky'
  mesh.position.z = SKY_DEPTH
  mesh.renderOrder = -2
  return mesh
}

/** One puffy cloud: a row of pillows on a flat bottom. */
function cloudGeometry() {
  const c = PALETTE.cloud
  return pillows([
    { at: [0, 0, 0], size: [1.5, 0.62, 0.7], colour: c },
    { at: [-1.1, -0.12, 0.1], size: [0.9, 0.46, 0.6], colour: c, detail: [16, 10] },
    { at: [1.15, -0.1, 0.1], size: [1.0, 0.5, 0.6], colour: c, detail: [16, 10] },
    { at: [0.3, 0.42, -0.1], size: [0.8, 0.52, 0.6], colour: c, detail: [16, 10] },
  ])
}

/** A balloon of radius 1 with its knot at the bottom: plain, one colour, no seam. White in the vertices, so the instance colour is its colour. */
function balloonGeometry() {
  return pillows([
    { at: [0, 0.08, 0], size: [1, 1.1, 1], colour: '#ffffff', detail: [28, 18] },
    { at: [0, -0.72, 0], size: [0.52, 0.5, 0.52], colour: '#ffffff', detail: [16, 10] },
    { at: [0, -1.24, 0], size: [0.13, 0.1, 0.13], colour: '#d8d8d8', detail: [10, 8] },
  ])
}

const SHADOW_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vUv = uv;
  vTint = instanceColor;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`
const SHADOW_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(vTint, smoothstep(1.0, 0.15, d) * 0.5);
  #include <colorspace_fragment>
}
`

export function buildScenery(shared: VinylUniforms): Scenery {
  const group = new Group()
  group.name = 'scenery'
  const still = vinylMaterial(shared, { uWobble: 0, uGlow: 0 })
  const soft = vinylMaterial(shared, { uGlow: 0 })

  const backdrop = sky()
  group.add(backdrop)

  // The hill is a pillow lying on its side, so its welded panels run across it like the ribs of an air bed.
  const hill = new Mesh(pillow({ at: [HILL.x, GROUND - HILL.ry, HILL.z], size: [HILL.ry, HILL.rx, HILL.rz], turn: [0, 0, Math.PI / 2], colour: PALETTE.hill, panels: 30, detail: [64, 40] }), still)
  hill.name = 'hill'
  const farHill = new Mesh(pillow({ at: [6.5, GROUND - 4.4, -19], size: [5.6, 11, 5], turn: [0, 0, Math.PI / 2], colour: PALETTE.farHill, detail: [40, 20] }), still)
  farHill.name = 'far-hill'
  group.add(hill, farHill)

  const cloudShape = cloudGeometry()
  const clouds = [[-9.5, 1.6, 1.25], [8.2, 0.4, 0.95], [1.5, -1.2, 0.7]].map(([x, y, scale], i) => {
    const cloud = new Mesh(cloudShape, soft)
    cloud.name = `cloud-${i}`
    cloud.position.set(x, y, CLOUD_DEPTH)
    cloud.scale.setScalar(scale)
    return cloud
  })
  group.add(...clouds)

  const balloons = new InstancedMesh(balloonGeometry(), vinylMaterial(shared, { uWobble: 0.01 * BALLOON }), MAX_BALLOONS)
  balloons.name = 'balloons'
  const strings = new InstancedMesh(new CylinderGeometry(1, 1, 1, 5, 1).translate(0, 0.5, 0), new MeshBasicMaterial(), MAX_STRINGS)
  strings.name = 'strings'
  const shadows = new InstancedMesh(
    new CircleGeometry(1, 24).rotateX(-Math.PI / 2),
    new ShaderMaterial({ vertexShader: SHADOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false }),
    MAX_SHADOWS,
  )
  shadows.name = 'shadows'
  shadows.renderOrder = -1
  const white = new Color('#ffffff')
  for (const batch of [balloons, strings, shadows]) {
    batch.instanceMatrix.setUsage(DynamicDrawUsage)
    // The colour buffer is made on the first write; make it now, so every instance has one from the first draw.
    batch.setColorAt(0, white)
    batch.count = 0
    // Instances move every frame, so the batch's own bounds would always be stale.
    batch.frustumCulled = false
  }
  group.add(shadows, strings, balloons)

  return {
    group,
    sky: backdrop,
    clouds,
    balloons,
    strings,
    shadows,
    dispose() {
      for (const mesh of [backdrop, hill, farHill, balloons, strings, shadows]) {
        mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) for (const one of material) one.dispose()
        else material.dispose()
      }
      cloudShape.dispose()
      still.dispose()
      soft.dispose()
    },
  }
}
