import { describe, expect, it } from 'vitest'
import { IdleLadder } from './guidance'
import { stream, type Pen } from './look'
import { freshSave } from './save'
import { Game } from './game'
import { View, demoMove } from './view'
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
