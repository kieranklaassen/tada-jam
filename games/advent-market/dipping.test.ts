import { describe, expect, it } from 'vitest'
import { COAT, FATTEST, PARTS, WARM_COAT, bareWick, isBare, isFattest } from './candle'
import { BUBBLES, Dipping, LEVEL, MELT_AFTER, MELT_RATE, WARM_SECONDS, WARN_AFTER, levelOf, type DipEvent } from './dipping'
import { COUNTER, LENGTH, POT, REST, STICK } from './hall'
import { makeRng } from './rng'

const DT = 1 / 60

function fresh(seed = 1): Dipping {
  return new Dipping(bareWick(), makeRng(seed))
}

/** Steps the toy and hands back what happened, in order. */
function run(d: Dipping, seconds: number): DipEvent[] {
  const before = d.events.length
  for (let t = 0; t < seconds; t += DT) d.step(DT)
  return d.events.slice(before)
}

/** Takes the stick, lowers it to `depth` (the stick's height), waits, and lifts it out again. */
function dip(d: Dipping, depth: number = STICK.maxY, wait = 0.3): DipEvent[] {
  const before = d.events.length
  d.grab(REST.x, d.stick.y)
  d.moveTo(REST.x, depth)
  run(d, 0.5 + wait)
  d.moveTo(REST.x, REST.y)
  run(d, 0.6)
  return d.events.slice(before)
}

describe('dipping', () => {
  it('answers the finger when it lands: a knock, and the candle set swinging', () => {
    const d = fresh()
    d.grab(REST.x + 20, REST.y)
    expect(d.events).toEqual([{ type: 'knock' }])
    d.step(DT)
    expect(d.swing).not.toBe(0)
  })

  it('takes the stick from the stick itself and from anywhere along the wick, and not from across the hall', () => {
    const d = fresh()
    expect(d.reaches(REST.x, REST.y)).toBe(true)
    expect(d.reaches(REST.x + 10, REST.y + LENGTH - 20)).toBe(true)
    expect(d.reaches(REST.x + 300, REST.y + 100)).toBe(false)
    expect(d.reaches(REST.x, REST.y - 80)).toBe(false)
  })

  it('coats the whole wick on a deep dip: one gloop going in, one lift coming out', () => {
    const d = fresh()
    const events = dip(d)
    expect(events.filter((e) => e.type === 'gloop')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'lift')).toEqual([{ type: 'lift', fat: expect.any(Number), coated: PARTS }])
    for (let i = 0; i < PARTS; i++) expect(d.candle.r[i]).toBeGreaterThanOrEqual(COAT)
  })

  it('coats only the end on a shallow dip, which grows into a club', () => {
    const d = fresh()
    for (let n = 0; n < 3; n++) { dip(d, 400); run(d, WARM_SECONDS) }
    expect(d.candle.r[0]).toBe(0)
    expect(d.candle.r[PARTS - 1]).toBeGreaterThanOrEqual(COAT * 3)
  })

  it('adds a thin coat when the last one is still warm, and a full one once it has cooled', () => {
    const hurried = fresh(), patient = fresh()
    dip(hurried); dip(hurried)
    dip(patient); run(patient, WARM_SECONDS + 0.2); dip(patient)
    expect(hurried.candle.r[3]).toBe(COAT + WARM_COAT)
    expect(patient.candle.r[3]).toBe(COAT * 2)
  })

  it('shines wet as it comes out and goes matte as it cools', () => {
    const d = fresh()
    dip(d)
    expect(d.wet[PARTS - 1]).toBeGreaterThan(0.3)
    run(d, 2)
    expect(Math.max(...d.wet)).toBe(0)
  })

  it('melts a candle that is left under the wax, down to the bare wick, while the pot bubbles', () => {
    const d = fresh()
    for (let n = 0; n < 3; n++) { dip(d); run(d, WARM_SECONDS) }
    const before = d.candle.r[6]
    d.grab(REST.x, d.stick.y)
    d.moveTo(REST.x, STICK.maxY)
    // Nothing at first; then the wax bubbles at the candle, and still nothing melts.
    const early = run(d, 0.4 + WARN_AFTER * 0.6)
    expect(early.some((e) => e.type === 'bubble')).toBe(false)
    const warned = run(d, MELT_AFTER - WARN_AFTER - 0.3)
    expect(warned.some((e) => e.type === 'bubble')).toBe(true)
    expect(d.bubbling).toBeGreaterThan(0.2)
    expect(d.candle.r[6]).toBe(before)
    const soaking = run(d, 14)
    expect(soaking.filter((e) => e.type === 'bubble').length).toBeGreaterThan(5)
    expect(soaking.filter((e) => e.type === 'bare')).toHaveLength(1)
    expect(isBare(d.candle)).toBe(true)
    // It comes out hot and takes no coat: the way back to the start.
    d.moveTo(REST.x, REST.y)
    run(d, 1)
    expect(isBare(d.candle)).toBe(true)
  })

  it('raises the wax while a candle melts: what melts off the candle goes into the pot, so the level never falls as the candle thins', () => {
    for (const coats of [2, 5, 12]) {
      const d = fresh()
      for (let n = 0; n < coats; n++) { dip(d); run(d, WARM_SECONDS) }
      d.grab(REST.x, d.stick.y)
      d.moveTo(REST.x, STICK.maxY)
      // Going in raised it a little, by the candle that stands in it, and it stands so until the candle melts.
      let dipped = 0, waited = 0
      const fat = d.candle.r[6]
      while (!d.melting) { dipped = d.level; d.step(DT); waited += DT }
      expect(waited, `${coats} coats`).toBeGreaterThan(MELT_AFTER)
      expect(dipped, `${coats} coats`).toBeGreaterThan(0)
      let last = dipped, thinned = 0
      // Every quarter of a second while it melts, the candle is thinner and the wax stands no lower, and higher by the end.
      while (!isBare(d.candle)) {
        run(d, 0.25)
        expect(d.level, `${coats} coats, part at ${d.candle.r[6]}`).toBeGreaterThanOrEqual(last - 1e-9)
        if (d.level > last + 1e-9) thinned += 1
        last = d.level
      }
      expect(d.candle.r[6]).toBeLessThan(fat)
      expect(thinned, `${coats} coats`).toBeGreaterThan(3)
      expect(last, `${coats} coats`).toBeGreaterThan(dipped + 0.5)
      // It never climbs out of the pot, and with the candle lifted out it sinks back to the rim.
      expect(last).toBeLessThan(LEVEL.dipped + LEVEL.melted)
      d.moveTo(REST.x, REST.y)
      run(d, 6)
      expect(d.level).toBeLessThan(0.1)
    }
    // The rule itself: more melted wax never stands lower, whatever stands in the pot.
    for (const displaced of [0, 4000, 30000]) for (let molten = 0; molten < 40; molten += 0.5) expect(levelOf(displaced, molten + 0.5)).toBeGreaterThan(levelOf(displaced, molten))
  })

  it('bubbles slowly and seldom as a warning, and hard while the candle melts: the two can be told apart by ear', () => {
    const d = fresh()
    for (let n = 0; n < 6; n++) { dip(d); run(d, WARM_SECONDS) }
    d.grab(REST.x, d.stick.y)
    d.moveTo(REST.x, STICK.maxY)
    const bubbles = (events: DipEvent[]) => events.filter((e) => e.type === 'bubble').length
    // Count from the moment the first part goes under the warning and from the moment the first part melts.
    while (d.bubbling === 0) d.step(DT)
    const warning = MELT_AFTER - WARN_AFTER - 0.1
    const warned = bubbles(run(d, warning)) + 1
    expect(d.melting).toBe(false)
    expect(warned).toBeGreaterThanOrEqual(1)
    expect(warned).toBeLessThanOrEqual(2)
    while (!d.melting) d.step(DT)
    const melting = bubbles(run(d, warning))
    expect(melting).toBeGreaterThanOrEqual(4)
    expect(melting).toBeGreaterThanOrEqual(warned * 2)
    expect(BUBBLES.warn.gap).toBeGreaterThanOrEqual(BUBBLES.melt.gap * 3)
  })

  it('never un-makes what one dip gave by a slow dip: two seconds under, and nearly three, leave no part thinner and add the coat', () => {
    for (const wait of [1.5, 2.2]) {
      const d = fresh()
      dip(d)
      run(d, WARM_SECONDS)
      const before = [...d.candle.r]
      const events = dip(d, STICK.maxY, wait)
      for (let i = 0; i < PARTS; i++) expect(d.candle.r[i], `part ${i}, ${wait} s`).toBe(before[i] + COAT + (i >= 9 ? 1 : 0))
      // Past the warning the wax bubbled at the candle, and still nothing was lost.
      expect(events.some((e) => e.type === 'bubble'), `${wait} s`).toBe(0.5 + wait > WARN_AFTER + 0.3)
    }
    // Melting starts later than a slow dip lasts, and runs slower than a coat is made: one coat takes two seconds to go.
    expect(WARN_AFTER).toBeGreaterThan(1.4)
    expect(MELT_AFTER).toBeGreaterThanOrEqual(3)
    expect(MELT_AFTER - WARN_AFTER).toBeGreaterThan(1)
    expect(COAT / MELT_RATE).toBeGreaterThanOrEqual(2)
  })

  it('takes no more at its fattest: the extra coat slides off in three fat blobs', () => {
    const d = fresh()
    d.candle.r.fill(FATTEST)
    expect(isFattest(d.candle)).toBe(true)
    dip(d)
    const after = run(d, 2)
    expect(d.candle.r.every((r) => r === FATTEST)).toBe(true)
    expect([...d.events].filter((e) => e.type === 'blob').length + after.length * 0).toBe(3)
  })

  it('lets drops run off the tip after a dip, each landing with its own plip and its own ring', () => {
    const d = fresh(3)
    dip(d)
    run(d, 3)
    const plips = d.events.filter((e) => e.type === 'plip')
    expect(plips.length).toBeGreaterThanOrEqual(2)
    expect(plips.length).toBeLessThanOrEqual(4)
    expect(d.drops).toHaveLength(0)
  })

  it('leaves a drop on the counter when the candle is carried away from the pot, and the spot fades', () => {
    const d = fresh(4)
    d.grab(REST.x, d.stick.y)
    d.moveTo(REST.x, STICK.maxY)
    run(d, 0.8)
    d.moveTo(REST.x, REST.y)
    run(d, 0.25)
    d.moveTo(REST.x + 260, REST.y)
    const carried = run(d, 2.5)
    expect(carried.some((e) => e.type === 'tick')).toBe(true)
    expect(d.spots.length).toBeGreaterThan(0)
    for (const spot of d.spots) expect(Math.abs(spot.y - COUNTER.top)).toBeLessThanOrEqual(10)
    run(d, 7)
    expect(d.spots).toHaveLength(0)
  })

  it('swings back to its hooks when let go, and says so once', () => {
    const d = fresh()
    d.grab(REST.x + 100, 300)
    d.moveTo(REST.x + 200, 320)
    run(d, 0.5)
    d.release()
    const back = run(d, 3)
    expect(back.filter((e) => e.type === 'hang')).toHaveLength(1)
    expect(Math.hypot(d.stick.x - REST.x, d.stick.y - REST.y)).toBeLessThan(3)
  })

  it('never passes the candle through the pot or the counter, wherever the hand goes', () => {
    const rng = makeRng(9)
    const d = fresh(9)
    d.candle.r.fill(30)
    d.grab(REST.x, REST.y)
    for (let move = 0; move < 400; move++) {
      d.moveTo(STICK.minX + rng.next() * (STICK.maxX - STICK.minX), STICK.minY + rng.next() * (STICK.maxY - STICK.minY) + 0)
      for (let f = 0; f < 12; f++) {
        d.step(DT)
        const tip = d.tipY, off = Math.abs(d.stick.x - POT.x)
        // Below the rim the candle is either inside the mouth, clear of its wall, or outside the pot altogether.
        if (tip > POT.y + 0.5) expect(off <= POT.rx - 32 - 5 || off >= POT.rx + 32 + 7, `tip ${tip} at ${off} from the pot`).toBe(true)
        if (off > POT.rx) expect(tip).toBeLessThanOrEqual(COUNTER.top + 0.5)
        expect(d.stick.y).toBeGreaterThanOrEqual(STICK.minY - 40)
      }
    }
  }, 60_000)

  it('is found at rest after a load: the stick on its hooks, nothing falling, nothing wet', () => {
    const d = fresh()
    dip(d)
    d.grab(REST.x, REST.y)
    d.moveTo(700, 300)
    run(d, 0.2)
    d.settle()
    expect(d.stick).toEqual({ x: REST.x, y: REST.y, vx: 0, vy: 0 })
    expect(d.held).toBe(false)
    expect(d.drops).toHaveLength(0)
    expect(Math.max(...d.wet)).toBe(0)
    expect(run(d, 1)).toEqual([])
  })

  it('plays the same for the same seed and the same hand, and does nothing while no time passes', () => {
    const a = fresh(7), b = fresh(7)
    dip(a); dip(b)
    run(a, 2); run(b, 2)
    expect(a.events).toEqual(b.events)
    const count = a.events.length
    a.step(0)
    expect(a.events).toHaveLength(count)
  })
})
