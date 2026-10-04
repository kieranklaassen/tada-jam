import { describe, expect, it } from 'vitest'
import { ACT_BEAT, ACT_SECONDS, THING_ACT_SECONDS, actBody, takesIce, takesStove, thingActBody, type GuestAct, type ThingAct } from './acts'
import { GUEST_IDS } from './guests'
import { REST } from './inkScene'

const ACTS: GuestAct[] = [
  { kind: 'stuck', dx: 40, dy: 0 }, { kind: 'tucks-in' }, { kind: 'sneezes' }, { kind: 'peers', dx: -60 },
  { kind: 'hugs', dx: 50 }, { kind: 'sits-and-sags', dx: 50 }, { kind: 'armchair', dx: -50 }, { kind: 'plank', dx: -50 },
  { kind: 'blows' }, { kind: 'winds' }, { kind: 'stops-bell', weight: 0.2 }, { kind: 'stops-bell', weight: 0.9 },
  { kind: 'tests-bed' }, { kind: 'tests-bed', once: true }, { kind: 'yawns' },
]
const far = (a: ReturnType<typeof actBody>) => (a ? Math.abs(a.sx - 1) + Math.abs(a.sy - 1) + Math.abs(a.rot) + (Math.abs(a.dx) + Math.abs(a.dy)) / 100 : 0)

describe('the small acts of the grid', () => {
  it('every act is seen for a second or two, moves the figure, and leaves it exactly as it was', () => {
    for (const act of ACTS) {
      const lasts = ACT_SECONDS[act.kind]
      expect(lasts, act.kind).toBeGreaterThanOrEqual(1)
      expect(lasts, act.kind).toBeLessThanOrEqual(2.2)
      let most = 0
      for (let age = 0; age < lasts; age += 1 / 60) most = Math.max(most, far(actBody(act, age)))
      expect(most, act.kind).toBeGreaterThan(0.12)
      // The last frame is within a hair of rest, and after it there is no act.
      expect(far(actBody(act, lasts - 1 / 120)), act.kind).toBeLessThan(0.03)
      expect(actBody(act, lasts)).toBeNull()
      expect(actBody(act, -0.01)).toBeNull()
    }
  })

  it('no two acts make the same figure', () => {
    const shape = (act: GuestAct) => [0.2, 0.4, 0.6, 0.8].map((share) => { const b = actBody(act, ACT_SECONDS[act.kind] * share) ?? REST; return [b.sx, b.sy, b.rot, b.dx, b.dy].map((n) => n.toFixed(2)).join(',') }).join(' ')
    expect(new Set(ACTS.map(shape)).size).toBe(ACTS.length)
  })

  it('a guest set down on a wall is at the wall, pressed thin, until it pops out to its place', () => {
    const act: GuestAct = { kind: 'stuck', dx: 46, dy: -3 }
    const stuck = actBody(act, ACT_BEAT.pop / 2)!
    expect([stuck.dx, stuck.dy]).toEqual([46, -3])
    expect(stuck.sx).toBeLessThan(0.7)
    const out = actBody(act, ACT_BEAT.pop + 0.3)!
    expect(Math.abs(out.dx)).toBeLessThan(1)
  })

  it('it sneezes backward first and then forward, and the plank goes over away from the ice box', () => {
    expect(actBody({ kind: 'sneezes' }, ACT_BEAT.sneeze - 0.02)!.rot).toBeLessThan(-0.1)
    expect(actBody({ kind: 'sneezes' }, ACT_BEAT.sneeze + 0.02)!.rot).toBeGreaterThan(0.1)
    expect(actBody({ kind: 'plank', dx: 50 }, ACT_BEAT.knock)!.rot).toBeLessThan(-0.25)
    expect(actBody({ kind: 'plank', dx: -50 }, ACT_BEAT.knock)!.rot).toBeGreaterThan(0.25)
  })

  it('who hugs the stove and who sags on it, who sits in the ice box and who goes stiff, follows from each guest\'s comfort', () => {
    expect(GUEST_IDS.filter((id) => takesStove(id) === 'hugs')).toEqual(['troll', 'lizard', 'cook', 'fly'])
    expect(GUEST_IDS.filter((id) => takesIce(id) === 'armchair')).toEqual(['troll', 'bat', 'yeti', 'singer'])
  })

  it('every thing has a small move of its own for each way it is put somewhere, and is left as it was', () => {
    const kinds = Object.keys(THING_ACT_SECONDS) as ThingAct[]
    const shape = (act: ThingAct) => [0.15, 0.35, 0.55, 0.75].map((share) => { const b = thingActBody(act, THING_ACT_SECONDS[act] * share) ?? REST; return [b.sx, b.sy, b.rot, b.dx, b.dy].map((n) => n.toFixed(2)).join(',') }).join(' ')
    expect(new Set(kinds.map(shape)).size).toBe(kinds.length)
    for (const act of kinds) {
      let most = 0
      for (let age = 0; age < THING_ACT_SECONDS[act]; age += 1 / 60) most = Math.max(most, far(thingActBody(act, age)))
      expect(most, act).toBeGreaterThan(0.03)
      expect(far(thingActBody(act, THING_ACT_SECONDS[act] - 1 / 120)), act).toBeLessThan(0.04)
      expect(thingActBody(act, THING_ACT_SECONDS[act])).toBeNull()
    }
  })
})
