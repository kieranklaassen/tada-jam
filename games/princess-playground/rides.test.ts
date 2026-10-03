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

  it('at the first position nothing can go wrong: any friend tapped sends Pim up', () => {
    for (const turn of [0, 1]) {
      const ride = rideOf('little-asks', turn)
      for (const id of FRIEND_IDS) if (id !== ride.asker) expect(wantMet(ride, tap(layout(ride), id)), id).toBe(true)
    }
  })

  it('after the first position, tapping everyone does not do it', () => {
    for (const kind of ['middle-asks', 'near-side'] as Kind[]) {
      const ride = rideOf(kind, 0)
      const some = FRIEND_IDS.filter((id) => id !== ride.asker).some((id) => !wantMet(ride, tap(layout(ride), id)))
      expect(some, kind).toBe(true)
    }
    // Nobody lifts Bo alone.
    const big = rideOf('big-asks', 0)
    for (const id of ['pim', 'mog', 'dot'] as const) expect(wantMet(big, tap(layout(big), id))).toBe(false)
    // Bo tapped at near-side lands on Pim, and then one friend opposite is not enough.
    const near = rideOf('near-side', 0)
    const squashed = tap(layout(near), 'bo')
    expect(squashed.left).toEqual(['pim', 'bo'])
    expect(wantMet(near, tap(squashed, 'mog'))).toBe(false)
  })

  it('at high-asks taking Bo off works, and so does adding to her end', () => {
    const ride = rideOf('high-asks', 0)
    expect(wantMet(ride, tap(layout(ride), 'bo'))).toBe(true)
    expect(wantMet(ride, tap(layout(ride), 'mog'))).toBe(true)
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
