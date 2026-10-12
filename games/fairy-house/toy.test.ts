import { describe, expect, it } from 'vitest'
import { FOLK, PERSONALITY } from './folk'
import { FOUND, HOLLOW, HOME_CONTROL, overHollow, type Kind } from './kinds'
import { deserialize, freshSave, serialize } from './save'
import { MOTH_LOOP, OWL_AT, SNAIL_PATH, SUN_AT, TICK, Toy, clearOfHomeControl } from './toy'

// The toy with no canvas: touches go in as stage points, time as seconds.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
/** Where a finger lands to take a thing from its place on the forest floor. */
const onFloor = (id: number): { x: number; y: number } => ({ x: FOUND[id].home.x, y: FOUND[id].home.y - (FOUND[id].kind === 'twig' ? 24 : 12) })
/** One whole carry: down on the thing, across to a point, and let go there. */
function carry(toy: Toy, from: { x: number; y: number }, to: { x: number; y: number }): void {
  toy.press(from.x, from.y)
  toy.dragStart()
  for (let i = 1; i <= 10; i++) {
    toy.dragMove(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10)
    toy.step(1 / 60)
  }
  toy.drop()
}
const shownOf = (toy: Toy, id: number) => toy.show(null).things.find((thing) => thing.id === id)!
/** A bare hollow with every thing on the forest floor. */
const bare = (seed = 1): Toy => new Toy(freshSave(7), seed)

describe('a touch', () => {
  it('is answered in the call in which the finger lands, before any time is played', () => {
    const toy = bare(), leaf = idOf('leaf')
    toy.press(onFloor(leaf).x, onFloor(leaf).y)
    expect(toy.sounds.map((sound) => sound.from)).toEqual([`lift ${leaf}`])
    expect(toy.busy).toBe(true)
    expect(toy.seconds).toBe(0)
    // One step later it has hopped up under the finger.
    toy.step(TICK * 6)
    expect(shownOf(toy, leaf).y).toBeLessThan(FOUND[leaf].home.y)
  })

  it('answers on each of the three, the sun, the owl and the snail, and on bare ground too', () => {
    for (const who of FOLK) {
      const toy = bare()
      toy.press(PERSONALITY[who].eyes.x, PERSONALITY[who].eyes.y)
      toy.release()
      expect(toy.sounds.map((sound) => sound.from)).toEqual([`folk ${who}`])
      expect(toy.counts().answers[who]).toBe(1)
    }
    const spots: [string, number, number][] = [['sun', SUN_AT.x, SUN_AT.y], ['owl', OWL_AT.x, OWL_AT.y], ['wood', 600, 200], ['air', 300, 120], ['pat', 600, 739]]
    for (const [from, x, y] of spots) {
      const toy = bare()
      toy.press(x, y)
      toy.release()
      expect(toy.sounds.map((sound) => sound.from)).toEqual([from])
      expect(toy.busy).toBe(false)
    }
    const toy = bare()
    const snail = toy.show(null).snail
    toy.press(snail.x, snail.y - 16)
    expect(toy.sounds.map((sound) => sound.from)).toEqual(['snail'])
  })

  it('leaves everything as it was when it is only a tap', () => {
    const toy = new Toy(freshSave(null), 1), before = toy.toSave()
    const pebble = idOf('pebble', 1)
    toy.press(onFloor(pebble).x, onFloor(pebble).y)
    toy.step(0.2)
    toy.release()
    toy.step(1.5)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe('no')
    expect(toy.busy).toBe(false)
    expect(shownOf(toy, pebble)).toMatchObject({ x: FOUND[pebble].home.x, y: FOUND[pebble].home.y, form: 'loose' })
  })

  it('does nothing in the grown-up corner', () => {
    const toy = bare(), leaf = idOf('leaf')
    toy.press(onFloor(leaf).x, onFloor(leaf).y, true)
    expect(toy.sounds).toEqual([])
    expect(toy.busy).toBe(false)
  })
})

describe('carrying', () => {
  it('sets a thing down in the hollow, and has it saved before it has finished falling', () => {
    const toy = bare(), pebble = idOf('pebble')
    carry(toy, onFloor(pebble), { x: 700, y: 480 })
    expect(toy.toSave().things).toEqual([{ id: pebble, x: 700 }])
    expect(toy.dirty).toBe('soon')
    expect(toy.busy).toBe(true)
    toy.step(1.5)
    expect(toy.busy).toBe(false)
    expect(toy.rested.map((r) => [r.id, r.on])).toEqual([[pebble, 'ground']])
    expect(shownOf(toy, pebble)).toMatchObject({ x: 700, y: toy.rested[0].y, form: 'whole' })
  })

  it('saves a thing in the hand where it came from: nothing is saved in the air', () => {
    const toy = new Toy(freshSave(5), 1), before = toy.toSave()
    const moss = toy.rested[0]
    toy.press(moss.x, moss.y - 20)
    toy.dragStart()
    toy.dragMove(700, 300)
    toy.step(0.3)
    expect(toy.rested).toEqual([])
    expect(toy.toSave()).toEqual(before)
  })

  it('sends a thing let go outside the hollow back to its own place', () => {
    const toy = bare(), cap = idOf('cap')
    carry(toy, onFloor(cap), { x: 120, y: 300 })
    expect(toy.sounds.map((sound) => sound.from)).toContain(`out ${cap}`)
    toy.step(2)
    expect(toy.toSave().things).toEqual([])
    expect(shownOf(toy, cap)).toMatchObject({ x: FOUND[cap].home.x, y: FOUND[cap].home.y, form: 'loose' })
  })

  it('lets a leaf shed what is set on it, and the thing goes home', () => {
    const toy = new Toy(freshSave(null), 1), before = toy.toSave()
    const pebble = idOf('pebble', 1)
    carry(toy, onFloor(pebble), { x: 640, y: 480 })
    toy.step(2.5)
    expect(toy.toSave()).toEqual(before)
    expect(shownOf(toy, pebble)).toMatchObject({ x: FOUND[pebble].home.x, y: FOUND[pebble].home.y })
  })

  it('sheds a thing out of a bath with a splash, and off an acorn cap that holds no water with a clonk', () => {
    const drops = (toy: Toy): number => toy.show(null).puffs.filter((puff) => puff.kind === 'water').length
    const heard = (toy: Toy, id: number) => toy.sounds.filter((sound) => sound.from === `knock ${id}`).map((sound) => sound.voice)
    // A bath: an acorn cap on the ground, cup up, with dew in it.
    const bath = new Toy({ ...freshSave(7), things: [{ id: idOf('cap'), x: 640 }] }, 1), pebble = idOf('pebble')
    expect(bath.rested[0].cell.extra).toBe('water')
    carry(bath, onFloor(pebble), { x: 640, y: 480 })
    for (let i = 0; i < 0.6 / TICK && drops(bath) === 0; i++) bath.step(TICK)
    expect(drops(bath)).toBe(1)
    // A lamp: the same cap on a stone, cup down. What is set on it bounces off dry.
    const lamp = new Toy({ ...freshSave(7), things: [{ id: idOf('pebble', 1), x: 640 }, { id: idOf('cap'), x: 640 }] }, 1)
    expect(lamp.rested[1].cell.extra).toBe('glow')
    carry(lamp, onFloor(pebble), { x: 640, y: 400 })
    for (let i = 0; i < 0.6 / TICK; i++) lamp.step(TICK)
    expect(drops(lamp)).toBe(0)
    expect(heard(bath, pebble)[0]).not.toEqual(heard(lamp, pebble)[0])
    bath.step(2.5)
    expect(bath.toSave().things).toEqual([{ id: idOf('cap'), x: 640 }])
  })

  it('takes up what rests on a thing with it, and sets both down again', () => {
    const toy = new Toy(freshSave(null), 1)
    const [moss, leaf] = toy.rested
    expect(leaf.under).toEqual([moss.id])
    carry(toy, { x: moss.x, y: moss.y - 10 }, { x: 560, y: 500 })
    toy.step(2)
    const again = toy.rested.filter((r) => r.id === moss.id || r.id === leaf.id)
    expect(again.map((r) => [r.id, r.x, r.cell.is])).toEqual([[moss.id, 560, 'cushion'], [leaf.id, 560, 'bed']])
  })

  it('puts the thing back where it came from when the drag is taken away', () => {
    const toy = new Toy(freshSave(null), 1), before = toy.toSave()
    const house = toy.rested.map((r) => ({ ...r }))
    const pebble = toy.rested[2]
    toy.press(pebble.x, pebble.y - 20)
    toy.dragStart()
    toy.dragMove(120, 200)
    toy.step(0.4)
    toy.cancel()
    expect(toy.toSave()).toEqual(before)
    toy.step(2)
    expect(toy.rested).toEqual(house)
    expect(shownOf(toy, pebble.id)).toMatchObject({ x: pebble.x, y: pebble.y })
  })
})

describe('found as left', () => {
  const built = (): Toy => {
    const toy = new Toy(freshSave(null), 3)
    carry(toy, onFloor(idOf('twig', 0)), { x: 400, y: 480 })
    toy.step(1)
    carry(toy, onFloor(idOf('twig', 1)), { x: 470, y: 480 })
    toy.step(1)
    carry(toy, onFloor(idOf('bark', 0)), { x: 435, y: 460 })
    toy.step(1)
    carry(toy, onFloor(idOf('cap', 0)), { x: 770, y: 480 })
    return toy
  }

  it('opens with every thing where it lay, at rest, with no sound and nothing easing in', () => {
    const first = built()
    // Put away with the acorn cap still in the air.
    const stored: unknown = JSON.parse(JSON.stringify(serialize(first.toSave())))
    first.step(3)
    const second = new Toy(deserialize(stored, 9), 77)
    expect(second.sounds).toEqual([])
    expect(second.busy).toBe(false)
    expect(second.rested).toEqual(first.rested)
    const lie = (toy: Toy) => toy.show(null).things.map(({ id, x, y, angle, form, extra, side, snapped, wet }) => ({ id, x, y, angle, form, extra, side, snapped, wet }))
    expect(lie(second)).toEqual(lie(first))
    expect(second.rested.map((r) => r.cell.is)).toEqual(['cushion', 'bed', 'stool', 'post', 'post', 'table', 'lamp'])
  })

  it('plays no time on a frame with no step', () => {
    const toy = built()
    const before = JSON.stringify(toy.show(null))
    toy.step(0)
    expect(JSON.stringify(toy.show(null))).toBe(before)
  })

  it('plays the same from the same seed and the same touches', () => {
    const a = built(), b = built()
    a.step(4)
    b.step(4)
    expect(JSON.stringify(a.show(null))).toBe(JSON.stringify(b.show(null)))
  })
})

describe('the idle cue', () => {
  it('lights a few things, and while the hand shows a move only the one thing it takes: a thing from the forest floor into the hollow, or the sun', () => {
    const toy = bare()
    // Before the hand comes, and between its moves, the cue lies on a few things.
    const waiting = toy.show({ glow: 1, demo: null, demoIndex: -1 })
    expect(waiting.things.filter((thing) => thing.glows).length).toBe(4)
    expect(waiting.sun.glows).toBe(false)
    // With the hand, on the thing it takes and on nothing else.
    const move = toy.demoMove(0)!
    const show = toy.show({ glow: 1, demo: 0.5, demoIndex: 0 })
    expect(show.hand).not.toBeNull()
    expect(show.things.filter((thing) => thing.glows).map((thing) => thing.id)).toEqual([move.id])
    expect(show.sun.glows).toBe(false)
    // Every third time the hand pulls the sun down: then the cue lies on the sun, and on no thing.
    const third = toy.show({ glow: 1, demo: 0.5, demoIndex: 2 })
    expect(toy.demoMove(2)).toMatchObject({ sun: true, id: null })
    expect(third.sun.glows).toBe(true)
    expect(third.things.some((thing) => thing.glows)).toBe(false)
    expect(overHollow(move.to.x, move.to.y)).toBe(true)
    expect(move.from.y).toBeGreaterThan(HOLLOW.floorY)
    // The hand shows a move and makes none.
    expect(toy.toSave().things).toEqual([])
    expect(toy.show({ glow: 0, demo: null, demoIndex: -1 }).things.some((thing) => thing.glows)).toBe(false)
  })

  it('shows no hand while a finger is carrying', () => {
    const toy = bare(), leaf = idOf('leaf')
    toy.press(onFloor(leaf).x, onFloor(leaf).y)
    expect(toy.show({ glow: 1, demo: 0.5, demoIndex: 0 }).hand).toBeNull()
  })
})

describe('where things stand', () => {
  it('keeps everything that answers a touch clear of the home control at the top centre', () => {
    for (const found of FOUND) expect(clearOfHomeControl(found.home.x, found.home.y - 20, 60), `thing ${found.id}`).toBe(true)
    expect(clearOfHomeControl(SUN_AT.x, SUN_AT.y, SUN_AT.r)).toBe(true)
    expect(clearOfHomeControl(OWL_AT.x, OWL_AT.y, OWL_AT.r)).toBe(true)
    expect(clearOfHomeControl(SNAIL_PATH.toX, SNAIL_PATH.toY, SNAIL_PATH.r)).toBe(true)
    expect(clearOfHomeControl(MOTH_LOOP.x + MOTH_LOOP.rx, MOTH_LOOP.y - MOTH_LOOP.ry, 38)).toBe(true)
    for (const who of FOLK) {
      const { feet, reach } = PERSONALITY[who]
      expect(Math.abs(feet.x - HOME_CONTROL.x) - reach.halfWidth, who).toBeGreaterThan(HOME_CONTROL.r + 10)
    }
    // The top of the arch, the highest place a thing can be set, is far below it.
    expect(HOLLOW.floorY - HOLLOW.archRy).toBeGreaterThan(HOME_CONTROL.y + HOME_CONTROL.r + 100)
  })

  it('has room on the forest floor for a finger on each thing: their middles are a finger apart', () => {
    for (const a of FOUND) for (const b of FOUND) {
      if (a.id >= b.id) continue
      expect(Math.hypot(a.home.x - b.home.x, a.home.y - b.home.y), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(64)
    }
  })
})
