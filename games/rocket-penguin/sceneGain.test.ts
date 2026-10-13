import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { SceneGain } from './sceneGain'

/** A context that only makes gains, each remembering what it was connected to and whether it was taken off. */
function fakeContext() {
  const gains: { to: unknown; off: boolean }[] = []
  const context = {
    createGain: () => {
      const gain = { to: null as unknown, off: false, connect(next: unknown) { gain.to = next }, disconnect() { gain.off = true } }
      gains.push(gain)
      return gain
    },
  }
  return { context: context as unknown as AudioContext, gains }
}

describe('the scene gain', () => {
  it('plays every voice through one gain of its own, on the way to the output', () => {
    const { context, gains } = fakeContext()
    const scene = new SceneGain()
    const out = {} as AudioNode
    const into: unknown[] = []
    const voice: Voice = (_, to) => { into.push(to) }
    scene.through(voice)(context, out, 0)
    scene.through(voice)(context, out, 0)
    expect(gains).toHaveLength(1)
    expect(gains[0].to).toBe(out)
    expect(into).toEqual([gains[0], gains[0]])
  })

  it('cuts off at put-away whatever was sounding, so no tail finishes on return, and gives the next voice a new gain', () => {
    const { context, gains } = fakeContext()
    const scene = new SceneGain()
    const out = {} as AudioNode
    const into: unknown[] = []
    const voice: Voice = (_, to) => { into.push(to) }
    scene.through(voice)(context, out, 0)
    scene.close()
    // The gain the tail was sounding into is off the output for good.
    expect(gains[0].off).toBe(true)
    scene.through(voice)(context, out, 0)
    expect(gains).toHaveLength(2)
    expect(gains[1].off).toBe(false)
    expect(into[1]).toBe(gains[1])
    // Closing twice, or with nothing sounding, does nothing.
    scene.close()
    scene.close()
    expect(gains).toHaveLength(2)
  })

  it('makes a new gain when the audio was built again', () => {
    const first = fakeContext(), second = fakeContext()
    const scene = new SceneGain()
    const voice: Voice = () => {}
    scene.through(voice)(first.context, {} as AudioNode, 0)
    scene.through(voice)(second.context, {} as AudioNode, 0)
    expect(first.gains[0].off).toBe(true)
    expect(second.gains).toHaveLength(1)
  })
})
