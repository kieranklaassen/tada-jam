import { describe, expect, it } from 'vitest'
import { Actor, RouteMaker, along, fromFirst, straight, type RouteEvent, type Stance, type Vec3 } from './troupe'

const here = (x: number, y = 0, z = 0): Stance => ({ at: [x, y, z], lie: 0, path: [] })
const types = (events: readonly RouteEvent[]): string[] => events.map((event) => event.type)

describe('a route', () => {
  it('takes him from where he stands to each stance in turn, and is then over', () => {
    const actor = new Actor('king', here(0))
    actor.send(new RouteMaker().go(here(2), 1, 0).wait(0.5).go(here(2, 0, 3), 1, 0).legs)
    expect(actor.busy).toBe(true)
    expect(actor.length).toBeCloseTo(2.5)
    actor.seek(0.5)
    expect(actor.placing.at[0]).toBeCloseTo(1)
    actor.seek(1.2)
    expect(actor.placing.at).toEqual([2, 0, 0])
    actor.seek(2)
    expect(actor.placing.at[2]).toBeCloseTo(1.5)
    actor.seek(2.6)
    expect(actor.placing.at).toEqual([2, 0, 3])
    expect(actor.busy).toBe(false)
  })

  it('lifts him over what is in the way: an arc rises above the straight line and comes down on the far end', () => {
    const actor = new Actor('cook', here(0))
    actor.send(new RouteMaker().go(here(4, 1), 1, 2).legs)
    actor.seek(0.5)
    expect(actor.placing.at[1]).toBeCloseTo(0.5 + 2)
    expect(actor.placing.air).toBeCloseTo(1)
    actor.seek(1)
    expect(actor.placing.at).toEqual([4, 1, 0])
    expect(actor.placing.air).toBe(0)
  })

  it('carries him like a hand does: straight up, across at the top, and straight down', () => {
    const actor = new Actor('king', here(0))
    actor.send(new RouteMaker().carry(here(4, 1), 1, 2).legs)
    // Rising, he is still over his own place.
    actor.seek(0.2)
    expect(actor.placing.at[0]).toBe(0)
    expect(actor.placing.at[1]).toBeGreaterThan(1)
    // At the top he is as high as the higher end and the rise, and on his way across.
    actor.seek(0.5)
    expect(actor.placing.at[1]).toBeCloseTo(3)
    expect(actor.placing.at[0]).toBeCloseTo(2)
    // Coming down, he is already over the place he is going to.
    actor.seek(0.85)
    expect(actor.placing.at[0]).toBe(4)
    expect(actor.placing.at[1]).toBeLessThan(3)
    actor.seek(1)
    expect(actor.placing.at).toEqual([4, 1, 0])
  })

  it('has the dragon pull his head in before he is lifted and put it out once he is down', () => {
    const actor = new Actor('dragon', { at: [0, 0, 0], lie: 0, path: straight(1) })
    actor.send(new RouteMaker().carry({ at: [3, 0, 0], lie: 0, path: straight(1) }, 1, 2).legs)
    actor.seek(0.07)
    expect(actor.placing.tuck).toBeCloseTo(0.5)
    expect(actor.placing.at).toEqual([0, 0, 0])
    actor.seek(0.5)
    expect(actor.placing.tuck).toBe(1)
    actor.seek(0.93)
    expect(actor.placing.tuck).toBeCloseTo(0.5)
    expect(actor.placing.at).toEqual([3, 0, 0])
    actor.seek(1)
    expect(actor.placing.tuck).toBe(0)
  })

  it('says what happens as he leaves and as he arrives, each once', () => {
    const actor = new Actor('king', here(0))
    actor.send(new RouteMaker().go(here(1), 0.5, 0.3, [{ type: 'step', who: 'king', n: 0 }], [{ type: 'hup', who: 'king' }]).go(here(2), 0.5, 0.3, [{ type: 'home', who: 'king' }]).legs)
    expect(types(actor.step(0.1))).toEqual(['hup'])
    expect(types(actor.step(0.1))).toEqual([])
    expect(types(actor.step(0.4))).toEqual(['step'])
    expect(types(actor.step(0.5))).toEqual(['home'])
    expect(types(actor.step(0.5))).toEqual([])
  })

  it('can be ended at its last stance, or stopped where he is', () => {
    const ended = new Actor('king', here(0))
    ended.send(new RouteMaker().go(here(1), 1, 0).go(here(5), 1, 0).legs)
    ended.seek(0.5)
    ended.finish()
    expect(ended.placing.at).toEqual([5, 0, 0])
    expect(ended.busy).toBe(false)
    const stopped = new Actor('king', here(0))
    stopped.send(new RouteMaker().go(here(2), 1, 0).legs)
    stopped.seek(0.5)
    stopped.halt()
    expect(stopped.busy).toBe(false)
    expect(stopped.placing.at[0]).toBeCloseTo(1)
    // A route sent now starts from where he was stopped.
    stopped.send(new RouteMaker().go(here(1, 0, 4), 1, 0).legs)
    stopped.seek(0)
    expect(stopped.placing.at[0]).toBeCloseTo(1)
  })

  it('tips the cook over as he goes to lie down', () => {
    const actor = new Actor('cook', here(0))
    actor.send(new RouteMaker().go({ at: [1, 0.5, 0], lie: 1, path: [] }, 1, 0).legs)
    actor.seek(0.5)
    expect(actor.placing.lie).toBeCloseTo(0.5)
    actor.seek(1)
    expect(actor.placing.lie).toBe(1)
  })
})

describe('the line of the dragon', () => {
  it('runs straight back from his shoulders by day', () => {
    const out = { p: [0, 0, 0] as Vec3, t: [0, 0, 0] as Vec3 }
    along(straight(1), 2, out)
    expect(out.p).toEqual([-2, 0, 0])
    expect(out.t).toEqual([-1, 0, 0])
    along(straight(-1), 2, out)
    expect(out.p).toEqual([2, 0, 0])
  })

  it('bends where a path bends, and carries straight on past its end', () => {
    const path = fromFirst([[1, 0, 1], [1, 0, 3], [-5, 0, 3]])
    expect(path[0]).toEqual([0, 0, 0])
    const out = { p: [0, 0, 0] as Vec3, t: [0, 0, 0] as Vec3 }
    along(path, 1, out)
    expect(out.p).toEqual([0, 0, 1])
    expect(out.t).toEqual([0, 0, 1])
    along(path, 3, out)
    expect(out.p).toEqual([-1, 0, 2])
    expect(out.t).toEqual([-1, 0, 0])
    along(path, 20, out)
    expect(out.p[0]).toBeCloseTo(-18)
  })

  it('goes from the line he lay along to the line he takes', () => {
    const actor = new Actor('dragon', { at: [0, 0, 0], lie: 0, path: straight(1) })
    const bent = fromFirst([[0, 0, 0], [0, 0, 2], [-6, 0, 2]])
    actor.send(new RouteMaker().go({ at: [3, 0, 0], lie: 0, path: bent }, 1, 0).legs)
    actor.seek(0.5)
    expect(actor.placing.pathFrom).toEqual(straight(1))
    expect(actor.placing.pathTo).toBe(bent)
    expect(actor.placing.mix).toBeCloseTo(0.5)
    actor.seek(1)
    expect(actor.stance().path).toBe(bent)
  })
})
