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
    for (const patch of ['c', 's', 'm', 'b', 'f'] as const) expect(TURNS.cloth[patch]).toBe(patch)
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
    for (const start of ['c', 's', 'm', 'b', 'f', 'w', 'd', 'p'] as const) {
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

  /** Rubs the cloth along a row from `from` to `to`, `times` dabs on each patch, as a slow finger does. */
  function wipe(surface: Surface, row: number, from: number, to: number, times = 1): { surface: Surface; carried: ReturnType<typeof dab>['carries'] } {
    let s = surface, carried = null as ReturnType<typeof dab>['carries']
    const step = to >= from ? 1 : -1
    for (let col = from; col !== to + step; col += step) for (let i = 0; i < times; i++) {
      const result = dab(s, 'cloth', col, row, carried)
      s = result.surface
      carried = result.carries
    }
    return { surface: s, carried }
  }

  it('a cloth wiped through soft mud leaves a smear on the next three patches, and is then clean', () => {
    const start = all('d')
    start[cellAt(2, 3)] = 's'
    const { surface: s, carried } = wipe(start, 3, 2, 8)
    // The mud is still where it was, three patches after it are smeared, and the rest of the rub shines.
    expect([2, 3, 4, 5, 6, 7, 8].map((col) => s[cellAt(col, 3)])).toEqual(['s', 'm', 'm', 'm', 'p', 'p', 'p'])
    expect(carried).toBeNull()
    // Never mud all over: the rows beside the rub are shined, not smeared.
    expect(s[cellAt(4, 2)]).toBe('p')
    expect(tally(s).mud).toBe(1 + SMEAR_PATCHES)
  })

  it('the cloth picks nothing up from a smear: no number of dabs or passes spreads one further', () => {
    const start = all('d')
    start[cellAt(2, 3)] = 's'
    // A slow finger dabs each patch three times before it moves on. This is what turned a vehicle brown.
    let s = wipe(start, 3, 2, 10, 3).surface
    expect(tally(s).mud).toBe(1 + SMEAR_PATCHES)
    // The same rub again and again, and a rub that begins on the smear itself.
    for (let pass = 0; pass < 5; pass++) s = wipe(s, 3, 2, 10, 2).surface
    s = wipe(s, 3, 4, 10).surface
    expect(tally(s).mud).toBe(1 + SMEAR_PATCHES)
    expect([2, 3, 4, 5, 6].map((col) => s[cellAt(col, 3)])).toEqual(['s', 'm', 'm', 'm', 'p'])
  })

  it('a muddy cloth comes clean over three patches whatever they hold, so mud is never carried far', () => {
    const start = all('d')
    start[cellAt(2, 3)] = 's'
    for (const col of [3, 4, 5]) start[cellAt(col, 3)] = 'c'
    const { surface: s, carried } = wipe(start, 3, 2, 8)
    // The three patches after the mud were dried mud: nothing was laid on them, and the cloth is clean beyond them.
    expect([3, 4, 5, 6, 7].map((col) => s[cellAt(col, 3)])).toEqual(['c', 'c', 'c', 'p', 'p'])
    expect(carried).toBeNull()
  })

  it('every way of rubbing from one patch of soft mud leaves mud only within three patches of it', () => {
    let s = all('p')
    s[cellAt(6, 3)] = 's'
    // Out from the mud in all four directions, over and over.
    for (let pass = 0; pass < 4; pass++) {
      s = wipe(s, 3, 6, 11).surface
      s = wipe(s, 3, 6, 0).surface
      for (const dir of [1, -1]) {
        let carried = null as ReturnType<typeof dab>['carries']
        for (let row = 3; row >= 0 && row < GRID_H; row += dir) {
          const result = dab(s, 'cloth', 6, row, carried)
          s = result.surface
          carried = result.carries
        }
      }
    }
    s.forEach((patch, cell) => {
      if (patch !== 's' && patch !== 'm') return
      const col = cell % GRID_W, row = Math.floor(cell / GRID_W)
      expect(Math.abs(col - 6) + Math.abs(row - 3)).toBeLessThanOrEqual(SMEAR_PATCHES)
    })
    expect(tally(s).mud).toBe(1 + 4 * SMEAR_PATCHES)
  })

  it('a smear is mud to the sponge and the hose: soap lifts it, water leaves it', () => {
    expect(TURNS.sponge.m).toBe('b')
    expect(TURNS.hose.m).toBe('m')
    expect(TURNS.cloth.m).toBe('m')
    expect(tally(all('m')).mud).toBe(CELLS)
  })

  it('the cloth pushes foam along: it moves with the rub, the paint behind is left wet, and there is never more of it', () => {
    const start = all('w')
    start[cellAt(5, 3)] = 'f'
    const first = dab(start, 'cloth', 5, 3)
    expect(first.carries).toEqual({ patch: 'f', at: cellAt(5, 3), left: 1 })
    const { surface: s } = wipe(start, 3, 5, 9, 2)
    expect(tally(s).foam).toBe(1)
    expect(s[cellAt(9, 3)]).toBe('f')
    expect(s[cellAt(5, 3)]).not.toBe('f')
    // Brown foam the same, and any number of passes over a foamy vehicle makes no more foam.
    let foamy = all('w')
    for (const col of [1, 4, 5, 9]) foamy[cellAt(col, 2)] = 'b'
    for (let pass = 0; pass < 4; pass++) for (let row = 0; row < GRID_H; row++) foamy = wipe(foamy, row, 0, GRID_W - 1, 2).surface
    expect(tally(foamy).foam).toBe(4)
    expect(tally(foamy).b).toBe(4)
  })

  it('dried mud does not come away on the cloth, and foam that is gone is not laid down', () => {
    const caked = all('w')
    caked[cellAt(5, 3)] = 'c'
    const after = dab(caked, 'cloth', 5, 3)
    expect(after.carries).toBeNull()
    expect(after.surface[cellAt(5, 3)]).toBe('c')
    expect(after.surface[cellAt(4, 3)]).toBe('p')
    // The foam the cloth was pushing has been taken off by something else: nothing is made of it.
    const gone = all('w')
    const result = dab(gone, 'cloth', 6, 3, { patch: 'f', at: cellAt(5, 3), left: 1 })
    expect(tally(result.surface).foam).toBe(0)
    expect(result.carries).toBeNull()
  })

  it('only a cloth carries anything', () => {
    const s = all('s')
    for (const hand of ['finger', 'sponge', 'hose'] as const) expect(dab(s, hand, 5, 3, { patch: 'm', at: 0, left: 3 }).carries).toBeNull()
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
