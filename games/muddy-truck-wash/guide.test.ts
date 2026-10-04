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

  it('then shows one move: a touch on the vehicle itself, never on a tool, whatever is on the vehicle', () => {
    for (const patch of ['c', 's', 'b', 'f', 'w', 'd'] as const) {
      const play = new Play(coated(patch))
      const side = play.bay.def.side
      for (const demoIndex of [0, 1, 2]) for (const demo of [0.05, 0.3, 0.6, 0.95]) {
        const hand = hintFor(play, { glow: 1, demo, demoIndex }, emptyHint()).hand!
        expect(atTool(hand), patch).toBeNull()
        expect(hand.x).toBeGreaterThan(side.x0)
        expect(hand.x).toBeLessThan(side.x1)
        expect(hand.y).toBeGreaterThan(side.y0)
        expect(hand.y).toBeLessThan(side.y1)
      }
      // The tools glow all alike while it does.
      expect(hintFor(play, showing, emptyHint()).tools).toEqual(['sponge', 'hose', 'cloth'])
    }
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

  it('with a tool in hand that has no work, shows the same touch on the vehicle, and no tool', () => {
    const play = new Play(coated('s'))
    play.press({ kind: 'tool', tool: 'cloth' })
    for (const demo of [0.2, 0.5, 0.8]) expect(atTool(hintFor(play, { glow: 1, demo, demoIndex: 0 }, emptyHint()).hand)).toBeNull()
  })

  it('when the vehicle is all shiny, shows that the one at the door can be touched', () => {
    const play = new Play(coated('p'))
    const hand = hintFor(play, showing, emptyHint()).hand!
    expect(atTool(hand)).toBeNull()
    expect(hand.x).toBeGreaterThan(play.bay.def.side.x1)
    expect(hand.x).toBeLessThan(play.next.motion.homeX)
  })

  it('the hand holds what the child has in hand as it shows its move on the vehicle, and nothing when the child holds nothing or the move is the send-off', () => {
    for (const patch of ['c', 's', 'f', 'w', 'd'] as const) {
      for (const tool of ['sponge', 'hose', 'cloth'] as const) {
        const play = new Play(coated(patch))
        play.press({ kind: 'tool', tool })
        // Whether or not the tool has work there, the hand that shows a touch on the vehicle holds that tool and no other.
        expect(hintFor(play, showing, emptyHint()).hand!.holding, `${tool} on ${patch}`).toBe(tool)
      }
      expect(hintFor(new Play(coated(patch)), showing, emptyHint()).hand!.holding).toBeNull()
    }
    const done = new Play(coated('p'))
    done.press({ kind: 'tool', tool: 'cloth' })
    expect(hintFor(done, showing, emptyHint()).hand!.holding).toBeNull()
  })

  it('makes nothing new each frame: the same object is filled in and handed back', () => {
    const out = emptyHint()
    expect(hintFor(new Play(coated('s')), showing, out)).toBe(out)
  })
})
