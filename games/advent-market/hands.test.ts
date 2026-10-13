import { describe, expect, it } from 'vitest'
import { icingCell, pullOff, ringPoint } from './benches'
import { COAT, bareWick } from './candle'
import { ENDING, LIFT, type Fair } from './fair'
import { BASKET, FOLK, HANDS, LENGTH, POT, REST, STICK, WHO, type Who } from './hall'
import { BENCH, BOARD, DOORWAY, SNOW, STAR, drawnOn, handOf, slotAt, whoAt } from './places'
import { DT, Finger, SURFACES, fairAt, made, run } from './probe'
import { icedCells, isMade, twigCount, type Biscuit, type Star, type Wreath } from './things'

// A hand takes a thing only when the thing is let go on it. A finger that is
// still working never gives anything away and never loses work by crossing a
// hand: the candle goes on dipping, a rub is a rub and a stroke a stroke.

const names = (fair: Fair): string[] => fair.takeSounds().map((sound) => sound.name)
/** Points of a hand held out: its middle, four points well inside it, and four near its rim. */
function over(who: Who): { x: number; y: number }[] {
  const hand = HANDS[who], list = [{ x: hand.x, y: hand.y }]
  for (const k of [0.6, 0.93]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) list.push({ x: hand.x + dx * hand.rx * k, y: hand.y + dy * hand.ry * k })
  return list
}

describe('a hand while the finger is down', () => {
  it('does nothing to a candle that is dipping: across her hand and his the candle stays down in the wax, and takes its one coat when the child lifts it', () => {
    for (const surface of SURFACES) {
      const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, ...bareWick() } })
      const finger = new Finger(fair, surface)
      finger.down(REST)
      finger.to({ x: POT.x, y: 500 })
      finger.wait(0.3)
      expect(fair.dipping.inPot).toBe(true)
      names(fair)
      // Across her hand, then his, at the height they are held out, and back to the middle.
      for (const at of [{ x: 520, y: 500 }, { x: 500, y: 500 }, { x: 650, y: 500 }, { x: 664, y: 500 }, { x: POT.x, y: 500 }]) {
        finger.to(at)
        if (at.x !== POT.x) expect(handOf(at.x, at.y), 'the finger is on a hand').not.toBeNull()
        expect([fair.dipping.inPot, fair.stick, fair.playing], `${at.x}`).toEqual([true, true, false])
        for (const who of WHO) expect(fair.held[who]).toBeNull()
      }
      // Nothing came out of the wax on the way, so nothing was coated and nothing was heard to lift.
      expect(names(fair).filter((name) => name === 'lift' || name === 'hop')).toEqual([])
      expect(fair.pieces.candle.r.every((r) => r === 0)).toBe(true)
      finger.to({ x: POT.x, y: 180 })
      finger.wait(0.5)
      expect(names(fair).filter((name) => name === 'lift')).toHaveLength(1)
      expect(fair.pieces.candle.r[5]).toBe(COAT)
    }
  })

  it('takes the dipping candle only when it is let go on the hand: it comes out with the coat of that dip and no more', () => {
    for (const who of ['maker', 'baker'] as const) {
      const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, ...bareWick() } })
      const finger = new Finger(fair)
      finger.down(REST)
      finger.to({ x: POT.x, y: 500 })
      finger.wait(0.3)
      finger.to(who === 'maker' ? { x: 520, y: 500 } : { x: 650, y: 500 })
      expect(fair.held[who]).toBeNull()
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.held[who]?.craft, who).toBe('candle')
      const given = fair.held[who] as { r: number[] }
      expect(given.r[5], who).toBe(COAT)
      expect(isMade(fair.pieces.candle), 'a fresh wick hangs on the stick').toBe(false)
    }
  })

  it('lets the place the finger ends decide what a rub round the ring was: on the ring it is a rub, and on her hand or his the wreath is given with the twigs bound on the way', () => {
    let rubs = 0, givings = 0
    for (const surface of SURFACES) for (const who of ['maker', 'baker'] as const) for (const at of over(who)) {
      const fair = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath })
      const finger = new Finger(fair, surface), label = `${who} at ${Math.round(at.x)},${Math.round(at.y)}, ${surface.w}`
      const before = twigCount(fair.pieces.wreath)
      // Round the bare half of the ring, two places on, and off towards the hand.
      const from = who === 'maker' ? 9 : 6, dir = who === 'maker' ? -1 : 1
      finger.down(ringPoint(from))
      finger.to(ringPoint(from + dir))
      finger.to(ringPoint(from + dir * 2))
      expect(twigCount(fair.pieces.wreath), label).toBeGreaterThan(before)
      finger.to(at)
      // While the finger is down nothing is given and nothing is lifted, wherever it is.
      expect([fair.working, fair.carry, fair.playing], label).toEqual([true, null, false])
      const bound = twigCount(fair.pieces.wreath), end = fair.finger!
      const onRing = drawnOn(fair.pieces.wreath, end.x, end.y)
      finger.up()
      if (onRing) {
        finger.wait(LIFT.seconds + 0.3)
        expect(twigCount(fair.pieces.wreath), label).toBeGreaterThanOrEqual(bound)
        expect([fair.held[who], fair.playing, fair.basket.length], label).toEqual([null, false, 0])
        rubs += 1
      } else {
        // Given as it is: every twig the rub bound is on the wreath in her hand or his, and a bare ring is on the hook.
        expect(fair.playing, label).toBe(true)
        expect(twigCount(fair.held[who] as Wreath), label).toBe(bound)
        expect(twigCount(fair.flight!.thing as Wreath), label).toBe(bound)
        expect(twigCount(fair.pieces.wreath), label).toBe(0)
        expect(fair.pull, label).toEqual({ x: 0, y: 0 })
        givings += 1
      }
    }
    expect(rubs).toBeGreaterThan(0)
    expect(givings).toBeGreaterThan(8)
  })

  it('lets the place the finger ends decide what a stroke of icing was, for every tin: on the biscuit it is a stroke, and on her hand or his the biscuit is given with the line on it', () => {
    let strokes = 0, givings = 0
    for (const tin of [0, 1, 2]) for (const who of ['maker', 'baker'] as const) for (const at of [...over(who), { x: BOARD.x + (who === 'maker' ? -1 : 1) * (BOARD.r[tin] - 20), y: BOARD.y + 8 }]) {
      const fair = fairAt('biscuit', (save) => { save.biscuit = { ...(made('biscuit') as Biscuit), tin } })
      const finger = new Finger(fair), label = `tin ${tin}, ${who} at ${Math.round(at.x)},${Math.round(at.y)}`
      const side = who === 'maker' ? -1 : 1
      finger.down({ x: BOARD.x - side * 40, y: BOARD.y })
      finger.to({ x: BOARD.x + side * 40, y: BOARD.y })
      expect(icedCells(fair.pieces.biscuit), label).toBeGreaterThan(1)
      finger.to(at)
      expect([fair.working, fair.carry, fair.playing], label).toEqual([true, null, false])
      const piped = icedCells(fair.pieces.biscuit), end = fair.finger!
      const onBiscuit = drawnOn(fair.pieces.biscuit, end.x, end.y)
      finger.up()
      if (onBiscuit) {
        // A stroke that ends on the biscuit stays a stroke.
        finger.wait(LIFT.seconds + 0.3)
        expect(icedCells(fair.pieces.biscuit), label).toBeGreaterThanOrEqual(piped)
        expect([fair.pieces.biscuit.cut, fair.held[who], fair.playing], label).toEqual([true, null, false])
        strokes += 1
      } else {
        // The line does not vanish and the biscuit does not spring back from the hand: it is given with the line on it.
        expect(fair.playing, label).toBe(true)
        expect(icedCells(fair.held[who] as Biscuit), label).toBe(piped)
        expect(icedCells(fair.flight!.thing as Biscuit), label).toBe(piped)
        expect([fair.pieces.biscuit.cut, icedCells(fair.pieces.biscuit)], label).toEqual([false, 0])
        expect(fair.pull, label).toEqual({ x: 0, y: 0 })
        givings += 1
      }
    }
    expect(strokes).toBeGreaterThanOrEqual(6)
    expect(givings).toBeGreaterThan(30)
  })

  it('gives a biscuit dragged from its middle onto his body, and one pulled right past him, with the line piped on the way still on it', () => {
    for (const surface of SURFACES) for (const to of [{ x: 742, y: 400 }, { x: 800, y: 420 }]) {
      const fair = fairAt('biscuit', (save) => { save.biscuit = made('biscuit') as Biscuit })
      const finger = new Finger(fair, surface), label = `to ${to.x}, ${surface.w}`
      finger.down(BOARD)
      finger.to(HANDS.baker)
      // On his hand it is not lifted and not yet given: the finger is still down.
      expect([fair.carry, fair.playing], label).toEqual([null, false])
      finger.to(to)
      expect(whoAt(fair.finger!.x, fair.finger!.y), label).toBe('baker')
      expect(handOf(fair.finger!.x, fair.finger!.y), label).toBeNull()
      const piped = icedCells(fair.pieces.biscuit)
      expect(piped, label).toBeGreaterThan(1)
      // Short of where it comes off it is still on the board; past that it is in the hand. Either way the line is on it.
      const far = Math.hypot(to.x - BOARD.x, to.y - BOARD.y) > pullOff(fair.pieces.biscuit).r
      expect(fair.carry !== null, label).toBe(far)
      if (fair.carry) expect(icedCells(fair.carry.thing as Biscuit), label).toBe(piped)
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.playing, label).toBe(true)
      expect(icedCells(fair.held.baker as Biscuit), label).toBe(piped)
      expect(fair.pieces.biscuit.cut, label).toBe(false)
    }
  })

  it('gives a star and a wreath by the same rule: pulled from anywhere on it and let go on a body, short of where it comes off', () => {
    const star = fairAt('star', (save) => { save.star = made('star') as Star })
    star.press(STAR.x + 40, STAR.y)
    for (let i = 1; i <= 10; i++) { star.move(STAR.x + 40 + i * 10, STAR.y + i * 4); star.step(DT) }
    expect([star.carry, whoAt(star.finger!.x, star.finger!.y)]).toEqual([null, 'baker'])
    star.release(true)
    expect([star.playing, star.held.baker?.craft, (star.held.baker as Star).points, star.pieces.star.points]).toEqual([true, 'star', 4, 0])
    const ring = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath })
    ring.press(ringPoint(3).x, ringPoint(3).y)
    for (let i = 1; i <= 6; i++) { ring.move(ringPoint(3).x + i * 10, ringPoint(3).y + 4); ring.step(DT) }
    expect([ring.carry, whoAt(ring.finger!.x, ring.finger!.y), drawnOn(ring.pieces.wreath, ring.finger!.x, ring.finger!.y)]).toEqual([null, 'baker', false])
    ring.release(true)
    expect([ring.playing, ring.held.baker?.craft, twigCount(ring.pieces.wreath)]).toEqual([true, 'wreath', 0])
  })
})

describe('a tap', () => {
  it('on his hand at the biscuit stall is answered by his hand, for every tin and at both sizes: he is poked, the biscuit stays on the board, and nobody is given it', () => {
    for (const surface of SURFACES) for (const tin of [0, 1, 2]) for (const iced of [false, true]) {
      const fair = fairAt('biscuit', (save) => { save.biscuit = { ...(made('biscuit') as Biscuit), tin, icing: iced ? [0, 0, 12, 12, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0] } })
      const finger = new Finger(fair, surface), label = `tin ${tin}, ${surface.w}`, before = JSON.stringify(fair.pieces.biscuit)
      // The middle of his hand lies inside the radius of the dough, where the board would answer if he did not.
      expect(Math.hypot(HANDS.baker.x - BOARD.x, HANDS.baker.y - BOARD.y), label).toBeLessThan(BOARD.dough)
      finger.down(HANDS.baker)
      expect(fair.working, label).toBe(false)
      expect(names(fair), label).toEqual(['poke'])
      finger.up()
      finger.wait(LIFT.seconds + 0.3)
      expect(JSON.stringify(fair.pieces.biscuit), label).toBe(before)
      expect([fair.playing, fair.flight, fair.basket.length], label).toEqual([false, null, 0])
      for (const who of WHO) expect(fair.held[who], label).toBeNull()
    }
  })

  it('gives nothing away anywhere: on every hand and every body at every stall, with a made piece in work, a tap leaves the piece on its bench', () => {
    for (const stall of ['candle', 'star', 'wreath', 'biscuit'] as const) for (const who of WHO) for (const at of [...over(who), FOLK[who].eyes]) {
      const fair = fairAt(stall, (save) => { (save as unknown as Record<string, unknown>)[stall] = made(stall, 1) })
      const finger = new Finger(fair), label = `${stall}, ${who} at ${Math.round(at.x)},${Math.round(at.y)}`
      finger.down(at)
      finger.up()
      finger.wait(LIFT.seconds + 0.3)
      expect(isMade(fair.pieces[stall]), label).toBe(true)
      expect([fair.playing, fair.basket.length], label).toEqual([false, 0])
      for (const other of WHO) expect(fair.held[other], label).toBeNull()
    }
  })

  it('on a candle that hangs over her as it swings back gives nothing: a giving needs a hand that took the candle there', () => {
    const fair = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
    // The stick is on its way back to its hooks and passes over her: the candle hangs on her.
    fair.dipping.stick.x = 400; fair.dipping.stick.y = 200
    expect(whoAt(400, 200 + LENGTH)).toBe('maker')
    expect(fair.dipping.reaches(400, 320)).toBe(true)
    fair.press(400, 320)
    expect(fair.stick).toBe(true)
    fair.release(true)
    while (fair.lifted >= 0) fair.step(DT)
    expect([fair.held.maker, fair.playing, isMade(fair.pieces.candle)]).toEqual([null, false, true])
    // The same candle, taken there by the hand and let go, is given.
    run(fair, 2.5)
    fair.press(fair.dipping.stick.x, fair.dipping.stick.y)
    expect(fair.stick).toBe(true)
    for (let i = 1; i <= 20; i++) { fair.move(REST.x + ((400 - REST.x) * i) / 20, REST.y + (50 * i) / 20); fair.step(DT) }
    run(fair, 0.4)
    fair.release(true)
    while (fair.lifted >= 0) fair.step(DT)
    expect(fair.held.maker?.craft).toBe('candle')
  })
})

describe('a piece that is pulled', () => {
  it('comes after the finger from the start of the pull, with slack, and comes off at the distance it always did', () => {
    const fair = fairAt('star', (save) => { save.star = made('star') as Star })
    const off = pullOff(fair.pieces.star)
    fair.press(STAR.x, STAR.y)
    expect(fair.pull).toEqual({ x: 0, y: 0 })
    let last = 0
    for (let far = 10; far < off.r; far += 10) {
      fair.move(STAR.x + far, STAR.y)
      fair.step(DT)
      // Already on its way after ten units, never as far as the finger, and further with every step.
      expect(fair.pull.x, `${far}`).toBeGreaterThan(last)
      expect(fair.pull.x, `${far}`).toBeLessThan(far * 0.6)
      expect(fair.carry).toBeNull()
      last = fair.pull.x
    }
    expect(last).toBeGreaterThan(40)
    fair.move(STAR.x + off.r + 2, STAR.y)
    expect(fair.carry?.thing.craft).toBe('star')
    expect(fair.pull).toEqual({ x: 0, y: 0 })
  })

  it('springs back onto its bench when it is let go short of that, and a put-away finds it there', () => {
    const fair = fairAt('star', (save) => { save.star = made('star') as Star })
    fair.press(STAR.x, STAR.y)
    fair.move(STAR.x + 80, STAR.y - 30)
    expect(Math.hypot(fair.pull.x, fair.pull.y)).toBeGreaterThan(20)
    fair.release(true)
    run(fair, 0.5)
    expect(Math.hypot(fair.pull.x, fair.pull.y)).toBeLessThan(0.5)
    expect(fair.pieces.star.points).toBe(4)
    fair.press(STAR.x, STAR.y)
    fair.move(STAR.x + 80, STAR.y - 30)
    fair.park()
    expect(fair.pull).toEqual({ x: 0, y: 0 })
  })

  it('follows a finger that has left the ring or the biscuit, and stays put under a rub or a stroke that is on it', () => {
    const ring = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath })
    ring.press(ringPoint(3).x, ringPoint(3).y)
    ring.move(ringPoint(4).x, ringPoint(4).y)
    expect(ring.pull).toEqual({ x: 0, y: 0 })
    ring.move(ringPoint(3, 170).x, ringPoint(3, 170).y)
    expect(ring.pull.x).toBeGreaterThan(10)
    const board = fairAt('biscuit', (save) => { save.biscuit = made('biscuit') as Biscuit })
    board.press(BOARD.x - 30, BOARD.y)
    board.move(BOARD.x + 30, BOARD.y)
    expect(icingCell(board.pieces.biscuit, BOARD.x + 30, BOARD.y)).not.toBeNull()
    expect(board.pull).toEqual({ x: 0, y: 0 })
    board.move(BOARD.x, BOARD.y + BOARD.dough + 30)
    expect(board.pull.y).toBeGreaterThan(10)
    expect(BENCH.biscuit.x).toBe(BOARD.x)
  })
})

describe('a candle that swings', () => {
  it('is never given away by its swing: for every fair-goer, where the hand holds the stick decides, at every moment of the swing', () => {
    const ignored: Record<Who, number> = { tuba: 0, maker: 0, baker: 0, bundle: 0, goat: 0 }
    let given = 0
    for (let x = STICK.minX; x <= STICK.maxX; x += 73) for (let y = 130; y <= 400; y += 54) for (let phase = 0; phase < 5; phase++) {
      const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, r: save.candle.r.map(() => 6) } })
      fair.press(REST.x, REST.y)
      fair.move(x, y)
      run(fair, 0.5)
      // Whipped from side to side, so the candle swings as wide as it can, and let go at one moment or another.
      for (let i = 0; i < 16 + phase * 3; i++) { fair.move(x + (Math.floor(i / 4) % 2 === 0 ? 1 : -1) * 34, y); fair.step(DT) }
      fair.move(x, y)
      const finger = fair.finger!, d = fair.dipping
      fair.release(true)
      const hung = fair.letAt!
      const tipNames = whoAt(hung.tip.x, hung.tip.y)
      // Who the stick says: the finger on a hand held out, or the candle hanging at rest under the stick.
      const stickNames = handOf(finger.x, finger.y) ?? whoAt(hung.stick.x, hung.stick.y + LENGTH) ?? whoAt(hung.stick.x, hung.stick.y + LENGTH / 2)
      expect(d.held).toBe(true)
      while (fair.lifted >= 0) fair.step(DT)
      const label = `stick at ${x},${y}, phase ${phase}`
      for (const who of WHO) {
        if (fair.held[who]) { expect(stickNames, label).toBe(who); given += 1 }
        if (tipNames === who && stickNames !== who) { expect(fair.held[who], `${label}: the swing had the tip on ${who}`).toBeNull(); ignored[who] += 1 }
      }
    }
    expect(given).toBeGreaterThan(10)
    // The swing had the tip on each of them at some moment when the stick did not say so, and none of them took it.
    for (const who of ['tuba', 'maker', 'baker', 'bundle'] as const) expect(ignored[who], who).toBeGreaterThan(0)
  })

  it('is not given to the goat by a swing over its mouth: the stick, held clear of it, keeps the candle', () => {
    let swung = 0
    for (let phase = 0; phase < 12; phase++) {
      const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, r: save.candle.r.map(() => 6) } })
      fair.press(REST.x, REST.y)
      fair.move(372, 384)
      run(fair, 0.5)
      for (let i = 0; i < 14 + phase * 2; i++) { fair.move(372 + (Math.floor(i / 4) % 2 === 0 ? 1 : -1) * 34, 384); fair.step(DT) }
      fair.move(372, 384)
      fair.release(true)
      const hung = fair.letAt!
      if (whoAt(hung.tip.x, hung.tip.y) === 'goat') swung += 1
      expect(whoAt(hung.stick.x, hung.stick.y + LENGTH)).not.toBe('goat')
      while (fair.lifted >= 0) fair.step(DT)
      expect(fair.held.goat, `phase ${phase}`).toBeNull()
    }
    expect(swung).toBeGreaterThan(0)
  })
})

describe('the basket at the door', () => {
  it('takes and gives things like anywhere else until it is carried out', () => {
    for (const surface of SURFACES) {
      const fair = fairAt('door', (save) => { save.basket = [made('star'), made('wreath')]; save.held.baker = made('biscuit') })
      const finger = new Finger(fair, surface)
      // A thing out of it and onto a hand.
      finger.down(slotAt(0))
      finger.to(HANDS.maker)
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.held.maker?.craft).toBe('star')
      expect(fair.basket.map((thing) => thing.craft)).toEqual(['wreath'])
      finger.wait(4)
      // A thing out of a hand and into it.
      finger.down(HANDS.baker)
      finger.to({ x: BASKET.x, y: BASKET.y - 20 })
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.basket.map((thing) => thing.craft)).toEqual(['wreath', 'biscuit'])
      expect(fair.held.baker).toBeNull()
      // A tap on a thing in it makes the thing hop, and the basket stays on its hook.
      finger.wait(1)
      fair.takeSounds()
      finger.down(slotAt(1))
      finger.up()
      expect(fair.takeSounds().map((sound) => sound.name)).toContain('thingHop')
      expect([fair.hooked, fair.finished]).toEqual([null, false])
      // And by its wicker or its handle it still comes off the hook and is carried out.
      finger.wait(1)
      finger.down({ x: BASKET.x, y: 668 })
      expect(fair.hooked).not.toBeNull()
      finger.to({ x: SNOW.x, y: SNOW.y - 80 })
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.finished).toBe(true)
      expect(fair.basket).toHaveLength(2)
    }
  })

  it('is carried by where the finger took it: taken by its wicker it hangs round the finger, and goes out when the finger is over the sill', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] })
    fair.press(BASKET.x + 40, 668)
    expect(fair.hooked!.y).toBeLessThan(668)
    fair.move(DOORWAY.right + 60, 640)
    fair.release(true)
    while (fair.lifted >= 0) fair.step(DT)
    expect(fair.finished).toBe(false)
    fair.press(BASKET.x, 480)
    expect(fair.hooked).toEqual({ x: BASKET.x, y: 480 })
    fair.move(SNOW.x, SNOW.y - 80)
    fair.release(true)
    while (fair.lifted >= 0) fair.step(DT)
    expect(fair.finished).toBe(true)
    expect(fair.out).toBeLessThan(ENDING.seconds)
  })
})
