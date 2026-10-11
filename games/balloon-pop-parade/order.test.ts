import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KINDS, type Kind } from './kinds'
import { BALLOON, HOME_CONTROL, bunchOffsets, skySlots, viewFor } from './layout'
import { LAID_POSITIONS, MOST_BUNCHES, laySky, layTroop, skyFits, type TroopPlan } from './order'
import { give, served, troopOf, type Bunch, type Count } from './world'

const SEEDS = Array.from({ length: 300 }, (_, index) => (index * 0x9e3779b1 + 17) >>> 0)
const COUNTS: readonly Count[] = [1, 2, 3]

/** Every troop there can be: each kind in each size. */
const TROOPS: readonly TroopPlan[] = KINDS.flatMap((kind) => COUNTS.map((size) => ({ kind, size })))

/** How many bunches of each colour a sky holds, the troop's colour first and the rest from most to fewest. */
function colourCounts(sky: readonly Bunch[], own: Kind): number[] {
  const others = KINDS.filter((kind) => kind !== own).map((kind) => sky.filter((bunch) => bunch.colour === kind).length)
  return [sky.filter((bunch) => bunch.colour === own).length, ...others.filter((count) => count > 0).sort((a, b) => b - a)]
}

const sizes = (sky: readonly Bunch[]): number[] => sky.map((bunch) => bunch.count).sort()

/**
 * Every sky a position lays out, for every troop and every seed, held against what the position promises.
 * Returns the layouts that break the promise, so a failure names them and a pass costs one comparison.
 */
function skiesThatBreak(position: string, holds: (sky: Bunch[], troop: TroopPlan) => boolean): string[] {
  const broken: string[] = []
  for (const troop of TROOPS) {
    for (const seed of SEEDS) {
      const { sky } = laySky(position, troop, seed)
      if (!holds(sky, troop)) broken.push(`${position}, ${troop.size} ${troop.kind}, seed ${seed}: ${sky.map((bunch) => `${bunch.count} ${bunch.colour}`).join(', ')}`)
    }
  }
  return broken
}

const same = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((value, index) => value === b[index])

describe('the designed order', () => {
  it('lays out every step of the ladder, in its order', () => {
    expect(LAID_POSITIONS).toEqual(LADDER)
  })

  it('treats an id it does not know as the first step', () => {
    for (const unknown of ['retired-step', '', 'constructor', '__proto__']) {
      for (const seed of SEEDS.slice(0, 20)) {
        expect(layTroop(unknown, 'frog', seed)).toEqual(layTroop(LADDER[0], 'frog', seed))
        expect(laySky(unknown, { kind: 'crab', size: 3 }, seed)).toEqual(laySky(LADDER[0], { kind: 'crab', size: 3 }, seed))
      }
    }
  })
})

describe('the troop a position lays out', () => {
  it('is never the kind to avoid, so two troops in a row never share a kind', () => {
    for (const position of LADDER) {
      for (const avoid of KINDS) {
        const seen = new Set<Kind>()
        for (const seed of SEEDS) seen.add(layTroop(position, avoid, seed).troop.kind)
        expect([...seen].sort(), `${position} without ${avoid}`).toEqual(KINDS.filter((kind) => kind !== avoid).sort())
      }
    }
  })

  it('is any of the four kinds when there is none to avoid', () => {
    const seen = new Set(SEEDS.map((seed) => layTroop(LADDER[0], null, seed).troop.kind))
    expect(seen.size).toBe(KINDS.length)
  })

  /** How often each size comes by at a position, over every seed. */
  function sizeCounts(position: string): number[] {
    const drawn = SEEDS.map((seed) => layTroop(position, null, seed).troop.size)
    return COUNTS.map((size) => drawn.filter((value) => value === size).length)
  }

  it('is one friend at both solo positions and two at the pair position', () => {
    expect(sizeCounts('solo-two-colours')).toEqual([SEEDS.length, 0, 0])
    expect(sizeCounts('solo-three-colours')).toEqual([SEEDS.length, 0, 0])
    expect(sizeCounts('pair-singles')).toEqual([0, SEEDS.length, 0])
  })

  it('changes size from the trio position on, the bigger troops more often than a friend alone', () => {
    const [one, two, three] = sizeCounts('trio-singles')
    expect(one).toBeGreaterThan(0)
    expect(two).toBeGreaterThan(one)
    expect(three).toBeGreaterThan(two)
    for (const position of ['bunches-own-colour', 'bunches-mixed']) {
      const [alone, pair, trio] = sizeCounts(position)
      expect(alone).toBeGreaterThan(0)
      expect(pair).toBeGreaterThan(alone)
      expect(trio).toBeGreaterThan(alone)
      // Two and three weigh the same here: neither comes by much more often than the other.
      expect(Math.abs(pair - trio)).toBeLessThan(SEEDS.length / 5)
    }
  })

  it('is the same for the same seed, and leaves the stream a uint32', () => {
    for (const position of LADDER) {
      for (const seed of SEEDS) {
        const laid = layTroop(position, 'duck', seed)
        expect(layTroop(position, 'duck', seed)).toEqual(laid)
        expect(Number.isInteger(laid.rng) && laid.rng >= 0 && laid.rng <= 0xffffffff).toBe(true)
      }
    }
  })
})

describe('the sky a position lays out', () => {
  it('fits its troop at every position, for a troop of any size: a single of its colour, at most five bunches, none over three', () => {
    for (const position of LADDER) {
      expect(skiesThatBreak(position, (sky, troop) => skyFits(sky, troop.kind))).toEqual([])
      expect(skiesThatBreak(position, (sky) => sky.length <= MOST_BUNCHES && sky.every((bunch) => COUNTS.includes(bunch.count) && KINDS.includes(bunch.colour)))).toEqual([])
    }
  })

  it('holds four singles in two colours at the first position, two of them the troop\'s', () => {
    expect(skiesThatBreak('solo-two-colours', (sky, troop) => same(sizes(sky), [1, 1, 1, 1]) && same(colourCounts(sky, troop.kind), [2, 2]))).toEqual([])
  })

  it('holds five singles in three colours at the three positions of singles, two of them the troop\'s', () => {
    for (const position of ['solo-three-colours', 'pair-singles', 'trio-singles']) {
      expect(skiesThatBreak(position, (sky, troop) => same(sizes(sky), [1, 1, 1, 1, 1]) && same(colourCounts(sky, troop.kind), [2, 2, 1]))).toEqual([])
    }
  })

  it('holds three bunches of one, two and three at the first bunch position, all the troop\'s colour', () => {
    expect(skiesThatBreak('bunches-own-colour', (sky, troop) => same(sizes(sky), [1, 2, 3]) && same(colourCounts(sky, troop.kind), [3]))).toEqual([])
  })

  it('holds four bunches at the last position: a single and a larger one of the troop\'s colour, and two of other colours', () => {
    expect(skiesThatBreak('bunches-mixed', (sky, troop) => sky.length === 4 && same(colourCounts(sky, troop.kind), [2, 1, 1]))).toEqual([])
    // Of the troop's colour: the single, and a larger one that serves the whole troop in one touch when there is more than one friend.
    expect(skiesThatBreak('bunches-mixed', (sky, troop) => {
      const own = sky.filter((bunch) => bunch.colour === troop.kind).map((bunch) => bunch.count).sort()
      return own[0] === 1 && own[1] > 1 && (troop.size === 1 || own[1] === troop.size)
    })).toEqual([])
    // Of the other two, one is as large as the troop and one is not.
    expect(skiesThatBreak('bunches-mixed', (sky, troop) => {
      const others = sky.filter((bunch) => bunch.colour !== troop.kind).map((bunch) => bunch.count)
      return others.filter((count) => count === troop.size).length === 1 && others.filter((count) => count !== troop.size).length === 1
    })).toEqual([])
  })

  it('hangs a bigger bunch of the troop\'s colour beside its single one wherever bunches hang, whatever else is in the sky', () => {
    for (const position of ['bunches-own-colour', 'bunches-mixed']) for (const kind of KINDS) for (const size of [1, 2, 3] as const) for (let seed = 1; seed <= 200; seed++) {
      const { sky } = laySky(position, { kind, size }, seed * 2654435761 >>> 0)
      const single = sky.findIndex((bunch) => bunch.colour === kind && bunch.count === 1)
      expect(single, `${position}, ${size} ${kind}, seed ${seed}`).toBeGreaterThanOrEqual(0)
      const beside = [sky[single - 1], sky[single + 1]].filter((bunch): bunch is Bunch => bunch !== undefined)
      expect(beside.some((bunch) => bunch.colour === kind && bunch.count > 1), `${position}, ${size} ${kind}, seed ${seed}: ${sky.map((bunch) => bunch.colour + bunch.count).join(' ')}`).toBe(true)
    }
  })

  it('hangs no balloon under the shell\'s home control at the top centre, on the iPad held wide or on a narrower surface', () => {
    // The shell draws one round control over the game, in the middle of the top edge, and a touch on it goes home.
    // A balloon is under it when any of its round is in the control's column and as high as the control's lower edge.
    for (const [width, height] of [[1180, 820], [1024, 768], [1080, 810], [1366, 1024], [1280, 720], [1024, 640], [1000, 820], [900, 820], [820, 1180], [768, 1024]]) {
      const view = viewFor(width, height), round = BALLOON * view.balloon
      const column = HOME_CONTROL.halfWidth / view.pixelsPerUnit, under = view.height / 2 - HOME_CONTROL.bottom / view.pixelsPerUnit
      const covered: string[] = []
      for (const position of LADDER) for (const troop of TROOPS) for (const seed of SEEDS.slice(0, 120)) {
        const { sky } = laySky(position, troop, seed), places = skySlots(sky.length, view, Math.max(...sky.map((bunch) => bunch.count)))
        sky.forEach((bunch, place) => {
          for (const offset of bunchOffsets(bunch.count)) {
            const x = places[place].x + offset.x * view.balloon, y = places[place].y + offset.y * view.balloon
            if (Math.abs(x) < column + round && y + round > under) covered.push(`${position}, ${troop.size} ${troop.kind}, seed ${seed}: ${sky.map((each) => each.count).join(' ')}`)
          }
        })
      }
      expect(covered.slice(0, 3), `${width} by ${height}`).toEqual([])
    }
  })

  it('still hangs the bunch of three in either end place of a row of three, and the single in every place', () => {
    const skies = SEEDS.map((seed) => laySky('bunches-own-colour', { kind: 'frog', size: 3 }, seed).sky.map((bunch) => bunch.count))
    expect(new Set(skies.map((sky) => sky.indexOf(3)))).toEqual(new Set([0, 2]))
    expect(new Set(skies.map((sky) => sky.indexOf(1)))).toEqual(new Set([0, 1, 2]))
  })

  it('shuffles the bunches into their places', () => {
    for (const position of LADDER) {
      const places = new Set(SEEDS.map((seed) => laySky(position, { kind: 'hippo', size: 2 }, seed).sky.findIndex((bunch) => bunch.colour === 'hippo' && bunch.count === 1)))
      expect(places.size, position).toBeGreaterThan(1)
    }
  })

  it('is the same for the same seed, and leaves the stream a uint32', () => {
    for (const position of LADDER) {
      for (const troop of TROOPS) {
        for (const seed of SEEDS.slice(0, 50)) {
          const laid = laySky(position, troop, seed)
          expect(laySky(position, troop, seed)).toEqual(laid)
          expect(Number.isInteger(laid.rng) && laid.rng >= 0 && laid.rng <= 0xffffffff).toBe(true)
        }
      }
    }
  })

  it('never dead-ends: the single of the troop\'s colour, sent again and again, serves every troop', () => {
    for (const position of LADDER) {
      expect(skiesThatBreak(position, (sky, plan) => {
        const single = sky.find((bunch) => bunch.colour === plan.kind && bunch.count === 1)
        if (!single) return false
        let troop = troopOf(plan.kind, plan.size)
        // The sky is as it was after every send, so the same single is there each time.
        for (let sent = 0; sent < plan.size; sent++) troop = give(troop, single).troop
        return served(troop)
      })).toEqual([])
    }
  })
})

describe('a sky that fits', () => {
  const single: Bunch = { colour: 'frog', count: 1 }

  it('holds a single of the troop\'s colour', () => {
    expect(skyFits([single], 'frog')).toBe(true)
    expect(skyFits([single], 'duck')).toBe(false)
    expect(skyFits([{ colour: 'frog', count: 2 }, { colour: 'duck', count: 1 }], 'frog')).toBe(false)
    expect(skyFits([], 'frog')).toBe(false)
  })

  it('holds at most five bunches, each of one, two or three', () => {
    expect(skyFits([single, single, single, single, single], 'frog')).toBe(true)
    expect(skyFits([single, single, single, single, single, single], 'frog')).toBe(false)
    expect(skyFits([single, { colour: 'frog', count: 4 as Count }], 'frog')).toBe(false)
    expect(skyFits([single, { colour: 'duck', count: 0 as Count }], 'frog')).toBe(false)
  })
})
