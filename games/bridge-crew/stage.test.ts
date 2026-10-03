import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { WATER } from './pose'
import { Scene, sceneLength } from './scene'
import { groundAt } from './sheet'
import { site } from './sites'
import { crossingBeats, crossingPlace, drawUp, giveBeats, givePlace, idleShow, openWater, rollPlace, type Cue } from './stage'
import { TAIL, VEHICLES } from './vehicles'

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
    let deepest = 0, bodyDeepest = 0, jump = 0, hop = 0
    for (const id of LADDER) {
      const at = site(id, 0)
      for (const vehicle of Object.values(VEHICLES)) {
        const long = Math.max(...vehicle.axles)
        // From where a run can fail: just past the near lip, mid-gap, and at the far lip.
        for (const fromX of [at.left[0] + 0.5, (at.left[0] + at.right[0]) / 2, at.right[0] + long]) {
          const show = { ...idleShow(), kind: 'give' as const, vehicle: vehicle.id, from: [fromX, at.left[1]] as const }
          const scene = new Scene(giveBeats(show, () => {}))
          scene.start(0, () => {})
          let before = show.from[0], beforeY = show.from[1]
          for (let t = 0; t <= 6; t += 1 / 60) {
            scene.update(t)
            const place = givePlace(show, at, long, TAIL[vehicle.id])
            // It never jumps from one place to another between two frames.
            jump = Math.max(jump, Math.abs(place.x - before)); before = place.x
            hop = Math.max(hop, Math.abs(place.y - beforeY)); beforeY = place.y
            // Its body, from the front axle back to the end of its tail, a little above the wheels' ground: never inside a bank or a rock.
            for (const share of [0.25, 0.5, 0.75, 1]) {
              const back = (long + TAIL[vehicle.id]) * share
              bodyDeepest = Math.max(bodyDeepest, groundAt(at, place.x - back * Math.cos(place.tilt)) - (place.y + 0.2 - back * Math.sin(place.tilt)))
            }
            // Its wheels, front and back: how far under the drawn ground either is. Afloat, the water's surface is its ground.
            for (const x of [place.x, place.x - long]) {
              const ground = Math.max(groundAt(at, x), x > at.left[0] && x < at.right[0] && groundAt(at, x) < WATER ? WATER : -Infinity)
              deepest = Math.max(deepest, ground - place.y)
            }
          }
          const end = givePlace(show, at, long, TAIL[vehicle.id])
          expect(end.x).toBeCloseTo(at.left[0] - 0.8)
          expect(end.y).toBeCloseTo(at.left[1])
        }
      }
    }
    // Under a pixel or two at 1180 by 820: it floats on the water and clambers over a rock or a ledge that stands out of it.
    expect(deepest).toBeLessThan(0.05)
    expect(bodyDeepest).toBeLessThan(0.05)
    // The fastest it goes is the longest vehicle rolling out from the lip of the gorge to open water.
    expect(jump).toBeLessThan(0.4)
    // Its largest step in height between two frames is the end of its fall into the deep gorge; onto or off a rock
    // that stands out of the water it is half a cell.
    expect(hop).toBeLessThan(0.7)
  })

  it('it comes ashore where the water is open: under a wall that slopes into the gap, out beyond the wall\'s foot', () => {
    expect(openWater(site('plank-gap', 0))).toEqual([10, 14])
    const gorge = site('arch-gorge', 0), [near, far] = openWater(gorge)
    expect(near).toBeGreaterThan(gorge.left[0] + 1)
    expect(far).toBeLessThan(gorge.right[0] - 1)
    for (let x = near + 0.1; x < far; x += 0.25) expect(groundAt(gorge, x)).toBeLessThan(WATER)
    // A rock in the middle of the gap does not end the water.
    const rock = site('rock-prop', 0)
    expect(openWater(rock)).toEqual([rock.left[0], rock.right[0]])
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
