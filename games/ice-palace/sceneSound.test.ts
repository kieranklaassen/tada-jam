import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, type Voice } from './audio'

// What a scene sounds can be cut by itself, in the call that asks for it, and
// putting the game away cuts everything: a voice that was already sounding is
// no longer connected to anything that reaches the speaker.

type FakeNode = { name: string; to: FakeNode | null; gain: { value: number }; threshold: { value: number }; connect: (next: FakeNode) => void; disconnect: () => void }

function fakeAudio(answers: ('refuse' | 'run')[] = []) {
  const made = { gains: [] as FakeNode[], destination: null as FakeNode | null }
  const node = (name: string): FakeNode => {
    const self: FakeNode = { name, to: null, gain: { value: 1 }, threshold: { value: 0 }, connect: (next) => void (self.to = next), disconnect: () => void (self.to = null) }
    return self
  }
  class FakeContext {
    readonly destination = node('speaker')
    readonly currentTime = 0
    state = 'suspended'
    constructor() { made.destination = this.destination }
    createGain = (): FakeNode => {
      const gain = node('gain')
      made.gains.push(gain)
      return gain
    }
    createDynamicsCompressor = (): FakeNode => node('compressor')
    resume() {
      if (answers.shift() === 'refuse') return Promise.reject(new Error('not yet'))
      this.state = 'running'
      return Promise.resolve()
    }
    suspend() { return Promise.resolve() }
    close() { return Promise.resolve() }
  }
  vi.stubGlobal('window', { AudioContext: FakeContext })
  return made
}
const answered = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve()
}
/** Whether what goes into a node still comes out of the speaker. */
const heard = (from: AudioNode | null, speaker: FakeNode | null): boolean => {
  let at = from as unknown as FakeNode | null
  for (let i = 0; at && i < 8; i++) {
    if (at === speaker) return true
    at = at.to
  }
  return false
}
/** A voice that only remembers where it was sent. */
const into = (outs: AudioNode[]): Voice => (_context, out) => void outs.push(out)

async function started() {
  const made = fakeAudio()
  const audio = new GameAudio()
  audio.touchDown()
  audio.touchUp()
  await answered()
  return { made, audio }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a scene’s sound', () => {
  it('goes through a gain of its own, and a hush cuts it in that call while the touch’s own sound plays on', async () => {
    const { made, audio } = await started()
    const scene: AudioNode[] = [], own: AudioNode[] = []
    audio.play(into(scene), true)
    audio.play(into(own))
    expect(scene[0]).not.toBe(own[0])
    expect(heard(scene[0], made.destination)).toBe(true)
    audio.hush()
    expect(heard(scene[0], made.destination)).toBe(false)
    expect(heard(own[0], made.destination)).toBe(true)
    // The next scene is heard again.
    audio.play(into(scene), true)
    expect(heard(scene[1], made.destination)).toBe(true)
    expect(scene[1]).not.toBe(scene[0])
  })

  it('that was waiting for the unlock is dropped by a hush, and a touch’s own sound that was waiting is kept', async () => {
    const made = fakeAudio(['refuse', 'run'])
    const audio = new GameAudio()
    const scene: AudioNode[] = [], own: AudioNode[] = []
    audio.touchDown()
    audio.play(into(scene), true)
    audio.hush()
    audio.touchUp()
    await answered()
    expect(scene).toEqual([])
    void made
    fakeAudio(['refuse', 'run'])
    const next = new GameAudio()
    next.touchDown()
    next.play(into(own))
    next.hush()
    next.touchUp()
    await answered()
    expect(own).toHaveLength(1)
  })
})

describe('put away', () => {
  it('closes every sound in that call: what was sounding reaches the speaker no more, and nothing new plays until the game is back', async () => {
    const { made, audio } = await started()
    const scene: AudioNode[] = [], own: AudioNode[] = []
    audio.play(into(scene), true)
    audio.play(into(own))
    audio.setActive(false)
    expect(heard(scene[0], made.destination)).toBe(false)
    expect(heard(own[0], made.destination)).toBe(false)
    audio.play(into(own))
    audio.play(into(scene), true)
    expect(own).toHaveLength(1)
    expect(scene).toHaveLength(1)
    audio.setActive(true)
    audio.touchDown()
    await answered()
    audio.play(into(own))
    expect(own).toHaveLength(2)
    expect(heard(own[1], made.destination)).toBe(true)
  })
})
