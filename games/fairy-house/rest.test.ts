import { describe, expect, it } from 'vitest'
import { CELLS } from './cells'
import { FOUND, HOLLOW, KINDS, SUPPORTS, ceilingY, type Kind } from './kinds'
import { build, carriedWith, isRested, laidOf, settle, topOf, without, type Laid, type Rested } from './rest'

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const lay = (house: Rested[], kind: Kind, x: number, nth = 0): Rested => {
  const result = settle(house, idOf(kind, nth), kind, x)
  if (!isRested(result)) throw new Error(`${kind} was shed by ${result.shedBy}`)
  house.push(result)
  return result
}

describe('the resting rule', () => {
  it('rests a thing on the ground where it is let go, on the floor or on the step', () => {
    const house: Rested[] = []
    const pebble = lay(house, 'pebble', 700)
    expect(pebble).toMatchObject({ on: 'ground', x: 700, under: [] })
    expect(pebble.y).toBe(HOLLOW.floorY + CELLS.pebble.ground.sink)
    const cap = lay(house, 'cap', 420)
    expect(cap.y).toBe(HOLLOW.stepY + CELLS.cap.ground.sink)
  })

  it('keeps a thing inside the walls and on one piece of ground', () => {
    const house: Rested[] = []
    expect(lay(house, 'moss', 2000).x).toBe(HOLLOW.right - 50)
    // At the left wall the arch comes down low, so a thing is set down a little further in, and no higher than the arch.
    const atWall = lay(house, 'pebble', -50)
    expect(atWall.x).toBeGreaterThanOrEqual(HOLLOW.left + 32)
    expect(atWall.x).toBeLessThan(HOLLOW.left + 44)
    const post = lay(house, 'twig', 340)
    expect(ceilingY(post.x - 8)).toBeLessThanOrEqual(topOf(post) + 12)
    // Let go just right of the step's edge, a cushion lies wholly on the floor.
    const cushion = lay(house, 'moss', HOLLOW.stepRight + 4, 1)
    expect(cushion.x - 50).toBeGreaterThanOrEqual(HOLLOW.stepRight)
    expect(cushion.y).toBeGreaterThan(HOLLOW.floorY)
  })

  it('makes a thing what its support says: a leaf on moss is a bed, an acorn cap on a pebble a lamp and on the ground a bath', () => {
    const house: Rested[] = []
    const moss = lay(house, 'moss', 640)
    const leaf = lay(house, 'leaf', 655)
    expect(leaf.cell.is).toBe('bed')
    expect(leaf.under).toEqual([moss.id])
    // A leaf is wider than a cushion, so it lies centred on it.
    expect(leaf.x).toBe(moss.x)
    expect(leaf.y).toBe(topOf(moss) + CELLS.leaf.moss.sink)
    const pebble = lay(house, 'pebble', 790)
    expect(lay(house, 'cap', 790).cell.is).toBe('lamp')
    expect(pebble.cell.is).toBe('stool')
    expect(lay(house, 'cap', 420, 1).cell).toMatchObject({ is: 'bath', extra: 'water' })
  })

  it('lays a leaf across two twigs as a roof, and over one as the same cell centred on it', () => {
    const house: Rested[] = []
    const left = lay(house, 'twig', 600, 0), right = lay(house, 'twig', 700, 1)
    const roof = lay(house, 'leaf', 640)
    expect(roof.cell.is).toBe('roof')
    expect([...roof.under].sort()).toEqual([left.id, right.id].sort())
    expect(roof.x).toBe(650)
    const alone = lay(house, 'twig', 800, 2)
    const parasol = lay(house, 'leaf', 815, 1)
    expect(parasol).toMatchObject({ x: alone.x, under: [alone.id] })
    expect(parasol.cell.is).toBe('roof')
  })

  it('reaches every cell of the grid', () => {
    for (const kind of KINDS) {
      for (const on of SUPPORTS) {
        const house: Rested[] = []
        if (on !== 'ground') lay(house, on, 680, kind === on ? 1 : 0)
        const result = lay(house, kind, 680)
        expect(result.cell, `${kind} on ${on}`).toBe(CELLS[kind][on])
      }
    }
  })

  it('sheds what is set on a leaf, an acorn cap or a feather, and leaves the house as it was', () => {
    for (const top of ['leaf', 'cap', 'feather'] as const) {
      const house: Rested[] = []
      lay(house, top, 680)
      const before = laidOf(house)
      const result = settle(house, idOf('pebble'), 'pebble', 680)
      expect(isRested(result)).toBe(false)
      if (!isRested(result)) expect(result.shedBy).toBe(top)
      expect(laidOf(house)).toEqual(before)
    }
  })

  it('sheds what would stand higher than the arch', () => {
    const house: Rested[] = []
    const pile: [Kind, number][] = [['moss', 0], ['moss', 1], ['moss', 2], ['pebble', 0], ['pebble', 1], ['bark', 0], ['bark', 1]]
    let shed = false
    for (const [kind, nth] of pile) {
      const result = settle(house, idOf(kind, nth), kind, 402)
      if (isRested(result)) house.push(result)
      else {
        shed = true
        expect(result.shedBy).toBe('arch')
        break
      }
    }
    expect(shed).toBe(true)
    expect(house.length).toBeGreaterThanOrEqual(3)
    for (const r of house) expect(topOf(r)).toBeGreaterThanOrEqual(ceilingY(r.x))
  })

  it('leans a see-saw to the side it was set down on', () => {
    const a: Rested[] = [], b: Rested[] = []
    lay(a, 'pebble', 680)
    lay(b, 'pebble', 680)
    expect(lay(a, 'bark', 650).side).toBe(-1)
    expect(lay(b, 'bark', 710).side).toBe(1)
  })
})

describe('lifting', () => {
  it('takes up with a thing whatever rests on it alone', () => {
    const house: Rested[] = []
    const moss = lay(house, 'moss', 640), leaf = lay(house, 'leaf', 640), pebble = lay(house, 'pebble', 780)
    expect(carriedWith(house, moss.id).map((r) => r.id)).toEqual([moss.id, leaf.id])
    expect(carriedWith(house, leaf.id).map((r) => r.id)).toEqual([leaf.id])
    expect(without(house, [moss.id, leaf.id]).house.map((r) => r.id)).toEqual([pebble.id])
  })

  it('leaves a roof behind on the twig that is left, as a parasol', () => {
    const house: Rested[] = []
    const left = lay(house, 'twig', 600, 0), right = lay(house, 'twig', 700, 1)
    const roof = lay(house, 'leaf', 650)
    expect(carriedWith(house, left.id).map((r) => r.id)).toEqual([left.id])
    const after = without(house, [left.id])
    expect(after.shed).toEqual([])
    expect(after.moved.map((r) => r.id)).toEqual([roof.id])
    expect(after.moved[0]).toMatchObject({ under: [right.id], x: right.x })
  })
})

describe('the list a save keeps', () => {
  it('builds the same house again from the list, in its order', () => {
    const house: Rested[] = []
    lay(house, 'moss', 640)
    lay(house, 'leaf', 655)
    lay(house, 'pebble', 790.26)
    lay(house, 'cap', 795)
    lay(house, 'twig', 520)
    lay(house, 'bark', 420)
    lay(house, 'feather', 430)
    const laid = laidOf(house)
    expect(build(laid)).toEqual(house)
    expect(build(JSON.parse(JSON.stringify(laid)) as Laid[])).toEqual(house)
    // And the list of the rebuilt house is the list.
    expect(laidOf(build(laid))).toEqual(laid)
  })

  it('leaves out what cannot rest, a number it does not know and a number named twice', () => {
    const leaf = idOf('leaf'), pebble = idOf('pebble')
    expect(build([{ id: leaf, x: 680 }, { id: pebble, x: 680 }]).map((r) => r.id)).toEqual([leaf])
    expect(build([{ id: 99, x: 680 }, { id: pebble, x: 600 }, { id: pebble, x: 700 }]).map((r) => r.x)).toEqual([600])
  })
})

describe('a thing let go beside a leaf, an acorn cap or a feather', () => {
  it('slides aside onto free floor when only its edge is over the leaf', () => {
    const house: Rested[] = []
    const moss = lay(house, 'moss', 640), bed = lay(house, 'leaf', 640)
    // The bed's edge is at 704. A pebble let go with its middle at 720 would lie 16 into the leaf.
    const pebble = lay(house, 'pebble', 720)
    expect(pebble.on).toBe('ground')
    expect(pebble.x - pebble.w / 2).toBeGreaterThanOrEqual(bed.x + bed.w / 2 - 6)
    expect(pebble.x).toBeGreaterThan(720)
    expect(house.map((r) => r.id)).toEqual([moss.id, bed.id, pebble.id])
  })

  it('is shed only when its middle is over the leaf', () => {
    const house: Rested[] = []
    lay(house, 'leaf', 640)
    for (const x of [640, 600, 690]) {
      const result = settle(house, idOf('pebble'), 'pebble', x)
      expect(isRested(result), `at ${x}`).toBe(false)
    }
    for (const x of [550, 725]) expect(isRested(settle(house, idOf('pebble'), 'pebble', x)), `at ${x}`).toBe(true)
    // The rug reaches from 572 to 708. With its very middle just over the tip the pebble is shed; just past the tip,
    // with half its width still over the leaf, it is not: it slides aside and lies beside the rug.
    expect(isRested(settle(house, idOf('pebble'), 'pebble', 706))).toBe(false)
    const beside = settle(house, idOf('pebble'), 'pebble', 711)
    expect(isRested(beside)).toBe(true)
    if (isRested(beside)) {
      expect(beside.on).toBe('ground')
      expect(beside.x - beside.w / 2).toBeGreaterThanOrEqual(708 - 6)
    }
  })

  it('does not cross what is in its way: against a wall, with no room beside an acorn cap, it goes home', () => {
    const house: Rested[] = []
    const cap = lay(house, 'cap', 770)
    // Let go right of the acorn cap, against the wall, with its edge over the cap: there is no room there, and the free room is on the far side of the cap.
    const pebble = settle(house, idOf('pebble'), 'pebble', 850)
    expect(pebble).toMatchObject({ shedBy: 'out' })
    // It goes home from where it touched the cap's edge, not from the cap's middle.
    expect(isRested(pebble) ? 0 : pebble.x).toBeGreaterThan(cap.x + 20)
    // A little further from the wall there is room, and it lies there.
    expect(lay(house, 'pebble', 700).x).toBeLessThanOrEqual(cap.x - cap.w / 2 - 32 + 6)
  })

  it('never leaves two things in each other, wherever things are let go', () => {
    // A fixed stream of drops: every kind, all along the hollow.
    let seed = 12345
    const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let round = 0; round < 40; round++) {
      const house: Rested[] = []
      const order = FOUND.map((found) => found.id).sort(() => next() - 0.5)
      for (const id of order) {
        const result = settle(house, id, FOUND[id].kind, 340 + next() * 524)
        if (isRested(result)) house.push(result)
      }
      for (const a of house) for (const b of house) {
        if (a.id >= b.id || a.under.includes(b.id) || b.under.includes(a.id)) continue
        const side = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)
        const height = Math.min(a.y, b.y) - Math.max(topOf(a), topOf(b))
        // Two things that do not rest on each other share at most a grip's width, or a sliver of height where one is sunk into the same moss.
        expect(side <= 6.5 || height <= 14.5, `round ${round}: ${a.cell.is} ${a.id} and ${b.cell.is} ${b.id} share ${side.toFixed(1)} by ${height.toFixed(1)}`).toBe(true)
      }
    }
  })
})

describe('a leaf on a pebble', () => {
  it('leans from the stone to the ground on the side it was set down, where there is room', () => {
    const a: Rested[] = [], b: Rested[] = []
    const stoneA = lay(a, 'pebble', 640), stoneB = lay(b, 'pebble', 640)
    expect(lay(a, 'leaf', 650)).toMatchObject({ lies: 'ramp', side: 1, x: stoneA.x + 40, y: HOLLOW.floorY })
    expect(lay(b, 'leaf', 630)).toMatchObject({ lies: 'ramp', side: -1, x: stoneB.x - 40, y: HOLLOW.floorY })
  })

  it('leans to the other side where a wall or a thing is in the way, and lies flat on the stone where neither side has room', () => {
    const wall: Rested[] = []
    lay(wall, 'pebble', 820)
    expect(lay(wall, 'leaf', 830)).toMatchObject({ lies: 'ramp', side: -1 })
    // On the root step there is no room to lean to either side.
    const boxed: Rested[] = []
    const stone = lay(boxed, 'pebble', 422)
    const flat = lay(boxed, 'leaf', 430)
    expect(flat).toMatchObject({ lies: 'flat', x: stone.x, on: 'pebble', w: 136 })
    expect(flat.y).toBeLessThan(stone.y - 30)
    // On a stone that stands on something there is no ground to lean to.
    const high: Rested[] = []
    lay(high, 'bark', 640)
    lay(high, 'pebble', 640)
    expect(lay(high, 'leaf', 650).lies).toBe('flat')
  })
})

describe('a snapped twig', () => {
  it('is half as tall where it stands, and what rests on it rests lower', () => {
    const laid: Laid[] = [{ id: idOf('twig', 0), x: 600 }, { id: idOf('twig', 1), x: 700 }, { id: idOf('leaf'), x: 650 }]
    const whole = build(laid), snapped = build(laid, new Set([idOf('twig', 0), idOf('twig', 1)]))
    expect(snapped[0]).toMatchObject({ snapped: true, h: whole[0].h / 2, y: whole[0].y })
    expect(snapped[2].cell.is).toBe('roof')
    expect(snapped[2].y - whole[2].y).toBe(whole[0].h / 2)
    // One snapped and one whole are no longer level: the roof rests on one of them alone.
    expect(build(laid, new Set([idOf('twig', 0)]))[2].under.length).toBe(1)
  })
})
