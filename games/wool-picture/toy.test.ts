import { describe, expect, it } from 'vitest'
import type { Point } from './input'
import { BOWLS, FELT, FOLK, GOOSE, PEGS, PERCHES, PIG, SHEEP, SHEPHERD } from './layout'
import { makeRng } from './rng'
import { FLIGHT, TICK, Toy, wayOf } from './toy'
import { BLUE, GREEN, WHITE, makeSheet, type Shape } from './wool'

const fresh = (hand = GREEN, size = 1): Toy => new Toy(makeSheet(), hand, size, makeRng(7))
/** A point of the felt, by cell. */
const cell = (col: number, row: number): Point => ({ x: FELT.x + col * 10 + 5, y: FELT.y + row * 10 + 5 })
const mass = (toy: Toy): number => toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)

/** Draws a straight stroke from one cell to another over `seconds`, a tick at a time, and lifts. */
function stroke(toy: Toy, from: Point, to: Point, seconds: number, lift = true): void {
  toy.press(from)
  const ticks = Math.max(1, Math.round(seconds / TICK))
  for (let i = 1; i <= ticks; i++) {
    toy.move({ x: from.x + ((to.x - from.x) * i) / ticks, y: from.y + ((to.y - from.y) * i) / ticks })
    toy.advance(TICK)
  }
  if (lift) toy.end('dragEnd')
}

describe('a touch on the felt', () => {
  it('is answered when the finger lands: wool on the sheet and a sound before any time has passed', () => {
    const toy = fresh()
    toy.press(cell(30, 40))
    expect(toy.t).toBe(0)
    expect(toy.laid.length).toBeGreaterThan(0)
    expect(toy.sheet.shapes).toHaveLength(1)
    expect(toy.takeSounds()).not.toBeNull()
    expect(toy.changed).toBe(true)
  })

  it('lays thick where the finger goes slowly and thin where it goes fast', () => {
    const slow = fresh(), fast = fresh()
    stroke(slow, cell(10, 40), cell(40, 40), 2.4)
    stroke(fast, cell(10, 40), cell(40, 40), 0.25)
    expect(mass(slow)).toBeGreaterThan(mass(fast) * 2.5)
    expect(mass(fast)).toBeGreaterThan(0)
  })

  it('lays thicker the longer the finger waits in one place, up to seven levels and no more', () => {
    const toy = fresh()
    toy.press(cell(30, 30))
    const landed = mass(toy)
    toy.advance(0.5)
    expect(mass(toy)).toBeGreaterThan(landed)
    toy.advance(6)
    const under = toy.sheet.shapes[0].cells[30 * 72 + 30] >> 3
    expect(under).toBe(7)
  })

  it('spends the tuft as it lays, so a long line thins out toward its end', () => {
    const toy = fresh(GREEN, 1)
    stroke(toy, cell(4, 24), cell(68, 24), 8, false)
    expect(toy.amount).toBeLessThan(0.4)
    const shape = toy.sheet.shapes[0]
    const band = (from: number, to: number) => { let sum = 0; for (let row = 20; row < 29; row++) for (let col = from; col < to; col++) sum += shape.cells[row * 72 + col] >> 3; return sum }
    expect(band(4, 24)).toBeGreaterThan(band(48, 68) * 1.3)
    // The next touch draws on a full tuft again.
    toy.end('dragEnd')
    toy.press(cell(30, 40))
    expect(toy.amount).toBeGreaterThan(0.85)
  })

  it('lays the strands the way the finger went', () => {
    expect(wayOf(1, 0)).toBe(0)
    expect(wayOf(-1, 0)).toBe(0)
    expect(wayOf(0, 1)).toBe(4)
    expect(wayOf(1, 1)).toBe(2)
    expect(wayOf(1, -1)).toBe(6)
    const toy = fresh()
    stroke(toy, cell(30, 10), cell(30, 40), 1)
    const shape = toy.sheet.shapes[0]
    expect(shape.cells[30 * 72 + 30] & 7).toBe(4)
  })

  it('makes a shape of the same colour bigger, and lays another colour over it as a shape of its own', () => {
    const toy = fresh()
    stroke(toy, cell(10, 40), cell(30, 40), 1)
    stroke(toy, cell(28, 40), cell(50, 40), 1)
    expect(toy.sheet.shapes).toHaveLength(1)
    toy.press(BOWLS[WHITE])
    toy.end('dragEnd')
    stroke(toy, cell(20, 40), cell(30, 40), 0.6)
    expect(toy.sheet.shapes.map((shape) => shape.dye)).toEqual([GREEN, WHITE])
  })

  it('clings and wakes when the finger lifts: the shape becomes what its colour and height make it, and its sound comes on the toy clock', () => {
    const toy = fresh()
    stroke(toy, cell(10, 40), cell(40, 40), 1.5, false)
    const shape: Shape = toy.sheet.shapes[0]
    expect(shape.kind).toBe('fluff')
    toy.takeSounds()
    toy.end('dragEnd')
    expect(shape.kind).toBe('hill')
    expect(toy.clungAt.get(shape.id)).toBe(toy.t)
    // The lift sounds at once; the waking sound is a tenth of a second later, and only the toy's clock brings it.
    expect(toy.takeSounds()).toHaveLength(1)
    toy.advance(0.05)
    expect(toy.takeSounds()).toBeNull()
    toy.advance(0.1)
    expect(toy.takeSounds()).not.toBeNull()
  })

  it('turns the figures to what has woken: each looks at it, and none gives a verdict', () => {
    const toy = fresh()
    stroke(toy, cell(10, 40), cell(40, 40), 1.5)
    expect(toy.folk.map((figure) => figure.mood)).toEqual(['look', 'look', 'look', 'look'])
    expect(toy.folk.every((figure) => figure.lookAt !== null)).toBe(true)
    toy.advance(2)
    expect(toy.folk.map((figure) => figure.mood)).toEqual(['idle', 'idle', 'idle', 'idle'])
    toy.press(BOWLS[WHITE])
    toy.end('dragEnd')
    stroke(toy, cell(10, 5), cell(40, 5), 1.5)
    expect(toy.sheet.shapes[1].kind).toBe('cloud')
    expect(toy.folk[SHEPHERD].mood).toBe('look')
    expect(toy.folk[GOOSE].mood).toBe('look')
  })

  it('lets the shape under the hand lie still, and lets it move again after the lift', () => {
    const toy = fresh()
    stroke(toy, cell(10, 40), cell(40, 40), 1, false)
    expect(toy.calm).toBe(1)
    toy.end('dragEnd')
    toy.advance(0.6)
    expect(toy.calm).toBe(0)
  })
})

describe('the room', () => {
  it('draws a tuft up from a bowl at a tap, and the next size at a tap on the bowl already chosen', () => {
    const toy = fresh(GREEN, 0)
    toy.press(BOWLS[BLUE])
    expect(toy.hand).toBe(BLUE)
    expect(toy.size).toBe(0)
    expect(toy.takeSounds()).not.toBeNull()
    expect(toy.bowls[BLUE].vel).toBeGreaterThan(0)
    toy.end('tap')
    expect(toy.size).toBe(0)
    // The bowl already chosen: the heap dips when the finger lands, and the tap draws up the next size.
    toy.press(BOWLS[BLUE])
    expect(toy.size).toBe(0)
    toy.end('tap')
    expect(toy.size).toBe(1)
    // A finger that lands there and goes off to the felt, or is taken away, keeps the size.
    for (const end of ['dragEnd', 'dragLift', 'dragCancel', 'pressEnd'] as const) { toy.press(BOWLS[BLUE]); toy.end(end); expect(toy.size).toBe(1) }
    toy.press(BOWLS[BLUE]); toy.end('tap')
    toy.press(BOWLS[BLUE]); toy.end('tap')
    expect(toy.size).toBe(0)
    toy.advance(1)
    expect(toy.rise[BLUE]).toBeGreaterThan(0.95)
    expect(toy.rise[GREEN]).toBeLessThan(0.05)
  })

  it('lays wool in one stroke for a finger that lands on a bowl and goes on to the felt', () => {
    const toy = fresh()
    toy.press(BOWLS[WHITE])
    toy.move({ x: BOWLS[WHITE].x, y: FELT.y + FELT.h + 30 })
    expect(toy.sheet.shapes).toHaveLength(0)
    toy.move(cell(24, 45))
    expect(toy.sheet.shapes).toHaveLength(1)
    expect(toy.sheet.shapes[0].dye).toBe(WHITE)
  })

  it('answers a touch with a sound at once wherever a finger can land', () => {
    const places: [string, Point][] = [['the felt', cell(5, 5)], ['a bowl', BOWLS[3]], ['a peg', PEGS[1]], ['the moth', PERCHES[0]], ['the bare wall', { x: 20, y: 300 }]]
    FOLK.forEach((figure, who) => places.push([`figure ${who}`, { x: figure.x, y: figure.y - figure.h / 2 }]))
    for (const [name, at] of places) {
      const toy = fresh()
      toy.press(at)
      expect(toy.takeSounds(), name).not.toBeNull()
      expect(toy.t, name).toBe(0)
    }
  })

  it('pokes a figure into its own reaction, and a second poke takes another form', () => {
    const toy = fresh()
    const pig = { x: FOLK[PIG].x, y: FOLK[PIG].y - 60 }
    toy.press(pig)
    expect(toy.folk[PIG].mood).toBe('poke')
    expect(toy.folk[PIG].variant).toBe(0)
    toy.end('dragEnd')
    toy.advance(1.5)
    expect(toy.folk[PIG].mood).toBe('idle')
    toy.press(pig)
    expect(toy.folk[PIG].variant).toBe(1)
  })

  it('sends the moth to its next perch at a tap, and leaves it be when a figure is poked', () => {
    const toy = fresh()
    expect(toy.mothAt()).toEqual(PERCHES[0])
    toy.press(PERCHES[0])
    expect(toy.mothAt()).toBeNull()
    toy.end('dragEnd')
    toy.advance(FLIGHT + 0.1)
    expect(toy.mothAt()).toEqual(PERCHES[1])
    toy.press(PERCHES[1])
    toy.advance(FLIGHT + 0.1)
    expect(toy.mothAt()).toEqual(PERCHES[2])
    // A poke on a figure is the figure's, and leaves the moth where it sits.
    toy.press({ x: FOLK[SHEPHERD].x, y: FOLK[SHEPHERD].y - 80 })
    expect(toy.folk[SHEPHERD].mood).toBe('poke')
    expect(toy.mothAt()).toEqual(PERCHES[2])
  })

  it('turns every figure to the finger at work, each at its own speed, and back to what it wants when the finger is gone', () => {
    const toy = fresh()
    toy.press(cell(5, 5))
    toy.advance(0.1)
    const early = toy.folk.map((figure) => Math.hypot(figure.gazeX, figure.gazeY))
    expect(early[GOOSE]).toBeGreaterThan(early[SHEPHERD])
    toy.advance(3)
    for (const figure of toy.folk) expect(figure.gazeX).toBeLessThan(-0.5)
    toy.end('dragEnd')
    toy.advance(6)
    // The sheep looks across at the green bowl, the shepherd up at the top of the sheet.
    expect(toy.folk[SHEEP].gazeX).toBeLessThan(-0.9)
    expect(toy.folk[SHEPHERD].gazeY).toBeLessThan(0)
  })
})

describe('the one clock', () => {
  it('moves only when it is advanced, a sixtieth at a time, however the seconds are handed to it', () => {
    const play = (pieces: number) => {
      const toy = fresh()
      toy.press(cell(10, 40))
      toy.move(cell(50, 30))
      for (let i = 0; i < 120 / pieces; i++) toy.advance(TICK * pieces)
      toy.end('dragEnd')
      toy.advance(1)
      return { t: toy.t, mass: mass(toy), kind: toy.sheet.shapes[0].kind }
    }
    expect(play(1)).toEqual(play(4))
    const idle = fresh()
    idle.advance(0)
    expect(idle.t).toBe(0)
  })
})
