import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { toPoint } from './layout'
import { Party } from './party'
import type { G } from './silk'
import { COATS, GUESTS, THINGS } from './rules'
import { freshState } from './state'
import { View } from './view'

// Runs the real view on sheets that draw nothing, and counts what is asked of
// all of them together: what a frame costs, pictures painted again included.

function counter(all: { n: number }) {
  const kept = new Map<string | symbol, unknown>()
  const bad: string[] = []
  const g = new Proxy({}, {
    get(_, name) {
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => ({ addColorStop: () => {} })
      if (name === 'getTransform') return () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 })
      if (kept.has(name)) return kept.get(name)
      return (...args: unknown[]) => {
        if (args.some((each) => typeof each === 'number' && !Number.isFinite(each))) bad.push(String(name))
        if (['drawImage', 'fill', 'fillRect', 'stroke'].includes(String(name))) all.n += 1
        if (String(name).match(/text/i)) bad.push(String(name))
      }
    },
    set: (_, name, value) => {
      kept.set(name, value)
      return true
    },
  }) as unknown as G
  return { g, bad, canvas: { width: 10, height: 10 } as unknown as CanvasImageSource }
}

function stage() {
  const all = { n: 0 }, screen = counter(all), sheets = [screen]
  const view = new View(1, () => {
    const sheet = counter(all)
    sheets.push(sheet)
    return sheet
  })
  view.setTier(TIERS[0])
  const party = new Party(freshState(null))
  const costs: number[] = []
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      party.step(1 / 60)
      view.hear(party.take(), party)
      view.step(1 / 60)
      all.n = 0
      view.draw(screen.g, 1180, 820, 2, party, { glow: 1, demo: 0.5, demoIndex: 0 })
      costs.push(all.n)
    }
  }
  const tap = (u: number, y: number, side: 0 | 1 = 0) => {
    const at = toPoint(side, { u, y })
    party.down(1, at)
    run(0.05)
    party.up(1, at)
    run(1.6)
  }
  return { party, run, tap, costs, sheets }
}

describe('a frame', () => {
  it('is a handful of pictures, at rest and with both aunts at work', () => {
    const { party, run, tap, costs } = stage()
    run(1)
    costs.length = 0
    run(3)
    const median = () => [...costs].sort((a, b) => a - b)[Math.floor(costs.length / 2)]
    const rest = median()
    costs.length = 0
    for (const thing of THINGS) {
      party.state.held = [thing, THINGS.find((each) => each !== thing)!]
      party.state.table = THINGS.filter((each) => !party.state.held.includes(each)) as typeof party.state.table
      tap(455, 340)
      tap(455, 575)
      tap(250, 240)
      tap(360, 120)
    }
    const work = { rest, median: median(), most: Math.max(...costs) }
    expect(work.rest, JSON.stringify(work)).toBeLessThan(80)
    expect(work.median, JSON.stringify(work)).toBeLessThan(240)
    expect(work.most, JSON.stringify(work)).toBeLessThan(700)
  })

  it('draws every guest in every coat with no broken number and no letter', () => {
    const { party, run, sheets } = stage()
    for (const guest of GUESTS) for (const coat of COATS) {
      party.state.seated = [guest, GUESTS[(GUESTS.indexOf(guest) + 1) % 4]]
      party.state.coats[guest] = coat
      run(0.1)
    }
    expect(sheets.flatMap((sheet) => sheet.bad)).toEqual([])
  })
})
