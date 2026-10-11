import { describe, expect, it } from 'vitest'
import { CAT_FOOT, CAT_HALF, CAT_TALL, GULL_AFLOAT, GULL_HALF, GULL_LONG, GULL_RING_R, GULL_ROUND, RIM_SEAT, SEATS, catSeat, covers, gullSpot, landSpot, munchSpot, resting, seaSpot, seatFree, settle } from './place'
import { makeRng } from './rng'
import { BOAT_LANE_R, CAT_SEATS, FOOT, GAP, KINDS, LAND_R, LAND_Y, RIM_IN, SEA_FOOT, STAND, SEA_LANE_R, toWorld, type Kind, type Toy } from './toys'

const tray = (kind: Kind): Toy => ({ kind, where: 'tray', x: 0, z: 0 })
const none = (): Toy[] => KINDS.map(tray)
const put = (toys: Toy[], kind: Kind, where: 'land' | 'sea' | 'boat', x: number, z: number): Toy[] => toys.map((toy) => (toy.kind === kind ? { kind, where, x, z } : toy))

describe('where a toy comes to stand', () => {
  it('stands where it was aimed on bare land', () => {
    expect(settle('house', 1, -0.5, none())).toEqual({ where: 'land', x: 1, z: -0.5 })
  })

  it('aimed at a toy, lands beside it and never in it', () => {
    const toys = put(none(), 'house', 'land', 0, 0)
    const spot = settle('tree', 0.1, 0, toys)
    expect(spot.where).toBe('land')
    expect(Math.hypot(spot.x, spot.z)).toBeGreaterThanOrEqual(FOOT.tree + FOOT.house + GAP - 1e-6)
    // And no further off than it has to be.
    expect(Math.hypot(spot.x, spot.z)).toBeLessThan(FOOT.tree + FOOT.house + GAP + 0.3)
  })

  it('keeps a toy aimed at the shore on the land, whole', () => {
    const spot = settle('lighthouse', 3, 0, none())
    expect(spot.where).toBe('land')
    expect(Math.hypot(spot.x, spot.z)).toBeLessThanOrEqual(LAND_R - FOOT.lighthouse)
  })

  it('aimed past the shore, comes down on the ring of the sea at that bearing', () => {
    const spot = settle('house', 0, 4.6, none())
    expect(spot.where).toBe('sea')
    expect(Math.hypot(spot.x, spot.z)).toBeCloseTo(SEA_LANE_R, 1)
    expect(spot.z).toBeGreaterThan(4)
  })

  it('gives the boat the outer ring to itself', () => {
    const spot = settle('boat', 5, 0, none())
    expect(spot.where).toBe('sea')
    expect(Math.hypot(spot.x, spot.z)).toBeCloseTo(BOAT_LANE_R, 1)
  })

  it('stands the sheep in a boat it is set down on, on land or afloat, and only the sheep', () => {
    const afloat = put(none(), 'boat', 'sea', BOAT_LANE_R, 0)
    expect(settle('sheep', BOAT_LANE_R - 0.3, 0.2, afloat).where).toBe('boat')
    expect(settle('house', BOAT_LANE_R - 0.3, 0.2, afloat).where).toBe('sea')
    const ashore = put(none(), 'boat', 'land', 1, 1)
    expect(settle('sheep', 1.2, 1.1, ashore).where).toBe('boat')
    expect(settle('sheep', 1.2, 1.1, none()).where).toBe('land')
  })

  it('sends a toy to the sea when the land has no room left for it', () => {
    // Land packed with phantom toys of every kind but the house, shoulder to shoulder, is not possible with four,
    // so the land is filled by hand: no free spot is the same as null from landSpot.
    const toys = none()
    expect(landSpot('house', 0, 0, toys)).not.toBeNull()
    const crowd: Toy[] = []
    for (let i = 0; i < 4; i++) crowd.push({ kind: KINDS[i], where: 'land', x: Math.cos(i * 1.57) * 1.3, z: Math.sin(i * 1.57) * 1.3 })
    crowd.push(tray('house'))
    const spot = settle('house', 0, 0, crowd)
    for (const other of crowd) if (other.where === 'land' && spot.where === 'land') expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(FOOT.house + FOOT[other.kind] + GAP - 1e-6)
  })

  it('never stands two toys in each other, whatever order and aim they come in', () => {
    const rng = makeRng(7)
    for (let round = 0; round < 300; round++) {
      let toys = none()
      const order = [...KINDS].sort(() => rng.next() - 0.5)
      for (const kind of order) {
        const a = rng.next() * Math.PI * 2, r = rng.next() * 6
        const spot = settle(kind, Math.cos(a) * r, Math.sin(a) * r, toys)
        if (spot.where === 'boat') continue
        toys = put(toys, kind, spot.where, spot.x, spot.z)
      }
      for (const a of toys) for (const b of toys) {
        if (a.kind >= b.kind || a.where === 'tray' || a.where !== b.where) continue
        const apart = Math.hypot(a.x - b.x, a.z - b.z)
        if (a.where === 'land') expect(apart).toBeGreaterThanOrEqual(FOOT[a.kind] + FOOT[b.kind] + GAP - 0.011)
        else if (a.kind !== 'boat' && b.kind !== 'boat') expect(apart).toBeGreaterThanOrEqual(SEA_FOOT[a.kind] + SEA_FOOT[b.kind] + GAP - 0.011)
      }
      for (const toy of toys) {
        if (toy.where === 'land') expect(Math.hypot(toy.x, toy.z)).toBeLessThanOrEqual(LAND_R - STAND[toy.kind] - 0.05 + 0.011)
        if (toy.where === 'sea') expect(Math.hypot(toy.x, toy.z)).toBeCloseTo(toy.kind === 'boat' ? BOAT_LANE_R : SEA_LANE_R, 1)
      }
    }
  })

  it('finds the sea ring a place for every toy at one bearing', () => {
    let toys = none()
    for (const kind of ['house', 'tree', 'sheep', 'lighthouse'] as const) {
      const spot = seaSpot(kind, 0, 4.2, toys)
      toys = put(toys, kind, 'sea', spot.x, spot.z)
    }
    for (const a of toys) for (const b of toys) {
      if (a.kind < b.kind && a.where === 'sea' && b.where === 'sea') expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(SEA_FOOT[a.kind] + SEA_FOOT[b.kind] + GAP - 0.011)
    }
  })
})

describe('the sheep at the tree', () => {
  it('stands right beside the tree, on the side it came from', () => {
    const toys = put(put(none(), 'tree', 'land', 0, 0), 'sheep', 'land', 2, 0)
    const spot = munchSpot(toys)!
    expect(Math.hypot(spot.x, spot.z)).toBeCloseTo(FOOT.sheep + FOOT.tree + GAP + 0.02, 1)
    expect(spot.x).toBeGreaterThan(1)
  })

  it('has no place there when either is off the land', () => {
    expect(munchSpot(put(put(none(), 'tree', 'sea', 4.2, 0), 'sheep', 'land', 2, 0))).toBeNull()
    expect(munchSpot(put(none(), 'sheep', 'land', 2, 0))).toBeNull()
  })

  it('goes round a toy that stands in the way', () => {
    let toys = put(put(none(), 'tree', 'land', 0, 0), 'sheep', 'land', 2.2, 0)
    toys = put(toys, 'house', 'land', 1.3, 0)
    const spot = munchSpot(toys)
    if (spot) expect(Math.hypot(spot.x - 1.3, spot.z)).toBeGreaterThanOrEqual(FOOT.sheep + FOOT.house + GAP - 1e-6)
  })
})

describe("the cat's seat", () => {
  it('is the first seat on a bare island, and is worked out from the toys alone', () => {
    expect(catSeat(none())).toBe(0)
    const toys = put(none(), 'house', 'land', 0.9, -0.7)
    expect(catSeat(toys)).toBe(catSeat(toys.map((toy) => ({ ...toy }))))
  })

  it('is never a seat a toy stands in', () => {
    const rng = makeRng(3)
    for (let round = 0; round < 200; round++) {
      let toys = none()
      for (const kind of KINDS) {
        const a = rng.next() * Math.PI * 2, r = rng.next() * 3.2
        const spot = settle(kind, Math.cos(a) * r, Math.sin(a) * r, toys)
        if (spot.where !== 'boat') toys = put(toys, kind, spot.where, spot.x, spot.z)
      }
      const seat = catSeat(toys)
      expect(seatFree(seat, toys)).toBe(true)
      if (seat !== RIM_SEAT) for (const toy of toys) if (toy.where === 'land') expect(Math.hypot(SEATS[seat].x - toy.x, SEATS[seat].z - toy.z)).toBeGreaterThanOrEqual(FOOT[toy.kind] + CAT_FOOT + GAP - 1e-6)
    }
  })

  it('is one of as many seats as the save can name', () => {
    expect(SEATS).toHaveLength(CAT_SEATS)
  })

  it('is the back of the rim when the land has no seat left', () => {
    const toys: Toy[] = SEATS.slice(0, RIM_SEAT).map((seat, i) => ({ kind: KINDS[i % KINDS.length], where: 'land', x: seat.x, z: seat.z }))
    expect(catSeat(toys)).toBe(RIM_SEAT)
  })

  it('is kept by a cat that sits in it for as long as it is free, and left for the nearest free seat and no further', () => {
    // A tree far from the cat's seat: another seat is further from it now, and the cat stays.
    const far = put(none(), 'tree', 'land', SEATS[3].x, SEATS[3].z)
    expect(catSeat(far, 0, 3)).not.toBe(3)
    expect(catSeat(far, 0, 0)).toBe(0)
    // The tree on its seat: the seat beside it, not the one across the island.
    const on = put(none(), 'tree', 'land', SEATS[0].x, SEATS[0].z), next = catSeat(on, 0, 0)
    expect(next).not.toBe(0)
    expect(Math.hypot(SEATS[next].x - SEATS[0].x, SEATS[next].z - SEATS[0].z)).toBeLessThan(1.8)
    expect(catSeat(on)).not.toBe(next)
    // From the back of the rim it comes back to the seat worked out from the toys alone.
    expect(catSeat(on, 0, RIM_SEAT)).toBe(catSeat(on))
  })

  it('is left, too, when a toy hides the face of the cat that sits in it, for a seat where it is seen', () => {
    // The lighthouse stands between the child and the back seat on the left: it is in front of the cat's face.
    const toys = put(none(), 'lighthouse', 'land', SEATS[4].x * 0.85, SEATS[4].z + 1.8), next = catSeat(toys, 0, 4)
    expect(seatFree(4, toys)).toBe(true)
    expect(next).not.toBe(4)
    expect(next).not.toBe(RIM_SEAT)
    // And a sheep in front of its feet hides nothing: it stays.
    expect(catSeat(put(none(), 'sheep', 'land', SEATS[4].x * 0.85, SEATS[4].z + 2), 0, 4)).toBe(4)
  })
})

describe('who stands in front of whom', () => {
  const cat = (x: number, z: number) => ({ x, z, half: CAT_HALF, low: LAND_Y, high: LAND_Y + CAT_TALL })
  const toy = (x: number, z: number, high = 2) => ({ x, z, half: 0.9, low: LAND_Y, high: LAND_Y + high })

  it('is the nearer of two that are in line with the child, never the further, and neither when they stand side by side', () => {
    expect(covers(cat(0, 1), toy(0, -1))).toBe(true)
    expect(covers(cat(0, -1), toy(0, 1))).toBe(false)
    expect(covers(cat(-2.5, 1), toy(1, 1.2))).toBe(false)
    expect(covers(cat(0, 0), toy(3, -1))).toBe(false)
  })

  it('reaches further behind a tall thing than behind a short one', () => {
    const far = toy(0, -5.6, 0.6)
    expect(covers({ x: 0, z: 1.5, half: 0.5, low: 0, high: 0.5 }, far)).toBe(false)
    expect(covers({ x: 0, z: 1.5, half: 0.5, low: 0, high: 3.4 }, far)).toBe(true)
  })

  it('seats the cat where it covers no toy that stands still, whichever way the island is turned', () => {
    const rng = makeRng(5)
    let seats = 0
    for (let round = 0; round < 300; round++) {
      let toys = none()
      for (const kind of KINDS) {
        if (rng.next() < 0.3) continue
        const a = rng.next() * Math.PI * 2, r = rng.next() < 0.6 ? rng.next() * 2.6 : 4.4
        const spot = settle(kind, Math.cos(a) * r, Math.sin(a) * r, toys)
        if (spot.where !== 'boat') toys = put(toys, kind, spot.where, spot.x, spot.z)
      }
      const turn = rng.next() * Math.PI * 2, seat = catSeat(toys, turn)
      if (seat === RIM_SEAT) continue
      seats += 1
      const at = toWorld(SEATS[seat].x, SEATS[seat].z, turn)
      for (const other of resting(toys, turn)) expect(covers(cat(at.x, at.z), other)).toBe(false)
    }
    expect(seats).toBeGreaterThan(60)
  })

  it('does not count the boat afloat, which sails past, and counts the boat on the land', () => {
    expect(resting(put(none(), 'boat', 'sea', 5.75, 0), 0)).toHaveLength(0)
    expect(resting(put(none(), 'boat', 'land', 1, 0), 0)).toHaveLength(1)
    // With the sheep aboard it stands that much taller.
    const aboard = put(put(none(), 'boat', 'land', 1, 0), 'sheep', 'boat', 0, 0)
    expect(resting(aboard, 0)[0].high).toBeGreaterThan(resting(put(none(), 'boat', 'land', 1, 0), 0)[0].high + 1)
  })
})

describe("the gull's place beside a house in the sea", () => {
  it('is a little way round from the house and further out, clear of the house and of the rim from beak to tail', () => {
    for (const bearing of [-Math.PI / 2, -Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5, 0.4, 2.2]) {
      const x = Math.cos(bearing) * SEA_LANE_R, z = Math.sin(bearing) * SEA_LANE_R
      const spot = gullSpot(put(none(), 'house', 'sea', x, z), 0)!
      expect(Math.hypot(spot.x, spot.z)).toBeCloseTo(GULL_RING_R, 5)
      expect(Math.abs(Math.atan2(spot.z, spot.x) - bearing)).toBeCloseTo(GULL_ROUND, 5)
      // The house's furthest corner is nearer its middle than the gull's tail, whichever way the gull is turned, and the rim is beyond its other side.
      expect(Math.hypot(spot.x - x, spot.z - z)).toBeGreaterThan(SEA_FOOT.house + GULL_LONG - 0.1)
      expect(GULL_RING_R + GULL_LONG).toBeLessThanOrEqual(RIM_IN)
    }
  })

  it('is to one side of a house at the front, where straight out would be between the child and the house', () => {
    const toys = put(none(), 'house', 'sea', 0, SEA_LANE_R), spot = gullSpot(toys, 0)!
    expect(Math.abs(spot.x)).toBeGreaterThan(1.4)
    expect(Math.hypot(spot.x, spot.z)).toBeCloseTo(GULL_RING_R, 5)
    const gull = { ...spot, half: GULL_HALF, low: 0, high: GULL_AFLOAT }
    for (const other of resting(toys, 0)) expect(covers(gull, other)).toBe(false)
  })

  it('follows the island round: it is on the side of the house that is further from the child, whichever that is', () => {
    const toys = put(none(), 'house', 'sea', SEA_LANE_R, 0)
    const right = gullSpot(toys, 0)!, left = gullSpot(toys, Math.PI)!
    expect(right.z).toBeLessThan(0)
    expect(left.z).toBeGreaterThan(0)
    expect(toWorld(left.x, left.z, Math.PI).z).toBeLessThan(0)
  })

  it('is nowhere when the house is not in the sea, and never in front of a toy or of the wave', () => {
    expect(gullSpot(none(), 0)).toBeNull()
    expect(gullSpot(put(none(), 'house', 'land', 0, 0), 0)).toBeNull()
    const rng = makeRng(8)
    let found = 0
    for (let round = 0; round < 300; round++) {
      let toys = none()
      for (const kind of KINDS) {
        const a = rng.next() * Math.PI * 2, r = kind === 'house' || rng.next() < 0.5 ? 4.4 : rng.next() * 2.6
        const spot = settle(kind, Math.cos(a) * r, Math.sin(a) * r, toys)
        if (spot.where !== 'boat') toys = put(toys, kind, spot.where, spot.x, spot.z)
      }
      const turn = rng.next() * Math.PI * 2, wave = { x: 8.3, z: -3 }, spot = gullSpot(toys, turn, wave)
      if (!spot) continue
      found += 1
      const gull = { ...toWorld(spot.x, spot.z, turn), half: GULL_HALF, low: 0, high: GULL_AFLOAT }
      for (const other of resting(toys, turn)) expect(covers(gull, other)).toBe(false)
      expect(covers(gull, { ...wave, half: 2, low: 0, high: 2.4 })).toBe(false)
      for (const other of toys) if (other.where === 'sea' && other.kind !== 'house' && other.kind !== 'boat') expect(Math.hypot(other.x - spot.x, other.z - spot.z)).toBeGreaterThanOrEqual(SEA_FOOT[other.kind] + GULL_HALF)
    }
    expect(found).toBeGreaterThan(100)
  })
})
