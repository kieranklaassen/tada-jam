import { describe, expect, it } from 'vitest'
import { CLOTH_COL, COLS, ROWS } from './board'
import { CAT, CAT_SHOWS_TO, COVER, DUCK_POST, ENDS, FOLD_X, LANES, ORIGIN, SLIDE, SQUARE, centreX, centreY, askedAt, onCat, squareAt } from './layout'
import { CORNER } from './overlay'
import { STAGE } from './stage'

describe('the board on the stage', () => {
  it('fills the stage from side to side, and leaves room for the cards at both ends of a lane', () => {
    expect(LANES.x).toBe(0)
    expect(LANES.x + LANES.w).toBe(STAGE.width)
    expect(LANES.y - COVER.far).toBeGreaterThanOrEqual(0)
    expect(LANES.y + LANES.h + COVER.near).toBeLessThanOrEqual(STAGE.height)
  })

  it('has squares a finger can hit: well over 48 across and deep', () => {
    expect(SQUARE.w).toBeGreaterThanOrEqual(96)
    expect(SQUARE.h).toBeGreaterThanOrEqual(96)
  })

  it('keeps every square clear of the home control and of the grown-up corner', () => {
    // The jam draws a round 48 px home control at the top centre, 10 px from the top edge.
    expect(ORIGIN.y).toBeGreaterThan(10 + 48)
    expect(ORIGIN.y).toBeGreaterThan(CORNER)
  })

  it('gives back the square a point is in, and the nearest one for a point off the board', () => {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) expect(squareAt(centreX(c), centreY(r))).toEqual({ c, r })
    expect(squareAt(0, 0)).toEqual({ c: 0, r: 0 })
    expect(squareAt(STAGE.width + 300, STAGE.height + 300)).toEqual({ c: COLS - 1, r: ROWS - 1 })
    expect(squareAt(centreX(4), -50)).toEqual({ c: 4, r: 0 })
  })

  it('asks for the row beyond the board for a tap past the far or the near rim, and for the square itself anywhere on the board', () => {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) expect(askedAt(centreX(c), centreY(r))).toEqual({ c, r })
    expect(askedAt(centreX(4), LANES.y - 1)).toEqual({ c: 4, r: -1 })
    expect(askedAt(centreX(4), LANES.y)).toEqual({ c: 4, r: 0 })
    expect(askedAt(centreX(4), LANES.y + LANES.h - 1)).toEqual({ c: 4, r: ROWS - 1 })
    expect(askedAt(centreX(4), LANES.y + LANES.h)).toEqual({ c: 4, r: ROWS })
    expect(askedAt(-20, STAGE.height + 40)).toEqual({ c: 0, r: ROWS })
  })

  it('folds between the last lane of a crossing and its cloth, and slides on by exactly that far', () => {
    expect(FOLD_X).toBe(centreX(CLOTH_COL) - SQUARE.w / 2)
    expect(SLIDE).toBe(centreX(CLOTH_COL) - centreX(0))
  })

  it('keeps what a child must see clear of the home control and of the grown-up corner', () => {
    // The home control is 48 px wide at the top centre, 10 px from the top; the corner is the top right.
    const home = { left: STAGE.width / 2 - 24, right: STAGE.width / 2 + 24, bottom: 58 }
    // Every square lies below both, and so does the foot of every card and onlooker.
    expect(ORIGIN.y).toBeGreaterThan(home.bottom)
    expect(ORIGIN.y).toBeGreaterThan(CORNER)
    expect(ENDS.far).toBeGreaterThan(CORNER)
    // The cards and onlookers are no taller than this, so they start below the home control too.
    expect(ORIGIN.y - COVER.far).toBeGreaterThanOrEqual(home.bottom - 8)
    // The duck's post is at the other end of the stage.
    expect(DUCK_POST.y).toBeGreaterThan(STAGE.height - 60)
    expect(DUCK_POST.x).toBeLessThan(SQUARE.w)
  })
})

describe('the cat', () => {
  it('is touched on its face and nowhere on the board', () => {
    expect(onCat(CAT.x, CAT.y)).toBe(true)
    expect(onCat(CAT.x, CAT_SHOWS_TO - 1)).toBe(true)
    expect(onCat(CAT.x, CAT_SHOWS_TO + 1)).toBe(false)
    expect(onCat(CAT.x, ORIGIN.y + 5)).toBe(false)
    expect(onCat(CAT.x + CAT.rx + 2, CAT.y)).toBe(false)
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) expect(onCat(centreX(c), centreY(r))).toBe(false)
  })

  it('sits clear of the home control and of the grown-up corner', () => {
    expect(CAT.x + SQUARE.w / 2 + 4).toBeLessThan(STAGE.width / 2 - 24)
    expect(CAT.x + CAT.rx).toBeLessThan(STAGE.width - CORNER)
  })
})
