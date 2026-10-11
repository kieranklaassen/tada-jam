import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { HUSH_S, Hush, playQueued } from './hush'
import type { Sound } from './voices'

/** A gain as the browser hands one out, which remembers what was done to it. */
function fakeGain() {
  const self = {
    to: null as unknown, disconnected: false, rampedTo: null as { value: number; at: number } | null,
    gain: {
      value: 1,
      cancelScheduledValues: () => {},
      setValueAtTime: () => {},
      linearRampToValueAtTime: (value: number, at: number) => void (self.rampedTo = { value, at }),
    },
    connect: (next: unknown) => void (self.to = next),
    disconnect: () => void (self.disconnected = true),
  }
  return self
}

function fakeContext(now = 2) {
  const gains: ReturnType<typeof fakeGain>[] = []
  const context = { currentTime: now, createGain: () => { const gain = fakeGain(); gains.push(gain); return gain } }
  return { context: context as unknown as AudioContext, gains, master: {} as AudioNode }
}

describe("the gain the wave's sounds go through", () => {
  it('sounds a voice through a gain of its own, joined to the master', () => {
    const { context, gains, master } = fakeContext(), hush = new Hush(), outs: unknown[] = []
    const voice: Voice = (_, out) => void outs.push(out)
    hush.voice(voice)(context, master, 2)
    hush.voice(voice)(context, master, 2.5)
    // One gain for the whole wash.
    expect(gains).toHaveLength(1)
    expect(gains[0].to).toBe(master)
    expect(outs).toEqual([gains[0], gains[0]])
  })

  it('a wash ended by a touch is silent from that frame: the gain falls to nothing at once, and the next wash sounds through a new one', () => {
    const { context, gains, master } = fakeContext(), hush = new Hush(), outs: unknown[] = []
    const voice: Voice = (_, out) => void outs.push(out)
    hush.voice(voice)(context, master, 2)
    hush.now()
    expect(gains[0].rampedTo).toEqual({ value: 0, at: 2 + HUSH_S })
    expect(HUSH_S).toBeLessThanOrEqual(1 / 30)
    // The next wash is heard.
    hush.voice(voice)(context, master, 3)
    expect(gains).toHaveLength(2)
    expect(outs[1]).toBe(gains[1])
    expect(gains[1].rampedTo).toBeNull()
    // The gain that was dropped is let go of at the next hush.
    expect(gains[0].disconnected).toBe(false)
    hush.now()
    expect(gains[0].disconnected).toBe(true)
  })

  it('never sounds a voice of the wash that was still waiting when the wash was ended', () => {
    // A wave touched as the first touch of a visit: its sound waits for the browser to let audio start. The wash is ended before that.
    const { context, gains, master } = fakeContext(), hush = new Hush()
    let sounded = 0
    const waiting = hush.voice(() => void (sounded += 1))
    hush.now()
    waiting(context, master, 2)
    expect(sounded).toBe(0)
    expect(gains).toHaveLength(0)
  })

  it('does nothing, and stops nothing, when no wash has sounded', () => {
    const hush = new Hush()
    expect(() => { hush.now(); hush.dispose() }).not.toThrow()
  })
})

describe('playing what the island queued', () => {
  const stub = () => {
    const order: string[] = []
    const hush = new Hush()
    const real = hush.now.bind(hush)
    hush.now = () => { order.push('hush'); real() }
    const wrap = hush.voice.bind(hush)
    hush.voice = (inner) => { const voice = wrap(inner); (voice as unknown as { wash: boolean }).wash = true; return voice }
    const audio = { play: (voice: Voice) => void order.push((voice as unknown as { wash?: boolean }).wash ? 'wash' : 'rest') }
    // The gain every sound goes through, which here hands each voice on as it is.
    const all = new Hush()
    all.voice = (inner) => inner
    return { order, hush, audio, all }
  }

  it("hushes first, then plays the wave's sounds as one voice and the rest as another, and empties the list", () => {
    const { order, hush, audio, all } = stub()
    const island = { sounds: [{ name: 'tok' }, { name: 'yawn', wash: true }, { name: 'door' }] as Sound[], hushed: true }
    playQueued(audio, hush, island, all)
    // The touch's own answer is played last: of two that wait for audio to start it is the one kept.
    expect(order).toEqual(['hush', 'wash', 'rest'])
    expect(island.sounds).toHaveLength(0)
    expect(island.hushed).toBe(false)
  })

  it('plays one voice when there is only one kind, and nothing when there is nothing', () => {
    const { order, hush, audio, all } = stub()
    playQueued(audio, hush, { sounds: [{ name: 'tok' }], hushed: false }, all)
    playQueued(audio, hush, { sounds: [], hushed: false }, all)
    playQueued(audio, hush, { sounds: [{ name: 'roll', wash: true }], hushed: false }, all)
    expect(order).toEqual(['rest', 'wash'])
  })
})
