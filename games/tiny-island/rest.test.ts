import { describe, expect, it } from 'vitest'
import { guideOf, type Guide } from './guide'
import { IdleLadder } from './guidance'
import { Hush, playQueued } from './hush'
import { Island } from './island'
import { putAway } from './rest'
import { deserialize, fresh, serialize } from './save'
import type { Sound } from './voices'

/** A node of the audio as the browser hands one out: what it is joined to, and when it was told to start. */
type Node = { kind: string; to: Set<Node>; startedAt: number | null }

/**
 * The audio as far as a put-away needs it: every node the game makes, the joins between them, and a clock.
 * A sound can be heard when its source is joined, through whatever stands between, to the way out.
 */
function fakeAudio() {
  const nodes: Node[] = [], param = () => ({ value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} })
  const make = (kind: string) => {
    const node = {
      kind, to: new Set<Node>(), startedAt: null as number | null, gain: param(), frequency: param(), Q: param(), type: '', buffer: null as unknown, loop: false, onended: null as unknown,
      connect: (next: Node) => { node.to.add(next); return next },
      disconnect: () => node.to.clear(),
      start: (at: number) => void (node.startedAt = at),
      stop: () => {},
    }
    nodes.push(node)
    return node
  }
  const out = make('out')
  const context = {
    currentTime: 0, sampleRate: 8000,
    createGain: () => make('gain'), createOscillator: () => make('source'), createBufferSource: () => make('source'), createBiquadFilter: () => make('filter'),
    createBuffer: (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }
  const reaches = (node: Node, seen = new Set<Node>()): boolean => node === out || (!seen.has(node) && (seen.add(node), [...node.to].some((next) => reaches(next, seen))))
  /** The sources that can be heard, now or when their moment comes. */
  const audible = (): Node[] => nodes.filter((node) => node.kind === 'source' && node.startedAt !== null && reaches(node))
  // The game's audio plays a voice at once when it is running, as here.
  const audio = { play: (voice: (context: AudioContext, out: AudioNode, at: number) => void) => voice(context as unknown as AudioContext, out as unknown as AudioNode, context.currentTime) }
  return { context, audio, audible }
}

const queue = (sounds: Sound[]) => ({ sounds: [...sounds], hushed: false })

describe('put away: nothing that was set to sound is heard after the return', () => {
  // Sounds the island sets to play later, or that last: the gull's cry and its far call, its dive, the sheep's horn on the boat, the whale's patter, the buoy's bell, the sun, the lighthouse's hum, and the wave's long roll.
  const LATER: [string, Sound[]][] = [
    ["the gull's cry and the clang after it", [{ name: 'kyah' }, { name: 'clang', delay: 0.2 }]],
    ["the gull's call and its dive", [{ name: 'kwuk', delay: 1.5 }, { name: 'fft', delay: 0.4 }, { name: 'fft', delay: 0.6 }, { name: 'kssh', delay: 0.9 }]],
    ["the boat's horn", [{ name: 'horn', gain: 1, delay: 0.25 }]],
    ["the whale's patter", [{ name: 'spout' }, { name: 'pitpat', delay: 0.5 }]],
    ['a clang', [{ name: 'clang' }]],
    ['the sun', [{ name: 'bong' }]],
    ['the hum', [{ name: 'hum' }]],
    ["the wave's roll", [{ name: 'roll', wash: true }, { name: 'yawn', wash: true, delay: 0.3 }]],
  ]

  it.each(LATER)('%s', (_, sounds) => {
    const { audio, audible } = fakeAudio(), hush = new Hush(), all = new Hush(), ladder = new IdleLadder(0)
    playQueued(audio, hush, queue(sounds), all)
    // Before the put-away each of them is on its way out, and some have not started yet.
    const before = audible()
    expect(before.length).toBeGreaterThan(0)
    const parked = putAway(new Island(fresh(4)), 4, hush, all, ladder, 1)
    // Put away 10 ms later: not one source is joined to the way out any more, whenever it was to start.
    expect(audible()).toHaveLength(0)
    expect(parked.island.sounds).toHaveLength(0)
  })

  it('keeps the gain shut until a touch: a sound said before the next touch is not heard, and the touch and all after it are', () => {
    const { audio, audible } = fakeAudio(), hush = new Hush(), all = new Hush(), ladder = new IdleLadder(0)
    playQueued(audio, hush, queue([{ name: 'hum' }]), all)
    putAway(new Island(fresh(4)), 4, hush, all, ladder, 1)
    // The game is back and nobody has touched it.
    playQueued(audio, hush, queue([{ name: 'creak' }, { name: 'roll', wash: true }]), all)
    expect(audible()).toHaveLength(0)
    // A voice made while the gain was shut stays silent, even played after the touch.
    const late = all.voice(() => { throw new Error('heard') })
    all.open()
    expect(() => audio.play(late)).not.toThrow()
    playQueued(audio, hush, queue([{ name: 'tok' }]), all)
    const heard = audible().length
    expect(heard).toBeGreaterThan(0)
    // And the wave's sounds again, through a gain of their own inside it.
    playQueued(audio, hush, queue([{ name: 'roll', wash: true }]), all)
    expect(audible().length).toBeGreaterThan(heard)
  })

  it('cuts a sound that was still waiting for the browser to let audio start', () => {
    const { context, audible } = fakeAudio(), hush = new Hush(), all = new Hush(), ladder = new IdleLadder(0)
    const held: ((context: AudioContext, out: AudioNode, at: number) => void)[] = []
    playQueued({ play: (voice) => void held.push(voice) }, hush, queue([{ name: 'kyah' }, { name: 'roll', wash: true }]), all)
    putAway(new Island(fresh(4)), 4, hush, all, ladder, 1)
    all.open()
    const out = context.createGain()
    for (const voice of held) voice(context as unknown as AudioContext, out as unknown as AudioNode, 0)
    expect(audible()).toHaveLength(0)
  })
})

describe('put away: the idle ladder starts from nothing', () => {
  it('takes the ghost hand back in the middle of its move, as a game that is opened has none, and from then on shows what a loaded game shows', () => {
    const island = new Island(fresh(4)), ladder = new IdleLadder(0), blank = (): Guide => ({ glow: 0, rings: [], hand: null })
    // Nobody touches the game until the hand is in the middle of showing its move.
    let seconds = 0
    while (ladder.update(seconds).demo === null || ladder.update(seconds).demo! < 0.5) seconds += 1 / 60
    expect(guideOf(ladder.update(seconds), island.waiting, island.hand, island.handFor, blank()).hand).not.toBeNull()
    const parked = putAway(island, 4, new Hush(), new Hush(), ladder, seconds)
    // The game it comes back as shows no hand and no glow.
    expect(parked.guidance).toEqual({ glow: 0, demo: null, demoIndex: -1 })
    const back = guideOf(parked.guidance, parked.island.waiting, parked.island.hand, parked.island.handFor, blank())
    expect(back.hand).toBeNull()
    expect(back.glow).toBe(0)
    expect(back.rings).toHaveLength(0)
    // And a game loaded at that moment has a ladder made then: the two agree in every frame after.
    const loaded = new IdleLadder(seconds)
    for (let t = seconds; t < seconds + 40; t += 1 / 60) expect({ ...ladder.update(t) }).toEqual({ ...loaded.update(t) })
  })
})

describe('put away: a turn that was not written yet', () => {
  /** Plays as the Mount does: whatever the island marks changed is handed to storage. */
  const play = (island: Island, seconds: number, written: { turn: number | null }): void => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      island.step(1 / 60)
      if (island.dirty) { written.turn = serialize(island.state).turn; island.dirty = island.urgent = false }
    }
  }
  const flicked = (): { island: Island; written: { turn: number | null } } => {
    const island = new Island(fresh(4)), written = { turn: null as number | null }
    island.press({ kind: 'rim', x: 6.2, z: 0 })
    island.dragStart()
    for (let i = 1; i <= 12; i++) { island.drag({ x: Math.cos(i * 0.07) * 6.2, z: Math.sin(i * 0.07) * 6.2 }); play(island, 1 / 60, written) }
    island.lift()
    island.drop()
    return { island, written }
  }

  it('is handed to storage at the put-away, so the island that is loaded stands as the returned one stands', () => {
    const { island, written } = flicked()
    // It runs on past a peg or two and is put away between two pegs, still running.
    play(island, 0.8, written)
    expect(Math.abs(island.turning)).toBeGreaterThan(0.3)
    const live = island.state.turn
    expect(written.turn).not.toBeNull()
    expect(Math.abs(written.turn! - live)).toBeGreaterThan(0.01)
    const parked = putAway(island, 4, new Hush(), new Hush(), new IdleLadder(0), 0)
    // (The record holds the turn to a thousandth.)
    expect(parked.island.state.turn).toBeCloseTo(live, 3)
    // The Mount writes what is marked changed, at once: nothing on the returned island is running.
    expect(parked.island.dirty).toBe(true)
    expect(parked.island.turning).toBe(0)
    const saved = JSON.parse(JSON.stringify(serialize(parked.island.state)))
    expect(saved.turn).toBeCloseTo(live, 3)
    // Closed and opened again from that record, the island is the returned one, frame by frame.
    const loaded = new Island(deserialize(saved, 4))
    for (let t = 0; t < 2; t += 1 / 60) {
      expect(JSON.stringify(loaded.show())).toBe(JSON.stringify(parked.island.show()))
      loaded.step(1 / 60)
      parked.island.step(1 / 60)
    }
  })

  it('writes nothing for an island at rest whose turn storage already has, or for a first visit nobody touched', () => {
    expect(putAway(new Island(fresh(2)), 2, new Hush(), new Hush(), new IdleLadder(0), 0).island.dirty).toBe(false)
    const { island, written } = flicked()
    play(island, 12, written)
    expect(island.moving).toBe(false)
    expect(written.turn).toBeCloseTo(island.state.turn, 3)
    expect(putAway(island, 4, new Hush(), new Hush(), new IdleLadder(0), 0).island.dirty).toBe(false)
  })
})
