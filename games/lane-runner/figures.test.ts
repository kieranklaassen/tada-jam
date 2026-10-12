import { describe, expect, it } from 'vitest'
import { at, beadCount, fromRows, inOnePiece, type Plaque } from './beads'
import { BEAR, CAT, CHARACTERS, FOX, FROG, GOOSE, HEDGEHOG, OWL, WAITING, eyeKeys, flattened, type Figure } from './figures'
import { BEADS, beadIndex } from './palette'
import { EYE_LIFT } from './placing'
import { makeShapes, pondPlaque } from './scenery'
import { CLOUD_WIDTHS, cloudPlaque, handPlaque, sunPlaque } from './sky'
import { everyFigure } from './stage'
import { LANE_WIDTH } from './trail'
import { TRAIL_TILE, TRAIL_WIDE, trailBead } from './trailBeads'

const tall = (figure: Figure): number => flattened(figure).h
const wide = (figure: Figure): number => flattened(figure).w

/**
 * Every plus sign in a plaque, by its middle bead. A bead is the middle of one when it has a bead on all four
 * sides of it and either those four are its own colour with another at every corner, or three or more of them
 * are one colour and the four corners are all alike and are neither that colour nor the middle's: all empty, or
 * all of one ground. Five beads in a cross on bare board are a plus whatever the middle is.
 */
function pluses(plaque: Plaque): string[] {
  const out: string[] = []
  for (let y = 0; y < plaque.h; y++) {
    for (let x = 0; x < plaque.w; x++) {
      const bead = at(plaque, x, y)
      if (bead === 0) continue
      const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(plaque, x + dx, y + dy))
      if (arms.some((arm) => arm === 0)) continue
      const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => at(plaque, x + dx, y + dy))
      const own = arms.every((arm) => arm === bead) && corners.every((corner) => corner !== bead)
      const stroke = arms.find((arm) => arms.filter((other) => other === arm).length >= 3)
      const ground = stroke !== undefined && corners.every((corner) => corner === corners[0]) && corners[0] !== stroke && corners[0] !== bead
      if (own || ground) out.push(`${x},${y}`)
    }
  }
  return out
}

describe('the figures', () => {
  it('draws no plus sign anywhere: not on a load, a thing in the way, a neighbour, a tree, the sun, a cloud, the hand or the trail', () => {
    // The rule sees the five-bead crosses it is there for: four mushroom caps as they were first drawn, a pale
    // one and a plain one, and a cross of one colour on a ground of another.
    expect(pluses(fromRows(['.R...R....R...R..', 'RWR.RRR..RWR.RRR.', '.C...C....C...C..']))).toEqual(['1,1', '5,1', '10,1', '14,1'])
    expect(pluses(fromRows(['GGGGG', 'GGPGG', 'GPPPG', 'GGPGG', 'GGGGG']))).toEqual(['2,2'])
    const found: string[] = []
    let plaques = 0
    const read = (name: string, plaque: Plaque): void => {
      plaques += 1
      for (const where of pluses(plaque)) found.push(`${name} at ${where}`)
    }
    for (const figure of everyFigure()) for (const part of figure.parts) read(`${figure.name} ${part.name}`, part.plaque)
    for (const [kind, shapes] of Object.entries(makeShapes())) shapes.forEach((plaque, i) => read(`${kind} ${i}`, plaque))
    read('pond', pondPlaque())
    read('sun', sunPlaque())
    read('hand', handPlaque())
    for (const wide of CLOUD_WIDTHS) read(`cloud ${wide}`, cloudPlaque(wide))
    // The trail, two tiles of it end to end so that nothing is missed across the join.
    const cells = new Uint8Array(TRAIL_WIDE * TRAIL_TILE * 2)
    for (let y = 0; y < TRAIL_TILE * 2; y++) for (let x = 0; x < TRAIL_WIDE; x++) cells[y * TRAIL_WIDE + x] = beadIndex(trailBead(x, y % TRAIL_TILE))
    read('trail', { w: TRAIL_WIDE, h: TRAIL_TILE * 2, cells })
    expect(plaques).toBeGreaterThan(150)
    expect(found).toEqual([])
  })

  it('are seven, each with a name of its own and parts named once', () => {
    expect(CHARACTERS.map((figure) => figure.name).sort()).toEqual(['bear', 'cat', 'fox', 'frog', 'goose', 'hedgehog', 'owl'])
    expect(WAITING.length).toBe(5)
    for (const figure of CHARACTERS) {
      const names = figure.parts.map((part) => part.name)
      expect(new Set(names).size, figure.name).toBe(names.length)
    }
  })

  it('makes every part a plaque in one piece, as a fused plaque has to be, but what lies loose on a character', () => {
    for (const figure of CHARACTERS) for (const part of figure.parts) if (!part.loose) expect(inOnePiece(part.plaque), `${figure.name} ${part.name}`).toBe(true)
  })

  it('puts every joint on or beside its own plaque', () => {
    for (const figure of CHARACTERS) {
      for (const part of figure.parts) {
        expect(part.pivot[0], `${figure.name} ${part.name}`).toBeGreaterThanOrEqual(0)
        expect(part.pivot[0], `${figure.name} ${part.name}`).toBeLessThanOrEqual(part.plaque.w)
        expect(part.pivot[1], `${figure.name} ${part.name}`).toBeGreaterThanOrEqual(0)
        expect(part.pivot[1], `${figure.name} ${part.name}`).toBeLessThanOrEqual(part.plaque.h)
      }
    }
  })

  it('stands the plaques of a figure in layers that never share a depth, with room between them for an eye', () => {
    for (const figure of CHARACTERS) {
      const layers = figure.parts.filter((part) => !part.flat).map((part) => part.at[2]).sort((a, b) => a - b)
      for (let i = 1; i < layers.length; i++) {
        const gap = layers[i] - layers[i - 1]
        // Two parts may share a layer only when one is shown in place of the other (a face and the back of a head).
        if (gap > 1e-9) expect(gap, figure.name).toBeGreaterThanOrEqual(0.4 - 1e-9)
      }
      expect(EYE_LIFT).toBeLessThan(0.4)
    }
  })

  it('gives every character two eyes that sit on beads of its plaque; the hedgehog, seen from the side, has one, and the goose one bead for an eye', () => {
    for (const figure of CHARACTERS) {
      const eyed = figure.parts.filter((part) => part.eyes)
      expect(eyed.length, figure.name).toBeGreaterThanOrEqual(figure === GOOSE ? 0 : 1)
      for (const part of eyed) {
        expect(part.eyes!.length, figure.name).toBe(figure === HEDGEHOG ? 1 : 2)
        for (const eye of part.eyes!) {
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(at(part.plaque, eye.x + dx, eye.y + dy), `${figure.name} ${part.name}`).not.toBe(0)
        }
      }
    }
  })

  it('looks to a side, up, and shuts, with one dark peg for the pupil', () => {
    const eye = { x: 0, y: 0, white: 'W', lid: 'O' } as const
    expect(eyeKeys(eye, 1, 0, false)).toEqual(['W', 'W', 'W', 'K'])
    expect(eyeKeys(eye, -1, 0, false)).toEqual(['W', 'W', 'K', 'W'])
    expect(eyeKeys(eye, 1, 1, false)).toEqual(['W', 'K', 'W', 'W'])
    expect(eyeKeys(eye, 0, 0, true)).toEqual(['O', 'O', 'K', 'K'])
  })

  it('makes the fox narrower than a lane and the goose as wide as one', () => {
    expect(wide({ name: 'fox', parts: FOX.parts.filter((part) => part.name !== 'tail' && part.name !== 'ball') })).toBeLessThanOrEqual(LANE_WIDTH)
    expect(wide(GOOSE)).toBeGreaterThan(LANE_WIDTH)
    expect(wide(GOOSE)).toBeLessThan(LANE_WIDTH * 1.6)
  })

  it('makes them large and of different sizes: the bear the heaviest of those who wait', () => {
    const beads = (figure: Figure) => beadCount(flattened(figure))
    expect(tall(FOX)).toBeGreaterThanOrEqual(18)
    expect(beads(BEAR)).toBeGreaterThan(beads(FOX) * 1.5)
    for (const figure of [OWL, HEDGEHOG, FROG, CAT]) expect(beads(figure), figure.name).toBeLessThan(beads(BEAR))
    expect(wide(HEDGEHOG)).toBeGreaterThanOrEqual(28)
    const shapes = CHARACTERS.map((figure) => `${wide(figure)}x${tall(figure)}`)
    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('outlines every plaque that carries a face in the dark bead, so its shape reads on the board', () => {
    const dark = beadIndex('K')
    for (const figure of CHARACTERS) {
      for (const part of figure.parts.filter((part) => part.eyes)) {
        const first = part.plaque.cells.find((cell) => cell !== 0)
        expect(first, `${figure.name} ${part.name}`).toBe(dark)
      }
    }
    expect(BEADS.some((bead) => bead.key === 'K')).toBe(true)
  })
})
