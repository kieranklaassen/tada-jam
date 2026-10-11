import { describe, expect, it } from 'vitest'
import { STEP, follow, hubAt, letBe, newClaw, release, stepClaw, type Claw, type ClawEvent } from './claw'
import { HINGE_DROP, gripFor } from './clawBuild'
import { RAIL } from './places'

const RIDE = 12.5
const run = (claw: Claw, seconds: number, events: ClawEvent[] = [], land = 0.4) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepClaw(claw, RIDE, land, events)
  return events
}

describe('the claw', () => {
  it('answers a landing finger at once: the jaws snap open and the trolley sets off', () => {
    const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
    follow(claw, 8, 6, events)
    expect(events).toEqual([{ type: 'chirp', distance: 8 }, { type: 'jaws' }])
    expect(claw.open).toBe(1)
    stepClaw(claw, RIDE, 0.4, events)
    expect(claw.vx).toBeGreaterThan(0)
  })

  it('runs to the finger and settles there', () => {
    const claw = newClaw(0, 6, RIDE)
    follow(claw, 9, 3, [])
    run(claw, 1.2)
    expect(claw.x).toBeCloseTo(9, 1)
    expect(claw.z).toBeCloseTo(3, 1)
  })

  it('swings the cable back against the pull, and the swing dies away', () => {
    const claw = newClaw(0, 6, RIDE)
    follow(claw, 10, 6, [])
    run(claw, 0.08)
    expect(claw.swingX).toBeLessThan(-0.02)
    run(claw, 6)
    expect(Math.abs(claw.swingX)).toBeLessThan(0.01)
  })

  it('swings slower under a load', () => {
    const firstReturn = (load: number) => {
      const claw = newClaw(0, 6, RIDE)
      claw.load = load; claw.swingX = 0.3
      let seconds = 0
      while (claw.swingX > 0 && seconds < 3) { stepClaw(claw, RIDE, 0.4, []); seconds += STEP }
      return seconds
    }
    expect(firstReturn(2)).toBeGreaterThan(firstReturn(0) * 1.15)
  })

  it('drops when the finger lifts, lands on what is under it, shuts and comes up through the ratchet', () => {
    const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
    follow(claw, 0, 6, events)
    release(claw, false)
    expect(claw.phase).toBe('dropping')
    run(claw, 2, events, 2.8)
    const order = events.map((event) => event.type).filter((type) => type !== 'tick' && type !== 'ratchet')
    expect(order).toEqual(['chirp', 'jaws', 'landed', 'closed', 'up'])
    expect(events.filter((event) => event.type === 'ratchet').length).toBeGreaterThanOrEqual(5)
    expect(claw.phase).toBe('ready')
    expect(claw.length).toBeCloseTo(RAIL.top - RIDE - HINGE_DROP, 1)
  })

  it('stops its hinge at the height it is given, so its teeth close beside a thing and never in it', () => {
    for (const stop of [3.3, 5.5, 8]) {
      const claw = newClaw(0, 6, RIDE)
      release(claw, false)
      let lowest = Infinity
      for (let i = 0; i < 400; i++) { stepClaw(claw, RIDE, stop, []); lowest = Math.min(lowest, RAIL.top - claw.length - HINGE_DROP) }
      expect(lowest).toBeCloseTo(stop, 5)
    }
    // A stop above where it rides is no drop at all: the claw closes where it hangs.
    const claw = newClaw(0, 6, RIDE)
    release(claw, false)
    for (let i = 0; i < 400; i++) stepClaw(claw, RIDE, RIDE + 3, [])
    expect(RAIL.top - claw.length - HINGE_DROP).toBeCloseTo(RIDE, 1)
  })

  it('lands straight under the trolley however far the cable has swung', () => {
    const landing = (swing: number) => {
      const claw = newClaw(3, 5, RIDE), events: ClawEvent[] = []
      claw.swingX = swing; claw.swingZ = -swing / 2; claw.swingVX = swing * 9
      release(claw, false)
      run(claw, 1, events)
      const landed = events.find((event) => event.type === 'landed')!
      return landed.type === 'landed' ? { x: landed.x, z: landed.z } : null
    }
    for (const swing of [0, 0.15, -0.4, 0.69]) expect(landing(swing)).toEqual({ x: 3, z: 5 })
    // And the cable is pulled plumb on the way down, so the claw is seen to land on its shadow.
    const claw = newClaw(3, 5, RIDE)
    claw.swingX = 0.6
    release(claw, false)
    while (claw.phase === 'dropping') stepClaw(claw, RIDE, 0.4, [])
    expect(Math.abs(hubAt(claw).x - 3)).toBeLessThan(0.6)
  })

  it('keeps the trolley still while the claw is down', () => {
    const claw = newClaw(0, 6, RIDE)
    release(claw, false)
    run(claw, 0.1)
    follow(claw, 12, 6, [])
    const x = claw.x
    run(claw, 0.2)
    expect(claw.phase).not.toBe('ready')
    expect(Math.abs(claw.x - x)).toBeLessThan(0.05)
  })

  it('on a tap runs there first and drops when it arrives', () => {
    const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
    follow(claw, 10, 4, events)
    release(claw, true)
    run(claw, 0.05, events)
    expect(claw.phase).toBe('ready')
    run(claw, 3, events)
    const landed = events.find((event) => event.type === 'landed')
    expect(landed && landed.type === 'landed' && Math.abs(landed.x - 10)).toBeLessThan(1)
  })

  it('lets go of a load instead of dropping, and says where and how fast it was moving', () => {
    const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
    claw.load = 1; claw.grip = 0.3
    release(claw, false)
    expect(claw.phase).toBe('letting-go')
    run(claw, 0.5, events)
    expect(events.map((event) => event.type)).toEqual(['let-go'])
    expect(claw.load).toBe(0)
  })

  it('still makes a drop the finger has already let go, when the touch is then cut off', () => {
    const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
    follow(claw, 8, 2, events)
    release(claw, true)
    letBe(claw)
    run(claw, 2, events)
    // It ran on to where the finger was and dropped there, and nowhere else.
    expect(events.some((event) => event.type === 'landed' && Math.abs(event.x - 8) < 0.2 && Math.abs(event.z - 2) < 0.2)).toBe(true)
  })

  it('stops at the end of the rail when it is run hard into it', () => {
    const claw = newClaw(RAIL.maxX - 6, 6, RIDE), events: ClawEvent[] = []
    // A target beyond the rail is held at its end; the trolley arrives at speed and bounces.
    claw.targetX = RAIL.maxX + 6
    run(claw, 0.6, events)
    expect(claw.x).toBeLessThanOrEqual(RAIL.maxX)
    expect(claw.x).toBeGreaterThan(RAIL.maxX - 1)
  })

  it('plays the same touches the same way every time', () => {
    const play = () => {
      const claw = newClaw(0, 6, RIDE), events: ClawEvent[] = []
      follow(claw, 7, 2, events); run(claw, 0.3, events)
      follow(claw, -5, 9, events); run(claw, 0.2, events)
      release(claw, false); run(claw, 2, events)
      return { claw, events, hub: hubAt(claw) }
    }
    expect(play()).toEqual(play())
  })

  it('opens its jaws just wide enough to hold a thing between its teeth, wider for a wider thing', () => {
    expect(gripFor(0.4)).toBeGreaterThan(0)
    expect(gripFor(0.8)).toBeGreaterThan(gripFor(0.4))
    expect(gripFor(1.5)).toBeGreaterThan(gripFor(1.0))
    expect(gripFor(1.5)).toBeLessThan(1)
  })
})
