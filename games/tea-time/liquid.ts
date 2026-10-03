import * as THREE from 'three'
import { CLOTH } from './layout'
import { CELL_HOLDS, PUDDLE_COLS, PUDDLE_ROWS, cellSpot, type World } from './world'

// Tea in motion and tea on the cloth: the stream from the spout, the drops,
// the ring a drop makes where it lands, and the puddles. All of it is drawn
// from what the model says (how strong the stream is, how much lies in each
// cell of cloth); nothing here decides anything.

const ALONG = 12
const AROUND = 7

/** The rope of tea from the spout to where it lands: a short tube bent by its own fall, as thick as the stream is strong. */
export class Stream {
  readonly mesh: THREE.Mesh
  private readonly position: THREE.BufferAttribute
  /** 0 to 1: how far down the stream has reached since it started, so it falls from the spout and is not suddenly there. */
  private reach = 0
  private strength = 0

  constructor(material: THREE.Material) {
    const geometry = new THREE.BufferGeometry()
    this.position = new THREE.BufferAttribute(new Float32Array((ALONG + 1) * AROUND * 3), 3)
    this.position.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', this.position)
    const index: number[] = []
    for (let i = 0; i < ALONG; i++) {
      for (let j = 0; j < AROUND; j++) {
        const a = i * AROUND + j, b = i * AROUND + ((j + 1) % AROUND), c = a + AROUND, d = b + AROUND
        index.push(a, c, b, b, c, d)
      }
    }
    geometry.setIndex(index)
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.name = 'stream'
  }

  /** `flow` is the model's stream strength as a share of steady, 0 when nothing runs. */
  update(dt: number, flow: number, from: THREE.Vector3, to: THREE.Vector3, time: number): void {
    // The stream thins out over a few frames when it stops, as the last of it falls.
    this.strength = flow > 0 ? flow : Math.max(0, this.strength - dt * 6)
    this.reach = flow > 0 ? Math.min(1, this.reach + dt * 9) : this.strength > 0 ? this.reach : 0
    this.mesh.visible = this.strength > 0.01
    if (!this.mesh.visible) return
    const forward = new THREE.Vector3(to.x - from.x, 0, to.z - from.z)
    const side = new THREE.Vector3(-forward.z, 0, forward.x).normalize()
    if (side.lengthSq() === 0) side.set(1, 0, 0)
    for (let i = 0; i <= ALONG; i++) {
      const t = (i / ALONG) * this.reach
      // Out along the spout's line at an even pace, down by the square of the time: a fall.
      const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t
      const y = from.y + (to.y - from.y) * t * t
      // Thicker where it leaves the spout, with a slow waver so it reads as liquid.
      const radius = (0.022 + 0.05 * Math.sqrt(this.strength)) * (1 - 0.35 * t) * (1 + 0.12 * Math.sin(time * 19 + i * 1.3))
      for (let j = 0; j < AROUND; j++) {
        const a = (j / AROUND) * Math.PI * 2
        this.position.setXYZ(i * AROUND + j, x + side.x * Math.cos(a) * radius, y + Math.sin(a) * radius, z + side.z * Math.cos(a) * radius)
      }
    }
    this.position.needsUpdate = true
  }
}

type Drop = { x: number; y: number; z: number; vx: number; vz: number; vy: number; floor: number; live: boolean }

/** Single drops: the one that answers a press, the last one of a pour, the dribble off a rim. One draw for all of them. */
export class Drops {
  readonly mesh: THREE.InstancedMesh
  private readonly drops: Drop[] = []
  private readonly matrix = new THREE.Matrix4()
  /** Where drops have just landed, for the view to ring the surface there; emptied by whoever reads it. */
  readonly landed: { x: number; y: number; z: number }[] = []

  constructor(material: THREE.Material, capacity = 20) {
    const geometry = new THREE.SphereGeometry(0.06, 8, 6)
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.name = 'drops'
    for (let i = 0; i < capacity; i++) this.drops.push({ x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, floor: 0, live: false })
  }

  /** A drop leaves `from` and lands at `to`: it flies out as far as the stream does, so it lands in the cup and not short of it. */
  fall(from: THREE.Vector3, to: { x: number; y: number; z: number }): void {
    const drop = this.drops.find((candidate) => !candidate.live) ?? this.drops[0]
    const seconds = Math.sqrt((2 * Math.max(0.02, from.y - to.y)) / Drops.GRAVITY)
    drop.x = from.x; drop.y = from.y; drop.z = from.z
    drop.vx = (to.x - from.x) / seconds; drop.vz = (to.z - from.z) / seconds
    drop.vy = 0; drop.floor = to.y; drop.live = true
  }
  private static readonly GRAVITY = 26

  update(dt: number): void {
    let count = 0
    for (const drop of this.drops) {
      if (!drop.live) continue
      drop.vy -= Drops.GRAVITY * dt
      drop.y += drop.vy * dt
      drop.x += drop.vx * dt
      drop.z += drop.vz * dt
      if (drop.y <= drop.floor) {
        drop.live = false
        this.landed.push({ x: drop.x, y: drop.floor, z: drop.z })
        continue
      }
      // A falling drop is longer than it is wide.
      const stretch = 1 + Math.min(1.2, -drop.vy * 0.12)
      this.matrix.makeScale(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch)).setPosition(drop.x, drop.y, drop.z)
      this.mesh.setMatrixAt(count++, this.matrix)
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/** Rings that widen and fade on a surface where tea lands. */
export class Ripples {
  readonly mesh: THREE.InstancedMesh
  private readonly rings: { x: number; y: number; z: number; size: number; age: number }[] = []
  private readonly matrix = new THREE.Matrix4()
  private static readonly LIFE = 0.55

  constructor(capacity = 6) {
    const geometry = new THREE.RingGeometry(0.82, 1, 28)
    geometry.rotateX(-Math.PI / 2)
    this.mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color: '#ffe9c4', transparent: true, opacity: 0.5, depthWrite: false }), capacity)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 3
    this.mesh.name = 'ripples'
  }

  /** A ring starts at a point and grows to `size` across. */
  ring(x: number, y: number, z: number, size: number): void {
    if (this.rings.length >= this.mesh.instanceMatrix.count) this.rings.shift()
    this.rings.push({ x, y, z, size, age: 0 })
  }

  update(dt: number): void {
    let count = 0
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]
      ring.age += dt
      if (ring.age >= Ripples.LIFE) {
        this.rings.splice(i, 1)
        continue
      }
      const t = ring.age / Ripples.LIFE
      // It thins as it widens, by shrinking toward nothing at the end of its life.
      const size = ring.size * (0.15 + 0.85 * Math.sqrt(t)) * (t > 0.8 ? 1 - (t - 0.8) * 2 : 1)
      this.matrix.makeScale(size, 1, size).setPosition(ring.x, ring.y + 0.004, ring.z)
      this.mesh.setMatrixAt(count++, this.matrix)
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/** The tea on the cloth: one flat blot for each wet cell of the model's grid, sized by how much lies there, so the puddle is as large as the spill. */
export class Puddles {
  readonly mesh: THREE.InstancedMesh
  private readonly matrix = new THREE.Matrix4()
  /** What is drawn, which eases toward the model so a puddle creeps and a wipe is seen to take it up. */
  private readonly shown = new Float32Array(PUDDLE_COLS * PUDDLE_ROWS)
  private readonly cell = Math.hypot((CLOTH.maxX - CLOTH.minX) / PUDDLE_COLS, (CLOTH.maxZ - CLOTH.minZ) / PUDDLE_ROWS) / 2

  constructor() {
    const geometry = new THREE.CircleGeometry(1, 18)
    geometry.rotateX(-Math.PI / 2)
    this.mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color: '#a85e1c', transparent: true, opacity: 0.9, depthWrite: false }), PUDDLE_COLS * PUDDLE_ROWS)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 2
    this.mesh.name = 'puddles'
  }

  /** `dt` of 0 shows the model at once, as on load: nothing eases in. */
  update(world: World, dt: number): void {
    let count = 0
    const ease = dt <= 0 ? 1 : 1 - Math.exp(-dt * 7)
    for (let cell = 0; cell < this.shown.length; cell++) {
      this.shown[cell] += (world.puddles[cell] - this.shown[cell]) * ease
      if (this.shown[cell] < CELL_HOLDS * 0.01) continue
      const spot = cellSpot(cell)
      // A full cell's blot reaches a little past its neighbours' middles, so a wide puddle is one shape.
      const size = this.cell * 1.25 * Math.sqrt(this.shown[cell] / CELL_HOLDS)
      // Each blot is a little off round, by its place, so the edge of a puddle is not a row of circles.
      const skew = 1 + 0.18 * Math.sin(cell * 12.9898)
      this.matrix.makeScale(size * skew, 1, size / skew).setPosition(spot.x, 0.006, spot.z)
      this.mesh.setMatrixAt(count++, this.matrix)
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
