import { describe, expect, it } from 'vitest'
import { CATCH_DEPTH, SPARE_ROOM, WAITING_CLEAR, companyOf, drop, elbowRoom, emptyArrangement, freeSpot, inCompany, isSound, lean, lowEnd, placeOf, putInSand, putOnEnd, standsAt, tap, weightOn, type Arrangement } from './arrangement'
import { KINDS, layout, rideOf } from './rides'
import { ENDS, FRIEND_IDS, FRIENDS, PLANK, SAND, WAITING_PLACE, homeOn, inTheWay, standablePlaces, type FriendId } from './world'

const on = (left: FriendId[], right: FriendId[]): Arrangement => {
  let a = emptyArrangement()
  for (const id of left) a = putOnEnd(a, id, 'left')
  for (const id of right) a = putOnEnd(a, id, 'right')
  return a
}

describe('who is where', () => {
  it('the heavier end is down, the lighter up, and the same weight is level', () => {
    expect(lean(on(['pim'], []))).toBe(-1)
    expect(lean(on(['pim'], ['mog']))).toBe(1)
    expect(lean(on(['bo'], ['pim']))).toBe(-1)
    expect(lean(on(['mog'], ['dot']))).toBe(0)
    expect(lean(on([], []))).toBe(0)
    expect(lowEnd(on(['bo'], ['mog']))).toBe('left')
    expect(lowEnd(on(['mog'], ['dot']))).toBe(null)
  })

  it('two small ones lift the big one, and the big one with the smallest balances the two of one size', () => {
    expect(lean(on(['bo'], ['pim', 'mog']))).toBe(1)
    expect(lean(on(['bo'], ['mog', 'dot']))).toBe(1)
    expect(lean(on(['bo'], ['pim']))).toBe(-1)
    expect(lean(on(['bo'], ['mog']))).toBe(-1)
    expect(lean(on(['bo', 'pim'], ['mog', 'dot']))).toBe(0)
    expect(weightOn(on(['bo', 'pim'], []), 'left')).toBe(6)
  })

  it('only the totals decide: the order of a stack changes nothing', () => {
    expect(lean(on(['pim', 'bo'], ['mog', 'dot']))).toBe(lean(on(['bo', 'pim'], ['dot', 'mog'])))
  })

  it('size is weight: a bigger body is never the lighter one, and one size is one weight', () => {
    const bySize = [...FRIEND_IDS].sort((a, b) => FRIENDS[a].radius - FRIENDS[b].radius)
    for (let i = 1; i < bySize.length; i++) expect(FRIENDS[bySize[i]].weight).toBeGreaterThanOrEqual(FRIENDS[bySize[i - 1]].weight)
    expect(FRIENDS.mog.radius).toBe(FRIENDS.dot.radius)
    expect(FRIENDS.mog.weight).toBe(FRIENDS.dot.weight)
    expect(FRIENDS.bo.radius).toBeGreaterThan(FRIENDS.mog.radius * 1.25)
    expect(FRIENDS.mog.radius).toBeGreaterThan(FRIENDS.pim.radius * 1.25)
  })
})

describe('a tap', () => {
  it('sends a friend in the sand onto the end on its own side', () => {
    const start = putInSand(emptyArrangement(), 'mog', homeOn('mog', 'left'))
    expect(placeOf(tap(start, 'mog'), 'mog')).toEqual({ at: 'end', end: 'left', level: 0 })
    expect(placeOf(tap(start, 'bo'), 'bo')).toEqual({ at: 'end', end: 'right', level: 0 })
  })

  it('lands a friend on top of whoever already sits there', () => {
    const a = tap(tap(emptyArrangement(), 'bo'), 'mog')
    expect(a.right).toEqual(['bo', 'mog'])
  })

  it('takes a friend off the plank into the sand on that side, and those above come down a place', () => {
    const a = tap(on([], ['bo', 'mog', 'pim']), 'bo')
    expect(a.right).toEqual(['mog', 'pim'])
    const place = placeOf(a, 'bo')
    expect(place.at).toBe('sand')
    if (place.at === 'sand') expect(place.spot.x).toBeGreaterThan(0)
  })

  it('a second tap undoes the first', () => {
    for (const id of FRIEND_IDS) {
      const start = on(['pim'], ['bo'])
      const twice = tap(tap(start, id), id)
      expect(placeOf(twice, id).at).toBe(placeOf(start, id).at)
      expect(lean(twice)).toBe(lean(start))
    }
  })

  it('does nothing here to the friend at the waiting place', () => {
    const a: Arrangement = { ...putInSand(emptyArrangement(), 'mog', { x: 1, z: 2 }), waiting: 'mog' }
    delete a.sand.mog
    expect(tap(a, 'mog')).toBe(a)
  })

  it('never has a dead end: from any arrangement every friend can be tapped, and the result is sound', () => {
    let seen = 0
    const walk = (a: Arrangement, depth: number) => {
      expect(isSound(a)).toBe(true)
      seen += 1
      if (depth === 0) return
      for (const id of FRIEND_IDS) walk(tap(a, id), depth - 1)
    }
    walk(on(['pim'], []), 5)
    expect(seen).toBeGreaterThan(1000)
  })
})

describe('a friend let go', () => {
  it('over an end lands on that end', () => {
    const { arrangement, slid } = drop(on(['pim'], []), 'bo', 2.2, -0.4)
    expect(arrangement.right).toEqual(['bo'])
    expect(slid).toBe(false)
  })

  it('over the sand right beside the plank is over sand: the plank takes only what hangs over the board', () => {
    const a = putOnEnd(emptyArrangement(), 'bo', 'left')
    // Over the board's line and a little past its edge: the plank.
    for (const z of [PLANK.z, PLANK.z + PLANK.halfWidth, PLANK.z - PLANK.halfWidth - 0.2]) expect(placeOf(drop(a, 'pim', PLANK.seat, z).arrangement, 'pim').at, `${z}`).toBe('end')
    // A step in front of it or behind it: the sand, at the nearest free place.
    for (const z of [PLANK.z + 1.0, PLANK.z + 1.4, PLANK.z - 1.2]) {
      const landed = drop(a, 'pim', PLANK.seat, z)
      expect(placeOf(landed.arrangement, 'pim').at, `${z}`).toBe('sand')
      expect(isSound(landed.arrangement), `${z}`).toBe(true)
    }
    expect(CATCH_DEPTH).toBeLessThan(1)
    // And past the board's tip: over the board and a little past its edge is the end; further out is sand.
    expect(placeOf(drop(a, 'pim', PLANK.halfLength + 0.2, PLANK.z).arrangement, 'pim').at).toBe('end')
    for (const x of [PLANK.halfLength + 0.5, 4.75, -4.75]) {
      const landed = drop(a, 'pim', x, PLANK.z)
      expect(placeOf(landed.arrangement, 'pim').at, `${x}`).toBe('sand')
      const at = standsAt(landed.arrangement, 'pim')
      expect(Math.hypot(at.x - x, at.z - PLANK.z), `${x}`).toBeLessThan(1.6)
    }
  })

  it('anywhere it may not stand, it stands at the nearest place it may, whichever way that lies', () => {
    const a = putOnEnd(emptyArrangement(), 'pim', 'left')
    // Behind the plank, within reach of the right seat: the nearest free place is close by, not out in front.
    for (const spot of [{ x: 2, z: -2.6 }, { x: 3.4, z: -2.7 }, { x: 0.3, z: -1.9 }, { x: -2.2, z: 0.2 }]) {
      const at = standsAt(putInSand(a, 'mog', spot), 'mog')
      const apart = Math.hypot(at.x - spot.x, at.z - spot.z)
      // No place it may stand is nearer.
      for (const other of standablePlaces(FRIENDS.mog.radius)) {
        if (Math.hypot(other.x - WAITING_PLACE.x, other.z - WAITING_PLACE.z) < FRIENDS.mog.radius + WAITING_CLEAR) continue
        // Nor where another friend stands, with elbow room.
        if ((['dot', 'bo'] as const).some((id) => Math.hypot(other.x - a.sand[id]!.x, other.z - a.sand[id]!.z) < elbowRoom('mog', id) + SPARE_ROOM)) continue
        expect(Math.hypot(other.x - spot.x, other.z - spot.z), `${spot.x}, ${spot.z}`).toBeGreaterThanOrEqual(apart - 1e-6)
      }
      expect(inTheWay(at.x, at.z, FRIENDS.mog.radius)).toBe(false)
    }
    // Behind the plank, where it was let go, it stays behind the plank.
    const behind = standsAt(putInSand(a, 'mog', { x: 2, z: -2.6 }), 'mog')
    expect(Math.hypot(behind.x - 2, behind.z + 2.6)).toBeLessThan(1)
    expect(behind.z).toBeLessThan(PLANK.z)
  })

  it('room to spare is never bought with a step away: a friend let go a hand\'s width from where it stood stays there', () => {
    // Every opening layout, every friend standing in the sand, let go a little to each side of where it stood.
    let tried = 0
    for (const base of [emptyArrangement(), putOnEnd(emptyArrangement(), 'pim', 'left'), putOnEnd(putOnEnd(emptyArrangement(), 'pim', 'right'), 'mog', 'left')]) {
      for (const id of FRIEND_IDS) {
        const here = base.sand[id]
        if (!here) continue
        for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2], [0.15, 0.15]]) {
          const spot = { x: here.x + dx, z: here.z + dz }
          const at = standsAt(putInSand(base, id, spot), id)
          expect(Math.hypot(at.x - spot.x, at.z - spot.z), `${id} ${dx} ${dz}`).toBeLessThan(0.75)
          tried += 1
        }
      }
    }
    expect(tried).toBeGreaterThan(40)
  })

  it('over the middle slides to the low end, and on a level plank to the nearer end', () => {
    expect(drop(on(['pim'], []), 'mog', 0.4, PLANK.z).arrangement.left).toEqual(['pim', 'mog'])
    expect(drop(on(['pim'], []), 'mog', 0.4, PLANK.z).slid).toBe(true)
    expect(drop(on([], []), 'mog', 0.4, PLANK.z).arrangement.right).toEqual(['mog'])
    expect(drop(on(['mog'], ['dot']), 'pim', -0.4, PLANK.z).arrangement.left).toEqual(['mog', 'pim'])
  })

  it('a friend lifted off the low end and let go over the middle slides to what is then the low end', () => {
    expect(drop(on(['bo'], ['pim']), 'bo', 0.2, PLANK.z).arrangement.right).toEqual(['pim', 'bo'])
  })

  it('anywhere else stands in the sand, clear of the plank, the rim, the waiting place and the others', () => {
    const spots = [[0, 0], [9, 9], [-9, -9], [0, 2.3], [3, -1], [4.65, 2.3], [1.8, 2.49], [-5, 0], [4.7, -0.5], [3, 0.4]]
    for (const [x, z] of spots) {
      for (const id of FRIEND_IDS) {
        const a = drop(on(['pim'], []), id, x, z).arrangement
        expect(isSound(a)).toBe(true)
        const place = placeOf(a, id)
        if (place.at !== 'sand') continue
        const r = FRIENDS[id].radius
        expect(Math.abs(place.spot.x)).toBeLessThanOrEqual(SAND.maxX)
        expect(place.spot.z).toBeLessThanOrEqual(SAND.maxZ)
        // Clear of the board, and out of reach of whoever may sit on a seat.
        expect(inTheWay(place.spot.x, place.spot.z, r)).toBe(false)
        expect(Math.hypot(place.spot.x - WAITING_PLACE.x, place.spot.z - WAITING_PLACE.z)).toBeGreaterThanOrEqual(r + WAITING_CLEAR)
        for (const other of FRIEND_IDS) {
          const there = placeOf(a, other)
          if (other === id || there.at !== 'sand') continue
          expect(Math.hypot(place.spot.x - there.spot.x, place.spot.z - there.spot.z), `${id} on ${other} at ${x},${z}`).toBeGreaterThanOrEqual(r + FRIENDS[other].radius)
        }
      }
    }
  })

  it('the default places themselves are free, on both sides: Pim and Mog share the inner one, so each is tried with the other away', () => {
    for (const end of ['left', 'right'] as const) for (const inner of ['pim', 'mog'] as const) {
      const other = inner === 'pim' ? 'mog' : 'pim'
      const standing = FRIEND_IDS.filter((id) => id !== other)
      let a = putOnEnd(on([], []), other, end)
      for (const id of standing) a = putInSand(a, id, homeOn(id, end))
      for (const id of standing) expect(a.sand[id]).toEqual(homeOn(id, end))
      for (const id of standing) expect(freeSpot({ ...a, sand: { ...a.sand, [id]: undefined } }, id, homeOn(id, end))).toEqual(homeOn(id, end))
    }
  })
})

describe('Dot in company', () => {
  it('is alone at the rim, whoever sits on the plank or stands at a default place: its place is further than a body\'s width from either end', () => {
    expect(inCompany(emptyArrangement())).toBe(false)
    expect(inCompany(on(['pim'], []))).toBe(false)
    for (const end of ENDS) for (const id of ['pim', 'mog', 'bo'] as const) expect(inCompany(putOnEnd(emptyArrangement(), id, end)), `${id} ${end}`).toBe(false)
    expect(inCompany(on(['pim'], ['bo', 'mog']))).toBe(false)
    // In every ride as it opens, both ways round.
    for (const kind of KINDS) for (const turn of [0, 1]) expect(inCompany(layout(rideOf(kind, turn))), `${kind} ${turn}`).toBe(false)
    // And alone on the plank with nobody else on it.
    expect(inCompany(on([], ['dot']))).toBe(false)
  })

  it('is in company on the plank with anyone else on it, on either end', () => {
    expect(inCompany(on(['pim'], ['dot']))).toBe(true)
    expect(inCompany(on([], ['bo', 'dot']))).toBe(true)
  })

  it('is in company in the sand within a body\'s width of a friend, whoever walked to whom, and whether that friend stands in the sand or sits on an end', () => {
    const mog = homeOn('mog', 'right')
    const beside = putInSand(emptyArrangement(), 'dot', { x: mog.x + 1.9, z: mog.z })
    expect(companyOf(beside)).toContain('mog')
    const visited = putInSand(emptyArrangement(), 'pim', { x: homeOn('dot', 'right').x - 1.9, z: homeOn('dot', 'right').z })
    expect(companyOf(visited)).toEqual(['pim'])
    // Set down in the sand just in front of the end Bo sits on: Bo is its company, though he is on the plank.
    const riding = on(['bo'], ['pim'])
    const by = putInSand(riding, 'dot', { x: -PLANK.seat, z: 2.6 })
    expect(Math.hypot(by.sand.dot!.x + PLANK.seat, by.sand.dot!.z - 2.6)).toBeLessThan(0.1)
    expect(companyOf(by)).toEqual(['bo'])
    // A body's width is the gap between the two: a little further off, Dot is alone again.
    const reach = FRIENDS.dot.radius * 3 + FRIENDS.bo.radius
    const off = putInSand(riding, 'dot', { x: -PLANK.seat, z: reach + 0.3 })
    expect(Math.hypot(off.sand.dot!.x + PLANK.seat, off.sand.dot!.z - PLANK.z)).toBeGreaterThan(reach)
    expect(companyOf(off)).toEqual([])
  })

  it('there is room beside Dot at its place by the rim for a friend of any size, and one set down there is company', () => {
    const dot = homeOn('dot', 'right')
    for (const id of ['pim', 'mog', 'bo'] as const) {
      const spot = { x: dot.x - FRIENDS.dot.radius - FRIENDS[id].radius - 0.5, z: dot.z }
      const a = putInSand(emptyArrangement(), id, spot)
      const at = a.sand[id]!
      // It stands about where it was set down: no more than a hand's width off, and never out in front of the plank.
      expect(Math.hypot(at.x - spot.x, at.z - spot.z), id).toBeLessThan(0.6)
      expect(at.z, id).toBeLessThan(PLANK.z)
      expect(companyOf(a), id).toEqual([id])
    }
  })
})
