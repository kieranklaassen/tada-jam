import { describe, expect, it } from 'vitest'
import { CELLS, rockSeconds } from './cells'
import { FOUND, KINDS, SUPPORTS, groundY, type Kind, type Support } from './kinds'
import { drawnBox } from './lie'
import { build, type Laid } from './rest'
import { freshSave } from './save'
import { TICK, Toy, type ShownThing, type Sound } from './toy'
import { LAND, STOP } from './voices'

// A sound is the sound of something seen, and lasts as long as its motion.
// Every cell that rocks, rolls, swings or spins is set down here by a finger
// and watched step by step: each turn of the motion is heard in the step it
// is seen, and the motion stops with its last sound.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id

/** A game with one thing of `on` in the middle of the floor, and a thing of `kind` let go over it. Returns the toy the moment the finger lets go. */
function setDown(kind: Kind, on: Support, lean = 12, more: Laid[] = []): { toy: Toy; id: number } {
  const laid: Laid[] = on === 'ground' ? [...more] : [{ id: idOf(on, 0), x: 640 }, ...more]
  const id = idOf(kind, kind === on ? 1 : 0)
  const toy = new Toy({ ...freshSave(7), things: laid }, 3)
  const home = FOUND[id].home
  toy.press(home.x, home.y - 8)
  toy.dragStart()
  toy.dragMove(640 + lean, 420)
  for (let i = 0; i < 30; i++) toy.step(TICK)
  toy.drop()
  toy.sounds.length = 0
  return { toy, id }
}

type Frame = { tick: number; thing: ShownThing; sounds: Sound[] }

/** Plays `seconds` and returns each step: the thing as it is shown and the sounds of it queued in that step. */
function watch(toy: Toy, id: number, seconds: number): Frame[] {
  const frames: Frame[] = []
  for (let tick = 1; tick <= Math.round(seconds / TICK); tick++) {
    const before = toy.sounds.length
    toy.step(TICK)
    const shown = toy.show(null)
    const thing = [...shown.things, ...shown.front].find((t) => t.id === id)!
    frames.push({ tick, thing: { ...thing }, sounds: toy.sounds.slice(before).filter((sound) => sound.from === `knock ${id}`) })
  }
  return frames
}

/** What of a thing moves when its cell rocks: where it is, how it is turned and how it hangs. */
const pose = (t: ShownThing): number[] => [t.x, t.y, t.angle, t.swing]
const moved = (a: ShownThing, b: ShownThing): boolean => pose(a).some((value, index) => Math.abs(value - pose(b)[index]) > 1e-6)

describe('a sound lasts as long as its motion', () => {
  const rocking = KINDS.flatMap((kind) => SUPPORTS.map((on) => ({ kind, on, cell: CELLS[kind][on] }))).filter(({ cell }) => cell.rock?.heard)

  it('has a cell that is heard as it rocks in five of the seven rows', () => {
    expect(rocking.length).toBeGreaterThanOrEqual(9)
    expect(new Set(rocking.map(({ kind }) => kind)).size).toBeGreaterThanOrEqual(5)
  })

  it.each(rocking.map(({ kind, on, cell }) => [cell.is, kind, on] as const))('the %s is heard at every turn it is seen to make, and is still after its last sound', (is, kind, on) => {
    const { toy, id } = setDown(kind, on)
    const frames = watch(toy, id, 6)
    const rock = CELLS[kind][on].rock!
    const landed = frames.findIndex((frame) => frame.sounds.length > 0)
    expect(toy.rested.find((rest) => rest.id === id)?.cell.is).toBe(is)
    const after = frames.slice(landed + 1)
    const heard = after.filter((frame) => frame.sounds.length > 0)
    // One sound for each turn, and one more for a cell that stops with a sound of its own. A see-saw has one: its far end touching down.
    const turns = rock.axis === 'tip' ? 1 : rock.turns
    expect(heard.length).toBe(turns + (rock.stop ? 1 : 0))
    // The last step in which it is seen to move.
    let last = landed
    for (let i = landed + 1; i < frames.length; i++) if (moved(frames[i].thing, frames[i - 1].thing)) last = i
    const lastSound = frames.indexOf(heard[heard.length - 1])
    // It moves until its last sound, and after it no longer than the swing back to rest from its last turn.
    expect(last).toBeGreaterThanOrEqual(lastSound - 1)
    const back = rock.stop || rock.axis === 'tip' ? 1 : Math.ceil(0.5 / rock.hz / TICK) + 2
    expect(last - lastSound).toBeLessThanOrEqual(back)
    // And the whole of it takes what the cell says.
    expect((last - landed) * TICK).toBeCloseTo(rockSeconds(rock), 1)
  })

  it('gives a roof two taps as its sides come down, a bell a ding for every swing and a cradle a creak for every rock', () => {
    const taps = (kind: Kind, on: Support): number => watch(setDown(kind, on).toy, idOf(kind), 6).filter((frame) => frame.sounds.length > 0).length
    expect(taps('leaf', 'twig')).toBe(2)
    expect(taps('cap', 'twig')).toBe(1 + CELLS.cap.twig.rock!.turns)
    expect(CELLS.cap.twig.rock!.turns).toBeGreaterThanOrEqual(5)
    expect(taps('cap', 'moss')).toBe(1 + CELLS.cap.moss.rock!.turns)
    expect(taps('pebble', 'twig')).toBe(1 + CELLS.pebble.twig.rock!.turns)
  })

  it('closes the bowl with a tok and the rolling pin with a tick, each in the step the thing stops', () => {
    for (const [kind, on] of [['cap', 'bark'], ['twig', 'bark']] as const) {
      const { toy, id } = setDown(kind, on)
      const frames = watch(toy, id, 6)
      const heard = frames.filter((frame) => frame.sounds.length > 0)
      const closing = heard[heard.length - 1]
      expect(closing.sounds[0].voice).toBe(STOP[kind]![on])
      expect(closing.sounds[0].voice).not.toEqual(LAND[kind][on])
      const at = frames.indexOf(closing)
      // It moved in the step before, and never again after.
      expect(moved(frames[at - 1].thing, frames[at - 2].thing)).toBe(true)
      for (let i = at + 2; i < frames.length; i++) expect(moved(frames[i].thing, frames[i - 1].thing)).toBe(false)
    }
  })
})

describe('the see-saw', () => {
  it('tips to the end further from the stone, and the donk comes in the step that end touches the ground', () => {
    for (const lean of [-14, 14]) {
      const { toy, id } = setDown('bark', 'pebble', lean)
      const frames = watch(toy, id, 3)
      const rest = toy.rested.find((r) => r.id === id)!, stone = toy.rested.find((r) => r.kind === 'pebble')!
      expect(rest.lies).toBe('tipped')
      // Its middle lies to the side it was set down on, so the end on that side is the further one from the stone.
      expect(Math.sign(rest.x - stone.x)).toBe(Math.sign(lean))
      const far = (thing: ShownThing): number => { const box = drawnBox(thing); return box.y + box.h }
      const ground = groundY(stone.x)
      const heard = frames.filter((frame) => frame.sounds.length > 0)
      // A creak as it lands on the stone, level; then one donk.
      expect(heard).toHaveLength(2)
      expect(Math.abs(heard[0].thing.angle)).toBeLessThan(0.02)
      const donk = frames.indexOf(heard[1])
      expect(donk - frames.indexOf(heard[0])).toBeGreaterThan(20)
      // In that step its low end is on the ground, and in the step before it was still above it.
      expect(Math.abs(far(frames[donk].thing) - ground)).toBeLessThan(3)
      expect(far(frames[donk - 1].thing)).toBeLessThan(far(frames[donk].thing) - 0.5)
      // It leans down to the side of its far end, and stays as it is.
      expect(Math.sign(frames[donk].thing.angle)).toBe(Math.sign(lean))
      for (let i = donk + 1; i < frames.length; i++) expect(moved(frames[i].thing, frames[donk].thing)).toBe(false)
      // And it is found so when the game is opened again.
      const loaded = new Toy(toy.toSave(), 5)
      const again = loaded.show(null).things.find((thing) => thing.id === id)!
      expect(pose(again)).toEqual(pose(frames[frames.length - 1].thing))
    }
  })

  it('lies level on a stone that stands on something, where no end can reach the ground', () => {
    const house = build([{ id: idOf('moss'), x: 640 }, { id: idOf('pebble'), x: 640 }, { id: idOf('bark'), x: 650 }])
    expect(house[2].lies).toBe('whole')
    const toy = new Toy({ ...freshSave(7), things: house.map((r) => ({ id: r.id, x: r.dropX })) }, 3)
    expect(toy.show(null).things.find((thing) => thing.id === idOf('bark'))!.angle).toBe(0)
  })
})
