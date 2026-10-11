import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, cellOf } from './cells'
import { TIERS } from './config'
import { Farm } from './farm'
import type { Guidance } from './guidance'
import { BODY, HENS, HOME, centreOf, doorBox, henCircle, type ThingId } from './layout'
import { makeTally, recordingCanvas } from './recording'
import { ANIMALS, freshState, type AnimalId, type GameState } from './state'
import { YardView, useCanvases } from './view'

// The frame budget of the quality bar, as a canvas 2D game can count it: one
// draw is one stamp of a painted piece or one live fill or stroke. This is the
// draw count the game reports (the Mount hands `view.draws` to the grown-up
// overlay and the performance handle), and the bar asks for under about 80.

const BUDGET = 80
const open = (): GameState => ({ ...freshState(null), door: 'open' })
const tally = makeTally()
useCanvases((width, height) => recordingCanvas(tally, width, height))

function yard(state: GameState = open()): { farm: Farm; view: YardView } {
  const view = new YardView(recordingCanvas(tally))
  view.resize(1180, 820, 2)
  return { farm: new Farm(state, 1), view }
}

const at = (farm: Farm, animal: AnimalId): { x: number; y: number } => (animal === 'hens' ? henCircle(farm.hens[0], HENS[0].size) : centreOf(BODY[animal]))

/** The most draws any frame of this play takes, stepping at 30 a second, with the guidance showing all the way. */
function heaviest(farm: Farm, view: YardView, seconds: number, guidance: Guidance | null): number {
  let most = 0
  for (let t = 0; t < seconds; t += 1 / 30) {
    farm.step(1 / 30)
    tally.reset()
    const canvases = tally.canvases
    view.draw(farm, guidance, TIERS[0], 1 / 30)
    // What the frame put on the surface is what the view reports. The one frame in which the night's stamps are
    // made also copies and washes each of them, once: two draws a stamp, into the stamp and not onto the surface.
    expect(tally.total() - 2 * (tally.canvases - canvases)).toBe(view.draws)
    // One draw a frame covers the whole surface, by day and by night: the page, or the night's page in its place.
    expect(view.full).toBe(1)
    most = Math.max(most, view.draws)
  }
  return most
}

describe('the frame budget', () => {
  it('paints the pieces once, and stamps the page as the one full-surface draw of a frame', () => {
    const { farm, view } = yard()
    const made = tally.canvases
    for (let i = 0; i < 30; i++) { farm.step(1 / 60); view.draw(farm, null, TIERS[0], 1 / 60) }
    expect(tally.canvases).toBe(made)
    // A lower tier stamps the same pieces: only the page is painted again.
    view.resize(1180, 820, 1.25)
    expect(tally.canvases - made).toBeLessThan(6)
  })

  it('draws the bare page alone while the slot is still being read', () => {
    const { view } = yard()
    view.draw(null, null, TIERS[0], 0)
    expect(view.draws).toBe(1)
  })

  it('stays inside the budget at rest, with the door shut and with it open', () => {
    for (const state of [open(), { ...freshState(null), door: 'shut' as const }]) {
      const { farm, view } = yard(state)
      expect(heaviest(farm, view, 2, null)).toBeLessThan(BUDGET)
    }
  })

  it('stays inside the budget through every cell of the grid, with the glow and the ghost hand up', () => {
    const guidance: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    let most = 0, where = ''
    for (const brought of BROUGHT) {
      for (const animal of ANIMALS) {
        const { farm, view } = yard()
        if (brought !== 'finger') { farm.press(HOME[brought as ThingId].x, HOME[brought as ThingId].y); farm.tap() }
        const spot = at(farm, animal)
        farm.press(spot.x, spot.y)
        farm.tap()
        const draws = heaviest(farm, view, CELLS[cellOf(brought, animal)].lasts + 1, guidance)
        if (draws > most) { most = draws; where = cellOf(brought, animal) }
      }
    }
    expect(most, where).toBeLessThan(BUDGET)
  })

  it('stays inside the budget with everything going at once: every animal answering, the door sliding, the bystanders touched', () => {
    const { farm, view } = yard({ ...open(), content: ['hens', 'goat'] })
    farm.press(HOME.bucket.x, HOME.bucket.y)
    farm.tap()
    for (const animal of ANIMALS) { const spot = at(farm, animal); farm.press(spot.x, spot.y); farm.tap(); farm.step(0.3) }
    farm.press(250, 150)
    farm.press(804, 100)
    farm.press(386, 46)
    const door = centreOf(doorBox(farm.slide))
    farm.press(door.x, door.y - 100)
    expect(heaviest(farm, view, 5, { glow: 1, demo: 0.5, demoIndex: 1 })).toBeLessThan(BUDGET)
  })

  it('stays inside the budget through the three scenes, with a thing lifted', () => {
    // The coming out, then all four right things and the ending, then the night.
    const { farm, view } = yard({ ...freshState(null), door: 'shut' })
    const door = centreOf(doorBox(0))
    farm.press(door.x, door.y - 60)
    farm.tap()
    let most = heaviest(farm, view, 3, null)
    for (const [thing, animal] of [['scoop', 'hens'], ['brush', 'pony'], ['fork', 'goat'], ['bucket', 'pig']] as const) {
      farm.press(HOME[thing].x, HOME[thing].y); farm.tap()
      most = Math.max(most, heaviest(farm, view, 0.8, null))
      const spot = at(farm, animal)
      farm.press(spot.x, spot.y); farm.tap()
      most = Math.max(most, heaviest(farm, view, animal === 'pig' ? 11 : 4.5, null))
    }
    expect(farm.light).toBe(1)
    expect(farm.cat).toBe(1)
    const open = centreOf(doorBox(1))
    farm.press(open.x, open.y - 60)
    farm.tap()
    expect(farm.playing).toBe('night')
    // The night's ground and pieces are made once, the first time it is dark, and never again.
    const before = tally.canvases
    most = Math.max(most, heaviest(farm, view, 10, null))
    const made = tally.canvases - before
    expect(made).toBeGreaterThan(0)
    expect(farm.playing).toBeNull()
    farm.press(open.x, open.y - 60); farm.tap()
    heaviest(farm, view, 3, null)
    farm.press(open.x, open.y - 60); farm.tap()
    heaviest(farm, view, 10, null)
    expect(tally.canvases - before).toBe(made)
    expect(most).toBeLessThan(BUDGET)
  })

  it('stays inside the budget while the ghost hand shows a carry', () => {
    const { farm, view } = yard()
    expect(farm.want(1).kind).toBe('carry')
    expect(heaviest(farm, view, 2, { glow: 1, demo: 0.5, demoIndex: 1 })).toBeLessThan(BUDGET)
  })
})
