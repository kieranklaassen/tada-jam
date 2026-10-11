import { describe, expect, it } from 'vitest'
import { fromPicture } from './ground'
import { canBe, chamberCells, entries, entry, farFromChambers, isInside, nearestTo, nextPlaces, reach, sticks, wallToLeanOn, wayIn, type Walker } from './routes'

// In these pictures the mouth is the open cell or cells in the top row, and a room is four wide and three high.
const mouthOf = (picture: string[]) => [...picture[0]].flatMap((mark, x) => (mark === '.' ? [x] : []))
const cellOf = (picture: string[], x: number, y: number) => y * picture[0].length + x
const nexts = (picture: string[], kind: Walker, x: number, y: number) => {
  const out: number[] = []
  const ground = fromPicture(picture)
  const n = nextPlaces(ground, kind, cellOf(picture, x, y), out)
  return out.slice(0, n).map((cell) => [cell % ground.cols, Math.floor(cell / ground.cols)])
}
const wayOf = (picture: string[], kind: Walker) => {
  const ground = fromPicture(picture), mouth = mouthOf(picture)
  const start = entry(ground, kind, mouth)
  return start === null ? null : wayIn(ground, kind, start, chamberCells(ground, mouth))
}

describe('where each kind can be', () => {
  const tunnel = ['X.XXXXXX', '#.######', '#.....##', '########', 'XXXXXXXX']

  it('a raider ant fits a way one cell high, on a floor or on a face it can climb', () => {
    const ground = fromPicture(tunnel)
    expect(canBe(ground, 'ant', 3, 2)).toBe(true)
    expect(canBe(ground, 'ant', 1, 1)).toBe(true)
    expect(canBe(ground, 'ant', 3, 1)).toBe(false)
    // In the middle of a wide shaft it has nothing to cling to.
    expect(canBe(fromPicture(['X...X', '#...#', '#...#', 'XXXXX']), 'ant', 2, 1)).toBe(false)
    expect(canBe(fromPicture(['X...X', '#...#', '#...#', 'XXXXX']), 'ant', 1, 1)).toBe(true)
  })

  it('a beetle needs a way two cells high and a floor', () => {
    expect(canBe(fromPicture(tunnel), 'beetle', 3, 2)).toBe(false)
    const high = fromPicture(['X.XXXXXX', '#.....##', '#.....##', '########', 'XXXXXXXX'])
    expect(canBe(high, 'beetle', 3, 2)).toBe(true)
    expect(canBe(high, 'beetle', 3, 1)).toBe(false)
  })

  it('a fly needs a clear block two wide and three high, and no floor', () => {
    const hall = fromPicture(['X..XXXXX', '#......#', '#......#', '#......#', '#......#', 'XXXXXXXX'])
    expect(canBe(hall, 'fly', 3, 3)).toBe(true)
    expect(canBe(hall, 'fly', 3, 4)).toBe(true)
    expect(canBe(hall, 'fly', 6, 3)).toBe(false)
    expect(canBe(hall, 'fly', 3, 2)).toBe(false)
    const low = fromPicture(['X..XXXXX', '#......#', '#......#', '########', 'XXXXXXXX'])
    expect(canBe(low, 'fly', 3, 2)).toBe(false)
  })
})

describe('how each kind steps', () => {
  it('a beetle walks, gets up one cell and no more, and drops any distance to the first floor', () => {
    // A floor, a block one cell high on it, and beyond the block a floor two cells lower.
    const picture = ['X........X', '#........#', '#...#....#', '#####....#', '#####....#', '##########', 'XXXXXXXXXX']
    expect(nexts(picture, 'beetle', 2, 2)).toEqual([[1, 2], [3, 2]])
    expect(nexts(picture, 'beetle', 3, 2)).toEqual([[2, 2], [4, 1]])
    expect(nexts(picture, 'beetle', 4, 1)).toEqual([[3, 2], [5, 4]])
    // From the lower floor the way back up is three cells: it cannot.
    expect(nexts(picture, 'beetle', 5, 4)).toEqual([[6, 4]])
  })

  it('a raider ant goes round an outer corner, down a face and up one', () => {
    const picture = ['X.XXXXXX', '#.....##', '####..##', '####..##', '########', 'XXXXXXXX']
    // Off the edge of the floor at (3,1) and down the face of the earth under it.
    expect(nexts(picture, 'ant', 3, 1)).toContainEqual([4, 2])
    // And back: up the face from (4,2) onto the floor.
    expect(nexts(picture, 'ant', 4, 2)).toContainEqual([3, 1])
    // Not round a corner of sand, which gives no face to cling to.
    const sandy = ['X.XXXXXX', '#.....##', '###s..##', '####..##', '########', 'XXXXXXXX']
    expect(nexts(sandy, 'ant', 3, 1)).not.toContainEqual([4, 2])
  })

  it('a raider ant climbs earth and stone and cannot cling to a face of sand', () => {
    const earth = ['X.XX', '#.##', '#.##', '#..#', 'XXXX']
    expect(nexts(earth, 'ant', 1, 1)).toEqual([[1, 0], [1, 2]])
    const sand = fromPicture(['X...X', '#s.s#', '#s.s#', '#...#', 'XXXXX'])
    expect(canBe(sand, 'ant', 2, 1)).toBe(false)
    const stone = fromPicture(['X...X', '#o.o#', '#o.o#', '#...#', 'XXXXX'])
    expect(canBe(stone, 'ant', 2, 1)).toBe(true)
  })

  it('a raider ant sticks on mud underfoot, and on a mud face that is all it has, and walks over a stuck ant', () => {
    const floor = fromPicture(['X.XXXX', '#....#', '##m###', 'XXXXXX'])
    expect(sticks(floor, 2, 1)).toBe(true)
    expect(sticks(floor, 3, 1)).toBe(false)
    expect(sticks(floor, 2, 1, new Set([1 * 6 + 2]))).toBe(false)
    const face = fromPicture(['X...X', '#m.m#', '#...#', 'XXXXX'])
    expect(canBe(face, 'ant', 2, 1)).toBe(true)
    expect(sticks(face, 2, 1)).toBe(true)
    // A mud wall beside a floor of earth is walked past.
    const beside = fromPicture(['X.XXXX', '#.m..#', '######', 'XXXXXX'])
    expect(sticks(beside, 1, 1)).toBe(false)
  })
})

describe('the way in', () => {
  const room = ['X.XXXXXXXXXX', '#.##########', '#..........#', '#..........#', '######.....#', '############', 'XXXXXXXXXXXX']

  it('each kind comes in at the mouth: the ant on its wall, the beetle dropped to the first floor, the fly in the air', () => {
    const picture = ['X..XXX', '#..###', '#..###', '#..###', '######', 'XXXXXX']
    const ground = fromPicture(picture)
    expect(entry(ground, 'ant', [1, 2])).toBe(1)
    expect(entry(ground, 'beetle', [1, 2])).toBe(3 * 6 + 1)
    expect(entry(ground, 'fly', [1, 2])).toBe(2 * 6 + 1)
    expect(entry(fromPicture(['X.XX', '#s##', 'XXXX']), 'beetle', [1])).toBeNull()
  })

  it('leads an ant and a beetle through a tunnel two cells high into a room', () => {
    for (const kind of ['ant', 'beetle'] as const) {
      const way = wayOf(room, kind)!
      expect(way, kind).not.toBeNull()
      const ground = fromPicture(room)
      expect(isInside(ground, kind, way[way.length - 1], chamberCells(ground, mouthOf(room)))).toBe(true)
    }
  })

  it('does not lead a fly into a tunnel two cells high, nor a beetle through a crawl one cell high', () => {
    expect(wayOf(room, 'fly')).toBeNull()
    const crawl = ['X.XXXXXXXXXX', '#.##########', '#.##########', '#..........#', '######.....#', '######.....#', '############', 'XXXXXXXXXXXX']
    expect(wayOf(crawl, 'beetle')).toBeNull()
    expect(wayOf(crawl, 'ant')).not.toBeNull()
  })

  it('leads a fly through a hall three cells high', () => {
    const hall = ['X..XXXXXXXXX', '#..........#', '#..........#', '#..........#', '############', 'XXXXXXXXXXXX']
    expect(wayOf(hall, 'fly')).not.toBeNull()
  })

  it('holds a beetle in a pit two cells deep, and lets an ant climb out of it', () => {
    const pit = ['X.XXXXXXXXXXX', '#...........#', '#...........#', '###..##.....#', '###..########', '#############', 'XXXXXXXXXXXXX']
    expect(wayOf(pit, 'beetle')).toBeNull()
    expect(wayOf(pit, 'ant')).not.toBeNull()
    const shallow = ['X.XXXXXXXXXXX', '#...........#', '#...........#', '###..##.....#', '#############', 'XXXXXXXXXXXXX']
    expect(wayOf(shallow, 'beetle')).not.toBeNull()
  })

  it('takes the same way every time', () => {
    expect(wayOf(room, 'ant')).toEqual(wayOf(room, 'ant'))
  })
})

describe('with no way in', () => {
  // A lump of sand on the floor of a tunnel two cells high: air and an ant pass over it, a beetle does not.
  const walled = ['X.XXXXXXXXXX', '#.##########', '#..........#', '#...s......#', '######.....#', '############', 'XXXXXXXXXXXX']

  it('a beetle leans on the wall that stands nearest a chamber, from the place before it', () => {
    const ground = fromPicture(walled), mouth = mouthOf(walled)
    const inside = chamberCells(ground, mouth)
    const start = entry(ground, 'beetle', mouth)!
    expect(wayIn(ground, 'beetle', start, inside)).toBeNull()
    const found = reach(ground, 'beetle', start)
    const lean = wallToLeanOn(ground, found, farFromChambers(ground, inside))!
    expect([lean.x, lean.dx]).toEqual([4, 1])
    expect(lean.stand % 12).toBe(3)
  })

  it('an invader goes as near as it can get', () => {
    const ground = fromPicture(walled), mouth = mouthOf(walled)
    const inside = chamberCells(ground, mouth)
    const found = reach(ground, 'ant', entry(ground, 'ant', mouth)!)
    // The ant walks over the sand and gets in, so the place nearest a chamber is inside one.
    const near = nearestTo(found, farFromChambers(ground, inside))
    expect(isInside(ground, 'ant', near, inside)).toBe(true)
    const beetle = reach(ground, 'beetle', entry(ground, 'beetle', mouth)!)
    expect(nearestTo(beetle, farFromChambers(ground, inside)) % 12).toBe(3)
  })

  it('finds no wall to lean on where only earth is in the way', () => {
    const picture = ['X.XXXXXXXXXX', '#.##########', '#...#......#', '#...#......#', '######.....#', '############', 'XXXXXXXXXXXX']
    const ground = fromPicture(picture), mouth = mouthOf(picture)
    // The room is shut in, so it is no chamber at all: nothing to be near.
    const inside = chamberCells(ground, mouth)
    expect(inside.includes(1)).toBe(false)
    const found = reach(ground, 'beetle', entry(ground, 'beetle', mouth)!)
    expect(wallToLeanOn(ground, found, farFromChambers(ground, inside))).toBeNull()
  })
})

describe('a raider ant with nothing to hold', () => {
  // A room under the shaft, wider than it on both sides: the shaft's wall ends over open air.
  const under = ['XXXX...XXXX', '####...####', '####...####', '####...####', '#.........#', '#.........#', '#.........#', '###########', 'XXXXXXXXXXX']

  it('lets go where the face it climbs down ends over open air, and drops to the floor', () => {
    expect(nexts(under, 'ant', 4, 3)).toContainEqual([4, 6])
    const way = wayOf(under, 'ant')!
    expect(way).not.toBeNull()
    // Down the wall, then the drop: it is inside the room at the end of its way.
    expect(way.map((cell) => [cell % 11, Math.floor(cell / 11)])).toEqual([[4, 0], [4, 1], [4, 2], [4, 3], [4, 6]])
  })

  it('steps off the edge of a floor that has nothing under its edge, and never lets go of a face with a way on', () => {
    const ledge = ['XXXX.XXXXXX', '####.######', '####....###', '#######.###', '#.........#', '#.........#', '#.........#', '###########', 'XXXXXXXXXXX']
    // On the ledge's floor at its end, over the shaft into the room: it can go on down the shaft's face, so no drop there.
    expect(nexts(ledge, 'ant', 7, 2)).toEqual(expect.arrayContaining([[6, 2], [7, 3]]))
    for (const [, y] of nexts(ledge, 'ant', 7, 2)) expect(y).toBeLessThanOrEqual(3)
    // At the mouth it clings to the turf: it does not jump into the middle of a wide shaft.
    for (const [, y] of nexts(under, 'ant', 4, 0)) expect(y).toBeLessThanOrEqual(1)
  })

  it('climbs where it can and drops only where it gets no further: the way it finds without a drop comes first', () => {
    // The same room, with the shaft's left wall carried down to its floor: no drop is needed.
    const walled = ['XXXX...XXXX', '####...####', '####...####', '####...####', '####......#', '####......#', '####......#', '###########', 'XXXXXXXXXXX']
    const way = wayOf(walled, 'ant')!.map((cell) => [cell % 11, Math.floor(cell / 11)])
    for (let n = 1; n < way.length; n++) expect(Math.abs(way[n][1] - way[n - 1][1])).toBeLessThanOrEqual(1)
    // And a reach lists every place found without a drop before any found only by one.
    const ground = fromPicture(under), found = reach(ground, 'ant', 4)
    const firstDropped = found.order.findIndex((cell) => Math.floor(cell / 11) >= 4)
    expect(found.order.slice(0, firstDropped).every((cell) => Math.floor(cell / 11) <= 3)).toBe(true)
    expect(firstDropped).toBeGreaterThan(0)
    expect(found.order.slice(firstDropped).every((cell) => Math.floor(cell / 11) >= 4)).toBe(true)
  })
})

describe('the mouth, column by column', () => {
  it('lets each kind in by any column that is open to it, nearest the camp first', () => {
    const open = ['XXXX...XXXX', '####...####', '####...####', '####...####', '###########', 'XXXXXXXXXXX']
    const mouth = mouthOf(open)
    expect(entries(fromPicture(open), 'beetle', mouth).map((cell) => cell % 11)).toEqual([4, 5, 6])
    expect(entries(fromPicture(open), 'fly', mouth).map((cell) => cell % 11)).toEqual([4, 5])
    // One lump of mud in the left column under the turf: the beetle comes in by the next column, the flier by the two that are left.
    const plugged = ['XXXX...XXXX', '####m..####', '####...####', '####...####', '###########', 'XXXXXXXXXXX']
    expect(entry(fromPicture(plugged), 'beetle', mouth)! % 11).toBe(5)
    expect(entry(fromPicture(plugged), 'crawler', mouth)! % 11).toBe(5)
    expect(entry(fromPicture(plugged), 'fly', mouth)! % 11).toBe(5)
    // Two columns shut: a beetle still fits the third, and a flier, which is two columns wide, does not.
    const narrow = ['XXXX...XXXX', '####mm.####', '####...####', '####...####', '###########', 'XXXXXXXXXXX']
    expect(entry(fromPicture(narrow), 'beetle', mouth)! % 11).toBe(6)
    expect(entry(fromPicture(narrow), 'fly', mouth)).toBeNull()
  })
})
