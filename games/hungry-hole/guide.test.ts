import { describe, expect, it } from 'vitest'
import { hintOf } from './guide'
import { KEEPER } from './places'
import { Play, type World } from './play'
import { STREET, layStreet } from './street'

const world = (over: Partial<World> = {}): World => ({ hole: { x: 0, z: 0 }, belly: [], breath: [], street: [], ...over })

describe('what the idle ladder shows', () => {
  it('on a fresh street: the nearest thing the hole takes now glows, and the hand taps it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const play = new Play(world({ hole: { x: -0.5, z: 1.1 }, street: layStreet('few', seed) }))
      const hint = hintOf(play, false)
      expect(hint.thing?.parts).toEqual(['pie'])
      expect(hint.hand).toEqual({ on: 'thing', thing: hint.thing })
    }
  })

  it('as soon as a tap on the hole would make a stack, the hand taps the hole, and the thing that fits glows on', () => {
    const street = [{ parts: ['pie' as const], x: 3, z: 1 }]
    // One thing inside: a burp would only give it back alone, so the hand still shows the eating.
    const one = hintOf(new Play(world({ belly: ['pie'], street })), false)
    expect(one.hand).toEqual({ on: 'thing', thing: one.thing })
    // Two inside: two taps on the hole stand one on the other.
    const two = hintOf(new Play(world({ belly: ['pie', 'hat'], street })), false)
    expect(two.hand).toEqual({ on: 'hole' })
    expect(two.thing?.parts).toEqual(['pie'])
    // One inside and one on the breath: the next tap brings it up underneath.
    const under = hintOf(new Play(world({ belly: ['pie'], breath: ['hat'], street })), false)
    expect(under.hand).toEqual({ on: 'hole' })
    // Nothing inside and things on the breath: the hole has nothing to give, so the hand shows the next thing to eat.
    const riding = hintOf(new Play(world({ breath: ['pie', 'hat'], street })), false)
    expect(riding.hand).toEqual({ on: 'thing', thing: riding.thing })
  })

  it('when nothing left fits and something is inside: the hand taps the hole', () => {
    const hint = hintOf(new Play(world({ belly: ['pie'], street: [{ parts: ['drummer'], x: 3, z: -1 }] })), false)
    expect(hint.thing).toBeNull()
    expect(hint.hand).toEqual({ on: 'hole' })
  })

  it('when everything rides on the breath: the hand taps bare street beside it, inside the kerbs', () => {
    for (const x of [STREET.x0, 0, STREET.x1]) {
      const hint = hintOf(new Play(world({ hole: { x, z: 2.4 }, breath: ['pie', 'hat'] })), false)
      expect(hint.hand?.on).toBe('street')
      if (hint.hand?.on !== 'street') continue
      expect(hint.hand.x).toBeGreaterThanOrEqual(STREET.x0 + 1)
      expect(hint.hand.x).toBeLessThanOrEqual(STREET.x1 - 1)
      expect(hint.hand.z).toBeLessThanOrEqual(STREET.z1)
      expect(Math.abs(hint.hand.x - Math.max(STREET.x0 + 0.25, Math.min(STREET.x1 - 0.25, x)))).toBeGreaterThan(1)
    }
  })

  it('shows one move and never a plan: a thing too wide for the mouth does not glow', () => {
    const hint = hintOf(new Play(world({ street: [{ parts: ['tuba'], x: 1.6, z: 0 }, { parts: ['pie'], x: -5, z: 2 }] })), false)
    expect(hint.thing?.parts).toEqual(['pie'])
  })

  it('shows nothing on a street with nothing on it and nothing in the hole', () => {
    expect(hintOf(new Play(world()), false)).toEqual({ thing: null, gate: false, hand: null })
  })

  it('on the bare street after a float: the gate keeper and the gate glow, and the hand taps the gate keeper', () => {
    const hint = hintOf(new Play(world()), true)
    expect(hint.gate).toBe(true)
    expect(hint.thing).toBeNull()
    expect(hint.hand).toEqual({ on: 'keeper', x: KEEPER.x, z: KEEPER.z })
  })

  it('a finished street that is not bare any more shows the street, not the gate', () => {
    const hint = hintOf(new Play(world({ street: [{ parts: ['pie'], x: 2, z: 1 }] })), true)
    expect(hint.gate).toBe(false)
    expect(hint.thing?.parts).toEqual(['pie'])
  })
})
