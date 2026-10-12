import { describe, expect, it } from 'vitest'
import { bubblesOf, waxTall } from './benchView'
import { bareWick } from './candle'
import { BUBBLES, LEVEL } from './dipping'
import { ENDING, LIFT, type Fair } from './fair'
import { BASKET, COUNTER, FOLK, HANDS, POT, REST, STICK, WHO, type Who } from './hall'
import { answerOf } from './natures'
import { BENCH, EMBERS, RING, SNOW, STALLS, STAR, WALK, handOf, inEmbers, onRack, slotAt, spotAt, type Place } from './places'
import { DT, Finger, SURFACES, drag, fairAt, lift, made, run, tap } from './probe'
import { MARK, isMade, type CandleThing, type Star, type Wreath } from './things'
import { HALO, haloPulse } from './view'

// What answers a touch, and what does not happen without being seen: the
// painted props, a finished fair at a stall, a walking lantern under a thumb
// at rest, the one droop of a melt, the halo that stands still, and sounds
// that have their sight.

const names = (fair: Fair): string[] => fair.takeSounds().map((sound) => sound.name)
const nearest = (x: number, y: number): Who => [...WHO].sort((a, b) => Math.hypot(x - FOLK[a].eyes.x, y - FOLK[a].eyes.y) - Math.hypot(x - FOLK[b].eyes.x, y - FOLK[b].eyes.y))[0]

/** Painted things at each place, by where they are drawn: none of them is a target of the game. */
const PROPS: { place: Place; name: string; x: number; y: number }[] = [
  { place: 'candle', name: 'the embers under the pot', x: EMBERS.x, y: EMBERS.y },
  { place: 'candle', name: 'a candle on the left rail', x: 470, y: 200 },
  { place: 'candle', name: 'a candle on the right rail', x: 710, y: 220 },
  { place: 'candle', name: 'the ball of wick', x: 796, y: 756 },
  { place: 'star', name: 'the counter beside the pane', x: 380, y: 660 },
  { place: 'wreath', name: 'the counter under the ring', x: 420, y: 650 },
  { place: 'biscuit', name: 'the flour on the counter', x: 400, y: 664 },
  { place: 'door', name: 'the snow blown in', x: 800, y: 780 },
  { place: 'door', name: 'the broom', x: 360, y: 760 },
  { place: 'star', name: 'the wall by the easel', x: 340, y: 100 },
  { place: 'wreath', name: 'the wall over the baker', x: 640, y: 180 },
]

describe('a painted prop', () => {
  it('answers where it is touched, as what it is: sparks, a knock on wax, a knock on wood with dust, each at the place', () => {
    for (const prop of PROPS) {
      const fair = fairAt(prop.place)
      expect(spotAt(prop.x, prop.y, { place: prop.place, covered: false, things: 0, finished: false }).kind, prop.name).toBe('wall')
      fair.press(prop.x, prop.y)
      const heard = names(fair)
      expect(heard, prop.name).toHaveLength(1)
      if (prop.y > COUNTER.back || (prop.place === 'candle' && (inEmbers(prop.x, prop.y) || onRack(prop.x, prop.y)))) {
        // A drawn thing: its own sound, and something rises from the place itself.
        expect(heard[0], prop.name).not.toBe('flutter')
        expect(fair.motes.length, prop.name).toBeGreaterThan(0)
        for (const mote of fair.motes) expect(Math.hypot(mote.x - prop.x, mote.y - prop.y), prop.name).toBeLessThan(20)
      }
    }
    const embers = fairAt('candle')
    embers.press(EMBERS.x, EMBERS.y)
    expect(names(embers)).toEqual(['crackle'])
    expect(embers.motes.every((mote) => mote.kind === 'sparks')).toBe(true)
    const rack = fairAt('candle')
    rack.press(470, 200)
    expect(names(rack)).toEqual(['tick'])
  })

  it('is looked at by the fair-goer nearest to it, who leans towards the place: never answered by far flames alone', () => {
    for (const prop of PROPS) {
      const fair = fairAt(prop.place), twin = fairAt(prop.place), who = nearest(prop.x, prop.y)
      fair.press(prop.x, prop.y)
      let lean = 0, wide = 0
      for (let i = 0; i < 20; i++) {
        fair.step(DT); twin.step(DT)
        lean = Math.max(lean, (fair.folk.pose(who).lean - twin.folk.pose(who).lean) * (prop.x >= FOLK[who].x ? 1 : -1))
        wide = Math.max(wide, fair.folk.pose(who).eye - twin.folk.pose(who).eye)
      }
      expect(lean, `${prop.name}: ${who} leans to it`).toBeGreaterThan(0.004)
      expect(wide, `${prop.name}: ${who} looks`).toBeGreaterThan(0.1)
    }
  })
})

describe('a finished fair at a stall', () => {
  it('answers a bench thing offered to a full hand by showing the hand full: the fair-goer lifts what it has, and the thing goes back', () => {
    for (const who of WHO) {
      const change = (save: Parameters<Parameters<typeof fairAt>[1] & object>[0]) => { save.finished = true; save.star = made('star') as Star; for (const each of WHO) save.held[each] = made('wreath') }
      const fair = fairAt('star', change), twin = fairAt('star', change)
      // Pulled off the bench and let go on its hand.
      fair.press(STAR.x, STAR.y)
      for (let i = 1; i <= 20; i++) { fair.move(STAR.x + ((HANDS[who].x - STAR.x) * i) / 20, STAR.y + ((HANDS[who].y - STAR.y) * i) / 20); fair.step(DT); twin.step(DT) }
      fair.takeSounds()
      lift(fair)
      const heard = fair.takeSounds()
      expect(heard.map((sound) => sound.name), who).toEqual(expect.arrayContaining(['poke', 'thingBack']))
      expect(heard.find((sound) => sound.name === 'poke'), who).toMatchObject({ who, holds: 'wreath' })
      // It shows what it holds: its hands move the thing, as no other touch here makes them.
      let shown = 0
      for (let i = 0; i < 30; i++) { fair.step(DT); twin.step(DT); shown = Math.max(shown, Math.abs(fair.folk.pose(who).use - twin.folk.pose(who).use)) }
      expect(shown, who).toBeGreaterThan(0.02)
      run(fair, 1)
      expect(fair.held[who]?.craft, who).toBe('wreath')
      expect(fair.pieces.star.points, who).toBe(4)
      expect([fair.playing, fair.carry, fair.flight], who).toEqual([false, null, null])
    }
  })

  it('still takes a bench thing in a hand that is empty, and still lets every bench be worked', () => {
    const fair = fairAt('star', (save) => { save.finished = true; save.star = made('star') as Star; save.held.maker = made('wreath') })
    drag(fair, STAR, HANDS.baker)
    expect(fair.held.baker?.craft).toBe('star')
    run(fair, 6)
    tap(fair, STAR.x, STAR.y)
    expect(fair.pieces.star.points).toBe(1)
    expect(fair.finished).toBe(true)
  })
})

describe('a walking lantern', () => {
  it('lights under the finger and walks nowhere until the finger lifts from it: a thumb at rest stays where it is', () => {
    for (const place of [...STALLS, 'door'] as Place[]) for (const lantern of [WALK.left, WALK.right]) {
      const fair = fairAt(place)
      fair.press(lantern.x, lantern.y)
      expect(names(fair), place).toEqual(['lantern'])
      expect(fair.pending, place).toMatchObject({ kind: 'lantern' })
      run(fair, 3)
      expect([fair.at, fair.slide, fair.playing], place).toEqual([place, null, false])
      fair.release(true)
      expect(fair.slide?.from, place).toBe(place)
      expect(fair.at, place).not.toBe(place)
    }
  })

  it('is not tapped by a finger that slides off it, or by a touch the browser takes away', () => {
    const slid = fairAt('star')
    slid.press(WALK.left.x, WALK.left.y)
    slid.move(WALK.left.x + WALK.left.r + 30, WALK.left.y - 40)
    expect(slid.pending).toBeNull()
    slid.move(WALK.left.x, WALK.left.y)
    slid.release(true)
    expect([slid.at, slid.slide]).toEqual(['star', null])
    const taken = fairAt('star')
    taken.press(WALK.right.x, WALK.right.y)
    taken.release(false)
    expect([taken.at, taken.slide]).toEqual(['star', null])
  })

  it('walks on a tap through the touch tracker at both surfaces, a wobble within the lantern included', () => {
    for (const surface of SURFACES) {
      const fair = fairAt('wreath'), finger = new Finger(fair, surface)
      finger.down(WALK.right)
      finger.wait(0.4)
      expect(fair.at).toBe('wreath')
      finger.to({ x: WALK.right.x + 10, y: WALK.right.y - 8 })
      finger.up()
      expect(fair.at).toBe('biscuit')
    }
  })
})

describe('a melt', () => {
  /** A middling candle held under the wax until it is a bare wick; everything heard on the way. */
  function melted(): { fair: Fair; heard: string[] } {
    const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, r: save.candle.r.map(() => 14) } })
    const heard: string[] = []
    fair.press(REST.x, REST.y)
    fair.move(POT.x, STICK.maxY)
    for (let t = 0; t < 14; t += DT) { fair.step(DT); heard.push(...names(fair)) }
    return { fair, heard }
  }

  it('sinks her fist once, with one falling whistle, as the candle goes thin; the last of the wax going is a soft tick that nobody answers', () => {
    const { fair, heard } = melted()
    expect(fair.pieces.candle.r.every((r) => r === 0)).toBe(true)
    expect(heard.filter((name) => name === 'droop')).toHaveLength(1)
    expect(heard.filter((name) => name === 'bare')).toHaveLength(1)
    expect(heard.indexOf('droop')).toBeLessThan(heard.indexOf('bare'))
    // Only she answers a candle going thin, and no body has an answer to the bare wick.
    for (const who of WHO) expect(answerOf(who, 'thin') !== null, who).toBe(who === 'maker')
  })

  it('leaves every fair-goer as it was when the wick goes bare: no brow drawn down, no ears laid back', () => {
    const { fair } = melted(), twin = fairAt('candle', (save) => { save.candle = { ...save.candle, ...bareWick() } })
    twin.press(REST.x, REST.y)
    twin.move(POT.x, STICK.maxY)
    run(twin, 14)
    // Long after the whistle: both stand over a bare wick in the wax, and the two fairs' goers are in step but for her.
    for (const who of ['tuba', 'goat'] as const) {
      const a = fair.folk.pose(who), b = twin.folk.pose(who)
      expect(Math.abs(a.brow - b.brow), who).toBeLessThan(0.05)
      expect(Math.abs(a.part2 - b.part2), who).toBeLessThan(0.05)
    }
  })

  it('warns first: the wax is heard and seen to bubble at the candle before anything is lost', () => {
    const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, r: save.candle.r.map(() => 14) } })
    const before = [...fair.pieces.candle.r]
    fair.press(REST.x, REST.y)
    fair.move(POT.x, STICK.maxY)
    const heard: string[] = []
    for (let t = 0; t < 2.9; t += DT) { fair.step(DT); heard.push(...names(fair)) }
    expect(heard).toContain('bubble')
    expect(fair.dipping.bubbling).toBeGreaterThan(0.2)
    expect(fair.pieces.candle.r).toEqual(before)
  })
})

describe('the bubbles on the wax', () => {
  it('are drawn slow and few as a warning and quick and many while the candle melts, so the two can be told apart by eye', () => {
    const warn = bubblesOf(false, 3), melt = bubblesOf(true, 3)
    expect(warn).toHaveLength(BUBBLES.warn.count)
    expect(melt).toHaveLength(BUBBLES.melt.count)
    expect(warn.length * 2).toBeLessThanOrEqual(melt.length)
    // How often the first bubble bursts in ten seconds: a warning's bubble is a long time growing.
    const bursts = (melting: boolean) => { let n = 0, last = 0; for (let t = 0; t < 10; t += 0.01) { const r = bubblesOf(melting, t)[0].r; if (r < last) n += 1; last = r } return n }
    expect(bursts(false)).toBeLessThanOrEqual(6)
    expect(bursts(true)).toBeGreaterThanOrEqual(bursts(false) * 2.5)
    // A warning stays at the candle; melting is across the pot.
    expect(Math.max(...warn.map((b) => Math.abs(b.dx)))).toBeLessThanOrEqual(BUBBLES.warn.spread)
    expect(Math.max(...melt.map((b) => Math.abs(b.dx)))).toBeGreaterThan(BUBBLES.warn.spread * 2)
  })

  it('never floats the risen wax over the pot: however high it stands, its near edge is drawn on the rim, where it lies at rest', () => {
    for (const level of [0, 3, LEVEL.dipped, LEVEL.dipped + LEVEL.melted]) {
      // The surface is an ellipse as tall as the pot's mouth, stamped by its middle, which rises with the level.
      const near = POT.y - level + POT.ry * waxTall(level)
      expect(near, `level ${level}`).toBeCloseTo(POT.y + POT.ry, 6)
      // And however high, it lies clear of the two hands that are held out over the pot.
      for (let a = 0; a < 48; a++) {
        const x = POT.x + Math.cos((a / 48) * Math.PI * 2) * POT.rx, y = POT.y - level + Math.sin((a / 48) * Math.PI * 2) * POT.ry * waxTall(level)
        if (y < POT.y - level) expect(handOf(x, y), `level ${level}, at ${Math.round(x)}, ${Math.round(y)}`).toBeNull()
      }
    }
  })

  it('are the warning\'s while nothing melts and the melting\'s from the step a part melts: what is drawn follows the pot', () => {
    const fair = fairAt('candle', (save) => { save.candle = { ...save.candle, r: save.candle.r.map(() => 14) } })
    fair.press(REST.x, REST.y)
    fair.move(POT.x, STICK.maxY)
    for (let t = 0; t < 2.9; t += DT) fair.step(DT)
    expect([fair.dipping.bubbling > 0.2, fair.dipping.melting]).toEqual([true, false])
    for (let t = 0; t < 1.5; t += DT) fair.step(DT)
    expect(fair.dipping.melting).toBe(true)
  })
})

describe('the halo on the snow basket', () => {
  it('pulses a few times as it comes up, each swell smaller, and then stands still', () => {
    const seconds = (HALO.pulses * Math.PI * 2) / HALO.rate
    let swells = 0, last = 0
    for (let t = 0; t < seconds; t += 0.01) { const now = haloPulse(t); if (last <= 0 && now > 0) swells += 1; last = now }
    expect(swells).toBe(HALO.pulses)
    expect(Math.abs(haloPulse(0.7))).toBeGreaterThan(Math.abs(haloPulse(0.7 + (Math.PI * 4) / HALO.rate)))
    for (let t = seconds; t < seconds + 60; t += 0.37) expect(haloPulse(t)).toBe(0)
  })

  it('counts from the moment it stands, and a fair found finished finds it standing still', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] })
    drag(fair, { x: BASKET.x, y: 668 }, { x: SNOW.x, y: SNOW.y - 80 })
    run(fair, ENDING.seconds - 0.5)
    expect(fair.haloAge).toBe(0)
    run(fair, 2)
    expect(fair.haloAge).toBeGreaterThan(0.5)
    expect(haloPulse(fair.haloAge)).not.toBe(0)
    run(fair, 12)
    expect(haloPulse(fair.haloAge)).toBe(0)
    const found = fairAt('door', (save) => { save.finished = true })
    expect(haloPulse(found.haloAge)).toBe(0)
    run(found, 3)
    expect(haloPulse(found.haloAge)).toBe(0)
    fair.park()
    expect(haloPulse(fair.haloAge)).toBe(0)
  })

  it('has every eye on the basket out in the snow during the ending, and her fist and the mittens lean to the door', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] }), twin = fairAt('door', (save) => { save.basket = [made('star')] })
    drag(fair, { x: BASKET.x, y: 668 }, { x: SNOW.x, y: SNOW.y - 80 })
    let her = 0, mittens = 0
    for (let t = 0; t < ENDING.seconds; t += DT) {
      fair.step(DT); twin.step(DT)
      her = Math.max(her, fair.folk.pose('maker').lean - twin.folk.pose('maker').lean)
      mittens = Math.min(mittens, fair.folk.pose('bundle').lean - twin.folk.pose('bundle').lean)
    }
    // She stands left of the door and leans right, to it; the bundle sits right of it and leans left.
    expect(FOLK.maker.x).toBeLessThan(SNOW.x)
    expect(FOLK.bundle.x).toBeGreaterThan(SNOW.x)
    expect(her).toBeGreaterThan(0.01)
    expect(mittens).toBeLessThan(-0.01)
    expect(fair.sight()).toMatchObject({ x: SNOW.x, y: SNOW.y - 40 })
    // Those to the left of the door look right, those to its right look left.
    for (const who of WHO) expect(Math.sign(fair.folk.pose(who).lookX), who).toBe(Math.sign(SNOW.x - FOLK[who].eyes.x))
  })
})

describe('a sound', () => {
  it('is not a chime for a candle that gives no light: blown out or chewed, it knocks on the pane behind the star', () => {
    for (const mark of [MARK.none, MARK.blown, MARK.chewed]) {
      const fair = fairAt('star', (save) => { save.star = made('star') as Star; save.basket = [{ ...(made('candle') as CandleThing), mark }] })
      drag(fair, slotAt(0), BENCH.star)
      const heard = names(fair)
      expect(fair.pieces.star.on?.craft).toBe('candle')
      expect(heard.includes('chime'), `mark ${mark}`).toBe(mark === MARK.none)
      expect(heard.includes('glassTap'), `mark ${mark}`).toBe(mark !== MARK.none)
    }
  })

  it('is not needles from a bare ring: a candle set in bare straw knocks, and nothing green flies', () => {
    const bare = fairAt('wreath', (save) => { save.wreath = { ...(made('wreath') as Wreath), twigs: new Array<number>(12).fill(0), on: made('star') }; save.basket = [made('candle')] })
    expect(isMade(bare.pieces.wreath)).toBe(true)
    drag(bare, slotAt(0), RING)
    expect(bare.pieces.wreath.on?.craft).toBe('candle')
    const heard = names(bare)
    expect(heard).not.toContain('needles')
    expect(heard).toContain('thock')
    expect(bare.motes.filter((mote) => mote.kind === 'needles')).toEqual([])
    const green = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath; save.basket = [made('candle')] })
    drag(green, slotAt(0), RING)
    expect(names(green)).toContain('needles')
    expect(green.motes.some((mote) => mote.kind === 'needles')).toBe(true)
  })

  it('has no second part after a walk has begun: what was still to sound of the place that is left is not heard at the next', () => {
    const fair = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath; save.basket = [made('candle')] })
    drag(fair, slotAt(0), RING)
    names(fair)
    // The knock that follows the needles is due in a third of a second; the child walks on before it.
    fair.press(WALK.right.x, WALK.right.y)
    expect(names(fair)).toEqual(['lantern'])
    fair.release(true)
    expect(fair.slide).not.toBeNull()
    const heard: string[] = []
    for (let t = 0; t < 2; t += DT) { fair.step(DT); heard.push(...names(fair)) }
    expect(heard).not.toContain('thock')
    expect(heard.every((name) => ['walkLight', 'shuffle', 'arrive'].includes(name))).toBe(true)
    // Left alone, the same knock is heard.
    const stays = fairAt('wreath', (save) => { save.wreath = made('wreath') as Wreath; save.basket = [made('candle')] })
    drag(stays, slotAt(0), RING)
    names(stays)
    run(stays, 1)
    expect(names(stays)).toContain('thock')
  })

  it('ends its scene only on a later touch: a finger that lands far off inside the grace lets the thing go, and the giving it starts plays', () => {
    for (const surface of SURFACES) {
      const fair = fairAt('star', (save) => { save.basket = [made('biscuit')] }), finger = new Finger(fair, surface)
      finger.down(slotAt(0))
      finger.to(HANDS.goat)
      finger.up()
      finger.wait(LIFT.seconds / 2)
      expect(fair.playing).toBe(false)
      // Far from where it lifted, on the wall: a touch of its own.
      finger.down({ x: 640, y: 60 })
      expect(fair.playing, 'the giving plays').toBe(true)
      expect(fair.takeCut()).toBe(false)
      expect(fair.basket).toHaveLength(0)
      finger.up()
      // The goat is seen to take the biscuit and eat it: the scene runs on its beats.
      finger.wait(0.6)
      expect(fair.playing).toBe(true)
      const heard = names(fair)
      expect(heard).toContain('take')
      // A later touch ends it, as a touch ends any scene.
      finger.down({ x: 640, y: 60 })
      expect(fair.playing).toBe(false)
      expect(fair.takeCut()).toBe(true)
    }
  })

  it('gives that touch nothing more to do: landed on a walking lantern and lifted there, it walks nowhere and the giving plays on', () => {
    const fair = fairAt('star', (save) => { save.basket = [made('star')] }), finger = new Finger(fair)
    finger.down(slotAt(0))
    finger.to(HANDS.maker)
    finger.up()
    finger.wait(LIFT.seconds / 2)
    finger.down(WALK.right)
    expect([fair.playing, fair.pending]).toEqual([true, null])
    finger.wait(0.2)
    finger.up()
    expect([fair.at, fair.slide, fair.playing]).toEqual(['star', null, true])
    expect(fair.held.maker?.craft).toBe('star')
    // The next tap on the lantern is a touch of its own: it ends the giving and walks.
    finger.wait(0.3)
    finger.down(WALK.right)
    finger.up()
    expect(fair.at).toBe('wreath')
  })

  it('and the same for the ending: carried out and let go, then a far touch inside the grace, the ending plays to its halo', () => {
    const fair = fairAt('door', (save) => { save.basket = [made('star')] }), finger = new Finger(fair)
    finger.down({ x: BASKET.x, y: 668 })
    finger.to({ x: SNOW.x, y: SNOW.y - 80 })
    finger.up()
    finger.wait(LIFT.seconds / 2)
    expect(fair.finished).toBe(false)
    finger.down({ x: 200, y: 80 })
    finger.up()
    expect([fair.finished, fair.playing]).toEqual([true, true])
    finger.wait(ENDING.seconds + 0.2)
    expect(fair.glow).toBe(1)
    expect(names(fair)).toContain('glow')
  })
})
