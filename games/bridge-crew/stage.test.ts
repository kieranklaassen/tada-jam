import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { WATER } from './pose'
import { Scene, sceneLength } from './scene'
import { groundAt } from './sheet'
import { site } from './sites'
import { crossingBeats, crossingPlace, drawUp, giveBeats, givePlace, idleShow, rollPlace, type Cue } from './stage'
import { VEHICLES } from './vehicles'

describe('the scenes as beats', () => {
  it('the give lasts 4 to 6 seconds and the crossing about 8, and each cue is given once', () => {
    for (const [make, low, high, cues] of [[giveBeats, 4, 6, ['splash', 'restore']], [crossingBeats, 6, 10, ['ring', 'react', 'arrive']]] as const) {
      const show = idleShow(), heard: Cue[] = []
      const beats = make(show, (what) => heard.push(what))
      expect(sceneLength(beats)).toBeGreaterThanOrEqual(low)
      expect(sceneLength(beats)).toBeLessThanOrEqual(high)
      const scene = new Scene(beats)
      scene.start(0, () => {})
      for (let t = 0; t <= 12; t += 1 / 60) scene.update(t)
      expect(scene.running).toBe(false)
      expect(heard.sort()).toEqual([...cues].sort())
    }
  })

  it('a touch ends a scene with every beat where it was taking it', () => {
    const show = idleShow()
    const scene = new Scene(giveBeats(show, () => {}))
    scene.start(0, () => {})
    scene.update(0.4)
    expect(show.fall).toBeGreaterThan(0)
    expect(show.restore).toBe(0)
    scene.finish()
    expect([show.snap, show.fall, show.paddle, show.climb, show.shake, show.restore]).toEqual([1, 1, 1, 1, 1, 1])
    const crossing = idleShow(), other = new Scene(crossingBeats(crossing, () => {}))
    other.start(0, () => {}); other.update(1); other.finish()
    expect([crossing.spring, crossing.react, crossing.park, crossing.fade, crossing.arrive]).toEqual([1, 1, 1, 1, 1])
  })

  it('nothing passes through anything: through the whole give, on every sheet, the vehicle is never inside a bank or under the river bed', () => {
    let deepest = 0
    for (const id of LADDER) {
      const at = site(id, 0)
      for (const vehicle of Object.values(VEHICLES)) {
        const long = Math.max(...vehicle.axles)
        // From where a run can fail: just past the near lip, mid-gap, and at the far lip.
        for (const fromX of [at.left[0] + 0.5, (at.left[0] + at.right[0]) / 2, at.right[0] + long]) {
          const show = { ...idleShow(), kind: 'give' as const, vehicle: vehicle.id, from: [fromX, at.left[1]] as const }
          const scene = new Scene(giveBeats(show, () => {}))
          scene.start(0, () => {})
          for (let t = 0; t <= 6; t += 1 / 60) {
            scene.update(t)
            const place = givePlace(show, at, long)
            // Its wheels, front and back: how far under the drawn ground either is. Afloat, the water's surface is its ground.
            for (const x of [place.x, place.x - long]) {
              const ground = Math.max(groundAt(at, x), x > at.left[0] && x < at.right[0] && groundAt(at, x) < WATER ? WATER : -Infinity)
              deepest = Math.max(deepest, ground - place.y)
            }
          }
          const end = givePlace(show, at, long)
          expect(end.x).toBeCloseTo(at.left[0] - 0.8)
          expect(end.y).toBeCloseTo(at.left[1])
        }
      }
    }
    // Under a pixel or two at 1180 by 820: it floats on the water and clambers over a rock or a ledge that stands out of it.
    expect(deepest).toBeLessThan(0.05)
  })

  it('after a crossing the vehicle goes on to where it stays, the roll slides in from off the sheet, and the other vehicle draws up from off it', () => {
    const at = site('rock-prop', 0), show = { ...idleShow(), kind: 'crossing' as const, from: [at.right[0] + 1, at.right[1]] as const }
    expect(crossingPlace(show, at, 20).x).toBe(at.right[0] + 1)
    show.park = 1
    expect(crossingPlace(show, at, 20)).toMatchObject({ x: 20, y: at.right[1] })
    expect(crossingPlace({ ...show, homeward: true }, at, 7).y).toBe(at.left[1])
    expect(rollPlace(0, 24)).toBeGreaterThan(25.2)
    expect(rollPlace(1, 24)).toBeCloseTo(23.9)
    expect(drawUp(0, at, 0)).toBeLessThan(-3)
    expect(drawUp(1, at, 0)).toBeCloseTo(at.left[0] - 0.8)
  })
})
