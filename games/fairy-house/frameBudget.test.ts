import { describe, expect, it } from 'vitest'
import { FOUND, type Kind } from './kinds'
import { makeRecording } from './recording'
import { build, laidOf, type Laid } from './rest'
import { freshSave } from './save'
import { STAGE } from './stage'
import { SUN_AT, TICK, Toy } from './toy'
import { DUSK_FRINGE, View } from './view'

// The frame budget. A canvas has no draw calls of its own, so the game's
// draw count is every sprite stamped plus every live path filled or stroked
// in a frame. That is what `View.draws` reports to the grown-up overlay, and
// this test counts the same calls on a stand-in canvas and holds them equal.

/** The jam's bar: under about 80 draws a frame. */
const BUDGET = 80

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

function staged(): { view: View; recording: ReturnType<typeof makeRecording> } {
  const recording = makeRecording(STAGE.width)
  const view = new View(recording.pen, recording.make, 1)
  view.resize(STAGE.width, STAGE.height, 2, 2)
  recording.reset()
  return { view, recording }
}

/** The fullest frame the toy can show: both lamps lit, both baths full, every thing on screen, the cue on four of them, dust in the air and a thing in the hand over its shadow. */
function fullest(): Toy {
  const things = build([
    { id: idOf('pebble', 0), x: 560 }, { id: idOf('cap', 0), x: 560 },
    { id: idOf('pebble', 1), x: 640 }, { id: idOf('cap', 1), x: 640 },
    { id: idOf('moss', 0), x: 760 }, { id: idOf('leaf', 0), x: 760 },
  ]).map(({ id, dropX }) => ({ id, x: dropX }))
  const toy = new Toy({ ...freshSave(7), things }, 1)
  // Six pats on the bare forest floor, between its two rows of things.
  for (let i = 0; i < 6; i++) toy.press(460 + i * 36, 739), toy.release()
  const bark = FOUND[idOf('bark')]
  toy.press(bark.home.x, bark.home.y - 12)
  toy.dragStart()
  toy.dragMove(420, 480)
  toy.step(0.2)
  return toy
}

/** A house in which every one of the three finds its thing, twice over where there are two. */
function evening(): ReturnType<typeof freshSave> {
  const laid: Laid[] = [
    { id: idOf('cap', 0), x: 422 }, { id: idOf('twig', 0), x: 392 }, { id: idOf('twig', 1), x: 452 }, { id: idOf('leaf', 0), x: 422 },
    { id: idOf('moss', 0), x: 560 }, { id: idOf('leaf', 1), x: 560 },
    { id: idOf('pebble', 0), x: 648 }, { id: idOf('cap', 1), x: 648 },
    { id: idOf('feather', 0), x: 740 }, { id: idOf('bark', 0), x: 820 },
  ]
  return { ...freshSave(7), things: laidOf(build(laid)) }
}

describe('the frame budget', () => {
  it('draws the wood alone, in one stamp, before the saved state has been read', () => {
    const { view, recording } = staged()
    view.draw(null)
    expect(recording.tally).toMatchObject({ stamps: 1, paths: 0, wide: 1 })
    expect(view.draws).toBe(1)
  })

  it('reports as its draw count the sprites it stamped plus the live paths it drew', () => {
    const { view, recording } = staged()
    const toy = new Toy(freshSave(null), 1)
    view.draw(toy.show(null))
    expect(view.draws).toBe(recording.tally.stamps + recording.tally.paths)
    // 18 things, the wood, ten parts of the three folk, the sun, the owl, the snail in two parts and the moth, and three paths for the faces.
    expect(view.draws).toBe(18 + 1 + 10 + 5 + 3)
  })

  it('stays under the budget in the fullest frame, with one full-surface stamp', () => {
    const { view, recording } = staged()
    const toy = fullest()
    const show = toy.show({ glow: 1, demo: 0.5, demoIndex: 0 })
    expect(show.shadow).not.toBeNull()
    expect(show.puffs.length).toBe(6)
    view.draw(show)
    expect(view.draws).toBe(recording.tally.stamps + recording.tally.paths)
    expect(view.draws).toBeLessThanOrEqual(BUDGET)
    expect(view.draws).toBe(42)
    expect(recording.tally.wide).toBe(1)
    // The ghost hand is the one thing that frame leaves out, since a finger is carrying: it is one more stamp.
    recording.reset()
    view.draw(new Toy(freshSave(7), 1).show({ glow: 1, demo: 0.5, demoIndex: 0 }))
    expect(recording.tally.stamps + recording.tally.paths).toBeLessThanOrEqual(BUDGET)
  })

  it('covers the surface once as the dusk comes down: the two sheets are stamped in parts that add up to one, with a narrow soft edge', () => {
    const { view, recording } = staged()
    const whole = recording.tally
    view.draw(null)
    const surface = whole.area
    expect(surface).toBe(STAGE.width * STAGE.height)
    const toy = new Toy(evening(), 1)
    toy.press(SUN_AT.x, SUN_AT.y)
    toy.dragStart()
    for (let i = 1; i <= 20; i++) {
      toy.dragMove(SUN_AT.x, SUN_AT.y + ((SUN_AT.setY - SUN_AT.y) * i) / 20)
      toy.step(TICK * 2)
      recording.reset()
      view.draw(toy.show(null))
      // Two parts that add up to one surface, and under the edge three narrow bands of dusk thinning out: a tenth of a surface more.
      expect(recording.tally.wide).toBeLessThanOrEqual(2 + DUSK_FRINGE.bands)
      expect(recording.tally.area).toBeGreaterThanOrEqual(surface - 1)
      expect(recording.tally.area).toBeLessThanOrEqual(surface * (1 + DUSK_FRINGE.bands * DUSK_FRINGE.share) + 1)
    }
    toy.drop()
    for (let i = 0; i < 400; i++) toy.step(TICK)
    recording.reset()
    view.draw(toy.show(null))
    expect(recording.tally).toMatchObject({ wide: 1, area: surface })
  })

  it('stays under the budget at every moment of the fullest evening and of the morning after it', () => {
    const { view, recording } = staged()
    const toy = new Toy(evening(), 1)
    let most = 0
    const look = (): void => {
      recording.reset()
      view.draw(toy.show({ glow: 1, demo: 0.5, demoIndex: 0 }))
      expect(view.draws).toBe(recording.tally.stamps + recording.tally.paths)
      most = Math.max(most, view.draws)
    }
    const dragSun = (to: number): void => {
      const from = toy.show(null).sun.y
      toy.press(SUN_AT.x, from)
      toy.dragStart()
      for (let i = 1; i <= 10; i++) toy.dragMove(SUN_AT.x, from + ((to - from) * i) / 10), toy.step(TICK * 2), look()
      toy.drop()
    }
    dragSun(SUN_AT.under)
    for (let i = 0; toy.playing && i < 60 * 120; i++) {
      toy.step(TICK)
      if (i % 3 === 0) look()
    }
    expect(toy.playing).toBe(false)
    // The evening standing, with every sleeper poked and every thing hopped.
    for (let i = 0; i < 8; i++) toy.press(380 + i * 56, 560), toy.release(), toy.step(TICK * 4), look()
    dragSun(SUN_AT.y)
    for (let i = 0; toy.playing && i < 60 * 120; i++) {
      toy.step(TICK)
      if (i % 3 === 0) look()
    }
    expect(most).toBeLessThanOrEqual(BUDGET)
    expect(most).toBe(47)
  })

  it('hatches nothing in a frame and nothing on a tier change: the sprites are made once for a size', () => {
    const { view, recording } = staged()
    const made = recording.tally.sheets
    expect(made).toBeGreaterThan(20)
    view.draw(new Toy(freshSave(null), 1).show(null))
    view.resize(STAGE.width, STAGE.height, 1.5, 2)
    view.resize(STAGE.width, STAGE.height, 1, 2)
    view.draw(new Toy(freshSave(null), 1).show(null))
    expect(recording.tally.sheets).toBe(made)
    // A surface with no size draws nothing and breaks nothing.
    view.resize(0, 0, 2, 2)
    view.draw(null)
    expect(view.draws).toBe(0)
  })
})
