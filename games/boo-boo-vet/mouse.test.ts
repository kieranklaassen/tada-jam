import { describe, expect, it } from 'vitest'
import { CARES, type Care } from './needs'
import { MISCHIEF_SECONDS, TIDIED_FROM, USE, mischief, nearMouse, showingUse, type MouseUse } from './mouse'

const STEPS = 120
const MOVABLE = CARES.filter((care): care is Exclude<Care, 'plaster'> => care !== 'plaster')
const during = (from: number, to: number) => Array.from({ length: STEPS + 1 }, (_, index) => from + ((to - from) * index) / STEPS)
/** How far apart two tracks are, in the mouse and in the thing, summed over their length. */
function apart(one: MouseUse[], other: MouseUse[]): number {
  return one.reduce((sum, a, index) => {
    const b = other[index]
    return sum + Math.abs(a.mouse.x - b.mouse.x) + Math.abs(a.mouse.y - b.mouse.y) + 100 * Math.abs(a.mouse.rot - b.mouse.rot) + 100 * Math.abs(a.mouse.sy - b.mouse.sy) + Math.abs(a.thing.x - b.thing.x) + Math.abs(a.thing.y - b.thing.y)
  }, 0) / one.length
}
/** How many separate times a value rises above a mark. */
const times = (values: number[], mark: number) => values.filter((value, index) => value > mark && (index === 0 || values[index - 1] <= mark)).length

describe('the mouse\'s showing', () => {
  const tracks = Object.fromEntries(CARES.map((care) => [care, during(USE.from, USE.to).map((p) => showingUse(care, p))])) as Record<Care, MouseUse[]>

  it('uses each thing in its own way: no two of the five are one movement', () => {
    for (const one of CARES) for (const other of CARES) if (one < other) expect(apart(tracks[one], tracks[other]), `${one} and ${other}`).toBeGreaterThan(20)
  })

  it('sips: the bowl stands at its feet and its nose goes down to the water three times', () => {
    const bowl = tracks.bowl
    expect(bowl.every((use) => use.thing.y > -30 && use.thing.x < -20)).toBe(true)
    // It leans towards the bowl, the same way each time.
    expect(times(bowl.map((use) => -use.mouse.rot), 0.3)).toBe(3)
  })

  it('wraps a corner of the blanket round itself: the cloth is spread on its shoulders, and it shuts its eyes in it', () => {
    expect(tracks.blanket.every((use) => use.thing.look === 'open' && use.thing.size < 0.35)).toBe(true)
    expect(tracks.blanket.some((use) => use.mouse.shut)).toBe(true)
  })

  it('brushes its whiskers: the brush crosses its face at the height of its nose, to one side and the other, paws up', () => {
    const brush = tracks.brush
    expect(brush.every((use) => use.thing.y > -66 && use.thing.y < -40 && use.mouse.fuss)).toBe(true)
    expect(Math.min(...brush.map((use) => use.thing.x))).toBeLessThan(-20)
    expect(Math.max(...brush.map((use) => use.thing.x))).toBeGreaterThan(20)
    expect(times(brush.map((use) => use.thing.x), 15)).toBeGreaterThanOrEqual(2)
  })

  it('sticks a plaster on its tail: one plaster at the tip of the tail, turned to look, and a wag', () => {
    const plaster = tracks.plaster
    expect(plaster.every((use) => use.thing.look === 'one' && Math.hypot(use.thing.x - 44, use.thing.y + 26) < 12)).toBe(true)
    expect(Math.max(...plaster.map((use) => use.mouse.rot))).toBeGreaterThan(0.15)
    expect(times(plaster.map((use) => use.thing.x), 48)).toBeGreaterThanOrEqual(2)
  })

  it('curls up in the basket and breathes out: a hop, then low and wide with its eyes shut, and a breath leaves its nose', () => {
    const basket = tracks.basket
    expect(Math.min(...basket.map((use) => use.mouse.y))).toBeLessThan(-18)
    expect(Math.min(...basket.map((use) => use.mouse.sy))).toBeLessThan(0.72)
    expect(basket.some((use) => use.mouse.shut)).toBe(true)
    expect(Math.max(...basket.map((use) => use.breath))).toBeGreaterThan(0.9)
    for (const care of CARES) if (care !== 'basket') expect(Math.max(...tracks[care].map((use) => use.breath))).toBe(0)
  })

  it('has the thing come over from the cart and go back to it', () => {
    expect(nearMouse(0)).toBe(0)
    expect(nearMouse(1)).toBe(0)
    for (const p of during(USE.from, USE.to)) expect(nearMouse(p)).toBe(1)
  })
})

describe('a thing the child puts on the mouse', () => {
  const tracks = Object.fromEntries(MOVABLE.map((care) => [care, during(0.02, TIDIED_FROM).map((p) => mischief(care, p))])) as Record<Exclude<Care, 'plaster'>, MouseUse[]>

  it('is answered in its own way by each of the four, and never as the showing of that thing', () => {
    for (const one of MOVABLE) for (const other of MOVABLE) if (one < other) expect(apart(tracks[one], tracks[other]), `${one} and ${other}`).toBeGreaterThan(20)
    for (const care of MOVABLE) expect(apart(tracks[care], during(USE.from, USE.to).map((p) => showingUse(care, p))), care).toBeGreaterThan(20)
  })

  it('moves the mouse where it stands: it stays on the cart, and it is back as it was when the thing has gone home', () => {
    for (const care of MOVABLE) {
      const moved = Math.max(...tracks[care].map((use) => Math.abs(use.mouse.x) + Math.abs(use.mouse.y) + 100 * Math.abs(use.mouse.rot) + 100 * Math.abs(use.mouse.sx - 1) + 100 * Math.abs(use.mouse.sy - 1)))
      expect(moved, care).toBeGreaterThan(12)
      for (const use of tracks[care]) expect(Math.abs(use.mouse.x), care).toBeLessThanOrEqual(42)
      const end = mischief(care, 1).mouse
      expect(Math.abs(end.x) + Math.abs(end.y) + Math.abs(end.rot) + Math.abs(end.sx - 1) + Math.abs(end.sy - 1), care).toBeLessThan(0.02)
    }
    expect(MISCHIEF_SECONDS).toBeLessThan(2.5)
  })
})
