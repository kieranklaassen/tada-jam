import { describe, expect, it } from 'vitest'
import { CELLS, GRID_H, GRID_W, PATCHES, SMEAR_PATCHES, TURNS, allShiny, cellAt, dab, dabCells, decode, encode, nextTool, tally, type Hand, type Patch, type Surface } from './surface'

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

  it('a cloth wiped through soft mud leaves a short streak where the finger goes next, and is then clean again', () => {
    let s = all('d')
    s[cellAt(2, 3)] = 's'
    let carried = null as ReturnType<typeof dab>['carries']
    for (let col = 2; col <= 8; col++) {
      const result = dab(s, 'cloth', col, 3, carried)
      s = result.surface
      carried = result.carries
    }
    // The mud is still where it was, three patches after it are smeared, and the rest of the rub shines.
    expect([2, 3, 4, 5].map((col) => s[cellAt(col, 3)])).toEqual(['s', 's', 's', 's'])
    expect([6, 7, 8].map((col) => s[cellAt(col, 3)])).toEqual(['p', 'p', 'p'])
    expect(carried).toBeNull()
    // Never mud all over: the rows beside the rub are shined, not smeared.
    expect(s[cellAt(4, 2)]).toBe('p')
    expect(tally(s).s).toBe(1 + SMEAR_PATCHES)
  })

  it('the cloth pushes foam along the same way, and dried mud does not come away on it', () => {
    const foamy = all('w')
    foamy[cellAt(5, 3)] = 'f'
    const first = dab(foamy, 'cloth', 5, 3)
    expect(first.carries).toEqual({ patch: 'f', left: SMEAR_PATCHES })
    expect(dab(first.surface, 'cloth', 6, 3, first.carries).surface[cellAt(6, 3)]).toBe('f')
    const caked = all('w')
    caked[cellAt(5, 3)] = 'c'
    const after = dab(caked, 'cloth', 5, 3)
    expect(after.carries).toBeNull()
    expect(after.surface[cellAt(5, 3)]).toBe('c')
    expect(after.surface[cellAt(4, 3)]).toBe('p')
  })

  it('only a cloth carries anything', () => {
    const s = all('s')
    for (const hand of ['finger', 'sponge', 'hose'] as const) expect(dab(s, hand, 5, 3, { patch: 's', left: 3 }).carries).toBeNull()
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

  it('names the tool a wash would take up next: mud before foam, foam before drying', () => {
    expect(nextTool(all('c'))).toBe('hose')
    expect(nextTool(all('s'))).toBe('sponge')
    expect(nextTool(all('b'))).toBe('hose')
    expect(nextTool(all('w'))).toBe('cloth')
    expect(nextTool(all('p'))).toBeNull()
    // One patch of soft mud on a dull vehicle: the sponge, however much there is to dry.
    const s = all('d')
    s[40] = 's'
    expect(nextTool(s)).toBe('sponge')
    s[41] = 'c'
    expect(nextTool(s)).toBe('hose')
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
