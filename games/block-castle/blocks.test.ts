import { describe, expect, it } from 'vitest'
import { COLS, KINDS, MAX_TOP, PER_KIND, ROWS, SHAPE, clampCol, clampRow, countOf, hangingSlope, heights, highestTop, isKind, landing, lowestOf, pull, seated, settle, slopeAt, slopeEnds, slopeFaces, tapPlace, type Placed } from './blocks'
import { below, makeRng } from './rng'

const at = (kind: Placed['kind'], col: number, row = 1): Placed => ({ kind, col, row })

/** A rug of blocks set down at chance, never more of a kind than the basket holds. */
function anyRug(seed: number, count: number): Placed[] {
  const rng = makeRng(seed)
  const rug: Placed[] = []
  const used = new Map<string, number>()
  while (rug.length < count) {
    const kind = KINDS[below(rng, KINDS.length)]
    if ((used.get(kind) ?? 0) >= PER_KIND) continue
    used.set(kind, (used.get(kind) ?? 0) + 1)
    const spot = landing(rug, kind, below(rng, COLS), below(rng, ROWS))
    rug.push({ kind, col: spot.col, row: spot.row })
  }
  return rug
}

describe('how blocks rest', () => {
  it('stands a block on whatever is highest under it', () => {
    expect(settle([at('cube', 3), at('cube', 3)]).map((block) => block.level)).toEqual([0, 2])
    // A long one across two cubes rests on them, with air under its middle.
    const bridge = [at('cube', 0), at('cube', 2), at('long', 0)]
    expect(settle(bridge)[2].level).toBe(2)
    expect(heights(bridge).slice(COLS, COLS + 3)).toEqual([3, 3, 3])
  })

  it('counts the blocks under a block, one on another, as its tier', () => {
    // Three round ones are a tower of three tiers, whatever their height in half levels.
    expect(settle([at('round', 3), at('round', 3), at('round', 3)]).map((block) => block.tier)).toEqual([0, 1, 2])
    // A long one across a cube and a pile of two takes the tier above the pile it rests on.
    expect(settle([at('long', 0), at('cube', 0), at('cube', 2), at('long', 0)]).map((block) => block.tier)).toEqual([0, 1, 1, 2])
    expect(landing([at('cube', 3), at('cube', 3)], 'thin', 3, 1).tier).toBe(2)
  })

  it('never topples: a long one hanging off one cube stays', () => {
    const rug = [at('cube', 0), at('long', 0)]
    expect(landing([at('cube', 0)], 'long', 0, 1)).toEqual({ col: 0, row: 1, level: 2, tier: 1, shed: null, over: null })
    expect(settle(rug)[1].level).toBe(2)
  })

  it('gives every place a height, row by row', () => {
    const high = heights([at('arch', 5, 2)])
    expect(high).toHaveLength(COLS * ROWS)
    expect(high[2 * COLS + 5]).toBe(3)
    expect(high[2 * COLS + 6]).toBe(3)
    expect(high.filter((h) => h > 0)).toHaveLength(2)
  })

  it('never stands one block inside another, whatever the order', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const standing = settle(anyRug(seed, 18))
      for (let a = 0; a < standing.length; a++) for (let b = a + 1; b < standing.length; b++) {
        const one = standing[a], two = standing[b]
        if (one.row !== two.row) continue
        const shared = one.col < two.col + SHAPE[two.kind].wide && two.col < one.col + SHAPE[one.kind].wide
        if (!shared) continue
        const apart = one.level + SHAPE[one.kind].high <= two.level || two.level + SHAPE[two.kind].high <= one.level
        expect(apart, `seed ${seed}: ${one.kind} and ${two.kind}`).toBe(true)
      }
    }
  })

  it('keeps every top in the frame', () => {
    for (let seed = 1; seed <= 40; seed++) for (const block of settle(anyRug(seed, 18))) expect(block.level + SHAPE[block.kind].high).toBeLessThanOrEqual(MAX_TOP)
  })
})

describe('what cannot stay', () => {
  it('glances a block off the tip of a thin one to the place beside it', () => {
    const spot = landing([at('thin', 3)], 'cube', 3, 1)
    expect(spot.shed).toBe('tip')
    expect(spot.over).toEqual({ col: 3, row: 1, level: 4 })
    expect(spot).toMatchObject({ col: 4, row: 1, level: 0 })
  })

  it('slides a block down the face of a slope to its foot', () => {
    // A slope on the right half runs down to the right.
    expect(slopeFaces(4)).toBe('right')
    expect(slopeFaces(1)).toBe('left')
    const spot = landing([at('slope', 4)], 'cube', 4, 1)
    expect(spot.shed).toBe('slope')
    expect(spot).toMatchObject({ col: 6, row: 1, level: 0 })
  })

  it('holds a wide block that has a seat under any part of it', () => {
    // An arch over a thin one and a taller pile beside it rests on the pile.
    const rug = [at('thin', 2), at('round', 3), at('cube', 3)]
    expect(landing(rug, 'arch', 2, 1)).toMatchObject({ col: 2, level: 5, shed: null })
  })

  it('lets a pile grow no higher than the frame', () => {
    const pile = [at('round', 3), at('round', 3), at('round', 3)]
    expect(highestTop(pile)!.level + 3).toBe(MAX_TOP)
    const spot = landing(pile, 'cube', 3, 1)
    expect(spot.shed).toBe('tip')
    expect(spot.level).toBe(0)
    expect(spot.col).not.toBe(3)
  })

  it('always finds a place, on a rug of every block', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rug = anyRug(seed, 17)
      const left = KINDS.find((kind) => countOf(rug, kind) < PER_KIND)!
      for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) {
        const spot = landing(rug, left, col, row)
        expect(spot.col).toBeGreaterThanOrEqual(0)
        expect(spot.col + SHAPE[left].wide).toBeLessThanOrEqual(COLS)
        expect(spot.level + SHAPE[left].high).toBeLessThanOrEqual(MAX_TOP)
      }
    }
  })
})

describe('a tap in the basket', () => {
  it('sends the first block to the middle of a bare rug', () => {
    expect(tapPlace([], 'cube')).toMatchObject({ col: 3, row: 1, level: 0 })
    expect(tapPlace([], 'long')).toMatchObject({ col: 2, row: 1, level: 0 })
  })

  it('sends the next to a free place beside the last, on the rug and not on the pile', () => {
    const spot = tapPlace([at('cube', 3)], 'cube')
    expect(spot.level).toBe(0)
    expect(Math.abs(spot.col - 3) + Math.abs(spot.row - 1)).toBe(1)
  })
})

describe('pulling a block out', () => {
  it('drops what rested on it straight down', () => {
    const pulled = pull([at('cube', 3), at('round', 3), at('cube', 0)], 0)
    expect(pulled.placed).toEqual([at('round', 3), at('cube', 0)])
    expect(pulled.dropped).toEqual([2, 0])
  })

  it('leaves a block held by another where it is', () => {
    const pulled = pull([at('cube', 0), at('cube', 2), at('long', 0)], 0)
    expect(pulled.dropped).toEqual([0, 0])
  })
})

describe('reading the rug', () => {
  it('knows the highest top and the lowest of a kind', () => {
    const rug = [at('cube', 0), at('round', 3), at('cube', 3)]
    expect(highestTop(rug)).toMatchObject({ kind: 'cube', col: 3, level: 3 })
    expect(lowestOf(rug, 'cube')).toMatchObject({ col: 0, level: 0 })
    expect(lowestOf(rug, 'arch')).toBeNull()
    expect(highestTop([])).toBeNull()
    expect(countOf(rug, 'cube')).toBe(2)
  })

  it('keeps a kind and a place honest', () => {
    expect(isKind('arch')).toBe(true)
    expect(isKind('door')).toBe(false)
    expect(isKind(3)).toBe(false)
    expect(clampCol('long', 6)).toBe(4)
    expect(clampCol('cube', -2)).toBe(0)
    expect(clampRow(9)).toBe(ROWS - 1)
  })
})

describe('a slope and its heel', () => {
  it('has its heel at the inner end, whichever way it faces', () => {
    for (let col = 0; col <= COLS - 2; col++) {
      const ends = slopeEnds(col)
      expect(ends).toEqual(slopeFaces(col) === 'left' ? { heel: col + 1, toe: col } : { heel: col, toe: col + 1 })
    }
  })

  it('pointed at a lone block sits with its heel on it and its toe over the air, in every column it can and with both facings', () => {
    const faced = new Set<string>()
    for (const kind of ['cube', 'round'] as const) for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (col + SHAPE[kind].wide > COLS) continue
      const rug = [at(kind, col, row)]
      const high = heights(rug)
      // Each place of the block the finger can be over.
      for (let under = col; under < col + SHAPE[kind].wide; under++) {
        const spot = landing(rug, 'slope', slopeAt(rug, under, row), row)
        const ends = slopeEnds(spot.col)
        const heelTop = high[row * COLS + ends.heel], toeTop = high[row * COLS + ends.toe]
        // Wherever it comes to rest, its heel is on the highest place under it.
        expect(heelTop, `${kind} ${col},${row} under ${under}`).toBeGreaterThanOrEqual(toeTop)
        expect(spot.level, `${kind} ${col},${row} under ${under}`).toBe(heelTop)
        expect(hangingSlope([...rug, at('slope', spot.col, spot.row)])).toBe(-1)
        // At either end of the rug the heel of a slope is the inner place, so it cannot be on a block that
        // stands on the outermost place alone: there it touches, cannot stay, and comes down beside it.
        const canHeel = [under - 1, under].some((c) => c >= 0 && c <= COLS - 2 && slopeEnds(c).heel === under)
        if (!canHeel) {
          expect([0, COLS - 1]).toContain(under)
          expect(spot.shed, `${kind} ${col},${row} under ${under}`).toBe('tip')
          expect(spot.level).toBe(0)
          continue
        }
        // Everywhere else: it stays where it was set, its heel on the block under the finger and its toe on air.
        expect(spot.over, `${kind} ${col},${row} under ${under}`).toBeNull()
        expect(ends.heel, `${kind} ${col},${row} under ${under}`).toBe(under)
        expect(spot.level).toBe(SHAPE[kind].high)
        expect(toeTop).toBe(0)
        faced.add(`${under} ${slopeFaces(spot.col)}`)
      }
    }
    // Columns one to five, the middle one with either facing open to it.
    expect([...faced].sort()).toEqual(['1 left', '2 left', '3 right', '4 right', '5 right'])
    const middle = [at('cube', 3, 1), at('round', 4, 1)]
    // With the place on its right taken higher, a slope pointed at the middle column faces left instead.
    const spot = landing(middle, 'slope', slopeAt(middle, 3, 1), 1)
    expect(slopeFaces(spot.col)).toBe('left')
    expect(slopeEnds(spot.col).heel).toBe(3)
    expect(spot.over).toBeNull()
  })

  it('is never left held up by its toe: not set down so, not sent so by a tap, and a rug saved so is seated', () => {
    // Toe on a block, heel over the rug: refused wherever it is tried.
    for (let col = 0; col <= COLS - 2; col++) {
      const { toe } = slopeEnds(col)
      const rug = [at('cube', toe, 1)]
      const spot = landing(rug, 'slope', col, 1)
      expect(spot.over, `col ${col}`).toEqual({ col, row: 1, level: 2 })
      expect(hangingSlope([...rug, at('slope', spot.col, spot.row)])).toBe(-1)
      // As a saved rug it is found and seated.
      const saved = [...rug, at('slope', col, 1)]
      expect(hangingSlope(saved)).toBe(1)
      const now = seated(saved)
      expect(now).toHaveLength(2)
      expect(hangingSlope(now)).toBe(-1)
      expect(now[0]).toEqual(rug[0])
    }
    // A rug with nothing wrong comes back as it is.
    const fine = [at('cube', 3, 1), at('slope', 3, 1), at('long', 0, 0)]
    expect(seated(fine)).toEqual(fine)
    // On any rug, wherever a slope is set or sent, it is seated.
    for (let seed = 1; seed <= 60; seed++) {
      const rug = anyRug(seed, 1 + (seed % 12)).filter((block) => block.kind !== 'slope')
      expect(hangingSlope(rug)).toBe(-1)
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const spot = landing(rug, 'slope', slopeAt(rug, col, row), row)
        expect(hangingSlope([...rug, at('slope', spot.col, spot.row)]), `seed ${seed} at ${col},${row}`).toBe(-1)
      }
      const sent = tapPlace(rug, 'slope')
      expect(hangingSlope([...rug, at('slope', sent.col, sent.row)]), `seed ${seed} tapped`).toBe(-1)
    }
  })
})
