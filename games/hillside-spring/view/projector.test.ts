import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Projector } from './projector'
import { CREEK_Y, CREEK_Z0, CREEK_Z1, fitCamera, SPRING } from './world'

// The iPad landscape frame the game is framed for.
function projector(width = 1180, height = 820) {
  const camera = new THREE.PerspectiveCamera(27, 1, 1, 100)
  fitCamera(camera, width, height)
  const p = new Projector(camera)
  p.resize(width, height)
  return { p, camera }
}

describe('Projector', () => {
  it('names the scenery around the grid so a touch there still gets an answer', () => {
    const { p } = projector()
    const where = (x: number, y: number) => {
      const t = p.pick({ x, y })
      return t.kind === 'scenery' ? t.where : t.kind
    }
    expect(where(590, 40)).toBe('sky')
    expect(where(90, 110)).toBe('sky')
    expect(where(60, 400)).toBe('meadow')
    expect(where(1120, 400)).toBe('meadow')
    expect(where(90, 790)).toBe('meadow')
    expect(where(590, 690)).toBe('creek')
    expect(where(120, 690)).toBe('creek')
    expect(where(584, 318)).toBe('cell')
    expect(where(590, 160)).toBe('spring')
  })

  it('answers on the water, on the bank, and in the air in front of the crest', () => {
    const { p, camera } = projector()
    const v = new THREE.Vector3()
    p.sceneryPoint('creek', { x: 590, y: 690 }, v)
    expect(v.y).toBeCloseTo(CREEK_Y, 5)
    expect(v.z).toBeGreaterThanOrEqual(CREEK_Z0)
    expect(v.z).toBeLessThanOrEqual(CREEK_Z1)
    for (const at of [{ x: 60, y: 400 }, { x: 1120, y: 500 }, { x: 90, y: 790 }]) {
      p.sceneryPoint('meadow', at, v)
      const onScreen = p.toScreen(v, { x: 0, y: 0 })
      expect(onScreen.x).toBeCloseTo(at.x, 0)
      expect(onScreen.y).toBeCloseTo(at.y, 0)
      expect(camera.position.distanceTo(v)).toBeLessThan(camera.position.distanceTo(p.hill(at, new THREE.Vector3())))
    }
    p.sceneryPoint('sky', { x: 590, y: 40 }, v)
    expect(camera.position.distanceTo(v)).toBeGreaterThan(camera.position.distanceTo(SPRING))
    const back = p.toScreen(v, { x: 0, y: 0 })
    expect(back.x).toBeCloseTo(590, 0)
    expect(back.y).toBeCloseTo(40, 0)
  })
})
