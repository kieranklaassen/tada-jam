import { describe, expect, it } from 'vitest'
import { DOOR, ENDING, LIFT } from './fair'
import { BASKET, FOLK, HANDS, REST, WHO } from './hall'
import { handAt } from './holds'
import { meetingSeconds } from './meetings'
import { BENCH, DOORWAY, PLACES, RING, SNOW, STALLS, WALK, neighbour, slotAt } from './places'
import { overSill } from './playing'
import { DT, Finger, SURFACES, carry, drag, fairAt, lift, made, run, seen, tap } from './probe'
import { Fair } from './fair'
import { MARK, isMade } from './things'

const GIVE = { x: FOLK.baker.touch.x, y: 300 }
// The basket is taken by its wicker, under the things that lie in it.
const HOOK = { x: BASKET.x, y: 668 }
const SILL = { x: SNOW.x, y: SNOW.y - 80 }
const names = (fair: Fair): string[] => fair.takeSounds().map((sound) => sound.name)

/** A fair in the middle of each kind of scene. */
const SCENES: Record<string, () => Fair> = {
  meeting: () => { const fair = fairAt('candle', (save) => { save.basket = [made('candle', 1)] }); drag(fair, slotAt(0), GIVE); return fair },
  walk: () => { const fair = fairAt('star'); tap(fair, WALK.right.x, WALK.right.y); return fair },
  ending: () => { const fair = fairAt('door', (save) => { save.basket = [made('star')]; save.held.goat = made('wreath') }); drag(fair, HOOK, SILL); return fair },
  again: () => { const fair = fairAt('door', (save) => { save.finished = true; save.basket = [made('star')] }); tap(fair, SNOW.x, SNOW.y - 40); return fair },
}

describe('every scene', () => {
  it('is saved as it starts: the save already holds its outcome, and asks to be written at once', () => {
    for (const [name, start] of Object.entries(SCENES)) {
      const fair = start()
      expect(fair.playing, name).toBe(true)
      expect(fair.takeChange(), name).toBe(2)
      const atStart = JSON.stringify(fair.toSave())
      run(fair, 12)
      expect(fair.playing, name).toBe(false)
      expect(JSON.stringify(fair.toSave()), name).toBe(atStart)
      expect(fair.takeChange(), name).toBe(0)
    }
  })

  it('is ended by any touch, wherever it lands, and is silent from that frame on', () => {
    for (const [name, start] of Object.entries(SCENES)) {
      for (const seconds of [0, 0.2, 0.5, 1.4]) {
        const fair = start()
        run(fair, seconds)
        fair.takeSounds()
        fair.takeCut()
        // A touch on the wall, where nothing of the scene is.
        const under = fair.playing
        fair.press(590, 60)
        expect(fair.playing, name).toBe(false)
        expect(fair.takeCut(), name).toBe(under)
        const heard = fair.takeSounds()
        expect(heard.filter((sound) => sound.scene), `${name} at ${seconds}`).toEqual([])
        fair.release(true)
        for (let t = 0; t < 12; t += DT) {
          fair.step(DT)
          expect(fair.takeSounds().filter((sound) => sound.scene), `${name} at ${seconds}`).toEqual([])
        }
      }
    }
  })

  it('ends where it was going: ended by a touch or watched to its end, the fair stands the same', () => {
    for (const [name, start] of Object.entries(SCENES)) {
      const watched = start(), ended = start()
      run(watched, 14)
      run(ended, 0.3)
      ended.press(590, 60)
      ended.release(true)
      run(ended, 14)
      const a = seen(watched) as Record<string, unknown>, b = seen(ended) as Record<string, unknown>
      for (const key of ['save', 'shown', 'slide', 'door', 'glow', 'flight', 'swell', 'motes', 'playing']) expect(b[key], `${name}: ${key}`).toEqual(a[key])
    }
  })

  it('marks every one of its sounds as the scene, so the Mount can cut what still rings', () => {
    for (const [name, start] of Object.entries(SCENES)) {
      const fair = start()
      fair.takeSounds()
      let heard = 0
      for (let t = 0; t < 12; t += DT) {
        fair.step(DT)
        for (const sound of fair.takeSounds()) { heard += 1; expect(sound.scene, `${name}: ${sound.name}`).toBe(true) }
      }
      expect(heard, name).toBeGreaterThan(0)
    }
  })

  it('never replays on load: a fair loaded from the save of a scene under way is at rest, with the outcome', () => {
    for (const [name, start] of Object.entries(SCENES)) {
      const fair = start()
      run(fair, 0.4)
      const loaded = new Fair(fair.toSave())
      expect(loaded.playing, name).toBe(false)
      expect([loaded.slide, loaded.flight], name).toEqual([null, null])
      run(loaded, 20)
      expect(loaded.takeSounds(), name).toEqual([])
      expect(loaded.playing, name).toBe(false)
    }
  })
})

describe('a meeting', () => {
  it('saves the mark at once and shows it only when the reaction leaves it', () => {
    const fair = SCENES.meeting()
    expect(fair.held.baker?.mark).toBe(MARK.blown)
    expect(fair.basket).toHaveLength(0)
    // The candle is in the air, then in his hand, still burning.
    expect(fair.shown.baker).toBeNull()
    run(fair, 0.5)
    expect(fair.shown.baker?.mark).toBe(MARK.none)
    run(fair, 1)
    expect(fair.shown.baker?.mark).toBe(MARK.blown)
    run(fair, meetingSeconds('baker', made('candle', 1)))
    expect(fair.playing).toBe(false)
    expect(fair.shown.baker).toEqual(fair.held.baker)
  })

  it('gives a thing from the bench it was made at, and the bench is fresh again', () => {
    const fair = fairAt('candle', (save) => { save.candle = made('candle', 2) as typeof save.candle })
    fair.press(REST.x, REST.y)
    fair.move(FOLK.maker.touch.x, 130)
    run(fair, 1.2)
    lift(fair)
    expect(fair.held.maker?.craft).toBe('candle')
    expect(isMade(fair.pieces.candle)).toBe(false)
    expect(fair.playing).toBe(true)
  })

  it('reaches all five from the dipping stick, the bundle at the far edge included', () => {
    for (const who of WHO) {
      const fair = fairAt('candle', (save) => { save.candle = made('candle') as typeof save.candle })
      const touch = FOLK[who].touch
      fair.press(REST.x, REST.y)
      fair.move(touch.x, who === 'maker' || who === 'baker' ? 130 : touch.y)
      run(fair, 1.5)
      lift(fair)
      expect(fair.held[who]?.craft, who).toBe('candle')
    }
  })

  it('eats a biscuit where the grid says so: the hand is empty in the save from the start, and to the eye once it is gone', () => {
    const fair = fairAt('star', (save) => { save.basket = [made('biscuit')] })
    drag(fair, slotAt(0), FOLK.goat.touch)
    expect(fair.held.goat).toBeNull()
    run(fair, 0.4)
    expect(fair.shown.goat?.craft).toBe('biscuit')
    run(fair, 3)
    expect(fair.shown.goat).toBeNull()
  })

  it('is nobody else\'s business: while one of them has its thing, the other four stand as if nothing had been given, and only their eyes go after what moves', () => {
    for (const who of WHO) {
      const given = fairAt('star', (save) => { save.basket = [made('wreath', 1)] }), kept = fairAt('star', (save) => { save.basket = [made('wreath', 1)] })
      drag(given, slotAt(0), FOLK[who].touch)
      // The same finger, let go over bare wall: the wreath goes back where it lay.
      drag(kept, slotAt(0), { x: 590, y: 120 })
      expect(given.held[who]?.craft, who).toBe('wreath')
      expect(kept.basket).toHaveLength(1)
      for (let i = 0; i < 300; i++) {
        given.step(DT); kept.step(DT)
        for (const other of WHO) {
          // The crumbs of a biscuit fired from the bell land on the goat: the one cell that touches a second fair-goer, and no wreath does.
          if (other === who) continue
          const body = (fair: Fair) => ({ ...fair.folk.pose(other), lookX: 0, lookY: 0 })
          expect(body(given), `${other}, while ${who} has it`).toEqual(body(kept))
        }
      }
    }
  })

  it('is no verdict: whatever is given, the save keeps no tally, and the same thing given twice plays the same', () => {
    const play = () => { const fair = SCENES.meeting(); const heard: string[] = []; for (let t = 0; t < 6; t += DT) { fair.step(DT); heard.push(...names(fair)) } return heard }
    expect(play()).toEqual(play())
    const save = SCENES.meeting().toSave()
    expect(Object.keys(save).sort()).toEqual(['at', 'basket', 'biscuit', 'candle', 'chance', 'finished', 'held', 'position', 'pot', 'star', 'uncovered', 'v', 'wreath'])
  })
})

describe('the walk', () => {
  it('goes round the hall both ways from every place, and is saved where it is going', () => {
    for (const place of PLACES) for (const dir of [-1, 1] as const) {
      const fair = fairAt(place)
      const lantern = dir < 0 ? WALK.left : WALK.right
      tap(fair, lantern.x, lantern.y)
      expect(fair.toSave().at, `${place} ${dir}`).toBe(neighbour(place, dir))
      expect(fair.slide?.from).toBe(place)
      run(fair, 2)
      expect(fair.slide).toBeNull()
      expect(fair.at).toBe(neighbour(place, dir))
    }
  })

  it('is heard as a lantern lit, three shuffled steps and an arrival, each on the game clock', () => {
    const fair = SCENES.walk()
    const heard: string[] = names(fair)
    for (let t = 0; t < 2; t += DT) { fair.step(DT); heard.push(...names(fair)) }
    // The lantern answers the finger that lands on it; the walk is heard from the lift.
    expect(heard).toEqual(['lantern', 'walkLight', 'shuffle', 'shuffle', 'shuffle', 'arrive'])
  })

  it('takes a second tap on the lantern as the next step along: a walk under way is ended and the next begins', () => {
    const fair = SCENES.walk()
    run(fair, 0.3)
    tap(fair, WALK.right.x, WALK.right.y)
    expect(fair.at).toBe('biscuit')
    expect(fair.slide?.from).toBe('wreath')
  })
})

describe('the ending and the next fair', () => {
  it('needs the basket carried over the sill: let go short of it, the basket goes back on its hook', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] })
    drag(fair, HOOK, { x: DOORWAY.right + 60, y: 600 })
    expect(fair.finished).toBe(false)
    expect(names(fair)).toContain('hookOn')
    expect(fair.playing).toBe(false)
  })

  it('finishes the fair with whatever is in the basket, an empty one included, and every hand keeps its thing', () => {
    for (const things of [[], [made('star'), made('candle')]]) {
      const fair = fairAt('door', (save) => { save.basket = things; save.held.tuba = made('wreath') })
      drag(fair, HOOK, SILL)
      expect(fair.finished).toBe(true)
      expect(fair.basket).toHaveLength(things.length)
      expect(fair.held.tuba?.craft).toBe('wreath')
      run(fair, 12)
      expect([fair.doorTo, fair.glow]).toEqual([DOOR.ajar, 1])
    }
  })

  it('waits for the child: a finished fair starts nothing by itself, however long it stands', () => {
    const fair = fairAt('door', (save) => { save.finished = true; save.basket = [made('star')] })
    const before = JSON.stringify(fair.toSave())
    run(fair, 180)
    expect(JSON.stringify(fair.toSave())).toBe(before)
    expect(fair.takeSounds()).toEqual([])
    expect(fair.playing).toBe(false)
    // Nor does a touch anywhere but on the basket in the snow.
    tap(fair, 300, 300)
    tap(fair, WALK.left.x, WALK.left.y)
    run(fair, 3)
    expect(fair.finished).toBe(true)
    expect(fair.basket).toHaveLength(1)
  })

  it('begins the next fair on a touch of the basket in the snow: everything fresh, the cloths as they were, at the candle stall', () => {
    const fair = fairAt('door', (save) => { save.finished = true; save.basket = [made('star')]; save.held.goat = made('wreath'); save.star = made('star', 2) as typeof save.star; save.uncovered.star = true; save.uncovered.candle = false })
    tap(fair, SNOW.x, SNOW.y - 40)
    const save = fair.toSave()
    expect([save.finished, save.at, save.basket, save.held.goat]).toEqual([false, 'candle', [], null])
    for (const stall of STALLS) expect(isMade(save[stall]), stall).toBe(false)
    expect([save.uncovered.star, save.uncovered.candle]).toEqual([true, false])
    // The paper that was out stays out.
    expect(save.star.colour).toBe(2)
  })

  it('does not begin the next fair with the finger that set the basket down, nor with any touch inside the ending: the basket rocks, and keeps everything', () => {
    for (const surface of SURFACES) {
      const fair = fairAt('door', (save) => { save.basket = [made('star')]; save.held.goat = made('wreath') })
      const finger = new Finger(fair, surface), basket = { x: SNOW.x, y: SNOW.y - 40 }
      finger.down(HOOK)
      finger.to(SILL)
      finger.up()
      finger.wait(LIFT.seconds + 0.05)
      expect([fair.finished, fair.playing]).toEqual([true, true])
      // The finger comes straight down again where it let go: the ending is ended, as by any touch, and that is all.
      finger.down(basket)
      expect(fair.playing).toBe(false)
      expect(names(fair)).toContain('basketPoke')
      finger.up()
      // And again and again, for as long as the ending would have lasted: a hold, a tap, a drum of taps.
      finger.wait(0.3)
      finger.down(basket)
      finger.wait(1.5)
      finger.up()
      for (let n = 0; n < 8; n++) { finger.wait(0.4); finger.down(basket); finger.up() }
      expect(fair.out).toBeLessThan(ENDING.seconds)
      expect(fair.glow).toBe(0)
      expect([fair.finished, fair.at, fair.basket.length, fair.held.goat?.craft]).toEqual([true, 'door', 1, 'wreath'])
      // The halo comes up at the ending's own time, and then one fresh tap begins the next fair.
      finger.wait(ENDING.seconds)
      expect(fair.glow).toBe(1)
      expect(fair.finished).toBe(true)
      finger.down(basket)
      finger.up()
      expect([fair.finished, fair.at, fair.basket.length, fair.held.goat]).toEqual([false, 'candle', 0, null])
    }
  })

  it('does not begin the next fair with a finger that was down before the ending was over, or that slides off the basket', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] })
    const finger = new Finger(fair), basket = { x: SNOW.x, y: SNOW.y - 40 }
    finger.down(HOOK)
    finger.to(SILL)
    finger.up()
    // Watched nearly to its end, then a finger lands and stays past it.
    finger.wait(ENDING.seconds - 0.4)
    finger.down(basket)
    finger.wait(2)
    finger.up()
    expect(fair.finished).toBe(true)
    // A finger that lands on the basket and leaves it has not tapped it.
    finger.down(basket)
    finger.to({ x: 200, y: 300 })
    finger.up()
    finger.wait(0.5)
    expect(fair.finished).toBe(true)
    finger.down(basket)
    finger.up()
    expect(fair.finished).toBe(false)
  })

  it('takes the mat and the sill for the hall: the ending needs the basket let go past the sill, on the snow', () => {
    for (const at of [{ x: SNOW.x, y: DOORWAY.sill + 20 }, { x: SNOW.x, y: DOORWAY.sill - 20 }, { x: SNOW.x, y: DOORWAY.sill - 70 }, { x: DOORWAY.left - 30, y: SILL.y }, { x: SNOW.x, y: 300 }]) {
      const fair = fairAt('door', (save) => { save.basket = [made('star')] })
      drag(fair, HOOK, at)
      expect(fair.finished, `${at.x}, ${at.y}`).toBe(false)
      expect(overSill(at), `${at.x}, ${at.y}`).toBe(false)
    }
    // Where the basket stands in the snow, and round it.
    for (const at of [SILL, { x: SNOW.x - 80, y: SILL.y - 60 }, { x: SNOW.x + 80, y: SILL.y + 20 }]) {
      const fair = fairAt('door', (save) => { save.basket = [made('star')] })
      drag(fair, HOOK, at)
      expect(fair.finished, `${at.x}, ${at.y}`).toBe(true)
    }
  })

  it('makes no sound of a basket that is not there: at a stall of a finished fair nothing creaks, rocks or is laid in', () => {
    for (const stall of STALLS) {
      const fair = fairAt(stall, (save) => { save.finished = true; save.basket = [0, 1, 2, 0, 1, 2].map((c) => made('star', c)); for (const who of WHO) save.held[who] = made('wreath'); (save as Record<string, unknown>)[stall] = made(stall, 1) })
      const heard: string[] = []
      const listen = () => { run(fair, 0.6); heard.push(...names(fair)); expect(fair.basketShake.x, stall).toBe(0) }
      // Where the basket would stand, a hand that is full, the bench, and a thing out of a hand onto the bench.
      for (let i = 0; i < 6; i++) { tap(fair, slotAt(i).x, slotAt(i).y); listen() }
      if (stall === 'candle') { fair.press(REST.x, REST.y); fair.move(BASKET.x, 260); run(fair, 1); lift(fair); listen(); fair.press(REST.x, REST.y); fair.move(HANDS.maker.x, HANDS.maker.y); run(fair, 1); lift(fair); listen() }
      else { drag(fair, BENCH[stall].x === RING.x && stall === 'wreath' ? { x: RING.x, y: RING.y - RING.r } : BENCH[stall], { x: BASKET.x, y: 610 }); listen(); drag(fair, stall === 'wreath' ? { x: RING.x, y: RING.y - RING.r } : BENCH[stall], HANDS.baker); listen() }
      drag(fair, handAt('baker', 'wreath'), BENCH[stall]); listen()
      expect(heard.filter((name) => name.startsWith('basket')), stall).toEqual([])
      expect(fair.basket, stall).toHaveLength(6)
    }
  })

  it('keeps a finished basket shut: nothing is laid in it and nothing taken out until the next fair', () => {
    const fair = fairAt('star', (save) => { save.finished = true; save.basket = [made('candle')]; save.star = made('star') as typeof save.star })
    carry(fair, { x: 590, y: 330 + 86 }, { x: BASKET.x, y: 610 })
    fair.release(true)
    expect(fair.basket).toHaveLength(1)
    expect(isMade(fair.pieces.star)).toBe(true)
  })
})
