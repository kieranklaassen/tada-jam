import { describe, expect, it } from 'vitest'
import { BASKET_BOX, type Box } from './aim'
import { COLS, KINDS, PER_KIND, ROWS, landing, type Kind, type Placed } from './blocks'
import { BELL_BOX, BOARDS, FLAG, ROOF, SLATS, backOf, bodyOf, bridgeBoards, eveningTops, leavesInView, nearestTo, restsFor, shows, tapBox, things, type Rests, type Thing } from './castle'
import { WHO } from './folk'
import { BODY, FOLK, SIZE, placeX, placeZ } from './layout'
import { below, makeRng } from './rng'

const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })

/** A pile as a child might build it: blocks of any kind set over any place, each coming to rest where the toy would put it. */
function pile(seed: number, count: number): Placed[] {
  const rng = makeRng(seed)
  const placed: Placed[] = []
  const used = new Map<Kind, number>()
  for (let tries = 0; placed.length < count && tries < 200; tries++) {
    const kind = KINDS[below(rng, KINDS.length)]
    if ((used.get(kind) ?? 0) >= PER_KIND) continue
    const spot = landing(placed, kind, below(rng, COLS), below(rng, ROWS))
    used.set(kind, (used.get(kind) ?? 0) + 1)
    placed.push({ kind, col: spot.col, row: spot.row })
  }
  return placed
}

/** Every pile the tests build: a spread of seeded piles of every size, and the ones written out below. */
const PILES: [string, Placed[]][] = [
  ['a bare rug', []],
  ['the youngest first rug', [at('cube', 3, 1), at('round', 3, 1)]],
  ['a castle', [at('cube', 0, 1), at('arch', 3, 0), at('thin', 0, 0), at('round', 6, 0), at('cube', 6, 1), at('cube', 6, 1), at('slope', 0, 2), at('long', 4, 0), at('round', 2, 0)]],
  ['the tallest pile', [at('long', 1, 1), at('long', 1, 1), at('long', 1, 1), at('cube', 2, 1), at('cube', 2, 1), at('cube', 2, 1)]],
  ...Array.from({ length: 60 }, (_, i): [string, Placed[]] => [`seeded pile ${i}`, pile(100 + i, 1 + (i % 18))]),
]

function blockOf(thing: Thing): Box {
  const [w, , d] = SIZE[thing.kind]
  return { min: [thing.x - w / 2, thing.base, thing.z - d / 2], max: [thing.x + w / 2, thing.crown, thing.z + d / 2] }
}

/** How deep two boxes are in each other: the least of their overlaps along the three axes, or 0. */
function depth(a: Box, b: Box): number {
  let least = Infinity
  for (let axis = 0; axis < 3; axis++) least = Math.min(least, Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]))
  return Math.max(0, least)
}

const bodies = (rests: Rests): Box[] => WHO.flatMap((who) => bodyOf(rests[who]))

describe('what the blocks become', () => {
  it('gives every kind its own thing', () => {
    const all = things([at('long', 0, 0), at('arch', 4, 0), at('round', 0, 1), at('thin', 2, 1), at('cube', 4, 1), at('slope', 0, 2)])
    expect(all.map((thing) => thing.what)).toEqual(['bridge', 'gate', 'tower', 'pole', 'room', 'slide'])
  })

  it('roofs a tower with nothing on it, and gives one with a block on it battlements and no roof', () => {
    const [open] = things([at('round', 3, 1)])
    expect(open.covered).toBe(false)
    expect(open.crown).toBeCloseTo(open.top + ROOF)
    const [capped] = things([at('round', 3, 1), at('cube', 3, 1)])
    expect(capped.covered).toBe(true)
    expect(capped.crown).toBe(capped.top)
  })

  it('lays boards on a bridge with nothing on it', () => {
    const [bridge] = things([at('long', 0, 0)])
    expect(bridge.crown).toBeCloseTo(bridge.top + BOARDS)
  })

  it('flies a flag to the side that has room, and a short one where neither has', () => {
    expect(things([at('thin', 3, 1)])[0]).toMatchObject({ side: 1, flag: FLAG.long })
    // Something as high as the pole on its right: the flag flies left.
    const left = things([at('thin', 3, 1), at('round', 4, 1), at('cube', 4, 1)])[0]
    expect(left).toMatchObject({ side: -1, flag: FLAG.long })
    const hemmed = things([at('thin', 3, 1), at('round', 4, 1), at('cube', 4, 1), at('round', 2, 1), at('cube', 2, 1)])[0]
    expect(hemmed.flag).toBe(FLAG.short)
  })

  it('lets a flag run down its pole only as far as what stands beside it', () => {
    expect(things([at('thin', 3, 1)])[0].run).toBe(FLAG.run)
    const beside = things([at('thin', 3, 1), at('cube', 4, 1)])[0]
    expect(beside.side).toBe(1)
    expect(beside.run).toBeLessThan(FLAG.run)
    expect(beside.top - FLAG.deep - beside.run).toBeGreaterThan(SIZE.cube[1])
  })

  it('knows which ends of a bridge hang in the air', () => {
    // On one cube under its left end: the right end is in the air.
    const bridge = things([at('cube', 1, 1), at('long', 1, 1)])[1]
    expect([bridge.airLeft, bridge.airRight]).toEqual([false, true])
    const lying = things([at('long', 1, 1)])[0]
    expect([lying.airLeft, lying.airRight]).toEqual([false, false])
  })

  it('turns a slide the way its slope runs', () => {
    const [left, right] = things([at('slope', 0, 0), at('slope', 5, 0)])
    expect(left.side).toBe(-1)
    expect(right.side).toBe(1)
  })
})

describe('the fixed tastes', () => {
  it('seat the king on the highest thing there is, the one nearest the wall where two are as high', () => {
    const rests = restsFor([at('cube', 1, 2), at('round', 5, 1), at('round', 3, 0)])
    expect(rests.king).toMatchObject({ how: 'seat', thing: 2 })
    expect(rests.king.at[1]).toBeCloseTo(1.5 + ROOF)
  })

  it('seat him on the dragon when the rug is bare', () => {
    const rests = restsFor([])
    expect(rests.king.how).toBe('dragon')
    expect(rests.king.at[1]).toBeGreaterThan(0.5)
    expect(rests.dragon.how).toBe('day')
    expect(rests.cook.how).toBe('open')
  })

  it('put the cook in the lowest room, lying beside it with his head in at its window', () => {
    // A room up on a bridge and a room on the rug: the one on the rug is his.
    const rests = restsFor([at('long', 4, 1), at('cube', 5, 1), at('cube', 2, 1)])
    expect(rests.cook).toMatchObject({ how: 'window', thing: 2, high: false })
    expect(Math.abs(rests.cook.lie)).toBe(1)
    // He lies on the rug beside it, his cap inside it.
    const head = rests.cook.at[0] + rests.cook.lie * BODY.cook.tall
    expect(Math.abs(head - placeX(2))).toBeLessThan(SIZE.cube[0] / 2)
  })

  it('lay him on the side of the room where more of him shows past the pile', () => {
    // The king has a tower of his own. With nothing in front of the room, the cook takes one side of it.
    const open = restsFor([at('round', 6, 0), at('cube', 3, 1)]).cook
    expect(open.how).toBe('window')
    // A slope in front of that side: he takes the other.
    const hidden = restsFor([at('round', 6, 0), at('cube', 3, 1), at('slope', open.lie === 1 ? 1 : 4, 2)]).cook
    expect(hidden.how).toBe('window')
    expect(hidden.lie).toBe(-open.lie)
    // And one in front of the other side leaves him where he was.
    expect(restsFor([at('round', 6, 0), at('cube', 3, 1), at('slope', open.lie === 1 ? 4 : 1, 2)]).cook.lie).toBe(open.lie)
  })

  it('send him up with his eyes shut when the only room is up high', () => {
    // The king is up his pole, out of the way.
    const rests = restsFor([at('long', 1, 1), at('cube', 2, 1), at('thin', 6, 0)])
    expect(rests.king.thing).toBe(2)
    expect(rests.cook).toMatchObject({ how: 'window', thing: 1, high: true })
    // He lies on the bridge the room stands on.
    expect(rests.cook.at[1]).toBeGreaterThan(0.5)
  })

  it('leave him cooking in the open when there is no room, or none he can get his head into', () => {
    expect(restsFor([at('round', 3, 1), at('arch', 0, 0)]).cook.how).toBe('open')
    // A room walled in on both sides.
    expect(restsFor([at('cube', 3, 1), at('round', 2, 1), at('round', 4, 1)]).cook.how).toBe('open')
  })

  it('lay the dragon with his nose under the nearest arch that nothing stands in front of', () => {
    const rests = restsFor([at('arch', 0, 0), at('arch', 3, 1)])
    expect(rests.dragon).toMatchObject({ how: 'gate', thing: 1 })
    // His body trails out toward the child and along the boards.
    expect(rests.dragon.path.length).toBeGreaterThan(2)
    expect(rests.dragon.path[0][2]).toBeGreaterThan(placeZ(1))
    // An arch with a block in front of it is no place to lie.
    expect(restsFor([at('arch', 3, 0), at('cube', 3, 1)]).dragon.how).not.toBe('gate')
  })

  it('lay him under a bridge with air under it when there is no arch, and leave him where he is when there is neither', () => {
    const rests = restsFor([at('cube', 1, 1), at('cube', 3, 1), at('long', 1, 1)])
    expect(rests.dragon).toMatchObject({ how: 'bridge', thing: 2 })
    expect(restsFor([at('cube', 1, 1)]).dragon.how).toBe('day')
  })

  it('keep the cook\'s pot clear: he takes the side of his room with nothing in front of him, and no window where both are built up', () => {
    // A slide in front of the place on the left of the room: his pot would be in it, so he lies on the right.
    // (A pole by the wall is the king's seat, so he is not on the room.)
    const left = restsFor([at('thin', 6, 0), at('cube', 3, 1), at('slope', 1, 2)])
    expect(left.cook).toMatchObject({ how: 'window', lie: -1 })
    // One in front of each side: he stays on his stool.
    expect(restsFor([at('thin', 6, 0), at('cube', 3, 1)]).cook.how).toBe('window')
    expect(restsFor([at('thin', 6, 0), at('cube', 3, 1), at('slope', 1, 2), at('slope', 4, 2)]).cook.how).toBe('open')
  })

  it('answer a tap on a thing with whoever rests nearest it', () => {
    const placed = [at('cube', 0, 1), at('arch', 3, 0), at('round', 6, 2)]
    const all = things(placed), rests = restsFor(placed)
    expect(nearestTo(all[0], rests, WHO)).toBe('cook')
    expect(nearestTo(all[1], rests, WHO)).toBe('dragon')
    expect(nearestTo(all[2], rests, WHO)).toBe('king')
    expect(nearestTo(all[2], rests, [])).toBeNull()
  })
})

describe('where the folk come to rest', () => {
  it.each(PILES)('%s: none of them is in a block, in another of them, in the basket or on the bell', (_, placed) => {
    const all = things(placed), rests = restsFor(placed)
    for (const who of WHO) {
      const rest = rests[who]
      for (const body of bodyOf(rest)) {
        expect(depth(body, BELL_BOX), `${who} and the bell`).toBe(0)
        expect(depth(body, BASKET_BOX), `${who} and the basket`).toBe(0)
        for (const thing of all) {
          // The cook's cap is in at the window of his room, and the dragon's nose is under his gate or his bridge.
          if (thing.index === rest.thing && (rest.how === 'window' || rest.how === 'gate' || rest.how === 'bridge')) continue
          // A round one is a hair wider than the cube it stands on: he may touch that much of it.
          expect(depth(body, blockOf(thing)), `${who} and block ${thing.index}`).toBeLessThan(0.03)
        }
        for (const other of WHO) {
          if (other === who || (who === 'king' && rest.how === 'dragon') || (other === 'king' && rests.king.how === 'dragon')) continue
          for (const theirs of bodyOf(rests[other])) expect(depth(body, theirs), `${who} and ${other}`).toBeLessThan(0.02)
        }
      }
    }
  })

  // Each surface size the game is tested at: the design frame, and a tablet of four to three.
  it.each(PILES)('%s: each of them leaves in view the part of every thing that answers a tap', (_, placed) => {
    const all = things(placed), rests = restsFor(placed)
    for (const [width, height] of [[1180, 820], [1024, 768]] as const) {
      expect(leavesInView(all, bodies(rests), backOf(rests), width, height), `${width} by ${height}`).toBe(true)
      // What that rule holds: 48 px of each thing across, or all that the child's own pile leaves of it.
      for (const thing of all) {
        const others = all.filter((other) => other !== thing).map(blockOf)
        const alone = shows(thing, others, backOf(rests), width, height)
        const withFolk = shows(thing, [...others, ...bodies(rests)], backOf(rests), width, height)
        expect(withFolk, `thing ${thing.index} at ${width} by ${height}`).toBeGreaterThanOrEqual(Math.min(48, alone) - 0.5)
      }
    }
  })

  it('keeps the bell clear of every pile: no place of the rug reaches it', () => {
    expect(BELL_BOX.min[2]).toBeGreaterThan(placeZ(ROWS - 1) + 0.5)
    for (const who of WHO) {
      const place = FOLK[who]
      expect(depth({ min: [place.x - 0.3, 0, place.z - 0.3], max: [place.x + 0.3, 1, place.z + 0.3] }, BELL_BOX)).toBe(0)
    }
  })

  it('gives a thing a touch box no narrower than a finger', () => {
    const [pole] = things([at('thin', 3, 1)])
    const box = tapBox(pole)
    expect(box.max[0] - box.min[0]).toBeGreaterThanOrEqual(0.86)
  })
})

describe('a room up high', () => {
  const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
  // Somewhere higher for the king, so that he is not over the room.
  const seat = [at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)]

  it('is reached by the cook wherever it stands: beside it he sticks out over what is lower, wedged by his cap', () => {
    const piles: Record<string, Placed[]> = {
      'on a round one': [at('round', 3, 1), at('cube', 3, 1)],
      'on an arch': [at('arch', 3, 1), at('cube', 3, 1)],
      'on a round one and an arch': [at('round', 3, 1), at('arch', 3, 1), at('cube', 3, 1)],
      'with a lower block on one side and one as high as its foot on the other': [at('round', 3, 1), at('cube', 3, 1), at('arch', 1, 1), at('long', 4, 1)],
    }
    for (const [name, pile] of Object.entries(piles)) {
      const rug = [...pile, ...seat]
      const cook = restsFor(rug).cook
      expect(cook.how, name).toBe('window')
      expect(cook.high, name).toBe(true)
      const room = things(rug).find((thing) => thing.what === 'room')!
      expect(cook.thing, name).toBe(room.index)
      expect(cook.at[1], name).toBeCloseTo(room.base + BODY.cook.girth)
    }
  })

  it('leaves him on his stool only where blocks stand in his way on both sides of the room', () => {
    const walled = [at('round', 3, 1), at('cube', 3, 1), at('arch', 2, 1), at('slope', 2, 1), at('long', 4, 1), at('long', 4, 1), ...seat]
    expect(restsFor(walled).cook.how).toBe('open')
  })
})

describe('the boards of a bridge', () => {
  const place = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
  it('lie whole along a long one that nothing stands on', () => {
    const bridge = things([place('long', 2, 1)])[0]
    const boards = bridgeBoards(bridge)
    expect(boards).toHaveLength(SLATS)
    for (const board of boards) expect(board.deep).toBeGreaterThan(SIZE.long[2])
  })

  it('are there on a long one with a block on it too: whole where nothing stands, and the two ends of each board sticking out from under the block', () => {
    for (const on of ['cube', 'round', 'thin', 'arch', 'long'] as const) {
      const rug = [place('cube', 2, 1), place('cube', 4, 1), place('long', 2, 1), place(on, on === 'long' ? 2 : 3, 1)]
      const all = things(rug)
      const bridge = all.find((thing) => thing.what === 'bridge' && thing.base === 1)!
      expect(bridge.covered, on).toBe(true)
      const boards = bridgeBoards(bridge)
      // Every board is there, by one piece or by its two ends.
      expect(new Set(boards.map((board) => board.slat)).size, on).toBe(SLATS)
      const covered = bridge.coveredAt.filter(Boolean).length
      expect(boards, on).toHaveLength((3 - covered) * 3 + covered * 6)
      for (const board of boards) {
        // None is in a block that stands on the bridge, and none reaches the blocks of the next row.
        for (const other of all) {
          if (other === bridge || other.base < bridge.top - 1e-6) continue
          const [w, , d] = SIZE[other.kind]
          const apart = Math.abs(board.x - other.x) >= (board.wide + w) / 2 - 1e-6 || Math.abs(board.z - other.z) >= (board.deep + d) / 2 - 1e-6
          expect(apart, `${on}: board ${board.slat} and the ${other.kind} on it`).toBe(true)
        }
        expect(Math.abs(board.z - bridge.z) + board.deep / 2, on).toBeLessThan(0.55)
        // Its end is past the edge of the long one, where it is seen.
        if (board.deep < 0.2) expect(Math.abs(board.z - bridge.z) + board.deep / 2, on).toBeGreaterThan(SIZE.long[2] / 2 + 0.1)
      }
      // The evening's tops hold the whole boards, so one who stands there stands on them.
      const tops = eveningTops(all)
      bridge.coveredAt.forEach((isCovered, i) => { if (!isCovered) expect(tops[1 * COLS + bridge.col + i], on).toBeGreaterThanOrEqual(bridge.top + BOARDS - 1e-9) })
    }
  })
})
