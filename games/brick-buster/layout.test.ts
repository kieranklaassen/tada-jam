import { describe, expect, it } from 'vitest'
import { BALL_R, BELL, BUMPER, FIELD, FOLDED, GATES, HOME, FULL_SIZE, LADYBIRD, LANE, LIE, PLACES, SLOT, STAGE, SWELL, TARGET_PX, TOYS, TOY_NAMES, TRAY, WALL, boxesCross, brickBox, heapSpot, inBox, limitsFor, vineFoot, vineTop, type Box } from './layout'
import { CORNER } from './overlay'
import { INSERTS, LAMPS, LAMP_R, PALE, TACKS } from './paint'
import { fit } from './stage'

// Where things stand, held as numbers: nothing lies in or under anything it
// should not, on each surface the game is asked to fit.

const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [820, 1180]]
const within = (inner: Box, outer: Box) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h
const field: Box = { x: FIELD.left, y: FIELD.roof, w: FIELD.right - FIELD.left, h: FIELD.floor - FIELD.roof }
/** The box round a fallen brick as it lies, leaning: the `nth` to fall from column `col`. */
const lying = (col: number, nth: number): Box => {
  const { x, y, lean } = heapSpot(col, nth)
  const hw = (SLOT.w * LIE) / 2, hh = (SLOT.h * LIE) / 2
  const w = hw * Math.abs(Math.cos(lean)) + hh * Math.abs(Math.sin(lean)), h = hw * Math.abs(Math.sin(lean)) + hh * Math.abs(Math.cos(lean))
  return { x: x - w, y: y - h, w: w * 2, h: h * 2 }
}
const cols = Array.from({ length: WALL.cols }, (_, col) => col)
const places = Array.from({ length: PLACES }, (_, place) => place)

describe('the wall', () => {
  it('stands inside the field, no brick in another, with room for the ball all round it', () => {
    for (const a of places) {
      expect(within(brickBox(a), field)).toBe(true)
      for (const b of places) if (a < b) expect(boxesCross(brickBox(a), brickBox(b))).toBe(false)
    }
    // A ball fits between the wall and each rail, and between the roof and a jelly that has swollen in the top row.
    expect(brickBox(0).x - FIELD.left).toBeGreaterThan(BALL_R * 2)
    expect(FIELD.right - (brickBox(WALL.cols - 1).x + WALL.brickW)).toBeGreaterThan(BALL_R * 2)
    expect(brickBox(0).y - SWELL - FIELD.roof).toBeGreaterThan(BALL_R * 2)
  })

  it('a pool lies in the box of the brick it was, and the vine stands in the first column, clear of every other column', () => {
    const lane: Box = { x: LANE.x - LANE.half, y: FIELD.roof, w: LANE.half * 2, h: vineFoot(WALL.rows - 1) - FIELD.roof }
    expect(lane.x).toBeGreaterThanOrEqual(brickBox(LANE.col).x - (WALL.cellW - WALL.brickW) / 2 - 1)
    for (const place of places) if (place % WALL.cols !== LANE.col) expect(boxesCross(lane, brickBox(place))).toBe(false)
    // A ball the vine carries is clear of the seed's column and of the left rail.
    expect(LANE.x + BALL_R).toBeLessThanOrEqual(brickBox(LANE.seedCol).x)
    expect(LANE.x - BALL_R).toBeGreaterThan(FIELD.left)
    // The vine lets the ball go under the roof, in every row, and its foot is far over the bumper.
    for (let row = 0; row < WALL.rows; row++) {
      expect(Math.max(LANE.top, vineTop(row)) - BALL_R).toBeGreaterThan(FIELD.roof)
      expect(vineFoot(row)).toBeLessThan(BUMPER.top - BALL_R * 4)
    }
  })
})

describe('the rubble tray', () => {
  it('lies under the wall\'s foot, inside the field, over where the bumper and the ball on it stand', () => {
    const foot = brickBox(PLACES - 1).y + WALL.brickH
    expect(TRAY.y).toBeGreaterThan(foot)
    expect(within(TRAY, field)).toBe(true)
    expect(TRAY.y + TRAY.h).toBeLessThan(BUMPER.top - BALL_R * 2)
    for (const place of places) expect(boxesCross(TRAY, brickBox(place))).toBe(false)
  })

  it('holds every fallen brick inside it, however many fell from one column', () => {
    for (const col of cols) for (let nth = 0; nth < PLACES; nth++) expect(within(lying(col, nth), TRAY), `column ${col}, brick ${nth}`).toBe(true)
  })

  it('has no slots and no order from left to right: a brick lies under the column it fell from, whatever fell before it', () => {
    for (const col of cols) {
      const middle = WALL.left + col * WALL.cellW + WALL.cellW / 2
      for (let nth = 0; nth < WALL.rows; nth++) expect(Math.abs(heapSpot(col, nth).x - middle)).toBeLessThan(WALL.cellW / 4)
    }
    // The bricks of one column lie on each other: a heap, not places side by side.
    for (const col of cols) expect(boxesCross(lying(col, 0), lying(col, 1)) || boxesCross(lying(col, 1), lying(col, 2))).toBe(true)
    // No two heaps lie a like step apart or on a like line.
    const first = cols.map((col) => heapSpot(col, 0))
    for (let col = 0; col + 2 < WALL.cols; col++) {
      expect(Math.abs((first[col + 1].x - first[col].x) - (first[col + 2].x - first[col + 1].x))).toBeGreaterThan(3)
      expect(first[col].y === first[col + 1].y || first[col + 1].y === first[col + 2].y).toBe(false)
    }
    for (const col of cols) for (let nth = 0; nth + 1 < WALL.rows; nth++) expect(Math.abs(heapSpot(col, nth).lean - heapSpot(col, nth + 1).lean)).toBeGreaterThan(0.04)
  })

  it('is never seen full: with every brick of a wall fallen, sand shows between the heaps and over half of the tray', () => {
    let covered = 0
    for (const col of cols) {
      const heap = Array.from({ length: WALL.rows }, (_, nth) => lying(col, nth))
      covered += heap.length * SLOT.w * LIE * SLOT.h * LIE
      if (col + 1 === WALL.cols) continue
      const right = Math.max(...heap.map((box) => box.x + box.w))
      const next = Math.min(...Array.from({ length: WALL.rows }, (_, nth) => lying(col + 1, nth).x))
      expect(next - right, `sand between the heaps under columns ${col} and ${col + 1}`).toBeGreaterThan(3)
    }
    expect(covered / (TRAY.w * TRAY.h)).toBeLessThan(0.5)
  })
})

describe('the gates', () => {
  it('each is wide enough for the ball, stands clear of the roof, the floor and the gate beside it, and is on its toy\'s side', () => {
    for (const toy of TOY_NAMES) {
      const gate = GATES[toy]
      expect(gate.y1 - gate.y0).toBeGreaterThanOrEqual(BALL_R * 2 + 60)
      expect(gate.y0).toBeGreaterThan(FIELD.roof + BALL_R)
      expect(gate.y1).toBeLessThanOrEqual(BUMPER.top)
      // The toy holds the ball in its own panel, and lets it out inside the field, clear of the rail.
      expect(inBox(gate.mouth.x, gate.mouth.y, TOYS[toy])).toBe(true)
      expect(gate.out.x - BALL_R).toBeGreaterThanOrEqual(FIELD.left)
      expect(gate.out.x + BALL_R).toBeLessThanOrEqual(FIELD.right)
      expect(gate.out.y).toBeGreaterThan(gate.y0)
      expect(gate.out.y).toBeLessThan(gate.y1)
    }
    expect(GATES.walrus.y0 - GATES.dragon.y1).toBeGreaterThan(BALL_R * 2)
  })

  it('no brick, pool, vine or fallen brick lies in a gate, and none is where the ball comes out', () => {
    for (const toy of TOY_NAMES) {
      const out: Box = { x: GATES[toy].out.x - BALL_R, y: GATES[toy].out.y - BALL_R, w: BALL_R * 2, h: BALL_R * 2 }
      for (const place of places) expect(boxesCross(out, brickBox(place))).toBe(false)
      expect(boxesCross(out, TRAY)).toBe(false)
      expect(boxesCross(out, { x: LANE.x - LANE.half, y: FIELD.roof, w: LANE.half * 2, h: vineFoot(WALL.rows - 1) - FIELD.roof })).toBe(false)
    }
  })
})

describe('the bell, the folded wall and the bumper', () => {
  it('the bell hangs inside the field beside the wall, and the folded wall lies above the roof rail', () => {
    expect(BELL.x + BELL.r).toBeLessThan(FIELD.right)
    expect(BELL.y - BELL.r).toBeGreaterThan(FIELD.roof)
    expect(BELL.x - BELL.r).toBeGreaterThan(brickBox(WALL.cols - 1).x + WALL.brickW)
    expect(FOLDED.y + FOLDED.h).toBeLessThan(FIELD.roof)
    expect(FOLDED.y).toBeGreaterThan(0)
  })

  it('the bumper stays between the rails, and the lamps of the lower field lie over it, inside the field', () => {
    expect(BUMPER.minX - BUMPER.half).toBeGreaterThanOrEqual(FIELD.left)
    expect(BUMPER.maxX + BUMPER.half).toBeLessThanOrEqual(FIELD.right)
    for (const [x, y, r] of INSERTS) {
      expect(x - r).toBeGreaterThan(FIELD.left)
      expect(x + r).toBeLessThan(FIELD.right)
      expect(y + r).toBeLessThan(BUMPER.top)
      expect(y - r).toBeGreaterThan(TRAY.y + TRAY.h)
    }
  })
})

describe('marks that could be read as a row of signs', () => {
  /** No two steps beside each other are alike, and no two neighbours stand at a like height. */
  const uneven = (marks: readonly (readonly number[])[], step: number, rise: number) => {
    for (let i = 0; i + 2 < marks.length; i++) expect(Math.abs((marks[i + 1][0] - marks[i][0]) - (marks[i + 2][0] - marks[i + 1][0])), `the steps at mark ${i}`).toBeGreaterThanOrEqual(step)
    for (let i = 0; i + 1 < marks.length; i++) expect(Math.abs(marks[i + 1][1] - marks[i][1]), `the heights at mark ${i}`).toBeGreaterThanOrEqual(rise)
  }

  it('the lamps of the apron are uneven in spacing and in height, on each side of the folded wall', () => {
    const left = LAMPS.filter(([x]) => x < FOLDED.x), right = LAMPS.filter(([x]) => x > HOME.x)
    expect(left.length + right.length).toBe(LAMPS.length)
    uneven(left, 8, 4)
    uneven(right, 8, 4)
    // Each is on the apron, over the ladybird's walk and the roof rail.
    for (const [x, y] of LAMPS) {
      expect(y).toBeGreaterThan(10)
      if (x > HOME.x) expect(y + 11).toBeLessThan(LADYBIRD.y - LADYBIRD.r + 4)
      expect(x).toBeGreaterThan(20)
      expect(x).toBeLessThan(STAGE.width - 20)
    }
  })

  /** How many differences in a row take turns: up, down, up, down. Marks that take turns read as a pattern, a dotted line. */
  const turns = (values: readonly number[]) => {
    const signs = values.slice(1).map((value, index) => Math.sign(value - values[index]))
    let most = signs.length > 0 ? 1 : 0, run = most
    for (let i = 1; i < signs.length; i++) {
      run = signs[i] !== 0 && signs[i] === -signs[i - 1] ? run + 1 : 1
      most = Math.max(most, run)
    }
    return most
  }
  const steps = (marks: readonly (readonly (number | string)[])[]) => marks.slice(1).map((mark, index) => (mark[0] as number) - (marks[index][0] as number))
  /** Scattered by hand: unlike steps, heights and sizes beside each other, and none of them taking turns for more than three in a row. */
  const scattered = (name: string, marks: readonly (readonly (number | string)[])[], step: number, rise: number, size: number) => {
    const column = (index: number) => marks.map((mark) => mark[index] as number)
    const gaps = steps(marks)
    for (let i = 0; i + 1 < gaps.length; i++) expect(Math.abs(gaps[i + 1] - gaps[i]), `${name}: the steps at mark ${i}`).toBeGreaterThanOrEqual(step)
    for (let i = 0; i + 1 < marks.length; i++) {
      expect(Math.abs(column(1)[i + 1] - column(1)[i]), `${name}: the heights at mark ${i}`).toBeGreaterThanOrEqual(rise)
      expect(Math.abs(column(2)[i + 1] - column(2)[i]), `${name}: the sizes at mark ${i}`).toBeGreaterThanOrEqual(size)
    }
    expect(turns(gaps), `${name}: steps taking turns`).toBeLessThanOrEqual(3)
    expect(turns(column(1)), `${name}: heights taking turns`).toBeLessThanOrEqual(3)
    expect(turns(column(2)), `${name}: sizes taking turns`).toBeLessThanOrEqual(3)
    // No bowl and no arch: the heights turn more than once.
    const signs = column(1).slice(1).map((value, index) => Math.sign(value - column(1)[index]))
    expect(signs.filter((sign, index) => index > 0 && sign !== signs[index - 1]).length, `${name}: the heights turn`).toBeGreaterThanOrEqual(3)
  }
  it('along the whole apron the lamps take no turns: neither their heights nor their gaps go up and down for more than three in a row', () => {
    expect(turns(LAMPS.map(([, y]) => y))).toBeLessThanOrEqual(3)
    expect(turns(steps(LAMPS))).toBeLessThanOrEqual(3)
    // And the row as it was is caught: high, low, high, low for eight lamps.
    expect(turns([33, 21, 29, 17, 24, 14, 27, 17, 13, 25])).toBeGreaterThan(3)
  })

  /** Colours that take turns, one and the other and the one again and the other again. */
  const colourTurns = (marks: readonly (readonly (number | string)[])[]) => marks.filter((mark, i) => i + 3 < marks.length && mark[3] !== marks[i + 1][3] && mark[3] === marks[i + 2][3] && marks[i + 1][3] === marks[i + 3][3]).length

  it('the turn counter counts: a row that goes up and down by turns is caught, and a scattered one is not', () => {
    expect(turns([1, 5, 2, 6, 3, 7])).toBe(5)
    expect(turns([1, 2, 3, 2, 1, 5])).toBe(2)
    expect(colourTurns([[0, 0, 0, 'a'], [0, 0, 0, 'b'], [0, 0, 0, 'a'], [0, 0, 0, 'b']])).toBe(1)
  })

  it('the lamps of the lower field are scattered: no two steps, heights or sizes beside each other are alike, none takes turns, and neither do the colours', () => {
    scattered('the lower field', INSERTS, 4, 4, 2)
    expect(colourTurns(INSERTS)).toBe(0)
    expect(new Set(INSERTS.map((mark) => mark[3])).size).toBeGreaterThanOrEqual(3)
  })

  it('the pale lamps under the tray are scattered the same way: no bowl, no even steps, no turns of size or colour', () => {
    scattered('under the tray', PALE, 4, 4, 2)
    expect(colourTurns(PALE)).toBe(0)
    expect(new Set(PALE.map((mark) => mark[3])).size).toBeGreaterThanOrEqual(3)
    // No two steps are alike anywhere along them, and they lie between the tray and the lamps of the lower field.
    const gaps = steps(PALE)
    for (let i = 0; i < gaps.length; i++) for (let j = i + 1; j < gaps.length; j++) expect(Math.abs(gaps[i] - gaps[j])).toBeGreaterThanOrEqual(1)
    for (const [x, y, r] of PALE) {
      expect(y - r).toBeGreaterThan(TRAY.y + TRAY.h)
      expect(y + r).toBeLessThan(Math.min(...INSERTS.map((mark) => mark[1] - mark[2])))
      expect(x - r).toBeGreaterThan(FIELD.left)
      expect(x + r).toBeLessThan(FIELD.right)
    }
  })

  it('the tacks of the drum skin are uneven: no step is like the one beside it or like any other, and steps, depths and heads take no turns', () => {
    expect(TACKS.length).toBeGreaterThanOrEqual(10)
    scattered('the tacks', TACKS, 5, 3, 0.35)
    const gaps = steps(TACKS)
    expect(new Set(gaps).size).toBe(gaps.length)
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(2)
    // They lie on the skin, inside the rails.
    for (const [along] of TACKS) {
      expect(FIELD.left + along).toBeGreaterThan(FIELD.left + 8)
      expect(FIELD.left + along).toBeLessThan(FIELD.right - 8)
    }
  })

  it('an apron lamp is one dome of a single size, small enough to sit clear of the home control', () => {
    expect(LAMP_R).toBeGreaterThanOrEqual(8)
    expect(LAMP_R).toBeLessThanOrEqual(11)
  })
})

describe.each(SURFACES)('on a surface of %i by %i', (width, height) => {
  const by = fit(width, height)
  /** A point of the surface, in stage units. */
  const toStage = (x: number, y: number) => ({ x: (x - by.x) / by.scale, y: (y - by.y) / by.scale })
  // The jam's home control: 48 px round, 10 px from the top, at the top centre of the surface.
  const home = { ...toStage(width / 2, 34), r: 24 / by.scale }
  const underHome = (x: number, y: number, r: number) => Math.hypot(x - home.x, y - home.y) < home.r + r
  // The grown-up's corner: the top right of the surface.
  const corner = { from: toStage(width - CORNER, 0), to: toStage(width, CORNER) }
  const inCorner = (x: number, y: number, r: number) => x + r > corner.from.x && y - r < corner.to.y

  it('the whole stage is on the surface', () => {
    expect(by.scale).toBeGreaterThan(0)
    expect(by.x).toBeGreaterThanOrEqual(0)
    expect(by.y).toBeGreaterThanOrEqual(0)
    expect(by.x + STAGE.width * by.scale).toBeLessThanOrEqual(width + 1e-6)
    expect(by.y + STAGE.height * by.scale).toBeLessThanOrEqual(height + 1e-6)
  })

  it('no lamp sits under the home control, and neither does the folded wall, the bell or the ladybird', () => {
    if (width === STAGE.width) expect(home).toEqual({ x: HOME.x, y: HOME.y, r: HOME.r })
    for (const [x, y] of LAMPS) expect(underHome(x, y, 11), `the lamp at ${x}`).toBe(false)
    // The folded wall, as a row of discs along its box, with its lifted corner.
    for (let x = FOLDED.x; x <= FOLDED.x + FOLDED.w; x += 10) expect(underHome(x, FOLDED.y + FOLDED.h / 2, FOLDED.h / 2)).toBe(false)
    expect(underHome(BELL.x, BELL.y, BELL.r + 14)).toBe(false)
    const walk = limitsFor(width, height)
    for (let x = walk.ladyFrom; x <= walk.ladyTo; x += 10) expect(underHome(x, LADYBIRD.y, LADYBIRD.r + 8)).toBe(false)
  })

  it('what the child must touch is large enough, and none of it is in the grown-up\'s corner', () => {
    // The bell is the one small thing a child must touch; the bumper answers a finger anywhere on the table.
    expect((BELL.r + 14) * 2 * by.scale).toBeGreaterThanOrEqual(48)
    expect((FIELD.right - FIELD.left) * by.scale).toBeGreaterThan(300)
    expect(inCorner(BELL.x, BELL.y, BELL.r + 14)).toBe(false)
    // The ladybird's walk stops short of the corner.
    expect(inCorner(limitsFor(width, height).ladyTo, LADYBIRD.y, LADYBIRD.r + 14)).toBe(false)
  })

  it('a brick\'s finger target is 48 px or more each way', () => {
    const { padX, padY } = limitsFor(width, height)
    expect((WALL.brickW + padX * 2) * by.scale).toBeGreaterThanOrEqual(TARGET_PX - 1e-6)
    expect((WALL.brickH + padY * 2) * by.scale).toBeGreaterThanOrEqual(TARGET_PX - 1e-6)
  })
})

describe('the ladybird\'s walk', () => {
  it('is the whole walk on a stage shown at its own size', () => {
    expect(limitsFor(STAGE.width, STAGE.height)).toEqual(FULL_SIZE)
    expect(limitsFor(0, 0)).toEqual(FULL_SIZE)
  })

  it.each([[1180, 820], [1024, 768], [820, 1180], [667, 375], [568, 320], [390, 844], [844, 390], [480, 320], [320, 480]])('never starts under the home control on a surface of %i by %i', (width, height) => {
    const by = fit(width, height), limits = limitsFor(width, height)
    const home = { x: (width / 2 - by.x) / by.scale, y: (34 - by.y) / by.scale, r: 24 / by.scale }
    for (const x of [limits.ladyFrom, limits.ladyTo]) expect(Math.hypot(x - home.x, LADYBIRD.y - home.y), `the ladybird at ${x}`).toBeGreaterThan(home.r + LADYBIRD.r + 8)
    expect(limits.ladyTo).toBeGreaterThanOrEqual(limits.ladyFrom)
    expect(limits.ladyFrom).toBeGreaterThanOrEqual(LADYBIRD.fromX)
    // It is still on the apron of the table.
    expect(limits.ladyTo).toBeLessThan(STAGE.width - LADYBIRD.r)
  })
})
