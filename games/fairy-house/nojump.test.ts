import { describe, expect, it } from 'vitest'
import { FOLK } from './folk'
import { FOUND, type Kind } from './kinds'
import { build, laidOf, type Laid } from './rest'
import { freshSave } from './save'
import { SUN_AT, TICK, Toy } from './toy'

// Nothing is ever somewhere else from one step to the next. A thing one of
// the three takes up is seen to go onto its head or into its hand and back; a
// cloth that goes home leaves from where it is drawn; and none of the three
// is in another place without having gone there.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

const HOUSES: [string, Laid[]][] = [
  ['a table with a cloth, a lamp and a flag', [{ id: idOf('bark'), x: 640 }, { id: idOf('leaf'), x: 640 }, { id: idOf('pebble'), x: 760 }, { id: idOf('cap'), x: 760 }, { id: idOf('twig'), x: 540 }, { id: idOf('feather'), x: 540 }]],
  ['a rug, a bath and a broom', [{ id: idOf('leaf'), x: 560 }, { id: idOf('cap'), x: 690 }, { id: idOf('feather'), x: 780 }]],
  ['a parasol beside a bath, a bed and a quilt', [{ id: idOf('twig'), x: 560 }, { id: idOf('leaf'), x: 560 }, { id: idOf('cap'), x: 610 }, { id: idOf('moss'), x: 720 }, { id: idOf('leaf', 1), x: 720 }, { id: idOf('moss', 1), x: 420 }, { id: idOf('feather'), x: 420 }]],
  ['a roof on two twigs over a bath, with a bell and a tickler', [{ id: idOf('cap'), x: 640 }, { id: idOf('twig'), x: 600 }, { id: idOf('twig', 1), x: 680 }, { id: idOf('leaf'), x: 640 }, { id: idOf('twig', 2), x: 760 }, { id: idOf('cap', 1), x: 760 }, { id: idOf('pebble'), x: 430 }, { id: idOf('feather'), x: 430 }]],
]

/** The furthest any thing and any of the three went in one step, over a scene watched to its end. */
function furthest(toy: Toy): { thing: number; folk: number; what: string } {
  let before = toy.show(null)
  let thing = 0, folk = 0, what = ''
  for (let i = 0; i < 40 / TICK && toy.playing; i++) {
    toy.step(TICK)
    const now = toy.show(null)
    const was = new Map([...before.things, ...before.front].map((shown) => [shown.id, shown]))
    for (const shown of [...now.things, ...now.front]) {
      const from = was.get(shown.id)!
      const by = Math.hypot(shown.x - from.x, shown.y - from.y)
      if (by > thing) {
        thing = by
        what = `a ${shown.kind} at ${(i * TICK).toFixed(2)} s`
      }
    }
    for (const who of FOLK) folk = Math.max(folk, Math.hypot(now.stand[who].x - before.stand[who].x, now.stand[who].y - before.stand[who].y))
    before = now
  }
  return { thing, folk, what }
}

describe('from one step to the next', () => {
  for (const [name, laid] of HOUSES) {
    it(`nothing jumps through the evening and the morning of ${name}`, () => {
      const toy = new Toy({ ...freshSave(7), things: laidOf(build(laid)) }, 3)
      toy.press(SUN_AT.x, SUN_AT.y)
      toy.dragStart()
      toy.dragMove(SUN_AT.x, SUN_AT.under)
      toy.step(TICK * 4)
      toy.drop()
      expect(toy.playing).toBe(true)
      const evening = furthest(toy)
      expect(evening.thing, `evening: ${evening.what}`).toBeLessThan(14)
      expect(evening.folk, 'evening: one of the three').toBeLessThan(14)
      toy.step(1)
      toy.press(SUN_AT.x, toy.show(null).sun.y)
      toy.dragStart()
      toy.dragMove(SUN_AT.x, SUN_AT.y)
      toy.step(TICK * 4)
      toy.drop()
      expect(toy.playing).toBe(true)
      const morning = furthest(toy)
      expect(morning.thing, `morning: ${morning.what}`).toBeLessThan(14)
      expect(morning.folk, 'morning: one of the three').toBeLessThan(14)
    })
  }
})
