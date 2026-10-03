import { describe, expect, it } from 'vitest'
import { ACTS, LONGEST_ACT_S, playAct, rest, type Mods } from './acts'
import { LEFT_ALONE_S } from './cycle'
import { GRID } from './grid'
import { CREATURE_KINDS, HAT_KINDS } from './kinds'
import { BODY } from './sizes'
import { ACTS as TASTE_ACTS } from './tastes'

const FIELDS: (keyof Mods)[] = ['dx', 'dy', 'squash', 'lean', 'turn', 'pat', 'cross', 'ears', 'gazeX', 'gazeY', 'looks', 'hatLift', 'hatTilt', 'hatFwd']
const mods = (): Mods => rest({} as Mods)
const at = (name: string, u: number, top = 2.2): Mods => { const m = mods(); ACTS[name].play(u, m, top); return m }
const TAU = Math.PI * 2
/** How far a pose is from rest, with a whole turn counted as none. */
const away = (m: Mods): number => Math.max(Math.abs(m.dx), Math.abs(m.dy), Math.abs(m.squash - 1), Math.abs(m.lean), Math.abs(Math.sin(m.turn / 2)), m.pat, m.cross, Math.abs(m.ears), m.looks, Math.abs(m.hatLift), Math.abs(m.hatTilt), m.hatFwd)

describe('every act', () => {
  it('begins and ends at rest, so it can start at any moment and leaves nothing behind', () => {
    for (const name of Object.keys(ACTS)) {
      expect(away(at(name, 0)), `${name} at its start`).toBeLessThan(0.02)
      expect(away(at(name, 1)), `${name} at its end`).toBeLessThan(0.02)
      // And it comes in and goes out without a jump.
      expect(away(at(name, 0.01)), `${name} just after its start`).toBeLessThan(0.3)
      expect(away(at(name, 0.99)), `${name} just before its end`).toBeLessThan(0.3)
    }
  })

  it('does something, stays finite, and keeps a creature a creature', () => {
    for (const name of Object.keys(ACTS)) for (const kind of CREATURE_KINDS) {
      let most = 0
      for (let u = 0; u <= 1; u += 0.01) {
        const m = at(name, u, BODY[kind].top)
        for (const field of FIELDS) expect(Number.isFinite(m[field]), `${name} ${field}`).toBe(true)
        expect(m.squash, name).toBeGreaterThan(0.7)
        expect(m.squash, name).toBeLessThan(1.3)
        expect(m.dy, name).toBeGreaterThanOrEqual(-1e-9)
        expect(Math.abs(m.dx), name).toBeLessThan(0.6)
        expect(Math.abs(m.turn), name).toBeLessThanOrEqual(TAU * 2 + 1e-9)
        // A hat is brought down over a body only when it is brought forward of the face first.
        if (m.hatLift < -0.3) expect(m.hatFwd, `${name}: a lowered hat is in front`).toBeGreaterThan(0.9)
        most = Math.max(most, away(m))
      }
      expect(most, name).toBeGreaterThan(0.08)
    }
  })

  it('is over before a scene could start: none outlasts the wait', () => {
    expect(LONGEST_ACT_S).toBeLessThan(LEFT_ALONE_S)
    for (const act of Object.values(ACTS)) expect(act.lasts).toBeGreaterThan(0.5)
    const m = mods()
    expect(playAct('claps', 0.2, m, 2)).toBe(true)
    expect(playAct('claps', ACTS.claps.lasts, mods(), 2)).toBe(false)
    expect(playAct('no-such-act', 0, mods(), 2)).toBe(false)
  })

  it('moves like itself: no two acts are the same motion', () => {
    const shape = (name: string): string => [0.13, 0.31, 0.5, 0.69, 0.87].map((u) => FIELDS.map((field) => at(name, u)[field].toFixed(2)).join(',')).join(';')
    const names = Object.keys(ACTS), shapes = names.map(shape)
    expect(new Set(shapes).size).toBe(names.length)
  })
})

describe('the acts of the tastes', () => {
  it('are all there: fifteen, one for each creature under each kind of hat', () => {
    const named = CREATURE_KINDS.flatMap((creature) => HAT_KINDS.map((hat) => TASTE_ACTS[creature][hat]))
    expect(named.length).toBe(15)
    for (const name of named) expect(ACTS[name], name).toBeDefined()
  })

  it('end with the hat worn: back on the head, upright, where it was', () => {
    for (const creature of CREATURE_KINDS) for (const hat of HAT_KINDS) {
      const m = at(TASTE_ACTS[creature][hat], 1, BODY[creature].top)
      expect(Math.abs(m.hatLift) + Math.abs(m.hatTilt) + m.hatFwd).toBeLessThan(0.02)
    }
  })
})

describe('the grid', () => {
  it('has thirty cells, and the game has an act or a flight for each that the cell tests play', () => {
    expect(Object.values(GRID).flatMap((row) => Object.values(row)).length).toBe(30)
  })
})
