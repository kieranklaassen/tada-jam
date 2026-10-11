import { describe, expect, it } from 'vitest'
import { CART, SNAIL, SUN, SUN_DOWN_Y, mossBottom } from './ground'
import { freshSave } from './save'
import { stepAt } from './shapes'
import { Village } from './village'
import { BELL, FRAME, ON_CART, PUFF, RED, carry, doorOf, fromLog, loaded, run, tap, village, type At } from './testkit'

// The short scenes: what each keeps when it starts, how it arrives beat by
// beat, that a touch ends it at once and in silence, and that a load never
// plays it again.

const WATER: At = { x: 870, y: 742 }
/** Draws a finger through a list of points and lets go. */
const draw = (v: Village, points: readonly At[]): void => { v.press(points[0]); for (const p of points.slice(1)) v.drag(p); v.lift() }
/** Runs until the scene is over, and says how long that took. */
const toTheEnd = (v: Village, most = 20): number => { let t = 0; while (v.sceneRunning && t < most) { v.step(FRAME); t += FRAME } return t }
const sceneWhats = (v: Village): string[] => v.takeFired().map((f) => f.what)

describe('the cart comes', () => {
  const first = () => new Village(freshSave(3), 1)

  it('does not start on load, however long the glade is left alone', () => {
    const v = first()
    run(v, 6)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().cart).toBeNull()
    expect(v.toSave().shown).toEqual([])
  })

  it('starts when the child lifts a finger from any touch, and is kept from that moment', () => {
    const v = first()
    v.press(WATER); v.step(FRAME)
    expect(v.sceneRunning).toBe(false)
    v.takeChange()
    v.lift()
    expect(v.sceneRunning).toBe(true)
    expect(v.toSave().shown).toEqual(['cart'])
    expect(v.takeChange()).toBe('now')
  })

  it('has the snail pull the cart in from the right edge to its place, in about four seconds', () => {
    const v = first()
    tap(v, WATER)
    run(v, 1.5)
    const coming = v.show().cart!
    expect(coming.x).toBeGreaterThan(CART.x + 20)
    expect(v.show().snail.x).not.toBe(SNAIL.x)
    const took = 1.5 + toTheEnd(v)
    expect(took).toBeGreaterThan(3)
    expect(took).toBeLessThan(5.5)
    expect(v.show().cart!.x).toBe(CART.x)
    expect(v.show().snail.x).toBe(SNAIL.x)
  })

  it('is put at its place at once by a touch, and nothing of it is heard after that', () => {
    const v = first()
    tap(v, WATER)
    run(v, 1)
    v.takeFired()
    v.press(WATER)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().cart!.x).toBe(CART.x)
    expect(v.show().snail.x).toBe(SNAIL.x)
    run(v, 5)
    expect(sceneWhats(v).some((what) => what.includes('snail') || what.includes('cart'))).toBe(false)
  })

  it('is not played again after a load, in the middle of it or after it', () => {
    const v = first()
    tap(v, WATER)
    run(v, 1)
    const again = loaded(v)
    expect(again.sceneRunning).toBe(false)
    expect(again.show().cart).toEqual({ x: CART.x, hop: 0 })
    tap(again, WATER)
    expect(again.sceneRunning).toBe(false)
  })

  it('is still owed after a put-away before it started, and waits for the child\'s first touch', () => {
    const before = new Village({ ...freshSave(6), mushrooms: [RED] }, 1)
    run(before, 3)
    expect(before.sceneRunning).toBe(false)
    tap(before, WATER)
    expect(before.sceneRunning).toBe(true)
  })
})

describe('the first pebbles', () => {
  const ready = () => village({ mushrooms: [RED], shown: ['cart'], homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })

  it('are kept when the showing starts, with the door that caused it, and arrive one by one', () => {
    const v = ready()
    v.press(ON_CART); v.step(FRAME); v.takeChange()
    v.lift()
    expect(v.sceneRunning).toBe(true)
    expect(v.toSave().mushrooms[0].door).toBe(true)
    expect(v.toSave().shown).toEqual(['cart', 'pebbles'])
    expect(v.toSave().paths.length).toBe(1)
    expect(v.toSave().paths[0].length).toBe(3)
    expect(v.takeChange()).toBe('now')
    const seen: number[] = []
    let took = 0
    while (v.sceneRunning && took < 20) { v.step(FRAME); took += FRAME; seen.push(v.show().pebbles.length) }
    expect(took).toBeGreaterThan(4)
    // About five seconds, after the door has flown from the cart into the mushroom.
    expect(took).toBeLessThan(7.2)
    expect(new Set(seen)).toEqual(new Set([0, 1, 2, 3]))
    expect(v.show().snail.x).toBe(SNAIL.x)
  })

  it('lie where no mushroom\'s foot stands and lead from the log towards the door the child fitted', () => {
    const right = ready()
    tap(right, ON_CART)
    const left = village({ mushrooms: [PUFF], shown: ['cart'], homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })
    tap(left, ON_CART)
    expect(right.toSave().paths[0][2].x).toBeGreaterThan(left.toSave().paths[0][2].x)
    for (const v of [left, right]) for (const p of v.toSave().paths[0]) expect(p.y).toBeGreaterThan(mossBottom(p.x) + 14)
  })

  it('are laid at once by a touch, with the snail back in its corner and silent', () => {
    const v = ready()
    tap(v, ON_CART)
    run(v, 1.2)
    v.takeFired()
    v.press(WATER)
    expect(v.show().pebbles.length).toBe(3)
    expect(v.show().snail.x).toBe(SNAIL.x)
    expect(v.show().snail.y).toBe(SNAIL.y)
    run(v, 5)
    expect(sceneWhats(v).some((what) => what.includes('snail'))).toBe(false)
  })

  it('are never shown to a child who has laid a pebble already', () => {
    const v = village({ mushrooms: [RED], shown: ['cart'], homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })
    carry(v, { x: 860, y: 620 }, { x: 980, y: 620 }); v.lift()
    expect(v.toSave().shown).toContain('pebbles')
    const points = v.toSave().paths.flat().length
    tap(v, ON_CART)
    expect(v.toSave().paths.flat().length).toBe(points)
  })

  it('are owed after a put-away between the door and the showing, and not played on load', () => {
    const v = new Village({ ...freshSave(6), mushrooms: [{ ...RED, door: true }], shown: ['cart'], homes: { tall: null, sleepy: 1, sneezy: null, baker: null } }, 1)
    run(v, 3)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().pebbles.length).toBe(0)
    tap(v, WATER)
    expect(v.sceneRunning).toBe(true)
    expect(v.toSave().shown).toContain('pebbles')
  })
})

describe('moving in', () => {
  it('is kept in the same save as the door that goes in: the sleepy one, over the moss, when no path leads there', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, ON_CART, { x: RED.x, y: RED.y - 30 }); v.takeChange()
    v.lift()
    expect(v.toSave().mushrooms[0].door).toBe(true)
    expect(v.toSave().homes.sleepy).toBe(1)
    expect(v.takeChange()).toBe('now')
    expect(v.sceneRunning).toBe(true)
    let out = false
    const took = (() => { let t = 0; while (v.sceneRunning && t < 20) { v.step(FRAME); t += FRAME; out ||= v.show().gnomes.sleepy.where === 'out' } return t })()
    expect(out).toBe(true)
    expect(took).toBeGreaterThan(3)
    expect(took).toBeLessThan(11)
    expect(v.show().gnomes.sleepy.where).toBe('home')
    expect(v.show().mushrooms[0].who).toBe('sleepy')
  })

  it('is kept in the same save as the pebble that joins the path, which ends the stroke: the one the house fits goes', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })
    draw(v, fromLog(stepAt(RED)))
    expect(v.toSave().homes.sneezy).toBe(1)
    expect(v.sceneRunning).toBe(true)
    let farthest = 0
    while (v.sceneRunning) { v.step(FRAME); if (v.show().gnomes.sneezy.where === 'out') farthest = Math.max(farthest, v.show().gnomes.sneezy.x) }
    expect(farthest).toBeGreaterThan(RED.x - 60)
    expect(v.show().mushrooms[0].manner).toBe('sunning')
  })

  it('keeps the hat on the step from the start when the tall gnome will have to leave it outside', () => {
    const low = { ...RED, size: 2, door: true }
    const v = village({ mushrooms: [low], homes: { tall: null, sleepy: 9, sneezy: 9, baker: 9 } })
    draw(v, fromLog(stepAt(low), 180))
    expect(v.toSave().homes.tall).toBe(1)
    expect(v.toSave().hatOff).toBe(true)
    expect(v.show().hat).toBeNull()
    toTheEnd(v)
    expect(v.show().hat).not.toBeNull()
    expect(v.show().mushrooms[0].manner).toBe('crawled')
  })

  it('puts him inside at once under a touch, with the hat on the step if it belongs there, and he is not heard again', () => {
    const low = { ...RED, size: 2, door: true }
    const v = village({ mushrooms: [low], homes: { tall: null, sleepy: 9, sneezy: 9, baker: 9 } })
    draw(v, fromLog(stepAt(low), 180))
    run(v, 1)
    v.takeFired()
    v.press(WATER)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().gnomes.tall.where).toBe('home')
    expect(v.show().hat).not.toBeNull()
    run(v, 8)
    expect(sceneWhats(v).some((what) => what.includes('gnome'))).toBe(false)
  })

  it('finds him at home after a load in the middle of his way, and plays nothing', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, ON_CART, { x: RED.x, y: RED.y - 30 }); v.lift()
    run(v, 0.5)
    const again = loaded(v)
    expect(again.sceneRunning).toBe(false)
    expect(again.show().gnomes.sleepy.where).toBe('home')
    run(again, 3)
    expect(again.sceneRunning).toBe(false)
  })

  it('sends the one the child taps instead of the one who was going', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: 9, sneezy: null, baker: null } })
    draw(v, fromLog(stepAt(RED)))
    expect(v.toSave().homes.sneezy).toBe(1)
    run(v, 0.6)
    tap(v, { x: 98, y: 500 })
    expect(v.toSave().homes.sneezy).toBeNull()
    expect(v.toSave().homes.tall).toBe(1)
    expect(v.sceneRunning).toBe(true)
  })
})

describe('a walk', () => {
  const lived = () => village({ mushrooms: [{ ...RED, door: true }], paths: [fromLog(stepAt(RED))], homes: { tall: null, sleepy: null, sneezy: 1, baker: null } })

  it('brings the gnome out at a tap on his door, takes him along his path and home again, and keeps nothing', () => {
    const v = lived()
    const kept = JSON.stringify(v.toSave())
    v.takeChange()
    tap(v, doorOf(v, 1))
    expect(v.sceneRunning).toBe(true)
    let nearest = 9999, t = 0
    while (v.sceneRunning && t < 20) { v.step(FRAME); t += FRAME; const g = v.show().gnomes.sneezy; if (g.where === 'out') nearest = Math.min(nearest, g.x); expect(JSON.stringify(v.toSave())).toBe(kept) }
    expect(nearest).toBeLessThan(600)
    expect(t).toBeGreaterThan(4)
    expect(t).toBeLessThan(11)
    expect(v.show().gnomes.sneezy.where).toBe('home')
    expect(v.takeChange()).toBe('none')
  })

  it('puts him back indoors under a touch, and he is not heard again', () => {
    const v = lived()
    tap(v, doorOf(v, 1))
    run(v, 1.5)
    v.takeFired()
    v.press(WATER)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().gnomes.sneezy.where).toBe('home')
    run(v, 8)
    expect(sceneWhats(v).some((what) => what.includes('gnome'))).toBe(false)
  })

  it('starts when a path is newly joined to a lived-in door', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: 1, sneezy: null, baker: null } })
    draw(v, [{ x: 900, y: 620 }, { x: 960, y: 600 }, { x: RED.x, y: stepAt(RED).y }])
    expect(v.sceneRunning).toBe(true)
    expect(v.toSave().homes.sleepy).toBe(1)
  })
})

describe('night and morning', () => {
  const three = () => village({ mushrooms: [{ ...RED, door: true }, { ...BELL, door: true }, { ...PUFF, door: true }], homes: { tall: null, sleepy: 3, sneezy: 1, baker: 2 } })

  it('keeps the night when the scene starts, paints the sky from the top down and lights the windows in the order the houses were built', () => {
    const v = three()
    v.press(SUN); v.step(FRAME); v.takeChange()
    v.lift()
    expect(v.toSave().night).toBe(true)
    expect(v.takeChange()).toBe('now')
    const lit: number[] = []
    let dark = 0, t = 0
    while (v.sceneRunning && t < 12) {
      v.step(FRAME); t += FRAME
      expect(v.show().dark).toBeGreaterThanOrEqual(dark - 1e-9)
      dark = v.show().dark
      for (const m of v.show().mushrooms) if (m.glow > 0.2 && !lit.includes(m.id)) lit.push(m.id)
    }
    expect(lit).toEqual([1, 2, 3])
    expect(t).toBeGreaterThan(4)
    expect(t).toBeLessThan(8)
    expect(v.show().dark).toBe(1)
    expect(v.show().snail.lamp).toBe(true)
    expect(v.show().sun.asleep).toBe(true)
  })

  it('finishes the lighting at once under a touch', () => {
    const v = three()
    tap(v, SUN)
    run(v, 0.8)
    v.press(WATER)
    expect(v.sceneRunning).toBe(false)
    expect(v.show().dark).toBe(1)
    expect(v.show().mushrooms.every((m) => m.glow > 0.99)).toBe(true)
    expect(v.show().snail.lamp).toBe(true)
  })

  it('is found as night after a load, with every window lit and nothing played', () => {
    const v = three()
    tap(v, SUN)
    run(v, 0.5)
    const again = loaded(v)
    expect(again.sceneRunning).toBe(false)
    expect(again.show().dark).toBe(1)
    expect(again.show().mushrooms.every((m) => m.glow > 0.99)).toBe(true)
    expect(again.show().sun.y).toBe(SUN_DOWN_Y)
  })

  it('is over in about two seconds in the morning, with the village as it was built', () => {
    const v = village({ mushrooms: [{ ...RED, door: true }], homes: { tall: null, sleepy: null, sneezy: 1, baker: null }, night: true })
    const kept = v.toSave()
    tap(v, { x: SUN.x, y: SUN_DOWN_Y - 40 })
    expect(v.toSave()).toEqual({ ...kept, night: false })
    const took = toTheEnd(v)
    expect(took).toBeGreaterThan(1)
    expect(took).toBeLessThan(3)
    expect(v.show().dark).toBe(0)
    expect(v.show().sun.y).toBe(SUN.y)
    expect(v.show().mushrooms[0].glow).toBeLessThan(0.05)
  })

  it('works at night as by day: a finger grows a mushroom', () => {
    const v = village({ night: true })
    v.press({ x: 900, y: 600 }); run(v, 0.5); v.lift()
    expect(v.count).toBe(1)
    expect(v.toSave().mushrooms[0].size).toBeGreaterThan(2)
  })
})
