import { describe, expect, it } from 'vitest'
import { BEATS, walkOf, type Act, type Walk } from './acts'
import type { Note } from './audio'
import { actVoice, beatVoice, fireHiss, settleOnPeg } from './calls'
import { MOOD_SECONDS, poseOf, rest } from './cast'
import { wear } from './folk'
import { SHEEP_CURLS, opensToward } from './folkArt'
import { GOOSE, PIG, SHEEP, SHEPHERD } from './layout'
import { cell, daub, fresh, hangUp, setDown, settle } from './probe'
import { lightOf } from './scenes'
import { TICK, type Toy } from './toy'
import { WAKE, folkVoice, muffled, roomPat, type Cue } from './voices'
import { BLUE, GREEN, WHITE, YELLOW } from './wool'

// The close of the first reading: one test for each ruling the game's model
// holds, each written so that it fails when the fix is taken out. What the
// view, the hands and the ladder hold is in closingView.test.ts.

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

type Heard = { at: number; note: Note }

/** Plays `seconds` a tick at a time, and returns every note with the toy's time in the tick that released it. */
function listen(toy: Toy, seconds: number): Heard[] {
  const heard: Heard[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    toy.advance(TICK)
    for (const note of [...(toy.takeSounds() ?? []), ...(toy.takeSceneSounds() ?? [])]) heard.push({ at: toy.t, note })
  }
  return heard
}

const same = (a: Note, b: Note): boolean => a.kind === b.kind && a.frequency === b.frequency && a.peak === b.peak && a.attack === b.attack && a.decay === b.decay && a.glideTo === b.glideTo
/** The times the first note of a cue was heard. */
const timesOf = (heard: readonly Heard[], cue: Cue | readonly Note[]): number[] => {
  const first = 'notes' in (cue[0] as object) ? (cue as Cue)[0].notes[0] : (cue as readonly Note[])[0]
  return heard.filter((one) => same(one.note, first)).map((one) => one.at)
}
/** The times a sound of several notes began: those further than half a second from the one before. */
const startsOf = (times: readonly number[]): number[] => times.filter((at, i) => i === 0 || at - times[i - 1] > 0.5)
const flush = (toy: Toy): void => { toy.takeSounds(); toy.takeSceneSounds() }
/** The pose a figure is drawn in now, as the view asks for it. */
const poseNow = (toy: Toy, who: number) => {
  const figure = toy.folk[who]
  return poseOf(who, toy.t, figure.mood, toy.t - figure.moodSince, figure.gazeX, figure.gazeY, figure.variant, rest(), figure.shown, figure.turn, figure.hat, toy.t - figure.shownSince)
}

describe('ruling 1: no curl on the sheep opens to the right', () => {
  it('opens every curl downward or upward at a slant, whichever way the sheep faces', () => {
    const off = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180)
    expect(SHEEP_CURLS.length).toBeGreaterThanOrEqual(9)
    for (const [, , , turn] of SHEEP_CURLS) {
      const opens = opensToward(turn)
      // As drawn, and as a sheep that has turned round shows it.
      for (const way of [opens, (540 - opens) % 360]) {
        expect(off(way, 0), `opens toward ${Math.round(way)}`).toBeGreaterThanOrEqual(50)
        for (const upright of [90, 270]) expect(off(way, upright), `opens toward ${Math.round(way)}`).toBeGreaterThanOrEqual(15)
      }
    }
    expect(sources['./folkArt.ts']).toMatch(/for \(const \[x, y, r, turn\] of SHEEP_CURLS\) curl\(/)
  })
})

describe('ruling 2: the evening is not cut short', () => {
  const evening = (): Toy => {
    const toy = fresh(GREEN, 1, 5)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    hangUp(toy)
    expect(toy.finished).toBe(true)
    expect(toy.show.kind).toBe('evening')
    return toy
  }

  it('ends the scene at a touch on the felt and leaves the picture hanging in evening light; only a later touch turns the fresh felt', () => {
    const toy = evening()
    toy.advance(1)
    flush(toy)
    toy.press(cell(30, 20))
    // The touch ended the scene, and that is all it did. It is answered: the frame lands on its peg.
    expect(toy.scene).toBeNull()
    expect(toy.finished).toBe(true)
    expect(toy.show.kind).toBe('none')
    expect(lightOf(toy)).toBe(1)
    expect(toy.wall).toHaveLength(1)
    expect(toy.takeSounds()).toEqual(settleOnPeg)
    expect(toy.t - toy.knocked[toy.show.peg]).toBe(0)
    toy.end('tap')
    toy.advance(2)
    expect(toy.finished).toBe(true)
    // A later touch on the felt turns it.
    toy.press(cell(30, 20)); toy.end('tap')
    expect(toy.finished).toBe(false)
    expect(toy.show.kind).toBe('fresh')
  })

  it('answers a touch that ends the scene after the frame has landed with a pat and lint on the wooden back', () => {
    const toy = evening()
    toy.advance(4)
    expect(toy.show.swing).toBe(1)
    expect(toy.scene).not.toBeNull()
    flush(toy)
    const afloat = toy.floaters.length
    toy.press(cell(30, 20))
    expect(toy.finished).toBe(true)
    expect(toy.takeSounds()).toEqual(roomPat)
    expect(toy.floaters.length).toBe(afloat + 3)
  })
})

describe('ruling 3: no sound without sight, for the acts', () => {
  const walk: Walk = { x: 0, y: 0, flip: false, turn: 0, hat: 0 }

  it('sneezes three times in corn, each heard in the tick its pose shows, and then no more', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, YELLOW, 20, 38, 40, 44)
    settle(toy)
    expect(toy.sheet.shapes[0].kind).toBe('corn')
    setDown(toy, SHEEP, 30, 41)
    expect(toy.folk[SHEEP].act).toBe('sneeze')
    flush(toy)
    const blast = beatVoice(SHEEP, 'sneeze')
    let shown = 0, was = false
    const heard: number[] = []
    for (let i = 0; i < 20 * 60; i++) {
      const ticked = listen(toy, TICK)
      const blasting = poseNow(toy, SHEEP).mouth === 1
      if (blasting && !was) shown++
      was = blasting
      if (timesOf(ticked, blast).length > 0) { heard.push(toy.t); expect(blasting, 'the sneeze is seen in the tick it is heard').toBe(true) }
    }
    expect(shown).toBe(3)
    expect(heard).toHaveLength(3)
    expect(BEATS.sneeze?.times).toBe(3)
  })

  it('shakes a soaked sheep twice and a figure in a blue coat three times, each shake with its rattle', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, BLUE, 30, 38, 46, 44)
    settle(toy)
    setDown(toy, SHEEP, 38, 41)
    expect(toy.folk[SHEEP].act).toBe('soaked')
    const first = listen(toy, 12)
    const shakes = startsOf(timesOf(first, beatVoice(SHEEP, 'soaked')))
    expect(shakes).toHaveLength(2)
    for (const at of shakes) expect((at - toy.folk[SHEEP].shownSince) % 2.6).toBeLessThan(0.02)
    wear(toy, GOOSE, BLUE)
    const second = listen(toy, 12)
    const shudders = startsOf(timesOf(second, beatVoice(GOOSE, 'shiver')))
    expect(shudders).toHaveLength(3)
    // Between the shakes and after the last one the body does not lean: the shake is in the pose only while it is heard.
    const since = toy.folk[GOOSE].shownSince
    for (const at of shudders) expect(Math.abs(poseOf(GOOSE, at + 0.3, 'idle', 0, 0, 0, 0, rest(), 'shiver', 0, 0, at + 0.3 - since).b)).toBeGreaterThan(0)
    expect(poseOf(GOOSE, toy.t, 'idle', 0, 0, 0, 0, rest(), 'shiver', 0, 0, toy.t - since).b).toBe(0)
  })

  it('bumps a figure in a white coat three times, each bump heard where its walk turns, and then it stands where it was set', () => {
    const toy = fresh(GREEN, 1, 3)
    wear(toy, PIG, WHITE)
    const heard = listen(toy, 12)
    const bumps = timesOf(heard, beatVoice(PIG, 'blind'))
    expect(bumps).toHaveLength(3)
    const since = toy.folk[PIG].shownSince
    for (const at of bumps) expect(Math.abs(walkOf('blind', at - since, 0, 0, null, walk).x)).toBeGreaterThan(1.5)
    expect(walkOf('blind', 0, 0, 0, null, walk).x).toBe(0)
    expect(walkOf('blind', 11, 0, 0, null, walk).x).toBe(0)
    // The coat's own sound has no bump in it: a bump is heard only when one is seen.
    expect(timesOf(heard.filter((one) => one.at - since < 1), beatVoice(PIG, 'blind'))).toHaveLength(0)
  })

  it('runs every pose of an act from the act\'s own start, and finds a loaded figure at rest and silent', () => {
    expect(sources['./view.ts']).toMatch(/figure\.shown, figure\.turn, figure\.hat, toy\.t - figure\.shownSince\)/)
    expect(sources['./cast.ts']).toMatch(/actInto\(who, act, actAge, p\)/)
    // Nothing an act does at a moment is read from a period of the clock.
    const acts = sources['./cast.ts'].slice(sources['./cast.ts'].indexOf('function actInto'), sources['./cast.ts'].indexOf('export function poseOf'))
    for (const act of ['soaked', 'blind', 'shiver']) expect(acts.split('\n').find((line) => line.includes(`case '${act}'`))).not.toMatch(/burst\(/)
    for (const act of Object.keys(BEATS) as Act[]) expect(beatVoice(SHEEP, act).length, act).toBeGreaterThan(0)
  })
})

describe('ruling 4: the sounds the sheet promises are played, each with its motion', () => {
  const hill = (): Toy => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    listen(toy, 3)
    return toy
  }

  it('muffles a hazed thing\'s own sound, lower and fainter, as the thing gives under the veil', () => {
    const toy = hill()
    daub(toy, WHITE, 10, 39, 20, 43)
    expect(toy.sheet.shapes[0].veil).toBe(WHITE)
    const heard = listen(toy, 1)
    const own = WAKE.hill[0].notes[0], low = muffled(WAKE.hill)[0].notes[0]
    expect(low.frequency).toBeLessThan(own.frequency)
    expect(low.peak).toBeLessThan(own.peak)
    const at = timesOf(heard, muffled(WAKE.hill))
    expect(at).toHaveLength(1)
    expect(timesOf(heard, WAKE.hill)).toHaveLength(0)
    expect(Math.abs(toy.clungAt.get(toy.sheet.shapes[0].id)! - at[0])).toBeLessThan(2 * TICK)
  })

  it('sounds a lit thing as itself, as it gives under the veil', () => {
    const toy = hill()
    daub(toy, YELLOW, 10, 39, 20, 43)
    expect(toy.sheet.shapes[0].veil).toBe(YELLOW)
    const heard = listen(toy, 1)
    const at = timesOf(heard, WAKE.hill)
    expect(at).toHaveLength(1)
    expect(Math.abs(toy.clungAt.get(toy.sheet.shapes[0].id)! - at[0])).toBeLessThan(2 * TICK)
  })

  it('hisses when rain falls on a fire, in the beat where its embers go dull', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, YELLOW, 10, 20, 20, 26)
    settle(toy)
    expect(toy.sheet.shapes[0].kind).toBe('fire')
    listen(toy, 3)
    daub(toy, WHITE, 8, 3, 22, 8)
    expect(toy.show.kind).toBe('rain')
    expect(toy.weather.rains[0].under).toBe(toy.sheet.shapes[0])
    let heardAt = -1, answerAt = -1
    for (let i = 0; i < 6 * 60 && toy.scene; i++) {
      const ticked = listen(toy, TICK)
      if (answerAt < 0 && toy.show.answer > 0) answerAt = toy.t
      if (timesOf(ticked, fireHiss).length > 0) heardAt = toy.t
    }
    expect(heardAt).toBeGreaterThan(0)
    expect(Math.abs(heardAt - answerAt)).toBeLessThan(2 * TICK)
    // The embers follow the same progress in the view.
    expect(sources['./view.ts']).toMatch(/show\.kind === 'rain' \? show\.answer : 1/)
  })
})

describe('ruling 5: no figure is cross, and none gives a verdict on the wool', () => {
  it('has no cross voice and no mood of liking or disliking anywhere in the game', () => {
    expect(Object.keys(MOOD_SECONDS).sort()).toEqual(['idle', 'look', 'poke', 'tickle'])
    for (const name of ['calls', 'cast', 'voices', 'toy', 'folk', 'scenes']) expect(sources[`./${name}.ts`], name).not.toMatch(/'dislike'|\bcross\b/)
    // His wet and hat sounds are a sniff, a drip and a puff: no note of them is his voice.
    const voice = new Set((['look', 'poke'] as const).flatMap((feeling) => folkVoice(SHEPHERD, feeling, 0).flatMap((part) => part.notes.map((note) => note.frequency))))
    for (const cue of [actVoice(SHEPHERD, 'wet'), beatVoice(SHEPHERD, 'hat')]) {
      expect(cue.length).toBeGreaterThan(0)
      for (const part of cue) for (const note of part.notes) expect(voice.has(note.frequency)).toBe(false)
    }
  })

  it('has the sheep under a sun shut its eyes, turn its back to it and pant, with no bleat', () => {
    const bleats = new Set((['look', 'poke'] as const).flatMap((feeling) => folkVoice(SHEEP, feeling, 0).flatMap((part) => part.notes.map((note) => note.frequency))))
    for (const [sunCol, flip] of [[20, true], [34, false]] as const) {
      const toy = fresh(GREEN, 1, 3)
      setDown(toy, SHEEP, 30, 24)
      listen(toy, 3)
      daub(toy, YELLOW, sunCol, 9, sunCol + 6, 14)
      expect(toy.sheet.shapes[toy.sheet.shapes.length - 1].kind).toBe('sun')
      const heard = listen(toy, 2)
      const sheep = toy.folk[SHEEP]
      expect(sheep.act).toBe('squint')
      expect(sheep.mood === 'look' || sheep.mood === 'idle').toBe(true)
      // Its head is at its left as drawn: turned round, its back is to a sun on its left.
      expect(sheep.flip).toBe(flip)
      toy.advance(2)
      const pose = poseNow(toy, SHEEP)
      expect(pose.lid).toBe(1)
      expect(pose.mouth).toBeGreaterThan(0)
      for (const one of heard) expect(bleats.has(one.note.frequency)).toBe(false)
    }
  })

  it('has the sheep in mist shiver and go looking to and fro, with a sound of that and no bleat', () => {
    const walk: Walk = { x: 0, y: 0, flip: false, turn: 0, hat: 0 }
    const xs = [0.9, 1.8, 2.7].map((age) => walkOf('lost', age, 0, 0, null, walk).x)
    expect(Math.max(...xs)).toBeGreaterThan(1)
    expect(Math.min(...xs)).toBeLessThan(-1)
    const a = poseOf(SHEEP, 5, 'idle', 0, 0, 0, 0, rest(), 'lost', 0, 0, 5.01).dx, b = poseOf(SHEEP, 5, 'idle', 0, 0, 0, 0, rest(), 'lost', 0, 0, 5.03).dx
    expect(Math.abs(a - b)).toBeGreaterThan(0.5)
    const bleats = new Set((['look', 'poke'] as const).flatMap((feeling) => folkVoice(SHEEP, feeling, 0).flatMap((part) => part.notes.map((note) => note.frequency))))
    for (const part of actVoice(SHEEP, 'lost')) for (const note of part.notes) expect(bleats.has(note.frequency)).toBe(false)
  })
})
