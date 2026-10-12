import { describe, expect, it } from 'vitest'
import { Fair, LIFT } from './fair'
import { BASKET, FOLK, HANDS, REST } from './hall'
import { SNOW, STAR, slotAt } from './places'
import { DT, Finger, SURFACES, fairAt, lift, made, run, seen } from './probe'
import { deserialize, serialize } from './save'
import { isMade } from './things'
import { handle, putAway } from './visit'

// A carry survives a lifted finger. The thing hangs where it is for a moment
// of the game's own clock, and a finger landing near it carries on. All of it
// goes the Mount's way: pointer events through the touch tracker and `handle`.

const AIR = { x: 520, y: 300 }
const names = (finger: Finger): string[] => finger.fair.takeSounds().map((sound) => sound.name)

/** A star out of the basket and in the air, the finger just lifted. */
function lifted(surface: { w: number; h: number } = SURFACES[0]): Finger {
  const fair = fairAt('candle', (save) => { save.basket = [made('star', 2), made('biscuit')] })
  const finger = new Finger(fair, surface)
  finger.down(slotAt(0))
  finger.to(AIR)
  finger.up()
  return finger
}

describe('a lifted finger', () => {
  it('leaves the thing hanging where it was, seen and unmoved, and nothing is heard of the lift', () => {
    for (const surface of SURFACES) {
      const finger = lifted(surface), fair = finger.fair
      names(finger)
      finger.wait(LIFT.seconds / 2)
      expect(fair.carry?.thing.craft).toBe('star')
      expect(Math.hypot(fair.carry!.x - AIR.x, fair.carry!.y - AIR.y)).toBeLessThan(2)
      expect(fair.basket).toHaveLength(2)
      expect(fair.inHand).toBe(true)
      expect(names(finger)).toEqual([])
    }
  })

  it('carries on when the finger lands near it again in time: no new touch, and the thing goes where the finger takes it', () => {
    for (const surface of SURFACES) {
      const finger = lifted(surface), fair = finger.fair
      names(finger)
      finger.wait(LIFT.seconds / 2)
      finger.down({ x: AIR.x + 50, y: AIR.y + 30 })
      // Not a touch of the wall, the pot or anything else: the same carry.
      expect(names(finger)).toEqual([])
      expect(fair.carry?.thing.craft).toBe('star')
      expect(Math.hypot(fair.carry!.x - AIR.x - 50, fair.carry!.y - AIR.y - 30)).toBeLessThan(2)
      finger.to(HANDS.baker)
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.held.baker?.craft).toBe('star')
    }
  })

  it('lets the thing go where it hung once the moment is over, as the child let it go: on a hand it is given, in the air it goes back', () => {
    const back = lifted()
    back.wait(LIFT.seconds + 0.05)
    expect(back.fair.carry).toBeNull()
    expect(back.fair.basket.map((thing) => thing.craft)).toEqual(['star', 'biscuit'])
    expect(names(back)).toContain('thingBack')
    const given = fairAt('candle', (save) => { save.basket = [made('star', 2)] })
    const finger = new Finger(given)
    finger.down(slotAt(0))
    finger.to(HANDS.maker)
    finger.up()
    expect(given.held.maker).toBeNull()
    finger.wait(LIFT.seconds + 0.05)
    expect(given.held.maker?.craft).toBe('star')
  })

  it('takes a finger that lands somewhere else as a touch of its own: the thing is let go first where it hung', () => {
    const finger = lifted(), fair = finger.fair
    names(finger)
    finger.wait(LIFT.seconds / 2)
    finger.down({ x: AIR.x + LIFT.reach + 60, y: 60 })
    expect(fair.carry).toBeNull()
    expect(fair.basket).toHaveLength(2)
    expect(names(finger)).toEqual(['thingBack', 'flutter'])
  })

  it('holds for the candle on its stick and for the basket off its hook', () => {
    const candle = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
    const stick = new Finger(candle, SURFACES[1])
    stick.down(REST)
    stick.to({ x: 700, y: 200 })
    stick.up()
    stick.wait(LIFT.seconds / 2)
    expect([candle.stick, candle.dipping.held]).toEqual([true, true])
    stick.down({ x: 720, y: 210 })
    stick.to({ x: BASKET.x, y: 260 })
    stick.wait(1)
    stick.up()
    stick.wait(LIFT.seconds + 0.05)
    expect(candle.basket.map((thing) => thing.craft)).toEqual(['candle'])

    const door = fairAt('door', (save) => { save.basket = [made('star')] })
    const hook = new Finger(door, SURFACES[1])
    hook.down({ x: BASKET.x, y: 560 })
    hook.to({ x: 700, y: 480 })
    hook.up()
    hook.wait(LIFT.seconds / 2)
    expect(door.hooked).not.toBeNull()
    hook.down({ x: 690, y: 490 })
    hook.to({ x: SNOW.x, y: SNOW.y - 80 })
    hook.up()
    hook.wait(LIFT.seconds + 0.05)
    expect(door.finished).toBe(true)
  })

  it('lets a swinging candle go where the hand holds it: laid in the basket under the hand, wherever the swing has the tip', () => {
    let over = 0
    for (let n = 0; n < 24; n++) {
      const fair = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
      // Whipped across to the basket, so the candle swings wide, and let go at one moment or another of the swing.
      fair.press(REST.x, REST.y)
      for (let i = 1; i <= 6; i++) { fair.move(REST.x + ((BASKET.x - REST.x) * i) / 6, REST.y + (110 * i) / 6); fair.step(DT) }
      run(fair, 0.25 + n * 0.04)
      const tip = fair.dipping.tipShown()
      if (Math.abs(tip.x - BASKET.x) > BASKET.rx + 24) over += 1
      lift(fair)
      // The hand is over the basket, so the candle is laid in it, at whatever moment of the swing.
      expect(fair.basket.map((thing) => thing.craft), `let go after ${n * 0.04} s`).toEqual(['candle'])
    }
    // And at some of those moments the swing had the tip out past the basket.
    expect(over).toBeGreaterThan(2)
  })

  it('is not undone by a put-away in that moment: the thing the child let go lands where it hung, on a hand, in the basket, on a bench or out in the snow', () => {
    for (const surface of SURFACES) {
      /** A put-away the Mount's way, half way through the grace, and the fair a load of the save then finds. */
      const away = (finger: Finger) => {
        finger.wait(LIFT.seconds / 2)
        expect(finger.fair.lifted, 'still hanging').toBeGreaterThan(0)
        expect(finger.touch.clear()).toEqual([])
        const changed = putAway(finger.fair, { play() {}, endScene() {}, hush() {} }, { touch() {} }, 0)
        // Parked equals loaded, here too: nothing in the hand or the air, no scene, no sound.
        expect(seen(finger.fair)).toEqual(seen(new Fair(deserialize(JSON.parse(JSON.stringify(serialize(finger.fair.toSave()))), 7, 99))))
        expect([finger.fair.playing, finger.fair.flight, finger.fair.inHand, finger.fair.takeSounds()]).toEqual([false, null, false, []])
        return changed
      }
      // Over a hand held out: given, with the mark the reaction leaves.
      const given = fairAt('candle', (save) => { save.basket = [made('star', 2), made('biscuit')] })
      let finger = new Finger(given, surface)
      finger.down(slotAt(0)); finger.to(HANDS.maker); finger.up()
      expect(away(finger)).toBe(true)
      expect([given.held.maker?.craft, given.basket.map((thing) => thing.craft)]).toEqual(['star', ['biscuit']])
      // Over the basket, from a hand: laid in it.
      const laid = fairAt('star', (save) => { save.held.baker = made('wreath') })
      finger = new Finger(laid, surface)
      finger.down(HANDS.baker); finger.to({ x: BASKET.x, y: 540 }); finger.up()
      expect(away(finger)).toBe(true)
      expect([laid.held.baker, laid.basket.map((thing) => thing.craft)]).toEqual([null, ['wreath']])
      // The piece in work, pulled off its bench and let go on him: given, and the bench is fresh.
      const piece = fairAt('star', (save) => { save.star = made('star') as typeof save.star })
      finger = new Finger(piece, surface)
      finger.down(STAR); finger.to({ x: 820, y: 330 }); finger.up()
      expect(piece.carry).not.toBeNull()
      expect(away(finger)).toBe(true)
      expect([piece.held.baker?.craft, piece.pieces.star.points]).toEqual(['star', 0])
      // The candle on its stick, held up to her and let go: given, and a bare wick hangs on the stick.
      const candle = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
      finger = new Finger(candle, surface)
      finger.down(REST); finger.to({ x: FOLK.maker.x, y: 180 }); finger.wait(0.5); finger.up()
      expect(away(finger)).toBe(true)
      expect([candle.held.maker?.craft, isMade(candle.pieces.candle)]).toEqual(['candle', false])
      // The basket, carried over the sill and let go: the fair is found finished, and no ending plays.
      const door = fairAt('door', (save) => { save.basket = [made('star')] })
      finger = new Finger(door, surface)
      finger.down({ x: BASKET.x, y: 560 }); finger.to({ x: SNOW.x, y: SNOW.y - 80 }); finger.up()
      expect(away(finger)).toBe(true)
      expect([door.finished, door.basket.length, door.glow]).toEqual([true, 1, 1])
      // Over nothing, the thing goes back where it came from, as before, and nothing is changed.
      const back = lifted(surface)
      expect(away(back)).toBe(false)
      expect(back.fair.basket.map((thing) => thing.craft)).toEqual(['star', 'biscuit'])
    }
  })

  it('is still no drop under a finger that is down at the put-away: over a hand or the basket, the thing goes back where it came from', () => {
    for (const to of [HANDS.maker, { x: BASKET.x, y: 540 }]) {
      const fair = fairAt('star', (save) => { save.basket = [made('biscuit')]; save.held.baker = made('wreath') })
      const finger = new Finger(fair), before = JSON.stringify(fair.toSave())
      finger.down(HANDS.baker); finger.to(to)
      expect(fair.carry?.thing.craft).toBe('wreath')
      // The Mount's order at a put-away: the tracker's touch is cleared, which cancels the drag, and then the fair is parked.
      const ended = finger.touch.clear()
      expect(ended.map((gesture) => gesture.type)).toEqual(['dragCancel'])
      handle(fair, ended, (p) => p)
      expect(putAway(fair, { play() {}, endScene() {}, hush() {} }, { touch() {} }, 0)).toBe(false)
      expect(JSON.stringify(fair.toSave())).toBe(before)
    }
  })

  it('is no drop when the game is put away in that moment over nothing, or the browser takes the finger: the thing is back where it came from', () => {
    const parked = lifted(), fair = parked.fair
    fair.park()
    expect(fair.basket.map((thing) => thing.craft)).toEqual(['star', 'biscuit'])
    expect(fair.carry).toBeNull()
    const loaded = fairAt('candle', (save) => { save.basket = [made('star', 2), made('biscuit')] })
    loaded.settle()
    expect(seen(fair)).toEqual(seen(loaded))

    const taken = fairAt('candle', (save) => { save.basket = [made('star', 2)] })
    const finger = new Finger(taken)
    finger.down(slotAt(0))
    finger.to(HANDS.maker)
    finger.taken()
    expect(taken.lifted).toBe(-1)
    expect(taken.carry).toBeNull()
    expect(taken.held.maker).toBeNull()
    expect(taken.basket).toHaveLength(1)
  })
})
