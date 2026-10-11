import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { fireflyAt, STEPS, type Vec3 } from './choir'
import { FIREFLY_HIT_PX, FROG_HIT_PX } from './controller'
import { COLUMNS, PAD_TOP, PADS, ROWS, rowZ } from './layout'
import { FOV, frameCamera } from './view/pondView'

// The shell draws one round home control over every game: 48 px across, at
// the top centre, 10 px from the top edge. A tap on it goes home, so nothing
// a child aims at may pass under it or close enough for a finger to slip.
// The firefly is the one touchable thing that leaves the pond: it flies home
// across the top of the frame on every loop.

const CONTROL = { top: 10, size: 48 }
/** How far a small finger lands from where it aimed. */
const SLIP_PX = 16
const SURFACES: readonly (readonly [number, number])[] = [
  [1180, 820],
  [1366, 1024],
  [1133, 744],
  [1024, 768],
  [900, 820],
  [700, 820],
]

function framed(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.5, 80)
  frameCamera(camera)
  const v = new THREE.Vector3()
  /** CSS pixels from the centre of the home control to a point of the pond. */
  return (x: number, y: number, z: number): number => {
    v.set(x, y, z).project(camera)
    return Math.hypot((v.x * 0.5 + 0.5) * width - width / 2, (-v.y * 0.5 + 0.5) * height - (CONTROL.top + CONTROL.size / 2))
  }
}

describe('the home control at the top centre', () => {
  it.each(SURFACES)('is never where the firefly flies, at %i by %i', (width, height) => {
    const fromControl = framed(width, height)
    const near = rowZ(0)
    const far = rowZ(ROWS - 1)
    const at: Vec3 = { x: 0, y: 0, z: 0 }
    const occupied = new Uint8Array(COLUMNS)
    let closest = Infinity
    // The flight home leaves from the last column's depth and comes in at the first one's: every pairing of near and far.
    for (const exit of [near, far]) {
      for (const entry of [near, far]) {
        const targets = Float32Array.from({ length: COLUMNS }, (_, c) => entry + ((exit - entry) * c) / (COLUMNS - 1))
        for (let phase = 0; phase < STEPS; phase += 0.01) {
          fireflyAt(phase, targets, occupied, at)
          closest = Math.min(closest, fromControl(at.x, at.y, at.z))
        }
      }
    }
    expect(closest).toBeGreaterThan(CONTROL.size / 2 + FIREFLY_HIT_PX + SLIP_PX)
  })

  it.each(SURFACES)('is clear of a frog on every pad, at %i by %i', (width, height) => {
    const fromControl = framed(width, height)
    for (const pad of PADS) expect(fromControl(pad.x, PAD_TOP + 0.65, pad.z), `pad ${pad.index}`).toBeGreaterThan(CONTROL.size / 2 + FROG_HIT_PX + SLIP_PX)
  })
})
