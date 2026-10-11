import { describe, expect, it } from 'vitest'
import { CAKED, CELLS, KINDS, OUTLINES, STROKES, cleanMud, decodeMud, dollop, encodeMud, isCuff, isPocket, maskOf, mudLeft, muddied, onCloth, patches, rub, spotOn, MAX_KNOTS, sudsKnots } from './cloth'
import { makeRng } from './rng'

describe('the garments', () => {
  it.each(KINDS)('%s is an outline inside the unit box with enough cloth to rub', (kind) => {
    for (const [u, v] of OUTLINES[kind]) {
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    const cloth = maskOf(kind).filter(Boolean).length
    expect(cloth).toBeGreaterThanOrEqual(20)
    expect(cloth).toBeLessThan(CELLS)
  })

  it('no two garments share a silhouette', () => {
    const shapes = KINDS.map((kind) => maskOf(kind).map((cloth) => (cloth ? '1' : '0')).join(''))
    expect(new Set(shapes).size).toBe(KINDS.length)
  })

  it('a point drawn from the stream always lies on the cloth', () => {
    const rng = makeRng(5)
    for (const kind of KINDS) for (let n = 0; n < 40; n++) {
      const at = spotOn(kind, rng)
      expect(onCloth(kind, at.u, at.v)).toBe(true)
    }
  })
})

describe('mud', () => {
  it.each(KINDS)('a %s arrives muddy, only on its cloth, and the same for the same seed', (kind) => {
    const mud = muddied(kind, makeRng(11))
    expect(mudLeft(mud)).toBeGreaterThan(0)
    const mask = maskOf(kind)
    mud.forEach((level, i) => {
      expect(level).toBeGreaterThanOrEqual(0)
      expect(level).toBeLessThanOrEqual(CAKED)
      if (!mask[i]) expect(level).toBe(0)
    })
    expect(muddied(kind, makeRng(11))).toEqual(mud)
  })

  it('a dollop never lowers mud that is already there', () => {
    const mud = cleanMud()
    dollop(mud, 'shirt', 0.5, 0.5, 0.15)
    const before = mud.slice()
    const changed = dollop(mud, 'shirt', 0.5, 0.6, 0.1)
    mud.forEach((level, i) => expect(level).toBeGreaterThanOrEqual(before[i]))
    for (const cell of changed) expect(mud[cell]).toBeGreaterThan(before[cell])
  })

  it('a dab lifts one step from the mud under the finger and from nowhere else', () => {
    const mud = cleanMud(), work = cleanMud()
    dollop(mud, 'jumper', 0.5, 0.3, 0.1)
    dollop(mud, 'jumper', 0.5, 0.85, 0.1)
    const before = mud.slice()
    const lifted = rub(mud, work, 'jumper', 0.5, 0.3, 0.5, 0.3)
    expect(lifted.length).toBeGreaterThan(0)
    mud.forEach((level, i) => {
      const v = (Math.floor(i / 10) + 0.5) / 10
      if (v > 0.6) expect(level).toBe(before[i])
      else expect(level).toBe(before[i] - (lifted.includes(i) ? 1 : 0))
    })
  })

  it('a scarf is pulled across the board: its mud comes off as a stripe the whole height of the cloth under the finger', () => {
    const mud = cleanMud(), work = cleanMud()
    dollop(mud, 'scarf', 0.15, 0.4, 0.08)
    dollop(mud, 'scarf', 0.15, 0.85, 0.08)
    dollop(mud, 'scarf', 0.8, 0.4, 0.08)
    const before = mud.slice()
    // The finger is on the top of the scarf only, at its left end.
    const lifted = rub(mud, work, 'scarf', 0.15, 0.4, 0.15, 0.4)
    const rows = new Set(lifted.map((i) => Math.floor(i / 10)))
    expect(rows.has(3) || rows.has(4)).toBe(true)
    expect(rows.has(8)).toBe(true)
    mud.forEach((level, i) => { if (i % 10 >= 6) expect(level).toBe(before[i]) })
  })

  it('mud rubbed off the body of a shirt gathers in the nearer cuff, and is chased there', () => {
    const mud = cleanMud(), work = cleanMud()
    dollop(mud, 'shirt', 0.4, 0.7, 0.06)
    const cuffBefore = mud.reduce((sum, level, i) => sum + (isCuff(i) && i % 10 < 5 ? level : 0), 0)
    const lifted = rub(mud, work, 'shirt', 0.4, 0.7, 0.4, 0.7)
    expect(lifted.length).toBeGreaterThan(0)
    const cuffAfter = mud.reduce((sum, level, i) => sum + (isCuff(i) && i % 10 < 5 ? level : 0), 0)
    expect(cuffAfter).toBeGreaterThan(cuffBefore)
    const right = mud.reduce((sum, level, i) => sum + (isCuff(i) && i % 10 >= 5 ? level : 0), 0)
    expect(right).toBe(0)
    // And the cuff itself rubs clean.
    for (let n = 0; n < 12; n++) rub(mud, work, 'shirt', 0.1, 0.4, 0.2, 0.4)
    expect(mud.reduce((sum, level, i) => sum + (isCuff(i) && i % 10 < 5 ? level : 0), 0)).toBe(0)
  })

  it('mud hides in the pockets of the dungarees: a moving finger rubs twice as far there, and a dab lifts a step there as anywhere', () => {
    const cellOf = (u: number, v: number) => Math.floor(v * 10) * 10 + Math.floor(u * 10)
    /** Short strokes across one cell until its one step of mud is off. */
    const strokes = (u: number, v: number) => {
      const mud = cleanMud(), work = cleanMud(), cell = cellOf(u, v)
      mud[cell] = 1
      let n = 0
      while (mud[cell] > 0 && n < 40) { rub(mud, work, 'dungarees', u - 0.025, v, u + 0.025, v); n += 1 }
      return n
    }
    expect(isPocket(cellOf(0.35, 0.55))).toBe(true)
    expect(isPocket(cellOf(0.25, 0.85))).toBe(false)
    expect(strokes(0.35, 0.55)).toBe(strokes(0.25, 0.85) * 2)
    // Only pocket mud is left, caked: the first dab lifts a step of it, and so does each dab after, until it is clean.
    const mud = cleanMud(), work = cleanMud(), cell = cellOf(0.35, 0.55)
    mud[cell] = 3
    for (let left = 2; left >= 0; left--) {
      expect(rub(mud, work, 'dungarees', 0.35, 0.55, 0.35, 0.55)).toEqual([cell])
      expect(mud[cell]).toBe(left)
    }
    expect(rub(mud, work, 'dungarees', 0.35, 0.55, 0.35, 0.55)).toEqual([])
  })

  it('finds every patch of mud, the largest first', () => {
    const mud = cleanMud()
    expect(patches(mud)).toEqual([])
    dollop(mud, 'jumper', 0.5, 0.3, 0.1)
    dollop(mud, 'jumper', 0.5, 0.85, 0.05)
    const found = patches(mud)
    expect(found).toHaveLength(2)
    expect(found[0].cells).toBeGreaterThanOrEqual(found[1].cells)
    expect(found[0].v).toBeLessThan(0.6)
    // Four more cells that touch nothing are four more patches: none is left out.
    const lone = [60, 62, 64, 66].filter((i) => maskOf('jumper')[i] && mud[i] === 0 && mud[i - 1] === 0 && mud[i + 1] === 0 && mud[i - 10] === 0 && mud[i + 10] === 0)
    for (const i of lone) mud[i] = 1
    expect(lone.length).toBeGreaterThan(1)
    expect(patches(mud)).toHaveLength(2 + lone.length)
  })

  it('a rub over clean cloth lifts nothing', () => {
    const mud = cleanMud(), work = cleanMud()
    expect(rub(mud, work, 'sock', 0.4, 0.2, 0.5, 0.6)).toEqual([])
    expect(mudLeft(mud)).toBe(0)
  })

  it('thick cloth takes more rubbing than thin cloth', () => {
    const strokesToClean = (kind: 'sock' | 'jumper') => {
      const mud = cleanMud(), work = cleanMud()
      dollop(mud, kind, 0.5, 0.5, 0.08)
      let strokes = 0
      while (mudLeft(mud) > 0 && strokes < 200) {
        rub(mud, work, kind, 0.48, 0.5, 0.53, 0.5)
        strokes += 1
      }
      return strokes
    }
    expect(STROKES.jumper).toBeGreaterThan(STROKES.sock)
    expect(strokesToClean('jumper')).toBeGreaterThan(strokesToClean('sock'))
    expect(strokesToClean('jumper')).toBeLessThan(40)
  })

  it('enough dabs get all of it off: a child who only taps gets there', () => {
    for (const kind of KINDS) {
      const mud = cleanMud(), work = cleanMud()
      dollop(mud, kind, 0.5, 0.5, 0.12)
      for (let n = 0; n < CAKED; n++) for (let i = 0; i < CELLS; i++) if (mud[i] > 0) rub(mud, work, kind, ((i % 10) + 0.5) / 10, (Math.floor(i / 10) + 0.5) / 10, ((i % 10) + 0.5) / 10, (Math.floor(i / 10) + 0.5) / 10)
      expect(mudLeft(mud)).toBe(0)
    }
  })
})

describe('the saved grid', () => {
  it('round-trips', () => {
    const mud = muddied('hat', makeRng(3))
    const text = encodeMud(mud)
    expect(text).toHaveLength(CELLS)
    expect(decodeMud(text, 'hat')).toEqual(mud)
  })

  it.each([
    ['nothing', undefined],
    ['a number', 12],
    ['too short', '0123'],
    ['a level above caked', '9'.repeat(CELLS)],
    ['letters', 'a'.repeat(CELLS)],
    ['an array', new Array(CELLS).fill(1)],
  ])('refuses %s', (_, raw) => {
    expect(decodeMud(raw, 'sock')).toBeNull()
  })

  it('drops mud that lies off the cloth', () => {
    const mud = decodeMud('3'.repeat(CELLS), 'scarf')!
    const mask = maskOf('scarf')
    mud.forEach((level, i) => expect(level).toBe(mask[i] ? 3 : 0))
  })
})

describe('the suds a garment carries', () => {
  it('are the same knots each time for the same cloth and the same suds, more of them the soapier it is, and none when it has none', () => {
    for (const kind of KINDS) {
      expect(sudsKnots(kind, 0)).toHaveLength(0)
      expect(sudsKnots(kind, 10)).toHaveLength(MAX_KNOTS)
      expect(sudsKnots(kind, 6)).toEqual(sudsKnots(kind, 6))
      expect(sudsKnots(kind, 3).length).toBeLessThan(sudsKnots(kind, 6).length)
      // A less soapy cloth keeps the first of the knots a soapier one has, so wringing takes knots away and moves none.
      expect(sudsKnots(kind, 6).slice(0, sudsKnots(kind, 3).length)).toEqual(sudsKnots(kind, 3))
      for (const knot of sudsKnots(kind, 10)) {
        expect(knot.u).toBeGreaterThan(-0.05); expect(knot.u).toBeLessThan(1.05)
        expect(knot.v).toBeGreaterThan(-0.05); expect(knot.v).toBeLessThan(1.05)
        expect(knot.r).toBeGreaterThan(0.02); expect(knot.r).toBeLessThan(0.06)
      }
    }
  })
})
