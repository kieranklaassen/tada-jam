import { describe, expect, it } from 'vitest'
import { compose, raccoonSeen, thingSeen, type Item } from './frame'
import { IdleLadder, IDLE_BEFORE_DEMO } from './guidance'
import { TAKE_SECONDS, Yard, freshYard, type YardSave } from './model'
import { CARDS } from './sprites'
import { STAGE } from './stage'
import { BUSHES, LEG, PLACES, PLACE_IDS, ROWS, THINGS, type PlaceId, type ThingId } from './yard'

// The frame budget, counted and not timed, so it holds on a busy runner. A
// frame of this game is the list frame.ts composes: cards that were painted
// once and are stamped, and a few live strokes. That list's length is the
// game's draw count, the number the grown-up handle reports, and the jam's bar
// is under about 80.

const BUDGET = { draws: 78, fullSurface: 1 }
const FRAME = 1 / 60

const count = (items: readonly Item[]): { draws: number; full: number } => ({
  draws: items.length,
  full: items.filter((item) => item.kind === 'stamp' && CARDS[item.card].w * Math.abs(item.sx) >= STAGE.width * 0.8 && CARDS[item.card].h * item.sy >= STAGE.height * 0.8).length,
})

function yardWith(change: (save: YardSave) => void): Yard {
  const save = freshYard()
  change(save)
  return new Yard(save)
}

describe('the frame budget', () => {
  it('draws the bare stage before the save has been read', () => {
    const bare = count(compose(null, null))
    expect(bare.draws).toBeGreaterThan(10)
    expect(bare.full).toBe(1)
  })

  it('stays under the budget at rest with the glow on every thing and the ghost hand up', () => {
    const yard = new Yard()
    const frame = count(compose(yard, new IdleLadder(0).update(IDLE_BEFORE_DEMO + 1)))
    expect(frame.draws).toBeLessThanOrEqual(BUDGET.draws)
    expect(frame.full).toBe(BUDGET.fullSurface)
  })

  it('stays under the budget through the heaviest moment a child can reach: a punt with a thing in the air, a plucked tail and a tidy on top', () => {
    const yard = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.3 }; save.raccoon = { x: 460, row: 2 }; save.things.boot = { at: 'paws' }; save.things.ball = { at: 'floor', x: 300, row: 0 } })
    yard.press({ x: 20, y: 400 })
    yard.press({ x: 611, y: ROWS[2] - 100 })
    let worst = 0
    for (let t = 0; t < 8; t += FRAME) {
      yard.step(FRAME)
      if (Math.abs(t - 2.2) < FRAME / 2) { yard.press({ x: 1000, y: 330 }); yard.press({ x: 1000, y: 330 }) }
      const frame = count(compose(yard, new IdleLadder(0).update(IDLE_BEFORE_DEMO + 1)))
      worst = Math.max(worst, frame.draws)
      expect(frame.full).toBe(BUDGET.fullSurface)
    }
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
    expect(worst).toBeGreaterThan(50)
  })

  it('stays under the budget through every one of the thirty pairings, with every other place full so that a whole round follows, and the glow coming up after it', () => {
    let worst = 0, at = ''
    for (const thing of THINGS) for (const place of PLACE_IDS) {
      const others = THINGS.filter((id) => id !== thing)
      const yard = yardWith((save) => {
        PLACE_IDS.forEach((id: PlaceId, i) => { save.things[others[i] as ThingId] = { at: id } })
        save.things[thing] = { at: 'paws' }
        save.raccoon = { ...PLACES[place].stand }
        save.goose = PLACES[place].stand.row === 0 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
      })
      const tap = PLACES[place].hit
      yard.press({ x: tap.x + tap.w / 2, y: tap.y + tap.h / 2 })
      const ladder = new IdleLadder(0)
      for (let t = 0; t < 11; t += FRAME * 2) {
        yard.step(FRAME * 2)
        const frame = count(compose(yard, ladder.update(IDLE_BEFORE_DEMO + 1)))
        if (frame.draws > worst) { worst = frame.draws; at = `${thing} in ${place} at ${t.toFixed(2)}` }
        expect(frame.full).toBe(BUDGET.fullSurface)
      }
    }
    expect(worst, at).toBeLessThanOrEqual(BUDGET.draws)
    expect(worst).toBeGreaterThan(55)
  }, 60000)
})

describe('what is seen', () => {
  it('hides a raccoon in a bush behind it: nothing of its card is drawn below the groove', () => {
    const yard = new Yard()
    const seen = raccoonSeen(yard)
    expect(seen.sunk).toBeGreaterThan(0)
    const card = compose(yard, null).find((item) => item.kind === 'stamp' && item.card === 'raccoon')
    expect(card && card.kind === 'stamp' ? card.cutBelow : undefined).toBeLessThanOrEqual(ROWS[BUSHES[0].row] + 10)
  })

  it('carries a thing over the raccoon’s head, clear of its ears', () => {
    const yard = yardWith((save) => { save.things.cabbage = { at: 'paws' }; save.raccoon = { x: 500, row: 2 } })
    const thing = thingSeen(yard, 'cabbage'), raccoon = raccoonSeen(yard)
    expect(thing.y).toBeLessThanOrEqual(raccoon.y - CARDS.raccoonCarry.ay * raccoon.scale + 22)
  })

  it('draws every thing once, wherever it is, through a double-take, a punt and the walk home', () => {
    const yard = yardWith((save) => { save.goose = { leg: LEG.lookLeft, along: 0 }; save.raccoon = { x: 250, row: 1 }; save.things.clock = { at: 'paws' } })
    yard.press({ x: 20, y: 400 })
    for (let t = 0; t < TAKE_SECONDS + 4; t += FRAME) {
      yard.step(FRAME)
      const items = compose(yard, null)
      for (const id of THINGS) expect(items.filter((item) => item.kind === 'stamp' && item.card === id), `${id} at ${t.toFixed(2)}`).toHaveLength(1)
      const raccoons = items.filter((item) => item.kind === 'stamp' && (item.card === 'raccoon' || item.card === 'raccoonCarry' || item.card === 'raccoonShock'))
      expect(raccoons, `the raccoon at ${t.toFixed(2)}`).toHaveLength(1)
    }
  })
})
