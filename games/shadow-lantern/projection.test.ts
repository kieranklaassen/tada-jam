import { describe, expect, it } from 'vitest'
import { clampToStage, depthForScale, LAMP, onPaper, penumbra, PIN_HEIGHT, projectCardPoint, projectToScreen, SCREEN, screenToCard, shadowScale, STAGE, type CardPose } from './projection'

describe('projection', () => {
  it('a card at the screen casts its own size; toward the lamp its shadow grows', () => {
    expect(shadowScale(0)).toBe(1)
    let previous = 1
    for (let z = STAGE.zNear; z <= STAGE.zFar; z += 4) {
      const k = shadowScale(z)
      expect(k).toBeGreaterThan(previous)
      previous = k
    }
    // The stage spans a little over life size at the front to four times at the back.
    expect(shadowScale(STAGE.zNear)).toBeLessThan(1.2)
    expect(shadowScale(STAGE.zFar)).toBeCloseTo(4)
  })

  it('depthForScale undoes shadowScale', () => {
    for (const k of [1, 1.5, 2, 3.2]) expect(shadowScale(depthForScale(k))).toBeCloseTo(k, 9)
  })

  it('the soft edge is sharp at the screen and widens toward the lamp', () => {
    expect(penumbra(1)).toBe(0)
    expect(penumbra(shadowScale(STAGE.zFar))).toBeGreaterThan(penumbra(shadowScale(STAGE.zNear)))
    expect(penumbra(0.5)).toBe(0)
  })

  it('projects along the straight line from the lamp', () => {
    const out = { x: 0, y: 0 }
    projectToScreen(4, 30, 32, out)
    // The lamp, the point and its shadow are collinear.
    const t = (32 - LAMP.z) / (0 - LAMP.z)
    expect(LAMP.x + (out.x - LAMP.x) * t).toBeCloseTo(4, 9)
    expect(LAMP.y + (out.y - LAMP.y) * t).toBeCloseTo(30, 9)
    // The pin sits at lamp height, so its shadow stays on the horizon line.
    expect(projectToScreen(10, PIN_HEIGHT, 30, out).y).toBeCloseTo(PIN_HEIGHT, 9)
  })

  it('a card point projected to the screen and back lands where it started', () => {
    const pose: CardPose = { x: -7, z: 29, angle: 0.9, yaw: 0, lift: 0 }
    const shadow = { x: 0, y: 0 }
    const back = { x: 0, y: 0 }
    for (const [u, v] of [
      [0, 0],
      [3, 4],
      [-2.5, 6],
    ]) {
      projectCardPoint(pose, u, v, shadow)
      screenToCard(pose, shadow.x, shadow.y, back)
      expect(back.x).toBeCloseTo(u, 9)
      expect(back.y).toBeCloseTo(v, 9)
    }
  })

  it('what lies on the paper shrinks into the frame edge instead of crossing it', () => {
    expect(onPaper(0, 24, 1.5)).toBe(1.5)
    expect(onPaper(SCREEN.right - 0.4, 24, 1.5)).toBeCloseTo(0.4, 9)
    expect(onPaper(-10, SCREEN.top - 1, 3)).toBeCloseTo(1, 9)
    expect(onPaper(-10, SCREEN.bottom + 0.2, 3)).toBeCloseTo(0.2, 9)
    expect(onPaper(SCREEN.left - 2, 24, 1.5)).toBe(0)
    for (let x = SCREEN.left - 5; x <= SCREEN.right + 5; x += 0.7) {
      for (let y = SCREEN.bottom - 5; y <= SCREEN.top + 5; y += 0.7) {
        const r = onPaper(x, y, 2)
        if (r === 0) continue
        expect(x - r).toBeGreaterThanOrEqual(SCREEN.left - 1e-9)
        expect(x + r).toBeLessThanOrEqual(SCREEN.right + 1e-9)
        expect(y - r).toBeGreaterThanOrEqual(SCREEN.bottom - 1e-9)
        expect(y + r).toBeLessThanOrEqual(SCREEN.top + 1e-9)
      }
    }
  })

  it('keeps shapes on the stage', () => {
    const out = { x: 0, z: 0 }
    expect(clampToStage(-99, 99, out)).toEqual({ x: STAGE.xMin, z: STAGE.zFar })
    expect(clampToStage(3, 20, out)).toEqual({ x: 3, z: 20 })
    expect(clampToStage(99, 0, out)).toEqual({ x: STAGE.xMax, z: STAGE.zNear })
  })
})
