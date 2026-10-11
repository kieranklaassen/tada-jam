import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { DROP_SECONDS, SceneSound } from './sceneSound'

/** A context that keeps what was asked of each gain it made, and nothing else. */
function fakeContext() {
  const gains: { value: number; cancelled: number | null; ramp: { to: number; at: number } | null; to: unknown }[] = []
  const context = {
    currentTime: 0,
    createGain() {
      const made = { value: 0, cancelled: null as number | null, ramp: null as { to: number; at: number } | null, to: null as unknown }
      gains.push(made)
      return {
        gain: {
          get value() { return made.value },
          setValueAtTime: (value: number) => void (made.value = value),
          cancelScheduledValues: (at: number) => void (made.cancelled = at),
          linearRampToValueAtTime: (to: number, at: number) => void (made.ramp = { to, at }),
        },
        connect: (next: unknown) => void (made.to = next),
      }
    },
  }
  return { context: context as unknown as AudioContext, clock: context, gains }
}

describe('the sounds of a scene', () => {
  it('play through a gain of their own, which a touch closes within a frame', () => {
    const { context, clock, gains } = fakeContext()
    const sound = new SceneSound()
    const out = { name: 'out' } as unknown as AudioNode
    const heard: unknown[] = []
    const bell: Voice = (_context, into) => void heard.push(into)
    sound.through(bell)(context, out, 0)
    sound.through(bell)(context, out, 0.4)
    // Each voice was given its own gain, not the way out, and that gain leads there.
    expect(gains).toHaveLength(2)
    expect(heard).not.toContain(out)
    expect(gains.every((gain) => gain.to === out && gain.value === 1 && gain.ramp === null)).toBe(true)
    expect(sound.open).toBe(2)
    clock.currentTime = 0.5
    sound.drop()
    for (const gain of gains) {
      expect(gain.cancelled).toBe(0.5)
      expect(gain.ramp).toEqual({ to: 0, at: 0.5 + DROP_SECONDS })
    }
    expect(DROP_SECONDS).toBeLessThanOrEqual(1 / 60)
    expect(sound.open).toBe(0)
  })

  it('are heard again in the next scene, and a touch with no scene sounding does nothing', () => {
    const { context, clock, gains } = fakeContext()
    const sound = new SceneSound()
    const out = {} as AudioNode
    sound.drop()
    sound.through(() => {})(context, out, 0)
    sound.drop()
    clock.currentTime = 2
    sound.through(() => {})(context, out, 2)
    expect(gains[1].value).toBe(1)
    expect(gains[1].ramp).toBeNull()
    // The closed one is not closed twice.
    clock.currentTime = 3
    sound.drop()
    expect(gains[0].ramp).toEqual({ to: 0, at: DROP_SECONDS })
    expect(gains[1].ramp).toEqual({ to: 0, at: 3 + DROP_SECONDS })
  })

  it('forgets a gain whose voice is long over', () => {
    const { context, gains } = fakeContext()
    const sound = new SceneSound()
    sound.through(() => {})(context, {} as AudioNode, 0)
    sound.through(() => {})(context, {} as AudioNode, 10)
    expect(sound.open).toBe(1)
    sound.drop()
    expect(gains[0].ramp).toBeNull()
  })
})
