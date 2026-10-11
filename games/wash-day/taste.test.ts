import { describe, expect, it } from 'vitest'
import { KINDS } from './cloth'
import { BODY, FRIEND_KINDS } from './layout'
import { makeRng } from './rng'
import { HIDE_CELLS, anchorAtRest, anchorOf, cleanHide, decodeHide, encodeHide, fitOf, muddyHide, opinion, rubHide, wearNear, wearsOf } from './taste'

const clean = { mud: 0, wet: 0, suds: 0 }

describe('the fixed tastes', () => {
  it('the pig likes things tight: it struts in a small thing and is proud of a clean dry one', () => {
    for (const garment of ['sock', 'hat', 'scarf', 'shirt'] as const) {
      const view = opinion('pig', garment, wearsOf('pig', garment)[0], clean)
      expect(view).toEqual({ first: 'strut', second: 'proud', likes: true })
    }
  })

  it('a loose thing trips the pig, whatever state it is in', () => {
    for (const garment of ['jumper', 'dungarees'] as const) {
      expect(fitOf('pig', garment)).toBe('loose')
      expect(opinion('pig', garment, wearsOf('pig', garment)[0], clean).first).toBe('trip')
      expect(opinion('pig', garment, wearsOf('pig', garment)[0], { mud: 0, wet: 9, suds: 0 })).toEqual({ first: 'trip', second: 'squelch', likes: false })
    }
  })

  it('water does not trouble the pig: a wet tight thing is still strutted in', () => {
    expect(opinion('pig', 'sock', 'foot', { mud: 0, wet: 9, suds: 0 })).toEqual({ first: 'strut', second: 'squelch', likes: true })
  })

  it('the heron hates wet before anything else', () => {
    for (const garment of KINDS) {
      const view = opinion('heron', garment, wearsOf('heron', garment)[0], { mud: 0, wet: 6, suds: 0 })
      expect(view.first).toBe('shudder')
      expect(view.likes).toBe(false)
    }
  })

  it('the heron preens in a dry long thing and is stiff as a plank in a tight one', () => {
    expect(opinion('heron', 'scarf', 'neck', clean)).toEqual({ first: 'preen', second: 'proud', likes: true })
    expect(opinion('heron', 'dungarees', 'legs', clean).first).toBe('preen')
    expect(opinion('heron', 'sock', 'beak', clean)).toEqual({ first: 'plank', second: null, likes: false })
    expect(opinion('heron', 'hat', 'eyes', clean).first).toBe('plank')
  })

  it('the goat sneezes at mud, licks soap and is pleased with what hangs on its horns', () => {
    expect(opinion('goat', 'shirt', 'torso', { mud: 4, wet: 0, suds: 0 })).toEqual({ first: 'sneeze', second: null, likes: false })
    expect(opinion('goat', 'shirt', 'torso', { mud: 4, wet: 0, suds: 8 })).toEqual({ first: 'sneeze', second: 'lick', likes: false })
    expect(opinion('goat', 'shirt', 'torso', { mud: 0, wet: 0, suds: 8 })).toEqual({ first: 'lick', second: null, likes: true })
    expect(opinion('goat', 'scarf', 'horns', clean)).toEqual({ first: 'pleased', second: 'proud', likes: true })
    expect(opinion('goat', 'sock', 'horn', { mud: 0, wet: 0, suds: 8 })).toEqual({ first: 'lick', second: 'pleased', likes: true })
  })

  it('each friend takes the same garment in the same state its own way', () => {
    const made = { mud: 0, wet: 8, suds: 0 }
    const firsts = FRIEND_KINDS.map((friend) => opinion(friend, 'shirt', 'torso', made).first)
    expect(new Set(firsts).size).toBe(3)
  })

  it('an answer never changes for the same garment in the same state', () => {
    for (const friend of FRIEND_KINDS) for (const garment of KINDS) for (const made of [clean, { mud: 3, wet: 0, suds: 0 }, { mud: 0, wet: 7, suds: 5 }]) {
      const on = wearsOf(friend, garment)[0]
      expect(opinion(friend, garment, on, made)).toEqual(opinion(friend, garment, on, made))
    }
  })
})

describe('where a garment goes on a body', () => {
  it('every garment fits somewhere on every friend, and its place lies on or near that body', () => {
    for (const friend of FRIEND_KINDS) for (const garment of KINDS) {
      const wears = wearsOf(friend, garment)
      expect(wears.length).toBeGreaterThan(0)
      for (const wear of wears) {
        const at = anchorAtRest(friend, wear)
        expect(Math.abs(at.x)).toBeLessThanOrEqual(BODY[friend].rx + 30)
        expect(at.y).toBeLessThanOrEqual(0)
        expect(at.y).toBeGreaterThanOrEqual(-BODY[friend].ry * 2 - 60)
        expect(anchorOf(friend, wear).size).toBeGreaterThan(40)
      }
    }
  })

  it('goes on the place nearest to where it was let go', () => {
    const foot = anchorAtRest('pig', 'foot'), ear = anchorAtRest('pig', 'ear'), tail = anchorAtRest('pig', 'tail')
    expect(wearNear('pig', 'sock', foot.x, foot.y)).toBe('foot')
    expect(wearNear('pig', 'sock', ear.x, ear.y)).toBe('ear')
    expect(wearNear('pig', 'sock', tail.x, tail.y)).toBe('tail')
    expect(wearNear('heron', 'sock', anchorAtRest('heron', 'beak').x, anchorAtRest('heron', 'beak').y)).toBe('beak')
    expect(wearNear('goat', 'scarf', 0, anchorAtRest('goat', 'horns').y - 40)).toBe('horns')
    // A garment with one place goes there wherever it was let go.
    expect(wearNear('goat', 'shirt', 500, 500)).toBe('torso')
  })
})

describe('the mud on a hide', () => {
  it('a friend comes muddy, the same for the same seed', () => {
    const hide = muddyHide(makeRng(4))
    expect(hide).toHaveLength(HIDE_CELLS)
    expect(hide.filter((level) => level > 0).length).toBeGreaterThanOrEqual(4)
    expect(muddyHide(makeRng(4))).toEqual(hide)
  })

  it('a rub lifts one step under the finger and nothing far from it', () => {
    const hide = cleanHide()
    hide[0] = 3
    hide[HIDE_CELLS - 1] = 2
    expect(rubHide(hide, 0.1, 0.1)).toBe(1)
    expect(hide[0]).toBe(2)
    expect(hide[HIDE_CELLS - 1]).toBe(2)
    expect(rubHide(hide, 0.5, 0.5)).toBe(0)
  })

  it('rubbing all over gets it clean', () => {
    const hide = muddyHide(makeRng(9))
    for (let n = 0; n < 3; n++) for (let u = 0.1; u < 1; u += 0.2) for (let v = 0.1; v < 1; v += 0.2) rubHide(hide, u, v)
    expect(hide.every((level) => level === 0)).toBe(true)
  })

  it('round-trips, and refuses what is not a hide', () => {
    const hide = muddyHide(makeRng(2))
    expect(decodeHide(encodeHide(hide))).toEqual(hide)
    for (const raw of [undefined, 3, '012', '9'.repeat(HIDE_CELLS), 'x'.repeat(HIDE_CELLS)]) expect(decodeHide(raw)).toBeNull()
  })
})
