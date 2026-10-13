import { describe, expect, it } from 'vitest'
import { mat, named, put, putOn, tapBasket } from './drive'
import type { PieceId } from './pieces'
import { SOUND_NAMES, notesFor } from './sounds'
import { World } from './world'

// Sight and sound in step. A sound belongs to the frame of its motion: a landing is heard in the frame the
// thing lands, a pair answers in the frame the thing reaches its seat, a scene's beat sounds in the frame the
// picture shows it. And the same sounds come at the same moments however the time is cut into frames.

/** Steps the world frame by frame until `when` holds, and returns what sounded in that very frame. */
function frameWhen(world: World, when: () => boolean, frame = 1 / 60): string[] {
  for (let i = 0; i < 60 * 12; i++) {
    world.step(frame)
    const heard = named(world.takeSounds())
    if (when()) return heard
  }
  throw new Error('the moment never came')
}

describe('a sound belongs to the frame of its motion', () => {
  it('knocks in the frame a thing lands on the mat', () => {
    for (const [id, sound] of [['doll-tall', 'knock:doll-tall'], ['horse', 'clop:horse'], ['silk', 'bell:silk'], ['arch-large', 'knock:arch-large']] as const) {
      const world = mat({})
      put(world, id, 600, 580)
      world.takeSounds()
      const p = world.piece(id)
      expect(frameWhen(world, () => p.flight === null), id).toContain(sound)
      expect([p.px, p.py, p.lift]).toEqual([600, 580, 0])
    }
  })

  it('answers a pair in the frame the thing reaches its seat', () => {
    const cases: [Parameters<typeof mat>[0], PieceId, PieceId, string][] = [
      [{ 'arch-middle': { x: 520, y: 590 } }, 'arch-large', 'arch-middle', 'clack:arch-large'],
      [{ 'arch-middle': { x: 520, y: 590, turned: true } }, 'arch-large', 'arch-middle', 'tick:arch-large'],
      [{ 'doll-round': { x: 520, y: 590 } }, 'arch-large', 'doll-round', 'bonk:arch-large'],
      [{ horse: { x: 520, y: 590 } }, 'arch-large', 'horse', 'tok:arch-large'],
      [{ 'arch-large': { x: 520, y: 590 } }, 'silk', 'arch-large', 'hum:arch-large'],
      [{ 'arch-large': { x: 520, y: 590, turned: true } }, 'silk', 'arch-large', 'humfall:arch-large'],
      [{ 'arch-large': { x: 520, y: 590, turned: true } }, 'horse', 'arch-large', 'clop:horse'],
    ]
    for (const [things, upper, lower, sound] of cases) {
      const world = mat(things)
      putOn(world, upper, lower)
      world.takeSounds()
      const p = world.piece(upper)
      expect(frameWhen(world, () => p.flight === null), `${upper} on ${lower}`).toContain(sound)
      // On its seat: no way left to go.
      expect([p.px - p.x, p.py - p.y, p.lift]).toEqual([0, 0, 0])
    }
  })

  it('sounds a scene\'s beat in the frame the picture shows it', () => {
    // The tower: the chord is the frame the top doll reaches the lower one's head.
    const tower = mat({ 'doll-round': { x: 520, y: 590 } })
    putOn(tower, 'doll-tall', 'doll-round')
    tower.takeSounds()
    const top = tower.piece('doll-tall')
    expect(frameWhen(tower, () => Math.hypot(top.px - top.x, top.py - top.y) < 0.01 && top.lift < 0.01)).toContain('chord:doll-tall')
    // The slide: the bump is the frame the doll reaches the arch's far foot.
    const slide = mat({ 'arch-large': { x: 600, y: 590 } })
    putOn(slide, 'doll-small', 'arch-large')
    slide.takeSounds()
    const doll = slide.piece('doll-small')
    // The bump is the frame a ring opens in the mat's paper under it, with the doll down on the mat.
    expect(frameWhen(slide, () => slide.ripples.length > 0)).toContain('bump')
    expect(Math.abs(doll.py - 590)).toBeLessThan(0.1)
    // The march: each thing's note is the frame it is in the basket.
    const march = mat({ horse: { x: 600, y: 600 } })
    tapBasket(march)
    march.takeSounds()
    const horse = march.piece('horse')
    expect(frameWhen(march, () => !horse.led)).toContain('clop:horse')
  })

  it('plays the same sounds at the same moments at 60 and at 20 frames a second, through pairs and scenes', () => {
    const play = (frame: number): { name: string; at: number }[] => {
      const world = mat({ 'arch-large': { x: 520, y: 590, turned: true }, horse: { x: 720, y: 600 } })
      const heard: { name: string; at: number }[] = []
      const go = (seconds: number): void => {
        for (let t = 0; t < seconds - 1e-9; t += frame) { world.step(frame); for (const sound of world.takeSounds()) heard.push({ name: sound.piece ? `${sound.name}:${sound.piece}` : sound.name, at: world.time }) }
      }
      putOn(world, 'arch-middle', 'arch-large'); world.takeSounds(); go(3)
      putOn(world, 'doll-round', 'horse'); world.takeSounds(); go(7.2)
      tapBasket(world); world.takeSounds(); go(9)
      return heard
    }
    const fine = play(1 / 60), coarse = play(1 / 20)
    expect(coarse.map((each) => each.name)).toEqual(fine.map((each) => each.name))
    expect(fine.length).toBeGreaterThan(40)
    // Each sound is heard in the frame that holds its moment: never more than one coarse frame apart.
    fine.forEach((each, i) => expect(Math.abs(coarse[i].at - each.at), each.name).toBeLessThanOrEqual(1 / 20 + 1e-6))
  })

  it('hides no wait inside a voice: every note of every sound starts when its voice does', () => {
    for (const name of SOUND_NAMES) for (const note of notesFor({ name, piece: 'doll-tall', other: 'horse', step: 1, gain: 1 })) expect(note.delay, name).toBeUndefined()
  })
})
