import { describe, expect, it } from 'vitest'
import { Mix } from './mix'
import { inScene, pat, stick, type Sound } from './voices'

// A scene ended by a touch is silent from that frame, and put-away closes all sound.

type Node = { name: string; to: Node[]; cut: boolean; connect(to: Node): Node; disconnect(): void }

function fakeContext() {
  const made: Node[] = []
  const node = (name: string): Node => {
    const self: Node = { name, to: [], cut: false, connect(to) { self.to.push(to); return to }, disconnect() { self.to = []; self.cut = true } }
    made.push(self)
    return self
  }
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} })
  const source = (name: string) => Object.assign(node(name), { frequency: param(), Q: param(), gain: param(), type: '', buffer: null, start() {}, stop() {} })
  const context = {
    currentTime: 1,
    sampleRate: 44100,
    createGain: () => source('gain'),
    createOscillator: () => source('osc'),
    createBiquadFilter: () => source('filter'),
    createBufferSource: () => source('noise'),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  const out = node('out')
  /** Whether anything made so far still reaches the output. */
  const reaches = (from: Node, seen = new Set<Node>()): boolean => from === out || (!seen.has(from) && (seen.add(from), from.to.some((next) => reaches(next, seen))))
  const sounding = (): number => made.filter((made) => (made.name === 'osc' || made.name === 'noise') && reaches(made)).length
  return { context: context as unknown as AudioContext, out: out as unknown as AudioNode, sounding }
}

const play = (mix: Mix, fake: ReturnType<typeof fakeContext>, sounds: Sound[]): void => mix.voice(sounds)(fake.context, fake.out, 1)

describe('the scene bus', () => {
  it('a scene sound and a room sound both reach the output', () => {
    const fake = fakeContext(), mix = new Mix()
    play(mix, fake, [inScene(pat), stick])
    expect(fake.sounding()).toBeGreaterThanOrEqual(2)
  })

  it('a scene ended by a touch is silent from that frame, and what answers the touch is still heard', () => {
    const fake = fakeContext(), mix = new Mix()
    play(mix, fake, [inScene(pat)])
    const before = fake.sounding()
    expect(before).toBeGreaterThan(0)
    mix.cutScene()
    expect(fake.sounding()).toBe(0)
    play(mix, fake, [stick])
    expect(fake.sounding()).toBeGreaterThan(0)
  })

  it('the next scene sounds again after a cut', () => {
    const fake = fakeContext(), mix = new Mix()
    play(mix, fake, [inScene(pat)])
    mix.cutScene()
    play(mix, fake, [inScene(pat)])
    expect(fake.sounding()).toBeGreaterThan(0)
  })

  it('put-away closes all sound: nothing that was playing reaches the output any more', () => {
    const fake = fakeContext(), mix = new Mix()
    play(mix, fake, [inScene(pat), stick, pat])
    mix.closeAll()
    expect(fake.sounding()).toBe(0)
  })

  it('no sound has a delay hidden in its voice: every note starts when its sound is queued', () => {
    for (const sound of [pat, stick, inScene(pat)]) for (const note of sound.notes) expect(note.delay ?? 0).toBe(0)
  })
})
