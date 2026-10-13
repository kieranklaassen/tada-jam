import { describe, expect, it } from 'vitest'
import { NIGHT, compose, drawCount, type Item } from './frame'
import type { Guidance } from './guidance'
import { freshSaved, type Saved } from './save'
import { STAGE } from './stage'
import { FOLK, PLACES, PLACE_COUNT, SET_Y, SUN, basketSlot, mid } from './tree'
import { feet, makeVillage, move, press, release, step, type Village } from './village'
import { KINDS, type Kind } from './ways'

// The draw count of a canvas game is what this test counts: one for every
// card stamped onto the surface, and one for every fill stroked live (the
// pupils of a walker, the glow, and four for all the pegs together). The
// quality bar asks for fewer than about eighty, and for at most one stamp
// that covers the whole surface in a frame.

const BUDGET = 80
const full = (kind: (place: number) => Kind, night = false): Saved => {
  const saved = freshSaved(8)
  saved.places = Array.from({ length: PLACE_COUNT }, (_, place) => kind(place))
  saved.night = night
  return saved
}
const run = (v: Village, seconds: number): void => { for (let i = 0; i < Math.round(seconds * 60); i++) step(v, 1 / 60) }
const SKY = { x: 40, y: 330 }
const glow: Guidance = { glow: 1, demo: null, demoIndex: -1 }
const demo: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }

/** How much of the surface the page stamps of a frame cover: whole cards count 1, and a band of rows its share. */
const pages = (list: readonly Item[]): number => {
  let share = 0
  for (const item of list) if (item.t === 'sprite' && item.id.startsWith('backdrop')) share += item.rows ? (item.rows[1] - item.rows[0]) / STAGE.height : 1
  return share
}

/** The most a frame draws over a stretch of play, composed every frame. Every frame stamps the page exactly once. */
function busiest(v: Village, seconds: number, guidance: Guidance | null, each?: (frame: number) => void): number {
  const list: Item[] = []
  let most = 0
  for (let frame = 0; frame < seconds * 60; frame++) {
    each?.(frame)
    step(v, 1 / 60)
    most = Math.max(most, drawCount(compose(v, guidance, list)))
    expect(pages(list)).toBeCloseTo(1, 6)
  }
  return most
}

/** A finger that takes pieces from the basket and drops them in the sky as fast as it can, taps the oak and the sun, and taps every walker. */
const frantic = (v: Village) => (frame: number): void => {
  if (frame % 6 === 0) { press(v, basketSlot((frame / 6) % 7)); move(v, SKY); release(v, SKY) }
  if (frame % 6 === 3) { const at = frame % 12 === 3 ? { x: 590, y: 500 } : { x: SUN.x, y: v.tabY }; press(v, at); release(v, at) }
  if (frame % 90 === 45) for (const one of v.walkers) { const here = feet(v, one); const at = { x: here.x, y: here.y - 40 }; press(v, at); release(v, at) }
}

describe('the frame budget', () => {
  it('draws a first visit well inside the budget', () => {
    const count = drawCount(compose(makeVillage(freshSaved(4)), null))
    expect(count).toBeGreaterThan(20)
    expect(count).toBeLessThan(BUDGET - 25)
  })

  it('stays under the budget with every place full of the piece that costs most, everything fluttering, and the glow on', () => {
    for (const kind of KINDS) {
      const v = makeVillage(full(() => kind))
      expect(busiest(v, 12, glow, frantic(v)), `a tree full of ${kind}`).toBeLessThan(BUDGET)
    }
  })

  it('stays under the budget by night, with every string of lanterns burning and every window lit, and while the evening sheet slides', () => {
    for (const kind of KINDS) {
      const night = makeVillage(full(() => kind, true))
      expect(busiest(night, 8, glow, frantic(night)), `a night tree full of ${kind}`).toBeLessThan(BUDGET)
    }
    const v = makeVillage(full((place) => (place % 2 ? 'lanterns' : 'bucket')))
    press(v, SUN)
    move(v, { x: SUN.x, y: SET_Y + 40 })
    release(v, { x: SUN.x, y: SET_Y + 40 })
    expect(v.scene?.what).toBe('dusk')
    const list: Item[] = []
    let most = 0, split = 0
    for (let frame = 0; frame < 60 * 9; frame++) {
      step(v, 1 / 60)
      most = Math.max(most, drawCount(compose(v, glow, list)))
      // While the sheet slides the page is stamped in two bands, the day's above the edge and the night's below, and together they are one page.
      expect(pages(list)).toBeCloseTo(1, 6)
      if (list.filter((item) => item.t === 'sprite' && item.id.startsWith('backdrop')).length === 2) split += 1
    }
    expect(split).toBeGreaterThan(30)
    expect(most).toBeLessThan(BUDGET)
    expect(list.some((item) => item.t === 'sprite' && item.id === `backdrop${NIGHT}` && !item.rows)).toBe(true)
  })

  it('stays under the budget through the shake of a full tree', () => {
    const v = makeVillage(full((place) => KINDS[place % KINDS.length]))
    press(v, { x: 590, y: 480 })
    for (const dx of [80, -80, 80]) move(v, { x: 590 + dx, y: 480 })
    expect(v.scene?.what).toBe('shake')
    expect(busiest(v, 8, glow)).toBeLessThan(BUDGET)
  })

  it('stays under the budget with a mixed full tree, a piece in the hand and every walker on its way', () => {
    const v = makeVillage(full((place) => (PLACES[place].fit === 'rise' ? (place % 2 ? 'ladder' : 'bucket') : place % 2 ? 'lanterns' : 'plank')))
    for (const folk of FOLK) { const one = v.walkers.find((w) => w.folk === folk)!; press(v, { x: one.x, y: one.y - 40 }) }
    run(v, 1.6)
    press(v, basketSlot(4))
    move(v, mid(PLACES[8]))
    expect(v.held).not.toBeNull()
    expect(busiest(v, 10, glow)).toBeLessThan(BUDGET)
  })

  it('stays under the budget while the ghost hand shows its move on a tree with pieces in it', () => {
    const saved = full((place) => KINDS[place % KINDS.length])
    saved.places[9] = null
    const v = makeVillage(saved)
    expect(busiest(v, 4, demo)).toBeLessThan(BUDGET)
    expect(busiest(v, 4, { glow: 1, demo: 0.5, demoIndex: 3 })).toBeLessThan(BUDGET)
  })

  it('stamps nothing but the page over more than a fifth of the surface', () => {
    // Every other card is small: the largest is a leaf card of the crown.
    const v = makeVillage(full((place) => KINDS[place % KINDS.length], true))
    const ids = new Set(compose(v, glow).filter((item) => item.t === 'sprite').map((item) => (item as { id: string }).id.split(':')[0].replace(NIGHT, '')))
    expect([...ids].sort()).toEqual(['backdrop', 'bird', 'cloud-a', 'cloud-b', 'cup', 'icon', 'leaves', 'moon', 'piece', 'seat', 'snail', 'window'].sort())
  })

  it('reuses the list it is given, so a frame allocates no new list', () => {
    const v = makeVillage(freshSaved(null))
    const list: Item[] = []
    expect(compose(v, null, list)).toBe(list)
    const first = list.length
    step(v, 1 / 60)
    compose(v, null, list)
    expect(list.length).toBe(first)
  })
})
