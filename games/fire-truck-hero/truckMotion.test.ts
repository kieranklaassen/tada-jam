import { describe, expect, it } from 'vitest'
import { overshootOf } from './springs'
import { BLINK_S, BODY, IDLE_BOB, LIGHT, MOST_ROCK, NOZZLE_FEEL, TruckMotion, turnTo } from './truckMotion'

const FRAME = 1 / 60

function play(truck: TruckMotion, seconds: number, each?: (truck: TruckMotion) => void): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    truck.step(FRAME)
    each?.(truck)
  }
}

describe('the truck at a gulp', () => {
  it('rocks back at once, swings forward past level, and settles', () => {
    const truck = new TruckMotion()
    truck.gulp(true)
    truck.step(FRAME)
    expect(truck.pose.rock).toBeGreaterThan(0.02)
    let mostBack = 0, mostForward = 0
    play(truck, 2, (t) => {
      mostBack = Math.max(mostBack, t.pose.rock)
      mostForward = Math.min(mostForward, t.pose.rock)
    })
    expect(mostBack).toBeGreaterThan(0.1)
    expect(mostForward).toBeLessThan(-0.02)
    play(truck, 2)
    expect(Math.abs(truck.pose.rock)).toBeLessThan(0.003)
  })

  it('is knocked less by the gulps of a stream than by the first of a touch', () => {
    const first = new TruckMotion(), later = new TruckMotion()
    first.gulp(true)
    later.gulp(false)
    first.step(FRAME)
    later.step(FRAME)
    expect(later.pose.rock).toBeLessThan(first.pose.rock * 0.6)
    expect(later.pose.rock).toBeGreaterThan(0)
  })

  it('never tips over, however fast the taps come', () => {
    const truck = new TruckMotion()
    for (let tap = 0; tap < 40; tap++) {
      truck.gulp(true)
      play(truck, 0.05, (t) => expect(Math.abs(t.pose.rock)).toBeLessThanOrEqual(MOST_ROCK))
    }
  })

  it('squashes as it rocks', () => {
    const truck = new TruckMotion()
    truck.gulp(true)
    let least = 1
    play(truck, 0.3, (t) => { least = Math.min(least, t.pose.squash) })
    expect(least).toBeLessThan(0.985)
    expect(least).toBeGreaterThanOrEqual(0.9)
  })
})

describe('the nozzle', () => {
  it('swings to where the water is sent within a fifth of a second, and overshoots', () => {
    const truck = new TruckMotion()
    truck.aim(1, 0.5)
    truck.step(FRAME)
    expect(truck.pose.turn).toBeGreaterThan(0.02)
    let most = 0
    play(truck, 0.2, (t) => { most = Math.max(most, t.pose.turn) })
    expect(most).toBeGreaterThan(1)
    play(truck, 1)
    expect(truck.pose.turn).toBeCloseTo(1, 2)
    expect(truck.pose.tilt).toBeCloseTo(0.5, 2)
    expect(overshootOf(NOZZLE_FEEL)).toBeGreaterThan(0.05)
  })

  it('goes the short way round', () => {
    expect(turnTo(3, -3)).toBeCloseTo(3 + (2 * Math.PI - 6), 6)
    expect(turnTo(0, 1)).toBe(1)
    expect(turnTo(0, 2 * Math.PI + 0.5)).toBeCloseTo(0.5, 6)
    const truck = new TruckMotion()
    truck.aim(3, 0)
    play(truck, 1)
    truck.aim(-3, 0)
    play(truck, 1, (t) => expect(t.pose.turn).toBeGreaterThan(2.9))
  })
})

describe('a honk', () => {
  it('hops the truck off the ground, and it comes down once with a landing', () => {
    const truck = new TruckMotion()
    truck.honk()
    let highest = 0, landings = 0
    play(truck, 2, (t) => {
      highest = Math.max(highest, t.pose.lift)
      if (t.landed) landings++
      expect(t.pose.lift).toBeGreaterThanOrEqual(0)
    })
    expect(highest).toBeGreaterThan(0.15)
    expect(highest).toBeLessThan(0.6)
    expect(landings).toBe(1)
  })

  it('turns the roof light once round and stops without swinging back', () => {
    const truck = new TruckMotion()
    truck.honk()
    let most = 0
    play(truck, 4, (t) => { most = Math.max(most, t.pose.light) })
    expect(truck.pose.light).toBeCloseTo(2 * Math.PI, 1)
    expect(most).toBeLessThan(2 * Math.PI + 0.05)
    expect(overshootOf(LIGHT)).toBe(0)
  })

  it('makes it blink', () => {
    const truck = new TruckMotion()
    play(truck, 0.5)
    truck.honk()
    let least = 1
    play(truck, BLINK_S, (t) => { least = Math.min(least, t.pose.eyesOpen) })
    expect(least).toBeLessThan(0.4)
  })
})

describe('the truck at rest', () => {
  it('is alive: it bobs like a motor ticking over, by very little', () => {
    const truck = new TruckMotion()
    let least = 1, most = 0
    play(truck, 1, (t) => {
      least = Math.min(least, t.pose.lift)
      most = Math.max(most, t.pose.lift)
    })
    expect(most - least).toBeGreaterThan(IDLE_BOB * 0.8)
    expect(most).toBeLessThanOrEqual(IDLE_BOB + 1e-9)
  })

  it('blinks now and then, at uneven gaps, and its eyes are open in between', () => {
    const truck = new TruckMotion()
    const blinks: number[] = []
    let shut = false, time = 0
    play(truck, 20, (t) => {
      time += FRAME
      const closed = t.pose.eyesOpen < 0.5
      if (closed && !shut) blinks.push(time)
      shut = closed
    })
    expect(blinks.length).toBeGreaterThanOrEqual(4)
    expect(blinks.length).toBeLessThanOrEqual(8)
    const gaps = blinks.slice(1).map((at, i) => Math.round((at - blinks[i]) * 10))
    expect(new Set(gaps).size).toBeGreaterThan(1)
  })

  it('looks where its nozzle points', () => {
    const truck = new TruckMotion()
    truck.aim(1.2, 0.6)
    play(truck, 1)
    expect(truck.pose.lookSide).toBeGreaterThan(0.5)
    expect(truck.pose.lookUp).toBeGreaterThan(0.3)
    truck.aim(-1.2, -0.3)
    play(truck, 1)
    expect(truck.pose.lookSide).toBeLessThan(-0.5)
    expect(truck.pose.lookUp).toBeLessThan(0)
  })

  it('plays no time on a frame of no length', () => {
    const truck = new TruckMotion()
    truck.gulp(true)
    truck.step(0)
    expect(truck.pose.rock).toBe(0)
  })

  it('has a body that swings past level and a light that does not', () => {
    expect(overshootOf(BODY)).toBeGreaterThan(0.2)
  })
})
