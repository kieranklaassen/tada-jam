import { describe, expect, it } from 'vitest'
import { CELL, EARTH, MUD, OPEN, ROCK, SAND, STONE, fromPicture, generate, type Kind } from '../ground'
import { REPAINTS_A_FRAME, paintCell, repaint, touchedBy, type SheetPen } from './groundSheet'

/** A stand-in pen that keeps every point it is given and every colour it fills with. */
function recorder() {
  const points: { x: number; y: number }[] = []
  const colours: string[] = []
  let fills = 0, style = ''
  const pen = {
    get fillStyle() { return style },
    set fillStyle(value: string) { style = value },
    fillRect(x: number, y: number, w: number, h: number) { points.push({ x, y }, { x: x + w, y: y + h }); colours.push(style); fills++ },
    beginPath() {},
    moveTo(x: number, y: number) { points.push({ x, y }) },
    lineTo(x: number, y: number) { points.push({ x, y }) },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) { points.push({ x: cx, y: cy }, { x, y }) },
    arcTo(x1: number, y1: number, x2: number, y2: number) { points.push({ x: x1, y: y1 }, { x: x2, y: y2 }) },
    closePath() {},
    fill() { colours.push(style); fills++ },
  }
  return { pen: pen as unknown as SheetPen, points, colours, get fills() { return fills } }
}

describe('the ground sheet', () => {
  it('paints every kind of cell inside its own square, at any scale', () => {
    const ground = fromPicture(['X.XXX', '#.s#o', '#m.o#', '#...s', 'XXXXX'])
    for (const scale of [1, 1.7, 2]) {
      for (let y = 0; y < ground.rows; y++) for (let x = 0; x < ground.cols; x++) {
        const rec = recorder()
        paintCell(rec.pen, ground, x, y, scale)
        const s = CELL * scale
        expect(rec.fills).toBeGreaterThan(0)
        for (const p of rec.points) {
          expect(p.x).toBeGreaterThanOrEqual(x * s - 1e-6)
          expect(p.x).toBeLessThanOrEqual((x + 1) * s + 1e-6)
          expect(p.y).toBeGreaterThanOrEqual(y * s - 1e-6)
          expect(p.y).toBeLessThanOrEqual((y + 1) * s + 1e-6)
        }
      }
    }
  })

  it('gives the three materials one flat colour each, the same at every depth, and all three different', () => {
    const fillsOf = (kind: Kind, row: number) => {
      const rows = Array.from({ length: 12 }, () => '...')
      const ground = fromPicture(rows)
      ground.cells[row * 3 + 1] = kind
      const rec = recorder()
      paintCell(rec.pen, ground, 1, row, 1)
      // The colour of the lump is the one its body is filled with: the fill after the dark it lies on.
      return rec.colours[kind === STONE ? 2 : 1]
    }
    const colours = ([SAND, MUD, STONE] as Kind[]).map((kind) => fillsOf(kind, 2))
    expect(new Set(colours).size).toBe(3)
    for (const [n, kind] of ([SAND, MUD, STONE] as Kind[]).entries()) expect(fillsOf(kind, 9)).toBe(colours[n])
  })

  it('paints earth darker with depth, and open ground darker than any earth', () => {
    const ground = generate(1)
    const first = (x: number, y: number) => {
      const rec = recorder()
      paintCell(rec.pen, ground, x, y, 1)
      return rec.colours[0]
    }
    const light = (rgb: string) => rgb.match(/\d+/g)!.map(Number).reduce((a, b) => a + b, 0)
    expect(ground.cells[1 * 40 + 5]).toBe(EARTH)
    expect(ground.cells[19 * 40 + 5]).toBe(EARTH)
    expect(light(first(5, 1))).toBeGreaterThan(light(first(5, 19)))
    expect(ground.cells[1 * 40 + 19]).toBe(OPEN)
    expect(light(first(19, 1))).toBeLessThan(light(first(5, 19)))
    expect(ground.cells[0]).toBe(ROCK)
    expect(ground.cells.includes(MUD)).toBe(true)
  })

  it('repaints a changed cell and the eight round it, once each, and fewer at an edge', () => {
    const ground = generate(1)
    expect(touchedBy(ground, [5 * 40 + 7]).length).toBe(9)
    expect(touchedBy(ground, [5 * 40 + 7, 5 * 40 + 8]).length).toBe(12)
    expect(touchedBy(ground, [0]).length).toBe(4)
  })

  it('repaints at most its budget of cells in a frame and hands back the rest, in order', () => {
    const ground = generate(1)
    const waiting = touchedBy(ground, [5 * 40 + 7, 9 * 40 + 20, 12 * 40 + 3, 15 * 40 + 30])
    expect(waiting.length).toBe(36)
    const rec = recorder()
    const left = repaint(rec.pen, ground, waiting)
    expect(left).toEqual(waiting.slice(REPAINTS_A_FRAME))
    expect(repaint(recorder().pen, ground, left)).toEqual([])
  })
})
