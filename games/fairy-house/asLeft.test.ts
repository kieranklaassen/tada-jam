import { describe, expect, it } from 'vitest'
import { FOUND, HOLLOW, type Kind } from './kinds'
import { touchBox } from './lie'
import { build, laidOf, sameRest, type Laid } from './rest'
import { makeRng } from './rng'
import { deserialize, freshSave, serialize } from './save'
import { SUN_AT, TICK, Toy } from './toy'

// Found as left, by construction: where a thing lies is one function of the
// saved state. The house a finger leaves is always the list a save keeps, set
// down again in its order, so a load, a cancelled drag, the start of an
// evening and a neighbour carried off all find each thing where it lay. A
// thing whose lie does change (its support was taken, or a top it reaches
// came free) is seen to go there and heard to land.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const run = (toy: Toy, seconds: number): void => { for (let i = 0; i < Math.round(seconds / TICK); i++) toy.step(TICK) }
const shownOf = (toy: Toy, id: number) => toy.show(null).things.find((thing) => thing.id === id)!
const loadedFrom = (toy: Toy): Toy => new Toy(deserialize(JSON.parse(JSON.stringify(serialize(toy.toSave()))), 7), 3)

/** Takes hold of a thing where it is drawn. */
function take(toy: Toy, id: number): void {
  const box = touchBox({ ...shownOf(toy, id), sx: 1, sy: 1 })
  toy.press(box.x + box.w / 2, box.y + box.h / 2)
  toy.dragStart()
}
function carry(toy: Toy, id: number, x: number, y: number): void {
  take(toy, id)
  toy.dragMove(x, y)
  run(toy, 0.2)
  toy.drop()
  run(toy, 2.5)
}
/** The house is the list a save keeps, set down again. */
function canonical(toy: Toy): boolean {
  const again = build(laidOf(toy.rested), new Set(toy.toSave().snapped))
  return again.length === toy.rested.length && again.every((rest, index) => sameRest(rest, toy.rested[index]))
}

describe('where a thing lies is one function of the saved state', () => {
  it('keeps a slab that slid aside from a leaf where it came to rest: with the leaf carried off, on a load, after a cancelled drag and at the start of an evening', () => {
    const toy = new Toy({ ...freshSave(7), things: [{ id: idOf('leaf'), x: 580 }] }, 3)
    const bark = idOf('bark'), leaf = idOf('leaf')
    // Let go with no more than its edge over the leaf, the slab slides aside onto free room.
    carry(toy, bark, 680, 540)
    const lay = toy.rested.find((rest) => rest.id === bark)!
    expect(lay.on).toBe('ground')
    expect(Math.abs(lay.x - 680)).toBeGreaterThan(10)
    // The save holds where it came to rest, not where it was let go.
    expect(toy.toSave().things.find((thing) => thing.id === bark)!.x).toBe(lay.x)
    expect(shownOf(loadedFrom(toy), bark).x).toBe(lay.x)
    // The leaf is carried off: the slab stays, and nothing of it is heard.
    carry(toy, leaf, 200, 300)
    expect(toy.rested.map((rest) => rest.id)).toEqual([bark])
    expect(shownOf(toy, bark).x).toBe(lay.x)
    expect(shownOf(loadedFrom(toy), bark).x).toBe(lay.x)
    // A drag of another thing that is taken away again leaves it there.
    take(toy, idOf('pebble'))
    toy.dragMove(600, 500)
    run(toy, 0.2)
    toy.cancel()
    run(toy, 1)
    expect(shownOf(toy, bark).x).toBe(lay.x)
    // And so does the start of an evening, and the evening watched to its end.
    toy.press(SUN_AT.x, SUN_AT.y)
    toy.dragStart()
    toy.dragMove(SUN_AT.x, SUN_AT.under)
    toy.drop()
    expect(toy.rested.find((rest) => rest.id === bark)!.x).toBe(lay.x)
    for (let i = 0; toy.playing && i < 60 / TICK; i++) toy.step(TICK)
    expect(shownOf(toy, bark).x).toBe(lay.x)
    expect(shownOf(loadedFrom(toy), bark).x).toBe(lay.x)
  })

  it.each([[1, 30], [31, 60]])('leaves a house that is its own saved list after every touch, in games %i to %i played by chance', (from, to) => {
    for (let seed = from; seed <= to; seed++) {
      const rng = makeRng(seed * 17)
      const toy = new Toy(freshSave(7), seed)
      for (let move = 0; move < 14; move++) {
        const id = Math.floor(rng.next() * FOUND.length)
        const shown = shownOf(toy, id)
        if (!shown) continue
        take(toy, id)
        const out = rng.next() < 0.25
        toy.dragMove(out ? 200 : HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left), out ? 300 : 380 + rng.next() * 200)
        run(toy, 0.1)
        // With the thing in the hand the rest of the house is already the house a save of it would give.
        expect(canonical(toy), `game ${seed} move ${move}, in the hand`).toBe(true)
        if (rng.next() < 0.2) toy.cancel()
        else toy.drop()
        expect(canonical(toy), `game ${seed} move ${move}`).toBe(true)
        run(toy, 8)
        // At rest, every thing is shown where a load would find it.
        const loaded = loadedFrom(toy)
        const here = toy.show(null).things.map(({ id, x, y, angle, form }) => ({ id, x, y, angle, form })).sort((a, b) => a.id - b.id)
        const there = loaded.show(null).things.map(({ id, x, y, angle, form }) => ({ id, x, y, angle, form })).sort((a, b) => a.id - b.id)
        expect(here, `game ${seed} move ${move}`).toEqual(there)
      }
    }
  }, 60000)

  it('shows a table that loses one of its two twigs hopping over to the one that is left, and sounds its landing: it never jumps there', () => {
    const laid: Laid[] = [{ id: idOf('twig', 0), x: 600 }, { id: idOf('twig', 1), x: 660 }, { id: idOf('bark'), x: 630 }]
    const toy = new Toy({ ...freshSave(7), things: laid }, 3), bark = idOf('bark')
    expect(toy.rested[2].under).toHaveLength(2)
    take(toy, idOf('twig', 0))
    toy.dragMove(200, 300)
    toy.sounds.length = 0
    let last = shownOf(toy, bark).x, furthest = 0, landedAt = -1, tick = 0
    const from = last
    while (tick < 2 / TICK) {
      toy.step(TICK)
      tick += 1
      const x = shownOf(toy, bark).x
      furthest = Math.max(furthest, Math.abs(x - last))
      last = x
      if (landedAt < 0 && toy.sounds.some((sound) => sound.from === `knock ${bark}`)) landedAt = tick
    }
    expect(toy.rested.find((rest) => rest.id === bark)!.under).toEqual([idOf('twig', 1)])
    expect(Math.abs(last - from)).toBeGreaterThan(20)
    // Seen: it goes over in many small steps. Heard: it lands on the twig that is left, a good few frames after it set off.
    expect(furthest).toBeLessThan(8)
    expect(landedAt).toBeGreaterThan(12)
    toy.drop()
  })
})
