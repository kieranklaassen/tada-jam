import { describe, expect, it } from 'vitest'
import { FOUND, HOLLOW, groundY, type Kind } from './kinds'
import { CELLS } from './cells'
import { TOUCH_SECONDS, seconds } from './voices'
import { SEESAW_SHIFT, drawnBox } from './lie'
import { build, laidOf, type Laid, type Rested } from './rest'
import { freshSave } from './save'
import { TICK, Toy, type ShownThing } from './toy'

// A thing set on the high end of a see-saw tips that end down and the other
// up, with the donk when it touches. Whatever is set on a tipped see-saw lies
// on its slope: a small thing on the end or over the stone, where it was let
// go, and a wide one along the slab. It lies level only on a slab that does.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const STONE = 640
/** A see-saw in the middle of the floor, tipped down to the right. */
const SEESAW: Laid[] = [{ id: idOf('pebble'), x: STONE }, { id: idOf('bark'), x: STONE + 14 }]
const SLAB = idOf('bark')

const at = (toy: Toy, id: number): ShownThing => { const show = toy.show(null); return { ...[...show.things, ...show.front].find((thing) => thing.id === id)! } }
const restOf = (toy: Toy, id: number): Rested => toy.rested.find((r) => r.id === id)!
function letGo(toy: Toy, id: number, x: number): void {
  const home = FOUND[id].home
  toy.press(home.x, home.y - 8)
  toy.dragStart()
  toy.dragMove(x, 400)
  for (let i = 0; i < 30; i++) toy.step(TICK)
  toy.drop()
}
type Frame = { slab: ShownThing; load: ShownThing; donks: number; landed: number }
/** Watches the slab and a load, step by step: what each looks like, and the knocks of each in that step. */
function watch(toy: Toy, load: number, seconds: number): Frame[] {
  const frames: Frame[] = []
  for (let i = 0; i < seconds / TICK; i++) {
    const before = toy.sounds.length
    toy.step(TICK)
    const said = toy.sounds.slice(before)
    frames.push({ slab: at(toy, SLAB), load: at(toy, load), donks: said.filter((sound) => sound.from === `knock ${SLAB}`).length, landed: said.filter((sound) => sound.from === `knock ${load}`).length })
  }
  return frames
}
/** The lowest point of a thing as it is drawn. */
const foot = (thing: ShownThing): number => { const box = drawnBox(thing); return box.y + box.h }
const resting = (): Toy => { const toy = new Toy({ ...freshSave(7), things: laidOf(build(SEESAW)) }, 3); for (let i = 0; i < 2 / TICK; i++) toy.step(TICK); return toy }

describe('a thing set on a see-saw', () => {
  it('tips the high end down when it is set on it, and the other end up, with a donk in the step it touches', () => {
    const toy = resting(), pebble = idOf('pebble', 1)
    expect(restOf(toy, SLAB)).toMatchObject({ lies: 'tipped', side: 1 })
    const was = at(toy, SLAB)
    expect(was.angle).toBeGreaterThan(0.2)
    letGo(toy, pebble, STONE - 44)
    // The house has the slab on its other end from the moment the thing is let go: that is what a save holds.
    expect(restOf(toy, SLAB)).toMatchObject({ lies: 'tipped', side: -1 })
    expect(restOf(toy, pebble).along).toBeLessThan(0)
    const frames = watch(toy, pebble, 3)
    const landed = frames.findIndex((frame) => frame.landed > 0)
    // Until the thing lands the slab is seen as it lay, and the thing lands on its high end, above the stone's top.
    for (const frame of frames.slice(0, landed)) expect([frame.slab.x, frame.slab.y, frame.slab.angle]).toEqual([was.x, was.y, was.angle])
    expect(frames[landed].load.y).toBeLessThan(restOf(toy, pebble).y - 20)
    // Then they go down together: the slab turns a little each step, never jumps, and the thing stays on it.
    const donk = frames.findIndex((frame) => frame.donks > 0)
    expect(donk - landed).toBeGreaterThan(30)
    for (let i = landed + 1; i <= donk; i++) {
      expect(Math.abs(frames[i].slab.angle - frames[i - 1].slab.angle)).toBeLessThan(0.04)
      expect(Math.hypot(frames[i].slab.x - frames[i - 1].slab.x, frames[i].slab.y - frames[i - 1].slab.y)).toBeLessThan(4)
      expect(Math.hypot(frames[i].load.x - frames[i - 1].load.x, frames[i].load.y - frames[i - 1].load.y)).toBeLessThan(4)
      expect(frames[i].load.angle).toBeCloseTo(frames[i].slab.angle, 5)
    }
    // One donk, in the step the end touches the ground: the step before, it was still above it.
    expect(frames.reduce((sum, frame) => sum + frame.donks, 0)).toBe(1)
    expect(Math.abs(foot(frames[donk].slab) - groundY(STONE))).toBeLessThan(3)
    expect(foot(frames[donk - 1].slab)).toBeLessThan(foot(frames[donk].slab) - 0.3)
    // It now leans down to the left, the thing lies low on that end, and nothing moves after.
    expect(frames[donk].slab.angle).toBeLessThan(-0.2)
    expect(frames[donk].load.x).toBeLessThan(STONE - 30)
    const end = frames[frames.length - 1]
    expect([end.slab.x, end.slab.angle, end.load.y]).toEqual([frames[donk].slab.x, frames[donk].slab.angle, frames[donk].load.y])
    expect(end.load.y).toBeCloseTo(restOf(toy, pebble).y, 5)
    // Found as left: the house a save gives back is this house, and it is shown the same.
    const loaded = new Toy(toy.toSave(), 5)
    expect(loaded.rested).toEqual(toy.rested)
    expect([at(loaded, SLAB).x, at(loaded, SLAB).angle, at(loaded, pebble).x, at(loaded, pebble).y, at(loaded, pebble).angle]).toEqual([end.slab.x, end.slab.angle, end.load.x, end.load.y, end.load.angle])
  })

  it('lies on the low end as it finds it, on the slope, and tips nothing', () => {
    const toy = resting(), pebble = idOf('pebble', 1), was = at(toy, SLAB)
    letGo(toy, pebble, STONE + 44)
    const frames = watch(toy, pebble, 2)
    expect(restOf(toy, SLAB).side).toBe(1)
    expect(frames.every((frame) => frame.donks === 0 && frame.slab.angle === was.angle)).toBe(true)
    const end = frames[frames.length - 1].load
    expect(end.x).toBeGreaterThan(STONE + 30)
    expect(end.angle).toBeCloseTo(was.angle, 5)
    // Lower than a thing over the stone would lie.
    expect(end.y).toBeGreaterThan(restOf(toy, SLAB).y - restOf(toy, SLAB).h + 10)
  })

  it('lies on the slope over the stone, and tips nothing; it lies level there only where the slab lies level', () => {
    const toy = resting(), pebble = idOf('pebble', 1), was = at(toy, SLAB)
    letGo(toy, pebble, STONE + 6)
    const frames = watch(toy, pebble, 2)
    expect(frames.every((frame) => frame.donks === 0 && frame.slab.angle === was.angle)).toBe(true)
    const rest = restOf(toy, pebble)
    expect(rest.along).toBe(0)
    // Over the stone, on the upper face of the slab as it leans: a little toward its low end.
    expect(rest.x).toBeCloseTo(STONE + CELLS.bark.ground.h * Math.sin(was.angle), 5)
    expect(frames[frames.length - 1].load.angle).toBeCloseTo(was.angle, 5)
    // A slab on a stone that stands on a bench has no end to tip down to: it lies level, and so does what is set on it.
    const level = new Toy({ ...freshSave(7), things: [{ id: SLAB, x: STONE }, { id: idOf('pebble'), x: STONE }, { id: idOf('bark', 1), x: STONE }] }, 3)
    expect(restOf(level, idOf('bark', 1))).toMatchObject({ lies: 'whole', on: 'pebble' })
    letGo(level, idOf('cap'), STONE + 6)
    for (let i = 0; i < 6 / TICK; i++) level.step(TICK)
    expect(restOf(level, idOf('cap'))).toMatchObject({ on: 'bark', under: [idOf('bark', 1)] })
    expect(restOf(level, idOf('cap')).tilt).toBeUndefined()
    expect(Math.abs(at(level, idOf('cap')).angle)).toBeLessThan(0.02)
  })

  it('stays up on the high end where the low end is held down by a thing of its own, or the slab has no room to tip that way', () => {
    const toy = resting(), first = idOf('pebble', 1), second = idOf('cap')
    letGo(toy, first, STONE + 44)
    watch(toy, first, 2)
    letGo(toy, second, STONE - 44)
    const frames = watch(toy, second, 2)
    expect(restOf(toy, SLAB).side).toBe(1)
    expect(frames.every((frame) => frame.donks === 0)).toBe(true)
    expect(restOf(toy, second).y).toBeLessThan(restOf(toy, first).y - 20)
    // Against the right wall a see-saw tips left and cannot tip right: a thing on its right end stays up there.
    const walled = new Toy({ ...freshSave(7), things: laidOf(build([{ id: idOf('pebble'), x: HOLLOW.right - 100 }, { id: SLAB, x: HOLLOW.right - 100 }])) }, 3)
    expect(restOf(walled, SLAB).side).toBe(-1)
    letGo(walled, first, HOLLOW.right - 60)
    watch(walled, first, 2)
    expect(restOf(walled, SLAB).side).toBe(-1)
    expect(restOf(walled, first).along).toBeGreaterThan(0)
    expect(restOf(walled, first).y).toBeLessThan(restOf(walled, SLAB).y - restOf(walled, SLAB).h)
  })

  it('tips back when the thing that tipped it is carried off: in sight, a little each step, with a donk', () => {
    const toy = resting(), pebble = idOf('pebble', 1)
    letGo(toy, pebble, STONE - 44)
    watch(toy, pebble, 3)
    expect(restOf(toy, SLAB).side).toBe(-1)
    const load = at(toy, pebble)
    toy.press(load.x, load.y - 20)
    toy.dragStart()
    toy.dragMove(900, 300)
    expect(restOf(toy, SLAB).side).toBe(1)
    const frames = watch(toy, pebble, 2)
    for (let i = 1; i < frames.length; i++) expect(Math.abs(frames[i].slab.angle - frames[i - 1].slab.angle)).toBeLessThan(0.04)
    expect(frames.reduce((sum, frame) => sum + frame.donks, 0)).toBe(1)
    expect(frames[frames.length - 1].slab.angle).toBeGreaterThan(0.2)
    toy.drop()
  })

  it('stays tipped when its tipper is carried off and a thing has been set where its end lay: that thing is not moved, and nothing knocks', () => {
    const toy = resting(), pebble = idOf('pebble', 1), cap = idOf('cap')
    letGo(toy, pebble, STONE - 44)
    watch(toy, pebble, 3)
    expect(restOf(toy, SLAB).side).toBe(-1)
    // The end that came up left the ground under it free: a bath is set there.
    letGo(toy, cap, STONE + 92)
    watch(toy, cap, 3)
    const bath = restOf(toy, cap)
    expect(bath).toMatchObject({ on: 'ground', under: [] })
    const was = at(toy, SLAB), load = at(toy, pebble)
    toy.press(load.x, load.y - 20)
    toy.dragStart()
    toy.dragMove(900, 300)
    expect(restOf(toy, SLAB).side).toBe(-1)
    expect(restOf(toy, cap)).toMatchObject({ x: bath.x, y: bath.y, on: 'ground' })
    const frames = watch(toy, cap, 2)
    expect(frames.every((frame) => frame.donks === 0 && frame.slab.angle === was.angle && frame.slab.x === was.x)).toBe(true)
    toy.drop()
    // Put away and opened again it is tipped the same way, with the bath where it was.
    const again = new Toy({ ...freshSave(7), things: toy.toSave().things }, 3)
    expect(restOf(again, SLAB).side).toBe(-1)
    expect(restOf(again, cap)).toMatchObject({ x: bath.x, y: bath.y })
  })

  /** A leaf, a twig, a cushion of moss and a second slab: each wider than an end of the see-saw. */
  const WIDE: readonly (readonly [Kind, number])[] = [['leaf', 0], ['twig', 0], ['moss', 0], ['bark', 1]]

  it.each(WIDE)('lays a %s along the slab, on its slope, let go on the low end or over the stone', (kind, nth) => {
    for (const x of [STONE + 50, STONE + 6, STONE - 10]) {
      const toy = resting(), wide = idOf(kind, nth), was = at(toy, SLAB)
      letGo(toy, wide, x)
      const frames = watch(toy, wide, 3)
      expect(restOf(toy, SLAB).side, `${kind} at ${x}`).toBe(1)
      expect(frames.every((frame) => frame.donks === 0 && frame.slab.angle === was.angle), `${kind} at ${x}`).toBe(true)
      const rest = restOf(toy, wide), slab = restOf(toy, SLAB)
      expect(rest, `${kind} at ${x}`).toMatchObject({ on: 'bark', under: [SLAB] })
      // It lies on the middle of the slab, turned as the slab is: no half of it is on air, and no end of the slab runs up into it.
      expect(rest.along).toBe(SEESAW_SHIFT)
      expect(rest.x).toBeCloseTo(slab.x + CELLS.bark.ground.h * Math.sin(was.angle), 5)
      expect(rest.tilt).toBeCloseTo(slab.lean!, 5)
      const shown = frames[frames.length - 1].load
      expect(shown.angle, `${kind} at ${x}`).toBeCloseTo(was.angle, 5)
      // Its underside is on the upper face of the slab, measured square to the slab as it is drawn.
      const dx = shown.x - was.x, dy = shown.y - was.y
      const along = dx * Math.cos(was.angle) + dy * Math.sin(was.angle), into = -dx * Math.sin(was.angle) + dy * Math.cos(was.angle) + CELLS.bark.ground.h
      expect(Math.abs(along), `${kind} at ${x}`).toBeLessThan(1)
      expect(into, `${kind} at ${x}`).toBeGreaterThan(-4)
      expect(into, `${kind} at ${x}`).toBeLessThan(rest.cell.sink + 3)
    }
  })

  it.each(WIDE)('tips the high end down under a %s let go on it, with a donk, and lays it along the slab on its new slope', (kind, nth) => {
    const toy = resting(), wide = idOf(kind, nth), was = at(toy, SLAB)
    letGo(toy, wide, STONE - 44)
    expect(restOf(toy, SLAB)).toMatchObject({ lies: 'tipped', side: -1 })
    const frames = watch(toy, wide, 3.5)
    expect(frames.reduce((sum, frame) => sum + frame.donks, 0)).toBe(1)
    for (let i = 1; i < frames.length; i++) expect(Math.abs(frames[i].slab.angle - frames[i - 1].slab.angle)).toBeLessThan(0.04)
    const rest = restOf(toy, wide), end = frames[frames.length - 1]
    expect(rest.along).toBe(-SEESAW_SHIFT)
    expect(end.slab.angle).toBeCloseTo(-was.angle, 5)
    expect(end.load.angle).toBeCloseTo(end.slab.angle, 5)
    expect(rest.x).toBeCloseTo(restOf(toy, SLAB).x + CELLS.bark.ground.h * Math.sin(end.slab.angle), 5)
    // Put away and opened again it lies the same.
    const again = new Toy({ ...freshSave(7), things: toy.toSave().things }, 3)
    expect(restOf(again, wide)).toMatchObject({ x: rest.x, y: rest.y, tilt: rest.tilt })
    expect(restOf(again, SLAB).side).toBe(-1)
  })

  it('turns a thing that lies over the stone with the slab when the slab is tipped the other way, and what lies on that thing with it', () => {
    const toy = resting(), stone = idOf('pebble', 1), lamp = idOf('cap'), tipper = idOf('cap', 1)
    letGo(toy, stone, STONE + 4)
    watch(toy, stone, 2)
    letGo(toy, lamp, STONE + 4)
    watch(toy, lamp, 2)
    expect(restOf(toy, lamp)).toMatchObject({ under: [stone] })
    const slope = at(toy, SLAB).angle
    expect(at(toy, stone).angle).toBeCloseTo(slope, 5)
    expect(at(toy, lamp).angle).toBeCloseTo(slope, 5)
    // The lamp sits on the top of the stone as the stone is drawn, turned with it.
    const top = (): { along: number; into: number } => {
      const under = at(toy, stone), on = at(toy, lamp), dx = on.x - under.x, dy = on.y - under.y
      return { along: dx * Math.cos(under.angle) + dy * Math.sin(under.angle), into: -dx * Math.sin(under.angle) + dy * Math.cos(under.angle) + restOf(toy, stone).h }
    }
    // (anywhere within the stone's width, as it was let go)
    expect(Math.abs(top().along)).toBeLessThanOrEqual(6.01)
    expect(Math.abs(top().into - restOf(toy, lamp).cell.sink)).toBeLessThan(1)
    letGo(toy, tipper, STONE - 44)
    watch(toy, tipper, 3.5)
    expect(restOf(toy, SLAB).side).toBe(-1)
    expect(at(toy, stone).angle).toBeCloseTo(-slope, 5)
    expect(at(toy, lamp).angle).toBeCloseTo(-slope, 5)
    expect(Math.abs(top().along)).toBeLessThanOrEqual(6.01)
    expect(Math.abs(top().into - restOf(toy, lamp).cell.sink)).toBeLessThan(1)
    // The list set down again gives the same house.
    const again = build(laidOf(toy.rested))
    expect(again.map((r) => [r.id, r.x, r.y, r.tilt])).toEqual(toy.rested.map((r) => [r.id, r.x, r.y, r.tilt]))
  })

  it.each([['a bell', 'cap', 'hung'], ['a flag', 'feather', 'flag']] as const)('hangs %s from the tip of a mast that leans with the slab, plumb, and not over its foot', (_name, kind, lies) => {
    const toy = resting(), stone = idOf('moss'), mast = idOf('twig'), hung = idOf(kind)
    letGo(toy, stone, STONE + 4)
    watch(toy, stone, 2.5)
    for (const id of [mast, hung]) {
      letGo(toy, id, restOf(toy, id === mast ? stone : mast).x)
      watch(toy, id, 2.5)
    }
    expect(restOf(toy, mast)).toMatchObject({ under: [stone], lies: 'upright' })
    expect(restOf(toy, hung)).toMatchObject({ under: [mast], lies })
    // The tip of the mast: its length up from its foot as it is drawn, square to the slope it stands on.
    const tip = (): { x: number; y: number } => {
      const post = at(toy, mast), tall = restOf(toy, mast).h, lean = restOf(toy, mast).tilt ?? 0
      return { x: post.x + tall * Math.sin(lean), y: post.y - tall * Math.cos(lean) }
    }
    // (A mast on moss leans a little of its own besides.)
    const OWN = 0.1
    const slope = at(toy, SLAB).angle
    expect(Math.abs(slope)).toBeGreaterThan(0.2)
    expect(Math.abs(at(toy, mast).angle - slope)).toBeLessThan(OWN)
    expect(restOf(toy, mast).tilt).toBeCloseTo(slope, 5)
    // The mast's tip is well aside of its foot, and the thing hangs from the tip, not over the foot.
    expect(Math.abs(tip().x - at(toy, mast).x)).toBeGreaterThan(15)
    const rest = restOf(toy, hung)
    expect(Math.abs(rest.x - tip().x)).toBeLessThan(1.5)
    expect(Math.abs(rest.y - rest.cell.sink - tip().y)).toBeLessThan(1.5)
    expect(rest.tilt).toBeUndefined()
    if (lies === 'hung') expect(at(toy, hung).angle).toBeCloseTo(0, 5)
    const again = build(laidOf(toy.rested))
    expect(again.map((r) => [r.id, r.x, r.y, r.tilt])).toEqual(toy.rested.map((r) => [r.id, r.x, r.y, r.tilt]))
  })

  it('keeps a bell on its crosspiece when the slab under them is tipped the other way', () => {
    const toy = resting(), stone = idOf('pebble', 1), cross = idOf('twig'), bell = idOf('cap'), tipper = idOf('cap', 1)
    for (const id of [stone, cross, bell]) {
      letGo(toy, id, STONE + 4)
      watch(toy, id, 2.5)
    }
    expect(restOf(toy, cross)).toMatchObject({ under: [stone], lies: 'across' })
    expect(restOf(toy, bell)).toMatchObject({ under: [cross], lies: 'hung' })
    // Where the bell hangs, measured on the crosspiece as it leans: how far along it, and how far off its upper face.
    const onIt = (): { along: number; off: number } => {
      const on = restOf(toy, cross), it = restOf(toy, bell), tilt = on.tilt ?? 0
      const dx = it.x - on.x, dy = it.y - on.y
      return { along: dx * Math.cos(tilt) + dy * Math.sin(tilt), off: -dx * Math.sin(tilt) + dy * Math.cos(tilt) + on.h }
    }
    const before = onIt()
    expect(Math.abs(before.along)).toBeLessThan(restOf(toy, cross).w / 2)
    letGo(toy, tipper, STONE - 44)
    watch(toy, tipper, 3.5)
    expect(restOf(toy, SLAB).side).toBe(-1)
    // The crosspiece leans the other way, and the bell hangs from the same place on it.
    expect(onIt().along).toBeCloseTo(before.along, 3)
    expect(Math.abs(onIt().off)).toBeLessThan(Math.abs(before.off) + 6)
    const again = build(laidOf(toy.rested))
    const where = (r: Rested): (number | string)[] => [r.id, r.under.join(), Math.round(r.x * 100), Math.round(r.y * 100)]
    expect(again.map(where)).toEqual(toy.rested.map(where))
  })

  it.each([['a ball', 'pebble'], ['a bowl', 'cap'], ['a rolling pin', 'twig']] as const)('lays %s on the slope still and sounds its touch alone: no rumble or purr with nothing seen to move', (_name, kind) => {
    const toy = resting(), id = idOf(kind, kind === 'pebble' ? 1 : 0)
    // On a level slab its landing is a longer sound, of the rolling or the spinning, or it has turns that knock.
    expect(CELLS[kind].bark.rock).toBeTruthy()
    letGo(toy, id, STONE + 44)
    const before = toy.sounds.length
    const frames = watch(toy, id, 2.5)
    expect(restOf(toy, id).tilt).toBeDefined()
    const own = toy.sounds.slice(before).filter((sound) => sound.from === `knock ${id}`)
    expect(own.length).toBeGreaterThan(0)
    for (const sound of own) expect(seconds(sound.voice)).toBeLessThanOrEqual(TOUCH_SECONDS + 1e-9)
    // After its last sound it does not move, and it has not turned or rolled along the slab since it touched.
    const last = frames.map((frame) => frame.landed > 0).lastIndexOf(true), end = frames[frames.length - 1].load
    expect(last).toBeGreaterThanOrEqual(0)
    for (const frame of frames.slice(last + 1)) {
      expect(Math.abs(frame.load.x - end.x)).toBeLessThan(0.75)
      expect(frame.load.angle).toBeCloseTo(end.angle, 5)
    }
  })
})
