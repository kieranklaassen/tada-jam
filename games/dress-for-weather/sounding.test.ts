import { describe, expect, it } from 'vitest'
import type { Heard } from './hall'
import { HUSH_SECONDS, Sounding } from './sounding'
import { tone, type Sound } from './voices'

// A stand-in for the browser's sound: gains that remember what was asked of
// them, and an ear that notes which gain each sound was built on.

type Ramp = { to: number; at: number }
class Gain {
  readonly gain = {
    value: 1,
    cancelled: [] as number[],
    held: [] as Ramp[],
    ramps: [] as Ramp[],
    cancelScheduledValues(at: number) { this.cancelled.push(at) },
    setValueAtTime(to: number, at: number) { this.held.push({ to, at }) },
    linearRampToValueAtTime(to: number, at: number) { this.ramps.push({ to, at }) },
  }
  to: unknown = null
  cut = false
  connect(out: unknown) { this.to = out }
  disconnect() { this.cut = true }
}
function setUp() {
  const gains: Gain[] = [], played: { notes: readonly Sound[]; on: unknown; at: number }[] = []
  const context = { createGain: () => { const gain = new Gain(); gains.push(gain); return gain } } as unknown as AudioContext
  const out = { name: 'the master' } as unknown as AudioNode
  const sounding = new Sounding((notes, _context, on, at) => { played.push({ notes, on, at }) })
  const hear = (batch: Heard[], at: number) => sounding.voice(batch)(context, out, at)
  return { gains, played, out, hear, sounding, context }
}
const A: Sound[] = [tone(440, 0.1, 0.01, 0.2)], B: Sound[] = [tone(660, 0.1, 0.01, 0.2)]

describe('sound by group', () => {
  it('gives each group a gain of its own on the way out, and keeps it for that group\'s next notes', () => {
    const { gains, played, out, hear } = setUp()
    hear([{ group: 'scene', notes: A }, { group: 'hat', notes: B }], 1)
    hear([{ group: 'scene', notes: B }], 1.2)
    expect(gains.length).toBe(2)
    expect(gains.every((gain) => gain.to === out && gain.gain.value === 1)).toBe(true)
    expect(played.map((p) => p.on)).toEqual([gains[0], gains[1], gains[0]])
    expect(played.map((p) => p.at)).toEqual([1, 1, 1.2])
  })

  it('shuts a hushed group within a few milliseconds, from the frame of the hush, and leaves the others sounding', () => {
    const { gains, played, hear } = setUp()
    hear([{ group: 'scene', notes: A }, { group: 'hall', notes: A }], 1)
    // A touch ends the scene: the hush comes ahead of the touch's own answer.
    hear([{ hush: 'scene' }, { group: 'scarf', notes: B }], 2)
    const [scene, hall, scarf] = gains
    expect(scene.gain.cancelled).toEqual([2])
    expect(scene.gain.held).toEqual([{ to: 1, at: 2 }])
    expect(scene.gain.ramps).toEqual([{ to: 0, at: 2 + HUSH_SECONDS }])
    expect(HUSH_SECONDS).toBeLessThanOrEqual(0.01)
    expect(hall.gain.ramps).toEqual([])
    expect(scarf.gain.ramps).toEqual([])
    expect(played[2].on).toBe(scarf)
    // The scene's next sound is on a new gain, since the old one is shut for good.
    hear([{ group: 'scene', notes: A }], 2.5)
    expect(gains.length).toBe(4)
    expect(played[3].on).toBe(gains[3])
    expect(played[3].on).not.toBe(scene)
    // The shut gain is let go once it has long been silent.
    expect(scene.cut).toBe(true)
    expect(hall.cut).toBe(false)
  })

  it('hushes a garment that is lifted and no other', () => {
    const { gains, hear } = setUp()
    hear([{ group: 'raincoat', notes: A }, { group: 'hat', notes: A }], 1)
    hear([{ hush: 'raincoat' }, { group: 'raincoat', notes: B }], 1.1)
    expect(gains[0].gain.ramps).toEqual([{ to: 0, at: 1.1 + HUSH_SECONDS }])
    expect(gains[1].gain.ramps).toEqual([])
    // The lift's own sound is not caught by the hush that came before it.
    expect(gains[2].gain.ramps).toEqual([])
  })

  it('closes every group at put-away, and a hush with nothing sounding does nothing', () => {
    const { gains, hear } = setUp()
    hear([{ hush: 'all' }], 0.5)
    expect(gains.length).toBe(0)
    hear([{ group: 'scene', notes: A }, { group: 'hall', notes: A }, { group: 'boots', notes: A }], 1)
    hear([{ hush: 'all' }], 1.3)
    expect(gains.length).toBe(3)
    for (const gain of gains) expect(gain.gain.ramps).toEqual([{ to: 0, at: 1.3 + HUSH_SECONDS }])
  })

  it('starts afresh on a new context', () => {
    const { gains, hear, sounding, out } = setUp()
    hear([{ group: 'scene', notes: A }], 1)
    const other: Gain[] = []
    const next = { createGain: () => { const gain = new Gain(); other.push(gain); return gain } } as unknown as AudioContext
    sounding.voice([{ hush: 'scene' }, { group: 'scene', notes: A }])(next, out, 0.1)
    // The old context's gain went with it: nothing is asked of it.
    expect(gains[0].gain.ramps).toEqual([])
    expect(other.length).toBe(1)
  })
})
