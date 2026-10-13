import { describe, expect, it } from 'vitest'
import { FOLK, HOME, PLACES, PLACE_COUNT } from './tree'
import { KINDS, OWN_FIT, meet, meetStep, restOf, routeTo, walkEnd, wayTo, type Kind, type Tree } from './ways'

const tree = (pieces: Record<number, Kind>, lifts: Record<number, 0 | 1> = {}): Tree => ({
  places: Array.from({ length: PLACE_COUNT }, (_, index) => pieces[index] ?? null),
  lifts: Array.from({ length: PLACE_COUNT }, (_, index) => lifts[index] ?? 0),
})

describe('the grid as rules', () => {
  it('has seven kinds of piece, each with a fit of its own', () => {
    expect(KINDS).toHaveLength(7)
    for (const kind of KINDS) expect(['rise', 'span']).toContain(OWN_FIT[kind])
  })

  it('lets everyone over a plank on a span, and only the squirrel and the twins up a plank on a rise', () => {
    for (const folk of FOLK) expect(meet(folk, 'plank', 'span', false)).toBe('across')
    expect(FOLK.filter((folk) => meet(folk, 'plank', 'rise', true) === 'across')).toEqual(['squirrel', 'mice'])
    for (const folk of FOLK) expect(meet(folk, 'plank', 'rise', false)).toBe('across')
  })

  it('gives the beetle a ladder for every step up and no other way up but a bucket', () => {
    for (const kind of KINDS) {
      const up = meet('beetle', kind, 'rise', true)
      expect(up, kind).toBe(kind === 'ladder' ? 'across' : kind === 'bucket' ? 'carry' : 'stay')
    }
  })

  it('never lets the owl over a rope bridge or up anything, and carries her in a bucket', () => {
    expect(meet('owl', 'bridge', 'span', false)).toBe('stay')
    for (const kind of KINDS) if (kind !== 'bucket') expect(meet('owl', kind, 'rise', true), kind).toBe('stay')
    expect(meet('owl', 'bucket', 'rise', true)).toBe('carry')
    expect(meet('owl', 'bucket', 'span', false)).toBe('carry')
    expect(meet('owl', 'slide', 'rise', false)).toBe('across')
  })

  it('stops the twins at anything that hangs, either way it is fitted', () => {
    for (const kind of ['bridge', 'swing', 'lanterns'] as const) for (const fit of ['rise', 'span'] as const) expect(meet('mice', kind, fit, true), `${kind} ${fit}`).toBe('stay')
    expect(meet('mice', 'bucket', 'rise', true)).toBe('carry')
    for (const kind of ['plank', 'ladder'] as const) for (const fit of ['rise', 'span'] as const) expect(meet('mice', kind, fit, true)).toBe('across')
  })

  it('lets the squirrel run everything but a swing on a span, and never makes him wait', () => {
    for (const kind of KINDS) for (const fit of ['rise', 'span'] as const) for (const up of [true, false]) {
      expect(meet('squirrel', kind, fit, up), `${kind} ${fit}`).toBe(kind === 'swing' && fit === 'span' ? 'stay' : 'across')
    }
  })

  it('makes a slide on a rise a way down for everyone and a way up for the squirrel alone', () => {
    for (const folk of FOLK) expect(meet(folk, 'slide', 'rise', false)).toBe('across')
    expect(FOLK.filter((folk) => meet(folk, 'slide', 'rise', true) === 'across')).toEqual(['squirrel'])
  })

  it('gives no two walkers the same answers to the whole grid', () => {
    const answers = FOLK.map((folk) => KINDS.flatMap((kind) => (['rise', 'span'] as const).flatMap((fit) => [true, false].map((up) => meet(folk, kind, fit, up)))).join(','))
    expect(new Set(answers).size).toBe(FOLK.length)
  })
})

describe('ways through the tree', () => {
  it('finds no way to a piece no piece leads to, and a way of one step to a piece at the walker\'s feet', () => {
    // The squirrel's door is on the middle left limb (landing 3); place 4 rises from it.
    expect(wayTo(3, 4, 'squirrel', tree({ 4: 'ladder' }))).toEqual([{ place: 4, forward: true }])
    // Place 11 joins the middle right limb to the toadstool: nothing leads there from landing 3.
    expect(wayTo(3, 11, 'squirrel', tree({ 11: 'plank' }))).toBeNull()
  })

  it('takes the shortest way through whatever is there, whoever it suits', () => {
    const built = tree({ 0: 'ladder', 2: 'swing', 7: 'plank', 3: 'ladder', 8: 'plank' })
    // The beetle at the meadow going to try place 4 above the middle left limb: up 0, then 2, though a swing will stop him.
    expect(wayTo(0, 4, 'beetle', tree({ ...{ 0: 'ladder', 2: 'swing' }, 4: 'ladder' }))).toEqual([{ place: 0, forward: true }, { place: 2, forward: true }, { place: 4, forward: true }])
    expect(wayTo(3, 'home', 'beetle', built)!.length).toBe(2)
    expect(wayTo(0, 'home', 'beetle', built)).toEqual([])
  })

  it('ends a walk where the walker has to stay, with its errand kept, and where it arrives, with none', () => {
    // A ladder up from the meadow, then a plank on the next rise: the beetle stays on the low left limb.
    const ramp = tree({ 0: 'ladder', 2: 'plank', 4: 'ladder' })
    expect(walkEnd('beetle', 0, 4, ramp)).toEqual({ at: 1, errand: 4 })
    expect(walkEnd('squirrel', 0, 4, ramp)).toEqual({ at: 7, errand: 'none' })
    // With a ladder in place of the plank he gets there.
    expect(walkEnd('beetle', 0, 4, tree({ 0: 'ladder', 2: 'ladder', 4: 'ladder' }))).toEqual({ at: 7, errand: 'none' })
    // A walker with a bucket on its way waits at it.
    expect(walkEnd('owl', 0, 2, tree({ 0: 'bucket', 2: 'plank' }))).toEqual({ at: 0, errand: 2 })
  })

  it('goes home from anywhere a way leads, and stays put where none does', () => {
    const home = HOME.owl.landing
    expect(walkEnd('owl', home, 'home', tree({}))).toEqual({ at: home, errand: 'none' })
    expect(walkEnd('owl', 0, 'home', tree({}))).toEqual({ at: 0, errand: 'home' })
  })

  it('takes a way round a piece that stops the walker, however long, and the short way when no way round exists', () => {
    // The twins on the low left limb, their door on the low right one. Lanterns hang across the short way.
    const short = tree({ 7: 'lanterns' })
    expect(routeTo(1, 'home', 'mice', short)).toEqual([{ place: 7, forward: true }])
    expect(walkEnd('mice', 1, 'home', short)).toEqual({ at: 1, errand: 'home' })
    // A way round by the meadow: down a ladder on the left and up a ladder on the right.
    const round = tree({ 7: 'lanterns', 0: 'ladder', 1: 'ladder' })
    expect(routeTo(1, 'home', 'mice', round)).toEqual([{ place: 0, forward: false }, { place: 1, forward: true }])
    expect(walkEnd('mice', 1, 'home', round)).toEqual({ at: 2, errand: 'none' })
    // The squirrel is not stopped by lanterns, and takes the short way.
    expect(routeTo(1, 2, 'squirrel', tree({ 7: 'lanterns', 0: 'ladder', 1: 'ladder', 2: 'plank' }))!.length).toBe(1)
    // A way round that has another piece that stops them is no way round: they stay at the first piece of the short way.
    const swing = tree({ 7: 'lanterns', 0: 'ladder', 1: 'swing' })
    expect(routeTo(1, 'home', 'mice', swing)).toEqual([{ place: 7, forward: true }])
    expect(walkEnd('mice', 1, 'home', swing)).toEqual({ at: 1, errand: 'home' })
    // A bucket on the way round does not stop them: they go as far as the bucket and wait there.
    const bucket = tree({ 7: 'lanterns', 0: 'ladder', 1: 'bucket' })
    expect(routeTo(1, 'home', 'mice', bucket)).toEqual([{ place: 0, forward: false }, { place: 1, forward: true }])
    expect(walkEnd('mice', 1, 'home', bucket)).toEqual({ at: 0, errand: 'home' })
  })

  it('never turns back on a way it has started, from any landing, for any walker, whatever hangs', () => {
    const kinds = [...KINDS, null]
    let seed = 7
    const pick = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed }
    for (let layout = 0; layout < 300; layout++) {
      const built = tree(Object.fromEntries(PLACES.map((_, index) => [index, kinds[pick() % kinds.length]]).filter(([, kind]) => kind !== null)) as Record<number, Kind>)
      for (const folk of FOLK) for (let from = 0; from < 9; from++) {
        let at = from, left = routeTo(at, 'home', folk, built)?.length ?? -1
        for (let guard = 0; left > 0 && guard < 20; guard++) {
          const step = routeTo(at, 'home', folk, built)![0]
          if (meetStep(folk, step, built) === 'stay') break
          at = step.forward ? PLACES[step.place].to : PLACES[step.place].from
          const now = routeTo(at, 'home', folk, built)
          // Each step leaves a way that is one piece shorter.
          expect(now === null ? -1 : now.length, `${folk} from ${from} in layout ${layout}`).toBe(left - 1)
          left -= 1
        }
      }
    }
  })

  it('works out where a walker with more than one thing to do comes to rest', () => {
    // The squirrel is crossing a plank from his limb to the middle right one, and a ladder below his own limb is the newer piece: he comes back and goes down it.
    const two = tree({ 8: 'plank', 2: 'ladder' })
    expect(restOf('squirrel', 3, 8, 2, 'none', two)).toEqual({ at: 1, errand: 'none' })
    // The owl stood on her way home, went to try a plank, and takes her way home up again: she is stopped where she was.
    const owl = tree({ 8: 'plank', 3: 'ladder' })
    expect(restOf('owl', 4, 8, 'none', 'home', owl)).toEqual({ at: 3, errand: 'home' })
    // A newer piece given while an errand stops the walker: the beetle, stopped by a ramp, goes up the ladder beside it, and then comes back down to the ramp he still means to get up.
    const beetle = tree({ 0: 'plank', 1: 'ladder' })
    expect(restOf('beetle', 0, 0, 1, 'none', beetle)).toEqual({ at: 0, errand: 0 })
    expect(restOf('beetle', 0, 'none', 'none', 'none', beetle)).toEqual({ at: 0, errand: 'none' })
  })

  it('reaches every place from every door once every place has a piece', () => {
    const full = tree(Object.fromEntries(PLACES.map((_, index) => [index, 'plank' as Kind])))
    for (const folk of FOLK) for (let place = 0; place < PLACE_COUNT; place++) expect(wayTo(HOME[folk].landing, place, folk, full)).not.toBeNull()
  })
})
