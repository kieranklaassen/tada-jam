import { describe, expect, it } from 'vitest'
import { pullOff, ringPoint } from './benches'
import { Fair } from './fair'
import { BASKET, FOLK, POT, REST } from './hall'
import { BENCH, BOARD, COLOUR_X, SNOW, SOURCE, STAR, WALK, slotAt } from './places'
import { DT, carry, drag, fairAt, lift, made, run, seen, tap } from './probe'
import { deserialize, serialize } from './save'

const SILL = { x: SNOW.x, y: SNOW.y - 80 }, HOOK = { x: BASKET.x, y: 560 }

/** Every state a put-away can land in, by name. Each returns the fair at that instant. */
const STATES: Record<string, () => Fair> = {
  'a first visit, nothing touched': () => fairAt('candle', () => {}, 4),
  'the candle under the wax': () => { const fair = fairAt('candle'); fair.press(REST.x, REST.y); fair.move(POT.x, POT.y + 200); run(fair, 1.5); return fair },
  'the candle lifted and dripping': () => { const fair = fairAt('candle'); fair.press(REST.x, REST.y); fair.move(POT.x, POT.y + 200); run(fair, 1); fair.move(POT.x, 200); run(fair, 0.4); return fair },
  'a finger folding the star': () => { const fair = fairAt('star'); fair.press(STAR.x, STAR.y); run(fair, 0.05); return fair },
  'icing half piped': () => { const fair = fairAt('biscuit'); tap(fair, BOARD.x, BOARD.y); fair.press(BOARD.x - 30, BOARD.y); fair.move(BOARD.x, BOARD.y); return fair },
  'a thing from the bench in the hand': () => { const fair = fairAt('star', (save) => { save.star = made('star') as typeof save.star }); carry(fair, pullOff(fair.pieces.star), { x: 700, y: 500 }); return fair },
  'a thing from the basket in the hand': () => { const fair = fairAt('wreath', (save) => { save.basket = [made('candle'), made('star')] }); carry(fair, slotAt(1), { x: 500, y: 300 }); return fair },
  'a thing from a hand in the hand': () => { const fair = fairAt('wreath', (save) => { save.held.maker = made('biscuit') }); carry(fair, FOLK.maker.touch, { x: 600, y: 200 }); return fair },
  'a finger pressed on a thing in the basket': () => { const fair = fairAt('candle', (save) => { save.basket = [made('star')] }); fair.press(slotAt(0).x, slotAt(0).y); return fair },
  'a thing flying into the basket': () => { const fair = fairAt('star', (save) => { save.star = made('star') as typeof save.star }); drag(fair, pullOff(fair.pieces.star), { x: BASKET.x, y: 540 }); return fair },
  'a thing through the wax and back': () => { const fair = fairAt('candle', (save) => { save.basket = [made('star')] }); drag(fair, slotAt(0), BENCH.candle); run(fair, 0.2); return fair },
  'a meeting just begun': () => { const fair = fairAt('candle', (save) => { save.basket = [made('candle', 1)] }); drag(fair, slotAt(0), { x: FOLK.baker.touch.x, y: 300 }); return fair },
  'a meeting half way': () => { const fair = STATES['a meeting just begun'](); run(fair, 1); return fair },
  'a meeting that eats the thing': () => { const fair = fairAt('star', (save) => { save.basket = [made('biscuit')] }); drag(fair, slotAt(0), FOLK.goat.touch); run(fair, 0.3); return fair },
  'the walk half way': () => { const fair = fairAt('star'); tap(fair, WALK.left.x, WALK.left.y); run(fair, 0.5); return fair },
  'the basket off its hook': () => { const fair = fairAt('door', (save) => { save.basket = [made('star')] }); carry(fair, HOOK, SILL); return fair },
  'the basket let go and hanging for a moment': () => { const fair = STATES['the basket off its hook'](); fair.release(true); run(fair, 0.1); return fair },
  'a thing let go and hanging for a moment': () => { const fair = STATES['a thing from the basket in the hand'](); fair.release(true); run(fair, 0.1); return fair },
  'the candle let go and hanging for a moment': () => { const fair = STATES['the candle lifted and dripping'](); fair.release(true); run(fair, 0.1); return fair },
  'a piece rubbed and then pulled off its bench': () => { const fair = fairAt('wreath', (save) => { save.wreath = made('wreath') as typeof save.wreath }); carry(fair, ringPoint(7), ringPoint(9)); fair.move(760, 180); return fair },
  'the ending just begun': () => { const fair = STATES['the basket off its hook'](); lift(fair); return fair },
  'the ending ended by a touch': () => { const fair = STATES['the ending just begun'](); run(fair, 2); tap(fair, 300, 300); run(fair, 1); return fair },
  'the ending half way': () => { const fair = STATES['the ending just begun'](); run(fair, 4); return fair },
  'the finished fair': () => { const fair = STATES['the ending just begun'](); run(fair, 12); return fair },
  'the next fair just begun': () => { const fair = STATES['the finished fair'](); tap(fair, SNOW.x, SNOW.y - 40); run(fair, 0.3); return fair },
  'a cloth in the air': () => { const fair = fairAt('wreath', () => {}, 4); tap(fair, COLOUR_X[1], SOURCE.y); run(fair, 0.1); return fair },
  'wax just poured': () => { const fair = fairAt('candle'); tap(fair, COLOUR_X[2], SOURCE.y); run(fair, 0.1); return fair },
}

describe('found as left', () => {
  it('parked equals loaded, in every state: a put-away leaves the fair exactly as a load of its save finds it', () => {
    for (const [name, state] of Object.entries(STATES)) {
      const fair = state()
      fair.park()
      const loaded = new Fair(deserialize(JSON.parse(JSON.stringify(serialize(fair.toSave()))), 7, 99))
      expect(seen(fair), name).toEqual(seen(loaded))
    }
  })

  it('loses nothing at a put-away: what the save held at that instant is what it holds after, but for a thing the child had just let go, which lands', () => {
    for (const [name, state] of Object.entries(STATES)) {
      // A thing let go and still hanging is the child's move: it lands where it hangs (grace.test.ts), and nothing of it is lost.
      if (name.endsWith('hanging for a moment')) {
        const fair = state(), things = (f: Fair) => f.basket.length + Object.values(f.held).filter(Boolean).length + (f.pieces.wreath.on ? 1 : 0)
        const had = things(fair)
        fair.park()
        expect(things(fair), name).toBe(had)
        continue
      }
      const fair = state()
      const before = JSON.stringify(fair.toSave())
      fair.park()
      expect(JSON.stringify(fair.toSave()), name).toBe(before)
    }
  })

  it('starts nothing and sounds nothing on load or after a put-away, however long it then stands', () => {
    for (const [name, state] of Object.entries(STATES)) {
      const fair = state()
      fair.park()
      expect(fair.takeSounds(), name).toEqual([])
      const save = JSON.stringify(fair.toSave())
      for (let t = 0; t < 30; t += DT) fair.step(DT)
      expect(fair.takeSounds(), name).toEqual([])
      expect(fair.playing, name).toBe(false)
      expect(JSON.stringify(fair.toSave()), name).toBe(save)
    }
  })

  it('settles at a put-away what a load settles: nothing in the hand, in the air or waiting, and the clock at nought', () => {
    for (const [name, state] of Object.entries(STATES)) {
      const fair = state()
      fair.park()
      expect([fair.inHand, fair.pending, fair.finger, fair.flight, fair.slide, fair.scene, fair.swell, fair.motes.length, fair.time], name).toEqual([false, null, null, null, null, null, null, 0, 0])
      // And the scene that was cut says so, for the Mount to close what still rings.
      expect(fair.takeCut(), name).toBe(true)
    }
  })

  it('keeps a thing in the hand where it came from: nothing is saved in the air', () => {
    const basket = STATES['a thing from the basket in the hand']()
    expect(basket.toSave().basket.map((thing) => thing.craft)).toEqual(['candle', 'star'])
    const hand = STATES['a thing from a hand in the hand']()
    expect(hand.toSave().held.maker?.craft).toBe('biscuit')
    // To the eye she has let it go; in the save she holds it until it lands somewhere.
    expect(hand.shown.maker).toBeNull()
    hand.park()
    expect(hand.shown.maker?.craft).toBe('biscuit')
  })
})

describe('a touch that is taken away', () => {
  it('never acts: whatever was in the hand goes back unheard, and the save is as it was while it was held', () => {
    const cases: [string, () => Fair, (fair: Fair) => void][] = [
      ['a thing over the basket', () => fairAt('star', (save) => { save.star = made('star') as typeof save.star }), (fair) => carry(fair, pullOff(fair.pieces.star), { x: BASKET.x, y: 540 })],
      ['a thing over a fair-goer', () => fairAt('star', (save) => { save.basket = [made('biscuit')] }), (fair) => carry(fair, slotAt(0), FOLK.goat.touch)],
      ['a thing over another bench', () => fairAt('wreath', (save) => { save.basket = [made('candle')] }), (fair) => carry(fair, slotAt(0), { x: 590, y: 350 })],
      ['the basket over the sill', () => fairAt('door', (save) => { save.basket = [made('star')] }), (fair) => carry(fair, HOOK, SILL)],
      ['a finger on a thing in the basket', () => fairAt('star', (save) => { save.basket = [made('star', 2)] }), (fair) => fair.press(slotAt(0).x, slotAt(0).y)],
      ['the candle held up to the baker', () => fairAt('candle', (save) => { save.candle = made('candle') as typeof save.candle }), (fair) => { fair.press(REST.x, REST.y); fair.move(FOLK.baker.touch.x, 130); run(fair, 1) }],
    ]
    for (const [name, start, touch] of cases) {
      const fair = start()
      touch(fair)
      // Work done under the finger is kept; what the finger carries is still where it came from.
      const before = JSON.stringify(fair.toSave())
      fair.takeSounds()
      fair.release(false)
      expect(JSON.stringify(fair.toSave()), name).toBe(before)
      expect(fair.playing, name).toBe(false)
      expect(fair.takeSounds(), name).toEqual([])
      expect([fair.inHand, fair.pending, fair.finger], name).toEqual([false, null, null])
    }
  })
})

describe('a touch', () => {
  it('leaves no flag behind it: once the finger is up, nothing is pending, and the next touch starts clean', () => {
    const fair = fairAt('candle', (save) => { save.basket = [made('star'), made('wreath')] })
    fair.press(slotAt(0).x, slotAt(0).y)
    expect(fair.pending).not.toBeNull()
    // A second press somewhere else, without the first being let go, drops what the first was waiting for.
    fair.press(590, 60)
    expect(fair.pending).toBeNull()
    fair.release(true)
    expect(fair.basket).toHaveLength(2)
    // A press on a hand that holds something, lifted without moving, is a poke and takes nothing.
    const held = fairAt('candle', (save) => { save.held.maker = made('star') })
    tap(held, FOLK.maker.touch.x, FOLK.maker.touch.y)
    expect(held.pending).toBeNull()
    expect(held.held.maker?.craft).toBe('star')
    held.move(600, 300)
    expect(held.carry).toBeNull()
  })
})
