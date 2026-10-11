import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { EMPTY_MOUTH, KIND, fits, mouthOf, widthOf, type Kind } from './kinds'
import { hidesGate, seenClear } from './seen'
import { GAP, HOLE_START, STOCK, STREET, STRIP, aside, clampHole, freeSpot, layStreet, setDown, stepOut, stockOf, walledOff, type Standing } from './street'

const sorted = (kinds: readonly Kind[]): Kind[] => [...kinds].sort()

function apart(a: Standing, b: Standing): number {
  return Math.hypot(a.x - b.x, a.z - b.z) - (widthOf(a.parts) + widthOf(b.parts)) / 2
}

describe('what stands on a street', () => {
  it('has a set for every id of the ladder, each fuller than the last', () => {
    for (const id of LADDER) expect(STOCK[id].length).toBeGreaterThan(0)
    for (let i = 1; i < LADDER.length; i++) expect(STOCK[LADDER[i]].length).toBeGreaterThan(STOCK[LADDER[i - 1]].length)
    expect(stockOf('no such street')).toBe(STOCK.few)
  })

  it('can all be eaten, smallest first: no street has a thing the hole can never take', () => {
    for (const id of LADDER) {
      const belly: Kind[] = []
      for (const kind of [...STOCK[id]].sort((a, b) => KIND[a].width - KIND[b].width)) {
        expect(fits(KIND[kind].width, mouthOf(belly)), `${kind} on ${id}`).toBe(true)
        belly.push(kind)
      }
    }
  })

  it('leaves the hole room to move when it has eaten everything', () => {
    for (const id of LADDER) expect(mouthOf(STOCK[id])).toBeLessThan(STREET.z1 - STREET.z0)
  })
})

describe('a street laid out from a seed', () => {
  it('is the same street for the same seed and another for another', () => {
    expect(layStreet('some', 7)).toEqual(layStreet('some', 7))
    expect(layStreet('some', 7)).not.toEqual(layStreet('some', 8))
  })

  it('holds its whole set, each thing alone, inside the street, touching nothing and clear of the hole', () => {
    for (const id of LADDER) {
      for (let seed = 1; seed <= 80; seed++) {
        const street = layStreet(id, seed)
        expect(sorted(street.map((standing) => standing.parts[0]))).toEqual(sorted(STOCK[id]))
        street.forEach((standing, index) => {
          const half = widthOf(standing.parts) / 2
          expect(standing.parts).toHaveLength(1)
          expect(standing.x - half).toBeGreaterThanOrEqual(STREET.x0 - 1e-6)
          expect(standing.x + half).toBeLessThanOrEqual(STREET.x1 + 1e-6)
          expect(standing.z - half).toBeGreaterThanOrEqual(STREET.z0 - 1e-6)
          expect(standing.z).toBeLessThanOrEqual(STREET.z1)
          expect(Math.hypot(standing.x - HOLE_START.x, standing.z - HOLE_START.z) - half - 0.5, `${id} ${seed} against the hole`).toBeGreaterThanOrEqual(GAP - 0.02)
          for (const other of street.slice(index + 1)) expect(apart(standing, other), `${id} ${seed}: ${standing.parts[0]} and ${other.parts[0]}`).toBeGreaterThanOrEqual(GAP - 0.02)
        })
      }
    }
  })

  it('lays one pie close beside the hole, so the first thing the empty hole takes is a short glide away', () => {
    for (const id of LADDER) {
      for (let seed = 1; seed <= 40; seed++) {
        const pies = layStreet(id, seed).filter((standing) => standing.parts[0] === 'pie')
        const nearest = Math.min(...pies.map((pie) => Math.hypot(pie.x - HOLE_START.x, pie.z - HOLE_START.z)))
        expect(nearest, `${id} ${seed}`).toBeLessThan(2.4)
      }
    }
  })

  it('leaves every thing a way in from the gate past those that came before it and round the hole: no thing has to leap', () => {
    for (const id of LADDER) {
      for (let seed = 1; seed <= 120; seed++) expect(walledOff(layStreet(id, seed), { ...HOLE_START, mouth: EMPTY_MOUTH }), `${id} ${seed}`).toBe(0)
    }
  })

  it('is laid in the order the things come in: widest first', () => {
    for (const id of LADDER) {
      const widths = layStreet(id, 5).map((standing) => widthOf(standing.parts))
      for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThanOrEqual(widths[i - 1])
    }
  })

  it('is laid round the hole wherever the hole lies, and however wide its mouth is', () => {
    const hole = { x: HOLE_START.x, z: HOLE_START.z, mouth: 2.6 }
    for (let seed = 1; seed <= 40; seed++) {
      for (const standing of layStreet('many', seed, hole)) expect(Math.hypot(standing.x - hole.x, standing.z - hole.z) - widthOf(standing.parts) / 2 - hole.mouth / 2, `seed ${seed}`).toBeGreaterThanOrEqual(GAP - 0.02)
    }
  })

  it('stands the tall things toward the far kerb and the pies toward the near one', () => {
    const street = layStreet('many', 3)
    const z = (kind: Kind): number[] => street.filter((standing) => standing.parts[0] === kind).map((standing) => standing.z)
    expect(Math.max(...z('drummer'))).toBeLessThan(0)
    expect(Math.min(...z('pie'))).toBeGreaterThan(Math.max(...z('drummer')))
  })
})

describe('a free spot', () => {
  it('is the asked place when that is clear', () => {
    expect(freeSpot(1, 1, 1, [], null)).toEqual({ x: 1, z: 1 })
  })

  it('is beside whatever stands in the way, and beside the hole', () => {
    const street: Standing[] = [{ parts: ['tuba'], x: 0, z: 0 }]
    const spot = freeSpot(0, 0, KIND.dog.width, street, null)
    expect(apart({ parts: ['dog'], ...spot }, street[0])).toBeGreaterThanOrEqual(GAP - 0.02)
    const hole = { x: 2, z: 1, mouth: 2 }
    const beside = freeSpot(2, 1, 1, [], hole)
    expect(Math.hypot(beside.x - 2, beside.z - 1)).toBeGreaterThanOrEqual(1 + 0.5 + GAP - 0.02)
  })

  it('is inside the street even when asked for a place outside it', () => {
    const spot = freeSpot(STREET.x1 + 5, STREET.z0 - 5, 2, [], null)
    expect(spot.x).toBeLessThanOrEqual(STREET.x1 - 1)
    expect(spot.z).toBeGreaterThanOrEqual(STREET.z0 + 1)
  })

  it('finds room for a stack on the fullest street with the hole at its widest', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const street = layStreet('many', seed).slice(3)
      const hole = { x: 0, z: 0.5, mouth: 2.2 }
      const spot = freeSpot(0, 0.5, 2.1, street, hole)
      for (const other of street) expect(apart({ parts: ['tuba'], ...spot }, other), `seed ${seed}`).toBeGreaterThanOrEqual(GAP - 0.02)
    }
  })
})

describe('a stack set down', () => {
  /** Streets in the middle of play: a stack of the things named is taken off a laid street, and the hole has moved from under it. */
  function* cases(): Generator<{ label: string; parts: Kind[]; street: Standing[]; from: { x: number; z: number }; hole: { x: number; z: number; mouth: number } }> {
    const stacks: Kind[][] = [['pie'], ['pie', 'hat'], ['dog', 'tuba', 'drummer'], ['balloon', 'pie', 'balloon'], ['hat', 'pie', 'dog'], ['tuba', 'drummer', 'balloon'], ['drummer', 'tuba'], ['pie', 'pie', 'pie', 'hat', 'dog', 'balloon', 'balloon', 'tuba']]
    for (const id of LADDER) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const parts of stacks) {
          const street = [...layStreet(id, seed)]
          let all = true
          for (const kind of parts) {
            const at = street.findIndex((standing) => standing.parts[0] === kind)
            if (at < 0) all = false
            else street.splice(at, 1)
          }
          if (!all) continue
          for (const [fx, fz, ax, az] of [[0, 0.4, 1, 0], [-4, -0.5, -1, 0.3], [4, 1.5, 0, -1], [STREET.x0 + 1, STREET.z1 - 1, 1, 1], [3, -1.6, 1, 0.2]]) {
            const mouth = mouthOf(parts.slice(1))
            const far = Math.hypot(ax, az), hole = { ...clampHole(fx + (ax / far) * 1.2, fz + (az / far) * 1.2, mouth), mouth }
            yield { label: `${id} ${seed} ${parts.join('+')} at ${fx},${fz}`, parts, street, from: { x: fx, z: fz }, hole }
          }
        }
      }
    }
  }

  it('drops clear of the hole and the strip under the bystanders and of every thing but those it says must step out, and stands on such a spot as well', () => {
    let count = 0
    for (const { label, parts, street, from, hole } of cases()) {
      const down = setDown(parts, from, hole.x - from.x, hole.z - from.z, street, hole), width = widthOf(parts)
      if (down.clear) expect(down.hides, label).toEqual([])
      for (const at of [down.drop, down.spot]) {
        for (const other of street) if (!down.hides.includes(other)) expect(apart({ parts, ...at }, other), label).toBeGreaterThanOrEqual(GAP - 0.02)
        expect(Math.hypot(at.x - hole.x, at.z - hole.z) - width / 2 - hole.mouth / 2, label).toBeGreaterThanOrEqual(GAP - 0.02)
        expect(at.z - width / 2, label).toBeGreaterThanOrEqual(STREET.z0 + STRIP - 1e-6)
        expect(at.x - width / 2, label).toBeGreaterThanOrEqual(STREET.x0 - 1e-6)
        expect(at.x + width / 2, label).toBeLessThanOrEqual(STREET.x1 + 1e-6)
        expect(at.z + width / 2, label).toBeLessThanOrEqual(STREET.z1 + width / 2 + 1e-6)
      }
      count += 1
    }
    expect(count).toBeGreaterThan(500)
  })

  it('stands where it covers no other thing or stack, nor the gate keeper or the gate, as the child sees them', () => {
    for (const { label, parts, street, from, hole } of cases()) {
      const down = setDown(parts, from, hole.x - from.x, hole.z - from.z, street, hole)
      // A tower with a balloon floating on top of it is the one stack this cannot be promised for: see the next test.
      if (parts[parts.length - 1] === 'balloon' && parts.length > 2) continue
      expect(down.clear, label).toBe(true)
      expect(seenClear(parts, down.spot.x, down.spot.z, street), label).toBe(true)
    }
  })

  it('a tower too tall for any such place on a full street comes down where the fewest things must step out, never before the gate keeper or the gate, and each of them has a place to step to', () => {
    let crowded = 0, clear = 0
    for (const { label, parts, street, from, hole } of cases()) {
      if (!(parts[parts.length - 1] === 'balloon' && parts.length > 2)) continue
      const down = setDown(parts, from, hole.x - from.x, hole.z - from.z, street, hole)
      expect(hidesGate(parts, down.spot.x, down.spot.z), label).toBe(false)
      if (down.clear) { clear += 1; expect(seenClear(parts, down.spot.x, down.spot.z, street), label).toBe(true); continue }
      crowded += 1
      expect(down.spot, label).toEqual(down.drop)
      expect(down.hides.length, label).toBeGreaterThan(0)
      // Everything it does not send away stands clear of it, in front of it and behind it.
      const stay = street.filter((other) => !down.hides.includes(other)), stack = { parts, ...down.spot }
      expect(seenClear(parts, down.spot.x, down.spot.z, stay), label).toBe(true)
      // Each thing sent away steps, one after the other, to a place clear of the stack and of everything else.
      const now = [...street]
      for (const hidden of down.hides) {
        const others = now.filter((other) => other !== hidden)
        const spot = stepOut(hidden, stack, others, hole)
        expect(spot, label).not.toBeNull()
        if (!spot) continue
        const moved = { parts: hidden.parts, ...spot }
        for (const other of [...others, stack]) expect(apart(moved, other), label).toBeGreaterThanOrEqual(GAP - 0.02)
        expect(seenClear(hidden.parts, spot.x, spot.z, [stack]), label).toBe(true)
        now[now.indexOf(hidden)] = moved
      }
    }
    // On the emptier streets there is a place where it covers nothing and it is taken; on the fullest there is none.
    expect(clear).toBeGreaterThan(0)
    expect(crowded).toBeGreaterThan(0)
  })

  it('a stack walks a few steps away from the hole, and a thing alone that covers nothing stays where it dropped', () => {
    const alone = setDown(['pie'], { x: 0, z: 1 }, 2, 0, [], { x: 2, z: 1, mouth: 1.3 })
    expect(alone.spot).toEqual(alone.drop)
    const stack = setDown(['pie', 'hat'], { x: 0, z: 1 }, 2, 0, [], { x: 2, z: 1, mouth: 1.3 })
    expect(stack.spot.x).toBeLessThan(stack.drop.x - 0.5)
    expect(Math.hypot(stack.spot.x - stack.drop.x, stack.spot.z - stack.drop.z)).toBeLessThan(2.5)
  })
})

describe('the hole on the street', () => {
  it('stays where it is when it is inside', () => {
    expect(clampHole(1, 1, 1)).toEqual({ x: 1, z: 1 })
  })

  it('is kept inside the kerbs, hanging over one by a quarter of a unit at most', () => {
    for (const mouth of [1, 2, 3.2]) {
      const at = clampHole(99, -99, mouth)
      expect(at.x + mouth / 2).toBeLessThanOrEqual(STREET.x1 + 0.25 + 1e-9)
      expect(at.z - mouth / 2).toBeGreaterThanOrEqual(STREET.z0 - 0.25 - 1e-9)
    }
  })
})

describe('making room for a stack on the breath', () => {
  const column: Standing = { parts: ['pie', 'balloon'], x: 0, z: 0 }
  const hole = { x: 0, z: 0, mouth: 1.6 }

  it('a thing in its way goes straight out from under it, to the nearest place clear of the stack, the mouth and everything else', () => {
    const tuba: Standing = { parts: ['tuba'], x: 0.9, z: 0.2 }, hat: Standing = { parts: ['hat'], x: 3.4, z: 0.4 }
    const spot = aside(tuba, column, [hat], hole)
    expect(spot).not.toBeNull()
    if (!spot) return
    const stood = { parts: tuba.parts, ...spot }
    expect(apart(stood, column)).toBeGreaterThanOrEqual(GAP - 0.001)
    expect(apart(stood, hat)).toBeGreaterThanOrEqual(GAP - 0.001)
    expect(Math.hypot(spot.x, spot.z) - (KIND.tuba.width + hole.mouth) / 2).toBeGreaterThanOrEqual(GAP - 0.001)
    // It goes no further than it must.
    expect(Math.hypot(spot.x - tuba.x, spot.z - tuba.z)).toBeLessThan(3.2)
  })

  it('with nothing beside it, it stands one gap clear on the side it was on', () => {
    const pie: Standing = { parts: ['pie'], x: -0.7, z: 0 }
    const spot = aside(pie, column, [], hole)
    expect(spot?.z).toBeCloseTo(0, 1)
    expect(spot?.x).toBeCloseTo(-((KIND.pie.width + KIND.balloon.width) / 2 + GAP), 1)
  })

  it('a thing standing dead under the middle of it still gets a place', () => {
    const spot = aside({ parts: ['drummer'], x: 0, z: 0 }, column, [], hole)
    expect(spot).not.toBeNull()
    if (spot) expect(apart({ parts: ['drummer'], ...spot }, column)).toBeGreaterThanOrEqual(GAP - 0.001)
  })

  it('never gives a place with minus nought in it, which plain JSON would not keep', () => {
    for (const standing of layStreet('many', 8)) {
      expect(Object.is(standing.x, -0)).toBe(false)
      expect(Object.is(standing.z, -0)).toBe(false)
    }
  })
})
