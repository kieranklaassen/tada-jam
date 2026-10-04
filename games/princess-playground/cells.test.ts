import { describe, expect, it } from 'vitest'
import { emptyArrangement, putInSand, putOnEnd, tap, type Arrangement } from './arrangement'
import { delight, landingOf, perched, reactionsTo, tossed, type Reaction } from './cells'
import { FRIEND_IDS, homeOn, type FriendId } from './world'

const on = (left: FriendId[], right: FriendId[]): Arrangement => {
  let a = emptyArrangement()
  for (const id of left) a = putOnEnd(a, id, 'left')
  for (const id of right) a = putOnEnd(a, id, 'right')
  return a
}

/** What is seen and heard of a set of reactions, as one string to compare cells by. */
const shape = (reactions: Reaction[]) => reactions.map((r) => `${r.who}:${r.act ?? '-'}:${r.voice ? r.voice.map((p) => `${p.kind}${Math.round(p.frequency)}@${p.delay}`).join('+') : '-'}:${r.mark ?? ''}`).join(' | ')

describe('where a friend was put', () => {
  it('reads the column of the grid from the plank as it lay without that friend', () => {
    // Onto the end that is already down.
    expect(landingOf(on(['bo'], []), putOnEnd(on(['bo'], []), 'pim', 'left'), 'pim')).toMatchObject({ deed: 'on-a-friend', below: 'bo', tips: false })
    expect(landingOf(on(['bo'], ['mog']), putOnEnd(putOnEnd(emptyArrangement(), 'bo', 'left'), 'mog', 'right'), 'mog').deed).toBe('high-end')
    // Onto the high end without tipping it, and tipping it.
    const low = on(['bo'], [])
    expect(landingOf(low, tap(low, 'pim'), 'pim')).toMatchObject({ deed: 'high-end', end: 'right', tips: false, alone: false })
    const light = on(['pim'], [])
    expect(landingOf(light, tap(light, 'bo'), 'bo')).toMatchObject({ deed: 'high-end', tips: true })
    // Onto an empty plank: it comes down under the newcomer, who is alone on it.
    expect(landingOf(on([], []), tap(on([], []), 'bo'), 'bo')).toMatchObject({ deed: 'high-end', tips: true, alone: true, weightThere: 4 })
    // The same weight: level, and nothing tipped.
    const mog = on(['mog'], [])
    expect(landingOf(mog, tap(mog, 'dot'), 'dot')).toMatchObject({ levels: true, tips: false })
    // Off the plank into the sand.
    expect(landingOf(low, tap(low, 'bo'), 'bo')).toMatchObject({ deed: 'in-the-sand', end: null })
  })

  it('a friend moved from one end to the other is read against the plank without it', () => {
    const start = on(['pim', 'mog'], ['bo'])
    const moved = putOnEnd(start, 'mog', 'right')
    expect(landingOf(start, moved, 'mog')).toMatchObject({ deed: 'on-a-friend', below: 'bo', end: 'right' })
  })
})

describe('the cells in play', () => {
  const deeds = (id: FriendId) => {
    const others = FRIEND_IDS.filter((other) => other !== id)
    const heavy = id === 'bo' ? 'mog' : 'bo'
    return {
      low: reactionsTo(landingOf(on([heavy, others.find((o) => o !== heavy)!], []), putOnEnd(on([], []), id, 'left'), id)),
      lowAlready: reactionsTo({ id, deed: 'low-end', end: 'left', tips: false, levels: false, below: null, alone: false, company: true, weightThere: 5, others: [] }),
      highTips: reactionsTo({ id, deed: 'high-end', end: 'right', tips: true, levels: false, below: null, alone: false, company: true, weightThere: 5, others: [] }),
      highStays: reactionsTo({ id, deed: 'high-end', end: 'right', tips: false, levels: false, below: null, alone: false, company: true, weightThere: 2, others: [] }),
      onFriend: reactionsTo({ id, deed: 'on-a-friend', end: 'left', tips: false, levels: false, below: heavy, alone: false, company: true, weightThere: 6, others: [heavy] }),
      sand: reactionsTo({ id, deed: 'in-the-sand', end: null, tips: false, levels: false, below: null, alone: false, company: false, weightThere: 0, others: [] }),
    }
  }

  it('each friend answers each place in a way of its own: no two friends share a cell', () => {
    for (const cell of ['lowAlready', 'highTips', 'highStays', 'onFriend', 'sand'] as const) {
      const shapes = FRIEND_IDS.map((id) => shape(deeds(id)[cell]))
      expect(new Set(shapes).size, cell).toBe(4)
    }
  })

  it('and for one friend no two places are answered alike', () => {
    for (const id of FRIEND_IDS) {
      const d = deeds(id)
      const shapes = [d.lowAlready, d.highTips, d.highStays, d.onFriend, d.sand].map(shape)
      expect(new Set(shapes).size, id).toBe(5)
    }
  })

  it('the wrong uses work and are answered: Pim too light dangles and trills, Bo on Pim squashes her with a wheeze, Mog on Pim gets a raspberry', () => {
    expect(deeds('pim').highStays[0]).toMatchObject({ who: 'pim', act: 'kick' })
    const boOnPim = reactionsTo(landingOf(on(['pim'], []), putOnEnd(on(['pim'], []), 'bo', 'left'), 'bo'))
    expect(boOnPim.some((r) => r.who === 'pim' && r.voice)).toBe(true)
    const mogOnPim = reactionsTo(landingOf(on(['pim'], []), putOnEnd(on(['pim'], []), 'mog', 'left'), 'mog'))
    expect(mogOnPim.find((r) => r.who === 'pim')).toMatchObject({ act: 'puff' })
    expect(mogOnPim.find((r) => r.who === 'mog')).toMatchObject({ act: 'knead' })
    // Landed on, Mog ducks and hisses; on top of a stack he blinks slowly once he has sat.
    const pimOnMog = reactionsTo(landingOf(on(['mog'], []), putOnEnd(on(['mog'], []), 'pim', 'left'), 'pim'))
    expect(pimOnMog.find((r) => r.who === 'mog')).toMatchObject({ act: 'duck' })
    expect(mogOnPim.some((r) => r.who === 'mog' && (r.blink ?? 0) > 0.5)).toBe(true)
    // High for once without tipping it, Bo chuckles and the plank shakes under him, as far one way as the other.
    const boHigh = reactionsTo(landingOf(on(['pim', 'mog'], []), putOnEnd(on(['pim', 'mog'], []), 'bo', 'right'), 'bo'))
    expect(boHigh.find((r) => r.act)).toMatchObject({ who: 'bo', act: 'chuckle' })
    expect(boHigh.find((r) => r.act)?.rock).toBeGreaterThan(0)
    // Lifted there by the others he chuckles too.
    expect(perched('bo').some((r) => r.act === 'chuckle' && r.rock)).toBe(true)
    // High and not tipping it, Mog sits tall, purrs and blinks slowly.
    const mogHigh = reactionsTo(landingOf(on(['bo'], []), putOnEnd(on(['bo'], []), 'mog', 'right'), 'mog'))
    expect(mogHigh.find((r) => r.who === 'mog')).toMatchObject({ act: 'tall' })
    expect(mogHigh.find((r) => r.who === 'mog')?.blink).toBeGreaterThan(0.5)
  })

  it('Dot in the sand hums beside a friend, and alone draws its one ring', () => {
    const beside = reactionsTo({ id: 'dot', deed: 'in-the-sand', end: null, tips: false, levels: false, below: null, alone: false, company: true, weightThere: 0, others: [] })
    expect(beside.some((r) => r.mark === 'ring')).toBe(false)
    expect(deeds('dot').sand.filter((r) => r.mark === 'ring').length).toBe(1)
    const start = on(['pim'], ['dot'])
    const off = putInSand(start, 'dot', homeOn('dot', 'right'))
    expect(landingOf(start, off, 'dot').company).toBe(false)
  })

  it('the friends on the plank answer Dot’s coming: each turns to it and bounces, and nobody does so for anyone else', () => {
    const start = on(['pim'], ['bo'])
    const dotComes = reactionsTo(landingOf(start, putOnEnd(start, 'dot', 'right'), 'dot'))
    expect(dotComes.filter((r) => r.act === 'greet' && r.toward === 'dot').map((r) => r.who).sort()).toEqual(['pim'])
    const lonely = on(['pim', 'mog'], [])
    const greeted = reactionsTo(landingOf(lonely, putOnEnd(lonely, 'dot', 'right'), 'dot'))
    expect(greeted.filter((r) => r.act === 'greet' && r.toward === 'dot').map((r) => r.who).sort()).toEqual(['mog', 'pim'])
    const mogComes = reactionsTo(landingOf(start, putOnEnd(start, 'mog', 'right'), 'mog'))
    expect(mogComes.some((r) => r.who === 'pim' && (r.act === 'bounce' || r.act === 'greet'))).toBe(false)
  })

  it('a taste given as every time is every time: under Bo too, on top of a stack too, and thrown up onto the high end too', () => {
    const under = (below: FriendId, by: FriendId) => reactionsTo(landingOf(on([below], []), putOnEnd(on([below], []), by, 'left'), by)).filter((r) => r.who === below)
    const heard = (reactions: Reaction[]) => reactions.filter((r) => r.voice).map((r) => r.voice!.map((p) => `${p.kind}${Math.round(p.frequency)}`).join('+'))
    // Pim underneath: cheeks out and a raspberry, whoever sits on her; under Bo the wheeze comes first.
    for (const by of ['mog', 'dot', 'bo'] as const) expect(under('pim', by).some((r) => r.act === 'puff' && r.voice), by).toBe(true)
    expect(under('pim', 'bo').length).toBe(2)
    // Mog landed on: his hiss, a voice of its own, whoever lands.
    const hiss = heard(under('mog', 'pim'))[0]
    for (const by of ['pim', 'dot', 'bo'] as const) expect(heard(under('mog', by)), by).toContain(hiss)
    expect(hiss).not.toBe(heard(reactionsTo(landingOf(on([], []), putInSand(on([], []), 'mog', homeOn('mog', 'right')), 'mog')))[0])
    // Dot under anyone: its duet.
    const duet = heard(reactionsTo(landingOf(on(['pim'], []), putOnEnd(on(['pim'], []), 'dot', 'left'), 'dot')).filter((r) => r.who === 'dot'))[0]
    for (const by of ['pim', 'mog', 'bo'] as const) expect(heard(under('dot', by)), by).toContain(duet)
    // Mog on top of a stack: he kneads, then purrs and blinks slowly, as on the high end.
    const purr = shape(perched('mog'))
    const onTop = reactionsTo(landingOf(on(['pim'], []), putOnEnd(on(['pim'], []), 'mog', 'left'), 'mog')).filter((r) => r.who === 'mog')
    expect(onTop.map((r) => r.act)).toEqual(['knead', 'tall'])
    expect(shape([onTop[1]])).toBe(purr)
    expect(onTop[1].blink).toBeGreaterThan(0.5)
    expect(perched('mog')[0].blink).toBeGreaterThan(0.5)
    expect(perched('pim')).toEqual([])
  })

  it('being thrown and being carried up are each friend’s own: Pim squeals and spins, Mog yowls, Bo chuckles', () => {
    expect(new Set(FRIEND_IDS.map((id) => shape(tossed(id, 12)))).size).toBe(4)
    expect(new Set(FRIEND_IDS.map((id) => shape(delight(id)))).size).toBe(4)
    expect(tossed('pim', 12)[0].act).toBe('spin')
    expect(tossed('mog', 12)[0].act).toBeUndefined()
    expect(delight('bo')[0].act).toBe('chuckle')
  })

  it('every reaction happens soon, lasts a moment and is about the scene', () => {
    const all = FRIEND_IDS.flatMap((id) => [...Object.values(deeds(id)).flat(), ...tossed(id, 9), ...delight(id)])
    for (const r of all) {
      expect(r.after).toBeGreaterThanOrEqual(0)
      expect(r.after).toBeLessThanOrEqual(0.6)
      if (r.act) expect(r.seconds ?? 0.6).toBeLessThanOrEqual(1.6)
      expect(r.act !== undefined || r.voice !== undefined || r.rock !== undefined).toBe(true)
    }
  })
})
