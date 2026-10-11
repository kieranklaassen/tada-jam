import { describe, expect, it } from 'vitest'
import { DADO_Y, FLOOR_Y, SCENE } from './layout'
import { ROOM, SMALL_BLEED, bleedFor, paintWalls } from './paintRoom'
import { makeRng } from './rng'
import type { Ctx, Point, Watercolour } from './wash'

// The room goes to the edges of whatever surface it is given. A painter that
// only keeps what it was asked to paint stands in for the watercolour.
type Kept = { points: Point[]; color?: string }
function walls(width: number, height: number): { washes: Kept[]; lines: Point[][]; seen: { left: number; right: number; top: number; bottom: number } } {
  const washes: Kept[] = [], lines: Point[][] = []
  const paint = {
    wash: (_g: Ctx, points: Point[], style: { color?: string }) => { washes.push({ points, color: style.color }) },
    pencil: (_g: Ctx, points: Point[]) => { lines.push(points) },
  } as unknown as Watercolour
  paintWalls({} as Ctx, paint, makeRng(4), bleedFor(width, height))
  const scale = Math.min(width / SCENE.w, height / SCENE.h)
  const side = (width / scale - SCENE.w) / 2, end = (height / scale - SCENE.h) / 2
  return { washes, lines, seen: { left: -side, right: SCENE.w + side, top: -end, bottom: SCENE.h + end } }
}
const xs = (kept: Kept[]): number[] => kept.flatMap((wash) => wash.points.map((p) => p.x))
const ys = (kept: Kept[]): number[] => kept.flatMap((wash) => wash.points.map((p) => p.y))

describe('the room on any surface', () => {
  it('is painted a hand\'s width past a surface the shape of the scene, and as far as a wider or taller one shows', () => {
    expect(bleedFor(SCENE.w, SCENE.h)).toEqual({ left: 240, right: 240, top: 240, bottom: 240 })
    expect(bleedFor(0, 0)).toEqual(SMALL_BLEED)
    const wide = bleedFor(1800, 700), scale = 700 / SCENE.h
    expect(wide.left).toBeGreaterThan((1800 / scale - SCENE.w) / 2 + 200)
    expect(wide.top).toBe(240)
    const tall = bleedFor(1000, 900)
    expect(tall.bottom).toBeGreaterThan((900 / (1000 / SCENE.w) - SCENE.h) / 2 + 200)
  })

  it.each([[1180, 820], [1800, 700], [2600, 800], [1000, 900]])('has wall, stripes, panelling and tiles out to every edge of a %i by %i surface', (width, height) => {
    const { washes, lines, seen } = walls(width, height)
    const of = (color: string): Kept[] => washes.filter((wash) => wash.color === color)
    // The wall, the panelling and the floor each reach past both sides; the wall past the top and the floor past the bottom.
    for (const color of [ROOM.wall, ROOM.panel, ROOM.floor]) {
      expect(Math.min(...xs(of(color))), color).toBeLessThan(seen.left - 100)
      expect(Math.max(...xs(of(color))), color).toBeGreaterThan(seen.right + 100)
    }
    expect(Math.min(...ys(of(ROOM.wall)))).toBeLessThan(seen.top - 100)
    expect(Math.max(...ys(of(ROOM.floor)))).toBeGreaterThan(seen.bottom + 100)
    // Stripes and tiles are found at both edges, not only over the scene, and the tiles reach the bottom.
    for (const color of [ROOM.stripe, ROOM.tile]) {
      expect(Math.min(...xs(of(color))), color).toBeLessThan(seen.left + 80)
      expect(Math.max(...xs(of(color))), color).toBeGreaterThan(seen.right - 130)
    }
    expect(Math.min(...ys(of(ROOM.stripe)))).toBeLessThan(seen.top)
    expect(Math.max(...ys(of(ROOM.tile)))).toBeGreaterThan(seen.bottom - 10)
    // The panelling's boards go on to both sides as well.
    const boards = lines.filter((line) => line.length === 2 && line[0].y > DADO_Y && line[1].y < FLOOR_Y)
    expect(Math.min(...boards.map((line) => line[0].x))).toBeLessThan(seen.left + 62)
    expect(Math.max(...boards.map((line) => line[0].x))).toBeGreaterThan(seen.right - 62)
  })
})
