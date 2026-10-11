import { describe, expect, it } from 'vitest'
import { arrange } from './garden'
import { VISITORS, nextPosition, tipping, turnOf, verdict, type Stood, type VisitorId } from './cast'
import { FIRST_VISIT, LADDER } from './config'
import { VASE, VASES, type VaseId } from './layout'
import { BED, fullOf, type Kind } from './plants'
import { firstPosition } from './state'

const stemOf = (kind: Kind): number => BED.findIndex((spot) => spot.kind === kind)
/** The top of a stem of this plant, `len` long, let go at `at` across the mouth. */
const flower = (kind: Kind, len = 120, at = 0): Stood => ({ kind, len, head: true, spent: false, at, scale: BED[stemOf(kind)].scale })
const stalk = (kind: Kind, len = 120, at = 0): Stood => ({ kind, len, head: false, spent: false, at, scale: BED[stemOf(kind)].scale })
const judge = (who: VisitorId, pieces: Stood[], vase: VaseId = 'boot') => verdict(who, pieces, arrange(pieces, VASE[vase]), VASE[vase])

describe('the ring of turns', () => {
  it('pairs every visitor with every vase once, a new visitor or a new vase at a time', () => {
    expect(LADDER).toHaveLength(VISITORS.length * VASES.length)
    expect(new Set(LADDER).size).toBe(LADDER.length)
    for (const id of LADDER) expect(`${turnOf(id).visitor}-${turnOf(id).vase}`).toBe(id)
    LADDER.forEach((id, index) => {
      expect(turnOf(id).visitor).toBe(VISITORS[index % VISITORS.length])
      expect(turnOf(id).vase).toBe(VASES[index % VASES.length])
    })
  })

  it('has no end: after the last turn comes the first, one turn at a time', () => {
    let at = LADDER[0]
    const seen: string[] = []
    for (let i = 0; i < LADDER.length; i++) { seen.push(at); at = nextPosition(at) }
    expect(seen).toEqual([...LADDER])
    expect(at).toBe(LADDER[0])
  })

  it('reads an id nobody knows as the first turn', () => {
    expect(turnOf('lily-bucket')).toEqual({ visitor: 'goat', vase: 'boot' })
  })

  it('opens a first visit by age as a default only: no age is the youngest, and both ends are open', () => {
    expect(firstPosition(null)).toBe('goat-boot')
    for (const age of [0, 2, 3, 4]) expect(firstPosition(age)).toBe('goat-boot')
    expect(firstPosition(5)).toBe('beekeeper-jar')
    for (const age of [6, 7, 9, 12, 40]) expect(firstPosition(age)).toBe('bride-vase')
    // Whatever the start, the ring brings every visitor and every vase round: age gates nothing.
    for (const row of FIRST_VISIT) {
      const met = new Set<string>()
      let at = row.position
      for (let i = 0; i < LADDER.length; i++) { met.add(turnOf(at).visitor); met.add(turnOf(at).vase); at = nextPosition(at) }
      expect(met.size).toBe(VISITORS.length + VASES.length)
    }
  })
})

describe('the fixed tastes', () => {
  it('lets the first three kinds of flower answer the sniff, in the order they were put in, the same every time', () => {
    const pieces = [flower('poppy'), stalk('ivy'), flower('poppy'), flower('onion'), { ...flower('dandelion'), spent: true }, flower('thistle'), flower('sunflower')]
    for (const who of VISITORS) {
      expect(judge(who, pieces).sniffs).toEqual(['poppy', 'onion', 'thistle'])
      expect(judge(who, pieces)).toEqual(judge(who, pieces))
    }
  })

  it('gives an answer that never depends on which three were sniffed', () => {
    const first = [flower('sunflower'), flower('onion'), flower('ivy')]
    expect(judge('goat', [...first, flower('thistle')]).answers).toEqual(['loves', 'cannot'])
    expect(judge('bride', [...first, flower('poppy'), flower('dandelion')]).answers).toEqual(['loves', 'cannot'])
    expect(judge('aunt', [...first, flower('thistle'), flower('dandelion')]).answers).toContain('laugh')
    expect(judge('beekeeper', [flower('poppy'), flower('dandelion'), flower('ivy'), flower('thistle')]).answers).toEqual(['loves', 'unveil'])
  })

  it('the goat loves thistles, cannot stand onion flowers, and keeps only the first piece', () => {
    expect(judge('goat', [flower('thistle')]).answers).toEqual(['loves'])
    expect(judge('goat', [flower('poppy'), flower('onion')]).answers).toEqual(['cannot'])
    expect(judge('goat', [flower('poppy'), flower('ivy')]).answers).toEqual(['plain'])
    expect(judge('goat', [flower('poppy'), flower('ivy'), flower('onion')]).keeps).toEqual([0])
  })

  it('the bee-keeper loves anything with a bee on it, misses them when there is none, and the ivy unveils her', () => {
    expect(judge('beekeeper', [flower('sunflower'), flower('onion'), flower('thistle')])).toMatchObject({ answers: ['loves'], bees: 3 })
    expect(judge('beekeeper', [flower('poppy'), flower('dandelion')])).toMatchObject({ answers: ['cannot'], bees: 0 })
    expect(judge('beekeeper', [flower('ivy')]).answers).toEqual(['cannot', 'unveil'])
    expect(judge('beekeeper', [flower('sunflower'), stalk('ivy')]).answers).toEqual(['loves', 'unveil'])
    expect(judge('beekeeper', [stalk('ivy'), stalk('poppy')]).answers).toEqual(['stalks', 'unveil'])
  })

  it('the bride loves poppies and sneezes every dandelion bald', () => {
    expect(judge('bride', [flower('poppy')])).toMatchObject({ answers: ['loves'], bald: false })
    expect(judge('bride', [flower('onion'), flower('dandelion')])).toMatchObject({ answers: ['cannot'], bald: true })
    expect(judge('bride', [flower('onion'), { ...flower('poppy'), spent: true }]).answers).toEqual(['plain'])
  })

  it('the aunt nods at a neat bunch and lifts her eyebrow at a tipped head or a piece that leans out wide', () => {
    expect(judge('aunt', [flower('poppy', 120, -2), flower('onion', 124, 2)]).answers).toEqual(['loves'])
    expect(judge('aunt', [flower('poppy', 120, -2), flower('onion', 180, 2)]).answers).toEqual(['plain'])
    expect(judge('aunt', [flower('poppy', 120, 10), flower('onion', 124, 2)]).answers).toEqual(['cannot'])
    // A long piece in the shallow jar tips its head.
    expect(judge('aunt', [flower('sunflower', 300, 2)], 'jar').answers).toEqual(['cannot'])
  })

  it('makes the aunt laugh with a thistle and a dandelion in one vase, every time', () => {
    for (const vase of VASES) expect(judge('aunt', [flower('dandelion', 100), flower('thistle', 100)], vase)).toMatchObject({ bald: true })
    expect(judge('aunt', [flower('dandelion', 100), flower('thistle', 100)]).answers[0]).toBe('laugh')
    expect(judge('aunt', [flower('dandelion', 100), stalk('thistle', 100)]).answers).not.toContain('laugh')
  })

  it('takes a vase of nothing but stalks as a bouquet, each in its own way', () => {
    for (const who of VISITORS) {
      const got = judge(who, [stalk('poppy', 80), stalk('thistle', 84)])
      expect(got.answers).toEqual(['stalks'])
      expect(got.sniffs).toEqual([])
    }
    expect(judge('aunt', [stalk('poppy', 80), stalk('thistle', 84)]).neat).toBe(true)
    expect(judge('aunt', [stalk('poppy', 80), stalk('thistle', 130)]).neat).toBe(false)
  })

  it('lifts the aunt\'s eyebrow at a stalk that leans out wide or tips, before she measures the stalks', () => {
    expect(judge('aunt', [stalk('poppy', 80, 10), stalk('onion', 84, 2)]).answers).toEqual(['cannot', 'stalks'])
    expect(judge('aunt', [stalk('sunflower', 300, 2)], 'jar').answers).toEqual(['cannot', 'stalks'])
    // Nobody else minds how a stalk leans.
    for (const who of ['goat', 'bride'] as const) expect(judge(who, [stalk('poppy', 80, 10), stalk('onion', 84, 2)]).answers).toEqual(['stalks'])
  })

  it('always answers: a bouquet that touches no taste gets a sniff and nothing more', () => {
    for (const who of VISITORS) for (const kind of ['sunflower', 'poppy', 'onion', 'thistle', 'ivy', 'dandelion'] as const) expect(judge(who, [flower(kind, Math.min(120, fullOf(stemOf(kind))))]).answers.length).toBeGreaterThan(0)
  })
})

describe('the vase goes over', () => {
  const tipped = (count: number, side: 1 | -1): Stood[] => Array.from({ length: count }, () => flower('sunflower', 340, side * 8))

  it('never tips the boot', () => {
    expect(tipping(arrange(tipped(7, 1), VASE.boot), VASE.boot)).toEqual({ over: 0, rocks: false })
  })

  it('tips the tall vase at two more heads to one side, and the jar at four, and rocks one short of it', () => {
    const at = (count: number, vase: VaseId, side: 1 | -1 = 1) => tipping(arrange(tipped(count, side), VASE[vase]), VASE[vase])
    expect(at(1, 'vase')).toEqual({ over: 0, rocks: true })
    expect(at(2, 'vase')).toEqual({ over: 1, rocks: false })
    expect(at(2, 'vase', -1)).toEqual({ over: -1, rocks: false })
    expect(at(2, 'jar')).toEqual({ over: 0, rocks: false })
    expect(at(3, 'jar')).toEqual({ over: 0, rocks: true })
    expect(at(4, 'jar')).toEqual({ over: 1, rocks: false })
  })

  it('balances a head tipped one way against a head tipped the other', () => {
    const pieces = [flower('sunflower', 340, 8), flower('sunflower', 340, -8), flower('sunflower', 340, 8)]
    expect(tipping(arrange(pieces, VASE.vase), VASE.vase)).toEqual({ over: 0, rocks: true })
  })
})
