import { describe, expect, it } from 'vitest'
import { FULL, MOST, TIERS } from './config'
import { IDLE_BEFORE_DEMO, IdleLadder, DEMO_SECONDS } from './guidance'
import { Hints } from './hint'
import { freshSave } from './save'
import { GladeView } from './view'
import { SEATS, SUN } from './ground'
import { stepAt } from './shapes'
import { BELL, LOOSEN_S, ON_CART, PUFF, RED, carry, doorOf, fromLog, hatOf, tap, village as kept } from './testkit'
import { OUT, Village } from './village'

// The frame budget, counted and not timed, so it holds on a busy runner. A
// frame of this game is sprites that were painted once and are stamped, plus
// a few live fills and lines (pupils, lids, brows, mouths, glints, specks).
// The real view draws into a stand-in context that takes every call and does
// nothing, and the view's own counts are held here: stamps plus strokes is
// the frame's draw count, the canvas reading of the jam's "under about 80".

/** A canvas whose context accepts any call: enough for the view to paint and draw without a browser. */
function standIn(width: number, height: number): HTMLCanvasElement {
  const context: Record<string | symbol, unknown> = {}
  const proxy = new Proxy(context, {
    get: (target, key) => (key in target ? target[key] : key === 'createPattern' ? () => null : () => undefined),
    set: (target, key, value) => { target[key] = value; return true },
  })
  return { width, height, getContext: () => proxy } as unknown as HTMLCanvasElement
}

/** Ten feet that fill the glade, each in its own room; the last is left out where a free place is wanted. */
const FEET = [[200, 400], [330, 470], [450, 380], [540, 480], [640, 400], [760, 440], [780, 548], [1030, 500], [1130, 540], [900, 520]] as const

const BUDGET = { draws: 80, fullSurface: 1 }
const W = 1180, H = 820, RATIO = 2

function view(): GladeView {
  const made = new GladeView(standIn(W * RATIO, H * RATIO), standIn)
  made.resize(W, H, RATIO)
  made.setTier(TIERS[0])
  return made
}

describe('the frame budget', () => {
  it('draws the bare place, before the save has been read, as the backdrop and the characters at rest', () => {
    const counts = view().draw(null, null)
    expect(counts.stamps + counts.strokes).toBeLessThan(BUDGET.draws)
    expect(counts.stamps).toBeGreaterThan(10)
  })

  it('stays under the budget in the busiest frame a child can reach: a full glade, a sneeze, a frog, a pull, flour in the air', () => {
    const village = new Village({ ...freshSave(6), mushrooms: FEET.map(([x, y], i) => ({ id: i + 1, x, y, size: FULL, door: false })) }, 1)
    const made = view()
    let worst = 0
    const frame = () => { const counts = made.draw(village.show(), null); worst = Math.max(worst, counts.stamps + counts.strokes) }
    const run = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) { village.step(1 / 60); frame() } }
    // A poke on a puffball, the baker poked, a finger held in the pond, then a mushroom pulled out.
    village.press({ x: 200, y: 340 }); village.lift(); run(0.3)
    village.press({ x: 606, y: 650 }); village.lift(); run(0.3)
    village.press({ x: 806, y: 742 }); run(1.2); village.lift(); run(0.2)
    village.press({ x: 450, y: 300 }); village.drag({ x: 450, y: 220 }); run(0.7); village.drag({ x: 450, y: 120 }); run(0.5)
    expect(village.count).toBe(MOST - 1)
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
    expect(worst).toBeGreaterThan(40)
  })

  it('stays under the budget with the glow, the ghost hand and its ghost mushroom up', () => {
    const village = new Village({ ...freshSave(6), mushrooms: FEET.slice(0, MOST - 1).map(([x, y], i) => ({ id: i + 1, x, y, size: FULL, door: false })) }, 1)
    const made = view(), ladder = new IdleLadder(0), hints = new Hints()
    let worst = 0, hands = 0
    for (let t = IDLE_BEFORE_DEMO - 1; t < IDLE_BEFORE_DEMO + DEMO_SECONDS; t += 1 / 30) {
      village.step(1 / 30)
      const hint = hints.update(ladder.update(t), (x, y) => village.hasRoom(x, y))
      if (hint?.hand) hands += 1
      const counts = made.draw(village.show(), hint)
      worst = Math.max(worst, counts.stamps + counts.strokes)
    }
    expect(hands).toBeGreaterThan(30)
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
  })

  it('lays the whole surface down once a frame, as one stamp of the painted place', () => {
    let full = 0
    const canvas = standIn(W * RATIO, H * RATIO)
    const context = canvas.getContext('2d') as unknown as Record<string, unknown>
    context.drawImage = (source: { width: number; height: number }, ...rest: number[]) => { if (rest.length === 2 && source.width >= W * RATIO * 0.8) full += 1 }
    const made = new GladeView(canvas, standIn)
    made.resize(W, H, RATIO)
    made.draw(new Village(freshSave(null), 1).show(), null)
    expect(full).toBe(BUDGET.fullSurface)
  })

  it('draws fewer glints on a lower tier and the same glade', () => {
    const village = new Village(freshSave(null), 1)
    const top = view(), low = view()
    low.setTier(TIERS[TIERS.length - 1])
    expect(low.draw(village.show(), null)).toEqual(top.draw(village.show(), null))
    expect(TIERS[TIERS.length - 1].glints).toBeLessThan(TIERS[0].glints)
  })
})

describe('the frame budget of the whole game', () => {
  const HOUSES = FEET.map(([x, y], i) => ({ id: i + 1, x, y, size: i % 3 === 0 ? 3 : FULL, door: true }))
  /** Rows of pebbles over the lower moss: as many as the glade keeps. */
  const PEBBLES = [580, 600, 620, 640].map((y) => Array.from({ length: 56 }, (_, i) => ({ x: 40 + i * 20, y })))

  const worstOf = (village: Village, script: (run: (seconds: number) => void) => void, hints = false): number => {
    const made = view(), ladder = new IdleLadder(0), shown = new Hints()
    let worst = 0, t = IDLE_BEFORE_DEMO - 1
    const run = (seconds: number) => {
      for (let left = seconds; left > 0; left -= 1 / 60) {
        village.step(1 / 60)
        t += 1 / 60
        const hint = hints ? shown.update(ladder.update(t), (x, y) => village.clearFor(x, y), village.want()) : null
        const counts = made.draw(village.show(), hint)
        worst = Math.max(worst, counts.stamps + counts.strokes)
      }
    }
    script(run)
    return worst
  }

  it('holds at night over a full village: ten lit houses, four gnomes on the log, every pebble, smoke, a poke and a frog', () => {
    const village = kept({ mushrooms: HOUSES, paths: PEBBLES, homes: { tall: null, sleepy: null, sneezy: null, baker: null }, night: true })
    const worst = worstOf(village, (run) => {
      run(3)
      tap(village, { x: SEATS.baker.x, y: SEATS.baker.y - 60 }); run(0.3)
      village.press({ x: 806, y: 742 }); run(1.2); village.lift(); run(0.3)
      tap(village, { x: 200, y: 340 }); run(0.8)
    })
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
    expect(worst).toBeGreaterThan(40)
  })

  it('holds while the night is painted over a full village, and while the morning comes', () => {
    const village = kept({ mushrooms: HOUSES, paths: PEBBLES, homes: { tall: 1, sleepy: null, sneezy: null, baker: null }, hatOff: true })
    const worst = worstOf(village, (run) => {
      tap(village, SUN); run(8)
      tap(village, { x: SUN.x, y: 250 }); run(3)
    })
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
  })

  it('holds with every gnome at home in a window, a hat on a step, one of them out on a walk and a door in the hand', () => {
    const village = kept({ mushrooms: [{ ...RED, door: true, size: 3 }, { ...BELL, door: true }, { ...PUFF, door: true }, { id: 4, x: 900, y: 500, size: FULL, door: true }, { id: 5, x: 450, y: 380, size: FULL, door: false }], paths: [fromLog(stepAt(RED)), ...PEBBLES.slice(2)], homes: { tall: 1, sleepy: 3, sneezy: 4, baker: 2 }, hatOff: true })
    const worst = worstOf(village, (run) => {
      run(1)
      tap(village, doorOf(village, 1)); run(3)
      carry(village, ON_CART, { x: 700, y: 300 }); run(0.5)
      village.lift(); run(1)
      carry(village, { x: 450, y: 300 }, { x: 450, y: 300 - OUT - 40 }); run(0.3); village.lift(); run(0.6)
    })
    expect(worst).toBeLessThanOrEqual(BUDGET.draws)
    expect(worst).toBeGreaterThan(25)
  })

  it('holds while the snail flicks the first pebbles over a full village, and while a gnome walks back to the log past a red cap that pops its spot', () => {
    const first = kept({ mushrooms: HOUSES.map((house, i) => ({ ...house, door: i > 0 })), homes: { tall: 2, sleepy: null, sneezy: 3, baker: 4 }, hatOff: true, shown: ['cart'] })
    let tossed = false
    const flicked = worstOf(first, (run) => {
      run(0.5)
      tap(first, ON_CART)
      for (let i = 0; i < 16; i++) { run(0.25); tossed ||= first.show().props.some((prop) => prop.what === 'toss') }
    })
    expect(tossed).toBe(true)
    expect(flicked).toBeLessThanOrEqual(BUDGET.draws)

    const back = kept({ mushrooms: HOUSES, paths: PEBBLES, homes: { tall: 1, sleepy: 2, sneezy: 3, baker: 4 }, hatOff: true })
    let walking = false, spot = false
    const walked = worstOf(back, (run) => {
      run(0.5)
      const cap = { x: HOUSES[2].x, y: HOUSES[2].y - 150 }
      back.press(cap)
      for (let up = 10; up <= OUT + 30; up += 10) back.drag({ x: cap.x, y: cap.y - up })
      run(LOOSEN_S)
      back.lift()
      run(0.4)
      walking = back.show().gnomes.sneezy.where === 'out'
      back.press({ x: 450, y: 380 }); run(1.2); back.lift()
      spot = back.show().props.some((prop) => prop.what === 'spot')
      run(2)
    })
    expect(walking).toBe(true)
    expect(spot).toBe(true)
    expect(walked).toBeLessThanOrEqual(BUDGET.draws)
  })

  it('holds with the hand of each act up: a door carried to a mushroom, a path drawn to a door, the sun pulled down', () => {
    const door = kept({ mushrooms: [RED, BELL] })
    const path = kept({ mushrooms: [{ ...RED, door: true }, BELL], paths: PEBBLES, homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })
    const sun = kept({ mushrooms: HOUSES.slice(0, 4), paths: PEBBLES, homes: { tall: 1, sleepy: 2, sneezy: 3, baker: 4 } })
    expect(door.want().act).toBe('door')
    expect(path.want().act).toBe('path')
    expect(sun.want().act).toBe('sun')
    for (const village of [door, path, sun]) { const worst = worstOf(village, (run) => run(DEMO_SECONDS + 1.5), true); expect(worst).toBeLessThanOrEqual(BUDGET.draws) }
  })
})

describe('the view and the model', () => {
  /** Wraps what is shown so that every field the view reads is written down, by the name of its place. */
  function watched<T>(value: T, at: string, read: Set<string>): T {
    if (value === null || typeof value !== 'object') return value
    return new Proxy(value as object, {
      get: (target, key) => {
        const next = (target as Record<string | symbol, unknown>)[key]
        if (typeof key !== 'string' || typeof next === 'function' || key === 'length') return next
        const name = Array.isArray(target) || at === 'shown.gnomes' ? at : `${at}.${key}`
        if (!Array.isArray(target)) read.add(name)
        return watched(next, name, read)
      },
    }) as T
  }
  function names(value: unknown, at: string, into: Set<string>): void {
    if (value === null || typeof value !== 'object') return
    if (Array.isArray(value)) { for (const each of value) names(each, at, into); return }
    for (const [key, next] of Object.entries(value)) { const name = at === 'shown.gnomes' ? at : `${at}.${key}`; into.add(name); names(next, name, into) }
  }

  it('reads every value the model sets: nothing the rules pose is left undrawn', () => {
    const village = kept({ mushrooms: [{ ...RED, door: true, size: 3 }, { ...BELL, door: true }, PUFF], paths: [fromLog(stepAt(RED)), [860, 880, 900, 920].map((x) => ({ x, y: 620 })), [900, 900, 900].map((x, i) => ({ x, y: 600 + 20 * i }))], homes: { tall: 1, sleepy: null, sneezy: null, baker: 2 }, hatOff: true })
    const made = view(), set = new Set<string>(), read = new Set<string>()
    const frames = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) { village.step(1 / 60); const shown = village.show(); names(shown, 'shown', set); made.draw(watched(shown, 'shown', read), null) } }
    frames(0.2)
    tap(village, { x: PUFF.x, y: PUFF.y - 60 }); frames(0.9)
    village.press({ x: 806, y: 742 }); frames(0.8); village.drag({ x: 806, y: 600 }); frames(0.3); village.lift(); frames(0.3)
    carry(village, hatOf('sneezy'), { x: SEATS.sneezy.x, y: hatOf('sneezy').y - 90 }); frames(0.3); village.lift(); frames(0.3)
    carry(village, ON_CART, { x: 900, y: 620 }); frames(0.2); village.lift(); frames(1)
    carry(village, ON_CART, { x: 806, y: 742 }); village.lift(); frames(0.6)
    carry(village, ON_CART, { x: SEATS.sleepy.x, y: SEATS.sleepy.y - 60 }); village.lift(); frames(0.6)
    tap(village, doorOf(village, 1)); frames(2.5)
    village.press({ x: 700, y: 430 }); frames(0.4); village.lift(); frames(0.2)
    carry(village, { x: 700, y: 380 }, { x: 700, y: 380 - OUT - 60 }); frames(0.2); village.lift(); frames(0.5)
    carry(village, { x: 880, y: 620 }, { x: 880, y: 620 - OUT - 40 }); frames(0.2); village.lift(); frames(0.4)
    tap(village, SUN); frames(7)
    const unread = [...set].filter((name) => !read.has(name)).sort()
    // What is left is no pose: a name, a speed the model uses to move a speck, the top of a box drawn from its foot.
    expect(unread).toEqual(['shown.hat.box.y0', 'shown.mushrooms.id', 'shown.props.who', 'shown.specks.vx', 'shown.specks.vy'])
  })
})
