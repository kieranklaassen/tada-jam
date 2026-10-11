import { describe, expect, it } from 'vitest'
import { COLS, ROWS } from './ground'
import { EDGE, GULP_EVERY_S, Hose, SAME_WATERING_S, intoYard, type Gulp } from './hose'
import { LONGEST_FLIGHT_S } from './jet'
import { NOZZLE } from './layout'

const FRAME = 1 / 60

/** Plays `seconds` of frames and returns every gulp that left and landed. */
function play(hose: Hose, from: number, seconds: number, each?: (now: number) => void) {
  const launched: Gulp[] = [], landed: Gulp[] = []
  let rests = 0, now = from
  const frames = Math.round(seconds / FRAME)
  for (let frame = 0; frame < frames; frame++) {
    now = from + (frame + 1) * FRAME
    each?.(now)
    const step = hose.step(now, FRAME)
    launched.push(...step.launched)
    landed.push(...step.landed)
    if (step.rested) rests++
  }
  return { launched, landed, rests, now }
}

describe('a tap', () => {
  it('is one gulp, which leaves the nozzle in the step the finger lands', () => {
    const hose = new Hose()
    const gulp = hose.press({ x: 9, z: 4 }, 10)
    expect(gulp.launchedAt).toBe(10)
    expect(gulp.first).toBe(true)
    expect(gulp.arc.from).toEqual({ x: NOZZLE.x, y: NOZZLE.y, z: NOZZLE.z })
    hose.lift()
    const { launched, landed } = play(hose, 10, 1)
    expect(launched).toHaveLength(0)
    expect(landed).toEqual([gulp])
  })

  it('lands where the finger was, within a third of a second or so', () => {
    const hose = new Hose()
    const gulp = hose.press({ x: 12.5, z: 2.5 }, 0)
    hose.lift()
    expect(gulp.arc.to).toEqual({ x: 12.5, z: 2.5 })
    expect(gulp.landsAt).toBeLessThanOrEqual(LONGEST_FLIGHT_S)
    expect(play(hose, 0, gulp.landsAt + FRAME).landed).toHaveLength(1)
  })

  it('gives a gulp for every tap, however fast they come', () => {
    const hose = new Hose()
    let landed = 0
    for (let tap = 0; tap < 5; tap++) {
      hose.press({ x: 6 + tap, z: 5 }, tap * 0.1)
      hose.lift()
      landed += play(hose, tap * 0.1, 0.1).landed.length
    }
    landed += play(hose, 0.5, 1).landed.length
    expect(landed).toBe(5)
  })
})

describe('a held finger', () => {
  it('is a stream of one gulp about every third of a second', () => {
    const hose = new Hose()
    hose.press({ x: 9, z: 4 }, 0)
    const { launched } = play(hose, 0, 1)
    // The first left with the press; three more follow in the second.
    expect(launched).toHaveLength(3)
    expect(launched.every((gulp) => !gulp.first)).toBe(true)
    expect(launched[1].launchedAt - launched[0].launchedAt).toBeCloseTo(GULP_EVERY_S, 6)
  })

  it('never gives more than five gulps in a second and a half', () => {
    const hose = new Hose()
    hose.press({ x: 9, z: 4 }, 0)
    expect(1 + play(hose, 0, 1.5).launched.length).toBeLessThanOrEqual(5)
  })

  it('follows the finger, with the landing point trailing a little', () => {
    const hose = new Hose()
    hose.press({ x: 5, z: 5 }, 0)
    hose.move({ x: 11, z: 5 })
    hose.step(FRAME, FRAME)
    expect(hose.aim.x).toBeGreaterThan(5)
    expect(hose.aim.x).toBeLessThan(11)
    expect(hose.aimSpeed).toBeGreaterThan(1)
    play(hose, FRAME, 1)
    expect(hose.aim.x).toBeCloseTo(11, 2)
    expect(hose.aimSpeed).toBeLessThan(0.1)
  })

  it('does not lose a gulp to a slow frame', () => {
    const hose = new Hose()
    hose.press({ x: 9, z: 4 }, 0)
    const step = hose.step(1, 0.1)
    expect(step.launched).toHaveLength(3)
  })

  it('ignores a move when no finger is down', () => {
    const hose = new Hose()
    hose.move({ x: 1, z: 1 })
    expect(hose.target).toEqual({ x: COLS / 2, z: ROWS / 2 })
  })
})

describe('a lifted finger', () => {
  it('loses nothing: water in the air still lands', () => {
    const hose = new Hose()
    hose.press({ x: 14, z: 2 }, 0)
    const held = play(hose, 0, 0.7)
    hose.lift()
    const after = play(hose, held.now, 1)
    expect(after.launched).toHaveLength(0)
    expect(held.landed.length + after.landed.length).toBe(1 + held.launched.length)
  })

  it('ends the watering once the stream has stayed stopped, and says so once', () => {
    const hose = new Hose()
    hose.press({ x: 9, z: 4 }, 0)
    hose.lift()
    const { rests } = play(hose, 0, SAME_WATERING_S + 1)
    expect(rests).toBe(1)
  })

  it('keeps the same watering when the stream is taken up again soon', () => {
    const hose = new Hose()
    hose.press({ x: 9, z: 4 }, 0)
    hose.lift()
    const gap = play(hose, 0, SAME_WATERING_S - 0.2)
    hose.press({ x: 9, z: 4 }, gap.now)
    hose.lift()
    const rest = play(hose, gap.now, SAME_WATERING_S + 1)
    expect(gap.rests).toBe(0)
    expect(rest.rests).toBe(1)
  })

  it('lands what is in the air at once when the game goes to rest', () => {
    const hose = new Hose()
    hose.press({ x: 14, z: 2 }, 0)
    const dropped = hose.clear()
    expect(dropped).toHaveLength(1)
    expect(hose.holding).toBe(false)
    expect(hose.flying).toHaveLength(0)
    expect(play(hose, 0, 1).landed).toHaveLength(0)
  })
})

describe('where water can land', () => {
  it('is inside the yard, at the nearest point to the finger', () => {
    expect(intoYard({ x: -40, z: 3 })).toEqual({ x: EDGE, z: 3 })
    expect(intoYard({ x: 400, z: 300 })).toEqual({ x: COLS - EDGE, z: ROWS - EDGE })
    expect(intoYard({ x: 7, z: 4 })).toEqual({ x: 7, z: 4 })
    expect(intoYard({ x: Number.NaN, z: Number.NaN })).toEqual({ x: COLS / 2, z: ROWS / 2 })
  })

  it('answers a touch anywhere on the screen, so no touch is lost', () => {
    const hose = new Hose()
    const gulp = hose.press({ x: 99, z: -99 }, 0)
    expect(gulp.arc.to).toEqual({ x: COLS - EDGE, z: EDGE })
  })

  it('lands gulps in the order they arrive, not the order they left', () => {
    const hose = new Hose()
    const far = hose.press({ x: 15.5, z: 0.5 }, 0)
    hose.lift()
    const near = hose.press({ x: 4, z: 5.4 }, 0.05)
    hose.lift()
    expect(near.landsAt).toBeLessThan(far.landsAt)
    expect(play(hose, 0.05, 1).landed).toEqual([near, far])
  })
})
