import * as THREE from 'three'
import { FLOOR, Floor, SHEETS } from '../floor'
import type { Landing } from '../fx'

// The floor's marks as a texture the floor shader reads. The marks themselves
// (what lands, how it creeps to the drain and dries) are the pure `Floor`;
// this copies them over whenever they change.

export const MARKS = FLOOR

export class FloorMarks {
  readonly texture: THREE.DataTexture
  readonly floor = new Floor()
  private readonly data: Uint8Array
  private stale = false

  constructor() {
    this.data = new Uint8Array(FLOOR.w * FLOOR.h * 4)
    this.texture = new THREE.DataTexture(this.data, FLOOR.w, FLOOR.h, THREE.RGBAFormat)
    this.texture.magFilter = THREE.LinearFilter
    this.texture.minFilter = THREE.LinearFilter
    this.texture.needsUpdate = true
  }

  land(landing: Landing): void {
    this.floor.land(landing)
    this.stale = true
  }

  /** One frame of attended time: the marks creep and dry, and the texture follows when anything changed. */
  step(dt: number): void {
    if (this.floor.step(dt)) this.stale = true
    if (!this.stale) return
    this.stale = false
    const amount = this.floor.amount
    for (let cell = 0, n = FLOOR.w * FLOOR.h; cell < n; cell++) for (let s = 0; s < SHEETS; s++) this.data[cell * 4 + s] = amount[cell * SHEETS + s] * 255
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}
