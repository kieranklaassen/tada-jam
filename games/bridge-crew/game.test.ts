import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { driverAt } from './fleet'
import { Game, MODEL, PULL, ROLL_IN, SWING, swingAt, wholeArch } from './game'
import { ROLL, SLIDE_OFF, TRAY, bays, parkAt, rackAt, slideOff, tools, waitAt } from './layout'
import { stream } from './look'
import { WATER } from './pose'
import { crossingTime } from './ride'
import { crossed, deserialize, edit, freshSave, serialize, unringed } from './save'
import type { Part } from './kit'
import { isFooting, site } from './sites'
import { CHIEF } from './toy'
import { VEHICLES, trainOf } from './vehicles'
import { bargeHorn, beaverChatter, beaverSigh, beaverSlap, hornEcho, load as loadVoice, moleDrop, moleRule, pendulumSqueak, unrollVoice } from './voices'
import { groundAt } from './sheet'
import { plop, pinSwing, splash as splashVoice } from './voices'
import { DRAWN_DIP } from './pose'
import { MODEL_PLACE, MODEL_TOP, perchOn } from './motion'
import { modelDip, modelSides } from './props'
import { pluck as pluckVoice, scaleNote, scaleStart, trolleyFlip } from './voices'
import { lowPoint } from './run'
import { JUDGE } from './order'
import { desk } from './valley'
import { BUILD } from './crew'

const fresh = () => new Game(freshSave(null), stream(5))
const drag = (game: Game, from: [number, number], to: [number, number]) => { game.press(...from); game.dragStart(); game.dragMove(...to); game.dragEnd() }
const tapAt = (game: Game, x: number, y: number) => { game.press(x, y); game.tap() }
const steps = (game: Game, seconds: number) => { for (let i = 0; i < seconds * 60; i++) game.step(1 / 60) }
/** Taps the vehicle at the front of the near bank and plays until its run has ended and its scene has begun. */
const send = (game: Game) => { tapAt(game, waitAt(game.at, 0) - 0.4, game.at.left[1] + 1); for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60) }
const stored = (game: Game) => JSON.parse(JSON.stringify(serialize(game.save)))

describe('the game on the toy', () => {
  it('opens on the first sheet with its job vehicle waiting at the near bank, and a first visit is set by the age hint', () => {
    const game = fresh()
    expect(game.at.id).toBe('plank-gap')
    expect(game.waiting).toEqual(['post-van'])
    expect(game.across).toEqual([])
    expect(new Game(freshSave(12), stream(1)).at.id).toBe('first-triangle')
    expect(new Game(freshSave(2), stream(1)).at.id).toBe('plank-gap')
  })

  it('a wrong bridge is run exactly as built: the plank cracks under the van, the run is saved at once, and the state stays', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    game.takeChange(); game.takeVoices()
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: false })
    // The bridge is not changed under a vehicle: a touch is answered and nothing is laid.
    drag(game, [10, 8], [12, 8])
    expect(game.bridge).toHaveLength(1)
    let creaked = 0
    for (let i = 0; i < 60 * 20 && game.drive; i++) { game.step(1 / 60); creaked += game.takeVoices().length }
    // It was heard straining before it gave.
    expect(creaked).toBeGreaterThan(2)
    expect(game.show).toMatchObject({ kind: 'give', vehicle: 'post-van' })
    expect(game.gave).toMatchObject({ part: 0 })
    // The outcome is in the saved state the moment the scene starts, and is to be saved at once.
    expect(game.takeUrgent()).toBe(true)
    expect(game.save.tries).toBe(1)
    expect(game.save.sheets[0].ring).toMatchObject({ part: 0 })
    expect(game.save.waiting).toEqual(['post-van'])
    // The scene plays out by itself, and ends with the bridge back exactly as built and the van where it waits.
    steps(game, 6)
    expect(game.show.kind).toBeNull()
    expect(game.gave).toBeNull()
    expect(game.bridge).toHaveLength(1)
    expect(game.frame.firm).toEqual([true])
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save.finished).toBe(false)
  })

  it('a touch ends a scene at once and is then an ordinary touch', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game)
    steps(game, 0.5)
    expect(game.show.kind).toBe('give')
    game.takeVoices()
    // The touch that ends it lands on the pin half-way along the plank, which clicks and rattles the plank on it.
    tapAt(game, 12.1, 6.1)
    expect(game.show.kind).toBeNull()
    expect(game.gave).toBeNull()
    expect(game.rung[0]).toBeLessThan(1)
    // None of the scene's remaining sounds is played late: only the click and the rattle are heard.
    expect(game.takeVoices()).toHaveLength(2)
  })

  it('a bridge that holds is crossed: the cycle is judged at that moment, the next sheet is laid out and the other vehicle draws up', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    expect(game.bridge[0].turned).toBe(true)
    send(game)
    expect(game.show).toMatchObject({ kind: 'crossing', vehicle: 'post-van', reaction: { mood: 'like', act: 'parcels-stand' } })
    expect(game.takeUrgent()).toBe(true)
    expect(game.save).toMatchObject({ finished: true, position: 'rock-prop', next: { site: 'rock-prop', variant: 0 }, waiting: ['jelly-truck'], across: ['post-van'] })
    steps(game, 9)
    expect(game.show.kind).toBeNull()
    expect(game.waiting).toEqual(['jelly-truck'])
    expect(game.across).toEqual(['post-van'])
    // Nothing else starts by itself.
    steps(game, 20)
    expect(game.drive).toBeNull()
    expect(game.playing).toBe(false)
    expect(game.at.id).toBe('plank-gap')
  })

  it('put away in the middle of a scene and opened again, nothing is lost and no scene replays', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game)
    steps(game, 1)
    const again = new Game(deserialize(stored(game), null), stream(9))
    expect(again.show.kind).toBeNull()
    expect(again.playing).toBe(false)
    expect(again.takeVoices()).toEqual([])
    expect(again.waiting).toEqual(['jelly-truck'])
    expect(again.across).toEqual(['post-van'])
    expect(again.bridge).toEqual(game.bridge)
    // And in the middle of a run: the run is a view, so the van is back at the near bank and the bridge is as built.
    const other = fresh()
    drag(other, [10, 6], [14, 6])
    tapAt(other, waitAt(other.at, 0) - 0.4, 7)
    steps(other, 0.8)
    expect(other.drive).not.toBeNull()
    const reopened = new Game(deserialize(stored(other), null), stream(9))
    expect(reopened.drive).toBeNull()
    expect(reopened.waiting).toEqual(['post-van'])
    expect(reopened.save.tries).toBe(0)
  })

  it('the next sheet comes on the child\'s touch on the roll, and the sheets it has had hang on the rack', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    game.takeUrgent()
    tapAt(game, ROLL.x - 0.3, game.at.right[1] + 1.5)
    expect(game.at.id).toBe('rock-prop')
    expect(game.bridge).toEqual([])
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save).toMatchObject({ on: 1, finished: false, next: null })
    expect(game.takeUrgent()).toBe(true)
    // Back to the first sheet from the rack: its bridge stands and its van is parked on the far bank.
    tapAt(game, ...rackAt(0, 2))
    expect(game.at.id).toBe('plank-gap')
    expect(game.bridge).toHaveLength(1)
    expect(game.across).toEqual(['post-van'])
    expect(game.waiting).toEqual([])
    // Runs on a sheet from the rack are never judged.
    const position = game.save.position
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ homeward: true })
    steps(game, crossingTime(game.at, trainOf(VEHICLES['post-van'])) + 9)
    expect(game.waiting).toEqual(['post-van'])
    expect(game.save.position).toBe(position)
    expect(game.save.tries).toBe(0)
  })

  it('a parked vehicle touched drives home over the bridge, a real run, and one waiting behind comes to the front first', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: true })
    steps(game, 12)
    expect(game.save).toMatchObject({ waiting: ['jelly-truck', 'post-van'], across: [] })
    // The van, second in line, comes to the front on a touch and sets off on the next.
    tapAt(game, waitAt(game.at, 1) - 0.4, 7)
    expect(game.drive).toBeNull()
    expect(game.save.waiting).toEqual(['post-van', 'jelly-truck'])
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ vehicle: 'post-van', homeward: false })
    // A vehicle whose way home has been taken away rolls off the far bank, paddles across and is home all the same.
    steps(game, 12)
    game.save = edit(game.save, [])
    const empty = new Game(game.save, stream(2))
    tapAt(empty, parkAt(empty.at, 1, 0) - 0.4, 7)
    steps(empty, 12)
    expect(empty.save.waiting).toContain('post-van')
    expect(empty.save.across).not.toContain('post-van')
    expect(empty.save.tries).toBe(0)
  })

  it('every sheet\'s own bridge carries its job vehicle through the whole game loop', () => {
    const game = new Game({ ...freshSave(null), position: 'rock-prop' }, stream(3))
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    send(game); steps(game, 9)
    tapAt(game, ROLL.x - 0.3, 7.5)
    expect(game.at.id).toBe('first-triangle')
    game.save = edit(game.save, CROSSINGS['first-triangle'])
    const built = new Game(game.save, stream(4))
    send(built)
    expect(built.show.kind).toBe('crossing')
    expect(built.save.position).toBe('jelly-run')
  })
})

describe('the trolley, the tracing paper and the two showings', () => {
  const bay = (game: Game, tool: 'trolley' | 'tracing') => tools(game.at).find((t) => t.tool === tool)!
  const tapTool = (game: Game, tool: 'trolley' | 'tracing', where: 'pad' | 0 | 1 = 'pad') => {
    const b = bay(game, tool), x = where === 'pad' ? (b.x0 + b.x1) / 2 : where === 0 ? b.x0 + 0.4 : b.x1 - 0.4
    tapAt(game, x, where === 'pad' ? TRAY.top - TRAY.tall + 0.3 : TRAY.top - 0.4)
  }
  const carryTrolley = (game: Game, to: [number, number]) => { const b = bay(game, 'trolley'); game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(...to); game.dragEnd() }
  const edge = () => { const game = fresh(); drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1); return game }
  const dipAt12 = (game: Game) => game.answer.moved(game.frame.at.get('12,6')!)[1]

  it('a weight more for each tap on its compartment, and after six it starts again at one', () => {
    const game = fresh()
    expect(game.trolley).toEqual({ weights: 1, at: null })
    for (const expected of [2, 3, 4, 5, 6, 1]) { tapTool(game, 'trolley'); expect(game.trolley.weights).toBe(expected) }
  })

  it('set down on the deck it trundles to the low point and the deck dips under it, by the same step for each weight', () => {
    const game = edge()
    const rest = dipAt12(game)
    carryTrolley(game, [10.6, 6.3])
    expect(game.trolley.at).toEqual({ x: 12, under: false })
    expect(game.trolleyRolled).toMatchObject({ from: 10.5 })
    expect(game.takeChange()).toBe(true)
    const one = dipAt12(game) - rest
    expect(one).toBeLessThan(0)
    tapTool(game, 'trolley'); tapTool(game, 'trolley')
    expect((dipAt12(game) - rest) / one).toBeCloseTo(3, 2)
    expect(game.trolleyPlace()![0]).toBeCloseTo(12, 1)
    // Found as left: where it stands is saved with the sheet.
    const again = new Game(deserialize(stored(game), null), stream(1))
    expect(again.trolley).toEqual({ weights: 3, at: { x: 12, under: false } })
    expect(dipAt12(again)).toBeCloseTo(dipAt12(game), 6)
  })

  it('a tap rings its weights, a second tap while it rings flips it under the plank, and a vehicle sent takes its road', () => {
    const game = edge()
    carryTrolley(game, [12, 6.2]); game.takeVoices()
    const [x, y] = game.trolleyPlace()!
    tapAt(game, x, y + 0.3)
    expect(game.trolleyRung).toBe(0)
    game.step(0.2)
    tapAt(game, x, y + 0.3)
    expect(game.trolley.at).toEqual({ x: 12, under: true })
    // Dropped off the bridge, it goes back to the tray.
    game.step(2)
    game.press(x, y + 0.3); game.dragStart(); game.dragMove(3, 12); game.dragEnd()
    expect(game.trolley.at).toBeNull()
    carryTrolley(game, [12, 6.2])
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.trolley.at).toBeNull()
    expect(game.drive).not.toBeNull()
  })

  it('hung from a pin under the deck it drags that joint down', () => {
    const game = new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'first-triangle' }] }, CROSSINGS['first-triangle']), stream(2))
    const before = game.answer.moved(game.frame.at.get('12,4')!)[1]
    carryTrolley(game, [12.1, 3.9])
    expect(game.trolley.at).toEqual({ pin: [12, 4] })
    expect(game.answer.moved(game.frame.at.get('12,4')!)[1]).toBeLessThan(before)
  })

  it('too much weight on a flat plank and it cracks: the spot is ringed, the trolley is back in the tray, and no run is counted', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    for (let i = 0; i < 5; i++) tapTool(game, 'trolley')
    game.takeVoices()
    carryTrolley(game, [12, 6.2])
    expect(game.trolley).toEqual({ weights: 6, at: null })
    expect(game.save.sheets[0].ring).toMatchObject({ part: 0 })
    expect(game.save.tries).toBe(0)
    expect(game.trolleyFell).not.toBeNull()
    expect(game.takeVoices().length).toBeGreaterThan(1)
    expect(game.frame.firm).toEqual([true])
  })

  it('a tracing is a copy of the bridge as it stands; laid on the board it is answered under the same load; carried up, it changes places with the bridge', () => {
    const game = edge()
    tapTool(game, 'tracing')
    expect(game.save.sheets[0].tracings).toHaveLength(1)
    tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    expect(game.bridge[0].turned).toBe(false)
    carryTrolley(game, [12, 6.2])
    tapTool(game, 'tracing', 0)
    expect(game.laidTracing).toBe(0)
    // The traced plank is on edge: under the same trolley its line dips far less than the flat one on the board.
    const mid = (rest: { a: readonly [number, number]; b: readonly [number, number] }[]) => rest[0].a[1]
    expect(game.tracingRest).toHaveLength(1)
    expect(mid(game.tracingRest)).toBeCloseTo(6, 3)
    // One difference only (the plank turned): a fair test already, so the chief shows nothing.
    expect(game.showing).toBeNull()
    const b = bay(game, 'tracing')
    game.press(b.x0 + 0.4, TRAY.top - 0.4); game.dragStart(); game.dragMove(12, 8); game.dragEnd()
    expect(game.bridge[0].turned).toBe(true)
    expect(game.save.sheets[0].tracings[0][0].turned).toBe(false)
    expect(game.laidTracing).toBeNull()
  })

  it('the first time two designs that differ in more than one part are compared, the chief shows one clean comparison, once', () => {
    const game = new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'first-triangle' }] }, CROSSINGS['first-triangle']), stream(2))
    tapTool(game, 'tracing')
    // Both planks laid flat where the tracing has them on edge: two changes, and the bridge still stands.
    game.save = edit(game.save, CROSSINGS['first-triangle'].map((p, i) => (i < 2 ? { ...p, turned: false } : p)))
    const changed = new Game(game.save, stream(3))
    tapTool(changed, 'tracing', 0)
    expect(changed.showing).toBeNull()
    // Set down and left standing, nothing is compared: the trolley has to be run over the bridge.
    const b2 = bay(changed, 'trolley')
    changed.press((b2.x0 + b2.x1) / 2, TRAY.top - 1); changed.dragStart(); changed.dragMove(10.5, 6.2)
    expect(changed.trolley.at).toEqual({ x: 10.5, under: false })
    expect(changed.chief.act).not.toBe('compares')
    // Run a cell and a half along the deck under the finger, it has been.
    changed.dragMove(11.2, 6.2); changed.dragMove(12, 6.2)
    expect(changed.trolley.at).toEqual({ x: 12, under: false })
    changed.dragEnd()
    expect(changed.chief.act).toBe('compares')
    expect(changed.showing).toMatchObject({ differences: [{ what: 'turned' }, { what: 'turned' }] })
    expect(changed.save.shown).toContain('one-change')
    expect(changed.takeUrgent()).toBe(true)
    expect(changed.playing).toBe(true)
    steps(changed, 10)
    expect(changed.showing).toBeNull()
    tapTool(changed, 'trolley')
    expect(changed.chief.act).not.toBe('compares')
  })

  it('the neat way: the child tries first, and the idea is shown after the second failed run it answers, once', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game); steps(game, 6)
    expect(game.showing).toBeNull()
    expect(game.marginModel).toBeNull()
    send(game)
    expect(game.save.shown).toEqual([])
    steps(game, 6)
    expect(game.chief.act).toBe('shows')
    // Filled in from the sheet's idea and from the kind of failure it follows: the plank gave.
    expect(game.showing).toEqual({ idea: 'profile', failure: 'gives' })
    expect(game.save.shown).toEqual(['profile'])
    expect(game.marginModel).toBe('profile')
    // It gives way to any touch, and has been given.
    tapAt(game, 3, 12)
    expect(game.chief.act).not.toBe('shows')
    send(game); steps(game, 6)
    expect(game.chief.act).not.toBe('shows')
  })

  it('a scene a touch ended is followed by the showing it owes all the same, and that touch does not end the showing: the next one does', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game); steps(game, 6)
    send(game); steps(game, 0.5)
    expect(game.show.kind).toBe('give')
    tapAt(game, 3, 12)
    expect(game.show.kind).toBeNull()
    expect(game.chief.act).toBe('shows')
    expect(game.showing).toEqual({ idea: 'profile', failure: 'gives' })
    expect(game.save.shown).toEqual(['profile'])
    expect(game.takeUrgent()).toBe(true)
    steps(game, 1)
    expect(game.chief.act).toBe('shows')
    // The next touch ends it where it is, and it has been given.
    tapAt(game, 3, 12)
    expect(game.chief.act).not.toBe('shows')
    expect(game.marginModel).toBe('profile')
    send(game); steps(game, 7)
    expect(game.save.shown).toEqual(['profile'])
    expect(game.chief.act).not.toBe('shows')
  })

  it('a child who crosses before any such run is shown the idea once the vehicle has parked', () => {
    const game = edge()
    send(game)
    expect(game.save.shown).toEqual([])
    steps(game, 9)
    expect(game.chief.act).toBe('shows')
    expect(game.save.shown).toEqual(['profile'])
  })

  it('a hat left on a part comes off at a touch and the chief wears it until the next sheet', () => {
    const built = edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'tall-bus' }] }, CROSSINGS['high-thread'])
    const game = new Game({ ...built, sheets: [{ ...built.sheets[0], hats: [2] }] }, stream(4))
    expect(game.save.sheets[0].hats).toEqual([2])
    const ends = game.drawn()[2]
    game.press((ends.a[0] + ends.b[0]) / 2, (ends.a[1] + ends.b[1]) / 2 + 0.2)
    expect(game.save.sheets[0].hats).toEqual([])
    expect(game.chiefHat).toBe(true)
  })

  it('a secret that works every time: the threads plucked from longest to shortest play a scale and the chief taps along', () => {
    const game = hung()
    expect(game.rest.slice(4).map((rest) => rest.slack)).toEqual([false, false, false])
    const mid = (i: number) => { const e = game.drawn()[i]; return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] as const }
    const pluck = (i: number) => { steps(game, 1.2); tapAt(game, ...mid(i)) }
    const byLength = [4, 5, 6].sort((i, j) => Math.hypot(game.bridge[j].b[0] - game.bridge[j].a[0], game.bridge[j].b[1] - game.bridge[j].a[1]) - Math.hypot(game.bridge[i].b[0] - game.bridge[i].a[0], game.bridge[i].b[1] - game.bridge[i].a[1]))
    // In any other order nothing happens.
    pluck(byLength[2]); pluck(byLength[0]); pluck(byLength[1])
    expect(game.chief.act).not.toBe('taps-and-listens')
    for (const again of [0, 1]) {
      pluck(byLength[0]); pluck(byLength[1]); pluck(byLength[2])
      expect(game.chief.act, `time ${again + 1}`).toBe('taps-and-listens')
      steps(game, 4)
    }
  })
})

/** A deck at the free yard hung from both cliffs by three stays of three lengths (parts 4, 5 and 6), each of them taut under the deck's own weight. */
const HUNG = [part('plank', 6, 6, 10, 6, true), part('plank', 10, 6, 13, 6, true), part('plank', 13, 6, 16, 6, true), part('plank', 16, 6, 18, 6, true), part('thread', 5, 11, 10, 6), part('thread', 19, 11, 13, 6), part('thread', 19, 11, 16, 6)]
const hung = (bridge: readonly Part[] = HUNG) => new Game(edit(freshSave(null, 'open-yard'), bridge), stream(8))

/** Picks a pile in the tray. */
const pile = (game: Game, kind: string) => { const bay = bays(game.at).find((b) => b.kind === kind)!; tapAt(game, (bay.x0 + bay.x1) / 2, TRAY.top - 1) }

describe('what the sheet says a child sees and hears', () => {
  it('a thread as a road is a tightrope: it goes down in a V with the wheel to the water, and is straight again as the vehicle paddles off', () => {
    const game = new Game(freshSave(null, 'high-thread'), stream(4))
    pile(game, 'thread')
    drag(game, [8, 6], [16, 6])
    expect(game.bridge).toMatchObject([{ kind: 'thread' }])
    expect(game.dipPoint()).toBeNull()
    send(game)
    expect(game.show.kind).toBe('give')
    expect(game.dipped).toEqual({ part: 0 })
    let lowest = Infinity, last = 6.01
    for (let i = 0; i < 90 && game.show.paddle <= 0; i++) {
      game.step(1 / 60)
      const v = game.dipPoint()
      if (!v || game.show.paddle > 0) continue
      // The point of the V is on the thread's span and goes only down.
      expect(v.part).toBe(0)
      expect(v.at[0]).toBeGreaterThan(8)
      expect(v.at[0]).toBeLessThan(16)
      expect(v.at[1]).toBeLessThanOrEqual(last + 1e-6)
      last = v.at[1]; lowest = Math.min(lowest, v.at[1])
    }
    // Down to where the wheels sit in the water, and never under it.
    expect(lowest).toBeLessThan(WATER + 0.4)
    expect(lowest).toBeGreaterThanOrEqual(WATER)
    steps(game, 1.2)
    expect(game.dipPoint()).toBeNull()
    steps(game, 5)
    expect(game.dipped).toBeNull()
    // A touch that ends the scene leaves no V behind either, and what is saved has nothing of it.
    send(game)
    expect(game.dipped).not.toBeNull()
    game.press(1, 1)
    expect(game.dipped).toBeNull()
    expect(JSON.stringify(stored(game))).not.toContain('dipped')
  })

  it('when a vehicle goes into the water the chief looks up from its model, and goes back to it', () => {
    const game = fresh()
    send(game)
    expect(game.show.kind).toBe('give')
    expect(game.chief.act).toBe('looks-up')
    steps(game, 0.6)
    // Its neck is up and back, away from the model.
    expect(game.chief.pose.neck).toBeLessThan(-0.3)
    steps(game, 6)
    expect(game.chief.act).not.toBe('looks-up')
  })

  it('after a crossing the van stands whole on a bank, either way, so its driver on foot beside it stands on that bank too', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), long = Math.max(...VEHICLES['post-van'].axles)
    send(game)
    expect(game.show).toMatchObject({ kind: 'crossing', homeward: false })
    expect(game.show.from[0] + driverAt(long, 1)).toBeGreaterThanOrEqual(game.at.right[0])
    steps(game, 9)
    tapAt(game, parkAt(game.at, long, 0) - 0.4, game.at.right[1] + 1)
    for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60)
    expect(game.show).toMatchObject({ kind: 'crossing', homeward: true })
    // Facing home it is drawn mirrored: its driver is as far the other way.
    expect(game.show.from[0] - driverAt(long, 1)).toBeLessThanOrEqual(game.at.left[0])
  })

  it('when a seventh sheet is unrolled the oldest slides off the end of the rack, in view, once', () => {
    const base = freshSave(null), full = { ...base, sheets: Array.from({ length: 6 }, () => ({ ...base.sheets[0] })), on: 5, next: { site: 'rock-prop', variant: 0 } }
    const game = new Game(full, stream(3))
    expect(game.slidOff).toBe(Infinity)
    tapAt(game, ROLL.x - 0.3, game.at.right[1] + 1.5)
    expect(game.save.sheets).toHaveLength(6)
    expect(game.at.id).toBe('rock-prop')
    expect(game.slidOff).toBe(0)
    // It goes along the rack away from the sheets that hang there, down off its end, and fades: never toward the chief's margin.
    let last = slideOff(0, 6)
    expect(last.x).toBeLessThan(rackAt(0, 6)[0])
    for (let since = 0.05; since <= SLIDE_OFF; since += 0.05) {
      const now = slideOff(since, 6)
      expect(now.x).toBeLessThan(last.x); expect(now.y).toBeLessThan(last.y); expect(now.fade).toBeLessThan(last.fade)
      expect(now.x).toBeGreaterThan(CHIEF.x + 6)
      last = now
    }
    expect(slideOff(SLIDE_OFF, 6).fade).toBeCloseTo(0, 6)
    steps(game, 0.4)
    expect(game.slidOff).toBeGreaterThan(0.3)
    expect(game.slidOff).toBeLessThan(SLIDE_OFF)
    steps(game, 1)
    expect(game.slidOff).toBe(Infinity)
    // It is not saved, so a game opened again shows no sheet leaving; nor does a sheet taken back from the rack.
    expect(JSON.stringify(stored(game))).not.toContain('slidOff')
    expect(new Game(deserialize(stored(game), null), stream(1)).slidOff).toBe(Infinity)
    tapAt(game, ...rackAt(0, 6))
    expect(game.save.on).toBe(0)
    expect(game.slidOff).toBe(Infinity)
    // With room on the rack nothing leaves it.
    const roomy = new Game({ ...base, next: { site: 'rock-prop', variant: 0 } }, stream(3))
    tapAt(roomy, ROLL.x - 0.3, roomy.at.right[1] + 1.5)
    expect(roomy.save.sheets).toHaveLength(2)
    expect(roomy.slidOff).toBe(Infinity)
  })

  it('the model in the margin can be pressed and plucked, and the chief beside it still has its own answer', () => {
    const game = fresh(), mx = (MODEL.x0 + MODEL.x1) / 2, my = (MODEL.y0 + MODEL.y1) / 2
    // With no model there, the place is not the model's.
    game.press(mx, my)
    expect(game.hand?.what).not.toBe('model')
    game.pressEnd()
    drag(game, [10, 6], [14, 6])
    send(game); steps(game, 6); send(game); steps(game, 6 + 9)
    expect(game.marginModel).toBe('profile')
    game.takeVoices()
    game.press(mx, my)
    expect(game.hand).toEqual({ what: 'model' })
    expect(game.takeVoices()).toHaveLength(1)
    expect(game.chief.act).not.toBe('poked')
    expect(game.modelRung).toBe(Infinity)
    game.tap()
    expect(game.modelRung).toBe(0)
    expect(game.takeVoices()).toHaveLength(1)
    steps(game, 2)
    expect(game.modelRung).toBeGreaterThan(1)
    // Nothing of the bridge changed for it.
    expect(game.bridge).toHaveLength(1)
    game.press(CHIEF.x + 0.4, CHIEF.y + 1.2)
    expect(game.hand).toEqual({ what: 'chief' })
    expect(game.chief.act).toBe('poked')
  })

  it('a whole arch is three or more firm parts in a curve from footing to footing, over the whole stretch', () => {
    const at = site('barge-below', 0), footing = isFooting(at), over = at.channel!
    const arch = [part('stick', 7, 6, 9, 9), part('stick', 9, 9, 12, 10), part('stick', 12, 10, 15, 9), part('stick', 15, 9, 17, 6)]
    const firm = (parts: unknown[]) => parts.map(() => true)
    expect(wholeArch(arch, firm(arch), footing, over)).toBe(true)
    // Not whole with a part that is not firm, with a part missing, or with a thread in it.
    expect(wholeArch(arch, [true, true, false, true], footing, over)).toBe(false)
    expect(wholeArch(arch.slice(0, 3), firm(arch), footing, over)).toBe(false)
    expect(wholeArch(arch.map((p, i) => (i === 1 ? { ...p, kind: 'thread' as const } : p)), firm(arch), footing, over)).toBe(false)
    // Two parts make a gable and no curve; a curve that bends back is no arch; nor is one that stops short of the stretch's far side.
    const gable = [part('stick', 7, 6, 9, 9), part('stick', 9, 9, 10, 3)]
    expect(wholeArch(gable, firm(gable), footing, [8, 9])).toBe(false)
    const kinked = [part('stick', 7, 6, 9, 7), part('stick', 9, 7, 12, 10), part('stick', 12, 10, 15, 9), part('stick', 15, 9, 17, 6)]
    expect(wholeArch(kinked, firm(kinked), footing, over)).toBe(false)
    const short = [part('stick', 7, 6, 8, 8), part('stick', 8, 8, 9, 8), part('stick', 9, 8, 10, 0)]
    expect(wholeArch(short, firm(short), footing, [7, 9])).toBe(true)
    expect(wholeArch(short, firm(short), footing, over)).toBe(false)
  })

  it('a secret that works every time: under a whole arch the barge\'s toot comes back as a chord', () => {
    const on = (bridge: typeof CROSSINGS['barge-below']) => new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'barge-below' }] }, bridge), stream(2))
    const heard = (game: Game) => { const all = []; send(game); for (let i = 0; i < 60 * 9; i++) { game.step(1 / 60); all.push(...game.takeVoices()) } return all }
    // The arch stands over the deck from lip to lip, and three posts from the deck hold its joints.
    const arch = [...CROSSINGS['barge-below'], part('stick', 7, 6, 9, 9), part('stick', 9, 9, 12, 10), part('stick', 12, 10, 15, 9), part('stick', 15, 9, 17, 6), part('stick', 9, 6, 9, 9), part('stick', 12, 6, 12, 10), part('stick', 15, 6, 15, 9)]
    for (const again of [0, 1]) {
      const game = on(arch)
      expect(game.frame.firm.every(Boolean), `time ${again + 1}`).toBe(true)
      const voices = heard(game)
      expect(game.save.sheets[0].crossed).toContain('post-van')
      expect(voices.filter((voice) => voice === hornEcho)).toHaveLength(1)
    }
    // The same bridge without the arch: the barge toots, and nothing comes back.
    const plain = heard(on(CROSSINGS['barge-below']))
    expect(plain.some((voice) => JSON.stringify(voice) === JSON.stringify(bargeHorn(true)))).toBe(true)
    expect(plain).not.toContain(hornEcho)
  })

  it('one part of a tracing laid on the board can be copied onto the bridge with a tap', () => {
    const game = fresh(), paper = tools(game.at).find((t) => t.tool === 'tracing')!
    drag(game, [10, 6], [14, 6]); tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    expect(game.bridge).toMatchObject([{ turned: true }])
    // A tracing is kept, the plank goes back to the tray, and the tracing is laid on the bare board.
    tapAt(game, (paper.x0 + paper.x1) / 2, TRAY.top - TRAY.tall + 0.3)
    steps(game, 1)
    game.press(12.5, 6.1); game.dragStart(); game.dragMove(12.5, 2); game.dragEnd()
    expect(game.bridge).toEqual([])
    steps(game, 1)
    tapAt(game, paper.x0 + 0.4, TRAY.top - 0.4)
    expect(game.laidTracing).toBe(0)
    // A touch on a pin of the traced part is still a pin.
    game.press(10, 6)
    expect(game.hand?.what).toBe('pin')
    game.pressEnd()
    steps(game, 1)
    game.takeChange(); game.takeVoices()
    game.press(12.5, 6.1)
    expect(game.hand).toEqual({ what: 'traced', index: 0 })
    expect(game.takeVoices()).toHaveLength(1)
    game.tap()
    expect(game.bridge).toEqual([{ kind: 'plank', a: [10, 6], b: [14, 6], turned: true }])
    expect(game.takeChange()).toBe(true)
    expect(game.frame.firm).toEqual([true])
    // The bridge has that part now: the same touch means the bridge's own part, and nothing is laid twice.
    steps(game, 1.5)
    game.press(12.5, 6.1)
    expect(game.hand?.what).toBe('part')
    game.tap()
    expect(game.bridge).toHaveLength(1)
    // With the tracing lifted, the place is the board's again.
    const bare = fresh()
    bare.press(12.5, 6.1)
    expect(bare.hand?.what).not.toBe('traced')
  })

  it('a vehicle that goes in makes a splash that the water keeps until it is calm, and that is not saved', () => {
    const game = fresh()
    expect(game.splash).toBeNull()
    send(game)
    expect(game.splash).toBeNull()
    steps(game, 1.2)
    expect(game.splash).toMatchObject({ big: 1 })
    // Where the vehicle came down, between the banks.
    expect(game.splash!.x).toBeGreaterThan(game.at.left[0])
    expect(game.splash!.x).toBeLessThan(game.at.right[0])
    expect(JSON.stringify(stored(game))).not.toContain('splash')
    steps(game, 8)
    expect(game.splash).toBeNull()
    // A touch that ends the scene before the vehicle is down makes none.
    send(game)
    game.press(1, 1)
    steps(game, 2)
    expect(game.splash).toBeNull()
  })
})

describe('the crew at the foot of the sheet, in the game', () => {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const heard = (game: Game, seconds: number) => { const all = []; for (let i = 0; i < seconds * 60; i++) { game.step(1 / 60); all.push(...game.takeVoices()) } return all }

  it('they stand left of the tray on every sheet, and go with the sheet when it is turned', () => {
    const game = fresh()
    expect(game.crewAt('beaver')).toEqual([desk(game.at).crew[0], desk(game.at).floor])
    expect(game.crewAt('mole')[0]).toBeLessThan(game.at.left[0] - 1)
    const yard = new Game(freshSave(null, 'long-haul'), stream(2))
    expect(yard.crewAt('beaver')[0]).toBeLessThan(game.crewAt('beaver')[0])
    expect(yard.crew.mole.head[0]).toBe(yard.crewAt('mole')[0])
    expect(yard.crew.mole.head[1]).toBeCloseTo(yard.crewAt('mole')[1] + BUILD.mole.eyes)
  })

  it('the beaver winces before every crossing, whatever the bridge: at a give it starts and hides its eyes, at a crossing it lets its breath go', () => {
    const game = fresh()
    game.takeVoices()
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.takeVoices()).toContain(beaverChatter)
    steps(game, 0.3)
    expect(game.crew.beaver.act).toBe('brace')
    for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60)
    expect(game.show.kind).toBe('give')
    expect(game.crew.beaver.act).toBe('flinch')
    expect(game.chief.act).toBe('looks-up')
    steps(game, 1.2)
    expect(game.crew.mole.act).toBe('splashed')
    steps(game, 8)
    expect(game.crew.beaver.busy).toBe(false)
    // The same wince for a bridge that holds.
    const sound = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    tapAt(sound, waitAt(sound.at, 0) - 0.4, 7)
    steps(sound, 0.3)
    expect(sound.crew.beaver.act).toBe('brace')
    sound.takeVoices()
    for (let i = 0; i < 60 * 20 && sound.drive; i++) sound.step(1 / 60)
    expect(sound.crew.beaver.act).toBe('relief')
    expect(sound.crew.mole.act).toBe('crossed')
    const after = [...sound.takeVoices(), ...heard(sound, 4)]
    expect(after).toContain(beaverSigh)
    // The mole's rule is heard twice, lower and then higher.
    expect(after.filter((voice) => same(voice, moleRule(false)) || same(voice, moleRule(true))).map((voice) => same(voice, moleRule(true)))).toEqual([false, true])
  })

  it('a part laid is measured by the mole, twice, and a part laid while it measures does not start it again', () => {
    const game = fresh()
    steps(game, 0.5); game.takeVoices()
    drag(game, [10, 6], [14, 6])
    expect(game.crew.mole.act).toBe('laid')
    steps(game, 0.4)
    const into = game.crew.mole.progress
    drag(game, [10, 6], [12, 7])
    expect(game.crew.mole.progress).toBeGreaterThanOrEqual(into)
    const rules = heard(game, 3).filter((voice) => same(voice, moleRule(false)) || same(voice, moleRule(true)))
    expect(rules.map((voice) => same(voice, moleRule(true)))).toEqual([false, true])
    expect(game.crew.mole.busy).toBe(false)
  })

  it('each has its own answer to a poke, and nothing of them is saved', () => {
    const game = fresh()
    steps(game, 0.5); game.takeVoices(); game.takeChange()
    const [bx, by] = game.crewAt('beaver'), [mx, my] = game.crewAt('mole')
    game.press(bx, by + 1.2)
    expect(game.hand).toEqual({ what: 'crew', who: 'beaver' })
    expect(game.crew.beaver.act).toBe('poked')
    expect(game.takeVoices()).toEqual([beaverSlap])
    game.tap()
    game.press(mx, my + 0.8)
    expect(game.hand).toEqual({ what: 'crew', who: 'mole' })
    expect(game.crew.mole.act).toBe('poked')
    expect(game.takeVoices()).toEqual([moleDrop])
    game.tap()
    expect(game.takeChange()).toBe(false)
    expect(game.bridge).toEqual([])
    const kept = JSON.stringify(stored(game))
    expect(kept).not.toContain('crew'); expect(kept).not.toContain('beaver'); expect(kept).not.toContain('mole')
    // The tray beside them is still the tray.
    const pile = bays(game.at)[0]
    game.press(pile.x0 + 0.5, TRAY.top - 1)
    expect(game.hand?.what).toBe('bay')
  })
})

describe('what the reader found the sheet promises', () => {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const paper = (game: Game) => tools(game.at).find((t) => t.tool === 'tracing')!
  const cart = (game: Game) => tools(game.at).find((t) => t.tool === 'trolley')!

  it('under a load each part is heard in its own kind\'s voice: a plank creaks lower the deeper it bends, on a run and under the trolley', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    game.takeVoices()
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    const heard = []
    for (let i = 0; i < 60 * 20 && game.drive; i++) { game.step(1 / 60); heard.push(...game.takeVoices()) }
    const planks = heard.filter((voice) => voice.length === 1 && voice[0].wave === 'square' && voice[0].slideTo !== undefined)
    expect(planks.length).toBeGreaterThanOrEqual(2)
    // The plank's own voice (a creak that slides down), not one voice for every kind; and the same shape as the plank's cell of the grid.
    for (const voice of planks) { expect(voice[0].slideTo!).toBeLessThan(voice[0].pitch); expect(voice[0].length).toBe(loadVoice('plank', 0.5)[0].length) }
    // Each creak is lower than the one before: the curve deepens.
    for (let i = 1; i < planks.length; i++) expect(planks[i][0].pitch).toBeLessThan(planks[i - 1][0].pitch)
    steps(game, 7)
    // The trolley set down on the plank: the plank is heard taking it.
    const edge = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), b = cart(edge)
    edge.takeVoices()
    edge.press((b.x0 + b.x1) / 2, TRAY.top - 1); edge.dragStart(); edge.dragMove(12, 6.2); edge.dragEnd()
    expect(edge.trolley.at).not.toBeNull()
    expect(edge.takeVoices().some((voice) => voice.length === 1 && voice[0].wave === 'square' && voice[0].slideTo !== undefined)).toBe(true)
  })

  it('a part that gives breaks at its spot: two pieces hang from their own pins, never in the ground, and close up as the bridge goes back', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    expect(game.pieces()).toBeNull()
    send(game)
    expect(game.gave).toMatchObject({ part: 0 })
    let lowest = 6, seen = 0
    for (let i = 0; i < 60 * 3.5; i++) {
      game.step(1 / 60)
      const broken = game.pieces()
      if (!broken) continue
      seen++
      expect(broken).toMatchObject({ part: 0, kind: 'plank' })
      const [nearHinge, nearTip] = broken.near, [farHinge, farTip] = broken.far
      expect(nearHinge).toEqual([10, 6]); expect(farHinge).toEqual([14, 6])
      // The two pieces together are as long as the plank was.
      expect(Math.hypot(nearTip[0] - 10, nearTip[1] - 6) + Math.hypot(farTip[0] - 14, farTip[1] - 6)).toBeCloseTo(4, 6)
      for (const [hinge, tip] of [broken.near, broken.far]) for (const share of [0.5, 0.75, 1]) expect(groundAt(game.at, hinge[0] + (tip[0] - hinge[0]) * share)).toBeLessThanOrEqual(hinge[1] + (tip[1] - hinge[1]) * share + 0.031)
      lowest = Math.min(lowest, nearTip[1], farTip[1])
    }
    expect(seen).toBeGreaterThan(100)
    // They hang well down while the vehicle is in the water.
    expect(lowest).toBeLessThan(4.6)
    steps(game, 1.7)
    // Going back as built, the tips meet again where it broke, level with the pins.
    const closing = game.pieces()
    if (closing) { expect(closing.near[1][1]).toBeGreaterThan(5.5); expect(closing.far[1][1]).toBeGreaterThan(5.5) }
    steps(game, 2)
    expect(game.pieces()).toBeNull()
    expect(game.gave).toBeNull()
    expect(game.frame.firm).toEqual([true])
  })

  it('a tracing laid on the board dips under a vehicle as the bridge does, at the same place', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), b = paper(game)
    // The tracing is of the plank on edge; the board then gets the same plank and the tracing is laid on it.
    tapAt(game, (b.x0 + b.x1) / 2, TRAY.top - TRAY.tall + 0.3)
    tapAt(game, b.x0 + 0.4, TRAY.top - 0.4)
    expect(game.laidTracing).toBe(0)
    const level = game.tracingRest[0].a[1]
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive?.tracing).not.toBeNull()
    let moved = 0
    for (let i = 0; i < 60 * 20 && game.drive; i++) {
      game.step(1 / 60)
      // The same design under the same load lies exactly as the bridge does.
      expect(game.tracingRest[0].a[1]).toBeCloseTo(game.rest[0].a[1], 9)
      moved = Math.max(moved, ...game.tracingRest.map((rest, k) => Math.abs((rest.a[1] + rest.b[1]) / 2 - (game.rest[k].a[1] + game.rest[k].b[1]) / 2)))
    }
    expect(moved).toBeCloseTo(0, 9)
    steps(game, 9)
    expect(game.tracingRest[0].a[1]).toBeCloseTo(level, 6)
  })

  it('a crossing brings the roll and the other vehicle once: a later crossing on the same sheet brings neither again', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    send(game)
    expect(game.show).toMatchObject({ kind: 'crossing', rollArrives: true, arriving: 'jelly-truck' })
    const first = []
    for (let i = 0; i < 60 * 9; i++) { game.step(1 / 60); first.push(...game.takeVoices()) }
    expect(first.filter((voice) => same(voice, unrollVoice(1)))).toHaveLength(1)
    // The van goes home and crosses again: the roll and the truck are there already.
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7); steps(game, 14)
    tapAt(game, waitAt(game.at, 1) - 0.4, 7)
    game.takeVoices()
    send(game)
    expect(game.show).toMatchObject({ kind: 'crossing', rollArrives: false, arriving: null })
    const again = []
    for (let i = 0; i < 60 * 9; i++) { game.step(1 / 60); again.push(...game.takeVoices()) }
    expect(again.filter((voice) => same(voice, unrollVoice(1)))).toHaveLength(0)
  })

  it('after a cycle judged badly the roll slides in when the give has ended, as it does after a crossing', () => {
    const nearly = (): Game => { const game = new Game({ ...freshSave(null), tries: JUDGE.badly - 1 }, stream(2)); game.takeVoices(); return game }
    const game = nearly()
    send(game)
    expect(game.save).toMatchObject({ finished: true, tries: JUDGE.badly })
    expect(game.save.next).not.toBeNull()
    // The outcome is saved, and the roll waits for the scene to end.
    expect(game.rollIn).toBe(-1)
    const during = []
    for (let i = 0; i < 60 * 3; i++) { game.step(1 / 60); during.push(...game.takeVoices()) }
    expect(game.rollIn).toBe(-1)
    expect(during.filter((voice) => same(voice, unrollVoice(1)))).toHaveLength(0)
    const after = []
    for (let i = 0; i < 60 * 3; i++) { game.step(1 / 60); after.push(...game.takeVoices()); if (game.show.kind === null && game.rollIn < ROLL_IN) expect(game.rollIn).toBeGreaterThanOrEqual(0) }
    expect(after.filter((voice) => same(voice, unrollVoice(1)))).toHaveLength(1)
    steps(game, 1.5)
    expect(game.rollIn).toBe(Infinity)
    // A touch that ends the scene finds the roll there already, and can unroll it.
    const quick = nearly()
    send(quick)
    quick.press(1, 1)
    expect(quick.rollIn).toBe(Infinity)
    tapAt(quick, ROLL.x - 0.3, quick.at.right[1] + 1.5)
    expect(quick.save.sheets).toHaveLength(2)
    // Opened again in the middle of that scene, the roll is simply there.
    const away = nearly()
    send(away)
    expect(new Game(deserialize(stored(away), null), stream(1)).rollIn).toBe(Infinity)
  })

  it('the pencil ring fades through the crossing that takes it away', () => {
    const base = edit(freshSave(null), CROSSINGS['plank-gap']), ring = { part: 0, spot: [12, 6] as const }
    const game = new Game({ ...base, sheets: [{ ...base.sheets[0], ring }] }, stream(2))
    expect(game.fading).toBeNull()
    send(game)
    expect(game.save.sheets[0].ring).toBeNull()
    expect(game.fading).toEqual(ring)
    steps(game, 9)
    expect(game.fading).toBeNull()
    // With no ring there is nothing to fade.
    const bare = new Game(base, stream(2))
    send(bare)
    expect(bare.fading).toBeNull()
  })

  it('a secret that works every time: any two threads or more that hold something, plucked from longest to shortest, and threads of one length in either order', () => {
    // Two stays of one length hold a deck, one from each cliff; a third thread from cliff to bank holds nothing and is slack.
    const game = hung([part('plank', 6, 6, 10, 6, true), part('plank', 10, 6, 14, 6, true), part('plank', 14, 6, 18, 6, true), part('thread', 5, 11, 10, 6), part('thread', 19, 11, 14, 6), part('thread', 19, 11, 22, 6)])
    expect(game.rest.slice(3).map((rest) => rest.slack)).toEqual([false, false, true])
    const mid = (i: number) => { const e = game.drawn()[i]; return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] as const }
    for (const order of [[3, 4], [4, 3]]) {
      steps(game, 4)
      for (const i of order) { steps(game, 1.2); tapAt(game, ...mid(i)) }
      expect(game.chief.act, order.join()).toBe('taps-and-listens')
    }
  })

  it('the trolley on its hook swings with a squeak at each end until it hangs still, and a tap sets it swinging again', () => {
    expect(swingAt(0)).toBeCloseTo(SWING.far)
    expect(swingAt(Infinity)).toBe(0)
    expect(Math.abs(swingAt(12))).toBeLessThan(0.01)
    const game = new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'first-triangle' }] }, CROSSINGS['first-triangle']), stream(2)), b = cart(game)
    game.takeVoices()
    game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(12.1, 3.9); game.dragEnd()
    expect(game.trolley.at).toEqual({ pin: [12, 4] })
    expect(game.swing).toBe(0)
    const squeaks = (seconds: number) => { let heard = 0; for (let i = 0; i < seconds * 60; i++) { game.step(1 / 60); heard += game.takeVoices().filter((voice) => same(voice, pendulumSqueak(true)) || same(voice, pendulumSqueak(false))).length } return heard }
    expect(game.takeVoices().filter((voice) => same(voice, pendulumSqueak(false)))).toHaveLength(1)
    // One at each end of each swing, while it swings far enough to hear.
    expect(squeaks(6)).toBeGreaterThanOrEqual(3)
    expect(squeaks(20)).toBe(0)
    expect(game.swing).toBe(Infinity)
    const place = game.trolleyPlace()!
    tapAt(game, place[0], place[1] + 0.3)
    expect(game.swing).toBe(0)
    expect(squeaks(3)).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(stored(game))).not.toContain('swing')
  })

  it('at the free yard one vehicle waits; drawn back from the gap and let go it leaves, the next of the fleet draws up, and whichever is sent across is the yard\'s own', () => {
    const game = new Game({ ...edit(freshSave(null, 'open-yard'), CROSSINGS['open-yard']), position: 'open-yard' }, stream(3))
    expect(game.waiting).toEqual(['post-van'])
    const front = () => [waitAt(game.at, 0) - 0.4, 7] as const
    const pull = (by: number) => { const [x, y] = front(); game.press(x, y); game.dragStart(); game.dragMove(x - by / 2, y); game.dragMove(x - by, y) }
    // It rolls back with the finger, and no farther than a little more than its length.
    pull(0.6)
    expect(game.hand).toMatchObject({ what: 'vehicle', id: 'post-van' })
    expect((game.hand as { pulled: number }).pulled).toBeCloseTo(0.6, 6)
    game.dragMove(front()[0] - 9, 7)
    expect(game.hand).toMatchObject({ pulled: PULL.most })
    game.dragMove(front()[0] + 3, 7)
    expect(game.hand).toMatchObject({ pulled: 0 })
    // Let go too soon, it rolls up to the gap again and nothing has changed.
    game.dragMove(front()[0] - 0.6, 7); game.takeChange(); game.dragEnd()
    expect(game.swap).toMatchObject({ id: 'post-van', away: false })
    expect(game.waiting).toEqual(['post-van'])
    expect(game.takeChange()).toBe(false)
    steps(game, PULL.back + 0.1)
    expect(game.swap).toBeNull()
    // Drawn back a cell or more and let go, it leaves: the line is the next of the fleet from that moment, and is saved so.
    pull(1.4); game.dragEnd()
    expect(game.swap).toMatchObject({ id: 'post-van', away: true })
    expect(game.waiting).toEqual(['jelly-truck'])
    expect(game.takeChange()).toBe(true)
    expect(deserialize(stored(game)).waiting).toEqual(['jelly-truck'])
    // While one leaves and the next draws up, a tap sends nobody.
    tapAt(game, ...front())
    expect(game.drive).toBeNull()
    steps(game, PULL.leaves + PULL.arrives + 0.1)
    expect(game.swap).toBeNull()
    // Every vehicle of the fleet can be had so, and the first comes round again.
    const had = ['post-van', 'jelly-truck']
    for (let i = 0; i < 4; i++) { pull(1.2); game.dragEnd(); steps(game, PULL.leaves + PULL.arrives + 0.1); had.push(game.waiting[0]) }
    expect(new Set(had).size).toBe(5)
    expect(game.waiting).toEqual(['post-van'])
    // A touch that is put away in the middle leaves the vehicle where it was.
    pull(2); game.pressEnd()
    expect(game.hand).toBeNull(); expect(game.swap).toBeNull(); expect(game.waiting).toEqual(['post-van'])
    send(game)
    expect(game.show.kind).toBe('crossing')
    // Its crossing judges the cycle, and the position stays at the yard.
    expect(game.save).toMatchObject({ finished: true, position: 'open-yard', across: ['post-van'] })
    expect(game.save.next).toMatchObject({ site: 'open-yard' })
    expect(game.show.arriving).toBe('jelly-truck')
    expect(game.waiting).toEqual(['jelly-truck'])
  })

  it('on any other sheet the waiting vehicle is not drawn back: a drag on it does nothing', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), x = waitAt(game.at, 0) - 0.4
    game.takeChange()
    game.press(x, 7); game.dragStart(); game.dragMove(x - 2, 7)
    expect(game.hand).toMatchObject({ what: 'vehicle', pulled: 0 })
    game.dragEnd()
    expect(game.waiting).toEqual(['post-van'])
    expect(game.drive).toBeNull()
    expect(game.takeChange()).toBe(false)
  })

  it('put away in the middle of a touch, the thing in the hand is back where it came from: no move is made that the child did not make', () => {
    // A half-drawn part is not laid.
    const laying = fresh()
    laying.press(10, 6); laying.dragStart(); laying.dragMove(14, 6)
    expect(laying.hand?.what).toBe('lay')
    laying.pressEnd()
    expect(laying.hand).toBeNull()
    expect(laying.bridge).toEqual([])
    // A carried part, well away from where it lay, is not taken off.
    const carrying = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    carrying.takeChange()
    carrying.press(12.5, 6.1); carrying.dragStart(); carrying.dragMove(12.5, 1)
    carrying.pressEnd()
    expect(carrying.bridge).toHaveLength(1)
    // The trolley in the hand is not set down, and a tracing in the hand is not swapped.
    const b = cart(carrying), t = paper(carrying)
    carrying.press((b.x0 + b.x1) / 2, TRAY.top - 1); carrying.dragStart(); carrying.dragMove(12, 6.2)
    carrying.pressEnd()
    expect(carrying.trolley.at).toBeNull()
    tapAt(carrying, (t.x0 + t.x1) / 2, TRAY.top - TRAY.tall + 0.3)
    const kept = JSON.stringify(stored(carrying))
    carrying.takeChange()
    carrying.press(t.x0 + 0.4, TRAY.top - 0.4); carrying.dragStart(); carrying.dragMove(12, 8)
    carrying.pressEnd()
    expect(JSON.stringify(stored(carrying))).toBe(kept)
    expect(carrying.takeChange()).toBe(false)
  })
})

describe('what the second reading found the sheet promises', () => {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const paper = (game: Game) => tools(game.at).find((t) => t.tool === 'tracing')!
  const cart = (game: Game) => tools(game.at).find((t) => t.tool === 'trolley')!
  const setDown = (game: Game, x: number, y: number) => { const b = cart(game); game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(x, y); game.dragEnd() }
  const pile = (game: Game, kind: string) => { const bay = bays(game.at).find((b) => b.kind === kind)!; tapAt(game, (bay.x0 + bay.x1) / 2, TRAY.top - 1) }

  it('a plank bends in a smooth curve, deepest under the load, and the load stands on the curve', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    // By its own weight it hardly bends.
    const alone = game.bend(0)
    expect(alone.length).toBeGreaterThanOrEqual(5)
    expect(Math.max(...alone.map((point) => Math.abs(point.off[1])))).toBeLessThan(0.05)
    setDown(game, 12, 6.2)
    expect(game.trolley.at).toMatchObject({ x: 12 })
    const curve = game.bend(0)
    // Every point along it is below the line between its ends, the middle most of all, and it is smooth: no point is a kink.
    for (const point of curve) expect(point.off[1]).toBeLessThan(0)
    const deepest = curve.reduce((low, point) => (point.off[1] < low.off[1] ? point : low))
    expect(deepest.share).toBeCloseTo(0.5, 1)
    for (let i = 1; i + 1 < curve.length; i++) expect(curve[i].off[1]).toBeLessThanOrEqual((curve[i - 1].off[1] + curve[i + 1].off[1]) / 2 + 1e-9)
    // The trolley stands on that curve, not in the wood and not over it.
    const place = game.trolleyPlace()!
    expect(place[1]).toBeCloseTo(6 + deepest.off[1], 6)
    expect(6 - place[1]).toBeCloseTo(-game.answer.moved(game.frame.at.get('12,6')!)[1] * DRAWN_DIP, 6)
    // A stick has no curve, and neither has a plank in the hand.
    expect(game.bend(7)).toEqual([])
    // During a give the planks lie straight while the bridge is broken.
    const broken = fresh()
    drag(broken, [10, 6], [14, 6])
    send(broken)
    expect(broken.bend(0)).toEqual([])
  })

  it('a pluck follows the force in the part with the trolley on the bridge too', () => {
    const game = new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'rock-prop' }] }, CROSSINGS['rock-prop']), stream(2))
    const prop = game.bridge.findIndex((part) => part.kind === 'stick'), before = game.answer.parts[prop].force
    expect(before).toBeLessThan(0)
    const top = game.bridge[prop].a[1] > game.bridge[prop].b[1] ? game.bridge[prop].a : game.bridge[prop].b
    setDown(game, top[0], top[1] + 0.2)
    expect(game.trolley.at).not.toBeNull()
    // The prop is squeezed harder under the trolley, and its pluck is still a knock, lower than before.
    expect(game.answer.parts[prop].force).toBeLessThan(before - 0.1)
    expect(game.answer.parts.some((part) => part.force !== 0)).toBe(true)
  })

  it('whatever stood on a plank drops and bobs when the plank is taken off', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    setDown(game, 12, 6.2)
    steps(game, 1); game.takeVoices()
    game.press(13.5, 6.1); game.dragStart(); game.dragMove(13.5, 1); game.dragEnd()
    expect(game.bridge).toEqual([])
    expect(game.trolley.at).toBeNull()
    expect(game.trolleyFell).toMatchObject({ since: 0 })
    expect(game.trolleyFell!.from[0]).toBeCloseTo(12, 6)
    expect(game.takeVoices().some((voice) => same(voice, splashVoice(1)))).toBe(true)
    expect(game.splash).toMatchObject({ big: 0.4 })
    steps(game, 2)
    expect(game.trolleyFell).toBeNull()
  })

  it('the trolley can stand on a tube, and log-rolls off into the water with a plop when the tube is turned', () => {
    const game = new Game(edit(freshSave(null, 'open-yard'), [part('tube', 6, 6, 10, 6), part('stick', 10, 3, 10, 6)]), stream(3))
    expect(game.frame.firm).toEqual([true, true])
    setDown(game, 8, 6.2)
    expect(game.trolley.at).toEqual({ x: 8, under: false })
    expect(game.trolleyPlace()![1]).toBeCloseTo(6, 1)
    steps(game, 1.5); game.takeVoices()
    // Plucked, the tube only hoots; turned (a second tap while it rings), it rolls.
    tapAt(game, 9.5, 6.05)
    expect(game.trolley.at).not.toBeNull()
    tapAt(game, 9.5, 6.05)
    expect(game.trolley.at).toBeNull()
    expect(game.trolleyFell).not.toBeNull()
    expect(game.takeVoices().some((voice) => same(voice, plop))).toBe(true)
    expect(game.bridge).toHaveLength(2)
  })

  it('a thread whirls when it is turned, and the trolley hung on one of its pins swings', () => {
    // A stick up from the far lip and a thread down from the cliff meet at a pin in the air.
    const game = new Game(edit(freshSave(null, 'open-yard'), [part('stick', 18, 6, 17, 8), part('thread', 19, 11, 17, 8)]), stream(2))
    expect(game.frame.firm).toEqual([true, true])
    setDown(game, 17.1, 7.9)
    expect(game.trolley.at).toEqual({ pin: [17, 8] })
    steps(game, 25)
    expect(game.swing).toBe(Infinity)
    const mid: [number, number] = [18.02, 9.5]
    tapAt(game, ...mid)
    expect(game.swing).toBe(Infinity)
    tapAt(game, ...mid)
    expect(game.swing).toBe(0)
  })

  it('a lone part on one pin, turned, swings right round like a clock hand, ticking, and hangs straight down again', () => {
    const game = new Game(freshSave(null, 'open-yard'), stream(5)), [lx, ly] = game.at.left
    pile(game, 'stick')
    drag(game, [lx, ly], [lx + 2, ly + 2])
    steps(game, 6); game.takeVoices()
    expect(game.rest[0].how).toBe('hangs')
    const hung = game.drawn()[0]
    // A tap rattles it; a second tap while it rings turns it.
    tapAt(game, lx, ly)
    expect(game.takeVoices().some((voice) => same(voice, pinSwing))).toBe(false)
    tapAt(game, lx, ly)
    expect(game.takeVoices().some((voice) => same(voice, pinSwing))).toBe(true)
    let turned = 0, last = game.moving[0].turn.at, ticks = 0
    for (let i = 0; i < 60 * 8; i++) { game.step(1 / 60); turned += Math.abs(game.moving[0].turn.at - last); last = game.moving[0].turn.at; ticks += game.takeVoices().length }
    expect(turned).toBeGreaterThan(1.2)
    expect(ticks).toBeGreaterThanOrEqual(3)
    // And it hangs where it hung.
    const again = game.drawn()[0]
    expect(Math.hypot(again.a[0] - hung.a[0], again.a[1] - hung.a[1]) + Math.hypot(again.b[0] - hung.b[0], again.b[1] - hung.b[1])).toBeLessThan(0.15)
  })

  it('a traced design that would give under the load is shown giving: under the trolley, and under a vehicle from where it would have gone', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), b = paper(game)
    // The tracing is of the plank laid flat; the bridge on the board is the plank on edge.
    game.save = edit(game.save, CROSSINGS['plank-gap'].map((one) => ({ ...one, turned: false })))
    const flat = new Game(game.save, stream(2))
    tapAt(flat, (b.x0 + b.x1) / 2, TRAY.top - TRAY.tall + 0.3)
    tapAt(flat, 12.5, 6.1); steps(flat, 0.2); tapAt(flat, 12.5, 6.1)
    expect(flat.bridge[0].turned).toBe(true)
    tapAt(flat, b.x0 + 0.4, TRAY.top - 0.4)
    expect(flat.laidTracing).toBe(0)
    expect(flat.tracingGave).toBeNull()
    // Three weights: the plank on edge holds them, the traced flat plank would not.
    tapAt(flat, (cart(flat).x0 + cart(flat).x1) / 2, TRAY.top - 1); tapAt(flat, (cart(flat).x0 + cart(flat).x1) / 2, TRAY.top - 1)
    setDown(flat, 12, 6.2)
    expect(flat.trolley.at).not.toBeNull()
    expect(flat.tracingGave).toBe(0)
    // Its second line still lies under the load, and lower than the bridge's.
    expect(Math.min(...flat.bend(0, true).map((point) => point.off[1]))).toBeLessThan(Math.min(...flat.bend(0).map((point) => point.off[1])) - 0.05)
    // Under the van: the bridge crosses, and the tracing's line breaks where the flat plank would have.
    tapAt(flat, waitAt(flat.at, 0) - 0.4, 7)
    expect(flat.tracingGave).toBeNull()
    let gave = false
    for (let i = 0; i < 60 * 20 && flat.drive; i++) { flat.step(1 / 60); gave = gave || flat.tracingGave === 0 }
    expect(flat.show.kind).toBe('crossing')
    expect(gave).toBe(true)
  })

  it('the neat way owed after a crossing is not lost when the game is put away in the middle of that crossing', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    send(game)
    expect(game.show.kind).toBe('crossing')
    expect(game.save.shown).toEqual([])
    // Put away now: what is saved has the crossing and not the showing.
    const back = new Game(deserialize(stored(game), null), stream(1))
    expect(back.show.kind).toBeNull()
    expect(back.takeVoices()).toEqual([])
    back.step(1 / 60)
    expect(back.chief.act).toBe('shows')
    expect(back.showing).toEqual({ idea: 'profile', failure: null })
    expect(back.save.shown).toEqual(['profile'])
    expect(back.takeUrgent()).toBe(true)
    // Opened again after that, it is not shown a second time.
    const later = new Game(deserialize(stored(back), null), stream(1))
    steps(later, 1)
    expect(later.chief.act).not.toBe('shows')
    // A sheet whose cycle ended badly owes nothing by this rule.
    const lost = new Game({ ...freshSave(null), finished: true, tries: JUDGE.badly, next: { site: 'plank-gap', variant: 1 } }, stream(1))
    steps(lost, 1)
    expect(lost.chief.act).not.toBe('shows')
  })
})

describe('what the third reading found the sheet promises', () => {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const paper = (game: Game) => tools(game.at).find((t) => t.tool === 'tracing')!
  const cart = (game: Game) => tools(game.at).find((t) => t.tool === 'trolley')!

  it('the trolley is run over the bridge under the finger: the deck lies under it at each place, and lifted off or let go of in the middle of it, it is where it should be', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), b = cart(game)
    game.takeVoices()
    game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(11, 6.3)
    expect(game.trolley.at).toEqual({ x: 11, under: false })
    expect(game.takeVoices().length).toBeGreaterThan(0)
    const at11 = game.answer.moved(game.frame.at.get('12,6')!)[1]
    game.dragMove(12, 6.3)
    expect(game.trolley.at).toEqual({ x: 12, under: false })
    // In the middle the plank is lower than with the trolley near its end.
    expect(game.answer.moved(game.frame.at.get('12,6')!)[1]).toBeLessThan(at11)
    expect(game.hand).toMatchObject({ what: 'trolley', ran: 1 })
    // Lifted well off the deck it is in the hand again, and the plank lies with nothing on it.
    game.dragMove(12, 9)
    expect(game.trolley.at).toBeNull()
    game.dragMove(13, 6.2)
    expect(game.trolley.at).toEqual({ x: 13, under: false })
    // Put away now, it is back where the finger took it from: the tray.
    game.putAway()
    expect(game.hand).toBeNull()
    expect(game.trolley.at).toBeNull()
    // Let go of on the deck, it stays, and trundles to the lowest point.
    game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(11, 6.3); game.dragEnd()
    expect(game.trolley.at).toEqual({ x: 12, under: false })
  })

  it('where the traced design has no way under the trolley, that is shown, and not a design that looks the stiffer', () => {
    // On the sheet with the rock: the traced design is the first plank on its prop and no further; the bridge goes right across.
    const onRock = (bridge: typeof CROSSINGS['rock-prop']) => edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'rock-prop' }] }, bridge)
    const whole = CROSSINGS['rock-prop'], rock = site('rock-prop', 0).left[0] + 4
    const half = whole.filter((one) => Math.max(one.a[0], one.b[0]) <= rock)
    expect(half.length).toBeGreaterThan(0)
    expect(half.length).toBeLessThan(whole.length)
    const short = new Game(onRock(half), stream(2)), t = paper(short)
    expect(short.frame.firm.every(Boolean)).toBe(true)
    tapAt(short, (t.x0 + t.x1) / 2, TRAY.top - TRAY.tall + 0.3)
    const game = new Game(edit(short.save, whole), stream(2)), b = cart(game)
    tapAt(game, t.x0 + 0.4, TRAY.top - 0.4)
    expect(game.laidTracing).toBe(0)
    expect(game.tracingMisses).toBe(false)
    game.press((b.x0 + b.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(rock + 1.5, 6.3)
    expect(game.trolley.at).toEqual({ x: rock + 1.5, under: false })
    // The traced design stops at the rock: nothing of it is under the trolley beyond.
    expect(game.tracingMisses).toBe(true)
    game.dragMove(rock - 2, 6.3)
    expect(game.trolley.at).toEqual({ x: rock - 2, under: false })
    expect(game.tracingMisses).toBe(false)
    game.dragEnd()
  })

  it('the chief stands on the model it has built: its hop takes its feet to the top of that idea\'s model', () => {
    for (const idea of Object.keys(MODEL_TOP)) {
      const [across, up] = perchOn(idea)
      // Inside the model's width, which begins a cell and a half from its feet, and at the model's own height.
      expect(across * MODEL_PLACE.chief).toBeGreaterThan(MODEL_PLACE.from)
      expect(across * MODEL_PLACE.chief).toBeLessThan(MODEL_PLACE.from + 2.1 * MODEL_PLACE.unit)
      expect(up * MODEL_PLACE.chief).toBeCloseTo(MODEL_TOP[idea][1] * MODEL_PLACE.unit)
      expect(up * MODEL_PLACE.chief).toBeLessThan(1.9)
    }
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game); steps(game, 6); send(game); steps(game, 6)
    expect(game.chief.act).toBe('shows')
    let stood = false
    for (let i = 0; i < 60 * 9 && game.chief.act === 'shows'; i++) {
      game.step(1 / 60)
      if (game.chief.pose.perch > 0.999) {
        stood = true
        expect(-game.chief.pose.hopX).toBeCloseTo(perchOn('profile')[0], 6)
        expect(game.chief.pose.hopY).toBeCloseTo(perchOn('profile')[1], 2)
        // On it, once it has landed, its neck is bent down to look at it.
        if (game.chief.progress > 0.89 && game.chief.progress < 0.93) expect(game.chief.pose.neck).toBeGreaterThan(0.5)
      }
    }
    expect(stood).toBe(true)
    // Back on its ledge when the showing is over.
    steps(game, 0.2)
    expect(Math.abs(game.chief.pose.hopX)).toBeLessThan(1e-6)
  })

  it('put away in the middle of a run, the vehicle stands at the near bank again and the bridge is as built: a run is not saved', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    const before = JSON.stringify(stored(game))
    game.takeChange(); game.takeUrgent()
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    steps(game, 1.2)
    expect(game.drive).not.toBeNull()
    game.putAway()
    expect(game.drive).toBeNull()
    expect(game.show.kind).toBeNull()
    expect(game.waiting).toEqual(['post-van'])
    expect(game.crew.beaver.act).not.toBe('brace')
    expect(JSON.stringify(stored(game))).toBe(before)
    expect(game.takeUrgent()).toBe(false)
    // And the plank lies as built, at once.
    const ends = game.drawn()[0]
    expect(ends.a[1]).toBeCloseTo(game.rest[0].a[1], 6)
    // A scene, whose outcome was saved when it started, goes on where it was.
    send(game)
    expect(game.show.kind).toBe('crossing')
    game.putAway()
    expect(game.show.kind).toBe('crossing')
  })

  it('opened again, the pile the child was building from is the one picked', () => {
    const game = new Game(freshSave(null, 'rock-prop'), stream(2))
    expect(game.selected).toBe('plank')
    const sticks = bays(game.at).find((bay) => bay.kind === 'stick')!
    tapAt(game, (sticks.x0 + sticks.x1) / 2, TRAY.top - 1)
    drag(game, [12, 3], [12, 5])
    expect(game.bridge[0].kind).toBe('stick')
    expect(new Game(deserialize(stored(game), null), stream(1)).selected).toBe('stick')
    // With nothing laid, or none of that kind left, it is the first pile that has a part in it.
    expect(new Game(freshSave(null, 'rock-prop'), stream(1)).selected).toBe('plank')
    void same
  })
})

describe('what the fourth reading found the sheet promises', () => {
  it('the job vehicle crossing home rubs the pencil ring out, as its crossing outward does; another vehicle\'s crossing home leaves it', () => {
    const ring = { part: 0, spot: [12, 6] as const }
    const across = crossed(edit(freshSave(null), CROSSINGS['plank-gap']), 'post-van')
    const game = new Game({ ...across, sheets: [{ ...across.sheets[0], ring }] }, stream(2))
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ homeward: true, vehicle: 'post-van' })
    for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60)
    expect(game.show.kind).toBe('crossing')
    expect(game.save.sheets[0].ring).toBeNull()
    expect(game.fading).toEqual(ring)
    steps(game, 9)
    expect(game.fading).toBeNull()
    expect(game.save.waiting).toContain('post-van')
    // The jelly truck is not this sheet's own: home it goes, and the ring stays.
    const both = crossed(crossed(edit(freshSave(null), CROSSINGS['plank-gap']), 'post-van'), 'jelly-truck')
    expect(unringed({ ...both, sheets: [{ ...both.sheets[0], ring }] }, 'jelly-truck').sheets[0].ring).toEqual(ring)
    expect(unringed({ ...both, sheets: [{ ...both.sheets[0], ring }] }, 'post-van').sheets[0].ring).toBeNull()
    expect(unringed(both, 'post-van')).toBe(both)
  })

  it('a give on the way home ends with the pencil ring on the spot too', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    send(game); steps(game, 16)
    expect(game.across).toEqual(['post-van'])
    // The plank is laid flat again while the van is parked across, and the van is sent home over it.
    tapAt(game, 12.5, 6.1); steps(game, 0.2); tapAt(game, 12.5, 6.1); steps(game, 1)
    expect(game.bridge[0].turned).toBe(false)
    expect(game.save.sheets[0].ring).toBeNull()
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    expect(game.drive).toMatchObject({ homeward: true })
    for (let i = 0; i < 60 * 20 && game.drive; i++) game.step(1 / 60)
    expect(game.show.kind).toBe('give')
    expect(game.save.sheets[0].ring).toMatchObject({ part: 0 })
    steps(game, 7)
    expect(game.save.sheets[0].ring).toMatchObject({ part: 0 })
    expect(game.save.waiting).toContain('post-van')
    expect(game.save.tries).toBe(0)
  })

  it('a tap anywhere on a part plucks it, and a second tap while it rings turns it: on a plank, at a grid point along it as well as between two', () => {
    for (const x of [11, 11.5, 12, 12.3, 13]) {
      const game = fresh()
      drag(game, [10, 6], [14, 6])
      steps(game, 1.5); game.takeVoices()
      tapAt(game, x, 6.02)
      expect(game.bridge[0].turned, `one tap at ${x}`).toBe(false)
      expect(game.takeVoices().length).toBeGreaterThan(0)
      steps(game, 0.2)
      tapAt(game, x, 6.02)
      expect(game.bridge[0].turned, `two taps at ${x}`).toBe(true)
    }
    // At a pin where a part ends, a tap is the pin's: the parts on it rattle and nothing turns.
    const joint = fresh()
    drag(joint, [10, 6], [14, 6])
    steps(joint, 1.5)
    tapAt(joint, 10, 6); steps(joint, 0.2); tapAt(joint, 10, 6)
    expect(joint.bridge[0].turned).toBe(false)
    // And a drag from a grid point along a plank still lays a part from there.
    const laid = fresh()
    drag(laid, [10, 6], [14, 6])
    drag(laid, [12, 6], [12, 8])
    expect(laid.bridge).toHaveLength(2)
  })

  it('a change that changes nothing leaves the bridge as it stands: a stick turned on a sheet from the rack does not send its vehicle back over the gap', () => {
    const start = edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'first-triangle' }] }, CROSSINGS['first-triangle'])
    const game = new Game(start, stream(2))
    send(game); steps(game, 16)
    expect(game.save.sheets[0].crossed).toContain('post-van')
    const stick = game.bridge.findIndex((one) => one.kind === 'stick'), ends = game.drawn()[stick], mid: [number, number] = [(ends.a[0] + ends.b[0]) / 2, (ends.a[1] + ends.b[1]) / 2]
    game.takeChange()
    tapAt(game, ...mid); steps(game, 0.2); tapAt(game, ...mid)
    expect(game.turned[stick]).toBeLessThan(1)
    expect(game.save.sheets[0].crossed).toContain('post-van')
    expect(game.across).toContain('post-van')
    // A plank turned is a change: nobody has crossed the bridge as it now stands.
    const plank = game.bridge.findIndex((one) => one.kind === 'plank'), p = game.drawn()[plank]
    steps(game, 1.5)
    tapAt(game, (p.a[0] * 3 + p.b[0]) / 4 + 0.02, (p.a[1] * 3 + p.b[1]) / 4 + 0.05); steps(game, 0.2); tapAt(game, (p.a[0] * 3 + p.b[0]) / 4 + 0.02, (p.a[1] * 3 + p.b[1]) / 4 + 0.05)
    expect(game.save.sheets[0].crossed).toEqual([])
  })

  it('put away in the middle of a run home, the vehicle stands at the near bank', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2))
    send(game); steps(game, 16)
    tapAt(game, parkAt(game.at, 1, 0) - 0.4, 7)
    steps(game, 0.8)
    expect(game.drive).toMatchObject({ homeward: true })
    game.putAway()
    expect(game.drive).toBeNull()
    expect(game.across).not.toContain('post-van')
    expect(game.waiting).toContain('post-van')
    expect(game.takeUrgent()).toBe(true)
  })
})

describe('what the fifth reading found the sheet promises', () => {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

  it('a build that folds under a load is seen folding: nothing leaves the sheet, the slack stay hangs, and the bridge goes back as built', () => {
    // A deck on a prop, with a stay down to the river bed at its far end, which goes slack as the truck comes on.
    const bridge = [part('plank', 8, 6, 10, 6, true), part('plank', 10, 6, 14, 6, true), part('stick', 12, 3, 12, 6), part('thread', 14, 6, 14, 0)]
    const game = new Game(edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'rock-prop' }], waiting: ['jelly-truck'] }, bridge), stream(2))
    tapAt(game, waitAt(game.at, 0) - 0.4, 7)
    expect(game.drive?.run.ending.kind).toBe('folds')
    const onSheet = () => { for (const ends of game.drawn()) for (const n of [...ends.a, ...ends.b]) { expect(Number.isFinite(n)).toBe(true); expect(Math.abs(n)).toBeLessThan(40) } }
    for (let i = 0; i < 60 * 20 && game.drive; i++) { game.step(1 / 60); onSheet() }
    expect(game.show.kind).toBe('give')
    // The stay hangs slack, and the deck it held is no longer where it was built: it folds down from there.
    expect(game.rest[3].slack).toBe(true)
    let lowest = 6
    for (let i = 0; i < 60 * 3; i++) { game.step(1 / 60); onSheet(); lowest = Math.min(lowest, game.drawn()[1].b[1]) }
    expect(lowest).toBeLessThan(5.5)
    steps(game, 4)
    expect(game.show.kind).toBeNull()
    expect(game.drawn()[1].b[1]).toBeGreaterThan(5.8)
  })

  it('the threads of a bridge, plucked from longest to shortest, play a scale note by note, and it starts again when the order breaks', () => {
    const game = hung()
    const mid = (i: number) => { const e = game.drawn()[i]; return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] as const }
    const long = (i: number) => Math.hypot(game.bridge[i].b[0] - game.bridge[i].a[0], game.bridge[i].b[1] - game.bridge[i].a[1])
    const byLength = [4, 5, 6].sort((i, j) => long(j) - long(i))
    const note = (i: number) => { steps(game, 1.2); game.takeVoices(); tapAt(game, ...mid(i)); const heard = game.takeVoices(); return heard.some((voice) => same(voice, scaleStart)) ? 'start' : [0, 1, 2, 3, 4, 5, 6, 7].find((step) => heard.some((voice) => same(voice, scaleNote(step)))) }
    // One thread plucked is only itself, so nothing hints at the secret; the second sounds the scale's first two notes, and each after it the next.
    expect([note(byLength[0]), note(byLength[1]), note(byLength[2])]).toEqual([undefined, 'start', 2])
    // A longer one after a shorter breaks the order: it is only itself again, and the scale starts over after it.
    expect(note(byLength[0])).toBeUndefined()
    expect(note(byLength[2])).toBe('start')
    // And plucked by itself again and again, a thread never sounds a note of the scale.
    for (let again = 0; again < 3; again++) expect(note(byLength[1])).toBeUndefined()
  })

  it('a slack thread only flops: it sounds no note of the scale, and a run of notes ends at it', () => {
    // Two stays hold the deck, and a longer thread from the cliff to the far bank holds nothing.
    const game = hung([...HUNG.slice(0, 4), part('thread', 19, 11, 22, 3), HUNG[5], HUNG[6]])
    expect(game.rest.slice(4).map((rest) => rest.slack)).toEqual([true, false, false])
    const mid = (i: number) => { const e = game.drawn()[i]; return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] as const }
    const heard = (i: number) => { steps(game, 1.2); game.takeVoices(); tapAt(game, ...mid(i)); return game.takeVoices() }
    const scale = (voices: unknown[]) => voices.some((voice) => same(voice, scaleStart) || [0, 1, 2, 3, 4, 5, 6, 7].some((step) => same(voice, scaleNote(step))))
    // The slack one by itself: its flop and nothing else.
    const flop = heard(4)
    expect(flop.some((voice) => same(voice, pluckVoice('thread', 0, 1, true)))).toBe(true)
    expect(scale(flop)).toBe(false)
    // The longer stay, then the slack one, then the shorter stay: the run ended at the flop, so the shorter one is only itself.
    expect(scale(heard(5))).toBe(false)
    expect(scale(heard(4))).toBe(false)
    expect(scale(heard(6))).toBe(false)
    expect(game.chief.act).not.toBe('taps-and-listens')
    // The two that hold something, from the longer to the shorter with no flop between: the scale, and the chief taps along.
    expect(scale(heard(5))).toBe(false)
    expect(scale(heard(6))).toBe(true)
    expect(game.chief.act).toBe('taps-and-listens')
  })

  it('flipped, the trolley rolls to the lowest point as the deck lies now', () => {
    const game = new Game(edit(freshSave(null), CROSSINGS['plank-gap']), stream(2)), cart = tools(game.at).find((t) => t.tool === 'trolley')!
    game.press((cart.x0 + cart.x1) / 2, TRAY.top - 1); game.dragStart(); game.dragMove(11, 6.3); game.dragEnd()
    const low = lowPoint(game.at, game.bridge, 11, 1)!
    expect(game.trolley.at).toEqual({ x: low, under: false })
    steps(game, 1.5); game.takeVoices()
    const place = game.trolleyPlace()!
    tapAt(game, place[0], place[1] + 0.3); steps(game, 0.1); tapAt(game, place[0], place[1] + 0.3)
    expect(game.takeVoices().some((voice) => same(voice, trolleyFlip))).toBe(true)
    expect(game.trolley.at).toEqual({ x: lowPoint(game.at, game.bridge, low, 1)!, under: true })
    // It rolls there from where it was: the view reads that from when it was set rolling.
    expect(game.trolleyRolled).toMatchObject({ from: low })
  })

  it('whatever one thing the chief\'s two models differ in after the swap, the difference shows: they dip by different amounts', () => {
    for (const what of ['added', 'left-out', 'moved', 'turned', 'changed'] as const) for (const kind of ['plank', 'stick', 'tube', 'thread'] as const) {
      const [first, second] = modelSides({ what, kind, at: [0, 0] }), [same1] = modelSides({ what: 'added', kind: 'stick', at: [0, 0] })
      // With the other side the same in both, the dips differ.
      expect(Math.abs(modelDip(first, same1) - modelDip(second, same1)), `${what} ${kind}`).toBeGreaterThan(0.02)
    }
  })
})
