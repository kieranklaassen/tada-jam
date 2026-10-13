import { describe, expect, it } from 'vitest'
import { FOOT_OUTLINE, PART_SHAPES, PILOT_OUTLINE } from './art'
import { TIERS } from './config'
import { BALL_CLEAR, POUCH_CLEAR, clampPouch } from './flight'
import { standIn, type Stamp } from './recording'
import { newToy, play, staged } from './testing'
import type { Frame } from './toy'
import { BALL, BALL_ASIDE, View, wantsNose } from './view'
import { CATAPULT, ICE_Y, PENGUIN, SEALS, SEAL_BALL, SEAL_NOSES, thingAt } from './world'

// The near seal lies next to the catapult with a ball on its nose. These
// tests hold three things about that corner of the page, as it is drawn:
// the ball answers a finger over the whole ball; no pull lays the seated
// penguin into the seal or over its ball; and while an umbrella stands on
// the seal's nose the ball is aside, clear of the umbrella, and was put
// there before the umbrella's point came down.

function drawn() {
  const stand = standIn()
  const view = new View(stand.make)
  view.setTier(TIERS[0])
  view.build(stand.ctx, 1180, 820, 1)
  const art = view.figures!
  const draw = (f: Frame): Stamp[] => {
    stand.reset()
    view.draw(stand.ctx, f, 1 / 60)
    return stand.tally.placed.map((stamp) => ({ ...stamp }))
  }
  return { art, draw }
}

/** An outline as it was stamped, a point every two units along it, in stage units. */
function laid(stamp: Stamp, flat: readonly number[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < flat.length; i += 2) {
    const x0 = flat[i], y0 = flat[i + 1], x1 = flat[(i + 2) % flat.length], y1 = flat[(i + 3) % flat.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2))
    for (let step = 0; step < steps; step++) {
      const x = x0 + ((x1 - x0) * step) / steps, y = y0 + ((y1 - y0) * step) / steps
      points.push({ x: stamp.a * x + stamp.c * y + stamp.e, y: stamp.b * x + stamp.d * y + stamp.f })
    }
  }
  return points
}

describe('the ball on the near seal\'s nose', () => {
  it('answers a finger as the seal over the whole of the ball as it is drawn', () => {
    // The round a finger is asked about is the round that is drawn.
    expect(Math.hypot(SEAL_BALL.x - BALL.x, SEAL_BALL.y - BALL.y)).toBeLessThan(1.5)
    expect(SEAL_BALL.r).toBeGreaterThanOrEqual(BALL.r)
    let asked = 0
    for (let x = BALL.x - BALL.r; x <= BALL.x + BALL.r; x += 1) for (let y = BALL.y - BALL.r; y <= BALL.y + BALL.r; y += 1) {
      if (Math.hypot(x - BALL.x, y - BALL.y) > BALL.r) continue
      asked += 1
      expect(thingAt(x, y), `the ball at ${x}, ${y}`).toBe('nearSeal')
    }
    expect(asked).toBeGreaterThan(600)
    // And a press on it is the seal's bark, in the call that lands.
    const played = newToy()
    played.toy.press(BALL.x - BALL.r + 2, BALL.y - 2)
    expect(played.toy.takeSounds().map((sound) => sound.name)).toContain('bark')
  })
})

describe('the pull beside the near seal', () => {
  const seal = SEALS[0]

  it('stops the pouch where the seal and its ball begin, wherever the finger goes, and still within the bands\' reach and above the ice', () => {
    let stopped = 0
    for (let x = -200; x <= 900; x += 7) for (let y = 0; y <= 1000; y += 7) {
      const at = clampPouch({ x, y })
      expect(Math.hypot(at.x - seal.x, at.y - seal.y), `${x}, ${y}`).toBeGreaterThanOrEqual(POUCH_CLEAR - 0.5)
      expect(Math.hypot(at.x - SEAL_BALL.x, at.y - SEAL_BALL.y), `${x}, ${y}`).toBeGreaterThanOrEqual(BALL_CLEAR - 0.5)
      expect(Math.hypot(at.x - CATAPULT.fork.x, at.y - CATAPULT.fork.y)).toBeLessThanOrEqual(CATAPULT.reach + 0.5)
      expect(at.y).toBeLessThanOrEqual(CATAPULT.floor + 1e-6)
      expect(at.x).toBeGreaterThanOrEqual(CATAPULT.wall - 1e-6)
      // Where it stops is where it stays: the same finger gives the same pouch.
      const again = clampPouch(at)
      expect(Math.hypot(again.x - at.x, again.y - at.y)).toBeLessThan(0.5)
      if (Math.hypot(x - seal.x, y - seal.y) < POUCH_CLEAR) stopped += 1
    }
    expect(stopped).toBeGreaterThan(300)
    expect(POUCH_CLEAR).toBeGreaterThanOrEqual(seal.r + PENGUIN.height / 2)
  })

  it('never draws the seated penguin in the seal or over its ball, and leaves the ball on the nose, however it is pulled', () => {
    const { art, draw } = drawn()
    let pulled = 0
    for (let x = 250; x <= 560; x += 17) for (let y = 430; y <= 760; y += 19) {
      const played = newToy()
      played.toy.press(CATAPULT.rest.x, CATAPULT.rest.y)
      played.toy.drag(x, y)
      play(played, 0.4)
      const frame = played.toy.show()
      expect(frame.pilot.pose).toBe('seat')
      const stamps = draw(frame)
      const ball = stamps.find((stamp) => stamp.image === art.ball.image)!
      // The ball has not been knocked: it rides the nose, and breathes with it.
      expect(Math.hypot(ball.e - BALL.x, ball.f - BALL.y), `pulled to ${x}, ${y}`).toBeLessThan(4)
      const outlines: [unknown, readonly number[]][] = [[art.pilot.image, PILOT_OUTLINE], [art.foot.image, FOOT_OUTLINE]]
      for (const stamp of stamps) for (const [image, flat] of outlines) {
        if (stamp.image !== image) continue
        for (const point of laid(stamp, flat)) {
          expect(Math.hypot(point.x - seal.x, point.y - seal.y), `pulled to ${x}, ${y}: in the seal`).toBeGreaterThan(seal.r - 1)
          expect(Math.hypot(point.x - ball.e, point.y - ball.f), `pulled to ${x}, ${y}: over the ball`).toBeGreaterThan(BALL.r - 1)
        }
      }
      pulled += 1
    }
    expect(pulled).toBeGreaterThan(300)
  })
})

describe('the ball while an umbrella stands on the nose', () => {
  it('is put aside before the umbrella\'s point comes down, stays clear of the umbrella for as long as it stands there, and goes back', () => {
    const { art, draw } = drawn()
    let held = 0
    for (const put of [{ x: SEALS[0].x - 6, y: 330, vy: 120 }, { x: SEALS[0].x + 10, y: 300, vx: -10, vy: 200 }, { x: SEALS[0].x - 40, y: 360, vx: 60, vy: 150 }]) {
      const played = staged(['umbrella'], { ...put, open: true })
      let onNose = 0, before = true, back = false, was: Stamp | null = null
      for (let n = 0; n < 420 && !back; n++) {
        play(played, 1 / 60)
        const frame = played.toy.show()
        const stamps = draw(frame)
        const ball = stamps.find((stamp) => stamp.image === art.ball.image)!
        // The ball is never in two places a frame apart.
        if (was) expect(Math.hypot(ball.e - was.e, ball.f - was.f), `frame ${n}`).toBeLessThan(16)
        was = ball
        if (frame.pilot.nose) {
          onNose += 1
          before = false
          expect(wantsNose(frame)).toBe(true)
          const umbrella = stamps.find((stamp) => stamp.image === art.parts.umbrellaOpen.image)!
          // No part of the umbrella, stick or cloth, is over the ball, from the first frame it stands on the nose.
          let nearest = Infinity
          for (const point of laid(umbrella, PART_SHAPES.umbrellaOpen)) nearest = Math.min(nearest, Math.hypot(point.x - ball.e, point.y - ball.f))
          expect(nearest, `frame ${onNose} on the nose`).toBeGreaterThan(BALL.r + 2)
          // It is held aside, on the seal's belly, not on its face: behind the nose, and above the seal's outline there.
          expect(ball.e).toBeGreaterThan(SEAL_NOSES[0].x + 60)
          expect(Math.hypot(ball.e - BALL_ASIDE.x, ball.f - BALL_ASIDE.y)).toBeLessThan(18)
        } else if (!before) {
          // Tipped on: the ball goes back to the nose.
          if (Math.hypot(ball.e - BALL.x, ball.f - BALL.y) < 6) back = true
        }
      }
      expect(onNose, `from ${put.x}`).toBeGreaterThan(20)
      expect(back, `from ${put.x}`).toBe(true)
      held += 1
    }
    expect(held).toBe(3)
  })

  it('leaves the ball on the nose for an umbrella that is shut, or far off, or not there', () => {
    const { art, draw } = drawn()
    for (const [parts, put] of [[['umbrella'], { x: 700, y: 300, vy: 100, open: true }], [['umbrella'], { x: SEALS[0].x + 200, y: 400, vx: -120, vy: -200 }], [['wings'], { x: SEALS[0].x, y: 400, vy: 100 }]] as const) {
      const played = staged(parts, put)
      for (let n = 0; n < 12; n++) {
        play(played, 1 / 60)
        const frame = played.toy.show()
        const ball = draw(frame).find((stamp) => stamp.image === art.ball.image)!
        if (Math.hypot(frame.pilot.x - BALL.x, frame.pilot.y - BALL.y) > 140) expect(Math.hypot(ball.e - BALL.x, ball.f - BALL.y), `${parts[0]} at ${put.x}`).toBeLessThan(4)
      }
    }
    expect(BALL_ASIDE.y).toBeLessThan(ICE_Y)
  })
})
