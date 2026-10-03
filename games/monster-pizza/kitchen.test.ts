import { describe, expect, it } from 'vitest'
import { IdleLadder } from './guidance'
import { Kitchen, TOY_TUBS } from './kitchen'
import { CUSTOMER, OVEN, PIZZA, tubPlace } from './layout'
import { freshSave } from './save'
import { LIMITS, seconds } from './voices'

function play(kitchen: Kitchen, secs: number): void {
  for (let i = 0; i < secs * 60; i++) kitchen.step(1 / 60)
}

const tub = (i: number) => tubPlace(i, TOY_TUBS.length)

describe('the kitchen as a toy', () => {
  it('answers a touch on a tub in the same frame, with a sound and a piece in the hand', () => {
    const kitchen = new Kitchen(freshSave(null), 1)
    kitchen.press(tub(0).x, tub(0).y)
    expect(kitchen.sounds.length).toBe(0)
    kitchen.step(0)
    expect(kitchen.sounds.length).toBe(1)
    expect(kitchen.table.hand).not.toBeNull()
  })

  it('puts out one piece a tap, each landing a step higher, and asks for a save', () => {
    const kitchen = new Kitchen(freshSave(null), 2)
    const landings: number[] = []
    for (let i = 0; i < 4; i++) {
      kitchen.press(tub(1).x, tub(1).y)
      kitchen.tap()
      expect(kitchen.dirty).toBe('soon')
      kitchen.dirty = 'no'
      for (let f = 0; f < 40; f++) {
        kitchen.step(1 / 60)
        // The landing is the voice with two parts whose first sits on the scale.
        for (const spec of kitchen.sounds) if (spec.length === 2 && spec[0].wave === 'triangle' && spec[1].wave === 'noise' && spec[1].freq === 900) landings.push(spec[0].freq)
        kitchen.sounds.length = 0
      }
    }
    expect(kitchen.table.pieces.length).toBe(4)
    expect(landings.length).toBe(4)
    for (let i = 1; i < landings.length; i++) expect(landings[i]).toBeGreaterThan(landings[i - 1])
  })

  it('answers everything that looks touchable: the pizza, the customer and the oven', () => {
    const kitchen = new Kitchen(freshSave(null), 3)
    for (const [x, y] of [[PIZZA.x, PIZZA.y], [CUSTOMER.x, CUSTOMER.y - 120], [OVEN.x, OVEN.y]]) {
      kitchen.sounds.length = 0
      kitchen.press(x, y)
      kitchen.tap()
      kitchen.step(1 / 60)
      expect(kitchen.sounds.length, `${x},${y}`).toBeGreaterThan(0)
      for (const spec of kitchen.sounds) expect(seconds(spec)).toBeLessThanOrEqual(LIMITS.maxSeconds)
    }
  })

  it('punishes nothing: random touches for a minute leave a legal pizza and no error', () => {
    const kitchen = new Kitchen(freshSave(null), 4)
    let s = 12345
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
    for (let i = 0; i < 400; i++) {
      kitchen.press(rnd() * 1180, rnd() * 820)
      const how = rnd()
      if (how < 0.5) kitchen.tap()
      else if (how < 0.85) {
        kitchen.dragMove(rnd() * 1180, rnd() * 820)
        if (rnd() < 0.3) kitchen.dragLift()
        kitchen.dragEnd()
      } else kitchen.pressEnd()
      play(kitchen, 0.15)
      kitchen.sounds.length = 0
    }
    play(kitchen, 1)
    const pieces = kitchen.pieces()
    expect(pieces.length).toBeLessThanOrEqual(12)
    expect(pieces.length).toBeGreaterThan(0)
    for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) expect(Math.hypot(pieces[a].x - pieces[b].x, pieces[a].y - pieces[b].y)).toBeGreaterThan(0.3)
  })

  it('is found as it was left: the pieces on the pizza come back where they lay', () => {
    const kitchen = new Kitchen(freshSave(null), 5)
    for (let i = 0; i < 3; i++) {
      kitchen.press(tub(i).x, tub(i).y)
      kitchen.tap()
    }
    // Put away with pieces still in the air: they are saved where they will land.
    kitchen.step(1 / 60)
    const save = { ...freshSave(null), pizza: { pieces: kitchen.pieces(), baked: false } }
    expect(save.pizza.pieces.length).toBe(3)
    const again = new Kitchen(save, 6)
    expect(again.pieces()).toEqual(save.pizza.pieces)
  })

  it('shows an idle child what can be touched, then one move, and drops both at a touch', () => {
    const kitchen = new Kitchen(freshSave(null), 7)
    const ladder = new IdleLadder(0)
    kitchen.step(1 / 60)
    expect(kitchen.show(ladder.update(1)).glow).toBe(0)
    expect(kitchen.show(ladder.update(4.5)).glow).toBeGreaterThan(0.9)
    const demo = kitchen.show(ladder.update(6.5))
    expect(demo.ghost).not.toBeNull()
    // The hand is over a tub: a move the child could make now.
    expect(TOY_TUBS.some((_, i) => Math.hypot(demo.ghost!.x - tub(i).x, demo.ghost!.y - tub(i).y) < 40)).toBe(true)
    ladder.touch(7)
    const after = kitchen.show(ladder.update(7.1))
    expect(after.glow).toBe(0)
    expect(after.ghost).toBeNull()
  })
})
