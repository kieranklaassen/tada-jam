import { describe, expect, it } from 'vitest'
import { isSound, lean, placeOf, tap, type Arrangement } from './arrangement'
import { FIRST_VISIT, LADDER } from './config'
import { KINDS, MIXED, TURNS, askerEnd, consequence, fewestMoves, isMove, judge, kindAt, ladderIsWhole, layout, rideOf, wantMet, type Kind, type Ride } from './rides'
import { deserialize, finishCycle, firstPosition, freshState } from './state'
import { FRIEND_IDS, HOME, type FriendId } from './world'

/** The fewest taps that take the asker there, tapping only the friends given: a search over every order of taps. */
function fewestTaps(ride: Ride, who: readonly FriendId[], limit = 6): number {
  let level: Arrangement[] = [layout(ride)]
  for (let taps = 1; taps <= limit; taps++) {
    const next: Arrangement[] = []
    for (const a of level) for (const id of who) {
      const after = tap(a, id)
      if (wantMet(ride, after)) return taps
      next.push(after)
    }
    level = next
  }
  return Infinity
}

const everyRide = (): Ride[] => KINDS.flatMap((kind) => [rideOf(kind, 0), rideOf(kind, 1)])

describe('the designed order', () => {
  it('the ladder in config.ts is the five kinds and then the mixed place, in order', () => {
    expect(ladderIsWhole()).toBe(true)
    expect(LADDER).toEqual(['little-asks', 'middle-asks', 'big-asks', 'near-side', 'high-asks', 'any-asks'])
  })

  it('no position id names a grade, a groep, a level, a fase or an age', () => {
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|level|fase|phase|kinder|peuter|preschool|year|age|\d/i)
  })

  it('a first visit starts at the first position for no age or under four, one step on from four, and a saved position wins', () => {
    expect(firstPosition(null)).toBe('little-asks')
    expect(firstPosition(1)).toBe('little-asks')
    expect(firstPosition(2)).toBe('little-asks')
    expect(firstPosition(3)).toBe('little-asks')
    expect(firstPosition(4)).toBe('middle-asks')
    expect(firstPosition(5)).toBe('middle-asks')
    expect(firstPosition(11)).toBe('middle-asks')
    expect(FIRST_VISIT.every((row) => LADDER.includes(row.position))).toBe(true)
    expect(deserialize({ v: 1, position: 'big-asks', finished: false }, 2).position).toBe('big-asks')
  })

  it('the position moves one step after a ride that went well or badly, and stays after a mixed one', () => {
    const at = (position: string) => ({ ...freshState(null), position })
    expect(finishCycle(at('little-asks'), 'well').position).toBe('middle-asks')
    expect(finishCycle(at('big-asks'), 'badly').position).toBe('middle-asks')
    expect(finishCycle(at('big-asks'), 'mixed').position).toBe('big-asks')
    expect(finishCycle(at('little-asks'), 'badly').position).toBe('little-asks')
    expect(finishCycle(at('any-asks'), 'well').position).toBe('any-asks')
  })

  it('the mixed place meets every kind both ways round before it repeats', () => {
    const met = new Set<string>()
    for (let turn = 0; turn < TURNS; turn++) {
      const ride = rideOf(kindAt(MIXED, turn), turn)
      met.add(`${ride.kind} ${ride.mirrored}`)
    }
    expect(met.size).toBe(KINDS.length * 2)
    expect(kindAt(MIXED, TURNS)).toBe(kindAt(MIXED, 0))
    expect(kindAt('big-asks', 7)).toBe('big-asks')
    expect(kindAt('something from a newer build', 3)).toBe('little-asks')
  })
})

describe('each ride as it opens', () => {
  it('is a sound arrangement with the asker on its end, everyone else at a default place, and the want not yet met', () => {
    for (const ride of everyRide()) {
      const a = layout(ride)
      expect(isSound(a)).toBe(true)
      expect(placeOf(a, ride.asker)).toMatchObject({ at: 'end', end: askerEnd(ride) })
      expect(wantMet(ride, a)).toBe(false)
      for (const id of FRIEND_IDS) {
        const place = placeOf(a, id)
        if (place.at === 'sand') expect(Math.abs(place.spot.x)).toBe(HOME[id].x)
      }
      // Dot stands apart at the rim, at the far rim of the tray.
      const dot = placeOf(a, 'dot')
      expect(dot.at).toBe('sand')
      if (dot.at === 'sand') expect(dot.spot.z).toBe(HOME.dot.z)
    }
  })

  it('mirrored is the same ride the other way round', () => {
    for (const kind of KINDS) {
      const a = layout(rideOf(kind, 0)), b = layout(rideOf(kind, 1))
      expect(b.left).toEqual(a.right)
      expect(b.right).toEqual(a.left)
      expect(lean(b)).toBe(-lean(a) as -1 | 0 | 1)
      for (const id of FRIEND_IDS) if (a.sand[id]) expect(b.sand[id]).toEqual({ x: -a.sand[id]!.x, z: a.sand[id]!.z })
    }
  })

  it('takes exactly the fewest moves the plan says, by taps alone', () => {
    for (const ride of everyRide()) expect(fewestTaps(ride, FRIEND_IDS), ride.kind).toBe(fewestMoves(ride.kind))
  })

  it('never needs Dot: every kind has a way through by taps that leaves Dot at the rim', () => {
    const withoutDot = FRIEND_IDS.filter((id) => id !== 'dot')
    for (const ride of everyRide()) expect(fewestTaps(ride, withoutDot), ride.kind).toBe(fewestMoves(ride.kind))
  })

  it('bringing Dot in always changes the weights', () => {
    for (const ride of everyRide()) {
      const before = layout(ride), after = tap(before, 'dot')
      expect(after.left.length + after.right.length).toBe(before.left.length + before.right.length + 1)
    }
  })

  // The Guess answer of the sheet, position by position.
  it('at little-asks and high-asks any one tap on a friend other than the asker resolves the ride', () => {
    for (const kind of ['little-asks', 'high-asks'] as Kind[]) for (const turn of [0, 1]) {
      const ride = rideOf(kind, turn)
      for (const id of FRIEND_IDS) if (id !== ride.asker) expect(wantMet(ride, tap(layout(ride), id)), `${kind} ${id}`).toBe(true)
    }
  })

  it('at middle-asks and big-asks nobody stands on the asker’s side, and tapping every far-side friend resolves the ride inside the margin of a ride that went well', () => {
    for (const kind of ['middle-asks', 'big-asks'] as Kind[]) for (const turn of [0, 1]) {
      const ride = rideOf(kind, turn), others = FRIEND_IDS.filter((id) => id !== ride.asker)
      const start = layout(ride)
      for (const id of others) {
        const place = placeOf(start, id)
        expect(place.at === 'sand' && Math.sign(place.spot.x) === (askerEnd(ride) === 'left' ? 1 : -1), `${kind} ${id}`).toBe(true)
      }
      // In every order of the three taps the asker is up by the last one at the latest.
      for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
        let a = start, taps = 0
        for (const index of order) {
          a = tap(a, others[index])
          taps += 1
          if (wantMet(ride, a)) break
        }
        expect(wantMet(ride, a), `${kind} ${order}`).toBe(true)
        expect(judge(kind, taps)).toBe('well')
      }
      const all = others.reduce((a, id) => tap(a, id), start)
      expect(lean(all)).toBe(askerEnd(ride) === 'left' ? 1 : -1)
    }
  })

  it('at middle-asks and big-asks tapping the far-side friends one after another resolves it by the second tap at the latest', () => {
    for (const kind of ['middle-asks', 'big-asks'] as Kind[]) {
      const ride = rideOf(kind, 0), others = FRIEND_IDS.filter((id) => id !== ride.asker), start = layout(ride)
      for (const first of others) for (const second of others) {
        if (first === second) continue
        const one = tap(start, first)
        expect(wantMet(ride, one) || wantMet(ride, tap(one, second)), `${kind} ${first} ${second}`).toBe(true)
      }
    }
  })

  it('the first tap shows too light or level, except Bo at middle-asks, who lifts Mog at once', () => {
    const ride = rideOf('middle-asks', 0), start = layout(ride)
    expect(consequence(ride, start, tap(start, 'pim')).what).toBe('too-light')
    expect(consequence(ride, start, tap(start, 'dot')).what).toBe('level')
    expect(consequence(ride, start, tap(start, 'bo')).what).toBe('there')
    const bigRide = rideOf('big-asks', 0), open = layout(bigRide)
    for (const id of ['pim', 'mog', 'dot'] as const) expect(consequence(bigRide, open, tap(open, id)).what).toBe('too-light')
  })

  it('at near-side, while Bo sits on Pim she cannot go up: Mog and Dot together on the far end only float the plank level', () => {
    const near = rideOf('near-side', 0)
    const both = tap(tap(tap(layout(near), 'bo'), 'mog'), 'dot')
    expect(lean(both)).toBe(0)
    expect(wantMet(near, both)).toBe(false)
    expect(wantMet(near, tap(both, 'bo'))).toBe(true)
  })

  it('at middle-asks and big-asks no first tap on the smallest lifts', () => {
    const middle = rideOf('middle-asks', 0)
    expect(wantMet(middle, tap(layout(middle), 'pim'))).toBe(false)
    expect(lean(tap(layout(middle), 'dot'))).toBe(0)
    const big = rideOf('big-asks', 0)
    for (const id of ['pim', 'mog', 'dot'] as const) expect(wantMet(big, tap(layout(big), id))).toBe(false)
  })

  it('only at near-side does a tap make things worse: Bo lands on the asker and that end stays down until he is tapped off again', () => {
    const near = rideOf('near-side', 0)
    const squashed = tap(layout(near), 'bo')
    expect(squashed.left).toEqual(['pim', 'bo'])
    // With Bo on her head no friend opposite, and not both of them, takes her up.
    expect(wantMet(near, tap(squashed, 'mog'))).toBe(false)
    expect(wantMet(near, tap(squashed, 'dot'))).toBe(false)
    expect(wantMet(near, tap(tap(squashed, 'mog'), 'dot'))).toBe(false)
    // Tapped off again, one friend opposite is enough.
    expect(wantMet(near, tap(tap(tap(squashed, 'mog'), 'bo'), 'bo'))).toBe(false)
    expect(wantMet(near, tap(tap(squashed, 'mog'), 'bo'))).toBe(true)
    // And in the other kinds no first tap leaves the asker's end heavier than it was.
    for (const kind of KINDS) {
      if (kind === 'near-side') continue
      const ride = rideOf(kind, 0), start = layout(ride)
      if (ride.asks === 'down') continue
      for (const id of FRIEND_IDS) if (id !== ride.asker) expect(tap(start, id)[askerEnd(ride)], `${kind} ${id}`).toEqual(start[askerEnd(ride)])
    }
  })

  it('at high-asks Bo sits opposite Pim and does not doze: he is not alone on the plank', () => {
    const ride = rideOf('high-asks', 0), start = layout(ride)
    expect(start.left).toEqual(['pim'])
    expect(start.right).toEqual(['bo'])
    expect(start.left.length + start.right.length).toBe(2)
    expect(wantMet(ride, tap(start, 'bo'))).toBe(true)
    expect(wantMet(ride, tap(start, 'mog'))).toBe(true)
  })
})

describe('how a ride is judged', () => {
  it('goes well within two moves more than the fewest, mixed within five, badly beyond', () => {
    expect(judge('little-asks', 1)).toBe('well')
    expect(judge('little-asks', 3)).toBe('well')
    expect(judge('little-asks', 4)).toBe('mixed')
    expect(judge('little-asks', 6)).toBe('mixed')
    expect(judge('little-asks', 7)).toBe('badly')
    expect(judge('big-asks', 4)).toBe('well')
    expect(judge('big-asks', 8)).toBe('badly')
  })

  it('counts a friend arriving on an end or leaving one, and not a walk from sand to sand', () => {
    const start = layout(rideOf('little-asks', 0))
    expect(isMove(start, tap(start, 'mog'))).toBe(true)
    expect(isMove(tap(start, 'mog'), start)).toBe(true)
    expect(isMove(start, { ...start, sand: { ...start.sand, mog: { x: 2, z: 2.6 } } })).toBe(false)
  })
})

describe('what a move does, as the world shows it', () => {
  const middle = rideOf('middle-asks', 0)

  it('too light: Pim on the far end leaves Mog down, and it shows on the end that stayed up', () => {
    const before = layout(middle), after = tap(before, 'pim')
    expect(consequence(middle, before, after)).toEqual({ what: 'too-light', where: 'right' })
  })

  it('the same weight floats the plank', () => {
    const before = layout(middle), after = tap(before, 'dot')
    expect(consequence(middle, before, after)).toEqual({ what: 'level', where: null })
  })

  it('the wrong side: Bo on Pim’s own end, and it shows on that end', () => {
    const near = rideOf('near-side', 0)
    const before = layout(near), after = tap(before, 'bo')
    expect(consequence(near, before, after)).toEqual({ what: 'wrong-side', where: 'left' })
  })

  it('no move is ever "too much": no ride asks for level, so a plank that turns the asker’s way is there', () => {
    for (const ride of everyRide()) for (const first of FRIEND_IDS) for (const second of FRIEND_IDS) {
      const start = layout(ride), mid = tap(start, first), end = tap(mid, second)
      for (const [before, after] of [[start, mid], [mid, end]] as const) expect(['there', 'level', 'wrong-side', 'too-light', 'none']).toContain(consequence(ride, before, after).what)
    }
  })

  it('there: the asker is carried up, and the state is exactly the taps the child made', () => {
    const before = layout(middle), after = tap(before, 'bo')
    expect(consequence(middle, before, after)).toEqual({ what: 'there', where: 'left' })
    expect(after.left).toEqual(['mog'])
    expect(after.right).toEqual(['bo'])
  })

  it('a move never moves anyone but the friend the child moved', () => {
    for (const ride of everyRide()) for (const id of FRIEND_IDS) {
      const before = layout(ride), after = tap(before, id)
      for (const other of FRIEND_IDS) if (other !== id) expect(placeOf(after, other).at).toBe(placeOf(before, other).at)
    }
  })
})
