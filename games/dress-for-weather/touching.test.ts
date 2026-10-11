import { describe, expect, it } from 'vitest'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { Hall } from './hall'
import { LIFT_GRACE_MS, REGRAB_RADIUS } from './input'
import type { Garment } from './kinds'
import { ON_RACK, aimsOf, paperBox, type Point } from './layout'
import { CORNER } from './overlay'
import { freshSave, type Save } from './save'
import { sail } from './voices'
import { STAGE, fit } from './stage'
import { Touching } from './touching'

// The finger between the surface and the hall: the grown-up's corner, the
// drag that survives a lifted finger, and going to rest. The surface here is
// the stage at one pixel a unit, so a point of the surface is a point of the
// stage.

const seen = (): Save => ({ ...freshSave(5), shown: ['door', 'out', 'vane'] })
const SURFACE = { width: STAGE.width, by: fit(STAGE.width, STAGE.height) }
const onRack = (garment: Garment): Point => {
  const box = paperBox(garment, ON_RACK[garment], false)
  return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }
}
const NOWHERE: Point = { x: 700, y: 300 }
function setUp(save: Save = seen()) {
  const hall = new Hall(save), ladder = new IdleLadder(0)
  return { hall, ladder, touch: new Touching(ladder, () => hall, () => SURFACE) }
}
/** Plays `seconds` of the hall and the finger's clock from `ms`, a frame at a time, and returns the clock. */
function play(hall: Hall, touch: Touching, ms: number, seconds: number): number {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    ms += 1000 / 60
    touch.advance(ms, ms / 1000)
    hall.step(1 / 60)
  }
  return ms
}

describe('the grown-up\'s corner', () => {
  it('is on the stage where the test thinks it is', () => {
    expect(SURFACE.by).toEqual({ scale: 1, x: 0, y: 0 })
    expect(CORNER).toBeGreaterThanOrEqual(48)
  })

  it('answers nothing from its press to its lift, wherever the finger goes, and leaves the idle ladder alone', () => {
    const { hall, ladder, touch } = setUp(), before = hall.toSave()
    const corner = { x: STAGE.width - 20, y: 20 }
    touch.down(1, corner, 0, 4)
    expect(hall.takeSounds()).toEqual([])
    expect(hall.ripple).toBeNull()
    // The same finger slides out of the corner, over the hat on its peg and on to the child: it carries nothing.
    touch.move(1, onRack('hat'))
    touch.move(1, { x: 535, y: 330 })
    touch.advance(100, 4.1)
    expect(hall.pieces.hat).toMatchObject({ mode: 'rest', lift: 0 })
    touch.up(1, { x: 535, y: 330 }, 200)
    play(hall, touch, 200, 1)
    expect(hall.toSave()).toEqual(before)
    expect(hall.takeSounds()).toEqual([])
    expect(hall.busy).toBe(false)
    expect(hall.dirty).toBeNull()
    // The ladder was not sent back to the bottom: the glow that had begun is still there.
    expect(ladder.update(IDLE_BEFORE_GLOW + 1).glow).toBeGreaterThan(0)
    // A tap in the corner is no tap on the hall either.
    touch.down(2, corner, 2000, 6)
    touch.up(2, corner, 2050)
    expect(hall.takeSounds()).toEqual([])
    // And the next touch that begins outside it is the hall's again.
    touch.down(3, onRack('hat'), 3000, 7)
    expect(hall.pieces.hat.lift).toBe(1)
    expect(ladder.update(7.5).glow).toBe(0)
    touch.up(3, onRack('hat'), 3050)
    expect(hall.save.where.hat).toEqual({ who: 'child', part: 'head' })
  })

  it('is not entered by a touch that began outside it', () => {
    const { hall, touch } = setUp()
    touch.down(1, onRack('hat'), 0, 0)
    touch.move(1, { x: STAGE.width - 20, y: 20 })
    expect(hall.pieces.hat.mode).toBe('held')
    touch.up(1, { x: STAGE.width - 20, y: 20 }, 100)
    // Let go there, over nothing, it waits and then sails home.
    play(hall, touch, 100, 2)
    expect(hall.pieces.hat).toMatchObject({ ...ON_RACK.hat, mode: 'rest' })
  })
})

describe('a drag and a lifted finger', () => {
  it('puts a garment on at once when the finger lifts over a spot, inside the touch', () => {
    const { hall, touch } = setUp(), head = aimsOf({ who: 'child', part: 'head' }, hall.stands())[0]
    touch.down(1, onRack('scarf'), 0, 0)
    touch.move(1, { x: 800, y: 300 })
    touch.move(1, head)
    expect(hall.pieces.scarf.offer).toEqual({ who: 'child', part: 'head' })
    expect(hall.waitsWhenLifted).toBe(false)
    touch.up(1, head, 300)
    expect(hall.save.where.scarf).toEqual({ who: 'child', part: 'head' })
    expect(hall.dirty).toBe('now')
    expect(touch.active).toBe(false)
  })

  it('leaves a garment let go over nothing waiting in the air where it is, and gives it back to a finger that returns', () => {
    const { hall, touch } = setUp(), head = aimsOf({ who: 'child', part: 'head' }, hall.stands())[0]
    touch.down(1, onRack('scarf'), 0, 0)
    touch.move(1, NOWHERE)
    expect(hall.waitsWhenLifted).toBe(true)
    hall.takeSounds()
    touch.up(1, NOWHERE, 1000)
    // It has not gone anywhere, and nothing is heard: the drag is not over.
    const at = { x: hall.pieces.scarf.x, y: hall.pieces.scarf.y }
    expect(hall.pieces.scarf.mode).toBe('held')
    expect(hall.save.where.scarf).toBe('rack')
    expect(touch.active).toBe(true)
    let ms = play(hall, touch, 1000, (LIFT_GRACE_MS - 60) / 1000)
    expect(hall.pieces.scarf).toMatchObject({ ...at, mode: 'held' })
    expect(hall.takeSounds()).toEqual([])
    // The finger comes back near it, within the grace: it has the scarf again, and carries it on to the head.
    const back = { x: NOWHERE.x + REGRAB_RADIUS - 20, y: NOWHERE.y }
    touch.down(2, back, ms, 1.3)
    expect(hall.pieces.scarf.mode).toBe('held')
    expect(hall.pieces.scarf.x).toBeCloseTo(at.x + REGRAB_RADIUS - 20)
    touch.move(2, head)
    touch.up(2, head, ms + 400)
    expect(hall.save.where.scarf).toEqual({ who: 'child', part: 'head' })
    ms = play(hall, touch, ms + 400, 1.5)
    expect(hall.pieces.scarf).toMatchObject({ ...hall.restPose('scarf'), mode: 'rest' })
  })

  it('sends it home, seen and heard, when no finger returns within the grace', () => {
    const { hall, touch } = setUp()
    touch.down(1, onRack('scarf'), 0, 0)
    touch.move(1, NOWHERE)
    touch.up(1, NOWHERE, 1000)
    hall.takeSounds()
    let ms = play(hall, touch, 1000, (LIFT_GRACE_MS + 40) / 1000)
    // It has set off: it is heard to sail, and it is in the air, on its way.
    const heard = hall.takeNotes()
    for (const part of sail) expect(heard).toContainEqual(part)
    expect(hall.pieces.scarf.mode).toBe('flying')
    expect(touch.active).toBe(false)
    const far = Math.hypot(hall.pieces.scarf.x - ON_RACK.scarf.x, hall.pieces.scarf.y - ON_RACK.scarf.y)
    expect(far).toBeGreaterThan(100)
    ms = play(hall, touch, ms, 0.1)
    expect(Math.hypot(hall.pieces.scarf.x - ON_RACK.scarf.x, hall.pieces.scarf.y - ON_RACK.scarf.y)).toBeLessThan(far)
    play(hall, touch, ms, 1.5)
    expect(hall.pieces.scarf).toMatchObject({ ...ON_RACK.scarf, mode: 'rest' })
    expect(hall.save.where.scarf).toBe('rack')
  })

  it('ends the drag where it was let go when a finger lands somewhere else, and that finger starts a touch of its own', () => {
    const { hall, touch } = setUp()
    touch.down(1, onRack('scarf'), 0, 0)
    touch.move(1, NOWHERE)
    touch.up(1, NOWHERE, 1000)
    touch.down(2, onRack('hat'), 1100, 1.1)
    expect(hall.pieces.scarf.mode).toBe('flying')
    expect(hall.pieces.hat.lift).toBe(1)
  })

  it('keeps the idle ladder at the bottom while the garment waits in the air', () => {
    const { hall, ladder, touch } = setUp()
    touch.down(1, onRack('scarf'), 0, 10)
    touch.move(1, NOWHERE)
    touch.up(1, NOWHERE, 100)
    touch.advance(200, 10.2)
    expect(hall.busy).toBe(true)
    expect(ladder.update(10.2 + IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
  })
})

describe('going to rest', () => {
  it('takes the idle ladder back to the bottom, so the parked hall is the loaded hall with the hand still to come', () => {
    const { hall, ladder, touch } = setUp()
    // The child has been idle long enough for the ghost hand to be showing.
    const idle = IDLE_BEFORE_DEMO + 1
    expect(ladder.update(idle).demo).not.toBeNull()
    const shown = touch.rest(idle)
    expect(shown).toMatchObject({ glow: 0, demo: null, demoIndex: -1 })
    // Opened again, the clock goes on from where it stopped: nothing shows until the hall has been idle afresh.
    expect(ladder.update(idle + IDLE_BEFORE_GLOW - 0.1)).toMatchObject({ glow: 0, demo: null })
    expect(ladder.update(idle + IDLE_BEFORE_DEMO + 0.1).demo).not.toBeNull()
    // And the hall is what a load of its save shows.
    expect(hall.seen()).toEqual(new Hall(hall.toSave(), hall.t).seen())
  })

  it('ends a drag whose finger is still down without a move, and lets one that was let go land, both unseen', () => {
    const held = setUp()
    held.touch.down(1, onRack('scarf'), 0, 0)
    held.touch.move(1, NOWHERE)
    held.touch.rest(1)
    expect(held.hall.save.where.scarf).toBe('rack')
    expect(held.hall.pieces.scarf).toMatchObject({ ...ON_RACK.scarf, mode: 'rest', lift: 0 })
    expect(held.hall.takeSounds()).toEqual([{ hush: 'all' }])
    expect(held.touch.active).toBe(false)
    const waiting = setUp()
    waiting.touch.down(1, onRack('scarf'), 0, 0)
    waiting.touch.move(1, NOWHERE)
    waiting.touch.up(1, NOWHERE, 100)
    waiting.touch.rest(1)
    expect(waiting.hall.pieces.scarf).toMatchObject({ ...ON_RACK.scarf, mode: 'rest' })
    expect(waiting.hall.takeSounds()).toEqual([{ hush: 'all' }])
    expect(waiting.hall.seen()).toEqual(new Hall(waiting.hall.toSave(), waiting.hall.t).seen())
  })
})
