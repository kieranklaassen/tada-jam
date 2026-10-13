import { describe, expect, it } from 'vitest'
import { PLACE_ACTS, type Act } from './acts'
import { Carry } from './carry'
import { rest } from './cast'
import { figureAt, makeFolk } from './folk'
import { FIGURE, FOLK, GOOSE, LEAST_FIGURE, MOTH_REACH, PIG, SHEEP, SHEPHERD, folkBox, grownUpCorner, homeControl, inBox, overlaps, spotAt, touchables, type Box } from './layout'
import { still } from './life'
import { cell, daub, fresh, setDown, settle, standIn, tally } from './probe'
import { steady } from './scenes'
import { fit } from './stage'
import { TICK, type Toy } from './toy'
import { BLUE, GREEN, KINDS, RUSSET, WHITE, YELLOW } from './wool'

// Sight follows the model (lesson 3): every value the model computes for
// showing is read where it is drawn, and a thing answers a touch where it is
// drawn, in every state it can be in. The surface is 2D, so "nothing passes
// through anything" is held here too, as tests of where things rest.

const sources = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768]]
/** Everything that draws: the view and what it calls. */
const DRAWN = ['view', 'lit', 'sky', 'carry', 'patches', 'folkDraw', 'fixtures'].map((name) => sources[`./${name}.ts`]).join('\n')

describe('lesson 3: every value the model computes for showing is read by the view', () => {
  it('reads every part of a pose, of the moth\'s pose and of a shape\'s motion where it is drawn', () => {
    for (const field of Object.keys(rest())) expect(sources['./folkDraw.ts'], `pose.${field}`).toContain(`pose.${field}`)
    for (const field of ['wing', 'feeler', 'bob', 'bite']) expect(sources['./folkDraw.ts'], field).toContain(`pose.${field}`)
    for (const field of Object.keys(still())) expect(sources['./patches.ts'] + sources['./view.ts'], `m.${field}`).toMatch(new RegExp(`\\bm\\.${field}\\b|\\)\\.${field}\\b`))
  })

  it('reads every part of a figure that says where and how it is drawn, and every part of a scene\'s progress', () => {
    // What a figure holds for showing. The rest of it (when its act began, the shape its walk follows, its count of pokes,
    // what it looks at, its act before a scene changes it) feeds these, inside the model.
    const shown = ['at', 'coat', 'x', 'y', 'scale', 'flip', 'turn', 'hat', 'mood', 'moodSince', 'variant', 'gazeX', 'gazeY', 'hop', 'coatAt', 'mist', 'mistTop', 'dried', 'wade', 'errand', 'shown', 'shownSince']
    const inner = ['act', 'geo', 'pokes', 'lookAt', 'driedBy', 'wetAct', 'rainBy', 'reached', 'before', 'way', 'dropAt', 'sunSide', 'beats']
    expect([...shown, ...inner].sort()).toEqual(Object.keys(makeFolk([0, 1, 2, 3].map(() => ({ at: null, coat: null })))[0]).sort())
    for (const field of shown) expect(DRAWN, `figure.${field}`).toMatch(new RegExp(`(figure|goose)\\.${field}\\b`))
    // A scene's progress: every part is read by the view, or by the model on the view's behalf (the light, the tuft that springs).
    const byModel: Record<string, string> = { dusk: 'scenes', dawn: 'scenes', spring: 'toy' }
    for (const field of Object.keys(steady())) {
      if (byModel[field]) expect(sources[`./${byModel[field]}.ts`], field).toMatch(new RegExp(`show\\.${field}\\b`))
      else expect(DRAWN, `show.${field}`).toMatch(new RegExp(`show\\.${field}\\b`))
    }
    for (const field of ['x', 'y', 'turn', 'flying', 'orbit', 'biteAt']) expect(sources['./view.ts'], `moth.${field}`).toContain(`toy.moth.${field}`)
    for (const field of ['x', 'y', 'born', 'dye', 'spin', 'size']) expect(sources['./view.ts'], `floater.${field}`).toContain(`floater.${field}`)
    for (const field of ['x', 'y', 'born', 'height']) expect(sources['./sky.ts'], `nap.${field}`).toContain(`nap.${field}`)
  })
})

/** A country with every ground a figure has a taste for, and weather over part of it. */
function everywhere(): Toy {
  const toy = fresh(GREEN, 1, 11)
  daub(toy, GREEN, 2, 38, 18, 44)
  daub(toy, RUSSET, 22, 40, 32, 45)
  // The pond touches the earth, so the earth beside it is mud.
  daub(toy, BLUE, 33, 38, 46, 44)
  daub(toy, YELLOW, 50, 40, 58, 45)
  daub(toy, BLUE, 30, 24, 48, 26)
  daub(toy, BLUE, 50, 4, 66, 6)
  daub(toy, WHITE, 4, 3, 16, 8)
  daub(toy, RUSSET, 62, 20, 65, 34)
  daub(toy, YELLOW, 8, 22, 13, 27)
  daub(toy, WHITE, 60, 40, 70, 45)
  // Dry earth, away from the water and the rain.
  daub(toy, RUSSET, 48, 34, 58, 36)
  daub(toy, YELLOW, 36, 3, 41, 8)
  settle(toy)
  return toy
}

/** Places that bring out each figure's acts: a cell to stand on. */
const STANDS: readonly (readonly [number, number])[] = [[8, 41], [27, 43], [70, 10], [53, 35], [38, 17], [41, 41], [54, 43], [38, 25], [58, 6], [63, 30], [11, 26], [65, 43], [20, 20], [18, 27]]

describe('lesson 3: a thing is touched where it is drawn, in every state', () => {
  it('finds each figure under a finger at the middle of where it is drawn, through every act its places bring out and every walk', () => {
    const seen: Set<Act>[] = [new Set(), new Set(), new Set(), new Set()]
    for (const who of [SHEEP, GOOSE, SHEPHERD, PIG]) {
      for (const [col, row] of STANDS) {
        const toy = everywhere()
        setDown(toy, who, col, row)
        settle(toy)
        for (let i = 0; i < 480; i++) {
          toy.advance(TICK * 2)
          const figure = toy.folk[who]
          seen[who].add(figure.act)
          if (i % 6) continue
          const middle = { x: figure.x, y: figure.y - (Math.max(LEAST_FIGURE, FIGURE[who].h * figure.scale)) / 2 }
          expect(figureAt(toy, middle), `figure ${who} doing ${figure.act} at ${col},${row}`).toBe(who)
        }
      }
      // In a coat of each dye too, and in the dish.
      for (let dye = 0; dye < 5; dye++) {
        const toy = everywhere()
        setDown(toy, who, 20, 30)
        toy.hand = dye
        toy.press({ x: toy.folk[who].x - 70, y: toy.folk[who].y - 25 })
        toy.move({ x: toy.folk[who].x, y: toy.folk[who].y - 25 })
        toy.advance(TICK)
        toy.end('dragEnd')
        expect(toy.folk[who].coat).toBe(dye)
        for (let i = 0; i < 300; i++) {
          toy.advance(TICK * 2)
          const figure = toy.folk[who]
          seen[who].add(figure.act)
          if (i % 6 === 0) expect(figureAt(toy, { x: figure.x, y: figure.y - 40 }), `figure ${who} in coat ${dye}`).toBe(who)
        }
      }
      const dish = fresh()
      dish.advance(1)
      expect(figureAt(dish, { x: FOLK[who].x, y: FOLK[who].y - FOLK[who].h / 2 })).toBe(who)
    }
    // Every act of every figure was reached, so every one of them was touched where it was drawn.
    for (const who of [SHEEP, GOOSE, SHEPHERD, PIG]) for (const act of PLACE_ACTS[who]) expect([...seen[who]], `figure ${who}`).toContain(act)
  })

  it('finds a figure where it is drawn while it hops home, and the goose while it is away on its errand', () => {
    const toy = everywhere()
    setDown(toy, PIG, 27, 43)
    toy.press({ x: toy.folk[PIG].x, y: toy.folk[PIG].y - 20 })
    toy.move({ x: 900, y: 420 }); toy.advance(TICK); toy.move({ x: 900, y: 420 })
    toy.end('dragEnd')
    for (let i = 0; i < 20; i++) {
      toy.advance(TICK)
      if (toy.folk[PIG].hop) expect(figureAt(toy, { x: toy.folk[PIG].x, y: toy.folk[PIG].y - 40 })).toBe(PIG)
    }
    toy.advance(1)
    expect(figureAt(toy, { x: FOLK[PIG].x, y: FOLK[PIG].y - 60 })).toBe(PIG)
  })

  it('finds the moth where it is drawn whenever it sits, and nowhere while it flies', () => {
    const toy = fresh()
    for (let i = 0; i < 400; i++) {
      toy.advance(TICK)
      if (i === 50 || i === 220) { toy.press(toy.mothAt()!); toy.end('tap') }
      const sits = toy.mothAt()
      if (sits) { expect(sits).toEqual({ x: toy.moth.x, y: toy.moth.y }); expect(spotAt({ x: toy.moth.x + MOTH_REACH - 2, y: toy.moth.y }, sits)).toEqual({ on: 'moth' }) }
      else expect(toy.moth.flying).not.toBeNull()
    }
  })
})

describe('ruling 2: kinds of one dye are told apart in a still by what they carry', () => {
  it('stitches a different set of marks on each of the three kinds of every dye, at one frozen moment', () => {
    for (let dye = 0; dye < 5; dye++) {
      const marks = [0, 1, 2].map((height) => {
        const toy = fresh(dye)
        const row = [40, 24, 6][height]
        daub(toy, dye, 20, row - 2, 36, row + 3)
        const shape = toy.sheet.shapes[0]
        expect(shape.kind).toBe(KINDS[dye][height])
        const into = tally()
        new Carry().marks(standIn(into), shape, 3.21, 0, [], 1)
        expect(into.draws).toBe(0)
        return JSON.stringify(Object.entries(into.calls).sort())
      })
      expect(new Set(marks).size, `dye ${dye}: ${marks.join(' / ')}`).toBe(3)
      for (const mark of marks) expect(mark).not.toBe('[]')
    }
  })

  it('stitches a different mark for each of the five veils, and shows rain on a thing as wet', () => {
    const toy = fresh(GREEN)
    daub(toy, GREEN, 20, 38, 36, 43)
    const shape = toy.sheet.shapes[0], carry = new Carry()
    const marks = [0, 1, 2, 3, 4].map((veil) => { const into = tally(); carry.veil(standIn(into), shape, veil, 1.3, 1); return JSON.stringify(Object.entries(into.calls).sort()) })
    expect(new Set(marks).size).toBe(5)
    // What a thing carries changes with the weather on it: a fire sinks, earth bubbles.
    for (const [dye, row] of [[YELLOW, 24], [RUSSET, 40]] as const) {
      const other = fresh(dye)
      daub(other, dye, 20, row - 2, 36, row + 3)
      const dry = tally(), wet = tally()
      carry.marks(standIn(dry), other.sheet.shapes[0], 1.3, 0, [], 1)
      carry.marks(standIn(wet), other.sheet.shapes[0], 1.3, 1, [], 1)
      expect(JSON.stringify(wet.calls)).not.toBe(JSON.stringify(dry.calls))
    }
  })
})

describe('the gate: 48 px for everything a child touches, and nothing of the child\'s under the shell\'s controls', () => {
  it.each(SURFACES)('gives every touchable at least 48 px each way at %i by %i', (width, height) => {
    const scale = fit(width, height).scale
    for (const { name, box } of touchables()) expect(Math.min(box.w, box.h) * scale, name).toBeGreaterThanOrEqual(48)
    // A figure in the picture answers on at least 80 by 80 stage units, wherever its walk has taken it.
    expect(LEAST_FIGURE * scale).toBeGreaterThanOrEqual(48)
  })

  it.each(SURFACES)('keeps a figure in the picture, the loop in the hand and the comb at work clear of the home control and the corner at %i by %i', (width, height) => {
    const home = homeControl(width, height), corner = grownUpCorner(width, height), toy = everywhere()
    for (const who of [SHEEP, GOOSE, SHEPHERD, PIG]) { setDown(toy, who, 36 + who * 6, 6); settle(toy) }
    for (let i = 0; i < 300; i++) {
      toy.advance(TICK * 2)
      for (const box of toy.boxes()) {
        // A walk may carry a figure up to the frame's top edge; the part of it a finger can reach is on the sheet.
        expect(overlaps(box, corner)).toBe(false)
        if (overlaps(box, home)) expect(box.y + box.h).toBeGreaterThan(home.y + home.h + 48 / fit(width, height).scale)
      }
    }
  })
})

describe('nothing passes through anything: where things rest', () => {
  const boxes = (): { name: string; box: Box }[] => touchables().filter(({ name }) => !name.startsWith('the moth') && !name.startsWith('the picture') && name !== 'the sheet inside its frame')

  it('keeps the resting places apart: bowls, comb, loop, pegs and the four figures in the dish', () => {
    const all = boxes()
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i].box, all[j].box), `${all[i].name} and ${all[j].name}`).toBe(false)
    // A hung picture covers its own peg and nothing else.
    const pictures = touchables().filter(({ name }) => name.startsWith('the picture'))
    for (const picture of pictures) for (const other of all) if (!other.name.startsWith('peg')) expect(overlaps(picture.box, other.box), `${picture.name} and ${other.name}`).toBe(false)
    for (let i = 0; i < pictures.length; i++) for (let j = i + 1; j < pictures.length; j++) expect(overlaps(pictures[i].box, pictures[j].box)).toBe(false)
  })

  it('ruling 6: shows every figure\'s face and most of its body in the first frame: no figure stands in front of another\'s', () => {
    // The face of each figure, as a box of the stage, from where its head is drawn at its size in the dish.
    const FACE: readonly { x: number; y: number; w: number; h: number }[] = [
      { x: -80 - 34, y: -100 - 30, w: 68, h: 60 }, { x: -46 - 26, y: -230 - 26, w: 52, h: 52 }, { x: -34, y: -262 - 34, w: 68, h: 72 }, { x: -56 - 44, y: -80 - 42, w: 88, h: 84 },
    ]
    const face = (who: number): Box => ({ x: FOLK[who].x + FACE[who].x * FOLK[who].scale, y: FOLK[who].y + FACE[who].y * FOLK[who].scale, w: FACE[who].w * FOLK[who].scale, h: FACE[who].h * FOLK[who].scale })
    const body = (who: number): Box => ({ x: FOLK[who].x - (FIGURE[who].w * FOLK[who].scale) / 2, y: FOLK[who].y - FIGURE[who].h * FOLK[who].scale, w: FIGURE[who].w * FOLK[who].scale, h: FIGURE[who].h * FOLK[who].scale })
    for (const who of [SHEEP, GOOSE, SHEPHERD, PIG]) {
      // Whoever stands lower on the stage is drawn in front.
      for (const front of [SHEEP, GOOSE, SHEPHERD, PIG]) {
        if (front === who || FOLK[front].y <= FOLK[who].y) continue
        expect(overlaps(face(who), body(front)), `figure ${front} over the face of figure ${who}`).toBe(false)
        const a = body(who), b = body(front)
        const shared = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
        expect(shared / (a.w * a.h), `figure ${front} over the body of figure ${who}`).toBeLessThan(0.2)
      }
      // The whole of it is on the stage, and its box to touch holds its face.
      expect(inBox({ x: face(who).x + face(who).w / 2, y: face(who).y + face(who).h / 2 }, folkBox(who))).toBe(true)
      for (const [width, height] of SURFACES) {
        const by = fit(width, height)
        expect(body(who).x * by.scale + by.x).toBeGreaterThanOrEqual(0)
        expect((body(who).x + body(who).w) * by.scale + by.x).toBeLessThanOrEqual(width + 8)
        expect((body(who).y + body(who).h) * by.scale + by.y).toBeLessThanOrEqual(height)
      }
    }
  })

  it('sets a figure down on the sheet and never behind another: the one nearer the front is the one a finger finds', () => {
    const toy = everywhere()
    setDown(toy, SHEEP, 30, 20)
    setDown(toy, PIG, 31, 22)
    settle(toy)
    const front = toy.folk[PIG].y > toy.folk[SHEEP].y ? PIG : SHEEP
    expect(figureAt(toy, { x: toy.folk[front].x, y: toy.folk[front].y - 30 })).toBe(front)
    // A touch on a figure never lays wool behind it.
    const mass = toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)
    toy.hand = GREEN
    toy.press({ x: toy.folk[front].x, y: toy.folk[front].y - 30 })
    toy.end('tap')
    expect(toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)).toBe(mass)
    expect(cell(0, 0).x).toBeGreaterThan(0)
  })
})
