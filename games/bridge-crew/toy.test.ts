import { describe, expect, it } from 'vitest'
import { length, type Part } from './kit'
import { TRAY, bayAt, bays, gridPointAt, touched } from './layout'
import { stream } from './look'
import { deserialize, freshSave, serialize } from './save'
import { groundAt } from './sheet'
import { site } from './sites'
import { CHIEF, FLIGHT, LEAN, MARKS, RING, Toy, closedTriangle, featherAt, flightEnds } from './toy'
import { lay as layVoice, pinTick, touchPart } from './voices'

const part = (kind: Part['kind'], ax: number, ay: number, bx: number, by: number, turned = false): Part => ({ kind, a: [ax, ay], b: [bx, by], turned })
/** The toy alone, on the free yard, where the whole kit is. */
const YARD = 'open-yard'
const fresh = () => new Toy(freshSave(null, YARD), stream(5))
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
    // For each new grid point a dry creak and a tick, none for a move inside the same one, and both lower as the part grows.
    const heard = toy.takeVoices(), creaks = heard.filter((voice) => voice[0].wave === 'square'), ticks = heard.filter((voice) => voice[0].wave !== 'square')
    expect(heard).toHaveLength(4)
    expect(creaks).toHaveLength(2)
    expect(ticks).toHaveLength(2)
    expect(ticks[1][0].pitch).toBeLessThan(ticks[0][0].pitch)
    expect(creaks[1][0].pitch).toBeLessThan(creaks[0][0].pitch)
    // It reaches no further than it is long.
    toy.dragMove(30, 6)
    expect(toy.hand).toMatchObject({ to: [10, 6] })
    toy.takeVoices()
    toy.dragEnd()
    expect(toy.bridge).toEqual([part('plank', 6, 6, 10, 6)])
    expect(toy.takeVoices().length).toBeGreaterThan(0)
    expect(toy.takeChange()).toBe(true)
    expect(toy.left('plank')).toBe(toy.at.kit.plank - 1)
    // It lands where it was laid, from a little above, and then goes where the model sends it: with nothing under its
    // far end it swings down and hangs from the bank.
    expect(toy.laid[0]).toBe(0)
    expect(toy.drawn()[0].b[0]).toBeCloseTo(10)
    expect(toy.drawn()[0].b[1]).toBeGreaterThan(6)
    expect(toy.busy).toBe(true)
    // A long plank swings a good while before it hangs still.
    settle(toy, 14)
    expect(toy.busy).toBe(false)
    expect(toy.rest[0].how).toBe('hangs')
  })

  it('nothing passes through anything: swinging and hanging parts stay out of the ground, and a chain stays linked', () => {
    const toy = fresh()
    // Three planks hinged across the gap with nothing under the hinges, then a stick off the far end: all of it folds.
    drag(toy, [6, 6], [10, 6]); drag(toy, [10, 6], [14, 6]); drag(toy, [14, 6], [18, 6])
    pickKind(toy, 'stick'); drag(toy, [14, 6], [14, 9])
    expect(toy.frame.firm.some(Boolean)).toBe(false)
    let knocks = 0, deepest = 0, widest = 0
    for (let frame = 0; frame < 60 * 12; frame++) {
      toy.step(1 / 60)
      knocks += toy.takeVoices().length
      const drawn = toy.drawn()
      drawn.forEach(({ a, b }) => {
        // Both ends and three points between: how far under the drawn ground any of them is.
        for (const t of [0, 0.25, 0.5, 0.75, 1]) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; deepest = Math.max(deepest, groundAt(toy.at, x) - y) }
      })
      // Every link hangs from where the part above it is now, from the first frame on.
      toy.rest.forEach((rest, index) => {
        if (!rest.via) return
        const up = drawn[rest.via.part], mine = drawn[index], s = rest.via.share
        const link = [up.a[0] + (up.b[0] - up.a[0]) * s, up.a[1] + (up.b[1] - up.a[1]) * s], pin = [mine.a[0] + (mine.b[0] - mine.a[0]) * rest.pivot, mine.a[1] + (mine.b[1] - mine.a[1]) * rest.pivot]
        widest = Math.max(widest, Math.hypot(link[0] - pin[0], link[1] - pin[1]))
      })
    }
    expect(toy.rest.some((rest) => rest.via)).toBe(true)
    // In pixels at 1180 by 820 a cell is 44: under a tenth of a cell is under five pixels.
    expect(deepest).toBeLessThan(0.1)
    expect(widest).toBeLessThan(0.02)
    // A plank swinging down from a lip knocks against the bank, and is heard.
    expect(knocks).toBeGreaterThan(0)
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
    // With none left in the picked pile, the next drag lays from the first pile that still has some: a drag always lays something while the kit has a part.
    const before = toy.bridge.length
    drag(toy, [20, 12], [22, 12])
    expect(toy.bridge).toHaveLength(before + 1)
    expect(toy.bridge[before].kind).toBe('plank')
    expect(toy.selected).toBe('plank')
    expect(toy.takeVoices().length).toBeGreaterThan(0)
  })

  it('a tap plucks a part, a second tap while it rings turns it, and a tap after the ring only plucks again', () => {
    const toy = fresh()
    drag(toy, [4, 6], [6, 6]); settle(toy); toy.takeVoices(); toy.takeChange()
    toy.press(5.5, 6.1)
    // The finger landing on it is heard at once, softly, in the plank's own stuff; the pluck comes with the lift.
    expect(toy.takeVoices()).toEqual([touchPart('plank', 2)])
    toy.tap()
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
    expect(toy.takeVoices()).toHaveLength(2)
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

  it('a pin is taken off like anything else, by dragging it to the tray: the parts on it hang loose there, and a tap puts the pin back', () => {
    const toy = fresh()
    drag(toy, [6, 6], [10, 6]); pickKind(toy, 'tube'); drag(toy, [10, 3], [10, 6]); settle(toy)
    expect(toy.frame.firm).toEqual([true, true])
    toy.takeVoices(); toy.takeChange()
    // However long the finger rests on it, a pin stays in: there is no hold.
    toy.press(10, 6)
    toy.step(3)
    expect(toy.bridge.some((p) => p.loose)).toBe(false)
    // Dragged to the tray, it comes out, and nothing is laid on the way.
    const pile = bays(toy.at)[0]
    toy.dragStart(); toy.dragMove(10, 4); toy.dragMove((pile.x0 + pile.x1) / 2, TRAY.top - 1)
    expect(toy.hand).toMatchObject({ what: 'lay', pulling: true })
    toy.dragEnd()
    expect(toy.bridge).toHaveLength(2)
    expect(toy.bridge.map((p) => p.loose)).toEqual(['b', 'b'])
    expect(toy.takeChange()).toBe(true)
    expect(toy.takeVoices().length).toBeGreaterThan(0)
    // A drag that ends back over the sheet lays a part, as ever.
    settle(toy)
    expect(toy.rest.map((r) => r.how)).toEqual(['hangs', 'hangs'])
    toy.press(10, 6); toy.tap()
    expect(toy.bridge.some((p) => p.loose)).toBe(false)
    expect(toy.frame.firm).toEqual([true, true])
  })

  it('a pin in the air is a hinge that ticks as a part on it turns, and is silent once the part is at rest', () => {
    const toy = fresh(), [lx, ly] = toy.at.left
    const ticks = (seconds: number) => { let heard = 0; for (let i = 0; i < seconds * 60; i++) { toy.step(1 / 60); heard += toy.takeVoices().filter((voice) => voice === pinTick).length } return heard }
    // A plank between two footings turns on nothing: it lands, and no hinge is heard.
    drag(toy, [lx - 1, ly], [lx, ly])
    toy.takeVoices()
    expect(ticks(3)).toBe(0)
    // A stick on one pin swings round like a clock hand, ticking, and hangs.
    pickKind(toy, 'stick')
    drag(toy, [lx, ly], [lx + 2, ly + 2])
    toy.takeVoices()
    expect(toy.rest[1].how).toBe('hangs')
    expect(ticks(4)).toBeGreaterThanOrEqual(3)
    expect(ticks(3)).toBe(0)
    // Never faster than a ratchet: two ticks are never in one step.
    drag(toy, [lx + 1, ly + 3], [lx + 3, ly + 3])
    toy.takeVoices()
    for (let i = 0; i < 240; i++) { toy.step(1 / 60); expect(toy.takeVoices().filter((voice) => voice === pinTick).length).toBeLessThanOrEqual(1) }
  })

  it('while a part is laid, what is built leans toward it a little and stands straight again when it lands', () => {
    const toy = fresh(), [lx, ly] = toy.at.left
    pickKind(toy, 'stick')
    // Two sticks from two footings to one pin in the air: a firm point above the lip.
    drag(toy, [lx - 1, ly], [lx, ly + 1]); drag(toy, [lx, ly], [lx, ly + 1])
    settle(toy)
    expect(toy.frame.firm).toEqual([true, true])
    expect(toy.lean([lx, ly + 1])).toEqual([0, 0])
    toy.press(lx - 2, ly); toy.dragStart(); toy.dragMove(lx - 1, ly + 3)
    settle(toy, 1)
    expect(toy.leaning).toBeGreaterThan(0.99)
    const lean = toy.lean([lx, ly + 1])
    // Toward the finger, which is up and to the left of it, and by no more than a few pixels.
    expect(lean[0]).toBeLessThan(0)
    expect(lean[1]).toBeGreaterThan(0)
    expect(Math.hypot(...lean)).toBeGreaterThan(0.02)
    expect(Math.hypot(...lean)).toBeLessThanOrEqual(LEAN.far)
    // A footing does not lean, nor the pin the part grows from, nor anything far off.
    expect(toy.lean([lx, ly])).toEqual([0, 0])
    expect(toy.lean([lx - 2, ly])).toEqual([0, 0])
    expect(toy.lean([lx + 8, ly + 1])).toEqual([0, 0])
    toy.dragEnd()
    settle(toy, 1.5)
    expect(toy.leaning).toBe(0)
    expect(toy.lean([lx, ly + 1])).toEqual([0, 0])
    // It is not part of what is saved.
    expect(JSON.stringify(serialize(toy.save))).not.toContain('lean')
  })

  it('a touch leaves more than itself: a ring from a pin, dust where a part lands and where a pile is stirred, and none of it for long', () => {
    const toy = fresh(), [lx, ly] = toy.at.left
    expect(toy.marks).toEqual([])
    toy.press(lx, ly)
    expect(toy.marks).toMatchObject([{ what: 'ring', at: [lx, ly], since: 0 }])
    toy.dragStart(); toy.dragMove(lx - 2, ly); toy.dragEnd()
    // The part has landed: dust at each of its two pins.
    expect(toy.marks.filter((mark) => mark.what === 'dust').map((mark) => mark.at)).toEqual([[lx, ly], [lx - 2, ly]])
    settle(toy, 0.3)
    expect(toy.marks.length).toBeGreaterThan(0)
    settle(toy, 0.5)
    expect(toy.marks).toEqual([])
    pickKind(toy, 'stick')
    expect(toy.marks).toMatchObject([{ what: 'dust' }])
    // Never more than a handful at once, however fast the finger is, and nothing of them is saved.
    for (let i = 0; i < 40; i++) { toy.press(lx - 1 - (i % 3), ly); toy.pressEnd() }
    expect(toy.marks.length).toBeLessThanOrEqual(MARKS.most)
    expect(JSON.stringify(serialize(toy.save))).not.toContain('mark')
  })

  it('poked, the chief loses a feather, which floats down to its ledge and lies there: two at most', () => {
    const toy = fresh()
    toy.press(CHIEF.x + 0.4, CHIEF.y + 1.2); toy.pressEnd()
    expect(toy.marks).toMatchObject([{ what: 'feather' }])
    const start = featherAt(toy.marks[0])
    expect(start.y).toBeGreaterThan(CHIEF.y + 1)
    let last = start.y
    for (let i = 0; i < 90; i++) { toy.step(1 / 60); const now = featherAt(toy.marks[0]); expect(now.y).toBeLessThanOrEqual(last + 1e-9); expect(now.y).toBeGreaterThanOrEqual(CHIEF.y); last = now.y }
    // On the ledge, and still.
    settle(toy, 1)
    expect(featherAt(toy.marks[0]).y).toBeCloseTo(CHIEF.y + 0.06)
    expect(featherAt(toy.marks[0]).turn).toBeCloseTo(0)
    for (let i = 0; i < 4; i++) { toy.press(CHIEF.x + 0.4, CHIEF.y + 1.2); toy.pressEnd(); settle(toy, 0.2) }
    expect(toy.marks.filter((mark) => mark.what === 'feather')).toHaveLength(MARKS.feathers)
    settle(toy, MARKS.feather + 1)
    expect(toy.marks).toEqual([])
  })

  it('taken off, each kind goes back to the tray its own way, and each ends lying level in its pile', () => {
    const a: [number, number] = [8, 6], b: [number, number] = [11, 8], home: [number, number] = [12, -2.3], long = Math.hypot(3, 2)
    const kinds = ['plank', 'stick', 'tube', 'thread'] as const
    const turnOf = (ends: { a: [number, number]; b: [number, number] }) => Math.atan2(ends.b[1] - ends.a[1], ends.b[0] - ends.a[0])
    for (const kind of kinds) {
      const start = flightEnds(kind, a, b, home, 0), end = flightEnds(kind, a, b, home, 1)
      expect(start.a[0]).toBeCloseTo(a[0]); expect(start.a[1]).toBeCloseTo(a[1])
      // Level, and in the middle of its pile.
      expect(end.a[1]).toBeCloseTo(home[1]); expect(end.b[1]).toBeCloseTo(home[1])
      expect((end.a[0] + end.b[0]) / 2).toBeCloseTo(home[0], kind === 'thread' ? 0 : 6)
      for (let t = 0; t <= 1; t += 0.05) { const now = flightEnds(kind, a, b, home, t); for (const n of [...now.a, ...now.b]) expect(Number.isFinite(n)).toBe(true) }
    }
    // A plank slides out along its own length first: its turn does not change and its middle moves along it.
    const slid = flightEnds('plank', a, b, home, 0.3)
    expect(turnOf(slid)).toBeCloseTo(turnOf({ a, b }))
    expect((slid.a[0] + slid.b[0]) / 2).toBeGreaterThan(9.5 + 0.5)
    // A stick spins: half-way it has turned far from where it lay, and it goes up before it comes down.
    const flicked = flightEnds('stick', a, b, home, 0.5)
    expect(Math.abs(Math.sin(turnOf(flicked) - turnOf({ a, b })))).toBeLessThan(1.01)
    expect((flicked.a[1] + flicked.b[1]) / 2).toBeGreaterThan((7 + home[1]) / 2 + 0.8)
    // A tube lies level almost at once and rolls down.
    expect(Math.abs(Math.sin(turnOf(flightEnds('tube', a, b, home, 0.3))))).toBeLessThan(0.05)
    // A thread runs in to its near end before it goes anywhere: half-way it is a short length still at that end.
    const reeled = flightEnds('thread', a, b, home, 0.5)
    expect(Math.hypot(reeled.b[0] - reeled.a[0], reeled.b[1] - reeled.a[1])).toBeLessThan(long * 0.2)
    expect(Math.hypot((reeled.a[0] + reeled.b[0]) / 2 - a[0], (reeled.a[1] + reeled.b[1]) / 2 - a[1])).toBeLessThan(0.6)
    // No two kinds are in the same place a third of the way.
    const mids = kinds.map((kind) => { const now = flightEnds(kind, a, b, home, 0.35); return `${((now.a[0] + now.b[0]) / 2).toFixed(1)},${((now.a[1] + now.b[1]) / 2).toFixed(1)},${turnOf(now).toFixed(1)}` })
    expect(new Set(mids).size).toBe(4)
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
    toy.press(1, 12)
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
    const again = new Toy(deserialize(stored, null, YARD), stream(99))
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

describe('what a full reading of the toy found', () => {
  it('a square whose diagonal is taken off leans into a diamond with its top on, slowly, and lies down whole', () => {
    const toy = fresh()
    pickKind(toy, 'stick')
    // On the far bank of the yard: two uprights on footings, a bar across their tops, and a diagonal.
    drag(toy, [20, 6], [20, 8]); drag(toy, [22, 6], [22, 8]); drag(toy, [20, 8], [22, 8]); drag(toy, [20, 6], [22, 8])
    settle(toy)
    expect(toy.frame.firm.every(Boolean)).toBe(true)
    // The diagonal goes to the tray.
    toy.press(21.4, 7.5); toy.dragStart(); toy.dragMove(12, -2.3); toy.dragEnd()
    expect(toy.bridge).toHaveLength(3)
    expect(toy.frame.firm.some(Boolean)).toBe(false)
    expect(toy.rest[2].tie).toBeDefined()
    let apart = 0, down = Infinity, most = 0
    for (let frame = 0; frame < 60 * 6; frame++) {
      toy.step(1 / 60)
      const [left, right, bar] = toy.drawn()
      // The bar's ends are on the uprights' tips at every moment, and it stays as long as it was cut.
      apart = Math.max(apart, Math.hypot(bar.a[0] - left.b[0], bar.a[1] - left.b[1]), Math.hypot(bar.b[0] - right.b[0], bar.b[1] - right.b[1]))
      most = Math.max(most, Math.abs(Math.hypot(bar.b[0] - bar.a[0], bar.b[1] - bar.a[1]) - 2))
      // The two uprights lean the same way, side by side: a diamond, not two sticks falling apart.
      expect(Math.abs((left.b[0] - left.a[0]) - (right.b[0] - right.a[0]))).toBeLessThan(0.05)
      if (down === Infinity && left.b[1] < 6.4) down = frame / 60
    }
    expect(apart).toBeLessThan(0.02)
    expect(most).toBeLessThan(0.05)
    // Slowly, like a deckchair: not in a fifth of a second.
    expect(down).toBeGreaterThan(0.35)
    expect(down).toBeLessThan(2)
    // And it lies where it landed.
    const [left, , bar] = toy.drawn()
    expect(left.b[1]).toBeLessThan(6.3); expect(bar.a[1]).toBeLessThan(6.3); expect(bar.b[1]).toBeLessThan(6.3)
  })

  it('a pin plucked shakes every part on it as far as a pluck would, each is heard as itself, and a tap on one of them after it still plucks', () => {
    const toy = fresh()
    // Two planks of one length meet a stick at a pin in the air.
    drag(toy, [6, 6], [9, 6]); drag(toy, [9, 6], [12, 6])
    pickKind(toy, 'stick'); drag(toy, [9, 6], [9, 8])
    settle(toy); toy.takeVoices()
    toy.press(9, 6); toy.tap()
    const rattle = toy.takeVoices().find((voice) => voice.length === 3)!
    expect(rattle).toBeDefined()
    // Three parts, three different notes, though two of them are alike.
    expect(new Set(rattle.map((sound) => Math.round(sound.pitch))).size).toBe(3)
    for (const index of [0, 1, 2]) expect(toy.shakeOf(index)).toBe(0)
    toy.step(0.05)
    for (const index of [0, 1, 2]) expect(toy.shakeOf(index)).toBeLessThan(RING)
    // A tap on the plank now plucks it: it is not turned by a tap it did not get.
    toy.press(7.5, 6.1); toy.tap()
    expect(toy.bridge[0].turned).toBe(false)
  })

  it('a lone part on one pin, its pin turned, goes right round once like a clock hand, ticking, and hangs straight down', () => {
    const toy = fresh()
    pickKind(toy, 'stick')
    // A stick by one end on the far cliff's footing, hanging.
    drag(toy, [19, 11], [21, 11])
    settle(toy, 8); toy.takeVoices()
    const start = toy.moving[0].turn.at
    toy.press(19, 11); toy.tap(); toy.step(0.05); toy.press(19, 11); toy.tap()
    let ticks = 0, farthest = 0
    for (let i = 0; i < 60 * 14; i++) { toy.step(1 / 60); ticks += toy.takeVoices().filter((voice) => voice === pinTick).length; farthest = Math.max(farthest, Math.abs(toy.moving[0].turn.at - start)) }
    // Over the top: more than a half turn from where it hung, and it comes to rest a whole turn on.
    expect(farthest).toBeGreaterThan(Math.PI * 1.5)
    expect(Math.abs(Math.abs(toy.moving[0].turn.at - start) - 2 * Math.PI)).toBeLessThan(0.1)
    expect(ticks).toBeGreaterThan(12)
    const hung = toy.drawn()[0]
    expect(hung.b[0]).toBeCloseTo(hung.a[0], 1)
  })

  it('a hinge ticks when a part on it shifts a little, not only when it turns far, and is silent at rest', () => {
    const toy = fresh()
    drag(toy, [6, 6], [10, 6]); drag(toy, [10, 6], [14, 6]); drag(toy, [14, 6], [18, 6])
    pickKind(toy, 'tube'); drag(toy, [10, 3], [10, 6])
    settle(toy); toy.takeVoices()
    // A stick laid onto the deck's joint: the deck dips and settles by a hair, and its hinges are heard.
    pickKind(toy, 'stick'); drag(toy, [14, 6], [14, 9])
    let ticks = 0
    for (let i = 0; i < 90; i++) { toy.step(1 / 60); ticks += toy.takeVoices().filter((voice) => voice === pinTick).length }
    expect(ticks).toBeGreaterThan(0)
    // Never a rattle: the stick itself turns over as it falls and ticks at each notch, and the deck's hinges a handful of times.
    expect(ticks).toBeLessThan(16)
    settle(toy, 10); toy.takeVoices()
    for (let i = 0; i < 120; i++) { toy.step(1 / 60); expect(toy.takeVoices()).toEqual([]) }
  })

  it('a thread lands with a slither that is lower and longer the longer the thread is', () => {
    const short = layVoice('thread', 1)[0], long = layVoice('thread', 9)[0]
    expect(long.pitch).toBeLessThan(short.pitch)
    expect(long.length).toBeGreaterThan(short.length)
  })
})

