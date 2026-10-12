import { beforeAll, describe, expect, it } from 'vitest'
import { FATTEST, PARTS } from './candle'
import { TIERS } from './config'
import { Fair } from './fair'
import { IdleLadder } from './guidance'
import { BASKET, FOLK, POT, REST, WHO } from './hall'
import { useCanvases } from './paint'
import { ringPoint } from './benches'
import { BOARD, PLACES, RING, SIZE_X, SNOW, SOURCE, STALLS, STAR, WALK, slotAt, type Place } from './places'
import { fairAt, made, run } from './probe'
import { blurredPaint, recording, recordingCanvases, type Recording } from './recording'
import type { CandleThing, Thing } from './things'
import { FairView } from './view'

// The frame budget, counted and not timed, so it holds on a busy machine.
// A frame of this game is stamps of sprites painted once, plus the strokes
// and fills of what must be fresh (the wax, the candle, the drops, the
// faces). The real view draws into a recording context, and the count of
// both together is the game's draw count: the number the Mount reports as
// `drawCalls` and the jam's bar asks to be under about 80.

/** The one number: no frame of any place, at either size, may cost this many draws or more. */
const BUDGET = 80
const SIZES = [{ w: 1180, h: 820 }, { w: 1024, h: 768 }] as const
const RATIO = 2
/** What the busiest moment of each place costs, the same at both sizes. The dearest is the candle stall. */
const MEASURED: Record<string, number> = Object.fromEntries(SIZES.flatMap((size) => Object.entries({ candle: 65, star: 62, wreath: 58, biscuit: 57, door: 64 }).map(([place, cost]) => [`${place} ${size.w}`, cost])))

let canvases: ReturnType<typeof recordingCanvases>

beforeAll(() => {
  canvases = recordingCanvases()
  useCanvases(canvases.make)
})

function viewAt(size: { w: number; h: number }): { view: FairView; surface: Recording } {
  const surface = recording(size.w * RATIO, size.h * RATIO)
  const view = new FairView({ getContext: () => surface })
  view.resize(size.w, size.h, RATIO)
  return { view, surface }
}

/** A fat candle striped in every wax, part by part: the candle that costs most to draw. */
const striped = (): CandleThing => ({ ...(made('candle') as CandleThing), r: new Array<number>(PARTS).fill(FATTEST), c: Array.from({ length: PARTS }, (_, i) => i % 3) })
/** Six things in the basket, and a thing in every hand. */
const full = (): Thing[] => [striped(), made('star', 1), made('wreath', 2), made('biscuit', 0), made('star', 2), striped()]

/** The busiest a place can legally be: the basket full, every hand holding, the cloth still on, and the work of the place under way. */
function busiest(place: Place): Fair {
  const fair = fairAt(place, (save) => {
    save.basket = full()
    for (const who of WHO) save.held[who] = who === 'tuba' ? made('wreath') : who === 'goat' ? made('star') : striped()
    save.candle = striped()
    save.star = { ...(made('star', 2) as typeof save.star), on: made('candle') }
    save.wreath = { ...(made('wreath', 1) as typeof save.wreath), on: made('star') }
    save.biscuit = { ...(made('biscuit', 1) as typeof save.biscuit), on: made('candle') }
  }, 4)
  return fair
}

/** Draws frames of `fair` for `seconds`, with `each` called before every step, and hands back the dearest frame. */
function dearest(view: FairView, surface: Recording, fair: Fair, each: (t: number) => void, seconds: number): number {
  let most = 0
  for (let t = 0; t < seconds; t += 1 / 30) {
    each(t)
    fair.step(1 / 30)
    surface.reset()
    view.draw(fair, null, TIERS[0])
    expect(view.count, 'the view reports what it drew').toBe(surface.stamps.length + surface.strokes + surface.fills)
    expect(view.stamps).toBe(surface.stamps.length)
    most = Math.max(most, view.count)
  }
  return most
}

describe('the frame budget', () => {
  it('holds one number under 80 at the busiest legal moment of every place, at both sizes', () => {
    const measured: Record<string, number> = {}
    for (const size of SIZES) {
      const { view, surface } = viewAt(size)
      for (const place of PLACES) {
        let most = 0
        // The work of the place, hard: dips with drops and rings, folds, twigs, lines of icing.
        const work = busiest(place)
        most = Math.max(most, dearest(view, surface, work, (t) => {
          const step = Math.round(t * 30)
          if (place === 'candle') {
            if (step === 0) work.press(REST.x, REST.y)
            if (step % 30 === 2) work.move(POT.x, POT.y + 200)
            if (step % 30 === 16 && step < 90) work.move(POT.x, 180)
            // Let go with the rings still on the wax and the drops still falling, and at once a thing is given.
            if (step === 100) work.release(false)
            if (step === 101) { work.press(slotAt(1).x, slotAt(1).y); work.move(FOLK.goat.touch.x, FOLK.goat.touch.y); work.release(true) }
          } else if (place === 'star' && step % 6 === 0) { work.press(STAR.x, STAR.y); work.release(true) }
          else if (place === 'biscuit' && step % 4 === 0) { work.press(BOARD.x - 60 + (step % 40) * 3, BOARD.y); work.release(true) }
          else if (place === 'wreath') {
            // A rub round the ring, a bundle bound on, and a candle set in it with needles in the air.
            if (step === 0) work.press(ringPoint(0).x, ringPoint(0).y)
            if (step > 0 && step < 40) work.move(ringPoint(step / 4).x, ringPoint(step / 4).y)
            if (step === 40) work.release(true)
            if (step === 50) { work.press(SIZE_X[2], SOURCE.y); work.release(true) }
            if (step === 60) { work.press(slotAt(0).x, slotAt(0).y); work.move(RING.x, RING.y); work.release(true) }
          } else if (place === 'door') {
            // The whole ending, with the basket carried out and every fair-goer's last thing, to the halo.
            if (step === 3) work.press(BASKET.x, 668)
            if (step === 6) work.move(SNOW.x, SNOW.y - 80)
            if (step === 20) work.release(true)
          }
        }, place === 'door' ? 11 : 6))
        if (place === 'door') expect(work.glow, 'the ending was watched to its halo').toBe(1)
        // A meeting right after the work is let go, with the rings still on the wax: the thing flies, crumbs fly, the goat's bubble swells.
        const meeting = busiest(place)
        most = Math.max(most, dearest(view, surface, meeting, (t) => {
          const step = Math.round(t * 30)
          if (step === 1) { meeting.press(slotAt(0).x, slotAt(0).y); meeting.move(FOLK.goat.touch.x, FOLK.goat.touch.y); meeting.release(true) }
          if (step === 100) { meeting.press(slotAt(0).x, slotAt(0).y); meeting.release(true) }
        }, 5))
        // A thing in the hand over the hall, a poke, a tap on a colour and on a thing in the basket.
        const hand = busiest(place)
        most = Math.max(most, dearest(view, surface, hand, (t) => {
          const step = Math.round(t * 30)
          if (step === 1) { hand.press(215, 768); hand.release(true) }
          if (step === 4) { hand.press(slotAt(4).x, slotAt(4).y); hand.release(false) }
          if (step === 8) { hand.press(slotAt(2).x, slotAt(2).y); hand.move(600, 300) }
          if (step === 50) hand.release(true)
          if (step === 60) { hand.press(FOLK.maker.touch.x, FOLK.maker.touch.y); hand.release(true) }
        }, 3))
        // The walk away from it, two places in view.
        const walk = busiest(place)
        most = Math.max(most, dearest(view, surface, walk, (t) => { if (Math.round(t * 30) === 1) { walk.press(WALK.right.x, WALK.right.y); walk.release(true) } }, 2))
        // Idle, with the glow and the open hand.
        const idle = busiest(place), ladder = new IdleLadder(0)
        for (const seconds of [4.5, 6.5, 19]) {
          surface.reset()
          view.draw(idle, ladder.update(seconds), TIERS[0])
          most = Math.max(most, view.count)
        }
        expect(most, `${place} at ${size.w} by ${size.h}`).toBeLessThan(BUDGET)
        measured[`${place} ${size.w}`] = most
      }
    }
    // The measured figures, so that a change in any of them is seen.
    expect(measured).toEqual(MEASURED)
  })

  it('stamps the hall once at rest, and nothing else as big as the surface', () => {
    for (const size of SIZES) {
      const { view, surface } = viewAt(size)
      for (const place of PLACES) {
        const fair = busiest(place)
        surface.reset()
        view.draw(fair, null, TIERS[0])
        const big = surface.stamps.filter((s) => s.w >= size.w * RATIO * 0.8 && s.h >= size.h * RATIO * 0.8)
        expect(big.length, place).toBe(1)
      }
    }
  })

  it('paints nothing in a frame but a thing that is new to it', () => {
    const { view, surface } = viewAt(SIZES[0])
    const fair = busiest('candle')
    view.draw(fair, null, TIERS[0])
    const before = canvases.made()
    for (let i = 0; i < 120; i++) { fair.step(1 / 60); surface.reset(); view.draw(fair, new IdleLadder(0).update(i / 10), TIERS[0]) }
    expect(canvases.made()).toBe(before)
    // One fold makes one new star, and one new picture.
    const star = fairAt('star')
    view.draw(star, null, TIERS[0])
    const then = canvases.made()
    star.press(STAR.x, STAR.y)
    star.release(true)
    view.draw(star, null, TIERS[0])
    expect(canvases.made()).toBe(then + 1)
  })

  it('paints nothing for a tier change, and paints everything at once for a new shape of surface', () => {
    const { view, surface } = viewAt(SIZES[0])
    const fair = busiest('wreath')
    view.draw(fair, null, TIERS[0])
    const before = canvases.made()
    // The tier drops and comes back: the same surface drawn at a lower pixel ratio, with the same pictures.
    for (const tier of [1, 2, 3, 0]) {
      view.resize(SIZES[0].w, SIZES[0].h, TIERS[tier].dpr, RATIO)
      for (let frame = 0; frame < 30; frame++) {
        fair.step(1 / 60)
        surface.reset()
        view.draw(fair, null, TIERS[tier])
        expect(view.count, 'the fair is still drawn').toBeGreaterThan(20)
      }
    }
    expect(canvases.made()).toBe(before)
    view.resize(SIZES[1].w, SIZES[1].h, 1.5, RATIO)
    expect(canvases.made() - before).toBeGreaterThan(30)
  })

  it('never paints with a blur inside a frame: not for a new thing, a hop, a full basket or a walk', () => {
    const { view, surface } = viewAt(SIZES[0])
    for (const place of PLACES) {
      const fair = busiest(place)
      // Painted with blur when the surface took its shape; from here on, every frame is watched.
      const before = blurredPaint()
      let pictures = canvases.made()
      const frame = () => { fair.step(1 / 30); surface.reset(); view.draw(fair, null, TIERS[0]) }
      frame()
      // New things, made by touch: a fold, a bundle, a tin, a colour; a thing taken out of the basket and given; a walk.
      if (place === 'star') { fair.press(STAR.x, STAR.y); fair.release(true) }
      if (place !== 'door' && place !== 'candle') { fair.press(SIZE_X[0], SOURCE.y); fair.release(true); frame(); fair.press(SIZE_X[2], SOURCE.y); fair.release(true) }
      frame()
      fair.press(slotAt(0).x, slotAt(0).y); fair.move(FOLK.goat.touch.x, FOLK.goat.touch.y); fair.release(true)
      for (let i = 0; i < 90; i++) frame()
      fair.press(WALK.right.x, WALK.right.y); fair.release(true)
      for (let i = 0; i < 60; i++) frame()
      expect(blurredPaint(), place).toBe(before)
      if (place === 'star') expect(canvases.made(), 'and things were painted in those frames').toBeGreaterThan(pictures)
      pictures = canvases.made()
    }
  })

  it('draws the hall alone before the slot has been read, and nothing on a surface with no size', () => {
    const { view, surface } = viewAt(SIZES[0])
    surface.reset()
    view.draw(null, null, TIERS[0])
    expect([surface.stamps.length, view.count]).toEqual([1, 1])
    const none = new FairView({ getContext: () => recording() })
    none.resize(0, 0, 2)
    none.draw(busiest('candle'), null, TIERS[0])
    expect(none.count).toBe(0)
  })

  it('sheds live light and the snow on the lower tiers, and still draws the same fair', () => {
    const { view, surface } = viewAt(SIZES[0])
    const counts = TIERS.map((tier) => { const fair = busiest('star'); surface.reset(); view.draw(fair, null, tier); return view.count })
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
    expect(counts[counts.length - 1]).toBeLessThan(counts[0])
    expect(STALLS).toHaveLength(4)
    expect(run).toBeTypeOf('function')
    expect(BASKET.slots).toBe(6)
  })
})
