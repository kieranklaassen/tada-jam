import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameAudio, SCENE_CUT_S, type Voice } from './audio'

// The notes of a scene go through a gain of the scene's own. The touch that
// ends the scene closes that gain in a few milliseconds, so nothing of the
// scene rings on under the touch's own answer; put-away closes it too.

type Param = { value: number; setAt: number | null; rampedTo: number | null; rampEnd: number | null }
type Node = { name: string; gain: Param; threshold: Param; to: Node | null; disconnected: boolean; connect(next: Node): Node; disconnect(): void }

/** A context that runs from its first resume, with a clock the test moves. */
function fakeContext() {
  const made = { nodes: [] as Node[], now: 0 }
  const param = (): Param & { setValueAtTime(v: number, at: number): void; exponentialRampToValueAtTime(v: number, at: number): void } => {
    const self = {
      value: 1, setAt: null as number | null, rampedTo: null as number | null, rampEnd: null as number | null,
      setValueAtTime: (value: number, at: number) => { self.value = value; self.setAt = at },
      exponentialRampToValueAtTime: (value: number, at: number) => { self.rampedTo = value; self.rampEnd = at },
    }
    return self
  }
  const node = (name: string): Node => {
    const self: Node = { name, gain: param(), threshold: param(), to: null, disconnected: false, connect: (next) => (self.to = next), disconnect: () => void (self.disconnected = true) }
    made.nodes.push(self)
    return self
  }
  class Context {
    readonly destination = node('out')
    state = 'suspended'
    get currentTime() { return made.now }
    createGain = () => node('gain')
    createDynamicsCompressor = () => node('squash')
    resume() { this.state = 'running'; return Promise.resolve() }
    suspend() { return Promise.resolve() }
    close() { return Promise.resolve() }
  }
  vi.stubGlobal('window', { AudioContext: Context })
  return made
}

const settled = async (): Promise<void> => { for (let i = 0; i < 4; i++) await Promise.resolve() }

/** A game whose first touch has landed, so its context runs. */
async function unlocked() {
  const made = fakeContext(), audio = new GameAudio()
  audio.touchDown()
  audio.touchUp()
  await settled()
  const master = made.nodes.find((n) => n.name === 'gain')!
  return { made, audio, master }
}

/** A voice that only remembers what it was given to play into. */
const into = (heard: Node[]): Voice => (_context, out) => void heard.push(out as unknown as Node)

afterEach(() => { vi.unstubAllGlobals() })

describe('the scene\'s own gain', () => {
  it('carries a scene\'s notes, and not the master directly; a touch\'s own answer goes straight to the master', async () => {
    const { audio, master } = await unlocked()
    const scene: Node[] = [], touch: Node[] = []
    audio.playScene(into(scene))
    audio.playScene(into(scene))
    audio.play(into(touch))
    expect(touch[0]).toBe(master)
    expect(scene[0]).not.toBe(master)
    expect(scene[0].to).toBe(master)
    expect(scene[1]).toBe(scene[0])
  })

  it('is closed within a few milliseconds by the touch that ends the scene, and the touch\'s answer is not', async () => {
    const { made, audio, master } = await unlocked()
    const scene: Node[] = []
    audio.playScene(into(scene))
    made.now = 3
    audio.cutScene()
    expect(SCENE_CUT_S).toBeLessThanOrEqual(0.02)
    expect(scene[0].gain.rampedTo).toBeLessThanOrEqual(0.001)
    expect(scene[0].gain.rampEnd).toBeCloseTo(3 + SCENE_CUT_S, 6)
    expect(scene[0].gain.setAt).toBe(3)
    expect(master.gain.rampedTo).toBeNull()
    expect(master.gain.value).toBeCloseTo(0.6, 6)
  })

  it('is a new one for the next scene, so the scene after a cut is heard', async () => {
    const { made, audio, master } = await unlocked()
    const scene: Node[] = []
    audio.playScene(into(scene))
    audio.cutScene()
    made.now = 0.1
    audio.playScene(into(scene))
    expect(scene[1]).not.toBe(scene[0])
    expect(scene[1].gain.rampedTo).toBeNull()
    expect(scene[1].to).toBe(master)
    // The closed one is let go once nothing can still be ringing in it.
    expect(scene[0].disconnected).toBe(false)
    made.now = 5
    audio.playScene(into(scene))
    expect(scene[0].disconnected).toBe(true)
    expect(scene[2]).toBe(scene[1])
  })

  it('does nothing when it is cut with no scene ringing', async () => {
    const { audio, master } = await unlocked()
    audio.cutScene()
    const scene: Node[] = []
    audio.playScene(into(scene))
    expect(scene[0].to).toBe(master)
    expect(master.gain.rampedTo).toBeNull()
    expect(master.disconnected).toBe(false)
  })
})

describe('put-away', () => {
  it('cuts every sound off from the output, a touch\'s own answer included, so no tail is finished on the return', async () => {
    const { made, audio, master } = await unlocked()
    const squash = made.nodes.find((n) => n.name === 'squash')!
    const scene: Node[] = [], touch: Node[] = []
    audio.play(into(touch))
    audio.playScene(into(scene))
    expect(touch[0]).toBe(master)
    audio.setActive(false)
    // What the answer and the scene were playing into no longer reaches the output.
    expect(master.disconnected).toBe(true)
    audio.setActive(true)
    audio.play(into(touch))
    audio.playScene(into(scene))
    // What sounds after the return has a way to the output of its own, as loud as before.
    expect(touch[1]).not.toBe(master)
    expect(touch[1].disconnected).toBe(false)
    expect(touch[1].to).toBe(squash)
    expect(touch[1].gain.value).toBeCloseTo(0.6, 6)
    expect(scene[1]).not.toBe(scene[0])
    expect(scene[1].to).toBe(touch[1])
  })

  it('is silent while it lasts, and a second put-away with nothing ringing breaks nothing', async () => {
    const { audio } = await unlocked()
    const touch: Node[] = []
    audio.setActive(false)
    audio.play(into(touch))
    audio.setActive(false)
    expect(touch).toEqual([])
    audio.setActive(true)
    audio.play(into(touch))
    expect(touch.length).toBe(1)
    expect(touch[0].disconnected).toBe(false)
  })
})

describe('before the first touch', () => {

  it('waits for the unlock like any other sound when the first touch has not landed', () => {
    fakeContext()
    const audio = new GameAudio(), scene: Node[] = []
    audio.playScene(into(scene))
    expect(scene).toEqual([])
    audio.cutScene()
  })
})
