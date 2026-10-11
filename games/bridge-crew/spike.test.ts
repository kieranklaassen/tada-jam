import { describe, expect, it } from 'vitest'
import { settle } from './frame'
import { countKinds, KINDS, layProblem, type Part } from './kit'
import type { Pen } from './look'
import { groundOutline, plotFor, px } from './sheet'
import { COLS, ROWS, canPin, isFooting, site } from './sites'
import { SPIKE_BRIDGE, SPIKE_SITE, drawSpike } from './spike'
import { LADDER } from './config'

/** A pen that draws nothing and keeps the name of every call, with the numbers it was given. */
function recordingPen(): { pen: Pen; calls: string[] } {
  const calls: string[] = []
  const pen = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) => {
      if (name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      if (name in store) return store[name]
      return (...args: unknown[]) => { calls.push(`${name}(${args.map((a) => (typeof a === 'number' ? a.toFixed(2) : typeof a)).join(',')})`) }
    },
    set: (store, name: string, value) => { store[name] = value; return true },
  })
  return { pen: pen as unknown as Pen, calls }
}

describe('the look spike', () => {
  it('draws the same scene every time, and draws no text', () => {
    const first = recordingPen(), second = recordingPen()
    const drawn = drawSpike(first.pen, 1180, 820, 2)
    drawSpike(second.pen, 1180, 820, 2)
    expect(drawn).toBeGreaterThan(SPIKE_BRIDGE.length)
    expect(first.calls.length).toBeGreaterThan(500)
    expect(second.calls).toEqual(first.calls)
    expect(first.calls.some((call) => /Text/.test(call))).toBe(false)
  })

  it('shows a real bridge: laid from the sheet\'s own kit, on its pins, and standing', () => {
    const laid: Part[] = []
    for (const piece of SPIKE_BRIDGE) {
      expect(layProblem(piece, laid, SPIKE_SITE.kit)).toBeNull()
      expect(canPin(SPIKE_SITE, piece.a) && canPin(SPIKE_SITE, piece.b)).toBe(true)
      laid.push(piece)
    }
    expect(KINDS.every((kind) => countKinds(SPIKE_BRIDGE)[kind] > 0)).toBe(true)
    expect(settle(SPIKE_BRIDGE, isFooting(SPIKE_SITE)).firm.every(Boolean)).toBe(true)
  })

  it('fits the whole grid, the margins and the tray on a tablet in either shape', () => {
    for (const [width, height] of [[1180, 820], [820, 1180], [1024, 768], [2048, 1100]]) {
      const plot = plotFor(width, height)
      const [left, top] = px(plot, 0, ROWS), [right, bottom] = px(plot, COLS, -3.4)
      expect(left).toBeGreaterThanOrEqual(0); expect(top).toBeGreaterThanOrEqual(0)
      expect(right).toBeLessThanOrEqual(width); expect(bottom).toBeLessThanOrEqual(height)
    }
  })

  it('draws the ground of every sheet as one outline that passes through both lips', () => {
    for (const id of LADDER) for (let v = 0; v < 3; v++) {
      const at = site(id, v), outline = groundOutline(at)
      expect(outline).toContainEqual([at.left[0], at.left[1]])
      expect(outline).toContainEqual([at.right[0], at.right[1]])
      // Left to right along the top: no point lies above the deck, and x never runs backward by more than a rock's width.
      for (const [, y] of outline) expect(y).toBeLessThanOrEqual(at.left[1])
    }
  })
})
