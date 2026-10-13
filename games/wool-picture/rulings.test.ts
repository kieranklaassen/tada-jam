import { describe, expect, it } from 'vitest'
import { COAT_ACTS, PLACE_ACTS, actOf } from './acts'
import { FLUFF, VEIL, actVoice, bareRasp, beatVoice, coatOn, giggle, rasp } from './calls'
import { MAX_SHAPES } from './config'
import { COLS, GOOSE, PIG, ROWS, SHEEP, SHEPHERD } from './layout'
import { PACE, motionOf, still, travelOf } from './life'
import { dab, fresh } from './probe'
import { record } from './save'
import { freshState } from './state'
import { SIZES } from './toy'
import { WAKE } from './voices'
import { HALF_COLS, HALF_ROWS } from './wall'
import type { Env } from './weather'
import { ALL_KINDS, DYES, KINDS, THICKEST, decode, encode, lay, makeSheet, shapeFor, type Join, type Kind, type Laid, type SavedShape, type Shape } from './wool'

// The lead's rulings on what the toy left unsure, each held by a test that
// names it, and the grid of the sheet: every cell its own motion and sound.

const LIVING = ALL_KINDS.filter((kind) => kind !== 'fluff')
const massOf = (shapes: readonly Shape[]): number => shapes.reduce((sum, shape) => sum + shape.mass, 0)

describe('ruling 1: a small round dab is round', () => {
  it.each([0, 1, 2])('lays a tap of size %i as a round tuft: no diamond, no square, thick in the middle, strands lying every way', (size) => {
    const toy = fresh(3, size)
    dab(toy, 3, 36, 10)
    const shape = toy.sheet.shapes[0], cells = shape.cells, at = (col: number, row: number): number => (col < 0 || row < 0 || col >= COLS || row >= ROWS ? 0 : cells[row * COLS + col] >> 3)
    expect(shape.count).toBe([21, 13, 5][size])
    // As wide as it is high, and the same on every side: turned a quarter about its middle it is the same tuft.
    expect(shape.x1 - shape.x0).toBe(shape.y1 - shape.y0)
    const reach = (shape.x1 - shape.x0) / 2
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) expect(at(36 + dx, 10 + dy) > 0).toBe(at(36 - dy, 10 + dx) > 0)
    // Not a square: the corners of its box are bare. Not a diamond: a disc of that reach has wool beside its arms.
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      expect(at(36 + dx * reach, 10 + dy * reach)).toBe(0)
      if (reach >= 2) expect(at(36 + dx, 10 + dy)).toBeGreaterThan(0)
      if (reach >= 2 && size === 0) expect(at(36 + dx * 2, 10 + dy)).toBeGreaterThan(0)
    }
    // Thick in the middle and thinner at the rim.
    expect(at(36, 10)).toBeGreaterThan(at(36 + reach, 10))
    // Strands lie every way: no quarter turn is without one, so the fleece does not read as a lozenge.
    const ways = [...new Set(Array.from(cells).filter((value) => value > 0).map((value) => value & 7))].sort((a, b) => a - b)
    expect(ways.length).toBeGreaterThanOrEqual(3)
    ways.forEach((way, i) => expect((ways[(i + 1) % ways.length] - way + 8) % 8 || 8).toBeLessThanOrEqual(4))
  })

  it('makes a sun of one tap of yellow high on the sheet with a handful or a tuft', () => {
    for (const size of [0, 1]) {
      const toy = fresh(3, size)
      dab(toy, 3, 36, 8)
      expect(toy.sheet.shapes[0].count).toBeGreaterThanOrEqual(10)
      expect(toy.sheet.shapes[0].kind).toBe('sun')
    }
    expect(SIZES[0].reach).toBeGreaterThan(SIZES[1].reach)
  })
})

describe('ruling 3: the laid wool\'s life is seen', () => {
  /** The least a living shape 240 by 100 travels, in pixels at 1180 by 820, where a stage unit is a pixel. */
  const FLOOR = 12
  it('moves every one of the fifteen kinds by at least twelve pixels at 1180 by 820, and says how far each goes', () => {
    const travel = Object.fromEntries(LIVING.map((kind) => [kind, Math.round(travelOf(kind))]))
    for (const kind of LIVING) expect(travel[kind], kind).toBeGreaterThanOrEqual(FLOOR)
    // The numbers the report gives, kind by kind: a change in life.ts shows here.
    expect(travel).toEqual(TRAVEL)
    // Wool too slight to live only trembles.
    expect(travelOf('fluff')).toBeLessThan(3)
  })

  it('moves a small shape too: a tuft of 60 by 60 travels at least four pixels as whatever it is', () => {
    for (const kind of LIVING) expect(travelOf(kind, 60, 60), kind).toBeGreaterThanOrEqual(4)
  })
})

/** How far each kind travels as it lives, in pixels at 1180 by 820, for a shape 240 wide and 100 high. */
const TRAVEL: Record<string, number> = { hill: 17, bush: 16, treetop: 26, mist: 33, smoke: 24, cloud: 49, pond: 16, stream: 34, wind: 70, corn: 18, fire: 25, sun: 50, earth: 12, trunk: 13, leaves: 37 }

describe('ruling 7: the largest state is under 30 KB', () => {
  const wall = [0, 1, 2].map((peg) => ({ peg, veils: '_'.repeat(HALF_COLS * HALF_ROWS).replace(/_/g, 'j') }))
  const folk = [0, 1, 2, 3].map((who) => ({ at: { col: 60 + who, row: 40 + who }, coat: 4 }))
  const sizeOf = (shapes: SavedShape[]): number => {
    const sheet = decode(shapes)
    expect(encode(sheet)).toEqual(shapes)
    return JSON.stringify(record({ ...freshState(null), position: 'open-felt' }, { sheet, hand: 5, size: 2, finished: false, folk, wall })).length
  }

  it('holds a sheet with every cell seven thick in all five dyes, three pictures on the wall and four figures in coats under 30 KB', () => {
    const sheet = makeSheet()
    for (let dye = 0; dye < DYES; dye++) {
      const laid: Laid[] = [], joins: Join[] = []
      const shape = shapeFor(sheet, dye, 0, 0, 1.5, joins)
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) lay(sheet, shape, col, row, 7, THICKEST, laid, joins)
    }
    const size = sizeOf(encode(sheet))
    expect(size).toBeGreaterThan(17 * 1024)
    expect(size).toBeLessThan(30 * 1024)
  })

  it('holds twenty shapes that cost the most characters a shape can (wool and gap by turns) under 30 KB', () => {
    // Four shapes of each dye, each a comb of single columns eight apart, the four set two apart: no two touch,
    // and every row of every one alternates wool with a run of bare cells.
    const sheet = makeSheet()
    for (let dye = 0; dye < DYES; dye++) {
      for (let part = 0; part < 4; part++) {
        const laid: Laid[] = [], joins: Join[] = []
        const shape = shapeFor(sheet, dye, part * 2, 0, 0.5, joins)
        for (let row = 0; row < ROWS; row++) for (let col = part * 2; col < COLS; col += 8) lay(sheet, shape, col, row, 3, THICKEST, laid, joins)
        expect(joins).toHaveLength(0)
      }
    }
    expect(sheet.shapes).toHaveLength(MAX_SHAPES)
    const striped = sizeOf(encode(sheet))
    expect(striped).toBeLessThan(30 * 1024)
    // One dye with wool on every other cell of every row costs a character a cell, which is the most a dye can cost.
    const one = makeSheet(), laid: Laid[] = [], joins: Join[] = []
    const comb = shapeFor(one, 0, 0, 0, 0.5, joins)
    for (let row = 0; row < ROWS; row++) for (let col = row === 0 ? 0 : row % 2; col < COLS; col += row === 0 ? 1 : 2) lay(one, comb, col, row, 3, THICKEST, laid, joins)
    expect(encode(one)[0].cells.length).toBeLessThanOrEqual(COLS * ROWS)
  })
})

describe('ruling 8: the twenty-first shape', () => {
  /** Forty dabs far enough apart that each would start a shape of its own. */
  const places = Array.from({ length: 40 }, (_, i) => [4 + (i % 8) * 9, 4 + Math.floor(i / 8) * 9] as const)

  it('refuses no touch and loses no wool over forty dabs of one dye', () => {
    const toy = fresh(2, 1)
    let before = 0
    for (const [col, row] of places) {
      dab(toy, 2, col, row)
      const now = massOf(toy.sheet.shapes)
      expect(now).toBeGreaterThan(before)
      // The wool lies where the finger landed, whichever shape took it.
      expect(toy.sheet.owner[2][row * COLS + col]).toBeGreaterThan(0)
      expect(toy.sheet.shapes.length).toBeLessThanOrEqual(MAX_SHAPES)
      before = now
    }
    expect(toy.sheet.shapes).toHaveLength(MAX_SHAPES)
    // Every dab is still on the sheet, cell for cell, after a save and a load.
    const back = decode(JSON.parse(JSON.stringify(encode(toy.sheet))) as unknown)
    expect(massOf(back.shapes)).toBe(before)
    for (const [col, row] of places) expect(back.owner[2][row * COLS + col]).toBeGreaterThan(0)
  })

  it('refuses no touch and loses no wool over forty dabs of the five dyes by turns, and makes room by joining two of one dye', () => {
    const toy = fresh(0, 1)
    let before = 0
    places.forEach(([col, row], i) => {
      const dye = i % DYES
      dab(toy, dye, col, row)
      const now = massOf(toy.sheet.shapes)
      expect(now).toBeGreaterThan(before)
      expect(toy.sheet.owner[dye][row * COLS + col]).toBeGreaterThan(0)
      expect(toy.sheet.shapes.length).toBeLessThanOrEqual(MAX_SHAPES)
      before = now
    })
    expect(toy.sheet.shapes).toHaveLength(MAX_SHAPES)
    // A dye the full sheet has none of still gets a shape of its own: two shapes of another dye were joined for it.
    const only = fresh(0, 1)
    for (const [col, row] of places.slice(0, 20)) dab(only, 0, col, row)
    expect(only.sheet.shapes).toHaveLength(MAX_SHAPES)
    const green = massOf(only.sheet.shapes)
    dab(only, 4, 70, 46)
    expect(only.sheet.shapes).toHaveLength(MAX_SHAPES)
    expect(only.sheet.shapes.filter((shape) => shape.dye === 4)).toHaveLength(1)
    expect(massOf(only.sheet.shapes.filter((shape) => shape.dye === 0))).toBe(green)
  })
})

describe('the grid: every cell has its own motion and sound', () => {
  const signature = (kind: Kind, veil = -1): string => {
    const m = still(), parts: number[] = []
    for (let i = 0; i < 40; i++) { motionOf(kind, i * 0.37, 0, 0, m, veil); parts.push(m.dx, m.dy, m.sx, m.sy, m.skew, m.rot, m.flow, m.flowBy) }
    return parts.map((n) => n.toFixed(3)).join(',')
  }

  it('gives each of the fifteen things laid at a height a motion and a waking sound no other has', () => {
    expect(new Set(LIVING.map((kind) => signature(kind))).size).toBe(15)
    expect(new Set(LIVING.map((kind) => JSON.stringify(WAKE[kind]))).size).toBe(15)
    expect(KINDS.flat()).toHaveLength(15)
  })

  it('gives each of the five veils its own change of pace and its own sound', () => {
    expect(new Set(PACE).size).toBe(5)
    expect(PACE[2]).toBe(1)
    expect(new Set([0, 1, 2, 3, 4].map((veil) => signature('hill', veil))).size).toBe(5)
    expect(new Set(VEIL.map((cue) => JSON.stringify(cue))).size).toBe(5)
  })

  it('gives each of the five coats its own act and sound on each figure, and the comb its own sound at each height', () => {
    expect(new Set(COAT_ACTS).size).toBe(5)
    for (let who = 0; who < 4; who++) {
      expect(new Set([0, 1, 2, 3, 4].map((dye) => JSON.stringify(coatOn(who, dye)))).size).toBe(5)
      for (let dye = 0; dye < 5; dye++) expect(actOf(who, null, dye)).toBe(COAT_ACTS[dye])
    }
    expect(new Set([0, 1, 2, 3].map((who) => JSON.stringify(giggle(who)))).size).toBe(4)
    expect(new Set([0, 1, 2].map((height) => JSON.stringify(rasp(height)))).size).toBe(3)
    expect(new Set([0, 1, 2].map((height) => JSON.stringify(bareRasp(height)))).size).toBe(3)
    expect(new Set(FLUFF.map((cue) => JSON.stringify(cue))).size).toBe(3)
  })
})

describe('the four figures and their fixed tastes', () => {
  const place = (ground: Kind | null, more: Partial<Env> = {}): Env => ({ shape: null, ground, wet: false, dried: false, mud: false, spring: false, mist: false, fire: false, wind: false, trunk: false, sun: false, ...more })

  it('has the sheep graze only green, sag when wet, be lost in mist, sneeze in corn, pant by a fire, and shut its eyes and pant under a sun', () => {
    expect([actOf(SHEEP, place('hill'), null), actOf(SHEEP, place('bush'), null)]).toEqual(['graze', 'graze'])
    expect(['pond', 'stream'].map((ground) => actOf(SHEEP, place(ground as Kind), null))).toEqual(['soaked', 'soaked'])
    expect(actOf(SHEEP, place('hill', { wet: true }), null)).toBe('soaked')
    expect(actOf(SHEEP, place('hill', { mist: true }), null)).toBe('lost')
    expect(actOf(SHEEP, place('corn'), null)).toBe('sneeze')
    expect([actOf(SHEEP, place('hill', { fire: true }), null), actOf(SHEEP, place('earth', { sun: true }), null)]).toEqual(['pant', 'squint'])
    expect(['earth', 'trunk', null].map((ground) => actOf(SHEEP, place(ground as Kind | null), null))).toEqual(['stand', 'stand', 'stand'])
  })

  it('has the goose swim, ride, fly, dance in rain, hiss at a fire and at dry earth, and circle where it has no water', () => {
    expect(actOf(GOOSE, place('pond'), null)).toBe('swim')
    expect(actOf(GOOSE, place('stream'), null)).toBe('ride')
    expect([actOf(GOOSE, place('wind'), null), actOf(GOOSE, place('hill', { wind: true }), null)]).toEqual(['fly', 'fly'])
    expect(actOf(GOOSE, place('hill', { wet: true }), null)).toBe('dance')
    expect([actOf(GOOSE, place('hill', { fire: true }), null), actOf(GOOSE, place('earth'), null)]).toEqual(['hiss', 'hiss'])
    expect(actOf(GOOSE, place('earth', { mud: true }), null)).toBe('circle')
    expect(actOf(GOOSE, place('hill'), null)).toBe('circle')
  })

  it('has the shepherd walk the ridge, sit wet under a cloud, warm himself, chase his hat, doze by a trunk, and look out', () => {
    expect(actOf(SHEPHERD, place('hill'), null)).toBe('ridge')
    expect(actOf(SHEPHERD, place('hill', { wet: true }), null)).toBe('wet')
    expect(actOf(SHEPHERD, place('hill', { fire: true }), null)).toBe('warm')
    expect(actOf(SHEPHERD, place('hill', { wind: true }), null)).toBe('hat')
    expect([actOf(SHEPHERD, place('trunk'), null), actOf(SHEPHERD, place('earth', { trunk: true }), null)]).toEqual(['doze', 'doze'])
    expect(actOf(SHEPHERD, place('pond'), null)).toBe('gaze')
    // A sun dries him: under a cloud whose rain a sun dries he is not wet.
    expect(actOf(SHEPHERD, place('hill', { dried: true }), null)).toBe('ridge')
  })

  it('has the pig wallow in mud, root in dry earth, gobble corn, roll down a hill and fan itself under a sun', () => {
    expect(actOf(PIG, place('earth', { mud: true }), null)).toBe('wallow')
    expect(actOf(PIG, place('earth'), null)).toBe('root')
    expect(actOf(PIG, place('corn'), null)).toBe('gobble')
    expect(actOf(PIG, place('hill'), null)).toBe('roll')
    expect(actOf(PIG, place('pond', { sun: true }), null)).toBe('fan')
    expect(actOf(PIG, place('pond'), null)).toBe('snuffle')
  })

  it('never changes: the same place gives the same act, each act has a voice of its own, and a coat comes before the place', () => {
    for (let who = 0; who < 4; who++) {
      expect(new Set(PLACE_ACTS[who]).size).toBe(who === SHEEP ? 7 : 6)
      expect(new Set(PLACE_ACTS[who].map((act) => JSON.stringify([actVoice(who, act), beatVoice(who, act)]))).size).toBe(PLACE_ACTS[who].length)
      for (const kind of ALL_KINDS) {
        const first = actOf(who, place(kind), null)
        expect(actOf(who, place(kind), null)).toBe(first)
        expect(first === 'dish' ? [] : PLACE_ACTS[who]).toContain(first)
        expect(actOf(who, place(kind, { wet: true }), 2)).toBe('shiver')
      }
      expect(actOf(who, null, null)).toBe('dish')
    }
  })
})
