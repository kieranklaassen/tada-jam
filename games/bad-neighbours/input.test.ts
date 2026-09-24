import { describe, expect, it } from 'vitest'
import { DragGesture, HeldButton } from './input'

describe('controls', () => {
  it('buttons act on press, ignore a second finger, and repeat without bursts', () => {
    let moves = 0; const button = new HeldButton(() => moves++, true)
    expect(button.press(1, 0)).toBe(true); expect(moves).toBe(1)
    expect(button.press(2, 50)).toBe(false); expect(moves).toBe(1)
    button.advance(209); expect(moves).toBe(1)
    button.advance(210); expect(moves).toBe(2)
    button.advance(1000); expect(moves).toBe(3)
    button.release(1); button.advance(5000); expect(moves).toBe(3)
  })

  it('dragging moves relative to the building; taps rotate; swipes down drop', () => {
    const gesture = new DragGesture()
    expect(gesture.begin(1, 300, 250, 16, 0.5)).toBe(true)
    expect(gesture.move(1, 320, 251)).toBe(56)
    expect(gesture.end(1, 330, 400)).toBeUndefined()
    gesture.begin(2, 100, 100, 0, 1); expect(gesture.end(2, 102, 103)).toBe('rotate')
    gesture.begin(3, 100, 100, 0, 1); gesture.move(3, 106, 120); expect(gesture.end(3, 125, 150)).toBe('drop')
  })
})
