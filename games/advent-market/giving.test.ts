import { describe, expect, it } from 'vitest'
import { LIFT } from './fair'
import { BASKET, FOLK, HANDS, POT, REST, WHO, type Who } from './hall'
import { BENCH, RING, STALLS, slotAt, whoAt, type Stall } from './places'
import { Finger, SURFACES, fairAt, made } from './probe'
import type { Save } from './save'
import { isMade } from './things'

// Giving works on the hand held out, and anywhere on the fair-goer as drawn.
// Every drop here goes the Mount's way: pointer events in the surface's own
// pixels, at both surfaces, through the touch tracker and `handle`.

/** Where a child lets go to give: the middle of the hand held out, four points near its rim, the face and the middle of the body. */
function targets(who: Who): { name: string; x: number; y: number }[] {
  const hand = HANDS[who], body = FOLK[who]
  return [
    { name: 'hand', x: hand.x, y: hand.y },
    { name: 'hand, left', x: hand.x - hand.rx * 0.7, y: hand.y },
    { name: 'hand, right', x: hand.x + hand.rx * 0.7, y: hand.y },
    { name: 'hand, top', x: hand.x, y: hand.y - hand.ry * 0.7 },
    { name: 'hand, bottom', x: hand.x, y: hand.y + hand.ry * 0.7 },
    { name: 'face', x: body.eyes.x, y: body.eyes.y },
    { name: 'body', x: body.touch.x, y: body.touch.y },
  ]
}

/** What of a save a giving must leave alone: every piece in work and the wax. */
const work = (save: Save): string => JSON.stringify([save.candle, save.star, save.wreath, save.biscuit, save.pot])

describe('giving', () => {
  it('names one fair-goer at every point of every hand held out: no hand is answered by a neighbour, the bench or the basket', () => {
    for (const who of WHO) for (const at of targets(who)) expect(whoAt(at.x, at.y), `${who}, ${at.name}`).toBe(who)
  })

  it('takes a thing from the basket on each hand and each body, at every stall and both surfaces: it is given, and never dipped or pressed instead', () => {
    for (const surface of SURFACES) for (const stall of STALLS) for (const who of WHO) for (const at of targets(who)) {
      const fair = fairAt(stall, (save) => { save.basket = [made('star', 0)] })
      const before = work(fair.toSave()), finger = new Finger(fair, surface), label = `${who}, ${at.name}, ${stall} stall, ${surface.w}`
      finger.down(slotAt(0))
      finger.to(at)
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.held[who]?.craft, label).toBe('star')
      expect(fair.basket, label).toHaveLength(0)
      expect(fair.playing, label).toBe(true)
      expect(work(fair.toSave()), label).toBe(before)
      expect(fair.takeSounds().map((sound) => sound.name), label).not.toContain('crackle')
    }
  })

  it('gives a piece pulled off its bench and let go on a hand, at both surfaces: the bench has its fresh piece again', () => {
    for (const surface of SURFACES) for (const stall of ['star', 'wreath'] as const) for (const who of WHO) {
      // The largest star, which reaches nearest the hands.
      const fair = fairAt(stall, (save) => { (save as Record<Stall, unknown>)[stall] = { ...made(stall, 0), ...(stall === 'star' ? { size: 2 } : {}) } })
      const finger = new Finger(fair, surface), label = `${who}, ${stall} stall, ${surface.w}`, hand = HANDS[who]
      // The star is taken by its middle. The ring is taken by the side of it that is nearest the hand, so the pull leaves it at once.
      const far = Math.hypot(hand.x - RING.x, hand.y - RING.y)
      finger.down(stall === 'wreath' ? { x: RING.x + ((hand.x - RING.x) / far) * RING.r, y: RING.y + ((hand.y - RING.y) / far) * RING.r } : BENCH[stall])
      finger.to(hand)
      // Nothing is given while the finger is down, on the hand or anywhere.
      expect([fair.playing, fair.held[who]], label).toEqual([false, null])
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.playing, label).toBe(true)
      expect(fair.held[who]?.craft, label).toBe(stall)
      expect(isMade(fair.pieces[stall]), label).toBe(false)
    }
  })

  it('flies a thing back in sight, with its sound, when a full basket has no place for what the hand already holds: nothing returns unseen', () => {
    for (const surface of SURFACES) for (const stall of STALLS) {
      const fair = fairAt(stall, (save) => {
        save.basket = [made('star'), made('star'), made('wreath'), made('wreath'), made('biscuit'), made('biscuit')]
        save.held.maker = made('biscuit', 2)
        ;(save as unknown as Record<Stall, unknown>)[stall] = made(stall, 1)
      })
      // What must stand as it was: every piece in work but a candle's coats (it may dip on its way), every hand and the basket.
      const kept = () => { const save = fair.toSave(); return JSON.stringify([isMade(save.candle), save.star, save.wreath, save.biscuit, save.held, save.basket]) }
      const finger = new Finger(fair, surface), label = `${stall} stall, ${surface.w}`
      // The piece in work, taken to her hand, which holds a biscuit already. The ring is taken by its near side.
      finger.down(stall === 'candle' ? REST : stall === 'wreath' ? { x: RING.x - RING.r, y: RING.y } : BENCH[stall])
      finger.to(HANDS.maker)
      finger.wait(0.3)
      fair.takeSounds()
      // As the finger left it: a rub on the way there has bound its twigs, and they stay.
      const before = kept()
      finger.up()
      // The candle hangs for the grace first; a piece of another bench is let go at once.
      for (let i = 0; i < 20 && !fair.flight; i++) finger.wait(1 / 60)
      const heard = fair.takeSounds().map((sound) => sound.name)
      expect(heard, label).toContain('basketFull')
      expect(heard, label).toContain('thingBack')
      // It is in the air from where it was let go to its bench, and its bench does not show it twice meanwhile.
      expect(fair.flight?.thing.craft, label).toBe(stall)
      expect(fair.flight?.hides, label).toEqual({ kind: 'bench' })
      expect(Math.abs(fair.basketShake.v) + Math.abs(fair.basketShake.x), label).toBeGreaterThan(0)
      expect(fair.playing, label).toBe(false)
      finger.wait(0.5)
      expect(fair.flight, label).toBeNull()
      // Nothing changed: the piece is on its bench, she holds her biscuit, the basket is as full as it was.
      expect(kept(), label).toBe(before)
    }
  })

  it('goes on dipping while the finger crosses a hand beside the pot, and gives the candle only when it is let go there', () => {
    for (const surface of SURFACES) for (const who of WHO) for (const at of targets(who).slice(0, 5)) {
      const fair = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
      const finger = new Finger(fair, surface), label = `${who}, ${at.name}, ${surface.w}`
      finger.down(REST)
      finger.to(at)
      finger.wait(0.4)
      expect([fair.held[who], fair.playing, fair.stick], label).toEqual([null, false, true])
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect(fair.held[who]?.craft, label).toBe('candle')
      expect(fair.basket, label).toHaveLength(0)
      expect(fair.playing, label).toBe(true)
    }
  })

  it('still lays a candle in the basket, and still dips it, everywhere that is no hand', () => {
    const laid = fairAt('candle', (save) => { save.candle = made('candle', 1) as typeof save.candle })
    const finger = new Finger(laid, SURFACES[1])
    finger.down(REST)
    finger.to({ x: BASKET.x, y: 260 })
    finger.wait(1)
    finger.up()
    finger.wait(LIFT.seconds + 0.05)
    expect(laid.basket.map((thing) => thing.craft)).toEqual(['candle'])
    const dipped = fairAt('candle')
    const second = new Finger(dipped, SURFACES[1])
    second.down(REST)
    second.to({ x: POT.x, y: 420 })
    second.wait(0.5)
    expect(dipped.dipping.inPot).toBe(true)
  })
})
