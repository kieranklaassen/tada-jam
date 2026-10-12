import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { EYE, HORIZON_Z, PITCH, cameraFor, groundAt, horizonY, project } from './camera'
import { base } from './field'

const SURFACES = [[1180, 820], [1024, 768], [820, 1180], [1600, 700]] as const

describe('the camera', () => {
  it.each(SURFACES)('puts a world point where a three.js camera set from the same numbers puts it, at %i by %i', (width, height) => {
    const camera = cameraFor(width, height)
    const three = new THREE.PerspectiveCamera(camera.fovY, width / height, 1, 90)
    three.position.set(EYE.x, EYE.y, EYE.z)
    three.rotation.set(-PITCH, 0, 0)
    three.updateMatrixWorld()
    three.updateProjectionMatrix()
    for (const [x, y, z] of [[0, 0, 0], [-5, 0.4, 6], [7, 1.2, 1.5], [-9, 0, -4], [3, 2.3, HORIZON_Z]] as const) {
      const ndc = new THREE.Vector3(x, y, z).project(three)
      const at = project(camera, x, y, z)
      expect(at.x).toBeCloseTo((ndc.x * 0.5 + 0.5) * width, 3)
      expect(at.y).toBeCloseTo((0.5 - ndc.y * 0.5) * height, 3)
    }
  })

  it.each(SURFACES)('brings a touch back to the point of the beach it was drawn at, at %i by %i', (width, height) => {
    const camera = cameraFor(width, height)
    const ground = (_x: number, z: number) => base(z)
    for (const [x, z] of [[0, 2], [-4, 5.5], [6, 1], [1, -3]] as const) {
      const at = project(camera, x, base(z), z)
      const back = groundAt(camera, at.x, at.y, ground)!
      expect(back.x).toBeCloseTo(x, 2)
      expect(back.z).toBeCloseTo(z, 2)
    }
  })

  it('sees the beach as wide on a narrower surface as on the one it was composed for', () => {
    const wide = cameraFor(1180, 820), narrow = cameraFor(1024, 768), tall = cameraFor(820, 1180)
    expect(narrow.tanX).toBeCloseTo(wide.tanX)
    expect(tall.tanX).toBeCloseTo(wide.tanX)
    expect(cameraFor(1600, 700).tanX).toBeGreaterThan(wide.tanX)
  })

  it('puts the horizon about a fifth of the way down, and finds no ground where it looks up', () => {
    const camera = cameraFor(1180, 820)
    expect(horizonY(camera)).toBeGreaterThan(100)
    expect(horizonY(camera)).toBeLessThan(820 * 0.3)
    // Above the horizon's row the ground a ray would meet lies beyond where the sea ends.
    expect(groundAt(camera, 590, horizonY(camera) - 20, () => 0)!.z).toBeLessThan(HORIZON_Z)
    // A tall surface sees above the level: there a ray meets no ground at all.
    expect(groundAt(cameraFor(820, 1180), 410, 5, () => 0)).toBeNull()
  })
})
