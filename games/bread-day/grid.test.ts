import { describe, expect, it } from 'vitest'
import { ACTS, GRID, SHEET_ROWS, WHATS, cueFor, whatIs, type What } from './grid'
import { BAKE_SECONDS, EMPTY, MOST, RISE_SECONDS, WORK_FULL, WORK_SHAGGY, WORK_SMOOTH, darker, push, rest, tip, type Ingredient, type Load, type Stuff } from './stuff'
import { reachableBreads } from './tastes'

const make = (...what: Ingredient[]): Load => what.reduce<Load>((at, next) => tip(at, next).load, null)
const pushed = (load: Load, times: number): Load => { for (let i = 0; i < times; i++) load = push(load).load; return load }

describe('the grid', () => {
  it('answers every act on every thing with a motion and a voice: nothing lands in silence on a still screen', () => {
    for (const what of WHATS) for (const act of ACTS) {
      const cue = GRID[what][act]
      expect(cue.motion.length, `${what} ${act}`).toBeGreaterThan(0)
      expect(cue.voice.length, `${what} ${act}`).toBeGreaterThan(0)
    }
    expect(Object.keys(GRID).sort()).toEqual([...WHATS].sort())
  })

  it('gives the thirty cells of the sheet thirty different motions and thirty different voices', () => {
    const cells = Object.values(SHEET_ROWS).flatMap((what) => ACTS.map((act) => GRID[what][act]))
    expect(cells.length).toBe(30)
    expect(new Set(cells.map((cue) => cue.motion)).size).toBe(30)
    expect(new Set(cells.map((cue) => cue.voice)).size).toBe(30)
  })

  it('never answers two things alike anywhere: every motion and every voice in the table is used once', () => {
    const all = WHATS.flatMap((what) => ACTS.map((act) => GRID[what][act]))
    expect(new Set(all.map((cue) => cue.motion)).size).toBe(all.length)
    expect(new Set(all.map((cue) => cue.voice)).size).toBe(all.length)
  })
})

describe('what lies on the peel', () => {
  it('names each stage of the stuff as the rules make it', () => {
    const made: [What, Load][] = [
      ['dust', make('flour')], ['puddle', make('water')], ['loose-seeds', make('seeds')], ['froth', make('bubbly')],
      ['batter', make('flour', 'water', 'water')],
      ['streaky', make('flour', 'water')], ['shaggy', pushed(make('flour', 'water'), WORK_SHAGGY)], ['smooth', pushed(make('flour', 'water'), WORK_SMOOTH)],
      ['risen', rest(pushed(make('flour', 'water', 'bubbly'), WORK_FULL), 'nook', RISE_SECONDS)],
      ['toasted-dust', rest(make('flour'), 'oven', BAKE_SECONDS)], ['toasted-seeds', rest(make('seeds'), 'oven', BAKE_SECONDS)],
      ['pancake', rest(make('flour', 'water', 'water'), 'oven', BAKE_SECONDS)], ['crumbly', rest(make('flour', 'water'), 'oven', BAKE_SECONDS)],
      ['brick', rest(pushed(make('flour', 'water'), WORK_FULL), 'oven', BAKE_SECONDS)],
      ['airy', rest(rest(pushed(make('flour', 'water', 'bubbly'), WORK_FULL), 'nook', RISE_SECONDS), 'oven', BAKE_SECONDS)],
    ]
    for (const [what, load] of made) expect(whatIs(load), what).toBe(what)
    expect(made.map(([what]) => what).sort(), 'every name in the table can be made').toEqual([...WHATS].sort())
    expect(whatIs(null)).toBeNull()
    expect(whatIs(EMPTY)).toBeNull()
    expect(cueFor(null, 'push')).toBeNull()
  })

  it('has a name, and so an answer to every act, for everything the rules can put on the peel', () => {
    for (let flour = 0; flour <= MOST; flour++) for (let water = 0; water <= MOST; water++) for (const bubbly of [false, true]) for (const seeds of [false, true])
      for (const work of [0, WORK_SHAGGY, WORK_SMOOTH]) for (const rise of [0, 40]) {
        const stuff: Stuff = { ...EMPTY, flour, water, bubbly, seeds, work, rise }
        if (flour + water === 0 && !bubbly && !seeds) continue
        for (const act of ACTS) expect(cueFor(stuff, act), JSON.stringify(stuff)).not.toBeNull()
      }
    for (const bread of reachableBreads()) for (const act of ACTS) expect(cueFor(darker(bread), act)).not.toBeNull()
  })
})
