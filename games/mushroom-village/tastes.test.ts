import { describe, expect, it } from 'vitest'
import { GNOMES } from './ground'
import { fits, hatStaysOut, mannerOf, whoMovesIn, type HouseFacts } from './tastes'

const house = (over: Partial<HouseFacts> = {}): HouseFacts => ({ kind: 'red', size: 6, pathLeads: true, puffNear: false, ...over })

describe('what fits whom', () => {
  it('fits the tall gnome from nine steps, the baker on the bank, the sleepy one where no path leads, the sneezy one in a red house away from puffballs', () => {
    expect(fits('tall', house({ size: 9 }))).toBe(true)
    expect(fits('tall', house({ size: 8 }))).toBe(false)
    expect(fits('baker', house({ kind: 'bell' }))).toBe(true)
    expect(fits('baker', house())).toBe(false)
    expect(fits('sleepy', house({ pathLeads: false }))).toBe(true)
    expect(fits('sleepy', house())).toBe(false)
    expect(fits('sneezy', house())).toBe(true)
    expect(fits('sneezy', house({ puffNear: true }))).toBe(false)
    expect(fits('sneezy', house({ kind: 'puff', puffNear: true }))).toBe(false)
  })
})

describe('who moves in', () => {
  it('sends the one the house fits', () => {
    expect(whoMovesIn(GNOMES, house({ kind: 'bell', size: 3 }), 300)).toBe('baker')
    expect(whoMovesIn(GNOMES, house({ kind: 'puff', size: 12, puffNear: true }), 600)).toBe('tall')
  })

  it('sends the nearest to the path\'s start where the house fits two, or nobody', () => {
    expect(whoMovesIn(GNOMES, house({ size: 12 }), 100)).toBe('tall')
    expect(whoMovesIn(GNOMES, house({ size: 12 }), 430)).toBe('sneezy')
    expect(whoMovesIn(GNOMES, house({ kind: 'puff', size: 3, puffNear: true }), 600)).toBe('baker')
    expect(whoMovesIn(['tall', 'sleepy'], house({ kind: 'puff', size: 3, puffNear: true }), 250)).toBe('sleepy')
  })

  it('sends only the sleepy one over the moss, and nobody where pebbles lie at the door and do not come from the log', () => {
    expect(whoMovesIn(GNOMES, house({ pathLeads: false }), null)).toBe('sleepy')
    expect(whoMovesIn(['tall', 'baker', 'sneezy'], house({ pathLeads: false }), null)).toBeNull()
    expect(whoMovesIn(GNOMES, house({ pathLeads: true }), null)).toBeNull()
  })

  it('sends nobody when nobody waits', () => {
    expect(whoMovesIn([], house(), 300)).toBeNull()
  })
})

describe('how each carries himself', () => {
  it('shows a fit and what goes against a taste, each in the gnome\'s own way', () => {
    expect(mannerOf('tall', house({ size: 12 }))).toBe('upright')
    expect(mannerOf('tall', house({ size: 6 }))).toBe('stooped')
    expect(mannerOf('tall', house({ size: 2 }))).toBe('crawled')
    expect(mannerOf('baker', house({ kind: 'bell' }))).toBe('kneading')
    expect(mannerOf('baker', house())).toBe('thirsty')
    expect(mannerOf('sleepy', house({ pathLeads: false }))).toBe('asleep')
    expect(mannerOf('sleepy', house())).toBe('woken')
    expect(mannerOf('sneezy', house())).toBe('sunning')
    expect(mannerOf('sneezy', house({ kind: 'puff', puffNear: true }))).toBe('sneezing')
    expect(mannerOf('sneezy', house({ puffNear: true }))).toBe('sniffing')
  })

  it('leaves the tall hat on the step of a low house only', () => {
    expect(hatStaysOut(4)).toBe(true)
    expect(hatStaysOut(5)).toBe(false)
  })
})
