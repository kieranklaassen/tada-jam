import { describe, expect, it } from 'vitest'
import { topAt } from './bear'
import { freshFur, pour, soap, wants } from './fur'
import { Game, type Want } from './game'
import { hintFor } from './hint'
import { CURTAIN, DOORWAY, GROWN_UP, HOMES, HOME_CONTROL, LAMP, THING_IDS, inSpot, onTeddy } from './room'
import { freshSave } from './save'

const rests = new Game(freshSave(null), 1).rests()

describe('what the idle ladder shows', () => {
  it('glows the one thing his coat asks for, and carries it from its place to him', () => {
    const fur = freshFur(['belly', 'footR'])
    const muddy = hintFor(fur, wants(fur), rests)!
    expect(muddy.carried).toBe('soap')
    expect(muddy.glow).toMatchObject({ x: HOMES.soap.x, y: HOMES.soap.y })
    expect(muddy.from).toEqual(rests.soap)
    expect(onTeddy(muddy.to)).toBe(true)
    // With the belly soaped the hand takes the soap to the foot that is still bare.
    for (let x = -80; x <= 80; x += 40) for (let y = -80; y <= 80; y += 40) soap(fur, x, -170 + y, 1)
    const half = hintFor(fur, wants(fur), rests)!
    expect(half.carried).toBe('soap')
    expect(half.to.y).toBeGreaterThan(muddy.to.y)
    for (let x = -200; x <= 200; x += 40) for (let y = -480; y <= 0; y += 40) soap(fur, x, y, 1)
    const foamy = hintFor(fur, wants(fur), rests)!
    expect(foamy.carried).toBe('jug')
    // The jug is shown held over his head, where its water would fall on him.
    expect(foamy.to.y).toBeLessThan(HOMES.jug.y)
    for (let x = -180; x <= 180; x += 30) for (let n = 0; n < 30; n++) pour(fur, x, topAt(x) ?? 0, 0.05)
    const wet = hintFor(fur, wants(fur), rests)!
    expect(wet.carried).toBe('towel')
    expect(onTeddy(wet.to)).toBe(true)
  })

  it('shows the blanket carried to him, and a tap for the lamp, the curtain and the door', () => {
    const blanket = hintFor(freshFur([]), 'blanket', rests)!
    expect(blanket).toMatchObject({ carried: 'blanket', tap: false })
    expect(onTeddy(blanket.to)).toBe(true)
    for (const [want, spot] of [['lamp', LAMP], ['curtain', CURTAIN], ['door', DOORWAY]] as const) {
      const hint = hintFor(freshFur([]), want, rests)!
      expect(hint).toMatchObject({ tap: true, carried: null })
      expect(hint.to).toEqual(hint.from)
      // The hand presses where a press does it.
      expect(inSpot(spot, hint.from), want).toBe(true)
    }
  })

  it('shows nothing when the room asks for nothing', () => {
    expect(hintFor(freshFur([]), null, rests)).toBeNull()
  })

  it('follows a cloth to wherever it lies', () => {
    const game = new Game({ ...freshSave(null), blanket: 'duck' }, 1)
    const hint = hintFor(game.fur, 'blanket', game.rests())!
    expect(hint.from).toEqual(game.rests().blanket)
    expect(hint.from.x).toBeLessThan(400)
  })

  it('never sends the hand under the home control or into the grown-up corner', () => {
    const wants: Want[] = [...THING_IDS, 'lamp', 'curtain', 'door']
    for (const want of wants) {
      const hint = hintFor(freshFur(['belly']), want, rests)!
      for (const p of [hint.from, hint.to]) {
        expect(Math.hypot(p.x - HOME_CONTROL.x, p.y - HOME_CONTROL.y), String(want)).toBeGreaterThan(HOME_CONTROL.r + 60)
        expect(p.x < GROWN_UP.left || p.y > GROWN_UP.bottom, String(want)).toBe(true)
      }
    }
  })
})
