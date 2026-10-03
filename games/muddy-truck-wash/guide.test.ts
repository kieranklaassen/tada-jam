import { describe, expect, it } from 'vitest'
import { vehicle } from './cycle'
import { emptyHint, hintFor } from './guide'
import type { Guidance } from './guidance'
import { Play } from './play'
import { TOOL_HOME, TOOL_MIDDLE } from './props'
import { silhouette } from './silhouette'
import type { Patch } from './surface'
import { freshWash, washed, type WashState } from './washState'

function coated(patch: Patch): WashState {
  const fresh = { ...freshWash(null), shown: ['drip' as const] }
  return washed(fresh, silhouette(vehicle(fresh.bay.who)).map((p) => (p === '.' ? '.' : patch)))
}

const idle: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const glowing: Guidance = { glow: 1, demo: null, demoIndex: -1 }
const showing: Guidance = { glow: 1, demo: 0.3, demoIndex: 0 }

/** Which tool the hand is at, if it is at one. */
function atTool(hand: { x: number; y: number } | null): string | null {
  if (!hand) return null
  for (const tool of ['sponge', 'hose', 'cloth'] as const) {
    if (Math.abs(hand.x - (TOOL_HOME[tool][0] + TOOL_MIDDLE[tool][0])) < 0.01 && Math.abs(hand.y - (TOOL_HOME[tool][1] + TOOL_MIDDLE[tool][1])) < 0.01) return tool
  }
  return null
}

describe('what the idle ladder shows', () => {
  it('shows nothing while the child is busy', () => {
    const hint = hintFor(new Play(coated('s')), idle, emptyHint())
    expect(hint).toEqual({ glow: 0, tools: [], hand: null })
  })

  it('first glows the tools that hang on the rack, never the one in hand', () => {
    const play = new Play(coated('s'))
    expect(hintFor(play, glowing, emptyHint()).tools).toEqual(['sponge', 'hose', 'cloth'])
    play.press({ kind: 'tool', tool: 'hose' })
    const hint = hintFor(play, glowing, emptyHint())
    expect(hint.tools).toEqual(['sponge', 'cloth'])
    expect(hint.hand).toBeNull()
  })

  it('then shows one move: how the tool a wash takes up next is taken', () => {
    const cases: [Patch, string][] = [['c', 'hose'], ['s', 'sponge'], ['b', 'hose'], ['f', 'hose'], ['w', 'cloth'], ['d', 'cloth']]
    for (const [patch, tool] of cases) expect(atTool(hintFor(new Play(coated(patch)), showing, emptyHint()).hand), patch).toBe(tool)
  })

  it('with the right tool in hand, shows one short rub on the vehicle where that tool has work', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'sponge' })
    const start = { ...hintFor(play, { glow: 1, demo: 0.27, demoIndex: 0 }, emptyHint()).hand! }
    const end = { ...hintFor(play, { glow: 1, demo: 0.72, demoIndex: 0 }, emptyHint()).hand! }
    expect(atTool(start)).toBeNull()
    // It is on the vehicle's side, and it travels along it, a few patches and no more.
    const side = play.bay.def.side
    for (const point of [start, end]) {
      expect(point.x).toBeGreaterThan(side.x0)
      expect(point.x).toBeLessThan(side.x1)
      expect(point.y).toBeLessThan(side.y1)
    }
    expect(end.x - start.x).toBeGreaterThan(0.3)
    expect(end.x - start.x).toBeLessThan((side.x1 - side.x0) / 2)
  })

  it('with the wrong tool in hand, shows how the right one is taken, not what to do with the wrong one', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'cloth' })
    expect(atTool(hintFor(play, showing, emptyHint()).hand)).toBe('sponge')
  })

  it('when the vehicle is all shiny, shows that the one at the door can be touched', () => {
    const play = new Play(coated('p'))
    const hand = hintFor(play, showing, emptyHint()).hand!
    expect(atTool(hand)).toBeNull()
    expect(hand.x).toBeGreaterThan(play.bay.def.side.x1)
    expect(hand.x).toBeLessThan(play.next.motion.homeX)
  })

  it('makes nothing new each frame: the same object is filled in and handed back', () => {
    const out = emptyHint()
    expect(hintFor(new Play(coated('s')), showing, out)).toBe(out)
  })
})
