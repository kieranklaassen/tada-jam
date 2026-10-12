import { describe, expect, it } from 'vitest'
import { CASES, perform } from './cases'
import { Desk } from './desk'
import { FRAME, first, middle, run } from './testing'

// The sound desk against a stubbed audio context: every node it makes is kept, with what it was connected to,
// the last value its gain was set to and whether it has been disconnected.

type Param = { value: number; setValueAtTime(value: number): void; exponentialRampToValueAtTime(): void }
type FakeNode = { gain: Param; frequency: Param; Q: Param; type: string; buffer: unknown; loop: boolean; onended: unknown; to: unknown; disconnected: boolean; started: boolean; connect(next: unknown): unknown; disconnect(): void; start(): void; stop(): void }

function fakeContext() {
  const nodes: FakeNode[] = []
  const param = (): Param => { const self: Param = { value: 1, setValueAtTime: (value) => void (self.value = value), exponentialRampToValueAtTime: () => {} }; return self }
  const node = (): FakeNode => {
    const self: FakeNode = { gain: param(), frequency: param(), Q: param(), type: '', buffer: null, loop: false, onended: null, to: null, disconnected: false, started: false,
      connect: (next) => { self.to = next; return next }, disconnect: () => void (self.disconnected = true), start: () => void (self.started = true), stop: () => {} }
    nodes.push(self)
    return self
  }
  const out = node()
  const context = { currentTime: 0, sampleRate: 8000, createGain: node, createOscillator: node, createBufferSource: node, createBiquadFilter: node, createBuffer: (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) }) }
  /** The gains that feed `to`: the desk's own, not the envelopes of the notes. */
  const feeding = (to: unknown): FakeNode[] => nodes.filter((entry) => entry.to === to && !entry.started && entry !== out)
  return { context: context as unknown as AudioContext, out: out as unknown as AudioNode, nodes, feeding, raw: out }
}

/** A game a moment into the cat's scene, with the scene's sounds so far played on the desk. */
function midScene() {
  const audio = fakeContext(), desk = new Desk(), play = first()
  play.down(1, ...middle(play, 'cat'))
  desk.take(play.toy)?.(audio.context, audio.out, 0)
  play.up(1, ...middle(play, 'cat'))
  for (let t = 0; t < 0.5; t += FRAME) { play.step(FRAME); desk.take(play.toy)?.(audio.context, audio.out, 0) }
  const all = audio.feeding(audio.raw)
  const scenes = audio.nodes.filter((entry) => all.includes(entry.to as FakeNode) && entry.gain.value === 1 && !entry.started)
  return { audio, desk, play, all, scenes }
}

describe('the sound desk', () => {
  it('sends everything through one gain, and the sounds of a scene through a second one inside it', () => {
    const { play, all, scenes } = midScene()
    expect(play.toy.sceneRunning).toBe(true)
    expect(all).toHaveLength(1)
    expect(scenes).toHaveLength(1)
  })

  it('is silent from the frame a touch ends the scene: its gain is shut and gone, and the touch itself is heard', () => {
    const { audio, desk, play, all, scenes } = midScene()
    // A touch on the rug, anywhere: the scene is over.
    play.down(2, 500, 700)
    expect(play.toy.hushed).toBe(true)
    const before = audio.nodes.length
    const voice = desk.take(play.toy)
    expect(scenes[0].gain.value).toBe(0)
    expect(scenes[0].disconnected).toBe(true)
    expect(all[0].disconnected).toBe(false)
    expect(play.toy.hushed).toBe(false)
    // The touch's own sound is not a sound of the scene: it goes to the outer gain.
    voice!(audio.context, audio.out, 0)
    const fresh = audio.nodes.slice(before)
    expect(fresh.length).toBeGreaterThan(0)
    expect(fresh.some((entry) => entry.to === scenes[0])).toBe(false)
    // And nothing of the scene is queued afterwards.
    play.up(2, 500, 700)
    expect(run(play, 6).every((cue) => !cue.scene)).toBe(true)
  })

  it('gives the next scene a new gain', () => {
    const { audio, desk, play, all, scenes } = midScene()
    play.down(2, ...middle(play, 'baby'))
    desk.take(play.toy)!(audio.context, audio.out, 0)
    const now = audio.nodes.filter((entry) => entry.to === all[0] && entry.gain.value === 1 && !entry.started && !entry.disconnected)
    expect(now).toHaveLength(1)
    expect(now[0]).not.toBe(scenes[0])
  })

  it('closes every sound when the game is put away, whatever was playing', () => {
    for (const entry of CASES.slice(0, 12)) {
      const audio = fakeContext(), desk = new Desk()
      const { play } = perform(entry, 30, (game) => { desk.take(game.toy)?.(audio.context, audio.out, 0) })
      const gains = audio.feeding(audio.raw)
      play.park()
      expect(desk.take(play.toy, true), entry.name).toBeNull()
      for (const gain of gains) { expect(gain.gain.value, entry.name).toBe(0); expect(gain.disconnected, entry.name).toBe(true) }
      // What sounds after that starts on a gain of its own.
      play.down(1, 500, 700)
      desk.take(play.toy)!(audio.context, audio.out, 0)
      expect(audio.feeding(audio.raw).filter((gain) => !gain.disconnected), entry.name).toHaveLength(1)
    }
  })
})
