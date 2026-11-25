import { describe, expect, it } from 'vitest'
import { Body } from './bodies'
import { KINDS, SILLY, contentsOf, tuneOf, type Where } from './kinds'
import { HOOKS, HOST_IDS } from './layout'
import * as voices from './voices'

describe('the kinds', () => {
  const places: Where[] = ['air', ...HOST_IDS]
  it('sound different in every place, and stay in range', () => {
    const all = KINDS.flatMap((kind) => places.map((place) => tuneOf(kind, place)))
    expect(new Set(all.map((tune) => JSON.stringify(tune))).size).toBe(all.length)
    const others = [0, 5, 9].map(voices.pop).concat([voices.creak(0), voices.creak(1), voices.plop, voices.grab, voices.twang, voices.snow, voices.rattle, voices.ratchet, voices.zip, voices.switchOn, voices.switchOff, voices.star(3)], HOST_IDS.map(voices.caught), KINDS.map(voices.mutter), KINDS.map(voices.wake))
    for (const tune of all.concat(others)) for (const note of tune) {
      expect(note.frequency).toBeGreaterThanOrEqual(50); expect(note.frequency).toBeLessThanOrEqual(4200 * 4)
      expect(note.peak).toBeLessThanOrEqual(0.4); expect(note.peak).toBeGreaterThan(0)
      expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(2.2)
    }
  })
  it('move every host in a way of its own', () => {
    const seen = new Set<string>()
    for (const id of HOST_IDS) for (const kind of KINDS) {
      const body = new Body(id), trace: string[] = []
      body.act(kind, 'red')
      for (let i = 0; i < 60; i++) { body.step(1 / 60, true); if (i % 12 === 0) trace.push(Object.values(body.pose).map((n) => n.toFixed(3)).join()) }
      seen.add(trace.join('|'))
    }
    expect(seen.size).toBe(HOST_IDS.length * KINDS.length)
  })
  it('keep every place near where it is while a host moves', () => {
    for (const hook of HOOKS) for (const kind of KINDS) {
      const body = new Body(hook.host), p = { x: 0, y: 0 }
      body.act(kind, 'red')
      for (let i = 0; i < 100; i++) { body.step(1 / 60, true); body.hook(hook, p); expect(Math.hypot(p.x - hook.x, p.y - hook.y), `${hook.id} ${kind}`).toBeLessThan(150) }
    }
  })
  it('come a bulb at a time with something silly between, each once before any again', () => {
    for (let seed = 0; seed < 30; seed++) {
      const list = contentsOf(seed, 64)
      expect(list.length).toBe(64)
      list.forEach((kind, i) => expect(kind === 'bulb').toBe(i % 2 === 0))
      const silly = list.filter((kind) => kind !== 'bulb')
      expect(new Set(silly.slice(0, SILLY.length)).size).toBe(SILLY.length)
      for (let i = 1; i < silly.length; i++) expect(silly[i]).not.toBe(silly[i - 1])
    }
    expect(contentsOf(0, 4)[1]).toBe('boot')
  })
})
