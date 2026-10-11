import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import * as voices from './voices'

// Nobody has heard these. The test holds every note where a small speaker can play it and a child can bear it.
function inRange(name: string, notes: readonly Note[]): void {
  expect(notes.length, name).toBeGreaterThan(0)
  expect(notes.length, name).toBeLessThanOrEqual(8)
  for (const note of notes) {
    expect(note.frequency, name).toBeGreaterThanOrEqual(70)
    expect(note.frequency, name).toBeLessThanOrEqual(6000)
    if (note.glideTo !== undefined) { expect(note.glideTo, name).toBeGreaterThanOrEqual(70); expect(note.glideTo, name).toBeLessThanOrEqual(6000) }
    expect(note.peak, name).toBeGreaterThan(0)
    expect(note.peak, name).toBeLessThanOrEqual(0.25)
    expect(note.attack, name).toBeGreaterThan(0)
    expect((note.delay ?? 0) + note.attack + note.decay, name).toBeLessThanOrEqual(0.9)
  }
}

describe('the voices', () => {
  it('keeps every fixed voice in range', () => {
    for (const [name, notes] of Object.entries(voices.FIXED)) inRange(name, notes)
    inRange('squeak dry', voices.squeak(false))
    inRange('squeak afloat', voices.squeak(true))
  })

  it('keeps every voice that follows the play in range, at both ends of what it follows', () => {
    for (let depth = -2; depth <= voices.SAND_PITCH.length; depth++) {
      for (const speed of [-1, 0, 0.5, 1, 9]) inRange('hiss', voices.hiss(depth, speed))
      inRange('bite', voices.bite(depth))
      inRange('patter', voices.patter(depth))
    }
    for (const blobs of [0, 1, 3, 20]) inRange('mud', voices.mud(blobs))
    for (const amount of [0, 0.5, 1, 40]) inRange('hush', voices.hush(amount))
    for (const count of [0, 1, 4, 99]) for (const pick of [0, 7, 123456]) inRange('plinks', voices.plinks(count, pick))
  })

  it('keeps every voice of the five other grounds, the rain and the plug in range, at both ends of what each follows', () => {
    for (const pick of [0, 1, 7, 123456]) { inRange('roof', voices.roof(pick)); inRange('blub', voices.blub(pick)); inRange('rain', voices.rain(pick)); inRange('gurgling', voices.gurgling(pick)) }
    for (const cells of [0, 1, 30, 400]) inRange('thud', voices.thud(cells))
    for (const speed of [-1, 0, 0.5, 1, 9]) inRange('kettle', voices.kettle(speed))
    for (const count of [0, 1, 3, 99]) inRange('ticks', voices.ticks(count))
  })

  it('keeps every exported voice and every voice a scene names in range', () => {
    for (const [name, value] of Object.entries(voices)) if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') inRange(name, value as Note[])
    for (const [name, notes] of Object.entries(voices.NAMED)) inRange(name, notes)
  })

  it('makes a bigger stone thud lower, and a faster rub on a steaming stone whistle higher', () => {
    expect(voices.thud(60)[0].frequency).toBeLessThan(voices.thud(8)[0].frequency)
    expect(voices.kettle(1)[0].frequency).toBeGreaterThan(voices.kettle(0)[0].frequency)
  })

  it('gives sand a lower pitch at every step of its depth, so a rub down the bands falls at any speed', () => {
    for (let depth = 1; depth < voices.SAND_PITCH.length; depth++) {
      expect(voices.SAND_PITCH[depth]).toBeLessThan(voices.SAND_PITCH[depth - 1])
      // A fast rub one band down is still lower than a slow one in the band above.
      expect(voices.hiss(depth, 1)[0].frequency).toBeLessThan(voices.hiss(depth - 1, 0)[0].frequency)
    }
    // Above the hill and below it the scale holds its first and its last note.
    expect(voices.hiss(-4, 0.5)).toEqual(voices.hiss(0, 0.5))
    expect(voices.hiss(99, 0.5)).toEqual(voices.hiss(voices.SAND_PITCH.length - 1, 0.5))
  })

  it('makes a fast rub brighter and louder than a slow one', () => {
    const slow = voices.hiss(0, 0)[0], fast = voices.hiss(0, 1)[0]
    expect(fast.frequency).toBeGreaterThan(slow.frequency)
    expect(fast.peak).toBeGreaterThan(slow.peak)
  })

  it('plays more plinks for more water', () => {
    expect(voices.plinks(4, 3).length).toBeGreaterThan(voices.plinks(1, 3).length)
  })

  it('tells a dry duck from a wet one', () => {
    expect(voices.squeak(true)[0].frequency).toBeGreaterThan(voices.squeak(false)[0].frequency)
  })
})
