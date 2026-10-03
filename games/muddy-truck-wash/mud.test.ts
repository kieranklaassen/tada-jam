import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { fireEngine } from './fireEngine'
import { arrive, next, puddled } from './mud'
import { patchAt, patchCentre, silhouette } from './silhouette'
import { CELLS, GRID_H, GRID_W, cellAt, tally } from './surface'
import { tipper } from './tipper'

const VEHICLES = [tipper, fireEngine]

describe('a vehicle\'s silhouette', () => {
  it.each(VEHICLES.map((def) => [def.id, def] as const))('%s covers a good share of its grid, with air above its low parts', (_id, def) => {
    const s = silhouette(def)
    expect(s).toHaveLength(CELLS)
    const body = tally(s).body
    expect(body).toBeGreaterThan(CELLS * 0.45)
    expect(body).toBeLessThan(CELLS)
    // Wheels stand on the ground: the bottom row has body.
    expect(s.slice(0, GRID_W).some((patch) => patch !== '.')).toBe(true)
  })

  it('is a fresh copy every time, so muddying one never muddies the next', () => {
    const a = silhouette(tipper)
    a[0] = 'c'
    expect(silhouette(tipper)[0]).not.toBe('c')
  })

  it('maps a point of the side to its patch and back', () => {
    const { x, y } = patchCentre(tipper, 4, 2)
    expect(patchAt(tipper, x, y)).toEqual({ col: 4, row: 2 })
    expect(patchAt(tipper, tipper.side.x0 - 0.1, 1)).toBeNull()
    expect(patchAt(tipper, 0, tipper.side.y1 + 0.1)).toBeNull()
  })
})

describe('the mud a vehicle rolls in with', () => {
  it('is the same for the same seed and differs for another', () => {
    const clean = silhouette(tipper)
    expect(arrive(clean, 'dried-patches', 5)).toEqual(arrive(clean, 'dried-patches', 5))
    expect(arrive(clean, 'dried-patches', 5)).not.toEqual(arrive(clean, 'dried-patches', 6))
  })

  it.each(VEHICLES.map((def) => [def.id, def] as const))('%s: adds one thing at a time along the designed order', (_id, def) => {
    const clean = silhouette(def), body = tally(clean).body
    for (const seed of [1, 2, 3, 99, 20261003]) {
      const first = tally(arrive(clean, LADDER[0], seed))
      // Soft mud only, on about a third.
      expect(first.c).toBe(0)
      expect(first.s).toBeGreaterThanOrEqual(body * 0.2)
      expect(first.s).toBeLessThanOrEqual(body * 0.5)
      const second = tally(arrive(clean, LADDER[1], seed))
      // The one new thing: some dried mud.
      expect(second.c).toBeGreaterThanOrEqual(3)
      expect(second.s).toBeGreaterThan(0)
      expect(second.mud).toBeLessThan(body * 0.75)
      const third = tally(arrive(clean, LADDER[2], seed))
      // The two together, and more of them.
      expect(third.c).toBeGreaterThan(second.c)
      expect(third.s).toBeGreaterThan(0)
      expect(third.mud).toBeGreaterThan(body * 0.6)
    }
  })

  it('never puts mud off the body, and brings no foam, water or shine', () => {
    const clean = silhouette(tipper)
    for (const position of LADDER) {
      const s = arrive(clean, position, 17)
      s.forEach((patch, cell) => {
        expect(patch === '.').toBe(clean[cell] === '.')
        expect(['.', 'c', 's', 'd']).toContain(patch)
      })
    }
  })

  it('treats a position it does not know as the first', () => {
    const clean = silhouette(tipper)
    expect(arrive(clean, 'somewhere-else', 9)).toEqual(arrive(clean, LADDER[0], 9))
  })

  it('the puddle adds soft mud from the wheels up, and wets dried mud it lands on', () => {
    const clean = silhouette(tipper)
    const once = puddled(clean, 3), twice = puddled(once, 4)
    expect(tally(once).s).toBeGreaterThan(5)
    expect(tally(twice).s).toBeGreaterThan(tally(once).s)
    for (let row = 4; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) expect(once[cellAt(col, row)]).toBe(clean[cellAt(col, row)])
    expect(tally(puddled(arrive(clean, 'caked-all-over', 2), 5)).body).toBe(tally(clean).body)
  })
})

describe('the seeded stream', () => {
  it('gives numbers in [0, 1) and never sticks', () => {
    let s = 1
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      let v: number
      ;[v, s] = next(s)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      seen.add(s)
    }
    expect(seen.size).toBe(200)
    expect(next(0)[1]).not.toBe(0)
  })
})
