import { BufferAttribute, type BufferGeometry, CircleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from 'three'
import type { KindName } from './bodies'
import { marcherGeometry } from './friends'
import { BALLOON, CLOUDS, FAR_HILL, GROUND, HILL, PARADE_FRIENDS } from './layout'
import { PALETTE } from './palette'
import { pillow, pillows } from './shapes'
import { vinylMaterial, type VinylUniforms } from './vinyl'

// What never changes: the sky, the two hills and the clouds; and the three
// batches everything small is drawn from: balloons, strings and blob shadows.
// Each batch is one draw however many are in it.

/** The most balloons in one frame: the sky (up to twelve), three held, four bunches in flight, those that got away, a troop passing with theirs, the far hill's twelve, and the scraps of a few pops and the drops of a cloud, which are drawn as small balloons. */
export const MAX_BALLOONS = 96
export const MAX_STRINGS = 64
export const MAX_SHADOWS = 16

/** How far behind the friends the sky stands, and the clouds in front of it. */
const SKY_DEPTH = -40

export type Scenery = {
  group: Group
  sky: Mesh
  clouds: Mesh[]
  balloons: InstancedMesh
  strings: InstancedMesh
  shadows: InstancedMesh
  /** The friends on the far hill, one batch a kind. */
  parade: Record<KindName, InstancedMesh>
  /** Those of them that walk without a balloon, for the kinds that let their arms down then: one batch a kind. */
  strolling: Partial<Record<KindName, InstancedMesh>>
  /** The ghost hand of the idle guidance: an inflated white glove, drawn over everything. */
  hand: Mesh
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

/** A balloon of radius 1 with its knot at the bottom: plain, one flat colour all over, knot and all, and no seam. White in the vertices, so the instance colour is its colour. */
function balloonGeometry() {
  return pillows([
    { at: [0, 0.08, 0], size: [1, 1.1, 1], colour: '#ffffff', detail: [28, 18] },
    { at: [0, -0.72, 0], size: [0.52, 0.5, 0.52], colour: '#ffffff', detail: [16, 10] },
    { at: [0, -1.24, 0], size: [0.13, 0.1, 0.13], colour: '#ffffff', detail: [10, 8] },
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
  const farHill = new Mesh(pillow({ at: [FAR_HILL.x, FAR_HILL.y, FAR_HILL.z], size: [FAR_HILL.ry, FAR_HILL.rx, FAR_HILL.rz], turn: [0, 0, Math.PI / 2], colour: PALETTE.farHill, detail: [40, 20] }), still)
  farHill.name = 'far-hill'
  group.add(hill, farHill)

  const cloudShape = cloudGeometry()
  const clouds = CLOUDS.map((at, i) => {
    const cloud = new Mesh(cloudShape, soft)
    cloud.name = `cloud-${i}`
    cloud.position.set(at.x, at.y, at.z)
    cloud.scale.setScalar(at.scale)
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
  // The far hill's friends: whole toys in one geometry, hazed by the distance, a batch for each kind.
  const hazed = vinylMaterial(shared, { uGlow: 0, uWobble: 0, uHaze: 0.26 })
  const marchers: BufferGeometry[] = []
  const batchOf = (kind: KindName, holds = true): InstancedMesh => {
    const geometry = marcherGeometry(kind, holds)
    marchers.push(geometry)
    const batch = new InstancedMesh(geometry, hazed, PARADE_FRIENDS)
    batch.name = holds ? `parade-${kind}` : `parade-${kind}-strolling`
    return batch
  }
  const parade: Record<KindName, InstancedMesh> = { duck: batchOf('duck'), frog: batchOf('frog'), hippo: batchOf('hippo'), crab: batchOf('crab') }
  // A troop that marched off after a pop has a friend without a balloon. The crab keeps its claws up either way.
  const strolling: Partial<Record<KindName, InstancedMesh>> = { duck: batchOf('duck', false), frog: batchOf('frog', false), hippo: batchOf('hippo', false) }

  // The ghost hand: a glove with one finger out, its tip at the mesh's origin. It is drawn over everything and tests no depth.
  const glove = pillows([
    // A mitten: a round palm, one finger out with its tip at the origin, and a cuff.
    { at: [0.22, -0.92, 0], size: [0.42, 0.4, 0.24], colour: PALETTE.valve },
    { at: [0.05, -0.36, 0], size: [0.13, 0.42, 0.13], turn: [0, 0, 0.14], colour: PALETTE.valve, detail: [16, 10] },
    { at: [0.3, -1.36, 0], size: [0.36, 0.15, 0.22], colour: PALETTE.glow, panels: 2, detail: [16, 10] },
  ])
  const gloveSkin = vinylMaterial(shared, { uGlow: 0, uWobble: 0 })
  gloveSkin.depthTest = false
  gloveSkin.depthWrite = false
  const hand = new Mesh(glove, gloveSkin)
  hand.name = 'ghost-hand'
  hand.renderOrder = 10
  hand.visible = false

  const white = new Color('#ffffff')
  for (const batch of [balloons, strings, shadows, ...Object.values(parade), ...Object.values(strolling)]) {
    batch.instanceMatrix.setUsage(DynamicDrawUsage)
    // The colour buffer is made on the first write; make it now, so every instance has one from the first draw.
    batch.setColorAt(0, white)
    batch.count = 0
    // Instances move every frame, so the batch's own bounds would always be stale.
    batch.frustumCulled = false
  }
  group.add(shadows, strings, balloons, ...Object.values(parade), ...Object.values(strolling), hand)

  return {
    group,
    sky: backdrop,
    clouds,
    balloons,
    strings,
    shadows,
    parade,
    strolling,
    hand,
    dispose() {
      for (const mesh of [backdrop, hill, farHill, balloons, strings, shadows]) {
        mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) for (const one of material) one.dispose()
        else material.dispose()
      }
      cloudShape.dispose()
      for (const geometry of marchers) geometry.dispose()
      glove.dispose()
      gloveSkin.dispose()
      hazed.dispose()
      still.dispose()
      soft.dispose()
    },
  }
}
