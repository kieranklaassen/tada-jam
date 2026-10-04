import { describe, expect, it } from 'vitest'
import { showing, showingLength, shownAt } from './showing'
import { kindOf, textureOf, type Bread, type Stuff } from './stuff'
import { IDEAS, POOLS, judge, type Idea } from './tastes'
import { VOICES } from './voices'

const last = (idea: Idea) => showing(idea)[showing(idea).length - 1].load
const raw = (idea: Idea, at: number): Stuff => { const load = shownAt(idea, at).load; if (!load || !load.raw) throw new Error(`${idea} at ${at}: not raw`); return load }

describe('the showing', () => {
  it('lasts four to eight seconds for each of the six ideas, and its moments come in order', () => {
    for (const idea of IDEAS) {
      expect(showingLength(idea), idea).toBeGreaterThanOrEqual(4)
      expect(showingLength(idea), idea).toBeLessThanOrEqual(8)
      const times = showing(idea).map((moment) => moment.at)
      expect([...times].sort((a, b) => a - b), idea).toEqual(times)
      expect(times[0]).toBe(0)
    }
  })

  it('shows each new act by doing it with the rules, so it is true', () => {
    expect(kindOf(raw('dough', 1.4))).toBe('dough')
    expect(textureOf(raw('dough', 1.4))).toBe('streaky')
    expect(textureOf(raw('dough', 3.2))).toBe('shaggy')
    expect(showing('dough')[showing('dough').length - 1], 'and it goes into the oven, where the showing stops').toMatchObject({ where: 'oven', load: { raw: true } })
    expect(raw('shapes', 1).long).toBe(true)
    expect(raw('shapes', 2.5).long).toBe(false)
    expect(raw('shapes', 3.6).long).toBe(true)
    expect(raw('rising', 2.6).rise).toBe(0)
    expect(raw('rising', 5.3).rise).toBe(100)
    expect((shownAt('crust', 0).load as Bread).crust).toBe('gold')
    expect((shownAt('crust', 1).load as Bread).crust).toBe('dark')
    expect((last('crust') as Bread).crust).toBe('black')
    expect(shownAt('seeds', 1).load, 'on a baked crust they roll off').toMatchObject({ raw: false, seeds: false })
    expect(raw('seeds', 3).seeds, 'pressed onto raw dough they stay').toBe(true)
    expect(kindOf(raw('batter', 1))).toBe('batter')
  })

  it('never ends on, or passes through, a bread that the customers who bring the idea want', () => {
    for (const idea of IDEAS) for (const group of POOLS[idea]) for (const moment of showing(idea)) {
      expect(judge(group, moment.load).wanted, `${idea} shown to ${group.join('+')} at ${moment.at}`).toBe(false)
    }
    // Nor the bread of whoever is at the hatch when two showings follow each other on a first visit.
    for (const moment of showing('dough')) expect(judge(['dachshund'], moment.load).wanted).toBe(false)
  })

  it('never shows a whole recipe: only the newest idea beyond making dough is in each', () => {
    for (const idea of ['dough', 'shapes', 'crust', 'batter'] as const) for (const moment of showing(idea)) if (moment.load?.raw) { expect(moment.load.bubbly, idea).toBe(false); expect(moment.load.seeds, idea).toBe(false) }
    for (const moment of showing('rising')) if (moment.load?.raw) expect(moment.load.long).toBe(false)
    expect(showing('rising').every((moment) => moment.load === null || moment.load.raw), 'the rise is shown, not the bake').toBe(true)
    expect(last('batter')?.raw, 'the batter is left unbaked').toBe(true)
    expect(last('seeds')?.raw, 'the seeded lump is left unbaked').toBe(true)
  })

  it('only ever asks for voices that exist', () => {
    for (const idea of IDEAS) for (const moment of showing(idea)) if (moment.voice) expect(Object.keys(VOICES), moment.voice).toContain(moment.voice)
  })

  it('gives the same moment for the same time, and the end state from the last moment on', () => {
    for (const idea of IDEAS) {
      expect(shownAt(idea, 2)).toBe(shownAt(idea, 2))
      expect(shownAt(idea, 99).load).toEqual(last(idea))
      expect(shownAt(idea, -1)).toBe(showing(idea)[0])
    }
  })
})
