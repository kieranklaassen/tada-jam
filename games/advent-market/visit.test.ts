import { describe, expect, it } from 'vitest'
import mount from './advent-market.tsx?raw'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { BASKET, FOLK, POT, REST } from './hall'
import { ringPoint } from './benches'
import { ForgivingTouch } from './input'
import { CORNER } from './overlay'
import { BOARD, SIZE_X, SOURCE, STAR, slotAt } from './places'
import { DT, Finger, carry, drag, fairAt, made, run, seen, tap } from './probe'
import { icedCells, twigCount } from './things'
import { Fair } from './fair'
import { REST_MS, Touches, busy, handOver, hear, putAway, type Speaker } from './visit'
import type { Sound } from './voices'

// What the Mount does around the fair: whose a touch is, what holds the idle
// ladder at the bottom, how the fair's sounds reach the audio, and what a
// put-away does.

const SURFACES = [1180, 1024]

/** A speaker that only writes down what it was asked. */
function listening(): { speaker: Speaker; heard: string[] } {
  const heard: string[] = []
  const names = (sounds: Sound[]) => sounds.map((sound) => sound.name).join(' ')
  return { heard, speaker: { play: (sounds, scene) => heard.push(`${scene ? 'scene' : 'plain'}: ${names(sounds)}`), endScene: () => heard.push('end scene'), hush: () => heard.push('hush') } }
}

/** A fair with a candle in the basket, and that candle just given to the baker: his scene is under way. */
function giving(): Fair {
  const fair = fairAt('candle', (save) => { save.basket = [made('candle', 1)] })
  drag(fair, slotAt(0), { x: FOLK.baker.touch.x, y: 300 })
  return fair
}

describe('the visit', () => {
  it('answers nothing in the top right corner, and such a touch is no touch to the idle ladder', () => {
    for (const width of SURFACES) {
      const touches = new Touches()
      for (const p of [{ x: width - 1, y: 1 }, { x: width - CORNER + 2, y: CORNER - 2 }, { x: width - 36, y: 36 }]) {
        expect(touches.down(p.x, p.y, width), `${width}: ${p.x}, ${p.y}`).toBe(false)
        expect(touches.mine).toBe(false)
        // A finger that is down there and not the game's holds nothing.
        expect(busy(true, touches.mine, false)).toBe(false)
        touches.over()
      }
      expect(touches.down(width - CORNER - 2, CORNER + 2, width)).toBe(true)
      expect(touches.down(width / 2, 400, width)).toBe(true)
      expect(touches.mine).toBe(true)
    }
    // The Mount asks before it takes the ladder back, and never hands the fair a touch that is not the game's.
    expect(mount).toContain('if (touch.active ? touches.mine : touches.down(where.x, where.y, width)) ladder.touch(clock.seconds)')
    expect(mount).toContain('if (!fair || !touches.mine) return')
  })

  it('takes the idle ladder back in two places only: a touch of the child\'s, and a frame in which a finger works or a scene plays', () => {
    expect(mount.split('ladder.touch(').length - 1).toBe(3)
    // One of the three is in a comment that explains the second.
    expect(mount).toContain('if (busy(touch.active, touches.mine, fair !== null && fair.playing)) ladder.touch(clock.seconds)')
    expect(busy(false, true, false)).toBe(false)
    expect(busy(true, true, false)).toBe(true)
    expect(busy(false, true, true)).toBe(true)
  })

  it('is not held back by what a fair-goer does by itself: left alone for a minute, the fair plays no scene and the ladder climbs', () => {
    const fair = fairAt('candle'), ladder = new IdleLadder(0)
    let moved = false
    const before = JSON.stringify(fair.folk.pose('goat'))
    let top = { glow: 0, demo: false }
    for (let t = 0; t < 60; t += DT) {
      fair.step(DT)
      if (busy(false, true, fair.playing)) ladder.touch(t)
      const shown = ladder.update(t)
      if (t > IDLE_BEFORE_GLOW + 2) top = { glow: Math.max(top.glow, shown.glow), demo: top.demo || shown.demo !== null }
      moved ||= JSON.stringify(fair.folk.pose('goat')) !== before
    }
    expect(moved).toBe(true)
    expect(top.glow).toBeGreaterThan(0.9)
    expect(top.demo).toBe(true)
  })

  it('cuts the scene a touch ended before it plays what the touch set off, and plays a scene\'s own sounds as the scene\'s', () => {
    const fair = giving(), { speaker, heard } = listening()
    hear(fair, speaker)
    run(fair, 0.8)
    hear(fair, speaker)
    expect(heard.some((line) => line.startsWith('scene: '))).toBe(true)
    expect(heard).not.toContain('end scene')
    heard.length = 0
    expect(fair.playing).toBe(true)
    fair.press(REST.x, REST.y)
    hear(fair, speaker)
    expect(heard[0]).toBe('end scene')
    expect(heard.slice(1).every((line) => line.startsWith('plain: '))).toBe(true)
    expect(heard.length).toBeGreaterThan(1)
    // From that frame on the scene makes no sound.
    fair.release(true)
    heard.length = 0
    for (let i = 0; i < 300; i++) { fair.step(DT); hear(fair, speaker) }
    expect(heard.filter((line) => line.startsWith('scene: '))).toEqual([])
  })

  it('closes every sound at a put-away, leaves the fair as a load would find it, and takes the idle ladder back to the bottom', () => {
    const fair = giving(), { speaker, heard } = listening(), ladder = new IdleLadder(0)
    run(fair, 0.5)
    carry(fair, { x: REST.x, y: REST.y }, { x: POT.x, y: POT.y - 40 })
    // The child has been idle long enough for the hand to be up.
    expect(ladder.update(IDLE_BEFORE_DEMO + 0.5).demo).not.toBeNull()
    putAway(fair, speaker, ladder, IDLE_BEFORE_DEMO + 0.5)
    expect(heard).toEqual(['hush'])
    expect(fair.takeSounds()).toEqual([])
    expect(fair.takeCut()).toBe(false)
    expect(seen(fair)).toEqual(seen(new Fair(fair.toSave())))
    const back = ladder.update(IDLE_BEFORE_DEMO + 0.6)
    expect(back.glow).toBe(0)
    expect(back.demo).toBeNull()
    // And coming back, nothing is heard until the child touches something.
    for (let i = 0; i < 300; i++) { fair.step(DT); hear(fair, speaker) }
    expect(heard).toEqual(['hush'])
    tap(fair, FOLK.goat.touch.x, FOLK.goat.touch.y)
    hear(fair, speaker)
    expect(heard.length).toBe(2)
  })

  it('never lets a resting contact deaden the game: a palm where nothing is, or a thumb that has not moved for a second, hands the work to the next contact that lands', () => {
    for (const surface of [{ w: 1180, h: 820 }, { w: 1024, h: 768 }]) {
      // A palm on bare wall, and at once a finger on the stick: the stick is taken.
      const wall = fairAt('candle'), palm = new Finger(wall, surface)
      palm.down({ x: 590, y: 760 }, 1)
      expect(wall.bare).toBe(true)
      palm.down(REST, 2)
      expect([wall.stick, wall.bare, palm.touch.holds(2), palm.touch.holds(1)]).toEqual([true, false, true, false])
      // The palm's own moves and its lift mean nothing from then on, and the finger's lift is its own.
      palm.to({ x: POT.x, y: 480 }, 2)
      expect(palm.touch.move(1, { x: 5, y: 5 }, 0)).toEqual([])
      expect(palm.touch.up(1, { x: 5, y: 5 }, 0)).toEqual([])
      expect(wall.stick).toBe(true)
      palm.up(2)
      palm.wait(0.4)
      expect(wall.inHand).toBe(false)

      // A thumb at rest on a fair-goer: within the second a second finger is ignored, as a palm is; after it, the second finger works.
      const thumb = fairAt('star'), hand = new Finger(thumb, surface)
      hand.down(FOLK.maker.eyes, 1)
      hand.wait(0.5)
      hand.down(STAR, 2)
      expect([thumb.working, hand.touch.holds(1)]).toEqual([false, true])
      hand.wait(0.6)
      hand.down(STAR, 3)
      expect([thumb.working, hand.touch.holds(3)]).toEqual([true, true])
      hand.up(3)
      expect(thumb.pieces.star.points).toBe(1)
      // A finger that rests on the piece itself for a second is not folding it any more: the next contact works, and the rest was no tap.
      hand.down(STAR, 4)
      hand.wait(1.1)
      hand.down({ x: SIZE_X[2], y: SOURCE.y }, 5)
      expect([thumb.pieces.star.size, thumb.pieces.star.points, hand.touch.holds(5)]).toEqual([2, 1, true])
      hand.up(5)
    }
  })

  it('never interrupts a finger that is dipping, carrying, rubbing or piping, however long it holds still or however many contacts land', () => {
    const land = (finger: Finger, id: number) => { finger.down({ x: 590, y: 760 }, id); finger.down(FOLK.baker.eyes, id + 1) }
    // Dipping: held still in the wax for two seconds.
    const dip = fairAt('candle'), stick = new Finger(dip)
    stick.down(REST, 1)
    stick.to({ x: POT.x, y: 500 }, 1)
    stick.wait(2)
    expect(dip.dipping.inPot).toBe(true)
    dip.takeSounds()
    land(stick, 7)
    expect([dip.stick, dip.dipping.inPot, stick.touch.holds(1), dip.takeSounds().map((sound) => sound.name)]).toEqual([true, true, true, []])
    stick.to({ x: POT.x, y: 180 }, 1)
    stick.up(1)
    stick.wait(0.6)
    expect(dip.pieces.candle.r[11]).toBeGreaterThan(0)
    // Carrying a thing, and the basket: held still over nothing for two seconds.
    const carried = fairAt('star', (save) => { save.basket = [made('star')] }), thing = new Finger(carried)
    thing.down(slotAt(0), 1)
    thing.to({ x: 600, y: 120 }, 1)
    thing.wait(2)
    land(thing, 7)
    expect([carried.carry?.thing.craft, thing.touch.holds(1)]).toEqual(['star', true])
    const door = fairAt('door', (save) => { save.basket = [made('star')] }), hook = new Finger(door)
    hook.down({ x: BASKET.x, y: 560 }, 1)
    hook.to({ x: 700, y: 480 }, 1)
    hook.wait(2)
    land(hook, 7)
    expect([door.hooked !== null, hook.touch.holds(1)]).toEqual([true, true])
    // Rubbing round the ring and piping a line: the finger is moving.
    const ring = fairAt('wreath'), rub = new Finger(ring)
    rub.down(ringPoint(0), 1)
    rub.to(ringPoint(1), 1)
    land(rub, 7)
    rub.to(ringPoint(3), 1)
    expect([ring.working, rub.touch.holds(1), twigCount(ring.pieces.wreath) >= 3]).toEqual([true, true, true])
    const board = fairAt('biscuit', (save) => { save.biscuit = made('biscuit') as typeof save.biscuit }), pipe = new Finger(board)
    pipe.down({ x: BOARD.x - 60, y: BOARD.y }, 1)
    pipe.to({ x: BOARD.x, y: BOARD.y }, 1)
    land(pipe, 7)
    pipe.to({ x: BOARD.x + 60, y: BOARD.y }, 1)
    expect([board.working, pipe.touch.holds(1), icedCells(board.pieces.biscuit) >= 4]).toEqual([true, true, true])
    // Folding: a tap is over well within the second, and a contact that lands during it changes nothing.
    const star = fairAt('star'), fold = new Finger(star)
    fold.down(STAR, 1)
    fold.wait(0.2)
    land(fold, 7)
    fold.up(1)
    expect(star.pieces.star.points).toBe(1)
  })

  it('hands the work over in the Mount before the tracker hears of the landing, and leaves a hold in the grown-up\'s corner alone', () => {
    const over = mount.indexOf('const ended = handOver(fair, touch, touches.mine, event.timeStamp)')
    expect(over).toBeGreaterThan(0)
    expect(mount).toContain('if (ended.length > 0) { act(ended); touches.over() }')
    expect(over).toBeLessThan(mount.indexOf('const gestures = touch.down(event.pointerId, where, event.timeStamp)'))
    expect(over).toBeLessThan(mount.indexOf('if (touch.active ? touches.mine : touches.down(where.x, where.y, width)) ladder.touch(clock.seconds)'))
    expect(mount).toContain('act(touch.move(event.pointerId, where, event.timeStamp))')
    // A touch that is not the game's is never handed over, and neither is anything when no fair is loaded.
    const touch = new ForgivingTouch()
    touch.down(1, { x: 5, y: 5 }, 0)
    const fair = fairAt('candle')
    expect(handOver(fair, touch, false, 5000)).toEqual([])
    expect(handOver(null, touch, true, 5000)).toEqual([])
    expect(touch.holds(1)).toBe(true)
    expect(REST_MS).toBe(1000)
    expect(handOver(fair, touch, true, REST_MS - 1)).toEqual([])
    expect(handOver(fair, touch, true, REST_MS).map((gesture) => gesture.type)).toEqual(['pressEnd'])
    expect(touch.active).toBe(false)
  })

  it('puts the fair away wherever the Mount rests: when attention goes, and nowhere is a put-away left to an unmount', () => {
    expect(mount).toContain('if (fair && putAway(fair, speaker, ladder, clock.seconds)) cadence.mark()')
    expect(mount.indexOf('act(touch.clear())')).toBeLessThan(mount.indexOf('if (fair && putAway('))
    // What the put-away changed is in the save that follows it.
    expect(mount.indexOf('if (fair && putAway(')).toBeLessThan(mount.indexOf('cadence.settle(performance.now())', mount.indexOf('if (fair && putAway(')))
  })
})
