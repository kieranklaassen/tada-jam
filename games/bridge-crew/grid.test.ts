import { describe, expect, it } from 'vitest'
import { part } from './bridges.fixture'
import { settle, solve } from './frame'
import { GESTURES, GRID, THINGS, cellVoice, layPart, laid, loaded, plucked, pullPin, putPin, takeOffPart, trolleyRung, turnPart } from './grid'
import { KINDS, key, type Point } from './kit'
import { RANGE } from './voices'

const kit = { plank: 3, stick: 3, tube: 3, thread: 3 }
const footings = (...points: Point[]) => { const set = new Set(points.map(key)); return (p: Point) => set.has(key(p)) }

describe('the object-by-action grid', () => {
  it('is six objects by five gestures, and every cell shows something no other cell shows', () => {
    expect(THINGS).toHaveLength(6)
    expect(GESTURES).toHaveLength(5)
    const cells = THINGS.flatMap((thing) => GESTURES.map((gesture) => GRID[thing][gesture]))
    expect(cells).toHaveLength(30)
    expect(new Set(cells).size).toBe(30)
    for (const cell of cells) expect(cell).toMatch(/^[a-z]+(-[a-z]+)+$/)
  })

  it('every kind lays, turns and comes off with its own sound', () => {
    const sounds = (make: (kind: (typeof KINDS)[number]) => unknown) => new Set(KINDS.map((kind) => JSON.stringify(make(kind)))).size
    expect(sounds((kind) => laid(part(kind, 0, 0, 2, 0), null).voice)).toBe(4)
    expect(sounds((kind) => turnPart([part(kind, 0, 0, 2, 0)], 0)!.result.voice)).toBe(4)
    expect(sounds((kind) => takeOffPart([part(kind, 0, 0, 2, 0)], 0)!.result.voice)).toBe(4)
    expect(sounds((kind) => loaded(kind, null).does)).toBe(4)
  })

  it('turning changes a plank and leaves the other kinds as they were, each with its own answer', () => {
    const bridge = KINDS.map((kind, i) => part(kind, 0, i, 2, i))
    expect(turnPart(bridge, 0)!.bridge[0].turned).toBe(true)
    for (let i = 1; i < 4; i++) expect(turnPart(bridge, i)!.bridge).toEqual(bridge)
    expect(turnPart(bridge, 9)).toBeNull()
  })

  it('a drag that cannot lay a part still answers and changes nothing', () => {
    const bridge = [part('stick', 0, 0, 1, 0)]
    const again = layPart(bridge, part('stick', 1, 0, 0, 0), kit)
    expect(again.bridge).toEqual(bridge)
    expect(again.result.does).toBe('springs-back-doubled')
    expect(again.result.voice.length).toBeGreaterThan(0)
    expect(layPart(bridge, part('tube', 1, 0, 3, 0), kit).bridge).toHaveLength(2)
  })

  it('a pluck plays the force the model finds: a stick pings or knocks, a thread twangs or flops', () => {
    // A weight hung from two threads over a post that stands on a footing.
    const bridge = [part('thread', 0, 4, 2, 2), part('thread', 4, 4, 2, 2), part('stick', 2, 2, 2, 0), part('thread', 2, 0, 0, 0)]
    const frame = settle(bridge, footings([0, 4], [4, 4], [2, 0], [0, 0]))
    const states = solve(frame, [{ node: frame.at.get('2,2')!, weight: 3 }]).parts
    expect(plucked(bridge[2], states[2]).does).toBe('knocks')
    expect(['twangs', 'flops']).toContain(plucked(bridge[0], states[0]).does)
    expect(plucked(bridge[3], states[3]).does).toBe('flops')
    // A thread pulled harder sounds higher.
    const light = plucked(bridge[0], { ...states[0], strain: 'pull', force: 1 }).voice[0].pitch
    const heavy = plucked(bridge[0], { ...states[0], strain: 'pull', force: 9 }).voice[0].pitch
    expect(heavy).toBeGreaterThan(light)
    expect(plucked(part('stick', 0, 0, 2, 0), { ...states[2], force: 4 }).does).toBe('pings')
  })

  it('every cell has a sound of its own, inside the range every voice keeps', () => {
    const voices = THINGS.flatMap((thing) => GESTURES.map((gesture) => cellVoice(thing, gesture)))
    expect(new Set(voices.map((voice) => JSON.stringify(voice))).size).toBe(30)
    for (const voice of voices) {
      expect(voice.length).toBeGreaterThan(0)
      for (const sound of voice) {
        expect(sound.pitch).toBeGreaterThanOrEqual(RANGE.pitch[0]); expect(sound.pitch).toBeLessThanOrEqual(RANGE.pitch[1])
        expect(sound.peak).toBeGreaterThanOrEqual(RANGE.peak[0]); expect(sound.peak).toBeLessThanOrEqual(RANGE.peak[1])
        expect(sound.length).toBeGreaterThanOrEqual(RANGE.length[0]); expect(sound.length).toBeLessThanOrEqual(RANGE.length[1])
        expect(sound.after ?? 0).toBeLessThanOrEqual(RANGE.after[1])
      }
      expect(voice.reduce((sum, sound) => sum + sound.peak, 0)).toBeLessThanOrEqual(0.5)
    }
  })

  it('a pin taken off leaves every part that ended on it hanging loose there, and a pin put back holds them again', () => {
    const bridge = [part('plank', 0, 0, 4, 0), part('stick', 2, 0, 2, -2), part('thread', 2, 0, 0, 3), part('stick', 4, 0, 4, -2)]
    const pulled = pullPin(bridge, [2, 0])
    expect(pulled.loosened).toEqual([1, 2])
    expect(pulled.bridge[0]).toEqual(bridge[0])
    expect(pulled.bridge[1]).toEqual({ ...bridge[1], loose: 'a' })
    expect(pulled.bridge[2].loose).toBe('a')
    expect(pulled.bridge[3]).toEqual(bridge[3])
    expect(pullPin(bridge, [9, 9]).bridge).toEqual(bridge)
    // The loose part carries nothing: the frame leaves it out, and it still weighs on the pin that holds it.
    const frame = settle(pulled.bridge, footings([0, 0], [4, 0], [2, -2], [4, -2]))
    expect(frame.firm).toEqual([true, false, false, true])
    // Its other pin taken off as well, it has nothing left to hang from and drops into the tray.
    const again = pullPin(pulled.bridge, [2, -2])
    expect(again.dropped).toEqual([1])
    expect(again.bridge).toHaveLength(3)
    // A pin put back holds what hangs loose at that point, and nothing else.
    const back = putPin(pulled.bridge, [2, 0])
    expect(back.pinned).toEqual([1, 2])
    expect(back.bridge).toEqual(bridge)
    expect(putPin(bridge, [2, 0]).pinned).toEqual([])
    // More ends let go, more clatter.
    expect(pulled.result.voice.length).toBeGreaterThan(pullPin(bridge, [4, -2]).result.voice.length)
  })

  it('a part that gives under a load gives in its own voice', () => {
    const snapped = loaded('stick', { kind: 'gives', part: 0, spot: [1, 0], strain: 'bend' })
    expect(snapped.does).toBe('rides-like-a-rail')
    expect(snapped.voice).not.toEqual(loaded('stick', null).voice)
    expect(loaded('thread', { kind: 'gives', part: 0, spot: [1, 0], strain: 'pull' }).voice).toHaveLength(1)
    expect(trolleyRung(4).voice).toHaveLength(4)
  })
})
