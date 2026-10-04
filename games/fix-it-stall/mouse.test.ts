import { describe, expect, it } from 'vitest'
import { GARAGE, GARAGE_MOUTH, Mouse } from './mouse'
import { boardBox, CLUTTER, MAT_BOX, matCells, looseBox, overlaps, TRAY, type Box } from './stage'
import { asBuilt } from './gadgets'
import { firstDaySign } from './sign'

const run = (mouse: Mouse, seconds: number, clear: boolean, each?: () => void) => { for (let i = 0; i < Math.round(seconds * 60); i++) { mouse.step(1 / 60, clear); each?.() } }

describe('the clockwork mouse', () => {
  it('comes out when the mat is clear and goes round and round on the bare mat, always the same way about', () => {
    const mouse = new Mouse()
    expect(mouse.where).toBe('home')
    run(mouse, 4, true)
    expect(mouse.where).toBe('running')
    const inside: Box = { x: MAT_BOX.x + 120, y: MAT_BOX.y + 30, w: TRAY.x - MAT_BOX.x - 150, h: 350 }
    let turned = 0, last = mouse.heading
    run(mouse, 120, true, () => {
      expect(mouse.at.x).toBeGreaterThan(inside.x)
      expect(mouse.at.x).toBeLessThan(inside.x + inside.w)
      expect(mouse.at.y).toBeGreaterThan(inside.y)
      expect(mouse.at.y).toBeLessThan(inside.y + inside.h)
      turned += mouse.heading - last
      last = mouse.heading
    })
    // It only turns left.
    expect(turned).toBeLessThan(-Math.PI * 4)
  })

  it('runs down, never quite stops, and is off again at a tap', () => {
    const mouse = new Mouse()
    run(mouse, 60, true)
    expect(mouse.wound).toBeLessThan(0.3)
    expect(mouse.wound).toBeGreaterThan(0.2)
    const slow = { ...mouse.at }
    run(mouse, 0.5, true)
    const crawl = Math.hypot(mouse.at.x - slow.x, mouse.at.y - slow.y)
    expect(crawl).toBeGreaterThan(2)
    expect(mouse.hit(mouse.at)).toBe(true)
    mouse.wind()
    const fast = { ...mouse.at }
    let hop = 0
    run(mouse, 0.5, true, () => { hop = Math.max(hop, mouse.hop) })
    expect(Math.hypot(mouse.at.x - fast.x, mouse.at.y - fast.y)).toBeGreaterThan(crawl * 2.5)
    expect(hop).toBeGreaterThan(0.1)
  })

  it('is out of the way a third of a second after a board comes down, and stays in its box while one lies there', () => {
    const mouse = new Mouse()
    run(mouse, 10, true)
    run(mouse, 0.36, false)
    expect(mouse.where).toBe('home')
    expect(mouse.at).toEqual(GARAGE_MOUTH)
    run(mouse, 30, false)
    expect(mouse.where).toBe('home')
    // In its box a tap finds it by the box; out on the mat, the box is only a box.
    expect(mouse.hit({ x: GARAGE.x + 20, y: GARAGE.y + 20 })).toBe(true)
    run(mouse, 5, true)
    expect(mouse.hit({ x: GARAGE.x + 20, y: GARAGE.y + 20 })).toBe(false)
  })

  it('has a box that stands just above the old hand\'s corner, clear of every place a part may lie and of both boards', () => {
    expect(overlaps(GARAGE, CLUTTER)).toBe(true)
    expect(overlaps(GARAGE, TRAY)).toBe(false)
    for (const circuit of [asBuilt('robot'), firstDaySign()]) {
      expect(overlaps(GARAGE, boardBox(circuit))).toBe(false)
      for (const cell of matCells(circuit)) expect(overlaps(GARAGE, looseBox(cell))).toBe(false)
    }
  })
})
