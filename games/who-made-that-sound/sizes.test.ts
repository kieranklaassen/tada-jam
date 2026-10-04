import { describe, expect, it } from 'vitest'
import { GROWN, WIDE } from './figures'
import { RIDER, askerSize, edgeSize, hillSize, littleSize, rowSize, twinApart, twinSize } from './sizes'
import { HILL_SPOTS, eggSpots } from './stage'
import { KINDS, type Kind } from './voices'

// How tall everyone stands, wherever they stand, held to what sizes.ts says of
// itself. A size is a height in design pixels; how wide that makes a kind is
// its height times `WIDE`.

/** Sizes are quotients, so a width that is exactly its room comes back a hair over it. */
const HAIR = 1e-9

/** The six kinds from the smallest grown one to the tallest. */
const BY_SIZE: readonly Kind[] = [...KINDS].sort((a, b) => GROWN[a] - GROWN[b])
const ROWS = [2, 3, 4]
const middles = (row: number) => eggSpots(row).map((spot) => spot.x + spot.w / 2)
/** From the middle of one hill place to the middle of the next. */
const HILL_STEP = Math.min(...HILL_SPOTS.slice(1).map((spot, i) => spot.x - HILL_SPOTS[i].x))

/** Every pair of kinds, the smaller grown one first. */
function pairs(): [Kind, Kind][] {
  return BY_SIZE.flatMap((small, i) => BY_SIZE.slice(i + 1).map((big): [Kind, Kind] => [small, big]))
}

describe('the order of size', () => {
  it('has six kinds of six heights, so there is an order to keep', () => {
    expect(new Set(KINDS.map((kind) => GROWN[kind])).size).toBe(KINDS.length)
  })

  // These three are held back only by a height: a cap for the tall, a floor for the tiny.
  it('is never turned round at the stone, at the edge, or for a little one alone', () => {
    for (const [name, size] of [['the stone', askerSize], ['the edge', edgeSize], ['a little one', littleSize]] as const) {
      for (const [small, big] of pairs()) expect(size(small), `${small} and ${big} at ${name}`).toBeLessThanOrEqual(size(big))
    }
  })

  it('is kept exactly between two kinds that stand at their full size', () => {
    for (const [small, big] of pairs()) {
      if (askerSize(small) === GROWN[small] && askerSize(big) === GROWN[big]) expect(askerSize(small)).toBeLessThan(askerSize(big))
      if (edgeSize(small) === GROWN[small] && edgeSize(big) === GROWN[big]) expect(edgeSize(small)).toBeLessThan(edgeSize(big))
      const share = (kind: Kind) => littleSize(kind) / GROWN[kind]
      if (littleSize(small) > 96 && littleSize(big) < 132) expect(share(small)).toBeCloseTo(share(big), 9)
    }
  })

  // The row, a hill place and a pair of twins give a kind a width. A wide kind is cut down to it, so there a
  // bigger kind may stand shorter than a smaller one, and it is then the wider of the two: never smaller both ways.
  it('is turned round in the row, on the hill and among twins only for a kind held to the width of its spot, which is then the wider one', () => {
    const roles: [string, (kind: Kind) => number, number][] = [
      ...ROWS.map((row): [string, (kind: Kind) => number, number] => [`a row of ${row}`, (kind) => rowSize(kind, row), row >= 4 ? 126 : 150]),
      ['the hill', hillSize, HILL_SPOTS[0].w - 6],
      ['twins', twinSize, 100],
    ]
    const turned: string[] = []
    for (const [name, size, room] of roles) for (const [small, big] of pairs()) {
      if (size(small) <= size(big)) continue
      turned.push(`${big} under ${small} in ${name}`)
      expect(size(big) * WIDE[big], `${big} in ${name} is as wide as its spot`).toBeCloseTo(room, 6)
      expect(size(big) * WIDE[big], `${big} is wider than ${small} in ${name}`).toBeGreaterThan(size(small) * WIDE[small])
    }
    // Only the wide one is ever out of order, and it is in all of these.
    expect(turned.every((one) => one.startsWith('hoom '))).toBe(true)
    expect(new Set(turned.map((one) => one.split(' in ')[1]))).toEqual(new Set(roles.map(([name]) => name)))
  })
})

describe('a little one alone', () => {
  it('is at least 96 tall, so it is a target of its own, and never taller than its grown one', () => {
    for (const kind of KINDS) {
      expect(littleSize(kind), kind).toBeGreaterThanOrEqual(96)
      expect(littleSize(kind), kind).toBeLessThan(GROWN[kind])
    }
  })
})

describe('a grown one in the row', () => {
  it('is never wider than its spot allows: 150 with up to three in the row, 126 with four', () => {
    for (const kind of KINDS) for (const row of ROWS) {
      expect(rowSize(kind, row) * WIDE[kind], `${kind} in a row of ${row}`).toBeLessThanOrEqual((row >= 4 ? 126 : 150) + HAIR)
      expect(rowSize(kind, row), kind).toBeLessThanOrEqual(GROWN[kind])
    }
  })

  it('has that much room: two spots side by side are at least as far apart, middle to middle', () => {
    for (const row of ROWS) {
      const at = middles(row)
      for (let i = 1; i < at.length; i++) {
        expect(at[i] - at[i - 1], `spots ${i - 1} and ${i} of ${row}`).toBeGreaterThanOrEqual(row >= 4 ? 126 : 150)
        // So no two grown ones of any two kinds touch.
        for (const left of KINDS) for (const right of KINDS) expect((rowSize(left, row) * WIDE[left] + rowSize(right, row) * WIDE[right]) / 2).toBeLessThanOrEqual(at[i] - at[i - 1] + HAIR)
      }
    }
  })
})

describe('a family on the hill', () => {
  it('is never wider than a place on the hill', () => {
    for (const kind of KINDS) expect(hillSize(kind) * WIDE[kind], kind).toBeLessThanOrEqual(HILL_SPOTS[0].w)
  })

  // The rider's feet are `up` of the grown one above the ground, and it is `size` of it tall.
  const tall = (kind: Kind) => hillSize(kind) * (RIDER.up + RIDER.size)

  it('is at most 1.42 of its grown one tall with its little one riding: 195.96 for the tallest', () => {
    expect(RIDER.up + RIDER.size).toBeLessThanOrEqual(1.42 + HAIR)
    expect(Math.max(...KINDS.map(tall))).toBeLessThanOrEqual(195.96 + HAIR)
    // The little one rides on the grown one: its feet are on it, and its head is above it.
    expect(RIDER.up).toBeLessThanOrEqual(1)
    expect(RIDER.up + RIDER.size).toBeGreaterThan(1)
  })

  it('fits one place with its little one riding: the two together are no taller than a place', () => {
    for (const kind of KINDS) expect(tall(kind), kind).toBeLessThanOrEqual(HILL_SPOTS[0].h)
  })
})

describe('twins side by side', () => {
  const span = (kind: Kind) => twinApart(kind) * 2 + twinSize(kind) * WIDE[kind]

  it('span less than from one hill place to the next, so two pairs never touch', () => {
    expect(HILL_STEP).toBe(210)
    for (const kind of KINDS) expect(span(kind), kind).toBeLessThan(HILL_STEP)
    // The widest pair is the wide kind's: 184 across.
    expect(Math.max(...KINDS.map(span))).toBeCloseTo(184)
  })

  it('are each smaller than one alone', () => {
    for (const kind of KINDS) expect(twinSize(kind), kind).toBeLessThan(littleSize(kind))
  })
})

describe('the one who asks', () => {
  it('is never taller than 205 on the stone, so it does not reach into the hill', () => {
    for (const kind of KINDS) expect(askerSize(kind), kind).toBeLessThanOrEqual(205)
  })

  it('stands at its full size or taller there: the two small kinds a good deal taller than among the others', () => {
    for (const kind of KINDS) expect(askerSize(kind), kind).toBeGreaterThanOrEqual(Math.min(GROWN[kind], 205))
    for (const kind of KINDS.filter((kind) => GROWN[kind] < 140)) expect(askerSize(kind), kind).toBeGreaterThan(GROWN[kind] * 1.2)
  })

  it('is at most 190 tall while it waits at the edge', () => {
    for (const kind of KINDS) expect(edgeSize(kind), kind).toBeLessThanOrEqual(190)
  })
})

describe('twins of the kind with long ears', () => {
  it('stand so far apart that an ear that hangs on the one and an ear that swings right out on the other do not reach each other', () => {
    // An ear of `dooo` is 0.52 of its height long and 0.24 across, and hangs from 0.17 beside its middle: at rest 0.3 radians out, lifted right out 0.58 (figures.ts).
    const size = twinSize('dooo'), hangs = (0.17 + 0.52 * Math.sin(0.3) + 0.1) * size, swings = (0.17 + 0.52 * Math.sin(0.58) + 0.1) * size
    expect(2 * twinApart('dooo')).toBeGreaterThanOrEqual(hangs + swings - 0.5)
  })
})
