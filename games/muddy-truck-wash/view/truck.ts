import * as THREE from 'three'
import { LAYOUT } from '../props'
import { PAINT, type VehicleDef } from '../roster'
import { MAT, Shape } from '../shapes'
import { CELLS, GRID_H, GRID_W, type Surface } from '../surface'
import { enamelMaterial, type EnamelKit } from './enamel'
import { toGeometry } from './geometry'

// One vehicle on the floor: a merged body, its one moving part, instanced
// wheels, two lamp eyes with pupils and lids, the copy the wet floor gives
// back, and the two small textures its surface grid is written into.

/** Where the vehicle is and how it holds itself. A motion module fills this in; the view only shows it. */
export type TruckPose = {
  x: number
  z: number
  /** The body above its rest height on the springs. */
  lift: number
  /** Nose down, radians. */
  pitch: number
  /** Leaning toward the child, radians. */
  lean: number
  wheelSpin: number
  /** How far each axle's tyres are pressed flat, 0 to about 0.3, front axle first. */
  squash: number[]
  /** The moving part: an angle about its pivot. */
  part: number
  /** Where the eyes look: sideways toward the child (1) or straight ahead (0), and up. */
  gazeSide: number
  gazeUp: number
  /** 0 open, 1 shut. */
  lid: number
  /** The eyes turned toward each other. */
  cross: number
}

export function restPose(): TruckPose {
  return { x: 0, z: 0, lift: 0, pitch: 0, lean: 0, wheelSpin: 0, squash: [], part: 0, gazeSide: 0.75, gazeUp: 0.1, lid: 0, cross: 0 }
}

let wheelShape: Shape | null = null
/** A wheel of radius and width 1: a chunky tyre, a painted hub that takes the instance's colour, a zinc cap. */
function unitWheel(): Shape {
  if (wheelShape) return wheelShape
  const s = new Shape()
  s.round(1, 1, PAINT.rubber, {}, { mat: MAT.rubber, bevel: 0.14, segs: 24 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    s.box([0.2, 0.22, 1.04], PAINT.rubber, { at: [Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0], turn: { axis: 'z', by: a + Math.PI / 2 } }, { mat: MAT.rubber, bevel: 0.04 })
  }
  s.round(0.58, 1.08, [1, 1, 1], {}, { bevel: 0.08, segs: 20 })
  s.round(0.2, 1.2, PAINT.zinc, {}, { mat: MAT.metal, bevel: 0.05, segs: 12 })
  wheelShape = s
  return s
}

const EASE = 14
const AHEAD = new THREE.Vector3(0, 0, 1)

export class TruckView {
  readonly root = new THREE.Group()
  /** The copy under the floor. Add it to the scene beside `root`. */
  readonly mirror = new THREE.Group()
  private readonly sets: { chassis: THREE.Group; part: THREE.Mesh; wheels: THREE.InstancedMesh }[] = []
  private readonly pupils: THREE.Mesh[] = []
  private readonly lids: THREE.Mesh[] = []
  private readonly maskA: THREE.DataTexture
  private readonly maskB: THREE.DataTexture
  private readonly shown = new Float32Array(CELLS * 6)
  private readonly target = new Float32Array(CELLS * 6)
  private settled = false
  private readonly owned: { dispose(): void }[] = []
  private readonly matrix = new THREE.Matrix4()
  private readonly scratch = new THREE.Matrix4()
  private readonly aim = new THREE.Vector3()

  constructor(kit: EnamelKit, readonly def: VehicleDef, reflect: boolean) {
    this.root.name = `vehicle-${def.id}`
    this.mirror.name = `mirror-${def.id}`
    this.mirror.scale.y = -1
    this.maskA = maskTexture()
    this.maskB = maskTexture()
    this.owned.push(this.maskA, this.maskB)
    const masks = { a: this.maskA, b: this.maskB, side: def.side }
    const built = def.build()
    const bodyGeometry = toGeometry(built.body), partGeometry = toGeometry(built.part, built.pivot), wheelGeometry = toGeometry(unitWheel())
    this.owned.push(bodyGeometry, partGeometry, wheelGeometry)

    for (const reflected of reflect ? [false, true] : [false]) {
      const material = (restOffset?: readonly [number, number, number]) => {
        const m = enamelMaterial(kit, { masks, restOffset, reflected, yardFrom: LAYOUT.yardFrom })
        this.owned.push(m)
        return m
      }
      const chassis = new THREE.Group()
      const body = new THREE.Mesh(bodyGeometry, material())
      body.name = `${def.id}-body`
      const part = new THREE.Mesh(partGeometry, material(built.pivot))
      part.name = `${def.id}-part`
      part.position.set(...built.pivot)
      chassis.add(body, part)
      const wheels = new THREE.InstancedMesh(wheelGeometry, material(), def.wheels.length * 2)
      wheels.name = `${def.id}-wheels`
      wheels.frustumCulled = false
      const hub = new THREE.Color()
      def.wheels.forEach((wheel, i) => {
        hub.setRGB(wheel.hub[0], wheel.hub[1], wheel.hub[2])
        wheels.setColorAt(i * 2, hub)
        wheels.setColorAt(i * 2 + 1, hub)
      })
      const group = reflected ? this.mirror : this.root
      group.add(chassis, wheels)
      if (reflected) for (const mesh of [body, part, wheels]) mesh.renderOrder = -1
      this.sets.push({ chassis, part, wheels })

      if (!reflected) {
        const pupilGeometry = toGeometry(new Shape().round(1, 0.3, PAINT.black, {}, { axis: 'z', mat: MAT.lamp, segs: 16, bevel: 0.1 }))
        const lidGeometry = toGeometry(new Shape().ball(1.09, def.paint, {}, { from: 0, segs: 16 }))
        this.owned.push(pupilGeometry, lidGeometry)
        const plain = enamelMaterial(kit, {})
        this.owned.push(plain)
        def.eyes.forEach((eye, i) => {
          const pupil = new THREE.Mesh(pupilGeometry, plain)
          pupil.name = `${def.id}-pupil-${i}`
          pupil.scale.set(eye.r * 0.5, eye.r * 0.5, eye.r * 0.5)
          const lid = new THREE.Mesh(lidGeometry, plain)
          lid.name = `${def.id}-lid-${i}`
          lid.position.set(...eye.at)
          lid.scale.setScalar(eye.r)
          chassis.add(pupil, lid)
          this.pupils.push(pupil)
          this.lids.push(lid)
        })
      }
    }
    this.pose(restPose())
  }

  /** What is on the vehicle. `instant` skips the easing, as on load. */
  setSurface(surface: Surface, instant = false): void {
    const t = this.target
    for (let cell = 0; cell < CELLS; cell++) {
      const patch = surface[cell], k = cell * 6
      const mud = patch === 'c' || patch === 's', foam = patch === 'b' || patch === 'f'
      t[k] = mud ? 1 : 0
      t[k + 1] = patch === 's' ? 1 : 0
      t[k + 2] = foam ? 1 : 0
      t[k + 3] = patch === 'b' ? 1 : 0
      t[k + 4] = patch === 'w' ? 1 : 0
      t[k + 5] = patch === 'p' ? 1 : 0
    }
    // Softness and brownness bleed out from their own patches, so an edge keeps its colour as it thins.
    for (let row = 0; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) {
      const k = (row * GRID_W + col) * 6
      for (const [amount, kind] of [[0, 1], [2, 3]] as const) {
        if (t[k + amount] > 0) continue
        let sum = 0, count = 0
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr, c = col + dc
          if (r < 0 || r >= GRID_H || c < 0 || c >= GRID_W) continue
          const n = (r * GRID_W + c) * 6
          if (surface[r * GRID_W + c] !== '.' && t[n + amount] > 0) { sum += t[n + kind]; count += 1 }
        }
        t[k + kind] = count ? sum / count : this.shown[k + kind]
      }
    }
    if (instant) this.shown.set(t)
    this.settled = false
    if (instant) this.write()
  }

  /** Eases the shown surface toward what is there, and shows the pose. */
  update(dt: number, pose: TruckPose): void {
    if (!this.settled) {
      const blend = 1 - Math.exp(-EASE * dt)
      let moving = false
      for (let i = 0; i < this.shown.length; i++) {
        const gap = this.target[i] - this.shown[i]
        if (Math.abs(gap) < 0.004) this.shown[i] = this.target[i]
        else { this.shown[i] += gap * blend; moving = true }
      }
      this.write()
      this.settled = !moving
    }
    this.pose(pose)
  }

  private write(): void {
    const a = this.maskA.image.data as Uint8Array, b = this.maskB.image.data as Uint8Array
    for (let cell = 0; cell < CELLS; cell++) {
      const k = cell * 6, o = cell * 4
      a[o] = this.shown[k] * 255; a[o + 1] = this.shown[k + 1] * 255; a[o + 2] = this.shown[k + 2] * 255; a[o + 3] = this.shown[k + 3] * 255
      b[o] = this.shown[k + 4] * 255; b[o + 1] = this.shown[k + 5] * 255; b[o + 2] = 0; b[o + 3] = 255
    }
    this.maskA.needsUpdate = true
    this.maskB.needsUpdate = true
  }

  private pose(pose: TruckPose): void {
    const def = this.def
    this.root.position.set(pose.x, 0, pose.z)
    this.mirror.position.set(pose.x, 0, pose.z)
    for (const set of this.sets) {
      set.chassis.position.y = pose.lift
      set.chassis.rotation.set(pose.lean, 0, pose.pitch)
      set.part.rotation.z = pose.part
      def.wheels.forEach((wheel, i) => {
        const squash = pose.squash[i] ?? 0
        for (const side of [1, -1]) {
          // Flattened against the floor after the spin, so the flat stays underneath.
          this.matrix.makeTranslation(wheel.x, wheel.r * (1 - squash), side * wheel.z)
          this.matrix.multiply(this.scratch.makeScale(1 + squash * 0.5, 1 - squash, 1))
          this.matrix.multiply(this.scratch.makeRotationZ(pose.wheelSpin))
          this.matrix.multiply(this.scratch.makeScale(wheel.r, wheel.r, wheel.w))
          set.wheels.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), this.matrix)
        }
      })
      set.wheels.instanceMatrix.needsUpdate = true
    }
    def.eyes.forEach((eye, i) => {
      // Ahead is -x; the child is toward +z. A crossed eye turns toward the other one.
      const inward = -Math.sign(eye.at[2]) * pose.cross * 0.9
      const side = pose.gazeSide + inward
      const dx = -Math.cos(side) * Math.cos(pose.gazeUp), dy = Math.sin(pose.gazeUp), dz = Math.sin(side) * Math.cos(pose.gazeUp)
      const pupil = this.pupils[i]
      pupil.position.set(eye.at[0] + dx * eye.r * 0.93, eye.at[1] + dy * eye.r * 0.93, eye.at[2] + dz * eye.r * 0.93)
      pupil.quaternion.setFromUnitVectors(AHEAD, this.aim.set(dx, dy, dz))
      // The lid is a dome over the back of the lamp that rolls forward to shut.
      this.lids[i].rotation.set(0, side * 0.6, -0.95 + pose.lid * 2.35, 'YXZ')
    })
  }

  dispose(): void {
    for (const thing of this.owned) thing.dispose()
  }
}

function maskTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(CELLS * 4), GRID_W, GRID_H, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
