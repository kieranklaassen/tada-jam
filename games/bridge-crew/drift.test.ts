import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CALM, LEAP, SPLASH, TRAIN, balloon, boat, clouds, drawSky, drawSplash, drawWaterLife, drops, fish, train, type Splash } from './drift'
import type { Pen } from './look'
import { WATER } from './pose'
import { groundAt, plotFor } from './sheet'
import { COLS, VARIANTS, site, type Site } from './sites'
import { SKY, farBridge, reaches } from './valley'

const every: Site[] = LADDER.flatMap((id) => Array.from({ length: VARIANTS }, (_, v) => site(id, v)))
const gap = site('first-triangle', 0)
const big = (since: number, x = 12): Splash => ({ x, since, big: 1 })

function recording() {
  const calls: { name: string; args: unknown[] }[] = []
  const pen = new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) => (name in store ? store[name] : (...args: unknown[]) => { calls.push({ name, args }) }),
    set: (store, name: string, value) => { store[name] = value; return true },
  }) as unknown as Pen
  return { pen, calls }
}

describe('what goes on at the edge of the sheet', () => {
  it('three clouds drift across the sky, each at its own pace, and come round again', () => {
    const now = clouds(gap, 10), later = clouds(gap, 20)
    expect(now).toHaveLength(3)
    const moved = now.map((cloud, i) => later[i].x - cloud.x)
    for (const far of moved) { expect(far).toBeGreaterThan(0.5); expect(far).toBeLessThan(1.5) }
    expect(new Set(moved.map((far) => far.toFixed(3))).size).toBe(3)
    for (let seconds = 0; seconds < 900; seconds += 7) for (const cloud of clouds(gap, seconds)) {
      expect(cloud.x).toBeGreaterThanOrEqual(-4); expect(cloud.x).toBeLessThan(COLS + 4)
      expect(cloud.y).toBeGreaterThanOrEqual(SKY.low); expect(cloud.y).toBeLessThanOrEqual(SKY.high)
    }
  })

  it('a balloon crosses the sky far off, slowly, and comes round again', () => {
    let leftward = 0
    for (let seconds = 0; seconds < 600; seconds += 5) {
      const now = balloon(gap, seconds), next = balloon(gap, seconds + 5)
      expect(now.y).toBeGreaterThanOrEqual(SKY.low); expect(now.y).toBeLessThanOrEqual(SKY.high)
      expect(now.x).toBeGreaterThan(-5.01); expect(now.x).toBeLessThanOrEqual(COLS + 5)
      if (next.x < now.x) { leftward++; expect(now.x - next.x).toBeCloseTo(0.55, 5) }
    }
    expect(leftward).toBeGreaterThan(100)
  })

  it('a train crosses the finished bridge far off now and then, and the bridge is empty the rest of the time', () => {
    for (const at of every) {
      let on = 0, runs = 0, was = false
      for (let seconds = 0; seconds < TRAIN.every * 3; seconds += 0.25) {
        const nose = train(at, seconds), span = farBridge(at)
        if (nose !== null) { on++; expect(nose).toBeGreaterThanOrEqual(span.x0 - 0.3); expect(nose).toBeLessThanOrEqual(span.x1 + TRAIN.long + 0.4) }
        if (nose !== null && !was) runs++
        was = nose !== null
      }
      expect(runs, at.id).toBeGreaterThanOrEqual(3)
      // On the bridge for less than a third of the time.
      expect(on / (TRAIN.every * 12)).toBeLessThan(0.34)
    }
  })

  it('the fish leaps out of the water and back, and a vehicle\'s splash throws it higher than it ever leaps', () => {
    let leaps = 0, highest = 0
    for (let seconds = 0; seconds < LEAP.every * 4; seconds += 0.05) {
      const out = fish(gap, seconds, null)
      if (!out) continue
      leaps++
      expect(out.y).toBeGreaterThanOrEqual(WATER - 1e-9)
      highest = Math.max(highest, out.y - WATER)
      expect(groundAt(gap, out.x)).toBeLessThan(WATER)
    }
    expect(leaps).toBeGreaterThan(40)
    expect(highest).toBeGreaterThan(LEAP.high * 0.95)
    expect(highest).toBeLessThanOrEqual(LEAP.high)
    // Under the water most of the time.
    expect(leaps * 0.05).toBeLessThan(LEAP.every * 4 * 0.15)
    let flung = 0
    for (let since = 0; since < 1.7; since += 0.05) { const out = fish(gap, 3, big(since))!; expect(out.flung).toBe(true); expect(out.y).toBeGreaterThanOrEqual(WATER); flung = Math.max(flung, out.y - WATER) }
    expect(flung).toBeGreaterThan(2)
    // The trolley's small splash does not throw it, and it is back to its own leaps when the water is calm.
    expect(fish(gap, 3, { x: 12, since: 0.5, big: 0.4 })?.flung ?? false).toBe(false)
    expect(fish(gap, 3, big(2))).toEqual(fish(gap, 3, null))
  })

  it('the paper boat sails the widest open water end to end, never over a rock or a bank, and is nowhere on the barge\'s sheet', () => {
    for (const at of every) {
      const reach = reaches(at)[0]
      let before: number | null = null
      for (let seconds = 0; seconds < 400; seconds += 0.5) {
        const sail = boat(at, seconds, null)
        if (at.channel || !reach || reach[1] - reach[0] < 2.4) { expect(sail, at.id).toBeNull(); continue }
        expect(sail, at.id).not.toBeNull()
        for (const x of [sail!.x - 0.46, sail!.x, sail!.x + 0.46]) expect(groundAt(at, x), `${at.id} ${x}`).toBeLessThan(WATER)
        expect(Math.abs(sail!.y - WATER)).toBeLessThan(0.05)
        if (before !== null) expect(Math.abs(sail!.x - before)).toBeLessThan(0.12)
        before = sail!.x
      }
    }
    expect(every.filter((at) => boat(at, 5, null) !== null).length).toBeGreaterThan(every.length / 2)
  })

  it('a splash swamps the boat: over, under until the water is calm, and up again where it was', () => {
    const afloat = boat(gap, 50, null)!
    expect(Math.abs(boat(gap, 50, big(0.25))!.tilt)).toBeGreaterThan(1)
    for (const since of [0.6, 2, 4, CALM - 1.3]) expect(boat(gap, 50, big(since)), `${since}`).toBeNull()
    const rising = boat(gap, 50, big(CALM - 0.6))!
    expect(rising.x).toBeCloseTo(afloat.x)
    expect(rising.y).toBeLessThan(afloat.y)
    expect(boat(gap, 50, big(CALM))).toEqual(afloat)
  })

  it('a splash throws drops that fall back: more for a vehicle than for the trolley, and none left when it is over', () => {
    expect(drops(big(0.2)).length).toBeGreaterThan(drops({ x: 12, since: 0.2, big: 0.4 }).length)
    for (let since = 0.02; since < 2; since += 0.05) for (const drop of drops(big(since))) expect(drop.y).toBeGreaterThan(WATER)
    expect(drops(big(SPLASH))).toEqual([])
    // None goes into a bank: thrown from beside a wall, every drop stays on the gap's side of it.
    for (let since = 0.02; since < SPLASH; since += 0.05) for (const drop of drops(big(since, gap.left[0] + 0.4), [gap.left[0] + 0.15, gap.right[0] - 0.15])) { expect(drop.x).toBeGreaterThanOrEqual(gap.left[0] + 0.15); expect(drop.x).toBeLessThanOrEqual(gap.right[0] - 0.15) }
    const reach = Math.max(...Array.from({ length: 30 }, (_, i) => Math.max(0, ...drops(big(i * 0.05)).map((drop) => drop.y - WATER))))
    // The highest go well over a bank four cells above the water, and none off the top of the sheet.
    expect(reach).toBeGreaterThan(4)
    expect(reach).toBeLessThan(7)
  })

  it('is drawn in a few lines with real numbers and no text, at any moment, with a splash or without', () => {
    const plot = plotFor(1180, 820)
    for (const at of every) for (let seconds = 0; seconds < 60; seconds += 4.3) for (const splash of [null, big(0.3, (at.left[0] + at.right[0]) / 2), big(3)]) {
      const { pen, calls } = recording()
      const drawn = drawSky(pen, plot, at, seconds) + drawWaterLife(pen, plot, at, seconds, splash) + drawSplash(pen, plot, at, splash)
      expect(drawn).toBeGreaterThanOrEqual(2)
      expect(drawn).toBeLessThanOrEqual(7)
      expect(calls.filter((call) => call.name === 'fillText' || call.name === 'strokeText')).toEqual([])
      for (const call of calls) for (const arg of call.args) if (typeof arg === 'number') expect(Number.isFinite(arg), `${at.id} ${call.name}`).toBe(true)
    }
  })
})
