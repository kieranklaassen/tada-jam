import { describe, expect, it } from 'vitest'
import { BAND, COCK, LAMP, SPOT, pictureAt, targetAt, thingHome } from './layout'
import { THINGS, YARD } from './tale'

const down = () => false
describe('what is under a finger', () => {
  it('is each thing, each of the yard, the lamp, the cock and the moon, with a hand of slack', () => {
    for (const thing of THINGS) for (const d of [-40, 0, 40]) expect(targetAt({ x: thingHome(thing).x + d, y: thingHome(thing).y + d * 0.6 }, false, down, false)).toEqual({ kind: 'thing', thing })
    for (const who of YARD) expect(targetAt({ x: SPOT[who].x, y: SPOT[who].y - 100 }, false, down, false)).toEqual({ kind: 'who', who })
    expect(targetAt({ x: SPOT.grandpa.x, y: SPOT.grandpa.y - 200 }, false, down, false)).toEqual({ kind: 'who', who: 'grandpa' })
    for (const d of [-34, 34]) {
      expect(targetAt({ x: LAMP.x + d, y: LAMP.y + d }, true, down, true).kind).toBe('lamp')
      expect(targetAt({ x: COCK.x + d, y: COCK.y + d }, true, down, true).kind).toBe('cock')
    }
    expect(targetAt(SPOT.moon, true, down, true)).toEqual({ kind: 'who', who: 'moon' })
    expect(targetAt(SPOT.moon, false, down, false)).toEqual({ kind: 'yard' })
  })
  it('is a puppet or a thing on the whole of every picture, each at least 48 wide', () => {
    for (let at = 0; at < 3; at++) {
      const box = pictureAt(at)
      expect(box.x).toBeGreaterThanOrEqual(BAND.left)
      expect(box.x + box.width).toBeLessThanOrEqual(BAND.right)
      for (let x = box.x + 4; x < box.x + box.width; x += 20) expect(targetAt({ x, y: box.y + 70 }, true, down, true)).toEqual({ kind: x < box.x + box.width / 2 ? 'puppet' : 'prop', at })
    }
  })
  it('follows whoever a balloon has lifted', () => {
    expect(targetAt({ x: SPOT.pig.x, y: SPOT.pig.y - 280 }, false, (who) => who === 'pig', false)).toEqual({ kind: 'who', who: 'pig' })
  })
})
