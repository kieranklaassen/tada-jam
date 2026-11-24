import { describe, expect, it } from 'vitest'
import { BELL, toPoint } from './layout'
import { Party } from './party'
import { COATS, GUESTS } from './rules'
import { freshState } from './state'
import { View } from './view'
import { TIERS } from './config'
import type { G } from './silk'

// Runs the real view on a canvas that draws nothing and counts what is asked of it.

function counter() {
  const count = { images: 0, fills: 0, strokes: 0 }
  const numbers: number[] = []
  const kept = new Map<string | symbol, unknown>()
  const g = new Proxy({}, {
    get(_, name) {
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => ({ addColorStop: () => {} })
      if (kept.has(name)) return kept.get(name)
      return (...args: unknown[]) => {
        for (const each of args) if (typeof each === 'number') numbers.push(each)
        if (name === 'drawImage') count.images += 1
        if (name === 'fill' || name === 'fillRect') count.fills += 1
        if (name === 'stroke') count.strokes += 1
      }
    },
    set(_, name, value) {
      kept.set(name, value)
      return true
    },
  }) as unknown as G
  return { g, count, numbers, canvas: { width: 10, height: 10 } as unknown as CanvasImageSource }
}

function stage() {
  const view = new View(1, () => counter())
  view.setTier(TIERS[0])
  const party = new Party(freshState(null))
  const run = (seconds: number, each?: () => void) => {
    for (let t = 0; t < seconds; t += 1 / 30) {
      party.step(1 / 30)
      view.hear(party.take(), party)
      view.step(1 / 30)
      each?.()
    }
  }
  const shoot = () => {
    const c = counter()
    view.draw(c.g, 1180, 820, 2, party, null)
    return c
  }
  return { view, party, run, shoot }
}

describe('a frame', () => {
  it('counts', () => {
    const { shoot, run } = stage()
    shoot()
    run(1)
    console.log(shoot().count)
  })
})
void [BELL, toPoint, COATS, GUESTS, expect]
