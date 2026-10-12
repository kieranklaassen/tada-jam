import { describe, expect, it } from 'vitest'
import { BALL, ON_BANK_Y, restOf, type Kind, type Rest } from './blocks'
import { BERRY } from './first'
import { BLOCK_H, FRONT_Y, GROUND_Y, type Hole } from './ground'
import { bare, copy, drag, faults, fingerOf, frame, letGo, moveTo, names, press, pullSun, run, surface } from './testing'
import { HARE_FIRST, Toy, type World } from './toy'
import { hareNow, hareOut } from './toyDay'

// Found as left, in the moments this game's characters add: put away while
// King Winter falls, tries a block, squeezes through a gap, wears a hat in the
// snow or stands up from under a lamp, while the lamp child is on an errand,
// while the peeper watches the berry, while a snowball bubbles, and while the
// hare is half way across the far snow or bolting.
// What is left on the surface is what a load of the save shows, and both go
// on the same way without a sound.

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
const gate = (kind: Kind = 'clear'): Rest[] => [on(kind, 64, 400, 0), on(kind, 64, 560, 0), on(kind, 224, 480, 1)]
const world = (blocks: Rest[], night = false, holes: Hole[] = []): World => ({ ...bare(night), blocks: [{ ...BERRY }, ...blocks], holes })
const until = (toy: Toy, when: () => boolean, most = 1800): void => {
  for (let step = 0; step < most && !when(); step++) frame(toy)
  expect(when()).toBe(true)
}

const moments: [string, () => Toy][] = [
  ['King Winter falling, his seat in the hand', () => {
    const toy = new Toy(world(gate(), true), 1)
    press(toy, 384, row(1))
    moveTo(toy, 384, row(1) + 120)
    run(toy, 0.05)
    expect(toy.king.fall).toBeGreaterThan(0)
    return toy
  }],
  ['King Winter down in the snow behind the wall', () => {
    const toy = new Toy(world(gate(), true), 1)
    press(toy, 384, row(1))
    moveTo(toy, 300, 620)
    letGo(toy)
    until(toy, () => toy.king.where === 'snow' && toy.king.fall === 0)
    return toy
  }],
  ['King Winter with one foot on a block', () => {
    const toy = new Toy(world([on('clear', 90, 500, 0), on('clear', 90, 500, 1), on('cloudy', 90, 500, 2)]), 1)
    pullSun(toy, true)
    until(toy, () => toy.cast.king.what === 'foot' && toy.cast.king.age > 0.6)
    return toy
  }],
  ['King Winter squeezing through a gap', () => {
    const toy = new Toy(world([on('clear', 300, 364, 0), on('clear', 250, 705, 0)]), 1)
    pullSun(toy, true)
    until(toy, () => toy.king.narrow < 0.7)
    return toy
  }],
  ['King Winter in the gap, as narrow as it is', () => {
    const toy = new Toy(world([on('clear', 300, 364, 0), on('clear', 290, 715, 0)]), 1)
    pullSun(toy, true)
    until(toy, () => toy.king.y > GROUND_Y && toy.king.y < FRONT_Y)
    expect(toy.king.narrow).toBeLessThan(0.3)
    return toy
  }],
  ['King Winter sat in the snow at night with a hat on', () => {
    const toy = new Toy(world([restOf('cloudy', 70, 700, 600, 'lying')], true), 1)
    drag(toy, 700, 600, toy.king.x - 60, toy.king.y - 300, 8)
    letGo(toy)
    run(toy, 0.5)
    expect(toy.pieces.some((p) => p.mode === 'hat')).toBe(true)
    return toy
  }],
  ['King Winter on his feet on his seat, a lamp newly hung in the air he sat in', () => {
    const pillar = (x: number): Rest[] => Array.from({ length: 5 }, (_n, n) => on('clear', 64, x, n))
    const toy = new Toy(world([on('clear', 130, 500, 0), ...pillar(400), ...pillar(600), restOf('cloudy', 240, 700, 640, 'lying')], true), 1)
    drag(toy, 700, 640, 575, row(5) - 20, 8)
    letGo(toy)
    until(toy, () => toy.king.wait > 0 && toy.king.sat < 0.5)
    return toy
  }],
  ['the peeper stretched out to watch the berry bob', () => {
    const toy = new Toy(world([], false, [{ x: 600, y: 700, angle: 0, len: 140 }]), 1)
    drag(toy, BERRY.x, BERRY.y, 600, 700, 8)
    letGo(toy)
    until(toy, () => toy.cast.peeper.what === 'watch' && toy.cast.peeper.age > 0.5)
    return toy
  }],
  ['the lamp child on its way to rap on snow', () => {
    const toy = new Toy(world(gate('snow')), 1)
    pullSun(toy, true)
    until(toy, () => !toy.sceneRunning && toy.lampWalk.length > 0)
    return toy
  }],
  ['the lamp child in the middle of its rap', () => {
    const toy = new Toy(world(gate('snow')), 1)
    pullSun(toy, true)
    until(toy, () => toy.cast.lamp.what === 'knock')
    return toy
  }],
  ['the lamp child on its way round the bank to press its nose on lit ice', () => {
    const toy = new Toy(world(gate()), 1)
    pullSun(toy, true)
    until(toy, () => !toy.sceneRunning && toy.lampWalk.length > 0)
    return toy
  }],
  ['a snowball afloat, bubbling', () => {
    const toy = new Toy(world([restOf('ball', BALL, 700, 600, 'lying')], false, [{ x: 900, y: 668, angle: 0, len: 120 }]), 1)
    drag(toy, 700, 600, 900, 668, 8)
    letGo(toy)
    until(toy, () => toy.pieces.some((p) => p.fizz > 0 && p.fizz < 2))
    return toy
  }],
  ['the hare half way across the far snow', () => {
    const toy = new Toy(world(gate()), 1)
    run(toy, toy.hareAt + 2)
    expect(hareOut(toy)).toBe(true)
    return toy
  }],
  ['the hare bolting from a poke', () => {
    const toy = new Toy(world(gate()), 1)
    run(toy, toy.hareAt + 2)
    const hare = hareNow(toy)
    press(toy, hare.x, hare.y - 24)
    letGo(toy)
    run(toy, 0.2)
    expect(toy.hareBolt).toBeGreaterThan(0)
    expect(hareOut(toy)).toBe(true)
    return toy
  }],
  ['the hare bolting from the dusk', () => {
    const toy = new Toy(world(gate()), 1)
    run(toy, toy.hareAt + 2)
    pullSun(toy, true)
    run(toy, 0.3)
    expect(hareOut(toy)).toBe(true)
    return toy
  }],
]

describe('put away', () => {
  it.each(moments)('with %s: what is left on the surface is what a load of the save shows', (_, reach) => {
    const toy = reach()
    const finger = fingerOf(toy)
    finger.rest(finger.seconds)
    const saved = copy(toy.world())
    expect(faults(saved)).toEqual([])
    const loaded = new Toy(copy(saved), 2)
    expect(surface(toy)).toEqual(surface(loaded))
    toy.takeSounds()
    run(toy, 4)
    run(loaded, 4)
    expect(names(toy)).toEqual([])
    expect(names(loaded)).toEqual([])
    expect(toy.takeMotions()).toEqual([])
    expect(surface(toy)).toEqual(surface(loaded))
    expect(toy.world()).toEqual(saved)
  })

  it.each(moments.filter(([name]) => name.startsWith('the hare')))('with %s: the hare is gone, as after a load, and is as long in coming out again', (_, reach) => {
    const toy = reach()
    const finger = fingerOf(toy)
    finger.rest(finger.seconds)
    expect(hareOut(toy)).toBe(false)
    expect(surface(toy)).toMatchObject({ hare: false, hareBolt: -1, hareIn: HARE_FIRST })
    expect(surface(new Toy(copy(toy.world()), 2))).toMatchObject({ hare: false, hareBolt: -1, hareIn: HARE_FIRST })
    // It does not come back to finish its crossing: for as long as a crossing lasts there is no hare.
    for (let step = 0; step < 600; step++) {
      frame(toy)
      expect(hareOut(toy)).toBe(false)
    }
  })
})
