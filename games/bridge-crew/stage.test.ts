import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { WATER } from './pose'
import { Scene, sceneLength } from './scene'
import { groundAt } from './sheet'
import { isYard, site } from './sites'
import { BODY, CLIMB, DRAUGHT, bankFace, crossingBeats, crossingPlace, drawUp, giveBeats, givePlace, idleShow, openWater, rollPlace, sweep, type Cue } from './stage'
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

  it('nothing passes through anything: through the whole give, on every sheet in every variant, the vehicle is never inside a bank, a rock or the river bed, and floats no deeper than its crates', () => {
    let deepest = 0, bodyDeepest = 0, sunk = 0, jump = 0, hop = 0, turn = 0, corner = -Infinity, darts = 0
    for (const id of LADDER) for (let variant = 0; variant < 3; variant++) {
      const at = site(id, variant)
      // The vehicles that come to this sheet: its own two, and at the free yard all of them.
      for (const vehicle of Object.values(VEHICLES).filter((one) => isYard(at) || one.id === at.job || one.id === at.extra)) {
        const long = Math.max(...vehicle.axles), reach = long + TAIL[vehicle.id]
        // Where it lies in the water it has room to: its nose and its height clear the far bank as it rears up. Where it has not, it goes in on its nose.
        const [, far] = openWater(at), face = bankFace(at, WATER - DRAUGHT), room = far - face.foot, lies = room >= sweep(face, reach) + 0.2
        if (!lies) { darts++; expect(room).toBeGreaterThan(BODY.high + 0.1) }
        // From where a run can fail: just past the near lip, mid-gap, and at the far lip.
        for (const fromX of [at.left[0] + 0.5, (at.left[0] + at.right[0]) / 2, at.right[0] + long]) {
          const show = { ...idleShow(), kind: 'give' as const, vehicle: vehicle.id, from: [fromX, at.left[1]] as const }
          const scene = new Scene(giveBeats(show, () => {}))
          scene.start(0, () => {})
          let before = show.from[0], beforeY = show.from[1], beforeTilt = 0
          for (let t = 0; t <= 6.5; t += 1 / 60) {
            scene.update(t)
            const place = givePlace(show, at, long, TAIL[vehicle.id])
            // It never jumps from one place to another between two frames, and never turns by more than a little.
            jump = Math.max(jump, Math.abs(place.x - before)); before = place.x
            hop = Math.max(hop, Math.abs(place.y - beforeY)); beforeY = place.y
            if (t > 0.2) turn = Math.max(turn, Math.abs(place.tilt - beforeTilt)); beforeTilt = place.tilt
            // Along it, from the front axle back: toward its tail, and away from the ground its wheels are on.
            const fx = Math.cos(place.tilt), fy = Math.sin(place.tilt), nx = -fy, ny = fx
            // Its body, from the front axle back to the end of its tail, a little off the wheels' ground: never inside a bank or a rock.
            for (const share of [0.25, 0.5, 0.75, 1]) {
              const back = reach * share, x = place.x - back * fx + 0.2 * nx, y = place.y - back * fy + 0.2 * ny
              bodyDeepest = Math.max(bodyDeepest, groundAt(at, x) - y)
            }
            // Its nose and its top: never in the far bank, and never in the near one below its lip.
            for (const [along, high] of [[BODY.nose, 0.2], [BODY.nose, BODY.high], [-reach, BODY.high]] as const) {
              const x = place.x + along * fx + high * nx, y = place.y + along * fy + high * ny
              if (y < at.left[1] - 0.05) corner = Math.max(corner, x - at.right[0], at.left[0] - x, Math.min(at.left[1], groundAt(at, x)) - y)
            }
            // Its wheels, front and back: how far under the drawn ground either is, and how far under the water's surface.
            for (const back of [0, long]) {
              const x = place.x - back * fx, y = place.y - back * fy
              deepest = Math.max(deepest, groundAt(at, x) - y)
              sunk = Math.max(sunk, WATER - y)
            }
          }
          const end = givePlace(show, at, long, TAIL[vehicle.id])
          expect(end.x).toBeCloseTo(at.left[0] - 0.8)
          expect(end.y).toBeCloseTo(at.left[1])
          expect(end.tilt).toBe(0)
        }
      }
    }
    // Under a pixel or two at 1180 by 820: it clambers over a rock or a ledge that stands out of the water.
    expect(deepest).toBeLessThan(0.05)
    expect(bodyDeepest).toBeLessThan(0.05)
    expect(corner).toBeLessThan(0.05)
    // In the narrowest gaps it goes in on its nose.
    expect(darts).toBeGreaterThan(0)
    expect(darts).toBeLessThan(6)
    // Afloat, its wheels are under and the water is at the foot of its crates: never deeper.
    expect(sunk).toBeGreaterThanOrEqual(DRAUGHT - 1e-9)
    // (A little more at one end as it rocks.)
    expect(sunk).toBeLessThan(DRAUGHT + 0.2)
    // The fastest it goes is the longest vehicle rolling out from the lip of the gorge to open water.
    expect(jump).toBeLessThan(0.4)
    // Its largest step in height between two frames is the end of its fall into the deep gorge.
    expect(hop).toBeLessThan(0.7)
    // And it tips over the lip in more than a few frames.
    expect(turn).toBeLessThan(0.35)
  })

  it('out of the water it drives: its tail rears up against the bank, its wheels go up the bank\'s face, and it tips over the lip onto the bank facing the gap', () => {
    const at = site('plank-gap', 0), long = 1, tail = TAIL['post-van'], show = { ...idleShow(), kind: 'give' as const, vehicle: 'post-van' as const, from: [12, at.left[1]] as const, fall: 1, paddle: 1 }
    const on = (climb: number) => givePlace({ ...show, climb }, at, long, tail)
    // Afloat at the bank, level, tail to it.
    expect(on(0)).toMatchObject({ y: WATER - DRAUGHT, tilt: 0, afloat: 1 })
    expect(on(0).x - long - tail).toBeCloseTo(at.left[0] + 0.05)
    // The tail rears up: the nose goes down and the front wheels come in to the bank, still on the water.
    const rearing = on(CLIMB.rear / 2)
    expect(rearing.tilt).toBeLessThan(-0.4)
    expect(rearing.y).toBeCloseTo(WATER - DRAUGHT)
    expect(rearing.x).toBeLessThan(on(0).x)
    // On the face: both wheels at the wall, the tail uppermost, and every moment higher than the last.
    let last = -Infinity
    for (let climb = CLIMB.rear; climb < CLIMB.drive; climb += 0.02) {
      const place = on(climb)
      expect(place.tilt).toBeCloseTo(-Math.PI / 2, 1)
      for (const back of [0, long]) expect(place.x - back * Math.cos(place.tilt)).toBeCloseTo(at.left[0], 0.9)
      expect(place.y).toBeGreaterThanOrEqual(last); last = place.y
    }
    expect(last).toBeGreaterThan(at.left[1] - 0.5)
    // It tips over its front wheels at the lip, and is level on the bank.
    const tipping = on((CLIMB.drive + CLIMB.tip) / 2)
    expect([tipping.x, tipping.y]).toEqual([at.left[0], at.left[1]])
    expect(tipping.tilt).toBeLessThan(0); expect(tipping.tilt).toBeGreaterThan(-Math.PI / 2)
    expect(on(CLIMB.tip)).toMatchObject({ x: at.left[0], y: at.left[1], tilt: 0, afloat: 0 })
    expect(on(1).x).toBeCloseTo(at.left[0] - 0.8)
    // Up a wall that steps into the gap it drives on the line of the steps' corners: less steep, and from farther out.
    const gorge = site('arch-gorge', 0), up = givePlace({ ...show, from: [12, gorge.left[1]], climb: (CLIMB.rear + CLIMB.drive) / 2 }, gorge, long, tail)
    expect(up.tilt).toBeGreaterThan(-1.4); expect(up.tilt).toBeLessThan(-0.8)
    expect(up.x).toBeGreaterThan(gorge.left[0] + 0.5)
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
