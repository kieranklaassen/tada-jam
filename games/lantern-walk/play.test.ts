import { describe, expect, it } from 'vitest'
import { Hand } from './hand'
import { HOOK_GRIP } from './layout'
import { freshSave } from './save'
import { CANDLE_REST, EDGE, SHEET, WICK } from './table'

describe('a whole walk through the path the Mount uses', () => {
  it('rolls the sheet, sets the candle, lights it, walks, hangs the lantern and takes it down', () => {
    const hand = new Hand(freshSave(4))
    expect(hand.game.place).toBe('table')
    hand.drag(EDGE.left + 30, 440, SHEET.left + 60, 440)
    hand.wait(0.5)
    expect(hand.table.made).toBe('rolled')
    hand.drag(CANDLE_REST.x, CANDLE_REST.y, WICK.x, WICK.y + 90)
    hand.wait(0.5)
    expect(hand.table.made).toBe('candle')
    hand.tap(WICK.x, WICK.y + 60)
    expect(hand.game.place).toBe('wood')
    expect(hand.game.sceneRunning).toBe(true)
    hand.wait(6.5)
    expect(hand.game.sceneRunning).toBe(false)
    expect(hand.game.show.room).toBe(false)
    hand.carry(600, 600)
    hand.carry(HOOK_GRIP.x, HOOK_GRIP.y, 300, 0)
    hand.up()
    hand.wait(0.5)
    expect(hand.game.finished).toBe(true)
    hand.wait(9)
    expect(hand.game.sceneRunning).toBe(false)
    hand.drag(hand.wood.lantern.x, hand.wood.lantern.y, hand.wood.lantern.x - 150, hand.wood.lantern.y + 130)
    expect(hand.game.place).toBe('table')
    hand.wait(5)
    expect(hand.game.wood).toBe(null)
    expect(hand.table.made).toBe('flat')
    expect(hand.game.show.room).toBe(true)
  })
})
