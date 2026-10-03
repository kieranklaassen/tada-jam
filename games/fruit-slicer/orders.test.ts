import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { PARTS, WHOLE, compareShares, sameSize, shareLength } from './measure'
import { inPlay, inRange, layOut, ordersFor, signBetween, tinParts, twinShare, wanted, type Customer, type Who } from './orders'

/** Many customers for one position and role, from seeds that differ. */
function crowd(position: string, role: 'new' | 'known', count = 300): Customer[] {
  const customers: Customer[] = []
  let seed = 1 + LADDER.indexOf(position) * 977
  for (let i = 0; i < count; i++) {
    const laid = layOut(position, role, seed)
    customers.push(laid.customer)
    seed = laid.seed
  }
  return customers
}

describe('the designed order', () => {
  it('names every position by what is new there, and never by a school year or level', () => {
    expect(LADDER).toEqual(['half', 'quarter', 'shared', 'carried', 'written', 'eighths', 'thirds', 'fifths', 'twelfths', 'bigger', 'longer', 'bare'])
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|fase|level|niveau|year|class|\d/i)
  })

  it('adds one thing at a time: a customer, or parts, or a way a ticket looks', () => {
    let before = inPlay(LADDER[0])
    expect(before).toEqual({ who: ['pelican'], parts: [2], written: false })
    for (const id of LADDER.slice(1)) {
      const now = inPlay(id)
      const newWho = now.who.length - before.who.length
      const newParts = now.parts.length - before.parts.length
      expect(newWho === 1 ? newParts : 0, id).toBe(0)
      expect(newWho + (newParts > 0 ? 1 : 0) + (now.written !== before.written ? 1 : 0) + (id === 'bare' ? 1 : 0), id).toBe(1)
      before = now
    }
    expect([...before.parts].sort((a, b) => a - b)).toEqual([...PARTS].sort((a, b) => a - b))
    expect(before.who).toEqual(['pelican', 'twins', 'ants', 'cat', 'boa'])
  })

  it('shows no symbol before the position named written, and from there on every ticket', () => {
    for (const id of LADDER) for (const role of ['new', 'known'] as const) for (const customer of crowd(id, role, 40)) expect(customer.written, id).toBe(LADDER.indexOf(id) >= LADDER.indexOf('written'))
  })
})

describe('every order laid out', () => {
  it('is inside the limits, at every position and in both roles', () => {
    for (const id of LADDER) for (const role of ['new', 'known'] as const) for (const customer of crowd(id, role)) expect(inRange(customer), `${id} ${role} ${JSON.stringify(customer)}`).toEqual([])
  })

  it('uses only the customers and parts in play at its position', () => {
    for (const id of LADDER) {
      const play = inPlay(id)
      for (const role of ['new', 'known'] as const)
        for (const customer of crowd(id, role, 120)) {
          expect(play.who, id).toContain(customer.who)
          for (const share of customer.shares) expect(play.parts, id).toContain(share.den)
          if (customer.who === 'twins') expect(play.parts, `${id}: what each twin gets`).toContain(twinShare(customer.shares[0]).den)
        }
    }
  })

  it('carries what is new at its position when it is the new one', () => {
    for (const customer of crowd('shared', 'new', 60)) expect(customer.who).toBe('twins')
    for (const customer of crowd('carried', 'new', 60)) expect(customer.who).toBe('ants')
    for (const customer of crowd('bigger', 'new', 60)) expect(customer.who).toBe('cat')
    for (const customer of crowd('longer', 'new', 60)) expect(customer.who).toBe('boa')
    for (const customer of crowd('eighths', 'new', 60)) expect(customer.shares.some((share) => share.den === 8) || twinShare(customer.shares[0]).den === 8).toBe(true)
    for (const customer of crowd('thirds', 'new', 60)) expect(customer.shares.some((share) => [3, 6].includes(share.den)) || [3, 6].includes(twinShare(customer.shares[0]).den)).toBe(true)
    for (const customer of crowd('bare', 'new', 60)) expect(customer.lined).toBe(false)
    for (const customer of crowd('bare', 'known', 60)) expect(customer.lined).toBe(true)
    for (const id of LADDER) for (const customer of crowd(id, 'new', 20)) expect(customer.carries).toBe(id)
    for (const id of LADDER.slice(1)) for (const customer of crowd(id, 'known', 20)) expect(customer.carries).toBeNull()
    for (const customer of crowd(LADDER[0], 'known', 20)) expect(customer.carries).toBe(LADDER[0])
  })

  it('opens on halves alone, of all three fruits, for the pelican', () => {
    const first = crowd('half', 'new', 200)
    expect(new Set(first.map((customer) => JSON.stringify(customer.shares)))).toEqual(new Set(['[{"num":1,"den":2}]']))
    expect(new Set(first.map((customer) => customer.who))).toEqual(new Set(['pelican']))
    expect(new Set(first.map((customer) => customer.fruit)).size).toBe(3)
  })

  it('brings known work back mixed: a late position draws its known customer from all that came before', () => {
    const known = crowd('bare', 'known', 600)
    expect(new Set(known.map((customer) => customer.who)).size).toBe(5)
    expect(new Set(known.flatMap((customer) => customer.shares.map((share) => share.den))).size).toBe(PARTS.length)
  })

  it('is the same for the same position, role and seed', () => {
    expect(layOut('fifths', 'new', 99)).toEqual(layOut('fifths', 'new', 99))
    expect(layOut('fifths', 'known', 99)).toEqual(layOut('fifths', 'known', 99))
    expect(layOut('nowhere', 'new', 3).customer.who).toBe('pelican')
  })
})

describe('what each customer may order', () => {
  const all = (who: Who) => ordersFor(who, 'short', PARTS)

  it('gives the pelican less than a whole and the boa more than one, up to two', () => {
    for (const [share] of all('pelican')) expect(share.num).toBeLessThan(share.den)
    for (const [share] of all('boa')) {
      expect(share.num).toBeGreaterThan(share.den)
      expect(share.num).toBeLessThanOrEqual(2 * share.den)
    }
    // A long fruit leaves the boa less room on the rail than a short one.
    expect(ordersFor('boa', 'long', PARTS).length).toBeLessThan(all('boa').length)
    expect(ordersFor('boa', 'long', PARTS).length).toBeGreaterThan(0)
  })

  it('gives the twins only what halves into parts on the list, and two equal compartments', () => {
    for (const [share] of all('twins')) expect(PARTS).toContain(twinShare(share).den)
    expect(all('twins').some(([share]) => share.num === 3 && share.den === 10)).toBe(false)
    expect(twinShare({ num: 1, den: 2 })).toEqual({ num: 1, den: 4 })
    expect(twinShare({ num: 6, den: 8 })).toEqual({ num: 3, den: 8 })
    const twins: Customer = { who: 'twins', fruit: 'long', shares: [{ num: 1, den: 2 }], carries: 'shared', written: false, lined: true }
    expect(tinParts(twins)).toEqual([WHOLE.long / 4, WHOLE.long / 4])
  })

  it('gives the cat two shares that differ in both numbers and share parts on the list', () => {
    const pairs = ordersFor('cat', 'middle', PARTS)
    expect(pairs.length).toBeGreaterThan(50)
    expect(pairs.some(([a, b]) => a.den === 3 && b.den === 5)).toBe(false)
    expect(pairs.some(([a, b]) => sameSize(a, b))).toBe(true)
    const cat: Customer = { who: 'cat', fruit: 'middle', shares: [{ num: 2, den: 3 }, { num: 3, den: 4 }], carries: 'bigger', written: true, lined: true }
    expect(wanted(cat)).toEqual({ num: 3, den: 4 })
    expect(signBetween(cat)).toBe('less')
    expect(tinParts(cat)).toEqual([shareLength('middle', { num: 3, den: 4 })])
    expect(signBetween({ ...cat, shares: [{ num: 1, den: 2 }, { num: 2, den: 4 }] })).toBe('equals')
    expect(signBetween({ ...cat, shares: [{ num: 5, den: 6 }, { num: 3, den: 4 }] })).toBe('greater')
    expect(compareShares(wanted({ ...cat, shares: [{ num: 5, den: 6 }, { num: 3, den: 4 }] }), { num: 5, den: 6 })).toBe(0)
    expect(signBetween({ ...cat, who: 'pelican', shares: [{ num: 1, den: 2 }] })).toBeNull()
  })

  it('gives the ants a file of at least two', () => {
    for (const [share] of all('ants')) expect(share.num).toBeGreaterThanOrEqual(2)
  })
})
