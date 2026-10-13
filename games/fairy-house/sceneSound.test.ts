import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, type Voice } from './audio'

// A scene that a touch ends is silent from that frame, and a game that is
// put away is silent at once: what is still ringing is cut, not left to ring
// out. The context here is a stand-in that records what is connected to what.

type FakeNode = { name: string; to: FakeNode | null; cut: boolean; gain: { value: number }; threshold: { value: number }; connect(next: FakeNode): FakeNode; disconnect(): void }

function fakeAudio(): { nodes: FakeNode[]; destination: FakeNode } {
  const nodes: FakeNode[] = []
  const node = (name: string) => (): FakeNode => {
    const self: FakeNode = {
      name, to: null, cut: false, gain: { value: 1 }, threshold: { value: 0 },
      connect: (next) => { self.to = next; return next },
      disconnect: () => { self.cut = true; self.to = null },
    }
    nodes.push(self)
    return self
  }
  const destination = node('out')()
  class FakeContext {
    readonly destination = destination
    readonly currentTime = 0
    state = 'suspended'
    createGain = node('gain')
    createDynamicsCompressor = node('compressor')
    // As in a browser, the context is running only once the promise has settled.
    resume(): Promise<void> { return Promise.resolve().then(() => { this.state = 'running' }) }
    suspend(): Promise<void> { return Promise.resolve() }
    close(): Promise<void> { return Promise.resolve() }
  }
  vi.stubGlobal('window', { AudioContext: FakeContext })
  return { nodes, destination }
}

/** Whether a sound sent into this node still reaches the loudspeaker. */
const heard = (from: FakeNode, destination: FakeNode): boolean => {
  for (let node: FakeNode | null = from, hops = 0; node && hops < 8; node = node.to, hops++) if (node === destination) return true
  return false
}

/** A game whose sound has been unlocked by one touch. */
async function unlocked(): Promise<GameAudio> {
  const audio = new GameAudio()
  audio.touchDown()
  audio.touchUp()
  for (let i = 0; i < 4; i++) await Promise.resolve()
  return audio
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the sound of a scene', () => {
  it('goes through a gain of its own, apart from the sound of a touch', async () => {
    const { destination } = fakeAudio()
    const audio = await unlocked()
    const outs: FakeNode[] = []
    const voice: Voice = (_context, out) => void outs.push(out as unknown as FakeNode)
    audio.play(voice)
    audio.playScene(voice)
    audio.playScene(voice)
    expect(outs[1]).not.toBe(outs[0])
    expect(outs[2]).toBe(outs[1])
    expect(outs.every((out) => heard(out, destination))).toBe(true)
  })

  it('is silent from the touch that ends the scene, while that touch itself is heard', async () => {
    const { destination } = fakeAudio()
    const audio = await unlocked()
    const outs: FakeNode[] = []
    const voice: Voice = (_context, out) => void outs.push(out as unknown as FakeNode)
    audio.playScene(voice)
    audio.endScene()
    audio.play(voice)
    expect(heard(outs[0], destination)).toBe(false)
    expect(outs[0].cut).toBe(true)
    expect(heard(outs[1], destination)).toBe(true)
    // The next scene sounds again, through a new gain.
    audio.playScene(voice)
    expect(outs[2]).not.toBe(outs[0])
    expect(heard(outs[2], destination)).toBe(true)
    // Ending a scene that never sounded breaks nothing.
    audio.endScene()
    audio.endScene()
  })

  it('never waits for an unlock: a scene heard late would belong to nothing on screen', async () => {
    fakeAudio()
    const audio = new GameAudio()
    let played = 0
    audio.playScene(() => played++)
    audio.touchDown()
    audio.touchUp()
    for (let i = 0; i < 4; i++) await Promise.resolve()
    expect(played).toBe(0)
    audio.setActive(false)
    audio.playScene(() => played++)
    expect(played).toBe(0)
  })
})

describe('putting the game away', () => {
  it('cuts everything that is ringing, a touch and a scene alike, and the game sounds again when it is opened', async () => {
    const { destination } = fakeAudio()
    const audio = await unlocked()
    const outs: FakeNode[] = []
    const voice: Voice = (_context, out) => void outs.push(out as unknown as FakeNode)
    audio.play(voice)
    audio.playScene(voice)
    const loud = outs[0].gain.value
    audio.hush()
    expect(heard(outs[0], destination)).toBe(false)
    expect(heard(outs[1], destination)).toBe(false)
    audio.play(voice)
    audio.playScene(voice)
    expect(heard(outs[2], destination)).toBe(true)
    expect(heard(outs[3], destination)).toBe(true)
    expect(outs[2].gain.value).toBe(loud)
    // Put away before any touch, there is nothing to cut and nothing breaks.
    new GameAudio().hush()
  })

  it('drops a sound that was waiting for its unlock', async () => {
    fakeAudio()
    const audio = new GameAudio()
    let played = 0
    audio.touchDown()
    audio.play(() => played++)
    audio.hush()
    audio.touchUp()
    for (let i = 0; i < 4; i++) await Promise.resolve()
    expect(played).toBe(0)
  })
})
