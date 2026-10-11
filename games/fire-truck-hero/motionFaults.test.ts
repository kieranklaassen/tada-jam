import { describe, expect, it } from 'vitest'
import { DUCK_TAPS_EVERY_S, SnailMotion, TEMPO } from './animalMotion'
import { restChannels } from './scenes'
import { BoatMotion, FireMotion, HALF_TURN, WheelMotion } from './thingMotion'
import { THINGS } from './things'
import { gulpOn } from './world'
import { YardMotion } from './yardMotion'
import { layOut } from './yards'

// Faults a first round of motion tests found, each with the test that would
// have caught it. They are kept together so the reason for each rule is plain.

const FRAME = 1 / 60

describe('faults found by the first motion tests', () => {
  it('gives no two animals a tempo within three tenths of each other', () => {
    const tempos = Object.values(TEMPO)
    for (let a = 0; a < tempos.length; a++) {
      for (let b = a + 1; b < tempos.length; b++) expect(Math.abs(tempos[a] - tempos[b])).toBeGreaterThan(Math.min(tempos[a], tempos[b]) * 0.3)
    }
    // The duck's tapping is not the cat's breathing either.
    expect(Math.abs(DUCK_TAPS_EVERY_S - 1 / TEMPO.cat)).toBeGreaterThan(0.3)
  })

  it('gives the boat\'s fill a motion of its own: it does not rock or slide, it sits down low', () => {
    const away = { x: 1, z: 0 }
    const gulp = new BoatMotion(), fill = new BoatMotion()
    gulp.settle(0)
    fill.settle(THINGS.boat.fill - 1)
    gulp.answer('gulp', 1, false, away)
    fill.answer('fill', THINGS.boat.fill, false, away)
    let rockOfGulp = 0, rockOfFill = 0, dipOfFill = 0, dipOfGulp = 0
    for (let frame = 0; frame < 40; frame++) {
      const g = gulp.step(FRAME, false), f = fill.step(FRAME, false)
      rockOfGulp = Math.max(rockOfGulp, Math.abs(g.rock))
      rockOfFill = Math.max(rockOfFill, Math.abs(f.rock))
      dipOfFill = Math.min(dipOfFill, f.bob)
      dipOfGulp = Math.min(dipOfGulp, g.bob)
    }
    expect(rockOfGulp).toBeGreaterThan(0.1)
    expect(rockOfFill).toBeLessThan(0.01)
    expect(dipOfFill).toBeLessThan(-0.2)
    expect(dipOfGulp).toBe(0)
    expect(fill.pose.pushX).toBe(0)
    expect(gulp.pose.pushX).toBeGreaterThan(0.05)
  })

  it('turns the wheel half a turn for one flick of a sweep, and less for one gulp', () => {
    const turned = (answer: (wheel: WheelMotion) => void) => {
      const wheel = new WheelMotion()
      wheel.settle()
      answer(wheel)
      let total = 0, last = 0
      for (let frame = 0; frame < 60 * 12; frame++) {
        const angle = wheel.step(FRAME).angle
        total += (angle - last + Math.PI * 2) % (Math.PI * 2)
        last = angle
      }
      return total
    }
    const sweep = turned((wheel) => wheel.answer('sweep', 0))
    const gulp = turned((wheel) => wheel.answer('gulp', 1))
    expect(sweep).toBeGreaterThan(HALF_TURN * 0.9)
    expect(sweep).toBeLessThan(HALF_TURN * 1.1)
    expect(gulp).toBeLessThan(sweep)
    expect(gulp).toBeGreaterThan(Math.PI / 2)
    // Two flicks in a row are still a flick, not a spin.
    expect(turned((wheel) => { wheel.answer('sweep', 0); wheel.answer('sweep', 0) })).toBeLessThan(HALF_TURN * 1.1)
  })

  it('floats the wet logs off gently: they never jump', () => {
    const fire = new FireMotion()
    fire.settle(THINGS.fire.fill)
    for (let frame = 0; frame < 60 * 7; frame++) fire.step(FRAME)
    fire.answer('too-much', THINGS.fire.fill + 1)
    let before = { ...fire.pose }
    let most = 0
    for (let frame = 0; frame < 60 * 8; frame++) {
      const pose = fire.step(FRAME)
      most = Math.max(most, Math.hypot(pose.logsX - before.logsX, pose.logsZ - before.logsZ, pose.logsY - before.logsY))
      before = { ...pose }
    }
    expect(most).toBeLessThan(0.006)
    expect(Math.hypot(fire.pose.logsX, fire.pose.logsZ)).toBeGreaterThan(0.02)
  })

  it('finds the animals as they were left: nothing about them eases in on load', () => {
    // The snail on a patch that holds two gulps: its feelers are out in the first frame.
    let patchYard = layOut('one-thing', 3)
    for (let gulp = 0; gulp < 2; gulp++) patchYard = gulpOn(patchYard, 0).yard
    const patch = new YardMotion(patchYard)
    patch.settle(patchYard, restChannels())
    patch.step(FRAME, patchYard, restChannels())
    const first = patch.snail.pose.feelers
    for (let frame = 0; frame < 300; frame++) patch.step(FRAME, patchYard, restChannels())
    expect(first).toBeGreaterThan(0.5)
    expect(Math.abs(patch.snail.pose.feelers - first)).toBeLessThan(0.02)
    expect(SnailMotion.feelersFor(2, 0)).toBeCloseTo(first, 1)

    // The cat beside a lit fire: her eyes are shut in the first frame.
    const fireYard = layOut('two-things', 2)
    const warm = new YardMotion(fireYard)
    warm.settle(fireYard, restChannels())
    warm.step(FRAME, fireYard, restChannels())
    expect(warm.cat.pose.eyesShut).toBeGreaterThan(0.95)

    // The cat afloat in the boat: bolt upright in the first frame.
    let poolYard = layOut('afloat', 2)
    for (let gulp = 0; gulp < 3; gulp++) poolYard = gulpOn(poolYard, 0).yard
    const afloat = new YardMotion(poolYard)
    afloat.settle(poolYard, restChannels())
    afloat.step(FRAME, poolYard, restChannels())
    expect(afloat.cat.pose.upright).toBeGreaterThan(0.95)
  })

  it('puts the cat out once when the fire goes out, and not again for more water on the wet logs', () => {
    let yard = layOut('two-things', 2)
    const motion = new YardMotion(yard)
    motion.settle(yard, restChannels())
    const fire = yard.things.findIndex((thing) => thing.kind === 'fire')
    const tailUps: number[] = []
    let frames = 0
    const play = (seconds: number) => {
      for (let frame = 0; frame < seconds * 60; frame++) {
        motion.step(FRAME, yard, restChannels())
        frames++
        if (motion.cat.pose.tailUp > 0.9 && (tailUps.length === 0 || frames - tailUps[tailUps.length - 1] > 30)) tailUps.push(frames)
        else if (motion.cat.pose.tailUp > 0.9) tailUps[tailUps.length - 1] = frames
      }
    }
    for (let gulp = 0; gulp < 5; gulp++) {
      const step = gulpOn(yard, fire)
      yard = step.yard
      for (const event of step.events) if (event.type === 'result') motion.result(event.thing, event.action, yard)
      play(4)
    }
    expect(tailUps).toHaveLength(1)
  })

  it('settles a yard with its latch down and its bell still, however it was before', () => {
    const yard = layOut('one-thing', 0)
    const motion = new YardMotion(yard)
    motion.rang(2)
    for (let frame = 0; frame < 6; frame++) motion.step(FRAME, yard, restChannels())
    motion.settle(yard, restChannels())
    motion.step(FRAME, yard, restChannels())
    expect(motion.bell.latch).toBe(0)
    expect(Math.abs(motion.bell.swing)).toBeLessThan(1e-9)
  })
})
