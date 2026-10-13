import { describe, expect, it } from 'vitest'
import { CELLS } from './cells'
import { FOUND, type Kind } from './kinds'
import { drawnBox, placement } from './lie'
import { build, topOf, type Laid } from './rest'
import { freshSave } from './save'
import { TICK, Toy, WELL_SECONDS, type ShownThing } from './toy'

// The cells are drawn as the sheet says. Each of these is a lie the grid
// names in words (a flag that hangs, a twig that bows, stairs half a length
// along, a bowl that spins, dew that wells up, moss that bulges, a thatch
// that sags), held here to what is shown.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const found = (things: Laid[]): Toy => new Toy({ ...freshSave(7), things }, 3)
const shownOf = (toy: Toy, id: number): ShownThing => { const show = toy.show(null); return { ...[...show.things, ...show.front].find((thing) => thing.id === id)! } }

/** Lets a thing go over a place of the hollow, and returns the game the moment the finger lets go. */
function letGo(toy: Toy, id: number, x: number): void {
  const home = FOUND[id].home
  toy.press(home.x, home.y - 8)
  toy.dragStart()
  toy.dragMove(x, 400)
  for (let i = 0; i < 30; i++) toy.step(TICK)
  toy.drop()
}
/** Every step of `seconds`, as the thing is shown. */
function frames(toy: Toy, id: number, seconds: number): ShownThing[] {
  const out: ShownThing[] = []
  for (let i = 0; i < Math.round(seconds / TICK); i++) {
    toy.step(TICK)
    out.push(shownOf(toy, id))
  }
  return out
}

describe('drawn as the sheet says', () => {
  it('hangs a flag from the tip at rest, after it has streamed out level once', () => {
    const toy = found([{ id: idOf('twig'), x: 640 }]), flag = idOf('feather')
    letGo(toy, flag, 650)
    const seen = frames(toy, flag, 4).filter((thing) => thing.form === 'flag')
    const first = drawnBox(seen[0]), last = drawnBox(seen[seen.length - 1])
    // As it is tied on it flies out level, at its full length.
    expect(first.w).toBeGreaterThan(first.h * 3)
    // At rest it hangs down beside the twig: far taller than it is wide, its top at the tip.
    expect(last.h).toBeGreaterThan(last.w * 2)
    const twig = toy.rested[0]
    expect(Math.abs(last.y - topOf(twig))).toBeLessThan(12)
    expect(last.y + last.h).toBeGreaterThan(topOf(twig) + 70)
    // Opened again, it hangs the same.
    const again = drawnBox(shownOf(found(toy.toSave().things), flag))
    for (const side of ['x', 'y', 'w', 'h'] as const) expect(again[side]).toBeCloseTo(last[side], 3)
    // On a snapped twig there is less room under the tip: it hangs bunched up, and not into the ground.
    const low = new Toy({ ...freshSave(7), things: toy.toSave().things, snapped: [idOf('twig')] }, 3)
    const short = drawnBox(shownOf(low, flag))
    expect(short.h).toBeGreaterThan(short.w)
    expect(short.y + short.h).toBeLessThanOrEqual(604 + 4)
  })

  it('bows the twig under a pebble balanced on its tip, and nods it with the pebble', () => {
    const toy = found([{ id: idOf('twig'), x: 640 }]), twig = idOf('twig'), pebble = idOf('pebble')
    expect(shownOf(toy, twig).angle).toBe(0)
    letGo(toy, pebble, 652)
    const twigs: number[] = [], stones: ShownThing[] = []
    for (let i = 0; i < 4 / TICK; i++) {
      toy.step(TICK)
      twigs.push(shownOf(toy, twig).angle)
      stones.push(shownOf(toy, pebble))
    }
    expect(toy.rested[1].cell).toBe(CELLS.pebble.twig)
    // At rest the twig leans to the side the pebble was set down on, and the pebble is on its tip.
    const bow = twigs[twigs.length - 1]
    expect(bow).toBeGreaterThan(0.05)
    const tip = { x: 640 + 108 * Math.sin(bow), y: topOf(toy.rested[0]) + 108 * (1 - Math.cos(bow)) }
    const stone = stones[stones.length - 1]
    expect(Math.abs(stone.x - tip.x)).toBeLessThan(1)
    expect(Math.abs(stone.y - tip.y)).toBeLessThan(1)
    // While the pebble rocks the twig nods: it bows further and comes back, more than once.
    const landed = stones.findIndex((thing) => thing.form === 'whole')
    const nods = twigs.slice(landed)
    expect(Math.max(...nods) - Math.min(...nods)).toBeGreaterThan(0.15)
    let turns = 0
    for (let i = 2; i < nods.length; i++) if (Math.sign(nods[i] - nods[i - 1]) * Math.sign(nods[i - 1] - nods[i - 2]) < 0) turns += 1
    expect(turns).toBeGreaterThanOrEqual(CELLS.pebble.twig.rock!.turns)
    // With the pebble taken off again the twig stands straight.
    toy.press(stone.x, stone.y - 20)
    toy.dragStart()
    toy.dragMove(200, 300)
    toy.drop()
    for (let i = 0; i < 2 / TICK; i++) toy.step(TICK)
    expect(shownOf(toy, twig).angle).toBe(0)
  })

  it('lays stairs half a length along the slab below', () => {
    for (const lean of [-10, 10]) {
      const house = build([{ id: idOf('bark', 0), x: 620 }, { id: idOf('bark', 1), x: 620 + lean }])
      expect(house[1].cell.is).toBe('stairs')
      expect(house[1].x - house[0].x).toBe(Math.sign(lean) * CELLS.bark.bark.w / 2)
    }
  })

  it('spins a bowl on its rim like a coin: it stands on one edge after the other, its marks go round, and it drops flat', () => {
    const toy = found([{ id: idOf('bark'), x: 640 }]), bowl = idOf('cap')
    letGo(toy, bowl, 640)
    const seen = frames(toy, bowl, 4).filter((thing) => thing.form === 'up')
    const rest = seen[seen.length - 1]
    // It lifts off the slab on its rim, to one side and then the other.
    expect(Math.min(...seen.map((thing) => thing.y))).toBeLessThan(rest.y - 4)
    expect(Math.max(...seen.map((thing) => thing.angle))).toBeGreaterThan(0.15)
    expect(Math.min(...seen.map((thing) => thing.angle))).toBeLessThan(-0.1)
    // Its marks go round: the picture is turned over and back again several times.
    let flips = 0
    for (let i = 1; i < seen.length; i++) if (Math.sign(seen[i].sx) !== Math.sign(seen[i - 1].sx)) flips += 1
    expect(flips).toBeGreaterThanOrEqual(6)
    // And it ends flat, the right way round.
    expect([rest.angle, Math.sign(rest.sx)]).toEqual([0, 1])
  })

  it('lets the dew well up in a bath as it is set down, and finds it full when the game is opened', () => {
    const toy = found([]), bath = idOf('cap')
    letGo(toy, bath, 640)
    const seen = frames(toy, bath, 2).filter((thing) => thing.extra === 'water')
    expect(seen[0].well).toBeLessThan(0.1)
    expect(seen[Math.round(WELL_SECONDS / TICK / 2)].well).toBeGreaterThan(0.3)
    expect(seen[Math.round(WELL_SECONDS / TICK / 2)].well).toBeLessThan(0.7)
    expect(seen[seen.length - 1].well).toBe(1)
    for (let i = 1; i < seen.length; i++) expect(seen[i].well).toBeGreaterThanOrEqual(seen[i - 1].well)
    expect(shownOf(found(toy.toSave().things), bath).well).toBe(1)
  })

  it('bulges the moss under a bed and under a hard pillow, and under nothing else', () => {
    const moss = idOf('moss')
    const wide = (on: Kind | null): number => shownOf(found(on ? [{ id: moss, x: 640 }, { id: idOf(on), x: 640 }] : [{ id: moss, x: 640 }]), moss).sx
    expect(wide(null)).toBe(1)
    expect(wide('leaf')).toBeGreaterThan(1.05)
    expect(wide('pebble')).toBeGreaterThan(1.05)
    expect(wide('feather')).toBe(1)
    expect(wide('cap')).toBe(1)
  })

  it('slings a thatch between two tops so that it sags under the line between them, and sits it on one top as a little tree', () => {
    const two = found([{ id: idOf('twig', 0), x: 610 }, { id: idOf('twig', 1), x: 670 }, { id: idOf('moss'), x: 640 }])
    const slung = shownOf(two, idOf('moss'))
    expect(two.rested[2].under).toHaveLength(2)
    expect(placement(slung).sprite).toBe('mossSag')
    const tops = topOf(two.rested[0])
    const box = drawnBox(slung)
    // Its middle hangs under the tops it lies on, and its ends stand over them.
    expect(box.y + box.h).toBeGreaterThan(tops + 10)
    expect(box.y).toBeLessThan(tops - 12)
    const one = found([{ id: idOf('twig', 0), x: 640 }, { id: idOf('moss'), x: 640 }])
    expect(placement(shownOf(one, idOf('moss'))).sprite).toBe('moss')
  })
})
