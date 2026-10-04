import { describe, expect, it } from 'vitest'
import { IdleLadder } from './guidance'
import { stream, type Pen } from './look'
import { CROSSINGS, part } from './bridges.fixture'
import { RAIL_TILT, givePose, reactPose, waitPose, ROUND } from './acts'
import { IDLES, REACTS, crewPose, type CrewAct } from './crew'
import { crewFigure } from './crewfig'
import { vehicle } from './fleet'
import { MODEL, PULL } from './game'
import { ROLL, TRAY, bays, tools, waitAt } from './layout'
import { edit, freshSave } from './save'
import { Game } from './game'
import { View, demoMove, hatSwing } from './view'
import { canPin, isFooting } from './sites'

/** A pen that draws nothing and keeps every call with its numbers, and a canvas that hands out such pens. */
function recording() {
  const calls: { name: string; args: unknown[] }[] = []
  const pen = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) => {
      if (name === 'createRadialGradient') return () => ({ addColorStop: () => {} })
      if (name === 'measureText') return (text: string) => ({ width: 10 * text.length })
      if (name in store) return store[name]
      return (...args: unknown[]) => { calls.push({ name, args }) }
    },
    set: (store, name: string, value) => { store[name] = value; return true },
  }) as unknown as Pen
  const canvas = () => ({ width: 0, height: 0, getContext: () => pen }) as unknown as HTMLCanvasElement
  return { pen, calls, canvas }
}

const built = () => {
  const toy = new Game(freshSave(null, 'open-yard'), stream(5))
  const drag = (kind: number, a: [number, number], b: [number, number]) => { toy.press(5 + (14 * (kind + 0.5)) / 4, -2.3); toy.tap(); toy.press(...a); toy.dragStart(); toy.dragMove(...b); toy.dragEnd() }
  drag(0, [6, 6], [10, 6]); drag(2, [10, 3], [10, 6]); drag(3, [19, 11], [14, 6]); drag(1, [14, 6], [14, 4]); drag(1, [20, 6], [22, 8])
  return toy
}
const numbers = (calls: { args: unknown[] }[]) => calls.flatMap((call) => call.args.filter((arg): arg is number => typeof arg === 'number'))

describe('the toy drawn', () => {
  it('every number it hands the canvas is a real number, at rest, in motion, mid-pluck, mid-turn and in the hand', () => {
    const toy = built(), { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    const ladder = new IdleLadder(0)
    const frame = (seconds: number) => { calls.length = 0; const drawn = view.draw(pen, toy, ladder.update(seconds)); for (const n of numbers(calls)) expect(Number.isFinite(n)).toBe(true); return drawn }
    expect(frame(0)).toBeGreaterThan(20)
    for (let i = 0; i < 30; i++) { toy.step(1 / 60); frame(i / 60) }
    toy.press(8.5, 6.1); toy.tap(); toy.step(0.05); frame(1)
    toy.press(8.5, 6.1); toy.tap(); toy.step(0.05); frame(1.1)
    toy.press(8.5, 6.1); toy.dragStart(); toy.dragMove(9, 9); frame(1.2); toy.dragEnd(); toy.step(0.1); frame(1.3)
    toy.press(21, 9); toy.dragStart(); toy.dragMove(22.3, 10.2); frame(1.4); toy.dragEnd()
    // Idle long enough for the glow and both kinds of demonstration.
    for (const seconds of [4, 6, 7, 19, 21]) { toy.step(0.1); frame(seconds) }
    // The only text it ever draws is a whole number, through the symbols module: the count beside a vehicle's crates.
    const texts = calls.filter((call) => /Text/.test(call.name))
    expect(texts.length).toBeGreaterThan(0)
    for (const call of texts) expect(String(call.args[0])).toMatch(/^[0-9]+$/)
  })

  it('stamps the still sheet once a frame and paints it once for a size', () => {
    const toy = built(), { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    view.draw(pen, toy, null)
    const first = calls.length
    calls.length = 0
    view.draw(pen, toy, null)
    // The second frame is far cheaper than the first, which painted the sheet and made every sprite.
    expect(calls.length).toBeLessThan(first / 3)
    view.size(1180, 820, 2, true)
    calls.length = 0
    view.draw(pen, toy, null)
    expect(calls.length).toBeLessThan(first / 3)
    view.size(1180, 820, 1.5, false)
    calls.length = 0
    view.draw(pen, toy, null)
    expect(calls.length).toBeGreaterThan(first / 3)
  })

  it('keeps a frame inside its budget: one full-surface stamp, and a bounded count of calls for the fullest bridge', () => {
    const toy = new Game(freshSave(null, 'open-yard'), stream(5))
    // Every part of the yard's kit laid, wherever it will go.
    const lay = (kind: number, a: [number, number], b: [number, number]) => { toy.press(5 + (14 * (kind + 0.5)) / 4, -2.3); toy.tap(); toy.press(...a); toy.dragStart(); toy.dragMove(...b); toy.dragEnd() }
    for (let i = 0; i < 5; i++) lay(0, [6 + 2 * i, 8], [8 + 2 * i, 8])
    for (let i = 0; i < 16; i++) lay(1, [4 + i, 9 + (i % 3)], [5 + i, 10 + (i % 3)])
    for (let i = 0; i < 4; i++) lay(2, [6 + 3 * i, 12], [8 + 3 * i, 13])
    for (let i = 0; i < 8; i++) lay(3, [5 + 2 * i, 13], [6 + 2 * i, 14])
    expect(toy.bridge).toHaveLength(33)
    const { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    view.draw(pen, toy, null)
    for (let i = 0; i < 20; i++) toy.step(1 / 60)
    calls.length = 0
    const drawn = view.draw(pen, toy, new IdleLadder(0).update(6))
    // The whole still sheet is one picture stamped once; every other picture drawn is a small sprite.
    const stamps = calls.filter((call) => call.name === 'drawImage' && call.args.length === 3)
    expect(stamps).toHaveLength(1)
    expect(drawn).toBeLessThan(160)
    // Counted calls on the canvas, not time: the same on any machine.
    expect(calls.length).toBeLessThan(4000)
  })

  it('draws every state of the game with real numbers: a run, the give, the crossing, the trolley, a tracing, both showings, the barge', () => {
    const { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    const ladder = new IdleLadder(0)
    let clock = 0
    const play = (game: Game, seconds: number) => {
      for (let i = 0; i < seconds * 30; i++) {
        game.step(1 / 30); clock += 1 / 30
        calls.length = 0
        view.draw(pen, game, ladder.update(clock))
        for (const n of numbers(calls)) if (!Number.isFinite(n)) throw new Error(`a number that is not real at ${clock.toFixed(2)} s`)
      }
    }
    const tapAt = (game: Game, x: number, y: number) => { game.press(x, y); game.tap() }
    const drag = (game: Game, a: [number, number], b: [number, number]) => { game.press(...a); game.dragStart(); game.dragMove(...b); game.dragEnd() }
    const game = new Game(freshSave(null), stream(5))
    drag(game, [10, 6], [14, 6])
    tapAt(game, 8.8, 7); play(game, 8)
    tapAt(game, 8.8, 7); play(game, 16)
    expect(game.save.shown).toEqual(['profile'])
    tapAt(game, 12.5, 6.1); tapAt(game, 12.5, 6.1)
    const cart = tools(game.at)[0], paper = tools(game.at)[1]
    game.press((cart.x0 + cart.x1) / 2, -2.3); game.dragStart(); game.dragMove(11, 8); play(game, 0.2); game.dragMove(11, 6.2); game.dragEnd(); play(game, 1.5)
    expect(game.trolley.at).not.toBeNull()
    tapAt(game, (paper.x0 + paper.x1) / 2, -3.1); tapAt(game, paper.x0 + 0.4, -1.6); play(game, 0.5)
    expect(game.laidTracing).toBe(0)
    for (let i = 0; i < 5; i++) tapAt(game, (cart.x0 + cart.x1) / 2, -2.3)
    play(game, 1)
    tapAt(game, 8.8, 7); play(game, 14)
    expect(game.save.finished).toBe(true)
    // A sheet where the barge passes, crossed with a prop in its channel.
    const river = new Game({ ...edit({ ...freshSave(null), sheets: [{ ...freshSave(null).sheets[0], site: 'barge-below' }] }, [...CROSSINGS['barge-below'], { kind: 'tube', a: [14, 1], b: [14, 6], turned: false }]) }, stream(6))
    tapAt(river, waitAt(river.at, 0) - 0.4, 7); play(river, 16)
    expect(river.bargeTook).toMatchObject({ mood: 'dislike' })
    expect(river.show.kind).toBeNull()
  })

  it('draws what the sheet says a child sees with real numbers: the lean, the V of a thread, the rail, the model pressed and plucked, the sheet leaving the rack, the driver on foot', () => {
    const { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    const ladder = new IdleLadder(0)
    let clock = 0
    const play = (game: Game, seconds: number) => {
      let most = 0
      for (let i = 0; i < seconds * 30; i++) {
        game.step(1 / 30); clock += 1 / 30
        calls.length = 0
        view.draw(pen, game, ladder.update(clock))
        for (const n of numbers(calls)) if (!Number.isFinite(n)) throw new Error(`a number that is not real at ${clock.toFixed(2)} s`)
        most = Math.max(most, calls.length)
      }
      return most
    }
    const tapAt = (game: Game, x: number, y: number) => { game.press(x, y); game.tap() }
    const drag = (game: Game, a: [number, number], b: [number, number]) => { game.press(...a); game.dragStart(); game.dragMove(...b); game.dragEnd() }
    const pile = (game: Game, kind: string) => { const bay = bays(game.at).find((b) => b.kind === kind)!; tapAt(game, (bay.x0 + bay.x1) / 2, TRAY.top - 1) }
    // A thread from lip to lip, and a vehicle sent onto it: the V, the water, the paddle home.
    const rope = new Game(freshSave(null, 'high-thread'), stream(4))
    pile(rope, 'thread'); drag(rope, [8, 6], [16, 6])
    tapAt(rope, waitAt(rope.at, 0) - 0.4, 7); play(rope, 1.2)
    expect(rope.dipPoint()).not.toBeNull()
    play(rope, 6)
    // A rail of short sticks held from the banks, ridden by the van; and a part being laid beside what is built.
    const rail = new Game(edit(freshSave(null), [part('stick', 10, 6, 11, 6), part('stick', 11, 6, 12, 6), part('stick', 12, 6, 13, 6), part('stick', 13, 6, 14, 6), part('stick', 11, 6, 10, 5), part('stick', 12, 6, 10, 4), part('stick', 13, 6, 14, 5)]), stream(4))
    rail.press(14, 6); rail.dragStart(); rail.dragMove(13.2, 8.1); play(rail, 0.5)
    expect(rail.leaning).toBeGreaterThan(0.9)
    rail.dragEnd(); play(rail, 1)
    tapAt(rail, waitAt(rail.at, 0) - 0.4, 7); play(rail, 1)
    expect(rail.seatNow()?.rail).toBeGreaterThan(0)
    play(rail, 12)
    expect(rail.across).toContain('post-van')
    // The rack full, and a seventh sheet unrolled.
    const base = freshSave(null), full = new Game({ ...base, sheets: Array.from({ length: 6 }, () => ({ ...base.sheets[0] })), on: 5, next: { site: 'rock-prop', variant: 0 } }, stream(3))
    tapAt(full, ROLL.x - 0.3, full.at.right[1] + 1.5)
    expect(full.slidOff).toBe(0)
    const leaving = play(full, 0.3), gone = (play(full, 1.5), play(full, 0.2))
    expect(leaving).toBeGreaterThan(gone)
    // The model in the margin, pressed and then plucked.
    const shown = new Game({ ...freshSave(null), shown: ['profile'] }, stream(5))
    expect(shown.marginModel).toBe('profile')
    shown.press((MODEL.x0 + MODEL.x1) / 2, (MODEL.y0 + MODEL.y1) / 2); play(shown, 0.2); shown.tap(); play(shown, 1)
    // The van's driver, out of the cab and back: more is drawn while it is on foot.
    const count = (t: number) => { calls.length = 0; vehicle(pen, 'post-van', 48, reactPose('post-van', { mood: 'dislike', act: 'x', amount: 1, parts: [] }, t), 0, stream(1)); for (const n of numbers(calls)) expect(Number.isFinite(n)).toBe(true); return calls.length }
    for (let t = 0; t <= 1; t += 0.02) count(t)
    expect(count(0.8)).toBeGreaterThan(count(0.3))
    expect(count(1)).toBe(count(0.3))
    // On a rail the back wheels come off the stick and never go under it.
    expect(RAIL_TILT).toBeGreaterThan(0)
    expect(RAIL_TILT).toBeLessThan(0.2)
  })

  it('draws the look pass with real numbers and no text: the crew in every act, every driver\'s face, a splash over a vehicle, marks, and a poked crew', () => {
    const { pen, calls, canvas } = recording()
    const clean = (what: string) => {
      for (const n of numbers(calls)) if (!Number.isFinite(n)) throw new Error(`a number that is not real in ${what}`)
      // The only text ever drawn is a whole number beside a vehicle's crates or the trolley's weights, through the symbols module.
      const text = calls.filter((call) => call.name === 'fillText' || call.name === 'strokeText')
      for (const call of text) expect(String(call.args[0]), what).toMatch(/^[1-6]$/)
      return text.length
    }
    for (const who of ['beaver', 'mole'] as const) for (const act of [...Object.keys(IDLES[who]), ...Object.keys(REACTS[who]), 'rest', 'brace'] as CrewAct[]) for (let t = 0; t <= 1.0001; t += 0.1) {
      calls.length = 0
      crewFigure(pen, who, 300, 500, 53, { ...crewPose(who, act, t), lookX: 0.7, lookY: -0.4 }, stream(41))
      expect(calls.length).toBeGreaterThan(40)
      expect(clean(`${who} ${act} ${t}`)).toBe(0)
    }
    for (const id of ['post-van', 'jelly-truck', 'piano-mover', 'giraffe-bus', 'caterpillar-bus'] as const) for (const pose of [waitPose(id, ROUND[id] * 0.36, true), givePose(id, 1, { fall: 0.5, paddle: 0, climb: 0, shake: 0 }), givePose(id, 1, { fall: 1, paddle: 0.5, climb: 0, shake: 0 }), givePose(id, 1, { fall: 1, paddle: 1, climb: 1, shake: 0.5 })]) {
      calls.length = 0
      vehicle(pen, id, 48, pose, 1.3, stream(1))
      clean(id)
    }
    // The running game: a give with its splash, marks from touches, and both crew poked.
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    const game = new Game(freshSave(null), stream(5))
    const frame = (seconds: number) => { let most = 0; for (let i = 0; i < seconds * 30; i++) { game.step(1 / 30); calls.length = 0; most = Math.max(most, view.draw(pen, game, null)); clean('the game') } return most }
    const rest = frame(1)
    game.press(10, 6); game.dragStart(); game.dragMove(14, 6); game.dragEnd()
    expect(game.marks.length).toBeGreaterThan(1)
    frame(0.3)
    game.press(...game.crewAt('beaver')); game.tap(); game.press(game.crewAt('mole')[0], game.crewAt('mole')[1] + 0.5); game.tap()
    game.press(8.8, 7); game.tap()
    let withSplash = 0
    for (let i = 0; i < 30 * 7; i++) { game.step(1 / 30); calls.length = 0; const drawn = view.draw(pen, game, null); clean('the give'); if (game.splash && game.splash.since < 1) withSplash = Math.max(withSplash, drawn) }
    expect(withSplash).toBeGreaterThan(0)
    // The whole of the look pass costs a frame a few tens of things, on any sheet.
    expect(rest).toBeLessThan(40)
    expect(withSplash).toBeLessThan(50)
  })

  it('maps a touch back to the grid it draws on, at any size', () => {
    const view = new View(1, recording().canvas)
    for (const [w, h] of [[1180, 820], [820, 1180], [1366, 1024]]) {
      view.size(w, h, 2, true)
      const { cell, ox, oy } = view.plot
      const [x, y] = view.toGrid(ox + 7 * cell, oy - 3 * cell)
      expect(x).toBeCloseTo(7); expect(y).toBeCloseTo(3)
    }
  })

  it('the ghost hand shows a part laid on the far bank, away from the gap and from the chief', () => {
    const toy = built(), move = demoMove(toy.at)
    expect(move.from[0]).toBeGreaterThan(toy.at.right[0])
    expect(move.to[0]).toBeGreaterThan(toy.at.right[0])
    expect(canPin(toy.at, move.from) && canPin(toy.at, move.to)).toBe(true)
    expect(isFooting(toy.at)(move.from)).toBe(true)
  })
})

describe('what the sixth reading found, drawn', () => {
  it('a hat on a part swings when the part is turned, both ways, less and less, and hangs still again', () => {
    expect(hatSwing(Infinity)).toBe(0)
    expect(hatSwing(0)).toBe(0)
    const leans = Array.from({ length: 28 }, (_, i) => hatSwing((i + 1) * 0.05))
    expect(Math.max(...leans)).toBeGreaterThan(0.5)
    expect(Math.min(...leans)).toBeLessThan(-0.3)
    expect(Math.max(...leans.slice(14).map(Math.abs))).toBeLessThan(Math.max(...leans.slice(0, 14).map(Math.abs)))
    expect(hatSwing(1.4)).toBe(0)
  })

  it('at the free yard the one that waits is drawn rolling back with the finger, then leaving, and the next of the fleet only after it has gone', () => {
    const toy = new Game(freshSave(null, 'open-yard'), stream(5)), { pen, calls, canvas } = recording()
    const view = new View(1, canvas)
    view.size(1180, 820, 2, true)
    const frame = () => { calls.length = 0; const drawn = view.draw(pen, toy, null); for (const n of numbers(calls)) expect(Number.isFinite(n)).toBe(true); return drawn }
    // Each vehicle has its crates' numeral beside it: the van's two, the truck's three.
    const numerals = () => calls.filter((call) => call.name === 'fillText').map((call) => String(call.args[0]))
    const x = waitAt(toy.at, 0) - 0.4
    frame()
    expect(numerals().filter((n) => n === '2')).toHaveLength(1)
    toy.press(x, 7); toy.dragStart(); toy.dragMove(x - 1.5, 7)
    frame()
    expect(numerals().filter((n) => n === '2')).toHaveLength(1)
    toy.dragEnd()
    expect(toy.swap).toMatchObject({ id: 'post-van', away: true })
    // Leaving: the van still, with its two crates, and the truck with its three not yet.
    toy.step(PULL.leaves / 2)
    frame()
    expect(numerals()).toContain('2'); expect(numerals()).not.toContain('3')
    // Then the truck draws up, alone.
    toy.step(PULL.leaves / 2 + PULL.arrives / 2)
    frame()
    expect(numerals()).toContain('3')
    toy.step(PULL.arrives)
    expect(toy.swap).toBeNull()
    frame()
    expect(numerals()).toContain('3'); expect(numerals()).not.toContain('2')
  })
})

