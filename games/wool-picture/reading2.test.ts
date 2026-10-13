import { describe, expect, it } from 'vitest'
import { COAT_ACTS, PLACE_ACTS, walkOf, type Act, type Walk } from './acts'
import type { Note } from './audio'
import { actVoice, beatVoice, coatOn, combTeeth, rainFirst, settleOnPeg } from './calls'
import { MOOD_SECONDS, poseOf, rest, type Mood } from './cast'
import type { Ctx } from './felted'
import { SHEEP_CURLS, opensToward } from './folkArt'
import { BOWLS, CELL, COMB, COMB_HAND, FELT, FIGURE, FOLK, GOOSE, ON_SHEET, PEGS, PIG, SHEEP, SHEPHERD, perchOn } from './layout'
import { cell, dab, daub, fresh, hangUp, setDown, settle, standIn, tally } from './probe'
import { rainPath } from './sky'
import { makeRng } from './rng'
import { TICK, Toy, WAG_AFTER } from './toy'
import { WAKE, cloudPatter, folkVoice, roomPat, type Cue } from './voices'
import { canRain, dropColumn, rainedOn } from './weather'
import { BLUE, GREEN, RUSSET, WHITE, lay, shapeFor } from './wool'

// The close of the second reading, first half: one test for each ruling the
// game's model holds, each written so that it fails when the fix is taken
// out. The hands, the ladder and the view are in reading2View.test.ts.

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

type Heard = { at: number; note: Note }
const same = (a: Note, b: Note): boolean => a.kind === b.kind && a.frequency === b.frequency && a.peak === b.peak && a.attack === b.attack && a.decay === b.decay && a.glideTo === b.glideTo
const take = (toy: Toy): Note[] => [...(toy.takeSounds() ?? []), ...(toy.takeSceneSounds() ?? [])]
/** Plays `seconds` a tick at a time, and returns every note with the toy's time in the tick that released it. */
function listen(toy: Toy, seconds: number, each?: () => void): Heard[] {
  const heard: Heard[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    toy.advance(TICK)
    for (const note of take(toy)) heard.push({ at: toy.t, note })
    each?.()
  }
  return heard
}
const hears = (heard: readonly Heard[], note: Note): boolean => heard.some((one) => same(one.note, note))
const firstOf = (cue: Cue): Note => cue[0].notes[0]

/** Where the drops of the rain are drawn now: the start of every stroke the rain adds to its path. */
function drops(toy: Toy): { any: boolean; at: { x: number; y: number }[] } {
  const c = standIn(tally()), at: { x: number; y: number }[] = []
  ;(c as unknown as { moveTo: (x: number, y: number) => void }).moveTo = (x, y) => { at.push({ x, y }) }
  return { any: rainPath(c as Ctx, toy, () => 0), at }
}

describe('ruling 1: a tapped cloud rains', () => {
  it('rains under one tap of a handful or of a tuft of white laid high, wherever in a cell the finger lands', () => {
    for (const size of [0, 1]) for (let i = 0; i < 25; i++) {
      const toy = fresh(WHITE, size, 3 + i)
      toy.press({ x: FELT.x + 300 + (i % 5) * 2, y: FELT.y + 60 + Math.floor(i / 5) * 2 })
      toy.end('tap')
      const cloud = toy.sheet.shapes[0]
      expect(cloud.kind, `size ${size}, tap ${i}`).toBe('cloud')
      expect(canRain(cloud)).toBe(true)
      expect(toy.weather.rains.map((rain) => rain.cloud)).toEqual([cloud])
      toy.advance(TICK)
      expect(drops(toy).any).toBe(true)
    }
  })

  it('sounds the patter after the swell when its drops are drawn, in the tick they are', () => {
    const toy = fresh(WHITE, 0, 3)
    dab(toy, WHITE, 30, 6)
    let drawn = true
    const heard = listen(toy, 2, () => { drawn = drawn && drops(toy).any })
    expect(hears(heard, firstOf(WAKE.cloud))).toBe(true)
    expect(hears(heard, firstOf(cloudPatter))).toBe(true)
    expect(drawn).toBe(true)
  })

  it('wakes a cloud too thin to rain with its swell and no patter, and draws no drop under it', () => {
    const toy = fresh(GREEN, 0, 3)
    // White laid one level thick, high up: a cloud, and too thin to rain. A tap of green elsewhere has the sheet read again.
    const thin = shapeFor(toy.sheet, WHITE, 20, 4, 1.5, toy.joins)
    for (let row = 4; row <= 7; row++) for (let col = 20; col <= 31; col++) lay(toy.sheet, thin, col, row, 0, 1, toy.laid, toy.joins)
    dab(toy, GREEN, 60, 44)
    expect(thin.kind).toBe('cloud')
    expect(canRain(thin)).toBe(false)
    expect(toy.weather.rains).toHaveLength(0)
    let drawn = false
    const heard = listen(toy, 2, () => { drawn = drawn || drops(toy).any })
    expect(hears(heard, firstOf(WAKE.cloud))).toBe(true)
    expect(hears(heard, firstOf(cloudPatter))).toBe(false)
    expect(drawn).toBe(false)
    // One more level under a finger, and it rains.
    dab(toy, WHITE, 25, 5)
    expect(canRain(thin)).toBe(true)
    expect(toy.weather.rains).toHaveLength(1)
  })

  it('leaves the patter to the scene where the cloud is laid over a thing: no drop sounds before one is drawn', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    take(toy)
    daub(toy, WHITE, 8, 3, 22, 8)
    expect(toy.show.kind).toBe('rain')
    const began = toy.t
    let drawnAt = -1
    const heard = listen(toy, 5.5, () => { if (drawnAt < 0 && drops(toy).any) drawnAt = toy.t })
    expect(hears(heard, firstOf(cloudPatter))).toBe(false)
    // The scene's first drop is heard as the first drop is drawn, a second or so after the cloud has gathered.
    const first = heard.find((one) => same(one.note, firstOf(rainFirst)))!
    expect(drawnAt - began).toBeGreaterThan(1)
    expect(Math.abs(first.at - drawnAt)).toBeLessThan(2.5 * TICK)
  })
})

describe('ruling 2: a figure set down under falling rain does not restart the scene', () => {
  /** Earth with a cloud over it, the rain's scene played out: it rains steadily and the earth is mud. */
  const rainy = (): Toy => {
    const toy = fresh(RUSSET, 1, 3)
    daub(toy, RUSSET, 20, 40, 50, 45)
    settle(toy)
    daub(toy, WHITE, 22, 3, 48, 8)
    expect(toy.show.kind).toBe('rain')
    settle(toy)
    toy.advance(1)
    take(toy)
    return toy
  }

  it.each([[SHEEP, 'soaked'], [GOOSE, 'dance'], [SHEPHERD, 'wet'], [PIG, 'wallow']] as const)('figure %i: the rain goes on, the mud stays wet, and it begins "%s" when a drop reaches it', (who, wetAct) => {
    const toy = rainy(), earth = toy.sheet.shapes.find((shape) => shape.kind === 'earth')!, rain = toy.weather.rains[0]
    setDown(toy, who, 35, 41)
    const figure = toy.folk[who], t0 = toy.t
    // No scene: the rain is not taken back to its first drops, and the mud is not dried to be wetted again.
    expect(toy.scene).toBeNull()
    expect([toy.show.kind, toy.show.fall, toy.show.answer, toy.show.gather]).toEqual(['none', 1, 1, 1])
    expect(rainedOn(toy.weather, earth)).toBe(true)
    expect(figure.act).toBe(wetAct)
    expect([figure.rainBy, figure.reached]).toEqual([rain.cloud.id, false])
    take(toy)
    const head = FELT.y + (figure.at!.row + 1) * CELL - FIGURE[who].h * ON_SHEET, column = FELT.x + (dropColumn(rain, figure.at!.col) + 0.5) * CELL
    let began = -1
    for (let i = 0; i < 40 && began < 0; i++) {
      toy.advance(TICK)
      const heard = take(toy), fall = drops(toy)
      expect(toy.scene).toBeNull()
      expect(fall.any).toBe(true)
      if (figure.shown !== wetAct) { expect(figure.shown).toBe('dish'); expect(heard).toHaveLength(0); continue }
      began = toy.t
      // In the tick it begins, a drop is at its head, and the doing is heard.
      expect(fall.at.some((drop) => drop.x === column && Math.abs(drop.y - head) < 14)).toBe(true)
      const voice = [...actVoice(who, wetAct), ...beatVoice(who, wetAct)].filter((part) => part.after <= 0).flatMap((part) => part.notes)
      expect(voice.length).toBeGreaterThan(0)
      for (const note of voice) expect(heard.some((one) => same(one, note))).toBe(true)
    }
    // All four alike: within the third of a second a drop takes to come round.
    expect(began - t0).toBeGreaterThan(0)
    expect(began - t0).toBeLessThanOrEqual(1 / 3 + 2 * TICK)
  })

  it('still plays the rain for a cloud laid over a figure, and the figure goes on as it was until the first drops reach it', () => {
    const toy = fresh(GREEN, 1, 3)
    setDown(toy, SHEPHERD, 30, 40)
    toy.advance(2)
    expect(toy.folk[SHEPHERD].shown).toBe('gaze')
    daub(toy, WHITE, 24, 3, 36, 8)
    expect(toy.show.kind).toBe('rain')
    const order: Act[] = []
    listen(toy, 5.5, () => {
      const shown = toy.folk[SHEPHERD].shown
      if (order[order.length - 1] !== shown) order.push(shown)
      // He does nothing about rain that has not begun to fall.
      if (toy.show.kind === 'rain' && toy.show.fall <= 0) expect(shown).toBe('gaze')
    })
    expect(order).toEqual(['gaze', 'feel', 'wet'])
  })

  it('finds a figure that was left in the rain already doing what the rain makes it do, without a sound', () => {
    const toy = rainy()
    setDown(toy, SHEEP, 35, 41)
    // Put away before the drop came, and opened again: nothing is left waiting for one.
    const again = new Toy(toy.sheet, toy.hand, toy.size, makeRng(1), { folk: toy.folk.map((figure) => ({ at: figure.at, coat: figure.coat })), wall: [], finished: false })
    expect([again.folk[SHEEP].shown, again.folk[SHEEP].reached]).toEqual(['soaked', true])
    again.advance(1)
    expect(take(again)).toHaveLength(0)
    expect(again.folk[SHEEP].shown).toBe('soaked')
  })
})

describe('ruling 4: the touch that ends the evening does nothing else, wherever it lands', () => {
  const evening = (after: number): Toy => {
    const toy = fresh(GREEN, 1, 5)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    hangUp(toy)
    expect(toy.show.kind).toBe('evening')
    toy.advance(after)
    take(toy)
    return toy
  }
  const spots: [string, (toy: Toy) => { x: number; y: number }][] = [
    ['another bowl', () => ({ x: BOWLS[2].x, y: BOWLS[2].y - 16 })],
    ['the bowl that is chosen', () => ({ x: BOWLS[0].x, y: BOWLS[0].y - 16 })],
    ['the comb', () => ({ x: COMB.x, y: COMB.y })],
    ['a figure in the dish', () => ({ x: FOLK[PIG].x, y: FOLK[PIG].y - FOLK[PIG].h / 2 })],
    ['where the moth will sit', (toy) => perchOn(toy.show.peg)],
    ['a peg', () => PEGS[2]],
  ]

  it.each(spots)('on %s it chooses nothing, pokes nobody and sends no moth off: the frame lands, or the room is patted', (_name, spot) => {
    for (const [after, landed] of [[0.5, false], [4, true]] as const) {
      const toy = evening(after)
      expect(toy.show.swing < 1).toBe(!landed)
      const at = spot(toy)
      toy.press(at)
      const heard = take(toy)
      toy.end('tap')
      expect(toy.scene).toBeNull()
      expect([toy.finished, toy.hand, toy.size]).toEqual([true, GREEN, 1])
      expect(toy.folk.map((figure) => [figure.pokes, figure.mood === 'poke'])).toEqual([[0, false], [0, false], [0, false], [0, false]])
      expect([toy.moth.flying, toy.moth.perch]).toEqual([null, 3 + toy.show.peg])
      expect(toy.knocked.filter((at) => at > 0)).toHaveLength(landed ? 0 : 1)
      // Its one answer: the frame landing on its peg, or a pat and three motes of lint where it fell.
      expect(heard.some((note) => same(note, landed ? roomPat[0] : settleOnPeg[0]))).toBe(true)
      expect(heard).toHaveLength(landed ? roomPat.length : settleOnPeg.length)
      expect(toy.floaters.filter((floater) => floater.dye < 0 && floater.x === at.x)).toHaveLength(landed ? 3 : 0)
      // The evening is not dead: the next touch is an ordinary one, and pokes the pig.
      toy.press({ x: FOLK[PIG].x, y: FOLK[PIG].y - FOLK[PIG].h / 2 }); toy.end('tap')
      expect(toy.folk[PIG].pokes).toBe(1)
    }
  })
})

describe('rulings 6 and 7: an act sounds as what is done, and no figure has a pleased voice or a complaint', () => {
  /** A note that is in a figure's own voice: a tone of the wave it speaks in, within 15 in a hundred of one of its notes. */
  const inVoice = (who: number, note: Note): boolean => {
    const voice = (['look', 'poke'] as const).flatMap((feeling) => [0, 1, 2].flatMap((variant) => folkVoice(who, feeling, variant))).flatMap((part) => part.notes)
    return note.kind === 'tone' && voice.some((own) => own.kind === 'tone' && (own.wave ?? 'sine') === (note.wave ?? 'sine') && Math.abs(note.frequency / own.frequency - 1) < 0.15)
  }
  const notesOf = (cue: Cue): Note[] => cue.flatMap((part) => part.notes)
  /** What a place a figure is drawn to makes it do, by figure. */
  const DRAWN: readonly (readonly Act[])[] = [['graze'], ['swim', 'ride', 'fly', 'dance'], ['ridge', 'warm', 'doze'], ['wallow', 'root', 'gobble', 'roll']]
  /** What weather or a place it has nothing in makes it do. */
  const UNWANTED: readonly (readonly Act[])[] = [['soaked', 'lost', 'sneeze', 'squint', 'pant'], ['hiss'], ['wet', 'hat'], ['fan']]

  it('ends no act in a voice: on a place a figure is drawn to, and in weather it did not want, every note is of the doing', () => {
    for (let who = 0; who < 4; who++) for (const act of [...DRAWN[who], ...UNWANTED[who]]) {
      const all = [...notesOf(actVoice(who, act)), ...notesOf(beatVoice(who, act))]
      expect(all.length, act).toBeGreaterThan(0)
      for (const note of all) expect(inVoice(who, note), `${act}: ${note.frequency}`).toBe(false)
    }
    // Every act of every figure is one of these, or one of the three plain ones in which it only looks about.
    for (let who = 0; who < 4; who++) for (const act of PLACE_ACTS[who]) {
      if (DRAWN[who].includes(act) || UNWANTED[who].includes(act)) continue
      expect(['stand', 'circle', 'gaze', 'snuffle']).toContain(act)
      expect(actVoice(who, act)).toEqual(folkVoice(who, 'look', 0))
    }
  })

  it('has no voice but the plain one and the poked one, in a coat too', () => {
    expect(sources['./voices.ts']).toMatch(/export type Feeling = 'look' \| 'poke'\n/)
    for (const name of Object.keys(sources)) if (!name.endsWith('.test.ts')) expect(sources[name], name).not.toMatch(/'love'|\bglad\b = /)
    // Where a coat's sound has a note in the wearer's voice, it is a note of its plain voice, as it is: never a brighter one.
    for (let who = 0; who < 4; who++) for (let dye = 0; dye < 5; dye++) {
      const plain = notesOf(folkVoice(who, 'look', dye))
      for (const note of notesOf(coatOn(who, dye))) if (inVoice(who, note)) expect(plain.some((own) => same(own, note)), `figure ${who}, dye ${dye}`).toBe(true)
    }
  })

  it('has the shepherd sit down in the rain with a sniff, a drip and a thump, and no grumble', () => {
    const cue = actVoice(SHEPHERD, 'wet'), all = notesOf(cue)
    const sniff = cue.find((part) => part.notes.some((note) => note.kind === 'noise'))!, low = cue.filter((part) => part.notes.some((note) => note.kind === 'tone' && note.frequency < 400))
    const drip = cue.find((part) => part.after > sniff.after && part.notes.some((note) => note.kind === 'tone' && note.frequency >= 600 && (note.glideTo ?? note.frequency) < note.frequency))
    expect(sniff.after).toBeGreaterThan(0.3)
    expect(drip).toBeDefined()
    // The one low note is the thump as he sits, and it comes last.
    expect(low).toHaveLength(1)
    expect(low[0].after).toBe(Math.max(...cue.map((part) => part.after)))
    expect(all.some((note) => note.wave === 'triangle')).toBe(false)
    expect(sources['./calls.ts']).not.toMatch(/grumble/)
  })
})

describe('ruling 11: the comb wriggles once when the first shape wakes', () => {
  it('wriggles on the table a moment after the first thing wakes, with the tick of its teeth in the same tick, and never again', () => {
    const toy = fresh(GREEN, 1, 3)
    expect(toy.combWag).toBe(-10)
    daub(toy, GREEN, 6, 38, 30, 44)
    const woke = toy.t
    let began = -1
    const heard = listen(toy, 2, () => { if (began < 0 && toy.combWag >= 0) began = toy.t })
    expect(toy.combWag).toBe(began)
    expect(Math.abs(began - woke - WAG_AFTER)).toBeLessThan(1.5 * TICK)
    const ticks = heard.filter((one) => same(one.note, firstOf(combTeeth)))
    expect(ticks.map((one) => one.at)[0]).toBe(began)
    // A second thing wakes: the comb lies still.
    daub(toy, BLUE, 40, 40, 56, 45)
    expect(toy.sheet.shapes[1].kind).toBe('pond')
    const later = listen(toy, 2)
    expect(toy.combWag).toBe(began)
    expect(later.some((one) => same(one.note, firstOf(combTeeth)))).toBe(false)
  })

  it('does not wriggle when the comb is taken up between the waking and the wriggle', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    toy.advance(WAG_AFTER / 3)
    toy.hand = COMB_HAND
    const heard = listen(toy, 2)
    expect(toy.combWag).toBe(-10)
    expect(heard.some((one) => same(one.note, firstOf(combTeeth)))).toBe(false)
  })

  it('does not wriggle in the hand: a comb that is chosen when the first thing wakes has been found', () => {
    const toy = fresh(COMB_HAND, 1, 3)
    const pond = shapeFor(toy.sheet, BLUE, 40, 40, 1.5, toy.joins)
    for (let row = 40; row <= 44; row++) for (let col = 40; col <= 50; col++) lay(toy.sheet, pond, col, row, 0, 3, toy.laid, toy.joins)
    // The comb on that wool: the sheet is read again when it lifts, and the pond wakes.
    toy.press(cell(45, 42)); toy.end('tap')
    expect(toy.hand).toBe(COMB_HAND)
    expect(pond.kind).toBe('pond')
    listen(toy, 2)
    expect(toy.combWag).toBe(-10)
    // It was the first thing of the visit to wake, and the comb's one wriggle is not kept for later.
    daub(toy, GREEN, 6, 38, 30, 44)
    listen(toy, 2)
    expect(toy.combWag).toBe(-10)
  })
})

describe('ruling 12: no curl on the sheep opens to the right, however the sheep leans', () => {
  /** The furthest the sheep's body leans in an act, over twelve seconds of it and in every mood. */
  const leanOf = (act: Act): number => {
    const walk: Walk = { x: 0, y: 0, flip: false, turn: 0, hat: 0 }, pose = rest()
    let most = 0
    for (const mood of Object.keys(MOOD_SECONDS) as Mood[]) for (let i = 0; i < 1200; i++) {
      const t = i / 100, turn = walkOf(act, t, 0, 0, null, walk).turn
      most = Math.max(most, Math.abs(poseOf(SHEEP, t, mood, t % 1.3, 0, 0, i % 3, pose, act, turn, 0, t).lean))
    }
    return most
  }

  it('keeps every curl clear of level and of upright at the end of the sheep\'s furthest lean: dangling from the hand, and shaking itself', () => {
    const acts: Act[] = [...PLACE_ACTS[SHEEP], ...COAT_ACTS, 'held', 'dish']
    const dangling = (leanOf('held') * 180) / Math.PI, furthest = (Math.max(...acts.map(leanOf)) * 180) / Math.PI
    // In the hand it swings by about nine degrees each way, and nothing it does leans it further than a shake.
    expect(dangling).toBeGreaterThan(8)
    expect(furthest).toBeGreaterThanOrEqual(dangling)
    const off = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180)
    for (const [, , , turn] of SHEEP_CURLS) {
      const opens = opensToward(turn)
      for (const facing of [opens, (540 - opens) % 360]) for (const lean of [-furthest, -dangling, 0, dangling, furthest]) {
        const way = facing + lean
        expect(off(way, 0), `opens toward ${Math.round(way)}`).toBeGreaterThanOrEqual(50)
        for (const upright of [90, 270]) expect(off(way, upright), `opens toward ${Math.round(way)}`).toBeGreaterThanOrEqual(15)
      }
    }
  })
})
