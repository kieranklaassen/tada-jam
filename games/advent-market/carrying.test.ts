import { describe, expect, it } from 'vitest'
import { pullOff, ringPoint } from './benches'
import { MELT_AFTER, WARM_SECONDS } from './dipping'
import { LIFT } from './fair'
import { BASKET, FOLK, POT, REST, STICK, WHO } from './hall'
import { answerOf } from './natures'
import { handAt } from './holds'
import { BENCH, BOARD, COLOUR_X, CLOTH, SIZE_X, SOURCE, STAR, STALLS, slotAt, type Stall } from './places'
import { DT, Finger, SURFACES, carry, drag, fairAt, lift, made, run, tap } from './probe'
import { CRAFTS, LEFT, icedCells, isMade, sizeOf, twigCount, type Star } from './things'

const OVER_BASKET = { x: BASKET.x, y: 540 }
const names = (fair: ReturnType<typeof fairAt>): string[] => fair.takeSounds().map((sound) => sound.name)
const six = () => CRAFTS.flatMap((craft) => [made(craft, 1)]).concat([made('star', 2), made('wreath', 2)])

describe('the work at a bench', () => {
  it('gives under the finger when it lands, and folds a point when the finger lifts where it landed: heard then, and again on the game clock', () => {
    const fair = fairAt('star')
    fair.press(STAR.x, STAR.y)
    expect(fair.pieces.star.points).toBe(0)
    expect(names(fair)).toEqual(['bench'])
    expect(fair.bench.give.v).toBeGreaterThan(0)
    fair.release(true)
    expect(fair.pieces.star.points).toBe(1)
    expect(names(fair)).toEqual(['crease'])
    expect(fair.takeChange()).toBe(1)
    run(fair, 0.2)
    expect(names(fair)).toEqual(['fft'])
    expect(fair.inHand).toBe(false)
  })

  it('changes the colour and the size of the piece in work from the sources at the front, and saves that at once', () => {
    const fair = fairAt('star')
    tap(fair, COLOUR_X[2], SOURCE.y)
    expect(fair.pieces.star.colour).toBe(2)
    expect(fair.takeChange()).toBe(2)
    for (let i = 0; i < 4; i++) tap(fair, STAR.x, STAR.y)
    fair.takeSounds()
    tap(fair, SIZE_X[0], SOURCE.y)
    expect([fair.pieces.star.size, fair.pieces.star.points]).toEqual([0, 4])
    expect(fair.takeChange()).toBe(2)
  })

  it('never throws folds away for a smaller sheet: the sheet is not taken, the paper answers, and a larger sheet always is', () => {
    const fair = fairAt('star')
    for (let i = 0; i < 6; i++) tap(fair, STAR.x, STAR.y)
    fair.takeSounds(); fair.takeChange()
    // Six points are folded, and the small sheet has five.
    tap(fair, SIZE_X[0], SOURCE.y)
    expect([fair.pieces.star.size, fair.pieces.star.points]).toEqual([1, 6])
    expect(names(fair)).toEqual(['paper'])
    expect(fair.hop).toMatchObject({ what: 'size', index: 0 })
    expect(fair.bench.give.v).not.toBe(0)
    expect(fair.takeChange()).toBe(0)
    tap(fair, SIZE_X[2], SOURCE.y)
    expect([fair.pieces.star.size, fair.pieces.star.points]).toEqual([2, 6])
    // And back to the middling sheet, which has room for six.
    tap(fair, SIZE_X[1], SOURCE.y)
    expect([fair.pieces.star.size, fair.pieces.star.points]).toEqual([1, 6])
  })

  it('pours another wax into the big pot, and the next coat is of that colour', () => {
    const fair = fairAt('candle')
    tap(fair, COLOUR_X[1], SOURCE.y)
    expect([fair.pot, fair.dipping.colour]).toEqual([1, 1])
    expect(names(fair)).toEqual(['pour'])
    expect(fair.toSave().pot).toBe(1)
  })

  it('lifts a cloth on a tap at any age, and keeps it off', () => {
    const fair = fairAt('wreath', () => {}, 4)
    expect(fair.uncovered.wreath).toBe(false)
    // Under the cloth a tap lifts the cloth and changes no colour.
    tap(fair, COLOUR_X[2], SOURCE.y)
    expect([fair.uncovered.wreath, fair.pieces.wreath.colour]).toEqual([true, 0])
    expect(fair.takeChange()).toBe(2)
    expect(COLOUR_X[0] + SOURCE.rx).toBeLessThan(CLOTH.x)
    tap(fair, COLOUR_X[2], SOURCE.y)
    expect(fair.pieces.wreath.colour).toBe(2)
  })

  it('binds a whole bundle on the ring at a tap on one of the three bundles: a sparse, a full and a bushy wreath, each its own size', () => {
    for (const surface of SURFACES) {
      const sizes = [0, 1, 2].map((index) => {
        const fair = fairAt('wreath'), finger = new Finger(fair, surface)
        finger.down({ x: SIZE_X[index], y: SOURCE.y })
        finger.up()
        expect(fair.takeChange(), `bundle ${index}`).toBe(2)
        expect(names(fair), `bundle ${index}`).toEqual(['rustle'])
        expect(fair.hop).toMatchObject({ what: 'size', index })
        return [twigCount(fair.pieces.wreath), sizeOf(fair.pieces.wreath)]
      })
      expect(sizes).toEqual([[4, 0], [8, 1], [12, 2]])
    }
    // The same bundle again only brushes, and a twig can still be bound by hand on a sparse ring.
    const fair = fairAt('wreath')
    tap(fair, SIZE_X[0], SOURCE.y)
    fair.takeSounds(); fair.takeChange()
    tap(fair, SIZE_X[0], SOURCE.y)
    expect([names(fair), fair.takeChange()]).toEqual([['brush'], 0])
    const bare = fair.pieces.wreath.twigs.indexOf(0)
    tap(fair, ringPoint(bare).x, ringPoint(bare).y)
    expect(twigCount(fair.pieces.wreath)).toBe(5)
  })

  it('never throws away a twig bound by hand: a bundle is bound on beside the twigs that are there, whichever bundle it is', () => {
    for (const index of [0, 1, 2]) {
      const fair = fairAt('wreath')
      // Three twigs by hand, side by side, where the sparse bundle binds one of them at most.
      for (const place of [1, 2, 4]) tap(fair, ringPoint(place).x, ringPoint(place).y)
      const byHand = [...fair.pieces.wreath.twigs]
      tap(fair, SIZE_X[index], SOURCE.y)
      byHand.forEach((twig, place) => { if (twig) expect(fair.pieces.wreath.twigs[place], `bundle ${index}, place ${place}`).toBe(1) })
      expect(twigCount(fair.pieces.wreath), `bundle ${index}`).toBe([7, 9, 12][index])
      // A sparser bundle after a bushier one takes nothing off either.
      const full = twigCount(fair.pieces.wreath)
      tap(fair, SIZE_X[0], SOURCE.y)
      expect(twigCount(fair.pieces.wreath), `bundle ${index}`).toBe(full)
    }
  })

  it('never throws away icing for a smaller tin: what lies beyond its edge is kept under it and shows again under a larger one', () => {
    const fair = fairAt('biscuit')
    tap(fair, SIZE_X[2], SOURCE.y)
    // A line right across the large biscuit.
    carry(fair, { x: BOARD.x - 80, y: BOARD.y }, { x: BOARD.x + 80, y: BOARD.y })
    lift(fair)
    const piped = [...fair.pieces.biscuit.icing]
    expect(icedCells(fair.pieces.biscuit)).toBeGreaterThan(4)
    tap(fair, SIZE_X[0], SOURCE.y)
    expect([fair.pieces.biscuit.tin, fair.pieces.biscuit.icing]).toEqual([0, piped])
    tap(fair, SIZE_X[2], SOURCE.y)
    expect([fair.pieces.biscuit.tin, fair.pieces.biscuit.icing]).toEqual([2, piped])
  })

  it('never keeps the candle in the pot: a hand that goes off sideways from the wax carries it out, and nothing melts while it is held clear', () => {
    for (const surface of SURFACES) for (const to of [{ x: BASKET.x, y: 420 }, { x: 380, y: 420 }]) {
      const fair = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
      const size = sizeOf(fair.pieces.candle), finger = new Finger(fair, surface)
      finger.down(REST)
      finger.to({ x: POT.x, y: 420 })
      finger.wait(0.3)
      expect(fair.dipping.inPot).toBe(true)
      // Straight across, without lifting first.
      finger.to(to)
      finger.wait(0.5)
      expect(fair.dipping.inPot, `to ${to.x}`).toBe(false)
      expect(Math.abs(fair.dipping.stick.x - to.x), `to ${to.x}`).toBeLessThan(20)
      // Held there for longer than a candle lasts under the wax.
      finger.wait(MELT_AFTER + 4)
      expect(sizeOf(fair.pieces.candle), `to ${to.x}`).toBe(size)
      expect(names(fair), `to ${to.x}`).not.toContain('droop')
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      if (to.x === BASKET.x) expect(fair.basket.map((thing) => thing.craft)).toEqual(['candle'])
      else expect(fair.held.maker?.craft).toBe('candle')
    }
  })

  it('whistles for a candle only when it has melted thin, once, with her fist sinking: never for a candle that is growing, and never at a bare wick', () => {
    const fair = fairAt('candle')
    const heard: string[] = []
    const hold = (y: number, seconds: number) => { fair.move(POT.x, y); for (let t = 0; t < seconds; t += DT) { fair.step(DT); heard.push(...names(fair)) } }
    fair.press(REST.x, REST.y)
    // Dipped up from the bare wick until it is fat: thin is passed on the way, unheard.
    for (let n = 0; n < 40 && sizeOf(fair.pieces.candle) < 2; n++) { hold(540, 0.6); hold(180, WARM_SECONDS + 0.3) }
    expect(sizeOf(fair.pieces.candle)).toBe(2)
    expect(heard).not.toContain('droop')
    expect(heard).toContain('proud')
    // Left under the wax until nothing is left of it.
    hold(STICK.maxY, 30)
    expect(isMade(fair.pieces.candle)).toBe(false)
    expect(heard.filter((name) => name === 'droop')).toHaveLength(1)
    expect(answerOf('maker', 'thin')).toMatchObject({ part: expect.any(Number) })
  })

  it('cuts a biscuit with the tin that is tapped, every time', () => {
    const fair = fairAt('biscuit')
    tap(fair, SIZE_X[2], SOURCE.y)
    expect([fair.pieces.biscuit.cut, fair.pieces.biscuit.tin]).toEqual([true, 2])
    tap(fair, BOARD.x, BOARD.y)
    expect(fair.pieces.biscuit.icing.some((row) => row !== 0)).toBe(true)
  })
})

describe('carrying', () => {
  it('pulls a made thing off its bench and lays it in the basket; the bench has its fresh piece again, as it was set out', () => {
    for (const stall of ['star', 'wreath', 'biscuit'] as const) {
      const fair = fairAt(stall, (save) => { (save as Record<Stall, unknown>)[stall] = made(stall, 2) })
      const piece = fair.pieces[stall], off = pullOff(piece)
      const start = stall === 'wreath' ? ringPoint(0) : off
      drag(fair, start, OVER_BASKET)
      expect(fair.basket.map((thing) => thing.craft), stall).toEqual([stall])
      expect(isMade(fair.pieces[stall]), stall).toBe(false)
      expect((fair.pieces[stall] as Star).colour, stall).toBe(2)
      expect(fair.takeChange()).toBe(2)
      expect(fair.inHand).toBe(false)
    }
  })

  it('picks a piece up as the finger left it: a pull folds no point, and the twig bound or the line piped on the way off stays on it', () => {
    for (const stall of ['star', 'wreath', 'biscuit'] as const) {
      // From its middle, from a bare place on the ring, across bare icing cells: wherever the finger takes hold.
      for (const from of [BENCH[stall], stall === 'wreath' ? ringPoint(9) : { x: BENCH[stall].x - 40, y: BENCH[stall].y + 20 }, stall === 'wreath' ? ringPoint(7) : { x: BENCH[stall].x + 30, y: BENCH[stall].y - 30 }]) {
        const fair = fairAt(stall, (save) => { (save as Record<Stall, unknown>)[stall] = made(stall, 2) })
        const before = JSON.stringify(fair.pieces[stall])
        const work = (thing: unknown) => { const t = thing as { twigs?: number[]; icing?: number[] }; return (t.twigs ?? t.icing ?? []).reduce((sum, n) => sum + n, 0) }
        const had = work(fair.pieces[stall])
        // To just short of where it comes off: what the finger made on the way is on the piece.
        const off = pullOff(fair.pieces[stall]), far = Math.hypot(760 - off.x, 180 - off.y)
        const short = { x: off.x + ((760 - off.x) * (off.r - 4)) / far, y: off.y + ((180 - off.y) * (off.r - 4)) / far }
        carry(fair, from, short)
        expect(fair.carry, stall).toBeNull()
        const worked = JSON.stringify(fair.pieces[stall])
        if (stall === 'star') expect(worked).toBe(before)
        else expect(work(fair.pieces[stall]), stall).toBeGreaterThanOrEqual(had)
        // Pulled off, it is carried exactly so: nothing is taken back and nothing more is made.
        fair.move(760, 180)
        expect(fair.carry?.thing.craft, stall).toBe(stall)
        expect(JSON.stringify(fair.carry?.thing), stall).toBe(worked)
        // Let go nowhere, it is back on its bench as it was carried.
        lift(fair)
        run(fair, 0.5)
        expect(JSON.stringify(fair.pieces[stall]), stall).toBe(worked)
      }
    }
    // And the pull does make something where it crosses bare work: a rub from a bare place, a stroke over bare cells.
    for (const stall of ['wreath', 'biscuit'] as const) {
      const fair = fairAt(stall, (save) => { (save as Record<Stall, unknown>)[stall] = made(stall, 2) })
      const before = JSON.stringify(fair.pieces[stall])
      carry(fair, stall === 'wreath' ? ringPoint(9) : { x: BOARD.x - 40, y: BOARD.y + 20 }, { x: 760, y: 180 })
      expect(JSON.stringify(fair.carry?.thing), stall).not.toBe(before)
    }
  })

  it('does not take a piece nothing has been made of, and a finger that wanders off it has not tapped', () => {
    for (const stall of ['star', 'wreath', 'biscuit'] as const) {
      const fair = fairAt(stall), before = JSON.stringify(fair.toSave())
      drag(fair, stall === 'wreath' ? ringPoint(3) : BENCH[stall], OVER_BASKET)
      expect(fair.basket, stall).toHaveLength(0)
      expect(JSON.stringify(fair.toSave()), stall).toBe(before)
    }
  })

  it('lays the candle in the basket when it is let go with its tip in it, and hangs a bare wick', () => {
    const fair = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
    fair.press(REST.x, REST.y)
    fair.move(BASKET.x, 260)
    run(fair, 1.2)
    lift(fair)
    expect(fair.basket.map((thing) => thing.craft)).toEqual(['candle'])
    expect(isMade(fair.pieces.candle)).toBe(false)
    expect(fair.dipping.candle).toBe(fair.pieces.candle)
  })

  it('takes a thing out of the basket by carrying it, and puts it back where it lay when it is let go nowhere', () => {
    const fair = fairAt('candle', (save) => { save.basket = [made('star'), made('biscuit')] })
    const at = slotAt(1)
    drag(fair, at, { x: 590, y: 300 })
    expect(fair.basket.map((thing) => thing.craft)).toEqual(['star', 'biscuit'])
    expect(fair.inHand).toBe(false)
  })

  it('touches a thing in the basket where it is drawn: each of the six places answers for its own thing', () => {
    const fair = fairAt('candle', (save) => { save.basket = six() })
    for (let i = 0; i < 6; i++) {
      const at = slotAt(i)
      fair.press(at.x, at.y)
      expect(fair.pending, `place ${i}`).toEqual({ kind: 'slot', index: i })
      expect(fair.hop.index).toBe(i)
      fair.release(false)
    }
  })
})

describe('a thing brought to a bench', () => {
  it('goes back onto its own bench on a tap, and the piece that was in work takes its place in the basket', () => {
    const fair = fairAt('star', (save) => { save.star = made('star', 1) as Star; save.basket = [made('candle'), made('star', 2)] })
    const at = slotAt(1)
    tap(fair, at.x, at.y)
    expect(fair.pieces.star.colour).toBe(2)
    expect(fair.basket.map((thing) => [thing.craft, (thing as Star).colour ?? 0])).toEqual([['candle', 0], ['star', 1]])
    expect(fair.takeChange()).toBe(2)
  })

  it('is used at another stall when it is carried onto the bench: dipped in the pot and back in its place, or set on the piece in work', () => {
    const dipped = fairAt('candle', (save) => { save.basket = [made('biscuit')]; save.pot = 2 })
    drag(dipped, slotAt(0), BENCH.candle)
    expect([dipped.basket[0].left, dipped.basket[0].tint]).toEqual([LEFT.wax, 2])
    expect(dipped.flight?.dip).toBe(true)
    const set = fairAt('wreath', (save) => { save.basket = [made('candle'), made('star')] })
    drag(set, slotAt(0), BENCH.wreath)
    expect(set.pieces.wreath.on?.craft).toBe('candle')
    expect(set.basket.map((thing) => thing.craft)).toEqual(['star'])
    // The second thing takes its place, and the first comes off into the basket where the second lay.
    drag(set, slotAt(0), BENCH.wreath)
    expect(set.pieces.wreath.on?.craft).toBe('star')
    expect(set.basket.map((thing) => thing.craft)).toEqual(['candle'])
  })

  it('is never spent by a tap: at another stall a tapped thing only hops, and at its own stall the next tap puts it back', () => {
    for (const stall of STALLS) {
      const fair = fairAt(stall, (save) => { save.basket = six() })
      for (let i = 0; i < 6; i++) {
        if (fair.basket[i].craft === stall) continue
        const before = JSON.stringify(fair.toSave())
        tap(fair, slotAt(i).x, slotAt(i).y)
        expect(JSON.stringify(fair.toSave()), `${stall}, place ${i}`).toBe(before)
        expect(names(fair), `${stall}, place ${i}`).toEqual(['thingHop'])
      }
    }
    const fair = fairAt('star', (save) => { save.star = made('star', 1) as Star; save.basket = [made('candle'), made('star', 2)] })
    const before = JSON.stringify(fair.toSave())
    tap(fair, slotAt(1).x, slotAt(1).y)
    expect(JSON.stringify(fair.toSave())).not.toBe(before)
    tap(fair, slotAt(1).x, slotAt(1).y)
    expect(JSON.stringify(fair.toSave())).toBe(before)
    // Onto a bench nothing was made at yet, the tap is undone by carrying the thing back: it lies in the basket as
    // it was, and the bench is bare again, with that thing's paper out.
    const bare = fairAt('star', (save) => { save.basket = [made('star', 2)] })
    const was = JSON.stringify(bare.basket)
    tap(bare, slotAt(0).x, slotAt(0).y)
    expect(bare.basket).toHaveLength(0)
    run(bare, 0.5)
    drag(bare, STAR, OVER_BASKET)
    expect(JSON.stringify(bare.basket)).toBe(was)
    expect([isMade(bare.pieces.star), bare.pieces.star.colour]).toEqual([false, 2])
  })

  it('sounds the cell as the grid has it: once as it happens, and the rest a moment later on the game clock', () => {
    const fair = fairAt('candle', (save) => { save.basket = [made('star')] })
    drag(fair, slotAt(0), BENCH.candle)
    expect(names(fair)).toContain('crackle')
    run(fair, 0.7)
    expect(names(fair).filter((name) => name === 'plipHigh')).toHaveLength(3)
    // Two soft pats and a squeak; a crinkle, a crinkle and a tucked tp.
    const stencil = fairAt('biscuit', (save) => { save.basket = [made('star')] })
    drag(stencil, slotAt(0), BENCH.biscuit)
    run(stencil, 1)
    expect(names(stencil).filter((name) => name === 'pat' || name === 'squeak')).toEqual(['pat', 'pat', 'squeak'])
    const wrap = fairAt('star', (save) => { save.basket = [made('biscuit')] })
    drag(wrap, slotAt(0), BENCH.star)
    run(wrap, 1)
    expect(names(wrap).filter((name) => name === 'crinkle' || name === 'tp')).toEqual(['crinkle', 'crinkle', 'tp'])
  })
})

describe('a full basket', () => {
  it('rocks and sends a seventh thing back to its bench, changing nothing', () => {
    const fair = fairAt('star', (save) => { save.star = made('star') as Star; save.basket = six() })
    drag(fair, pullOff(fair.pieces.star), OVER_BASKET)
    expect(fair.basket).toHaveLength(6)
    expect(isMade(fair.pieces.star)).toBe(true)
    expect(names(fair)).toContain('basketFull')
    expect(fair.takeChange()).toBeLessThan(2)
  })

  it('is never a dead end: a tap takes a thing of the stall out again, any thing can be carried out, and any thing can be given away', () => {
    for (const stall of STALLS) {
      const fair = fairAt(stall, (save) => { save.basket = six() })
      const before = JSON.stringify(fair.toSave())
      // A tap takes the things of this stall's own craft; a carry onto the bench uses any other.
      for (let i = 0; i < 6; i++) tap(fair, slotAt(i).x, slotAt(i).y)
      drag(fair, slotAt(0), BENCH[stall])
      expect(JSON.stringify(fair.toSave()), stall).not.toBe(before)
      // The bench is fresh at the start, so every thing of the stall's own craft came out of the basket.
      const own = six().filter((thing) => thing.craft === stall).length
      expect(fair.basket.length, stall).toBeLessThanOrEqual(6 - Math.min(1, own))
    }
    for (const who of WHO) {
      const fair = fairAt('candle', (save) => { save.basket = six() })
      const hand = FOLK[who].touch
      drag(fair, slotAt(5), { x: hand.x, y: who === 'baker' ? 300 : hand.y })
      expect(fair.basket, who).toHaveLength(5)
      expect(handAt(who, 'wreath').x).toBeGreaterThan(0)
    }
  })

  it('swaps with a hand that is full too: what the fair-goer held lies where the given thing lay', () => {
    const fair = fairAt('candle', (save) => { save.basket = six(); save.held.maker = made('biscuit', 2) })
    drag(fair, slotAt(0), { x: FOLK.maker.touch.x, y: FOLK.maker.touch.y })
    expect(fair.basket).toHaveLength(6)
    expect(fair.basket[0].craft).toBe('biscuit')
    expect(fair.held.maker?.craft).toBe('candle')
  })

  it('takes a thing back out of a hand: carried off it goes into the basket, and the hand is empty', () => {
    const fair = fairAt('candle', (save) => { save.held.bundle = made('wreath') })
    drag(fair, FOLK.bundle.touch, OVER_BASKET)
    expect(fair.held.bundle).toBeNull()
    expect(fair.shown.bundle).toBeNull()
    expect(fair.basket.map((thing) => thing.craft)).toEqual(['wreath'])
  })
})
