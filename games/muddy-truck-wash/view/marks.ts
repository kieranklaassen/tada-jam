import * as THREE from 'three'
import { KIND, type Landing } from '../fx'

// What has landed on the floor: water, mud and foam, kept in one small
// texture the floor shader reads. A view of the wash, not part of the save:
// on load the floor is clean.

export const MARKS = { x0: -9, x1: 7, z0: -2.7, z1: 3.7, w: 128, h: 52 } as const

export class FloorMarks {
  readonly texture: THREE.DataTexture
  private readonly data: Uint8Array

  constructor() {
    this.data = new Uint8Array(MARKS.w * MARKS.h * 4)
    this.texture = new THREE.DataTexture(this.data, MARKS.w, MARKS.h, THREE.RGBAFormat)
    this.texture.magFilter = THREE.LinearFilter
    this.texture.minFilter = THREE.LinearFilter
    this.texture.needsUpdate = true
  }

  /** Something reached the floor: a drop wets it, a splat or a crumb muddies it, a blob leaves foam. */
  land(landing: Landing): void {
    const channel = landing.kind === KIND.drop ? 0 : landing.kind === KIND.blob ? 2 : 1
    this.stamp(landing.x, landing.z, 0.16 + landing.size * 1.6, channel, landing.kind === KIND.drop ? 70 : 150)
  }

  /** Adds a soft round mark. `channel` 0 is water, 1 mud, 2 foam. */
  stamp(x: number, z: number, radius: number, channel: number, amount: number): void {
    const cw = (MARKS.x1 - MARKS.x0) / MARKS.w, ch = (MARKS.z1 - MARKS.z0) / MARKS.h
    const cx = (x - MARKS.x0) / cw, cz = (z - MARKS.z0) / ch
    const rx = radius / cw, rz = radius / ch
    for (let j = Math.max(0, Math.floor(cz - rz)); j <= Math.min(MARKS.h - 1, Math.ceil(cz + rz)); j++) {
      for (let i = Math.max(0, Math.floor(cx - rx)); i <= Math.min(MARKS.w - 1, Math.ceil(cx + rx)); i++) {
        const d = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cz) / rz)
        if (d >= 1) continue
        const k = (j * MARKS.w + i) * 4 + channel
        this.data[k] = Math.min(255, this.data[k] + amount * (1 - d * d))
      }
    }
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
  }
}
