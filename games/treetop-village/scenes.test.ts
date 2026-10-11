import { describe, expect, it } from 'vitest'
import { deserialize, freshSaved, serialize, type Saved } from './save'
import { RING_LEFT, RUN_SECONDS, flourish, meeting, notesRinging, ride } from './scripts'
import { FOLK, HILL_Y, HOME, MOON_Y, PLACES, PLACE_COUNT, RISE_Y, SET_Y, SUN, mid, standAt, type Folk, type Pt } from './tree'
import { DUSK_SECONDS, MORNING_SECONDS, cancel, feet, glowOn, hint, makeVillage, move, press, release, savedOf, step, type Cue, type Village } from './village'
import type { Kind } from './ways'

// The scenes: evening, morning, the shake and a carry. Each saves its
// outcome when it starts, gives way to any touch without a sound, and is
// never played again on load.

const withPieces = (pieces: Record<number, Kind>, night = false): Saved => {
  const saved = freshSaved(8)
  for (const [place, kind] of Object.entries(pieces)) saved.places[Number(place)] = kind
  saved.night = night
  return saved
}
const run = (v: Village, seconds: number): void => { for (let i = 0; i < Math.round(seconds * 60); i++) step(v, 1 / 60) }
const walker = (v: Village, folk: Folk) => v.walkers.find((one) => one.folk === folk)!
const ids = (v: Village): string[] => v.cues.map((cue) => cue.id)
const tap = (v: Village, at: Pt): void => { press(v, at); release(v, at) }
const body = (v: Village, folk: Folk): Pt => { const here = feet(v, walker(v, folk)); return { x: here.x, y: here.y - 40 } }
const SKY: Pt = { x: 40, y: 330 }
/** What a touch that ends a scene silences: the scene, and what each walker was doing on a piece. */
const HUSHED = [{ id: 'hush', bus: 'stage' }, ...FOLK.map((folk) => ({ id: 'hush', bus: `on:${folk}` }))]
const reopened = (v: Village, base: Saved): Village => makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(savedOf(v, base))))))
const atHome = Object.fromEntries(FOLK.map((folk) => [folk, { at: HOME[folk].landing, errand: 'none' }]))

/** Draws the sun or the moon along its tab and lets go. */
const pull = (v: Village, toY: number): void => {
  press(v, { x: SUN.x, y: v.tabY })
  move(v, { x: SUN.x, y: (v.tabY + toY) / 2 })
  move(v, { x: SUN.x, y: toY })
  release(v, { x: SUN.x, y: toY })
}
/** Pulls the trunk to one side and back across the other way, `times` times, without letting go. */
const rock = (v: Village, times: number): void => {
  press(v, { x: 590, y: 480 })
  move(v, { x: 670, y: 480 })
  for (let i = 0; i < times; i++) move(v, { x: i % 2 === 0 ? 510 : 670, y: 480 })
}

/** A day with ways home for two: lanterns hung low and high, the beetle up one ladder, the squirrel across a plank from his door. */
const day = (): Saved => {
  const saved = withPieces({ 0: 'ladder', 8: 'plank', 10: 'lanterns', 9: 'lanterns' })
  saved.folk.beetle = { at: 1, errand: 'none' }
  saved.folk.squirrel = { at: 4, errand: 'none' }
  saved.folk.owl = { at: 4, errand: 'none' }
  return saved
}

describe('evening', () => {
  it('is caused by the sun let go below the hill, and by nothing less: let go above it the sun springs back', () => {
    const v = makeVillage(day())
    pull(v, SET_Y - 60)
    expect(v.scene).toBeNull()
    expect(v.night).toBe(false)
    expect(ids(v)).toEqual(['sun', 'spring'])
    run(v, 1)
    expect(v.tabY).toBe(SUN.y)
    expect(v.dusk).toBe(0)
  })

  it('begins where the sun is let go below the top of the hill, and not a step above it', () => {
    expect(SET_Y).toBe(HILL_Y)
    const above = makeVillage(day())
    pull(above, HILL_Y - 2)
    expect(above.scene).toBeNull()
    expect(above.night).toBe(false)
    const below = makeVillage(day())
    pull(below, HILL_Y + 2)
    expect(below.scene?.what).toBe('dusk')
    expect(below.night).toBe(true)
  })

  it('saves its outcome the moment it starts: night, and every walker where its walk home will end', () => {
    const base = day()
    const v = makeVillage(base)
    pull(v, SET_Y + 30)
    expect(v.scene?.what).toBe('dusk')
    expect(v.dirty).toBe(2)
    const saved = savedOf(v, base)
    expect(saved.night).toBe(true)
    // The beetle comes down his ladder and the squirrel crosses his plank: both arrive. The owl will not climb, and keeps the errand.
    expect(saved.folk.beetle).toEqual({ at: 0, errand: 'none' })
    expect(saved.folk.squirrel).toEqual({ at: 3, errand: 'none' })
    expect(saved.folk.owl).toEqual({ at: 4, errand: 'home' })
    expect(saved.folk.mice).toEqual({ at: 2, errand: 'none' })
    expect(saved.places).toEqual(base.places)
  })

  it('plays beat by beat: the sheet comes up, the moon rises on the tab, the lanterns light from the lowest, and a window lights for each walker that gets in', () => {
    const v = makeVillage(day())
    pull(v, SET_Y + 30)
    const heard: string[] = []
    let litLow = -1, litHigh = -1
    for (let i = 0; i < 60 * 30; i++) {
      step(v, 1 / 60)
      // Whatever sounds is on the page in the same frame.
      for (const cue of v.cues) {
        heard.push(cue.id)
        if (cue.id === 'dusk') expect(v.dusk).toBeLessThan(0.1)
        if (cue.id === 'light') expect(v.lit.some((lit) => lit > 0 && lit < 1) || v.lit.some((lit) => lit === 0)).toBe(true)
        if (cue.id.startsWith('window:')) expect(walker(v, cue.id.slice(7) as Folk).indoors).toBe(true)
      }
      v.cues.length = 0
      if (litLow < 0 && v.lit[10] > 0) litLow = i
      if (litHigh < 0 && v.lit[9] > 0) litHigh = i
    }
    expect(v.scene).toBeNull()
    expect(v).toMatchObject({ dusk: 1, moon: true, tabY: MOON_Y, night: true })
    expect(v.lit[10]).toBe(1)
    expect(v.lit[9]).toBe(1)
    // The lower string lights first.
    expect(litLow).toBeGreaterThan(0)
    expect(litHigh).toBeGreaterThan(litLow)
    expect(heard.filter((id) => id === 'dusk')).toHaveLength(1)
    expect(heard.filter((id) => id === 'light')).toHaveLength(2)
    for (const folk of ['beetle', 'squirrel', 'mice'] as const) {
      expect(walker(v, folk)).toMatchObject({ at: HOME[folk].landing, indoors: true, door: 1 })
      expect(heard).toContain(`window:${folk}`)
    }
    // The owl cannot get home: she stops where she has to stay, out of doors.
    expect(walker(v, 'owl')).toMatchObject({ at: 4, errand: 'home', indoors: false })
    expect(heard).not.toContain('window:owl')
    // The finished evening stays: nothing more happens however long it is left.
    run(v, 60)
    expect(v.cues).toEqual([])
    expect(v.scene).toBeNull()
  })

  it('gives way to a touch: the tree jumps to the evening it saved, without a sound of the scene, and the touch is an ordinary touch', () => {
    const base = day()
    const v = makeVillage(base)
    pull(v, SET_Y + 30)
    const saved = savedOf(v, base)
    run(v, 0.4)
    expect(v.dusk).toBeLessThan(1)
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([...HUSHED, { id: 'page' }])
    expect(v.scene).toBeNull()
    expect(v).toMatchObject({ dusk: 1, moon: true, tabY: MOON_Y, night: true })
    expect(v.lit[10]).toBe(1)
    expect(v.lit[9]).toBe(1)
    for (const folk of FOLK) {
      expect(walker(v, folk)).toMatchObject({ at: saved.folk[folk].at, errand: saved.folk[folk].errand, walk: null, on: null, show: null })
      expect(walker(v, folk).indoors).toBe(saved.folk[folk].at === HOME[folk].landing && saved.folk[folk].errand === 'none')
    }
    expect(savedOf(v, base)).toEqual(saved)
    release(v, SKY)
    v.cues.length = 0
    run(v, 30)
    expect(v.cues).toEqual([])
  })

  it('takes a walker who sat waiting in a bucket on her own landing out of it and in at her door', () => {
    const saved = withPieces({ 5: 'bucket' })
    saved.lifts[5] = 1
    saved.folk.owl = { at: 8, errand: 5 }
    const v = makeVillage(saved)
    expect(walker(v, 'owl').seated).toBe(true)
    pull(v, SET_Y + 30)
    expect(walker(v, 'owl').seated).toBe(false)
    run(v, DUSK_SECONDS + 6)
    expect(walker(v, 'owl').indoors).toBe(true)
  })

  it('is long enough to watch and no longer than the sheet says', () => {
    expect(DUSK_SECONDS).toBeGreaterThanOrEqual(6)
    expect(DUSK_SECONDS).toBeLessThanOrEqual(10)
    const v = makeVillage(day())
    pull(v, SET_Y + 30)
    run(v, DUSK_SECONDS - 0.2)
    expect(v.scene?.what).toBe('dusk')
    run(v, 0.4)
    expect(v.scene).toBeNull()
  })

  it('is found as it was left: by night, lanterns burning, windows lit, nothing playing and nothing walked again', () => {
    const base = day()
    const v = makeVillage(base)
    pull(v, SET_Y + 30)
    // Put away a moment into the scene.
    run(v, 0.3)
    const again = reopened(v, base)
    expect(again.scene).toBeNull()
    expect(again).toMatchObject({ dusk: 1, moon: true, tabY: MOON_Y, night: true })
    expect(again.lit[10]).toBe(1)
    expect(walker(again, 'beetle')).toMatchObject({ at: 0, indoors: true, door: 1, walk: null })
    expect(walker(again, 'owl')).toMatchObject({ at: 4, errand: 'home', indoors: false })
    run(again, 30)
    expect(again.cues).toEqual([])
    expect(again.dirty).toBe(0)
  })

  it('brings a walker out of its lit door at a tap, with its flourish, and lets it go in again', () => {
    const v = makeVillage(withPieces({}, true))
    const squirrel = walker(v, 'squirrel')
    expect(squirrel).toMatchObject({ indoors: true, door: 1 })
    tap(v, { x: HOME.squirrel.door.x, y: HOME.squirrel.door.y - 36 })
    expect(ids(v)).toEqual(['flourish:squirrel'])
    expect(squirrel.indoors).toBe(false)
    v.cues.length = 0
    run(v, 6)
    expect(squirrel).toMatchObject({ indoors: true, door: 1, walk: null })
    expect(ids(v)).toContain('window:squirrel')
  })

  it('lights a string of lanterns that is hung by night at once, and puts out one that is taken down', () => {
    const v = makeVillage(withPieces({}, true))
    press(v, { x: 262 + (656 / 7) * 5.5, y: 776 })
    move(v, { x: mid(PLACES[9]).x, y: mid(PLACES[9]).y + 34 })
    release(v, { x: mid(PLACES[9]).x, y: mid(PLACES[9]).y + 34 })
    expect(v.places[9]).toBe('lanterns')
    expect(v.lit[9]).toBe(1)
    // Whoever came to try it has gone on.
    run(v, 12)
    press(v, mid(PLACES[9]))
    move(v, SKY)
    expect(v.held).toMatchObject({ kind: 'lanterns', from: 9 })
    expect(v.lit[9]).toBe(0)
  })
})

describe('morning', () => {
  const night = (): Saved => {
    const saved = withPieces({ 0: 'ladder', 10: 'lanterns' }, true)
    saved.folk.owl = { at: 4, errand: 'home' }
    return saved
  }

  it('is caused by the moon lifted and let go, and saves day and no errands the moment it starts', () => {
    const base = night()
    const v = makeVillage(base)
    pull(v, RISE_Y + 40)
    expect(v.scene).toBeNull()
    run(v, 1)
    expect(v.tabY).toBe(MOON_Y)
    pull(v, RISE_Y - 20)
    expect(v.scene?.what).toBe('morning')
    expect(v.dirty).toBe(2)
    const saved = savedOf(v, base)
    expect(saved.night).toBe(false)
    for (const folk of FOLK) expect(saved.folk[folk].errand).toBe('none')
    expect(saved.folk.owl.at).toBe(4)
    expect(saved.places).toEqual(base.places)
  })

  it('plays beat by beat: the sheet goes down, the lanterns go out, and each walker that is at home steps out and stretches in its own way', () => {
    const v = makeVillage(night())
    pull(v, RISE_Y - 20)
    const heard: string[] = []
    for (let i = 0; i < 60 * 12; i++) {
      step(v, 1 / 60)
      for (const cue of v.cues) {
        heard.push(cue.id)
        if (cue.id.startsWith('stretch:')) expect(walker(v, cue.id.slice(8) as Folk).show?.what).toBe('stretch')
      }
      v.cues.length = 0
    }
    expect(v.scene).toBeNull()
    expect(v).toMatchObject({ dusk: 0, moon: false, tabY: SUN.y, night: false })
    expect(v.lit.every((lit) => lit === 0)).toBe(true)
    expect(heard.filter((id) => id === 'morning')).toHaveLength(1)
    for (const folk of ['squirrel', 'mice', 'beetle'] as const) {
      expect(heard).toContain(`stretch:${folk}`)
      expect(walker(v, folk)).toMatchObject({ indoors: false, door: 0, show: null, walk: null })
      expect(walker(v, folk).x).toBeCloseTo(standAt(folk, HOME[folk].landing).x)
    }
    // The owl did not get home, so she does not step out of anything.
    expect(heard).not.toContain('stretch:owl')
    expect(v.places[0]).toBe('ladder')
    expect(v.places[10]).toBe('lanterns')
  })

  it('gives way to a touch without a sound of the scene, and nothing is left stretching', () => {
    const base = night()
    const v = makeVillage(base)
    pull(v, RISE_Y - 20)
    const saved = savedOf(v, base)
    run(v, 1.4)
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([...HUSHED, { id: 'page' }])
    expect(v.scene).toBeNull()
    expect(v).toMatchObject({ dusk: 0, moon: false, tabY: SUN.y, night: false })
    for (const one of v.walkers) expect(one).toMatchObject({ indoors: false, door: 0, show: null, walk: null })
    expect(savedOf(v, base)).toEqual(saved)
    release(v, SKY)
    v.cues.length = 0
    run(v, 20)
    expect(v.cues).toEqual([])
  })
})

describe('the shake', () => {
  const built = (): Saved => {
    const saved = withPieces({ 0: 'ladder', 5: 'bucket', 7: 'plank', 9: 'lanterns', 3: 'slide' })
    saved.lifts[5] = 1
    saved.newest = 7
    saved.folk.beetle = { at: 1, errand: 3 }
    return saved
  }

  it('is not caused by a tap or a single pull: the tree springs back with a rustle and drops an acorn', () => {
    const v = makeVillage(built())
    rock(v, 1)
    release(v, { x: 510, y: 480 })
    expect(v.scene).toBeNull()
    expect(v.places[0]).toBe('ladder')
    expect(v.bits.some((bit) => bit.kind === 'acorn')).toBe(true)
    expect(ids(v)).toContain('rustle')
    run(v, 1)
    expect(v.lean).toBe(0)
  })

  it('is caused by the trunk pulled to one side and back across twice, lets go of the finger, and saves a bare tree the moment it starts', () => {
    const base = built()
    const v = makeVillage(base)
    rock(v, 2)
    expect(v.scene?.what).toBe('shake')
    expect(v.grab).toBeNull()
    expect(v.dirty).toBe(2)
    const saved = savedOf(v, base)
    expect(saved.places.every((kind) => kind === null)).toBe(true)
    expect(saved.lifts.every((end) => end === 0)).toBe(true)
    expect(saved.newest).toBeNull()
    expect(saved.folk).toEqual(atHome)
    expect(saved.night).toBe(false)
    // The finger that shook is let go of: moving on and lifting it does not end the scene.
    move(v, { x: 600, y: 480 })
    release(v, { x: 600, y: 480 })
    expect(v.scene?.what).toBe('shake')
    // The pieces are still seen in the tree: they come off one by one.
    expect(v.places.filter((kind) => kind !== null).length).toBe(5)
  })

  it('plays beat by beat: the pieces come off from the top, each with its own knock, and everyone looks out of its own door', () => {
    const base = built()
    const v = makeVillage(base)
    rock(v, 2)
    v.cues.length = 0
    const off: string[] = [], heights: number[] = []
    const heard: string[] = []
    for (let i = 0; i < 60 * 12; i++) {
      const before = v.places.map((kind) => kind)
      step(v, 1 / 60)
      for (const cue of v.cues) {
        heard.push(cue.id)
        if (cue.id.startsWith('off:')) {
          // The piece leaves its pegs in the frame its knock sounds, and is in the air.
          expect(before[cue.n!]).toBe(cue.id.slice(4))
          expect(v.places[cue.n!]).toBeNull()
          expect(v.flutters.length).toBeGreaterThan(0)
          off.push(cue.id)
          heights.push(mid(PLACES[cue.n!]).y)
        }
        if (cue.id.startsWith('peek:')) expect(walker(v, cue.id.slice(5) as Folk).at).toBe(HOME[cue.id.slice(5) as Folk].landing)
      }
      v.cues.length = 0
    }
    expect(off).toHaveLength(5)
    expect(new Set(off).size).toBe(5)
    expect(heights).toEqual([...heights].sort((a, b) => a - b))
    for (const folk of FOLK) expect(heard).toContain(`peek:${folk}`)
    expect(v.scene).toBeNull()
    expect(v.outcome).toBeNull()
    expect(v.places.every((kind) => kind === null)).toBe(true)
    expect(v.flutters).toHaveLength(0)
    for (const folk of FOLK) {
      expect(walker(v, folk)).toMatchObject({ at: HOME[folk].landing, errand: 'none', flat: 0, walk: null })
      expect(walker(v, folk).x).toBeCloseTo(standAt(folk, HOME[folk].landing).x)
    }
    expect(savedOf(v, base).folk).toEqual(atHome)
  })

  it('gives way to a touch: the tree is bare at once, with no knock of a piece, and the touch is an ordinary touch', () => {
    const base = built()
    const v = makeVillage(base)
    rock(v, 2)
    const saved = savedOf(v, base)
    run(v, 0.5)
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([...HUSHED, { id: 'page' }])
    expect(v.scene).toBeNull()
    expect(v.places.every((kind) => kind === null)).toBe(true)
    expect(v.flutters).toHaveLength(0)
    expect(v.rock).toBe(0)
    for (const folk of FOLK) expect(walker(v, folk)).toMatchObject({ at: HOME[folk].landing, errand: 'none', flat: 0, walk: null, on: null, show: null })
    expect(savedOf(v, base)).toEqual(saved)
  })

  it('leaves night as it is, and is not played again on load', () => {
    const base = built()
    base.night = true
    const v = makeVillage(base)
    rock(v, 2)
    expect(savedOf(v, base).night).toBe(true)
    run(v, 0.5)
    const again = reopened(v, base)
    expect(again.scene).toBeNull()
    expect(again.places.every((kind) => kind === null)).toBe(true)
    expect(again.night).toBe(true)
    run(again, 20)
    expect(again.cues).toEqual([])
  })

  it('takes the pieces from under whoever is on them, and nothing of what they were doing is heard afterwards', () => {
    const saved = withPieces({ 0: 'ladder' })
    saved.newest = 0
    const v = makeVillage(saved)
    tap(v, body(v, 'beetle'))
    while (!walker(v, 'beetle').on) step(v, 1 / 60)
    rock(v, 2)
    v.cues.length = 0
    run(v, 12)
    expect(ids(v).filter((id) => id.startsWith('meet:'))).toEqual([])
    expect(walker(v, 'beetle')).toMatchObject({ at: 0, on: null })
  })
})

describe('a carry', () => {
  const waiting = (): { v: Village; base: Saved } => {
    const base = withPieces({ 5: 'bucket' })
    base.lifts[5] = 1
    base.folk.owl = { at: 8, errand: 'home' }
    base.folk.owl.errand = 5
    return { v: makeVillage(base), base }
  }

  it('finds the owl in her bucket when the bucket rests at her end, as it was left', () => {
    const { v } = waiting()
    expect(walker(v, 'owl')).toMatchObject({ waiting: 5, seated: true })
    run(v, 20)
    expect(v.cues).toEqual([])
  })

  it('saves where the bucket and its rider will be the moment it starts', () => {
    const { v, base } = waiting()
    tap(v, body(v, 'owl'))
    expect(v.dirty).toBe(2)
    const saved = savedOf(v, base)
    expect(saved.lifts[5]).toBe(0)
    expect(saved.folk.owl).toEqual({ at: 4, errand: 'none' })
  })

  it('sounds each beat of the ride while the bucket runs, and gives way to a touch without another sound', () => {
    const { v, base } = waiting()
    tap(v, body(v, 'owl'))
    const saved = savedOf(v, base)
    run(v, RUN_SECONDS / 2)
    expect(walker(v, 'owl').riding).toBe(5)
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([{ id: 'hush', bus: 'carry' }, { id: 'page' }])
    expect(v.rides[5]).toBeNull()
    expect(v.run[5]).toBe(0)
    expect(walker(v, 'owl')).toMatchObject({ at: 4, riding: -1, walk: null })
    expect(walker(v, 'owl').x).toBeCloseTo(standAt('owl', 4).x)
    expect(savedOf(v, base)).toEqual(saved)
    release(v, SKY)
    v.cues.length = 0
    run(v, 10)
    // Nothing of the ride is heard after the touch that ended it.
    expect(v.cues.filter((cue) => cue.bus !== undefined)).toEqual([])
  })
})

describe('no scene on load', () => {
  it('plays nothing and saves nothing when a tree is opened, by day or by night, whatever it holds', () => {
    for (const night of [false, true]) {
      const saved = freshSaved(8)
      saved.places = Array.from({ length: PLACE_COUNT }, (_, place) => (['plank', 'ladder', 'bridge', 'bucket', 'swing', 'lanterns', 'slide'] as const)[place % 7])
      saved.folk = { squirrel: { at: 7, errand: 3 }, owl: { at: 4, errand: 'home' }, mice: { at: 5, errand: 'none' }, beetle: { at: 1, errand: 9 } }
      saved.night = night
      const v = makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(saved)))))
      expect(v.scene).toBeNull()
      expect(v.tabBob + v.shake + v.basketHop + v.rock + v.lean).toBe(0)
      expect(v.born.every((seconds) => seconds > 10)).toBe(true)
      expect(v.tap.every((seconds) => seconds > 10)).toBe(true)
      run(v, 30)
      expect(v.cues).toEqual([])
      expect(v.dirty).toBe(0)
      expect(v.walkers.every((one) => one.walk === null && one.on === null && one.show === null)).toBe(true)
    }
  })
})

describe('sound keeps to the clock the picture is drawn from', () => {
  // Each kind of scene is ended by a touch at its middle. The touch is told to hush the scene's bus, which
  // silences whatever of it still rings, and from then on no note of the scene is handed over.
  const count = (cues: readonly Cue[], bus: string): number => cues.filter((cue) => cue.bus === bus).reduce((sum, cue) => sum + (cue.notes?.length ?? 1), 0)
  const after = (v: Village): Cue[] => { release(v, SKY); v.cues.length = 0; run(v, 20); return v.cues.filter((cue) => cue.bus !== undefined) }
  const riding = (): Village => {
    const base = withPieces({ 5: 'bucket' })
    base.lifts[5] = 1
    base.folk.mice = { at: 8, errand: 5 }
    return makeVillage(base)
  }

  it('a carry: the pulley and the riders sound as the bucket runs, and a touch at its middle leaves nothing of it to be heard', () => {
    const v = riding()
    expect(walker(v, 'mice').seated).toBe(true)
    v.cues.length = 0
    tap(v, { x: feet(v, walker(v, 'mice')).x, y: feet(v, walker(v, 'mice')).y - 20 })
    const all = ride('mice', 'rise').beats.reduce((sum, beat) => sum + beat.sound.length, 0)
    let frames = 0
    for (let i = 0; i < Math.round((RUN_SECONDS / 2) * 60); i++) { const before = count(v.cues, 'carry'); step(v, 1 / 60); if (count(v.cues, 'carry') > before) frames += 1 }
    // Note by note, in the frames they belong to, and none ahead of its time.
    expect(frames).toBeGreaterThan(3)
    expect(v.cues.filter((cue) => cue.bus === 'carry').every((cue) => (cue.notes ?? []).every((note) => !note.delay))).toBe(true)
    const sounded = count(v.cues, 'carry')
    expect(sounded).toBeGreaterThan(0)
    expect(sounded).toBeLessThan(all)
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([{ id: 'hush', bus: 'carry' }, { id: 'page' }])
    expect(after(v)).toEqual([])
  })

  it('a carry that runs to its end is heard whole, and is not hushed', () => {
    const v = riding()
    v.cues.length = 0
    tap(v, { x: feet(v, walker(v, 'mice')).x, y: feet(v, walker(v, 'mice')).y - 20 })
    run(v, RUN_SECONDS + 0.1)
    const all = ride('mice', 'rise').beats.reduce((sum, beat) => sum + beat.sound.length, 0)
    expect(v.cues.filter((cue) => cue.id === 'send').reduce((sum, cue) => sum + cue.notes!.length, 0)).toBe(all)
    expect(ids(v)).toContain('arrive')
    expect(ids(v)).not.toContain('hush')
  })

  it('evening, morning and the shake: a touch at the middle hushes the stage, and no note of the scene follows', () => {
    const scenes: [string, () => Village, number][] = [
      ['evening', () => { const v = makeVillage(day()); pull(v, SET_Y + 30); return v }, DUSK_SECONDS / 2],
      ['morning', () => { const v = makeVillage(withPieces({ 0: 'ladder', 10: 'lanterns' }, true)); pull(v, RISE_Y - 20); return v }, MORNING_SECONDS / 2],
      ['the shake', () => { const v = makeVillage(day()); rock(v, 2); return v }, 1.2],
    ]
    for (const [name, start, middle] of scenes) {
      const v = start()
      expect(v.scene, name).not.toBeNull()
      run(v, middle)
      expect(v.scene, name).not.toBeNull()
      expect(count(v.cues, 'stage'), name).toBeGreaterThan(0)
      v.cues.length = 0
      press(v, SKY)
      expect(v.cues, name).toEqual([...HUSHED, { id: 'page' }])
      expect(after(v), name).toEqual([])
    }
  })

  it('the shake hushes whatever the walkers and the buckets were sounding before it rustles', () => {
    const v = makeVillage(day())
    v.cues.length = 0
    rock(v, 2)
    expect(v.cues.filter((cue) => cue.id === 'hush')).toEqual(HUSHED)
    run(v, 0.1)
    expect(ids(v).indexOf('hush')).toBeLessThan(ids(v).indexOf('shake'))
  })

  it('a meeting: a flourish makes it wait, and nothing of it sounds while it waits; then all the rest of it sounds', () => {
    const start = (): Village => {
      const saved = withPieces({ 0: 'ladder' })
      saved.newest = 0
      const v = makeVillage(saved)
      tap(v, body(v, 'beetle'))
      while (!walker(v, 'beetle').on) step(v, 1 / 60)
      run(v, 0.6)
      return v
    }
    const meet = (cues: readonly Cue[]): number => cues.filter((cue) => cue.id.startsWith('meet:')).reduce((sum, cue) => sum + cue.notes!.length, 0)
    const all = meeting('beetle', 'ladder', 'rise', true, 0).beats.reduce((sum, beat) => sum + beat.sound.length, 0)
    // Left alone, the climb is heard whole.
    const alone = start()
    run(alone, 12)
    expect(meet(alone.cues)).toBe(all)
    // Tapped on the ladder: the flourish plays, and the climb is silent for as long as he stands.
    const v = start()
    const sounded = meet(v.cues)
    expect(sounded).toBeLessThan(all)
    v.cues.length = 0
    tap(v, body(v, 'beetle'))
    // His own bus is hushed first, so a long note of the climb does not ring on while he stands.
    expect(v.cues[0]).toEqual({ id: 'hush', bus: 'on:beetle' })
    expect(ids(v)).toEqual(['hush', 'flourish:beetle'])
    const stood = walker(v, 'beetle').on!.t
    run(v, flourish('beetle').seconds - 0.05)
    expect(walker(v, 'beetle').on!.t).toBe(stood)
    expect(meet(v.cues)).toBe(0)
    run(v, 12)
    expect(sounded + meet(v.cues)).toBe(all)
  })

  it('a meeting that an ended evening drops is not heard again', () => {
    const v = makeVillage(withPieces({ 0: 'ladder' }))
    walker(v, 'beetle').at = 1
    Object.assign(walker(v, 'beetle'), standAt('beetle', 1))
    pull(v, SET_Y + 30)
    while (!walker(v, 'beetle').on) step(v, 1 / 60)
    run(v, 0.3)
    expect(v.scene).not.toBeNull()
    v.cues.length = 0
    press(v, SKY)
    expect(v.cues).toEqual([...HUSHED, { id: 'page' }])
    expect(walker(v, 'beetle').on).toBeNull()
    expect(after(v)).toEqual([])
  })
})

describe('morning leaves everyone as a load finds them', () => {
  // By night: the owl sat waiting in a bucket, the twins stood at the foot of a string of lanterns they could
  // not pass, the squirrel and the beetle were in at their doors.
  const night = (): Saved => {
    const saved = withPieces({ 5: 'bucket', 7: 'lanterns' }, true)
    saved.lifts[5] = 1
    saved.folk.owl = { at: 8, errand: 5 }
    saved.folk.mice = { at: 1, errand: 'home' }
    return saved
  }
  const standing = (v: Village) => v.walkers.map((one) => ({
    folk: one.folk, at: one.at, errand: one.errand, blocked: one.blocked, waiting: one.waiting, seated: one.seated, queued: one.queued, riding: one.riding,
    x: Math.round(one.x), y: Math.round(one.y), face: one.face, indoors: one.indoors, walk: one.walk, on: one.on, show: one.show,
  }))

  it('is the same after a morning that ran to its end, a morning a touch ended, and a load', () => {
    const base = night()
    const before = makeVillage(base)
    expect(walker(before, 'owl')).toMatchObject({ waiting: 5, seated: true })
    expect(walker(before, 'mice').blocked).toBe(7)
    expect(glowOn(before)).toEqual({ bucket: 5 })

    const whole = makeVillage(base)
    pull(whole, RISE_Y - 20)
    const saved = savedOf(whole, base)
    run(whole, 30)

    const touched = makeVillage(base)
    pull(touched, RISE_Y - 20)
    run(touched, MORNING_SECONDS / 2)
    tap(touched, SKY)
    run(touched, 30)

    const loaded = makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(saved)))))
    run(loaded, 30)

    expect(standing(whole)).toEqual(standing(loaded))
    expect(standing(touched)).toEqual(standing(loaded))
    for (const v of [whole, touched, loaded]) {
      for (const one of v.walkers) expect(one).toMatchObject({ errand: 'none', waiting: -1, seated: false, blocked: -1, queued: -1 })
      // Nobody waits for the bucket any more: the glow and the hand are not on it, and a tap on the owl does not send it.
      expect(glowOn(v)).toEqual({ basket: true })
      expect('tap' in hint(v, 0)).toBe(false)
      expect(savedOf(v, base)).toEqual(saved)
      tap(v, body(v, 'owl'))
      expect(v.rides[5]).toBeNull()
      expect(v.lifts[5]).toBe(1)
    }
  })

  it('turns round a walker that was on its way to a piece', () => {
    const base = withPieces({ 0: 'ladder' }, true)
    base.folk.beetle = { at: 1, errand: 'home' }
    const v = makeVillage(base)
    expect(walker(v, 'beetle').errand).toBe('home')
    step(v, 1 / 60)
    expect(walker(v, 'beetle').walk).toBeNull()
    // He is sent on by a change in the tree, and morning comes while he walks to the ladder.
    walker(v, 'beetle').walk = { phase: 'to', step: { place: 0, forward: false }, meeting: 'across', toX: 300 }
    pull(v, RISE_Y - 20)
    run(v, 30)
    expect(walker(v, 'beetle')).toMatchObject({ at: 1, errand: 'none', walk: null, on: null })
    expect(walker(v, 'beetle').x).toBeCloseTo(standAt('beetle', 1).x)
  })

  it('stops a walker waiting, sitting or staying when no way leads where it was going any more, as a load finds it', () => {
    // The twins sit in a bucket on their way home, with a ladder below it; the beetle stands at the foot of a rope
    // bridge he cannot climb down, with a ladder below that. Both ladders are taken away, and the bucket and the bridge stay.
    const base = withPieces({ 5: 'bucket', 3: 'ladder', 2: 'bridge', 0: 'ladder' })
    base.lifts[5] = 1
    base.folk.mice = { at: 8, errand: 'home' }
    base.folk.beetle = { at: 3, errand: 'home' }
    const v = makeVillage(base)
    expect(walker(v, 'mice')).toMatchObject({ waiting: 5, seated: true })
    expect(walker(v, 'beetle').blocked).toBe(2)
    expect(glowOn(v)).toEqual({ bucket: 5 })
    for (const place of [3, 0]) {
      press(v, mid(PLACES[place]))
      move(v, SKY)
      release(v, SKY)
    }
    run(v, 20)
    const loaded = makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(savedOf(v, base))))))
    run(loaded, 20)
    expect(standing(v)).toEqual(standing(loaded))
    // Each keeps its errand, and stands on its own spot with nothing to wait for.
    expect(walker(v, 'mice')).toMatchObject({ at: 8, errand: 'home', waiting: -1, seated: false })
    expect(walker(v, 'mice').x).toBeCloseTo(standAt('mice', 8).x)
    expect(walker(v, 'beetle')).toMatchObject({ at: 3, errand: 'home', blocked: -1 })
    expect(walker(v, 'beetle').x).toBeCloseTo(standAt('beetle', 3).x)
    expect(glowOn(v)).toEqual({ basket: true })
  })
})

describe('a long note of a move that is made to stand still', () => {
  // The beetle comes down a bark slide on his back with a hollow rumble a second and a half long.
  const sliding = (): Village => {
    const saved = withPieces({ 0: 'slide' })
    saved.folk.beetle = { at: 1, errand: 'none' }
    const v = makeVillage(saved)
    tap(v, body(v, 'beetle'))
    while (!walker(v, 'beetle').on) step(v, 1 / 60)
    return v
  }
  const long = (cues: readonly Cue[]): number => cues.filter((cue) => cue.id.startsWith('meet:')).flatMap((cue) => cue.notes ?? []).filter((note) => note.attack + note.decay > 1).length

  it('is hushed with the move when a tap makes the walker stand, and begins again from where the move goes on', () => {
    const v = sliding()
    while (long(v.cues) === 0) step(v, 1 / 60)
    run(v, 0.3)
    const on = walker(v, 'beetle').on!
    const due = notesRinging(on.script, on.t)
    expect(due.length).toBeGreaterThan(0)
    v.cues.length = 0
    tap(v, body(v, 'beetle'))
    // His own bus is hushed in the frame the finger lands, before the flourish sounds.
    expect(v.cues[0]).toEqual({ id: 'hush', bus: 'on:beetle' })
    expect(v.cues[1]).toMatchObject({ id: 'flourish:beetle', bus: 'stage' })
    v.cues.length = 0
    run(v, flourish('beetle').seconds - 0.05)
    expect(v.cues.filter((cue) => cue.bus === 'on:beetle')).toEqual([])
    run(v, 0.1)
    // The move goes on: the rumble begins again on his bus, at once, for the time it had left.
    const again = v.cues.filter((cue) => cue.bus === 'on:beetle')
    expect(again[0].notes).toEqual(due)
    expect(again[0].id.startsWith('meet:beetle:slide')).toBe(true)
  })

  it('begins a note again at the pitch its glide had reached, for the time it had left, quieter, and leaves short notes alone', () => {
    const script = meeting('beetle', 'slide', 'rise', false, 0)
    const beat = script.beats.find((one) => one.sound.some((note) => note.attack + note.decay > 1))!
    const note = beat.sound.find((one) => one.attack + one.decay > 1)!
    const start = beat.at + (note.delay ?? 0), whole = note.attack + note.decay
    for (const gone of [0.2, 0.5, 0.8]) {
      const t = start + whole * gone
      const again = notesRinging(script, t).find((one) => one.kind === note.kind && Math.abs(one.attack + one.decay - whole * (1 - gone)) < 1e-6)!
      expect(again, `${gone}`).toBeDefined()
      expect(again.delay).toBe(0)
      expect(again.peak).toBeLessThanOrEqual(note.peak)
      expect(again.peak).toBeGreaterThanOrEqual(note.peak * 0.4 - 1e-9)
      if (note.glideTo) {
        const low = Math.min(note.frequency, note.glideTo), high = Math.max(note.frequency, note.glideTo)
        expect(again.frequency).toBeGreaterThanOrEqual(low)
        expect(again.frequency).toBeLessThanOrEqual(high)
        expect(again.glideTo).toBe(note.glideTo)
      }
    }
    // Nothing that has not begun, and nothing with less than a moment left.
    expect(notesRinging(script, 0)).toEqual([])
    for (let t = 0; t <= script.seconds; t += 0.05) for (const one of notesRinging(script, t)) expect(one.attack + one.decay).toBeGreaterThanOrEqual(RING_LEFT - 1e-9)
  })
})

describe('morning begins from the upper half of the slot', () => {
  it('is caused by the moon let go more than half way up its slot, and not a step lower', () => {
    expect(RISE_Y).toBe((SUN.y + MOON_Y) / 2)
    const low = makeVillage(withPieces({}, true))
    pull(low, RISE_Y + 2)
    expect(low.scene).toBeNull()
    expect(low.night).toBe(true)
    const high = makeVillage(withPieces({}, true))
    pull(high, RISE_Y - 2)
    expect(high.scene?.what).toBe('morning')
    expect(high.night).toBe(false)
  })
})

describe('parked with a piece in the hand', () => {
  const standing = (v: Village) => v.walkers.map((one) => ({
    folk: one.folk, at: one.at, errand: one.errand, next: one.next, back: one.back, blocked: one.blocked, waiting: one.waiting, seated: one.seated, queued: one.queued,
    riding: one.riding, x: Math.round(one.x), y: Math.round(one.y), face: one.face, indoors: one.indoors, walk: one.walk, on: one.on, show: one.show,
  }))
  const reopen = (saved: Saved): Village => makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(saved)))))

  it('is found on return as a load of the same save finds it: the piece back on its pegs, and whoever it had stopped still standing at its foot', () => {
    // The beetle stopped at a ramp, the twins stopped at lanterns on their way home, the owl sitting in a bucket.
    const layouts: [string, Saved, number][] = []
    const ramp = withPieces({ 0: 'plank' })
    ramp.folk.beetle = { at: 0, errand: 0 }
    layouts.push(['a ramp the beetle slid down', ramp, 0])
    const lamps = withPieces({ 7: 'lanterns', 0: 'ladder' })
    lamps.folk.mice = { at: 1, errand: 'home' }
    layouts.push(['lanterns the twins swung on', lamps, 7])
    const round = withPieces({ 7: 'lanterns', 0: 'ladder', 1: 'ladder' })
    round.folk.mice = { at: 1, errand: 'home' }
    layouts.push(['a ladder on the twins\' way round', round, 0])
    const bucket = withPieces({ 5: 'bucket', 8: 'plank' })
    bucket.folk.owl = { at: 3, errand: 'home' }
    layouts.push(['a plank on the owl\'s way to her bucket', bucket, 8])
    for (const [name, base, place] of layouts) {
      const v = makeVillage(base)
      const before = standing(v)
      press(v, mid(PLACES[place]))
      move(v, SKY)
      expect(v.held?.from, name).toBe(place)
      // Nobody sets off because a piece is in the hand.
      run(v, 2)
      expect(standing(v), name).toEqual(before)
      // Parked here: what is saved, and what the attention edge leaves, which takes the touch away.
      const saved = savedOf(v, base)
      cancel(v)
      expect(v.places[place], name).toBe(base.places[place])
      run(v, 20)
      const loaded = reopen(saved)
      run(loaded, 20)
      expect(standing(v), name).toEqual(standing(loaded))
      expect(savedOf(v, base), name).toEqual(saved)
    }
  })

  it('keeps a walker that comes to a piece in the hand off it: it waits on its own spot and crosses when the piece is back', () => {
    const base = withPieces({ 8: 'plank' })
    base.newest = 8
    const v = makeVillage(base)
    tap(v, body(v, 'squirrel'))
    press(v, mid(PLACES[8]))
    move(v, SKY)
    const saved = savedOf(v, base)
    run(v, 6)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 3, on: null, queued: 8 })
    cancel(v)
    run(v, 20)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 4, errand: 'none' })
    // The save made while the piece was in the hand already said so.
    expect(saved.folk.squirrel).toEqual({ at: 4, errand: 'none' })
    expect(savedOf(v, base)).toEqual(saved)
  })

  it('sends on whoever it had stopped once the piece is let go somewhere else', () => {
    const base = withPieces({ 7: 'lanterns', 0: 'ladder', 1: 'ladder' })
    base.folk.mice = { at: 1, errand: 'home' }
    const v = makeVillage(base)
    // Found as left they stand at the top of the ladder, the first piece of their way round. The lanterns are moved up the tree.
    press(v, mid(PLACES[7]))
    move(v, { x: mid(PLACES[9]).x, y: mid(PLACES[9]).y + 34 })
    release(v, { x: mid(PLACES[9]).x, y: mid(PLACES[9]).y + 34 })
    expect(v.places[9]).toBe('lanterns')
    run(v, 30)
    expect(walker(v, 'mice')).toMatchObject({ at: 2, errand: 'none' })
  })
})
