import { describe, expect, it } from 'vitest'
import { ODD_KINDS } from './circuit'
import { ACTIONS, answer, GRID, ODD_CLIP, ODD_FLICK, ODD_PASSES, THINGS, WRONG } from './grid'
import { RANGE, VOICE_IDS, VOICES, type Note } from './voices'

const cells = THINGS.flatMap((thing) => ACTIONS.map((action) => ({ thing, action, ...GRID[thing][action] })))

describe('the object-by-action grid', () => {
  it('is seven objects by five actions, every pair answered', () => {
    expect(cells).toHaveLength(35)
    for (const cell of cells) {
      expect(cell.look.length).toBeGreaterThan(0)
      expect(VOICES[cell.voice]).toBeDefined()
    }
  })

  it('answers every pair with a motion and a voice no other pair has', () => {
    expect(new Set(cells.map((cell) => cell.look)).size).toBe(35)
    expect(new Set(cells.map((cell) => cell.voice)).size).toBe(35)
  })

  it('lets every bench odd answer a flick as its own material', () => {
    expect(new Set(ODD_KINDS.map((what) => ODD_FLICK[what].look)).size).toBe(ODD_KINDS.length)
    expect(new Set(ODD_KINDS.map((what) => ODD_FLICK[what].voice)).size).toBe(ODD_KINDS.length)
    for (const what of ODD_KINDS) expect(answer('odd', 'flick', what)).toBe(ODD_FLICK[what])
    expect(answer('odd', 'flick')).toBe(GRID.odd.flick)
  })

  it('lets a clip bite every bench odd with the sound of its own material', () => {
    expect(new Set(ODD_KINDS.map((what) => ODD_CLIP[what].voice)).size).toBe(ODD_KINDS.length)
    for (const what of ODD_KINDS) {
      expect(answer('odd', 'clip', what)).toBe(ODD_CLIP[what])
      expect(VOICES[ODD_CLIP[what].voice]).toBeDefined()
    }
    // A second odd has two sounds: the hum cut off by one that blocks, and the hum back with one that passes.
    expect(ODD_PASSES.voice).not.toBe(GRID.odd.second.voice)
    expect(VOICES[ODD_PASSES.voice][0].length).toBeGreaterThan(VOICES[GRID.odd.second.voice][0].length)
  })

  it('gives every object a wrong use that works, with a motion of its own', () => {
    const wrong = Object.values(WRONG)
    for (const thing of THINGS) expect(wrong.some((w) => w.thing === thing), `a wrong use of the ${thing}`).toBe(true)
    const looks = [...cells.map((cell) => cell.look), ...Object.values(ODD_FLICK).map((a) => a.look)]
    for (const w of wrong) {
      expect(looks).not.toContain(w.look)
      expect(VOICES[w.voice]).toBeDefined()
    }
    expect(new Set(wrong.map((w) => w.look)).size).toBe(wrong.length)
  })
})

describe('the voices', () => {
  const within = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high
  const all = VOICE_IDS.map((id) => ({ id, notes: VOICES[id] as readonly Note[] }))

  it('each has one to three notes, every number inside its stated range', () => {
    for (const { id, notes } of all) {
      expect(notes.length, id).toBeGreaterThanOrEqual(1)
      expect(notes.length, id).toBeLessThanOrEqual(3)
      for (const note of notes) {
        expect(within(note.pitch, RANGE.pitch), `${id} pitch`).toBe(true)
        if (note.glideTo !== undefined) expect(within(note.glideTo, RANGE.pitch), `${id} glide`).toBe(true)
        expect(within(note.peak, RANGE.peak), `${id} peak`).toBe(true)
        expect(within(note.attack, RANGE.attack), `${id} attack`).toBe(true)
        expect(within(note.length, RANGE.length), `${id} length`).toBe(true)
        expect(within(note.after ?? 0, RANGE.after), `${id} after`).toBe(true)
        expect(within(note.q ?? 1, RANGE.q), `${id} q`).toBe(true)
        if (note.kind === 'tone') expect(note.wave, `${id} wave`).toBeDefined()
      }
    }
  })

  it('never stacks louder than a touch should be', () => {
    // Notes that start together add up. Three at the top of the range would clip the master.
    for (const { id, notes } of all) {
      const together = notes.filter((note) => (note.after ?? 0) < 0.02).reduce((sum, note) => sum + note.peak, 0)
      expect(together, id).toBeLessThanOrEqual(0.36)
    }
  })

  it('is over within a second and a half of the touch', () => {
    for (const { id, notes } of all) for (const note of notes) expect((note.after ?? 0) + note.attack + note.length, id).toBeLessThanOrEqual(1.5)
  })

  it('no two voices are the same sound', () => {
    const print = (notes: readonly Note[]) => JSON.stringify(notes)
    expect(new Set(all.map(({ notes }) => print(notes))).size).toBe(all.length)
  })

  it('pitch follows size: more current is higher, a flat cell is hollower than a full one', () => {
    expect(VOICES['cell-second'][0].pitch).toBeGreaterThan(VOICES['cell-clip'][0].pitch)
    expect(VOICES['cell-flat-flick'][0].pitch).toBeGreaterThan(VOICES['cell-flick'][0].pitch)
    expect(VOICES['motor-wild'][0].pitch).toBeGreaterThan(VOICES['motor-clip'][0].pitch)
    expect(VOICES['buzzer-shriek'][0].pitch).toBeGreaterThan(VOICES['buzzer-clip'][0].pitch)
    // A braked blade stops sooner than one that freewheels.
    expect(VOICES['motor-across'][0].length).toBeLessThan(0.4)
  })
})
