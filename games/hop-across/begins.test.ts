import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { LAYOUTS, THINGS, layout } from './crossing'
import { startShowing } from './play'
import { STATS, bySlide, onTheBank, unsolvedBegin, type Worked } from './begins'

// The way across, held as play has it (begins.ts): every state a crossing can begin in, made by the game's own
// `hop` and `startShowing`, for every layout of the first five positions.

/** Everything wrong with the beginnings of these positions, and how many beginnings there were. */
function faultsOf(positions: readonly string[]): { wrong: string[]; begins: number } {
  const wrong: string[] = []
  let begins = 0
  for (const position of positions) {
    for (let which = 0; which < LAYOUTS; which++) {
      const lanes = layout(position, which)
      const worked: Worked = new Map()
      const slide = bySlide(position, lanes)
      if (slide.problem) wrong.push(`${position} ${which}: ${slide.problem}`)
      for (const begin of [...onTheBank(position, lanes), ...slide.begins]) {
        begins++
        const fault = unsolvedBegin(begin.saved, worked)
        if (fault) wrong.push(`${position} ${which}, ${begin.label}: ${fault}`)
      }
    }
  }
  return { wrong, begins }
}

describe('every beginning of a crossing, the first five positions', () => {
  it('has a way across with no mishap: on the bank with each showing that can be owed, and after a slide from every row at every step of the first lane', () => {
    const { wrong, begins } = faultsOf(LADDER.slice(0, 5))
    expect(wrong).toEqual([])
    // Every layout is met on the bank, and from five rows at eight steps of its first lane after a slide.
    expect(begins).toBeGreaterThanOrEqual(5 * LAYOUTS * (1 + 5 * 8))
    expect(STATS.spoiled).toBeGreaterThanOrEqual(0)
  }, 240000)
})

describe('the check itself', () => {
  const grass = { kind: 'grass' as const, movers: [] }
  const blocked = [grass, grass, grass, { kind: 'river' as const, movers: [] }, grass, grass, grass]
  it('fails a crossing with no way across, on the bank and after a slide', () => {
    for (const begin of onTheBank('logs', blocked)) expect(unsolvedBegin(begin.saved)).toMatch(/no way across/)
    const slide = bySlide('logs', blocked)
    expect(slide.problem).toBeNull()
    expect(slide.begins.length).toBe(5 * 8)
    for (const begin of slide.begins) expect(unsolvedBegin(begin.saved)).toMatch(/no way across/)
  })
  it('fails a first lane that does not come round in eight steps, since eight steps would not cover it', () => {
    const turtles = { kind: 'river' as const, movers: [{ kind: 'turtle' as const, at: 2, dir: 1 as const, count: 0 }, { kind: 'log' as const, at: 0, dir: 1 as const }] }
    expect(bySlide('logs', [turtles, grass, grass, grass, grass, grass, grass]).problem).not.toBeNull()
  })
  it('settles a showing as play does: the state the check keeps is the one `startShowing` gives', () => {
    const lanes = layout('bell', 3)
    for (const begin of [...onTheBank('bell', lanes), ...bySlide('bell', lanes).begins.slice(0, 40)]) {
      // Nothing is owed any more: every thing the crossing holds that could be shown here has been.
      const again = startShowing(begin.saved)
      if (again) expect(begin.label).toContain('nothing owed')
    }
    const owed = onTheBank('bell', lanes).find((begin) => begin.label.includes('the duck shows bell'))!
    const before = onTheBank('bell', lanes)[0].saved
    expect(owed.saved).toEqual(startShowing({ ...before, shown: THINGS.filter((thing) => thing !== 'bell') })!.saved)
  })

  it('meets beginnings where she starts flat under a car, and ones where the duck has stepped a lane alone', () => {
    const lanes = layout('bell', 0)
    const slide = bySlide('bell', lanes)
    const labels = [...onTheBank('bell', lanes), ...slide.begins].map((begin) => begin.label)
    expect(labels.some((label) => label.includes('the duck shows bell'))).toBe(true)
    let flat = 0
    for (let which = 0; which < 4; which++) flat += bySlide('cars', layout('cars', which)).begins.filter((begin) => begin.saved.family[0].flat).length
    expect(flat).toBeGreaterThan(0)
  })
})
