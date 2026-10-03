import { describe, expect, it } from 'vitest'
import { CELLS, GRID_H, GRID_W, PATCHES, TURNS, allShiny, busiestTool, cellAt, dab, dabCells, decode, encode, tally, type Hand, type Patch, type Surface } from './surface'

const all = (patch: Patch): Surface => Array.from({ length: CELLS }, () => patch)
const HANDS: Hand[] = ['finger', 'sponge', 'hose', 'cloth']

/** Dabs every patch of the grid once with `hand`. */
function wipe(surface: Surface, hand: Hand): Surface {
  let s = surface
  for (let row = 0; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) s = dab(s, hand, col, row).surface
  return s
}

describe('what each tool does', () => {
  it('soap lifts soft mud into foam that stays on the vehicle, and leaves dried mud where it is', () => {
    expect(TURNS.sponge.s).toBe('b')
    expect(TURNS.sponge.c).toBe('c')
    expect(TURNS.sponge.b).toBe('b')
  })

  it('water carries foam away, only softens dried mud, and does not move soft mud', () => {
    expect(TURNS.hose.b).toBe('w')
    expect(TURNS.hose.f).toBe('w')
    expect(TURNS.hose.c).toBe('s')
    expect(TURNS.hose.s).toBe('s')
  })

  it('the cloth dries and shines, and takes no mud or foam off', () => {
    expect(TURNS.cloth.w).toBe('p')
    expect(TURNS.cloth.d).toBe('p')
    for (const patch of ['c', 's', 'b', 'f'] as const) expect(TURNS.cloth[patch]).toBe(patch)
  })

  it('a bare finger only leaves a print on a shine', () => {
    for (const patch of PATCHES) expect(TURNS.finger[patch]).toBe(patch === 'p' ? 'd' : patch)
  })

  it('no hand ever puts body where there is none, or takes it away', () => {
    for (const hand of HANDS) for (const patch of PATCHES) expect(TURNS[hand][patch] === '.').toBe(patch === '.')
  })
})

describe('the order of a wash follows from the materials', () => {
  it('wet, soap, rinse, dry takes dried mud to a shine, each step moving every patch forward', () => {
    let s = all('c')
    s = wipe(s, 'hose')
    expect(tally(s).s).toBe(CELLS)
    s = wipe(s, 'sponge')
    expect(tally(s).b).toBe(CELLS)
    s = wipe(s, 'hose')
    expect(tally(s).w).toBe(CELLS)
    s = wipe(s, 'cloth')
    expect(allShiny(s)).toBe(true)
  })

  it('soap, rinse, dry is enough for soft mud', () => {
    expect(allShiny(wipe(wipe(wipe(all('s'), 'sponge'), 'hose'), 'cloth'))).toBe(true)
  })

  it('no single tool, however long it is used, cleans dried mud', () => {
    for (const hand of HANDS) {
      let s = all('c')
      for (let i = 0; i < 6; i++) s = wipe(s, hand)
      expect(tally(s).mud, hand).toBe(CELLS)
    }
  })

  it('a wrong order is never a dead end: any state can still be washed to a shine', () => {
    for (const start of ['c', 's', 'b', 'f', 'w', 'd', 'p'] as const) {
      // The worst a child can do first: every tool in the wrong order, twice.
      let s = all(start)
      for (const hand of ['cloth', 'sponge', 'cloth', 'finger', 'hose', 'cloth', 'sponge'] as const) s = wipe(s, hand)
      for (const hand of ['hose', 'sponge', 'hose', 'cloth'] as const) s = wipe(s, hand)
      expect(allShiny(s), start).toBe(true)
    }
  })
})

describe('a dab', () => {
  it('covers the patch under the finger and the four beside it, and stays on the grid', () => {
    expect(dabCells(5, 3).sort((a, b) => a - b)).toEqual([cellAt(5, 2), cellAt(4, 3), cellAt(5, 3), cellAt(6, 3), cellAt(5, 4)].sort((a, b) => a - b))
    expect(dabCells(0, 0)).toHaveLength(3)
    expect(dabCells(GRID_W - 1, GRID_H - 1)).toHaveLength(3)
  })

  it('reports what it met, the finger\'s own patch first, and which patches changed', () => {
    const s = all('d')
    s[cellAt(5, 3)] = 's'
    const result = dab(s, 'sponge', 5, 3)
    expect(result.met[0]).toBe('s')
    expect(result.met).toHaveLength(5)
    expect(result.changed).toHaveLength(5)
    expect(result.surface[cellAt(5, 3)]).toBe('b')
    expect(result.surface[cellAt(4, 3)]).toBe('f')
    // The surface passed in is not touched.
    expect(s[cellAt(5, 3)]).toBe('s')
  })

  it('returns the same surface when nothing changed, so a view knows not to redraw', () => {
    const s = all('c')
    expect(dab(s, 'cloth', 4, 4).surface).toBe(s)
    expect(dab(s, 'cloth', 4, 4).met).toHaveLength(5)
  })

  it('meets nothing off the body', () => {
    const s = all('.')
    const result = dab(s, 'hose', 3, 3)
    expect(result.met).toHaveLength(0)
    expect(result.surface).toBe(s)
  })

  it('the cloth smears soft mud onto the clean paint under it', () => {
    const s = all('p')
    s[cellAt(5, 3)] = 's'
    const after = dab(s, 'cloth', 5, 3).surface
    for (const cell of dabCells(5, 3)) expect(after[cell]).toBe('s')
    expect(after[cellAt(7, 3)]).toBe('p')
  })

  it('the cloth pushes foam along, and does not spread dried mud', () => {
    const foamy = all('w')
    foamy[cellAt(5, 3)] = 'f'
    expect(dab(foamy, 'cloth', 5, 3).surface[cellAt(4, 3)]).toBe('f')
    const caked = all('w')
    caked[cellAt(5, 3)] = 'c'
    const after = dab(caked, 'cloth', 5, 3).surface
    expect(after[cellAt(5, 3)]).toBe('c')
    expect(after[cellAt(4, 3)]).toBe('p')
  })
})

describe('reading the surface', () => {
  it('tallies mud and foam and the body', () => {
    const s = all('.')
    s[0] = 'c'; s[1] = 's'; s[2] = 'b'; s[3] = 'f'; s[4] = 'w'; s[5] = 'p'
    const t = tally(s)
    expect([t.body, t.mud, t.foam]).toEqual([6, 2, 2])
    expect(allShiny(s)).toBe(false)
    expect(allShiny(all('.'))).toBe(false)
  })

  it('names the tool with the most work waiting, in the order of a wash on a tie', () => {
    expect(busiestTool(all('c'))).toBe('hose')
    expect(busiestTool(all('s'))).toBe('sponge')
    expect(busiestTool(all('b'))).toBe('hose')
    expect(busiestTool(all('w'))).toBe('cloth')
    expect(busiestTool(all('p'))).toBeNull()
  })

  it('a grid survives a save, and a damaged one is refused', () => {
    const s = all('d')
    s[7] = 'c'; s[20] = '.'
    expect(decode(encode(s))).toEqual(s)
    expect(encode(s)).toHaveLength(CELLS)
    expect(decode('ccc')).toBeNull()
    expect(decode(encode(s).replace('c', 'X'))).toBeNull()
    expect(decode(42)).toBeNull()
    expect(decode(null)).toBeNull()
  })
})
