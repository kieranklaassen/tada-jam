import * as THREE from 'three'
import type { VehicleDef } from '../roster'
import { Shape } from '../shapes'
import { patchCentre, proudAt, silhouette } from '../silhouette'
import { CELLS, GRID_H, GRID_W } from '../surface'
import { enamelMaterial, type EnamelKit } from './enamel'
import { toGeometry } from './geometry'

// Mud and foam with body to them: on every patch that holds either, a couple
// of lumps stand out from the paint. Dried mud is pale clods, soft mud dark
// drooping blobs, foam white puffs that pile up under the sponge and shrink
// away under the hose. One instanced set per vehicle, built once; only the
// patches that hold something are drawn.

const PER_PATCH = 2
/** A small fixed scatter, so the lumps of a patch never sit in a row. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const DRIED: readonly [number, number, number] = [0.76, 0.64, 0.46]
const SOFT: readonly [number, number, number] = [0.3, 0.18, 0.09]
const SUDS: readonly [number, number, number] = [0.98, 0.99, 1.0]
const BROWN_SUDS: readonly [number, number, number] = [0.8, 0.68, 0.52]

let lump: Shape | null = null

export class Lumps {
  readonly mesh: THREE.InstancedMesh
  private readonly cells: { cell: number; x: number; y: number; z: number }[] = []
  private readonly matrix = new THREE.Matrix4()
  private readonly colour = new THREE.Color()
  private readonly owned: { dispose(): void }[] = []

  constructor(kit: EnamelKit, def: VehicleDef) {
    lump ??= new Shape().ball(1, [1, 1, 1], {}, { segs: 8 })
    const geometry = toGeometry(lump)
    const material = enamelMaterial(kit, { gloss: 0.28 })
    this.owned.push(geometry, material)
    const body = silhouette(def)
    for (let cell = 0; cell < CELLS; cell++) {
      if (body[cell] === '.') continue
      const col = cell % GRID_W, row = Math.floor(cell / GRID_W)
      const { x, y } = patchCentre(def, col, row)
      this.cells.push({ cell, x, y, z: proudAt(def, col, row) })
    }
    this.mesh = new THREE.InstancedMesh(geometry, material, this.cells.length * PER_PATCH)
    this.mesh.name = `${def.id}-lumps`
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    // A lump's colour is set per instance; give the buffer its full size once.
    for (let i = 0; i < this.cells.length * PER_PATCH; i++) this.mesh.setColorAt(i, this.colour.setRGB(1, 1, 1))
  }

  /**
   * Shows what the surface holds now. `shown` is the eased surface, six
   * numbers a patch: mud, how soft, foam, how brown, wet, shine. `puff` is
   * how far each patch's foam is swollen just now, 0 to 1, or its mud pushed along. Foam with wet
   * paint under or beside it is thin; on dry paint it stands thick. `wobble`
   * is how hard the mud is shaking just now, 0 to 1, at `seconds`.
   */
  update(shown: Float32Array, puff: Float32Array | null = null, wobble = 0, seconds = 0): void {
    let n = 0
    const cw = 0.4
    for (const at of this.cells) {
      const k = at.cell * 6
      const mud = shown[k], foam = shown[k + 2]
      const amount = Math.max(mud, foam)
      if (amount < 0.06) continue
      const isFoam = foam >= mud
      const soft = shown[k + 1], brown = shown[k + 3]
      const col = at.cell % GRID_W, row = Math.floor(at.cell / GRID_W)
      const wetAt = (c: number, r: number): number => (c < 0 || c >= GRID_W || r < 0 || r >= GRID_H ? 0 : shown[(r * GRID_W + c) * 6 + 4])
      const thin = isFoam ? Math.max(wetAt(col, row - 1), wetAt(col - 1, row), wetAt(col + 1, row)) : 0
      const swell = isFoam && puff ? puff[at.cell] : 0
      // Mud the cloth has just pushed at slides a little way along and comes back.
      const slide = !isFoam && puff ? puff[at.cell] * 0.09 : 0
      // Foam piles in two puffs a patch; mud is one low clod, so the vehicle under it keeps its shape.
      for (let i = 0; i < (isFoam ? PER_PATCH : 1); i++) {
        const j = at.cell * 7 + i * 3
        const dx = (hash(j) - 0.5) * cw * 0.9, dy = (hash(j + 1) - 0.5) * cw * 0.8
        // Foam stands in puffs; dried mud is a flat clod; soft mud sags below its middle.
        const size = (isFoam ? 0.13 + hash(j + 2) * 0.08 : 0.12 + hash(j + 2) * 0.07) * Math.min(1, amount * 1.15) * (1 - 0.3 * thin) * (1 + 0.55 * swell)
        const flat = isFoam ? 0.75 - 0.3 * thin + 0.5 * swell : 0.34
        const sag = isFoam ? 0 : soft * 0.05
        // Shaken mud wobbles: each lump on its own beat, soft mud further than dried.
        const shake = isFoam ? 0 : wobble * Math.sin(seconds * 21 + at.cell * 1.7) * (0.02 + 0.03 * soft)
        this.matrix.makeScale(size * (1 - shake * 3), size * (isFoam ? 0.9 : 0.8 + soft * 0.3) * (1 + shake * 6), size * flat)
        this.matrix.setPosition(at.x + dx + slide, at.y + dy - sag + shake, at.z + size * flat * 0.15 - 0.02)
        this.mesh.setMatrixAt(n, this.matrix)
        const shade = 0.88 + hash(j + 5) * 0.2
        const from = isFoam ? SUDS : DRIED, to = isFoam ? BROWN_SUDS : SOFT, t = isFoam ? brown * 0.85 : soft
        this.colour.setRGB((from[0] + (to[0] - from[0]) * t) * shade, (from[1] + (to[1] - from[1]) * t) * shade, (from[2] + (to[2] - from[2]) * t) * shade)
        this.mesh.setColorAt(n, this.colour)
        n += 1
      }
    }
    this.mesh.count = n
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  dispose(): void {
    for (const thing of this.owned) thing.dispose()
  }
}
