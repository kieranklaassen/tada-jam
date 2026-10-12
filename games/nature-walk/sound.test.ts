import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { DOOR, SPOTS, STONE_SPOT } from './layout'
import { Finger } from './script'
import { Bus } from './sound'
import type { SoundEvent } from './toy'

// A scene that a touch ends is silent from that frame, and a put-away closes
// all sound. Held twice: at the speaker, on a stand-in for the browser's
// audio that keeps what was connected to what; and through the game's own
// path, where the cut reaches the speaker in the call of the touch itself,
// ahead of anything the touch sets off.

type Param = { value: number; set: number[] }
type Node = { kind: string; gain?: Param; to: Node[]; cutAt: number | null; started: number }

/** A stand-in for an audio context: nodes that only remember their wiring. */
function fakeContext() {
  const made: Node[] = []
  const param = (): Param & Record<string, unknown> => {
    const p = { value: 1, set: [] as number[] } as Param & Record<string, unknown>
    p.setValueAtTime = (value: number) => { p.value = value; p.set.push(value) }
    p.exponentialRampToValueAtTime = () => {}
    p.cancelScheduledValues = () => {}
    return p
  }
  const node = (kind: string): Node & Record<string, unknown> => {
    const n = { kind, to: [] as Node[], cutAt: null as number | null, started: 0 } as Node & Record<string, unknown>
    n.connect = (other: Node) => { n.to.push(other); return other }
    n.disconnect = () => { n.to = []; n.cutAt = context.currentTime }
    n.start = () => { n.started += 1 }
    n.stop = () => {}
    made.push(n)
    return n
  }
  const context = {
    currentTime: 0, sampleRate: 8000, destination: node('destination'),
    createGain: () => { const n = node('gain'); n.gain = param(); return n },
    createOscillator: () => { const n = node('osc'); n.frequency = param(); return n },
    createBufferSource: () => node('source'),
    createBiquadFilter: () => { const n = node('filter'); n.frequency = param(); n.Q = param(); return n },
    createBuffer: () => ({ getChannelData: () => new Float32Array(8) }),
  }
  /** Whether what a node plays still reaches the speaker. */
  const reaches = (from: Node, seen = new Set<Node>()): boolean => from === context.destination || (!seen.has(from) && (seen.add(from), from.to.some((next) => reaches(next, seen))))
  const sounding = (): number => made.filter((n) => (n.kind === 'osc' || n.kind === 'source') && n.started > 0 && reaches(n)).length
  return { context, made, sounding }
}

const event = (id: SoundEvent['id'], scene: boolean): SoundEvent => ({ id, part: 0, at: 0, mover: 'knock', pitch: 1, scene })

describe('a scene ended by a touch is silent from that frame, and a put-away closes all sound', () => {
  it('at the speaker: the scene has a gain of its own, cut without touching the rest; put away, both are cut', () => {
    const { context, sounding } = fakeContext()
    const out = { play: (voice: Voice) => voice(context as unknown as AudioContext, context.destination as unknown as AudioNode, 0) }
    const bus = new Bus(out)
    bus.play([event('toadLeap', true), event('knock', false)])
    const all = sounding()
    expect(all).toBeGreaterThanOrEqual(2)
    bus.cutScene()
    // What the scene was playing reaches the speaker no longer; the knock still does.
    const left = sounding()
    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThan(all)
    // The next scene sounds again, through a fresh gain.
    bus.play([event('toadLeap', true)])
    expect(sounding()).toBe(all)
    bus.closeAll()
    expect(sounding()).toBe(0)
    bus.play([event('knock', false)])
    expect(sounding()).toBe(left)
  })

  it('at the speaker: a scene sound held back for the first touch does not sound once its scene has been cut', () => {
    const { context, sounding } = fakeContext()
    const held: Voice[] = []
    const bus = new Bus({ play: (voice) => { held.push(voice) } })
    bus.play([event('toadLeap', true), event('knock', false)])
    bus.cutScene()
    for (const voice of held) voice(context as unknown as AudioContext, context.destination as unknown as AudioNode, 0)
    const knockOnly = sounding()
    expect(knockOnly).toBeGreaterThan(0)
    const fresh = fakeContext(), both: Voice[] = []
    new Bus({ play: (voice) => { both.push(voice) } }).play([event('toadLeap', true), event('knock', false)])
    for (const voice of both) voice(fresh.context as unknown as AudioContext, fresh.context.destination as unknown as AudioNode, 0)
    expect(fresh.sounding()).toBeGreaterThan(knockOnly)
  })

  it('through the game: a touch during each scene cuts it in that call, before anything the touch sets off, and nothing of it is heard after', () => {
    const scenes: { name: string; start: (finger: Finger) => void }[] = [
      { name: 'the toad\'s swap', start: (f) => { const at = f.reach('worm'); f.drag(at, STONE_SPOT, 'worm on the stone') } },
      { name: 'the hedgehog and the worm', start: (f) => { const at = f.reach('worm'); f.drag(at, { x: 344, y: 702 }, 'worm before the hedgehog') } },
      { name: 'the jay\'s theft', start: (f) => { f.put('worm', { x: 902, y: 718 }, 'worm in the puddle'); const at = f.reach('worm'); f.drag(at, { x: 930, y: 500 }, 'wet worm on the ground') } },
      { name: 'the turn of the year', start: (f) => { f.tap(SPOTS.grass.shut, 'open grass'); f.wait(1.5); f.tap({ x: 128, y: 132 }, 'wheel') } },
      { name: 'coming home', start: (f) => { f.put('worm', DOOR, 'worm through the door'); f.tap(DOOR, 'door in') } },
    ]
    const cutAt = new Map<string, number>()
    for (const scene of scenes) for (const after of [0.2, 0.7, 1.7]) {
      const finger = new Finger(1, 30)
      scene.start(finger)
      // Past the moment a carried thing hangs, into the scene.
      finger.wait(0.35 + after)
      // A short scene is over by the last of these moments: it is cut at the others.
      if (finger.toy.scene === null) continue
      cutAt.set(scene.name, (cutAt.get(scene.name) ?? 0) + 1)
      const sceneSounds = finger.ears.heard.filter((one) => one.event.scene).length
      if (after > 1.5) expect(sceneSounds, `${scene.name} has sounded`).toBeGreaterThan(0)
      const cutsBefore = finger.ears.sceneCuts.length, heardBefore = finger.ears.heard.length
      // The order in which the speaker is told things within the one call of the touch.
      const order: string[] = []
      const cut = finger.ears.cutScene.bind(finger.ears), play = finger.ears.play.bind(finger.ears)
      finger.ears.cutScene = () => { order.push('cut'); cut() }
      finger.ears.play = (events) => { if (events.length) order.push('play'); play(events) }
      finger.down({ x: 590, y: 330 }, 'a touch')
      expect(finger.ears.sceneCuts.length, scene.name).toBe(cutsBefore + 1)
      expect(order[0], scene.name).toBe('cut')
      expect(finger.toy.scene, scene.name).toBeNull()
      finger.up()
      finger.wait(8)
      // Nothing the scene still had to say is heard after the touch.
      const later = finger.ears.heard.slice(heardBefore).filter((one) => one.event.scene)
      expect(later.map((one) => one.event.id), `${scene.name} cut ${after} s in`).toEqual([])
    }
    for (const scene of scenes) expect(cutAt.get(scene.name) ?? 0, scene.name).toBeGreaterThanOrEqual(2)
  })

  it('through the game: a put-away closes all sound, and nothing is heard after it until a touch', () => {
    const finger = new Finger(1, 30)
    finger.tap(SPOTS.stone.shut, 'open stone')
    finger.wait(0.2)
    const heard = finger.ears.heard.length
    finger.play.park()
    expect(finger.ears.closes).toHaveLength(1)
    finger.wait(20)
    expect(finger.ears.heard.length).toBe(heard)
    finger.tap(SPOTS.log.shut, 'open log')
    expect(finger.ears.heard.length).toBeGreaterThan(heard)
  })
})
