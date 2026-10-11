import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { LAYOUTS, layout } from './crossing'
import { STATS, bySlide, onTheBank, unsolvedBegin, type Worked } from './begins'

// The way across, held as play has it (begins.ts): every state a crossing can begin in, made by the game's own
// `hop` and `startShowing`, for every layout of the last two positions.

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

describe('every beginning of a crossing, the road with rails and the last position', () => {
  it('has a way across with no mishap: on the bank with each showing that can be owed, and after a slide from every row at every step of the first lane', () => {
    const { wrong, begins } = faultsOf(LADDER.slice(7))
    expect(wrong).toEqual([])
    // Every layout is met on the bank, and from five rows at eight steps of its first lane after a slide.
    expect(begins).toBeGreaterThanOrEqual(2 * LAYOUTS * (1 + 5 * 8))
    expect(STATS.spoiled).toBeGreaterThanOrEqual(0)
  }, 240000)
})
