import { describe, expect, it } from 'vitest'
import { PLACES, partAt, topAt } from './bear'
import { CELLS, CELL_PART, DAY_FLUFF, LIVE, bareMud, digits, freshFur, fromDigits, isDry, pour, ruffle, most, share, soap, towel, wants, wettest } from './fur'

const belly = PLACES.find((place) => place.id === 'belly')!

describe("Teddy's coat", () => {
  it('lies over the whole bear and nowhere else', () => {
    expect(LIVE.length).toBeGreaterThan(90)
    expect(LIVE.length).toBeLessThan(CELLS)
    for (const part of ['body', 'head', 'armL', 'armR']) expect(CELL_PART).toContain(part)
  })

  it('starts muddy on the named places only, dry and at its ordinary fluff', () => {
    const fur = freshFur(['belly', 'footR', 'no-such-place'])
    expect(most(fur, 'mud')).not.toBeNull()
    expect(share(fur, 'mud')).toBeGreaterThan(0.05)
    expect(share(freshFur(['belly']), 'mud')).toBeLessThan(share(fur, 'mud'))
    expect(share(fur, 'wet')).toBe(0)
    expect(share(fur, 'foam')).toBe(0)
    expect(share(fur, 'fluff')).toBeCloseTo(DAY_FLUFF)
    expect(share(freshFur([]), 'mud')).toBe(0)
  })

  it('grows foam where the soap is rubbed and not elsewhere', () => {
    const fur = freshFur(['belly'])
    expect(soap(fur, belly.x, belly.y, 0.5)).toBeGreaterThan(0)
    const there = most(fur, 'foam')!
    expect(Math.hypot(there.x - belly.x, there.y - belly.y)).toBeLessThan(60)
    // His head is far from his belly: no foam reached it.
    const head = LIVE.filter((i) => CELL_PART[i] === 'head')
    expect(head.every((i) => fur.foam[i] === 0)).toBe(true)
    // Off the bear the soap finds no fur.
    expect(soap(fur, 400, -250, 1)).toBe(0)
  })

  it('takes mud off with water where it was soaped, and only darkens bare mud', () => {
    const soaped = freshFur(['belly']), bare = freshFur(['belly'])
    for (let n = 0; n < 12; n++) for (const dx of [-50, 0, 50]) soap(soaped, belly.x + dx, belly.y, 0.2)
    const before = share(bare, 'mud')
    for (let n = 0; n < 40; n++) {
      for (const dx of [-70, 0, 70]) {
        pour(soaped, belly.x + dx, topAt(belly.x + dx)!, 0.05)
        pour(bare, belly.x + dx, topAt(belly.x + dx)!, 0.05)
      }
    }
    expect(share(soaped, 'mud')).toBeLessThan(before * 0.5)
    expect(share(bare, 'mud')).toBeGreaterThan(before * 0.85)
    expect(share(soaped, 'foam')).toBeLessThan(0.01)
    expect(share(soaped, 'wet')).toBeGreaterThan(0.1)
    // Water that falls past him runs over no cell.
    expect(pour(soaped, 400, -500, 1).cells).toBe(0)
  })

  it('turns wet fur into fluff under the towel, and only smears foam', () => {
    const fur = freshFur([])
    for (let n = 0; n < 30; n++) pour(fur, 0, topAt(0)!, 0.05)
    expect(isDry(fur)).toBe(false)
    const wet = share(fur, 'wet')
    for (let n = 0; n < 60; n++) for (const y of [-420, -340, -260, -180, -100, -40]) towel(fur, 0, y, 0.2)
    expect(share(fur, 'wet')).toBeLessThan(wet * 0.2)
    const there = most(fur, 'fluff')!
    expect(Math.abs(there.x)).toBeLessThan(80)
    const foamy = freshFur([])
    soap(foamy, 0, -170, 1)
    const foam = share(foamy, 'foam')
    const out = towel(foamy, 0, -170, 0.3)
    // Under the foam nothing fluffs: the same rub on a bare coat raises more.
    expect(out.fluff).toBeLessThan(towel(freshFur([]), 0, -170, 0.3).fluff)
    expect(share(foamy, 'foam')).toBeLessThan(foam)
    expect(share(foamy, 'foam')).toBeGreaterThan(foam * 0.5)
  })

  it('pops foam under a bare finger', () => {
    const fur = freshFur([])
    soap(fur, 0, -170, 1)
    expect(ruffle(fur, 0, -170, 0.5)).toBeGreaterThan(0)
    expect(ruffle(freshFur([]), 0, -170, 0.5)).toBe(0)
  })

  it('asks for the soap while any mud is bare, then the jug while foamy, then the towel while wet, and nothing when clean and dry', () => {
    const fur = freshFur(['belly', 'footR'])
    expect(wants(fur)).toBe('soap')
    // One place soaped and the other still bare: still the soap, and now for the bare place.
    for (let x = -80; x <= 80; x += 40) for (let y = -80; y <= 80; y += 40) soap(fur, belly.x + x, belly.y + y, 1)
    expect(wants(fur)).toBe('soap')
    expect(bareMud(fur)!.y).toBeGreaterThan(-120)
    for (let x = -200; x <= 200; x += 40) for (let y = -480; y <= 0; y += 40) soap(fur, x, y, 1)
    expect(bareMud(fur)).toBeNull()
    expect(wants(fur)).toBe('jug')
    for (let x = -180; x <= 180; x += 30) for (let n = 0; n < 30; n++) pour(fur, x, topAt(x) ?? 0, 0.05)
    expect(wants(fur)).toBe('towel')
    expect(partAt(wettest(fur)!.x, wettest(fur)!.y, 30)).not.toBeNull()
    expect(wettest(freshFur([]))).toBeNull()
    expect(wants(freshFur([]))).toBeNull()
    expect(isDry(freshFur(['belly']))).toBe(true)
  })

  it('goes into a save as digits and comes back within a tenth, and refuses anything else', () => {
    const fur = freshFur(['belly', 'earL'])
    soap(fur, 30, -200, 0.4)
    for (const layer of [fur.mud, fur.foam, fur.fluff]) {
      const back = fromDigits(digits(layer))!
      expect(back).toHaveLength(CELLS)
      for (const i of LIVE) expect(Math.abs(back[i] - layer[i])).toBeLessThanOrEqual(0.06)
    }
    for (const raw of [undefined, null, 7, '', '123', 'x'.repeat(CELLS), '9'.repeat(CELLS + 1), ['9']]) expect(fromDigits(raw)).toBeNull()
    // A damaged save cannot put anything on a cell that is off the bear.
    const all = fromDigits('9'.repeat(CELLS))!
    expect(all.filter((n) => n > 0)).toHaveLength(LIVE.length)
  })
})
