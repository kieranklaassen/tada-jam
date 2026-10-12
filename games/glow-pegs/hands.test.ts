import { describe, expect, it } from 'vitest'
import { HOLES, RED, holeAt } from './board'
import { fingerMoved, play } from './hands'
import { ForgivingTouch, TAP_SLOP } from './input'
import { LEVER, knobAt } from './layout'
import { freshSave } from './save'
import { fit, type Fit } from './stage'
import { LEVER_TAP, Toy } from './toy'

// The lever through the tracker, as the Mount drives it: pointer events in the surface's own pixels go to the
// tracker, and its gestures and the working finger's every move go to the toy. The tracker sends no move while
// the finger is inside a tap's slack; the knob does not wait for one.

const SIZES: [number, number][] = [[1180, 820], [1024, 768]]

function rig(width: number, height: number) {
  const board = new Array<number>(HOLES).fill(0)
  board[holeAt(0, 3)] = RED
  const toy = new Toy({ ...freshSave(null), board, moth: null }, 1)
  const touch = new ForgivingTouch()
  const by: Fit = fit(width, height)
  const px = (at: { x: number; y: number }) => ({ x: at.x * by.scale + by.x, y: at.y * by.scale + by.y })
  let t = 0
  return {
    toy, touch, by,
    down: (at: { x: number; y: number }) => play(toy, touch.down(1, px(at), (t += 16)), by),
    move: (at: { x: number; y: number }, id = 1) => fingerMoved(toy, touch, id, px(at), by),
    up: (at: { x: number; y: number }) => { play(toy, touch.up(1, px(at), (t += 16)), by); play(toy, touch.letGo(), by) },
  }
}

describe('the lever through the tracker', () => {
  it('moves the knob with the finger from the first unit, inside the tracker\'s slack too, and never leaps when the finger leaves it', () => {
    const slot = LEVER.bottom - LEVER.top
    for (const [width, height] of SIZES) {
      for (const from of [knobAt(0), { x: LEVER.x - 20, y: LEVER.boxBottom - 20 }, { x: LEVER.right - 6, y: LEVER.top + 90 }]) {
        const { toy, touch, by, down, move } = rig(width, height)
        down(from)
        expect(toy.leverHeld).toBe(true)
        expect(toy.knob).toBe(0)
        let last = 0, inSlack = 0
        // A unit at a time, straight down the slot, far past the slack.
        for (let k = 1; k <= 70; k++) {
          const slack = k * by.scale <= TAP_SLOP
          move({ x: from.x, y: from.y + k })
          // The tracker itself has sent no move yet while the finger is inside its slack.
          if (slack) inSlack += 1
          expect(toy.knob, `${width} by ${height}, ${k} units down`).toBeCloseTo(k / slot, 6)
          expect(toy.knob - last).toBeLessThanOrEqual(1 / slot + 1e-9)
          last = toy.knob
        }
        expect(inSlack).toBeGreaterThanOrEqual(14)
        expect(touch.active).toBe(true)
        expect(toy.leverDown).toBe(false)
      }
    }
  })

  it('sends the toy no move of its own while the finger is in the slack: without the finger\'s place fed in, the knob would stand', () => {
    const { toy, touch, by, down } = rig(1180, 820)
    down(knobAt(0))
    // The tracker alone, as it was wired before: ten units down give no gesture at all.
    const at = knobAt(0)
    expect(touch.move(1, { x: at.x, y: at.y + 10 })).toEqual([])
    play(toy, [], by)
    expect(toy.knob).toBe(0)
  })

  it('ignores a second finger: only the working finger moves the knob', () => {
    const { toy, down, move } = rig(1180, 820)
    down(knobAt(0))
    move({ x: LEVER.x, y: knobAt(0).y + 40 }, 2)
    expect(toy.knob).toBe(0)
    move({ x: LEVER.x, y: knobAt(0).y + 5 })
    expect(toy.knob).toBeGreaterThan(0)
  })

  it('a tap that wobbles inside the slack toggles; a slide sideways counts for nothing; a short pull springs back and a pull of a quarter goes down', () => {
    const slot = LEVER.bottom - LEVER.top
    for (const [width, height] of SIZES) {
      // A wobble of a few units, lifted inside the tracker's slack: a tap.
      const tapped = rig(width, height)
      tapped.down(knobAt(0))
      tapped.move({ x: LEVER.x + 3, y: knobAt(0).y + 6 })
      expect(tapped.toy.knob).toBeGreaterThan(0)
      tapped.up({ x: LEVER.x + 3, y: knobAt(0).y + 6 })
      expect(tapped.toy.leverDown).toBe(true)
      expect(tapped.toy.sounds.map((cue) => cue.name).filter((name) => name !== 'beam')).toEqual(['grip', 'lever'])
      // A slide right across the plate, with hardly any travel along the slot: still a tap.
      const slid = rig(width, height)
      slid.down({ x: LEVER.left + 4, y: knobAt(0).y })
      for (let k = 1; k <= 70; k++) slid.move({ x: LEVER.left + 4 + k, y: knobAt(0).y + k * 0.1 })
      slid.up({ x: LEVER.left + 74, y: knobAt(0).y + 7 })
      expect(slid.toy.leverDown).toBe(true)
      // Over the slack and under a quarter of the slot: the lever stays, and the knob springs back with its creak.
      const short = rig(width, height)
      short.down(knobAt(0))
      for (let k = 1; k <= LEVER_TAP + 6; k++) short.move({ x: LEVER.x, y: knobAt(0).y + k })
      short.up({ x: LEVER.x, y: knobAt(0).y + LEVER_TAP + 6 })
      expect(short.toy.leverDown).toBe(false)
      expect(short.toy.sounds.map((cue) => cue.name)).toEqual(['grip', 'grip'])
      for (let i = 0; i < 40; i++) short.toy.step(1 / 60)
      expect(short.toy.knob).toBeCloseTo(0, 2)
      // A quarter of the slot: the lever goes down with its one clunk, and the knob falls the rest of the way.
      const far = rig(width, height)
      far.down(knobAt(0))
      const quarter = Math.ceil(slot / 4)
      for (let k = 1; k <= quarter; k++) far.move({ x: LEVER.x, y: knobAt(0).y + k })
      far.up({ x: LEVER.x, y: knobAt(0).y + quarter })
      expect(far.toy.leverDown).toBe(true)
      expect(far.toy.sounds.map((cue) => cue.name).filter((name) => name === 'lever')).toEqual(['lever'])
      expect(far.toy.knob).toBeLessThan(0.3)
      for (let i = 0; i < 40; i++) far.toy.step(1 / 60)
      expect(far.toy.knob).toBeCloseTo(1, 2)
    }
  })
})
