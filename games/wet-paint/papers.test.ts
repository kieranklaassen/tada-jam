import { describe, expect, it } from 'vitest'
import { tally } from './marble'
import { combedPaper, stonePaper } from './papers'

describe('the marbled papers of the room', () => {
  it('are the same sheet from the same seed, and another from another', () => {
    expect(stonePaper(5, 40, 30, 3, 5).cells).toEqual(stonePaper(5, 40, 30, 3, 5).cells)
    expect(stonePaper(5, 40, 30, 3, 5).cells).not.toEqual(stonePaper(6, 40, 30, 3, 5).cells)
    expect(combedPaper(7, 40, 30, [0, 1, 2], 4, 12, 6).cells).toEqual(combedPaper(7, 40, 30, [0, 1, 2], 4, 12, 6).cells)
  })

  it('hold every tone they were given and no other', () => {
    const stone = stonePaper(23, 80, 50, 4, 5), combed = combedPaper(11, 80, 50, [0, 1, 0, 2, 0, 3], 5, 22, 9)
    for (const paper of [stone, combed]) {
      const counts = tally(paper.cells, 8)
      for (let tone = 0; tone < 4; tone++) expect(counts[tone]).toBeGreaterThan(0)
      for (let tone = 4; tone < 8; tone++) expect(counts[tone]).toBe(0)
    }
  })

  it('bend the bands of a combed sheet: a row is no longer one tone', () => {
    const paper = combedPaper(7, 90, 40, [0, 1], 6, 18, 8)
    const row = paper.cells.slice(20 * 90, 21 * 90)
    expect(new Set(row).size).toBe(2)
  })
})
