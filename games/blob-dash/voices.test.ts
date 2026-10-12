import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { Bus } from './bus'
import { beatOf, pitchOf } from './beat'
import { TEMPO } from './config'
import { BARE, FRAME, GRIP, fresh, piece } from './drive'
import { RELEASE } from './layout'
import { KINDS, WAYS } from './pieces'
import { makeRng } from './rng'
import type { ToyEvent } from './toy'
import { FULL_SCALE, MASTER, THIRD, TWIN_NOISE, WITHIN_DB, mixOf, notesFor } from './voices'

// Nobody has heard these on the machine they were written on. So every note
// is held to a range a small speaker can play and an ear can bear, every
// voice is short, no note waits inside its voice, and the mix is held to
// numbers: nothing clips, and nothing is so quiet that another drowns it.

const CELLS: [string, ToyEvent][] = KINDS.flatMap((kind) => WAYS.map((way) => [`a ${kind} met ${way}`, { type: 'meet', kind, way, beat: 3, second: false }] as [string, ToyEvent]))

/** One of every kind of event the loop can raise, in each of its forms. */
const EVENTS: [string, ToyEvent][] = [
  ['a tap that crouches', { type: 'touch', x: 0, y: 0, answer: 'crouch' }],
  ['a tap that kicks', { type: 'touch', x: 0, y: 0, answer: 'kick' }],
  ['a tap that changes nothing', { type: 'touch', x: 0, y: 0, answer: 'again' }],
  ['a boing from a beat', { type: 'launch', place: 4, by: 'spring', accent: false, muffled: false, second: false }],
  ['an accented boing from a beat', { type: 'launch', place: 4, by: 'tap', accent: true, muffled: false, second: false }],
  ['a boing from a half', { type: 'launch', place: 5, by: 'spring', accent: false, muffled: false, second: false }],
  ['a boing with a hand over it', { type: 'launch', place: 4, by: 'spring', accent: false, muffled: true, second: false }],
  ['a twin\'s boing', { type: 'launch', place: 4, by: 'spring', accent: false, muffled: false, second: true }],
  ['an accent on a jump under way', { type: 'accent', place: 4 }],
  ['a spring laid on a beat', { type: 'lay', place: 4 }],
  ['a spring laid on a half', { type: 'lay', place: 5 }],
  ['a landing on a beat', { type: 'land', place: 6, second: false }],
  ['a landing on a half', { type: 'land', place: 7, second: false }],
  ['a footfall', { type: 'step', beat: 3, second: false }],
  ['a twin\'s footfall', { type: 'step', beat: 3, second: true }],
  ...CELLS,
  ['a wall hit from the air', { type: 'meet', kind: 'wall', way: 'splat', beat: 3, second: false }],
  ['a squelch', { type: 'after', what: 'squelch', kind: 'wall', beat: 3, second: false }],
  ['a plink', { type: 'after', what: 'plink', kind: 'wall', beat: 3, second: false }],
  ['a gulp after a clink', { type: 'after', what: 'gulp', kind: 'tunnel', beat: 3, second: false }],
  ['a plip', { type: 'after', what: 'plip', kind: 'splitter', beat: 3, second: true }],
  ['a shlup', { type: 'after', what: 'shlup', kind: 'splitter', beat: 0, second: false }],
  ['a shlup in a pipe', { type: 'after', what: 'mlp', kind: 'splitter', beat: 0, second: false }],
  ['the release grabbed', { type: 'release', act: 'grab' }],
  ['the release tapped', { type: 'release', act: 'clink' }],
  ['the release let go short', { type: 'release', act: 'tock' }],
  ['the release let go', { type: 'release', act: 'clack' }],
  ['a spring coming off', { type: 'pop', place: 4 }],
  ['the dial over a step', { type: 'dial', act: 'click', tempo: 100 }],
  ['the dial tapped', { type: 'dial', act: 'knock', tempo: 100 }],
  ...(['pigeon', 'rat', 'cat', 'camera', 'neighbour'] as const).map((who) => [`the ${who} poked`, { type: 'cast', who, act: 'poke' }] as [string, ToyEvent]),
  ['the pigeon cooing', { type: 'cast', who: 'pigeon', act: 'coo' }],
  ['the rat rattling its can', { type: 'cast', who: 'rat', act: 'rattle' }],
  ['the cat\'s fur going up', { type: 'cast', who: 'cat', act: 'fur' }],
  ...(['lift', 'set', 'tap', 'pok', 'stick', 'clonk', 'hat', 'sniff', 'flick', 'bat'] as const).map((act) => [`a piece: ${act}`, { type: 'piece', kind: 'drum', act }] as [string, ToyEvent]),
  ...(['stare', 'takeoff', 'flap', 'perch'] as const).map((act) => [`the pigeon's lap: ${act}`, { type: 'lap', act }] as [string, ToyEvent]),
]

const all = EVENTS.map(([name, event]) => [name, notesFor(event, 60)] as const)
const top = (notes: readonly Note[]) => Math.max(...notes.map((note) => note.peak))
const sum = (notes: readonly Note[]) => notes.reduce((total, note) => total + note.peak, 0)

describe('the voices', () => {
  it.each(all)('%s is a short sound in a playable range', (_name, notes) => {
    expect(notes.length).toBeGreaterThan(0)
    expect(notes.length).toBeLessThanOrEqual(5)
    for (const note of notes) {
      expect(note.frequency).toBeGreaterThanOrEqual(60)
      expect(note.frequency).toBeLessThanOrEqual(8000)
      if (note.glideTo !== undefined) {
        expect(note.glideTo).toBeGreaterThanOrEqual(60)
        expect(note.glideTo).toBeLessThanOrEqual(8000)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(0.35)
      expect(note.attack).toBeGreaterThan(0)
      expect(note.attack).toBeLessThanOrEqual(0.05)
      // The one long sound is the chime's hum, which lasts until the next beat.
      expect(note.attack + note.decay).toBeLessThanOrEqual(0.95)
      if (note.kind === 'noise') expect(note.q).toBeGreaterThan(0)
    }
  })

  it('has no note that waits inside its voice: a sound starts in the frame of its motion', () => {
    for (const [name, notes] of all) for (const note of notes) expect(note.delay ?? 0, name).toBe(0)
  })

  it('gives every cell of the grid a sound of its own: no two of the thirty are the same, in any row or any column', () => {
    const heard = new Map<string, string>()
    for (const [name, event] of CELLS) {
      const sound = JSON.stringify(notesFor(event, 60))
      expect(heard.get(sound), name).toBeUndefined()
      heard.set(sound, name)
    }
    expect(heard.size).toBe(30)
    // And they differ to the ear, not only in a number: no two cells share both their loudest note's pitch and its kind.
    const lead = new Set(CELLS.map(([, event]) => {
      const notes = notesFor(event, 60), loud = notes.reduce((a, b) => (b.peak > a.peak ? b : a))
      return `${loud.kind} ${Math.round(loud.frequency)} ${loud.glideTo ? Math.round(loud.glideTo) : ''} ${loud.wave ?? ''}`
    }))
    expect(lead.size).toBe(30)
  })

  it('plays everything a twin meets a third higher', () => {
    for (const event of [{ type: 'meet', kind: 'chime', way: 'twins', beat: 3, second: false }, { type: 'step', beat: 3, second: false }, { type: 'land', place: 6, second: false }, { type: 'launch', place: 4, by: 'spring', accent: false, muffled: false, second: false }] as ToyEvent[]) {
      const first = notesFor(event).filter((note) => note.kind === 'tone')
      const second = notesFor({ ...event, second: true } as ToyEvent).filter((note) => note.kind === 'tone')
      expect(first.length).toBeGreaterThan(0)
      for (let i = 0; i < first.length; i++) expect(second[i].frequency / first[i].frequency).toBeCloseTo(THIRD, 6)
    }
  })

  it('tells a twin from the blob by ear in every cell, the ones that are all breath too: no twin sounds what the blob sounds', () => {
    for (const kind of KINDS) for (const way of WAYS) {
      const event = { type: 'meet', kind, way, beat: 3, second: false } as ToyEvent
      const first = notesFor(event), second = notesFor({ ...event, second: true } as ToyEvent)
      expect(second.length, `${kind} ${way}`).toBe(first.length)
      for (let i = 0; i < first.length; i++) {
        expect(second[i].frequency / first[i].frequency, `${kind} ${way}`).toBeCloseTo(THIRD, 6)
        if (first[i].kind !== 'noise') continue
        // A breath is softer and shorter the second time.
        expect(second[i].peak / first[i].peak).toBeCloseTo(TWIN_NOISE.peak, 6)
        expect(second[i].decay / first[i].decay).toBeCloseTo(TWIN_NOISE.decay, 6)
      }
    }
    // The flip met in a pipe is nothing but a breath: its second is not its first.
    const breath = { type: 'meet', kind: 'flip', way: 'hushed', beat: 3, second: false } as ToyEvent
    expect(notesFor({ ...breath, second: true } as ToyEvent)).not.toEqual(notesFor(breath))
    expect(TWIN_NOISE.peak).toBeLessThan(0.9)
    expect(TWIN_NOISE.decay).toBeLessThan(0.9)
  })

  it('hushes the shlup of two lumps made one in a pipe: lower, softer and shorter than the shlup on the line', () => {
    const shlup = notesFor({ type: 'after', what: 'shlup', kind: 'splitter', beat: 0, second: false }), hushed = notesFor({ type: 'after', what: 'mlp', kind: 'splitter', beat: 0, second: false })
    expect(hushed.length).toBe(shlup.length)
    for (let i = 0; i < shlup.length; i++) {
      expect(hushed[i].peak).toBeLessThan(shlup[i].peak * 0.5)
      expect(hushed[i].frequency).toBeLessThan(shlup[i].frequency * 0.6)
      expect(hushed[i].decay).toBeLessThan(shlup[i].decay)
    }
  })

  it('rings a chime in the note of its beat: an octave up when landed on, an octave down on the ceiling', () => {
    const note = pitchOf(5)
    const lead = (way: 'run' | 'landed' | 'ceiling') => notesFor({ type: 'meet', kind: 'chime', way, beat: 5, second: false }, 120)[0]
    expect(lead('run').frequency).toBeCloseTo(note * 2, 6)
    expect(lead('landed').frequency).toBeCloseTo(note * 4, 6)
    expect(lead('ceiling').frequency).toBeCloseTo(note, 6)
    // It hums until the next beat, whatever the tempo.
    expect(lead('landed').decay).toBeCloseTo(0.5, 6)
    expect(notesFor({ type: 'meet', kind: 'chime', way: 'landed', beat: 5, second: false }, 160)[0].decay).toBeCloseTo(60 / 160, 6)
  })

  it('sounds a boing in the note of its place, an octave up from a half, and quieter with a hand over it', () => {
    const from = (place: number, muffled = false) => notesFor({ type: 'launch', place, by: 'spring', accent: false, muffled, second: false })
    expect(from(4)[0].frequency).toBeCloseTo(pitchOf(beatOf(4)), 6)
    expect(from(5)[0].frequency).toBeCloseTo(pitchOf(beatOf(5)) * 2, 6)
    expect(top(from(4, true))).toBeLessThan(top(from(4)) * 0.6)
  })

  it('tells a beat from a half, and an accent from a plain jump, by ear', () => {
    const boing = (place: number, accent: boolean) => notesFor({ type: 'launch', place, by: 'spring', accent, muffled: false, second: false })
    expect(boing(4, false)[0].decay).toBeGreaterThan(boing(5, false)[0].decay * 2)
    expect(boing(4, true).length).toBeGreaterThan(boing(4, false).length)
    expect(top(boing(4, true))).toBeGreaterThan(top(boing(4, false)))
    const land = (place: number) => notesFor({ type: 'land', place, second: false })
    expect(top(land(6))).toBeGreaterThan(top(land(7)) * 2)
  })

  it('climbs the ratchet\'s click with the tempo', () => {
    const click = (tempo: number) => notesFor({ type: 'dial', act: 'click', tempo })[0].frequency
    expect(click(TEMPO.fastest)).toBeGreaterThan(click(TEMPO.slowest))
  })
})

describe('the mix', () => {
  it(`keeps the quietest voice within ${WITHIN_DB} dB of the loudest`, () => {
    const tops = all.map(([, notes]) => top(notes))
    const loudest = Math.max(...tops), quietest = Math.min(...tops)
    expect(20 * Math.log10(loudest / quietest)).toBeLessThanOrEqual(WITHIN_DB)
  })

  it('never lets the footfall drown a spring: every boing is well over the footfall, and the footfall is never the loudest thing in its frame', () => {
    const foot = top(notesFor({ type: 'step', beat: 3, second: false }))
    for (let place = 0; place < 32; place++) {
      const boing = top(notesFor({ type: 'launch', place, by: 'spring', accent: false, muffled: false, second: false }))
      expect(boing).toBeGreaterThanOrEqual(foot * 4)
    }
    // With a spring on every place the blob is never on the line between two: not a footfall in the whole lap.
    const toy = fresh(120, Array.from({ length: 32 }, (_, place) => place))
    let boings = 0, steps = 0
    for (let i = 0; i < 60 * 16; i++) {
      toy.step(FRAME)
      for (const event of toy.take()) {
        if (event.type === 'launch') boings++
        if (event.type === 'step') steps++
      }
    }
    expect(boings).toBeGreaterThanOrEqual(30)
    expect(steps).toBe(0)
  })

  it('stays under full scale in every frame of a full ring with every piece out, twins, a clear-out and a hand that never stops', () => {
    let worst = 0, turnedDown = 0, frames = 0
    for (const seed of [1, 2]) {
      const toy = fresh(160, Array.from({ length: 64 }, (_, place) => place), [piece('drum', 2), piece('splitter', 4), piece('chime', 6), piece('wall', 8), piece('flip', 10), piece('drum', 12, true), piece('wall', 13, true), piece('flip', 14, true)], seed)
      const rng = makeRng(seed)
      for (let i = 0; i < 60 * 60; i++) {
        const events: ToyEvent[] = []
        if (rng.next() < 0.2) {
          toy.press({ x: BARE.x + rng.next() * 30, y: BARE.y })
          events.push(...toy.take())
        }
        if (i === 60 * 40) {
          toy.press(GRIP)
          toy.drag(GRIP, { x: GRIP.x, y: GRIP.y + RELEASE.travel })
          toy.endDrag(true)
        }
        toy.step(FRAME)
        events.push(...toy.take())
        if (events.length === 0) continue
        frames++
        const raw = events.reduce((total, event) => total + sum(notesFor(event, toy.tempo)), 0)
        const mix = mixOf(events, toy.tempo)
        const mixed = sum(mix.main) + sum(mix.scene)
        if (mixed < raw - 1e-9) turnedDown++
        worst = Math.max(worst, mixed * MASTER)
        // Turned down together: nothing is dropped.
        expect(mix.main.length + mix.scene.length).toBe(events.reduce((total, event) => total + notesFor(event, toy.tempo).length, 0))
      }
    }
    expect(worst).toBeLessThanOrEqual(FULL_SCALE + 1e-9)
    // The mix is turned down in few frames: most of what happens fits as it is written.
    expect(turnedDown / frames).toBeLessThan(0.1)
  })

  it('puts a scene\'s notes apart from the loop\'s own, so a touch can close them', () => {
    const mix = mixOf([{ type: 'release', act: 'clack' }, { type: 'cast', who: 'cat', act: 'fur' }, { type: 'pop', place: 3 }, { type: 'step', beat: 1, second: false }])
    expect(mix.scene).toHaveLength(2)
    expect(mix.main).toHaveLength(4)
  })
})

// --- The bus -------------------------------------------------------------------

/** A stand-in for an audio context that keeps what was built on it. */
function fakeContext() {
  const gains: { value: number; connected: boolean; cancelled: number }[] = []
  const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} })
  const node = () => ({ connect: (to: unknown) => to, disconnect() {}, start() {}, stop() {}, onended: null as null | (() => void) })
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    createGain() {
      const record = { value: 1, connected: false, cancelled: 0 }
      gains.push(record)
      return {
        gain: { get value() { return record.value }, set value(v: number) { record.value = v }, setValueAtTime(v: number) { record.value = v }, exponentialRampToValueAtTime() {}, cancelScheduledValues() { record.cancelled++ } },
        connect(to: unknown) { record.connected = true; return to },
        disconnect() { record.connected = false },
      }
    },
    createOscillator: () => ({ ...node(), type: 'sine', frequency: param() }),
    createBufferSource: () => ({ ...node(), buffer: null, loop: false }),
    createBiquadFilter: () => ({ ...node(), type: 'bandpass', Q: param(), frequency: param() }),
    createBuffer: (_channels: number, size: number) => ({ getChannelData: () => new Float32Array(size) }),
  }
  return { context: context as unknown as AudioContext, out: {} as AudioNode, gains, at: (seconds: number) => { context.currentTime = seconds } }
}

describe('the bus', () => {
  const note: Note = { kind: 'tone', frequency: 440, peak: 0.1, attack: 0.01, decay: 0.3 }

  it('closes a scene\'s sound in the frame a touch ends the scene, and leaves the loop\'s own playing', () => {
    const bus = new Bus(), fake = fakeContext()
    bus.voice([note], [note, note])(fake.context, fake.out, 0)
    // The two gains the bus made are the first of each voice: the loop's, then the scene's.
    expect(bus.sounding).toBe(2)
    const made = fake.gains.filter((gain) => gain.connected && gain.value === 1)
    bus.cutScene()
    expect(bus.sounding).toBe(1)
    expect(made.filter((gain) => gain.value === 0 && !gain.connected)).toHaveLength(1)
  })

  it('closes every sound when the game is put away', () => {
    const bus = new Bus(), fake = fakeContext()
    bus.voice([note], [note])(fake.context, fake.out, 0)
    bus.voice([note])(fake.context, fake.out, 0.1)
    expect(bus.sounding).toBe(3)
    bus.cutAll()
    expect(bus.sounding).toBe(0)
  })

  it('never plays a voice that was still waiting when its scene ended or the game was put away', () => {
    const bus = new Bus(), fake = fakeContext()
    const waiting = bus.voice([note], [note])
    bus.cutScene()
    waiting(fake.context, fake.out, 0)
    // The loop's own notes play; the scene's are stale.
    expect(bus.sounding).toBe(1)
    const stale = bus.voice([note], [note])
    bus.cutAll()
    stale(fake.context, fake.out, 0)
    expect(bus.sounding).toBe(0)
  })

  it('lets go of the voices that have finished', () => {
    const bus = new Bus(), fake = fakeContext()
    bus.voice([note])(fake.context, fake.out, 0)
    fake.at(2)
    bus.voice([note])(fake.context, fake.out, 2)
    expect(bus.sounding).toBe(1)
  })
})
