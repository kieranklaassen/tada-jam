import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { bays, tools } from './layout'
import type { Pen } from './look'
import { WATER } from './pose'
import { MARGIN, groundAt, plotFor } from './sheet'
import { COLS, VARIANTS, site, type Site } from './sites'
import { CHIEF } from './toy'
import { CHIEF_MARGIN, FAINT, SKY, desk, farBridge, finds, mugAt, paintDesk, paintUnderground, paintValley, reaches, siteSeed, hillHouse, skyline, trees } from './valley'

const every: Site[] = LADDER.flatMap((id) => Array.from({ length: VARIANTS }, (_, v) => site(id, v)))

/** A pen that draws nothing and keeps every call with its numbers. */
function recording() {
  const calls: { name: string; args: unknown[] }[] = []
  const pen = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) => (name in store ? store[name] : (...args: unknown[]) => { calls.push({ name, args }) }),
    set: (store, name: string, value) => { store[name] = value; return true },
  }) as unknown as Pen
  return { pen, calls }
}

describe('the valley the gap is in', () => {
  it('is fainter than anything a finger can move, on every line of it', () => {
    for (const strength of Object.values(FAINT)) { expect(strength).toBeGreaterThan(0.1); expect(strength).toBeLessThanOrEqual(0.5) }
  })

  it('each sheet has its own valley, the same every time', () => {
    expect(new Set(LADDER.map((id) => siteSeed(site(id, 0)))).size).toBe(LADDER.length)
    expect(siteSeed(site('rock-prop', 1))).not.toBe(siteSeed(site('rock-prop', 0)))
    expect(trees(site('rock-prop', 0))).toEqual(trees(site('rock-prop', 0)))
    expect(finds(site('rock-prop', 0))).toEqual(finds(site('rock-prop', 0)))
  })

  it('the far hills stand over the banks and leave the sky over the gap clear for the bridge', () => {
    for (const at of every) {
      for (let x = at.left[0] - 0.5; x <= at.right[0] + 0.5; x += 0.25) { expect(skyline(at, x, 0)).toBe(0); expect(skyline(at, x, 1)).toBe(0) }
      // They rise away from the gap and never reach the sky where the clouds and the rack are.
      let high = 0
      for (let x = -MARGIN.side; x <= COLS + MARGIN.side; x += 0.25) for (const layer of [0, 1] as const) { expect(skyline(at, x, layer)).toBeGreaterThanOrEqual(0); high = Math.max(high, skyline(at, x, layer)) }
      expect(high).toBeGreaterThan(1)
      expect(at.left[1] + high).toBeLessThan(SKY.high)
    }
  })

  it('the finished bridge far off stands over the far bank, on the sheet, on every sheet', () => {
    for (const at of every) {
      const span = farBridge(at)
      expect(span.x0).toBeGreaterThan(at.right[0] + 1)
      expect(span.x1).toBeLessThanOrEqual(COLS + MARGIN.side)
      expect(span.x1 - span.x0).toBeGreaterThan(2.5)
      expect(span.y).toBeGreaterThan(at.right[1] + 2)
    }
  })

  it('a house stands on the hills over the near bank, well back from the lip, and never behind the chief and its model', () => {
    // The chief's corner, as the valley knows it, holds the chief's ledge and the model on it.
    expect(CHIEF_MARGIN.right).toBeGreaterThanOrEqual(CHIEF.x + 4.6)
    expect(CHIEF_MARGIN.low).toBeLessThanOrEqual(CHIEF.y - 0.3)
    let houses = 0
    for (const at of every) {
      const house = hillHouse(at)
      if (at.left[0] - 5.2 < 0.8) { expect(house, at.id).toBeNull(); continue }
      if (!house) continue
      houses++
      expect(house[0]).toBeLessThan(at.left[0] - 4)
      // It stands clear of the road, and its smoke (a cell and a bit over the chimney) either right of the chief's corner or under it.
      expect(house[1] - 0.75).toBeGreaterThan(at.left[1] + 0.4)
      expect(house[0] - 1.02 >= CHIEF_MARGIN.right || house[1] + 1.3 <= CHIEF_MARGIN.low, at.id).toBe(true)
      expect(hillHouse(at)).toBe(house)
      for (const tree of trees(at)) expect(Math.abs(tree.x - (at.left[0] - 5.2))).toBeGreaterThanOrEqual(1.3)
    }
    expect(houses).toBeGreaterThan(every.length / 3)
  })

  it('trees stand on the banks, behind the road, clear of both lips and of the cliffs', () => {
    for (const at of every) {
      const stand = trees(at)
      expect(stand.length, at.id).toBeGreaterThanOrEqual(2)
      for (const tree of stand) {
        expect(tree.x < at.left[0] - 1.3 || tree.x > at.right[0] + 1.3, `${at.id} ${tree.x}`).toBe(true)
        expect(tree.tall).toBeGreaterThan(1)
        expect(tree.tall).toBeLessThan(3)
        for (const [ax] of at.anchors) expect(Math.abs(ax - tree.x)).toBeGreaterThanOrEqual(2.3)
      }
    }
  })

  it('what is buried lies inside a bank, under the road and over the sheet\'s foot, with a burrow under the near bank on every sheet', () => {
    for (const at of every) {
      const found = finds(at)
      expect(found[0]?.what, at.id).toBe('burrow')
      expect(found.length).toBeGreaterThanOrEqual(3)
      expect(found.length).toBeLessThanOrEqual(5)
      // Neither bank is left bare.
      expect(found.some((one) => one.x > at.right[0]), at.id).toBe(true)
      expect(new Set(found.map((one) => one.what)).size).toBe(found.length)
      for (const one of found) {
        const reach = one.what === 'burrow' ? 1 : 0.62
        expect(one.x + reach <= at.left[0] + 0.25 || one.x - reach >= at.right[0] - 0.25, `${at.id} ${one.what} ${one.x}`).toBe(true)
        expect(one.x - reach).toBeGreaterThanOrEqual(-MARGIN.side + 0.3)
        expect(one.x + reach).toBeLessThanOrEqual(COLS + MARGIN.side - 0.3)
        expect(one.y + 0.62).toBeLessThan(at.left[1] - 0.6)
        expect(one.y - 0.62).toBeGreaterThan(-0.5)
      }
    }
  })

  it('along the bottom of the sheet the crew, the draughtsman\'s things, the tray and the tools each have their own room', () => {
    for (const at of every) {
      const { ledge, crew, leftRoom, rightRoom, floor } = desk(at), piles = bays(at), box = tools(at)
      // The beaver's flag reaches a little over a cell toward the mole, and the mole's board most of a cell back: they do not touch.
      expect(crew[1] - crew[0]).toBeGreaterThanOrEqual(1.99)
      // And the mole's rule, held out level, stops short of the tray.
      expect(piles[0].x0 - crew[1]).toBeGreaterThanOrEqual(1.65)
      expect(ledge[0]).toBeGreaterThanOrEqual(-MARGIN.side + 0.05)
      expect(ledge[1]).toBeLessThanOrEqual(piles[0].x0 - 0.2)
      expect(leftRoom[1]).toBeLessThanOrEqual(ledge[0])
      expect(rightRoom[0]).toBeGreaterThanOrEqual(box[box.length - 1].x1 + 0.3)
      expect(floor).toBeLessThan(-3)
      const mug = mugAt(at)
      if (mug) { expect(mug[0] - 0.5).toBeGreaterThanOrEqual(rightRoom[0] - 0.01); expect(mug[0] + 0.62).toBeLessThanOrEqual(COLS + MARGIN.side - 0.3) }
    }
  })

  it('open water is where no bank, ledge or rock stands in it, widest stretch first', () => {
    expect(reaches(site('plank-gap', 0))).toEqual([[10.25, 13.75]])
    const rock = reaches(site('rock-prop', 0))
    expect(rock).toHaveLength(2)
    expect(rock[0][1] - rock[0][0]).toBeGreaterThanOrEqual(rock[1][1] - rock[1][0])
    for (const at of every) for (const [from, to] of reaches(at)) for (let x = from; x <= to; x += 0.25) expect(groundAt(at, x), `${at.id} ${x}`).toBeLessThan(WATER)
  })

  it('is drawn in line only: no text, no fill but the patch behind a find, and every number a real number, on every sheet', () => {
    const plot = plotFor(1180, 820)
    for (const at of every) {
      const { pen, calls } = recording()
      paintValley(pen, plot, at); paintUnderground(pen, plot, at); paintDesk(pen, plot, at)
      expect(calls.length).toBeGreaterThan(100)
      expect(calls.filter((call) => call.name === 'fillText' || call.name === 'strokeText')).toEqual([])
      for (const call of calls) for (const arg of call.args) if (typeof arg === 'number') expect(Number.isFinite(arg), `${at.id} ${call.name}`).toBe(true)
      expect(calls.filter((call) => call.name === 'fill').length).toBe(finds(at).length)
      // No whole ring is drawn anywhere in it: every arc is a part of a circle.
      for (const call of calls.filter((one) => one.name === 'arc')) expect(Math.abs((call.args[4] as number) - (call.args[3] as number)), at.id).toBeLessThan(Math.PI * 2 - 0.01)
    }
  })
})
