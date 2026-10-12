import { describe, expect, it } from 'vitest'
import { mat, putOn, run, tap } from './drive'
import { SceneGain } from './sceneSound'
import { notesOf } from './sounds'

// A scene ended by a touch is silent from that frame, and a put-away closes all of a scene's sound. Two
// halves: the world drops what the scene had asked for and counts the end (`hushes`), and the scene's own gain
// is shut and taken out of the graph, so a note that had already started does not ring on.

/** A stand-in for the audio graph that keeps what was connected and what was shut. */
function graph() {
  const gains: { gain: { value: number }; connected: unknown[]; disconnected: boolean; connect(to: unknown): unknown; disconnect(): void }[] = []
  const param = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {}, cancelScheduledValues: () => {}, value: 0 }
  const node = () => ({ connect: (to: unknown) => to, disconnect: () => {}, start: () => {}, stop: () => {}, frequency: { ...param }, Q: { ...param }, gain: { ...param }, type: 'sine', buffer: null as unknown, loop: false, onended: null as unknown })
  const context = {
    currentTime: 3, sampleRate: 48000, destination: {},
    createGain: () => {
      const gain = { gain: { ...param, value: 1 }, connected: [] as unknown[], disconnected: false, connect(to: unknown) { this.connected.push(to); return to }, disconnect() { this.disconnected = true } }
      gains.push(gain)
      return gain
    },
    createOscillator: node, createBiquadFilter: node, createBufferSource: node,
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  return { context: context as unknown as AudioContext, gains }
}

describe('the scene\'s own gain', () => {
  it('plays a scene\'s notes through one gain of its own, and shuts and unhooks it on a hush', () => {
    const { context, gains } = graph(), out = {} as AudioNode, scene = new SceneGain()
    scene.voice(notesOf([{ name: 'whistle', piece: 'doll-small', gain: 1, scene: true }]))(context, out, 3)
    // The first gain made is the scene's, hooked to the output; the notes hang under it.
    expect(gains[0].connected).toEqual([out])
    expect(gains[0].gain.value).toBe(1)
    scene.voice(notesOf([{ name: 'hoot', gain: 1, scene: true }]))(context, out, 3.2)
    const own = gains.filter((gain) => gain.connected.includes(out))
    expect(own.length).toBe(2)
    scene.hush()
    for (const gain of own) expect([gain.gain.value, gain.disconnected]).toEqual([0, true])
    // A second hush has nothing left to shut, and a new scene sounds again.
    scene.hush()
    scene.voice(notesOf([{ name: 'bump', gain: 1, scene: true }]))(context, out, 4)
    expect(gains.filter((gain) => gain.connected.includes(out) && !gain.disconnected).length).toBe(1)
  })

  it('marks every sound a scene asks for, and nothing an answer to a touch asks for', () => {
    const world = mat({ 'arch-large': { x: 560, y: 590 } })
    putOn(world, 'doll-small', 'arch-large')
    // The press itself is the child's touch.
    expect(world.takeSounds().every((sound) => !sound.scene)).toBe(true)
    const heard = run(world, 6)
    expect(heard.length).toBeGreaterThan(5)
    expect(heard.every((sound) => sound.scene)).toBe(true)
  })

  it('drops what the scene had asked for and counts the end, on a touch and on a put-away alike', () => {
    for (const end of ['touch', 'rest'] as const) {
      const world = mat({ 'arch-large': { x: 560, y: 590 } })
      putOn(world, 'doll-small', 'arch-large')
      world.takeSounds()
      // Step to the frame of the whistle and leave it untaken: the scene's sound is waiting to be played.
      while (!world.takeSounds().some((sound) => sound.name === 'chirp')) world.step(1 / 60)
      for (let i = 0; i < 53; i++) world.step(1 / 60)
      const hushes = world.hushes
      if (end === 'touch') tap(world, 40, 60)
      else world.settle()
      expect(world.hushes, end).toBe(hushes + 1)
      expect(world.takeSounds().filter((sound) => sound.scene), end).toEqual([])
      expect(run(world, 8).filter((sound) => sound.scene), end).toEqual([])
    }
  })
})
