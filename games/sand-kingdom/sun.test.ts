import { describe, expect, it } from 'vitest'
import { JOURNEY_SECONDS, Sun, type SunEvent } from './sun'

const DT = 1 / 60

/** Plays the sun for some seconds and hands back what happened, in order. */
function play(sun: Sun, seconds: number): SunEvent[] {
  const events: SunEvent[] = []
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const event = sun.step(DT)
    if (event) events.push(event)
  }
  return events
}

describe('the sun', () => {
  it('goes the whole way down on a tap, in about four seconds, with a note on the press and one on the lift', () => {
    const sun = new Sun('up')
    expect(sun.press()).toBe('first')
    expect(sun.release()).toBe('second')
    expect(play(sun, JOURNEY_SECONDS - 0.2)).toEqual([])
    // Nothing has changed until it arrives: it is still saved where it set out from.
    expect(sun.home).toBe('up')
    expect(sun.travelling).toBe(true)
    expect(play(sun, 0.4)).toEqual(['arrived-down'])
    expect(sun.home).toBe('down')
    expect(sun.t).toBe(1)
    expect(sun.mode).toBe('rest')
  })

  it('goes the whole way up again on a tap', () => {
    const sun = new Sun('down')
    sun.press()
    sun.release()
    expect(play(sun, JOURNEY_SECONDS + 0.2)).toEqual(['arrived-up'])
    expect(sun.home).toBe('up')
    expect(sun.t).toBe(0)
  })

  it('moves with the finger, and let go past half way it finishes the journey', () => {
    const sun = new Sun('up')
    sun.press()
    sun.drag(0.3)
    expect(sun.t).toBe(0.3)
    sun.drag(0.62)
    expect(sun.release()).toBe('second')
    expect(play(sun, JOURNEY_SECONDS)).toEqual(['arrived-down'])
  })

  it('goes back with a hum when it is let go short of half way, and nothing arrives', () => {
    const sun = new Sun('up')
    sun.press()
    sun.drag(0.4)
    expect(sun.release()).toBe('hum')
    expect(play(sun, JOURNEY_SECONDS)).toEqual(['back'])
    expect(sun.home).toBe('up')
    expect(sun.t).toBe(0)
    // From evening the same: a little way up and let go, it sinks back.
    const evening = new Sun('down')
    evening.press()
    evening.drag(0.7)
    expect(evening.release()).toBe('hum')
    expect(play(evening, JOURNEY_SECONDS)).toEqual(['back'])
    expect(evening.home).toBe('down')
  })

  it('turns round on a tap while it travels by itself, and goes back to where it set out from', () => {
    const sun = new Sun('down')
    sun.press()
    sun.release()
    play(sun, 1.5)
    expect(sun.t).toBeLessThan(0.7)
    // The finger lands on it mid-journey: it turns round at once, with the hum.
    expect(sun.press()).toBe('hum')
    expect(sun.mode).toBe('back')
    expect(sun.release()).toBe(null)
    expect(play(sun, JOURNEY_SECONDS)).toEqual(['back'])
    expect(sun.home).toBe('down')
    expect(sun.t).toBe(1)
  })

  it('turns round a second time on a second tap, and then arrives', () => {
    const sun = new Sun('up')
    sun.press()
    sun.release()
    play(sun, 1)
    sun.press()
    play(sun, 0.3)
    expect(sun.press()).toBe('second')
    expect(play(sun, JOURNEY_SECONDS)).toEqual(['arrived-down'])
  })

  it('goes back without a sound when the touch is taken away, and a frame of no time moves nothing', () => {
    const sun = new Sun('up')
    sun.press()
    sun.drag(0.8)
    sun.cancel()
    expect(sun.mode).toBe('back')
    const before = sun.t
    expect(sun.step(0)).toBe(null)
    expect(sun.t).toBe(before)
    expect(play(sun, JOURNEY_SECONDS)).toEqual(['back'])
    expect(sun.home).toBe('up')
    // A press taken away before any move leaves it at rest.
    const still = new Sun('up')
    still.press()
    still.cancel()
    expect(still.mode).toBe('rest')
  })

  it('swells under a finger and settles', () => {
    const sun = new Sun('up')
    sun.press()
    expect(sun.pulse).toBe(1)
    sun.cancel()
    play(sun, 0.5)
    expect(sun.pulse).toBe(0)
  })
})
