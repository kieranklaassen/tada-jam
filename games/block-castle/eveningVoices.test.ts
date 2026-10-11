import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import type { What } from './castle'
import { WHO } from './folk'
import * as evening from './eveningVoices'
import { LIMITS } from './voices'

const WHATS: What[] = ['bridge', 'gate', 'tower', 'pole', 'room', 'slide']

function everyVoice(): [string, Note[]][] {
  const all: [string, Note[]][] = [['bell', evening.bell], ['dusk', evening.dusk], ['dawn', evening.dawn], ['splash', evening.splash], ['shake', evening.shake], ['puff', evening.puff], ['hup', evening.hup], ['door', evening.door], ['squeeze', evening.squeeze], ['home', evening.home], ['tip', evening.tip], ['tipped', evening.tipped]]
  for (const what of WHATS) {
    for (let tier = 0; tier <= 5; tier++) for (const capped of [false, true]) all.push([`become ${what} ${tier} ${capped}`, evening.become(what, capped, tier)])
    all.push([`act ${what}`, evening.act(what)], [`act ${what} with the cook in`, evening.act(what, true)])
  }
  for (const who of WHO) {
    for (let n = 0; n < 3; n++) all.push([`step ${who} ${n}`, evening.step(who, n)])
    all.push([`boing ${who}`, evening.boing(who)], [`whee ${who}`, evening.whee(who)], [`bump ${who}`, evening.bump(who)])
  }
  return all
}

const shape = (notes: readonly Note[]): string => notes.map((note) => `${note.kind}:${note.wave ?? ''}:${Math.round(note.frequency)}:${(note.delay ?? 0).toFixed(2)}`).join(' ')

describe('every voice of the evening', () => {
  it.each(everyVoice())('%s stays in range', (_, notes) => {
    expect(notes.length).toBeGreaterThan(0)
    for (const note of notes) {
      for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
        expect(pitch).toBeGreaterThanOrEqual(LIMITS.lowest)
        expect(pitch).toBeLessThanOrEqual(LIMITS.highest)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(LIMITS.peak)
      expect(note.attack).toBeGreaterThan(0)
      expect(note.decay).toBeGreaterThan(0)
    }
    expect(Math.max(...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))).toBeLessThanOrEqual(LIMITS.seconds)
  })

  it('answers at once: the bell and every tapped thing start with no delay', () => {
    expect(evening.bell[0].delay ?? 0).toBe(0)
    for (const what of WHATS) expect(evening.act(what)[0].delay ?? 0).toBe(0)
  })
})

describe('the grid', () => {
  it('gives every thing its own sound as it becomes itself, and a tower with a block on it another', () => {
    const all = [...WHATS.map((what) => shape(evening.become(what, false, 0))), shape(evening.become('tower', true, 0))]
    expect(new Set(all).size).toBe(WHATS.length + 1)
  })

  it('gives every thing its own answer to a tap, none of them its becoming', () => {
    const acts = WHATS.map((what) => shape(evening.act(what)))
    expect(new Set(acts).size).toBe(WHATS.length)
    for (const what of WHATS) expect(shape(evening.act(what))).not.toBe(shape(evening.become(what, false, 0)))
  })

  it('adds the spoon on the pot when the cook is in the room', () => {
    expect(evening.act('room', true).length).toBeGreaterThan(evening.act('room').length)
  })

  it('is a step higher for a thing that stands on a block', () => {
    for (const what of WHATS) {
      const low = evening.become(what, false, 0).find((note) => note.kind === 'tone')!, high = evening.become(what, false, 1).find((note) => note.kind === 'tone')!
      expect(high.frequency).toBeGreaterThan(low.frequency)
    }
  })
})

describe('the folk', () => {
  it('walk a bridge each on his own feet, every board its own note', () => {
    for (const who of WHO) expect(new Set([0, 1, 2].map((n) => evening.step(who, n)[0].frequency)).size).toBe(3)
    expect(new Set(WHO.map((who) => evening.step(who, 0)[0].frequency)).size).toBe(WHO.length)
  })

  it('go down a slide each in his own voice', () => {
    expect(new Set(WHO.map((who) => shape(evening.whee(who)))).size).toBe(WHO.length)
  })

  it('lets every wheee fall, as the one who slides does', () => {
    for (const who of WHO) for (const note of evening.whee(who)) expect(note.glideTo ?? note.frequency, who).toBeLessThan(note.frequency)
  })
})
