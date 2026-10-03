import { describe, expect, it } from 'vitest'
import { TOY_SHEET } from './config'
import { length, type Part } from './kit'
import { TRAY, bayAt, bays, gridPointAt, touched } from './layout'
import { stream } from './look'
import { deserialize, freshSave, serialize } from './save'
import { site } from './sites'
import { FLIGHT, HOLD, RING, Toy, closedTriangle } from './toy'

const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })
const fresh = () => new Toy(freshSave(null, TOY_SHEET), stream(5))
/** A whole drag from one grid point to another, as the Mount would feed it. */
const drag = (toy: Toy, from: [number, number], to: [number, number]) => { toy.press(...from); toy.dragStart(); toy.dragMove(...to); toy.dragEnd() }
const settle = (toy: Toy, seconds = 4) => { for (let i = 0; i < seconds * 60; i++) toy.step(1 / 60) }
const pickKind = (toy: Toy, kind: Part['kind']) => { const bay = bays(toy.at).find((b) => b.kind === kind)!; toy.press((bay.x0 + bay.x1) / 2, TRAY.top - 1); toy.tap(); toy.takeVoices() }

describe('the layout a finger reaches', () => {
  const yard = site('open-yard', 0)

  it('the tray has a pile for each kind in the kit, and a touch on it means that pile', () => {
    expect(bays(yard).map((bay) => bay.kind)).toEqual(['plank', 'stick', 'tube', 'thread'])
    expect(bays(site('plank-gap', 0)).map((bay) => bay.kind)).toEqual(['plank'])
    const stick = bays(yard)[1]
    expect(bayAt(yard, (stick.x0 + stick.x1) / 2, TRAY.top - 1)?.kind).toBe('stick')
    expect(bayAt(yard, (stick.x0 + stick.x1) / 2, 3)).toBeNull()
    // Each pile is a wide target.
    for (const bay of bays(yard)) expect(bay.x1 - bay.x0).toBeGreaterThan(2.5)
  })

  it('a touch means the pin at the nearest grid point, or the body of a part between its pins', () => {
    const bridge = [part('plank', 6, 6, 10, 6)], drawn = [{ a: [6, 6], b: [10, 6] }] as const
    expect(touched(yard, bridge, drawn, 8.1, 6.1)).toEqual({ pin: [8, 6] })
    expect(touched(yard, bridge, drawn, 8.5, 6.2)).toEqual({ part: 0 })
    expect(touched(yard, bridge, drawn, 8.5, 9)).toEqual({ pin: [8, 9] })
    expect(touched(yard, bridge, drawn, -3, 30)).toBeNull()
    // A pin never goes inside a bank: a touch deep in it means nothing, and one just under its top means the top.
    expect(gridPointAt(yard, 2, 2)).toBeNull()
    expect(gridPointAt(yard, 2, 5.6)!.point).toEqual([2, 6])
  })
})

describe('the toy', () => {
  it('answers a press where it lands, at once: a pin clicks in before the finger has moved or lifted', () => {
    const toy = fresh()
    toy.press(8.2, 9.1)
    expect(toy.hand).toMatchObject({ what: 'pin', at: [8, 9] })
    expect(toy.takeVoices()).toHaveLength(1)
    expect(toy.clicked.get('8,9')).toBe(0)
    // A tap and nothing more: the pin clicked, nothing was laid, nothing was saved.
    toy.tap()
    expect(toy.bridge).toHaveLength(0)
    expect(toy.takeChange()).toBe(false)
  })

  it('a drag from pin to pin lays a part that snaps from grid point to grid point, ticking, and lands with its own sound', () => {
    const toy = fresh()
    toy.press(6, 6); toy.takeVoices()
    toy.dragStart()
    toy.dragMove(7.2, 6.1); toy.dragMove(7.3, 6.1); toy.dragMove(8.4, 5.9)
    expect(toy.hand).toMatchObject({ what: 'lay', kind: 'plank', from: [6, 6], to: [8, 6] })
    // One tick for each new grid point, none for a move inside the same one, each lower as the part grows.
    const ticks = toy.takeVoices()
    expect(ticks).toHaveLength(2)
    expect(ticks[1][0].pitch).toBeLessThan(ticks[0][0].pitch)
    // It reaches no further than it is long.
    toy.dragMove(30, 6)
    expect(toy.hand).toMatchObject({ to: [10, 6] })
    toy.takeVoices()
    toy.dragEnd()
    expect(toy.bridge).toEqual([part('plank', 6, 6, 10, 6)])
    expect(toy.takeVoices().length).toBeGreaterThan(0)
    expect(toy.takeChange()).toBe(true)
    expect(toy.left('plank')).toBe(toy.at.kit.plank - 1)
    // It lands from a little above and settles where the model puts it: hanging from the bank, since nothing holds its far end.
    expect(toy.laid[0]).toBe(0)
    expect(toy.busy).toBe(true)
    settle(toy)
    expect(toy.busy).toBe(false)
    expect(toy.rest[0].how).toBe('hangs')
  })

  it('the simplest use always works: one plank across two pins stands', () => {
    const toy = fresh()
    drag(toy, [4, 6], [6, 6])
    expect(toy.frame.firm).toEqual([true])
    settle(toy)
    expect(toy.drawn()[0].b[1]).toBeCloseTo(6, 1)
  })

  it('the pile last touched is the kind the next drag lays, and an empty pile still answers', () => {
    const toy = fresh()
    pickKind(toy, 'thread')
    expect(toy.selected).toBe('thread')
    drag(toy, [5, 11], [10, 6])
    expect(toy.bridge[0].kind).toBe('thread')
    pickKind(toy, 'tube')
    for (let i = 0; i < toy.at.kit.tube; i++) drag(toy, [20, 6 + i], [22, 6 + i])
    expect(toy.left('tube')).toBe(0)
    toy.takeVoices()
    const before = toy.bridge.length
    drag(toy, [20, 12], [22, 12])
    expect(toy.bridge).toHaveLength(before)
    expect(toy.takeVoices().length).toBeGreaterThan(0)
  })

  it('a tap plucks a part, a second tap while it rings turns it, and a tap after the ring only plucks again', () => {
    const toy = fresh()
    drag(toy, [4, 6], [6, 6]); settle(toy); toy.takeVoices(); toy.takeChange()
    toy.press(5.5, 6.1); toy.tap()
    expect(toy.rung[0]).toBe(0)
    expect(toy.takeVoices()).toHaveLength(1)
    expect(toy.bridge[0].turned).toBe(false)
    toy.step(RING / 2)
    toy.press(5.5, 6.1); toy.tap()
    expect(toy.bridge[0].turned).toBe(true)
    expect(toy.turned[0]).toBe(0)
    expect(toy.takeChange()).toBe(true)
    toy.step(RING * 2)
    toy.press(5.5, 6.1); toy.tap()
    expect(toy.bridge[0].turned).toBe(true)
    expect(toy.rung[0]).toBe(0)
  })

  it('a carried part goes back to the tray, or back where it lay when it is let go close by', () => {
    const toy = fresh()
    drag(toy, [4, 6], [6, 6]); settle(toy); toy.takeVoices(); toy.takeChange()
    toy.press(5.5, 6.1); toy.dragStart(); toy.dragMove(5.7, 6.4); toy.dragEnd()
    expect(toy.bridge).toHaveLength(1)
    expect(toy.takeChange()).toBe(false)
    expect(toy.takeVoices()).toHaveLength(1)
    toy.press(5.5, 6.1); toy.dragStart(); toy.dragMove(9, 9)
    // In the hand it is still part of the saved bridge: a put-away now finds it where it came from.
    expect(toy.bridge).toHaveLength(1)
    expect(toy.takeChange()).toBe(false)
    toy.dragEnd()
    expect(toy.bridge).toHaveLength(0)
    expect(toy.flying).toHaveLength(1)
    expect(toy.takeChange()).toBe(true)
    toy.step(FLIGHT + 0.1)
    expect(toy.flying).toHaveLength(0)
    expect(toy.left('plank')).toBe(toy.at.kit.plank)
  })

  it('a finger resting on a pin pulls it out: the parts on it hang loose there, and a tap puts the pin back', () => {
    const toy = fresh()
    drag(toy, [6, 6], [10, 6]); pickKind(toy, 'tube'); drag(toy, [10, 3], [10, 6]); settle(toy)
    expect(toy.frame.firm).toEqual([true, true])
    toy.takeVoices(); toy.takeChange()
    toy.press(10, 6)
    toy.step(HOLD / 2)
    expect(toy.bridge.some((p) => p.loose)).toBe(false)
    toy.step(HOLD)
    expect(toy.bridge.map((p) => p.loose)).toEqual(['b', 'b'])
    expect(toy.takeChange()).toBe(true)
    // The finger still down, nothing more happens; when it lifts, the lift is not a tap on the pin.
    toy.step(1)
    toy.tap()
    expect(toy.bridge.map((p) => p.loose)).toEqual(['b', 'b'])
    settle(toy)
    expect(toy.rest.map((r) => r.how)).toEqual(['hangs', 'hangs'])
    toy.press(10, 6); toy.tap()
    expect(toy.bridge.some((p) => p.loose)).toBe(false)
    expect(toy.frame.firm).toEqual([true, true])
  })

  it('the chief has its two tastes about what was built, and a poke gets its own answer', () => {
    const toy = fresh()
    pickKind(toy, 'stick')
    drag(toy, [2, 6], [4, 6]); drag(toy, [4, 6], [3, 8])
    expect(toy.chief.act).not.toBe('taps-and-listens')
    drag(toy, [3, 8], [2, 6])
    expect(toy.chief.act).toBe('taps-and-listens')
    expect(closedTriangle(toy.bridge, 2, toy.frame.firm)).toEqual([2, 0, 1])
    // A square of sticks on the bank leans over: the chief's feathers stand on end.
    settle(toy, 3)
    drag(toy, [20, 6], [20, 8]); drag(toy, [20, 8], [22, 8])
    expect(toy.chief.act).toBe('feathers-on-end')
    settle(toy, 3)
    toy.press(1, 7.2)
    expect(toy.hand).toEqual({ what: 'chief' })
    expect(toy.chief.act).toBe('poked')
  })

  it('is found as left: put away at any instant and opened again, nothing is lost and nothing eases in', () => {
    const toy = fresh()
    drag(toy, [6, 6], [10, 6]); pickKind(toy, 'stick'); drag(toy, [20, 6], [20, 8])
    toy.press(8.5, 6.1); toy.tap()
    // Put away mid-swing, with a finger on a pin.
    toy.step(0.1); toy.press(12, 9)
    const stored = JSON.parse(JSON.stringify(serialize(toy.save)))
    const again = new Toy(deserialize(stored, null, TOY_SHEET), stream(99))
    expect(again.bridge).toEqual(toy.bridge)
    expect(again.busy).toBe(false)
    expect(again.takeVoices()).toEqual([])
    expect(again.takeChange()).toBe(false)
    expect(again.hand).toBeNull()
    again.bridge.forEach((p, i) => { const now = again.drawn()[i]; expect(Math.hypot(now.b[0] - now.a[0], now.b[1] - now.a[1])).toBeCloseTo(length(p)) })
    // A parked game ends the touch: a press ends without a tap, a lay in progress is put down.
    toy.pressEnd()
    expect(toy.hand).toBeNull()
  })
})
