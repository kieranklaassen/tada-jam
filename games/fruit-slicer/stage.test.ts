import { describe, expect, it } from 'vitest'
import { RAIL, WHOLE } from './measure'
import { BOARD, COUNTER, CRATE, DOG, LANE_H, PAGE, PIECE_H, PX, ROW_H, SHELF_BOX, WALL, X0, boxOf, fit, inside, laneTop, rowTop, shown, toStage, under, type Box } from './stage'
import { LANES, SHELF, cut, emptyWorld, giveToTin, landFruit, setOnShelf } from './world'

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const within = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h

describe('the page', () => {
  it('fits any surface whole, centred, at one scale', () => {
    expect(fit(1180, 820)).toEqual({ k: 1, ox: 0, oy: 0 })
    expect(fit(2360, 1640)).toEqual({ k: 2, ox: 0, oy: 0 })
    const wide = fit(2000, 820)
    expect(wide).toEqual({ k: 1, ox: 410, oy: 0 })
    const tall = fit(590, 1000)
    expect(tall.k).toBe(0.5)
    expect(tall.oy).toBe(295)
    expect(fit(0, 0).k).toBeGreaterThan(0)
  })

  it('turns a point of the surface into a point of the stage and back', () => {
    const by = fit(1600, 900)
    const p = toStage({ x: by.ox + 300 * by.k, y: by.oy + 400 * by.k }, by)
    expect(p.x).toBeCloseTo(300)
    expect(p.y).toBeCloseTo(400)
  })

  it('keeps the wall, the counter and everything on the counter inside the page and clear of each other', () => {
    const page = { x: 0, y: 0, w: PAGE.w, h: PAGE.h }
    for (const box of [WALL, COUNTER]) expect(within(box, page)).toBe(true)
    expect(overlap(WALL, COUNTER)).toBe(false)
    const things = [BOARD, SHELF_BOX, CRATE, DOG]
    for (const box of things) expect(within(box, COUNTER)).toBe(true)
    for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) expect(overlap(things[i], things[j])).toBe(false)
  })

  it('gives every lane and row a height a finger can hit, inside its slab, with room above the board to land a blade', () => {
    expect(LANE_H).toBeGreaterThanOrEqual(48)
    expect(ROW_H).toBeGreaterThanOrEqual(48)
    for (let lane = 0; lane < LANES; lane++) expect(within({ x: BOARD.x, y: laneTop(lane), w: BOARD.w, h: LANE_H }, BOARD)).toBe(true)
    expect(laneTop(1) + LANE_H).toBeLessThanOrEqual(laneTop(0))
    for (let slot = 0; slot < SHELF; slot++) expect(within({ x: SHELF_BOX.x, y: rowTop(slot), w: SHELF_BOX.w, h: ROW_H }, SHELF_BOX)).toBe(true)
    expect(BOARD.y - COUNTER.y).toBeGreaterThanOrEqual(80)
    expect(RAIL * PX).toBeLessThanOrEqual(BOARD.w)
  })
})

describe('where a piece is drawn', () => {
  const landed = landFruit(emptyWorld(), 'long')
  const made = cut(landed.world, landed.id, 600)
  if (made.kind !== 'cut') throw new Error('no cut')

  it('starts every length from the same left edge, at the same scale, on the board and on the shelf', () => {
    const [left, right] = shown(made.world)
    expect(left.box).toMatchObject({ x: X0, w: 600 * PX, h: PIECE_H.board })
    expect(right.box.x).toBeCloseTo(X0 + 600 * PX)
    expect(left.box.x + left.box.w).toBeCloseTo(right.box.x)
    const shelved = setOnShelf(made.world, made.right).world
    const onShelf = shown(shelved).find(({ piece }) => piece.id === made.right)!
    expect(onShelf.box).toMatchObject({ x: X0, w: 1800 * PX, h: PIECE_H.shelf })
    expect(within(onShelf.box, SHELF_BOX)).toBe(true)
    expect(within(left.box, BOARD)).toBe(true)
  })

  it('shows nothing for a piece in a tin, which the toy does not have', () => {
    const tinned = giveToTin(made.world, made.left, 0)
    expect(boxOf(tinned.pieces.find((piece) => piece.id === made.left)!)).toBeNull()
    expect(shown(tinned).map(({ piece }) => piece.id)).toEqual([made.right])
  })
})

describe('what is under a point', () => {
  const landed = landFruit(emptyWorld(), 'long')

  it('is the fruit over the whole height of its lane, and a piece once it has been cut', () => {
    const mid = { x: X0 + 100, y: laneTop(0) + LANE_H / 2 }
    expect(under(landed.world, mid)).toMatchObject({ thing: 'fruit', piece: { id: landed.id } })
    expect(under(landed.world, { x: mid.x, y: laneTop(0) + 1 })).toMatchObject({ thing: 'fruit' })
    const made = cut(landed.world, landed.id, 600)
    expect(under(made.world, mid)).toMatchObject({ thing: 'piece' })
    expect(under(made.world, { x: X0 + WHOLE.long * PX + 30, y: mid.y })).toEqual({ thing: 'board' })
    expect(under(landed.world, { x: mid.x, y: laneTop(1) + LANE_H / 2 })).toEqual({ thing: 'board' })
  })

  it('is the crate, the dog, the shelf, the wall, the counter, or nothing', () => {
    const mid = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
    expect(under(landed.world, mid(CRATE))).toEqual({ thing: 'crate' })
    expect(under(landed.world, mid(DOG))).toEqual({ thing: 'dog' })
    expect(under(landed.world, mid(SHELF_BOX))).toEqual({ thing: 'shelf' })
    expect(under(landed.world, mid(WALL))).toEqual({ thing: 'wall' })
    expect(under(landed.world, { x: COUNTER.x + 30, y: COUNTER.y + 30 })).toEqual({ thing: 'counter' })
    expect(under(landed.world, { x: -5, y: -5 })).toEqual({ thing: 'nothing' })
    expect(inside({ x: 5, y: 5 }, WALL)).toBe(false)
  })
})
