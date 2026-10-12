import { describe, expect, it } from 'vitest'
import { FOLK, PERSONALITY, TOWARD } from './folk'
import { FOUND, HOLLOW, groundY, type Kind } from './kinds'
import { drawnBox } from './lie'
import { build, laidOf, type Laid } from './rest'
import { makeRng } from './rng'
import { freshSave } from './save'
import { INSIDE, SUN_AT, TICK, Toy, type Show } from './toy'

// The three walk behind what stands between them and where they are going,
// step to a thing on a side where the ground is free, and the tidy one, with
// no feather, sweeps the free floor beside it: it leans across no neighbour.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

function sunset(toy: Toy): void {
  toy.press(SUN_AT.x, SUN_AT.y)
  toy.dragStart()
  toy.dragMove(SUN_AT.x, SUN_AT.under)
  toy.step(TICK * 4)
  toy.drop()
  toy.sounds.length = 0
}

/** Every step of an evening: the frame, and what was heard in it. */
function evening(laid: Laid[], seed = 3): { show: Show; heard: string[] }[] {
  const toy = new Toy({ ...freshSave(7), things: laidOf(build(laid)) }, seed)
  sunset(toy)
  const steps: { show: Show; heard: string[] }[] = []
  for (let i = 0; i < 40 / TICK && toy.playing; i++) {
    const before = toy.sounds.length
    toy.step(TICK)
    steps.push({ show: JSON.parse(JSON.stringify(toy.show(null))) as Show, heard: toy.sounds.slice(before).map((sound) => sound.from) })
  }
  return steps
}

/** The things that stand on the ground one of the three stands on, and rise above it, as boxes. */
function standing(show: Show, x: number): { id: number; x0: number; x1: number }[] {
  const ground = groundY(Math.min(HOLLOW.right - 1, Math.max(HOLLOW.left + 1, x)))
  return show.things.filter((thing) => thing.housed).map((thing) => ({ id: thing.id, box: drawnBox(thing) }))
    .filter(({ box }) => box.y + box.h >= ground - 8 && box.y + box.h <= ground + 12 && box.y < ground - 12)
    .map(({ id, box }) => ({ id, x0: box.x, x1: box.x + box.w }))
}

const HOUSES: [string, Laid[]][] = [
  ['a table with a cloth, a lamp and a flag', [{ id: idOf('bark'), x: 640 }, { id: idOf('leaf'), x: 640 }, { id: idOf('pebble'), x: 760 }, { id: idOf('cap'), x: 760 }, { id: idOf('twig'), x: 540 }, { id: idOf('feather'), x: 540 }]],
  ['a rug, a bath and a broom', [{ id: idOf('leaf'), x: 560 }, { id: idOf('cap'), x: 690 }, { id: idOf('feather'), x: 780 }]],
  ['posts between a bed, a cradle and a quilt', [{ id: idOf('moss'), x: 430 }, { id: idOf('leaf'), x: 430 }, { id: idOf('twig'), x: 520 }, { id: idOf('twig', 1), x: 600 }, { id: idOf('moss', 1), x: 680 }, { id: idOf('cap'), x: 680 }, { id: idOf('twig', 2), x: 740 }, { id: idOf('moss', 2), x: 800 }, { id: idOf('feather'), x: 800 }]],
]

describe('on its way from place to place', () => {
  it.each(HOUSES)('each of the three goes behind what stands in the hollow, and is in front again where it stops: %s', (_, laid) => {
    const steps = evening(laid)
    for (const who of FOLK) {
      // A walk is heard as its steps: between the first and the last foot of one walk it is on its way.
      const feet = steps.flatMap((step, i) => (step.heard.includes(`step ${who}`) ? [i] : []))
      let walks = 0, behind = 0, inside = 0
      for (let k = 1; k < feet.length; k++) {
        if ((feet[k] - feet[k - 1]) * TICK > 0.7) continue
        walks += 1
        for (let i = feet[k - 1] + 1; i < feet[k]; i++) {
          if (!steps[i].show.inside[who]) continue
          inside += 1
          if (steps[i].show.behind[who]) behind += 1
        }
      }
      expect(walks, who).toBeGreaterThan(0)
      expect(behind, who).toBe(inside)
      expect(inside, who).toBeGreaterThan(20)
      // Where the evening ends it lies at its place, in front of what it lies on.
      expect(steps[steps.length - 1].show.behind[who], who).toBe(false)
    }
    // It is not behind for the whole evening: at the places where it does something it is in front.
    for (const who of FOLK) expect(steps.filter((step) => step.show.inside[who] && !step.show.behind[who]).length, who).toBeGreaterThan(100)
  })

  it('is drawn before the things in the hollow while it is behind them, and after them where it stands', async () => {
    const { View } = await import('./view')
    const { STAGE } = await import('./stage')
    const log: string[] = []
    let sheets = 0
    const pen = new Proxy({}, { get: (_, name) => (...args: unknown[]) => { if (name === 'drawImage') log.push(`sheet${(args[0] as { n: number }).n}`) }, set: () => true })
    const view = new View(pen as never, (() => ({ width: 0, height: 0, n: ++sheets, getContext: () => pen })) as never, 1)
    view.resize(STAGE.width, STAGE.height, 1, 1)
    const steps = evening(HOUSES[2][1])
    const going = steps.find((step) => step.show.behind.fat && step.show.things.some((thing) => thing.housed))!.show
    const order = (show: Show): string[] => { log.length = 0; view.draw(show); return [...log] }
    const behind = order(going), front = order({ ...going, behind: { fat: false, tidy: false, tiny: false } })
    // The same stamps, in another order: the fat one's come before the first thing of the hollow, or after its last.
    expect([...behind].sort()).toEqual([...front].sort())
    expect(behind).not.toEqual(front)
    const things = order({ ...going, inside: { fat: false, tidy: false, tiny: false }, folk: going.folk })
    void things
    const firstMoved = behind.findIndex((sheet, i) => sheet !== front[i])
    // What comes at that place when it is behind is one of its own sheets, which in front comes later.
    expect(front.indexOf(behind[firstMoved], firstMoved)).toBeGreaterThan(firstMoved)
  })
})

describe('where it stops to do something', () => {
  it('steps to its thing on the side where the ground is free, and stands in front of no neighbour', () => {
    // A quilt at the left of the floor: the room is to its right, where a bath stands. It steps to the left of it instead.
    const blocked = evening([{ id: idOf('moss'), x: 580 }, { id: idOf('feather'), x: 580 }, { id: idOf('cap'), x: 668 }])
    const open = evening([{ id: idOf('moss'), x: 580 }, { id: idOf('feather'), x: 580 }])
    const patting = (steps: { show: Show; heard: string[] }[]): Show => steps.find((step) => step.heard.includes('act quilt'))!.show
    expect(patting(open).stand.tidy.x).toBeGreaterThan(580)
    expect(patting(blocked).stand.tidy.x).toBeLessThan(580)
    for (const show of [patting(open), patting(blocked)]) {
      const half = PERSONALITY.tidy.reach.halfWidth * INSIDE * 0.6, x = show.stand.tidy.x
      for (const thing of standing(show, x)) expect(thing.x1 < x - half || thing.x0 > x + half, `thing ${thing.id}`).toBe(true)
    }
  })

  it.each([['odd', 1, 0], ['even', 2, 1]] as const)('sweeps with its hat only the floor that is free beside it, in the %s twenty of forty houses with no feather: the hat is never across a thing that stands there', (_half, first, rightward) => {
    let swept = 0, leaned = 0, leanedLess = 0, toTheRight = 0
    for (let seed = first; seed <= 40; seed += 2) {
      const rng = makeRng(seed * 31)
      const order = FOUND.filter((found) => found.kind !== 'feather').map((found) => ({ id: found.id, key: rng.next() })).sort((a, b) => a.key - b.key)
      const laid: Laid[] = order.slice(0, 2 + Math.floor(rng.next() * 7)).map(({ id }) => ({ id, x: Math.round(HOLLOW.left + rng.next() * (HOLLOW.right - HOLLOW.left)) }))
      const steps = evening(laid, seed)
      let most = 0
      // While it sweeps: from before its first stroke is heard until after its second.
      const first = steps.findIndex((step) => step.heard.includes('act noFeather'))
      expect(first, `house ${seed}`).toBeGreaterThan(0)
      for (const { show } of steps.slice(first - Math.round(0.55 / TICK), first + Math.round(1 / TICK))) {
        const lean = show.folk.tidy.lean
        most = Math.max(most, Math.abs(lean))
        const feet = show.stand.tidy.x, tip = feet + TOWARD.tidy * Math.sin((lean * Math.PI) / 180) * PERSONALITY.tidy.reach.height * show.stand.tidy.scale
        if (tip > feet) toTheRight += 1
        for (const thing of standing(show, feet)) {
          // Its body from its feet to the tip of its hat is clear of every thing that stands on its ground, but for a hand's breadth.
          const across = Math.min(Math.max(feet, tip), thing.x1) - Math.max(Math.min(feet, tip), thing.x0)
          expect(across, `house ${seed}: across thing ${thing.id}`).toBeLessThan(10)
        }
      }
      if (most > 30) swept += 1
      if (most > 10) leaned += 1
      if (most < 55) leanedLess += 1
    }
    // Where there is floor enough it leans well over; in a crowded hollow it leans as far as the free floor goes.
    expect(swept).toBeGreaterThan(2)
    expect(leaned).toBeGreaterThan(10)
    // In some of them the floor is short, and it leans less far; in some the room is to its right.
    expect(leanedLess).toBeGreaterThan(0)
    // (the room is to its right in the even houses only)
    expect(toTheRight).toBeGreaterThanOrEqual(rightward)
  }, 60000)
})
