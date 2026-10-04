import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { driverAt } from './fleet'
import { Game, MODEL, wholeArch } from './game'
import { ROLL, SLIDE_OFF, TRAY, bays, parkAt, rackAt, slideOff, tools, waitAt } from './layout'
import { stream } from './look'
import { WATER } from './pose'
import { crossingTime } from './ride'
import { deserialize, edit, freshSave, serialize } from './save'
import { isFooting, site } from './sites'
import { CHIEF } from './toy'
import { VEHICLES, trainOf } from './vehicles'
import { bargeHorn, hornEcho } from './voices'

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
    carryTrolley(changed, [10.5, 6.2])
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
    expect(game.showing).toEqual({ idea: 'profile' })
    expect(game.save.shown).toEqual(['profile'])
    expect(game.marginModel).toBe('profile')
    // It gives way to any touch, and has been given.
    tapAt(game, 3, 12)
    expect(game.chief.act).not.toBe('shows')
    send(game); steps(game, 6)
    expect(game.chief.act).not.toBe('shows')
  })

  it('a scene a touch ended owes nothing then, and the idea is still owed at the next run that calls for it', () => {
    const game = fresh()
    drag(game, [10, 6], [14, 6])
    send(game); steps(game, 6)
    send(game); steps(game, 0.5)
    tapAt(game, 3, 12)
    expect(game.save.shown).toEqual([])
    send(game); steps(game, 6)
    expect(game.save.shown).toEqual(['profile'])
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
    const yard = () => {
      const game = new Game(freshSave(null, 'open-yard'), stream(8))
      const b = (kind: number) => 5 + (14 * (kind + 0.5)) / 4
      tapAt(game, b(3), -2.3)
      // Three threads of three lengths, each from the far cliff down to the far bank, so each is held at both ends.
      drag(game, [19, 11], [18, 6]); drag(game, [19, 11], [23, 6]); drag(game, [19, 11], [22, 6])
      return game
    }
    const game = yard()
    const mid = (i: number) => { const e = game.drawn()[i]; return [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] as const }
    const pluck = (i: number) => { steps(game, 1.2); tapAt(game, ...mid(i)) }
    const byLength = [0, 1, 2].sort((i, j) => Math.hypot(game.bridge[j].b[0] - game.bridge[j].a[0], game.bridge[j].b[1] - game.bridge[j].a[1]) - Math.hypot(game.bridge[i].b[0] - game.bridge[i].a[0], game.bridge[i].b[1] - game.bridge[i].a[1]))
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
    const short = [part('stick', 7, 6, 8, 8), part('stick', 8, 8, 9, 8), part('stick', 9, 8, 10, 3)]
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
